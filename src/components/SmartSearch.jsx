import React,{useEffect,useId,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowUpRight,Clock3,Film,LoaderCircle,Search,X,Zap} from 'lucide-react';
import {api,img} from '../lib/api';

const popular=['The Dark Knight','Dune','Breaking Bad','Stranger Things'];
const recentKey='cinera_recent_searches';
const readRecent=()=>{
  try{
    const stored=JSON.parse(localStorage.getItem(recentKey));
    return Array.isArray(stored)?[...new Set(stored.filter(item=>typeof item==='string').map(item=>item.trim()).filter(Boolean))].slice(0,4):[];
  }catch{return [];}
};

export default function SmartSearch({initialValue='',variant='page',autoFocus=false}){
  const navigate=useNavigate();
  const inputRef=useRef(null);
  const listId=useId();
  const [value,setValue]=useState(initialValue);
  const [result,setResult]=useState({query:'',items:[],status:'idle'});
  const [focused,setFocused]=useState(autoFocus);
  const [active,setActive]=useState(-1);
  const [recent,setRecent]=useState(readRecent);
  const query=value.trim();
  const isQuery=query.length>=2;
  const suggestions=result.query===query?result.items:[];
  const busy=isQuery&&(result.query!==query||result.status==='loading');
  const failed=isQuery&&result.query===query&&result.status==='error';
  const startItems=[...recent,...popular.filter(item=>!recent.some(saved=>saved.toLowerCase()===item.toLowerCase()))];
  const choices=isQuery?suggestions:startItems;
  const showPanel=focused;

  useEffect(()=>{setValue(initialValue);setActive(-1);},[initialValue]);
  useEffect(()=>{
    setActive(-1);
    if(!isQuery){setResult({query,items:[],status:'idle'});return;}
    const controller=new AbortController();
    let current=true;
    setResult({query,items:[],status:'loading'});
    const timer=setTimeout(async()=>{
      try{
        const data=await api(`/api/search?q=${encodeURIComponent(query)}&page=1`,controller.signal);
        const items=Array.isArray(data.results)?data.results.filter(item=>item&&typeof item.title==='string'&&item.id&&(item.kind==='tv'||item.kind==='movie')).slice(0,5):[];
        if(current)setResult({query,items,status:'ready'});
      }catch(error){
        if(current&&error.name!=='AbortError')setResult({query,items:[],status:'error'});
      }
    },260);
    return()=>{current=false;clearTimeout(timer);controller.abort();};
  },[query,isQuery]);

  useEffect(()=>{
    if(showPanel&&active>=0)document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({block:'nearest'});
  },[active,showPanel,listId]);

  const remember=term=>{
    const next=[term,...recent.filter(item=>item.toLowerCase()!==term.toLowerCase())].slice(0,4);
    setRecent(next);
    try{localStorage.setItem(recentKey,JSON.stringify(next));}catch{}
  };
  const close=()=>{setFocused(false);setActive(-1);};
  const search=term=>{
    const clean=term.trim();
    if(!clean){inputRef.current?.focus();return;}
    remember(clean);close();navigate(`/search?q=${encodeURIComponent(clean)}`);
  };
  const choose=item=>{
    if(typeof item==='string'){setValue(item);search(item);return;}
    remember(item.title);close();navigate(`/title/${item.kind}/${item.id}`);
  };
  const onKeyDown=event=>{
    if(event.isComposing||event.nativeEvent.isComposing)return;
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&choices.length){
      event.preventDefault();setFocused(true);
      setActive(index=>event.key==='ArrowDown'?(index+1)%choices.length:(index<=0?choices.length-1:index-1));
    }else if(event.key==='Enter'&&showPanel&&active>=0&&choices[active]){
      event.preventDefault();choose(choices[active]);
    }else if(event.key==='Escape'){
      close();inputRef.current?.blur();
    }
  };
  const optionProps=index=>({
    id:`${listId}-option-${index}`,
    role:'option',
    'aria-selected':active===index,
    tabIndex:-1,
    onMouseDown:event=>event.preventDefault(),
    onMouseEnter:()=>setActive(index),
  });

  return <div className={`smart-search smart-search-${variant}`} onFocus={()=>setFocused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))close();}}>
    <form className="smart-search-form" role="search" onSubmit={event=>{event.preventDefault();search(value);}}>
      <Search size={20} aria-hidden="true"/>
      <input ref={inputRef} autoFocus={autoFocus} value={value} onChange={event=>{setValue(event.target.value);setActive(-1);setFocused(true);}} onKeyDown={onKeyDown} placeholder="Movies, series & more…" aria-label="Search movies and TV series" role="combobox" aria-expanded={showPanel} aria-controls={showPanel?listId:undefined} aria-activedescendant={showPanel&&active>=0&&choices[active]?`${listId}-option-${active}`:undefined} aria-autocomplete="list" autoComplete="off" spellCheck="false" enterKeyHint="search"/>
      {busy&&<LoaderCircle className="search-spinner" size={17} aria-hidden="true"/>}
      {value&&<button type="button" className="search-clear" onClick={()=>{setValue('');setActive(-1);inputRef.current?.focus();}} aria-label="Clear search"><X size={17}/></button>}
      <button type="submit" className="smart-search-submit">Search <ArrowUpRight size={16} aria-hidden="true"/></button>
    </form>
    {showPanel&&<div className="search-suggestion-panel">
      {isQuery&&<div className="search-suggestion-heading">{busy?'Searching the catalog…':failed?'Search unavailable':'Quick results'}<span>↵ to select</span></div>}
      <div id={listId} role="listbox" aria-label={isQuery?'Matching titles':'Search suggestions'} aria-busy={busy}>
        {isQuery?suggestions.map((item,index)=><button type="button" {...optionProps(index)} className={`suggestion-item ${active===index?'active':''}`} key={`${item.kind}-${item.id}`} onClick={()=>choose(item)}>
          <span className="suggestion-art">{item.poster?<img src={img(item.poster,'w92')} alt=""/>:<Film size={19} aria-hidden="true"/>}</span>
          <span><strong>{item.title}</strong><small>{item.year||'TBA'} · {item.kind==='tv'?'TV series':'Movie'}{item.rating?` · ${Number(item.rating).toFixed(1)}`:''}</small></span>
          <ArrowUpRight size={16} aria-hidden="true"/>
        </button>):<div className="search-start" role="presentation">
          {recent.length>0&&<div role="group" aria-label="Recent searches"><span><Clock3 size={13} aria-hidden="true"/> RECENT</span>{recent.map((term,index)=><button type="button" {...optionProps(index)} className={active===index?'active':''} key={term} onClick={()=>choose(term)}>{term}<ArrowUpRight size={13} aria-hidden="true"/></button>)}</div>}
          <div role="group" aria-label="Popular searches"><span><Zap size={13} aria-hidden="true"/> POPULAR SEARCHES</span>{startItems.slice(recent.length).map((term,index)=><button type="button" {...optionProps(index+recent.length)} className={active===index+recent.length?'active':''} key={term} onClick={()=>choose(term)}>{term}<ArrowUpRight size={13} aria-hidden="true"/></button>)}</div>
        </div>}
      </div>
      {isQuery&&!suggestions.length&&<div className="suggestion-status" role="status">{busy?<><LoaderCircle className="search-spinner" size={16} aria-hidden="true"/> Finding your next watch…</>:failed?'Suggestions could not load. Try Search for full results.':'No matching titles. Try a different name.'}</div>}
      {isQuery&&!busy&&suggestions.length>0&&<button type="button" className="search-suggestion-footer" onMouseDown={event=>event.preventDefault()} onClick={()=>search(value)}>View all results <ArrowUpRight size={15} aria-hidden="true"/></button>}
    </div>}
  </div>;
}
