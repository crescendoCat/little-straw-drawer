import {
  useCallback
} from "react";

import {
	Modal,
	Form,
  Button,
  InputGroup
} from "react-bootstrap";

import {
  useSelector,
  useDispatch
} from "react-redux";

import {
  closeSettings,
  setRepeatable,
  setShowAnimation,
  setAnimationTimeout
} from "../features/settings/slice";

import {
  clearHistory
} from "../features/straw/strawSlice";

function Settings(props) {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  const _closeSettings = useCallback(() => {
    dispatch(closeSettings())
  }, [dispatch])

  return (
    <Modal show={settings.displaySetting} onHide={_closeSettings}>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={(e) => {e.preventDefault()}}>
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
          <Form.Label>Animation Time: </Form.Label>
          <InputGroup className="mb-3">
            <Form.Control 
              type="number"
              aria-label="1500" 
              onChange={e => {
                console.log(e.target.value)
                dispatch(setAnimationTimeout(e.target.value))
              }}
              value={settings.animationTimeout}
            />
            <InputGroup.Text>millisecond</InputGroup.Text>
          </InputGroup>
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