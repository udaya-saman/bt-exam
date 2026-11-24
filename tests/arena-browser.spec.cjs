const {test,expect}=require('@playwright/test');
const widths=[320,375,430,768,1280];
async function dimensions(page,selector){
 return page.locator(selector).evaluateAll(elements=>elements.map(el=>{
  const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};
 }));
}
function noOverlap(rects,width,label){
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
  const a=rects[i],b=rects[j];
  const x=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
  const y=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
  expect(x>2&&y>2,label+' '+(i+1)+' / '+(j+1)+' overlap at '+width+'px').toBeFalsy();
 }
}
for(const width of widths){
 test('Home and question selection fit '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  // Firebase is intentionally blocked in these isolated visual tests. Dismiss its setup overlay.
  await page.locator('#bt-spark-root').waitFor({state:'visible',timeout:3500}).catch(()=>{});
  await page.evaluate(()=>{const overlay=document.getElementById('bt-spark-root');if(overlay)overlay.hidden=true;});
  await expect(page.locator('.arena-hero h1')).toBeVisible();
  const heroControls=page.locator('#home .arena-header-actions > button.arena-header-icon');
  await expect(heroControls).toHaveCount(2);
  await expect(heroControls.nth(0)).toHaveAttribute('aria-label','Notifications');
  await expect(heroControls.nth(1)).toHaveAttribute('aria-label','My Player Card');
  for(const control of await heroControls.all()){
    const d=await control.evaluate(el=>({w:el.offsetWidth,h:el.offsetHeight,r:getComputedStyle(el).borderTopLeftRadius}));
    expect(d.w).toBe(d.h);expect(d.r).toBe('50%');
    await expect.poll(()=>control.locator('img').evaluate(el=>el.complete&&el.naturalWidth===96)).toBe(true);
  }
  noOverlap(await dimensions(page,'#home .arena-header-icon'),width,'Hero controls');

  const heroBefore=await page.locator('.arena-hero').evaluate(el=>el.getBoundingClientRect().height);
  await page.evaluate(()=>{document.getElementById('resume-banner').style.display='flex';});
  const heroAfter=await page.locator('.arena-hero').evaluate(el=>el.getBoundingClientRect().height);
  expect(Math.abs(heroBefore-heroAfter)).toBeLessThan(1);

  const modes=await dimensions(page,'#home .arena-path-card');
  expect(modes).toHaveLength(2);
  noOverlap(modes,width,'Home mode cards');
  const source=await page.locator('.arena-hero-mascot img').evaluate(node=>({
   png:node.getAttribute('src')?.endsWith('.png'),width:node.naturalWidth,height:node.naturalHeight
  }));
  expect(source.png).toBe(true);
  expect(source.width).toBeGreaterThanOrEqual(200);
  await page.screenshot({path:'tests/screenshot-home-'+width+'.png',fullPage:true});
  await page.evaluate(()=>openQuestions());
  await expect(page.locator('#paper-select.active .paper-card')).toHaveCount(5);
  const papers=await dimensions(page,'#paper-select .paper-card');
  noOverlap(papers,width,'Question paper cards');
  const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(overflow.document).toBeLessThanOrEqual(width+2);
  await page.screenshot({path:'tests/screenshot-papers-'+width+'.png',fullPage:true});
 });
}
test('Study Academy loads 57 PDF-based lessons and saves progress',async({page})=>{
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#bt-spark-root').waitFor({state:'visible',timeout:3500}).catch(()=>{});
 await page.evaluate(()=>{const overlay=document.getElementById('bt-spark-root');if(overlay)overlay.hidden=true;openStudy();});
 await expect(page.locator('#study-select.active .pa-study-card')).toHaveCount(57,{timeout:12000});
 await expect(page.locator('.pa-study-hero h1')).toContainText('Learn. Remember. Grow.');
 await page.locator('.pa-study-card').first().click();
 await expect(page.locator('.pa-study-lesson-hero h1')).toContainText('Pizza Hut');
 await expect(page.locator('.pa-study-source')).toHaveCount(0);
 await expect(page.locator('.pa-study-memory')).not.toHaveCount(0);
 await expect(page.locator('.pa-study-illustration').first()).toBeVisible();
 await expect.poll(()=>page.locator('.pa-study-illustration').first().evaluate(el=>el.complete&&el.naturalWidth===256)).toBe(true);
 await page.getByRole('button',{name:'Quick revision'}).click();
 await expect(page.locator('.pa-revision-card')).toBeVisible();
 await page.getByRole('button',{name:'Reveal learning point'}).click();
 await expect(page.locator('.pa-revision-card p').last()).toBeVisible();
 await page.getByRole('button',{name:'← Lesson'}).click();
 await expect(page.locator('.pa-study-lesson-hero')).toBeVisible();
 await expect(page.locator('.pa-study-bullets li').first()).toBeVisible();
 await page.locator('.pa-study-mark').click();
 await expect(page.locator('.pa-study-mark')).toContainText('Lesson completed');
 await page.screenshot({path:'tests/screenshot-study.png',fullPage:true});
 await page.locator('.pa-study-back').click();
 await expect(page.locator('.pa-study-progress')).toContainText('1 of 57');
 await page.locator('.pa-study-search').fill('temperature');
 await expect(page.locator('.pa-study-card').first()).toBeVisible();
 await page.locator('.pa-study-search').fill('Making a Pizza: Five Stages');
 await page.getByRole('button',{name:/Making a Pizza: Five Stages/}).click();
 const concepts=await page.locator('.pa-study-illustration').evaluateAll(nodes=>nodes.map(n=>n.dataset.concept));
 expect(concepts).toEqual(['sauce','cheese','toppings','oven','pizza']);
 await expect.poll(()=>page.locator('.pa-study-illustration').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth===256&&n.src.startsWith('data:image/png')))).toBe(true);
});
test('Player Card and rewards fit narrow phones',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#bt-spark-root').waitFor({state:'visible',timeout:3500}).catch(()=>{});
 await page.waitForTimeout(250); // allow the account overlay's initial render to finish before the fixture
 await page.evaluate(()=>{
  let root=document.querySelector('#bt-spark-root');
  if(!root){root=document.createElement('div');root.id='bt-spark-root';document.body.append(root);}
  root.hidden=false;root.className='arena-profile-mode';
  root.innerHTML='<div class="panel"><div class="arena-page-top">PIZZA ARENA · MY PLAYER CARD</div><div id="bt-spark-content"><section class="arena-card"><div class="arena-card-heading">MY PLAYER CARD</div><div class="arena-card-body"><div class="arena-profile-top"><img class="arena-avatar" src="./images/default-avatar.png"><div class="arena-person-info"><h3>Udaya</h3><span class="arena-outlet-pill">Other</span></div><div class="arena-level-wrap"><span class="arena-level-badge">Lv. 5</span><div class="arena-level-track"><span class="arena-level-fill" style="width:90%"></span></div><small>2,450 / 2,500 pts</small></div></div><div class="arena-stats-grid"><div class="arena-stat">2,450 Points</div><div class="arena-stat">87 Correct</div><div class="arena-stat">120 Answered</div></div><div class="arena-actions"><button class="pg-btn-green">Leaderboard</button><button class="pg-btn-red">Sign Out</button><button class="pg-btn-red">Close</button></div><button class="arena-outlet-row">Change your outlet?</button></div></section><div class="arena-sync-area"><div class="arena-status-card">Answers waiting · 2 saved</div><button class="arena-sync-action">Sync</button></div><section class="arena-achievements-card"><div class="arena-achievements-heading">Achievements</div><div class="arena-rewards-grid">'+Array.from({length:6},(_,i)=>'<div class="arena-reward-item">Badge '+(i+1)+'</div>').join('')+'</div></section></div></div>';
 });
 const overflow=await page.evaluate(()=>({root:document.querySelector('#bt-spark-root').scrollWidth,viewport:innerWidth,body:document.body.scrollWidth}));
 expect(overflow.root).toBeLessThanOrEqual(377);
 expect(await page.locator('.arena-reward-item').count()).toBe(6);
 await page.screenshot({path:'tests/screenshot-player-card.png',fullPage:true});
});
