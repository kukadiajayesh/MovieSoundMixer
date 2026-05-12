#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Design System Components - Reusable styled UI elements

Provides helper functions and classes for creating components that follow
the design system from the redesign spec (00_design_system.md and 05_components.md).
"""

import tkinter as tk
from tkinter import ttk
from typing import Optional, Callable, List, Tuple
from modules.UITheme import UIThemeManager


class Button:
    """Factory for creating styled buttons with intent (Primary, Ghost, Danger)."""

    @staticmethod
    def primary(
        parent,
        text: str,
        command: Optional[Callable] = None,
        size: str = 'md',  # sm, md, lg
        width: Optional[int] = None,
        theme: Optional[UIThemeManager] = None,
    ) -> ttk.Button:
        """Create a primary (accent) button."""
        theme = theme or UIThemeManager()
        heights = {'sm': 28, 'md': 36, 'lg': 44}
        height = heights.get(size, 36)
        padding = int(height * 1.5)

        btn = ttk.Button(
            parent,
            text=text,
            command=command,
            style='Accent.TButton',
            width=width or 20,
        )
        return btn

    @staticmethod
    def ghost(
        parent,
        text: str,
        command: Optional[Callable] = None,
        size: str = 'md',
        theme: Optional[UIThemeManager] = None,
    ) -> ttk.Button:
        """Create a ghost (secondary) button."""
        btn = ttk.Button(
            parent,
            text=text,
            command=command,
            style='TButton',
        )
        return btn

    @staticmethod
    def danger(
        parent,
        text: str,
        command: Optional[Callable] = None,
        size: str = 'md',
        theme: Optional[UIThemeManager] = None,
    ) -> ttk.Button:
        """Create a danger (destructive) button."""
        btn = ttk.Button(
            parent,
            text=text,
            command=command,
            style='Danger.TButton',
        )
        return btn


class Input:
    """Factory for creating styled input fields."""

    @staticmethod
    def text(
        parent,
        placeholder: str = '',
        width: int = 40,
        mono: bool = False,
        theme: Optional[UIThemeManager] = None,
    ) -> ttk.Entry:
        """Create a text input field."""
        entry = ttk.Entry(parent, width=width)
        return entry

    @staticmethod
    def select(
        parent,
        options: List[str],
        default: Optional[str] = None,
        command: Optional[Callable] = None,
        mono: bool = False,
        theme: Optional[UIThemeManager] = None,
    ) -> ttk.Combobox:
        """Create a select dropdown."""
        combo = ttk.Combobox(
            parent,
            values=options,
            state='readonly',
        )
        if default:
            combo.set(default)
        if command:
            combo.bind('<<ComboboxSelected>>', lambda e: command(combo.get()))
        return combo


class StatusDot:
    """Factory for creating status indicator dots."""

    @staticmethod
    def create(
        parent,
        status: str,  # ok, warn, err, neutral
        size: int = 8,
        theme: Optional[UIThemeManager] = None,
    ) -> tk.Canvas:
        """Create a status indicator dot."""
        theme = theme or UIThemeManager()

        colors = {
            'ok': theme.get_color('ok'),
            'warn': theme.get_color('warn'),
            'err': theme.get_color('err'),
            'neutral': theme.get_color('fg_2'),
        }

        color = colors.get(status, colors['neutral'])

        canvas = tk.Canvas(
            parent,
            width=size,
            height=size,
            bg=theme.get_color('bg_0'),
            highlightthickness=0,
        )
        canvas.create_oval(0, 0, size, size, fill=color, outline=color)
        return canvas


class ProgressBar:
    """Factory for creating progress indicators."""

    @staticmethod
    def horizontal(
        parent,
        height: int = 4,
        theme: Optional[UIThemeManager] = None,
    ) -> ttk.Progressbar:
        """Create a horizontal progress bar."""
        theme = theme or UIThemeManager()
        pbar = ttk.Progressbar(
            parent,
            orient='horizontal',
            mode='determinate',
            length=300,
        )
        return pbar

    @staticmethod
    def indeterminate(
        parent,
        height: int = 4,
        theme: Optional[UIThemeManager] = None,
    ) -> ttk.Progressbar:
        """Create an indeterminate progress bar for when ETA is unknown."""
        pbar = ttk.Progressbar(
            parent,
            orient='horizontal',
            mode='indeterminate',
            length=300,
        )
        return pbar


class Table:
    """Factory for creating styled tables (Treeview)."""

    @staticmethod
    def create(
        parent,
        columns: List[Tuple[str, str, int]],  # (name, heading, width)
        height: int = 10,
        theme: Optional[UIThemeManager] = None,
    ) -> ttk.Treeview:
        """
        Create a styled table.

        Args:
            parent: Parent widget
            columns: List of (name, heading, width) tuples
            height: Number of visible rows
            theme: Theme manager instance

        Returns:
            Configured Treeview widget
        """
        col_names = [c[0] for c in columns]
        tree = ttk.Treeview(
            parent,
            columns=col_names,
            show='tree headings',
            height=height,
        )

        for name, heading, width in columns:
            tree.heading(name, text=heading)
            tree.column(name, width=width, anchor='w')

        return tree


class PillControl:
    """Segmented control / pill buttons for choice selection."""

    @staticmethod
    def create(
        parent,
        options: List[str],
        default: Optional[str] = None,
        command: Optional[Callable] = None,
        theme: Optional[UIThemeManager] = None,
    ) -> tk.Frame:
        """
        Create a segmented pill control.

        Args:
            parent: Parent widget
            options: List of option labels
            default: Default selected option
            command: Callback when selection changes
            theme: Theme manager instance

        Returns:
            Frame containing pill buttons
        """
        theme = theme or UIThemeManager()
        frame = tk.Frame(parent, bg=theme.get_color('bg_0'))

        current_selection = {'value': default or (options[0] if options else None)}
        buttons = []

        def select_option(option):
            current_selection['value'] = option
            for btn in buttons:
                btn_text = btn.cget('text')
                if btn_text == option:
                    btn.config(
                        bg=theme.get_color('bg_3'),
                        fg=theme.get_color('fg_0'),
                        relief='solid',
                        bd=1,
                    )
                else:
                    btn.config(
                        bg='transparent',
                        fg=theme.get_color('fg_1'),
                        relief='flat',
                        bd=0,
                    )
            if command:
                command(option)

        for option in options:
            btn = tk.Button(
                frame,
                text=option,
                bg=theme.get_color('bg_3') if option == default else 'transparent',
                fg=theme.get_color('fg_0') if option == default else theme.get_color('fg_1'),
                relief='solid' if option == default else 'flat',
                bd=1 if option == default else 0,
                padx=12,
                pady=6,
                font=('', 12),
                command=lambda o=option: select_option(o),
                activebackground=theme.get_color('bg_2'),
                activeforeground=theme.get_color('fg_0'),
            )
            btn.pack(side='left', padx=2)
            buttons.append(btn)

        return frame, current_selection


class Modal:
    """Factory for creating modal dialogs."""

    @staticmethod
    def confirmation(
        parent,
        title: str,
        message: str,
        confirm_text: str = 'Confirm',
        cancel_text: str = 'Cancel',
        theme: Optional[UIThemeManager] = None,
    ) -> bool:
        """
        Create a confirmation modal.

        Args:
            parent: Parent window
            title: Modal title
            message: Modal message
            confirm_text: Confirm button text
            cancel_text: Cancel button text
            theme: Theme manager instance

        Returns:
            True if confirmed, False if canceled
        """
        # Implementation would create a proper modal
        # For now, placeholder that can be enhanced later
        pass


def create_status_row(
    parent,
    label: str,
    status: str,  # ok, warn, err
    theme: Optional[UIThemeManager] = None,
) -> tk.Frame:
    """
    Create a status footer row (dot + label).

    Args:
        parent: Parent widget
        label: Status label text
        status: Status type (ok, warn, err)
        theme: Theme manager instance

    Returns:
        Frame containing the status indicator
    """
    theme = theme or UIThemeManager()
    frame = tk.Frame(parent, bg=theme.get_color('bg_1'))

    dot = StatusDot.create(frame, status, theme=theme)
    dot.pack(side='left', padx=(0, 8))

    lbl = tk.Label(
        frame,
        text=label,
        bg=theme.get_color('bg_1'),
        fg=theme.get_color('fg_1'),
        font=('', 12),
    )
    lbl.pack(side='left')

    return frame
