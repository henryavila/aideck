import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

// Regression for the packaging blocker: `tsc` does not emit the demo consumer's
// YAML/JSON/JSONL assets, so the build must copy them into dist/ or `aideck demo`
// ships broken. This exercises the copy step directly.
describe('copy-demo-assets (build packaging)', () => {
  it('copies the demo consumer manifest + data into dist/', () => {
    execSync('node scripts/copy-demo-assets.mjs', { cwd: process.cwd(), stdio: 'pipe' })
    const dest = join(process.cwd(), 'dist', 'demo', 'consumer')
    expect(existsSync(join(dest, 'manifest.yaml'))).toBe(true)
    expect(existsSync(join(dest, 'data'))).toBe(true)
  })
})
