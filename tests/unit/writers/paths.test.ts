import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import {
  DEFAULT_CONSUMER,
  ENTITY_DIRS,
  classifyFile,
  consumerRoot,
  extractConsumerId
} from '../../../src/server/writers/paths.js'

const ROOT = '/tmp/aideck-paths-test'

describe('extractConsumerId — explicit consumer layout', () => {
  it('returns the literal consumer id from `<consumer>/...` paths', () => {
    expect(extractConsumerId(join(ROOT, '.atomic-skills/my-consumer/plans/x.md'), ROOT)).toBe('my-consumer')
  })

  it('returns null when path is outside .atomic-skills', () => {
    expect(extractConsumerId(join(ROOT, 'unrelated/foo.md'), ROOT)).toBeNull()
  })

  it('returns null when path is exactly the .atomic-skills root', () => {
    expect(extractConsumerId(join(ROOT, '.atomic-skills'), ROOT)).toBeNull()
  })
})

describe('extractConsumerId — flat layout (E.T-001)', () => {
  it.each(Array.from(ENTITY_DIRS))(
    'returns DEFAULT_CONSUMER when head segment is %s',
    (entityDir) => {
      const p = join(ROOT, '.atomic-skills', entityDir, 'whatever.md')
      expect(extractConsumerId(p, ROOT)).toBe(DEFAULT_CONSUMER)
    }
  )

  it('preserves consumer named arbitrarily even if not in ENTITY_DIRS', () => {
    expect(
      extractConsumerId(join(ROOT, '.atomic-skills/parallel-dispatch/plans/x.md'), ROOT)
    ).toBe('parallel-dispatch')
  })
})

describe('classifyFile — flat layout (E.T-001 core)', () => {
  it('classifies .atomic-skills/plans/foo.md as project-status plan', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/plans/foo.md'), ROOT)).toEqual({
      consumer: 'project-status',
      kind: 'plan',
      slug: 'foo'
    })
  })

  it('classifies .atomic-skills/initiatives/bar.md as project-status initiative', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/initiatives/bar.md'), ROOT)).toEqual({
      consumer: 'project-status',
      kind: 'initiative',
      slug: 'bar'
    })
  })

  it('classifies .atomic-skills/annotations/2026-05-20.jsonl correctly', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/annotations/2026-05-20.jsonl'), ROOT)).toEqual({
      consumer: 'project-status',
      kind: 'annotations-jsonl'
    })
  })

  it('classifies .atomic-skills/highlights/<file>.jsonl correctly', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/highlights/2026-05-20.jsonl'), ROOT)).toEqual({
      consumer: 'project-status',
      kind: 'highlights-jsonl'
    })
  })

  it('classifies .atomic-skills/inbox/<file>.jsonl correctly', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/inbox/2026-05-20.jsonl'), ROOT)).toEqual({
      consumer: 'project-status',
      kind: 'inbox-jsonl'
    })
  })
})

describe('classifyFile — archive subfolder (nested slug)', () => {
  it('preserves nested archive/ prefix in the slug for initiatives', () => {
    expect(
      classifyFile(join(ROOT, '.atomic-skills/initiatives/archive/2026-05-foo.md'), ROOT)
    ).toEqual({
      consumer: 'project-status',
      kind: 'initiative',
      slug: 'archive/2026-05-foo'
    })
  })

  it('preserves nested archive/ prefix for plans', () => {
    expect(
      classifyFile(join(ROOT, '.atomic-skills/plans/archive/old-plan.md'), ROOT)
    ).toEqual({
      consumer: 'project-status',
      kind: 'plan',
      slug: 'archive/old-plan'
    })
  })

  it('handles deeper nesting (archive/2026/foo.md)', () => {
    expect(
      classifyFile(join(ROOT, '.atomic-skills/initiatives/archive/2026/foo.md'), ROOT)
    ).toEqual({
      consumer: 'project-status',
      kind: 'initiative',
      slug: 'archive/2026/foo'
    })
  })
})

describe('classifyFile — explicit consumer layout (backward-compat)', () => {
  it('classifies .atomic-skills/my-consumer/plans/baz.md correctly', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/my-consumer/plans/baz.md'), ROOT)).toEqual({
      consumer: 'my-consumer',
      kind: 'plan',
      slug: 'baz'
    })
  })

  it('classifies .atomic-skills/x/inbox/y.jsonl correctly', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/x/inbox/y.jsonl'), ROOT)).toEqual({
      consumer: 'x',
      kind: 'inbox-jsonl'
    })
  })

  it('marks unknown sub-dirs as kind=other under an explicit consumer', () => {
    expect(
      classifyFile(join(ROOT, '.atomic-skills/x/misc/whatever.md'), ROOT)
    ).toEqual({
      consumer: 'x',
      kind: 'other'
    })
  })
})

describe('classifyFile — edge cases', () => {
  it('returns null when path is outside .atomic-skills', () => {
    expect(classifyFile(join(ROOT, 'unrelated/foo.md'), ROOT)).toBeNull()
  })

  it('returns null when path is exactly the .atomic-skills root', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills'), ROOT)).toBeNull()
  })

  it('returns kind=other for a bare entity-dir with no file', () => {
    expect(classifyFile(join(ROOT, '.atomic-skills/plans'), ROOT)).toEqual({
      consumer: 'project-status',
      kind: 'other'
    })
  })

  it('returns kind=other for an unrecognized top-level dir under a consumer', () => {
    expect(
      classifyFile(join(ROOT, '.atomic-skills/some-consumer/weird-dir/x.md'), ROOT)
    ).toEqual({
      consumer: 'some-consumer',
      kind: 'other'
    })
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
