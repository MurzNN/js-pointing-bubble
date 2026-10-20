import type { Geometry } from './types'

const ANIMATED_KEYS = ['tx', 'ty', 'bx', 'by'] as const
const MANUAL_ANIMATED_KEYS = ['tx', 'ty'] as const

export interface EaseHandle {
  cancel: () => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Ease `from` → `to` with ease-out cubic. Calls `onFrame` each tick.
 * Manual placement only animates tip coords (CSS owns the box).
 */
export function easeGeometry(
  from: Geometry | null,
  to: Geometry | null,
  durationMs: number,
  onFrame: (value: Geometry | null) => void,
): EaseHandle {
  let frame = 0
  const cancel = () => {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
  }

  if (
    !to ||
    !from ||
    durationMs <= 0 ||
    typeof requestAnimationFrame === 'undefined' ||
    prefersReducedMotion()
  ) {
    onFrame(to)
    return { cancel }
  }

  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs)
    const eased = 1 - Math.pow(1 - t, 3)
    const next: Geometry = { ...to }
    const keys =
      to.placement === 'manual' ? MANUAL_ANIMATED_KEYS : ANIMATED_KEYS
    for (const key of keys) {
      next[key] = from[key] + (to[key] - from[key]) * eased
    }
    onFrame(next)
    if (t < 1) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
  return { cancel }
}
