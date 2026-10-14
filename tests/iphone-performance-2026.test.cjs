'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const perf=require('../iphone-performance-2026.js');
test('endurance report calculates frame percentiles and retains memory limits',()=>{
 const summary=perf.summarize([{fps:58,longFrames:2,renderScale:1.3,heapMB:72},{fps:45,longFrames:3,renderScale:1.1,heapMB:78},{fps:28,longFrames:4,renderScale:1,heapMB:80}]);
 assert.equal(summary.samples,3);assert.equal(summary.medianFps,45);assert.equal(summary.worstFps,28);assert.equal(summary.heapGrowthMB,8);
 assert.ok(summary.averageJankPerMinute>0);
});
test('empty perf sample set is safe',()=>{assert.equal(perf.summarize([]).medianFps,null)});
