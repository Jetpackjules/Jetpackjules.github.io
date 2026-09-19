// Saved neural predictions for the three immutable, bundled example photos.
// The RGB detector still finds boundaries live; the same fitter derives angles.
const BASE=new URL('./models/demo-normals/',import.meta.url);
const PHOTOS={straight:'demo-wall.jpg',overhang:'examples/overhang.png',cave:'examples/cave.png'};
const frames=new Map();
export function demoNormalKey(src,base){
 try{const url=new URL(src,base);return Object.keys(PHOTOS).find(key=>url.href===new URL(PHOTOS[key],base).href)||null;}catch{return null;}
}
export function decodeDemoNormals(buffer,meta){
 const n=meta.width*meta.height;
 if(!Number.isSafeInteger(n)||n<1||n>480*480||buffer.byteLength!==n*6||meta.layout!=='CHW')throw Error('Invalid example normal field');
 const data=new DataView(buffer),normals=new Float32Array(n*3);
 for(let i=0;i<n;i++){
  const x=data.getInt16(i*2,true)/32767,y=data.getInt16((n+i)*2,true)/32767,z=data.getInt16((2*n+i)*2,true)/32767,length=Math.hypot(x,y,z);
  if(!Number.isFinite(length)||length<.95||length>1.05)throw Error('Invalid example surface direction');
  normals[i]=x/length;normals[n+i]=y/length;normals[2*n+i]=z/length;
 }
 return normals;
}
export async function loadDemoNormalFrame(key,{width,height},progress=()=>{}){
 if(!Object.hasOwn(PHOTOS,key))return null;
 if(!frames.has(key))frames.set(key,(async()=>{
  progress('Loading example inclines…');
  const response=await fetch(new URL('manifest.json',BASE));if(!response.ok)throw Error('Example normals unavailable');
  const manifest=await response.json(),meta=manifest.frames?.[key];
  if(manifest.version!==1||manifest.encoding!=='int16-le-chw-unit'||!meta||meta.file!==key+'.bin'||meta.photo!==PHOTOS[key]||meta.coordinateConvention!=='opencv-camera-x-right-y-down-z-forward'||meta.normalOrientation!=='camera-facing')throw Error('Invalid example normal manifest');
  const result=await fetch(new URL(meta.file,BASE));if(!result.ok)throw Error('Example normals unavailable');
  const bytes=await result.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==meta.bytes||digest!==meta.sha256)throw Error('Example normal checksum mismatch');
  return {...meta,status:'ready',normals:decodeDemoNormals(bytes,meta),model:manifest.model,tokens:manifest.tokens,execution:'saved-demo-prediction',cacheHit:true};
 })().catch(error=>{frames.delete(key);throw error;}));
 const frame=await frames.get(key);
 // No name guessing or uploaded-photo reuse. Full-frame dimensions must match.
 if(width!==frame.inputWidth||height!==frame.inputHeight)return null;
 return frame;
}
