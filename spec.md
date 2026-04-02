# HYVEIL

## Current State
HYVEIL has a pre-funded cycles reserve model. HYVEIL's admin must manually top up the canister's cycles balance via dfx or the NNS. There is no in-app way to convert ICP held in HYVEIL's treasury into cycles. The CMC (Cycles Minting Canister) integration was listed as an unresolved issue.

Currently working:
- `getHyveilCyclesBalance()` returns the live cycles balance
- Admin dashboard shows the cycles reserve card
- Auto-refill logic draws from HYVEIL's cycles balance

## Requested Changes (Diff)

### Add
- `notifyTopUp(blockIndex: Nat64)` in `main.mo` — admin-only; calls CMC (`rkp4c-7iaaa-aaaaa-aaaca-cai`) `notify_top_up` with HYVEIL's canister ID and the provided ICP transfer block index; returns cycles credited
- `getIcpXdrConversionRate()` in `main.mo` — shared update; queries CMC for current ICP→XDR rate and caches it; returns `{ xdrPermyriadPerIcp: Nat64; timestampSeconds: Nat64 }`
- CMC actor definition in `main.mo`
- Nat64 import in `main.mo`
- New types in `backend.d.ts`: `CmcTopUpResult`, `IcpXdrRate`
- New functions in `backend.d.ts`: `notifyTopUp`, `getIcpXdrConversionRate`
- "Convert ICP to Cycles" card in the admin dashboard (admin-only):
  - Shows HYVEIL canister principal (for computing CMC deposit address)
  - Shows current ICP→cycles conversion rate estimate
  - Block index input + "Notify CMC" button
  - Live feedback on cycles credited after success
  - Step-by-step instructions

### Modify
- `main.mo`: add CMC imports and two new public functions
- `backend.d.ts`: add new types and function signatures
- `App.tsx`: add CMC top-up panel to the admin dashboard section

### Remove
- Nothing removed

## Implementation Plan
1. Add `Nat64` import to `main.mo`
2. Define CMC actor with `notify_top_up` and `get_icp_xdr_conversion_rate`
3. Add `notifyTopUp(blockIndex: Nat64)` — admin-only, calls CMC, returns cycles credited as Nat
4. Add `getIcpXdrConversionRate()` — calls CMC, caches result, returns rate
5. Update `backend.d.ts` with new types and signatures
6. Update admin dashboard in `App.tsx` with CMC top-up UI panel
