import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', ...props }, ref) => {
    const variants = {
      default: 'bg-muted text-muted-foreground ring-1 ring-border',
      success: 'bg-success-light text-success ring-1 ring-success/30',
      warning: 'bg-warning-light text-warning ring-1 ring-warning/30',
      danger: 'bg-danger-light text-danger ring-1 ring-danger/30',
      info: 'bg-info-light text-info ring-1 ring-info/30',
      purple: 'bg-purple-light text-purple ring-1 ring-purple/30',
    }
    const sizes = {
      sm: 'px-2 py-0.5 text-[11px] tracking-wide',
      md: 'px-2.5 py-1 text-xs tracking-wide',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-md font-mono font-medium uppercase',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'
export { Badge }
export type { BadgeProps }