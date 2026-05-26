import { describe, expect, it } from 'vitest'
import { renderTemplate } from '../../../../src/server/handlers/template.js'

describe('renderTemplate', () => {
  it('substitutes simple string variables', () => {
    const result = renderTemplate('Hello, {{ name }}! You are {{ age }} years old.', {
      name: 'Alice',
      age: '30',
    })
    expect(result).toBe('Hello, Alice! You are 30 years old.')
  })

  it('substitutes isoDate and now builtins', () => {
    const before = new Date()
    const result = renderTemplate('date={{ isoDate }} ts={{ now }}', {})
    const after = new Date()

    const isoDateMatch = result.match(/date=(\d{4}-\d{2}-\d{2})/)
    expect(isoDateMatch).not.toBeNull()
    const isoDate = isoDateMatch![1]
    expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const nowMatch = result.match(/ts=(.+)$/)
    expect(nowMatch).not.toBeNull()
    const nowTs = new Date(nowMatch![1])
    expect(nowTs.getTime()).toBeGreaterThanOrEqual(before.getTime() - 100)
    expect(nowTs.getTime()).toBeLessThanOrEqual(after.getTime() + 100)
  })

  it('leaves unknown variables as-is', () => {
    const result = renderTemplate('value={{ known }} rest={{ unknown }}', { known: 'yes' })
    expect(result).toBe('value=yes rest={{ unknown }}')
  })

  it('handles object values via JSON.stringify', () => {
    const result = renderTemplate('data={{ payload }}', {
      payload: { a: 1, b: [2, 3] },
    })
    expect(result).toBe('data={"a":1,"b":[2,3]}')
  })
})
