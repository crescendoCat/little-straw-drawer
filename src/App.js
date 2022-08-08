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


function App() {
  const dispatch = useDispatch();
  const straws = useSelector((state) => state.straw.straws);


  const draw = () => {
    let randomIndex = Math.floor(Math.random()*straws.length)
    let picked = straws[randomIndex].name
    dispatch(addHistory(picked))
  }

  return (
    <Container className="p-5">
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
          <Button onClick={draw}>抽籤</Button>
        </Col>
      </Row>
      <Row className="justify-content-center mt-5">
        <Col xs={12} lg={6}>
          <StrawResult />
        </Col>
      </Row>
    </Container>

  );
}

export default App;
