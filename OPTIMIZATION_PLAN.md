# FFmpeg Audio Manager - Optimization Plan

**Status**: Not Started  
**Last Updated**: 2026-05-03

---

## Table of Contents

1. [Overview](#overview)
2. [Optimization Tasks](#optimization-tasks)
3. [Testing Strategy](#testing-strategy)
4. [Rollback Plan](#rollback-plan)

---

## Overview

This document outlines performance optimizations for FFmpegAudioManager without porting to C/C++. All optimizations maintain Python/Tkinter stack while improving responsiveness, resource usage, and batch processing throughput.

**Current Performance Profile**:
- Subprocess execution: ~90% of total time (not improvable via Python)
- UI responsiveness: Excellent (already threaded)
- Memory usage: ~50-100MB (acceptable)
- Bottlenecks: Probing many files sequentially, single-threaded progress updates

---

## Optimization Tasks

### Task 1: Parallel File Probing with ThreadPoolExecutor
**Priority**: HIGH  
**Impact**: 3-5x faster file probing  
**Complexity**: Medium  
**Status**: ⏳ Pending

**Current Issue**:
- Each video file is probed sequentially in extract panel
- Adding 100 video files can take 30+ seconds

**Solution**:
- Use `concurrent.futures.ThreadPoolExecutor` for parallel probing
- Set max workers = min(4, CPU count) for optimal throughput
- Maintain UI update responsiveness with queue-based results

**Files Changed**:
- `FFmpegAudioManager.py` (probe_entry, add_video_entry methods)

**Testing**:
- Add 50+ video files, verify probing completes in <10 seconds
- Verify UI remains responsive during probing
- Verify no race conditions in tree updates
- Test cancellation during probing

**Rollback**: Revert to sequential threading.Thread approach

---

### Task 2: Async Subprocess Execution with Asyncio
**Priority**: MEDIUM  
**Impact**: Better resource utilization, smoother progress updates  
**Complexity**: High  
**Status**: ⏳ Pending

**Current Issue**:
- Each FFmpeg/mkvmerge subprocess is synchronous
- Can only run one encode at a time
- Progress updates are buffered

**Solution**:
- Use `asyncio` for true async subprocess execution
- Allow multiple encodes to run in parallel (GPU/CPU friendly)
- Reduce blocking I/O with `asyncio.StreamReader`

**Files Changed**:
- `FFmpegAudioManager.py` (_run_ffmpeg, _run_mkvmerge methods)

**Testing**:
- Verify single encode still works
- Test parallel encodes (2-3 videos simultaneously)
- Verify progress updates are smooth
- Check CPU/RAM usage under load
- Validate output files are correct

**Rollback**: Revert to subprocess.Popen with threading

---

### Task 3: Lazy Loading & Caching
**Priority**: MEDIUM  
**Impact**: Faster UI load, reduced FFprobe calls  
**Complexity**: Low  
**Status**: ⏳ Pending

**Current Issue**:
- ffprobe is called multiple times for same file
- Duration is queried for every add operation
- No caching of probe results

**Solution**:
- Cache probe results (streams, duration, codec) by filepath
- Implement LRU cache with max 500 entries
- Cache key: `(filepath, mtime)` to invalidate on file change

**Files Changed**:
- `FFmpegAudioManager.py` (add _probe_cache, _duration_cache properties)

**Testing**:
- Extract same file twice, verify second probe uses cache
- Modify file, verify cache invalidates
- Add/remove files, verify cache stays bounded
- Test memory usage with 1000+ cached entries

**Rollback**: Remove caching code, revert to fresh calls

---

### Task 4: Batch Duration Query Optimization
**Priority**: MEDIUM  
**Impact**: 2-3x faster duration checking  
**Complexity**: Low  
**Status**: ⏳ Pending

**Current Issue**:
- Each video/audio file duration is queried separately
- "Add audio" operation queries every file before user hits "Start"
- Duplicate ffprobe calls for same files

**Solution**:
- Batch ffprobe calls using `-show_entries` with multiple inputs
- Cache results as per Task 3
- Pre-query durations asynchronously when folder is selected

**Files Changed**:
- `FFmpegAudioManager.py` (_get_duration, _batch_get_durations methods)

**Testing**:
- Select folder with 50 files, verify duration cache populates
- Switch tool (FFmpeg → mkvmerge), verify cache is used
- Verify sync dialog appears quickly (<2s)
- Test with large folders (100+ files)

**Rollback**: Revert to individual ffprobe calls

---

### Task 5: UI Thread Optimization & Queue Batching
**Priority**: MEDIUM  
**Impact**: Smoother UI, reduced main thread updates  
**Complexity**: Low  
**Status**: ⏳ Pending

**Current Issue**:
- Every log line triggers a UI update
- Progress updates flood the main thread
- Tree refreshes are per-item rather than batched

**Solution**:
- Batch log messages (flush every 50ms instead of per-line)
- Coalesce progress updates (skip redundant %)
- Batch tree item refreshes

**Files Changed**:
- `FFmpegAudioManager.py` (_process_queues, _append_log methods)

**Testing**:
- Encode a file, verify log output is complete (no dropped messages)
- Verify progress bar doesn't flicker
- Measure main thread CPU usage (should drop by ~20%)
- Test with verbose FFmpeg output (1000+ log lines)

**Rollback**: Revert to per-item updates

---

### Task 6: Memory-Efficient Subprocess Output Buffering
**Priority**: LOW  
**Impact**: Reduced memory for large encodes  
**Complexity**: Low  
**Status**: ⏳ Pending

**Current Issue**:
- FFmpeg stderr output is buffered to `PIPE`
- Long encodes (2+ hours) can accumulate large buffers
- Memory inefficiency if subprocess outputs rapidly

**Solution**:
- Use line buffering (`bufsize=1`) and read immediately
- Implement circular buffer for last 1000 log lines
- Stream stderr instead of capturing entire output

**Files Changed**:
- `FFmpegAudioManager.py` (_run_ffmpeg, _run_mkvmerge methods)

**Testing**:
- Encode a 10GB file, verify memory stays <200MB
- Verify log output is complete and in correct order
- Test with high-verbosity FFmpeg output
- Check CPU usage during streaming (should be minimal)

**Rollback**: Revert to full buffering

---

### Task 7: Platform-Specific Command Optimization
**Priority**: LOW  
**Impact**: Faster startup, more reliable subprocess detection  
**Complexity**: Medium  
**Status**: ⏳ Pending

**Current Issue**:
- FFmpeg/mkvmerge paths searched on every startup
- Paths are not cached between runs
- Generic subprocess flags for all platforms

**Solution**:
- Cache tool paths to `~/.ffmpeg_audio_manager.cfg`
- Use platform-optimized subprocess flags
- Detect and prioritize portable FFmpeg installations

**Files Changed**:
- `FFmpegAudioManager.py` (check_ffmpeg, find_mkvmerge, config file support)

**Testing**:
- Verify cache file is created on first run
- Start app 5 times, verify tools are found instantly (no timeout)
- Delete cache, verify tools are re-detected
- Test on Windows/Mac/Linux (if available)
- Test with custom FFmpeg path

**Rollback**: Revert to dynamic detection, delete config file

---

## Testing Strategy

### Before Each Optimization
1. **Baseline**: Record current performance metrics
   - File probe time for 50 files
   - Encode time for sample video
   - Memory usage at idle, during encode
   - UI responsiveness (frame time)

2. **Feature verification**:
   - Extract 5 videos with different codecs
   - Add audio to 5 videos with padding/cropping
   - Verify all output files are correct

### After Each Optimization
1. **Regression testing**:
   - Run all extract/add operations
   - Verify log output is complete
   - Check output files match baseline

2. **Performance metrics**:
   - Compare timing to baseline
   - Verify no memory leaks
   - Stress test (100+ files)

3. **Edge cases**:
   - Cancel mid-operation
   - Close app during encode
   - Invalid/corrupt files
   - Permissions errors
   - Disk full scenario

### Test Data Sets
- **Small**: 5 files, <100MB total
- **Medium**: 50 files, 5GB total
- **Large**: 100+ files, 50GB total (network drive if possible)

---

## Rollback Plan

Each optimization will be committed to a separate branch:

```
main (stable baseline)
├── opt-1-parallel-probing
├── opt-2-async-subprocess
├── opt-3-lazy-caching
├── opt-4-batch-duration
├── opt-5-queue-batching
├── opt-6-memory-buffering
└── opt-7-platform-optimization
```

If any optimization causes regressions:
1. Revert the specific task branch
2. Document the issue in REGRESSIONS.md
3. Move to next task or investigate further

---

## Success Criteria

- ✓ All features work identically to baseline
- ✓ Probing 100 files completes in <10 seconds (vs 30+ currently)
- ✓ No memory leaks (memory stable after 10 encode cycles)
- ✓ UI never freezes (even with 1000+ log lines)
- ✓ Progress tracking remains smooth (no visual jitter)
- ✓ Output files are byte-identical to baseline
- ✓ Startup time <1s on modern hardware

---

## Notes

- Optimizations 1-4 provide 80% of performance gains
- Optimizations 5-7 are incremental quality improvements
- No breaking changes to user API/UI
- All changes remain cross-platform compatible
