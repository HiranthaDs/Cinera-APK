import test from 'node:test';
import assert from 'node:assert/strict';
import {detectTvDevice,detectTvIdentity,normalizeRemoteKey} from '../src/lib/tvNavigation.js';

test('detects established Android TV and smart-TV user agents',()=>{
  assert.equal(detectTvDevice({userAgent:'Mozilla/5.0 (Linux; Android 11; SHIELD Android TV Build/RQ1A)'}),true);
  assert.equal(detectTvDevice({userAgent:'Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0)'}),true);
  assert.equal(detectTvDevice({userAgent:'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.41'}),true);
  assert.equal(detectTvDevice({userAgent:'Mozilla/5.0 (webOS.TV-2022; Linux/SmartTV) AppleWebKit/537.36'}),true);
  assert.equal(detectTvDevice({userAgent:'Mozilla/5.0 (Linux; Android 9; MIBOX4 Build/PI) AppleWebKit/537.36'}),true);
  assert.equal(detectTvDevice({userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8)',width:412,height:915,coarse:true}),false);
});

test('recognizes generic lean-back Android browsers without misclassifying touch devices',()=>{
  const userAgent='Mozilla/5.0 (Linux; Android 9; Build/PPR2) AppleWebKit/537.36';
  assert.equal(detectTvIdentity({userAgent,width:960,height:540,touchPoints:0}),true);
  assert.equal(detectTvIdentity({userAgent,width:1280,height:800,touchPoints:5}),false);
});

test('uses coarse landscape dimensions as a TV fallback',()=>{
  assert.equal(detectTvDevice({width:960,height:540,coarse:true}),true);
  assert.equal(detectTvDevice({width:1366,height:768,coarse:false}),false);
  assert.equal(detectTvDevice({width:900,height:1200,coarse:true}),false);
});

test('keeps confirmed TV identity separate from touch-layout fallbacks',()=>{
  assert.equal(detectTvIdentity({userAgent:'Mozilla/5.0 (Linux; Android 11; SHIELD Android TV Build/RQ1A)'}),true);
  assert.equal(detectTvIdentity({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}),false);
  assert.equal(detectTvIdentity({userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8)',tvQuery:true}),true);
});

test('normalizes legacy Android remote key codes',()=>{
  assert.equal(normalizeRemoteKey({key:'Unidentified',keyCode:19}),'ArrowUp');
  assert.equal(normalizeRemoteKey({key:'Unidentified',keyCode:23}),'Enter');
  assert.equal(normalizeRemoteKey({key:'Left',keyCode:0}),'ArrowLeft');
  assert.equal(normalizeRemoteKey({key:'Back',keyCode:0}),'BrowserBack');
  assert.equal(normalizeRemoteKey({key:'Unidentified',keyCode:461}),'BrowserBack');
  assert.equal(normalizeRemoteKey({key:'Unidentified',keyCode:10009}),'BrowserBack');
});
