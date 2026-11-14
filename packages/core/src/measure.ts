import type { BoxMeasure, FrameRect } from './types'

export function sameKeys(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): boolean {
  if (!a || !b) return false
  return Object.keys(a).every((k) => a[k] === b[k])
}

/**
 * Nearest positioned ancestor of `boxEl`, used as the tip/tail coordinate
 * frame. Falls back to `document.documentElement`.
 */
export function positioningFrameEl(boxEl: HTMLElement): HTMLElement {
  let el: HTMLElement | null = boxEl.parentElement
  while (el) {
    const pos = getComputedStyle(el).position
    if (pos && pos !== 'static') return el
    if (el === document.documentElement) break
    el = el.parentElement
  }
  return document.documentElement
}

/** Measure a frame element including ancestor CSS scale (e.g. Slidev). */
export function measureFrame(frameEl: HTMLElement): FrameRect {
  const rect = frameEl.getBoundingClientRect()
  const style = getComputedStyle(frameEl)
  const width = parseFloat(style.width) || 0
  const height = parseFloat(style.height) || 0
  return {
    left: rect.left,
    top: rect.top,
    width,
    height,
    scaleX: width ? rect.width / width : 1,
    scaleY: height ? rect.height / height : 1,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }
}

/** Frame for tip/tail math: the bubble's positioning containing block. */
export function measureFrameFrom(boxEl: HTMLElement): FrameRect {
  return measureFrame(positioningFrameEl(boxEl))
}

/** Box size and top-left in frame-local coordinates. */
export function measureBox(boxEl: HTMLElement, frame: FrameRect): BoxMeasure {
  const s = getComputedStyle(boxEl)
  const { scaleX, scaleY, left, top } = frame
  const r = boxEl.getBoundingClientRect()
  return {
    x: (r.left - left) / scaleX,
    y: (r.top - top) / scaleY,
    width: r.width / scaleX,
    height: r.height / scaleY,
    fill: s.backgroundColor,
    stroke: s.borderTopColor,
    strokeWidth: parseFloat(s.borderTopWidth) || 0,
    // Abspos SVG is positioned against the padding edge; path math uses the
    // border box from getBoundingClientRect — subtract these when offsetting.
    borderLeft: (parseFloat(s.borderLeftWidth) || 0) / scaleX,
    borderTop: (parseFloat(s.borderTopWidth) || 0) / scaleY,
    radius: s.borderTopLeftRadius,
    zIndex: s.zIndex,
  }
}
