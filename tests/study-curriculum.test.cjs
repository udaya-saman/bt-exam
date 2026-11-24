'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const docs=['training','values','handbook'];
const counts=[20,12,25], pages=[20,14,68];
const all=[],ids=new Set();
docs.forEach((name,i)=>{
 const file=JSON.parse(read('study/content/'+name+'.json'));
 assert.equal(file.schemaVersion,1);
 assert.equal(file.sourceId,name);
 assert.equal(file.verified,true);
 assert.equal(file.pageCount,pages[i]);
 assert.equal(file.lessons.length,counts[i]);
 for(const lesson of file.lessons){
  assert.equal(lesson.sourceId,name);
  assert.match(lesson.id,/^[a-z][a-z0-9]+$/);
  assert(!ids.has(lesson.id),'Duplicate ID '+lesson.id);ids.add(lesson.id);
  assert(lesson.title&&lesson.summary&&lesson.pages);
  assert(lesson.sections.length>0);
  const refs=(lesson.pages.match(/\d+/g)||[]).map(Number);
  refs.forEach(p=>assert(p>=1&&p<=pages[i],name+': '+lesson.id+' page '+p));
  for(const section of lesson.sections){
   assert(section.heading.length>0);
   assert(section.body.length>0);
   assert(Array.isArray(section.keyPoints));
   assert(section.keyPoints.every(point=>typeof point==='string'&&point.length>0));
  }
  all.push(lesson);
 }
});
assert.equal(all.length,57);
const index=read('index.html');
assert.equal((index.match(/id="study-select"/g)||[]).length,1);
assert.doesNotMatch(index,/id="study-reader"/);
assert.doesNotMatch(index,/function renderStudy\(\)/);
assert.match(index,/id="study-app"/);
assert.match(index,/function openStudy\(\)/);
assert.match(index,/PizzaStudyLessons\.open\(\)/);
assert.match(index,/id="paper-select"/);
assert.match(index,/const PAPERS\s*=/);
assert.match(index,/startPaper\(paperId\)/);
assert.match(index,/study\/lesson-player\.js\?v=4\.6\.0/);
assert.match(index,/study\/lesson-player\.css\?v=4\.1\.0/);
const script=read('study/lesson-player.js');
new vm.Script(script,{filename:'study/lesson-player.js'});
assert.match(script,/Promise\.all\(FILES\.map/);
assert.match(script,/node\.textContent=String\(text\)/);
assert.match(script,/pizza-arena-study-done-v2/);
const style=read('study/lesson-player.css');
assert.match(style,/prefers-reduced-motion/);
assert.doesNotMatch(style,/<svg|\.svg\b/);
const worker=read('sw.js');
docs.forEach(name=>assert(worker.includes('study/content/'+name+'.json')));
assert.match(worker,/study\/lesson-player\.js\?v=4\.6\.0/);
assert.match(worker,/study\/lesson-player\.css\?v=4\.1\.0/);
new vm.Script(worker,{filename:'sw.js'});
const ver=JSON.parse(read('version.json')).version;
assert.equal(ver,'4.7.0-arena');
assert(read('js/bt-spark.js').includes("const APP_VERSION='4.7.0-arena'"));
assert(!read('study/lesson-player.js').includes('firebase'),'Study must not mutate rankings');
console.log('PASS: 57 source-cited lessons, JSON structure, JS syntax, offline cache, routes and scoring isolation.');

const art=read('study/lesson-art.js');new vm.Script(art,{filename:'study/lesson-art.js'});assert(index.includes('study/lesson-art.js?v=4.6.0'));assert(worker.includes('study/lesson-art.js?v=4.6.0'));assert(script.includes('PizzaStudyArt?.image'));
