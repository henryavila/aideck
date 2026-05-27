import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appendJsonlLine, JsonlLineTooLargeError } from '../../../src/server/writers/jsonl-append.js'

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-append-'))
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('appendJsonlLine', () => {
  it('creates missing parent directories and writes one record per line', async () => {
    const path = join(tmp, 'a/b/c/file.jsonl')
    await appendJsonlLine(path, { id: 1 })
    await appendJsonlLine(path, { id: 2 })
    const content = await readFile(path, 'utf8')
    expect(content).toBe('{"id":1}\n{"id":2}\n')
    expect((await stat(path)).isFile()).toBe(true)
  })

  it('produces N distinct lines under 100 concurrent appenders', async () => {
    const path = join(tmp, 'concurrent.jsonl')
    const N = 100
    await Promise.all(
      Array.from({ length: N }, (_, i) => appendJsonlLine(path, { i }))
    )
    const content = await readFile(path, 'utf8')
    const lines = content.split('\n').filter((l) => l !== '')
    expect(lines).toHaveLength(N)
    const ids = new Set(lines.map((l) => (JSON.parse(l) as { i: number }).i))
    expect(ids.size).toBe(N)
  })

  it('throws when payload is not JSON-serializable', async () => {
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    await expect(appendJsonlLine(join(tmp, 'bad.jsonl'), cycle)).rejects.toBeInstanceOf(Error)
  })

  it('throws JsonlLineTooLargeError when payload exceeds max bytes', async () => {
    const huge = { data: 'x'.repeat(70 * 1024) }
    await expect(appendJsonlLine(join(tmp, 'big.jsonl'), huge)).rejects.toBeInstanceOf(
      JsonlLineTooLargeError
    )
  })

  it('JsonlLineTooLargeError includes byte count', async () => {
    const huge = { data: 'x'.repeat(70 * 1024) }
    try {
      await appendJsonlLine(join(tmp, 'big2.jsonl'), huge)
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(JsonlLineTooLargeError)
      expect((e as JsonlLineTooLargeError).bytes).toBeGreaterThan(64 * 1024)
    }
  })
})
