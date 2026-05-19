import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  parseInboxLine,
  parseJsonlFile,
  parseJsonlString
} from '../../../src/server/parsers/jsonl.js'
import {
  parseAnnotation,
  parseHighlight
} from '../../../src/schemas/validators/index.js'

const REPO_ROOT = process.cwd()
const ANN_FIXTURE = join(REPO_ROOT, 'fixtures/annotations/2026-05-19.jsonl')
const HL_FIXTURE = join(REPO_ROOT, 'fixtures/highlights/2026-05-19.jsonl')

let tmpRoot: string
beforeAll(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), 'aideck-jsonl-'))
})
afterAll(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

const captured = (sink: string[]) => (msg: string) => sink.push(msg)

describe('parseJsonlFile — happy paths from fixtures', () => {
  it('parses the annotations fixture into 3 items, 0 errors', async () => {
    const logs: string[] = []
    const res = await parseJsonlFile(ANN_FIXTURE, parseAnnotation, captured(logs))
    expect(res.items).toHaveLength(3)
    expect(res.errors).toHaveLength(0)
    expect(logs).toHaveLength(0)
  })

  it('parses the highlights fixture into 2 items', async () => {
    const res = await parseJsonlFile(HL_FIXTURE, parseHighlight)
    expect(res.items).toHaveLength(2)
    expect(res.errors).toHaveLength(0)
  })
})

describe('parseJsonlString — error handling', () => {
  it('skips a malformed JSON line and keeps surrounding valid lines', () => {
    const sink: string[] = []
    const raw = [
      '{"id":"a","target":{"consumer":"x","path":"p"},"author":"ai","body":"ok","createdAt":"2026-01-01"}',
      '{ not valid json',
      '{"id":"b","target":{"consumer":"x","path":"p"},"author":"human","body":"ok","createdAt":"2026-01-02"}'
    ].join('\n')
    const res = parseJsonlString(raw, parseAnnotation, '<test>', captured(sink))
    expect(res.items).toHaveLength(2)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].line).toBe(2)
    expect(sink[0]).toContain('line:2')
    expect(sink[0]).toContain('<test>')
  })

  it('records schema-violating lines under errors with the correct line number', () => {
    const sink: string[] = []
    const raw = [
      '{"id":"a","target":{"consumer":"x","path":"p"},"author":"bot","body":"oops","createdAt":"2026-01-01"}'
    ].join('\n')
    const res = parseJsonlString(raw, parseAnnotation, '<schema>', captured(sink))
    expect(res.items).toHaveLength(0)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].error.code).toBe('invalid_input')
  })

  it('returns io_error in errors[] when file missing', async () => {
    const res = await parseJsonlFile(join(tmpRoot, 'missing.jsonl'), parseAnnotation, () => {})
    expect(res.items).toHaveLength(0)
    expect(res.errors[0].error.code).toBe('io_error')
  })
})

describe('parseInboxLine — discriminated by `kind`', () => {
  it('parses an intent line', () => {
    const r = parseInboxLine({
      schemaVersion: '0.1',
      kind: 'intent',
      intentId: 'int-1',
      operation: 'mark_task_done',
      target: { initiativeSlug: 'v3-f0', taskId: 'T-001' },
      args: {},
      by: 'ai',
      requestedAt: '2026-05-19T12:00:00Z'
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.kind).toBe('intent')
  })

  it('parses a verifier_result line', () => {
    const r = parseInboxLine({
      schemaVersion: '0.1',
      kind: 'verifier_result',
      verifierResultId: 'vr-1',
      criterionRef: { target: 'phase', phaseId: 'F0', criterionId: 'F0.G1' },
      result: 'met',
      ranAt: '2026-05-19T12:00:00Z',
      by: 'ai'
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.kind).toBe('verifier_result')
  })

  it('rejects a line missing `kind` with invalid_input', () => {
    const r = parseInboxLine({ id: 'x' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('invalid_input')
  })

  it('rejects a non-object payload', () => {
    const r = parseInboxLine(42)
    expect(r.ok).toBe(false)
  })

  it('uses parseAnnotation when kind is "annotation"', async () => {
    const tmp = join(tmpRoot, 'inbox.jsonl')
    await writeFile(
      tmp,
      JSON.stringify({
        kind: 'annotation',
        id: 'ann-1',
        target: { consumer: 'project-status', path: 'tasks.T-1' },
        author: 'human',
        body: 'note',
        createdAt: '2026-05-19T12:00:00Z'
      }) + '\n'
    )
    const res = await parseJsonlFile(tmp, parseInboxLine, () => {})
    expect(res.items).toHaveLength(1)
    expect(res.errors).toHaveLength(0)
  })
})
