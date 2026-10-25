# Titan AI v13 — Task 4: The Action Brief (Section 5 Rebuild)

## Scope

Replaced Section 5 (`#in-practice`) from scratch in `index.html`. Fully discarded both the previous alert feed and the multi-step Decision Room sidebar (`Investigate → Evaluate → Prepare`). All other sections (Hero, v10 Chain Story, Comparison Wipe, Section 4 Intelligence Suite with Scenario Lab, Outcomes, FAQ, and Footer) remain untouched.

## Concept & Design

- **Concept:** "The Action Brief"
- **Headline:** *The next move. Made clearer.*
- **Visual Palette:** Deep midnight-navy cinematic atmosphere (`#08131a` to `#0d1e28`) with ambient emerald glows and a prominent forest-green accent (`#1b4332`, `#2ea069`, `#a9f27b`) for recommendations.
- **Unified Briefing Dossier:** Replaces the segmented sidebar console with an operational intelligence briefing card featuring clear telemetry, structured evidence, and an integrated visual decision path.

## Verified Parameters & Arithmetic

- **Target SKU:** `SKU-204` (Apex Sprint Footwear)
- **Available Inventory:** `660 units` on hand in primary fulfillment
- **Illustrative Daily Demand:** `60 units/day`
- **Stock Coverage:** `660 ÷ 60 = 11.0 days`
- **Supplier Lead Time:** `8 days`
- **Target Safety Buffer:** `5 days`
- **Review Threshold:** `8 + 5 = 13.0 days`
- **Condition:** Stock coverage (`11 days`) is below review threshold (`13 days`), creating a `2-day deficit` below safety target.
- **Displayed Conclusion:** `"Review replenishment now."`
- **Assurance & Disclaimers:** Explicitly states that no automated purchase order has been placed, sent, or saved; operator review is required; required order quantities are not arbitrarily invented, and batch assumptions (MOQs, order cycles) are explained in the transparent reasoning drawer.

## Lightweight Interactions

1. **"Why this recommendation?" (`#brief-why-toggle`):** Accessible disclosure toggle with `aria-expanded` and `aria-controls` revealing the step-by-step breakdown of coverage runway, threshold formula, deficit window, and planning assumptions.
2. **"See inventory intelligence" (`#brief-inventory-link`):** Directly navigates to Section 4 (`#product`) and invokes `selectModule('inventory')` to focus the verified Inventory module, with safe fallback to `#product` if scripts are disabled.

## Animation & Motion

- Progressive reveal: Stock coverage runway bar animates smoothly to 68.75% (11 of 16 days), threshold marker pins to 81.25% (13 of 16 days), and the -2d deficit gap highlights into place.
- Supports `prefers-reduced-motion` with instant, transitionless presentation.

## Files Modified & Created

- [`index.html`](file:///f:/Internship/landing/index.html): Section 5 rewritten with The Action Brief markup, `v13-brief.css` stylesheet linked, and script query param updated to `?v=v13_01`.
- [`v13-brief.css`](file:///f:/Internship/landing/v13-brief.css): Scoped, responsive styling for Section 5.
- [`script.js`](file:///f:/Internship/landing/script.js): Handlers for the reasoning drawer, module navigation, and progressive decision-path animation.
