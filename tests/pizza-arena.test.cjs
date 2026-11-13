'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const js = fs.readFileSync('js/bt-spark.js','utf8');
const rules = fs.readFileSync('firestore.rules','utf8');
const html = fs.readFileSync('index.html','utf8');
const outletsMatch = js.match(/const OUTLETS=(\[[^\n;]+\]);/);
assert.ok(outletsMatch, 'Outlet definition must exist');
const outlets = vm.runInNewContext(outletsMatch[1]);
assert.equal(outlets.filter(x => x === 'Other').length, 1);
const eligibilityMatch = js.match(/const rankEligible=([^;]+);/);
assert.ok(eligibilityMatch, 'Eligibility predicate must exist');
const eligible = vm.runInNewContext('(p,RESERVED) => {const rankEligible='+eligibilityMatch[1]+'; return rankEligible(p);}', { });
const reserved=new Set(['indika','udaya']);
assert.equal(eligible({username:'indika',outlet:'Galle'},reserved), false);
assert.equal(eligible({username:'UDAYA',outlet:'Galle'},reserved), false);
assert.equal(eligible({username:'anyone',outlet:'Other'},reserved), false);
assert.equal(eligible({username:'anyone',outlet:'Galle',isAdmin:true},reserved), false);
assert.equal(eligible({username:'anyone',outlet:'Galle'},reserved), true);
const start=js.indexOf('function ranked('),end=js.indexOf('\nlet period=',start);
assert.ok(start>=0&&end>start,'Ranking implementation found');
const source=js.slice(start,end);
const wk='2026-11-09';
const map=(name,outlet,score,answers,extra={})=>({
  uid:name,name,outlet,totalPoints:score,weeklyPoints:{[wk]:score},
  outletPoints:{[outlet]:score},outletWeeklyPoints:{[wk+'__'+outlet]:score},
  outletAnswers:{[outlet]:answers},outletWeeklyAnswers:{[wk+'__'+outlet]:answers},
  ...extra,
});
const players=[
 map('Alice','Matara',500,6),
 map('Bob','Matara',100,2),
 map('Cara','Matara',50,1),
 map('Dana','Galle',600,1),
 map('Zed','Other',9000,10),
 map('indika','Galle',9999,10),
 map('UDAYA','Galle',8888,10),
 map('PrivAdmin','Galle',7777,10,{isAdmin:true}),
];
const context={users:players,OUTLETS:outlets,RESERVED:reserved,week:()=>wk};
context.rankEligible=p=>Boolean(p&&p.outlet!=='Other'&&!reserved.has(String(p.username||p.name||'').toLowerCase())&&!p.isAdmin);
vm.createContext(context);
vm.runInContext(source,context);
const individual=context.ranked('weekly',false);
assert.deepEqual(Array.from(individual.map(x=>x.name)),['Dana','Alice','Bob','Cara']);
assert.deepEqual(Array.from(context.ranked('alltime',false).map(x=>x.name)),['Dana','Alice','Bob','Cara']);
const crowns=context.ranked('weekly',true);
assert.ok(!crowns.some(x=>x.name==='Other'),'Other must not be in outlet standings');
assert.equal(crowns.find(x=>x.name==='Galle').people,1,'Excluded admins must not count in outlet averages');
assert.equal(crowns.find(x=>x.name==='Matara').people,3);
assert.equal(crowns.find(x=>x.name==='Matara').score,217);
assert.equal(crowns.find(x=>x.people>=3).name,'Matara','Only eligible outlets qualify for crown');
assert.match(rules,/match \/publicRanks\/\{uid\}/,'Public score collection');
assert.match(rules,/allow read: if mine\(uid\) \|\| admin\(\)/,'Private user score security');
assert.match(rules,/outlet != 'Other'/,'Other excluded by Firestore public score rules');
assert.ok(html.includes('css/pizza-game.css'),'Theme loaded');
assert.ok(js.includes('images/mascot/pizza-champ.svg'),'Mascot referenced');
console.log('Pizza Arena privacy/ranking tests passed (15 key expectations).');
