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
assert.match(app,/className='arena-stats-grid'/,'Stats cards present');
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
assert.match(app,/const qkey=\(\)=>user\?/,'Pending answers are scoped by user');
assert.match(app,/saveQueue\(getQueue\(\)\.filter\(item=>item\.id!==e\.id\)\)/,'Committed answers do not remain pending');
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
assert.equal(version.version,'4.5.0-arena');
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
 ['Rising Star',1500],['Pizza Legend',6000],['Sharp Mind',50],
 ['Super Student',150],['Weekly Warrior',200],['Outlet Challenger',25]
])assert.match(rewards,new RegExp(name+"',"+target+","),name+' target unchanged');
console.log('Pizza Arena redesigned screens, accessible actions, PNG assets and rewards checks passed.');
