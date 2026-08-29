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

This repo holds **two deployables**, so it needs **two Vercel projects** pointed at the same
repository. The only setting that differs is Root Directory.

### 1. The API

| Setting | Value |
|---|---|
| Root Directory | `./` (leave empty) |
| Framework Preset | Other |
| Build Command | `bun run build` (the default from `package.json`) |
| Output Directory | `dist` |
| Environment | none required |

`vercel.json` rewrites every request to `/api`, which Vercel serves from `api/index.ts`, and pins
execution to `bom1` (Mumbai) — the closest region to JioSaavn's own infrastructure.

> Upstream commit `fc6bd13` deleted `api/index.ts` while leaving that rewrite in place, so a
> deployment of upstream `main` has nothing to serve. This fork restores it. If you pull from
> upstream again, check that the file survived.

### 2. The player

| Setting | Value |
|---|---|
| Root Directory | **`web`** |
| Framework Preset | Vite (auto-detected) |
| Build Command | `bun run build` |
| Output Directory | `dist` |
| Environment | `VITE_API_URL` = the API project's URL |

Without `VITE_API_URL` the player calls `/api` on its own origin and every request 404s — the Vite
proxy that makes this work locally does not exist in a production build.

### Notes

- `warn: Ignoring lockfile ... Unknown lockfile version` on Vercel is a **warning, not a failure**.
  `web/bun.lock` is written by Bun 1.4 (`lockfileVersion: 2`) and Vercel's image ships Bun 1.3,
  which resolves dependencies fresh instead. Delete `web/bun.lock` if you want the warning gone,
  at the cost of pinned versions.
- Cloudflare Workers is the other option for the API (`bun run deploy`, via `wrangler.toml`). Note
  that Workers do not cache their own responses without the Cache API, so only the in-process cache
  applies there — the `s-maxage` header does nothing.

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
