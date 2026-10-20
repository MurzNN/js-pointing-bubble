export type {
  Placement,
  ResolvedPlacement,
  TargetAnchor,
  Point,
  BubbleTarget,
  BubbleConfig,
  BubbleController,
  BubbleRenderState,
} from './core'

export {
  DEFAULT_BUBBLE_CONFIG,
  createBubbleController,
  resolveElement,
  isPoint,
  computeGeometry,
  buildTailPaths,
} from './core'

export { PointingBubble } from './PointingBubble'
export type {
  PointingBubbleProps,
  PointingBubbleHandle,
} from './PointingBubble'
export { PointingBubble as Callout } from './PointingBubble'
export { PointingBubble as default } from './PointingBubble'
