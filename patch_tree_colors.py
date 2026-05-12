import re

filepath = 'L:/Downloads/Audio Manager/FFmpegAudioManager.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Update tags and colors for the add_tree to match the modern look
old_add_tree = """        self.add_tree.tag_configure('no_audio', foreground='#999999')"""

new_add_tree = """        fg_muted = self.theme_manager.get_color('fg_muted') if self.theme_manager else '#999999'
        self.add_tree.tag_configure('no_audio', foreground=fg_muted)"""

code = code.replace(old_add_tree, new_add_tree)

# Change episode description foreground
old_ep_desc = """ttk.Label(content,
                  text="Audio files are matched automatically by episode (SxxExx). "
                       "Double-click a row or click the Audio cell to override manually.",
                  foreground='#666', wraplength=560).pack(anchor='w', pady=(2, 0))"""

new_ep_desc = """fg_sec = self.theme_manager.get_color('fg_secondary') if self.theme_manager else '#666'
        ttk.Label(content,
                  text="Audio files are matched automatically by episode (SxxExx). "
                       "Double-click a row or click the Audio cell to override manually.",
                  foreground=fg_sec, wraplength=560).pack(anchor='w', pady=(2, 0))"""

code = code.replace(old_ep_desc, new_ep_desc)

# Change no GPU encoders foreground
old_no_gpu = """ttk.Label(gpu_frame, text="No GPU encoders detected on this system.",
                      foreground='#666').pack(anchor='w', padx=4, pady=2)"""

new_no_gpu = """ttk.Label(gpu_frame, text="No GPU encoders detected on this system.",
                      foreground=fg_sec).pack(anchor='w', padx=4, pady=2)"""

code = code.replace(old_no_gpu, new_no_gpu)

# Change system cores foreground
old_cores = """ttk.Label(par_frame, text=f"(system: {self.batch_processor.max_parallel} cores)",
                     foreground='#666').pack(side=tk.LEFT)"""

new_cores = """ttk.Label(par_frame, text=f"(system: {self.batch_processor.max_parallel} cores)",
                     foreground=fg_sec).pack(side=tk.LEFT)"""

code = code.replace(old_cores, new_cores)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
print("done")