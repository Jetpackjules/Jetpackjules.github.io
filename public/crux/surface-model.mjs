// Metric3D predicts surface directions directly; retain photo proportions.
import * as ort from './vendor/ort-runtime.mjs';
ort.env.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
ort.env.wasm.numThreads=1;
let session;
export function surfaceInputSize(width,height){
 const scale=Math.min(280/Math.min(width,height),560/Math.max(width,height));
 return [Math.max(56,Math.round(width*scale/14)*14),Math.max(56,Math.round(height*scale/14)*14)];
}
export async function inferSurfaceFrame({pixels,width,height},progress=()=>{}){
 if(!session){
  const base=new URL('./models/surfaces/',import.meta.url),response=await fetch(new URL('manifest.json',base));
  if(!response.ok)throw Error('Surface model manifest unavailable');
  const manifest=await response.json(),bytes=new Uint8Array(manifest.bytes);let offset=0;
  for(const chunk of manifest.chunks){
   progress(`Loading wall geometry (${Math.round(offset/1e6)} / ${Math.round(manifest.bytes/1e6)} MB)…`);
   const response=await fetch(new URL(chunk.file,base));if(!response.ok)throw Error('Surface model download unavailable');
   const part=new Uint8Array(await response.arrayBuffer());if(part.length!==chunk.bytes)throw Error('Incomplete surface model');bytes.set(part,offset);offset+=part.length;
  }
  if(offset!==manifest.bytes)throw Error('Incomplete surface model');
  progress('Starting the wall geometry model…');
  session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'disabled'});
 }
 const [w,h]=surfaceInputSize(width,height),source=new OffscreenCanvas(width,height);
 source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),width,height),0,0);
 const canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,w,h);
 const rgba=ctx.getImageData(0,0,w,h).data,n=w*h,input=new Float32Array(n*3);
 for(let c=0;c<3;c++)for(let i=0;i<n;i++)input[c*n+i]=rgba[4*i+c];
 const half=new Uint16Array(input.length);for(let i=0;i<input.length;i++){const v=input[i];if(!v){half[i]=0;continue;}const e=Math.floor(Math.log2(v));half[i]=((e+15)<<10)|Math.round((v/2**e-1)*1024);}
 const tensor=new ort.Tensor('float16',half,[1,3,h,w]);let output;
 progress('Reading the wall surfaces…');
 try{
  output=await session.run({pixel_values:tensor});
  const dims=output.predicted_normal.dims;
  const normals=fromHalf(output.predicted_normal.data),confidence=fromHalf(output.normal_confidence.data);
  if(!normals.every(Number.isFinite)||!confidence.every(Number.isFinite))throw Error('Surface model returned invalid geometry');
  return {width:dims.at(-1),height:dims.at(-2),normals,confidence};
 }finally{tensor.dispose();if(output)Object.values(output).forEach(t=>t.dispose());}
}

function fromHalf(values){if(values.constructor.name==='Float16Array')return Float32Array.from(values);return Float32Array.from(values,v=>{const sign=v&32768?-1:1,e=(v>>10)&31,m=v&1023;return sign*(e===0?m*2**-24:e===31?(m?NaN:Infinity):2**(e-15)*(1+m/1024));});}
