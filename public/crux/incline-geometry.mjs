/* Approximate single-image wall incline from METRIC depth. Do not use relative
 * inverse-depth model outputs here. Angles are heuristic suggestions, not measurements.
 * Camera: x right, y down, z forward. Positive incline means overhang from vertical.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n)};
const percentile=(a,p)=>{const s=[...a].sort((x,y)=>x-y),i=(s.length-1)*p,j=Math.floor(i);return s[j]+(s[Math.ceil(i)]-s[j])*(i-j)};
const angleBetween=(a,b)=>Math.acos(clamp(dot(a,b),-1,1))*180/Math.PI;
function solve3(matrix,rhs){
 const a=matrix.map((r,i)=>[...r,rhs[i]]);
 for(let i=0;i<3;i++){
  let best=i;for(let j=i+1;j<3;j++)if(Math.abs(a[j][i])>Math.abs(a[best][i]))best=j;
  [a[i],a[best]]=[a[best],a[i]];
  if(Math.abs(a[i][i])<1e-12)return null;
  const div=a[i][i];for(let k=i;k<4;k++)a[i][k]/=div;
  for(let j=0;j<3;j++)if(j!==i){const m=a[j][i];for(let k=i;k<4;k++)a[j][k]-=m*a[i][k]}
 }
 return a.map(r=>r[3]);
}
function normalizeRoi(r){
 const x=clamp(r.x,0,.999),y=clamp(r.y,0,.999);
 return {x,y,w:clamp(r.w,0,1-x),h:clamp(r.h,0,1-y)};
}
export function fitMetricPlane({depth,width,height,imageAspect,roi,fov=65,accept}){
 roi=normalizeRoi(roi);const points=[],scale=2*Math.tan(fov*Math.PI/360);
 for(let y=Math.ceil(roi.y*height);y<Math.floor((roi.y+roi.h)*height);y+=3)
  for(let x=Math.ceil(roi.x*width);x<Math.floor((roi.x+roi.w)*width);x+=3){
   if(accept&&!accept(x/width,y/height))continue;
   const z=depth[y*width+x];if(!Number.isFinite(z)||z<=.05||z>=19.8)continue;
   points.push({a:[(x/width-.5)*scale,(y/height-.5)*scale/imageAspect,1],q:1/z,w:1,z});
  }
 if(points.length<30)return null;
 let coef,errors=[];
 for(let iteration=0;iteration<6;iteration++){
  const lhs=[[0,0,0],[0,0,0],[0,0,0]],rhs=[0,0,0];
  for(const p of points){const weight=p.w*p.w;for(let i=0;i<3;i++){rhs[i]+=weight*p.a[i]*p.q;for(let j=0;j<3;j++)lhs[i][j]+=weight*p.a[i]*p.a[j]}}
  coef=solve3(lhs,rhs);if(!coef)return null;
  errors=points.map(p=>(dot(p.a,coef)-p.q)/p.q);
  const mad=Math.max(.002,percentile(errors.map(Math.abs),.5)*1.4826);
  points.forEach((p,i)=>{p.w=Math.min(1,1.5*mad/Math.max(Math.abs(errors[i]),1e-6))});
 }
 const abs=errors.map(Math.abs),zs=points.map(p=>p.z);
 return {normal:unit(coef.map(v=>-v)),coefficients:coef,residualMedian:percentile(abs,.5),residual90:percentile(abs,.9),depthSpan:percentile(zs,.9)/percentile(zs,.1)-1,count:points.length,roi};
}
function overlapFraction(a,b){const w=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),h=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return w*h/(a.w*a.h)}

export function estimateIncline({depth,width=518,height=518,imageAspect,wallRoi}){
 if(!depth||depth.length!==width*height||!(imageAspect>0)||!wallRoi)return {status:'uncertain',angle:null,range:null,reason:'Choose a wall face and include the floor.'};
 wallRoi=normalizeRoi(wallRoi);
 const common={depth,width,height,imageAspect},diagnostics={model:'Depth Anything V2 Metric Indoor Small',method:'Robust wall and floor plane fits',fovDegrees:[50,65,80],rangeMeaning:'Heuristic range, not a calibrated confidence interval'};
 const uncertain=(reason,extra={})=>({status:'uncertain',angle:null,range:null,reason,wallRoi,floorRoi:null,diagnostics,...extra});
 if(wallRoi.w<.065||wallRoi.h<.10)return uncertain('Select a larger, single flat wall face.');
 const wall=fitMetricPlane({...common,roi:wallRoi});
 if(!wall)return uncertain('There is not enough usable wall depth.');
 diagnostics.wallResidual90=wall.residual90;
 if(wall.residual90>.06||wall.residualMedian>.025)return uncertain('The selected area appears to contain several faces or unclear depth. Select one flat face.');
 const candidates=[];
 for(const y of [.77,.84,.91])for(const x of [.05,.21,.37,.53,.69,.82]){
  const roi={x,y,w:Math.min(.16,.98-x),h:.065};
  if(overlapFraction(roi,wallRoi)>.25)continue;
  const plane=fitMetricPlane({...common,roi});
  if(plane&&plane.normal[1]<-.7&&plane.residual90<.04&&plane.residualMedian<.02&&plane.depthSpan>.035)candidates.push(plane);
 }
 diagnostics.floorCandidates=candidates.length;
 if(candidates.length<2)return uncertain('The floor is not clear enough. Include more floor or enter the angle manually.');
 let cluster=[];
 for(const anchor of candidates){const members=candidates.filter(p=>angleBetween(p.normal,anchor.normal)<10);if(members.length>cluster.length)cluster=members}
 diagnostics.floorConsistentCandidates=cluster.length;
 if(cluster.length<2||cluster.length<candidates.length*.6)return uncertain('The floor depth is inconsistent. Enter the angle manually.');
 const averageNormal=planes=>unit([0,1,2].map(i=>planes.reduce((s,p)=>s+p.normal[i]/(.01+p.residual90),0)));
 const floorNormal=averageNormal(cluster);
 const bestFloor=[...cluster].sort((a,b)=>a.residual90-b.residual90)[0];
 const floorRoi=bestFloor.roi;
 diagnostics.floorNormal=floorNormal;diagnostics.wallNormal=wall.normal;diagnostics.floorRois=cluster.map(p=>p.roi);
 const angleSamples=[50,65,80].map(fov=>{
  const w=fitMetricPlane({...common,roi:wallRoi,fov});
  const fs=cluster.map(p=>fitMetricPlane({...common,roi:p.roi,fov}));
  return angleBetween(w.normal,averageNormal(fs))-90;
 });
 diagnostics.angleByFov=angleSamples;
 const fovSpread=Math.max(...angleSamples)-Math.min(...angleSamples);
 diagnostics.fovSpread=fovSpread;
 // FOV sensitivity widens the reported range; it does not invalidate a plane.
 const localPlanes=[];
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  const roi={x:wallRoi.x+wallRoi.w*col/2,y:wallRoi.y+wallRoi.h*row/2,w:wallRoi.w/2,h:wallRoi.h/2};
  const p=fitMetricPlane({...common,roi});if(p)localPlanes.push(p);
 }
 const variations=localPlanes.map(p=>angleBetween(p.normal,wall.normal));
 diagnostics.localNormalVariations=variations;
 if(localPlanes.length<3||percentile(variations,.5)>17||variations.filter(v=>v<22).length<3)return uncertain('Different parts of this area have different slopes. Select one wall face.',{floorRoi});
 const rawAngle=angleSamples[1];diagnostics.rawAngle=rawAngle;
 if(rawAngle < -35 || rawAngle > 88)return uncertain('This slope is outside the reliable range of the photo estimate. Enter it manually.',{floorRoi});
 // Do not imply that a few degrees around vertical are distinguishable.
 const angle=Math.abs(rawAngle)<5?0:Math.round(rawAngle/5)*5;
 const spread=Math.max(10,Math.ceil(fovSpread/2/5)*5);
 return {status:'estimated',angle,range:[Math.max(-35,Math.floor(Math.min(...angleSamples)/5)*5-5),Math.min(90,Math.ceil(Math.max(...angleSamples)/5)*5+5)],reason:'Rough photo estimate; confirm the wall face and adjust if needed.',wallRoi,floorRoi,diagnostics};
}
