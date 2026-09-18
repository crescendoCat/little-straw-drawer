import { Modal, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import {
  WHATS_NEW_NOTES,
  markWhatsNewSeen,
  selectShouldShowWhatsNew,
} from '../features/whatsNew/whatsNewSlice';
import { startTutorial } from '../features/tutorial/tutorialSlice';

/**
 * Shown once per WHATS_NEW_VERSION. "OK" just dismisses; "Show Tutorial"
 * dismisses and launches the guided tour.
 */
export default function WhatsNew() {
  const dispatch = useDispatch();
  const show = useSelector(selectShouldShowWhatsNew);

  const dismiss = () => dispatch(markWhatsNewSeen());
  const showTutorial = () => {
    dispatch(markWhatsNewSeen());
    dispatch(startTutorial());
  };

  return (
    <Modal show={show} onHide={dismiss} centered aria-labelledby="whats-new-title">
      <Modal.Header closeButton>
        <Modal.Title id="whats-new-title" className="d-flex align-items-center gap-2">
          <FaWandMagicSparkles aria-hidden="true" />
          What&apos;s new
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ul className="list-unstyled mb-0 d-grid gap-3">
          {WHATS_NEW_NOTES.map((note) => (
            <li key={note.title}>
              <div className="fw-semibold">{note.title}</div>
              <div className="text-secondary small">{note.description}</div>
            </li>
          ))}
        </ul>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={dismiss}>
          OK
        </Button>
        <Button variant="primary" onClick={showTutorial}>
          Show Tutorial
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
