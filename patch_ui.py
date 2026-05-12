import re
import os

filepath = 'L:/Downloads/Audio Manager/FFmpegAudioManager.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace _build_ui
old_build_ui = """    def _build_ui(self):
        style = ttk.Style()

        # Apply theme if available
        if self.theme_manager:
            self.theme_manager.configure_ttk_style(style)

        # Enhanced styling for better visual appearance
        style.configure('Treeview', rowheight=28, padding=4)
        style.configure('TButton', padding=6)
        style.configure('TLabel', padding=2)
        style.configure('TLabelframe', padding=6)

        # Preserve theme colors for Accent.TButton
        theme = self.theme_manager.current_theme if self.theme_manager else None
        if theme:
            style.configure('Accent.TButton',
                          background=theme.accent_primary,
                          foreground='#ffffff',
                          font=('', 10, 'bold'),
                          padding=8,
                          borderwidth=0)
        else:
            style.configure('Accent.TButton', font=('', 10, 'bold'), padding=8)

        style.configure('Home.TButton', font=('', 11), padding=10)

        # Horizontal split: left = content+progress | right = log
        outer = tk.PanedWindow(self.root, orient=tk.HORIZONTAL,
                               sashwidth=6, sashrelief=tk.RAISED, bg='#aaa')
        outer.pack(fill=tk.BOTH, expand=True, padx=6, pady=6)

        # Left column: content area on top, progress panel on bottom
        left = tk.PanedWindow(outer, orient=tk.VERTICAL,
                              sashwidth=5, sashrelief=tk.RAISED, bg='#aaa')
        self.content_area = tk.Frame(left)
        left.add(self.content_area, minsize=360)
        self.progress_panel = self._build_progress_panel(left)
        left.add(self.progress_panel, minsize=64)
        outer.add(left, minsize=500)

        # Right column: log panel
        self.log_panel = self._build_log_panel(outer)
        outer.add(self.log_panel, minsize=260, width=340)

        self.home_frame    = self._build_home_panel()
        self.extract_frame = self._build_extract_panel()
        self.add_frame     = self._build_add_audio_panel()

        self.outer_pane = outer
        self.left_pane = left
        self._show_home()"""

new_build_ui = """    def _build_ui(self):
        style = ttk.Style()

        # Apply theme if available
        if self.theme_manager:
            self.theme_manager.configure_ttk_style(style)

        # Enhanced styling for better visual appearance
        style.configure('Treeview', rowheight=28, padding=4)
        style.configure('TButton', padding=6)
        style.configure('TLabel', padding=2)
        style.configure('TLabelframe', padding=6)

        # Preserve theme colors for Accent.TButton
        theme = self.theme_manager.current_theme if self.theme_manager else None
        if theme:
            style.configure('Accent.TButton',
                          background=theme.accent_primary,
                          foreground='#ffffff',
                          font=('', 10, 'bold'),
                          padding=8,
                          borderwidth=0)
        else:
            style.configure('Accent.TButton', font=('', 10, 'bold'), padding=8)

        # Main window container
        self.main_container = tk.Frame(self.root)
        self.main_container.pack(fill=tk.BOTH, expand=True)

        # Sidebar
        self.sidebar = self._build_sidebar(self.main_container)
        self.sidebar.pack(side=tk.LEFT, fill=tk.Y)

        # Right side: split into content and bottom log drawer
        self.right_pane = tk.PanedWindow(self.main_container, orient=tk.VERTICAL, sashwidth=4, bg='#aaa', sashrelief=tk.RAISED)
        self.right_pane.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=6, pady=6)

        self.content_area = tk.Frame(self.right_pane)
        self.right_pane.add(self.content_area, minsize=300)

        self.progress_panel = self._build_progress_panel(self.right_pane)
        self.log_panel = self._build_log_panel(self.right_pane)

        self.extract_frame = self._build_extract_panel()
        self.add_frame     = self._build_add_audio_panel()

        self.log_drawer_visible = False
        self._show_extract()

    def _build_sidebar(self, parent):
        frame = tk.Frame(parent, width=180, bg='#2d2d2d' if self.dark_mode_var.get() else '#f0f0f0')
        frame.pack_propagate(False)

        # Title
        tk.Label(frame, text="Workspace", font=('', 10, 'bold'), bg=frame['bg'], fg='#888').pack(anchor='w', padx=10, pady=(20, 10))

        # Nav buttons
        self.btn_extract = ttk.Button(frame, text="Extract Audio", command=self._show_extract)
        self.btn_extract.pack(fill=tk.X, padx=10, pady=4)

        self.btn_merge = ttk.Button(frame, text="Merge Audio", command=self._show_add)
        self.btn_merge.pack(fill=tk.X, padx=10, pady=4)

        self.btn_history = ttk.Button(frame, text="History", state=tk.DISABLED)
        self.btn_history.pack(fill=tk.X, padx=10, pady=4)

        # Spacer
        tk.Frame(frame, bg=frame['bg']).pack(fill=tk.BOTH, expand=True)

        # Status dots
        status_frame = tk.Frame(frame, bg=frame['bg'])
        status_frame.pack(fill=tk.X, padx=10, pady=20)

        ffmpeg_path = check_ffmpeg()
        mkvmerge_path = find_mkvmerge()

        def add_status(lbl, ok, warn=False):
            row = tk.Frame(status_frame, bg=frame['bg'])
            row.pack(fill=tk.X, pady=2)
            color = '#6ec97a' if ok else ('#ffe066' if warn else '#f28779')
            tk.Label(row, text="●", fg=color, bg=frame['bg'], font=('', 10)).pack(side=tk.LEFT)
            tk.Label(row, text=lbl, bg=frame['bg'], fg='#ccc' if self.dark_mode_var.get() else '#333', font=('', 9)).pack(side=tk.LEFT, padx=5)

        add_status("FFmpeg ready" if ffmpeg_path else "FFmpeg missing", bool(ffmpeg_path))
        add_status("mkvmerge ready" if mkvmerge_path else "mkvmerge optional", bool(mkvmerge_path), warn=not bool(mkvmerge_path))

        gpu_count = len(self.gpu_encoders)
        add_status(f"{gpu_count} GPU encoders" if gpu_count else "GPU not detected", gpu_count > 0)

        # Theme toggle at bottom
        if self.theme_manager:
            ttk.Checkbutton(frame, text="Dark Mode", variable=self.dark_mode_var, command=self._on_theme_toggle).pack(side=tk.BOTTOM, anchor='w', padx=10, pady=10)

        return frame"""

code = code.replace(old_build_ui, new_build_ui)

# Replace _show_panel, _show_home, _show_extract, _show_add
old_show_panel = """    def _show_panel(self, frame: tk.Frame, show_progress_log=False):
        for w in self.content_area.winfo_children():
            w.pack_forget()
        frame.pack(fill=tk.BOTH, expand=True)

        if show_progress_log:
            self.left_pane.add(self.progress_panel, minsize=64)
            self.outer_pane.add(self.log_panel, minsize=260, width=340)
        else:
            self.left_pane.remove(self.progress_panel)
            self.outer_pane.remove(self.log_panel)

    def _show_home(self):    self._show_panel(self.home_frame, show_progress_log=False)
    def _show_extract(self): self._show_panel(self.extract_frame, show_progress_log=True)
    def _show_add(self):     self._show_panel(self.add_frame, show_progress_log=True)"""

new_show_panel = """    def _show_panel(self, frame: tk.Frame):
        for w in self.content_area.winfo_children():
            w.pack_forget()
        frame.pack(fill=tk.BOTH, expand=True)
        # Always show progress panel
        self.right_pane.add(self.progress_panel, minsize=64)
        if self.log_drawer_visible:
            self.right_pane.add(self.log_panel, minsize=150)
        else:
            self.right_pane.remove(self.log_panel)

    def _show_extract(self): self._show_panel(self.extract_frame)
    def _show_add(self):     self._show_panel(self.add_frame)

    def _toggle_log_drawer(self):
        self.log_drawer_visible = not self.log_drawer_visible
        if self.log_drawer_visible:
            self.right_pane.add(self.log_panel, minsize=150)
            self.btn_toggle_log.config(text="Hide Log")
        else:
            self.right_pane.remove(self.log_panel)
            self.btn_toggle_log.config(text="Show Log")
"""
code = code.replace(old_show_panel, new_show_panel)

# Remove home frame creation logic completely? No, it's safer to just skip it or leave it.
# But wait, we completely removed self.home_frame reference in `_build_ui` in the previous replacement?
# Actually I didn't delete the `def _build_home_panel(self)` but it's not called anymore so it's fine. Wait, `self.home_frame` was removed from `_build_ui`. Let's ensure no error happens.

# Replace extract header
old_extract_header = """        header = ttk.Frame(frame)
        header.pack(fill=tk.X, pady=(0, 6))
        ttk.Button(header, text="← Back", command=self._show_home).pack(side=tk.LEFT, padx=2)
        ttk.Label(header, text="Step 1: Extract Audio from Video Files",
                  font=('', 11, 'bold')).pack(side=tk.LEFT, padx=10)"""

new_extract_header = """        header = ttk.Frame(frame)
        header.pack(fill=tk.X, pady=(0, 6))
        ttk.Label(header, text="Extract Audio",
                  font=('', 16, 'bold')).pack(side=tk.LEFT, padx=2)
        ttk.Label(header, text="Probe video files, pick a stream, save audio as a standalone file.", foreground='#666').pack(side=tk.LEFT, padx=10)"""
code = code.replace(old_extract_header, new_extract_header)

# Replace merge header
old_merge_header = """        header = ttk.Frame(frame)
        header.pack(fill=tk.X, pady=(0, 6))
        ttk.Button(header, text="← Back", command=self._show_home).pack(side=tk.LEFT, padx=2)
        ttk.Label(header, text="Step 2: Add Audio to Videos",
                  font=('', 11, 'bold')).pack(side=tk.LEFT, padx=10)"""

new_merge_header = """        header = ttk.Frame(frame)
        header.pack(fill=tk.X, pady=(0, 6))
        ttk.Label(header, text="Merge Audio",
                  font=('', 16, 'bold')).pack(side=tk.LEFT, padx=2)
        ttk.Label(header, text="Add an external audio track to videos. Auto-matches by episode (SxxExx).", foreground='#666').pack(side=tk.LEFT, padx=10)"""
code = code.replace(old_merge_header, new_merge_header)

# Add Toggle Log button in Progress Panel
old_progress = """        row = ttk.Frame(frame)
        row.pack(fill=tk.X, pady=(0, 4))
        self.progress_label = ttk.Label(row, text="Idle", anchor='w')
        self.progress_label.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.cancel_btn = tk.Button(row, text="  Stop  ", command=self._on_cancel,"""

new_progress = """        row = ttk.Frame(frame)
        row.pack(fill=tk.X, pady=(0, 4))
        self.progress_label = ttk.Label(row, text="Idle", anchor='w')
        self.progress_label.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.btn_toggle_log = ttk.Button(row, text="Show Log", command=self._toggle_log_drawer)
        self.btn_toggle_log.pack(side=tk.RIGHT, padx=4)

        self.cancel_btn = tk.Button(row, text="  Stop  ", command=self._on_cancel,"""
code = code.replace(old_progress, new_progress)

# Auto-open log when tasks start
old_start_task = """    def _start_task(self, fn):
        self.cancel_flag.clear()
        self._task_start_time = time.time()"""

new_start_task = """    def _start_task(self, fn):
        self.cancel_flag.clear()
        self._task_start_time = time.time()
        if not self.log_drawer_visible:
            self._toggle_log_drawer()"""
code = code.replace(old_start_task, new_start_task)

old_start_batch = """            # Start batch processing thread
            self.batch_active = True
            self.batch_thread = threading.Thread(
                target=self._run_batch_processor,
                args=(out_dir, tool_choice, sync_choices),
                daemon=True
            )
            self.batch_thread.start()
            self._log(f"[START] Batch processing started (max {self.batch_processor.max_parallel} parallel)")"""

new_start_batch = """            # Start batch processing thread
            self.batch_active = True
            if not self.log_drawer_visible:
                self._toggle_log_drawer()
            self.batch_thread = threading.Thread(
                target=self._run_batch_processor,
                args=(out_dir, tool_choice, sync_choices),
                daemon=True
            )
            self.batch_thread.start()
            self._log(f"[START] Batch processing started (max {self.batch_processor.max_parallel} parallel)")"""
code = code.replace(old_start_batch, new_start_batch)

# Also fix _rebuild_ui_theme issue with self.home_frame
old_rebuild_ui_theme = """        # Rebuild home panel to update button text
        self.home_frame = self._build_home_panel()"""
new_rebuild_ui_theme = """        # Sidebar needs color refresh
        bg_color = '#2d2d2d' if self.dark_mode_var.get() else '#f0f0f0'
        fg_color = '#ccc' if self.dark_mode_var.get() else '#333'
        try:
            self.sidebar.config(bg=bg_color)
            for child in self.sidebar.winfo_children():
                try:
                    child.config(bg=bg_color)
                    if isinstance(child, tk.Label):
                        child.config(fg=fg_color)
                except tk.TclError:
                    pass
        except Exception:
            pass"""
code = code.replace(old_rebuild_ui_theme, new_rebuild_ui_theme)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
print("done")