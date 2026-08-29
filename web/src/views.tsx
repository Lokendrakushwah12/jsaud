import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  art,
  compact,
  getAlbum,
  getArtist,
  names,
  searchAlbums,
  searchArtists,
  searchSongs,
  type Album,
  type Artist,
  type Song
} from './api'
import { Card, Shelf, SongRow } from './components'
import { usePlayer } from './player'

export type View = { kind: 'home' } | { kind: 'search'; query: string } | { kind: 'album'; id: string } | { kind: 'artist'; id: string }

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

const MOODS = [
  { label: 'Bollywood Hits', from: 'from-rose-600' },
  { label: 'Punjabi', from: 'from-amber-500' },
  { label: 'Lo-fi', from: 'from-violet-600' },
  { label: 'Arijit Singh', from: 'from-emerald-600' },
  { label: 'Workout', from: 'from-sky-600' },
  { label: 'Romantic', from: 'from-fuchsia-600' },
  { label: '90s', from: 'from-orange-600' },
  { label: 'Tamil', from: 'from-teal-600' }
]

export function Home({ go }: { go: (v: View) => void }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOODS.map((m) => (
          <button
            key={m.label}
            onClick={() => go({ kind: 'search', query: m.label })}
            className={`flex h-24 items-end rounded-lg bg-gradient-to-br ${m.from} to-black/60 p-4 text-left text-lg font-bold transition hover:brightness-110`}
          >
            {m.label}
          </button>
        ))}
      </div>
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
      <h2 className="mb-2 px-3 text-2xl font-bold tracking-tight">Songs</h2>
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
          <div className="text-xs font-bold uppercase">{kind}</div>
          <h1 className="mt-2 truncate text-6xl font-black tracking-tighter">{title}</h1>
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
        <h2 className="mb-2 px-3 text-2xl font-bold tracking-tight">Popular</h2>
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
