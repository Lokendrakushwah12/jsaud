import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  art,
  compact,
  getAlbum,
  getArtist,
  getModules,
  getPlaylist,
  getSong,
  names,
  searchAlbums,
  searchArtists,
  searchSongs,
  type Album,
  type Artist,
  type BrowseEntity,
  type Song
} from './api'
import { Card, Shelf, SongRow } from './components'
import { usePlayer } from './player'

export type View =
  | { kind: 'home' }
  | { kind: 'search'; query: string }
  | { kind: 'album'; id: string }
  | { kind: 'artist'; id: string }
  | { kind: 'playlist'; id: string }

/** One tiny fetch-on-change hook — replaces a data library we do not need. */
function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let stale = false
    setLoading(true)
    fn()
      .then((d) => !stale && setData(d))
      .catch(() => !stale && setData(null))
      .finally(() => !stale && setLoading(false))
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading }
}

const albumCard = (a: Album, open: () => void, play?: () => void) => (
  <Card key={a.id} image={art(a.image)} title={a.name} subtitle={[a.year, names(a.artists?.primary)].filter(Boolean).join(' • ')} onOpen={open} onPlay={play} />
)

const artistCard = (a: Artist, open: () => void) => (
  <Card key={a.id} image={art(a.image)} title={a.name} subtitle="Artist" round onOpen={open} />
)

const Loading = () => <div className="p-8 text-muted">Loading…</div>

/** Trending mixes songs, albums and playlists, so each card routes by its own type. */
const entityCard = (
  entity: BrowseEntity,
  go: (v: View) => void,
  play: (songs: Song[], startAt?: number) => void
) => {
  const open = () => {
    if (entity.type === 'album') go({ kind: 'album', id: entity.id })
    else if (entity.type === 'playlist') go({ kind: 'playlist', id: entity.id })
    else if (entity.type === 'artist') go({ kind: 'artist', id: entity.id })
    else void getSong(entity.id).then((song) => song && play([song]))
  }

  return (
    <Card
      key={`${entity.type}-${entity.id}`}
      image={art(entity.image)}
      title={entity.name}
      subtitle={entity.subtitle || entity.type}
      round={entity.type === 'artist'}
      onOpen={open}
    />
  )
}

export function Home({ go }: { go: (v: View) => void }) {
  const { play } = usePlayer()
  const { data, loading } = useAsync(() => getModules(12), [])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (loading) return <Loading />

  const shelves: [string, BrowseEntity[]][] = [
    ['Trending now', data?.trending ?? []],
    ['New releases', data?.newAlbums ?? []],
    ['Charts', data?.charts ?? []],
    ['Top playlists', data?.topPlaylists ?? []]
  ]

  return (
    <div className="p-6">
      <h1 className="text-3xl leading-tight font-semibold tracking-tight">{greeting}</h1>
      {!data && <p className="mt-4 text-muted">Could not load the browse feed. Is the API running on :3001?</p>}
      {shelves
        .filter(([, items]) => items.length > 0)
        .map(([title, items]) => (
          <Shelf key={title} title={title}>
            {items.map((entity) => entityCard(entity, go, play))}
          </Shelf>
        ))}
    </div>
  )
}

export function Search({ query, go }: { query: string; go: (v: View) => void }) {
  const { play } = usePlayer()
  const { data, loading } = useAsync(
    async () => {
      const [songs, albums, artists] = await Promise.all([
        searchSongs(query),
        searchAlbums(query),
        searchArtists(query)
      ])
      // JioSaavn pads artist matches with imageless stubs; a wall of default avatars looks broken.
      const real = artists.results.filter((a) => !art(a.image).includes('/_i/'))
      return { songs: songs.results, albums: albums.results, artists: real }
    },
    [query]
  )

  if (loading) return <Loading />
  if (!data?.songs.length) return <div className="p-8 text-muted">No results for “{query}”.</div>

  return (
    <div className="p-6">
      <h2 className="mb-2 px-3 text-2xl font-semibold tracking-tight">Songs</h2>
      {data.songs.slice(0, 8).map((s, i) => (
        <SongRow key={s.id} song={s} n={i + 1} onPlay={() => play(data.songs, i)} />
      ))}
      {!!data.artists.length && (
        <Shelf title="Artists">{data.artists.map((a) => artistCard(a, () => go({ kind: 'artist', id: a.id })))}</Shelf>
      )}
      {!!data.albums.length && (
        <Shelf title="Albums">{data.albums.map((a) => albumCard(a, () => go({ kind: 'album', id: a.id })))}</Shelf>
      )}
    </div>
  )
}

function Header({
  kind,
  title,
  image,
  meta,
  round,
  onPlay
}: {
  kind: string
  title: string
  image: string
  meta: string
  round?: boolean
  onPlay: () => void
}) {
  return (
    <>
      <div className="flex items-end gap-6 bg-gradient-to-b from-white/15 to-transparent p-6 pt-14">
        <img src={image} alt="" className={`size-52 shrink-0 object-cover shadow-2xl ${round ? 'rounded-full' : 'rounded'}`} />
        <div className="min-w-0 pb-2">
          <div className="text-xs font-medium tracking-wide uppercase">{kind}</div>
          <h1 className="mt-2 truncate text-5xl leading-tight font-semibold tracking-tight">{title}</h1>
          <p className="mt-4 text-sm text-muted">{meta}</p>
        </div>
      </div>
      <div className="px-6 py-4">
        <button
          onClick={onPlay}
          className="grid size-14 place-items-center rounded-full bg-accent text-black shadow-xl transition hover:scale-105"
          aria-label={`Play ${title}`}
        >
          <Play size={24} className="ml-1 fill-black" />
        </button>
      </div>
    </>
  )
}

const trackList = (songs: Song[], play: (s: Song[], i: number) => void, showAlbum = true) => (
  <div className="px-3 pb-6">
    {songs.map((s, i) => (
      <SongRow key={s.id} song={s} n={i + 1} showAlbum={showAlbum} onPlay={() => play(songs, i)} />
    ))}
  </div>
)

export function AlbumPage({ id }: { id: string }) {
  const { play } = usePlayer()
  const { data, loading } = useAsync<Album>(() => getAlbum(id), [id])
  if (loading) return <Loading />
  if (!data) return <div className="p-8 text-muted">Album not found.</div>
  const songs = data.songs ?? []
  return (
    <>
      <Header
        kind="Album"
        title={data.name}
        image={art(data.image)}
        meta={[names(data.artists?.primary), data.year, `${songs.length} songs`].filter(Boolean).join(' • ')}
        onPlay={() => songs.length && play(songs, 0)}
      />
      {trackList(songs, play, false)}
    </>
  )
}

export function PlaylistPage({ id }: { id: string }) {
  const { play } = usePlayer()
  const { data, loading } = useAsync<Album>(() => getPlaylist(id), [id])
  if (loading) return <Loading />
  if (!data) return <div className="p-8 text-muted">Playlist not found.</div>
  const songs = data.songs ?? []
  return (
    <>
      <Header
        kind="Playlist"
        title={data.name}
        image={art(data.image)}
        meta={[data.description, `${songs.length} songs`].filter(Boolean).join(' • ')}
        onPlay={() => songs.length && play(songs, 0)}
      />
      {trackList(songs, play)}
    </>
  )
}

export function ArtistPage({ id, go }: { id: string; go: (v: View) => void }) {
  const { play } = usePlayer()
  const { data, loading } = useAsync<Artist>(() => getArtist(id), [id])
  if (loading) return <Loading />
  if (!data) return <div className="p-8 text-muted">Artist not found.</div>
  const songs = data.topSongs ?? []
  return (
    <>
      <Header
        kind="Artist"
        title={data.name}
        image={art(data.image)}
        round
        meta={data.followerCount ? `${compact(data.followerCount)} listeners` : ''}
        onPlay={() => songs.length && play(songs, 0)}
      />
      <div className="px-3">
        <h2 className="mb-2 px-3 text-2xl font-semibold tracking-tight">Popular</h2>
        {trackList(songs, play)}
        {!!data.topAlbums?.length && (
          <div className="px-3">
            <Shelf title="Albums">{data.topAlbums.map((a) => albumCard(a, () => go({ kind: 'album', id: a.id })))}</Shelf>
          </div>
        )}
      </div>
    </>
  )
}
