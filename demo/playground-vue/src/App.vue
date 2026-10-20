<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { PointingBubble } from 'vue-pointing-bubble'

// Demo 1: hover hints
const actions = [
  { label: 'Download', text: 'Save as PDF.' },
  {
    label: 'Share',
    text:
      'Copy a public link to this article. Anyone with the link can read it without signing in, ' +
      'and it stays valid until you turn off sharing in the article settings or delete the article.'
  },
  {
    label: 'Delete',
    text: 'Move the article to the trash. You can restore it within 30 days.',
    danger: true
  }
]
const hint = ref(null)
const hintAnchor = ref('edge')
let hideTimer = 0

const showHint = (e, action) => {
  clearTimeout(hideTimer)
  hint.value = { el: e.currentTarget, ...action }
}

// A short delay lets the bubble glide to the next button instead of vanishing over the gap.
const hideHint = () => {
  hideTimer = setTimeout(() => (hint.value = null), 150)
}

// Demo 2: guided tour
const steps = [
  { label: 'Bold', text: 'Make the selected text stand out. Shortcut: Ctrl+B.' },
  { label: 'Italic', text: 'Add emphasis to the selection. Shortcut: Ctrl+I.' },
  {
    label: 'Link',
    text: 'Turn the selection into a hyperlink. Paste a URL, or start typing to search your other posts.'
  },
  {
    label: 'Publish',
    text: 'Ready? Your post goes live right away, and subscribers get an email notification.'
  }
]
const intro = {
  label: 'Welcome to the editor',
  text: 'This short tour shows what each toolbar button does. It takes less than a minute.'
}
const stepEls = []
// -1: no tour, 0: the intro (no target), 1..n: the toolbar buttons.
const step = ref(-1)
const tourLength = steps.length + 1
const tourStep = computed(() => (step.value === 0 ? intro : steps[step.value - 1]))
const tourTarget = computed(() => (step.value > 0 ? stepEls[step.value - 1] : null))

// Demo 3: absolute coordinates
const chart = ref(null)
const peak = ref(null)
const point = ref(null)
const pointLabel = ref('')

const pointAt = (x, y, label) => {
  point.value = { x: Math.round(x), y: Math.round(y) }
  pointLabel.value = label
}

const onChartClick = (e) => {
  const rect = chart.value.getBoundingClientRect()
  pointAt(e.clientX - rect.left, e.clientY - rect.top, 'You clicked here')
}

// Demo 4: custom bubble positions
const stage = ref(null)
const parts = reactive({ camera: null, screen: null, trackpad: null })
const LABEL_WIDTH = 170
const labels = reactive([
  { part: 'camera', title: 'Webcam', text: '1080p with a privacy shutter.', pos: { x: 8, y: 8 }, anchor: 'center' },
  { part: 'screen', title: 'Display', text: '14" matte panel, 120 Hz.', pos: { x: 0, y: 70 }, anchor: 'edge' },
  {
    part: 'trackpad',
    title: 'Trackpad',
    text: 'Glass surface with haptic clicks.',
    pos: { x: 8, y: 220 },
    anchor: 'edge'
  }
])
const stageReady = ref(false)
const draggedLabel = ref(null)
let dragOffset = null

const onLabelMove = (e) => {
  draggedLabel.value.pos = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
}

const stopLabelDrag = () => {
  window.removeEventListener('pointermove', onLabelMove)
  draggedLabel.value = null
}

// Keeps the Display label at the right edge of the stage until the user drags it.
const placeRightLabel = () => {
  const label = labels[1]
  if (!label.moved) label.pos.x = stage.value.clientWidth - LABEL_WIDTH - 8
}

const startLabelDrag = (e, label) => {
  e.preventDefault()
  label.moved = true
  draggedLabel.value = label
  dragOffset = { x: e.clientX - label.pos.x, y: e.clientY - label.pos.y }
  window.addEventListener('pointermove', onLabelMove)
  window.addEventListener('pointerup', stopLabelDrag, { once: true })
}

onMounted(() => {
  const c = chart.value.getBoundingClientRect()
  const p = peak.value.getBoundingClientRect()
  pointAt(p.left + p.width / 2 - c.left, p.top + p.height / 2 - c.top, 'Peak: 1,240 visitors')

  placeRightLabel()
  window.addEventListener('resize', placeRightLabel)
  stageReady.value = true
})

onBeforeUnmount(() => window.removeEventListener('resize', placeRightLabel))
</script>

<template>
  <div class="page">
    <header>
      <p class="nav-demos"><strong>Vue demo</strong> · <a href="../react/">React demo</a></p>
      <h1>vue-pointing-bubble</h1>
      <p>
        A Vue 3 callout whose tail points <em>exactly</em> at a DOM element or at absolute (x, y) coordinates.
        <a href="https://github.com/MurzNN/js-pointing-bubble">GitHub</a>
      </p>
    </header>

    <section class="demo">
      <h2>Static and hover hints<span id="hints-title" style="margin-left: 8px" /></h2>
      <p class="hint">
        Hover or focus a button to see what it does. The bubble resizes to fit each hint. The bubble on the right
        is always visible: it uses <code>placement="manual"</code> with <code>right</code> and
        <code>top</code> styles, and finds its target by a CSS selector, <code>target="#hints-title"</code>.
      </p>
      <p class="hint anchor-switch">
        Point the tail at the button's
        <label><input v-model="hintAnchor" type="radio" value="edge"> nearest edge</label>
        <label><input v-model="hintAnchor" type="radio" value="center"> center</label>
        (<code>target-anchor="{{ hintAnchor }}"</code>)
      </p>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis
        dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla. 
        <PointingBubble>A regular inline bubble with default styling</PointingBubble>
        Maecenas
        faucibus mollis interdum, sed posuere consectetur est at lobortis.
      </p>      
      <PointingBubble style="position: absolute; left: 50%; bottom: 100px; transform: translateX(-50%);">An absolutely positioned bubble</PointingBubble>
      <p>
        Cras mattis consectetur purus sit amet fermentum. Vestibulum id ligula porta felis euismod
        semper. Aenean lacinia bibendum nulla sed consectetur.
      </p>
      <div class="row">
        <button
          v-for="action in actions"
          :key="action.label"
          class="btn"
          :class="{ danger: action.danger }"
          @mouseenter="showHint($event, action)"
          @focus="showHint($event, action)"
          @mouseleave="hideHint"
          @blur="hideHint"
        >
          {{ action.label }}
        </button>
      </div>

      <PointingBubble
        target="#hints-title"
        placement="manual"
        style="
          right: 28px;
          top: -64px;
          padding: 16px;
          border: 4px solid #ca8a04;
          border-radius: 12px;
          background: #fef9c3;
        "
        :tail-base-width="14"
        :shadow="false"
      >
        <p class="bubble-title">Always visible, placed manually, pointing to the title</p>
      </PointingBubble>

      <PointingBubble
        v-if="hint"
        :target="hint.el"
        :target-anchor="hintAnchor"
        :max-width="260"
        :tail-length="28"
        :tail-base-width="16"
        :padding="12"
      >
        <p class="bubble-title">{{ hint.label }}</p>
        <p class="bubble-text">{{ hint.text }}</p>
      </PointingBubble>
    </section>

    <section class="demo">
      <h2>Guided tour</h2>
      <p class="hint">
        Walk the user through a toolbar, one button at a time. The first step has no
        <code>target</code>, so it shows just the box as a regular element in the page flow.
      </p>
      <div class="row">
        <button
          v-for="(s, i) in steps"
          :key="s.label"
          :ref="(el) => (stepEls[i] = el)"
          class="btn"
          :class="{ active: step === i + 1 }"
        >
          {{ s.label }}
        </button>
        <button class="btn primary" style="margin-left: auto" @click="step = step < 0 ? 0 : -1">
          {{ step < 0 ? 'Start tour' : 'End tour' }}
        </button>
      </div>

      <!-- The intro step has no target, so it renders right here, in the page flow. -->
      <PointingBubble
        v-if="step >= 0"
        :target="tourTarget"
        target-anchor="edge"
        style="
          margin-top: 16px;
          width: 260px;
          padding: 14px;
          border: 1.5px solid #6366f1;
          background: #eef2ff;
        "
        :tail-length="32"
      >
        <p class="bubble-title">{{ tourStep.label }}</p>
        <p class="bubble-text">{{ tourStep.text }}</p>
        <div class="bubble-actions">
          <span>Step {{ step + 1 }} of {{ tourLength }}</span>
          <span class="row" style="gap: 6px">
            <button class="btn small" :disabled="step === 0" @click="step--">Back</button>
            <button class="btn small primary" @click="step = step < tourLength - 1 ? step + 1 : -1">
              {{ step === 0 ? 'Start' : step < tourLength - 1 ? 'Next' : 'Done' }}
            </button>
          </span>
        </div>
      </PointingBubble>
      <p>
        Nullam quis risus eget urna mollis ornare vel eu leo. Etiam porta sem malesuada magna mollis
        euismod. Curabitur blandit tempus porttitor. Donec sed odio dui, praesent commodo cursus
        magna, vel scelerisque nisl consectetur et.
      </p>
      <p>
        Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Morbi leo risus,
        porta ac consectetur ac, vestibulum at eros. Sed posuere consectetur est at lobortis.
      </p>
    </section>

    <section class="demo">
      <h2>Annotating a picture by coordinates</h2>
      <p class="hint">Click anywhere on the chart. The tip lands on the exact pixel you clicked.</p>
      <p>
        Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa
        justo sit amet risus. Sed posuere consectetur est at lobortis.
      </p>
      <div ref="chart" class="chart" @click="onChartClick">
        <svg viewBox="0 0 600 240" role="img" aria-label="Visitors per month">
          <g stroke="#e2e8f0">
            <line x1="0" y1="40" x2="600" y2="40" />
            <line x1="0" y1="100" x2="600" y2="100" />
            <line x1="0" y1="160" x2="600" y2="160" />
            <line x1="0" y1="220" x2="600" y2="220" />
          </g>
          <polygon
            points="30,190 120,150 210,40 300,120 390,95 480,140 570,70 570,220 30,220"
            fill="#c7d2fe"
            opacity="0.5"
          />
          <polyline
            points="30,190 120,150 210,40 300,120 390,95 480,140 570,70"
            fill="none"
            stroke="#4f46e5"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <g fill="#4f46e5">
            <circle cx="30" cy="190" r="5" />
            <circle cx="120" cy="150" r="5" />
            <circle ref="peak" cx="210" cy="40" r="5" />
            <circle cx="300" cy="120" r="5" />
            <circle cx="390" cy="95" r="5" />
            <circle cx="480" cy="140" r="5" />
            <circle cx="570" cy="70" r="5" />
          </g>
        </svg>

        <PointingBubble
          v-if="point"
          :target="point"
          style="padding: 12px; border: 1.5px solid #1e293b; background: #1e293b"
          :tail-length="30"
          :tail-base-width="14"
          @click.stop
        >
          <p class="bubble-title" style="color: #fff">{{ pointLabel }}</p>
          <p class="bubble-text" style="color: #cbd5e1">x: {{ point?.x }}, y: {{ point?.y }}</p>
        </PointingBubble>
      </div>
    </section>

    <section class="demo">
      <h2>Custom bubble positions</h2>
      <p class="hint">
        With <code>placement="manual"</code>, each label is positioned by its own <code>left</code> and
        <code>top</code> styles, while its tail points at a part of
        the drawing. Drag a label around: the tail moves to whichever side of the box faces its target.
        The Display and Trackpad labels use <code>target-anchor="edge"</code>, so their tails stop at the
        nearest border of the part instead of its center.
      </p>
      <div ref="stage" class="stage">
        <svg class="laptop" viewBox="0 0 280 200" width="280" height="200" aria-label="Laptop">
          <rect x="40" y="10" width="200" height="130" rx="8" fill="#334155" />
          <rect :ref="(el) => (parts.screen = el)" x="50" y="24" width="180" height="106" rx="2" fill="#93c5fd" />
          <circle :ref="(el) => (parts.camera = el)" cx="140" cy="17" r="3" fill="#0f172a" />
          <path d="M20 146 H260 L276 186 H4 Z" fill="#cbd5e1" />
          <rect :ref="(el) => (parts.trackpad = el)" x="115" y="160" width="50" height="18" rx="3" fill="#94a3b8" />
        </svg>

        <PointingBubble
          v-for="label in stageReady ? labels : []"
          :key="label.part"
          class="label-bubble"
          :class="{ dragging: draggedLabel === label }"
          :target="parts[label.part]"
          :target-anchor="label.anchor"
          placement="manual"
          :style="{ left: label.pos.x + 'px', top: label.pos.y + 'px', width: LABEL_WIDTH + 'px' }"
          :tail-base-width="14"
          :transition-duration="draggedLabel === label ? 0 : 200"
          @pointerdown="startLabelDrag($event, label)"
        >
          <p class="bubble-title">{{ label.title }}</p>
          <p class="bubble-text">{{ label.text }}</p>
        </PointingBubble>
      </div>
    </section>

    <section class="demo">
      <h2>Placed with CSS</h2>
      <p class="hint">
        Leave off <code>target</code> and position the component with CSS:
        <code>position: absolute</code> plus <code>left</code> and <code>top</code>,
        inside a parent that has <code>position: relative</code>. A
        <code>translate</code> on it — a click animation, for example — slides the box,
        while <code>left</code> and <code>top</code> stay measured from the same parent
        for the whole animation.
      </p>
      <div class="placed-stage">
        <PointingBubble class="placed-bubble">Placed by CSS</PointingBubble>
      </div>
    </section>

    <footer>
      MIT licensed · <a href="https://github.com/MurzNN/js-pointing-bubble">Source on GitHub</a>
    </footer>
  </div>
</template>
