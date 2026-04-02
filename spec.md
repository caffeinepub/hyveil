# HYVEIL — Deploy Token System from Admin Dashboard

## Current State
- `token.mo` and `oracle.mo` are written but only compiled as separate standalone actors
- `canister.yaml` only compiles `main.mo` via a single MOC command
- `channel.mo` is embedded as `ChannelWasm.mo` at build time via a Python script
- `main.mo` imports `ChannelWasm` and pre-loads it at startup
- Admin dashboard has a WASM status card and cycles reserve card
- No one-click deploy flow for token/oracle system exists

## Requested Changes (Diff)

### Add
- `generate_token_wasm.py` — same pattern as `generate_channel_wasm.py`, converts `token.wasm` → `TokenWasm.mo`
- `generate_oracle_wasm.py` — converts `oracle.wasm` → `OracleWasm.mo`
- Build steps in `canister.yaml` to compile `token.mo` and `oracle.mo` and run those generators before compiling `main.mo`
- `TokenWasm.mo` and `OracleWasm.mo` auto-generated at build time
- `deployTokenSystem()` in `main.mo` — admin-only, one-time function that:
  1. Checks token/oracle WASMs are loaded
  2. Calls `create_canister()` twice (token + oracle), each with 50B cycles
  3. Calls `install_code()` for token canister
  4. Calls `install_code()` for oracle canister
  5. Calls `tokenActor.initAdmin()` and sets oracle on token
  6. Calls `oracleActor.initAdmin()` and sets token canister on oracle
  7. Stores both canister IDs in `main.mo` state
  8. Returns `{ tokenCanisterId; oracleCanisterId }`
- `getTokenSystemStatus()` query in `main.mo` — returns whether token/oracle are deployed and their canister IDs
- "Deploy Token System" admin-only card on the Dashboard tab

### Modify
- `main.mo`: Import `TokenWasm` and `OracleWasm`, pre-load them at startup, add `deployTokenSystem()`, add `getTokenSystemStatus()`
- `canister.yaml`: Add 4 new build steps before the final MOC compilation
- Frontend admin dashboard: Add "HYV Token System" card showing deploy status and button

### Remove
- Manual oracle/token principal set instructions (replaced by one-click deploy)

## Implementation Plan
1. Create `generate_token_wasm.py` and `generate_oracle_wasm.py` (copy pattern from channel generator)
2. Update `canister.yaml` to compile both and generate their Wasm modules
3. Update `main.mo` to import TokenWasm/OracleWasm, add `deployTokenSystem()` and `getTokenSystemStatus()`
4. Update frontend Dashboard to add the Deploy Token System card (admin-only)
5. Validate and deploy
