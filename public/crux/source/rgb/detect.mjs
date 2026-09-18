// RGB-only geometry. Normal inference must never alter these boundaries.
import {waitForOpenCV} from './lsd.mjs';
import {loadLSDWASM} from './lsd-wasm.mjs';
import * as geometry from './opencv-core.mjs';
import * as support from './support.mjs';
import {cleanSupportProtrusions} from './support-cleanup.mjs';
let runtime;
async function initialize(){
 if(!runtime)runtime=(async()=>{
  importScripts(new URL('../vendor/rgb/opencv.js',import.meta.url).href);
  const {cv}=await waitForOpenCV(self.cv),lsd=await loadLSDWASM();return {cv,lsd};
 })();return runtime;
}
function contours(cv,labels,w,h){
 const ids=[...new Set(labels)].filter(x=>x>0),regions=[];
 for(const id of ids){
  const mask=cv.Mat.zeros(h,w,cv.CV_8UC1),cs=new cv.MatVector(),hierarchy=new cv.Mat();
  try{
   for(let i=0;i<labels.length;i++)if(labels[i]===id)mask.data[i]=1;
   cv.findContours(mask,cs,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
   for(let k=0;k<cs.size();k++){
    const c=cs.get(k),p=new cv.Mat();
    try{
     cv.approxPolyDP(c,p,1.1,true);
     const polygon=[];for(let j=0;j<p.data32S.length;j+=2)polygon.push([p.data32S[j]/w,p.data32S[j+1]/h]);
     if(polygon.length<3)continue;
     const m=cv.moments(c),cx=m.m00?m.m10/m.m00:polygon[0][0]*w,cy=m.m00?m.m01/m.m00:polygon[0][1]*h;
     let best=Infinity,anchor;
     for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(labels[y*w+x]===id){const score=(x-cx)**2+(y-cy)**2;if(score<best){best=score;anchor={x:(x+.5)/w,y:(y+.5)/h};}}
     regions.push({id:cs.size()===1?id:`${id}-${k}`,labelId:id,polygon,anchor,boundary:'rgb-seam-graph',boundarySegments:polygon.map((a,j)=>({a,b:polygon[(j+1)%polygon.length],source:'image-seam'}))});
    }finally{c.delete();p.delete();}
   }
  }finally{mask.delete();cs.delete();hierarchy.delete();}
 }return regions;
}
export async function detectRgbFaces({pixels,width,height,holds=[]},progress=()=>{}){
 progress('Loading wall detector…');const {cv,lsd}=await initialize(),started=performance.now();
 const d=geometry.prepareRGBA(cv,pixels,width,height,holds,1280);
 progress('Separating wall from room…');const initial=support.computeInitialSupport(cv,d,holds);d.support=initial.mask;
 progress('Finding straight seams…');const proposals=geometry.detectProposals(cv,lsd,d);
 progress('Connecting wall faces…');const refined=support.refineSupport(cv,d,holds,initial,proposals.lines);
 const clean=cleanSupportProtrusions(cv,refined.mask,d.w,d.h,holds);
 const graph=geometry.buildGraph(cv,d,proposals.lines,clean.mask,refined.dots||[],{strongStep:6});
 return {labels:graph.labels,width:d.w,height:d.h,regions:contours(cv,graph.labels,d.w,d.h),processingMs:performance.now()-started,source:'rgb-seam-graph'};
}
