import {retainLocalSurfaceEvidence} from './surface-evidence.mjs?v=21';
import {detectStraightSurfaceCells} from './straight-surface-cells.mjs?v=21';
import {augmentGradientSeams} from './augment-gradient-seams.mjs?v=21';
import {detectSurfaceSeams,traceSurfaceRings} from './automatic-surfaces.mjs?v=21';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),unit=n=>{const l=Math.hypot(...n);return l>1e-8?n.map(v=>v/l):null;},angle=(a,b)=>Math.acos(clamp(a.reduce((s,v,c)=>s+v*b[c],0),-1,1))*180/Math.PI;
const quantile=(a,q)=>{a.sort((a,b)=>a-b);return a[Math.floor((a.length-1)*q)];};
export function detectAdaptiveStraightSurfaces(input){
 const first=detectStraightSurfaceCells(input),unresolved=new Set(first.regions.map((r,i)=>r.status==='uncertain'?i:-1).filter(i=>i>=0));
 if(!unresolved.size)return {...first,diagnostics:{...first.diagnostics,adaptiveRecovery:'not-needed',recoveredSeams:0}};
 const w=input.width,h=input.height,labelAt=p=>p[0]<0||p[0]>=1||p[1]<0||p[1]>=1?-1:first.labels[Math.floor(p[1]*h)*w+Math.floor(p[0]*w)];
 const original=detectSurfaceSeams(input),augmented=augmentGradientSeams(input),candidates=augmented.slice(original.length).filter(line=>{
  const mid=[(line.a[0]+line.b[0])/2,(line.a[1]+line.b[1])/2];if(!unresolved.has(labelAt(mid)))return false;
  let hits=0;for(let k=0;k<31;k++){const t=k/30,p=line.a.map((v,i)=>v+(line.b[i]-v)*t);if(unresolved.has(labelAt(p)))hits++;}return hits/31>=.7;
 });
 if(!candidates.length)return {...first,diagnostics:{...first.diagnostics,adaptiveRecovery:'no-supported-extra-seams',recoveredSeams:0}};
 // Preserve already snapped original junctions. Re-fitting raw old endpoints
 // together with new candidates can move existing junctions and merge cells.
 const refined=detectStraightSurfaceCells({...input,seams:[...first.seams,...candidates]}),N=w*h,labels=new Int32Array(N).fill(-1),regions=[],holds=input.holds||[],mask=new Uint8Array(N),ns=new Float32Array(N*3);
 for(let p=0;p<N;p++){const n=unit([0,1,2].map(c=>input.normals[input.normalLayout==='hwc'?p*3+c:c*N+p]));if(n)ns.set(n,p*3);}
 for(const hold of holds){const dx=(hold.w||.02)*.6,dy=(hold.h||.025)*.6,x0=clamp(Math.floor((hold.x-dx)*w),0,w-1),x1=clamp(Math.ceil((hold.x+dx)*w),0,w-1),y0=clamp(Math.floor((hold.y-dy)*h),0,h-1),y1=clamp(Math.ceil((hold.y+dy)*h),0,h-1);for(let y=y0;y<=y1;y++)mask.fill(1,y*w+x0,y*w+x1+1);}
 const originalMembers=first.regions.map(()=>[]);for(let p=0;p<N;p++)if(first.labels[p]>=0)originalMembers[first.labels[p]].push(p);
 let recoveredCells=0;
 for(let oldId=0;oldId<first.regions.length;oldId++){
  const original=first.regions[oldId],ids=originalMembers[oldId];
  if(!unresolved.has(oldId)){const index=regions.length;regions.push(original);for(const p of ids)labels[p]=index;continue;}
  const groups=new Map();for(const p of ids){const child=refined.labels[p];if(!groups.has(child))groups.set(child,[]);groups.get(child).push(p);}
  const candidates=[];
  for(const [child,pixels] of groups){
   const population=new Set(pixels),included=holds.filter(hold=>population.has(clamp(Math.floor(hold.y*h),0,h-1)*w+clamp(Math.floor(hold.x*w),0,w-1))),samples=pixels.filter(p=>!mask[p]&&Math.hypot(ns[p*3],ns[p*3+1],ns[p*3+2])>.5&&(!input.confidence||input.confidence[p]>1));
   if(child<0||pixels.length<N*.006||included.length<3||samples.length<30)continue;
   const provisional=unit([0,1,2].map(c=>quantile(samples.map(p=>ns[p*3+c]),.5)));if(!provisional)continue;const inliers=samples.filter(p=>angle([ns[p*3],ns[p*3+1],ns[p*3+2]],provisional)<20),inlierFraction=inliers.length/samples.length;
   const normal=unit([0,1,2].map(c=>quantile(inliers.map(p=>ns[p*3+c]),.5)))||provisional,spread=quantile(inliers.map(p=>angle([ns[p*3],ns[p*3+1],ns[p*3+2]],normal)),.9)??90,usable=inlierFraction>=.85&&spread<=20,rawAngle=angle(normal,first.floorReference.normal)-90,rounded=Math.round(rawAngle/5)*5;
   const own=new Int32Array(N).fill(-1);for(const p of pixels)own[p]=0;const rings=traceSurfaceRings(own,w,h,0,2.1).filter(r=>!r.hole).sort((a,b)=>b.area-a.area);if(!rings.length)continue;const polygon=rings[0].points,xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]);
   const boundarySegments=polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=(b[0]-a[0])*w,dy=(b[1]-a[1])*h,len=Math.hypot(dx,dy),supported=refined.seams.some(s=>{const sx=(s.b[0]-s.a[0])*w,sy=(s.b[1]-s.a[1])*h,sl=Math.hypot(sx,sy);return sl>1&&len>1&&Math.abs((sx*dx+sy*dy)/(sl*len))>.98&&Math.abs(sx*(my-s.a[1])*h-sy*(mx-s.a[0])*w)/sl<3;});return {a,b,source:supported?'image-seam':'search-limit',support:supported?'image-seam':'search-limit',verifiedPhysicalSeam:false};});
   const uncertainty=Math.max(10,Math.ceil((spread+(first.floorReference.spread||8)+5)/5)*5),cx=pixels.reduce((s,p)=>s+(p%w+.5)/w,0)/pixels.length,cy=pixels.reduce((s,p)=>s+(Math.floor(p/w)+.5)/h,0)/pixels.length;
   candidates.push({pixels,region:{...original,id:`${original.id}-recovered-${candidates.length+1}`,status:usable?'estimated':'uncertain',angle:usable?rounded:null,normal:usable?normal:null,rawAngle:usable?rawAngle:null,range:usable?[Math.max(-90,rounded-uncertainty),Math.min(90,rounded+uncertainty)]:null,spread,polygon,polygons:rings.map(r=>r.points),holes:[],rings,boundarySegments,anchor:{x:cx,y:cy},roi:{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)},holdCount:included.length,areaFraction:pixels.length/N,reason:usable?'Recovered straight seam and consistent local plane.':'Recovered straight seam; mixed local normals leave the angle unresolved.',metadata:{...original.metadata,adaptiveRecovery:true,inheritedUncertainFraction:1,requiredRecoveryInlierFraction:.85,inlierFraction}}});
  }
  if(candidates.length<2){const index=regions.length;regions.push(original);for(const p of ids)labels[p]=index;continue;}
  recoveredCells++;for(const child of candidates){const index=regions.length;regions.push(child.region);for(const p of child.pixels)labels[p]=index;}
 }
 const perHold=holds.map((hold,i)=>{const unknown={id:hold.id??String(i),status:'uncertain',normal:null,angle:null,range:null,reason:'Hold crosses an unresolved surface or boundary.'},sampled=[];for(const dx of [-.4,0,.4])for(const dy of [-.4,0,.4]){const x=hold.x+dx*(hold.w||.02),y=hold.y+dy*(hold.h||.025);if(x<0||x>=1||y<0||y>=1)return unknown;sampled.push(labels[Math.floor(y*h)*w+Math.floor(x*w)]);}if(sampled[0]<0||sampled.some(id=>id!==sampled[0]))return unknown;const r=regions[sampled[0]];return r.status!=='estimated'?unknown:{...unknown,status:'estimated',normal:r.normal,angle:r.angle,rawAngle:r.rawAngle,range:r.range,spread:r.spread,facetId:r.id,source:r.source,confidence:r.confidence,angleReference:r.angleReference,reason:r.reason};});
 const known=perHold.filter(p=>p.status==='estimated').length;
 return retainLocalSurfaceEvidence({...first,regions,labels,perHold,coverage:{known,unknown:holds.length-known,total:holds.length},status:known===0?'uncertain':known===holds.length?'estimated':'partial',diagnostics:{...first.diagnostics,adaptiveRecovery:'unresolved-cells-only',recoveredSeams:candidates.length,recoveredCells,initialRegions:first.regions.length,initialUnresolvedRegions:unresolved.size,recoveryInlierThreshold:.85}},first.localEvidence,holds,input);
}
