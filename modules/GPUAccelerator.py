#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GPU Hardware Encoder Detection and Configuration

Detects available hardware video encoders and provides codec selection:
- NVIDIA NVENC (h264_nvenc, hevc_nvenc)
- AMD VAAPI (h264_amf, hevc_amf)
- Intel QSV (h264_qsv, hevc_qsv)
- Apple VideoToolbox (h264_videotoolbox, hevc_videotoolbox)
"""

import subprocess
import sys
from typing import Dict, List, Optional, Tuple

_WIN = sys.platform == "win32"
_MAC = sys.platform == "darwin"
_LINUX = sys.platform.startswith("linux")
_POPEN_FLAGS = {"creationflags": subprocess.CREATE_NO_WINDOW} if _WIN else {}


class GPUEncoder:
    """Represents a detected GPU encoder."""

    def __init__(self, name: str, codec: str, vendor: str, capabilities: Dict[str, bool]):
        self.name = name  # e.g., "h264_nvenc"
        self.codec = codec  # e.g., "H.264"
        self.vendor = vendor  # e.g., "NVIDIA"
        self.capabilities = capabilities  # e.g., {"has_preset": True, "has_rc": True}

    def display_name(self) -> str:
        """Return human-readable encoder name."""
        return f"{self.codec} ({self.vendor})"

    def supports_preset(self) -> bool:
        """Check if encoder supports quality presets."""
        return self.capabilities.get('has_preset', False)

    def supports_rc(self) -> bool:
        """Check if encoder supports rate control."""
        return self.capabilities.get('has_rc', False)


def detect_gpu_encoders() -> List[GPUEncoder]:
    """
    Detect available GPU encoders using ffmpeg -encoders.

    Returns:
        List of detected GPUEncoder objects
    """
    encoders = []

    try:
        # Get list of all encoders from ffmpeg
        proc = subprocess.run(
            ['ffmpeg', '-encoders'],
            capture_output=True,
            text=True,
            timeout=10,
            **_POPEN_FLAGS
        )

        if proc.returncode != 0:
            return encoders

        lines = proc.stderr.split('\n') if proc.stderr else []
        output = proc.stdout + proc.stderr

        # Mapping of encoder names to (codec, vendor, has_preset, has_rc)
        gpu_encoders = {
            # NVIDIA NVENC
            'h264_nvenc': ('H.264', 'NVIDIA', True, True),
            'hevc_nvenc': ('H.265/HEVC', 'NVIDIA', True, True),

            # AMD VAAPI/AMF
            'h264_amf': ('H.264', 'AMD', True, True),
            'hevc_amf': ('H.265/HEVC', 'AMD', True, True),

            # Intel QSV
            'h264_qsv': ('H.264', 'Intel', True, True),
            'hevc_qsv': ('H.265/HEVC', 'Intel', True, True),

            # Apple VideoToolbox
            'h264_videotoolbox': ('H.264', 'Apple', False, False),
            'hevc_videotoolbox': ('H.265/HEVC', 'Apple', False, False),
        }

        # Check which encoders are available
        for encoder_name, (codec, vendor, has_preset, has_rc) in gpu_encoders.items():
            if encoder_name in output:
                capabilities = {
                    'has_preset': has_preset,
                    'has_rc': has_rc
                }
                encoder = GPUEncoder(encoder_name, codec, vendor, capabilities)
                encoders.append(encoder)

        return encoders

    except Exception:
        return []


def get_best_gpu_encoder(target_codec: str = 'h264') -> Optional[GPUEncoder]:
    """
    Get the best available GPU encoder for target codec.

    Args:
        target_codec: 'h264' or 'hevc'

    Returns:
        Best available encoder or None if no GPU encoder found
    """
    encoders = detect_gpu_encoders()
    if not encoders:
        return None

    # Prioritize by vendor (NVIDIA > Intel > AMD > Apple)
    priority_order = {'NVIDIA': 4, 'Intel': 3, 'AMD': 2, 'Apple': 1}

    # Filter by codec
    if target_codec.lower() == 'hevc':
        matching = [e for e in encoders if 'hevc' in e.name.lower()]
    else:
        matching = [e for e in encoders if 'h264' in e.name.lower()]

    if not matching:
        return None

    # Return highest priority
    return max(matching, key=lambda e: priority_order.get(e.vendor, 0))


def build_gpu_encode_args(encoder_name: str, quality: str = 'balanced') -> Tuple[List[str], bool]:
    """
    Build FFmpeg arguments for GPU-accelerated encoding.

    Args:
        encoder_name: GPU encoder name (e.g., 'h264_nvenc')
        quality: 'fast', 'balanced', or 'quality'

    Returns:
        Tuple of (ffmpeg_args, should_reencode)
        - ffmpeg_args: List of FFmpeg arguments for video encoding
        - should_reencode: True if video needs re-encoding (not -c:v copy)
    """

    # Quality preset mappings per encoder
    preset_map = {
        'h264_nvenc': {
            'fast': 'fast',
            'balanced': 'medium',
            'quality': 'lossless'
        },
        'hevc_nvenc': {
            'fast': 'fast',
            'balanced': 'medium',
            'quality': 'lossless'
        },
        'h264_amf': {
            'fast': 'speed',
            'balanced': 'balanced',
            'quality': 'quality'
        },
        'hevc_amf': {
            'fast': 'speed',
            'balanced': 'balanced',
            'quality': 'quality'
        },
        'h264_qsv': {
            'fast': 'fast',
            'balanced': 'medium',
            'quality': 'quality'
        },
        'hevc_qsv': {
            'fast': 'fast',
            'balanced': 'medium',
            'quality': 'quality'
        },
        'h264_videotoolbox': {
            'fast': None,
            'balanced': None,
            'quality': None
        },
        'hevc_videotoolbox': {
            'fast': None,
            'balanced': None,
            'quality': None
        }
    }

    args = ['-c:v', encoder_name]

    # Add quality preset if supported
    preset = preset_map.get(encoder_name, {}).get(quality)
    if preset:
        if 'nvenc' in encoder_name:
            args.extend(['-preset', preset])
        elif 'amf' in encoder_name:
            args.extend(['-quality', preset])
        elif 'qsv' in encoder_name:
            args.extend(['-preset', preset])

    return args, True


def fallback_to_cpu_encode(audio_codec: str = 'aac') -> Tuple[List[str], bool]:
    """
    Return FFmpeg arguments for CPU-based encoding fallback.

    Args:
        audio_codec: Audio codec to re-encode to

    Returns:
        Tuple of (ffmpeg_args, should_reencode)
    """
    return ['-c:v', 'copy', '-c:a', 'copy'], False


if __name__ == '__main__':
    # Test GPU detection
    print("Detecting GPU encoders...")
    encoders = detect_gpu_encoders()

    if encoders:
        print(f"\nFound {len(encoders)} GPU encoder(s):")
        for enc in encoders:
            print(f"  - {enc.name}: {enc.display_name()}")
            print(f"    Preset: {enc.supports_preset()}, RC: {enc.supports_rc()}")
    else:
        print("No GPU encoders detected.")

    # Test best encoder selection
    best = get_best_gpu_encoder('h264')
    if best:
        print(f"\nBest H.264 encoder: {best.display_name()}")
        args, reencode = build_gpu_encode_args(best.name, 'balanced')
        print(f"FFmpeg args: {args}")
    else:
        print("\nNo H.264 GPU encoder available.")
