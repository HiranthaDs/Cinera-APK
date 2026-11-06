import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('keeps phone safe areas and TV breakpoints in the release CSS',async()=>{
  const css=await read('src/device.css');
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.tv-ui \.catalog-grid[^}]*repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(min-width:1400px\)[\s\S]*repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(min-width:761px\) and \(max-height:700px\) and \(orientation:landscape\)/);
  assert.match(css,/\.tv-ui\.remote-input[^}]*outline:4px solid #fff/);
});

test('declares an edge-to-edge viewport and primary TV autofocus targets',async()=>{
  const [html,browse,details,home,video]=await Promise.all([
    read('index.html'),
    read('src/pages/Browse.jsx'),
    read('src/pages/Details.jsx'),
    read('src/pages/Home.jsx'),
    read('src/components/VideoFrame.jsx'),
  ]);
  assert.match(html,/viewport-fit=cover/);
  for(const source of [browse,details,home,video])assert.match(source,/data-tv-autofocus/);
});

test('ships one APK manifest for touch devices and Android TV launchers',async()=>{
  const manifest=await read('android/app/src/main/AndroidManifest.xml');
  assert.match(manifest,/android\.software\.leanback/);
  assert.match(manifest,/android\.hardware\.touchscreen"\s+android:required="false"/);
  assert.match(manifest,/android\.intent\.category\.LEANBACK_LAUNCHER/);
  assert.match(manifest,/android:banner="@drawable\/tv_banner"/);
});
