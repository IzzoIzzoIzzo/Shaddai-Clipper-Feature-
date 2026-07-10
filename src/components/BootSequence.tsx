// ============================================================
// BootSequence — a once-per-session "power-on" for The Cutting Room.
// A near-black viewfinder boots: horizontal alignment lines converge, a
// scan-line sweeps top→bottom, a mono terminal types the system banner,
// a lime charge-bar fills, then the whole panel irises away to reveal the
// app. Click/keypress skips. Honors prefers-reduced-motion.
//
// Self-contained: no store, no props. Rendered once by ClipsLayout.
// All color via the existing semantic CSS vars, so it matches both themes
// (the overlay itself is always the dark bay — a projector booting).
// ============================================================
import { useEffect, useRef, useState } from 'react'

const BANNER = 'SHADDAI CUTTING ROOM // engine online'
const SESSION_KEY = 'shaddai-clips-booted'

export function BootSequence() {
  // Skip entirely if already booted this session or the user reduced motion.
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false
    if (sessionStorage.getItem(SESSION_KEY)) return false
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      sessionStorage.setItem(SESSION_KEY, '1')
      return false
    }
    return true
  })
  const [typed, setTyped] = useState('')
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!active) return
    let raf = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    // Type the banner out, char by char, starting after the lines converge.
    const startType = 420
    for (let i = 0; i <= BANNER.length; i++) {
      timers.push(setTimeout(() => setTyped(BANNER.slice(0, i)), startType + i * 26))
    }

    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      sessionStorage.setItem(SESSION_KEY, '1')
      setLeaving(true)
      timers.push(setTimeout(() => setActive(false), 620)) // match iris-out duration
    }

    // Hold on the completed banner, then iris away.
    const total = startType + BANNER.length * 26 + 520
    timers.push(setTimeout(finish, total))

    const skip = () => finish()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)

    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [active])

  if (!active) return null

  return (
    <div
      className={`boot-root${leaving ? ' boot-leaving' : ''}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* grain + vignette are global; add the scan sweep + convergence here */}
      <div className="boot-scan" />
      <div className="boot-line boot-line-top" />
      <div className="boot-line boot-line-bottom" />

      <div className="boot-center">
        {/* corner reticle */}
        <div className="boot-reticle">
          <span className="boot-corner tl" />
          <span className="boot-corner tr" />
          <span className="boot-corner bl" />
          <span className="boot-corner br" />
          <div className="boot-wordmark">
            SHADDAI<span className="boot-dot">.</span>
          </div>
          <div className="boot-sub">CUTTING&nbsp;ROOM</div>
        </div>

        {/* terminal banner */}
        <div className="boot-term">
          <span className="boot-caret-pre">&gt;</span> {typed}
          <span className="boot-caret" />
        </div>

        {/* charge bar */}
        <div className="boot-bar">
          <div className="boot-bar-fill" />
        </div>
        <div className="boot-hint">click to skip</div>
      </div>

      <style>{`
        .boot-root {
          position: fixed; inset: 0; z-index: 10000;
          display: grid; place-items: center;
          background:
            radial-gradient(120% 90% at 50% 45%, #0e1320 0%, #060912 60%, #04060c 100%);
          overflow: hidden;
          animation: boot-in .28s ease-out both;
        }
        .boot-leaving { animation: boot-iris .6s cubic-bezier(.7,0,.3,1) forwards; }

        /* two alignment lines that converge toward the center band */
        .boot-line {
          position: absolute; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 55%, transparent), transparent);
          opacity: .0;
        }
        .boot-line-top { top: 0; animation: boot-conv-top .5s cubic-bezier(.6,0,.2,1) both; }
        .boot-line-bottom { bottom: 0; animation: boot-conv-bottom .5s cubic-bezier(.6,0,.2,1) both; }

        /* the sweep */
        .boot-scan {
          position: absolute; left: 0; right: 0; top: 0; height: 34%;
          background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--color-primary) 12%, transparent) 60%, transparent);
          filter: blur(2px);
          animation: boot-sweep 1.15s cubic-bezier(.5,0,.5,1) .25s 1 both;
        }

        .boot-center { position: relative; text-align: center; animation: boot-rise .55s cubic-bezier(.2,.7,.2,1) .12s both; }

        .boot-reticle { position: relative; padding: 26px 44px; display: inline-block; }
        .boot-corner { position: absolute; width: 14px; height: 14px; border: 1.5px solid color-mix(in srgb, var(--color-primary) 70%, transparent); opacity: 0; animation: boot-corner .4s ease-out .12s both; }
        .boot-corner.tl { top: 0; left: 0; border-right: 0; border-bottom: 0; }
        .boot-corner.tr { top: 0; right: 0; border-left: 0; border-bottom: 0; }
        .boot-corner.bl { bottom: 0; left: 0; border-right: 0; border-top: 0; }
        .boot-corner.br { bottom: 0; right: 0; border-left: 0; border-top: 0; }

        .boot-wordmark {
          font-family: var(--font-display), sans-serif;
          font-weight: 800; font-size: clamp(2rem, 6vw, 3.4rem); line-height: 1;
          letter-spacing: -.03em; color: #f1f3f5;
        }
        .boot-dot { color: var(--color-primary); }
        .boot-sub {
          font-family: var(--font-mono), monospace;
          font-size: .62rem; letter-spacing: .5em; text-transform: uppercase;
          color: color-mix(in srgb, var(--color-primary) 80%, #fff); margin-top: 10px; padding-left: .5em;
        }

        .boot-term {
          font-family: var(--font-mono), monospace;
          font-size: .74rem; color: #8b93a3; margin-top: 26px;
          min-height: 1.1em; letter-spacing: .02em;
        }
        .boot-caret-pre { color: var(--color-primary); }
        .boot-caret {
          display: inline-block; width: .55ch; height: 1em; margin-left: 1px;
          background: var(--color-primary); vertical-align: -.12em;
          animation: boot-blink .8s steps(1) infinite;
        }

        .boot-bar {
          width: min(260px, 60vw); height: 2px; margin: 22px auto 0;
          background: color-mix(in srgb, #fff 8%, transparent); border-radius: 2px; overflow: hidden;
        }
        .boot-bar-fill {
          height: 100%; width: 0;
          background: linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 40%, transparent), var(--color-primary));
          box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 60%, transparent);
          animation: boot-charge 1.5s cubic-bezier(.4,.1,.2,1) .2s forwards;
        }
        .boot-hint {
          font-family: var(--font-mono), monospace; font-size: .58rem;
          letter-spacing: .28em; text-transform: uppercase; color: #4a5164; margin-top: 16px;
          animation: boot-fade-late .5s ease-out 1.1s both;
        }

        @keyframes boot-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes boot-iris { to { opacity: 0; transform: scale(1.04); filter: blur(6px); } }
        @keyframes boot-conv-top { 0% { opacity: 0; top: 0 } 60% { opacity: .9 } 100% { opacity: .25; top: calc(50% - 78px) } }
        @keyframes boot-conv-bottom { 0% { opacity: 0; bottom: 0 } 60% { opacity: .9 } 100% { opacity: .25; bottom: calc(50% - 78px) } }
        @keyframes boot-sweep { from { transform: translateY(-40%) } to { transform: translateY(320%) } }
        @keyframes boot-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes boot-corner { from { opacity: 0 } to { opacity: 1 } }
        @keyframes boot-charge { from { width: 0 } to { width: 100% } }
        @keyframes boot-blink { 50% { opacity: 0 } }
        @keyframes boot-fade-late { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
