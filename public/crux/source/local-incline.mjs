/* Local wall-angle suggestions from an already cached METRIC depth image.
 * x/y/w/h use full-image normalized coordinates; hold x/y are center positions.
 * No NN inference, ground-truth accuracy claim, or manual-override handling here.
 */
import {fitMetricPlane} from './incline-geometry.mjs?v=24';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n)};
const angleBetween=(a,b)=>Math.acos(clamp(dot(a,b),-1,1))*180/Math.PI;
const median=a=>{const s=[...a].sort((a,b)=>a-b),m=(s.length-1)/2;return(s[Math.floor(m)]+s[Math.ceil(m)])/2};
const FOVS=[50,65,80],BASE_SCALE=2*Math.tan(65*Math.PI/360);
const normalAtFov=(normal,fov)=>{const ratio=BASE_SCALE/(2*Math.tan(fov*Math.PI/360));return unit([normal[0]*ratio,normal[1]*ratio,normal[2]])};
const averageNormal=planes=>unit([0,1,2].map(i=>planes.reduce((sum,p)=>sum+p.normal[i]/(.01+p.residual90),0)));
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y))/(a.w*a.h);
const inside=(x,y,r)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
function normalRoi(r){const x=clamp(r.x,0,.999),y=clamp(r.y,0,.999);return{x,y,w:clamp(r.w,0,1-x),h:clamp(r.h,0,1-y)}}
function windowAt(x,y,w,h,bounds){
 w=Math.min(w,bounds.w);h=Math.min(h,bounds.h);
 return{x:clamp(x-w/2,bounds.x,bounds.x+bounds.w-w),y:clamp(y-h/2,bounds.y,bounds.y+bounds.h-h),w,h};
}

/** Find and cache a shared floor reference once per photo/selected wall area. */
export function findFloorReference({depth,width=518,height=518,imageAspect,wallRoi}){
 const common={depth,width,height,imageAspect},candidates=[];
 if(!depth||depth.length!==width*height||!(imageAspect>0))return{status:'uncertain',reason:'Invalid depth image.'};
 for(const y of [.77,.84,.91])for(const x of [.05,.21,.37,.53,.69,.82]){
  const roi={x,y,w:Math.min(.16,.98-x),h:.065};
  if(wallRoi&&overlap(roi,wallRoi)>.25)continue;
  const p=fitMetricPlane({...common,roi});
  if(p&&p.normal[1]<-.7&&p.residual90<.04&&p.residualMedian<.02&&p.depthSpan>.035)candidates.push(p);
 }
 if(candidates.length<2)return{status:'uncertain',reason:'A clear floor reference is missing.',candidateCount:candidates.length};
 let cluster=[];
 for(const anchor of candidates){const members=candidates.filter(p=>angleBetween(p.normal,anchor.normal)<10);if(members.length>cluster.length)cluster=members}
 if(cluster.length<2||cluster.length<candidates.length*.6)return{status:'uncertain',reason:'The floor reference is inconsistent.',candidateCount:candidates.length};
 const normals=FOVS.map(fov=>averageNormal(cluster.map(p=>({...p,normal:normalAtFov(p.normal,fov)}))));
 return{status:'estimated',normal:normals[1],normalsByFov:normals,fovDegrees:FOVS,candidateCount:candidates.length,consistentCount:cluster.length,rois:cluster.map(p=>p.roi),source:'shared-photo-floor'};
}

/** Inspect one support window. Seams remain unknown rather than averaging faces. */
export function estimateLocalPatch({depth,width=518,height=518,imageAspect,roi,floorReference}){
 const unknown=(reason,diagnostics={})=>({status:'uncertain',angle:null,range:null,reason,roi,source:'photo-local',diagnostics});
 if(!depth||depth.length!==width*height||!(imageAspect>0)||!roi||![roi.x,roi.y,roi.w,roi.h].every(Number.isFinite))return unknown('Invalid depth image or support area.');
 if(!floorReference||floorReference.status!=='estimated')return unknown('A clear floor reference is missing.');
 roi=normalRoi(roi);
 if(roi.w<.07||roi.h<.10)return unknown('Too little wall around this point.');
 const common={depth,width,height,imageAspect};
 const plane=fitMetricPlane({...common,roi});
 if(!plane)return unknown('Not enough usable wall depth.');
 const diagnostics={residual90:plane.residual90,residualMedian:plane.residualMedian};
 if(plane.residual90>.04||plane.residualMedian>.018)return unknown('This patch crosses a seam, hold, or unclear surface.',diagnostics);
 const angleByFov=FOVS.map((fov,i)=>angleBetween(normalAtFov(plane.normal,fov),floorReference.normalsByFov[i])-90);
 const spread=Math.max(...angleByFov)-Math.min(...angleByFov);
 Object.assign(diagnostics,{angleByFov,fovSpread:spread});
 // Lens uncertainty changes the angle, not whether a plane exists.
 // Preserve it in a sensitivity range instead of rejecting all steep planes.
 // Compare opposite halves. Unlike one fitted average, these detect a crease
 // even when each side is independently planar with a very small residual.
 const halves=[
  {x:roi.x,y:roi.y,w:roi.w/2,h:roi.h},
  {x:roi.x+roi.w/2,y:roi.y,w:roi.w/2,h:roi.h},
  {x:roi.x,y:roi.y,w:roi.w,h:roi.h/2},
  {x:roi.x,y:roi.y+roi.h/2,w:roi.w,h:roi.h/2},
 ].map(r=>fitMetricPlane({...common,roi:r}));
 if(halves.some(p=>!p))return unknown('Too little wall to verify the local slope.',diagnostics);
 const seamAngles=[angleBetween(halves[0].normal,halves[1].normal),angleBetween(halves[2].normal,halves[3].normal)];
 diagnostics.seamAngles=seamAngles;
 if(Math.max(...seamAngles)>12||halves.some(p=>p.residual90>.055))return unknown('Different slopes meet near this point.',diagnostics);
 const rawAngle=angleByFov[1];diagnostics.rawAngle=rawAngle;
 if(rawAngle < -35||rawAngle>88)return unknown('This slope is outside the supported photo-estimate range.',diagnostics);
 const angle=Math.abs(rawAngle)<5?0:Math.round(rawAngle/5)*5;
 return{status:'estimated',angle,range:[Math.max(-35,Math.floor(Math.min(...angleByFov)/5)*5-5),Math.min(90,Math.ceil(Math.max(...angleByFov)/5)*5+5)],reason:'Rough local photo estimate.',roi,normal:plane.normal,source:'photo-local',confidence:'low',diagnostics};
}

/** Build a small grid plus per-hold values from one full-image cached depth.
 * Unknown holds keep angle=null. Manual whole-wall override belongs upstream.
 * Optional floorReference can be reused when only holds/ROI changes.
 */
export function estimateLocalInclines({depth,width=518,height=518,imageAspect,wallRoi,holds=[],columns=6,rows=5,floorReference}){
 wallRoi=normalRoi(wallRoi||{x:.05,y:.08,w:.9,h:.65});
 const common={depth,width,height,imageAspect};
 const floor=floorReference||findFloorReference({...common,wallRoi});
 const perHold=[],patches=[],cache=new Map();
 const evaluate=roi=>{const key=[roi.x,roi.y,roi.w,roi.h].map(v=>v.toFixed(4)).join(',');if(!cache.has(key))cache.set(key,estimateLocalPatch({...common,roi,floorReference:floor}));return cache.get(key)};
 columns=clamp(Math.round(columns),1,10);rows=clamp(Math.round(rows),1,10);
 const cellW=wallRoi.w/columns,cellH=wallRoi.h/rows;
 const patchW=Math.max(.16,Math.min(.20,cellW*1.15)),patchH=Math.max(.19,Math.min(.24,cellH*1.15));
 if(floor.status==='estimated'){
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
   const x=wallRoi.x+(column+.5)*cellW,y=wallRoi.y+(row+.5)*cellH;
   const result=evaluate(windowAt(x,y,patchW,patchH,wallRoi));
   patches.push({id:`${row}:${column}`,row,column,x,y,...result});
  }
 }
 for(const hold of holds){
  const id=hold.id;
  if(!Number.isFinite(hold.x)||!Number.isFinite(hold.y)||!inside(hold.x,hold.y,wallRoi)){perHold.push({id,status:'uncertain',angle:null,range:null,source:'photo-local',reason:'Hold is outside the selected wall area.'});continue}
  // Larger holds need more surrounding wall; a fixed minimum prevents fitting
  // only the raised hold itself. This is not a detector for wall/hold pixels.
  const w=clamp((hold.w||0)*3,.16,.22),h=clamp((hold.h||0)*3,.19,.26);
  const result=evaluate(windowAt(hold.x,hold.y,w,h,wallRoi));
  perHold.push({id,...result});
 }
 const known=perHold.filter(p=>p.status==='estimated'),knownPatches=patches.filter(p=>p.status==='estimated');
 const validAngles=(holds.length?known:knownPatches).map(p=>p.angle);
 const total=holds.length||patches.length,knownCount=holds.length?known.length:knownPatches.length;
 // Region summaries aggregate adjacent consistent grid cells; they never fill
 // an unknown cell or transfer a face angle onto an uncertain hold.
 const byId=new Map(knownPatches.map(p=>[p.id,p])),seen=new Set(),regions=[];
 for(const start of knownPatches){
  if(seen.has(start.id))continue;
  const group=[],queue=[start];seen.add(start.id);
  while(queue.length){const p=queue.shift();group.push(p);for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=byId.get(`${p.row+dr}:${p.column+dc}`);if(n&&!seen.has(n.id)&&Math.abs(n.angle-start.angle)<=5&&angleBetween(n.normal,start.normal)<=12){seen.add(n.id);queue.push(n)}}}
  regions.push({id:`region-${regions.length+1}`,angle:Math.round(median(group.map(p=>p.angle))/5)*5,range:[Math.min(...group.map(p=>p.range[0])),Math.max(...group.map(p=>p.range[1]))],patchCount:group.length,patchIds:group.map(p=>p.id),roi:{x:Math.min(...group.map(p=>p.x-cellW/2)),y:Math.min(...group.map(p=>p.y-cellH/2)),w:Math.max(...group.map(p=>p.x+cellW/2))-Math.min(...group.map(p=>p.x-cellW/2)),h:Math.max(...group.map(p=>p.y+cellH/2))-Math.min(...group.map(p=>p.y-cellH/2))},source:'photo-local'});
 }
 const coverage={known:knownCount,unknown:total-knownCount,total,fraction:total?knownCount/total:0,unit:holds.length?'holds':'patches'};
 const status=knownCount===0?'uncertain':knownCount===total?'estimated':'partial';
 return{status,source:'photo-local',confidence:'low',wallRoi,floorReference:floor,coverage,perHold,patches,regions,angleRange:validAngles.length?[Math.min(...validAngles),Math.max(...validAngles)]:null,reason:floor.status!=='estimated'?floor.reason:status==='partial'?'Some local slopes are unclear; only known holds have an angle.':status==='estimated'?'Rough local photo estimates; confirm or override manually.':'Local slopes are unclear. Set a manual angle if known.',diagnostics:{uniquePatchFits:cache.size,extraModelInferences:0,rangeMeaning:'Heuristic ranges, not calibrated confidence intervals'}};
}
