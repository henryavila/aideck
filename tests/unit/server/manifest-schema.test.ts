import { describe, expect, it } from 'vitest'
import { parseManifest } from '../../../src/server/manifest-schema.js'

const minimalManifest = {
  schemaVersion: '0.1',
  id: 'my-consumer',
  mcpNamespace: 'my_consumer',
  title: 'My Consumer',
  dataSources: [],
  pages: []
}

describe('parseManifest', () => {
  it('accepts a minimal valid manifest with only required fields', () => {
    const result = parseManifest(minimalManifest)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.schemaVersion).toBe('0.1')
      expect(result.value.id).toBe('my-consumer')
      expect(result.value.mcpNamespace).toBe('my_consumer')
    }
  })

  it('rejects a manifest missing schemaVersion', () => {
    const raw = { ...minimalManifest, schemaVersion: undefined }
    const result = parseManifest(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('schema_version_mismatch')
    }
  })

  it('rejects mcpNamespace with hyphens', () => {
    const raw = { ...minimalManifest, mcpNamespace: 'my-consumer' }
    const result = parseManifest(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_input')
      expect(result.error.message).toContain('mcpNamespace')
    }
  })

  it('rejects mcpNamespace that starts with a digit', () => {
    const raw = { ...minimalManifest, mcpNamespace: '1consumer' }
    const result = parseManifest(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_input')
    }
  })

  it('rejects mcpNamespace that starts with an uppercase letter', () => {
    const raw = { ...minimalManifest, mcpNamespace: 'MyConsumer' }
    const result = parseManifest(raw)
    expect(result.ok).toBe(false)
  })

  it('accepts dataSources with all four formats', () => {
    const raw = {
      ...minimalManifest,
      dataSources: [
        { id: 'a', path: 'data/a.yaml', format: 'yaml' },
        { id: 'b', path: 'data/b/*.md', format: 'frontmatter' },
        { id: 'c', path: 'data/c.json', format: 'json' },
        { id: 'd', path: 'data/d.jsonl', format: 'jsonl' }
      ]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.dataSources).toHaveLength(4)
    }
  })

  it('rejects a dataSource with an unknown format', () => {
    const raw = {
      ...minimalManifest,
      dataSources: [{ id: 'a', path: 'data/a.csv', format: 'csv' }]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_input')
    }
  })

  it('accepts a sections layout page with widgets', () => {
    const raw = {
      ...minimalManifest,
      pages: [
        {
          slug: 'overview',
          title: 'Overview',
          layout: 'sections',
          sections: [
            {
              title: 'Active Plans',
              collapsible: true,
              columns: 12,
              gap: 16,
              widgets: [
                {
                  widget: 'stat',
                  colSpan: 3,
                  source: { ref: 'plans' },
                  config: { value: 'count(status=active)', label: 'Active Plans' },
                  responsive: { sm: { colSpan: 6 } }
                }
              ]
            }
          ]
        }
      ]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const page = result.value.pages[0]
      expect(page.layout).toBe('sections')
      if (page.layout === 'sections') {
        expect(page.sections).toHaveLength(1)
      }
    }
  })

  it('accepts a grid layout page with widgets', () => {
    const raw = {
      ...minimalManifest,
      pages: [
        {
          slug: 'board',
          title: 'Task Board',
          layout: 'grid',
          columns: 12,
          rowHeight: 48,
          gap: 12,
          widgets: [
            {
              widget: 'kanban-board',
              colStart: 1,
              colSpan: 12,
              rowSpan: 8,
              source: { ref: 'tasks', filter: { status: 'active' } }
            }
          ]
        }
      ]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.pages[0].layout).toBe('grid')
    }
  })

  it('accepts a single layout page', () => {
    const raw = {
      ...minimalManifest,
      pages: [
        {
          slug: 'plan-detail',
          title: 'Plan: {plan.title}',
          layout: 'single',
          route: ':planSlug',
          widget: 'tree-view',
          source: { ref: 'plans', param: 'planSlug' }
        }
      ]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.pages[0].layout).toBe('single')
    }
  })

  it('accepts a tool with a file-mutation handler', () => {
    const raw = {
      ...minimalManifest,
      tools: [
        {
          name: 'update_status',
          description: 'Record a status change intent',
          input: {
            type: 'object',
            required: ['taskId', 'newStatus'],
            properties: {
              taskId: { type: 'string' },
              newStatus: { type: 'string', enum: ['pending', 'active', 'done'] }
            }
          },
          handler: {
            type: 'file-mutation',
            target: 'data/inbox/{{ isoDate }}.jsonl',
            operation: 'append',
            record: { kind: 'status_change', taskId: '{{ taskId }}' }
          }
        }
      ]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const tool = result.value.tools?.[0]
      expect(tool?.handler.type).toBe('file-mutation')
    }
  })

  it('accepts a tool with a script handler', () => {
    const raw = {
      ...minimalManifest,
      tools: [
        {
          name: 'mark_task_done',
          description: 'Mark a task as done by ID',
          input: {
            type: 'object',
            required: ['taskId'],
            properties: {
              taskId: { type: 'string' }
            }
          },
          handler: {
            type: 'script',
            source: 'handlers/mark-task-done.js'
          }
        }
      ]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.tools?.[0]?.handler.type).toBe('script')
    }
  })

  it('accepts a tool with a shell-exec handler', () => {
    const raw = {
      ...minimalManifest,
      tools: [
        {
          name: 'run_linter',
          description: 'Run the linter on the project',
          input: {
            type: 'object',
            properties: {}
          },
          handler: {
            type: 'shell-exec',
            command: 'npm run lint',
            timeout: 30000
          }
        }
      ]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const handler = result.value.tools?.[0]?.handler
      expect(handler?.type).toBe('shell-exec')
      if (handler?.type === 'shell-exec') {
        expect(handler.timeout).toBe(30000)
      }
    }
  })

  it('accepts a tool with a composite handler including nested composite for recursion', () => {
    const raw = {
      ...minimalManifest,
      tools: [
        {
          name: 'multi_step',
          description: 'Run multiple steps in sequence',
          input: {
            type: 'object',
            properties: {}
          },
          handler: {
            type: 'composite',
            steps: [
              {
                type: 'file-mutation',
                target: 'data/inbox/step1.jsonl',
                operation: 'append',
                record: { kind: 'step1' }
              },
              {
                type: 'composite',
                steps: [
                  {
                    type: 'shell-exec',
                    command: 'echo done'
                  },
                  {
                    type: 'script',
                    source: 'handlers/finalize.js'
                  }
                ]
              }
            ]
          }
        }
      ]
    }
    const result = parseManifest(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const handler = result.value.tools?.[0]?.handler
      expect(handler?.type).toBe('composite')
      if (handler?.type === 'composite') {
        expect(handler.steps).toHaveLength(2)
        expect(handler.steps[1].type).toBe('composite')
      }
    }
  })

  it('rejects a manifest with schemaVersion 0.2', () => {
    const raw = { ...minimalManifest, schemaVersion: '0.2' }
    const result = parseManifest(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('schema_version_mismatch')
    }
  })
})
