// Pack genuine browser MoGe outputs, never traced geometry or assigned angles.
// Input: raw CHW Float32 frames and metadata captured by inferMoGeSurfaceFrame.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const input=process.argv[2];
if(!input)throw Error('Usage: node dev/pack-demo-normals.mjs <capture-directory>');
const root=new URL('../dist/',import.meta.url),out=new URL('models/demo-normals/',root);
fs.mkdirSync(out,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const model=JSON.parse(fs.readFileSync(new URL('models/moge/manifest.json',root)));
const manifest={version:1,encoding:'int16-le-chw-unit',model:model.model,modelSha256:model.sha256,modelSource:model.source,tokens:1200,frames:{}};
for(const [key,photo] of Object.entries({straight:'demo-wall.jpg',overhang:'examples/overhang.png',cave:'examples/cave.png'})){
 const raw=fs.readFileSync(path.join(input,`demo-${key}.f32`));
 const meta=JSON.parse(fs.readFileSync(path.join(input,`demo-${key}.json`)));
 if(meta.status!=='ready'||meta.layout!=='CHW'||meta.tokens!==1200||raw.length!==meta.width*meta.height*12)throw Error('Invalid normal capture');
 const values=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4),packed=Buffer.alloc(values.length*2);
 let maxError=0;
 for(let i=0;i<values.length;i++){const value=Math.round(Math.max(-1,Math.min(1,values[i]))*32767);packed.writeInt16LE(value,i*2);maxError=Math.max(maxError,Math.abs(values[i]-value/32767));}
 const file=key+'.bin';fs.writeFileSync(new URL(file,out),packed);
 manifest.frames[key]={file,photo,photoSha256:hash(fs.readFileSync(new URL(photo,root))),width:meta.width,height:meta.height,inputWidth:meta.inputWidth,inputHeight:meta.inputHeight,layout:meta.layout,coordinateConvention:meta.coordinateConvention,normalOrientation:meta.normalOrientation,bytes:packed.length,sha256:hash(packed),rawSha256:hash(raw),maxComponentError:maxError};
}
fs.writeFileSync(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
console.log(Object.fromEntries(Object.entries(manifest.frames).map(([k,v])=>[k,{bytes:v.bytes,maxComponentError:v.maxComponentError}])));
