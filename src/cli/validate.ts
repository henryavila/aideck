import { readFile, access } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { loadManifest } from '../server/manifest-loader.js'
import { createSchemaValidator } from '../server/schema-validator.js'
import type { DataSourceDecl } from '../server/manifest-schema.js'

async function findConsumerDir(startDir: string): Promise<string | null> {
  let dir = startDir
  while (true) {
    const candidate = join(dir, 'manifest.yaml')
    try {
      await access(candidate)
      return dir
    } catch {
      // not here — walk up
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function pathMatchesDataSource(filePath: string, consumerDir: string, decl: DataSourceDecl): boolean {
  // Derived sources (§2a) have no `path` — a data file never matches them.
  const pattern = decl.path
  if (pattern === undefined) return false
  const relFile = relative(consumerDir, filePath)

  if (!pattern.includes('*')) {
    return relFile === pattern
  }

  // Simple glob: convert '*' to a prefix/suffix match (same approach as data-source-reader)
  const starIdx = pattern.indexOf('*')
  const prefix = pattern.slice(0, starIdx)
  const suffix = pattern.slice(starIdx + 1)
  return relFile.startsWith(prefix) && relFile.endsWith(suffix)
}

async function readFileData(filePath: string, format: DataSourceDecl['format']): Promise<unknown> {
  const raw = await readFile(filePath, 'utf8')
  switch (format) {
    case 'yaml':
      return parseYaml(raw)
    case 'json':
      return JSON.parse(raw)
    case 'jsonl':
      return raw.split('\n').filter(l => l.trim().length > 0).map(l => JSON.parse(l) as unknown)
    case 'frontmatter': {
      const match = raw.match(/^---\n([\s\S]*?)\n---/)
      if (!match) return {}
      return parseYaml(match[1])
    }
  }
}

export async function runValidate(
  filePath: string,
  opts?: { stdout?: NodeJS.WritableStream; stderr?: NodeJS.WritableStream }
): Promise<number> {
  const stdout = opts?.stdout ?? process.stdout
  const stderr = opts?.stderr ?? process.stderr

  const absPath = resolve(filePath)

  // Check file exists
  try {
    await access(absPath)
  } catch {
    stderr.write(`aideck validate: file not found: ${absPath}\n`)
    return 2
  }

  // Walk up to find consumer directory (manifest.yaml)
  const consumerDir = await findConsumerDir(dirname(absPath))
  if (!consumerDir) {
    stderr.write(`aideck validate: no manifest.yaml found walking up from ${dirname(absPath)}\n`)
    return 2
  }

  // Load manifest
  const manifestResult = await loadManifest(consumerDir)
  if (!manifestResult.ok) {
    stderr.write(`aideck validate: ${manifestResult.error.message}\n`)
    return 2
  }
  const manifest = manifestResult.value

  // Find matching dataSource
  const matchingSource = manifest.dataSources.find((ds) =>
    pathMatchesDataSource(absPath, consumerDir, ds)
  )

  const displayPath = relative(process.cwd(), absPath)

  if (!matchingSource) {
    stdout.write(
      `aideck validate: ${displayPath} does not match any dataSource in manifest — no schema to check against (valid by default)\n`
    )
    return 0
  }

  // Check for schema.json
  const schemaPath = join(consumerDir, 'schema.json')
  let schemaExists = false
  try {
    await access(schemaPath)
    schemaExists = true
  } catch {
    // no schema.json
  }

  if (!schemaExists) {
    stdout.write(`aideck validate: no schema.json found, skipping validation\n`)
    return 0
  }

  // Load schema validator
  const validatorResult = await createSchemaValidator(schemaPath)
  if (!validatorResult.ok) {
    stderr.write(`aideck validate: ${validatorResult.error.message}\n`)
    return 1
  }
  const validator = validatorResult.value

  // Read file data
  let data: unknown
  try {
    data = await readFileData(absPath, matchingSource.format)
  } catch (cause) {
    stderr.write(
      `aideck validate: failed to parse ${displayPath}: ${cause instanceof Error ? cause.message : String(cause)}\n`
    )
    return 1
  }

  const consumerId = manifest.id
  const dataSourceId = matchingSource.id
  const itemsToValidate = Array.isArray(data) ? data : [data]

  // Determine the schema ref: try #/definitions/<id>, then #/definitions/<id-singular> (strip trailing 's')
  const refCandidates = [`#/definitions/${dataSourceId}`]
  if (dataSourceId.endsWith('s')) {
    refCandidates.push(`#/definitions/${dataSourceId.slice(0, -1)}`)
  }

  // Find the first ref that resolves in the schema
  let activeRef: string | null = null
  for (const candidate of refCandidates) {
    const probe = validator.validate({}, candidate)
    // If the ref is unknown we get code 'invalid_input'; any other error means the ref exists
    if (!probe.ok && probe.error.code === 'invalid_input' && probe.error.message.includes('Unknown $ref')) {
      continue
    }
    activeRef = candidate
    break
  }

  if (activeRef === null) {
    // No matching definition — skip validation (no schema to check against)
    stdout.write(`aideck validate: no schema definition found for dataSource "${dataSourceId}", skipping validation\n`)
    return 0
  }

  for (const item of itemsToValidate) {
    const result = validator.validate(item, activeRef)
    if (!result.ok) {
      stderr.write(`✗ invalid: ${displayPath}\n`)
      stderr.write(`  ${result.error.message}\n`)
      if (result.error.suggestion) {
        stderr.write(`  Fix: ${result.error.suggestion}\n`)
      }
      stderr.write(`  Consumer: ${consumerId}, dataSource: ${dataSourceId}\n`)
      return 1
    }
  }

  stdout.write(`✓ valid: ${displayPath} (consumer: ${consumerId}, dataSource: ${dataSourceId})\n`)
  return 0
}
