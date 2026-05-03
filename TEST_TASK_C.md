# Task C Testing Plan: Parallel Batch Processing

**Test Date**: 2026-05-03  
**Module**: BatchProcessor.py + FFmpegAudioManager.py integration  
**Status**: ⏳ Ready for Testing

---

## Quick Start Testing (5 minutes)

### 1. BatchProcessor Basic Test
```bash
cd "L:\Downloads\Audio Manager"
python BatchProcessor.py
```

**Expected Output**:
```
Added 4 jobs to batch
Max parallel: 3
Stats: {'total': 4, 'queued': 4, 'active': 0, 'completed': 0, 'failed': 0}
```

✅ **Status**: PENDING (ready to run)

### 2. Queue Management Test
```python
from BatchProcessor import BatchProcessor

processor = BatchProcessor()
processor.add_job('v1.mkv', 'a1.mp3', 'out1.mkv')
processor.add_job('v2.mkv', 'a2.mp3', 'out2.mkv')

stats = processor.get_stats()
print(stats)
# Expected: {'total': 2, 'queued': 2, 'active': 0, 'completed': 0, 'failed': 0}
```

**Expected**: Jobs queued successfully  
**Status**: ⏳ PENDING

---

## Comprehensive Test Suite

### Test Category 1: BatchProcessor Initialization

#### Test 1.1: Auto-Detect Parallel Count
```python
from BatchProcessor import BatchProcessor
from multiprocessing import cpu_count

def test_auto_parallel():
    processor = BatchProcessor()
    expected = max(1, cpu_count() - 1)
    assert processor.max_parallel == expected
    print(f"✓ Auto-detected {processor.max_parallel} parallel processes")

test_auto_parallel()
```

**Expected**: Sets max_parallel to CPU count - 1  
**Status**: ⏳ PENDING

#### Test 1.2: Custom Parallel Count
```python
def test_custom_parallel():
    processor = BatchProcessor(max_parallel=2)
    assert processor.max_parallel == 2
    print(f"✓ Custom parallel: {processor.max_parallel}")

test_custom_parallel()
```

**Expected**: Respects custom max_parallel value  
**Status**: ⏳ PENDING

---

### Test Category 2: Job Management

#### Test 2.1: Add Single Job
```python
def test_add_single_job():
    processor = BatchProcessor()
    job_id = processor.add_job('video1.mkv', 'audio1.mp3', 'output1.mkv')
    
    assert job_id == 1
    stats = processor.get_stats()
    assert stats['queued'] == 1
    assert stats['total'] == 1
    print(f"✓ Job {job_id} added to queue")

test_add_single_job()
```

**Expected**: Job added with unique ID  
**Status**: ⏳ PENDING

#### Test 2.2: Add Multiple Jobs (Batch)
```python
def test_add_batch():
    processor = BatchProcessor()
    jobs = [
        ('v1.mkv', 'a1.mp3', 'out1.mkv'),
        ('v2.mkv', 'a2.mp3', 'out2.mkv'),
        ('v3.mkv', 'a3.mp3', 'out3.mkv'),
        ('v4.mkv', 'a4.mp3', 'out4.mkv'),
    ]
    processor.add_batch(jobs)
    
    stats = processor.get_stats()
    assert stats['total'] == 4
    assert stats['queued'] == 4
    print(f"✓ Batch of 4 jobs added")

test_add_batch()
```

**Expected**: All jobs queued correctly  
**Status**: ⏳ PENDING

#### Test 2.3: Get Job Status
```python
def test_get_job_status():
    processor = BatchProcessor()
    job_id = processor.add_job('video.mkv', 'audio.mp3', 'output.mkv')
    
    job = processor.get_job_status(job_id)
    assert job is not None
    assert job.job_id == job_id
    assert job.status == 'queued'
    print(f"✓ Retrieved job status: {job.status}")

test_get_job_status()
```

**Expected**: Returns correct job status  
**Status**: ⏳ PENDING

#### Test 2.4: Get All Jobs Organized
```python
def test_get_all_jobs():
    processor = BatchProcessor()
    processor.add_batch([
        ('v1.mkv', 'a1.mp3', 'out1.mkv'),
        ('v2.mkv', 'a2.mp3', 'out2.mkv'),
    ])
    
    queued, active, completed, failed = processor.get_all_jobs()
    assert len(queued) == 2
    assert len(active) == 0
    assert len(completed) == 0
    assert len(failed) == 0
    print(f"✓ Jobs organized: queued={len(queued)}, active={len(active)}")

test_get_all_jobs()
```

**Expected**: Correctly organizes jobs by status  
**Status**: ⏳ PENDING

---

### Test Category 3: Batch Processing Statistics

#### Test 3.1: Get Statistics
```python
def test_get_stats():
    processor = BatchProcessor()
    processor.add_batch([
        ('v1.mkv', 'a1.mp3', 'out1.mkv'),
        ('v2.mkv', 'a2.mp3', 'out2.mkv'),
        ('v3.mkv', 'a3.mp3', 'out3.mkv'),
    ])
    
    stats = processor.get_stats()
    assert stats['total'] == 3
    assert stats['queued'] == 3
    assert stats['active'] == 0
    assert stats['completed'] == 0
    assert stats['failed'] == 0
    print(f"✓ Statistics: {stats}")

test_get_stats()
```

**Expected**: Accurate job count statistics  
**Status**: ⏳ PENDING

#### Test 3.2: Progress Summary
```python
from BatchProcessor import BatchProcessor

def test_progress_summary():
    processor = BatchProcessor()
    processor.add_batch([
        ('v1.mkv', 'a1.mp3', 'out1.mkv'),
        ('v2.mkv', 'a2.mp3', 'out2.mkv'),
    ])
    
    summary = processor.get_progress_summary()
    assert summary['total'] == 2
    assert summary['completed'] == 0
    assert summary['percent'] == 0
    print(f"✓ Progress: {summary}")

test_progress_summary()
```

**Expected**: Returns progress information  
**Status**: ⏳ PENDING

---

### Test Category 4: UI Formatting

#### Test 4.1: Format Job Progress
```python
from BatchProcessor import BatchJob, BatchProcessorUI

def test_format_job_progress():
    job = BatchJob('video.mkv', 'audio.mp3', 'output.mkv', 1, status='encoding', progress=50)
    display = BatchProcessorUI.format_job_progress(job)
    
    assert 'video.mkv' in display
    assert '50%' in display
    assert '▶️' in display  # Encoding symbol
    print(f"✓ Job progress format: {display}")

test_format_job_progress()
```

**Expected**: Formats job progress correctly  
**Status**: ⏳ PENDING

#### Test 4.2: Format Batch Summary
```python
def test_format_batch_summary():
    stats = {
        'total': 10,
        'completed': 3,
        'active': 2,
        'queued': 5,
        'failed': 0,
    }
    summary = BatchProcessorUI.format_batch_summary(stats)
    
    assert '3/10' in summary  # completed/total
    assert '30%' in summary
    assert 'Active: 2' in summary
    print(f"✓ Batch summary format:\n{summary}")

test_format_batch_summary()
```

**Expected**: Formats batch summary correctly  
**Status**: ⏳ PENDING

---

### Test Category 5: Error Handling

#### Test 5.1: Invalid Job ID
```python
def test_invalid_job_id():
    processor = BatchProcessor()
    processor.add_job('video.mkv', 'audio.mp3', 'output.mkv')
    
    # Query non-existent job
    job = processor.get_job_status(999)
    assert job is None
    print("✓ Invalid job ID handled gracefully")

test_invalid_job_id()
```

**Expected**: Returns None for invalid job ID  
**Status**: ⏳ PENDING

#### Test 5.2: Stop Processing
```python
def test_stop_processing():
    processor = BatchProcessor()
    processor.add_batch([
        ('v1.mkv', 'a1.mp3', 'out1.mkv'),
        ('v2.mkv', 'a2.mp3', 'out2.mkv'),
    ])
    
    processor.stop()
    assert processor._stop_flag == True
    print("✓ Processing stopped")

test_stop_processing()
```

**Expected**: Stop flag set correctly  
**Status**: ⏳ PENDING

---

### Test Category 6: Parallel Processing Simulation

#### Test 6.1: Batch with 4 Jobs, 4 Cores
```python
def test_batch_4_videos():
    processor = BatchProcessor(max_parallel=4)
    processor.add_batch([
        ('v1.mkv', 'a1.mp3', 'out1.mkv'),
        ('v2.mkv', 'a2.mp3', 'out2.mkv'),
        ('v3.mkv', 'a3.mp3', 'out3.mkv'),
        ('v4.mkv', 'a4.mp3', 'out4.mkv'),
    ])
    
    stats = processor.get_stats()
    print(f"✓ 4 jobs with 4-core system: {stats}")
    # Expected: All 4 can run in parallel
    
    # Simulate processing (without actual encoding)
    assert stats['queued'] == 4
    assert processor.max_parallel == 4
```

**Expected**: All 4 jobs can be processed in parallel  
**Status**: ⏳ PENDING

#### Test 6.2: Batch with 8 Jobs, 4 Cores
```python
def test_batch_8_videos_4cores():
    processor = BatchProcessor(max_parallel=4)
    processor.add_batch([
        (f'v{i}.mkv', f'a{i}.mp3', f'out{i}.mkv')
        for i in range(1, 9)
    ])
    
    stats = processor.get_stats()
    print(f"✓ 8 jobs with 4-core system: {stats}")
    # Expected: First 4 run, queue 4 more
    
    assert stats['queued'] == 8
    assert processor.max_parallel == 4
```

**Expected**: Queue manages 8 jobs with 4-job limit  
**Status**: ⏳ PENDING

---

### Test Category 7: Thread Safety

#### Test 7.1: Concurrent Add Operations
```python
import threading

def test_concurrent_add():
    processor = BatchProcessor()
    
    def add_jobs():
        for i in range(10):
            processor.add_job(f'v{i}.mkv', f'a{i}.mp3', f'out{i}.mkv')
    
    threads = [threading.Thread(target=add_jobs) for _ in range(3)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    stats = processor.get_stats()
    assert stats['total'] == 30
    print(f"✓ Concurrent add: {stats['total']} jobs added safely")

test_concurrent_add()
```

**Expected**: All 30 jobs added despite concurrent access  
**Status**: ⏳ PENDING

---

## Performance Benchmarking

### Benchmark 1: Queue Operations Speed
```python
import time
from BatchProcessor import BatchProcessor

def benchmark_queue_operations():
    processor = BatchProcessor()
    
    start = time.time()
    for i in range(1000):
        processor.add_job(f'v{i}.mkv', f'a{i}.mp3', f'out{i}.mkv')
    add_time = time.time() - start
    
    print(f"✓ Added 1000 jobs in {add_time:.3f}s")
    print(f"  Per-job: {(add_time/1000)*1000:.2f}ms")
    
    assert add_time < 0.5, "Should add 1000 jobs in <500ms"

benchmark_queue_operations()
```

**Expected**: <1ms per job  
**Status**: ⏳ PENDING

---

## Test Execution Checklist

### Before Testing
- [ ] BatchProcessor.py created ✅
- [ ] FFmpegAudioManager.py imports updated
- [ ] Test files prepared

### Execute Tests
- [ ] Test Category 1 (Initialization): PASS/FAIL
- [ ] Test Category 2 (Job Management): PASS/FAIL
- [ ] Test Category 3 (Statistics): PASS/FAIL
- [ ] Test Category 4 (UI Formatting): PASS/FAIL
- [ ] Test Category 5 (Error Handling): PASS/FAIL
- [ ] Test Category 6 (Parallel Simulation): PASS/FAIL
- [ ] Test Category 7 (Thread Safety): PASS/FAIL
- [ ] Performance Benchmarks: PASS/FAIL

---

## Expected Results Summary

| Test | Expected Result | Status |
|------|-----------------|--------|
| Basic initialization | max_parallel set | ⏳ PENDING |
| Add single job | Job ID returned | ⏳ PENDING |
| Add batch jobs | All queued | ⏳ PENDING |
| Get job status | Correct status | ⏳ PENDING |
| Get statistics | Accurate counts | ⏳ PENDING |
| Format progress | Correct display | ⏳ PENDING |
| Handle errors | Graceful fallback | ⏳ PENDING |
| Thread safety | No race conditions | ⏳ PENDING |
| Performance | <1ms per job | ⏳ PENDING |

---

## Next Steps

1. Run basic BatchProcessor tests
2. Test FFmpegAudioManager integration
3. Test actual parallel encoding (need videos)
4. Benchmark performance improvement
5. Verify 4x speedup with 4 parallel jobs

