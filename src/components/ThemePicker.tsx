// ThemePicker — swap between the app's distinct aesthetics. Self-contained:
// owns the `data-theme` attribute + localStorage. Each theme is a full palette
// + font + texture swap defined in index.css.
import { useEffect, useRef, useState } from 'react'
import { Palette, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const THEMES = [
  { id: 'dark',    name: 'Cutting Room', swatch: ['#0a0e1a', '#00e5a0', '#ff6b4a'] },
  { id: 'light',   name: 'Daylight Bay', swatch: ['#faf9f6', '#5a7d00', '#d8410f'] },
  { id: 'arcade',  name: 'Arcade',       swatch: ['#fff7ea', '#ff2e63', '#00c2b8'] },
  { id: 'gallery', name: 'Gallery',      swatch: ['#f6f4fb', '#6d5efc', '#ff4d9d'] },
  { id: 'luxury',  name: 'Luxury',       swatch: ['#f5f0e4', '#b8892b', '#7b2d26'] },
] as const

export function ThemePicker() {
  const [theme, setTheme] = useState<string>(() => {
    // Deep-link support: /clips?theme=arcade sets + pins a theme (shareable).
    const q = new URLSearchParams(window.location.search).get('theme')
    if (q && THEMES.some((t) => t.id === q)) return q
    return localStorage.getItem('shaddai-theme') || 'dark'
  })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('shaddai-theme', theme)
  }, [theme])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Change theme"
      >
        <Palette className="h-4 w-4 text-primary" />
        <span className="hidden md:inline font-mono uppercase tracking-wider">{current.name}</span>
        <span className="flex gap-[3px]">
          {current.swatch.map((c, i) => (
            <span key={i} className="h-3 w-1.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
          ))}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-2xl p-1.5 z-50 animate-scale-in">
          <p className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Choose a look</p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors',
                t.id === theme ? 'bg-primary-light text-primary' : 'text-foreground hover:bg-muted',
              )}
            >
              <span className="flex gap-[3px] shrink-0">
                {t.swatch.map((c, i) => (
                  <span key={i} className="h-6 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                ))}
              </span>
              <span className="flex-1 text-left font-medium">{t.name}</span>
              {t.id === theme && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
