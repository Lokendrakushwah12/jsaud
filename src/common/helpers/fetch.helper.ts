import { userAgents, type Endpoints } from '#common/constants'
import type { ApiContextEnum } from '#common/enums'

type EndpointValue = (typeof Endpoints)[keyof typeof Endpoints]

interface FetchParams {
  endpoint: EndpointValue
  params: Record<string, string | number>
  context?: ApiContextEnum
}

interface FetchResponse<T> {
  data: T
  ok: Response['ok']
}

// This module also runs on workerd, where `node:process` cannot be imported without nodejs_compat.
// eslint-disable-next-line node/prefer-global/process
const TTL_MS = Number(globalThis.process?.env?.CACHE_TTL_MS ?? 300_000)
const MAX_ENTRIES = 500
const TIMEOUT_MS = 8000
const ATTEMPTS = 3

/**
 * Process-local response cache. JioSaavn is the bottleneck, not this service:
 * every uncached request is one upstream call, and their WAF rate-limits by IP.
 *
 * ponytail: a Map is enough for a single process or Worker isolate. Reach for
 * caches.default / Redis only when you run enough instances that the hit rate suffers.
 */
const cache = new Map<string, { expires: number; value: unknown }>()

const readCache = <T>(key: string): T | undefined => {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (hit.expires < Date.now()) {
    cache.delete(key)
    return undefined
  }
  // Refresh insertion order so the eviction below is LRU rather than FIFO.
  cache.delete(key)
  cache.set(key, hit)
  return hit.value as T
}

const writeCache = (key: string, value: unknown) => {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!)
  cache.set(key, { expires: Date.now() + TTL_MS, value })
}

export const useFetch = async <T>({ endpoint, params, context }: FetchParams): Promise<FetchResponse<T>> => {
  const url = new URL('https://www.jiosaavn.com/api.php')

  url.searchParams.append('__call', endpoint.toString())
  url.searchParams.append('_format', 'json')
  url.searchParams.append('_marker', '0')
  url.searchParams.append('api_version', '4')
  url.searchParams.append('ctx', context || 'web6dot0')

  Object.keys(params).forEach((key) => url.searchParams.append(key, String(params[key])))

  const key = url.toString()
  const cached = readCache<T>(key)
  if (cached !== undefined) return { data: cached, ok: true }

  let lastError: unknown

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    // A fresh User-Agent per attempt: JioSaavn answers 403 to unknown or repeated agents.
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)]

    try {
      const response = await fetch(key, {
        headers: { 'Content-Type': 'application/json', 'User-Agent': randomUserAgent },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })

      // 4xx other than 403 means we asked for something that does not exist — retrying cannot help.
      if (!response.ok && response.status !== 403 && response.status < 500) {
        return { data: (await response.json()) as T, ok: false }
      }

      if (!response.ok) throw new Error(`upstream responded ${response.status}`)

      const data = (await response.json()) as T
      writeCache(key, data)

      return { data, ok: true }
    } catch (error) {
      lastError = error
      // Exponential-ish backoff, skipped after the final attempt.
      if (attempt < ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt))
    }
  }

  throw new Error(`jiosaavn request failed after ${ATTEMPTS} attempts: ${String(lastError)}`)
}
