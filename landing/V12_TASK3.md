# Titan AI v12 — Task 3: Scenario Lab Simulation Studio

## Scope

Built on the **Titan AI v11 Task 2** project. Replaced only the Scenario Lab view within Section 4; preserved existing Hero, v10 Section 2, comparison slider, Forecast, Inventory, v11 Risk Radar, Decision Room and remaining sections. Existing `index.html` route targets were not changed.

## What changed

- Replaced the static scenario presets and inconsistent hard-coded curves/outcome assertions with an interactive simulation workspace.
- Three distinct scenarios with an accessible range control and a coherent visual model:
  - **Promotion uplift** +5% to +35% demand (default +20%).
  - **Price decrease** 5% to 25% (default 15%), with an explicitly illustrative, simplified demand price elasticity of -1.0.
  - **Supplier delay** +1 to +14 days on top of an 8-day lead time (default +10), without changing demand; this mode switches the graph from weekly demand to projected inventory and makes the arrival-date difference visible.
- The shared scenario inputs are 60 baseline units/day, 660 units on hand, 8-day supplier lead time, 5-day desired safety buffer, and a separately disclosed illustrative inbound shipment of 780 units in the delay case.
- Demand scenarios: stock coverage = 660 / daily demand; planning coverage threshold = 8 + 5 = 13 days; gap to reach threshold = max(0, ceil(13 × daily demand − 660)). This figure is **not** a purchase order or inventory optimization algorithm.
- Delay scenario: current 11-day coverage, arrival on day (8 + delay), illustrative time gap = max(0, arrival day − 11), illustrative bridging stock = ceil(gap × 60). Inbound shipment shown as 780 units both on-time and delayed, and the chart never falsely reduces demand for a supply delay.
- Click preset or use keyboard-accessible range; updates graph, legends, labels, risk guidance and shared Section 4 summary. Per-scenario input values persist when switching presets.
- Explicit demonstration labels; no live sales data, order creation or backend calls.

## Files modified

- `index.html`: new Scenario Lab HTML and v12 stylesheet link; cache-bust JS reference.
- `script.js`: replaced legacy static scenario presets and event handlers with model-driven scenario controls and SVG chart calculation.
- `v12-scenario.css`: dedicated responsive and reduced-motion styles for the new studio.

## Verification

Run `node --check landing/script.js`. Open `landing/index.html` via a local static file server where permitted and navigate to Intelligence → Scenario Lab. Confirm default promo +20%; switching to price shows +15% modeled demand under stated elasticity; supplier delay +10 displays **0% demand change**, arrival **day 18** versus **11-day stock cover**, and **7-day / about 420-unit illustrative bridge gap**. Try keyboard arrows on the slider. Review at laptop, tablet and phone widths.

Note: Running the standalone landing page directly retains existing `/auth` CTA behavior, which requires actual host application routing at integration time. This is not a Docker/backend deployment package.
