import {retainLocalSurfaceEvidence} from './surface-evidence.mjs?v=22';
// Straight image seams partition the wall; model normals estimate each plane.
import {detectWallSurfaces as baseSurfaces,pointInSurface,traceSurfaceRings} from './automatic-surfaces.mjs?v=22';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=a=>{const l=Math.hypot(...a);return l>1e-8?a.map(v=>v/l):null;};
const angle=(a,b)=>Math.acos(clamp(dot(a,b),-1,1))*180/Math.PI;
const quantile=(a,q)=>{if(!a.length)return null;a.sort((a,b)=>a-b);return a[Math.floor((a.length-1)*q)];};
const median=a=>quantile(a,.5);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const diff=(a,b)=>a.map((v,i)=>v-b[i]);
function convexHull(points){
 const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const half=ps=>{const out=[];for(const p of ps){while(out.length>1&&cross(diff(out.at(-1),out.at(-2)),diff(p,out.at(-1)))<=0)out.pop();out.push(p);}return out;};
 return [...half(sorted).slice(0,-1),...half([...sorted].reverse()).slice(0,-1)];
}
export function snapStraightSeams(seams,hull,width,height){
 let lines=seams.map(s=>[s.a.map((v,i)=>v*(i?height:width)),s.b.map((v,i)=>v*(i?height:width))]);
 const edges=hull.map((p,i)=>[p,hull[(i+1)%hull.length]]);
 for(let pass=0;pass<2;pass++)lines=lines.map((line,i)=>{
  const [a,b]=line,u=unit(diff(b,a));if(!u)return line;
  return line.map((p,endpoint)=>{let best=p,distance=width*.11;
   for(const [j,[c,d]] of [...lines,...edges].entries()){
    if(i===j)continue;const v=unit(diff(d,c));if(!v)continue;const determinant=cross(u,v);if(Math.abs(determinant)<.15)continue;
    const t=cross(diff(c,a),v)/determinant,q=a.map((x,k)=>x+t*u[k]),gap=Math.hypot(...diff(q,p)),position=dot(diff(q,c),v),outward=dot(diff(q,p),u)*(endpoint?1:-1);
    if(outward>=-2&&gap<distance&&position>=-width*.07&&position<=Math.hypot(...diff(d,c))+width*.07){best=q;distance=gap;}
   }return best;
  });
 });return lines;
}
export function findMergePairs(pairEvidence,threshold=3.5){
 // A continuous weak joint may be removed. A supported crease anywhere on the
 // shared boundary vetoes the merge, even when displayed angle labels match.
 const weak=pairEvidence.filter(p=>p.evidence.length&&p.evidence.every(e=>e.samples>=8&&e.jump<threshold)),strong=pairEvidence.filter(p=>p.evidence.some(e=>e.samples>=8&&e.jump>=threshold)),parent=new Map(),accepted=[];
 const find=i=>{if(!parent.has(i))parent.set(i,i);while(parent.get(i)!==i){parent.set(i,parent.get(parent.get(i)));i=parent.get(i);}return i;};
 for(const {pair:[a,b]} of weak){const aa=find(a),bb=find(b);if(aa===bb)continue;if(strong.some(({pair:[c,d]})=>{const cc=find(c),dd=find(d);return cc===aa&&dd===bb||cc===bb&&dd===aa;}))continue;parent.set(bb,aa);accepted.push([a,b]);}return accepted;
}
export function detectStraightSurfaceCells(input){
 const raw=baseSurfaces(input),{width:w,height:h,holds=[]}=input,N=w*h;if(!Number.isInteger(N)||N<64||!raw.floorReference)return raw;
 const roi=input.wallRoi||{x:0,y:0,w:1,h:1},ns=new Float32Array(N*3),mask=new Uint8Array(N),valid=new Uint8Array(N),points=[];
 for(let i=0;i<N;i++){const a=[0,1,2].map(c=>input.normals[input.normalLayout==='hwc'?i*3+c:c*N+i]),n=a.every(Number.isFinite)?unit(a):null;if(n){valid[i]=1;ns.set(n,i*3);}}
 for(const hold of holds){const dx=(hold.w||.02)*.6,dy=(hold.h||.025)*.6;if(!Number.isFinite(hold.x)||!Number.isFinite(hold.y))continue;
  for(const s of [-1,1])for(const t of [-1,1])points.push([clamp(hold.x+s*dx,roi.x,roi.x+roi.w)*w,clamp(hold.y+t*dy,roi.y,roi.y+roi.h)*h]);
  const x0=clamp(Math.floor((hold.x-dx)*w),0,w-1),x1=clamp(Math.ceil((hold.x+dx)*w),0,w-1),y0=clamp(Math.floor((hold.y-dy)*h),0,h-1),y1=clamp(Math.ceil((hold.y+dy)*h),0,h-1);
  for(let y=y0;y<=y1;y++)mask.fill(1,y*w+x0,y*w+x1+1);
 }
 const hull=points.length>=12?convexHull(points):[[roi.x*w,roi.y*h],[(roi.x+roi.w)*w,roi.y*h],[(roi.x+roi.w)*w,(roi.y+roi.h)*h],[roi.x*w,(roi.y+roi.h)*h]];
 const search=new Uint8Array(N),barrier=new Uint8Array(N);for(let y=0;y<h;y++)for(let x=0;x<w;x++)search[y*w+x]=pointInSurface(x+.5,y+.5,hull)?1:0;
 const sample=(point,r=2)=>{const x=Math.round(point[0]),y=Math.round(point[1]);if(x<r||y<r||x>=w-r||y>=h-r)return null;const values=[[],[],[]];
  for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++){const p=yy*w+xx;if(!valid[p]||mask[p]||input.confidence&&input.confidence[p]<=1)continue;for(let c=0;c<3;c++)values[c].push(ns[p*3+c]);}
  return values[0].length<5?null:unit(values.map(median));
 };
 const evidence=raw.seams.map(s=>{const a=[s.a[0]*w,s.a[1]*h],b=[s.b[0]*w,s.b[1]*h],d=diff(b,a),n=unit([-d[1],d[0]]),deltas=[];if(n)for(let k=0;k<40;k++){const t=.03+.94*k/39,p=a.map((v,i)=>v+d[i]*t);for(const off of [.012,.025,.04]){const l=sample(p.map((v,i)=>v+n[i]*off*w)),r=sample(p.map((v,i)=>v-n[i]*off*w));if(l&&r)deltas.push(angle(l,r));}}return {jump:median(deltas),samples:deltas.length};});
 const lines=snapStraightSeams(raw.seams,hull,w,h);
 for(const [a,b] of lines){const length=Math.hypot(...diff(b,a)),steps=Math.max(1,Math.ceil(length*2));for(let k=0;k<=steps;k++){const x=Math.round(a[0]+(b[0]-a[0])*k/steps),y=Math.round(a[1]+(b[1]-a[1])*k/steps);for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(xx>=0&&xx<w&&yy>=0&&yy<h)barrier[yy*w+xx]=1;}}
 const labels=new Int32Array(N).fill(-1),queue=new Int32Array(N);let count=0;
 const neighbors=p=>{const x=p%w,y=Math.floor(p/w);return [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1].filter(i=>i>=0);};
 for(let seed=0;seed<N;seed++){if(labels[seed]>=0||!search[seed]||barrier[seed])continue;let head=0,tail=1;queue[0]=seed;labels[seed]=count;
  while(head<tail){const p=queue[head++];for(const j of neighbors(p))if(search[j]&&!barrier[j]&&labels[j]<0){labels[j]=count;queue[tail++]=j;}}count++;
 }
 const holdLabel=hold=>labels[clamp(Math.floor(hold.y*h),0,h-1)*w+clamp(Math.floor(hold.x*w),0,w-1)],counts=new Int32Array(count);for(const hold of holds){const id=holdLabel(hold);if(id>=0)counts[id]++;}
 const pairs=new Map();for(let i=0;i<lines.length;i++){const [a,b]=lines[i],d=diff(b,a),n=unit([-d[1],d[0]]);if(!n)continue;const seen=new Set();
  for(let k=0;k<60;k++){const t=.05+.90*k/59,p=a.map((v,c)=>v+d[c]*t),sampled=[-3,3].map(off=>p.map((v,c)=>Math.round(v+n[c]*off)));if(sampled.some(([x,y])=>x<0||x>=w||y<0||y>=h))continue;
   const ids=sampled.map(([x,y])=>labels[y*w+x]).sort((a,b)=>a-b);if(ids[0]<0||ids[0]===ids[1]||counts[ids[0]]<3||counts[ids[1]]<3)continue;const key=ids.join(',');if(seen.has(key))continue;seen.add(key);if(!pairs.has(key))pairs.set(key,{pair:ids,evidence:[]});pairs.get(key).evidence.push(evidence[i]);
  }
 }
 const parent=Array.from({length:count},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},merged=findMergePairs([...pairs.values()]);
 for(const [a,b] of merged)parent[find(b)]=find(a);for(let p=0;p<N;p++)if(labels[p]>=0)labels[p]=find(labels[p]);
 const distance=new Uint8Array(N).fill(255);let head=0,tail=0;for(let p=0;p<N;p++)if(labels[p]>=0){distance[p]=0;queue[tail++]=p;}
 while(head<tail){const p=queue[head++];if(distance[p]>=2)continue;for(const j of neighbors(p))if(distance[j]===255&&search[j]){distance[j]=distance[p]+1;labels[j]=labels[p];queue[tail++]=j;}}
 const groups=new Map();for(let p=0;p<N;p++){const id=labels[p];if(id<0)continue;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(p);}
 const regions=[];for(const [oldId,ids] of groups){const included=holds.filter(hold=>holdLabel(hold)===oldId),samples=ids.filter(p=>valid[p]&&!mask[p]&&(!input.confidence||input.confidence[p]>1));if(included.length<3||ids.length<N*.006||samples.length<30)continue;
  const first=unit([0,1,2].map(c=>median(samples.map(p=>ns[p*3+c]))));if(!first)continue;
  // Robust plane statistics exclude the minority background/hold normals that
  // leak into a coarse image cell. A mixed cell with no 70% majority abstains.
  const fullSpread=quantile(samples.map(p=>angle([ns[p*3],ns[p*3+1],ns[p*3+2]],first)),.9),inliers=samples.filter(p=>angle([ns[p*3],ns[p*3+1],ns[p*3+2]],first)<20),inlierFraction=inliers.length/samples.length;
  const normal=unit([0,1,2].map(c=>median(inliers.map(p=>ns[p*3+c]))))||first,spread=quantile(inliers.map(p=>angle([ns[p*3],ns[p*3+1],ns[p*3+2]],normal)),.9)??90,usable=inlierFraction>=.7&&spread<=20,rawAngle=angle(normal,raw.floorReference.normal)-90,rounded=Math.round(rawAngle/5)*5;
  const rings=traceSurfaceRings(labels,w,h,oldId,2.1),outer=rings.filter(r=>!r.hole).sort((a,b)=>b.area-a.area);if(!outer.length)continue;
  const xs=outer[0].points.map(p=>p[0]),ys=outer[0].points.map(p=>p[1]),cx=ids.reduce((s,p)=>s+(p%w+.5)/w,0)/ids.length,cy=ids.reduce((s,p)=>s+(Math.floor(p/w)+.5)/h,0)/ids.length;
  const boundarySegments=outer[0].points.map((a,i)=>{const b=outer[0].points[(i+1)%outer[0].points.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,px=clamp(Math.floor(mx*w),0,w-1),py=clamp(Math.floor(my*h),0,h-1);let limit=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=px+dx,y=py+dy;if(x<0||x>=w||y<0||y>=h||!search[y*w+x])limit=true;}
   const direction=[(b[0]-a[0])*w,(b[1]-a[1])*h],length=Math.hypot(...direction);
   const aligned=length>1&&lines.some(([u,v])=>{const d=diff(v,u),len=Math.hypot(...d);return len>1&&Math.abs(dot(direction,d)/(length*len))>.98&&Math.abs(cross(diff([mx*w,my*h],u),d))/len<3;});
   const source=!limit&&aligned?'image-seam':'search-limit';
   return {a,b,source,support:source,verifiedPhysicalSeam:false};
  });
  const uncertainty=Math.max(10,Math.ceil((spread+(raw.floorReference.spread||8)+5)/5)*5);
  regions.push({oldId,id:`surface-${regions.length+1}`,status:usable?'estimated':'uncertain',normal:usable?normal:null,angle:usable?rounded:null,rawAngle:usable?rawAngle:null,spread,range:usable?[Math.max(-90,rounded-uncertainty),Math.min(90,rounded+uncertainty)]:null,polygon:outer[0].points,polygons:outer.map(r=>r.points),holes:[],rings:outer,boundarySegments,anchor:{x:cx,y:cy},roi:{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)},holdCount:included.length,areaFraction:ids.length/N,source:'straight-image-seam-cells',confidence:'low',angleReference:raw.floorReference.source,reason:usable?'Straight image-seam partition; majority-plane angle remains approximate.':'Cell contains inconsistent surface normals; angle unresolved.',metadata:{searchEnvelopeIsPhysicalBoundary:false,rangeMeaning:'Heuristic dispersion, not a calibrated confidence interval',inlierFraction,fullNormalSpread:fullSpread}});
 }
 const map=new Map(regions.map((r,i)=>[r.oldId,i]));for(let p=0;p<N;p++)labels[p]=map.get(labels[p])??-1;
 const perHold=holds.map((hold,i)=>{const unknown={id:hold.id??String(i),status:'uncertain',angle:null,range:null,normal:null,reason:'Hold crosses a straight seam or unresolved cell.'};const sampled=[];
  for(const dx of [-.4,0,.4])for(const dy of [-.4,0,.4]){const x=hold.x+dx*(hold.w||.02),y=hold.y+dy*(hold.h||.025);if(x<0||x>=1||y<0||y>=1)return unknown;sampled.push(labels[Math.floor(y*h)*w+Math.floor(x*w)]);}
  if(sampled[0]<0||sampled.some(id=>id!==sampled[0]))return unknown;const r=regions[sampled[0]];return r.status!=='estimated'?unknown:{...unknown,status:'estimated',angle:r.angle,rawAngle:r.rawAngle,range:r.range,normal:r.normal,spread:r.spread,facetId:r.id,source:r.source,confidence:r.confidence,angleReference:r.angleReference,reason:r.reason};
 });
 const known=perHold.filter(p=>p.status==='estimated').length;
 return retainLocalSurfaceEvidence({...raw,regions:regions.map(({oldId,...rest})=>rest),perHold,labels,seams:lines.map(([a,b])=>({a:[a[0]/w,a[1]/h],b:[b[0]/w,b[1]/h]})),coverage:{known,unknown:holds.length-known,total:holds.length},status:known===0?'uncertain':known===holds.length?'estimated':'partial',diagnostics:{...raw.diagnostics,source:'straight-image-seam-cells',acceptedRegions:regions.length,mergedJointCount:merged.length,edgeEvidence:evidence,warning:'Incomplete seam extraction can leave multiple true faces in one cell.'}},raw.perHold,holds,input);
}
