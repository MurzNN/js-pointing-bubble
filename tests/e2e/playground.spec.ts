import { expect, test } from '@playwright/test'

test.describe('vue-pointing-bubble playground', () => {
  test('renders inline bubble without target', async ({ page }) => {
    await page.goto('/')
    // Do not use `.first()` — the thick-border demo (manual + target) is first in the page.
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
})
