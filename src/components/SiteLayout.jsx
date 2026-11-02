import React,{useState,useEffect,useRef} from 'react';
import {Link,NavLink,useLocation} from 'react-router-dom';
import {Search,Heart,Film,Tv,Compass,House,Menu,X,ArrowUpRight,Play,Clapperboard} from 'lucide-react';
import {useStore} from '../lib/store';
import SmartSearch from './SmartSearch';

const links=[
  {to:'/',label:'Home',caption:'Featured stories',icon:House},
  {to:'/movies',label:'Movies',caption:'Explore the catalog',icon:Film},
  {to:'/series',label:'TV series',caption:'Stories worth staying for',icon:Tv},
  {to:'/discover',label:'Discover',caption:'Filter by your mood',icon:Compass},
  {to:'/watchlist',label:'My list',caption:'Saved for later',icon:Heart},
];

function SiteHeader(){
  const location=useLocation();const {saved}=useStore();
  const [searchOpen,setSearchOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[scrolled,setScrolled]=useState(false);
  const searchDialog=useRef(null),searchTrigger=useRef(null),menuTrigger=useRef(null);
  useEffect(()=>{const update=()=>setScrolled(window.scrollY>22);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[]);
  useEffect(()=>{setMenuOpen(false);setSearchOpen(false);},[location.pathname,location.search]);
  useEffect(()=>{document.body.classList.toggle('menu-is-open',menuOpen||searchOpen);return()=>document.body.classList.remove('menu-is-open');},[menuOpen,searchOpen]);
  useEffect(()=>{
    if(!searchOpen&&!menuOpen)return;
    const panel=searchOpen?searchDialog.current:document.getElementById('main-menu');
    const background=[...document.querySelectorAll('main,.site-footer,.mobile-bottom-nav')];
    background.forEach(element=>{element.inert=true;});
    if(menuOpen)panel.querySelector('a')?.focus();
    const keydown=event=>{
      if(event.key==='Escape'){setSearchOpen(false);setMenuOpen(false);(searchOpen?searchTrigger:menuTrigger).current?.focus();}
      if(event.key==='Tab'){
        const nodes=[...(menuOpen?[menuTrigger.current]:[]),...panel.querySelectorAll('button:not([disabled]):not([tabindex="-1"]),a,input,select')].filter(Boolean);
        const first=nodes[0],last=nodes[nodes.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    window.addEventListener('keydown',keydown);
    return()=>{background.forEach(element=>{element.inert=false;});window.removeEventListener('keydown',keydown);};
  },[searchOpen,menuOpen]);
  const closeSearch=()=>{setSearchOpen(false);searchTrigger.current?.focus();};
  return <>
    <header className={`site-header ${scrolled?'header-scrolled':''}`} id="top"><div className="header-inner">
      <Link to="/" className="brand" aria-label="Cinera home"><span className="brand-mark"><Play size={18} fill="currentColor"/></span><span className="brand-word">CINERA</span><span className="brand-service">by Hich web<br/>development</span></Link>
      <div className="header-center"><span className="live-dot"/> CINEMA · EVERYWHERE</div>
      <div className="header-actions">
        <button ref={searchTrigger} className="header-search-trigger" aria-label="Search the catalog" aria-expanded={searchOpen} aria-controls="catalog-search" onClick={()=>{setMenuOpen(false);setSearchOpen(value=>!value);}}>{searchOpen?<X size={21}/>:<Search size={21}/>}</button>
        <Link to="/discover" className="header-cta">Find a movie <ArrowUpRight size={17}/></Link>
        <button ref={menuTrigger} className="menu-toggle" onClick={()=>{setSearchOpen(false);setMenuOpen(value=>!value);}} aria-expanded={menuOpen} aria-controls="main-menu"><strong>{menuOpen?'CLOSE':'MENU'}</strong>{menuOpen?<X size={25}/>:<Menu size={25}/>}</button>
      </div>
    </div></header>
    {searchOpen&&<div className="search-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)closeSearch();}}><div ref={searchDialog} className="search-drawer" id="catalog-search" role="dialog" aria-modal="true" aria-labelledby="search-dialog-title"><div className="search-drawer-heading"><div id="search-dialog-title"><span className="live-dot"/> Find your next story</div><button className="search-cancel" onClick={closeSearch} aria-label="Close search"><X size={17}/><span>ESC</span></button></div><div className="search-drawer-inner"><SmartSearch variant="drawer" autoFocus/></div><p className="search-drawer-note">Movies, series, and something you haven’t discovered yet.</p></div></div>}
    <div className={`menu-panel ${menuOpen?'is-open':''}`} id="main-menu" aria-hidden={!menuOpen}><div className="menu-panel-inner"><div className="menu-panel-intro"><span>YOUR NEXT GREAT WATCH</span><h2>Pick a story.<br/><em>Feel everything.</em></h2><p>Search, save and continue across a catalog built for movie nights on every screen.</p></div><nav>{links.map(({to,label,caption,icon:Icon},index)=><NavLink key={to} to={to} end={to==='/' }><span className="menu-number">{String(index+1).padStart(2,'0')}</span><Icon size={22}/><span><strong>{label}</strong><small>{caption}</small></span><ArrowUpRight size={22}/></NavLink>)}</nav><div className="menu-panel-foot"><span>FULL TMDB CATALOG</span><span>{saved.length} SAVED TITLE{saved.length===1?'':'S'}</span></div></div></div>
  </>;
}

function Footer(){return <footer className="site-footer"><div className="footer-inner"><div className="footer-kicker"><span>WATCH BETTER</span><span>BUILT FOR EVERY SCREEN</span></div><div className="footer-statement"><h2>YOUR NEXT STORY<br/><em>STARTS HERE.</em></h2><Clapperboard size={80}/></div><div className="footer-links">{links.map(({to,label})=><Link key={to} to={to}>{label}</Link>)}</div><div className="footer-bottom"><span>© {new Date().getFullYear()} Cinera. Independent movie discovery.</span></div></div></footer>}

export default function SiteLayout({children}){
  const location=useLocation();
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[location.pathname,location.search]);
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader/><main id="main-content">{children}</main><Footer/><nav className="mobile-bottom-nav">{links.filter((_,index)=>index!==3).map(({to,label,icon:Icon})=><NavLink to={to} key={to} end={to==='/' }><Icon size={20}/><span>{label==='TV series'?'Series':label}</span></NavLink>)}</nav></div>;
}
