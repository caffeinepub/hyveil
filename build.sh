#!/usr/bin/env bash
set -e

CALM_MOC_PATH="/home/ubuntu/.motoko/moc/1.2.0/bin/moc"
CALM_MOTOKO_CORE="/home/ubuntu/.motoko/core/moc-1.2.0"

# Remove any prior src to avoid nested src/src
BUILD_DIR=$(mktemp -d)
cp -rf ./src/. "$BUILD_DIR/"
cd "$BUILD_DIR"

ls -la

if [ ! -x "$CALM_MOC_PATH" ]; then
    echo "Error: Motoko compiler not found at $CALM_MOC_PATH" >&2
    exit 1
fi

if [ ! -d "$CALM_MOTOKO_CORE" ]; then
    echo "Error: Motoko core library not found at $CALM_MOTOKO_CORE" >&2
    exit 1
fi

pnpm install --prefer-offline --child-concurrency 2 --network-concurrency 6
pnpm --filter '@caffeine/template-frontend' build:skip-bindings
node scripts/prune-unused-images.js
node scripts/resize-images.js

# -----------------------------------------------------------------------
# Step 1: Compile channel.mo -> channel.wasm
# -----------------------------------------------------------------------
echo "[build] Compiling channel.mo..."
$CALM_MOC_PATH \
  --implicit-package core \
  --default-persistent-actors \
  -no-check-ir -E M0236 -E M0235 -E M0223 -E M0237 \
  --package core "$CALM_MOTOKO_CORE" \
  src/backend/channel.mo \
  -o src/backend/channel.wasm
echo "[build] channel.wasm compiled successfully"

# -----------------------------------------------------------------------
# Step 2: Generate ChannelWasm.mo blob module from channel.wasm
# -----------------------------------------------------------------------
echo "[build] Generating ChannelWasm.mo..."
(cd src/backend && python3 generate_channel_wasm.py)
echo "[build] ChannelWasm.mo generated"

# -----------------------------------------------------------------------
# Step 3: Compile token.mo -> token.wasm
# -----------------------------------------------------------------------
echo "[build] Compiling token.mo..."
$CALM_MOC_PATH \
  --implicit-package core \
  --default-persistent-actors \
  -no-check-ir -E M0236 -E M0235 -E M0223 -E M0237 \
  --package core "$CALM_MOTOKO_CORE" \
  src/backend/token.mo \
  -o src/backend/token.wasm
echo "[build] token.wasm compiled successfully"

# -----------------------------------------------------------------------
# Step 4: Generate TokenWasm.mo blob module from token.wasm
# -----------------------------------------------------------------------
echo "[build] Generating TokenWasm.mo..."
(cd src/backend && python3 generate_token_wasm.py)
echo "[build] TokenWasm.mo generated"

# -----------------------------------------------------------------------
# Step 5: Compile oracle.mo -> oracle.wasm
# -----------------------------------------------------------------------
echo "[build] Compiling oracle.mo..."
$CALM_MOC_PATH \
  --implicit-package core \
  --default-persistent-actors \
  -no-check-ir -E M0236 -E M0235 -E M0223 -E M0237 \
  --package core "$CALM_MOTOKO_CORE" \
  src/backend/oracle.mo \
  -o src/backend/oracle.wasm
echo "[build] oracle.wasm compiled successfully"

# -----------------------------------------------------------------------
# Step 6: Generate OracleWasm.mo blob module from oracle.wasm
# -----------------------------------------------------------------------
echo "[build] Generating OracleWasm.mo..."
(cd src/backend && python3 generate_oracle_wasm.py)
echo "[build] OracleWasm.mo generated"

# -----------------------------------------------------------------------
# Step 7: Compile main.mo with all three WASM blobs embedded
# -----------------------------------------------------------------------
echo "[build] Compiling main.mo (with embedded WASMs)..."
$CALM_MOC_PATH \
  --implicit-package core \
  --default-persistent-actors \
  -no-check-ir -E M0236 -E M0235 -E M0223 -E M0237 \
  --actor-idl src/backend/system-idl \
  --package core "$CALM_MOTOKO_CORE" \
  src/backend/main.mo \
  -o src/backend/backend.wasm
echo "[build] backend.wasm compiled successfully"

mkdir -p /workdir/src/frontend/
mkdir -p /workdir/src/backend/
cp -rf src/frontend/dist/ /workdir/src/frontend/ 2>/dev/null || echo "No frontend dist to copy"
cp -f src/backend/backend.wasm /workdir/src/backend/ 2>/dev/null || echo "No backend wasm to copy"
