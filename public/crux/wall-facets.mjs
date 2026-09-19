// Long image seams propose polygon boundaries; masked depth verifies their slopes.
// Neither a plywood joint nor a color change is itself evidence of an incline.
import {fitMetricPlane} from './incline-geometry.mjs?v=23';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
const degrees=(a,b)=>Math.acos(clamp(dot(a,b),-1,1))*180/Math.PI;
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
export function inPolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const bounds=p=>{const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};};
export function clipToRect(poly,r){return [{a:1,b:0,c:r.x},{a:-1,b:0,c:-r.x-r.w},{a:0,b:1,c:r.y},{a:0,b:-1,c:-r.y-r.h}].reduce((p,l)=>clipPolygon(p,l),poly);}
export function clipPolygon(poly,line,sign=1){
 const result=[],distance=p=>sign*(line.a*p[0]+line.b*p[1]-line.c);
 for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=distance(p),dq=distance(q);if(dp>=-1e-9)result.push(p);if((dp>0)!==(dq>0)&&Math.abs(dp-dq)>1e-12){const t=dp/(dp-dq);result.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}
 return result;
}
const masked=(x,y,holds)=>holds.some(h=>Math.abs(x-h.x)<(h.w||.02)*.62&&Math.abs(y-h.y)<(h.h||.025)*.62);

export function detectWallSeams({pixels,pixelWidth,pixelHeight,imageAspect,holds,polygon}){
 if(!pixels||pixels.length!==pixelWidth*pixelHeight*4||polygon.length<3||imageAspect<.4||imageAspect>3)return [];
 const w=640,h=Math.max(120,Math.round(w/imageAspect)),n=w*h,gray=new Float32Array(n),mask=new Uint8Array(n),g=new Float32Array(n),angles=new Float32Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const px=Math.min(pixelWidth-1,Math.floor(x/w*pixelWidth)),py=Math.min(pixelHeight-1,Math.floor(y/h*pixelHeight)),i=(py*pixelWidth+px)*4;
  gray[y*w+x]=.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2];
  mask[y*w+x]=inPolygon(x/w,y/h,polygon)&&!masked(x/w,y/h,holds)?1:0;
 }
 const magnitudes=[];
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=y*w+x;if(!mask[i])continue;
  const gx=(gray[i+1-w]+2*gray[i+1]+gray[i+1+w]-gray[i-1-w]-2*gray[i-1]-gray[i-1+w])/4;
  const gy=(gray[i+w-1]+2*gray[i+w]+gray[i+w+1]-gray[i-w-1]-2*gray[i-w]-gray[i-w+1])/4;
  g[i]=Math.hypot(gx,gy);angles[i]=(Math.atan2(gy,gx)+Math.PI)%Math.PI;if(g[i]>2)magnitudes.push(g[i]);
 }
 magnitudes.sort((a,b)=>a-b);const threshold=Math.max(4,magnitudes[Math.floor(magnitudes.length*.28)]||4);
 const radius=Math.ceil(Math.hypot(w,h)),stride=radius*2+1,bins=180,votes=new Float32Array(stride*bins),cos=[],sin=[],edges=[];
 for(let t=0;t<bins;t++){cos[t]=Math.cos(t*Math.PI/bins);sin[t]=Math.sin(t*Math.PI/bins);}
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=y*w+x;if(g[i]<threshold)continue;edges.push({x,y,g:g[i],angle:angles[i]});
  const center=Math.round(angles[i]/Math.PI*bins);
  for(let d=-5;d<=5;d++){const t=(center+d+bins)%bins,r=Math.round(x*cos[t]+y*sin[t])+radius;votes[t*stride+r]+=Math.min(3,g[i]/threshold);}
 }
 const peaks=[];
 for(let t=0;t<bins;t++)for(let r=1;r<stride-1;r++){const v=votes[t*stride+r];if(v>18&&v>=votes[t*stride+r-1]&&v>=votes[t*stride+r+1])peaks.push({t,r:r-radius,v});}
 peaks.sort((a,b)=>b.v-a.v);const lines=[],distinct=[];
 for(const peak of peaks){if(!distinct.some(p=>Math.abs(p.t-peak.t)<3&&Math.abs(p.r-peak.r)<5))distinct.push(peak);if(distinct.length>=400)break;}
 for(const peak of distinct){
  const a=cos[peak.t],b=sin[peak.t],c=peak.r;
  if(lines.some(l=>Math.abs(l.a/w*a+l.b/h*b)>.995&&Math.min(Math.abs(l.c-c),Math.abs(l.c+c))<5))continue;
  const support=edges.filter(p=>Math.abs(a*p.x+b*p.y-c)<1.8&&Math.abs(Math.cos(p.angle-peak.t*Math.PI/bins))>.965).map(p=>-b*p.x+a*p.y).sort((a,b)=>a-b);
  if(support.length<20)continue;
  let best=[],run=[];for(const t of support){if(run.length&&t-run.at(-1)>Math.max(12,Math.hypot(w,h)*.035)){if(run.length>best.length)best=run;run=[];}run.push(t);}if(run.length>best.length)best=run;
  const start=best[0],end=best.at(-1),length=end-start;
  if(length<Math.hypot(w,h)*.14)continue;
  const occupied=new Set(best.map(x=>Math.round(x/3))),coverage=Math.min(1,occupied.size/(length/3));
  if(coverage<.42)continue;
  lines.push({a:a*w,b:b*h,c,start,end,length,coverage,score:length*coverage,source:'image-seam'});
  if(lines.length>=70)break;
 }
 const distinctLines=[];
 for(const l of lines.sort((a,b)=>b.score-a.score)){
  const nx=l.a/w,ny=l.b/h,t=(l.start+l.end)/2,mx=nx*l.c-ny*t,my=ny*l.c+nx*t;
  if(!distinctLines.some(p=>Math.abs(p.a/w*nx+p.b/h*ny)>.99&&Math.abs(p.a/w*mx+p.b/h*my-p.c)<5))distinctLines.push(l);
 }
 return distinctLines.slice(0,32);
}

// Build planar faces from intersections of finite seam segments. Extending
// every line to the image border would invent wall boundaries behind holds.
export function closedSeamFaces(lines,imageAspect){
 const w=640,h=Math.max(120,Math.round(w/imageAspect)),nodes=[],edges=new Set(),onLine=lines.map(()=>[]);
 const node=p=>{const found=nodes.findIndex(n=>Math.hypot((n[0]-p[0])*w,(n[1]-p[1])*h)<2);if(found>=0)return found;nodes.push(p);return nodes.length-1;};
 const within=(l,p)=>{const t=-l.b/h*p[0]*w+l.a/w*p[1]*h;return t>=l.start-8&&t<=l.end+8;};
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
  const a=lines[i],b=lines[j],d=a.a*b.b-a.b*b.a;if(Math.abs(d)/(w*h)<.12)continue;
  const p=[(a.c*b.b-a.b*b.c)/d,(a.a*b.c-a.c*b.a)/d];
  if(p.some(x=>x<0||x>1)||!within(a,p)||!within(b,p))continue;
  const id=node(p);onLine[i].push(id);onLine[j].push(id);
 }
 for(let i=0;i<lines.length;i++){
  const l=lines[i],ids=[...new Set(onLine[i])].sort((a,b)=>-l.b/h*(nodes[a][0]-nodes[b][0])*w+l.a/w*(nodes[a][1]-nodes[b][1])*h);
  for(let j=1;j<ids.length;j++)edges.add([ids[j-1],ids[j]].sort((a,b)=>a-b).join(':'));
 }
 const adjacent=nodes.map(()=>[]);for(const e of edges){const [a,b]=e.split(':').map(Number);adjacent[a].push(b);adjacent[b].push(a);}
 adjacent.forEach((ids,i)=>ids.sort((a,b)=>Math.atan2((nodes[a][1]-nodes[i][1])*h,(nodes[a][0]-nodes[i][0])*w)-Math.atan2((nodes[b][1]-nodes[i][1])*h,(nodes[b][0]-nodes[i][0])*w)));
 const visited=new Set(),faces=[];
 for(let start=0;start<nodes.length;start++)for(const next of adjacent[start]){
  if(visited.has(`${start}:${next}`))continue;
  let a=start,b=next;const polygon=[];let closed=false;
  for(let k=0;k<edges.size*2+1;k++){
   const key=`${a}:${b}`;if(visited.has(key))break;visited.add(key);polygon.push(nodes[a]);
   const neighbors=adjacent[b],at=neighbors.indexOf(a),c=neighbors[(at-1+neighbors.length)%neighbors.length];a=b;b=c;
   if(a===start&&b===next){closed=true;break;}
  }
  if(!closed||polygon.length<3)continue;
  const signed=polygon.reduce((s,p,i)=>{const q=polygon[(i+1)%polygon.length];return s+p[0]*q[1]-p[1]*q[0];},0)/2;
  if(signed>.008&&signed<.8)faces.push(polygon);
 }
 return faces;
}

export function fitFace(poly,common,holds,floor,limit=null){
 const roi=limit||bounds(poly),accept=(x,y)=>inPolygon(x,y,poly)&&!masked(x,y,holds);
 const result={status:'uncertain',angle:null,range:null,normal:null,roi,reason:'Face angle is unclear.',source:'photo-seam',confidence:'low'};
 if(!common.depth||common.depth.length!==common.width*common.height)return result;
 const plane=fitMetricPlane({...common,roi,accept});
 if(!plane||plane.count<65)return result;
 result.diagnostics={residual90:plane.residual90,count:plane.count};
 if(plane.residual90>.04||plane.residualMedian>.018)return result;
 if(floor?.status!=='estimated'){result.reason='A clear floor reference is missing.';return result;}
 const base=2*Math.tan(65*Math.PI/360),angles=[50,65,80].map((f,i)=>degrees(unit([plane.normal[0]*base/(2*Math.tan(f*Math.PI/360)),plane.normal[1]*base/(2*Math.tan(f*Math.PI/360)),plane.normal[2]]),floor.normalsByFov[i])-90);
 result.diagnostics.angles=angles;
 if(angles[1]<-35||angles[1]>88)return result;
 // Do not turn a smooth depth error spanning a crease into one wall angle.
 const halves=[{...roi,w:roi.w/2},{...roi,x:roi.x+roi.w/2,w:roi.w/2},{...roi,h:roi.h/2},{...roi,y:roi.y+roi.h/2,h:roi.h/2}].map(r=>fitMetricPlane({...common,roi:r,accept})).filter(Boolean);
 if(halves.length<2||halves.some(p=>p.count>45&&degrees(p.normal,plane.normal)>12))return result;
 const angle=Math.abs(angles[1])<5?0:Math.round(angles[1]/5)*5;
 return {...result,status:'estimated',normal:plane.normal,angle,range:[Math.max(-35,Math.floor(Math.min(...angles)/5)*5-5),Math.min(90,Math.ceil(Math.max(...angles)/5)*5+5)],reason:'Seam-bounded photo plane; angle remains approximate.'};
}

export function creaseEvidence(poly,common,holds=[]){
 let confirmed=0;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
  if(Math.hypot((a[0]-b[0])*common.imageAspect,a[1]-b[1])<.1)continue;
  const roi={x:clamp(x-.08,0,.84),y:clamp(y-.10,0,.8),w:.16,h:.20};
  const planes=[true,false].map(inside=>fitMetricPlane({...common,roi,accept:(x,y)=>inPolygon(x,y,poly)===inside&&!masked(x,y,holds)}));
  if(planes.every(p=>p&&p.count>=65&&p.residual90<.04)&&degrees(planes[0].normal,planes[1].normal)>8)confirmed++;
 }
 return confirmed;
}

// Every automatic boundary must be supported by a finite image segment. The
// hold envelope is only a search limit, never evidence for a physical edge.
function enclosed(poly,lines,imageAspect){
 const w=640,h=Math.max(120,Math.round(w/imageAspect));
 return poly.every((a,i)=>{const b=poly[(i+1)%poly.length];
  if(Math.hypot((a[0]-b[0])*w,(a[1]-b[1])*h)<5)return true;
  return lines.some(l=>{
   if(Math.abs(l.a*a[0]+l.b*a[1]-l.c)>2.5||Math.abs(l.a*b[0]+l.b*b[1]-l.c)>2.5)return false;
   const ts=[a,b].map(p=>-l.b/h*p[0]*w+l.a/w*p[1]*h),lo=Math.min(...ts),hi=Math.max(...ts);
   return Math.max(0,Math.min(hi,l.end)-Math.max(lo,l.start))>=.85*(hi-lo);
  });
 });
}
export function supportingFace(hold,facets){
 const face=facets.find(f=>inPolygon(hold.x,hold.y,f.polygon));if(!face)return null;
 // The center alone can attach a large hold to the other side of a crease.
 const w=(hold.w||.02)*.4,h=(hold.h||.02)*.4;
 return [[-w,0],[w,0],[0,-h],[0,h],[-w,-h],[-w,h],[w,-h],[w,h]].every(([dx,dy])=>inPolygon(hold.x+dx,hold.y+dy,face.polygon))?face:null;
}
export function estimateSeamFacets({pixels,pixelWidth,pixelHeight,depth,width=518,height=518,imageAspect,wallRoi,holds=[],floorReference}){
 const common={depth,width,height,imageAspect};
 let candidates=[],lines=[];
 {
  const polygon=[[wallRoi.x,wallRoi.y],[wallRoi.x+wallRoi.w,wallRoi.y],[wallRoi.x+wallRoi.w,wallRoi.y+wallRoi.h],[wallRoi.x,wallRoi.y+wallRoi.h]];
  if(polygon.length>=3&&pixels){
   lines=detectWallSeams({pixels,pixelWidth,pixelHeight,imageAspect,holds,polygon});
   candidates=closedSeamFaces(lines,imageAspect).filter(p=>enclosed(p,lines,imageAspect)&&holds.filter(h=>inPolygon(h.x,h.y,p)).length>=3).map((polygon,i)=>({id:`face-${i+1}`,polygon,boundary:'automatic-seams'}));
  }
 }
 const facets=candidates.map(f=>({...f,...fitFace(f.polygon,common,holds,floorReference),boundary:'automatic-seams'}));
 // An automatically enclosed region also needs a consistent depth plane:
 // closed painted patterns alone do not establish a plane.
 const accepted=facets.filter(f=>f.status==='estimated'&&creaseEvidence(f.polygon,common,holds)>=2);
 const perHold=holds.map(h=>{
  const face=supportingFace(h,accepted);
  if(!face)return {id:h.id,status:'uncertain',angle:null,range:null,normal:null,blockedBySeam:accepted.some(f=>[-1,0,1].some(dx=>[-1,0,1].some(dy=>inPolygon(h.x+dx*(h.w||.02)*.4,h.y+dy*(h.h||.02)*.4,f.polygon)))),source:'photo-seam',reason:'The supporting face or seam is unclear.'};
  const w=clamp((h.w||0)*3,.16,.22),ht=clamp((h.h||0)*3,.19,.26),roi={x:Math.max(wallRoi.x,h.x-w/2),y:Math.max(wallRoi.y,h.y-ht/2),w:0,h:0};
  roi.w=Math.min(wallRoi.x+wallRoi.w,h.x+w/2)-roi.x;roi.h=Math.min(wallRoi.y+wallRoi.h,h.y+ht/2)-roi.y;
  const local=face.status==='estimated'?face:fitFace(face.polygon,common,holds,floorReference,roi);
  return {id:h.id,...local,facetId:face.id,polygon:clipToRect(face.polygon,roi),x:h.x,y:h.y,roi};
 });
 return {facets:accepted,perHold,source:'photo-seams',diagnostics:{candidateSeams:lines.length,acceptedFaces:accepted.length,extraModelInferences:0}};
}

export function attachSeamFacets(local,seams){
 const byId=new Map(seams.perHold.map(h=>[h.id,h]));
 // Existing point estimates can remain outside automatic enclosures, but are
 // never drawn as a rectangular face.
 const perHold=local.perHold.map(h=>byId.get(h.id)?.facetId||byId.get(h.id)?.blockedBySeam?byId.get(h.id):h);
 const known=perHold.filter(h=>h.status==='estimated'),total=perHold.length,angles=known.map(h=>h.angle);
 return {...local,facets:seams.facets,facetSource:seams.source,regions:[],perHold,
  patches:perHold.filter(h=>h.polygon&&h.status==='estimated'),
  coverage:{known:known.length,unknown:total-known.length,total,fraction:total?known.length/total:0,unit:'holds'},
  status:known.length===0?'uncertain':known.length===total?'estimated':'partial',
  reason:known.length?'Rough local photo angles; unverified slopes remain unknown.':'No local face angles could be verified.',
  angleRange:angles.length?[Math.min(...angles),Math.max(...angles)]:null,
  diagnostics:{...local.diagnostics,seams:seams.diagnostics}};
}
