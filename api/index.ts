import process from 'node:process'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Nothing is imported at module scope on purpose. Vercel answers a module-scope throw with
// an opaque FUNCTION_INVOCATION_FAILED and no stack, so every import happens inside the
// request where the error can be caught and returned instead.
//
// GET /__fn answers without touching the app at all: if that responds, this file is live and
// any failure is downstream of it; if it also 500s, the deployment is not running this code.
const BUILD = 'lazy-imports-2'

let handler: ((req: IncomingMessage, res: ServerResponse) => unknown) | undefined

export default async function (req: IncomingMessage, res: ServerResponse) {
  const send = (status: number, body: string) => {
    res.statusCode = status
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end(body)
  }

  if (req.url?.startsWith('/__fn')) {
    return send(200, `ok ${BUILD}\nnode ${process.version}\ncwd ${process.cwd()}`)
  }

  try {
    if (!handler) {
      const [{ handle }, { default: app }] = await Promise.all([
        import('@hono/node-server/vercel'),
        import('../dist/server.js')
      ])

      handler = handle(app as never)
    }

    return handler(req, res)
  } catch (error) {
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)

    send(500, `[${BUILD}] failed to load the app\n\n${detail}`)
  }
}
