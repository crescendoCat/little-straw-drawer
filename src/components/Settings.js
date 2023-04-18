import {
  useCallback
} from "react";

import {
	Modal,
	Form,
  Button
} from "react-bootstrap";

import {
  useSelector,
  useDispatch
} from "react-redux";

import {
  closeSettings,
  setRepeatable,
  setShowAnimation
} from "../features/settings/slice";

import {
  clearHistory
} from "../features/straw/strawSlice";

function Settings(props) {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  console.log("settings:", settings);
  const _closeSettings = useCallback(() => {
    dispatch(closeSettings())
  }, [dispatch])

  return (
    <Modal show={settings.displaySetting} onHide={_closeSettings}>
      <Modal.Header closeButton>
        <Modal.Title>Modal heading</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="repeatableCheck"
              label="Repeatable Straw"
              checked={settings.isRepeatable}
              onChange={(e) => {
                dispatch(clearHistory())
                dispatch(setRepeatable(e.target.checked))
              }}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="showAnimationCheck"
              label="Show Animation"
              checked={settings.showAnimation}
              onChange={(e) => {
                console.log(e.target.checked)
                dispatch(setShowAnimation(e.target.checked))
              }}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={_closeSettings}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default Settings;