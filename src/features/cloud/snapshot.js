/**
 * Backup snapshot helpers. Pure functions, no store or network access.
 *
 * A snapshot is what gets written to Google Drive:
 *   { version, app, savedAt, data: { straw: {...}, settings: {...} } }
 *
 * `data` is built from an explicit whitelist so transient UI flags
 * (straw.isPlayingAnimation, settings.displaySetting) and the tutorial slice
 * (which holds JSX) never leave the device.
 */

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_APP = 'little-straw-drawer';
export const BACKUP_FILE_NAME = 'little-straw-drawer.json';
/** localStorage key holding the last local state before a restore overwrote it. */
export const PRE_RESTORE_BACKUP_KEY = 'little-straw-drawer.preRestoreBackup';

export function pickSnapshotData({ straw, settings }) {
  return {
    straw: {
      straws: straw.straws,
      history: straw.history,
      presets: straw.presets,
      strawCount: straw.strawCount,
      presetCount: straw.presetCount,
    },
    settings: {
      isRepeatable: settings.isRepeatable,
      showAnimation: settings.showAnimation,
      animationType: settings.animationType,
      animationTimeout: settings.animationTimeout,
    },
  };
}

export function buildSnapshot(rootState, now = new Date()) {
  return {
    version: SNAPSHOT_VERSION,
    app: SNAPSHOT_APP,
    savedAt: now.toISOString(),
    data: pickSnapshotData(rootState),
  };
}

/**
 * JSON.stringify with recursively sorted object keys. Straw objects gain
 * `rgb` / `isPicked` in whatever order the user clicked, so a plain
 * JSON.stringify of identical data could differ between devices and make the
 * first link report a false conflict.
 */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item) ?? 'null').join(',')}]`;
  }
  const parts = [];
  for (const key of Object.keys(value).sort()) {
    const encoded = stableStringify(value[key]);
    if (encoded !== undefined) parts.push(`${JSON.stringify(key)}:${encoded}`);
  }
  return `{${parts.join(',')}}`;
}

/** FNV-1a 32-bit over the stable JSON, plus the length as a cheap extra check. */
export function fingerprint(data) {
  const text = stableStringify(data) ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}:${text.length}`;
}

export class SnapshotError extends Error {
  /** @param {'not_object'|'wrong_app'|'unsupported_version'|'malformed'} code */
  constructor(code, message) {
    super(message ?? `Invalid snapshot (${code})`);
    this.name = 'SnapshotError';
    this.code = code;
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonNegativeInt = (v) => Number.isInteger(v) && v >= 0;

/**
 * Check a parsed JSON document and return a normalized snapshot, or throw a
 * SnapshotError. Unknown keys inside straws are passed through; counters are
 * optional because the straw hydrate reducer recomputes them.
 */
export function validateSnapshot(json) {
  if (!isPlainObject(json)) throw new SnapshotError('not_object');
  if (json.app !== SNAPSHOT_APP) throw new SnapshotError('wrong_app');
  if (!Number.isInteger(json.version) || json.version < 1) throw new SnapshotError('malformed', 'Missing version');
  if (json.version > SNAPSHOT_VERSION) throw new SnapshotError('unsupported_version');

  const { data } = json;
  if (!isPlainObject(data) || !isPlainObject(data.straw)) throw new SnapshotError('malformed', 'Missing data.straw');

  const { straws, history = [], presets = [], strawCount, presetCount } = data.straw;
  if (!Array.isArray(straws)) throw new SnapshotError('malformed', 'straws is not an array');
  for (const s of straws) {
    if (!isPlainObject(s) || !Number.isInteger(s.id) || typeof s.name !== 'string') {
      throw new SnapshotError('malformed', 'Invalid straw entry');
    }
  }
  if (!Array.isArray(history)) throw new SnapshotError('malformed', 'history is not an array');
  if (!Array.isArray(presets)) throw new SnapshotError('malformed', 'presets is not an array');
  for (const p of presets) {
    if (!isPlainObject(p) || !Number.isInteger(p.id) || !Array.isArray(p.value)) {
      throw new SnapshotError('malformed', 'Invalid preset entry');
    }
  }

  const settings = data.settings === undefined ? {} : data.settings;
  if (!isPlainObject(settings)) throw new SnapshotError('malformed', 'settings is not an object');

  const straw = { straws, history, presets };
  if (isNonNegativeInt(strawCount)) straw.strawCount = strawCount;
  if (isNonNegativeInt(presetCount)) straw.presetCount = presetCount;

  return {
    version: json.version,
    app: json.app,
    savedAt: typeof json.savedAt === 'string' ? json.savedAt : undefined,
    data: { straw, settings },
  };
}
