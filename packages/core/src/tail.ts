import type { Geometry, TailPaths } from './types'

export interface BuildTailOptions {
  geometry: Geometry
  strokeWidth: number
  radius: string
  tailBaseWidth: number
}

type TailSide = 'left' | 'right' | 'top' | 'bottom'

/**
 * Open wedge tail in frame space.
 *
 * The CSS box border stays as-is. SVG only draws the tip: short hooks that sit
 * on the border band, then straight edges to the tip. SVG stroke is centred on
 * the path, so the path runs down the middle of the border (depth −bw/2) and
 * the stroke paints over the CSS border rather than into the content. Fill
 * follows the same mouth→tip rays as the stroke (covering the border band via
 * a short outer stub) so fill does not sit inside the stroke. No box outline
 * is redrawn.
 */
export function buildTailPaths(opts: BuildTailOptions): TailPaths | null {
  const { geometry: c, strokeWidth: bw, radius, tailBaseWidth } = opts
  const { placement, tx, ty, bx, by, w, h } = c
  const cornerR =
    parseFloat(radius) *
      (radius.endsWith('%') ? Math.min(w, h) / 100 : 1) || 0
  const half = tailBaseWidth / 2
  const clamp = (v: number, lo: number, hi: number) =>
    lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v))

  let side: TailSide | null = null
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

  const horizontalWall = side === 'top' || side === 'bottom'
  // Positive depth = outside the border-box along the chosen wall.
  const at = {
    left: (a: number, depth: number): [number, number] => [bx - depth, a],
    right: (a: number, depth: number): [number, number] => [bx + w + depth, a],
    top: (a: number, depth: number): [number, number] => [a, by - depth],
    bottom: (a: number, depth: number): [number, number] => [a, by + h + depth],
  }[side]

  const a0 = horizontalWall ? bx : by
  const a1wall = horizontalWall ? bx + w : by + h
  const a = clamp(
    along,
    a0 + half + bw / 2 + cornerR,
    a1wall - half - bw / 2 - cornerR,
  )
  const pt = ([x, y]: [number, number]) => `${x} ${y}`

  // Depth 0 = outer edge; −bw = inner edge. Centre the stroke on the border
  // band (−bw/2) so it covers the CSS border from outer to inner edge.
  const attach = bw > 0 ? -bw / 2 : 0
  // Short stubs along the wall so the stroke meets the CSS border cleanly.
  const hook = 2
  // Slight overlap past the inner border edge into the content (enough to hide
  // a hairline seam, not a large red rectangle under the box fill).
  const cover = 2

  const m1 = a - half
  const m2 = a + half
  // Hook ends (far along the wall) vs starts (mouth — where edges run to tip).
  const hook1 = at(m1 - hook, attach)
  const mouth1 = at(m1, attach)
  const mouth2 = at(m2, attach)
  const hook2 = at(m2 + hook, attach)

  // Fill must use the same mouth→tip rays as the stroke. Going to tip from a
  // point past the outer edge (different depth, same along) skews those rays
  // inward and leaves a border-sized gap between the box and the fill.
  const inner1 = at(m1, -(bw + cover))
  const inner2 = at(m2, -(bw + cover))
  // Past the outer edge so fill still covers the CSS border band.
  const outer1 = at(m1, 1)
  const outer2 = at(m2, 1)

  return {
    fill:
      `M ${pt(inner1)} L ${pt(outer1)} L ${pt(mouth1)} L ${tx} ${ty} ` +
      `L ${pt(mouth2)} L ${pt(outer2)} L ${pt(inner2)} Z`,
    stroke: bw
      ? `M ${pt(hook1)} L ${pt(mouth1)} L ${tx} ${ty} ` +
        `L ${pt(mouth2)} L ${pt(hook2)}`
      : null,
  }
}
