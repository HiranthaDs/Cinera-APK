import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import {liveCatalog,homeData,searchData,browseData,genreData,detailData,seasonData} from './catalog.js';

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'80kb'}));
app.use('/api',(req,res,next)=>{
  const volatile=req.path==='/health'||req.path.startsWith('/sources/');
  res.set('Cache-Control',volatile?'no-store':'public, max-age=30, stale-while-revalidate=120');
  next();
});
const baseDir=path.dirname(fileURLToPath(import.meta.url));
const safe=(fn)=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error(`[${req.path}]`,e.message);res.status(502).json({error:'Unable to fetch catalog data. Please retry.',details:process.env.NODE_ENV==='production'?undefined:e.message});}};
const kindOk=k=>k==='movie'||k==='tv';
const int=(raw,def=1,max=500)=>{const n=Number(raw);return Number.isSafeInteger(n)&&n>=1&&n<=max?n:def;};

app.get('/api/health',(req,res)=>res.json({ok:true,catalog:liveCatalog()?'tmdb':'sample',externalEmbed:process.env.ENABLE_VIDY!=='false'}));
app.get('/api/home',safe(async(req,res)=>res.json(await homeData())));
app.get('/api/search',safe(async(req,res)=>{
  const q=String(req.query.q||'').slice(0,120).trim();
  res.json(await searchData(q,int(req.query.page)));
}));
app.get('/api/genres/:kind',safe(async(req,res)=>{
  if(!kindOk(req.params.kind))return res.status(400).json({error:'Invalid type'});
  res.json(await genreData(req.params.kind));
}));
app.get('/api/browse/:kind',safe(async(req,res)=>{
  if(!kindOk(req.params.kind))return res.status(400).json({error:'Invalid type'});
  const sorts=['popularity.desc','vote_average.desc','primary_release_date.desc','first_air_date.desc'];
  let sort=String(req.query.sort||'popularity.desc');
  if(!sorts.includes(sort))sort='popularity.desc';
  if(sort==='primary_release_date.desc'&&req.params.kind==='tv')sort='first_air_date.desc';
  if(sort==='first_air_date.desc'&&req.params.kind==='movie')sort='primary_release_date.desc';
  const genre=String(req.query.genre||'').match(/^\d{1,6}$/)?.[0]||'';
  const year=String(req.query.year||'').match(/^(19|20)\d\d$/)?.[0]||'';
  res.json(await browseData(req.params.kind,{page:int(req.query.page),genre,year,sort}));
}));
app.get('/api/title/:kind/:id',safe(async(req,res)=>{
  if(!kindOk(req.params.kind))return res.status(400).json({error:'Invalid type'});
  const id=int(req.params.id,0,10000000);if(!id)return res.status(400).json({error:'Invalid title ID'});
  const result=await detailData(req.params.kind,id);
  if(!result)return res.status(404).json({error:'Title not found in the sample catalog. Add TMDB credentials for the complete database.'});
  res.json(result);
}));
app.get('/api/season/:id/:number',safe(async(req,res)=>{
  const id=int(req.params.id,0,10000000),number=int(req.params.number,0,100);
  if(!id||!number)return res.status(400).json({error:'Invalid season'});
  const data=await seasonData(id,number);
  if(!data)return res.status(404).json({error:'Season not found'});
  res.json(data);
}));
app.get('/api/sources/:kind/:id',(req,res)=>{
  const {kind}=req.params,id=int(req.params.id,0,10000000);
  if(!kindOk(kind)||!id)return res.status(400).json({error:'Invalid title'});
  const season=int(req.query.season,1,100),episode=int(req.query.episode,1,1000);
  const out=[];
  const addSource=(source,{external=false,priority=50}={})=>{
    if(!source||!['video','hls','iframe'].includes(source.type))return;
    let parsed;try{parsed=new URL(source.url);}catch{return;}
    if(parsed.protocol!=='https:')return;
    out.push({
      id:String(source.id||`${source.type}-${out.length+1}`),
      label:String(source.label||'Playback source').slice(0,80),
      type:source.type,
      url:parsed.toString(),
      note:String(source.note||'User-provided playback source').slice(0,240),
      quality:String(source.quality||'auto').slice(0,20),
      language:String(source.language||'auto').slice(0,20),
      external,
      priority:Number(source.priority)||priority,
    });
  };
  try {
    const custom=JSON.parse(fs.readFileSync(path.join(baseDir,'data','sources.json'),'utf8'));
    for(const s of [...(custom[`${kind}:${id}:${season}:${episode}`]||[]), ...(custom[`${kind}:${id}`]||[])]) {
      addSource(s,{priority:10});
    }
  }catch(e){console.warn('sources.json not loaded:',e.message);}
  if(process.env.ENABLE_VIDY!=='false') {
    // Documented public iframe integration, NOT a HydraHD scraper or decrypted stream extractor.
    const route=kind==='movie'?`movie/${id}`:`tv/${id}/${season}/${episode}`;
    const flags=kind==='tv'?'&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true':'';
    addSource({id:'vidy-external',label:'Vidy (external player)',type:'iframe',url:`https://vidy.st/${route}?color=FF3454&autoplay=true${flags}`,note:'Third-party embed. Title availability and distribution rights are not guaranteed.'},{external:true,priority:100});
  }
  const seen=new Set();
  const sources=out.filter(source=>{const key=`${source.id}|${source.url}`;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.priority-b.priority);
  res.json({sources,season,episode,playerVersion:2});
});

const dist=path.resolve(baseDir,'..','dist');
if(fs.existsSync(dist)) {
  app.use(express.static(dist,{maxAge:'1h'}));
  app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html')));
}
const PORT=Number(process.env.PORT)||3001;
app.listen(PORT,()=>console.log(`Cinera API listening at http://localhost:${PORT} | catalog=${liveCatalog()?'TMDB':'demo'} | external player=${process.env.ENABLE_VIDY!=='false'}`));
