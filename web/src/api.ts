export type Img = { quality: string; url: string }
export type Ref = { id: string | null; name: string | null; url?: string; image?: Img[] }

export type Song = {
  id: string
  name: string
  duration: number | null
  year: string | null
  language: string | null
  playCount: number | null
  album: Ref
  artists: { primary: Ref[]; featured: Ref[]; all: Ref[] }
  image: Img[]
  downloadUrl: Img[]
}

export type Album = {
  id: string
  name: string
  year: string | null
  songCount: number | null
  description?: string
  artists: { primary: Ref[] }
  image: Img[]
  songs?: Song[]
}

export type BrowseEntity = {
  id: string
  name: string
  subtitle: string | null
  type: string
  url: string | null
  language: string | null
  explicitContent: boolean
  image: Img[]
}

export type BrowseModules = {
  trending: BrowseEntity[]
  newAlbums: BrowseEntity[]
  charts: BrowseEntity[]
  topPlaylists: BrowseEntity[]
}

export type Artist = {
  id: string
  name: string
  followerCount?: number | null
  bio?: { text: string | null }[]
  image: Img[]
  topSongs?: Song[]
  topAlbums?: Album[]
}

// JioSaavn returns titles HTML-escaped ("Aashiqui &quot;2&quot;"). A detached textarea is the
// browser's own entity decoder; walking the parsed response fixes every field at one call site.
const decoder = document.createElement('textarea')
const dec = (s: string) => {
  if (!s.includes('&')) return s
  decoder.innerHTML = s
  return decoder.value
}

function decodeDeep<T>(value: T): T {
  if (typeof value === 'string') return dec(value) as T
  if (Array.isArray(value)) return value.map(decodeDeep) as T
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) (value as Record<string, unknown>)[k] = decodeDeep(v)
  }
  return value
}

// Empty in dev: vite proxies /api to the API server. Set VITE_API_URL when the two are
// deployed to different origins.
const BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const res = await fetch(`${BASE}/api${path}?${qs}`)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  const { data } = await res.json()
  return decodeDeep(data) as T
}

type Page<T> = { total: number; start: number; results: T[] }

export const searchSongs = (query: string, limit = 30) => get<Page<Song>>('/search/songs', { query, limit })
export const searchAlbums = (query: string, limit = 12) => get<Page<Album>>('/search/albums', { query, limit })
export const searchArtists = (query: string, limit = 12) => get<Page<Artist>>('/search/artists', { query, limit })
export const getAlbum = (id: string) => get<Album>('/albums', { id })
export const getArtist = (id: string) => get<Artist>(`/artists/${id}`, { songCount: 10, albumCount: 20 })
export const getSuggestions = (id: string, limit = 10) => get<Song[]>(`/songs/${id}/suggestions`, { limit })
export const getSong = (id: string) => get<Song[]>(`/songs/${id}`).then((songs) => songs[0])
// Playlists come back in the same shape as albums, so they render through the same page.
export const getPlaylist = (id: string) => get<Album>('/playlists', { id, limit: 100 })
export const getTrending = (limit = 20) => get<BrowseEntity[]>('/trending', { limit })
export const getModules = (limit = 12) => get<BrowseModules>('/modules', { limit })

export const QUALITIES = ['96kbps', '160kbps', '320kbps'] as const
export type Quality = (typeof QUALITIES)[number]

/** Falls back to the highest available bitrate when a song lacks the requested one. */
export const streamUrl = (song: Song, quality?: Quality) =>
  (quality && song.downloadUrl.find((d) => d.quality === quality)?.url) || song.downloadUrl.at(-1)?.url || ''
export const art = (images: Img[] | undefined, i = -1) => images?.at(i)?.url ?? ''
export const names = (refs: Ref[] | undefined) => refs?.map((r) => r.name).filter(Boolean).join(', ') ?? ''

export const fmt = (seconds: number | null | undefined) => {
  if (!seconds || !Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export const compact = (n: number | null | undefined) =>
  n ? new Intl.NumberFormat('en', { notation: 'compact' }).format(n) : ''
