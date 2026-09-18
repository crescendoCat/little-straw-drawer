import { createSlice, createSelector } from '@reduxjs/toolkit';
import { isDriveConfigured } from '../../lib/googleDrive';
import { fingerprint, pickSnapshotData } from './snapshot';
import { linkDrive, saveToDrive, restoreFromDrive, resolveConflict, unlinkDrive } from './cloudThunks';

/**
 * Google Drive backup state.
 *
 * The first four fields are persisted (see PERSISTED_STATES in store.js).
 * redux-localstorage-simple removes a key whose value is falsy, so their
 * defaults must all be falsy: "no key" has to mean "default".
 */
export const cloudInitialState = {
  linked: false,
  fileId: null,
  lastSyncedAt: null,
  lastSyncedFingerprint: null,
  // transient
  busy: 'idle', // 'idle' | 'connecting' | 'saving' | 'restoring' | 'unlinking'
  error: null,
  pendingRemote: null, // { fileId, modifiedTime, savedAt, snapshot } awaiting the user's choice
};

const markSynced = (state, { fileId, savedAt, fingerprint: fp }) => {
  if (fileId) state.fileId = fileId;
  state.lastSyncedAt = savedAt ?? null;
  state.lastSyncedFingerprint = fp ?? null;
  state.pendingRemote = null;
};

const rejected = (state, action) => {
  state.busy = 'idle';
  const payload = action.payload;
  if (payload?.code === 'cancelled') {
    state.error = null;
  } else {
    state.error = payload?.message || action.error?.message || 'Unexpected error.';
  }
};

export const cloudSlice = createSlice({
  name: 'cloud',
  initialState: cloudInitialState,
  reducers: {
    dismissPendingRemote: (state) => {
      state.pendingRemote = null;
    },
    clearCloudError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(linkDrive.pending, (state) => {
        state.busy = 'connecting';
        state.error = null;
      })
      .addCase(linkDrive.fulfilled, (state, action) => {
        const payload = action.payload;
        state.busy = 'idle';
        state.linked = true;
        if (payload.fileId) state.fileId = payload.fileId;
        switch (payload.outcome) {
          case 'synced':
            markSynced(state, payload);
            break;
          case 'conflict':
            state.pendingRemote = payload.pendingRemote;
            break;
          case 'corrupt':
            state.error = payload.message;
            break;
          default:
            break;
        }
      })
      .addCase(linkDrive.rejected, rejected)

      .addCase(saveToDrive.pending, (state) => {
        state.busy = 'saving';
        state.error = null;
      })
      .addCase(saveToDrive.fulfilled, (state, action) => {
        state.busy = 'idle';
        markSynced(state, action.payload);
      })
      .addCase(saveToDrive.rejected, rejected)

      .addCase(restoreFromDrive.pending, (state) => {
        state.busy = 'restoring';
        state.error = null;
      })
      .addCase(restoreFromDrive.fulfilled, (state, action) => {
        state.busy = 'idle';
        markSynced(state, action.payload);
      })
      .addCase(restoreFromDrive.rejected, rejected)

      .addCase(resolveConflict.pending, (state, action) => {
        state.busy = action.meta.arg === 'restore' ? 'restoring' : 'saving';
        state.error = null;
      })
      .addCase(resolveConflict.fulfilled, (state, action) => {
        state.busy = 'idle';
        markSynced(state, action.payload);
      })
      .addCase(resolveConflict.rejected, rejected)

      .addCase(unlinkDrive.pending, (state) => {
        state.busy = 'unlinking';
        state.error = null;
      })
      .addCase(unlinkDrive.fulfilled, () => ({ ...cloudInitialState }))
      .addCase(unlinkDrive.rejected, rejected);
  },
});

export const { dismissPendingRemote, clearCloudError } = cloudSlice.actions;

// ---------------------------------------------------------------------------
// Selectors

export const selectCloud = (state) => state.cloud;

/** Fingerprint of what a backup taken right now would contain. */
export const selectCurrentFingerprint = createSelector(
  [(state) => state.straw, (state) => state.settings],
  (straw, settings) => fingerprint(pickSnapshotData({ straw, settings }))
);

/**
 * @returns {'unconfigured'|'busy'|'error'|'disconnected'|'synced'|'unsaved'}
 */
export function computeCloudStatus(cloud, currentFingerprint, configured) {
  if (!configured) return 'unconfigured';
  if (cloud.busy !== 'idle') return 'busy';
  if (cloud.error) return 'error';
  if (!cloud.linked) return 'disconnected';
  return cloud.lastSyncedFingerprint === currentFingerprint ? 'synced' : 'unsaved';
}

// isDriveConfigured() is read here, outside createSelector, so env stubs in
// tests take effect immediately.
export const selectCloudStatus = (state) =>
  computeCloudStatus(state.cloud, selectCurrentFingerprint(state), isDriveConfigured());

export default cloudSlice.reducer;
