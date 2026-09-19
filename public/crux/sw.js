// Only static app assets are cached. Camera/uploaded photos never pass here.
const APP='crux-app-v22',ASSETS='crux-model-assets-v1';
const CORE=['./','index.html','style.css','app.js','image-status.mjs','scan-progress.mjs','climber-profile.mjs','straight-surface-cells.mjs','surface-evidence.mjs','adaptive-straight-surfaces.mjs','augment-gradient-seams.mjs','engine.js','problem-engine.mjs','problem-worker.js','problem-view.js','hold-segmentation.mjs','hold-colors.mjs','vision-worker.js','detector-worker.js','angle-worker.js','incline-geometry.mjs','local-incline.mjs','wall-scale.mjs','facet-pose.mjs','facet-view.mjs','wall-facets.mjs','automatic-surfaces.mjs','surface-model.mjs','focus-area.mjs','climber-ik.mjs','contact-labels.mjs','wall-interaction.js','pwa.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','demo-holds.json'];
const cacheable=(response,url)=>response.ok&&!response.redirected&&new URL(response.url).pathname===url.pathname;
CORE.push('moge-surface-model.mjs','rgb-face-inclines.mjs',...['detect.mjs','core.mjs','opencv-core.mjs','support.mjs','support-cleanup.mjs','lsd.mjs','lsd-wasm.mjs','lsd.wasm'].map(f=>'rgb/'+f));
CORE.push('demo-normal-frames.mjs','incline-status.mjs','detection-retry.mjs');
self.addEventListener('install',event=>event.waitUntil((async()=>{
 let cache;try{cache=await caches.open(APP);}catch{}
 if(cache)await Promise.all(CORE.map(async path=>{const url=new URL(path,self.registration.scope),response=await fetch(new Request(url,{cache:'reload'}));if(!cacheable(response,url))throw Error('Static app unavailable');await cache.put(url,response).catch(()=>{});}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{try{for(const key of await caches.keys())if(key.startsWith('crux-app-')&&key!==APP)await caches.delete(key);}catch{}await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.search&&url.search!=='?v=22')return;
 const key=new URL(url);key.search='';
 const relative=url.pathname.slice(new URL(self.registration.scope).pathname.length);
 // The MoGe adapter verifies and caches its own large chunks. Do not keep a
 // second 115 MB copy in this general static-asset cache.
 if(/^models\/moge\/.*\.bin$/.test(relative))return;
 const large=/^(models\/|vendor\/|examples\/|demo-wall\.jpg$)/.test(relative);
 if(!large&&!CORE.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
 event.respondWith((async()=>{
  // Storage is optional: Safari storage/quota errors must not block the network.
  let cache,cached;
  try{cache=await caches.open(large?ASSETS:APP);cached=await cache.match(key.href);}catch{}
  if(large&&cached)return cached;
  try{const response=await fetch(req);if(cache&&cacheable(response,url))await cache.put(key.href,response.clone()).catch(()=>{});return response;}
  catch(error){if(cached)return cached;throw error;}
 })());
});
