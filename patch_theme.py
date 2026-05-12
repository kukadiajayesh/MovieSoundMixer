import os

filepath = 'L:/Downloads/Audio Manager/modules/UITheme.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Update THEME_LIGHT and THEME_DARK
old_light = """# Light Mode Theme
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
)"""

new_light = """# Light Mode Theme
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
)"""

old_dark = """# Dark Mode Theme
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
)"""

new_dark = """# Dark Mode Theme
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
)"""

code = code.replace(old_light, new_light)
code = code.replace(old_dark, new_dark)

# Let's fix the configure_ttk_style method so everything applies completely
old_style = """        # Configure TLabel
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
                       foreground=theme.fg_primary)"""

new_style = """        # Configure general styles
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
                       borderwidth=1)
        style.map('TButton',
                 background=[('active', theme.bg_tertiary), ('pressed', theme.bg_tertiary)])

        # Configure Accent.TButton
        style.configure('Accent.TButton',
                       background=theme.accent_primary,
                       foreground='#ffffff',
                       borderwidth=0,
                       padding=6)
        style.map('Accent.TButton',
                 background=[('active', theme.accent_primary)])

        # Configure TEntry
        style.configure('TEntry',
                       fieldbackground=theme.bg_secondary,
                       background=theme.bg_secondary,
                       foreground=theme.fg_primary,
                       bordercolor=theme.border_color,
                       lightcolor=theme.border_color,
                       darkcolor=theme.border_color,
                       borderwidth=1)

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
                       borderwidth=1)
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
                       borderwidth=1)
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
        style.configure('Sash', background=theme.border_color, bordercolor=theme.border_color)"""

code = code.replace(old_style, new_style)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
print("done")