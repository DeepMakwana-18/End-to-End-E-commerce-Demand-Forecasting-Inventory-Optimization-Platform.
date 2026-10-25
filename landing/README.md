# Titan AI Landing Page — v11 Task 2

Standalone HTML/CSS/JavaScript landing-page project continuing from Titan AI v10.

## Changes in this release

**Section 4 / Risk Radar** is redesigned as an accessible, interactive signal-investigation demo. Choose Day 08 (normal), Day 14 (surge) or Day 23 (drop). The selected marker, supporting evidence, next step and shared summary numbers update together.

All existing scenes and the other three Intelligence Suite modes remain present.

Read **V11_TASK2.md** for implementation notes and limitations. `V10_PHASE1.md` retains the history of the earlier Section 2 redesign.

## How to preview

Extract the ZIP, open a terminal inside the `landing` directory, and run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`, scroll to **Explore intelligence** and select **Risk Radar**.

### File overview

- `index.html` — landing page content and UI structure
- `styles.css`, `refinements.css`, `v9-sections.css`, `v10-chain.css` — existing styles preserved
- `v11-risk.css` — new Risk Radar scoped styling
- `script.js` — shared page behaviors and new event-selector logic

### Integration note

The CTA `/auth` route remains the existing placeholder until this standalone page is integrated into the main Titan AI app. The example analytics do not contact live APIs or place orders.
