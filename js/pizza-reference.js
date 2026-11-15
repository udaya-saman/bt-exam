/* Pizza Arena reference visuals v4: use PNG sprites without changing data or My Player Card structure. */
(()=>{'use strict';
const root='./images/arena/', atlas=root+'atlas.png';
const symbols={'Rising Star':0,'Pizza Legend':1,'Sharp Mind':2,'Super Student':3,'Weekly Warrior':4,'Outlet Challenger':5,'Weekly 50':4,'Outlet Drive':5,'Legend':1,'Points':6,'Correct':7,'Answered':8};
function icon(node,index){
 if(!node || node.dataset.arenaIcon===String(index))return;
 node.dataset.arenaIcon=String(index);
 node.textContent='';node.classList.add('arena-png-icon');
 node.style.setProperty('--arena-icon-x',(index%4/3*100)+'%');
 node.style.setProperty('--arena-icon-y',(Math.floor(index/4)/2*100)+'%');
 node.style.backgroundImage='url("'+atlas+'")';
 node.setAttribute('role','img');node.setAttribute('aria-label',String(node.closest('.arena-reward-item')?.querySelector('strong')?.textContent||node.closest('.arena-stat')?.querySelector('span:last-child')?.textContent||'Icon'));
}
function render(){
 const hero=document.querySelector('#home .arena-hero-mascot img');
 if(hero && !hero.src.includes('/images/arena/')){hero.src=root+'mascot-champion.png';hero.removeAttribute('width');hero.removeAttribute('height');hero.decoding='async';}
 const wordmark=document.querySelector('#home .arena-pizza-wordmark');
 if(wordmark&&!wordmark.classList.contains('arena-wordmark-png')){wordmark.classList.add('arena-wordmark-png');wordmark.textContent='';wordmark.setAttribute('aria-label','Pizza Hut');}
 document.querySelectorAll('#home .paper-card').forEach(card=>{
 const node=card.querySelector('.pc-icon-big');const title=card.querySelector('.pc-title')?.textContent||'';
 icon(node,/paper 2|operations|model 2/i.test(title)?9:10);
 });
 document.querySelectorAll('.arena-status-card img').forEach(im=>{if(!im.src.includes('/images/arena/'))im.src=root+'mascot-avatar.png';});
 document.querySelectorAll('img.arena-avatar').forEach(im=>{if(/\/images\/default-avatar\.png(?:\?|$)/.test(im.src))im.src=root+'mascot-avatar.png';});
 document.querySelectorAll('.arena-stat').forEach(card=>{const text=card.querySelector('span:last-child')?.textContent?.trim();if(Object.hasOwn(symbols,text))icon(card.querySelector('.arena-stat-icon'),symbols[text]);});
 document.querySelectorAll('.arena-reward-item').forEach(card=>{const text=card.querySelector('strong')?.textContent?.trim();if(Object.hasOwn(symbols,text))icon(card.querySelector('.arena-reward-icon'),symbols[text]);});
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}
function start(){render();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();