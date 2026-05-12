#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI Theme System - Dark Mode and Modern Styling

Provides theme management for Tkinter with dark mode support,
custom color schemes, and typography improvements.
"""

import json
import os
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class ColorScheme:
    """Color scheme definition for UI."""
    name: str
    # Background colors (bg-0 to bg-3)
    bg_0: str  # Window background
    bg_1: str  # Panel / sidebar
    bg_2: str  # Raised surfaces, table head
    bg_3: str  # Hover, selected

    # Foreground colors (fg-0 to fg-2)
    fg_0: str  # Primary text
    fg_1: str  # Secondary text
    fg_2: str  # Tertiary, captions

    # Line color
    line: str  # Borders, dividers

    # Accent colors
    accent: str  # Primary action
    accent_2: str  # Pressed state

    # Status colors
    ok: str  # Success / ready
    warn: str  # Warning / probing
    err: str  # Error / failed

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary."""
        return {
            'name': self.name,
            'bg_0': self.bg_0,
            'bg_1': self.bg_1,
            'bg_2': self.bg_2,
            'bg_3': self.bg_3,
            'fg_0': self.fg_0,
            'fg_1': self.fg_1,
            'fg_2': self.fg_2,
            'line': self.line,
            'accent': self.accent,
            'accent_2': self.accent_2,
            'ok': self.ok,
            'warn': self.warn,
            'err': self.err,
        }


# Light Mode Theme (from design system)
THEME_LIGHT = ColorScheme(
    name='light',
    bg_0='#F7F7F5',
    bg_1='#FFFFFF',
    bg_2='#F1F1EE',
    bg_3='#E7E7E3',
    line='#DFDFD9',
    fg_0='#16181C',
    fg_1='#4B5363',
    fg_2='#8A93A4',
    accent='#2563EB',
    accent_2='#1E4FCB',
    ok='#34D399',
    warn='#F5B544',
    err='#F26D6D',
)

# Dark Mode Theme (from design system)
THEME_DARK = ColorScheme(
    name='dark',
    bg_0='#0E1014',
    bg_1='#14171D',
    bg_2='#1B1F27',
    bg_3='#232833',
    line='#262C36',
    fg_0='#E8EAEE',
    fg_1='#A6ADBB',
    fg_2='#6B7280',
    accent='#4F8CFF',
    accent_2='#1F66E0',
    ok='#34D399',
    warn='#F5B544',
    err='#F26D6D',
)


class UIThemeManager:
    """
    Manages UI theming and appearance.

    Provides theme switching, font configuration, and style management.
    """

    def __init__(self, config_file: Optional[str] = None):
        """
        Initialize theme manager.

        Args:
            config_file: Optional path to theme config file
        """
        self.config_file = config_file or os.path.expanduser('~/.ffmpeg_audio_manager_theme.json')
        self.current_theme = THEME_LIGHT
        self.dark_mode = False

        # Typography (from design system)
        self.font_sizes = {
            'page_title': 24,  # Page heading, weight 600
            'section': 15,  # Section label, uppercase, weight 600
            'body': 13,  # UI labels, normal text
            'small': 11,  # Smaller text
            'mono': 12,  # Monospace (paths, streams)
            'mono_small': 11,  # Monospace for log
        }

        # Spacing grid (4pt base)
        self.spacing = {
            'xs': 4,
            'sm': 8,
            'md': 12,
            'lg': 16,
            'xl': 20,
            'xxl': 24,
            'xxxl': 32,
        }

        # Border radius
        self.radius = {
            'sm': 6,  # Controls
            'md': 10,  # Panels
            'lg': 999,  # Pills
        }

        # Component heights
        self.heights = {
            'button_sm': 28,
            'button_md': 36,
            'button_lg': 44,
            'input_sm': 32,
            'input_md': 36,
            'table_header': 36,
            'table_row': 44,
            'status_dot': 8,
        }

        self.load_config()

    def load_config(self):
        """Load theme config from file if exists."""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    self.dark_mode = config.get('dark_mode', False)
                    self.font_sizes.update(config.get('font_sizes', {}))
                    self._apply_theme()
            except Exception:
                self._apply_theme()
        else:
            self._apply_theme()

    def save_config(self):
        """Save theme config to file."""
        try:
            config = {
                'dark_mode': self.dark_mode,
                'font_sizes': self.font_sizes,
            }
            os.makedirs(os.path.dirname(self.config_file) or '.', exist_ok=True)
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception:
            pass

    def toggle_dark_mode(self):
        """Toggle between light and dark mode."""
        self.dark_mode = not self.dark_mode
        self._apply_theme()
        self.save_config()

    def set_dark_mode(self, enabled: bool):
        """Set dark mode explicitly."""
        self.dark_mode = enabled
        self._apply_theme()
        self.save_config()

    def _apply_theme(self):
        """Apply current theme."""
        self.current_theme = THEME_DARK if self.dark_mode else THEME_LIGHT

    def get_color(self, color_key: str) -> str:
        """Get color value by key."""
        colors = self.current_theme.to_dict()
        return colors.get(color_key, '#000000')

    def get_font_size(self, size_key: str) -> int:
        """Get font size by key."""
        return self.font_sizes.get(size_key, 13)

    def get_spacing(self, key: str) -> int:
        """Get spacing value by key."""
        return self.spacing.get(key, 8)

    def get_radius(self, key: str) -> int:
        """Get border radius by key."""
        return self.radius.get(key, 6)

    def get_height(self, key: str) -> int:
        """Get component height by key."""
        return self.heights.get(key, 36)

    def configure_ttk_style(self, style):
        """
        Configure ttk.Style with current theme.

        Args:
            style: ttk.Style instance to configure
        """
        theme = self.current_theme

        style.theme_use('clam')

        # Base styles using bg_0
        style.configure('TLabel',
                       background=theme.bg_0,
                       foreground=theme.fg_0)

        style.configure('TFrame',
                       background=theme.bg_0)

        # Ghost Button (secondary)
        style.configure('TButton',
                       background=theme.bg_2,
                       foreground=theme.fg_0,
                       bordercolor=theme.line,
                       lightcolor=theme.bg_2,
                       darkcolor=theme.bg_2,
                       borderwidth=1, relief='flat', padding=8)
        style.map('TButton',
                 background=[('active', theme.bg_3), ('pressed', theme.bg_3), ('disabled', theme.bg_2)],
                 foreground=[('disabled', theme.fg_2)])

        # Primary Button (accent)
        style.configure('Accent.TButton',
                       background=theme.accent,
                       foreground='#FFFFFF',
                       borderwidth=0, relief='flat',
                       padding=8)
        style.map('Accent.TButton',
                 background=[('active', theme.accent_2), ('pressed', theme.accent_2), ('disabled', theme.bg_2)],
                 foreground=[('disabled', theme.fg_2)])

        # Danger Button
        style.configure('Danger.TButton',
                       background='transparent',
                       foreground=theme.err,
                       bordercolor=f'{theme.err}66',  # 40% alpha
                       lightcolor='transparent',
                       darkcolor='transparent',
                       borderwidth=1, relief='flat',
                       padding=8)
        style.map('Danger.TButton',
                 background=[('active', f'{theme.err}1a'), ('pressed', f'{theme.err}33'), ('disabled', theme.bg_2)],
                 foreground=[('disabled', theme.fg_2)])

        # Input fields
        style.configure('TEntry',
                       fieldbackground=theme.bg_2,
                       background=theme.bg_2,
                       foreground=theme.fg_0,
                       bordercolor=theme.line,
                       lightcolor=theme.line,
                       darkcolor=theme.line,
                       borderwidth=1, relief='flat', padding=6)

        style.configure('TCombobox',
                       fieldbackground=theme.bg_2,
                       background=theme.bg_2,
                       foreground=theme.fg_0,
                       bordercolor=theme.line,
                       arrowcolor=theme.fg_1)

        # Table (Treeview)
        style.configure('Treeview',
                       background=theme.bg_1,
                       foreground=theme.fg_0,
                       fieldbackground=theme.bg_1,
                       bordercolor=theme.line,
                       borderwidth=1, relief='flat')
        style.map('Treeview',
                 background=[('selected', theme.bg_3)],
                 foreground=[('selected', theme.fg_0)])

        style.configure('Treeview.Heading',
                       background=theme.bg_2,
                       foreground=theme.fg_2,
                       bordercolor=theme.line,
                       lightcolor=theme.bg_2,
                       darkcolor=theme.bg_2,
                       font=('', 11, 'bold'))

        # Labelframe
        style.configure('TLabelframe',
                       background=theme.bg_1,
                       foreground=theme.fg_0,
                       bordercolor=theme.line,
                       lightcolor=theme.line,
                       darkcolor=theme.line,
                       borderwidth=1, relief='flat')
        style.configure('TLabelframe.Label',
                       background=theme.bg_1,
                       foreground=theme.fg_0,
                       font=('', 13, 'bold'))

        # Checkbutton
        style.configure('TCheckbutton',
                       background=theme.bg_0,
                       foreground=theme.fg_0,
                       indicatorcolor=theme.bg_2)
        style.map('TCheckbutton',
                  indicatorcolor=[('selected', theme.accent)])

        # Radiobutton
        style.configure('TRadiobutton',
                       background=theme.bg_0,
                       foreground=theme.fg_0,
                       indicatorcolor=theme.bg_2)
        style.map('TRadiobutton',
                  indicatorcolor=[('selected', theme.accent)])

        # Progressbar
        style.configure('Horizontal.TProgressbar',
                        background=theme.accent,
                        troughcolor=theme.bg_2,
                        bordercolor=theme.line,
                        lightcolor=theme.accent,
                        darkcolor=theme.accent)

        # Panedwindow
        style.configure('TPanedwindow', background=theme.bg_0)
        style.configure('Sash', background=theme.line, bordercolor=theme.line)


class TextColors:
    """ANSI color codes for log output."""

    # Terminal colors (for progress log)
    LOG_TAGS = {
        '[OK]':        '#6ec97a',   # green
        '[ERROR]':     '#f28779',   # salmon/red
        '[EXCEPTION]': '#f28779',   # red
        '[CANCEL]':    '#ffb347',   # orange
        '[INFO]':      '#79c7e3',   # cyan
        '[WARN]':      '#ffe066',   # yellow
        '[DONE]':      '#6ec97a',   # green
        '[START]':     '#b0b0b0',   # gray
        'CMD':         '#707070',   # dim gray
    }

    @staticmethod
    def get_tag_color(tag: str) -> str:
        """Get color for log tag."""
        return TextColors.LOG_TAGS.get(tag, '#c8c8c8')


if __name__ == '__main__':
    # Test theme manager
    manager = UIThemeManager()

    print(f"Current theme: {manager.current_theme.name}")
    print(f"Dark mode: {manager.dark_mode}")

    # Test colors
    print(f"Primary BG: {manager.get_color('bg_primary')}")
    print(f"Primary FG: {manager.get_color('fg_primary')}")
    print(f"Accent: {manager.get_color('accent_primary')}")

    # Test font sizes
    print(f"Title size: {manager.get_font_size('title')}")
    print(f"Body size: {manager.get_font_size('body')}")

    # Toggle dark mode
    manager.toggle_dark_mode()
    print(f"\nAfter toggle:")
    print(f"Current theme: {manager.current_theme.name}")
    print(f"Dark mode: {manager.dark_mode}")
    print(f"Primary BG: {manager.get_color('bg_primary')}")
