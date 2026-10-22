/**
 * Copy packages/core/src into each adapter's pointing-bubble/ folder and
 * generate a local `./core` barrel. Adapters import from `./core` so shadcn
 * installs work without publishing js-pointing-bubble to npm.
 *
 * Edit packages/core, then run: pnpm registry:sync  (alias: pnpm core:sync)
 */
import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreSrc = join(root, 'packages/core/src')

const CORE_TS = [
  'types.ts',
  'styles.ts',
  'resolveTarget.ts',
  'measure.ts',
  'geometry.ts',
  'ease.ts',
  'tail.ts',
  'createBubbleController.ts',
]

const CORE_BARREL = `export type {
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

export {
  sameKeys,
  positioningFrameEl,
  measureFrame,
  measureFrameFrom,
  measureBox,
} from './measure'

export { computeRoom, roomierSide, computeGeometry } from './geometry'
export type { ComputeGeometryOptions } from './geometry'

export { easeGeometry } from './ease'
export type { EaseHandle } from './ease'

export { buildTailPaths } from './tail'
export type { BuildTailOptions } from './tail'

export {
  createBubbleController,
  isBubbleVisible,
} from './createBubbleController'
export type {
  BubbleRenderState,
  BubbleControllerOptions,
  BubbleController,
} from './createBubbleController'
`

const adapters = [
  {
    dir: join(root, 'packages/vue/src/pointing-bubble'),
    index: `import type { App, Plugin } from 'vue'
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
`,
  },
  {
    dir: join(root, 'packages/react/src/pointing-bubble'),
    index: `export type {
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
`,
  },
]

for (const adapter of adapters) {
  mkdirSync(adapter.dir, { recursive: true })

  for (const name of CORE_TS) {
    const to = join(adapter.dir, name)
    rmSync(to, { force: true })
    cpSync(join(coreSrc, name), to)
  }

  writeFileSync(join(adapter.dir, 'core.ts'), CORE_BARREL)
  writeFileSync(join(adapter.dir, 'index.ts'), adapter.index)

  console.log(
    `Synced core → ${adapter.dir} (${listFiles(adapter.dir).length} files)`,
  )
}

function listFiles(dir) {
  const out = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) out.push(...listFiles(p))
    else out.push(p)
  }
  return out
}
