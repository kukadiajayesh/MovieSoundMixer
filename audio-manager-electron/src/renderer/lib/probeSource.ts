import { MergeSource } from '../stores/mergeStore'

// Probes one source file for duration, size, video info (codec, resolution,
// bit depth, HDR) and audio streams. Shared by Merge Audio (for both the
// video and the audio side of a pair) and Re-encode Video.
export const probeSource = async (entry: { name: string; path: string }): Promise<Partial<MergeSource>> => {
  if (!window.electron?.ipcRenderer) return {}
  try {
    const res = await window.electron.ipcRenderer.invoke('probe-streams', entry.path)
    if (!res?.success) return {}
    const props = await window.electron.ipcRenderer.invoke('get-file-properties', entry.path).catch(() => null)
    let streams: MergeSource['streams'] = res.streams
    if (!streams || streams.length === 0) {
      // No detectable audio — still surface it so the reason is visible in the UI
      streams = [{ index: 0, codec: 'unknown', channels: 2 }]
    }
    const preferred = streams.find((s) => s.isDefault) ?? streams[0]
    return {
      streams,
      selectedStreamIndex: preferred.index,
      duration: res.duration,
      size: props?.exists ? props.size : undefined,
      videoCodec: res.videoCodec,
      resolution: res.resolution,
      bitDepth: res.bitDepth,
      hdr: res.hdr,
    }
  } catch (err) {
    console.error('Failed to probe source:', err)
    return {}
  }
}

// The file name part of a path, for either separator.
export const fileNameOf = (fp: string) => fp.substring(fp.lastIndexOf(fp.includes('\\') ? '\\' : '/') + 1)
