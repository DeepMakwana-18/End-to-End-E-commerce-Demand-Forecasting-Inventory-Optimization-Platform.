# Titan AI v11 — Task 2: Risk Radar Investigation

## Changed
- **Risk Radar only** in the four-module product showcase: replaced passive chart + unsupported root-cause/automatic-transfer claims with a selectable three-event anomaly investigation.
- Three example events: day 08 (normal), day 14 (demand surge), day 23 (demand drop). Click or keyboard-arrow between them; the highlighted chart marker, finding, detection basis, next investigation step and shared module metrics update together.
- The demonstration uses a **60-unit/day illustrative baseline**, approximate 9 units/day reference standard deviation and a ±2σ sample threshold. Observations: 61 (near normal), 89 (approximately +48%, +3.2σ), 38 (approximately −37%, −2.4σ). These are sample-data explanations, not verified production-model outputs.
- Keeps Forecast, Inventory, Scenario Lab, navigation, comparison slider, Section 2, Section 5 and all other scenes unchanged.
- New CSS is scoped to `.risk-lab` / `#stage-visual[data-mode="risk"]`; no global style reset or framework conversion.

## Changed files
- `index.html`: swapped Risk Radar canvas and added v11 stylesheet.
- `script.js`: updated static risk copy and added event-selection behavior.
- `v11-risk.css`: new responsive design and animation with reduced-motion support.

## Integration
Open `index.html` using a local static server, go to **Explore intelligence → Risk Radar**, and select Day 08 / Day 14 / Day 23. Other module tabs remain available. No API calls or data mutations occur.

## Limitations
Demo results are illustrative and are not linked to actual Titan AI models or backend feeds. `/auth` remains the existing CTA path and must be integrated with the host application before deployment.

## Tests executed

- `node --check script.js` — passed.
- Chromium rendering/interaction at 1366×768, 1440×900, 768×1024 and 390×844 — passed.
- Risk Radar event selection, keyboard arrows, aria-pressed, chart state and shared footer summary — passed.
- Confirmed no horizontal overflow and no browser JavaScript errors at tested sizes.
- Regression checks: comparison slider, v10 chain-story controls, Forecast/Inventory/Scenario Lab switching, price scenario preset, v9 Decision Room stages — passed.
- Chromium reduced-motion regression pass — passed.

The container prevented browser navigation to a local file/server URL. To test the interface, a headless Chromium session loaded the same HTML and embedded its project CSS/JavaScript directly. Therefore **server hosting, deployment and Docker integration were not verified**.
