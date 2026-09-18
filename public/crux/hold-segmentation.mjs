/* Browser/worker-safe, dependency-free box-guided hold silhouettes.
 * Input boxes are normalized centre-x, centre-y, width, height (YOLO convention).
 * Pure image processing: no network, no model download, no grip classifier.
 * Original implementation for CRUX; AGPL-3.0-or-later, like the host application.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const q=(a,p)=>{const s=Array.from(a).sort((a,b)=>a-b);return s[Math.floor((s.length-1)*p)]||0;};
const lin=Array.from({length:256},(_,v)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
const labf=v=>v>.008856?Math.cbrt(v):7.787*v+16/116;
function lab(r,g,b){r=lin[r];g=lin[g];b=lin[b];const x=labf((.4124564*r+.3575761*g+.1804375*b)/.95047),y=labf(.2126729*r+.7151522*g+.072175*b),z=labf((.0193339*r+.119192*g+.9503041*b)/1.08883);return [116*y-16,500*(x-y),200*(y-z)];}
const d2=(a,b)=>.65*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
function clusters(samples,k=3){
  if(!samples.length)return [];
  const centers=[samples[0].slice()];
  for(let n=1;n<k;n++){let far=samples[0],score=-1;for(const s of samples){const d=Math.min(...centers.map(c=>d2(s,c)));if(d>score){score=d;far=s;}}centers.push(far.slice());}
  let counts=[];
  for(let it=0;it<5;it++){
    const sums=centers.map(()=>[0,0,0]);counts=centers.map(()=>0);
    for(const s of samples){let ix=0,dist=Infinity;centers.forEach((c,i)=>{const d=d2(s,c);if(d<dist){dist=d;ix=i;}});counts[ix]++;for(let j=0;j<3;j++)sums[ix][j]+=s[j];}
    centers.forEach((c,i)=>{if(counts[i])for(let j=0;j<3;j++)c[j]=sums[i][j]/counts[i];});
  }
  return centers.map((color,i)=>({color,n:counts[i]})).filter(c=>c.n>=Math.max(3,samples.length*.10)).sort((a,b)=>b.n-a.n);
}
function component(mask,w,h,cx,cy){
  const visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length);let best=[],score=-Infinity,components=0;
  for(let p=0;p<mask.length;p++)if(mask[p]&&!visited[p]){
    let head=0,tail=1,sx=0,sy=0;queue[0]=p;visited[p]=1;
    while(head<tail){const t=queue[head++],x=t%w,y=(t/w)|0;sx+=x;sy+=y;for(const n of [x>0?t-1:-1,x<w-1?t+1:-1,y>0?t-w:-1,y<h-1?t+w:-1])if(n>=0&&mask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;}}
    if(tail<3)continue;components++;
    const central=Math.hypot((sx/tail-cx)/(w*.5),(sy/tail-cy)/(h*.5));
    const value=tail*Math.exp(-2.7*central*central);
    if(value>score){best=Array.from(queue.subarray(0,tail));score=value;}
  }
  const out=new Uint8Array(mask.length);for(const p of best)out[p]=1;return {mask:out,components};
}
function closeAndFill(mask,w,h){
  // One-pixel closing repairs chalk highlights and very small holes, without
  // replacing the actual silhouette with a convex hull.
  const dil=new Uint8Array(mask.length),closed=new Uint8Array(mask.length);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(mask[p+dy*w+dx])dil[p]=1;}
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;let v=1;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!dil[p+dy*w+dx])v=0;closed[p]=v;}
  const outside=new Uint8Array(mask.length),queue=[];
  for(let x=0;x<w;x++)queue.push(x,(h-1)*w+x);for(let y=0;y<h;y++)queue.push(y*w,y*w+w-1);
  for(const p of queue)outside[p]=1;
  for(let i=0;i<queue.length;i++){const p=queue[i],x=p%w,y=(p/w)|0;for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!closed[n]&&!outside[n]){outside[n]=1;queue.push(n);}}
  for(let p=0;p<mask.length;p++)if(!outside[p])closed[p]=1;
  return closed;
}
function expandForeground(seed,colors,distances,inside,w,h,bgThreshold,blocked){
  // A detector can find only the bowl of a multi-part hold. Grow from its
  // observed foreground into nearby compatible pixels, never through wall.
  // Color palette comes from this hold, not from a shape/color lookup table.
  const samples=[];for(let i=0;i<seed.length;i++)if(seed[i])samples.push(colors[i]);
  if(!samples.length)return seed;
  const palette=clusters(samples,3).map(c=>c.color),out=seed.slice(),queue=new Int32Array(seed.length);
  let head=0,tail=0;for(let i=0;i<seed.length;i++)if(seed[i])queue[tail++]=i;
  const eligible=new Uint8Array(seed.length);
  for(let i=0;i<seed.length;i++){
    if(blocked[i]||distances[i]<Math.max(7,bgThreshold*.82))continue;
    const c=colors[i],chroma=Math.hypot(c[1],c[2]);let compatible=false;
    for(const p of palette){
      const pc=Math.hypot(p[1],p[2]),cos=(c[1]*p[1]+c[2]*p[2])/(chroma*pc||1);
      // Preserve differently lit parts of the same saturated color. A broad
      // Lab limit also permits chalk/near-neutral highlights if wall contrast
      // remains present. The connected growth cannot jump blue-wall gaps.
      const distance=d2(c,p);
      const sameHue=chroma>12&&pc>12&&cos>.95&&chroma>pc*.4&&Math.abs(c[0]-p[0])<42;
      // Outside the detector box use stricter hue agreement; an unrestricted
      // Lab-radius test can mistake dark blue shadows for yellow hold pixels.
      const outsideMatch=sameHue||(chroma<18&&pc<20&&distance<20**2)||(c[0]>74&&chroma<16&&distance<28**2);
      if(inside[i]?(distance<42**2||sameHue):outsideMatch){compatible=true;break;}
    }
    eligible[i]=compatible?1:0;
  }
  while(head<tail){const i=queue[head++],x=i%w,y=(i/w)|0;for(const n of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(n>=0&&!out[n]&&eligible[n]){out[n]=1;queue[tail++]=n;}}
  return out;
}
function polygonArea(points){let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}return area/2;}
function contour(mask,w,h){
  // Oriented pixel-boundary edges, followed into loops. Largest outer loop is
  // retained. Holes were filled above because bolts are part of a hold surface.
  const edges=new Map(),key=(x,y)=>y*(w+1)+x,add=(x,y,xx,yy)=>{const k=key(x,y);if(!edges.has(k))edges.set(k,[]);edges.get(k).push(key(xx,yy));};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){
    if(!y||!mask[(y-1)*w+x])add(x,y,x+1,y);
    if(x===w-1||!mask[y*w+x+1])add(x+1,y,x+1,y+1);
    if(y===h-1||!mask[(y+1)*w+x])add(x+1,y+1,x,y+1);
    if(!x||!mask[y*w+x-1])add(x,y+1,x,y);
  }
  let best=[],bestArea=0;
  while(edges.size){const start=edges.keys().next().value;let cur=start,points=[],limit=mask.length*4;
    do{points.push([cur%(w+1),Math.floor(cur/(w+1))]);const a=edges.get(cur);if(!a?.length)break;const next=a.pop();if(!a.length)edges.delete(cur);cur=next;}while(cur!==start&&--limit>0);
    const area=Math.abs(polygonArea(points));if(area>bestArea){bestArea=area;best=points;}
  }return best;
}
function simplify(points,epsilon){
  if(points.length<5)return points;
  // Split a closed ring at its farthest vertex; run Ramer-Douglas-Peucker on
  // both arcs, so the implicit closing edge cannot erase concavities.
  const dist=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
  const rdp=pts=>{if(pts.length<=2)return pts;let m=epsilon,ix=-1;for(let i=1;i<pts.length-1;i++){const d=dist(pts[i],pts[0],pts.at(-1));if(d>m){m=d;ix=i;}}return ix<0?[pts[0],pts.at(-1)]:[...rdp(pts.slice(0,ix+1)).slice(0,-1),...rdp(pts.slice(ix))];};
  let far=1;for(let i=2;i<points.length;i++)if(Math.hypot(points[i][0]-points[0][0],points[i][1]-points[0][1])>Math.hypot(points[far][0]-points[0][0],points[far][1]-points[0][1]))far=i;
  return [...rdp(points.slice(0,far+1)).slice(0,-1),...rdp([...points.slice(far),points[0]]).slice(0,-1)];
}
function convexHull(points){const a=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],hi=[];for(const p of a){while(lo.length>=2&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}for(const p of a.slice().reverse()){while(hi.length>=2&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}return [...lo.slice(0,-1),...hi.slice(0,-1)];}
function colorName([r,g,b]){const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,s=max?delta/max:0;if(max<28||(max<70&&s<.3))return 'black';if(s<.18)return max>190?'white':'gray';let hue=(max===r?(g-b)/delta+(g<b?6:0):max===g?(b-r)/delta+2:(r-g)/delta+4)*60;if(hue<18||hue>=345)return max>170&&min>95?'pink':'red';if(hue<43)return 'orange';if(hue<72)return 'yellow';if(hue<165)return 'green';if(hue<200)return 'cyan';if(hue<265)return 'blue';if(hue<315)return 'purple';return 'pink';}
const rgbhex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
function ownedByNeighbor(x,y,box,neighbors){
  const own=((x-box.x)/box.w)**2+((y-box.y)/box.h)**2;
  return neighbors.some(b=>Math.abs(x-b.x)<b.w*.52&&Math.abs(y-b.y)<b.h*.52&&((x-b.x)/b.w)**2+((y-b.y)/b.h)**2<own);
}

function segmentHoldExpanded(image,box,options={}){
  const {width,height}=image,data=image.data??image.pixels;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!data||data.length!==width*height*4)throw new Error('Expected full-resolution RGBA pixel data.');
  if(!['x','y','w','h'].every(k=>Number.isFinite(box[k]))||box.w<=0||box.h<=0)throw new Error('Expected normalized centre-format box {x,y,w,h}.');
  const bw=box.w*width,bh=box.h*height,pad=Math.max(6,Math.min(bw,bh)*.95);
  const x0=clamp(Math.floor((box.x-box.w/2)*width-pad),0,width-1),y0=clamp(Math.floor((box.y-box.h/2)*height-pad),0,height-1);
  const x1=clamp(Math.ceil((box.x+box.w/2)*width+pad),x0+1,width),y1=clamp(Math.ceil((box.y+box.h/2)*height+pad),y0+1,height);
  const scale=Math.min(1,(options.maxSide||112)/Math.max(x1-x0,y1-y0)),w=Math.max(3,Math.round((x1-x0)*scale)),h=Math.max(3,Math.round((y1-y0)*scale)),sx=(x1-x0)/w,sy=(y1-y0)/h;
  const colors=[],rgb=[],ring=[],inside=new Uint8Array(w*h),blocked=new Uint8Array(w*h),cx=(box.x*width-x0)/sx,cy=(box.y*height-y0)/sy;
  const neighbors=(options.neighborBoxes||[]).filter(b=>b!==box&&Math.abs(b.x-box.x)<(bw/2+pad)/width+b.w/2&&Math.abs(b.y-box.y)<(bh/2+pad)/height+b.h/2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const px=clamp(Math.floor(x0+(x+.5)*sx),0,width-1),py=clamp(Math.floor(y0+(y+.5)*sy),0,height-1),p=(py*width+px)*4,i=y*w+x;
    rgb.push([data[p],data[p+1],data[p+2]]);colors.push(lab(...rgb[i]));
    inside[i]=Math.abs(px-box.x*width)<=bw*.5&&Math.abs(py-box.y*height)<=bh*.5?1:0;
    const other=options.recoveryCandidate&&ownedByNeighbor(px/width,py/height,box,neighbors);
    if(!inside[i]&&!other&&(x<w*.12||x>w*.88||y<h*.12||y>h*.88))ring.push(colors[i]);
    if(other)blocked[i]=1;
    if(!inside[i])for(const b of neighbors)if(Math.abs(px/width-b.x)<b.w*.55&&Math.abs(py/height-b.y)<b.h*.55){blocked[i]=1;break;}
  }
  const allBg=clusters(ring.length?ring:colors),bg=allBg.filter((b,i)=>i===0||b.n>ring.length*.22),bgDistance=c=>{let best=Infinity;for(const b of bg)best=Math.min(best,d2(c,b.color));return Math.sqrt(best);};
  const ringNoise=q(ring.map(bgDistance),.80),threshold=clamp(ringNoise*1.9+3,7,24)*(options.thresholdScale??1);
  const distances=colors.map(bgDistance),initial=new Uint8Array(w*h);
  for(let i=0;i<initial.length;i++)initial[i]=inside[i]&&!blocked[i]&&distances[i]>threshold?1:0;
  const chosen=component(initial,w,h,cx,cy),grown=expandForeground(chosen.mask,colors,distances,inside,w,h,threshold,blocked);let mask=closeAndFill(grown,w,h);if(options.recoveryCandidate)for(let i=0;i<mask.length;i++)if(blocked[i])mask[i]=0;mask=component(mask,w,h,cx,cy).mask;
  let points=contour(mask,w,h),area=0,mx=0,my=0,minx=w,miny=h,maxx=0,maxy=0,edgeTouches=0,foreground=[];
  let outsideArea=0;for(let i=0;i<mask.length;i++)if(mask[i]){const x=i%w,y=(i/w)|0;area++;mx+=x;my+=y;minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);foreground.push(i);if(!inside[i])outsideArea++;if(x<=1||y<=1||x>=w-2||y>=h-2)edgeTouches++;}
  const fill=area*sx*sy/(bw*bh),contrast=q(foreground.map(i=>distances[i]),.5),centerOffset=area?Math.hypot((mx/area-cx)/(bw/sx),(my/area-cy)/(bh/sy)):1;
  const uncertainty=[];
  if(contrast<threshold*1.6)uncertainty.push('Hold and wall have similar visible colors.');
  if(fill<.16)uncertainty.push('Only a small part of the detector box separated from the wall.');
  if(fill>1.7)uncertainty.push('Expanded foreground is much larger than the detector box.');
  if(edgeTouches/Math.max(area,1)>.04)uncertainty.push('Silhouette reaches the context boundary.');
  if(Math.min(bw,bh)<14)uncertainty.push('Very few source pixels describe this hold.');
  if(chosen.components>4)uncertainty.push('Texture or nearby objects produced competing regions.');
  if(centerOffset>.45)uncertainty.push('Foreground is offset from the detector centre.');
  let confidence=clamp(.26+.35*clamp((contrast-threshold)/25,0,1)+.24*clamp(fill/.45,0,1)-.17*uncertainty.length,0,.93);
  const rawConfidence=confidence;
  const fallback=area<9||fill<.10||fill>2.2||edgeTouches/Math.max(area,1)>.04||points.length<4||confidence<(options.recoveryCandidate?0:.40);
  let polygon;
  if(fallback){polygon=[[box.x-box.w/2,box.y-box.h/2],[box.x+box.w/2,box.y-box.h/2],[box.x+box.w/2,box.y+box.h/2],[box.x-box.w/2,box.y+box.h/2]].map(([x,y])=>({x:clamp(x,0,1),y:clamp(y,0,1)}));uncertainty.push('Automatic box fallback; this is not an observed silhouette.');confidence=Math.min(confidence,.25);}
  else polygon=simplify(points,options.simplifyPixels??.75).map(([x,y])=>({x:(x0+x*sx)/width,y:(y0+y*sy)/height}));
  const useful=foreground.length?foreground:colors.map((_,i)=>i).filter(i=>inside[i]);
  const histogram=new Map();for(const i of useful){const c=rgb[i],key=(c[0]>>5)*64+(c[1]>>5)*8+(c[2]>>5);if(!histogram.has(key))histogram.set(key,[]);histogram.get(key).push(i);}
  const dominant=[...histogram.values()].sort((a,b)=>b.length-a.length)[0]||[0],color=[0,1,2].map(c=>Math.round(dominant.reduce((s,i)=>s+rgb[i][c],0)/dominant.length));
  const actualWidth=(maxx-minx+1)*sx,actualHeight=(maxy-miny+1)*sy,aspect=fallback?bw/bh:actualWidth/actualHeight;
  const hullArea=Math.abs(polygonArea(convexHull(points)))||1,solidity=clamp(area/hullArea,0,1);
  let perimeter=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];perimeter+=Math.hypot((a.x-b.x)*width,(a.y-b.y)*height);}
  const maskArea=area*sx*sy,roundness=clamp(4*Math.PI*maskArea/(perimeter*perimeter||1),0,1);
  const shape=fallback?'unresolved silhouette':Math.max(aspect,1/aspect)>2.0?'elongated silhouette':solidity<.82?'indented silhouette':roundness>.72?'rounded silhouette':'compact silhouette';
  const result={polygon,method:fallback?'box-fallback':'seeded-color-contour',confidence,fallback,
    maskAreaPx:fallback?null:maskArea,areaFraction:fallback?null:maskArea/(width*height),
    appearance:{dominantColor:{hex:rgbhex(color),rgb:color,name:colorName(color),confidence:clamp(dominant.length/useful.length*2,0,1)},apparentWidthPx:fallback?bw:actualWidth,apparentHeightPx:fallback?bh:actualHeight,aspectRatio:aspect,solidity:fallback?null:solidity,roundness:fallback?null:roundness,shape,grip:'unknown',gripReason:'A 2D silhouette does not reveal usable edge depth, surface angle, or friction.'},
    uncertainty,diagnostics:{threshold,contrast,boxFill:fill,centerOffset,components:chosen.components,sampleWidth:w,sampleHeight:h,expandedFraction:outsideArea/Math.max(area,1),rawConfidence,contextEdgeFraction:edgeTouches/Math.max(area,1)}};
  if(options.includeMask)result.mask={data:mask,width:w,height:h,x:x0,y:y0,pixelWidth:sx,pixelHeight:sy};
  return result;
}

function segmentHoldBaseline(image,box,options={}){
  const {width,height}=image,data=image.data??image.pixels;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!data||data.length!==width*height*4)throw new Error('Expected full-resolution RGBA pixel data.');
  if(!['x','y','w','h'].every(k=>Number.isFinite(box[k]))||box.w<=0||box.h<=0)throw new Error('Expected normalized centre-format box {x,y,w,h}.');
  const bw=box.w*width,bh=box.h*height,pad=Math.max(3,Math.min(bw,bh)*.22);
  const x0=clamp(Math.floor((box.x-box.w/2)*width-pad),0,width-1),y0=clamp(Math.floor((box.y-box.h/2)*height-pad),0,height-1);
  const x1=clamp(Math.ceil((box.x+box.w/2)*width+pad),x0+1,width),y1=clamp(Math.ceil((box.y+box.h/2)*height+pad),y0+1,height);
  const scale=Math.min(1,(options.maxSide||112)/Math.max(x1-x0,y1-y0)),w=Math.max(3,Math.round((x1-x0)*scale)),h=Math.max(3,Math.round((y1-y0)*scale)),sx=(x1-x0)/w,sy=(y1-y0)/h;
  const colors=[],rgb=[],ring=[],inside=new Uint8Array(w*h),blocked=new Uint8Array(w*h),cx=(box.x*width-x0)/sx,cy=(box.y*height-y0)/sy;
  const neighbors=(options.neighborBoxes||[]).filter(b=>b!==box&&Math.abs(b.x-box.x)<(bw/2+pad)/width+b.w/2&&Math.abs(b.y-box.y)<(bh/2+pad)/height+b.h/2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const px=clamp(Math.floor(x0+(x+.5)*sx),0,width-1),py=clamp(Math.floor(y0+(y+.5)*sy),0,height-1),p=(py*width+px)*4,i=y*w+x;
    rgb.push([data[p],data[p+1],data[p+2]]);colors.push(lab(...rgb[i]));
    inside[i]=Math.abs(px-box.x*width)<=bw*.5&&Math.abs(py-box.y*height)<=bh*.5?1:0;
    const other=options.recoveryCandidate&&ownedByNeighbor(px/width,py/height,box,neighbors);blocked[i]=other?1:0;
    if(!inside[i]&&!other)ring.push(colors[i]);
  }
  const bg=clusters(ring.length?ring:colors),bgDistance=c=>{let best=Infinity;for(const b of bg)best=Math.min(best,d2(c,b.color));return Math.sqrt(best);};
  const ringNoise=q(ring.map(bgDistance),.80),threshold=clamp(ringNoise*1.9+3,7,24)*(options.thresholdScale??1);
  const distances=colors.map(bgDistance),initial=new Uint8Array(w*h);
  for(let i=0;i<initial.length;i++)initial[i]=inside[i]&&!blocked[i]&&distances[i]>threshold?1:0;
  const chosen=component(initial,w,h,cx,cy);let mask=closeAndFill(chosen.mask,w,h);if(options.recoveryCandidate)for(let i=0;i<mask.length;i++)if(blocked[i])mask[i]=0;mask=component(mask,w,h,cx,cy).mask;
  let points=contour(mask,w,h),area=0,mx=0,my=0,minx=w,miny=h,maxx=0,maxy=0,edgeTouches=0,foreground=[];
  for(let i=0;i<mask.length;i++)if(mask[i]){const x=i%w,y=(i/w)|0;area++;mx+=x;my+=y;minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);foreground.push(i);if(Math.abs(x-cx)>bw/sx*.46||Math.abs(y-cy)>bh/sy*.46)edgeTouches++;}
  const fill=area*sx*sy/(bw*bh),contrast=q(foreground.map(i=>distances[i]),.5),centerOffset=area?Math.hypot((mx/area-cx)/(bw/sx),(my/area-cy)/(bh/sy)):1;
  const uncertainty=[];
  if(contrast<threshold*1.6)uncertainty.push('Hold and wall have similar visible colors.');
  if(fill<.16)uncertainty.push('Only a small part of the detector box separated from the wall.');
  if(fill>.90)uncertainty.push('Segmentation fills almost all of the box.');
  if(edgeTouches/Math.max(area,1)>.22)uncertainty.push('Silhouette may be clipped by the detector box.');
  if(Math.min(bw,bh)<14)uncertainty.push('Very few source pixels describe this hold.');
  if(chosen.components>4)uncertainty.push('Texture or nearby objects produced competing regions.');
  if(centerOffset>.27)uncertainty.push('Foreground is offset from the detector centre.');
  let confidence=clamp(.26+.35*clamp((contrast-threshold)/25,0,1)+.24*clamp(fill/.45,0,1)-.17*uncertainty.length,0,.93);
  const rawConfidence=confidence;
  const fallback=area<9||fill<.10||fill>.95||points.length<4||confidence<(options.recoveryCandidate?0:.40);
  let polygon;
  if(fallback){polygon=[[box.x-box.w/2,box.y-box.h/2],[box.x+box.w/2,box.y-box.h/2],[box.x+box.w/2,box.y+box.h/2],[box.x-box.w/2,box.y+box.h/2]].map(([x,y])=>({x:clamp(x,0,1),y:clamp(y,0,1)}));uncertainty.push('Automatic box fallback; this is not an observed silhouette.');confidence=Math.min(confidence,.25);}
  else polygon=simplify(points,options.simplifyPixels??.75).map(([x,y])=>({x:(x0+x*sx)/width,y:(y0+y*sy)/height}));
  const useful=foreground.length?foreground:colors.map((_,i)=>i).filter(i=>inside[i]);
  const histogram=new Map();for(const i of useful){const c=rgb[i],key=(c[0]>>5)*64+(c[1]>>5)*8+(c[2]>>5);if(!histogram.has(key))histogram.set(key,[]);histogram.get(key).push(i);}
  const dominant=[...histogram.values()].sort((a,b)=>b.length-a.length)[0]||[0],color=[0,1,2].map(c=>Math.round(dominant.reduce((s,i)=>s+rgb[i][c],0)/dominant.length));
  const actualWidth=(maxx-minx+1)*sx,actualHeight=(maxy-miny+1)*sy,aspect=fallback?bw/bh:actualWidth/actualHeight;
  const hullArea=Math.abs(polygonArea(convexHull(points)))||1,solidity=clamp(area/hullArea,0,1);
  let perimeter=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];perimeter+=Math.hypot((a.x-b.x)*width,(a.y-b.y)*height);}
  const maskArea=area*sx*sy,roundness=clamp(4*Math.PI*maskArea/(perimeter*perimeter||1),0,1);
  const shape=fallback?'unresolved silhouette':Math.max(aspect,1/aspect)>2.0?'elongated silhouette':solidity<.82?'indented silhouette':roundness>.72?'rounded silhouette':'compact silhouette';
  const result={polygon,method:fallback?'box-fallback':'local-color-contour',confidence,fallback,
    maskAreaPx:fallback?null:maskArea,areaFraction:fallback?null:maskArea/(width*height),
    appearance:{dominantColor:{hex:rgbhex(color),rgb:color,name:colorName(color),confidence:clamp(dominant.length/useful.length*2,0,1)},apparentWidthPx:fallback?bw:actualWidth,apparentHeightPx:fallback?bh:actualHeight,aspectRatio:aspect,solidity:fallback?null:solidity,roundness:fallback?null:roundness,shape,grip:'unknown',gripReason:'A 2D silhouette does not reveal usable edge depth, surface angle, or friction.'},
    uncertainty,diagnostics:{threshold,contrast,boxFill:fill,centerOffset,components:chosen.components,sampleWidth:w,sampleHeight:h,rawConfidence}};
  if(options.includeMask)result.mask={data:mask,width:w,height:h,x:x0,y:y0,pixelWidth:sx,pixelHeight:sy};
  return result;
}

function clippedColorContinuation(image,box,baseline,options){
  const {width,height}=image,data=image.data??image.pixels;
  const color=lab(...baseline.appearance.dominantColor.rgb),pc=Math.hypot(color[1],color[2]);
  if(pc<18)return false;
  const bw=box.w*width,bh=box.h*height,required=Math.max(6,Math.min(bw,bh)*.20),reach=Math.min(bw,bh)*.65;
  if(reach<required)return false;
  const candidates=[];for(let t=.15;t<=.851;t+=.14){candidates.push([(box.x-box.w/2+box.w*t)*width,(box.y-box.h/2)*height,0,-1],[(box.x-box.w/2+box.w*t)*width,(box.y+box.h/2)*height,0,1],[(box.x-box.w/2)*width,(box.y-box.h/2+box.h*t)*height,-1,0],[(box.x+box.w/2)*width,(box.y-box.h/2+box.h*t)*height,1,0]);}
  for(const [x,y,dx,dy] of candidates){let extent=0;for(let step=-2;step<=reach;step+=2){
    const xx=Math.round(x+dx*step),yy=Math.round(y+dy*step);if(xx<0||yy<0||xx>=width||yy>=height)break;
    if(step>0&&(options.neighborBoxes||[]).some(b=>b!==box&&Math.abs(xx/width-b.x)<b.w*.55&&Math.abs(yy/height-b.y)<b.h*.55))break;
    const p=(yy*width+xx)*4,c=lab(data[p],data[p+1],data[p+2]),cc=Math.hypot(c[1],c[2]),cos=(c[1]*color[1]+c[2]*color[2])/(cc*pc||1);
    if(cc<18||cos<.97||Math.abs(c[0]-color[0])>40||d2(c,color)>50**2)break;
    extent=step;
  }if(extent>=required)return true;}
  return false;
}

function maskAgreement(a,b){
  if(a.width!==b.width||a.height!==b.height||a.x!==b.x||a.y!==b.y)return 0;
  let intersection=0,union=0;for(let i=0;i<a.data.length;i++){if(a.data[i]&&b.data[i])intersection++;if(a.data[i]||b.data[i])union++;}
  return intersection/(union||1);
}
function containsPoint(polygon,x,y){
  let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }return inside;
}
function recoverRejectedHold(image,box,baseline,options){
  // A low color score is not by itself evidence that no boundary exists.
  // Resample this rejected crop at higher resolution and reduce its threshold
  // in bounded steps. Only accept a centered shape supported at two settings;
  // do not globally relax YOLO or alter already accepted silhouettes.
  const bw=box.w*image.width,bh=box.h*image.height;
  if(Math.min(bw,bh)<8)return null;
  const neighbors=(options.neighborBoxes||[]).filter(b=>b!==box),levels=[1,.85,.70,.55];
  let best=null,bestScore=-Infinity;
  const plausible=r=>!r.fallback&&r.maskAreaPx/(r.mask.pixelWidth*r.mask.pixelHeight)>=18&&
    r.diagnostics.boxFill>=.20&&r.diagnostics.boxFill<=.90&&r.diagnostics.centerOffset<=.25&&
    r.appearance.apparentWidthPx>=bw*.45&&r.appearance.apparentHeightPx>=bh*.45&&
    (r.diagnostics.expandedFraction||0)<=.12&&(r.diagnostics.contextEdgeFraction||0)<=.01&&
    !neighbors.some(b=>containsPoint(r.polygon,b.x,b.y));
  for(const segment of [segmentHoldBaseline,segmentHoldExpanded]){
    let previous=null;
    for(const thresholdScale of levels){
      const candidate=segment(image,box,{...options,maxSide:192,includeMask:true,recoveryCandidate:true,thresholdScale});
      if(previous&&plausible(previous)&&plausible(candidate)){
        const agreement=maskAgreement(previous.mask,candidate.mask);
        if(agreement>=.82){
          const score=agreement*.50+candidate.diagnostics.rawConfidence*.15+thresholdScale*.15+candidate.diagnostics.boxFill*.10-(candidate.diagnostics.expandedFraction||0)*.30+(segment===segmentHoldBaseline?.03:0);
          if(score>bestScore){
            bestScore=score;best=candidate;
            best.diagnostics={...best.diagnostics,thresholdScale,stabilityIoU:agreement,retryReason:'stable boundary at neighboring color thresholds',baselineScore:baseline.diagnostics.rawConfidence};
          }
          // Stop lowering this crop's threshold once a stable shape is found.
          // A larger stable shadow should not displace an earlier good border.
          break;
        }
      }
      previous=candidate;
    }
  }
  if(!best)return null;
  best.method='adaptive-color-contour';best.confidence=clamp(.45+.20*best.diagnostics.stabilityIoU, .45,.65);
  best.uncertainty.push('Recovered using local threshold stability; the outline remains approximate.');
  if(!options.includeMask)delete best.mask;
  return best;
}

export function segmentHold(image,box,options={}) {
  const baseline=segmentHoldBaseline(image,box,options);
  // The fast local contour remains authoritative when its evidence is strong.
  // Retry only ambiguous/fragmented silhouettes with the broader context.
  const clipped=!baseline.fallback&&clippedColorContinuation(image,box,baseline,options);
  if (!clipped && !baseline.fallback && baseline.confidence > .66 && baseline.appearance.solidity > .68) return baseline;
  const expanded=segmentHoldExpanded(image,box,options);
  const gain=(expanded.maskAreaPx||0)/(baseline.maskAreaPx||1);
  if (!expanded.fallback && (expanded.confidence >= baseline.confidence + .04 || (clipped&&expanded.confidence>=baseline.confidence*.9&&gain>1.20)) &&
      (baseline.fallback || gain < 2.7) && expanded.diagnostics.expandedFraction < .38) {
    expanded.diagnostics.retryReason=baseline.fallback?'weak initial mask':clipped?'matching color continues beyond box':'ambiguous initial boundary';
    expanded.diagnostics.baselineAreaPx=baseline.maskAreaPx;
    return expanded;
  }
  return baseline.fallback?(recoverRejectedHold(image,box,baseline,options)||baseline):baseline;
}

export function segmentHolds(image,boxes,options={}){
  boxes=boxes??image.holds;
  if(!Array.isArray(boxes))throw new Error('Expected holds array.');
  let batch=[];
  const results=boxes.map((box,index)=>{
    const result=segmentHold(image,box,{...options,neighborBoxes:boxes});
    const left=Math.min(...result.polygon.map(p=>p.x)),right=Math.max(...result.polygon.map(p=>p.x)),top=Math.min(...result.polygon.map(p=>p.y)),bottom=Math.max(...result.polygon.map(p=>p.y));
    const hold={...box,...result,detectionBox:{x:box.x,y:box.y,w:box.w,h:box.h},
      silhouetteBounds:{left,top,right,bottom,width:right-left,height:bottom-top,centerX:(left+right)/2,centerY:(top+bottom)/2},
      confidence:box.confidence??null,segmentationConfidence:result.confidence,confidenceBasis:'Segmentation confidence is a heuristic quality score, not a calibrated probability.'};
    // Preview batches only. Global size statistics and paint groups are still
    // calculated once across the complete result, exactly as in a normal scan.
    if(options.onProgress){batch.push(hold);if(batch.length===8||index===boxes.length-1){options.onProgress(batch,index+1,boxes.length);batch=[];}}
    return hold;
  });
  const median=q(results.map(r=>r.maskAreaPx??r.w*image.width*r.h*image.height),.5)||1;
  for(const r of results){const area=r.maskAreaPx??r.w*image.width*r.h*image.height,ratio=area/median;r.appearance.relativeArea=ratio;r.appearance.apparentSize=ratio<.60?'small':ratio>1.8?'large':'medium';r.appearance.sizeBasis='Apparent image area relative to the median detected hold; perspective is not corrected.';}
  return results;
}
