#!/usr/bin/env tsx
/**
 * Offline validator for .atomic-skills/ files against Zod schemas.
 *
 * Usage:
 *   npx tsx scripts/validate-state.ts                  # validate all
 *   npx tsx scripts/validate-state.ts --file <path>    # validate single file
 */
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parsePlanFile, parseInitiativeFile } from '../src/server/parsers/project-status.js'

const args = process.argv.slice(2)
const fileIdx = args.indexOf('--file')
const singleFile = fileIdx !== -1 ? args[fileIdx + 1] : null

const ROOT = resolve(process.env.ATOMIC_SKILLS_ROOT || join(process.cwd(), '.atomic-skills'))

interface ValidationError {
  path: string
  error: string
  suggestion?: string
}

async function validateFile(path: string): Promise<ValidationError | null> {
  if (path.includes('/plans/') && !path.includes('/archive/')) {
    const result = await parsePlanFile(path)
    if (!result.ok) {
      return { path, error: result.error.message, suggestion: result.error.suggestion }
    }
  } else if (path.includes('/initiatives/') && !path.includes('/archive/')) {
    const result = await parseInitiativeFile(path)
    if (!result.ok) {
      return { path, error: result.error.message, suggestion: result.error.suggestion }
    }
  }
  return null
}

async function collectMdFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir)
    return entries
      .filter((f) => f.endsWith('.md') && f !== 'archive')
      .map((f) => join(dir, f))
  } catch {
    return []
  }
}

async function validateAll(): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  const planFiles = await collectMdFiles(join(ROOT, 'plans'))
  const initFiles = await collectMdFiles(join(ROOT, 'initiatives'))

  for (const f of [...planFiles, ...initFiles]) {
    const result = await validateFile(f)
    if (result) errors.push(result)
  }

  return errors
}

async function main() {
  if (singleFile) {
    const result = await validateFile(resolve(singleFile))
    if (result) {
      process.stderr.write(`⚠ VALIDATION ERROR: ${result.path}\n`)
      process.stderr.write(`  ${result.error}\n`)
      if (result.suggestion) process.stderr.write(`  Fix: ${result.suggestion}\n`)
      process.exit(1)
    }
    process.exit(0)
  }

  const errors = await validateAll()
  if (errors.length === 0) {
    process.stdout.write('✓ All .atomic-skills/ files valid\n')
    process.exit(0)
  }

  for (const e of errors) {
    process.stderr.write(`⚠ ${e.path}\n`)
    process.stderr.write(`  ${e.error}\n`)
    if (e.suggestion) process.stderr.write(`  Fix: ${e.suggestion}\n`)
    process.stderr.write('\n')
  }
  process.stderr.write(`${errors.length} validation error(s)\n`)
  process.exit(1)
}

main()
