// Per-wall paint groups. Color observations are distinct from route identity.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const quantile=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor((s.length-1)*p)]??0;};
const linear=Array.from({length:256},(_,i)=>{const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
const f=x=>x>.008856?Math.cbrt(x):7.787*x+16/116;
export function rgbToLab([r,g,b]){r=linear[Math.round(r)];g=linear[Math.round(g)];b=linear[Math.round(b)];const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047),y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);return [116*y-16,500*(x-y),200*(y-z)];}
const distance=(a,b)=>Math.hypot((a[0]-b[0])*.8,a[1]-b[1],a[2]-b[2]);
const median=points=>[0,1,2].map(i=>quantile(points.map(p=>p[i]),.5));
const hex=rgb=>'#'+rgb.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
function inside(poly,x,y){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
export function sampleHoldColor(image,hold,neighbors=[]){
 const {width,height}=image,data=image.pixels||image.data;
 const box=hold.detectionBox||hold,poly=hold.polygon||[{x:box.x-box.w/2,y:box.y-box.h/2},{x:box.x+box.w/2,y:box.y-box.h/2},{x:box.x+box.w/2,y:box.y+box.h/2},{x:box.x-box.w/2,y:box.y+box.h/2}];
 const left=Math.max(0,Math.min(...poly.map(p=>p.x))*width),right=Math.min(width,Math.max(...poly.map(p=>p.x))*width),top=Math.max(0,Math.min(...poly.map(p=>p.y))*height),bottom=Math.min(height,Math.max(...poly.map(p=>p.y))*height);
 const step=Math.max(1,Math.max(right-left,bottom-top)/64),edge=Math.min(1.5,Math.min(right-left,bottom-top)*.07),samples=[],ring=[];
 const pixel=(x,y)=>{const i=(Math.floor(y)*width+Math.floor(x))*4,rgb=[data[i],data[i+1],data[i+2]];return {rgb,lab:rgbToLab(rgb)};};
 const margin=Math.max(4,Math.max(right-left,bottom-top)*.18);
 for(let y=Math.max(0,top-margin);y<Math.min(height,bottom+margin);y+=step)for(let x=Math.max(0,left-margin);x<Math.min(width,right+margin);x+=step){
  const nx=(x+.5)/width,ny=(y+.5)/height;if(x+.5>=width||y+.5>=height)continue;
  const hit=inside(poly,nx,ny);
  if(hit){if(inside(poly,(x+.5-edge)/width,ny)&&inside(poly,(x+.5+edge)/width,ny)&&inside(poly,nx,(y+.5-edge)/height)&&inside(poly,nx,(y+.5+edge)/height))samples.push(pixel(x,y));}
  else if(!neighbors.some(n=>n!==hold&&Math.abs(nx-n.x)<n.w*.55&&Math.abs(ny-n.y)<n.h*.55))ring.push(pixel(x,y).lab);
 }
 if(!samples.length){const rgb=hold.appearance?.dominantColor?.rgb||pixel(clamp(box.x*width,0,width-1),clamp(box.y*height,0,height-1)).rgb;return {rgb,lab:rgbToLab(rgb),hex:hex(rgb),sampleCount:0,quality:'limited'};}
 const background=median(ring),different=samples.filter(p=>distance(p.lab,background)>14);
 let paint=different.length>Math.max(8,samples.length*.2)?different:samples;
 const low=quantile(paint.map(p=>p.lab[0]),.15),high=quantile(paint.map(p=>p.lab[0]),.85);
 paint=paint.filter(p=>p.lab[0]>=low&&p.lab[0]<=high);
 const rgb=median(paint.map(p=>p.rgb)),lab=median(paint.map(p=>p.lab));
 return {rgb,lab,hex:hex(rgb),sampleCount:paint.length,quality:hold.fallback?'limited':'sampled'};
}
function paintName(rgb){
 const [r,g,b]=rgb,max=Math.max(...rgb),min=Math.min(...rgb),d=max-min,s=max?d/max:0,l=rgbToLab(rgb)[0];
 if(l<30&&s<.25)return 'Black';
 if(s<.14)return l>78?'White':l<26?'Black':'Gray';
 const hue=((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;
 if(hue<18||hue>=340)return l>62&&s<.65?'Flamingo pink':hue>=340&&s<.65?'Dark rose':'Red';
 if(hue<45)return 'Orange';if(hue<80)return 'Yellow';if(hue<180)return 'Green';
 if(hue<270&&l>78&&s<.45)return 'Ice blue';
 if(hue>=200&&hue<250&&s<.5)return 'Slate blue';
 if(hue<205)return 'Teal';if(hue<225)return 'Blue';if(hue<270)return 'Blue violet';if(hue<315)return 'Purple';return l>62?'Flamingo pink':'Dark rose';
}
export function groupHoldColors(holds){
 const samples=holds.map(h=>h.appearance?.paintColor||(()=>{const rgb=h.appearance?.dominantColor?.rgb||[128,128,128];return {rgb,lab:rgbToLab(rgb),hex:hex(rgb)};})());
 const groups=samples.map((s,i)=>({members:[i],lab:s.lab}));
 while(groups.length>1){let best=Infinity,pair=null;
  for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++){
   if(distance(groups[a].lab,groups[b].lab)>21)continue;
   let maximum=0;for(const i of groups[a].members)for(const j of groups[b].members)maximum=Math.max(maximum,distance(samples[i].lab,samples[j].lab));
   if(maximum<best){best=maximum;pair=[a,b];}
  }
  if(!pair||best>22)break;
  const [a,b]=pair;groups[a].members.push(...groups[b].members);groups[a].lab=median(groups[a].members.map(i=>samples[i].lab));groups.splice(b,1);
 }
 // Consolidate small lighting/chroma splits without chaining separate paints.
 // Lightness still separates pale/slate blues and flamingo/dark rose pinks.
 while(groups.length>1){let best=Infinity,pair=null;
  for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++){
   const x=groups[a].lab,y=groups[b].lab,delta=distance(x,y),light=Math.abs(x[0]-y[0]),chroma=Math.hypot(x[1],x[2])*Math.hypot(y[1],y[2]);
   const angle=chroma>1?Math.acos(clamp((x[1]*y[1]+x[2]*y[2])/chroma,-1,1))*180/Math.PI:Infinity;
   if(!(delta<17&&light<16||delta<22&&light<12&&angle<12))continue;
   const joined=groups[a].members.concat(groups[b].members),center=median(joined.map(i=>samples[i].lab));
   if(joined.some(i=>distance(samples[i].lab,center)>31))continue;
   if(delta<best){best=delta;pair=[a,b];}
  }
  if(!pair)break;
  const [a,b]=pair;groups[a].members.push(...groups[b].members);groups[a].lab=median(groups[a].members.map(i=>samples[i].lab));groups.splice(b,1);
 }
 groups.sort((a,b)=>a.lab[1]-b.lab[1]||a.lab[2]-b.lab[2]||a.lab[0]-b.lab[0]);
 const names=new Map(),palette=groups.map((g,i)=>{const rgb=median(g.members.map(j=>samples[j].rgb)),label=paintName(rgb);names.set(label,(names.get(label)||0)+1);return {id:'paint-'+(i+1),label,hex:hex(rgb),lab:g.lab,count:g.members.length,members:g.members};});
 const counts=new Map();for(const group of palette)if(names.get(group.label)>1){const base=group.label,n=(counts.get(base)||0)+1;counts.set(base,n);group.label=base+' '+n;}
 const assignment=new Map();for(const group of palette)for(const i of group.members)assignment.set(i,group.id);
 return {holds:holds.map((h,i)=>({...h,color:assignment.get(i)})),palette:palette.map(({members,...group})=>group)};
}
export function assignHoldColors(image,holds){return groupHoldColors(holds.map(h=>({...h,appearance:{...h.appearance,paintColor:sampleHoldColor(image,h,holds)}})));}
export function nearestPaintGroup(sample,palette){const ranked=palette.map(p=>({id:p.id,d:distance(sample.lab,p.lab)})).sort((a,b)=>a.d-b.d);return ranked[0]?.d<=22?ranked[0].id:null;}
