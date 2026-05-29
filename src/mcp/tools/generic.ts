import { z } from 'zod'
import { join, resolve } from 'node:path'
import { err, ok } from '../../schemas/validators/index.js'
import { readDataSource } from '../../server/data-source-reader.js'
import { appendJsonlLine } from '../../server/writers/jsonl-append.js'
import { isWithinDir } from '../../server/writers/path-guard.js'
import type { ToolRegistry } from '../registry.js'
import type { ConsumerRegistry } from '../../server/consumer-registry.js'

export function registerGenericTools(
  registry: ToolRegistry,
  consumers: ConsumerRegistry,
  version: string,
  startedAt?: number
): void {
  const launchMs = startedAt ?? Date.now()

  // v0.1 meta tools may already register aideck_list_consumers, aideck_health,
  // and aideck_schema_version. When both v0.1 and v2 tool sets coexist, the
  // v0.1 versions take precedence — skip duplicates silently.
  const safeRegister: typeof registry.register = (tool) => {
    if (!registry.has(tool.name)) registry.register(tool)
  }

  safeRegister({
    name: 'aideck_list_consumers',
    description: 'List all registered consumers with their metadata.',
    inputSchema: z.object({}),
    handler(_input, _ctx) {
      const list = consumers.list().map((c) => ({
        id: c.id,
        title: c.manifest.title,
        icon: c.manifest.icon,
        dataSourceCount: c.manifest.dataSources.length,
        pageCount: c.manifest.pages.length
      }))
      return ok({ consumers: list })
    }
  })

  safeRegister({
    name: 'aideck_list',
    description:
      'List all records from a named data source. Optionally filter by key=value pairs.',
    inputSchema: z.object({
      consumer: z.string().min(1),
      dataSource: z.string().min(1),
      filter: z.record(z.unknown()).optional()
    }),
    async handler(input, _ctx) {
      const consumer = consumers.get(input.consumer)
      if (!consumer) {
        return err({
          code: 'consumer_unknown',
          message: `consumer "${input.consumer}" not found`,
          suggestion: `Available: ${consumers.list().map((c) => c.id).join(', ') || 'none'}`
        })
      }

      const decl = consumer.manifest.dataSources.find((ds) => ds.id === input.dataSource)
      if (!decl) {
        return err({
          code: 'path_not_found',
          message: `dataSource "${input.dataSource}" not declared in consumer "${input.consumer}"`,
          suggestion: `Available: ${consumer.manifest.dataSources.map((ds) => ds.id).join(', ')}`
        })
      }

      const result = await readDataSource(consumer.dir, decl)
      if (!result.ok) return result

      let records = result.value.records
      if (input.filter) {
        for (const [key, value] of Object.entries(input.filter)) {
          records = records.filter((r) => r[key] === value)
        }
      }

      return ok({ records, count: records.length })
    }
  })

  safeRegister<
    { consumer: string; dataSource: string; slug?: string },
    { records: Record<string, unknown>[] } | { record: Record<string, unknown> }
  >({
    name: 'aideck_read',
    description:
      'Read records from a data source. If slug is supplied, returns the single matching record.',
    inputSchema: z.object({
      consumer: z.string().min(1),
      dataSource: z.string().min(1),
      slug: z.string().optional()
    }),
    async handler(input, _ctx) {
      const consumer = consumers.get(input.consumer)
      if (!consumer) {
        return err({
          code: 'consumer_unknown',
          message: `consumer "${input.consumer}" not found`,
          suggestion: `Available: ${consumers.list().map((c) => c.id).join(', ') || 'none'}`
        })
      }

      const decl = consumer.manifest.dataSources.find((ds) => ds.id === input.dataSource)
      if (!decl) {
        return err({
          code: 'path_not_found',
          message: `dataSource "${input.dataSource}" not declared in consumer "${input.consumer}"`,
          suggestion: `Available: ${consumer.manifest.dataSources.map((ds) => ds.id).join(', ')}`
        })
      }

      const result = await readDataSource(consumer.dir, decl)
      if (!result.ok) return result

      if (!input.slug) {
        return ok({ records: result.value.records })
      }

      const slug = input.slug
      const match = result.value.records.find(
        (r) => r['slug'] === slug || r['id'] === slug || r['_file'] === slug
      )
      if (!match) {
        return err({
          code: 'slug_not_found',
          message: `no record with slug/id/file "${slug}" in dataSource "${input.dataSource}"`
        })
      }
      return ok({ record: match })
    }
  })

  safeRegister({
    name: 'aideck_write',
    description:
      'Append a JSONL record to a writable path within the consumer directory. Target must start with data/.',
    inputSchema: z.object({
      consumer: z.string().min(1),
      target: z.string().min(1),
      record: z.record(z.unknown())
    }),
    async handler(input, _ctx) {
      if (!input.target.startsWith('data/')) {
        return err({
          code: 'invalid_input',
          message: `target must start with "data/" (got "${input.target}")`,
          suggestion: 'Only paths under data/ are writable via aideck_write'
        })
      }

      const consumer = consumers.get(input.consumer)
      if (!consumer) {
        return err({
          code: 'consumer_unknown',
          message: `consumer "${input.consumer}" not found`,
          suggestion: `Available: ${consumers.list().map((c) => c.id).join(', ') || 'none'}`
        })
      }

      const absolutePath = resolve(consumer.dir, input.target)
      if (!isWithinDir(absolutePath, join(consumer.dir, 'data'))) {
        return err({
          code: 'invalid_input',
          message: `target escapes the consumer data directory: "${input.target}"`,
          suggestion: 'Targets must stay within data/ (no "../" path traversal).'
        })
      }
      await appendJsonlLine(absolutePath, input.record)
      return ok({ path: absolutePath })
    }
  })

  safeRegister({
    name: 'aideck_health',
    description: 'Return server health status, version, consumer count, and uptime.',
    inputSchema: z.object({}),
    handler(_input, _ctx) {
      return ok({
        status: 'ok' as const,
        version,
        consumerCount: consumers.list().length,
        uptimeMs: Date.now() - launchMs
      })
    }
  })

  safeRegister({
    name: 'aideck_schema_version',
    description: 'Return the schema version and API version supported by this server.',
    inputSchema: z.object({}),
    handler(_input, _ctx) {
      return ok({
        schemaVersion: '0.1' as const,
        apiVersion: '0.1' as const,
        version
      })
    }
  })
}
