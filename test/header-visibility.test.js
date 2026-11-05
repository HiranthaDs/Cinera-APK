import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldHideWatchHeader} from '../src/lib/headerVisibility.js';

test('hides the header only after scrolling down on a watch page',()=>{
  assert.equal(shouldHideWatchHeader('/watch/movie/27205',0),false);
  assert.equal(shouldHideWatchHeader('/watch/movie/27205',64),false);
  assert.equal(shouldHideWatchHeader('/watch/movie/27205',65),true);
  assert.equal(shouldHideWatchHeader('/movies',500),false);
});
