import test from 'node:test';
import assert from 'node:assert/strict';
import {gestureDirection,gestureRepeatCount,nextPointerPosition} from '../src/lib/remoteGestures.js';

test('classifies intentional trackpad swipes and ignores small movement',()=>{
  assert.equal(gestureDirection(12,9),'');
  assert.equal(gestureDirection(70,18),'ArrowRight');
  assert.equal(gestureDirection(-62,20),'ArrowLeft');
  assert.equal(gestureDirection(12,-55),'ArrowUp');
});

test('accelerates long focus swipes without flooding the TV',()=>{
  assert.equal(gestureRepeatCount(40,0),1);
  assert.equal(gestureRepeatCount(110,10),3);
  assert.equal(gestureRepeatCount(900,0),4);
});

test('moves and clamps the TV pointer inside the viewport',()=>{
  assert.deepEqual(nextPointerPosition({x:100,y:100},{dx:20,dy:-10},{width:500,height:300},2),{x:140,y:80});
  assert.deepEqual(nextPointerPosition({x:490,y:10},{dx:100,dy:-100},{width:500,height:300},2),{x:482,y:18});
});
