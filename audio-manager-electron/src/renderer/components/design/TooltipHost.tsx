import React, { useEffect, useRef, useState } from 'react'

// App-wide hover tooltip. Instead of wrapping every icon button in its own
// component, any element can opt in with `data-tip="Label text"` (and
// `aria-label` for accessibility, since data-tip carries no accessible name).
// One delegated listener pair here handles all of them and renders a single
// dark, theme-matched bubble in a fixed-position layer — escaping any
// ancestor's `overflow: hidden` (e.g. table cells) the way native `title`
// tooltips do, but styled consistently instead of falling back to the OS
// default.
const SHOW_DELAY = 350

interface TipState {
  text: string
  top: number
  left: number
  placement: 'top' | 'bottom'
}

export const TooltipHost: React.FC = () => {
  const [tip, setTip] = useState<TipState | null>(null)
  const showTimer = useRef<number | null>(null)

  useEffect(() => {
    const clearTimer = () => {
      if (showTimer.current !== null) {
        window.clearTimeout(showTimer.current)
        showTimer.current = null
      }
    }

    const place = (el: HTMLElement, text: string) => {
      const rect = el.getBoundingClientRect()
      const above = rect.top > 40
      setTip({
        text,
        left: rect.left + rect.width / 2,
        top: above ? rect.top - 8 : rect.bottom + 8,
        placement: above ? 'top' : 'bottom',
      })
    }

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-tip]') as HTMLElement | null
      const text = el?.getAttribute('data-tip')
      if (!el || !text) return
      clearTimer()
      showTimer.current = window.setTimeout(() => place(el, text), SHOW_DELAY)
    }

    const onOut = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-tip]')
      if (!el) return
      // Ignore moves between a descendant and the tooltip target itself.
      const to = e.relatedTarget as HTMLElement | null
      if (to && el.contains(to)) return
      clearTimer()
      setTip(null)
    }

    const onFocusIn = (e: FocusEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-tip]') as HTMLElement | null
      const text = el?.getAttribute('data-tip')
      if (!el || !text) return
      clearTimer()
      place(el, text)
    }

    const onFocusOut = () => {
      clearTimer()
      setTip(null)
    }

    const onScrollOrResize = () => {
      clearTimer()
      setTip(null)
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('mousedown', onFocusOut)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      clearTimer()
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('mousedown', onFocusOut)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [])

  if (!tip) return null

  return (
    <div
      className={`app-tooltip ${tip.placement}`}
      style={{ top: tip.top, left: tip.left }}
      role="tooltip"
    >
      {tip.text}
    </div>
  )
}
