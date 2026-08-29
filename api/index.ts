import type { IncomingMessage, ServerResponse } from 'node:http'

// Vercel turns every file under api/ into a serverless function, and vercel.json rewrites
// all traffic here. Upstream deleted this file in fc6bd13, which left the rewrite pointing
// at nothing.
//
// The imports are lazy on purpose: dist/ is build output, and a module-scope import that
// fails takes the whole function down with an opaque FUNCTION_INVOCATION_FAILED and no
// stack. Inside the request, a failure is at least catchable.
let handler: ((req: IncomingMessage, res: ServerResponse) => unknown) | undefined

export default async function (req: IncomingMessage, res: ServerResponse) {
  try {
    if (!handler) {
      const [{ handle }, { default: app }] = await Promise.all([
        import('@hono/node-server/vercel'),
        import('../dist/server.js')
      ])

      handler = handle(app as never)
    }

    return handler(req, res)
  } catch {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ success: false, message: 'the server failed to start' }))
  }
}
