// Saved detector output for the exact bundled examples, never uploaded photos.
const sizes={straight:[1150,1410],cave:[1600,900],overhang:[1600,1067]};
let pending;
export async function loadDemoHoldBoxes(key,{width,height}){
 if(!Object.hasOwn(sizes,key)||sizes[key][0]!==width||sizes[key][1]!==height)return null;
 if(!pending)pending=fetch(new URL('./demo-hold-boxes.json',import.meta.url)).then(async response=>{
  if(!response.ok)throw Error('Example holds unavailable');
  return response.json();
 }).catch(error=>{pending=undefined;throw error;});
 const data=await pending,boxes=data.frames?.[key]?.holds;
 if(data.version!==1||!Array.isArray(boxes)||boxes.length<5||!boxes.every(h=>
  ['x','y','w','h','confidence'].every(k=>Number.isFinite(h[k]))&&h.x>0&&h.x<1&&h.y>0&&h.y<1&&h.w>0&&h.w<1&&h.h>0&&h.h<1)){
  pending=undefined;throw Error('Invalid example holds');
 }
 return boxes.map(h=>({...h}));
}
