# FFmpeg Audio Manager — Redesign Prompt Pack

This folder is a complete brief for transforming the current Tkinter build of **FFmpeg Audio Manager** into a modern desktop tool. Each file is independently usable; together they form a single coherent system.

## How to use this pack

1. Read `00_design_system.md` first. It establishes tokens, type, color, spacing, and "don'ts" that govern every other file.
2. Read `05_components.md` second. Build these atoms once.
3. Then work screen-by-screen in numeric order:
   - `01_app_shell.md` — sidebar, status footer, page header chrome.
   - `02_extract_audio.md` — Extract Audio screen.
   - `03_merge_audio.md` — Merge Audio screen.
   - `04_history.md` — History screen (currently empty in the source).
4. Implement dark mode and light mode in parallel; both are first-class.

## What you are transforming

The source is a Python/Tkinter desktop app with four states captured in the project uploads:

- Extract Audio — light
- Extract Audio — dark
- Merge Audio — light
- Merge Audio — dark

Every screen has a left "Workspace" sidebar, a status footer with three readiness rows and a Dark Mode toggle, and a content pane with title + toolbar + table + progress block.

## What the redesign is **not**

- Not a web app. Layouts assume a native desktop window 1280×800+.
- Not a rebrand or company clone. The visual system is original.
- Not a rewrite of functionality. Every capability in the source is preserved.

## Headline changes

- One clear primary CTA per screen, anchored bottom-right.
- Real type hierarchy — page title, section label, body, mono.
- A proper progress dock that scales from a single idle row to a full log drawer.
- A celebrated, visible auto-match indicator on the Merge screen.
- Status dots replace emoji-style indicators in the footer.
- Light and dark mode share component tokens via `--bg-N` ladders.

## Out of scope

Settings, subtitle muxing, naming templates, advanced codec flags, and per-user presets are referenced but not specified in this pack. Treat them as future screens that should inherit this system unchanged.
