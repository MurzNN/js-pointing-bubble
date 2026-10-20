import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PointingBubble } from '../src/index'

describe('PointingBubble', () => {
  it('renders in-flow without a target', () => {
    render(<PointingBubble>Hello</PointingBubble>)
    expect(screen.getByText('Hello')).toBeTruthy()
  })
})
