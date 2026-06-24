// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { matchesWhere, aggregate, applyFieldMap } from '../../../src/client/utils/aggregate.js'

const plans = [
  { id: 'a', status: 'active', activeCount: 3, blockedBy: 'x' },
  { id: 'b', status: 'active', activeCount: 1 },
  { id: 'c', status: 'paused', activeCount: 0 },
  { id: 'd', status: 'done', activeCount: 0, blockedBy: '' },
]

describe('matchesWhere', () => {
  it('matches scalar equality (coerced)', () => {
    expect(matchesWhere({ status: 'active' }, { status: 'active' })).toBe(true)
    expect(matchesWhere({ status: 'paused' }, { status: 'active' })).toBe(false)
  })
  it('treats "*" as the exists shorthand', () => {
    expect(matchesWhere({ blockedBy: 'x' }, { blockedBy: '*' })).toBe(true)
    expect(matchesWhere({ blockedBy: '' }, { blockedBy: '*' })).toBe(false)
    expect(matchesWhere({}, { blockedBy: '*' })).toBe(false)
  })
  it('supports gt/gte/lt/lte/in/ne/exists operators', () => {
    expect(matchesWhere({ n: 3 }, { n: { gt: 1 } })).toBe(true)
    expect(matchesWhere({ n: 1 }, { n: { gt: 1 } })).toBe(false)
    expect(matchesWhere({ s: 'active' }, { s: { in: ['active', 'paused'] } })).toBe(true)
    expect(matchesWhere({ s: 'done' }, { s: { ne: 'done' } })).toBe(false)
    expect(matchesWhere({ b: 'y' }, { b: { exists: true } })).toBe(true)
  })
  it('ANDs multiple field clauses', () => {
    expect(matchesWhere({ status: 'active', activeCount: 3 }, { status: 'active', activeCount: { gt: 1 } })).toBe(true)
    expect(matchesWhere({ status: 'active', activeCount: 1 }, { status: 'active', activeCount: { gt: 1 } })).toBe(false)
  })
})

describe('aggregate', () => {
  it('count over a where clause', () => {
    expect(aggregate(plans, { agg: 'count', where: { status: 'active' } }).value).toBe('2')
  })
  it('count of "parallel" projects (activeCount > 1)', () => {
    expect(aggregate(plans, { agg: 'count', where: { activeCount: { gt: 1 } } }).count).toBe(1)
  })
  it('count of records with a non-empty field via "*"', () => {
    expect(aggregate(plans, { agg: 'count', where: { blockedBy: '*' } }).count).toBe(1)
  })
  it('ratio formats as percent by default', () => {
    const r = aggregate(plans, { agg: 'ratio', of: 'status==done' })
    expect(r.count).toBe(1)
    expect(r.total).toBe(4)
    expect(r.value).toBe('25%')
  })
  it('ratio honors fraction and raw formats', () => {
    expect(aggregate(plans, { agg: 'ratio', of: 'status==done', ratioFormat: 'fraction' }).value).toBe('1/4')
    expect(aggregate(plans, { agg: 'ratio', of: 'status==done', ratioFormat: 'raw' }).value).toBe('0.25')
  })
  it('sum of a numeric field over a where clause', () => {
    expect(aggregate(plans, { agg: 'sum', of: 'activeCount', where: { status: 'active' } }).value).toBe('4')
  })
  it('ratio is 0 (not NaN) over an empty set', () => {
    expect(aggregate([], { agg: 'ratio', of: 'status==done' }).value).toBe('0%')
  })
})

describe('applyFieldMap', () => {
  it('expands role→field into <role>Field keys', () => {
    expect(applyFieldMap({}, { title: 'name', status: 'state' })).toEqual({
      titleField: 'name',
      statusField: 'state',
    })
  })
  it('does not override an author-set <role>Field', () => {
    expect(applyFieldMap({ titleField: 'explicit' }, { title: 'name' }).titleField).toBe('explicit')
  })
  it('returns the same config object when there is no fieldMap', () => {
    const config = { a: 1 }
    expect(applyFieldMap(config, undefined)).toBe(config)
  })
})
