/* BT Exam Prep Spark-only integration. Firebase SDK 13.2.0. */
(async()=>{
'use strict';
const config=window.BT_FIREBASE_CONFIG,VERSION='13.2.0';
const APP_VERSION='3.4.0-sticker-scoring';let latestUpdate=null;
const OUTLETS=['Akuressa','Aluthgama','Ambalangoda','Embilipitiya','Galle','Karapitiya','Matara','Matara 02','Megalle','Monaragala','Tangalle','Unawatuna','Welipenna A','Welipenna B','Other'];
const RESERVED=new Set(['indika','udaya']);
const rankEligible=p=>p&&p.outlet!=='Other'&&!RESERVED.has(String(p.username||p.name||'').toLowerCase())&&!p.isAdmin;
const rand=()=>crypto.randomUUID().replace(/-/g,'');
const day=(date=new Date())=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const g=t=>p.find(v=>v.type===t).value;return g('year')+'-'+g('month')+'-'+g('day');};
const week=(date=new Date())=>{const d=new Date(day(date)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)};
const norm=name=>String(name||'').trim().toLowerCase();
const valid=name=>/^[A-Za-z0-9._-]{3,24}$/.test(name);
const $=selector=>document.querySelector(selector);
const clean=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let A,F,auth,db,user=null,profile=null,admins=false,active=null,users=[],requests=[],unsubscribe=null,unsubscribeAdmin=null,unsubscribeProfile=null,syncing=false,syncIssue='',previousRank=null,boardOpen=false,showAllPlayers=false,rankNotice='';
const root=document.createElement('div');root.id='bt-spark-root';root.hidden=true;document.body.append(root);
const style=document.createElement('style');style.textContent='#bt-spark-root{position:fixed;inset:0;z-index:2147483000;background:#0a163ab8;display:grid;place-items:center;padding:12px;box-sizing:border-box;font:15px Arial,sans-serif;color:#26344a}#bt-spark-root[hidden]{display:none}#bt-spark-root .panel{background:white;border-radius:17px;width:min(100%,540px);max-height:calc(100dvh - 24px);overflow:auto;padding:20px;box-sizing:border-box;box-shadow:0 15px 50px #0003}#bt-spark-root h2{font-size:22px;color:#21306b;margin:0 0 8px}#bt-spark-root p{font-size:13px;color:#63748b;line-height:1.45}#bt-spark-root label{display:block;font-weight:700;margin:12px 0 4px;font-size:12px}#bt-spark-root input,#bt-spark-root select{display:block;padding:11px;border-radius:10px;border:1px solid #cbd6e3;width:100%;box-sizing:border-box;font:inherit}#bt-spark-root button{padding:10px 13px;margin:6px 4px 4px 0;background:#0b71b4;color:white;border:0;border-radius:9px;font-weight:750;cursor:pointer}#bt-spark-root button.alt{background:#e8f0f9;color:#21306b}#bt-spark-root .err{color:#c00}#bt-spark-root .entry{padding:11px 0;border-bottom:1px solid #e5eaf0;display:flex;justify-content:space-between;gap:12px}#bt-spark-dock{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147482000;background:#21306b;color:white;border:0;border-radius:30px;padding:11px 14px;font-weight:800}';document.head.append(style);
const dock=document.createElement('button');dock.id='bt-spark-dock';dock.textContent='🏆 Leaderboard';dock.onclick=()=>show('board');document.body.append(dock);
function note(msg){console.info('[BT Spark]',msg);const n=document.createElement('div');n.textContent=msg;n.className='pg-toast';document.body.append(n);setTimeout(()=>n.remove(),3200);}
function award(points,correct){
 const old=document.querySelector('.pg-earned-toast');if(old)old.remove();
 const pill=document.createElement('div');pill.className='pg-earned-toast';pill.setAttribute('aria-live','polite');
 const mascot=document.createElement('img');mascot.alt='';mascot.src=correct?'./images/mascot/pizza-correct.svg':'./images/mascot/pizza-wrong.svg';
 const count=document.createElement('strong');count.textContent=(points>0?'+':'')+points+' PTS';
 pill.append(mascot,count);document.body.append(pill);setTimeout(()=>pill.remove(),1750);
}
function statTotals(){
 const pending=getQueue().filter(q=>q.uid===user?.uid);
 return{points:Number(profile?.totalPoints||0)+pending.reduce((a,e)=>a+Number(e.points||0),0),
 answered:Number(profile?.totalAnswers||0)+pending.length,
 correct:Number(profile?.correctAnswers||0)+pending.filter(e=>e.points>0).length,
 syncCount:pending.length};
}
function syncDetail(err){
 const msg=errorMessage(err);
 if(/permission-denied|insufficient permissions/i.test(msg))return 'Firebase rejected the result. Check that answer keys were seeded and the latest Firestore rules were published.';
 if(/unavailable|network/i.test(msg))return 'Connection unavailable. The result is saved on this device for retry.';
 return msg;
}
function open(title,sub){root.hidden=false;root.innerHTML='<div class="panel"><h2>'+clean(title)+'</h2><p>'+clean(sub||'')+'</p><div id="bt-spark-content"></div></div>';return $('#bt-spark-content');}
function close(){root.hidden=true;root.innerHTML='';boardOpen=false;rankNotice='';if(unsubscribe){unsubscribe();unsubscribe=null;}}
function btn(label,handler,alt=false){const b=document.createElement('button');b.textContent=label;
 const low=String(label).toLowerCase();
 if(/sign out|close|cancel|delete|reject|later/.test(low))b.className='pg-btn-red';
 else if(/leaderboard|sync|my profile|player card|profile|back to users/.test(low))b.className='pg-btn-green';
 else if(alt)b.className='alt';
 b.onclick=handler;return b;}
function label(parent,text,input){const l=document.createElement('label');l.textContent=text;parent.append(l,input);return input;}
function field(parent,text,type='text'){const input=document.createElement('input');input.type=type;input.required=true;return label(parent,text,input);}
function sel(parent,text){const s=document.createElement('select');OUTLETS.forEach(n=>{const o=document.createElement('option');o.textContent=n;o.value=n;s.append(o)});return label(parent,text,s);}
function errorMessage(e){return String(e?.message||e||'Unknown error').replace('Firebase: ','').slice(0,240);}
function gate(mode='login',message){
 boardOpen=false;if(unsubscribe){unsubscribe();unsubscribe=null;}
 const box=open(mode==='register'?'Create your account':mode==='setup'?'Firebase setup needed':'Welcome back',mode==='setup'?message:'Enter your username and password. No personal email is required.');
 const welcome=document.createElement('img');welcome.className='pg-celebration';welcome.src=mode==='setup'?'./images/mascot/pizza-update.svg':'./images/mascot/pizza-welcome.svg';welcome.alt='Friendly pizza mascot';welcome.style.maxHeight='115px';box.append(welcome);
 if(mode==='setup')return;
 const form=document.createElement('form');const name=field(form,'Username');name.maxLength=24;const password=field(form,'Password (8 or more characters)','password');password.minLength=mode==='register'?8:1;
 const outlet=mode==='register'?sel(form,'Select outlet'):null;
 const err=document.createElement('p');err.className='err';const submit=document.createElement('button');submit.type='submit';submit.textContent=mode==='register'?'REGISTER':'SIGN IN';form.append(err,submit);box.append(form);
 form.onsubmit=async e=>{e.preventDefault();err.textContent='';submit.disabled=true;try{if(mode==='register')await register(name.value,password.value,outlet.value);else await login(name.value,password.value);}catch(ex){err.textContent=errorMessage(ex)}finally{submit.disabled=false}};
 box.append(btn(mode==='register'?'Already registered? Sign in':'Create account',()=>gate(mode==='register'?'login':'register'),true));
 const info=document.createElement('p');info.textContent='Spark limitation: Without an email or phone number, automatic password recovery is unavailable. Please keep your password safe.';box.append(info);
}
async function register(name,password,outlet){
 if(!valid(name)||password.length<8)throw Error('Username must have 3–24 letters, numbers, dots, dashes or underscores; password 8+ characters.');
 const authEmail='bt-'+rand()+'@users.bt-exam.example.com';
 const created=await A.createUserWithEmailAndPassword(auth,authEmail,password);
 try{
  await F.runTransaction(db,async tx=>{
   const reg=F.doc(db,'usernames',norm(name)),u=F.doc(db,'users',created.user.uid);
   if((await tx.get(reg)).exists())throw Error('Username already taken.');
   tx.set(reg,{uid:created.user.uid,authEmail});
   tx.set(u,{uid:created.user.uid,username:name,usernameLower:norm(name),outlet,avatar:'',totalPoints:0,totalAnswers:0,weeklyPoints:{},monthlyPoints:{},outletPoints:{},outletWeeklyPoints:{},outletMonthlyPoints:{},outletAnswers:{},outletWeeklyAnswers:{},outletMonthlyAnswers:{},correctAnswers:0,dailyActivity:{},rapidCorrectStreak:0,reviewSuggested:false,lastEventId:'',createdAt:F.serverTimestamp(),updatedAt:F.serverTimestamp()});
  });
 }catch(e){try{await A.deleteUser(created.user)}catch(_){}throw e;}
 await session(created.user);
}
async function login(name,password){
 if(!valid(name))throw Error('Invalid username.');
 const r=await F.getDoc(F.doc(db,'usernames',norm(name)));
 if(!r.exists())throw Error('Incorrect username or password.');
 await A.signInWithEmailAndPassword(auth,r.data().authEmail,password);
}
const qkey=()=>user?'bt_spark_pending_'+user.uid:'';
const akey=()=>user?'bt_spark_attempt_'+user.uid:'';
const storageKey=()=>user?'bt_exam_state:'+user.uid:null;
function getQueue(){try{return JSON.parse(localStorage.getItem(qkey())||'[]')}catch(_){return []}}
function saveQueue(q){localStorage.setItem(qkey(),JSON.stringify(q))}
function rankedKey(paper,dayKey){return 'bt_spark_daily_ranked_'+user.uid+'_'+dayKey+'_'+paper;}
function modeBadge(){
 let label=document.getElementById('bt-exam-mode');
 if(!label){label=document.createElement('span');label.id='bt-exam-mode';label.className='pg-mode-label';document.getElementById('quiz-paper-label')?.after(label);}
 if(label)label.textContent=active?.ranked===false?'📚 PRACTICE · NO RANK POINTS':'🏅 DAILY RANKED';
}
function onStart(paper){
 if(!user)return;
 const today=day(),previous=localStorage.getItem(rankedKey(paper,today));
 const current={id:rand(),paper,dayKey:today,startedAt:Date.now(),ranked:!previous};
 active=current;localStorage.setItem(akey(),JSON.stringify(active));modeBadge();
 if(!navigator.onLine)return;
 const claimId=user.uid+'_'+today+'_'+paper;
 F.getDoc(F.doc(db,'rankedClaims',claimId)).then(doc=>{
  if(active!==current||!doc.exists())return;
  if(doc.data().attemptId!==current.id){current.ranked=false;localStorage.setItem(akey(),JSON.stringify(active));modeBadge();}
 }).catch(err=>console.info('Ranked mode check unavailable:',err.code||err));
}
function onResume(paper,saved){
 if(!user)return;
 try{active=saved||JSON.parse(localStorage.getItem(akey())||'null')}catch(_){active=null}
 if(!active||active.paper!==paper)onStart(paper);
 else{localStorage.setItem(akey(),JSON.stringify(active));modeBadge();}
}
function onFinish(){clearTimeout(cloudTimer);cloudTimer=null;pendingCloudSnapshot=null;if(user){localStorage.removeItem(akey());F.deleteDoc(F.doc(db,'savedSessions',user.uid)).catch(()=>{});}active=null;}
async function onAnswer(a){
 if(!user||!profile||!active||active.paper!==a.paperId)return;
 if(active.ranked===false){award(0,Boolean(a.correct));return;}
 const index=Number(a.originalQuestionIndex),selected=Number(a.selectedOriginalIndex);
 if(!Number.isInteger(index)||index<0||!Number.isInteger(selected))return;
 const id=user.uid+'_'+active.id+'_'+active.paper+'_'+index,q=getQueue();
 if(q.some(x=>x.id===id))return;
 const remaining=a.correct?Math.max(0,Math.min(60,Math.floor(Number(a.remainingSeconds)||0))):0;
 const earnedAt=Date.now(),earnedDate=new Date(earnedAt),answerDay=day(earnedDate);
 const entry={id,uid:user.uid,paper:active.paper,index,selected,remaining,points:a.correct?10+remaining:0,attemptId:active.id,dayKey:active.dayKey,startedAt:active.startedAt,weekKey:week(earnedDate),monthKey:answerDay.slice(0,7),activityDay:answerDay,outlet:profile.outlet,earnedAt,claimId:user.uid+'_'+active.dayKey+'_'+active.paper};
 q.push(entry);saveQueue(q);localStorage.setItem(rankedKey(active.paper,active.dayKey),active.id);
 award(entry.points,entry.points>0);sync();
}
window.BTExamBridge={storageKey,getPapers:()=>window.BT_EXAM_PAPERS,getAttempt:()=>active,onPaperStart:o=>onStart(o.paperId),onPaperResume:o=>onResume(o.paperId,o.attempt),onAnswer,onPaperComplete:onFinish,onProgress:state=>saveCloudSession(state),onScreenChange:()=>promptUpdate()};
let cloudTimer=null, pendingCloudSnapshot=null;
function saveCloudSession(snapshot){
 if(!user||!navigator.onLine)return;
 pendingCloudSnapshot=snapshot;
 if(cloudTimer)return; // Batch frequent question transitions into one cloud write.
 cloudTimer=setTimeout(()=>{
  cloudTimer=null;
  if(!user||!pendingCloudSnapshot)return;
  const current=pendingCloudSnapshot;
  pendingCloudSnapshot=null;
  F.setDoc(F.doc(db,'savedSessions',user.uid),{uid:user.uid,snapshot:current,updatedAt:F.serverTimestamp()})
    .catch(e=>console.warn('Session sync failed:',e.code||e));
 },12000);
}
async function restoreCloudSession(){
 if(!user||!navigator.onLine||localStorage.getItem(storageKey()))return;
 try{const snap=await F.getDoc(F.doc(db,'savedSessions',user.uid));
  if(snap.exists()&&snap.data().snapshot){localStorage.setItem(storageKey(),JSON.stringify(snap.data().snapshot));if(typeof checkSavedSession==='function')checkSavedSession();}
 }catch(e){console.warn('Resume restore unavailable:',e.code||e);}
}
async function sync(){
 if(!user||!profile||syncing||!navigator.onLine)return;syncing=true;
 try{
  const list=getQueue(),done=[],maximum={past2024:29,questions:40,paper1:50,paper2:50,paper3:45};
  for(const e of list){
   if(Date.now()-e.earnedAt>72*3600000){syncIssue='An old result is beyond the 72-hour sync window. It has been retained on this device for review.';continue;}
   if(!maximum[e.paper]||e.index>=maximum[e.paper]){syncIssue='A stored question does not match the installed paper. Result retained for review.';continue;}
   const er=F.doc(db,'scoreEvents',e.id),cr=F.doc(db,'rankedClaims',e.claimId),ur=F.doc(db,'users',user.uid);
   try{
    await F.runTransaction(db,async tx=>{
     const pr=F.doc(db,'publicRanks',user.uid),ad=F.doc(db,'admins',user.uid);
     const [claim,event,u,publicScore,role]=await Promise.all([tx.get(cr),tx.get(er),tx.get(ur),tx.get(pr),tx.get(ad)]);
     if(event.exists())return;
     if(claim.exists()&&claim.data().attemptId!==e.attemptId)throw Error('PRACTICE_ONLY');
     if(!u.exists()||u.data().outlet!==e.outlet)throw Error('OUTLET_CHANGED');
     const p=u.data(),change=(m,k,v)=>Object.assign({},m||{},{[k]:Number((m||{})[k]||0)+v}),wk=e.weekKey+'__'+e.outlet;
     const rapid=e.points>=68?Number(p.rapidCorrectStreak||0)+1:0;
     const review=Boolean(p.reviewSuggested)||rapid>=7;
     tx.set(er,{uid:e.uid,paper:e.paper,index:e.index,selected:e.selected,remaining:e.remaining,points:e.points,attemptId:e.attemptId,dayKey:e.dayKey,weekKey:e.weekKey,monthKey:e.monthKey,outlet:e.outlet,outletWeekKey:wk,outletMonthKey:e.monthKey+'__'+e.outlet,activityDay:e.activityDay||day(new Date(e.earnedAt)),earnedAt:F.Timestamp.fromMillis(e.earnedAt),claimId:e.claimId});
     if(!claim.exists())tx.set(cr,{uid:e.uid,paper:e.paper,dayKey:e.dayKey,attemptId:e.attemptId,startedAt:F.Timestamp.fromMillis(e.startedAt||e.earnedAt)});
     const publish=p.outlet!=='Other'&&!RESERVED.has(String(p.username||'').toLowerCase())&&!(role.exists()&&role.data().enabled===true);
     tx.update(ur,{lastEventId:e.id,totalPoints:Number(p.totalPoints||0)+e.points,totalAnswers:Number(p.totalAnswers||0)+1,
      correctAnswers:Number(p.correctAnswers||0)+(e.points>0?1:0),dailyActivity:change(p.dailyActivity,e.activityDay||day(new Date(e.earnedAt)),1),
      rapidCorrectStreak:rapid,reviewSuggested:review,
      weeklyPoints:change(p.weeklyPoints,e.weekKey,e.points),monthlyPoints:change(p.monthlyPoints,e.monthKey,e.points),
      outletPoints:change(p.outletPoints,e.outlet,e.points),outletWeeklyPoints:change(p.outletWeeklyPoints,wk,e.points),
      outletMonthlyPoints:change(p.outletMonthlyPoints,e.monthKey+'__'+e.outlet,e.points),
      outletMonthlyAnswers:change(p.outletMonthlyAnswers,e.monthKey+'__'+e.outlet,1),
      outletAnswers:change(p.outletAnswers,e.outlet,1),outletWeeklyAnswers:change(p.outletWeeklyAnswers,wk,1),updatedAt:F.serverTimestamp()});
     if(publish){
       const b=publicScore.exists()?publicScore.data():{},mk=e.monthKey+'__'+e.outlet;
       tx.set(pr,{uid:user.uid,name:p.username,outlet:p.outlet,avatar:p.avatar||'',lastEventId:e.id,totalPoints:Number(b.totalPoints||0)+e.points,
        correctAnswers:Number(b.correctAnswers||0)+(e.points>0?1:0),dailyActivity:change(b.dailyActivity,e.activityDay||day(new Date(e.earnedAt)),1),
        weeklyPoints:change(b.weeklyPoints,e.weekKey,e.points),monthlyPoints:change(b.monthlyPoints,e.monthKey,e.points),
        outletPoints:change(b.outletPoints,e.outlet,e.points),outletWeeklyPoints:change(b.outletWeeklyPoints,wk,e.points),
        outletMonthlyPoints:change(b.outletMonthlyPoints,mk,e.points),outletAnswers:change(b.outletAnswers,e.outlet,1),
        outletWeeklyAnswers:change(b.outletWeeklyAnswers,wk,1),outletMonthlyAnswers:change(b.outletMonthlyAnswers,mk,1),updatedAt:F.serverTimestamp()});
     }
    });done.push(e.id);
   }catch(err){
    const message=errorMessage(err);
    if(/PRACTICE_ONLY/.test(message)){console.warn('Ranked claim conflict retained:',e.id);syncIssue='This attempt conflicts with an earlier ranked attempt. The local record is retained for review.';break;}
    syncIssue=syncDetail(err);console.warn('Sync paused, result retained:',e.id,message);break;
   }
  }
  if(done.length){const removed=new Set(done);saveQueue(getQueue().filter(e=>!removed.has(e.id)));}
  if(!getQueue().length)syncIssue='';
 }finally{syncing=false;}
}
function ranked(period='weekly',outletView=false){
 let list=[];const w=week();
 if(!outletView)list=users.filter(rankEligible).map(u=>({name:u.name,outlet:u.outlet,avatar:u.avatar,uid:u.uid,correctAnswers:Number(u.correctAnswers||0),dailyActivity:u.dailyActivity||{},lifetimePoints:Number(u.totalPoints||0),score:period==='weekly'?Number(u.weeklyPoints?.[w]||0):Number(u.totalPoints||0)}));
 else list=OUTLETS.filter(name=>name!=='Other').map(name=>{
  let sum=0,people=0;for(const u of users.filter(rankEligible)){const key=period==='weekly'?w+'__'+name:name;const ans=period==='weekly'?Number(u.outletWeeklyAnswers?.[key]||0):Number(u.outletAnswers?.[key]||0);sum+=period==='weekly'?Number(u.outletWeeklyPoints?.[key]||0):Number(u.outletPoints?.[key]||0);if(ans>0)people++;}
  return{name,score:people?Math.round(sum/people):0,people};
 });
 list.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
 let position=0,last=-1;return list.map((entry,i)=>{if(entry.score!==last)position=i+1;last=entry.score;return{...entry,rank:position}});
}
let period='weekly',outletView=false;
function board(){
 boardOpen=true;
 if(!unsubscribe)listen();
 const box=open(outletView?'👑 OUTLET ARENA':'🏆 LEADERBOARD','Pizza Hut-inspired competition · Asia/Colombo');
 const hero=document.createElement('div');hero.className='pg-hero';
 const mascot=document.createElement('img');mascot.className='pg-mascot';mascot.src=outletView?'./images/mascot/pizza-crown.svg':rankNotice==='up'?'./images/mascot/pizza-rank-up.svg':rankNotice==='down'?'./images/mascot/pizza-overtaken.svg':'./images/mascot/pizza-welcome.svg';mascot.alt='Pizza mascot celebrating competition';hero.append(mascot);
 const text=document.createElement('div');text.className='pg-hero-copy';
 const label=document.createElement('small');label.textContent=outletView?'OUTLET CROWN CHALLENGE':rankNotice==='up'?'🚀 YOU RANKED UP!':rankNotice==='down'?'⚔️ RANK CHALLENGE':'THE PIZZA ARENA';
 const big=document.createElement('strong');const my=rankEligible({...profile,isAdmin:admins})?ranked(period).find(v=>v.uid===user?.uid):null;
 big.textContent=outletView?'Who wears the crown?':my?'#'+my.rank+' · '+my.score+' PTS':'PLAY · LEARN · LEVEL UP';
 const sub=document.createElement('small');sub.textContent=outletView?'At least 3 active players per outlet':'Ready for your next victory?';
 text.append(label,big,sub);hero.append(text);box.append(hero);
 if(window.BTRewards){const season=window.BTRewards.season(day());if(season){const chip=document.createElement('div');chip.className='pg-season-chip';const crown=document.createElement('span');crown.className='pg-crown-icon';crown.textContent='👑';chip.append(crown,document.createTextNode(' WEEKLY SEASON · '+season.daysRemaining+' DAYS LEFT · Ends '+season.end));box.append(chip);}}
 const buttons=document.createElement('div');buttons.className='pg-nav';
 buttons.append(btn('THIS WEEK',()=>{period='weekly';board()},period!=='weekly'),btn('ALL TIME',()=>{period='alltime';board()},period!=='alltime'),btn(outletView?'PLAYERS':'OUTLETS',()=>{outletView=!outletView;board()},true));box.append(buttons);
 
 const records=ranked(period,outletView);const winners=outletView?records.filter(v=>v.people>=3).slice(0,3):records.slice(0,3);
 if(winners.length){const group=document.createElement('div');group.className='pg-podium';for(const [i,r] of winners.entries()){
  const cell=document.createElement('div');cell.className='pg-podium-item';const badge=document.createElement('div');badge.textContent=['🥇','🥈','🥉'][i];badge.style.fontSize='23px';cell.append(badge);
  if(!outletView){const picture=document.createElement('img');picture.src=r.avatar||'./images/default-avatar.svg';picture.alt='';picture.onerror=()=>picture.src='./images/default-avatar.svg';cell.append(picture);}
  const who=document.createElement('strong');who.textContent=r.name;const points=document.createElement('small');points.textContent=r.score+' PTS';cell.append(who,points);group.append(cell);
 }box.append(group);}
 if(outletView){const crown=records.find(v=>v.people>=3);const status=document.createElement('div');status.className='pg-private';status.textContent=crown?'👑 Crown leader: '+crown.name+' · '+crown.score+' average points':'🍕 The crown is waiting! At least 3 active players are needed.';box.append(status);}
 const section=document.createElement('div');section.className='pg-section';section.textContent=outletView?'OUTLET LEAGUE':'PLAYER STANDINGS';box.append(section);
 if(!records.length){const empty=document.createElement('div');empty.className='pg-empty';empty.textContent='🍕 The first ranked scores will appear here.';box.append(empty);}
 const shown=(outletView||showAllPlayers)?records:records.slice(0,20);
 const own=records.find(r=>r.uid===user?.uid);
 if(!outletView&&!showAllPlayers&&own&&!shown.some(r=>r.uid===own.uid))shown.push(own);
 for(const r of shown){
  const card=document.createElement('div');card.className='pg-leader-card';if(r.uid===user?.uid)card.classList.add('pg-you');
  const place=document.createElement('span');place.className='pg-place';place.textContent=r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':'#'+r.rank;card.append(place);
  if(!outletView){const pic=document.createElement('img');pic.className='pg-avatar';pic.src=r.avatar||'./images/default-avatar.svg';pic.alt='';pic.onerror=()=>pic.src='./images/default-avatar.svg';card.append(pic);}
  const who=document.createElement('div');who.className='pg-person';const title=document.createElement('strong');title.textContent=r.name+(r.uid===user?.uid?' · YOU':'');const caption=document.createElement('small');caption.textContent=outletView?r.people+' active players':r.outlet;who.append(title,caption);card.append(who);
  if(!outletView&&window.BTRewards){
   const badges=window.BTRewards.achievements({totalPoints:r.lifetimePoints,correctAnswers:r.correctAnswers,dailyActivity:r.dailyActivity},day(),week());
   const priority=['centurion','streak-14','legend','streak-7','super-student','rising-star','sharp-mind'];
   const earned=priority.map(id=>badges.find(b=>b.id===id&&b.unlocked)).find(Boolean);
   if(earned){const tiny=document.createElement('small');tiny.className='pg-mini-badge';tiny.textContent=earned.icon+' '+earned.label;detail.append(tiny);}
  }
  const score=document.createElement('span');score.className='pg-score';score.textContent=r.score+' PTS';card.append(score);box.append(card);
 }
 if(!outletView&&records.length>20){box.append(btn(showAllPlayers?'SHOW TOP 20':'VIEW ALL '+records.length+' PLAYERS',()=>{showAllPlayers=!showAllPlayers;board();},true));}
 
 box.append(btn('👤 MY PROFILE',()=>show('profile'),true),btn('CLOSE',close,true));
}
function showRankMascot(risen,rank){
 const box=open(risen?'🚀 RANK UP!':'⚔️ RANK CHALLENGE',risen?'Great work! You climbed the leaderboard.':'Another player overtook you. Practice and reclaim your position!');
 const pic=document.createElement('img');pic.className='pg-celebration';pic.src=risen?'./images/mascot/pizza-rank-up.svg':'./images/mascot/pizza-overtaken.svg';pic.alt='Pizza mascot reacting to leaderboard change';box.prepend(pic);
 const msg=document.createElement('div');msg.className='pg-private';msg.textContent='CURRENT WEEKLY RANK · #'+rank;box.append(msg,btn('LET’S GO!',close));
}
function monthly(){
 const d=Number(day().slice(8)),p=day().slice(0,7),previous=new Date(Date.UTC(Number(p.slice(0,4)),Number(p.slice(5,7))-2,1)).toISOString().slice(0,7);
 if(d<4||!user||!users.length)return;
 const key='bt_spark_champion_'+user.uid+'_'+previous;if(localStorage.getItem(key))return;
 const top=users.filter(rankEligible).map(u=>{const outlets=Object.entries(u.outletMonthlyPoints||{}).filter(([k])=>k.startsWith(previous+'__')).sort((a,b)=>b[1]-a[1]);return{name:u.name,outlet:outlets[0]?.[0].slice(previous.length+2)||u.outlet,score:Number(u.monthlyPoints?.[previous]||0)};}).sort((a,b)=>b.score-a.score);
 if(top[0]?.score>0){localStorage.setItem(key,'1');const champions=top.filter(p=>p.score===top[0].score);const box=open(champions.length>1?'🏆 Joint monthly champions':'🏆 Monthly champion','Congratulations to '+champions.map(p=>p.name+' of '+p.outlet).join(' & ')+' · '+top[0].score+' points');const image=document.createElement('img');image.src='./images/mascot/pizza-monthly.svg';image.alt='Pizza mascot celebrating';image.className='pg-celebration';box.prepend(image);box.append(btn('Continue',close));}
}
function listen(){
 if(unsubscribe)return;
 unsubscribe=F.onSnapshot(F.collection(db,'publicRanks'),snap=>{
  users=snap.docs.map(d=>d.data()).filter(rankEligible);
  const mine=ranked().find(x=>x.uid===user?.uid)?.rank||null;
  if(previousRank!==null&&mine&&mine!==previousRank){const risen=mine<previousRank;rankNotice=risen?'up':'down';note(risen?'🏆 RANK UP! · #'+mine:'Rank challenge · #'+mine);if(!$('#quiz')?.classList.contains('active')&&root.hidden)showRankMascot(risen,mine);}
  previousRank=mine;
  if(boardOpen&&!root.hidden)board();
  monthly();
 },err=>console.warn('Leaderboard listener',err));
}
async function profilePanel(){
 boardOpen=false;if(unsubscribe){unsubscribe();unsubscribe=null;}
 const box=open('MY PLAYER CARD',profile.username+' · '+profile.outlet);
 const totals=statTotals();
 const hero=document.createElement('div');hero.className='pg-hero';const pic=document.createElement('img');pic.className='pg-mascot';pic.src=rankEligible({...profile,isAdmin:admins})?'./images/mascot/pizza-welcome.svg':'./images/mascot/pizza-private.svg';pic.alt='Pizza mascot';const info=document.createElement('div');info.className='pg-hero-copy';const a=document.createElement('small');a.textContent='MY EXAM PROGRESS';const b=document.createElement('strong');b.textContent=totals.points.toLocaleString()+' PTS';const c=document.createElement('small');c.textContent=totals.correct+' correct · '+totals.answered+' answered';info.append(a,b,c);hero.append(pic,info);box.append(hero);
 if(totals.syncCount||syncIssue){const status=document.createElement('div');status.className='pg-sync-detail';status.textContent=(totals.syncCount?totals.syncCount+' local result(s) awaiting sync. ':'')+syncIssue;box.append(status);}
 const rewards=window.BTRewards;
 if(rewards){
  const lvl=rewards.level(Number(profile.totalPoints||0));
  const block=document.createElement('section');block.className='pg-rewards-section';
  const levelHeader=document.createElement('div');levelHeader.className='pg-section';levelHeader.textContent='⭐ LEVEL '+lvl.number+' · YOUR PROGRESSION';block.append(levelHeader);
  const stat=document.createElement('div');stat.className='pg-reward-stat';
  const left=document.createElement('strong');left.textContent=String(lvl.points).replace(/\B(?=(\d{3})+(?!\d))/g,',')+' PTS';
  const right=document.createElement('small');right.textContent=(lvl.next-lvl.points)+' to level '+(lvl.number+1);
  stat.append(left,right);block.append(stat);
  const track=document.createElement('div');track.className='pg-level-track';
  const fill=document.createElement('span');fill.style.width=lvl.percent+'%';track.append(fill);block.append(track);
  const leader=users.length?ranked('weekly',true).find(x=>x.people>=3):null;
  const onLeadingTeam=Boolean(rankEligible({...profile,isAdmin:admins})&&leader&&leader.name===profile.outlet);
  const all=rewards.achievements(profile,day(),week(),onLeadingTeam);
  const unlocked=all.filter(item=>item.unlocked).length;
  const heading=document.createElement('div');heading.className='pg-section';heading.textContent='🎖️ YOUR REWARDS · '+unlocked+'/'+all.length+' UNLOCKED';block.append(heading);
  const badges=document.createElement('div');badges.className='pg-reward-grid';
  all.forEach(item=>{
   const badge=document.createElement('div');badge.className='pg-reward-badge'+(item.unlocked?' is-earned':' is-locked');
   const icon=document.createElement('span');icon.className='pg-reward-icon';icon.textContent=item.icon;
   const title=document.createElement('strong');title.textContent=item.label;
   const status=document.createElement('small');status.textContent=item.unlocked?'UNLOCKED · '+Math.min(item.current,item.target)+'/'+item.target:item.current+'/'+item.target;
   badge.append(icon,title,status);badges.append(badge);
  });block.append(badges);
  const season=rewards.season(day());if(season){
   const seasonPanel=document.createElement('div');seasonPanel.className='pg-private';
   seasonPanel.textContent='🎯 Weekly Season · '+season.start+'–'+season.end+' · '+season.daysRemaining+' day(s) including today remaining';block.append(seasonPanel);
  }
  if(profile.reviewSuggested&&admins){
   const flag=document.createElement('div');flag.className='pg-private';flag.textContent='ℹ️ Unusual rapid-answer pattern flagged for manual review; this is not proof of cheating.';block.append(flag);
  }
  box.append(block);
 }
 const msg=document.createElement('p');msg.className='err';box.append(msg);
 const image=field(box,'Profile picture','file');image.accept='image/jpeg,image/png,image/webp';image.onchange=async()=>{
  try{const file=image.files[0],src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
   const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src});
   const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d'),scale=Math.max(96/img.width,96/img.height);x.fillStyle='white';x.fillRect(0,0,96,96);x.drawImage(img,(96-img.width*scale)/2,(96-img.height*scale)/2,img.width*scale,img.height*scale);
   const avatar=c.toDataURL('image/jpeg',.65);if(avatar.length>24000)throw Error('Image too large');
   await F.updateDoc(F.doc(db,'users',user.uid),{avatar,updatedAt:F.serverTimestamp()});if(rankEligible({...profile,isAdmin:admins})){const pr=F.doc(db,'publicRanks',user.uid);if((await F.getDoc(pr)).exists())await F.updateDoc(pr,{avatar,updatedAt:F.serverTimestamp()});}note('Picture updated.');
  }catch(e){msg.textContent=errorMessage(e)}
 };
 box.append(btn('Remove picture',async()=>{await F.updateDoc(F.doc(db,'users',user.uid),{avatar:'',updatedAt:F.serverTimestamp()});if(rankEligible({...profile,isAdmin:admins})){const pr=F.doc(db,'publicRanks',user.uid);if((await F.getDoc(pr)).exists())await F.updateDoc(pr,{avatar:'',updatedAt:F.serverTimestamp()});}note('Picture removed.');},true));
 const newname=field(box,'Change username');newname.value=profile.username;
 box.append(btn('Save username',async()=>{
  try{const n=newname.value.trim();if(!valid(n))throw Error('Invalid username.');
   await F.runTransaction(db,async tx=>{const old=F.doc(db,'usernames',profile.usernameLower),next=F.doc(db,'usernames',norm(n)),u=F.doc(db,'users',user.uid);const pub=F.doc(db,'publicRanks',user.uid);const pubSnapshot=await tx.get(pub);if(norm(n)!==profile.usernameLower){if((await tx.get(next)).exists())throw Error('Username taken.');tx.set(next,{uid:user.uid,authEmail:user.email});tx.delete(old);}tx.update(u,{username:n,usernameLower:norm(n),updatedAt:F.serverTimestamp()});if(pubSnapshot.exists()){if(RESERVED.has(norm(n)))tx.delete(pub);else tx.update(pub,{name:n,updatedAt:F.serverTimestamp()});}});note('Username updated.');
  }catch(e){msg.textContent=errorMessage(e)}
 },true));
 const oldpass=field(box,'Current password','password'),newpass=field(box,'New password','password');
 box.append(btn('Change password',async()=>{try{if(newpass.value.length<8)throw Error('Password too short.');await A.reauthenticateWithCredential(user,A.EmailAuthProvider.credential(user.email,oldpass.value));await A.updatePassword(user,newpass.value);note('Password changed.');}catch(e){msg.textContent=errorMessage(e)}},true));
 const outlet=sel(box,'Outlet');outlet.value=profile.outlet;
 outlet.addEventListener('change',()=>{
  if(outlet.value===profile.outlet)return;
  const target=outlet.value;
  const confirmation=open('CHANGE OUTLET?','Send an approval request to move from '+profile.outlet+' to '+target+'?');
  const graphic=document.createElement('img');graphic.src='./images/mascot/pizza-update.svg';graphic.className='pg-celebration';graphic.alt='';confirmation.prepend(graphic);
  confirmation.append(btn('SEND REQUEST',async()=>{
   try{
    await F.addDoc(F.collection(db,'outletRequests'),{uid:user.uid,from:profile.outlet,to:target,status:'pending',createdAt:F.serverTimestamp()});
    note('Outlet request submitted for approval.');profilePanel();
   }catch(e){note(errorMessage(e));profilePanel();}
  }),btn('CANCEL',()=>profilePanel()));
 });
 if(admins)box.append(btn('Approve outlet requests',adminPanel));
 box.append(btn('Leaderboard',board),btn('Sync',async()=>{await sync();profilePanel();}),btn('Sign out',async()=>{await A.signOut(auth);}),btn('Close',close));
}
function adminPanel(){
 const box=open('Outlet approvals','Both administrators can review pending requests.');
 const pending=requests.filter(r=>r.status==='pending');if(!pending.length)box.append(document.createTextNode('No pending requests.'));
 for(const r of pending){const p=document.createElement('p');p.textContent=r.from+' → '+r.to;box.append(p);box.append(btn('Approve',()=>decide(r,true)),btn('Reject',()=>decide(r,false),true));}
 box.append(btn('Manage users',manageUsers,true),btn('Seed answer keys',seedKeys,true),btn('Review activity flags',reviewActivityFlags,true),btn('Close',close,true));
}
async function manageUsers(){
 if(!admins)return;
 const box=open('MANAGE USER ACCOUNTS','Remove a user from the app using two confirmations. Firebase Authentication deletion requires one later manual Console action.');
 const status=document.createElement('p');status.className='pg-muted';status.textContent='Fetching user accounts…';box.append(status);
 const search=field(box,'Search username or outlet');search.required=false;
 const list=document.createElement('div');box.append(list);
 const draw=(entries)=>{
   list.replaceChildren();
   if(!entries.length){const empty=document.createElement('div');empty.className='pg-empty';empty.textContent='No matching users.';list.append(empty);return;}
   entries.forEach(item=>{
    const line=document.createElement('div');line.className='pg-review-item';
    const detail=document.createElement('div');const label=document.createElement('strong');label.textContent=item.username+' · '+item.outlet;
    const sub=document.createElement('small');sub.textContent=(item.totalPoints||0)+' pts · UID '+item.uid.slice(0,8)+'…';
    detail.append(label,sub);line.append(detail);
    const reserved=RESERVED.has(norm(item.username));
    const blocked=item.uid===user.uid||reserved||item.isAdmin;
    line.append(btn(blocked?'PROTECTED':'DELETE',()=>confirmUserRemoval(item),blocked));
    if(blocked)line.lastChild.disabled=true;
    list.append(line);
   });
 };
 try{
  const snap=await F.getDocs(F.query(F.collection(db,'users'),F.limit(250)));
  const records=snap.docs.map(doc=>({...doc.data(),uid:doc.id}));
  const roleDocs=await Promise.all(records.map(p=>F.getDoc(F.doc(db,'admins',p.uid)).catch(()=>null)));
  const recordsWithRoles=records.map((p,i)=>({...p,isAdmin:roleDocs[i]?.exists()===true}));
  status.textContent='Showing up to 250 accounts. Protected administrator accounts cannot be removed here.';
  const render=()=>{const q=norm(search.value);draw(recordsWithRoles.filter(p=>!q||norm(p.username).includes(q)||norm(p.outlet).includes(q)));};
  search.addEventListener('input',render);render();
 }catch(err){status.textContent='Could not load users: '+errorMessage(err);}
 box.append(btn('BACK',adminPanel,true),btn('CLOSE',close,true));
}
async function confirmUserRemoval(person){
 if(!admins||!user||person.uid===user.uid||RESERVED.has(norm(person.username))||person.isAdmin){
  note('Protected accounts cannot be deleted.');return;
 }
 const text='Delete '+person.username+' from the app?\n\nThis blocks their login, removes their profile and public ranking, and releases their username. Their score history and Firebase Authentication identity require separate administrator cleanup.';
 if(!confirm(text))return; // First independent confirmation.
 const box=open('VERIFY USER DELETION','Second verification. This cannot be undone from this screen.');
 const warning=document.createElement('div');warning.className='pg-private';
 warning.textContent='You are removing '+person.username+' ('+person.outlet+'). To proceed, type DELETE '+person.username+' exactly and enter YOUR administrator password. No other user will be affected.';box.append(warning);
 const phrase=field(box,'Confirmation phrase');phrase.autocomplete='off';phrase.placeholder='DELETE '+person.username;
 const password=field(box,'Your current administrator password','password');password.autocomplete='current-password';
 const failure=document.createElement('p');failure.className='err';box.append(failure);
 const confirmButton=btn('CONFIRM DELETION',async()=>{
  if(!navigator.onLine){failure.textContent='You must be online to remove an account.';return;}
  if(phrase.value.trim()!=='DELETE '+person.username){failure.textContent='Confirmation phrase does not match. No changes were made.';return;}
  if(!password.value){failure.textContent='Administrator password is required.';return;}
  confirmButton.disabled=true;failure.textContent='';
  try{
   const credential=A.EmailAuthProvider.credential(user.email,password.value);
   await A.reauthenticateWithCredential(user,credential);
   await F.runTransaction(db,async tx=>{
    const personRef=F.doc(db,'users',person.uid),rankRef=F.doc(db,'publicRanks',person.uid),
      regRef=F.doc(db,'usernames',norm(person.username)),blockRef=F.doc(db,'accountBlocks',person.uid),
      roleRef=F.doc(db,'admins',person.uid);
    const [account,rank,registry,blocked,role]=await Promise.all([
      tx.get(personRef),tx.get(rankRef),tx.get(regRef),tx.get(blockRef),tx.get(roleRef)
    ]);
    if(!account.exists()||blocked.exists()||role.exists()||RESERVED.has(norm(account.data().username))||person.uid===user.uid)
       throw Error('User is already removed or protected.');
    if(!registry.exists()||registry.data().uid!==person.uid)throw Error('Username registry mismatch. Nothing was removed.');
    tx.set(blockRef,{uid:person.uid,username:account.data().username,blockedBy:user.uid,blockedAt:F.serverTimestamp(),reason:'admin_removed'});
    tx.delete(personRef);tx.delete(regRef);if(rank.exists())tx.delete(rankRef);
   });
   box.replaceChildren();
   const ok=document.createElement('div');ok.className='pg-private';
   ok.textContent=person.username+' is now blocked from BT Exam Prep. Their profile and public ranking were removed. Final step: open Firebase Console > Authentication > Users, find UID '+person.uid+' and delete that Authentication user manually.';
   box.append(ok,btn('BACK TO USERS',manageUsers,true),btn('CLOSE',close,true));
   note('User removed from app; Firebase Auth cleanup is still required.');
  }catch(err){failure.textContent='Account was not removed: '+errorMessage(err);}
  finally{confirmButton.disabled=false;password.value='';}
 });
 box.append(confirmButton,btn('CANCEL',manageUsers,true));
}
async function reviewActivityFlags(){
 if(!admins)return;
 const box=open('ACTIVITY REVIEW','These flags are non-punitive learning integrity indicators, not proof of cheating.');
 const loading=document.createElement('p');loading.textContent='Loading accounts suggested for review…';box.append(loading);
 try{
  const results=await F.getDocs(F.query(F.collection(db,'users'),F.where('reviewSuggested','==',true),F.limit(30)));
  loading.remove();
  if(results.empty){const empty=document.createElement('div');empty.className='pg-empty';empty.textContent='✅ No accounts currently need review.';box.append(empty);}
  for(const doc of results.docs){
   const p=doc.data();const line=document.createElement('div');line.className='pg-review-item';
   const info=document.createElement('div');const name=document.createElement('strong');name.textContent=p.username+' · '+p.outlet;
   const stats=document.createElement('small');stats.textContent=(p.rapidCorrectStreak||0)+' consecutive near-instant correct · '+(p.correctAnswers||0)+' confirmed correct';info.append(name,stats);line.append(info);
   line.append(btn('Mark reviewed',async()=>{
    if(!confirm('Clear the review flag for '+p.username+'? This will NOT change scores.'))return;
    try{await F.updateDoc(F.doc(db,'users',doc.id),{reviewSuggested:false,updatedAt:F.serverTimestamp()});line.remove();note('Review flag cleared; scores unchanged.');}
    catch(e){note(errorMessage(e));}
   },true));box.append(line);
  }
 }catch(e){loading.textContent='Unable to load review flags: '+errorMessage(e);}
 box.append(btn('BACK TO ADMIN',adminPanel,true),btn('CLOSE',close,true));
}
async function decide(req,yes){
 try{await F.runTransaction(db,async tx=>{const r=F.doc(db,'outletRequests',req.id),u=F.doc(db,'users',req.uid),p=F.doc(db,'publicRanks',req.uid);const [a,b,pub]=await Promise.all([tx.get(r),tx.get(u),tx.get(p)]);if(!a.exists()||a.data().status!=='pending'||!b.exists()||b.data().outlet!==a.data().from)throw Error('Request no longer pending');tx.update(r,{status:yes?'approved':'rejected',reviewedBy:user.uid,reviewedAt:F.serverTimestamp()});if(yes){tx.update(u,{outlet:req.to,updatedAt:F.serverTimestamp()});if(pub.exists()){if(req.to==='Other')tx.delete(p);else tx.update(p,{outlet:req.to});}}});note('Request processed.');}
 catch(e){note(errorMessage(e));}
}
async function seedKeys(){
 if(!admins){note('Only administrators may initialise answer keys.');return;}
 try{
  const bank=window.BTExamBridge.getPapers(),items=[];
  for(const [paper,p] of Object.entries(bank)){
    if(!Array.isArray(p.qs))throw Error('Invalid paper: '+paper);
    for(let i=0;i<p.qs.length;i++){
      const ans=p.qs[i].ans;
      if(!Number.isInteger(ans)||ans<0||ans>5)throw Error('Invalid answer key: '+paper+' #'+(i+1));
      items.push({paper,index:i,answer:ans});
    }
  }
  // Small batches reduce Spark plan spikes and rule-access pressure.
  for(let start=0;start<items.length;start+=15){
    const batch=F.writeBatch(db);
    for(const x of items.slice(start,start+15)){
      batch.set(F.doc(db,'answerKeys',x.paper+'_'+x.index),x);
    }
    await batch.commit();
  }
  note('Saved '+items.length+' answer keys. Previously retained results will now retry.');
  await sync();
 }catch(e){note('Could not seed answer keys: '+errorMessage(e));}
}
function show(view){if(!user||!profile){gate();return;}if(view==='board')board();else if(view==='admin'&&admins)adminPanel();else profilePanel();}
async function session(u){
 user=u; if(!u){if(unsubscribe){unsubscribe();unsubscribe=null;}if(unsubscribeAdmin){unsubscribeAdmin();unsubscribeAdmin=null;}if(unsubscribeProfile){unsubscribeProfile();unsubscribeProfile=null;}profile=null;active=null;users=[];requests=[];admins=false;previousRank=null;gate();return;}
 try{
  const blocked=await F.getDoc(F.doc(db,'accountBlocks',u.uid));
  if(blocked.exists()){await A.signOut(auth);note('This account has been removed. Contact the administrator if needed.');return;}
  let snap=await F.getDoc(F.doc(db,'users',u.uid));
  // Firebase Auth can fire before the registration transaction creates the user profile.
  for(let retry=0;retry<6&&!snap.exists();retry++){
    await new Promise(resolve=>setTimeout(resolve,500));
    snap=await F.getDoc(F.doc(db,'users',u.uid));
  }
  if(!snap.exists()){gate('setup','Your account profile could not be loaded. Refresh the app or contact an administrator.');return;}
  profile=snap.data();const adminDocument=await F.getDoc(F.doc(db,'admins',u.uid));admins=adminDocument.exists()&&adminDocument.data().enabled===true;
  if(admins)F.deleteDoc(F.doc(db,'publicRanks',u.uid)).catch(err=>console.warn('Could not hide previous public ranking:',err.code||err));
  if(admins){if(unsubscribeAdmin)unsubscribeAdmin();let sawRequests=false;let previousIds=new Set();unsubscribeAdmin=F.onSnapshot(F.query(F.collection(db,'outletRequests'),F.where('status','==','pending')),s=>{requests=s.docs.map(d=>({id:d.id,...d.data()}));const ids=new Set(requests.map(r=>r.id));if(sawRequests&&requests.some(r=>!previousIds.has(r.id)))note('New outlet-change request requires approval.');if(!sawRequests&&requests.length)note('You have '+requests.length+' pending outlet requests.');previousIds=ids;sawRequests=true;});}
  try{active=JSON.parse(localStorage.getItem(akey())||'null')}catch(_){active=null}
  if(unsubscribeProfile)unsubscribeProfile();unsubscribeProfile=F.onSnapshot(F.doc(db,'users',u.uid),d=>{if(d.exists())profile=d.data();});
  close();if(typeof checkSavedSession==='function')checkSavedSession();restoreCloudSession();sync();
 }catch(e){gate('setup',errorMessage(e));}
}
async function checkForUpdates(){
 if(!navigator.onLine)return;
 try{const r=await fetch('./version.json?check='+Date.now(),{cache:'no-store'});if(!r.ok)return;
 const v=(await r.json()).version;if(v&&v!==APP_VERSION)latestUpdate=v;promptUpdate();
 }catch(e){console.info('Update check unavailable:',e.message);}
}
function promptUpdate(){
 if(!latestUpdate||!root.hidden||$('#quiz')?.classList.contains('active'))return;
 const v=latestUpdate;const box=open('Update available','BT Exam Prep version '+v+' is available. Updating will reload the application.');
 const picture=document.createElement('img');picture.className='pg-celebration';picture.src='./images/mascot/pizza-update.svg';picture.alt='Pizza mascot with refresh symbol';box.prepend(picture);
 box.append(btn('Update now',async()=>{
  try{const reg=await navigator.serviceWorker?.getRegistration();if(reg){await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});}}
  catch(e){console.warn('Update:',e);}
  location.reload();
 }),btn('Later',close,true));
}
window.addEventListener('online',()=>{sync();checkForUpdates();});
setInterval(sync,60000);setInterval(checkForUpdates,1800000);setTimeout(checkForUpdates,20000);
if(!config||!config.apiKey||config.apiKey.startsWith('REPLACE_')){dock.onclick=()=>gate('setup','Configure the free Firebase project before using the leaderboard. The existing exam remains available.');dock.textContent='🏆 Leaderboard (setup)';return;}
try{
 const [appModule,authModule,firestoreModule]=await Promise.all([
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-firestore.js')]);
 A=authModule;F=firestoreModule;const app=appModule.initializeApp(config);auth=A.getAuth(app);
 try{await A.setPersistence(auth,A.browserLocalPersistence);}catch(e){console.warn('Persistent login unavailable:',e);await A.setPersistence(auth,A.inMemoryPersistence);}
 try{db=F.initializeFirestore(app,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})});}catch(storageError){console.warn('Persistent offline database unavailable:',storageError);db=F.getFirestore(app);note('Offline storage is limited on this browser.');}
 A.onAuthStateChanged(auth,session);
}catch(e){gate('setup','Firebase SDK error: '+errorMessage(e));}
})();
