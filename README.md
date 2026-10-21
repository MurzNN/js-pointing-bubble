# js-pointing-bubble

Framework-agnostic callout / speech bubble with **Vue** and **React** adapters. The box is a regular element you style with CSS; an SVG tail points **exactly** at coordinates or a DOM element.

Repository: [github.com/MurzNN/js-pointing-bubble](https://github.com/MurzNN/js-pointing-bubble)

<!-- pkg:all -->
- Point at `{ x, y }` or a DOM element / CSS selector
- Auto / fixed / manual placement with a seamless SVG tail
- Edge or center target anchors, resize + scroll tracking, optional glide
- Style with `class` / `style` (Tailwind / UnoCSS welcome); no CSS import required
<!-- /pkg:all -->

## Packages

| Package | Role |
| --- | --- |
| [`js-pointing-bubble`](packages/core) | Core controller (no framework) |
| [`vue-pointing-bubble`](packages/vue) | Vue 3 component |
| [`react-pointing-bubble`](packages/react) | React component |

<!-- pkg:vue
## Install

```bash
pnpm add vue-pointing-bubble
```
-->

<!-- pkg:react
## Install

```bash
pnpm add react-pointing-bubble
```
-->

<!-- pkg:omit -->
## Install (npm)

```bash
pnpm add vue-pointing-bubble
# or
pnpm add react-pointing-bubble
```
<!-- /pkg:omit -->

<!-- pkg:vue
## Install via shadcn-vue

```bash
pnpm dlx shadcn-vue@latest add MurzNN/js-pointing-bubble/vue-pointing-bubble
```

```ts
import { PointingBubble } from '@/components/ui/pointing-bubble'
```
-->

<!-- pkg:react
## Install via shadcn

```bash
pnpm dlx shadcn@latest add MurzNN/js-pointing-bubble/react-pointing-bubble
```

```ts
import { PointingBubble } from '@/components/ui/pointing-bubble'
```
-->

<!-- pkg:all -->
## Quick start

<!-- pkg:vue
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { PointingBubble } from 'vue-pointing-bubble'

const btn = ref<HTMLElement | null>(null)
</script>

<template>
  <button ref="btn">Hint</button>
  <PointingBubble :target="btn" :max-width="240">
    Precise callout content
  </PointingBubble>
</template>
```
-->

<!-- pkg:react
```tsx
import { useRef } from 'react'
import { PointingBubble } from 'react-pointing-bubble'

export function Example() {
  const btn = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={btn}>Hint</button>
      <PointingBubble target={btn.current} maxWidth={240}>
        Precise callout content
      </PointingBubble>
    </>
  )
}
```
-->

<!-- pkg:omit -->
```vue
<!-- Vue -->
<PointingBubble :target="btn" :max-width="240">…</PointingBubble>
```

```tsx
// React
<PointingBubble target={el} maxWidth={240}>…</PointingBubble>
```
<!-- /pkg:omit -->

### Props

| Prop | Default | Notes |
| --- | --- | --- |
| `target` | `null` | `{x,y}`, `Element`, CSS selector, or `null` (in-flow box only) |
| `placement` | `'auto'` | `'auto'` \| quadrant \| `'manual'` (CSS / host positions the **root** box) |
| `targetAnchor` | `'center'` | `'center'` \| `'edge'` for element targets |
| `maxWidth` | — | Wrap width (px) unless CSS sets width/max-width |
| `tailLength` | `45` | Tip → box offset (px) |
| `tailBaseWidth` | `24` | Tail width at the box (px) |
| `padding` | `8` | Via `--pb-padding` unless CSS sets padding |
| `shadow` | `true` | Drop-shadow on the root (includes the SVG tail) |
| `transitionDuration` | `200` | Glide ms (`0` off; respects reduced motion) |

Expose / ref: `update()` after non-reactive layout changes.

The component root is always the bubble chrome (`.pointing-bubble` + `.pointing-bubble__inner`). With a `target`, tip/tail use the nearest positioned ancestor as the coordinate frame; keep the bubble under that stage (avoid `overflow: hidden` between them). Free dragging / absolute CSS ⇒ `placement="manual"`; `auto` owns `left`/`top`.

CSS hooks: `.pointing-bubble`, `.pointing-bubble__inner`, `.pointing-bubble__svg`, `.pointing-bubble__path`. Vars: `--pb-padding`, `--pb-max-width`, `--pb-width`.
<!-- /pkg:all -->

## Demos

- [Vue playground](https://murznn.github.io/js-pointing-bubble/vue/)
- [React playground](https://murznn.github.io/js-pointing-bubble/react/)

## Development

```bash
pnpm install
pnpm registry:sync     # vendor core into adapters
pnpm dev:vue
pnpm dev:react
pnpm test
pnpm build
pnpm build:playground
```

Monorepo layout: `packages/{core,vue,react}`, `demo/playground-{vue,react}`.

<!-- pkg:omit -->
> Package READMEs on npm are generated from this file via `pnpm readme:packages`.
<!-- /pkg:omit -->

## Publishing (npm)

`vue-pointing-bubble` and `react-pointing-bubble` publish from GitHub Actions via npm Trusted Publishing (OIDC). Workflow: [`.github/workflows/publish.yml`](.github/workflows/publish.yml). Each release updates [`CHANGELOG.md`](CHANGELOG.md) (folding `[Unreleased]` + commits since the previous tag) and creates a matching GitHub Release.

```bash
pnpm release          # patch bump, CHANGELOG, package READMEs, commit, tag, push (+ GH Release)
pnpm release minor
pnpm release --dry-run
```

Ensure npm Trusted Publisher is configured for both packages with workflow filename `publish.yml`.

## License

MIT
