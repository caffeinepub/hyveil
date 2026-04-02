# HYVEIL

## Current State
Four backend canisters: main.mo (hub), channel.mo (partner template), token.mo (HYV ICRC-2), oracle.mo (social mining). All previously identified build bugs are fixed. Core flows: partner channel deployment via canister factory, 90/10 revenue split, HYV social mining, CMC integration, auto-refill.

## Requested Changes (Diff)

### Add
- `main.mo`: real ICP `icrc2_transfer_from` payment inside `purchaseContent` before recording purchase
- `main.mo`: `withdrawEarnings(amount)` — creator withdraws accumulated ICP earnings to their wallet via `icrc1_transfer`
- `main.mo`: `hasPurchased(contentId)` query — prevents duplicate purchases
- `main.mo`: `icrc1_transfer` to the ICP ledger actor definition
- `main.mo`: per-user likeVideo deduplication using a `videoLikes` map
- `channel.mo`: `followTimestamps` map + 1-hour cooldown on `follow()` and `unfollow()`

### Modify
- `channel.mo` `recordPurchase`: restrict caller to `hyveilTreasury` only — remove owner access entirely
- `main.mo` `purchaseContent`: pull real ICP from buyer before recording; credit creator share to `icpBalances`; check for duplicate purchase
- `main.mo` `likeVideo`: check `videoLikes` map before incrementing; record liker to prevent double-likes
- `oracle.mo` `registerChannel`: remove `case (null) {}` bypass — trap if admin is not set

### Remove
- Nothing removed

## Implementation Plan
1. `channel.mo`: restrict `recordPurchase` to hyveilTreasury; add follow rate-limiting with 1-hour cooldown
2. `main.mo`: add `icrc1_transfer` to ledger interface; fix `purchaseContent` with real payment + duplicate check + creator credit; add `withdrawEarnings`; add `hasPurchased` query; add likeVideo dedup
3. `oracle.mo`: fix `registerChannel` null bypass
4. Frontend: update purchase UI (approve step, already-purchased state), add withdraw earnings to creator dashboard
