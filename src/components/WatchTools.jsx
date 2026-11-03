import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Check,Clock3,Gamepad2,Gauge,Keyboard,PictureInPicture,RotateCcw,Share2,SkipForward,X} from 'lucide-react';

export default function WatchTools({item,sourceType,dataSaver,onDataSaver,autoNext,onAutoNext,canAutoNext,onRestart}){
  const [sleepMinutes,setSleepMinutes]=useState(0),[shortcutsOpen,setShortcutsOpen]=useState(false),[shared,setShared]=useState(false);
  const directPlayer=sourceType==='video'||sourceType==='hls';
  useEffect(()=>{
    if(!sleepMinutes)return;
    const timer=setTimeout(()=>{window.dispatchEvent(new CustomEvent('cinera:remote-command',{detail:{action:'pause'}}));setSleepMinutes(0);},sleepMinutes*60*1000);
    return()=>clearTimeout(timer);
  },[sleepMinutes]);
  useEffect(()=>{
    const keydown=event=>{if(event.key==='?'&&!event.ctrlKey&&!event.metaKey&&!event.altKey)setShortcutsOpen(true);if(event.key==='Escape')setShortcutsOpen(false);};
    window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);
  },[]);
  const share=async()=>{
    const data={title:item?.title?`${item.title} on Cinera`:'Watch on Cinera',text:item?.title?`Watch ${item.title} on Cinera.`:'Watch this on Cinera.',url:window.location.href};
    try{if(navigator.share)await navigator.share(data);else await navigator.clipboard.writeText(data.url);setShared(true);setTimeout(()=>setShared(false),1800);}catch{}
  };
  const pip=()=>window.dispatchEvent(new CustomEvent('cinera:remote-command',{detail:{action:'pip'}}));
  return <>
    <section className="watch-tools" aria-label="Playback tools">
      <div className="watch-tools-heading"><span>QUICK TOOLS</span><strong>Make movie night yours</strong></div>
      <div className="watch-tools-grid">
        <Link to="/pair"><Gamepad2/><span><strong>Phone remote</strong><small>Scan to control the TV</small></span></Link>
        <label className={sleepMinutes?'is-active':''}><Clock3/><span><strong>Sleep timer</strong><small>{!directPlayer?'Direct video only':sleepMinutes?`${sleepMinutes} minutes`:'Turn off later'}</small></span><select aria-label="Set sleep timer" disabled={!directPlayer} value={sleepMinutes} onChange={event=>setSleepMinutes(Number(event.target.value))}><option value="0">Off</option><option value="15">15m</option><option value="30">30m</option><option value="45">45m</option><option value="60">60m</option></select></label>
        <button type="button" onClick={pip} disabled={!directPlayer}><PictureInPicture/><span><strong>Picture-in-Picture</strong><small>{!directPlayer?'Direct video only':'Keep watching anywhere'}</small></span></button>
        <button type="button" className={dataSaver?'is-active':''} aria-pressed={dataSaver} onClick={()=>onDataSaver(!dataSaver)}><Gauge/><span><strong>Data Saver</strong><small>{dataSaver?'Lower bandwidth on':'Adaptive quality'}</small></span>{dataSaver&&<Check/>}</button>
        <button type="button" className={autoNext?'is-active':''} aria-pressed={autoNext} disabled={!canAutoNext} onClick={()=>onAutoNext(!autoNext)}><SkipForward/><span><strong>Autoplay next</strong><small>{canAutoNext?(autoNext?'Enabled':'Disabled'):'Series only'}</small></span>{autoNext&&canAutoNext&&<Check/>}</button>
        <button type="button" onClick={onRestart}><RotateCcw/><span><strong>Start over</strong><small>Restart from 00:00</small></span></button>
        <button type="button" onClick={share}><Share2/><span><strong>{shared?'Link copied':'Share title'}</strong><small>Send this watch link</small></span></button>
        <button type="button" onClick={()=>setShortcutsOpen(true)}><Keyboard/><span><strong>Shortcuts</strong><small>Remote and keyboard guide</small></span></button>
      </div>
    </section>
    {shortcutsOpen&&<div className="shortcut-overlay" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onMouseDown={event=>event.target===event.currentTarget&&setShortcutsOpen(false)}><div className="shortcut-dialog"><button className="shortcut-close" onClick={()=>setShortcutsOpen(false)} aria-label="Close shortcuts"><X/></button><span>CONTROL CINERA FASTER</span><h2 id="shortcut-title">Keyboard & remote shortcuts</h2><div className="shortcut-grid"><div><kbd>Enter</kbd><p>Play, pause, or select</p></div><div><kbd>←</kbd><p>Seek back 10 seconds</p></div><div><kbd>→</kbd><p>Seek forward 10 seconds</p></div><div><kbd>↑ / ↓</kbd><p>Volume or navigation</p></div><div><kbd>M</kbd><p>Mute or unmute</p></div><div><kbd>F</kbd><p>Toggle fullscreen</p></div><div><kbd>?</kbd><p>Open this guide</p></div><div><kbd>Esc</kbd><p>Close dialogs</p></div></div></div></div>}
  </>;
}
