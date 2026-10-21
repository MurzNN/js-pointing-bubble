import { describe, expect, it } from 'vitest'
import { computeGeometry, computeRoom, roomierSide } from '../src/geometry'
import type { BoxMeasure, FrameRect, Point } from '../src/types'

const frame: FrameRect = {
  left: 0,
  top: 0,
  width: 800,
  height: 600,
  scaleX: 1,
  scaleY: 1,
  viewportWidth: 1200,
  viewportHeight: 800,
}

const box: BoxMeasure = {
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 2,
  borderLeft: 2,
  borderTop: 2,
  radius: '8px',
  zIndex: 'auto',
}

describe('computeRoom', () => {
  it('returns non-negative room on each side of the tip', () => {
    const tip: Point = { x: 200, y: 100 }
    const room = computeRoom(tip, frame, 45)
    expect(room.left).toBeGreaterThan(0)
    expect(room.right).toBeGreaterThan(0)
    expect(roomierSide(room)).toMatch(/left|right/)
  })
})

describe('computeGeometry', () => {
  it('places bottom-right for a tip in the upper-left area', () => {
    const tip: Point = { x: 100, y: 80 }
    const room = computeRoom(tip, frame, 45)
    const g = computeGeometry({
      tip,
      box,
      frame,
      placement: 'auto',
      targetAnchor: 'center',
      targetRect: null,
      room,
      tailLength: 45,
    })
    expect(g).not.toBeNull()
    expect(g!.placement).toBe('bottom-right')
    expect(g!.bx).toBe(tip.x + 45)
    expect(g!.by).toBe(tip.y + 45)
  })

  it('honors a fixed quadrant', () => {
    const tip: Point = { x: 400, y: 300 }
    const room = computeRoom(tip, frame, 30)
    const g = computeGeometry({
      tip,
      box,
      frame,
      placement: 'top-left',
      targetAnchor: 'center',
      targetRect: null,
      room,
      tailLength: 30,
    })
    expect(g!.placement).toBe('top-left')
    expect(g!.bx).toBe(tip.x - 100 - 30)
    expect(g!.by).toBe(tip.y - 40 - 30)
  })
})
