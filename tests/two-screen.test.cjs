'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('js/bt-spark.js','utf8');
const css=fs.readFileSync('css/pizza-v36.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const rewards=fs.readFileSync('js/bt-rewards.js','utf8');
assert.match(index,/class="arena-hero"/,'Home has branded Arena hero');
assert.match(index,/class="arena-header-actions"/,'Home header has working actions');
assert.match(index,/BTExamUI\?\.openBoard/,'Leaderboard action wired');
assert.match(index,/BTExamUI\?\.openProfile/,'Player profile action wired');
assert.match(index,/BTExamUI\?\.openNotifications/,'Notifications action wired');
assert.match(index,/css\/pizza-v36\.css/,'New CSS loaded');
assert.match(app,/async function profilePanel\(\)/,'Player Card present');
assert.match(app,/root\.classList\.add\('arena-profile-mode'\)/,'Player Card becomes a full screen');
assert.match(app,/className='arena-profile-top'/,'Player profile area present');
const profileSource=app.slice(app.indexOf('async function profilePanel()'),app.indexOf('function changeOutlet()'));
assert.doesNotMatch(profileSource,/PIZZA ARENA · PLAYER HQ|className='arena-page-top'/,'Redundant Player HQ top banner removed');
assert.match(profileSource,/arena-signout-action/,'Dedicated orange Sign Out class present');
assert.match(profileSource,/arena-stat-correct/,'Correct statistic uses professional icon treatment');
assert.ok(profileSource.includes("btn('✕ Close',close)"),'Working Close control retained');
assert.ok(fs.readFileSync('css/arena-polish-v43.css','utf8').includes('.arena-actions button.arena-signout-action'),'Orange Sign Out styling loaded');
assert.match(app,/className='arena-stats-grid'/,'Stats cards present');
assert.ok(app.includes("nextGoal.textContent=lvl.current.toLocaleString()+' / '+lvl.required.toLocaleString()+' pts'"),'Player Card shows current-tier progress and required points');
assert.ok(app.includes("progress.setAttribute('aria-valuemax',String(lvl.required))"),'Accessible level progress uses the current tier requirement');
assert.ok(app.includes("nextGoal.title=lvl.remaining.toLocaleString()"),'Remaining points are exposed on the Player Card');

assert.match(app,/className='arena-rewards-grid'/,'Reward grid present');
assert.match(app,/function changeOutlet\(\)/,'Outlet request panel present');
assert.match(app,/request\.disabled=true/,'Outlet button disabled until outlet changes');
assert.match(app,/function accountSettings\(\)/,'Account controls preserved');
assert.doesNotMatch(app,/function backupPanel\(\)|Save My Progress|Save a Copy/,'Requested manual backup controls removed');
assert.match(app,/function viewSyncHealth\(\)/,'Admin saved answers view present');
assert.match(app,/function openNotifications\(\)/,'Notifications working');
assert.match(app,/BTExamUI=\{/,'Home actions attached');
assert.match(app,/role','status'/,'Accessible status card');
assert.match(app,/recordLastSync\(\)/,'Recent synced status');
assert.match(app,/function getQueue\(\)/,'Offline pending answers remain account-specific');
const loginSection=app.slice(app.indexOf("function gate(mode='login'"),app.indexOf("const qkey=()"));
assert.ok(loginSection.includes("if(mode==='login')name.value=savedUsername()"),'Returning username is pre-filled');
assert.ok(loginSection.includes('OFFLINE_SIGNIN_REQUIRED'),'Fresh sign-ins must verify Firebase credentials');
assert.ok(app.includes('browserLocalPersistence'),'Authenticated session persists on device');
assert.ok(app.includes('getDocFromCache(ref)'),'Offline restoration uses Firestore cache');
assert.ok(app.includes('rememberUsername(profile.username)'),'Remember username only after trusted profile load');
assert.ok(app.includes("await requestSync();profilePanel();"),'Manual Sync displays offline help');
assert.ok(app.includes('Turn on mobile data or connect to Wi-Fi'),'Offline Sync guidance is understandable');
assert.ok(sw.includes('await fill(cache,SDK,previous)'),'Firebase runtime pre-cached for offline app reopening');

assert.match(app,/const qkey=\(\)=>user\?/,'Pending answers are scoped by user');
assert.match(app,/const removeEntry=id=>localStorage\.setItem\(queueKey,JSON\.stringify\(readQueue\(\)\.filter\(item=>item\.id!==id\)\)\)/,'Remove only the confirmed queue entry for the original user');
assert.match(app,/done\.push\(queued\.id\);removeEntry\(queued\.id\)/,'Confirmed answers do not remain pending');
assert.match(index,/id="paper-select"/,'Created Questions selector exists');
assert.match(index,/id="study-app"/,'New source-based Study reader exists');
assert.match(app,/aria-live/,'Reward announces points');
assert.match(css,/@media\(max-width:530px\)/,'Mobile Player Card responsive');
assert.match(css,/@media\(max-width:670px\)/,'Home responsive');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Reduced-motion support');
assert.match(css,/\.arena-hero/,'Home hero CSS exists');
assert.match(css,/\.arena-status-card/,'Status CSS exists');
assert.match(css,/\.arena-rewards-grid/,'Rewards grid CSS exists');
assert.match(sw,/pizza-v36\.css/,'Offline caches new theme');
assert.match(version.version,/^4\.7\.\d+-arena$/);
assert.ok(app.includes("const APP_VERSION='"+version.version+"'"));
for(const source of [index,app,css,sw,fs.readFileSync('manifest.json','utf8')]){
 assert.doesNotMatch(source,/\.svg(?:["'\s?)]|$)|\.webp(?:["'\s?)]|$)/m,'No SVG/WebP visual assets loaded');
}
for(const filename of [
 'pizza-welcome.png','pizza-correct.png','pizza-rank-up.png','pizza-overtaken.png',
 'pizza-timer.png','pizza-private.png','pizza-crown.png','pizza-monthly.png'
]){
 const file='images/mascot/'+filename;
 const buf=fs.readFileSync(file);
 assert.equal(buf.toString('hex',0,8),'89504e470d0a1a0a',filename+' is PNG');
 assert.ok(buf.readUInt32BE(16)>=500,filename+' has adequate width');
 assert.ok([4,6].includes(buf.readUInt8(25))||buf.includes(Buffer.from('tRNS')),filename+' retains transparency');
}
for(const [name,target] of [
 ['Rising Star',1500],['Pizza Legend',10000],['Sharp Mind',50],
 ['Super Student',500],['Weekly Warrior',2000],['Outlet Challenger',25]
])assert.match(rewards,new RegExp(name+"',"+target+","),name+' target unchanged');
console.log('Pizza Arena redesigned screens, accessible actions, PNG assets and rewards checks passed.');

(async()=>{
 const vm=require('node:vm'),storage=new Map(),awards=[];
 let clock=Date.parse('2026-11-25T18:29:00Z'),seq=0;
 class TestDate extends Date{constructor(...a){super(...(a.length?a:[clock]))}static now(){return clock}}
 const day=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d||new TestDate());
 const label={};
 const paper={qs:Array.from({length:50},()=>({ans:0,opts:['A','B']}))};
 const ctx={Date:TestDate,day,week:()=> '2026-11-23',user:{uid:'one'},profile:{outlet:'Matara'},active:null,
 window:{BT_EXAM_PAPERS:{paper1:paper,paper2:paper,questions:paper,past2024:paper}},document:{getElementById:()=>label},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 rand:()=> 'attempt'+(++seq),akey:()=> 'attempt_'+ctx.user.uid,
 getQueue:()=>JSON.parse(storage.get('queue_'+ctx.user.uid)||'[]'),saveQueue:q=>storage.set('queue_'+ctx.user.uid,JSON.stringify(q)),
 award:(...a)=>awards.push(a),sync:()=>{},db:{},F:{doc:(_db,c,id)=>c+'/'+id}};
 vm.createContext(ctx);
 vm.runInContext(app.slice(app.indexOf('function questionKey('),app.indexOf('window.BTExamBridge=')),ctx);
 const answer=async(p,i,selected=0)=>ctx.onAnswer({paperId:p,originalQuestionIndex:i,selectedOriginalIndex:selected,remainingSeconds:20,correct:selected===0});
 ctx.onStart('paper1');await answer('paper1',0);
 assert.equal(ctx.getQueue().length,1);assert.equal(ctx.getQueue()[0].points,30);
 ctx.onStart('paper1');await answer('paper1',0);assert.equal(ctx.getQueue().length,1);assert.equal(awards.at(-1)[2],true);
 await answer('paper1',1);assert.equal(ctx.getQueue().length,2);
 await answer('paper1',2,1);await answer('paper1',2);assert.equal(ctx.getQueue().length,3);assert.equal(ctx.getQueue()[2].points,0);
 await answer('paper1',3,-1);await answer('paper1',3);assert.equal(ctx.getQueue().length,4);assert.equal(ctx.getQueue()[3].points,0);
 await answer('paper1',9);ctx.onStart('questions');await answer('questions',7);assert.equal(ctx.getQueue().length,5);
 ctx.onStart('past2024');await answer('past2024',22);ctx.onStart('questions');await answer('questions',14);assert.equal(ctx.getQueue().length,6);
 ctx.onResume('paper1',{id:'old',paper:'paper1',ranked:false});await answer('paper1',4);assert.equal(ctx.getQueue().length,7);
 clock+=120000;ctx.onStart('paper1');await answer('paper1',0);assert.equal(ctx.getQueue().length,8);assert.notEqual(ctx.getQueue()[0].dayKey,ctx.getQueue()[7].dayKey);
 ctx.user={uid:'two'};ctx.onStart('paper1');await answer('paper1',0);assert.equal(ctx.getQueue().length,1);assert.equal(ctx.getQueue()[0].points,30);
 const e=ctx.getQueue()[0],prev=day(new TestDate(clock-86400000));
 const refs=new Map([['rankedClaims/two_'+prev+'_paper1',{attemptId:'legacy'}],['scoreEvents/two_legacy_paper1_0',{activityDay:e.activityDay}]]);
 const tx={get:async ref=>({exists:()=>refs.has(ref),data:()=>refs.get(ref)})};
 assert.equal(await ctx.oldDailyEvent(tx,e),true);refs.set('scoreEvents/two_legacy_paper1_0',{activityDay:prev});assert.equal(await ctx.oldDailyEvent(tx,e),false);
 console.log('Daily scoring: resets, repeat, wrong/timeout, aliases, legacy resume, Sri Lanka midnight and user isolation passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
