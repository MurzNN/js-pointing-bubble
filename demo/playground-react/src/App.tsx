import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { PointingBubble } from 'react-pointing-bubble'

const tourSteps = [
  { label: 'Bold', text: 'Make the selected text stand out. Shortcut: Ctrl+B.' },
  { label: 'Italic', text: 'Add emphasis to the selection. Shortcut: Ctrl+I.' },
  {
    label: 'Link',
    text: 'Turn the selection into a hyperlink. Paste a URL, or start typing to search your other posts.',
  },
  {
    label: 'Publish',
    text: 'Ready? Your post goes live right away, and subscribers get an email notification.',
  },
]
const tourIntro = {
  label: 'Welcome to the editor',
  text: 'This short tour shows what each toolbar button does. It takes less than a minute.',
}

type Part = 'camera' | 'screen' | 'trackpad'
type CustomLabel = {
  part: Part
  title: string
  text: string
  pos: { x: number; y: number }
  anchor: 'center' | 'edge'
  moved?: boolean
}

const initialLabels: CustomLabel[] = [
  { part: 'camera', title: 'Webcam', text: '1080p with a privacy shutter.', pos: { x: 8, y: 8 }, anchor: 'center' },
  { part: 'screen', title: 'Display', text: '14" matte panel, 120 Hz.', pos: { x: 0, y: 70 }, anchor: 'edge' },
  {
    part: 'trackpad',
    title: 'Trackpad',
    text: 'Glass surface with haptic clicks.',
    pos: { x: 8, y: 220 },
    anchor: 'edge',
  },
]

const actions = [
  { label: 'Download', text: 'Save as PDF.' },
  {
    label: 'Share',
    text: 'Copy a public link to this article.',
  },
  {
    label: 'Delete',
    text: 'Move the article to the trash.',
    danger: true,
  },
]

export default function App() {
  const [hint, setHint] = useState<{
    el: Element
    label: string
    text: string
  } | null>(null)
  const [hintAnchor, setHintAnchor] = useState<'edge' | 'center'>('edge')
  const hideTimer = useRef(0)
  const [tourStep, setTourStep] = useState(-1)
  const tourRefs = useRef<Array<HTMLButtonElement | null>>([])

  const showHint = (el: Element, action: (typeof actions)[number]) => {
    window.clearTimeout(hideTimer.current)
    setHint({ el, label: action.label, text: action.text })
  }
  const hideHint = () => {
    hideTimer.current = window.setTimeout(() => setHint(null), 150)
  }

  const chartRef = useRef<HTMLDivElement | null>(null)
  const peakRef = useRef<SVGCircleElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const parts = useRef<Record<Part, SVGElement | null>>({
    camera: null,
    screen: null,
    trackpad: null,
  })
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [pointLabel, setPointLabel] = useState('')
  const [labels, setLabels] = useState(initialLabels)
  const [stageReady, setStageReady] = useState(false)
  const [draggedPart, setDraggedPart] = useState<Part | null>(null)
  const dragOffset = useRef<{ part: Part; x: number; y: number } | null>(null)

  const pointAt = useCallback((x: number, y: number, label: string) => {
    setPoint({ x: Math.round(x), y: Math.round(y) })
    setPointLabel(label)
  }, [])

  const onLabelMove = useCallback((event: PointerEvent) => {
    const stage = stageRef.current
    const drag = dragOffset.current
    if (!stage || !drag) return
    const rect = stage.getBoundingClientRect()
    setLabels((current) =>
      current.map((label) =>
        label.part === drag.part
          ? {
              ...label,
              moved: true,
              pos: {
                x: event.clientX - rect.left - drag.x,
                y: event.clientY - rect.top - drag.y,
              },
            }
          : label,
      ),
    )
  }, [])

  const stopLabelDrag = useCallback(() => {
    window.removeEventListener('pointermove', onLabelMove)
    dragOffset.current = null
    setDraggedPart(null)
  }, [onLabelMove])

  const startLabelDrag = (
    event: ReactPointerEvent<HTMLElement>,
    label: CustomLabel,
  ) => {
    const stage = stageRef.current
    if (!stage) return
    event.preventDefault()
    const rect = stage.getBoundingClientRect()
    dragOffset.current = {
      part: label.part,
      x: event.clientX - rect.left - label.pos.x,
      y: event.clientY - rect.top - label.pos.y,
    }
    setDraggedPart(label.part)
    window.addEventListener('pointermove', onLabelMove)
    window.addEventListener('pointerup', stopLabelDrag, { once: true })
  }

  useEffect(() => {
    const chart = chartRef.current
    const peak = peakRef.current
    if (!chart || !peak) return
    const c = chart.getBoundingClientRect()
    const p = peak.getBoundingClientRect()
    pointAt(
      p.left + p.width / 2 - c.left,
      p.top + p.height / 2 - c.top,
      'Peak: 1,240 visitors',
    )
  }, [pointAt])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const placeRightLabel = () => {
      const rect = stage.getBoundingClientRect()
      setLabels((current) =>
        current.map((label) =>
          label.part === 'screen' && !label.moved
            ? { ...label, pos: { ...label.pos, x: rect.width - 170 - 8 } }
            : label,
        ),
      )
    }
    placeRightLabel()
    setStageReady(true)
    window.addEventListener('resize', placeRightLabel)
    return () => {
      window.removeEventListener('resize', placeRightLabel)
      window.removeEventListener('pointermove', onLabelMove)
      window.removeEventListener('pointerup', stopLabelDrag)
    }
  }, [onLabelMove, stopLabelDrag])

  return (
    <div className="page">
      <header>
        <p className="nav-demos">
          <a href="../vue/">Vue demo</a> · <strong>React demo</strong>
        </p>
        <h1>react-pointing-bubble</h1>
        <p>
          A React callout whose tail points <em>exactly</em> at a DOM element or
          at absolute (x, y) coordinates.{' '}
          <a href="https://github.com/MurzNN/js-pointing-bubble">GitHub</a>
        </p>
      </header>

      <section className="demo">
        <h2>
          Static and hover hints
          <span id="hints-title" style={{ marginLeft: 8 }} />
        </h2>
        <p className="hint">
          Hover a button. The bubble on the right uses{' '}
          <code>placement=&quot;manual&quot;</code> and{' '}
          <code>target=&quot;#hints-title&quot;</code>.
        </p>
        <p className="hint anchor-switch">
          Point at the button&apos;s{' '}
          <label>
            <input
              type="radio"
              checked={hintAnchor === 'edge'}
              onChange={() => setHintAnchor('edge')}
            />{' '}
            nearest edge
          </label>{' '}
          <label>
            <input
              type="radio"
              checked={hintAnchor === 'center'}
              onChange={() => setHintAnchor('center')}
            />{' '}
            center
          </label>
        </p>
        <p>
          Inline bubble:{' '}
          <PointingBubble>A regular inline bubble</PointingBubble>
        </p>
        <div className="row">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`btn${action.danger ? ' danger' : ''}`}
              onMouseEnter={(e) => showHint(e.currentTarget, action)}
              onFocus={(e) => showHint(e.currentTarget, action)}
              onMouseLeave={hideHint}
              onBlur={hideHint}
            >
              {action.label}
            </button>
          ))}
        </div>

        <PointingBubble
          target="#hints-title"
          placement="manual"
          style={{
            right: 28,
            top: -64,
            padding: 16,
            border: '4px solid #ca8a04',
            borderRadius: 12,
            background: '#fef9c3',
          }}
          tailBaseWidth={14}
          shadow={false}
        >
          <p className="bubble-title">Always visible, placed manually</p>
        </PointingBubble>

        {hint ? (
          <PointingBubble
            target={hint.el}
            targetAnchor={hintAnchor}
            maxWidth={260}
            tailLength={28}
            tailBaseWidth={16}
            padding={12}
          >
            <p className="bubble-title">{hint.label}</p>
            <p className="bubble-text">{hint.text}</p>
          </PointingBubble>
        ) : null}
      </section>

      <section className="demo">
        <h2>Target inside CSS zoom</h2>
        <p className="hint">
          The target is rendered at 70% zoom while the bubble stays at normal
          scale. Its tail still lands on the target center, even with a thick
          border.
        </p>
        <div className="zoom-stage">
          <div className="zoomed-content">
            <button id="zoom-target" type="button" className="btn primary">
              Zoomed target
            </button>
          </div>
          <PointingBubble
            id="zoom-bubble"
            target="#zoom-target"
            placement="manual"
            style={{
              position: 'absolute',
              left: 24,
              top: 68,
              width: 220,
              padding: '12px 14px',
              border: '12px solid #6b7280',
              borderRadius: 10,
              background: '#fff',
            }}
            targetAnchor="center"
            tailBaseWidth={28}
            tailLength={26}
          >
            {({ tip }) => (
              <>
                <p className="bubble-title">Thick border callout</p>
                <p
                  className="bubble-text"
                  data-zoom-tip
                  data-tip-x={tip?.x}
                  data-tip-y={tip?.y}
                >
                  Tip: {tip ? `${Math.round(tip.x)}, ${Math.round(tip.y)}` : 'measuring…'}
                </p>
              </>
            )}
          </PointingBubble>
        </div>
      </section>

      <section className="demo">
        <h2>Guided tour</h2>
        <p className="hint">
          Walk the user through a toolbar, one button at a time. The first step
          has no <code>target</code>, so it shows just the box as a regular
          element in the page flow.
        </p>
        <div className="row">
          {tourSteps.map((step, index) => (
            <button
              key={step.label}
              ref={(element) => {
                tourRefs.current[index] = element
              }}
              type="button"
              className={`btn${tourStep === index + 1 ? ' active' : ''}`}
            >
              {step.label}
            </button>
          ))}
          <button
            type="button"
            className="btn primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => setTourStep((current) => (current < 0 ? 0 : -1))}
          >
            {tourStep < 0 ? 'Start tour' : 'End tour'}
          </button>
        </div>
        {tourStep >= 0 ? (
          <PointingBubble
            target={tourStep > 0 ? (tourRefs.current[tourStep - 1] ?? null) : null}
            targetAnchor="edge"
            style={{
              marginTop: 16,
              width: 260,
              padding: 14,
              border: '1.5px solid #6366f1',
              background: '#eef2ff',
            }}
            tailLength={32}
          >
            <p className="bubble-title">
              {tourStep === 0 ? tourIntro.label : tourSteps[tourStep - 1].label}
            </p>
            <p className="bubble-text">
              {tourStep === 0 ? tourIntro.text : tourSteps[tourStep - 1].text}
            </p>
            <div className="bubble-actions">
              <span>
                Step {tourStep + 1} of {tourSteps.length + 1}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn small"
                  disabled={tourStep === 0}
                  onClick={() => setTourStep((current) => current - 1)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn small primary"
                  onClick={() =>
                    setTourStep((current) =>
                      current < tourSteps.length ? current + 1 : -1,
                    )
                  }
                >
                  {tourStep === 0
                    ? 'Start'
                    : tourStep < tourSteps.length
                      ? 'Next'
                      : 'Done'}
                </button>
              </span>
            </div>
          </PointingBubble>
        ) : null}
        <p>
          Nullam quis risus eget urna mollis ornare vel eu leo. Etiam porta sem
          malesuada magna mollis euismod. Curabitur blandit tempus porttitor.
          Donec sed odio dui, praesent commodo cursus magna, vel scelerisque
          nisl consectetur et.
        </p>
        <p>
          Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.
          Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Sed
          posuere consectetur est at lobortis.
        </p>
      </section>

      <section className="demo">
        <h2>Annotating a picture by coordinates</h2>
        <p className="hint">
          Click anywhere on the chart. The tip lands on the exact pixel you
          clicked.
        </p>
        <p>
          Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum
          nibh, ut fermentum massa justo sit amet risus. Sed posuere consectetur
          est at lobortis.
        </p>
        <div
          ref={chartRef}
          className="chart"
          onClick={(e) => {
            const rect = chartRef.current!.getBoundingClientRect()
            pointAt(
              e.clientX - rect.left,
              e.clientY - rect.top,
              'You clicked here',
            )
          }}
        >
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
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <g fill="#4f46e5">
              <circle cx="30" cy="190" r="5" />
              <circle cx="120" cy="150" r="5" />
              <circle ref={peakRef} cx="210" cy="40" r="5" />
              <circle cx="300" cy="120" r="5" />
              <circle cx="390" cy="95" r="5" />
              <circle cx="480" cy="140" r="5" />
              <circle cx="570" cy="70" r="5" />
            </g>
          </svg>
          {point ? (
            <PointingBubble
              target={point}
              style={{
                padding: 12,
                border: '1.5px solid #1e293b',
                background: '#1e293b',
              }}
              tailLength={30}
              tailBaseWidth={14}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="bubble-title" style={{ color: '#fff' }}>
                {pointLabel}
              </p>
              <p className="bubble-text" style={{ color: '#cbd5e1' }}>
                x: {point.x}, y: {point.y}
              </p>
            </PointingBubble>
          ) : null}
        </div>
      </section>

      <section className="demo">
        <h2>Custom bubble positions</h2>
        <p className="hint">
          With <code>placement=&quot;manual&quot;</code>, each label is positioned
          by its own <code>left</code> and <code>top</code> styles, while its
          tail points at a part of the drawing. Drag a label around: the tail
          moves to whichever side of the box faces its target. The Display and
          Trackpad labels use <code>target-anchor=&quot;edge&quot;</code>, so
          their tails stop at the nearest border of the part instead of its
          center.
        </p>
        <div ref={stageRef} className="stage">
          <svg
            className="laptop"
            viewBox="0 0 280 200"
            width="280"
            height="200"
            aria-label="Laptop"
          >
            <rect x="40" y="10" width="200" height="130" rx="8" fill="#334155" />
            <rect
              ref={(element) => {
                parts.current.screen = element
              }}
              x="50"
              y="24"
              width="180"
              height="106"
              rx="2"
              fill="#93c5fd"
            />
            <circle
              ref={(element) => {
                parts.current.camera = element
              }}
              cx="140"
              cy="17"
              r="3"
              fill="#0f172a"
            />
            <path d="M20 146 H260 L276 186 H4 Z" fill="#cbd5e1" />
            <rect
              ref={(element) => {
                parts.current.trackpad = element
              }}
              x="115"
              y="160"
              width="50"
              height="18"
              rx="3"
              fill="#94a3b8"
            />
          </svg>
          {stageReady
            ? labels.map((label) => (
                <PointingBubble
                  key={label.part}
                  className={`label-bubble${draggedPart === label.part ? ' dragging' : ''}`}
                  target={parts.current[label.part]}
                  targetAnchor={label.anchor}
                  placement="manual"
                  style={{
                    left: `${label.pos.x}px`,
                    top: `${label.pos.y}px`,
                    width: 170,
                  }}
                  tailBaseWidth={14}
                  transitionDuration={draggedPart === label.part ? 0 : 200}
                  onPointerDown={(event) => startLabelDrag(event, label)}
                >
                  <p className="bubble-title">{label.title}</p>
                  <p className="bubble-text">{label.text}</p>
                </PointingBubble>
              ))
            : null}
        </div>
      </section>

      <section className="demo">
        <h2>Placed with CSS</h2>
        <p className="hint">
          Leave off <code>target</code> and position the component with CSS:
          <code>position: absolute</code> plus <code>left</code> and{' '}
          <code>top</code>, inside a parent that has{' '}
          <code>position: relative</code>. A <code>translate</code> on it — a
          click animation, for example — slides the box, while <code>left</code>{' '}
          and <code>top</code> stay measured from the same parent for the whole
          animation.
        </p>
        <div className="placed-stage">
          <PointingBubble className="placed-bubble">Placed by CSS</PointingBubble>
        </div>
      </section>

      <footer>
        MIT licensed ·{' '}
        <a href="https://github.com/MurzNN/js-pointing-bubble">
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}
