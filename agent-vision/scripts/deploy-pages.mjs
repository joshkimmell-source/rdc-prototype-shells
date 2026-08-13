/**
 * Publishes `dist/` to the `gh-pages` branch.
 *
 * Why this is a local script and not a GitHub Actions workflow: the build needs
 * `@rdc-npm/rdc-ui-v4` from internal Artifactory, which Actions runners cannot reach.
 * So the build happens here, on the VPN, and only the compiled output is pushed.
 *
 * The branch is committed with a detached worktree in a temp dir, so the working tree
 * and the current branch are never touched.
 *
 * Usage: npm run deploy   (runs the build first)
 */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve, join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const BRANCH = 'gh-pages'

/**
 * Font binaries are never published.
 *
 * The licensed Galano faces live in `public/haven/fonts/`, so Vite copies any local
 * copies into `dist/` even though git ignores them — and `dist/` is copied wholesale to
 * the public `gh-pages` branch. Root `.gitignore` does not protect that branch, so the
 * filter has to happen here. The stylesheet loads these faces from the public CDN, so
 * dropping them changes nothing visually.
 */
const BLOCKED_EXT = new Set(['.otf', '.ttf', '.woff', '.woff2'])
const publishable = (src) => !BLOCKED_EXT.has(extname(src).toLowerCase())

const git = (args, opts = {}) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe', ...opts }).trim()

if (!existsSync(join(dist, 'dev.html'))) {
  console.error('dist/dev.html missing — run `npm run build` first.')
  process.exit(1)
}

// Pages serves `index.html` at a directory URL; the Vite template is `dev.html`
// (see vite.config.ts). Copy rather than rename so `npm run bundle` still finds it.
cpSync(join(dist, 'dev.html'), join(dist, 'index.html'))

// Bypass Jekyll, which would otherwise skip files and dirs beginning with `_`.
writeFileSync(join(dist, '.nojekyll'), '')

const sha = git(['rev-parse', '--short', 'HEAD'])
const worktree = mkdtempSync(join(tmpdir(), 'gh-pages-'))
const STAGING = 'gh-pages-staging'

// A previous run that died before cleanup leaves the scratch branch behind, and
// `checkout --orphan` refuses to reuse an existing name.
try {
  git(['branch', '-D', STAGING])
} catch {
  // Not there — the normal case.
}

try {
  // Fresh orphan branch each deploy: this is a build artifact, so history has no value
  // and keeping it would grow the repo with every publish.
  git(['worktree', 'add', '--detach', worktree])
  // `--orphan` fails if the branch already exists locally from an earlier deploy, so
  // build the orphan under a scratch name and push it to BRANCH by refspec below.
  execFileSync('git', ['checkout', '--orphan', STAGING], {
    cwd: worktree,
    stdio: 'pipe',
  })
  execFileSync('git', ['rm', '-rf', '--quiet', '.'], { cwd: worktree, stdio: 'pipe' })

  cpSync(dist, worktree, { recursive: true, filter: publishable })

  // Belt and braces: fail loudly rather than publish a licensed binary if the filter
  // above is ever broken by a refactor.
  const staged = execFileSync('git', ['add', '-An', '.'], { cwd: worktree, encoding: 'utf8' })
  const leaked = staged.split('\n').filter((l) => /\.(otf|ttf|woff2?)'?$/i.test(l))
  if (leaked.length) {
    console.error('Refusing to deploy — font binaries would be published:\n' + leaked.join('\n'))
    process.exit(1)
  }

  execFileSync('git', ['add', '-A'], { cwd: worktree, stdio: 'pipe' })
  execFileSync('git', ['commit', '-m', `Deploy agent-web from ${sha}`], {
    cwd: worktree,
    stdio: 'pipe',
  })
  execFileSync('git', ['push', '--force', 'origin', `HEAD:${BRANCH}`], {
    cwd: worktree,
    stdio: 'inherit',
  })

  const remote = git(['remote', 'get-url', 'origin'])
  const m = remote.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/)
  console.log(
    m ? `\nDeployed. https://${m[1]}.github.io/${m[2]}/` : '\nDeployed to gh-pages.'
  )
} finally {
  rmSync(worktree, { recursive: true, force: true })
  try {
    git(['worktree', 'prune'])
  } catch {
    // Nothing to prune if `worktree add` itself failed.
  }
  try {
    git(['branch', '-D', STAGING])
  } catch {
    // Never created, if the failure came before checkout.
  }
}
