#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FFmpeg Audio Manager - Python/Tkinter

Supported Platforms: Windows, macOS, Linux

Required Dependencies:
  - FFmpeg (required) - automatic detection with fallback dialog
  - MKVToolNix/mkvmerge (optional) - used for advanced audio merging features

Installation:
  Windows: choco install ffmpeg (with Chocolatey)
  macOS:   brew install ffmpeg
  Linux:   sudo apt-get install ffmpeg (Ubuntu/Debian)
           or sudo pacman -S ffmpeg (Arch Linux)

If dependencies are missing, the app will show an interactive dialog with:
  - Installation instructions for your platform
  - Direct links to download pages
  - Option to browse for executable manually
  - Option to continue without optional dependencies
"""

import os
import queue
import re
import subprocess
import sys
import tempfile
import threading
import time
import webbrowser
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Tuple

try:
    from modules.GPUAccelerator import detect_gpu_encoders, build_gpu_encode_args
except ImportError:
    detect_gpu_encoders = lambda: []
    build_gpu_encode_args = lambda *args: ([], False)

try:
    from modules.BatchProcessor import BatchProcessor, BatchProcessorUI
except ImportError:
    BatchProcessor = None
    BatchProcessorUI = None

try:
    from modules.UITheme import UIThemeManager
except ImportError:
    UIThemeManager = None

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

# ── Platform detection ───────────────────────────────────────────────────────
_WIN = sys.platform == "win32"
_MAC = sys.platform == "darwin"
_LINUX = sys.platform.startswith("linux")
# Suppress console window for subprocesses on Windows
_POPEN_FLAGS = {"creationflags": subprocess.CREATE_NO_WINDOW} if _WIN else {}

# ── Patterns ────────────────────────────────────────────────────────────────
EP_PAT   = re.compile(r'[Ss](\d{1,2})[Ee](\d{1,2})')
DUR_PAT  = re.compile(r'Duration:\s*(\d+):(\d+):(\d+\.?\d*)')
TIME_PAT = re.compile(r'time=(\d+):(\d+):(\d+\.?\d*)')

# ── Log tag colours (dark background) ───────────────────────────────────────
LOG_TAGS = {
    '[OK]':        {'foreground': '#6ec97a'},   # green
    '[ERROR]':     {'foreground': '#f28779'},   # salmon
    '[EXCEPTION]': {'foreground': '#f28779'},
    '[CANCEL]':    {'foreground': '#ffb347'},   # orange
    '[INFO]':      {'foreground': '#79c7e3'},   # cyan
    '[WARN]':      {'foreground': '#ffe066'},   # yellow
    '[DONE]':      {'foreground': '#6ec97a'},
    '[START]':     {'foreground': '#b0b0b0'},
    'CMD':         {'foreground': '#707070'},   # dim
}


# ── Helpers ──────────────────────────────────────────────────────────────────
def episode_key(name: str) -> Optional[str]:
    m = EP_PAT.search(name)
    return f"S{int(m.group(1)):02d}E{int(m.group(2)):02d}" if m else None


def to_sec(h, m, s) -> float:
    return int(h) * 3600 + int(m) * 60 + float(s)


def is_video_file(name: str) -> bool:
    return name.lower().endswith(('.mkv', '.mp4', '.avi', '.mov', '.ts', '.m2ts'))


def is_audio_file(name: str) -> bool:
    return name.lower().endswith(
        ('.mkv', '.mp4', '.eac3', '.ac3', '.aac', '.dts', '.flac', '.mka', '.mp3', '.opus'))


def check_ffmpeg() -> Optional[str]:
    candidates = ['ffmpeg', 'ffmpeg.exe']
    if _MAC:
        candidates.extend(['/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'])
    elif _LINUX:
        candidates.extend(['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'])
    elif _WIN:
        candidates.extend([
            r'C:\ffmpeg\bin\ffmpeg.exe',
            r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
        ])

    for cmd in candidates:
        try:
            r = subprocess.run([cmd, '-version'], capture_output=True,
                             timeout=5, **_POPEN_FLAGS)
            if r.returncode == 0:
                return cmd
        except Exception:
            continue
    return None


def find_mkvmerge() -> Optional[str]:
    candidates = ['mkvmerge']
    if _MAC:
        candidates.extend(['/usr/local/bin/mkvmerge', '/opt/homebrew/bin/mkvmerge'])
    elif _LINUX:
        candidates.extend(['/usr/bin/mkvmerge', '/usr/local/bin/mkvmerge'])
    elif _WIN:
        candidates.extend([
            r'C:\Program Files\MKVToolNix\mkvmerge.exe',
            r'C:\Program Files (x86)\MKVToolNix\mkvmerge.exe',
        ])

    for path in candidates:
        try:
            r = subprocess.run([path, '--version'], capture_output=True,
                               timeout=5, **_POPEN_FLAGS)
            if r.returncode == 0:
                return path
        except Exception:
            continue
    return None


def get_install_instructions(tool_name: str) -> Tuple[str, str]:
    if tool_name == 'ffmpeg':
        if _WIN:
            install_cmd = "choco install ffmpeg (using Chocolatey)"
            help_url = "https://ffmpeg.org/download.html"
        elif _MAC:
            install_cmd = "brew install ffmpeg"
            help_url = "https://brew.sh"
        else:
            install_cmd = "sudo apt-get install ffmpeg (Ubuntu/Debian) or sudo pacman -S ffmpeg (Arch)"
            help_url = "https://ffmpeg.org/download.html"
    else:
        if _WIN:
            install_cmd = "Download from: https://www.bunkus.org/videotools/mkvtoolnix/downloads.html"
            help_url = "https://www.bunkus.org/videotools/mkvtoolnix/downloads.html"
        elif _MAC:
            install_cmd = "brew install mkvtoolnix"
            help_url = "https://brew.sh"
        else:
            install_cmd = "sudo apt-get install mkvtoolnix (Ubuntu/Debian) or sudo pacman -S mkvtoolnix (Arch)"
            help_url = "https://www.bunkus.org/videotools/mkvtoolnix/downloads.html"

    return install_cmd, help_url


class DependencyDialog(tk.Toplevel):
    def __init__(self, parent, tool_name: str, is_optional: bool = False):
        super().__init__(parent)
        self.title(f"Missing {tool_name}")
        self.geometry("600x350")
        self.resizable(True, True)
        self.result = None

        install_cmd, help_url = get_install_instructions(tool_name)
        is_required = not is_optional

        # Title
        ttk.Label(self, text=f"{tool_name} Not Found",
                 font=('', 14, 'bold')).pack(pady=(20, 10), padx=20)

        # Description
        desc_text = f"{tool_name} is required for this application to work."
        if is_optional:
            desc_text = f"{tool_name} is optional but recommended for advanced features."

        ttk.Label(self, text=desc_text, foreground='#666',
                 wraplength=550).pack(pady=(0, 20), padx=20)

        # Options frame
        options_frame = ttk.LabelFrame(self, text="Options", padding=10)
        options_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        # Installation instructions
        ttk.Label(options_frame, text="Installation Instructions:",
                 font=('', 10, 'bold')).pack(anchor='w', pady=(0, 5))
        ttk.Label(options_frame, text=install_cmd, foreground='#0066cc',
                 wraplength=540).pack(anchor='w', pady=(0, 15))

        # Button row
        btn_frame = ttk.Frame(options_frame)
        btn_frame.pack(fill=tk.X, pady=(10, 0))

        ttk.Button(btn_frame, text="📖 View Installation Guide",
                  command=lambda: webbrowser.open(help_url)).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(btn_frame, text="Browse for Executable",
                  command=self._browse_path).pack(side=tk.LEFT, padx=(0, 5))

        # Buttons at bottom
        btn_bottom = ttk.Frame(self)
        btn_bottom.pack(fill=tk.X, padx=20, pady=(10, 20))

        if is_optional:
            ttk.Button(btn_bottom, text="Continue Without",
                      command=lambda: self._close(skip=True)).pack(side=tk.LEFT, padx=(0, 5))
        if is_required:
            ttk.Button(btn_bottom, text="Exit",
                      command=lambda: self._close(exit_app=True)).pack(side=tk.RIGHT)
        if self.result is None:
            ttk.Button(btn_bottom, text="Retry",
                      command=lambda: self._close(retry=True)).pack(side=tk.RIGHT, padx=(0, 5))

    def _browse_path(self):
        if _WIN:
            filetypes = [("Executable", "*.exe"), ("All files", "*.*")]
        else:
            filetypes = [("All files", "*")]

        path = filedialog.askopenfilename(title="Select executable", filetypes=filetypes)
        if path:
            self.result = path
            self.destroy()

    def _close(self, skip=False, retry=False, exit_app=False):
        if skip:
            self.result = "skip"
        elif exit_app:
            self.result = "exit"
        elif retry:
            self.result = "retry"
        self.destroy()


def create_extract_icon(parent, size: int = 96) -> tk.Canvas:
    canvas = tk.Canvas(parent, width=size, height=size, bg='white', highlightthickness=0)

    margin = size // 10

    # Gradient-like blue background
    for i in range(margin, size - margin):
        ratio = (i - margin) / (size - 2 * margin)
        color_val = int(70 + (100 * ratio))
        color = f'#{color_val:02x}82{int(220 - 50*ratio):02x}'
        canvas.create_line(margin, i, size - margin, i, fill=color, width=1)

    # Draw upward arrow
    center_x, center_y = size // 2, size // 2
    arrow_size = size // 4

    # Arrow shaft
    canvas.create_rectangle(center_x - arrow_size//6, center_y - arrow_size//2,
                           center_x + arrow_size//6, center_y + arrow_size//4,
                           fill='white', outline='white')

    # Arrow head (triangle pointing up)
    canvas.create_polygon(
        center_x, center_y - arrow_size,
        center_x - arrow_size//2, center_y - arrow_size//3,
        center_x + arrow_size//2, center_y - arrow_size//3,
        fill='white', outline='white'
    )

    return canvas


def create_add_icon(parent, size: int = 96) -> tk.Canvas:
    canvas = tk.Canvas(parent, width=size, height=size, bg='white', highlightthickness=0)

    margin = size // 10

    # Gradient-like orange/gold background
    for i in range(margin, size - margin):
        ratio = (i - margin) / (size - 2 * margin)
        color_val = int(220 + (35 * ratio))
        color = f'#{color_val:02x}{int(180 - 50*ratio):02x}46'
        canvas.create_line(margin, i, size - margin, i, fill=color, width=1)

    # Draw two audio tracks merging (mixing icon)
    center_x, center_y = size // 2, size // 2
    track_width = size // 5
    line_width = 3

    # Top audio track (coming from left)
    canvas.create_line(margin + 8, center_y - track_width,
                      center_x - 8, center_y - 8,
                      fill='white', width=line_width)

    # Bottom audio track (coming from left)
    canvas.create_line(margin + 8, center_y + track_width,
                      center_x - 8, center_y + 8,
                      fill='white', width=line_width)

    # Merged track (going right)
    canvas.create_line(center_x + 8, center_y,
                      size - margin - 8, center_y,
                      fill='white', width=line_width)

    # Mixer node (small circle where they meet)
    node_size = size // 12
    canvas.create_oval(center_x - node_size, center_y - node_size,
                      center_x + node_size, center_y + node_size,
                      fill='white', outline='white')

    return canvas


def _probe_audio_streams(filepath: str) -> List['AudioStreamInfo']:
    """Run ffprobe and return a list of audio streams. Returns [] on any failure."""
    try:
        proc = subprocess.run([
            'ffprobe', '-v', 'quiet',
            '-select_streams', 'a',
            '-show_entries', 'stream=index,codec_name,channels:stream_tags=language,title',
            '-of', 'csv=p=0',
            filepath,
        ], capture_output=True, text=True, timeout=30, **_POPEN_FLAGS)

        if proc.returncode != 0:
            return []

        result = []
        for rel_idx, line in enumerate(proc.stdout.splitlines()):
            line = line.strip()
            if not line:
                continue
            parts = line.split(',')
            codec = parts[1] if len(parts) > 1 else ''
            chans = parts[2] if len(parts) > 2 else ''
            lang  = parts[3] if len(parts) > 3 else ''
            title = parts[4] if len(parts) > 4 else ''
            result.append(AudioStreamInfo(rel_idx, codec, chans, lang, title))
        return result
    except Exception:
        return []


def _get_duration(filepath: str) -> Optional[float]:
    try:
        proc = subprocess.run([
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filepath,
        ], capture_output=True, text=True, timeout=15, **_POPEN_FLAGS)
        if proc.returncode == 0 and proc.stdout.strip():
            return float(proc.stdout.strip())
    except Exception:
        pass
    return None


def _get_audio_codec(filepath: str) -> str:
    """Detect audio codec from file.
    Returns codec suitable for ffmpeg re-encoding (e.g., 'aac', 'eac3', 'ac3')."""
    try:
        # Check file extension first
        ext = os.path.splitext(filepath)[1].lower()
        if ext == '.aac':
            return 'aac'
        elif ext in ['.eac3', '.ec3']:
            return 'eac3'
        elif ext in ['.ac3']:
            return 'ac3'

        # If extension is inconclusive, query ffprobe
        proc = subprocess.run([
            'ffprobe', '-v', 'error',
            '-select_streams', 'a:0',
            '-show_entries', 'stream=codec_name',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filepath,
        ], capture_output=True, text=True, timeout=15, **_POPEN_FLAGS)

        if proc.returncode == 0:
            codec = proc.stdout.strip().lower()
            # Map codec names to ffmpeg re-encoding codec names
            codec_map = {
                'aac': 'aac',
                'he-aac': 'aac',
                'eac3': 'eac3',
                'ac3': 'ac3',
                'flac': 'flac',
                'opus': 'opus',
                'libopus': 'opus',
                'vorbis': 'libvorbis',
            }
            return codec_map.get(codec, 'aac')  # Default to aac if unknown
    except Exception:
        pass
    return 'aac'  # Safe default


def _is_audio_codec_supported_in_mp4(codec: str) -> bool:
    """Check if audio codec is supported in MP4 container.
    MP4 natively supports: aac, mp3, opus
    MP4 does NOT support: eac3, ac3, dts, flac, vorbis
    """
    supported_in_mp4 = {'aac', 'mp3', 'opus', 'he-aac'}
    return codec.lower() in supported_in_mp4


def _get_output_format_for_video(video_file: str, audio_codec: str) -> str:
    """Determine best output format based on video input and audio codec.
    Returns 'mkv' if video is MP4 or audio codec isn't supported in MP4.
    Returns 'mp4' if video is already MP4 and audio codec is supported.
    """
    video_ext = os.path.splitext(video_file)[1].lower()

    # If video is MP4 and audio codec is not supported in MP4, use MKV
    if video_ext == '.mp4' and not _is_audio_codec_supported_in_mp4(audio_codec):
        return 'mkv'

    # Keep original format for MKV videos
    if video_ext == '.mkv':
        return 'mkv'

    # Default to MKV for compatibility with all audio codecs
    return 'mkv'


# ── Data classes ─────────────────────────────────────────────────────────────
class AudioStreamInfo:
    def __init__(self, index: int, codec: str, channels: str, lang: str, title: str):
        self.index    = index
        self.codec    = codec    or '?'
        self.channels = channels or '?'
        self.lang     = lang     or ''
        self.title    = title    or ''

    def display(self) -> str:
        s = f"a:{self.index}  {self.codec}"
        if self.channels != '?':
            s += f"  {self.channels}ch"
        if self.lang:
            s += f"  [{self.lang}]"
        if self.title:
            s += f"  {self.title}"
        return s

    def extension(self) -> str:
        return {'eac3': 'eac3', 'ac3': 'ac3', 'aac': 'aac', 'dts': 'dts',
                'flac': 'flac', 'opus': 'opus', 'mp3': 'mp3'}.get(
                    self.codec.lower(), 'mka')


class VideoEntry:
    def __init__(self, file: str):
        self.file         = file
        self.streams: Optional[List[AudioStreamInfo]] = None  # None = still probing
        self.selected_idx = 0
        self.probe_status = 'Probing...'


class AddEntry:
    def __init__(self, video_file: str, audio_file: str = ''):
        self.video_file = video_file
        self.audio_file = audio_file


# ══════════════════════════════════════════════════════════════════════════════
# Application
# ══════════════════════════════════════════════════════════════════════════════
class FFmpegAudioManager:
    def __init__(self, root: tk.Tk):
        self.root = root
        root.title("FFmpeg Audio Manager")
        root.minsize(1100, 620)

        # Processing state
        self.current_process: Optional[subprocess.Popen] = None
        self.cancel_flag  = threading.Event()
        self.log_queue    = queue.Queue()
        self.progress_queue = queue.Queue()
        self._task_start_time: Optional[float] = None

        # Parallel probing executor (max 4 workers for optimal throughput)
        self.probe_executor = ThreadPoolExecutor(max_workers=min(4, os.cpu_count() or 1))

        # Data
        self.video_entries: List[VideoEntry] = []
        self.add_entries:   List[AddEntry]   = []
        self.last_audio_pick_dir: Optional[str] = None

        # GPU settings
        self.gpu_encoders = detect_gpu_encoders()
        self.gpu_enabled = tk.BooleanVar(value=bool(self.gpu_encoders))
        self.gpu_encoder_var = tk.StringVar()
        self.gpu_quality_var = tk.StringVar(value='balanced')
        if self.gpu_encoders:
            self.gpu_encoder_var.set(self.gpu_encoders[0].name)

        # Batch processing settings
        if BatchProcessor:
            self.batch_processor = BatchProcessor()
            self.batch_active = False
            self.batch_thread: Optional[threading.Thread] = None
            self.batch_max_parallel_var = tk.StringVar(value=str(self.batch_processor.max_parallel))
            # Progress tracking
            self.batch_stats = {"queued": 0, "active": 0, "completed": 0, "failed": 0}
        else:
            self.batch_processor = None
            self.batch_active = False
            self.batch_thread = None
            self.batch_max_parallel_var = tk.StringVar(value="4")
            self.batch_stats = {"queued": 0, "active": 0, "completed": 0, "failed": 0}

        # Theme system
        self.theme_manager = UIThemeManager() if UIThemeManager else None
        self.dark_mode_var = tk.BooleanVar(value=self.theme_manager.dark_mode if self.theme_manager else False)

        # UI panels (set during _build_ui)
        self.content_area  = None
        self.home_frame    = None
        self.extract_frame = None
        self.add_frame     = None

        self._build_ui()
        self.root.after(50, self._process_queues)
        self.root.protocol("WM_DELETE_WINDOW", self._on_window_close)

    # ══════════════════════════════════════════════════════════════════════════
    # UI build
    # ══════════════════════════════════════════════════════════════════════════
    def _build_ui(self):
        style = ttk.Style()

        # Apply theme if available
        if self.theme_manager:
            self.theme_manager.configure_ttk_style(style)

        # Enhanced styling for better visual appearance
        style.configure('Treeview', rowheight=28, padding=4)
        style.configure('TButton', padding=6)
        style.configure('TLabel', padding=2)
        style.configure('TLabelframe', padding=6)
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
        self._show_home()

    # ── Cleanup ──────────────────────────────────────────────────────────────
    def _on_window_close(self):
        self.probe_executor.shutdown(wait=True)
        self.root.destroy()

    # ── Navigation ──────────────────────────────────────────────────────────
    def _show_panel(self, frame: tk.Frame, show_progress_log=False):
        for w in self.content_area.winfo_children():
            w.pack_forget()
        frame.pack(fill=tk.BOTH, expand=True)

        if show_progress_log:
            self.left_pane.add(self.progress_panel, minsize=64)
            self.outer_pane.add(self.log_panel, minsize=260, width=280)
        else:
            self.left_pane.remove(self.progress_panel)
            self.outer_pane.remove(self.log_panel)

    def _show_home(self):    self._show_panel(self.home_frame, show_progress_log=False)
    def _show_extract(self): self._show_panel(self.extract_frame, show_progress_log=True)
    def _show_add(self):     self._show_panel(self.add_frame, show_progress_log=True)

    # ── Home Panel ──────────────────────────────────────────────────────────
    def _build_home_panel(self) -> tk.Frame:
        frame = ttk.Frame(self.content_area, padding=24)

        ttk.Label(frame, text="FFmpeg Audio Manager",
                  font=('', 20, 'bold')).pack(pady=(0, 6))
        ttk.Label(frame, text="Manage audio tracks in your video files",
                  font=('', 10), foreground='#888').pack(pady=(0, 18))

        # Status: Dependencies (single line)
        ffmpeg_path = check_ffmpeg()
        mkvmerge_path = find_mkvmerge()

        ffmpeg_status = "✓" if ffmpeg_path else "✗"
        mkvmerge_status = "✓" if mkvmerge_path else "○"
        ffmpeg_color = '#6ec97a' if ffmpeg_path else '#f28779'
        mkvmerge_color = '#6ec97a' if mkvmerge_path else '#ffe066'

        status_frame = tk.Frame(frame, bg='white')
        status_frame.pack(fill=tk.X, pady=(0, 10))
        ttk.Label(status_frame, text="Status:", font=('', 9), foreground='#666').pack(side=tk.LEFT)
        tk.Label(status_frame, text=f" FFmpeg {ffmpeg_status}", fg=ffmpeg_color,
                font=('', 9, 'bold'), bg='white').pack(side=tk.LEFT, padx=(4, 12))
        tk.Label(status_frame, text=f"mkvmerge {mkvmerge_status}", fg=mkvmerge_color,
                font=('', 9, 'bold'), bg='white').pack(side=tk.LEFT)


        # Card: Extract
        card1 = ttk.LabelFrame(frame, text="", padding=14)
        card1.pack(fill=tk.X, pady=10, ipadx=4, ipady=4)

        # Content row: icon + text
        content1 = tk.Frame(card1, bg='white')
        content1.pack(anchor='w', fill=tk.BOTH, expand=True, pady=(0, 10))
        extract_canvas = create_extract_icon(content1, 96)
        extract_canvas.pack(side=tk.LEFT, padx=(0, 16))
        text_frame1 = ttk.Frame(content1)
        text_frame1.pack(anchor='w', fill=tk.BOTH, expand=True, side=tk.LEFT)
        ttk.Label(text_frame1, text="Extract Audio from Videos",
                  font=('', 12, 'bold')).pack(anchor='w')
        ttk.Label(text_frame1, text="Probe video files, pick an audio stream, and save it as a standalone audio file.",
                  foreground='#666', wraplength=480).pack(anchor='w', pady=(6, 0))

        ttk.Button(card1, text="Open Extract Panel →",
                   style='Accent.TButton',
                   command=self._show_extract).pack(anchor='e', ipady=8, ipadx=14, pady=(4, 0))

        # Card: Add
        card2 = ttk.LabelFrame(frame, text="", padding=14)
        card2.pack(fill=tk.X, pady=10, ipadx=4, ipady=4)

        # Content row: icon + text
        content2 = tk.Frame(card2, bg='white')
        content2.pack(anchor='w', fill=tk.BOTH, expand=True, pady=(0, 10))
        add_canvas = create_add_icon(content2, 96)
        add_canvas.pack(side=tk.LEFT, padx=(0, 16))
        text_frame2 = ttk.Frame(content2)
        text_frame2.pack(anchor='w', fill=tk.BOTH, expand=True, side=tk.LEFT)
        ttk.Label(text_frame2, text="Add Audio to Videos",
                  font=('', 12, 'bold')).pack(anchor='w')
        ttk.Label(text_frame2, text="Merge an external audio file into a video. Supports auto-matching by episode number, "
                  "duration padding, and both FFmpeg / mkvmerge backends.",
                  foreground='#666', wraplength=480).pack(anchor='w', pady=(6, 0))

        ttk.Button(card2, text="Open Add Audio Panel →",
                   style='Accent.TButton',
                   command=self._show_add).pack(anchor='e', ipady=8, ipadx=14, pady=(4, 0))

        return frame

    # ── Log Panel ───────────────────────────────────────────────────────────
    def _build_log_panel(self, parent) -> tk.Frame:
        frame = ttk.LabelFrame(parent, text="Log Output", padding=4)

        btn_row = ttk.Frame(frame)
        btn_row.pack(fill=tk.X, pady=(0, 2))
        ttk.Button(btn_row, text="Copy Log",
                   command=self._copy_log).pack(side=tk.RIGHT, padx=(2, 0))
        ttk.Button(btn_row, text="Clear Log",
                   command=self._clear_log).pack(side=tk.RIGHT, padx=(0, 2))

        self.log_text = tk.Text(frame, bg='#1e1e1e', fg='#c8c8c8',
                                font=('Consolas', 10), wrap=tk.WORD,
                                state=tk.DISABLED, height=15)
        # Configure colour tags
        for key, cfg in LOG_TAGS.items():
            self.log_text.tag_configure(key, **cfg)

        vsb = ttk.Scrollbar(frame, orient=tk.VERTICAL, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=vsb.set)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        return frame

    def _clear_log(self):
        self.log_text.config(state=tk.NORMAL)
        self.log_text.delete('1.0', tk.END)
        self.log_text.config(state=tk.DISABLED)

    def _copy_log(self):
        text = self.log_text.get('1.0', tk.END).strip()
        if text:
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self.root.update()
            messagebox.showinfo("Copied", "Log copied to clipboard.")
        else:
            messagebox.showwarning("Empty", "Log is empty.")

    # ── Step 1: Extract ─────────────────────────────────────────────────────
    def _build_extract_panel(self) -> tk.Frame:
        frame = ttk.Frame(self.content_area)

        header = ttk.Frame(frame)
        header.pack(fill=tk.X, pady=(0, 6))
        ttk.Button(header, text="← Back", command=self._show_home).pack(side=tk.LEFT, padx=2)
        ttk.Label(header, text="Step 1: Extract Audio from Video Files",
                  font=('', 11, 'bold')).pack(side=tk.LEFT, padx=10)

        content = ttk.LabelFrame(frame, text="", padding=8)
        content.pack(fill=tk.BOTH, expand=True)

        tb = ttk.Frame(content)
        tb.pack(fill=tk.X, pady=(0, 8))
        self.extract_add_files_btn = ttk.Button(tb, text="+ Add Files",
                   command=self._add_files_step1)
        self.extract_add_files_btn.pack(side=tk.LEFT, padx=3)
        self.extract_add_folder_btn = ttk.Button(tb, text="+ Add Folder",
                   command=self._add_folder_step1)
        self.extract_add_folder_btn.pack(side=tk.LEFT, padx=3)
        ttk.Separator(tb, orient=tk.VERTICAL).pack(side=tk.LEFT, padx=8, fill=tk.Y, pady=2)
        self.extract_remove_btn = ttk.Button(tb, text="Remove Selected",
                   command=self._remove_selected_step1)
        self.extract_remove_btn.pack(side=tk.LEFT, padx=3)
        self.extract_clear_btn = ttk.Button(tb, text="Clear All",
                   command=self._clear_step1)
        self.extract_clear_btn.pack(side=tk.LEFT, padx=3)

        cols = ('#', 'File Name', 'Extract Stream  (click to change)')
        tf = ttk.Frame(content)
        tf.pack(fill=tk.BOTH, expand=True)

        self.extract_tree = ttk.Treeview(tf, columns=cols, show='headings',
                                         height=5, selectmode='extended')
        self.extract_tree.heading('#',         text='#')
        self.extract_tree.heading('File Name', text='File Name')
        self.extract_tree.heading(cols[2],     text=cols[2])
        self.extract_tree.column('#',          width=36,  stretch=False, anchor='center')
        self.extract_tree.column('File Name',  width=260, stretch=True)
        self.extract_tree.column(cols[2],      width=400, stretch=True)

        vsb = ttk.Scrollbar(tf, orient=tk.VERTICAL,   command=self.extract_tree.yview)
        hsb = ttk.Scrollbar(tf, orient=tk.HORIZONTAL, command=self.extract_tree.xview)
        self.extract_tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        vsb.pack(side=tk.RIGHT,  fill=tk.Y)
        hsb.pack(side=tk.BOTTOM, fill=tk.X)
        self.extract_tree.pack(fill=tk.BOTH, expand=True)
        self.extract_tree.bind('<ButtonRelease-1>', self._on_extract_tree_click)

        bot = ttk.Frame(content)
        bot.pack(fill=tk.X, pady=(6, 0))
        ttk.Label(bot, text="Output Folder:", width=15, anchor='w').pack(side=tk.LEFT)
        self.extract_out_var = tk.StringVar()
        self.extract_out_entry = ttk.Entry(bot, textvariable=self.extract_out_var)
        self.extract_out_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
        self.extract_out_browse_btn = ttk.Button(bot, text="Browse...",
                   command=lambda: self._browse_folder(self.extract_out_var))
        self.extract_out_browse_btn.pack(side=tk.LEFT)
        self.extract_btn = ttk.Button(bot, text="  Extract Audio  ",
                                      command=self._on_extract_clicked)
        self.extract_btn.pack(side=tk.RIGHT, padx=(8, 0), ipady=4)
        return frame

    def _on_extract_tree_click(self, event):
        if self.extract_tree.identify_region(event.x, event.y) != 'cell':
            return
        col  = self.extract_tree.identify_column(event.x)
        item = self.extract_tree.identify_row(event.y)
        if not item or col != '#3':
            return

        idx   = self.extract_tree.index(item)
        entry = self.video_entries[idx]
        if not entry.streams:
            return

        bbox = self.extract_tree.bbox(item, col)
        if not bbox:
            return
        x, y, w, h = bbox

        combo = ttk.Combobox(self.extract_tree,
                             values=[s.display() for s in entry.streams],
                             state='readonly', font=('', 10))
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
            filetypes=[("Video files", "*.mkv *.mp4 *.avi *.mov *.ts *.m2ts"),
                       ("All files", "*.*")])
        for f in files:
            self._add_video_entry(f)

    def _add_folder_step1(self):
        d = filedialog.askdirectory(title="Select Video Folder")
        if not d:
            return
        files = sorted(f for f in os.listdir(d) if is_video_file(f))
        if not files:
            messagebox.showwarning("Empty", f"No video files found in:\n{d}")
            return
        for f in files:
            self._add_video_entry(os.path.join(d, f))

    def _add_video_entry(self, filepath: str):
        if any(e.file == filepath for e in self.video_entries):
            return
        entry = VideoEntry(filepath)
        self.video_entries.append(entry)
        idx = len(self.video_entries) - 1
        self.extract_tree.insert('', tk.END, iid=str(idx),
            values=(idx + 1, os.path.basename(filepath), 'Probing...'))
        self.probe_executor.submit(self._probe_entry, entry, idx)

    def _probe_entry(self, entry: VideoEntry, idx: int):
        streams = _probe_audio_streams(entry.file)
        entry.streams      = streams
        entry.probe_status = 'Ready' if streams else 'No audio streams found'
        self.log_queue.put(('refresh_extract_row', idx))

    def _refresh_extract_row(self, idx: int):
        entry = self.video_entries[idx]
        iid   = str(idx)
        if not self.extract_tree.exists(iid):
            return
        si = max(0, min(entry.selected_idx, len(entry.streams) - 1)) if entry.streams else 0
        stream_disp = entry.streams[si].display() if entry.streams else entry.probe_status
        self.extract_tree.item(iid, values=(idx + 1, os.path.basename(entry.file), stream_disp))

    def _remove_selected_step1(self):
        sel = self.extract_tree.selection()
        if not sel:
            return
        for i in sorted({self.extract_tree.index(i) for i in sel}, reverse=True):
            del self.video_entries[i]
        self._rebuild_extract_tree()

    def _clear_step1(self):
        self.video_entries.clear()
        self.extract_tree.delete(*self.extract_tree.get_children())

    def _rebuild_extract_tree(self):
        self.extract_tree.delete(*self.extract_tree.get_children())
        for i, e in enumerate(self.video_entries):
            si = max(0, min(e.selected_idx, len(e.streams) - 1)) if e.streams else 0
            stream_disp = e.streams[si].display() if e.streams else e.probe_status
            self.extract_tree.insert('', tk.END, iid=str(i),
                values=(i + 1, os.path.basename(e.file), stream_disp))

    # ── Step 2: Add Audio ───────────────────────────────────────────────────
    def _build_add_audio_panel(self) -> tk.Frame:
        frame = ttk.Frame(self.content_area)

        header = ttk.Frame(frame)
        header.pack(fill=tk.X, pady=(0, 6))
        ttk.Button(header, text="← Back", command=self._show_home).pack(side=tk.LEFT, padx=2)
        ttk.Label(header, text="Step 2: Add Audio to Videos",
                  font=('', 11, 'bold')).pack(side=tk.LEFT, padx=10)

        content = ttk.LabelFrame(frame, text="", padding=8)
        content.pack(fill=tk.BOTH, expand=True)

        # Audio folder row — auto-matches by episode whenever changed
        af_row = ttk.Frame(content)
        af_row.pack(fill=tk.X, pady=(0, 8))
        ttk.Label(af_row, text="Audio Folder:", width=15, anchor='w').pack(side=tk.LEFT)
        self.audio_folder_var = tk.StringVar()
        self.audio_folder_var.trace_add('write', lambda *_: self._auto_match_all())
        self.audio_folder_entry = ttk.Entry(af_row, textvariable=self.audio_folder_var)
        self.audio_folder_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
        self.audio_folder_browse_btn = ttk.Button(af_row, text="Browse...",
                   command=self._browse_audio_folder)
        self.audio_folder_browse_btn.pack(side=tk.LEFT)

        # Toolbar
        tb = ttk.Frame(content)
        tb.pack(fill=tk.X, pady=(0, 8))
        self.add_videos_btn = ttk.Button(tb, text="+ Add Videos",
                   command=self._add_videos_step2)
        self.add_videos_btn.pack(side=tk.LEFT, padx=3)
        self.add_folder_btn = ttk.Button(tb, text="+ Add Video Folder",
                   command=self._add_folder_step2)
        self.add_folder_btn.pack(side=tk.LEFT, padx=3)
        ttk.Separator(tb, orient=tk.VERTICAL).pack(side=tk.LEFT, padx=8, fill=tk.Y, pady=2)
        self.remove_selected_btn = ttk.Button(tb, text="Remove Selected",
                   command=self._remove_selected_step2)
        self.remove_selected_btn.pack(side=tk.LEFT, padx=3)
        self.clear_all_btn = ttk.Button(tb, text="Clear All",
                   command=self._clear_add_videos)
        self.clear_all_btn.pack(side=tk.LEFT, padx=3)

        # Table
        cols = ('#', 'Video File', 'Audio File  (double-click or click cell to pick)')
        tf = ttk.Frame(content)
        tf.pack(fill=tk.BOTH, expand=True)

        self.add_tree = ttk.Treeview(tf, columns=cols, show='headings',
                                     height=5, selectmode='extended')
        self.add_tree.heading('#',          text='#')
        self.add_tree.heading('Video File', text='Video File')
        self.add_tree.heading(cols[2],      text=cols[2])
        self.add_tree.column('#',          width=36,  stretch=False, anchor='center')
        self.add_tree.column('Video File', width=280, stretch=True)
        self.add_tree.column(cols[2],      width=340, stretch=True)
        self.add_tree.tag_configure('no_audio', foreground='#999999')

        vsb = ttk.Scrollbar(tf, orient=tk.VERTICAL,   command=self.add_tree.yview)
        hsb = ttk.Scrollbar(tf, orient=tk.HORIZONTAL, command=self.add_tree.xview)
        self.add_tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        vsb.pack(side=tk.RIGHT,  fill=tk.Y)
        hsb.pack(side=tk.BOTTOM, fill=tk.X)
        self.add_tree.pack(fill=tk.BOTH, expand=True)

        self.add_tree.bind('<Double-ButtonRelease-1>', self._on_add_tree_pick)
        self.add_tree.bind('<ButtonRelease-1>',        self._on_add_tree_single_click)

        ttk.Label(content,
                  text="Audio files are matched automatically by episode (SxxExx). "
                       "Double-click a row or click the Audio cell to override manually.",
                  foreground='#666', wraplength=560).pack(anchor='w', pady=(2, 0))

        # GPU Hardware Acceleration
        gpu_frame = ttk.LabelFrame(content, text="GPU Hardware Acceleration", padding=4)
        gpu_frame.pack(fill=tk.X, pady=(6, 4))

        gpu_status = f"({len(self.gpu_encoders)} encoder detected)" if len(self.gpu_encoders) == 1 else \
                     f"({len(self.gpu_encoders)} encoders detected)" if self.gpu_encoders else "(No GPU encoders)"
        self.gpu_enabled_check = ttk.Checkbutton(
            gpu_frame,
            text=f"Enable GPU encoding  {gpu_status}",
            variable=self.gpu_enabled,
            command=self._toggle_gpu_controls
        )
        self.gpu_enabled_check.pack(anchor='w', padx=4, pady=(2, 4))

        if self.gpu_encoders:
            enc_frame = ttk.Frame(gpu_frame)
            enc_frame.pack(fill=tk.X, padx=20, pady=2)
            ttk.Label(enc_frame, text="Encoder:", width=12, anchor='w').pack(side=tk.LEFT)
            enc_names = [f"{e.display_name()}" for e in self.gpu_encoders]
            self.gpu_encoder_menu = ttk.Combobox(enc_frame, textvariable=self.gpu_encoder_var,
                                    values=enc_names, state='readonly', width=32)
            self.gpu_encoder_menu.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)

            qual_frame = ttk.Frame(gpu_frame)
            qual_frame.pack(fill=tk.X, padx=20, pady=2)
            ttk.Label(qual_frame, text="Quality:", width=12, anchor='w').pack(side=tk.LEFT)
            self.gpu_quality_fast = ttk.Radiobutton(qual_frame, text="Fast", variable=self.gpu_quality_var,
                            value='fast')
            self.gpu_quality_fast.pack(side=tk.LEFT, padx=2)
            self.gpu_quality_balanced = ttk.Radiobutton(qual_frame, text="Balanced", variable=self.gpu_quality_var,
                            value='balanced')
            self.gpu_quality_balanced.pack(side=tk.LEFT, padx=2)
            self.gpu_quality_quality = ttk.Radiobutton(qual_frame, text="Quality", variable=self.gpu_quality_var,
                            value='quality')
            self.gpu_quality_quality.pack(side=tk.LEFT, padx=2)

            # Update control states based on checkbox
            self._toggle_gpu_controls()
        else:
            ttk.Label(gpu_frame, text="No GPU encoders detected on this system.",
                      foreground='#666').pack(anchor='w', padx=4, pady=2)

        # Merge Tool
        tool_frame = ttk.LabelFrame(content, text="Merge Tool", padding=4)
        tool_frame.pack(fill=tk.X, pady=(6, 4))
        self.add_tool_var = tk.StringVar(value="auto")
        self.rb_auto = ttk.Radiobutton(tool_frame,
                        text="Auto  —  use mkvmerge if available, else FFmpeg",
                        variable=self.add_tool_var, value="auto")
        self.rb_auto.pack(anchor='w', padx=4)
        self.rb_mkvmerge = ttk.Radiobutton(tool_frame,
                        text="Force mkvmerge  —  Hindi as first track, all originals kept",
                        variable=self.add_tool_var, value="mkvmerge")
        self.rb_mkvmerge.pack(anchor='w', padx=4)
        self.rb_ffmpeg = ttk.Radiobutton(tool_frame,
                        text="Force FFmpeg  —  compatible with more containers",
                        variable=self.add_tool_var, value="ffmpeg")
        self.rb_ffmpeg.pack(anchor='w', padx=4)

        # Batch Processing
        if self.batch_processor:
            batch_frame = ttk.LabelFrame(content, text="Batch Processing", padding=4)
            batch_frame.pack(fill=tk.X, pady=(6, 4))

            self.batch_mode_var = tk.BooleanVar(value=False)
            ttk.Checkbutton(batch_frame,
                           text=f"Enable parallel batch processing  (max {self.batch_processor.max_parallel} concurrent)",
                           variable=self.batch_mode_var).pack(anchor='w', padx=4, pady=2)

            par_frame = ttk.Frame(batch_frame)
            par_frame.pack(fill=tk.X, padx=20, pady=2)
            ttk.Label(par_frame, text="Processes:", width=12, anchor='w').pack(side=tk.LEFT)
            self.batch_parallel_spin = ttk.Spinbox(par_frame,
                                                   from_=1,
                                                   to=self.batch_processor.max_parallel,
                                                   textvariable=self.batch_max_parallel_var,
                                                   width=4)
            self.batch_parallel_spin.pack(side=tk.LEFT, padx=4)
            ttk.Label(par_frame, text=f"(system: {self.batch_processor.max_parallel} cores)",
                     foreground='#666').pack(side=tk.LEFT)

            # Batch Progress Display (initially hidden)
            self.batch_progress_frame = ttk.LabelFrame(batch_frame, text="Progress", padding=4)
            self.batch_progress_frame.pack(fill=tk.X, pady=(6, 0))
            self.batch_progress_frame.pack_forget()  # Hide initially

            # Progress bar
            self.batch_progress_bar = ttk.Progressbar(self.batch_progress_frame,
                                                       mode='determinate',
                                                       maximum=100)
            self.batch_progress_bar.pack(fill=tk.X, pady=2)

            # Statistics row
            stat_frame = ttk.Frame(self.batch_progress_frame)
            stat_frame.pack(fill=tk.X, pady=(4, 0))
            self.batch_queued_label = ttk.Label(stat_frame, text="Queued: 0")
            self.batch_queued_label.pack(side=tk.LEFT, padx=(0, 12))
            self.batch_active_label = ttk.Label(stat_frame, text="Active: 0")
            self.batch_active_label.pack(side=tk.LEFT, padx=(0, 12))
            self.batch_completed_label = ttk.Label(stat_frame, text="Completed: 0")
            self.batch_completed_label.pack(side=tk.LEFT, padx=(0, 12))
            self.batch_failed_label = ttk.Label(stat_frame, text="Failed: 0")
            self.batch_failed_label.pack(side=tk.LEFT)

        # Output folder + action button
        bot = ttk.Frame(content)
        bot.pack(fill=tk.X, pady=(6, 0))
        ttk.Label(bot, text="Output Folder:", width=15, anchor='w').pack(side=tk.LEFT)
        self.add_out_var = tk.StringVar()
        self.add_out_entry = ttk.Entry(bot, textvariable=self.add_out_var)
        self.add_out_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
        self.add_out_browse_btn = ttk.Button(bot, text="Browse...",
                   command=lambda: self._browse_folder(self.add_out_var))
        self.add_out_browse_btn.pack(side=tk.LEFT)
        self.add_audio_btn = tk.Button(bot, text="  Start Mixing  ",
                                       command=self._on_add_audio_clicked,
                                       bg='#27ae60', fg='white',
                                       activebackground='#229954', activeforeground='white',
                                       relief=tk.RAISED, padx=16, pady=2)
        self.add_audio_btn.pack(side=tk.RIGHT, padx=(8, 0), ipady=4)
        return frame

    def _browse_audio_folder(self):
        d = filedialog.askdirectory(title="Select Audio Folder")
        if d:
            self.audio_folder_var.set(d)  # trace fires _auto_match_all automatically

    def _auto_match_all(self):
        """Match audio files to all loaded video entries by SxxExx episode code."""
        audio_dir = self.audio_folder_var.get().strip()
        if not audio_dir or not os.path.isdir(audio_dir) or not self.add_entries:
            return

        audio_files = [f for f in os.listdir(audio_dir) if is_audio_file(f)]
        if not audio_files:
            return

        ep_map: dict[str, str] = {}
        for af in audio_files:
            ep = episode_key(af)
            if ep and ep not in ep_map:
                ep_map[ep] = os.path.join(audio_dir, af)

        for i, entry in enumerate(self.add_entries):
            ep = episode_key(os.path.basename(entry.video_file))
            if ep and ep in ep_map:
                entry.audio_file = ep_map[ep]
                self._refresh_add_row(i)

    def _pick_audio_for_row(self, idx: int):
        entry = self.add_entries[idx]
        if self.last_audio_pick_dir:
            init = self.last_audio_pick_dir
        elif entry.audio_file:
            init = os.path.dirname(entry.audio_file)
        else:
            init = os.path.dirname(entry.video_file)
        path  = filedialog.askopenfilename(
            title=f"Pick audio for: {os.path.basename(entry.video_file)}",
            initialdir=init,
            filetypes=[
                ("Audio / Video", "*.eac3 *.ac3 *.aac *.dts *.flac *.mka *.mp3 *.opus *.mkv *.mp4"),
                ("All files", "*.*")])
        if not path:
            return
        entry.audio_file = path
        self.last_audio_pick_dir = os.path.dirname(path)
        self._refresh_add_row(idx)

    def _on_add_tree_pick(self, event):
        item = self.add_tree.identify_row(event.y)
        if not item:
            return
        self._pick_audio_for_row(self.add_tree.index(item))

    def _on_add_tree_single_click(self, event):
        if self.add_tree.identify_region(event.x, event.y) != 'cell':
            return
        col  = self.add_tree.identify_column(event.x)
        item = self.add_tree.identify_row(event.y)
        if not item or col != '#3':
            return
        self._pick_audio_for_row(self.add_tree.index(item))

    def _add_videos_step2(self):
        files = filedialog.askopenfilenames(
            title="Select Video Files",
            filetypes=[("Video files", "*.mkv *.mp4 *.avi *.mov *.ts *.m2ts"),
                       ("All files", "*.*")])
        for f in files:
            self._add_add_entry(f)

    def _add_folder_step2(self):
        d = filedialog.askdirectory(title="Select Video Folder")
        if not d:
            return
        files = sorted(f for f in os.listdir(d) if is_video_file(f))
        if not files:
            messagebox.showwarning("Empty", f"No video files found in:\n{d}")
            return
        for f in files:
            self._add_add_entry(os.path.join(d, f))

    def _add_add_entry(self, filepath: str):
        if any(e.video_file == filepath for e in self.add_entries):
            return
        entry = AddEntry(filepath)
        # Try to auto-match by episode before inserting
        audio_dir = self.audio_folder_var.get().strip()
        if audio_dir and os.path.isdir(audio_dir):
            ep = episode_key(os.path.basename(filepath))
            if ep:
                for af in os.listdir(audio_dir):
                    if is_audio_file(af) and episode_key(af) == ep:
                        entry.audio_file = os.path.join(audio_dir, af)
                        break
        self.add_entries.append(entry)
        idx = len(self.add_entries) - 1
        audio_disp = os.path.basename(entry.audio_file) if entry.audio_file else '(click to pick audio file)'
        tags = () if entry.audio_file else ('no_audio',)
        self.add_tree.insert('', tk.END, iid=str(idx),
            values=(idx + 1, os.path.basename(filepath), audio_disp),
            tags=tags)

    def _remove_selected_step2(self):
        sel = self.add_tree.selection()
        if not sel:
            return
        for i in sorted({self.add_tree.index(i) for i in sel}, reverse=True):
            del self.add_entries[i]
        self._rebuild_add_tree()

    def _clear_add_videos(self):
        self.add_entries.clear()
        self.add_tree.delete(*self.add_tree.get_children())

    def _refresh_add_row(self, idx: int):
        entry = self.add_entries[idx]
        iid   = str(idx)
        if not self.add_tree.exists(iid):
            return
        if entry.audio_file:
            audio_disp, tags = os.path.basename(entry.audio_file), ()
        else:
            audio_disp, tags = '(click to pick audio file)', ('no_audio',)
        self.add_tree.item(iid,
            values=(idx + 1, os.path.basename(entry.video_file), audio_disp),
            tags=tags)

    def _rebuild_add_tree(self):
        self.add_tree.delete(*self.add_tree.get_children())
        for i, e in enumerate(self.add_entries):
            if e.audio_file:
                audio_disp, tags = os.path.basename(e.audio_file), ()
            else:
                audio_disp, tags = '(click to pick audio file)', ('no_audio',)
            self.add_tree.insert('', tk.END, iid=str(i),
                values=(i + 1, os.path.basename(e.video_file), audio_disp), tags=tags)

    # ── Progress panel ──────────────────────────────────────────────────────
    def _build_progress_panel(self, parent) -> tk.Frame:
        frame = ttk.LabelFrame(parent, text="Progress", padding=(6, 4))

        row = ttk.Frame(frame)
        row.pack(fill=tk.X, pady=(0, 4))
        self.progress_label = ttk.Label(row, text="Idle", anchor='w')
        self.progress_label.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.cancel_btn = tk.Button(row, text="  Stop  ", command=self._on_cancel,
                                    state=tk.DISABLED, bg='#c0392b', fg='white',
                                    activebackground='#a93226', activeforeground='white',
                                    relief=tk.RAISED, padx=12, pady=2)
        self.cancel_btn.pack(side=tk.RIGHT, padx=(6, 0))

        ttk.Label(frame, text="Current File:", font=('', 9)).pack(anchor='w', padx=2)
        self.file_progress_bar = ttk.Progressbar(frame, mode='determinate', maximum=100)
        self.file_progress_bar.pack(fill=tk.X, padx=2, pady=(2, 6))

        ttk.Label(frame, text="Overall Progress:", font=('', 9)).pack(anchor='w', padx=2)
        self.progress_bar = ttk.Progressbar(frame, mode='determinate', maximum=100)
        self.progress_bar.pack(fill=tk.X, padx=2, pady=(2, 0))

        return frame

    # ══════════════════════════════════════════════════════════════════════════
    # Actions (main thread)
    # ══════════════════════════════════════════════════════════════════════════
    def _on_extract_clicked(self):
        out_dir = self.extract_out_var.get().strip()
        if not out_dir:
            messagebox.showwarning("Missing", "Please select an output folder.")
            return
        if not self._check_output_dir(out_dir):
            return
        ready = []
        for e in self.video_entries:
            if e.streams is None:
                messagebox.showwarning("Still probing",
                                       "Some files are still being probed — please wait.")
                return
            if e.streams:
                ready.append(e)
        if not ready:
            messagebox.showwarning("Empty", "No files with audio streams to extract.")
            return
        self._log(f"[INFO] Extracting audio from {len(ready)} file(s)...")
        self._start_task(lambda: self._run_extract(ready, out_dir))

    def _on_add_audio_clicked(self):
        out_dir = self.add_out_var.get().strip()
        if not out_dir:
            messagebox.showwarning("Missing", "Please select an output folder.")
            return
        if not self._check_output_dir(out_dir):
            return
        if not self.add_entries:
            messagebox.showwarning("Empty", "No video files added.")
            return
        missing = [e for e in self.add_entries if not e.audio_file]
        if missing:
            names = '\n'.join(os.path.basename(e.video_file) for e in missing[:5])
            extra = '\n...' if len(missing) > 5 else ''
            messagebox.showwarning("Missing audio",
                f"These videos have no audio file assigned:\n{names}{extra}")
            return

        # Capture tool choice on the main thread before handing off to worker
        tool_choice = self.add_tool_var.get()
        pairs = [(e.video_file, e.audio_file) for e in self.add_entries]

        # Pre-check for duration mismatches and get user choices
        sync_choices = {}
        for vf, af in pairs:
            video_dur = _get_duration(vf)
            audio_dur = _get_duration(af)
            if video_dur and audio_dur and abs(video_dur - audio_dur) > 0.5:
                diff = video_dur - audio_dur
                if diff > 0:
                    choice = self._ask_padding_options(vf, af, diff)
                else:
                    choice = self._ask_cropping_options(vf, af, -diff)
                if choice is None:
                    return
                sync_choices[(vf, af)] = choice

        # Check if batch mode is enabled
        use_batch = self.batch_mode_var.get() if hasattr(self, 'batch_mode_var') else False

        if use_batch and self.batch_processor:
            # Batch mode: queue all jobs and start processing
            self._log(f"[INFO] Queuing {len(pairs)} video(s) for batch processing  [tool={tool_choice}]:")
            for vf, af in pairs:
                self._log(f"  → {os.path.basename(vf)}  +  {os.path.basename(af)}")

            try:
                max_parallel = int(self.batch_max_parallel_var.get())
                self.batch_processor.max_parallel = max_parallel
            except (ValueError, AttributeError):
                self.batch_processor.max_parallel = max(1, os.cpu_count() - 1 if os.cpu_count() else 3)

            # Add all jobs to batch processor
            for vf, af in pairs:
                output_file = os.path.join(out_dir, os.path.basename(vf))
                self.batch_processor.add_job(vf, af, output_file)

            # Start batch processing thread
            self.batch_active = True
            self.batch_thread = threading.Thread(
                target=self._run_batch_processor,
                args=(out_dir, tool_choice, sync_choices),
                daemon=True
            )
            self.batch_thread.start()
            self._log(f"[START] Batch processing started (max {self.batch_processor.max_parallel} parallel)")
        else:
            # Single/sequential mode: use existing implementation
            self._log(f"[INFO] Processing {len(pairs)} video(s)  [tool={tool_choice}]:")
            for vf, af in pairs:
                self._log(f"  {os.path.basename(vf)}  +  {os.path.basename(af)}")
            self._start_task(lambda: self._run_add_audio(pairs, out_dir, tool_choice, sync_choices))

    def _ask_padding_options(self, vfile: str, afile: str, diff: float) -> Optional[dict]:
        """Show dialog for audio padding when audio is shorter than video.
        Returns dict with padding info or None if user cancels."""
        vname = os.path.basename(vfile)
        aname = os.path.basename(afile)

        dialog = tk.Toplevel(self.root)
        dialog.title("Audio Padding Required")
        dialog.geometry("550x380")
        dialog.resizable(False, False)

        msg = f"Audio is {diff:.1f} seconds shorter than video.\n\n{aname}\n→ {vname}"
        ttk.Label(dialog, text=msg, wraplength=500, justify=tk.LEFT).pack(pady=15, padx=20)

        ttk.Label(dialog, text="How much padding for start and end?", font=('', 10, 'bold')).pack(pady=(0, 10))

        frame = ttk.Frame(dialog)
        frame.pack(padx=40, pady=10, fill=tk.X)

        ttk.Label(frame, text="Start (seconds):").grid(row=0, column=0, sticky='w', padx=5, pady=5)
        start_var = tk.StringVar(value=str(round(diff / 2, 1)))
        start_spin = ttk.Spinbox(frame, from_=0, to=diff, textvariable=start_var,
                                 width=10, increment=0.1)
        start_spin.grid(row=0, column=1, sticky='w', padx=5, pady=5)

        ttk.Label(frame, text="End (seconds):").grid(row=1, column=0, sticky='w', padx=5, pady=5)
        end_var = tk.StringVar(value=str(round(diff / 2, 1)))
        end_spin = ttk.Spinbox(frame, from_=0, to=diff, textvariable=end_var,
                               width=10, increment=0.1)
        end_spin.grid(row=1, column=1, sticky='w', padx=5, pady=5)

        total_label = ttk.Label(frame, text=f"Total: {diff:.1f}s", foreground='#666')
        total_label.grid(row=2, column=0, columnspan=2, sticky='w', padx=5, pady=5)

        def on_start_change(*args):
            try:
                start_val = float(start_var.get())
                if start_val > diff:
                    start_spin.set(diff)
                    start_val = diff
                end_val = max(0, diff - start_val)
                end_spin.set(round(end_val, 1))
                total = start_val + end_val
                total_label.config(text=f"Total: {total:.1f}s")
            except (ValueError, tk.TclError):
                pass

        def on_end_change(*args):
            try:
                end_val = float(end_var.get())
                if end_val > diff:
                    end_spin.set(diff)
                    end_val = diff
                start_val = max(0, diff - end_val)
                start_spin.set(round(start_val, 1))
                total = start_val + end_val
                total_label.config(text=f"Total: {total:.1f}s")
            except (ValueError, tk.TclError):
                pass

        start_var.trace_add('write', on_start_change)
        end_var.trace_add('write', on_end_change)

        result = {'choice': None}

        def on_ok():
            try:
                start_pad = float(start_var.get())
                end_pad = float(end_var.get())
                total = start_pad + end_pad
                if abs(total - diff) > 0.1:
                    messagebox.showwarning("Mismatch", f"Start + End should equal {diff:.1f}s (got {total:.1f}s)")
                    return
                result['choice'] = 'split'
                result['start_pad'] = start_pad
                result['end_pad'] = end_pad
                dialog.destroy()
            except ValueError:
                messagebox.showerror("Invalid input", "Please enter valid numbers.")

        def on_cancel():
            result['choice'] = None
            dialog.destroy()

        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(pady=15)
        ttk.Button(btn_frame, text="OK", command=on_ok).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Cancel", command=on_cancel).pack(side=tk.LEFT, padx=5)

        dialog.transient(self.root)
        dialog.grab_set()
        self.root.wait_window(dialog)

        return result['choice'] and result or None

    def _ask_cropping_options(self, vfile: str, afile: str, diff: float) -> Optional[dict]:
        """Show dialog for audio cropping when audio is longer than video.
        Returns dict with cropping info or None if user cancels."""
        vname = os.path.basename(vfile)
        aname = os.path.basename(afile)

        dialog = tk.Toplevel(self.root)
        dialog.title("Audio Cropping Required")
        dialog.geometry("550x380")
        dialog.resizable(False, False)

        msg = f"Audio is {diff:.1f} seconds longer than video.\n\n{aname}\n← {vname}"
        ttk.Label(dialog, text=msg, wraplength=500, justify=tk.LEFT).pack(pady=15, padx=20)

        ttk.Label(dialog, text="How much to crop from start and end?", font=('', 10, 'bold')).pack(pady=(0, 10))

        frame = ttk.Frame(dialog)
        frame.pack(padx=40, pady=10, fill=tk.X)

        ttk.Label(frame, text="Crop from start (seconds):").grid(row=0, column=0, sticky='w', padx=5, pady=5)
        start_var = tk.StringVar(value=str(round(diff / 2, 1)))
        start_spin = ttk.Spinbox(frame, from_=0, to=diff, textvariable=start_var,
                                 width=10, increment=0.1)
        start_spin.grid(row=0, column=1, sticky='w', padx=5, pady=5)

        ttk.Label(frame, text="Crop from end (seconds):").grid(row=1, column=0, sticky='w', padx=5, pady=5)
        end_var = tk.StringVar(value=str(round(diff / 2, 1)))
        end_spin = ttk.Spinbox(frame, from_=0, to=diff, textvariable=end_var,
                               width=10, increment=0.1)
        end_spin.grid(row=1, column=1, sticky='w', padx=5, pady=5)

        total_label = ttk.Label(frame, text=f"Total: {diff:.1f}s", foreground='#666')
        total_label.grid(row=2, column=0, columnspan=2, sticky='w', padx=5, pady=5)

        def on_start_change(*args):
            try:
                start_val = float(start_var.get())
                if start_val > diff:
                    start_spin.set(diff)
                    start_val = diff
                end_val = max(0, diff - start_val)
                end_spin.set(round(end_val, 1))
                total = start_val + end_val
                total_label.config(text=f"Total: {total:.1f}s")
            except (ValueError, tk.TclError):
                pass

        def on_end_change(*args):
            try:
                end_val = float(end_var.get())
                if end_val > diff:
                    end_spin.set(diff)
                    end_val = diff
                start_val = max(0, diff - end_val)
                start_spin.set(round(start_val, 1))
                total = start_val + end_val
                total_label.config(text=f"Total: {total:.1f}s")
            except (ValueError, tk.TclError):
                pass

        start_var.trace_add('write', on_start_change)
        end_var.trace_add('write', on_end_change)

        result = {'choice': None}

        def on_ok():
            try:
                start_crop = float(start_var.get())
                end_crop = float(end_var.get())
                total = start_crop + end_crop
                if abs(total - diff) > 0.1:
                    messagebox.showwarning("Mismatch", f"Start + End should equal {diff:.1f}s (got {total:.1f}s)")
                    return
                result['choice'] = 'split'
                result['start_crop'] = start_crop
                result['end_crop'] = end_crop
                result['crop_amount'] = diff
                dialog.destroy()
            except ValueError:
                messagebox.showerror("Invalid input", "Please enter valid numbers.")

        def on_cancel():
            result['choice'] = None
            dialog.destroy()

        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(pady=15)
        ttk.Button(btn_frame, text="OK", command=on_ok).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Cancel", command=on_cancel).pack(side=tk.LEFT, padx=5)

        dialog.transient(self.root)
        dialog.grab_set()
        self.root.wait_window(dialog)

        return result['choice'] and result or None

    def _on_theme_toggle(self):
        """Toggle dark mode on/off and refresh UI."""
        if self.theme_manager:
            self.theme_manager.toggle_dark_mode()
            self.dark_mode_var.set(self.theme_manager.dark_mode)
            self._rebuild_ui_theme()

    def _toggle_gpu_controls(self) -> None:
        """Enable/disable GPU encoder controls based on checkbox state."""
        if not self.gpu_encoders:
            return

        enabled = self.gpu_enabled.get()
        state = tk.NORMAL if enabled else tk.DISABLED

        # Disable encoder menu and quality buttons if GPU is not enabled
        if hasattr(self, 'gpu_encoder_menu'):
            self.gpu_encoder_menu.config(state='readonly' if enabled else tk.DISABLED)
        if hasattr(self, 'gpu_quality_fast'):
            self.gpu_quality_fast.config(state=state)
        if hasattr(self, 'gpu_quality_balanced'):
            self.gpu_quality_balanced.config(state=state)
        if hasattr(self, 'gpu_quality_quality'):
            self.gpu_quality_quality.config(state=state)

    def _update_batch_progress(self, completed: int, total: int) -> None:
        """Update batch progress display."""
        if not hasattr(self, 'batch_progress_bar') or not self.batch_processor:
            return

        # Update progress bar
        if total > 0:
            progress_pct = int((completed / total) * 100)
            self.batch_progress_bar['value'] = progress_pct

        # Update statistics from log (simplified)
        queued = len(self.batch_processor.queue)
        active = len([t for t in threading.enumerate() if t.daemon and 'Thread' in str(type(t))])

        if hasattr(self, 'batch_queued_label'):
            self.batch_queued_label.config(text=f"Queued: {queued}")
        if hasattr(self, 'batch_active_label'):
            self.batch_active_label.config(text=f"Active: {active}")
        if hasattr(self, 'batch_completed_label'):
            self.batch_completed_label.config(text=f"Completed: {completed}")
        if hasattr(self, 'batch_failed_label'):
            self.batch_failed_label.config(text=f"Failed: {total - completed - queued - active}")

    def _rebuild_ui_theme(self):
        """Rebuild UI with new theme colors."""
        if not self.theme_manager:
            return

        style = ttk.Style()
        self.theme_manager.configure_ttk_style(style)

        # Update log panel colors
        bg = self.theme_manager.get_color('bg_secondary')
        fg = self.theme_manager.get_color('fg_primary')
        if hasattr(self, 'log_text'):
            self.log_text.configure(bg=bg, fg=fg)

        # Rebuild home panel to update button text
        self.home_frame = self._build_home_panel()

    def _on_cancel(self):
        self.cancel_flag.set()
        p = self.current_process
        if p:
            try:
                p.kill()
            except Exception:
                pass
        self._log("[CANCEL] Stopping current operation...")
        self.cancel_btn.config(state=tk.DISABLED)

    def _check_output_dir(self, out_dir: str) -> bool:
        """Create dir if needed and verify it is writable. Returns False and shows error on failure."""
        try:
            os.makedirs(out_dir, exist_ok=True)
            probe = os.path.join(out_dir, '.write_test')
            with open(probe, 'w'):
                pass
            os.remove(probe)
            return True
        except OSError as e:
            messagebox.showerror("Output folder error",
                                 f"Cannot write to output folder:\n{out_dir}\n\n{e}")
            return False

    # ══════════════════════════════════════════════════════════════════════════
    # Worker functions (background threads)
    # ══════════════════════════════════════════════════════════════════════════
    def _run_batch_processor(self, out_dir: str, tool_choice: str, sync_choices: dict):
        """Process queued batch jobs with parallel execution."""
        if not self.batch_processor:
            self._log("[ERROR] Batch processor not available")
            return

        try:
            active_threads = {}
            job_list = list(self.batch_processor.queue)
            total_jobs = len(job_list)

            self._log(f"[INFO] Starting batch: {total_jobs} job(s), max {self.batch_processor.max_parallel} parallel")

            # Show batch progress display
            if hasattr(self, 'batch_progress_frame'):
                self.batch_progress_frame.pack(fill=tk.X, pady=(6, 0))

            completed = 0
            failed = 0
            idx = 0

            # Process jobs with parallelism limit
            while idx < total_jobs or active_threads:
                # Start new jobs up to max_parallel limit
                while idx < total_jobs and len(active_threads) < self.batch_processor.max_parallel:
                    job = job_list[idx]
                    idx += 1

                    self._log(f"[START] [{idx}/{total_jobs}] {os.path.basename(job.video_file)}")

                    # Start merge in background thread
                    def do_merge(j=job):
                        try:
                            # Extract sync choice if present
                            key = (j.video_file, j.audio_file)
                            sync_choice = sync_choices.get(key)

                            # Call the merge function
                            self._merge_ffmpeg(
                                j.video_file, j.audio_file, j.output_file,
                                tool_choice, sync_choice
                            )
                            return True
                        except Exception as e:
                            self._log(f"[ERROR] Failed to merge: {e}")
                            return False

                    thread = threading.Thread(target=do_merge, daemon=True)
                    thread.start()
                    active_threads[idx - 1] = (thread, job)

                # Check for completed threads
                completed_ids = []
                for job_idx, (thread, job) in active_threads.items():
                    if not thread.is_alive():
                        completed_ids.append(job_idx)
                        self._log(f"[OK] Completed: {os.path.basename(job.video_file)}")
                        completed += 1

                # Remove completed threads
                for job_idx in completed_ids:
                    del active_threads[job_idx]

                # Update progress display
                self._update_batch_progress(completed, total_jobs)

                # Brief sleep to avoid busy-waiting
                time.sleep(0.1)

            self._log(f"[DONE] Batch complete - Success: {completed}, Failed: {total_jobs - completed}")

            # Hide batch progress display
            if hasattr(self, 'batch_progress_frame'):
                self.batch_progress_frame.pack_forget()

            messagebox.showinfo("Batch Complete",
                f"Batch processing finished!\n\nSuccess: {completed}   Failed: {total_jobs - completed}")

        except Exception as e:
            self._log(f"[ERROR] Batch processing failed: {e}")
            if hasattr(self, 'batch_progress_frame'):
                self.batch_progress_frame.pack_forget()
            messagebox.showerror("Batch Error", f"Batch processing error:\n{e}")
        finally:
            self.batch_active = False
            if self.batch_processor:
                self.batch_processor.job_queue.clear()

    def _run_extract(self, entries: List[VideoEntry], out_dir: str):
        total = len(entries)
        success = failed = 0
        for i, entry in enumerate(entries):
            if self.cancel_flag.is_set():
                break
            si     = max(0, min(entry.selected_idx, len(entry.streams) - 1))
            stream = entry.streams[si]
            base   = os.path.splitext(os.path.basename(entry.file))[0]

            # Build a safe suffix from stream metadata
            raw_title = stream.title.translate(str.maketrans('', '', r'<>:"|/\?*')) if stream.title else ''
            suffix = (f"_{raw_title}" if raw_title
                      else f"_{stream.lang}" if stream.lang
                      else f"_a{stream.index}")
            out   = os.path.join(out_dir, f"{base}{suffix}.{stream.extension()}")
            label = f"{os.path.basename(entry.file)}  ({i+1}/{total})"
            self._log(f"[START] {label}")

            cmd = ['ffmpeg', '-y', '-i', entry.file,
                   '-map', f'0:a:{stream.index}', '-c', 'copy', out]
            ok = self._run_ffmpeg(cmd, label, out, i, total)
            if ok:
                success += 1
            else:
                failed += 1

        self.progress_queue.put(('done', success, failed, self.cancel_flag.is_set()))

    def _run_add_audio(self, pairs: List[Tuple[str, str]], out_dir: str, tool_choice: str,
                       sync_choices: dict = None):
        if sync_choices is None:
            sync_choices = {}
        total = len(pairs)
        success = failed = 0

        mkvmerge_path = find_mkvmerge()
        if tool_choice == "auto":
            use_mkvmerge = mkvmerge_path is not None
        elif tool_choice == "mkvmerge":
            use_mkvmerge = True
            if mkvmerge_path is None:
                self._log("[ERROR] mkvmerge not found — install MKVToolNix or switch to FFmpeg.")
                self.progress_queue.put(('done', 0, total, False))
                return
        else:
            use_mkvmerge = False

        tool_name = f"mkvmerge ({mkvmerge_path})" if use_mkvmerge else "FFmpeg"
        self._log(f"[INFO] Using {tool_name}")

        for i, (vfile, afile) in enumerate(pairs):
            if self.cancel_flag.is_set():
                break

            base = os.path.splitext(os.path.basename(vfile))[0]

            # Detect audio codec and determine correct output format
            audio_codec = _get_audio_codec(afile)
            output_format = _get_output_format_for_video(vfile, audio_codec)
            out = os.path.join(out_dir, f"{base}_hindi.{output_format}")

            label = f"{os.path.basename(vfile)}  ({i+1}/{total})"
            self._log(f"[START] {label}")

            # Log format selection if different from source
            video_ext = os.path.splitext(vfile)[1].lower()
            if video_ext.lstrip('.') != output_format:
                self._log(f"[INFO] Auto-selected .{output_format} (audio codec '{audio_codec}' not supported in {video_ext})")

            # Get sync choice for this pair (if any)
            sync_choice = sync_choices.get((vfile, afile))

            if use_mkvmerge:
                ok = self._merge_mkvmerge(mkvmerge_path, vfile, afile,
                                          out, label, i, total, sync_choice)
            else:
                ok = self._merge_ffmpeg(vfile, afile, out, label, i, total, sync_choice)
            if ok:
                success += 1
            else:
                failed += 1

        self.progress_queue.put(('done', success, failed, self.cancel_flag.is_set()))

    def _merge_mkvmerge(self, mkvmerge: str, vfile: str, afile: str,
                        out: str, label: str, item_idx: int, total: int,
                        sync_choice: Optional[dict]) -> bool:
        audio_src = afile
        tmp_file: Optional[str] = None

        if sync_choice:
            detected_codec = _get_audio_codec(afile)
            suffix_map = {'aac': '.aac', 'eac3': '.eac3', 'ac3': '.ac3', 'flac': '.flac'}
            suffix = suffix_map.get(detected_codec, '.aac')
            tmp_file = tempfile.mktemp(suffix=suffix)

            is_cropping = 'crop_amount' in sync_choice

            if is_cropping:
                start_crop = sync_choice.get('start_crop', 0)
                end_crop = sync_choice.get('end_crop', 0)
                audio_dur = _get_duration(afile)

                if start_crop > 0 and end_crop > 0:
                    new_dur = max(0, audio_dur - start_crop - end_crop)
                    self._log(f"[INFO] Cropping {start_crop:.1f}s from start, {end_crop:.1f}s from end → {os.path.basename(tmp_file)}")
                    trim_cmd = ['ffmpeg', '-y', '-i', afile,
                                '-ss', str(start_crop),
                                '-t', str(new_dur),
                                '-c:a', detected_codec, tmp_file]
                elif start_crop > 0:
                    self._log(f"[INFO] Cropping {start_crop:.1f}s from start → {os.path.basename(tmp_file)}")
                    trim_cmd = ['ffmpeg', '-y', '-i', afile,
                                '-ss', str(start_crop),
                                '-c:a', detected_codec, tmp_file]
                else:
                    new_dur = max(0, audio_dur - end_crop)
                    self._log(f"[INFO] Cropping {end_crop:.1f}s from end → {os.path.basename(tmp_file)}")
                    trim_cmd = ['ffmpeg', '-y', '-i', afile,
                                '-t', str(new_dur),
                                '-c:a', detected_codec, tmp_file]

                r = subprocess.run(trim_cmd, capture_output=True, timeout=300, **_POPEN_FLAGS)
                if r.returncode != 0:
                    self._log(f"[WARN] Audio cropping failed (exit {r.returncode}), using original")
                    tmp_file = None
                else:
                    audio_src = tmp_file
            else:
                start_pad = sync_choice.get('start_pad', 0)
                end_pad = sync_choice.get('end_pad', 0)
                audio_dur = _get_duration(afile)
                total_samples = int((audio_dur + start_pad + end_pad) * 48000)
                self._log(f"[INFO] Padding {start_pad:.1f}s at start, {end_pad:.1f}s at end → {os.path.basename(tmp_file)}")
                pad_cmd = ['ffmpeg', '-y', '-i', afile,
                           '-af', f'apad=whole_len={total_samples}',
                           '-c:a', detected_codec, tmp_file]
                r = subprocess.run(pad_cmd, capture_output=True, timeout=300, **_POPEN_FLAGS)
                if r.returncode != 0:
                    self._log(f"[WARN] Audio padding failed (exit {r.returncode}), using original")
                    tmp_file = None
                else:
                    audio_src = tmp_file

        cmd = [mkvmerge, '-o', out,
               vfile,
               '--language', '0:hin', audio_src]
        ok = self._run_mkvmerge(cmd, label, out, item_idx, total)

        if tmp_file:
            try:
                os.remove(tmp_file)
            except OSError:
                pass
        return ok

    def _merge_ffmpeg(self, vfile: str, afile: str, out: str,
                      label: str, item_idx: int, total: int,
                      sync_choice: Optional[dict]) -> bool:
        detected_codec = _get_audio_codec(afile)
        video_dur = _get_duration(vfile)
        audio_dur = _get_duration(afile)

        if sync_choice:
            is_cropping = 'crop_amount' in sync_choice

            if is_cropping:
                start_crop = sync_choice.get('start_crop', 0)
                end_crop = sync_choice.get('end_crop', 0)

                if start_crop > 0 and end_crop > 0:
                    new_dur = max(0, audio_dur - start_crop - end_crop)
                    self._log(f"[INFO] Cropping {start_crop:.1f}s from start, {end_crop:.1f}s from end")
                    cmd = ['ffmpeg', '-y',
                           '-i', vfile, '-i', afile,
                           '-ss:1', str(start_crop),
                           '-t:1', str(new_dur),
                           '-map', '0:v', '-map', '0:a', '-map', '1:a', '-map', '0:s?',
                           '-c', 'copy',
                           out]
                elif start_crop > 0:
                    self._log(f"[INFO] Cropping {start_crop:.1f}s from start")
                    cmd = ['ffmpeg', '-y',
                           '-i', vfile, '-i', afile,
                           '-ss:1', str(start_crop),
                           '-map', '0:v', '-map', '0:a', '-map', '1:a', '-map', '0:s?',
                           '-c', 'copy',
                           out]
                else:
                    new_dur = max(0, audio_dur - end_crop)
                    self._log(f"[INFO] Cropping {end_crop:.1f}s from end")
                    cmd = ['ffmpeg', '-y',
                           '-i', vfile, '-i', afile,
                           '-t:1', str(new_dur),
                           '-map', '0:v', '-map', '0:a', '-map', '1:a', '-map', '0:s?',
                           '-c', 'copy',
                           out]
            else:
                start_pad = sync_choice.get('start_pad', 0)
                end_pad = sync_choice.get('end_pad', 0)
                total_samples = int((audio_dur + start_pad + end_pad) * 48000)
                self._log(f"[INFO] Padding {start_pad:.1f}s at start, {end_pad:.1f}s at end")
                cmd = ['ffmpeg', '-y',
                       '-i', vfile, '-i', afile,
                       '-filter_complex', f'[1:a]apad=whole_len={total_samples}[padded]',
                       '-map', '0:v', '-map', '0:a', '-map', '[padded]', '-map', '0:s?',
                       '-c:v', 'copy', '-c:a', detected_codec,
                       out]
        else:
            use_gpu = self.gpu_enabled.get() and self.gpu_encoders
            if use_gpu:
                try:
                    encoder_name = None
                    quality = self.gpu_quality_var.get()

                    for enc in self.gpu_encoders:
                        if enc.display_name() in self.gpu_encoder_var.get():
                            encoder_name = enc.name
                            break

                    if encoder_name:
                        gpu_args, _ = build_gpu_encode_args(encoder_name, quality)
                        self._log(f"[INFO] Using GPU encoder: {encoder_name}")
                        cmd = ['ffmpeg', '-y',
                               '-i', vfile, '-i', afile,
                               '-map', '0:v', '-map', '0:a', '-map', '1:a', '-map', '0:s?',
                               *gpu_args,
                               '-c:a', 'copy',
                               out]
                    else:
                        cmd = ['ffmpeg', '-y',
                               '-i', vfile, '-i', afile,
                               '-map', '0:v', '-map', '0:a', '-map', '1:a', '-map', '0:s?',
                               '-c', 'copy',
                               out]
                except Exception as e:
                    self._log(f"[WARN] GPU encoding unavailable: {e}, using CPU")
                    cmd = ['ffmpeg', '-y',
                           '-i', vfile, '-i', afile,
                           '-map', '0:v', '-map', '0:a', '-map', '1:a', '-map', '0:s?',
                           '-c', 'copy',
                           out]
            else:
                cmd = ['ffmpeg', '-y',
                       '-i', vfile, '-i', afile,
                       '-map', '0:v', '-map', '0:a', '-map', '1:a', '-map', '0:s?',
                       '-c', 'copy',
                       out]
        return self._run_ffmpeg(cmd, label, out, item_idx, total)

    # ── Subprocess runners ──────────────────────────────────────────────────
    def _run_ffmpeg(self, cmd: list, label: str, out_file: str,
                    item_idx: int, total: int) -> bool:
        self._log("CMD: " + ' '.join(f'"{a}"' if ' ' in str(a) else str(a) for a in cmd))
        try:
            proc = subprocess.Popen(cmd,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    universal_newlines=True, bufsize=1, **_POPEN_FLAGS)
            self.current_process = proc
            duration = 0.0

            for line in proc.stdout:
                if self.cancel_flag.is_set():
                    proc.kill()
                    break
                line = line.rstrip()
                if not line:
                    continue

                if duration == 0:
                    m = DUR_PAT.search(line)
                    if m:
                        duration = to_sec(m.group(1), m.group(2), m.group(3))

                m2 = TIME_PAT.search(line)
                if m2 and duration > 0:
                    cur         = to_sec(m2.group(1), m2.group(2), m2.group(3))
                    file_pct    = min(1.0, cur / duration)
                    overall_pct = int((item_idx + file_pct) / total * 100)
                    self.progress_queue.put((
                        'progress', int(file_pct * 100), overall_pct,
                        f"{label}  —  {int(file_pct*100)}%"))
                    continue  # progress lines are not useful in the log

                # Log everything except noisy frame= lines (unless they contain Lsize=)
                if not line.startswith('frame=') or 'Lsize=' in line:
                    self._log(line)

            return self._finish_proc(proc, label, out_file, item_idx, total)

        except Exception as ex:
            self._log(f"[EXCEPTION] {label}: {ex}")
            return False

    def _run_mkvmerge(self, cmd: list, label: str, out_file: str,
                      item_idx: int, total: int) -> bool:
        self._log("CMD (mkvmerge): " + ' '.join(
            f'"{a}"' if ' ' in str(a) else str(a) for a in cmd))
        try:
            proc = subprocess.Popen(cmd,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    universal_newlines=True, bufsize=1, **_POPEN_FLAGS)
            self.current_process = proc

            for line in proc.stdout:
                if self.cancel_flag.is_set():
                    proc.kill()
                    break
                line = line.rstrip()
                if not line:
                    continue
                if 'Progress:' in line:
                    try:
                        pct = int(float(line.split('Progress:')[1].strip().rstrip('%')))
                        self.progress_queue.put((
                            'progress', pct,
                            int((item_idx + pct / 100.0) / total * 100),
                            f"{label}  —  {pct}%"))
                    except (ValueError, IndexError):
                        pass
                else:
                    self._log(line)

            return self._finish_proc(proc, label, out_file, item_idx, total)

        except Exception as ex:
            self._log(f"[EXCEPTION] {label}: {ex}")
            return False

    def _finish_proc(self, proc: subprocess.Popen, label: str, out_file: str,
                     item_idx: int, total: int) -> bool:
        """Wait for process, clean up on cancel/failure, return success bool."""
        if self.cancel_flag.is_set():
            try:
                os.remove(out_file)
            except OSError:
                pass
            self._log(f"[CANCEL] {label}")
            return False

        proc.wait()
        if proc.returncode == 0:
            overall = int((item_idx + 1) / total * 100)
            self.progress_queue.put(('progress', 100, overall,
                                     f"Done: {os.path.basename(out_file)}"))
            self._log(f"[OK] {label}")
            return True

        self._log(f"[ERROR] {label}  (exit {proc.returncode})")
        # Remove partial output
        try:
            os.remove(out_file)
        except OSError:
            pass
        return False

    # ══════════════════════════════════════════════════════════════════════════
    # Task lifecycle
    # ══════════════════════════════════════════════════════════════════════════
    def _start_task(self, fn):
        self.cancel_flag.clear()
        self._task_start_time = time.time()
        self._set_running(True)
        self.progress_queue.put(('reset',))
        threading.Thread(target=fn, daemon=True).start()

    def _set_running(self, running: bool):
        state = tk.DISABLED if running else tk.NORMAL
        # Extract panel buttons
        self.extract_add_files_btn.config(state=state)
        self.extract_add_folder_btn.config(state=state)
        self.extract_remove_btn.config(state=state)
        self.extract_clear_btn.config(state=state)
        self.extract_out_entry.config(state=state)
        self.extract_out_browse_btn.config(state=state)
        self.extract_btn.config(state=state)
        # Add Audio panel buttons and controls
        self.audio_folder_entry.config(state=state)
        self.audio_folder_browse_btn.config(state=state)
        self.add_videos_btn.config(state=state)
        self.add_folder_btn.config(state=state)
        self.remove_selected_btn.config(state=state)
        self.clear_all_btn.config(state=state)
        self.rb_auto.config(state=state)
        self.rb_mkvmerge.config(state=state)
        self.rb_ffmpeg.config(state=state)
        self.add_out_entry.config(state=state)
        self.add_out_browse_btn.config(state=state)
        self.add_audio_btn.config(state=state)
        # Cancel button (inverse logic)
        self.cancel_btn.config(state=tk.NORMAL if running else tk.DISABLED)

    # ══════════════════════════════════════════════════════════════════════════
    # Queue processor (runs on main thread via after())
    # ══════════════════════════════════════════════════════════════════════════
    def _process_queues(self):
        try:
            while True:
                item = self.log_queue.get_nowait()
                if item[0] == 'log':
                    self._append_log(item[1])
                elif item[0] == 'refresh_extract_row':
                    self._refresh_extract_row(item[1])
        except queue.Empty:
            pass

        try:
            while True:
                item = self.progress_queue.get_nowait()
                kind = item[0]
                if kind == 'reset':
                    self.file_progress_bar['value'] = 0
                    self.progress_bar['value'] = 0
                    self.progress_label.config(text="Starting...")
                elif kind == 'progress':
                    _, file_pct, overall_pct, lbl = item
                    self.file_progress_bar['value'] = file_pct
                    self.progress_bar['value'] = overall_pct
                    # Calculate remaining time
                    if overall_pct > 0 and overall_pct < 100 and self._task_start_time:
                        elapsed = time.time() - self._task_start_time
                        remaining = elapsed * (100 - overall_pct) / overall_pct
                        mins, secs = divmod(int(remaining), 60)
                        time_str = f"  |  ~{mins}m {secs:02d}s left" if mins > 0 else f"  |  ~{secs}s left"
                        lbl = lbl + time_str
                    self.progress_label.config(text=lbl)
                elif kind == 'done':
                    _, success, failed, cancelled = item
                    self._set_running(False)
                    val = 0 if cancelled else 100
                    self.file_progress_bar['value'] = val
                    self.progress_bar['value'] = val
                    summary = (f"Cancelled  —  completed: {success}, failed: {failed}"
                               if cancelled else
                               f"Done  —  success: {success}, failed: {failed}")
                    self.progress_label.config(text=summary)
                    self._log(f"[DONE] {summary}")
                    messagebox.showinfo(
                        "Finished",
                        f"Cancelled.\nCompleted: {success}   Failed: {failed}"
                        if cancelled else
                        f"Done!\n\nSuccess: {success}   |   Failed: {failed}")
        except queue.Empty:
            pass

        self.root.after(50, self._process_queues)

    # ══════════════════════════════════════════════════════════════════════════
    # Helpers
    # ══════════════════════════════════════════════════════════════════════════
    def _append_log(self, msg: str):
        self.log_text.config(state=tk.NORMAL)
        # Find which colour tag applies (first keyword match)
        tag = next((k for k in LOG_TAGS if msg.startswith(k) or k in msg[:12]), None)
        self.log_text.insert(tk.END, msg + '\n', tag or '')
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

    def _log(self, msg: str):
        self.log_queue.put(('log', msg))

    def _browse_folder(self, var: tk.StringVar):
        d = filedialog.askdirectory(initialdir=var.get() or os.path.expanduser('~'))
        if d:
            var.set(d)


# ══════════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════════
def main():
    root = tk.Tk()
    root.withdraw()

    ffmpeg_path = check_ffmpeg()
    while not ffmpeg_path:
        dialog = DependencyDialog(root, "FFmpeg", is_optional=False)
        root.wait_window(dialog)

        if dialog.result == "exit":
            root.destroy()
            sys.exit(1)
        elif dialog.result == "retry":
            ffmpeg_path = check_ffmpeg()
        elif dialog.result == "skip":
            break
        elif dialog.result:
            ffmpeg_path = dialog.result
            break

    root.deiconify()
    FFmpegAudioManager(root)
    root.mainloop()


if __name__ == '__main__':
    main()
