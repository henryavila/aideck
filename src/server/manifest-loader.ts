import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { ErrorResponse } from '../schemas/common.js'
import { type Result, err } from '../schemas/validators/index.js'
import { type Manifest, parseManifest } from './manifest-schema.js'

export async function loadManifest(consumerDir: string): Promise<Result<Manifest, ErrorResponse>> {
  const manifestPath = join(consumerDir, 'manifest.yaml')
  let raw: string
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch (cause) {
    return err({
      code: 'io_error',
      message: `Failed to read manifest: ${manifestPath}`,
      details: { path: manifestPath, cause: String(cause) },
    })
  }

  let parsed: unknown
  try {
    parsed = parseYaml(raw)
  } catch (cause) {
    return err({
      code: 'invalid_input',
      message: `YAML syntax error in ${manifestPath}: ${cause instanceof Error ? cause.message : String(cause)}`,
      suggestion: 'Fix YAML syntax in manifest.yaml',
    })
  }

  return parseManifest(parsed)
}
