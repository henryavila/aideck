import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import {
  classifyFile,
  consumerRoot,
  extractConsumerId
} from '../../../src/server/writers/paths.js'

const ROOT = '/tmp/aideck-paths-test'

describe('extractConsumerId — explicit consumer layout', () => {
  it('returns the literal consumer id from `<consumer>/...` paths', () => {
    expect(extractConsumerId(join(ROOT, '.atomic-skills/my-consumer/plans/x.md'), ROOT)).toBe('my-consumer')
  })

  it('returns the leading segment regardless of name (no reserved entity dirs)', () => {
    // Without a flat-layout fallback, the first segment is always the consumer id.
    expect(extractConsumerId(join(ROOT, '.atomic-skills/plans/whatever.md'), ROOT)).toBe('plans')
    expect(extractConsumerId(join(ROOT, '.atomic-skills/parallel-dispatch/plans/x.md'), ROOT)).toBe('parallel-dispatch')
  })

  it('returns null when path is outside .atomic-skills', () => {
    expect(extractConsumerId(join(ROOT, 'unrelated/foo.md'), ROOT)).toBeNull()
  })

  it('returns null when path is exactly the .atomic-skills root', () => {
    expect(extractConsumerId(join(ROOT, '.atomic-skills'), ROOT)).toBeNull()
  })
})

describe('classifyFile — universal append-only subdirs (explicit layout)', () => {
  it('classifies <consumer>/annotations/<file>.jsonl', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/project-status/annotations/2026-05-20.jsonl'), ROOT)).toEqual({
      consumer: 'project-status',
      kind: 'annotations-jsonl'
    })
  })

  it('classifies <consumer>/highlights/<file>.jsonl', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/x/highlights/2026-05-20.jsonl'), ROOT)).toEqual({
      consumer: 'x',
      kind: 'highlights-jsonl'
    })
  })

  it('classifies <consumer>/inbox/<file>.jsonl', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/x/inbox/y.jsonl'), ROOT)).toEqual({
      consumer: 'x',
      kind: 'inbox-jsonl'
    })
  })
})

describe('classifyFile — entity/data files are NOT classified here (manifest globs handle them)', () => {
  it('marks plans/initiatives/misc as kind=other', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/x/plans/foo.md'), ROOT)).toEqual({ consumer: 'x', kind: 'other' })
    expect(classifyFile(join(ROOT, '.atomic-skills/x/initiatives/bar.md'), ROOT)).toEqual({ consumer: 'x', kind: 'other' })
    expect(classifyFile(join(ROOT, '.atomic-skills/x/misc/whatever.md'), ROOT)).toEqual({ consumer: 'x', kind: 'other' })
  })

  it('marks a bare consumer dir with no subdir as kind=other', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/x'), ROOT)).toEqual({ consumer: 'x', kind: 'other' })
  })
})

describe('classifyFile — edge cases', () => {
  it('returns null when path is outside .atomic-skills', () => {
    expect(classifyFile(join(ROOT, 'unrelated/foo.md'), ROOT)).toBeNull()
  })

  it('returns null when path is exactly the .atomic-skills root', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills'), ROOT)).toBeNull()
  })
})

describe('consumerRoot — unchanged contract', () => {
  it('still builds <root>/.atomic-skills/<consumer>', () => {
    expect(consumerRoot(ROOT, 'project-status')).toBe(
      join(ROOT, '.atomic-skills', 'project-status')
    )
  })

  it('still rejects unsafe consumer ids', () => {
    expect(() => consumerRoot(ROOT, 'bad id')).toThrow()
    expect(() => consumerRoot(ROOT, '../escape')).toThrow()
  })
})
