import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import QRCode from 'qrcode';
import {ArrowLeft,CheckCircle2,Copy,Gamepad2,RefreshCcw,Smartphone,Wifi} from 'lucide-react';
import {useRemote} from '../lib/remote';

export default function PairRemote(){
  const {pair,pairingUrl,status,remoteConnected,startPairing,stopPairing}=useRemote();
  const [qr,setQr]=useState(''),[copied,setCopied]=useState(false);
  useEffect(()=>{if(!pair)startPairing();},[pair,startPairing]);
  useEffect(()=>{
    if(!pairingUrl){setQr('');return;}
    let current=true;
    QRCode.toDataURL(pairingUrl,{width:560,margin:2,errorCorrectionLevel:'M',color:{dark:'#080808',light:'#ffffff'}}).then(value=>current&&setQr(value)).catch(()=>current&&setQr(''));
    return()=>{current=false;};
  },[pairingUrl]);
  const renew=()=>{stopPairing();requestAnimationFrame(startPairing);};
  const copy=async()=>{
    try{await navigator.clipboard.writeText(pairingUrl);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{}
  };
  const label=remoteConnected?'Phone connected':status==='reconnecting'?'Reconnecting relay…':status==='error'?'Relay connection needs attention':'Waiting for your phone';
  return <div className="pair-page content-width">
    <Link to="/" className="back-link"><ArrowLeft size={16}/> Back to Cinera</Link>
    <div className="pair-layout">
      <section className="pair-copy"><span className="eyebrow"><Gamepad2/> CINERA PHONE REMOTE</span><h1>Your phone is the remote<span>.</span></h1><p>Scan once, then control navigation and playback from the sofa. The connection is private to this one-time pairing session.</p>
        <ol><li><b>1</b><span>Open your phone camera</span></li><li><b>2</b><span>Scan the QR code</span></li><li><b>3</b><span>Open the link and start controlling</span></li></ol>
        <div className={`pair-status ${remoteConnected?'is-connected':''}`}>{remoteConnected?<CheckCircle2/>:<Wifi/>}<span><small>PAIRING STATUS</small><strong>{label}</strong></span></div>
      </section>
      <section className="pair-qr-card" aria-live="polite"><div className="pair-qr">{qr?<img src={qr} alt="QR code to connect a phone as the Cinera remote"/>:<span>Preparing secure QR…</span>}</div><div className="pair-qr-meta"><Smartphone/><div><small>SCAN WITH YOUR PHONE</small><strong>{remoteConnected?'Remote ready':'Secure session active'}</strong></div></div><div className="pair-actions"><button type="button" onClick={copy}><Copy/> {copied?'Copied':'Copy link'}</button><button type="button" onClick={renew}><RefreshCcw/> New code</button></div></section>
    </div>
  </div>;
}
