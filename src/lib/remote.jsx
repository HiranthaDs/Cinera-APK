import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';

const RemoteContext=createContext(null);
const sessionKey='cinera_remote_pair';

const makeToken=()=>{
  const bytes=crypto.getRandomValues(new Uint8Array(24));
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};

export const remoteSocketUrl=(pair,role)=>{
  const protocol=window.location.protocol==='https:'?'wss:':'ws:';
  return `${protocol}//${window.location.host}/api/remote/socket?pair=${encodeURIComponent(pair)}&role=${role}`;
};

const storedPair=()=>{try{return sessionStorage.getItem(sessionKey)||'';}catch{return '';}};

export function RemoteProvider({children}){
  const navigate=useNavigate();
  const location=useLocation();
  const [pair,setPair]=useState(storedPair);
  const [status,setStatus]=useState(pair?'connecting':'off');
  const [remoteConnected,setRemoteConnected]=useState(false);
  const socketRef=useRef(null),reconnectRef=useRef(null),stateRef=useRef({}),locationRef=useRef(location.pathname);

  const startPairing=useCallback(()=>{
    const token=makeToken();
    try{sessionStorage.setItem(sessionKey,token);}catch{}
    setPair(token);setStatus('connecting');setRemoteConnected(false);
    return token;
  },[]);
  const stopPairing=useCallback(()=>{
    clearTimeout(reconnectRef.current);
    socketRef.current?.close(1000,'Pairing ended');socketRef.current=null;
    try{sessionStorage.removeItem(sessionKey);}catch{}
    setPair('');setStatus('off');setRemoteConnected(false);
  },[]);
  const sendState=useCallback(next=>{
    stateRef.current={...stateRef.current,...next,path:locationRef.current};
    if(socketRef.current?.readyState===WebSocket.OPEN)socketRef.current.send(JSON.stringify({type:'state',state:stateRef.current}));
  },[]);

  useEffect(()=>{locationRef.current=location.pathname;sendState({path:location.pathname});},[location.pathname,sendState]);
  useEffect(()=>{
    const listener=event=>sendState(event.detail||{});
    window.addEventListener('cinera:remote-state',listener);
    return()=>window.removeEventListener('cinera:remote-state',listener);
  },[sendState]);

  useEffect(()=>{
    if(!pair)return;
    let stopped=false;
    const connect=()=>{
      if(stopped)return;
      setStatus('connecting');
      const socket=new WebSocket(remoteSocketUrl(pair,'screen'));
      socketRef.current=socket;
      socket.addEventListener('open',()=>{setStatus('waiting');sendState(stateRef.current);});
      socket.addEventListener('message',event=>{
        let payload;try{payload=JSON.parse(event.data);}catch{return;}
        if(payload.type==='presence'){
          setRemoteConnected(Boolean(payload.remoteConnected));
          setStatus(payload.remoteConnected?'connected':'waiting');
          return;
        }
        if(payload.type!=='command'||!payload.command)return;
        const command=payload.command;
        if(command.action==='navigate'&&typeof command.path==='string'&&command.path.startsWith('/'))navigate(command.path);
        else if(command.action==='back')navigate(-1);
        else if(command.action==='key'&&typeof command.key==='string')window.dispatchEvent(new KeyboardEvent('keydown',{key:command.key,bubbles:true}));
        else window.dispatchEvent(new CustomEvent('cinera:remote-command',{detail:command}));
      });
      socket.addEventListener('close',()=>{
        if(stopped)return;
        setRemoteConnected(false);setStatus('reconnecting');
        reconnectRef.current=setTimeout(connect,1800);
      });
      socket.addEventListener('error',()=>setStatus('error'));
    };
    connect();
    return()=>{stopped=true;clearTimeout(reconnectRef.current);socketRef.current?.close();socketRef.current=null;};
  },[pair,navigate,sendState]);

  const pairingUrl=pair?`${window.location.origin}/remote?pair=${encodeURIComponent(pair)}`:'';
  return <RemoteContext.Provider value={{pair,pairingUrl,status,remoteConnected,startPairing,stopPairing,sendState}}>{children}</RemoteContext.Provider>;
}

export const useRemote=()=>useContext(RemoteContext);
