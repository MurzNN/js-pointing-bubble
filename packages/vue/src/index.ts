export {
  PointingBubble,
  PointingBubble as Callout,
  PointingBubble as default,
  PointingBubblePlugin,
  type PointingBubblePluginOptions,
} from './pointing-bubble'

export type {
  Placement,
  ResolvedPlacement,
  TargetAnchor,
  Point,
  BubbleTarget,
  BubbleConfig,
  BubbleController,
  BubbleRenderState,
} from './pointing-bubble'

export {
  DEFAULT_BUBBLE_CONFIG,
  createBubbleController,
  resolveElement,
  isPoint,
  computeGeometry,
  buildTailPaths,
} from './pointing-bubble'
