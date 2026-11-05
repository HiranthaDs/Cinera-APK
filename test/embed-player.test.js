import test from 'node:test';
import assert from 'node:assert/strict';
import {embedUrlWithProgress,parseEmbedPlayerMessage} from '../src/lib/embedPlayer.js';

test('normalizes the current wrapped Vidy playback protocol',()=>{
  const message=JSON.stringify({type:'PLAYER_EVENT',data:{event:'timeupdate',timestamp:42.8,duration:120}});
  assert.deepEqual(parseEmbedPlayerMessage(message),{event:'timeupdate',currentTime:42.8,duration:120});
});

test('keeps compatibility with legacy flat embed events',()=>{
  assert.deepEqual(parseEmbedPlayerMessage({event:'play',currentTime:5,duration:90}),{event:'play',currentTime:5,duration:90});
  assert.equal(parseEmbedPlayerMessage({type:'MEDIA_DATA',data:'history'}),null);
  assert.equal(parseEmbedPlayerMessage('not-json'),null);
});

test('adds or replaces a safe integer resume position',()=>{
  assert.equal(embedUrlWithProgress('https://www.vidy.st/movie/315162?autoplay=true',91.9),'https://www.vidy.st/movie/315162?autoplay=true&progress=91');
  assert.equal(embedUrlWithProgress('https://www.vidy.st/movie/315162?progress=4',12),'https://www.vidy.st/movie/315162?progress=12');
});
