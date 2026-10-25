# Titan AI v7 → v8: Section-by-section design + technical audit

### 1. Floating navigation
- **v7:** Six simultaneous nav targets competed for attention in a small header.
- **v8:** Four purposeful links: The story, How it works, Explore intelligence, In practice. `/auth` stays the CTA. Mobile navigation and keyboard Escape behavior remain intact.
- **Fix:** The navigation's dark styling now applies even after scrolling: the previous `.site-header.scrolled` light treatment could override the dark-scene appearance.

### 2. Hero — the first 100% viewport
- **v7:** Cinematic graph artwork was good, but proportion/typographic hierarchy and mid-height viewport behavior could be refined further.
- **v8:** Warm pearl/ivory environmental light, a much stronger editorial heading, subtle visual noise, clean typography, larger balanced signal sculpture and compact CTAs. The 3-step point of view is now explicit: Forecast · Detect · Decide. Demonstration content stays labeled.
- **Sizing:** Desktop hero uses actual viewport height; tablet/mobile flow naturally when space is constrained. A mobile 390 × 844 preview and desktop 1366 × 768 preview were tested without horizontal overflow.

### 3. The signal bridge
- **v7:** The four-step summary resembled another card group.
- **v8:** Compressed styling makes it a concise scene transition between warm hero and dark problem narrative.

### 4. The problem / timeline
- **v7:** A long 380vh scroll scene could feel excessive for a short landing page.
- **v8:** Reduced to 235vh on desktop, preserving meaningful scroll-scrubbed beats. Mobile shows all four beats in natural flow without a sticky trapping interaction. Demo numbers remain explicitly illustrative.

### 5. Raw data → intelligence comparison
- **v7:** Strong before/after demonstration, but took considerable visual height.
- **v8:** Same fully interactive slider, softer physical depth, tightened section spacing and clearer hierarchy. The widget is still keyboard-accessible through its native range input.

### 6. Interactive intelligence suite
- **v7:** The four chart modes changed automatically on a timer, potentially interrupting the visitor's reading.
- **v8:** **Manual-first.** Forecast, Inventory, Risk Radar and Scenario Lab change on intentional clicks or arrow-key navigation. Existing visualizations, scenarios, tab accessibility roles and metrics are preserved. A tiny-screen chart-tooltip collision is removed.

### 7. A day inside Titan
- **v7:** Button behavior resembled real execution rather than a showcase.
- **v8:** The experience explicitly says it is an interactive simulation that does not change real alerts. Acknowledge, Resolve and Replay still work.

### 8. Outcomes
- **v7:** Three dashboard-like columns made the lower page feel repetitive.
- **v8:** Kept as a compact orientation map of the wider system (including ETL, dashboard, ML pipeline and reporting), because these important features are not all shown in the four-module demo.

### 9. FAQ and final CTA
- **v7:** A conventional pale ending followed a pale FAQ.
- **v8:** More compact FAQ; a deep midnight cinematic finale now provides contrast and a memorable visual conclusion. Claims about the upload schema and demo are made more careful.

## Functional and visual QA

- JavaScript syntax checked (`node --check`): passed.
- Browser page JavaScript errors: none during desktop/mobile tests.
- Initial hero viewport fitting: 1366×768 and 390×844 — matched viewport height.
- Horizontal overflow at the above widths: none.
- Interactive tab switching: passed all four modes.
- Scenario preset activation: passed.
- Before/after native input: passed.
- Acknowledge → Replay: passed.
- Mobile menu open/close: passed.
- No model inference, real orders, backend calls or downloadable reports are implemented by this **landing-page-only** ZIP; these belong to the existing application.

## Known integration requirement

The original project is static HTML/CSS/JavaScript. `/auth` requires your actual app router or reverse-proxy configuration. If used inside a React/Vite route, adapt the markup rather than replacing the app entry point blindly. If serving via Docker, ensure the new `refinements.css` is copied into the frontend image and not omitted by a static-file pipeline.
