# HYVEIL

## Current State
The Privacy Layer tab (`activeTab === "proxy"`) currently contains:
1. A live proxy status bar
2. A grid of "proxy service" cards (IC-Netflix, IC-Social, IC-Reddit, IC-GitHub, IC-Medium) — these are the "installed links" with Activate/Deactivate buttons
3. A "Browsing History" panel (`proxyLog`) that shows past proxy requests with URL, status code, timestamp, source tag
4. A "Dub Agent" section with language/subtitle settings

The `proxyServices` state (`INITIAL_PROXY_SERVICES`) drives the installed-links grid. The `proxyLog` state drives the browsing history.

## Requested Changes (Diff)

### Add
- Proxy History panel as the primary, prominent content of the Privacy Layer section — expanded, polished, and the focal point of the page
- Enhanced empty state for the proxy history (when no entries yet)
- A URL/request detail row showing method, status code, timestamp, source badge, and body preview

### Modify
- The Proxy History section should be promoted to be the main content area (larger, full-width, no max-height truncation — or with a taller scrollable area)
- The live proxy status bar at the top can stay
- The Dub Agent section can stay

### Remove
- The entire "Proxy services" grid (the cards for IC-Netflix, IC-Social, IC-Reddit, IC-GitHub, IC-Medium)
- `INITIAL_PROXY_SERVICES` array and all code that references it: `proxyServices` state, `proxyLoadingId` state, `handleActivateProxy` function, the grid rendering block
- The `ProxyService` interface (if only used by the removed code)

## Implementation Plan
1. Remove `INITIAL_PROXY_SERVICES` constant and `ProxyService` interface
2. Remove `proxyServices`, `proxyLoadingId` state declarations
3. Remove `handleActivateProxy` callback
4. In the proxy tab JSX: delete the proxy services grid section entirely
5. Promote the Browsing History panel — remove `max-h-80`, increase height or use `max-h-[60vh]`, add richer styling to each entry
6. Keep the proxy status bar and Dub Agent sections intact
