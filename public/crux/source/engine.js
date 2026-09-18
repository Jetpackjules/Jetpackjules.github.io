// CRUX shared numerical helpers. AGPL-3.0-or-later.
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function nms(boxes, threshold=.45){
  const picked=[];boxes.sort((a,b)=>b.confidence-a.confidence);
  while(boxes.length&&picked.length<220){const a=boxes.shift();picked.push(a);boxes=boxes.filter(b=>{
    const inter=Math.max(0,Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2))*Math.max(0,Math.min(a.y+a.h/2,b.y+b.h/2)-Math.max(a.y-a.h/2,b.y-b.h/2));
    return inter/(a.w*a.h+b.w*b.h-inter)<threshold;
  });}return picked;
}
