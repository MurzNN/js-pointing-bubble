import { easeGeometry, type EaseHandle } from './ease'
import { computeGeometry, computeRoom, roomierSide } from './geometry'
import {
  measureBox,
  measureFrameFrom,
  positioningFrameEl,
  sameKeys,
} from './measure'
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
  /** Applied to the component root (always the bubble chrome). */
  boxStyle: StyleMap
  /**
   * SVG layer covering the positioning frame, offset so path coords stay
   * frame-local. Empty when there is no tail.
   */
  svgStyle: StyleMap
  tail: TailPaths | null
  boxFill: string
  boxStroke: string
  boxStrokeWidth: number
  boxZIndex: string
}

export interface BubbleControllerOptions {
  /** The bubble chrome element (component root). */
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

/** Inline styles that move/resize the box (e.g. host drag / v-drag). */
const LAYOUT_STYLE_PROPS = [
  'left',
  'top',
  'right',
  'bottom',
  'width',
  'height',
  'transform',
  'translate',
  'inset',
  'inset-inline',
  'inset-block',
] as const

function emptyState(hasTarget: boolean): BubbleRenderState {
  return {
    hasTarget,
    placement: 'none',
    tip: null,
    slotTip: null,
    boxStyle: {},
    svgStyle: {},
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

function geometryEqual(a: Geometry | null, b: Geometry | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.placement === b.placement &&
    a.tx === b.tx &&
    a.ty === b.ty &&
    a.bx === b.bx &&
    a.by === b.by &&
    a.w === b.w &&
    a.h === b.h
  )
}

function renderStateEqual(a: BubbleRenderState, b: BubbleRenderState): boolean {
  return (
    a.hasTarget === b.hasTarget &&
    a.placement === b.placement &&
    a.boxFill === b.boxFill &&
    a.boxStroke === b.boxStroke &&
    a.boxStrokeWidth === b.boxStrokeWidth &&
    a.boxZIndex === b.boxZIndex &&
    pointEqual(a.tip, b.tip) &&
    pointEqual(a.slotTip, b.slotTip) &&
    sameKeys(a.boxStyle, b.boxStyle) &&
    sameKeys(a.svgStyle, b.svgStyle) &&
    a.tail?.fill === b.tail?.fill &&
    a.tail?.stroke === b.tail?.stroke
  )
}

/** True when the bubble chrome is painted (not display/visibility/opacity hidden). */
export function isBubbleVisible(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true,
    })
  }
  const s = getComputedStyle(el)
  if (s.display === 'none' || s.visibility === 'hidden') return false
  if (parseFloat(s.opacity) === 0) return false
  return true
}

function layoutStyleSignature(el: HTMLElement): string {
  const s = el.style
  return LAYOUT_STYLE_PROPS.map((k) => s.getPropertyValue(k)).join('|')
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
  let mutationObserver: MutationObserver | null = null
  let observedBoxEl: HTMLElement | null = null
  let state: BubbleRenderState = emptyState(false)
  /** Skip work while opacity/display hidden; refresh once when shown again. */
  let suspended = false
  /** Last layout-relevant inline style snapshot (avoids v-drag / self-style loops). */
  let lastLayoutStyleSig = ''

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

    const boxStyle: StyleMap = {
      '--pb-padding':
        typeof config.padding === 'number'
          ? `${config.padding}px`
          : config.padding,
    }
    if (config.maxWidth != null) {
      boxStyle['--pb-max-width'] = `${config.maxWidth}px`
    }
    if (config.shadow) boxStyle.filter = SHADOW

    if (!hasTarget) {
      boxStyle['--pb-width'] = 'fit-content'
    } else {
      Object.assign(boxStyle, {
        position: 'absolute',
        pointerEvents: 'auto',
        overflow: 'visible',
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

    const z = box?.zIndex
    if (z && z !== 'auto') boxStyle.zIndex = z

    const tail =
      hasTarget && current && box
        ? buildTailPaths({
            geometry: current,
            strokeWidth: box.strokeWidth,
            radius: box.radius,
            tailBaseWidth: config.tailBaseWidth,
          })
        : null

    let svgStyle: StyleMap = {}
    if (tail && current && frameRect.width && frameRect.height) {
      // left/top are relative to the padding edge; bx/by are border-box.
      const padX = box?.borderLeft ?? 0
      const padY = box?.borderTop ?? 0
      svgStyle = {
        position: 'absolute',
        left: `${-current.bx - padX}px`,
        top: `${-current.by - padY}px`,
        width: `${frameRect.width}px`,
        height: `${frameRect.height}px`,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: box?.zIndex ?? 'auto',
      }
    }

    return {
      hasTarget,
      placement,
      tip,
      slotTip: geometry ? { x: geometry.tx, y: geometry.ty } : tip,
      boxStyle,
      svgStyle,
      tail,
      boxFill: box?.fill ?? '',
      boxStroke: box?.stroke ?? '',
      boxStrokeWidth: box?.strokeWidth ?? 0,
      boxZIndex: box?.zIndex ?? 'auto',
    }
  }

  function recomputeGeometry() {
    if (!tip || !box) {
      if (geometry !== null || current !== null) {
        geometry = null
        startEase(null)
      }
      return
    }
    const room = computeRoom(tip, frameRect, config.tailLength)
    const next = computeGeometry({
      tip,
      box,
      frame: frameRect,
      placement: config.placement,
      targetAnchor: config.targetAnchor,
      targetRect,
      room,
      tailLength: config.tailLength,
    })
    // Target geometry unchanged — do not cancel/restart an in-flight ease.
    if (geometryEqual(geometry, next)) return
    geometry = next
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

  function measure(boxEl: HTMLElement): boolean {
    const next = measureBox(boxEl, frameRect)
    if (
      sameKeys(
        next as unknown as Record<string, unknown>,
        box as unknown as Record<string, unknown> | null,
      )
    ) {
      return false
    }
    box = next
    return true
  }

  function update() {
    const boxEl = options.getBoxEl()
    if (!boxEl) {
      tip = null
      targetRect = null
      box = null
      geometry = null
      current = null
      suspended = false
      emit()
      return
    }

    // Hidden bubbles (e.g. Slidev v-click opacity:0) skip all layout work.
    if (!isBubbleVisible(boxEl)) {
      easeHandle?.cancel()
      suspended = true
      return
    }
    const wasSuspended = suspended
    suspended = false

    if (config.target == null) {
      tip = null
      targetRect = null
      box = null
      geometry = null
      current = null
      emit()
      return
    }

    const prevFrame = frameRect
    frameRect = measureFrameFrom(boxEl)
    const frameChanged = !sameKeys(
      frameRect as unknown as Record<string, unknown>,
      prevFrame as unknown as Record<string, unknown>,
    )

    // Prefer matching inside the positioning frame so short selectors like
    // `h1` / `p` resolve on the local stage (e.g. a Slidev slide), not the
    // first match in the whole document.
    const el =
      typeof config.target === 'string'
        ? positioningFrameEl(boxEl).querySelector(config.target) ??
          resolveElement(config.target)
        : resolveElement(config.target)

    let tipChanged = false
    let targetChanged = false

    if (el) {
      const r = el.getBoundingClientRect()
      const { scaleX, scaleY, left, top } = frameRect
      const rect: LocalRect = {
        left: (r.left - left) / scaleX,
        top: (r.top - top) / scaleY,
        right: (r.right - left) / scaleX,
        bottom: (r.bottom - top) / scaleY,
      }
      targetChanged = !sameKeys(
        rect as unknown as Record<string, unknown>,
        targetRect as unknown as Record<string, unknown> | null,
      )
      if (targetChanged) targetRect = rect
      const nextTip: Point = {
        x: (rect.left + rect.right) / 2,
        y: (rect.top + rect.bottom) / 2,
      }
      tipChanged = !pointEqual(tip, nextTip)
      tip = nextTip
    } else if (isPoint(config.target)) {
      targetChanged = targetRect != null
      targetRect = null
      const nextTip: Point = { x: config.target.x, y: config.target.y }
      tipChanged = !pointEqual(tip, nextTip)
      tip = nextTip
    } else {
      tip = null
      targetRect = null
      box = null
      geometry = null
      current = null
      emit()
      return
    }

    const boxChanged = measure(boxEl)
    lastLayoutStyleSig = layoutStyleSignature(boxEl)

    if (
      !wasSuspended &&
      !frameChanged &&
      !tipChanged &&
      !targetChanged &&
      !boxChanged &&
      current
    ) {
      return
    }

    recomputeGeometry()
  }

  function onWindowUpdate() {
    update()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onWindowUpdate)
    window.addEventListener('scroll', onWindowUpdate, true)
  }

  const originalUpdate = update

  function onBoxAttributeMutation(mutations: MutationRecord[]) {
    const boxEl = options.getBoxEl()
    if (!boxEl) return

    const classOrHidden = mutations.some(
      (m) => m.attributeName === 'class' || m.attributeName === 'hidden',
    )
    if (classOrHidden) {
      if (!isBubbleVisible(boxEl)) {
        easeHandle?.cancel()
        suspended = true
        return
      }
      originalUpdate()
      return
    }

    // Style-only: ignore chrome writes (filter, --pb-*, pointer-events) that
    // do not move/resize the box — those collide with host drag / v-drag.
    const sig = layoutStyleSignature(boxEl)
    if (sig === lastLayoutStyleSig) return
    lastLayoutStyleSig = sig
    originalUpdate()
  }

  function ensureObservers() {
    const boxEl = options.getBoxEl()
    if (boxEl === observedBoxEl) return
    observedBoxEl = boxEl
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    resizeObserver = null
    mutationObserver = null
    if (!boxEl) return
    // Size changes (content / border / padding).
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => originalUpdate())
      resizeObserver.observe(boxEl)
    }
    // Position/transform (drag, v-drag) + class/hidden for visibility resume.
    // ResizeObserver does not fire for those; without this the SVG (a child of
    // the box) moves with the element while tip math stays stale until the next
    // explicit update.
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(onBoxAttributeMutation)
      mutationObserver.observe(boxEl, {
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden'],
      })
    }
  }

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
      mutationObserver?.disconnect()
      observedBoxEl = null
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onWindowUpdate)
        window.removeEventListener('scroll', onWindowUpdate, true)
      }
    },
  }
}

export type { BubbleTarget }
