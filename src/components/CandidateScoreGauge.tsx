import { cn } from '@/lib/utils'

interface CandidateScoreGaugeProps {
  score: number        // 0..1
  size?: number        // px diameter, default 56
  className?: string
}

/**
 * Radial SVG gauge — electric-lime arc on a dark track.
 * Score 0–1 maps to 0–270° sweep (¾ circle, starts bottom-left).
 */
export function CandidateScoreGauge({ score, size = 56, className }: CandidateScoreGaugeProps) {
  const clampedScore = Math.min(1, Math.max(0, score))
  const pct = Math.round(clampedScore * 100)

  // SVG arc geometry
  const cx = size / 2
  const cy = size / 2
  const r = (size - 8) / 2           // 4px stroke width each side
  const strokeW = 4
  const circumference = 2 * Math.PI * r
  const sweep = 270                   // degrees of arc
  const dashTotal = (sweep / 360) * circumference
  const dashFill = clampedScore * dashTotal
  // rotate so arc starts at bottom-left (225°)
  const rotation = 135

  const trackColor = 'var(--color-muted)'
  const fillColor =
    clampedScore >= 0.8
      ? 'var(--color-success)'
      : clampedScore >= 0.6
        ? 'var(--color-primary)'
        : clampedScore >= 0.4
          ? 'var(--color-warning)'
          : 'var(--color-danger)'

  const glowColor =
    clampedScore >= 0.8
      ? 'rgba(94,242,164,0.55)'
      : clampedScore >= 0.6
        ? 'rgba(0,229,160,0.55)'
        : clampedScore >= 0.4
          ? 'rgba(255,194,75,0.45)'
          : 'rgba(255,93,93,0.45)'

  return (
    <div className={cn('relative flex items-center justify-center shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: `rotate(${rotation}deg)` }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeW}
          strokeDasharray={`${dashTotal} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeW}
          strokeDasharray={`${dashFill} ${circumference}`}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 4px ${glowColor})`,
            transition: 'stroke-dasharray 0.6s cubic-bezier(.2,.7,.2,1)',
          }}
        />
      </svg>
      {/* Centre label */}
      <span
        className="absolute font-mono font-bold tabular-nums leading-none"
        style={{
          fontSize: size * 0.22,
          color: fillColor,
          textShadow: `0 0 10px ${glowColor}`,
        }}
      >
        {pct}
      </span>
    </div>
  )
}
