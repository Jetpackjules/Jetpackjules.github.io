---
library_name: onnx
tags:
- onnx
- depth-estimation
- image-segmentation
- matting
- android
---

# SpatialThings ONNX Models

ONNX exports used by the SpatialThings Android app.

## Files

| File | Size | SHA-256 |
| --- | ---: | --- |
| `depth_anything_v2_metric_indoor_small.onnx` | 98,941,147 bytes | `0d9a2394746efc2666fac8cf450c9bcf5a29e45f823be21176bd7a45fffe089a` |
| `ppmattingv2-stdc1-human_512.onnx` | 35,973,826 bytes | `448d0a5d143426057e6cedbd1711ee8059b4f7057e030f0a33cab3a1ed141567` |

## Upstream Sources

- Depth model source checkpoint: `depth-anything/Depth-Anything-V2-Metric-Indoor-Small-hf`
- Matting model source checkpoint: PaddleSeg `ppmattingv2-stdc1-human_512.pdparams`

These files are converted ONNX artifacts for app runtime distribution.
