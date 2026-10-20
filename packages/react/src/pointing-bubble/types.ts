export type Placement =
  | 'auto'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'manual'

export type ResolvedPlacement =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'manual'
  | 'none'

export type TargetAnchor = 'center' | 'edge'

export interface Point {
  x: number
  y: number
}

/** Core target: coords, DOM element, CSS selector, or null (box-only / in-flow). */
export type BubbleTarget = Point | Element | string | null

export interface FrameRect {
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  viewportWidth: number
  viewportHeight: number
}

export interface LocalRect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface BoxMeasure {
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  radius: string
  zIndex: string
}

export interface Geometry {
  placement: ResolvedPlacement
  tx: number
  ty: number
  bx: number
  by: number
  w: number
  h: number
}

export interface Room {
  left: number
  right: number
}

export interface TailPaths {
  fill: string
  stroke: string | null
}

export interface BubbleConfig {
  target: BubbleTarget
  placement: Placement
  targetAnchor: TargetAnchor
  maxWidth?: number
  tailLength: number
  tailBaseWidth: number
  padding: number | string
  shadow: boolean
  transitionDuration: number
}

export const DEFAULT_BUBBLE_CONFIG: BubbleConfig = {
  target: null,
  placement: 'auto',
  targetAnchor: 'center',
  tailLength: 45,
  tailBaseWidth: 24,
  padding: 8,
  shadow: true,
  transitionDuration: 200,
}

export type StyleMap = Record<string, string | number | undefined>
