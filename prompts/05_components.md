# 05 — Shared components

> Specs for atoms and molecules that appear on more than one screen. Build these once; assemble screens from them.

---

## Button

Three intents × three sizes.

| Intent     | Resting bg     | Resting fg     | Hover bg    | Pressed bg   | Border           |
|------------|----------------|----------------|-------------|--------------|------------------|
| Primary    | `--accent`     | `#FFFFFF`      | lighten 4%  | `--accent-2` | none             |
| Ghost      | transparent    | `--fg-0`       | `--bg-2`    | `--bg-3`     | 1px `--line`     |
| Danger     | transparent    | `--err`        | `--err`/10% | `--err`/20%  | 1px `--err`/40%  |

Sizes: `sm` 28px, `md` 36px, `lg` 44px. Horizontal padding = 1.5× height. Icon-only buttons are square. Disabled state: `--bg-2` bg, `--fg-2` fg, no hover.

Never use a gradient. Never use box-shadow on a button (focus ring is a 2px outline `--accent` at 40% alpha, 2px offset).

## Input / select

- 32px height (`sm`), 36px default.
- Background `--bg-2`, border 1px `--line`, focus border 1.5px `--accent`, no glow.
- 8px horizontal padding, 12px for selects (to make room for the chevron).
- Placeholder `--fg-2`, value `--fg-0`.
- Mono variant (used for paths and stream descriptors): swap font family to JetBrains Mono, drop size to 12px.

## Pill / segmented control

- 28px tall, `--bg-2` background, fully rounded ends (999px radius).
- Selected segment: `--bg-3` background, `--fg-0` text, 1px inset `--line`.
- Other segments: transparent, `--fg-1`, hover `--bg-2`/80%.

## Table

- Outer: `--bg-1`, 10px radius, 1px `--line`.
- Header row: 36px, `--bg-2`, 11/uppercase/tracking-0.06em column labels, `--fg-2`.
- Body rows: 44px (Extract/Merge), 48px (History). 12px horizontal cell padding.
- Hover: row background `--bg-2`.
- Selected: row background `--bg-3`, 2px left bar `--accent`. Never end-to-end royal blue.
- Scrollbars: 8px thin overlay scrollbars, hidden when not scrolling. No native Tk scrollbars.

## Status dot

`<span>` 8px circle. Color from `--ok / --warn / --err / --fg-2`. Optional 1.5s pulse animation for in-progress states. Always paired with a label — never a bare dot.

## Progress bar

- Track: `--bg-2`, height 4px (primary) or 2px (overall).
- Fill: `--accent`. Subtle 100ms ease-out on width changes.
- Indeterminate state: a 30% width chip slides left→right with 1.4s linear loop. Use only when ETA cannot be computed.

## Toast

- 320px max width, 12px padding, 10px radius, `--bg-2` bg with 1px `--line`, soft drop shadow `0 12px 32px rgba(0,0,0,0.4)`.
- 16px icon at left (✓ / ⚠ / ✕), title 13/600, body 12/400 `--fg-1`.
- Auto-dismiss 6s for success, sticky for error.
- Stack bottom-right with 8px gap.

## Keyboard shortcut chip

For `⌘K`, `⌫`, `↵`. 18px tall, mono 11px, `--bg-2` bg, 4px radius, `--fg-1`. Sit inline at the right of menu items.

## Modal

- Centered, 480px wide default. `--bg-1` background, 12px radius, 24px padding. Dim background `rgba(0,0,0,0.5)`.
- Title 16/600, body 13/400 `--fg-1`, actions bottom-right (Ghost cancel + Primary confirm).
- Esc closes; Enter triggers primary unless focus is in a textarea.

## Dark / light parity rule

Every component is specified for **both** themes. When picking a hover color, walk one step up the `--bg-N` ladder — that produces the same perceptual delta in both themes without needing per-theme overrides.
