import re

filepath = 'L:/Downloads/Audio Manager/FFmpegAudioManager.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Extract button
old_ext_btn = """        self.extract_btn = ttk.Button(bot, text="  Extract Audio  ",
                                      command=self._on_extract_clicked)
        self.extract_btn.pack(side=tk.RIGHT, padx=(8, 0), ipady=4)"""

new_ext_btn = """        self.extract_btn = ttk.Button(bot, text="  Extract Audio  ",
                                      style='Accent.TButton',
                                      command=self._on_extract_clicked)
        self.extract_btn.pack(side=tk.RIGHT, padx=(8, 0), ipady=4)"""
code = code.replace(old_ext_btn, new_ext_btn)

# Add audio button
old_add_btn = """        self.add_audio_btn = tk.Button(bot, text="  Start Mixing  ",
                                       command=self._on_add_audio_clicked,
                                       bg='#27ae60', fg='white',
                                       activebackground='#229954', activeforeground='white',
                                       relief=tk.RAISED, padx=16, pady=2)
        self.add_audio_btn.pack(side=tk.RIGHT, padx=(8, 0), ipady=4)"""

new_add_btn = """        self.add_audio_btn = ttk.Button(bot, text="  Start Mixing  ",
                                       style='Accent.TButton',
                                       command=self._on_add_audio_clicked)
        self.add_audio_btn.pack(side=tk.RIGHT, padx=(8, 0), ipady=4)"""
code = code.replace(old_add_btn, new_add_btn)

# Stop button
old_stop_btn = """        self.cancel_btn = tk.Button(row, text="  Stop  ", command=self._on_cancel,
                                    state=tk.DISABLED, bg='#c0392b', fg='white',
                                    activebackground='#a93226', activeforeground='white',
                                    relief=tk.RAISED, padx=12, pady=2)"""

new_stop_btn = """        danger_bg = self.theme_manager.get_color('accent_error') if self.theme_manager else '#c0392b'
        self.cancel_btn = tk.Button(row, text="  Stop  ", command=self._on_cancel,
                                    state=tk.DISABLED, bg=danger_bg, fg='white',
                                    activebackground=danger_bg, activeforeground='white',
                                    relief=tk.FLAT, padx=12, pady=2)"""
code = code.replace(old_stop_btn, new_stop_btn)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
print("done")