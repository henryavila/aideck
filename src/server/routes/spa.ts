import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { Hono } from 'hono'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8'
}

export interface SpaDeps {
  /** Absolute path to the built client (e.g. `<repo>/dist/client`). */
  clientDir: string
}

export function createSpaRouter(deps: SpaDeps): Hono {
  const app = new Hono()
  const indexHtmlPath = join(deps.clientDir, 'index.html')

  app.get('*', async (c) => {
    const path = c.req.path
    if (path.startsWith('/api/') || path.startsWith('/sse')) {
      return c.json(
        { schemaVersion: '0.1', error: { code: 'path_not_found', message: `no route for ${path}` } },
        404
      )
    }

    // Try a static asset under the client dir; fall back to index.html for SPA routes.
    const asset = resolve(join(deps.clientDir, path === '/' ? 'index.html' : path))
    if (!asset.startsWith(resolve(deps.clientDir))) {
      // path traversal — refuse
      return c.text('not found', 404)
    }
    const tryAsset = path === '/' ? indexHtmlPath : asset
    try {
      const body = await readFile(tryAsset)
      const mime = MIME[extname(tryAsset)] ?? 'application/octet-stream'
      return new Response(body, { status: 200, headers: { 'content-type': mime } })
    } catch {
      try {
        const body = await readFile(indexHtmlPath)
        return new Response(body, { status: 200, headers: { 'content-type': MIME['.html'] } })
      } catch {
        return c.text('client bundle not built — run `npm run build:client`', 404)
      }
    }
  })

  return app
}
