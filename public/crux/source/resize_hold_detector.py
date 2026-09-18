"""Derive fixed 640/960 ONNX graphs from the 2560 freeclimbs model.

Model: https://huggingface.co/jwlarocque/yolov8n-freeclimbs-detect-2
Upstream copyright (c) 2024 John LaRocque. License: AGPL-3.0.
Modifications, 2026-09-17: regenerate resolution-specific anchor/stride tensors,
update DFL reshape constants and graph dimensions; learned weights unchanged.
This script is provided under AGPL-3.0 with the derived model.
These sizes have passed a synthetic ONNX Runtime smoke check only; smaller
image input may reduce small-hold detection recall.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "onnx-inspect"))
import numpy as np
import onnx
from onnx import numpy_helper


def anchor_tensors(size):
    grids, strides = [], []
    for stride in (8, 16, 32):
        n = size // stride
        axis = np.arange(n, dtype=np.float32) + 0.5
        yy, xx = np.meshgrid(axis, axis, indexing="ij")
        grids.append(np.stack((xx.flatten(), yy.flatten()), axis=0))
        strides.append(np.full((1, n*n), stride, dtype=np.float32))
    return np.concatenate(grids, axis=1)[None], np.concatenate(strides, axis=1)


original = ROOT / "hold-detector.onnx"
model = onnx.load(original)
initializers = {v.name: numpy_helper.to_array(v) for v in model.graph.initializer}
anchor_name = "/model.22/Constant_9_output_0"
stride_name = "/model.22/Constant_12_output_0"
original_anchors, original_strides = anchor_tensors(2560)
assert np.array_equal(original_anchors, initializers[anchor_name])
assert np.array_equal(original_strides, initializers[stride_name])

for size in (640, 960):
    graph = onnx.load(original)
    anchors, strides = anchor_tensors(size)
    count = anchors.shape[2]
    replacements = {
        anchor_name: anchors,
        stride_name: strides,
        "/model.22/dfl/Constant_output_0": np.array([1, 4, 16, count], dtype=np.int64),
        "/model.22/dfl/Constant_1_output_0": np.array([1, 4, count], dtype=np.int64),
    }
    for initializer in graph.graph.initializer:
        if initializer.name in replacements:
            initializer.CopyFrom(numpy_helper.from_array(replacements[initializer.name], initializer.name))
    dims = graph.graph.input[0].type.tensor_type.shape.dim
    dims[2].dim_value = size
    dims[3].dim_value = size
    graph.graph.output[0].type.tensor_type.shape.dim[2].dim_value = count
    del graph.graph.value_info[:]
    for item in graph.metadata_props:
        if item.key == "imgsz":
            item.value = str([size, size])
    onnx.checker.check_model(graph)
    path = ROOT / f"hold-detector-{size}.onnx"
    onnx.save(graph, path)
    print(path, count)
