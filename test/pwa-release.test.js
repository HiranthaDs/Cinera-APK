import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';

const publicFile=path=>new URL(`../public${path}`,import.meta.url);

test('voice search can request the microphone without exposing other origins',async()=>{
  const headers=await readFile(publicFile('/_headers'),'utf8');
  assert.match(headers,/Permissions-Policy:.*microphone=\(self\)/);
  assert.doesNotMatch(headers,/microphone=\(\*\)/);
});

test('the installable app references assets that ship with the release',async()=>{
  const manifest=JSON.parse(await readFile(publicFile('/manifest.webmanifest'),'utf8'));
  assert.equal(manifest.start_url,'/');
  assert.equal(manifest.scope,'/');
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
  await Promise.all(manifest.icons.map(icon=>access(publicFile(icon.src))));
});

test('the service worker uses the current TV-safe cache and syntax',async()=>{
  const worker=await readFile(publicFile('/sw.js'),'utf8');
  const cacheVersion=worker.match(/VERSION='cinera-v(\d+)-/)?.[1];
  assert.ok(Number(cacheVersion)>=5,'expected the TV playback cache generation or newer');
  assert.doesNotMatch(worker,/\basync\s+function|\?\.|\.includes\(/);

  const shell=worker.match(/var APP_SHELL=\[([\s\S]*?)\];/)?.[1]||'';
  const paths=[...shell.matchAll(/'([^']+)'/g)].map(match=>match[1]).filter(path=>path!=='/');
  assert.ok(paths.length>=6,'expected a complete offline application shell');
  await Promise.all(paths.map(path=>access(publicFile(path))));
});
