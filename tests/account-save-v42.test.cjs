'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const src=fs.readFileSync('js/account-profile-save.js','utf8');
const app=fs.readFileSync('js/bt-spark.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/player-card-v42.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8')).version;
new vm.Script(src,{filename:'account-profile-save.js'});
new vm.Script(app,{filename:'bt-spark.js'});
new vm.Script(sw,{filename:'sw.js'});
const fakeWindow={navigator:{onLine:true}};
vm.runInNewContext(src,{window:fakeWindow});
const api=fakeWindow.BTProfileSave;
assert(api&&api.save&&api.validate);
const sample={uid:'user-1',email:'user1@example.test'};
const profile={username:'player1',usernameLower:'player1',outlet:'Matara',avatar:'',totalPoints:340};
const avatar='data:image/png;base64,'+'abcd';
function setup(options={}){
 const calls={reads:[],writes:[],auth:[],transactions:0};
 const records=new Map([
  ['users/user-1',{...profile}],
  ['usernames/player1',{uid:'user-1',authEmail:sample.email}],
  ['publicRanks/user-1',{uid:'user-1',name:'player1',outlet:'Matara',avatar:'',totalPoints:340}],
 ]);
 if(options.newTaken)records.set('usernames/player2',{uid:'someone-else',authEmail:'someone@example.test'});
 if(options.noRegistry)records.delete('usernames/player1');
 const snapshot=key=>({exists:()=>records.has(key),data:()=>({...records.get(key)})});
 const F={
  doc:(db,collection,id)=>({key:collection+'/'+id}),
  serverTimestamp:()=>'<time>',
  runTransaction:async(db,callback)=>{
    calls.transactions++;
    const reads=[],writes=[];
    const tx={
      get:async ref=>{reads.push(ref.key);calls.reads.push(ref.key);return snapshot(ref.key);},
      set:(ref,data)=>writes.push({op:'set',key:ref.key,value:data}),
      update:(ref,data)=>writes.push({op:'update',key:ref.key,value:data}),
      delete:ref=>writes.push({op:'delete',key:ref.key})
    };
    const value=await callback(tx);
    // Simulate the commit only after the callback completes.
    for(const action of writes){
      if(action.op==='delete')records.delete(action.key);
      else if(action.op==='set')records.set(action.key,action.value);
      else records.set(action.key,{...records.get(action.key),...action.value});
    }
    calls.writes.push(...writes);
    return value;
  }
 };
 const A={
  EmailAuthProvider:{credential:(email,password)=>({email,password})},
  reauthenticateWithCredential:async(u,cred)=>{calls.auth.push('reauth');if(options.authFail)throw Error('auth/wrong-password');},
  updatePassword:async(u,password)=>{calls.auth.push('update');if(options.passwordFail)throw Error('auth/requires-recent-login');}
 };
 return {F,A,db:{},user:sample,profile:{...profile},admins:false,reserved:new Set(['udaya','indika']),calls,records};
}
function input(base,overrides={}){return {...base,name:profile.username,avatar:'',changePassword:false,currentPassword:'',newPassword:'',...overrides};}
(async()=>{
 // No changes => no transaction, no password operation.
 let t=setup();
 let r=await api.save(input(t));
 assert.equal(r.changed,false);assert.equal(t.calls.transactions,0);
 // Picture + username update uses one transaction and keeps points.
 t=setup();r=await api.save(input(t,{name:'player2',avatar}));
 assert.equal(r.detailsSaved,true);
 assert.equal(r.profile.uid,sample.uid,'Editing a legacy profile must retain the authenticated UID used by Sync');
 assert.equal(t.records.get('users/user-1').username,'player2');
 assert.equal(t.records.get('users/user-1').avatar,avatar);
 assert.equal(t.records.get('users/user-1').totalPoints,340);
 assert.equal(t.records.get('publicRanks/user-1').name,'player2');
 assert.equal(t.records.get('publicRanks/user-1').avatar,avatar);
 assert(!t.records.has('usernames/player1'));
 assert.equal(t.records.get('usernames/player2').uid,'user-1');
 assert.equal(t.calls.transactions,1);
 // Password-only update does not create a profile transaction.
 t=setup();r=await api.save(input(t,{changePassword:true,currentPassword:'oldPasswordA',newPassword:'newPasswordA'}));
 assert.equal(r.passwordSaved,true);assert.equal(t.calls.transactions,0);
 assert.deepEqual(t.calls.auth,['reauth','update']);
 // Combined Save authenticates first, then transaction, then password change.
 t=setup();r=await api.save(input(t,{name:'player2',avatar,changePassword:true,currentPassword:'oldPasswordA',newPassword:'newPasswordA'}));
 assert.equal(r.detailsSaved,true);assert.equal(r.passwordSaved,true);
 assert.deepEqual(t.calls.auth,['reauth','update']);
 // Wrong password must prevent any user data modification.
 t=setup({authFail:true});
 await assert.rejects(api.save(input(t,{name:'player2',avatar,changePassword:true,currentPassword:'wrongpass',newPassword:'newPasswordA'})));
 assert.equal(t.calls.transactions,0);
 // A password failure after successfully committing profile changes must be disclosed.
 t=setup({passwordFail:true});let failed=null;
 try{await api.save(input(t,{name:'player2',changePassword:true,currentPassword:'oldPasswordA',newPassword:'newPasswordA'}));}
 catch(e){failed=e;}
 assert(failed?.detailsSaved===true);
 assert.equal(failed.savedProfile.username,'player2');
 assert.equal(t.records.get('users/user-1').username,'player2');
 // Registry conflicts never overwrite another user's reserved username.
 t=setup({newTaken:true});
 await assert.rejects(api.save(input(t,{name:'player2'})),/Username already taken/);
 assert.equal(t.records.get('users/user-1').username,'player1');
 // Old registry missing => repair it in same transaction.
 t=setup({noRegistry:true});r=await api.save(input(t,{avatar}));
 assert.equal(r.detailsSaved,true);
 assert.equal(t.records.get('usernames/player1').uid,'user-1');
 // Input validation and connection safety.
 t=setup();await assert.rejects(api.save(input(t,{name:'a'})),/3–24/);
 await assert.rejects(api.save(input(t,{changePassword:true,newPassword:'short'})),/both passwords|current password/i);
 await assert.rejects(api.save(input(t,{changePassword:true,currentPassword:'samepassword',newPassword:'samepassword'})),/different/);
 await assert.rejects(api.save(input(t,{avatar:'data:image/svg+xml;base64,a'})),/PNG/);
 fakeWindow.navigator.onLine=false;
 await assert.rejects(api.save(input(t,{name:'player2'})),/internet/);
 fakeWindow.navigator.onLine=true;
 // Rendering contracts and new navigation placement.
 assert(app.includes("window.BTProfileSave.save({"));
 assert(!app.includes("btn('Save Password'"));
 assert(!app.includes("controls.append(btn('My Player Card',profilePanel)"));
 assert(app.includes("controls.append(save,closeButton)"));
 const profileStart=app.indexOf('async function profilePanel()'),settingsStart=app.indexOf('async function accountSettings()');
 const profileRender=app.slice(profileStart,settingsStart);
 const achievements=profileRender.indexOf("box.append(achievements)");
 const bottom=profileRender.indexOf("box.append(syncStatus)");
 assert(achievements>=0&&bottom>achievements);
 assert(profileRender.indexOf('box.append(footer)')<bottom);
 assert(profileRender.includes('syncStatus.append(status,syncButton)'));
 assert(html.includes('css/player-card-v42.css?v=4.2.0'));
 assert(html.includes('js/account-profile-save.js?v=4.7.16'));
 assert(css.includes('.arena-profile-mode')&&css.includes('.arena-account-mode'));
 assert(css.includes('prefers-reduced-motion'));
 assert(sw.includes('css/player-card-v42.css?v=4.2.0'));
 assert(sw.includes('js/account-profile-save.js?v=4.7.16'));
 assert.match(version,/^4\.7\.\d+-arena$/);
 assert(app.includes("const APP_VERSION='"+version+"'"));

 // Simulate a returning authenticated player with mobile data turned off.
 const offlineStart=app.indexOf('const LAST_USERNAME_KEY='),offlineEnd=app.indexOf('const valid=name=>',offlineStart);
 const sessionStart=app.indexOf('async function session(u){'),sessionEnd=app.indexOf('\nasync function checkForUpdates()',sessionStart);
 const syncStart=app.indexOf('async function requestSync(){'),syncEnd=app.indexOf('\n// A manual Sync waits',syncStart);
 const loginStart=app.indexOf('async function login(name,password){'),loginEnd=app.indexOf('\nconst qkey=',loginStart);
 assert(offlineStart>=0&&offlineEnd>offlineStart&&sessionStart>=0&&sessionEnd>sessionStart);
 assert(syncStart>=0&&syncEnd>syncStart&&loginStart>=0&&loginEnd>loginStart);
 const savedNames=new Map();
 let onlineReads=0,cacheReads=0,syncCalls=0,loginCalls=0,closed=0,gateError=null,notes=[];
 const userDoc={exists:()=>true,data:()=>({username:'ReturningPlayer',outlet:'Matara',totalPoints:842})};
 const registryDoc={exists:()=>true,data:()=>({authEmail:'existing@example.test'})};
 const Fsession={
  doc:(_db,collection,uid)=>({collection,uid}),
  getDocFromCache:async ref=>{cacheReads++;if(ref.collection==='users')return userDoc;throw Object.assign(Error('Cache miss'),{code:'unavailable'});},
  getDoc:async ref=>{onlineReads++;return ref.collection==='usernames'?registryDoc:ref.collection==='users'?userDoc:{exists:()=>false};},
  onSnapshot:()=>()=>{},
 };
 const offlineCtx={
  navigator:{onLine:false},
  norm: value=>String(value).trim().toLowerCase(),
  valid:n=>/^[A-Za-z0-9._-]{3,24}$/.test(n),
  localStorage:{getItem:k=>savedNames.get(k)||null,setItem:(k,v)=>savedNames.set(k,v)},
  F:Fsession,db:{},auth:{currentUser:{uid:'u-return'}},
  A:{signOut:async()=>{},signInWithEmailAndPassword:async()=>{loginCalls++;}},
  user:null,profile:null,admins:false,active:null,unsubscribe:null,unsubscribeAdmin:null,unsubscribeProfile:null,
  syncIssue:'',syncTask:null,getQueue:()=>[{uid:'u-return'}],note:m=>notes.push(m),close:()=>closed++,gate:(...args)=>{gateError=args;},
  celebrateAchievements:()=>{},restoreCloudSession:()=>{},sync:async()=>{syncCalls++;if(offlineCtx.navigator.onLine)offlineCtx.getQueue=()=>[];},
  listen:()=>{},akey:()=> 'active',console
 };
 vm.createContext(offlineCtx);
 vm.runInContext(app.slice(offlineStart,offlineEnd),offlineCtx);
 vm.runInContext(app.slice(sessionStart,sessionEnd)+'\nthis.restoreSession=session;',offlineCtx);
 vm.runInContext(app.slice(syncStart,syncEnd)+'\nthis.askSync=requestSync;',offlineCtx);
 vm.runInContext(app.slice(loginStart,loginEnd)+'\nthis.passwordSignIn=login;',offlineCtx);
 // Remember only successful account names, never passwords.
 assert.equal(vm.runInContext('savedUsername()',offlineCtx),'');
 vm.runInContext("rememberUsername('ReturningPlayer');",offlineCtx);
 assert.equal(vm.runInContext('savedUsername()',offlineCtx),'ReturningPlayer');
 assert.equal(savedNames.size,1);
 await offlineCtx.restoreSession({uid:'u-return'});
 assert.equal(offlineCtx.profile.username,'ReturningPlayer','Cached user profile opens without mobile data');
 assert.equal(closed,1,'Player session is opened normally');
 assert.equal(onlineReads,0,'Offline session never depends on a network read');
 assert.ok(cacheReads>=3,'Cached block, profile and role inspected');
 assert.equal(gateError,null,'Offline returning player is not taken to a login error');
 const beforeManualSync=syncCalls;
 assert.equal(await offlineCtx.askSync(),false,'Offline manual Sync returns safely');
 assert.equal(syncCalls,beforeManualSync,'Offline manual Sync never contacts the server');
 assert.equal(offlineCtx.syncIssue.includes('Turn on mobile data'),true,'Clear mobile-data/Wi-Fi guidance');
 assert.ok(notes.at(-1).includes('connect to Wi-Fi'));
 await assert.rejects(offlineCtx.passwordSignIn('ReturningPlayer','secret'),/OFFLINE_SIGNIN_REQUIRED/);
 assert.equal(loginCalls,0,'Signing out cannot bypass Firebase password verification offline');
 // Wi-Fi or mobile data restores online sign-in and manual synchronization.
 offlineCtx.navigator.onLine=true;offlineCtx.syncIssue='';
 assert.equal(await offlineCtx.askSync(),true);
 assert.equal(syncCalls,beforeManualSync+1);
 offlineCtx.navigator.onLine=false;
 assert.equal(await offlineCtx.askSync(),true,'An empty queue is already saved even when offline');
 assert.equal(syncCalls,beforeManualSync+1);
 offlineCtx.navigator.onLine=true;
 await offlineCtx.passwordSignIn('ReturningPlayer','secret');
 assert.equal(loginCalls,1);
 assert.ok(onlineReads>=1);
 // Network disruptions fall back to the same authenticated user's cached data.
 Fsession.getDoc=async()=>{onlineReads++;throw Object.assign(Error('network'),{code:'unavailable'});};
 const recovered=await vm.runInContext('readSessionDoc(F.doc(db,"users","u-return"))',offlineCtx);
 assert.equal(recovered.data().username,'ReturningPlayer');
 assert.ok(app.includes("if(auth?.currentUser?.uid!==u.uid)return"),'Cached user must match Firebase auth identity');
 assert.ok(sw.includes('firebase-auth.js')&&sw.includes('firebase-firestore.js'),'Auth SDK is cached for offline reopen');
 console.log('PASS: profile transaction, picture/name changes, password-only, combined save, wrong password, partial failure, registry conflict and repair, sync-last UI, release assets.');
})().catch(err=>{console.error(err);process.exitCode=1;});
