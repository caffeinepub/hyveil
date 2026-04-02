# HYVEIL

## Current State
- `main.mo` has canister factory, partner registry, admin dashboard, token system deployment
- `oracle.mo` has social mining oracle with daily timer logic (not yet wired to auto-timer)
- Admin dashboard shows HYVEIL cycles balance via `getHyveilCyclesBalance()`
- No auto-refill logic for HYVEIL-owned canisters (oracle, token, main)
- No partner canister cycles monitoring or top-up UX

## Requested Changes (Diff)

### Add
- `main.mo`: Hourly timer that checks cycles of the oracle and token canisters, tops them up to 1 TC if they fall below 1B cycles
- `main.mo`: `getCanisterCyclesBalance(canisterId)` — queries IC management `canister_status` to get any canister's cycles
- `main.mo`: `getPartnerCanisterCycles(partnerId)` — returns cycles balance for a partner's canister
- `main.mo`: `topUpPartnerCanister(partnerId)` — partner pays 1 ICP from their balance, HYVEIL transfers 50B cycles from reserve to their canister
- Frontend: Per-channel cycles balance display in My Channels / Partner management section
- Frontend: Warning banner on partner dashboard when their canister cycles < 200B
- Frontend: "Top Up 1 ICP" button that calls `topUpPartnerCanister()`
- Frontend: Admin dashboard shows auto-refill status (last checked, last refill events)

### Modify
- `main.mo`: Add `system func timer` for hourly auto-refill of oracle + token canisters
- Admin dashboard: Add auto-refill status card showing oracle and token canister cycles

### Remove
- Nothing

## Implementation Plan
1. Add IC management `canister_status` interface to `main.mo`
2. Add `checkAndRefillOwnedCanisters()` internal function — checks oracle and token canister cycles, tops up from reserve to 1 TC if below 1B
3. Wire a `system func timer` (hourly = 3600 * 1_000_000_000 nanoseconds) to call the refill function
4. Add `getPartnerCanisterCycles(partnerId)` public query using `canister_status`
5. Add `topUpPartnerCanister(partnerId)` — deducts 1 ICP from partner balance, calls `deposit_cycles` to send 50B cycles to their canister
6. Frontend: fetch cycles balance per partner canister on My Channels load
7. Frontend: Show amber warning + "Top Up 1 ICP" button when < 200B cycles
8. Frontend: Admin dashboard auto-refill status (oracle cycles, token cycles, last refill)
