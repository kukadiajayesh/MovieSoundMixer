import { ProbeResult } from './prober'
import { detectGPUEncoders, pickPreferredEncoder, getGPUEncoderArgs } from '../gpu/gpuDetector'
import * as db from '../db/repository'

export type Quality = 'fast' | 'balanced' | 'quality'

// Video codecs (as labelled by probeStreams) that WebM can hold as-is.
const WEBM_VIDEO_CODECS = ['VP8', 'VP9', 'AV1']

// libvpx-vp9 settings per quality preset, for WebM output that has to be
// re-encoded. Constant quality (-b:v 0 + -crf); lower cpu-used is slower
// and better.
const VP9_ARGS: Record<Quality, string[]> = {
  fast: ['-deadline', 'realtime', '-cpu-used', '8', '-crf', '36'],
  balanced: ['-deadline', 'good', '-cpu-used', '4', '-crf', '32'],
  quality: ['-deadline', 'good', '-cpu-used', '2', '-crf', '28'],
}

export interface VideoEncodeOptions {
  videoInfo: ProbeResult | null
  outContainer: string
  copyVideo: boolean
  quality?: Quality
  // User-picked hardware encoder; omitted/empty means auto-pick the best.
  encoder?: string
}

export interface VideoEncodePlan {
  args: string[] // the -c:v ... part of an FFmpeg command
  reencode: boolean
  encoderLabel: string // e.g. "copy", "h264_nvenc", "libvpx-vp9"
  // Set when the output differs from the chosen options.
  note?: string
}

// The video-codec part of an FFmpeg merge. Shared by the real merge and the
// test-encode preview so the preview always encodes exactly what the merge will.
export async function buildVideoEncodeArgs(opts: VideoEncodeOptions): Promise<VideoEncodePlan> {
  const quality = opts.quality ?? 'balanced'
  const webm = opts.outContainer === 'webm'
  const videoCodec = opts.videoInfo?.videoCodec
  const webmCopyOk = !!videoCodec && WEBM_VIDEO_CODECS.includes(videoCodec)

  if (opts.copyVideo && (!webm || webmCopyOk)) {
    return { args: ['-c:v', 'copy'], reencode: false, encoderLabel: 'copy' }
  }
  if (webm) {
    // Hardware encoders here are H.264/HEVC only, which WebM can't hold.
    return {
      args: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-row-mt', '1', ...VP9_ARGS[quality]],
      reencode: true,
      encoderLabel: 'libvpx-vp9',
      note: opts.copyVideo
        ? `WebM can't hold ${videoCodec ?? 'this'} video, so it's being re-encoded to VP9 (slower than a copy)`
        : undefined,
    }
  }
  // Re-encoding: use a hardware encoder when GPU acceleration is enabled
  // and one is available, otherwise fall back to CPU libx264.
  const settings = await db.getSettings()
  const gpuEnabled = settings.gpu_enabled === 'true'
  const detected = detectGPUEncoders()
  // Honor the user's dropdown choice only if it's actually one of the
  // encoders we detected — otherwise fall back to auto-picking the best.
  const requestedEncoder = opts.encoder && detected.available.includes(opts.encoder) ? opts.encoder : null
  const encoder = gpuEnabled ? requestedEncoder ?? pickPreferredEncoder(detected) : null
  return {
    args: getGPUEncoderArgs(encoder ?? 'libx264', quality),
    reencode: true,
    encoderLabel: encoder ?? 'libx264',
  }
}
