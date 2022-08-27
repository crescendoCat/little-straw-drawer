import {
  Container,
  Row,
  Col,
  Button,
  Card,
  ListGroup
} from 'react-bootstrap';
import StrawList from './components/Straw';
import StrawResult from './components/StrawResult'
import StrawPreset from './components/StrawPreset'
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addStraw, addHistory } from './features/straw/strawSlice';
import Tutorial from "./components/Tutorial"

function App() {
  const dispatch = useDispatch();
  const straws = useSelector((state) => state.straw.straws);
  const showTutorial = useSelector(state => state.tutorial.showTutorial)

  const draw = () => {
    let rnd = crypto.getRandomValues(new Uint32Array(straws.length))
    let randomIndex = rnd.indexOf(Math.max(...rnd))
    let picked = {
      name: straws[randomIndex].name,
      color: straws[randomIndex].rgb ?? {r: 255, g: 255, b: 255, a: 1}
    }
    dispatch(addHistory(picked))
  }

  return (
  <>
    <Container className="p-5">
      <Row className="justify-content-center">
        <Col className="text-center">
          <h1>Mi Mi Draw Machine</h1>
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col xs={12} lg={6}>
          <StrawPreset />
        </Col>
      </Row>
      <Row className="justify-content-center mt-2">
        <Col xs={12} lg={6}>
          <StrawList />
        </Col>
      </Row>
      <Row className="justify-content-center mt-5">
        <Col xs={12} lg={6} className="d-flex justify-content-center">
          <Button onClick={draw} id="btn-draw">抽籤</Button>
        </Col>
      </Row>
      <Row className="justify-content-center mt-5">
        <Col xs={12} lg={6}>
          <StrawResult />
        </Col>
      </Row>
    </Container>
    <Tutorial active={showTutorial}/>
  </>
  );
}

export default App;
