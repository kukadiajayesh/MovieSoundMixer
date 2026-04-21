# Audio Track Extraction Tool - User Guide

## Objective
Extract audio tracks from video files in a source folder and organize them in a destination folder while preserving the original directory structure.

## Source Structure
```
Source Folder\
├── Subfolder 1 (Series, Season, or Collection Name)/
│   ├── video_file_1.mkv
│   ├── video_file_2.mkv
│   └── ... (more video files)
│
├── Subfolder 2/
│   ├── video_file_3.mkv
│   └── video_file_4.mkv
│
└── Subfolder 3/
    └── (more video files)
```

## Target Structure
```
Output Folder\
├── Subfolder 1 (same name as source)/
│   ├── video_file_1.[audio_codec]
│   ├── video_file_2.[audio_codec]
│   └── ... (extracted audio files)
│
├── Subfolder 2/
│   ├── video_file_3.[audio_codec]
│   └── video_file_4.[audio_codec]
│
└── Subfolder 3/
    └── (extracted audio files)
```

## Extraction Details

### Audio Stream Selection
The application automatically detects and extracts audio streams by:
- **Language Tag Detection**: Searches for audio streams marked with specific language codes (e.g., 'hin' for Hindi)
- **Stream Index Mapping**: Supports different stream positions (first, second, etc.)
- **Fallback Support**: Attempts alternate streams if primary detection fails
- **No Manual Selection Required**: Auto-detection handles most cases

### Extraction Method
The tool uses FFmpeg with **NO re-encoding** (original codec preservation):
```bash
ffmpeg -i "input.mkv" -map 0:a:X -c copy -y "output.[codec]"
```

**Key Features:**
- `-map 0:a:X` - Selects the detected audio stream
- `-c copy` - **Preserves original audio codec** (no re-encoding)
- Output codec extension automatically determined by source codec

**Supported Output Formats:**
- `eac3` → `.eac3` file (E-AC3 audio)
- `ac3` → `.ac3` file (AC3 audio)
- `aac` → `.aac` file (AAC audio)
- `dts` → `.dts` file (DTS audio)
- `flac` → `.flac` file (FLAC audio)
- `opus` → `.opus` file (Opus audio)
- `mp3` → `.mp3` file (MP3 audio)
- Other codecs → `.mka` file (Matroska Audio)

## FFmpegAudioManager Application

### Features
- **Home Menu**: Launch with a clean home screen showing two options (Extract Audio / Add Audio)
- **Smart Navigation**: Back button to return to home screen from any operation
- **Dual Progress Bars**:
  - Current File progress - shows individual file extraction progress
  - Overall Progress - shows total progress across all files
- **Copy Log Feature**: Copy entire log output to clipboard with one click
- **Removed Streams Column**: Cleaner UI with only essential information displayed
- **Taller Rows**: Increased row height (28px) for better visibility
- **Increased Log Panel**: More space to view operation logs (15 lines visible by default)

### Filename Handling
- **Automatic Character Sanitization**: Special characters in stream titles (like `-*-`) are automatically removed from filenames
- **Original Filename Preservation**: Output files keep original video filename with stream title appended as suffix
- Example: `Stranger Things S04E01 (...) [ZiroMB]_192 Kbps Hindi --ZiroMB--.eac3`

### Audio Stream Detection
- Automatically detects Hindi audio streams by language tag (`hin` or `hindi`)
- Supports automatic fallback to alternate streams if primary stream detection fails
- No manual stream selection needed in most cases

## How to Use FFmpegAudioManager

### Step 1: Extract Audio from Videos
1. Launch the application: `python FFmpegAudioManager.py`
2. Click **"Extract Audio from Video Files"** on the home screen
3. Click **"+ Add Files"** or **"+ Add Folder"** to select video files
4. Select output folder using **"Browse..."** button
5. Click **"Extract Audio from All Files"** to start extraction
6. Monitor progress with:
   - **Current File** progress bar: Shows extraction progress of individual file
   - **Overall Progress** bar: Shows cumulative progress across all files
7. View detailed logs in the expanded log panel
8. Use **"Copy Log"** button to copy all logs to clipboard
9. Click **"← Back"** to return to home menu

### Step 2: Add Audio to Videos
1. From home screen, click **"Add Audio to Videos"**
2. Click **"+ Add Videos"** to select video files that need audio
3. For each video, click the **"Audio File"** cell to pick an audio file
   - Or double-click the row to open audio file picker
4. Select output folder
5. Click **"Add Audio to All Videos"** to begin merging
6. Monitor progress on the dual progress bars
7. Audio streams are preserved in original quality (no re-encoding)

## Technical Improvements

### UI/UX Enhancements
- **Responsive Navigation**: Clean home menu with back buttons
- **Visual Progress Tracking**: Two separate progress bars for granular feedback
- **Expanded Log Viewer**: 15 lines of visible log space (up from 7)
- **Clipboard Integration**: Copy logs for troubleshooting
- **Cleaner Treeview**: Removed unnecessary columns, increased row height

### Code Quality
- **Automatic Stream Detection**: Language-based Hindi stream detection
- **Filename Sanitization**: Removes invalid Windows characters from stream titles
- **Error Handling**: Comprehensive logging of all operations
- **No Re-encoding**: Original codecs preserved throughout extraction

## Notes
- Sample files (ending with `_Sample.mkv`) are automatically skipped
- Output files preserve original audio codec (no re-encoding) for quality preservation
- Ensure output directory structure matches source directory names exactly
- Verify file sizes are > 0 bytes after extraction
- Uses original codec-based file extensions (.eac3, .aac, .m4a, etc.)
- Stream title sanitization handles invalid filename characters automatically
