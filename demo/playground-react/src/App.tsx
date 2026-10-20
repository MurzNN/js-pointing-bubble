import { useCallback, useEffect, useRef, useState } from 'react'
import { PointingBubble } from 'react-pointing-bubble'

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

  const showHint = (el: Element, action: (typeof actions)[number]) => {
    window.clearTimeout(hideTimer.current)
    setHint({ el, label: action.label, text: action.text })
  }
  const hideHint = () => {
    hideTimer.current = window.setTimeout(() => setHint(null), 150)
  }

  const chartRef = useRef<HTMLDivElement | null>(null)
  const peakRef = useRef<SVGCircleElement | null>(null)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [pointLabel, setPointLabel] = useState('')

  const pointAt = useCallback((x: number, y: number, label: string) => {
    setPoint({ x: Math.round(x), y: Math.round(y) })
    setPointLabel(label)
  }, [])

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
        <h2>Annotating by coordinates</h2>
        <p className="hint">Click the chart. The tip lands on that pixel.</p>
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
          <svg viewBox="0 0 600 240" role="img" aria-label="Visitors">
            <polyline
              points="30,190 120,150 210,40 300,120 390,95 480,140 570,70"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="3"
            />
            <circle ref={peakRef} cx="210" cy="40" r="5" fill="#4f46e5" />
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

      <footer>
        MIT licensed ·{' '}
        <a href="https://github.com/MurzNN/js-pointing-bubble">
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}
