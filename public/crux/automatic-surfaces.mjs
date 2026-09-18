// Browser-only candidate wall surfaces. Inputs are pixels, learned normals and
// detected hold boxes. No image identity, authored vertices or network calls.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit=a=>{const n=Math.hypot(...a);return n>1e-9?a.map(v=>v/n):null;};
const angle=(a,b)=>Math.acos(clamp(dot(a,b),-1,1))*180/Math.PI;
const percentile=(a,p)=>{if(!a.length)return null;a.sort((a,b)=>a-b);const x=(a.length-1)*p,i=Math.floor(x);return a[i]+(a[Math.ceil(x)]-a[i])*(x-i);};
const median=a=>percentile(a,.5);
const polyArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
export function pointInSurface(x,y,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function hull(points){
 const p=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=ps=>{const out=[];for(const q of ps){while(out.length>1&&cross(out.at(-2),out.at(-1),q)<=0)out.pop();out.push(q);}return out;};
 return [...half(p).slice(0,-1),...half([...p].reverse()).slice(0,-1)];
}
function masks(width,height,holds,roi){
 const holdMask=new Uint8Array(width*height),search=new Uint8Array(width*height),points=[];
 for(const h of holds){
  if(!Number.isFinite(h.x)||!Number.isFinite(h.y))continue;
  const dx=(h.w||.02)*.56,dy=(h.h||.025)*.56;
  for(const s of [-1,1])for(const t of [-1,1])points.push([clamp(h.x+s*dx,roi.x,roi.x+roi.w),clamp(h.y+t*dy,roi.y,roi.y+roi.h)]);
  const x0=clamp(Math.floor((h.x-dx)*width),0,width-1),x1=clamp(Math.ceil((h.x+dx)*width),0,width-1),y0=clamp(Math.floor((h.y-dy)*height),0,height-1),y1=clamp(Math.ceil((h.y+dy)*height),0,height-1);
  for(let y=y0;y<=y1;y++)holdMask.fill(1,y*width+x0,y*width+x1+1);
 }
 const polygon=points.length>=12?hull(points):[[roi.x,roi.y],[roi.x+roi.w,roi.y],[roi.x+roi.w,roi.y+roi.h],[roi.x,roi.y+roi.h]];
 // The envelope bounds computation, never claims a physical wall edge.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pointInSurface((x+.5)/width,(y+.5)/height,polygon))search[y*width+x]=1;
 const expanded=new Uint8Array(search);const pad=Math.max(2,Math.round(width*.008));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(search[y*width+x])for(let yy=Math.max(0,y-pad);yy<=Math.min(height-1,y+pad);yy++)expanded.fill(1,yy*width+Math.max(0,x-pad),yy*width+Math.min(width,x+pad+1));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x/width<roi.x||x/width>roi.x+roi.w||y/height<roi.y||y/height>roi.y+roi.h)expanded[y*width+x]=0;
 return {holdMask,search:expanded,polygon};
}
function principal(points){
 let mx=0,my=0;for(const p of points){mx+=p[0];my+=p[1];}mx/=points.length;my/=points.length;
 let xx=0,yy=0,xy=0;for(const p of points){const x=p[0]-mx,y=p[1]-my;xx+=x*x;yy+=y*y;xy+=x*y;}
 const a=.5*Math.atan2(2*xy,xx-yy),u=[Math.cos(a),Math.sin(a)],n=[-u[1],u[0]],ts=points.map(p=>(p[0]-mx)*u[0]+(p[1]-my)*u[1]);
 const lo=Math.min(...ts),hi=Math.max(...ts),rms=Math.sqrt(points.reduce((s,p)=>s+((p[0]-mx)*n[0]+(p[1]-my)*n[1])**2,0)/points.length);
 return {a:[mx+lo*u[0],my+lo*u[1]],b:[mx+hi*u[0],my+hi*u[1]],u,n,c:mx*n[0]+my*n[1],length:hi-lo,rms};
}

// A bounded gradient-aligned segment extractor, rather than a closed-face gate.
// Short collinear observations may bridge occluding holds; confidence remains
// observed coverage, not a probability that an edge is a manufactured crease.
export function detectSurfaceSeams({pixels,pixelWidth,pixelHeight,holds=[],wallRoi={x:0,y:0,w:1,h:1},fullGradient=false}){
 if(!pixels||pixels.length!==pixelWidth*pixelHeight*4||pixelWidth<4||pixelHeight<4)return [];
 const scale=Math.min(1,1280/Math.max(pixelWidth,pixelHeight)),w=Math.max(4,Math.round(pixelWidth*scale)),h=Math.max(4,Math.round(pixelHeight*scale)),N=w*h;
 const {holdMask,search}=masks(w,h,holds,wallRoi),gray=new Float32Array(N),gx=new Float32Array(N),gy=new Float32Array(N),mag=new Float32Array(N),thin=new Uint8Array(N);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const px=clamp(Math.round((x+.5)/w*pixelWidth-.5),0,pixelWidth-1),py=clamp(Math.round((y+.5)/h*pixelHeight-.5),0,pixelHeight-1),i=(py*pixelWidth+px)*4;gray[y*w+x]=.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2];}
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;gx[i]=(gray[i+1-w]+2*gray[i+1]+gray[i+1+w]-gray[i-1-w]-2*gray[i-1]-gray[i-1+w])/4;gy[i]=(gray[i+w-1]+2*gray[i+w]+gray[i+w+1]-gray[i-w-1]-2*gray[i-w]-gray[i-w+1])/4;mag[i]=Math.hypot(gx[i],gy[i]);}
 const order=[];
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=y*w+x;if(!search[i]||(!fullGradient&&holdMask[i])||mag[i]<4)continue;
  const ax=Math.abs(gx[i]),ay=Math.abs(gy[i]);let d;
  if(ay<ax*.4142)d=1;else if(ax<ay*.4142)d=w;else d=gx[i]*gy[i]>0?w+1:w-1;
  if(!fullGradient&&(mag[i]<mag[i-d]||mag[i]<mag[i+d]))continue;thin[i]=1;order.push(i);
 }
 order.sort((a,b)=>mag[b]-mag[a]);const seen=new Uint8Array(N),raw=[],cos=Math.cos(22*Math.PI/180),queue=new Int32Array(N);
 for(const start of order){
  if(seen[start])continue;let head=0,tail=1;queue[0]=start;seen[start]=1;const sx=gx[start]/mag[start],sy=gy[start]/mag[start];
  while(head<tail&&tail<6000){const p=queue[head++],x=p%w,y=Math.floor(p/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<1||xx>=w-1||yy<1||yy>=h-1)continue;const j=yy*w+xx;if(!thin[j]||seen[j]||Math.abs((gx[j]*sx+gy[j]*sy)/mag[j])<cos)continue;seen[j]=1;queue[tail++]=j;}}
  if(tail<6)continue;const ps=Array.from(queue.subarray(0,tail),p=>[p%w,Math.floor(p/w)]),line=principal(ps);
  if(line.length<7||line.rms>(fullGradient?2.3:1.8)||tail/line.length<.45||fullGradient&&ps.filter(p=>holdMask[p[1]*w+p[0]]).length/ps.length>.45)continue;raw.push({...line,used:false});
 }
 raw.sort((a,b)=>b.length-a.length);const selected=raw.slice(0,2500),groups=[];
 for(const seed of selected){
  if(seed.used)continue;const members=selected.filter(l=>!l.used&&Math.abs(seed.u[0]*l.u[0]+seed.u[1]*l.u[1])>Math.cos(3*Math.PI/180)&&Math.max(Math.abs(seed.n[0]*l.a[0]+seed.n[1]*l.a[1]-seed.c),Math.abs(seed.n[0]*l.b[0]+seed.n[1]*l.b[1]-seed.c))<6);
  const model=principal(members.flatMap(l=>[l.a,l.b])),u=model.u,center=model.a;
  const intervals=members.map(l=>({l,ts:[l.a,l.b].map(p=>(p[0]-center[0])*u[0]+(p[1]-center[1])*u[1]).sort((a,b)=>a-b)})).sort((a,b)=>a.ts[0]-b.ts[0]);
  const runs=[];let run=[],end=-Infinity;
  for(const v of intervals){if(v.ts[0]-end>w*.2){if(run.length)runs.push(run);run=[];}run.push(v);end=Math.max(end,v.ts[1]);}if(run.length)runs.push(run);
  for(const rs of runs){const lo=rs[0].ts[0],hi=Math.max(...rs.map(v=>v.ts[1])),span=hi-lo;let visible=0,last=-Infinity;for(const v of rs){visible+=Math.max(0,v.ts[1]-Math.max(v.ts[0],last));last=Math.max(last,v.ts[1]);}if(span<w*.09||visible<span*.35)continue;for(const v of rs)v.l.used=true;groups.push({a:[(center[0]+lo*u[0])/w,(center[1]+lo*u[1])/h],b:[(center[0]+hi*u[0])/w,(center[1]+hi*u[1])/h],coverage:Math.min(1,visible/span),observedLength:visible/w,source:'gradient-seam-chain'});}
 }
 return groups.sort((a,b)=>b.observedLength-a.observedLength).slice(0,50);
}
function seamBarrier(seams,w,h){
 let lines=seams.map(l=>[l.a.map((v,i)=>v*(i?h:w)),l.b.map((v,i)=>v*(i?h:w))]);
 for(let pass=0;pass<2;pass++)lines=lines.map((line,i)=>{const [a,b]=line,len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<1)return line;const u=[(b[0]-a[0])/len,(b[1]-a[1])/len];return line.map(p=>{let best=p,dist=w*.05;for(let j=0;j<lines.length;j++){if(i===j)continue;const [c,d]=lines[j],l=Math.hypot(d[0]-c[0],d[1]-c[1]);if(l<1)continue;const v=[(d[0]-c[0])/l,(d[1]-c[1])/l],cross=u[0]*v[1]-u[1]*v[0];if(Math.abs(cross)<.15)continue;const t=((c[0]-a[0])*v[1]-(c[1]-a[1])*v[0])/cross,q=[a[0]+t*u[0],a[1]+t*u[1]],distance=Math.hypot(q[0]-p[0],q[1]-p[1]),position=(q[0]-c[0])*v[0]+(q[1]-c[1])*v[1];if(distance<dist&&position>=-w*.05&&position<=l+w*.05){best=q;dist=distance;}}return best;});});
 const out=new Uint8Array(w*h);
 for(const [a,b] of lines){const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2);for(let k=0;k<=steps;k++){const x=Math.round(a[0]+(b[0]-a[0])*k/Math.max(1,steps)),y=Math.round(a[1]+(b[1]-a[1])*k/Math.max(1,steps));for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h)out[yy*w+xx]=1;}}}
 return out;
}
function smoothNormals(input,w,h,layout){
 const N=w*h,a=new Float32Array(N*3),temp=new Float32Array(N*3),out=new Float32Array(N*3),valid=new Uint8Array(N),kernel=[.02945,.235,.4711,.235,.02945];
 for(let p=0;p<N;p++){const n=[0,1,2].map(c=>input[layout==='hwc'?p*3+c:c*N+p]);if(!n.every(Number.isFinite)||Math.hypot(...n)<.3)continue;valid[p]=1;const v=unit(n);for(let c=0;c<3;c++)a[p*3+c]=v[c];}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++){let s=0;for(let k=-2;k<=2;k++)s+=a[(y*w+clamp(x+k,0,w-1))*3+c]*kernel[k+2];temp[(y*w+x)*3+c]=s;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;let len=0;for(let c=0;c<3;c++){let s=0;for(let k=-2;k<=2;k++)s+=temp[(clamp(y+k,0,h-1)*w+x)*3+c]*kernel[k+2];out[p*3+c]=s;len+=s*s;}len=Math.sqrt(len);if(len>.2)for(let c=0;c<3;c++)out[p*3+c]/=len;else valid[p]=0;}
 return {data:out,valid};
}
function coherence(normals,w,h){
 const stride=w+1,N=w*h,integrals=[0,1,2].map(()=>new Float64Array((w+1)*(h+1))),out=new Float32Array(N);
 for(let c=0;c<3;c++)for(let y=0;y<h;y++){let sum=0;for(let x=0;x<w;x++){sum+=normals[(y*w+x)*3+c];integrals[c][(y+1)*stride+x+1]=integrals[c][y*stride+x+1]+sum;}}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=Math.max(0,x-5),x1=Math.min(w,x+6),y0=Math.max(0,y-5),y1=Math.min(h,y+6),count=(x1-x0)*(y1-y0);let len=0;for(const s of integrals){const mean=(s[y1*stride+x1]-s[y1*stride+x0]-s[y0*stride+x1]+s[y0*stride+x0])/count;len+=mean*mean;}out[y*w+x]=Math.sqrt(len);}
 return out;
}
function medianNormal(data,indices){return unit([0,1,2].map(c=>median(indices.map(i=>data[i*3+c]))));}
function rdp(points,tolerance){
 if(points.length<=2)return points;const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;let best=0,index=0;
 for(let i=1;i<points.length-1;i++){const p=points[i],t=len?clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len,0,1):0,d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);if(d>best){best=d;index=i;}}
 if(best<=tolerance)return [a,b];return [...rdp(points.slice(0,index+1),tolerance).slice(0,-1),...rdp(points.slice(index),tolerance)];
}
function simplifyRing(points,tolerance){
 let split=1,dist=0;for(let i=1;i<points.length;i++){const d=(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2;if(d>dist){dist=d;split=i;}}
 const result=[...rdp(points.slice(0,split+1),tolerance).slice(0,-1),...rdp([...points.slice(split),points[0]],tolerance).slice(0,-1)];return result.length>=3?result:points;
}
export function traceSurfaceRings(labels,w,h,id,tolerance=1.5){
 const edges=[],starts=new Map(),stride=w+1;
 const add=(x,y,xx,yy,d)=>{const a=y*stride+x,b=yy*stride+xx,index=edges.length;edges.push({a,b,d,used:false});if(!starts.has(a))starts.set(a,[]);starts.get(a).push(index);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(labels[i]!==id)continue;if(y===0||labels[i-w]!==id)add(x,y,x+1,y,0);if(x===w-1||labels[i+1]!==id)add(x+1,y,x+1,y+1,1);if(y===h-1||labels[i+w]!==id)add(x+1,y+1,x,y+1,2);if(x===0||labels[i-1]!==id)add(x,y+1,x,y,3);}
 const rings=[],priority=[1,0,3,2];
 for(const start of edges){if(start.used)continue;let e=start,closed=false;const points=[];for(let k=0;k<=edges.length;k++){if(e.used)break;e.used=true;points.push([e.a%stride,Math.floor(e.a/stride)]);if(e.b===start.a){closed=true;break;}const next=(starts.get(e.b)||[]).map(i=>edges[i]).filter(n=>!n.used).sort((a,b)=>priority.indexOf((a.d-e.d+4)%4)-priority.indexOf((b.d-e.d+4)%4));if(!next.length)break;e=next[0];}if(!closed||points.length<4)continue;const a=polyArea(points);if(Math.abs(a)<16)continue;const simple=simplifyRing(points,tolerance);rings.push({hole:a<0,points:simple.map(([x,y])=>[x/w,y/h]),area:Math.abs(a)/(w*h)});}
 return rings;
}
export function detectWallSurfaces({pixels,pixelWidth,pixelHeight,normals,width,height,confidence=null,holds=[],wallRoi={x:0,y:0,w:1,h:1},normalLayout='chw',seams:providedSeams=null}){
 const start=typeof performance!=='undefined'?performance.now():Date.now(),N=width*height;
 const empty=reason=>({status:'uncertain',regions:[],perHold:holds.map((h,i)=>({id:h.id??String(i),status:'uncertain',angle:null,normal:null,reason})),floorReference:null,width,height,labels:new Int32Array(Number.isInteger(N)&&N>0&&N<=1200000?N:0).fill(-1),diagnostics:{reason,source:'automatic-image-and-normal',extraModelInferences:0}});
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||N>1200000||!normals||normals.length!==N*3||confidence&&confidence.length!==N)return empty('Invalid normal map.');
 if(![wallRoi.x,wallRoi.y,wallRoi.w,wallRoi.h].every(Number.isFinite)||wallRoi.w<=0||wallRoi.h<=0)return empty('Invalid wall area.');
 const roi={x:clamp(wallRoi.x,0,.999),y:clamp(wallRoi.y,0,.999),w:0,h:0};roi.w=clamp(wallRoi.w,0,1-roi.x);roi.h=clamp(wallRoi.h,0,1-roi.y);
 const {data:ns,valid}=smoothNormals(normals,width,height,normalLayout),{holdMask,search}=masks(width,height,holds,roi),coh=coherence(ns,width,height);
 const seams=providedSeams||detectSurfaceSeams({pixels,pixelWidth,pixelHeight,holds,wallRoi:roi}),barrier=seamBarrier(seams,width,height),labels=new Int32Array(N).fill(-1),quality=new Float32Array(N),order=[];
 for(let p=0;p<N;p++){if(!valid[p]||!search[p]||barrier[p]||(confidence&&(!Number.isFinite(confidence[p])||confidence[p]<=1)))continue;if(!holdMask[p]){quality[p]=coh[p]*Math.min(confidence?confidence[p]:10,20);order.push(p);}}
 order.sort((a,b)=>quality[b]-quality[a]||a-b);const queue=new Int32Array(N),groups=[],cosSeed=Math.cos(16*Math.PI/180),cosNeighbor=Math.cos(18*Math.PI/180),minSeed=Math.max(40,Math.round(N*.0007));
 for(const seed of order){if(labels[seed]!==-1)continue;const id=groups.length,sx=ns[seed*3],sy=ns[seed*3+1],sz=ns[seed*3+2];let head=0,tail=1;queue[0]=seed;labels[seed]=id;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width),neighbors=[];if(x)neighbors.push(p-1);if(x<width-1)neighbors.push(p+1);if(y)neighbors.push(p-width);if(y<height-1)neighbors.push(p+width);
   for(const j of neighbors){if(labels[j]!==-1||!valid[j]||!search[j]||barrier[j]||(confidence&&(!Number.isFinite(confidence[j])||confidence[j]<=1)))continue;const a=j*3,b=p*3;if(ns[a]*sx+ns[a+1]*sy+ns[a+2]*sz<cosSeed||ns[a]*ns[b]+ns[a+1]*ns[b+1]+ns[a+2]*ns[b+2]<cosNeighbor)continue;labels[j]=id;queue[tail++]=j;}}
  if(tail<minSeed){for(let k=0;k<tail;k++)labels[queue[k]]=-2;continue;}groups.push(Array.from(queue.subarray(0,tail)));
 }
 // Only a narrow unassigned band is filled. Region labels never merge here.
 const distance=new Uint8Array(N).fill(255);let head=0,tail=0;
 for(let p=0;p<N;p++)if(labels[p]>=0){distance[p]=0;queue[tail++]=p;}else labels[p]=-1;
 while(head<tail){const p=queue[head++];if(distance[p]>=3)continue;const x=p%width,y=Math.floor(p/width),neighbors=[];if(x)neighbors.push(p-1);if(x<width-1)neighbors.push(p+1);if(y)neighbors.push(p-width);if(y<height-1)neighbors.push(p+width);for(const j of neighbors)if(distance[j]===255&&search[j]&&valid[j]){distance[j]=distance[p]+1;labels[j]=labels[p];queue[tail++]=j;}}
 const floorIds=[];for(let y=Math.floor(height*.78);y<height;y++)for(let x=0;x<width;x++){const p=y*width+x;if(valid[p]&&ns[p*3+1]<-.7&&(!confidence||confidence[p]>3))floorIds.push(p);}
 let floorNormal=floorIds.length>Math.max(100,N*.0007)?medianNormal(ns,floorIds):null,floorSpread=floorNormal?percentile(floorIds.map(p=>angle([ns[p*3],ns[p*3+1],ns[p*3+2]],floorNormal)),.9):null;
 if(floorSpread>20)floorNormal=null;
 const floorReference={status:floorNormal?'estimated':'assumed',normal:floorNormal||[0,-1,0],spread:floorNormal?floorSpread:null,source:floorNormal?'model-floor-normal':'camera-upright-assumption',reason:floorNormal?'Normal-model floor reference; not a measured camera calibration.':'Floor orientation unclear; angles assume an upright camera.'};
 const members=groups.map(()=>[]);for(let p=0;p<N;p++)if(labels[p]>=0)members[labels[p]].push(p);
 const candidates=[];
 for(let id=0;id<members.length;id++){
  const ids=members[id],samples=ids.filter(p=>!holdMask[p]);if(ids.length<N*.007||samples.length<60)continue;
  const normal=medianNormal(ns,samples);if(!normal)continue;const spread=percentile(samples.map(p=>angle([ns[p*3],ns[p*3+1],ns[p*3+2]],normal)),.9);
  const included=holds.filter(h=>labels[clamp(Math.floor(h.y*height),0,height-1)*width+clamp(Math.floor(h.x*width),0,width-1)]===id);
  if(included.length<3||spread>20)continue;
  const rawAngle=angle(normal,floorReference.normal)-90,rounded=Math.abs(rawAngle)<2.5?0:Math.round(rawAngle/5)*5,uncertainty=Math.max(10,Math.ceil((spread+(floorReference.spread||8)+5)/5)*5);
  let cx=0,cy=0;for(const p of ids){cx+=(p%width+.5)/width;cy+=(Math.floor(p/width)+.5)/height;}cx/=ids.length;cy/=ids.length;
  let anchor=ids[0],distance=Infinity;for(const p of ids){const d=((p%width+.5)/width-cx)**2+((Math.floor(p/width)+.5)/height-cy)**2;if(d<distance){distance=d;anchor=p;}}
  candidates.push({oldId:id,status:'estimated',normal,spread,angle:rounded,rawAngle,range:[Math.max(-90,rounded-uncertainty),Math.min(90,rounded+uncertainty)],areaFraction:ids.length/N,holdCount:included.length,anchor:{x:(anchor%width+.5)/width,y:(Math.floor(anchor/width)+.5)/height},source:'automatic-image-and-normal',confidence:'low',angleReference:floorReference.source,reason:'Model-normal surface candidate; boundary and angle remain approximate.',metadata:{normalModelConfidence:'Not a calibrated probability',rangeMeaning:'Heuristic angular dispersion, not a calibrated confidence interval',touchesSearchLimit:ids.some(p=>{const x=p%width,y=Math.floor(p/width);return !x||!y||x===width-1||y===height-1||!search[p-1]||!search[p+1]||!search[p-width]||!search[p+width];})}});
 }
 const byOld=new Map(candidates.map((c,i)=>[c.oldId,i]));for(let p=0;p<N;p++)labels[p]=byOld.get(labels[p])??-1;
 const regions=candidates.map((c,id)=>{
  const rings=traceSurfaceRings(labels,width,height,id,1.5),outer=rings.filter(r=>!r.hole).sort((a,b)=>b.area-a.area),points=outer.flatMap(r=>r.points),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const boundarySegments=rings.flatMap(ring=>ring.points.map((a,i)=>{
   const b=ring.points[(i+1)%ring.points.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,x=clamp(Math.floor(mx*width),0,width-1),y=clamp(Math.floor(my*height),0,height-1);
   let atLimit=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height||!search[yy*width+xx])atLimit=true;}
   const sx=(b[0]-a[0])*width,sy=(b[1]-a[1])*height,sl=Math.hypot(sx,sy);
   const supported=!atLimit&&seams.some(line=>{const ax=line.a[0]*width,ay=line.a[1]*height,dx=(line.b[0]-line.a[0])*width,dy=(line.b[1]-line.a[1])*height,l=Math.hypot(dx,dy);if(l<1||sl<1||Math.abs((sx*dx+sy*dy)/(sl*l))<.94)return false;const px=mx*width-ax,py=my*height-ay,t=(px*dx+py*dy)/(l*l);return t>=-.05&&t<=1.05&&Math.abs(px*dy-py*dx)/l<3;});
   const source=atLimit?'search-limit':supported?'image-seam':'approximate-normal-boundary';return {a,b,hole:ring.hole,source,support:source,verifiedPhysicalSeam:false};
  }));
  const {oldId,...rest}=c;return {...rest,id:`surface-${id+1}`,polygon:outer[0]?.points||[],polygons:outer.map(r=>r.points),holes:rings.filter(r=>r.hole).map(r=>r.points),rings,boundarySegments,roi:points.length?{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}:null};
 });
 const perHold=holds.map((hold,i)=>{
  const unknown={id:hold.id??String(i),status:'uncertain',angle:null,range:null,normal:null,source:'automatic-image-and-normal',reason:'The hold crosses a surface boundary or its wall region is unresolved.'};
  if(!Number.isFinite(hold.x)||!Number.isFinite(hold.y))return unknown;const samples=[];
  for(const dx of [-.4,0,.4])for(const dy of [-.4,0,.4]){const x=hold.x+dx*(hold.w||.02),y=hold.y+dy*(hold.h||.025);if(x<0||x>1||y<0||y>1)return unknown;samples.push(labels[clamp(Math.floor(y*height),0,height-1)*width+clamp(Math.floor(x*width),0,width-1)]);}
  if(samples[0]<0||samples.some(id=>id!==samples[0]))return unknown;const region=regions[samples[0]];return {id:unknown.id,status:'estimated',angle:region.angle,rawAngle:region.rawAngle,range:region.range,normal:region.normal,spread:region.spread,facetId:region.id,source:region.source,confidence:'low',angleReference:region.angleReference,reason:region.reason};
 });
 const known=perHold.filter(h=>h.status==='estimated').length;
 return {status:known===0?'uncertain':known===holds.length?'estimated':'partial',regions,perHold,floorReference,seams,labels,width,height,coverage:{known,unknown:holds.length-known,total:holds.length},diagnostics:{source:'automatic-image-and-normal',candidateSeams:seams.length,seedRegions:groups.length,acceptedRegions:regions.length,extraModelInferences:0,elapsedMs:(typeof performance!=='undefined'?performance.now():Date.now())-start,searchBoundary:'Hold envelope/user area is only a computation limit; truncated region edges are not verified physical wall edges.'}};
}
