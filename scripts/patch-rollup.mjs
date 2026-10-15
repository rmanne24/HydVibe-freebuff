// Patches Rollup's native loader to use the WASM build when the platform
// binary cannot be loaded.
//
// Why: on this Windows setup, Application Control policy blocks loading of
// `rollup.win32-x64-msvc.node` (Node's require() fails ERR_DLOPEN_FAILED),
// which breaks `vite build` and Vitest entirely. `@rollup/wasm-node` is a
// drop-in replacement exposing the same exports (parse, parseAsync,
// xxhashBase64Url, ...) as the native module.
//
// What it does:
//  1. Probes whether the native `.node` binary actually loads in this
//     environment (it is NOT blocked everywhere; do not unconditionally patch).
//  2. If it loads fine, exits without touching anything.
//  3. If it fails, rewrites the final loader expression in
//     node_modules/rollup/dist/native.js to require('@rollup/wasm-node').
//
// Wired as an npm `postinstall` hook so it self-heals after any install.
import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)

const rollupDir = path.dirname(require.resolve('rollup/package.json'))
const nativeJs = path.join(rollupDir, 'dist', 'native.js')

if (!existsSync(nativeJs)) {
  console.error('[patch-rollup] rollup/dist/native.js not found — skipping patch.')
  process.exit(0)
}

// 1. Probe the platform binary by running the real loader in a child
// Node process, so the patch decision reflects actual behaviour here.
const { execFileSync } = await import('node:child_process')
let nativeLoads = false
try {
  execFileSync(process.execPath, ['-e', `require(${JSON.stringify(nativeJs)})`], {
    cwd: rollupDir,
    stdio: 'ignore',
    timeout: 15_000,
  })
  nativeLoads = true
} catch {
  nativeLoads = false
}

if (nativeLoads) {
  console.log('[patch-rollup] native rollup binary loads fine — no patch needed.')
  process.exit(0)
}

// 2. Patch the loader to prefer the WASM module.
const wasmTmp = path.join(rollupDir, 'dist', 'native.js.wasm-orig')
const PATCHED_MARKER = "require('@rollup/wasm-node/dist/native.js')"
const srcNow = readFileSync(nativeJs, 'utf8')
if (srcNow.includes(PATCHED_MARKER)) {
  console.log('[patch-rollup] patch already applied.')
  process.exit(0)
}
if (!existsSync(wasmTmp)) {
  const src = readFileSync(nativeJs, 'utf8')
  // The loader is laid out across several tab-indented lines in dist:
  //   const nativeModule = requireWithFriendlyError(
  //     existsSync(path.join(__dirname, localName)) ? localName : `@rollup/rollup-${packageBase}`
  //   );
  const loaderRe = /requireWithFriendlyError\(\s*existsSync\(path\.join\(__dirname, localName\)\) \? localName : `@rollup\/rollup-\$\{packageBase\}`\s*\)/
  if (!loaderRe.test(src)) {
    console.error('[patch-rollup] unexpected native.js content — patch recipe needs review.')
    process.exit(1)
  }
  writeFileSync(wasmTmp, src)
  writeFileSync(
    nativeJs,
    src.replace(loaderRe, `require('@rollup/wasm-node/dist/native.js')`),
  )
  console.log('[patch-rollup] native.js patched to use @rollup/wasm-node (original saved as native.js.wasm-orig).')
} else {
  console.error('[patch-rollup] unpatched loader but wasm-orig exists — cannot snapshot original. Remove native.js.wasm-orig and reinstall rollup.')
  process.exit(1)
}
