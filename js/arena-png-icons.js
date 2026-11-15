/* Pizza Arena raster-only interface icons.
   Paints familiar emoji artwork into transparent PNG canvas assets.
   No SVG icon libraries, vectors, or network requests are used. */
(()=>{
'use strict';
const glyphCache=new Map();
const PNG_MAP={
 '🆕':'🆕','📋':'📋','📝':'📝','🎯':'🎯','🚀':'🚀',
 '🏆':'🏆','📘':'📘','🌟':'🌟','👑':'👑','🔥':'🔥',
 '⚡':'⚡','💯':'💯','🍕':'🍕','🔊':'🔊','🔇':'🔇',
 '⭐':'⭐','🏅':'🏅','♻️':'♻️','✎':'✏️'
};
function source(icon){
 if(glyphCache.has(icon))return glyphCache.get(icon);
 const canvas=document.createElement('canvas'),pixels=128;
 canvas.width=pixels;canvas.height=pixels;
 const context=canvas.getContext('2d');
 if(!context)return '';
 context.clearRect(0,0,pixels,pixels);
 context.font='100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
 context.textAlign='center';context.textBaseline='middle';
 context.fillText(icon,64,68);
 const png=canvas.toDataURL('image/png');
 glyphCache.set(icon,png);return png;
}
function raster(node,icon){
 if(!node||node.dataset.arenaPngIcon===icon)return;
 const png=source(PNG_MAP[icon]||icon);
 if(!png)return;
 const image=document.createElement('img');
 image.className='arena-png-icon';
 image.src=png;
 image.alt='';
 image.setAttribute('aria-hidden','true');
 image.width=64;image.height=64;
 image.decoding='async';
 node.replaceChildren(image);
 node.dataset.arenaPngIcon=icon;
}
function refresh(scope=document){
 scope.querySelectorAll('.pc-icon-big,.arena-stat-icon,.arena-reward-icon').forEach(node=>{
   const raw=node.textContent.trim();
   if(raw&&!node.dataset.arenaPngIcon)raster(node,raw);
 });
 // Preserve accessible button text, using PNG for the trophy emblem.
 scope.querySelectorAll('.arena-hero-cta > span').forEach(node=>raster(node,'🏆'));
 const title=scope.querySelector('.arena-achievements-heading strong');
 if(title&&title.textContent.includes('🏅')&&!title.querySelector('img')){
   title.textContent=title.textContent.replace('🏅','').trim();
   const emblem=document.createElement('span');emblem.className='arena-heading-emblem';
   raster(emblem,'🏅');title.prepend(emblem);
 }
 scope.querySelectorAll('.arena-outlet-symbol').forEach(node=>raster(node,'✏️'));
}
window.BTArenaPNG={refresh};
document.addEventListener('DOMContentLoaded',()=>refresh(document));
})();
