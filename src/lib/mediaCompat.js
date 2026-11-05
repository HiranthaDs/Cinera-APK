export const HLS_MIME_TYPES=[
  'application/vnd.apple.mpegurl',
  'application/x-mpegURL',
  'audio/mpegurl',
];

export const nativeHlsType=media=>{
  if(!media||typeof media.canPlayType!=='function')return '';
  for(const type of HLS_MIME_TYPES){
    try{
      if(media.canPlayType(type))return type;
    }catch{}
  }
  return '';
};

export const fullscreenElement=(doc=typeof document!=='undefined'?document:undefined)=>doc?.fullscreenElement||doc?.webkitFullscreenElement||doc?.webkitCurrentFullScreenElement||doc?.mozFullScreenElement||doc?.msFullscreenElement||null;

export const exitFullscreen=(doc=typeof document!=='undefined'?document:undefined)=>{
  const exit=doc&&(doc.exitFullscreen||doc.webkitExitFullscreen||doc.webkitCancelFullScreen||doc.mozCancelFullScreen||doc.msExitFullscreen);
  try{return exit?Promise.resolve(exit.call(doc)):Promise.resolve(false);}
  catch(error){return Promise.reject(error);}
};

export const toggleFullscreen=(target,media=target,doc=typeof document!=='undefined'?document:undefined)=>{
  try{
    if(fullscreenElement(doc))return exitFullscreen(doc);
    const request=target&&(target.requestFullscreen||target.webkitRequestFullscreen||target.webkitRequestFullScreen||target.mozRequestFullScreen||target.msRequestFullscreen);
    if(request)return Promise.resolve(request.call(target));
    if(media&&typeof media.webkitEnterFullscreen==='function')return Promise.resolve(media.webkitEnterFullscreen());
    return Promise.resolve(false);
  }catch(error){
    return Promise.reject(error);
  }
};
