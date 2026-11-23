# vue-pointing-bubble

Vue 3 callout / speech bubble whose SVG tail points exactly at coordinates or a DOM element.

Repository: [github.com/MurzNN/js-pointing-bubble](https://github.com/MurzNN/js-pointing-bubble) · Demo: [https://murznn.github.io/js-pointing-bubble/vue/](https://murznn.github.io/js-pointing-bubble/vue/)

- Point at `{ x, y }` or a DOM element / CSS selector
- Auto / fixed / manual placement with a seamless SVG tail
- Edge or center target anchors, resize + scroll tracking, optional glide
- Style with `class` / `style` (Tailwind / UnoCSS welcome); no CSS import required

## Install

```bash
pnpm add vue-pointing-bubble
```

## Install via shadcn-vue

```bash
pnpm dlx shadcn-vue@latest add MurzNN/js-pointing-bubble/vue-pointing-bubble
```

```ts
import { PointingBubble } from '@/components/ui/pointing-bubble'
```

## Quick start

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

### Performance

By default the bubble follows a CSS opacity fade (Slidev `v-click`) and measures again as soon as opacity is above 0, and every `style` change recalculates the tail. The fade follow polls `requestAnimationFrame` only while that fade-in is running.

Set `layout-changes-only="1"` to turn both of those off:

- Do not poll animation frames during an opacity fade. A bubble that is still at opacity 0 is left unmeasured, so the tail can be missing on the first reveal.
- Recalculate only when the box moves or resizes: `left`, `top`, `right`, `bottom`, `width`, `height`, `transform`, `translate`, `inset`, `inset-inline`, `inset-block`. Other style writes (filter, CSS variables, pointer-events) are ignored.

```vue
<PointingBubble layout-changes-only="1" target=".anchor" placement="manual">
  …
</PointingBubble>
```

`true`, `yes`, and a boolean attribute with an empty value also turn the opt-out on.

## License

MIT

