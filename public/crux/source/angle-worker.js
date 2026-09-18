// All photos use the same local model and pixel-derived surface extraction.
import {inferSurfaceFrame} from './surface-model.mjs?v=18';
import {detectAdaptiveStraightSurfaces as detectWallSurfaces} from './adaptive-straight-surfaces.mjs?v=18';
let frame,cachedPhoto,cachedPixels,pixelWidth,pixelHeight,queue=Promise.resolve();
async function run(request){
 const {id,photo}=request,progress=message=>self.postMessage({id,photo,progress:message});
 try{
  if(!frame||cachedPhoto!==photo){
   if(!request.pixels)throw Error('Capture the wall again');
   const pixels=new Uint8ClampedArray(request.pixels);
   const next=await inferSurfaceFrame({...request,pixels},progress);
   frame=next;cachedPhoto=photo;cachedPixels=pixels;pixelWidth=request.width;pixelHeight=request.height;
  }
  progress('Finding seams and fitting wall faces…');
  const wallRoi=request.localRoi||request.wallRoi;
  const surfaces=detectWallSurfaces({...frame,pixels:cachedPixels,pixelWidth,pixelHeight,holds:request.holds||[],wallRoi});
  const facets=surfaces.regions.filter(f=>f.polygon.length>=3).map(f=>({...f,boundary:'automatic-image-and-normal'}));
  const known=surfaces.perHold.filter(h=>h.status==='estimated'),angles=known.map(h=>h.angle).sort((a,b)=>a-b);
  const local={...surfaces,labels:undefined,seams:undefined,wallRoi,facets,regions:[],facetSource:'automatic-image-and-normal',patches:facets.map(f=>({...f,x:f.anchor.x,y:f.anchor.y})),angleRange:angles.length?[angles[0],angles.at(-1)]:null};
  const representative=known.sort((a,b)=>a.angle-b.angle)[Math.floor(known.length/2)]||facets.find(f=>f.status==='estimated'&&Number.isFinite(f.angle));
  const result=representative?{status:'estimated',angle:representative.angle,range:representative.range,confidence:'low',source:'surface-normal-model',reason:'Approximate photo angle; not a physical measurement.',floorReference:surfaces.floorReference}:{status:'uncertain',reason:'No reliable wall surface found. Using the vertical assumption.'};
  self.postMessage({id,photo,depthReady:true,result,local});
 }catch(error){
  self.postMessage({id,photo,depthReady:!!frame&&cachedPhoto===photo,result:{status:'uncertain',reason:'Wall geometry unavailable on this device. Using the vertical assumption.'},error:String(error.message||error)});
 }
}
self.onmessage=({data})=>{queue=queue.then(()=>run(data));};
