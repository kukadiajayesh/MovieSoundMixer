import { ProbeResult } from './prober'
import { getEncoderSupport, pickPreferredEncoder, getGPUEncoderArgs } from '../gpu/gpuDetector'

export type Quality = 'fast' | 'balanced' | 'quality'

// Video codecs (as labelled by probeStreams) that WebM can hold as-is.
export const WEBM_VIDEO_CODECS = ['VP8', 'VP9', 'AV1']

// CPU encoders that are always available in the bundled FFmpeg.
export const CPU_ENCODERS = ['libx264', 'libx265']

// libopus only accepts the standard channel layouts (it rejects e.g. the
// common "5.1(side)"), so audio bound for WebM is first converted to the
// nearest one; mapping family 1 lets it keep surround channels.
export const OPUS_LAYOUT_FILTER = 'aformat=channel_layouts=7.1|5.1|5.0|quad|3.0|stereo|mono'
export const OPUS_ARGS = ['-c:a', 'libopus', '-b:a', '192k', '-mapping_family', '1']

export const isHevcEncoder =(encoder: string) => encoder.startsWith('hevc') || encoder === 'libx265'

// libvpx-vp9 settings per quality preset, for WebM output. Constant quality
// (-b:v 0 + -crf); lower cpu-used is slower and better.
const VP9_ARGS: Record<Quality, string[]> = {
  fast: ['-deadline', 'realtime', '-cpu-used', '8', '-crf', '36'],
  balanced: ['-deadline', 'good', '-cpu-used', '4', '-crf', '32'],
  quality: ['-deadline', 'good', '-cpu-used', '2', '-crf', '28'],
}

// H.264/HEVC VUI codes for the HDR colour description, used to restore it
// with a bitstream filter on encoders that ignore -color_* options (AMF).
const PRIMARIES_CODE: Record<string, number> = { bt2020: 9 }
const TRANSFER_CODE: Record<string, number> = { smpte2084: 16, 'arib-std-b67': 18 }
const MATRIX_CODE: Record<string, number> = { bt2020nc: 9, bt2020c: 10 }

export interface VideoEncodeOptions {
  source: ProbeResult | null
  outContainer: string
  quality?: Quality
  // 'auto' (or empty), a hardware encoder name, or a CPU_ENCODERS entry.
  encoder?: string
}

export interface VideoEncodePlan {
  args: string[] // the video-encoding part of an FFmpeg command
  encoderLabel: string // e.g. "h264_amf", "libx265", "libvpx-vp9"
  notes: string[] // what the user should know about the output
}

// The video-encoding part of a re-encode. Shared by the real job and the
// test-encode preview so the preview always encodes exactly what the job will.
// Keeps 10-bit and HDR whenever the chosen encoder can.
export async function buildVideoEncodeArgs(opts: VideoEncodeOptions): Promise<VideoEncodePlan> {
  const quality = opts.quality ?? 'balanced'
  const source = opts.source
  const tenBitSource = (source?.bitDepth ?? 8) > 8
  const hdr = !!source?.hdr
  const notes: string[] = []
  const { working, tenBit } = await getEncoderSupport()

  let encoder: string
  if (opts.outContainer === 'webm') {
    // Hardware encoders here are H.264/HEVC only, which WebM can't hold.
    encoder = 'libvpx-vp9'
  } else if (opts.encoder && opts.encoder !== 'auto' && (working.includes(opts.encoder) || CPU_ENCODERS.includes(opts.encoder))) {
    encoder = opts.encoder
  } else {
    if (opts.encoder && opts.encoder !== 'auto') notes.push(`${opts.encoder} doesn't work on this computer, so Auto picked one instead`)
    if (tenBitSource || hdr) {
      const gpu = pickPreferredEncoder(tenBit, 'hevc')
      encoder = gpu ?? 'libx265'
      if (!gpu) notes.push('No GPU encoder here can do 10-bit, so this uses CPU H.265 to keep 10-bit/HDR. It is much slower.')
    } else {
      encoder = pickPreferredEncoder(working, 'h264') ?? 'libx264'
    }
  }

  const args = encoder === 'libvpx-vp9'
    ? ['-c:v', 'libvpx-vp9', '-b:v', '0', '-row-mt', '1', ...VP9_ARGS[quality]]
    : getGPUEncoderArgs(encoder, quality)
  const cpu = encoder.startsWith('lib')
  const keepsTenBit = encoder === 'libx265' || encoder === 'libvpx-vp9' || tenBit.includes(encoder)

  if (tenBitSource && keepsTenBit) {
    args.push('-pix_fmt', cpu ? 'yuv420p10le' : 'p010le')
    if (encoder === 'libvpx-vp9') args.push('-profile:v', '2')
    else if (!cpu) args.push('-profile:v', 'main10')
  } else if (tenBitSource) {
    args.push('-pix_fmt', cpu ? 'yuv420p' : 'nv12')
    notes.push(
      hdr
        ? `${encoder} is 8-bit only: HDR colours are kept but gradients may show banding. Pick CPU H.265 to keep full 10-bit.`
        : `${encoder} is 8-bit only, so the 10-bit source becomes 8-bit.`,
    )
  }

  // Carry the source's colour description over (FFmpeg names, e.g. bt709).
  const known = (v?: string) => !!v && v !== 'unknown' && v !== 'reserved'
  if (known(source?.colorPrimaries)) args.push('-color_primaries', source!.colorPrimaries!)
  if (known(source?.colorTransfer)) args.push('-color_trc', source!.colorTransfer!)
  if (known(source?.colorSpace)) args.push('-colorspace', source!.colorSpace!)

  if (hdr && encoder === 'libx265') {
    args.push('-x265-params', 'hdr10-opt=1:repeat-headers=1')
  } else if (hdr && !cpu) {
    // Hardware encoders may ignore -color_*; write the HDR description into
    // the bitstream directly so players don't show it as washed-out SDR.
    const p = PRIMARIES_CODE[source!.colorPrimaries ?? '']
    const t = TRANSFER_CODE[source!.colorTransfer ?? '']
    const m = MATRIX_CODE[source!.colorSpace ?? '']
    if (p && t && m) {
      const bsf = encoder.startsWith('hevc') ? 'hevc_metadata' : 'h264_metadata'
      args.push('-bsf:v', `${bsf}=colour_primaries=${p}:transfer_characteristics=${t}:matrix_coefficients=${m}`)
    }
  }

  return { args, encoderLabel: encoder, notes }
}
