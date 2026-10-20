export type {
  Placement,
  ResolvedPlacement,
  TargetAnchor,
  Point,
  BubbleTarget,
  FrameRect,
  LocalRect,
  BoxMeasure,
  Geometry,
  Room,
  TailPaths,
  BubbleConfig,
  StyleMap,
} from './types'

export { DEFAULT_BUBBLE_CONFIG } from './types'

export { injectBubbleStyles, SHADOW } from './styles'

export { isPoint, resolveElement } from './resolveTarget'

export { sameKeys, measureFrame, measureBox } from './measure'

export { computeRoom, roomierSide, computeGeometry } from './geometry'
export type { ComputeGeometryOptions } from './geometry'

export { easeGeometry } from './ease'
export type { EaseHandle } from './ease'

export { buildTailPaths } from './tail'
export type { BuildTailOptions } from './tail'

export { createBubbleController } from './createBubbleController'
export type {
  BubbleRenderState,
  BubbleControllerOptions,
  BubbleController,
} from './createBubbleController'
