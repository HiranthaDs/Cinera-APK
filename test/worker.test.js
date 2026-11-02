import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const request=(path,options)=>worker.fetch(new Request(`https://cinera.test${path}`,options),{ENABLE_VIDY:'false'});

test('health reports the Cloudflare runtime and sample fallback',async()=>{
  const response=await request('/api/health');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{
    ok:true,
    runtime:'cloudflare-workers',
    catalog:'sample',
    externalEmbed:false,
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
