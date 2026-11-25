/* BT Exam Prep Spark-only integration. Firebase SDK 13.2.0. */
(async()=>{
'use strict';
const config=window.BT_FIREBASE_CONFIG,VERSION='13.2.0';
const APP_VERSION='4.7.12-arena';let latestUpdate=null;
const OUTLETS=['Akuressa','Aluthgama','Ambalangoda','Embilipitiya','Galle','Karapitiya','Matara','Matara 02','Megalle','Monaragala','Tangalle','Unawatuna','Welipenna A','Welipenna B','Other'];
const RESERVED=new Set(['indika','udaya']);
const rankEligible=p=>p&&p.outlet!=='Other'&&!RESERVED.has(String(p.username||p.name||'').toLowerCase())&&!p.isAdmin;
const rand=()=>crypto.randomUUID().replace(/-/g,'');
const day=(date=new Date())=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const g=t=>p.find(v=>v.type===t).value;return g('year')+'-'+g('month')+'-'+g('day');};
const week=(date=new Date())=>{const d=new Date(day(date)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)};
const norm=name=>String(name||'').trim().toLowerCase();
const LAST_USERNAME_KEY='bt_spark_last_username_v1';
const OFFLINE_SYNC_MESSAGE='Turn on mobile data or connect to Wi-Fi, then tap Sync again. Your saved answers are safe on this device.';
function savedUsername(){try{const value=localStorage.getItem(LAST_USERNAME_KEY)||'';return valid(value)?value:'';}catch(_){return '';}}
function rememberUsername(value){if(!valid(value))return;try{localStorage.setItem(LAST_USERNAME_KEY,value);}catch(_){}}
async function readSessionDoc(ref,optional=false){
 const cached=async()=>{try{return await F.getDocFromCache(ref);}catch(e){if(optional)return null;throw e;}};
 if(!navigator.onLine)return cached();
 try{return await F.getDoc(ref);}
 catch(e){
  if(/unavailable|network|deadline-exceeded|offline/i.test(String(e?.code||'')+' '+String(e?.message||'')))return cached();
  throw e;
 }
}
const valid=name=>/^[A-Za-z0-9._-]{3,24}$/.test(name);
const $=selector=>document.querySelector(selector);
const clean=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let A,F,auth,db,user=null,profile=null,admins=false,active=null,users=[],requests=[],unsubscribe=null,unsubscribeAdmin=null,unsubscribeProfile=null,syncing=false,syncIssue='',previousRank=null,boardOpen=false,showAllPlayers=false,rankNotice='';
const root=document.createElement('div');root.id='bt-spark-root';root.hidden=true;document.body.append(root);
const style=document.createElement('style');style.textContent='#bt-spark-root{position:fixed;inset:0;z-index:2147483000;background:#0a163ab8;display:grid;place-items:center;padding:12px;box-sizing:border-box;font:15px Arial,sans-serif;color:#26344a}#bt-spark-root[hidden]{display:none}#bt-spark-root .panel{background:white;border-radius:17px;width:min(100%,540px);max-height:calc(100dvh - 24px);overflow:auto;padding:20px;box-sizing:border-box;box-shadow:0 15px 50px #0003}#bt-spark-root h2{font-size:22px;color:#21306b;margin:0 0 8px}#bt-spark-root p{font-size:13px;color:#63748b;line-height:1.45}#bt-spark-root label{display:block;font-weight:700;margin:12px 0 4px;font-size:12px}#bt-spark-root input,#bt-spark-root select{display:block;padding:11px;border-radius:10px;border:1px solid #cbd6e3;width:100%;box-sizing:border-box;font:inherit}#bt-spark-root button{padding:10px 13px;margin:6px 4px 4px 0;background:#0b71b4;color:white;border:0;border-radius:9px;font-weight:750;cursor:pointer}#bt-spark-root button.alt{background:#e8f0f9;color:#21306b}#bt-spark-root .err{color:#c00}#bt-spark-root .entry{padding:11px 0;border-bottom:1px solid #e5eaf0;display:flex;justify-content:space-between;gap:12px}#bt-spark-dock{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147482000;background:#21306b;color:white;border:0;border-radius:30px;padding:11px 14px;font-weight:800}';document.head.append(style);
const dock=document.createElement('button');dock.id='bt-spark-dock';dock.textContent='🏆 Leaderboard';dock.onclick=()=>show('board');document.body.append(dock);
function note(msg){console.info('[BT Spark]',msg);const n=document.createElement('div');n.textContent=msg;n.className='pg-toast';document.body.append(n);setTimeout(()=>n.remove(),3200);}
function award(points,correct,practice=false){
 const old=document.querySelector('.pg-earned-toast');if(old)old.remove();
 const pill=document.createElement('div');pill.className='pg-earned-toast';pill.setAttribute('aria-live','polite');
 const mascot=document.createElement('img');mascot.alt='';mascot.src=correct?'./images/mascot/pizza-correct.png':'./images/mascot/pizza-wrong.png';
 const count=document.createElement('strong');count.textContent=practice?'PRACTICE · NO RANK POINTS':(points>0?'+':'')+points+' PTS';
 pill.append(mascot,count);document.body.append(pill);setTimeout(()=>pill.remove(),4000);
}
function statTotals(){
 const pending=uniquePending(getQueue().filter(q=>q.uid===user?.uid));
 return{points:Number(profile?.totalPoints||0)+pending.reduce((a,e)=>a+Number(e.points||0),0),
 answered:Number(profile?.totalAnswers||0)+pending.length,
 correct:Number(profile?.correctAnswers||0)+pending.filter(e=>e.points>0).length,
 syncCount:pending.length};
}
function syncDetail(err){
 const code=String(err?.code||''),detail=String(err?.message||'');
 if(/permission-denied|insufficient permissions/i.test(code+' '+detail))
   return 'Can’t sync yet. Please contact Udaya.';
 if(/unavailable|network|deadline-exceeded/i.test(code+' '+detail))
   return OFFLINE_SYNC_MESSAGE;
 return 'Sync didn’t work. Try again or ask for help.';
}
function open(title,sub,restore){boardOpen=false;root.classList.remove('arena-profile-mode','arena-account-mode','arena-board-mode','arena-leaderboard-layout','arena-player-details-mode','arena-manage-users-layout');if(restore)window.ArenaNav?.visit('panel:'+title,restore);root.hidden=false;root.innerHTML='<div class="panel"><h2>'+clean(title)+'</h2><p>'+clean(sub||'')+'</p><div id="bt-spark-content"></div></div>';return $('#bt-spark-content');}
function close(){window.ArenaNav?.removePanels();root.hidden=true;root.classList.remove('arena-profile-mode','arena-account-mode','arena-board-mode','arena-leaderboard-layout','arena-player-details-mode','arena-manage-users-layout');root.innerHTML='';boardOpen=false;}
function btn(label,handler,alt=false){const b=document.createElement('button');b.textContent=label;
 const low=String(label).toLowerCase();
 if(/sign out|close|cancel|delete|reject|later/.test(low))b.className='pg-btn-red';
 else if(/leaderboard|sync|my profile|player card|profile|back to users/.test(low))b.className='pg-btn-green';
 else if(alt)b.className='alt';
 b.onclick=handler;return b;}
function label(parent,text,input){const l=document.createElement('label');l.textContent=text;parent.append(l,input);return input;}
function field(parent,text,type='text'){const input=document.createElement('input');input.type=type;input.required=true;return label(parent,text,input);}
function sel(parent,text){const s=document.createElement('select');OUTLETS.forEach(n=>{const o=document.createElement('option');o.textContent=n;o.value=n;s.append(o)});return label(parent,text,s);}
function errorMessage(e){
 const code=String(e?.code||'').toLowerCase(),message=String(e?.message||e||'');
 if(/auth\/wrong-password|auth\/invalid-credential|auth\/invalid-email|auth\/user-not-found/.test(code))return 'Username or password is incorrect.';
 if(/auth\/email-already-in-use/.test(code))return 'This username is already registered.';
 if(/auth\/weak-password/.test(code))return 'Please choose a stronger password.';
 if(/auth\/too-many-requests/.test(code))return 'Too many attempts. Please try again later.';
 if(/OFFLINE_SIGNIN_REQUIRED/.test(message))return 'Turn on mobile data or connect to Wi-Fi to sign in. If you stayed signed in on this device, you can reopen the app offline.';
 if(/auth\/network-request-failed|unavailable|network/i.test(code+' '+message))return 'No connection. Check your internet and try again.';
 if(/permission-denied|insufficient permissions/i.test(code+' '+message))return 'Access denied. Please ask an administrator for help.';
 if(/DAILY_QUESTION_REPEAT/.test(message))return 'This question has already been answered today.';
 if(/OUTLET_CHANGED/.test(message))return 'Your outlet has changed. Ask an administrator for help.';
 if(/Username already taken/i.test(message))return 'That username is taken. Please choose another.';
 if(/Image too large/i.test(message))return 'This picture is too large. Try a smaller PNG.';
 if(/Username registry mismatch/i.test(message))return 'Your username information needs refreshing. Reopen the app and try again.';
 if(/Please enter both passwords/i.test(message))return 'Enter your current password and a new password with at least 8 characters.';
 if(/Please choose a PNG image/i.test(message))return 'Please choose a PNG image.';
 if(/invalid-argument/i.test(message))return 'Some information is invalid. Please try again.';
 return 'Something went wrong. Please try again or ask an administrator for help.';
}
function gate(mode='login',message){
 boardOpen=false;if(unsubscribe){unsubscribe();unsubscribe=null;}
 const box=open(mode==='register'?'Create your account':mode==='setup'?'App setup needed':'Welcome back',mode==='setup'?message:'Sign in to keep track of your progress.');
 const welcome=document.createElement('img');welcome.className='pg-celebration';welcome.src=mode==='setup'?'./images/mascot/pizza-update.png':'./images/mascot/pizza-welcome.png';welcome.alt='Friendly pizza mascot';welcome.style.maxHeight='115px';box.append(welcome);
 if(mode==='setup')return;
 const form=document.createElement('form');const name=field(form,'Username');name.maxLength=24;name.autocomplete='username';
 if(mode==='login')name.value=savedUsername();
 const password=field(form,'Password (8 or more characters)','password');password.minLength=mode==='register'?8:1;
 password.autocomplete=mode==='register'?'new-password':'current-password';
 const outlet=mode==='register'?sel(form,'Select outlet'):null;
 const err=document.createElement('p');err.className='err';const submit=document.createElement('button');submit.type='submit';submit.textContent=mode==='register'?'REGISTER':'SIGN IN';form.append(err,submit);box.append(form);
 form.onsubmit=async e=>{e.preventDefault();err.textContent='';submit.disabled=true;try{if(mode==='register')await register(name.value,password.value,outlet.value);else await login(name.value,password.value);}catch(ex){err.textContent=errorMessage(ex)}finally{submit.disabled=false}};
 box.append(btn(mode==='register'?'Already registered? Sign in':'Create account',()=>gate(mode==='register'?'login':'register'),true));
 const info=document.createElement('p');info.textContent='Keep your password safe. Password recovery is not available yet.';box.append(info);
}
async function register(name,password,outlet){
 const created=await provisionAccount(name,password,outlet,auth,db);await session(created);
}
async function provisionAccount(name,password,outlet,targetAuth,targetDb){
 if(!valid(name)||password.length<8||!OUTLETS.includes(outlet))throw Error('Username must have 3–24 letters, numbers, dots, dashes or underscores; password 8+ characters.');
 const authEmail='bt-'+rand()+'@users.bt-exam.example.com';
 const created=await A.createUserWithEmailAndPassword(targetAuth,authEmail,password);
 try{
  await F.runTransaction(targetDb,async tx=>{
   const reg=F.doc(targetDb,'usernames',norm(name)),u=F.doc(targetDb,'users',created.user.uid);
   if((await tx.get(reg)).exists())throw Error('Username already taken.');
   tx.set(reg,{uid:created.user.uid,authEmail});
   tx.set(u,{uid:created.user.uid,username:name,usernameLower:norm(name),outlet,avatar:'',totalPoints:0,totalAnswers:0,weeklyPoints:{},monthlyPoints:{},outletPoints:{},outletWeeklyPoints:{},outletMonthlyPoints:{},outletAnswers:{},outletWeeklyAnswers:{},outletMonthlyAnswers:{},correctAnswers:0,dailyActivity:{},rapidCorrectStreak:0,reviewSuggested:false,lastEventId:'',createdAt:F.serverTimestamp(),updatedAt:F.serverTimestamp()});
  });
 }catch(e){try{await A.deleteUser(created.user)}catch(_){}throw e;}
 return created.user;
}
async function login(name,password){
 if(!valid(name))throw Error('Invalid username.');
 // Signed-out users must be verified by Firebase online. Never accept passwords offline.
 if(!navigator.onLine)throw Error('OFFLINE_SIGNIN_REQUIRED');
 const r=await F.getDoc(F.doc(db,'usernames',norm(name)));
 if(!r.exists())throw Error('Incorrect username or password.');
 await A.signInWithEmailAndPassword(auth,r.data().authEmail,password);
}
const qkey=()=>user?'bt_spark_pending_'+user.uid:'';
const akey=()=>user?'bt_spark_attempt_'+user.uid:'';
const storageKey=()=>user?'bt_exam_state:'+user.uid:null;
function getQueue(){try{return JSON.parse(localStorage.getItem(qkey())||'[]')}catch(_){return []}}
function saveQueue(q){localStorage.setItem(qkey(),JSON.stringify(q))}
function lastSyncTime(){try{return Number(localStorage.getItem('bt_spark_last_sync_'+user?.uid)||0)}catch(_){return 0}}
function recordLastSync(){try{localStorage.setItem('bt_spark_last_sync_'+user.uid,String(Date.now()))}catch(_){}}
function uniquePending(queue){const seen=new Set();return [...queue].sort((a,b)=>a.earnedAt-b.earnedAt).filter(e=>{const id=dailyEventId(e.uid,eventDay(e),e.paper,e.index);if(seen.has(id))return false;seen.add(id);return true;});}
function pendingDescription(){
 const count=getQueue().filter(e=>e.uid===user?.uid).length;
 return count?count+' '+(count===1?'answer is':'answers are')+' waiting to be saved.':'All answers are saved.';
}
// Stable identities are independent of shuffled answer order, attempts and paper resets.
// The two identical stems shared across papers use one identity each.
function questionKey(paper,index){
 const key=paper+'_'+index;
 return key==='questions_14'?'past2024_22':key==='paper1_9'?'questions_7':key;
}
function dailyEventId(uid,answerDay,paper,index){return uid+'_q_'+answerDay+'_'+questionKey(paper,index);}
function eventDay(e){return day(new Date(e.earnedAt));}
function seenKey(uid,answerDay){return 'bt_spark_seen_questions_'+uid+'_'+answerDay;}
function seenQuestion(uid,answerDay,key){
 try{return JSON.parse(localStorage.getItem(seenKey(uid,answerDay))||'[]').includes(key);}catch(_){return false;}
}
function markQuestion(uid,answerDay,key){
 try{const id=seenKey(uid,answerDay),values=new Set(JSON.parse(localStorage.getItem(id)||'[]'));values.add(key);localStorage.setItem(id,JSON.stringify([...values]));}catch(_){}
}
function modeBadge(repeated=false){
 let label=document.getElementById('bt-exam-mode');
 if(!label){label=document.createElement('span');label.id='bt-exam-mode';label.className='pg-mode-label';document.getElementById('quiz-paper-label')?.after(label);}
 if(label)label.textContent=repeated?'📚 REPEAT · NO RANK POINTS':'🏅 FIRST ANSWER EACH DAY EARNS POINTS';
}
function onQuestion(a){
 if(!user||!active)return;
 const index=Number(a.originalQuestionIndex);if(!Number.isInteger(index)||index<0)return;
 const uid=user.uid,date=day(),key=questionKey(a.paperId,index),id=dailyEventId(uid,date,a.paperId,index);
 modeBadge(seenQuestion(uid,date,key)||getQueue().some(e=>e.uid===uid&&dailyEventId(uid,eventDay(e),e.paper,e.index)===id));
}
function onStart(paper){
 if(!user)return;
 active={id:rand(),paper,dayKey:day(),startedAt:Date.now(),ranked:true};
 localStorage.setItem(akey(),JSON.stringify(active));modeBadge();
}
function onResume(paper,saved){
 if(!user)return;
 try{active=saved||JSON.parse(localStorage.getItem(akey())||'null')}catch(_){active=null}
 if(!active||active.paper!==paper)onStart(paper);
 else{active.ranked=true;localStorage.setItem(akey(),JSON.stringify(active));modeBadge();}
}
function onFinish(){clearTimeout(cloudTimer);cloudTimer=null;pendingCloudSnapshot=null;if(user){localStorage.removeItem(akey());F.deleteDoc(F.doc(db,'savedSessions',user.uid)).catch(()=>{});}active=null;}
async function onAnswer(a){
 if(!user||!profile||!active||active.paper!==a.paperId)return;
 const index=Number(a.originalQuestionIndex),selected=Number(a.selectedOriginalIndex);
 const paper=active.paper,question=window.BT_EXAM_PAPERS?.[paper]?.qs?.[index];
 if(!Number.isInteger(index)||index<0||!question||!Number.isInteger(selected)||selected<-1||selected>=question.opts.length)return;
 const uid=user.uid,earnedAt=Date.now(),earnedDate=new Date(earnedAt),answerDay=day(earnedDate),key=questionKey(paper,index);
 const id=dailyEventId(uid,answerDay,paper,index),q=getQueue();
 if(seenQuestion(uid,answerDay,key)||q.some(x=>x.uid===uid&&dailyEventId(uid,eventDay(x),x.paper,x.index)===id)){
  modeBadge(true);award(0,Boolean(a.correct),true);return;
 }
 const correct=selected===question.ans;
 const remaining=correct?Math.max(0,Math.min(60,Math.floor(Number(a.remainingSeconds)||0))):0;
 const entry={id,uid,paper,index,selected,remaining,points:correct?10+remaining:0,attemptId:active.id,dayKey:answerDay,weekKey:week(earnedDate),monthKey:answerDay.slice(0,7),activityDay:answerDay,outlet:profile.outlet,earnedAt};
 q.push(entry);saveQueue(q);markQuestion(uid,answerDay,key);modeBadge();
 award(entry.points,entry.points>0);sync();
}
// Old clients stored attempt-scoped events. Preserve their queued answers and
// recognize an already committed legacy event during the migration.
function legacyAliases(paper,index){
 const key=questionKey(paper,index);
 if(key==='past2024_22')return [['past2024',22],['questions',14]];
 if(key==='questions_7')return [['questions',7],['paper1',9]];
 return [[paper,index]];
}
async function oldDailyEvent(tx,e){
 for(const [paper,index] of legacyAliases(e.paper,e.index)){
  // Older versions reserved a paper at its start; a session could cross midnight.
  // Look back up to three days, but only count events actually earned on this day.
  for(let offset=0;offset<=3;offset++){
   const date=day(new Date(e.earnedAt-offset*86400000));
   const claim=await tx.get(F.doc(db,'rankedClaims',e.uid+'_'+date+'_'+paper));
   if(!claim.exists())continue;
   const oldId=e.uid+'_'+claim.data().attemptId+'_'+paper+'_'+index;
   const old=await tx.get(F.doc(db,'scoreEvents',oldId));
   if(old.exists()&&old.data().activityDay===e.activityDay)return true;
  }
 }
 return false;
}
window.BTExamBridge={storageKey,getPapers:()=>window.BT_EXAM_PAPERS,getAttempt:()=>active,onPaperStart:o=>onStart(o.paperId),onPaperResume:o=>onResume(o.paperId,o.attempt),onQuestion,onAnswer,onPaperComplete:onFinish,onProgress:state=>saveCloudSession(state),onScreenChange:()=>promptUpdate()};
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
async function requestSync(){
 if(!navigator.onLine){
  syncIssue=OFFLINE_SYNC_MESSAGE;
  note(OFFLINE_SYNC_MESSAGE);
  return false;
 }
 await sync();
 if(syncIssue)note(syncIssue);
 return !syncIssue;
}
async function sync(){
 if(!user||!profile||syncing||!navigator.onLine)return;syncing=true;
 try{
  const uid=user.uid,queueKey=qkey(),done=[],maximum={past2024:29,questions:40,paper1:50,paper2:50,paper3:45};
  const readQueue=()=>{try{return JSON.parse(localStorage.getItem(queueKey)||'[]')}catch(_){return []}};
  const removeEntry=id=>localStorage.setItem(queueKey,JSON.stringify(readQueue().filter(item=>item.id!==id)));
  const handled=new Set();
  while(user?.uid===uid){
   const queued=readQueue().filter(e=>e.uid===uid&&!handled.has(e.id)).sort((a,b)=>a.earnedAt-b.earnedAt)[0];if(!queued)break;
   handled.add(queued.id);
   const answerDay=eventDay(queued),e={...queued,id:dailyEventId(uid,answerDay,queued.paper,queued.index),dayKey:answerDay,activityDay:answerDay,weekKey:week(new Date(queued.earnedAt)),monthKey:answerDay.slice(0,7)};
   if(Date.now()-e.earnedAt>72*3600000){syncIssue='Some older answers need help from an administrator.';continue;}
   if(!maximum[e.paper]||!Number.isInteger(e.index)||e.index<0||e.index>=maximum[e.paper]){syncIssue='An answer could not be matched. Please ask an administrator for help.';continue;}
   const er=F.doc(db,'scoreEvents',e.id),ur=F.doc(db,'users',uid);
   try{
    const outcome=await F.runTransaction(db,async tx=>{
     if(user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
     const pr=F.doc(db,'publicRanks',uid),ad=F.doc(db,'admins',uid);
     const [event,u,publicScore,role]=await Promise.all([tx.get(er),tx.get(ur),tx.get(pr),tx.get(ad)]);
     if(event.exists())return 'duplicate';
     if(await oldDailyEvent(tx,e))return 'duplicate';
     if(user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
     if(!u.exists()||u.data().outlet!==e.outlet)throw Error('OUTLET_CHANGED');
     const p=u.data(),change=(m,k,v)=>Object.assign({},m||{},{[k]:Number((m||{})[k]||0)+v}),wk=e.weekKey+'__'+e.outlet;
     const rapid=e.points>=68?Number(p.rapidCorrectStreak||0)+1:0;
     const review=Boolean(p.reviewSuggested)||rapid>=7;
     tx.set(er,{uid:e.uid,paper:e.paper,index:e.index,selected:e.selected,remaining:e.remaining,points:e.points,attemptId:e.attemptId,dayKey:e.dayKey,weekKey:e.weekKey,monthKey:e.monthKey,outlet:e.outlet,outletWeekKey:wk,outletMonthKey:e.monthKey+'__'+e.outlet,activityDay:e.activityDay||day(new Date(e.earnedAt)),earnedAt:F.Timestamp.fromMillis(e.earnedAt)});
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
       tx.set(pr,{uid,name:p.username,outlet:p.outlet,avatar:p.avatar||'',lastEventId:e.id,totalPoints:Number(b.totalPoints||0)+e.points,
        correctAnswers:Number(b.correctAnswers||0)+(e.points>0?1:0),dailyActivity:change(b.dailyActivity,e.activityDay||day(new Date(e.earnedAt)),1),
        weeklyPoints:change(b.weeklyPoints,e.weekKey,e.points),monthlyPoints:change(b.monthlyPoints,e.monthKey,e.points),
        outletPoints:change(b.outletPoints,e.outlet,e.points),outletWeeklyPoints:change(b.outletWeeklyPoints,wk,e.points),
        outletMonthlyPoints:change(b.outletMonthlyPoints,mk,e.points),outletAnswers:change(b.outletAnswers,e.outlet,1),
        outletWeeklyAnswers:change(b.outletWeeklyAnswers,wk,1),outletMonthlyAnswers:change(b.outletMonthlyAnswers,mk,1),updatedAt:F.serverTimestamp()});
     }
     return 'saved';
    });
    done.push(queued.id);removeEntry(queued.id);markQuestion(uid,e.activityDay,questionKey(e.paper,e.index));
    if(outcome==='duplicate'&&user?.uid===uid&&active?.id===e.attemptId)note('This question has already been answered today. No extra points were added.');
   }catch(err){
    const message=errorMessage(err);
    syncIssue=syncDetail(err);console.warn('Sync paused, result retained:',e.id,message);break;
   }
  }
  if(done.length&&user?.uid===uid){
    recordLastSync();
    try{
      const refreshed=await F.getDoc(F.doc(db,'users',uid));
      if(user?.uid===uid&&refreshed.exists())profile=refreshed.data();
    }catch(e){console.info('Updated player totals will appear after reconnecting.');}
  }
  if(user?.uid===uid&&!readQueue().length)syncIssue='';
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
// Rank history is a client-observed personal record; never used to award points.
let cloudRank=new Map(),rankWrites=new Set(),rankReads=new Map(),rankCloudUnavailable=false,rankSnapshotReady=false;
function readBest(uid){return [window.ArenaRankHistory?.get(uid),cloudRank.get(uid)].filter(n=>Number.isInteger(n)&&n>0).sort((a,b)=>a-b)[0]||null;}
async function loadBest(uid){
 if(!uid||!user||!navigator.onLine||rankCloudUnavailable)return;
 if(rankReads.has(uid))return rankReads.get(uid);
 const promise=F.getDoc(F.doc(db,'rankHistory',uid)).then(doc=>{
  if(doc.exists()){const n=doc.data().bestRank;if(Number.isInteger(n)&&n>0)cloudRank.set(uid,n);}
 }).catch(e=>{if(e.code==='permission-denied')rankCloudUnavailable=true;}).finally(()=>rankReads.delete(uid));
 rankReads.set(uid,promise);return promise;
}
async function rememberOwnRank(){
 if(!user||!profile||!rankSnapshotReady||!navigator.onLine||rankCloudUnavailable||!rankEligible({...profile,isAdmin:admins}))return;
 const uid=user.uid,currentRank=ranked('alltime').find(r=>r.uid===uid)?.rank;if(!currentRank||rankWrites.has(uid))return;
 const observed=window.ArenaRankHistory?.get(uid);const rank=Number.isInteger(observed)&&observed>0?Math.min(currentRank,observed):currentRank;
 const old=cloudRank.get(uid);if(old&&old<=rank)return;
 rankWrites.add(uid);let committed=false;
 try{
  const best=await F.runTransaction(db,async tx=>{
   const ref=F.doc(db,'rankHistory',uid),snap=await tx.get(ref);
   const before=snap.exists()?snap.data().bestRank:null;
   if(Number.isInteger(before)&&before<=rank)return before;
   tx.set(ref,{uid,bestRank:rank,updatedAt:F.serverTimestamp()});return rank;
  });
  if(user?.uid===uid){cloudRank.set(uid,best);committed=true;}
 }catch(e){if(e.code==='permission-denied')rankCloudUnavailable=true;}
 finally{rankWrites.delete(uid);if(committed&&user?.uid===uid&&!rankCloudUnavailable&&navigator.onLine){const observed=window.ArenaRankHistory?.get(uid);if(observed&&cloudRank.has(uid)&&observed<cloudRank.get(uid))rememberOwnRank();}}
}
function mascotToast(title,caption,file){
 const old=document.querySelector('.arena-event-toast');if(old)old.remove();
 const el=document.createElement('div');el.className='arena-event-toast';el.setAttribute('role','status');
 const img=document.createElement('img');img.src='./images/mascot/'+file;img.alt='';img.decoding='async';
 const copy=document.createElement('div'),h=document.createElement('strong'),p=document.createElement('span');h.textContent=title;p.textContent=caption;copy.append(h,p);el.append(img,copy);document.body.append(el);setTimeout(()=>el.remove(),4000);
}
function celebrateAchievements(p,crown=false){
 if(!user||!p||!window.BTRewards)return;
 // A new threshold set needs a fresh celebration record; all earned points remain untouched.
  const key='bt_achievement_seen_v2:'+user.uid;
 const entries=window.BTRewards.achievements(p,day(),week(),crown).filter(a=>a.unlocked);
 try{
  const raw=localStorage.getItem(key);const seen=new Set(raw?JSON.parse(raw):[]);
  const newly=entries.filter(a=>!seen.has(a.id));
  entries.forEach(a=>seen.add(a.id));localStorage.setItem(key,JSON.stringify([...seen]));
  if(raw&&newly.length)mascotToast('ACHIEVEMENT UNLOCKED',newly.map(a=>a.label).join(' · '),'pizza-champ.png');
 }catch(_){}
}

let period='weekly',outletView=false;
function board(keepScroll=false){
 const previousLayout=keepScroll&&root.classList.contains('arena-leaderboard-layout');
 const previousScroll=previousLayout?(root.querySelector('.pg-standings-scroll')?.scrollTop||0):0;
 const previousSearch=previousLayout?root.querySelector('.pg-board-search'):null;
 const searchValue=previousSearch?.value||'';
 const searchFocused=!!previousSearch&&document.activeElement===previousSearch;
 const selection=searchFocused?[previousSearch.selectionStart,previousSearch.selectionEnd]:null;
 boardOpen=true;
 if(!unsubscribe)listen();
 const box=open(outletView?'👑 OUTLET ARENA':'🏆 LEADERBOARD','',board);boardOpen=true;root.classList.add('arena-board-mode','arena-leaderboard-layout');
 root.querySelector('.panel>p')?.remove();
 if(window.BTRewards){const season=window.BTRewards.season(day());if(season){const chip=document.createElement('div');chip.className='pg-season-chip';const crown=document.createElement('span');crown.className='pg-crown-icon';crown.textContent='👑';chip.append(crown,document.createTextNode(' WEEKLY SEASON · '+season.daysRemaining+' DAYS LEFT · Ends '+season.end));box.append(chip);}}
 const buttons=document.createElement('div');buttons.className='pg-nav';
 buttons.append(btn('THIS WEEK',()=>{period='weekly';board()},period!=='weekly'),btn('ALL TIME',()=>{period='alltime';board()},period!=='alltime'),btn(outletView?'PLAYERS':'OUTLETS',()=>{outletView=!outletView;board()},true));box.append(buttons);
 
 const search=document.createElement('input');search.type='text';search.inputMode='search';search.className='pg-board-search';search.value=searchValue;
 search.placeholder=outletView?'Search outlet':'Search username or outlet';
 search.setAttribute('aria-label',search.placeholder);search.autocomplete='off';box.append(search);
 const records=ranked(period,outletView);const places=new Map(records.map((entry,index)=>[entry,index+1]));const winners=outletView?records.filter(v=>v.people>=2).slice(0,3):records.slice(0,3);
 let podium=null;
 if(winners.length){const group=document.createElement('div');podium=group;group.className='pg-podium';for(const [i,r] of winners.entries()){
  const cell=document.createElement('div');cell.className='pg-podium-item arena-rank-'+(i+1)+(outletView?'':' arena-player-podium');if(!outletView)attachPlayerDetails(cell,r);if(i===0){const first=document.createElement('span');first.className='arena-first-rank';first.textContent='1';first.setAttribute('aria-hidden','true');cell.append(first);}const badge=document.createElement('div');badge.textContent=({1:'🥇',2:'🥈',3:'🥉'})[i+1]||'';badge.style.fontSize='23px';cell.append(badge);
  if(!outletView){const picture=document.createElement('img');picture.src=(typeof r.avatar==='string'&&r.avatar.startsWith('data:image/png')?r.avatar:'./images/default-avatar.png');picture.alt='';picture.onerror=()=>picture.src='./images/default-avatar.png';cell.append(picture);}
  const who=document.createElement('strong');who.textContent=r.name;const points=document.createElement('small');points.textContent=r.score+' PTS';cell.append(who,points);group.append(cell);
 }box.append(group);}
 if(outletView){const crown=records.find(v=>v.people>=2);if(crown){const status=document.createElement('div');status.className='pg-private';status.textContent='👑 Crown leader: '+crown.name+' · '+crown.score+' average points';box.append(status);}}
 const section=document.createElement('div');section.className='pg-section';section.textContent=outletView?'OUTLET LEAGUE':'PLAYER STANDINGS';box.append(section);

 const standings=document.createElement('div');standings.className='pg-standings-scroll';
 standings.setAttribute('role','region');standings.setAttribute('aria-label',outletView?'Outlet standings':'Player standings, fourth place onwards');box.append(standings);
 const renderStandings=()=>{
 const query=norm(search.value);
 standings.replaceChildren();
 if(podium)podium.hidden=!!query;
 standings.setAttribute('aria-label',outletView?'Outlet standings':query?'Matching player standings':'Player standings, fourth place onwards');
 if(!records.length){const empty=document.createElement('div');empty.className='pg-empty';empty.textContent='🍕 The first ranked scores will appear here.';standings.append(empty);}
 const remaining=records.filter(r=>!winners.includes(r));
 const shown=query?records.filter(r=>norm(r.name).includes(query)||norm(r.outlet).includes(query)):(outletView||showAllPlayers)?remaining:remaining.slice(0,Math.max(0,20-winners.length));
 const own=records.find(r=>r.uid===user?.uid);
 if(!query&&!outletView&&!showAllPlayers&&own&&!winners.includes(own)&&!shown.some(r=>r.uid===own.uid))shown.push(own);
 for(const r of shown){
  const card=document.createElement('div');card.className='pg-leader-card '+(outletView?'arena-rank-'+r.rank:'arena-player-standing');if(!outletView)attachPlayerDetails(card,r);if(r.uid===user?.uid)card.classList.add('pg-you');
  const place=document.createElement('span');place.className='pg-place';place.textContent=String(places.get(r));card.append(place);
  if(!outletView){const pic=document.createElement('img');pic.className='pg-avatar';pic.src=(typeof r.avatar==='string'&&r.avatar.startsWith('data:image/png')?r.avatar:'./images/default-avatar.png');pic.alt='';pic.onerror=()=>pic.src='./images/default-avatar.png';card.append(pic);}
  const who=document.createElement('div');who.className='pg-person';const title=document.createElement('strong');title.textContent=r.name+(r.uid===user?.uid?' · YOU':'');const caption=document.createElement('small');caption.textContent=outletView?r.people+' active players':r.outlet;who.append(title,caption);card.append(who);
  if(!outletView&&window.BTRewards){
   const badges=window.BTRewards.achievements({totalPoints:r.lifetimePoints,correctAnswers:r.correctAnswers,dailyActivity:r.dailyActivity},day(),week());
   const priority=['centurion','streak-14','legend','streak-7','super-student','rising-star','sharp-mind'];
   const earned=priority.map(id=>badges.find(b=>b.id===id&&b.unlocked)).find(Boolean);
   if(earned){const tiny=document.createElement('small');tiny.className='pg-mini-badge';tiny.textContent=earned.icon+' '+earned.label;who.append(tiny);}
  }
  const score=document.createElement('span');score.className='pg-score';score.textContent=r.score+' PTS';card.append(score);standings.append(card);
 }
 if(!query&&!outletView&&records.length>20){standings.append(btn(showAllPlayers?'SHOW TOP 20':'VIEW ALL '+records.length+' PLAYERS',()=>{showAllPlayers=!showAllPlayers;board(true);},true));}
 if(query&&records.length&&!shown.length){const empty=document.createElement('div');empty.className='pg-empty';empty.textContent='No matching '+(outletView?'outlets':'players')+'.';standings.append(empty);}
 else if(!query&&records.length>0&&!remaining.length){const empty=document.createElement('div');empty.className='pg-empty';empty.textContent='More players will appear here as they earn points.';standings.append(empty);}
 };
 search.addEventListener('input',()=>{renderStandings();standings.scrollTop=0;});
 renderStandings();
 const footer=document.createElement('div');footer.className='pg-board-footer';
 footer.append(btn('👤 MY PROFILE',()=>show('profile'),true),btn('CLOSE',close,true));box.append(footer);
 if(keepScroll)standings.scrollTop=previousScroll;
 if(searchFocused){search.focus({preventScroll:true});if(selection?.every(Number.isInteger))search.setSelectionRange(...selection);}
}
function attachPlayerDetails(node,r){
 node.setAttribute('role','button');node.tabIndex=0;
 node.setAttribute('aria-label','View '+r.name+' player details');
 node.onclick=()=>playerDetails(r.uid);
 node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();node.click();}};
}
function playerDetails(uid){
 const r=ranked('alltime').find(x=>x.uid===uid);if(!r)return;
 const selected=ranked(period).find(x=>x.uid===uid);boardOpen=false;
 const box=open('PLAYER DETAILS','',()=>playerDetails(uid));root.classList.add('arena-board-mode','arena-player-details-mode');root.querySelector('.panel>p')?.remove();
 const panel=document.createElement('div');panel.className='arena-player-detail';const ribbon=document.createElement('div');ribbon.className='arena-detail-ribbon';ribbon.textContent='✦ PIZZA ARENA PLAYER';
 const avatar=document.createElement('img');avatar.src=r.avatar?.startsWith('data:image/png')?r.avatar:'./images/default-avatar.png';avatar.alt='';avatar.onerror=()=>{avatar.onerror=null;avatar.src='./images/default-avatar.png';};
 const name=document.createElement('h3');name.textContent=r.name;
 const outlet=document.createElement('p');outlet.textContent=r.outlet;
 const stats=document.createElement('div');stats.className='arena-detail-stats';
 const best=readBest(uid);
 for(const [label,value] of [['Level',window.BTRewards?.level(r.lifetimePoints)?.number||1],['Points',r.lifetimePoints.toLocaleString()],[period==='weekly'?'Current weekly rank':'Current all-time rank',selected?String(selected.rank):'Not available'],['Best all-time rank observed',best?String(best):'Not recorded']]){
 const tile=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=value;small.textContent=label;tile.append(strong,small);stats.append(tile);}
 panel.append(ribbon,avatar,name,outlet,stats);const actions=document.createElement('div');actions.className='arena-detail-actions';const back=btn('Back to leaderboard',()=>window.ArenaNav?.back(),true);back.classList.add('arena-detail-back');actions.append(back);box.append(panel,actions);
 loadBest(uid).then(()=>{if(panel.isConnected){const n=readBest(uid);stats.lastElementChild.firstElementChild.textContent=n?String(n):'Not recorded';}});
}
function showRankMascot(before,rank){
 const event=window.ArenaRankHistory?.change(before,rank);if(!event)return;
 const box=open(event.title,event.text,()=>showRankMascot(before,rank));
 const pic=document.createElement('img');pic.className='pg-celebration';pic.src='./images/mascot/'+event.mascot;pic.alt=event.title;box.prepend(pic);
 const msg=document.createElement('div');msg.className='pg-private';msg.textContent='CURRENT WEEKLY RANK · '+rank;box.append(msg,btn('LET’S GO!',close));
}
function monthly(){
 const d=Number(day().slice(8)),p=day().slice(0,7),previous=new Date(Date.UTC(Number(p.slice(0,4)),Number(p.slice(5,7))-2,1)).toISOString().slice(0,7);
 if(d<4||!user||!users.length)return;
 const key='bt_spark_champion_'+user.uid+'_'+previous;if(localStorage.getItem(key))return;
 const top=users.filter(rankEligible).map(u=>{const outlets=Object.entries(u.outletMonthlyPoints||{}).filter(([k])=>k.startsWith(previous+'__')).sort((a,b)=>b[1]-a[1]);return{name:u.name,outlet:outlets[0]?.[0].slice(previous.length+2)||u.outlet,score:Number(u.monthlyPoints?.[previous]||0)};}).sort((a,b)=>b.score-a.score);
 if(top[0]?.score>0){localStorage.setItem(key,'1');const champions=top.filter(p=>p.score===top[0].score);const box=open(champions.length>1?'🏆 Joint monthly champions':'🏆 Monthly champion','Congratulations to '+champions.map(p=>p.name+' of '+p.outlet).join(' & ')+' · '+top[0].score+' points');const image=document.createElement('img');image.src='./images/mascot/pizza-monthly.png';image.alt='Pizza mascot celebrating';image.className='pg-celebration';box.prepend(image);box.append(btn('Continue',close));}
}
function listen(){
 if(unsubscribe)return;
 unsubscribe=F.onSnapshot(F.collection(db,'publicRanks'),{includeMetadataChanges:true},snap=>{
  users=snap.docs.map(d=>d.data()).filter(rankEligible);
  if(!snap.metadata?.fromCache&&!snap.metadata?.hasPendingWrites){rankSnapshotReady=true;window.ArenaRankHistory?.observe(ranked('alltime'));rememberOwnRank();const leader=ranked('weekly',true).find(x=>x.people>=2);celebrateAchievements(profile,!!(rankEligible({...profile,isAdmin:admins})&&leader?.name===profile?.outlet));}const mine=ranked().find(x=>x.uid===user?.uid)?.rank||null;
  if(!snap.metadata?.fromCache&&!snap.metadata?.hasPendingWrites&&previousRank!==null&&mine&&mine!==previousRank){const risen=mine<previousRank;rankNotice=mine===1?'champion':previousRank===1?'dethroned':risen?'up':'down';const ev=window.ArenaRankHistory?.change(previousRank,mine);if(ev)mascotToast(ev.title,ev.text,ev.mascot);}
  if(!snap.metadata?.fromCache&&!snap.metadata?.hasPendingWrites)previousRank=mine;
  if(boardOpen&&!root.hidden)board(true);
  if(root.hidden&&!$('#quiz')?.classList.contains('active')&&!$('#assessment-practice')?.classList.contains('active'))monthly();
 },err=>console.warn('Leaderboard listener',err));
}
async function profilePanel(){
 if(!user||!profile){gate();return;}
 boardOpen=false;
 const box=open('MY PLAYER CARD','',profilePanel);
 root.classList.add('arena-profile-mode');
 const totals=statTotals(),pending=totals.syncCount;
 const status=document.createElement('div');status.className='arena-status-card';status.setAttribute('role','status');
 const symbol=document.createElement('span');symbol.className='arena-status-icon';
 symbol.textContent=pending?'!':'✓';
 const statusCopy=document.createElement('div');statusCopy.className='arena-status-copy';
 const offlineHint=syncIssue===OFFLINE_SYNC_MESSAGE&&!navigator.onLine;
 const heading=document.createElement('strong');heading.textContent=offlineHint?'Connect to sync':pending?(syncIssue?'Sync paused':'Answers waiting'):'All caught up';
 const explanation=document.createElement('small');
 explanation.textContent=offlineHint?OFFLINE_SYNC_MESSAGE:pending?pending+' '+(pending===1?'answer is':'answers are')+' saved on this device. '+(syncIssue||'Tap Sync to save them.'):(totals.answered?'Your latest answers are saved.':'Your player card is ready.');
 status.classList.add(pending||offlineHint?'has-pending':'is-synced');
 statusCopy.append(heading,explanation);
 const statusMascot=document.createElement('img');statusMascot.src=pending?'./images/mascot/pizza-update.png':'./images/mascot/pizza-correct.png';statusMascot.decoding='async';statusMascot.alt='';
 status.append(symbol,statusCopy,statusMascot);
 const card=document.createElement('section');card.className='arena-card';
 const cardHeader=document.createElement('div');cardHeader.className='arena-card-heading';cardHeader.textContent='MY PLAYER CARD';card.append(cardHeader);
 const body=document.createElement('div');body.className='arena-card-body';
 const profileRow=document.createElement('div');profileRow.className='arena-profile-top';
 const avatar=document.createElement('img');avatar.className='arena-avatar';
 avatar.src=(typeof profile.avatar==='string'&&profile.avatar.startsWith('data:image/png'))?profile.avatar:'./images/arena/mascot-avatar.png';
 avatar.alt='Player picture';avatar.onerror=()=>{avatar.onerror=null;avatar.src='./images/arena/mascot-avatar.png';};
 const person=document.createElement('div');person.className='arena-person-info';
 const personName=document.createElement('h3');personName.textContent=profile.username;
 const outletLabel=document.createElement('span');outletLabel.className='arena-outlet-pill';outletLabel.textContent=profile.outlet;
 person.append(personName,outletLabel);
 const levels=document.createElement('div');levels.className='arena-level-wrap';
 const lvl=window.BTRewards?.level(Number(totals.points||0))||{number:1,percent:0,next:500,points:0,current:0,required:500,remaining:500};
 const levelBadge=document.createElement('span');levelBadge.className='arena-level-badge';levelBadge.textContent='Lv. '+lvl.number;
 const progress=document.createElement('div');progress.className='arena-level-track';
 progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Progress to level '+(lvl.number+1));
 progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(lvl.required));progress.setAttribute('aria-valuenow',String(lvl.current));
 const progressFill=document.createElement('span');progressFill.className='arena-level-fill';progressFill.style.width=lvl.percent+'%';progress.append(progressFill);
 const nextGoal=document.createElement('small');nextGoal.textContent=lvl.current.toLocaleString()+' / '+lvl.required.toLocaleString()+' pts';
 nextGoal.title=lvl.remaining.toLocaleString()+' points remaining to level '+(lvl.number+1);
 levels.append(levelBadge,progress,nextGoal);profileRow.append(avatar,person,levels);body.append(profileRow);
 const stats=document.createElement('div');stats.className='arena-stats-grid';
 for(const [glyph,count,word] of [['🏆',totals.points,'Points'],['🎯',totals.correct,'Correct'],['📘',totals.answered,'Answered']]){
   const item=document.createElement('div');item.className='arena-stat';if(word==='Correct')item.classList.add('arena-stat-correct');
   const icon=document.createElement('img');icon.className='arena-stat-art';icon.src='./images/arena/stat-'+word.toLowerCase()+'.png';icon.alt='';icon.decoding='async';
   const detail=document.createElement('div');const number=document.createElement('strong');number.textContent=Number(count).toLocaleString();
   const label=document.createElement('span');label.textContent=word;detail.append(number,label);item.append(icon,detail);stats.append(item);
 }body.append(stats);
 const actions=document.createElement('div');actions.className='arena-actions';
 const boardButton=btn('Leaderboard',board);const trophy=document.createElement('img');trophy.className='arena-board-trophy';trophy.src='./images/arena/leaderboard-trophy.png';trophy.alt='';boardButton.prepend(trophy);boardButton.classList.add('pg-btn-green');
 const signoutButton=btn('Sign Out',async()=>{await A.signOut(auth);});signoutButton.classList.remove('pg-btn-red');signoutButton.classList.add('pg-btn-orange','arena-signout-action');
 const closeAction=btn('✕ Close',close);closeAction.classList.add('pg-btn-red');
 actions.append(boardButton,signoutButton,closeAction);body.append(actions);
 const outletRow=document.createElement('button');outletRow.type='button';outletRow.className='arena-outlet-row';
 const pencil=document.createElement('span');pencil.className='arena-outlet-symbol';pencil.textContent='✎';
 const copy=document.createElement('span');const strong=document.createElement('strong');strong.textContent='Change your outlet?';
 copy.append(strong);
 const arrow=document.createElement('span');arrow.textContent='›';arrow.style.fontSize='28px';
 outletRow.append(pencil,copy,arrow);outletRow.onclick=changeOutlet;body.append(outletRow);
 card.append(body);box.append(card);
 const syncStatus=document.createElement('div');syncStatus.className='arena-sync-area';
 const syncButton=btn('⟳ Sync',async()=>{syncButton.disabled=true;await requestSync();profilePanel();});syncButton.classList.add('pg-btn-green','arena-sync-action');
 syncStatus.append(status,syncButton);
 // Load a ranking snapshot when the card opens before the leaderboard has been visited.
 // Use the existing shared listener whenever it is available.
 if(!rankSnapshotReady&&!unsubscribe&&navigator.onLine){
   try{
     const snapshot=await F.getDocs(F.collection(db,'publicRanks'));
     users=snapshot.docs.map(doc=>doc.data()).filter(rankEligible);if(!snapshot.metadata?.fromCache&&!snapshot.metadata?.hasPendingWrites){rankSnapshotReady=true;window.ArenaRankHistory?.observe(ranked('alltime'));rememberOwnRank();}
   }catch(e){console.info('Outlet crown information will refresh when the leaderboard opens.');}
 }
 if(!box.isConnected||!user||!profile)return;
 const rankRow=document.createElement('div');rankRow.className='arena-personal-ranks';
 const currentRank=rankEligible({...profile,isAdmin:admins})?ranked('alltime').find(r=>r.uid===user.uid)?.rank:null;
 const bestRank=currentRank?readBest(user.uid):null;
 for(const [label,value] of [['Current all-time rank',currentRank?String(currentRank):rankSnapshotReady?'Unranked':'Not available'],['Best observed rank',bestRank?String(bestRank):'Not recorded']]){const tile=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=value;small.textContent=label;tile.append(strong,small);rankRow.append(tile);}body.insertBefore(rankRow,actions);if(currentRank){const uid=user.uid;loadBest(uid).then(()=>{if(rankRow.isConnected){const n=readBest(uid);rankRow.lastElementChild.firstElementChild.textContent=n?String(n):'Not recorded';}});}
 const rewards=window.BTRewards;
 if(rewards){
   const eligible=rankEligible({...profile,isAdmin:admins});
   const leader=users.length?ranked('weekly',true).find(x=>x.people>=2):null;
   const crown=!!(eligible&&leader&&leader.name===profile.outlet);
   const entries=rewards.achievements(profile,day(),week(),crown);celebrateAchievements(profile,crown);
   const priority=['rising-star','legend','sharp-mind','super-student','weekly-50','outlet-drive'];
   const sorted=[...entries].sort((a,b)=>priority.indexOf(a.id)===-1?(priority.indexOf(b.id)===-1?0:1):(priority.indexOf(b.id)===-1?-1:priority.indexOf(a.id)-priority.indexOf(b.id)));
   const achievements=document.createElement('section');achievements.className='arena-achievements-card';
   const awardHead=document.createElement('div');awardHead.className='arena-achievements-heading';
   const awardTitle=document.createElement('strong');awardTitle.textContent='ACHIEVEMENTS';
   const viewAll=btn('View All ›',()=>renderRewards(!showAll));
   awardHead.append(awardTitle,viewAll);achievements.append(awardHead);
   const grid=document.createElement('div');grid.className='arena-rewards-grid';achievements.append(grid);box.append(achievements);
   let showAll=false;
   function renderRewards(expand){
     showAll=expand;grid.replaceChildren();viewAll.textContent=showAll?'Show Less':'View All ›';
     const display=showAll?sorted:sorted.slice(0,6);
     for(const item of display){
       const tile=document.createElement('div');tile.className='arena-reward-item'+(item.unlocked?' is-earned':' is-locked');
       const icon=document.createElement('span');icon.className='arena-reward-icon';icon.textContent=item.icon;
       const name=document.createElement('strong');name.textContent=item.label;
       const requirement=document.createElement('small');
       const suffix=['rising-star','legend','first-slice'].includes(item.id)?' pts':['sharp-mind','super-student','centurion'].includes(item.id)?' correct':item.id==='weekly-50'?' weekly pts':item.id==='outlet-drive'?' answers':'';
       requirement.textContent=Math.max(0,Number(item.current)||0).toLocaleString()+' / '+item.target.toLocaleString()+suffix;
       const track=document.createElement('div');track.className='arena-reward-track';
       const progress=document.createElement('span');progress.style.width=item.percent+'%';track.append(progress);
       tile.append(icon,name,requirement,track);grid.append(tile);
     }
   }
   renderRewards(false);
 }
 const utilities=document.createElement('div');utilities.className='arena-actions'+(admins?'':' arena-account-only');
 utilities.append(btn('Account',accountSettings));
 if(admins){const manageButton=btn('Manage',adminPanel);manageButton.classList.add('arena-manage-action');utilities.append(manageButton);}
 utilities.querySelectorAll('button').forEach(b=>{if(!b.classList.contains('arena-manage-action'))b.classList.add('pg-btn-green');});
 box.append(utilities);
 const last=lastSyncTime();
 const footer=document.createElement('p');footer.className='arena-last-updated';footer.style.cssText='text-align:center;color:#826964;font-size:11px;margin:13px 0 8px';
 footer.textContent=last?'Last updated: '+new Date(last).toLocaleString():'Your answers are stored safely on this device until they can be saved.';
 box.append(footer);
 // Sync information belongs at the bottom, after achievements and account controls.
 box.append(syncStatus);
}
function changeOutlet(){
 if(!profile)return;
 const box=open('CHANGE OUTLET','Choose your new outlet.',changeOutlet);
 const fieldSelect=sel(box,'Outlet');fieldSelect.value=profile.outlet;
 const controls=document.createElement('div');controls.className='arena-actions';
 const back=btn('Close',profilePanel);
 const request=btn('Request Change',async()=>{
  if(fieldSelect.value===profile.outlet){profilePanel();return;}
  const target=fieldSelect.value;
  if(!confirm('Ask to change your outlet to '+target+'?'))return;
  request.disabled=true;
  try{await F.addDoc(F.collection(db,'outletRequests'),{uid:user.uid,from:profile.outlet,to:target,status:'pending',createdAt:F.serverTimestamp()});
    note('Your request was sent.');profilePanel();
  }catch(e){note(errorMessage(e));request.disabled=false;}
 });
 request.className='pg-btn-green';request.disabled=true;
 fieldSelect.addEventListener('change',()=>{request.disabled=fieldSelect.value===profile.outlet;});
 controls.append(request,back);box.append(controls);
}
async function accountSettings(){
 if(!user||!profile)return;
 const box=open('ACCOUNT SETTINGS','Update your player picture, username or password.',accountSettings);
 box.classList.add('arena-settings-dialog');
 root.classList.add('arena-account-mode');
 const intro=document.createElement('div');intro.className='arena-account-intro';
 intro.textContent='Changes are saved to your account only when you tap Save.';
 box.prepend(intro);
 const msg=document.createElement('p');msg.className='arena-account-feedback';msg.setAttribute('role','alert');msg.setAttribute('aria-live','polite');box.append(msg);
 const photoSection=document.createElement('div');photoSection.className='arena-account-photo';
 const preview=document.createElement('img');preview.className='arena-photo-preview';
 const fallback='./images/arena/mascot-avatar.png';
 preview.src=typeof profile.avatar==='string'&&profile.avatar.startsWith('data:image/png')?profile.avatar:fallback;
 preview.alt='Current player picture';preview.width=120;preview.height=120;
 const photoControls=document.createElement('div');photoControls.className='arena-photo-controls';
 const image=field(photoControls,'Profile picture (PNG)','file');image.accept='image/png';image.required=false;
 const removeImage=btn('Remove picture',()=>{
   pendingAvatar='';preview.src=fallback;image.value='';msg.textContent='Tap Save to confirm this change.';
 },true);
 photoControls.append(removeImage);photoSection.append(preview,photoControls);box.append(photoSection);
 const newname=field(box,'Username');newname.value=profile.username;newname.maxLength=24;newname.autocomplete='username';
 let pendingAvatar=typeof profile.avatar==='string'?profile.avatar:'',avatarBusy=false;
 // A preview appears immediately; the upload is resized to fit Firestore safely.
 image.onchange=async()=>{
  const file=image.files?.[0];if(!file)return;
  msg.textContent='';
  if(file.type!=='image/png'){msg.textContent='Please choose a PNG image.';image.value='';return;}
  avatarBusy=true;save.disabled=true;
  try{
   const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
   const img=await new Promise((resolve,reject)=>{const picture=new Image();picture.onload=()=>resolve(picture);picture.onerror=reject;picture.src=src;});
   let avatar='';
   for(const size of [160,144,128,112,96,80]){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Unable to process picture.');
    ctx.clearRect(0,0,size,size);
    const scale=Math.max(size/img.width,size/img.height);
    ctx.drawImage(img,(size-img.width*scale)/2,(size-img.height*scale)/2,img.width*scale,img.height*scale);
    avatar=canvas.toDataURL('image/png');
    if(avatar.length<=24000)break;
   }
   if(avatar.length>24000)throw Error('Image too large');
   pendingAvatar=avatar;preview.src=src;preview.alt='Selected player picture';
  }catch(e){msg.textContent=errorMessage(e);image.value='';}
  finally{avatarBusy=false;save.disabled=false;}
 };
 const passwordToggle=btn('Change Password',()=>{
   passwordFields.hidden=!passwordFields.hidden;
   passwordToggle.setAttribute('aria-expanded',String(!passwordFields.hidden));
   if(passwordFields.hidden){oldpass.value='';newpass.value='';}
   else oldpass.focus();
 });
 passwordToggle.className='arena-password-toggle';passwordToggle.type='button';passwordToggle.setAttribute('aria-expanded','false');box.append(passwordToggle);
 const passwordFields=document.createElement('div');passwordFields.className='arena-password-fields';passwordFields.hidden=true;
 const oldpass=field(passwordFields,'Current password','password');oldpass.autocomplete='current-password';oldpass.required=false;
 const newpass=field(passwordFields,'New password (8 or more characters)','password');newpass.autocomplete='new-password';newpass.required=false;
 const securityHelp=document.createElement('p');securityHelp.className='arena-password-help';securityHelp.textContent='Enter both passwords, then tap the main Save button below.';
 passwordFields.append(securityHelp);box.append(passwordFields);
 const controls=document.createElement('div');controls.className='arena-dialog-footer arena-account-footer';
 const save=btn('Save',async()=>{
  if(avatarBusy){msg.textContent='Please finish selecting your picture first.';return;}
  const name=newname.value.trim();
  const changePassword=!passwordFields.hidden;
  save.disabled=true;save.textContent='Saving…';msg.textContent='Saving your changes…';msg.classList.remove('is-success');
  try{
   const result=await window.BTProfileSave.save({
     F,A,db,user,profile,admins,reserved:RESERVED,name,avatar:pendingAvatar,
     changePassword,currentPassword:oldpass.value,newPassword:newpass.value
   });
   if(result.detailsSaved)profile=result.profile;
   msg.textContent=result.changed?'Your account changes have been saved.':'There are no changes to save.';
   msg.classList.add('is-success');
   note(result.changed?'Account saved successfully.':'No changes to save.');
   if(result.passwordSaved){
     oldpass.value='';newpass.value='';passwordFields.hidden=true;
     passwordToggle.setAttribute('aria-expanded','false');
   }
  }catch(e){
   if(e.detailsSaved){
     profile=e.savedProfile;
     msg.textContent='Username and picture saved, but the password could not be updated. '+errorMessage(e);
   }else{
     msg.textContent=e?.message&&/Use 3|Enter your current|Choose a new password|Connect to the internet|account was changed|username information needs|Account information could not/i.test(e.message)?e.message:errorMessage(e);
   }
  }finally{
   save.disabled=false;save.textContent='Save';
  }
 });save.type='button';save.classList.add('pg-btn-green','arena-account-save');
 const closeButton=btn('Close',profilePanel);closeButton.classList.add('pg-btn-red');
 controls.append(save,closeButton);box.append(controls);
}
function viewSyncHealth(){
 if(!admins){profilePanel();return;}
 const box=open('CHECK SAVED ANSWERS','Check answers saved on this phone.',viewSyncHealth);
 const pending=getQueue().filter(e=>e.uid===user?.uid);
 const rows=[
  ['Answers waiting',String(pending.length)],
  ['Internet',navigator.onLine?'Connected':'Not connected'],
  ['Last updated',lastSyncTime()?new Date(lastSyncTime()).toLocaleString():'Not yet'],
  ['Next step',syncIssue||'Try saving your answers again.']
 ];
 for(const [name,value] of rows){
  const row=document.createElement('div');row.className='pg-leader-card';
  const key=document.createElement('strong');key.textContent=name;
  const val=document.createElement('small');val.textContent=value;
  row.append(key,val);box.append(row);
 }
 box.append(btn('Try Sync',async()=>{await requestSync();viewSyncHealth();}),
            btn('Manage',adminPanel),
            btn('Close',close));
}
function openNotifications(){
 if(!user||!profile){gate();return;}
 const box=open('NOTIFICATIONS','Your latest updates.',openNotifications);
 const content=document.createElement('div');content.className='pg-private';
 if(admins&&requests.length){content.textContent=requests.length+' outlet '+(requests.length===1?'request needs':'requests need')+' your attention.';}
 else if(getQueue().length){content.textContent=pendingDescription();}
 else {content.textContent='No new notifications.';}
 box.append(content);
 if(admins&&requests.length)box.append(btn('Manage',adminPanel));
 if(getQueue().length)box.append(btn('Sync',async()=>{await requestSync();openNotifications();}));
 box.append(btn('My Player Card',profilePanel),btn('Close',close));
}
window.BTExamUI={
 openProfile:()=>show('profile'),
 openBoard:()=>show('board'),
 openNotifications,
 dismissForNavigation:()=>{if(user&&profile)close();}
};
function adminPanel(){
 if(!admins||!user)return;
 const box=open('Manage','Review outlet changes and manage accounts.',adminPanel);box.classList.add('arena-admin-panel');
 const pending=requests.filter(r=>r.status==='pending');if(!pending.length)box.append(document.createTextNode('No pending requests.'));
 for(const r of pending){const p=document.createElement('p');p.textContent=r.from+' → '+r.to;box.append(p);box.append(btn('Approve',()=>decide(r,true)),btn('Reject',()=>decide(r,false),true));}
 box.append(btn('Manage users',manageUsers,true));
 if(admins&&norm(profile?.username)==='udaya')box.append(btn('Seed answer keys',seedKeys,true));
 box.append(btn('Review activity flags',reviewActivityFlags,true),btn('Close',close,true));
}
async function adminCreateUser(){
 if(!admins||!user)return;
 const box=open('CREATE USER','Create a regular player without signing out of your administrator account.',adminCreateUser);
 const form=document.createElement('form'),name=field(form,'Username'),password=field(form,'Temporary password','password'),outlet=sel(form,'Outlet');
 name.maxLength=24;name.autocomplete='off';password.minLength=8;password.autocomplete='new-password';
 const message=document.createElement('p');message.setAttribute('role','status');
 const submit=document.createElement('button');submit.type='submit';submit.className='pg-btn-green';submit.textContent='Create User';
 form.append(message,submit);box.append(form,btn('Back to users',manageUsers,true));
 form.onsubmit=async e=>{
  e.preventDefault();if(!admins||!user||submit.disabled)return;
  const n=name.value.trim(),p=password.value,o=outlet.value,adminUid=user.uid;
  if(!valid(n)||RESERVED.has(norm(n))||p.length<8||!OUTLETS.includes(o)){message.textContent='Choose a valid, non-reserved username, outlet and password of at least 8 characters.';return;}
  submit.disabled=true;let isolated;
  try{
   const role=await F.getDocFromServer(F.doc(db,'admins',adminUid));
   if(user?.uid!==adminUid||!admins||!role.exists()||role.data().enabled!==true)throw Error('Administrator access required.');
   if((await F.getDocFromServer(F.doc(db,'usernames',norm(n)))).exists())throw Error('Username already taken.');
   const module=await import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-app.js');
   isolated=module.initializeApp(config,'admin-create-'+rand());
   const secondary=A.initializeAuth(isolated,{persistence:A.inMemoryPersistence});
   await provisionAccount(n,p,o,secondary,F.getFirestore(isolated));
   password.value='';name.value='';message.textContent='Player created successfully. Share the temporary password privately and ask the player to change it.';
   await A.signOut(secondary).catch(()=>{});
  }catch(err){message.textContent=errorMessage(err);}
  finally{if(isolated){const module=await import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-app.js');await module.deleteApp(isolated).catch(()=>{});}submit.disabled=false;}
 };
}

async function manageUsers(){
 if(!admins)return;
 const box=open('MANAGE USERS','Create and manage player accounts.',manageUsers);
 root.classList.add('arena-manage-users-layout');
 const status=document.createElement('p');status.className='pg-muted pg-users-status';status.textContent='Loading users…';status.setAttribute('role','status');box.append(status);
 const search=document.createElement('input');search.type='search';search.className='pg-users-search';search.placeholder='Search username or outlet';search.setAttribute('aria-label',search.placeholder);search.autocomplete='off';box.append(search);
 const list=document.createElement('div');list.className='pg-users-scroll';list.setAttribute('role','region');list.setAttribute('aria-label','User accounts');box.append(list);
 const footer=document.createElement('div');footer.className='pg-users-footer';
 const create=btn('Create User',adminCreateUser);create.classList.add('pg-btn-green');
 footer.append(create,btn('Back',adminPanel,true),btn('Close',close,true));box.append(footer);
 const draw=(entries)=>{
   list.replaceChildren();
   if(!entries.length){const empty=document.createElement('div');empty.className='pg-empty';empty.textContent='No matching users.';list.append(empty);return;}
   entries.forEach(item=>{
    const line=document.createElement('div');line.className='pg-review-item';
    const detail=document.createElement('div');const label=document.createElement('strong');label.textContent=item.username+' · '+item.outlet;
    const sub=document.createElement('small');sub.textContent=(item.totalPoints||0)+' pts · User code '+item.uid.slice(0,8)+'…';
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
  if(!box.isConnected)return;
  status.textContent='Showing up to 250 users. Administrator accounts are protected.';
  const render=()=>{const q=norm(search.value);draw(recordsWithRoles.filter(p=>!q||norm(p.username).includes(q)||norm(p.outlet).includes(q)));list.scrollTop=0;};
  search.addEventListener('input',render);render();
 }catch(err){if(box.isConnected)status.textContent='Could not load users: '+errorMessage(err);}
}
async function confirmUserRemoval(person){
 if(!admins||!user||person.uid===user.uid||RESERVED.has(norm(person.username))||person.isAdmin){
  note('Protected accounts cannot be deleted.');return;
 }
 const text='Remove '+person.username+' from the app?\n\nThey will no longer be able to use this account. Their player card and ranking will be removed. The owner must finish deleting their login separately.';
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
   ok.textContent=person.username+' can no longer access this app. Their player card and ranking were removed. The owner must finish deleting their login in the account dashboard. User code: '+person.uid;
   box.append(ok,btn('BACK TO USERS',manageUsers,true),btn('CLOSE',close,true));
   note('The user was removed from the app. The owner must finish deleting their login.');
  }catch(err){failure.textContent='Account was not removed: '+errorMessage(err);}
  finally{confirmButton.disabled=false;password.value='';}
 });
 box.append(confirmButton,btn('CANCEL',manageUsers,true));
}
async function reviewActivityFlags(){
 if(!admins)return;
 const box=open('REVIEW ACTIVITY','These results may need a closer look. Scores will not change.');
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
 if(!admins||norm(profile?.username)!=='udaya'){note('Only Udaya can set up answer keys.');return;}
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
 user=u; if(!u){if(unsubscribe){unsubscribe();unsubscribe=null;}if(unsubscribeAdmin){unsubscribeAdmin();unsubscribeAdmin=null;}if(unsubscribeProfile){unsubscribeProfile();unsubscribeProfile=null;}profile=null;active=null;users=[];requests=[];admins=false;previousRank=null;rankSnapshotReady=false;cloudRank.clear();rankCloudUnavailable=false;gate();return;}
 try{
  // Offline access is only for the authenticated Firebase user restored by persistence.
  if(auth?.currentUser?.uid!==u.uid)return;
  const blocked=await readSessionDoc(F.doc(db,'accountBlocks',u.uid),true);
  if(blocked?.exists()){await A.signOut(auth);note('This account is no longer available. Please ask for help.');return;}
  let snap=await readSessionDoc(F.doc(db,'users',u.uid));
  // New online registrations can precede the user profile being written.
  for(let retry=0;navigator.onLine&&retry<6&&!snap.exists();retry++){
    await new Promise(resolve=>setTimeout(resolve,500));
    snap=await readSessionDoc(F.doc(db,'users',u.uid));
  }
  if(!snap.exists()){gate('setup',navigator.onLine?'We could not open your account. Please reopen the app or ask for help.':'Turn on mobile data or connect to Wi-Fi once to load your player card on this device.');return;}
  if(auth?.currentUser?.uid!==u.uid)return;
  profile=snap.data();rememberUsername(profile.username);
  const adminDocument=await readSessionDoc(F.doc(db,'admins',u.uid),true);
  admins=!!(adminDocument?.exists()&&adminDocument.data().enabled===true);
  if(admins)F.deleteDoc(F.doc(db,'publicRanks',u.uid)).catch(err=>console.warn('Could not hide previous public ranking:',err.code||err));
  if(admins){if(unsubscribeAdmin)unsubscribeAdmin();let sawRequests=false;let previousIds=new Set();unsubscribeAdmin=F.onSnapshot(F.query(F.collection(db,'outletRequests'),F.where('status','==','pending')),s=>{requests=s.docs.map(d=>({id:d.id,...d.data()}));const ids=new Set(requests.map(r=>r.id));if(sawRequests&&requests.some(r=>!previousIds.has(r.id)))note('New outlet-change request requires approval.');if(!sawRequests&&requests.length)note('You have '+requests.length+' pending outlet requests.');previousIds=ids;sawRequests=true;});}
  try{active=JSON.parse(localStorage.getItem(akey())||'null')}catch(_){active=null}
  if(unsubscribeProfile)unsubscribeProfile();unsubscribeProfile=F.onSnapshot(F.doc(db,'users',u.uid),d=>{if(d.exists()&&auth?.currentUser?.uid===u.uid){profile=d.data();rememberUsername(profile.username);if(!d.metadata?.hasPendingWrites&&!d.metadata?.fromCache)celebrateAchievements(profile);}});
  close();celebrateAchievements(profile);if(typeof checkSavedSession==='function')checkSavedSession();restoreCloudSession();sync();if(!unsubscribe)listen();
 }catch(e){gate('setup',!navigator.onLine?'Turn on mobile data or connect to Wi-Fi once to load your player card on this device.':errorMessage(e));}
}
async function checkForUpdates(){
 if(!navigator.onLine)return;
 try{const r=await fetch('./version.json?check='+Date.now(),{cache:'no-store'});if(!r.ok)return;
 const v=String((await r.json()).version||'');
 const newer=(version,current)=>{
   const a=version.match(/^(\d+)\.(\d+)\.(\d+)/),b=current.match(/^(\d+)\.(\d+)\.(\d+)/);
   if(!a||!b)return Boolean(version&&version!==current);
   for(let i=1;i<=3;i++){if(Number(a[i])!==Number(b[i]))return Number(a[i])>Number(b[i]);}
   return false;
 };
 latestUpdate=newer(v,APP_VERSION)?v:null;promptUpdate();
 }catch(e){console.info('Update check unavailable:',e.message);}
}
function promptUpdate(){
 if(!latestUpdate||!root.hidden||$('#quiz')?.classList.contains('active')||$('#assessment-practice')?.classList.contains('active'))return;
 const v=latestUpdate;const box=open('Update available','BT Exam Prep version '+v+' is available. Updating will reload the application.');
 const picture=document.createElement('img');picture.className='pg-celebration';picture.src='./images/mascot/pizza-update.png';picture.alt='Pizza mascot with refresh symbol';box.prepend(picture);
 const updateNow=btn('Update Now',async()=>{
  updateNow.disabled=true;
  try{
    const workerHost=navigator.serviceWorker;
    const reg=await workerHost?.getRegistration();
    if(reg){
      await reg.update();
      if(reg.installing){
        await Promise.race([
          new Promise(resolve=>{
            const worker=reg.installing;
            const onChange=()=>{if(['installed','activated','redundant'].includes(worker.state)){worker.removeEventListener('statechange',onChange);resolve();}};
            worker.addEventListener('statechange',onChange);onChange();
          }),
          new Promise(resolve=>setTimeout(resolve,6000))
        ]);
      }
      if(reg.waiting){
        const changing=new Promise(resolve=>{
          const finish=()=>{workerHost.removeEventListener('controllerchange',finish);resolve();};
          workerHost.addEventListener('controllerchange',finish,{once:true});
          setTimeout(finish,6000);
        });
        reg.waiting.postMessage({type:'SKIP_WAITING'});
        await changing;
      }
    }
    location.reload();
  }catch(e){
    updateNow.disabled=false;
    note('The update could not be installed. Check your connection and try again.');
  }
});updateNow.classList.add('pg-btn-green','arena-update-now');box.append(updateNow,btn('Later',close,true));
}
window.addEventListener('online',async()=>{
 // Check with Firebase when the connection returns; do not trust cached access forever.
 if(auth?.currentUser&&profile){
  try{
   const uid=auth.currentUser.uid;
   const blocked=await F.getDocFromServer(F.doc(db,'accountBlocks',uid));
   const account=await F.getDocFromServer(F.doc(db,'users',uid));
   if(auth?.currentUser?.uid!==uid)return;
   if(blocked.exists()||!account.exists()){
    await A.signOut(auth);note('This account is no longer available. Please ask for help.');return;
   }
   profile=account.data();rememberUsername(profile.username);
  }catch(e){console.info('Account access will be checked when the connection is available.',e?.code||e);}
 }
 sync();checkForUpdates();
});
setInterval(sync,60000);setInterval(checkForUpdates,1800000);setTimeout(checkForUpdates,20000);
if(!config||!config.apiKey||config.apiKey.startsWith('REPLACE_')){dock.onclick=()=>gate('setup','The leaderboard is not ready yet. Please try again later.');dock.textContent='🏆 Leaderboard (setup)';return;}
try{
 const [appModule,authModule,firestoreModule]=await Promise.all([
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-firestore.js')]);
 A=authModule;F=firestoreModule;const app=appModule.initializeApp(config);auth=A.getAuth(app);
 try{await A.setPersistence(auth,A.browserLocalPersistence);}
 catch(e){
  console.warn('Long-term login persistence unavailable:',e);
  try{await A.setPersistence(auth,A.browserSessionPersistence);}
  catch(_){await A.setPersistence(auth,A.inMemoryPersistence);}
 }
 try{db=F.initializeFirestore(app,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})});}catch(storageError){console.warn('Persistent offline database unavailable:',storageError);db=F.getFirestore(app);note('Offline storage is limited on this browser.');}
 A.onAuthStateChanged(auth,session);
}catch(e){gate('setup','The app could not start. Please check your internet and try again.');}
})();
