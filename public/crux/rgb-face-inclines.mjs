// Estimate orientation within fixed RGB labels. Never split, merge or redraw faces.
// Raw OpenCV camera normals: x right, y down, z forward, camera-facing surface side.
export const RGB_NORMAL_CONVENTION = 'opencv-camera-x-right-y-down-z-forward';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=v=>{const n=Math.hypot(...v);return n>.25&&v.every(Number.isFinite)?v.map(x=>x/n):null;};
const angle=(a,b)=>Math.acos(clamp(dot(a,b),-1,1))*180/Math.PI;
const quantile=(a,q)=>{if(!a.length)return NaN;const s=[...a].sort((x,y)=>x-y),p=(s.length-1)*q,i=Math.floor(p);return s[i]+(s[Math.ceil(p)]-s[i])*(p-i);};
const medianNormal=s=>unit([0,1,2].map(c=>quantile(s.map(p=>p.n[c]),.5)));
const validRoi=r=>r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.w>0&&r.h>0;
const inRoi=(x,y,r)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
const unknown=reason=>({status:'uncertain',angle:null,rawAngle:null,range:null,normal:null,spread:null,reason});

function fitNormal(samples,minCount=24){
 const base={sampleCount:samples.length};
 if(samples.length<minCount)return {...unknown('Too little unoccluded face interior.'),diagnostics:base};
 let normal=medianNormal(samples);if(!normal)return {...unknown('Interior normals are inconsistent.'),diagnostics:base};
 const deviations=samples.map(p=>angle(p.n,normal)),cutoff=clamp(3*quantile(deviations,.5),8,20);
 const inliers=samples.filter((p,i)=>deviations[i]<=cutoff),fraction=inliers.length/samples.length;
 if(inliers.length<minCount||fraction<.75)return {...unknown('The fixed RGB face contains inconsistent predicted orientations.'),diagnostics:{...base,inlierFraction:fraction}};
 normal=medianNormal(inliers);const spread=quantile(inliers.map(p=>angle(p.n,normal)),.9);
 let x0=1,x1=0,y0=1,y1=0;for(const p of samples){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
 // A coherent majority must not silently conceal a different spatially coherent corner.
 const tiles=[[],[],[],[]];for(const p of samples)tiles[+(p.x>(x0+x1)/2)+2*+(p.y>(y0+y1)/2)].push(p);
 const tileAngles=tiles.filter(s=>s.length>=8).map(s=>{const n=medianNormal(s);return n?angle(n,normal):180;});
 const diagnostics={...base,inlierCount:inliers.length,inlierFraction:fraction,spread90:spread,tileAngles,angularCutoff:cutoff};
 if(spread>15||tileAngles.some(a=>a>18))return {...unknown('Predicted orientation varies across this fixed RGB face.'),diagnostics};
 return {status:'estimated',normal,spread,diagnostics};
}

// Inclination depends on the vertical component of a normal, not its azimuth.
// A model can disagree about which way a face turns while agreeing on its tilt.
// Keep that usable scalar estimate without inventing a reliable 3D orientation.
function fitInclination(samples,floorReference,orientationFit,minCount=24){
 if(orientationFit.status==='estimated'||samples.length<minCount||!floorReference.normal)return orientationFit;
 const points=samples.map(p=>({...p,tilt:angle(p.n,floorReference.normal)-90}));
 const center=quantile(points.map(p=>p.tilt),.5);
 const deviations=points.map(p=>Math.abs(p.tilt-center)),cutoff=clamp(3*quantile(deviations,.5),4,10);
 const inliers=points.filter((p,i)=>deviations[i]<=cutoff),fraction=inliers.length/points.length;
 if(inliers.length<minCount||fraction<.8)return orientationFit;
 const rawAngle=quantile(inliers.map(p=>p.tilt),.5),spread=quantile(inliers.map(p=>Math.abs(p.tilt-rawAngle)),.9);
 let x0=1,x1=0,y0=1,y1=0;for(const p of points){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
 const tiles=Array.from({length:9},()=>[]);for(const p of points){const col=Math.min(2,Math.floor(3*(p.x-x0)/Math.max(1e-8,x1-x0))),row=Math.min(2,Math.floor(3*(p.y-y0)/Math.max(1e-8,y1-y0)));tiles[row*3+col].push(p);}
 const tileDeviations=tiles.filter(s=>s.length>=8).map(s=>Math.abs(quantile(s.map(p=>p.tilt),.5)-rawAngle));
 if(spread>6||tileDeviations.some(a=>a>8))return orientationFit;
 return {status:'estimated',normal:null,spread,rawAngle,orientationStatus:'uncertain',inclinationOnly:true,diagnostics:{...orientationFit.diagnostics,orientationRejection:orientationFit.reason,tiltSampleCount:points.length,tiltInlierCount:inliers.length,tiltInlierFraction:fraction,tiltSpread90:spread,tiltTileDeviations:tileDeviations,tiltAngularCutoff:cutoff}};
}

function frameSamples(labels,width,height,frame,holds,backgroundLabel){
 const w=frame.width,h=frame.height,N=w*h,ids=new Int32Array(N),boundary=new Uint8Array(N),blocked=new Uint8Array(N);
 const index=(x,y)=>clamp(Math.floor(y*h/height),0,h-1)*w+clamp(Math.floor(x*w/width),0,w-1);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)ids[y*w+x]=labels[Math.min(height-1,Math.floor((y+.5)*height/h))*width+Math.min(width-1,Math.floor((x+.5)*width/w))];
 // Project every full-resolution seam, including narrow labels missed by downsampling.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;if(!x||!y||x===width-1||y===height-1||labels[i]!==labels[i+1]||labels[i]!==labels[i+width])boundary[index(x,y)]=1;
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(boundary[y*w+x])for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h)blocked[yy*w+xx]=1;
 }
 for(const q of holds){
  if(![q.x,q.y].every(Number.isFinite))continue;
  const x0=clamp(Math.floor((q.x-(q.w||.01)*.6)*w)-2,0,w-1),x1=clamp(Math.ceil((q.x+(q.w||.01)*.6)*w)+2,0,w-1);
  const y0=clamp(Math.floor((q.y-(q.h||.01)*.6)*h)-2,0,h-1),y1=clamp(Math.ceil((q.y+(q.h||.01)*.6)*h)+2,0,h-1);
  for(let y=y0;y<=y1;y++)blocked.fill(1,y*w+x0,y*w+x1+1);
 }
 const faces=new Map(),floorTiles=Array.from({length:12},()=>[]),eligible=new Map();
 // Sampling is bounded at model resolution; pixel counts are not camera calibration.
 const stride=Math.max(1,Math.ceil(Math.sqrt(N/180000)));
 for(let y=0;y<h;y+=stride)for(let x=0;x<w;x+=stride){
  const i=y*w+x;if(blocked[i])continue;const id=ids[i],nx=(x+.5)/w,ny=(y+.5)/h;
  if(id!==backgroundLabel)eligible.set(id,(eligible.get(id)||0)+1);
  if(frame.confidence&&(!Number.isFinite(frame.confidence[i])||frame.confidence[i]<(frame.confidenceThreshold??.5)))continue;
  const n=unit([frame.normals[i],frame.normals[N+i],frame.normals[2*N+i]]);if(!n)continue;
  const p={n,x:nx,y:ny};
  if(id!==backgroundLabel){if(!faces.has(id))faces.set(id,[]);faces.get(id).push(p);}
  else if(ny>=.65&&n[1]<-.55){const col=Math.min(3,Math.floor(nx*4)),row=Math.min(2,Math.floor((ny-.65)/.35*3));floorTiles[row*4+col].push(p);}
 }
 return {faces,eligible,floorTiles,stride};
}

function floorFromTiles(tiles){
 const candidates=tiles.map((samples,tile)=>({...fitNormal(samples),tile})).filter(p=>p.status==='estimated'&&p.spread<=10);
 let cluster=[];for(const p of candidates){const near=candidates.filter(q=>angle(p.normal,q.normal)<=10);if(near.length>cluster.length)cluster=near;}
 const columns=new Set(cluster.map(p=>p.tile%4));
 if(cluster.length>=2&&columns.size>=2&&cluster.length>=candidates.length*.65){
  const normal=medianNormal(cluster.map(p=>({n:p.normal}))),spread=Math.max(...cluster.map(p=>p.spread+angle(normal,p.normal)));
  return {status:'estimated',normal,spread,source:'model-floor-normal',candidateCount:candidates.length,consistentCount:cluster.length,tiles:cluster.map(p=>p.tile),reason:'Coherent lower-photo background normals used as a possible floor; not measured camera calibration.'};
 }
 return {status:'assumed',normal:[0,-1,0],spread:null,source:'camera-upright-assumption',candidateCount:candidates.length,consistentCount:cluster.length,reason:'A consistent floor reference is unavailable; angles assume an upright camera.'};
}

function regionRoi(region){
 if(validRoi(region.roi))return region.roi;
 const p=region.polygon;if(!p?.length)return null;const xs=p.map(q=>q[0]),ys=p.map(q=>q[1]);
 return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
}

/** Labels remain authoritative and are returned unchanged. IDs must be numeric or
 * regions must include labelId. Normals must map the entire image, without padding.
 * Confidence is optional model validity, never a calibrated angle probability.
 */
export function estimateRgbFaceInclines({labels,width,height,regions=[],normalFrame,holds=[],pixelWidth,pixelHeight,wallRoi,backgroundLabel=0}={}){
 const started=typeof performance!=='undefined'?performance.now():Date.now(),source='rgb-face-model-normal';
 const frame=normalFrame||{},N=frame.width*frame.height;
 let invalid=null;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||!labels||labels.length!==width*height)invalid='Invalid fixed RGB label raster.';
 else if(!Number.isInteger(frame.width)||!Number.isInteger(frame.height)||frame.width<2||frame.height<2||!frame.normals||frame.normals.length!==N*3||frame.confidence&&frame.confidence.length!==N)invalid='Invalid full-photo normal frame.';
 else if(frame.coordinateConvention!==RGB_NORMAL_CONVENTION||frame.normalOrientation!=='camera-facing')invalid='Normal coordinate convention or surface orientation is not declared.';
 else if(frame.normalLayout&&frame.normalLayout!=='chw')invalid='Expected planar CHW raw normals.';
 else if(frame.fullImage===false||frame.crop||frame.padding)invalid='Normal frame must be aligned to the whole photo without cropping or padding.';
 const samples=invalid?null:frameSamples(labels,width,height,frame,holds,backgroundLabel);
 const floorReference=samples?floorFromTiles(samples.floorTiles):{status:'uncertain',normal:null,source:'unavailable',reason:invalid};
 const inferred=regions.map(input=>{
  const points=p=>p?.map(q=>Array.isArray(q)?q:[q.x,q.y]);
  const region={...input,polygon:points(input.polygon),polygons:input.polygons?.map(points),holes:input.holes?.map(points)};
  const labelId=region.labelId??(typeof region.id==='number'?region.id:null),roi=regionRoi(region);
  const faceSamples=samples?.faces.get(labelId)||[];
  let fit=invalid?unknown(invalid):!Number.isInteger(labelId)||labelId===backgroundLabel?unknown('The RGB region has no valid label ID.'):fitInclination(faceSamples,floorReference,fitNormal(faceSamples));
  const eligible=samples?.eligible.get(labelId)||0,usable=samples?.faces.get(labelId)?.length||0;
  if(fit.status==='estimated'&&usable/Math.max(1,eligible)<.35)fit={...unknown('Most face-interior normals are invalid.'),diagnostics:fit.diagnostics};
  const boundarySegments=region.boundarySegments||region.polygon?.map((a,i)=>({a,b:region.polygon[(i+1)%region.polygon.length],source:'image-seam',verifiedPhysicalSeam:false}));
  const base={...region,labelId,roi,...fit,source,confidence:'low',angleReference:floorReference.source,boundary:region.boundary||'rgb-seam-graph',boundarySource:'rgb-seam-graph',boundarySegments,diagnostics:{...fit.diagnostics,eligibleInteriorSamples:eligible,usableInteriorSamples:usable,geometryPreserved:true}};
  if(fit.status!=='estimated')return base;
  const rawAngle=Number.isFinite(fit.rawAngle)?fit.rawAngle:angle(fit.normal,floorReference.normal)-90,rounded=Math.abs(rawAngle)<2.5?0:Math.round(rawAngle/5)*5;
  const margin=Math.max(10,Math.ceil((fit.spread+(floorReference.spread??15)+5)/5)*5);
  const reason=fit.inclinationOnly?(floorReference.status==='estimated'?'Rough inclination from model normals and a possible floor reference; full 3D orientation remains uncertain.':'Rough inclination assuming an upright camera; full 3D orientation remains uncertain.'):(floorReference.status==='estimated'?'Rough face orientation from model normals and a possible floor reference.':'Rough face orientation assuming an upright camera.');
  return {...base,angle:rounded,rawAngle,range:[Math.max(-90,rounded-margin),Math.min(90,rounded+margin)],reason,metadata:{rangeMeaning:'Heuristic angular dispersion and reference allowance; not a calibrated confidence interval',physicalMeasurement:false}};
 });
 const byLabel=new Map(inferred.map(r=>[r.labelId,r]));
 const perHold=holds.map((hold,i)=>{
  const no={id:hold.id??String(i),...unknown('The hold footprint crosses a face boundary or unresolved surface.'),source};
  if(invalid||![hold.x,hold.y].every(Number.isFinite)||wallRoi&&validRoi(wallRoi)&&!inRoi(hold.x,hold.y,wallRoi))return no;
  const bw=hold.w||.01,bh=hold.h||.01,left=hold.x-bw/2,right=hold.x+bw/2,top=hold.y-bh/2,bottom=hold.y+bh/2;
  if(!(bw>0&&bh>0&&left>=0&&right<1&&top>=0&&bottom<1))return no;
  let id=null;for(let y=Math.floor(top*height);y<=Math.floor(bottom*height);y++)for(let x=Math.floor(left*width);x<=Math.floor(right*width);x++){
   const v=labels[y*width+x];if(v===backgroundLabel||id!==null&&id!==v)return no;id=v;
  }
  const r=byLabel.get(id);if(r?.status!=='estimated')return no;
  return {id:no.id,status:'estimated',angle:r.angle,rawAngle:r.rawAngle,range:r.range,normal:r.normal,spread:r.spread,facetId:r.id,labelId:id,source,confidence:'low',angleReference:r.angleReference,reason:r.reason,inclinationOnly:!!r.inclinationOnly,orientationStatus:r.orientationStatus||'estimated'};
 });
 const known=perHold.filter(p=>p.status==='estimated').length,knownRegions=inferred.filter(r=>r.status==='estimated'),angles=knownRegions.map(r=>r.angle),total=holds.length||regions.length,count=holds.length?known:knownRegions.length;
 const patches=inferred.map(r=>({...r,x:r.roi?r.roi.x+r.roi.w/2:null,y:r.roi?r.roi.y+r.roi.h/2:null}));
 return {status:count===0?'uncertain':count===total?'estimated':'partial',source,confidence:'low',labels,width,height,pixelWidth,pixelHeight,wallRoi,regions:inferred,facets:inferred,patches,perHold,floorReference,coverage:{known,unknown:holds.length-known,total:holds.length,fraction:holds.length?known/holds.length:0,unit:'holds'},angleRange:angles.length?[Math.min(...angles),Math.max(...angles)]:null,reason:invalid||floorReference.reason,diagnostics:{method:'Robust interior normal median within fixed RGB labels',geometryPreserved:true,normalCoordinateConvention:frame.coordinateConvention,normalOrientation:frame.normalOrientation,sampleStride:samples?.stride,normalPixelSeamMargin:2,extraModelInferences:0,rangeMeaning:'Heuristic ranges, not calibrated confidence intervals',elapsedMs:(typeof performance!=='undefined'?performance.now():Date.now())-started}};
}
