import {
  Card,
  ListGroup
} from 'react-bootstrap';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaTrashAlt } from 'react-icons/fa';
import { CSSTransitionGroup } from 'react-transition-group';
import { clearHistory } from '../features/straw/strawSlice';
import {
  CSSTransition,
  TransitionGroup
} from 'react-transition-group';


const StrawResult = (props) => {
  const history = useSelector((state) => state.straw.history);
  const dispatch = useDispatch()
  const [isRotate, setIsRotate] = useState(false);


  return (
    <Card id="drawing-result-card">
      <Card.Header className="d-flex">
        <a>Results</a>
        <div id="btn-clear-results" className={`btn-icon ms-auto ${isRotate ? "rotate" : ""}`} style={{fontSize: "1.2rem"}}
            onClick={() => {setIsRotate(true); dispatch(clearHistory())}}
            onAnimationEnd={() =>{setIsRotate(false)}}
          >
          <FaTrashAlt />
        </div>
      </Card.Header>
      
      <ListGroup className="list-group-flush">
        <TransitionGroup className="drawing-result">
          {
            history.length <= 0 
            ? 
            <CSSTransition
                key={`straw-drawing-results-item-default`}
                timeout={500}
                enter={false}
                exit={false}
                classNames="item"
              >
              <ListGroup.Item style={{color: "rgb(110 110 110)"}}>No results here. Hit Draw above!</ListGroup.Item>
            </CSSTransition>
            : history.map((value, index, arr) => {
              let idx = arr.length-1-index;
              value = arr[idx].name
              let c = arr[idx].color
              const rgb = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`
              let style = {backgroundColor: rgb}
              return (
              <CSSTransition
                key={`straw-drawing-results-item-${idx}`}
                timeout={500}
                exit={false}
                classNames="item"
              >
                <ListGroup.Item className="drawing-result-item" style={style}>
                  {value}
                </ListGroup.Item>
              </CSSTransition>
            )})
          }
        </TransitionGroup>
      </ListGroup>
    </Card>
  )
}
export default StrawResult