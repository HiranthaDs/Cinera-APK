const responseCache=new Map();
const API_TIMEOUT=14000;

const ttlFor=url=>url.includes('/api/sources/')?15000:url.includes('/api/home')?120000:url.includes('/api/title/')?300000:90000;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function api(url,signal,{fresh=false}={}){
  const cached=responseCache.get(url);
  if(!fresh&&cached&&cached.expires>Date.now())return cached.data;
  let lastError;
  for(let attempt=0;attempt<2;attempt+=1){
    if(signal?.aborted)throw new DOMException('The request was aborted.','AbortError');
    const controller=new AbortController();
    const abortFromCaller=()=>controller.abort(signal?.reason);
    signal?.addEventListener('abort',abortFromCaller,{once:true});
    const timeout=setTimeout(()=>controller.abort(new Error('Request timed out')),API_TIMEOUT);
    try{
      const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
      let data;
      try{data=await response.json();}catch{throw new Error(`Server returned ${response.status}`);}
      if(!response.ok){
        const error=new Error(data.error||`HTTP ${response.status}`);
        error.status=response.status;
        throw error;
      }
      responseCache.set(url,{data,expires:Date.now()+ttlFor(url)});
      if(responseCache.size>180)responseCache.delete(responseCache.keys().next().value);
      return data;
    }catch(error){
      if(signal?.aborted)throw new DOMException('The request was aborted.','AbortError');
      lastError=error;
      const retryable=error.name==='AbortError'||!error.status||error.status>=500;
      if(!retryable||attempt===1)throw error.name==='AbortError'?new Error('The server took too long to respond.'):error;
      await pause(350);
    }finally{
      clearTimeout(timeout);
      signal?.removeEventListener('abort',abortFromCaller);
    }
  }
  throw lastError||new Error('Request failed.');
}

export const clearApiCache=prefix=>{for(const key of responseCache.keys())if(!prefix||key.startsWith(prefix))responseCache.delete(key);};
export const img=(path,size='w500')=>path?`https://image.tmdb.org/t/p/${size}${path}`:null;
export const keyOf=item=>`${item.kind}:${item.id}`;
export const prettyRuntime=n=>n?`${Math.floor(n/60)}h ${n%60}m`:'—';
export const rating=n=>n?Number(n).toFixed(1):'NR';
export const truncated=(value,max=185)=>value?.length>max?`${value.slice(0,max).trim()}…`:value;
export const storageRead=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch{return fallback;}};
