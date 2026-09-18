import { createAsyncThunk } from '@reduxjs/toolkit';
import * as drive from '../../lib/googleDrive';
import {
  BACKUP_FILE_NAME,
  PRE_RESTORE_BACKUP_KEY,
  SnapshotError,
  buildSnapshot,
  fingerprint,
  pickSnapshotData,
  validateSnapshot,
} from './snapshot';
import { hydrate as hydrateStraw } from '../straw/strawSlice';
import { hydrate as hydrateSettings } from '../settings/slice';

class NoBackupError extends Error {
  constructor() {
    super('No backup was found on Google Drive.');
    this.name = 'NoBackupError';
    this.code = 'no_backup';
  }
}

const CORRUPT_MESSAGE = 'The backup on Google Drive could not be read. Save to overwrite it with this device\'s data.';

/** Map any thrown error to the plain `{ code, message }` stored in state. */
export function toCloudError(err) {
  if (err instanceof drive.DriveAuthError) {
    switch (err.code) {
      case 'popup_closed':
      case 'access_denied':
        return { code: 'cancelled', message: '' };
      case 'popup_failed_to_open':
        return { code: err.code, message: 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.' };
      case 'gis_load_failed':
        return { code: err.code, message: 'Could not load Google sign-in. Check your connection and try again.' };
      case 'scope_denied':
        return { code: err.code, message: 'Google Drive permission was not granted. Please allow access to app data.' };
      case 'unconfigured':
        return { code: err.code, message: 'Google Drive backup is not configured.' };
      default:
        return { code: 'auth', message: 'Google sign-in failed. Please try again.' };
    }
  }
  if (err instanceof drive.DriveApiError) {
    if (err.code === 'invalid_json') return { code: 'corrupt', message: CORRUPT_MESSAGE };
    if (err.status === 0) return { code: 'network', message: 'Network error while contacting Google Drive.' };
    if (err.status === 403) {
      return { code: 'forbidden', message: 'Google Drive access denied (HTTP 403). Is the Drive API enabled for this project?' };
    }
    if (err.status === 404) return { code: 'not_found', message: 'The backup file was not found on Google Drive.' };
    return { code: 'api', message: `Google Drive error (HTTP ${err.status}): ${err.message}` };
  }
  if (err instanceof SnapshotError) return { code: 'corrupt', message: CORRUPT_MESSAGE };
  if (err instanceof NoBackupError) return { code: err.code, message: err.message };
  return { code: 'unknown', message: err?.message ?? 'Unexpected error.' };
}

const onlyWhenIdle = { condition: (_, { getState }) => getState().cloud.busy === 'idle' };
const isNotFound = (err) => err instanceof drive.DriveApiError && err.status === 404;

/** Update the known file, or fall back to search + create. Returns the file id. */
async function upload(accessToken, snapshot, fileId) {
  const content = JSON.stringify(snapshot);
  if (fileId) {
    try {
      const updated = await drive.updateJsonFile(accessToken, fileId, content);
      return updated?.id ?? fileId;
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }
  const existing = await drive.findBackupFile(accessToken, BACKUP_FILE_NAME);
  if (existing) {
    const updated = await drive.updateJsonFile(accessToken, existing.id, content);
    return updated?.id ?? existing.id;
  }
  const created = await drive.createJsonFile(accessToken, { name: BACKUP_FILE_NAME, content });
  return created.id;
}

/** Keep one copy of the local data so a mistaken restore can be recovered by hand. */
function writePreRestoreBackup(rootState) {
  try {
    localStorage.setItem(PRE_RESTORE_BACKUP_KEY, JSON.stringify(buildSnapshot(rootState)));
  } catch {
    // storage full or unavailable; restoring still proceeds
  }
}

/** Hydrate both slices from a validated snapshot and return the resulting fingerprint. */
function applySnapshot(dispatch, getState, snapshot) {
  writePreRestoreBackup(getState());
  dispatch(hydrateStraw(snapshot.data.straw));
  dispatch(hydrateSettings(snapshot.data.settings));
  // Computed after hydrate so sanitization (recomputed counters, dropped keys)
  // cannot leave the status stuck on "unsaved".
  return fingerprint(pickSnapshotData(getState()));
}

/**
 * Link this device to Google Drive.
 * Outcomes: 'synced' (no remote file, or identical), 'conflict' (remote differs;
 * the user decides in CloudConflictModal), 'corrupt' (remote unreadable).
 */
export const linkDrive = createAsyncThunk(
  'cloud/link',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await drive.withAuth(
        async (accessToken) => {
          const file = await drive.findBackupFile(accessToken, BACKUP_FILE_NAME);
          const local = buildSnapshot(getState());
          const localFingerprint = fingerprint(local.data);

          if (!file) {
            const created = await drive.createJsonFile(accessToken, { name: BACKUP_FILE_NAME, content: local });
            return { outcome: 'synced', fileId: created.id, savedAt: local.savedAt, fingerprint: localFingerprint };
          }

          let remote;
          try {
            remote = validateSnapshot(await drive.downloadJson(accessToken, file.id));
          } catch (err) {
            if (err instanceof SnapshotError || err?.code === 'invalid_json') {
              return { outcome: 'corrupt', fileId: file.id, message: CORRUPT_MESSAGE };
            }
            throw err;
          }

          const remoteFingerprint = fingerprint(remote.data);
          const savedAt = remote.savedAt ?? file.modifiedTime ?? null;
          if (remoteFingerprint === localFingerprint) {
            return { outcome: 'synced', fileId: file.id, savedAt, fingerprint: remoteFingerprint };
          }
          return {
            outcome: 'conflict',
            fileId: file.id,
            pendingRemote: { fileId: file.id, modifiedTime: file.modifiedTime ?? null, savedAt, snapshot: remote },
          };
        },
        { prompt: 'select_account' }
      );
    } catch (err) {
      return rejectWithValue(toCloudError(err));
    }
  },
  onlyWhenIdle
);

export const saveToDrive = createAsyncThunk(
  'cloud/save',
  async (_, { getState, rejectWithValue }) => {
    try {
      const snapshot = buildSnapshot(getState());
      const fileId = await drive.withAuth((accessToken) => upload(accessToken, snapshot, getState().cloud.fileId));
      return { fileId, savedAt: snapshot.savedAt, fingerprint: fingerprint(snapshot.data) };
    } catch (err) {
      return rejectWithValue(toCloudError(err));
    }
  },
  onlyWhenIdle
);

export const restoreFromDrive = createAsyncThunk(
  'cloud/restore',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const storedId = getState().cloud.fileId;
      const { remote, fileId } = await drive.withAuth(async (accessToken) => {
        let id = storedId;
        let json = null;
        if (id) {
          try {
            json = await drive.downloadJson(accessToken, id);
          } catch (err) {
            if (!isNotFound(err)) throw err;
            id = null;
          }
        }
        if (!id) {
          const file = await drive.findBackupFile(accessToken, BACKUP_FILE_NAME);
          if (!file) throw new NoBackupError();
          id = file.id;
          json = await drive.downloadJson(accessToken, id);
        }
        return { remote: validateSnapshot(json), fileId: id };
      });
      const restoredFingerprint = applySnapshot(dispatch, getState, remote);
      return { fileId, savedAt: remote.savedAt ?? new Date().toISOString(), fingerprint: restoredFingerprint };
    } catch (err) {
      return rejectWithValue(toCloudError(err));
    }
  },
  onlyWhenIdle
);

/**
 * Resolve the first-link conflict.
 * @param {'restore'|'overwrite'} choice
 */
export const resolveConflict = createAsyncThunk(
  'cloud/resolveConflict',
  async (choice, { getState, dispatch, rejectWithValue }) => {
    const pending = getState().cloud.pendingRemote;
    if (!pending) return rejectWithValue({ code: 'no_conflict', message: 'There is no pending backup to resolve.' });
    try {
      if (choice === 'restore') {
        const restoredFingerprint = applySnapshot(dispatch, getState, pending.snapshot);
        return { fileId: pending.fileId, savedAt: pending.savedAt ?? new Date().toISOString(), fingerprint: restoredFingerprint };
      }
      const snapshot = buildSnapshot(getState());
      const fileId = await drive.withAuth((accessToken) => upload(accessToken, snapshot, pending.fileId));
      return { fileId, savedAt: snapshot.savedAt, fingerprint: fingerprint(snapshot.data) };
    } catch (err) {
      return rejectWithValue(toCloudError(err));
    }
  },
  onlyWhenIdle
);

/** Forget the link on this device. The Drive file is left in place. */
export const unlinkDrive = createAsyncThunk(
  'cloud/unlink',
  async () => {
    await drive.revokeToken();
    return null;
  },
  onlyWhenIdle
);
