import type { BoxMeasure, FrameRect } from './types'

export function sameKeys(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): boolean {
  if (!a || !b) return false
  return Object.keys(a).every((k) => a[k] === b[k])
}

/** Measure root frame including ancestor CSS scale (e.g. Slidev). */
export function measureFrame(root: HTMLElement): FrameRect {
  const rootRect = root.getBoundingClientRect()
  const rootStyle = getComputedStyle(root)
  const width = parseFloat(rootStyle.width) || 0
  const height = parseFloat(rootStyle.height) || 0
  return {
    left: rootRect.left,
    top: rootRect.top,
    width,
    height,
    scaleX: width ? rootRect.width / width : 1,
    scaleY: height ? rootRect.height / height : 1,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }
}

export function measureBox(
  boxEl: HTMLElement,
  rootEl: HTMLElement,
  frame: FrameRect,
  manual: boolean,
): BoxMeasure {
  const s = getComputedStyle(boxEl)
  const { scaleX, scaleY } = frame
  const r = boxEl.getBoundingClientRect()
  const rootRect = rootEl.getBoundingClientRect()
  return {
    x: manual ? (r.left - rootRect.left) / scaleX : 0,
    y: manual ? (r.top - rootRect.top) / scaleY : 0,
    width: r.width / scaleX,
    height: r.height / scaleY,
    fill: s.backgroundColor,
    stroke: s.borderTopColor,
    strokeWidth: parseFloat(s.borderTopWidth) || 0,
    radius: s.borderTopLeftRadius,
    zIndex: s.zIndex,
  }
}
