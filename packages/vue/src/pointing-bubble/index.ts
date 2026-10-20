import type { App, Plugin } from 'vue'
import PointingBubble from './PointingBubble.vue'

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

export { PointingBubble }
export { PointingBubble as Callout }
export { PointingBubble as default }

export interface PointingBubblePluginOptions {
  name?: string
}

export const PointingBubblePlugin: Plugin = {
  install(app: App, options: PointingBubblePluginOptions = {}) {
    const name = options.name ?? 'PointingBubble'
    app.component(name, PointingBubble)
    app.component('Callout', PointingBubble)
  },
}
