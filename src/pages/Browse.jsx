import React,{useState,useEffect,useCallback} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {SlidersHorizontal,ChevronLeft,ChevronRight,Film,Tv,Compass,X} from 'lucide-react';
import {api} from '../lib/api';
import {Card,Skeletons,ErrorPanel,EmptyState} from '../components/UI';
export default function Browse({fixedKind}) {
  const [params,setParams]=useSearchParams();
  const [type,setType]=useState(fixedKind||params.get('type')||'movie');
  const [genres,setGenres]=useState([]);
  const [data,setData]=useState(null),[error,setError]=useState('');
  const kind=fixedKind||type;
  const genre=params.get('genre')||'',year=params.get('year')||'',sort=params.get('sort')||'popularity.desc',page=Number(params.get('page')||1);
  useEffect(()=>{setType(fixedKind||'movie');},[fixedKind]);
  useEffect(()=>{let ignore=false;api(`/api/genres/${kind}`).then(data=>!ignore&&setGenres(data.genres||[])).catch(()=>setGenres([]));return()=>{ignore=true;};},[kind]);
  const change=(key,val)=>{const p=new URLSearchParams(params);if(val)p.set(key,val);else p.delete(key);if(key!=='page')p.delete('page');setParams(p);};
  useEffect(()=>{const controller=new AbortController();setData(null);setError('');const p=new URLSearchParams({page:String(page),sort});if(genre)p.set('genre',genre);if(year)p.set('year',year);api(`/api/browse/${kind}?${p.toString()}`,controller.signal).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[kind,page,genre,year,sort]);
  const changeType=t=>{setType(t);setParams({});};
  return <div className="content-width catalog-page">
    <div className="catalog-heading"><div className="eyebrow">THE ENTIRE UNIVERSE OF STORIES</div><h1>{fixedKind==='movie'?'Explore movies':fixedKind==='tv'?'TV series':'Discover something great'}<span>.</span></h1><p>Find your next favorite. Sort, filter and explore stories worth watching.</p></div>
    {!fixedKind&&<div className="browse-tabs"><button className={kind==='movie'?'active':''} onClick={()=>changeType('movie')}><Film size={17}/> Movies</button><button className={kind==='tv'?'active':''} onClick={()=>changeType('tv')}><Tv size={17}/> TV Series</button></div>}
    <div className="filters"><div className="filter-caption"><SlidersHorizontal size={17}/> FILTER BY</div><select aria-label="Genre" value={genre} onChange={e=>change('genre',e.target.value)}><option value="">All genres</option>{genres.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select><select aria-label="Release year" value={year} onChange={e=>change('year',e.target.value)}><option value="">Any year</option>{Array.from({length:28},(_,i)=>new Date().getFullYear()+1-i).map(y=><option key={y} value={y}>{y}</option>)}</select><select aria-label="Sort results" className="sort-select" value={sort} onChange={e=>change('sort',e.target.value)}><option value="popularity.desc">Most popular</option><option value="vote_average.desc">Top rated</option><option value={kind==='tv'?'first_air_date.desc':'primary_release_date.desc'}>Newest first</option></select>{(genre||year||sort!=='popularity.desc')&&<button className="reset-filters" onClick={()=>setParams({})}><X size={15}/> Reset</button>}</div>
    <div className="result-heading"><h2>{kind==='tv'?'TV shows':'Movies'} <span>{data?.results?.length?`· ${data.results.length} results on page ${data.page}`:''}</span></h2>{data?.demo&&<span className="demo-pill">Sample catalog</span>}</div>
    {error&&<ErrorPanel message={error}/>}
    {!data&&!error&&<Skeletons count={18}/>}
    {data&&(!data.results?.length?<EmptyState title="No titles found" description="Try broadening your filters or selecting a different genre."/>:<div className="catalog-grid">{data.results.map(item=><Card item={item} key={`${item.kind}-${item.id}`}/>)}</div>)}
    {data?.totalPages>1&&<div className="pagination"><button disabled={page<=1} onClick={()=>change('page',String(page-1))}><ChevronLeft size={17}/> Previous</button><span>Page <b>{page}</b> of {data.totalPages}</span><button disabled={page>=data.totalPages} onClick={()=>change('page',String(page+1))}>Next <ChevronRight size={17}/></button></div>}
  </div>;
}
