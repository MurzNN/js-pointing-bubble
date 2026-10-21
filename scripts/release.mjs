#!/usr/bin/env node
/**
 * Release helper for npm packages.
 *
 *   pnpm release              # patch bump (0.1.2 → 0.1.3)
 *   pnpm release minor        # 0.1.2 → 0.2.0
 *   pnpm release major        # 0.1.2 → 1.0.0
 *   pnpm release 0.2.0        # exact version
 *   pnpm release --dry-run    # print actions, write nothing / no git
 *   pnpm release --no-push    # commit + tag locally only
 *   pnpm readme:packages      # regenerate package READMEs only
 *   node scripts/release.mjs --github-release   # create GH Release for current tag (CI)
 *
 * Each release folds `CHANGELOG.md` `[Unreleased]` notes plus commits since the
 * previous v* tag into a new version section, then creates a matching GitHub Release
 * (also via --github-release in CI).
 *
 * Package READMEs are extracted from the root README.md using HTML comments:
 *
 *   Visible on GitHub (region markers):
 *     <!-- pkg:all --> … <!-- /pkg:all -->     → every package + monorepo
 *     <!-- pkg:omit --> … <!-- /pkg:omit -->   → monorepo only
 *
 *   Hidden on GitHub (whole block is one comment — body must not contain `-->`):
 *     <!-- pkg:vue
 *     …markdown…
 *     -->                                      → vue-pointing-bubble only
 *     <!-- pkg:react … -->                     → react-pointing-bubble only
 *     <!-- pkg:core … -->                      → js-pointing-bubble only
 *
 * Nested markers are allowed. Unmarked text is monorepo-only.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_URL = 'https://github.com/MurzNN/js-pointing-bubble'
const CHANGELOG_PATH = join(root, 'CHANGELOG.md')
const DEFAULT_CHANGELOG = `# Changelog

Notable changes to \`vue-pointing-bubble\` / \`react-pointing-bubble\` (and shared core).
The release script prepends a section per version; GitHub Releases use the same notes.

## [Unreleased]

`

const PACKAGES = [
  {
    id: 'vue',
    name: 'vue-pointing-bubble',
    dir: 'packages/vue',
    title: 'vue-pointing-bubble',
    blurb:
      'Vue 3 callout / speech bubble whose SVG tail points exactly at coordinates or a DOM element.',
    homepage: 'https://murznn.github.io/js-pointing-bubble/vue/',
  },
  {
    id: 'react',
    name: 'react-pointing-bubble',
    dir: 'packages/react',
    title: 'react-pointing-bubble',
    blurb:
      'React callout / speech bubble whose SVG tail points exactly at coordinates or a DOM element.',
    homepage: 'https://murznn.github.io/js-pointing-bubble/react/',
  },
]

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const noPush = args.includes('--no-push')
const readmeOnly =
  args.includes('--readme-only') || process.env.README_ONLY === '1'
const githubReleaseOnly = args.includes('--github-release')
const bumpArg = args.find((a) => !a.startsWith('--')) ?? 'patch'

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/release.mjs [patch|minor|major|x.y.z] [--dry-run] [--no-push]
       node scripts/release.mjs --readme-only
       node scripts/release.mjs --github-release [--dry-run]`)
  process.exit(0)
}

if (githubReleaseOnly) {
  runGitHubReleaseOnly()
  process.exit(0)
}

const rootReadmePath = join(root, 'README.md')
const rootReadme = readFileSync(rootReadmePath, 'utf8')

for (const pkg of PACKAGES) {
  const body = filterByMarkers(rootReadme, pkg.id)
  if (!body.trim()) {
    throw new Error(
      `No README content extracted for pkg:${pkg.id} — check <!-- pkg:* --> markers in README.md`,
    )
  }
  const readme = buildPackageReadme(pkg, body)
  const outPath = join(root, pkg.dir, 'README.md')
  if (dryRun) {
    console.log(`\n--- ${outPath} (${readme.length} chars) ---`)
    console.log(`${readme.slice(0, 500)}${readme.length > 500 ? '\n…\n' : ''}`)
  } else {
    writeFileSync(outPath, `${readme}\n`)
    console.log(`Wrote ${outPath}`)
  }
}

if (readmeOnly) {
  process.exit(0)
}

const versions = Object.fromEntries(
  PACKAGES.map((pkg) => {
    const pkgJson = JSON.parse(
      readFileSync(join(root, pkg.dir, 'package.json'), 'utf8'),
    )
    return [pkg.name, pkgJson.version]
  }),
)

const current = versions[PACKAGES[0].name]
for (const v of Object.values(versions)) {
  if (v !== current) {
    throw new Error(
      `Package versions diverge (${JSON.stringify(versions)}); align them before releasing.`,
    )
  }
}

const next = bumpVersion(current, bumpArg)
console.log(`Version ${current} → ${next}`)

for (const pkg of PACKAGES) {
  const pkgJsonPath = join(root, pkg.dir, 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  pkgJson.version = next
  if (dryRun) {
    console.log(`Would bump ${pkg.dir}/package.json → ${next}`)
  } else {
    writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`)
  }
}

const tag = `v${next}`
const prevTag = latestVersionTag()
const files = [
  'CHANGELOG.md',
  'README.md',
  ...PACKAGES.flatMap((pkg) => [
    `${pkg.dir}/package.json`,
    `${pkg.dir}/README.md`,
  ]),
]

const releaseDate = todayISODate()
const { notes: changelog, fileText: changelogText } = prepareChangelogRelease({
  version: next,
  prevTag,
  toRef: 'HEAD',
  tag,
  date: releaseDate,
})

if (dryRun) {
  console.log(`Would update CHANGELOG.md with [${next}] - ${releaseDate}`)
  console.log(`Would: git add ${files.join(' ')}`)
  console.log(`Would: git commit -m "chore: release ${tag}"`)
  console.log(`Would: git tag ${tag}`)
  if (!noPush) {
    console.log(`Would: git push origin HEAD ${tag}`)
    console.log(`Would: create GitHub Release ${tag}`)
  }
  console.log(`\n--- Changelog for ${tag} ---\n${changelog}\n---`)
  process.exit(0)
}

assertCleanEnoughForRelease()

writeFileSync(CHANGELOG_PATH, changelogText)
console.log(`Updated ${CHANGELOG_PATH}`)

git(['add', ...files])
git([
  'commit',
  '-m',
  `chore: release ${tag}\n\nBump vue/react packages, refresh npm package READMEs, update CHANGELOG.`,
])
git(['tag', tag])

if (noPush) {
  console.log(
    `Created ${tag} locally (not pushed). Run: git push origin HEAD ${tag}`,
  )
  console.log(
    `GitHub Release will be created by CI (or: node scripts/release.mjs --github-release).`,
  )
  console.log(`\n--- Changelog for ${tag} ---\n${changelog}\n---`)
} else {
  git(['push', 'origin', 'HEAD', tag])
  console.log(`Pushed ${tag} — publish workflow should start on GitHub Actions.`)
  ensureGitHubRelease(tag, changelog)
}

function buildPackageReadme(pkg, body) {
  const header = `# ${pkg.title}

${pkg.blurb}

Repository: [github.com/MurzNN/js-pointing-bubble](https://github.com/MurzNN/js-pointing-bubble) · Demo: [${pkg.homepage}](${pkg.homepage})
`
  const footer = `
## License

MIT
`
  return `${header}\n${body.trim()}\n${footer}`
}

/**
 * Extract package README body from root README markers.
 *
 * - `pkg:all` regions → shared visible content
 * - `pkg:omit` regions → monorepo only (skipped)
 * - `<!-- pkg:vue|react|core … -->` hidden blocks → matching package only
 * - Unmarked text → monorepo only
 */
function filterByMarkers(source, pkgId) {
  // Region markers (visible) OR hidden package-only comment blocks.
  const tokenRe =
    /<!--\s*(\/?)pkg:(all|omit)\s*-->|<!--\s*pkg:(vue|react|core)\b([\s\S]*?)-->/g

  let out = ''
  let last = 0
  /** @type {Array<'all' | 'omit'>} */
  const stack = []

  const includeShared = () =>
    stack.length > 0 && !stack.includes('omit') && stack.every((t) => t === 'all')

  for (const m of source.matchAll(tokenRe)) {
    const idx = m.index ?? 0

    if (includeShared()) {
      out += source.slice(last, idx)
    }
    last = idx + m[0].length

    if (m[2] != null) {
      // Region marker: pkg:all | pkg:omit
      const isClose = m[1] === '/'
      const type = /** @type {'all' | 'omit'} */ (m[2])
      if (!isClose) {
        stack.push(type)
      } else {
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i] === type) {
            stack.splice(i, 1)
            break
          }
        }
      }
      continue
    }

    // Hidden package-only block
    const blockPkg = m[3]
    const body = m[4] ?? ''
    if (blockPkg === pkgId && !stack.includes('omit')) {
      out += body
    }
  }

  if (stack.length) {
    throw new Error(`Unclosed pkg marker(s): ${stack.join(', ')}`)
  }

  if (includeShared()) {
    out += source.slice(last)
  }

  return out.replace(/\n{3,}/g, '\n\n').trim()
}

function bumpVersion(current, spec) {
  if (/^\d+\.\d+\.\d+$/.test(spec)) return spec
  const parts = current.split('.').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid current version: ${current}`)
  }
  let [major, minor, patch] = parts
  if (spec === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (spec === 'minor') {
    minor += 1
    patch = 0
  } else if (spec === 'patch') {
    patch += 1
  } else {
    throw new Error(`Unknown bump "${spec}" (use patch|minor|major|x.y.z)`)
  }
  return `${major}.${minor}.${patch}`
}

function git(argv) {
  execFileSync('git', argv, { cwd: root, stdio: 'inherit' })
}

function gitCapture(argv) {
  return execFileSync('git', argv, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function assertCleanEnoughForRelease() {
  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  })
  const unexpected = status
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .filter((line) => {
      const path = line.slice(3).trim().replace(/^.* -> /, '')
      return (
        !PACKAGES.some(
          (pkg) =>
            path === `${pkg.dir}/package.json` ||
            path === `${pkg.dir}/README.md`,
        ) &&
        path !== 'README.md' &&
        path !== 'CHANGELOG.md'
      )
    })
  if (unexpected.length) {
    throw new Error(
      `Working tree has unrelated changes; commit or stash first:\n${unexpected.join('\n')}`,
    )
  }
}

/** Newest `v*` tag on the current branch history, or null. */
function latestVersionTag() {
  try {
    return gitCapture(['describe', '--tags', '--abbrev=0', '--match', 'v*'])
  } catch {
    return null
  }
}

/** Tag immediately before `tag` (by version sort among `v*`), or null. */
function previousVersionTag(tag) {
  const tags = gitCapture([
    'tag',
    '-l',
    'v*',
    '--sort=-v:refname',
  ])
    .split('\n')
    .filter(Boolean)
  const idx = tags.indexOf(tag)
  if (idx === -1) {
    // Tag not local yet — treat newest existing tag as previous.
    return tags[0] ?? null
  }
  return tags[idx + 1] ?? null
}

function todayISODate() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Commit subject lines for `fromTag..toRef` (or all history). */
function listCommitBullets(fromTag, toRef) {
  const range = fromTag ? `${fromTag}..${toRef}` : toRef
  let log = ''
  try {
    log = gitCapture([
      'log',
      range,
      '--pretty=format:%s (%h)',
      '--no-merges',
    ])
  } catch {
    log = ''
  }

  return log
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((line) => !/^chore: release v?\d+\.\d+\.\d+/i.test(line))
    .map((line) => `- ${line}`)
}

/**
 * Fold curated `[Unreleased]` notes + commit bullets into release notes body
 * (no version heading — callers add that for CHANGELOG.md).
 */
function composeReleaseNotes({ unreleasedBody, commitBullets, prevTag, tag }) {
  const parts = []
  if (unreleasedBody.trim()) {
    parts.push(unreleasedBody.trim())
  }
  if (commitBullets.length) {
    parts.push(`### Changes\n\n${commitBullets.join('\n')}`)
  } else if (!unreleasedBody.trim()) {
    parts.push('No notable commits since the previous release.')
  }
  if (prevTag && tag) {
    parts.push(
      `**Full changelog**: ${REPO_URL}/compare/${prevTag}...${tag}`,
    )
  }
  return parts.join('\n\n')
}

function readChangelogFile() {
  return existsSync(CHANGELOG_PATH)
    ? readFileSync(CHANGELOG_PATH, 'utf8')
    : DEFAULT_CHANGELOG
}

/**
 * Locate `## [heading]…` and return { start, end, body } covering the whole
 * section through (but not including) the next `## [` heading.
 */
function findSection(text, headingPattern) {
  const header = text.match(
    new RegExp(`^## \\[${headingPattern}\\][^\\n]*\\r?\\n`, 'm'),
  )
  if (!header || header.index == null) return null
  const start = header.index
  const bodyStart = start + header[0].length
  const after = text.slice(bodyStart)
  const nextRel = after.search(/\r?\n## \[/)
  const end = nextRel === -1 ? text.length : bodyStart + nextRel
  const body = text
    .slice(bodyStart, end)
    .replace(/^\r?\n+/, '')
    .replace(/\s+$/, '')
  return { start, end, body }
}

function takeUnreleasedBody(text) {
  return findSection(text, 'Unreleased')?.body ?? ''
}

/** Remove a version/Unreleased section; returns text without that block. */
function removeSection(text, headingPattern) {
  const sec = findSection(text, headingPattern)
  if (!sec) return text
  return `${text.slice(0, sec.start).replace(/\s+$/, '')}\n${text
    .slice(sec.end)
    .replace(/^\s+/, '')}`
}

/**
 * Build release notes and the next CHANGELOG.md contents for `version`.
 * Clears `[Unreleased]` after folding it into the new section.
 */
function prepareChangelogRelease({ version, prevTag, toRef, tag, date }) {
  const current = readChangelogFile()
  const unreleasedBody = takeUnreleasedBody(current)
  const commitBullets = listCommitBullets(prevTag, toRef)
  const notes = composeReleaseNotes({
    unreleasedBody,
    commitBullets,
    prevTag,
    tag,
  })

  let rest = removeSection(current, 'Unreleased')
  rest = removeSection(rest, escapeRegExp(version))

  const introEnd = rest.search(/\n## \[/)
  const intro =
    introEnd === -1
      ? `${rest.trimEnd()}\n`
      : `${rest.slice(0, introEnd).trimEnd()}\n`
  const older =
    introEnd === -1 ? '' : rest.slice(introEnd).replace(/^\n+/, '')

  const fileText = `${intro}
## [Unreleased]

## [${version}] - ${date}

${notes}

${older}`
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n+$/, '\n')

  return { notes, fileText, unreleasedBody }
}

/** Body of `## [version]` in CHANGELOG.md, or null if missing. */
function extractChangelogSection(version) {
  if (!existsSync(CHANGELOG_PATH)) return null
  return findSection(readFileSync(CHANGELOG_PATH, 'utf8'), escapeRegExp(version))
    ?.body ?? null
}

function runGitHubReleaseOnly() {
  const tag =
    process.env.GITHUB_REF_NAME ||
    process.env.RELEASE_TAG ||
    latestVersionTag()
  if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error(
      `Cannot create GitHub Release: need a vX.Y.Z tag (got ${JSON.stringify(tag)}). Set GITHUB_REF_NAME or RELEASE_TAG.`,
    )
  }

  const version = tag.slice(1)
  const prevTag = previousVersionTag(tag)
  const fromFile = extractChangelogSection(version)
  const notes =
    fromFile ||
    composeReleaseNotes({
      unreleasedBody: '',
      commitBullets: listCommitBullets(prevTag, tag),
      prevTag,
      tag,
    })

  console.log(
    `GitHub Release ${tag} (notes from ${fromFile ? 'CHANGELOG.md' : 'git log since ' + (prevTag ?? 'initial commit')})`,
  )
  if (dryRun) {
    console.log(`\n--- Changelog ---\n${notes}\n---`)
    console.log(`Would: gh release create ${tag}`)
    return
  }
  ensureGitHubRelease(tag, notes)
}

/**
 * Create a GitHub Release for `tag` with `notes`, or no-op if it already exists.
 * Requires `gh` authenticated (local) or GITHUB_TOKEN / GH_TOKEN (CI).
 * Soft-fails locally when `gh` is missing/unauthenticated; fails hard on Actions.
 */
function ensureGitHubRelease(tag, notes) {
  const strict = Boolean(process.env.GITHUB_ACTIONS)

  if (!commandExists('gh')) {
    const msg =
      'gh CLI not found — skip GitHub Release locally; CI will create it on tag push.'
    if (strict) throw new Error('gh CLI not found (required on CI)')
    console.warn(msg)
    return
  }

  try {
    execFileSync('gh', ['release', 'view', tag], {
      cwd: root,
      stdio: 'ignore',
    })
    console.log(`GitHub Release ${tag} already exists — leaving notes unchanged.`)
    return
  } catch {
    // Does not exist yet.
  }

  try {
    execFileSync(
      'gh',
      ['release', 'create', tag, '--title', tag, '--notes-file', '-'],
      {
        cwd: root,
        input: notes,
        stdio: ['pipe', 'inherit', 'inherit'],
      },
    )
    console.log(`Created GitHub Release ${tag}`)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    if (strict) {
      throw new Error(`Could not create GitHub Release ${tag}: ${detail}`)
    }
    console.warn(`Could not create GitHub Release ${tag}: ${detail}`)
    console.warn('CI publish workflow will retry creating the release.')
  }
}

function commandExists(name) {
  try {
    execFileSync('sh', ['-c', `command -v ${name}`], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}
