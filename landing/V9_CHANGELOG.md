# Titan AI v9 — Phase 1 Design Review

## Section 2 — Complete replacement
**Old:** Long pinned chart claiming an 8-day stockout was recovered; dense narrative copy and extended scroll distance.

**New:** “Every sale tells a story. Most businesses only see the numbers.”
- Interactive demand observatory with three explicit user-controlled states.
- Clear contrast between expected range and observed demand curve.
- Stage-aware supporting interpretation and telemetric labels.
- Purposeful animations, no forced pinned scrolling.
- Demo-only disclaimer and no unsupported performance promises.

## Section 5 — Complete replacement
**Old:** Alert feed that allowed demo acknowledge/resolve actions without an integrated reasoning narrative.

**New:** “From signal to decision.”
- Investigate: demand increase + supporting demand curve.
- Evaluate: stock cover and explicit reorder threshold calculation.
- Prepare: draft replenishment quantity with transparent post-delivery stock arithmetic.
- Functional next/reset buttons and local-only draft confirmation.
- No pretend live alert resolution, order transmission, or backend mutation.

## Preserved
The user liked parts of the hero, Forecast, Inventory, and other existing sections. Those remain as in v8 pending approval and subsequent focused enhancements.

## Before deploying
Check the host's actual route setup. `/auth` is a placeholder destination inherited from v8 and requires your app route. The ZIP does not start or modify Docker.
