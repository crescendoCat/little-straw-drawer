import {
  Card,
  ListGroup
} from 'react-bootstrap';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaRedo } from 'react-icons/fa';
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
    <Card>
      <Card.Header className="d-flex">
        <a>Results</a>
        <div className={`btn-icon ms-auto ${isRotate ? "rotate" : ""}`} style={{fontSize: "1.2rem"}}
            onClick={() => {setIsRotate(true); dispatch(clearHistory())}}
            onAnimationEnd={() =>{setIsRotate(false)}}
          >
          <FaRedo />
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
              <ListGroup.Item>No results here. Hit Draw above!</ListGroup.Item>
            </CSSTransition>
            : history.map((value, index, arr) => {
              let idx = arr.length-1-index;
              value = arr[idx]
              return (
              <CSSTransition
                key={`straw-drawing-results-item-${idx}`}
                timeout={500}
                exit={false}
                classNames="item"
              >
                <ListGroup.Item className="drawing-result-item">
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