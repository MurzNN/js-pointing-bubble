import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createBubbleController,
  isBubbleVisible,
} from '../src/createBubbleController'

function stubRect(
  el: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
) {
  el.getBoundingClientRect = () =>
    ({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON() {},
    }) as DOMRect
}

describe('isBubbleVisible', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('uses checkVisibility when available', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.checkVisibility = vi.fn().mockReturnValue(false)
    expect(isBubbleVisible(el)).toBe(false)
    el.checkVisibility = vi.fn().mockReturnValue(true)
    expect(isBubbleVisible(el)).toBe(true)
  })

  it('falls back to computed style when checkVisibility is missing', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    // Force the fallback path.
    Object.defineProperty(el, 'checkVisibility', {
      value: undefined,
      configurable: true,
    })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '0',
    } as CSSStyleDeclaration)
    expect(isBubbleVisible(el)).toBe(false)
  })
})

describe('createBubbleController', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('skips geometry work while the box is hidden', () => {
    const stage = document.createElement('div')
    stage.style.cssText = 'position:relative;width:400px;height:300px'
    const target = document.createElement('button')
    const box = document.createElement('div')
    stage.append(target, box)
    document.body.appendChild(stage)

    stubRect(stage, { left: 0, top: 0, width: 400, height: 300 })
    stubRect(target, { left: 20, top: 20, width: 40, height: 20 })
    stubRect(box, { left: 200, top: 180, width: 120, height: 40 })

    box.checkVisibility = () => false

    const onChange = vi.fn()
    const controller = createBubbleController({
      getBoxEl: () => box,
      onChange,
    })
    controller.setConfig({
      target,
      placement: 'manual',
      transitionDuration: 0,
    })

    expect(onChange).not.toHaveBeenCalled()
    expect(controller.getState().tail).toBeNull()

    controller.destroy()
  })

  it('does not re-emit when only non-layout styles change', () => {
    const stage = document.createElement('div')
    stage.style.cssText = 'position:relative;width:400px;height:300px'
    const target = document.createElement('button')
    const box = document.createElement('div')
    box.style.cssText = 'position:absolute;left:200px;top:180px;width:120px'
    stage.append(target, box)
    document.body.appendChild(stage)

    stubRect(stage, { left: 0, top: 0, width: 400, height: 300 })
    stubRect(target, { left: 20, top: 20, width: 40, height: 20 })
    stubRect(box, { left: 200, top: 180, width: 120, height: 40 })
    box.checkVisibility = () => true

    const onChange = vi.fn()
    const controller = createBubbleController({
      getBoxEl: () => box,
      onChange,
    })
    controller.setConfig({
      target,
      placement: 'manual',
      transitionDuration: 0,
    })

    expect(onChange).toHaveBeenCalled()
    const callsAfterLayout = onChange.mock.calls.length

    // Chrome-only style writes (filter / CSS vars) must not restart layout.
    box.style.filter = 'drop-shadow(0 0 4px #000)'
    box.style.setProperty('--pb-padding', '8px')
    // MutationObserver is async; flush and call update explicitly as hosts do.
    controller.update()

    expect(onChange.mock.calls.length).toBe(callsAfterLayout)

    controller.destroy()
  })

  it('resumes layout after becoming visible', () => {
    const stage = document.createElement('div')
    stage.style.cssText = 'position:relative;width:400px;height:300px'
    const target = document.createElement('button')
    const box = document.createElement('div')
    box.style.cssText = 'position:absolute;left:200px;top:180px;width:120px'
    stage.append(target, box)
    document.body.appendChild(stage)

    stubRect(stage, { left: 0, top: 0, width: 400, height: 300 })
    stubRect(target, { left: 20, top: 20, width: 40, height: 20 })
    stubRect(box, { left: 200, top: 180, width: 120, height: 40 })

    let visible = false
    box.checkVisibility = () => visible

    const onChange = vi.fn()
    const controller = createBubbleController({
      getBoxEl: () => box,
      onChange,
    })
    controller.setConfig({
      target,
      placement: 'manual',
      transitionDuration: 0,
    })
    expect(onChange).not.toHaveBeenCalled()

    visible = true
    controller.update()
    expect(onChange).toHaveBeenCalled()
    expect(controller.getState().placement).toBe('manual')

    controller.destroy()
  })
})
