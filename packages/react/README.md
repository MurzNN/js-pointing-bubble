# react-pointing-bubble

React callout / speech bubble whose SVG tail points exactly at coordinates or a DOM element.

Repository: [github.com/MurzNN/js-pointing-bubble](https://github.com/MurzNN/js-pointing-bubble) · Demo: [https://murznn.github.io/js-pointing-bubble/react/](https://murznn.github.io/js-pointing-bubble/react/)

- Point at `{ x, y }` or a DOM element / CSS selector
- Auto / fixed / manual placement with a seamless SVG tail
- Edge or center target anchors, resize + scroll tracking, optional glide
- Style with `class` / `style` (Tailwind / UnoCSS welcome); no CSS import required

## Install

```bash
pnpm add react-pointing-bubble
```

## Install via shadcn

```bash
pnpm dlx shadcn@latest add MurzNN/js-pointing-bubble/react-pointing-bubble
```

```ts
import { PointingBubble } from '@/components/ui/pointing-bubble'
```

## Quick start

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

### Props

| Prop | Default | Notes |
| --- | --- | --- |
| `target` | `null` | `{x,y}`, `Element`, CSS selector, or `null` (in-flow box only) |
| `placement` | `'auto'` | `'auto'` \| quadrant \| `'manual'` (CSS positions the box) |
| `targetAnchor` | `'center'` | `'center'` \| `'edge'` for element targets |
| `maxWidth` | — | Wrap width (px) unless CSS sets width/max-width |
| `tailLength` | `45` | Tip → box offset (px) |
| `tailBaseWidth` | `24` | Tail width at the box (px) |
| `padding` | `8` | Via `--pb-padding` unless CSS sets padding |
| `shadow` | `true` | Shared drop-shadow on overlay/box |
| `transitionDuration` | `200` | Glide ms (`0` off; respects reduced motion) |

Expose / ref: `update()` after non-reactive layout changes.

CSS hooks: `.pointing-bubble`, `.pointing-bubble__inner`, `.pointing-bubble__svg`, `.pointing-bubble__path`. Vars: `--pb-padding`, `--pb-max-width`, `--pb-width`.

**Breaking (v0.2):** class prefix renamed from `.vue-pointing-bubble*` / `--vpb-*` to `.pointing-bubble*` / `--pb-*`.

## License

MIT

