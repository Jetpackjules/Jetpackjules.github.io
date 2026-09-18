// Only static app assets are cached. Camera/uploaded photos never pass here.
const SCOPE_PATH=new URL(self.registration.scope).pathname.replace(/\/?$/,'/');
const CACHE_PREFIX='crux:'+encodeURIComponent(SCOPE_PATH)+':',APP_PREFIX=CACHE_PREFIX+'app-';
const APP=APP_PREFIX+'v18',ASSETS=CACHE_PREFIX+'model-assets-v1';
const CORE=['./','index.html','style.css','app.js','image-status.mjs','scan-progress.mjs','climber-profile.mjs','straight-surface-cells.mjs','surface-evidence.mjs','adaptive-straight-surfaces.mjs','augment-gradient-seams.mjs','engine.js','problem-engine.mjs','problem-worker.js','problem-view.js','hold-segmentation.mjs','hold-colors.mjs','vision-worker.js','detector-worker.js','angle-worker.js','incline-geometry.mjs','local-incline.mjs','wall-scale.mjs','facet-pose.mjs','facet-view.mjs','wall-facets.mjs','automatic-surfaces.mjs','surface-model.mjs','focus-area.mjs','climber-ik.mjs','contact-labels.mjs','wall-interaction.js','pwa.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','demo-holds.json'];
const cacheable=(response,url)=>response.ok&&!response.redirected&&new URL(response.url).pathname===url.pathname;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(APP);
 await Promise.all(CORE.map(async path=>{const url=new URL(path,self.registration.scope),response=await fetch(new Request(url,{cache:'reload'}));if(!cacheable(response,url))throw Error('Static app unavailable');await cache.put(url,response);}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(APP_PREFIX)&&key!==APP)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.search&&url.search!=='?v=18')return;
 const key=new URL(url);key.search='';
 const relative=url.pathname.slice(new URL(self.registration.scope).pathname.length);
 const large=/^(models\/|vendor\/|examples\/|demo-wall\.jpg$)/.test(relative);
 if(!large&&!CORE.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(large?ASSETS:APP),cached=await cache.match(key.href);
  if(large&&cached)return cached;
  try{const response=await fetch(req);if(cacheable(response,url))await cache.put(key.href,response.clone()).catch(()=>{});return response;}
  catch(error){if(cached)return cached;throw error;}
 })());
});
