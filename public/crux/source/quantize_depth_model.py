"""Reproduce the tested quantized artifact locally; no network access required.

Dependencies: onnxruntime==1.26.0, onnx==1.22.0, sympy==1.14.0.
Source checkpoint file SHA256 is checked before conversion. Browser chunks and
their manifest are updated after quantization. License files are preserved.
"""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parent
if (ROOT/'vendor').exists(): sys.path.insert(0,str(ROOT/'vendor'))
import onnx,onnxruntime
from onnxruntime.quantization import quantize_dynamic,QuantType

source=ROOT/'metric-indoor-small.onnx'
expected='0d9a2394746efc2666fac8cf450c9bcf5a29e45f823be21176bd7a45fffe089a'
assert hashlib.sha256(source.read_bytes()).hexdigest()==expected,'Unexpected source artifact'
target=ROOT/'metric-indoor-small-q8.onnx'
quantize_dynamic(str(source),str(target),weight_type=QuantType.QInt8,op_types_to_quantize=['MatMul','Gemm'])
data=target.read_bytes();out=ROOT/'browser-model';out.mkdir(exist_ok=True)
chunks=[];chunk_size=18*1024*1024
for i,start in enumerate(range(0,len(data),chunk_size)):
 part=data[start:start+chunk_size];name=f'metric-indoor-small-q8.part{i+1}.bin'
 (out/name).write_bytes(part)
 chunks.append({'file':name,'bytes':len(part),'sha256':hashlib.sha256(part).hexdigest()})
manifest=json.loads((out/'manifest.json').read_text())
manifest.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),chunks=chunks)
manifest['quantization'].update(onnxruntime=onnxruntime.__version__,onnx=onnx.__version__)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'bytes':len(data),'sha256':manifest['sha256'],'chunks':chunks},indent=2))
