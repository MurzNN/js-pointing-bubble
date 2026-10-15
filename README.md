# vue-pointing-bubble

A Vue 3 callout for a speech bubble, speech balloon, popover with arrow,
annotated popover, or coachmark. The tail tip points **exactly** at an absolute
`(x, y)` coordinate or at the center of a DOM element.

The box is a regular element that you style with CSS. The tail is a small SVG
triangle in the same colors that covers the box border where it attaches, so there
is no seam, and its tip lands on the target pixel with zero offset.

![Screenshot of the pointing bubble simple demo layout.](docs/screenshot.png)

**[Live demo](https://murznn.github.io/vue-pointing-bubble/)**

## Features

- Point at absolute coordinates (`{ x, y }`) or at a DOM element / component instance.
- Automatic quadrant placement that keeps the bubble inside the container and the visible viewport, a fixed quadrant, or a box positioned by your own CSS.
- Seamless tail with rounded box corners and an optional drop shadow that covers both.
- Any content through the default slot. The bubble resizes to fit it.
- Style the bubble with regular `class` and `style`, including Tailwind CSS or UnoCSS utility classes: size, padding, position, background, border, corner radius, and `z-index`.
- Glides smoothly to a new target, and to a new size when its content changes.
- Follows window resize, scrolling, and container resize.
- No CSS file to import and no dependency on Tailwind or any other CSS framework.
- Ships as an ES module, a UMD bundle for `<script>` tags, the raw `.vue` SFC, and a [shadcn-vue](https://www.shadcn-vue.com/docs/registry) registry item. Includes TypeScript declarations.

## Installation

```bash
npm install vue-pointing-bubble
```

You can also install it straight from GitHub:

```bash
npm install github:MurzNN/vue-pointing-bubble
```

Vue `^3.3` is a peer dependency.

### shadcn-vue

This repository is a shadcn-vue registry. In a project that already has `components.json`, install the component with:

```bash
pnpm dlx shadcn-vue@latest add MurzNN/vue-pointing-bubble/pointing-bubble
```

The CLI reads [`registry.json`](registry.json) from the default branch and writes the component into the project's UI directory. With the default alias, that is `src/components/ui/pointing-bubble`:

```vue
<script setup>
import { PointingBubble } from '@/components/ui/pointing-bubble'
</script>

<template>
  <PointingBubble :target="{ x: 320, y: 180 }">
    Look here.
  </PointingBubble>
</template>
```

Append `#ref` to install from a branch, tag, or commit, for example `MurzNN/vue-pointing-bubble/pointing-bubble#v0.1.0`.

The same item is also published with the demo, so you can register a short name in `components.json`:

```json
{
  "registries": {
    "@vue-pointing-bubble": "https://murznn.github.io/vue-pointing-bubble/r/{name}.json"
  }
}
```

```bash
pnpm dlx shadcn-vue@latest add @vue-pointing-bubble/pointing-bubble
```

List what the repository publishes with `pnpm dlx shadcn-vue@latest search MurzNN/vue-pointing-bubble`.

## Usage

The component fills its nearest **positioned** ancestor (`position: relative`,
`absolute`, or `fixed`) with an overlay. Coordinates are measured relative to
that ancestor.

### Pointing at page coordinates

To point at absolute coordinates on the page, wrap the bubble in a layer that
covers the page. Because the layer is `position: absolute`, it takes no space in
the layout, so the page content stays where it is. Add `pointer-events: none` so the
layer doesn't block clicks on the elements under it.

```vue
<script setup>
import { PointingBubble } from 'vue-pointing-bubble'
</script>

<template>
  <div style="position: absolute; inset: 0; pointer-events: none">
    <PointingBubble :target="{ x: 320, y: 180 }">
      <strong>Look here!</strong>
      <p>The tail tip is exactly at (320, 180) on the page.</p>
    </PointingBubble>
  </div>
</template>
```

The coordinates are measured from the top-left corner of the document, the same way
as `event.pageX` and `event.pageY`, and the bubble scrolls together with the page.
This works only if none of the layer's ancestors is positioned. Otherwise, the
coordinates are measured from that ancestor. To be safe, render the layer with
`<Teleport to="body">`.

If you want viewport coordinates instead (`event.clientX` and `event.clientY`), with
the bubble staying in place while the page scrolls, use `position: fixed` for the
layer.

### Pointing at coordinates inside a container

To point at a spot inside a specific element, such as an image or a chart, put the
bubble into a positioned container. The coordinates are then measured from the
container's top-left corner, so they stay correct wherever the container is on the
page.

```vue
<template>
  <div style="position: relative; width: 600px">
    <img src="/floor-plan.png" width="600" height="400" alt="Floor plan">

    <PointingBubble :target="{ x: 420, y: 150 }">
      The kitchen is here.
    </PointingBubble>
  </div>
</template>
```

Here, `(420, 150)` is a point on the image. If the image moves, for example because
of text added above it, the bubble moves with it.

### Pointing at an element

Pass a template ref, either a DOM element or a component instance. The tip
attaches to the center of the element. This is the usual setup for a coachmark
or a popover with arrow next to a control.

```vue
<script setup>
import { ref } from 'vue'
import { PointingBubble } from 'vue-pointing-bubble'

const button = ref(null)
</script>

<template>
  <div style="position: relative; height: 400px">
    <button ref="button">Save</button>

    <PointingBubble :target="button" placement="bottom-right">
      Click here to save your changes.
    </PointingBubble>
  </div>
</template>
```

By default the tip lands on the element's center. To stop it at the element's
border instead, so it doesn't cover the button's label, add `target-anchor="edge"`:

```vue
<PointingBubble :target="button" target-anchor="edge">
  Click here to save your changes.
</PointingBubble>
```

With automatic placement, the tip then touches the middle of the element's top or
bottom edge, whichever faces the box. With `placement="manual"`, it touches the
point of the element's border nearest to the center of the box.

You can also pass a CSS selector instead of a ref, which is handy when the element
belongs to another component or isn't rendered by Vue at all:

```vue
<PointingBubble target="#save-button" target-anchor="edge">
  Click here to save your changes.
</PointingBubble>
```

The selector is looked up in the whole document with `document.querySelector`, and
the first match is used. It's looked up again on every update, so the bubble finds
an element that appears later, after a re-render, resize, or scroll, or when you
call `update()`. While nothing matches, the bubble is hidden.

### Sizing and styling the box

`class`, `style`, and event listeners that you put on `<PointingBubble>` go to the
box with your content, the same way as on a regular `<div>`. The tail is attached
to whatever size the box ends up with.

```vue
<PointingBubble :target="button" class="w-64 p-3 text-sm">
  Click here to save your changes.
</PointingBubble>
```

By default, the box fits its content, wraps the text where it would run past the
edge of the positioned parent or the viewport on its side of the tip, and has
`padding` of 8px, a white background, a gray border, and 8px rounded corners.
These defaults come from a tiny stylesheet that the component adds to the page,
with zero specificity, so anything your classes or `style` set wins, including
zero values like `p-0` or `rounded-none`.

If you give the box a fixed height, content that doesn't fit is clipped. Add
`overflow-auto` (or `overflow: auto`) to make it scrollable instead.

The box paints itself, so any CSS works on it: gradients, per-corner radii,
`hover:` variants, and so on. The tail takes these properties from the box:

| CSS of the box                          | Effect on the tail                        |
| --------------------------------------- | ----------------------------------------- |
| `background-color`                      | Fill color.                               |
| `border-top-width`, `border-top-color`  | Outline width and color.                  |
| `border-top-left-radius`                | Keeps the tail away from rounded corners. |
| `z-index`                               | Stacking order of the whole bubble, when set. |

```vue
<PointingBubble :target="button" class="p-3 rounded-xl bg-yellow-100 border-2 border-yellow-600">
  Click here to save your changes.
</PointingBubble>

<!-- The same without a CSS framework -->
<PointingBubble
  :target="button"
  style="padding: 12px; border-radius: 12px; background: #fef9c3; border: 2px solid #ca8a04"
>
  Click here to save your changes.
</PointingBubble>
```

The tail is a solid color, so with a gradient or background image, pick a
`background-color` that blends with it. The tail is updated on a re-render and on
resize. If the box colors change without one, for example on hover or when you
toggle dark mode, call `update()`.

The `shadow` prop adds a drop shadow that follows the box and the tail together. A
`box-shadow` of your own only applies to the box.

### Placing the box yourself

By default, the box is placed next to the tip automatically. With
`placement="manual"`, you position the box yourself with `left` and `top`, set by
classes or by `style`, relative to the positioned parent. The tail still points
exactly at `target`, from whichever side of the box faces it. This works well for
an annotated popover on a diagram, or for labels the user can drag around.

```vue
<template>
  <div style="position: relative; height: 300px">
    <img ref="photo" src="/laptop.png" style="margin: 80px auto; display: block">

    <PointingBubble :target="photo" placement="manual" class="left-4 top-4 w-44">
      This label stays in the top-left corner.
    </PointingBubble>
  </div>
</template>
```

Any CSS unit works, for example `class="left-[7em] top-[5em]"` in Tailwind CSS, or
`class="left-7em top-5em"` in UnoCSS. Without a framework, use `style`:

```vue
<PointingBubble :target="photo" placement="manual" :style="{ left: x + 'px', top: y + 'px' }">
  Drag me around.
</PointingBubble>
```

You don't need a class like `absolute`, because the box is always absolutely
positioned. Without `left` and `top`, it sits in the top-left corner of the parent.
The box fits its content and wraps at the edge of the parent, or at `maxWidth`,
unless you set a width. In manual mode, the box itself doesn't glide
when you move it, only the tail does. If the box moves without a resize or a change
of its classes or style, such as during a CSS transition, call `update()`.

### A box without a tail

Leave out `target`, or set it to `null`, to draw just the box, with no tail. The
component then renders the box as a single regular element, with no overlay or
SVG around it. It's in the normal document flow and doesn't need a positioned
parent. It's as wide as its content, up to the parent's width, unless you set
`:max-width`, or a width or max-width from your CSS. Everything else works as on any element: margins
such as `mx-auto`, flex or grid item classes such as `flex-1`, and your own
positioning, for example `class="absolute bottom-24 left-1/2 -translate-x-1/2"`.
Opacity and transforms that a tool applies to the component's root element, such
as Slidev's `v-click`, apply directly to the box. This is handy for a step that
doesn't point at anything, such as the welcome step of a guided tour:

```vue
<PointingBubble :target="step.element" class="mt-4">
  {{ step.text }}
</PointingBubble>
```

When `target` changes from `null` to an element, the box leaves the flow and appears
next to the element, with a tail, and comes back when it changes to `null`. To hide
the bubble completely, use `v-if`. Margins only apply to this mode and to
`placement="manual"`; a bubble placed automatically next to its target ignores them.

### Global registration

```js
import { createApp } from 'vue'
import VuePointingBubble from 'vue-pointing-bubble'
import App from './App.vue'

createApp(App)
  .use(VuePointingBubble) // registers <PointingBubble>
  // .use(VuePointingBubble, { name: 'Callout' }) // or under a custom name
  .mount('#app')
```

The component is also exported under the alias `Callout`:

```js
import { Callout } from 'vue-pointing-bubble'
```

### Using the raw SFC

If you prefer to compile the component with your own build pipeline:

```js
import PointingBubble from 'vue-pointing-bubble/PointingBubble.vue'
```

### Without a build step (CDN)

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<script src="https://unpkg.com/vue-pointing-bubble"></script>

<div id="app">
  <div style="position: absolute; inset: 0; pointer-events: none">
    <pointing-bubble :target="{ x: 200, y: 120 }">Hello!</pointing-bubble>
  </div>
</div>

<script>
  Vue.createApp({})
    .component('PointingBubble', VuePointingBubble.PointingBubble)
    .mount('#app')
</script>
```

## Props

| Prop                 | Type                                  | Default     | Description |
| -------------------- | ------------------------------------- | ----------- | ----------- |
| `target`             | `{ x, y }` \| `Element` \| component \| `string` | `null` | What the tip points at. Coordinates are relative to the positioned parent. A string is a CSS selector, looked up with `document.querySelector`; while it matches nothing, the bubble is hidden. Elements are pointed at their center, or at their border with `targetAnchor="edge"`. When `null`, only the box is drawn, without a tail, as a regular element in the document flow. Use `v-if` to hide the bubble entirely. |
| `placement`          | `'auto'` \| `'top-left'` \| `'top-right'` \| `'bottom-left'` \| `'bottom-right'` \| `'manual'` | `'auto'` | Where the box sits relative to the tip. `auto` chooses the quadrant facing the center of the container, horizontally the side with more room within the container and the viewport. It flips to the other side if the bubble would go outside the viewport, such as after scrolling, and fits on the other side. `manual` leaves the position to the `left` and `top` that you set with `class` or `style`. The tail then grows from whichever side of the box faces the tip. |
| `targetAnchor`       | `'center'` \| `'edge'`                | `'center'`  | For element targets, where the tip lands. `center` is the element's center. `edge` is the element's border facing the box: the middle of the top or bottom edge with automatic placement, or the nearest border point with `manual` placement. Ignored for coordinate targets. |
| `maxWidth`           | `number`                              | —           | Width in px at which content wraps, unless your `class` or `style` sets a width or max-width. By default, the box wraps at the edge of the positioned parent or the viewport, whichever is nearer, on its side of the tip; `auto` placement picks the side with more room. Without a `target`, the box is only limited by its parent's width. |
| `tailLength`         | `number`                              | `45`        | Horizontal and vertical offset in px from the tip to the box corner. |
| `tailBaseWidth`      | `number`                              | `24`        | Width in px of the tail where it joins the box. |
| `padding`            | `number` \| `string`                  | `8`         | Padding of the box (a number means px), unless your `class` or `style` sets a padding. |
| `shadow`             | `boolean`                             | `true`      | Whether to render a drop shadow under the box and the tail. |
| `transitionDuration` | `number`                              | `200`       | Duration in ms of the glide animation when the target, size, or placement changes. The box and the tail move together. `0` disables it, and it is skipped when the user prefers reduced motion. Consider `0` while the target follows the mouse, such as during dragging. |

## Slots

| Slot      | Props                   | Description |
| --------- | ----------------------- | ----------- |
| `default` | `{ placement, tip }`    | Bubble content. `placement` is the resolved quadrant, `'manual'`, or `'none'` without a target, and `tip` is the tip position `{ x, y }` in container pixels, or `null` without a target. |

## Exposed methods

| Name       | Description |
| ---------- | ----------- |
| `update()` | Recomputes the tip position, remeasures the box, and rereads its colors for the tail. Call it if the target element or a manually placed box moved, or the box colors changed, without a window resize, scroll, or re-render, such as after an animation or a theme switch. |

## Styling

The overlay elements have stable class names you can target from your own CSS:

- `.vue-pointing-bubble`: the root element, with a `data-placement` attribute holding the resolved quadrant. With a `target`, it's the full-size overlay; without one, it's the box itself, with `data-placement="none"`.
- `.vue-pointing-bubble__inner`: the box with the slot content. It receives the `class`, `style`, and listeners from `<PointingBubble>`. Without a `target`, that's the root element.
- `.vue-pointing-bubble__svg`: the SVG layer with the tail. It isn't rendered without a `target`.
- `.vue-pointing-bubble__path`: the tail path.

## Development

```bash
npm install
npm run dev:demo       # start the demo dev server with hot reload (`npm run dev` is an alias)
npm run build          # build the library into dist/
npm run registry:build # write the shadcn-vue registry JSON into demo/public/r/
npm run build:demo     # build the registry JSON and the demo into demo-dist/
npm run preview:demo   # serve the built demo
npm test               # build the demo and run the browser tests against it
```

The tests in [`tests/demo.spec.js`](tests/demo.spec.js) use
[Playwright](https://playwright.dev/) and drive the demo page itself: they hover
the hint buttons, walk through the tour, click the chart, and drag the labels,
checking that each tail tip lands exactly on its target and that the box without a
target stays in the page flow. They run in the installed Google Chrome; if you
don't have it, install it with `npx playwright install chrome`.

The component source is [`registry/ui/pointing-bubble/PointingBubble.vue`](registry/ui/pointing-bubble/PointingBubble.vue). The library and the shadcn-vue registry install the same file. The demo (`demo/Demo.vue`) imports it through `src/index.js`, so editing the demo or the component hot-reloads in the browser. It shows hover hints,
a guided tour with a coachmark, an annotated popover on a picture, and draggable
labels with custom box positions.

The workflow [`.github/workflows/deploy-demo.yml`](.github/workflows/deploy-demo.yml)
runs the tests on every pull request and push to `main`, and on `main`, once they
pass, deploys the demo to GitHub Pages. To enable it, open **Settings → Pages** in the repository and
set **Source** to **GitHub Actions**.

## License

[MIT](LICENSE)
