"""Render a looping portfolio animation from actual CRUX detection/route data."""
import json, math, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).parent
OUT=ROOT/'public/assets/projects/crux'
OUT.mkdir(parents=True,exist_ok=True)
data=json.loads((HERE/'data.json').read_text())
W,H,FPS,SECONDS=960,640,24,12
photo=Image.open(ROOT/'public/crux/examples/overhang.png').convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
gray=Image.blend(photo.convert('L').convert('RGB'),Image.new('RGB',(W,H),'#101b17'),.18)
font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',28)
small=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',20)
lime=(210,241,114); coral=(255,110,76); teal=(69,220,221); white=(255,255,235)
def smooth(v):
 v=max(0,min(1,v));return v*v*(3-2*v)
def pts(poly):
 return [(round((p.get('x') if isinstance(p,dict) else p[0])*W),round((p.get('y') if isinstance(p,dict) else p[1])*H)) for p in poly]
def layer():return Image.new('RGBA',(W,H))
def blend(base,over,a):
 if a<=0:return base
 over=over.copy();over.putalpha(over.getchannel('A').point(lambda v:round(v*min(1,a))));return Image.alpha_composite(base,over)
holds=data['holds'];route=data['route']
start=set(map(str,route['start']['hands']+route['start']['feet']))
hands=set(map(str,route['handIds']));feet=set(map(str,route['footIds']));finish=str(route['finishId'])
selected=hands|feet|start|{finish}
route_mask=Image.new('L',(W,H));md=ImageDraw.Draw(route_mask)
outline=layer();od=ImageDraw.Draw(outline)
for h in holds:
 poly=pts(h.get('polygon') or [])
 if len(poly)<3 or str(h['id']) not in selected:continue
 md.polygon(poly,fill=255)
 color=white if str(h['id'])==finish else lime if str(h['id']) in start else coral if str(h['id']) in hands else teal
 od.polygon(poly,fill=(*color,65));od.line(poly+[poly[0]],fill=(*color,255),width=3,joint='curve')
glow=outline.filter(ImageFilter.GaussianBlur(6))
route_photo=gray.copy();route_photo.paste(photo,(0,0),route_mask)
def tag(draw,text,x,y,color=white):
 box=draw.textbbox((0,0),text,font=small);tw=box[2]-box[0];x=max(8,min(W-tw-24,x));y=max(8,min(H-38,y))
 draw.rounded_rectangle((x,y,x+tw+20,y+32),radius=7,fill=(19,29,22,240),outline=(*color,230),width=1)
 draw.text((x+10,y+4),text,font=small,fill=(*color,255))
tags=layer();td=ImageDraw.Draw(tags)
finish_hold=next(h for h in holds if str(h['id'])==finish)
tag(td,'TOP',finish_hold['x']*W+18,finish_hold['y']*H+10)
starts=[h for h in holds if str(h['id']) in start]
tag(td,'START',min(h['x'] for h in starts)*W-82,max(h['y'] for h in starts)*H+18,lime)
def frame(t):
 route_t=smooth((t-6.3)/1.2);reset=smooth((t-10.0)/2.0)
 dim=smooth((t-1.0)/1.3)*.24*(1-route_t)
 base=Image.blend(photo,gray,dim).convert('RGBA')
 walls=layer();wd=ImageDraw.Draw(walls)
 for i,f in enumerate(sorted(data['faces'],key=lambda f:sum(p[0] for p in f['polygon'])/len(f['polygon']))):
  a=smooth((t-1.15-i*.075)/.8)*(1-smooth((t-4.8)/1.2))
  if a<=0:continue
  poly=pts(f['polygon']);wd.polygon(poly,fill=(*lime,round(24*a)));wd.line(poly+[poly[0]],fill=(*lime,round(245*a)),width=3,joint='curve')
 base=Image.alpha_composite(base,walls)
 all_holds=layer();hd=ImageDraw.Draw(all_holds)
 for h in holds:
  poly=pts(h.get('polygon') or [])
  if len(poly)<3:continue
  a=smooth((t-3.45-h['y']*1.65)/.42)*(1-route_t)
  if a<=0:continue
  hd.polygon(poly,fill=(*teal,round(28*a)));hd.line(poly+[poly[0]],fill=(*teal,round(235*a)),width=2,joint='curve')
 base=Image.alpha_composite(base,all_holds)
 if 3.45<t<5.5:
  scan=layer();sd=ImageDraw.Draw(scan);y=int((t-3.45)/2.05*H);sd.line((0,y,W,y),fill=(*teal,130),width=2);base=Image.alpha_composite(base,scan)
 if route_t:
  finished=route_photo.convert('RGBA');finished=blend(finished,glow,.65);finished=Image.alpha_composite(finished,outline);finished=blend(finished,tags,smooth((t-7.15)/.5));base=Image.blend(base,finished,route_t)
 # The final frame returns exactly to the first: no jump at loop boundaries.
 base=Image.blend(base,photo.convert('RGBA'),reset)
 stage='WALL FACES' if 1.1<t<3.45 else 'HOLD OUTLINES' if 3.45<=t<6.3 else 'YOUR CLIMB' if 6.3<=t<10.5 else None
 if stage:
  chip=layer();d=ImageDraw.Draw(chip);tw=d.textlength(stage,font=font)
  d.rounded_rectangle((22,22,tw+58,72),radius=12,fill=(19,29,22,235));d.text((40,32),stage,font=font,fill=(*lime,255));base=blend(base,chip,(1-reset)*smooth((t-1.1)/.25))
 return base.convert('RGB')

ffmpeg=shutil.which('ffmpeg')
cmd=[ffmpeg,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'overhang-loop.mp4')]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for i in range(FPS*SECONDS):p.stdin.write(frame(i/(FPS*SECONDS-1)*SECONDS).tobytes())
p.stdin.close()
if p.wait():raise RuntimeError('Video encoding failed')
frame(8.8).save(OUT/'overhang-poster.jpg',quality=90)
shots=[frame(t).resize((480,320)) for t in [0,2.8,5.8,8.8]]
sheet=Image.new('RGB',(960,640))
for i,im in enumerate(shots):sheet.paste(im,((i%2)*480,(i//2)*320))
sheet.save(HERE/'stages.jpg',quality=93)
print(json.dumps({'videoBytes':(OUT/'overhang-loop.mp4').stat().st_size,'seconds':SECONDS,'frames':FPS*SECONDS,'routeHolds':len(selected)}))
