import { expect, type Page, test } from '@playwright/test'

async function expectZoomedTargetAlignment(page: Page) {
  await expect(page.locator('.zoomed-content')).toHaveCSS('zoom', '0.7')
  await expect(page.locator('#zoom-target')).toBeVisible()
  const bubble = page.locator('#zoom-bubble')
  await expect(bubble).toBeVisible()
  await expect(bubble).toHaveAttribute('data-placement', 'manual')
  await expect(bubble).toHaveCSS('border-top-width', '12px')
  const tip = bubble.locator('[data-zoom-tip]')
  await expect(tip).toHaveAttribute('data-tip-x', /.+/)
  await expect(tip).toHaveAttribute('data-tip-y', /.+/)

  const expected = await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>('#zoom-target')
    const bubble = document.querySelector<HTMLElement>('#zoom-bubble')
    const tip = bubble?.querySelector<HTMLElement>('[data-zoom-tip]')
    let frame = bubble?.parentElement ?? null
    while (frame && getComputedStyle(frame).position === 'static') {
      frame = frame.parentElement
    }
    if (!target || !bubble || !tip || !frame) {
      throw new Error('Zoom example elements or positioning frame are missing')
    }

    const effectiveZoom = (element: Element) => {
      let zoom = 1
      let current: Element | null = element
      while (current) {
        const value = Number.parseFloat(getComputedStyle(current).zoom)
        if (Number.isFinite(value) && value > 0) zoom *= value
        current = current.parentElement
      }
      return zoom
    }
    const targetRect = target.getBoundingClientRect()
    const frameRect = frame.getBoundingClientRect()
    const frameStyle = getComputedStyle(frame)
    const frameWidth = Number.parseFloat(frameStyle.width) || 0
    const frameHeight = Number.parseFloat(frameStyle.height) || 0
    const frameZoom = effectiveZoom(frame)
    const bubbleZoom = effectiveZoom(bubble)
    const scaleX = frameWidth ? frameRect.width / frameWidth : 1
    const scaleY = frameHeight ? frameRect.height / frameHeight : 1

    return {
      x:
        ((targetRect.left + targetRect.width / 2) * effectiveZoom(target) -
          frameRect.left * frameZoom) /
        (scaleX * bubbleZoom),
      y:
        ((targetRect.top + targetRect.height / 2) * effectiveZoom(target) -
          frameRect.top * frameZoom) /
        (scaleY * bubbleZoom),
      actualX: Number(tip.dataset.tipX),
      actualY: Number(tip.dataset.tipY),
    }
  })

  expect(expected.actualX).toBeCloseTo(expected.x, 1)
  expect(expected.actualY).toBeCloseTo(expected.y, 1)
}

test.describe('vue-pointing-bubble playground', () => {
  test('renders inline bubble without target', async ({ page }) => {
    await page.goto('/')
    const bubble = page.locator('.pointing-bubble', {
      hasText: 'A regular inline bubble with default styling',
    })
    await expect(bubble).toBeVisible()
    await expect(bubble).toHaveAttribute('data-placement', 'none')
  })

  test('hover tip lands on button', async ({ page }) => {
    await page.goto('/')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const btn = page.getByRole('button', { name: 'Download' })
    await btn.hover()
    const bubble = page.locator('.pointing-bubble[data-placement]:not([data-placement="none"])').last()
    await expect(bubble).toBeVisible()
    const svg = bubble.locator('svg.pointing-bubble__svg')
    await expect(svg).toBeVisible()
  })

  test('chart coordinate bubble shows after peak init', async ({ page }) => {
    await page.goto('/')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const chart = page.locator('.chart')
    await expect(chart).toBeVisible()
    await expect(chart.locator('.pointing-bubble')).toBeVisible({
      timeout: 5000,
    })
  })

  test('tail stays aligned with a zoomed target', async ({ page }) => {
    await page.goto('/')
    await expectZoomedTargetAlignment(page)
  })
})

test.describe('react-pointing-bubble playground', () => {
  test('matches the Vue playground examples', async ({ page }) => {
    await page.goto('/')
    const vueHeadings = await page.locator('.demo h2').allTextContents()

    await page.goto('http://127.0.0.1:4174/')
    const reactHeadings = await page.locator('.demo h2').allTextContents()

    expect(reactHeadings).toEqual(vueHeadings)
  })

  test('guided tour and draggable labels are available', async ({ page }) => {
    await page.goto('http://127.0.0.1:4174/')
    const tourBubble = page.locator('.pointing-bubble').filter({
      hasText: 'Welcome to the editor',
    })
    await page.getByRole('button', { name: 'Start tour' }).click()
    await expect(tourBubble).toBeVisible()
    await tourBubble.getByRole('button', { name: 'Start' }).click()
    await expect(
      page.locator('.pointing-bubble').filter({ hasText: 'Make the selected text stand out' }),
    ).toBeVisible()

    await expect(page.locator('.label-bubble')).toHaveCount(3)
    await expect(
      page.locator('.demo').filter({ has: page.getByRole('heading', { name: 'Placed with CSS' }) })
        .locator('.placed-bubble'),
    ).toHaveText('Placed by CSS')
  })

  test('tail stays aligned with a zoomed target', async ({ page }) => {
    await page.goto('http://127.0.0.1:4174/')
    await expectZoomedTargetAlignment(page)
  })
})
