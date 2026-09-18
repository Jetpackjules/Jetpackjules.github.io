"""Reproduce the normal-only graph and static-host chunks. No training or quantization."""
from pathlib import Path
import argparse, hashlib, json

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True, help='Official full MoGe-2 Small ONNX export')
parser.add_argument('--normal-only', type=Path, help='Already pruned graph; otherwise use onnx.utils.extract_model')
args = parser.parse_args()
source_sha = hashlib.sha256(args.source.read_bytes()).hexdigest()
if args.normal_only:
    normal_path = args.normal_only
else:
    import onnx
    normal_path = args.source.with_name('small-normal-only.onnx')
    onnx.utils.extract_model(str(args.source), str(normal_path), ['image', 'num_tokens'], ['normal'], check_model=True)
data = normal_path.read_bytes()
output = ROOT / 'dist/models/moge'
output.mkdir(parents=True, exist_ok=True)
chunks = []
for index, start in enumerate(range(0, len(data), 64 * 1024 * 1024)):
    part = data[start:start + 64 * 1024 * 1024]
    name = f'small-normal-fp32-{index:02d}.bin'
    (output / name).write_bytes(part)
    chunks.append({'file': name, 'bytes': len(part), 'sha256': hashlib.sha256(part).hexdigest()})
manifest = {
    'id': 'moge-2-vits-normal-only-fp32-v1', 'model': 'MoGe-2 Small normal-only',
    'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'chunks': chunks,
    'source': {
        'repository': 'Ruicheng/moge-2-vits-normal-onnx',
        'revision': 'e50ffda41565591092adea54c6ac83d6212e1e23',
        'file': 'model.onnx', 'sha256': source_sha,
        'url': 'https://huggingface.co/Ruicheng/moge-2-vits-normal-onnx/resolve/e50ffda41565591092adea54c6ac83d6212e1e23/model.onnx',
        'license': 'MIT; DINOv2 component Apache-2.0',
    },
    'transformation': 'onnx.utils.extract_model: inputs image,num_tokens; output normal. Learned weights unchanged.',
    'input': {'image': 'float32 NCHW RGB [0,1]', 'num_tokens': 'int64 scalar 1200', 'maxEdge': 480},
    'rawOutput': {'name': 'normal', 'layout': 'NHWC', 'coordinateConvention': 'opencv-camera-x-right-y-down-z-forward', 'normalOrientation': 'camera-facing'},
}
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'bytes': len(data), 'sha256': manifest['sha256'], 'chunks': chunks}, indent=2))
