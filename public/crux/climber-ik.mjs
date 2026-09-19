import {poseFacets,mixBasis} from './facet-pose.mjs?v=24';
import {previewContactGeometry} from './problem-engine.mjs?v=24';

const limbs=['lh','rh','lf','rf'];
const mix=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});

// Two-bone IK, solved in wall meters so photo aspect ratio cannot change reach.
export function solveLimb(root,target,upper,lower,side,hint=null){
  const dx=target.x-root.x,dy=target.y-root.y,d=Math.hypot(dx,dy);
  const distance=Math.max(1e-8,Math.min(upper+lower,Math.max(Math.abs(upper-lower),d)));
  const ux=d>1e-8?dx/d:0,uy=d>1e-8?dy/d:1;
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
  const bend=Math.sqrt(Math.max(0,upper*upper-along*along));
  // Choose the joint on the left/right of the segment for a rear-view figure.
  const px=-uy,py=ux;
  let sign=px*side>=0?1:-1;
  if(hint){const base={x:root.x+ux*along,y:root.y+uy*along};sign=(hint.x-base.x)*px+(hint.y-base.y)*py>=0?1:-1;}
  const joint={x:root.x+ux*along+px*bend*sign,y:root.y+uy*along+py*bend*sign};
  return {root,joint,end:target,strained:d>upper+lower+.003};
}

export function interpolatePose(from,to,t){
  const k=Math.max(0,Math.min(1,t));
  const neutral={right:{x:1,y:0},up:{x:0,y:-1}},a=from.facets||{upper:neutral,lower:neutral},b=to.facets||{upper:neutral,lower:neutral};
  return {...to,facets:{...b,upper:mixBasis(a.upper,b.upper,k),lower:mixBasis(a.lower,b.lower,k)},hip:point(from.hip,to.hip,k),contacts:Object.fromEntries(limbs.map(l=>[l,point(from.contacts[l],to.contacts[l],k)]))};
}

// Find the nearest visual hip in four reach disks after projecting the torso.
// Moving this illustration does not change the planner or any hold contact.
export function fitProjectedHip(preferred,disks){
  const excess=p=>Math.max(0,...disks.map(d=>Math.hypot(p.x-d.x,p.y-d.y)-d.r));
  const candidates=[preferred];
  for(const d of disks){
    const dx=preferred.x-d.x,dy=preferred.y-d.y,length=Math.hypot(dx,dy);
    if(length>1e-9)candidates.push({x:d.x+dx*d.r/length,y:d.y+dy*d.r/length});
  }
  for(let i=0;i<disks.length;i++)for(let j=i+1;j<disks.length;j++){
    const a=disks[i],b=disks[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
    if(d<1e-9||d>a.r+b.r||d<Math.abs(a.r-b.r))continue;
    const along=(a.r*a.r-b.r*b.r+d*d)/(2*d),bend=Math.sqrt(Math.max(0,a.r*a.r-along*along));
    for(const sign of [-1,1])candidates.push({x:a.x+dx/d*along-sign*dy/d*bend,y:a.y+dy/d*along+sign*dx/d*bend});
  }
  const feasible=candidates.filter(p=>excess(p)<1e-9).sort((a,b)=>Math.hypot(a.x-preferred.x,a.y-preferred.y)-Math.hypot(b.x-preferred.x,b.y-preferred.y));
  if(feasible.length)return {hip:feasible[0],strain:0};
  // A 2D beta may not fit the projected body. Retain its facet orientation,
  // find a finite compromise and expose the strained illustration explicitly.
  let p={...preferred},best=p,bestExcess=excess(p);
  for(let pass=0;pass<80;pass++)for(const d of disks){
    const dx=p.x-d.x,dy=p.y-d.y,length=Math.hypot(dx,dy);
    if(length>d.r)p={x:d.x+dx*d.r/length,y:d.y+dy*d.r/length};
    const e=excess(p);if(e<bestExcess){best=p;bestExcess=e;}
  }
  return {hip:best,strain:bestExcess};
}

export function skeleton(pose,previous=null){
  const {model:m}=pose;
  const neutral={right:{x:1,y:0},up:{x:0,y:-1}},facets=pose.facets||{upper:neutral,lower:neutral};
  const add=(p,v,d)=>({x:p.x+v.x*d,y:p.y+v.y*d});
  const upper=facets.upper,lower=facets.lower;
  const preferred={x:pose.hip.x-upper.up.x*m.torso*.5,y:pose.hip.y-(1+upper.up.y)*m.torso*.5};
  const disks=limbs.map(l=>{const hand=l.endsWith('h'),side=l.startsWith('l')?-1:1,basis=hand?upper:lower,offset=add(hand?{x:upper.up.x*m.torso,y:upper.up.y*m.torso}:{x:0,y:0},basis.right,side*(hand?m.shoulder:m.hip));return {x:pose.contacts[l].x-offset.x,y:pose.contacts[l].y-offset.y,r:hand?m.arm:m.leg};});
  const fitted=fitProjectedHip(preferred,disks),hip=fitted.hip,chest=add(hip,upper.up,m.torso);
  const shoulders={left:add(chest,upper.right,-m.shoulder),right:add(chest,upper.right,m.shoulder)};
  const hips={left:add(hip,lower.right,-m.hip),right:add(hip,lower.right,m.hip)};
  const chains={};
  for(const l of limbs){const hand=l.endsWith('h'),left=l.startsWith('l'),root=(hand?shoulders:hips)[left?'left':'right'],length=hand?m.arm:m.leg;chains[l]=solveLimb(root,pose.contacts[l],length*.5,length*.5,left?-1:1,previous?.chains[l].joint);}
  return {hip,shoulders,hips,chains,chest,upper,lower,blend:1,projectionStrain:fitted.strain,head:add(chest,upper.up,.079*pose.height)};
}

const n=v=>Number(v.toFixed(5));
const xy=p=>`${n(p.x)} ${n(p.y)}`;
export function climberSvg(pose,s=skeleton(pose)){
  const h=pose.height,{left:a,right:b}=s.shoulders,{left:c,right:d}=s.hips;
  const paths=limbs.map(l=>{const k=s.chains[l],hand=l.endsWith('h'),width=h*(hand?.034:.048),color=hand?'#f2dfbd':'#87938b';
    return `<g class="climber-limb ${k.strained?'strained':''}" data-limb="${l}"><path d="M ${xy(k.root)} L ${xy(k.joint)} L ${xy(k.end)}" fill="none" stroke="#17231f" stroke-width="${n(width+h*.012)}" stroke-linecap="round" stroke-linejoin="round"/><path d="M ${xy(k.root)} L ${xy(k.joint)} L ${xy(k.end)}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${n(k.joint.x)}" cy="${n(k.joint.y)}" r="${n(width*.46)}" fill="${color}"/><circle cx="${n(k.end.x)}" cy="${n(k.end.y)}" r="${n(h*(hand?.020:.023))}" fill="${hand?'#ff754b':'#56dddf'}" stroke="#173028" stroke-width="${n(h*.007)}"/></g>`;
  }).join('');
  const tilt=Math.atan2(s.upper.up.x,-s.upper.up.y)*180/Math.PI;
  const bottom={x:s.hip.x-s.upper.up.x*h*.055,y:s.hip.y-s.upper.up.y*h*.055};
  const turn=s.upper.turn||0,shadeTop=turn>=0?b:a,shadeBottom=turn>=0?d:c;
  const spine={x:s.chest.x+turn*h*.055,y:s.chest.y+h*.035};
  const contacts=limbs.map(l=>{const p=pose.contacts[l];return `<circle data-contact="${l}" cx="${n(p.x)}" cy="${n(p.y)}" r="${n(h*.017)}" fill="${l.endsWith('h')?'#ff754b':'#56dddf'}" stroke="#173028" stroke-width="${n(h*.006)}"/>`;}).join('');
  return `<g class="climber-cutout" data-facet-blend="${n(s.blend)}"><g opacity=".96">${paths}</g><path d="M ${xy(a)} Q ${n(s.chest.x)} ${n(s.chest.y-h*.015)} ${xy(b)} L ${xy(d)} Q ${xy(bottom)} ${xy(c)} Z" fill="#d4ef75" fill-opacity=".76" stroke="#17231f" stroke-width="${n(h*.009)}" stroke-linejoin="round"/><path d="M ${xy(shadeTop)} L ${xy(shadeBottom)} L ${n(s.hip.x+(shadeBottom.x-s.hip.x)*.35)} ${n(s.hip.y)} L ${n(s.chest.x+(shadeTop.x-s.chest.x)*.5)} ${n(s.chest.y)} Z" fill="#738d3e" opacity=".3"/><path d="M ${xy(c)} L ${xy(d)} L ${n(d.x-s.lower.up.x*h*.06)} ${n(d.y-s.lower.up.y*h*.06)} L ${xy(bottom)} L ${n(c.x-s.lower.up.x*h*.06)} ${n(c.y-s.lower.up.y*h*.06)} Z" fill="#344940" stroke="#17231f" stroke-width="${n(h*.009)}"/><path d="M ${xy(spine)} L ${n(s.hip.x)} ${n(s.hip.y-h*.05)}" stroke="#8caa46" stroke-width="${n(h*.009)}" opacity=".65"/><rect x="${n(s.hip.x-h*.025)}" y="${n(s.hip.y-h*.018)}" width="${n(h*.05)}" height="${n(h*.065)}" rx="${n(h*.014)}" fill="#eee9d9" stroke="#17231f" stroke-width="${n(h*.007)}" transform="rotate(${n(tilt)} ${xy(s.hip)})"/><path d="M ${xy(s.chest)} L ${xy(s.head)}" stroke="#f2dfbd" stroke-width="${n(h*.042)}"/><ellipse cx="${n(s.head.x)}" cy="${n(s.head.y)}" rx="${n(h*.040)}" ry="${n(h*.053)}" fill="#43584a" stroke="#17231f" stroke-width="${n(h*.009)}" transform="rotate(${n(tilt)} ${xy(s.head)})"/>${contacts}</g>`;

}

export function createClimberOverlay(svg){
  let raf=0,current=null,target=null,joints=null,lastProblem=null,lastIndex=-1,lastScale='';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const paint=p=>{current=p;joints=skeleton(p,joints);svg.innerHTML=climberSvg(p,joints);svg.dataset.torsoProjection=String(Math.hypot(joints.upper.up.x,joints.upper.up.y));svg.dataset.projectionStrained=String(joints.projectionStrain>.003);const note=document.getElementById('climber-pose-note');if(note){note.textContent=joints.projectionStrain>.003?'Illustrated reach is stretched; this pose is approximate.':'';note.classList.toggle('hidden',joints.projectionStrain<=.003);}};
  const finish=()=>{cancelAnimationFrame(raf);raf=0;if(target)paint(target);};
  const hide=()=>{cancelAnimationFrame(raf);raf=0;current=null;target=null;joints=null;lastProblem=null;lastIndex=-1;svg.classList.add('hidden');svg.replaceChildren();};
  function update({visible,problem,index,holds,setup,visual={}}){
    if(!visible||!problem?.beta?.[index]){hide();return;}
    // The sequence's height is authoritative while an input change is replanning.
    const height=problem.stats?.bodyHeight??setup.bodyHeight??1.7;
    const pose=previewContactGeometry(holds,{...setup,bodyHeight:height},problem.beta[index]);
    if(!pose){hide();return;}
    const viewWidth=setup.height*(visual.imageAspect||setup.width/setup.height),factor=viewWidth/setup.width;
    pose.hip.x*=factor;for(const l of limbs)pose.contacts[l].x*=factor;
    pose.facets=poseFacets(problem.beta[index],holds,visual);
    svg.dataset.facetSource=pose.facets.source;
    svg.setAttribute('viewBox',`0 0 ${viewWidth} ${setup.height}`);
    svg.classList.remove('hidden');svg.dataset.heightCm=String(Math.round(height*100));
    const scale=`${viewWidth}:${setup.height}:${height}`;
    if(lastProblem===problem&&lastIndex===index&&lastScale===scale)return;
    cancelAnimationFrame(raf);
    const animate=current&&lastProblem===problem&&Math.abs(lastIndex-index)===1&&lastScale===scale&&!reduced.matches;
    lastProblem=problem;lastIndex=index;lastScale=scale;target=pose;
    if(!animate){joints=null;paint(pose);return;}
    const from=current,start=performance.now();
    function frame(now){const t=Math.min(1,(now-start)/850),ease=t*t*(3-2*t);paint(interpolatePose(from,pose,ease));if(t<1)raf=requestAnimationFrame(frame);else raf=0;}
    raf=requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
  return {update,hide,finish};
}
