/**
 * Publishes `dist/` to a per-shell subdirectory of the `gh-pages` branch, so one repo
 * can serve several prototype shells side by side:
 *
 *   gh-pages/agent-vision/  →  https://<owner>.github.io/<repo>/agent-vision/
 *   gh-pages/agent-web/     →  https://<owner>.github.io/<repo>/agent-web/
 *
 * The deploy is an OVERLAY: it checks out the existing `gh-pages` tree, replaces only this
 * shell's own subdirectory, and pushes. Every other shell's folder (and anything at the
 * branch root) is left untouched — deploying one shell never clobbers the others.
 *
 * The shell name defaults to this project's directory name (`agent-vision`); pass another
 * as the first CLI arg to override: `npm run deploy -- agent-web`.
 *
 * Why this is a local script and not a GitHub Actions workflow: the build needs
 * `@rdc-npm/rdc-ui-v4` from internal Artifactory, which Actions runners cannot reach.
 * So the build happens here, on the VPN, and only the compiled output is pushed.
 *
 * The branch is committed in a detached worktree in a temp dir, so the working tree and
 * the current branch are never touched.
 *
 * Usage: npm run deploy            (builds, then deploys this shell)
 *        npm run deploy -- <name>  (deploys under a different subdirectory name)
 */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { basename, dirname, resolve, join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const BRANCH = 'gh-pages'

// One subdirectory per shell. Defaults to this project's folder name; the arg is a simple
// path segment, so reject anything that could escape into a sibling path or the branch root.
const SHELL = (process.argv[2] || basename(root)).trim()
if (!/^[a-z0-9][a-z0-9._-]*$/i.test(SHELL)) {
  console.error(`Invalid shell name ${JSON.stringify(SHELL)} — use a single path segment.`)
  process.exit(1)
}

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

const sha = git(['rev-parse', '--short', 'HEAD'])
const worktree = mkdtempSync(join(tmpdir(), 'gh-pages-'))

// Base the overlay on the current published tree so siblings survive. `git worktree add`
// needs a committish; fetch the remote branch first and fall back to an empty orphan tree
// the first time the branch does not exist yet.
let hasBranch = false
try {
  git(['fetch', 'origin', BRANCH])
  hasBranch = true
} catch {
  // No remote gh-pages yet — first ever deploy. We'll start an orphan below.
}

try {
  if (hasBranch) {
    // Detached worktree at the published tip: commits here advance a detached HEAD that we
    // push to gh-pages by refspec, so no local branch is created or mutated.
    git(['worktree', 'add', '--detach', worktree, 'FETCH_HEAD'])
  } else {
    git(['worktree', 'add', '--detach', worktree])
    execFileSync('git', ['checkout', '--orphan', 'gh-pages-init'], { cwd: worktree, stdio: 'pipe' })
    execFileSync('git', ['rm', '-rf', '--quiet', '.'], { cwd: worktree, stdio: 'pipe' })
  }

  // Replace ONLY this shell's subdirectory; everything else in the tree is left as-is.
  const shellDir = join(worktree, SHELL)
  rmSync(shellDir, { recursive: true, force: true })
  cpSync(dist, shellDir, { recursive: true, filter: publishable })

  // Bypass Jekyll at the branch root, which would otherwise skip files/dirs beginning `_`.
  writeFileSync(join(worktree, '.nojekyll'), '')

  // Belt and braces: fail loudly rather than publish a licensed binary if the filter
  // above is ever broken by a refactor.
  const staged = execFileSync('git', ['add', '-An', '.'], { cwd: worktree, encoding: 'utf8' })
  const leaked = staged.split('\n').filter((l) => /\.(otf|ttf|woff2?)'?$/i.test(l))
  if (leaked.length) {
    console.error('Refusing to deploy — font binaries would be published:\n' + leaked.join('\n'))
    process.exit(1)
  }

  execFileSync('git', ['add', '-A'], { cwd: worktree, stdio: 'pipe' })
  // Nothing to commit when the built output is byte-identical to what's already published.
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: worktree, encoding: 'utf8' }).trim()
  if (!dirty) {
    console.log(`No changes for ${SHELL} — gh-pages already up to date.`)
    process.exit(0)
  }

  execFileSync('git', ['commit', '-m', `Deploy ${SHELL} from ${sha}`], { cwd: worktree, stdio: 'pipe' })
  // A plain (non-force) push: HEAD descends from the published tip, so this fast-forwards
  // and preserves the other shells' history rather than orphaning the branch each deploy.
  execFileSync('git', ['push', 'origin', `HEAD:${BRANCH}`], { cwd: worktree, stdio: 'inherit' })

  const remote = git(['remote', 'get-url', 'origin'])
  const m = remote.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/)
  console.log(
    m
      ? `\nDeployed ${SHELL}. https://${m[1]}.github.io/${m[2]}/${SHELL}/`
      : `\nDeployed ${SHELL} to gh-pages/${SHELL}/.`
  )
} finally {
  rmSync(worktree, { recursive: true, force: true })
  try {
    git(['worktree', 'prune'])
  } catch {
    // Nothing to prune if `worktree add` itself failed.
  }
}
