import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import ListGroup from 'react-bootstrap/ListGroup'
import { addStraw, addStraws, updateStraw, removeStraw } from '../features/straw/strawSlice';
import { useState, useEffect, useRef } from 'react';
import { FaPlus, FaTrashAlt, FaPalette } from "react-icons/fa"
import { TwitterPicker } from "react-color";
import { rgbToHsl, hslToRgb, hexStr2RgbObj } from "../utils";

import "./straw.scss";

export const Straw = (props) => {
  const [isEdit, setIsEdit] = useState(false);
  const [displayColorPicker, setDisplayColorPicker] = useState(false)
  const dispatch = useDispatch()
  const inputRef = useRef(null);
  const handleOnChange = event => {
    const { value } = event.target;
    dispatch(updateStraw({id: props.straw.id, name: value}))
  }

  const handleKeyDown = event => {
    if (event.key === "Enter") {
      setIsEdit(false)
    }
  }

  const randomColorObj = () => {
    let array = ['#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3', '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF']
    let color = array[Math.floor(Math.random() * array.length)];
    return hexStr2RgbObj(color);
  }

  const handlePaste = (e) => {
    let lines = e.clipboardData.getData('text');
    e.preventDefault()
    let newStraws = []
    lines.split('\n').forEach(line => {
      if(line.trim() !== "") {
        newStraws.push({
          name: line.trim(),
          rgb: randomColorObj()
        })
      }
    })
    console.log(newStraws);
    dispatch(addStraws({
      straws: [...newStraws],
      afterIndex: props.straw.id
    }));
  }

  const handleClose = event => {
    setDisplayColorPicker(false)
  }

  const handleColorChange = (color, event) => {
    if(event.type === "click") {
      event.stopPropagation();
    }
    dispatch(updateStraw({...props.straw, rgb: color.rgb}))
  }

  const handleColorChangeComplete = (color, event) => {
    setDisplayColorPicker(false);
    dispatch(updateStraw({...props.straw, rgb: color.rgb}))
  }

  const handlePick = event => {
    event.stopPropagation();
    setDisplayColorPicker(true);
  }

  useEffect(() => {
    if(isEdit === true) {
      if(inputRef.current !== null) {
        inputRef.current.focus()
      }
    }
    if(isEdit === false) {
      if(props.straw?.name.trim() === "") {
        dispatch(removeStraw({id: props.straw.id}))
      }
    }
  }, [isEdit, dispatch, props.straw.id, props.straw.name])
  const popover = {
    position: 'absolute',
    zIndex: '2',
    right:  '-12px',
    top:   'calc(1.2rem + 10px)'
  }
  const cover = {
    position: 'fixed',
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
  }
  const c = props.straw?.rgb ?? {r: 255, g: 255, b:255, a: 1};
  const rgb = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`
  let [h, s, l] = rgbToHsl(c.r, c.g, c.b);
  let light = false;
  if(l <= 0.3) light = true;
  l -= 0.32
  if(l <= 0) l = 1-l;
  const [r, g, b] = hslToRgb(h, s, l);
  const rgbLine = `rgba(${r}, ${g}, ${b}, ${c.a})`


  const straw = {
    background: rgb
  }

  const deletedStraw = {
    textDecorationLine: "line-through"
  }

  return (
    <ListGroup.Item className={`straw-item d-flex ${light? "light" : ""}`}
      style={straw}
      onClick={(event) => {
        setIsEdit(true)
      }}>
      { isEdit
        ? <input type="text" value={props.straw.name}
            ref={inputRef}
            onChange={handleOnChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onBlur={() => {setIsEdit(false)}}
            ></input>
        : <div style={props.straw.isPicked ? deletedStraw : {}}>{props.straw.name}</div>
      }
      <div className="btn-color-picker  ms-auto">
        <div className="btn-color btn-icon" onClick={handlePick} 
          style={{color: rgbLine}}>
          <FaPalette />
        </div>
        { displayColorPicker 
          ? <div style={ popover } onClick={e => e.stopPropagation()}>
              <div style={ cover } onClick={ handleClose }/>
              <TwitterPicker 
                triangle="top-right" 
                onChange={ handleColorChange }
                onChangeComplete={ handleColorChangeComplete }/>
            </div> 
          : null
        }
      </div>
      <div className="btn-icon btn-trash"
        onClick={(e)=> {
          dispatch(removeStraw({id: props.straw.id}))
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FaTrashAlt style={{color: rgbLine}}/>
      </div>
    </ListGroup.Item>
  )
}

Straw.propTypes = {
  straw: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string
  })
}

const StrawList = (props) => {
  const straws = useSelector((state) => state.straw.straws)
  const [newStrawName, setNewStrawName] = useState("");
  const dispatch = useDispatch()

  const addNewStraw = () => {
    if(newStrawName.trim() !== "") {
      dispatch(addStraw({
          name: newStrawName.trim(),
          rgb: randomColorObj()
        }));
      setNewStrawName("");    
    }
  }

  const randomColorObj = () => {
    let array = ['#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3', '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF']
    let color = array[Math.floor(Math.random() * array.length)];
    return hexStr2RgbObj(color);
  }

  const handlePaste = (e) => {
    let lines = e.clipboardData.getData('text');
    lines.split('\n').forEach(line => {
      if(line.trim() !== "") {
        dispatch(addStraw({
          name: line.trim(),
          rgb: randomColorObj()
        }));
      }
    })
    setNewStrawName("");    
  }

  const handleKeyDown = (e) => {
    console.log(e.key);
    if(e.key === "Enter") {
      addNewStraw();
    }
  }

  return (
    <ListGroup className="straw">
      {
        straws.map((item, id) => (
          <Straw straw={item} key={`straw-list-item-${id}`} />
        ))
      }
      <ListGroup.Item className="straw-item d-flex">
        <div className="btn-icon me-2" style={{fontSize: "1.2rem"}} onClick={addNewStraw}>
          <FaPlus/>
        </div>
        <input type="text" value={newStrawName}
          onChange = {(e) => {setNewStrawName(e.target.value)}}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="加新的籤"
          style={{flex: 1}}
          />
      </ListGroup.Item>
    </ListGroup>
  )
}

export default StrawList