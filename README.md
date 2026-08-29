# jsaud

An unofficial JioSaavn API — key-free JSON access to songs, albums, artists, playlists and the
browse feeds — plus a Spotify-style web player that runs on top of it.

> **This is a fork of [sumitkolhe/jiosaavn-api](https://github.com/sumitkolhe/jiosaavn-api)** (MIT).
> Upstream is in maintenance mode: two commits in the last sixteen months, several open breakage
> reports, and its reference instance `saavn.dev` no longer resolves. This fork adds response
> caching, retries, the browse endpoints, a web player, and fixes for the bugs listed below.

## What this fork adds

| | |
|---|---|
| **Response cache** | A TTL cache inside `useFetch`, the one place every upstream call passes through. Repeat requests never reach JioSaavn — measured 405ms cold, 1.6ms warm. |
| **Retries + timeout** | 8s timeout, three attempts with a fresh User-Agent, exponential backoff. JioSaavn answers 403 to agents it dislikes; retrying with another usually succeeds. A 404 is not retried. |
| **CDN cache headers** | `s-maxage=300, stale-while-revalidate=600` on every `/api/*` response, so a CDN in front absorbs repeat traffic. |
| **`GET /trending`, `GET /modules`** | The browse feeds upstream never routed ([#186](https://github.com/sumitkolhe/jiosaavn-api/issues/186)) — trending, new releases, charts and top playlists. |
| **Suggestions crash fixed** | An exhausted station returns `{stationid, error: "No new"}`; upstream spread that into the song list and crashed on `song.id` ([#180](https://github.com/sumitkolhe/jiosaavn-api/issues/180)). Now returns an empty list. |
| **`web/`** | A React 19 + Vite + Tailwind v4 player: search, album/artist/playlist pages, queue, endless radio, bitrate picker, OS media keys. |

## Running it

You need **Bun 1.0.29+** or **Node 20+**. Two servers — the API and the player:

```sh
bun install && PORT=3001 bun run dev      # API on :3001, docs at /docs
```

```sh
cd web && bun install && bun run dev      # player on :5173
```

Vite proxies `/api` to `:3001`, so there is no CORS setup and no API URL to configure locally.
Open http://localhost:5173.

The API alone needs no configuration at all — there is no key, no account, no `.env`. It calls
JioSaavn's own endpoints and decrypts the media URLs locally.

| Env var | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | API | 3000 | Port to listen on |
| `CACHE_TTL_MS` | API | 300000 | How long upstream responses stay cached |
| `VITE_API_URL` | web | *(empty)* | Set only when the player and API are on different origins |

## Endpoints

Interactive docs at `/docs`, OpenAPI spec at `/swagger`. All routes are under `/api`.

- `GET /search?query=` — combined autocomplete
- `GET /search/{songs,albums,artists,playlists}?query=&page=&limit=`
- `GET /songs?ids=|link=`, `/songs/{id}`, `/songs/{id}/suggestions?limit=`
- `GET /albums?id=|link=`
- `GET /artists?id=|link=`, `/artists/{id}`, `/artists/{id}/songs`, `/artists/{id}/albums`
- `GET /playlists?id=|link=`
- `GET /trending?limit=` — mixed feed; the `type` field says which detail endpoint to call next
- `GET /modules?limit=` — `{ trending, newAlbums, charts, topPlaylists }`

## Deploying

**API** — Vercel (`vercel.json` is configured, region `bom1`) or Cloudflare Workers
(`bun run deploy`, via `wrangler.toml`). On Vercel the CDN honours the cache headers; on Workers
only the in-process cache applies, since Workers do not cache their own responses without the
Cache API.

**Player** — any static host. `cd web && bun run build` emits `dist/`. Set `VITE_API_URL` to your
API deployment unless both are served from one origin.

One caveat worth knowing before you point traffic at it: JioSaavn rate-limits and WAF-blocks by IP,
and datacenter ranges are what they flag first. A deployment can work locally and 403 from Vercel.
The cache and retries are there to make that less likely, not to make it impossible.

## Tests

```sh
bun run test
```

Most tests hit the live JioSaavn API; `src/common/helpers/fetch.helper.spec.ts` stubs `fetch`
and covers the cache, the 403 retry, and the no-retry-on-404 path.

## Credits & licence

All the hard parts — the endpoint map, the Zod models, the DES media-URL decryption — are
[Sumit Kolhe's](https://github.com/sumitkolhe). MIT, same as upstream. Unofficial and unaffiliated
with JioSaavn; it depends on undocumented endpoints that can change or be blocked without notice.
