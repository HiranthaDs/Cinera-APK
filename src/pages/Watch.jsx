import React,{useEffect,useState,useCallback,useRef} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {ArrowLeft,MonitorPlay,AlertTriangle,Check,Play,ChevronRight,RefreshCcw,Maximize2,Minimize2,Wifi,WifiOff,Tv2} from 'lucide-react';
import {api,img} from '../lib/api';
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
  const {markWatched,saveProgress,getProgress}=useStore();
  const lastSaved=useRef(0);

  useEffect(()=>{const ctrl=new AbortController();setItem(null);setError('');api(`/api/title/${kind}/${id}`,ctrl.signal).then(setItem).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>ctrl.abort();},[kind,id]);
  useEffect(()=>{
    const ctrl=new AbortController();
    setSources([]);setSourceIndex(0);setSourceLoading(true);setSourceError('');setPlayerState('loading');
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
    markWatched(item,season,episode);
    const pos=getProgress(item,season,episode);
    setResume(pos?.seconds>0?pos.seconds:0);
    lastSaved.current=0;
  },[item?.id,item?.kind,season,episode]);
  useEffect(()=>{
    const selected=sources[sourceIndex];if(!selected)return;
    try{localStorage.setItem('cinera_source_preference',selected.id);}catch{}
  },[sources,sourceIndex]);
  useEffect(()=>{
    if(playerState!=='error'||sourceIndex>=sources.length-1)return;
    const timer=setTimeout(()=>{const nextIndex=Math.min(sourceIndex+1,sources.length-1);setSourceIndex(nextIndex);setPlayerKey(value=>value+1);setPlayerState('loading');const updated=new URLSearchParams(params);updated.set('server',sources[nextIndex].id);setParams(updated,{replace:true});},2200);
    return()=>clearTimeout(timer);
  },[playerState,sourceIndex,sources,params,setParams]);

  const reportProgress=useCallback((seconds,duration)=>{
    if(!item||!Number.isFinite(seconds)||seconds<0)return;
    const now=Date.now();if(now-lastSaved.current<4000&&seconds!==duration)return;
    lastSaved.current=now;saveProgress(item,seconds,duration,season,episode);
  },[item,season,episode,saveProgress]);
  const reportRef=useRef(reportProgress);reportRef.current=reportProgress;
  useEffect(()=>{
    if(!sources[sourceIndex]||sources[sourceIndex].type!=='iframe')return;
    const selected=sources[sourceIndex];const sourceOrigin=new URL(selected.url).origin;
    const listener=event=>{
      if(event.origin!==sourceOrigin&&event.origin!=='https://www.vidy.st'&&event.origin!=='https://vidy.st')return;
      let payload=event.data;
      if(typeof payload==='string'){try{payload=JSON.parse(payload);}catch{return;}}
      if(!payload||typeof payload!=='object')return;
      if(['timeupdate','pause','ended'].includes(payload.event)&&typeof payload.currentTime==='number')reportRef.current(payload.currentTime,payload.duration);
    };
    window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);
  },[sources,sourceIndex]);

  const source=sources[sourceIndex]||null;
  const selectSource=index=>{const selected=sources[index];if(!selected)return;setSourceIndex(index);setPlayerKey(value=>value+1);setPlayerState('loading');const updated=new URLSearchParams(params);updated.set('server',selected.id);setParams(updated,{replace:true});};
  const updateEpisode=(nextSeason,nextEp)=>{const updated=new URLSearchParams(params);updated.set('season',String(nextSeason));updated.set('episode',String(nextEp));setParams(updated);};
  const idx=episodes.findIndex(ep=>ep.episode_number===episode);
  const next=episodes[idx+1];
  const stateLabel=sourceLoading?'FINDING SERVER':{loading:'CONNECTING',starting:'STARTING',blocked:'READY TO WATCH',buffering:'BUFFERING',connected:'PLAYER OPEN',ready:'READY',playing:'PLAYING',paused:'PAUSED',ended:'COMPLETE',error:'SOURCE ERROR',idle:'WAITING'}[playerState]||'READY';
  if(error)return <div className="content-width watch-page"><ErrorPanel message={error}/></div>;

  return <div className={`watch-page ${cinemaMode?'cinema-mode':''}`}><div className="content-width watch-stage">
    <div className="watch-breadcrumb"><Link to={item?`/title/${kind}/${id}`:'/'}><ArrowLeft size={18}/> Back to details</Link><span>{item?.title||'Loading title…'}</span></div>
    <div className="watch-header"><div><span className="eyebrow"><span className="live-dot"/> NOW PLAYING / {stateLabel}</span><h1>{item?.title||'Loading…'}</h1>{kind==='tv'&&<p>Season {season} · Episode {episode}{episodes[idx]?.name?` — ${episodes[idx].name}`:''}</p>}</div>{item&&<div className="watch-header-meta"><Rating value={item.rating}/><span>{item.year||'—'}</span><span>{kind==='movie'?'MOVIE':'TV SERIES'}</span></div>}</div>
    <div className="watch-utility"><span className={online?'is-online':'is-offline'}>{online?<Wifi size={14}/>:<WifiOff size={14}/>} {online?'Connection online':'You are offline'}</span><span><Tv2 size={14}/> TV & remote ready</span><button onClick={()=>setCinemaMode(value=>!value)}>{cinemaMode?<Minimize2 size={15}/>:<Maximize2 size={15}/>} {cinemaMode?'Exit cinema mode':'Cinema mode'}</button></div>
    <div className="theater-shell"><div className="video-container">{sourceLoading?<PlaybackLoading discovery phase={0} title="Finding the best available server…" detail="Looking up this title’s sources and your saved server preference."/>:sourceError?<div className="video-unavailable" role="alert"><AlertTriangle size={34}/><h2>Sources did not load</h2><p>{sourceError}</p><button className="button button-primary" onClick={()=>setSourceAttempt(value=>value+1)}><RefreshCcw size={16}/> Try again</button></div>:<VideoFrame key={`${source?.id||'none'}-${playerKey}`} source={source} resume={resume} onProgress={reportProgress} poster={item?.backdrop?img(item.backdrop,'w1280'):undefined} onStateChange={setPlayerState}/>}</div></div>
    <div className="player-controls server-control-panel"><div className="player-source-intro"><MonitorPlay size={19}/><div><strong>Choose your server</strong><span>{sourceLoading?'Finding available servers…':sourceError?'Could not retrieve servers':sources.length>1?`${sources.length} servers available · switch at any time`:sources.length===1?'One server available for this title':'No servers available for this title'}</span></div><button className="server-refresh" onClick={()=>setSourceAttempt(value=>value+1)} title="Scan for servers" disabled={sourceLoading}><RefreshCcw size={15}/> {sourceLoading?'Checking…':'Rescan'}</button></div><div className="source-pills">{sources.length?sources.map((entry,index)=><button className={`source-pill ${sourceIndex===index?'active':''}`} aria-pressed={sourceIndex===index} key={entry.id} onClick={()=>selectSource(index)}><span className="server-number">{String(index+1).padStart(2,'0')}</span><span><strong>Server {index+1}</strong><small>{entry.external?'External player':entry.type==='hls'?'Adaptive HLS':'Direct video'} · {entry.quality||'Auto'}</small></span>{sourceIndex===index?<Check size={16}/>:<Play size={14}/>}</button>):!sourceLoading&&!sourceError&&<span className="no-source">Try another title or rescan later.</span>}</div></div>
    <div className="watch-bottom-layout"><div>
      {kind==='tv'&&item&&<section className="watch-episodes"><div className="episode-heading"><div className="section-title-wrap"><span className="section-title-marker"/><h2>Episode guide</h2></div><select value={season} aria-label="Season" onChange={event=>updateEpisode(Number(event.target.value),1)}>{(item.seasonList?.length?item.seasonList:[{season_number:1,name:'Season 1'}]).map(entry=><option key={entry.season_number} value={entry.season_number}>{entry.name}</option>)}</select></div><div className="mini-episode-grid">{episodes.map(entry=><button className={episode===entry.episode_number?'active':''} onClick={()=>updateEpisode(season,entry.episode_number)} key={entry.id}><small>EPISODE {String(entry.episode_number).padStart(2,'0')}</small><strong>{entry.name}</strong>{episode===entry.episode_number&&<span>Now playing</span>}</button>)}</div>{next&&<button className="next-episode" onClick={()=>updateEpisode(season,next.episode_number)}>Next episode: {next.name} <ChevronRight size={17}/></button>}</section>}
      {item&&<section className="watch-about"><div className="section-title-wrap"><span className="section-title-marker"/><h2>About this title</h2></div><p>{item.overview}</p></section>}
    </div>{item&&<aside className="watch-sidebar"><div className="watch-upnext"><span className="eyebrow">CURRENTLY WATCHING</span><div className="upnext-title"><div className="upnext-art">{item.poster&&<img src={img(item.poster,'w185')} alt=""/>}</div><div><h3>{item.title}</h3><p>{item.year} · {kind==='tv'?'TV Series':'Movie'}</p><Rating value={item.rating}/></div></div><p>Progress is stored locally when the selected player reports it.</p><Link to={`/title/${kind}/${id}`}>View title details <ChevronRight size={16}/></Link></div></aside>}</div>
  </div></div>;
}
