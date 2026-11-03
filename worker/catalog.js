import { seed, seedList, seedFind, movieGenres, tvGenres } from './seed.js';

const API = 'https://api.themoviedb.org/3';
const cache = new Map();
const hasToken = env => Boolean(env?.TMDB_READ_ACCESS_TOKEN || env?.TMDB_API_KEY);
const DEFAULT_TIMEOUT = 8000;

export function liveCatalog(env) { return hasToken(env); }
export function normalize(item, kind) {
  const type = kind || item.kind || item.media_type || (item.first_air_date || item.name ? 'tv' : 'movie');
  return {
    id: item.id,
    kind: type,
    title: item.title || item.name || item.original_title || item.original_name || 'Untitled',
    year: Number((item.release_date || item.first_air_date || item.year || '').toString().slice(0, 4)) || null,
    rating: Number(item.vote_average ?? item.rating ?? 0),
    runtime: item.runtime || item.episode_run_time?.[0] || null,
    genres: item.genre_ids || item.genres?.map(g => typeof g === 'object' ? g.id : g) || [],
    poster: item.poster_path || item.poster || null,
    backdrop: item.backdrop_path || item.backdrop || null,
    overview: item.overview || 'No synopsis is available for this title yet.',
    popularity: item.popularity || 0,
    seasons: item.number_of_seasons || item.seasons || undefined,
  };
}

async function tmdb(env, path, params={}) {
  if (!hasToken(env)) throw new Error('TMDB token not configured');
  const u = new URL(`${API}${path}`);
  for (const [k,v] of Object.entries(params)) if(v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  if (env.TMDB_API_KEY && !env.TMDB_READ_ACCESS_TOKEN) u.searchParams.set('api_key', env.TMDB_API_KEY);
  const cacheKey = u.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expire > Date.now()) return cached.data;
  const headers = {Accept: 'application/json'};
  if (env.TMDB_READ_ACCESS_TOKEN) headers.Authorization = `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`;
  const response = await fetch(u, {
    headers,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    cf: {cacheEverything:true,cacheTtlByStatus:{'200-299':600,'400-499':30,'500-599':0}},
  });
  if (!response.ok) throw new Error(`TMDB returned ${response.status}`);
  const data = await response.json();
  cache.set(cacheKey, {data, expire: Date.now() + 10 * 60 * 1000});
  if (cache.size > 700) cache.delete(cache.keys().next().value);
  return data;
}

async function list(env, path, kind, params={}) {
  const result = await tmdb(env, path, params);
  return (result.results || []).filter(x => x.poster_path || x.backdrop_path).map(x => normalize(x, kind));
}

export async function homeData(env) {
  const fallback = () => {
    const movies = seedList('movie').map(x => normalize(x));
    const tv = seedList('tv').map(x => normalize(x));
    return {
      demo: true, featured: [movies[1], tv[2], movies[0], tv[1], movies[3]].filter(Boolean),
      rows: [
        {id:'trending-movie',label:'Trending movies',kind:'movie',items:movies.slice(0,11)},
        {id:'trending-tv',label:'Trending series',kind:'tv',items:tv},
        {id:'popular-movie',label:'Popular right now',kind:'movie',items:[...movies].reverse()},
        {id:'top-rated',label:'Critically acclaimed',kind:'movie',items:[movies[2], movies[0], movies[4], movies[1], ...movies.slice(5)]},
        {id:'popular-tv',label:'Binge-worthy shows',kind:'tv',items:[...tv].reverse()}
      ]
    };
  };
  if (!hasToken(env)) return fallback();
  try {
    const [trendMovies, trendTv, popular, series, top, now] = await Promise.all([
      list(env, '/trending/movie/week', 'movie'), list(env, '/trending/tv/week', 'tv'),
      list(env, '/movie/popular','movie'), list(env, '/tv/popular','tv'),
      list(env, '/movie/top_rated','movie'), list(env, '/movie/now_playing','movie')
    ]);
    return {
      demo:false, featured:[trendMovies[0], popular[0], trendTv[0], now[0], trendMovies[1], series[0]].filter(x=>x && x.backdrop),
      rows:[
        {id:'trending-movie', label:'Trending movies',kind:'movie',items:trendMovies},
        {id:'trending-tv', label:'Trending series',kind:'tv',items:trendTv},
        {id:'popular-movie', label:'Popular right now',kind:'movie',items:popular},
        {id:'top-rated', label:'Critically acclaimed',kind:'movie',items:top},
        {id:'now-playing', label:'New releases',kind:'movie',items:now},
        {id:'popular-tv', label:'Binge-worthy series',kind:'tv',items:series}
      ]
    };
  } catch (error) {
    console.warn('[catalog/home] Falling back to demo:', error.message);
    return {...fallback(), warning:'Live catalog unavailable. Displaying demo titles.'};
  }
}

export async function searchData(env, q, page=1) {
  if (!q.trim()) return {results:[],page,totalPages:0,demo:!hasToken(env)};
  if (!hasToken(env)) {
    const needle=q.toLowerCase();
    return { results:seed.filter(x=>`${x.title} ${x.overview}`.toLowerCase().includes(needle)).map(x=>normalize(x)), page:1,totalPages:1,demo:true };
  }
  const result = await tmdb(env, '/search/multi', {query:q.trim(),page,include_adult:false});
  return { results:(result.results||[]).filter(x=>['movie','tv'].includes(x.media_type)).map(x=>normalize(x)),page:result.page,totalPages:Math.min(result.total_pages||1,500),demo:false };
}

export async function browseData(env, kind, {page=1,genre='',year='',period='',rating='',sort='popularity.desc'}={}) {
  if (!hasToken(env)) {
    let records=seedList(kind).map(x=>normalize(x));
    if (genre) records=records.filter(x=>x.genres.includes(Number(genre)));
    if (year) records=records.filter(x=>x.year===Number(year));
    if (period) records=records.filter(x=>period==='classic'?(x.year||0)<1990:(x.year||0)>=Number(period.slice(0,4))&&(x.year||0)<Number(period.slice(0,4))+10);
    if (rating) records=records.filter(x=>x.rating>=Number(rating));
    if (sort==='vote_average.desc') records.sort((a,b)=>b.rating-a.rating);
    else if (sort.includes('date')) records.sort((a,b)=>(b.year||0)-(a.year||0));
    return {results:records,page:1,totalPages:1,demo:true};
  }
  const params={page,sort_by:sort,include_adult:false};
  if (genre) params.with_genres=genre;
  if (year) params[kind==='tv'?'first_air_date_year':'primary_release_year']=year;
  if (period) {
    const dateField=kind==='tv'?'first_air_date':'primary_release_date';
    if(period==='classic')params[`${dateField}.lte`]='1989-12-31';
    else {
      const start=Number(period.slice(0,4));
      params[`${dateField}.gte`]=`${start}-01-01`;
      params[`${dateField}.lte`]=`${start+9}-12-31`;
    }
  }
  if (rating) {
    params['vote_average.gte']=rating;
    params['vote_count.gte']=100;
  }
  if (sort==='vote_average.desc') params['vote_count.gte']=200;
  const raw=await tmdb(env, `/discover/${kind}`,params);
  return {results:(raw.results||[]).map(x=>normalize(x,kind)),page:raw.page,totalPages:Math.min(raw.total_pages||1,500),demo:false};
}

export async function genreData(env, kind) {
  if (!hasToken(env)) return {genres:kind==='tv'?tvGenres:movieGenres};
  try { return await tmdb(env, `/genre/${kind}/list`); } catch { return {genres:kind==='tv'?tvGenres:movieGenres}; }
}

export async function detailData(env, kind,id) {
  if (!hasToken(env)) {
    const x=seedFind(kind,id);
    if (!x) return null;
    const n=normalize(x);
    return {...n,tagline:'Find something extraordinary.',status:'Released',
      credits:{cast:[]},videos:[],recommendations:seedList(kind).filter(y=>y.id!==Number(id)).slice(0,9).map(y=>normalize(y)),
      seasonList:kind==='tv'?Array.from({length:x.seasons||1},(_,i)=>({season_number:i+1,name:`Season ${i+1}`,episode_count:8})):[],
      demo:true, providers:[]};
  }
  const raw=await tmdb(env, `/${kind}/${id}`,{append_to_response:'credits,videos,recommendations'});
  const n=normalize(raw,kind);
  let providers=[];
  try {
    const all=await tmdb(env, `/${kind}/${id}/watch/providers`);
    const region=all?.results?.LK || all?.results?.US || null;
    if (region) providers={link:region.link,flatrate:region.flatrate||[],rent:region.rent||[],buy:region.buy||[]};
  } catch { /* optional metadata */ }
  return {...n,tagline:raw.tagline||'',status:raw.status||'',homepage:raw.homepage,
    credits:{cast:(raw.credits?.cast||[]).slice(0,16).map(c=>({id:c.id,name:c.name,character:c.character,profile:c.profile_path}))},
    videos:(raw.videos?.results||[]).filter(x=>x.site==='YouTube' && ['Trailer','Teaser'].includes(x.type)).slice(0,6),
    recommendations:(raw.recommendations?.results||[]).map(x=>normalize(x,kind)).slice(0,12),
    seasonList:(raw.seasons||[]).filter(x=>x.season_number>0).map(s=>({season_number:s.season_number,name:s.name,episode_count:s.episode_count,poster:s.poster_path})),
    providers, demo:false};
}

export async function seasonData(env, id,number) {
  if (!hasToken(env)) {
    const x=seedFind('tv',id);
    if (!x || number>(x.seasons||1)) return null;
    return {name:`Season ${number}`,season_number:number, episodes:Array.from({length:8},(_,i)=>({id:`${id}_${number}_${i+1}`,episode_number:i+1,name:`Episode ${i+1}`,overview:'Episode information will be available with your TMDB API credentials.',still_path:null,runtime:x.runtime}))};
  }
  const raw=await tmdb(env, `/tv/${id}/season/${number}`);
  return {name:raw.name,season_number:raw.season_number,episodes:(raw.episodes||[]).map(ep=>({id:ep.id,episode_number:ep.episode_number,name:ep.name,overview:ep.overview,still_path:ep.still_path,runtime:ep.runtime,vote_average:ep.vote_average}))};
}
