import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import ListGroup from 'react-bootstrap/ListGroup'
import { addStraw, updateStraw, removeStraw } from '../features/straw/strawSlice';
import { useState, useEffect } from 'react';
import { FaPlus, FaTrashAlt } from "react-icons/fa"

import "./straw.scss";

export const Straw = (props) => {
  const [isEdit, setIsEdit] = useState(false);
  const dispatch = useDispatch()
  const handleOnChange = event => {
    const { value } = event.target;
    dispatch(updateStraw({id: props.straw.id, name: value}))
  }

  const handleKeyDown = event => {
    if (event.key === "Enter") {
      setIsEdit(false)
    }
  }

  useEffect(() => {
    if(isEdit === false) {
      if(props.straw.name.trim() === "") {
        dispatch(removeStraw({id: props.straw.id}))
      }
    }
  }, [isEdit])

  return (
    <ListGroup.Item className="straw-item d-flex" 
      onClick={() => setIsEdit(true)}
      >
      { isEdit
        ? <input type="text" value={props.straw.name}
            autoFocus
            onChange={handleOnChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {setIsEdit(false)}}
            ></input>
        : props.straw.name
      }
      <div className="btn-icon ms-auto"
        onClick={(e)=> {
          dispatch(removeStraw({id: props.straw.id}))
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FaTrashAlt />
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
      dispatch(addStraw(newStrawName.trim()));
      setNewStrawName("");    
    }
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
          placeholder="加新的籤"
          style={{flex: 1}}
          />
      </ListGroup.Item>
    </ListGroup>
  )
}

export default StrawList