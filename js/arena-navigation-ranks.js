/* Arena navigation and observed lifetime rank history. No score mutations. */
(function(w){
 'use strict';
 const stack=[{key:'screen:home',restore:()=>{w.BTExamUI?.dismissForNavigation?.();w.showScreen?.('home');}}];
 let replaying=false;
 const Nav={
  visit(key,restore){
   if(replaying)return;
   if(key==='study:library'&&stack.at(-1)?.key==='screen:study-select')stack.pop();
   if(key==='screen:results'&&stack.at(-1)?.key==='screen:quiz')stack.pop();
   if(key.startsWith('screen:'))while(stack.at(-1)?.key.startsWith('panel:'))stack.pop();
   const i=stack.findIndex(x=>x.key===key);
   if(i>=0){stack.splice(i+1);stack[i].restore=restore;}
   else stack.push({key,restore});
  },
  back(){
   if(document.getElementById('custom-modal')?.classList.contains('open')){w.closeModal?.();return;}
   if(stack.length<2)return;
   stack.pop();replaying=true;
   try{const target=stack[stack.length-1];if(!target.key.startsWith('panel:'))w.BTExamUI?.dismissForNavigation?.();target.restore();}finally{replaying=false;}
  },
  removePanels(){if(!replaying)while(stack.at(-1)?.key.startsWith('panel:'))stack.pop();},
  isReplaying:()=>replaying
 };
 w.ArenaNav=Nav;
 const arm=()=>{history.pushState({arenaBack:true},document.title,location.href);};
 arm();w.addEventListener('popstate',()=>{arm();Nav.back();});
 const PREFIX='bt_arena_best_observed_v1:';
 function get(uid){if(!uid)return null;try{const value=Number(localStorage.getItem(PREFIX+uid));return Number.isInteger(value)&&value>0?value:null;}catch(_){return null;}}
 function observe(records){for(const r of records){if(!r.uid||!Number.isInteger(r.rank)||r.rank<1)continue;const old=get(r.uid);if(old===null||r.rank<old){try{localStorage.setItem(PREFIX+r.uid,String(r.rank));}catch(_){}}}}
 function change(before,after){
  if(!Number.isInteger(before)||!Number.isInteger(after)||before===after)return null;
  if(after===1)return {kind:'champion',title:'YOU ARE #1!',mascot:'pizza-champ.png',text:'You took the lead!'};
  if(before===1)return {kind:'dethroned',title:'THE CROWN IS IN PLAY',mascot:'pizza-challenge.png',text:'You moved from first to #'+after+'. Keep playing!'};
  if(after<before)return {kind:'up',title:'RANK UP!',mascot:'pizza-rank-up.png',text:'You climbed from #'+before+' to #'+after+'!'};
  return {kind:'down',title:'RANK CHALLENGE',mascot:'pizza-overtaken.png',text:'You moved from #'+before+' to #'+after+'. You can climb back!'};
 }
 w.ArenaRankHistory=Object.freeze({get,observe,change});
})(window);
