# 02 — Extract Audio

> The first and primary screen. Probe video files, choose an audio stream, save it as a standalone file.

---

## Current state — review

Reading the screenshot top to bottom:

1. **Page header row** — "Extract Audio" as a huge bold heading. To its right, a "Clear" button bizarrely sits on the same row as the title. Subtitle below: *"Probe video files, pick a stream, save audio as a standalone file."*
2. **Toolbar row** — `+ Add Files`, `+ Add Folder`, then a magnifier icon next to a wide empty search box, then `Remove Selected`, then a right-aligned "1/1 ready" counter. The toolbar mixes two distinct toolbars (file ops vs. search) with no visual grouping.
3. **File table** — Columns: `#`, `File`, `Size`, `Stream`, `Status`.
   - `Stream` is a native Tk drop-down rendered as a beveled grey box `a:0  eac3  6ch  [rus]`.
   - `Status` is plain text ("Ready").
   - Native horizontal & vertical scrollbars consume real estate.
4. **Output Folder** row — Label + huge empty field + "Browse…" button + the primary **Extract Audio** CTA crammed onto the same row.
5. **Progress block** — A bold "Progress" heading, then `Idle` text in a faux-input, then "Stop" / "Show Log" links, then `Current File:` with a tiny grey bar, then `Overall Progress:` with another tiny grey bar.

---

## Specific problems

- **Hierarchy collision** — page title competes with section headings like "Progress" because they use the same weight/size.
- **The Stream picker reads like a label, not a control.** It's the most important affordance on this screen (the user's actual decision per file) and it's the most visually mute thing in the table.
- **"Clear" next to the title is a footgun.** Destructive action, wrong place.
- **Output Folder + CTA share a row.** The CTA disappears next to a text input.
- **Progress is buried.** Two thin grey bars + "Idle" string is not enough for a tool that may run for 10+ minutes on a 2.6 GB file.
- **Search is huge and empty.** A 700px-wide empty search field dominates the toolbar even though there's one file.
- **Status column is wasted.** Just one word ("Ready") in a full-width column.
- **No drag-and-drop affordance.** This is a file-batching tool; users will drag files in.

---

## Target layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Extract Audio                                            ⌘K   ⋯      │
│ Probe video files, pick a stream, save audio.                        │
│ ──────────────────────────────────────────────────────────────────── │
│ [⊕ Add files] [⊕ Folder]    🔍 Search 1 file       [⌫ Remove] [Clear]│
│ ──────────────────────────────────────────────────────────────────── │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │   FILE                                  SIZE   STREAM    STATUS  │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ ▣ Ikkis (2026) Hindi 1080p WEBRip…mkv  2.6 GB  [a:0 ▼]  ● Ready  │ │
│ │                                                                  │ │
│ │            (drop files here, or use + Add files)                 │ │
│ │                                                                  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                          1 of 1 ready│
│ ──────────────────────────────────────────────────────────────────── │
│ Output    /Users/.../Audio                              [Browse]     │
│ Format    [● MP3  ○ AAC  ○ FLAC  ○ Copy]                             │
│                                                                      │
│                                       ┌───────────────────────────┐  │
│                                       │  ▸  Extract audio         │  │
│                                       └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

A separate **progress dock** slides up from the bottom when a job is running (see §6). When idle, it collapses to a single 32px-tall row reading `Idle · ready to extract`.

---

## Section-by-section transformation

### 1. Page header

- Title 24/600 `--fg-0`, subtitle 13/400 `--fg-1`.
- Right side: icon-buttons only (search ⌘K, overflow ⋯). **No "Clear" here.**
- 1px `--line` separator under the block.

### 2. Toolbar

Two visual groups separated by a vertical 1px `--line` divider with 12px padding both sides:

**Left group — file ops:**
- `⊕ Add files` (ghost button)
- `⊕ Add folder` (ghost button)
- A subtle drop hint: when the user drags a file over the window, the whole table flashes a dashed accent border + caption "Drop video files".

**Right group — list ops:**
- Search field — 240px wide max, placeholder `Search 1 file…`, only visible when ≥1 file in the list. Magnifier icon inside the input, not outside.
- `⌫ Remove` (ghost button, disabled until ≥1 selection)
- `Clear` (ghost button, danger-on-hover red text). Confirmation modal if list > 5 items.

### 3. File table

- Surface `--bg-1`, 10px radius, 1px `--line` border. Header row `--bg-2`.
- Row height 44px. 12px horizontal padding. Striping OFF — use hover background instead.
- Columns and widths:
  - `▣ FILE`  — flex, includes a 16px checkbox on the very left for multi-select. Filename in mono 12px `--fg-0`, ellipsis-middle truncation. Tooltip on hover shows the full path.
  - `SIZE`  — 80px, right-aligned, mono 12px `--fg-1`.
  - `STREAM` — 220px. **This is the redesigned dropdown** (see below).
  - `STATUS` — 96px. Dot + label.

**The Stream selector**

The most important control on this screen. Replace the Tk combobox with a real menu button:

```
┌───────────────────────────────┐
│ a:0 · EAC3 · 6ch · RUS    ▾   │
└───────────────────────────────┘
```

- 28px tall, `--bg-2` resting, `--bg-3` hover, `--accent` 1px ring on focus.
- Mono 12px label. The four metadata fields are separated by `·` not double-spaces.
- Opens a popover listing all detected audio streams from the probe, each row showing index, codec, channels, language flag emoji or ISO code, bitrate, default/forced flags. The currently selected row has a left accent bar.
- Probing in progress: show a skeleton shimmer for the stream cell, not blank.

**Status cell**

- 8px dot + label. States:
  - `● Ready`     `--ok`
  - `◐ Probing…`  `--warn` (with a 1.5s pulse)
  - `▶ Extracting` `--accent` (with per-row progress: thin 2px bar under the row)
  - `✓ Done`      `--ok` (subtle)
  - `✕ Failed`    `--err`, click to expand error

**Empty state**

- When zero files, the table body shows a centered 160px-tall illustration zone (use a placeholder `<div>` with a dashed border, mono caption: `Drop video files here  ·  or use + Add files`). No mascots, no clip-art.

**Footer of the table**

- Right-aligned counter: `1 of 1 ready · 2.6 GB total`.

### 4. Output + format

Two compact rows below the table:

- **Output** — label 13px `--fg-1`, an inline path input (`--bg-2` background, mono 12px), a right-side ghost `Browse` button. Path collapses with middle-ellipsis when long. A small `↗` icon at the end opens the folder in Finder/Explorer.
- **Format** — segmented control (pills) for output codec: `MP3`, `AAC`, `FLAC`, `Copy (no re-encode)`. Default `Copy` since the original container already has the stream — extracting without re-encode is the fast path and should be encouraged. Selected pill = `--bg-3` + `--fg-0`. Others = transparent + `--fg-1`.

If `MP3 / AAC` selected, a small inline secondary control appears: `Bitrate [192 kbps ▾]`. Keep this *progressive disclosure* — never show codec parameters that don't apply to the current format.

### 5. Primary CTA

- 44px tall, 200px wide, anchored bottom-right of the content area.
- Solid `--accent` background, white label `Extract audio` in 14/600, leading 16px play-triangle icon.
- Disabled state when 0 files in list or no output folder selected: `--bg-3` background, `--fg-2` text.
- Pressed: `--accent-2`.

### 6. Progress dock

Replace the entire "Progress / Idle / Current File / Overall Progress" stack.

**Idle:**
- A single thin 32px row at the very bottom of the content area: `● Idle · FFmpeg ready` left, `Show log ▾` right. `--bg-1` background, 1px top `--line`.

**Running:**
- Dock expands to 96px.
- Row 1: `▶ Extracting · Ikkis (2026) Hindi 1080p…mkv` (truncate middle) — left. Right: `02:14 elapsed · ~01:30 remaining`.
- Row 2: **Per-file** progress bar 4px tall, full-width, `--accent` fill.
- Row 3: `2 / 7 files` left. Right: `Pause`, `Stop`, `Show log ▾` ghost buttons.
- Row 4: **Overall** progress bar 2px tall, `--fg-2` fill on `--bg-2` track.

**Log drawer** (`Show log ▾`):
- Expands the dock to 280px, exposing a `--bg-0` terminal-style log: mono 11px, `--fg-1`, ffmpeg stderr piped in, autoscroll-to-bottom unless user scrolls up. Top-right of the drawer has `Copy`, `Save…`, `Clear` icon-buttons.

---

## Interaction rules

- Multi-select: shift-click, ⌘/Ctrl-click, ⌘A / Ctrl-A.
- Right-click on a row: `Open in Finder/Explorer`, `Probe streams again`, `Remove`, `Copy filename`.
- Drag a file out of the table to drop it elsewhere (export filename).
- Keyboard: `Delete` removes selected, `Enter` opens stream picker, `Space` toggles checkbox.

---

## Out of scope for this screen

- Per-file output naming templates (move to a Settings panel).
- Codec advanced flags (move to overflow menu under the format pills, "Advanced…").
- Multi-stream extraction (one stream per file is the contract here — Merge is the place for stitching).
