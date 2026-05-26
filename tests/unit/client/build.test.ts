import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

describe('Vite build', () => {
  it('produces dist/client with index.html and assets', async () => {
    execSync('npx vite build', { cwd: process.cwd(), stdio: 'pipe' })

    const distDir = join(process.cwd(), 'dist', 'client')
    expect(existsSync(join(distDir, 'index.html'))).toBe(true)

    const assets = await readdir(join(distDir, 'assets'))
    expect(assets.some(f => f.endsWith('.js'))).toBe(true)
    expect(assets.some(f => f.endsWith('.css'))).toBe(true)
  })
})
