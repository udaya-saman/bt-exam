'use strict';
/* Real Firestore emulator acceptance tests: both a private administrator
   username and a ranked-outlet player must record an accepted answer. */
const fs=require('fs'), assert=require('node:assert/strict');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,runTransaction,Timestamp}=require('firebase/firestore');
const p=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'});
function day(d){const parts=p().formatToParts(d),g=type=>parts.find(x=>x.type===type).value;return g('year')+'-'+g('month')+'-'+g('day');}
function week(d){const x=new Date(day(d)+'T00:00:00Z');x.setUTCDate(x.getUTCDate()-(x.getUTCDay()+6)%7);return x.toISOString().slice(0,10);}
function initial(uid,username,outlet){
 return {uid,username,usernameLower:username.toLowerCase(),outlet,avatar:'',
 totalPoints:0,totalAnswers:0,correctAnswers:0,weeklyPoints:{},monthlyPoints:{},
 outletPoints:{},outletWeeklyPoints:{},outletMonthlyPoints:{},
 outletAnswers:{},outletWeeklyAnswers:{},outletMonthlyAnswers:{},
 dailyActivity:{},rapidCorrectStreak:0,reviewSuggested:false,lastEventId:'',
 createdAt:Timestamp.now(),updatedAt:Timestamp.now()};
}
const canonical=(paper,index)=>paper==='questions'&&index===14?'past2024_22':paper==='paper1'&&index===9?'questions_7':paper+'_'+index;
async function run(){
 const env=await initializeTestEnvironment({projectId:'demo-bt-exam',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  const now=new Date(),yesterday=new Date(now.getTime()-86400000);
  const profiles=[['test-udaya-private','udaya','Other',false],['test-matara-player','tester','Matara',true],['test-second-player','tester2','Matara',true],['test-legacy-player','legacy','Matara',true]];
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   for(const [uid,username,outlet] of profiles){
    const p=initial(uid,username,outlet);
    if(uid==='test-legacy-player'){delete p.outletMonthlyAnswers;delete p.outletMonthlyPoints;delete p.outletWeeklyAnswers;}
    await setDoc(doc(db,'users',uid),p);
   }
   await setDoc(doc(db,'publicRanks','test-legacy-player'),{uid:'test-legacy-player',name:'legacy',outlet:'Matara',avatar:'',lastEventId:'',totalPoints:0,correctAnswers:0,weeklyPoints:{},monthlyPoints:{},outletPoints:{},outletWeeklyPoints:{},outletAnswers:{},dailyActivity:{},updatedAt:Timestamp.now()});
   for(const [paper,index,answer] of [['paper1',0,0],['paper1',1,0],['paper1',2,0],['paper1',9,0],['questions',7,0],['past2024',22,2],['questions',14,2]])await setDoc(doc(db,'answerKeys',paper+'_'+index),{paper,index,answer});
  });
  const write=async(uid,paper,index,selected,date,attemptId='attempt1234567890',force=false,overrideId=null)=>{
   const [_,username,outlet,publicRank]=profiles.find(p=>p[0]===uid);
   const db=env.authenticatedContext(uid,{email:'bt-fake@users.bt-exam.example.com'}).firestore();
   const at=Timestamp.fromDate(date),dayKey=day(date),weekKey=week(date),monthKey=dayKey.slice(0,7);
   const eid=overrideId||uid+'_q_'+dayKey+'_'+canonical(paper,index);
   const right=selected===(paper==='past2024'||index===14?2:0),points=right?25:0;
   const e={uid,paper,index,selected,remaining:right?15:0,points,attemptId,dayKey,weekKey,monthKey,outlet,outletWeekKey:weekKey+'__'+outlet,
    outletMonthKey:monthKey+'__'+outlet,activityDay:dayKey,earnedAt:at};
   const inc=(m,k,n)=>({...m,[k]:Number((m||{})[k]||0)+n});
   return runTransaction(db,async tx=>{
    const userRef=doc(db,'users',uid),eventRef=doc(db,'scoreEvents',eid),pubRef=doc(db,'publicRanks',uid);
    const [existing,profile,pub]=await Promise.all([tx.get(eventRef),tx.get(userRef),tx.get(pubRef)]);
    if(existing.exists()&&!force)return 'duplicate';
    const u=profile.data(),wk=e.outletWeekKey,mk=e.outletMonthKey;
    tx.set(eventRef,e);
    const up={lastEventId:eid,totalPoints:u.totalPoints+points,totalAnswers:u.totalAnswers+1,
      correctAnswers:u.correctAnswers+(right?1:0),dailyActivity:inc(u.dailyActivity,dayKey,1),
      rapidCorrectStreak:0,reviewSuggested:false,
      weeklyPoints:inc(u.weeklyPoints,weekKey,points),monthlyPoints:inc(u.monthlyPoints,monthKey,points),
      outletPoints:inc(u.outletPoints,outlet,points),outletWeeklyPoints:inc(u.outletWeeklyPoints,wk,points),
      outletMonthlyPoints:inc(u.outletMonthlyPoints,mk,points),outletAnswers:inc(u.outletAnswers,outlet,1),
      outletWeeklyAnswers:inc(u.outletWeeklyAnswers,wk,1),outletMonthlyAnswers:inc(u.outletMonthlyAnswers,mk,1),updatedAt:at};
    tx.update(userRef,up);
    if(publicRank){
      const b=pub.exists()?pub.data():{};
      tx.set(pubRef,{uid,name:username,outlet,avatar:'',lastEventId:eid,totalPoints:Number(b.totalPoints||0)+points,correctAnswers:Number(b.correctAnswers||0)+(right?1:0),
       dailyActivity:inc(b.dailyActivity||{},dayKey,1),weeklyPoints:inc(b.weeklyPoints||{},weekKey,points),
       monthlyPoints:inc(b.monthlyPoints||{},monthKey,points),outletPoints:inc(b.outletPoints||{},outlet,points),
       outletWeeklyPoints:inc(b.outletWeeklyPoints||{},wk,points),outletMonthlyPoints:inc(b.outletMonthlyPoints||{},mk,points),
       outletAnswers:inc(b.outletAnswers||{},outlet,1),outletWeeklyAnswers:inc(b.outletWeeklyAnswers||{},wk,1),
       outletMonthlyAnswers:inc(b.outletMonthlyAnswers||{},mk,1),updatedAt:at});
    }
    return 'saved';
   });
  };
  const checkDb=env.authenticatedContext('test-matara-player').firestore();
  const missing=await getDoc(doc(checkDb,'syncChecks','daily-v4714'));assert.equal(missing.exists(),false);
  assert.equal((await getDoc(doc(checkDb,'syncKeyChecks','paper1_0'))).exists(),false);
  await assert.rejects(()=>getDoc(doc(checkDb,'syncKeyChecks','paper1_49')),/permission-denied|PERMISSION_DENIED/);
  await assert.rejects(()=>getDoc(doc(checkDb,'answerKeys','paper1_0')),/permission-denied|PERMISSION_DENIED/);
  await assert.rejects(()=>getDoc(doc(env.unauthenticatedContext().firestore(),'syncChecks','daily-v4714')),/permission-denied|PERMISSION_DENIED/);
  for(const [uid,username,outlet,publicRank] of profiles){
   assert.equal(await write(uid,'paper1',0,0,now),'saved');
   assert.equal(await write(uid,'paper1',1,0,now,'attempt2222222222'),'saved','Unanswered question counts on a restarted paper');
   assert.equal(await write(uid,'paper1',0,0,now,'attempt3333333333'),'duplicate','Exact repeat has no score');
   await assert.rejects(()=>write(uid,'paper1',0,0,now,'attempt3333333333',true),/permission-denied|PERMISSION_DENIED/,'Cannot overwrite a daily score event');
   assert.equal(await write(uid,'paper1',2,1,now),'saved','Wrong first answer is recorded');
   assert.equal(await write(uid,'paper1',2,0,now,'attempt3333333333'),'duplicate','Correct retry after wrong is not scored');
   assert.equal(await write(uid,'paper1',0,0,yesterday),'saved','Different Sri Lankan day earns points');
   assert.equal(await write(uid,'questions',7,0,now),'saved');
   assert.equal(await write(uid,'paper1',9,0,now),'duplicate','Same stem across papers uses one event');
   await assert.rejects(()=>write(uid,'paper1',9,0,now,'attempt3333333333',false,uid+'_q_'+day(now)+'_paper1_9'),/permission-denied|PERMISSION_DENIED/,'Canonical alias enforced by rules');
   const db=env.authenticatedContext(uid).firestore();
   const updated=await getDoc(doc(db,'users',uid));assert.equal(updated.data().totalPoints,100);assert.equal(updated.data().totalAnswers,5);assert.equal(updated.data().correctAnswers,4);
   const rank=await getDoc(doc(db,'publicRanks',uid));assert.equal(rank.exists(),publicRank);if(publicRank)assert.equal(rank.data().totalPoints,100);
   console.log('Daily question scoring accepted for '+username+' ('+outlet+'); restarts, wrong first, cross-paper alias, separate day and separate users verified.');
  }
  // Existing same-day legacy paper events cannot be credited again.
  const uid='test-matara-player',d=day(now),attemptId='legacy1234567890';
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   await setDoc(doc(db,'rankedClaims',uid+'_'+d+'_past2024'),{uid,paper:'past2024',dayKey:d,attemptId,startedAt:Timestamp.fromDate(now)});
   await setDoc(doc(db,'scoreEvents',uid+'_'+attemptId+'_past2024_22'),{uid,activityDay:d,points:25});
  });
  await assert.rejects(()=>write(uid,'questions',14,2,now),/permission-denied|PERMISSION_DENIED/,'Legacy alias answer cannot be credited again');
  const otherDb=env.authenticatedContext('test-second-player').firestore();
  await assert.rejects(()=>setDoc(doc(otherDb,'rankedClaims','test-second-player_'+d+'_paper1'),{uid:'test-second-player',paper:'paper1',dayKey:d,attemptId,startedAt:Timestamp.fromDate(now)}),/permission-denied|PERMISSION_DENIED/,'Old clients cannot create whole-paper claims');
  console.log('Legacy same-day migration and obsolete paper claims verified.');

  // Run the real application queue processor with an authenticated emulator SDK.
  // The older test above constructs an independent transaction; it cannot catch
  // bugs in browser queue reconciliation or skipped sync calls.
  const F=require('firebase/firestore');
  const app=fs.readFileSync('js/bt-spark.js','utf8');
  const recoveryUid='test-real-queue',recoveryOutlet='Matara';
  const db=env.authenticatedContext(recoveryUid,{email:'bt-queue@example.test'}).firestore();
  const oldDate=new Date(now.getTime()-96*3600000);
  const queued=(index,when=now,overrides={})=>({uid:recoveryUid,id:'local-'+index+'-'+when.getTime(),paper:'paper1',index,earnedAt:when.getTime(),selected:0,remaining:15,points:25,attemptId:'attempt1234567890',outlet:recoveryOutlet,...overrides});
  const recovered=queued(0,oldDate),fresh=queued(1),oldId=recoveryUid+'_q_'+day(oldDate)+'_paper1_0';
  const oldDay=day(oldDate),oldWeek=week(oldDate),oldMonth=oldDay.slice(0,7),oldWk=oldWeek+'__'+recoveryOutlet,oldMk=oldMonth+'__'+recoveryOutlet;
  const existing={...initial(recoveryUid,'queuetester',recoveryOutlet),lastEventId:oldId,totalPoints:25,totalAnswers:1,correctAnswers:1,dailyActivity:{[oldDay]:1},weeklyPoints:{[oldWeek]:25},monthlyPoints:{[oldMonth]:25},outletPoints:{[recoveryOutlet]:25},outletWeeklyPoints:{[oldWk]:25},outletMonthlyPoints:{[oldMk]:25},outletAnswers:{[recoveryOutlet]:1},outletWeeklyAnswers:{[oldWk]:1},outletMonthlyAnswers:{[oldMk]:1}};
  await env.withSecurityRulesDisabled(async ctx=>{
   const privileged=ctx.firestore();
   await setDoc(doc(privileged,'users',recoveryUid),existing);
   const {username,usernameLower,totalAnswers,rapidCorrectStreak,reviewSuggested,createdAt,...published}=existing;
   await setDoc(doc(privileged,'publicRanks',recoveryUid),{...published,name:username});
   await setDoc(doc(privileged,'scoreEvents',oldId),{uid:recoveryUid,paper:'paper1',index:0,selected:0,remaining:15,points:25,attemptId:recovered.attemptId,dayKey:oldDay,activityDay:oldDay,weekKey:oldWeek,monthKey:oldMonth,outlet:recoveryOutlet,outletWeekKey:oldWk,outletMonthKey:oldMk,earnedAt:Timestamp.fromDate(oldDate)});
  });
  const store=new Map([['pending',JSON.stringify([recovered,fresh])]]);
  let appended=false;
  const sdk={...F,getDoc:async ref=>{const snap=await F.getDoc(ref);if(ref.path==='users/'+recoveryUid&&!appended){appended=true;const pending=JSON.parse(store.get('pending'));pending.push(queued(2));store.set('pending',JSON.stringify(pending));}return snap;}};
  let notifications=[];
  const ctx={F:sdk,db,user:{uid:recoveryUid},profile:existing,auth:{currentUser:{uid:recoveryUid}},active:null,admins:false,syncTask:null,syncTaskUid:null,syncIssue:'',navigator:{onLine:true},day,week,qkey:()=> 'pending',getQueue:()=>JSON.parse(store.get('pending')),localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},recordLastSync:()=>{},note:m=>notifications.push(m),RESERVED:new Set(['udaya','indika']),OFFLINE_SYNC_MESSAGE:'Offline',console,window:{BT_EXAM_PAPERS:{paper1:{qs:Array.from({length:50},()=>({ans:0,opts:['A','B']}))}}}};
  // The Firestore SDK checks plain-object prototypes. Execute in the same
  // JavaScript realm as the real SDK, exactly as the browser does.
  const source=app.slice(app.indexOf('const RULES_REQUIRED_MESSAGE='),app.indexOf('function open(title'))+'\n'+app.slice(app.indexOf('function questionKey('),app.indexOf('function modeBadge('))+'\n'+app.slice(app.indexOf('function legacyAliases('),app.indexOf('window.BTExamBridge='))+'\n'+app.slice(app.indexOf('async function requestSync(){'),app.indexOf('function ranked('));
  const worker=new Function('ctx','let {F,db,user,profile,auth,active,admins,syncTask,syncTaskUid,syncIssue,navigator,day,week,qkey,getQueue,localStorage,recordLastSync,note,RESERVED,OFFLINE_SYNC_MESSAGE,console,window}=ctx;\n'+source+'\nreturn {sync,requestSync,get issue(){return syncIssue}};')(ctx);
  // Recreate the reported message on a client using the current SDK against a
  // server which does not yet accept daily scores or expose the setup check.
  const outdated=await initializeTestEnvironment({projectId:'demo-bt-exam',firestore:{rules:
   "rules_version = '2'; service cloud.firestore { match /databases/{db}/documents { match /users/{uid} { allow get: if request.auth.uid == uid; } } }"}});
  try{
   assert.equal(await worker.requestSync(),false);
   assert.match(worker.issue,/blocked until the admin updates the scoring setup/);
   assert.deepEqual(JSON.parse(store.get('pending')),[recovered,fresh],'Denied receipts stay on the device');
  }finally{
   await outdated.cleanup();
   const restored=await initializeTestEnvironment({projectId:'demo-bt-exam',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
   await restored.cleanup();
  }
  assert.equal(await worker.requestSync(),true,'Manual sync resolves only after all eligible entries are saved');
  const left=JSON.parse(store.get('pending'));
  const after=(await getDoc(doc(db,'users',recoveryUid))).data();
  assert.equal(after.totalAnswers,3,'Both fresh answers, including one added during final refresh, were saved');
  assert.equal(after.totalPoints,75,'Already accepted answer must not be credited twice');
  assert.equal(left.length,0,'A previously committed answer must clear even after the offline acceptance window');
  assert.equal((await getDoc(doc(db,'publicRanks',recoveryUid))).data().totalPoints,75);
  await worker.sync();assert.equal((await getDoc(doc(db,'users',recoveryUid))).data().totalPoints,75);
  // An actually unsaved expired answer must not be credited or deleted.
  const expired=queued(2,oldDate);store.set('pending',JSON.stringify([expired]));
  assert.equal(await worker.requestSync(),false);
  assert.equal(JSON.parse(store.get('pending')).length,1);
  assert.match(worker.issue,/72 hours old/);
  assert.equal((await getDoc(doc(db,'users',recoveryUid))).data().totalPoints,75);
  console.log('Actual client queue: old confirmed receipt cleared, both fresh answers saved including final-refresh arrival, public/private totals exact, expired unsaved answer retained, and repeat safe.');
  // Only Udaya's administrator account may add or replace answer keys.
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   await Promise.all([
    setDoc(doc(db,'admins','test-udaya-private'),{enabled:true}),
    setDoc(doc(db,'users','test-indika-admin'),initial('test-indika-admin','indika','Other')),
    setDoc(doc(db,'admins','test-indika-admin'),{enabled:true})
   ]);
  });
  const udayaDb=env.authenticatedContext('test-udaya-private',{email:'bt-udaya@users.bt-exam.example.com'}).firestore();
  const indikaDb=env.authenticatedContext('test-indika-admin',{email:'bt-indika@users.bt-exam.example.com'}).firestore();
  await setDoc(doc(udayaDb,'answerKeys','paper1_0'),{paper:'paper1',index:0,answer:0});
  await assert.rejects(
    ()=>setDoc(doc(indikaDb,'answerKeys','paper1_0'),{paper:'paper1',index:0,answer:0}),
    /permission-denied|PERMISSION_DENIED/,
    'Indika must not edit answer keys'
  );
  console.log('Answer-key seeding permitted only for Udaya.');
  const resetSource=app.slice(app.indexOf('async function resetScores('),app.indexOf('async function confirmUserRemoval'));
  const resetAs=async(db,uid)=>{
    const messages=[];
    const reset=new Function('F','db','admins','confirm','note','manageUsers','errorMessage',resetSource+';return resetScores;')(F,db,true,()=>true,m=>messages.push(m),()=>{},e=>e.code);
    await reset({uid,username:'Test account'});return messages[0];
  };
  assert.match(await resetAs(db,recoveryUid),/permission-denied/);
  for(const target of [recoveryUid,'test-udaya-private','test-indika-admin']){
   assert.match(await resetAs(udayaDb,target),/Scores reset/);
   const p=(await getDoc(doc(udayaDb,'users',target))).data();
   assert.equal(p.totalPoints+p.correctAnswers+p.totalAnswers,0);assert.deepEqual(p.dailyActivity,{});
   assert.ok(p.scoreResetAt.toMillis()>0);
   assert.equal((await getDoc(doc(udayaDb,'publicRanks',target))).exists(),false);
  }
  assert.equal((await getDoc(doc(udayaDb,'admins','test-udaya-private'))).data().enabled,true);
  await assert.rejects(()=>write('test-udaya-private','paper1',2,0,yesterday),/permission-denied|PERMISSION_DENIED/);
  console.log('Administrator can reset players, self and another admin. Regular users cannot reset scores; old pending scores cannot return.');

 }finally{await env.cleanup();}
}
run().catch(error=>{console.error('Emulator test failed:',error);process.exitCode=1;});
