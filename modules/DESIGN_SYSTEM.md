# Design System Implementation

This document describes the implementation of Phase 1 of the FFmpeg Audio Manager redesign: **Design Tokens & Base Component Styles**.

## Overview

The design system is organized into four modules:

1. **UITheme.py** — Core theme management and color schemes
2. **DesignTokens.py** — Constants for all design tokens
3. **DesignSystemComponents.py** — Reusable component factories
4. **StyleUtils.py** — Styling utilities and layout helpers

## Color Tokens

### Dark Mode (Default)

```
--bg-0      #0E1014   /* window background           */
--bg-1      #14171D   /* panel / sidebar             */
--bg-2      #1B1F27   /* raised surfaces, table head */
--bg-3      #232833   /* hover, selected             */
--line      #262C36   /* borders, dividers           */
--fg-0      #E8EAEE   /* primary text                */
--fg-1      #A6ADBB   /* secondary text              */
--fg-2      #6B7280   /* tertiary, captions          */
--accent    #4F8CFF   /* primary action              */
--accent-2  #1F66E0   /* pressed state               */
--ok        #34D399   /* success / ready             */
--warn      #F5B544   /* warning / probing           */
--err       #F26D6D   /* error / failed              */
```

### Light Mode

```
--bg-0      #F7F7F5   /* window background           */
--bg-1      #FFFFFF   /* panel / sidebar             */
--bg-2      #F1F1EE   /* raised surfaces, table head */
--bg-3      #E7E7E3   /* hover, selected             */
--line      #DFDFD9   /* borders, dividers           */
--fg-0      #16181C   /* primary text                */
--fg-1      #4B5363   /* secondary text              */
--fg-2      #8A93A4   /* tertiary, captions          */
--accent    #2563EB   /* primary action              */
--accent-2  #1E4FCB   /* pressed state               */
--ok        #34D399   /* success / ready             */
--warn      #F5B544   /* warning / probing           */
--err       #F26D6D   /* error / failed              */
```

## Typography

| Purpose | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Page Title | Inter | 24px | 600 | 1.2 |
| Section Label | Inter | 15px | 600 | 1.2 |
| Body Text | Inter | 13px | 400 | 1.45 |
| Small Text | Inter | 11px | 400 | 1.45 |
| Monospace (paths) | JetBrains Mono | 12px | 400 | 1.45 |
| Monospace (logs) | JetBrains Mono | 11px | 400 | 1.4 |

### Font Fallbacks
- UI: `-apple-system, Segoe UI Variable, Segoe UI, Inter`
- Mono: `JetBrains Mono, Consolas, Monaco`

## Spacing & Sizing

### 4pt Grid
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px
- `xxl`: 24px
- `xxxl`: 32px

### Border Radius
- `sm`: 6px (controls)
- `md`: 10px (panels)
- `lg`: 999px (pills, fully rounded)

### Component Heights
- Button: 28px (sm), 36px (md), 44px (lg)
- Input: 32px (sm), 36px (md)
- Table header: 36px
- Table rows: 44px (Extract/Merge), 48px (History)
- Sidebar item: 36px
- Status indicator: 8px dot

## Using the Theme System

### Basic Setup

```python
from modules.UITheme import UIThemeManager

theme = UIThemeManager()

# Get colors
bg = theme.get_color('bg_0')
fg = theme.get_color('fg_0')
accent = theme.get_color('accent')

# Get typography
title_size = theme.get_font_size('page_title')
mono_size = theme.get_font_size('mono')

# Get spacing
padding = theme.get_spacing('lg')
radius = theme.get_radius('md')
height = theme.get_height('button_md')
```

### Creating Styled Components

```python
from modules.DesignSystemComponents import Button, Input, Table
from modules.StyleUtils import Typography, StyledFrame

# Create a primary button
btn = Button.primary(parent, 'Extract Audio', command=on_extract, size='lg')

# Create a ghost button
cancel = Button.ghost(parent, 'Cancel', size='md')

# Create an input field
path = Input.text(parent, placeholder='Enter path...', width=40)

# Create typography
title = Typography.page_title(parent, 'Extract Audio')
subtitle = Typography.subtitle(parent, 'Probe files and extract audio')

# Create styled frames
panel = StyledFrame.panel(parent, padding=16)
raised = StyledFrame.raised(parent, padding=12)
```

### Available Components

#### Buttons (Button class)
- `Button.primary()` — Accent colored button (primary action)
- `Button.ghost()` — Subtle button (secondary action)
- `Button.danger()` — Destructive action button

Sizes: `sm` (28px), `md` (36px), `lg` (44px)

#### Inputs (Input class)
- `Input.text()` — Text input field
- `Input.select()` — Dropdown select

#### Tables (Table class)
- `Table.create()` — Styled Treeview with design tokens applied

#### Status Indicators
- `StatusDot.create()` — 8px colored dot (ok, warn, err, neutral)
- `StatusIndicator.idle()` — Idle state row
- `StatusIndicator.processing()` — Processing state with time

#### Progress Bars (ProgressBar class)
- `ProgressBar.horizontal()` — Determinate progress bar
- `ProgressBar.indeterminate()` — Indeterminate progress bar

#### Layout Utilities (StyledFrame class)
- `StyledFrame.panel()` — Panel with border and radius
- `StyledFrame.raised()` — Raised surface (bg_2)
- `StyledFrame.toolbar()` — Toolbar frame

#### Typography (Typography class)
- `Typography.page_title()` — 24px title
- `Typography.section_heading()` — 15px section label
- `Typography.subtitle()` — 13px secondary text
- `Typography.body()` — 13px primary text
- `Typography.mono()` — Monospace text (12px default)
- `Typography.small()` — 11px tertiary text

#### Separators (Separator class)
- `Separator.horizontal()` — 1px horizontal line
- `Separator.vertical()` — 1px vertical line

### Theming in TTK Styles

The UIThemeManager automatically configures ttk.Style with the new color scheme:

```python
from tkinter import ttk
from modules.UITheme import UIThemeManager

theme = UIThemeManager()
style = ttk.Style()
theme.configure_ttk_style(style)

# Now ttk widgets use the design system colors:
# - TButton: Ghost button style
# - Accent.TButton: Primary button style
# - Danger.TButton: Danger button style
# - TEntry: Input field style
# - Treeview: Table style
# - etc.
```

## Design Principles

1. **Quiet chrome, loud content** — Backgrounds recede, content stands out
2. **One primary action per screen** — CTA is unambiguous, anchored, visually heavier
3. **Progress is first-class** — Promote progress from afterthought to real region
4. **Status is ambient** — Present, glanceable, never demanding
5. **Dark mode is default** — Media work happens at night; light is alternate

## Motion & Animation

- Hover/focus: 120ms ease-out
- Panel transitions: 200ms
- Progress bars: 100ms
- Pulsing indicators: 1.5s
- No bounce or complex easing — this is a utility

## Accessibility

- Minimum contrast ratio 4.5:1 for all text (WCAG AA)
- 8px minimum touch targets
- Focus ring: 2px accent outline at 40% alpha
- Status dots always paired with labels (never bare dots)
- Icons paired with labels in navigation

## Migration Guide

### From Old System to New

Old constants (deprecated) → New module:
```python
# Old way
from UITheme import THEME_DARK
bg = THEME_DARK.bg_primary

# New way
from modules.DesignTokens import COLOR_DARK
bg = COLOR_DARK['bg_0']

# Or using manager
from modules.UITheme import UIThemeManager
theme = UIThemeManager()
bg = theme.get_color('bg_0')
```

### Creating Components

Old way (hardcoded styling):
```python
btn = tk.Button(parent, bg='#0084c8', fg='white', text='Click')
```

New way (design system):
```python
from modules.DesignSystemComponents import Button
btn = Button.primary(parent, 'Click', theme=theme)
```

## Best Practices

1. **Always use the theme manager** for colors and sizing
2. **Use component factories** instead of hardcoding styles
3. **Prefer DesignTokens constants** for repeated values
4. **Use TypeScript/type hints** to catch styling errors early
5. **Test both light and dark modes** before shipping
6. **Never hardcode colors** — use design tokens
7. **Use spacing constants** for padding/margin
8. **Pair icons with labels** in navigation and status indicators

## Files

- `UITheme.py` — Theme management, ColorScheme class, ttk style configuration
- `DesignTokens.py` — Design token constants (colors, spacing, sizing)
- `DesignSystemComponents.py` — Component factories (Button, Input, Table, etc.)
- `StyleUtils.py` — Styling utilities (Typography, StyledFrame, Separator, etc.)
- `DESIGN_SYSTEM.md` — This documentation

## Next Phases

- **Phase 2:** Extract Audio screen implementation
- **Phase 3:** Merge Audio and History screens
- **Phase 4:** Advanced features (settings, named templates, etc.)
