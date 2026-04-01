# HYVEIL – Real Canister Factory Implementation

## Current State
The `registerPartner()` function in `main.mo` sets `canisterId = caller` (a fake ID — no real canister is deployed). There is no IC management canister integration. The partner channel template does not exist as a deployable Motoko actor.

## Requested Changes (Diff)

### Add
- `src/backend/channel.mo` — Partner channel canister template: content management, follower system, purchase/revenue tracking, 90/10 split recording, analytics, access control with `initialize(owner, treasury)` one-time init
- `channelWasm: ?Blob` stored in `main.mo` — admin uploads compiled channel WASM after compilation
- `setChannelWasm(wasm: Blob)` admin-only endpoint in main.mo
- `getChannelWasmStatus()` public query in main.mo — returns whether WASM is loaded
- Real IC management calls in `registerPartner()`: `create_canister` (with cycles from 0.5 ICP fee) then `install_code` (with channelWasm), then calls `initialize(caller, selfPrincipal)` on the new channel
- Frontend: Admin panel shows WASM upload status and instructions for loading the channel WASM
- Frontend: Partner registration shows clear error if WASM not yet loaded by admin

### Modify
- `registerPartner()` in main.mo: replace `canisterId = caller` with real `create_canister` + `install_code` + `initialize` calls
- Partner registration step 3 in frontend: show real deployed canister ID, link to channel URL
- Dashboard admin section: add channel WASM status indicator

### Remove
- Fake `canisterId = caller` assignment in registerPartner
- Frontend mock canister IDs in partner registration flow

## Implementation Plan
1. Write `channel.mo` — standalone partner channel actor with initialize, content CRUD, followers, purchases, analytics
2. Update `main.mo` — add channelWasm storage, setChannelWasm admin fn, IC management interface, real factory in registerPartner
3. Update frontend — WASM status in admin dashboard, error state when WASM not loaded, real canister ID display after deploy
