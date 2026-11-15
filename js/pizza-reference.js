/* Pizza Arena artwork placement v3.8. Presentation-only; never modifies scores, profile layout, or stored data. */
(()=>{'use strict';
const root='./images/arena/';
const atlas=root+'atlas.png';
const labels={'Rising Star':0,'Pizza Legend':1,'Sharp Mind':2,'Super Student':3,'Weekly Warrior':4,'Outlet Challenger':5,'Weekly 50':4,'Outlet Drive':5,'Legend':1,'Points':6,'Correct':7,'Answered':8};
function icon(node,index){
  if(!node||node.dataset.arenaPng===String(index))return;
  node.dataset.arenaPng=String(index);
  node.classList.add('arena-png-icon');
  node.textContent='';
  node.style.setProperty('--arena-icon-x',(index%4)*(100/3)+'%');
  node.style.setProperty('--arena-icon-y',Math.floor(index/4)*50+'%');
  node.setAttribute('aria-hidden','true');
}
function run(){
  const hero=document.querySelector('#home .arena-hero-mascot img');
  if(hero&&hero.getAttribute('src')!==root+'mascot-champion.png'){
    hero.src=root+'mascot-champion.png';
    hero.removeAttribute('width');
    hero.removeAttribute('height');
    hero.decoding='async';
  }
  // The PNG wordmark is cropped from the local transparent PNG atlas via CSS.
  const wordmark=document.querySelector('#home .arena-pizza-wordmark');
  if(wordmark){
    wordmark.setAttribute('role','img');
    wordmark.setAttribute('aria-label','Pizza Hut');
    wordmark.textContent='';
  }
  document.querySelectorAll('#home .paper-card').forEach(card=>{
    const title=card.querySelector('.pc-title')?.textContent||'';
    const key=/paper 2|operations|model 2/i.test(title)?9:10;
    icon(card.querySelector('.pc-icon-big'),key);
  });
  document.querySelectorAll('.arena-status-card img').forEach(img=>{
    if(img.getAttribute('src')!==root+'mascot-avatar.png')img.src=root+'mascot-avatar.png';
  });
  document.querySelectorAll('img.arena-avatar').forEach(img=>{
    const src=img.getAttribute('src')||'';
    if(src.includes('/images/default-avatar.png'))img.src=root+'mascot-avatar.png';
  });
  document.querySelectorAll('.arena-stat').forEach(card=>{
    const label=card.querySelector('span:last-child')?.textContent?.trim();
    if(Object.prototype.hasOwnProperty.call(labels,label))icon(card.querySelector('.arena-stat-icon'),labels[label]);
  });
  document.querySelectorAll('.arena-reward-item').forEach(card=>{
    const label=card.querySelector('strong')?.textContent?.trim();
    if(Object.prototype.hasOwnProperty.call(labels,label))icon(card.querySelector('.arena-reward-icon'),labels[label]);
  });
}
let scheduled=false;
function queue(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;run()});
}
function start(){
  run();
  new MutationObserver(queue).observe(document.body,{subtree:true,childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();