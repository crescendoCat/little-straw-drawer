import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import { useSelector, useDispatch } from 'react-redux';
import { savePreset, loadPreset, removePreset } from '../features/straw/strawSlice';
import { FaTrashAlt } from 'react-icons/fa';
function StrawPreset(props) {
  const maxItemLength = props.maxLength ? props.maxLength : 20;
  const presets = useSelector((state) => state.straw.presets);
  const dispatch = useDispatch();
  return (
    <div className="d-flex">
      <Button onClick={() => {dispatch(savePreset())}}>Save as Preset</Button>
      <Dropdown>
        <Dropdown.Toggle variant="success">
          Load from Presets
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
    </div>
  )
}

export default StrawPreset