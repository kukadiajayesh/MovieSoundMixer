import re
import os

filepath = 'L:/Downloads/Audio Manager/FFmpegAudioManager.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# We need to extract the block starting at _build_extract_panel to the end of _rebuild_extract_tree
match = re.search(r'(    def _build_extract_panel.*?    def _build_add_audio_panel)', code, re.DOTALL)
if not match:
    print("Could not find the block to replace")
    exit(1)

old_block = match.group(1)

new_block = """    def _format_size(self, size_bytes: int) -> str:
        if size_bytes == 0: return "0 B"
        import math
        size_name = ("B", "KB", "MB", "GB", "TB")
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 1)
        return f"{int(s) if s.is_integer() else s} {size_name[i]}"

    def _build_extract_panel(self) -> tk.Frame:
        frame = ttk.Frame(self.content_area)

        # Header
        header = ttk.Frame(frame)
        header.pack(fill=tk.X, pady=(0, 10))

        title_box = ttk.Frame(header)
        title_box.pack(side=tk.LEFT, fill=tk.Y)
        ttk.Label(title_box, text="Extract Audio", font=('', 16, 'bold')).pack(anchor='w', padx=2)
        fg_muted = self.theme_manager.get_color('fg_secondary') if self.theme_manager else '#666'
        ttk.Label(title_box, text="Probe video files, pick a stream, save audio as a standalone file.", foreground=fg_muted).pack(anchor='w', padx=2)

        self.extract_clear_btn = ttk.Button(header, text="  Clear  ", command=self._clear_step1)
        self.extract_clear_btn.pack(side=tk.RIGHT, anchor='n')

        content = ttk.LabelFrame(frame, text="", padding=8)
        content.pack(fill=tk.BOTH, expand=True)

        # Toolbar
        tb = ttk.Frame(content)
        tb.pack(fill=tk.X, pady=(0, 8))

        self.extract_add_files_btn = ttk.Button(tb, text="+ Add Files", width=14, command=self._add_files_step1)
        self.extract_add_files_btn.pack(side=tk.LEFT, padx=3)
        self.extract_add_folder_btn = ttk.Button(tb, text="+ Add Folder", width=14, command=self._add_folder_step1)
        self.extract_add_folder_btn.pack(side=tk.LEFT, padx=3)
        ttk.Separator(tb, orient=tk.VERTICAL).pack(side=tk.LEFT, padx=8, fill=tk.Y, pady=2)

        # Search
        tk.Label(tb, text="🔍", fg=fg_muted).pack(side=tk.LEFT)
        self.extract_search_var = tk.StringVar()
        self.extract_search_var.trace_add("write", lambda *args: self._rebuild_extract_tree())
        self.extract_search_entry = ttk.Entry(tb, textvariable=self.extract_search_var, width=20)
        self.extract_search_entry.pack(side=tk.LEFT, padx=3)

        ttk.Separator(tb, orient=tk.VERTICAL).pack(side=tk.LEFT, padx=8, fill=tk.Y, pady=2)

        self.extract_remove_btn = ttk.Button(tb, text="Remove Selected", width=16, command=self._remove_selected_step1)
        self.extract_remove_btn.pack(side=tk.LEFT, padx=3)

        self.extract_ready_lbl = ttk.Label(tb, text="0/0 ready", foreground=fg_muted)
        self.extract_ready_lbl.pack(side=tk.RIGHT, padx=3)

        # Treeview
        cols = ('#', 'File', 'Size', 'Stream', 'Status')
        tf = ttk.Frame(content)
        tf.pack(fill=tk.BOTH, expand=True)

        self.extract_tree = ttk.Treeview(tf, columns=cols, show='headings', height=5, selectmode='extended')
        self.extract_tree.heading('#', text='#')
        self.extract_tree.heading('File', text='File')
        self.extract_tree.heading('Size', text='Size')
        self.extract_tree.heading('Stream', text='Stream')
        self.extract_tree.heading('Status', text='Status')

        self.extract_tree.column('#', width=36, stretch=False, anchor='center')
        self.extract_tree.column('File', width=260, stretch=True)
        self.extract_tree.column('Size', width=80, stretch=False, anchor='e')
        self.extract_tree.column('Stream', width=180, stretch=False)
        self.extract_tree.column('Status', width=120, stretch=False)

        vsb = ttk.Scrollbar(tf, orient=tk.VERTICAL, command=self.extract_tree.yview)
        hsb = ttk.Scrollbar(tf, orient=tk.HORIZONTAL, command=self.extract_tree.xview)
        self.extract_tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        hsb.pack(side=tk.BOTTOM, fill=tk.X)
        self.extract_tree.pack(fill=tk.BOTH, expand=True)
        self.extract_tree.bind('<ButtonRelease-1>', self._on_extract_tree_click)

        # Bottom Frame
        bot = ttk.Frame(content)
        bot.pack(fill=tk.X, pady=(6, 0))
        ttk.Label(bot, text="Output Folder:", width=15, anchor='w').pack(side=tk.LEFT)
        self.extract_out_var = tk.StringVar()
        self.extract_out_entry = ttk.Entry(bot, textvariable=self.extract_out_var)
        self.extract_out_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
        self.extract_out_browse_btn = ttk.Button(bot, text="Browse...", width=10, command=lambda: self._browse_folder(self.extract_out_var))
        self.extract_out_browse_btn.pack(side=tk.LEFT)
        self.extract_btn = ttk.Button(bot, text="Extract Audio", width=16, style='Accent.TButton', command=self._on_extract_clicked)
        self.extract_btn.pack(side=tk.RIGHT, padx=(8, 0), ipady=4)
        return frame

    def _on_extract_tree_click(self, event):
        if self.extract_tree.identify_region(event.x, event.y) != 'cell':
            return
        col  = self.extract_tree.identify_column(event.x)
        item = self.extract_tree.identify_row(event.y)
        # Check for column #4 (Stream)
        if not item or col != '#4':
            return

        idx   = int(item)
        entry = self.video_entries[idx]
        if not entry.streams:
            return

        bbox = self.extract_tree.bbox(item, col)
        if not bbox:
            return
        x, y, w, h = bbox

        combo = ttk.Combobox(self.extract_tree, values=[s.display() for s in entry.streams], state='readonly', font=('', 10))
        combo.current(max(0, min(entry.selected_idx, len(entry.streams) - 1)))
        combo.place(x=x, y=y, width=w, height=h)
        combo.focus_set()

        def on_select(e=None):
            entry.selected_idx = combo.current()
            self._refresh_extract_row(idx)
            combo.destroy()

        combo.bind('<<ComboboxSelected>>', on_select)
        combo.bind('<FocusOut>', lambda e: combo.destroy())
        combo.bind('<Escape>',  lambda e: combo.destroy())

    def _add_files_step1(self):
        files = filedialog.askopenfilenames(
            title="Select Video Files",
            filetypes=[("Video files", "*.mkv *.mp4 *.avi *.mov *.ts *.m2ts"), ("All files", "*.*")])
        for f in files:
            self._add_video_entry(f)

    def _add_folder_step1(self):
        d = filedialog.askdirectory(title="Select Video Folder")
        if not d:
            return
        files = sorted(f for f in os.listdir(d) if is_video_file(f))
        if not files:
            messagebox.showwarning("Empty", f"No video files found in:\\n{d}")
            return
        for f in files:
            self._add_video_entry(os.path.join(d, f))

    def _add_video_entry(self, filepath: str):
        if any(e.file == filepath for e in self.video_entries):
            return
        entry = VideoEntry(filepath)
        self.video_entries.append(entry)
        idx = len(self.video_entries) - 1

        try:
            size_str = self._format_size(os.path.getsize(filepath))
        except:
            size_str = "Unknown"

        self.extract_tree.insert('', tk.END, iid=str(idx),
            values=(idx + 1, os.path.basename(filepath), size_str, '—', 'Probing...'))
        self.probe_executor.submit(self._probe_entry, entry, idx)
        self._update_extract_ready_count()

    def _probe_entry(self, entry: VideoEntry, idx: int):
        streams = _probe_audio_streams(entry.file)
        entry.streams      = streams
        entry.probe_status = 'Ready' if streams else 'Error: No audio'
        self.log_queue.put(('refresh_extract_row', idx))

    def _refresh_extract_row(self, idx: int):
        if idx >= len(self.video_entries):
            return
        entry = self.video_entries[idx]
        iid   = str(idx)
        if not self.extract_tree.exists(iid):
            return

        try:
            size_str = self._format_size(os.path.getsize(entry.file))
        except:
            size_str = "Unknown"

        si = max(0, min(entry.selected_idx, len(entry.streams) - 1)) if entry.streams else 0
        stream_disp = entry.streams[si].display() if entry.streams else "—"

        self.extract_tree.item(iid, values=(idx + 1, os.path.basename(entry.file), size_str, stream_disp, entry.probe_status))
        self._update_extract_ready_count()

    def _remove_selected_step1(self):
        sel = self.extract_tree.selection()
        if not sel:
            return
        for item in sorted(sel, key=int, reverse=True):
            del self.video_entries[int(item)]
        self._rebuild_extract_tree()

    def _clear_step1(self):
        self.video_entries.clear()
        self._rebuild_extract_tree()

    def _update_extract_ready_count(self):
        if not hasattr(self, 'extract_ready_lbl'):
            return
        total = len(self.video_entries)
        ready = sum(1 for e in self.video_entries if e.probe_status in ('Ready', 'Done'))
        self.extract_ready_lbl.config(text=f"{ready}/{total} ready")

    def _rebuild_extract_tree(self):
        self.extract_tree.delete(*self.extract_tree.get_children())
        search_query = getattr(self, 'extract_search_var', tk.StringVar()).get().lower() if hasattr(self, 'extract_search_var') else ''

        for i, entry in enumerate(self.video_entries):
            basename = os.path.basename(entry.file)
            if search_query and search_query not in basename.lower():
                continue

            try:
                size_str = self._format_size(os.path.getsize(entry.file))
            except:
                size_str = "Unknown"

            si = max(0, min(entry.selected_idx, len(entry.streams) - 1)) if entry.streams else 0
            stream_disp = entry.streams[si].display() if entry.streams else "—"

            self.extract_tree.insert('', tk.END, iid=str(i),
                values=(i + 1, basename, size_str, stream_disp, entry.probe_status))

        self._update_extract_ready_count()

    def _build_add_audio_panel"""

code = code.replace(old_block, new_block)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
print("done")
