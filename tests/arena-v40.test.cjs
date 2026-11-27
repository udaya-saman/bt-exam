'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const get=file=>fs.readFileSync(file,'utf8');
const html=get('index.html'),app=get('js/bt-spark.js'),rewards=get('js/bt-rewards.js'),art=get('js/pizza-reference.js');
const css=get('css/pizza-arena-v40.css'),sw=get('sw.js'),rules=get('firestore.rules'),version=JSON.parse(get('version.json')).version;
for(const [file,source] of Object.entries({'js/bt-spark.js':app,'js/bt-rewards.js':rewards,'js/pizza-reference.js':art,'sw.js':sw}))
 assert.doesNotThrow(()=>new vm.Script(source,{filename:file}),file+' must parse');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script));
const beginning=html.indexOf('const PAPERS = {'),end=html.indexOf('window.BT_EXAM_PAPERS = PAPERS;',beginning);
const papers=vm.runInNewContext(html.slice(beginning,end)+'\nPAPERS;');
const expected={past2024:29,questions:40,paper1:50,paper2:50,paper3:45};
assert.deepEqual(Object.fromEntries(Object.entries(papers).map(([key,p])=>[key,p.qs.length])),expected);
let count=0;
for(const [id,paper] of Object.entries(papers))for(const [index,question] of paper.qs.entries()){
 assert.ok(Number.isInteger(question.ans)&&question.ans>=0&&question.ans<question.opts.length,id+' question '+index);
 count++;
}
assert.equal(count,214);
const context={window:{}};vm.runInNewContext(rewards,context);
const api=context.window.BTRewards;
assert.equal(api.level(602).number,2);
assert.equal(api.level(602).next,1000);
assert.equal(api.level(602).percent,20);
const week='2026-11-23';
assert.equal(api.achievements({weeklyPoints:{[week]:2000}},week,week).find(x=>x.id==='weekly-50').unlocked,true);
assert.equal(api.achievements({outletWeeklyAnswers:{[week+'__Matara']:2000}},week,week).find(x=>x.id==='weekly-50').unlocked,false);
assert.equal(api.achievements({totalPoints:1500},week,week).find(x=>x.id==='rising-star').unlocked,true);
assert.ok(html.includes('id="paper-select"')&&html.includes('id="study-select"')&&html.includes('id="study-app"'));
assert.ok(!html.includes('id="study-reader"')&&html.includes('PizzaStudyLessons.open()'));
assert.ok(html.includes('class="arena-paths"'));
assert.equal(expected.past2024,29);
const questionsCss=get('css/questions-v477.css');
const startLibrary=html.indexOf('<!-- QUESTIONS LIBRARY:'),endLibrary=html.indexOf('<!-- Bilingual assessment practice;',startLibrary);
assert.ok(startLibrary>=0&&endLibrary>startLibrary,'Questions library section is intact');
const library=html.slice(startLibrary,endLibrary);
const cardIds=[...library.matchAll(/data-paper="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(cardIds,[...Object.keys(expected),'assessment-practice'],'Original five scored papers and one deduplicated practice card present');
for(const [id,size] of Object.entries(expected)){
 assert.ok(library.includes('onclick="startPaper(\''+id+'\')"'),'Original paper action retained: '+id);
 assert.ok(!library.includes('questions-paper-count'),'Paper counts are hidden');
}
assert.equal((library.match(/class="paper-card questions-paper"/g)||[]).length,5,'Five native exam buttons');
assert.ok(library.includes('pa-study-hero')&&library.includes('home-questions.png'),'Brand PNG hero present');
assert.ok(!library.includes('pa-assessment-entry')&&!html.includes('id="assessment-library"'),'Old standalone Assessment Bank section removed');
assert.ok(library.includes('Assessment Practice')&&!library.includes('questions-paper-action'),'New bilingual practice card has no secondary CTA');
assert.ok(html.includes('id="assessment-practice"')&&html.includes('assessment-practice-root'),'Bilingual practice page present');
assert.ok(html.includes('css/questions-v477.css?v=4.7.19')&&sw.includes('css/questions-v477.css?v=4.7.19'),'Questions styling enabled and cached offline');

const pressStyle=get('css/press-feedback-v477.css'),pressLogic=get('js/press-feedback-v477.js');
assert.doesNotThrow(()=>new vm.Script(pressLogic,{filename:'press-feedback-v477.js'}),'App-wide press logic parses');
assert.ok(html.includes('css/press-feedback-v477.css?v=4.7.16')&&sw.includes('css/press-feedback-v477.css?v=4.7.16'),'Press CSS loaded and cached for offline use');
assert.ok(html.includes('js/press-feedback-v477.js?v=4.7.7')&&sw.includes('js/press-feedback-v477.js?v=4.7.7'),'Press keyboard/touch logic loaded and cached');
for(const page of ['paper-select','study-select','assessment-practice']){
 assert.ok(pressStyle.includes('#'+page+'.active'),'Duplicate bottom-right dock is hidden on '+page);
}
assert.ok(pressStyle.includes('prefers-reduced-motion:reduce'),'Tap feedback respects reduced motion');
assert.ok(pressLogic.includes("'pointerdown'")&&pressLogic.includes("'pointerup'")&&pressLogic.includes("'keydown'"),'Both pointer and keyboard feedback present');
assert.ok(pressLogic.includes('arena-pressing')&&pressLogic.includes('arena-pressed'),'Transient pressed states defined');

const quiz=html.slice(html.indexOf('<div id="quiz" class="screen">'),html.indexOf('<!-- RESULTS SCREEN -->'));
assert.ok(quiz.includes('<div class="quiz-body">')&&quiz.includes('id="q-text"')&&quiz.includes('id="opts"'),'Original quiz structure retained');
assert.doesNotMatch(quiz,/questions-question-panel|questions-answers-head|questions-timer-hint/,'No redesigned quiz wrappers');
assert.ok(!questionsCss.includes('#quiz'),'Paper selection stylesheet must not override quiz styles');
assert.ok(questionsCss.includes('@media(max-width:350px)')&&questionsCss.includes('prefers-reduced-motion:reduce'),'Small-phone and accessibility styles present');
assert.ok(!library.includes('.svg')&&!questionsCss.includes('.svg')&&!library.includes('<svg')&&!questionsCss.includes('<svg'),'No SVG graphics added');

assert.ok(app.includes("people>=2")&&!app.includes("people>=3"));
assert.ok(app.includes("practice?'PRACTICE · NO RANK POINTS'"));
assert.ok(app.includes('setTimeout(()=>pill.remove(),4000)'));
assert.ok(app.includes('10+remaining')&&rules.includes('10 + request.resource.data.remaining'));
assert.ok(app.includes("status.append(symbol,statusCopy,statusMascot)")&&app.includes('syncStatus.append(status,syncButton)'));
assert.ok(app.includes('window.BTProfileSave.save({'),'Account Settings Save must delegate to verified profile transaction');
assert.ok(html.includes('js/account-profile-save.js?v=4.7.16'),'Account transaction module must load');
assert.ok(!app.includes("btn('Save Password'"),'Password save must use main Save button');
assert.ok(app.includes('passwordFields.hidden=true'));
assert.ok(!app.includes('Save a Copy')&&!app.includes('Save My Progress'));
assert.ok(app.includes('async function seedKeys()'));
assert.ok(app.includes("who.append(tiny)"),'leaderboard must not reference an undefined detail variable');
assert.ok(css.includes('arena-point-toast 4s')&&css.includes('.sound-off')&&css.includes('arena-update-now'));
assert.ok(sw.includes('pizza-arena-v40.css?v=4.0.1'));
assert.ok(html.includes('pizza-reference.js?v=4.7.18')&&sw.includes('pizza-reference.js?v=4.7.18'));
assert.ok(app.includes("APP_VERSION='"+version+"'"));
assert.doesNotMatch(css+art,/\.svg|data:image\/svg|<svg/i);
console.log('Pizza Arena 4.0: 214 question keys, scoring, achievements, screens, account settings, version and UI contracts passed.');
