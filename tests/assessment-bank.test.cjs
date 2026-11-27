'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const read=file=>fs.readFileSync(file,'utf8');
const json=file=>JSON.parse(read(file));
const ids=['bt-oct-2025','las-2025','las-jan-2026'];
const docs=ids.map(id=>json('assessments/'+id+'.json'));
const translations=[1,2,3,4].flatMap(n=>json('assessments/si-part-'+n+'.json'));
const proposals=json('assessments/proposed-answers.json');
const html=read('index.html'),sw=read('sw.js'),app=read('js/bt-spark.js');
const css=read('css/assessment-practice.css');
const practice=read('js/assessment-practice.js');
assert.deepEqual(docs.map(x=>x.questions.length),[40,30,27]);
assert.equal(docs.reduce((n,x)=>n+x.questions.length,0),97,'All 97 workbook entries are preserved in source packs');
assert.deepEqual(docs[2].missingQuestionNumbers,[17,18,19],'Missing scan question numbers must not be invented');
assert.equal(proposals.schema,1);
assert.equal(proposals.excludedDuplicateRows.length,11,'Nine duplicated scan topics plus two already scored');
assert.equal(new Set(proposals.excludedDuplicateRows).size,11,'Excluded rows unique');
assert.equal(translations.length,86);
assert.equal(new Set(translations.map(x=>x[0])).size,86,'One Sinhala translation per new question');
assert.equal(Object.keys(proposals.answers).length,86);
const sourceRows=docs.flatMap((doc,p)=>doc.questions.map((q,i)=>({
 id:[0,40,70][p]+i+1,doc:doc.id,q,
 key:q.key?'topic:'+String(q.key).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim():'stem:'+String(q.q).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
})));
const unique=new Set(sourceRows.map(x=>x.key));
assert.equal(unique.size,88,'97 scanned entries contain 88 distinct source topics');
const byId=new Map(sourceRows.map(x=>[x.id,x]));
let missing=0,written=0,multiple=0,invalid=0;
for(const [number,q,opts] of translations){
 const row=byId.get(number),answer=proposals.answers[String(number)];
 assert(row,'Translation refers to a real workbook row '+number);
 assert(!proposals.excludedDuplicateRows.includes(number),'Duplicated topic not surfaced twice '+number);
 assert(typeof q==='string'&&q.trim(),'Missing Sinhala question '+number);
 assert.equal(row.q.options.length,opts.length,'English and Sinhala options align at row '+number);
 assert(answer,'Missing proposed answer '+number);
 assert(!Object.hasOwn(row.q,'ans')&&!Object.hasOwn(row.q,'correct'),'Unverified answers must not be inserted into scored Firebase question packs');
 if(!opts.length){
  written++;
  assert(answer.suggested&&answer.siSuggested,'Written answers should have bilingual proposals '+number);
 }else{
  assert(Array.isArray(answer.correct),'Multiple choice needs a proposed option list '+number);
  for(const n of answer.correct)assert(Number.isInteger(n)&&n>=1&&n<=opts.length,'Bad proposed choice index at '+number);
  if(answer.correct.length>1)multiple++;
  if(!answer.correct.length){invalid++;assert(answer.suggested&&answer.siSuggested,'No valid option must be explained');}
 }
}
const kept=sourceRows.filter(row=>!proposals.excludedDuplicateRows.includes(row.id));
assert.equal(kept.length,86);
assert.equal(new Set(kept.map(row=>row.key)).size,86,'No duplicate assessment topic shown');
assert.equal(written,9,'One repeated written question was removed');
assert.equal(multiple,5,'Five multi-answer questions remain multi-select');
assert.equal(invalid,1,'Question with no valid option must be flagged, not incorrectly graded');
assert.ok(proposals.answers[57].review&&proposals.answers[64].review,'Scanned truncated options remain reviewable');
assert.ok(proposals.answers[92].review&&proposals.answers[92].correct.length===0,'Flawed negative question not assigned a false answer');
assert.ok(!html.includes('id="assessment-library"')&&!html.includes('BTAssessmentBank?.open'),'Redundant assessment bank screen removed');
assert.ok(html.includes('id="assessment-practice"')&&html.includes('id="assessment-practice-root"'));
assert.ok(html.includes('window.BTAssessmentPractice?.open()'),'Bilingual practice accessible in Questions');
assert.ok(html.includes('css/assessment-practice.css?v=4.7.10'));
assert.ok(html.includes('js/assessment-practice.js?v=4.7.18'));
for(const file of ['js/assessment-practice.js?v=4.7.18','css/assessment-practice.css?v=4.7.10',
 ...[1,2,3,4].map(n=>'assessments/si-part-'+n+'.json'),'assessments/proposed-answers.json']){
 assert(sw.includes(file),'Offline pre-cache includes '+file);
}
assert(css.includes('#assessment-practice { padding: 0; background: var(--bg-color); }'),'Practice uses original quiz background');
const practiceMarkup=html.slice(html.indexOf('<div id="assessment-practice" class="screen">'),html.indexOf('<!-- STUDY ACADEMY'));
for(const cls of ['quiz-bar','quiz-top','score-pill','prog-bar','timer-bar','quiz-body','q-header-row','q-badge','translate-btn','q-text','timer-row','opts','bottom-bar','home-btn','reset-btn','next-btn'])assert(practiceMarkup.includes('class="'+cls+'"')||practiceMarkup.includes('class="'+cls+' '),'Shared quiz class: '+cls);
assert(!practiceMarkup.includes('aq-hero')&&!practice.includes('aq-question-card'),'One question at a time');
assert(practice.includes('remaining=60')&&practice.includes('setInterval(tick,250)'),'Same 60-second countdown');
assert(!practice.includes('localStorage')&&!practice.includes('BTExamBridge'),'Practice cannot overwrite saved ranked progress');
assert(practice.includes("classList.toggle('correct'")&&practice.includes("classList.toggle('wrong'"),'Shared answer styles');
assert(!practice.includes('BTExamBridge?.onAnswer')&&!practice.includes('scoreEvents')&&!practice.includes('rankedClaims'),'Provisional practice does not award or submit scores');
new vm.Script(practice,{filename:'js/assessment-practice.js'});
// Runtime loader test, including exact source-to-workbook ordinal mapping.
const fixtures={};
ids.forEach((id,i)=>fixtures['./assessments/'+id+'.json']=docs[i]);
[1,2,3,4].forEach(n=>fixtures['./assessments/si-part-'+n+'.json']=json('assessments/si-part-'+n+'.json'));
fixtures['./assessments/proposed-answers.json']=proposals;
const sandbox={window:{},console,fetch:async url=>({
 ok:Object.hasOwn(fixtures,url),json:async()=>fixtures[url]
})};
vm.runInNewContext(practice,sandbox,{filename:'assessment-practice.js'});
(async()=>{
 const practiceApi=sandbox.window.BTAssessmentPractice;
 const loaded=JSON.parse(JSON.stringify(await practiceApi.load()));
 assert.equal(loaded.length,86);
 assert.equal(loaded.filter(x=>!x.opts.length).length,9);
 assert(loaded.some(x=>x.row===1&&x.sources.includes('las-2025')),'Deduplicated RIIT answer cites both relevant source assessments');
 assert(!loaded.some(x=>x.row===21||x.row===63),'Already graded questions not repeated');
 assert(loaded.some(x=>x.row===97&&x.q.includes('attrition')),'Final question included');
 // Old scored question IDs, answer indexes and quantities are unchanged.
 const a=html.indexOf('const PAPERS = {'),b=html.indexOf('window.BT_EXAM_PAPERS = PAPERS;',a);
 assert(a>=0&&b>a);
 const papers=vm.runInNewContext(html.slice(a,b)+'\nPAPERS;');
 assert.deepEqual(['past2024','questions','paper1','paper2','paper3'].map(k=>papers[k].qs.length),[29,40,50,50,45]);
 assert(!Object.keys(papers).some(k=>k.includes('assessment')),'New proposals are never published as scored paper keys');
 const version=json('version.json').version;
 assert.equal(version,'4.7.18-arena');
 assert(app.includes("const APP_VERSION='"+version+"'"));
 console.log('PASS: 97 source entries, 9 within-source duplicates and 2 existing-paper overlaps -> 86 bilingual practice cards; 86 provisional answer keys; 214 original ranked questions unchanged.');
})().catch(error=>{console.error(error);process.exitCode=1;});
