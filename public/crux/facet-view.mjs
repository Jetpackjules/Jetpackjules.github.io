// Polygon boundaries and angle certainty are separate pieces of evidence.
import {clipToRect,inPolygon} from './wall-facets.mjs?v=19';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const validRect=r=>r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.w>0&&r.h>0;
const color=angle=>angle< -5?'#8fd8fa':angle<=5?'#cfee89':angle<=25?'#ffd384':angle<=45?'#ffab79':'#ec94c3';
export const slopeLabel=angle=>!Number.isFinite(angle)?'Angle unavailable':angle===0?'≈ 0° vertical':`≈ ${Math.abs(angle)}° ${angle<0?'slab':'overhang'}`;
const point=(x,y)=>`${x.toFixed(3)} ${y.toFixed(3)}`;
function segmentPath(a,b,crop){
 let lo=0,hi=1;const dx=b[0]-a[0],dy=b[1]-a[1];
 for(const [p,q] of [[-dx,a[0]-crop.x],[dx,crop.x+crop.w-a[0]],[-dy,a[1]-crop.y],[dy,crop.y+crop.h-a[1]]]){
  if(Math.abs(p)<1e-12){if(q<0)return '';continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return '';
 }
 const projected=t=>point((a[0]+t*dx-crop.x)/crop.w*1000,(a[1]+t*dy-crop.y)/crop.h*1000);
 return `M ${projected(lo)} L ${projected(hi)}`;
}

export function facetRegions(local,crop={x:0,y:0,w:1,h:1}){
 if(!validRect(crop))return [];
 if(Array.isArray(local?.facets))return local.facets.flatMap(f=>{
  const polygon=clipToRect(f.polygon,crop).map(([x,y])=>[(x-crop.x)/crop.w,(y-crop.y)/crop.h]);
  if(polygon.length<3)return [];
  const area=Math.abs(polygon.reduce((s,p,i)=>{const q=polygon[(i+1)%polygon.length];return s+p[0]*q[1]-q[0]*p[1];},0))/2;
  if(area<(f.boundary==='rgb-seam-graph'?.0001:.002))return [];
  const holes=(f.holes||[]).map(h=>clipToRect(h,crop).map(([x,y])=>[(x-crop.x)/crop.w,(y-crop.y)/crop.h])).filter(h=>h.length>=3);
  const path=[polygon,...holes].map(ring=>ring.map((p,i)=>`${i?'L':'M'} ${point(p[0]*1000,p[1]*1000)}`).join(' ')+' Z').join(' '),cells=[];
  // Candidate label positions must remain inside the actual concave polygon.
  for(let y=.025;y<1;y+=.05)for(let x=.025;x<1;x+=.05)if(inPolygon(x,y,polygon)&&!holes.some(h=>inPolygon(x,y,h)))cells.push({x:x-.012,y:y-.012,w:.024,h:.024});
  if(!cells.length&&f.anchor){const x=(f.anchor.x-crop.x)/crop.w,y=(f.anchor.y-crop.y)/crop.h;if(inPolygon(x,y,polygon))cells.push({x:x-.012,y:y-.012,w:.024,h:.024});}
  if(!cells.length)return [];
  const center={x:cells.reduce((s,c)=>s+c.x+.012,0)/cells.length,y:cells.reduce((s,c)=>s+c.y+.012,0)/cells.length};
  const c=cells.reduce((a,b)=>Math.hypot(a.x+.012-center.x,a.y+.012-center.y)<Math.hypot(b.x+.012-center.x,b.y+.012-center.y)?a:b);
  const angle=f.status==='estimated'?f.angle:null;
  const singleVertical=local.facets.length===1&&Number.isFinite(angle)&&Math.abs(angle)<5;
  const segments=f.boundarySegments;
  const boundary=segments?segments.filter(s=>s.source==='approximate-normal-boundary').map(s=>segmentPath(s.a,s.b,crop)).join(' '):path;
  const seams=segments?segments.filter(s=>s.source==='image-seam').map(s=>segmentPath(s.a,s.b,crop)).join(' '):'';
  return [{id:f.id,angle,localAngleRange:f.localAngleRange,color:angle===null?'#bed7d9':color(angle),path:singleVertical?'':path,boundary:singleVertical?'':boundary,seams:singleVertical?'':seams,polygon,holes,area,cells,anchor:{x:c.x+.012,y:c.y+.012},source:f.boundary}];
 });
 if(!validRect(crop)||!validRect(local?.wallRoi)||!local?.patches?.length)return [];
 const patches=local.patches.filter(p=>Number.isInteger(p.row)&&Number.isInteger(p.column));
 if(!patches.length)return [];
 const rows=Math.max(...patches.map(p=>p.row))+1,columns=Math.max(...patches.map(p=>p.column))+1,r=local.wallRoi;
 const byId=new Map(patches.map(p=>[p.id,p]));
 const cell=p=>{
  const x1=clamp((r.x+p.column*r.w/columns-crop.x)/crop.w,0,1),x2=clamp((r.x+(p.column+1)*r.w/columns-crop.x)/crop.w,0,1);
  const y1=clamp((r.y+p.row*r.h/rows-crop.y)/crop.h,0,1),y2=clamp((r.y+(p.row+1)*r.h/rows-crop.y)/crop.h,0,1);
  return x2>x1&&y2>y1?{x:x1,y:y1,w:x2-x1,h:y2-y1}:null;
 };
 return (local.regions||[]).flatMap(region=>{
  if(!Number.isFinite(region.angle))return [];
  const cells=(region.patchIds||[]).map(id=>byId.get(id)).filter(p=>p?.status==='estimated'&&Number.isFinite(p.angle)).map(cell).filter(Boolean);
  if(!cells.length)return [];
  // Keep individual cell subpaths: no bounding hull bridging unknown cells.
  const path=cells.map(c=>`M ${point(c.x*1000,c.y*1000)} h ${(c.w*1000).toFixed(3)} v ${(c.h*1000).toFixed(3)} h ${(-c.w*1000).toFixed(3)} Z`).join(' ');
  const edges=new Map();for(const c of cells){const corners=[[c.x,c.y],[c.x+c.w,c.y],[c.x+c.w,c.y+c.h],[c.x,c.y+c.h]];for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],key=[a,b].map(p=>p.map(v=>v.toFixed(6)).join(',')).sort().join('|');if(edges.has(key))edges.delete(key);else edges.set(key,`M ${point(a[0]*1000,a[1]*1000)} L ${point(b[0]*1000,b[1]*1000)}`);}}
  const boundary=[...edges.values()].join(' ');
  const cx=cells.reduce((n,c)=>n+c.x+c.w/2,0)/cells.length,cy=cells.reduce((n,c)=>n+c.y+c.h/2,0)/cells.length;
  const anchor=cells.reduce((a,b)=>Math.hypot(a.x+a.w/2-cx,a.y+a.h/2-cy)<Math.hypot(b.x+b.w/2-cx,b.y+b.h/2-cy)?a:b);
  return [{id:region.id,angle:region.angle,color:color(region.angle),path,boundary,cells,anchor:{x:anchor.x+anchor.w/2,y:anchor.y+anchor.h/2}}];
 });
}

export function facetLabels(regions,width,height,zoom=1){
 if(!(width>=80&&height>=80))return [];
 const used=[],font=13/Math.max(1,zoom),pad=7/Math.max(1,zoom);
 for(const r of [...regions].sort((a,b)=>b.cells.length-a.cells.length)){
  const mixed=r.localAngleRange,label=r.angle===null&&mixed?`≈ ${mixed[0]===mixed[1]?mixed[0]:mixed.join('–')}° · mixed`:slopeLabel(r.angle),w=(label.length*font*.56+pad*2)/width,h=(font+pad*1.5)/height;
  const centers=[r.anchor,...r.cells.map(c=>({x:c.x+c.w/2,y:c.y+c.h/2}))],candidates=[...centers,...centers.flatMap(c=>[-1,1].map(d=>({x:c.x,y:c.y+d*h*1.4})))];
  for(const c of candidates){
   const x=clamp(c.x,w/2+.005,1-w/2-.005),y=clamp(c.y,h/2+.005,1-h/2-.005);
   if(r.polygon&&(!inPolygon(x,y,r.polygon)||r.holes?.some(h=>inPolygon(x,y,h))))continue;
   if(used.some(p=>Math.abs(x-p.x)<(w+p.w)/2+3/width&&Math.abs(y-p.y)<(h+p.h)/2+3/height))continue;
   used.push({id:r.id,x,y,w,h,font,label,anchor:r.anchor});break;
  }
 }
 return used;
}
export function facetOverlay(regions,width=1000,height=1000,zoom=1){
 const labels=new Map(facetLabels(regions,width,height,zoom).map(p=>[p.id,p]));
 return regions.map((r,i)=>{
  const p=labels.get(r.id),tag=p?`<g class="facet-angle"><path d="M ${point(r.anchor.x*1000,r.anchor.y*1000)} L ${point(p.x*1000,p.y*1000)}" stroke="${r.color}" stroke-width="1" vector-effect="non-scaling-stroke"/><g transform="translate(${(p.x*1000).toFixed(2)} ${(p.y*1000).toFixed(2)}) scale(${1000/width} ${1000/height})"><rect x="${-p.w*width/2}" y="${-p.h*height/2}" width="${p.w*width}" height="${p.h*height}" rx="${4/Math.max(1,zoom)}" fill="#1e2827" fill-opacity=".93" stroke="${r.color}" stroke-width="${1/Math.max(1,zoom)}"/><text fill="${r.color}" font-size="${p.font}" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-weight="600">${p.label}</text></g></g>`:'';
  return `<g class="facet-region" data-boundary-source="${r.source||'legacy-samples'}" style="--facet-color:${r.color};--facet-delay:${Math.min(i,8)*60}ms"><path class="facet-surface" d="${r.path}" fill-rule="evenodd" fill="${r.color}" fill-opacity="${r.angle===null?'.035':'.13'}"/><path d="${r.boundary||''}" fill="none" stroke="${r.color}" stroke-opacity=".28" stroke-width="1" vector-effect="non-scaling-stroke"/><path d="${r.seams||''}" fill="none" stroke="${r.color}" stroke-opacity=".95" stroke-width="2" vector-effect="non-scaling-stroke"/>${tag}</g>`;
 }).join('');
}

// A replay never waits for inference or delays the interactive result.
export function createScanReveal(onPhase,{reducedMotion=()=>false,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let timer=null,generation=0;
 const cancel=()=>{generation++;clearTimer(timer);timer=null;onPhase('idle');};
 return {cancel,showBase(){cancel();if(!reducedMotion())onPhase('base');},play(hasFacets){cancel();if(reducedMotion())return;const token=generation,stages=[['base',300],...(hasFacets?[['facets',1250]]:[]),['holds',850],['selected',600]];let index=0;
  const next=()=>{if(token!==generation)return;const stage=stages[index++];if(!stage){timer=null;onPhase('idle');return;}onPhase(stage[0]);timer=setTimer(next,stage[1]);};next();
 }};
}
