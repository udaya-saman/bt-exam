'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const rewardsSource=fs.readFileSync('js/bt-rewards.js','utf8');
const context={};vm.createContext(context);vm.runInContext(rewardsSource,context);
const rw=context.BTRewards;
assert.ok(rw,'Rewards engine exported');
const medals=rw.achievements({},'2026-11-13','2026-11-09');
assert.equal(medals.length,18);
for(const medal of medals){
 const png=fs.readFileSync('images/achievements/'+medal.id+'.png');
 assert.equal(png.readUInt32BE(16),256);assert.equal(png.readUInt32BE(20),256);
 assert.equal(medal.unlocked,false);
}
assert.deepEqual(Array.from(medals.slice(-6),m=>m.target),[15000,750,21,3000,40,1000]);
const daily={
 '2026-11-09':2,'2026-11-10':5,'2026-11-11':3,'2026-11-12':12,
 '2026-11-13':1
};
assert.equal(rw.streak(daily,'2026-11-13'),5);
assert.equal(rw.streak(daily,'2026-11-14'),5,'One rest day does not drop immediately');
assert.equal(rw.streak(daily,'2026-11-16'),0,'Missing two days breaks streak');
assert.equal(rw.streak({'2026-11-10':2,'2026-11-13':1},'2026-11-13'),1);
assert.equal(rw.streak({},'2026-11-13'),0);
assert.equal(rw.level(0).number,1);
assert.equal(rw.level(500).number,2);
assert.equal(rw.level(549).percent,10);

/* Tiered levels: exact transitions, per-level progress and all 50-level bands. */
const exactLevelCases=[
 [0,1,500,0,500,500],
 [4499,9,500,499,1,4500],
 [4500,10,1000,0,1000,5500],
 [5499,10,1000,999,1,5500],
 [5500,11,1000,0,1000,6500],
 [19499,24,1000,999,1,19500],
 [19500,25,1500,0,1500,21000],
 [56999,49,1500,1499,1,57000],
 [57000,50,2000,0,2000,59000],
 [156999,99,2000,1999,1,157000],
 [157000,100,2500,0,2500,159500],
 [281999,149,2500,2499,1,282000],
 [282000,150,3000,0,3000,285000],
 [431999,199,3000,2999,1,432000],
 [432000,200,3500,0,3500,435500],
 [606999,249,3500,3499,1,607000],
 [607000,250,4000,0,4000,611000]
];
for(const [points,number,required,current,remaining,next] of exactLevelCases){
 const result=rw.level(points);
 assert.equal(result.number,number,'Level at '+points+' lifetime points');
 assert.equal(result.required,required,'Cost of next level at '+points);
 assert.equal(result.current,current,'Current-level points at '+points);
 assert.equal(result.remaining,remaining,'Remaining points at '+points);
 assert.equal(result.next,next,'Cumulative next milestone at '+points);
 assert.equal(result.start,points-current,'Cumulative start at '+points);
 assert.ok(result.percent>=0&&result.percent<100,'Progress should not be complete before leveling at '+points);
}
// Independent boundary walk validates every level, not just selected checkpoints.
let levelStart=0;
for(let number=1;number<=350;number++){
 const required=number<10?500:number<25?1000:number<50?1500:number<100?2000:2500+500*Math.floor((number-100)/50);
 const at=rw.level(levelStart),almost=rw.level(levelStart+required-1),up=rw.level(levelStart+required);
 assert.equal(at.number,number,'Boundary: start of level '+number);
 assert.equal(at.required,required,'Boundary: requirement at '+number);
 assert.equal(at.current,0,'Boundary: zero progress at level '+number);
 assert.equal(at.percent,0,'Boundary: reset progress at '+number);
 assert.equal(at.next,levelStart+required,'Boundary: cumulative target at '+number);
 assert.equal(almost.number,number,'Boundary: do not level early at '+number);
 assert.equal(almost.remaining,1,'Boundary: one point left at '+number);
 assert.ok(almost.percent<100,'Boundary: no false 100% at '+number);
 assert.equal(up.number,number+1,'Boundary: advance at exactly target from '+number);
 assert.equal(up.current,0,'Boundary: reset point progress at '+number);
 levelStart+=required;
}
assert.equal(rw.level(-50).number,1);
assert.equal(rw.level(Number.NaN).number,1);
assert.equal(rw.level(Number.POSITIVE_INFINITY).number,1);

assert.deepEqual(JSON.parse(JSON.stringify(rw.season('2026-11-13'))),{start:'2026-11-09',end:'2026-11-15',daysRemaining:3});
const progress={outlet:'Matara',totalPoints:6500,correctAnswers:160,dailyActivity:daily,
outletWeeklyAnswers:{'2026-11-09__Matara':225},weeklyPoints:{'2026-11-09':225}};
let a=rw.achievements(progress,'2026-11-13','2026-11-09',true);
const unlocked=id=>a.find(x=>x.id===id)?.unlocked;
assert.equal(unlocked('centurion'),true);
assert.equal(unlocked('legend'),false);
assert.equal(unlocked('super-student'),false);
assert.equal(unlocked('weekly-50'),false);
assert.equal(unlocked('streak-3'),true);
assert.equal(unlocked('streak-7'),false);
assert.equal(unlocked('outlet-drive'),true);
assert.equal(unlocked('outlet-crown'),true);
assert.equal(rw.achievements({...progress,outlet:'Other'},'2026-11-13','2026-11-09',false).find(x=>x.id==='outlet-drive').unlocked,false);
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('css/pizza-game.css','utf8');
assert.match(html,/showTimeWarning\(\)/);
assert.match(html,/if \(btTimerWarned \|\| answered \|\| timeLeft <= 0 \|\| timeLeft > 15\)/);
assert.match(html,/onProgress\?\.\(state\)/);
assert.match(css,/\.bt-timer-warning\{[^}]*pointer-events:none/,'Timer graphic cannot intercept touches');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Reduced-motion supported');
for(const state of ['welcome','rank-up','overtaken','timer','correct','wrong','monthly','crown','private','update']){
 const p='images/mascot/pizza-'+state+'.png';
 const png=fs.readFileSync(p);
 assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a',p+' must be PNG');
 assert.ok(png.readUInt32BE(16)>=500,'Mascot must be high resolution');
 assert.ok([4,6].includes(png.readUInt8(25)) || png.includes(Buffer.from('tRNS')),'Mascot must support alpha or tRNS transparency');
}
const js=fs.readFileSync('js/bt-spark.js','utf8'),rules=fs.readFileSync('firestore.rules','utf8');
assert.match(js,/F\.collection\(db,'publicRanks'\)/);
assert.match(js,/SHOW TOP 20/);
assert.match(js,/VIEW ALL/);
assert.match(js,/reviewSuggested/);
assert.match(rules,/correctAnswers/);
assert.match(rules,/dailyActivity/);
assert.match(rules,/reviewSuggested/);
const thresholds=rw.achievements({outlet:'Matara',totalPoints:1499,correctAnswers:49,
 outletWeeklyAnswers:{'2026-11-09__Matara':24},weeklyPoints:{'2026-11-09':199}},'2026-11-13','2026-11-09');
for(const id of ['rising-star','sharp-mind','super-student','weekly-50','outlet-drive'])
 assert.equal(thresholds.find(x=>x.id===id).unlocked,false,id+' must be earned at harder threshold');
assert.equal(thresholds.find(x=>x.id==='rising-star').target,1500);
assert.equal(thresholds.find(x=>x.id==='legend').target,10000);
assert.equal(thresholds.find(x=>x.id==='sharp-mind').target,50);
assert.equal(thresholds.find(x=>x.id==='super-student').target,500);
assert.equal(thresholds.find(x=>x.id==='weekly-50').target,2000);
assert.equal(thresholds.find(x=>x.id==='outlet-drive').target,25);
// Exact unlock boundaries: progress below the target stays locked, at the target unlocks.
const getMilestone=(p,id)=>rw.achievements(p,'2026-11-13','2026-11-09').find(x=>x.id===id);
for(const [id,low,high,field] of [
 ['legend',9999,10000,'totalPoints'],
 ['super-student',499,500,'correctAnswers']
]){
 const before=getMilestone({[field]:low},id),after=getMilestone({[field]:high},id);
 assert.equal(before.unlocked,false,id+' locked before new target');
 assert.ok(before.percent<100,id+' progress before target');
 assert.equal(after.unlocked,true,id+' unlocked exactly at target');
 assert.equal(after.percent,100,id+' complete progress');
}
const weeklyBefore=getMilestone({weeklyPoints:{'2026-11-09':1999}},'weekly-50');
const weeklyAt=getMilestone({weeklyPoints:{'2026-11-09':2000}},'weekly-50');
assert.equal(weeklyBefore.unlocked,false);
assert.equal(weeklyAt.unlocked,true);
assert.equal(weeklyAt.percent,100);
assert.equal(getMilestone({weeklyPoints:{'2026-11-02':5000}},'weekly-50').unlocked,false,'weekly goal uses current week only');
console.log('Transparent PNGs, 10000/2000/500 achievement boundaries, rewards, streak and timer checks passed.');
