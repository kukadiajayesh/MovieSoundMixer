# 04 — History (speculative)

> The third sidebar item is currently disabled/empty. The redesign defines what it becomes the moment a job completes.

---

## Purpose

A persistent ledger of every Extract or Merge job the user has run, with the ability to inspect, re-run, locate outputs, and clean up. Without History the app is amnesiac — every reopened window starts from zero.

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ History                                                  ⌘K   ⋯      │
│ Every job, with logs and re-run.                                     │
│ ──────────────────────────────────────────────────────────────────── │
│ [All ▾] [This week ▾]   🔍 Search jobs              [Export…][Clear] │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │  WHEN          JOB             ITEMS       DURATION    OUTPUT    │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │  Today 14:22   Extract audio   1 file      00:42       /Audio ↗ │ │
│ │  Today 13:01   Merge audio     12 files    07:14       /Hindi ↗ │ │
│ │  Yesterday     Extract audio   3 files     02:08       /Audio ↗ │ │
│ │  May 10        Merge audio     1 file (✕)  00:11       —        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Selected job ▸ details panel (right-side, 360px) — see below        │
└──────────────────────────────────────────────────────────────────────┘
```

## Row design

- 48px row height.
- `WHEN` — relative timestamp ("Today 14:22", "Yesterday", "May 10"), `--fg-1`, on hover swap to absolute timestamp.
- `JOB` — icon (⬇ extract / ⤴ merge) + verb label, `--fg-0`.
- `ITEMS` — count + state pill if not all-OK: `12 files · ✓` or `3 files · 1 failed`.
- `DURATION` — mono `--fg-1`.
- `OUTPUT` — clickable path, opens in Finder/Explorer. Failed jobs show em-dash.
- Click row → details panel slides in from the right.

## Details panel (selected job)

- Header: job verb + completion icon + timestamp.
- Per-item list: filename · status dot · individual log link.
- Footer actions:
  - **Re-run job** (reconstructs the Extract/Merge state and bounces back to that screen, pre-filled).
  - **Open output folder**.
  - **Copy ffmpeg command** (yes — power users want this).
  - **Delete from history** (does not delete files).

## Empty state

- The current disabled-text "History" is gone. When zero jobs exist, the content area shows a single line, centered, `--fg-2`: `Completed jobs will appear here.` No illustration.

## Persistence

- SQLite or a JSON line-log in the user's app-data dir. Bounded to 1000 entries with rolling truncation; expose retention in Settings.
