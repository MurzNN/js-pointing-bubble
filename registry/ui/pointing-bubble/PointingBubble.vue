<script>
// Default look of the box. `:where()` has zero specificity, so any class or style set on the component wins.
const CSS = `:where(.vue-pointing-bubble__inner) {
  box-sizing: border-box;
  width: var(--vpb-width, max-content);
  max-width: var(--vpb-max-width, none);
  padding: var(--vpb-padding);
  background: white;
  border: 2px solid gray;
  border-radius: 8px;
}`
const SHADOW = 'drop-shadow(0 6px 8px rgba(0, 0, 0, 0.25))'
// In manual mode CSS owns the box, so only the tail glides.
const ANIMATED_KEYS = ['tx', 'ty', 'bx', 'by']
const MANUAL_ANIMATED_KEYS = ['tx', 'ty']

const injectStyles = () => {
  if (typeof document === 'undefined' || document.getElementById('vue-pointing-bubble-styles')) return
  const style = document.createElement('style')
  style.id = 'vue-pointing-bubble-styles'
  style.textContent = CSS
  document.head.prepend(style)
}
</script>

<script setup>
/**
 * Precision Vue 3 callout ("pointing bubble") component.
 * The box is a regular element styled with CSS; an SVG tail is drawn from its wall,
 * so the tip lands exactly on the target coordinate (x, y) or on a target element.
 * Without a target, only the box is rendered, in the normal document flow.
 */
import { ref, computed, watch, onMounted, onUpdated, onBeforeUnmount } from 'vue'

// `class`, `style`, and listeners go to the box, not to the full-size overlay.
defineOptions({ inheritAttrs: false })

const props = defineProps({
  // DOM element, component instance, CSS selector, or { x, y } relative to the positioned parent.
  target: {
    type: [Object, String, typeof Element !== 'undefined' ? Element : Object],
    default: null
  },
  // 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'manual'
  // In 'manual' mode the box is positioned by CSS (left/top) on the component.
  placement: {
    type: String,
    default: 'auto',
    validator: (v) => ['auto', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'manual'].includes(v)
  },
  // For element targets: 'center' points at the element's center, 'edge' at its border facing the box.
  targetAnchor: {
    type: String,
    default: 'center',
    validator: (v) => ['center', 'edge'].includes(v)
  },
  // Content wraps at this width (px) unless CSS on the component sets a width or max-width.
  // By default the box is limited by the room between the tail and the edge of the parent
  // or the viewport; without a target, only by its parent.
  maxWidth: { type: Number, default: undefined },
  // Distance from the box edge to the tip.
  tailLength: { type: Number, default: 45 },
  // Width of the tail where it attaches to the box.
  tailBaseWidth: { type: Number, default: 24 },
  // Used unless CSS on the component sets a padding.
  padding: { type: [Number, String], default: 8 },
  shadow: { type: Boolean, default: true },
  // Duration in ms of the move animation when the target changes; 0 disables it.
  transitionDuration: { type: Number, default: 200 }
})

injectStyles()

const rootRef = ref(null)
const boxRef = ref(null)
const tip = ref(null)
// Target element rect relative to the root; null for coordinate targets.
const targetRect = ref(null)
// Size and look of the box, read from the rendered element.
const box = ref(null)
// Viewport origin, local size, cumulative scale, and the viewport size.
const frameRect = ref({ left: 0, top: 0, width: 0, height: 0, scaleX: 1, scaleY: 1, viewportWidth: 0, viewportHeight: 0 })
const manual = computed(() => props.placement === 'manual')

const sameKeys = (a, b) => !!a && !!b && Object.keys(a).every((k) => a[k] === b[k])

const resolveElement = (t) => {
  if (typeof Element === 'undefined' || !t) return null
  // Looked up on every update, so an element that appears later is found too.
  if (typeof t === 'string') return document.querySelector(t)
  if (t instanceof Element) return t
  if (t.$el instanceof Element) return t.$el
  return null
}

const update = () => {
  const root = rootRef.value
  if (!props.target || !root) {
    tip.value = null
    return
  }

  const rootRect = root.getBoundingClientRect()
  // getBoundingClientRect is in viewport pixels, after ancestor transforms such as
  // Slidev's scale(). left/top and the SVG path are in the root's local CSS pixels.
  // The computed size keeps fractions that offsetWidth/offsetHeight round away.
  const rootStyle = getComputedStyle(root)
  const width = parseFloat(rootStyle.width) || 0
  const height = parseFloat(rootStyle.height) || 0
  const scaleX = width ? rootRect.width / width : 1
  const scaleY = height ? rootRect.height / height : 1
  frameRect.value = {
    left: rootRect.left,
    top: rootRect.top,
    width,
    height,
    scaleX,
    scaleY,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  }

  const el = resolveElement(props.target)
  if (el) {
    const r = el.getBoundingClientRect()
    const rect = {
      left: (r.left - rootRect.left) / scaleX,
      top: (r.top - rootRect.top) / scaleY,
      right: (r.right - rootRect.left) / scaleX,
      bottom: (r.bottom - rootRect.top) / scaleY
    }
    if (!sameKeys(rect, targetRect.value)) targetRect.value = rect
    tip.value = { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
  } else if (typeof props.target.x === 'number' && typeof props.target.y === 'number') {
    targetRect.value = null
    tip.value = { x: props.target.x, y: props.target.y }
  } else {
    // A selector that matches nothing (yet): the bubble stays hidden.
    targetRect.value = null
    tip.value = null
  }
  measure()
}

watch(() => [props.target, props.target?.x, props.target?.y], update, { flush: 'post' })

const measure = () => {
  const el = boxRef.value
  if (!el || !props.target) return
  const s = getComputedStyle(el)
  // offsetLeft/offsetWidth round to whole pixels, which shows as a step where a thick border
  // meets the tail, so the box is measured from its rect, converted to the root's local pixels.
  const { scaleX, scaleY } = frameRect.value
  const r = el.getBoundingClientRect()
  const rootRect = rootRef.value.getBoundingClientRect()
  const next = {
    // The position only matters in manual mode, where CSS places the box.
    x: manual.value ? (r.left - rootRect.left) / scaleX : 0,
    y: manual.value ? (r.top - rootRect.top) / scaleY : 0,
    width: r.width / scaleX,
    height: r.height / scaleY,
    fill: s.backgroundColor,
    stroke: s.borderTopColor,
    strokeWidth: parseFloat(s.borderTopWidth) || 0,
    radius: s.borderTopLeftRadius,
    zIndex: s.zIndex
  }
  if (!sameKeys(next, box.value)) box.value = next
}

// Catches changes of the component's class/style, which are not reactive in the script.
onUpdated(measure)

// Local px between the end of the tail and the edge of the root, or of the viewport if nearer,
// on each side of the tip. It doesn't depend on the box size, so the box can be capped by it.
const room = computed(() => {
  if (!tip.value) return null
  const f = frameRect.value
  const reach = tip.value.x - props.tailLength
  let left = reach
  let right = f.width ? f.width - tip.value.x - props.tailLength : Infinity
  if (f.viewportWidth) {
    left = Math.min(left, f.left / f.scaleX + reach)
    right = Math.min(right, (f.viewportWidth - f.left) / f.scaleX - tip.value.x - props.tailLength)
  }
  return { left: Math.max(0, left), right: Math.max(0, right) }
})

const roomierSide = () => (room.value.left > room.value.right ? 'left' : 'right')

// Where the bubble should end up for the current tip, box size, and props.
const geometry = computed(() => {
  const m = box.value
  if (!tip.value || !m?.width || !m?.height) return null
  const { width: w, height: h } = m
  const { x: tx, y: ty } = tip.value
  const tLen = props.tailLength
  const f = frameRect.value
  const rect = props.targetAnchor === 'edge' ? targetRect.value : null

  if (manual.value) {
    if (rect) {
      // The point of the element's border nearest to the box center, unless that center is over the element.
      const cx = m.x + w / 2
      const cy = m.y + h / 2
      const inside = cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom
      if (!inside) {
        const ex = Math.min(rect.right, Math.max(rect.left, cx))
        const ey = Math.min(rect.bottom, Math.max(rect.top, cy))
        return { placement: 'manual', tx: ex, ty: ey, bx: m.x, by: m.y, w, h }
      }
    }
    return { placement: 'manual', tx, ty, bx: m.x, by: m.y, w, h }
  }

  // With the edge anchor the tip moves to the middle of the element's top or bottom edge, facing the box.
  const tipYFor = (vertical) => (rect ? (vertical === 'top' ? rect.top : rect.bottom) : ty)

  let placement = props.placement
  if (placement === 'auto') {
    let vertical = ty > (f.height || 600) / 2 ? 'top' : 'bottom'
    let horizontal = roomierSide()

    // Flip to the other side if the bubble would leave the viewport and fits there.
    // Tip, box, and tail are local pixels; multiply by the scale to reach the viewport.
    const { scaleX: sx, scaleY: sy } = f
    if (f.viewportHeight) {
      const fitsAbove = f.top + (tipYFor('top') - h - tLen) * sy >= 0
      const fitsBelow = f.top + (tipYFor('bottom') + h + tLen) * sy <= f.viewportHeight
      if (vertical === 'top' && !fitsAbove && fitsBelow) vertical = 'bottom'
      else if (vertical === 'bottom' && !fitsBelow && fitsAbove) vertical = 'top'
    }
    if (f.viewportWidth) {
      const fitsLeft = f.left + (tx - w - tLen) * sx >= 0
      const fitsRight = f.left + (tx + w + tLen) * sx <= f.viewportWidth
      if (horizontal === 'left' && !fitsLeft && fitsRight) horizontal = 'right'
      else if (horizontal === 'right' && !fitsRight && fitsLeft) horizontal = 'left'
    }

    placement = `${vertical}-${horizontal}`
  }

  const [vertical, horizontal] = placement.split('-')
  const tipY = tipYFor(vertical)
  return {
    placement,
    tx,
    ty: tipY,
    bx: horizontal === 'left' ? tx - w - tLen : tx + tLen,
    by: vertical === 'top' ? tipY - h - tLen : tipY + tLen,
    w,
    h
  }
})

// What is rendered right now; eases towards `geometry` so the tail and the box move together.
const current = ref(null)
let frame = 0

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

watch(geometry, (to) => {
  if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
  const from = current.value
  const duration = props.transitionDuration
  if (!to || !from || duration <= 0 || typeof requestAnimationFrame === 'undefined' || prefersReducedMotion()) {
    current.value = to
    return
  }

  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    const next = { ...to }
    const keys = to.placement === 'manual' ? MANUAL_ANIMATED_KEYS : ANIMATED_KEYS
    for (const key of keys) next[key] = from[key] + (to[key] - from[key]) * eased
    current.value = next
    if (t < 1) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}, { immediate: true })

let resizeObserver = null

onMounted(() => {
  window.addEventListener('resize', update)
  window.addEventListener('scroll', update, true)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(rootRef.value)
    resizeObserver.observe(boxRef.value)
  }
  update()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', update)
  window.removeEventListener('scroll', update, true)
  resizeObserver?.disconnect()
  if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
})

// The tail: a triangle from the box wall facing the tip.
// The fill runs a pixel past the inner edge of the border, so it covers the border where the
// tail attaches even when page zoom snaps that edge to a different pixel.
const tail = computed(() => {
  const c = current.value
  if (!c) return null
  const { placement, tx, ty, bx, by, w, h } = c
  const bw = box.value.strokeWidth
  const radius = box.value.radius
  const r = parseFloat(radius) * (radius.endsWith('%') ? Math.min(w, h) / 100 : 1) || 0
  const half = props.tailBaseWidth / 2
  const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))

  let side = null
  let along = 0
  if (placement === 'manual') {
    const dx = Math.max(bx - tx, tx - (bx + w), 0)
    const dy = Math.max(by - ty, ty - (by + h), 0)
    if (dx > 0 && dx >= dy) {
      side = tx < bx ? 'left' : 'right'
      along = ty
    } else if (dy > 0) {
      side = ty < by ? 'top' : 'bottom'
      along = tx
    } else {
      return null
    }
  } else {
    const [vertical, horizontal] = placement.split('-')
    side = horizontal === 'left' ? 'right' : 'left'
    along = by + h * (vertical === 'top' ? 0.65 : 0.35)
  }

  // One pixel past the inner edge. The fill matches the background, so this overlap is
  // invisible, but it covers the border when page zoom snaps that edge off the path.
  const cover = 1
  const horizontalWall = side === 'top' || side === 'bottom'
  // A point `along` the wall and `depth` px outwards from its outer edge (negative is inside the box).
  const at = {
    left: (a, depth) => [bx - depth, a],
    right: (a, depth) => [bx + w + depth, a],
    top: (a, depth) => [a, by - depth],
    bottom: (a, depth) => [a, by + h + depth]
  }[side]
  const tipDepth = { left: bx - tx, right: tx - bx - w, top: by - ty, bottom: ty - by - h }[side]
  // The stroke is centered on the path, so it spans bw / 2 on each side of the base points.
  const a = horizontalWall
    ? clamp(along, bx + r + half + bw / 2, bx + w - r - half - bw / 2)
    : clamp(along, by + r + half + bw / 2, by + h - r - half - bw / 2)
  // Each side of the tail leaves the wall at a right angle, so its butt cap lies flat on the
  // border's inner edge, then bends over `bend` px into the straight line to the tip.
  const bend = Math.max(0, Math.min(bw, tipDepth / 2))
  const point = ([x, y]) => `${x} ${y}`
  const edge = (base, innerDepth) => {
    const ctrl = at(base, bend)
    const dist = Math.hypot(tx - ctrl[0], ty - ctrl[1]) || 1
    const end = [ctrl[0] + ((tx - ctrl[0]) * bend) / dist, ctrl[1] + ((ty - ctrl[1]) * bend) / dist]
    return { inner: point(at(base, innerDepth)), outer: point(at(base, 0)), ctrl: point(ctrl), end: point(end) }
  }
  const tail = (innerDepth) => {
    const s1 = edge(a - half, innerDepth)
    const s2 = edge(a + half, innerDepth)
    return (
      `M ${s1.inner} L ${s1.outer} Q ${s1.ctrl} ${s1.end} L ${tx} ${ty} ` +
      `L ${s2.end} Q ${s2.ctrl} ${s2.outer} L ${s2.inner}`
    )
  }
  return {
    fill: tail(-bw - cover) + ' Z',
    stroke: bw ? tail(-bw) : null
  }
})

const placement = computed(() => (props.target ? current.value?.placement : 'none'))

// The full-size overlay that the box and the tail are positioned in; only used with a target.
const overlayStyle = computed(() => {
  const style = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    filter: props.shadow ? SHADOW : undefined
  }
  // Only an explicit z-index on the box is copied here; otherwise stacking stays at auto.
  const z = box.value?.zIndex
  if (z && z !== 'auto') style.zIndex = z
  return style
})

// Keys are only added when set: merged with the user's `style`, even an undefined key would win.
const boxStyle = computed(() => {
  const style = {
    '--vpb-padding': typeof props.padding === 'number' ? `${props.padding}px` : props.padding
  }
  if (props.maxWidth != null) style['--vpb-max-width'] = props.maxWidth + 'px'
  if (!props.target) {
    // In the flow the box shrinks to its content but never overflows its parent.
    style['--vpb-width'] = 'fit-content'
    if (props.shadow) style.filter = SHADOW
    return style
  }
  const c = current.value
  Object.assign(style, { position: 'absolute', pointerEvents: 'auto', visibility: c ? 'visible' : 'hidden' })
  if (manual.value) {
    // Positioned by its own CSS, the box wraps where it reaches the edge of the parent.
    style['--vpb-width'] = 'fit-content'
    return style
  }
  // Next to the tip, ignoring margins, and no wider than the room on its side.
  Object.assign(style, { left: (c?.bx ?? 0) + 'px', top: (c?.by ?? 0) + 'px', margin: 0 })
  if (props.maxWidth == null && room.value) {
    const placed = geometry.value?.placement ?? props.placement
    const side = placed === 'auto' ? roomierSide() : placed.split('-')[1]
    style['--vpb-max-width'] = room.value[side] + 'px'
  }
  return style
})

defineExpose({ update })
</script>

<template>
  <!--
    Without a target the root is the box itself: it takes the class, style, and listeners, so it is
    exactly the size of the bubble, and opacity or transforms set on the component apply to it directly.
    The inner element then generates no box of its own.
  -->
  <div
    ref="rootRef"
    :class="['vue-pointing-bubble', { 'vue-pointing-bubble__inner': !target }]"
    :data-placement="placement"
    v-bind="target ? {} : $attrs"
    :style="target ? overlayStyle : boxStyle"
  >
    <div
      ref="boxRef"
      :class="{ 'vue-pointing-bubble__inner': target }"
      v-bind="target ? $attrs : {}"
      :style="target ? boxStyle : { display: 'contents' }"
    >
      <slot :placement="placement" :tip="geometry ? { x: geometry.tx, y: geometry.ty } : tip">
        <p :style="{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }">Callout content</p>
      </slot>
    </div>
    <svg
      v-if="target && tail"
      class="vue-pointing-bubble__svg"
      :style="{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: box?.zIndex }"
    >
      <path class="vue-pointing-bubble__path" :d="tail.fill" :fill="box.fill" />
      <path
        v-if="tail.stroke"
        class="vue-pointing-bubble__path"
        :d="tail.stroke"
        fill="none"
        :stroke="box.stroke"
        :stroke-width="box.strokeWidth"
        stroke-linejoin="round"
        stroke-linecap="butt"
      />
    </svg>
  </div>
</template>
