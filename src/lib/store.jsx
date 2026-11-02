import React,{createContext,useContext,useCallback,useState} from 'react';
import {keyOf,storageRead} from './api';
const Context=createContext(null);
function stateFor(name, fallback) {return storageRead(`cinera_${name}`,fallback);}
export function StoreProvider({children}) {
  const [saved,setSaved]=useState(()=>stateFor('saved',[]));
  const [history,setHistory]=useState(()=>stateFor('history',[]));
  const [progress,setProgress]=useState(()=>stateFor('progress',{}));
  const setPersist=(set,name)=>(updater)=>set(prev=>{
    const next=typeof updater==='function'?updater(prev):updater;
    try{localStorage.setItem(`cinera_${name}`,JSON.stringify(next));}catch{}
    return next;
  });
  const updateSaved=setPersist(setSaved,'saved');
  const updateHistory=setPersist(setHistory,'history');
  const updateProgress=setPersist(setProgress,'progress');
  const isSaved=useCallback(item=>saved.some(x=>keyOf(x)===keyOf(item)),[saved]);
  const toggleSaved=(item)=>updateSaved(prev=>prev.some(x=>keyOf(x)===keyOf(item))?prev.filter(x=>keyOf(x)!==keyOf(item)):[item,...prev].slice(0,100));
  const markWatched=(item,season=1,episode=1)=>updateHistory(prev=>[
    {...item,season,episode,lastWatched:Date.now()},...prev.filter(x=>keyOf(x)!==keyOf(item))
  ].slice(0,48));
  const saveProgress=(item,seconds,duration,season=1,episode=1)=>{
    if(!Number.isFinite(seconds)||seconds<0)return;
    updateProgress(prev=>({...prev,[`${keyOf(item)}:${season}:${episode}`]:{seconds:Math.floor(seconds),duration:Number(duration)||0,updatedAt:Date.now()}}));
  };
  const getProgress=(item,season=1,episode=1)=>progress[`${keyOf(item)}:${season}:${episode}`]||null;
  return <Context.Provider value={{saved,history,progress,isSaved,toggleSaved,markWatched,saveProgress,getProgress}}>{children}</Context.Provider>;
}
export const useStore=()=>useContext(Context);
