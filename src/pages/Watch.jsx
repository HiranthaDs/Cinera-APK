import React,{useEffect,useState,useCallback,useRef} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {ArrowLeft,MonitorPlay,AlertTriangle,Check,Play,ChevronRight,RefreshCcw,Maximize2,Minimize2,Wifi,WifiOff,ShieldCheck,ExternalLink,Clapperboard} from 'lucide-react';
import {api,img} from '../lib/api';
import {nextAvailableSourceIndex} from '../lib/playback';
import {useStore} from '../lib/store';
import VideoFrame from '../components/VideoFrame';
import PlaybackLoading from '../components/PlaybackLoading';
import {ErrorPanel,Rating} from '../components/UI';

const readPreference=()=>{try{return localStorage.getItem('cinera_source_preference')||'';}catch{return '';}};

export default function Watch(){
  const {kind,id}=useParams();
  const [params,setParams]=useSearchParams();
  const season=Math.max(1,Number(params.get('season'))||1),episode=Math.max(1,Number(params.get('episode'))||1);
  const [item,setItem]=useState(null),[sources,setSources]=useState([]),[sourceIndex,setSourceIndex]=useState(0),[episodes,setEpisodes]=useState([]),[error,setError]=useState('');
  const [sourceLoading,setSourceLoading]=useState(true),[sourceError,setSourceError]=useState('');
  const [playerState,setPlayerState]=useState('loading'),[cinemaMode,setCinemaMode]=useState(false),[online,setOnline]=useState(()=>navigator.onLine);
  const [resume,setResume]=useState(0),[sourceAttempt,setSourceAttempt]=useState(0),[playerKey,setPlayerKey]=useState(0);
  const [failedSources,setFailedSources]=useState(()=>new Set()),[autoSwitch,setAutoSwitch]=useState(true),[failoverNote,setFailoverNote]=useState('');
  const {markWatched,saveProgress,getProgress}=useStore();
  const lastSaved=useRef(0);
  const source=sources[sourceIndex]||null;

  useEffect(()=>{const ctrl=new AbortController();setItem(null);setError('');api(`/api/title/${kind}/${id}`,ctrl.signal).then(setItem).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>ctrl.abort();},[kind,id]);
  useEffect(()=>{
    const ctrl=new AbortController();
    setSources([]);setSourceIndex(0);setSourceLoading(true);setSourceError('');setPlayerState('loading');setFailedSources(new Set());setFailoverNote('');
    api(`/api/sources/${kind}/${id}?season=${season}&episode=${episode}`,ctrl.signal,{fresh:sourceAttempt>0}).then(data=>{
      if(ctrl.signal.aborted)return;
      const next=data.sources||[];
      const preferred=params.get('server')||readPreference();
      const preferredIndex=Math.max(0,next.findIndex(source=>source.id===preferred));
      setSources(next);setSourceIndex(preferredIndex);setPlayerKey(value=>value+1);setSourceLoading(false);
    }).catch(e=>{if(!ctrl.signal.aborted&&e.name!=='AbortError'){setSourceError(e.message||'Could not load playback sources.');setSourceLoading(false);setPlayerState('error');}});
    return()=>ctrl.abort();
  },[kind,id,season,episode,sourceAttempt]);
  useEffect(()=>{if(kind!=='tv')return;const ctrl=new AbortController();setEpisodes([]);api(`/api/season/${id}/${season}`,ctrl.signal).then(data=>setEpisodes(data.episodes||[])).catch(()=>{});return()=>ctrl.abort();},[kind,id,season]);
  useEffect(()=>{
    const update=()=>setOnline(navigator.onLine);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  useEffect(()=>{
    if(!item)return;
    const pos=getProgress(item,season,episode);
    setResume(pos?.seconds>0?pos.seconds:0);
    lastSaved.current=0;
  },[item?.id,item?.kind,season,episode]);
  useEffect(()=>{
    if(playerState==='playing'&&item)markWatched(item,season,episode);
  },[playerState,item?.id,item?.kind,season,episode]);
  useEffect(()=>{
    const selected=sources[sourceIndex];if(!selected)return;
    try{localStorage.setItem('cinera_source_preference',selected.id);}catch{}
  },[sources,sourceIndex]);
  useEffect(()=>{
    if(playerState!=='error'||!source)return;
    setFailedSources(current=>{const next=new Set(current);next.add(source.id);return next;});
  },[playerState,source?.id]);
  useEffect(()=>{
    if(playerState!=='error'||!autoSwitch||sources.length<2)return;
    const nextIndex=nextAvailableSourceIndex(sources,sourceIndex,failedSources);
    if(nextIndex<0){setFailoverNote('Every available source needs attention. Retry one or rescan the list.');return;}
    const nextSource=sources[nextIndex];
    setFailoverNote(`${source?.label||'This source'} did not respond. Switching to ${nextSource.label}…`);
    const timer=setTimeout(()=>{
      setSourceIndex(nextIndex);setPlayerKey(value=>value+1);setPlayerState('loading');setFailoverNote('');
      setParams(current=>{const updated=new URLSearchParams(current);updated.set('server',nextSource.id);return updated;},{replace:true});
    },1800);
    return()=>clearTimeout(timer);
  },[playerState,autoSwitch,sourceIndex,sources,failedSources,source?.label,setParams]);

  const reportProgress=useCallback((seconds,duration)=>{
    if(!item||!Number.isFinite(seconds)||seconds<0)return;
    const now=Date.now();if(now-lastSaved.current<4000&&seconds!==duration)return;
    lastSaved.current=now;saveProgress(item,seconds,duration,season,episode);
  },[item,season,episode,saveProgress]);
  const reportRef=useRef(reportProgress);reportRef.current=reportProgress;
  useEffect(()=>{
    const selected=sources[sourceIndex];
    if(!selected||selected.type!=='iframe')return;
    const sourceOrigin=new URL(selected.url).origin;
    const listener=event=>{
      if(event.origin!==sourceOrigin)return;
      let payload=event.data;
      if(typeof payload==='string'){try{payload=JSON.parse(payload);}catch{return;}}
      if(!payload||typeof payload!=='object')return;
      if(payload.event==='play')setPlayerState('playing');
      else if(payload.event==='pause')setPlayerState('paused');
      else if(payload.event==='ended')setPlayerState('ended');
      else if(payload.event==='timeupdate')setPlayerState(current=>current==='connected'?'playing':current);
      if(['timeupdate','pause','ended'].includes(payload.event)&&typeof payload.currentTime==='number')reportRef.current(payload.currentTime,payload.duration);
    };
    window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);
  },[sources,sourceIndex]);
  const provider=item?.providers&&typeof item.providers==='object'&&!Array.isArray(item.providers)?item.providers:null;
  const trailer=item?.videos?.find(video=>video.type==='Trailer')||item?.videos?.[0];
  const selectSource=index=>{
    const selected=sources[index];if(!selected)return;
    setFailedSources(current=>{const next=new Set(current);next.delete(selected.id);return next;});
    setFailoverNote('');setSourceIndex(index);setPlayerKey(value=>value+1);setPlayerState('loading');
    setParams(current=>{const updated=new URLSearchParams(current);updated.set('server',selected.id);return updated;},{replace:true});
  };
  const rescanSources=()=>{setFailedSources(new Set());setFailoverNote('');setSourceAttempt(value=>value+1);};
  const handlePlayerState=useCallback((nextState)=>{
    setPlayerState(nextState);
    if(['connected','ready','playing'].includes(nextState)&&source){
      setFailedSources(current=>{if(!current.has(source.id))return current;const next=new Set(current);next.delete(source.id);return next;});
      setFailoverNote('');
    }
  },[source?.id]);
  const updateEpisode=(nextSeason,nextEp)=>{setParams(current=>{const updated=new URLSearchParams(current);updated.set('season',String(nextSeason));updated.set('episode',String(nextEp));return updated;});};
  const idx=episodes.findIndex(ep=>ep.episode_number===episode);
  const next=episodes[idx+1];
  const stateLabel=sourceLoading?'FINDING SOURCE':!source?'NO DIRECT SOURCE':{loading:'CONNECTING',starting:'STARTING',blocked:'READY TO WATCH',buffering:'BUFFERING',connected:'PLAYER OPEN',ready:'READY',playing:'PLAYING',paused:'PAUSED',ended:'COMPLETE',error:'SOURCE ERROR',idle:'WAITING'}[playerState]||'READY';
  if(error)return <div className="content-width watch-page"><ErrorPanel message={error}/></div>;

  return <div className={`watch-page ${cinemaMode?'cinema-mode':''}`}><div className="content-width watch-stage">
    <div className="watch-breadcrumb"><Link to={item?`/title/${kind}/${id}`:'/'}><ArrowLeft size={18}/> Back to details</Link><span>{item?.title||'Loading title…'}</span></div>
    <div className="watch-header"><div><span className="eyebrow"><span className="live-dot"/> NOW PLAYING / {stateLabel}</span><h1>{item?.title||'Loading…'}</h1>{kind==='tv'&&<p>Season {season} · Episode {episode}{episodes[idx]?.name?` — ${episodes[idx].name}`:''}</p>}</div>{item&&<div className="watch-header-meta"><Rating value={item.rating}/><span>{item.year||'—'}</span><span>{kind==='movie'?'MOVIE':'TV SERIES'}</span></div>}</div>
    <div className="watch-utility"><span className={online?'is-online':'is-offline'}>{online?<Wifi size={14}/>:<WifiOff size={14}/>} {online?'Connection online':'You are offline'}</span><span><ShieldCheck size={14}/> {sourceLoading?'Checking players':source?.external?source.label:'Secure in-app player'}</span><button onClick={()=>setCinemaMode(value=>!value)}>{cinemaMode?<Minimize2 size={15}/>:<Maximize2 size={15}/>} {cinemaMode?'Exit cinema mode':'Cinema mode'}</button></div>
    <div className="theater-shell"><div className="video-container">{sourceLoading?<PlaybackLoading discovery phase={0} title="Finding an available playback source…" detail="Checking direct streams and the configured fallback players for this title."/>:sourceError?<div className="video-unavailable" role="alert"><AlertTriangle size={34}/><h2>Sources did not load</h2><p>{sourceError}</p><button className="button button-primary" onClick={rescanSources}><RefreshCcw size={16}/> Try again</button></div>:source?<VideoFrame key={`${source.id}-${playerKey}`} source={source} resume={resume} onProgress={reportProgress} poster={item?.backdrop?img(item.backdrop,'w1280'):undefined} onStateChange={handlePlayerState}/>:<div className="video-unavailable safe-source-empty"><ShieldCheck size={38}/><span className="player-state-label">NO SOURCE</span><h2>No playback source is available</h2><p>Enable a configured fallback or add a licensed MP4/HLS source for in-app playback.</p><div className="safe-source-actions">{provider?.link&&<a className="button button-primary" href={provider.link} target="_blank" rel="noreferrer">Legal watch options <ExternalLink size={15}/></a>}{trailer&&<a className="button button-glass" href={`https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`} target="_blank" rel="noreferrer"><Clapperboard size={15}/> Watch trailer</a>}{!provider?.link&&!trailer&&<Link className="button button-glass" to={`/title/${kind}/${id}`}>Back to title details</Link>}</div></div>}</div></div>
    <div className="player-controls server-control-panel"><div className="player-source-intro"><MonitorPlay size={19}/><div><strong>Playback servers</strong><span>{sourceLoading?'Checking available sources…':sourceError?'Could not retrieve sources':sources.length>1?`${sources.length} sources ready · switch at any time`:sources.length===1?'One source available for this title':'No source available for this title'}</span></div><div className="player-source-actions"><button className={`server-auto ${autoSwitch?'is-active':''}`} aria-pressed={autoSwitch} onClick={()=>{setAutoSwitch(value=>!value);setFailoverNote('');}} title="Automatically try the next server after an error"><Check size={14}/> Auto {autoSwitch?'on':'off'}</button><button className="server-refresh" onClick={rescanSources} title="Rescan sources" disabled={sourceLoading}><RefreshCcw size={15}/> {sourceLoading?'Checking…':'Rescan'}</button></div></div><div className="source-pills">{sources.length?sources.map((entry,index)=>{const failed=failedSources.has(entry.id),active=sourceIndex===index;return <button className={`source-pill ${active?'active':''} ${failed?'has-failed':''}`} aria-pressed={active} aria-label={`${entry.label}. ${failed?'Unavailable':active?stateLabel:'Ready'}`} key={entry.id} onClick={()=>selectSource(index)}><span className="server-number">{String(index+1).padStart(2,'0')}</span><span><strong>{entry.label}</strong><small>{entry.external?'External player':entry.type==='hls'?'Adaptive HLS':'Direct video'} · {entry.quality||'Auto'}</small><em>{failed?'Needs retry':active?stateLabel:'Ready'}</em></span>{active?<Check size={16}/>:<Play size={14}/>}</button>; }):!sourceLoading&&!sourceError&&<span className="no-source">Enable a fallback or add a licensed source in <code>worker/sources.js</code>.</span>}</div>{failoverNote&&<p className="server-status-note" role="status" aria-live="polite">{failoverNote}</p>}</div>
    <div className="watch-bottom-layout"><div>
      {kind==='tv'&&item&&<section className="watch-episodes"><div className="episode-heading"><div className="section-title-wrap"><span className="section-title-marker"/><h2>Episode guide</h2></div><select value={season} aria-label="Season" onChange={event=>updateEpisode(Number(event.target.value),1)}>{(item.seasonList?.length?item.seasonList:[{season_number:1,name:'Season 1'}]).map(entry=><option key={entry.season_number} value={entry.season_number}>{entry.name}</option>)}</select></div><div className="mini-episode-grid">{episodes.map(entry=><button className={episode===entry.episode_number?'active':''} onClick={()=>updateEpisode(season,entry.episode_number)} key={entry.id}><small>EPISODE {String(entry.episode_number).padStart(2,'0')}</small><strong>{entry.name}</strong>{episode===entry.episode_number&&<span>Now playing</span>}</button>)}</div>{next&&<button className="next-episode" onClick={()=>updateEpisode(season,next.episode_number)}>Next episode: {next.name} <ChevronRight size={17}/></button>}</section>}
      {item&&<section className="watch-about"><div className="section-title-wrap"><span className="section-title-marker"/><h2>About this title</h2></div><p>{item.overview}</p></section>}
    </div>{item&&<aside className="watch-sidebar"><div className="watch-upnext"><span className="eyebrow">{source?'READY TO WATCH':'WATCH OPTIONS'}</span><div className="upnext-title"><div className="upnext-art">{item.poster&&<img src={img(item.poster,'w185')} alt=""/>}</div><div><h3>{item.title}</h3><p>{item.year} · {kind==='tv'?'TV Series':'Movie'}</p><Rating value={item.rating}/></div></div><p>{source?.type==='iframe'?`${source.label} is an external provider. Its player controls its own streams and any advertising shown inside the frame.`:source?'Progress is stored locally while the direct player is active.':'No playback source is currently available.'}</p><Link to={`/title/${kind}/${id}`}>View title details <ChevronRight size={16}/></Link></div></aside>}</div>
  </div></div>;
}
