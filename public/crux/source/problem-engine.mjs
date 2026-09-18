// Four-contact photo problem planner prototype. Hand-authored, unvalidated geometry.
// Coordinates remain relative to the whole photo; callers may prefilter a wall face.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const LIMBS=['lh','rh','lf','rf'];
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const rng=seed=>()=>{seed|=0;seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
function context(holds,setup){
  if(!finite(setup?.width,1,30)||!finite(setup?.height,1,10)||!finite(setup?.reach,.3,1.6)||!finite(setup?.angle??0,-30,80))throw Error('Check wall dimensions, angle and maximum hand move.');
  const bodyHeight=setup.bodyHeight??1.7;
  if(!finite(bodyHeight,1.2,2.2))throw Error('Body height must be between 1.2 and 2.2 m.');
  const ids=new Set();
  const hs=holds.filter(h=>h.role!=='excluded').map(h=>{
    if(h.id==null||ids.has(String(h.id)))throw Error('Each hold needs a unique ID.');
    if(!finite(h.x,0,1)||!finite(h.y,0,1))throw Error('Hold centers must be normalized photo coordinates.');
    ids.add(String(h.id));return {...h,id:String(h.id),X:h.x*setup.width,Y:(1-h.y)*setup.height};
  });
  const index=new Map(hs.map((h,i)=>[h.id,i]));
  const model={height:bodyHeight,arm:.37*bodyHeight,leg:.55*bodyHeight,torso:.29*bodyHeight,shoulder:.12*bodyHeight,hip:.075*bodyHeight,clearance:.095*bodyHeight,balance:.12*bodyHeight,footMove:.62*bodyHeight};
  const c={hs,index,setup:{...setup,angle:setup.angle??0},model};
  c.sizes=hs.map(h=>visibleCapacity(c,h));c.grips=hs.map(difficulty);
  c.contacts=hs.map((_,i)=>LIMBS.map((_,limb)=>contact(c,i,limb)));
  return c;
}
function canHand(h){return !h.footOnly&&!['foot','foothold'].includes(h.role)&&h.use!=='foot';}
function canFoot(h){return !h.handOnly&&h.use!=='hand';}
function visibleCapacity(c,h){
  if(c.sizes){const i=c.index.get(h.id);if(i!==undefined)return c.sizes[i];}
  const width=(finite(h.silhouetteBounds?.width,0,1)?h.silhouetteBounds.width:h.w||0)*c.setup.width;
  const height=(finite(h.silhouetteBounds?.height,0,1)?h.silhouetteBounds.height:h.h||0)*c.setup.height;
  const fraction=h.areaFraction??h.shape?.areaFraction??h.appearance?.areaFraction;
  const area=finite(fraction,0,1)?fraction*c.setup.width*c.setup.height:.5*width*height;
  return {width,height,area};
}
function canShare(c,h,type){
  const override=h.contactCapacity?.[type];
  if(typeof override==='boolean')return override;
  // The legacy matchable override refers only to two hands, never feet/mixed.
  if(type==='handHand'&&typeof h.matchable==='boolean')return h.matchable;
  const {width,height,area}=visibleCapacity(c,h),body=c.model.height;
  if(type==='handHand')return width>=.052*body&&area>=.0011*body*body;
  if(type==='footFoot')return width>=.10*body&&height>=.055*body&&area>=.006*body*body;
  if(type==='handFoot')return width>=.095*body&&height>=.17*body&&area>=.009*body*body;
  return false;
}
function canMatch(c,h){return canShare(c,h,'handHand');}
function contact(c,index,limb){
  if(c.contacts)return c.contacts[index][limb];
  const h=c.hs[index],size=visibleCapacity(c,h);let X=h.X,Y=h.Y;
  // Stable per-limb points: joining/leaving another contact does not move the
  // stationary contact. These are assumed usable parts of the visible hold.
  if(canShare(c,h,'handFoot'))Y+=(limb<2?1:-1)*Math.min(size.height*.4,c.model.height*.35);
  if(limb>=2&&canShare(c,h,'footFoot'))X+=(limb===2?-1:1)*Math.min(size.width*.2,c.model.height*.05);
  return {X,Y};
}
// The preview uses exactly the planner's contact offsets and body proportions.
// Coordinates returned here are meters, with y increasing down the photo.
export function previewContactGeometry(holds,setup,step){
  const c=context(holds,setup);
  if(!step?.body||!Number.isFinite(step.body.x)||!Number.isFinite(step.body.y))return null;
  const contacts={};
  for(let limb=0;limb<LIMBS.length;limb++){
    const index=c.index.get(String(step[LIMBS[limb]]));if(index===undefined)return null;
    const p=contact(c,index,limb);contacts[LIMBS[limb]]={x:p.X,y:c.setup.height-p.Y};
  }
  return {height:c.model.height,model:c.model,hip:{x:step.body.x*setup.width,y:step.body.y*setup.height},contacts};
}
function validOccupancy(c,contacts){
  const groups=new Map();contacts.forEach((index,limb)=>{const ls=groups.get(index)||[];ls.push(limb);groups.set(index,ls);});
  for(const [index,limbs] of groups){
    if(limbs.length>2)return false;
    if(limbs.length===2){const hands=limbs.filter(i=>i<2).length,type=hands===2?'handHand':hands===0?'footFoot':'handFoot';if(!canShare(c,c.hs[index],type))return false;}
  }
  return true;
}
function d(a,b){return Math.hypot(a.X-b.X,a.Y-b.Y);}
function difficulty(h){
  const scores={jug:.5,edge:2.5,crimp:5,sloper:4,pinch:3,pocket:4};
  if(Object.hasOwn(scores,h.grip))return {value:scores[h.grip],known:true};
  // Area is only an apparent-size prior. It never assigns a grip category.
  const area=h.areaFraction??h.shape?.areaFraction??h.appearance?.areaFraction??(h.w||.035)*(h.h||.035);
  return {value:clamp(2.5-.32*Math.log2(Math.max(area,1e-6)/.002),1.5,3.4),known:false};
}
// Find an upright torso/hip position in the intersection of reach disks.
// A transition also includes the moving limb's old contact; all other contacts
// stay fixed while the limb moves. Disks are convex, so body adjustment between
// accepted poses needs no hidden hand/foot release in this simplified 2D model.
function pose(c,contacts,extra=null,moving=-1){
  const {hs,model:m}=c;
  if(!validOccupancy(c,contacts))return null;
  if(contact(c,contacts[0],0).X-contact(c,contacts[1],1).X>.32||contact(c,contacts[2],2).X-contact(c,contacts[3],3).X>.24)return null;
  const disks=[];let xmin=-Infinity,xmax=Infinity,ymin=-Infinity,ymax=Infinity,smin=Infinity,smax=-Infinity;
  const add=(i,k)=>{
    const h=contact(c,i,k),hand=k<2,r=hand?m.arm:m.leg;
    const x=h.X-(k%2===0?-1:1)*(hand?m.shoulder:m.hip),y=h.Y-(hand?m.torso:0);
    disks.push([x,y,r]);xmin=Math.max(xmin,x-r);xmax=Math.min(xmax,x+r);ymin=Math.max(ymin,y-r);ymax=Math.min(ymax,y+r);
    if(hand)ymax=Math.min(ymax,h.Y-.05);else ymin=Math.max(ymin,h.Y+m.clearance);
    if(k!==moving){smin=Math.min(smin,h.X);smax=Math.max(smax,h.X);}
  };
  contacts.forEach(add);if(extra)add(extra.index,extra.limb);
  xmin=Math.max(xmin,smin-m.balance);xmax=Math.min(xmax,smax+m.balance);
  if(xmin>xmax||ymin>ymax)return null;
  let x=(xmin+xmax)/2,y=(ymin+ymax)/2;
  for(let pass=0;pass<10;pass++){
    for(const [cx,cy,r] of disks){const dx=x-cx,dy=y-cy,rr=dx*dx+dy*dy;if(rr>r*r){const scale=r/Math.sqrt(rr);x=cx+dx*scale;y=cy+dy*scale;}}
    x=clamp(x,xmin,xmax);y=clamp(y,ymin,ymax);
  }
  if(disks.some(([cx,cy,r])=>(x-cx)**2+(y-cy)**2>(r+.002)**2))return null;
  return {x:x/c.setup.width,y:1-y/c.setup.height};
}
class Heap{
  a=[];
  push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].priority<=v.priority)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
  pop(){const root=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(2*i+1<this.a.length){let j=2*i+1;if(j+1<this.a.length&&this.a[j+1].priority<this.a[j].priority)j++;if(this.a[j].priority>=last.priority)break;this.a[i]=this.a[j];i=j;}this.a[i]=last;}return root;}
  get length(){return this.a.length;}
}
function graph(c,allowed,limit,limb=0){
  const map=new Map();for(const i of allowed){const a=[];for(const j of allowed)if(i!==j){const dist=d(contact(c,i,limb),contact(c,j,limb));if(dist<=limit+.00001)a.push({i:j,distance:dist});}map.set(i,a);}return map;
}
function handDistances(edges,finish){
  const ds=new Map([[finish,0]]),q=[finish];for(let n=0;n<q.length;n++)for(const {i} of edges.get(q[n])||[])if(!ds.has(i)){ds.set(i,ds.get(q[n])+1);q.push(i);}return ds;
}
function startStances(c,hands,feet,finish,max=16){
  const {hs,model:m}=c,locked=hands.filter(i=>hs[i].role==='start');
  if(locked.length>2)throw Error('Use at most two start handholds.');
  const low=Math.min(...[...hands,...feet].map(i=>hs[i].Y)),span=hs[finish].Y-low;
  if(span<.7)return [];
  let pairs=[];
  if(locked.length===2)pairs=[locked.sort((a,b)=>hs[a].X-hs[b].X)];
  else if(locked.length===1)pairs=[[locked[0],locked[0]]];
  else{
    const lower=hands.filter(i=>hs[i].Y>=low+.28&&hs[i].Y<=low+Math.min(1.3,span*.45)&&hs[finish].Y-hs[i].Y>=Math.max(.6,span*.4));
    lower.sort((a,b)=>hs[a].Y-hs[b].Y||Math.abs(hs[a].X-hs[finish].X)-Math.abs(hs[b].X-hs[finish].X));
    for(const i of lower.slice(0,22)){
      pairs.push([i,i]);
      const near=lower.filter(j=>j!==i&&Math.abs(hs[j].Y-hs[i].Y)<.3&&d(hs[i],hs[j])<.65).sort((a,b)=>d(hs[i],hs[a])-d(hs[i],hs[b])).slice(0,2);
      for(const j of near)pairs.push([i,j].sort((a,b)=>hs[a].X-hs[b].X));
    }
  }
  const result=[],seen=new Set();
  for(const pair of pairs){
    const center=mean(pair.map(i=>hs[i].X)),handLow=Math.min(...pair.map(i=>hs[i].Y));
    if(hs[finish].Y-Math.max(...pair.map(i=>hs[i].Y))<.6)continue;
    const fs=feet.filter(i=>((!pair.includes(i)&&hs[i].Y<=handLow-.28&&hs[i].Y<=low+Math.min(.65,span*.3))||(pair.includes(i)&&canShare(c,hs[i],'handFoot')))&&Math.abs(hs[i].X-center)<m.leg)
      .sort((a,b)=>Math.abs(hs[a].X-center)+Math.abs(handLow-hs[a].Y-.8)*.4-(Math.abs(hs[b].X-center)+Math.abs(handLow-hs[b].Y-.8)*.4)).slice(0,10);
    for(let a=0;a<fs.length;a++)for(let b=a;b<fs.length;b++){
      if(a===b&&!canShare(c,hs[fs[a]],'footFoot'))continue;
      const f=[fs[a],fs[b]].sort((a,b)=>hs[a].X-hs[b].X),contacts=[...pair,...f],key=contacts.join(',');
      if(seen.has(key))continue;seen.add(key);const body=pose(c,contacts);if(body)result.push({contacts,body,startScore:mean(pair.map(i=>hs[i].Y))-low+Math.abs(center-hs[finish].X)*.12});
    }
  }
  result.sort((a,b)=>a.startScore-b.startScore);
  // Limit near-duplicate starts to leave room for distinct positions on the wall.
  const picked=[],counts=new Map();for(const s of result){const key=s.contacts.slice(0,2).join(',');if((counts.get(key)||0)>=2)continue;counts.set(key,(counts.get(key)||0)+1);picked.push(s);if(picked.length===max)break;}
  return picked;
}
function search(c,{hands,feet,finish,starts=null,maxExpanded=2400,neighborLimit=14,target=null,style='balanced',random=()=>.5,heuristicWeight=1.65,footCost=.075,effortLimit=Infinity}){
  if(!canMatch(c,c.hs[finish]))return {beta:[],expanded:0,searchLimited:false,optimal:false,reason:'The finish appears too small for a matched finish. Choose a larger finish or confirm matching capacity.'};
  const handGraph=graph(c,hands,c.setup.reach),footGraphs=[graph(c,feet,c.model.footMove,2),graph(c,feet,c.model.footMove,3)],dist=handDistances(handGraph,finish);
  const initial=starts||startStances(c,hands,feet,finish),heap=new Heap(),best=new Map();let expanded=0,generated=0;
  const heuristic=a=>(dist.get(a[0])??1e6)+(dist.get(a[1])??1e6);
  const push=(a,parent,action,body,cost)=>{
    const h=heuristic(a);if(h>=1e6)return;
    const key=a.join(','),old=best.get(key);if(old!==undefined&&old<=cost+.00001)return;
    best.set(key,cost);heap.push({contacts:a,parent,action,body,cost,key,depth:(parent?.depth??-1)+1,priority:cost+h*heuristicWeight+generated++*1e-9});
  };
  for(const s of initial)push(s.contacts,null,null,s.body,0);
  while(heap.length&&expanded<maxExpanded){
    const n=heap.pop();if(n.cost>best.get(n.key)+.00001)continue;expanded++;
    if(n.contacts[0]===finish&&n.contacts[1]===finish){const beta=[];for(let p=n;p;p=p.parent)beta.push({...Object.fromEntries(LIMBS.map((k,i)=>[k,c.hs[p.contacts[i]].id])),body:p.body,move:p.action});beta.reverse();return {beta,expanded,searchLimited:false,optimal:false,reason:null};}
    if(n.depth>=80)continue;
    for(let limb=0;limb<4;limb++){
      const hand=limb<2,current=n.contacts[limb],neighbors=(hand?handGraph:footGraphs[limb-2]).get(current)||[],other=n.contacts[limb^1];
      const candidates=neighbors.filter(e=>{
        if(n.contacts.includes(e.i)){const occupancy=[...n.contacts];occupancy[limb]=e.i;if(!validOccupancy(c,occupancy))return false;}
        if(c.hs[e.i].Y<c.hs[current].Y-(hand?.24:.16))return false;
        if(hand&&!dist.has(e.i))return false;
        return true;
      }).map(e=>{
        let order=hand?(dist.get(e.i)||0)*2-(e.i===other?.12:0):-c.hs[e.i].Y;
        if(target!==null&&hand){const desired=.5+target*4.5/12,moveTarget=clamp(.35+target*.045+(style==='reachy'?.12:style==='technical'?-.12:0),.3,.97);order+=Math.abs(c.grips[e.i].value-desired)*.3+Math.abs(e.distance/c.setup.reach-moveTarget)*.75+random()*.3;}
        return {...e,order};
      }).sort((a,b)=>a.order-b.order).slice(0,neighborLimit);
      for(const e of candidates){
        const next=[...n.contacts];next[limb]=e.i;
        const body=pose(c,next,{index:current,limb},limb);if(!body)continue;
        if(Number.isFinite(effortLimit)&&movementDemand(c,n.contacts,next,limb,e.distance,body).value>effortLimit+.00001)continue;
        const action={limb:LIMBS[limb],from:c.hs[current].id,to:c.hs[e.i].id,distance:e.distance};
        const penalty=target!==null&&hand?Math.abs(c.grips[e.i].value-(.5+target*4.5/12))*.055:0;
        push(next,n,action,body,n.cost+(hand?1:footCost)+penalty);
      }
    }
  }
  return {beta:[],expanded,searchLimited:heap.length>0,optimal:false,reason:!initial.length?'No supported starting stance found.':!heap.length?'No supported sequence found with these holds and movement limits.':'No supported sequence found within the search budget.'};
}
function inclineSummary(c,hands){
  const records=hands.map(h=>{
    const local=Number.isFinite(h.incline?.angle),angle=local?clamp(h.incline.angle,-90,90):c.setup.angle;
    return {id:h.id,angle,local,confidence:local&&finite(h.incline?.confidence,0,1)?h.incline.confidence:null,source:local?(typeof h.incline.source==='string'?h.incline.source:'local hold estimate'):'wall setup',clamped:local&&angle!==h.incline.angle};
  });
  const values=records.map(r=>r.angle),localValues=records.filter(r=>r.local).map(r=>r.angle),localCount=localValues.length;
  return {localCount,total:records.length,coverage:records.length?localCount/records.length:0,localRange:localCount?[Math.min(...localValues),Math.max(...localValues)]:null,range:values.length?[Math.min(...values),Math.max(...values)]:[c.setup.angle,c.setup.angle],effectiveAngle:values.length?mean(values):c.setup.angle,effortAngle:values.length?mean(values.map(v=>Math.max(0,v))):Math.max(0,c.setup.angle),fallbackAngle:c.setup.angle,basis:'Used handholds; missing or non-finite local angles use wall setup',geometry:'2D unchanged',records};
}
// Movement-demand proxies, not a learned or calibrated V-grade model. In
// particular a hold silhouette says nothing reliable about its usable depth.
// Score actual supporting contacts; deleting an unused hold earns no points.
function movementDemand(c,before,after,limb,distance,body){
  const hand=limb<2,hs=c.hs,H=c.model.height,grips=after.slice(0,2).map(i=>c.grips[i].value);
  const angle=mean(after.slice(0,2).map(i=>Math.max(0,Number.isFinite(hs[i].incline?.angle)?clamp(hs[i].incline.angle,-90,90):c.setup.angle)));
  const grip=Math.max(0,.70*Math.max(...grips)+.25*mean(grips)-.55);
  const ratio=distance/(hand?c.setup.reach:c.model.footMove);
  const reach=3.6*clamp((ratio-.30)/.70,0,1)**2;
  const footIndices=hand?after.slice(2):[before[limb^1],after[limb]];
  const precision=mean(footIndices.map(i=>clamp((.075*H/1.7-c.sizes[i].width)/(.075*H/1.7),0,1)))*1.65;
  const hands=after.slice(0,2).map((i,k)=>contact(c,i,k)),feet=after.slice(2).map((i,k)=>contact(c,i,k+2));
  const gap=(mean(hands.map(p=>p.Y))-mean(feet.map(p=>p.Y)))/H;
  const offset=Math.abs(mean(hands.map(p=>p.X))-mean(feet.map(p=>p.X)))/H;
  const extension=clamp((gap-.58)/.35,0,1)*.9;
  const tension=clamp((offset-.12)/.30,0,1)*(.55+angle/90)+extension*(.45+angle/60);
  const incline=angle*.045;
  const value=hand?grip+reach+precision+tension+incline:grip*.6+reach*.35+precision*.8+tension*.7+incline;
  return {value,grip,reach,precision,tension,incline,limb:LIMBS[limb],ratio};
}
function demandSummary(c,beta){
  const moves=[];
  for(let n=1;n<beta.length;n++){
    const b=beta[n-1],a=beta[n],limb=LIMBS.indexOf(a.move?.limb);if(limb<0)continue;
    const before=LIMBS.map(k=>c.index.get(b[k])),after=LIMBS.map(k=>c.index.get(a[k]));
    moves.push({...movementDemand(c,before,after,limb,a.move.distance,a.body),step:n});
  }
  const sorted=[...moves].sort((a,b)=>b.value-a.value),crux=sorted[0]??null;
  const raw=crux?.value??0;
  return {raw,crux:crux?{...crux}:null,topMoves:sorted.slice(0,3),movementCount:moves.length,
    basis:'Hardest supported contact change; grip, reach, visible foot precision, body extension and incline proxies',calibrated:false};
}
function gradeEstimate(c,handIds,beta,searchResult=null){
  const usedIds=beta.length?[...new Set(beta.flatMap(s=>[s.lh,s.rh]))]:handIds;
  const hands=usedIds.map(id=>c.hs[c.index.get(id)]).filter(Boolean),grips=hands.map(difficulty),known=grips.filter(g=>g.known).length;
  const moves=beta.slice(1).map(s=>s.move).filter(m=>m&&['lh','rh'].includes(m.limb)),lengths=moves.map(m=>m.distance),maxMove=Math.max(0,...lengths),stretch=maxMove/c.setup.reach;
  const incline=inclineSummary(c,hands);
  const demands=demandSummary(c,beta);
  const raw=beta.length?demands.raw:Math.max(0,.65*mean(grips.map(g=>g.value))+.22*Math.max(0,...grips.map(g=>g.value))+incline.effortAngle*.045-.8);
  const grade=clamp(Math.round(raw),0,12),geometryUnverified=!beta.length,spread=known===hands.length&&!geometryUnverified?2:3;
  return {grade,rawGrade:raw,demands,low:Math.max(0,grade-spread),high:Math.min(12,grade+spread),maxMove,meanMove:mean(lengths),known,total:hands.length,allowedTotal:handIds.length,usedHandIds:usedIds,stretch,unreachable:maxMove>c.setup.reach+.003,provisional:true,geometryUnverified,handMoves:moves.length,footMoves:Math.max(0,beta.length-1-moves.length),incline,basis:'Unvalidated movement-demand proxies and bounded easier-beta search; not a calibrated V-grade',reason:geometryUnverified?searchResult?.reason||'No supported beta available; spacing difficulty is not established.':null};
}
function personalEstimate(c,beta,actual,reference){
  if(c.setup.bodyHeight==null)return null;
  const height=c.model.height,referenceHeight=1.7,available=beta.length>0;
  const gaps=beta.map(s=>Math.min(contact(c,c.index.get(s.lh),0).Y,contact(c,c.index.get(s.rh),1).Y)-Math.max(contact(c,c.index.get(s.lf),2).Y,contact(c,c.index.get(s.rf),3).Y));
  const crowding=h=>mean(gaps.map(g=>clamp((.5*h-g)/(.5*h),0,1)));
  const reachFraction=available?actual.maxMove/(.74*height):null,crowdingIndex=available?crowding(height):null;
  const adjustment=available&&!reference.geometryUnverified?clamp((reachFraction-actual.maxMove/(.74*referenceHeight))*1.5+(crowdingIndex-crowding(referenceHeight))*.8,-.65,.65):null;
  return {bodyHeight:height,referenceHeight,feasible:available,reachFraction,crowdingIndex,effortAdjustment:adjustment===null?null:Math.round(adjustment*100)/100,effortEquivalent:adjustment===null?null:Math.round(clamp(reference.grade+adjustment,0,12)*10)/10,scale:'Personal effort equivalent only; not a conventional V-grade',reason:available?reference.geometryUnverified?'Reference-height beta unavailable; personal effort comparison withheld.':null:actual.reason,model:'Height-relative hand reach and compact hand/foot spacing; modest unvalidated adjustment'};
}
function estimate(c,handIds,beta,searchResult=null,referenceResult=null){
  const actual=gradeEstimate(c,handIds,beta,searchResult),reference=referenceResult?gradeEstimate(referenceResult.c,handIds,referenceResult.r.beta,referenceResult.r):actual;
  return {...actual,grade:reference.grade,rawGrade:reference.rawGrade,demands:reference.demands,low:reference.low,high:reference.high,incline:reference.incline,gradeGeometryUnverified:reference.geometryUnverified,reference:{bodyHeight:1.7,grade:reference.grade,geometryUnverified:reference.geometryUnverified,maxMove:reference.maxMove,handMoves:reference.handMoves,usedHandIds:reference.usedHandIds,searchLimited:referenceResult?.r.searchLimited??searchResult?.searchLimited??false},personal:personalEstimate(c,beta,actual,reference)};
}
function referenceFor(c,p,r,autoStart=false){
  if(c.model.height===1.7)return null;
  const rc=context(c.hs,{...c.setup,bodyHeight:1.7,reach:c.setup.referenceReach??c.setup.reach});let rr;
  if(autoStart){const hs=new Set(p.handIds),fs=new Set([...p.handIds,...p.footIds]),hands=rc.hs.flatMap((h,i)=>hs.has(h.id)&&canHand(h)?[i]:[]),feet=rc.hs.flatMap((h,i)=>fs.has(h.id)&&canFoot(h)?[i]:[]),finish=rc.index.get(p.finishId);rr=finish===undefined?{beta:[],expanded:0,searchLimited:false,reason:'No finish selected.'}:search(rc,{hands,feet,finish,maxExpanded:3600,neighborLimit:18});if(rr.beta.length){const first=rr.beta[0];rr=fixedSearch(rc,{...p,start:{hands:[first.lh,first.rh],feet:[first.lf,first.rf]},beta:rr.beta});}}
  else rr=fixedSearch(rc,p);
  return {c:rc,r:rr};
}
function finishStats(c,r,extras={}){const shared=r.beta.reduce((out,s)=>{if(s.lf===s.rf)out.matchedFeet++;if([s.lh,s.rh].some(id=>id===s.lf||id===s.rf))out.handFoot++;return out;},{matchedFeet:0,handFoot:0});return {status:r.beta.length?'feasible':'unverified',expanded:r.expanded,searchLimited:r.searchLimited,optimal:false,easierBetaChecks:r.easierBetaChecks??0,easierBetaFound:r.easierBetaFound??false,bodyHeight:c.model.height,bodyHeightAssumed:c.setup.bodyHeight==null,matchCapacityVerified:false,matchCheck:'Occupancy-specific visible size checks only; confirm usable shared surface',sharedContacts:shared,model:'Upright 2D reach disks and three-contact support proxy; no force or joint model',reason:r.reason,...extras};}
function problemFrom(c,r,finish,extra={}){
  const handIds=[...new Set(r.beta.flatMap(s=>[s.lh,s.rh]))],handSet=new Set(handIds),footIds=[...new Set(r.beta.flatMap(s=>[s.lf,s.rf]))].filter(id=>!handSet.has(id)),first=r.beta[0];
  const p={...extra,handIds,footIds,start:first?{hands:[first.lh,first.rh],feet:[first.lf,first.rf]}:null,finishId:c.hs[finish].id,beta:r.beta};
  return {...p,estimate:estimate(c,handIds,r.beta,r,referenceFor(c,p,r)),stats:finishStats(c,r)};
}
function fixedSearch(c,p,maxExpanded=1600){
  const handIds=new Set((p.handIds||[]).map(String)),footIds=new Set([...(p.footIds||[]).map(String),...handIds]);
  const hands=[...handIds].map(id=>c.index.get(id)).filter(i=>i!==undefined&&canHand(c.hs[i])),feet=[...footIds].map(id=>c.index.get(id)).filter(i=>i!==undefined&&canFoot(c.hs[i])),finish=c.index.get(String(p.finishId));
  if(finish===undefined||!hands.includes(finish)||!p.start?.hands||!p.start?.feet)return {beta:[],expanded:0,searchLimited:false,reason:'Start, finish or allowed holds are missing.'};
  const ids=[...p.start.hands,...p.start.feet].map(String),contacts=ids.map(id=>c.index.get(id));
  if(contacts.some(i=>i===undefined)||contacts.slice(0,2).some(i=>!hands.includes(i))||contacts.slice(2).some(i=>!feet.includes(i)))return {beta:[],expanded:0,searchLimited:false,reason:'Starting contacts are outside the allowed set.'};
  if(contacts[0]===finish&&contacts[1]===finish)return {beta:[],expanded:0,searchLimited:false,reason:'The finish must require climbing above the starting holds.'};
  const body=pose(c,contacts);if(!body)return {beta:[],expanded:0,searchLimited:false,reason:'The chosen start lacks a supported body position.'};
  const options={hands,feet,finish,starts:[{contacts,body}],neighborLimit:24,heuristicWeight:1.65,footCost:.02};
  let incumbent=null;
  if(p.beta?.length&&validateProblem(p,c.hs,c.setup).valid){
    // Rebuild action distances from contacts; caller-supplied preview metadata
    // is not evidence of movement difficulty.
    const beta=p.beta.map((step,n)=>{
      const a=LIMBS.map(k=>c.index.get(step[k])),b=n?LIMBS.map(k=>c.index.get(p.beta[n-1][k])):null,limb=b?a.findIndex((i,k)=>i!==b[k]):-1;
      return {...Object.fromEntries(LIMBS.map((k,i)=>[k,c.hs[a[i]].id])),body:pose(c,a),move:limb<0?null:{limb:LIMBS[limb],from:c.hs[b[limb]].id,to:c.hs[a[limb]].id,distance:d(contact(c,b[limb],limb),contact(c,a[limb],limb))}};
    });
    incumbent={beta,expanded:0,searchLimited:false,reason:null};
  }
  let expanded=0,limited=false,checks=0,improved=false;
  // Always run the same target-free baseline, even when generation supplied
  // a witness. A biased initial sequence must not define the route's grade.
  const baseline=search(c,{...options,maxExpanded:Math.max(250,Math.floor(maxExpanded*.55))});
  expanded+=baseline.expanded;limited||=baseline.searchLimited;
  if(!incumbent||baseline.beta.length&&demandSummary(c,baseline.beta).raw<demandSummary(c,incumbent.beta).raw){improved=!!incumbent;incumbent=baseline;}
  if(!incumbent.beta.length)return incumbent;
  let bestEffort=demandSummary(c,incumbent.beta).raw;
  // Search below the incumbent's crux. Failed bounded searches are not proof
  // that no easier beta exists; preserve the feasible witness in every case.
  const remaining=Math.max(0,maxExpanded-expanded),perCheck=Math.floor(remaining/2);
  for(const reduction of [.28,.07]){
    if(perCheck<100||bestEffort<.08)break;
    const r=search(c,{...options,maxExpanded:perCheck,effortLimit:Math.max(0,bestEffort*(1-reduction)-.015)});
    expanded+=r.expanded;limited||=r.searchLimited;checks++;
    if(r.beta.length){const score=demandSummary(c,r.beta).raw;if(score<bestEffort-1e-6){incumbent=r;bestEffort=score;improved=true;}}
  }
  return {...incumbent,expanded,searchLimited:limited,easierBetaChecks:checks,easierBetaFound:improved,optimal:false};
}
export function generateProblems(holds,setup,target,style='balanced',seed=42){
  if(!finite(target,0,12)||!['balanced','reachy','technical'].includes(style))throw Error('Choose a target from V0–V12 and a supported movement style.');
  const c=context(holds,setup),hands=c.hs.flatMap((h,i)=>canHand(h)?[i]:[]),feet=c.hs.flatMap((h,i)=>canFoot(h)?[i]:[]);
  if(hands.length<4||!feet.length||(feet.length===1&&!canShare(c,c.hs[feet[0]],'footFoot')))throw Error('Review at least four hand candidates and two possible foot placements.');
  const ys=c.hs.map(h=>h.Y),low=Math.min(...ys),high=Math.max(...ys),span=high-low;
  if(span<.8)return [];
  const locked=hands.filter(i=>c.hs[i].role==='finish');if(locked.length>1)throw Error('Choose one finish hold.');
  const random=rng(seed),finishes=locked.length?locked:hands.filter(i=>c.hs[i].Y>=high-span*.12).sort((a,b)=>c.hs[b].Y-c.hs[a].Y);
  const candidates=[],signatures=new Set(),tried=new Set(),audit={subsetTrials:0,subsetAccepted:0,handRemovals:0,footRemovals:0,swaps:0,additions:0,easierBetaChecks:0,expanded:0};
  const signature=p=>[...p.handIds].sort().join(',')+'|'+[...p.footIds].sort().join(',')+'|'+[...p.start.hands,...p.start.feet].join(',')+'|'+p.finishId;
  const rank=p=>Math.abs(p.estimate.rawGrade-target)*4+Math.abs(p.estimate.maxMove/setup.reach-(style==='reachy'?.9:style==='technical'?.55:.72))*.3+.003*p.beta.length;
  const addCandidate=p=>{
    if(p.handIds.length<2||p.beta.length<3)return false;
    const key=signature(p);if(signatures.has(key))return false;signatures.add(key);
    p.stats.targetDifference=p.estimate.grade-target;p.stats.finishInTopBand=c.hs[c.index.get(p.finishId)].Y>=high-span*.12;
    p.score=rank(p);candidates.push(p);return true;
  };
  const seedTrials=Math.min(6,Math.max(3,finishes.length));
  for(let trial=0;trial<seedTrials*(target>=6?2:1);trial++){
    const finish=finishes[trial%finishes.length];if(finish===undefined)break;
    let starts=startStances(c,hands,feet,finish,16);if(!starts.length)continue;
    // All starts are low and supported; vary their horizontal placement.
    const offset=trial%3;starts=starts.filter((_,i)=>i%3===offset);if(!starts.length)continue;
    const r=search(c,{hands,feet,finish,starts,maxExpanded:1500,neighborLimit:16,target,style,random:trial<seedTrials?random:()=>.5});audit.expanded+=r.expanded;
    if(!r.beta.length)continue;
    let p=problemFrom(c,r,finish,{id:`p-${seed}-${trial}`,name:'New problem',style});
    // Re-evaluate exactly the selected set. No unselected foothold is available.
    const checked=fixedSearch(c,p,1000);audit.expanded+=checked.expanded;audit.easierBetaChecks+=checked.easierBetaChecks??0;
    if(checked.beta.length){p=problemFrom(c,checked,finish,{id:p.id,name:p.name,style});p.stats.initialHandMoves=r.beta.filter(s=>s.move&&['lh','rh'].includes(s.move.limb)).length;p.stats.shortcutsChecked=true;}
    else{p.stats.shortcutsChecked=false;p.stats.shortcutSearchLimited=checked.searchLimited;}
    addCandidate(p);
  }
  // Bounded beam over allowed sets. Every mutation re-solves exactly that set;
  // starts/finish remain fixed. The target chooses which sets to investigate,
  // never the estimate assigned to an unchanged set.
  const explored=new Set(),maxTrials=12+Math.round(target*2),maxExpanded=26000;
  while(audit.subsetTrials<maxTrials&&audit.expanded<maxExpanded){
    const parent=candidates.filter(p=>!explored.has(signature(p))).sort((a,b)=>rank(a)-rank(b))[0];if(!parent)break;
    explored.add(signature(parent));
    const protectedIds=new Set([...parent.start.hands,...parent.start.feet,parent.finishId]);
    const usage=new Map();for(const s of parent.beta)for(const id of [s.lf,s.rf])usage.set(id,(usage.get(id)||0)+1);
    const easyFirst=ids=>ids.filter(id=>!protectedIds.has(id)).map(id=>({id,key:c.grips[c.index.get(id)].value+random()*.15})).sort((a,b)=>a.key-b.key).map(p=>p.id);
    const proposals=[];
    const propose=(handIds,footIds,kind,removed=null)=>{const q={...parent,handIds,footIds,beta:null};if(handIds.length>=2)proposals.push({q,kind,removed});};
    for(const id of easyFirst(parent.handIds)){
      propose(parent.handIds.filter(x=>x!==id),parent.footIds.filter(x=>x!==id),'hand',id);
      if(usage.has(id))propose(parent.handIds.filter(x=>x!==id),[...new Set([...parent.footIds,id])],'hand',id);
      const old=c.hs[c.index.get(id)],replacement=hands.filter(i=>!parent.handIds.includes(c.hs[i].id)&&!protectedIds.has(c.hs[i].id)&&d(old,c.hs[i])<.65&&c.grips[i].value>difficulty(old).value+.15).sort((a,b)=>d(old,c.hs[a])-d(old,c.hs[b]))[0];
      if(replacement!==undefined)propose(parent.handIds.map(x=>x===id?c.hs[replacement].id:x),parent.footIds.filter(x=>x!==id),'swap',id);
    }
    for(const id of [...parent.footIds].filter(id=>!protectedIds.has(id)).sort((a,b)=>(usage.get(b)||0)-(usage.get(a)||0))){
      propose(parent.handIds,parent.footIds.filter(x=>x!==id),'foot',id);
      const old=c.hs[c.index.get(id)],replacement=feet.filter(i=>!parent.handIds.includes(c.hs[i].id)&&!parent.footIds.includes(c.hs[i].id)&&d(old,c.hs[i])<.4&&c.sizes[i].width<c.sizes[c.index.get(id)].width*.8).sort((a,b)=>d(old,c.hs[a])-d(old,c.hs[b]))[0];
      if(replacement!==undefined)propose(parent.handIds,parent.footIds.map(x=>x===id?c.hs[replacement].id:x),'swap',id);
    }
    if(parent.estimate.rawGrade>target-.5){
      const near=i=>Math.min(...parent.handIds.map(id=>d(c.hs[i],c.hs[c.index.get(id)])));
      const extraHands=hands.filter(i=>!parent.handIds.includes(c.hs[i].id)&&near(i)<.65).sort((a,b)=>c.grips[a].value-c.grips[b].value).slice(0,3).map(i=>c.hs[i].id);
      const extraFeet=feet.filter(i=>!parent.handIds.includes(c.hs[i].id)&&!parent.footIds.includes(c.hs[i].id)&&near(i)<.85).sort((a,b)=>c.sizes[b].width-c.sizes[a].width).slice(0,3).map(i=>c.hs[i].id);
      if(extraHands.length||extraFeet.length)proposals.unshift({q:{...parent,handIds:[...parent.handIds,...extraHands],footIds:[...parent.footIds,...extraFeet],beta:parent.beta},kind:'add'});
    }
    // Interleave foot and hand restrictions, rather than exhaust one list.
    const interleaved=[],groups=['add','hand','foot','swap'].map(kind=>proposals.filter(p=>p.kind===kind));
    for(let i=0;groups.some(g=>i<g.length);i++)for(const g of groups)if(g[i])interleaved.push(g[i]);
    for(const {q,kind,removed} of interleaved.slice(0,8)){
      if(audit.subsetTrials>=maxTrials||audit.expanded>=maxExpanded)break;
      const key=signature(q);if(tried.has(key))continue;tried.add(key);audit.subsetTrials++;
      const checked=fixedSearch(c,q,700);audit.expanded+=checked.expanded;audit.easierBetaChecks+=checked.easierBetaChecks??0;
      if(!checked.beta.length)continue;
      const p=problemFrom(c,checked,c.index.get(q.finishId),{id:`p-${seed}-subset-${audit.subsetTrials}`,name:'New problem',style});
      p.stats.mutation={kind,removed,parentGrade:parent.estimate.grade,parentRawGrade:parent.estimate.rawGrade};p.stats.shortcutsChecked=true;
      if(addCandidate(p)){audit.subsetAccepted++;if(kind==='hand')audit.handRemovals++;else if(kind==='foot')audit.footRemovals++;else if(kind==='swap')audit.swaps++;else audit.additions++;}
    }
  }
  candidates.sort((a,b)=>a.score-b.score);const selected=[];
  for(const p of candidates){if(selected.some(s=>{const a=new Set([...p.handIds,...p.footIds]),b=new Set([...s.handIds,...s.footIds]);return [...a].filter(id=>b.has(id)).length/Math.max(a.size,b.size)>.9&&Math.abs(p.estimate.rawGrade-s.estimate.rawGrade)<.3;}))continue;selected.push(p);if(selected.length===3)break;}
  return selected.map((p,i)=>({...p,name:['Fresh perspective','Side quest','A different angle'][i],stats:{...p.stats,...audit,candidateCount:candidates.length,searchBudgetExhausted:audit.subsetTrials>=maxTrials||audit.expanded>=maxExpanded,targetPolicy:{gripPreference:.5+target*4.5/12,subsetBudget:maxTrials},grading:'Target-independent; lowest demand found in bounded beta searches',optimal:false}}));
}
export function estimateProblem(problem,holds,setup){
  const c=context(holds,setup),r=fixedSearch(c,problem);return {...estimate(c,problem.handIds||[],r.beta,r,referenceFor(c,problem,r)),search:finishStats(c,r)};
}
export function analyzeColorProblem(holds,setup,color){
  const selected=holds.filter(h=>(color==null||h.color===color)&&h.role!=='excluded'),c=context(selected,setup),hands=c.hs.flatMap((h,i)=>canHand(h)?[i]:[]),feet=c.hs.flatMap((h,i)=>canFoot(h)?[i]:[]),locked=hands.filter(i=>c.hs[i].role==='finish');
  if(locked.length>1)throw Error('Choose one finish hold.');
  const finish=locked[0]??hands.reduce((best,i)=>best===undefined||c.hs[i].Y>c.hs[best].Y?i:best,undefined);
  let r=finish===undefined?{beta:[],expanded:0,searchLimited:false,reason:'No handholds selected.'}:search(c,{hands,feet,finish,maxExpanded:3600,neighborLimit:18});
  const handIds=hands.map(i=>c.hs[i].id),footIds=feet.filter(i=>!hands.includes(i)).map(i=>c.hs[i].id),first=r.beta[0];
  const p={id:`color-${color??'selected'}`,name:color==null?'Your selected problem':`${color} problem`,color,handIds,footIds,start:first?{hands:[first.lh,first.rh],feet:[first.lf,first.rf]}:null,finishId:finish===undefined?null:c.hs[finish].id,beta:r.beta};
  if(r.beta.length){r=fixedSearch(c,p);p.beta=r.beta;}
  return {...p,estimate:estimate(c,handIds,r.beta,r,referenceFor(c,p,r,true)),stats:finishStats(c,r,{allowedHoldCount:handIds.length+footIds.length})};
}
export function validateProblem(problem,holds,setup){
  const c=context(holds,setup),errors=[],hands=new Set(problem.handIds),feet=new Set([...problem.handIds,...problem.footIds]);
  if(!problem.beta?.length)return {valid:false,errors:['No beta witness.']};
  for(let n=0;n<problem.beta.length;n++){
    const step=problem.beta[n],contacts=LIMBS.map(k=>c.index.get(step[k]));
    if(contacts.some(i=>i===undefined)){errors.push(`Step ${n}: missing or excluded hold.`);continue;}
    if(!hands.has(step.lh)||!hands.has(step.rh)||!feet.has(step.lf)||!feet.has(step.rf))errors.push(`Step ${n}: contact outside selected set.`);
    if(contacts.slice(0,2).some(i=>!canHand(c.hs[i]))||contacts.slice(2).some(i=>!canFoot(c.hs[i])))errors.push(`Step ${n}: contact use violates a hand/foot restriction.`);
    if(!pose(c,contacts))errors.push(`Step ${n}: unsupported stance.`);
    if(n){const previous=problem.beta[n-1],changed=LIMBS.flatMap((k,i)=>previous[k]===step[k]?[]:[i]);if(changed.length!==1){errors.push(`Step ${n}: expected one limb to move.`);continue;}const limb=changed[0],from=c.index.get(previous[LIMBS[limb]]);if(from===undefined){errors.push(`Step ${n}: previous contact missing.`);continue;}if(d(contact(c,from,limb),contact(c,contacts[limb],limb))>(limb<2?setup.reach:c.model.footMove)+.003)errors.push(`Step ${n}: excessive limb reach.`);if(!pose(c,contacts,{index:from,limb},limb))errors.push(`Step ${n}: no supported transition.`);}
  }
  const first=problem.beta[0],last=problem.beta.at(-1);
  if(!problem.start||[...problem.start.hands,...problem.start.feet].some((id,i)=>id!==first[LIMBS[i]]))errors.push('Starting labels do not match witness.');
  if(last.lh!==problem.finishId||last.rh!==problem.finishId)errors.push('Finish is not matched.');
  return {valid:errors.length===0,errors};
}
