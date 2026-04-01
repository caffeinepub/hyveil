# HYVEIL

## Current State

Partner registration uses a 3-step dialog: (1) fill in dApp info with name/website/description/chains, (2) pay 1 ICP fee, (3) deploy canister. There is no template category selection. The system deploys a single Reels/Instagram-like WASM template regardless. The Creator tab shows deployed channels. `newPartnerForm` holds `{ name, website, description, chains }` only.

## Requested Changes (Diff)

### Add
- **Template Category Picker step** — A new pre-step (step 0) that appears as a fullscreen popup/modal BEFORE the existing 3-step flow. The creator picks ONE template category before proceeding to fill in their dApp info.
- **7 Template Categories** with icons, names, short descriptions, and Live/Coming Soon badges:
  1. **Short Video / Reels** (Live) — Instagram/TikTok-style reels, pay-per-view short video
  2. **Podcast / Audio** (Coming Soon) — Episode listings, gated audio, show notes
  3. **Newsletter / Blog** (Coming Soon) — Long-form posts with free preview + paid full-read
  4. **Live Event / Ticketing** (Coming Soon) — Events schedule, ICP ticket purchase
  5. **NFT Gallery** (Coming Soon) — Digital art showcase, pay-per-download
  6. **Course / Education** (Coming Soon) — Module-based learning, paid course unlock
  7. **Community / Forum** (Coming Soon) — Gated discussion board, premium access tiers
- **Selected template stored** in `newPartnerForm` (add `templateType: string` field)
- **Template badge** shown on each channel card in My Channels list, Content tab, and success screen
- **"Add Another Channel" button** on Creator dashboard tab — opens the partner registration flow fresh
- Coming Soon templates show a disabled/grayed style; clicking shows a toast "Coming soon — only Short Video / Reels is available now"

### Modify
- `newPartnerForm` state: add `templateType: string` field (default `""`)
- Dialog reset: also reset `templateType` to `""`
- Partner registration dialog: add a new step 0 (category picker) before the existing steps 1-2-3. The step indicator updates to show 4 steps total (0 through 3), or keep as 1-3 and just insert a pre-step before the numbered flow starts.
- Channel cards (My Channels, Content tab, success screen): show the template type badge (e.g. "Reels", "Podcast")
- Creator tab: add "Add Another Channel" / "Deploy New Channel" button at the top

### Remove
- Nothing removed

## Implementation Plan

1. Add `templateType` to `newPartnerForm` state and reset
2. Add template category picker UI as initial view of the registration dialog (before step 1). Show 7 cards in a 2-column grid. Live = clickable violet. Coming Soon = grayed, click shows toast.
3. Wrap existing step 1-3 flow so it's only shown after a template is selected
4. Display selected template badge on channel cards across My Channels, Content tab, and success screen
5. Add "Deploy New Channel" button to Creator dashboard tab
