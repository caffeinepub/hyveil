# HYVEIL

## Current State
- AdminCreatorTemplate page: Instagram/Reels-like full-page admin template preview with video upload, autoplay, likes, comments, monetization toggle.
- Creator tab (App.tsx): Accounting dashboard showing total earnings, HYVEIL commission, purchase count, and per-channel cards with revenue stats.
- No transaction history, followers, or channel performance metrics anywhere.

## Requested Changes (Diff)

### Add
- **AdminCreatorTemplate page** — Three new sections accessible via sub-tabs inside the page:
  1. `Transactions` tab: per-channel transaction history table (buyer principal, content title, amount paid, creator share 90%, HYVEIL share 10%, timestamp). Seeded with realistic mock data.
  2. `Followers` tab: follower list per channel — avatar placeholder, truncated principal, follow date, subscription status badge. Stats card at top showing total followers.
  3. `Performance` tab: channel performance metrics — views chart (bar), top content list ranked by views/revenue, engagement rate, average watch time cards.
- **Creator tab (App.tsx)** — Accounting dashboard enhancements:
  - Full transaction history table (all channels combined) with channel name column, pagination or scroll.
  - Channel list with canister ID, status, revenue per channel as rows.
  - Follower totals per channel in the channel card.

### Modify
- AdminCreatorTemplate: Add sub-tab navigation (Reels | Transactions | Followers | Performance) at the top of the page.
- Creator tab channel cards: Add follower count badge and link to channel performance.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `AdminCreatorTemplate.tsx`:
   - Add `activeSection` state: 'reels' | 'transactions' | 'followers' | 'performance'
   - Add sub-tab nav row at top (below header)
   - Add mock transaction data (10 entries), mock follower data (15 followers), mock performance data
   - Build Transactions section: table with columns (Buyer, Content, Amount, Creator Share, HYVEIL Cut, Time)
   - Build Followers section: stats card + follower list rows
   - Build Performance section: stats cards (views, followers, revenue, engagement) + top content table + simple bar chart using CSS
2. Update `App.tsx` Creator tab:
   - Add full transaction history table below channel cards (combined, all channels)
   - Add follower count to each channel card row
   - Make channel list more structured with a clear list view
