import "./tutorial.scss"
import { useState, useEffect } from "react";
import { GrNext, GrPrevious } from "react-icons/gr";
import {
	Container,
	Row,
	Col,
	Button
} from "react-bootstrap"
import { useSelector, useDispatch } from "react-redux";
import { next, previous, endTutorial } from "../features/tutorial/tutorialSlice";
import { useSpring, animated, useTransition, config } from 'react-spring'

const padding = 10;

function ControlBtn(props) {
	return (
		<div className="btn-icon control-btn" {...props}>
		{
			props.children
		}
		</div>
	)
}

function TutorialInner(props) {
	const state = useSelector(s => s.tutorial)
	const dispatch = useDispatch();
	const [rect, setRect] = useState({x: 0, y: 0, w: 0, h: 0})
	const {x, y, h, w} = useSpring({...rect})
	const [pageY, api] = useSpring(() => ({
    immediate: false,
    pageY: 0,
    onChange: ({value}) => {
      window.scroll(0, value.pageY);
    },
    config: config.slow
  }));
	const [dimensions, setDimensions] = useState({ 
    height: window.innerHeight,
    width: window.innerWidth
  })
	let end = state.currentPosition + 1 === state.tutorials.length 
	const { opacity } = useSpring({opacity: end ? 1: 0})


	useEffect(() => {
				
		window.addEventListener('resize', handleResize)
		window.addEventListener('scroll', handleScroll)
		return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
		}
	}, [])

	useEffect(() => {
		setToDisplay(state?.display)
	}, [state])

	const setToDisplay = (display) => {
		if(display.id) {
			setToId(display.id)
		} else if(display.selector) {
			setToSelector(display.selector)
		}
	}

	const setToId = (id) => {
		let el = document.getElementById(id)
		if(el) {
			setToEl(el)
		}
	}

	const setToSelector = (selector) => {
		let el = document.querySelector(selector)
		if(el) {
			setToEl(el)
		}
	}

	const setToEl = (el) => {
		let rect = el.getBoundingClientRect()
		setRect({
			x: rect.left - padding,
			y: rect.top - padding,
			w: rect.right - rect.left + padding * 2,
			h: rect.bottom - rect.top + padding * 2
		})
	}


	const handleResize = () => {
		setToDisplay(state?.display)
		setDimensions({
      height: window.innerHeight,
      width: window.innerWidth
    })
	}

	const handleScroll = () => {
		
	}



	const handleClick = (e) => {
		console.log("click")
	}

	const handleNext = (e) => {
		dispatch(next());
	}

	const handlePrevious = (e) => {
		dispatch(previous());
	}

	return (
		<div className="tutorial" style={props.style}>
			<svg width={dimensions.width} height={dimensions.height}>
			  
			  <rect fill="#0008"width="100%" height="100%" mask="url(#svgmask1)" pointerEvents="none"></rect>
			  <mask id="svgmask1"  pointerEvents="none">
			    <rect fill="#fff" width="100%" height="100%"  pointerEvents="none"></rect>
			    <animated.rect fill="black" pointerEvents="none" id="tutorial-mask" x={x} y={y} width={w} height={h} rx="20" ></animated.rect>
			  </mask>
			</svg>
			<div className="controls w-100">
				<Container>
					<Row className="text-center justify-content-center">
						<Col>
							<span className="px-2 py-1" style={{backgroundColor: "#0008", borderRadius: "10px"}}>{state?.display?.description}</span>
						</Col>
					</Row>
					<Row className="mt-2 justify-content-center text-center">
						<Col>
							<ControlBtn onClick={handlePrevious}>
								<GrPrevious />
							</ControlBtn>
						</Col>

						<animated.div className="col" style={{
							opacity: opacity,
							visibility: opacity.to((x) => x === 0 ? "hidden": "visible")
						}}>
							<Button onClick={() => dispatch(endTutorial())}>End Tutorial</Button>
						</animated.div>

						<Col>
							<ControlBtn onClick={handleNext}>
								<GrNext />
							</ControlBtn>
						</Col>
					</Row>
					<div className="btn-close btn-light position-fixed" style={{top: 20, right: 20}}
						onClick={() => dispatch(endTutorial())}
						>
					</div>
				</Container>
			</div>
		</div>
	)
}

TutorialInner = animated(TutorialInner)

export default function Tutorial(props) {
	const transitions = useTransition(props.active, {
		from: {opacity: 0},
		enter: {opacity: 1},
		leave: {opacity: 0},
		config: {clamp:true}
	})
	return (
		<>
			{
				transitions(({opacity}, active) => {
					return active
						? <TutorialInner style={{opacity: opacity}}/>
						: null
				})
				
			}
		</>
	)
}