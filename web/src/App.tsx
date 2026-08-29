import { ChevronLeft, ChevronRight, Home as HomeIcon, Library, Music2, Search as SearchIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { art, names, type Song } from './api'
import { PlayerBar } from './components'
import { PlayerProvider, usePlayer } from './player'
import { AlbumPage, ArtistPage, Home, Search, type View } from './views'

const RECENTS_KEY = 'saavn.recents'

function Shell() {
  const { current, play } = usePlayer()
  const [stack, setStack] = useState<View[]>([{ kind: 'home' }])
  const [pos, setPos] = useState(0)
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState<Song[]>(() => JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]'))
  const main = useRef<HTMLElement>(null)
  const view = stack[pos]

  const go = (next: View) => {
    setStack((s) => {
      // Typing in the search box refines the current view instead of stacking history.
      if (next.kind === 'search' && s[pos]?.kind === 'search') return s.map((v, i) => (i === pos ? next : v))
      setPos(pos + 1)
      return [...s.slice(0, pos + 1), next]
    })
  }

  // Debounce the search box so every keystroke is not a round trip.
  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(() => go({ kind: 'search', query: query.trim() }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    main.current?.scrollTo({ top: 0 })
  }, [pos, view])

  useEffect(() => {
    if (!current) return
    setRecents((r) => {
      const next = [current, ...r.filter((s) => s.id !== current.id)].slice(0, 20)
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
      return next
    })
  }, [current])

  const navBtn = (active: boolean) =>
    `flex w-full items-center gap-4 rounded px-2 py-1.5 font-bold transition ${active ? 'text-white' : 'text-muted hover:text-white'}`

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <nav className="hidden w-70 shrink-0 flex-col gap-2 md:flex">
          <div className="rounded-lg bg-panel p-4">
            <div className="mb-4 flex items-center gap-2 px-2 text-accent">
              <Music2 size={22} className="fill-accent" />
              <span className="font-black tracking-tight text-white">Saavn</span>
            </div>
            <button className={navBtn(view.kind === 'home')} onClick={() => go({ kind: 'home' })}>
              <HomeIcon size={22} /> Home
            </button>
            <button className={navBtn(view.kind === 'search')} onClick={() => document.getElementById('q')?.focus()}>
              <SearchIcon size={22} /> Search
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-panel p-4">
            <div className="mb-3 flex items-center gap-3 px-2 font-bold text-muted">
              <Library size={22} /> Recently played
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {recents.length === 0 && <p className="px-2 text-sm text-muted">Nothing yet — play something.</p>}
              {recents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => play([s])}
                  className="flex w-full items-center gap-3 rounded p-2 text-left hover:bg-elevated"
                >
                  <img src={art(s.image, 1)} alt="" className="size-10 rounded" />
                  <div className="min-w-0">
                    <div className={`truncate text-sm ${current?.id === s.id ? 'text-accent' : ''}`}>{s.name}</div>
                    <div className="truncate text-xs text-muted">{names(s.artists?.primary)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main ref={main} className="min-w-0 flex-1 overflow-y-auto rounded-lg bg-panel">
          <div className="sticky top-0 z-10 flex items-center gap-4 bg-panel/80 px-6 py-3 backdrop-blur">
            <button
              onClick={() => setPos((p) => Math.max(0, p - 1))}
              disabled={pos === 0}
              aria-label="Back"
              className="grid size-8 place-items-center rounded-full bg-black/60 text-muted disabled:opacity-40"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setPos((p) => Math.min(stack.length - 1, p + 1))}
              disabled={pos === stack.length - 1}
              aria-label="Forward"
              className="grid size-8 place-items-center rounded-full bg-black/60 text-muted disabled:opacity-40"
            >
              <ChevronRight size={20} />
            </button>
            <div className="relative w-full max-w-sm">
              <SearchIcon size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                id="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to play?"
                className="w-full rounded-full bg-elevated py-2 pr-4 pl-9 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-white"
              />
            </div>
          </div>

          {view.kind === 'home' && <Home go={go} />}
          {view.kind === 'search' && <Search query={view.query} go={go} />}
          {view.kind === 'album' && <AlbumPage id={view.id} />}
          {view.kind === 'artist' && <ArtistPage id={view.id} go={go} />}
        </main>
      </div>
      <PlayerBar />
    </div>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <Shell />
    </PlayerProvider>
  )
}
