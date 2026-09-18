// Image, contours and contacts share one transform so they remain aligned.
export function attachWallZoom({viewport,surface,plus,minus,reset,output,onChange=()=>{}}){
 let scale=1,x=0,y=0,gesture=null,moved=false,ignoreUntil=0;
 const pointers=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function apply(){
  const w=surface.offsetWidth,h=surface.offsetHeight;
  x=clamp(x,-w*(scale-1),0);y=clamp(y,-h*(scale-1),0);
  surface.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
  surface.style.setProperty('--wall-zoom',scale);viewport.classList.toggle('zoomed',scale>1.01);
  if(output)output.textContent=`${Math.round(scale*100)}%`;if(plus)plus.disabled=scale>=4;if(minus)minus.disabled=scale<=1;
  onChange(scale);
 }
 function zoom(next,cx=viewport.clientWidth/2,cy=viewport.clientHeight/2){
  next=clamp(next,1,4);x=cx-(cx-x)*next/scale;y=cy-(cy-y)*next/scale;scale=next;apply();
 }
 function begin(){
  const ps=[...pointers.values()],rect=viewport.getBoundingClientRect();
  if(ps.length>=2){const [a,b]=ps;gesture={scale,x,y,d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2-rect.left,cy:(a.y+b.y)/2-rect.top};}
  else if(ps.length)gesture={x,y,px:ps[0].x,py:ps[0].y};else gesture=null;
 }
 viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button')&&!e.target.closest('.hold-hit'))return;
  if(e.pointerType==='mouse'&&scale===1)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;begin();
  if(pointers.size>=2){moved=true;for(const id of pointers.keys())viewport.setPointerCapture(id);}
 });
 viewport.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const ps=[...pointers.values()];
  if(ps.length>=2&&gesture.d){
   const rect=viewport.getBoundingClientRect(),[a,b]=ps,next=clamp(gesture.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.d),1,4);
   x=(a.x+b.x)/2-rect.left-(gesture.cx-gesture.x)*next/gesture.scale;y=(a.y+b.y)/2-rect.top-(gesture.cy-gesture.y)*next/gesture.scale;scale=next;moved=true;
  }else if(ps.length===1){const dx=e.clientX-gesture.px,dy=e.clientY-gesture.py;if(Math.hypot(dx,dy)>5)moved=true;if(scale>1){x=gesture.x+dx;y=gesture.y+dy;}else if(e.pointerType==='touch'&&Math.abs(dy)>5){window.scrollBy(0,-dy);gesture.py=e.clientY;}}
  if(moved&&!viewport.hasPointerCapture(e.pointerId))viewport.setPointerCapture(e.pointerId);apply();
 });
 function end(e){if(!pointers.has(e.pointerId))return;if(moved)ignoreUntil=performance.now()+350;pointers.delete(e.pointerId);begin();}
 viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
 viewport.addEventListener('click',e=>{if(performance.now()<ignoreUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect(),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1);zoom(scale*Math.exp(-clamp(delta,-200,200)*.003),e.clientX-r.left,e.clientY-r.top);},{passive:false});
 const fit=()=>{scale=1;x=y=0;pointers.clear();gesture=null;apply();};
 viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;if(['+','=','-','0','Home'].includes(e.key)){e.preventDefault();if(e.key==='0'||e.key==='Home')fit();else zoom(scale*(e.key==='-'?1/1.3:1.3));}});
 viewport.addEventListener('dblclick',e=>{if(e.target.closest('button'))return;e.preventDefault();fit();});
 if(plus)plus.onclick=()=>zoom(scale*1.3);if(minus)minus.onclick=()=>zoom(scale/1.3);if(reset)reset.onclick=fit;
 new ResizeObserver(()=>apply()).observe(viewport);apply();
 return {reset:fit,get scale(){return scale;}};
}
