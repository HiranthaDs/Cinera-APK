import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const request=(path,options)=>worker.fetch(new Request(`https://cinera.test${path}`,options),{ENABLE_VIDY:'false'});
const requestWithVidy=(path,options)=>worker.fetch(new Request(`https://cinera.test${path}`,options),{ENABLE_VIDY:'true'});

test('health reports the Cloudflare runtime and sample fallback',async()=>{
  const response=await request('/api/health');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{
    ok:true,
    runtime:'cloudflare-workers',
    catalog:'sample',
    externalEmbed:false,
    playback:'licensed-direct',
  });
});

test('home and catalog routes work without external credentials',async()=>{
  const homeResponse=await request('/api/home');
  const home=await homeResponse.json();
  assert.equal(homeResponse.status,200);
  assert.equal(home.demo,true);
  assert.ok(home.featured.length>0);
  assert.ok(home.rows.every(row=>row.items.length>0));

  const browseResponse=await request('/api/browse/movie?page=1&sort=popularity.desc');
  const browse=await browseResponse.json();
  assert.equal(browseResponse.status,200);
  assert.equal(browse.demo,true);
  assert.ok(browse.results.length>0);

  const filteredResponse=await request('/api/browse/movie?period=2010s&rating=8&sort=vote_average.desc');
  const filtered=await filteredResponse.json();
  assert.equal(filteredResponse.status,200);
  assert.ok(filtered.results.length>0);
  assert.ok(filtered.results.every(item=>item.year>=2010&&item.year<=2019&&item.rating>=8));
});

test('detail, season and source routes validate and normalize data',async()=>{
  const detailResponse=await request('/api/title/movie/27205');
  const detail=await detailResponse.json();
  assert.equal(detailResponse.status,200);
  assert.equal(detail.title,'Inception');

  const seasonResponse=await request('/api/season/1396/1');
  const season=await seasonResponse.json();
  assert.equal(seasonResponse.status,200);
  assert.equal(season.episodes.length,8);

  const sourceResponse=await request('/api/sources/movie/10378');
  const sourceData=await sourceResponse.json();
  assert.equal(sourceResponse.status,200);
  assert.equal(sourceData.sources.length,1);
  assert.equal(sourceData.sources[0].id,'open-movie-demo');
  assert.equal(sourceData.sources[0].delivery,'direct');

  const unlicensedResponse=await request('/api/sources/movie/27205');
  const unlicensedData=await unlicensedResponse.json();
  assert.equal(unlicensedResponse.status,200);
  assert.deepEqual(unlicensedData.sources,[]);
});

test('Vidy can be enabled as the external iframe fallback',async()=>{
  const healthResponse=await requestWithVidy('/api/health');
  const health=await healthResponse.json();
  assert.equal(health.externalEmbed,true);
  assert.equal(health.playback,'licensed-direct+vidy');

  const sourceResponse=await requestWithVidy('/api/sources/tv/259909?season=1&episode=1');
  const sourceData=await sourceResponse.json();
  assert.equal(sourceResponse.status,200);
  assert.equal(sourceData.playerVersion,6);
  assert.equal(sourceData.sources.length,1);
  assert.equal(sourceData.sources[0].id,'vidy-external');
  assert.equal(sourceData.sources[0].type,'iframe');
  assert.equal(sourceData.sources[0].delivery,'embed');
  assert.equal(sourceData.sources[0].external,true);
  assert.match(sourceData.sources[0].url,/^https:\/\/www\.vidy\.st\/tv\/259909\/1\/1\?/);
});

test('invalid routes and methods return controlled JSON errors',async()=>{
  const invalid=await request('/api/title/movie/0');
  assert.equal(invalid.status,400);
  assert.equal((await invalid.json()).error,'Invalid title ID');

  const missing=await request('/api/not-a-route');
  assert.equal(missing.status,404);
  assert.equal((await missing.json()).error,'API route not found');

  const method=await request('/api/health',{method:'POST'});
  assert.equal(method.status,405);
  assert.equal((await method.json()).error,'Method not allowed');
});
