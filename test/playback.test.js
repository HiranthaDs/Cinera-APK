import test from 'node:test';
import assert from 'node:assert/strict';
import {nextAvailableSourceIndex} from '../src/lib/playback.js';

const sources=[{id:'one'},{id:'two'},{id:'three'}];

test('playback failover advances and wraps through healthy servers',()=>{
  assert.equal(nextAvailableSourceIndex(sources,0,new Set()),1);
  assert.equal(nextAvailableSourceIndex(sources,2,new Set()),0);
  assert.equal(nextAvailableSourceIndex(sources,0,new Set(['two'])),2);
});

test('playback failover stops when no alternative is healthy',()=>{
  assert.equal(nextAvailableSourceIndex([{id:'one'}],0,new Set()),-1);
  assert.equal(nextAvailableSourceIndex(sources,1,new Set(['one','three'])),-1);
});
