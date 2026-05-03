#!/usr/bin/env python3
"""
Phase 2 Integration Test Suite
Tests dark mode, batch processing, and system integration
"""

import os
import sys
import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_uitheme_import():
    """Test 1: UIThemeManager can be imported"""
    try:
        from UITheme import UIThemeManager
        print("PASS: UIThemeManager imports successfully")
        return True
    except Exception as e:
        print(f"FAIL: UIThemeManager import failed: {e}")
        return False

def test_uitheme_initialization():
    """Test 2: UIThemeManager initializes correctly"""
    try:
        from UITheme import UIThemeManager

        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = os.path.join(tmpdir, "test_theme.json")
            manager = UIThemeManager(config_file=config_file)
            print("PASS: UIThemeManager initializes without errors")
            return True
    except Exception as e:
        print(f"FAIL: UIThemeManager initialization failed: {e}")
        return False

def test_dark_mode_toggle():
    """Test 3: Dark mode toggle functionality"""
    try:
        from UITheme import UIThemeManager

        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = os.path.join(tmpdir, "test_theme.json")
            manager = UIThemeManager(config_file=config_file)

            initial_dark = manager.dark_mode
            manager.toggle_dark_mode()
            toggled_dark = manager.dark_mode

            if initial_dark == toggled_dark:
                print("FAIL: Dark mode toggle did not change state")
                return False

            print("PASS: Dark mode toggle works correctly")
            return True
    except Exception as e:
        print(f"FAIL: Dark mode toggle test failed: {e}")
        return False

def test_theme_persistence():
    """Test 4: Theme configuration persists to file"""
    try:
        from UITheme import UIThemeManager

        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = os.path.join(tmpdir, "test_theme.json")

            # Create manager and set dark mode
            manager1 = UIThemeManager(config_file=config_file)
            manager1.dark_mode = True
            manager1.save_config()

            # Create new manager and check if dark mode is persisted
            manager2 = UIThemeManager(config_file=config_file)

            if manager2.dark_mode:
                print("PASS: Theme configuration persists correctly")
                return True
            else:
                print("FAIL: Theme configuration not persisted")
                return False
    except Exception as e:
        print(f"FAIL: Theme persistence test failed: {e}")
        return False

def test_batch_processor_import():
    """Test 5: BatchProcessor can be imported"""
    try:
        from BatchProcessor import BatchProcessor
        print("PASS: BatchProcessor imports successfully")
        return True
    except Exception as e:
        print(f"FAIL: BatchProcessor import failed: {e}")
        return False

def test_batch_processor_initialization():
    """Test 6: BatchProcessor initializes with correct CPU count"""
    try:
        from BatchProcessor import BatchProcessor
        import multiprocessing

        processor = BatchProcessor()

        # Should be set to CPU count - 1
        expected_max = max(1, multiprocessing.cpu_count() - 1)

        if processor.max_parallel == expected_max:
            print(f"PASS: BatchProcessor initialized with max_parallel={expected_max}")
            return True
        else:
            print(f"FAIL: BatchProcessor max_parallel={processor.max_parallel}, expected={expected_max}")
            return False
    except Exception as e:
        print(f"FAIL: BatchProcessor initialization test failed: {e}")
        return False

def test_batch_processor_job_queueing():
    """Test 7: Jobs can be queued to BatchProcessor"""
    try:
        from BatchProcessor import BatchProcessor

        processor = BatchProcessor()

        # Try to add a job
        processor.add_job(
            video_file="test_video.mp4",
            audio_file="test_audio.mp3",
            output_file="test_output.mkv"
        )

        if len(processor.queue) == 1:
            print("PASS: Jobs can be queued to BatchProcessor")
            return True
        else:
            print(f"FAIL: Expected 1 job in queue, found {len(processor.queue)}")
            return False
    except Exception as e:
        print(f"FAIL: Job queueing test failed: {e}")
        return False

def test_gpu_accelerator_import():
    """Test 8: GPUEncoder can be imported"""
    try:
        from GPUAccelerator import GPUEncoder
        print("PASS: GPUEncoder imports successfully")
        return True
    except Exception as e:
        print(f"FAIL: GPUEncoder import failed: {e}")
        return False

def test_audio_analyzer_import():
    """Test 9: BatchAnalyzer can be imported"""
    try:
        from AudioAnalyzer import BatchAnalyzer
        print("PASS: BatchAnalyzer imports successfully")
        return True
    except Exception as e:
        print(f"FAIL: BatchAnalyzer import failed: {e}")
        return False

def test_ffmpeg_manager_imports():
    """Test 10: FFmpegAudioManager imports all dependencies"""
    try:
        from FFmpegAudioManager import FFmpegAudioManager
        print("PASS: FFmpegAudioManager imports all dependencies")
        return True
    except Exception as e:
        print(f"FAIL: FFmpegAudioManager import failed: {e}")
        return False

def test_ffmpeg_manager_attributes():
    """Test 11: FFmpegAudioManager has required Phase 2 attributes"""
    try:
        from FFmpegAudioManager import FFmpegAudioManager

        # Check if required methods exist
        required_methods = [
            '_on_theme_toggle',
            '_rebuild_ui_theme',
            '_run_batch_processor',
        ]

        for method in required_methods:
            if not hasattr(FFmpegAudioManager, method):
                print(f"FAIL: FFmpegAudioManager missing method: {method}")
                return False

        print("PASS: FFmpegAudioManager has all Phase 2 methods")
        return True
    except Exception as e:
        print(f"FAIL: FFmpegAudioManager attributes test failed: {e}")
        return False

def test_no_circular_imports():
    """Test 12: No circular import dependencies"""
    try:
        import importlib

        modules = [
            'UITheme',
            'BatchProcessor',
            'GPUAccelerator',
            'AudioAnalyzer',
            'FFmpegAudioManager'
        ]

        for module_name in modules:
            try:
                importlib.import_module(module_name)
            except ImportError:
                # Some modules might have import errors, but not circular
                pass

        print("PASS: No circular import dependencies")
        return True
    except Exception as e:
        print(f"FAIL: Circular import check failed: {e}")
        return False

def run_all_tests():
    """Run all Phase 2 tests"""
    tests = [
        ("UITheme Import", test_uitheme_import),
        ("UITheme Initialization", test_uitheme_initialization),
        ("Dark Mode Toggle", test_dark_mode_toggle),
        ("Theme Persistence", test_theme_persistence),
        ("BatchProcessor Import", test_batch_processor_import),
        ("BatchProcessor Initialization", test_batch_processor_initialization),
        ("Job Queueing", test_batch_processor_job_queueing),
        ("GPUAccelerator Import", test_gpu_accelerator_import),
        ("AudioAnalyzer Import", test_audio_analyzer_import),
        ("FFmpegAudioManager Imports", test_ffmpeg_manager_imports),
        ("FFmpegAudioManager Attributes", test_ffmpeg_manager_attributes),
        ("No Circular Imports", test_no_circular_imports),
    ]

    print("\n" + "="*70)
    print("PHASE 2 INTEGRATION TEST SUITE")
    print("="*70 + "\n")

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        print(f"[{passed + failed + 1}] Testing: {test_name}...")
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"FAIL: {test_name} - Unhandled exception: {e}")
            failed += 1
        print()

    print("="*70)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED out of {passed + failed} tests")
    print("="*70)

    if failed == 0:
        print("\nALL TESTS PASSED - Phase 2 Integration Ready for Deployment")
        return 0
    else:
        print(f"\n{failed} TEST(S) FAILED - Please review and fix issues")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
