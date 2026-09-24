export const fileExt = (name: string) => (name.split('.').pop() || '').toLowerCase()
export const baseName = (name: string) => name.replace(/\.[^.]+$/, '')

// Friendly container-format label per file extension. Derived purely from
// the extension already in hand — no probing needed.
const CONTAINER_LABELS: Record<string, string> = {
  mkv: 'MKV (Matroska)',
  mp4: 'MP4 (MPEG-4)',
  m4v: 'M4V (MPEG-4)',
  mov: 'MOV (QuickTime)',
  webm: 'WebM',
  avi: 'AVI',
  flv: 'FLV (Flash Video)',
  ts: 'TS (MPEG-TS)',
  m2ts: 'M2TS (MPEG-TS)',
  '3gp': '3GP',
  mp3: 'MP3 (MPEG Audio)',
  aac: 'AAC (Advanced Audio)',
  flac: 'FLAC (Free Lossless)',
  wav: 'WAV (Waveform Audio)',
  m4a: 'M4A (MPEG-4 Audio)',
  ogg: 'OGG (Vorbis)',
  wma: 'WMA (Windows Media)',
  eac3: 'EAC3 (Dolby Digital Plus)',
  ac3: 'AC3 (Dolby Digital)',
  dts: 'DTS',
  mka: 'MKA (Matroska Audio)',
}

export const containerLabel = (ext: string): string => {
  const key = ext.toLowerCase()
  return CONTAINER_LABELS[key] || key.toUpperCase()
}

// Channel count -> friendly layout label, e.g. 6 -> "5.1".
const CHANNEL_LABELS: Record<number, string> = {
  1: 'Mono',
  2: 'Stereo',
  6: '5.1',
  8: '7.1',
}

export const channelLabel = (channels?: number): string | null => {
  if (!channels) return null
  return CHANNEL_LABELS[channels] || `${channels}ch`
}

// Formats a byte count as "1.84 GB" / "512 MB" / "340 KB".
export const fmtSize = (bytes?: number): string | null => {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(2)} ${units[i]}`
}

// Formats seconds as "1h 48m 32s", dropping leading zero units
// ("48m 32s" under an hour, "32s" under a minute).
export const fmtDuration = (seconds?: number): string | null => {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return null
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Describes an A/V sync offset in words — positive offsets delay the audio:
// 250 -> "250 ms later", -1500 -> "1.5 s earlier".
export const fmtOffset = (ms: number): string => {
  const abs = Math.abs(ms)
  const amount = abs < 1000 ? `${abs} ms` : `${parseFloat((abs / 1000).toFixed(3))} s`
  return `${amount} ${ms < 0 ? 'earlier' : 'later'}`
}

// Compact signed form for tight spots: 250 -> "+250 ms", -1500 -> "−1.5 s".
export const fmtOffsetShort = (ms: number): string => {
  const abs = Math.abs(ms)
  const amount = abs < 1000 ? `${abs} ms` : `${parseFloat((abs / 1000).toFixed(3))} s`
  return `${ms < 0 ? '−' : '+'}${amount}`
}

// Clock-style time: 65 -> "1:05", 3723 -> "1:02:03".
export const fmtClock = (sec: number): string => {
  const s = Math.floor(sec % 60)
  const m = Math.floor(sec / 60) % 60
  const h = Math.floor(sec / 3600)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

// "1:05", "1:02:03" or plain seconds ("65") -> seconds; null if unparseable.
export const parseClock = (text: string): number | null => {
  const parts = text.trim().split(':')
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0)
}
