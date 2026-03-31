# HYVEIL

## Current State
- Full ICP portal app with Internet Identity auth, wallet, privacy proxy, partner canister factory, and admin creator template preview page
- Backend: partner registry, video metadata, proxy outcalls, authorization mixin
- Partners can register, pay 0.5 ICP, deploy their own canister channel (permissionless)
- Admin-only `/admin/creator-template` page shows Instagram/Reels-like preview with video upload
- No revenue tracking or split logic exists yet
- No creator dashboard showing multi-channel management

## Requested Changes (Diff)

### Add
- **Revenue tracking** in backend: `ContentItem` type (id, partnerId, title, type, price in e8s), `PurchaseRecord` (buyer, contentId, amount, creatorShare, hyVeilShare, timestamp)
- **`purchaseContent(contentId)`** backend method: records payment, auto-splits 90% to creator's revenue ledger, 10% to HYVEIL treasury ledger (on-chain tracking)
- **`getPartnerRevenue(partnerId)`** — returns total earned, creator's 90% share, HYVEIL's 10% share for a specific partner
- **`getAllPartnersRevenue()`** — admin only, returns platform-wide revenue summary
- **`getMyChannelsRevenue()`** — returns revenue data for all channels owned by caller principal
- **`addContentItem(input)`** — partner owner adds a content item to their channel with price and monetization type
- **`getContentItems(partnerId)`** — returns content listings for a partner channel
- **`setMonetizationModel(partnerId, model)`** — toggle between #payPerView and #subscription per channel
- **Creator Dashboard page** (`/creator-dashboard`): full-page route accessible to any logged-in user who has deployed at least one channel
  - Header: "My Creator Channels" with total earnings summary card
  - Per-channel cards: canister ID, channel name, status, monetization model toggle, revenue breakdown (total / 90% yours / 10% platform)
  - "Manage Channel" button linking to `https://<canisterId>.icp0.io`
  - "Add Content" modal: title, description, price (ICP), type (pay-per-view / subscription)
  - Revenue chart (bar or line) showing earnings over time per channel
- **HYVEIL Admin Revenue Section** on main dashboard: platform-wide 10% commission total, number of active channels, top earning partners
- **Navigation entry**: "Creator" tab or link in main nav visible only to logged-in users with at least one channel

### Modify
- `PartnerRecord` — add `monetizationModel: {#payPerView; #subscription}` and `totalRevenue: Nat` fields
- Admin creator template preview page — add a "Monetization Settings" panel showing the revenue split (90/10), pricing input, and monetization toggle
- Main dashboard revenue widget — replace placeholder stats with real platform revenue from `getAllPartnersRevenue()`

### Remove
- Nothing removed

## Implementation Plan
1. Add `ContentItem`, `PurchaseRecord` types and storage maps to backend
2. Add `purchaseContent`, `addContentItem`, `getContentItems`, `getPartnerRevenue`, `getMyChannelsRevenue`, `getAllPartnersRevenue`, `setMonetizationModel` backend functions
3. Update `PartnerRecord` to include monetization model and revenue totals
4. Regenerate `backend.d.ts` bindings
5. Build `/creator-dashboard` React page with per-channel revenue cards, earnings summary, add-content modal, and monetization toggle
6. Add "Creator" nav entry (visible only when user has channels)
7. Update admin dashboard revenue section to show real platform 10% commission
8. Update admin creator template preview to show monetization settings panel
