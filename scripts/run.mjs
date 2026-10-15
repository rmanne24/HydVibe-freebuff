// Launches Vite/Vitest with Rollup's WASM fallback enabled before any CLI
// module (and therefore Rollup's native require) is imported.
//
// Why: on Windows, Application Control policy can block Rollup's native
// binary (@rollup/rollup-win32-x64-msvc). Setting ROLLUP_USE_WASM=true makes
// Rollup load `@rollup/wasm-node` instead — see
// https://github.com/rollup/rollup/blob/main/native.js
//
// Usage: node scripts/run.mjs vite build | node scripts/run.mjs vitest run
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

process.env.ROLLUP_USE_WASM = 'true'

const require = createRequire(import.meta.url)
const [cli, ...args] = process.argv.slice(2)

if (!cli || (cli !== 'vite' && cli !== 'vitest')) {
  console.error('usage: node scripts/run.mjs [vite|vitest] [args...]')
  process.exit(1)
}

// Resolve CLI files relative to each package's own package.json so we do not
// depend on package "exports" maps.
const pkgDir = (pkg) => path.dirname(require.resolve(path.join(pkg, 'package.json')))

if (cli === 'vitest') {
  process.argv = [process.argv[0], 'vitest', ...args]
  await import(pathToFileURL(path.join(pkgDir('vitest'), 'vitest.mjs')))
} else {
  process.argv = [process.argv[0], 'vite', ...args]
  await import(pathToFileURL(path.join(pkgDir('vite'), 'bin', 'vite.js')))
}
