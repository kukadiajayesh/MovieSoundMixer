# Phase 2 Implementation: Extract Audio Screen Redesign

## Summary
Successfully redesigned the Extract Audio screen using Phase 1 design tokens.

## Changes Made

### 1. Page Header (Lines 654-680)
- **Title:** Changed from 16px regular to 24px bold using `Typography.page_title()`
- **Subtitle:** Changed to 13px secondary text using `Typography.subtitle()`
- **Separator:** Added 1px divider using `Separator.horizontal()`
- **Clear button:** Moved from header to toolbar (better UX per spec)

### 2. Toolbar Redesign (Lines 683-738)
- **Layout:** Split into two visual groups with divider
  - **Left group:** File operations (⊕ Add files, ⊕ Folder)
  - **Divider:** 1px vertical line (line token)
  - **Right group:** Search, Remove, Clear buttons
- **Search field:** Integrated magnifier icon, max 240px width
- **Ready counter:** Moved to far right
- **Colors:** All using design tokens (bg_0, fg_0, fg_1, fg_2, line)
- **Spacing:** 4pt grid (8px, 12px, 16px padding)

### 3. File Table (Lines 740-786)
- **Container:** Bordered panel using line token (1px border)
- **Columns:** Removed '#' column, kept FILE, SIZE, STREAM, STATUS
- **Headers:** Styled with bg_2, fg_2 (tertiary text), uppercase labels
- **Row height:** 44px per spec (design tokens)
- **Styling:** Using Treeview style from UITheme with design tokens
- **Scrollbars:** Thin overlay scrollbars (8px, hidden when not scrolling)

### 4. Output & Format Section (Lines 789-872)
- **Output folder row:**
  - Label: fg_1 (secondary), 12px
  - Input: bg_2 background, line border
  - Browse button: Ghost style
- **Format row:** Radio buttons for codec selection
  - Default: "Copy (no re-encode)" (fast path encouraged)
  - Options: MP3, AAC, FLAC
  - Styling: bg_0 background, fg_0 text, design token colors

### 5. Primary CTA Button (Lines 874-887)
- **Position:** Anchored bottom-right per spec
- **Style:** Solid accent background, white text, bold 13px
- **Height:** 44px (button_lg per spec)
- **Width:** 224px (28 char * 8px)
- **Label:** "▸ Extract audio" with play icon
- **State:** Active/press uses accent_2 (darker blue)
- **Disabled state:** bg_2 background, fg_2 text (implemented in logic)

## Design Tokens Applied

✓ Colors: bg_0 (window), bg_1 (panels), bg_2 (raised), bg_3 (hover), line, fg_0/1/2, accent
✓ Typography: 24px title, 13px body, 12px labels, 11px small
✓ Spacing: 4, 8, 12, 16, 20px using 4pt grid
✓ Component heights: 36px (button_md), 44px (button_lg), 44px (table row)
✓ Border radius: 6px (controls), 10px (panels) from design tokens

## What's Next

### Remaining Tasks for Full Extract Screen:
1. **Stream selector dropdown** — Implement proper menu button (not in this phase)
2. **Status indicators** — Implement colored dots + pulsing for "Probing" state
3. **Progress dock** — Implement idle state (32px row) and running state (96px+ dock)
4. **Drag-and-drop** — Add visual affordance for file drop zone
5. **Context menu** — Right-click actions (Open in Finder, Probe again, etc.)

### Phase 3 Tasks:
- Redesign Merge Audio screen
- Redesign History screen
- Update app shell (sidebar, status footer)
- Implement theme toggle with proper styling

## Testing Notes

✓ Application launches without errors
✓ All design tokens load correctly
✓ Colors applied to UI elements
✓ Toolbar layout working
✓ Table displays with proper styling
✓ No visual regressions in existing functionality

## Files Modified

- `FFmpegAudioManager.py` — Extract Audio panel (_build_extract_panel method)

## Files Created/Used

- `modules/UITheme.py` — Theme management with design tokens
- `modules/DesignTokens.py` — Design token constants
- `modules/DesignSystemComponents.py` — Component factories
- `modules/StyleUtils.py` — Styling utilities (Typography, Separator, etc.)
- `modules/DESIGN_SYSTEM.md` — Design system documentation
