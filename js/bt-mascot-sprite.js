/* Pizza Hut sticker-sheet mascot adapter.
   A single lightweight WebP sprite replaces ten former vector mascot downloads.
   Characters are mapped directly from the user's approved 5x2 sticker sheet.
*/
(function(){
  'use strict';
  const frameMap={
    'welcome':[0,0], 'rank-up':[1,0], 'overtaken':[2,0],
    'timer':[3,0], 'correct':[4,0], 'wrong':[0,1],
    'monthly':[1,1], 'crown':[2,1], 'private':[3,1],
    'update':[4,1], 'champ':[1,0], 'challenge':[2,0]
  };
  const sprite='./images/mascot/pizza-sticker-sprite.webp';
  const blank='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const matchMascot=(value)=>{
    const match=String(value||'').match(/pizza-(welcome|rank-up|overtaken|timer|correct|wrong|monthly|crown|private|update|champ|challenge)\.svg(?:\?.*)?$/);
    return match?.[1]||null;
  };
  function set(img,state){
    if(!(img instanceof HTMLImageElement)) return img;
    const cell=frameMap[state];
    if(!cell)return img;
    img.dataset.mascot=state;
    img.classList.add('bt-sticker-art');
    img.style.backgroundImage='url("'+sprite+'")';
    img.style.backgroundRepeat='no-repeat';
    img.style.backgroundSize='500% 200%';
    img.style.backgroundPosition=(cell[0]*25)+'% '+(cell[1]*100)+'%';
    img.src=blank;
    img.decoding='async';
    return img;
  }
  function upgrade(node){
    if(node?.nodeType!==1)return;
    if(node.matches?.('img')){
      const name=matchMascot(node.getAttribute('src'))||node.dataset.mascot;
      if(name && frameMap[name] && (node.dataset.mascot!==name || !node.classList.contains('bt-sticker-art')))set(node,name);
    }
    if(node.querySelectorAll)node.querySelectorAll('img[src*="/mascot/pizza-"],img[data-mascot]').forEach(upgrade);
  }
  window.BTMascot={set,upgrade,asset:sprite,states:Object.keys(frameMap)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>upgrade(document.body),{once:true});
  else upgrade(document.body);
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='attributes')upgrade(record.target);
      else record.addedNodes.forEach(upgrade);
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-mascot']});
})();
