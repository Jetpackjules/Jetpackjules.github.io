// Boundary suggestions, not wall segmentation or a metric measurement.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
export function estimateWallSpan({pixels,width,height,holds}){
 const valid=holds.filter(h=>Number.isFinite(h.x)&&Number.isFinite(h.y));
 if(valid.length<8)return {top:0,bottom:1,status:'uncertain',source:'full-photo',reason:'Wall edges are unclear. Check the scale guides.'};
 const tops=[],bottoms=[],evidence=[];
 const masked=(x,y)=>valid.some(h=>Math.abs(x-h.x)<(h.w||.03)*.58&&Math.abs(y-h.y)<(h.h||.03)*.58);
 for(let col=0;col<12;col++){
  const x=(col+.5)/12,hs=valid.filter(h=>Math.abs(h.x-x)<.065);if(hs.length<3)continue;
  const top=Math.min(...hs.map(h=>h.y-(h.h||.025)/2)),bottom=Math.max(...hs.map(h=>h.y+(h.h||.025)/2));
  if(bottom-top<.25)continue;
  function edge(anchor,dir){
   let best=null;const limit=dir<0?.16:.16;
   for(let y=clamp(anchor+(dir<0?-limit:-.005),.012,.988);y<=clamp(anchor+(dir<0?.005:limit),.012,.988);y+=.004){
    let sum=0,count=0;
    for(let dx=-.045;dx<=.045;dx+=.009){const nx=clamp(x+dx,0,.999);if(masked(nx,y))continue;const px=Math.floor(nx*width),ya=Math.floor((y-.009)*height),yb=Math.floor((y+.009)*height);if(ya<0||yb>=height)continue;const a=(ya*width+px)*4,b=(yb*width+px)*4;sum+=Math.hypot(pixels[a]-pixels[b],pixels[a+1]-pixels[b+1],pixels[a+2]-pixels[b+2])/Math.sqrt(3);count++;}
    const contrast=count>=4?sum/count:0,score=contrast-35*Math.abs(y-anchor);
    if(contrast>14&&(!best||score>best.score))best={y,score};
   }
   return best;
  }
  const a=edge(top,-1),b=edge(bottom,1);
  if(a&&b&&b.y-a.y>.32){tops.push(a.y);bottoms.push(b.y);evidence.push({x,top:a.y,bottom:b.y});}
 }
 if(tops.length>=3){const top=median(tops),bottom=median(bottoms);return {top,bottom,status:'suggested',source:'image-edges',support:tops.length,evidence,reason:'Image-edge suggestion. Check the top and mat guides; height is assumed.'};}
 const top=clamp(Math.min(...valid.map(h=>h.y-(h.h||.03)/2))-.035,0,.8),bottom=clamp(Math.max(...valid.map(h=>h.y+(h.h||.03)/2))+.055,.2,1);
 return {top,bottom,status:'uncertain',source:'hold-envelope',support:tops.length,reason:'Wall edges are unclear. The guides surround detected holds; adjust them if needed.'};
}
export function scaleFromSpan({top,bottom,wallHeight=4,imageAspect}){
 if(![top,bottom,wallHeight,imageAspect].every(Number.isFinite)||top<0||bottom>1||bottom-top<.2||wallHeight<1||wallHeight>6||imageAspect<=0)return null;
 const height=wallHeight/(bottom-top),width=height*imageAspect;
 if(height>20||width>40)return null;
 return {width,height,wallHeight,top,bottom,source:'assumed-wall-height'};
}
