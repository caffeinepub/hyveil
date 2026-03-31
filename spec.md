# HYVEIL

## Current State
Partner registration deploys a channel canister and shows the canisterId on success. A "Manage My Channel" button opens `https://<canisterId>.raw.icp0.io`. My Channels panel shows truncated canister IDs.

## Requested Changes (Diff)

### Add
- Auto-generated channel URL (`https://<canisterId>.icp0.io`) displayed prominently on the success screen, labeled as "Your Channel URL (auto-generated)"
- Copy-to-clipboard button for the auto-generated URL
- "HYVEIL Template" badge/section in the success screen explaining that HYVEIL controls the template as the canister controller — partners populate content only within the fixed template
- In Step 3 (Ready to Deploy), add a callout: "Your channel URL will be auto-generated upon deployment. HYVEIL is the controller and dictates the channel template."
- In My Channels panel, show the full channel URL prominently with a copy button and a lock/template badge
- In Content tab channel cards, show the auto-generated URL and a "HYVEIL Template" badge

### Modify
- Success screen: add the auto-generated URL section above the canister ID block
- My Channels rows: replace truncated canisterId with a full clickable channel URL + template badge
- Step 3 confirm panel: add template control notice

### Remove
- Nothing removed

## Implementation Plan
1. In the success screen (regSuccess block), add prominent URL display with copy button and HYVEIL template lock notice
2. In Step 3 ready-to-deploy panel, add a callout about auto-generated URL and HYVEIL template control
3. In My Channels panel, show channel URL prominently with template badge
4. In Content tab approved partner cards, show channel URL and HYVEIL template badge
