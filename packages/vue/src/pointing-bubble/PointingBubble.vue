<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  useAttrs,
  watch,
  type ComponentPublicInstance,
  type CSSProperties,
} from 'vue'
import { createBubbleController } from './core'
import type {
  BubbleTarget,
  Placement,
  Point,
  TargetAnchor,
} from './core'

defineOptions({ name: 'PointingBubble', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    target?: BubbleTarget | ComponentPublicInstance | null
    placement?: Placement
    targetAnchor?: TargetAnchor
    maxWidth?: number
    tailLength?: number
    tailBaseWidth?: number
    padding?: number | string
    shadow?: boolean
    transitionDuration?: number
  }>(),
  {
    target: null,
    placement: 'auto',
    targetAnchor: 'center',
    maxWidth: undefined,
    tailLength: 45,
    tailBaseWidth: 24,
    padding: 8,
    shadow: true,
    transitionDuration: 200,
  },
)

const attrs = useAttrs()
const fallthroughClass = computed(() => attrs.class)
const fallthroughStyle = computed(() => attrs.style as CSSProperties | undefined)
const restAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs as Record<
    string,
    unknown
  >
  return rest
})

const rootRef = ref<HTMLElement | null>(null)

const render = reactive({
  hasTarget: false,
  placement: 'none' as 'none' | string,
  tip: null as Point | null,
  slotTip: null as Point | null,
  boxStyle: {} as Record<string, string | number | undefined>,
  svgStyle: {} as Record<string, string | number | undefined>,
  tail: null as { fill: string; stroke: string | null } | null,
  boxFill: '',
  boxStroke: '',
  boxStrokeWidth: 0,
  boxZIndex: 'auto',
})

function unwrapTarget(
  target: typeof props.target,
): BubbleTarget {
  if (target == null) return null
  if (typeof target === 'string') return target
  if (typeof Element !== 'undefined' && target instanceof Element) return target
  if (
    typeof target === 'object' &&
    '$el' in target &&
    (target as ComponentPublicInstance).$el instanceof Element
  ) {
    return (target as ComponentPublicInstance).$el as Element
  }
  if (
    typeof target === 'object' &&
    typeof (target as Point).x === 'number' &&
    typeof (target as Point).y === 'number'
  ) {
    return target as Point
  }
  return null
}

const instance = getCurrentInstance()
const controller = createBubbleController({
  getBoxEl: () => rootRef.value,
  onChange: (state) => {
    Object.assign(render, state)
    // Hosts like Slidev (async slides + directives) can leave the render
    // effect idle after layout-driven controller updates; flush explicitly.
    instance?.update()
  },
})

function syncConfig() {
  controller.setConfig({
    target: unwrapTarget(props.target),
    placement: props.placement,
    targetAnchor: props.targetAnchor,
    maxWidth: props.maxWidth,
    tailLength: props.tailLength,
    tailBaseWidth: props.tailBaseWidth,
    padding: props.padding,
    shadow: props.shadow,
    transitionDuration: props.transitionDuration,
  })
}

watch(
  () => [
    props.target,
    typeof props.target === 'object' &&
    props.target &&
    'x' in props.target
      ? (props.target as Point).x
      : null,
    typeof props.target === 'object' &&
    props.target &&
    'y' in props.target
      ? (props.target as Point).y
      : null,
    props.placement,
    props.targetAnchor,
    props.maxWidth,
    props.tailLength,
    props.tailBaseWidth,
    props.padding,
    props.shadow,
    props.transitionDuration,
  ],
  syncConfig,
  { flush: 'post' },
)

onMounted(() => {
  syncConfig()
})

onBeforeUnmount(() => {
  controller.destroy()
})

function update() {
  controller.update()
}

defineExpose({ update })

// Controller styles last so open-side border overrides (user `border`
// shorthand would otherwise redraw the attachment wall and leave a seam).
const rootStyle = computed(
  () =>
    ({
      ...fallthroughStyle.value,
      ...render.boxStyle,
    }) as CSSProperties,
)

const svgStyle = computed(() => render.svgStyle as CSSProperties)
</script>

<template>
  <div
    ref="rootRef"
    :class="['pointing-bubble', 'pointing-bubble__inner', fallthroughClass]"
    :data-placement="render.placement"
    v-bind="restAttrs"
    :style="rootStyle"
  >
    <slot :placement="render.placement" :tip="render.slotTip">
      <p
        :style="{
          margin: 0,
          fontSize: '14px',
          fontWeight: 600,
          color: '#1e293b',
        }"
      >
        Callout content
      </p>
    </slot>
    <svg
      v-if="target && render.tail"
      class="pointing-bubble__svg"
      :style="svgStyle"
    >
      <path
        class="pointing-bubble__path"
        :d="render.tail.fill"
        :fill="render.boxFill"
      />
      <path
        v-if="render.tail.stroke"
        class="pointing-bubble__path"
        :d="render.tail.stroke"
        fill="none"
        :stroke="render.boxStroke"
        :stroke-width="render.boxStrokeWidth"
        stroke-linejoin="round"
        stroke-linecap="butt"
      />
    </svg>
  </div>
</template>
