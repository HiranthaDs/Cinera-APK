import React,{useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {ChevronLeft,ChevronRight,Film,SlidersHorizontal,Tv} from 'lucide-react';
import {api} from '../lib/api';
import {Card,Skeletons,EmptyState,ErrorPanel} from '../components/UI';
import SmartSearch from '../components/SmartSearch';

export default function Search(){
  const [params,setParams]=useSearchParams();
  const q=params.get('q')?.trim()||'',page=Number(params.get('page')||1);
  const [data,setData]=useState(null),[error,setError]=useState(''),[type,setType]=useState('all'),[sort,setSort]=useState('relevance');
  useEffect(()=>{const controller=new AbortController();setData(null);setError('');if(!q)return;api(`/api/search?q=${encodeURIComponent(q)}&page=${page}`,controller.signal).then(setData).catch(errorValue=>{if(errorValue.name!=='AbortError')setError(errorValue.message);});return()=>controller.abort();},[q,page]);
  const results=useMemo(()=>{
    const filtered=(data?.results||[]).filter(item=>type==='all'||item.kind===type);
    if(sort==='rating')return [...filtered].sort((a,b)=>(b.rating||0)-(a.rating||0));
    if(sort==='newest')return [...filtered].sort((a,b)=>(b.year||0)-(a.year||0));
    return filtered;
  },[data,type,sort]);
  const changePage=next=>{const updated=new URLSearchParams(params);updated.set('page',String(next));setParams(updated);};
  return <div className="content-width catalog-page search-page">
    <div className="catalog-heading"><div className="eyebrow">FIND YOUR NEXT FAVORITE</div><h1>Search the universe<span>.</span></h1><p>Live suggestions, recent searches and thousands of titles in one fast search.</p></div>
    <SmartSearch initialValue={q} variant="page" autoFocus={!q}/>
    {q&&<div className="search-refiners"><div className="search-type-tabs"><button className={type==='all'?'active':''} onClick={()=>setType('all')}><SlidersHorizontal size={15}/> All</button><button className={type==='movie'?'active':''} onClick={()=>setType('movie')}><Film size={15}/> Movies</button><button className={type==='tv'?'active':''} onClick={()=>setType('tv')}><Tv size={15}/> TV series</button></div><label>Sort <select value={sort} onChange={event=>setSort(event.target.value)}><option value="relevance">Best match</option><option value="rating">Highest rated</option><option value="newest">Newest first</option></select></label></div>}
    {!q?<div className="search-empty-intro"><span>START ANYWHERE</span><h2>A title. A memory.<br/>A new obsession.</h2><p>Search above, or open the suggestions to revisit recent searches and popular picks.</p></div>:<><div className="result-heading"><h2>Results for <span className="search-term">“{q}”</span></h2><span>{results.length} matching title{results.length===1?'':'s'} on this page</span></div>
    {error?<ErrorPanel message={error}/>:!data?<Skeletons count={12}/>:!results.length?<EmptyState title="No matching titles" description="Try All titles, check the spelling, or use a shorter search."/>:<div className="catalog-grid">{results.map(item=><Card key={`${item.kind}-${item.id}`} item={item}/>)}</div>}
    {data?.totalPages>1&&<div className="pagination"><button disabled={page<=1} onClick={()=>changePage(page-1)}><ChevronLeft size={17}/> Previous</button><span>Page {page} of {data.totalPages}</span><button disabled={page>=data.totalPages} onClick={()=>changePage(page+1)}>Next <ChevronRight size={17}/></button></div>}
    </>}
  </div>;
}
