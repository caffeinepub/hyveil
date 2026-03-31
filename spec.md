# HYVEIL – Partner Canister Architecture

## Current State
- Partners register via a form in the Partners tab; stored in frontend state only
- Partner content is displayed in the Content tab when a partner's status is "active" (requires manual approval)
- No canister concept per partner; all data lives in HYVEIL's main canister
- Registration requires approval before content appears

## Requested Changes (Diff)

### Add
- `canisterId` field on `PartnerApp` — generated automatically on registration (simulated ICP canister ID like `xxxxx-xxxxx-xxxxx-xxxxx-cai`)
- `walletBalance` and `walletAddress` fields on `PartnerApp` — built-in wallet per partner canister
- `walletTransactions` array on `PartnerApp` — earnings history per partner canister
- Partner Channel view — a detail page/panel for each partner showing their canister ID, content, wallet balance, and earnings
- Permissionless registration flow: upon form submission, partner is immediately assigned a canister ID and status becomes "active" (no approval gate)
- "My Channel" section in Partners tab for the registered partner to see their canister details, wallet balance, and content management
- Content tab shows ALL registered partner channels (since registration is permissionless)
- Each partner card in Content tab displays canister ID badge
- Wallet panel inside Partner Channel showing ICP balance, earnings, withdrawal simulation

### Modify
- `PartnerApp` type: add `canisterId`, `walletBalance`, `walletAddress`, `contentItems` fields
- Registration handler: generate canister ID on submit, auto-set status to `active`, no approval step
- Content tab: render all partners (not just active ones) once any partner exists; show canister badge on each channel
- Partners tab: show canister ID prominently in partner row/card; show wallet balance
- Remove "pending approval" language from registration; replace with "Your canister is being deployed…" then "Live" status

### Remove
- Manual approval step for partner registration
- "Partners must complete the partnership agreement before their content appears" placeholder copy

## Implementation Plan
1. Extend `PartnerApp` interface with `canisterId`, `walletBalance`, `walletAddress`, `contentItems`
2. Write `generateCanisterId()` utility that produces a realistic-looking ICP canister ID
3. Update registration handler: call `generateCanisterId()`, set `status: "active"`, initialize wallet balance
4. Add `PartnerChannelPanel` component: shows canister ID, channel info, content grid, and wallet panel
5. Content tab: show all partners (permissionless = all are live), add canister badge, link to channel panel
6. Partners tab: add canister ID column and wallet balance, update table/cards
7. Update empty state copy to reflect permissionless model
