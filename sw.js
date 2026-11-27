/* BT Exam Prep — versioned offline shell; PNGs cached without altering image pixels. */
const CACHE = 'bt-exam-board-v4719-20261127';
const CORE = ["./images/flags/lk.png","./images/flags/england.png","./images/mascot/home-study.png","./images/mascot/home-questions.png","./study/content/si.json","./","./index.html","./manifest.json","./firebase-config.js","./js/bt-spark.js","./js/bt-rewards.js","./js/pizza-reference.js?v=4.7.18","./css/pizza-reference.css?v=3.9","./css/pizza-arena-v40.css?v=4.0.1","./css/player-card-v42.css?v=4.2.0","./js/account-profile-save.js?v=4.7.16","./study/lesson-player.css?v=4.7.19","./study/lesson-art.js?v=4.7.17","./study/lesson-player.js?v=4.7.18","./js/arena-navigation-ranks.js?v=4.7.17","./css/arena-polish-v43.css?v=4.7.18","./study/content/training.json","./study/content/values.json","./study/content/handbook.json","./js/assessment-practice.js?v=4.7.18","./css/assessment-practice.css?v=4.7.10","./assessments/si-part-1.json","./assessments/si-part-2.json","./assessments/si-part-3.json","./assessments/si-part-4.json","./assessments/proposed-answers.json","./css/questions-v477.css?v=4.7.19","./css/press-feedback-v477.css?v=4.7.16","./js/press-feedback-v477.js?v=4.7.7","./assessments/bt-oct-2025.json","./assessments/las-2025.json","./assessments/las-jan-2026.json","./css/pizza-game.css","./css/pizza-v34.css","./css/pizza-v36.css","./version.json","./images/arena/mascot-champion.png","./images/arena/atlas.png","./images/arena/chalk-food-v45.png","./images/arena/stat-points.png","./images/arena/stat-correct.png","./images/arena/stat-answered.png","./images/arena/leaderboard-trophy.png","./images/arena/header-bell.png","./images/arena/header-user.png","./images/arena/mascot-avatar.png","./images/default-avatar.png","./images/mascot/pizza-sync-paused.png","./images/mascot/pizza-sync-saving.png","./images/mascot/pizza-sync-saved.png","./images/mascot/pizza-timeout.png","./images/mascot/pizza-rank-down.png","./images/mascot/pizza-chasing-crown.png","./images/mascot/pizza-correct.png","./images/mascot/pizza-wrong.png","./images/mascot/pizza-timer.png","./icons/icon-192.png"];
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
 await fill(cache,EXTRA.concat([
 "./study/art/academy.jpg",
 "./study/art/cheese.jpg",
 "./study/art/cold-filling.jpg",
 "./study/art/h01.jpg",
 "./study/art/h02.jpg",
 "./study/art/h03.jpg",
 "./study/art/h04.jpg",
 "./study/art/h05.jpg",
 "./study/art/h06.jpg",
 "./study/art/h07.jpg",
 "./study/art/h08.jpg",
 "./study/art/h09.jpg",
 "./study/art/h10.jpg",
 "./study/art/h11.jpg",
 "./study/art/h12.jpg",
 "./study/art/h13.jpg",
 "./study/art/h14.jpg",
 "./study/art/h15.jpg",
 "./study/art/h16.jpg",
 "./study/art/h17.jpg",
 "./study/art/h18.jpg",
 "./study/art/h19.jpg",
 "./study/art/h20.jpg",
 "./study/art/h21.jpg",
 "./study/art/h22.jpg",
 "./study/art/h23.jpg",
 "./study/art/h24.jpg",
 "./study/art/h25.jpg",
 "./study/art/oven.jpg",
 "./study/art/pizza.jpg",
 "./study/art/protein.jpg",
 "./study/art/sauce.jpg",
 "./study/art/shell.jpg",
 "./study/art/t01.jpg",
 "./study/art/t02.jpg",
 "./study/art/t03.jpg",
 "./study/art/t04.jpg",
 "./study/art/t05.jpg",
 "./study/art/t06.jpg",
 "./study/art/t07.jpg",
 "./study/art/t08.jpg",
 "./study/art/t09.jpg",
 "./study/art/t10.jpg",
 "./study/art/t11.jpg",
 "./study/art/t12.jpg",
 "./study/art/t13.jpg",
 "./study/art/t14.jpg",
 "./study/art/t15.jpg",
 "./study/art/t16.jpg",
 "./study/art/t17.jpg",
 "./study/art/t18.jpg",
 "./study/art/t19.jpg",
 "./study/art/t20.jpg",
 "./study/art/taco-sauce.jpg",
 "./study/art/taco.jpg",
 "./study/art/toppings.jpg",
 "./study/art/v01.jpg",
 "./study/art/v02.jpg",
 "./study/art/v03.jpg",
 "./study/art/v04.jpg",
 "./study/art/v05.jpg",
 "./study/art/v06.jpg",
 "./study/art/v07.jpg",
 "./study/art/v08.jpg",
 "./study/art/v09.jpg",
 "./study/art/v10.jpg",
 "./study/art/v11.jpg",
 "./study/art/v12.jpg",
 "./images/achievements/centurion.png",
 "./images/achievements/first-slice.png",
 "./images/achievements/legend.png",
 "./images/achievements/master-scorer.png",
 "./images/achievements/outlet-crown.png",
 "./images/achievements/outlet-drive.png",
 "./images/achievements/outlet-elite.png",
 "./images/achievements/precision.png",
 "./images/achievements/rising-star.png",
 "./images/achievements/scholar.png",
 "./images/achievements/sharp-mind.png",
 "./images/achievements/streak-14.png",
 "./images/achievements/streak-21.png",
 "./images/achievements/streak-3.png",
 "./images/achievements/streak-7.png",
 "./images/achievements/super-student.png",
 "./images/achievements/weekly-50.png",
 "./images/achievements/weekly-elite.png"
]),previous);
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
