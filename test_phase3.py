#!/usr/bin/env python3
"""
Phase 3 UI Polish Testing
Verify UI improvements don't break existing functionality
"""

import os
import sys
import tkinter as tk
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_ffmpeg_manager_ui_creation():
    """Test 1: FFmpegAudioManager UI builds without errors"""
    try:
        from FFmpegAudioManager import FFmpegAudioManager

        # Create a test root window
        root = tk.Tk()
        root.withdraw()  # Hide the window

        # Try to create the manager
        manager = FFmpegAudioManager(root)

        # Verify UI panels were created
        assert manager.home_frame is not None, "Home frame not created"
        assert manager.extract_frame is not None, "Extract frame not created"
        assert manager.add_frame is not None, "Add frame not created"
        assert manager.progress_panel is not None, "Progress panel not created"

        print("PASS: FFmpegAudioManager UI builds successfully")

        # Cleanup
        root.destroy()
        return True
    except Exception as e:
        print(f"FAIL: FFmpegAudioManager UI creation failed: {e}")
        return False

def test_batch_progress_widgets():
    """Test 2: Batch progress widgets are properly created"""
    try:
        from FFmpegAudioManager import FFmpegAudioManager

        root = tk.Tk()
        root.withdraw()

        manager = FFmpegAudioManager(root)

        # Check if batch progress widgets exist (when batch processor available)
        if manager.batch_processor:
            assert hasattr(manager, 'batch_progress_frame'), "batch_progress_frame not created"
            assert hasattr(manager, 'batch_progress_bar'), "batch_progress_bar not created"
            assert hasattr(manager, 'batch_queued_label'), "batch_queued_label not created"
            assert hasattr(manager, 'batch_active_label'), "batch_active_label not created"
            assert hasattr(manager, 'batch_completed_label'), "batch_completed_label not created"
            assert hasattr(manager, 'batch_failed_label'), "batch_failed_label not created"
            assert hasattr(manager, 'batch_stats'), "batch_stats not initialized"

            print("PASS: Batch progress widgets created successfully")
        else:
            print("SKIP: Batch processor not available")

        root.destroy()
        return True
    except Exception as e:
        print(f"FAIL: Batch progress widgets test failed: {e}")
        return False

def test_ui_method_exists():
    """Test 3: All Phase 3 UI methods exist and are callable"""
    try:
        from FFmpegAudioManager import FFmpegAudioManager

        root = tk.Tk()
        root.withdraw()

        manager = FFmpegAudioManager(root)

        # Check new Phase 3 methods
        assert hasattr(manager, '_update_batch_progress'), "_update_batch_progress method missing"
        assert callable(getattr(manager, '_update_batch_progress')), "_update_batch_progress not callable"
        assert hasattr(manager, '_rebuild_ui_theme'), "_rebuild_ui_theme method missing"
        assert callable(getattr(manager, '_rebuild_ui_theme')), "_rebuild_ui_theme not callable"
        assert hasattr(manager, '_on_theme_toggle'), "_on_theme_toggle method missing"
        assert callable(getattr(manager, '_on_theme_toggle')), "_on_theme_toggle not callable"

        print("PASS: All Phase 3 UI methods exist and are callable")

        root.destroy()
        return True
    except Exception as e:
        print(f"FAIL: UI methods test failed: {e}")
        return False

def test_batch_progress_update():
    """Test 4: Batch progress update method works correctly"""
    try:
        from FFmpegAudioManager import FFmpegAudioManager

        root = tk.Tk()
        root.withdraw()

        manager = FFmpegAudioManager(root)

        if manager.batch_processor:
            # Test the progress update method
            manager._update_batch_progress(5, 10)

            # Verify progress bar was updated
            assert manager.batch_progress_bar['value'] == 50, "Progress bar not updated correctly"

            # Test with zero total
            manager._update_batch_progress(0, 0)

            print("PASS: Batch progress update method works correctly")
        else:
            print("SKIP: Batch processor not available")

        root.destroy()
        return True
    except Exception as e:
        print(f"FAIL: Batch progress update test failed: {e}")
        return False

def test_theme_integration():
    """Test 5: Theme manager integration"""
    try:
        from FFmpegAudioManager import FFmpegAudioManager

        root = tk.Tk()
        root.withdraw()

        manager = FFmpegAudioManager(root)

        # Check theme manager
        if manager.theme_manager:
            assert hasattr(manager, 'dark_mode_var'), "dark_mode_var not created"
            assert hasattr(manager, 'theme_manager'), "theme_manager not initialized"

            print("PASS: Theme manager integration successful")
        else:
            print("INFO: Theme manager not available (optional)")

        root.destroy()
        return True
    except Exception as e:
        print(f"FAIL: Theme integration test failed: {e}")
        return False

def test_ui_consistency():
    """Test 6: UI consistency checks"""
    try:
        from FFmpegAudioManager import FFmpegAudioManager

        root = tk.Tk()
        root.withdraw()

        manager = FFmpegAudioManager(root)

        # Verify all major components exist
        assert manager.content_area is not None, "content_area not created"
        assert manager.log_panel is not None, "log_panel not created"
        assert hasattr(manager, 'add_tree'), "add_tree not created"
        assert hasattr(manager, 'extract_tree'), "extract_tree not created"

        print("PASS: UI consistency checks passed")

        root.destroy()
        return True
    except Exception as e:
        print(f"FAIL: UI consistency test failed: {e}")
        return False

def run_all_tests():
    """Run all Phase 3 tests"""
    tests = [
        ("FFmpegAudioManager UI Creation", test_ffmpeg_manager_ui_creation),
        ("Batch Progress Widgets", test_batch_progress_widgets),
        ("UI Methods Exist", test_ui_method_exists),
        ("Batch Progress Update", test_batch_progress_update),
        ("Theme Integration", test_theme_integration),
        ("UI Consistency", test_ui_consistency),
    ]

    print("\n" + "="*70)
    print("PHASE 3 UI TESTING SUITE")
    print("="*70 + "\n")

    passed = 0
    failed = 0
    skipped = 0

    for test_name, test_func in tests:
        print(f"[{passed + failed + skipped + 1}] Testing: {test_name}...")
        try:
            result = test_func()
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"FAIL: {test_name} - Unhandled exception: {e}")
            failed += 1
        print()

    print("="*70)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED, {skipped} SKIPPED")
    print("="*70)

    if failed == 0:
        print("\nALL TESTS PASSED - Phase 3 UI improvements verified")
        return 0
    else:
        print(f"\n{failed} TEST(S) FAILED - Please review issues")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
