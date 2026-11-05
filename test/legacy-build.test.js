import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cspHashes} from '@vitejs/plugin-legacy';

test('allows the legacy loader scripts through the production CSP',async()=>{
  const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
  for(const hash of cspHashes)assert.match(headers,new RegExp(`'sha256-${hash.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}'`));
});
