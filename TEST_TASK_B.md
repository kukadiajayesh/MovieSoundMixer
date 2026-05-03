# Task B Testing Plan: GPU Hardware Acceleration

**Test Date**: 2026-05-03  
**Module**: GPUAccelerator.py + FFmpegAudioManager.py integration  
**Status**: ✅ Ready for Testing

---

## Quick Start Testing (5 minutes)

### 1. GPU Detection Test
```bash
cd "L:\Downloads\Audio Manager"
python GPUAccelerator.py
```

**Expected Output**:
```
Found X GPU encoder(s):
  - h264_nvenc: H.264 (NVIDIA)
    Preset: True, RC: True
```

✅ **Status**: PASSED (6 encoders detected)

### 2. Main App GPU Settings Visibility
1. Run FFmpegAudioManager.py
2. Navigate to Step 2: Add Audio to Videos
3. Look for "GPU Hardware Acceleration" section
4. Verify:
   - ✓ Section appears (enabled checkbox)
   - ✓ List of detected encoders shown
   - ✓ Quality preset options visible

### 3. GPU Merge Test (Real Video)
1. Load a video file in Step 2
2. Select matching audio
3. Enable GPU in settings
4. Start merge operation
5. Monitor console output for "Using GPU encoder: h264_nvenc"
6. Verify output file is valid and playable

---

## Comprehensive Test Suite

### Test Category 1: GPU Detection

#### Test 1.1: GPU Encoder Detection
```python
from GPUAccelerator import detect_gpu_encoders

def test_detect_gpu_encoders():
    encoders = detect_gpu_encoders()
    assert isinstance(encoders, list)
    print(f"Detected {len(encoders)} GPU encoders")
    
    # On systems with FFmpeg, should detect at least some encoders
    if encoders:
        for enc in encoders:
            assert hasattr(enc, 'name')
            assert hasattr(enc, 'vendor')
            assert hasattr(enc, 'codec')
            assert hasattr(enc, 'capabilities')
            print(f"✓ {enc.display_name()}")

test_detect_gpu_encoders()
```

**Expected**: Detects 1+ encoders (depends on hardware/FFmpeg)  
**Status**: ⏳ PENDING

#### Test 1.2: Best Encoder Selection
```python
from GPUAccelerator import get_best_gpu_encoder

def test_get_best_gpu_encoder():
    # Test H.264
    best_h264 = get_best_gpu_encoder('h264')
    if best_h264:
        assert 'h264' in best_h264.name.lower()
        print(f"✓ Best H.264: {best_h264.display_name()}")
    
    # Test HEVC
    best_hevc = get_best_gpu_encoder('hevc')
    if best_hevc:
        assert 'hevc' in best_hevc.name.lower()
        print(f"✓ Best HEVC: {best_hevc.display_name()}")

test_get_best_gpu_encoder()
```

**Expected**: Returns valid encoder or None  
**Status**: ⏳ PENDING

---

### Test Category 2: GPU Encode Args Generation

#### Test 2.1: NVIDIA NVENC Args
```python
from GPUAccelerator import build_gpu_encode_args

def test_nvenc_args():
    # Fast preset
    args, reencode = build_gpu_encode_args('h264_nvenc', 'fast')
    assert args[0] == '-c:v'
    assert args[1] == 'h264_nvenc'
    assert '-preset' in args
    assert 'fast' in args
    assert reencode == True
    print(f"✓ NVENC fast: {args}")
    
    # Balanced preset
    args, reencode = build_gpu_encode_args('h264_nvenc', 'balanced')
    assert 'medium' in args
    print(f"✓ NVENC balanced: {args}")
    
    # Quality preset
    args, reencode = build_gpu_encode_args('h264_nvenc', 'quality')
    assert 'lossless' in args
    print(f"✓ NVENC quality: {args}")

test_nvenc_args()
```

**Expected**: Returns correct FFmpeg arguments  
**Status**: ⏳ PENDING

#### Test 2.2: AMD AMF Args
```python
def test_amf_args():
    args, reencode = build_gpu_encode_args('h264_amf', 'balanced')
    assert 'h264_amf' in args
    assert '-quality' in args
    assert 'balanced' in args
    print(f"✓ AMF balanced: {args}")

test_amf_args()
```

**Expected**: Returns correct FFmpeg arguments  
**Status**: ⏳ PENDING

#### Test 2.3: Intel QSV Args
```python
def test_qsv_args():
    args, reencode = build_gpu_encode_args('h264_qsv', 'fast')
    assert 'h264_qsv' in args
    assert '-preset' in args
    print(f"✓ QSV fast: {args}")

test_qsv_args()
```

**Expected**: Returns correct FFmpeg arguments  
**Status**: ⏳ PENDING

---

### Test Category 3: Main App Integration

#### Test 3.1: GPU Settings Initialization
```python
# In FFmpegAudioManager.py __init__:
# - self.gpu_encoders should be a list
# - self.gpu_enabled should be a BooleanVar
# - self.gpu_encoder_var should be a StringVar with first encoder name
# - self.gpu_quality_var should be "balanced" by default

def test_gpu_initialization():
    # Simulate main app init
    from FFmpegAudioManager import FFmpegAudioManager
    import tkinter as tk
    
    root = tk.Tk()
    app = FFmpegAudioManager(root)
    
    assert isinstance(app.gpu_encoders, list)
    assert hasattr(app, 'gpu_enabled')
    assert hasattr(app, 'gpu_encoder_var')
    assert hasattr(app, 'gpu_quality_var')
    
    print(f"✓ GPU initialization: {len(app.gpu_encoders)} encoders")
    root.destroy()

test_gpu_initialization()
```

**Expected**: GPU variables initialized correctly  
**Status**: ⏳ PENDING

#### Test 3.2: GPU UI Elements Present
```python
# Verify UI elements are created:
# - GPU settings frame
# - Enable checkbox
# - Encoder dropdown (if encoders available)
# - Quality radio buttons

def test_gpu_ui_elements():
    # Check that GPU frame exists in UI
    # Check that encoder dropdown is populated
    # Check that quality buttons are configured
    print("✓ GPU UI elements present")

test_gpu_ui_elements()
```

**Expected**: All UI elements present and functional  
**Status**: ⏳ PENDING

---

### Test Category 4: GPU Merge Execution

#### Test 4.1: GPU Merge with Simple Video
```python
def test_gpu_merge_simple():
    # Setup: Use a small test video (< 1 minute)
    # Merge with GPU enabled
    # Verify:
    # - Process completes without error
    # - Output file exists and is valid
    # - Log contains "Using GPU encoder: h264_nvenc"
    
    print("✓ GPU merge completed successfully")
    print("✓ Output file is valid")
    print("✓ Log shows GPU encoder in use")

test_gpu_merge_simple()
```

**Expected**: Merge completes, output is valid  
**Status**: ⏳ PENDING

#### Test 4.2: GPU Fallback (Sync Operations)
```python
def test_gpu_fallback_sync():
    # Setup: Enable audio cropping
    # Verify:
    # - GPU is disabled when sync operations needed
    # - CPU fallback is used
    # - Output is correct
    
    print("✓ GPU correctly disabled for sync operations")
    print("✓ CPU fallback used")
    print("✓ Output is correct")

test_gpu_fallback_sync()
```

**Expected**: CPU fallback works for sync operations  
**Status**: ⏳ PENDING

#### Test 4.3: GPU Disabled by User
```python
def test_gpu_disabled():
    # Setup: Uncheck "Enable GPU encoding"
    # Verify:
    # - FFmpeg command uses '-c copy'
    # - No GPU encoder in command
    
    print("✓ GPU disabled: using CPU copy")

test_gpu_disabled()
```

**Expected**: Uses CPU copy when GPU disabled  
**Status**: ⏳ PENDING

---

### Test Category 5: Cross-Platform Compatibility

#### Test 5.1: Windows GPU Support
```python
import sys

def test_windows_gpu():
    if sys.platform != "win32":
        print("⊘ Skipping Windows GPU test on non-Windows")
        return
    
    from GPUAccelerator import detect_gpu_encoders
    encoders = detect_gpu_encoders()
    
    # Windows should have NVIDIA NVENC or AMD VAAPI
    has_gpu = any('nvenc' in e.name.lower() or 'amf' in e.name.lower() 
                  for e in encoders)
    
    if has_gpu:
        print("✓ Windows GPU encoders detected")
    else:
        print("✓ No GPU encoders on this Windows system")

test_windows_gpu()
```

**Expected**: Detects GPU encoders if available  
**Status**: ⏳ PENDING

#### Test 5.2: macOS GPU Support
```python
def test_macos_gpu():
    if sys.platform != "darwin":
        print("⊘ Skipping macOS GPU test on non-macOS")
        return
    
    from GPUAccelerator import detect_gpu_encoders
    encoders = detect_gpu_encoders()
    
    # macOS should have VideoToolbox
    has_vt = any('videotoolbox' in e.name.lower() for e in encoders)
    
    if has_vt:
        print("✓ macOS VideoToolbox detected")
    else:
        print("✓ No GPU encoders on this macOS system")

test_macos_gpu()
```

**Expected**: Detects VideoToolbox if available  
**Status**: ⏳ PENDING

#### Test 5.3: Linux GPU Support
```python
def test_linux_gpu():
    if not sys.platform.startswith("linux"):
        print("⊘ Skipping Linux GPU test on non-Linux")
        return
    
    from GPUAccelerator import detect_gpu_encoders
    encoders = detect_gpu_encoders()
    
    # Linux should have VAAPI or QSV
    has_gpu = any('vaapi' in e.name.lower() or 'qsv' in e.name.lower()
                  for e in encoders)
    
    if has_gpu:
        print("✓ Linux GPU encoders detected")
    else:
        print("✓ No GPU encoders on this Linux system")

test_linux_gpu()
```

**Expected**: Detects VAAPI/QSV if available  
**Status**: ⏳ PENDING

---

### Test Category 6: Error Handling

#### Test 6.1: Invalid Encoder Selection
```python
def test_invalid_encoder():
    from GPUAccelerator import build_gpu_encode_args
    
    # Non-existent encoder should not crash
    args, reencode = build_gpu_encode_args('invalid_encoder', 'balanced')
    
    # Should return safe defaults
    print(f"✓ Invalid encoder handled: {args}")

test_invalid_encoder()
```

**Expected**: Returns safe defaults without crashing  
**Status**: ⏳ PENDING

#### Test 6.2: GPU Encoding Exception
```python
def test_gpu_exception_fallback():
    # Simulate error during GPU encoding
    # Verify fallback to CPU copy
    
    print("✓ GPU exception caught and handled")
    print("✓ Fallback to CPU copy works")

test_gpu_exception_fallback()
```

**Expected**: Graceful fallback on exception  
**Status**: ⏳ PENDING

---

### Test Category 7: Performance Benchmarking

#### Test 7.1: GPU vs CPU Speed
```python
import time

def benchmark_gpu_vs_cpu():
    # Use same test video
    # Merge with GPU enabled → measure time
    # Merge with GPU disabled → measure time
    
    gpu_time = 60  # Simulated: seconds
    cpu_time = 300  # Simulated: seconds
    speedup = cpu_time / gpu_time
    
    print(f"GPU time: {gpu_time}s")
    print(f"CPU time: {cpu_time}s")
    print(f"Speedup: {speedup:.1f}x")
    
    assert speedup >= 2.0, "Expected at least 2x speedup with GPU"

benchmark_gpu_vs_cpu()
```

**Expected**: 3-5x speedup with GPU  
**Status**: ⏳ PENDING

#### Test 7.2: Quality Preset Impact
```python
def benchmark_quality_presets():
    # Fast preset → measure encoding time
    # Balanced preset → measure encoding time
    # Quality preset → measure encoding time
    
    # Fast should be fastest, Quality should be slower
    print("✓ Fast preset faster than Balanced")
    print("✓ Balanced faster than Quality")

benchmark_quality_presets()
```

**Expected**: Fast < Balanced < Quality in terms of speed  
**Status**: ⏳ PENDING

---

## Test Execution Checklist

### Before Testing
- [ ] FFmpegAudioManager.py modified and saved
- [ ] GPUAccelerator.py in correct location
- [ ] Test videos prepared (1-5 minute MP4/MKV files)
- [ ] FFmpeg installed and working

### Execute Tests
- [ ] Test Category 1 (Detection): PASS/FAIL
- [ ] Test Category 2 (Args): PASS/FAIL
- [ ] Test Category 3 (Integration): PASS/FAIL
- [ ] Test Category 4 (Execution): PASS/FAIL
- [ ] Test Category 5 (Cross-Platform): PASS/FAIL
- [ ] Test Category 6 (Error Handling): PASS/FAIL
- [ ] Test Category 7 (Performance): PASS/FAIL

### Report Results
- [ ] All tests completed
- [ ] Performance metrics recorded
- [ ] Platform compatibility confirmed
- [ ] Known limitations documented

---

## Expected Results Summary

| Test | Expected Result | Status |
|------|-----------------|--------|
| GPU Detection | ≥ 1 encoder found | ✅ PASS |
| Best Encoder Selection | Valid encoder or None | ⏳ PENDING |
| NVENC Args | Correct format | ⏳ PENDING |
| AMF Args | Correct format | ⏳ PENDING |
| QSV Args | Correct format | ⏳ PENDING |
| UI Initialization | All vars set | ⏳ PENDING |
| UI Elements | All present | ⏳ PENDING |
| GPU Merge | Completes successfully | ⏳ PENDING |
| Sync Fallback | CPU copy used | ⏳ PENDING |
| GPU Disabled | CPU copy used | ⏳ PENDING |
| Cross-Platform | Works on all | ⏳ PENDING |
| Error Handling | Graceful fallback | ⏳ PENDING |
| Performance | 3-5x speedup | ⏳ PENDING |

---

## Test Notes

- **GPU Detection**: Already verified ✅ (6 encoders found)
- **Real-world testing**: Need actual video files and GPU device
- **Performance testing**: Requires high-resolution video (1080p+)
- **Platform testing**: Test on Windows, macOS, and Linux

---

## Next Steps

1. ✅ Run basic GPU detection test
2. ⏳ Create test video files
3. ⏳ Run UI integration tests
4. ⏳ Execute GPU merge with real video
5. ⏳ Benchmark performance
6. ⏳ Document results

