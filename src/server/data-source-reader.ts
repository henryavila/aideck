import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { ErrorResponse } from '../schemas/common.js'
import { type Result, err, ok } from '../schemas/validators/index.js'
import type { DataSourceDecl } from './manifest-schema.js'
import { splitFrontmatter } from './parsers/frontmatter.js'
import { isWithinDir, resolveWithinDir } from './writers/path-guard.js'

export interface DataSourceResult {
  dataSourceId: string
  records: Record<string, unknown>[]
  files: string[]
}

/** A matched file plus the values captured by the glob's wildcard segments. */
interface GlobMatch {
  filePath: string
  /** One entry per wildcard (`*` / `**`) segment, in left-to-right order. */
  captures: string[]
}

async function listEntries(dir: string): Promise<{ name: string; isDir: boolean }[]> {
  try {
    const ents = await readdir(dir, { withFileTypes: true })
    return ents.map((e) => ({ name: e.name, isDir: e.isDirectory() }))
  } catch {
    return []
  }
}

/**
 * Build a matcher for a single path segment that may contain one or more `*`
 * wildcards (e.g. `*`, `f*-*.md`). Each `*` matches any run of characters
 * within the one segment. Order-preserving substring match between the
 * literal parts.
 */
function segmentMatcher(seg: string): (name: string) => boolean {
  if (!seg.includes('*')) return (n) => n === seg
  const parts = seg.split('*')
  return (n) => {
    let pos = 0
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      if (p === '') continue
      if (i === 0) {
        if (!n.startsWith(p)) return false
        pos = p.length
      } else if (i === parts.length - 1) {
        if (!n.endsWith(p) || n.length - p.length < pos) return false
      } else {
        const found = n.indexOf(p, pos)
        if (found === -1) return false
        pos = found + p.length
      }
    }
    return true
  }
}

/**
 * Walk `segments` from `currentDir`, only ever descending into real directory
 * entries (so `..`/symlink-name traversal can't be expressed — readdir never
 * yields `..`). `**` matches any depth (including zero) and contributes a
 * single capture = the joined matched path. A final containment check against
 * `baseDir` is the backstop.
 */
async function walkSegments(
  baseDir: string,
  currentDir: string,
  segments: string[],
  idx: number,
  caps: string[]
): Promise<GlobMatch[]> {
  if (idx >= segments.length) return []
  const seg = segments[idx]
  const isLast = idx === segments.length - 1
  const out: GlobMatch[] = []

  if (seg === '**') {
    // Enumerate currentDir + every descendant directory, each with its
    // relative path, then continue matching the rest of the pattern there.
    const candidates: { dir: string; rel: string }[] = []
    const queue: { dir: string; rel: string }[] = [{ dir: currentDir, rel: '' }]
    while (queue.length > 0) {
      const cur = queue.shift() as { dir: string; rel: string }
      candidates.push(cur)
      for (const e of await listEntries(cur.dir)) {
        if (e.isDir) {
          const next = { dir: join(cur.dir, e.name), rel: cur.rel ? `${cur.rel}/${e.name}` : e.name }
          queue.push(next)
        }
      }
    }
    for (const cand of candidates) {
      out.push(...(await walkSegments(baseDir, cand.dir, segments, idx + 1, [...caps, cand.rel])))
    }
    return out
  }

  const isWild = seg.includes('*')
  const match = segmentMatcher(seg)
  for (const e of await listEntries(currentDir)) {
    if (!match(e.name)) continue
    const abs = join(currentDir, e.name)
    const nextCaps = isWild ? [...caps, e.name] : caps
    if (isLast) {
      if (!e.isDir && isWithinDir(abs, baseDir)) out.push({ filePath: abs, captures: nextCaps })
    } else if (e.isDir) {
      out.push(...(await walkSegments(baseDir, abs, segments, idx + 1, nextCaps)))
    }
  }
  return out
}

async function expandGlob(baseDir: string, pattern: string): Promise<GlobMatch[]> {
  // No wildcard → resolve to the literal path WITHOUT an existence check, so a
  // missing single file surfaces as io_error downstream (contract preserved).
  if (!pattern.includes('*')) {
    const abs = resolveWithinDir(baseDir, pattern)
    return abs ? [{ filePath: abs, captures: [] }] : []
  }
  const segments = pattern.split('/').filter((s) => s.length > 0)
  return walkSegments(baseDir, baseDir, segments, 0, [])
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
  baseDir: string,
  decl: DataSourceDecl
): Promise<Result<DataSourceResult, ErrorResponse>> {
  const matches = await expandGlob(baseDir, decl.path)
  // Stable order: matches come from readdir (unordered) — sort by path so the
  // record set is deterministic across runs/platforms.
  matches.sort((a, b) => (a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : 0))

  const records: Record<string, unknown>[] = []
  const resolvedFiles: string[] = []

  for (const { filePath, captures } of matches) {
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
      // Inject glob captures (e.g. projectId, planSlug) onto every record read
      // from this file — the "flatten + projectId" grouping.
      if (decl.captures && decl.captures.length > 0) {
        for (let i = 0; i < decl.captures.length; i++) {
          const field = decl.captures[i]
          const value = captures[i]
          if (value !== undefined) {
            for (const rec of fileRecords) {
              if (rec[field] === undefined) rec[field] = value
            }
          }
        }
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
