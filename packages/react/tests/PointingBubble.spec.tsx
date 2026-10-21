import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { PointingBubble, type PointingBubbleHandle } from '../src/index'

describe('PointingBubble', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('renders in-flow without a target', () => {
    render(<PointingBubble>Hello</PointingBubble>)
    expect(screen.getByText('Hello')).toBeTruthy()
  })

  it('keeps fallthrough attrs on the root when targeting', () => {
    const target = document.createElement('button')
    target.id = 'pb-target'
    document.body.appendChild(target)

    const { container } = render(
      <PointingBubble
        target="#pb-target"
        placement="manual"
        className="accent"
        data-studio-src="6,13"
        data-testid="bubble-root"
      >
        Hello
      </PointingBubble>,
    )

    const root = container.querySelector('.pointing-bubble') as HTMLElement
    expect(root.classList.contains('pointing-bubble__inner')).toBe(true)
    expect(root.classList.contains('accent')).toBe(true)
    expect(root.getAttribute('data-studio-src')).toBe('6,13')
    expect(root.getAttribute('data-testid')).toBe('bubble-root')
    expect(root.querySelector(':scope > div.pointing-bubble__inner')).toBeNull()
  })

  it('draws a tail for manual placement after layout', async () => {
    const stage = document.createElement('div')
    stage.style.cssText = 'position:relative;width:400px;height:300px'
    const target = document.createElement('button')
    target.id = 'pb-tip-react'
    const mount = document.createElement('div')
    stage.appendChild(target)
    stage.appendChild(mount)
    document.body.appendChild(stage)

    stage.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON() {} })
    target.getBoundingClientRect = () =>
      ({ left: 20, top: 20, right: 60, bottom: 40, width: 40, height: 20, x: 20, y: 20, toJSON() {} })

    const handle = createRef<PointingBubbleHandle>()
    render(
      <PointingBubble
        ref={handle}
        target="#pb-tip-react"
        placement="manual"
        transitionDuration={0}
        style={{ position: 'absolute', left: 200, top: 180, width: 120 }}
      >
        Label
      </PointingBubble>,
      { container: mount },
    )

    const root = mount.querySelector('.pointing-bubble') as HTMLElement
    root.getBoundingClientRect = () =>
      ({ left: 200, top: 180, right: 320, bottom: 220, width: 120, height: 40, x: 200, y: 180, toJSON() {} })

    handle.current?.update()
    await waitFor(() => {
      expect(root.querySelector('svg.pointing-bubble__svg')).toBeTruthy()
    })
  })
})
