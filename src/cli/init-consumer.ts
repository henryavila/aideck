import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface InitConsumerOptions {
  id: string
  title: string
  mcpNamespace: string
  baseDir?: string
}

function buildManifestYaml(id: string, title: string, mcpNamespace: string): string {
  return [
    "schemaVersion: '0.1'",
    `id: ${id}`,
    `mcpNamespace: ${mcpNamespace}`,
    `title: '${title}'`,
    '',
    'dataSources:',
    '  - id: items',
    "    path: 'data/items.yaml'",
    '    format: yaml',
    '',
    'pages:',
    '  - slug: home',
    "    title: 'Home'",
    '    layout: sections',
    '    default: true',
    '    sections:',
    "      - title: 'Items'",
    '        widgets:',
    '          - widget: table',
    '            colSpan: 12',
    '            source: { ref: items }',
    '',
  ].join('\n')
}

function buildSchemaJson(id: string): string {
  return JSON.stringify(
    {
      $id: `${id}-schema`,
      definitions: {
        item: {
          type: 'object',
          required: ['id', 'title'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
          },
        },
      },
    },
    null,
    2
  ) + '\n'
}

export async function runInitConsumer(opts: InitConsumerOptions): Promise<number> {
  const baseDir = opts.baseDir ?? join(homedir(), '.aideck')
  const consumerDir = join(baseDir, 'consumers', opts.id)

  // Fail if directory already exists
  try {
    await access(consumerDir)
    process.stderr.write(
      `aideck init-consumer: directory already exists: ${consumerDir}\n`
    )
    return 1
  } catch {
    // Does not exist — good to proceed
  }

  try {
    // Create directory structure
    await mkdir(join(consumerDir, 'data'), { recursive: true })
    await mkdir(join(consumerDir, 'handlers'), { recursive: true })
    await mkdir(join(consumerDir, 'components'), { recursive: true })

    // Write manifest.yaml
    await writeFile(
      join(consumerDir, 'manifest.yaml'),
      buildManifestYaml(opts.id, opts.title, opts.mcpNamespace)
    )

    // Write schema.json
    await writeFile(join(consumerDir, 'schema.json'), buildSchemaJson(opts.id))

    // Write data/items.yaml
    await writeFile(
      join(consumerDir, 'data', 'items.yaml'),
      "- id: '1'\n  title: 'Sample item'\n"
    )

    process.stdout.write(`Consumer "${opts.title}" created at ${consumerDir}\n`)
    return 0
  } catch (cause) {
    process.stderr.write(
      `aideck init-consumer: ${cause instanceof Error ? cause.message : String(cause)}\n`
    )
    return 1
  }
}
