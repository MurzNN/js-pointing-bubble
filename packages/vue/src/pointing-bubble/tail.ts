import type { Geometry, TailPaths } from './types'

export interface BuildTailOptions {
  geometry: Geometry
  strokeWidth: number
  radius: string
  tailBaseWidth: number
}

/**
 * Build fill + stroke SVG path `d` for the tail from the box wall facing the tip.
 * Fill extends 1px past the border inner edge to cover zoom snapping seams.
 */
export function buildTailPaths(opts: BuildTailOptions): TailPaths | null {
  const { geometry: c, strokeWidth: bw, radius, tailBaseWidth } = opts
  const { placement, tx, ty, bx, by, w, h } = c
  const r =
    parseFloat(radius) *
      (radius.endsWith('%') ? Math.min(w, h) / 100 : 1) || 0
  const half = tailBaseWidth / 2
  const clamp = (v: number, lo: number, hi: number) =>
    lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v))

  let side: 'left' | 'right' | 'top' | 'bottom' | null = null
  let along = 0
  if (placement === 'manual') {
    const dx = Math.max(bx - tx, tx - (bx + w), 0)
    const dy = Math.max(by - ty, ty - (by + h), 0)
    if (dx > 0 && dx >= dy) {
      side = tx < bx ? 'left' : 'right'
      along = ty
    } else if (dy > 0) {
      side = ty < by ? 'top' : 'bottom'
      along = tx
    } else {
      return null
    }
  } else if (placement !== 'none') {
    const [vertical, horizontal] = placement.split('-') as [
      'top' | 'bottom',
      'left' | 'right',
    ]
    side = horizontal === 'left' ? 'right' : 'left'
    along = by + h * (vertical === 'top' ? 0.65 : 0.35)
  } else {
    return null
  }

  const cover = 1
  const horizontalWall = side === 'top' || side === 'bottom'
  const at = {
    left: (a: number, depth: number): [number, number] => [bx - depth, a],
    right: (a: number, depth: number): [number, number] => [bx + w + depth, a],
    top: (a: number, depth: number): [number, number] => [a, by - depth],
    bottom: (a: number, depth: number): [number, number] => [a, by + h + depth],
  }[side]
  const tipDepth = {
    left: bx - tx,
    right: tx - bx - w,
    top: by - ty,
    bottom: ty - by - h,
  }[side]
  const a = horizontalWall
    ? clamp(along, bx + r + half + bw / 2, bx + w - r - half - bw / 2)
    : clamp(along, by + r + half + bw / 2, by + h - r - half - bw / 2)
  const bend = Math.max(0, Math.min(bw, tipDepth / 2))
  const point = ([x, y]: [number, number]) => `${x} ${y}`
  const edge = (base: number, innerDepth: number) => {
    const ctrl = at(base, bend)
    const dist = Math.hypot(tx - ctrl[0], ty - ctrl[1]) || 1
    const end: [number, number] = [
      ctrl[0] + ((tx - ctrl[0]) * bend) / dist,
      ctrl[1] + ((ty - ctrl[1]) * bend) / dist,
    ]
    return {
      inner: point(at(base, innerDepth)),
      outer: point(at(base, 0)),
      ctrl: point(ctrl),
      end: point(end),
    }
  }
  const tail = (innerDepth: number) => {
    const s1 = edge(a - half, innerDepth)
    const s2 = edge(a + half, innerDepth)
    return (
      `M ${s1.inner} L ${s1.outer} Q ${s1.ctrl} ${s1.end} L ${tx} ${ty} ` +
      `L ${s2.end} Q ${s2.ctrl} ${s2.outer} L ${s2.inner}`
    )
  }
  return {
    fill: `${tail(-bw - cover)} Z`,
    stroke: bw ? tail(-bw) : null,
  }
}
