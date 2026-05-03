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
    bg_primary='#ffffff',
    bg_secondary='#f5f5f5',
    bg_tertiary='#fafafa',
    # Foreground
    fg_primary='#222222',
    fg_secondary='#555555',
    fg_muted='#999999',
    # Accents
    accent_primary='#0066cc',
    accent_success='#228b22',
    accent_error='#dc3545',
    accent_warning='#ff9800',
    # Borders
    border_color='#cccccc',
    border_light='#eeeeee',
    # Selection
    selection_bg='#0066cc',
    selection_fg='#ffffff',
)

# Dark Mode Theme
THEME_DARK = ColorScheme(
    name='dark',
    # Backgrounds
    bg_primary='#1e1e1e',
    bg_secondary='#2d2d2d',
    bg_tertiary='#3d3d3d',
    # Foreground
    fg_primary='#e0e0e0',
    fg_secondary='#b0b0b0',
    fg_muted='#808080',
    # Accents
    accent_primary='#4da6ff',
    accent_success='#66bb6a',
    accent_error='#ef5350',
    accent_warning='#ffa726',
    # Borders
    border_color='#404040',
    border_light='#353535',
    # Selection
    selection_bg='#4da6ff',
    selection_fg='#1e1e1e',
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
                       borderwidth=1)
        style.map('TButton',
                 background=[('active', theme.accent_primary), ('pressed', theme.accent_primary)])

        # Configure Accent.TButton
        style.configure('Accent.TButton',
                       background=theme.accent_primary,
                       foreground='#ffffff',
                       borderwidth=0,
                       padding=6)

        # Configure TEntry
        style.configure('TEntry',
                       fieldbackground=theme.bg_tertiary,
                       background=theme.bg_tertiary,
                       foreground=theme.fg_primary,
                       borderwidth=1)

        # Configure TCombobox
        style.configure('TCombobox',
                       fieldbackground=theme.bg_tertiary,
                       background=theme.bg_tertiary,
                       foreground=theme.fg_primary)

        # Configure TTreeview
        style.configure('Treeview',
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       fieldbackground=theme.bg_tertiary,
                       borderwidth=0)
        style.map('Treeview',
                 background=[('selected', theme.selection_bg)],
                 foreground=[('selected', theme.selection_fg)])

        # Configure TLabelFrame
        style.configure('TLabelFrame',
                       background=theme.bg_primary,
                       foreground=theme.fg_primary,
                       borderwidth=1)

        # Configure TRadiobutton
        style.configure('TRadiobutton',
                       background=theme.bg_primary,
                       foreground=theme.fg_primary)

        # Configure TCheckbutton
        style.configure('TCheckbutton',
                       background=theme.bg_primary,
                       foreground=theme.fg_primary)


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
