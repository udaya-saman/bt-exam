/* Pizza Arena artwork placement v3.8. Presentation-only; never modifies scores, profile layout, or stored data. */
(()=>{'use strict';
const labels={'Rising Star':0,'Pizza Legend':1,'Sharp Mind':2,'Super Student':3,'Weekly Warrior':4,'Outlet Challenger':5,'Weekly 50':4,'Outlet Drive':5,'Legend':1,'Points':6,'Correct':7,'Answered':8,'First Slice':10,'100 Correct Club':2,'3-Day Streak':4,'7-Day Streak':4,'14-Day Streak':1,'Crown Squad':1};
function icon(node,index){
  if(!node||node.dataset.arenaPng===String(index))return;
  node.dataset.arenaPng=String(index);
  node.classList.add('arena-png-icon');
  node.textContent='';
  node.style.setProperty('--arena-icon-x',(index%4)*(100/3)+'%');
  node.style.setProperty('--arena-icon-y',Math.floor(index/4)*50+'%');
  node.setAttribute('aria-hidden','true');
}
function homeArtwork(){
  const home=document.getElementById('home');if(!home)return;
  const wordmark=home.querySelector('.arena-pizza-wordmark');
  if(wordmark&&!wordmark.dataset.arenaReady){
    wordmark.dataset.arenaReady='1';wordmark.setAttribute('role','img');
    wordmark.setAttribute('aria-label','Pizza Hut');wordmark.textContent='';
  }
  document.querySelectorAll('#paper-select .paper-card').forEach(card=>{
    const title=card.querySelector('.pc-title')?.textContent||'';
    icon(card.querySelector('.pc-icon-big'),/paper 2|operations|model 2/i.test(title)?9:10);
  });
}
function playerArtwork(panel){
  if(!panel.classList.contains('arena-profile-mode')||panel.hidden)return;
  panel.querySelectorAll('.arena-stat').forEach(card=>{
    const label=card.querySelector('span:last-child')?.textContent?.trim();
    if(Object.prototype.hasOwnProperty.call(labels,label))icon(card.querySelector('.arena-stat-icon'),labels[label]);
  });
  panel.querySelectorAll('.arena-reward-item').forEach(card=>{
    const label=card.querySelector('strong')?.textContent?.trim();
    if(Object.prototype.hasOwnProperty.call(labels,label))icon(card.querySelector('.arena-reward-icon'),labels[label]);
  });
}
function watchPlayer(panel){
  let scheduled=false;
  const paint=()=>{scheduled=false;playerArtwork(panel)};
  const observer=new MutationObserver(records=>{
    if(!panel.classList.contains('arena-profile-mode')||panel.hidden)return;
    if(!records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1)))return;
    if(!scheduled){scheduled=true;requestAnimationFrame(paint)}
  });
  observer.observe(panel,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  playerArtwork(panel);
}
function start(){
  homeArtwork();
  const existing=document.getElementById('bt-spark-root');
  if(existing){watchPlayer(existing);return}
  const bootstrap=new MutationObserver(()=>{
    const panel=document.getElementById('bt-spark-root');
    if(panel){bootstrap.disconnect();watchPlayer(panel)}
  });
  bootstrap.observe(document.body,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();