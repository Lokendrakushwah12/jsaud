import { Heart, ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react'
import type { ReactNode } from 'react'
import { art, fmt, names, type Song } from './api'
import { usePlayer } from './player'

const SLIDER =
  'group h-1 w-full cursor-pointer appearance-none rounded-full [--c:#fff] hover:[--c:var(--color-accent)] ' +
  'bg-[linear-gradient(to_right,var(--c)_var(--pct),#4d4d4d_var(--pct))] ' +
  '[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 hover:[&::-webkit-slider-thumb]:opacity-100'

function Slider({ value, max, onChange, className = '' }: { value: number; max: number; onChange: (v: number) => void; className?: string }) {
  const pct = `${max ? (value / max) * 100 : 0}%`
  return (
    <input
      type="range"
      min={0}
      max={max || 1}
      step="any"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ '--pct': pct } as React.CSSProperties}
      className={`${SLIDER} ${className}`}
    />
  )
}

/** Animated bars shown on the row that is currently playing. */
const Equalizer = () => (
  <div className="flex h-4 items-end gap-0.5">
    {[0, 0.2, 0.4].map((delay) => (
      <span
        key={delay}
        className="w-0.5 origin-bottom animate-[eq_0.9s_ease-in-out_infinite] bg-accent"
        style={{ animationDelay: `${delay}s`, height: '100%' }}
      />
    ))}
  </div>
)

export function SongRow({
  song,
  n,
  onPlay,
  showAlbum = true
}: {
  song: Song
  n: number
  onPlay: () => void
  showAlbum?: boolean
}) {
  const { current, playing, toggle } = usePlayer()
  const active = current?.id === song.id

  return (
    <div
      onClick={onPlay}
      className="group grid grid-cols-[16px_1fr_auto] items-center gap-4 rounded-md px-4 py-2 hover:bg-white/10 md:grid-cols-[16px_4fr_3fr_auto]"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (active) toggle()
          else onPlay()
        }}
        className="flex size-4 items-center justify-center text-sm text-muted"
        aria-label={active && playing ? 'Pause' : `Play ${song.name}`}
      >
        {active && playing ? <Equalizer /> : <span className="group-hover:hidden">{n}</span>}
        {!(active && playing) && <Play size={14} className="hidden fill-white text-white group-hover:block" />}
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <img src={art(song.image, 1)} alt="" className="size-10 rounded" loading="lazy" />
        <div className="min-w-0">
          <div className={`truncate text-sm ${active ? 'text-accent' : 'text-white'}`}>{song.name}</div>
          <div className="truncate text-xs text-muted">{names(song.artists?.primary)}</div>
        </div>
      </div>

      {showAlbum && <div className="hidden truncate text-sm text-muted md:block">{song.album?.name}</div>}

      <div className="flex items-center gap-4 text-muted">
        <Heart size={16} className="opacity-0 transition hover:text-white group-hover:opacity-100" />
        <span className="text-sm tabular-nums">{fmt(song.duration)}</span>
      </div>
    </div>
  )
}

export function Card({
  image,
  title,
  subtitle,
  round,
  onOpen,
  onPlay
}: {
  image: string
  title: string
  subtitle: string
  round?: boolean
  onOpen: () => void
  onPlay?: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-lg p-3 text-left transition hover:bg-elevated"
    >
      <div className="relative">
        <img
          src={image}
          alt=""
          loading="lazy"
          className={`aspect-square w-full object-cover shadow-lg ${round ? 'rounded-full' : 'rounded-md'}`}
        />
        {onPlay && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onPlay()
            }}
            className="absolute right-2 bottom-2 grid size-12 translate-y-2 place-items-center rounded-full bg-accent text-black opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105"
          >
            <Play size={20} className="ml-0.5 fill-black" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate font-semibold">{title}</div>
        <div className="truncate text-sm text-muted">{subtitle}</div>
      </div>
    </button>
  )
}

export const Shelf = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-8">
    <h2 className="mb-2 px-3 text-2xl font-bold tracking-tight">{title}</h2>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{children}</div>
  </section>
)

export function PlayerBar() {
  const p = usePlayer()
  const song = p.current
  const VolIcon = p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2

  return (
    <footer className="grid h-20 shrink-0 grid-cols-[1fr_2fr_1fr] items-center gap-4 px-4">
      <div className="flex min-w-0 items-center gap-3">
        {song && (
          <>
            <img src={art(song.image, 1)} alt="" className="size-14 rounded" />
            <div className="min-w-0">
              <div className="truncate text-sm">{song.name}</div>
              <div className="truncate text-xs text-muted">{names(song.artists?.primary)}</div>
            </div>
            <Heart size={16} className="ml-2 shrink-0 text-muted hover:text-white" />
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-5">
          <button onClick={() => p.setShuffle((s) => !s)} aria-label="Shuffle" className={p.shuffle ? 'text-accent' : 'text-muted hover:text-white'}>
            <Shuffle size={16} />
          </button>
          <button onClick={p.prev} aria-label="Previous" className="text-muted hover:text-white">
            <SkipBack size={18} className="fill-current" />
          </button>
          <button
            onClick={p.toggle}
            aria-label={p.playing ? 'Pause' : 'Play'}
            className="grid size-8 place-items-center rounded-full bg-white text-black transition hover:scale-105 disabled:opacity-40"
            disabled={!song}
          >
            {p.playing ? <Pause size={16} className="fill-black" /> : <Play size={16} className="ml-0.5 fill-black" />}
          </button>
          <button onClick={p.next} aria-label="Next" className="text-muted hover:text-white">
            <SkipForward size={18} className="fill-current" />
          </button>
          <button onClick={() => p.setRepeat((r) => !r)} aria-label="Repeat" className={p.repeat ? 'text-accent' : 'text-muted hover:text-white'}>
            <Repeat size={16} />
          </button>
        </div>
        <div className="flex w-full max-w-lg items-center gap-2">
          <span className="w-10 text-right text-xs tabular-nums text-muted">{fmt(p.progress)}</span>
          <Slider value={p.progress} max={p.duration} onChange={p.seek} />
          <span className="w-10 text-xs tabular-nums text-muted">{fmt(p.duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <ListMusic size={16} className="text-muted hover:text-white" />
        <VolIcon size={16} className="text-muted" />
        <Slider value={p.volume} max={1} onChange={p.setVolume} className="max-w-24" />
      </div>
    </footer>
  )
}
