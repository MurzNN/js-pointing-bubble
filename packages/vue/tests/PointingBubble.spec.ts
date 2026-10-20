import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { PointingBubble } from '../src/index'

describe('PointingBubble', () => {
  it('renders in-flow without a target', () => {
    const wrapper = mount(PointingBubble, {
      slots: { default: 'Hello' },
    })
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.attributes('data-placement')).toBe('none')
  })
})
