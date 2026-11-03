import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {nextPointerPosition} from './remoteGestures';

const RemoteContext=createContext(null);
const sessionKey='cinera_remote_pair';
const EDITABLE='input:not([disabled]):not([type="button"]):not([type="submit"]),textarea:not([disabled]),[contenteditable="true"]';
const INTERACTIVE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[role="button"],[role="option"],[tabindex]:not([tabindex="-1"])';

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
const visible=element=>{
  if(!element?.isConnected)return false;
  const rect=element.getBoundingClientRect();
  const style=getComputedStyle(element);
  return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&!element.closest('[inert],[aria-hidden="true"]');
};
const editableElement=element=>element?.matches?.(EDITABLE)?element:null;
const editableValue=element=>element?.isContentEditable?element.textContent||'':element?.value||'';
const inputLabel=element=>element?.getAttribute?.('aria-label')||element?.getAttribute?.('placeholder')||element?.name||'Type on TV';
const interactiveAt=(x,y)=>{
  const element=document.elementFromPoint(x,y);
  const target=element?.closest?.(INTERACTIVE);
  return target&&visible(target)?target:null;
};
const targetLabel=element=>element?String(element.getAttribute?.('aria-label')||element.innerText||element.value||element.title||'Select').trim().replace(/\s+/g,' ').slice(0,80):'';
const setNativeValue=(element,value)=>{
  const clean=String(value||'').slice(0,240);
  if(element.isContentEditable)element.textContent=clean;
  else{
    const prototype=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    const setter=Object.getOwnPropertyDescriptor(prototype,'value')?.set;
    if(setter)setter.call(element,clean);else element.value=clean;
  }
  const inputEvent=typeof InputEvent==='function'?new InputEvent('input',{bubbles:true,inputType:'insertText',data:clean}):new Event('input',{bubbles:true});
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(new Event('change',{bubbles:true}));
};

export function RemoteProvider({children}){
  const navigate=useNavigate();
  const location=useLocation();
  const [pair,setPair]=useState(storedPair);
  const [status,setStatus]=useState(pair?'connecting':'off');
  const [remoteConnected,setRemoteConnected]=useState(false);
  const socketRef=useRef(null),reconnectRef=useRef(null),stateRef=useRef({}),locationRef=useRef(location.pathname);
  const pointerElementRef=useRef(null),pointerTargetRef=useRef(null),pointerHideRef=useRef(null),textFocusTimerRef=useRef(null);
  const pointerRef=useRef({x:typeof window==='undefined'?0:window.innerWidth/2,y:typeof window==='undefined'?0:window.innerHeight/2});

  const startPairing=useCallback(()=>{
    const token=makeToken();
    try{sessionStorage.setItem(sessionKey,token);}catch{}
    setPair(token);setStatus('connecting');setRemoteConnected(false);
    return token;
  },[]);
  const clearPointer=useCallback(()=>{
    clearTimeout(pointerHideRef.current);
    pointerTargetRef.current?.classList.remove('remote-pointer-target');
    pointerTargetRef.current=null;
    pointerElementRef.current?.classList.remove('is-visible','is-pressing');
    document.documentElement.classList.remove('phone-pointer-active');
  },[]);
  const stopPairing=useCallback(()=>{
    clearTimeout(reconnectRef.current);
    socketRef.current?.close(1000,'Pairing ended');socketRef.current=null;
    try{sessionStorage.removeItem(sessionKey);}catch{}
    clearPointer();setPair('');setStatus('off');setRemoteConnected(false);
  },[clearPointer]);
  const sendState=useCallback(next=>{
    stateRef.current={...stateRef.current,...next,path:locationRef.current};
    if(socketRef.current?.readyState===WebSocket.OPEN)socketRef.current.send(JSON.stringify({type:'state',state:stateRef.current}));
  },[]);

  const refreshPointerTarget=useCallback(()=>{
    const {x,y}=pointerRef.current;
    const target=interactiveAt(x,y);
    if(pointerTargetRef.current!==target){
      pointerTargetRef.current?.classList.remove('remote-pointer-target');
      pointerTargetRef.current=target;
      target?.classList.add('remote-pointer-target');
    }
    sendState({pointerTarget:targetLabel(target)});
    return target;
  },[sendState]);
  const movePointer=useCallback(command=>{
    pointerRef.current=nextPointerPosition(pointerRef.current,command,{width:window.innerWidth,height:window.innerHeight,inset:18},Number(command.sensitivity)||1.65);
    const element=pointerElementRef.current;
    if(element){
      element.style.transform=`translate3d(${pointerRef.current.x}px,${pointerRef.current.y}px,0)`;
      element.classList.add('is-visible');
    }
    document.documentElement.classList.add('phone-pointer-active');
    refreshPointerTarget();
    clearTimeout(pointerHideRef.current);
    pointerHideRef.current=setTimeout(()=>pointerElementRef.current?.classList.remove('is-pressing'),180);
  },[refreshPointerTarget]);
  const clickPointer=useCallback(()=>{
    const target=refreshPointerTarget();
    const element=pointerElementRef.current;
    element?.classList.add('is-pressing');
    clearTimeout(pointerHideRef.current);
    pointerHideRef.current=setTimeout(()=>element?.classList.remove('is-pressing'),160);
    if(target){
      target.focus?.({preventScroll:true});
      target.click?.();
    }else{
      const {x,y}=pointerRef.current;
      document.elementFromPoint(x,y)?.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,view:window}));
    }
  },[refreshPointerTarget]);

  const findEditable=useCallback(()=>editableElement(document.activeElement)||[...document.querySelectorAll(EDITABLE)].find(visible)||null,[]);
  const focusEditable=useCallback(callback=>{
    clearTimeout(textFocusTimerRef.current);
    let attempts=0;
    const attempt=()=>{
      const target=findEditable();
      if(target){
        target.focus({preventScroll:false});
        target.scrollIntoView({block:'center',inline:'nearest'});
        callback?.(target);
        sendState({inputActive:true,inputLabel:inputLabel(target),inputValue:editableValue(target)});
        return;
      }
      if(attempts===0&&locationRef.current!=='/search')navigate('/search');
      attempts+=1;
      if(attempts<30)textFocusTimerRef.current=setTimeout(attempt,80);
    };
    attempt();
  },[findEditable,navigate,sendState]);

  const handleCommand=useCallback(command=>{
    if(!command||typeof command.action!=='string')return;
    if(command.action==='navigate'&&typeof command.path==='string'&&command.path.startsWith('/')){clearPointer();navigate(command.path);}
    else if(command.action==='back'){clearPointer();navigate(-1);}
    else if(command.action==='menu')document.querySelector('.menu-toggle')?.click();
    else if(command.action==='key'&&typeof command.key==='string'){
      pointerElementRef.current?.classList.remove('is-visible');
      window.dispatchEvent(new KeyboardEvent('keydown',{key:command.key,bubbles:true,cancelable:true}));
    }else if(command.action==='pointer_move')movePointer(command);
    else if(command.action==='pointer_click')clickPointer();
    else if(command.action==='scroll'){
      window.scrollBy({top:Math.max(-900,Math.min(900,Number(command.dy)||0))*1.8,behavior:'auto'});
      requestAnimationFrame(refreshPointerTarget);
    }else if(command.action==='focus_input')focusEditable();
    else if(command.action==='text_set')focusEditable(target=>setNativeValue(target,command.value));
    else if(command.action==='text_submit')focusEditable(target=>{
      target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}));
      target.closest('form')?.requestSubmit?.();
    });
    else window.dispatchEvent(new CustomEvent('cinera:remote-command',{detail:command}));
  },[clearPointer,clickPointer,focusEditable,movePointer,navigate,refreshPointerTarget]);

  useEffect(()=>{
    const pointer=document.createElement('div');
    pointer.className='cinera-remote-pointer';
    pointer.setAttribute('aria-hidden','true');
    document.body.appendChild(pointer);pointerElementRef.current=pointer;
    const relocate=()=>{(document.fullscreenElement||document.body).appendChild(pointer);};
    document.addEventListener('fullscreenchange',relocate);
    return()=>{document.removeEventListener('fullscreenchange',relocate);pointer.remove();pointerElementRef.current=null;};
  },[]);
  useEffect(()=>{locationRef.current=location.pathname;sendState({path:location.pathname});},[location.pathname,sendState]);
  useEffect(()=>{
    const listener=event=>sendState(event.detail||{});
    window.addEventListener('cinera:remote-state',listener);
    return()=>window.removeEventListener('cinera:remote-state',listener);
  },[sendState]);
  useEffect(()=>{
    const update=event=>{
      const target=editableElement(event.target);
      if(target)sendState({inputActive:true,inputLabel:inputLabel(target),inputValue:editableValue(target)});
    };
    const blur=()=>setTimeout(()=>{if(!editableElement(document.activeElement))sendState({inputActive:false});},0);
    document.addEventListener('focusin',update);document.addEventListener('input',update);document.addEventListener('focusout',blur);
    return()=>{document.removeEventListener('focusin',update);document.removeEventListener('input',update);document.removeEventListener('focusout',blur);};
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
          const connected=Boolean(payload.remoteConnected);
          setRemoteConnected(connected);setStatus(connected?'connected':'waiting');
          if(!connected)clearPointer();
          return;
        }
        if(payload.type==='command')handleCommand(payload.command);
      });
      socket.addEventListener('close',()=>{
        if(stopped)return;
        clearPointer();setRemoteConnected(false);setStatus('reconnecting');
        reconnectRef.current=setTimeout(connect,1800);
      });
      socket.addEventListener('error',()=>setStatus('error'));
    };
    connect();
    return()=>{stopped=true;clearTimeout(reconnectRef.current);clearTimeout(textFocusTimerRef.current);clearPointer();socketRef.current?.close();socketRef.current=null;};
  },[pair,clearPointer,handleCommand,sendState]);

  const pairingUrl=pair?`${window.location.origin}/remote?pair=${encodeURIComponent(pair)}`:'';
  return <RemoteContext.Provider value={{pair,pairingUrl,status,remoteConnected,startPairing,stopPairing,sendState}}>{children}</RemoteContext.Provider>;
}

export const useRemote=()=>useContext(RemoteContext);
