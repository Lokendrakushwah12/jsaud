import { handle } from '@hono/node-server/vercel'
import app from '../dist/server.js'

// Vercel turns every file under api/ into a serverless function, and vercel.json
// rewrites all traffic here. Upstream deleted this file in fc6bd13, which left the
// rewrite pointing at nothing — every route 404s without it.
export default handle(app)
