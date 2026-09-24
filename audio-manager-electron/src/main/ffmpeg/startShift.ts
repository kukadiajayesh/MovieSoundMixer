import { spawn } from 'child_process'
import { getFFmpegPath } from './detector'

// mkvmerge and FFmpeg don't line two input files up the same way, so an
// mkvmerge merge can put the new track tens of ms off from where an FFmpeg
// merge, and the sync preview (FFmpeg too), put it. Per file, mkvmerge places
// the tracks it takes later than FFmpeg does by:
//  - MP4/MOV/M4A: the edit list's start skip (AAC priming, e.g. 1024 samples
//    = 21.3 ms at 48 kHz), which mkvmerge ignores. FFmpeg shows it as a
//    negative timestamp on the first packet; mkvmerge shifts every track it
//    takes from the file by the largest one. Opus is the exception: its skip
//    lives in its own header, which mkvmerge carries over and players honour.
//  - MP3 with a LAME/Info header: the gapless delay (FFmpeg's "start") plus
//    the Info frame itself, which mkvmerge keeps as a frame of audio.
//  - Anything else (MKV, MKA, raw AAC, ...): FFmpeg moves a file that starts
//    before 0 (e.g. an FFmpeg-made MKV whose audio priming sits at -21 ms) up
//    to 0; mkvmerge keeps its timestamps. So a negative start counts, as a
//    negative value.
// The difference between the video's and the audio file's values is the
// correction. Measured against mkvmerge v100 and FFmpeg 6.0 with a flash
// frame and test tones; see TASK_BOARD 2026-09-24.

// Samples in one MPEG-1 Layer III frame (the Info frame mkvmerge keeps).
const MP3_FRAME_SAMPLES = 1152

export type ShiftTracks =
  | { audioOrdinal: number } // just this audio track (the donor's chosen one)
  | { video: true; audio: boolean } // the target's video, plus its audio when kept

// Seconds by which mkvmerge will place the given tracks of `path` later than
// FFmpeg does (negative: earlier). 0 when it can't be worked out.
export function mkvmergeStartShift(path: string, tracks: ShiftTracks): Promise<number> {
  const maps =
    'audioOrdinal' in tracks
      ? ['-map', `0:a:${tracks.audioOrdinal}`]
      : ['-map', '0:v:0', ...(tracks.audio ? ['-map', '0:a?'] : [])]
  // Copy a moment of the tracks to nowhere; -debug_ts reports each packet's
  // timestamp as it leaves the demuxer.
  const args = ['-hide_banner', '-i', path, ...maps, '-c', 'copy', '-t', '1', '-f', 'null', '-', '-debug_ts']

  return new Promise((resolve) => {
    const child = spawn(getFFmpegPath(), args)
    let out = ''
    child.stderr.on('data', (d) => {
      // The banner and the first few packets are all that's needed.
      if (out.length < 200_000) out += d.toString()
    })
    child.on('error', () => resolve(0))
    child.on('close', () => resolve(parseShift(out, tracks)))
  })
}

// Absolute stream indexes of the requested tracks, from the input banner
// ("Stream #0:1[0x2](eng): Audio: ..."). -debug_ts logs packets of every
// stream the demuxer reads, mapped or not, so they have to be picked out.
function wantedStreams(log: string, tracks: ShiftTracks): Set<number> {
  const streams = [...log.matchAll(/Stream #0:(\d+)[^:]*: (Video|Audio): (\w+)/g)].map((m) => ({
    index: Number(m[1]),
    type: m[2],
    codec: m[3],
  }))
  const audio = streams.filter((st) => st.type === 'Audio')
  const picked =
    'audioOrdinal' in tracks
      ? [audio[tracks.audioOrdinal]]
      : [streams.find((st) => st.type === 'Video'), ...(tracks.audio ? audio : [])]
  // Opus start skips survive mkvmerge (see above), so they don't count.
  return new Set(picked.filter((st) => st && st.codec !== 'opus').map((st) => st!.index))
}

function parseShift(log: string, tracks: ShiftTracks): number {
  const demuxer = log.match(/Input #0, (.+?), from '/)?.[1] ?? ''

  if (/\b(mov|mp4)\b/.test(demuxer)) {
    // Earliest first-packet timestamp across the requested streams.
    const wanted = wantedStreams(log, tracks)
    const firstPts = new Map<number, number>()
    for (const m of log.matchAll(/demuxer -> ist_index:\d+:(\d+) type:\w+ pkt_pts:\S+ pkt_pts_time:([-\d.e]+)/g)) {
      const index = Number(m[1])
      if (wanted.has(index) && !firstPts.has(index)) firstPts.set(index, Number(m[2]))
    }
    const earliest = Math.min(0, ...[...firstPts.values()].filter(Number.isFinite))
    return -earliest
  }

  if (demuxer === 'mp3') {
    const start = Number(log.match(/Duration: [^,]+, start: ([-\d.]+)/)?.[1] ?? 0)
    const rate = Number(log.match(/Audio: mp3[^\n]*?(\d+) Hz/)?.[1] ?? 0)
    // No gapless info (start 0) means no Info frame for mkvmerge to keep.
    return start > 0 && rate > 0 ? start + MP3_FRAME_SAMPLES / rate : 0
  }

  // FFmpeg's file start, when it's before 0.
  const start = Number(log.match(/Duration: [^,]+, start: ([-\d.]+)/)?.[1] ?? 0)
  return Number.isFinite(start) ? Math.min(0, start) : 0
}
