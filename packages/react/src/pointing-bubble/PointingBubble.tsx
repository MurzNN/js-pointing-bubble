import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'
import {
  createBubbleController,
  type BubbleRenderState,
  type BubbleTarget,
  type Placement,
  type Point,
  type TargetAnchor,
} from './core'

export interface PointingBubbleHandle {
  update: () => void
}

export interface PointingBubbleProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  target?: BubbleTarget
  placement?: Placement
  targetAnchor?: TargetAnchor
  maxWidth?: number
  tailLength?: number
  tailBaseWidth?: number
  padding?: number | string
  shadow?: boolean
  transitionDuration?: number
  children?:
    | ReactNode
    | ((ctx: { placement: string; tip: Point | null }) => ReactNode)
}

const emptyState: BubbleRenderState = {
  hasTarget: false,
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

function toCss(style: Record<string, string | number | undefined>): CSSProperties {
  return style as CSSProperties
}

export const PointingBubble = forwardRef(function PointingBubble(
  {
    target = null,
    placement = 'auto',
    targetAnchor = 'center',
    maxWidth,
    tailLength = 45,
    tailBaseWidth = 24,
    padding = 8,
    shadow = true,
    transitionDuration = 200,
    children,
    className,
    style,
    ...rest
  }: PointingBubbleProps,
  ref: Ref<PointingBubbleHandle>,
) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<ReturnType<typeof createBubbleController> | null>(
    null,
  )
  const [state, setState] = useState<BubbleRenderState>(emptyState)

  if (!controllerRef.current) {
    controllerRef.current = createBubbleController({
      getBoxEl: () => rootRef.current,
      onChange: setState,
    })
  }

  useImperativeHandle(ref, () => ({
    update: () => controllerRef.current?.update(),
  }))

  useLayoutEffect(() => {
    controllerRef.current?.setConfig({
      target,
      placement,
      targetAnchor,
      maxWidth,
      tailLength,
      tailBaseWidth,
      padding,
      shadow,
      transitionDuration,
    })
  }, [
    target,
    typeof target === 'object' && target && 'x' in target ? target.x : null,
    typeof target === 'object' && target && 'y' in target ? target.y : null,
    placement,
    targetAnchor,
    maxWidth,
    tailLength,
    tailBaseWidth,
    padding,
    shadow,
    transitionDuration,
  ])

  useEffect(() => {
    const ctrl = controllerRef.current
    return () => ctrl?.destroy()
  }, [])

  const content =
    typeof children === 'function'
      ? children({ placement: state.placement, tip: state.slotTip })
      : (children ?? (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            Callout content
          </p>
        ))

  const rootClass = ['pointing-bubble', 'pointing-bubble__inner', className]
    .filter(Boolean)
    .join(' ')

  // Controller styles last so open-side border overrides (user `border`
  // shorthand would otherwise redraw the attachment wall and leave a seam).
  const rootStyle = toCss({
    ...(style as object),
    ...state.boxStyle,
  })

  return (
    <div
      ref={rootRef}
      className={rootClass}
      data-placement={state.placement}
      style={rootStyle}
      {...rest}
    >
      {content}
      {target && state.tail ? (
        <svg className="pointing-bubble__svg" style={toCss(state.svgStyle)}>
          <path
            className="pointing-bubble__path"
            d={state.tail.fill}
            fill={state.boxFill}
          />
          {state.tail.stroke ? (
            <path
              className="pointing-bubble__path"
              d={state.tail.stroke}
              fill="none"
              stroke={state.boxStroke}
              strokeWidth={state.boxStrokeWidth}
              strokeLinejoin="round"
              strokeLinecap="butt"
            />
          ) : null}
        </svg>
      ) : null}
    </div>
  )
})

export default PointingBubble
