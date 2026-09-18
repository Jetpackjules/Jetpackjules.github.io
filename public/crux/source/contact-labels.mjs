// Place labels in nearby free space; a leader line identifies the actual contact.
export function contactText(parts){
 const p=[...parts];
 if(p.includes('LH')&&p.includes('RH')){p.splice(p.indexOf('LH'),1);p.splice(p.indexOf('RH'),1);p.unshift('2H');}
 if(p.includes('LF')&&p.includes('RF')){p.splice(p.indexOf('LF'),1);p.splice(p.indexOf('RF'),1);p.push('2F');}
 return p.join(' / ');
}
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
export function visibleBox(h){const b=h.silhouetteBounds;return b?{x:b.left,y:b.top,w:b.width,h:b.height}:{x:h.x-h.w/2,y:h.y-h.h/2,w:h.w,h:h.h};}
export function placeContacts(holds,markers,width,height,scale=1){
 const byId=new Map(holds.map(h=>[h.id,h]));
 const boxes=holds.map(h=>{const b=visibleBox(h);return {id:h.id,x:b.x*width,y:b.y*height,w:b.w*width,h:b.h*height};});
 const placed=[],font=13/scale,pad=5/scale,gap=7/scale;
 for(const [id,parts] of markers){
  const hold=byId.get(id);if(!hold)continue;
  const text=contactText(parts),w=text.length*font*.64+pad*2,h=font+pad*2,tx=hold.x*width,ty=hold.y*height;
  let best;
  for(const extra of [0,14,30,52])for(const [dx,dy] of [[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]]){
   const box=boxes.find(b=>b.id===id),ox=dx*(box.w/2+w/2+gap+extra/scale),oy=dy*(box.h/2+h/2+gap+extra/scale);
   const x=Math.max(2/scale,Math.min(width-w-2/scale,tx+ox-w/2)),y=Math.max(2/scale,Math.min(height-h-2/scale,ty+oy-h/2));
   const candidate={id,text,x,y,w,h,tx,ty,font};
   const collisions=boxes.reduce((sum,b)=>sum+overlap(candidate,b)*(b.id===id?30:1),0)+placed.reduce((sum,b)=>sum+overlap(candidate,b)*80,0);
   const score=collisions+Math.hypot(x+w/2-tx,y+h/2-ty)*.15;
   if(!best||score<best.score)best={...candidate,score};
  }
  best.lx=Math.max(best.x,Math.min(best.x+best.w,tx));best.ly=Math.max(best.y,Math.min(best.y+best.h,ty));placed.push(best);
 }
 return placed;
}
