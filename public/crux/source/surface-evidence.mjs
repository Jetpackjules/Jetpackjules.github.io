// Preserve supported local slope evidence when image seams have not separated
// every face. A mixed display cell is not promoted to one physical plane.
export function retainLocalSurfaceEvidence(result,evidence,holds,frame){
 if(!result.labels||!result.regions?.length)return {...result,localEvidence:evidence||[]};
 const N=result.width*result.height,mask=new Uint8Array(N),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
 for(const h of holds){const x0=clamp(Math.floor((h.x-(h.w||.02)*.6)*result.width),0,result.width-1),x1=clamp(Math.ceil((h.x+(h.w||.02)*.6)*result.width),0,result.width-1),y0=clamp(Math.floor((h.y-(h.h||.025)*.6)*result.height),0,result.height-1),y1=clamp(Math.ceil((h.y+(h.h||.025)*.6)*result.height),0,result.height-1);for(let y=y0;y<=y1;y++)mask.fill(1,y*result.width+x0,y*result.width+x1+1);}
 const localSample=(h,cell)=>{
  if(!frame?.normals||!result.floorReference?.normal)return null;
  const w=result.width,hh=result.height,rx=Math.max(5,(h.w||.02)*w*.85),ry=Math.max(5,(h.h||.025)*hh*.85),x0=Math.floor(h.x*w-rx),x1=Math.ceil(h.x*w+rx),y0=Math.floor(h.y*hh-ry),y1=Math.ceil(h.y*hh+ry),samples=[];
  if(x0<0||x1>=w||y0<0||y1>=hh)return null;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const p=y*w+x;if(result.labels[p]!==cell)return null;if(mask[p]||frame.confidence&&!(frame.confidence[p]>1))continue;
   const n=[0,1,2].map(c=>frame.normals[frame.normalLayout==='hwc'?p*3+c:c*N+p]),length=Math.hypot(...n);if(n.every(Number.isFinite)&&length>.3)samples.push(n.map(v=>v/length));}
  if(samples.length<15)return null;
  const v=[0,1,2].map(c=>median(samples.map(n=>n[c]))),length=Math.hypot(...v);if(length<.5)return null;const normal=v.map(n=>n/length),degrees=(a,b)=>Math.acos(clamp(a.reduce((n,v,i)=>n+v*b[i],0),-1,1))*180/Math.PI;
  const deviations=samples.map(n=>degrees(n,normal)).sort((a,b)=>a-b),spread=deviations[Math.floor(deviations.length*.9)];if(spread>15)return null;
  const rawAngle=degrees(normal,result.floorReference.normal)-90,angle=Math.round(rawAngle/5)*5,margin=Math.max(10,Math.ceil((spread+(result.floorReference.spread||8)+5)/5)*5);
  return {normal,spread,angle,rawAngle,range:[Math.max(-90,angle-margin),Math.min(90,angle+margin)],support:{x:x0/w,y:y0/hh,w:(x1-x0+1)/w,h:(y1-y0+1)/hh}};
 };
 const byId=new Map((evidence||[]).map(e=>[String(e.id),e])),byHold=new Map(holds.map((h,i)=>[String(h.id??i),h])),ranges=new Map();let recovered=0;
 const perHold=result.perHold.map(p=>{
  if(p.status==='estimated')return p;
  const h=byHold.get(String(p.id)),e=byId.get(String(p.id));
  if(!h||e?.status!=='estimated'||!Number.isFinite(e.angle)||!e.normal?.every(Number.isFinite))return p;
  let cell=null;for(const dx of [-.4,0,.4])for(const dy of [-.4,0,.4]){
   const x=h.x+dx*(h.w||.02),y=h.y+dy*(h.h||.025);if(!(x>=0&&x<1&&y>=0&&y<1))return p;
   const id=result.labels[Math.floor(y*result.height)*result.width+Math.floor(x*result.width)];
   if(id<0||cell!==null&&cell!==id)return p;cell=id;
  }
  const r=result.regions[cell];if(!r||r.status==='estimated')return p;
  const sample=localSample(h,cell);if(!sample)return p;
  recovered++;if(!ranges.has(cell))ranges.set(cell,[]);ranges.get(cell).push(sample.angle);
  return {...e,...sample,id:p.id,facetId:r.id,source:'local-normal-within-mixed-cell',reason:'Local normal estimate; the surrounding image cell contains mixed surfaces.'};
 });
 const regions=result.regions.map((r,i)=>ranges.get(i)?.length>=3?{...r,localAngleRange:[Math.min(...ranges.get(i)),Math.max(...ranges.get(i))],localAngleCount:ranges.get(i).length}:r.status==='uncertain'?{...r,localAngleRange:undefined,localAngleCount:0}:r);
 const known=perHold.filter(p=>p.status==='estimated').length;
 return {...result,regions,perHold,localEvidence:evidence||[],coverage:{known,unknown:holds.length-known,total:holds.length},status:known===0?'uncertain':known===holds.length?'estimated':'partial',diagnostics:{...result.diagnostics,retainedLocalEstimates:recovered}};
}
