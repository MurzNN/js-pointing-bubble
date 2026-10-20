import type {
  BoxMeasure,
  FrameRect,
  Geometry,
  LocalRect,
  Placement,
  Point,
  ResolvedPlacement,
  Room,
  TargetAnchor,
} from './types'

export function computeRoom(
  tip: Point,
  frame: FrameRect,
  tailLength: number,
): Room {
  const reach = tip.x - tailLength
  let left = reach
  let right = frame.width ? frame.width - tip.x - tailLength : Infinity
  if (frame.viewportWidth) {
    left = Math.min(left, frame.left / frame.scaleX + reach)
    right = Math.min(
      right,
      (frame.viewportWidth - frame.left) / frame.scaleX - tip.x - tailLength,
    )
  }
  return { left: Math.max(0, left), right: Math.max(0, right) }
}

export function roomierSide(room: Room): 'left' | 'right' {
  return room.left > room.right ? 'left' : 'right'
}

export interface ComputeGeometryOptions {
  tip: Point
  box: BoxMeasure
  frame: FrameRect
  placement: Placement
  targetAnchor: TargetAnchor
  targetRect: LocalRect | null
  room: Room
  tailLength: number
}

export function computeGeometry(opts: ComputeGeometryOptions): Geometry | null {
  const { tip, box: m, frame: f, placement: placementProp, targetRect, room, tailLength: tLen } =
    opts
  if (!m.width || !m.height) return null

  const { width: w, height: h } = m
  const { x: tx, y: ty } = tip
  const manual = placementProp === 'manual'
  const rect = opts.targetAnchor === 'edge' ? targetRect : null

  if (manual) {
    if (rect) {
      const cx = m.x + w / 2
      const cy = m.y + h / 2
      const inside =
        cx >= rect.left &&
        cx <= rect.right &&
        cy >= rect.top &&
        cy <= rect.bottom
      if (!inside) {
        const ex = Math.min(rect.right, Math.max(rect.left, cx))
        const ey = Math.min(rect.bottom, Math.max(rect.top, cy))
        return { placement: 'manual', tx: ex, ty: ey, bx: m.x, by: m.y, w, h }
      }
    }
    return { placement: 'manual', tx, ty, bx: m.x, by: m.y, w, h }
  }

  const tipYFor = (vertical: 'top' | 'bottom') =>
    rect ? (vertical === 'top' ? rect.top : rect.bottom) : ty

  let placement: ResolvedPlacement = placementProp as ResolvedPlacement
  if (placementProp === 'auto') {
    let vertical: 'top' | 'bottom' = ty > (f.height || 600) / 2 ? 'top' : 'bottom'
    let horizontal: 'left' | 'right' = roomierSide(room)

    const { scaleX: sx, scaleY: sy } = f
    if (f.viewportHeight) {
      const fitsAbove = f.top + (tipYFor('top') - h - tLen) * sy >= 0
      const fitsBelow =
        f.top + (tipYFor('bottom') + h + tLen) * sy <= f.viewportHeight
      if (vertical === 'top' && !fitsAbove && fitsBelow) vertical = 'bottom'
      else if (vertical === 'bottom' && !fitsBelow && fitsAbove)
        vertical = 'top'
    }
    if (f.viewportWidth) {
      const fitsLeft = f.left + (tx - w - tLen) * sx >= 0
      const fitsRight =
        f.left + (tx + w + tLen) * sx <= f.viewportWidth
      if (horizontal === 'left' && !fitsLeft && fitsRight) horizontal = 'right'
      else if (horizontal === 'right' && !fitsRight && fitsLeft)
        horizontal = 'left'
    }

    placement = `${vertical}-${horizontal}` as ResolvedPlacement
  }

  const [vertical, horizontal] = (placement as string).split('-') as [
    'top' | 'bottom',
    'left' | 'right',
  ]
  const tipY = tipYFor(vertical)
  return {
    placement,
    tx,
    ty: tipY,
    bx: horizontal === 'left' ? tx - w - tLen : tx + tLen,
    by: vertical === 'top' ? tipY - h - tLen : tipY + tLen,
    w,
    h,
  }
}
