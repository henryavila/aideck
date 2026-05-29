import { readFile, readdir } from 'node:fs/promises'
import { join, basename, dirname } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { ErrorResponse } from '../schemas/common.js'
import { type Result, err, ok } from '../schemas/validators/index.js'
import type { DataSourceDecl } from './manifest-schema.js'
import { splitFrontmatter } from './parsers/frontmatter.js'
import { resolveWithinDir } from './writers/path-guard.js'

export interface DataSourceResult {
  dataSourceId: string
  records: Record<string, unknown>[]
  files: string[]
}

async function expandGlob(consumerDir: string, pattern: string): Promise<string[]> {
  const starIdx = pattern.indexOf('*')
  if (starIdx === -1) {
    const abs = resolveWithinDir(consumerDir, pattern)
    return abs ? [abs] : []
  }

  const slashBefore = pattern.lastIndexOf('/', starIdx)
  const dirPart = slashBefore === -1 ? '' : pattern.slice(0, slashBefore)
  const filePart = pattern.slice(slashBefore + 1)

  // filePart may contain '*': convert to a prefix/suffix match
  const [prefixPart, suffixPart] = filePart.split('*') as [string, string | undefined]
  const suffix = suffixPart ?? ''

  const absDir = resolveWithinDir(consumerDir, dirPart)
  if (absDir === null) return []
  let entries: string[]
  try {
    entries = await readdir(absDir)
  } catch {
    return []
  }

  return entries
    .filter((e) => e.startsWith(prefixPart) && e.endsWith(suffix))
    .map((e) => join(absDir, e))
}

function normalizeToRecords(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[]
  }
  if (parsed !== null && typeof parsed === 'object') {
    return [parsed as Record<string, unknown>]
  }
  return []
}

async function readYamlFile(filePath: string): Promise<Record<string, unknown>[]> {
  const raw = await readFile(filePath, 'utf8')
  const parsed = parseYaml(raw)
  return normalizeToRecords(parsed)
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown>[]> {
  const raw = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  return normalizeToRecords(parsed)
}

async function readJsonlFile(filePath: string): Promise<Record<string, unknown>[]> {
  const raw = await readFile(filePath, 'utf8')
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

async function readFrontmatterFile(filePath: string): Promise<Record<string, unknown>[]> {
  const raw = await readFile(filePath, 'utf8')
  const split = splitFrontmatter(raw)
  if (split === null) return []
  const fm = parseYaml(split.frontmatter) as Record<string, unknown> | null
  const record: Record<string, unknown> = {
    ...(fm ?? {}),
    _body: split.body,
    _file: basename(filePath)
  }
  return [record]
}

export async function readDataSource(
  consumerDir: string,
  decl: DataSourceDecl
): Promise<Result<DataSourceResult, ErrorResponse>> {
  const filePaths = await expandGlob(consumerDir, decl.path)

  const records: Record<string, unknown>[] = []
  const resolvedFiles: string[] = []

  for (const filePath of filePaths) {
    try {
      let fileRecords: Record<string, unknown>[]
      switch (decl.format) {
        case 'yaml':
          fileRecords = await readYamlFile(filePath)
          break
        case 'json':
          fileRecords = await readJsonFile(filePath)
          break
        case 'jsonl':
          fileRecords = await readJsonlFile(filePath)
          break
        case 'frontmatter':
          fileRecords = await readFrontmatterFile(filePath)
          break
      }
      records.push(...fileRecords)
      resolvedFiles.push(filePath)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return err({
        code: 'io_error',
        message: `Failed to read data source "${decl.id}" from "${filePath}": ${message}`,
        details: { dataSourceId: decl.id, filePath }
      })
    }
  }

  return ok({ dataSourceId: decl.id, records, files: resolvedFiles })
}
