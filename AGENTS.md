# Agent guide for js-pointing-bubble

- Repo: https://github.com/MurzNN/js-pointing-bubble
- Pages: https://murznn.github.io/js-pointing-bubble/

## Source of truth

- **`packages/core`** (`js-pointing-bubble`) — framework-agnostic controller, geometry, tail SVG
- **`packages/vue`** (`vue-pointing-bubble`) — thin Vue adapter
- **`packages/react`** (`react-pointing-bubble`) — thin React adapter
- **`demo/playground-vue`** / **`demo/playground-react`** — demos
- Adapter `pointing-bubble/` folders vendor a copy of core (relative imports) for shadcn installs — edit `packages/core`, then run `pnpm registry:sync` (alias: `pnpm core:sync`) and commit
- `registry/vue/registry.json` / `registry/react/registry.json` — editable shadcn catalogs
- Root `registry.json` — generated; run `pnpm registry:merge` (or `pnpm registry:build`) after catalog/core changes and commit

## Architecture

```
createBubbleController (core)
 → resolve tip → measure box → geometry → ease → buildTailPaths
 → onChange(renderState)
PointingBubble (Vue / React shells) → props/lifecycle/refs/DOM only
```

## Rules

- Core must have **zero** `vue` / `react` imports
- TypeScript only; package types from each package’s Vite/`unplugin-dts` build
- No Tailwind / UnoCSS as a library dependency
- CSS classes are framework-agnostic: `.pointing-bubble`, `__inner`, `__svg`, `__path`; vars `--pb-*`
- Overlay stays `pointer-events: none` when targeting; box has `pointer-events: auto`
- Keep README and playground snippets aligned with the real API

## Publishing

- npm Trusted Publishing (OIDC): `.github/workflows/publish.yml` on `v*` tags
- Publishes `vue-pointing-bubble` + `react-pointing-bubble` only (not core)
- Trusted Publisher workflow filename on npmjs.com must match: `publish.yml`
- Release: `pnpm release` (patch) / `pnpm release minor|major|x.y.z` — [release-it](https://github.com/release-it/release-it) bumps both adapters, regenerates package READMEs, prepends `CHANGELOG.md`, commits, tags `vX.Y.Z`, pushes, creates a GitHub Release
- `CHANGELOG.md` is generated on release from commit subjects since the previous `v*` tag — do not edit it by hand for routine work; write clear commit messages instead. Breaking / migration notes belong in commit messages (or the README), not a manual changelog draft.
- GitHub Release notes match the version section in `CHANGELOG.md` (release-it + idempotent `github-release` job in `publish.yml`)
- `pnpm readme:packages` — regenerate `packages/{vue,react}/README.md` only
- Root `README.md` markers: visible `<!-- pkg:all|omit -->` regions; hidden package-only `<!-- pkg:vue|react|core … -->` comment blocks (body must not contain `-->`)
- Shared templates/scripts: https://github.com/MurzNN/js-cross-framework-tooling

## Done checklist

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:playground
# when UI behavior changed:
pnpm test:e2e
```
