import {inPolygon} from './wall-facets.mjs?v=21';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const unit=v=>{const l=Math.hypot(...v);return l>1e-6?v.map(x=>x/l):null;};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const neutral={right:{x:1,y:0},up:{x:0,y:-1},turn:0};
const good=n=>Array.isArray(n)&&n.length===3&&n.every(Number.isFinite)&&Math.hypot(...n)>.5;
export function facetBasis(normal,floor=[0,-1,0],ray=[0,0,1]){
 if(!good(normal))return neutral;
 let n=unit(normal),g=unit(good(floor)?floor:[0,-1,0]);if(dot(n,ray)>0)n=n.map(x=>-x);
 // At a horizontal roof gravity has no tangent. Use the limiting direction
 // away from the camera instead of suddenly drawing an upright body.
 const up=unit(g.map((x,i)=>x-dot(g,n)*n[i]))||unit([0,0,-1].map((x,i)=>x+n[2]*n[i]));if(!up)return neutral;
 const right=unit(cross(up,n));if(!right)return neutral;
 const project=v=>({x:v[0]-ray[0]*v[2],y:v[1]-ray[1]*v[2]});
 const gravity=project(g),scale=Math.max(.5,Math.hypot(gravity.x,gravity.y)),pu=project(up),pr=project(right),u={x:pu.x/scale,y:pu.y/scale},r={x:pr.x/scale,y:pr.y/scale};
 // A single image can suggest orientation, but extreme edge-on projections
 // are too unstable to draw as calibrated anatomy.
 return {right:{x:clamp(r.x,.35,1.05),y:clamp(r.y,-.35,.35)},up:{x:clamp(u.x,-.6,.6),y:clamp(u.y,-1.05,-.18)},turn:clamp(right[2],-.8,.8)};
}
export function poseFacets(step,holds,visual={}){
 if(visual.angleMode==='manual'){
  const angle=clamp(Number.isFinite(visual.angle)?visual.angle:0,-30,75)*Math.PI/180;
  const basis=facetBasis([0,Math.sin(angle),-Math.cos(angle)]);
  return {upper:basis,lower:basis,known:0,source:'manual'};
 }
 const byId=new Map(holds.map(h=>[h.id,h]));
 const normalFor=id=>byId.get(id)?.incline?.normal;
 const mean=ns=>unit([0,1,2].map(i=>ns.reduce((s,n)=>s+n[i],0)));
 let count=0;
 const group=ids=>{const ns=ids.map(normalFor).filter(good);if(!ns.length)return {normal:null,conflict:false};
  if(ns.length===2&&dot(unit(ns[0]),unit(ns[1]))<.94)return {normal:null,conflict:true};count+=ns.length;return {normal:mean(ns),conflict:false};};
 const hands=group([step.lh,step.rh]),feet=group([step.lf,step.rf]);
 let upper=hands.normal,lower=feet.normal;
 const crop=visual.crop||{x:0,y:0,w:1,h:1},x=crop.x+step.body.x*crop.w,y=crop.y+step.body.y*crop.h;
 const k=2*Math.tan(65*Math.PI/360),ray=[(x-.5)*k,(y-.5)*k/(visual.fullAspect||visual.imageAspect||1),1];
 const local=(visual.patches||[]).filter(p=>p.status==='estimated'&&good(p.normal)&&p.roi&&x>=p.roi.x&&x<=p.roi.x+p.roi.w&&y>=p.roi.y&&y<=p.roi.y+p.roi.h&&(!p.polygon||inPolygon(x,y,p.polygon))&&!p.holes?.some(h=>inPolygon(x,y,h))).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0]?.normal;
 if(!upper&&!hands.conflict)upper=local;if(!lower&&!feet.conflict)lower=local;
 return {upper:facetBasis(upper,visual.floorNormal,ray),lower:facetBasis(lower,visual.floorNormal,ray),known:count,source:upper||lower?'photo':'neutral'};
}
export function mixBasis(a,b,t){return {right:{x:a.right.x+(b.right.x-a.right.x)*t,y:a.right.y+(b.right.y-a.right.y)*t},up:{x:a.up.x+(b.up.x-a.up.x)*t,y:a.up.y+(b.up.y-a.up.y)*t},turn:(a.turn||0)+((b.turn||0)-(a.turn||0))*t};}
