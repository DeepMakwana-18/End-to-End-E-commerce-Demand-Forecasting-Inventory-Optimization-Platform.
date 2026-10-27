# Titan AI — v10 Phase 1: One change. A chain reaction.

## Scope

Started from the supplied `Titan-AI-landing-v9-phase1.zip`. Replaced **only Scene 02** (`#story`) per the agreed phased development plan. The other scenes remain based on v9 Phase 1.

## Why this is different from the rejected Scene 2

The previous `Invisible Signal` stage focused on detection patterns, overlapping with the Risk Radar mode. This version explains the **business relationship** between a change in demand, inventory coverage and supplier lead time. Section 3 still handles the separate "From spreadsheet to decision" comparison.

## Interaction

- Visitors see a sequence connecting **Demand → Inventory → Supply** when the stage enters the viewport.
- Each of the three visual columns can be clicked to inspect its explanation.
- **Replay the ripple** runs the progression again.
- `prefers-reduced-motion` skips the automatic animation but keeps the information and controls.
- The page retains normal scrolling; the section does not pin or hijack wheel events.

## Consistent illustrative example

- SKU-204, 660 units on hand.
- Demand rises from 45 to 60 units/day.
- Coverage changes from 660 / 45 = **14.67 days** to 660 / 60 = **11.0 days**.
- Supplier lead time = **8 days** and safety buffer = **5 days**, so illustrative review threshold = **13 days**.
- No backend calls, purchase orders, or claims of live forecasting are involved.

## Files

- `index.html` — replaced Scene 02 markup; added `v10-chain.css` stylesheet reference, updated script cache version.
- `script.js` — replaced obsolete Signal Observatory button logic with chain stage/replay logic; Decision Room and other scripts left intact.
- `v10-chain.css` — new fully scoped responsive design and motion for Scene 02.
- Existing `styles.css`, `refinements.css`, `v9-sections.css` retained (old Section 2 CSS is currently unused and can be removed during the future cleanup pass).

## Testing

- `node --check script.js` — passed.
- Chromium in-memory browser harness (HTML/CSS/JS inlined): section animation and manual stage changes, replay, no horizontal overflow or page errors verified at **1366×768, 1440×900, 390×844**. Scenario tab/preset and comparison slider also verified at those sizes. 1920×1080 passed the same tests.
- A basic browser check also verified the new section rendered without overflow at 768×1024; the extended full regression at this width was not completed due to test-harness timeout.
- Direct local URL and file URL navigation were blocked by the sandbox browser environment. In-memory rendering is not a production server integration test.
- Docker/auth/backend not tested or modified.

## Local use

1. Unzip this archive.
2. From the `landing/` folder, serve it using any static web server (for example `python -m http.server 8000`).
3. Open the page and click the **The story** navbar link or scroll to Section 2.
4. Check the three interactive stages and Replay control.
5. `Launch Titan AI` still points to `/auth` and must be integrated with your application host/router.

## Pending agreed tasks

Task 2: Rebuild Risk Radar; Task 3: Rebuild Scenario Lab; Task 4: Replace Decision Room with "The Action Brief"; Task 5: improve Section 3's white-looking cuts to subtle green; Task 6: refine hero and Sections 6–8; Task 7: complete QA.
