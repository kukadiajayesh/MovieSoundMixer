# FFmpeg Audio Manager

A Python/Tkinter GUI application for managing audio tracks in video files. Extract audio from videos or merge external audio tracks into video files with intelligent codec handling and automatic synchronization.

## What This Script Does

**FFmpeg Audio Manager** provides a user-friendly interface for two main audio operations:

### 1. **Extract Audio from Video Files**
- Probe video files to detect all audio streams
- Automatically identify language tags, codecs, and stream metadata
- Extract selected audio streams as standalone files
- Preserve original audio codecs (no re-encoding)
- Automatically organize extracted files into output folders

**Supported Input Formats:** `.mkv`, `.mp4`, `.avi`, `.mov`, `.ts`, `.m2ts`

**Output Formats:**
- `.eac3` (E-AC3 audio)
- `.ac3` (AC3 audio)
- `.aac` (AAC audio)
- `.dts` (DTS audio)
- `.flac` (FLAC audio)
- `.opus` (Opus audio)
- `.mp3` (MP3 audio)
- `.mka` (Matroska Audio for others)

### 2. **Add Audio to Videos**
- Merge external audio tracks into video files
- Automatic episode matching by pattern (S##E##)
- Handle duration mismatches with smart padding/cropping
- Container format auto-selection (MP4 vs MKV based on codec compatibility)
- Dual processing backends: **mkvmerge** (fast, no re-encoding) or **FFmpeg**
- Preserve original video and audio codecs
- Maintain language metadata and subtitle streams

## Why This Script Was Built

This application was created to solve specific challenges when working with international content:

### Problem: Multi-track Audio Management
When working with video content (particularly non-English series like Stranger Things in Hindi), you often need to:
- Extract specific audio tracks from videos
- Merge translated audio tracks back into video files
- Handle duration mismatches between video and audio sources
- Maintain quality by avoiding unnecessary re-encoding

### Problem: Codec & Container Incompatibility
- Different video containers (MP4, MKV) support different audio codecs
- Manual processing is error-prone and time-consuming
- Need intelligent selection between FFmpeg and mkvmerge tools

### Solution: Automated, User-Friendly GUI
This script eliminates manual command-line work by providing:
- **Automatic codec detection** — detects audio codec and selects appropriate output format
- **Duration synchronization** — automatically detects and fixes duration mismatches (padding/cropping)
- **Smart container selection** — automatically chooses MKV for MP4+incompatible-codec combinations
- **Dual-tool support** — uses fast mkvmerge when available, falls back to FFmpeg
- **Batch processing** — handle multiple files in one operation
- **Visual progress tracking** — separate progress bars for current file and overall progress
- **Language tagging** — sets Hindi as primary audio track with proper metadata

## How to Use

### Prerequisites
- **Python 3.7+**
- **FFmpeg** (with ffprobe) - [Download FFmpeg](https://ffmpeg.org/download.html)
- **Optional: MKVToolNix** - [Download MKVToolNix](https://www.bunkbuild.com/products/mkvtoolnix) (for faster mkvmerge processing)

### Installation
1. Ensure FFmpeg is installed and in your system PATH
2. Run the script:
```bash
python FFmpegAudioManager.py
```

### Step 1: Extract Audio from Videos

1. **Launch** the application
2. **Click "Extract Audio from Videos"** on the home screen
3. **Add Files/Folder** using the buttons
   - Click **"+ Add Files"** to select individual video files
   - Or **"+ Add Folder"** to select all videos from a directory
4. **Select Output Folder** using the **"Browse..."** button
5. **Choose Audio Stream** (Optional)
   - Click on the "Extract Stream" column to change which audio stream to extract
   - Auto-selected by default if available
6. **Start Extraction** by clicking **"Extract Audio from All Files"**
7. **Monitor Progress**
   - Current File progress bar shows extraction progress
   - Overall Progress bar shows total completion
   - View detailed logs on the right panel
8. **Copy Logs** (Optional) - Click "Copy Log" to save logs to clipboard
9. **Return Home** - Click "← Back" to return to main menu

### Step 2: Add Audio to Videos

1. **From home screen**, click **"Add Audio to Videos"**
2. **Browse Audio Folder** (Optional but recommended)
   - Click **"Browse..."** next to "Audio Folder"
   - Select folder containing audio files
   - Audio files are **auto-matched by episode** (S##E##pattern)
3. **Add Videos** using the buttons
   - Click **"+ Add Videos"** to select individual video files
   - Or **"+ Add Video Folder"** to select all videos from a directory
4. **Assign Audio Files** for each video
   - **Auto-matched** if episode patterns match
   - **Manual pick** - Double-click a row or click the Audio File cell to override
5. **Select Merge Tool** (Optional)
   - **Auto** (Default) - Uses mkvmerge if available, else FFmpeg
   - **Force mkvmerge** - Faster, preserves all audio tracks
   - **Force FFmpeg** - Compatible with more containers
6. **Select Output Folder** using the **"Browse..."** button
7. **Handle Duration Mismatches** (if any)
   - If audio duration differs from video, a dialog appears
   - **Padding dialog** - Choose how much silence to add at start/end
   - **Cropping dialog** - Choose how much to trim from audio
   - Or click **Cancel** to skip
8. **Start Merge** by clicking **"Add Audio to All Videos"**
9. **Monitor Progress** - Same dual progress bars as extract
10. **Return Home** - Click "← Back" when done

## Key Features

### Automatic Stream Detection
- **Language tags** - Searches for streams marked with language codes (e.g., 'hin' for Hindi)
- **Smart fallback** - Attempts alternate streams if primary detection fails
- **No manual selection needed** - Auto-detection handles most cases

### Smart Codec Handling
- **Automatic detection** - Identifies audio codec from file extension or ffprobe
- **Format compatibility** - Checks if audio codec works in target container
- **Intelligent selection** - Converts MP4→MKV when needed for unsupported codecs

### Duration Synchronization
- **Mismatch detection** - Identifies when audio/video duration differs
- **Padding support** - Adds silence to extend audio (lossless)
- **Cropping support** - Trims audio from start/end to match video
- **User control** - Choose padding distribution (start/end) or cropping amounts

### Dual Processing Backends
- **mkvmerge path** - Fast, no re-encoding, preserves quality 100%
- **FFmpeg path** - Fallback, works with any container format
- **Tool switching** - User can force specific tool or let app choose

### Quality Preservation
- **No re-encoding by default** - Audio extracted and merged with `-c copy`
- **Codec-aware padding** - Only re-encodes when necessary (duration padding)
- **Original metadata** - Preserves language tags and stream titles

### UI/UX Enhancements
- **Home screen** - Clean menu to navigate between operations
- **Dual progress bars** - Current file and overall progress tracking
- **Expanded log viewer** - 15 lines of visible log space
- **Clipboard integration** - Copy entire logs for troubleshooting
- **Responsive interface** - Disable buttons during processing, show status

## Technical Details

### Audio Codec Support
| Codec | Extract | Add | MP4 Support |
|-------|---------|-----|-------------|
| AAC | ✅ | ✅ | ✅ |
| MP3 | ✅ | ✅ | ✅ |
| E-AC3 | ✅ | ✅ | ❌ (auto-converts to MKV) |
| AC3 | ✅ | ✅ | ❌ (auto-converts to MKV) |
| FLAC | ✅ | ✅ | ❌ (auto-converts to MKV) |
| DTS | ✅ | ✅ | ❌ (auto-converts to MKV) |
| Opus | ✅ | ✅ | ✅ |

### Duration Padding Formula
```
samples = int(video_duration * 48000)
ffmpeg -af apad=whole_len={samples}
```
- Uses 48kHz standard audio sample rate
- Extends audio to exactly match video duration
- Applied losslessly (silence added, no re-encoding)

### Output Format Selection
- **MKV videos** → Always output as `.mkv` (universal container)
- **MP4 + compatible codec** (aac, mp3, opus) → Output as `.mp4`
- **MP4 + incompatible codec** (eac3, ac3, flac, dts) → Auto-convert to `.mkv`

## Processing Times (Benchmark)

- **Audio extraction** - 2-5 seconds per file (fast, no re-encoding)
- **mkvmerge merging** - 3-5 minutes per episode (no re-encoding)
- **FFmpeg merging** - 10-20 minutes per episode (may re-encode)
- **Duration padding** - 5-10 minutes per episode (real-time FFmpeg)
- **Duration detection** - 1-2 seconds per file (ffprobe)

## Example Use Case: Adding Hindi Audio

```
Scenario: You have Stranger Things Season 5 in MP4 with English audio,
and you have a Hindi audio pack in .eac3 format.

1. Launch FFmpeg Audio Manager
2. Click "Add Audio to Videos"
3. Set Audio Folder → /path/to/hindi-audio
4. Add Videos → /path/to/season5-mp4-files
5. Audio files auto-match by S##E## pattern
6. Select output folder
7. Click "Add Audio to All Videos"

Result:
- S05E01_hindi.mkv (auto-converted from MP4 → MKV)
- S05E02_hindi.mkv (eac3 audio not supported in MP4)
- ... all 8 episodes processed
- Hindi audio is primary track (track 0)
- English audio preserved (track 1)
```

## Troubleshooting

### FFmpeg Not Found
- **Error**: "ffmpeg was not found on PATH"
- **Solution**: Download and install FFmpeg, add to system PATH

### Audio Shorter Than Video
- **Error**: Duration mismatch dialog appears
- **Solution**: Accept padding dialog, choose distribution of silence
- **Note**: Automatically handled if duration differs > 0.5 seconds

### MP4 Container Issues
- **Error**: "Invalid encoder for output format mp4"
- **Solution**: Application auto-selects MKV format for incompatible codecs
- **Note**: Only affects initial merge, subsequent operations on .mkv files

### Missing Audio After Merge
- **Common Cause**: Audio file assigned but not detected
- **Solution**: 
  - Verify audio file path is correct
  - Ensure audio file is readable
  - Check logs for detailed error messages

## Advanced: Command-Line Equivalent

For reference, here are the FFmpeg commands used internally:

**Extract Audio:**
```bash
ffmpeg -i "input.mkv" -map 0:a:X -c copy "output.[codec]"
```

**Merge Audio (with padding):**
```bash
ffmpeg -y -i video.mkv -i audio.aac \
  -filter_complex "[1:a]apad=whole_len=8640000[padded]" \
  -map 0:v -map 0:a -map "[padded]" -map 0:s? \
  -c:v copy -c:a aac output_hindi.mkv
```

**Merge with mkvmerge:**
```bash
mkvmerge -o output.mkv --language 0:hin audio.eac3 video.mkv
```

## Dependencies

- **tkinter** - GUI framework (included with Python)
- **ffmpeg** - Media processing
- **ffprobe** - Media stream inspection (part of ffmpeg)
- **mkvmerge** - Optional, for faster container merging (MKVToolNix)

## Notes

- Sample files (ending with `_Sample.mkv`) are automatically skipped in some contexts
- Output files preserve original audio codec for quality preservation
- Verify file sizes are > 0 bytes after processing
- Uses codec-based file extensions for compatibility
- Stream title sanitization handles invalid filename characters automatically

## License & Credits

This tool was developed for batch processing multi-language video content with FFmpeg and mkvmerge, specifically to handle:
- Language-specific audio extraction
- International content localization
- Automated audio synchronization
- Container format management

## Support

For issues, troubleshooting, or feature requests:
1. Check the logs in the application (right panel)
2. Copy logs using the "Copy Log" button
3. Verify FFmpeg is installed and working
4. Check that input files are valid video/audio files
