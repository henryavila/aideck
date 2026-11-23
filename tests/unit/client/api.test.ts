import { describe, it, expect, vi, afterEach } from 'vitest'
import { DataSourceError, fetchDataSource } from '../../../src/client/api.js'

function mockFetch(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDataSource', () => {
  it('returns the records from a successful response', async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ records: [{ id: 'a' }] }) })

    await expect(fetchDataSource('alpha', 'plans')).resolves.toEqual([{ id: 'a' }])
  })

  it('throws a DataSourceError carrying the server code, message and suggestion', async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => ({
        schemaVersion: '0.1',
        error: {
          code: 'io_error',
          message: 'failed to parse data source "plans": Unexpected token',
          suggestion: 'Fix the JSON file at data/plans.json and retry.',
        },
      }),
    })

    const error = await fetchDataSource('alpha', 'plans').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(DataSourceError)
    expect(error).toMatchObject({
      code: 'io_error',
      message: 'failed to parse data source "plans": Unexpected token',
      suggestion: 'Fix the JSON file at data/plans.json and retry.',
    })
  })

  it('throws a generic DataSourceError when the error body is not JSON', async () => {
    mockFetch({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON')
      },
    })

    const error = await fetchDataSource('alpha', 'plans').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(DataSourceError)
    expect((error as Error).message).toContain('502')
  })
})
