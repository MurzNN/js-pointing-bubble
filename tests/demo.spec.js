import { test, expect } from '@playwright/test'

// Pixel tolerance for geometry checks: sub-pixel layout and 1px borders.
const PX = 1.5

const near = (actual, expected, label = '') =>
  expect(Math.abs(actual - expected), `${label} ${actual} ≈ ${expected}`).toBeLessThanOrEqual(PX)

// Everything a test needs to know about one bubble, in viewport coordinates.
const readBubble = (root) =>
  root.evaluate(async (el) => {
    // Lets resize observers and the following re-render settle first.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const rect = (e) => {
      const r = e.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
    }
    // Without a target the root is the box itself.
    const box = el.matches('.vue-pointing-bubble__inner') ? el : el.querySelector('.vue-pointing-bubble__inner')
    const svg = el.querySelector('.vue-pointing-bubble__svg')
    const paths = svg ? [...svg.querySelectorAll('path')] : []
    const path = paths[0]
    const strokePath = paths.find((p) => {
      const stroke = p.getAttribute('stroke')
      return stroke && stroke !== 'none'
    })
    const boxCss = getComputedStyle(box)
    const rootCss = getComputedStyle(el)
    const pointsOf = (d, origin) => {
      if (!d) return null
      // "M base1 L wall1 Q ctrl1 end1 L tip L end2 Q ctrl2 wall2 L base2" in the coordinates of the SVG layer.
      const n = d.match(/-?[\d.]+(?:e-?\d+)?/g).map(Number)
      return {
        tip: { x: origin.left + n[8], y: origin.top + n[9] },
        base: [
          { x: origin.left + n[0], y: origin.top + n[1] },
          { x: origin.left + n[16], y: origin.top + n[17] }
        ]
      }
    }
    const s = svg?.getBoundingClientRect()
    const fillGeom = pointsOf(path?.getAttribute('d'), s)
    const strokeGeom = pointsOf(strokePath?.getAttribute('d'), s)
    return {
      placement: el.dataset.placement,
      root: rect(el),
      rootDisplay: rootCss.display,
      rootPosition: rootCss.position,
      rootZIndex: rootCss.zIndex,
      rootFilter: rootCss.filter,
      box: rect(box),
      boxPosition: boxCss.position,
      boxVisibility: boxCss.visibility,
      boxBackground: boxCss.backgroundColor,
      boxBorderColor: boxCss.borderTopColor,
      boxBorderWidth: parseFloat(boxCss.borderTopWidth),
      boxRadius: boxCss.borderTopLeftRadius,
      hasSvg: !!svg,
      tip: fillGeom?.tip ?? null,
      base: fillGeom?.base ?? null,
      strokeBase: strokeGeom?.base ?? null,
      tailFill: path?.getAttribute('fill') ?? null,
      tailStroke: strokePath?.getAttribute('stroke') ?? null,
      tailStrokeWidth: strokePath ? parseFloat(strokePath.getAttribute('stroke-width')) : null
    }
  })

const rectOf = (locator) =>
  locator.evaluate((e) => {
    const r = e.getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  })

// Top of an element relative to another one, unaffected by page scrolling.
const topIn = async (locator, scope) => (await rectOf(locator)).top - (await rectOf(scope)).top

const center = (r) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 })

// The tail grows from a wall of the box: its base points lie on the box, painted in the box colors.
const expectTailAttached = (b) => {
  expect(b.hasSvg).toBe(true)
  for (const p of b.base) {
    expect(p.x).toBeGreaterThanOrEqual(b.box.left - PX)
    expect(p.x).toBeLessThanOrEqual(b.box.right + PX)
    expect(p.y).toBeGreaterThanOrEqual(b.box.top - PX)
    expect(p.y).toBeLessThanOrEqual(b.box.bottom + PX)
  }
  expect(b.tailFill).toBe(b.boxBackground)
  expect(b.tailStroke).toBe(b.boxBorderColor)
  expect(b.tailStrokeWidth).toBe(b.boxBorderWidth)
  // The outline ends flat on the inner edge of the border. The fill continues one pixel further in,
  // so the border can't show through the mouth when the page is zoomed.
  if (b.strokeBase) {
    for (let i = 0; i < 2; i++) {
      const shift = Math.hypot(b.strokeBase[i].x - b.base[i].x, b.strokeBase[i].y - b.base[i].y)
      expect(Math.abs(shift - 1), `stroke offset ${shift}`).toBeLessThanOrEqual(0.6)
    }
  }
  // The tip lies outside the box.
  const inside = b.tip.x > b.box.left && b.tip.x < b.box.right && b.tip.y > b.box.top && b.tip.y < b.box.bottom
  expect(inside).toBe(false)
}

const section = (page, n) => page.locator('section.demo').nth(n)
const bubble = (scope, text) => scope.locator('.vue-pointing-bubble', { hasText: text })

let consoleProblems = []
test.beforeEach(async ({ page }) => {
  consoleProblems = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') consoleProblems.push(msg.text())
  })
  page.on('pageerror', (err) => consoleProblems.push(err.message))
  await page.goto('./')
  await expect(page.locator('h1')).toHaveText('vue-pointing-bubble')
})

test.afterEach(() => {
  expect(consoleProblems, 'console errors and warnings').toEqual([])
})

test.describe('with reduced motion', () => {
  // Skips the glide animation, so the geometry is final right after each change.
  test.use({ reducedMotion: 'reduce' })

  test('a bubble without a target is a plain box in the page flow', async ({ page }) => {
    const root = bubble(section(page, 0), 'A regular inline bubble')
    const b = await readBubble(root)

    expect(b.placement).toBe('none')
    expect(b.hasSvg).toBe(false)
    expect(b.rootDisplay).toBe('block')
    expect(b.rootPosition).toBe('static')
    expect(b.boxPosition).toBe('static')
    // Defaults from the component stylesheet.
    expect(b.boxBackground).toBe('rgb(255, 255, 255)')
    expect(b.boxRadius).toBe('8px')
    expect(b.boxBorderWidth).toBeGreaterThan(0)
    // The root is the box: shrunk to its content, only limited by its parent.
    expect(b.box).toEqual(b.root)
    expect(b.box.width).toBeGreaterThan(280)
    expect(b.box.width).toBeLessThan((await rectOf(section(page, 0))).width)

    // Opacity and transforms on the root, such as Slidev's v-click, apply to the bubble directly.
    await root.evaluate((el) => {
      el.style.opacity = '0'
      el.style.translate = '0 20px'
    })
    const moved = await readBubble(root)
    near(moved.box.top, b.box.top + 20, 'translated box top')
    await expect(root).toHaveCSS('opacity', '0')
  })

  test('a bubble without a target can be positioned by its own CSS', async ({ page }) => {
    const s = section(page, 0)
    const root = bubble(s, 'An absolutely positioned bubble')
    const b = await readBubble(root)
    const sectionRect = await rectOf(s)

    expect(b.placement).toBe('none')
    expect(b.hasSvg).toBe(false)
    // No full-size wrapper: the root is the box, placed by the style on the component.
    expect(b.box).toEqual(b.root)
    expect(b.rootPosition).toBe('absolute')
    near(center(b.box).x, center(sectionRect).x, 'centered by left: 50% and translateX(-50%)')
    near(sectionRect.bottom - b.box.bottom, 100, 'bottom: 100px')

    // A translate on the root, such as Slidev's v-click, shifts the bubble without changing
    // what it is positioned against.
    await root.evaluate((el) => (el.style.translate = '0 20px'))
    const moved = await readBubble(root)
    near(moved.box.top, b.box.top + 20, 'translated box top')
    near(moved.box.left, b.box.left, 'translated box left')
  })

  test('hover hints point at the nearest edge or the center of the button', async ({ page }) => {
    const s = section(page, 0)
    const buttons = s.locator('.row .btn')

    for (const name of ['Download', 'Share', 'Delete']) {
      const button = buttons.filter({ hasText: name })
      await button.hover()
      const root = bubble(s, name)
      await expect(root).toHaveAttribute('data-placement', /^(top|bottom)-(left|right)$/)
      const b = await readBubble(root)
      const r = await rectOf(button)
      expectTailAttached(b)
      expect(b.boxVisibility).toBe('visible')
      // Edge anchor: the middle of the button's top or bottom edge, whichever faces the box.
      near(b.tip.x, center(r).x, `${name} tip x`)
      near(b.tip.y, b.box.top > r.bottom ? r.bottom : r.top, `${name} tip y`)
      // The box doesn't cover the button.
      expect(b.box.top > r.bottom || b.box.bottom < r.top).toBe(true)
    }

    await s.getByLabel('center').check()
    const button = buttons.filter({ hasText: 'Share' })
    await button.hover()
    const b = await readBubble(bubble(s, 'Copy a public link'))
    const r = await rectOf(button)
    near(b.tip.x, center(r).x, 'center tip x')
    near(b.tip.y, center(r).y, 'center tip y')

    // The hint hides shortly after the pointer leaves the buttons.
    await page.mouse.move(0, 0)
    await expect(bubble(s, 'Copy a public link')).toHaveCount(0)
  })

  test('the bubble resizes to fit its content', async ({ page }) => {
    const s = section(page, 0)
    await s.locator('.row .btn', { hasText: 'Download' }).hover()
    const short = await readBubble(bubble(s, 'Save as PDF.'))
    await s.locator('.row .btn', { hasText: 'Share' }).hover()
    const long = await readBubble(bubble(s, 'Copy a public link'))

    expect(long.box.height).toBeGreaterThan(short.box.height)
    // Long text wraps at the max-width prop (260px).
    near(long.box.width, 260, 'wrapped width')
    expect(short.box.width).toBeLessThan(260)
  })

  test('a manually placed bubble keeps its CSS position and points at a target given by a selector', async ({
    page
  }) => {
    const s = section(page, 0)
    const b = await readBubble(bubble(s, 'Always visible'))
    // Absolute insets are resolved against the padding edge, inside the section border.
    const sectionPad = await s.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { right: r.left + el.clientLeft + el.clientWidth, top: r.top + el.clientTop }
    })
    const target = await rectOf(page.locator('#hints-title'))

    expect(b.placement).toBe('manual')
    expect(b.boxPosition).toBe('absolute')
    // right: 28px; top: -64px from the style on the component.
    near(sectionPad.right - b.box.right, 28, 'right offset')
    near(b.box.top - sectionPad.top, -64, 'top offset')
    // Colors from the component's style, shared by the tail.
    expect(b.boxBackground).toBe('rgb(254, 249, 195)')
    expectTailAttached(b)
    near(b.tip.x, center(target).x, 'tip x')
    near(b.tip.y, center(target).y, 'tip y')
    // :shadow="false"
    expect(b.rootFilter).toBe('none')
  })

  test('the tour switches between a box in the flow and a bubble with a tail', async ({ page }) => {
    const s = section(page, 1)
    const paragraph = s.locator(':scope > p:not(.hint)').first()
    const paragraphTop = await topIn(paragraph, s)
    const root = s.locator('.vue-pointing-bubble')
    // The root itself on the intro step, an element inside it with a target.
    const box = s.locator('.vue-pointing-bubble__inner')

    await s.getByRole('button', { name: 'Start tour' }).click()
    const intro = await readBubble(root)
    const introTop = await topIn(box, s)
    expect(intro.placement).toBe('none')
    expect(intro.hasSvg).toBe(false)
    expect(intro.boxPosition).toBe('static')
    // The box takes space in the flow, including its 16px top margin.
    near(await topIn(paragraph, s), paragraphTop + intro.box.height + 16, 'paragraph pushed down')
    near(intro.box.width, 260, 'width from style')

    const steps = ['Bold', 'Italic', 'Link', 'Publish']
    for (const [i, name] of steps.entries()) {
      await root.getByRole('button', { name: i === 0 ? 'Start' : 'Next' }).click()
      await expect(root).toContainText(`Step ${i + 2} of 5`)
      const b = await readBubble(root)
      const target = await rectOf(s.locator('.row > .btn', { hasText: name }))
      expect(b.rootPosition).toBe('absolute')
      expect(b.boxPosition).toBe('absolute')
      expectTailAttached(b)
      near(b.tip.x, center(target).x, `${name} tip x`)
      near(b.tip.y, b.box.top > target.bottom ? target.bottom : target.top, `${name} tip y`)
      // An overlay: the page content is back in place.
      near(await topIn(paragraph, s), paragraphTop, 'paragraph back in place')
    }

    // Back to the first step: the tail disappears and the box returns to the flow.
    for (let i = 0; i < steps.length; i++) await root.getByRole('button', { name: 'Back' }).click()
    const back = await readBubble(root)
    expect(back.placement).toBe('none')
    expect(back.hasSvg).toBe(false)
    near(await topIn(box, s), introTop, 'box back in the flow')

    await s.getByRole('button', { name: 'End tour' }).click()
    await expect(root).toHaveCount(0)
    near(await topIn(paragraph, s), paragraphTop, 'paragraph after the tour')
  })

  test('a coordinate target puts the tip on the exact pixel', async ({ page }) => {
    const s = section(page, 2)
    const chart = s.locator('.chart')
    const root = chart.locator('.vue-pointing-bubble')

    // Initially points at the peak of the chart.
    const peak = await rectOf(chart.locator('circle').nth(2))
    const initial = await readBubble(root)
    expectTailAttached(initial)
    near(initial.tip.x, center(peak).x, 'peak x')
    near(initial.tip.y, center(peak).y, 'peak y')

    for (const [fx, fy] of [[0.1, 0.2], [0.9, 0.2], [0.1, 0.9], [0.9, 0.9]]) {
      const before = await rectOf(chart)
      await chart.click({ position: { x: before.width * fx, y: before.height * fy } })
      // The demo shows the clicked point, in chart pixels, inside the bubble.
      await expect(root).toContainText('You clicked here')
      const [x, y] = (await root.textContent()).match(/x: (-?\d+), y: (-?\d+)/).slice(1).map(Number)
      const c = await rectOf(chart)
      near(x, c.width * fx, 'clicked x')
      near(y, c.height * fy, 'clicked y')
      const b = await readBubble(root)
      expectTailAttached(b)
      near(b.tip.x, c.left + x, 'tip x')
      near(b.tip.y, c.top + y, 'tip y')
      // Auto placement faces the center of the chart horizontally; vertically it may flip to stay
      // in the viewport, but the box always sits on the side its placement names.
      const [vertical, horizontal] = b.placement.split('-')
      expect(horizontal).toBe(fx > 0.5 ? 'left' : 'right')
      if (vertical === 'top') expect(b.box.bottom).toBeLessThan(b.tip.y)
      else expect(b.box.top).toBeGreaterThan(b.tip.y)
      if (horizontal === 'left') expect(b.box.right).toBeLessThan(b.tip.x)
      else expect(b.box.left).toBeGreaterThan(b.tip.x)
      // The box wraps rather than running past the edge of the chart.
      expect(b.box.left).toBeGreaterThanOrEqual(c.left - PX)
      expect(b.box.right).toBeLessThanOrEqual(c.right + PX)
    }
  })

  test('draggable labels keep their tails on their targets', async ({ page }) => {
    const s = section(page, 3)
    const stage = s.locator('.stage')
    const parts = {
      Webcam: { el: stage.locator('svg circle'), anchor: 'center' },
      Display: { el: stage.locator('svg rect').nth(1), anchor: 'edge' },
      Trackpad: { el: stage.locator('svg rect').nth(2), anchor: 'edge' }
    }

    const expectPointing = async (name) => {
      const b = await readBubble(bubble(stage, name))
      const r = await rectOf(parts[name].el)
      expect(b.placement).toBe('manual')
      expectTailAttached(b)
      if (parts[name].anchor === 'center') {
        near(b.tip.x, center(r).x, `${name} tip x`)
        near(b.tip.y, center(r).y, `${name} tip y`)
      } else {
        // The point of the part's border nearest to the center of the box.
        const c = center(b.box)
        near(b.tip.x, Math.min(r.right, Math.max(r.left, c.x)), `${name} tip x`)
        near(b.tip.y, Math.min(r.bottom, Math.max(r.top, c.y)), `${name} tip y`)
      }
      return b
    }

    await stage.scrollIntoViewIfNeeded()
    for (const name of Object.keys(parts)) await expectPointing(name)

    // Drag the Webcam label to the right of the laptop.
    const label = bubble(stage, 'Webcam')
    const before = await readBubble(label)
    const stageRect = await rectOf(stage)
    await page.mouse.move(before.box.left + 20, before.box.top + 10)
    await page.mouse.down()
    await page.mouse.move(stageRect.right - 100, before.box.top + 60, { steps: 5 })
    // The dragged label is lifted above the others: its z-index applies to the whole bubble.
    expect((await readBubble(label)).rootZIndex).toBe('31')
    await page.mouse.up()

    const after = await expectPointing('Webcam')
    near(after.box.left, before.box.left + (stageRect.right - 100 - before.box.left - 20), 'dragged box left')
    near(after.box.top, before.box.top + 50, 'dragged box top')
    expect(after.rootZIndex).toBe('auto')
    // The tail now grows from the left wall of the box, facing the camera.
    near(Math.min(after.base[0].x, after.base[1].x), after.box.left + after.boxBorderWidth, 'tail on the left wall')
  })
})

test('an absolutely positioned bubble only shifts by the root translate', async ({ page }) => {
  const stage = page.locator('.placed-stage')
  const root = bubble(stage, 'Placed by CSS')
  await stage.scrollIntoViewIfNeeded()
  const before = await readBubble(root)
  // Absolute insets are resolved against the padding edge, inside the stage border.
  const stagePad = await stage.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left + el.clientLeft, top: r.top + el.clientTop }
  })

  expect(before.placement).toBe('none')
  expect(before.hasSvg).toBe(false)
  // Without a target the root is the box, placed by the class on the component.
  expect(before.box).toEqual(before.root)
  expect(before.rootPosition).toBe('absolute')
  near(before.box.left, stagePad.left + 48, 'resting left')
  near(before.box.top, stagePad.top + 36, 'resting top')

  // v-click puts translate on the root and transitions it. The box must stay within that
  // 20px slide the whole time; checking only the frame after transitionend would miss the jump.
  const frames = await root.evaluate(async (el) => {
    const box = el.matches('.vue-pointing-bubble__inner') ? el : el.querySelector('.vue-pointing-bubble__inner')
    el.style.transition = 'translate 200ms linear'
    const read = () => {
      const r = box.getBoundingClientRect()
      return { left: r.left, top: r.top, translate: getComputedStyle(el).translate }
    }
    const frames = []
    const watch = (ms) => new Promise((resolve) => {
      const start = performance.now()
      const step = () => {
        frames.push(read())
        if (performance.now() - start < ms) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
    el.style.translate = '-20px 0'
    await watch(240)
    el.style.translate = 'none'
    await watch(240)
    return frames
  })

  const translateX = (value) => (value && value !== 'none' ? parseFloat(value) : 0)
  for (const frame of frames) {
    expect(Math.abs(frame.top - before.box.top), `top ${frame.top}`).toBeLessThanOrEqual(PX)
    expect(frame.left).toBeGreaterThanOrEqual(before.box.left - 20 - PX)
    expect(frame.left).toBeLessThanOrEqual(before.box.left + PX)
  }
  expect(frames.some((frame) => {
    const x = translateX(frame.translate)
    return x < -PX && x > -20 + PX
  }), 'saw a frame mid-transition').toBe(true)
  near(frames.at(-1).left, before.box.left, 'back to resting left')
  near(frames.at(-1).top, before.box.top, 'back to resting top')
})

test('the bubble glides to a new target and settles exactly on it', async ({ page }) => {
  const s = section(page, 0)
  await s.locator('.row .btn', { hasText: 'Download' }).hover()
  const share = s.locator('.row .btn', { hasText: 'Share' })
  await share.hover()
  const root = bubble(s, 'Copy a public link')
  const r = await rectOf(share)

  await expect
    .poll(async () => {
      const b = await readBubble(root)
      return Math.abs(b.tip.x - center(r).x) <= PX
    })
    .toBe(true)
  expectTailAttached(await readBubble(root))
})
