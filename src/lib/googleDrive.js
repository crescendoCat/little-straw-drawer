/**
 * Minimal browser-only Google Drive client for the app-data folder.
 *
 * - Auth: Google Identity Services (GIS) token model. Access tokens live in
 *   memory only (~1 h) and are re-requested on demand; there is no backend and
 *   no refresh token.
 * - API: Drive REST v3 via fetch, limited to files inside `appDataFolder`.
 *
 * No React or Redux imports: this module is mocked wholesale in tests.
 */

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const GIS_SRC = 'https://accounts.google.com/gsi/client';
export const DRIVE_API = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

/** Treat a token as expired this long before Google says it is. */
const TOKEN_MARGIN_MS = 60_000;

export class DriveAuthError extends Error {
  /**
   * @param {'unconfigured'|'gis_load_failed'|'popup_closed'|'popup_failed_to_open'|'access_denied'|'scope_denied'|'unknown'} code
   */
  constructor(code, message) {
    super(message ?? `Google sign-in failed (${code})`);
    this.name = 'DriveAuthError';
    this.code = code;
  }
}

export class DriveApiError extends Error {
  /** @param {number} status HTTP status, 0 when the request never got a response */
  constructor(status, message, details = null) {
    super(message ?? `Google Drive request failed (HTTP ${status})`);
    this.name = 'DriveApiError';
    this.status = status;
    this.details = details;
    this.code = details?.code ?? null;
  }
}

// ---------------------------------------------------------------------------
// Module state

let gisPromise = null;
let tokenClient = null;
let token = null; // { accessToken, expiresAt }
let inFlight = null;

export function __resetForTests() {
  gisPromise = null;
  tokenClient = null;
  token = null;
  inFlight = null;
}

// ---------------------------------------------------------------------------
// Configuration

/** Read at call time so tests can stub the env between cases. */
export function getClientId() {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
}

export function isDriveConfigured() {
  return getClientId() !== '';
}

// ---------------------------------------------------------------------------
// Google Identity Services loading

export function getGisSync() {
  return globalThis.google?.accounts?.oauth2 ?? null;
}

/**
 * Resolve the GIS oauth2 namespace, injecting the script once if needed.
 * Failures clear the memo so a later call can retry.
 */
export function loadGis({ timeoutMs = 15_000 } = {}) {
  const existing = getGisSync();
  if (existing) return Promise.resolve(existing);
  if (gisPromise) return gisPromise;

  gisPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      gisPromise = null;
      reject(new DriveAuthError('gis_load_failed', 'No document to load Google Identity Services into'));
      return;
    }
    const script = document.createElement('script');
    let timer = null;
    const fail = (message) => {
      clearTimeout(timer);
      gisPromise = null;
      script.remove();
      reject(new DriveAuthError('gis_load_failed', message));
    };
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      clearTimeout(timer);
      const gis = getGisSync();
      if (gis) resolve(gis);
      else fail('Google Identity Services loaded without the oauth2 client');
    };
    script.onerror = () => fail('Could not load Google Identity Services');
    timer = setTimeout(() => fail('Timed out loading Google Identity Services'), timeoutMs);
    document.head.appendChild(script);
  });
  return gisPromise;
}

// ---------------------------------------------------------------------------
// Tokens

const AUTH_ERROR_CODES = new Set(['popup_closed', 'popup_failed_to_open', 'access_denied']);
const mapAuthCode = (raw) => (AUTH_ERROR_CODES.has(raw) ? raw : 'unknown');

function hasDriveScope(scope) {
  if (typeof scope !== 'string' || scope === '') return true; // GIS omits it in some flows
  return scope.split(/\s+/).includes(DRIVE_SCOPE);
}

function requestToken(oauth2, prompt) {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = oauth2.initTokenClient({
        client_id: getClientId(),
        scope: DRIVE_SCOPE,
        callback: () => {},
        error_callback: () => {},
      });
    }
    // GIS lets the callbacks be swapped per request; this is the documented way
    // to await a single requestAccessToken() call.
    tokenClient.callback = (response) => {
      if (!response || response.error) {
        reject(new DriveAuthError(mapAuthCode(response?.error), response?.error_description));
        return;
      }
      if (!hasDriveScope(response.scope)) {
        reject(new DriveAuthError('scope_denied', 'Google Drive app-data permission was not granted'));
        return;
      }
      const expiresIn = Number(response.expires_in) || 3600;
      token = { accessToken: response.access_token, expiresAt: Date.now() + expiresIn * 1000 };
      resolve(token.accessToken);
    };
    tokenClient.error_callback = (err) => {
      reject(new DriveAuthError(mapAuthCode(err?.type), err?.message));
    };
    tokenClient.requestAccessToken({ prompt });
  });
}

/**
 * Get a valid access token, prompting the user only when needed.
 *
 * Must be called from a user gesture when a popup may be required. When GIS
 * is already loaded the request is issued synchronously inside this call, so
 * popup blockers see it as part of the click.
 *
 * @param {{ prompt?: '' | 'select_account' | 'consent' }} options
 */
export function getAccessToken({ prompt = '' } = {}) {
  if (!isDriveConfigured()) {
    return Promise.reject(new DriveAuthError('unconfigured', 'VITE_GOOGLE_CLIENT_ID is not set'));
  }
  if (token && token.expiresAt - Date.now() > TOKEN_MARGIN_MS) {
    return Promise.resolve(token.accessToken);
  }
  if (inFlight) return inFlight;

  const gis = getGisSync();
  const request = gis ? requestToken(gis, prompt) : loadGis().then((loaded) => requestToken(loaded, prompt));
  inFlight = request.finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function forgetToken() {
  token = null;
}

/** Best effort: revoke the current token with Google, then forget it. Never throws. */
export async function revokeToken() {
  const current = token?.accessToken;
  forgetToken();
  if (!current) return;
  try {
    const gis = getGisSync();
    if (gis?.revoke) {
      await new Promise((resolve) => gis.revoke(current, resolve));
    }
  } catch {
    // ignore: the token expires on its own within the hour
  }
}

/**
 * Run `fn(token)`; on a 401 forget the token, silently request a new one and
 * retry exactly once.
 */
export async function withAuth(fn, { prompt = '' } = {}) {
  let accessToken = await getAccessToken({ prompt });
  try {
    return await fn(accessToken);
  } catch (err) {
    if (err instanceof DriveApiError && err.status === 401) {
      forgetToken();
      accessToken = await getAccessToken({ prompt: '' });
      return fn(accessToken);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Drive REST

async function driveFetch(accessToken, url, init = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    throw new DriveApiError(0, 'Network error while contacting Google Drive', { cause: String(err) });
  }
  if (!response.ok) {
    let details = null;
    let message = response.statusText || `HTTP ${response.status}`;
    try {
      details = await response.json();
      message = details?.error?.message ?? message;
    } catch {
      // body was not JSON
    }
    throw new DriveApiError(response.status, message, details);
  }
  return response;
}

const escapeQuery = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** Newest non-trashed file with this name in appDataFolder, or null. */
export async function findBackupFile(accessToken, name) {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${escapeQuery(name)}' and trashed = false`,
    fields: 'files(id,name,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: '10',
  });
  const res = await driveFetch(accessToken, `${DRIVE_API}/files?${params}`);
  const body = await res.json();
  return body?.files?.[0] ?? null;
}

export async function downloadJson(accessToken, fileId) {
  const res = await driveFetch(accessToken, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new DriveApiError(res.status, 'The backup file is not valid JSON', { code: 'invalid_json' });
  }
}

export function buildMultipartBody(metadata, content, boundary) {
  const json = typeof content === 'string' ? content : JSON.stringify(content);
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    json,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

/** Create a JSON file in appDataFolder. Returns { id, modifiedTime }. */
export async function createJsonFile(accessToken, { name, content, parents = ['appDataFolder'] }) {
  const boundary = `lsd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const body = buildMultipartBody({ name, mimeType: 'application/json', parents }, content, boundary);
  const res = await driveFetch(accessToken, `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return res.json();
}

/** Replace the content of an existing file. Returns { id, modifiedTime }. */
export async function updateJsonFile(accessToken, fileId, content) {
  const body = typeof content === 'string' ? content : JSON.stringify(content);
  const res = await driveFetch(
    accessToken,
    `${DRIVE_UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,modifiedTime`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }
  );
  return res.json();
}
