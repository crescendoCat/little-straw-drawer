import { useEffect } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { MdCloudOff, MdCloudQueue, MdCloudDone, MdCloudSync, MdCloudUpload, MdErrorOutline } from 'react-icons/md';
import { isDriveConfigured, loadGis } from '../lib/googleDrive';
import { selectCloud, selectCloudStatus, clearCloudError } from '../features/cloud/cloudSlice';
import { linkDrive, saveToDrive, restoreFromDrive, unlinkDrive } from '../features/cloud/cloudThunks';
import CloudConflictModal from './CloudConflictModal';

export const BUSY_LABELS = {
  connecting: 'Connecting to Google Drive…',
  saving: 'Saving to Google Drive…',
  restoring: 'Restoring from Google Drive…',
  unlinking: 'Unlinking Google Drive…',
};

export const STATUS_META = {
  unconfigured: { Icon: MdCloudOff, className: 'text-secondary', label: 'Google Drive backup is not configured' },
  disconnected: { Icon: MdCloudOff, className: 'text-secondary', label: 'Link Google Drive to back up your straws' },
  busy: { Icon: MdCloudSync, className: 'text-primary spin', label: 'Working…' },
  unsaved: { Icon: MdCloudQueue, className: 'text-warning', label: 'Changes not yet saved to Google Drive' },
  synced: { Icon: MdCloudDone, className: 'text-success', label: 'Backed up to Google Drive' },
  error: { Icon: MdErrorOutline, className: 'text-danger', label: 'Google Drive error' },
};

export const RESTORE_CONFIRM =
  "Replace this device's straws, presets, history and settings with the Google Drive backup?";

export function statusLabel(status, cloud) {
  if (status === 'busy') return BUSY_LABELS[cloud.busy] ?? STATUS_META.busy.label;
  if (status === 'error') return cloud.error || STATUS_META.error.label;
  return STATUS_META[status].label;
}

const formatTime = (iso) => (iso ? new Date(iso).toLocaleString() : 'Never');

/**
 * Google Drive backup controls for the menu bar:
 *  - a "Save to Drive" button (only while linked, enabled when there are
 *    unsaved changes)
 *  - a status icon: not linked → click starts the link flow;
 *    linked → click opens a small menu (save / restore / unlink)
 *  - the first-link conflict modal
 */
export default function CloudStatus() {
  const dispatch = useDispatch();
  const cloud = useSelector(selectCloud);
  const status = useSelector(selectCloudStatus);

  // Preload GIS so the later click can request the token synchronously,
  // which keeps popup blockers happy.
  useEffect(() => {
    if (isDriveConfigured()) loadGis().catch(() => {});
  }, []);

  const { Icon, className } = STATUS_META[status];
  const label = statusLabel(status, cloud);
  const iconProps = { size: 20, 'aria-hidden': true };
  const statusButtonProps = {
    id: 'btn-cloud',
    variant: 'link',
    className: `btn-icon-cloud ${className}`,
    'data-status': status,
    'aria-label': `Google Drive backup: ${label}`,
    title: label,
  };

  const handleRestore = () => {
    if (window.confirm(RESTORE_CONFIRM)) dispatch(restoreFromDrive());
  };

  let statusControl;
  if (status === 'unconfigured' || status === 'busy') {
    statusControl = (
      <Button {...statusButtonProps} disabled>
        <Icon {...iconProps} />
      </Button>
    );
  } else if (status === 'disconnected') {
    statusControl = (
      <Button {...statusButtonProps} onClick={() => dispatch(linkDrive())}>
        <Icon {...iconProps} />
      </Button>
    );
  } else {
    statusControl = (
      <Dropdown align="end">
        <Dropdown.Toggle as={Button} {...statusButtonProps}>
          <Icon {...iconProps} />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Header className={status === 'error' ? 'text-danger' : undefined}>{label}</Dropdown.Header>
          <Dropdown.ItemText className="small text-secondary">Last saved: {formatTime(cloud.lastSyncedAt)}</Dropdown.ItemText>
          <Dropdown.Divider />
          <Dropdown.Item as="button" type="button" disabled={status === 'synced'} onClick={() => dispatch(saveToDrive())}>
            Save to Drive now
          </Dropdown.Item>
          <Dropdown.Item as="button" type="button" onClick={handleRestore}>
            Restore from Drive…
          </Dropdown.Item>
          {status === 'error' && (
            <Dropdown.Item as="button" type="button" onClick={() => dispatch(clearCloudError())}>
              Dismiss error
            </Dropdown.Item>
          )}
          <Dropdown.Divider />
          <Dropdown.Item as="button" type="button" className="text-danger" onClick={() => dispatch(unlinkDrive())}>
            Unlink Google Drive
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  const showSave = cloud.linked && status !== 'unconfigured';

  return (
    <div className="cloud-status d-flex align-items-center">
      {showSave && (
        <Button
          id="btn-cloud-save"
          variant="link"
          className="btn-icon-cloud text-primary"
          aria-label="Save to Drive"
          title={status === 'unsaved' ? 'Save to Google Drive' : 'Everything is saved to Google Drive'}
          disabled={status !== 'unsaved'}
          onClick={() => dispatch(saveToDrive())}
        >
          <MdCloudUpload {...iconProps} />
        </Button>
      )}
      {statusControl}
      <CloudConflictModal />
    </div>
  );
}
