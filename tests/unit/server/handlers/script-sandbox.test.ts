import { fileURLToPath } from 'node:url'
import { join, dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rm, readFile } from 'node:fs/promises'
import {
  executeScript,
  computeWritablePaths,
  validateWritePath,
} from '../../../../src/server/handlers/script.js'
import type { DataSourceDecl } from '../../../../src/server/manifest-schema.js'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/consumers/valid-consumer'
)

describe('computeWritablePaths', () => {
  it('includes default writable directories', () => {
    const paths = computeWritablePaths('/consumer', [])
    expect(paths).toContain(resolve('/consumer', 'data/inbox'))
    expect(paths).toContain(resolve('/consumer', 'data/annotations'))
    expect(paths).toContain(resolve('/consumer', 'data/highlights'))
  })

  it('includes jsonl dataSources as writable', () => {
    const dataSources: DataSourceDecl[] = [
      { id: 'logs', path: 'data/logs.jsonl', format: 'jsonl' },
      { id: 'items', path: 'data/items.yaml', format: 'yaml' },
    ]
    const paths = computeWritablePaths('/consumer', dataSources)
    expect(paths).toContain(resolve('/consumer', 'data/logs.jsonl'))
    expect(paths).not.toContain(resolve('/consumer', 'data/items.yaml'))
  })

  it('resolves root:project jsonl sources under the write base (the repo), not the consumer dir', () => {
    const dataSources: DataSourceDecl[] = [
      { id: 'inbox', path: '.atomic-skills/bootstrap-drafts/inbox/*.jsonl', format: 'jsonl', root: 'project' },
    ]
    const paths = computeWritablePaths('/consumer', dataSources, '/repo')
    expect(paths).toContain(resolve('/repo', '.atomic-skills/bootstrap-drafts/inbox'))
    expect(paths).not.toContain(resolve('/consumer', '.atomic-skills/bootstrap-drafts/inbox'))
  })

  it('does not include yaml/json/frontmatter dataSources', () => {
    const dataSources: DataSourceDecl[] = [
      { id: 'a', path: 'data/a.yaml', format: 'yaml' },
      { id: 'b', path: 'data/b.json', format: 'json' },
      { id: 'c', path: 'data/c.md', format: 'frontmatter' },
    ]
    const paths = computeWritablePaths('/consumer', dataSources)
    // Only the 3 default dirs
    expect(paths).toHaveLength(3)
  })
})

describe('validateWritePath', () => {
  const consumerDir = '/app/consumers/my-consumer'
  const writablePaths = [
    resolve(consumerDir, 'data/inbox'),
    resolve(consumerDir, 'data/annotations'),
    resolve(consumerDir, 'data/highlights'),
    resolve(consumerDir, 'data/logs.jsonl'),
  ]

  it('allows writes to default writable directories', () => {
    const target = resolve(consumerDir, 'data/inbox/new-record.jsonl')
    expect(validateWritePath(target, consumerDir, writablePaths)).toBeNull()
  })

  it('allows writes to exact jsonl dataSource path', () => {
    const target = resolve(consumerDir, 'data/logs.jsonl')
    expect(validateWritePath(target, consumerDir, writablePaths)).toBeNull()
  })

  it('rejects writes outside consumer directory', () => {
    const target = resolve('/app/consumers/other-consumer/data/inbox/evil.jsonl')
    const result = validateWritePath(target, consumerDir, writablePaths)
    expect(result).toContain('outside the write base directory')
  })

  it('rejects path traversal attacks', () => {
    const target = resolve(consumerDir, '../../etc/passwd')
    const result = validateWritePath(target, consumerDir, writablePaths)
    expect(result).toContain('outside the write base directory')
  })

  it('rejects writes to non-writable paths within consumer directory', () => {
    const target = resolve(consumerDir, 'data/items.yaml')
    const result = validateWritePath(target, consumerDir, writablePaths)
    expect(result).toContain('not within declared writable paths')
  })

  it('rejects writes to manifest.yaml', () => {
    const target = resolve(consumerDir, 'manifest.yaml')
    const result = validateWritePath(target, consumerDir, writablePaths)
    expect(result).toContain('not within declared writable paths')
  })

  it('rejects writes to handlers directory', () => {
    const target = resolve(consumerDir, 'handlers/evil.js')
    const result = validateWritePath(target, consumerDir, writablePaths)
    expect(result).toContain('not within declared writable paths')
  })
})

describe('executeScript sandbox integration', () => {
  const appendDecl = { type: 'script' as const, source: 'handlers/append-record.js' }

  it('allows append to default writable directory (data/inbox)', async () => {
    const targetFile = join(fixturesDir, 'data/inbox/test-sandbox.jsonl')
    // Clean up before test
    await rm(targetFile, { force: true })

    const dataMap = new Map<string, unknown[]>()
    const result = await executeScript(
      fixturesDir,
      appendDecl,
      { target: 'data/inbox/test-sandbox.jsonl', message: 'sandbox-ok' },
      dataMap,
      { dataSources: [] }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const content = await readFile(targetFile, 'utf-8')
    expect(content.trim()).toBe('{"message":"sandbox-ok"}')

    // Clean up
    await rm(targetFile, { force: true })
  })

  it('rejects append outside writable paths', async () => {
    const dataMap = new Map<string, unknown[]>()
    const result = await executeScript(
      fixturesDir,
      appendDecl,
      { target: 'data/items.yaml', message: 'evil' },
      dataMap,
      { dataSources: [] }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('Script handler write rejected')
    expect(result.error.message).toContain('not within declared writable paths')
  })

  it('rejects path traversal via ../', async () => {
    const dataMap = new Map<string, unknown[]>()
    const result = await executeScript(
      fixturesDir,
      appendDecl,
      { target: '../../etc/evil.jsonl', message: 'evil' },
      dataMap,
      { dataSources: [] }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('Script handler write rejected')
  })

  it('allows append to jsonl dataSource path', async () => {
    const targetFile = join(fixturesDir, 'data/test-log.jsonl')
    await rm(targetFile, { force: true })

    const dataSources: DataSourceDecl[] = [
      { id: 'logs', path: 'data/test-log.jsonl', format: 'jsonl' },
    ]
    const dataMap = new Map<string, unknown[]>()
    const result = await executeScript(
      fixturesDir,
      appendDecl,
      { target: 'data/test-log.jsonl', message: 'log-entry' },
      dataMap,
      { dataSources }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const content = await readFile(targetFile, 'utf-8')
    expect(content.trim()).toBe('{"message":"log-entry"}')

    await rm(targetFile, { force: true })
  })

  it('works without sandbox options (backward compat — defaults only)', async () => {
    const targetFile = join(fixturesDir, 'data/inbox/compat-test.jsonl')
    await rm(targetFile, { force: true })

    const dataMap = new Map<string, unknown[]>()
    const result = await executeScript(
      fixturesDir,
      appendDecl,
      { target: 'data/inbox/compat-test.jsonl', message: 'compat' },
      dataMap
    )

    expect(result.ok).toBe(true)

    await rm(targetFile, { force: true })
  })
})
