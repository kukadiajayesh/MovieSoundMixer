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
    # Background colors
    bg_primary: str  # Main background
    bg_secondary: str  # Panel backgrounds
    bg_tertiary: str  # Input fields

    # Foreground colors
    fg_primary: str  # Main text
    fg_secondary: str  # Secondary text
    fg_muted: str  # Disabled/muted text

    # Accent colors
    accent_primary: str  # Buttons, highlights
    accent_success: str  # Success messages
    accent_error: str  # Error messages
    accent_warning: str  # Warning messages

    # Border colors
    border_color: str  # Input borders
    border_light: str  # Light dividers

    # Special
    selection_bg: str  # Selection highlight
    selection_fg: str  # Selection text color

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary."""
        return {
            'name': self.name,
            'bg_primary': self.bg_primary,
            'bg_secondary': self.bg_secondary,
            'bg_tertiary': self.bg_tertiary,
            'fg_primary': self.fg_primary,
            'fg_secondary': self.fg_secondary,
            'fg_muted': self.fg_muted,
            'accent_primary': self.accent_primary,
            'accent_success': self.accent_success,
            'accent_error': self.accent_error,
            'accent_warning': self.accent_warning,
            'border_color': self.border_color,
            'border_light': self.border_light,
            'selection_bg': self.selection_bg,
            'selection_fg': self.selection_fg,
        }


# Light Mode Theme
THEME_LIGHT = ColorScheme(
    name='light',
    # Backgrounds
    bg_primary='#fbfbfe',
    bg_secondary='#f3f4f8',
    bg_tertiary='#e8e9ef',
    # Foreground
    fg_primary='#1f2126',
    fg_secondary='#51545d',
    fg_muted='#a6aab3',
    # Accents
    accent_primary='#0084c8',
    accent_success='#27ae60',
    accent_error='#c0392b',
    accent_warning='#d68910',
    # Borders
    border_color='#d4d6de',
    border_light='#e4e5eb',
    # Selection
    selection_bg='#0084c8',
    selection_fg='#ffffff',
)

# Dark Mode Theme
THEME_DARK = ColorScheme(
    name='dark',
    # Backgrounds
    bg_primary='#1c1d22',
    bg_secondary='#232429',
    bg_tertiary='#2b2d34',
    # Foreground
    fg_primary='#eef0f5',
    fg_secondary='#bdc0c6',
    fg_muted='#656870',
    # Accents
    accent_primary='#0084c8',
    accent_success='#27ae60',
    accent_error='#c0392b',
    accent_warning='#d68910',
    # Borders
    border_color='#373a43',
    border_light='#2e3037',
    # Selection
    selection_bg='#0084c8',
    selection_fg='#ffffff',
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

        # Font sizes (for typography improvements)
        self.font_sizes = {
            'title': 20,  # Large titles
            'heading': 14,  # Section headings
            'body': 10,  # Normal text
            'small': 9,  # Small text
            'mono': 10,  # Monospace/code
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
        return self.font_sizes.get(size_key, 10)

    def configure_ttk_style(self, style):
        """
        Configure ttk.Style with current theme.

        Args:
            style: ttk.Style instance to configure
        """
        theme = self.current_theme

        # Configure general styles
        style.theme_use('clam')

        # Configure TLabel
        style.configure('TLabel',
                       background=theme.bg_primary,
                       foreground=theme.fg_primary)

        # Configure TFrame
        style.configure('TFrame',
                       background=theme.bg_primary)

        # Configure TButton
        style.configure('TButton',
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       bordercolor=theme.border_color,
                       lightcolor=theme.bg_secondary,
                       darkcolor=theme.bg_secondary,
                       borderwidth=0, relief='flat', padding=6)
        style.map('TButton',
                 background=[('active', theme.bg_tertiary), ('pressed', theme.bg_tertiary)])

        # Configure Accent.TButton
        style.configure('Accent.TButton',
                       background=theme.accent_primary,
                       foreground='#ffffff',
                       borderwidth=0, relief='flat',
                       padding=6)
        style.map('Accent.TButton',
                 background=[('active', theme.accent_primary)])

        # Configure Danger.TButton
        style.configure('Danger.TButton',
                       background=theme.accent_error,
                       foreground='#ffffff',
                       borderwidth=0, relief='flat',
                       padding=6)
        style.map('Danger.TButton',
                 background=[('active', theme.accent_error), ('disabled', theme.bg_secondary)])

        # Configure TEntry
        style.configure('TEntry',
                       fieldbackground=theme.bg_secondary,
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       bordercolor=theme.border_color,
                       lightcolor=theme.border_color,
                       darkcolor=theme.border_color,
                       borderwidth=0, relief='flat', padding=6)

        # Configure TCombobox
        style.configure('TCombobox',
                       fieldbackground=theme.bg_secondary,
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       bordercolor=theme.border_color,
                       arrowcolor=theme.fg_secondary)

        # Configure TTreeview
        style.configure('Treeview',
                       background=theme.bg_primary,
                       foreground=theme.fg_primary,
                       fieldbackground=theme.bg_primary,
                       bordercolor=theme.border_color,
                       borderwidth=0, relief='flat', padding=6)
        style.map('Treeview',
                 background=[('selected', theme.selection_bg)],
                 foreground=[('selected', theme.selection_fg)])

        style.configure('Treeview.Heading',
                       background=theme.bg_secondary,
                       foreground=theme.fg_secondary,
                       bordercolor=theme.border_color,
                       lightcolor=theme.bg_secondary,
                       darkcolor=theme.bg_secondary,
                       font=('', 9, 'bold'))

        # Configure TLabelFrame
        style.configure('TLabelframe',
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       bordercolor=theme.border_color,
                       lightcolor=theme.border_color,
                       darkcolor=theme.border_color,
                       borderwidth=0, relief='flat', padding=6)
        style.configure('TLabelframe.Label',
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       font=('', 10, 'bold'))

        # Configure TRadiobutton
        style.configure('TRadiobutton',
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       indicatorcolor=theme.bg_primary)
        style.map('TRadiobutton',
                  indicatorcolor=[('selected', theme.accent_primary)])

        # Configure TCheckbutton
        style.configure('TCheckbutton',
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       indicatorcolor=theme.bg_primary)
        style.map('TCheckbutton',
                  indicatorcolor=[('selected', theme.accent_primary)])

        # Progressbar
        style.configure('Horizontal.TProgressbar',
                        background=theme.accent_primary,
                        troughcolor=theme.border_color,
                        bordercolor=theme.border_color,
                        lightcolor=theme.accent_primary,
                        darkcolor=theme.accent_primary)

        # PanedWindow
        style.configure('TPanedwindow', background=theme.bg_primary)
        style.configure('Sash', background=theme.border_color, bordercolor=theme.border_color)


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
