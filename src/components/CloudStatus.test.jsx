import { screen, fireEvent, waitFor } from '@testing-library/react';
import * as drive from '../lib/googleDrive';
import CloudStatus, { STATUS_META, BUSY_LABELS, RESTORE_CONFIRM } from './CloudStatus';
import { renderWithStore, makeStore } from '../test/renderWithStore';
import { cloudInitialState, selectCurrentFingerprint } from '../features/cloud/cloudSlice';
import { SNAPSHOT_APP } from '../features/cloud/snapshot';

vi.mock('../lib/googleDrive', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isDriveConfigured: vi.fn(() => true),
    loadGis: vi.fn(() => Promise.resolve({})),
    withAuth: vi.fn(() => new Promise(() => {})), // never settles: keeps thunks in their busy state
    revokeToken: vi.fn(async () => {}),
  };
});

const currentFingerprint = () => selectCurrentFingerprint(makeStore().getState());
const linked = (extra = {}) => ({
  cloud: {
    ...cloudInitialState,
    linked: true,
    fileId: 'f1',
    lastSyncedAt: '2026-09-19T08:00:00.000Z',
    lastSyncedFingerprint: 'stale',
    ...extra,
  },
});
const syncedState = () => linked({ lastSyncedFingerprint: currentFingerprint() });

const statusButton = () => screen.getByRole('button', { name: /^Google Drive backup:/ });
const saveButton = () => screen.queryByRole('button', { name: 'Save to Drive' });

beforeEach(() => {
  drive.isDriveConfigured.mockReturnValue(true);
  drive.loadGis.mockClear();
  drive.withAuth.mockImplementation(() => new Promise(() => {}));
  drive.withAuth.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CloudStatus – status icon', () => {
  test('unconfigured: disabled, explains why, no save button, GIS not preloaded', () => {
    drive.isDriveConfigured.mockReturnValue(false);
    renderWithStore(<CloudStatus />, { preloadedState: linked() });
    const btn = statusButton();
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('data-status', 'unconfigured');
    expect(btn).toHaveAttribute('title', STATUS_META.unconfigured.label);
    expect(saveButton()).toBeNull();
    expect(drive.loadGis).not.toHaveBeenCalled();
  });

  test('disconnected: preloads GIS and starts the link flow on click', () => {
    const { store } = renderWithStore(<CloudStatus />);
    expect(drive.loadGis).toHaveBeenCalledTimes(1);
    const btn = statusButton();
    expect(btn).toHaveAttribute('data-status', 'disconnected');
    expect(btn).toHaveAttribute('title', STATUS_META.disconnected.label);
    expect(saveButton()).toBeNull();

    fireEvent.click(btn);
    expect(store.getState().cloud.busy).toBe('connecting');
    expect(drive.withAuth).toHaveBeenCalledWith(expect.any(Function), { prompt: 'select_account' });
    expect(statusButton()).toHaveAttribute('data-status', 'busy');
    expect(statusButton()).toBeDisabled();
    expect(statusButton()).toHaveAttribute('title', BUSY_LABELS.connecting);
  });

  test('unsaved: amber icon, enabled save button', () => {
    renderWithStore(<CloudStatus />, { preloadedState: linked() });
    const btn = statusButton();
    expect(btn).toHaveAttribute('data-status', 'unsaved');
    expect(btn).toHaveClass('text-warning');
    expect(saveButton()).toBeEnabled();
  });

  test('synced: green icon, save button disabled', () => {
    renderWithStore(<CloudStatus />, { preloadedState: syncedState() });
    expect(statusButton()).toHaveAttribute('data-status', 'synced');
    expect(statusButton()).toHaveClass('text-success');
    expect(saveButton()).toBeDisabled();
  });

  test('busy: both controls disabled with a spinning icon', () => {
    renderWithStore(<CloudStatus />, { preloadedState: linked({ busy: 'saving' }) });
    expect(statusButton()).toBeDisabled();
    expect(statusButton()).toHaveClass('spin');
    expect(statusButton()).toHaveAttribute('title', BUSY_LABELS.saving);
    expect(saveButton()).toBeDisabled();
  });

  test('error: red icon whose title is the error message', () => {
    renderWithStore(<CloudStatus />, { preloadedState: linked({ error: 'HTTP 500 from Drive' }) });
    expect(statusButton()).toHaveAttribute('data-status', 'error');
    expect(statusButton()).toHaveClass('text-danger');
    expect(statusButton()).toHaveAttribute('title', 'HTTP 500 from Drive');
  });
});

describe('CloudStatus – save button', () => {
  test('dispatches saveToDrive', () => {
    const { store } = renderWithStore(<CloudStatus />, { preloadedState: linked() });
    fireEvent.click(saveButton());
    expect(store.getState().cloud.busy).toBe('saving');
    expect(drive.withAuth).toHaveBeenCalledTimes(1);
  });
});

describe('CloudStatus – menu', () => {
  test('opens with status, last saved time and the three actions', async () => {
    renderWithStore(<CloudStatus />, { preloadedState: linked() });
    fireEvent.click(statusButton());

    // react-bootstrap Dropdown.Item exposes disabled state via aria-disabled / .disabled, not the attribute
    expect(await screen.findByRole('button', { name: 'Save to Drive now' })).not.toHaveClass('disabled');
    expect(screen.getByRole('button', { name: 'Restore from Drive…' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink Google Drive' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss error' })).toBeNull();
    expect(screen.getByText(STATUS_META.unsaved.label)).toBeInTheDocument();
    // toLocaleString() may use thin/narrow spaces; jest-dom normalizes DOM whitespace only
    const savedAtText = new Date('2026-09-19T08:00:00.000Z').toLocaleString().replace(/\s+/g, ' ');
    expect(screen.getByText(/Last saved:/)).toHaveTextContent(savedAtText);
  });

  test('shows "Never" and disables saving when already synced', async () => {
    renderWithStore(<CloudStatus />, { preloadedState: linked({ lastSyncedFingerprint: currentFingerprint(), lastSyncedAt: null }) });
    fireEvent.click(statusButton());
    const save = await screen.findByRole('button', { name: 'Save to Drive now' });
    expect(save).toHaveClass('disabled');
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/Last saved:/)).toHaveTextContent('Never');
  });

  test('Save to Drive now dispatches saveToDrive', async () => {
    const { store } = renderWithStore(<CloudStatus />, { preloadedState: linked() });
    fireEvent.click(statusButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Save to Drive now' }));
    expect(store.getState().cloud.busy).toBe('saving');
  });

  test('Restore asks for confirmation and does nothing when declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { store } = renderWithStore(<CloudStatus />, { preloadedState: linked() });
    fireEvent.click(statusButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Restore from Drive…' }));
    expect(window.confirm).toHaveBeenCalledWith(RESTORE_CONFIRM);
    expect(store.getState().cloud.busy).toBe('idle');
    expect(drive.withAuth).not.toHaveBeenCalled();
  });

  test('Restore proceeds when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { store } = renderWithStore(<CloudStatus />, { preloadedState: linked() });
    fireEvent.click(statusButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Restore from Drive…' }));
    expect(store.getState().cloud.busy).toBe('restoring');
    expect(drive.withAuth).toHaveBeenCalledTimes(1);
  });

  test('Unlink forgets the link and returns to the disconnected icon', async () => {
    const { store } = renderWithStore(<CloudStatus />, { preloadedState: linked() });
    fireEvent.click(statusButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Unlink Google Drive' }));
    await waitFor(() => expect(store.getState().cloud.linked).toBe(false));
    expect(drive.revokeToken).toHaveBeenCalled();
    expect(statusButton()).toHaveAttribute('data-status', 'disconnected');
    expect(saveButton()).toBeNull();
  });

  test('error state offers Dismiss error, which clears it', async () => {
    const { store } = renderWithStore(<CloudStatus />, { preloadedState: linked({ error: 'boom' }) });
    fireEvent.click(statusButton());
    expect(await screen.findByText('boom')).toHaveClass('text-danger');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(store.getState().cloud.error).toBeNull();
    expect(statusButton()).toHaveAttribute('data-status', 'unsaved');
  });
});

describe('CloudStatus – conflict modal', () => {
  const pendingRemote = {
    fileId: 'f1',
    modifiedTime: 't',
    savedAt: '2026-09-18T10:00:00.000Z',
    snapshot: {
      version: 1,
      app: SNAPSHOT_APP,
      savedAt: '2026-09-18T10:00:00.000Z',
      data: { straw: { straws: [{ id: 10, name: 'Remote' }], history: [], presets: [] }, settings: {} },
    },
  };

  test('is shown while a remote backup is pending and Cancel dismisses it', () => {
    const { store } = renderWithStore(<CloudStatus />, { preloadedState: linked({ lastSyncedFingerprint: null, pendingRemote }) });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.getState().cloud.pendingRemote).toBeNull();
    expect(statusButton()).toHaveAttribute('data-status', 'unsaved');
  });

  test('Restore from Drive applies the pending snapshot and ends synced', async () => {
    const { store } = renderWithStore(<CloudStatus />, { preloadedState: linked({ lastSyncedFingerprint: null, pendingRemote }) });
    fireEvent.click(screen.getByRole('button', { name: 'Restore from Drive' }));
    await waitFor(() => expect(store.getState().cloud.pendingRemote).toBeNull());
    expect(store.getState().straw.straws.map((s) => s.name)).toEqual(['Remote']);
    expect(statusButton()).toHaveAttribute('data-status', 'synced');
  });
});
