import {detectSurfaceSeams as edgeChains} from './automatic-surfaces.mjs?v=21';
const gradientRegions=input=>edgeChains({...input,fullGradient:true});
const unit=n=>{const l=Math.hypot(...n);return l>1e-8?n.map(v=>v/l):null;};
export function augmentGradientSeams(input){
 const old=edgeChains(input),extra=gradientRegions(input),{width:w,height:h,normals,holds=[]}=input,N=w*h;
 const sample=(x,y)=>{const xx=Math.round(x*w),yy=Math.round(y*h);if(xx<1||xx>=w-1||yy<1||yy>=h-1||holds.some(p=>Math.abs(x-p.x)<p.w*.55&&Math.abs(y-p.y)<p.h*.55))return null;const sum=[0,0,0];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const p=(yy+dy)*w+xx+dx;for(let c=0;c<3;c++)sum[c]+=normals[input.normalLayout==='hwc'?p*3+c:c*N+p];}return unit(sum);};
 const accepted=[];
 for(const line of extra){const dx=(line.b[0]-line.a[0])*w,dy=(line.b[1]-line.a[1])*h,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,deltas=[];
  for(let i=0;i<40;i++){const t=.03+.94*i/39,x=line.a[0]+(line.b[0]-line.a[0])*t,y=line.a[1]+(line.b[1]-line.a[1])*t;for(const off of [.012,.025,.04]){const a=sample(x+nx*off,y+ny*off*w/h),b=sample(x-nx*off,y-ny*off*w/h);if(a&&b)deltas.push(Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,c)=>s+v*b[c],0))))*180/Math.PI);}}
  deltas.sort((a,b)=>a-b);const jump=deltas[Math.floor(deltas.length/2)];if(deltas.length<12||jump<7)continue;
  if(old.some(q=>{const qdx=(q.b[0]-q.a[0])*w,qdy=(q.b[1]-q.a[1])*h,qlen=Math.hypot(qdx,qdy);return Math.abs((dx*qdx+dy*qdy)/(len*qlen))>.998&&Math.abs(dx*(q.a[1]-line.a[1])*h-dy*(q.a[0]-line.a[0])*w)/len<2.5;}))continue;
  accepted.push({...line,source:'normal-supported-gradient-region',normalJump:jump});
 }
 return [...old,...accepted];
}
