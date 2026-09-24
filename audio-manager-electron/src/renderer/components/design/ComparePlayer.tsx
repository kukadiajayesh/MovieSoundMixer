import { forwardRef, ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'

export type Hear = 'new' | 'original' | 'both'

export interface ComparePlayerHandle {
  seek: (sec: number) => void
}

interface ComparePlayerProps {
  clip: ArrayBuffer // MP4: video + the shifted new track
  original: ArrayBuffer | null // M4A: the video's own audio, same window
  hear: Hear
  // Called with the audible position (seconds into the clip) as it moves.
  onTime: (sec: number) => void
  // Extra controls shown in the player bar, after the time.
  children?: ReactNode
}

// Video correction: seek past this gap, otherwise nudge the playback rate
// (the video is muted, so the nudge can't be heard).
const SEEK_THRESHOLD_SEC = 0.25
const MAX_RATE_NUDGE = 0.1
const RATE_GAIN = 3

const fmtPos = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, '0')}`

// Plays the preview clip with the new track, the video's original audio, or
// both. Both tracks run through one AudioContext, started at the same instant,
// so they're sample-aligned: a second <audio> element starts tens of ms late,
// which would read as a sync error. The video plays muted and follows the
// audio clock.
export const ComparePlayer = forwardRef<ComparePlayerHandle, ComparePlayerProps>(
  ({ clip, original, hear, onTime, children }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const videoUrl = useMemo(() => URL.createObjectURL(new Blob([clip], { type: 'video/mp4' })), [clip])
    useEffect(() => () => URL.revokeObjectURL(videoUrl), [videoUrl])
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [playing, setPlaying] = useState(false)
    const [pos, setPos] = useState(0)
    // Mutable playback state shared by the audio graph and the rAF loop.
    const engine = useRef<{
      ctx: AudioContext
      gainNew: GainNode
      gainOrig: GainNode
      bufNew: AudioBuffer | null
      bufOrig: AudioBuffer | null
      sources: AudioBufferSourceNode[]
      // While playing: context time the sources started at, and clip position then.
      startCtx: number
      startPos: number
      pos: number // position while paused
      raf: number
      videoTimer: number
      playing: boolean
    } | null>(null)
    const onTimeRef = useRef(onTime)
    useEffect(() => {
      onTimeRef.current = onTime
    }, [onTime])

    // Build the audio graph and decode both tracks for this clip.
    useEffect(() => {
      const ctx = new AudioContext()
      const gainNew = ctx.createGain()
      const gainOrig = ctx.createGain()
      gainNew.connect(ctx.destination)
      gainOrig.connect(ctx.destination)
      const e = {
        ctx,
        gainNew,
        gainOrig,
        bufNew: null as AudioBuffer | null,
        bufOrig: null as AudioBuffer | null,
        sources: [] as AudioBufferSourceNode[],
        startCtx: 0,
        startPos: 0,
        pos: 0,
        raf: 0,
        videoTimer: 0,
        playing: false,
      }
      engine.current = e
      let cancelled = false
      // decodeAudioData detaches its input, so hand it copies.
      Promise.all([ctx.decodeAudioData(clip.slice(0)), original ? ctx.decodeAudioData(original.slice(0)) : null])
        .then(([bufNew, bufOrig]) => {
          if (cancelled) return
          e.bufNew = bufNew
          e.bufOrig = bufOrig
          setReady(true)
        })
        .catch((err: Error) => !cancelled && setError(`Couldn't decode the preview audio: ${err.message}`))
      return () => {
        cancelled = true
        cancelAnimationFrame(e.raf)
        clearTimeout(e.videoTimer)
        e.sources.forEach((s) => s.stop())
        void ctx.close()
        engine.current = null
        setReady(false)
        setPlaying(false)
      }
    }, [clip, original])

    // Which track is heard is just gain, so switching is instant and keeps
    // the position. A short ramp avoids clicks.
    useEffect(() => {
      const e = engine.current
      if (!e) return
      const now = e.ctx.currentTime
      const [n, o] = hear === 'new' ? [1, 0] : hear === 'original' ? [0, 1] : [0.8, 0.8]
      e.gainNew.gain.setTargetAtTime(n, now, 0.01)
      e.gainOrig.gain.setTargetAtTime(o, now, 0.01)
    }, [hear, ready])

    const duration = () => engine.current?.bufNew?.duration ?? 0

    // Audible position: where the sources are, minus the output latency, so
    // the picture lines up with what's heard rather than what's scheduled.
    const currentPos = () => {
      const e = engine.current
      if (!e) return 0
      if (!e.playing) return e.pos
      const latency = e.ctx.outputLatency || e.ctx.baseLatency || 0
      return Math.max(e.startPos, e.startPos + (e.ctx.currentTime - e.startCtx) - latency)
    }

    const stopSources = () => {
      const e = engine.current
      if (!e) return
      e.sources.forEach((s) => {
        s.onended = null
        s.stop()
      })
      e.sources = []
    }

    const pause = (at?: number) => {
      const e = engine.current
      const v = videoRef.current
      if (!e) return
      e.pos = at ?? currentPos()
      e.playing = false
      stopSources()
      cancelAnimationFrame(e.raf)
      clearTimeout(e.videoTimer)
      if (v) {
        v.pause()
        v.playbackRate = 1
        v.currentTime = e.pos
      }
      setPlaying(false)
      setPos(e.pos)
      onTimeRef.current(e.pos)
    }

    const tick = () => {
      const e = engine.current
      const v = videoRef.current
      if (!e || !e.playing) return
      const p = currentPos()
      if (p >= duration()) {
        pause(duration())
        return
      }
      if (v) {
        const gap = p - v.currentTime
        if (Math.abs(gap) > SEEK_THRESHOLD_SEC) {
          v.currentTime = p
          v.playbackRate = 1
        } else {
          v.playbackRate = 1 + Math.max(-MAX_RATE_NUDGE, Math.min(MAX_RATE_NUDGE, gap * RATE_GAIN))
        }
      }
      setPos(p)
      onTimeRef.current(p)
      e.raf = requestAnimationFrame(tick)
    }

    const play = (from?: number) => {
      const e = engine.current
      const v = videoRef.current
      if (!e || !e.bufNew) return
      let start = from ?? e.pos
      if (start >= duration() - 0.05) start = 0
      stopSources()
      void e.ctx.resume()
      // A few ms of lead so both sources start on the same scheduled instant.
      const when = e.ctx.currentTime + 0.03
      const pairs: Array<[AudioBuffer | null, GainNode]> = [
        [e.bufNew, e.gainNew],
        [e.bufOrig, e.gainOrig],
      ]
      for (const [buf, gain] of pairs) {
        if (!buf) continue
        const src = e.ctx.createBufferSource()
        src.buffer = buf
        src.connect(gain)
        src.start(when, start)
        e.sources.push(src)
      }
      e.startCtx = when
      e.startPos = start
      e.playing = true
      if (v) {
        // Hold the picture until the sound is actually heard (the scheduling
        // lead plus output latency), so they start together.
        v.currentTime = start
        const latency = e.ctx.outputLatency || e.ctx.baseLatency || 0
        clearTimeout(e.videoTimer)
        e.videoTimer = window.setTimeout(
          () => e.playing && void v.play().catch(() => {}),
          (when - e.ctx.currentTime + latency) * 1000,
        )
      }
      setPlaying(true)
      cancelAnimationFrame(e.raf)
      e.raf = requestAnimationFrame(tick)
    }

    const toggle = () => (engine.current?.playing ? pause() : play())

    useImperativeHandle(ref, () => ({
      seek: (sec: number) => {
        const e = engine.current
        if (!e) return
        const at = Math.max(0, Math.min(duration(), sec))
        if (e.playing) play(at)
        else pause(at)
      },
    }))

    // Start as soon as the audio is decoded; the render was just asked for.
    useEffect(() => {
      if (ready) play(0)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready])

    return (
      <div className="cp">
        <video
          ref={videoRef}
          className="sp-video"
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          onClick={toggle}
        />
        <div className="cp-bar">
          <button
            className="btn btn-ghost btn-sm cp-play"
            onClick={toggle}
            disabled={!ready}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <span className="cp-time">
            {fmtPos(pos)} / {fmtPos(duration())}
          </span>
          {children}
          {error && <span className="sp-note err">{error}</span>}
        </div>
      </div>
    )
  },
)
ComparePlayer.displayName = 'ComparePlayer'
