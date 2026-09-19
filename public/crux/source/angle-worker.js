// Classic worker for OpenCV/LSD; neural normals attach angles to fixed RGB faces.
let cache,latest,queue=Promise.resolve();
const modules=Promise.all([import('./rgb/detect.mjs?v=21'),import('./rgb-face-inclines.mjs?v=21')]);
const current=r=>latest?.id===r.id&&latest?.photo===r.photo;
function publish(request,local,partial,extra={}){
 if(!current(request))return;
 const known=local.perHold.filter(h=>h.status==='estimated'&&Number.isFinite(h.angle)).sort((a,b)=>a.angle-b.angle);
 const representative=known[Math.floor(known.length/2)]||local.facets.find(f=>f.status==='estimated'&&Number.isFinite(f.angle));
 const result=representative?{status:'estimated',angle:representative.angle,range:representative.range,confidence:representative.confidence||'low',source:'moge2-rgb-face',floorReference:local.floorReference}:
  {status:'uncertain',reason:partial?'Estimating face inclines…':'Angle unavailable; using the vertical assumption.'};
 self.postMessage({id:request.id,photo:request.photo,depthReady:true,partial,result,local:{...local,labels:undefined},...extra});
}
async function run(request){
 const {id,photo}=request,progress=message=>{if(current(request))self.postMessage({id,photo,progress:message});};
 try{
  const [{detectRgbFaces},{estimateRgbFaceInclines}]=await modules;if(!current(request))return;
  if(!cache||cache.photo!==photo||request.kind==='analyze'){
   if(!request.pixels)throw Error('Capture the wall again');
   const pixels=new Uint8ClampedArray(request.pixels);
   const geometry=await detectRgbFaces({...request,pixels},progress);
   if(!current(request))return;
   cache={photo,pixels,pixelWidth:request.width,pixelHeight:request.height,normalReference:request.normalReference,geometry};
  }
  const entry=cache;
  const fit=normalFrame=>estimateRgbFaceInclines({...entry.geometry,normalFrame,holds:request.holds||[],pixelWidth:entry.pixelWidth,pixelHeight:entry.pixelHeight,wallRoi:request.localRoi||{x:0,y:0,w:1,h:1},backgroundLabel:0});
  if(entry.normalFrame){publish(request,fit(entry.normalFrame),false,{normalStatus:'ready',normalExecution:entry.normalFrame.execution});return;}
  // First-time model download never prevents route generation.
  publish(request,fit(null),true,{geometryMs:entry.geometry.processingMs});
  if(!entry.normalPromise)entry.normalPromise=(async()=>{
   const onProgress=message=>{if(cache===entry&&latest?.photo===photo)self.postMessage({id:latest.id,photo,progress:message,anglesOnly:true});};
   if(entry.normalReference){
    try{
     const {loadDemoNormalFrame}=await import('./demo-normal-frames.mjs?v=21');
     const frame=await loadDemoNormalFrame(entry.normalReference,{width:entry.pixelWidth,height:entry.pixelHeight},onProgress);
     if(frame?.status==='ready')return frame;
    }catch{/* A missing saved example can still use live inference. */}
   }
   const {inferMoGeSurfaceFrame}=await import('./moge-surface-model.mjs?v=21');
   return inferMoGeSurfaceFrame({pixels:entry.pixels,width:entry.pixelWidth,height:entry.pixelHeight,photo},onProgress);
  })().catch(error=>({status:'unavailable',code:'incline-model-failed',reason:String(error.message||error)})).then(frame=>{
   // Preserve successful frames only. A download/device failure must be retryable
   // for this same photo while retaining the already detected RGB faces.
   if(frame.status!=='ready')entry.normalPromise=undefined;
   return frame;
  });
  // Leave the queue free for a new photo/focus while a model load is pending.
  entry.normalPromise.then(frame=>{
   if(frame.status==='ready')entry.normalFrame=frame;
   if(current(request))publish(request,fit(frame.status==='ready'?frame:null),false,{normalStatus:frame.status,normalCode:frame.code,normalReason:frame.reason,normalExecution:frame.execution,normalTimings:frame.timings});
  }).catch(error=>{if(current(request))publish(request,fit(null),false,{normalStatus:'unavailable',normalCode:'incline-fit-failed',normalReason:String(error.message||error),error:String(error.message||error)});});
 }catch(error){
  if(current(request))self.postMessage({id,photo,result:{status:'uncertain',reason:'Wall geometry unavailable on this device.'},error:String(error.message||error)});
 }
}
self.onmessage=({data})=>{latest=data;queue=queue.then(()=>run(data));};
