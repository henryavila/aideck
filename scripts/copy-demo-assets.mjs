#!/usr/bin/env node
/**
 * Copy the demo consumer's data assets (YAML/JSON/JSONL/manifest) into dist/.
 * `tsc` only emits .js/.d.ts from .ts sources, so without this step the built
 * `aideck demo` command resolves __dirname/consumer to dist/demo/consumer and
 * finds nothing — shipping a broken demo. Runs after the server build.
 */
import { cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'src', 'demo', 'consumer')
const dest = join(root, 'dist', 'demo', 'consumer')

if (!existsSync(src)) {
  console.error(`copy-demo-assets: source not found: ${src}`)
  process.exit(1)
}

await rm(dest, { recursive: true, force: true })
await cp(src, dest, { recursive: true })
console.error(`copy-demo-assets: copied ${src} -> ${dest}`)
