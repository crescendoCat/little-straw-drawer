import {
  Container,
  Row,
  Col,
  Button
} from 'react-bootstrap';
import StrawList from './components/Straw';


function App() {
  return (
    <Container>
      <Row className="justify-content-center p-5">
        <Col xs={6}>
          <StrawList />
        </Col>
      </Row>
      <Row className="justify-content-center mt-2">
        <Col xs={6} className="d-flex justify-content-center">
          <Button>抽籤</Button>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
