import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createBubbleController,
  hasOpacityFadeIn,
  isBubbleVisible,
  PERF_ATTR_LAYOUT_CHANGES_ONLY,
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

  it('draws the tail once an opacity fade-in leaves 0', () => {
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
    const fade = {
      playState: 'running',
      transitionProperty: 'opacity',
      effect: {
        getKeyframes: () => [{ opacity: '0' }, { opacity: '1' }],
      },
    }
    box.getAnimations = () =>
      (visible ? [] : [fade]) as unknown as Animation[]

    const queued: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      queued.push(cb)
      return queued.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})

    const controller = createBubbleController({
      getBoxEl: () => box,
    })
    controller.setConfig({
      target,
      placement: 'manual',
      transitionDuration: 0,
    })

    expect(controller.getState().tail).toBeNull()
    expect(queued).toHaveLength(1)

    // First frame of the fade is still fully transparent.
    queued[0]!(0)
    expect(controller.getState().tail).toBeNull()
    expect(queued).toHaveLength(2)

    visible = true
    queued[1]!(0)
    expect(controller.getState().placement).toBe('manual')
    expect(controller.getState().tail?.fill).toBeTruthy()

    controller.destroy()
    vi.unstubAllGlobals()
  })

  it('does not retry while a hidden bubble has no fade-in', () => {
    const stage = document.createElement('div')
    stage.style.cssText = 'position:relative;width:400px;height:300px'
    const target = document.createElement('button')
    const box = document.createElement('div')
    stage.append(target, box)
    document.body.appendChild(stage)

    box.checkVisibility = () => false
    box.getAnimations = () => []
    const raf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)

    const controller = createBubbleController({
      getBoxEl: () => box,
    })
    controller.setConfig({
      target,
      placement: 'manual',
      transitionDuration: 0,
    })

    expect(raf).not.toHaveBeenCalled()
    expect(hasOpacityFadeIn(box)).toBe(false)
    expect(controller.getState().tail).toBeNull()

    controller.destroy()
    vi.unstubAllGlobals()
  })

  it('does not follow an opacity fade-in when layout-changes-only=1', () => {
    const stage = document.createElement('div')
    stage.style.cssText = 'position:relative;width:400px;height:300px'
    const target = document.createElement('button')
    const box = document.createElement('div')
    stage.append(target, box)
    document.body.appendChild(stage)

    box.checkVisibility = () => false
    box.setAttribute(PERF_ATTR_LAYOUT_CHANGES_ONLY, '1')
    box.getAnimations = () =>
      [
        {
          playState: 'running',
          transitionProperty: 'opacity',
          effect: {
            getKeyframes: () => [{ opacity: '0' }, { opacity: '1' }],
          },
        },
      ] as unknown as Animation[]
    const raf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)

    const controller = createBubbleController({
      getBoxEl: () => box,
    })
    controller.setConfig({
      target,
      placement: 'manual',
      transitionDuration: 0,
    })

    expect(hasOpacityFadeIn(box)).toBe(true)
    expect(raf).not.toHaveBeenCalled()

    controller.destroy()
    vi.unstubAllGlobals()
  })

  it('recalculates on any style write unless layout-changes-only=1', async () => {
    const stage = document.createElement('div')
    stage.style.cssText = 'position:relative;width:400px;height:300px'
    const target = document.createElement('button')
    const box = document.createElement('div')
    box.style.cssText = 'position:absolute;left:200px;top:180px;width:120px'
    stage.append(target, box)
    document.body.appendChild(stage)

    stubRect(stage, { left: 0, top: 0, width: 400, height: 300 })
    stubRect(target, { left: 20, top: 20, width: 40, height: 20 })
    const boxRect = vi.fn(
      () =>
        ({
          left: 200,
          top: 180,
          right: 320,
          bottom: 220,
          width: 120,
          height: 40,
          x: 200,
          y: 180,
          toJSON() {},
        }) as DOMRect,
    )
    box.getBoundingClientRect = boxRect
    box.checkVisibility = () => true

    const controller = createBubbleController({
      getBoxEl: () => box,
    })
    controller.setConfig({
      target,
      placement: 'manual',
      transitionDuration: 0,
    })

    const afterSetup = boxRect.mock.calls.length
    box.style.filter = 'blur(1px)'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(boxRect.mock.calls.length).toBeGreaterThan(afterSetup)

    box.setAttribute(PERF_ATTR_LAYOUT_CHANGES_ONLY, '1')
    const afterFlag = boxRect.mock.calls.length
    box.style.filter = 'blur(2px)'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(boxRect.mock.calls.length).toBe(afterFlag)

    box.style.left = '10px'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(boxRect.mock.calls.length).toBeGreaterThan(afterFlag)

    controller.destroy()
  })
})
