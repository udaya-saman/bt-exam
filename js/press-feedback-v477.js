/* Pizza Arena — lightweight pointer/keyboard press feedback (no layout or scoring changes). */
(function(){
 'use strict';
 const HOLD_MS=145;
 const pending=new WeakMap();
 let active=null;
 const select=target=>target instanceof Element
   ?target.closest('button,[role="button"]'):null;
 const enabled=element=>element&&!element.disabled&&element.getAttribute('aria-disabled')!=='true';
 const cancelTimer=element=>{
   const timer=pending.get(element);
   if(timer!==undefined){clearTimeout(timer);pending.delete(element);}
 };
 function start(element){
   if(!enabled(element))return;
   cancelTimer(element);
   element.classList.remove('arena-pressed');
   element.classList.add('arena-pressing');
 }
 function release(element,animate=true){
   if(!element)return;
   element.classList.remove('arena-pressing');
   cancelTimer(element);
   if(!animate||!enabled(element)){
     element.classList.remove('arena-pressed');return;
   }
   element.classList.add('arena-pressed');
   const timer=setTimeout(()=>{element.classList.remove('arena-pressed');pending.delete(element);},HOLD_MS);
   pending.set(element,timer);
 }
 document.addEventListener('pointerdown',event=>{
   if(event.button!==0||!event.isPrimary)return;
   const element=select(event.target);
   if(!enabled(element))return;
   if(active&&active!==element)release(active,false);
   active=element;start(element);
 },true);
 document.addEventListener('pointerup',event=>{
   if(!active)return;
   const element=active;active=null;
   release(element,element===select(event.target));
 },true);
 document.addEventListener('pointercancel',()=>{release(active,false);active=null;},true);
 window.addEventListener('blur',()=>{release(active,false);active=null;});
 document.addEventListener('keydown',event=>{
   if(event.repeat||(event.key!=='Enter'&&event.key!==' '))return;
   const element=select(event.target);
   if(enabled(element))start(element);
 },true);
 document.addEventListener('keyup',event=>{
   if(event.key!=='Enter'&&event.key!==' ')return;
   const element=select(event.target);
   if(enabled(element))release(element,true);
 },true);
 // The click event may be keyboard-synthesized without keydown (assistive tech).
 document.addEventListener('click',event=>{
   const element=select(event.target);
   if(!enabled(element))return;
   if(event.detail===0)release(element,true);
 },true);
})();
