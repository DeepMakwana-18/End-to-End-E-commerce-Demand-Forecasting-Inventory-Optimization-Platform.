# Titan AI Design System (design.md)

Design language of the Titan AI landing page, written so it can be applied to the product app (the "system" and main project pages).

**Status legend**
- `[set]` decided in our specs and visible on the live landing page.
- `[verify]` inferred from screenshots or a recommended default. Confirm against the code before treating it as final.

**Scope.** Sections 1 to 9 describe the visual language. Section 10 explains what to carry into the product app and what to leave on the marketing page. Section 11 has copy-ready tokens.

---

## 1. Brand and principles

**Product.** Titan AI turns scattered spreadsheets into one clear next move for supply-chain demand planning (forecast, inventory risk, scenarios).

**Personality.** Calm, precise, explainable. It shows its math, labels demo data honestly ("Illustrative demo"), and keeps the human in charge ("Planner decides").

**Visual idea.** A black-and-white editorial base, one blue for actions, one orange for emphasis. Emphasized cards are drawn with a hard offset shadow (a small neo-brutalist touch), so the page feels engineered, not glossy.

**Principles**
1. **One thing to look at.** Each view has one emphasized element (the answer, the recommendation, the active tab).
2. **Show the work.** Numbers come with units, formulas and sources.
3. **Quiet by default.** Motion and color are spent on the few moments that matter.
4. **Black means selected, blue means act, orange means look here.**
5. **Alternate light and dark.** Light surfaces for working and reading, dark surfaces for emphasis and contrast.

---

## 2. Color

### 2.1 Brand palette `[set]`

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0a0a0a` | Text on light, dark surfaces, active/selected state |
| `--paper` | `#fafaf9` | Page background (light) |
| `--white` | `#ffffff` | Cards on light, cards on black sections |
| `--blue` | `#1e3fc8` | Primary action (buttons, links, focus ring, slider fill) |
| `--orange` | `#f59e0b` | Accent: offset shadows, active bars, key numbers, markers |
| `--green` | `#16a34a` | Success / healthy / on track |
| `--slate` | `#64748b` | Neutral status (surplus), secondary series |

### 2.2 Surfaces and lines

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#fafaf9` | `#0a0a0a` | Page |
| `--surface` | `#ffffff` | `#111113` | Cards, panels |
| `--surface-2` | `#f6f6f7` | `#18181b` | Callouts, takeaway boxes `[verify]` |
| `--tile` | `#f1f1f3` | `rgba(255,255,255,.08)` | Icon tiles, chips background, hover |
| `--line` | `#e4e4e7` | `#27272a` | 1px borders and dividers |
| `--line-strong` | `#d4d4d8` | `rgba(255,255,255,.14)` | Inputs, outlined buttons |
| `--text` | `#0a0a0a` | `#fafaf9` | Primary text |
| `--muted` | `#52525b` | `#a1a1aa` | Secondary text |

### 2.3 Semantic and status colors

| State | Fill | Text | Notes |
|---|---|---|---|
| Success / on track | `#dcfce7` | `#166534` | Solid green fill needs `#15803d` with white text (see 2.5) |
| Warning / below target | `#fef3c7` | `#92400e` | Orange `#f59e0b` for bars and markers |
| Danger / late / no stock | `#fee2e2` | `#991b1b` | `[verify]` base red `#dc2626` |
| Info / selected | `#e0e7ff` | `#1e3a8a` | `[verify]` |
| Neutral / surplus | `#f1f1f3` | `#3f3f46` | Slate `#64748b` for bars |

One status function across the product: cover below 0.8x target = Below target (orange), 0.8x to 1.25x = On track (green), above 1.25x = Surplus (slate).

### 2.4 Special colors
- **Spreadsheet mock** `[set]`: cell `#e4e4e7`, highlighted cell `#a1a1aa`, error cell `#fde68a` with `#92400e` text.
- **Glass rim (marketing only)**: edge gradient `#f9a8d4` to `#e9d5ff` to `#93c5fd`; glow `#ec4899`, `#8b5cf6`, `#3b82f6`.
- **Nav glass**: light `rgba(255,255,255,.86)`, dark `rgba(18,18,20,.88)` with `1px rgba(255,255,255,.14)` border.

### 2.5 Usage rules and contrast
- Orange is never body text on white (about 2.2:1). Use it for shapes, bars, markers and on black (about 9:1). For text on amber tint use `#92400e`.
- White text on green needs `#15803d` (about 5:1). Plain `#16a34a` with small white text is about 3.3:1 and fails.
- Blue is reserved for actions and focus. White on `#1e3fc8` is about 8:1.
- `--muted` on paper is about 7.4:1; `#a1a1aa` on black is about 7.7:1.
- No gradients in the UI except the glass rim and aurora on the marketing page.

---

## 3. Typography

**Font.** Inter (variable if possible), weights 500, 600, 700, 800.
`font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;`
**Mono** (data, filenames, equations, step numbers): `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` `[verify]`.
All numbers in data use `font-variant-numeric: tabular-nums`.

### 3.1 Marketing scale

| Token | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| Display | `clamp(44px, 8vw, 92px)` / 1.02 | 800 | -0.03em | Hero only |
| H2 | `clamp(36px, 4.6vw, 64px)` / 1.05 | 800 | -0.025em | Section headings |
| H3 | 28px / 1.15 | 700 | -0.02em | Panel/card titles ("See demand ahead.") |
| H4 | 17px / 1.3 | 600 | 0 | Rail items, list titles |
| Body L | 17-18px / 1.55 | 500 | 0 | Section descriptions |
| Body | 16px / 1.55 | 500 | 0 | Default |
| Small | 14px / 1.45 | 500 | 0 | Subtitles, helper text |
| Caption | 13px / 1.4 | 500-600 | 0 | Metrics, footers |
| Eyebrow | 12px / 1.2 | 700 | .12-.14em, UPPERCASE | Section labels |
| Mono | 12-13px (equations 18px) | 500 | 0 | Cells, filenames, step numbers |
| Wordmark | 15px | 800 | .08em, UPPERCASE | "TITAN AI" |

**Eyebrow pattern.** A 24px by 1.5px orange line, 10px gap, then the label in `--muted` (for example "- HOW IT WORKS").

### 3.2 Rules
- Headlines are left-aligned except the hero and the final call to action (centered).
- Headline lines are written as two short declarative sentences ("One screen. One clear move.").
- Maximum line length about 62ch for paragraphs, 44ch for subtitles.
- No text below 12px. Body text never below 14px.

---

## 4. Layout, spacing, shape

**Spacing scale (8px base).** 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96, 112.

| Rule | Value |
|---|---|
| Container | `max-width: 1240px`, gutter `clamp(16px, 4vw, 48px)` |
| Section padding | 112px desktop, 72px mobile |
| Heading to content | 48-56px |
| Card gap | 20-24px |
| Intro stack (eyebrow, h2, description) | 16px, 20px |

**Breakpoints.** 640, 768, 1024 (tab rail switches from left column to a horizontal pill row), 1280, 1536.

**Radii.** Card 16-20px; large panel/emphasis card 20-24px; input and callout 12px; icon tile 10-12px; chips and buttons `999px`.

**Borders.** Standard `1px var(--line)`. Emphasis `1px var(--ink)`.

**Elevation**
- Emphasis card: `box-shadow: 8px 8px 0 var(--orange)` (small variant `4px 4px 0`). Border-box offset, no blur.
- Nav: `0 1px 2px rgba(0,0,0,.05)`.
- Frame on dark: `0 0 0 1px rgba(255,255,255,.08), 0 30px 80px rgba(0,0,0,.6)`.
- Modals: `0 24px 60px rgba(0,0,0,.18)` with scrim `rgba(10,10,10,.5)`.

**Page rhythm.** Sections alternate light and dark. Each boundary uses a shallow arc edge (a bowl 72px deep) with a faint pink to blue rim. Light sections may show faint vertical column lines (4-6% ink) behind content.

---

## 5. Components

### 5.1 Navigation pill
- Floating pill, 56px high (48px after 80px scroll), 16px from the top, `max-width: 1120px`, radius 999.
- Contents: orbit mark with wordmark, five links, primary button on the right.
- Active link: `--tile` background (dark: `rgba(255,255,255,.1)`) with a sliding indicator.
- Theme follows the section under the pill. Only colors transition (240ms). Blur only on the pill, never a full-width strip.

### 5.2 Buttons
| Type | Spec |
|---|---|
| Primary | `--blue` fill, white text 14-16px/600, pill, height 40 (nav) or 48 (hero) |
| Secondary | Transparent, `1px var(--line-strong)`, text `--text` |
| Glass (marketing CTA) | `rgba(30,63,200,.85)`, `backdrop-filter: blur(12px) saturate(140%)`, inset highlight `0 1px 0 rgba(255,255,255,.35)` |
| Icon | 40-44px circle, `--tile` fill |
- States: hover (fine pointers only) lifts 1px; `:active` presses `translateY(1px) scale(.98)`; focus-visible `2px` outline `--blue`, offset 2px. Minimum tap target 44px.

### 5.3 Segmented toggle and tabs
- Toggle: pill track `--tile`, active segment `--ink` with white text (the "Without Titan | With Titan" control).
- Tab rail (left on desktop): four white item cards with 1px border, 16px radius, 12px gap, filling the full height of the content card.
  - Item layout: number node on a 1px rail line, 36px icon tile, title 17px/600, subtitle 14px muted (2 lines max), metric chip 13px/600 at the bottom.
  - Active: `--ink` card, white text, 3px orange bar on the left (inset 14px), small orange offset shadow, mini preview, 2px progress bar along the bottom edge.

### 5.4 Cards
| Card | Spec |
|---|---|
| Standard | `--surface`, `1px var(--line)`, radius 16-20, padding 24-32 |
| Emphasis (the answer) | `--surface`, `1px var(--ink)`, radius 20-24, `8px 8px 0 var(--orange)` |
| Dark card (on black) | `#111113`, `1px rgba(255,255,255,.12)`, radius 16 |
| White card on black | `#fff`, no border, optional orange shadow when active |
| Callout / takeaway | `--surface-2`, radius 12, padding 16, 15px text with bold key numbers |
- Interaction (fine pointers): hover lifts 2px and moves the shadow; press settles 2px back in 80ms.

### 5.3b Chips and badges
- Status chip: height 28-32, radius 999, 13px/600, colors from 2.3.
- Badge: uppercase 11px/700, tracking .06em, radius 6px ("TITAN RECOMMENDS" on `#15803d` with white text).
- Time tag: amber chip `#fef3c7` with `#92400e` text ("Order by Thursday").
- Signal chip: pill with a green check icon (Sales, Inventory, Lead times, Supplier dates, Forecast).
- Eyebrow pill: outlined uppercase pill ("CONNECTED BY DESIGN").
- Filename chip: mono 12px, white fill, `1px var(--ink)`, radius 12, rotated 2-3 degrees, straddling a frame border.

### 5.4b Forms and controls
- Input: height 44px (40 compact), radius 12, `1px var(--line-strong)`; focus: border `--blue` plus `2px` focus ring. Labels 13px/600; helper text 13px muted; error text in danger color with an icon.
- Slider: 6px rounded track, filled part `--blue`; thumb 20-24px white with a blue border and soft shadow; hit area 44px. Value badge beside it. Before/after compare handle: 36px blue circle with a white double arrow.
- Stepper: minus/plus buttons, 40px minimum.
- Accordion row: 56px high, plus icon in a 32px gray circle that becomes black with a white x when open, 3px orange bar on the open row, height animation 220ms.

### 5.5 Tables and the sheet mock
- Data table: row 44px (36 compact), header 12px/600 on `--surface-2`, hover `#fafafa`, numeric columns right-aligned in tabular mono, 1px row dividers.
- Spreadsheet mock (marketing): mono cells `#e4e4e7`, highlighted `#a1a1aa`, errors yellow; column letters and row numbers in muted mono.

### 5.6 Charts
- Series colors: ink for actuals, blue for the selected or interactive series, orange for events/anomalies/peaks, slate `#a1a1aa` for secondary. Categorical palette if more are needed `[verify]`: `#0a0a0a, #1e3fc8, #f59e0b, #16a34a, #64748b`.
- Forecast = dashed ink line plus a light gray uncertainty band (`#f3f4f6`) with dashed edges. "Today" is a dashed vertical line with a small label.
- Markers: 8-12px dot with a soft orange ring. Tooltip: black pill, white 12px/600.
- Axis text 12px `--muted`, gridlines dashed 8% ink. One scale function drives gridlines, labels and data.
- Runway/timeline bars: 10-12px tall, green fill to the safe point, striped lighter segment for buffer, orange marker for the order landing, hatched red-orange for a no-stock gap.

### 5.7 Equation pattern
Three chips joined by operators (`[11 days of cover] - [8 days in transit] = [3 days to review]`). The result chip has an orange outline and a 12% orange fill. Numbers in mono.

### 5.8 Honesty and trust patterns
- Footer line under every demo: "Illustrative demo · SKU-4471 · Why illustrative?" (13px muted, link underlined on hover).
- "Planner review required" callout with a shield icon on any recommendation.
- No automated action without approval, and the copy says so.

### 5.9 Footer
Dark, single row: orbit mark and wordmark left, text links center (real links, 4.5:1 contrast), legal right.

---

## 6. Iconography and logo

**Icons.** Stroke icons (Lucide style), 16-20px, 1.5-1.75px stroke, `currentColor`. Shown in 36-40px rounded tiles (`--tile`). Examples: trending-up, package, shield-check, sliders, upload-cloud, bell, file-down, cpu.

**Orbit mark.** A core with three satellite rings on an orbit. Meaning: many signals merging into one decision. `currentColor`, so ink on light and white on dark.
```svg
<svg class="titan" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <g class="orbit">
    <circle class="track" cx="24" cy="24" r="17"/>  <!-- stroke 1.2, opacity .18 -->
    <!-- 3 satellites at -90, 30, 150 degrees: ring r=4, stroke 2.4, translateX(17) after rotate -->
  </g>
  <circle class="core" cx="24" cy="24" r="7"/>
</svg>
```
- Core radius 7, orbit radius 17, ring radius 4 with 2.4 stroke. At 24px and below: stroke 3.6, no track.
- Clear space: half the mark's width. Minimum size 16px. Favicon: static version.
- Wordmark: "TITAN AI", Inter 800, uppercase, tracking .08em, 10px gap to the mark.

---

## 7. Motion

**Language.** ORBIT (120-degree beats), ARC (curved edges), PRESS (orange offset shadow), GLASS (nav, final CTA, intro only).

| Token | Value |
|---|---|
| Durations | 120, 200, 320, 600, 900 ms |
| Ease out | `cubic-bezier(.22, 1, .36, 1)` |
| Ease in-out | `cubic-bezier(.65, 0, .35, 1)` |
| Press | 80ms |
| Reveal | at most 450ms, stagger at most 60-90ms |

**Rules**
- Animate only `transform` and `opacity`. The one exception is the SVG lens filter on the marketing CTA and intro.
- Hover effects only inside `@media (hover: hover) and (pointer: fine)`. Every hover has a touch `:active` equivalent.
- Section headings reveal once (masked slide-up 600ms). No entrance animation on cards or paragraphs.
- One autoplay at a time. Every autoplay has a Pause button, starts at 50% visible, pauses on hover/focus/off-screen, stops after the first interaction.
- Switching tabs: crossfade 200ms plus an 8px translateY. All panels share one grid cell so the height never changes; inactive panels are hidden and `inert`.
- Numbers count up (400ms), charts draw in (600ms) when their tab becomes active.
- `prefers-reduced-motion`: no scrubbing, parallax, lens, autoplay or count-ups. Final states with 150ms opacity fades.

**Marketing signature moments (do NOT copy to the app).** Page-load intro (merge, two spin beats, fly into the nav), arc section boundaries, liquid-glass transition into the final CTA.

**Spinner / loading (reusable in the app).** The orbit mark: `.spin` = 120 degrees per beat (1.4s, in-out, seamless thanks to 3-fold symmetry); `.load` = continuous turn 1.8s with the rings filling in sequence.

---

## 8. Accessibility and responsive
- Text contrast at least 4.5:1 (3:1 for large text). Visible focus on every control. Tap targets at least 44px.
- Tab rails use `role="tablist"`, roving tabindex, arrow keys. Results update via `aria-live="polite"`.
- Down to 1024px the tab rail sits on the left; below that it becomes a horizontal scroll-snap row of pills.
- Use `svh`/`dvh`, not `vh`. Respect `env(safe-area-inset-*)`. No layout shift on toggles (CLS under 0.05).

---

## 9. Voice and microcopy
- Short, declarative, outcome first: "Order 900 units within the 3-day review window."
- Always units and context with numbers: "11 days of cover", "+48% vs 60 expected".
- Honest labels: "Illustrative demo". Clear human control: "Planner decides", "Planner review required".
- No jargon without a plain-language partner ("Risk Radar: Spot unexpected demand changes").
- Buttons are verbs: "Book a demo", "Launch Titan AI", "Approve order", "See why".

---

## 10. Applying this to the product app (system and project pages)

### 10.1 What carries over
Tokens (color, type, spacing, radii), the card system, chips/badges, forms, tables, charts, status colors, honesty patterns, icon style, orbit mark, hover/press/focus behavior, and the numbered-rail pattern for multi-step flows.

### 10.2 What stays on the marketing page
Display-size headings, the intro, arc boundaries, liquid glass, auto-playing demos, aurora and aurora-like glows, scroll-driven scenes. In the app, motion is functional: press/hover, tab crossfade, loading, small count-ups.

### 10.3 App shell
- Default theme: light (`--bg` paper) with white surfaces. Dark mode via `data-theme="dark"` using the dark tokens. Do not alternate light and dark sections inside the app.
- **Sidebar** 264px (collapsed 72px): white surface, 1px right border. Item 44px, radius 12. Active item: `--ink` fill, white text, 3px orange bar on the left. Icons 20px in the same tile style.
- **Top bar**: the same floating pill style, 56px, with project switcher, search, and user menu. Primary action in `--blue`.
- **Page header**: eyebrow, then H1 32px/800 (-0.02em), description 15-16px muted, actions on the right. Content width up to 1280px; 12-column grid with 24px gaps; 40px between page sections.
- **Density**: comfortable by default (rows 44px), compact option (36px).

### 10.4 Component adaptation
- **Project/system cards**: standard card (1px line, radius 16-20). Only the single most important item on a screen (for example the current recommendation or running job) uses the emphasis card with the orange offset shadow.
- **Tables**: spec in 5.5. Row actions appear as icon buttons on hover or focus (always visible on touch).
- **Pipeline or multi-step screens** (upload, map columns, train, review, export): numbered rail with a progress line that fills orange, one active step in black, completed steps with a green check.
- **Stage status colors**: queued = neutral, running = blue, success = green, needs attention = orange, failed = danger red. Always an icon plus text, never color alone.
- **Forms and uploads**: dashed `1px var(--line-strong)` drop zone, radius 16, orbit mark in `load` mode while processing, file name chip in mono.
- **Charts**: rules in 5.6. Always show units, axis labels and an "Illustrative" or "Source" line where data is demo data.
- **Empty states**: orbit mark (48px), one sentence of what this area does, one primary action.
- **Loading**: top 2px blue progress bar for page transitions; skeleton blocks `--tile` with a 1.2s opacity pulse (no shimmer gradients); the orbit `spin` for button-level waits.
- **Toasts**: bottom-left, `--ink` surface, white text, radius 12, 4s; success has a green check. Destructive actions confirm in a modal (radius 24, scrim 50%).
- **Notifications and alerts**: callout pattern with an icon and the status colors from 2.3.

### 10.5 Dark mode notes
Use the dark column in 2.2. Cards are `#111113` with a 1px `rgba(255,255,255,.12)` border and no shadows; keep the orange offset shadow only for the emphasized card. Check contrast again (muted text `#a1a1aa` on `#0a0a0a` is about 7.7:1).

---

## 11. Tokens (copy-ready)

```css
:root {
  --ink:#0a0a0a; --paper:#fafaf9; --white:#fff;
  --blue:#1e3fc8; --orange:#f59e0b; --green:#16a34a; --green-solid:#15803d;
  --slate:#64748b; --red:#dc2626;

  --bg:#fafaf9; --surface:#fff; --surface-2:#f6f6f7; --tile:#f1f1f3;
  --line:#e4e4e7; --line-strong:#d4d4d8;
  --text:#0a0a0a; --muted:#52525b;

  --radius-sm:10px; --radius-md:12px; --radius-lg:16px; --radius-xl:24px; --radius-pill:999px;
  --shadow-emphasis:8px 8px 0 var(--orange); --shadow-emphasis-sm:4px 4px 0 var(--orange);

  --font-sans:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;

  --dur-1:120ms; --dur-2:200ms; --dur-3:320ms; --dur-4:600ms; --dur-5:900ms;
  --ease-out:cubic-bezier(.22,1,.36,1); --ease-io:cubic-bezier(.65,0,.35,1);

  --container:1240px; --gutter:clamp(16px,4vw,48px);
}
[data-theme="dark"] {
  --bg:#0a0a0a; --surface:#111113; --surface-2:#18181b; --tile:rgba(255,255,255,.08);
  --line:#27272a; --line-strong:rgba(255,255,255,.14);
  --text:#fafaf9; --muted:#a1a1aa;
}
:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }
body { font:500 16px/1.55 var(--font-sans); color:var(--text); background:var(--bg); }
```

**Component recipes**
```css
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:24px}
.card--emphasis{border-color:var(--ink);border-radius:var(--radius-xl);box-shadow:var(--shadow-emphasis)}
.btn{min-height:44px;padding:0 20px;border-radius:var(--radius-pill);font:600 14px var(--font-sans);border:1px solid transparent}
.btn--primary{background:var(--blue);color:#fff}
.btn--secondary{background:transparent;border-color:var(--line-strong);color:var(--text)}
.chip{display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:999px;font:600 13px var(--font-sans);background:var(--tile)}
.input{height:44px;padding:0 14px;border:1px solid var(--line-strong);border-radius:var(--radius-md);background:var(--surface);color:var(--text)}
.eyebrow{display:flex;align-items:center;gap:10px;font:700 12px/1.2 var(--font-sans);letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
.eyebrow::before{content:"";width:24px;height:1.5px;background:var(--orange)}
@media (hover:hover) and (pointer:fine){.card--interactive:hover{transform:translateY(-2px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition-duration:.01ms!important}}
```

**Tailwind mapping (if used)**
```js
theme: { extend: {
  colors: { ink:'#0a0a0a', paper:'#fafaf9', brand:'#1e3fc8', accent:'#f59e0b', ok:'#16a34a', slate:'#64748b' },
  fontFamily: { sans:['Inter','system-ui','sans-serif'], mono:['ui-monospace','SFMono-Regular','Menlo','monospace'] },
  borderRadius: { lg:'16px', xl:'24px' },
  boxShadow: { emphasis:'8px 8px 0 #f59e0b', 'emphasis-sm':'4px 4px 0 #f59e0b' },
  transitionTimingFunction: { out:'cubic-bezier(.22,1,.36,1)', io:'cubic-bezier(.65,0,.35,1)' }
}}
```

---

## 12. Do and don't

**Do**
- Use black for selected, blue for actions, orange for emphasis. One emphasized element per view.
- Pair every status color with an icon or text.
- Keep surfaces flat: 1px borders, no soft drop shadows (except nav, modals, and dark frames).
- Show units, formulas and sources next to every number.
- Reuse the orbit mark for loading and empty states.

**Don't**
- Don't use orange as text on white, or fill large areas with it.
- Don't use gradients, blurs or glass outside the nav and marketing moments.
- Don't animate size, shadow or blur on scroll. Transform and opacity only.
- Don't mix more than two saturated colors in one chart.
- Don't alternate light and dark sections inside the app.

---

## 13. Handoff checklist for the app
1. Install Inter, add the tokens (section 11), set `data-theme` on the root.
2. Build base components: button, input, card, chip/badge, table, tabs/rail, modal, toast.
3. Build the shell: sidebar, top bar pill, page header.
4. Restyle one real page end to end (a project/system page), then roll the system out.
5. Run the checks: contrast 4.5:1, focus visible on everything, 44px targets, reduced-motion, light and dark.
