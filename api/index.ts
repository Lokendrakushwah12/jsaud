import { handle } from '@hono/node-server/vercel'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Vercel turns every file under api/ into a serverless function, and vercel.json rewrites
// all traffic here. Upstream deleted this file in fc6bd13, which left the rewrite pointing
// at nothing.
//
// The app is imported lazily inside the request rather than at module scope: dist/ is built
// output, so if it ever fails to resolve, a top-level import takes the whole function down
// with an opaque FUNCTION_INVOCATION_FAILED and no stack. This way the error is returned.
let handler: ((req: IncomingMessage, res: ServerResponse) => unknown) | undefined

export default async function (req: IncomingMessage, res: ServerResponse) {
  try {
    if (!handler) {
      const { default: app } = await import('../dist/server.js')
      handler = handle(app as never)
    }

    return handler(req, res)
  } catch (error) {
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)

    res.statusCode = 500
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end(`failed to load the app from dist/\n\n${detail}`)
  }
}
