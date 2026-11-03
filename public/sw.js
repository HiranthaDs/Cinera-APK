const VERSION='cinera-v4-trackpad-remote';
const SHELL_CACHE=`${VERSION}-shell`;
const DATA_CACHE=`${VERSION}-data`;
const APP_SHELL=[
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/fonts/anton.ttf',
  '/fonts/inter-regular.ttf',
  '/fonts/inter-semibold.ttf',
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cinera-')&&!key.startsWith(VERSION)).map(key=>caches.delete(key)))),
    self.clients.claim(),
  ]));
});

async function trimCache(cacheName,maxEntries){
  const cache=await caches.open(cacheName);
  const keys=await cache.keys();
  await Promise.all(keys.slice(0,Math.max(0,keys.length-maxEntries)).map(key=>cache.delete(key)));
}

async function networkFirst(request,cacheName,fallback){
  const cache=await caches.open(cacheName);
  try{
    const response=await fetch(request);
    if(response.ok){
      await cache.put(request,response.clone());
      await trimCache(cacheName,60);
    }
    return response;
  }catch{
    return (await cache.match(request))||(fallback?await caches.match(fallback):undefined)||new Response(JSON.stringify({error:'You are offline and this content is not cached yet.'}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(SHELL_CACHE);
  const cached=await cache.match(request);
  const network=fetch(request).then(response=>{
    if(response.ok)cache.put(request,response.clone());
    return response;
  }).catch(()=>cached);
  return cached||network;
}

self.addEventListener('fetch',event=>{
  const {request}=event;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')){
    event.respondWith(networkFirst(request,DATA_CACHE));
    return;
  }
  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request,SHELL_CACHE,'/'));
    return;
  }
  if(['script','style','font','image','manifest'].includes(request.destination))event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
