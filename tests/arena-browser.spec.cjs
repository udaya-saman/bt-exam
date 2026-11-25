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
  await expect(page.locator('#paper-select.active')).toBeVisible();
 await expect(page.locator('#bt-spark-dock')).toBeHidden();
  await expect(page.locator('#paper-select #questions-title')).toContainText('Your next challenge');
  await expect(page.locator('#paper-select .questions-quick-stats')).toContainText('214');
  await expect(page.locator('#paper-select .pa-assessment-entry')).toHaveCount(0);
  await expect(page.locator('#paper-select .questions-assessment-paper')).toHaveCount(1);
  await expect(page.locator('#paper-select.active .paper-card')).toHaveCount(6);
  await expect(page.locator('#paper-select .questions-paper')).toHaveCount(6);
  const ids=await page.locator('#paper-select .questions-paper').evaluateAll(cards=>cards.map(card=>card.dataset.paper));
  expect(ids).toEqual(['past2024','questions','paper1','paper2','paper3','assessment-practice']);
  const questions=await page.locator('#paper-select .questions-paper-count').allTextContents();
  expect(questions).toEqual(['29 QUESTIONS','40 QUESTIONS','50 QUESTIONS','50 QUESTIONS','45 QUESTIONS','86 UNIQUE QUESTIONS']);
  await expect.poll(()=>page.locator('#paper-select .questions-paper-icon img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
  await expect.poll(()=>page.locator('#paper-select .questions-intro-art').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  const columns=await page.locator('#all-question-papers').evaluate(grid=>getComputedStyle(grid).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(width<=680?1:2);
  const papers=await dimensions(page,'#paper-select .paper-card');
  noOverlap(papers,width,'Question paper cards');
  const overflow=await page.evaluate(()=>({
   document:document.documentElement.scrollWidth,viewport:innerWidth,
   selector:document.getElementById('paper-select').scrollWidth
  }));
  expect(overflow.document).toBeLessThanOrEqual(width+2);
  expect(overflow.selector).toBeLessThanOrEqual(width+2);
  await page.screenshot({path:'tests/screenshot-papers-'+width+'.png',fullPage:true});
  // Original quiz behavior remains accessible from the redesigned native buttons.
  const model=page.locator('#paper-select button[data-paper="paper1"]');
  await expect(model).toHaveAttribute('aria-label','Start Model Paper 1, 50 questions');
  await model.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#quiz.active')).toBeVisible();
  await expect(page.locator('#quiz-paper-label')).toContainText('Intermediate');
  await expect(page.locator('#quiz-q-info')).toHaveText('Question 1 of 50');
  await expect(page.locator('#quiz .opt-btn')).toHaveCount(4);
  await expect(page.locator('#quiz .questions-question-panel, #quiz .questions-answers-head, #quiz .questions-timer-hint')).toHaveCount(0);
  await expect(page.locator('#quiz .quiz-body > #q-text')).toBeVisible();
  await expect(page.locator('#quiz .quiz-body > .timer-row')).toBeVisible();
  await expect(page.locator('#quiz .quiz-body > #opts')).toBeVisible();
  const quizBounds=await page.locator('#quiz .quiz-body > #q-text').evaluate(el=>({
   left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right
  }));
  expect(quizBounds.left).toBeGreaterThanOrEqual(-1);
  expect(quizBounds.right).toBeLessThanOrEqual(width+1);
  noOverlap(await dimensions(page,'#quiz .opt-btn'),width,'Quiz answer choices');
  await page.locator('#quiz .opt-btn').first().click();
  await expect(page.locator('#quiz .opt-btn.correct')).toHaveCount(1);
  await expect(page.locator('#quiz #next-btn.show')).toBeVisible();
  await page.screenshot({path:'tests/screenshot-quiz-'+width+'.png',fullPage:true});
 });
}
test('Buttons visibly press and rebound on touch, keyboard and generated Study controls',async({page})=>{
 await page.setViewportSize({width:375,height:820});
 await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#bt-spark-root').waitFor({state:'visible',timeout:3500}).catch(()=>{});
 await page.evaluate(()=>{const root=document.getElementById('bt-spark-root');if(root)root.hidden=true;});
 const control=page.locator('#sound-toggle');
 await expect(control).toBeVisible();
 await control.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true})));
 await expect(control).toHaveClass(/arena-pressing/);
 const during=await control.evaluate(el=>({transform:getComputedStyle(el).transform,filter:getComputedStyle(el).filter}));
 expect(during.transform).not.toBe('none');
 expect(during.filter).toContain('brightness');
 await control.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,isPrimary:true})));
 await expect(control).toHaveClass(/arena-pressed/);
 await expect.poll(()=>control.evaluate(el=>el.classList.contains('arena-pressed'))).toBe(false);
 await control.focus();
 await page.keyboard.down('Space');
 await expect(control).toHaveClass(/arena-pressing/);
 await page.keyboard.up('Space');
 await expect(control).toHaveClass(/arena-pressed/);
 await expect.poll(()=>control.evaluate(el=>el.classList.contains('arena-pressed'))).toBe(false);
 await page.evaluate(()=>openStudy());
 await expect(page.locator('#bt-spark-dock')).toBeHidden();
 const studyButton=page.locator('.pa-study-filter').first();
 await expect(studyButton).toBeVisible();
 await studyButton.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true})));
 await expect(studyButton).toHaveClass(/arena-pressing/);
 await studyButton.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,isPrimary:true})));
 await expect(studyButton).toHaveClass(/arena-pressed/);
});
test('Study Academy loads 57 PDF-based lessons and saves progress',async({page})=>{
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#bt-spark-root').waitFor({state:'visible',timeout:3500}).catch(()=>{});
 await page.evaluate(()=>{const overlay=document.getElementById('bt-spark-root');if(overlay)overlay.hidden=true;openStudy();});
 await expect(page.locator('#study-select.active .pa-study-card')).toHaveCount(57,{timeout:12000});
 await expect(page.locator('#bt-spark-dock')).toBeHidden();
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
  root.innerHTML='<div class="panel"><div id="bt-spark-content"><section class="arena-card"><div class="arena-card-heading">MY PLAYER CARD</div><div class="arena-card-body"><div class="arena-profile-top"><img class="arena-avatar" src="./images/default-avatar.png"><div class="arena-person-info"><h3>Udaya</h3><span class="arena-outlet-pill">Other</span></div><div class="arena-level-wrap"><span class="arena-level-badge">Lv. 5</span><div class="arena-level-track" role="progressbar" aria-label="Progress to level 6" aria-valuemin="0" aria-valuemax="500" aria-valuenow="450"><span class="arena-level-fill" style="width:90%"></span></div><small>450 / 500 pts</small></div></div><div class="arena-stats-grid"><div class="arena-stat">2,450 Points</div><div class="arena-stat arena-stat-correct"><img class="arena-stat-art" src="./images/arena/stat-correct.png" alt=""><div><strong>87</strong><span>Correct</span></div></div><div class="arena-stat"><strong>72.5%</strong><span>Accuracy</span></div></div><div class="arena-actions"><button class="pg-btn-green">Leaderboard</button><button class="pg-btn-orange arena-signout-action">Sign Out</button><button class="pg-btn-red">Close</button></div><button class="arena-outlet-row">Change your outlet?</button></div></section><div class="arena-sync-area"><div class="arena-status-card">Answers waiting · 2 saved</div><button class="arena-sync-action">Sync</button></div><section class="arena-achievements-card"><div class="arena-achievements-heading">Achievements</div><div class="arena-rewards-grid">'+Array.from({length:6},(_,i)=>'<div class="arena-reward-item">Badge '+(i+1)+'</div>').join('')+'</div></section></div></div>';
 });
 const styles=await page.evaluate(()=>{
  const root=document.getElementById('bt-spark-root');
  const signout=root.querySelector('.arena-signout-action');
  const correct=root.querySelector('.arena-stat-correct .arena-stat-art');
  return {topBar:root.querySelectorAll('.arena-page-top').length,
   orangeBackground:getComputedStyle(signout).backgroundImage,
   correctFilter:getComputedStyle(correct).filter,
   cardBorder:getComputedStyle(root.querySelector('.arena-card')).borderColor};
 });
 expect(styles.topBar).toBe(0);
 expect(styles.orangeBackground).toContain('rgb(246, 164, 74)');
 expect(styles.correctFilter).not.toBe('none');
 await expect(page.locator('#bt-spark-root .arena-level-wrap small')).toHaveText('450 / 500 pts');
 await expect(page.locator('#bt-spark-root .arena-level-track')).toHaveAttribute('aria-valuemax','500');
 await expect(page.locator('#bt-spark-root .arena-level-track')).toHaveAttribute('aria-valuenow','450');
 const badgeHeight=await page.locator('#bt-spark-root .arena-level-badge').evaluate(el=>el.getBoundingClientRect().height);
 expect(badgeHeight).toBeGreaterThanOrEqual(18);expect(badgeHeight).toBeLessThanOrEqual(21);
 await expect(page.locator('#bt-spark-root .arena-stats-grid')).toContainText('72.5%');

 const palette=await page.evaluate(()=>{
  const root=document.getElementById('bt-spark-root'),sample=document.createElement('div');
  sample.id='bt-spark-root';sample.className='arena-board-mode';
  sample.style.cssText='visibility:hidden;pointer-events:none';
  sample.innerHTML='<div class="panel"><div class="pg-leader-card">Player</div><div class="pg-leader-card pg-you">You</div></div>';
  document.body.append(sample);
  const bg=el=>getComputedStyle(el).backgroundImage;
  const panel=bg(sample.querySelector('.panel')),row=bg(sample.querySelector('.pg-leader-card'));
  const sections=['.arena-card-heading','.arena-achievements-heading','.arena-level-wrap','.arena-stat','.arena-outlet-row','.arena-reward-item','.arena-status-card'];
  const result={panelMatch:bg(root.querySelector('.panel'))===panel,cardsMatch:['.arena-card','.arena-achievements-card','.arena-sync-area'].every(x=>bg(root.querySelector(x))===panel),sectionsMatch:sections.every(x=>bg(root.querySelector(x))===row),levelFill:bg(root.querySelector('.arena-level-fill'))};
  sample.remove();return result;
 });
 expect(palette.panelMatch).toBe(true);expect(palette.cardsMatch).toBe(true);expect(palette.sectionsMatch).toBe(true);
 expect(palette.levelFill).toContain('rgb(47, 219, 83)');
 expect(await page.locator('.arena-reward-item').count()).toBe(6);
 for(const width of [320,375,430,768]){
  await page.setViewportSize({width,height:812});
  const overflow=await page.evaluate(()=>({root:document.querySelector('#bt-spark-root').scrollWidth,viewport:innerWidth,body:document.body.scrollWidth}));
  expect(overflow.root).toBeLessThanOrEqual(width+2);
  expect(overflow.body).toBeLessThanOrEqual(width+2);
 }
 await page.setViewportSize({width:375,height:812});
 await page.evaluate(()=>{
  const actions=document.createElement('div');actions.className='arena-actions';
  actions.innerHTML='<button class="pg-btn-green">Account</button><button class="arena-manage-action">Manage</button>';
  document.getElementById('bt-spark-content').append(actions);
 });
 const adminButtons=await page.evaluate(()=>{
  const actions=document.querySelector('#bt-spark-content>.arena-actions');
  return {manage:getComputedStyle(actions.querySelector('.arena-manage-action')).backgroundImage,
    account:getComputedStyle(actions.querySelector('.pg-btn-green')).backgroundImage};
 });
 expect(adminButtons.manage).toContain('rgb(255, 226, 154)');
 expect(adminButtons.account).not.toBe(adminButtons.manage);
 await page.screenshot({path:'tests/screenshot-player-card.png',fullPage:true});
});

for(const width of [320,375,430,768]){
 test('Assessment workbook bilingual practice at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{const root=document.getElementById('bt-spark-root');if(root)root.hidden=true;openQuestions();});
  await page.locator('#paper-select .questions-assessment-paper').click();
  const practice=page.locator('#assessment-practice');
  await expect(practice).toHaveClass(/active/);
  await expect(page.locator('#bt-spark-dock')).toBeHidden();
  await expect(practice.locator('#aq-quiz-q-info')).toHaveText('Question 1 of 86',{timeout:12000});
  await expect(practice.locator('#aq-timer-val')).toHaveText(/^0:5[0-9]$|^1:00$/);
  const first=await page.evaluate(()=>BTAssessmentPractice.getQuestions()[0]);
  await expect(practice.locator('#aq-q-text')).toHaveText(first.q);
  await practice.locator('#aq-translate-btn').click();
  await expect(practice.locator('#aq-q-text')).toHaveText(first.siQ);
  await expect(practice.locator('.opt-text').first()).toHaveText(first.siOpts[0]);
  await practice.locator('#aq-translate-btn').click();
  await expect(practice.locator('#aq-q-text')).toHaveText(first.q);
  await expect(practice.locator('.opt-btn')).toHaveCount(first.opts.length);
  // Compare shared visual properties, including type and dimensions, against an original quiz.
  const visual=await page.evaluate(()=>{
   const s=document.querySelector('#assessment-practice');
   const q=document.querySelector('#quiz');
   const classes=['quiz-bar','quiz-body','q-text','timer-val','translate-btn','score-pill','prog-bar','bottom-bar','home-btn','reset-btn','next-btn'];
   return classes.every(c=>['fontSize','fontFamily','fontWeight','color','backgroundColor','borderRadius','padding'].every(p=>getComputedStyle(s.querySelector('.'+c))[p]===getComputedStyle(q.querySelector('.'+c))[p]));
  });
  expect(visual).toBe(true);
  await practice.locator('.opt-btn').nth(first.answer.correct[0]-1).click();
  if(first.answer.correct.length>1){
   for(const n of first.answer.correct.slice(1))await practice.locator('.opt-btn').nth(n-1).click();
   await practice.locator('.aq-action').click();
  }
  await expect(practice.locator('.opt-btn.correct')).toHaveCount(first.answer.correct.length);
  await expect(practice.locator('#aq-score-display')).toHaveText('100%');
  await expect(practice.locator('#aq-next-btn')).toBeVisible();
  await practice.locator('#aq-next-btn').click();
  await expect(practice.locator('#aq-quiz-q-info')).toHaveText('Question 2 of 86');
  await expect(practice.locator('#aq-prog-fill')).not.toHaveAttribute('style','width: 0%;');
  const overflow=await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth,screen:document.getElementById('assessment-practice').scrollWidth}));
  expect(overflow.body).toBeLessThanOrEqual(width+2);
  expect(overflow.screen).toBeLessThanOrEqual(width+2);
  await practice.locator('.reset-btn').click();
  await page.locator('.modal-btn-confirm').click();
  await expect(practice.locator('#aq-quiz-q-info')).toHaveText('Question 1 of 86');
  await expect(practice.locator('#aq-score-display')).toHaveText('0%');
  await practice.locator('.home-btn').click();
  await page.locator('.modal-btn-confirm').click();
  await expect(page.locator('#home.active')).toBeVisible();
 });
}
test('Assessment practice all 86 questions: mixed formats, score isolation, timeout and completion',async({page})=>{
 await page.setViewportSize({width:375,height:820});
 await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{const root=document.getElementById('bt-spark-root');if(root)root.hidden=true;openQuestions();});
 await page.locator('.questions-assessment-paper').click();
 await expect(page.locator('#aq-quiz-q-info')).toHaveText('Question 1 of 86');
 const result=await page.evaluate(()=>{
  const qs=BTAssessmentPractice.getQuestions(),s=document.getElementById('assessment-practice');
  const get=id=>document.getElementById('aq-'+id);
  const before=JSON.stringify(Object.entries(localStorage).sort());
  let valid=0,written=0,invalid=0,multi=0,errors=0;
  for(const [i,q] of qs.entries()){
   if(get('q-text').textContent!==q.q||get('quiz-q-info').textContent!=='Question '+(i+1)+' of 86')errors++;
   const buttons=[...s.querySelectorAll('.opt-btn')];
   if(buttons.length!==q.opts.length)errors++;
   if(q.opts.length&&q.answer.correct.length){
    valid++;if(q.answer.correct.length>1)multi++;
    for(const n of q.answer.correct)buttons[n-1].click();
    if(q.answer.correct.length>1)s.querySelector('.aq-action').click();
    if(s.querySelectorAll('.opt-btn.correct').length!==q.answer.correct.length)errors++;
   }else{
    if(q.opts.length)invalid++;else written++;
    if(buttons.some(b=>!b.disabled))errors++;
    s.querySelector('.aq-action').click();
    if(!get('result-area').querySelector('.rc-si')?.textContent)errors++;
   }
   get('next-btn').click();
  }
  return {valid,written,invalid,multi,errors,score:get('score-display').textContent,complete:get('q-text').textContent,storageUnchanged:before===JSON.stringify(Object.entries(localStorage).sort())};
 });
 expect(result).toEqual({valid:76,written:9,invalid:1,multi:5,errors:0,score:'100%',complete:'Practice complete!',storageUnchanged:true});
 await page.locator('#assessment-practice .reset-btn').click();
 await page.locator('.modal-btn-confirm').click();
 const q=await page.evaluate(()=>BTAssessmentPractice.getQuestions()[0]);
 const bad=q.opts.findIndex((_,i)=>!q.answer.correct.includes(i+1));
 if(bad>=0){
  await page.locator('#assessment-practice .opt-btn').nth(bad).click();
  if(q.answer.correct.length>1)await page.locator('#assessment-practice .aq-action').click();
  await expect(page.locator('#assessment-practice .opt-btn.wrong')).toHaveCount(1);
  await expect(page.locator('#aq-score-display')).toHaveText('0%');
  await page.locator('#aq-next-btn').click();
 }
 await page.evaluate(()=>{const original=Date.now;Date.now=()=>original()+61000;});
 await expect(page.locator('#assessment-practice .timeout-card')).toBeVisible({timeout:4000});
 await expect(page.locator('#aq-timer-val')).toHaveText('0:00');
 await expect(page.locator('#aq-next-btn')).toBeVisible();
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
   root.innerHTML='<div class="panel"><h2>🏆 LEADERBOARD</h2><div id="bt-spark-content"><div class="pg-nav"><button>THIS WEEK</button><button>ALL TIME</button><button>OUTLETS</button></div><div class="pg-podium">'+[1,2,3].map(i=>'<div class="pg-podium-item arena-player-podium arena-rank-'+i+'">'+(i===1?'<span class="arena-first-rank">1</span>':'')+'<div>🏅</div><img src="./images/default-avatar.png" alt=""><strong>'+(i===1?'Sandamini Dilrukshi Jayasinghe':'Player '+i)+'</strong><small>100 PTS</small></div>').join('')+'</div><div class="pg-section">PLAYER STANDINGS</div><input type="text" class="pg-board-search" aria-label="Search username or outlet"><div class="pg-standings-scroll">'+Array.from({length:30},(_,i)=>'<div class="pg-leader-card arena-player-standing"><span class="pg-place">'+(i+4)+'</span><img class="pg-avatar" src="./images/default-avatar.png"><div class="pg-person"><strong>Player '+(i+4)+'</strong><small>Matara</small></div><span class="pg-score">20 PTS</span></div>').join('')+'</div><div class="pg-board-footer"><button class="pg-btn-green">👤 MY PROFILE</button><button class="pg-btn-red">CLOSE</button></div></div></div>';
  });
  await expect(page.locator('.pg-standings-scroll .pg-leader-card')).toHaveCount(30);
  const before=await page.evaluate(()=>{
   const panel=document.querySelector('#bt-spark-root .panel');
   const footer=document.querySelector('.pg-board-footer');
   const rows=document.querySelector('.pg-standings-scroll');
   const podium=document.querySelector('.pg-podium');
   const rect=x=>x.getBoundingClientRect().toJSON();
   return {footer:rect(footer),podium:rect(podium),rows:rect(rows),search:rect(document.querySelector('.pg-board-search')),
    panelOverflow:getComputedStyle(panel).overflowY,
    scrollOverflow:getComputedStyle(rows).overflowY,
    maxScroll:rows.scrollHeight-rows.clientHeight,
    panelClient:panel.clientWidth,panelScroll:panel.scrollWidth,
    buttons:[...footer.querySelectorAll('button')].map(rect),scrollbarWidth:getComputedStyle(rows).scrollbarWidth,webkitScrollbar:getComputedStyle(rows,'::-webkit-scrollbar').display,firstAnimation:getComputedStyle(document.querySelector('.pg-podium-item.arena-rank-1')).animationName,
    firstDuration:getComputedStyle(document.querySelector('.pg-podium-item.arena-rank-1')).animationDuration,
    sweepDuration:getComputedStyle(document.querySelector('.pg-podium-item.arena-rank-1'),'::after').animationDuration,
    podiumGeometry:[...podium.querySelectorAll('.pg-podium-item')].map(rect),
    firstName:(()=>{
     const el=podium.querySelector('.arena-rank-1 strong'),style=getComputedStyle(el);
     return {text:el.textContent,whiteSpace:style.whiteSpace,overflow:style.overflow,
       scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,
       scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};
    })()};
  });
  expect(before.panelOverflow).toBe('hidden');
  expect(before.scrollOverflow).toBe('auto');
  expect(before.maxScroll).toBeGreaterThan(0);
  expect(before.scrollbarWidth).toBe('none');
  expect(before.webkitScrollbar).toBe('none');
  expect(before.firstAnimation).toContain('arenaFirstGlow');
  expect(before.firstDuration).toBe('1.9s');
  expect(before.sweepDuration).toBe('2.7s');
  expect(before.firstName.text).toBe('Sandamini Dilrukshi Jayasinghe');
  expect(before.firstName.whiteSpace).toBe('normal');
  expect(before.firstName.overflow).toBe('visible');
  expect(before.firstName.scrollWidth).toBeLessThanOrEqual(before.firstName.clientWidth+2);
  expect(before.firstName.scrollHeight).toBeLessThanOrEqual(before.firstName.clientHeight+2);
  expect(before.podiumGeometry[0].width).toBeGreaterThanOrEqual(before.podiumGeometry[1].width);
  expect(before.podiumGeometry[0].width).toBeGreaterThanOrEqual(before.podiumGeometry[2].width);
  expect(before.podiumGeometry[0].height).toBeGreaterThanOrEqual(before.podiumGeometry[1].height-2);
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
   searchTop:document.querySelector('.pg-board-search').getBoundingClientRect().top,
   podiumTop:document.querySelector('.pg-podium').getBoundingClientRect().top
  }));
  expect(after.scrollTop).toBeGreaterThan(0);
  expect(Math.abs(after.footerTop-before.footer.top)).toBeLessThan(1);
  expect(Math.abs(after.podiumTop-before.podium.top)).toBeLessThan(1);
  expect(Math.abs(after.searchTop-before.search.top)).toBeLessThan(1);
  expect(before.search.bottom).toBeLessThanOrEqual(before.rows.top+1);
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
   root.innerHTML='<div class="panel"><h2>PLAYER DETAILS</h2><div id="bt-spark-content"><div class="arena-player-detail"><div class="arena-detail-ribbon">✦ PIZZA ARENA PLAYER</div><img src="./images/default-avatar.png" alt=""><h3>Sample Player</h3><p>Matara</p><div class="arena-detail-stats">'+['Level','Points','Accuracy','Current weekly rank','Best all-time rank observed'].map((label,i)=>'<div'+(label==='Accuracy'?' class="arena-detail-accuracy"':'')+'><strong>'+[7,'1,200','87.5%',4,2][i]+'</strong><small>'+label+'</small></div>').join('')+'</div></div><div class="arena-detail-actions"><button class="arena-detail-back">Back to leaderboard</button></div></div></div>';
  });
  const geometry=await page.evaluate(()=>{
   const panel=document.querySelector('#bt-spark-root .panel'),button=document.querySelector('.arena-detail-back'),actions=document.querySelector('.arena-detail-actions');
   return {rightGap:actions.getBoundingClientRect().right-button.getBoundingClientRect().right,
    panelRight:panel.getBoundingClientRect().right,scrollbarWidth:getComputedStyle(panel).scrollbarWidth,
    scrollbarDisplay:getComputedStyle(panel,'::-webkit-scrollbar').display};
  });
  await expect(page.locator('.arena-detail-accuracy')).toContainText('87.5%');
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

test('Manage Users search and all three equal-width actions stay fixed during list scroll',async({page})=>{
 await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort());
 for(const [width,height] of [[320,568],[375,740],[430,820],[768,740]]){
  await page.setViewportSize({width,height});
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  await page.evaluate(()=>{
   const root=document.getElementById('bt-spark-root');root.hidden=false;root.className='arena-manage-users-layout';
   root.innerHTML='<div class="panel"><h2>MANAGE USERS</h2><p>Create and manage player accounts.</p><div id="bt-spark-content"><p class="pg-muted pg-users-status">Showing up to 250 users. Administrator accounts are protected.</p><input type="search" class="pg-users-search" aria-label="Search username or outlet"><div class="pg-users-scroll">'+Array.from({length:60},(_,i)=>'<div class="pg-review-item"><div><strong>Player '+i+' · Matara</strong><small>200 pts · User code abcdefgh…</small></div><button>DELETE</button></div>').join('')+'</div><div class="pg-users-footer"><button class="pg-btn-green">Create User</button><button class="alt">Back</button><button class="pg-btn-red">Close</button></div></div></div>';
  });
  const bounds=()=>page.evaluate(()=>{
   const panel=document.querySelector('#bt-spark-root .panel'),list=document.querySelector('.pg-users-scroll'),footer=document.querySelector('.pg-users-footer'),search=document.querySelector('.pg-users-search');
   const rect=x=>x.getBoundingClientRect().toJSON();
   return {panel:rect(panel),search:rect(search),list:rect(list),footer:rect(footer),buttons:[...footer.children].map(rect),overflow:getComputedStyle(list).overflowY,panelOverflow:getComputedStyle(panel).overflowY,range:list.scrollHeight-list.clientHeight,top:list.scrollTop,horizontal:panel.scrollWidth-panel.clientWidth};
  });
  const before=await bounds();
  expect(before.overflow).toBe('auto');expect(before.panelOverflow).toBe('hidden');
  expect(before.range).toBeGreaterThan(0);expect(before.list.height).toBeGreaterThan(100);
  expect(before.horizontal).toBeLessThanOrEqual(2);
  expect(before.search.bottom).toBeLessThanOrEqual(before.list.top+1);
  expect(before.footer.top).toBeGreaterThanOrEqual(before.list.bottom-1);
  expect(before.footer.bottom).toBeLessThanOrEqual(height);
  expect(before.buttons).toHaveLength(3);
  for(const b of before.buttons){expect(Math.abs(b.top-before.buttons[0].top)).toBeLessThan(1);expect(Math.abs(b.width-before.buttons[0].width)).toBeLessThan(1);expect(b.height).toBeGreaterThanOrEqual(44);}
  expect(Math.abs(before.buttons[0].left-before.footer.left)).toBeLessThan(2);
  expect(Math.abs(before.buttons[2].right-before.footer.right)).toBeLessThan(2);
  await page.locator('.pg-users-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
  const after=await bounds();expect(after.top).toBeGreaterThan(0);
  expect(Math.abs(after.search.top-before.search.top)).toBeLessThan(1);
  expect(Math.abs(after.footer.top-before.footer.top)).toBeLessThan(1);
  await page.locator('.pg-users-search').fill('Matara');
  await expect(page.locator('.pg-users-search')).toBeFocused();
 }
});
