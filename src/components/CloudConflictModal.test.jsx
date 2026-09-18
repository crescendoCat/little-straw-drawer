import { screen, fireEvent, waitFor } from '@testing-library/react';
import * as drive from '../lib/googleDrive';
import CloudConflictModal from './CloudConflictModal';
import { renderWithStore } from '../test/renderWithStore';
import { cloudInitialState } from '../features/cloud/cloudSlice';
import { SNAPSHOT_APP } from '../features/cloud/snapshot';

vi.mock('../lib/googleDrive', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isDriveConfigured: vi.fn(() => true),
    withAuth: vi.fn((fn) => fn('tok')),
    updateJsonFile: vi.fn(async () => ({ id: 'f1' })),
    findBackupFile: vi.fn(),
    createJsonFile: vi.fn(),
  };
});

const pendingRemote = {
  fileId: 'f1',
  modifiedTime: 't',
  savedAt: '2026-09-18T10:00:00.000Z',
  snapshot: {
    version: 1,
    app: SNAPSHOT_APP,
    savedAt: '2026-09-18T10:00:00.000Z',
    data: {
      straw: { straws: [{ id: 10, name: 'Remote A' }, { id: 11, name: 'Remote B' }], history: [], presets: [] },
      settings: { animationTimeout: 900 },
    },
  },
};
const withPending = (extra = {}) => ({
  cloud: { ...cloudInitialState, linked: true, fileId: 'f1', pendingRemote, ...extra },
});

beforeEach(() => {
  localStorage.clear();
  drive.updateJsonFile.mockClear();
});

describe('CloudConflictModal', () => {
  test('is hidden when nothing is pending', () => {
    renderWithStore(<CloudConflictModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('describes the remote backup and orders the actions Cancel / Keep / Restore', () => {
    renderWithStore(<CloudConflictModal />, { preloadedState: withPending() });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // toLocaleString() may use thin/narrow spaces; Testing Library normalizes DOM whitespace only
    const savedAtText = new Date(pendingRemote.savedAt).toLocaleString().replace(/\s+/g, ' ');
    expect(screen.getByText(savedAtText)).toBeInTheDocument();
    expect(screen.getByText(/2 straws/)).toBeInTheDocument();

    const footerButtons = screen.getAllByRole('button').filter((b) => b.closest('.modal-footer'));
    expect(footerButtons.map((b) => b.textContent)).toEqual(['Cancel', "Keep this device's data", 'Restore from Drive']);
  });

  test('Cancel keeps the link and clears the pending backup', () => {
    const { store } = renderWithStore(<CloudConflictModal />, { preloadedState: withPending() });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.getState().cloud.pendingRemote).toBeNull();
    expect(store.getState().cloud.linked).toBe(true);
    expect(store.getState().straw.straws).toHaveLength(3);
  });

  test('the header close button also cancels', () => {
    const { store } = renderWithStore(<CloudConflictModal />, { preloadedState: withPending() });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(store.getState().cloud.pendingRemote).toBeNull();
  });

  test('Restore from Drive hydrates local data', async () => {
    const { store } = renderWithStore(<CloudConflictModal />, { preloadedState: withPending() });
    fireEvent.click(screen.getByRole('button', { name: 'Restore from Drive' }));
    await waitFor(() => expect(store.getState().cloud.pendingRemote).toBeNull());
    expect(store.getState().straw.straws.map((s) => s.name)).toEqual(['Remote A', 'Remote B']);
    expect(store.getState().settings.animationTimeout).toBe(900);
    expect(drive.updateJsonFile).not.toHaveBeenCalled();
  });

  test("Keep this device's data overwrites the remote file", async () => {
    const { store } = renderWithStore(<CloudConflictModal />, { preloadedState: withPending() });
    fireEvent.click(screen.getByRole('button', { name: "Keep this device's data" }));
    await waitFor(() => expect(store.getState().cloud.pendingRemote).toBeNull());
    expect(drive.updateJsonFile).toHaveBeenCalledWith('tok', 'f1', expect.any(String));
    expect(store.getState().straw.straws).toHaveLength(3);
    expect(store.getState().cloud.lastSyncedFingerprint).not.toBeNull();
  });

  test('all actions are disabled while busy', () => {
    renderWithStore(<CloudConflictModal />, { preloadedState: withPending({ busy: 'saving' }) });
    for (const name of ['Cancel', "Keep this device's data", 'Restore from Drive']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
