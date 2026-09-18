// Draw usable surfaces, not an imposed order of moves.
import {placeContacts} from './contact-labels.mjs?v=18';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const problemColors={hand:'#ff754b',foot:'#56dddf',start:'#d4ef75',finish:'#fff9ee'};
export function holdPolygon(h){
 const points=h.polygon||h.contour;
 if(Array.isArray(points)&&points.length>=3)return points.map(p=>Array.isArray(p)?p:[p.x,p.y]);
 const w=h.w||.03,ht=h.h||.03;
 return [[h.x-w/2,h.y-ht/2],[h.x+w/2,h.y-ht/2],[h.x+w/2,h.y+ht/2],[h.x-w/2,h.y+ht/2]];
}
export function holdPoints(h){return holdPolygon(h).map(([x,y])=>`${(x*1000).toFixed(2)},${(y*1000).toFixed(2)}`).join(' ');}
export function problemIds(problem){return new Set([...(problem?.handIds||[]),...(problem?.footIds||[])]);}
export function roleForHold(problem,id){
 if(!problem)return null;
 if(problem.finishId===id)return 'finish';
 if(problem.start?.hands?.includes(id))return 'start';
 if(problem.handIds?.includes(id))return 'hand';
 if(problem.footIds?.includes(id))return 'foot';
 return null;
}
export function markerLabels(problem,betaIndex=null){
 const labels=new Map(),add=(id,label)=>{if(id)labels.set(id,[...(labels.get(id)||[]),label]);};
 if(betaIndex!==null&&problem?.beta?.length){
  const b=problem.beta[Math.min(betaIndex,problem.beta.length-1)];
  for(const key of ['lh','rh','lf','rf'])add(b[key],key.toUpperCase());
  if(!labels.has(problem.finishId))add(problem.finishId,'TOP');
 }else if(problem){
  add(problem.start?.hands?.[0],'LH');add(problem.start?.hands?.[1],'RH');
  add(problem.start?.feet?.[0],'LF');add(problem.start?.feet?.[1],'RF');
  add(problem.finishId,'TOP');
 }
 return labels;
}
export function wallOverlay({photo,holds,problem,selectedIds=[],editing=false,activeId=null,betaIndex=null,showLabels=true,clipId="usable-holds"}){
 const ids=problem?problemIds(problem):new Set(selectedIds),byId=new Map(holds.map(h=>[h.id,h]));
 const chosen=holds.filter(h=>ids.has(h.id)&&!h.fallback);
 let svg='';
 if(chosen.length){
  svg+=`<defs><clipPath id="${esc(clipId)}">${chosen.map(h=>`<polygon data-focus-hold="${esc(h.id)}" points="${holdPoints(h)}"/>`).join('')}</clipPath></defs><image href="${photo}" width="1000" height="1000" preserveAspectRatio="none" clip-path="url(#${esc(clipId)})"/>`;
 }
 for(const h of holds){
  const role=roleForHold(problem,h.id),on=ids.has(h.id),color=problemColors[role]||problemColors.hand;
  const fallback=h.fallback||!h.polygon&&!h.contour||h.segmentation?.method==='box-fallback'||h.outlineMethod==='box';
  svg+=`<polygon data-focus-hold="${esc(h.id)}" class="hold-outline ${on?'usable':editing?'editing-outline':'detected-only'} ${h.id===activeId?'inspected':''}" points="${holdPoints(h)}" fill="${on?color:'#ffffff'}" fill-opacity="${fallback?0:on?.22:.05}" stroke="${on?color:'#ffffffc0'}" stroke-width="${on?2.2:1}" ${fallback?'stroke-dasharray="3 3"':''} vector-effect="non-scaling-stroke"/>`;
 }
 const move=betaIndex!==null?problem?.beta?.[betaIndex]?.move:null;
 if(move){const from=byId.get(move.from),to=byId.get(move.to);if(from&&to)svg+=`<defs><marker id="move-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#fff9ee"/></marker></defs><path class="beta-move-line" d="M ${from.x*1000} ${from.y*1000} L ${to.x*1000} ${to.y*1000}" fill="none" stroke="#fff9ee" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#move-tip)" vector-effect="non-scaling-stroke"/>`;}
 for(const [id,parts] of showLabels?markerLabels(problem,betaIndex):[]){
  const h=byId.get(id);if(!h)continue;
  const label=parts.length===2&&parts.includes('LH')&&parts.includes('RH')?'2H':parts.join(' / '),role=roleForHold(problem,id),color=problemColors[role]||problemColors.foot;
  const x=Math.max(35,Math.min(965,h.x*1000)),y=Math.max(23,Math.min(982,(h.y-h.h/2)*1000-12));
  svg+=`<g class="hold-tag" transform="translate(${x},${y})"><rect x="-${Math.max(20,label.length*5)}" y="-12" width="${Math.max(40,label.length*10)}" height="24" rx="5" fill="#1c271e" stroke="${color}" stroke-width="1.3" vector-effect="non-scaling-stroke"/><text text-anchor="middle" dominant-baseline="central" fill="${color}" font-size="15" font-weight="700" font-family="Arial,sans-serif">${esc(label)}</text></g>`;
 }
 return svg;
}
export function paintProblem(ctx,canvas,photoCanvas,holds,problem){
 const w=photoCanvas.width,h=photoCanvas.height,ids=problemIds(problem),chosen=holds.filter(x=>ids.has(x.id));
 ctx.filter='grayscale(1) brightness(.64)';ctx.drawImage(photoCanvas,0,0);ctx.filter='none';
 const path=hold=>{ctx.beginPath();holdPolygon(hold).forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));ctx.closePath();};
 for(const hold of chosen){const color=problemColors[roleForHold(problem,hold.id)]||problemColors.hand;if(!hold.fallback){ctx.save();path(hold);ctx.clip();ctx.drawImage(photoCanvas,0,0);ctx.globalAlpha=.22;ctx.fillStyle=color;ctx.fill();ctx.restore();}path(hold);ctx.setLineDash(hold.fallback?[5,4]:[]);ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,w/350);ctx.stroke();}ctx.setLineDash([]);
 for(const p of placeContacts(holds,markerLabels(problem),w,h,600/w)){const color=problemColors[roleForHold(problem,p.id)]||problemColors.foot;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.5,w/600);ctx.beginPath();ctx.moveTo(p.lx,p.ly);ctx.lineTo(p.tx,p.ty);ctx.stroke();ctx.fillStyle='#1c271e';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeRect(p.x,p.y,p.w,p.h);ctx.fillStyle=color;ctx.font=`bold ${p.font}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.text,p.x+p.w/2,p.y+p.h/2);}
}
