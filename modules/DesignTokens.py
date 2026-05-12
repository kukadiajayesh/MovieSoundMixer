#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Design Tokens - Constants for the redesigned UI

Defines all design system tokens (colors, typography, spacing, sizing)
from 00_design_system.md and 05_components.md.
"""

# ─ Typography ───────────────────────────────────────────────────────────────
# Font families (system defaults when not available)
FONT_UI = 'Inter'  # Fallback: -apple-system, Segoe UI Variable, Segoe UI
FONT_MONO = 'JetBrains Mono'  # For paths, streams, log

# Font sizes (in points)
FONT_SIZE_PAGE_TITLE = 24  # Page heading, weight 600
FONT_SIZE_SECTION = 15    # Section label, 11px uppercase (11 for mock-up purposes)
FONT_SIZE_BODY = 13       # UI labels, normal text, 1.45 line-height
FONT_SIZE_SMALL = 11      # Smaller labels
FONT_SIZE_MONO = 12       # Monospace for filenames, streams, sizes
FONT_SIZE_MONO_SMALL = 11 # Monospace for log output

# Font weights
FONT_WEIGHT_NORMAL = 400
FONT_WEIGHT_SEMI_BOLD = 600
FONT_WEIGHT_BOLD = 700

# ─ Colors (Dark mode) ────────────────────────────────────────────────────────
COLOR_DARK = {
    'bg_0': '#0E1014',  # window background
    'bg_1': '#14171D',  # panel / sidebar
    'bg_2': '#1B1F27',  # raised surfaces, table head
    'bg_3': '#232833',  # hover, selected
    'line': '#262C36',  # borders
    'fg_0': '#E8EAEE',  # primary text
    'fg_1': '#A6ADBB',  # secondary text
    'fg_2': '#6B7280',  # tertiary, captions
    'accent': '#4F8CFF',  # primary action
    'accent_2': '#1F66E0',  # pressed
    'ok': '#34D399',    # success / ready
    'warn': '#F5B544',  # warning / probing
    'err': '#F26D6D',   # error / failed
}

# ─ Colors (Light mode) ───────────────────────────────────────────────────────
COLOR_LIGHT = {
    'bg_0': '#F7F7F5',  # window background
    'bg_1': '#FFFFFF',  # panel / sidebar
    'bg_2': '#F1F1EE',  # raised surfaces, table head
    'bg_3': '#E7E7E3',  # hover, selected
    'line': '#DFDFD9',  # borders
    'fg_0': '#16181C',  # primary text
    'fg_1': '#4B5363',  # secondary text
    'fg_2': '#8A93A4',  # tertiary, captions
    'accent': '#2563EB',  # primary action
    'accent_2': '#1E4FCB',  # pressed
    'ok': '#34D399',    # success / ready
    'warn': '#F5B544',  # warning / probing
    'err': '#F26D6D',   # error / failed
}

# ─ Spacing (4pt grid) ────────────────────────────────────────────────────────
SPACING = {
    'xs': 4,
    'sm': 8,
    'md': 12,
    'lg': 16,
    'xl': 20,
    'xxl': 24,
    'xxxl': 32,
}

# ─ Border Radius ─────────────────────────────────────────────────────────────
RADIUS = {
    'sm': 6,    # Controls
    'md': 10,   # Panels
    'lg': 999,  # Pills / fully rounded
}

# ─ Component Heights ─────────────────────────────────────────────────────────
HEIGHT = {
    'button_sm': 28,
    'button_md': 36,
    'button_lg': 44,
    'input_sm': 32,
    'input_md': 36,
    'table_header': 36,
    'table_row': 44,
    'table_row_history': 48,  # History screen uses taller rows
    'sidebar_item': 36,
    'status_footer_item': 24,
    'status_dot': 8,
    'progress_bar_primary': 4,
    'progress_bar_overall': 2,
}

# ─ Widths and Sizing ─────────────────────────────────────────────────────────
WIDTH = {
    'sidebar': 220,
    'toast_max': 320,
    'modal_default': 480,
    'search_field_max': 240,
    'dropdown_min': 220,
    'scroll_track': 8,
}

# ─ Component Specs ───────────────────────────────────────────────────────────
BUTTON = {
    'padding_horizontal': {
        'sm': 14,   # 1.5 * 28 / 3
        'md': 27,   # 1.5 * 36 / 2
        'lg': 33,   # 1.5 * 44 / 2
    },
    'border_width': 0,
    'focus_ring': 2,
    'focus_alpha': 0.4,
}

INPUT = {
    'height_sm': 32,
    'height_md': 36,
    'padding_horizontal': 8,
    'padding_horizontal_select': 12,  # room for chevron
    'border_width': 1,
    'border_width_focus': 1.5,
}

TABLE = {
    'border_radius': 10,
    'border_width': 1,
    'header_height': 36,
    'header_padding': 12,
    'row_height_extract': 44,
    'row_height_history': 48,
    'row_padding': 12,
    'cell_padding': 12,
}

TOAST = {
    'max_width': 320,
    'padding': 12,
    'radius': 10,
    'auto_dismiss_success_ms': 6000,
    'drop_shadow': '0 12px 32px rgba(0,0,0,0.4)',
}

MODAL = {
    'width': 480,
    'radius': 12,
    'padding': 24,
    'background_dim': 'rgba(0,0,0,0.5)',
    'border_width': 0,
}

# ─ Motion / Animation ────────────────────────────────────────────────────────
MOTION = {
    'duration_short': 120,      # Hover/focus (ms)
    'duration_medium': 200,     # Panel transitions (ms)
    'easing': 'ease-out',
    'progress_bar_duration': 100,  # Width changes
    'pulse_duration': 1500,     # Pulsing status dots
    'progress_chip_duration': 1400,  # Indeterminate bar
}

# ─ Helper function ───────────────────────────────────────────────────────────
def get_colors(dark_mode: bool = True) -> dict:
    """
    Get color palette for a theme mode.

    Args:
        dark_mode: True for dark colors, False for light

    Returns:
        Dictionary of color tokens
    """
    return COLOR_DARK if dark_mode else COLOR_LIGHT
