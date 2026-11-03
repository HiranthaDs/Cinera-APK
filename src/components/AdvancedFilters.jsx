import React,{useEffect,useMemo,useRef,useState} from 'react';
import {CalendarDays,Check,SlidersHorizontal,Sparkles,Star,TrendingUp,X} from 'lucide-react';

const periods=[
  {value:'2020s',label:'2020s'},
  {value:'2010s',label:'2010s'},
  {value:'2000s',label:'2000s'},
  {value:'1990s',label:'1990s'},
  {value:'classic',label:'Before 1990'},
];
const ratings=[
  {value:'',label:'Any rating',detail:'Everything'},
  {value:'6',label:'6.0+',detail:'Worth a look'},
  {value:'7',label:'7.0+',detail:'Audience picks'},
  {value:'8',label:'8.0+',detail:'Exceptional'},
];

export default function AdvancedFilters({open,onClose,genres,kind,values,onApply,onReset,triggerRef}){
  const [draft,setDraft]=useState(values);
  const panelRef=useRef(null);
  const years=useMemo(()=>Array.from({length:5},(_,index)=>String(new Date().getFullYear()-index)),[]);
  const sorts=[
    {value:'popularity.desc',label:'Most popular',detail:'What everyone is watching',icon:TrendingUp},
    {value:'vote_average.desc',label:'Top rated',detail:'Highest audience scores',icon:Star},
    {value:kind==='tv'?'first_air_date.desc':'primary_release_date.desc',label:'Newest first',detail:'Fresh releases up front',icon:Sparkles},
  ];

  useEffect(()=>{if(open)setDraft(values);},[open,values.genre,values.year,values.period,values.rating,values.sort]);
  useEffect(()=>{
    if(!open)return;
    document.body.classList.add('filter-is-open');
    const panel=panelRef.current;
    requestAnimationFrame(()=>panel?.querySelector('button')?.focus());
    const keydown=event=>{
      if(event.key==='Escape'){event.preventDefault();onClose();return;}
      if(event.key!=='Tab')return;
      const focusable=[...panel.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')];
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    window.addEventListener('keydown',keydown);
    return()=>{document.body.classList.remove('filter-is-open');window.removeEventListener('keydown',keydown);triggerRef.current?.focus();};
  },[open,onClose,triggerRef]);

  if(!open)return null;
  const chooseRelease=(year='',period='')=>setDraft(current=>({...current,year,period}));
  const submit=event=>{event.preventDefault();onApply(draft);};
  const clear=()=>{
    const empty={genre:'',year:'',period:'',rating:'',sort:'popularity.desc'};
    setDraft(empty);
    onReset();
  };

  return <div className="filter-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <form ref={panelRef} className="filter-sheet" id="advanced-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title" onSubmit={submit}>
      <div className="filter-sheet-header"><div className="filter-sheet-mark"><SlidersHorizontal/></div><div><span>BUILD YOUR VIEW</span><h2 id="filter-title">Refine the catalog</h2><p>Choose what matters. Results update when you apply.</p></div><button type="button" className="filter-close" onClick={onClose} aria-label="Close filters"><X/></button></div>
      <div className="filter-sheet-body">
        <fieldset className="filter-group filter-genres"><legend><span>01</span><div><strong>Genre</strong><small>Pick the mood</small></div></legend><div className="filter-choice-grid genre-choice-grid"><button type="button" className={!draft.genre?'selected':''} aria-pressed={!draft.genre} onClick={()=>setDraft(current=>({...current,genre:''}))}>All genres{!draft.genre&&<Check/>}</button>{genres.map(entry=><button type="button" key={entry.id} className={draft.genre===String(entry.id)?'selected':''} aria-pressed={draft.genre===String(entry.id)} onClick={()=>setDraft(current=>({...current,genre:String(entry.id)}))}>{entry.name}{draft.genre===String(entry.id)&&<Check/>}</button>)}</div></fieldset>
        <fieldset className="filter-group"><legend><span>02</span><div><strong>Release</strong><small>Choose a year or era</small></div></legend><div className="release-choices"><button type="button" className={!draft.year&&!draft.period?'selected':''} aria-pressed={!draft.year&&!draft.period} onClick={()=>chooseRelease()}>Any time</button>{years.map(year=><button type="button" key={year} className={draft.year===year?'selected':''} aria-pressed={draft.year===year} onClick={()=>chooseRelease(year,'')}>{year}</button>)}{periods.map(period=><button type="button" key={period.value} className={draft.period===period.value?'selected':''} aria-pressed={draft.period===period.value} onClick={()=>chooseRelease('',period.value)}>{period.label}</button>)}</div></fieldset>
        <fieldset className="filter-group"><legend><span>03</span><div><strong>Minimum rating</strong><small>Set your quality bar</small></div></legend><div className="rating-choices">{ratings.map(entry=><button type="button" key={entry.value||'all'} className={draft.rating===entry.value?'selected':''} aria-pressed={draft.rating===entry.value} onClick={()=>setDraft(current=>({...current,rating:entry.value}))}><Star fill={entry.value?'currentColor':'none'}/><span><strong>{entry.label}</strong><small>{entry.detail}</small></span>{draft.rating===entry.value&&<Check className="choice-check"/>}</button>)}</div></fieldset>
        <fieldset className="filter-group"><legend><span>04</span><div><strong>Sort results</strong><small>Decide what leads</small></div></legend><div className="sort-choices">{sorts.map(entry=>{const Icon=entry.icon;return <button type="button" key={entry.value} className={draft.sort===entry.value?'selected':''} aria-pressed={draft.sort===entry.value} onClick={()=>setDraft(current=>({...current,sort:entry.value}))}><Icon/><span><strong>{entry.label}</strong><small>{entry.detail}</small></span>{draft.sort===entry.value&&<Check className="choice-check"/>}</button>;})}</div></fieldset>
      </div>
      <div className="filter-sheet-footer"><button type="button" className="filter-clear" onClick={clear}>Clear all</button><button type="submit" className="filter-apply"><CalendarDays/> Apply filters</button></div>
    </form>
  </div>;
}
