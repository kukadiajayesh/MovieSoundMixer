#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Style Utilities - Helpers for applying design system styles to widgets

Provides functions for common styling patterns: borders, padding, backgrounds, etc.
"""

import tkinter as tk
from modules.UITheme import UIThemeManager
from modules.DesignTokens import SPACING, RADIUS, HEIGHT


class StyledFrame:
    """Helper for creating properly styled container frames."""

    @staticmethod
    def panel(
        parent,
        bg: str = None,
        radius: int = 10,
        border: bool = True,
        padding: int = 16,
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """
        Create a styled panel frame (bg_1 with border and radius).

        Args:
            parent: Parent widget
            bg: Override background color
            radius: Border radius (6, 10, or 999)
            border: Whether to draw border
            padding: Internal padding
            theme: Theme manager

        Returns:
            Configured frame widget
        """
        theme = theme or UIThemeManager()
        bg = bg or theme.get_color('bg_1')

        frame = tk.Frame(
            parent,
            bg=bg,
            relief='flat',
            bd=0,
        )

        # Note: True rounded corners + borders are limited in Tkinter
        # A production version would use Canvas-based rounded rectangles
        # For now, we use Frame with borderwidth=1

        if border:
            frame.config(bd=1, relief='solid', highlightcolor=theme.get_color('line'))

        return frame

    @staticmethod
    def raised(
        parent,
        bg: str = None,
        padding: int = 12,
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """Create a raised surface (bg_2)."""
        theme = theme or UIThemeManager()
        bg = bg or theme.get_color('bg_2')

        return tk.Frame(
            parent,
            bg=bg,
            relief='flat',
            bd=0,
        )

    @staticmethod
    def toolbar(
        parent,
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """Create a toolbar frame with separator below."""
        theme = theme or UIThemeManager()

        frame = tk.Frame(parent, bg=theme.get_color('bg_0'), height=40, relief='flat', bd=0)
        frame.pack_propagate(False)

        return frame


class Separator:
    """Factory for creating separator lines."""

    @staticmethod
    def horizontal(
        parent,
        color: str = None,
        height: int = 1,
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """Create a horizontal separator line."""
        theme = theme or UIThemeManager()
        color = color or theme.get_color('line')

        sep = tk.Frame(parent, bg=color, height=height, relief='flat', bd=0)
        return sep

    @staticmethod
    def vertical(
        parent,
        color: str = None,
        width: int = 1,
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """Create a vertical separator line."""
        theme = theme or UIThemeManager()
        color = color or theme.get_color('line')

        sep = tk.Frame(parent, bg=color, width=width, relief='flat', bd=0)
        return sep


class Typography:
    """Helper for applying typography styles."""

    @staticmethod
    def page_title(
        parent,
        text: str,
        theme: UIThemeManager = None,
    ) -> tk.Label:
        """Create a page title (24px, weight 600)."""
        theme = theme or UIThemeManager()

        return tk.Label(
            parent,
            text=text,
            bg=theme.get_color('bg_0'),
            fg=theme.get_color('fg_0'),
            font=('', 24, 'bold'),
        )

    @staticmethod
    def section_heading(
        parent,
        text: str,
        theme: UIThemeManager = None,
    ) -> tk.Label:
        """Create a section heading (15px, uppercase, weight 600)."""
        theme = theme or UIThemeManager()

        return tk.Label(
            parent,
            text=text.upper(),
            bg=theme.get_color('bg_1'),
            fg=theme.get_color('fg_2'),
            font=('', 11, 'bold'),
        )

    @staticmethod
    def subtitle(
        parent,
        text: str,
        theme: UIThemeManager = None,
    ) -> tk.Label:
        """Create a subtitle (13px, secondary text)."""
        theme = theme or UIThemeManager()

        return tk.Label(
            parent,
            text=text,
            bg=theme.get_color('bg_0'),
            fg=theme.get_color('fg_1'),
            font=('', 12),
            wraplength=400,
            justify='left',
        )

    @staticmethod
    def body(
        parent,
        text: str,
        theme: UIThemeManager = None,
    ) -> tk.Label:
        """Create body text (13px)."""
        theme = theme or UIThemeManager()

        return tk.Label(
            parent,
            text=text,
            bg=theme.get_color('bg_0'),
            fg=theme.get_color('fg_0'),
            font=('', 13),
        )

    @staticmethod
    def mono(
        parent,
        text: str,
        size: int = 12,
        color: str = None,
        theme: UIThemeManager = None,
    ) -> tk.Label:
        """Create monospace text (for paths, streams, etc)."""
        theme = theme or UIThemeManager()
        color = color or theme.get_color('fg_0')

        return tk.Label(
            parent,
            text=text,
            bg=theme.get_color('bg_0'),
            fg=color,
            font=('JetBrains Mono', size),
        )

    @staticmethod
    def small(
        parent,
        text: str,
        theme: UIThemeManager = None,
    ) -> tk.Label:
        """Create small text (11px, tertiary color)."""
        theme = theme or UIThemeManager()

        return tk.Label(
            parent,
            text=text,
            bg=theme.get_color('bg_0'),
            fg=theme.get_color('fg_2'),
            font=('', 11),
        )


class Padding:
    """Helper for creating padded containers."""

    @staticmethod
    def create(
        parent,
        padding: int = 16,
        bg: str = None,
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """Create a frame that serves as a padding container."""
        theme = theme or UIThemeManager()
        bg = bg or theme.get_color('bg_0')

        frame = tk.Frame(parent, bg=bg)
        frame.pack(padx=padding, pady=padding, fill='both', expand=True)
        return frame


class DropZone:
    """Helper for creating drag-and-drop zones."""

    @staticmethod
    def create(
        parent,
        on_drop: callable = None,
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """
        Create a drop zone frame.

        Args:
            parent: Parent widget
            on_drop: Callback when files are dropped
            theme: Theme manager

        Returns:
            Frame configured as drop zone
        """
        theme = theme or UIThemeManager()

        frame = tk.Frame(
            parent,
            bg=theme.get_color('bg_1'),
            relief='solid',
            bd=1,
            highlightthickness=2,
            highlightcolor=theme.get_color('accent'),
        )

        label = tk.Label(
            frame,
            text='Drop video files here  ·  or use + Add files',
            bg=theme.get_color('bg_1'),
            fg=theme.get_color('fg_2'),
            font=('JetBrains Mono', 11),
        )
        label.pack(expand=True)

        return frame


class StatusIndicator:
    """Helper for creating status indicators."""

    @staticmethod
    def idle(
        parent,
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """Create an idle state indicator."""
        theme = theme or UIThemeManager()

        frame = tk.Frame(parent, bg=theme.get_color('bg_0'), relief='flat', bd=0)

        # Dot
        dot = tk.Frame(frame, bg=theme.get_color('ok'), width=8, height=8, relief='flat', bd=0)
        dot.pack_propagate(False)
        dot.pack(side='left', padx=(0, 8))

        # Label
        label = tk.Label(
            frame,
            text='Idle · ready to extract',
            bg=theme.get_color('bg_0'),
            fg=theme.get_color('fg_1'),
            font=('', 12),
        )
        label.pack(side='left')

        return frame

    @staticmethod
    def processing(
        parent,
        filename: str = 'File.mkv',
        elapsed: str = '02:14',
        remaining: str = '~01:30',
        theme: UIThemeManager = None,
    ) -> tk.Frame:
        """Create a processing state indicator."""
        theme = theme or UIThemeManager()

        frame = tk.Frame(parent, bg=theme.get_color('bg_0'), relief='flat', bd=0)

        # Status line
        status_frame = tk.Frame(frame, bg=theme.get_color('bg_0'), relief='flat', bd=0)
        status_frame.pack(fill='x', pady=(0, 8))

        status_dot = tk.Frame(status_frame, bg=theme.get_color('accent'), width=8, height=8, relief='flat', bd=0)
        status_dot.pack_propagate(False)
        status_dot.pack(side='left', padx=(0, 8))

        status_label = tk.Label(
            status_frame,
            text=f'Extracting · {filename}',
            bg=theme.get_color('bg_0'),
            fg=theme.get_color('fg_0'),
            font=('', 12),
        )
        status_label.pack(side='left')

        time_label = tk.Label(
            status_frame,
            text=f'{elapsed} elapsed · ~{remaining} remaining',
            bg=theme.get_color('bg_0'),
            fg=theme.get_color('fg_2'),
            font=('', 11),
        )
        time_label.pack(side='right')

        return frame
