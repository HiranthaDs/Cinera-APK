export function parseEmbedPlayerMessage(input){
  let payload=input;
  if(typeof payload==='string'){
    try{payload=JSON.parse(payload);}catch{return null;}
  }
  if(!payload||typeof payload!=='object')return null;
  const body=payload.type==='PLAYER_EVENT'&&payload.data&&typeof payload.data==='object'?payload.data:payload;
  if(!['play','pause','ended','timeupdate'].includes(body.event))return null;
  const rawTime=body.currentTime??body.timestamp;
  const rawDuration=body.duration;
  const currentTime=Number(rawTime);
  const duration=Number(rawDuration);
  return {
    event:body.event,
    currentTime:Number.isFinite(currentTime)&&currentTime>=0?currentTime:undefined,
    duration:Number.isFinite(duration)&&duration>=0?duration:undefined,
  };
}

export function embedUrlWithProgress(sourceUrl,resume=0){
  const url=new URL(sourceUrl);
  const seconds=Math.floor(Number(resume)||0);
  if(seconds>0)url.searchParams.set('progress',String(seconds));
  return url.toString();
}
