# Titan AI Theme — Single Source of Truth (SSOT)

This document and `landing/titan-theme.css` define the unified, canonical design system for Titan AI.

---

## 1. Design Tokens & CSS Variables

| Token | Hex Value | Role & Usage Restrictions |
|---|---|---|
| `--ink` | `#0B0B0C` | Primary text, dark backgrounds, high-contrast borders |
| `--paper` | `#FFFFFF` | Primary light canvas, card background, inverse text |
| `--muted` | `#6B7280` | Secondary / supporting copy, subtle metadata, inactive controls |
| `--line` | `#E5E7EB` | Subtle dividers, light card borders (`FlatCard`) |
| `--line-dark` | `#27272A` | Dark section borders, flat dark card borders |
| `--blue` | `#1D3FBF` | **Interactive ONLY** — Primary CTAs, active focus rings, active links |
| `--amber` | `#F59E0B` | **Accent ONLY** — FeatureCard offset shadow, key highlight underline, warnings |
| `--green` | `#16A34A` | **Success ONLY** — Recommendation tag text, verified status chips, positive deltas |

### Functional Constraints
- **Blue (`#1D3FBF`) is interactive-only**: Never use `--blue` for decorative background washes, static headings, or passive borders.
- **Amber (`#F59E0B`) is accent-only**: Reserved strictly for the 8px FeatureCard offset shadow, the 6px heading underline (`AmberUnderline`), and critical risk highlights.
- **Green (`#16A34A`) is success-only**: Used for confirmed recommendation tags (`TITAN RECOMMENDS`) and positive validation indicators.

---

## 2. Typography Rules

- **Font Family**: Grotesque Sans (`Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`).
- **Headings**:
  - `font-weight: 700`
  - `letter-spacing: -0.03em`
  - `line-height: 1.04`
- **Serif-Italic Removal**:
  - **No serif or italic fonts in headings.**
  - Legacy `h1 em, h2 em` styles using `Georgia, serif` or italic emphasis are banned and reset to `font-family: inherit; font-style: normal; font-weight: inherit;`.
  - Heading emphasis is achieved via `AmberUnderline` or semantic phrasing, not serif-italic typography.

---

## 3. Shared Reusable Components

### 3.1. PillToggle
Identical to the hero toggle with complete keyboard accessibility (WAI-ARIA Tablist pattern).

```html
<div class="pill-toggle" role="tablist" aria-label="Toggle options">
  <button class="pill-toggle__tab" type="button" role="tab" aria-selected="true" tabindex="0" data-value="opt1">Option 1</button>
  <button class="pill-toggle__tab" type="button" role="tab" aria-selected="false" tabindex="-1" data-value="opt2">Option 2</button>
</div>
```

- **Container**: `background: #F1F1F3; border-radius: 999px; padding: 4px; gap: 2px; display: inline-flex;`
- **Tabs**: `min-height: 38px; padding: 8px 17px; border: 0; border-radius: 999px; background: #FFF; color: #6B7280; font-size: 14px; font-weight: 600; line-height: 1.2; cursor: pointer;`
- **Active Tab (`aria-selected="true"`)**: `background: #0B0B0C; color: #FFF;`
- **Focus Ring**: `outline: 3px solid #1D3FBF; outline-offset: 3px;`
- **Keyboard Navigation**:
  - <kbd>→</kbd> / <kbd>↓</kbd>: Next tab (circular)
  - <kbd>←</kbd> / <kbd>↑</kbd>: Previous tab (circular)
  - <kbd>Home</kbd>: First tab
  - <kbd>End</kbd>: Last tab
  - Managed via `landing/titan-theme.js`.

---

### 3.2. FeatureCard
High-impact decision / feature callout card.

```html
<article class="feature-card">
  <span class="feature-card__tag">TITAN RECOMMENDS</span>
  <h2 class="feature-card__title">Reorder 1,200 units of SKU-4471 by Thursday</h2>
  <p class="feature-card__desc">Demand rising in West. Stock covers 3 days. Confidence 94%.</p>
</article>
```

- **Background**: `#FFFFFF` (`--paper`)
- **Border**: `1.5px solid #0B0B0C` (`--ink`)
- **Border Radius**: `18px`
- **Box Shadow**: `8px 8px 0 #F59E0B` (8px 8px 0 amber offset shadow)
- **Tag**: `background: #0B0B0C; color: #16A34A; font-size: 11px; font-weight: 750; letter-spacing: 0.1em; border-radius: 3px; padding: 4px 6px;`

---

### 3.3. FlatCard
Clean data grid or secondary container without drop shadow.

```html
<div class="flat-card">
  <div class="flat-card__content">
    <h3>Data Signal</h3>
    <p>Real-time inventory levels synchronized from ERP.</p>
  </div>
</div>
```

- **Background**: `#FFFFFF` (`--paper`) (or `#0B0B0C` in dark variant)
- **Border**: `1px solid #E5E7EB` (`--line`) (or `1px solid #27272A` in dark variant)
- **Border Radius**: `14px`
- **Shadow**: `none`

---

### 3.4. AmberUnderline
A 6px solid amber bar placed under a highlighted phrase in a heading.

```html
<h2 class="titan-heading">
  One screen. <span class="amber-underline"><span>One clear move.</span></span>
</h2>
```

- **Height**: `6px`
- **Color**: `#F59E0B` (`--amber`)
- **Position**: Horizontal bar anchored below the highlighted text span.

---

### 3.5. Section Wrapper
Canonical section containers providing structured spacing and contrast.

```html
<!-- Light Section Variant -->
<section class="section-wrapper section-wrapper--light">
  <div class="section-wrapper__container">
    <!-- Section Content -->
  </div>
</section>

<!-- Dark Section Variant -->
<section class="section-wrapper section-wrapper--dark">
  <div class="section-wrapper__container">
    <!-- Section Content -->
  </div>
</section>
```

- **Light Variant (`section-wrapper--light`)**:
  - `background: #FFFFFF` (`--paper`)
  - `color: #0B0B0C` (`--ink`)
- **Dark Variant (`section-wrapper--dark`)**:
  - `background: #0B0B0C` (flat `--ink`)
  - `color: #FFFFFF` (`--paper`)
  - Headings: `#FFFFFF`
  - Eyebrows & metadata: `#6B7280` (`--muted`)

---

## 4. Site-Wide Visual Bans

The following stylistic patterns are **strictly prohibited** across all sections of the site from now on:

1. **Gradients**:
   - ❌ No `linear-gradient()`, `radial-gradient()`, or `conic-gradient()`.
   - All backgrounds must be solid (`#FFFFFF`, `#0B0B0C`, `#FAFAFA`, `#F1F1F3`).
2. **Radial Glows**:
   - ❌ No floating glowing spheres, neon drops, or blurred radial ambient highlights.
3. **Blur / Glass Effects**:
   - ❌ No `backdrop-filter: blur(...)` or translucent frosted glass cards.
   - All cards and navigation bars must have opaque or solid flat surfaces.
4. **Purple / Periwinkle**:
   - ❌ No purple, lavender, violet, or periwinkle accents (e.g. `#8B5CF6`, `#6366F1`, `#A855F7`, `#B8A5FF`, `#A9BFFF`).
   - The palette is strictly restrained to Charcoal/Ink, Paper, Muted Grey, Line, Blue (interactive), Amber (accent), and Green (success).

---

## 5. File Inventory

| File | Purpose |
|---|---|
| `landing/titan-theme.css` | CSS tokens, typography, shared component classes, banned effect resets |
| `landing/titan-theme.js` | Reusable WAI-ARIA compliant PillToggle controller with keyboard accessibility |
| `landing/TITAN_THEME.md` | Single Source of Truth architecture and specification documentation |

*(Hero section remains intact as the prototype reference implementation. No existing sections have been restyled yet.)*
