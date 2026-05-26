import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createConsumerRegistry } from '../../src/server/consumer-registry.js'
import { createSchemaValidator } from '../../src/server/schema-validator.js'
import { readDataSource } from '../../src/server/data-source-reader.js'
import type { DataSourceDecl } from '../../src/server/manifest-schema.js'

// ─── fixtures ────────────────────────────────────────────────────────────────

const TODO_MANIFEST = `\
schemaVersion: '0.1'
id: todo
mcpNamespace: todo
title: Todo App
dataSources:
  - id: tasks
    path: 'data/tasks.yaml'
    format: yaml
pages:
  - slug: home
    title: Home
    layout: sections
    sections: []
`

const TODO_SCHEMA = JSON.stringify({
  $id: 'todo-schema',
  definitions: {
    task: {
      type: 'object',
      required: ['id', 'title'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        done: { type: 'boolean' }
      }
    }
  }
})

const TODO_TASKS_VALID = `\
- id: '1'
  title: Buy milk
  done: false
- id: '2'
  title: Write tests
  done: true
`

// id must be string but we give an integer to trigger validation_error
const TODO_TASKS_BAD = `\
- id: 1
  title: Buy milk
  done: false
`

const NOTES_MANIFEST = `\
schemaVersion: '0.1'
id: notes
mcpNamespace: notes
title: Notes App
dataSources:
  - id: entries
    path: 'data/entries.yaml'
    format: yaml
pages:
  - slug: home
    title: Home
    layout: sections
    sections: []
`

const NOTES_SCHEMA = JSON.stringify({
  $id: 'notes-schema',
  definitions: {
    entry: {
      type: 'object',
      required: ['id', 'body'],
      properties: {
        id: { type: 'string' },
        body: { type: 'string' }
      }
    }
  }
})

const NOTES_ENTRIES = `\
- id: 'n1'
  body: 'Hello world'
- id: 'n2'
  body: 'Second note'
`

// ─── helpers ─────────────────────────────────────────────────────────────────

async function writeConsumer(
  consumersDir: string,
  slug: string,
  manifest: string,
  schema: string,
  dataFiles: Record<string, string>
): Promise<void> {
  const dir = join(consumersDir, slug)
  await mkdir(join(dir, 'data'), { recursive: true })
  await writeFile(join(dir, 'manifest.yaml'), manifest, 'utf8')
  await writeFile(join(dir, 'schema.json'), schema, 'utf8')
  for (const [relPath, content] of Object.entries(dataFiles)) {
    await writeFile(join(dir, relPath), content, 'utf8')
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('consumer pipeline (F0 integration)', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-f0-'))
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  it('full pipeline: scan → load manifest → read data → validate', async () => {
    const consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir, { recursive: true })
    await writeConsumer(consumersDir, 'todo', TODO_MANIFEST, TODO_SCHEMA, {
      'data/tasks.yaml': TODO_TASKS_VALID
    })

    // Step 1: scan and register consumers
    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    expect(registry.errors()).toHaveLength(0)
    const consumer = registry.get('todo')
    expect(consumer).toBeDefined()
    expect(consumer!.manifest.title).toBe('Todo App')

    // Step 2: read data source declared in the manifest
    const decl: DataSourceDecl = consumer!.manifest.dataSources[0]
    const readResult = await readDataSource(consumer!.dir, decl)
    expect(readResult.ok).toBe(true)
    if (!readResult.ok) return

    expect(readResult.value.dataSourceId).toBe('tasks')
    expect(readResult.value.records).toHaveLength(2)

    // Step 3: load schema validator
    const schemaPath = join(consumer!.dir, 'schema.json')
    const validatorResult = await createSchemaValidator(schemaPath)
    expect(validatorResult.ok).toBe(true)
    if (!validatorResult.ok) return

    // Step 4: validate each record
    for (const record of readResult.value.records) {
      const v = validatorResult.value.validate(record, '#/definitions/task')
      expect(v.ok).toBe(true)
    }
  })

  it('reports validation_error for bad data', async () => {
    const consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir, { recursive: true })
    await writeConsumer(consumersDir, 'todo', TODO_MANIFEST, TODO_SCHEMA, {
      'data/tasks.yaml': TODO_TASKS_BAD
    })

    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    const consumer = registry.get('todo')
    expect(consumer).toBeDefined()

    const decl: DataSourceDecl = consumer!.manifest.dataSources[0]
    const readResult = await readDataSource(consumer!.dir, decl)
    expect(readResult.ok).toBe(true)
    if (!readResult.ok) return

    const schemaPath = join(consumer!.dir, 'schema.json')
    const validatorResult = await createSchemaValidator(schemaPath)
    expect(validatorResult.ok).toBe(true)
    if (!validatorResult.ok) return

    const badRecord = readResult.value.records[0]
    const v = validatorResult.value.validate(badRecord, '#/definitions/task')
    expect(v.ok).toBe(false)
    if (v.ok) return

    expect(v.error.code).toBe('validation_error')
    // message should point to the offending field
    expect(v.error.message).toMatch(/id/)
    // suggestion should say what type was expected
    expect(v.error.suggestion).toContain('expected string')
  })

  it('multi-consumer: two consumers loaded and isolated simultaneously', async () => {
    const consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir, { recursive: true })
    await writeConsumer(consumersDir, 'todo', TODO_MANIFEST, TODO_SCHEMA, {
      'data/tasks.yaml': TODO_TASKS_VALID
    })
    await writeConsumer(consumersDir, 'notes', NOTES_MANIFEST, NOTES_SCHEMA, {
      'data/entries.yaml': NOTES_ENTRIES
    })

    // Both consumers registered
    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    expect(registry.errors()).toHaveLength(0)
    const list = registry.list()
    expect(list).toHaveLength(2)
    const ids = list.map((c) => c.id).sort()
    expect(ids).toEqual(['notes', 'todo'])

    // Read data from each consumer independently
    const todo = registry.get('todo')!
    const notes = registry.get('notes')!

    const todoRead = await readDataSource(todo.dir, todo.manifest.dataSources[0])
    const notesRead = await readDataSource(notes.dir, notes.manifest.dataSources[0])

    expect(todoRead.ok).toBe(true)
    expect(notesRead.ok).toBe(true)
    if (!todoRead.ok || !notesRead.ok) return

    // Isolation: todo has tasks (title field), notes has entries (body field)
    expect(todoRead.value.dataSourceId).toBe('tasks')
    expect(todoRead.value.records).toHaveLength(2)
    expect(todoRead.value.records[0]).toHaveProperty('title')
    expect(todoRead.value.records[0]).not.toHaveProperty('body')

    expect(notesRead.value.dataSourceId).toBe('entries')
    expect(notesRead.value.records).toHaveLength(2)
    expect(notesRead.value.records[0]).toHaveProperty('body')
    expect(notesRead.value.records[0]).not.toHaveProperty('title')

    // Each validator only knows its own schema definitions
    const todoSchemaResult = await createSchemaValidator(join(todo.dir, 'schema.json'))
    const notesSchemaResult = await createSchemaValidator(join(notes.dir, 'schema.json'))
    expect(todoSchemaResult.ok).toBe(true)
    expect(notesSchemaResult.ok).toBe(true)
    if (!todoSchemaResult.ok || !notesSchemaResult.ok) return

    for (const record of todoRead.value.records) {
      expect(todoSchemaResult.value.validate(record, '#/definitions/task').ok).toBe(true)
    }
    for (const record of notesRead.value.records) {
      expect(notesSchemaResult.value.validate(record, '#/definitions/entry').ok).toBe(true)
    }

    // Cross-schema: a notes entry should fail the todo task schema (missing 'title')
    const crossV = todoSchemaResult.value.validate(notesRead.value.records[0], '#/definitions/task')
    expect(crossV.ok).toBe(false)
    if (crossV.ok) return
    expect(crossV.error.code).toBe('validation_error')
  })
})
