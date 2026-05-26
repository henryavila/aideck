import { join } from 'node:path'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { describe, it, expect, afterEach } from 'vitest'
import { runValidate } from '../../../src/cli/validate.js'

const FIXTURES_DIR = join(import.meta.dirname, '../../fixtures/consumers')
const VALID_CONSUMER_DIR = join(FIXTURES_DIR, 'valid-consumer')

function makeStreams() {
  let outBuf = ''
  let errBuf = ''
  const stdout = {
    write(chunk: string) { outBuf += chunk; return true },
  } as NodeJS.WritableStream
  const stderr = {
    write(chunk: string) { errBuf += chunk; return true },
  } as NodeJS.WritableStream
  return {
    stdout,
    stderr,
    get out() { return outBuf },
    get err() { return errBuf },
  }
}

describe('runValidate', () => {
  const tmpDirs: string[] = []

  afterEach(async () => {
    for (const dir of tmpDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('returns 0 with success message for a valid file', async () => {
    const streams = makeStreams()
    const validFile = join(VALID_CONSUMER_DIR, 'data/items.yaml')
    const code = await runValidate(validFile, streams)

    expect(code).toBe(0)
    expect(streams.out).toContain('✓ valid:')
    expect(streams.out).toContain('consumer: valid-consumer')
    expect(streams.out).toContain('dataSource: items')
  })

  it('returns 1 with error details for an invalid file', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'aideck-validate-test-'))
    tmpDirs.push(tmpDir)

    // Copy valid-consumer manifest and schema.json into a temp consumer
    const { readFile, copyFile } = await import('node:fs/promises')
    await mkdir(join(tmpDir, 'data'), { recursive: true })
    await copyFile(join(VALID_CONSUMER_DIR, 'manifest.yaml'), join(tmpDir, 'manifest.yaml'))
    await copyFile(join(VALID_CONSUMER_DIR, 'schema.json'), join(tmpDir, 'schema.json'))

    // Write a file that is missing required 'status' field
    const badFile = join(tmpDir, 'data', 'items.yaml')
    await writeFile(badFile, '- id: "T-999"\n  title: "Bad item"\n')

    const streams = makeStreams()
    const code = await runValidate(badFile, streams)

    expect(code).toBe(1)
    expect(streams.err).toContain('✗ invalid:')
    expect(streams.err).toContain('Consumer: valid-consumer')
    expect(streams.err).toContain('dataSource: items')
  })

  it('returns 2 when file is not under any consumer (no manifest.yaml)', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'aideck-validate-test-'))
    tmpDirs.push(tmpDir)

    const orphanFile = join(tmpDir, 'orphan.yaml')
    await writeFile(orphanFile, '- id: "T-001"\n  title: "Orphan"\n')

    const streams = makeStreams()
    const code = await runValidate(orphanFile, streams)

    expect(code).toBe(2)
    expect(streams.err).toContain('no manifest.yaml')
  })

  it('returns 0 for a file that does not match any dataSource', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'aideck-validate-test-'))
    tmpDirs.push(tmpDir)

    // Create a minimal consumer with manifest but the file is not in any dataSource path
    await mkdir(join(tmpDir, 'data'), { recursive: true })
    await writeFile(join(tmpDir, 'manifest.yaml'), [
      "schemaVersion: '0.1'",
      'id: test-consumer',
      'mcpNamespace: test_consumer',
      "title: 'Test Consumer'",
      'dataSources:',
      '  - id: items',
      "    path: 'data/items.yaml'",
      '    format: yaml',
      'pages:',
      '  - slug: home',
      "    title: 'Home'",
      '    layout: sections',
      '    default: true',
      '    sections: []',
    ].join('\n'))

    // This file is NOT in data/items.yaml — it's in a different path
    const unmatchedFile = join(tmpDir, 'data', 'other.yaml')
    await writeFile(unmatchedFile, '- id: "X-001"\n  title: "Other"\n')

    const streams = makeStreams()
    const code = await runValidate(unmatchedFile, streams)

    expect(code).toBe(0)
    expect(streams.out).toContain('does not match any dataSource')
  })
})
