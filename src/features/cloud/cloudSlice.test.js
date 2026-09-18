import reducer, {
  cloudInitialState,
  dismissPendingRemote,
  clearCloudError,
  computeCloudStatus,
  selectCloudStatus,
  selectCurrentFingerprint,
} from './cloudSlice';
import { linkDrive, saveToDrive, restoreFromDrive, resolveConflict, unlinkDrive } from './cloudThunks';
import { makeStore } from '../../test/renderWithStore';
import { addStraw } from '../straw/strawSlice';

const synced = { fileId: 'f1', savedAt: '2026-09-19T00:00:00.000Z', fingerprint: 'abcd1234:10' };
const linkedState = { ...cloudInitialState, linked: true, fileId: 'f1', lastSyncedAt: synced.savedAt, lastSyncedFingerprint: synced.fingerprint };

describe('cloudSlice reducers', () => {
  test('initial state is unlinked and idle, with falsy persisted fields', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toEqual(cloudInitialState);
    for (const key of ['linked', 'fileId', 'lastSyncedAt', 'lastSyncedFingerprint']) {
      expect(state[key]).toBeFalsy();
    }
  });

  test.each([
    ['linkDrive', linkDrive.pending(''), 'connecting'],
    ['saveToDrive', saveToDrive.pending(''), 'saving'],
    ['restoreFromDrive', restoreFromDrive.pending(''), 'restoring'],
    ['resolveConflict(restore)', resolveConflict.pending('', 'restore'), 'restoring'],
    ['resolveConflict(overwrite)', resolveConflict.pending('', 'overwrite'), 'saving'],
    ['unlinkDrive', unlinkDrive.pending(''), 'unlinking'],
  ])('%s.pending sets busy and clears a previous error', (_label, action, busy) => {
    const state = reducer({ ...cloudInitialState, error: 'old' }, action);
    expect(state.busy).toBe(busy);
    expect(state.error).toBeNull();
  });

  test('rejected with code cancelled leaves no error', () => {
    const state = reducer({ ...cloudInitialState, busy: 'connecting' }, linkDrive.rejected(null, '', undefined, { code: 'cancelled', message: '' }));
    expect(state.busy).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.linked).toBe(false);
  });

  test('rejected with a message stores it', () => {
    const state = reducer({ ...cloudInitialState, busy: 'saving' }, saveToDrive.rejected(null, '', undefined, { code: 'api', message: 'HTTP 500' }));
    expect(state.busy).toBe('idle');
    expect(state.error).toBe('HTTP 500');
  });

  test('rejected without a payload falls back to the serialized error', () => {
    const state = reducer(cloudInitialState, restoreFromDrive.rejected(new Error('kaboom'), ''));
    expect(state.error).toBe('kaboom');
  });

  test('linkDrive.fulfilled synced marks linked and synced', () => {
    const state = reducer(cloudInitialState, linkDrive.fulfilled({ outcome: 'synced', ...synced }, ''));
    expect(state).toEqual({ ...linkedState, busy: 'idle' });
  });

  test('linkDrive.fulfilled conflict stores pendingRemote and stays unsaved', () => {
    const pendingRemote = { fileId: 'f1', modifiedTime: 't', savedAt: 's', snapshot: { data: {} } };
    const state = reducer(cloudInitialState, linkDrive.fulfilled({ outcome: 'conflict', fileId: 'f1', pendingRemote }, ''));
    expect(state.linked).toBe(true);
    expect(state.fileId).toBe('f1');
    expect(state.pendingRemote).toEqual(pendingRemote);
    expect(state.lastSyncedFingerprint).toBeNull();
  });

  test('linkDrive.fulfilled corrupt links but reports an error', () => {
    const state = reducer(cloudInitialState, linkDrive.fulfilled({ outcome: 'corrupt', fileId: 'f1', message: 'unreadable' }, ''));
    expect(state.linked).toBe(true);
    expect(state.error).toBe('unreadable');
    expect(state.lastSyncedFingerprint).toBeNull();
  });

  test.each([
    ['saveToDrive', saveToDrive.fulfilled(synced, '')],
    ['restoreFromDrive', restoreFromDrive.fulfilled(synced, '')],
    ['resolveConflict', resolveConflict.fulfilled(synced, '', 'restore')],
  ])('%s.fulfilled records the sync and clears pendingRemote', (_label, action) => {
    const before = { ...cloudInitialState, linked: true, busy: 'saving', pendingRemote: { fileId: 'x' } };
    const state = reducer(before, action);
    expect(state.busy).toBe('idle');
    expect(state.fileId).toBe('f1');
    expect(state.lastSyncedAt).toBe(synced.savedAt);
    expect(state.lastSyncedFingerprint).toBe(synced.fingerprint);
    expect(state.pendingRemote).toBeNull();
  });

  test('unlinkDrive.fulfilled resets everything', () => {
    const state = reducer({ ...linkedState, busy: 'unlinking', error: 'x' }, unlinkDrive.fulfilled(null, ''));
    expect(state).toEqual(cloudInitialState);
  });

  test('dismissPendingRemote and clearCloudError', () => {
    let state = reducer({ ...cloudInitialState, pendingRemote: { fileId: 'x' }, error: 'e' }, dismissPendingRemote());
    expect(state.pendingRemote).toBeNull();
    state = reducer(state, clearCloudError());
    expect(state.error).toBeNull();
  });
});

describe('computeCloudStatus', () => {
  test.each([
    ['unconfigured beats everything', { ...linkedState, busy: 'saving', error: 'x' }, 'fp', false, 'unconfigured'],
    ['busy beats error and link state', { ...cloudInitialState, busy: 'connecting', error: 'x' }, 'fp', true, 'busy'],
    ['error beats link state', { ...linkedState, error: 'x' }, linkedState.lastSyncedFingerprint, true, 'error'],
    ['not linked', cloudInitialState, 'fp', true, 'disconnected'],
    ['linked and fingerprints match', linkedState, linkedState.lastSyncedFingerprint, true, 'synced'],
    ['linked and fingerprints differ', linkedState, 'other', true, 'unsaved'],
    ['linked but never synced', { ...cloudInitialState, linked: true }, 'fp', true, 'unsaved'],
  ])('%s', (_label, cloud, fingerprint, configured, expected) => {
    expect(computeCloudStatus(cloud, fingerprint, configured)).toBe(expected);
  });
});

describe('selectors against a real store', () => {
  test('selectCloudStatus is unconfigured while the env var is empty', () => {
    const store = makeStore({ cloud: linkedState });
    expect(selectCloudStatus(store.getState())).toBe('unconfigured');
  });

  test('status flips from synced to unsaved when backed-up data changes', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
    const store = makeStore();
    const fp = selectCurrentFingerprint(store.getState());
    store.dispatch(saveToDrive.fulfilled({ ...synced, fingerprint: fp }, ''));
    store.dispatch(linkDrive.fulfilled({ outcome: 'synced', ...synced, fingerprint: fp }, ''));
    expect(selectCloudStatus(store.getState())).toBe('synced');

    store.dispatch(addStraw('changed'));
    expect(selectCloudStatus(store.getState())).toBe('unsaved');
  });

  test('selectCurrentFingerprint is memoized on straw + settings', () => {
    const store = makeStore();
    selectCurrentFingerprint.resetRecomputations();
    const a = selectCurrentFingerprint(store.getState());
    store.dispatch(clearCloudError()); // cloud changed, straw/settings did not
    expect(selectCurrentFingerprint(store.getState())).toBe(a);
    expect(selectCurrentFingerprint.recomputations()).toBe(1);

    store.dispatch(addStraw('x'));
    expect(selectCurrentFingerprint(store.getState())).not.toBe(a);
    expect(selectCurrentFingerprint.recomputations()).toBe(2);
  });
});
