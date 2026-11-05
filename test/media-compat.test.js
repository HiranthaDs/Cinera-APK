import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHlsType,toggleFullscreen} from '../src/lib/mediaCompat.js';

test('checks the native HLS MIME variants used by TV browsers',()=>{
  const checked=[];
  const media={canPlayType:type=>{checked.push(type);return type==='application/x-mpegURL'?'maybe':'';}};
  assert.equal(nativeHlsType(media),'application/x-mpegURL');
  assert.deepEqual(checked,['application/vnd.apple.mpegurl','application/x-mpegURL']);
});

test('uses vendor fullscreen APIs and exits an existing fullscreen session',async()=>{
  let requested=false,exited=false;
  const target={webkitRequestFullScreen(){requested=true;}};
  await toggleFullscreen(target,null,{});
  assert.equal(requested,true);

  const doc={webkitFullscreenElement:{},webkitCancelFullScreen(){exited=true;}};
  await toggleFullscreen(target,null,doc);
  assert.equal(exited,true);
});

test('falls back to the media fullscreen API used by older TV engines',async()=>{
  let entered=false;
  await toggleFullscreen({}, {webkitEnterFullscreen(){entered=true;}}, {});
  assert.equal(entered,true);
});
