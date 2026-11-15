/* Reference matched PNG artwork; player card structure remains untouched. */
(()=>{'use strict';const base='./images/arena/';const atlas=base+'atlas.png';
const map={'Rising Star':0,'Pizza Legend':1,'Sharp Mind':2,'Super Student':3,'Weekly Warrior':4,'Outlet Challenger':5,'Weekly 50':4,'Outlet Drive':5,'Legend':1,'Points':6,'Correct':7,'Answered':8};
function atlasIcon(el,index){if(!el||el.dataset.pngIcon===String(index))return;el.dataset.pngIcon=String(index);el.textContent='';el.classList.add('arena-png-icon');el.style.backgroundImage='url("'+atlas+'")';el.style.backgroundSize='288px 216px';el.style.backgroundPosition='-'+(index%4*72)+'px -'+(Math.floor(index/4)*72)+'px';}
function update(){const hero=document.querySelector('#home .arena-hero-mascot img');if(hero&&!hero.src.includes('/images/arena/')){hero.src=base+'mascot-champion.png';hero.removeAttribute('width');hero.removeAttribute('height');}
const wordmark=document.querySelector('#home .arena-pizza-wordmark');if(wordmark&&!wordmark.dataset.arenaWordmark){wordmark.dataset.arenaWordmark='yes';wordmark.textContent='';const im=new Image();im.src=atlas;im.alt='Pizza Hut';im.className='arena-wordmark-atlas';wordmark.append(im);}
document.querySelectorAll('#home .paper-card').forEach(card=>{const el=card.querySelector('.pc-icon-big');const label=card.querySelector('.pc-title')?.textContent||'';atlasIcon(el,/paper 2|operations|model 2/i.test(label)?9:10);});
document.querySelectorAll('.arena-status-card img').forEach(im=>{if(!im.src.includes('/images/arena/'))im.src=base+'mascot-avatar.png'});
document.querySelectorAll('img.arena-avatar').forEach(im=>{if(/\/images\/default-avatar\.png(?:\?|$)/.test(im.src))im.src=base+'mascot-avatar.png'});
document.querySelectorAll('.arena-stat').forEach(item=>{const label=item.querySelector('span:last-child')?.textContent?.trim();if(label in map)atlasIcon(item.querySelector('.arena-stat-icon'),map[label]);});
document.querySelectorAll('.arena-reward-item').forEach(item=>{const label=item.querySelector('strong')?.textContent?.trim();if(label in map)atlasIcon(item.querySelector('.arena-reward-icon'),map[label]);});}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()});};
function start(){update();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();