import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Play,Plus,Check,Star,Clapperboard,AlertCircle,RefreshCcw,Asterisk} from 'lucide-react';
import {img,rating,prettyRuntime} from '../lib/api';
import {useStore} from '../lib/store';

export function Poster({item,mode='poster',className='',priority=false}){
  const path=mode==='backdrop'?(item.backdrop||item.poster):(item.poster||item.backdrop);
  const src=img(path,mode==='backdrop'?'w1280':'w500');
  const srcSet=path?(mode==='backdrop'?`${img(path,'w780')} 780w, ${img(path,'w1280')} 1280w, ${img(path,'original')} 1920w`:`${img(path,'w342')} 342w, ${img(path,'w500')} 500w, ${img(path,'w780')} 780w`):undefined;
  return <div className={`poster-frame ${className}`}>
    {src?<img src={src} srcSet={srcSet} sizes={mode==='backdrop'?'(max-width: 760px) 100vw, 50vw':'(max-width: 760px) 34vw, 15vw'} alt={item.title||'Film poster'} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" onError={event=>{event.currentTarget.style.display='none';event.currentTarget.parentElement.classList.add('poster-missing');}}/>:null}
    <div className="poster-placeholder"><Clapperboard size={28}/><span>{item.title}</span></div>
  </div>;
}

export function Rating({value}){return <span className="rating"><Star size={12} fill="currentColor"/>{rating(value)}</span>;}

export function Card({item,wide=false}){
  const {isSaved,toggleSaved,getProgress}=useStore();
  if(!item)return null;
  const saved=isSaved(item);
  const progress=getProgress(item,item.season||1,item.episode||1);
  const progressPercent=progress?.duration>0?Math.min(100,Math.max(2,(progress.seconds/progress.duration)*100)):0;
  return <article className={`movie-card ${wide?'wide-card':''}`}>
    <Link className="card-image-link" to={`/title/${item.kind}/${item.id}`} aria-label={`View ${item.title}`}>
      <Poster item={item} mode={wide?'backdrop':'poster'}/>
      <span className="quality-tag">{item.kind==='tv'?'SERIES':'FILM'}</span>
      <span className="card-play"><Play size={22} fill="currentColor"/></span>
      {progressPercent>0&&<span className="card-progress" aria-label={`${Math.round(progressPercent)} percent watched`}><i style={{width:`${progressPercent}%`}}/></span>}
    </Link>
    <button className={`card-save ${saved?'is-saved':''}`} onClick={()=>toggleSaved(item)} aria-label={saved?'Remove from watchlist':'Add to watchlist'} title={saved?'Remove from watchlist':'Add to watchlist'}>{saved?<Check size={15}/>:<Plus size={16}/>}</button>
    <Link to={`/title/${item.kind}/${item.id}`} className="card-title" title={item.title}>{item.title}</Link>
    <div className="card-meta"><span>{item.year||'—'}</span><span className="dot">·</span><span>{item.kind==='tv'?'TV Series':'Movie'}</span><span className="card-rating"><Star size={11} fill="currentColor"/>{rating(item.rating)}</span></div>
  </article>;
}

export function Section({title,sub,items=[],to,icon}){
  if(!items.length)return null;
  return <section className="section-shell"><div className="section-heading"><div><div className="section-title-wrap">{icon||<span className="section-title-marker"/>}<h2>{title}</h2></div>{sub?<p>{sub}</p>:null}</div>{to&&<Link className="view-all" to={to}>View all <ArrowRight size={16}/></Link>}</div><div className="card-scroller">{items.map(item=><Card item={item} key={`${item.kind}-${item.id}`}/>)}</div></section>;
}

export function Skeletons({count=12,layout='grid'}){
  return <div className="loading-catalog" role="status" aria-busy="true">
    <span className="sr-only">Loading titles…</span>
    <div className={layout==='row'?'card-scroller skeleton-row':'skeleton-grid'} aria-hidden="true">
      {Array.from({length:count},(_,index)=><div key={index} className="movie-card skeleton-item">
        <div className="skeleton skeleton-poster"><span className="skeleton-tag"/><span className="skeleton-save"/><Clapperboard className="skeleton-poster-mark" size={30}/></div>
        <div className="skeleton skeleton-line skeleton-title"/>
        <div className="skeleton-meta"><span className="skeleton skeleton-small"/><span className="skeleton skeleton-rating"/></div>
      </div>)}
    </div>
  </div>;
}

export function HeroSkeleton(){
  return <section className="hero hero-loading" role="status" aria-busy="true">
    <span className="sr-only">Loading your featured story…</span>
    <div className="hero-inner content-width" aria-hidden="true">
      <div className="hero-movie-content hero-skeleton-content">
        <div className="hero-storyline"><span>STORIES FOR NIGHTS THAT</span><em>FEEL BIG.</em><Asterisk/></div>
        <div className="skeleton hero-skeleton-eyebrow"/>
        <div className="hero-skeleton-title"><span className="skeleton"/><span className="skeleton"/></div>
        <div className="hero-skeleton-meta"><span className="skeleton"/><span className="skeleton"/><span className="skeleton"/></div>
        <div className="hero-skeleton-description"><span className="skeleton"/><span className="skeleton"/><span className="skeleton"/></div>
        <div className="hero-buttons hero-skeleton-actions"><span className="skeleton"/><span className="skeleton"/></div>
      </div>
      <div className="hero-card-stack skeleton hero-skeleton-art"><Clapperboard size={62}/><div className="hero-skeleton-controls"><span/><span/><span/></div></div>
    </div>
  </section>;
}
export function ErrorPanel({message,onRetry}){return <div className="error-panel"><AlertCircle size={26}/><h3>Something went wrong</h3><p>{message||'Could not load this content.'}</p>{onRetry&&<button className="button button-secondary" onClick={onRetry}><RefreshCcw size={16}/> Try again</button>}</div>;}
export function EmptyState({title='Nothing here yet',description='Try something different.',icon}){return <div className="empty-state">{icon||<Clapperboard size={34}/>}<h3>{title}</h3><p>{description}</p><Link to="/discover" className="button button-primary">Explore titles <ArrowRight size={16}/></Link></div>;}
export function FormatPill({item}){return <span className="format-pill">{item.kind==='tv'?'SERIES':'MOVIE'}</span>;}
export function MetaLine({item,includeRuntime=false}){return <div className="meta-line"><Rating value={item.rating}/><span>{item.year||'TBA'}</span><span className="meta-dot"/><span>{item.kind==='tv'?'TV Series':'Movie'}</span>{includeRuntime&&item.runtime&&<><span className="meta-dot"/><span>{prettyRuntime(item.runtime)}</span></>}<span className="hd-badge">CATALOG</span></div>;}
