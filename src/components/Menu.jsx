import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import { 
  useSelector,
  useDispatch
} from 'react-redux';
import { 
  savePreset, 
  loadPreset, 
  removePreset
} from '../features/straw/strawSlice';
import { startTutorial } from '../features/tutorial/tutorialSlice';
import { openSettings } from '../features/settings/slice';
import { 
  FaTrashAlt, 
} from 'react-icons/fa';
import {
  Container,
  Row, 
  Col
} from "react-bootstrap";
import {
  useWindowSize
} from "../utils";

function Menu(props) {
  const maxItemLength = props.maxLength ? props.maxLength : 20;
  const presets = useSelector((state) => state.straw.presets);
  const dispatch = useDispatch();
  const winSize = useWindowSize();
  return (
    <Container fluid>
      <Row className="d-flex justify-content-center justify-content-sm-start">
        <Col xs="auto" className="px-1">
          <Button id="btn-save-as-preset" onClick={() => {dispatch(savePreset())}}>
            { winSize.width < 576 ? "Save" : "Save as Preset" }
          </Button>
        </Col>
        <Col xs="auto" className="px-1">
          <Dropdown>
            <Dropdown.Toggle variant="success" id="btn-load-from-presets">
              { winSize.width < 576 ? "Load" : "Load from Presets" }
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {
                presets.length <= 0
                ? <Dropdown.Item disabled>Oops! nothing here...click "Save as Preset" to add a preset</Dropdown.Item>
                : presets.map((preset, index) => {
                  
                  let itemText = preset.value.map(i => i.name).join(", ");
                  if(itemText.length >= maxItemLength) {
                    itemText = itemText.slice(0, maxItemLength-3) + "..."
                  }
                  return (
                    <Dropdown.Item 
                      className="d-flex" key={`preset-dropdown-item-${index}`}
                      onClick={()=>{dispatch(loadPreset({id: preset.id}))}}>
                      <div className="me-auto">{itemText}</div>
                      <div className="btn-icon ms-2"
                        onClick={(e)=> {
                          dispatch(removePreset({id: preset.id}))
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <FaTrashAlt />
                      </div>
                    </Dropdown.Item>
                  )
                })
              }
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col xs="auto" className="px-1">
          <Button variant="link" onClick={() => {
            dispatch(startTutorial())
          }}>
            Help
          </Button>
          <Button variant="link" onClick={() => {
            dispatch(openSettings())
          }}>
            Settings
          </Button>
        </Col>
      </Row>
    </Container>
  )
}

export default Menu