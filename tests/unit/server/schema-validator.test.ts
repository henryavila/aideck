import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSchemaValidator } from '../../../src/server/schema-validator.js'

const FIXTURES_DIR = join(import.meta.dirname, '../../fixtures/consumers')
const VALID_SCHEMA = join(FIXTURES_DIR, 'valid-consumer/schema.json')
const BROKEN_JSON_SCHEMA = join(FIXTURES_DIR, 'broken-json/schema.json')
const ITEM_REF = '#/definitions/item'

describe('createSchemaValidator', () => {
  it('loads schema and validates correct data', async () => {
    const result = await createSchemaValidator(VALID_SCHEMA)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const validation = result.value.validate(
      { id: 'T-001', title: 'Test', status: 'active' },
      ITEM_REF
    )
    expect(validation.ok).toBe(true)
  })

  it('returns LLM-friendly error for wrong type on id field', async () => {
    const result = await createSchemaValidator(VALID_SCHEMA)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Include all required fields so the type error on id is the first failure
    const validation = result.value.validate({ id: 123, title: 'Test', status: 'active' }, ITEM_REF)
    expect(validation.ok).toBe(false)
    if (validation.ok) return

    expect(validation.error.code).toBe('validation_error')
    expect(validation.error.message).toMatch(/id/)
    expect(validation.error.message).toMatch(/string|type/)
    expect(validation.error.suggestion).toContain('expected string')
  })

  it('returns error for missing required fields', async () => {
    const result = await createSchemaValidator(VALID_SCHEMA)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const validation = result.value.validate({ id: 'T-001' }, ITEM_REF)
    expect(validation.ok).toBe(false)
    if (validation.ok) return

    expect(validation.error.code).toBe('validation_error')
    expect(validation.error.suggestion).toMatch(/missing required field/)
  })

  it('returns error for invalid enum value', async () => {
    const result = await createSchemaValidator(VALID_SCHEMA)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const validation = result.value.validate(
      { id: 'T-001', title: 'X', status: 'invalid' },
      ITEM_REF
    )
    expect(validation.ok).toBe(false)
    if (validation.ok) return

    expect(validation.error.code).toBe('validation_error')
    expect(validation.error.suggestion).toContain('expected one of:')
    expect(validation.error.suggestion).toContain('pending')
    expect(validation.error.suggestion).toContain('active')
    expect(validation.error.suggestion).toContain('done')
  })

  it('returns io_error for missing schema file', async () => {
    const result = await createSchemaValidator('/nonexistent/path/schema.json')
    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('io_error')
    expect(result.error.message).toContain('schema.json')
  })

  it('returns invalid_input for broken JSON schema file', async () => {
    const result = await createSchemaValidator(BROKEN_JSON_SCHEMA)
    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error.code).toBe('invalid_input')
    expect(result.error.message).toContain('Invalid JSON')
  })

  it('returns invalid_input for unknown $ref', async () => {
    const result = await createSchemaValidator(VALID_SCHEMA)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const validation = result.value.validate({ id: 'T-001' }, '#/definitions/nonexistent')
    expect(validation.ok).toBe(false)
    if (validation.ok) return

    expect(validation.error.code).toBe('invalid_input')
    expect(validation.error.message).toContain('nonexistent')
  })
})
