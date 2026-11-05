// This file is copied directly to the build and is not transformed by Vite.
// Keep it compatible with the same older TV browsers as the legacy app bundle.
var VERSION='cinera-v5-tv-playback';
var SHELL_CACHE=VERSION+'-shell';
var DATA_CACHE=VERSION+'-data';
var APP_SHELL=[
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/fonts/anton.ttf',
  '/fonts/inter-regular.ttf',
  '/fonts/inter-semibold.ttf',
];

self.addEventListener('install',function(event){
  event.waitUntil(caches.open(SHELL_CACHE).then(function(cache){
    return cache.addAll(APP_SHELL);
  }).then(function(){
    return self.skipWaiting();
  }));
});

self.addEventListener('activate',function(event){
  event.waitUntil(Promise.all([
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(key){
        return key.startsWith('cinera-')&&!key.startsWith(VERSION);
      }).map(function(key){
        return caches.delete(key);
      }));
    }),
    self.clients.claim(),
  ]));
});

function trimCache(cacheName,maxEntries){
  return caches.open(cacheName).then(function(cache){
    return cache.keys().then(function(keys){
      return Promise.all(keys.slice(0,Math.max(0,keys.length-maxEntries)).map(function(key){
        return cache.delete(key);
      }));
    });
  });
}

function offlineResponse(){
  return new Response(JSON.stringify({error:'You are offline and this content is not cached yet.'}),{
    status:503,
    headers:{'Content-Type':'application/json; charset=utf-8'},
  });
}

function cachedFallback(cache,request,fallback){
  return cache.match(request).then(function(cached){
    if(cached)return cached;
    if(!fallback)return offlineResponse();
    return caches.match(fallback).then(function(shell){
      return shell||offlineResponse();
    });
  });
}

function networkFirst(request,cacheName,fallback){
  return caches.open(cacheName).then(function(cache){
    return fetch(request).then(function(response){
      if(!response.ok)return response;
      return cache.put(request,response.clone()).then(function(){
        return trimCache(cacheName,60);
      }).then(function(){
        return response;
      });
    }).catch(function(){
      return cachedFallback(cache,request,fallback);
    });
  });
}

function staleWhileRevalidate(request){
  return caches.open(SHELL_CACHE).then(function(cache){
    return cache.match(request).then(function(cached){
      var network=fetch(request).then(function(response){
        if(response.ok)cache.put(request,response.clone()).catch(function(){});
        return response;
      }).catch(function(){
        return cached||offlineResponse();
      });
      return cached||network;
    });
  });
}

self.addEventListener('fetch',function(event){
  var request=event.request;
  if(request.method!=='GET')return;
  var url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')){
    event.respondWith(networkFirst(request,DATA_CACHE));
    return;
  }
  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request,SHELL_CACHE,'/'));
    return;
  }
  if(['script','style','font','image','manifest'].indexOf(request.destination)!==-1)event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message',function(event){
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});
