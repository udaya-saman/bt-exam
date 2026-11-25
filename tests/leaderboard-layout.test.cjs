'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('js/bt-spark.js','utf8');
const css=fs.readFileSync('css/arena-polish-v43.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const start=app.indexOf('function board(keepScroll=false){');
const end=app.indexOf('\nfunction attachPlayerDetails',start);
assert.ok(start>=0&&end>start,'leaderboard renderer exists');
const src=app.slice(start,end);
assert.doesNotMatch(src,/Pizza Hut competition|className='pg-hero'/,'intro and hero banner gone');
assert.match(src,/panel>p'\)\?\.remove\(\)/,'subtitle removed');
assert.match(src,/remaining=records\.filter\(r=>!winners\.includes\(r\)\)/,'top 3 not repeated');
assert.match(src,/place\.textContent=String\(places\.get\(r\)\)/);
assert.match(css,/\.pg-standings-scroll\{[^}]*overflow-y:auto/);
assert.match(css,/\.pg-board-footer\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css,/\.panel\{[^}]*overflow:hidden!important/);
assert.ok(html.includes('arena-polish-v43.css?v=4.7.5'));
assert.ok(sw.includes('arena-polish-v43.css?v=4.7.5'));
assert.ok(app.includes('if(boardOpen&&!root.hidden)board(true);'));
function el(tag='div'){
 const classes=new Set();
 return {tag,children:[],className:'',style:{},classList:{add:(...n)=>n.forEach(x=>classes.add(x)),remove:(...n)=>n.forEach(x=>classes.delete(x)),contains:n=>classes.has(n)},
  append(...n){this.children.push(...n)},setAttribute(k,v){this[k]=v},scrollTop:0};
}
const root=el();root.hidden=false;
let box,profileOpened=0,closed=0;
const records=Array.from({length:25},(_,i)=>({name:'Player '+(i+1),outlet:'Matara',uid:'u'+(i+1),score:500-i,lifetimePoints:500-i,rank:i+1,people:3}));
const ctx={root,document:{createElement:el,createTextNode:x=>x},window:{},period:'weekly',outletView:false,
 showAllPlayers:false,profile:{outlet:'Matara'},user:{uid:'u25'},admins:false,boardOpen:false,unsubscribe:()=>{},
 ranked:()=>records,rankEligible:()=>false,listen:()=>{},attachPlayerDetails:()=>{},day:()=>'',week:()=>'',close:()=>closed++,
 show:()=>profileOpened++,open:()=>{box=el();return box},
 btn:(title,action)=>{const b=el('button');b.textContent=title;b.click=action;return b;}};
root.querySelector=s=>s==='.panel>p'?{remove(){}}:s==='.pg-standings-scroll'?box?.children.find(x=>x.className==='pg-standings-scroll'):null;
vm.createContext(ctx);vm.runInContext(src+'\nboard();',ctx);
const find=n=>box.children.find(x=>x.className===n);
const rows=()=>find('pg-standings-scroll').children.filter(x=>x.className.startsWith('pg-leader-card'));
assert.equal(find('pg-podium').children.length,3);
assert.equal(rows().length,18);
assert.deepEqual(Array.from(rows().slice(0,3),x=>x.children[0].textContent),['4','5','6']);
assert.equal(rows().at(-1).children[0].textContent,'25');
assert.ok(!rows().some(x=>['1','2','3'].includes(x.children[0].textContent)));
assert.deepEqual(Array.from(find('pg-board-footer').children,x=>x.textContent),['👤 MY PROFILE','CLOSE']);
find('pg-board-footer').children[0].click();find('pg-board-footer').children[1].click();
assert.equal(profileOpened,1);assert.equal(closed,1);
find('pg-standings-scroll').scrollTop=123;
vm.runInContext('board(true);',ctx);
assert.equal(find('pg-standings-scroll').scrollTop,123);
find('pg-standings-scroll').children.find(x=>x.tag==='button').click();
assert.equal(rows().length,22);
assert.equal(rows()[0].children[0].textContent,'4');
assert.equal(rows().at(-1).children[0].textContent,'25');
vm.runInContext('outletView=true;board();',ctx);
assert.equal(rows()[0].children[0].textContent,'4');
assert.equal(find('pg-board-footer').children.length,2);
const nav=fs.readFileSync('js/arena-navigation-ranks.js','utf8');
assert.ok(css.includes('scrollbar-width:none!important'),'scrollbar chrome concealed');
assert.ok(css.includes('*::-webkit-scrollbar{'),'WebKit scrollbar concealed');
assert.match(css,/arenaFirstGlow/,'first-place glow');
assert.match(css,/arenaFirstSweep/,'first-place shimmer');
assert.match(css,/prefers-reduced-motion:reduce/,'animation accessible');
assert.match(src,/first.className='arena-first-rank'/,'first-place numeric badge');
assert.ok(!nav.includes("#'+"),'celebration rank labels contain no number sign');
assert.ok(!app.includes("'#'+"),'displayed ranks contain no number sign');
const detailStart=app.indexOf('function playerDetails(uid){'),detailEnd=app.indexOf('function showRankMascot',detailStart);
assert.ok(detailStart>=0&&detailEnd>detailStart);
const detailSrc=app.slice(detailStart,detailEnd);
assert.match(detailSrc,/className='arena-detail-actions'/);
let detailsBox,returned=0;
const detailsCtx={root,document:{createElement:el},window:{BTRewards:{level:()=>({number:7})},ArenaNav:{back:()=>returned++}},period:'weekly',
 ranked:()=>records,readBest:()=>2,loadBest:()=>Promise.resolve(),
 btn:(title,action)=>{const b=el('button');b.textContent=title;b.click=action;return b;},
 open:()=>{detailsBox=el();return detailsBox;}};
vm.createContext(detailsCtx);vm.runInContext(detailSrc+'\nplayerDetails("u4");',detailsCtx);
const detail=detailsBox.children[0],stats=detail.children.at(-1),actions=detailsBox.children[1];
assert.equal(detail.className,'arena-player-detail');
assert.equal(actions.className,'arena-detail-actions');
assert.equal(stats.children[2].children[0].textContent,'4');
assert.equal(stats.children[3].children[0].textContent,'2');
actions.children[0].click();assert.equal(returned,1);
assert.match(css,/justify-content:flex-end/);

assert.ok(css.includes('arenaFirstGlow 1.9s ease-in-out'),'first-place glow is exactly 1.9s');
assert.ok(css.includes('arenaFirstSweep 2.7s ease-in-out'),'first-place sweep is exactly 2.7s');
assert.ok(css.includes('.pg-podium>.pg-podium-item strong{'),'podium name rule exists');
assert.ok(css.includes('white-space:normal!important;overflow:visible!important'),'podium names wrap rather than clip');
assert.ok(css.includes('minmax(0,1fr) minmax(0,1.09fr) minmax(0,1fr)'),'first-place card is slightly wider');
assert.ok(css.includes('#d41420'),'Player Card uses Pizza Hut red');
assert.doesNotMatch(css.split('4.7.4 — Pizza Hut red')[1],/#761d30|#81283b|#632030/,'no maroon in new Player Card override');
assert.ok(app.includes("manageButton.classList.add('arena-manage-action')"),'Manage gets its own class');
assert.ok(app.includes('if(admins){const manageButton='),'Manage remains admin-only');
assert.ok(css.includes('button.arena-manage-action{'),'gold Manage style exists');
assert.ok(css.includes('#efbd54'),'Manage has gold gradient');
console.log('Podium name wrapping, quicker animation, Pizza Hut red, admin-only gold Manage and prior leaderboard behavior validated.');
