# SPDX-License-Identifier: AGPL-3.0-or-later
param([string]$ZigPath = 'zig')
$ErrorActionPreference = 'Stop'
$buildRoot = $PSScriptRoot
$env:ZIG_GLOBAL_CACHE_DIR = Join-Path $buildRoot '.zig-global-cache'
$env:ZIG_LOCAL_CACHE_DIR = Join-Path $buildRoot '.zig-local-cache'
$source = Join-Path $buildRoot 'upstream/lsd.c'
$output = Join-Path $buildRoot 'lsd.wasm'
& $ZigPath cc -target wasm32-wasi -O3 -ffp-contract=off -fno-fast-math -mexec-model=reactor $source '-Wl,--export=lsd' '-Wl,--export=malloc' '-Wl,--export=free' '-Wl,--initial-memory=134217728' '-Wl,--max-memory=268435456' '-Wl,-z,stack-size=1048576' -o $output
if ($LASTEXITCODE -ne 0) { throw "WASM compile failed: $LASTEXITCODE" }
Get-Item -LiteralPath $output | Select-Object Name,Length
