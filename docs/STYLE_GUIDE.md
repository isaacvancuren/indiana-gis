# Mapnova — Style Guide

> Single source of truth for visual + interaction design. Agents reference this
> when adding any UI so the app stays visually coherent across PRs.

---

## Color tokens (extracted from current `apps/web/index.html` + `app.css`)

Defined in `:root` block at the top of `apps/web/static/v2/app.css`:

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#080b0f` | Page background, map fallback |
| `--panel` | `#0e1420` | Panel backgrounds (sidebars, modals) |
| `--panel2` | `#172030` | Inputs, dropdowns, raised surfaces |
| `--panel3` | `#172030` | Same as panel2 currently — distinguish if needed |
| `--border` | `#1a2d40` | Default 1px border on panels and inputs |
| `--border2` | `#1e3550` | Stronger border for elevated surfaces |
| Selection halo | `#fbbf24` (amber-400) | Yellow selection highlight in tools |
| Measurement | `#06b6d4` (cyan-500) | Drawn measurements (lines + areas) |
| Primary CTA | `#1d4ed8` (blue-700) | Sign-in button, primary actions |
| Success | `#22c55e` (green-500) | Save confirmations |
| Warning | `#f59e0b` (amber-500) | Reserved |
| Danger | `#ef4444` / `#f87171` (red-400/500) | Delete, destructive actions |
| Text primary | `#dde4f0` | Body text on dark backgrounds |
| Text dim | `#94a3b8` (slate-400) | Secondary text, captions |
| Text disabled | `#64748b` (slate-500) | Disabled UI |

When adding a new color, **first check if an existing token covers the use**.
Only introduce new tokens for genuinely new categories. Document them here.

---

## Typography

- **Headings + UI:** Barlow Condensed (loaded from Google Fonts, weights 400/500/600/700/800)
- **Body + inputs:** Barlow (300/400/500/600)
- **Code / monospace:** browser default monospace (rare; only for SQL dumps, hex IDs, etc.)

Sizes:

| Use | Size | Weight |
|---|---|---|
| Page title | 18px | 600 |
| Section heading | 14px | 600 |
| Body | 13px | 400 |
| Caption / label | 12px | 500 |
| Tooltip / metadata | 11px | 400 |

---

## Spacing scale

Use only these values for padding/margin/gap:

`4px · 6px · 8px · 10px · 12px · 14px · 16px · 20px · 24px · 32px · 48px · 64px`

Don't introduce arbitrary `7px` or `15px`. Snap to the scale.

---

## Component patterns

### Buttons

| Variant | When | Example styles |
|---|---|---|
| Primary | Single CTA per panel | `background:#1d4ed8;color:#fff;padding:6px 16px;border-radius:6px;font:500 12px sans-serif` |
| Secondary | Cancel, dismiss, alternate path | `background:transparent;border:1px solid #334;color:#dde4f0;padding:6px 14px;border-radius:5px` |
| Danger | Delete, destructive | `background:transparent;color:#f87171;border:1px solid #ef4444;padding:6px 14px;border-radius:5px` |
| Icon button | In tool panels | `background:transparent;border:none;color:#94a3b8;padding:4px;cursor:pointer` |

### Modals

- Backdrop: `rgba(0,0,0,0.7)` + `backdrop-filter: blur(4px)`
- Panel: `background:#0e1420;border:1px solid #1a2d40;border-radius:10px;padding:20px 24px`
- Width: `min(480px, calc(100vw - 32px))`
- Close button: top-right `×`, secondary button styling

### Floating panels (e.g., Cloud Projects, tools popovers)

- Position fixed, top-right corner, `z-index:9998`
- Background: `rgba(14,20,32,0.96)` with `backdrop-filter: blur(8px)`
- Border + radius matching modals (`#1a2d40` / `8px`)
- Don't exceed `max-width: 280px` for sidebars

### Inputs

- Background: `#172030` (`--panel2`)
- Border: `1px solid #1a2d40` (`--border`)
- Padding: `8px 10px`
- Border-radius: `5px`
- Focus state: outline color matches the primary CTA blue

---

## Voice & tone

TODO — owner fills in based on `PRODUCT_VISION.md` § 7

Until the vision document is filled in, default to:
- **Concise.** No filler. Every word earns its place.
- **Specific.** "Saved 3 measurements" not "Operation completed successfully."
- **Direct, not bossy.** "Sign in to save" not "You must sign in to save."
- **Plain English over jargon.** "Polygon select" not "Vector geometric region selection."

---

## Don't do these

- ❌ Don't introduce new font families.
- ❌ Don't use light-mode colors (this app is dark-first).
- ❌ Don't use absolute font sizes outside the scale.
- ❌ Don't use shadows heavier than `box-shadow: 0 4px 12px rgba(0,0,0,0.4)`.
- ❌ Don't use rounded corners larger than `12px` on anything but the page itself.
- ❌ Don't use emoji-only labels for critical actions; pair with text or a Font Awesome icon.

---

## Adding new patterns

If you can't find an existing pattern that fits, add one here as a PR before
implementing. Otherwise next month there'll be three different "saved success"
toasts and the app drifts visually.
