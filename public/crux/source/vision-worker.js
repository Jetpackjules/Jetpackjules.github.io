import {segmentHolds} from './hold-segmentation.mjs?v=24';
import {assignHoldColors} from './hold-colors.mjs?v=24';
self.onmessage=({data})=>{
 try{const {pixels,width,height,holds,id}=data,image={pixels:new Uint8ClampedArray(pixels),width,height};const outlined=segmentHolds(image,holds,{onProgress:(batch,completed,total)=>self.postMessage({id,batch,completed,total})});self.postMessage({id,...assignHoldColors(image,outlined)});}
 catch(error){self.postMessage({id:data.id,error:error.message||'Outlines unavailable'});}
};
