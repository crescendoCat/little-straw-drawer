import {
  DRIVE_SCOPE,
  GIS_SRC,
  DRIVE_API,
  DRIVE_UPLOAD,
  DriveAuthError,
  DriveApiError,
  getClientId,
  isDriveConfigured,
  getGisSync,
  loadGis,
  getAccessToken,
  forgetToken,
  revokeToken,
  withAuth,
  findBackupFile,
  downloadJson,
  createJsonFile,
  updateJsonFile,
  buildMultipartBody,
  __resetForTests,
} from './googleDrive';

/** Fake `window.google.accounts.oauth2` whose token client we drive by hand. */
function installFakeGis() {
  const client = { requestAccessToken: vi.fn(), callback: null, error_callback: null };
  const oauth2 = {
    initTokenClient: vi.fn(() => client),
    revoke: vi.fn((_token, done) => done && done()),
  };
  globalThis.google = { accounts: { oauth2 } };
  return { client, oauth2 };
}

const okResponse = (body, { text } = {}) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
  text: async () => text ?? JSON.stringify(body),
});
const errorResponse = (status, body = null) => ({
  ok: false,
  status,
  statusText: `HTTP ${status}`,
  json: async () => {
    if (body === null) throw new Error('no body');
    return body;
  },
  text: async () => '',
});

const configure = () => vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');

afterEach(() => {
  __resetForTests();
  delete globalThis.google;
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.querySelectorAll(`script[src="${GIS_SRC}"]`).forEach((s) => s.remove());
});

describe('configuration', () => {
  test('is unconfigured when the env var is empty', () => {
    expect(getClientId()).toBe('');
    expect(isDriveConfigured()).toBe(false);
  });

  test('reads the env var at call time and trims it', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '  abc.apps.googleusercontent.com ');
    expect(getClientId()).toBe('abc.apps.googleusercontent.com');
    expect(isDriveConfigured()).toBe(true);
  });

  test('getAccessToken rejects with unconfigured without touching window.google', async () => {
    const { oauth2 } = installFakeGis();
    await expect(getAccessToken()).rejects.toMatchObject({ name: 'DriveAuthError', code: 'unconfigured' });
    expect(oauth2.initTokenClient).not.toHaveBeenCalled();
  });
});

describe('loadGis', () => {
  test('resolves immediately when GIS is already on the page', async () => {
    const { oauth2 } = installFakeGis();
    await expect(loadGis()).resolves.toBe(oauth2);
    expect(document.querySelector(`script[src="${GIS_SRC}"]`)).toBeNull();
  });

  test('injects the script once and resolves when it loads', async () => {
    const first = loadGis();
    const second = loadGis();
    expect(second).toBe(first);
    const scripts = document.querySelectorAll(`script[src="${GIS_SRC}"]`);
    expect(scripts).toHaveLength(1);

    const { oauth2 } = installFakeGis();
    scripts[0].dispatchEvent(new Event('load'));
    await expect(first).resolves.toBe(oauth2);
    expect(getGisSync()).toBe(oauth2);
  });

  test('rejects when the script fails and allows a retry', async () => {
    const attempt = loadGis();
    document.querySelector(`script[src="${GIS_SRC}"]`).dispatchEvent(new Event('error'));
    await expect(attempt).rejects.toMatchObject({ code: 'gis_load_failed' });
    expect(document.querySelector(`script[src="${GIS_SRC}"]`)).toBeNull();

    const retry = loadGis();
    expect(document.querySelector(`script[src="${GIS_SRC}"]`)).not.toBeNull();
    installFakeGis();
    document.querySelector(`script[src="${GIS_SRC}"]`).dispatchEvent(new Event('load'));
    await expect(retry).resolves.toBeDefined();
  });

  test('rejects on timeout', async () => {
    vi.useFakeTimers();
    const attempt = loadGis({ timeoutMs: 1000 });
    vi.advanceTimersByTime(1001);
    await expect(attempt).rejects.toMatchObject({ code: 'gis_load_failed' });
  });
});

describe('getAccessToken', () => {
  beforeEach(configure);

  test('initialises the client with the client id and app-data scope, then requests silently', async () => {
    const { client, oauth2 } = installFakeGis();
    const pending = getAccessToken();
    expect(oauth2.initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id', scope: DRIVE_SCOPE })
    );
    expect(client.requestAccessToken).toHaveBeenCalledWith({ prompt: '' });

    client.callback({ access_token: 'tok-1', expires_in: 3600, scope: DRIVE_SCOPE });
    await expect(pending).resolves.toBe('tok-1');
  });

  test('passes the prompt through', () => {
    const { client } = installFakeGis();
    getAccessToken({ prompt: 'select_account' }).catch(() => {});
    expect(client.requestAccessToken).toHaveBeenCalledWith({ prompt: 'select_account' });
  });

  test('requests synchronously inside the call when GIS is preloaded (popup blockers)', () => {
    const { client } = installFakeGis();
    getAccessToken().catch(() => {});
    expect(client.requestAccessToken).toHaveBeenCalledTimes(1);
  });

  test('caches the token until shortly before it expires, then re-requests', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const { client } = installFakeGis();
    client.requestAccessToken.mockImplementation(() =>
      client.callback({ access_token: `tok-${client.requestAccessToken.mock.calls.length}`, expires_in: 3600, scope: DRIVE_SCOPE })
    );

    await expect(getAccessToken()).resolves.toBe('tok-1');
    await expect(getAccessToken()).resolves.toBe('tok-1');
    expect(client.requestAccessToken).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-01-01T00:59:30Z')); // inside the 60 s safety margin
    await expect(getAccessToken()).resolves.toBe('tok-2');
    expect(client.requestAccessToken).toHaveBeenCalledTimes(2);
  });

  test('shares one in-flight request between concurrent callers', async () => {
    const { client } = installFakeGis();
    const a = getAccessToken();
    const b = getAccessToken();
    expect(client.requestAccessToken).toHaveBeenCalledTimes(1);
    client.callback({ access_token: 'tok', expires_in: 3600, scope: DRIVE_SCOPE });
    await expect(Promise.all([a, b])).resolves.toEqual(['tok', 'tok']);
  });

  test('loads GIS on demand when it is not present yet', async () => {
    const pending = getAccessToken();
    const { client } = installFakeGis();
    document.querySelector(`script[src="${GIS_SRC}"]`).dispatchEvent(new Event('load'));
    await Promise.resolve();
    await Promise.resolve();
    expect(client.requestAccessToken).toHaveBeenCalled();
    client.callback({ access_token: 'late', expires_in: 3600, scope: DRIVE_SCOPE });
    await expect(pending).resolves.toBe('late');
  });

  test.each([
    ['popup_closed', 'popup_closed'],
    ['popup_failed_to_open', 'popup_failed_to_open'],
    ['something_else', 'unknown'],
  ])('maps error_callback type %s to code %s', async (type, code) => {
    const { client } = installFakeGis();
    const pending = getAccessToken();
    client.error_callback({ type, message: 'boom' });
    await expect(pending).rejects.toMatchObject({ name: 'DriveAuthError', code });
  });

  test('maps an access_denied response to code access_denied', async () => {
    const { client } = installFakeGis();
    const pending = getAccessToken();
    client.callback({ error: 'access_denied', error_description: 'nope' });
    await expect(pending).rejects.toMatchObject({ code: 'access_denied', message: 'nope' });
  });

  test('rejects with scope_denied when the drive scope is missing from the grant', async () => {
    const { client } = installFakeGis();
    const pending = getAccessToken();
    client.callback({ access_token: 'tok', expires_in: 3600, scope: 'openid email' });
    await expect(pending).rejects.toMatchObject({ code: 'scope_denied' });
  });

  test('a failed request does not poison the next attempt', async () => {
    const { client } = installFakeGis();
    const first = getAccessToken();
    client.error_callback({ type: 'popup_closed' });
    await expect(first).rejects.toBeInstanceOf(DriveAuthError);

    const second = getAccessToken();
    client.callback({ access_token: 'tok', expires_in: 3600, scope: DRIVE_SCOPE });
    await expect(second).resolves.toBe('tok');
  });
});

describe('revokeToken', () => {
  beforeEach(configure);

  test('revokes the cached token and forgets it', async () => {
    const { client, oauth2 } = installFakeGis();
    const pending = getAccessToken();
    client.callback({ access_token: 'tok', expires_in: 3600, scope: DRIVE_SCOPE });
    await pending;

    await revokeToken();
    expect(oauth2.revoke).toHaveBeenCalledWith('tok', expect.any(Function));

    getAccessToken().catch(() => {});
    expect(client.requestAccessToken).toHaveBeenCalledTimes(2);
  });

  test('is a no-op without a token and never throws', async () => {
    const { oauth2 } = installFakeGis();
    oauth2.revoke.mockImplementation(() => {
      throw new Error('boom');
    });
    await expect(revokeToken()).resolves.toBeUndefined();
    expect(oauth2.revoke).not.toHaveBeenCalled();
  });
});

describe('Drive REST helpers', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  test('findBackupFile queries appDataFolder by name and returns the newest match', async () => {
    fetch.mockResolvedValue(okResponse({ files: [{ id: 'f1', name: 'x.json', modifiedTime: 't1' }, { id: 'f2' }] }));
    const file = await findBackupFile('tok', "it's.json");
    expect(file).toEqual({ id: 'f1', name: 'x.json', modifiedTime: 't1' });

    const [url, init] = fetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(`${DRIVE_API}/files`);
    expect(parsed.searchParams.get('spaces')).toBe('appDataFolder');
    expect(parsed.searchParams.get('q')).toBe("name = 'it\\'s.json' and trashed = false");
    expect(parsed.searchParams.get('orderBy')).toBe('modifiedTime desc');
    expect(parsed.searchParams.get('fields')).toBe('files(id,name,modifiedTime)');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  test('findBackupFile returns null when nothing matches', async () => {
    fetch.mockResolvedValue(okResponse({ files: [] }));
    await expect(findBackupFile('tok', 'a.json')).resolves.toBeNull();
  });

  test('downloadJson fetches alt=media and parses the body', async () => {
    fetch.mockResolvedValue(okResponse(null, { text: '{"a":1}' }));
    await expect(downloadJson('tok', 'id/with slash')).resolves.toEqual({ a: 1 });
    expect(fetch.mock.calls[0][0]).toBe(`${DRIVE_API}/files/id%2Fwith%20slash?alt=media`);
  });

  test('downloadJson flags invalid JSON', async () => {
    fetch.mockResolvedValue(okResponse(null, { text: '{oops' }));
    await expect(downloadJson('tok', 'f')).rejects.toMatchObject({ name: 'DriveApiError', code: 'invalid_json' });
  });

  test('buildMultipartBody produces a two-part related body', () => {
    const body = buildMultipartBody({ name: 'a.json', parents: ['appDataFolder'] }, { x: 1 }, 'B');
    expect(body).toBe(
      [
        '--B',
        'Content-Type: application/json; charset=UTF-8',
        '',
        '{"name":"a.json","parents":["appDataFolder"]}',
        '--B',
        'Content-Type: application/json',
        '',
        '{"x":1}',
        '--B--',
        '',
      ].join('\r\n')
    );
  });

  test('createJsonFile POSTs a multipart upload into appDataFolder', async () => {
    fetch.mockResolvedValue(okResponse({ id: 'new', modifiedTime: 't' }));
    await expect(createJsonFile('tok', { name: 'a.json', content: { x: 1 } })).resolves.toEqual({ id: 'new', modifiedTime: 't' });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toMatch(/^multipart\/related; boundary=/);
    expect(init.body).toContain('"parents":["appDataFolder"]');
    expect(init.body).toContain('"name":"a.json"');
    expect(init.body).toContain('{"x":1}');
  });

  test('updateJsonFile PATCHes media content', async () => {
    fetch.mockResolvedValue(okResponse({ id: 'f', modifiedTime: 't' }));
    await updateJsonFile('tok', 'f', { y: 2 });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${DRIVE_UPLOAD}/files/f?uploadType=media&fields=id,modifiedTime`);
    expect(init.method).toBe('PATCH');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"y":2}');
  });

  test('non-2xx responses become DriveApiError with status and Google message', async () => {
    fetch.mockResolvedValue(errorResponse(403, { error: { message: 'Drive API has not been used' } }));
    await expect(findBackupFile('tok', 'a')).rejects.toMatchObject({
      name: 'DriveApiError',
      status: 403,
      message: 'Drive API has not been used',
    });
  });

  test('non-JSON error bodies still produce a DriveApiError', async () => {
    fetch.mockResolvedValue(errorResponse(500));
    await expect(findBackupFile('tok', 'a')).rejects.toMatchObject({ status: 500, message: 'HTTP 500' });
  });

  test('a fetch failure becomes DriveApiError status 0', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(downloadJson('tok', 'f')).rejects.toMatchObject({ name: 'DriveApiError', status: 0 });
  });
});

describe('withAuth', () => {
  beforeEach(configure);

  test('passes the token to fn and returns its result', async () => {
    const { client } = installFakeGis();
    client.requestAccessToken.mockImplementation(() =>
      client.callback({ access_token: 'tok', expires_in: 3600, scope: DRIVE_SCOPE })
    );
    const fn = vi.fn(async (t) => `used ${t}`);
    await expect(withAuth(fn, { prompt: 'select_account' })).resolves.toBe('used tok');
    expect(client.requestAccessToken).toHaveBeenCalledWith({ prompt: 'select_account' });
  });

  test('retries once with a fresh token after a 401', async () => {
    const { client } = installFakeGis();
    let n = 0;
    client.requestAccessToken.mockImplementation(() =>
      client.callback({ access_token: `tok-${++n}`, expires_in: 3600, scope: DRIVE_SCOPE })
    );
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new DriveApiError(401, 'Invalid Credentials'))
      .mockResolvedValueOnce('second try');

    await expect(withAuth(fn)).resolves.toBe('second try');
    expect(fn).toHaveBeenNthCalledWith(1, 'tok-1');
    expect(fn).toHaveBeenNthCalledWith(2, 'tok-2');
    expect(client.requestAccessToken).toHaveBeenNthCalledWith(2, { prompt: '' });
  });

  test('does not retry other errors', async () => {
    const { client } = installFakeGis();
    client.requestAccessToken.mockImplementation(() =>
      client.callback({ access_token: 'tok', expires_in: 3600, scope: DRIVE_SCOPE })
    );
    const fn = vi.fn().mockRejectedValue(new DriveApiError(500, 'boom'));
    await expect(withAuth(fn)).rejects.toMatchObject({ status: 500 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('gives up if the second 401 persists', async () => {
    const { client } = installFakeGis();
    client.requestAccessToken.mockImplementation(() =>
      client.callback({ access_token: 'tok', expires_in: 3600, scope: DRIVE_SCOPE })
    );
    const fn = vi.fn().mockRejectedValue(new DriveApiError(401, 'still bad'));
    await expect(withAuth(fn)).rejects.toMatchObject({ status: 401 });
    expect(fn).toHaveBeenCalledTimes(2);
    forgetToken();
  });
});
