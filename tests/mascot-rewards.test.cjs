'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const rewardsSource=fs.readFileSync('js/bt-rewards.js','utf8');
const context={};vm.createContext(context);vm.runInContext(rewardsSource,context);
const rw=context.BTRewards;
assert.ok(rw,'Rewards engine exported');
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
assert.deepEqual(JSON.parse(JSON.stringify(rw.season('2026-11-13'))),{start:'2026-11-09',end:'2026-11-15',daysRemaining:3});
const progress={outlet:'Matara',totalPoints:6500,correctAnswers:160,dailyActivity:daily,
outletWeeklyAnswers:{'2026-11-09__Matara':225}};
let a=rw.achievements(progress,'2026-11-13','2026-11-09',true);
const unlocked=id=>a.find(x=>x.id===id)?.unlocked;
assert.equal(unlocked('centurion'),true);
assert.equal(unlocked('legend'),true);
assert.equal(unlocked('streak-3'),true);
assert.equal(unlocked('streak-7'),false);
assert.equal(unlocked('weekly-50'),true);
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
 assert.ok(png.includes(Buffer.from('tRNS')),'Mascot must have transparency');
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
 outletWeeklyAnswers:{'2026-11-09__Matara':24}},'2026-11-13','2026-11-09');
for(const id of ['rising-star','sharp-mind','super-student','weekly-50','outlet-drive'])
 assert.equal(thresholds.find(x=>x.id===id).unlocked,false,id+' must be earned at harder threshold');
assert.equal(thresholds.find(x=>x.id==='rising-star').target,1500);
assert.equal(thresholds.find(x=>x.id==='legend').target,6000);
assert.equal(thresholds.find(x=>x.id==='sharp-mind').target,50);
assert.equal(thresholds.find(x=>x.id==='super-student').target,150);
assert.equal(thresholds.find(x=>x.id==='weekly-50').target,200);
assert.equal(thresholds.find(x=>x.id==='outlet-drive').target,25);
console.log('Transparent PNG mascot/reward/streak/timer checks passed.');
