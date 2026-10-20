import type { BubbleTarget, Point } from './types'

export function isPoint(value: unknown): value is Point {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Point).x === 'number' &&
    typeof (value as Point).y === 'number' &&
    !((value as Element).nodeType === 1)
  )
}

/**
 * Resolve a CSS selector or Element. Adapters unwrap framework component
 * instances / refs before calling this.
 */
export function resolveElement(target: BubbleTarget): Element | null {
  if (typeof Element === 'undefined' || target == null) return null
  if (typeof target === 'string') return document.querySelector(target)
  if (target instanceof Element) return target
  return null
}
