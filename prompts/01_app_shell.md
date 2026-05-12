# 01 — App Shell

> Window chrome, sidebar, status footer. The persistent frame that wraps every screen.

---

## Current state — review

**Title bar**
- Native OS title bar with feather icon + "FFmpeg Audio Manager" text. Fine, keep it.

**Left sidebar ("Workspace")**
- 200px-ish width, plain background, three text-only items: *Extract Audio*, *Merge Audio*, *History*.
- Active item is rendered black/heavy; inactive items are also dark; the disabled / empty *History* is faded.
- No icons. No visual anchor for the selected state — you can't tell which is "current" without reading text weights.
- The label **"Workspace"** is a section header but sits flush with no spacing rhythm.

**Status footer (bottom-left)**
- Three green-dot rows: `FFmpeg ready`, `mkvmerge ready`, `6 GPU encoders`.
- Useful information, but the dots feel like emoji and the text uses the same weight as the navigation above — they compete.
- The **Dark Mode** checkbox is squeezed into the lowest pixel of the window with a Tk-style checkbox glyph.

**Right pane**
- Page title rendered as huge bold black slab ("Extract Audio") with a smaller grey subtitle. The "Clear" / equivalent is awkwardly pinned at the far right of that title row.

---

## Problems

1. Selected state in the sidebar is illegible.
2. Status footer is content-heavy but visually equal to navigation — needs to recede.
3. Page-title row mixes title, subtitle, and a destructive button ("Clear"). Three different concerns, one row, no rhythm.
4. Dark-mode toggle is buried.
5. The whole shell has no separators or surfaces — everything floats on the same plane, so the eye has no anchor.

---

## Target structure

```
┌─────────────────────────────────────────────────────────────────┐
│  ◐  Audio Manager                          ─  □  ✕              │  title bar
├──────────────┬──────────────────────────────────────────────────┤
│              │  Extract Audio                          ⌘K  ⋯    │  page header
│  WORKSPACE   │  Probe video files, pick a stream, save audio.   │
│  ▸ Extract   │  ─────────────────────────────────────────────── │
│    Merge     │  [ + Add files ] [ + Folder ]  🔍 search   1/1 ▸ │  toolbar
│    History   │  ┌────────────────────────────────────────────┐  │
│              │  │ table                                      │  │  content
│              │  └────────────────────────────────────────────┘  │
│              │  Output  ▢ /Users/...                  [Browse]  │
│              │                              ┌──────────────────┐│
│              │                              │  Extract audio → ││  CTA
│              │                              └──────────────────┘│
│  ───────     │  ─────────────────────────────────────────────── │
│  ● FFmpeg    │  Progress · idle                         Log ▾   │  progress dock
│  ● mkvmerge  │                                                  │
│  ● 6 GPU     │                                                  │
│  ◐ Theme     │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Sidebar

- Width 220px. `--bg-1` background, 1px right border `--line`.
- Header `WORKSPACE` in 11px uppercase, tracking 0.08em, `--fg-2`. 16px top padding, 12px bottom.
- Items: 36px tall rows, 12px horizontal padding, 8px gap between icon and label.
  - Icon 16px stroke. Suggested: Extract = `arrow-down-to-line`, Merge = `git-merge`, History = `clock`.
  - Label: 13px, `--fg-1`.
- **Selected**: pill background `--bg-3`, label `--fg-0`, a 2px accent bar on the left inside the pill (`--accent`).
- **Hover** (non-selected): background `--bg-2`.
- **Disabled** (e.g. History when empty): `--fg-2`, no hover.

### Status footer (sidebar bottom)

- Pinned to the bottom of the sidebar, 16px padding, 1px top border.
- Each status row: 6px dot + 12px label, 24px row height, `--fg-1`.
  - `--ok` dot = green for healthy, `--warn` for degraded, `--err` for missing.
- Theme switch sits as the last row: a small two-state toggle (sun / moon icon, 14px) inline with a "Theme" label. NOT a Tk checkbox.

### Page header

- 24px page title (`--fg-0`, weight 600).
- 13px subtitle underneath (`--fg-1`).
- Right side of the row holds **utility actions** only — never destructive verbs. Use an icon-button row: search (⌘K), overflow (⋯). Put **Clear** inside the overflow menu *or* render it as a ghost-button in the toolbar below the title — never next to the title.
- 1px separator under the header block, then 20px breathing room before the toolbar.
