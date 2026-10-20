import { easeGeometry, type EaseHandle } from './ease'
import { computeGeometry, computeRoom, roomierSide } from './geometry'
import { measureBox, measureFrame, sameKeys } from './measure'
import { isPoint, resolveElement } from './resolveTarget'
import { injectBubbleStyles, SHADOW } from './styles'
import { buildTailPaths } from './tail'
import type {
  BoxMeasure,
  BubbleConfig,
  BubbleTarget,
  FrameRect,
  Geometry,
  LocalRect,
  Point,
  ResolvedPlacement,
  StyleMap,
  TailPaths,
} from './types'
import { DEFAULT_BUBBLE_CONFIG } from './types'

export interface BubbleRenderState {
  hasTarget: boolean
  placement: ResolvedPlacement
  tip: Point | null
  /** Tip passed to slot/children (resolved geometry tip when available). */
  slotTip: Point | null
  overlayStyle: StyleMap
  boxStyle: StyleMap
  /** When no target, root element is the box. */
  rootIsBox: boolean
  tail: TailPaths | null
  boxFill: string
  boxStroke: string
  boxStrokeWidth: number
  boxZIndex: string
}

export interface BubbleControllerOptions {
  getRootEl: () => HTMLElement | null
  getBoxEl: () => HTMLElement | null
  onChange?: (state: BubbleRenderState) => void
}

export interface BubbleController {
  update: () => void
  setConfig: (partial: Partial<BubbleConfig>) => void
  getConfig: () => BubbleConfig
  getState: () => BubbleRenderState
  destroy: () => void
}

function emptyState(hasTarget: boolean): BubbleRenderState {
  return {
    hasTarget,
    placement: 'none',
    tip: null,
    slotTip: null,
    overlayStyle: {},
    boxStyle: {},
    rootIsBox: !hasTarget,
    tail: null,
    boxFill: '',
    boxStroke: '',
    boxStrokeWidth: 0,
    boxZIndex: 'auto',
  }
}

function pointEqual(a: Point | null, b: Point | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y
}

function renderStateEqual(a: BubbleRenderState, b: BubbleRenderState): boolean {
  return (
    a.hasTarget === b.hasTarget &&
    a.placement === b.placement &&
    a.rootIsBox === b.rootIsBox &&
    a.boxFill === b.boxFill &&
    a.boxStroke === b.boxStroke &&
    a.boxStrokeWidth === b.boxStrokeWidth &&
    a.boxZIndex === b.boxZIndex &&
    pointEqual(a.tip, b.tip) &&
    pointEqual(a.slotTip, b.slotTip) &&
    sameKeys(a.overlayStyle, b.overlayStyle) &&
    sameKeys(a.boxStyle, b.boxStyle) &&
    a.tail?.fill === b.tail?.fill &&
    a.tail?.stroke === b.tail?.stroke
  )
}

export function createBubbleController(
  options: BubbleControllerOptions,
): BubbleController {
  injectBubbleStyles()

  let config: BubbleConfig = { ...DEFAULT_BUBBLE_CONFIG }
  let tip: Point | null = null
  let targetRect: LocalRect | null = null
  let box: BoxMeasure | null = null
  let frameRect: FrameRect = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    scaleX: 1,
    scaleY: 1,
    viewportWidth: 0,
    viewportHeight: 0,
  }
  let current: Geometry | null = null
  let geometry: Geometry | null = null
  let easeHandle: EaseHandle | null = null
  let resizeObserver: ResizeObserver | null = null
  let state: BubbleRenderState = emptyState(false)

  const emit = () => {
    const next = buildState()
    if (renderStateEqual(state, next)) return
    state = next
    options.onChange?.(state)
  }

  function buildState(): BubbleRenderState {
    const hasTarget = config.target != null
    const manual = config.placement === 'manual'
    const placement: ResolvedPlacement = hasTarget
      ? (current?.placement ?? 'none')
      : 'none'

    const overlayStyle: StyleMap = {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      filter: config.shadow ? SHADOW : undefined,
    }
    const z = box?.zIndex
    if (z && z !== 'auto') overlayStyle.zIndex = z

    const boxStyle: StyleMap = {
      '--pb-padding':
        typeof config.padding === 'number'
          ? `${config.padding}px`
          : config.padding,
    }
    if (config.maxWidth != null) {
      boxStyle['--pb-max-width'] = `${config.maxWidth}px`
    }

    if (!hasTarget) {
      boxStyle['--pb-width'] = 'fit-content'
      if (config.shadow) boxStyle.filter = SHADOW
    } else {
      Object.assign(boxStyle, {
        position: 'absolute',
        pointerEvents: 'auto',
        visibility: current ? 'visible' : 'hidden',
      })
      if (manual) {
        boxStyle['--pb-width'] = 'fit-content'
      } else {
        Object.assign(boxStyle, {
          left: `${current?.bx ?? 0}px`,
          top: `${current?.by ?? 0}px`,
          margin: '0',
        })
        if (config.maxWidth == null && tip) {
          const room = computeRoom(tip, frameRect, config.tailLength)
          const placed = geometry?.placement ?? config.placement
          const side =
            placed === 'auto'
              ? roomierSide(room)
              : ((placed as string).split('-')[1] as 'left' | 'right')
          boxStyle['--pb-max-width'] = `${room[side]}px`
        }
      }
    }

    const tail =
      hasTarget && current && box
        ? buildTailPaths({
            geometry: current,
            strokeWidth: box.strokeWidth,
            radius: box.radius,
            tailBaseWidth: config.tailBaseWidth,
          })
        : null

    return {
      hasTarget,
      placement,
      tip,
      slotTip: geometry
        ? { x: geometry.tx, y: geometry.ty }
        : tip,
      overlayStyle,
      boxStyle,
      rootIsBox: !hasTarget,
      tail,
      boxFill: box?.fill ?? '',
      boxStroke: box?.stroke ?? '',
      boxStrokeWidth: box?.strokeWidth ?? 0,
      boxZIndex: box?.zIndex ?? 'auto',
    }
  }

  function recomputeGeometry() {
    if (!tip || !box) {
      geometry = null
      startEase(null)
      return
    }
    const room = computeRoom(tip, frameRect, config.tailLength)
    geometry = computeGeometry({
      tip,
      box,
      frame: frameRect,
      placement: config.placement,
      targetAnchor: config.targetAnchor,
      targetRect,
      room,
      tailLength: config.tailLength,
    })
    startEase(geometry)
  }

  function startEase(to: Geometry | null) {
    easeHandle?.cancel()
    easeHandle = easeGeometry(
      current,
      to,
      config.transitionDuration,
      (value) => {
        current = value
        emit()
      },
    )
  }

  function measure() {
    const root = options.getRootEl()
    const boxEl = options.getBoxEl()
    if (!boxEl || config.target == null || !root) return
    const next = measureBox(
      boxEl,
      root,
      frameRect,
      config.placement === 'manual',
    )
    if (
      !sameKeys(
        next as unknown as Record<string, unknown>,
        box as unknown as Record<string, unknown> | null,
      )
    ) {
      box = next
    }
  }

  function update() {
    const root = options.getRootEl()
    if (config.target == null || !root) {
      tip = null
      targetRect = null
      box = null
      geometry = null
      current = null
      emit()
      return
    }

    frameRect = measureFrame(root)
    const el = resolveElement(config.target)
    if (el) {
      const r = el.getBoundingClientRect()
      const { scaleX, scaleY, left, top } = frameRect
      const rect: LocalRect = {
        left: (r.left - left) / scaleX,
        top: (r.top - top) / scaleY,
        right: (r.right - left) / scaleX,
        bottom: (r.bottom - top) / scaleY,
      }
      if (!sameKeys(rect as unknown as Record<string, unknown>, targetRect as unknown as Record<string, unknown> | null)) {
        targetRect = rect
      }
      tip = {
        x: (rect.left + rect.right) / 2,
        y: (rect.top + rect.bottom) / 2,
      }
    } else if (isPoint(config.target)) {
      targetRect = null
      tip = { x: config.target.x, y: config.target.y }
    } else {
      targetRect = null
      tip = null
      box = null
      geometry = null
      current = null
      emit()
      return
    }
    measure()
    recomputeGeometry()
  }

  function onWindowUpdate() {
    update()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onWindowUpdate)
    window.addEventListener('scroll', onWindowUpdate, true)
  }

  function ensureObservers() {
    if (typeof ResizeObserver === 'undefined') return
    resizeObserver?.disconnect()
    resizeObserver = new ResizeObserver(() => update())
    const root = options.getRootEl()
    const boxEl = options.getBoxEl()
    if (root) resizeObserver.observe(root)
    if (boxEl) resizeObserver.observe(boxEl)
  }

  // Defer observer attach until first update when els exist
  const originalUpdate = update
  function updateWithObservers() {
    ensureObservers()
    originalUpdate()
  }

  return {
    update: updateWithObservers,
    setConfig(partial) {
      config = { ...config, ...partial }
      updateWithObservers()
    },
    getConfig: () => config,
    getState: () => state,
    destroy() {
      easeHandle?.cancel()
      resizeObserver?.disconnect()
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onWindowUpdate)
        window.removeEventListener('scroll', onWindowUpdate, true)
      }
    },
  }
}

export type { BubbleTarget }
