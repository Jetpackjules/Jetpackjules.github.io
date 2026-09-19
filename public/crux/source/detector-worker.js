// Inference stays inside this browser worker. Images never leave the device.
import * as ort from './vendor/ort-runtime.mjs';
import {nms} from './engine.js?v=21';
ort.env.wasm.wasmPaths=new URL('./vendor/',self.location.href).href;
ort.env.wasm.numThreads=1;
let session;
self.onmessage=async({data})=>{
  try{
    if(!session){self.postMessage({id:data.id,status:'Loading the hold detector (12 MB)…'});session=await ort.InferenceSession.create('./models/holds-960.onnx',{executionProviders:['wasm'],graphOptimizationLevel:'all'});}
    self.postMessage({id:data.id,status:'Finding holds on your wall…'});
    const {pixels,width,height}=data,size=960,scale=Math.min(size/width,size/height),rw=Math.round(width*scale),rh=Math.round(height*scale),px=Math.floor((size-rw)/2),py=Math.floor((size-rh)/2);
    const source=new OffscreenCanvas(width,height);source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),width,height),0,0);
    const canvas=new OffscreenCanvas(size,size),ctx=canvas.getContext('2d');ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,size,size);ctx.drawImage(source,px,py,rw,rh);
    const rgba=ctx.getImageData(0,0,size,size).data,plane=size*size,input=new Float32Array(plane*3);
    for(let i=0;i<plane;i++){input[i]=rgba[i*4]/255;input[i+plane]=rgba[i*4+1]/255;input[i+plane*2]=rgba[i*4+2]/255;}
    const tensor=new ort.Tensor('float32',input,[1,3,size,size]);
    const outputs=await session.run({images:tensor});const output=outputs[session.outputNames[0]],d=output.data,n=output.dims[2],boxes=[];
    for(let i=0;i<n;i++){
      if(d[n*4+i]<.26)continue;
      const x=(d[i]-px)/rw,y=(d[n+i]-py)/rh,w=d[n*2+i]/rw,h=d[n*3+i]/rh;
      if(x>0&&x<1&&y>0&&y<1&&w>.004&&h>.004&&w<.4&&h<.4)boxes.push({x,y,w,h,confidence:d[n*4+i]});
    }
    tensor.dispose();Object.values(outputs).forEach(o=>o.dispose());self.postMessage({id:data.id,boxes:nms(boxes)});
  }catch(e){self.postMessage({id:data.id,error:e.message||'Detector unavailable'});}
};
