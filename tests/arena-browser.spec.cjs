const { test, expect } = require('@playwright/test');
const widths=[320,375,430,768,1280];
for(const width of widths){
 test('Home challenge cards do not overlap at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.arena-hero h1')).toBeVisible();
  const cards=await page.locator('#home .paper-card').evaluateAll(elements=>
    elements.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
  expect(cards).toHaveLength(5);
  for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
   const a=cards[i],b=cards[j];
   const x=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
   const y=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
   expect(x>2&&y>2,'Challenge cards '+(i+1)+' and '+(j+1)+' overlap at '+width+'px').toBeFalsy();
  }
  const dimensions=await page.evaluate(()=>({
   screen:document.documentElement.scrollWidth,
   body:document.body.scrollWidth,
   inner:window.innerWidth,
   home:document.getElementById('home').scrollWidth
  }));
  expect(dimensions.screen).toBeLessThanOrEqual(width+2);
  expect(dimensions.home).toBeLessThanOrEqual(width+2);
  const source=await page.locator('.arena-hero-mascot img').evaluate(node=>({
   png:node.getAttribute('src')?.endsWith('.png'),width:node.naturalWidth,height:node.naturalHeight
  }));
  expect(source.png).toBe(true);
  expect(source.width).toBeGreaterThanOrEqual(500);
  await page.screenshot({path:'tests/screenshot-home-'+width+'.png',fullPage:true});
 });
}
test('Player Card and rewards fit narrow phones',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  let root=document.querySelector('#bt-spark-root');
  if(!root){root=document.createElement('div');root.id='bt-spark-root';document.body.append(root);}
  root.hidden=false;root.className='arena-profile-mode';
  root.innerHTML='<div class="panel"><div class="arena-page-top">PIZZA ARENA · MY PLAYER CARD</div><div id="bt-spark-content"><div class="arena-status-card">Answers waiting · 2 saved</div><section class="arena-card"><div class="arena-card-heading">MY PLAYER CARD</div><div class="arena-card-body"><div class="arena-profile-top"><img class="arena-avatar" src="./images/default-avatar.png"><div class="arena-person-info"><h3>Udaya</h3><span class="arena-outlet-pill">Other</span></div><div class="arena-level-wrap"><span class="arena-level-badge">Lv. 5</span><div class="arena-level-track"><span class="arena-level-fill" style="width:90%"></span></div><small>2,450 / 2,500 pts</small></div></div><div class="arena-stats-grid"><div class="arena-stat">2,450 Points</div><div class="arena-stat">87 Correct</div><div class="arena-stat">120 Answered</div></div><div class="arena-actions"><button class="pg-btn-green">Leaderboard</button><button class="pg-btn-green">Sync</button><button class="pg-btn-red">Sign Out</button><button class="pg-btn-red">Close</button></div></div></section><section class="arena-achievements-card"><div class="arena-achievements-heading">Achievements</div><div class="arena-rewards-grid">'+Array.from({length:6},(_,i)=>'<div class="arena-reward-item">Badge '+(i+1)+'</div>').join('')+'</div></section></div></div>';
 });
 const overflow=await page.evaluate(()=>({root:document.querySelector('#bt-spark-root').scrollWidth,viewport:window.innerWidth,body:document.body.scrollWidth}));
 expect(overflow.root).toBeLessThanOrEqual(375+2);
 const elements=await page.locator('.arena-reward-item').count();expect(elements).toBe(6);
 await page.screenshot({path:'tests/screenshot-player-card.png',fullPage:true});
});
