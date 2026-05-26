import { readFile } from 'node:fs/promises'
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import type { ErrorResponse } from '../schemas/common.js'
import { type Result, err, ok } from '../schemas/validators/index.js'

export interface SchemaValidator {
  validate(data: unknown, ref: string): Result<unknown, ErrorResponse>
}

function suggestFromError(error: ErrorObject): string | undefined {
  const { keyword, params } = error
  switch (keyword) {
    case 'type': {
      const p = params as { type?: string }
      return p.type ? `expected ${p.type}` : undefined
    }
    case 'enum': {
      const p = params as { allowedValues?: unknown[] }
      if (p.allowedValues) {
        return `expected one of: ${p.allowedValues.map((v) => JSON.stringify(v)).join(', ')}`
      }
      return undefined
    }
    case 'required': {
      const p = params as { missingProperty?: string }
      return p.missingProperty ? `missing required field: ${p.missingProperty}` : undefined
    }
    case 'additionalProperties': {
      const p = params as { additionalProperty?: string }
      return p.additionalProperty ? `unexpected field: ${p.additionalProperty}` : undefined
    }
    default:
      return undefined
  }
}

function buildValidationError(errors: ErrorObject[]): ErrorResponse {
  const first = errors[0]
  const path = first.instancePath || '(root)'
  const message = `${path}: ${first.message ?? first.keyword}`
  const suggestion = suggestFromError(first)
  return {
    code: 'validation_error',
    message,
    suggestion,
    details: {
      path,
      keyword: first.keyword,
      params: first.params,
      totalErrors: errors.length,
    },
  }
}

export async function createSchemaValidator(
  schemaPath: string
): Promise<Result<SchemaValidator, ErrorResponse>> {
  let raw: string
  try {
    raw = await readFile(schemaPath, 'utf8')
  } catch (cause) {
    return err({
      code: 'io_error',
      message: `Failed to read schema file: ${schemaPath}`,
      details: { path: schemaPath, cause: String(cause) },
    })
  }

  let schema: unknown
  try {
    schema = JSON.parse(raw)
  } catch (cause) {
    return err({
      code: 'invalid_input',
      message: `Invalid JSON in schema file: ${schemaPath}: ${cause instanceof Error ? cause.message : String(cause)}`,
      suggestion: 'Fix JSON syntax in schema.json',
      details: { path: schemaPath },
    })
  }

  const ajv = new Ajv({ strict: false, allErrors: false })

  let schemaId: string | undefined
  try {
    ajv.addSchema(schema as object)
    // Extract the $id that was registered (may be undefined for schemas without $id)
    const schemaObj = schema as Record<string, unknown>
    schemaId = typeof schemaObj.$id === 'string' ? schemaObj.$id : undefined
  } catch (cause) {
    return err({
      code: 'invalid_input',
      message: `Invalid JSON Schema in ${schemaPath}: ${cause instanceof Error ? cause.message : String(cause)}`,
      suggestion: 'Ensure the schema is a valid JSON Schema document',
      details: { path: schemaPath },
    })
  }

  const validator: SchemaValidator = {
    validate(data: unknown, ref: string): Result<unknown, ErrorResponse> {
      // Resolve the full schema key:
      // - If ref starts with '#', prepend the schema $id (if any) to make it absolute.
      // - Otherwise use the ref as-is (already absolute).
      const resolvedRef =
        ref.startsWith('#') && schemaId ? `${schemaId}${ref}` : ref

      let validateFn: ValidateFunction | undefined
      try {
        validateFn = ajv.getSchema(resolvedRef)
      } catch (cause) {
        return err({
          code: 'invalid_input',
          message: `Cannot resolve $ref "${ref}": ${cause instanceof Error ? cause.message : String(cause)}`,
          suggestion: `Check that "${ref}" is defined in the schema`,
          details: { ref },
        })
      }

      if (!validateFn) {
        return err({
          code: 'invalid_input',
          message: `Unknown $ref "${ref}": not found in schema`,
          suggestion: `Check that "${ref}" is defined in the schema`,
          details: { ref },
        })
      }

      const valid = validateFn(data)
      if (valid) return ok(data)

      const errors = validateFn.errors ?? []
      return err(buildValidationError(errors as ErrorObject[]))
    },
  }

  return ok(validator)
}
