export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function gestureDirection(dx,dy,threshold=34){
  if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return '';
  if(Math.abs(dx)>=Math.abs(dy))return dx>0?'ArrowRight':'ArrowLeft';
  return dy>0?'ArrowDown':'ArrowUp';
}

export function gestureRepeatCount(dx,dy,threshold=34,max=4){
  const distance=Math.max(Math.abs(dx),Math.abs(dy));
  return clamp(Math.floor(distance/threshold),1,max);
}

export function nextPointerPosition(position,delta,bounds,sensitivity=1.65){
  const width=Math.max(1,Number(bounds?.width)||1);
  const height=Math.max(1,Number(bounds?.height)||1);
  const inset=Math.max(8,Number(bounds?.inset)||18);
  const currentX=Number.isFinite(position?.x)?position.x:width/2;
  const currentY=Number.isFinite(position?.y)?position.y:height/2;
  return {
    x:clamp(currentX+(Number(delta?.dx)||0)*sensitivity,inset,width-inset),
    y:clamp(currentY+(Number(delta?.dy)||0)*sensitivity,inset,height-inset),
  };
}
