# DESIGN.md — Apple Modern (Soft‑Raised System)

A reusable, project‑agnostic design system. Clean. Premium. Timeless.
Built on four core colors from the reference palette — **white `#F5F5F7`, black `#1D1D1F`, gray `#AAAAAA`, blue `#007AFF`** — rendered as soft, raised, capsule‑shaped surfaces with Apple‑style typography and motion.

**How to use this file:** copy it into each project, change only what §19 (Per‑Project Customization) allows, and build every screen from the tokens in §17. If a value isn't a token, it doesn't belong on screen.

**Table of contents**
0. Reference analysis & principles · 1. Color · 2. Typography · 3. Shape · 4. Spacing & Layout · 5. Elevation & Materials · 6. Motion · 7. Icons
8. Components (Buttons → Additional) · 9. Page Sections (Heroes → Announcements) · 10. Data (Charts, KPIs, Dashboards, Maps, Globes)
11. Backgrounds, Shaders & Effects · 12. Page Templates · 13. Hooks · 14. Responsive · 15. Accessibility · 16. Content Rules · 17. Drop‑in Tokens · 18. Dark Mode · 19. Customization · 20. Pre‑Ship Checklist

---

## 0. Reference Analysis & Principles

### 0.1 What was extracted from the reference image ("Apple Modern" palette card)

| Observed in the image | Rule it becomes |
|---|---|
| 4 swatches: `#F5F5F7`, `#1D1D1F`, `#AAAAAA`, `#007AFF`, each labeled with a bold 12px hex caption | The core palette (§1). Hex captions: 12px / 700 / tabular. |
| Tall **capsule** swatches — corner radius equals half the width, so they read as pills | Capsule/pill is the signature shape (§3). Buttons, badges, chips, search, docks, swatches are pills. |
| Every element looks **raised from the canvas**: white highlight top‑left, soft cool‑gray shadow bottom‑right | Soft‑raised elevation with a fixed top‑left light source (§5). |
| Blue capsule has a faint blue glow; black and gray capsules have glossy inner light on the left edge | Material recipes: Ink, Gray, Blue, Soft, Glass (§5.2). Tinted glow is allowed on **one** hero element only. |
| Small numbered circles (1–4) sitting inside the bottom of each capsule | Circular index chips (§8.20 Badges). |
| Giant two‑tone headline: **"Apple"** in heavy black, *"Modern"* below in lighter gray, same size, tight tracking | Two‑tone display heading (§2.3). |
| Small gray descriptive paragraph, ~40 characters per line | Sub‑headline / lede style (§2). |
| Top strip: short hairline rule + small tracked label on the left, `02 / 06` counter on the right | Header strip pattern (§9.12 Announcements & §8.34 Steppers). Use sparingly. |
| Tagline chip: logo + three stacked words ("Clean. Premium. Timeless.") in a large rounded raised card | Tagline card (§8.15 Cards). Short declarative fragments. |
| "Used by top companies" — a big rounded panel holding five raised tiles (logo over label + gray sub‑label) | Logo/feature tile strip (§9.5 Logo Cloud, §8.15 Cards). |
| CTA: pill with a **circular arrow button on the left**, bold title + muted subtitle | "Action pill" button (§8.1). |
| Footer: long hairline rule + right‑aligned handle | Footer meta row (§9.11). |
| Huge whitespace; one focal element (the capsule row) | One focal point per screen; everything else is quiet. |

### 0.2 What changed from the previous design system

| Area | Before | Now |
|---|---|---|
| Neutrals | Warm off‑white `#FAF9F7` | Cool Apple neutral `#F5F5F7` |
| Brand accent | Deep blue `#2C4A7C` + amber "intelligence" accent | Apple blue `#007AFF` family. **Amber removed as an accent**; orange is warning‑only. |
| Primary button | Black | **Still black (Ink).** Blue is the accent button. |
| Elevation | Border‑only cards, ≤1 raised element per screen | Soft‑raised (dual shadow) is the default surface language, with nesting limits (§5.3). |
| Radius | 10–32px | 8–36px plus capsule pills everywhere interactive |
| Motion | No parallax, no loops | Spring physics; scroll‑linked motion allowed on **hero product only**; loops limited to ambient backgrounds and marquees |
| Semantic colors | Muted green / amber / warm red | Apple system green / orange / red, each with an accessible "strong" and "text" variant |
| Kept | 4px grid, accessibility rules, content rules (never invent metrics), pre‑ship checklist | Same, extended |

### 0.3 Principles

1. **Clarity.** One focal element per screen. If two things compete, remove one.
2. **Deference.** The interface recedes; content is the color. ~90% of any screen is neutral.
3. **Depth over decoration.** Hierarchy comes from light, shadow and blur — not borders, gradients or ornaments.
4. **Physical motion.** Things have mass. Springs, not linear tweens. Every motion explains a change of state.
5. **Restraint.** Blue means "you can act here." Nothing else uses it.
6. **Quiet copy.** Short declarative sentences. Outcomes before features.
7. **Precision.** Optical alignment, tabular numerals, consistent radii, 4px grid.

---

## 1. Color

### 1.1 Core palette (from the reference)

| # | Token | Hex | Role |
|---|---|---|---|
| 1 | `--canvas` | `#F5F5F7` | Page background, soft‑surface base |
| 2 | `--ink` | `#1D1D1F` | Text, primary buttons, dark sections |
| 3 | `--gray-400` | `#AAAAAA` | Decorative gray: disabled, hairline accents, gray capsule, scrollbar |
| 4 | `--blue` | `#007AFF` | Brand blue: hero fills, focus ring, large graphics, selected states |

### 1.2 Neutrals (~85% of any screen)

| Token | Hex | Usage |
|---|---|---|
| `--canvas` | `#F5F5F7` | Page background |
| `--surface` | `#FFFFFF` | Solid cards, modals, popovers (when not soft‑raised) |
| `--surface-soft` | Gradient `#FFFFFF → #F5F5F7 → #ECECEF` at 145° | Soft‑raised elements (the default card/button surface) |
| `--surface-alt` | `#EDEDF0` | Alternating sections, table header |
| `--surface-sunken` | `#E8E8ED` | Wells: inputs, code blocks, dropzones, segmented tracks |
| `--hairline` | `rgba(29,29,31,0.08)` | Separators, card edges, nav bottom line |
| `--border-strong` | `#D2D2D7` | Hover borders, dividers on white |
| `--border-control` | `#86868B` | Form‑control borders (checkbox, radio, input) — 3.3:1 on canvas, meets WCAG 1.4.11 |
| `--gray-400` | `#AAAAAA` | Decorative only (2.1:1 on canvas — never text, never a lone icon) |
| `--gray-500` | `#86868B` | Resting icons, large gray text ≥24px (3.3:1) |

### 1.3 Text

| Token | Hex | Contrast on `#F5F5F7` | Usage |
|---|---|---|---|
| `--text-primary` | `#1D1D1F` | 15.5:1 | Headings, key values |
| `--text-secondary` | `#424245` | 9.2:1 | Body copy |
| `--text-muted` | `#6E6E73` | 4.7:1 (5.1:1 on white) | Helper text, labels, metadata, placeholders |
| `--text-disabled` | `#AAAAAA` | — | Disabled only (exempt from contrast) |
| `--text-inverse` | `#FFFFFF` | 16.8:1 on ink | Text on ink / blue / red fills |

### 1.4 Blue (the only interactive accent)

| Token | Hex | Contrast | Usage |
|---|---|---|---|
| `--blue` | `#007AFF` | 3.7:1 on canvas | Brand fills (capsules, hero), focus ring, slider fill, graphics ≥3:1. **Not for small text.** |
| `--blue-action` | `#0071E3` | 4.7:1 with white text | Filled buttons with text, selected checkbox/radio/toggle fill |
| `--blue-strong` | `#0058B8` | — | Hover/pressed on `--blue-action` |
| `--blue-text` | `#0066CC` | 5.1:1 on canvas, 5.6:1 on white | Links, text buttons, active tab label |
| `--blue-surface` | `#E5F0FF` | — | Selected rows/chips, info callouts, range‑selection band |
| `--blue-on-surface` | `#0A4FA8` | 6.8:1 on `#E5F0FF` | Text on blue‑surface |

### 1.5 Semantic colors (status only — never decorative)

Vivid Apple system colors are for **fills, dots, dark mode and large graphics**. On light backgrounds, icons/lines/text use the "strong"/"text" variants so they pass contrast.

| State | Vivid | Strong (icon/line on light) | Surface | Text on surface |
|---|---|---|---|---|
| Success | `#34C759` | `#248A3D` (4.0:1) | `#E3F6E8` | `#1E7B34` (4.7:1) |
| Info | `#007AFF` | `#0071E3` | `#E5F0FF` | `#0A4FA8` (6.8:1) |
| Warning | `#FF9500` | `#C25E00` (3.9:1) | `#FFF1DB` | `#9A5B00` (4.9:1) |
| Error | `#FF3B30` | `#D70015` (4.9:1) | `#FFE8E6` | `#C4271B` (4.9:1) |

Danger button fill is `#D70015` (white text 5.4:1). Do **not** put white text on `#FF3B30` (3.5:1).

### 1.6 Accent gradients (materials — see §5.2)

| Material | Gradient (160°) | Used for |
|---|---|---|
| Ink | `#3A3A3C → #1D1D1F 55% → #000000` | Black capsules, primary buttons (hero size), dark cards |
| Gray | `#C4C4C6 → #AAAAAA 55% → #8F8F92` | Gray capsule, tertiary tiles |
| Blue | `#4DA3FF → #007AFF 50% → #0060D6` | Hero accent capsule, one focal blue element |
| Soft | `#FFFFFF → #F5F5F7 55% → #ECECEF` (145°) | Default raised surface |

Gradients exist **only** as materials on shaped objects. Never as a section wash, text fill (except §2.4), or purple/pink blends.

### 1.7 Usage balance target

| Share | What |
|---|---|
| ~75% | Canvas + soft/white surfaces |
| ~12% | Alt/sunken surfaces, hairlines, gray |
| ~9% | Ink (text, primary buttons, dark section) |
| ~3% | Blue |
| ~1% | Semantic colors |

If blue appears in more than ~4 places in a viewport, remove some. One blue **filled** hero element per screen.

### 1.8 Chart series order (light)

1. `#007AFF` blue · 2. `#1D1D1F` ink · 3. `#248A3D` green · 4. `#C25E00` orange · 5. `#8944AB` purple.
All ≥3.9:1 on canvas. Always pair color with dash pattern, marker shape, or a direct label (§10.1).

---

## 2. Typography

### 2.1 Families

- **Sans (everything):** `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, sans-serif`. On Apple devices this renders SF Pro; elsewhere Inter (self‑host it, weights 400/500/600/700/800).
  SF Pro cannot be self‑hosted or shipped as a web font under Apple's license — rely on the system stack, never `@font-face` it.
- **Mono (code, IDs, hex codes in dense UI):** `"SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace`.
- Never a script, serif, or handwritten face. One family, weight contrast does the work.

### 2.2 Scale

| Role | Size (fluid) | Weight | Line height | Tracking | Color |
|---|---|---|---|---|---|
| Display XL | `clamp(56px, 9vw, 96px)` | 800 | 0.95 | −0.045em | `--text-primary` |
| Display | `clamp(44px, 6vw, 72px)` | 800 | 1.0 | −0.04em | `--text-primary` |
| H1 | `clamp(36px, 4vw, 56px)` | 700 | 1.05 | −0.03em | `--text-primary` |
| H2 | `clamp(28px, 3vw, 40px)` | 700 | 1.1 | −0.025em | `--text-primary` |
| H3 | 21–24px | 600 | 1.2 | −0.015em | `--text-primary` |
| H4 / card title | 17–19px | 600 | 1.25 | −0.01em | `--text-primary` |
| Lede (marketing) | 19–24px | 400 | 1.4 | −0.011em | `--text-muted` |
| Body (marketing) | 17px | 400 | 1.47 | −0.011em | `--text-secondary` |
| Body (app UI) | 15px | 400 | 1.5 | −0.006em | `--text-secondary` |
| Small / helper | 13px | 400 | 1.4 | 0 | `--text-muted` |
| Caption | 12px | 400 | 1.33 | 0 | `--text-muted` |
| Eyebrow (max 1 per section) | 12px | 500 | 1.2 | +0.08em, uppercase | `--text-muted` |
| Hex / data caption | 12px | 700 | 1.2 | 0, tabular | `--text-primary` |
| Hero metric | 56–96px | 700 | 1.0 | −0.04em, tabular | `--text-primary` |
| Button label | 15px (17px XL) | 600 | 1 | −0.006em | per variant |

Rule: **the bigger the type, the tighter the tracking.** At ≤13px tracking is 0 or slightly positive.
Max line length: 68 characters for body; 40 for ledes beside a hero (as in the reference).

### 2.3 Two‑tone heading (the reference's signature)

Two statements at identical size. The first is heavy and black; the second is lighter and gray.

```html
<h1 class="display two-tone">
  <span>Apple</span>
  <span>Modern</span>
</h1>
```
```css
.two-tone > span:first-child { color: var(--text-primary); font-weight: 800; }
.two-tone > span:last-child  { color: var(--gray-500);    font-weight: 500; display:block; }
```
- Use at Display sizes (≥44px) only — `--gray-500` is 3.3:1, which passes only for large text.
- The gray line is a **second thought**, not an emphasized word. Don't use it to highlight a single word mid‑sentence.

### 2.4 Text effects

| Effect | Spec | Rule |
|---|---|---|
| Silver gradient text | `linear-gradient(180deg,#1D1D1F 0%,#6E6E73 100%)`, `background-clip:text` | Display sizes only, once per page |
| Line reveal | Each line wrapped in `overflow:hidden`; inner span `translateY(105%)→0`, 700ms `--ease-out`, stagger 60ms | Hero headline only, runs once |
| Count‑up number | 1200ms `--ease-out-expo`, in view, once | §10.4 Numbers |
| Balanced wrapping | `text-wrap: balance` on headings, `text-wrap: pretty` on body | Always |
| Selection | `::selection { background:#B3D4FF; color:#1D1D1F }` | Global |
| Underline | Links: `text-underline-offset:0.18em; text-decoration-thickness:1px` | Always underline links inside paragraphs |

Global: `-webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; font-optical-sizing:auto; font-variant-numeric: tabular-nums` on any numeric UI.

---

## 3. Shape System

The more important and larger the element, the softer the corner. Interactive things are pills.

| Element | Radius |
|---|---|
| Hero panels, CTA panels, showcase cards | 36px (`--r-2xl`) |
| Feature cards, bento tiles, dialogs, large images | 28px (`--r-xl`) |
| Standard cards, panels, tables, popovers | 22px (`--r-lg`) |
| Inner tiles, list groups, alerts | 16–20px (`--r-md`) |
| Inputs, selects, textareas, code blocks | 12px (`--r-sm`) |
| Checkboxes, small chips' inner shapes | 7–8px (`--r-xs`) |
| Buttons, badges, tags, search bars, tabs, segmented controls, docks, toasts | **Pill (999px)** |
| Capsule swatches / tall pills | 999px (radius = half width) |
| Icon tiles | 40px tile → 12px radius · 56px tile → 16px · ≥80px → 22.37% of the side (the iOS app‑icon ratio) |
| Avatars, icon buttons | Full circle |

**Nesting rule:** inner radius = outer radius − padding (e.g. 36px panel with 16px padding → 20px inner tiles). This is what makes the reference's panel‑within‑panel feel concentric.

---

## 4. Spacing & Layout

**Base unit: 4px.** Allowed values: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160`.

| Context | Spacing |
|---|---|
| Inside a badge / chip | 6px 12px |
| Inside a button | 0 22px (height sets the rest) |
| Inside a card | 24px (feature card 32px, hero panel 40px) |
| Between tiles in a grid | 16px (20px ≥1024px) |
| Between sections (app) | 40–48px |
| Between sections (marketing) | 96–160px |
| Hero top padding | 96–160px below nav |

**Containers:** content `1200px`, wide/dashboard `1440px`, reading `680px`, forms `520px`, dialogs `440 / 560 / 720px`.
**Page gutters:** 24px mobile, 40px tablet, 64px desktop (or `max(24px, 5vw)`).
**Grid:** 12‑col desktop, 8‑col tablet, 4‑col mobile, 20px gutter.
**Alignment:** marketing headlines are **centered** (statement hero) or **left‑aligned** (capsule/split hero) — never mixed on one page. App UI is always left‑aligned; numbers right‑aligned.

---

## 5. Elevation & Materials (the Soft‑Raised System)

### 5.1 Light model

One fixed light source at **top‑left**. Raised objects get a white highlight on their upper‑left edge and a soft cool‑gray shadow on the lower‑right. Pressed/inset objects reverse it. Shadows are cool gray, **never black, never colored** (one exception: §5.2 Blue).

```css
:root {
  --hl: rgba(255,255,255,0.95);       /* highlight (light side) */
  --sd: rgba(174,174,192,0.32);       /* ambient shadow (dark side) */

  /* raised */
  --raise-1: -3px -3px 8px var(--hl),  3px  3px 10px var(--sd);   /* chips, icon buttons, tiles */
  --raise-2: -6px -6px 16px var(--hl), 8px  8px 20px var(--sd);   /* cards, buttons (default) */
  --raise-3: -10px -10px 28px var(--hl), 14px 14px 32px var(--sd);/* panels, hovered cards */
  --raise-4: -16px -16px 40px var(--hl), 24px 24px 56px rgba(150,150,170,0.36); /* hero focal element */

  /* pressed / wells */
  --inset-1: inset 2px 2px 5px var(--sd),  inset -2px -2px 5px var(--hl);   /* toggles, tracks */
  --inset-2: inset 4px 4px 10px var(--sd), inset -4px -4px 10px var(--hl);  /* inputs, wells */
  --press:   inset 3px 3px 8px var(--sd),  inset -3px -3px 8px var(--hl);   /* :active state */

  /* floating (real depth, for things that overlay content) */
  --float-1: 0 4px 12px rgba(29,29,31,0.08);     /* hover cards on white */
  --float-2: 0 12px 40px rgba(29,29,31,0.12);    /* popovers, dropdowns */
  --float-3: 0 24px 64px rgba(29,29,31,0.18);    /* dialogs, sheets */
}
```

### 5.2 Materials (recipes)

| Material | Recipe | Use |
|---|---|---|
| **Soft** (default) | `background: linear-gradient(145deg,#FFF 0%,#F5F5F7 55%,#ECECEF 100%); box-shadow: var(--raise-2);` | Cards, secondary buttons, tiles |
| **Glass** | `background: rgba(255,255,255,0.72); backdrop-filter: saturate(180%) blur(20px); border:1px solid rgba(255,255,255,0.6); box-shadow: var(--float-2);` | Navbars, popovers, docks, toasts, video controls |
| **Ink** | `background: linear-gradient(160deg,#3A3A3C,#1D1D1F 55%,#000); box-shadow: inset 1px 1px 2px rgba(255,255,255,.22), inset -2px -3px 6px rgba(0,0,0,.5), 0 18px 36px rgba(29,29,31,.28);` | Primary buttons (hero), black capsule, dark cards |
| **Gray** | `background: linear-gradient(160deg,#C4C4C6,#AAAAAA 55%,#8F8F92); box-shadow: inset 1px 1px 2px rgba(255,255,255,.4), inset -2px -3px 6px rgba(0,0,0,.18), 0 16px 32px rgba(29,29,31,.16);` | Gray capsule, tertiary hero tiles |
| **Blue** | `background: linear-gradient(160deg,#4DA3FF,#007AFF 50%,#0060D6); box-shadow: inset 2px 2px 4px rgba(255,255,255,.35), inset -3px -4px 8px rgba(0,50,140,.35), 0 18px 40px rgba(0,122,255,.32);` | The **one** focal blue element (hero capsule, main CTA at XL) |
| **Sunken** | `background: var(--surface-sunken); box-shadow: var(--inset-2);` | Inputs, dropzones, code blocks, segmented track |

**Capsule swatch (from the reference):**
```css
.capsule { width: 148px; height: 320px; border-radius: 999px; position: relative; }
.capsule--soft { background: linear-gradient(145deg,#fff,#F5F5F7 60%,#ECECEF); box-shadow: var(--raise-3); }
.capsule--ink  { /* Ink material */ }
.capsule--gray { /* Gray material */ }
.capsule--blue { /* Blue material */ }
.capsule__index { position:absolute; bottom:20px; left:50%; translate:-50% 0;
  width:32px; height:32px; border-radius:50%; display:grid; place-items:center;
  font:600 12px/1 var(--font-sans); color:#fff; background:rgba(255,255,255,.14);
  box-shadow: inset 1px 1px 2px rgba(255,255,255,.25), 0 2px 6px rgba(0,0,0,.2); }
.capsule--soft .capsule__index { color:var(--text-secondary); background:var(--canvas); box-shadow: var(--raise-1); }
.capsule + .caption { margin-top:16px; font:700 12px/1 var(--font-sans); font-variant-numeric:tabular-nums; text-align:center; }
```

### 5.3 Elevation rules

- **Nesting:** at most two raised levels (panel `raise-3` → tile `raise-1`). Never raise‑in‑raise‑in‑raise; inside a raised panel use sunken wells or hairlines.
- **Focal shadow:** `raise-4` and the Blue glow are reserved for **one element per viewport**.
- **Overlays** (menus, popovers, dialogs) use `float-*` shadows and Glass — not neumorphic pairs — so they clearly float above the raised layer.
- **Neumorphism has weak edges.** Every interactive raised element must also have: (a) a text label or icon at ≥3:1, (b) a visible `:focus-visible` ring, (c) a distinct pressed state. Form controls additionally get `--border-control`.
- **Hover:** shadow steps up one level (`raise-2 → raise-3`) and `translateY(-2px)` — only under `@media (hover:hover)`.
- **Pressed:** `--press` inset + `scale(0.97)`.

---

## 6. Motion (Apple‑style)

Motion is physical and short. Elements move like objects with mass, then settle.

### 6.1 Tokens

```css
:root {
  --ease-standard: cubic-bezier(0.28, 0.11, 0.32, 1);   /* apple.com default */
  --ease-out:      cubic-bezier(0.22, 1, 0.36, 1);      /* entrances */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);       /* hero, count‑up, reveals */
  --ease-sheet:    cubic-bezier(0.32, 0.72, 0, 1);      /* iOS sheets, dialogs, accordions */
  --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);      /* crossfades, shared layout */

  --dur-instant: 100ms;  /* press feedback */
  --dur-fast:    160ms;  /* hover, color, tooltip */
  --dur-base:    240ms;  /* menus, tabs, lift */
  --dur-slow:    400ms;  /* dialogs, sheets, accordions */
  --dur-xslow:   700ms;  /* reveals, charts */
  --dur-hero:   1000ms;  /* max for any single transition */
}
```

**Springs (Framer Motion / React Spring):**

| Name | Config | Use |
|---|---|---|
| `snappy` | `{ type:"spring", stiffness:400, damping:30 }` | Toggles, tab indicator, segmented thumb |
| `default` | `{ type:"spring", stiffness:260, damping:26 }` | Cards, menus, popovers, toasts |
| `gentle` | `{ type:"spring", stiffness:170, damping:26 }` | Sheets, sidebars, layout shifts |
| `bouncy` | `{ type:"spring", stiffness:300, damping:18 }` | Dock magnification, success check, drop‑target icon, selected map pin — **only these** |

### 6.2 Interaction table

| Interaction | Motion | Timing |
|---|---|---|
| Button press | `scale(0.97)` + inset shadow | 100ms `--ease-out` in, 240ms spring out |
| Hover (button, card) | lift `-2px`, shadow up one level | 240ms `--ease-standard` |
| Focus ring | Appears instantly; ring grows from 0→4px | 120ms |
| Link hover | Underline draws left→right | 200ms |
| Toggle | Thumb slides + stretches (27→33px while pressed) | `snappy` spring |
| Tab indicator / segmented thumb | Shared‑layout slide | `snappy` spring |
| Dropdown / menu | `scale(0.96) opacity 0` → `1`, origin at trigger | 180ms `--ease-out` |
| Tooltip | Opens after 500ms hover, fades 120ms; closes instantly | — |
| Popover | Same as dropdown + `translateY(4px)` | 200ms |
| Dialog | Overlay fades 240ms; panel `scale(0.96)→1` + fade | 300ms `--ease-sheet`; exit 200ms |
| Bottom sheet | `translateY(100%)→0`, drag to dismiss with velocity | `gentle` spring |
| Toast | Slides from top, `blur(4px)→0`, `scale(.96)→1` | `default` spring; exit 200ms |
| Accordion | Height auto‑animates, chevron rotates 90° | 320ms `--ease-sheet` |
| Page transition | Old fades out 150ms, new fades in + `translateY(8px)→0` | 250ms `--ease-out` |
| Nav on scroll | Transparent → Glass after 8px scroll; height 64→52 | 240ms |
| Scroll reveal | `opacity 0→1`, `translateY(16px)→0` | 700ms `--ease-out-expo`, **once**, stagger 60ms (max 600ms total) |
| Count‑up numbers | Digits roll | 1200ms `--ease-out-expo`, once |
| Chart draw‑in | Stroke/bars grow from baseline | 800ms `--ease-out`, once |
| Skeleton shimmer | Light gradient sweeps L→R | 1.6s linear loop |
| Marquee | `translateX(0 → -50%)` | 40s linear, pauses on hover |
| Ambient background drift | Blob positions / shader time | 24s linear / `u_time*0.05` |
| Hero product parallax | `translateY` ≤12% of scroll, `scale` 0.92→1 | scroll‑linked, hero only |

### 6.3 Rules

- Every animation explains a state change. Nothing decorative except the single hero sequence and one ambient background.
- **One orchestrated moment per page** (hero load sequence). Do not fade‑and‑slide every section; scroll reveals apply to bento/gallery groups only.
- No bouncing except the `bouncy` cases above. No particles, rotating 3D objects, auto‑advancing carousels, or infinite loops other than: skeleton shimmer, spinners, marquee, ambient background.
- Animate only `transform`, `opacity`, `filter`. Never `width/height/top/left` (except accordion height via `grid-template-rows: 0fr → 1fr`).
- Charts and count‑ups run **once** per page view, not on every re‑render.
- Use `will-change` only while animating.
- Hover effects only under `@media (hover:hover) and (pointer:fine)`.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .marquee-track, .shader-canvas, .parallax { animation: none !important; transform: none !important; }
}
```

---

## 7. Icons

- **Style:** outline, 1.75px stroke at 20px, round caps and joins, optical grid 24×24 — the SF Symbols look. Use **Lucide** or **Phosphor (regular)**. SF Symbols themselves are licensed for Apple platforms only.
- **Sizes:** 16 (inline/dense) · 20 (default) · 24 (nav, headings) · 32 (feature) · 40 (empty states).
- **Color:** `currentColor`. Resting `--gray-500` (3.3:1) or `--text-secondary`; active `--blue-text`; on ink `#fff`.
- **Icon tile:** 40×40, radius 12, Soft material with `raise-1`, icon 20px `--text-primary`. Active/selected variant: `--blue-surface` fill + `--blue-on-surface` icon, no raise.
- **App‑style tile (logos in the reference panel):** 56×56, radius 16, `raise-2`, monochrome logo in `--text-primary`; label 12/600 under it and a 11–12px muted sub‑label.
- **Icon button:** circle 36/40/44, Soft material, `raise-1`; **must** have `aria-label`.
- **Logos:** monochrome only (`#1D1D1F` or `#86868B`). Never invent partner logos.
- Don't use emoji as icons. Don't mix icon families. Icon + text: 8px gap; icon never carries meaning alone without a label or tooltip.

---

## 8. Components

Every component below lists: **anatomy → sizes → states → motion → accessibility**. States always include default, hover, focus‑visible, active/pressed, disabled; add loading/error/selected where relevant.

**Universal focus ring:** `outline: none; box-shadow: 0 0 0 2px var(--canvas), 0 0 0 4px var(--blue);` on every interactive element, on `:focus-visible` only. Minimum touch target 44×44px.

### 8.1 Buttons

| Variant | Fill | Text | Notes |
|---|---|---|---|
| **Primary (Ink)** | `#1D1D1F` (XL: Ink material) | `#fff` | Default primary CTA. Black, not blue — keeps it premium. |
| **Accent (Blue)** | `--blue-action #0071E3` (XL/hero: Blue material) | `#fff` | Use for the single focal action or in‑product primary. |
| **Soft (Secondary)** | Soft material, `raise-2` | `--text-primary` | Default secondary. Pressed → `--press`. |
| **Ghost** | transparent | `--blue-text` | Hover `rgba(0,113,227,.08)` |
| **Text link‑button** | none | `--blue-text` + chevron `›` | "Learn more ›" — chevron nudges 2px right on hover |
| **Inverse** | `#fff` | `--ink` | On ink/dark sections |
| **Danger** | `#D70015` | `#fff` | Destructive only, behind a confirm dialog |
| **Icon button** | Soft, circle, `raise-1` | icon | Needs `aria-label` |
| **Action pill** (reference) | Soft, `raise-2`, height 64–72 | title 13/600 + sub 12/400 muted | See below |

**Sizes:** sm 36px · md 44px (default) · lg 52px · xl 60px (hero, label 17px). All pills. Padding `0 22px` (sm `0 16px`). Icon gap 8px.

```css
.btn { height:44px; padding:0 22px; border-radius:999px; font:600 15px/1 var(--font-sans);
  letter-spacing:-0.006em; display:inline-flex; align-items:center; justify-content:center; gap:8px;
  border:0; cursor:pointer; transition: transform var(--dur-base) var(--ease-standard),
  box-shadow var(--dur-base) var(--ease-standard), background var(--dur-fast); }
.btn--primary { background:var(--ink); color:#fff; }
.btn--accent  { background:var(--blue-action); color:#fff; }
.btn--soft    { background:var(--surface-soft); color:var(--text-primary); box-shadow:var(--raise-2); }
@media (hover:hover) {
  .btn--soft:hover   { box-shadow:var(--raise-3); transform:translateY(-2px); }
  .btn--primary:hover{ background:#000; transform:translateY(-1px); }
  .btn--accent:hover { background:var(--blue-strong); }
}
.btn:active { transform:scale(0.97); transition-duration:var(--dur-instant); }
.btn--soft:active { box-shadow:var(--press); }
.btn[disabled] { background:var(--surface-sunken); color:var(--text-disabled); box-shadow:none; cursor:not-allowed; }
```

**Action pill (from the reference)** — circular arrow button on the left, two‑line label on the right:
```html
<a class="action-pill" href="#">
  <span class="action-pill__icon" aria-hidden="true">→</span>
  <span><strong>Save this palette</strong><small>Use it in your next design.</small></span>
</a>
```
```css
.action-pill { display:inline-flex; align-items:center; gap:14px; height:68px; padding:10px 28px 10px 10px;
  border-radius:999px; background:var(--surface-soft); box-shadow:var(--raise-2); }
.action-pill__icon { width:48px; height:48px; border-radius:50%; display:grid; place-items:center;
  background:var(--canvas); box-shadow:var(--raise-1); transition: all var(--dur-base) var(--ease-standard); }
.action-pill strong { display:block; font:600 13px/1.2 var(--font-sans); color:var(--text-primary); }
.action-pill small  { font:400 12px/1.3 var(--font-sans); color:var(--text-muted); }
.action-pill:hover .action-pill__icon { background:var(--ink); color:#fff; transform:translateX(2px); }
```

**States:** loading = label replaced by a 16px spinner, width locked (no layout shift), `aria-busy="true"`. Button groups: 12px gap; primary on the right in dialogs, full‑width stacked on mobile.
**Rules:** one Primary/Accent per view section. Copy is verb + object ("Save changes", not "Submit"). A `<button>` for actions, `<a>` for navigation.

### 8.2 Links

- Color `--blue-text` (`#0066CC`, 5.1:1). Inside paragraphs: always underlined (1px, offset 0.18em) so color is not the only cue.
- Standalone/nav links: no underline at rest, underline on hover/focus.
- Chevron links ("Learn more ›"): `›` in same color, hover shifts 2px right.
- External: trailing `↗` icon 14px + `rel="noopener"`; `aria-label` appends "(opens in new tab)".
- Visited: no change (Apple doesn't recolor). Disabled links aren't links — use text.
- Nav link hover: opacity `0.88 → 1`, never a color jump.

### 8.3 Inputs

- **Height** 44px (lg 52px), radius 12px, padding `0 14px`, text 15px `--text-primary`, placeholder `--text-muted`.
- **Rest:** `background: var(--surface-sunken); box-shadow: var(--inset-1); border: 1px solid var(--border-control);`
- **Hover:** border `--text-muted`. **Focus:** border `--blue` + focus ring (§8 intro). **Filled:** unchanged. **Error:** border `--red-strong`, ring red, message below with icon. **Disabled:** `opacity:.5`, `cursor:not-allowed`.
- **Label:** above, 13px/600 `--text-primary`. **Helper:** 13px `--text-muted`. **Error:** 13px `--red-text` prefixed by a 16px alert icon (never color alone).
- **Affordances:** leading icon 18px `--gray-500`; trailing clear button (circle 24px) appears when filled; password toggle "Show/Hide" text button; prefix/suffix add‑ons (`$`, `.com`) in a sunken segment.
- **Floating‑label variant** (optional): label sits inside at 15px, lifts to 12px/500 on focus/filled, 160ms `--ease-standard`.
- **A11y:** every input has a real `<label for>`; helper/error linked via `aria-describedby`; `aria-invalid="true"` on error; correct `type`, `inputmode`, `autocomplete`.
- **Other inputs:** OTP (6 boxes 48×56, radius 14, `inputmode="numeric" autocomplete="one-time-code"`, paste splits across boxes, auto‑advance); number stepper (− / + circle buttons 36px flanking a tabular value); password with 4‑segment strength meter (pill segments 4px, red→orange→blue→green); color input (36px circle swatch + hex field).

### 8.4 Text Areas

- Same as Input but min‑height 112px, radius 16px, padding 14px, `line-height:1.5`, vertical resize only (`resize:vertical`) or auto‑grow up to 8 rows.
- Character counter bottom‑right, 12px tabular `--text-muted`; turns `--orange-text` at 90%, `--red-text` at 100%. Announce limits via `aria-describedby`, not on every keystroke.
- Rich‑text/composer variant: sunken well with a bottom toolbar of 36px icon buttons and a right‑aligned Ink send button (icon only, `aria-label="Send"`).

### 8.5 Selects & Comboboxes

- **Trigger:** identical to Input; trailing chevron‑up‑down icon 16px `--gray-500`. Value 15px; placeholder muted.
- **Menu:** Glass panel, radius 16, `float-2`, padding 6, max‑height 320 with scroll, min‑width = trigger. Options 40px tall (44 on touch), radius 10, padding `0 12px`. Highlighted option: `--blue-action` fill + white text (macOS behavior). Selected option shows a leading ✓ (16px).
- **Combobox/autocomplete:** input filters the list; matching substring in 600 weight; "No results" row; async loading shows an inline spinner; `role="combobox"` + `aria-expanded/controls/activedescendant`.
- **Multi‑select:** selected values as removable Tag chips inside the field; overflow collapses to "+3".
- **Native `<select>`** on mobile (better UX) unless heavy customization is needed.
- **Keyboard:** ↑/↓ move, Enter/Space select, Esc close, type‑ahead jumps, Home/End.

### 8.6 Checkboxes

- **Box:** 22×22, radius 7. Unchecked: `--surface-sunken`, `1.5px solid var(--border-control)`, `--inset-1`. Checked: `--blue-action` fill, white check (2px stroke). Indeterminate: white dash.
- **Motion:** check path draws via `stroke-dashoffset` 200ms `--ease-out`; box scales `0.9→1` `snappy`.
- **Hit area** 44×44 via padding/label; label 15px `--text-secondary`, 10px gap; description under label 13px muted.
- **Card checkbox** (option tiles): whole card is the target; selected → `--blue-surface` bg + 2px `--blue` ring + ✓ badge top‑right.
- **A11y:** native `<input type=checkbox>` visually restyled (not `div`s); group in `<fieldset><legend>`; error state applies to the group.

### 8.7 Radio Groups

- **Circle** 22px. Unchecked: `1.5px solid var(--border-control)` + `--inset-1`. Checked: `--blue-action` fill + 8px white inner dot (scale 0→1, `snappy`).
- **Vertical stack** by default, 12px gap; horizontal only for ≤3 short options. Option‑card variant same as card checkbox. Segmented control (§8.19) for 2–4 mutually exclusive *view* options.
- **Keyboard:** group is one tab stop; ←/→/↑/↓ move and select; native `<input type=radio name>` + `<fieldset><legend>`.

### 8.8 Toggles

- **iOS switch:** track **51×31** pill, thumb **27** circle (white, shadow `0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.16)`), 2px inset. Off track `#E9E9EB` + `inset 0 0 0 1px var(--border-control)` (so it meets 3:1); On track `--blue-action`. Success‑semantic toggles (e.g., "Online") may use `--green`.
- **Motion:** thumb translates 20px; while pressed thumb widens 27→33px; `snappy` spring; track color 200ms.
- **Label** on the left (15px), switch on the right, whole row is the target. Row separated by hairline in settings lists.
- **A11y:** `role="switch"` + `aria-checked`, `<label>` linked; state also readable as text ("On"/"Off") in dense settings.

```css
.switch { width:51px; height:31px; border-radius:999px; background:#E9E9EB; box-shadow:inset 0 0 0 1px var(--border-control);
  position:relative; transition:background 200ms var(--ease-standard); }
.switch::after { content:""; position:absolute; top:2px; left:2px; width:27px; height:27px; border-radius:50%;
  background:#fff; box-shadow:0 3px 8px rgba(0,0,0,.15),0 1px 1px rgba(0,0,0,.16);
  transition:transform 300ms var(--ease-sheet), width 200ms var(--ease-sheet); }
.switch[aria-checked="true"] { background:var(--blue-action); box-shadow:none; }
.switch[aria-checked="true"]::after { transform:translateX(20px); }
.switch:active::after { width:33px; }
.switch[aria-checked="true"]:active::after { transform:translateX(14px); }
```

### 8.9 Sliders

- **Track** 6px pill, `--surface-sunken` + `--inset-1`. **Fill** `--blue` (or `--ink` for neutral controls). **Thumb** 28px white circle, `raise-2`, no border; grows to 32px while dragging.
- **Value bubble:** Glass pill above thumb while dragging/focused; 13/600 tabular.
- **Range slider:** two thumbs; fill between; thumbs can't cross (min 1 step gap).
- **Steps:** tick marks 2px `--border-strong` under the track; labels 12px muted at ends.
- **Keyboard:** ←/→ ±1 step, PgUp/PgDn ±10%, Home/End. `role="slider"` + `aria-valuemin/max/now/valuetext`. Visible `<label>` + `<output>`.
- Touch target: thumb has 44px invisible hit area.

### 8.10 Date Pickers

- **Field:** Input with trailing calendar icon; accepts typed dates (`DD/MM/YYYY` or locale format) — the calendar is an enhancement, not the only path.
- **Popover:** Glass panel, radius 22, padding 16, width 320; contains Calendar (§8.11) + optional presets column ("Today", "Tomorrow", "Next week", "Last 30 days") as Soft pill buttons.
- **Range picker:** two months side‑by‑side ≥768px, one on mobile; footer with "Clear" (ghost) and "Apply" (ink).
- **Time picker:** iOS‑style drum wheels — 3 columns (hour, minute, AM/PM), 44px rows, scroll‑snap, center highlight = sunken capsule 40px tall; or two Inputs with steppers on desktop.
- **Mobile:** open as a bottom sheet (§8.26) with native `<input type="date">` as fallback.

### 8.11 Calendars

- **Header:** month + year 15/600 with prev/next icon buttons (36px circles); clicking month/year opens a month/year grid.
- **Grid:** 7 columns, cells 40×40 circles; weekday labels 12/500 muted; week starts per locale.
- **Cell states:** default `--text-primary`; hover `--surface-soft` + `raise-1`; **today** 1.5px `--blue` ring; **selected** `--blue-action` fill + white text; **in range** `--blue-surface` band with fully rounded ends; **outside month** `--text-disabled`; **disabled/unavailable** `--text-disabled` + line‑through for booked days; **has event** 4px dot below the number (`--blue`).
- **Motion:** month change slides content 24px with 240ms `--ease-standard`, header text crossfades.
- **Keyboard:** arrows move day, PgUp/PgDn month, Shift+PgUp/PgDn year, Home/End week start/end, Enter select. `role="grid"`, `aria-label="Month, year"`, `aria-selected`, cells labeled with full date.
- **Full calendar (agenda) view:** month grid with 96px+ rows, events as 22px pill chips (`--blue-surface`/`--blue-on-surface`), "+2 more" link, week/day views with 1px hairline hour lines and a red now‑line (`--red`).

### 8.12 Search Bars & Command Palette

- **Search bar:** pill, height 44 (52 hero), sunken inset field, leading magnifier 18px `--gray-500`, placeholder "Search" muted, trailing clear circle (appears when filled) and optional `⌘K` keycap (`kbd` 12px, radius 6, `raise-1`).
- **Expanding nav search:** 40px icon circle → 320px field, 300ms `--ease-sheet`, focus auto‑set.
- **Results panel:** Glass, radius 20, groups labeled 12/600 muted ("Top hit", "Pages", "Actions"); rows 44px; active row `--blue-action` fill + white text; matching text 600 weight; recent searches with clock icon and remove ×; empty state shows "No results for '…'" + suggestions.
- **Command palette (⌘K):** Dialog 640px, Glass 80%, radius 24, input 56px/17px with no border, footer with key hints; results virtualized; `role="combobox"` + `listbox`; closes on Esc; restores focus.
- Debounce 150ms; announce result count via `aria-live="polite"`.

### 8.13 File Uploads

- **Dropzone:** Sunken, `1.5px dashed var(--gray-400)`, radius 24, min‑height 200, centered 40px icon tile → 15/600 "Drop files here or **browse**" → 13px muted "PNG, JPG or PDF · up to 10 MB". It is a real `<button>`/`<label>` wrapping `<input type=file>`.
- **Drag‑over:** background `--blue-surface`, border `2px solid var(--blue)`, `scale(1.01)`, icon bounces once (`bouncy`).
- **File row:** 56px, type tile 40px (squircle), name 14/600 truncated middle, size 12 muted; progress bar 4px `--blue` under the row; trailing × circle button.
- **States:** uploading (progress + cancel) → done (green ✓, `--green-text`) → error (red icon, message, "Retry" text button). Never lose the file on error.
- **Image uploads:** thumbnail 56px radius 12 with remove; avatar upload = circular crop dialog with zoom slider.
- **A11y:** progress via `role="progressbar"`, results via `aria-live="polite"`; keyboard operable (Enter/Space on dropzone).

### 8.14 Forms

- **Layout:** single column, container 520px; label above field; field gap 20px; group gap 32px; section title H3 + muted description; two columns only for short paired fields (first/last name, city/postcode) ≥640px.
- **Validation:** validate on blur and on submit, never on first keystroke; after first error, validate live. Error summary at top for long forms (`role="alert"`, links to fields). Keep entered data on error.
- **Required:** mark optional fields "(optional)" rather than starring required ones; if starring, explain "* Required".
- **Submit:** Ink pill button, disabled only while submitting (never for "invalid" — let validation explain). Sticky bottom bar on mobile (Glass, safe‑area padding).
- **Success:** inline confirmation or toast that reuses the button's verb ("Saved").
- **Autocomplete/autofill:** always set `autocomplete` tokens; support paste and password managers.
- **Multi‑step:** use Stepper (§8.34), save progress, allow back without data loss.
- **Sign‑in form:** Soft card 440px centered; email → password; "Continue with Apple / Google" as Soft buttons; links 13px; no CAPTCHAs unless required.

### 8.15 Cards

| Variant | Radius | Padding | Surface | Elevation | Use |
|---|---|---|---|---|---|
| **Standard** | 22 | 24 | Soft | `raise-2` | Default content card |
| **Feature** | 28 | 32 | Soft | `raise-2` → hover `raise-3` | Feature blurbs: icon tile + H3 + text + link |
| **Panel / Showcase** | 36 | 40 | Soft | `raise-3` | Big container that holds tiles (the "Used by top companies" panel) |
| **Tile** (inner) | 20 | 16 | Soft | `raise-1` | Icon/logo over label + sublabel, inside a panel |
| **Well** | 20 | 20 | Sunken | `inset-2` | Code, data, embedded previews |
| **Glass** | 28 | 24 | Glass | `float-2` | Over imagery or gradients |
| **Ink** | 28–36 | 32 | Ink | Ink shadow | One dark card per page for rhythm |
| **Tagline** (reference) | 32 | 28 | Soft | `raise-3` | Logo + 3 stacked short words ("Clean. Premium. Timeless.") 13px muted, logo 56px |
| **Product** | 28 | 0 (image bleeds) | Soft | `raise-2` | Image 4:3 top, 24px padded text below |
| **Stat** | 22 | 24 | Soft | `raise-2` | §10.2 |

**Interactive card:** whole card is one link/button (stretched link), hover lifts 2px + shadow step (240ms), `:active` scale 0.99, focus ring on the card. Non‑interactive cards get no hover effect.
**Panel tile grid (reference):** 5 tiles across in a panel with 16px gap; tile 56px logo tile → label 12/600 → sub‑label 11–12px muted; header row inside panel: left label 12px muted uppercase‑free ("Used by top companies"), right‑aligned 12px muted note.
**Card copy:** one H3/H4, one short paragraph (≤2 lines), one link. Nothing else.

### 8.16 Tables

- **Container:** Card radius 22, `overflow:hidden`, `raise-2`; header row `--surface-alt`, 12/600 `--text-muted` labels (sentence case; uppercase optional), 44px tall.
- **Rows:** 52px (compact 40, spacious 64) with `1px solid var(--hairline)` between. Hover: `rgba(29,29,31,.03)` background. Selected: `--blue-surface`.
- **Numbers:** right‑aligned, `tabular-nums`; text left‑aligned; header alignment matches column.
- **Sort:** header is a button with arrow icon (12px) and `aria-sort`; active column label `--text-primary`.
- **Selection:** first column 22px checkbox; header checkbox is tri‑state; bulk‑action bar slides in (Glass pill, `default` spring) with count "3 selected".
- **Row actions:** ellipsis icon button (visible on hover/focus, always visible on touch).
- **Sticky header:** Glass background; first column sticky on horizontal scroll with right‑edge shadow.
- **Status cells:** Badge (§8.20). Avatars 28px. Money/units with muted unit.
- **Density toggle:** segmented control (Compact / Comfortable / Spacious).
- **Mobile:** each row becomes a stacked key‑value Card; no horizontal scroll for primary data.
- **A11y:** real `<table>`, `<th scope>`, `<caption>` (visually hidden ok); empty and loading states inside the table body.

### 8.17 Lists

- **Grouped list (iOS Settings look):** container radius 16, Soft/white; rows min‑height 52px, padding `12px 16px`; leading icon tile 30×30 radius 8 (solid palette color with white glyph — blue, green, orange, gray, ink only); title 15px; trailing detail 15px `--text-muted` + chevron `›` (12px `--gray-400`).
- **Separators:** `1px hairline`, inset to align with the title (not under the icon); none after the last row.
- **Selected row:** `--blue-surface` bg. **Pressed:** `rgba(29,29,31,.06)`.
- **Variants:** plain list (no container), description list (label left muted / value right), checklist (circle → ✓), sortable list (drag handle `⋮⋮` on the left, lifted row `float-2` + `scale(1.02)`), media list (56px thumbnail radius 14 + 2 lines), message list (avatar + preview + time).
- **Mobile:** swipe‑left reveals actions (Soft/red pills, 72px each).
- **A11y:** `<ul>/<li>` or `role="list"`; interactive rows are `<a>`/`<button>` full‑width.

### 8.18 Accordions

- **Item:** 56px header (17px/600 or 15px/600), chevron 16px right (rotates 90°/180°), content padding `0 0 20px`, body 15px `--text-secondary`.
- **Container:** Card radius 22 with hairlines between items, or borderless list with only hairlines (marketing FAQ).
- **Motion:** content animates via `grid-template-rows: 0fr → 1fr` + opacity, 320ms `--ease-sheet`; chevron rotates in sync.
- **Behavior:** single‑open default for FAQs; multi‑open for settings. Deep‑link `#id` opens the item.
- **A11y:** header is `<button aria-expanded aria-controls>` inside `<h3>`; panel `role="region" aria-labelledby`. Enter/Space toggles; ↑/↓ optional roving.

### 8.19 Tabs & Segmented Controls

| Variant | Anatomy | Use |
|---|---|---|
| **Underline tabs** | Labels 15/600 (inactive `--text-muted`, active `--text-primary`), 2px `--ink` indicator that slides (`snappy`), hairline baseline | Page sections, settings |
| **Segmented control** (iOS) | Sunken pill track (height 36–40, padding 3), white raised thumb slides between segments (`snappy`), labels 13/600 | Switching views/filters, billing toggle, table density |
| **Pill tabs** | Individual pills; active = Ink fill/white text; inactive Soft | Category filters (scrollable) |
| **Vertical tabs** | 240px list left, panel right; active row = white raised pill | Settings, docs |

- Panel change: crossfade 150ms (no slide) — content should feel present, not travel.
- Overflow (mobile): horizontal scroll‑snap with 24px edge fade masks; active tab scrolls into view.
- Badge counts allowed (§8.20). Icons optional, 16px, left.
- **A11y:** `role="tablist/tab/tabpanel"`, `aria-selected`, `aria-controls`; ←/→ moves + activates, Home/End; roving tabindex; tabs are for in‑page views; routes use links.

### 8.20 Badges

Pill, height 24 (small) / 28 (default), padding `6px 12px`, 12px/500, gap 6.

| Kind | Fill | Text |
|---|---|---|
| Neutral | `--surface-alt` | `--text-secondary` |
| Info / Blue | `--blue-surface` | `--blue-on-surface` |
| Success | `#E3F6E8` | `#1E7B34` |
| Warning | `#FFF1DB` | `#9A5B00` |
| Error | `#FFE8E6` | `#C4271B` |
| Ink ("New") | `--ink` | `#fff` |
| Outline | transparent, 1px `--border-strong` | `--text-secondary` |

- **Dot badge:** 8px circle + label; **status dot** always paired with text.
- **Count badge:** min‑width 20, height 20, pill, `#D70015` fill, white 12/600 tabular; `99+` cap; pinned top‑right of an icon with 2px canvas ring.
- **Index chip** (reference): 28–32px circle with a number, glass on colored capsules, Soft on light.
- **Icon in badge:** 12px leading icon so meaning isn't color‑only.
- All badges pull from the semantic table (§1.5) — no one‑off colors.

### 8.21 Tags & Chips

- **Chip:** pill 32px, padding `0 14px`, 13/500; default Soft `raise-1`; selected `--blue-surface` bg + `--blue-on-surface` text + leading ✓ 14px; removable chips have a 16px × (44px hit area via padding) — Backspace removes last in tag inputs.
- **Filter chips:** toggle, `aria-pressed`; horizontally scrollable row with edge fade.
- **Tag input:** field wraps chips + a bare input; Enter/comma commits; paste splits; max count shown.
- **Category tags** (read‑only): `--surface-alt` bg, 12px, radius 8 (not pill) to distinguish from actions.
- Colors from the palette only; user‑defined tag colors limited to blue/green/orange/gray/ink.

### 8.22 Avatars

- **Sizes:** 24 · 32 · 40 · 56 · 80 · 120px circles, `object-fit: cover`. Org/product avatars use a squircle (radius 28%).
- **Ring:** 2px white ring + `raise-1` for stacks and headers.
- **Fallback:** initials 600 weight on `#E5E5EA` with `#424245` text; if no name, a person glyph.
- **Status dot:** 10px (14px on ≥80px) bottom‑right, 2px canvas ring; green online, gray offline, orange away; `aria-label` includes status.
- **Group:** overlap −8px, max 4 shown + "+N" chip (Soft, 12/600); hover a member lifts it 2px.
- **Loading:** sunken circle with shimmer.
- **A11y:** `alt` = person's name (or `alt=""` when the name is adjacent).

### 8.23 Profiles

- **Profile header:** optional cover (16:5, radius 28, soft mesh or user image with bottom scrim), avatar 96–120 overlapping the cover by 40% with white ring, name H2, handle 15 muted, bio 15 (max 68ch), meta row (location, link, joined) with 16px icons, stats row (followers/projects) in tabular 17/600 + 13 muted, actions: Ink "Follow"/"Edit profile" + Soft icon buttons.
- **Profile card:** Standard card 320px: avatar 56, name, role, two actions.
- **Hover card:** Popover (§8.25), 300ms delay, shows avatar, bio, mutual info, follow button.
- **Edit profile:** form (§8.14) with avatar uploader (circular crop), fields, unsaved‑changes guard.
- **Tabs:** underline tabs (Overview, Activity, Work).

### 8.24 Tooltips

- Ink bg `rgba(29,29,31,.94)`, text `#fff` 12/500, padding `6px 10px`, radius 8, max‑width 240, `float-1`, optional 6px arrow. Keycap hints: 11px mono in `rgba(255,255,255,.16)` chips.
- **Timing:** open after 500ms hover (0 if another tooltip is open), 120ms fade; close immediately on leave/Esc/scroll. Also opens on keyboard focus.
- Placement: prefer top; flip automatically; 8px offset.
- **Content:** text only, ≤2 lines, never critical info, never interactive (use a Popover for that). Icon buttons must have a tooltip **and** `aria-label`.
- **A11y:** `role="tooltip"` + `aria-describedby`. On touch, long‑press or omit.

### 8.25 Popovers

- Glass, radius 20, padding 16, width 280–360, `float-2`; no arrow (Apple style) or an 8px notch on small popovers.
- Motion: origin‑aware `scale(.96)+translateY(4px)` → 1, 200ms `--ease-out`; exit 120ms.
- Non‑modal: click‑outside and Esc close; focus moves inside on open and returns to trigger on close; Tab cycles inside if it contains form controls.
- Uses: filters, share, date pickers, hover cards, notification center (§8.30), color pickers.
- Mobile: becomes a bottom sheet.

### 8.26 Dialogs & Sheets

**Dialog (modal)**
- **Overlay:** `rgba(29,29,31,.32)` + `backdrop-filter: blur(8px)`.
- **Panel:** white/Glass, radius 28, padding 28, `float-3`; widths 440 (alert/confirm), 560 (form), 720 (large); max‑height `calc(100dvh − 48px)`, body scrolls, header/footer stay.
- **Anatomy:** title 22/700 (`aria-labelledby`), description 15 secondary, content, footer actions right‑aligned (Soft cancel + Ink confirm). Close circle button 36px top‑right.
- **Destructive confirm:** title states the consequence ("Delete 3 files?"), confirm is Danger pill with the action verb ("Delete files"), cancel is default focus.
- **Motion:** overlay fade 240ms; panel `scale(.96)→1` + fade 300ms `--ease-sheet`; exit 200ms.
- **A11y:** `role="dialog"` / `alertdialog`, `aria-modal`, focus trap, initial focus on the least destructive control, Esc closes, restore focus, lock body scroll (`overflow:hidden` + scrollbar‑gutter), `inert` on background.

**Bottom sheet (mobile) / side sheet (desktop)**
- Bottom: radius `28px 28px 0 0`, grabber 36×5 `--gray-400` pill, detents medium (50%) and large (92%), drag‑to‑dismiss with velocity (`gentle` spring), safe‑area padding.
- Side: 420px, full height, radius 28 on the inner edge, slides 300ms `--ease-sheet`.
- Nested modals: avoid; use a stepper inside a single dialog.

### 8.27 Menus & Dropdowns

- **Panel:** Glass, radius 16, padding 6, min‑width 200, `float-2`, 8px offset from trigger.
- **Item:** 36px (44 on touch), padding `0 12px`, radius 10, 14/500; icon 16px `--gray-500`; shortcut right, 13px muted; submenu chevron.
- **Highlight:** `--blue-action` fill + white text/icons (hover **and** keyboard). Destructive items `--red-text`, highlight `#D70015` + white.
- **Structure:** section labels 12/600 muted, hairline separators, checkable items (✓), radio items (•), disabled items `--text-disabled`.
- **Context menu:** right‑click / long‑press, same panel, opens at the pointer.
- **Motion:** `scale(.96)+opacity` from the trigger origin, 180ms; submenus open with 100ms delay (safe triangle).
- **A11y:** `role="menu"/"menuitem"`, roving focus, ↑/↓, →/← for submenus, Esc closes and refocuses trigger, type‑ahead. Use Radix/Ark primitives.

### 8.28 Toasts

- **Shape:** pill‑ish Glass, radius 24, padding `12px 16px`, max‑width 380, `float-2`. Icon 20px (semantic color) · title 14/600 · description 13 muted (1–2 lines) · optional text action (`--blue-text`, 14/600).
- **Position:** top‑center desktop (below nav), top with safe‑area on mobile; stack up to 3 with older ones scaled `.95`, offset 8px, dimmed.
- **Timing:** 4s default; hover/focus pauses; errors 8s or manual dismiss; loading toasts persist until resolved (promise toast: Loading… → Saved).
- **Motion:** in: `translateY(-16px) scale(.96) blur(4px)` → rest with `default` spring; out: 200ms fade + `translateY(-8px)`; swipe‑up dismisses.
- **Copy:** same verb as the action ("Published"). Errors say what failed and how to fix it. Provide Undo for destructive actions instead of confirm dialogs where possible.
- **A11y:** container `aria-live="polite"`; errors `role="alert"`; never the only feedback for critical results; don't auto‑dismiss toasts with actions too fast.
- Library: **Sonner** (restyle to these tokens).

### 8.29 Alerts

- **Inline alert:** radius 16, padding 16, semantic surface fill, `1px` border of the same hue at 20% opacity, leading 20px icon (strong color), title 15/600 (text token), body 14, optional actions as text buttons; dismiss × (44px hit area).
- **Variants:** info, success, warning, error, neutral. **Banner** variant: full width, radius 0, 44px tall, centered text, link "Learn more ›".
- **Placement:** at the point of relevance (top of form/section). Errors persist until fixed.
- **A11y:** `role="status"` (info/success) or `role="alert"` (error/warning that interrupts); icon + title ensure not color‑only.

### 8.30 Notifications

- **Bell button:** 44px icon button with count badge (§8.20), `aria-label="Notifications, 3 unread"`.
- **Panel:** Popover 380 × max 520, header (title 17/600 + "Mark all read" text button + settings icon), tabs (All / Unread), grouped by "Today / Earlier".
- **Row:** 72px; leading 40px avatar/icon tile; title 14/600 + body 13 muted (2‑line clamp); time 12 muted right; unread = 8px `--blue` dot + `--blue-surface` bg at 40%; hover reveals "mark read" and overflow menu.
- **Push/lock‑screen style banner:** Glass card radius 24, app icon 28px squircle, title/body, time; slides in like a Toast.
- **Empty:** "You're all caught up." + subtext (§8.33).
- **Preferences:** grouped list with toggles per channel (email/push/in‑app).

### 8.31 Progress

- **Linear:** track 6px pill (`--surface-sunken` + `--inset-1`), fill `--blue` (neutral: `--ink`); width animates 600ms `--ease-out`; label left 13/500, value right 13/600 tabular. Completed → fill turns `--green`.
- **Indeterminate:** 40% wide fill sliding L→R, 1.4s `--ease-in-out` loop.
- **Circular / activity ring:** SVG, 4–8px stroke, round caps, track `--surface-sunken`, center value 17/700 tabular. Multi‑ring (Activity‑style) uses blue/green/ink.
- **Segmented:** N pill segments 4px tall, 4px gap (onboarding, password strength).
- **Page progress:** 2px `--blue` bar fixed to the top, scroll‑linked.
- **A11y:** `role="progressbar"` + `aria-valuenow/min/max` (omit `valuenow` when indeterminate), visible label. Reduced motion: no width animation.

### 8.32 Spinner Loaders & Skeletons

- **Spinner:** default 20px ring (2px stroke `--blue`, 75% arc, 800ms linear) or iOS 12‑tick spinner in `--gray-500`. Sizes 16/20/32. On ink buttons: white.
- **Rules:** show only after 200ms delay; once shown, keep ≥400ms; inline spinner replaces button label (width locked); full‑page loader only on first load — otherwise use skeletons.
- **Skeleton:** shapes match final layout (text lines 12px tall radius 6, last line 60% width; avatars circles; cards 22px radius), `--surface-sunken` with a white 60% shimmer sweep, 1.6s loop; reduced motion → static.
- **A11y:** `role="status"` + visually hidden "Loading…"; `aria-busy` on the region.

### 8.33 Empty States

- **Container:** Well (Sunken, dashed `--gray-400` 1.5px) for inline areas, or no container for full pages. Centered, max 320px text.
- **Anatomy:** 64px icon tile (Soft, `raise-2`) → 17/600 headline → 13–15px muted line → optional Ink pill CTA + text link.
- **Types & copy:** *First use* ("No projects yet" → "Create project"); *No results* ("No matches for 'x'" → "Clear filters"); *Error* ("Couldn't load activity" + "Try again"); *Permission* (say who can grant it); *Offline*; *Caught up* ("You're all caught up.").
- No cartoon illustrations; a monochrome icon or a real product screenshot fragment only. An empty state is an invitation to act, not a mood.

### 8.34 Steppers

- **Horizontal:** nodes 32px circles connected by a 2px line. Done: `--blue-action` fill + white ✓; Current: 2px `--blue` ring + tabular number in `--blue-text`; Upcoming: 1.5px `--border-control` ring + `--text-muted`. Connector fill animates 400ms `--ease-standard`.
- **Labels:** 13/600 under each node (or right on vertical), optional 12px muted description.
- **Vertical:** nodes left, content right, line between; good for checklists and long forms.
- **Compact/mobile:** "Step 2 of 5" 13/600 + 4px segmented progress bar. The reference's `02 / 06` counter style is valid here (tabular, bold, right aligned).
- **A11y:** `<ol>`, `aria-current="step"`, completed steps announced ("completed"). Steps are only clickable if navigating back is safe.

### 8.35 Timelines

- **Vertical:** 2px hairline spine; nodes 12px circles (`--blue` current, `--ink` done, `--border-strong` upcoming) with 3px canvas ring; content card right (Standard, 16px padding); date 12px tabular muted above title.
- **Activity feed:** avatar 32 replaces the node; grouped by day with sticky day labels.
- **Roadmap (horizontal):** 4px baseline, milestone capsules (pill labels) above, quarters below; scrolls with scroll‑snap.
- **Scroll‑linked:** spine fill (ink→blue gradient) advances with scroll on marketing "story" pages only.
- **A11y:** `<ol>` with `<time datetime>`.

### 8.36 Paginations

- **Numbered:** 40px circular pills, 14/500 tabular; current = Ink fill + white text (or Blue on accent pages); prev/next = circle icon buttons; ellipsis for gaps; 4px gap.
- **Compact (mobile):** prev · "Page 2 of 12" · next.
- **Load more:** Soft button below list with count "Showing 24 of 120"; infinite scroll only for feeds, with a sentinel, a visible "Load more" fallback and preserved scroll on back.
- **Carousel dots:** 8px dots; active stretches to 24px pill, 300ms `--ease-sheet`.
- **A11y:** `<nav aria-label="Pagination">`, `aria-current="page"`, disabled prev/next use `aria-disabled` and stay in the DOM.

### 8.37 Docks

**Desktop dock (macOS‑style magnifying dock)**
- Container: Glass pill, radius 28, padding 8, gap 8, centered `bottom: 16px`, `float-2` + 1px inner highlight.
- Icons: 48px squircle tiles (Soft, `raise-1`), magnify on pointer proximity: `scale = 1 + 0.6 · exp(−d² / (2·56²))` where `d` = px distance from pointer to icon center; neighbors scale with the Gaussian falloff; springs `bouncy` (`stiffness 300, damping 18`).
- Tooltip label above the hovered icon (§8.24); running/active indicator = 4px `--ink` dot under the icon.
- Reduced motion: no magnification, hover just lifts 2px.

**Mobile tab bar (dock equivalent)**
- Floating Glass pill, radius 28, height 64, `bottom: max(12px, env(safe-area-inset-bottom))`, width `calc(100% − 32px)`, max 420.
- 4–5 items: 24px icon + 11px/500 label. Active item = sunken capsule behind the icon (`--inset-1`), icon `--blue-text`, label `--text-primary`; inactive `--gray-500` icon with `--text-muted` label.
- Selected indicator slides between items (`snappy`). Badge dots follow §8.20.
- Never more than 5 items; a center primary action (+) is an Ink circle 52px raised above the bar.

### 8.38 Sidebars

- **Width:** 264px expanded, 72px collapsed (icons + tooltips), animate 300ms `--ease-sheet`. Surface: Glass over canvas or plain canvas with a right `hairline`.
- **Structure:** logo/workspace switcher (top) → search/⌘K → nav sections (12/600 muted labels) → footer (usage/upgrade card, profile row 44px with avatar + name + ellipsis).
- **Item:** 40px, radius 10, icon 18px + label 14/500, gap 10. Hover `rgba(29,29,31,.04)`. **Active:** white Soft pill, `raise-1`, label `--text-primary`, icon `--blue-text`. Counts as 12px tabular muted right, or badge for unread.
- **Groups:** collapsible accordions with 16px chevrons; nested items indented 28px with a hairline guide.
- **Mobile:** becomes a left sheet (§8.26) opened from a hamburger icon button; overlays with scrim.
- **A11y:** `<nav aria-label="Primary">`, `aria-current="page"`, collapse button `aria-expanded`, skip link past the sidebar.

### 8.39 Navbars & Breadcrumbs

**Global navbar (apple.com pattern)**
- Height 64 desktop / 52 compact‑on‑scroll / 56 mobile. Sticky top. At scroll 0: transparent; after 8px: Glass (`rgba(245,245,247,.72) + blur(20px) saturate(180%)`) + bottom hairline; 240ms.
- Layout: logo left (24px) · center links 14/500 `--text-primary` at 88% opacity (100% on hover), 32px gap · right: search icon button, secondary link, Ink pill CTA (sm, 36px).
- **Mega menu:** full‑width Glass panel drops 240ms `--ease-sheet`; columns with 12/600 muted group labels and 17/600 links; content fades in with 40ms stagger; page dims to `rgba(29,29,31,.2)` beneath.
- **Floating pill navbar (alternate):** centered, max 720px, radius 999, height 56, Glass + `float-2`, `top:16px`; shrinks horizontally on scroll.
- **Mobile:** logo + hamburger (44px). Opens a full‑screen Glass sheet with 28/700 links (stagger 40ms), primary CTA pinned to the bottom.
- **Sub‑nav (product pages):** 52px sticky under the navbar, product name left, links center, "Buy" Accent pill sm right — appears after the hero scrolls out.
- **A11y:** `<header><nav aria-label>`, skip‑to‑content link first in tab order, `aria-current`, mega menu buttons `aria-expanded`, Esc closes.

**Breadcrumbs**
- 13px; links `--text-muted` (hover `--text-primary`), separator `›` 12px `--gray-400`, current page 13/600 `--text-primary`, `aria-current="page"`.
- Collapse middle items into an "…" menu on narrow widths. `<nav aria-label="Breadcrumb"><ol>`.

### 8.40 Scroll Areas

- **Scrollbars:** overlay style (macOS): 8px thumb `rgba(29,29,31,.28)`, radius pill, hover `.4`; track transparent; visible while scrolling/hovering, fades after 1s idle. CSS: `scrollbar-width: thin; scrollbar-color: rgba(29,29,31,.28) transparent; scrollbar-gutter: stable`.
- **Edge fades:** 24px `mask-image` gradients show there's more content (tabs, chips, carousels, logo rows).
- **Containment:** `overscroll-behavior: contain` in panels/menus/dialogs; `scroll-padding-top: 72px` for sticky nav anchors; `scroll-snap-type: x mandatory` for carousels.
- **Sticky:** section headers, table headers, sticky sidebars (`top: 88px`).
- **Scroll progress:** optional 2px top bar.
- **Smooth scroll:** enabled except under reduced motion. Never hijack native scroll (no scroll‑jacking).
- Use Radix ScrollArea only for custom containers; prefer native scroll on mobile.

### 8.41 File Trees

- **Rows:** 32px, indent 16px per level, chevron 12px (rotates 90°, 160ms), folder/file icon 16px `--gray-500` (folder open icon changes), name 13px (mono for code trees, sans otherwise) `--text-primary`, truncate end.
- **States:** hover `rgba(29,29,31,.04)`; selected `--blue-surface` + `--blue-on-surface` text; focused pane selected `--blue-action` + white (macOS Finder); drag‑over folder shows 2px `--blue` outline; drop line 2px `--blue` between rows; inline rename input replaces the label (F2 / Enter).
- **Guides:** optional 1px `--hairline` vertical indent guides.
- **Loading:** lazy children show a 12px spinner row; empty folder row "Empty" muted.
- **Keyboard:** ↑/↓ move, → expand / move into, ← collapse / move to parent, Enter open, Space select, F2 rename, Delete remove (confirm), type‑ahead, Home/End.
- **A11y:** `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-level`, `aria-selected`; container in a Well or Card.

### 8.42 Carousels

- **Structure:** horizontal scroll‑snap track, `gap:16`, slides 3:4 / 4:3 / 16:9 with radius 28, next slide **peeks** 10–15% to signal more; snap `start` (or `center` for hero carousels, non‑active slides `scale(.94) opacity(.7)` 400ms).
- **Controls:** prev/next 44px Glass circle buttons (hidden on touch), dots pagination (§8.36), progress counter "2 / 6" allowed.
- **Behavior:** drag/swipe with native inertia; keyboard ←/→; **no autoplay**. If a hero must auto‑advance, provide a visible pause button and stop on hover/focus/reduced motion.
- **Parallax:** inner images translate ±4% relative to the slide (desktop only).
- **A11y:** `role="region" aria-roledescription="carousel"`, slides `role="group" aria-label="2 of 6"`, live region `off` unless autoplaying.

### 8.43 Grids & Bento

- **Bento:** 4‑col desktop grid (`gap:16px`, 20px ≥1024), tiles radius 28, sizes 1×1, 2×1, 1×2, 2×2. 5–8 tiles maximum, one idea per tile: H3 (21–28/700) + one muted line + visual bottom/right.
- **Tile mix:** mostly Soft; one Ink tile; one Blue material tile (the focal one); one Glass tile over imagery; wells for data snippets.
- **Hover (desktop):** tile lifts 2px, inner visual scales 1.03 over 600ms; optional pointer spotlight (§11.3).
- **Responsive:** 4‑col → 2‑col (tablet) → 1‑col (mobile), preserving reading order; large tiles become full‑width.
- **Masonry / uniform grids:** for galleries and cards; `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`.
- **Reveal:** tiles fade/rise once in view, 60ms stagger (this is where scroll reveals are allowed).

```css
.bento { display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:minmax(200px,auto); gap:20px; }
.bento > .w2 { grid-column: span 2; } .bento > .h2 { grid-row: span 2; }
@media (max-width:1023px){ .bento{ grid-template-columns:repeat(2,1fr);} }
@media (max-width:639px){ .bento{ grid-template-columns:1fr;} .bento > *{ grid-column:auto; grid-row:auto; } }
```

### 8.44 Images

- **Radius** matches its container (22–28px); **aspect ratios:** 1:1, 4:5, 3:2, 16:9, 21:9; `object-fit: cover`; never stretch.
- **Loading:** `loading="lazy"` + `decoding="async"` (hero image: `fetchpriority="high"`, never lazy); blur‑up LQIP fades 400ms; AVIF/WebP with `srcset`/`sizes`; explicit `width/height` to prevent layout shift.
- **Product shots:** on a soft white→`#F5F5F7` stage with a floor shadow (ellipse, `blur(30px)`, `rgba(29,29,31,.12)`); no borders, no filters.
- **Text over images:** scrim `linear-gradient(180deg, transparent 40%, rgba(0,0,0,.6))`; text ≥4.5:1 against the scrim.
- **Hover zoom:** `scale(1.04)` over 700ms `--ease-out` inside an `overflow:hidden` frame — only on clickable images.
- **Captions:** 13px muted, below. **Alt text** required (describe content/purpose; decorative = `alt=""`).

### 8.45 Galleries

- **Layouts:** uniform grid, masonry (CSS columns), filmstrip (scroll‑snap), or hero + thumbnail strip. Thumbnails radius 16.
- **Lightbox:** overlay `rgba(0,0,0,.92)`, image `max-height: 86dvh`, opens with a shared‑element (FLIP) transition 400ms `--ease-sheet`; counter "3 / 12" (13px tabular, glass pill top‑center), close/prev/next Glass circles 44px, caption below, thumbnails optional.
- **Interactions:** swipe, pinch/double‑tap zoom, arrow keys, Esc; preload adjacent images; scroll locked.
- **A11y:** dialog semantics, focus trap, `aria-label="Image 3 of 12"`, captions as text.

### 8.46 Videos

- **Frame:** radius 28, `overflow:hidden`, 16:9, poster with center **play button** — 72px circle Glass, white ▶ icon 28px, scale 1.06 on hover.
- **Controls bar:** Glass pill radius 20 at bottom (12px inset), appears on hover/tap and hides after 3s: play/pause, scrubber (4px → 6px on hover, `--blue` fill, buffered `rgba(255,255,255,.4)`), time 12px tabular, volume, captions (CC), speed, PiP, fullscreen — all 40px icon buttons.
- **Rules:** no autoplay with sound; decorative background video is `muted loop playsinline`, <4MB, has a poster, and is replaced by the poster under reduced motion / data‑saver. **Captions/subtitles required** for speech; provide transcript link for long content.
- **Keyboard:** Space/K play, ←/→ ±5s, ↑/↓ volume, M mute, F fullscreen, C captions.
- Lazy‑load with IntersectionObserver; use a "lite" facade for YouTube/Vimeo embeds.

### 8.47 Marquees

- **Logo marquee:** monochrome logos 28px tall, `--gray-500` → `--ink` on hover, 48px gap, two identical tracks (`aria-hidden` on the duplicate), `animation: marquee 40s linear infinite`, pauses on hover/focus, edge mask `linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)`.
- **Text marquee:** large display statement (72px, 800, `--ink` at 12% opacity or outline) — marketing only, one per page.
- **Reverse rows:** two rows moving opposite directions allowed for testimonial walls.
- **Reduced motion:** becomes a static wrapped grid.
- Only show logos of real customers/partners.

```css
@keyframes marquee { to { transform: translateX(-50%); } }
.marquee { overflow:hidden; mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent); }
.marquee-track { display:flex; gap:48px; width:max-content; animation:marquee 40s linear infinite; }
.marquee:hover .marquee-track { animation-play-state:paused; }
```

### 8.48 Borders & Dividers

| Type | Spec | Use |
|---|---|---|
| Hairline | `1px solid rgba(29,29,31,.08)` | Separators, table rows, nav bottom |
| Control border | `1px solid #86868B` | Inputs, checkboxes, radios (3.3:1) |
| Strong | `1px solid #D2D2D7` | Hover edges on white surfaces |
| Highlight edge | `box-shadow: inset 0 1px 0 rgba(255,255,255,.8)` | Top edge sheen on Soft/Glass |
| Gradient edge (glass) | `border:1px solid transparent; background: linear-gradient(surface) padding-box, linear-gradient(145deg, rgba(255,255,255,.9), rgba(200,200,205,.3)) border-box;` | Glass cards |
| Dashed | `1.5px dashed #AAAAAA` | Dropzones and empty wells only |
| Focus ring | `0 0 0 2px canvas, 0 0 0 4px #007AFF` | `:focus-visible` |
| Labeled divider | hairline — label 12px muted — hairline | "or continue with" |
| Reference rule | 40px × 1px `--ink` line before an eyebrow label; long hairline before footer handle | Header strip / footer meta |

No rotating conic/rainbow borders, no neon outlines. A single animated "border beam" (6s, blue, 2px) is allowed on one hero CTA at most.

### 8.49 Cursors

- Default: system cursors — `pointer` on links/buttons, `text` in fields, `not-allowed` disabled, `grab/grabbing` on draggable, `zoom-in` on lightbox images.
- **Marketing enhancement (desktop, `pointer:fine`, no reduced motion):** magnetic buttons (pull ≤6px toward pointer, `default` spring) and a 32px Glass ring follower that grows to 56px with a "View"/"Drag" label over media (200ms spring). Hide the follower over text/inputs and never hide the native cursor there.
- Never rely on cursor changes to convey information; no custom cursor on app UI or touch devices.

### 8.50 Additional Components (added for completeness)

| Component | Spec |
|---|---|
| **Kbd** | 12px mono, min‑width 22, height 22, radius 6, `raise-1`, `--text-secondary`; combos joined by 4px gap (`⌘` `K`). |
| **Code block** | Well (Sunken) radius 16, padding 20, 13px mono, line‑height 1.6; copy icon button top‑right (toast "Copied"); syntax colors from palette (ink, blue, green‑strong, orange‑strong, purple, gray). |
| **Split button** | Button + attached chevron segment separated by 1px `rgba(255,255,255,.2)`; chevron opens Menu. |
| **Breadcrumbs / Sub‑nav** | §8.39. |
| **Rating** | 5 stars 20px, filled with `--orange-strong` (passes contrast on light) and only in a review context, half stars, `role="img" aria-label="4.5 out of 5"`; input version uses radio group. |
| **Kanban / Sortable board** | Columns 300px Well, cards Standard (16px padding, radius 16), drag lifts `float-2 + scale(1.02) + rotate(1deg)`, drop indicator 2px `--blue`; keyboard drag via Space + arrows. |
| **Chat / Composer** | Bubbles radius 20 (tail corner 6); sent = `--blue-action` + white, received = Soft; composer = pill input with attach + Ink send; typing indicator = 3 dots (8px, staggered 150ms `snappy`). |
| **Resizable panels** | Divider 1px hairline with 12px grab pill on hover; min widths enforced; keyboard arrows resize. |
| **Cookie / consent banner** | Glass card radius 24, bottom‑left 360px (bottom‑sheet on mobile); equal‑weight "Accept" and "Reject" buttons; "Manage" text link. |
| **Share sheet** | Bottom sheet/Popover: copy link field + icon grid of targets (56px tiles), toast "Link copied". |
| **Pull‑to‑refresh** | Spinner (§8.32) scales in with pull distance; releases at 72px. |
| **Status / changelog** | Timeline (§8.35) with Badge per entry type (New / Improved / Fixed). |
| **Color picker** | Popover with 220px sunken gradient area, hue slider, hex input, swatch grid (palette tokens first). |
| **Widgets** | Bento tiles (1×1, 2×1) with live data, radius 28, one metric + one sparkline. |
| **Skip link** | First focusable element, appears on focus as an Ink pill top‑left. |

---

## 9. Page Sections

Marketing sections are built from §8 components. Each section = **one message**: one headline, one short explanation, one action.

### 9.1 Heroes

| Variant | Layout | When |
|---|---|---|
| **A · Statement** (Apple) | Centered two‑tone Display, lede (≤640px), CTA pair, large product/visual below with floor shadow | Product launches, single strong message |
| **B · Split** | Text 5 cols left / visual 7 cols right | SaaS, app hero with UI screenshot |
| **C · Capsule showcase** (the reference) | Left‑aligned two‑tone Display XL + 40‑char lede, tagline card top‑right, row of 4 tall capsules as the focal element, hex/index captions | Brand, palette, design‑system, portfolio pages |
| **D · Scroll‑linked product** | Sticky stage; product scales `0.92→1`, radius `36→0`, `translateY` parallax ≤12% while scrolling | One flagship product |
| **E · Device frame** | UI screenshot in a rounded device frame (radius 32, 10px ink bezel), soft floor shadow | Apps |
| **F · Compact** | H1 + lede, 64–96px padding | Pricing, docs, legal, blog index |

**Spec**
- Headline ≤12 words, Display or Display XL, two‑tone allowed. Lede 19–24px `--text-muted`. **One** primary CTA (Ink or Blue XL) + one text link ("Learn more ›").
- Height `min(100svh − nav, 900px)` for A/C/D; padding‑top 96–160px.
- **Load sequence (the one orchestrated moment):** headline lines (0ms) → lede (+80) → CTAs (+160) → visual (+240); each 700ms `--ease-out-expo`, `translateY(16px) blur(6px) → 0`. Runs once; skipped under reduced motion.
- Background: canvas with soft radial vignette or the shader (§11.2). LCP image is `fetchpriority="high"`.
- Mobile: text first, then visual; Display drops to 40–48px; capsule row becomes a 2×2 grid or horizontal scroll‑snap.
- One Blue **filled** element in the hero, maximum.

### 9.2 Features

| Variant | Structure |
|---|---|
| **Bento** | §8.43 grid of 5–8 tiles; each tile = outcome headline + one line + visual |
| **Alternating rows** | Image/text 6–6, flip each row, 96px between rows |
| **Icon triplet** | 3 columns: 40px icon tile → H3 → 2‑line text → "Learn more ›" |
| **Sticky storytelling** | Left column sticky with step list; right column swaps visuals (crossfade 300ms) as steps enter the viewport |
| **Tabbed showcase** | Segmented control above; visual crossfades (150–300ms) beneath |

Rules: section headline H2 + one‑line lede; **outcomes before features** ("Find anything in seconds", not "Advanced indexing"); ≤6 features per section; each links somewhere real; only advertise features that exist.

### 9.3 Pricing

- **Layout:** 3 plan cards, 3‑col grid, 20px gap. Card: Standard (radius 28, padding 32). **Recommended plan** = Ink card (or `raise-4`) + Blue badge "Most popular" pinned top; the other cards stay Soft.
- **Anatomy:** plan name 17/600 → short description 15 muted → price 48/700 tabular + "/month" 15 muted → CTA full‑width pill (Ink on recommended, Soft on others) → hairline → feature list (check icon `--blue`, 15px, 36px rows).
- **Billing toggle:** segmented control (Monthly / Yearly); show "Save 20%" Success badge **only if true**; price digits roll 400ms when switching.
- **Below:** "Compare all features" table (§9.9), Enterprise/“Talk to sales” row card, FAQ (§9.7), guarantee/footnote 12px muted.
- **Mobile:** stack cards, recommended first or highlighted with a sticky "Choose Pro" bar.
- **Rules:** real prices, real currency/locale formatting (`Intl.NumberFormat`), no fake strike‑through discounts, taxes stated, cancel policy stated.

### 9.4 Testimonials

| Variant | Spec |
|---|---|
| **Single quote** | Centered, 28–40/600 −0.02em quote (max 24 words), avatar 48 + name 15/600 + role 13 muted |
| **Card wall** | 3‑col masonry of Standard cards (radius 24, `raise-1`), quote 15/1.6, avatar 32 + name/role |
| **Marquee columns** | Two/three vertical marquees moving opposite directions, edge masks, pause on hover |
| **Video testimonial** | Video frame (§8.46) with quote overlay on scrim |

**Rules:** only real, permissioned quotes with attribution; never invent people, ratings or counts. Stars optional (`aria-label="5 out of 5"`). Company logos monochrome.

### 9.5 Logo Cloud ("Used by")

- **Reference pattern:** a Panel (radius 36, `raise-3`) with a header row (left 12px muted label "Used by …", right 12px note), then a row of 5 Tiles (§8.15): 56px monochrome logo, 12/600 name, 11–12px muted category.
- **Alternate:** single‑row marquee (§8.47) with grayscale logos.
- Real customers only. If you have none, don't ship this section.

### 9.6 Calls to Action

| Variant | Spec |
|---|---|
| **Panel CTA** | Panel radius 36, padding 64–96, centered H1/H2 (two‑tone allowed) + lede + button pair |
| **Ink CTA** | Ink material panel, white text, **Inverse** button (white pill) + a white text link |
| **Inline strip** | Action pill (§8.1) beside a sentence |
| **Newsletter** | One capsule: input (pill) + Ink button joined, 56px tall; helper text 13px muted with privacy link |
| **Sticky mobile bar** | Glass bar bottom, safe‑area padding, single Ink pill |

Rules: one primary action per section; verb + object copy; never two Blue filled buttons in one view.

### 9.7 FAQs

- **Layout:** 12‑col: title + "Still have questions? Contact us" Soft card in cols 1–4 (sticky), accordion (§8.18) in cols 5–12; mobile stacked.
- **Content:** 5–8 questions, question 17/600, answer 15px/1.6 `--text-secondary` (max 68ch), links allowed. >10 questions: add a search field and category tabs.
- Deep links per question; first item may be open by default. Add `FAQPage` JSON‑LD for SEO.

### 9.8 Team Sections

- **Grid:** 3–4 columns of member cards: photo 4:5 radius 28 (natural color, no filters) → name 17/600 → role 15 muted → social icon buttons 36px (tooltip + aria‑label).
- **Leadership feature:** first row larger (2 columns), bio 15px.
- **Culture/join card:** Ink or Blue tile "We're hiring" → Accent button.
- Real people, real photos, consent obtained. Consistent crop and lighting. Hover: photo scales 1.03 inside frame, no dimming.

### 9.9 Comparisons

- **Feature table:** columns = plans, rows grouped under 13/600 group headings; sticky header (Glass) and sticky first column; cells: ✓ (`--blue` icon + sr‑only "Included"), "—" (`--gray-500` + sr‑only "Not included"), or short values; recommended column highlighted with `--blue-surface` at 40% and a top label.
- **Product compare (apple.com style):** up to 4 columns with product image, name, price, then spec rows separated by hairlines; "Compare" selector chips at the top; mobile shows 2 columns at a time with a selector.
- **Before/after slider:** two images, 2px white divider line, 44px Glass handle with ◂ ▸; `role="slider"`, ←/→ ±5%, Home/End; drag with pointer capture.
- **Versus cards:** two Standard cards side by side ("Us / Them") only with verifiable claims.

### 9.10 Onboarding

- **Welcome screen:** two‑tone Display ("Welcome. Let's set up.") + one primary button; centered, no chrome.
- **Flow:** 3–5 steps; each screen = one decision; progress as segmented bar or "2 / 5" counter (reference style) top; **Skip** always visible; Back never loses data; steps slide horizontally 320ms `--ease-sheet`.
- **Choice cards:** option cards (radio/checkbox card variants), selected = `--blue-surface` + `--blue` ring.
- **Permission priming:** explain the value before triggering a system prompt; offer "Not now".
- **Product tour (coach marks):** Popover anchored to a spotlighted element (overlay `rgba(29,29,31,.4)` with a radius‑16 cutout), title 15/600, body 13, counter "2 / 5", Back / Next / Skip. ≤5 stops. Never auto‑replays.
- **Getting‑started checklist:** Card with progress ring; rows with circle → ✓ (`--green`), each row deep‑links to the task; dismissible; completes with a toast, not confetti.
- **Empty‑state onboarding:** sample data toggle ("Load sample project") so screens are never blank.
- **A11y:** focus moves to each step's heading; announce "Step 2 of 5"; tour popovers are reachable by keyboard.

### 9.11 Footers

- **Surface:** `--canvas` (or `--surface-alt`) with a hairline on top. Padding `64px 0 32px`. Text 12/1.33 `--text-muted`; column headings 12/600 `--text-primary`.
- **Layout:** logo + short line (left) · 4–5 link columns · optional newsletter (§9.6). Below: hairline, legal row (© dynamic year, terms, privacy), region/language selector (Soft pill), social icon buttons 40px.
- **Reference footer:** long hairline + right‑aligned 12/600 handle/credit.
- **Mobile:** columns collapse into accordions.
- **Big wordmark** variant: 160–240px 800‑weight wordmark in `--ink` at 6% opacity behind the bottom edge — one per site, decorative (`aria-hidden`).
- Link hover: underline, no color change. Landmark `<footer>`; back‑to‑top text link optional.

### 9.12 Announcements

- **Top banner:** 44px, `--ink` (or `--blue-surface`) bar, centered 13px text + "Learn more ›" link, dismiss × (44px hit area); dismissal persisted (localStorage, wrapped in try/catch).
- **Hero pill:** 32px Glass pill above the hero headline: Ink "New" badge + 13px text + `›`; hover lifts 1px.
- **What's‑new modal:** Dialog with 3 items max, screenshot or icon tile each, single "Got it" button.
- **Header strip (reference):** 40px hairline rule + 12px muted label left, counter "02 / 06" right — use for editorial/series pages only.
- Copy: plain and specific ("Dark mode is here."), no hype words (§16).

---

## 10. Data

### 10.1 Charts & Data Viz

- **Container:** Standard card; title 15/600, subtitle 13 muted, legend/controls top‑right; chart area padded 8px; no chart border.
- **Grid & axes:** horizontal hairlines only (`rgba(29,29,31,.08)`), no vertical grid; axis labels 12px `--text-muted` tabular; 4–6 y ticks; zero baseline 1px `--border-strong`.
- **Series colors:** §1.8 order. **Never color alone:** line series get distinct dash patterns + marker shapes (circle / diamond / square) or direct end‑labels; bars get 2px white separators and value labels.
- **Line:** 2.5px, round caps/joins, smooth (monotone) only when data is continuous; area fill = series color 18% → 0% vertical gradient. Point markers appear on hover only (8px, white ring 2px).
- **Bar:** radius top 6px; thin bars (≤12px wide) use full capsule radius (echoes the reference capsules); gap 30–40%; horizontal bars for long labels.
- **Donut/ring:** 12px stroke, round caps, 4° gaps, center total 28/700 tabular; max 5 segments.
- **Sparkline:** 1.5px, no axes, last‑point dot 6px.
- **Tooltip:** Popover style (Glass, radius 14, padding 12), title 12px muted, rows with swatch + label + tabular value; vertical crosshair 1px hairline.
- **Interaction:** hovering a series dims others to 30%; legend chips toggle series (`aria-pressed`); brush/zoom via range slider below.
- **Deltas:** ▲/▼ + sign + `--green-text`/`--red-text` (icon and sign, not color alone). Forecast = dashed line + lighter fill.
- **Motion:** draw‑in 800ms once (`--ease-out`); updates tween 400ms.
- **A11y:** `role="img"` with a text summary, data table fallback ("View as table"), keyboard‑navigable data points, patterns for fills when needed. Format with `Intl` (compact: 1.2K, 3.4M).
- **Libraries:** Recharts, visx, D3, Chart.js — always restyled with these tokens.

### 10.2 Stats & KPIs

- **KPI card:** label 13/500 muted (+ info icon tooltip) → value 40–56/700 tabular `−0.03em` → Delta badge (▲ 4.2%, Success/Error semantic) + "vs last month" 12 muted → optional sparkline bottom or right.
- **Sizes:** compact (value 24–28), default (40), hero (56–96, count‑up).
- **Stat row (marketing):** 3–4 stats separated by vertical hairlines, value 56/700, caption 15 muted.
- **Rules:** every number is real and sourced; label units; consistent decimals; timeframe stated. Loading = skeleton with fixed value height. **Never invent metrics** (§16).

### 10.3 Dashboards

- **Shell:** Sidebar (§8.38) 264px + Topbar 64px (breadcrumbs, ⌘K search, notifications bell, avatar) + content max 1440px, padding 32px, 12‑col grid, gap 20px.
- **Structure:** page title H1 (28px) + right controls (segmented date range, export button, filters) → **Row 1:** 4 KPI cards → **Row 2:** main chart (8 cols) + side list/leaderboard (4 cols) → **Row 3:** table (12 cols).
- **Widgets:** Standard cards (`raise-2`); one focal widget may use `raise-3`. Widget header: title 15/600 + overflow menu.
- **States:** per‑widget skeleton, per‑widget error with "Try again" (one failure doesn't blank the page), empty states with next action.
- **Real‑time:** changed values flash `--blue-surface` for 600ms; live badge with pulsing dot **only** if truly streaming.
- **Customization:** drag to reorder (keyboard accessible), density toggle, saved views; filters persisted in the URL.
- **Mobile:** KPIs in a 2‑column grid or horizontal snap row; charts full width, tables → cards; bottom tab bar (§8.37).

### 10.4 Numbers

- Always `font-variant-numeric: tabular-nums`; right‑align in tables; use `Intl.NumberFormat` (locale, currency, compact).
- Units and currency symbols are smaller (0.5–0.6em), weight 500, `--text-muted`, baseline‑aligned or superscript.
- Negative numbers use a true minus `−` (U+2212). Percent has no space before `%` in English UI.
- **Count‑up / odometer:** digits roll vertically (spring `default`), 800–1200ms, when first in view, once. Announce only the final value (`aria-label` on the container, animated digits `aria-hidden`).
- **Live change:** old value slides up/out, new slides up/in, 300ms.
- Abbreviate thousands ≥10,000 in tight spaces (10.2K); full value in a tooltip.

### 10.5 Maps

- **Base style (MapLibre / Mapbox custom):** land `#F5F5F7`, water `#E5F0FF`, parks `#E3F6E8`, roads white with `#E0E0E5` casing, buildings `#ECECEF`, labels `--text-muted` 12px (place names 600), borders `#D2D2D7` dashed.
- **Pins:** 28px `--blue` circle, white 3px ring, `float-1`; selected pin grows to 36px (`bouncy`) with a Popover card; clusters = Soft circles with tabular count.
- **Controls:** zoom/compass/locate as stacked Glass icon buttons (44px) bottom‑right; attribution kept, 11px.
- **Layout:** map in a Card (radius 28) or full‑bleed with a floating Glass search bar and a results Card; list ↔ map sync (hover highlights pin).
- **A11y:** every marker reachable/listed in text form; keyboard pan/zoom; don't rely on the map as the only way to get an address.
- Dark mode uses a matching dark style (§18).

### 10.6 Globes

- **Look:** monochrome dotted globe — dots `--gray-400` on canvas, base `#F5F5F7`, soft white rim glow, arcs and markers `--blue` (arcs animate a traveling dot 2.4s), one focal marker pulsing softly.
- **Behavior:** idle rotation ≈0.003 rad/frame, drag to rotate with inertia, pauses off‑screen and on hidden tabs; static image under reduced motion.
- **Size:** 480–640px on desktop, cropped by the section edge or centered within a Bento tile; DPR ≤2.
- **Implementation:** `cobe` (tiny WebGL globe) or three.js; never ship a globe as the only way to see locations — pair with a list.

```js
import createGlobe from "cobe";
createGlobe(canvas, {
  devicePixelRatio: 2, width: 1200, height: 1200,
  phi: 0, theta: 0.25, dark: 0, diffuse: 1.2,
  mapSamples: 16000, mapBrightness: 6,
  baseColor: [0.96, 0.96, 0.97],     // #F5F5F7
  markerColor: [0, 0.478, 1],        // #007AFF
  glowColor: [1, 1, 1],
  markers: [{ location: [LAT, LNG], size: 0.06 }],           // your real locations only
  onRender: (state) => { state.phi = phi; phi += 0.003; },
});
```

---

## 11. Backgrounds, Shaders & Effects

### 11.1 Backgrounds

| Type | Recipe | Use |
|---|---|---|
| **Flat canvas** | `#F5F5F7` | Default |
| **Vignette** | `radial-gradient(1200px 600px at 50% -10%, #FFFFFF 0%, #F5F5F7 60%)` | Hero, soft lift at the top |
| **Soft mesh** | 3 blurred blobs (`--blue-surface`, `#FFFFFF`, `#E8E8ED`), `filter: blur(120px)`, opacity .6, drift 24s linear (transform only) | Behind one hero; ambient |
| **Grain** | Inline SVG `feTurbulence` (baseFrequency .8), `opacity:.03–.05`, `mix-blend-mode:multiply` | Removes gradient banding; global overlay |
| **Dot grid** | `radial-gradient(#D2D2D7 1px, transparent 1px)` at `24px 24px`, masked with a radial fade | Technical / dev‑tool pages |
| **Section alternation** | canvas → white → canvas; one Ink section for rhythm | Long pages |
| **Ink spotlight** | On `--ink` sections: `radial-gradient(60% 50% at 50% 0%, rgba(0,122,255,.22), transparent)` | Dark CTA / feature sections |
| **Glass over image** | Blurred photo (`blur(40px) saturate(1.2)`) under Glass cards | Media pages |
| **Section blend** | 160px gradient from a section's bg into the next | Avoid hard seams |

Rules: at most **one animated background per page**; `pointer-events:none; aria-hidden`; never behind body text without ≥4.5:1 contrast; no purple‑to‑pink or rainbow gradients; static fallback under reduced motion.

### 11.2 Shaders

A single, slow, low‑contrast **mesh‑gradient shader** for hero backgrounds. It should feel like light moving in frosted glass, not a demo reel.

- **Palette uniforms:** `#F5F5F7`, `#FFFFFF`, `#E5F0FF`, and at most 10% `#007AFF`.
- **Speed:** `u_time * 0.05`. **Detail:** 4‑octave fbm. **Grain:** static, ±0.6%.
- **Perf:** render at 0.5× resolution and upscale (it's a blur anyway); DPR ≤1.5; pause when off‑screen (`IntersectionObserver`) or tab hidden; skip on low‑end (`navigator.hardwareConcurrency < 4`, data‑saver) and draw a CSS gradient instead; under reduced motion render a single frame.
- **Structure:** `<canvas class="shader-canvas" aria-hidden="true">` absolutely positioned behind content, with the CSS vignette as the fallback layer.
- Libraries: raw WebGL, OGL, or three.js. Keep the bundle under ~15 KB for this effect.

```glsl
precision highp float;
uniform vec2  u_res;
uniform float u_time;

const vec3 C0 = vec3(0.961, 0.961, 0.969);  // #F5F5F7
const vec3 C1 = vec3(1.000, 1.000, 1.000);  // #FFFFFF
const vec3 C2 = vec3(0.898, 0.941, 1.000);  // #E5F0FF
const vec3 C3 = vec3(0.000, 0.478, 1.000);  // #007AFF

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 4; i++){ v += a*noise(p); p *= 2.0; a *= 0.5; } return v; }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p  = uv * vec2(u_res.x / u_res.y, 1.0);
  float t = u_time * 0.05;
  float n = fbm(p * 1.6 + vec2( t, -t * 0.6));
  float m = fbm(p * 2.2 - vec2( t * 0.7, t) + n);
  vec3 col = mix(C0, C1, smoothstep(0.25, 0.75, n));
  col = mix(col, C2, smoothstep(0.45, 0.85, m) * 0.65);
  col = mix(col, C3, smoothstep(0.72, 0.95, m) * 0.10);   // blue whisper, max 10%
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;           // static grain
  gl_FragColor = vec4(col, 1.0);
}
```

### 11.3 Effects (the "Apple feel")

| Effect | Spec | Rule |
|---|---|---|
| **Frosted glass** | `backdrop-filter: saturate(180%) blur(20px)` on `rgba(255,255,255,.72)` | Nav, popovers, docks, toasts. Provide a solid fallback for browsers without `backdrop-filter`. |
| **Specular edge** | `inset 0 1px 0 rgba(255,255,255,.8)` | Top edge sheen on Soft/Glass |
| **Soft raise / press** | §5 recipes | Interactive surfaces |
| **Floor shadow** | Ellipse `blur(30px)` `rgba(29,29,31,.12)` under products | Product images |
| **Pointer spotlight** | Radial gradient `rgba(0,122,255,.08)` (240px) following the pointer on Bento tiles via CSS vars `--mx/--my` | Desktop only; one grid per page |
| **Scroll‑linked scale** | Sticky hero product scales/parallaxes ≤12% | Hero D only |
| **Sticky stack** | Cards pin and scale to `0.95` as the next slides over (top offset 96px) | Story pages, ≤4 cards |
| **Shared‑element (FLIP)** | Card → dialog/lightbox morph 400ms `--ease-sheet` | Galleries, product detail |
| **View transitions** | `document.startViewTransition` for route changes, 250ms crossfade | Guarded with feature detect |
| **Magnetic hover** | ≤6px pull, `default` spring | Marketing CTAs on desktop |
| **Haptic feel (web)** | Instant press feedback (100ms), `scale(.97)`; `navigator.vibrate(8)` only on mobile toggles/success, optional | Never required |
| **Specular sweep** | 1.2s highlight sweep across an Ink button once on first view | One per page, optional |
| **Skeleton shimmer** | §8.32 | Loading only |

Never: confetti, particle fields, parallax on text, tilt‑3D cards, glitch/scramble text, neon glows, auto‑rotating 3D models, rainbow/aurora gradients.

---

## 12. Page Templates

Section order for each template; dimensions in px. Build from §8–§10 components.

### 12.1 Landing page
```
[Announcement banner 44]
[Navbar 64 sticky, Glass on scroll]
[Hero A/B/C  (Display two‑tone, 1 CTA)]                 ← one orchestrated load sequence
[Logo cloud / Panel  (real customers only)]
[Features — Bento 5–8 tiles]
[Feature deep‑dive ×2 — alternating rows or sticky story]
[Stats row (real numbers)]                              ← optional
[Testimonials]
[Pricing 3 cards + toggle]
[FAQ]
[CTA — Panel or Ink]
[Footer]
```
Section spacing 96–160. Alternate canvas/white; one Ink section.

### 12.2 Dashboard
```
┌─────────┬──────────────────────────────────────────────┐
│ Sidebar │ Topbar 64  (breadcrumbs · ⌘K · bell · avatar) │
│  264    ├──────────────────────────────────────────────┤
│         │ H1 28 + date‑range segmented + Export         │
│         │ [KPI] [KPI] [KPI] [KPI]                       │
│         │ [ Main chart · 8 cols ][ List · 4 cols ]      │
│         │ [ Table · 12 cols ]                           │
└─────────┴──────────────────────────────────────────────┘
```

### 12.3 Pricing page
```
[Navbar] [Hero F: H1 + lede] [Billing segmented] [3 plan cards] [Comparison table] [Enterprise row] [FAQ] [CTA] [Footer]
```

### 12.4 Auth (sign in / sign up)
```
Canvas + vignette
      ┌──────────── Soft card 440, radius 28 ────────────┐
      │ Logo · H2 "Sign in"                               │
      │ [Continue with Apple] [Continue with Google]      │
      │ ── or ──                                          │
      │ Email  ▢      Password ▢  (Show)                  │
      │ [        Sign in  (Ink, full width)       ]       │
      │ Forgot password? · Create account                 │
      └───────────────────────────────────────────────────┘
```

### 12.5 Settings
```
Left: vertical tabs / grouped list (Account, Notifications, Billing, Team, Security)
Right (max 720): section = H3 + description + Card of rows (label left, control right, hairline between)
Danger zone: separate Card with Danger button behind confirm dialog
Sticky save bar (Glass) appears only when there are unsaved changes
```

### 12.6 Product detail
```
[Navbar] [Sub‑nav sticky: name · links · Buy] [Hero D scroll‑linked product]
[Highlights bento] [Specs / compare] [Gallery + lightbox] [Reviews (real)] [Related carousel] [Footer]
```

### 12.7 Article / docs
```
Reading column 680, H1 Display‑size 40–56, lede, meta row (avatar · date · read time)
Body 17/1.6, images radius 22 full‑bleed to 960, code Wells, callout Alerts
Right rail: sticky table of contents (13px, active = --text-primary + 2px ink bar)
```

### 12.8 Error / 404 / empty page
```
Centered: Display "404" (gray, 800) → H2 "That page isn't here." → 15px muted "It may have moved." → [Go home (Ink)] [Search]
```

### 12.9 Showcase slide (the reference — 1080×1350 social carousel / palette card)
```
40px margins · canvas #F5F5F7 with soft vignette
[hairline 40×1 + eyebrow 12px]                         [counter "02 / 06" 12/700]
[Display 96/800 black]  [Display 96/500 gray]          [Tagline card 28r raise-3]
[lede 15px muted, 40ch]
[Capsule ×4  148×320  soft · ink · gray · blue,  index chips 1–4]
[hex captions 12/700 tabular]
[Panel r36 raise-3: label · 5 Tiles (56px logo, name 12/600, sub 11 muted)]
[Action pill (arrow circle + "Save this palette / Use it in your next design.")]  [hairline ——— handle]
```

---

## 13. Hooks

*"Hooks" is interpreted as React hooks that implement this system's behavior (custom hooks live in `/hooks`, one file each). If you meant marketing "hooks" (headline patterns), see §16.*

| Hook | Purpose | Notes |
|---|---|---|
| `useReducedMotion()` | Respect `prefers-reduced-motion` | Gate every animation |
| `useInView(ref, {once, margin})` | Trigger reveals, count‑ups, chart draw‑in | `once:true` default |
| `useMediaQuery(q)` | Responsive logic in JS | SSR‑safe default |
| `useIsTouch()` | Disable hover‑only effects (`(hover:none)`) | Cursors, magnetic, spotlight |
| `useScrollProgress(ref?)` | 0–1 progress for scroll‑linked hero, page bar, timeline | rAF‑throttled, passive listener |
| `useCountUp(value, {duration})` | Number roll | Once; final value in `aria-label` |
| `useSpringValue(target, config)` | Spring interpolation (dock magnification, thumb) | Use tokens from §6.1 |
| `useMagnetic(ref, strength=6)` | Magnetic CTA | Off for touch / reduced motion |
| `usePointerSpotlight(ref)` | Sets `--mx/--my` for Bento spotlight | rAF‑throttled |
| `useHotkey(combo, handler)` | ⌘K, `/`, Esc, `?` | Ignore inside inputs unless intended |
| `useClickOutside(ref, fn)` | Popovers/menus | pointerdown, not click |
| `useFocusTrap(ref, active)` | Dialogs/sheets | Prefer Radix `Dialog` |
| `useLockBodyScroll(active)` | Modals | Preserve scrollbar gutter |
| `useControllableState(value, default, onChange)` | Controlled/uncontrolled components | Standard pattern |
| `useDisclosure()` | Open/close state for dialogs, accordions | Returns `{open, toggle, close}` |
| `useDebounce(value, ms)` | Search (150ms), resize | — |
| `useCopyToClipboard()` | Code blocks, share | Returns status; triggers toast |
| `useLocalStorage(key, init)` | Persist dismissals, density, theme | **try/catch**; SSR‑safe |
| `useTheme()` | Light/dark/system | Sets `data-theme` on `<html>` before paint |
| `useIdle(ms)` | Hide video controls / cursor follower | — |
| `useIntersectionScroll(sections)` | Active section for sticky storytelling / TOC | — |
| `useSafeArea()` | Reads `env(safe-area-inset-*)` | Mobile sheets/tab bars |

```ts
// hooks/useReducedMotion.ts
import { useEffect, useState } from "react";
export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update(); mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduce;
}

// hooks/useInView.ts
import { useEffect, useState, RefObject } from "react";
export function useInView(ref: RefObject<Element>, { once = true, margin = "0px 0px -10% 0px" } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); if (once) io.disconnect(); }
      else if (!once) setInView(false);
    }, { rootMargin: margin });
    io.observe(el); return () => io.disconnect();
  }, [ref, once, margin]);
  return inView;
}

// hooks/useLocalStorage.ts  (storage can throw — always guard)
import { useState, useCallback } from "react";
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; }
    catch { return initial; }
  });
  const set = useCallback((v: T) => {
    setValue(v);
    try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
  }, [key]);
  return [value, set] as const;
}
```

---

## 14. Responsive

| Breakpoint | Width | Columns |
|---|---|---|
| Mobile | <640px | 4 |
| Tablet | 640–1023px | 8 |
| Desktop | 1024–1439px | 12 |
| Wide | ≥1440px | 12 (content max 1200 / dashboards 1440) |

**Mobile is recomposed, not shrunk:**
- One message per block; multi‑column grids → single column; side‑by‑side → stacked; text before visual where context is needed first.
- Display type 40–48px; section spacing 56–64px; gutters 24px.
- Capsule/tile rows → 2×2 grid or horizontal scroll‑snap with 10–15% peek and edge fade.
- Tables → key‑value cards; navbar → hamburger sheet; sidebar → left sheet; popovers → bottom sheets; hover tooltips removed.
- Navigation for apps → floating tab bar (§8.37); primary action sticky at the bottom (Glass) with safe‑area padding.
- Touch targets ≥44px; inputs use `font-size ≥16px` (prevents iOS zoom); use `100dvh`, not `100vh`; respect `env(safe-area-inset-*)`.
- All hover styles inside `@media (hover:hover)`; provide tap equivalents.
- Reduce shadow radii by ~40% on mobile (`--raise-*` scale factor 0.6) and drop backdrop blur on low‑end devices.
- Test at 320, 375, 390, 768, 1024, 1280, 1440, 1920; landscape phones; 200% zoom; text‑only zoom 200%.

---

## 15. Accessibility (non‑negotiable)

Neumorphic/soft UIs fail accessibility when edges vanish. These rules exist to prevent that.

- [ ] Body text ≥4.5:1, large text ≥3:1, UI graphics/borders/focus ≥3:1.
- [ ] `#AAAAAA` and `#007AFF` are **never** used for small text (2.1:1 / 3.7:1). Use `--text-muted` and `--blue-text`.
- [ ] Vivid semantic colors (`#34C759`, `#FF9500`, `#FF3B30`) never carry text on light backgrounds — use the strong/text variants.
- [ ] Every interactive element has a visible `:focus-visible` ring (2px canvas gap + 2px `--blue`), even on soft surfaces.
- [ ] Soft‑raised controls have a text/icon label at ≥3:1; form controls keep `--border-control`.
- [ ] Never encode meaning in color alone — pair with icon, text, sign, or shape (deltas, statuses, charts).
- [ ] Minimum 44×44px touch targets; 8px between adjacent targets.
- [ ] All inputs have `<label>`; errors linked via `aria-describedby`; error summary for long forms.
- [ ] Content that swaps in place uses `aria-live` (toasts, form results, search counts).
- [ ] Full keyboard navigation, logical tab order, skip‑to‑content link, Esc closes overlays, focus is trapped in modals and restored on close.
- [ ] Semantic HTML first (`button`, `a`, `nav`, `main`, `table`, `dialog`); ARIA only to fill gaps.
- [ ] `prefers-reduced-motion` block present (§6.3) and honored by JS animations.
- [ ] `prefers-contrast: more` → strengthen: hairlines → `#86868B`, drop translucency (Glass → solid), remove blur.
- [ ] `forced-colors: active` → keep borders (`1px solid CanvasText`) since shadows disappear.
- [ ] Support 200% zoom and text resizing without loss; use `rem` for type where possible.
- [ ] Images have meaningful `alt`; videos have captions; audio has transcripts.
- [ ] Charts include text summary, table fallback, and non‑color differentiation.
- [ ] Carousels/marquees can be paused; no content flashes more than 3×/second.
- [ ] Language attribute set; correct `dir` for RTL (use logical properties: `margin-inline`, `padding-block`).

**Verified contrast (computed):**

| Pair | Ratio |
|---|---|
| `#1D1D1F` on `#F5F5F7` | 15.5:1 |
| `#424245` on `#F5F5F7` | 9.2:1 |
| `#6E6E73` on `#F5F5F7` / `#FFF` | 4.7:1 / 5.1:1 |
| `#0066CC` on `#F5F5F7` / `#FFF` | 5.1:1 / 5.6:1 |
| `#FFFFFF` on `#0071E3` | 4.7:1 |
| `#FFFFFF` on `#007AFF` | 4.0:1 (large/bold ≥18.7px only) |
| `#FFFFFF` on `#D70015` | 5.4:1 |
| `#0A4FA8` on `#E5F0FF` | 6.8:1 |
| `#1E7B34` on `#E3F6E8` | 4.7:1 |
| `#9A5B00` on `#FFF1DB` | 4.9:1 |
| `#C4271B` on `#FFE8E6` | 4.9:1 |
| `#86868B` on `#F5F5F7` | 3.3:1 (icons, large text, control borders) |
| `#AAAAAA` on `#F5F5F7` | 2.1:1 (decorative only) |

---

## 16. Content Rules

- **Outcomes before features.** One strong headline + one short explanation per section. Plain language first, technical terms later.
- **Apple cadence:** short declarative fragments with periods ("Clean. Premium. Timeless.") — max three fragments, once per page.
- **Sentence case** everywhere (buttons, headings, labels). No ALL CAPS except the optional 12px eyebrow. Use the eyebrow only when it adds information; never above every heading.
- **Buttons:** verb + object ("Save changes", "Create project"). The same action keeps the same name through the flow (button "Publish" → toast "Published").
- **Errors:** say what happened and how to fix it; no apologies, no blame, no vagueness. **Empty states:** direct the next action.
- **Avoid:** "revolutionary," "game‑changing," "effortlessly," "seamlessly," "cutting‑edge," repeated "AI‑powered," exclamation marks.
- **Never invent** metrics, customer counts, testimonials, ratings, partner logos, team photos, or "used by" claims. Use real product data in screenshots; label demos clearly as demos.
- Only advertise features that exist. Prices, dates and legal text must be real.
- **Hook headlines (marketing):** name the benefit in ≤12 words; lead with the user ("Your team, in sync."), not the system; no puns unless the brand voice demands them.
- Localize: dates, numbers, currency via `Intl`; leave 30% extra width for translation.

---

## 17. Drop‑in Tokens

```css
:root {
  color-scheme: light;

  /* Neutrals */
  --canvas:           #F5F5F7;
  --surface:          #FFFFFF;
  --surface-alt:      #EDEDF0;
  --surface-sunken:   #E8E8ED;
  --ink:              #1D1D1F;
  --hairline:         rgba(29,29,31,0.08);
  --border-strong:    #D2D2D7;
  --border-control:   #86868B;
  --gray-400:         #AAAAAA;   /* decorative */
  --gray-500:         #86868B;   /* icons, large text */

  /* Text */
  --text-primary:     #1D1D1F;
  --text-secondary:   #424245;
  --text-muted:       #6E6E73;
  --text-disabled:    #AAAAAA;
  --text-inverse:     #FFFFFF;

  /* Blue */
  --blue:             #007AFF;
  --blue-action:      #0071E3;
  --blue-strong:      #0058B8;
  --blue-text:        #0066CC;
  --blue-surface:     #E5F0FF;
  --blue-on-surface:  #0A4FA8;

  /* Semantic */
  --green:            #34C759;  --green-strong:  #248A3D;  --green-surface:  #E3F6E8;  --green-text:  #1E7B34;
  --orange:           #FF9500;  --orange-strong: #C25E00;  --orange-surface: #FFF1DB;  --orange-text: #9A5B00;
  --red:              #FF3B30;  --red-strong:    #D70015;  --red-surface:    #FFE8E6;  --red-text:    #C4271B;

  /* Materials */
  --surface-soft: linear-gradient(145deg, #FFFFFF 0%, #F5F5F7 55%, #ECECEF 100%);
  --mat-ink:      linear-gradient(160deg, #3A3A3C 0%, #1D1D1F 55%, #000000 100%);
  --mat-gray:     linear-gradient(160deg, #C4C4C6 0%, #AAAAAA 55%, #8F8F92 100%);
  --mat-blue:     linear-gradient(160deg, #4DA3FF 0%, #007AFF 50%, #0060D6 100%);
  --glass:        rgba(255,255,255,0.72);
  --glass-nav:    rgba(245,245,247,0.72);
  --scrim:        rgba(29,29,31,0.32);

  /* Radius */
  --r-xs: 8px;  --r-sm: 12px;  --r-md: 16px;  --r-lg: 22px;  --r-xl: 28px;  --r-2xl: 36px;  --r-pill: 999px;

  /* Elevation (light from top‑left) */
  --hl: rgba(255,255,255,0.95);  --sd: rgba(174,174,192,0.32);
  --raise-1: -3px -3px 8px var(--hl), 3px 3px 10px var(--sd);
  --raise-2: -6px -6px 16px var(--hl), 8px 8px 20px var(--sd);
  --raise-3: -10px -10px 28px var(--hl), 14px 14px 32px var(--sd);
  --raise-4: -16px -16px 40px var(--hl), 24px 24px 56px rgba(150,150,170,0.36);
  --inset-1: inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--hl);
  --inset-2: inset 4px 4px 10px var(--sd), inset -4px -4px 10px var(--hl);
  --press:   inset 3px 3px 8px var(--sd), inset -3px -3px 8px var(--hl);
  --float-1: 0 4px 12px rgba(29,29,31,0.08);
  --float-2: 0 12px 40px rgba(29,29,31,0.12);
  --float-3: 0 24px 64px rgba(29,29,31,0.18);
  --focus-ring: 0 0 0 2px var(--canvas), 0 0 0 4px var(--blue);

  /* Motion */
  --ease-standard: cubic-bezier(0.28, 0.11, 0.32, 1);
  --ease-out:      cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-sheet:    cubic-bezier(0.32, 0.72, 0, 1);
  --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);
  --dur-instant: 100ms; --dur-fast: 160ms; --dur-base: 240ms; --dur-slow: 400ms; --dur-xslow: 700ms; --dur-hero: 1000ms;

  /* Type */
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace;

  /* Layout */
  --container: 1200px; --container-wide: 1440px; --container-read: 680px; --container-form: 520px;
  --nav-h: 64px;
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: 72px; }
body { margin: 0; background: var(--canvas); color: var(--text-secondary);
  font: 400 17px/1.47 var(--font-sans); letter-spacing: -0.011em;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
h1, h2, h3, h4 { color: var(--text-primary); text-wrap: balance; margin: 0; }
p { text-wrap: pretty; max-width: 68ch; }
:focus-visible { outline: none; box-shadow: var(--focus-ring); }
::selection { background: #B3D4FF; color: #1D1D1F; }
```

**Tailwind (v3) mapping**
```js
// tailwind.config.js
module.exports = { theme: { extend: {
  colors: { canvas:"#F5F5F7", ink:"#1D1D1F", gray:{400:"#AAAAAA",500:"#86868B"},
    blue:{DEFAULT:"#007AFF",action:"#0071E3",strong:"#0058B8",text:"#0066CC",surface:"#E5F0FF"},
    muted:"#6E6E73", secondary:"#424245" },
  borderRadius: { xs:"8px", sm:"12px", md:"16px", lg:"22px", xl:"28px", "2xl":"36px" },
  boxShadow: { "raise-1":"var(--raise-1)","raise-2":"var(--raise-2)","raise-3":"var(--raise-3)","raise-4":"var(--raise-4)",
    "inset-1":"var(--inset-1)","inset-2":"var(--inset-2)","float-2":"var(--float-2)","float-3":"var(--float-3)" },
  transitionTimingFunction: { standard:"cubic-bezier(0.28,0.11,0.32,1)", out:"cubic-bezier(0.22,1,0.36,1)", sheet:"cubic-bezier(0.32,0.72,0,1)" },
  fontFamily: { sans:["-apple-system","BlinkMacSystemFont","SF Pro Display","Inter","sans-serif"] },
}}};
```

---

## 18. Dark Mode

Dark is a first‑class theme, not an inversion. Set via `data-theme="dark"` (or `prefers-color-scheme`). Soft‑raised becomes **soft‑lit**: subtle top highlight, deep bottom shadow.

```css
:root[data-theme="dark"] {
  color-scheme: dark;
  --canvas: #000000;  --surface: #1C1C1E;  --surface-alt: #2C2C2E;  --surface-sunken: #111113;
  --ink: #F5F5F7;
  --hairline: rgba(255,255,255,0.10);  --border-strong: #3A3A3C;  --border-control: #8E8E93;
  --gray-400: #636366;  --gray-500: #98989D;

  --text-primary: #F5F5F7;  --text-secondary: #EBEBF5;  --text-muted: #98989D;  --text-disabled: #636366;

  --blue: #0A84FF;  --blue-action: #0071E3;  --blue-strong: #409CFF;  --blue-text: #64A9FF;
  --blue-surface: rgba(10,132,255,0.16);  --blue-on-surface: #99C8FF;
  --green: #30D158;  --green-strong: #30D158;  --green-surface: rgba(48,209,88,0.16);  --green-text: #7BE495;
  --orange: #FF9F0A; --orange-strong: #FF9F0A; --orange-surface: rgba(255,159,10,0.16); --orange-text: #FFC266;
  --red: #FF453A;    --red-strong: #FF453A;    --red-surface: rgba(255,69,58,0.16);    --red-text: #FF8A82;

  --surface-soft: linear-gradient(145deg, #2C2C2E 0%, #1C1C1E 60%, #161618 100%);
  --hl: rgba(255,255,255,0.06);  --sd: rgba(0,0,0,0.65);
  --glass: rgba(28,28,30,0.72);  --glass-nav: rgba(0,0,0,0.72);  --scrim: rgba(0,0,0,0.6);
  --float-2: 0 12px 40px rgba(0,0,0,0.5);  --float-3: 0 24px 64px rgba(0,0,0,0.6);
}
```
- **Buttons:** Primary flips to **white pill / ink text** (`--ink` becomes light); Accent stays `#0071E3`.
- **Materials:** Ink material becomes `#2C2C2E → #1C1C1E`; Blue material unchanged; glass uses `backdrop-filter` on `rgba(28,28,30,.72)`.
- **Text on Blue fills** stays white (4.7:1 with `--blue-action`).
- **Images:** slight `brightness(.92)` on light‑background product shots; provide dark logo variants; SVG icons via `currentColor`.
- **Charts:** same order, lighter tints (`#0A84FF`, `#F5F5F7`, `#30D158`, `#FF9F0A`, `#BF5AF2`).
- **Verified:** `#F5F5F7` on `#1C1C1E` 15.6:1 · `#98989D` on `#1C1C1E` 5.9:1 · `#0A84FF` on `#1C1C1E` 4.7:1 · `#98989D` on `#2C2C2E` 4.9:1.
- Set the theme before first paint (inline script) to avoid a flash; respect `system` by default.

---

## 19. Per‑Project Customization

Keep everything above fixed. Change **only** this:

1. **Pick one brand accent.** Apple blue `#007AFF` is the default. To give a project its own identity, replace the five blue tokens (`--blue`, `--blue-action`, `--blue-strong`, `--blue-text`, `--blue-surface` + `--blue-on-surface`) with a new hue and re‑verify: `--blue-action` ≥4.5:1 with white text; `--blue-text` ≥4.5:1 on canvas; `--blue-on-surface` ≥4.5:1 on `--blue-surface`; `--blue` ≥3:1 on canvas.
2. Keep neutrals (`#F5F5F7`, `#1D1D1F`, `#AAAAAA`), semantic green/orange/red, radii, elevation, and motion **exactly as they are** — they carry consistent meaning across projects.
3. Adjust display size to density (dense tools: Display 44–56, marketing: 72–96).
4. Choose light‑only or light + dark (§18).
5. Optional: swap the sans stack's web font (Inter → Geist/Manrope) — keep the weight scale.

---

## 20. Pre‑Ship Checklist

- [ ] Every color, radius, shadow and duration traces to a token — **zero one‑off hex values**.
- [ ] Blue is used only for interaction/selection; ≤1 Blue‑filled hero element per screen; primary buttons are Ink.
- [ ] Surfaces follow the light model (top‑left) and nesting rule (max two raised levels); `raise‑4`/glow appears once per viewport.
- [ ] Radius hierarchy visible (panel 36 → card 22–28 → tile 16–20 → input 12; all interactive things are pills).
- [ ] Two‑tone display headings used at ≥44px only; text passes contrast on the rendered page.
- [ ] Focus ring visible on every interactive element, including on soft surfaces.
- [ ] Every control has all states: hover, focus‑visible, pressed, disabled, plus loading/error where relevant.
- [ ] `prefers-reduced-motion`, `prefers-contrast`, and `forced-colors` handled.
- [ ] Motion: one orchestrated hero moment; charts/count‑ups run once; only `transform/opacity/filter` animated; no autoplay carousels.
- [ ] One animated background/shader at most, with static fallback, paused off‑screen.
- [ ] Mobile recomposed (not shrunk); 44px targets; `100dvh`; safe‑area insets; inputs ≥16px.
- [ ] Forms: labels, `autocomplete`, inline errors linked via `aria-describedby`, validation on blur.
- [ ] Overlays: focus trap, Esc, focus restore, scroll lock.
- [ ] Charts have non‑color encoding, text summary, and table fallback.
- [ ] No invented metrics, testimonials, logos, or team photos; demos are labeled.
- [ ] Copy is sentence case, verb + object on buttons, no hype words.
- [ ] Performance: LCP image prioritized, fonts subset/`font-display: swap`, backdrop blur limited to fixed chrome, shaders throttled.
- [ ] Contrast spot‑checked on the **rendered** output, not only the token table.