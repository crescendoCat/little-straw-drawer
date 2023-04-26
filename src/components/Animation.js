import React,
{ 
  useState, 
  useRef,
  useEffect,
  useCallback
} from "react"
import {
  Modal
} from "react-bootstrap"

import {
  useSelector,
  useDispatch
} from "react-redux";
import {
  setIsPlayingAnimation,
  updateStraw
} from "../features/straw/strawSlice";
import {
  rgbObj2HexStr
} from "../utils";
import { LuckyWheel } from "@lucky-canvas/react";

export default function AnimationModal() {

  const dispatch = useDispatch();
  const { isPlayingAnimation, straws, history } = useSelector(state => state.straw);
  const { isRepeatable, showAnimation, animationTimeout } = useSelector(state => state.settings);

  const [strawIdPrizeIdxMapping, setMapping] = useState()

  const [blocks] = useState([
    { padding: '10px', background: '#869cfa' }
  ])
  const [prizes, setPrizes] = useState([])

  const startRolling = useCallback(() => { // 点击抽奖按钮会触发star回调
    if(!isRepeatable && straws.filter(s => !s.isPicked).length <= 1) {
      endRolling();
      return;
    }
    myLucky.current.play()
    setTimeout(() => {
      const index = strawIdPrizeIdxMapping[history[history.length-1].id]
      myLucky.current.stop(index)
    }, animationTimeout)
  }, [history, strawIdPrizeIdxMapping, animationTimeout])

  const endRolling = useCallback(prize => { // 抽奖结束会触发end回调
    alert('抽獎結果 ' + history[history.length-1].name)
    /* Easter eggs */
    if(history[history.length-1].name === "雞肋") {
      alert("本抽獎系統並沒有這麼雞肋，請尊重。")
    }
    if(history.length >= 5 && straws.length > 1) {
      let easterEggCnt = 0;
      for(let i = history.length-5; i < history.length; i++) {
        if(history[i].name === history[history.length-1].name) {
          easterEggCnt += 1;
        }
      }

      if( easterEggCnt === 5 ) {
        alert(`恭喜你，連續抽到五次名為${ history[history.length-1].name }的簽。
幸運之神顯然眷顧了你。`)
      }
    }

    /* end of easter eggs */
    dispatch(setIsPlayingAnimation(false));
    if(showAnimation && !isRepeatable) {
      dispatch(updateStraw({
        id: history[history.length-1].id,
        isPicked: true
      }))
    }
  }, [dispatch, showAnimation, history, isRepeatable])

  useEffect(() => {
    if(isPlayingAnimation) startRolling()
  }, [isPlayingAnimation, startRolling])

  useEffect(() => {
    let drawableStraws = [...straws]
    if(!isRepeatable) {
      drawableStraws = straws.filter(s => !s.isPicked);
    }
    let mapping = {}
    for(let idx in drawableStraws) {
      mapping[drawableStraws[idx].id] = parseInt(idx)
    }
    setMapping(mapping);
    setPrizes(drawableStraws.map(s => ({
      background: rgbObj2HexStr(s?.rgb ?? {r: 255, g: 255, b:255, a: 1}), fonts: [{text: s.name}]
    })))
  }, [straws, isRepeatable, isPlayingAnimation])

  const [buttons] = useState([
    { radius: '40%', background: '#617df2' },
    { radius: '35%', background: '#afc8ff' },
    {
      radius: '30%', background: '#869cfa',
      pointer: true,
      fonts: [{ text: 'Start', top: '-10px' }]
    }
  ])
  const myLucky = useRef()
  return <Modal 
    show={isPlayingAnimation} 
    onHide={() => {
      dispatch(setIsPlayingAnimation(false))
    }}
    size="lg"
    fullscreen="md-down"
    >
    <Modal.Header closeButton>
      <Modal.Title>Drawing...!!!</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div style={{height: "75vh"}} className="d-flex justify-content-center align-items-center">
      
      <LuckyWheel
        ref={myLucky}
        width="300px"
        height="300px"
        blocks={blocks}
        prizes={prizes}
        buttons={buttons}
        onStart={startRolling}
        onEnd={endRolling}
      />
      </div>
      { (prizes?.length ?? 1) === 1 
        ? <div className="text-center">這邊只有一支籤...為什麼不多加一點呢?</div>
        : null

      }
    </Modal.Body>
  </Modal>
}