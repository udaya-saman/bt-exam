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

test('Imported 2025–26 assessments are grouped without duplicates on phones',async({page})=>{
 await page.setViewportSize({width:375,height:820});
 await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{const root=document.getElementById('bt-spark-root');if(root)root.hidden=true;openQuestions();});
 await expect(page.locator('#paper-select .pa-assessment-entry')).toBeVisible();
 await page.locator('#paper-select .pa-assessment-entry').click();
 await expect(page.locator('#assessment-library.active')).toBeVisible();
 await expect(page.locator('.pa-assessment-summary strong')).toHaveText('88 distinct questions');
 await expect(page.locator('.pa-assessment-card')).toHaveCount(15);
 await page.locator('.pa-assessment-search').fill('Cheesy Kottchi Sauce');
 await expect(page.locator('.pa-assessment-card')).toHaveCount(1);
 await expect(page.locator('.pa-assessment-card').first()).toContainText('600 g');
 await page.locator('.pa-assessment-search').fill('RIIT');
 await expect(page.locator('.pa-assessment-card')).toHaveCount(1);
 await expect(page.locator('.pa-assessment-card').first().locator('.pa-assessment-source')).toHaveCount(2);
 await page.locator('.pa-assessment-tab').filter({hasText:'LAS · Jan 2026'}).click();
 await expect(page.locator('.pa-assessment-missing')).toContainText('17–19');
 await page.locator('.pa-assessment-search').fill('PPM strength');
 await expect(page.locator('.pa-assessment-card')).toHaveCount(1);
 const overflow=await page.evaluate(()=>({w:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(overflow.w).toBeLessThanOrEqual(overflow.viewport+2);
});


test('Leaderboard keeps podium and equal-width actions fixed while #4+ rows scroll',async({page})=>{
 await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
 for(const width of [320,375,430,768]){
  await page.setViewportSize({width,height:740});
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  await page.evaluate(()=>{
   const root=document.getElementById('bt-spark-root');
   root.hidden=false;root.className='arena-board-mode arena-leaderboard-layout';
   root.innerHTML='<div class="panel"><h2>🏆 LEADERBOARD</h2><div id="bt-spark-content"><div class="pg-nav"><button>THIS WEEK</button><button>ALL TIME</button><button>OUTLETS</button></div><div class="pg-podium">'+[1,2,3].map(i=>'<div class="pg-podium-item arena-player-podium arena-rank-'+i+'">'+(i===1?'<span class="arena-first-rank">1</span>':'')+'<div>🏅</div><strong>Player '+i+'</strong><small>100 PTS</small></div>').join('')+'</div><div class="pg-section">PLAYER STANDINGS</div><div class="pg-standings-scroll">'+Array.from({length:30},(_,i)=>'<div class="pg-leader-card arena-player-standing"><span class="pg-place">'+(i+4)+'</span><img class="pg-avatar" src="./images/default-avatar.png"><div class="pg-person"><strong>Player '+(i+4)+'</strong><small>Matara</small></div><span class="pg-score">20 PTS</span></div>').join('')+'</div><div class="pg-board-footer"><button class="pg-btn-green">👤 MY PROFILE</button><button class="pg-btn-red">CLOSE</button></div></div></div>';
  });
  await expect(page.locator('.pg-standings-scroll .pg-leader-card')).toHaveCount(30);
  const before=await page.evaluate(()=>{
   const panel=document.querySelector('#bt-spark-root .panel');
   const footer=document.querySelector('.pg-board-footer');
   const rows=document.querySelector('.pg-standings-scroll');
   const podium=document.querySelector('.pg-podium');
   const rect=x=>x.getBoundingClientRect().toJSON();
   return {footer:rect(footer),podium:rect(podium),rows:rect(rows),
    panelOverflow:getComputedStyle(panel).overflowY,
    scrollOverflow:getComputedStyle(rows).overflowY,
    maxScroll:rows.scrollHeight-rows.clientHeight,
    panelClient:panel.clientWidth,panelScroll:panel.scrollWidth,
    buttons:[...footer.querySelectorAll('button')].map(rect),scrollbarWidth:getComputedStyle(rows).scrollbarWidth,webkitScrollbar:getComputedStyle(rows,'::-webkit-scrollbar').display,firstAnimation:getComputedStyle(document.querySelector('.pg-podium-item.arena-rank-1')).animationName};
  });
  expect(before.panelOverflow).toBe('hidden');
  expect(before.scrollOverflow).toBe('auto');
  expect(before.maxScroll).toBeGreaterThan(0);
  expect(before.scrollbarWidth).toBe('none');
  expect(before.webkitScrollbar).toBe('none');
  expect(before.firstAnimation).toContain('arenaFirstGlow');
  await expect(page.locator('.pg-standings-scroll .pg-place').first()).toHaveText('4');
  expect(before.panelScroll).toBeLessThanOrEqual(before.panelClient+2);
  expect(before.footer.bottom).toBeLessThanOrEqual(740);
  expect(before.buttons).toHaveLength(2);
  for(const button of before.buttons){
   expect(button.width).toBeGreaterThanOrEqual(before.footer.width*.45);
   expect(button.width).toBeLessThanOrEqual(before.footer.width*.50);
  }
  await page.locator('.pg-standings-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const after=await page.evaluate(()=>({
   scrollTop:document.querySelector('.pg-standings-scroll').scrollTop,
   footerTop:document.querySelector('.pg-board-footer').getBoundingClientRect().top,
   podiumTop:document.querySelector('.pg-podium').getBoundingClientRect().top
  }));
  expect(after.scrollTop).toBeGreaterThan(0);
  expect(Math.abs(after.footerTop-before.footer.top)).toBeLessThan(1);
  expect(Math.abs(after.podiumTop-before.podium.top)).toBeLessThan(1);
 }
});

test('Player details have right-aligned return and invisible functional scrollbars',async({page})=>{
 await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
 for(const width of [320,375,430,768]){
  await page.setViewportSize({width,height:680});
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  await page.evaluate(()=>{
   const root=document.getElementById('bt-spark-root');
   root.hidden=false;root.className='arena-board-mode arena-player-details-mode';
   root.innerHTML='<div class="panel"><h2>PLAYER DETAILS</h2><div id="bt-spark-content"><div class="arena-player-detail"><div class="arena-detail-ribbon">✦ PIZZA ARENA PLAYER</div><img src="./images/default-avatar.png" alt=""><h3>Sample Player</h3><p>Matara</p><div class="arena-detail-stats">'+['Level','Points','Current weekly rank','Best all-time rank observed'].map((label,i)=>'<div><strong>'+[7,'1,200',4,2][i]+'</strong><small>'+label+'</small></div>').join('')+'</div></div><div class="arena-detail-actions"><button class="arena-detail-back">Back to leaderboard</button></div></div></div>';
  });
  const geometry=await page.evaluate(()=>{
   const panel=document.querySelector('#bt-spark-root .panel'),button=document.querySelector('.arena-detail-back'),actions=document.querySelector('.arena-detail-actions');
   return {rightGap:actions.getBoundingClientRect().right-button.getBoundingClientRect().right,
    panelRight:panel.getBoundingClientRect().right,scrollbarWidth:getComputedStyle(panel).scrollbarWidth,
    scrollbarDisplay:getComputedStyle(panel,'::-webkit-scrollbar').display};
  });
  expect(geometry.rightGap).toBeLessThanOrEqual(2);
  expect(geometry.scrollbarWidth).toBe('none');
  expect(geometry.scrollbarDisplay).toBe('none');
  expect(geometry.panelRight).toBeLessThanOrEqual(width);
  await page.evaluate(()=>{const p=document.querySelector('#bt-spark-root .panel');p.style.maxHeight='300px';p.style.height='300px';});
  const scrolled=await page.evaluate(()=>{
   const p=document.querySelector('#bt-spark-root .panel');p.scrollTop=160;
   return {scrollTop:p.scrollTop,range:p.scrollHeight-p.clientHeight};
  });
  expect(scrolled.range).toBeGreaterThan(0);
  expect(scrolled.scrollTop).toBeGreaterThan(0);
 }
});
