/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ─── Icons (inline SVG) ─────────────────────────────────────────────
const Icon = ({ name, className = "ico" }) => {
  const paths = {
    extract: <><path d="M12 3v12m0 0l-4-4m4 4l4-4" /><path d="M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></>,
    merge: <><path d="M8 3v6a4 4 0 004 4h0a4 4 0 014 4v4" /><path d="M16 3v6a4 4 0 01-4 4" /></>,
    queue: <><path d="M3 6h18M3 12h18M3 18h12" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></>,
    folder: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
    upload: <><path d="M12 19V5M5 12l7-7 7 7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></>,
    close: <><path d="M18 6L6 18M6 6l12 12" /></>,
    chevron: <path d="M9 18l6-6-6-6" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></>,
    play: <path d="M5 3l14 9-14 9V3z" fill="currentColor" />,
    stop: <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" />,
    check: <path d="M5 13l4 4L19 7" />,
    error: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
    log: <><path d="M4 6h16M4 10h12M4 14h16M4 18h8" /></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" /></>,
    zap: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
    layers: <><path d="M12 2l10 5-10 5L2 7l10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>,
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    waveform: <><path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 6v12M22 12h-2" /></>,
    star: <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7l3-7z" />,
    history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// ─── Mock data ──────────────────────────────────────────────────────
const SAMPLE_VIDEOS = [
  { id: 1, name: "Severance.S02E01.The.Hello.Mr.Milchick.2160p.WEB-DL.mkv", ext: "mkv", episode: "S02E01", size: "4.2 GB",
    streams: [
      { idx: 0, codec: "eac3", channels: "5.1", lang: "eng", title: "Surround", bitrate: "640k" },
      { idx: 1, codec: "aac",  channels: "2.0", lang: "eng", title: "Stereo",   bitrate: "192k" },
      { idx: 2, codec: "ac3",  channels: "5.1", lang: "fra", title: "VF",        bitrate: "448k" },
    ], pickedIdx: 0, status: "ready", progress: 0 },
  { id: 2, name: "Severance.S02E02.Goodbye.Mrs.Selvig.2160p.WEB-DL.mkv", ext: "mkv", episode: "S02E02", size: "4.1 GB",
    streams: [
      { idx: 0, codec: "eac3", channels: "5.1", lang: "eng", title: "Surround", bitrate: "640k" },
      { idx: 1, codec: "aac",  channels: "2.0", lang: "eng", title: "Stereo",   bitrate: "192k" },
    ], pickedIdx: 0, status: "running", progress: 0.62 },
  { id: 3, name: "Severance.S02E03.Who.Is.Alive.1080p.WEB-DL.mp4", ext: "mp4", episode: "S02E03", size: "2.8 GB",
    streams: [
      { idx: 0, codec: "aac", channels: "2.0", lang: "eng", title: "", bitrate: "256k" },
    ], pickedIdx: 0, status: "done", progress: 1 },
  { id: 4, name: "Severance.S02E04.Woes.Hollow.1080p.WEB-DL.mkv", ext: "mkv", episode: "S02E04", size: "3.4 GB",
    streams: [
      { idx: 0, codec: "eac3", channels: "5.1", lang: "eng", title: "", bitrate: "640k" },
      { idx: 1, codec: "aac",  channels: "2.0", lang: "spa", title: "Latino", bitrate: "192k" },
    ], pickedIdx: 0, status: "ready", progress: 0 },
  { id: 5, name: "Severance.S02E05.Trojans.Horse.1080p.WEB-DL.mkv", ext: "mkv", episode: "S02E05", size: "3.6 GB",
    streams: [
      { idx: 0, codec: "eac3", channels: "5.1", lang: "eng", title: "", bitrate: "640k" },
    ], pickedIdx: 0, status: "probing", progress: 0 },
  { id: 6, name: "Severance.S02E06.Attila.1080p.WEB-DL.mkv", ext: "mkv", episode: "S02E06", size: "3.5 GB",
    streams: [], pickedIdx: 0, status: "error", progress: 0, error: "No audio streams detected" },
];

const SAMPLE_MERGE = [
  { id: 1, video: "Severance.S02E01.1080p.mkv", videoExt: "mkv", audio: "Severance.S02E01.HINDI.eac3", audioExt: "eac3", episode: "S02E01", matched: true, status: "ready" },
  { id: 2, video: "Severance.S02E02.1080p.mkv", videoExt: "mkv", audio: "Severance.S02E02.HINDI.eac3", audioExt: "eac3", episode: "S02E02", matched: true, status: "running", progress: 0.34 },
  { id: 3, video: "Severance.S02E03.1080p.mkv", videoExt: "mkv", audio: "Severance.S02E03.HINDI.eac3", audioExt: "eac3", episode: "S02E03", matched: true, status: "done", progress: 1 },
  { id: 4, video: "Severance.S02E04.1080p.mkv", videoExt: "mkv", audio: "", audioExt: "", episode: "S02E04", matched: false, status: "ready" },
  { id: 5, video: "Severance.S02E05.1080p.mkv", videoExt: "mkv", audio: "Severance.S02E05.HINDI.eac3", audioExt: "eac3", episode: "S02E05", matched: true, status: "ready" },
];

const SAMPLE_LOG = [
  { ts: "21:14:02", tag: "info",  msg: "Probed 6 files in 1.83s (parallel)" },
  { ts: "21:14:03", tag: "info",  msg: "Detected GPU encoders: h264_nvenc, hevc_nvenc" },
  { ts: "21:14:11", tag: "info",  msg: "Output folder: /Users/saro/Movies/extracted" },
  { ts: "21:14:11", tag: "ok",    msg: "Started extract: Severance.S02E01 [stream a:0 eac3 5.1ch eng]" },
  { ts: "21:14:11", tag: "cmd",   msg: "ffmpeg -i 'Severance.S02E01.mkv' -map 0:a:0 -c copy 'S02E01.eac3'" },
  { ts: "21:14:14", tag: "ok",    msg: "Severance.S02E01 → S02E01.eac3 (38.4 MB) in 2.91s" },
  { ts: "21:14:14", tag: "ok",    msg: "Started extract: Severance.S02E02 [stream a:0 eac3 5.1ch eng]" },
  { ts: "21:14:18", tag: "warn",  msg: "Severance.S02E04 has 2 audio streams; defaulting to first eng track" },
  { ts: "21:14:22", tag: "error", msg: "Severance.S02E06: ffprobe found 0 audio streams (skipped)" },
];

const SAMPLE_RECENTS = [
  { id: 1, kind: "extract", name: "Severance S01 — extracted 10 tracks", when: "Today, 18:42", count: 10, status: "ok" },
  { id: 2, kind: "merge",   name: "Severance S02 — Hindi dub merged",      when: "Today, 17:11", count: 8,  status: "ok" },
  { id: 3, kind: "extract", name: "Foundation S02 — extracted 8 tracks",   when: "Yesterday",    count: 8,  status: "ok" },
  { id: 4, kind: "merge",   name: "Andor S02 — failed (missing audio)",     when: "May 2",        count: 1,  status: "error" },
  { id: 5, kind: "merge",   name: "Mr. Robot S04 — merged 13 tracks",       when: "Apr 28",       count: 13, status: "ok" },
];

window.SAMPLE_VIDEOS = SAMPLE_VIDEOS;
window.SAMPLE_MERGE = SAMPLE_MERGE;
window.SAMPLE_LOG = SAMPLE_LOG;
window.SAMPLE_RECENTS = SAMPLE_RECENTS;
window.Icon = Icon;
