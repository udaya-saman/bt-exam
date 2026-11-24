'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const read=file=>fs.readFileSync(file,'utf8');
const docs=['bt-oct-2025','las-2025','las-jan-2026'].map(id=>JSON.parse(read('assessments/'+id+'.json')));
assert.deepEqual(docs.map(x=>x.questions.length),[27,30,27],'All readable questions transcribed by assessment');
const seenByPaper=new Set();
for(const doc of docs){
 assert.equal(doc.schema,1);
 assert.ok(doc.id&&doc.title&&Array.isArray(doc.sourceImages)&&doc.sourceImages.length>=3);
 for(const q of doc.questions){
  assert(Number.isInteger(q.n)&&q.n>0);
  assert(typeof q.q==='string'&&q.q.length>=10);
  assert(Array.isArray(q.options));
  assert(q.options.every(o=>typeof o==='string'&&o.length>0));
  assert(!Object.hasOwn(q,'ans'),'No unverified answer may be published as a scored key');
  assert(!Object.hasOwn(q,'correct'),'No unverified answer may be published as a scored key');
  const ref=doc.id+':'+q.n;assert(!seenByPaper.has(ref),'Duplicate paper question '+ref);seenByPaper.add(ref);
 }
}
assert.deepEqual(docs[2].missingQuestionNumbers,[17,18,19]);
assert.deepEqual(docs[2].questions.filter(x=>x.n>16&&x.n<20),[]);
assert.equal(docs[0].questions.find(x=>x.n===17).options[0],'Nacho Cheese 600 g / Kottchi Sauce 400 g');
assert.equal(docs[1].questions.find(x=>x.n===22).options[1],'3 min / 5 min / 10 min');
assert.equal(docs[2].questions.find(x=>x.n===13).options[2],'21–49°C / above 49°C / 5–65°C / 22–26°C');
const ctx={window:{}};new vm.Script(read('js/assessment-bank.js'),{filename:'js/assessment-bank.js'}).runInNewContext(ctx);
const merged=ctx.window.BTAssessmentBank.groupPapers(docs);
assert.equal(docs.reduce((sum,x)=>sum+x.questions.length,0),84);
assert.equal(merged.groups.length,75,'Repeated question variants must show as one card');
assert.equal(new Set(merged.groups.map(x=>x.key)).size,75);
assert.equal(merged.groups.reduce((sum,x)=>sum+x.variants.length,0),84,'No original question lost');
for(const g of merged.groups){
 assert(new Set(g.variants.map(v=>v.paper+':'+v.n)).size===g.variants.length);
}
const html=read('index.html'),sw=read('sw.js'),css=read('css/assessment-bank.css');
assert.match(html,/id="assessment-library"/);
assert.match(html,/id="assessment-bank-root"/);
assert.match(html,/BTAssessmentBank\?\.open\(\)/);
assert.match(html,/js\/assessment-bank\.js\?v=4\.7\.0/);
assert.match(html,/css\/assessment-bank\.css\?v=4\.7\.0/);
for(const id of docs.map(x=>x.id))assert(sw.includes('./assessments/'+id+'.json'),'Missing offline question pack '+id);
assert(sw.includes('./js/assessment-bank.js?v=4.7.0'));
assert(sw.includes('./css/assessment-bank.css?v=4.7.0'));
assert.match(css,/pa-assessment-card/);
assert.match(css,/max-width:390px/);
assert.equal(JSON.parse(read('version.json')).version,'4.7.0-arena');
assert(read('js/bt-spark.js').includes("APP_VERSION='4.7.0-arena'"));
// Preserve existing ranked question indexes and paper counts for Firebase validation.
const a=html.indexOf('const PAPERS = {'),b=html.indexOf('window.BT_EXAM_PAPERS = PAPERS;',a);
assert(a>=0&&b>a);
const papers=vm.runInNewContext(html.slice(a,b)+'\nPAPERS;');
assert.deepEqual(['past2024','questions','paper1','paper2','paper3'].map(k=>papers[k].qs.length),[29,40,50,50,45]);
assert(!Object.keys(papers).some(k=>k.includes('las-')||k.includes('assessment-')),'New review questions must not mutate ranked papers');
console.log('PASS: 84 image-transcribed entries consolidated to 75 unique assessment questions; no answer keys fabricated, 214 ranked questions preserved.');
