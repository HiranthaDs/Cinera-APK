import React,{useEffect,useState,useCallback,useMemo} from 'react';
import {Link} from 'react-router-dom';
import {Play,Pause,Info,ChevronLeft,ChevronRight,Flame,MonitorPlay,ShieldAlert,ArrowRight,Asterisk,Star} from 'lucide-react';
import {api,img,truncated} from '../lib/api';
import {useStore} from '../lib/store';
import {Section,Skeletons,HeroSkeleton,ErrorPanel} from '../components/UI';

function Hero({featured}){
  const slides=useMemo(()=>featured.slice(0,6),[featured]);
  const [selected,setSelected]=useState(0);
  const [hovered,setHovered]=useState(false),[focusWithin,setFocusWithin]=useState(false),[paused,setPaused]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>setSelected(0),[slides]);
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReducedMotion(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{const next=slides[(selected+1)%slides.length];if(!next)return;const image=new Image();image.src=img(next.backdrop||next.poster,'w1280');},[slides,selected]);
  useEffect(()=>{if(slides.length<=1||hovered||focusWithin||paused||reducedMotion)return;const timer=setInterval(()=>setSelected(value=>(value+1)%slides.length),8500);return()=>clearInterval(timer);},[slides,hovered,focusWithin,paused,reducedMotion]);
  const movie=slides[selected];if(!movie)return null;
  return <section className="hero" aria-label="Featured titles" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocus={()=>setFocusWithin(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocusWithin(false);}}>
    <div className="hero-inner content-width">
      <div className="hero-movie-content" aria-live={hovered||focusWithin?'polite':'off'}>
        <div className="hero-storyline"><span>STORIES FOR NIGHTS THAT</span><em>FEEL BIG.</em><Asterisk/></div>
        <div className="hero-selected-label"><span className="live-dot"/> FEATURED STORY <i/> {String(selected+1).padStart(2,'0')} / {String(slides.length).padStart(2,'0')}</div>
        <h1 key={movie.id}>{movie.title}</h1>
        <div className="hero-movie-meta"><span>{movie.year||'TBA'}</span><span>{movie.kind==='tv'?'TV series':'Movie'}</span><span><Star size={13} fill="currentColor"/> {movie.rating?Number(movie.rating).toFixed(1):'NR'}</span></div>
        <p className="hero-movie-overview">{truncated(movie.overview,215)}</p>
        <div className="hero-buttons"><Link to={`/watch/${movie.kind}/${movie.id}`} className="button button-primary button-large"><Play size={17} fill="currentColor"/> Watch options</Link><Link to={`/title/${movie.kind}/${movie.id}`} className="button button-glass button-large"><Info size={18}/> Details</Link></div>
      </div>
      <div className="hero-card-stack" style={{backgroundImage:movie.backdrop||movie.poster?`url('${img(movie.backdrop||movie.poster,'w1280')}')`:undefined}}>
        <div className="hero-card-number">{String(selected+1).padStart(2,'0')}</div>
        <div className="hero-indicators">{slides.map((entry,index)=><button key={entry.id} className={selected===index?'selected':''} onClick={()=>setSelected(index)} aria-label={`Show ${entry.title}`} aria-pressed={selected===index}/>)}</div>
        {slides.length>1&&<div className="hero-arrows">{!reducedMotion&&<button onClick={()=>setPaused(value=>!value)} aria-label={paused?'Resume featured slideshow':'Pause featured slideshow'}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>}<button onClick={()=>setSelected(value=>(value-1+slides.length)%slides.length)} aria-label="Previous featured title"><ChevronLeft size={21}/></button><button onClick={()=>setSelected(value=>(value+1)%slides.length)} aria-label="Next featured title"><ChevronRight size={21}/></button></div>}
      </div>
    </div>
  </section>;
}

export default function Home(){
  const [data,setData]=useState(null),[error,setError]=useState('');
  const {history}=useStore();
  const load=useCallback(()=>{setError('');api('/api/home').then(setData).catch(errorValue=>setError(errorValue.message));},[]);
  useEffect(load,[load]);
  return <>
    {data?.featured?.length?<Hero featured={data.featured}/>:!data&&!error?<HeroSkeleton/>:null}
    {error&&!data&&<div className="content-width home-hero-error"><ErrorPanel message={error} onRetry={load}/></div>}
    <div className="content-width home-main">
      {data?.demo&&<div className="demo-banner"><ShieldAlert size={18}/><p><strong>Demo catalog mode.</strong> Configure a TMDB API token in the Worker secrets to load thousands of searchable movies and TV series.</p><a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">Get API token <ArrowRight size={14}/></a></div>}
      {data?.warning&&<div className="inline-warning">{data.warning}</div>}
      {error&&data&&<ErrorPanel message={error} onRetry={load}/>}
      {data&&<>
        <div className="top-caption"><Flame size={15} fill="currentColor"/> YOUR NEXT OBSESSION STARTS HERE <span/></div>
        {history.length>0&&<Section title="Continue watching" sub="Pick up where you left off" items={history.slice(0,15)}/>}
        {(data.rows||[]).map((row,index)=><Section key={row.id} title={row.label} sub={index===0?'The titles everybody is talking about':index===1?'Stories worth staying up for':undefined} items={row.items} kind={row.kind} to={row.kind==='tv'?'/series':'/movies'} icon={index===0?<Flame className="section-heading-icon" size={23}/>:index===1?<MonitorPlay className="section-heading-icon" size={23}/>:null}/>) }
      </>}
      {!data&&!error&&<div className="home-loading-list section-shell"><div className="section-heading"><div><div className="section-title-wrap"><Flame className="section-heading-icon" size={23}/><h2>Trending movies</h2></div><p>The titles everybody is talking about</p></div></div><Skeletons count={6} layout="row"/></div>}
      <div className="discover-callout"><div><span className="eyebrow">DON'T KNOW WHAT TO WATCH?</span><h2>There’s a story for every mood.</h2><p>Explore genres, discover hidden gems, and save your next favorites in one place.</p><Link to="/discover" className="button button-primary">Explore the catalog <ArrowRight size={17}/></Link></div><div className="callout-orbits"><span/><span/><span><Play size={48} fill="currentColor"/></span></div></div>
    </div>
  </>;
}
