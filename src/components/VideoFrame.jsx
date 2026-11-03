import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Clapperboard,ExternalLink,Play,RefreshCcw,ShieldAlert} from 'lucide-react';
import PlaybackLoading from './PlaybackLoading';

const LOAD_TIMEOUT=25000;

export default function VideoFrame({source,resume=0,onProgress=()=>{},poster,onStateChange=()=>{}}){
  const videoRef=useRef(null);
  const shellRef=useRef(null);
  const onProgressRef=useRef(onProgress);
  const onStateRef=useRef(onStateChange);
  const resumeRef=useRef(resume);
  const statusRef=useRef(source?'loading':'idle');
  const [status,setStatus]=useState(statusRef.current);
  const [message,setMessage]=useState('Connecting to server…');
  const [attempt,setAttempt]=useState(0);
  const [connectionStage,setConnectionStage]=useState(1);
  onProgressRef.current=onProgress;
  onStateRef.current=onStateChange;
  resumeRef.current=resume;

  const updateState=useCallback((next,detail='')=>{
    statusRef.current=next;
    setStatus(next);
    if(detail)setMessage(detail);
    onStateRef.current(next,detail);
  },[]);

  useEffect(()=>{
    setConnectionStage(1);
    updateState(source?'loading':'idle','Connecting to server…');
  },[source?.id,source?.url,source?.type,attempt,updateState]);

  useEffect(()=>{
    if(!source||!videoRef.current)return;
    const elem=videoRef.current;
    const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    const constrained=Boolean(connection?.saveData||['slow-2g','2g'].includes(connection?.effectiveType));
    let hls;
    let disposed=false;
    let didResume=false;
    let attemptedAutoplay=false;
    let networkRecoveries=0;
    let mediaRecoveries=0;

    const preparePlayback=()=>{
      setConnectionStage(2);
      if(statusRef.current==='loading')updateState('loading','Preparing your playback…');
    };
    const onMetadata=()=>{
      if(!didResume){
        const position=Number(resumeRef.current)||0;
        if(position>0&&Number.isFinite(elem.duration)&&position<elem.duration-12)elem.currentTime=position;
        didResume=true;
      }
      preparePlayback();
    };
    const onCanPlay=()=>{
      if(!attemptedAutoplay&&!elem.ended&&!['playing','paused','error'].includes(statusRef.current)){
        attemptedAutoplay=true;
        setConnectionStage(2);
        updateState('starting','Starting playback…');
        Promise.resolve(elem.play()).then(()=>{
          if(!disposed&&!elem.paused)updateState('playing','Playing');
        }).catch(error=>{
          if(disposed||statusRef.current==='paused')return;
          if(error.name==='NotAllowedError'||error.name==='AbortError')updateState('blocked','Press play to start watching.');
          else updateState('error','This video could not start. Retry or choose another server.');
        });
        return;
      }
      if(['loading','buffering'].includes(statusRef.current))updateState(elem.paused?'ready':'playing',elem.paused?'Ready to play':'Playing');
    };
    const onLoadStart=()=>{setConnectionStage(1);updateState('loading','Connecting to server…');};
    const onWaiting=()=>{if(statusRef.current!=='error'){setConnectionStage(2);updateState('buffering','Buffering your video…');}};
    const onStalled=()=>{if(elem.readyState<3&&(statusRef.current==='loading'||!elem.paused))onWaiting();};
    const onPlaying=()=>updateState('playing','Playing');
    const onPause=()=>{if(!elem.ended&&['playing','starting'].includes(statusRef.current))updateState('paused','Paused');};
    const onEnded=()=>updateState('ended','Playback complete');
    const onError=()=>{
      const descriptions={2:'The connection to this server was interrupted.',3:'This video could not be decoded.',4:'This video format or source is unavailable.'};
      updateState('error',descriptions[elem.error?.code]||'This source could not be played. Try again or choose another server.');
    };

    elem.addEventListener('loadstart',onLoadStart);
    elem.addEventListener('loadedmetadata',onMetadata);
    elem.addEventListener('canplay',onCanPlay);
    elem.addEventListener('waiting',onWaiting);
    elem.addEventListener('stalled',onStalled);
    elem.addEventListener('playing',onPlaying);
    elem.addEventListener('pause',onPause);
    elem.addEventListener('ended',onEnded);
    elem.addEventListener('error',onError);

    if(source.type==='hls'){
      if(elem.canPlayType('application/vnd.apple.mpegurl')){
        elem.src=source.url;
        elem.load();
      }else import('hls.js').then(({default:Hls})=>{
        if(disposed)return;
        if(!Hls.isSupported()){updateState('error','HLS playback is not supported by this browser.');return;}
        hls=new Hls({
          enableWorker:true,
          lowLatencyMode:false,
          backBufferLength:30,
          maxBufferLength:constrained?15:40,
          maxMaxBufferLength:constrained?30:90,
          startLevel:-1,
          capLevelToPlayerSize:true,
          testBandwidth:true,
        });
        hls.on(Hls.Events.MANIFEST_PARSED,preparePlayback);
        hls.on(Hls.Events.ERROR,(_event,data)=>{
          if(!data.fatal)return;
          if(data.type===Hls.ErrorTypes.NETWORK_ERROR&&networkRecoveries<2){
            networkRecoveries+=1;
            setConnectionStage(1);
            updateState('buffering',`Reconnecting to server… (${networkRecoveries}/2)`);
            hls.startLoad();
            return;
          }
          if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&mediaRecoveries<2){
            mediaRecoveries+=1;
            setConnectionStage(2);
            updateState('buffering','Recovering the video stream…');
            hls.recoverMediaError();
            return;
          }
          updateState('error','The stream stopped responding. Try reloading this source.');
        });
        hls.loadSource(source.url);
        hls.attachMedia(elem);
      }).catch(()=>{if(!disposed)updateState('error','The video player could not be loaded. Please retry.');});
    }else{
      elem.src=source.url;
      elem.load();
    }

    return()=>{
      disposed=true;
      elem.removeEventListener('loadstart',onLoadStart);
      elem.removeEventListener('loadedmetadata',onMetadata);
      elem.removeEventListener('canplay',onCanPlay);
      elem.removeEventListener('waiting',onWaiting);
      elem.removeEventListener('stalled',onStalled);
      elem.removeEventListener('playing',onPlaying);
      elem.removeEventListener('pause',onPause);
      elem.removeEventListener('ended',onEnded);
      elem.removeEventListener('error',onError);
      hls?.destroy();
      elem.pause();
      elem.removeAttribute('src');
      elem.load();
    };
  },[source?.id,source?.url,source?.type,attempt,updateState]);

  useEffect(()=>{
    if(!source||!['loading','buffering','starting'].includes(status))return;
    const timer=setTimeout(()=>updateState('error','This server is taking longer than expected. Retry or choose another server.'),LOAD_TIMEOUT);
    return()=>clearTimeout(timer);
  },[source?.url,source?.type,attempt,status,updateState]);

  const retry=()=>{setConnectionStage(1);updateState('loading','Reconnecting to server…');setAttempt(value=>value+1);};
  const playFromGesture=()=>{
    const elem=videoRef.current;
    if(!elem||statusRef.current==='starting')return;
    updateState('starting','Starting playback…');
    Promise.resolve(elem.play()).then(()=>{
      if(videoRef.current===elem&&!elem.paused)updateState('playing','Playing');
    }).catch(error=>{
      if(videoRef.current!==elem||statusRef.current==='paused')return;
      if(error.name==='NotAllowedError'||error.name==='AbortError')updateState('blocked','Press play to start watching.');
      else updateState('error','This video could not start. Retry or choose another server.');
    });
  };
  const toggleFullscreen=()=>{
    const target=shellRef.current;
    if(!document.fullscreenElement)target?.requestFullscreen?.().catch(()=>{});
    else document.exitFullscreen?.().catch(()=>{});
  };
  const handleRemote=event=>{
    const elem=videoRef.current;
    if(!elem)return;
    if(['INPUT','SELECT','BUTTON','A'].includes(event.target.tagName)&&event.target!==shellRef.current)return;
    if(['Enter',' ','MediaPlayPause'].includes(event.key)){
      event.preventDefault();
      elem.paused?playFromGesture():elem.pause();
    }else if(event.key==='ArrowLeft'){event.preventDefault();elem.currentTime=Math.max(0,elem.currentTime-10);}
    else if(event.key==='ArrowRight'){event.preventDefault();elem.currentTime=Math.min(elem.duration||Infinity,elem.currentTime+10);}
    else if(event.key==='ArrowUp'){event.preventDefault();elem.volume=Math.min(1,elem.volume+.1);}
    else if(event.key==='ArrowDown'){event.preventDefault();elem.volume=Math.max(0,elem.volume-.1);}
    else if(event.key.toLowerCase()==='m')elem.muted=!elem.muted;
    else if(event.key.toLowerCase()==='f')toggleFullscreen();
  };

  if(!source)return <div className="video-unavailable"><Clapperboard size={36}/><span className="player-state-label">NO DIRECT SOURCE</span><h2>No ad-free stream is configured</h2><p>Use a legal watch option below, or add a licensed MP4 or HLS stream for this title.</p></div>;

  const loading=['loading','buffering','starting'].includes(status);
  const loadingDetail=connectionStage===1?'Waiting for the selected server to respond.':'Loading enough video for playback to begin.';
  return <div ref={shellRef} className={`video-frame-shell state-${status}`} tabIndex={0} data-native-arrows="true" onKeyDown={handleRemote} aria-label={`${source.label} player`} aria-busy={loading}>
    <video key={`${source.url}-${attempt}`} className="video-element" ref={videoRef} controls playsInline preload="auto" poster={poster||undefined} controlsList="nodownload noplaybackrate" disablePictureInPicture={false} onTimeUpdate={event=>onProgressRef.current(event.currentTarget.currentTime,event.currentTarget.duration)} onEnded={event=>onProgressRef.current(event.currentTarget.duration,event.currentTarget.duration)}/>
    {loading&&<PlaybackLoading phase={connectionStage} title={message} detail={loadingDetail} sourceLabel={source.label}/>}
    {status==='blocked'&&<div className="player-start-prompt"><span className="player-state-label">READY TO WATCH</span><button className="button button-primary player-start-button" onClick={playFromGesture}><Play size={22} fill="currentColor"/> Play now</button><p>Your browser needs one tap to start with sound.</p></div>}
    {status==='error'&&<div className="player-error" role="alert"><ShieldAlert size={34}/><strong>Playback needs attention</strong><p>{message}</p><div><button className="button button-primary" onClick={retry}><RefreshCcw size={16}/> Retry source</button><a className="button button-glass" href={source.url} target="_blank" rel="noreferrer">Open directly <ExternalLink size={15}/></a></div></div>}
    <span className="remote-hint">REMOTE: ←/→ seek · ENTER play · F fullscreen</span>
  </div>;
}
