/** Optional mask-only protrusion cleanup. No normals, reference geometry, or
 * face-area threshold. Does not alter the existing support.mjs pipeline.
 */
function median(xs){xs.sort((a,b)=>a-b);const n=xs.length,m=n>>1;return n?(n%2?xs[m]:(xs[m-1]+xs[m])/2):0;}
function morph(cv,data,w,h,operation,radius){
  const a=cv.matFromArray(h,w,cv.CV_8UC1,data),b=new cv.Mat(),k=cv.getStructuringElement(cv.MORPH_RECT,new cv.Size(radius*2+1,radius*2+1));
  try{cv.morphologyEx(a,b,operation,k);return new Uint8Array(b.data);}finally{a.delete();b.delete();k.delete();}
}
export function cleanSupportProtrusions(cv,mask,w,h,holds){
  const began=performance.now(),N=mask.length;
  const medianHoldWidth=median(holds.map(q=>Math.min(q.w*w,q.h*h)).filter(x=>x>0));
  const radius=Math.max(3,Math.min(Math.round(medianHoldWidth*.5),Math.round(Math.max(w,h)*.018)));
  const opened=morph(cv,mask,w,h,cv.MORPH_OPEN,radius);
  // Restore only a narrow band from the original contour: this preserves nearby
  // straight edges/corners without regrowing a long constant-width extension.
  const band=morph(cv,opened,w,h,cv.MORPH_DILATE,2);
  // Opening also rounds short, legitimate convex corners. Remove only long,
  // thin connected residuals; preserve short corner cuts exactly as observed.
  // Length/width are scaled by the same hold-derived radius, never face labels.
  const result=new Uint8Array(mask),visited=new Uint8Array(N),queue=new Int32Array(N),components=[];
  for(let start=0;start<N;start++)if(mask[start]&&!band[start]&&!visited[start]){
    let n=1,j=0,sx=0,sy=0,sxx=0,sxy=0,syy=0;queue[0]=start;visited[start]=1;
    while(j<n){const i=queue[j++],x=i%w,y=Math.floor(i/w);sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;syy+=y*y;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;const k=ny*w+nx;if(!visited[k]&&mask[k]&&!band[k]){visited[k]=1;queue[n++]=k;}}
    }
    const mx=sx/n,my=sy/n,xx=sxx/n-mx*mx,xy=sxy/n-mx*my,yy=syy/n-my*my,theta=.5*Math.atan2(2*xy,xx-yy),ux=Math.cos(theta),uy=Math.sin(theta);
    let lo=Infinity,hi=-Infinity;for(let k=0;k<n;k++){const i=queue[k],p=(i%w-mx)*ux+(Math.floor(i/w)-my)*uy;lo=Math.min(lo,p);hi=Math.max(hi,p);}
    const length=hi-lo+1,width=n/length,remove=length>=4*radius&&width<=1.5*radius&&length/Math.max(width,1)>=3;
    if(remove)for(let k=0;k<n;k++)result[queue[k]]=0;
    components.push({area:n,length,meanWidth:width,removed:remove});
  }
  const seeds=holds.map(q=>Math.max(0,Math.min(h-1,Math.round(q.y*h)))*w+Math.max(0,Math.min(w-1,Math.round(q.x*w))));
  const lost=seeds.filter(i=>mask[i]&&!result[i]);
  if(lost.length){
    // Attach each positive hold anchor by a shortest path restricted to the
    // original support mask. Thus a genuinely narrow hold-bearing extension is
    // protected even if narrower than the nominal thickness criterion.
    const parent=new Int32Array(N).fill(-2),queue=new Int32Array(N);let n=0,j=0;
    for(let i=0;i<N;i++)if(mask[i]&&!result[i]){
      const x=i%w;for(const k of [x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<N-w?i+w:-1])if(k>=0&&result[k]){parent[i]=k;queue[n++]=i;break;}
    }
    while(j<n){const i=queue[j++],x=i%w;for(const k of [x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<N-w?i+w:-1])if(k>=0&&mask[k]&&!result[k]&&parent[k]===-2){parent[k]=i;queue[n++]=k;}}
    const protectedPath=new Uint8Array(N);
    for(const seed of lost){let i=seed;protectedPath[i]=1;while(i>=0&&!result[i]&&parent[i]>=0){i=parent[i];protectedPath[i]=1;}}
    const protectedBand=morph(cv,protectedPath,w,h,cv.MORPH_DILATE,Math.max(2,Math.round(radius*.5)));
    for(let i=0;i<N;i++)if(mask[i]&&protectedBand[i])result[i]=1;
  }
  let removed=0,before=0,after=0;for(let i=0;i<N;i++){before+=mask[i]?1:0;after+=result[i]?1:0;if(mask[i]&&!result[i])removed++;}
  return {mask:result,width:w,height:h,diagnostics:{kernelShape:'rectangle',method:'hold-scale opening residuals: remove only long thin components; preserve short corners and protect hold anchors geodesically',openingRadius:radius,medianHoldWidth,componentRule:{minimumLengthInRadii:4,maximumMeanWidthInRadii:1.5,minimumElongation:3},components,originalArea:before,cleanArea:after,removedPixels:removed,protectedHoldAnchors:lost.length,holdAnchorsLostAfterProtection:seeds.filter(i=>mask[i]&&!result[i]).length,referenceUsed:false,wholeFaceMinimumArea:false},timings:{cleanupMs:performance.now()-began}};
}


