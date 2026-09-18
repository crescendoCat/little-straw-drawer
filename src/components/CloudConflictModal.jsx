import { Modal, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { selectCloud, dismissPendingRemote } from '../features/cloud/cloudSlice';
import { resolveConflict } from '../features/cloud/cloudThunks';

/**
 * Shown after the first link when Google Drive already holds a backup that
 * differs from this device. The user picks a side; Cancel keeps the link
 * but leaves the status on "unsaved".
 */
export default function CloudConflictModal() {
  const dispatch = useDispatch();
  const { pendingRemote, busy } = useSelector(selectCloud);
  const show = Boolean(pendingRemote);
  const isBusy = busy !== 'idle';

  const savedAt = pendingRemote?.savedAt ? new Date(pendingRemote.savedAt).toLocaleString() : 'an unknown time';
  const remoteStraws = pendingRemote?.snapshot?.data?.straw?.straws?.length ?? 0;

  const cancel = () => {
    if (!isBusy) dispatch(dismissPendingRemote());
  };

  return (
    <Modal show={show} onHide={cancel} centered aria-labelledby="cloud-conflict-title">
      <Modal.Header closeButton={!isBusy}>
        <Modal.Title id="cloud-conflict-title">Backup found on Google Drive</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          A backup saved on <strong>{savedAt}</strong> ({remoteStraws} {remoteStraws === 1 ? 'straw' : 'straws'}) already
          exists on your Google Drive and differs from the data on this device.
        </p>
        <p className="mb-0 text-secondary small">
          Restoring replaces this device&apos;s straws, presets, history and settings. A copy of the current local data is
          kept in this browser until the next restore.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" disabled={isBusy} onClick={cancel}>
          Cancel
        </Button>
        <Button variant="outline-danger" disabled={isBusy} onClick={() => dispatch(resolveConflict('overwrite'))}>
          Keep this device&apos;s data
        </Button>
        <Button variant="primary" disabled={isBusy} onClick={() => dispatch(resolveConflict('restore'))}>
          Restore from Drive
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
