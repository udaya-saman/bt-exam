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
async function run(){
 const env=await initializeTestEnvironment({projectId:'demo-bt-exam',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  const now=new Date(),at=Timestamp.fromDate(now),dayKey=day(now),weekKey=week(now),monthKey=dayKey.slice(0,7);
  for(const [uid,username,outlet,publicRank] of [
    ['test-udaya-private','udaya','Other',false],
    ['test-matara-player','tester','Matara',true]
  ]){
   await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await Promise.all([
     setDoc(doc(db,'users',uid),initial(uid,username,outlet)),
     setDoc(doc(db,'answerKeys','paper1_0'),{paper:'paper1',index:0,answer:0})
    ]);
   });
   const db=env.authenticatedContext(uid,{email:'bt-fake@users.bt-exam.example.com'}).firestore();
   const attemptId='attempt1234567890',eid=uid+'_'+attemptId+'_paper1_0',claimId=uid+'_'+dayKey+'_paper1';
   const e={uid,paper:'paper1',index:0,selected:0,remaining:15,points:25,
    attemptId,dayKey,weekKey,monthKey,outlet,outletWeekKey:weekKey+'__'+outlet,
    outletMonthKey:monthKey+'__'+outlet,activityDay:dayKey,earnedAt:at,claimId};
   const inc=(m,k,n)=>({...m,[k]:Number(m[k]||0)+n});
   const result=await runTransaction(db,async tx=>{
    const userRef=doc(db,'users',uid),eventRef=doc(db,'scoreEvents',eid),
      claimRef=doc(db,'rankedClaims',claimId),pubRef=doc(db,'publicRanks',uid),
      adminRef=doc(db,'admins',uid);
    const [claim,existing,profile,pub,admin]=await Promise.all([
      tx.get(claimRef),tx.get(eventRef),tx.get(userRef),tx.get(pubRef),tx.get(adminRef)]);
    assert.equal(existing.exists(),false);
    assert.equal(claim.exists(),false);
    assert.equal(admin.exists(),false);
    const u=profile.data(),wk=e.weekKey+'__'+outlet,mk=e.monthKey+'__'+outlet;
    tx.set(eventRef,e);
    tx.set(claimRef,{uid,paper:'paper1',dayKey,attemptId,startedAt:at});
    const up={lastEventId:eid,totalPoints:u.totalPoints+25,totalAnswers:u.totalAnswers+1,
      correctAnswers:u.correctAnswers+1,dailyActivity:inc(u.dailyActivity,dayKey,1),
      rapidCorrectStreak:0,reviewSuggested:false,
      weeklyPoints:inc(u.weeklyPoints,weekKey,25),monthlyPoints:inc(u.monthlyPoints,monthKey,25),
      outletPoints:inc(u.outletPoints,outlet,25),outletWeeklyPoints:inc(u.outletWeeklyPoints,wk,25),
      outletMonthlyPoints:inc(u.outletMonthlyPoints,mk,25),outletAnswers:inc(u.outletAnswers,outlet,1),
      outletWeeklyAnswers:inc(u.outletWeeklyAnswers,wk,1),outletMonthlyAnswers:inc(u.outletMonthlyAnswers,mk,1),
      updatedAt:at};
    tx.update(userRef,up);
    if(publicRank){
      const b=pub.exists()?pub.data():{};
      tx.set(pubRef,{uid,name:username,outlet,avatar:'',lastEventId:eid,totalPoints:25,correctAnswers:1,
       dailyActivity:inc(b.dailyActivity||{},dayKey,1),weeklyPoints:inc(b.weeklyPoints||{},weekKey,25),
       monthlyPoints:inc(b.monthlyPoints||{},monthKey,25),outletPoints:inc(b.outletPoints||{},outlet,25),
       outletWeeklyPoints:inc(b.outletWeeklyPoints||{},wk,25),outletMonthlyPoints:inc(b.outletMonthlyPoints||{},mk,25),
       outletAnswers:inc(b.outletAnswers||{},outlet,1),
       outletWeeklyAnswers:inc(b.outletWeeklyAnswers||{},wk,1),
       outletMonthlyAnswers:inc(b.outletMonthlyAnswers||{},mk,1),updatedAt:at});
    }
    return true;
   });
   assert.equal(result,true);
   const updated=await getDoc(doc(db,'users',uid));assert.equal(updated.data().totalPoints,25);
   assert.equal(updated.data().totalAnswers,1);
   assert.equal(updated.data().correctAnswers,1);
   const rank=await getDoc(doc(db,'publicRanks',uid));assert.equal(rank.exists(),publicRank);
   console.log('Score event accepted for '+username+' ('+outlet+')');
  }
 }finally{await env.cleanup();}
}
run().catch(error=>{console.error('Emulator test failed:',error);process.exitCode=1;});
