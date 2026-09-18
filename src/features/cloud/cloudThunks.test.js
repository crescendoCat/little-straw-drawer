import * as drive from '../../lib/googleDrive';
import { linkDrive, saveToDrive, restoreFromDrive, resolveConflict, unlinkDrive, toCloudError } from './cloudThunks';
import { selectCloudStatus, selectCurrentFingerprint, cloudInitialState } from './cloudSlice';
import { SNAPSHOT_APP, BACKUP_FILE_NAME, PRE_RESTORE_BACKUP_KEY, buildSnapshot, validateSnapshot, SnapshotError } from './snapshot';
import { makeStore } from '../../test/renderWithStore';
import { addStraw } from '../straw/strawSlice';
import { openSettings } from '../settings/slice';

vi.mock('../../lib/googleDrive', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isDriveConfigured: vi.fn(() => true),
    withAuth: vi.fn((fn) => fn('tok')),
    findBackupFile: vi.fn(),
    downloadJson: vi.fn(),
    createJsonFile: vi.fn(),
    updateJsonFile: vi.fn(),
    revokeToken: vi.fn(async () => {}),
  };
});

const remoteSnapshot = () => ({
  version: 1,
  app: SNAPSHOT_APP,
  savedAt: '2026-09-18T10:00:00.000Z',
  data: {
    straw: {
      straws: [
        { id: 10, name: 'Remote A' },
        { id: 11, name: 'Remote B', rgb: { r: 1, g: 2, b: 3, a: 1 } },
      ],
      history: [],
      presets: [{ id: 2, value: [{ id: 10, name: 'Remote A' }] }],
      strawCount: 12,
      presetCount: 3,
    },
    settings: { isRepeatable: false, showAnimation: true, animationType: 'default', animationTimeout: 750 },
  },
});

const linked = (extra = {}) => ({
  cloud: { ...cloudInitialState, linked: true, fileId: 'f1', lastSyncedAt: 'x', lastSyncedFingerprint: 'stale', ...extra },
});

beforeEach(() => {
  localStorage.clear();
  drive.withAuth.mockImplementation((fn) => fn('tok'));
  drive.findBackupFile.mockReset();
  drive.downloadJson.mockReset();
  drive.createJsonFile.mockReset();
  drive.updateJsonFile.mockReset();
  drive.revokeToken.mockClear();
});

describe('linkDrive', () => {
  test('asks for an account chooser on the explicit link click', async () => {
    drive.findBackupFile.mockResolvedValue(null);
    drive.createJsonFile.mockResolvedValue({ id: 'new' });
    await makeStore().dispatch(linkDrive());
    expect(drive.withAuth).toHaveBeenCalledWith(expect.any(Function), { prompt: 'select_account' });
  });

  test('creates the backup when Drive has none and ends synced', async () => {
    drive.findBackupFile.mockResolvedValue(null);
    drive.createJsonFile.mockResolvedValue({ id: 'new', modifiedTime: 't' });
    const store = makeStore();

    await store.dispatch(linkDrive());

    expect(drive.findBackupFile).toHaveBeenCalledWith('tok', BACKUP_FILE_NAME);
    const [, args] = drive.createJsonFile.mock.calls[0];
    expect(args.name).toBe(BACKUP_FILE_NAME);
    expect(args.content).toMatchObject({ app: SNAPSHOT_APP, version: 1 });
    expect(args.content.data.straw.straws.map((s) => s.name)).toEqual(['Some', 'Little', 'Straw']);

    const { cloud } = store.getState();
    expect(cloud).toMatchObject({ linked: true, fileId: 'new', busy: 'idle', error: null, pendingRemote: null });
    expect(cloud.lastSyncedFingerprint).toBe(selectCurrentFingerprint(store.getState()));
    expect(cloud.lastSyncedAt).toBe(args.content.savedAt);
    expect(selectCloudStatus(store.getState())).toBe('synced');
  });

  test('does not upload when the remote backup is identical', async () => {
    const store = makeStore();
    const identical = { ...JSON.parse(JSON.stringify(buildSnapshot(store.getState()))), savedAt: '2026-01-01T00:00:00.000Z' };
    drive.findBackupFile.mockResolvedValue({ id: 'f1', modifiedTime: 'm' });
    drive.downloadJson.mockResolvedValue(identical);

    await store.dispatch(linkDrive());

    expect(drive.createJsonFile).not.toHaveBeenCalled();
    expect(drive.updateJsonFile).not.toHaveBeenCalled();
    expect(store.getState().cloud).toMatchObject({ linked: true, fileId: 'f1', lastSyncedAt: '2026-01-01T00:00:00.000Z' });
    expect(selectCloudStatus(store.getState())).toBe('synced');
  });

  test('reports a conflict when the remote backup differs, without touching local data', async () => {
    drive.findBackupFile.mockResolvedValue({ id: 'f1', modifiedTime: 'm' });
    drive.downloadJson.mockResolvedValue(remoteSnapshot());
    const store = makeStore();
    const localBefore = store.getState().straw;

    await store.dispatch(linkDrive());

    const { cloud, straw } = store.getState();
    expect(straw).toEqual(localBefore);
    expect(cloud.linked).toBe(true);
    expect(cloud.pendingRemote).toMatchObject({ fileId: 'f1', modifiedTime: 'm', savedAt: '2026-09-18T10:00:00.000Z' });
    expect(cloud.pendingRemote.snapshot.data.straw.straws).toHaveLength(2);
    expect(cloud.lastSyncedFingerprint).toBeNull();
    expect(selectCloudStatus(store.getState())).toBe('unsaved');
  });

  test('flags an unreadable remote backup but still links', async () => {
    drive.findBackupFile.mockResolvedValue({ id: 'f1' });
    drive.downloadJson.mockResolvedValue({ app: 'something-else' });
    const store = makeStore();

    await store.dispatch(linkDrive());

    expect(store.getState().cloud).toMatchObject({ linked: true, fileId: 'f1', busy: 'idle' });
    expect(store.getState().cloud.error).toMatch(/could not be read/);
    expect(selectCloudStatus(store.getState())).toBe('error');
  });

  test('treats invalid JSON on Drive like a corrupt backup', async () => {
    drive.findBackupFile.mockResolvedValue({ id: 'f1' });
    drive.downloadJson.mockRejectedValue(new drive.DriveApiError(200, 'bad json', { code: 'invalid_json' }));
    const store = makeStore();
    await store.dispatch(linkDrive());
    expect(store.getState().cloud.error).toMatch(/could not be read/);
  });

  test('a closed popup cancels quietly', async () => {
    drive.withAuth.mockRejectedValue(new drive.DriveAuthError('popup_closed'));
    const store = makeStore();
    await store.dispatch(linkDrive());
    expect(store.getState().cloud).toEqual(cloudInitialState);
    expect(selectCloudStatus(store.getState())).toBe('disconnected');
  });

  test('a blocked popup surfaces an error', async () => {
    drive.withAuth.mockRejectedValue(new drive.DriveAuthError('popup_failed_to_open'));
    const store = makeStore();
    await store.dispatch(linkDrive());
    expect(store.getState().cloud.linked).toBe(false);
    expect(store.getState().cloud.error).toMatch(/blocked/);
  });
});

describe('saveToDrive', () => {
  test('updates the known file and records the new fingerprint', async () => {
    drive.updateJsonFile.mockResolvedValue({ id: 'f1', modifiedTime: 't' });
    const store = makeStore(linked());
    store.dispatch(addStraw('Fresh'));
    expect(selectCloudStatus(store.getState())).toBe('unsaved');

    await store.dispatch(saveToDrive());

    const [token, id, content] = drive.updateJsonFile.mock.calls[0];
    expect([token, id]).toEqual(['tok', 'f1']);
    expect(JSON.parse(content).data.straw.straws.map((s) => s.name)).toContain('Fresh');
    expect(drive.findBackupFile).not.toHaveBeenCalled();
    expect(store.getState().cloud.lastSyncedFingerprint).toBe(selectCurrentFingerprint(store.getState()));
    expect(selectCloudStatus(store.getState())).toBe('synced');
  });

  test('falls back to search + create when the stored file id is gone', async () => {
    drive.updateJsonFile.mockRejectedValueOnce(new drive.DriveApiError(404, 'File not found'));
    drive.findBackupFile.mockResolvedValue(null);
    drive.createJsonFile.mockResolvedValue({ id: 'recreated' });
    const store = makeStore(linked());

    await store.dispatch(saveToDrive());

    expect(drive.createJsonFile).toHaveBeenCalledTimes(1);
    expect(store.getState().cloud.fileId).toBe('recreated');
    expect(store.getState().cloud.error).toBeNull();
  });

  test('falls back to updating a file found by name', async () => {
    drive.updateJsonFile.mockRejectedValueOnce(new drive.DriveApiError(404, 'File not found')).mockResolvedValueOnce({ id: 'found' });
    drive.findBackupFile.mockResolvedValue({ id: 'found' });
    const store = makeStore(linked());

    await store.dispatch(saveToDrive());

    expect(drive.updateJsonFile).toHaveBeenNthCalledWith(2, 'tok', 'found', expect.any(String));
    expect(drive.createJsonFile).not.toHaveBeenCalled();
    expect(store.getState().cloud.fileId).toBe('found');
  });

  test('creates the file when none was ever uploaded', async () => {
    drive.findBackupFile.mockResolvedValue(null);
    drive.createJsonFile.mockResolvedValue({ id: 'first' });
    const store = makeStore(linked({ fileId: null }));
    await store.dispatch(saveToDrive());
    expect(drive.updateJsonFile).not.toHaveBeenCalled();
    expect(store.getState().cloud.fileId).toBe('first');
  });

  test('other API errors become a readable message and keep the link', async () => {
    drive.updateJsonFile.mockRejectedValue(new drive.DriveApiError(500, 'Backend Error'));
    const store = makeStore(linked());
    await store.dispatch(saveToDrive());
    const { cloud } = store.getState();
    expect(cloud.linked).toBe(true);
    expect(cloud.busy).toBe('idle');
    expect(cloud.error).toBe('Google Drive error (HTTP 500): Backend Error');
    expect(selectCloudStatus(store.getState())).toBe('error');
  });

  test('is skipped while another operation is running', async () => {
    const store = makeStore(linked({ busy: 'restoring' }));
    const result = await store.dispatch(saveToDrive());
    expect(result.meta.condition).toBe(true);
    expect(drive.withAuth).not.toHaveBeenCalled();
  });
});

describe('restoreFromDrive', () => {
  test('downloads, backs up the local data, hydrates both slices and ends synced', async () => {
    drive.downloadJson.mockResolvedValue(remoteSnapshot());
    const store = makeStore(linked());
    store.dispatch(openSettings());
    const before = JSON.parse(JSON.stringify(buildSnapshot(store.getState())));

    await store.dispatch(restoreFromDrive());

    expect(drive.downloadJson).toHaveBeenCalledWith('tok', 'f1');
    const { straw, settings, cloud } = store.getState();
    expect(straw.straws.map((s) => s.name)).toEqual(['Remote A', 'Remote B']);
    expect(straw.presets).toHaveLength(1);
    expect(straw.strawCount).toBe(12);
    expect(straw.isPlayingAnimation).toBe(false);
    expect(settings).toMatchObject({ isRepeatable: false, animationTimeout: 750, displaySetting: true });

    const backup = validateSnapshot(JSON.parse(localStorage.getItem(PRE_RESTORE_BACKUP_KEY)));
    expect(backup.data).toEqual(before.data);

    expect(cloud.lastSyncedAt).toBe('2026-09-18T10:00:00.000Z');
    expect(cloud.lastSyncedFingerprint).toBe(selectCurrentFingerprint(store.getState()));
    expect(selectCloudStatus(store.getState())).toBe('synced');
  });

  test('falls back to searching when the stored id no longer exists', async () => {
    drive.downloadJson
      .mockRejectedValueOnce(new drive.DriveApiError(404, 'gone'))
      .mockResolvedValueOnce(remoteSnapshot());
    drive.findBackupFile.mockResolvedValue({ id: 'f2' });
    const store = makeStore(linked());

    await store.dispatch(restoreFromDrive());

    expect(drive.downloadJson).toHaveBeenNthCalledWith(2, 'tok', 'f2');
    expect(store.getState().cloud.fileId).toBe('f2');
    expect(store.getState().straw.straws).toHaveLength(2);
  });

  test('reports when there is nothing to restore', async () => {
    drive.findBackupFile.mockResolvedValue(null);
    const store = makeStore(linked({ fileId: null }));
    const before = store.getState().straw;

    await store.dispatch(restoreFromDrive());

    expect(store.getState().straw).toEqual(before);
    expect(store.getState().cloud.error).toBe('No backup was found on Google Drive.');
    expect(localStorage.getItem(PRE_RESTORE_BACKUP_KEY)).toBeNull();
  });

  test('refuses a malformed backup and leaves local data untouched', async () => {
    drive.downloadJson.mockResolvedValue({ version: 1, app: SNAPSHOT_APP, data: { straw: { straws: 'nope' } } });
    const store = makeStore(linked());
    const before = store.getState().straw;

    await store.dispatch(restoreFromDrive());

    expect(store.getState().straw).toEqual(before);
    expect(store.getState().cloud.error).toMatch(/could not be read/);
    expect(localStorage.getItem(PRE_RESTORE_BACKUP_KEY)).toBeNull();
  });
});

describe('resolveConflict', () => {
  const pendingRemote = { fileId: 'f1', modifiedTime: 'm', savedAt: '2026-09-18T10:00:00.000Z', snapshot: remoteSnapshot() };

  test('restore applies the pending snapshot without a network round-trip', async () => {
    const store = makeStore(linked({ lastSyncedFingerprint: null, pendingRemote }));

    await store.dispatch(resolveConflict('restore'));

    expect(drive.withAuth).not.toHaveBeenCalled();
    expect(store.getState().straw.straws.map((s) => s.name)).toEqual(['Remote A', 'Remote B']);
    expect(localStorage.getItem(PRE_RESTORE_BACKUP_KEY)).not.toBeNull();
    expect(store.getState().cloud.pendingRemote).toBeNull();
    expect(selectCloudStatus(store.getState())).toBe('synced');
  });

  test('overwrite uploads the local data to the remote file', async () => {
    drive.updateJsonFile.mockResolvedValue({ id: 'f1' });
    const store = makeStore(linked({ lastSyncedFingerprint: null, pendingRemote }));

    await store.dispatch(resolveConflict('overwrite'));

    const [, id, content] = drive.updateJsonFile.mock.calls[0];
    expect(id).toBe('f1');
    expect(JSON.parse(content).data.straw.straws.map((s) => s.name)).toEqual(['Some', 'Little', 'Straw']);
    expect(store.getState().straw.straws).toHaveLength(3);
    expect(store.getState().cloud.pendingRemote).toBeNull();
    expect(selectCloudStatus(store.getState())).toBe('synced');
  });

  test('rejects when nothing is pending', async () => {
    const store = makeStore(linked());
    await store.dispatch(resolveConflict('restore'));
    expect(store.getState().cloud.error).toMatch(/no pending backup/);
  });
});

describe('unlinkDrive', () => {
  test('revokes the token and forgets the link but keeps local data', async () => {
    const store = makeStore(linked());
    store.dispatch(addStraw('Keep me'));

    await store.dispatch(unlinkDrive());

    expect(drive.revokeToken).toHaveBeenCalledTimes(1);
    expect(store.getState().cloud).toEqual(cloudInitialState);
    expect(store.getState().straw.straws.map((s) => s.name)).toContain('Keep me');
    expect(selectCloudStatus(store.getState())).toBe('disconnected');
  });
});

describe('toCloudError', () => {
  test.each([
    [new drive.DriveAuthError('popup_closed'), 'cancelled'],
    [new drive.DriveAuthError('access_denied'), 'cancelled'],
    [new drive.DriveAuthError('popup_failed_to_open'), 'popup_failed_to_open'],
    [new drive.DriveAuthError('gis_load_failed'), 'gis_load_failed'],
    [new drive.DriveAuthError('scope_denied'), 'scope_denied'],
    [new drive.DriveAuthError('unconfigured'), 'unconfigured'],
    [new drive.DriveAuthError('unknown'), 'auth'],
    [new drive.DriveApiError(0, 'net'), 'network'],
    [new drive.DriveApiError(403, 'forbidden'), 'forbidden'],
    [new drive.DriveApiError(404, 'gone'), 'not_found'],
    [new drive.DriveApiError(500, 'oops'), 'api'],
    [new drive.DriveApiError(200, 'json', { code: 'invalid_json' }), 'corrupt'],
    [new SnapshotError('malformed'), 'corrupt'],
    [new Error('random'), 'unknown'],
  ])('maps %s to %s', (err, code) => {
    const mapped = toCloudError(err);
    expect(mapped.code).toBe(code);
    if (code !== 'cancelled') expect(mapped.message).not.toBe('');
  });
});
