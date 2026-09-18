/** RGB-only support-mask inference. Worker-safe; no cached geometry or Node APIs.
 * d: {w,h,rgba, nativeGray?,nativeWidth?,nativeHeight?}; holds normalized x/y/w/h.
 * Each result owns its returned TypedArrays; all temporary OpenCV Mats are freed.
 */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const now = () => performance.now();
function rnd(x) { const n=Math.floor(x),f=x-n;return f===.5?n+(n&1):Math.round(x); }
function quantile(a,q) { if(!a.length)return 0; a.sort((x,y)=>x-y);const p=(a.length-1)*q,i=Math.floor(p);return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(p-i); }
const median = a => quantile(a,.5);
function mat(cv,data,w,h,type=cv.CV_8UC1) { return cv.matFromArray(h,w,type,data); }
function copied(m) { if(m.type()===5)return new Float32Array(m.data32F);if(m.type()===4)return new Int32Array(m.data32S);return new Uint8Array(m.data); }
function resize(cv,data,w,h,W,H,type=cv.CV_8UC1,interpolation=cv.INTER_NEAREST) {
  if(w===W&&h===H)return data.slice();const a=mat(cv,data,w,h,type),b=new cv.Mat();
  try{cv.resize(a,b,new cv.Size(W,H),0,0,interpolation);return copied(b);}finally{a.delete();b.delete();}
}
function rect(a,w,h,x1,y1,x2,y2,value=1) {
  x1=clamp(rnd(x1),0,w-1);x2=clamp(rnd(x2),0,w-1);y1=clamp(rnd(y1),0,h-1);y2=clamp(rnd(y2),0,h-1);
  for(let y=y1;y<=y2;y++)a.fill(value,y*w+x1,y*w+x2+1);
}
function holdsMask(holds,w,h,expansion=1.1,value=1) {
  const a=new Uint8Array(w*h);for(const q of holds){const x=q.x*w,y=q.y*h,rx=q.w*w*expansion/2,ry=q.h*h*expansion/2;rect(a,w,h,x-rx,y-ry,x+rx,y+ry,value);}return a;
}
function centersMask(holds,w,h) {
  const a=new Uint8Array(w*h);for(const q of holds){const x=rnd(q.x*w),y=rnd(q.y*h);for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]])if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)a[(y+dy)*w+x+dx]=1;}return a;
}
function morph(cv,a,w,h,operation,radius,ellipse=true) {
  const src=mat(cv,a,w,h),dst=new cv.Mat(),k=cv.getStructuringElement(ellipse?cv.MORPH_ELLIPSE:cv.MORPH_RECT,new cv.Size(2*radius+1,2*radius+1));
  try{cv.morphologyEx(src,dst,operation,k);return new Uint8Array(dst.data);}finally{src.delete();dst.delete();k.delete();}
}
function dist(cv,a,w,h) {
  const src=mat(cv,a,w,h),dst=new cv.Mat();try{cv.distanceTransform(src,dst,cv.DIST_L2,5);return new Float32Array(dst.data32F);}finally{src.delete();dst.delete();}
}
function components(cv,a,w,h,connectivity=8) {
  const src=mat(cv,a,w,h),labels=new cv.Mat(),stats=new cv.Mat(),centers=new cv.Mat();
  try{const count=cv.connectedComponentsWithStats(src,labels,stats,centers,connectivity,cv.CV_32S);return {count,labels:new Int32Array(labels.data32S),stats:new Int32Array(stats.data32S),centers:new Float64Array(centers.data64F)};}finally{src.delete();labels.delete();stats.delete();centers.delete();}
}
function fillHoles(a,w,h) {
  const seen=new Uint8Array(a.length),queue=new Int32Array(a.length);let n=0,j=0;
  function add(i){if(!a[i]&&!seen[i]){seen[i]=1;queue[n++]=i;}}
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  while(j<n){const i=queue[j++],x=i%w;if(x)add(i-1);if(x<w-1)add(i+1);if(i>=w)add(i-w);if(i<a.length-w)add(i+w);}
  return Uint8Array.from(a,(v,i)=>v||!seen[i]?1:0);
}
function nearestSpacing(holds,w,h) {
  if(holds.length<2)return Math.max(w,h)*.035;const ds=[];
  for(let i=0;i<holds.length;i++){let best=Infinity;for(let j=0;j<holds.length;j++)if(i!==j)best=Math.min(best,Math.hypot((holds[i].x-holds[j].x)*w,(holds[i].y-holds[j].y)*h));ds.push(best);}return Math.max(1,median(ds));
}
function rgbMat(cv,d,W,H) {
  const a=mat(cv,d.rgba,d.w,d.h,cv.CV_8UC4),scaled=new cv.Mat(),rgb=new cv.Mat();
  try{cv.resize(a,scaled,new cv.Size(W,H),0,0,cv.INTER_AREA);cv.cvtColor(scaled,rgb,cv.COLOR_RGBA2RGB);return rgb;}finally{a.delete();scaled.delete();}
}
function grayscale(cv,d) {
  if(d.nativeGray&&d.nativeWidth&&d.nativeHeight)return {data:d.nativeGray,width:d.nativeWidth,height:d.nativeHeight};
  const rgba=mat(cv,d.rgba,d.w,d.h,cv.CV_8UC4),gray=new cv.Mat();try{cv.cvtColor(rgba,gray,cv.COLOR_RGBA2GRAY);return {data:new Uint8Array(gray.data),width:d.w,height:d.h};}finally{rgba.delete();gray.delete();}
}

export function computeInitialSupport(cv,d,holds) {
  const begin=now(),scale=480/Math.max(d.w,d.h),w=rnd(d.w*scale),h=rnd(d.h*scale),N=w*h;
  if(!holds.length)return {mask:new Uint8Array(d.w*d.h),width:d.w,height:d.h,diagnostics:{reason:'No detected holds'},timings:{initialMs:now()-begin}};
  const rgb=rgbMat(cv,d,w,h),clean=new cv.Mat(),gray=new cv.Mat(),float=new cv.Mat(),mean=new cv.Mat(),square=new cv.Mat(),meanSquare=new cv.Mat();
  const boxes=holdsMask(holds,w,h,1.15,255),boxmat=mat(cv,boxes,w,h),centers=centersMask(holds,w,h);
  let gc=null,bg=null,fg=null;
  try {
    cv.inpaint(rgb,boxmat,clean,3,cv.INPAINT_TELEA);cv.cvtColor(rgb,gray,cv.COLOR_RGB2GRAY);gray.convertTo(float,cv.CV_32F);
    cv.blur(float,mean,new cv.Size(5,5));cv.multiply(float,float,square);cv.blur(square,meanSquare,new cv.Size(5,5));
    const ring=morph(cv,boxes,w,h,cv.MORPH_DILATE,4,false),variance=new Float32Array(N),ringValues=[];
    for(let i=0;i<N;i++){variance[i]=Math.max(0,meanSquare.data32F[i]-mean.data32F[i]**2);if(ring[i]&&!boxes[i])ringValues.push(variance[i]);}
    const threshold=quantile(ringValues,.55),spacing=nearestSpacing(holds,w,h),distance=dist(cv,Uint8Array.from(centers,v=>1-v),w,h),bgDistance=Math.max(.1*Math.max(w,h),3*spacing);
    const seeds=new Uint8Array(N),gcData=new Uint8Array(N);let hardBg=0;
    for(let i=0;i<N;i++){seeds[i]=(ring[i]&&!boxes[i]&&variance[i]<=threshold)||centers[i]?1:0;gcData[i]=distance[i]<bgDistance*.75?cv.GC_PR_FGD:cv.GC_PR_BGD;if(distance[i]>bgDistance){gcData[i]=cv.GC_BGD;hardBg++;}if(seeds[i])gcData[i]=cv.GC_FGD;}
    // A wall filling the crop may have no defensible background seed.
    if(!hardBg)return {mask:new Uint8Array(d.w*d.h).fill(1),width:d.w,height:d.h,diagnostics:{reason:'No distant background in crop',assumedFullFrame:true},timings:{initialMs:now()-begin}};
    gc=mat(cv,gcData,w,h);bg=new cv.Mat();fg=new cv.Mat();if(cv.setRNGSeed)cv.setRNGSeed(447);
    cv.grabCut(clean,gc,new cv.Rect(),bg,fg,3,cv.GC_INIT_WITH_MASK);
    const raw=Uint8Array.from(gc.data,v=>v===cv.GC_FGD||v===cv.GC_PR_FGD?1:0),cc=components(cv,raw,w,h),kept=new Uint8Array(cc.count);
    for(let i=0;i<N;i++)if(seeds[i]&&cc.labels[i])kept[cc.labels[i]]=1;
    const wall=fillHoles(Uint8Array.from(cc.labels,id=>kept[id]),w,h);
    return {mask:resize(cv,wall,w,h,d.w,d.h),width:d.w,height:d.h,lowResolution:{mask:wall,width:w,height:h},diagnostics:{spacing,bgDistance,wallFraction:wall.reduce((a,b)=>a+b,0)/N},timings:{initialMs:now()-begin}};
  } finally {for(const m of [rgb,clean,gray,float,mean,square,meanSquare,boxmat,gc,bg,fg])if(m)m.delete();}
}

function detectDots(cv,d,holds) {
  const source=grayscale(cv,d),factor=Math.min(1,1600/Math.max(source.width,source.height)),w=rnd(source.width*factor),h=rnd(source.height*factor),scale=Math.max(w,h)/1600;
  const values=resize(cv,source.data,source.width,source.height,w,h,cv.CV_8UC1,cv.INTER_AREA),gray=mat(cv,values,w,h),response=new cv.Mat();
  const diameter=Math.max(5,rnd(11*scale)|1),kernel=cv.getStructuringElement(cv.MORPH_ELLIPSE,new cv.Size(diameter,diameter)),block=holdsMask(holds,w,h,1.06);
  try {
    cv.morphologyEx(gray,response,cv.MORPH_BLACKHAT,kernel);const binary=Uint8Array.from(response.data,(v,i)=>v>=16&&!block[i]?1:0),cc=components(cv,binary,w,h);
    const dots=[],radius=Math.max(4,rnd(7*scale));
    for(let id=1;id<cc.count;id++){
      const [x,y,bw,bh,area]=cc.stats.subarray(id*5,id*5+5);if(area<2*scale*scale||area>65*scale*scale||Math.max(bw/bh,bh/bw)>2.3)continue;
      const patch=new Uint8Array(bw*bh),centerValues=[];
      for(let yy=0;yy<bh;yy++)for(let xx=0;xx<bw;xx++){const i=(y+yy)*w+x+xx;if(cc.labels[i]===id){patch[yy*bw+xx]=1;centerValues.push(values[i]);}}
      const pm=mat(cv,patch,bw,bh),contours=new cv.MatVector(),hierarchy=new cv.Mat();let perimeter=Infinity;
      try{cv.findContours(pm,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);if(contours.size()){const c=contours.get(0);perimeter=cv.arcLength(c,true);c.delete();}}finally{pm.delete();contours.delete();hierarchy.delete();}
      if(4*Math.PI*area/Math.max(perimeter*perimeter,1)<.22)continue;
      const cx=cc.centers[id*2],cy=cc.centers[id*2+1],xx=rnd(cx),yy=rnd(cy);if(xx<radius||yy<radius||xx>=w-radius||yy>=h-radius)continue;
      const ring=[];for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const r2=dx*dx+dy*dy;if(r2>=(radius*.6)**2&&r2<=radius*radius)ring.push(values[(yy+dy)*w+xx+dx]);}
      const brightness=median(ring),contrast=brightness-median(centerValues);if(brightness>=80&&contrast>=17)dots.push([cx/w,cy/h]);
    }
    return {dots,width:w,height:h};
  } finally {gray.delete();response.delete();kernel.delete();}
}
function gaussian(cv,values,w,h,sigma) {
  const a=mat(cv,values,w,h,cv.CV_32F),b=new cv.Mat(),radius=rnd(4*sigma);
  try{cv.GaussianBlur(a,b,new cv.Size(radius*2+1,radius*2+1),sigma,sigma,cv.BORDER_CONSTANT);return new Float32Array(b.data32F);}finally{a.delete();b.delete();}
}
function textureFields(cv,d,dots,holds,W,H) {
  const factor=400/Math.max(d.w,d.h),w=rnd(d.w*factor),h=rnd(d.h*factor),N=w*h,sigma=12;
  const impulse=new Float32Array(N),ones=new Float32Array(N).fill(1),block=holdsMask(holds,w,h,1.06);
  for(const p of dots)impulse[clamp(rnd(p[1]*h),0,h-1)*w+clamp(rnd(p[0]*w),0,w-1)]++;
  const density=gaussian(cv,impulse,w,h,sigma),bare=gaussian(cv,Float32Array.from(block,v=>1-v),w,h,sigma),domain=gaussian(cv,ones,w,h,sigma);
  const moments=[];for(let kind=0;kind<5;kind++){const a=new Float32Array(N);for(let i=0;i<N;i++)if(impulse[i]){const x=i%w,y=Math.floor(i/w);a[i]=impulse[i]*[x,y,x*x,y*y,x*y][kind];}moments.push(gaussian(cv,a,w,h,sigma));}
  const support=new Float32Array(N),absence=new Float32Array(N);
  for(let i=0;i<N;i++){
    const safe=Math.max(density[i],1e-9),mx=moments[0][i]/safe,my=moments[1][i]/safe,cxx=Math.max(0,moments[2][i]/safe-mx*mx),cyy=Math.max(0,moments[3][i]/safe-my*my),cxy=moments[4][i]/safe-mx*my;
    const trace=cxx+cyy,disc=Math.sqrt(Math.max(0,(cxx-cyy)**2+4*cxy*cxy)),ratio=Math.max(0,trace-disc)/Math.max(trace+disc,1e-9),equivalent=density[i]*(2*Math.PI*sigma*sigma)/Math.max(bare[i],.2);
    support[i]=clamp(equivalent/8,0,1)*clamp(ratio/.25,0,1);absence[i]=clamp((bare[i]/Math.max(domain[i],1e-8)-.2)/.5,0,1)*clamp(1-equivalent/3,0,1);
  }
  return {support:resize(cv,support,w,h,W,H,cv.CV_32F,cv.INTER_LINEAR),absence:resize(cv,absence,w,h,W,H,cv.CV_32F,cv.INTER_LINEAR)};
}
function completeThinBarriers(cells,domain,w,h) {
  // Barriers are one pixel thick. Breadth-first nearest-neighbor completion is
  // sufficient to restore these raster edges; it is not surface extrapolation.
  const queue=new Int32Array(cells.length),seen=new Uint8Array(cells.length);let n=0,j=0;
  for(let i=0;i<cells.length;i++)if(domain[i]&&!cells[i]){const x=i%w;let label=0;for(const k of [x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<cells.length-w?i+w:-1])if(k>=0&&cells[k]){label=cells[k];break;}if(label){queue[n++]=i;seen[i]=1;}}
  while(j<n){const i=queue[j++],x=i%w;let label=cells[i];if(!label)for(const k of [x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<cells.length-w?i+w:-1])if(k>=0&&cells[k]){label=cells[k];break;}cells[i]=label;for(const k of [x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<cells.length-w?i+w:-1])if(k>=0&&domain[k]&&!cells[k]&&!seen[k]){seen[k]=1;queue[n++]=k;}}
}
function outline(cv,wall,w,h,epsilon) {
  const m=mat(cv,wall,w,h),contours=new cv.MatVector(),hier=new cv.Mat(),out=cv.Mat.zeros(h,w,cv.CV_8UC1),polys=new cv.MatVector(),polygons=[];
  try{
    cv.findContours(m,contours,hier,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
    for(let i=0;i<contours.size();i++){const c=contours.get(i),p=new cv.Mat();cv.approxPolyDP(c,p,epsilon,true);const points=[];for(let k=0;k<p.data32S.length;k+=2)points.push([p.data32S[k],p.data32S[k+1]]);polygons.push(points);polys.push_back(p);p.delete();c.delete();}
    if(polys.size())cv.fillPoly(out,polys,new cv.Scalar(1));return {mask:new Uint8Array(out.data),polygons};
  }finally{m.delete();contours.delete();hier.delete();out.delete();polys.delete();}
}

export function refineSupport(cv,d,holds,initial,lines) {
  const begin=now(),factor=800/Math.max(d.w,d.h),w=rnd(d.w*factor),h=rnd(d.h*factor),N=w*h;
  const base=resize(cv,initial.mask,initial.width,initial.height,w,h),dotsResult=detectDots(cv,d,holds),dotMs=now()-begin;
  const fields=textureFields(cv,d,dotsResult.dots,holds,w,h),textureMs=now()-begin-dotMs;
  const center=centersMask(holds,w,h),spacing=nearestSpacing(holds,w,h),distance=dist(cv,Uint8Array.from(center,v=>1-v),w,h),unary=new Float32Array(N);
  for(let i=0;i<N;i++)unary[i]=1.8*fields.support[i]+1.4*Math.exp(-.5*(distance[i]/(spacing*1.25))**2)-.9*fields.absence[i]-.45;
  const inside=dist(cv,base,w,h),outside=dist(cv,Uint8Array.from(base,v=>1-v),w,h),near=morph(cv,base,w,h,cv.MORPH_DILATE,5,false),barrier=cv.Mat.zeros(h,w,cv.CV_8UC1),candidates=[];
  try{
    for(const line of lines){const flat=line.segment.flat(),s=[[flat[0]*w/d.w,flat[1]*h/d.h],[flat[2]*w/d.w,flat[3]*h/d.h]],dx=s[1][0]-s[0][0],dy=s[1][1]-s[0][1],L=Math.hypot(dx,dy);if(L<w*.055)continue;
      const n=Math.max(10,rnd(L)),proximity=[];let count=0,overlap=0;
      for(let k=0;k<n;k++){const x=rnd(s[0][0]+dx*k/(n-1)),y=rnd(s[0][1]+dy*k/(n-1));if(x<0||x>=w||y<0||y>=h)continue;const i=y*w+x;overlap+=near[i];proximity.push(inside[i]+outside[i]);count++;}
      if(!count||overlap/count<.15||median(proximity)>w*.05)continue;
      const mx=(s[0][0]+s[1][0])/2,my=(s[0][1]+s[1][1])/2,ux=dx/L,uy=dy/L;
      cv.line(barrier,new cv.Point(rnd(mx-ux*2*w),rnd(my-uy*2*w)),new cv.Point(rnd(mx+ux*2*w),rnd(my+uy*2*w)),new cv.Scalar(1),1);candidates.push(s);
    }
    const domain=morph(cv,base,w,h,cv.MORPH_DILATE,5),available=Uint8Array.from(domain,(v,i)=>v&&!barrier.data[i]?1:0),cc=components(cv,available,w,h,4),cells=cc.labels;
    completeThinBarriers(cells,domain,w,h);
    const areas=new Float64Array(cc.count),sums=new Float64Array(cc.count),votes=new Uint32Array(cc.count),dotCounts=new Uint32Array(cc.count),bareArea=new Float64Array(cc.count),bare=holdsMask(holds,w,h,1.1);
    for(let i=0;i<N;i++){const id=cells[i];areas[id]++;sums[id]+=unary[i];bareArea[id]+=1-bare[i];}
    for(const q of holds){const x=clamp(rnd(q.x*w),0,w-1),y=clamp(rnd(q.y*h),0,h-1),i=y*w+x;if(base[i])votes[cells[i]]++;}
    for(const p of dotsResult.dots)dotCounts[cells[clamp(rnd(p[1]*h),0,h-1)*w+clamp(rnd(p[0]*w),0,w-1)]]++;
    const densities=new Float64Array(cc.count),calibration=[];for(let i=0;i<cc.count;i++){densities[i]=dotCounts[i]/Math.max(bareArea[i],1);if(votes[i]&&dotCounts[i]>=3&&bareArea[i]>=50)calibration.push(densities[i]);}
    let totalBare=0;for(let i=0;i<N;i++)if(domain[i])totalBare+=1-bare[i];const typical=calibration.length?median(calibration):dotsResult.dots.length/Math.max(1,totalBare);
    const keep=Uint8Array.from(areas,(_,id)=>id&&((sums[id]/Math.max(1,areas[id])>0&&densities[id]>=typical*.35)||votes[id])?1:0);
    let wall=Uint8Array.from(cells,(id,i)=>keep[id]&&domain[i]?1:0);wall=morph(cv,wall,w,h,cv.MORPH_CLOSE,3);wall=morph(cv,wall,w,h,cv.MORPH_OPEN,2);wall=fillHoles(wall,w,h);
    const bodies=components(cv,wall,w,h),bodyVotes=new Uint32Array(bodies.count);for(const q of holds)bodyVotes[bodies.labels[clamp(rnd(q.y*h),0,h-1)*w+clamp(rnd(q.x*w),0,w-1)]]++;bodyVotes[0]=0;let winner=0;for(let i=1;i<bodyVotes.length;i++)if(bodyVotes[i]>bodyVotes[winner])winner=i;
    if(winner)wall=Uint8Array.from(bodies.labels,id=>id===winner?1:0);
    const fitted=outline(cv,wall,w,h,2.2),mask=resize(cv,fitted.mask,w,h,d.w,d.h),polygons=fitted.polygons.map(p=>p.map(([x,y])=>[x*d.w/w,y*d.h/h]));
    return {mask,width:d.w,height:d.h,polygons,dots:dotsResult.dots.map(([x,y])=>[x*d.w,y*d.h]),diagnostics:{dotCount:dotsResult.dots.length,dotSourceDimensions:[dotsResult.width,dotsResult.height],candidateLines:candidates.length,computationalCells:cc.count-1,typicalDotDensity:typical,wallFraction:fitted.mask.reduce((a,b)=>a+b,0)/N,referenceUsed:false,normalsUsed:false},timings:{dotsMs:dotMs,textureMs,refinementMs:now()-begin-dotMs-textureMs,totalMs:now()-begin}};
  }finally{barrier.delete();}
}
