const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const defaultFocusArea=()=>({x:.08,y:.05,w:.84,h:.9});
export function insideFocus(hold,area){return !!hold&&(!area||(hold.x>=area.x&&hold.x<=area.x+area.w&&hold.y>=area.y&&hold.y<=area.y+area.h));}
// Deltas and bounds use photo coordinates, so panning/zooming cannot alter the area.
export function adjustFocus(area,part,dx,dy,minWidth=.12,minHeight=.16){
 if(part==='move')return {...area,x:clamp(area.x+dx,0,1-area.w),y:clamp(area.y+dy,0,1-area.h)};
 let left=area.x,right=area.x+area.w,top=area.y,bottom=area.y+area.h;
 if(part.includes('w'))left=clamp(left+dx,0,right-minWidth);
 if(part.includes('e'))right=clamp(right+dx,left+minWidth,1);
 if(part.includes('n'))top=clamp(top+dy,0,bottom-minHeight);
 if(part.includes('s'))bottom=clamp(bottom+dy,top+minHeight,1);
 return {x:left,y:top,w:right-left,h:bottom-top};
}
export function attachFocusEditor({editor,surface,getArea,onChange,onCancel,onApply}){
 const directions={nw:'top left',n:'top',ne:'top right',e:'right',se:'bottom right',s:'bottom',sw:'bottom left',w:'left'};
 editor.innerHTML=`<div class="focus-selection"><button class="focus-move" data-focus-part="move" aria-label="Move wall area" title="Drag to move · arrow keys to adjust"></button>${Object.entries(directions).map(([part,name])=>`<button class="focus-handle focus-${part}" data-focus-part="${part}" aria-label="Resize ${name} edge" title="Drag to resize · arrow keys to adjust"><span></span></button>`).join('')}</div>`;
 const selection=editor.firstElementChild;let gesture=null;
 const limits=bounds=>({w:Math.min(.45,88/bounds.width),h:Math.min(.45,88/bounds.height)});
 editor.addEventListener('pointerdown',e=>{
  const button=e.target.closest('[data-focus-part]'),area=getArea();
  if(!button||!area||gesture||e.button!==0)return;
  e.preventDefault();e.stopPropagation();button.focus({preventScroll:true});
  gesture={id:e.pointerId,part:button.dataset.focusPart,area:{...area},x:e.clientX,y:e.clientY,bounds:surface.getBoundingClientRect()};
  editor.setPointerCapture(e.pointerId);
 });
 editor.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id)return;e.preventDefault();e.stopPropagation();
  const g=gesture,min=limits(g.bounds);
  onChange(adjustFocus(g.area,g.part,(e.clientX-g.x)/g.bounds.width,(e.clientY-g.y)/g.bounds.height,min.w,min.h));
 });
 const finish=(e,cancelled=false)=>{
  if(!gesture||gesture.id!==e.pointerId)return;e.stopPropagation();
  const g=gesture;gesture=null;if(cancelled&&getArea())onChange(g.area);
  if(editor.hasPointerCapture(e.pointerId))editor.releasePointerCapture(e.pointerId);
 };
 editor.addEventListener('pointerup',e=>finish(e));
 editor.addEventListener('pointercancel',e=>finish(e,true));
 editor.addEventListener('lostpointercapture',e=>finish(e,true));
 editor.addEventListener('click',e=>e.stopPropagation());
 editor.addEventListener('keydown',e=>{
  const area=getArea(),part=e.target.closest('[data-focus-part]')?.dataset.focusPart;if(!area||!part)return;
  if(e.key==='Escape'){e.preventDefault();onCancel();return;}
  if(e.key==='Enter'){e.preventDefault();onApply();return;}
  const step=e.shiftKey ? .04 : .01,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
  if(delta){e.preventDefault();const min=limits(surface.getBoundingClientRect());onChange(adjustFocus(area,part,...delta,min.w,min.h));}
 });
 return {render(area){
  editor.classList.toggle('hidden',!area);
  if(!area){gesture=null;return;}
  Object.assign(selection.style,{left:`${area.x*100}%`,top:`${area.y*100}%`,width:`${area.w*100}%`,height:`${area.h*100}%`});
 }};
}
