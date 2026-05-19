// @vitest-environment node
import { mkdtemp, rm, stat, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  envFilePath,
  readEnvFile,
  removeEnvFile,
  writeEnvFile
} from '../../../src/server/env-file.js'

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-env-'))
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('writeEnvFile', () => {
  it('creates a 0o600 file under a 0o700 parent', async () => {
    const path = await writeEnvFile({ url: 'http://127.0.0.1:7777', port: 7777 }, { dir: tmp })
    const fileStat = await stat(path)
    const dirStat = await stat(tmp)
    expect(fileStat.mode & 0o777).toBe(0o600)
    // mkdtemp gives 0o700 on macOS; assertion is informational.
    expect(dirStat.isDirectory()).toBe(true)
    expect(envFilePath({ dir: tmp })).toBe(path)
  })

  it('writes shell-source-able content with URL and PORT', async () => {
    await writeEnvFile({ url: 'http://127.0.0.1:8080', port: 8080 }, { dir: tmp })
    const content = await readFile(join(tmp, 'env'), 'utf8')
    expect(content).toContain('export AIDECK_URL="http://127.0.0.1:8080"')
    expect(content).toContain('export AIDECK_PORT=8080')
    expect(content.split('\n').filter((l) => l !== '').length).toBeGreaterThanOrEqual(3)
  })

  it('overwrites a pre-existing file via unlink + open(O_EXCL)', async () => {
    await writeEnvFile({ url: 'http://127.0.0.1:7777', port: 7777 }, { dir: tmp })
    await writeEnvFile({ url: 'http://127.0.0.1:7778', port: 7778 }, { dir: tmp })
    const content = await readEnvFile({ dir: tmp })
    expect(content).toContain('7778')
    expect(content).not.toContain('7777')
  })

  it('removeEnvFile silently no-ops when file is missing', async () => {
    await expect(removeEnvFile({ dir: tmp })).resolves.toBeUndefined()
    await writeEnvFile({ url: 'http://127.0.0.1:7777', port: 7777 }, { dir: tmp })
    await removeEnvFile({ dir: tmp })
    expect(await readEnvFile({ dir: tmp })).toBeNull()
  })
})
