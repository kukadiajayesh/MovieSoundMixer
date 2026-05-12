# FFmpeg Audio Manager — Redesign Brief

## 0. Premise

The current build is a functional Tkinter window. It works, but it reads as an engineering scaffold rather than a tool a person *wants* to use. The redesign keeps every existing capability and screen, but rebuilds the surface from scratch around a tighter visual system, real typographic hierarchy, and interaction patterns suited to a media-processing utility.

The redesign is **not** a web app. It is a **modern native desktop tool**, sized for a 1280×800 window minimum, dense without being cramped, comfortable for long batch sessions.

---

## 1. Design principles

1. **Quiet chrome, loud content.** The file list is the hero. Sidebars, toolbars, status footers all recede.
2. **One primary action per screen.** Extract → "Extract Audio". Merge → "Merge". The CTA is unambiguous, anchored bottom-right, and visually heavier than every other control.
3. **Progress is first-class.** A batch tool lives or dies on its progress UI. We promote progress from a footer afterthought to a real region with per-file and overall states, ETAs, and a persistent log drawer.
4. **Status is ambient.** "FFmpeg ready / mkvmerge ready / 6 GPU encoders" should feel like an OS menu-bar — present, glanceable, never demanding.
5. **Dark mode is the default.** Media work happens at night and against video content. Light is a real alternate, not a tacked-on inversion.

---

## 2. Type

- **UI / labels:** `Inter` (or system fallback `-apple-system, Segoe UI Variable, Segoe UI`). 13px base, 1.45 line-height.
- **Headings:** Inter 600. Page title 24px, section 15px uppercase tracking 0.06em.
- **Mono / file paths / streams:** `JetBrains Mono` 12px. Used for filenames in the table, stream identifiers (`a:0 eac3 6ch [rus]`), file sizes, and log output.

Replace the current oversized "Extract Audio" / "Merge Audio" black slab headings with the new 24px weight-600 treatment and a 13px regular subtitle in muted foreground. Drop the harsh tracking.

---

## 3. Color tokens

Dark (default):

```
--bg-0      #0E1014   /* window background           */
--bg-1      #14171D   /* panel / sidebar             */
--bg-2      #1B1F27   /* raised surfaces, table head */
--bg-3      #232833   /* hover, selected             */
--line      #262C36
--fg-0      #E8EAEE   /* primary text                */
--fg-1      #A6ADBB   /* secondary                   */
--fg-2      #6B7280   /* tertiary, captions          */
--accent    #4F8CFF   /* primary action              */
--accent-2  #1F66E0   /* pressed                     */
--ok        #34D399
--warn      #F5B544
--err       #F26D6D
```

Light:

```
--bg-0      #F7F7F5
--bg-1      #FFFFFF
--bg-2      #F1F1EE
--bg-3      #E7E7E3
--line      #DFDFD9
--fg-0      #16181C
--fg-1      #4B5363
--fg-2      #8A93A4
--accent    #2563EB
--accent-2  #1E4FCB
```

Whites are warm-cool neutral, not pure. Avoid blueprint blue everywhere — the accent is the *only* saturated color in normal state.

---

## 4. Spacing & radius

- 4-pt grid. Common values: 4 / 8 / 12 / 16 / 20 / 24 / 32.
- Radius: 6px controls, 10px panels, 999px pills.
- Border 1px `--line`; never double-borders.
- Drop the chunky 3D bevels Tk inherits.

---

## 5. Iconography

- 16px stroke icons, 1.5px stroke. Use a consistent set (Lucide is fine).
- Sidebar items: icon + label, never label alone.
- The 🪶 feather window-icon is fine as a brand mark — keep it small (16px) in the title bar / sidebar header.

---

## 6. Motion

- 120ms ease-out for hover/focus.
- 200ms for panel transitions.
- Progress bars animate continuously while running, freeze at 100%.
- Never bounce. This is a utility.

---

## 7. Don'ts

- No gradients on buttons.
- No emoji in status labels — use a 6px colored dot.
- No drop-shadows on flat panels (only on floating menus and toasts).
- No rounded-corner-with-left-border-accent containers anywhere.
- No "Clear" button stuck to the page title — promote it into a real toolbar.
