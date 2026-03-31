# HYVEIL

## Current State
Dashboard shows mock transaction history (INITIAL_TRANSACTIONS with 5 fake entries) and a mock REVENUE_TABLE with 7 fake entries. The first user to log in does not automatically become admin — admin assignment requires calling `_initializeAccessControlWithSecret` with the Caffeine admin token.

## Requested Changes (Diff)

### Add
- `claimOwnerIfFirst` backend function: if no admin has been assigned yet (`adminAssigned == false`), the caller is granted the admin role. Safe — only works once, and only if no admin exists.
- On login, frontend calls `claimOwnerIfFirst` automatically so the first user to log in becomes admin/owner.
- Dashboard shows an "Owner" badge next to the welcome message when `isAdmin` is true.

### Modify
- `INITIAL_TRANSACTIONS` → empty array (removes mock recent activity from dashboard)
- `REVENUE_TABLE` → empty array (removes mock revenue data from Revenue tab)
- Revenue tab stats and transaction list show empty/zero state when no real data exists.

### Remove
- All mock transaction entries from dashboard Recent Activity
- All mock revenue table rows

## Implementation Plan
1. Add `claimOwnerIfFirst` to `src/backend/main.mo` — check `adminAssigned`, if false assign caller as admin
2. Update backend.d.ts declarations to include the new function
3. In App.tsx: clear INITIAL_TRANSACTIONS to `[]`, clear REVENUE_TABLE to `[]`
4. In the login effect / `isLoggedIn` effect: call `actor.claimOwnerIfFirst()` then re-check `isCallerAdmin()`
5. Dashboard welcome section: show "Owner" badge when `isAdmin === true`
