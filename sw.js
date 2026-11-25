/* BT Exam Prep — versioned offline shell; PNGs cached without altering image pixels. */
const CACHE = 'bt-exam-board-v478-20261125';
const CORE = ["./","./index.html","./manifest.json","./firebase-config.js","./js/bt-spark.js","./js/bt-rewards.js","./js/pizza-reference.js?v=4.0.0","./css/pizza-reference.css?v=3.9","./css/pizza-arena-v40.css?v=4.0.1","./css/player-card-v42.css?v=4.2.0","./js/account-profile-save.js?v=4.2.0","./study/lesson-player.css?v=4.1.0","./study/lesson-art.js?v=4.6.0","./study/lesson-player.js?v=4.6.0","./js/arena-navigation-ranks.js?v=4.7.2","./css/arena-polish-v43.css?v=4.7.5","./study/content/training.json","./study/content/values.json","./study/content/handbook.json","./js/assessment-practice.js?v=4.7.8","./css/assessment-practice.css?v=4.7.8","./assessments/si-part-1.json","./assessments/si-part-2.json","./assessments/si-part-3.json","./assessments/si-part-4.json","./assessments/proposed-answers.json","./css/questions-v477.css?v=4.7.7","./css/press-feedback-v477.css?v=4.7.7","./js/press-feedback-v477.js?v=4.7.7","./assessments/bt-oct-2025.json","./assessments/las-2025.json","./assessments/las-jan-2026.json","./css/pizza-game.css","./css/pizza-v34.css","./css/pizza-v36.css","./version.json","./images/arena/mascot-champion.png","./images/arena/atlas.png","./images/arena/chalk-food-v45.png","./images/arena/stat-points.png","./images/arena/stat-correct.png","./images/arena/stat-answered.png","./images/arena/leaderboard-trophy.png","./images/arena/header-bell.png","./images/arena/header-user.png","./images/arena/mascot-avatar.png","./images/default-avatar.png","./images/mascot/pizza-correct.png","./images/mascot/pizza-wrong.png","./images/mascot/pizza-timer.png","./icons/icon-192.png"];
// Pre-cache the authentication and Firestore modules for reopening a saved session offline.
const SDK = [
 "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js",
 "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js",
 "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js"
];
const EXTRA = ["./images/mascot/pizza-champ.png","./images/mascot/pizza-challenge.png","./images/mascot/pizza-crown.png","./images/mascot/pizza-monthly.png","./images/mascot/pizza-overtaken.png","./images/mascot/pizza-private.png","./images/mascot/pizza-rank-up.png","./images/mascot/pizza-update.png","./images/mascot/pizza-welcome.png","./icons/icon-512.png"];
async function fill(cache,urls,previous){
  // Prioritize essential files and limit concurrent downloads.
  let next=0;
  await Promise.all(Array.from({length:3},async()=>{while(next<urls.length){
    const path=urls[next++];
    try{
      const req=new Request(new URL(path,self.registration.scope),{cache:'reload'});
      const res=await fetch(req);
      if(res.ok)await cache.put(req,res);
      else throw Error('HTTP '+res.status);
    }catch(e){
      // Only recover the exact URL from a prior offline cache on network failure.
      for(const old of previous){const copy=await old.match(new URL(path,self.registration.scope));if(copy){await cache.put(new URL(path,self.registration.scope),copy);break}}
    }
  }}));
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const names=(await caches.keys()).filter(n=>n.startsWith('bt-exam-')&&n!==CACHE);
 const previous=await Promise.all(names.map(n=>caches.open(n)));
 await fill(cache,CORE,previous);
 await fill(cache,SDK,previous);
 // Carry forward immutable Firebase SDK responses so an upgrade does not
 // discard a previously working offline login/runtime cache.
 for(const old of previous){
   for(const request of await old.keys()){
     const url=new URL(request.url);
     if(url.origin==='https://www.gstatic.com'&&url.pathname.startsWith('/firebasejs/13.2.0/')&&!(await cache.match(request))){
       const response=await old.match(request);
       if(response){try{await cache.put(request,response)}catch(e){/* Storage quota may be limited. */}}
     }
   }
 }
 // Secondary artwork loads after the shell, with a bounded connection count.
 await fill(cache,EXTRA,previous);
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('bt-exam-')&&n!==CACHE).map(n=>caches.delete(n)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);
 const same=url.origin===self.location.origin;
 const isSDK=url.origin==='https://www.gstatic.com'&&url.pathname.startsWith('/firebasejs/13.2.0/');
 if(!same&&!isSDK)return;
 // Do not intercept other apps hosted on this GitHub Pages origin.
 if(same&&!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 const isVersion=same&&url.pathname.endsWith('/version.json');
 const networkFirst=same&&(req.mode==='navigate'||/(index\.html|firebase-config\.js|bt-spark\.js|version\.json)$/.test(url.pathname));
 const key=isVersion?new Request(new URL('./version.json',self.registration.scope)):req;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(!networkFirst){const copy=await cache.match(key);if(copy)return copy}
  try{
    const res=await fetch(req,networkFirst?{cache:'no-store'}:undefined);
    if(res.ok){try{await cache.put(key,res.clone())}catch(e){/* Storage limits must not block an online response. */}}
    return res;
  }catch(e){return await cache.match(key)||(req.mode==='navigate'?await cache.match(new URL('./index.html',self.registration.scope)):null)||Response.error()}
 })());
});
