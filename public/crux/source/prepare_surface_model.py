"""Download and split the exact FP16 surface model used by CRUX.
Usage: python dev/prepare_surface_model.py --output work/surface-model
Weights are unchanged. The supplied hash pins the publisher bytes.
"""
from pathlib import Path
import argparse, hashlib, json, urllib.request, shutil
URL='https://huggingface.co/onnx-community/metric3d-vit-small/resolve/main/onnx/model_fp16.onnx'
SHA='4afcc0893dbb3c0c63e270f8bb24bfa63ccf2dc68ab9c0c3601fdae4f0aafd9b'
SIZE=75778144
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
args.output.mkdir(parents=True,exist_ok=True)
model=args.output/'metric3d-fp16.onnx'
if not model.exists():
    with urllib.request.urlopen(URL,timeout=120) as source,model.open('wb') as target:shutil.copyfileobj(source,target)
data=model.read_bytes()
if len(data)!=SIZE or hashlib.sha256(data).hexdigest()!=SHA:raise RuntimeError('Unexpected model bytes; refusing to package')
chunks=[]
for i,start in enumerate(range(0,len(data),19000000)):
    part=data[start:start+19000000];name=f'chunk-{i}.bin';(args.output/name).write_bytes(part)
    chunks.append({'file':name,'bytes':len(part),'sha256':hashlib.sha256(part).hexdigest()})
(args.output/'transport.json').write_text(json.dumps({'bytes':SIZE,'sha256':SHA,'source':URL,'chunks':chunks},indent=2))
print('Exact publisher model verified and split into',len(chunks),'files.')
