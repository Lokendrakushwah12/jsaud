import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getSuggestions, names, streamUrl, type Song } from './api'

type PlayerState = {
  queue: Song[]
  index: number
  current: Song | null
  playing: boolean
  progress: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: boolean
  play: (songs: Song[], startAt?: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  setShuffle: (fn: (s: boolean) => boolean) => void
  setRepeat: (fn: (r: boolean) => boolean) => void
}

const Ctx = createContext<PlayerState | null>(null)

export const usePlayer = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>')
  return ctx
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  // A ref, not state: the element is mutated (src/volume/currentTime), never re-created.
  const ref = useRef<HTMLAudioElement>(null)
  ref.current ??= new Audio()
  const audio = ref.current
  const [queue, setQueue] = useState<Song[]>([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const current = queue[index] ?? null
  const loading = useRef(false)

  const play = useCallback((songs: Song[], startAt = 0) => {
    setQueue(songs)
    setIndex(startAt)
  }, [])

  const next = useCallback(() => {
    if (shuffle && queue.length > 1) {
      setIndex(Math.floor(Math.random() * queue.length))
      return
    }
    if (index < queue.length - 1) {
      setIndex(index + 1)
      return
    }
    // ponytail: end of queue = endless radio, same as Spotify autoplay
    const last = queue[queue.length - 1]
    if (!last || loading.current) return
    loading.current = true
    getSuggestions(last.id)
      .then((more) => {
        if (more.length) {
          setQueue((q) => [...q, ...more])
          setIndex((i) => i + 1)
        } else {
          setPlaying(false)
        }
      })
      .catch(() => setPlaying(false))
      .finally(() => {
        loading.current = false
      })
  }, [index, queue, shuffle])

  const prev = useCallback(() => {
    if (audio.currentTime > 3 || index === 0) {
      audio.currentTime = 0
      return
    }
    setIndex((i) => Math.max(0, i - 1))
  }, [audio, index])

  const toggle = useCallback(() => {
    if (!current) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [audio, current])

  // Load the track whenever the selection changes.
  useEffect(() => {
    if (!current) return
    audio.src = streamUrl(current)
    void audio.play().catch(() => setPlaying(false))
  }, [audio, current])

  useEffect(() => {
    audio.volume = volume
  }, [audio, volume])

  useEffect(() => {
    audio.loop = repeat
  }, [audio, repeat])

  useEffect(() => {
    const onTime = () => setProgress(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', next)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', next)
    }
  }, [audio, next])

  // OS media keys + macOS Now Playing.
  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.name,
      artist: names(current.artists?.primary),
      album: current.album?.name ?? '',
      artwork: current.image.map((i) => ({ src: i.url, sizes: i.quality, type: 'image/jpeg' }))
    })
    navigator.mediaSession.setActionHandler('previoustrack', prev)
    navigator.mediaSession.setActionHandler('nexttrack', next)
  }, [current, next, prev])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.code !== 'Space' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  const value: PlayerState = {
    queue,
    index,
    current,
    playing,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    play,
    toggle,
    next,
    prev,
    seek: (s) => {
      audio.currentTime = s
      setProgress(s)
    },
    setVolume: setVolumeState,
    setShuffle,
    setRepeat
  }

  return <Ctx value={value}>{children}</Ctx>
}
