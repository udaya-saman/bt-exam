/* BT Exam Prep Spark-only integration. Firebase SDK 13.2.0. */
(async()=>{
'use strict';
const config=window.BT_FIREBASE_CONFIG,VERSION='13.2.0';
const OUTLETS=['Akuressa','Aluthgama','Ambalangoda','Embilipitiya','Galle','Karapitiya','Matara','Matara 02','Megalle','Monaragala','Tangalle','Unawatuna','Welipenna A','Welipenna B'];
const rand=()=>crypto.randomUUID().replace(/-/g,'');
const day=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const week=(date=new Date())=>{const d=new Date(day(date)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)};
const norm=name=>String(name||'').trim().toLowerCase();
const valid=name=>/^[A-Za-z0-9._-]{3,24}$/.test(name);
const $=selector=>document.querySelector(selector);
const clean=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let A,F,auth,db,user=null,profile=null,admins=false,active=null,users=[],requests=[],unsubscribe=null,unsubscribeAdmin=null,syncing=false,previousRank=null;
const root=document.createElement('div');root.id='bt-spark-root';root.hidden=true;document.body.append(root);
const style=document.createElement('style');style.textContent='#bt-spark-root{position:fixed;inset:0;z-index:2147483000;background:#0a163ab8;display:grid;place-items:center;padding:12px;box-sizing:border-box;font:15px Arial,sans-serif;color:#26344a}#bt-spark-root[hidden]{display:none}#bt-spark-root .panel{background:white;border-radius:17px;width:min(100%,540px);max-height:calc(100dvh - 24px);overflow:auto;padding:20px;box-sizing:border-box;box-shadow:0 15px 50px #0003}#bt-spark-root h2{font-size:22px;color:#21306b;margin:0 0 8px}#bt-spark-root p{font-size:13px;color:#63748b;line-height:1.45}#bt-spark-root label{display:block;font-weight:700;margin:12px 0 4px;font-size:12px}#bt-spark-root input,#bt-spark-root select{display:block;padding:11px;border-radius:10px;border:1px solid #cbd6e3;width:100%;box-sizing:border-box;font:inherit}#bt-spark-root button{padding:10px 13px;margin:6px 4px 4px 0;background:#0b71b4;color:white;border:0;border-radius:9px;font-weight:750;cursor:pointer}#bt-spark-root button.alt{background:#e8f0f9;color:#21306b}#bt-spark-root .err{color:#c00}#bt-spark-root .entry{padding:11px 0;border-bottom:1px solid #e5eaf0;display:flex;justify-content:space-between;gap:12px}#bt-spark-dock{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147482000;background:#21306b;color:white;border:0;border-radius:30px;padding:11px 14px;font-weight:800}';document.head.append(style);
const dock=document.createElement('button');dock.id='bt-spark-dock';dock.textContent='🏆 Leaderboard';dock.onclick=()=>show('board');document.body.append(dock);
function note(msg){console.info('[BT Spark]',msg);const n=document.createElement('div');n.textContent=msg;n.style.cssText='position:fixed;z-index:2147483200;top:12px;left:12px;right:12px;background:#21306b;color:#fff;padding:12px;border-radius:12px;text-align:center';document.body.append(n);setTimeout(()=>n.remove(),3300);}
function open(title,sub){root.hidden=false;root.innerHTML='<div class="panel"><h2>'+clean(title)+'</h2><p>'+clean(sub||'')+'</p><div id="bt-spark-content"></div></div>';return $('#bt-spark-content');}
function close(){root.hidden=true;root.innerHTML='';}
function btn(label,handler,alt=false){const b=document.createElement('button');b.textContent=label;if(alt)b.className='alt';b.onclick=handler;return b;}
function label(parent,text,input){const l=document.createElement('label');l.textContent=text;parent.append(l,input);return input;}
function field(parent,text,type='text'){const input=document.createElement('input');input.type=type;input.required=true;return label(parent,text,input);}
function sel(parent,text){const s=document.createElement('select');OUTLETS.forEach(n=>{const o=document.createElement('option');o.textContent=n;o.value=n;s.append(o)});return label(parent,text,s);}
function errorMessage(e){return String(e?.message||e||'Unknown error').replace('Firebase: ','').slice(0,240);}
function gate(mode='login',message){
 const box=open(mode==='register'?'Create your account':mode==='setup'?'Firebase setup needed':'Welcome back',mode==='setup'?message:'Enter your username and password. No personal email is required.');
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
   tx.set(u,{uid:created.user.uid,username:name,usernameLower:norm(name),outlet,avatar:'',totalPoints:0,totalAnswers:0,weeklyPoints:{},monthlyPoints:{},outletPoints:{},outletWeeklyPoints:{},outletAnswers:{},outletWeeklyAnswers:{},lastEventId:'',createdAt:F.serverTimestamp(),updatedAt:F.serverTimestamp()});
  });
 }catch(e){try{await A.deleteUser(created.user)}catch(_){}throw e;}
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
function onStart(paper){if(!user)return;active={id:rand(),paper,dayKey:day(),startedAt:Date.now()};localStorage.setItem(akey(),JSON.stringify(active));}
function onResume(paper){if(!user)return;try{active=JSON.parse(localStorage.getItem(akey())||'null')}catch(_){active=null}if(!active||active.paper!==paper)onStart(paper);}
function onFinish(){if(user)localStorage.removeItem(akey());active=null;}
async function onAnswer(a){
 if(!user||!profile||!active||active.paper!==a.paperId)return;
 const index=Number(a.originalQuestionIndex),selected=Number(a.selectedOriginalIndex);
 if(!Number.isInteger(index)||!Number.isInteger(selected))return;
 const id=user.uid+'_'+active.id+'_'+active.paper+'_'+index,q=getQueue();
 if(q.some(x=>x.id===id))return;
 const remaining=a.correct?Math.max(0,Math.min(60,Math.floor(Number(a.remainingSeconds)||0))):0;
 const entry={id,uid:user.uid,paper:active.paper,index,selected,remaining,points:a.correct?10+remaining:0,attemptId:active.id,dayKey:active.dayKey,weekKey:week(),monthKey:day().slice(0,7),outlet:profile.outlet,earnedAt:Date.now(),claimId:user.uid+'_'+active.dayKey+'_'+active.paper};
 q.push(entry);saveQueue(q);note(entry.points+' points · '+(navigator.onLine?'Pending confirmation':'Saved offline'));sync();
}
window.BTExamBridge={storageKey,onPaperStart:o=>onStart(o.paperId),onPaperResume:o=>onResume(o.paperId),onAnswer,onPaperComplete:onFinish,onProgress:()=>{},onScreenChange:()=>{}};
async function sync(){
 if(!user||!profile||syncing||!navigator.onLine)return;syncing=true;
 try{
  const list=getQueue(),done=[],maximum={past2024:29,questions:40,paper1:50,paper2:50,paper3:45};
  for(const e of list){
   if(Date.now()-e.earnedAt>72*3600000||!maximum[e.paper]||e.index>=maximum[e.paper]){done.push(e.id);continue;}
   const er=F.doc(db,'scoreEvents',e.id),cr=F.doc(db,'rankedClaims',e.claimId),ur=F.doc(db,'users',user.uid);
   try{
    await F.runTransaction(db,async tx=>{
     const [claim,event,u]=await Promise.all([tx.get(cr),tx.get(er),tx.get(ur)]);
     if(event.exists())return;
     if(claim.exists()&&claim.data().attemptId!==e.attemptId)throw Error('PRACTICE_ONLY');
     if(!u.exists()||u.data().outlet!==e.outlet)throw Error('OUTLET_CHANGED');
     const p=u.data(),change=(m,k,v)=>Object.assign({},m||{},{[k]:Number((m||{})[k]||0)+v}),wk=e.weekKey+'__'+e.outlet;
     tx.set(er,{uid:e.uid,paper:e.paper,index:e.index,selected:e.selected,remaining:e.remaining,points:e.points,attemptId:e.attemptId,dayKey:e.dayKey,weekKey:e.weekKey,monthKey:e.monthKey,outlet:e.outlet,outletWeekKey:wk,earnedAt:F.Timestamp.fromMillis(e.earnedAt),claimId:e.claimId});
     if(!claim.exists())tx.set(cr,{uid:e.uid,paper:e.paper,dayKey:e.dayKey,attemptId:e.attemptId,startedAt:F.Timestamp.fromMillis(e.earnedAt)});
     tx.update(ur,{lastEventId:e.id,totalPoints:Number(p.totalPoints||0)+e.points,totalAnswers:Number(p.totalAnswers||0)+1,
      weeklyPoints:change(p.weeklyPoints,e.weekKey,e.points),monthlyPoints:change(p.monthlyPoints,e.monthKey,e.points),
      outletPoints:change(p.outletPoints,e.outlet,e.points),outletWeeklyPoints:change(p.outletWeeklyPoints,wk,e.points),
      outletAnswers:change(p.outletAnswers,e.outlet,1),outletWeeklyAnswers:change(p.outletWeeklyAnswers,wk,1),updatedAt:F.serverTimestamp()});
    });done.push(e.id);
   }catch(err){
    const message=errorMessage(err);
    if(/PRACTICE_ONLY|OUTLET_CHANGED|permission-denied|insufficient permissions|invalid-argument/i.test(message)){done.push(e.id);note('A score was not accepted as ranked.');}
    else{console.warn('Sync paused:',message);break;}
   }
  }
  if(done.length){const removed=new Set(done);saveQueue(getQueue().filter(e=>!removed.has(e.id)));}
 }finally{syncing=false;}
}
function ranked(period='weekly',outletView=false){
 let list=[];const w=week();
 if(!outletView)list=users.map(u=>({name:u.username,outlet:u.outlet,avatar:u.avatar,uid:u.uid,score:period==='weekly'?Number(u.weeklyPoints?.[w]||0):Number(u.totalPoints||0)}));
 else list=OUTLETS.map(name=>{
  let sum=0,people=0;for(const u of users){const key=period==='weekly'?w+'__'+name:name;const ans=period==='weekly'?Number(u.outletWeeklyAnswers?.[key]||0):Number(u.outletAnswers?.[key]||0);sum+=period==='weekly'?Number(u.outletWeeklyPoints?.[key]||0):Number(u.outletPoints?.[key]||0);if(ans>0)people++;}
  return{name,score:people?Math.round(sum/people):0,people};
 });
 list.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
 let position=0,last=-1;return list.map((entry,i)=>{if(entry.score!==last)position=i+1;last=entry.score;return{...entry,rank:position}});
}
let period='weekly',outletView=false;
function board(){
 const box=open(outletView?'Outlet crown':'Leaderboard','Live individual and outlet rankings · Asia/Colombo');
 box.append(btn('Weekly',()=>{period='weekly';board()},period!=='weekly'),btn('All-time',()=>{period='alltime';board()},period!=='alltime'),btn(outletView?'People':'Outlets',()=>{outletView=!outletView;board()},true));
 const list=ranked(period,outletView);
 if(outletView){const winner=list.find(x=>x.people>=3);const banner=document.createElement('p');banner.textContent=winner?'👑 '+winner.name+' · '+winner.score+' average points':'At least three active participants required for a crown.';box.append(banner);}
 for(const r of list){const d=document.createElement('div');d.className='entry';const l=document.createElement('span');l.textContent=r.rank+'. '+r.name+' · '+(outletView?r.people+' active':r.outlet);const p=document.createElement('strong');p.textContent=r.score+' pts';d.append(l,p);box.append(d);}
 box.append(btn('My profile',()=>show('profile'),true),btn('Close',close,true));
}
function monthly(){
 const d=Number(day().slice(8)),p=day().slice(0,7),previous=new Date(Date.UTC(Number(p.slice(0,4)),Number(p.slice(5,7))-2,1)).toISOString().slice(0,7);
 if(d<4||!user||!users.length)return;
 const key='bt_spark_champion_'+user.uid+'_'+previous;if(localStorage.getItem(key))return;
 const top=users.map(u=>({name:u.username,outlet:u.outlet,score:Number(u.monthlyPoints?.[previous]||0)})).sort((a,b)=>b.score-a.score);
 if(top[0]?.score>0){localStorage.setItem(key,'1');const box=open('🏆 Monthly champion','Congratulations to '+top[0].name+' of '+top[0].outlet+' · '+top[0].score+' points');box.append(btn('Continue',close));}
}
function listen(){
 if(unsubscribe)unsubscribe();
 unsubscribe=F.onSnapshot(F.collection(db,'users'),snap=>{
  users=snap.docs.map(d=>d.data());profile=users.find(x=>x.uid===user?.uid)||profile;
  const mine=ranked().find(x=>x.uid===user?.uid)?.rank||null;
  if(previousRank!==null&&mine&&mine<previousRank){note('🏆 Overtook another user · rank #'+mine);}
  previousRank=mine;monthly();
 },err=>console.warn('Leaderboard listener',err));
}
async function profilePanel(){
 const box=open('My profile',profile.username+' · '+profile.outlet+' · '+profile.totalPoints+' total points · '+getQueue().length+' pending');
 const msg=document.createElement('p');msg.className='err';box.append(msg);
 const image=field(box,'Profile picture','file');image.accept='image/jpeg,image/png,image/webp';image.onchange=async()=>{
  try{const file=image.files[0],src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
   const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src});
   const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d'),scale=Math.max(96/img.width,96/img.height);x.fillStyle='white';x.fillRect(0,0,96,96);x.drawImage(img,(96-img.width*scale)/2,(96-img.height*scale)/2,img.width*scale,img.height*scale);
   const avatar=c.toDataURL('image/jpeg',.65);if(avatar.length>24000)throw Error('Image too large');
   await F.updateDoc(F.doc(db,'users',user.uid),{avatar,updatedAt:F.serverTimestamp()});note('Picture updated.');
  }catch(e){msg.textContent=errorMessage(e)}
 };
 box.append(btn('Remove picture',async()=>{await F.updateDoc(F.doc(db,'users',user.uid),{avatar:'',updatedAt:F.serverTimestamp()});note('Picture removed.');},true));
 const newname=field(box,'Change username');newname.value=profile.username;
 box.append(btn('Save username',async()=>{
  try{const n=newname.value.trim();if(!valid(n))throw Error('Invalid username.');
   await F.runTransaction(db,async tx=>{const old=F.doc(db,'usernames',profile.usernameLower),next=F.doc(db,'usernames',norm(n)),u=F.doc(db,'users',user.uid);if(norm(n)!==profile.usernameLower){if((await tx.get(next)).exists())throw Error('Username taken.');tx.set(next,{uid:user.uid,authEmail:user.email});tx.delete(old);}tx.update(u,{username:n,usernameLower:norm(n),updatedAt:F.serverTimestamp()});});note('Username updated.');
  }catch(e){msg.textContent=errorMessage(e)}
 },true));
 const oldpass=field(box,'Current password','password'),newpass=field(box,'New password','password');
 box.append(btn('Change password',async()=>{try{if(newpass.value.length<8)throw Error('Password too short.');await A.reauthenticateWithCredential(user,A.EmailAuthProvider.credential(user.email,oldpass.value));await A.updatePassword(user,newpass.value);note('Password changed.');}catch(e){msg.textContent=errorMessage(e)}},true));
 const outlet=sel(box,'Request outlet change');outlet.value=profile.outlet;
 box.append(btn('Submit outlet request',async()=>{try{if(outlet.value===profile.outlet)throw Error('Select another outlet.');await F.addDoc(F.collection(db,'outletRequests'),{uid:user.uid,from:profile.outlet,to:outlet.value,status:'pending',createdAt:F.serverTimestamp()});note('Request sent for admin approval.');}catch(e){msg.textContent=errorMessage(e)}},true));
 if(admins)box.append(btn('Approve outlet requests',adminPanel));
 box.append(btn('Leaderboard',board,true),btn('Sync',sync,true),btn('Sign out',async()=>{onFinish();await A.signOut(auth);},true),btn('Close',close,true));
}
function adminPanel(){
 const box=open('Outlet approvals','Both administrators can review pending requests.');
 const pending=requests.filter(r=>r.status==='pending');if(!pending.length)box.append(document.createTextNode('No pending requests.'));
 for(const r of pending){const p=document.createElement('p');p.textContent=r.from+' → '+r.to;box.append(p);box.append(btn('Approve',()=>decide(r,true)),btn('Reject',()=>decide(r,false),true));}
 box.append(btn('Seed answer keys',seedKeys,true),btn('Close',close,true));
}
async function decide(req,yes){
 try{await F.runTransaction(db,async tx=>{const r=F.doc(db,'outletRequests',req.id),u=F.doc(db,'users',req.uid);const [a,b]=await Promise.all([tx.get(r),tx.get(u)]);if(!a.exists()||a.data().status!=='pending'||!b.exists())throw Error('Request not pending');tx.update(r,{status:yes?'approved':'rejected',reviewedBy:user.uid,reviewedAt:F.serverTimestamp()});if(yes)tx.update(u,{outlet:req.to,updatedAt:F.serverTimestamp()});});note('Request processed.');}
 catch(e){note(errorMessage(e));}
}
async function seedKeys(){
 try{const bank=window.BTExamBridge.getPapers();const b=F.writeBatch(db);let count=0;for(const [paper,p] of Object.entries(bank))for(let i=0;i<p.qs.length;i++){b.set(F.doc(db,'answerKeys',paper+'_'+i),{answer:p.qs[i].ans,paper,index:i});count++}await b.commit();note('Seeded '+count+' answer keys.');}
 catch(e){note(errorMessage(e));}
}
function show(view){if(!user||!profile){gate();return;}if(view==='board')board();else if(view==='admin'&&admins)adminPanel();else profilePanel();}
async function session(u){
 user=u; if(!u){profile=null;active=null;users=[];gate();return;}
 try{const snap=await F.getDoc(F.doc(db,'users',u.uid));if(!snap.exists()){gate('setup','The account profile is missing. Contact the administrator.');return;}
  profile=snap.data();admins=(await F.getDoc(F.doc(db,'admins',u.uid))).exists();
  if(admins){if(unsubscribeAdmin)unsubscribeAdmin();unsubscribeAdmin=F.onSnapshot(F.query(F.collection(db,'outletRequests'),F.where('status','==','pending')),s=>{requests=s.docs.map(d=>({id:d.id,...d.data()}));});}
  try{active=JSON.parse(localStorage.getItem(akey())||'null')}catch(_){active=null}
  close();listen();sync();
 }catch(e){gate('setup',errorMessage(e));}
}
window.addEventListener('online',sync);setInterval(sync,60000);
if(!config||!config.apiKey||config.apiKey.startsWith('REPLACE_')){gate('setup','Set Firebase web-app settings in firebase-config.js first.');return;}
try{
 const [appModule,authModule,firestoreModule]=await Promise.all([
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/'+VERSION+'/firebase-firestore.js')]);
 A=authModule;F=firestoreModule;const app=appModule.initializeApp(config);auth=A.getAuth(app);
 await A.setPersistence(auth,A.browserLocalPersistence);
 db=F.initializeFirestore(app,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})});
 A.onAuthStateChanged(auth,session);
}catch(e){gate('setup','Firebase SDK error: '+errorMessage(e));}
})();
