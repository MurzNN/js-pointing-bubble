# Changelog

Notable changes to `vue-pointing-bubble` / `react-pointing-bubble` (and shared core).
The release script prepends a section per version from commits since the previous tag;
GitHub Releases use the same notes.

## [0.6.0] - 2026-10-27

### Changes

- fix: export PointingBubble only, drop the plugin and Callout alias (125da16)

**Full changelog**: https://github.com/MurzNN/js-pointing-bubble/compare/v0.5.2...v0.6.0

## [0.5.2] - 2026-10-22

### Changes

- test: target inline no-target bubble in e2e (48e3701)
- chore: generate CHANGELOG from commits only (1151102)

**Full changelog**: https://github.com/MurzNN/js-pointing-bubble/compare/v0.5.1...v0.5.2

## [0.5.1] - 2026-10-22

### Changes

- perf: skip hidden layout and ignore non-layout style churn (d0048dc)
- fix: disable pnpm cache in github-release job (984ae1b)

**Full changelog**: https://github.com/MurzNN/js-pointing-bubble/compare/v0.5.0...v0.5.1

## [0.5.0] - 2026-10-21

### Breaking

- Root is always the box (no overlay wrapper). Class / style / `v-drag` land on the chrome.

### Changes

- feat: add CHANGELOG and GitHub Releases to the release flow (dc28de2)
- fix: shrink tail fill overlap into the box to 2px (3887fc8)
- fix: shorten hooks to 2px and align fill with stroke rays (3c3e1e9)
- fix: clip tail fill to mouth (hook starts), not beyond stroke (90c1900)
- fix: center tail stroke on the border band (−bw/2) (e3e1200)
- fix: align SVG frame with border-box on top/left (fb78171)
- fix: remasure bubble when CSS position changes (b98b085)
- fix: open-wedge tail that sits on the CSS border step (b5e2e49)
- fix: use root-as-box layout for host drag and simpler DOM (4d8e6ab)

**Full changelog**: https://github.com/MurzNN/js-pointing-bubble/compare/v0.4.0...v0.5.0

## [0.4.0] - 2026-10-20

- First monorepo release of Vue and React packages with shared `js-pointing-bubble` core.

## [0.2.0]

### Breaking

- Class prefix renamed from `.vue-pointing-bubble*` / `--vpb-*` to `.pointing-bubble*` / `--pb-*`.
