import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { PointingBubble } from '../src/index'

describe('PointingBubble', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders in-flow without a target', () => {
    const wrapper = mount(PointingBubble, {
      slots: { default: 'Hello' },
    })
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.attributes('data-placement')).toBe('none')
    expect(wrapper.classes()).toContain('pointing-bubble__inner')
  })

  it('keeps fallthrough attrs on the root when targeting', async () => {
    const target = document.createElement('button')
    target.id = 'pb-target'
    document.body.appendChild(target)

    const wrapper = mount(PointingBubble, {
      props: { target: '#pb-target', placement: 'manual' },
      attrs: {
        class: 'accent',
        'data-studio-src': '6,13',
        markdownSource: [6, 7, 78],
      },
      slots: { default: 'Hello' },
      attachTo: document.body,
    })

    await nextTick()

    const root = wrapper.element as HTMLElement
    expect(root.classList.contains('pointing-bubble__inner')).toBe(true)
    expect(root.classList.contains('accent')).toBe(true)
    expect(root.getAttribute('data-studio-src')).toBe('6,13')
    expect(root.querySelector(':scope > div.pointing-bubble__inner')).toBeNull()
  })

  it('draws a tail for manual placement after layout', async () => {
    const stage = document.createElement('div')
    stage.style.cssText = 'position:relative;width:400px;height:300px'
    const target = document.createElement('button')
    target.id = 'pb-tip'
    stage.appendChild(target)
    document.body.appendChild(stage)

    // jsdom has no layout engine — stub rects for frame / tip / box.
    stage.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON() {} })
    target.getBoundingClientRect = () =>
      ({ left: 20, top: 20, right: 60, bottom: 40, width: 40, height: 20, x: 20, y: 20, toJSON() {} })

    const wrapper = mount(PointingBubble, {
      props: {
        target: '#pb-tip',
        placement: 'manual',
        transitionDuration: 0,
      },
      attrs: {
        style: 'position:absolute;left:200px;top:180px;width:120px',
      },
      slots: { default: 'Label' },
      attachTo: stage,
    })

    const root = wrapper.element as HTMLElement
    root.getBoundingClientRect = () =>
      ({ left: 200, top: 180, right: 320, bottom: 220, width: 120, height: 40, x: 200, y: 180, toJSON() {} })

    wrapper.vm.update()
    await nextTick()

    expect(root.classList.contains('pointing-bubble__inner')).toBe(true)
    expect(root.querySelector('svg.pointing-bubble__svg')).toBeTruthy()
  })
})
