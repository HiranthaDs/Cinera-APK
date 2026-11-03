import {
  liveCatalog,
  homeData,
  searchData,
  browseData,
  genreData,
  detailData,
  seasonData,
} from './catalog.js';
import {playbackSources} from './sources.js';

const API_HEADERS={
  'Content-Type':'application/json; charset=utf-8',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Robots-Tag':'noindex',
};
const CACHE={
  none:'no-store',
  brief:'public, max-age=15, s-maxage=60, stale-while-revalidate=120',
  search:'public, max-age=30, s-maxage=120, stale-while-revalidate=300',
  catalog:'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
  detail:'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  genres:'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};
const kindOk=kind=>kind==='movie'||kind==='tv';
const int=(raw,def=1,max=500)=>{
  const value=Number(raw);
  return Number.isSafeInteger(value)&&value>=1&&value<=max?value:def;
};

function json(data,{status=200,cache=CACHE.none,headers={}}={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...API_HEADERS,'Cache-Control':cache,...headers},
  });
}

function sourceData(kind,id,season,episode){
  const out=[];
  const addSource=(source,{priority=50}={})=>{
    if(!source||!['video','hls'].includes(source.type))return;
    let parsed;
    try{parsed=new URL(source.url);}catch{return;}
    if(parsed.protocol!=='https:')return;
    out.push({
      id:String(source.id||`${source.type}-${out.length+1}`),
      label:String(source.label||'Playback source').slice(0,80),
      type:source.type,
      url:parsed.toString(),
      quality:String(source.quality||'auto').slice(0,20),
      language:String(source.language||'auto').slice(0,20),
      delivery:'direct',
      priority:Number(source.priority)||priority,
    });
  };
  for(const source of [
    ...(playbackSources[`${kind}:${id}:${season}:${episode}`]||[]),
    ...(playbackSources[`${kind}:${id}`]||[]),
  ])addSource(source,{priority:10});
  const seen=new Set();
  const sources=out
    .filter(source=>{
      const key=`${source.id}|${source.url}`;
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    })
    .sort((a,b)=>a.priority-b.priority);
  return {sources,season,episode,playerVersion:4};
}

async function handleApi(request,env){
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/+$/,'')||'/';
  let match;

  if(path==='/api/health')return json({
    ok:true,
    runtime:'cloudflare-workers',
    catalog:liveCatalog(env)?'tmdb':'sample',
    externalEmbed:false,
    playback:'licensed-direct',
  });

  if(path==='/api/home')return json(await homeData(env),{cache:CACHE.catalog});

  if(path==='/api/search'){
    const query=String(url.searchParams.get('q')||'').slice(0,120).trim();
    return json(await searchData(env,query,int(url.searchParams.get('page'))),{cache:CACHE.search});
  }

  match=path.match(/^\/api\/genres\/(movie|tv)$/);
  if(match)return json(await genreData(env,match[1]),{cache:CACHE.genres});

  match=path.match(/^\/api\/browse\/(movie|tv)$/);
  if(match){
    const kind=match[1];
    const sorts=['popularity.desc','vote_average.desc','primary_release_date.desc','first_air_date.desc'];
    let sort=String(url.searchParams.get('sort')||'popularity.desc');
    if(!sorts.includes(sort))sort='popularity.desc';
    if(sort==='primary_release_date.desc'&&kind==='tv')sort='first_air_date.desc';
    if(sort==='first_air_date.desc'&&kind==='movie')sort='primary_release_date.desc';
    const genre=String(url.searchParams.get('genre')||'').match(/^\d{1,6}$/)?.[0]||'';
    const year=String(url.searchParams.get('year')||'').match(/^(19|20)\d\d$/)?.[0]||'';
    const requestedPeriod=String(url.searchParams.get('period')||'');
    const period=['2020s','2010s','2000s','1990s','classic'].includes(requestedPeriod)?requestedPeriod:'';
    const rating=String(url.searchParams.get('rating')||'').match(/^[678]$/)?.[0]||'';
    return json(await browseData(env,kind,{page:int(url.searchParams.get('page')),genre,year,period,rating,sort}),{cache:CACHE.catalog});
  }

  match=path.match(/^\/api\/title\/(movie|tv)\/(\d+)$/);
  if(match){
    const kind=match[1],id=int(match[2],0,10000000);
    if(!kindOk(kind)||!id)return json({error:'Invalid title ID'},{status:400});
    const result=await detailData(env,kind,id);
    return result
      ?json(result,{cache:CACHE.detail})
      :json({error:'Title not found in the sample catalog. Add TMDB credentials for the complete database.'},{status:404,cache:CACHE.brief});
  }

  match=path.match(/^\/api\/season\/(\d+)\/(\d+)$/);
  if(match){
    const id=int(match[1],0,10000000),number=int(match[2],0,100);
    if(!id||!number)return json({error:'Invalid season'},{status:400});
    const result=await seasonData(env,id,number);
    return result?json(result,{cache:CACHE.detail}):json({error:'Season not found'},{status:404,cache:CACHE.brief});
  }

  match=path.match(/^\/api\/sources\/(movie|tv)\/(\d+)$/);
  if(match){
    const kind=match[1],id=int(match[2],0,10000000);
    if(!kindOk(kind)||!id)return json({error:'Invalid title'},{status:400});
    return json(sourceData(
      kind,
      id,
      int(url.searchParams.get('season'),1,100),
      int(url.searchParams.get('episode'),1,1000),
    ),{cache:CACHE.brief});
  }

  return json({error:'API route not found'},{status:404});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return new Response('Not found',{status:404});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{Allow:'GET, HEAD, OPTIONS'}});
    if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},{status:405,headers:{Allow:'GET, HEAD, OPTIONS'}});
    try{
      return await handleApi(request,env);
    }catch(error){
      console.error(JSON.stringify({
        event:'api_error',
        path:url.pathname,
        message:error instanceof Error?error.message:'Unknown error',
        ray:request.headers.get('cf-ray')||undefined,
      }));
      return json({error:'Unable to fetch catalog data. Please retry.'},{status:502});
    }
  },
};
