import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { afterEach, describe, expect, it, vi } from 'vitest'

const stubFetch = (impl: () => Response) => {
  const spy = vi.fn(() => Promise.resolve(impl()))
  vi.stubGlobal('fetch', spy)
  return spy
}

// Each test uses its own query so the module-level cache cannot leak between them.
const call = (query: string) => useFetch({ endpoint: Endpoints.search.songs, params: { q: query } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFetch', () => {
  it('serves a repeated request from cache instead of calling jiosaavn twice', async () => {
    const spy = stubFetch(() => Response.json({ hello: 'world' }))

    const first = await call('cache-hit')
    const second = await call('cache-hit')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(second.data).toEqual(first.data)
    expect(second.ok).toBe(true)
  })

  it('retries with a new user agent when jiosaavn answers 403', async () => {
    let attempts = 0
    const spy = stubFetch(() => (++attempts < 3 ? new Response('blocked', { status: 403 }) : Response.json({ ok: 1 })))

    const { ok } = await call('retry-403')

    expect(spy).toHaveBeenCalledTimes(3)
    expect(ok).toBe(true)
  })

  it('does not retry a 404, and does not cache the failure', async () => {
    const spy = stubFetch(() => Response.json({ message: 'not found' }, { status: 404 }))

    const first = await call('no-retry-404')
    const second = await call('no-retry-404')

    expect(first.ok).toBe(false)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(second.ok).toBe(false)
  })
})
