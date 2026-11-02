import React from 'react';
import {CircleCheckBig,LoaderCircle,Play,Server,Wifi} from 'lucide-react';

const steps=[
  {label:'Find server',icon:Server},
  {label:'Connect',icon:Wifi},
  {label:'Prepare playback',icon:Play},
];

export default function PlaybackLoading({phase=0,title,detail,sourceLabel='YOUR NEXT SCENE',discovery=false}){
  return <div className={discovery?'server-discovery':'player-loading'} role="status" aria-live="polite" aria-atomic="true">
    <div className="playback-loader-mark" aria-hidden="true"><LoaderCircle className="player-spinner" size={32}/></div>
    <span className="player-state-label">{sourceLabel}</span>
    <strong className="playback-loading-title">{title}</strong>
    <p className="playback-loading-detail">{detail}</p>
    <div className="discovery-steps playback-phase-strip" aria-hidden="true">{steps.map((step,index)=>{
      const Icon=index<phase?CircleCheckBig:step.icon;
      return <div className={index<phase?'complete':index===phase?'active':''} key={step.label}><Icon size={15}/><span>{step.label}</span></div>;
    })}</div>
  </div>;
}
