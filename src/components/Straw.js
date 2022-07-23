import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import ListGroup from 'react-bootstrap/ListGroup'
import StrawData from '../features/straw'

import "./straw.scss";

export const Straw = (props) => {
  return (
    <ListGroup.Item className="straw-item">{props.straw.name}</ListGroup.Item>
  )
}

Straw.propTypes = {
  straw: PropTypes.instanceOf(StrawData)
}

const StrawList = (props) => {
  const straws = useSelector((state) => state.straw.straws)

  return (
    <ListGroup className="straw">
      {
        straws.map((item, id) => (
          <Straw straw={item} key={`straw-list-item-${id}`} />
        ))
      }
    </ListGroup>
  )
}

export default StrawList