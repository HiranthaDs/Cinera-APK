import React,{useState,useEffect,useCallback,useMemo,useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
import {SlidersHorizontal,ChevronLeft,ChevronRight,ChevronDown,Film,Tv,X} from 'lucide-react';
import {api} from '../lib/api';
import {Card,Skeletons,ErrorPanel,EmptyState} from '../components/UI';
import AdvancedFilters from '../components/AdvancedFilters';

const periodLabels={'2020s':'2020s','2010s':'2010s','2000s':'2000s','1990s':'1990s',classic:'Before 1990'};

export default function Browse({fixedKind}) {
  const [params,setParams]=useSearchParams();
  const [type,setType]=useState(fixedKind||params.get('type')||'movie');
  const [genres,setGenres]=useState([]);
  const [data,setData]=useState(null),[error,setError]=useState('');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const filterTrigger=useRef(null);
  const kind=fixedKind||type;
  const genre=params.get('genre')||'',year=params.get('year')||'',period=params.get('period')||'',rating=params.get('rating')||'',page=Number(params.get('page')||1);
  const requestedSort=params.get('sort')||'popularity.desc';
  const sort=requestedSort==='primary_release_date.desc'&&kind==='tv'?'first_air_date.desc':requestedSort==='first_air_date.desc'&&kind==='movie'?'primary_release_date.desc':requestedSort;
  useEffect(()=>{setType(fixedKind||'movie');},[fixedKind]);
  useEffect(()=>{let ignore=false;api(`/api/genres/${kind}`).then(data=>!ignore&&setGenres(data.genres||[])).catch(()=>setGenres([]));return()=>{ignore=true;};},[kind]);
  const change=(key,val)=>{const p=new URLSearchParams(params);if(val)p.set(key,val);else p.delete(key);if(key!=='page')p.delete('page');setParams(p);};
  useEffect(()=>{const controller=new AbortController();setData(null);setError('');const p=new URLSearchParams({page:String(page),sort});if(genre)p.set('genre',genre);if(year)p.set('year',year);if(period)p.set('period',period);if(rating)p.set('rating',rating);api(`/api/browse/${kind}?${p.toString()}`,controller.signal).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[kind,page,genre,year,period,rating,sort]);
  const changeType=t=>{setType(t);setParams({});};
  const closeFilters=useCallback(()=>setFiltersOpen(false),[]);
  const filterValues=useMemo(()=>({genre,year,period,rating,sort}),[genre,year,period,rating,sort]);
  const applyFilters=next=>{
    const updated=new URLSearchParams();
    for(const key of ['genre','year','period','rating'])if(next[key])updated.set(key,next[key]);
    if(next.sort&&next.sort!=='popularity.desc')updated.set('sort',next.sort);
    setParams(updated);
    setFiltersOpen(false);
  };
  const resetFilters=()=>{setParams({});setFiltersOpen(false);};
  const removeFilter=key=>{
    const updated=new URLSearchParams(params);
    if(key==='release'){updated.delete('year');updated.delete('period');}
    else updated.delete(key);
    updated.delete('page');
    setParams(updated);
  };
  const activeFilters=useMemo(()=>{
    const items=[];
    const genreName=genres.find(entry=>String(entry.id)===genre)?.name;
    if(genre)items.push({key:'genre',label:genreName||'Selected genre'});
    if(year||period)items.push({key:'release',label:year||periodLabels[period]||'Release period'});
    if(rating)items.push({key:'rating',label:`Rated ${rating}.0+`});
    if(sort!=='popularity.desc')items.push({key:'sort',label:sort==='vote_average.desc'?'Top rated':'Newest first'});
    return items;
  },[genre,year,period,rating,sort,genres]);
  return <div className="content-width catalog-page">
    <div className="catalog-heading"><div className="eyebrow">THE ENTIRE UNIVERSE OF STORIES</div><h1>{fixedKind==='movie'?'Explore movies':fixedKind==='tv'?'TV series':'Discover something great'}<span>.</span></h1><p>Find your next favorite. Sort, filter and explore stories worth watching.</p></div>
    {!fixedKind&&<div className="browse-tabs"><button className={kind==='movie'?'active':''} onClick={()=>changeType('movie')}><Film size={17}/> Movies</button><button className={kind==='tv'?'active':''} onClick={()=>changeType('tv')}><Tv size={17}/> TV Series</button></div>}
    <div className={`advanced-filter-bar ${activeFilters.length?'has-active-filters':''}`}><button ref={filterTrigger} type="button" className="filter-trigger" aria-expanded={filtersOpen} aria-controls="advanced-filter-sheet" onClick={()=>setFiltersOpen(true)}><span className="filter-trigger-icon"><SlidersHorizontal/></span><span><small>REFINE RESULTS</small><strong>{activeFilters.length?`${activeFilters.length} filter${activeFilters.length===1?'':'s'} active`:'Genre, release, rating and sort'}</strong></span>{activeFilters.length>0&&<b>{activeFilters.length}</b>}<ChevronDown className="filter-trigger-chevron"/></button>{activeFilters.length>0&&<div className="active-filter-list" aria-label="Active filters">{activeFilters.map(filter=><span key={filter.key}>{filter.label}<button type="button" onClick={()=>removeFilter(filter.key)} aria-label={`Remove ${filter.label} filter`}><X/></button></span>)}<button type="button" className="clear-active-filters" onClick={resetFilters}>Clear all</button></div>}</div>
    <AdvancedFilters open={filtersOpen} onClose={closeFilters} genres={genres} kind={kind} values={filterValues} onApply={applyFilters} onReset={resetFilters} triggerRef={filterTrigger}/>
    <div className="result-heading"><h2>{kind==='tv'?'TV shows':'Movies'} <span>{data?.results?.length?`· ${data.results.length} results on page ${data.page}`:''}</span></h2>{data?.demo&&<span className="demo-pill">Sample catalog</span>}</div>
    {error&&<ErrorPanel message={error}/>}
    {!data&&!error&&<Skeletons count={18}/>}
    {data&&(!data.results?.length?<EmptyState title="No titles found" description="Try broadening your filters or selecting a different genre."/>:<div className="catalog-grid">{data.results.map(item=><Card item={item} key={`${item.kind}-${item.id}`}/>)}</div>)}
    {data?.totalPages>1&&<div className="pagination"><button disabled={page<=1} onClick={()=>change('page',String(page-1))}><ChevronLeft size={17}/> Previous</button><span>Page <b>{page}</b> of {data.totalPages}</span><button disabled={page>=data.totalPages} onClick={()=>change('page',String(page+1))}>Next <ChevronRight size={17}/></button></div>}
  </div>;
}
