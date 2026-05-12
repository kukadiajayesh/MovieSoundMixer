import re
import os

filepath = 'L:/Downloads/Audio Manager/FFmpegAudioManager.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update LOG_TAGS
old_log_tags = """LOG_TAGS = {
    '[OK]':        {'foreground': '#6ec97a'},   # green
    '[ERROR]':     {'foreground': '#f28779'},   # salmon
    '[EXCEPTION]': {'foreground': '#f28779'},
    '[CANCEL]':    {'foreground': '#ffb347'},   # orange
    '[INFO]':      {'foreground': '#79c7e3'},   # cyan
    '[WARN]':      {'foreground': '#ffe066'},   # yellow
    '[DONE]':      {'foreground': '#6ec97a'},
    '[START]':     {'foreground': '#b0b0b0'},
    'CMD':         {'foreground': '#707070'},   # dim
}"""

new_log_tags = """LOG_TAGS = {
    '[OK]':        {'foreground': '#27ae60'},   # green
    '[ERROR]':     {'foreground': '#c0392b'},   # red
    '[EXCEPTION]': {'foreground': '#c0392b'},
    '[CANCEL]':    {'foreground': '#d68910'},   # orange
    '[INFO]':      {'foreground': '#0084c8'},   # cyan
    '[WARN]':      {'foreground': '#d68910'},   # yellow
    '[DONE]':      {'foreground': '#27ae60'},
    '[START]':     {'foreground': '#a6aab3'},
    'CMD':         {'foreground': '#656870'},   # dim
}"""
code = code.replace(old_log_tags, new_log_tags)


# 2. Update home panel status colors
old_home_status = """        ffmpeg_status = "✓" if ffmpeg_path else "✗"
        mkvmerge_status = "✓" if mkvmerge_path else "○"
        ffmpeg_color = '#6ec97a' if ffmpeg_path else '#f28779'
        mkvmerge_color = '#6ec97a' if mkvmerge_path else '#ffe066'

        status_frame = tk.Frame(frame, bg='white')
        status_frame.pack(fill=tk.X, pady=(0, 10))
        ttk.Label(status_frame, text="Status:", font=('', 9), foreground='#666').pack(side=tk.LEFT)
        tk.Label(status_frame, text=f" FFmpeg {ffmpeg_status}", fg=ffmpeg_color,
                font=('', 9, 'bold'), bg='white').pack(side=tk.LEFT, padx=(4, 12))
        tk.Label(status_frame, text=f"mkvmerge {mkvmerge_status}", fg=mkvmerge_color,
                font=('', 9, 'bold'), bg='white').pack(side=tk.LEFT)"""

new_home_status = """        ffmpeg_status = "✓" if ffmpeg_path else "✗"
        mkvmerge_status = "✓" if mkvmerge_path else "○"

        ok_color = self.theme_manager.get_color('accent_success') if self.theme_manager else '#27ae60'
        err_color = self.theme_manager.get_color('accent_error') if self.theme_manager else '#c0392b'
        warn_color = self.theme_manager.get_color('accent_warning') if self.theme_manager else '#d68910'
        bg_color = self.theme_manager.get_color('bg_primary') if self.theme_manager else '#ffffff'

        ffmpeg_color = ok_color if ffmpeg_path else err_color
        mkvmerge_color = ok_color if mkvmerge_path else warn_color

        status_frame = tk.Frame(frame, bg=bg_color)
        status_frame.pack(fill=tk.X, pady=(0, 10))
        ttk.Label(status_frame, text="Status:", font=('', 9)).pack(side=tk.LEFT)
        tk.Label(status_frame, text=f" FFmpeg {ffmpeg_status}", fg=ffmpeg_color,
                font=('', 9, 'bold'), bg=bg_color).pack(side=tk.LEFT, padx=(4, 12))
        tk.Label(status_frame, text=f"mkvmerge {mkvmerge_status}", fg=mkvmerge_color,
                font=('', 9, 'bold'), bg=bg_color).pack(side=tk.LEFT)"""
code = code.replace(old_home_status, new_home_status)


# 3. Update home card backgrounds
old_card_1 = """        # Content row: icon + text
        content1 = tk.Frame(card1, bg='white')
        content1.pack(anchor='w', fill=tk.BOTH, expand=True, pady=(0, 12))
        extract_canvas = create_extract_icon(content1, 96)
        extract_canvas.pack(side=tk.LEFT, padx=(0, 16))
        text_frame1 = ttk.Frame(content1)
        text_frame1.pack(anchor='w', fill=tk.BOTH, expand=True, side=tk.LEFT)
        ttk.Label(text_frame1, text="Extract Audio from Videos",
                  font=('', 12, 'bold')).pack(anchor='w')
        ttk.Label(text_frame1, text="Probe video files, pick an audio stream, and save it as a standalone audio file.",
                  foreground='#666', wraplength=480).pack(anchor='w', pady=(6, 0))

        # Button row
        btn_row1 = tk.Frame(card1)
        btn_row1.pack(fill=tk.X)"""

new_card_1 = """        # Content row: icon + text
        bg_color = self.theme_manager.get_color('bg_secondary') if self.theme_manager else '#ffffff'
        content1 = tk.Frame(card1, bg=bg_color)
        content1.pack(anchor='w', fill=tk.BOTH, expand=True, pady=(0, 12))
        extract_canvas = create_extract_icon(content1, 96)
        extract_canvas.config(bg=bg_color)
        extract_canvas.pack(side=tk.LEFT, padx=(0, 16))
        text_frame1 = ttk.Frame(content1)
        text_frame1.pack(anchor='w', fill=tk.BOTH, expand=True, side=tk.LEFT)
        ttk.Label(text_frame1, text="Extract Audio from Videos",
                  font=('', 12, 'bold')).pack(anchor='w')

        fg_muted = self.theme_manager.get_color('fg_secondary') if self.theme_manager else '#666'
        ttk.Label(text_frame1, text="Probe video files, pick an audio stream, and save it as a standalone audio file.",
                  foreground=fg_muted, wraplength=480).pack(anchor='w', pady=(6, 0))

        # Button row
        btn_row1 = tk.Frame(card1, bg=bg_color)
        btn_row1.pack(fill=tk.X)"""
code = code.replace(old_card_1, new_card_1)

old_card_2 = """        # Content row: icon + text
        content2 = tk.Frame(card2, bg='white')
        content2.pack(anchor='w', fill=tk.BOTH, expand=True, pady=(0, 12))
        add_canvas = create_add_icon(content2, 96)
        add_canvas.pack(side=tk.LEFT, padx=(0, 16))
        text_frame2 = ttk.Frame(content2)
        text_frame2.pack(anchor='w', fill=tk.BOTH, expand=True, side=tk.LEFT)
        ttk.Label(text_frame2, text="Add Audio to Videos",
                  font=('', 12, 'bold')).pack(anchor='w')
        ttk.Label(text_frame2, text="Merge an external audio file into a video. Supports auto-matching by episode number, "
                  "duration padding, and both FFmpeg / mkvmerge backends.",
                  foreground='#666', wraplength=480).pack(anchor='w', pady=(6, 0))

        # Button row
        btn_row2 = tk.Frame(card2)
        btn_row2.pack(fill=tk.X)"""

new_card_2 = """        # Content row: icon + text
        content2 = tk.Frame(card2, bg=bg_color)
        content2.pack(anchor='w', fill=tk.BOTH, expand=True, pady=(0, 12))
        add_canvas = create_add_icon(content2, 96)
        add_canvas.config(bg=bg_color)
        add_canvas.pack(side=tk.LEFT, padx=(0, 16))
        text_frame2 = ttk.Frame(content2)
        text_frame2.pack(anchor='w', fill=tk.BOTH, expand=True, side=tk.LEFT)
        ttk.Label(text_frame2, text="Add Audio to Videos",
                  font=('', 12, 'bold')).pack(anchor='w')
        ttk.Label(text_frame2, text="Merge an external audio file into a video. Supports auto-matching by episode number, "
                  "duration padding, and both FFmpeg / mkvmerge backends.",
                  foreground=fg_muted, wraplength=480).pack(anchor='w', pady=(6, 0))

        # Button row
        btn_row2 = tk.Frame(card2, bg=bg_color)
        btn_row2.pack(fill=tk.X)"""
code = code.replace(old_card_2, new_card_2)

# 4. PanedWindow sash background
old_pw_sash = """        # Right side: split into content and bottom log drawer
        self.right_pane = tk.PanedWindow(self.main_container, orient=tk.VERTICAL, sashwidth=4, bg='#aaa', sashrelief=tk.RAISED)"""
new_pw_sash = """        # Right side: split into content and bottom log drawer
        border_color = self.theme_manager.get_color('border_color') if self.theme_manager else '#aaa'
        self.right_pane = tk.PanedWindow(self.main_container, orient=tk.VERTICAL, sashwidth=2, bg=border_color, sashrelief=tk.FLAT)"""
code = code.replace(old_pw_sash, new_pw_sash)

# 5. Build Log panel colors
old_log_text = """        self.log_text = tk.Text(frame, bg='#1e1e1e', fg='#c8c8c8',
                                font=('Consolas', 10), wrap=tk.WORD,
                                state=tk.DISABLED, height=15)"""
new_log_text = """        bg_col = self.theme_manager.get_color('bg_primary') if self.theme_manager else '#1e1e1e'
        fg_col = self.theme_manager.get_color('fg_primary') if self.theme_manager else '#c8c8c8'
        self.log_text = tk.Text(frame, bg=bg_col, fg=fg_col,
                                font=('Consolas', 10), wrap=tk.WORD,
                                state=tk.DISABLED, height=15, borderwidth=0)"""
code = code.replace(old_log_text, new_log_text)


# 6. Extract/Merge headers
old_ext_hdr = """ttk.Label(header, text="Probe video files, pick a stream, save audio as a standalone file.", foreground='#666').pack(side=tk.LEFT, padx=10)"""
new_ext_hdr = """fg_muted = self.theme_manager.get_color('fg_secondary') if self.theme_manager else '#666'
        ttk.Label(header, text="Probe video files, pick a stream, save audio as a standalone file.", foreground=fg_muted).pack(side=tk.LEFT, padx=10)"""
code = code.replace(old_ext_hdr, new_ext_hdr)

old_merg_hdr = """ttk.Label(header, text="Add an external audio track to videos. Auto-matches by episode (SxxExx).", foreground='#666').pack(side=tk.LEFT, padx=10)"""
new_merg_hdr = """fg_muted = self.theme_manager.get_color('fg_secondary') if self.theme_manager else '#666'
        ttk.Label(header, text="Add an external audio track to videos. Auto-matches by episode (SxxExx).", foreground=fg_muted).pack(side=tk.LEFT, padx=10)"""
code = code.replace(old_merg_hdr, new_merg_hdr)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
print("done")