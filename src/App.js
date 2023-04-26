import {
  Container,
  Row,
  Col,
  Button,
} from 'react-bootstrap';
import StrawList from './components/Straw';
import StrawResult from './components/StrawResult'
import Menu from './components/Menu'
import { useDispatch, useSelector } from 'react-redux';
import { 
  addHistory,
  updateStraw,
  clearHistory,
  setIsPlayingAnimation
} from './features/straw/strawSlice';
import Tutorial from "./components/Tutorial";
import Settings from "./components/Settings";
import Animation from "./components/Animation";

import Share from './components/Share';

import {
  useEffect,
  useCallback
} from 'react';

import {
  FacebookShareButton,
  FacebookIcon,
  LineShareButton,
  LineIcon,
  TelegramShareButton,
  TelegramIcon,
  TwitterShareButton,
  TwitterIcon
} from 'react-share'


function App() {
  const dispatch = useDispatch();
  const straws = useSelector((state) => state.straw.straws);
  const history = useSelector((state) => state.straw.history);
  const settings = useSelector((state) => state.settings);
  const showTutorial = useSelector(state => state.tutorial.showTutorial)
  const shareLink = window.location.href;
  const draw = useCallback(() => {
    let drawableStraws = [...straws];
    let rndNum = drawableStraws.length;

    if(rndNum <= 0) {
      alert("No straws now! Add a straw then click \"draw\"!");
      return;
    }

    if(!settings.isRepeatable) {
      //選出還沒有被抽過的籤
      drawableStraws = straws.filter(s => !s.isPicked);
      rndNum = drawableStraws.length;
      if(rndNum === 0) {
        alert("No straws left! Clear the history and try again~");
        return;
      }
    }
    
    if(settings.showAnimation) {
      dispatch(setIsPlayingAnimation(true));
    }
    
    let rnd = crypto.getRandomValues(new Uint32Array(rndNum))
    let randomIndex = rnd.indexOf(Math.max(...rnd))
    let picked = {
      id: drawableStraws[randomIndex].id,
      name: drawableStraws[randomIndex].name,
      color: drawableStraws[randomIndex].rgb ?? {r: 255, g: 255, b: 255, a: 1}
    }

    if(!settings.showAnimation) {
      /* Easter eggs */
      if(picked.name === "雞肋") {
        alert("本抽獎系統並沒有這麼雞肋，請尊重。")
      }
      if(history.length >= 4 && straws.length > 1) {
        let easterEggCnt = 0;
        for(let i = history.length-4; i < history.length; i++) {
          if(history[i].name === picked.name) {
            easterEggCnt += 1;
          }
        }
        console.log("in", history.length, easterEggCnt)

        if( easterEggCnt === 4 ) {
          alert(`恭喜你，連續抽到五次名為${ picked.name }的簽。
幸運之神顯然眷顧了你。`)
        }
      }

      /* end of easter eggs */
    }

    if(!settings.isRepeatable) {
      //如果不需要顯示動畫，則直接將選到的標為已選
      if(!settings.showAnimation) {
        dispatch(updateStraw({
          id: drawableStraws[randomIndex].id,
          isPicked: true
        }))
      }
      //如果需要顯示，則交給Animation更新straws
    }
    dispatch(addHistory(picked))
  }, [dispatch, history, settings.isRepeatable, settings.showAnimation, straws]);

  useEffect(() => {
    if(window.DeviceMotionEvent){
      window.addEventListener('devicemotion', shakeDetector,false);
    }
    let speed =30;//speed
    let x, y, z, lastX, lastY, lastZ;
    x = y = z = lastX = lastY = lastZ = 0;
    function shakeDetector(eventData){
      let acceleration =eventData.accelerationIncludingGravity;
      x = acceleration.x;
      y = acceleration.y;
      z = acceleration.z;
      if(Math.abs(x-lastX)> speed ||Math.abs(y-lastY)> speed ||Math.abs(z-lastZ)> speed){
        draw();
        //alert(1);
      }
      lastX = x;
      lastY = y;
      lastZ = z;
    } 
  }, [draw])

  return (
  <>
    <Container className="p-5">

      <Row className="justify-content-center">
        <Col className="text-center">
          <h1>Mi Mi Draw Machine</h1>
        </Col>
      </Row>
      <Row className="p-2 justify-content-end justify-content-lg-center">
        <Col xs={12} sm={"auto"} lg={3} className="d-flex d-xl-none justify-content-end">
          Share this app:
        </Col>
        <Col xs={12} sm={"auto"} lg={3} xl={6} className="d-flex justify-content-end">
          <div className="d-none d-xl-block me-2">Share this app:</div>
          <Share title={"Mi Mi Draw Machine"} text={"Mi Mi Draw Machine: wanna draw some straws? A simple, easy and fast solution you should try!\n"}/>
          <FacebookShareButton 
            url={shareLink}
            quote={"Mi Mi Draw Machine"}
            hashtag={"#draw-machine"}>
            <FacebookIcon size={32} round />
          </FacebookShareButton>
          <LineShareButton url={shareLink}>
            <LineIcon size={32} round />
          </LineShareButton>
          <TelegramShareButton url={shareLink}>
            <TelegramIcon size={32} round />
          </TelegramShareButton>
          <TwitterShareButton url={shareLink}>
            <TwitterIcon size={32} round />
          </TwitterShareButton>
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col xs={12} lg={6}>
          <Menu />
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
    <Settings />
    <Animation />
    <Tutorial active={showTutorial === "show" ? true: false}/>
  
  </>
  );
}

export default App;
