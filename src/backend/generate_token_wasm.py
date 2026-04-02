#!/usr/bin/env python3
"""Converts compiled token.wasm into a Motoko blob module (TokenWasm.mo).
This runs as a build step so the HYV token WASM is embedded directly
into HYVEIL's backend at deploy time -- no manual upload needed."""
import sys
import os

wasm_path = 'token.wasm'
out_path = 'TokenWasm.mo'

if not os.path.exists(wasm_path):
    print("ERROR: " + wasm_path + " not found. token.mo must be compiled first.", file=sys.stderr)
    sys.exit(1)

with open(wasm_path, 'rb') as f:
    data = f.read()

hex_str = ''.join('\\' + format(b, '02x') for b in data)
content = 'module { public let wasm : Blob = "' + hex_str + '"; };\n'

with open(out_path, 'w') as f:
    f.write(content)

print("Generated " + out_path + " from " + wasm_path + " (" + str(len(data)) + " bytes)")
