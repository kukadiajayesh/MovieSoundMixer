# 03 — Merge Audio

> Attach an external audio track to a set of video files. The auto-matching by `SxxExx` episode code is the killer feature; the redesign should celebrate it instead of burying it in a tooltip.

---

## Current state — review

Reading the screenshot top to bottom:

1. **Page header** — "Merge Audio" with a long inline subtitle: *"Add an external audio track to videos. Auto-matches by episode (SxxExx)."* The subtitle is so long that on a smaller window it crowds the title.
2. **Audio Folder row** — `Audio Folder:` label + wide empty input + `Browse…`. This is the first piece of state the user must set, but it sits at the same visual weight as everything else.
3. **Toolbar** — `+ Add Videos`, `+ Add Video Folder…` (clipped to `+ Add Video Folde[r]` because the button is too narrow), a vertical separator, `Remove Selected`, `Clear All`, and a *trailing empty input* with no label.
4. **Table** — Columns: `#`, `Video File`, `Audio File (double-click or click cell to pick)`.
   - The selected row (`Ikkis (2026)…` ↔ `In.Your.Dreams.2025…`) is highlighted royal blue end-to-end, which is fine for selection but visually heavy and makes the matched filename hard to read.
   - The instruction is buried inside the **column header**.
5. **Helper text below the table** — `Audio files are matched automatically by episode (SxxExx). Double-click a row or…` and then the second line is cropped by the progress block!
6. **Progress block** — identical to Extract: bold heading, "Idle", "Stop", "Show Log", `Current File`, `Overall Progress`. Same problems.
7. **No primary CTA visible.** There is no "Merge" button anywhere on screen. The most important action on the page is missing or below the fold.

---

## Specific problems

- **No primary action on screen.** Catastrophic. The user has nowhere to go.
- **Auto-matching is invisible.** The marquee feature of this screen — picking a folder and watching the app pair up videos with their audio counterparts — is reduced to grey helper text under a table.
- **Match quality is uncommunicated.** The user can't tell whether a pairing is a confident `S01E03 ↔ S01E03` match, a fuzzy match, or a manual override. Everything looks the same blue.
- **Clipped buttons.** `+ Add Video Folde[r]` is a visible quality regression.
- **Two confusing inputs.** Audio Folder is labeled; the right-side empty box on the toolbar is unlabeled.
- **Helper text overlapped by the Progress section.** A layout failure.

---

## Target layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Merge Audio                                              ⌘K   ⋯      │
│ Attach an external audio track to videos.                            │
│ ──────────────────────────────────────────────────────────────────── │
│ ┌── Audio source ─────────────────────────────────────────────────┐  │
│ │ 📁 /Volumes/Drobo/Audio/Hindi · 12 files                  [Change]│ │
│ │     ✓  S01E01..S01E12 detected · Hindi · EAC3                    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [⊕ Add videos] [⊕ Add video folder]   🔍 Search       [⌫] [Clear all]│
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ #  VIDEO                            EP    →  AUDIO        MATCH  │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ 1  Ikkis (2026) Hindi 1080p…mkv     S01E01 → In.Your.Dreams.…mkv ✓│ │
│ │                                                                  │ │
│ │     (no more videos · drop more here)                            │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ──────────────────────────────────────────────────────────────────── │
│ Output    Same as video  ▾                            [⚙ Options]    │
│                                                                      │
│                                       ┌───────────────────────────┐  │
│                                       │  ⤴  Merge 1 file          │  │
│                                       └───────────────────────────┘  │
│ ──────────────────────────────────────────────────────────────────── │
│ ● Idle · ready to merge                              Show log ▾      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Section-by-section transformation

### 1. Page header

- Same pattern as Extract Audio: 24/600 title, 13/400 subtitle. Trim the subtitle to one short clause; the "Auto-matches by episode (SxxExx)" half belongs on the Audio Source card (§2), where it's *demonstrated*, not promised.

### 2. Audio source card — NEW, top of content

This is the most important elevation. The audio folder isn't just an input — it's the **state** that drives auto-matching.

- A `--bg-1` card with 1px `--line`, 10px radius, 16px padding.
- Section label `AUDIO SOURCE` in 11/uppercase/tracking-0.08em, `--fg-2`.
- Empty state: a single dashed-border drop zone, 96px tall, copy `Drop an audio folder here, or [Browse…]`.
- Populated state, two stacked rows:
  - **Row 1**: 📁 icon + path (mono 12px middle-ellipsis) + file count pill + ghost `Change` button on the right.
  - **Row 2** — the *match summary*. Auto-detected and live:
    - `✓ S01E01..S01E12 detected · Hindi · EAC3 6ch` — green-tinted text.
    - If detection is mixed: `⚠ 8 episodes detected, 4 unmatched filenames` — warn-tinted, with a `Review…` link.

### 3. Toolbar

Identical pattern to Extract Audio's toolbar (§02-2). All buttons sized to their content with generous internal padding — **never truncate a label**. If running out of room, collapse `+ Add video folder` to `⊕ Folder` and put the full label in a tooltip.

The unlabeled empty input from the current screen is removed. Search goes here, only when ≥1 row exists.

### 4. Matching table — the heart of the screen

Replace the 3-column table. New columns:

| Col       | Width    | Content                                                        |
|-----------|----------|----------------------------------------------------------------|
| `#`       | 32px     | mono row index, `--fg-2`                                       |
| `VIDEO`   | flex     | filename (mono 12), middle ellipsis                            |
| `EP`      | 80px     | episode tag pill `S01E01` in mono 11, on `--bg-2`              |
| `→`       | 16px     | arrow glyph `--fg-2`, only shown when matched                  |
| `AUDIO`   | flex     | matched audio filename, or "Pick file…" ghost button if unset  |
| `MATCH`   | 80px     | confidence indicator (see below)                               |

**Match confidence indicator:**
- `✓ Exact`   — `--ok`, episode code in both filenames is identical
- `~ Fuzzy`   — `--warn`, fuzzy filename or alternative numbering matched
- `✎ Manual`  — `--accent`, user overrode
- `— Unmatched` — `--fg-2`, italic; row also gets a left-edge 2px `--warn` bar

Selection state: replace the full-bleed royal-blue highlight with a subtle `--bg-3` background + 2px left `--accent` bar. Filenames stay readable.

**Click affordances:**
- Click the Audio cell → open a picker scoped to the Audio Source folder, with the current episode code pre-filtered.
- Drag-and-drop an audio file onto a row to set/replace its pairing.
- Right-click row: `Pick audio…`, `Detect episode again`, `Clear pairing`, `Remove video`.

**Empty / drop hint** lives *inside the last visible row of the table*, never below it, so the Progress section can never overlap.

### 5. Output + options

Compact strip beneath the table:

- **Output destination** dropdown: `Same as video folder`, `Audio source folder`, `Choose…`. Default first.
- **Options** ghost button — opens a popover for muxing details: `Make Hindi the default track`, `Keep existing audio tracks`, `Container: mkv | mp4`, `Set track name…`. Sensible defaults so a casual user never opens this.

### 6. Primary CTA

- Identical pattern to Extract Audio's CTA.
- Label is dynamic and counts: `Merge 1 file`, `Merge 12 files`. Empty state label: `Merge` (disabled).
- Icon: `⤴` (or `git-merge` from Lucide).
- Disabled if any row has `Unmatched` status or no Audio Source set. Hovering the disabled CTA reveals a tooltip with the blocking reason.

### 7. Progress dock

Same dock as Extract Audio (see `02_extract_audio.md` §6). The dock is a shared shell component — both screens consume it. Only the verb in the running label differs (`Extracting…` vs `Merging…`).

---

## Interaction edge-cases the redesign must cover

- **Re-pair on drop.** Dragging a new audio file onto an already-paired row replaces the pairing and flips match to `Manual`.
- **Mismatch warnings.** If video count > matched count, surface a banner above the table: `4 videos have no audio match · [Review unmatched]`.
- **Folder re-scan.** Changing Audio Source should re-run matching with a 200ms fade on row updates so the user can see what changed.
- **Conflict.** Two videos detected with the same `SxxExx` → highlight both rows with `--warn` and force manual disambiguation.
- **Live counts in CTA.** "Merge 12 files" must update as rows are added, removed, or unmatched.

---

## Out of scope for this screen

- Subtitle muxing (a separate "Merge Subtitles" screen, not in this brief).
- Re-encoding video (this screen is mux-only; mention this implicitly via fast progress).
- Naming templates for output files — overflow menu → Settings.
