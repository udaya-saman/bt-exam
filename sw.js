/* BT Exam Prep – Spark-plan offline cache. No Cloud Functions, Storage or push SDK required. */
const CACHE = 'bt-exam-sharp-png-v8';
const SHELL = ["./","./index.html","./manifest.json","./firebase-config.js","./js/bt-spark.js","./js/bt-rewards.js","./version.json","./images/default-avatar.png","./css/pizza-game.css","./css/pizza-v34.css","./images/mascot/pizza-champ.png","./images/mascot/pizza-challenge.png","./images/mascot/pizza-correct.png","./images/mascot/pizza-crown.png","./images/mascot/pizza-monthly.png","./images/mascot/pizza-overtaken.png","./images/mascot/pizza-private.png","./images/mascot/pizza-rank-up.png","./images/mascot/pizza-timer.png","./images/mascot/pizza-update.png","./images/mascot/pizza-welcome.png","./images/mascot/pizza-wrong.png","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.all(SHELL.map(async url=>{try{await cache.add(url)}catch(e){console.warn('Cache skip',url,e)} }));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('bt-exam-')&&n!==CACHE).map(n=>caches.delete(n)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);
 const isSDK=url.origin==='https://www.gstatic.com'&&url.pathname.startsWith('/firebasejs/13.2.0/');
 if(url.origin!==self.location.origin&&!isSDK)return;
 const networkFirst=!isSDK&&(req.mode==='navigate'||/(index\.html|firebase-config\.js|bt-spark\.js|version\.json)$/.test(url.pathname));
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(!networkFirst){const copy=await cache.match(req);if(copy)return copy;}
  try{const res=await fetch(req,networkFirst?{cache:'no-store'}:undefined);if(res.ok)cache.put(req,res.clone());return res;}
  catch(_){return await cache.match(req)||(req.mode==='navigate'?await cache.match('./index.html'):Response.error());}
 })());
});
