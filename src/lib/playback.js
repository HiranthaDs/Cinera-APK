export function nextAvailableSourceIndex(sources,currentIndex,failedSourceIds=new Set()){
  if(!Array.isArray(sources)||sources.length<2)return -1;
  const failed=failedSourceIds instanceof Set?failedSourceIds:new Set(failedSourceIds);
  for(let offset=1;offset<sources.length;offset+=1){
    const index=(currentIndex+offset)%sources.length;
    if(sources[index]&&!failed.has(sources[index].id))return index;
  }
  return -1;
}
