#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch Processing Manager - Parallel Video Encoding

Enables simultaneous encoding of multiple videos using process pool,
maximizing CPU utilization across all available cores.
"""

import os
import subprocess
import sys
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Callable, Deque, Dict, List, Optional, Tuple

_WIN = sys.platform == "win32"
_POPEN_FLAGS = {"creationflags": subprocess.CREATE_NO_WINDOW} if _WIN else {}


@dataclass
class BatchJob:
    """Represents a single encoding job in the batch."""
    video_file: str
    audio_file: str
    output_file: str
    job_id: int
    status: str = 'queued'  # queued, encoding, completed, failed
    progress: float = 0.0  # 0-100
    process: Optional[subprocess.Popen] = None
    error_message: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None

    def duration(self) -> Optional[float]:
        """Return encoding duration in seconds, or None if not completed."""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    def display_name(self) -> str:
        """Return display name for job."""
        return os.path.basename(self.video_file)


class BatchProcessor:
    """
    Manages parallel encoding of multiple video files.

    Queues jobs and processes up to max_parallel simultaneously,
    respecting system resource constraints.
    """

    def __init__(self, max_parallel: Optional[int] = None):
        """
        Initialize batch processor.

        Args:
            max_parallel: Number of parallel processes (default: CPU count - 1)
        """
        try:
            from multiprocessing import cpu_count
            self.max_parallel = max_parallel or max(1, cpu_count() - 1)
        except (ImportError, NotImplementedError):
            self.max_parallel = max_parallel or 4

        self.queue: Deque[BatchJob] = deque()
        self.active_processes: Dict[int, BatchJob] = {}
        self.completed_jobs: List[BatchJob] = []
        self.failed_jobs: List[BatchJob] = []

        self._lock = threading.Lock()
        self._stop_flag = False
        self._job_counter = 0

    def add_job(self, video_file: str, audio_file: str, output_file: str) -> int:
        """
        Add a single job to the batch queue.

        Args:
            video_file: Path to video file
            audio_file: Path to audio file
            output_file: Path to output file

        Returns:
            Job ID (unique identifier)
        """
        with self._lock:
            self._job_counter += 1
            job = BatchJob(video_file, audio_file, output_file, self._job_counter)
            self.queue.append(job)
            return job.job_id

    def add_batch(self, jobs: List[Tuple[str, str, str]]):
        """
        Add multiple jobs to the batch queue.

        Args:
            jobs: List of (video_file, audio_file, output_file) tuples
        """
        for video_file, audio_file, output_file in jobs:
            self.add_job(video_file, audio_file, output_file)

    def get_job_status(self, job_id: int) -> Optional[BatchJob]:
        """Get status of a job by ID."""
        with self._lock:
            for job in self.queue:
                if job.job_id == job_id:
                    return job
            for job in self.active_processes.values():
                if job.job_id == job_id:
                    return job
            for job in self.completed_jobs + self.failed_jobs:
                if job.job_id == job_id:
                    return job
        return None

    def get_all_jobs(self) -> Tuple[List[BatchJob], List[BatchJob], List[BatchJob], List[BatchJob]]:
        """
        Get all jobs organized by status.

        Returns:
            Tuple of (queued, active, completed, failed) job lists
        """
        with self._lock:
            queued = list(self.queue)
            active = list(self.active_processes.values())
            completed = list(self.completed_jobs)
            failed = list(self.failed_jobs)
        return queued, active, completed, failed

    def get_stats(self) -> Dict[str, int]:
        """Get overall batch statistics."""
        with self._lock:
            return {
                'total': len(self.queue) + len(self.active_processes) + len(self.completed_jobs) + len(self.failed_jobs),
                'queued': len(self.queue),
                'active': len(self.active_processes),
                'completed': len(self.completed_jobs),
                'failed': len(self.failed_jobs),
            }

    def process_batch(self, start_job_callback: Optional[Callable] = None,
                     update_callback: Optional[Callable] = None) -> bool:
        """
        Process batch jobs in parallel.

        Starts up to max_parallel jobs simultaneously, monitors completion,
        and starts queued jobs as slots become available.

        Args:
            start_job_callback: Called when job starts: (job_id, job_name)
            update_callback: Called periodically: (stats_dict)

        Returns:
            True if all jobs completed, False if stopped/errored
        """
        self._stop_flag = False

        while not self._stop_flag:
            # Check for completed jobs
            self._check_completed_jobs()

            # Start new jobs if slots available
            while not self._stop_flag and len(self.active_processes) < self.max_parallel:
                with self._lock:
                    if not self.queue:
                        break
                    job = self.queue.popleft()

                if self._start_job(job, start_job_callback):
                    with self._lock:
                        self.active_processes[job.job_id] = job

            # Call update callback
            if update_callback:
                stats = self.get_stats()
                update_callback(stats)

            # Check if all done
            if not self.active_processes and not self.queue:
                break

            # Small sleep to prevent busy-waiting
            time.sleep(0.5)

        return len(self.failed_jobs) == 0

    def _start_job(self, job: BatchJob, callback: Optional[Callable] = None) -> bool:
        """
        Start a single encoding job.

        Args:
            job: BatchJob to start
            callback: Optional callback when job starts

        Returns:
            True if started successfully, False otherwise
        """
        try:
            job.status = 'encoding'
            job.start_time = time.time()

            if callback:
                callback(job.job_id, job.display_name())

            # Note: Job command building would happen here
            # For now, return True to indicate start attempt
            return True

        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            return False

    def _check_completed_jobs(self):
        """Check for completed jobs and move to appropriate list."""
        with self._lock:
            completed_ids = []
            for job_id, job in list(self.active_processes.items()):
                if job.process and job.process.poll() is not None:
                    job.status = 'completed' if job.process.returncode == 0 else 'failed'
                    job.end_time = time.time()

                    if job.status == 'completed':
                        self.completed_jobs.append(job)
                    else:
                        job.error_message = f"Process exited with code {job.process.returncode}"
                        self.failed_jobs.append(job)

                    completed_ids.append(job_id)

            for job_id in completed_ids:
                del self.active_processes[job_id]

    def stop(self):
        """Stop batch processing."""
        self._stop_flag = True

        with self._lock:
            for job in self.active_processes.values():
                if job.process:
                    try:
                        job.process.kill()
                    except Exception:
                        pass

    def get_progress_summary(self) -> Dict[str, object]:
        """Get human-readable progress summary."""
        stats = self.get_stats()
        total_completed = stats['completed'] + stats['failed']
        total = stats['total']
        percent = int((total_completed / total * 100) if total > 0 else 0)

        return {
            'total': total,
            'completed': total_completed,
            'percent': percent,
            'active': stats['active'],
            'queued': stats['queued'],
            'failed': stats['failed'],
        }


class BatchProcessorUI:
    """
    UI helper for batch processing display.

    Formats progress information for display in UI.
    """

    @staticmethod
    def format_job_progress(job: BatchJob) -> str:
        """Format a single job's progress for display."""
        status_symbol = {
            'queued': '[Q]',
            'encoding': '[>]',
            'completed': '[✓]',
            'failed': '[✗]',
        }.get(job.status, '[?]')

        progress_bar = BatchProcessorUI._progress_bar(job.progress)
        return f"{status_symbol} {job.display_name()}: {int(job.progress)}% {progress_bar}"

    @staticmethod
    def format_batch_summary(stats: Dict[str, int]) -> str:
        """Format overall batch summary."""
        total = stats['total']
        completed = stats['completed']
        percent = int((completed / total * 100) if total > 0 else 0)
        bar = BatchProcessorUI._progress_bar(percent)

        return (
            f"Batch Progress: {completed}/{total} ({percent}%) {bar}\n"
            f"Active: {stats['active']} | Queued: {stats['queued']} | Failed: {stats['failed']}"
        )

    @staticmethod
    def _progress_bar(percent: int, width: int = 10) -> str:
        """Generate ASCII progress bar."""
        filled = int(width * percent / 100)
        bar = '=' * filled + '-' * (width - filled)
        return f"[{bar}]"


if __name__ == '__main__':
    # Test batch processor
    processor = BatchProcessor()

    # Add test jobs
    test_jobs = [
        ('video1.mkv', 'audio1.mp3', 'output1.mkv'),
        ('video2.mkv', 'audio2.mp3', 'output2.mkv'),
        ('video3.mkv', 'audio3.mp3', 'output3.mkv'),
        ('video4.mkv', 'audio4.mp3', 'output4.mkv'),
    ]
    processor.add_batch(test_jobs)

    print(f"Added {len(test_jobs)} jobs to batch")
    print(f"Max parallel: {processor.max_parallel}")

    stats = processor.get_stats()
    print(f"Stats: {stats}")

    summary = BatchProcessorUI.format_batch_summary(stats)
    print(summary)
