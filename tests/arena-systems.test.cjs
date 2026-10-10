'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../arena-systems.js');

test('difficulty modifiers and limits',()=>{
 assert.equal(S.DIFFICULTIES.rookie.speed<S.DIFFICULTIES.pro.speed,true);
 assert.equal(S.DIFFICULTIES.legend.keeper>S.DIFFICULTIES.pro.keeper,true);
 assert.equal(S.shotAccuracy(490,0,'legend')>S.shotAccuracy(490,0,'rookie'),true);
 assert.ok(S.shotAccuracy(290,.3,'pro')<S.shotAccuracy(290,0,'pro'));
});
test('defenders choose distinct press, intercept and cover positions',()=>{
 const actor={x:150,y:300},mate={x:280,y:210},ball={owner:'actor'};
 const positions=[0,1,2].map(i=>S.defenderDestination(i,{x:200,y:200},actor,mate,ball));
 assert.equal(new Set(positions.map(p=>p.role)).size,3);
 assert.notDeepEqual([positions[0].x,positions[0].y],[positions[1].x,positions[1].y]);
 for(const p of positions){assert.ok(p.x>=22&&p.x<=398);assert.ok(p.y>=70&&p.y<=535);}
});
test('teammate avoids defender and stays on field',()=>{
 const actor={x:80,y:340},mate={x:200,y:270};
 const empty=S.teammateDestination(actor,mate,'balanced',[]);
 const covered=S.teammateDestination(actor,mate,'balanced',[{x:empty.x,y:empty.y}]);
 assert.notEqual(covered.x,empty.x);
 assert.ok(covered.x>=44&&covered.x<=376);
});
test('keeper guesses and sometimes reads chosen corner',()=>{
 const zones=[{x:171},{x:210},{x:249}];
 assert.equal(S.keeperCommit(0,zones,'pro',0),171);
 assert.notEqual(S.keeperCommit(0,zones,'pro',.98),171);
});
test('joystick is radial, diagonal and includes a dead zone',()=>{
 assert.deepEqual(S.joystickVector(2,2,40),{x:0,y:0,px:0,py:0});
 const a=S.joystickVector(90,90,40);
 assert.ok(Math.abs(Math.hypot(a.x,a.y)-1)<1e-9);
 assert.ok(a.x>0&&a.y>0);
});
test('camera follows attack without viewport overflow',()=>{
 let camera={x:210,y:300,zoom:1};
 for(let i=0;i<100;i++)camera=S.cameraFor({x:390,y:145},{x:390,y:145,owner:'actor'},'playing',camera,.016);
 assert.ok(camera.zoom>1.15&&camera.zoom<=1.34);
 const dx=210-210/camera.zoom,dy=300-300/camera.zoom;
 assert.ok(camera.x>=210-dx-1e-7&&camera.x<=210+dx+1e-7);
 assert.ok(camera.y>=300-dy-1e-7&&camera.y<=300+dy+1e-7);
 const point={x:260,y:330};const world=S.screenToWorld(point.x,point.y,camera);
 assert.ok(Math.abs((world.x-camera.x)*camera.zoom+210-point.x)<1e-8);
});
test('reduced motion and disabled camera remain fixed',()=>{
 assert.deepEqual(S.cameraFor({x:390,y:100},{x:390,y:100},'playing',{x:250,y:280,zoom:1.3},.1,true),{x:210,y:300,zoom:1});
 assert.deepEqual(S.cameraFor({x:390,y:100},{x:390,y:100},'playing',undefined,.1,false,false),{x:210,y:300,zoom:1});
});
test('daily challenges only reward once per day',()=>{
 let state=S.freshDaily('2026-10-10');
 const awarded=[];
 for(let i=0;i<5;i++){
  const result=S.awardDaily(state,'shots','2026-10-10');
  state=result.state;awarded.push(...result.newlyCompleted);
 }
 assert.deepEqual(awarded,['shots']);
 assert.equal(state.shots,5);
 assert.equal(state.rewarded.length,1);
 assert.equal(S.normalizeDaily(state,'2026-10-11').shots,0);
});
test('progression unlocks earned badges, higher level and cosmetic milestones',()=>{
 const initial=S.progression({games:0,wins:0,goals:0,best:0},S.freshDaily('2026-10-10'));
 const grown=S.progression({games:10,wins:6,goals:17,best:3},S.freshDaily('2026-10-10'));
 assert.ok(grown.level>initial.level);
 assert.ok(grown.earned>=4);
});
