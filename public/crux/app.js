import {createImageStatus} from './image-status.mjs?v=21';
import {demoNormalKey} from './demo-normal-frames.mjs?v=21';
import {inclineFailureMessage} from './incline-status.mjs?v=21';
import {retryDetection} from './detection-retry.mjs?v=21';
import {createLiveScan,identifyHoldBoxes} from './scan-progress.mjs?v=21';
import {climberProfile} from './climber-profile.mjs?v=21';
import {attachFocusEditor,defaultFocusArea,insideFocus} from './focus-area.mjs?v=21';
import {facetRegions,facetOverlay,createScanReveal} from './facet-view.mjs?v=21';
import {estimateWallSpan,scaleFromSpan} from './wall-scale.mjs?v=21';
import {assignHoldColors,nearestPaintGroup} from './hold-colors.mjs?v=21';
import {createClimberOverlay} from './climber-ik.mjs?v=21';
import {setupInstall} from './pwa.js?v=21';
import {placeContacts,visibleBox} from './contact-labels.mjs?v=21';
import {attachWallZoom} from './wall-interaction.js?v=21';
import {clamp} from './engine.js?v=21';
import {wallOverlay,paintProblem,problemIds,roleForHold,markerLabels,problemColors} from './problem-view.js?v=21';
const $ = id=>document.getElementById(id);
const state={mode:'create',resultTarget:null,updating:false,holds:[],routes:[],selected:0,selectedHolds:[],style:'balanced',edit:false,overlay:true,activeHold:null,demo:false,photo:null,busy:false,seed:Date.now(),imageToken:0,example:null,focus:null,focusPicking:false,focusDraft:null,angleMode:'auto',angleEstimate:null,gradeProblem:null,planning:false,planError:null,betaMode:false,betaIndex:0,climberMode:true,showAll:false,scanReveal:false,hasProblem:false,localInclines:null,scaleMode:'auto',photoHeight:4,baseAngle:0,scaleSpan:null,scaleGuides:false};
const colors={red:'#e95952',orange:'#eb984e',yellow:'#e3c82c',green:'#44ba6c',blue:'#4e90df',purple:'#9363bc',pink:'#ee80b2',white:'#eeeae2',black:'#414640',cyan:'#6cbbbb',gray:'#92999d'};
state.palette=[];state.facetMode=false;state.scanPhase='idle';state.anglePending=false;state.inclinePending=false;state.inclineFailure=null;state.inclineExecution=null;state.normalReference=null;state.scanPending=false;state.liveScan={active:false};
const colorLabel=id=>state.palette.find(p=>p.id===id)?.label||id;
const colorSwatch=id=>state.palette.find(p=>p.id===id)?.hex||colors[id]||'#888';
const sourceCanvas=document.createElement('canvas'),sourceContext=sourceCanvas.getContext('2d',{willReadFrequently:true});
const geometryCanvas=document.createElement('canvas'),geometryContext=geometryCanvas.getContext('2d',{willReadFrequently:true});
let angleWorker,angleTimer,angleJob=0,angleDepthReady=false;
let geometryCrop={x:0,y:0,w:1,h:1};
let worker,stream,toastTimer,detectorPending,regenerateTimer,planWorker,planPending,planTimer,planId=0,betaTimer,wallZoom,climberPreview,focusEditor,outlinePending,scanJob=0;
const previewModels=new WeakMap();
const scanReveal=createScanReveal(phase=>{state.scanPhase=phase;state.scanReveal=phase==='holds';renderScanReveal();},{reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches});
const liveScan=createLiveScan(snapshot=>{state.liveScan=snapshot;renderScanReveal();});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),5000);}
function setup(){return {width:state.photoHeight*sourceCanvas.width/sourceCanvas.height,height:state.photoHeight,angle:state.baseAngle,...climberProfile($('body-height').value)};}
function validateSetup(){const s=setup();if(!Object.values(s).every(Number.isFinite)||s.width<1||s.width>30||s.height<1||s.height>10||s.bodyHeight<1.2||s.bodyHeight>2.2)throw new Error('Check the wall height and your height.');return s;}

function updateSlider(el){el.style.setProperty('--percent',((el.value-el.min)/(el.max-el.min)*100)+'%');}
function setTarget(value,refresh=true){$('target-grade').value=clamp(Number(value),0,12);$('target-value').textContent='V'+$('target-grade').value;updateSlider($('target-grade'));if(refresh)scheduleRegenerate();}
function setMode(mode){
 cancelPlan();state.mode=mode;state.activeHold=null;state.edit=false;state.betaMode=false;
 $('edit-button').setAttribute('aria-pressed','false');
 for(const [id,on] of [['create-tab',mode==='create'],['grade-tab',mode==='grade']]){$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',on);}
 $('create-controls').classList.toggle('hidden',mode!=='create');$('grade-controls').classList.toggle('hidden',mode!=='grade');
 $('workspace-title').closest('.workspace-heading').classList.toggle('hidden',mode==='create');
 $('generate-button').innerHTML=mode==='create'?'<span class="spark">✳</span> Shuffle problems <span>↻</span>':'<span class="spark">≈</span> Recheck problem <span>↗</span>';
 if(mode==='grade'&&!state.selectedHolds.length)selectInitialColor();render();scheduleRegenerate();
}
function activeRoute(){return state.mode==='grade'?state.gradeProblem:state.routes[state.selected]||null;}
const imageStatus=createImageStatus(({text,busy})=>{const el=$('image-status');if(text)$('image-status-text').textContent=text;el.classList.toggle('visible',!!text);el.classList.toggle('busy',busy);$('wall-stage').setAttribute('aria-busy',String(busy));});
function showPlanningIndicator(active){state.updating=active;if(active)imageStatus.start('plan','Updating climb…');else imageStatus.clear('plan');renderTargetFeedback();}

function scheduleRegenerate(){
 clearTimeout(regenerateTimer);cancelPlan();if(state.suspended||state.busy||state.scanPending||!state.photo)return;
 if(state.mode==='create'&&planningHolds().filter(h=>h.role!=='excluded').length<5||state.mode==='grade'&&state.selectedHolds.length<3){cancelPlan();state.routes=[];state.gradeProblem=null;liveScan.finish(state.liveToken);render();return;}
 showPlanningIndicator(true);regenerateTimer=setTimeout(()=>generate(false),180);
}
function invalidate(){scheduleRegenerate();}
function stopBeta(){climberPreview?.finish();clearInterval(betaTimer);betaTimer=null;$('beta-play').textContent='Play';$('beta-play').setAttribute('aria-label','Play suggested sequence');}
function visibleWallFaces(){return state.localInclines;}
function cancelScanReveal(){scanReveal.cancel();liveScan.cancel();}
function revealDetection(){
 if(state.busy||state.scanPending||state.planning)return;
 liveScan.cancel();
 render();if(!state.overlay||state.edit||state.focusPicking){cancelScanReveal();return;}
 const hasFacets=state.angleMode==='auto'&&facetRegions(visibleWallFaces(),geometryCrop).length>0;
 scanReveal.play(hasFacets);
}
function finishScanStage(){
 if(state.scanPending&&!state.busy&&!state.anglePending){state.scanPending=false;scheduleRegenerate();}
}
function finishAngleReveal(){
 liveScan.update(state.liveToken,{wallsReady:true,hasFacets:facetRegions(state.localInclines,geometryCrop).length>0});
 finishScanStage();
}
function renderFacets(){
 const geometry=visibleWallFaces(),regions=state.angleMode==='auto'?facetRegions(geometry,geometryCrop):[],shown=state.overlay&&(state.liveScan.showFacets||state.scanPhase==='facets'||state.facetMode&&state.scanPhase==='idle')&&!state.edit&&!state.focusPicking;
 $('facet-overlay').classList.toggle('hidden',!state.overlay||!regions.length);$('facet-overlay').classList.toggle('is-visible',shown);
 $('facet-toggle').setAttribute('aria-pressed',state.facetMode);$('facet-toggle').disabled=!state.photo;$('replay-scan').disabled=!state.holds.length||state.busy||state.scanPending||state.planning;
 const labeled=regions.map(r=>({...r,suppressAngleLabel:r.angle===null&&(state.anglePending||state.inclinePending||!!state.inclineFailure)}));
 const node=$('facet-overlay'),markup=facetOverlay(labeled,$('image-wrap').clientWidth||1000,$('image-wrap').clientHeight||1000,wallZoom?.scale||1);
 if(node.innerHTML!==markup)node.innerHTML=markup;

}
function renderScanReveal(){
 const live=state.liveScan,visible=live.active&&state.overlay&&!state.edit&&!state.focusPicking;
 $('image-wrap').dataset.scanPhase=visible?'live':state.scanPhase;
 $('image-wrap').dataset.scanWork=visible?live.phase:'idle';
 $('image-wrap').classList.toggle('scan-reveal',state.scanReveal||visible&&live.holdsReady);
 $('scan-overlay').classList.toggle('hidden',!visible||!live.showHolds||live.holdsReady);
 renderFacets();
}
function showScanBoxes(holds){
 $('scan-overlay').innerHTML=holds.map(h=>{const x=(h.x-h.w/2)*1000,y=(h.y-h.h/2)*1000,w=h.w*1000,ht=h.h*1000,d=Math.min(w,ht)*.27;return `<g id="scan-${h.id}"><path class="scan-candidate" d="M ${x+d} ${y} H ${x} V ${y+d} M ${x+w-d} ${y} H ${x+w} V ${y+d} M ${x} ${y+ht-d} V ${y+ht} H ${x+d} M ${x+w-d} ${y+ht} H ${x+w} V ${y+ht-d}"/></g>`;}).join('');
}
function showScanOutlines(batch){
 for(const h of batch){const node=$('scan-'+h.id);if(!node||h.fallback||!h.polygon)continue;const points=h.polygon.map(p=>`${p.x*1000},${p.y*1000}`).join(' ');node.innerHTML=`<polygon class="scan-contour" points="${points}"/>`;}
}
function cancelPlan(){stopBeta();clearTimeout(planTimer);planWorker?.terminate();planWorker=null;planId++;state.planning=false;planPending?.reject(new Error('Cancelled'));planPending=null;showPlanningIndicator(false);}
function runPlanner(request){
 cancelPlan();const id=planId;state.planning=true;state.planError=null;showPlanningIndicator(true);
 planWorker=new Worker('./problem-worker.js?v=21',{type:'module'});
 return new Promise((resolve,reject)=>{
  planPending={resolve,reject};
  const finish=(error,result)=>{if(id!==planId)return;clearTimeout(planTimer);planWorker?.terminate();planWorker=null;planPending=null;state.planning=false;showPlanningIndicator(false);error?reject(error):resolve(result);};
  planWorker.onmessage=({data})=>{if(data.id!==id)return;finish(data.error?new Error(data.error):null,data.result);};
  planWorker.onerror=()=>finish(new Error('The movement check could not run in this browser.'));
  planTimer=setTimeout(()=>finish(new Error('Movement search took too long. Try a smaller area.')),30000);
  planWorker.postMessage({...request,id});
 });
}
async function enrichHolds(boxes,id){
 const token=state.imageToken,pixels=sourceContext.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
 const fallback=()=>assignHoldColors(sourceContext.getImageData(0,0,sourceCanvas.width,sourceCanvas.height),boxes);
 return new Promise(resolve=>{
  let v,timer,finished=false;
  const done=result=>{if(finished)return;finished=true;clearTimeout(timer);v?.terminate();if(outlinePending?.id===id)outlinePending=null;if(token!==state.imageToken||id!==scanJob||state.suspended){resolve([]);return;}const grouped=result?.palette?result:fallback();state.palette=grouped.palette;resolve(makeHolds(grouped.holds));};
  outlinePending={id,cancel:()=>{if(finished)return;finished=true;clearTimeout(timer);v?.terminate();resolve([]);}};
  try{v=new Worker('./vision-worker.js?v=21',{type:'module'});timer=setTimeout(()=>done(),10000);v.onmessage=({data})=>{if(data.id!==id||id!==scanJob||token!==state.imageToken||state.suspended)return;if(data.batch){if(liveScan.isCurrent(state.liveToken))showScanOutlines(data.batch);imageStatus.start('holds',`Outlining holds… ${data.completed}/${data.total}`);return;}done(data);};v.onerror=()=>done();v.postMessage({id,pixels:pixels.data.buffer,width:pixels.width,height:pixels.height,holds:boxes},[pixels.data.buffer]);}
  catch{done();}
 });
}
function selectInitialColor(){
 const counts=new Map();for(const h of planningHolds())if(h.role!=='excluded')counts.set(h.color,(counts.get(h.color)||0)+1);
 const best=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0];state.selectedHolds=planningHolds().filter(h=>h.color===best&&h.role!=='excluded').map(h=>h.id);
}
function colorAt(h){
 const x=clamp(Math.round(h.x*sourceCanvas.width),0,sourceCanvas.width-1),y=clamp(Math.round(h.y*sourceCanvas.height),0,sourceCanvas.height-1);
 const p=sourceContext.getImageData(Math.max(0,x-2),Math.max(0,y-2),Math.min(5,sourceCanvas.width-x),Math.min(5,sourceCanvas.height-y)).data;
 let rgb=[0,0,0];for(let i=0;i<p.length;i+=4){rgb[0]+=p[i];rgb[1]+=p[i+1];rgb[2]+=p[i+2];}rgb=rgb.map(v=>v/(p.length/4)/255);
 const [r,g,b]=rgb,max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;if(d<.14)return max<.36?'black':'white';
 let hue=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;hue=(hue*60+360)%360;
 return hue<16||hue>=348?'red':hue<44?'orange':hue<72?'yellow':hue<168?'green':hue<250?'blue':hue<295?'purple':'pink';
}
function resetAngle(){
 clearTimeout(angleTimer);angleDepthReady=false;angleJob++;state.inclinePending=false;state.inclineFailure=null;state.inclineExecution=null;
 state.angleMode='auto';state.angleEstimate=null;state.localInclines=null;state.anglePending=false;state.baseAngle=0;updateAngleUI('Looking for the floor and wall…');
}
function updateAngleUI(message){if(state.anglePending||state.inclinePending)imageStatus.start('walls',message||'Detecting walls…');}
function finishWallStatus(){const n=facetRegions(state.localInclines,geometryCrop).length;imageStatus.complete('walls',state.inclineFailure?inclineFailureMessage(state.inclineFailure.code):n?`${n} wall${n===1?'':'s'} detected`:'Wall angles unavailable');}
function touchAngleTimeout(id,photo){
 clearTimeout(angleTimer);
 // This is a stall limit, not a deadline for a progressing cold download.
 angleTimer=setTimeout(()=>{if(id===angleJob&&photo===state.imageToken)angleUnavailable('incline-timeout');},75000);
}
function geometrySignature(local,angle){return JSON.stringify([angle,local?.perHold?.map(h=>[h.id,h.status,h.angle,h.normal,h.facetId])]);}
function angleUnavailable(code='incline-worker-failed'){
 const scanning=state.scanPending;
 angleJob++;
 clearTimeout(angleTimer);angleWorker?.terminate();angleWorker=null;angleDepthReady=false;state.anglePending=false;state.inclinePending=false;state.baseAngle=0;
 state.inclineFailure={code};state.inclineExecution=null;
 state.angleEstimate={status:'uncertain',reason:'Wall angle unavailable on this device. Using the vertical assumption.'};
 renderFacets();finishWallStatus();finishAngleReveal();if(!scanning)scheduleRegenerate();
}

function angleRegion(){
 const r=state.focus||{x:0,y:0,w:1,h:1};
 if(state.focus||geometryCrop.w<.99)return {x:geometryCrop.x+r.x*geometryCrop.w,y:geometryCrop.y+r.y*geometryCrop.h,w:r.w*geometryCrop.w,h:r.h*geometryCrop.h};
 const hs=planningHolds();
 if(hs.length<5)return {x:.25,y:.2,w:.5,h:.5};
 const xs=hs.map(h=>h.x).sort((a,b)=>a-b),ys=hs.map(h=>h.y).sort((a,b)=>a-b),q=(a,p)=>a[Math.floor((a.length-1)*p)];
 return {x:q(xs,.18),y:q(ys,.2),w:Math.max(.15,q(xs,.82)-q(xs,.18)),h:Math.max(.2,q(ys,.76)-q(ys,.2))};
}
function requestAngleEstimate(fresh=false){
 if(state.suspended||!state.photo||state.angleMode!=='auto')return;
 const id=++angleJob,photo=state.imageToken;clearTimeout(angleTimer);
 state.anglePending=true;state.inclineFailure=null;updateAngleUI('Estimating the wall against the floor…');renderFacets();
 try{
 if(!angleWorker){angleWorker=new Worker('./angle-worker.js?v=21');fresh=true;angleWorker.onmessage=({data})=>{
   if(data.id!==angleJob||data.photo!==state.imageToken)return;
   if(data.progress){touchAngleTimeout(data.id,data.photo);if(state.angleMode==='auto')updateAngleUI(data.progress);return;}
   if(!data.partial)clearTimeout(angleTimer);state.anglePending=false;state.inclinePending=!!data.partial;angleDepthReady=!!data.depthReady;
   if(data.partial)touchAngleTimeout(data.id,data.photo);
   state.inclineFailure=data.normalStatus==='unavailable'||data.error?{code:data.normalCode||'incline-model-failed',reason:data.normalReason||data.error}:null;
   if(!data.partial)state.inclineExecution=data.normalExecution||null;
   const previousGeometry=geometrySignature(state.localInclines,state.baseAngle);
   state.localInclines=data.local||state.localInclines;state.angleEstimate=data.result||{status:'uncertain',reason:'Wall angle unavailable; using the vertical assumption.'};
   if(state.angleMode==='auto'){
     state.baseAngle=state.angleEstimate.status==='estimated'?clamp(Math.round(state.angleEstimate.angle/5)*5,-30,75):0;
     if(!state.scanPending&&previousGeometry!==geometrySignature(state.localInclines,state.baseAngle))scheduleRegenerate();renderFacets();finishWallStatus();finishAngleReveal();
     if(data.partial)imageStatus.start('walls','Estimating face inclines…');
   }
 };const owner=angleWorker;angleWorker.onerror=()=>{if(angleWorker===owner)angleUnavailable();};}
 const r=state.focus||{x:0,y:0,w:1,h:1},localRoi={x:geometryCrop.x+r.x*geometryCrop.w,y:geometryCrop.y+r.y*geometryCrop.h,w:r.w*geometryCrop.w,h:r.h*geometryCrop.h};
 const holds=state.holds.map(h=>({id:h.id,x:geometryCrop.x+h.x*geometryCrop.w,y:geometryCrop.y+h.y*geometryCrop.h,w:h.w*geometryCrop.w,h:h.h*geometryCrop.h}));
 const request={id,photo,normalReference:state.normalReference,kind:fresh||!angleDepthReady?'analyze':'estimate',wallRoi:angleRegion(),localRoi,holds,imageAspect:geometryCanvas.width/geometryCanvas.height};
 if(request.kind==='analyze'){const pixels=geometryContext.getImageData(0,0,geometryCanvas.width,geometryCanvas.height);request.pixels=pixels.data.buffer;request.width=pixels.width;request.height=pixels.height;angleWorker.postMessage(request,[pixels.data.buffer]);}else angleWorker.postMessage(request);
 touchAngleTimeout(id,photo);
 }catch{angleUnavailable();}
}
function renderScale(){
 $('scale-guides').setAttribute('aria-pressed',state.scaleGuides);
 $('scale-guide-controls').classList.toggle('hidden',!state.scaleGuides);
 const top=Number($('scale-top').value)*10,bottom=Number($('scale-bottom').value)*10;
 $('scale-overlay').classList.toggle('hidden',!state.scaleGuides||!state.photo);
 $('scale-overlay').innerHTML=`<path d="M 35 ${top} H 965 M 35 ${bottom} H 965" stroke="#cfed76" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="45" y="${Math.min(975,top+25)}" fill="#e7ffae" stroke="#17231f" stroke-width="3" paint-order="stroke" font-size="22">Wall top</text><text x="45" y="${Math.max(25,bottom-10)}" fill="#e7ffae" stroke="#17231f" stroke-width="3" paint-order="stroke" font-size="22">Mat at wall</text>`;
}
function applyPhotoScale(){
 if(state.scaleMode!=='auto')return;
 const result=scaleFromSpan({top:Number($('scale-top').value)/100,bottom:Number($('scale-bottom').value)/100,wallHeight:Number($('wall-height-input').value),imageAspect:sourceCanvas.width/sourceCanvas.height});
 if(result&&result.width<=30&&result.height<=10)state.photoHeight=result.height;
 else state.photoHeight=Number($('wall-height-input').value);
 renderScale();
}
function refreshPhotoScale(){
 if(state.scaleMode!=='auto')return;
 if(state.demo&&!state.example){$('scale-top').value=0;$('scale-bottom').value=100;applyPhotoScale();return;}
 const pixels=sourceContext.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
 state.scaleSpan=estimateWallSpan({pixels:pixels.data,width:pixels.width,height:pixels.height,holds:state.holds});
 $('scale-top').value=state.scaleSpan.top*100;$('scale-bottom').value=state.scaleSpan.bottom*100;applyPhotoScale();
}
function inFocus(h){return insideFocus(h,state.focus);}
function planningHolds(){const local=new Map((state.angleMode==='auto'?state.localInclines?.perHold||[]:[]).map(p=>[p.id,p]));return state.holds.filter(inFocus).map(h=>{const p=local.get(h.id);return {...h,incline:p?.status==='estimated'?{angle:p.angle,confidence:p.confidence,source:p.source,normal:p.normal}:null};});}
function makeHolds(boxes){return [...boxes].sort((a,b)=>b.y-a.y||a.x-b.x).map((h,i)=>({...h,id:h.id||'h'+(i+1),color:h.color||h.appearance?.dominantColor?.name||colorAt(h),grip:'unknown',role:'normal'}));}
async function loadPhoto(src,{demo=false,crop=null,example=null}={}){
 if(state.busy){if(src.startsWith('blob:'))URL.revokeObjectURL(src);notify('Wait for the current scan to finish.');return;}
 clearTimeout(regenerateTimer);cancelPlan();imageStatus.reset();const token=++state.imageToken;const img=new Image();img.src=src;
 try{await img.decode();if(token!==state.imageToken)return;const c=crop||[0,0,img.naturalWidth,img.naturalHeight],scale=Math.min(1,1600/Math.max(c[2],c[3]));const gs=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight),Math.sqrt(2100000/(img.naturalWidth*img.naturalHeight)));geometryCanvas.width=Math.round(img.naturalWidth*gs);geometryCanvas.height=Math.round(img.naturalHeight*gs);geometryContext.drawImage(img,0,0,geometryCanvas.width,geometryCanvas.height);geometryCrop={x:c[0]/img.naturalWidth,y:c[1]/img.naturalHeight,w:c[2]/img.naturalWidth,h:c[3]/img.naturalHeight};resetAngle();sourceCanvas.width=Math.round(c[2]*scale);sourceCanvas.height=Math.round(c[3]*scale);sourceContext.drawImage(img,...c,0,0,sourceCanvas.width,sourceCanvas.height);wallZoom?.reset();cancelScanReveal();scanJob++;outlinePending?.cancel();outlinePending=null;state.scanPending=false;state.hasProblem=false;state.scanReveal=false;state.localInclines=null;state.photo=sourceCanvas.toDataURL('image/jpeg',.9);$('wall-image').src=state.photo;await $('wall-image').decode();if(token!==state.imageToken)return;state.demo=demo;state.example=example;state.normalReference=demo?demoNormalKey(src,new URL('./',location.href)):null;state.scaleMode='auto';state.scaleSpan=null;state.scaleGuides=false;$('wall-height-input').value=demo&&!example?3:4;$('scale-top').value=0;$('scale-bottom').value=100;state.photoHeight=demo&&!example?3:4;state.focus=null;state.focusPicking=false;state.focusDraft=null;state.holds=[];state.palette=[];state.routes=[];state.gradeProblem=null;state.planError=null;state.betaMode=false;state.selectedHolds=[];state.activeHold=null;state.edit=false;$('edit-button').setAttribute('aria-pressed','false');$('wall-placeholder').classList.add('hidden');$('image-wrap').classList.remove('hidden');render();
 if(demo&&!example){try{const res=await fetch('./demo-holds.json');if(!res.ok)throw Error();const boxes=await res.json();if(token!==state.imageToken)return;await detect(boxes);return;}catch{}}
 if(token!==state.imageToken)return;await detect();
 }catch(e){notify('Could not open this image. Try a JPEG, PNG or WebP photo.');}finally{if(src.startsWith('blob:'))URL.revokeObjectURL(src);}
}
async function readFile(file){if(!file)return;if(file.size>30*1024*1024){notify('Choose a photo smaller than 30 MB.');return;}if(file.type&&!file.type.startsWith('image/')){notify('Choose an image file.');return;}await loadPhoto(URL.createObjectURL(file));}
function setBusy(b){state.busy=b;['generate-button','detect-button','upload-button','demo-button','camera-button','edit-button'].forEach(id=>$(id).disabled=b);if(b)imageStatus.start('holds','Finding holds…');else imageStatus.clear('holds');document.querySelectorAll('[data-wall-example]').forEach(x=>x.disabled=b);}
async function detect(cachedBoxes=null){
 if(state.suspended)return;
 if(!state.photo){notify('Add a wall photo first.');return;}if(state.busy)return;
 clearTimeout(regenerateTimer);cancelPlan();cancelScanReveal();outlinePending?.cancel();outlinePending=null;
 const job=++scanJob,photo=state.imageToken,current=()=>job===scanJob&&photo===state.imageToken&&!state.suspended;
 // Invalidate any older geometry request before accepting new hold locations.
 if(state.anglePending)resetAngle();else {angleJob++;clearTimeout(angleTimer);}
 state.localInclines=null;state.scanPending=true;state.routes=[];state.gradeProblem=null;state.selectedHolds=[];state.holds=[];state.hasProblem=false;state.betaMode=false;state.activeHold=null;state.planError=null;state.edit=false;$('edit-button').setAttribute('aria-pressed','false');
 imageStatus.reset();setBusy(true);state.liveToken=liveScan.begin();$('scan-overlay').innerHTML='';render();
 let receivedBoxes=false;state.detectionFailure=null;
 try{
 let boxes=cachedBoxes;
 if(!boxes){
  boxes=await retryDetection(async()=>{
  if(!worker)worker=new Worker('./detector-worker.js?v=21',{type:'module'});
  const owner=worker;
  const pixels=sourceContext.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{owner.terminate();if(worker===owner){worker=null;detectorPending=null;}reject(Error('The model took too long on this device.'));},90000);
   detectorPending={reject,timer};
   owner.onmessage=({data})=>{if(worker!==owner||data.id!==job||!current())return;if(data.status){imageStatus.start('holds',data.status);return;}clearTimeout(timer);detectorPending=null;if(data.error)reject(Object.assign(Error(data.error),{retryable:true}));else resolve(data.boxes);};
   owner.onerror=e=>{if(worker!==owner)return;clearTimeout(timer);detectorPending=null;reject(Object.assign(Error(e.message||'The hold model could not run on this browser.'),{retryable:true}));};
   owner.postMessage({id:job,pixels:pixels.data.buffer,width:pixels.width,height:pixels.height},[pixels.data.buffer]);
  });
  },{isCurrent:current,onRetry:()=>{worker?.terminate();worker=null;if(detectorPending)clearTimeout(detectorPending.timer);detectorPending=null;imageStatus.start('holds','Retrying hold detection…');}});
 }
 if(!current())return;
 // Stable IDs are assigned once. Wall fitting needs boxes, so it can overlap
 // contour extraction without waiting for global paint grouping to complete.
 const identified=identifyHoldBoxes(boxes);state.holds=makeHolds(identified);receivedBoxes=true;showScanBoxes(state.holds);liveScan.update(state.liveToken,{boxesReady:true});
 imageStatus.start('holds','Outlining holds…');requestAngleEstimate(!angleDepthReady);
 const holds=await enrichHolds(identified,job);if(!current())return;
 state.holds=holds;refreshPhotoScale();if(state.mode==='grade')selectInitialColor();
 liveScan.update(state.liveToken,{holdsReady:true});render();
 if(boxes.length<5){state.edit=true;$('edit-button').setAttribute('aria-pressed','true');cancelScanReveal();render();notify('Few holds found. Use Edit holds and tap missing holds to add them.');}
 }catch(e){if(!current()||e.message==='Suspended')return;state.detectionFailure=String(e.message);console.warn('Hold detector:',e.message);worker?.terminate();worker=null;state.edit=true;cancelScanReveal();$('edit-button').setAttribute('aria-pressed','true');render();notify('Hold detection did not finish. Tap Find holds to retry.');}
 finally{if(current()){setBusy(false);if(!receivedBoxes)state.scanPending=false;finishScanStage();renderScanReveal();}}
}
async function generate(showToast=true){
 clearTimeout(regenerateTimer);cancelPlan();if(state.suspended||state.busy||state.scanPending||!state.photo)return;
 const token=state.imageToken,mode=state.mode;
 try{
  const configuration=validateSetup(),target=Number($('target-grade').value),holds=mode==='grade'?planningHolds().filter(h=>state.selectedHolds.includes(h.id)&&h.role!=='excluded'):planningHolds();
  if(holds.length<(mode==='grade'?3:5))throw Error('Not enough holds in this area.');
  // Keep the previous overlay visible while the replacement is computed.
  state.betaMode=false;state.betaIndex=0;
  const promise=runPlanner({kind:mode==='grade'?'analyze':'generate',holds,setup:configuration,target,style:state.style,seed:++state.seed});
  const job=planId;render();
  const result=await promise;if(job!==planId||token!==state.imageToken||mode!==state.mode)return;
  for(const p of mode==='grade'?[result]:result)if(p)previewModels.set(p,{setup:configuration,holds,visual:{imageAspect:sourceCanvas.width/sourceCanvas.height,fullAspect:geometryCanvas.width/geometryCanvas.height,crop:{...geometryCrop},floorNormal:state.localInclines?.floorReference?.normal,patches:state.localInclines?.patches||[],angleMode:state.angleMode,angle:configuration.angle}});
  if(mode==='grade')state.gradeProblem=result;else {state.routes=result;state.resultTarget=target;state.selected=0;}if(activeRoute())state.hasProblem=true;
  if(mode==='create'&&!state.routes.length)state.planError='No supported problem found in this area. Try another face or adjust the optional scale settings.';
  liveScan.finish(state.liveToken);render();
  if(showToast)notify(mode==='grade'?'Problem checked. Compare the estimate with a real climb.':state.routes.length?`${state.routes.length} problems ready. Use only the highlighted holds.`:state.planError);
 }catch(error){if(error.message==='Cancelled')return;state.routes=[];state.gradeProblem=null;state.planning=false;showPlanningIndicator(false);state.planError=error.message;liveScan.finish(state.liveToken);render();if(showToast)notify(error.message);}
}
function render(){
 const problem=activeRoute();if(problem)state.hasProblem=true;const ids=problem?problemIds(problem):new Set(state.mode==='grade'?state.selectedHolds:[]);
 $('hold-layer').classList.toggle('hidden',!state.overlay);$('route-overlay').classList.toggle('hidden',!state.overlay);
 $('image-wrap').classList.toggle('edit-mode',state.edit);$('image-wrap').classList.toggle('problem-visible',state.overlay&&(state.hasProblem||ids.size>0));
 $('image-wrap').classList.toggle('all-detected',state.showAll);$('image-wrap').classList.toggle('scan-reveal',state.scanReveal);$('all-holds').setAttribute('aria-pressed',state.showAll);$('contact-links').classList.toggle('hidden',!state.overlay);$('contact-labels').classList.toggle('hidden',!state.overlay);
 $('hold-layer').innerHTML=state.holds.map(h=>{const b=visibleBox(h);return `<button class="hold-hit ${state.edit?'editable':''} ${ids.has(h.id)?'allowed':''}" data-hold="${h.id}" style="left:${Math.max(0,b.x)*100}%;top:${Math.max(0,b.y)*100}%;width:${b.w*100}%;height:${b.h*100}%" aria-label="${esc(colorLabel(h.color))} hold ${h.id.slice(1)}${ids.has(h.id)?', '+(roleForHold(problem,h.id)||'selected'):''}" title="${esc(colorLabel(h.color))} · ${h.appearance?.apparentSize||'size uncertain'}${roleForHold(problem,h.id)?' · '+roleForHold(problem,h.id):''}"></button>`;}).join('');
 $('focus-preview').innerHTML=state.focusPicking?wallOverlay({photo:state.photo,holds:state.holds,problem:null,selectedIds:state.holds.filter(h=>h.role!=='excluded').map(h=>h.id),showLabels:false,clipId:'focus-holds'}):'';
 $('route-overlay').innerHTML=wallOverlay({photo:state.photo,holds:state.holds,problem,selectedIds:state.mode==='grade'?state.selectedHolds:[],editing:state.edit,activeId:state.activeHold,betaIndex:state.betaMode?state.betaIndex:null,showLabels:false});
 requestAnimationFrame(layoutContactMarkers);
 const uncertain=state.holds.filter(h=>h.fallback||!h.polygon).length;$('detection-note').textContent=uncertain?`${uncertain} dashed boxes = detected holds with uncertain outlines. All detected holds shows the full scan.`:'Outlines show the detected surfaces. All detected holds shows the full scan.';
 $('wall-hint').textContent=state.edit?'Optional corrections · tap a hold, or add a missing hold.':problem?'Choose your own sequence through the allowed holds.':'Choose a wall or add your own photo.';
 document.querySelectorAll('[data-wall-example]').forEach(b=>b.setAttribute('aria-pressed',state.demo&&(state.example||'original')===b.dataset.wallExample));
 renderColors();renderResults(problem);renderInspector();renderFocus();renderScale();renderBeta(problem);renderScanReveal();
}
function layoutContactMarkers(){
 renderFacets();
 const problem=activeRoute(),w=$('image-wrap').clientWidth,h=$('image-wrap').clientHeight;if(!w||!h)return;
 const positions=placeContacts(state.holds,markerLabels(problem,state.betaMode?state.betaIndex:null),w,h,wallZoom?.scale||1);
 $('contact-labels').innerHTML=positions.map(p=>`<span class="contact-tag" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;font-size:${p.font}px;--tag-color:${problemColors[roleForHold(problem,p.id)]||problemColors.foot}">${p.text}</span>`).join('');
 $('contact-links').setAttribute('viewBox',`0 0 ${w} ${h}`);$('contact-links').innerHTML=positions.map(p=>`<path d="M ${p.lx} ${p.ly} L ${p.tx} ${p.ty}" fill="none" stroke="${problemColors[roleForHold(problem,p.id)]||problemColors.foot}" stroke-width="${1.4/(wallZoom?.scale||1)}"/><circle cx="${p.tx}" cy="${p.ty}" r="${2.2/(wallZoom?.scale||1)}" fill="${problemColors[roleForHold(problem,p.id)]||problemColors.foot}"/>`).join('');
}
function renderBeta(problem){
 const available=!!problem?.beta?.length;
 $('beta-toggle').disabled=!available;$('beta-toggle').setAttribute('aria-pressed',state.betaMode);$('beta-toggle').textContent=state.betaMode?'Hide climb preview':'Climb preview';
 $('beta-controls').classList.toggle('hidden',!available||!state.betaMode);
 $('climber-toggle').setAttribute('aria-pressed',state.climberMode);
 const model=previewModels.get(problem);
 climberPreview?.update({visible:available&&state.betaMode&&state.climberMode&&state.overlay&&!state.edit&&!state.focusPicking,problem,index:state.betaIndex,holds:model?.holds||state.holds,setup:model?.setup||setup(),visual:model?.visual||{}});
 if(!state.climberMode||!available||!state.betaMode)$('climber-pose-note').classList.add('hidden');
 if(!available||!state.betaMode)return;
 state.betaIndex=clamp(state.betaIndex,0,problem.beta.length-1);const step=problem.beta[state.betaIndex];
 $('beta-description').textContent=state.betaIndex===0?'Start: place both hands and both feet on their marked holds.':state.betaIndex===problem.beta.length-1?'Finish: both hands matched on TOP.':`Step ${state.betaIndex} of ${problem.beta.length-1} · Move your ${{lh:'left hand',rh:'right hand',lf:'left foot',rf:'right foot'}[step.move?.limb]||'next contact'}.`;
 $('beta-prev').disabled=state.betaIndex===0;$('beta-next').disabled=state.betaIndex===problem.beta.length-1;
}
const examples={
 original:{name:'THE ORIGINAL',src:'./demo-wall.jpg',crop:[1000,710,1150,1410],label:'Straight wall',note:'The original demo'},
 cave:{name:'THE CAVE',src:'./examples/cave.png',label:'The cave',note:'Roof + multiple faces'},
 overhang:{name:'THE OVERHANG',src:'./examples/overhang.png',label:'The overhang',note:'Angled faces + floor'}
};
function chooseExample(){dialog(`<p class="eyebrow">MORE WALLS TO EXPLORE</p><h2>Pick a wall.</h2><div class="example-grid">${Object.entries(examples).map(([key,e])=>`<button class="example-card" data-example="${key}"><img src="${e.src}" alt="${e.label}"><strong>${e.label}</strong><span>${e.note}</span></button>`).join('')}</div><p class="small">For a wall with several faces, choose a focus area to keep a suggested line on one face.</p>`);$('info-content').querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{$('info-dialog').close();const key=b.dataset.example,e=examples[key];loadPhoto(e.src,{demo:true,crop:e.crop||null,example:key==='original'?null:key});});}
function focusCandidates(){return state.holds.filter(h=>h.role!=='excluded'&&insideFocus(h,state.focusDraft));}
function renderFocus(){
 const r=state.focusPicking?state.focusDraft:state.focus,editing=state.focusPicking;
 $('focus-button').disabled=!state.photo||state.busy;
 $('focus-button').setAttribute('aria-pressed',editing||!!r);
 $('focus-button').textContent=editing?'Cancel':'Limit area';
 $('focus-apply').classList.toggle('hidden',!editing);
 $('focus-clear').classList.toggle('hidden',!state.focus);
 $('focus-preview').classList.toggle('hidden',!editing);
 focusEditor?.render(editing?r:null);
 $('focus-overlay').innerHTML=r?`<path d="M0 0H1000V1000H0Z M${r.x*1000} ${r.y*1000}v${r.h*1000}h${r.w*1000}v${-r.h*1000}Z" fill="#111b15" fill-opacity="${editing ? .3 : 0}" fill-rule="evenodd"/><rect x="${r.x*1000}" y="${r.y*1000}" width="${r.w*1000}" height="${r.h*1000}" fill="none" stroke="#d4ef75" stroke-width="2" ${editing?'':'stroke-dasharray="7 4"'} vector-effect="non-scaling-stroke"/>`:'';
 const count=editing?focusCandidates().length:planningHolds().filter(h=>h.role!=='excluded').length;
 $('focus-apply').disabled=count<(state.mode==='create'?5:3);
 $('focus-help').classList.toggle('hidden',!editing);$('focus-help').textContent=editing?`${count} holds · Drag inside to move; edges to resize. ${count<(state.mode==='create'?5:3)?'Include more holds.':''}`:'';
 $('image-wrap').classList.toggle('choosing-focus',editing);
 if(editing){
  const included=new Set(focusCandidates().map(h=>h.id));
  $('focus-preview').querySelectorAll('[data-focus-hold]').forEach(p=>{p.style.display=included.has(p.dataset.focusHold)?'':'none';});
  $('wall-hint').textContent='Highlighted holds are inside your area.';
 }else if(r)$('wall-hint').textContent=`Focus area · ${count} holds`;
}
function cancelFocus(){state.focusPicking=false;state.focusDraft=null;render();}
function applyFocus(){
 if(!state.focusPicking||$('focus-apply').disabled)return;
 state.focus={...state.focusDraft};state.focusPicking=false;state.focusDraft=null;
 state.selectedHolds=state.selectedHolds.filter(id=>inFocus(state.holds.find(h=>h.id===id)));
 render();invalidate();requestAngleEstimate();
}
function renderColors(){
 const names=[...new Set(planningHolds().map(h=>h.color))],selected=new Set(state.selectedHolds.map(id=>state.holds.find(h=>h.id===id)?.color));
 $('color-picker').innerHTML=names.map(c=>`<button style="--hold-color:${colorSwatch(c)}" data-color="${c}" class="${selected.size===1&&selected.has(c)?'selected':''}" aria-label="Select ${esc(colorLabel(c))} route" aria-pressed="${selected.size===1&&selected.has(c)}"><i></i>${esc(colorLabel(c))} <small>${planningHolds().filter(h=>h.color===c&&h.role!=='excluded').length}</small></button>`).join('')||'<p class="small muted">Add a wall to see its colors.</p>';
}
function renderTargetFeedback(){
 const node=$('target-feedback'),requested=Number($('target-grade').value);
 const visible=state.mode==='create'&&(state.updating||state.routes.length>0);
 node.classList.toggle('hidden',!visible);if(!visible){node.textContent='';return;}
 if(state.updating){node.classList.remove('target-missed');node.innerHTML=`<strong>Searching for V${requested}…</strong><span>${state.routes.length?'Updating…':''}</span>`;return;}
 const target=state.resultTarget,closest=state.routes.reduce((a,b)=>Math.abs(b.estimate.grade-target)<Math.abs(a.estimate.grade-target)?b:a),matched=state.routes.some(r=>r.estimate.grade===target);
 node.classList.toggle('target-missed',!matched);
 node.innerHTML=matched?`<strong>Requested V${target} · Matching estimate found</strong>`:`<strong>Closest found ≈ V${closest.estimate.grade}</strong><span>Requested V${target} · No matching estimate found in this search.</span>`;
}
function targetTag(problem){
 if(state.resultTarget===null)return '';
 const difference=problem.estimate.grade-state.resultTarget;
 return `<span class="target-tag ${difference?'target-tag-missed':''}">${difference>0?'Above':difference<0?'Below':'At'} requested V${state.resultTarget}</span>`;
}
function renderResults(problem){
 renderTargetFeedback();
 const empty=state.planning?'<div class="empty-result planning-result"><span>✳</span><h3>Setting the problem…</h3><p>Checking starts, foot support and the finish.</p></div>':`<div class="empty-result"><span>↗</span><h3>${state.photo?'No problem selected.':'Your wall is the starting point.'}</h3><p>${esc(state.planError||'Choose a wall. The app prepares holds and problems automatically.')}</p></div>`;
 if(state.mode==='grade'){
  const e=problem?.estimate;
  $('route-results').innerHTML=problem?`<div class="grade-result"><p class="eyebrow">PROVISIONAL PHOTO ESTIMATE</p><div class="grade-big" aria-label="Estimated grade V${e.grade}"><small>≈</small> V${e.grade}</div><div class="grade-range">Rough range <strong>V${e.low}–V${e.high}</strong></div><span>${problem.handIds.length} route holds · photo estimate</span><p>${problem.beta.length?'A candidate hand-and-foot sequence was found within the approximate reach limits.':'No supported sequence was found with the current photo geometry. This grade is a weak visual estimate.'}</p></div>`:empty;
 }else $('route-results').innerHTML=state.routes.length?state.routes.map((r,i)=>`<button class="route-card ${i===state.selected?'chosen':''}" data-route="${i}" aria-pressed="${i===state.selected}"><div class="route-card-top"><span class="route-index">PROBLEM 0${i+1}</span><span class="grade-pill" aria-label="Estimated grade V${r.estimate.grade}">≈ V${r.estimate.grade}</span></div><span class="problem-estimate-center">Rough range V${r.estimate.low}–V${r.estimate.high}</span>${targetTag(r)}<span class="route-title">${esc(r.name)}</span><span class="route-meta">${r.handIds.length} hands + ${r.footIds.length} feet-only</span></button>`).join(''):empty;
 $('route-detail').classList.toggle('hidden',!problem);if(!problem)return;
 const e=problem.estimate,start=problem.start,hands=start?.hands||[],feet=start?.feet||[],match=hands[0]===hands[1];
 $('route-detail').innerHTML=`<div class="route-detail"><div class="problem-rule"><b>Hands</b><span>Orange holds, green starts and the white finish.</span></div><div class="problem-rule"><b>Feet</b><span>Any handhold plus the blue footholds. Other holds are off.</span></div><div class="problem-rule"><b>Start</b><span>${hands.length===2?(match?'Both hands on 2H.':'One hand on each LH / RH start.'):'Start position could not be established.'} ${feet.length===2?(feet[0]===feet[1]?'Both feet share 2F, off the ground.':'Begin with feet on LF / RF, off the ground.'):''}</span></div><div class="problem-rule"><b>Finish</b><span>Both hands on TOP, under control.</span></div><div class="detail-stat"><span>Estimated range</span><b>V${e.low}–V${e.high}</b></div><div class="detail-stat"><span>Largest modeled hand move</span><b>${problem.beta.length&&Number.isFinite(e.maxMove)?'~'+e.maxMove.toFixed(2)+' m':'Not established'}</b></div><div class="detail-stat"><span>Modeled contact changes</span><b>${problem.beta.length?problem.beta.length-1:'Not established'}</b></div><div class="detail-stat"><span>Geometry check</span><b>${problem.beta.length?'Candidate beta found':'Unverified'}</b></div>${e.personal?`<div class="personal-stat"><strong>For your height · ${Math.round(e.personal.bodyHeight*100)} cm</strong><br>${e.personal.effortEquivalent!==null&&Number.isFinite(e.personal.effortEquivalent)?`Height-adjusted effort ≈ V${Math.round(e.personal.effortEquivalent)}. Reach and cramped positions are considered.`:e.personal.feasible?"A height-specific movement candidate was found.":"No movement candidate fits this height in the current model."}</div>`:""}${e.incline?.localCount?`<div class="detail-stat"><span>Local inclines used</span><b>${e.incline.localRange[0]}° to ${e.incline.localRange[1]}° · ${e.incline.localCount}/${e.incline.total} holds</b></div>`:""}<div class="detail-actions"><button id="export-route">↓ Save problem</button><button id="check-grade">Test the grade ↗</button></div></div>`;
 $('export-route').onclick=exportRoute;$('check-grade').onclick=openFeedback;
}
function renderInspector(){const h=state.edit?state.holds.find(h=>h.id===state.activeHold):null;$('hold-inspector').classList.toggle('hidden',!h);if(!h)return;$('hold-inspector').innerHTML=`<strong>Optional hold correction</strong><p class="hold-auto-note">${esc(h.appearance?.shape||'Shape uncertain')} · ${esc(h.appearance?.apparentSize||'apparent size uncertain')} · grip depth is not visible</p><label>Grip override<select id="hold-grip">${['unknown','jug','edge','crimp','sloper','pinch','pocket'].map(x=>`<option ${x===h.grip?'selected':''}>${x==='unknown'?'Auto · visual cues':x}</option>`).join('')}</select></label><label>Color<select id="hold-color">${[...state.palette.map(p=>p.id),...Object.keys(colors)].map(x=>`<option value="${x}" ${x===h.color?'selected':''}>${esc(colorLabel(x))}</option>`).join('')}</select></label><label>Use<select id="hold-role">${[['normal','Available'],['start','Start here'],['finish','Finish here'],['excluded','Exclude']].map(([v,label])=>`<option value="${v}" ${v===h.role?'selected':''}>${label}</option>`).join('')}</select></label><button id="remove-hold" aria-label="Delete selected hold">Delete</button><button id="close-inspector" aria-label="Close hold details">×</button>`;
 $('hold-grip').options[0].value='unknown';$('hold-grip').value=h.grip;
 $('hold-grip').onchange=e=>{h.grip=e.target.value;invalidate();};$('hold-color').onchange=e=>{h.color=e.target.value;invalidate();};$('hold-role').onchange=e=>{if(e.target.value==='start'&&state.holds.filter(x=>x.id!==h.id&&x.role==='start').length>=2){notify('Use one matched start or two separate start handholds.');e.target.value=h.role;return;}if(e.target.value==='finish')state.holds.forEach(x=>{if(x.role==='finish')x.role='normal';});h.role=e.target.value;if(h.role==='excluded')state.selectedHolds=state.selectedHolds.filter(id=>id!==h.id);invalidate();};$('remove-hold').onclick=()=>{state.holds=state.holds.filter(x=>x.id!==h.id);state.selectedHolds=state.selectedHolds.filter(id=>id!==h.id);state.activeHold=null;invalidate();};$('close-inspector').onclick=()=>{state.activeHold=null;renderInspector();};}
function selectHold(id){
 const h=state.holds.find(h=>h.id===id);if(!h)return;
 if(state.mode==='grade'&&!state.edit){
  if(!inFocus(h)||h.role==='excluded')return;
  state.selectedHolds=state.selectedHolds.includes(id)?state.selectedHolds.filter(x=>x!==id):[...state.selectedHolds,id];state.gradeProblem=null;scheduleRegenerate();
 }else if(state.edit)state.activeHold=state.activeHold===id?null:id;
 else {const role=roleForHold(activeRoute(),id);notify(role==='foot'?'Blue holds are feet only.':role?'This hold is allowed for hands and feet.':'This hold is outside the selected problem.');return;}
 render();
}
function history(){try{const parsed=JSON.parse(localStorage.getItem('crux-checks-v1')||'[]');return Array.isArray(parsed)?parsed.filter(x=>Number.isFinite(x.actual)&&Number.isFinite(x.predicted)).slice(-100):[];}catch{return [];}}
function updateHistory(){$('history-count').textContent=history().length;}
function dialog(html){$('info-content').innerHTML=html;$('info-dialog').showModal();}
function openFeedback(){const route=activeRoute();if(!route)return;const snapshot={...route,estimate:{...route.estimate}};dialog(`<p class="eyebrow">THE REAL-WORLD CHECK</p><h2>How did it climb?</h2><p>Our estimate: <b>V${snapshot.estimate.low}–V${snapshot.estimate.high}</b> (central estimate ≈ V${snapshot.estimate.grade}). Add the gym grade or your own assessment to measure how far off it was.</p><form id="feedback-form"><label class="form-label">Grade to compare<select id="actual-grade">${Array.from({length:13},(_,i)=>`<option value="${i}" ${i===snapshot.estimate.grade?'selected':''}>V${i}</option>`).join('')}</select></label><label class="form-label">Source<select id="grade-source"><option>Gym / setter grade</option><option>My grade after climbing</option></select></label><label class="form-label">Gym color / note (optional)<input id="gym-note" type="text" maxlength="80" placeholder="e.g. purple circuit"></label><p class="small">Checks are saved only in this browser. They measure errors; they do not train the detector or calibrate the grades.</p><button class="primary" type="submit">Save grade check</button></form>`);
 $('feedback-form').onsubmit=e=>{e.preventDefault();const actual=Number($('actual-grade').value),items=history(),entry={date:new Date().toISOString(),predicted:snapshot.estimate.grade,actual,source:$('grade-source').value,note:$('gym-note').value.trim(),demo:state.demo};try{localStorage.setItem('crux-checks-v1',JSON.stringify([...items,entry].slice(-100)));$('info-dialog').close();updateHistory();notify(`Saved. Estimate was ${Math.abs(actual-entry.predicted)} V grade${Math.abs(actual-entry.predicted)===1?'':'s'} away.`);}catch{notify('Browser storage is unavailable. Your check could not be saved.');}};
}
function showHistory(){const rows=history(),real=rows.filter(x=>!x.demo),mean=real.length?real.reduce((s,x)=>s+Math.abs(x.actual-x.predicted),0)/real.length:null;dialog(`<p class="eyebrow">YOUR FIELD NOTES</p><h2>Grade checks</h2><div class="feedback-summary">${mean===null?'No checks on your own walls yet.':`${real.length} personal check${real.length===1?'':'s'} · average error <b>${mean.toFixed(1)} V grades</b>.`}<br><small>Demo checks are excluded from the average.</small></div>${rows.length?rows.slice().reverse().map(x=>`<div class="history-row"><div>${esc(x.note||x.source)}${x.demo?' · demo':''}<small>${new Date(x.date).toLocaleDateString()}</small></div><div>Estimate V${x.predicted} → V${x.actual}</div></div>`).join(''):'<p>After choosing a climb, tap “Test the grade” to record the gym rating or your own grade.</p>'}${rows.length?'<button class="text-button" id="clear-history">Clear local checks</button>':''}<p class="small">These checks are personal observations, not a validation study.</p>`);if(rows.length)$('clear-history').onclick=()=>{dialog(`<h2>Clear your grade checks?</h2><p>This removes ${rows.length} locally saved checks from this browser.</p><button class="primary" id="confirm-clear">Clear checks</button>`);$('confirm-clear').onclick=()=>{try{localStorage.removeItem('crux-checks-v1');updateHistory();$('info-dialog').close();notify('Grade checks cleared.');}catch{notify('Could not access browser storage.');}};};}
function exportRoute(){
 const problem=activeRoute();if(!problem)return;
 const canvas=document.createElement('canvas');canvas.width=sourceCanvas.width;canvas.height=sourceCanvas.height+164;const ctx=canvas.getContext('2d');
 paintProblem(ctx,canvas,sourceCanvas,state.holds,problem);
 ctx.fillStyle='#1d281e';ctx.fillRect(0,sourceCanvas.height,canvas.width,164);ctx.fillStyle='#d4ef75';ctx.font='bold 22px sans-serif';ctx.textAlign='left';
 ctx.fillText(`CRUX / ${problem.name} / Estimated ≈ V${problem.estimate.grade}`,22,sourceCanvas.height+32);
 ctx.fillStyle='#ccd4bd';ctx.font='14px sans-serif';ctx.fillText(`Rough photo range V${problem.estimate.low}–V${problem.estimate.high}`,22,sourceCanvas.height+56);
 ctx.fillStyle='#eee';ctx.fillText('Highlighted holds only. Blue = feet only. Handholds may also be used for feet.',22,sourceCanvas.height+82);ctx.fillText('Start on LH/RH + LF/RF. Match TOP under control. Geometry is approximate.',22,sourceCanvas.height+107);
 if(state.demo&&!state.example){ctx.font='11px sans-serif';ctx.fillText('Photo: Miyuki Meinaka / Wikimedia Commons / CC BY-SA 4.0 / cropped and annotated',22,sourceCanvas.height+142);}
 canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),name='crux-problem.png';dialog(`<p class="eyebrow">TAKE YOUR PROBLEM WITH YOU</p><h2>Your usable hold set</h2><img src="${url}" alt="Boulder problem with highlighted usable holds, starts and finish" style="width:100%;height:auto;border-radius:8px"><p>Colored outlines mark the whole problem. No numbered sequence is required.</p><a class="primary" href="${url}" download="${name}" style="text-decoration:none">Download PNG ↓</a>`);$('info-dialog').addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});},'image/png');
}
async function openCamera(){if(state.busy)return;$('camera-dialog').showModal();$('camera-error').textContent='';$('capture-button').disabled=true;try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera preview is unavailable. Use your phone camera or upload a photo.');stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});if(!$('camera-dialog').open){stopCamera();return;}$('camera-video').srcObject=stream;await $('camera-video').play();$('capture-button').disabled=false;}catch(e){$('camera-error').textContent=e.name==='NotAllowedError'?'Camera access was declined. You can allow it in browser settings, or upload a photo.':e.name==='NotFoundError'?'No camera found. Upload a wall photo instead.':e.message;}}
function stopCamera(){stream?.getTracks().forEach(t=>t.stop());stream=null;$('camera-video').srcObject=null;}
$('capture-button').onclick=()=>{const v=$('camera-video');if(!v.videoWidth)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);$('camera-dialog').close();stopCamera();loadPhoto(c.toDataURL('image/jpeg',.92));};
$('camera-dialog').addEventListener('close',stopCamera);$('native-camera').onclick=()=>{$('camera-dialog').close();$('capture-input').click();};
$('camera-button').onclick=openCamera;$('quick-photo').onclick=$('upload-button').onclick=$('empty-upload').onclick=()=>$('file-input').click();
['file-input','capture-input'].forEach(id=>$(id).onchange=e=>{readFile(e.target.files[0]);e.target.value='';});
$('demo-button').onclick=chooseExample;
$('demo-wall-tabs').onclick=e=>{const b=e.target.closest('[data-wall-example]');if(!b)return;const key=b.dataset.wallExample,example=examples[key];loadPhoto(example.src,{demo:true,crop:example.crop||null,example:key==='original'?null:key});};
$('beta-toggle').onclick=()=>{cancelScanReveal();stopBeta();state.betaMode=!state.betaMode;state.betaIndex=0;render();if(state.betaMode)playBeta();};
$('climber-toggle').onclick=()=>{state.climberMode=!state.climberMode;render();};
$('beta-prev').onclick=()=>{stopBeta();state.betaIndex--;render();};$('beta-next').onclick=()=>{stopBeta();state.betaIndex++;render();};
function playBeta(){
 if(betaTimer)return;const p=activeRoute();if(!p?.beta?.length||!state.betaMode)return;
 if(state.betaIndex>=p.beta.length-1){state.betaIndex=0;render();}
 $('beta-play').textContent='Pause';$('beta-play').setAttribute('aria-label','Pause suggested sequence');
 betaTimer=setInterval(()=>{const p=activeRoute();if(!p||!state.betaMode||state.betaIndex>=p.beta.length-1){stopBeta();return;}state.betaIndex++;render();},1400);
}
$('beta-play').onclick=()=>{if(betaTimer)stopBeta();else playBeta();};
 $('all-holds').onclick=()=>{cancelScanReveal();state.showAll=!state.showAll;render();};
$('focus-button').onclick=()=>{if(!state.photo)return;if(state.focusPicking){cancelFocus();return;}cancelScanReveal();stopBeta();state.focusPicking=true;state.focusDraft={...(state.focus||defaultFocusArea())};state.activeHold=null;render();if(matchMedia('(max-width:700px)').matches)$('wall-stage').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
$('focus-apply').onclick=applyFocus;
$('focus-clear').onclick=()=>{state.focus=null;state.focusPicking=false;state.focusDraft=null;render();invalidate();requestAngleEstimate();};
$('generate-button').onclick=()=>generate();$('detect-button').onclick=()=>{if(state.holds.length){dialog('<h2>Find holds again?</h2><p>This replaces your hold edits and current routes with fresh detections.</p><button class="primary" id="rescan-confirm">Find holds again</button>');$('rescan-confirm').onclick=()=>{$('info-dialog').close();detect();};}else detect();};
$('target-grade').oninput=e=>setTarget(e.target.value);$('grade-minus').onclick=()=>setTarget(Number($('target-grade').value)-1);$('grade-plus').onclick=()=>setTarget(Number($('target-grade').value)+1);
$('scale-guides').onclick=()=>{state.scaleGuides=!state.scaleGuides;renderScale();};
['scale-top','scale-bottom','wall-height-input'].forEach(id=>$(id).oninput=()=>{state.scaleSpan={...state.scaleSpan,status:'adjusted',reason:'Adjusted guides and wall height set the scale.'};applyPhotoScale();invalidate();});
$('body-height').oninput=()=>{try{localStorage.setItem('crux-height-cm',$('body-height').value);}catch{}invalidate();};
$('create-tab').onclick=()=>setMode('create');$('grade-tab').onclick=()=>setMode('grade');
$('route-style').onclick=e=>{const b=e.target.closest('[data-style]');if(!b)return;state.style=b.dataset.style;scheduleRegenerate();$('route-style').querySelectorAll('button').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});};
$('route-results').onclick=e=>{const b=e.target.closest('[data-route]');if(b){stopBeta();state.selected=Number(b.dataset.route);state.activeHold=null;state.betaMode=false;state.betaIndex=0;cancelScanReveal();render();}};
$('hold-layer').onclick=e=>{if(state.focusPicking)return;const b=e.target.closest('[data-hold]');if(b){e.stopPropagation();selectHold(b.dataset.hold);}};
$('image-wrap').onclick=e=>{if(state.focusPicking)return;if(!state.edit||e.target.closest('[data-hold]'))return;const rect=$('image-wrap').getBoundingClientRect(),h={x:clamp((e.clientX-rect.left)/rect.width,0,1),y:clamp((e.clientY-rect.top)/rect.height,0,1),w:.035,h:.035,id:'h'+(Math.max(0,...state.holds.map(h=>Number(h.id.slice(1))))+1),grip:'unknown',role:'normal'};const observed=assignHoldColors(sourceContext.getImageData(0,0,sourceCanvas.width,sourceCanvas.height),[h]);h.appearance=observed.holds[0].appearance;h.color=nearestPaintGroup(h.appearance.paintColor,state.palette);if(!h.color){const id='paint-'+(Math.max(0,...state.palette.map(p=>Number(p.id.slice(6))||0))+1),p=observed.palette[0];state.palette.push({...p,id,label:state.palette.some(x=>x.label===p.label)?p.label+' · added':p.label});h.color=id;}state.holds.push(h);state.activeHold=h.id;invalidate();};
$('edit-button').onclick=()=>{if(!state.photo){notify('Add a wall first.');return;}cancelScanReveal();state.edit=!state.edit;state.activeHold=null;state.overlay=true;$('overlay-button').setAttribute('aria-pressed','true');$('edit-button').setAttribute('aria-pressed',state.edit);render();};
$('overlay-button').onclick=()=>{cancelScanReveal();state.overlay=!state.overlay;$('overlay-button').setAttribute('aria-pressed',state.overlay);render();};
$('facet-toggle').onclick=()=>{cancelScanReveal();state.facetMode=!state.facetMode;renderFacets();if(state.facetMode)requestAngleEstimate(!angleDepthReady);else imageStatus.clear('walls');};$('replay-scan').onclick=()=>revealDetection();
$('color-picker').onclick=e=>{const b=e.target.closest('[data-color]');if(!b)return;state.selectedHolds=state.holds.filter(h=>h.color===b.dataset.color&&h.role!=='excluded'&&inFocus(h)).map(h=>h.id);state.gradeProblem=null;render();scheduleRegenerate();};$('clear-selection').onclick=()=>{clearTimeout(regenerateTimer);cancelPlan();if(!state.scanPending)liveScan.finish(state.liveToken);state.selectedHolds=[];state.gradeProblem=null;render();};
$('history-button').onclick=showHistory;
document.querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('wall-stage').addEventListener('dragover',e=>e.preventDefault());$('wall-stage').addEventListener('drop',e=>{e.preventDefault();readFile(e.dataTransfer.files[0]);});
let resumeScan=false,resumeAngles=false,resumePlan=false;
window.addEventListener('pagehide',()=>{
 state.suspended=true;resumeScan=state.busy||state.scanPending||state.liveScan.active;resumeAngles=state.anglePending||state.inclinePending;resumePlan=state.planning;
 cancelScanReveal();scanJob++;state.scanPending=false;outlinePending?.cancel();outlinePending=null;stopBeta();climberPreview?.hide();stopCamera();cancelPlan();
 worker?.terminate();worker=null;angleWorker?.terminate();angleWorker=null;angleDepthReady=false;state.anglePending=false;state.inclinePending=false;angleJob++;
 clearTimeout(angleTimer);clearTimeout(regenerateTimer);if(detectorPending){clearTimeout(detectorPending.timer);detectorPending.reject(Error('Suspended'));detectorPending=null;}setBusy(false);
});
window.addEventListener('pageshow',event=>{state.suspended=false;if(!event.persisted)return;if(resumeScan)detect();else {if(resumeAngles)requestAngleEstimate(true);if(resumePlan)scheduleRegenerate();}resumeScan=resumeAngles=resumePlan=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopBeta();if(document.hidden&&stream){$('camera-dialog').close();stopCamera();}});
function registerTools(){
 const context=document.modelContext;if(!context?.registerTool)return;const lifetime=new AbortController();
 const brief=p=>({name:p.name,handIds:p.handIds,footIds:p.footIds,start:p.start,finishId:p.finishId,estimate:p.estimate,stats:p.stats,beta:p.beta});
 const tools=[{name:'get_climbing_wall',description:'Read hold outlines, allowed problem sets, start contacts, finish, optional candidate beta and provisional grade. Does not return the photo.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({mode:state.mode,holdCount:state.holds.length,outlinedHolds:state.holds.filter(h=>h.polygon&&!h.fallback).length,planning:state.planning,setup:setup(),angleMode:state.angleMode,angleEstimate:state.angleEstimate,inclineFailure:state.inclineFailure,inclineExecution:state.inclineExecution,detectionFailure:state.detectionFailure,localInclines:state.localInclines?{coverage:state.localInclines.coverage,angleRange:state.localInclines.angleRange}:null,focus:state.focus,problems:state.routes.map(brief),gradeProblem:state.gradeProblem?brief(state.gradeProblem):null})}];
 for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifetime.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifetime.abort(),{once:true});
}
climberPreview=createClimberOverlay($('climber-overlay'));
focusEditor=attachFocusEditor({editor:$('focus-editor'),surface:$('image-wrap'),getArea:()=>state.focusPicking?state.focusDraft:null,onChange:area=>{state.focusDraft=area;renderFocus();},onCancel:cancelFocus,onApply:applyFocus});
wallZoom=attachWallZoom({viewport:$('wall-stage'),surface:$('image-wrap'),onChange:()=>requestAnimationFrame(layoutContactMarkers)});
try{const height=localStorage.getItem('crux-height-cm');if(height&&Number(height)>=120&&Number(height)<=220)$('body-height').value=height;}catch{}
setupInstall(dialog);
updateHistory();setTarget(5,false);updateAngleUI('Add a wall photo to estimate its incline.');render();registerTools();
loadPhoto('./demo-wall.jpg',{demo:true,crop:[1000,710,1150,1410]});
