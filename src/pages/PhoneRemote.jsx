import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,ChevronLeft,Expand,Heart,Home,Minus,MonitorPlay,Pause,Play,Plus,RotateCcw,Search,SkipBack,SkipForward,Volume2,VolumeX} from 'lucide-react';
import {remoteSocketUrl} from '../lib/remote';

const navItems=[['/',Home,'Home'],['/movies',MonitorPlay,'Movies'],['/series',Play,'Series'],['/search',Search,'Search'],['/watchlist',Heart,'My list']];

export default function PhoneRemote(){
  const [params]=useSearchParams();
  const pair=params.get('pair')||'';
  const valid=/^[A-Za-z0-9_-]{22,80}$/.test(pair);
  const [status,setStatus]=useState(valid?'connecting':'invalid'),[screenConnected,setScreenConnected]=useState(false),[screenState,setScreenState]=useState({});
  const socketRef=useRef(null),reconnectRef=useRef(null),wakeLockRef=useRef(null);
  const connect=useCallback(()=>{
    if(!valid)return()=>{};
    let stopped=false;
    const open=()=>{
      if(stopped)return;
      setStatus('connecting');
      const socket=new WebSocket(remoteSocketUrl(pair,'remote'));socketRef.current=socket;
      socket.addEventListener('open',async()=>{setStatus('waiting');try{wakeLockRef.current=await navigator.wakeLock?.request('screen');}catch{}});
      socket.addEventListener('message',event=>{let payload;try{payload=JSON.parse(event.data);}catch{return;}if(payload.type==='presence'){setScreenConnected(Boolean(payload.screenConnected));setStatus(payload.screenConnected?'connected':'waiting');}else if(payload.type==='state')setScreenState(current=>({...current,...payload.state}));});
      socket.addEventListener('close',()=>{if(stopped)return;setScreenConnected(false);setStatus('reconnecting');reconnectRef.current=setTimeout(open,1800);});
      socket.addEventListener('error',()=>setStatus('error'));
    };
    open();
    return()=>{stopped=true;clearTimeout(reconnectRef.current);socketRef.current?.close();wakeLockRef.current?.release?.();};
  },[pair,valid]);
  useEffect(connect,[connect]);
  const send=command=>{
    navigator.vibrate?.(12);
    if(socketRef.current?.readyState===WebSocket.OPEN)socketRef.current.send(JSON.stringify({type:'command',command}));
  };
  if(!valid)return <div className="phone-remote-error"><div><strong>CINERA REMOTE</strong><h1>This pairing link is invalid.</h1><p>Open Remote on the TV and scan the newest QR code.</p></div></div>;
  const connected=status==='connected'&&screenConnected;
  return <div className="phone-remote">
    <header><div className="phone-remote-brand"><span><Play fill="currentColor"/></span>CINERA</div><div className={`phone-remote-status ${connected?'is-connected':''}`}><i/>{connected?'TV connected':status==='reconnecting'?'Reconnecting…':'Waiting for TV'}</div></header>
    <main>
      <section className="remote-now-playing"><span>NOW CONTROLLING</span><h1>{screenState.title||'Cinera'}</h1><p>{screenState.subtitle||screenState.playerState||'Choose something on the TV to begin'}</p><div className="remote-progress"><i style={{width:`${Math.max(0,Math.min(100,screenState.progress||0))}%`}}/></div></section>
      <section className="remote-dpad" aria-label="TV navigation pad"><button onClick={()=>send({action:'key',key:'ArrowUp'})} aria-label="Up"><ArrowUp/></button><button onClick={()=>send({action:'key',key:'ArrowLeft'})} aria-label="Left"><ArrowLeft/></button><button className="remote-ok" onClick={()=>send({action:'key',key:'Enter'})}>OK</button><button onClick={()=>send({action:'key',key:'ArrowRight'})} aria-label="Right"><ArrowRight/></button><button onClick={()=>send({action:'key',key:'ArrowDown'})} aria-label="Down"><ArrowDown/></button></section>
      <section className="remote-playback" aria-label="Playback controls"><button onClick={()=>send({action:'seek_relative',seconds:-10})} aria-label="Back ten seconds"><SkipBack/></button><button className="remote-play" onClick={()=>send({action:'play_pause'})} aria-label="Play or pause">{screenState.playerState==='playing'?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button onClick={()=>send({action:'seek_relative',seconds:10})} aria-label="Forward ten seconds"><SkipForward/></button></section>
      <section className="remote-utilities"><button onClick={()=>send({action:'back'})}><ChevronLeft/> Back</button><button onClick={()=>send({action:'mute'})}>{screenState.muted?<VolumeX/>:<Volume2/>} Mute</button><button onClick={()=>send({action:'volume',delta:-.1})}><Minus/> Volume</button><button onClick={()=>send({action:'volume',delta:.1})}><Plus/> Volume</button><button onClick={()=>send({action:'fullscreen'})}><Expand/> Fullscreen</button><button onClick={()=>send({action:'restart'})}><RotateCcw/> Start over</button></section>
      <nav className="remote-nav" aria-label="Open a TV section">{navItems.map(([path,Icon,label])=><button key={path} onClick={()=>send({action:'navigate',path})}><Icon/><span>{label}</span></button>)}</nav>
    </main>
  </div>;
}
