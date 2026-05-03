"""
FFmpeg Audio Manager - Optimization Modules

This package contains all supportive modules for the FFmpeg Audio Manager:
- UITheme: Dark/light theme system with WCAG AAA accessibility
- BatchProcessor: Parallel batch job execution and tracking
- GPUAccelerator: GPU encoder detection and configuration
- AudioAnalyzer: Audio stream analysis and codec detection
"""

from .UITheme import UIThemeManager
from .BatchProcessor import BatchProcessor, BatchProcessorUI, BatchJob
from .GPUAccelerator import GPUEncoder, detect_gpu_encoders, build_gpu_encode_args
from .AudioAnalyzer import BatchAnalyzer

__all__ = [
    'UIThemeManager',
    'BatchProcessor',
    'BatchProcessorUI',
    'BatchJob',
    'GPUEncoder',
    'detect_gpu_encoders',
    'build_gpu_encode_args',
    'BatchAnalyzer',
]

__version__ = '3.0'
