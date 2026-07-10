import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Plus, Edit3, Star, Palette, Trash2, Users, Tag,
  Sparkles, ShieldAlert,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useClipsStore } from '@/stores/clipsStore'

// ── tone → badge variant map ─────────────────────────────────────────────────
const TONE_VARIANT: Record<string, BadgeProps['variant']> = {
  professional:    'purple',
  casual:          'success',
  humorous:        'warning',
  educational:     'info',
  inspirational:   'success',
  confrontational: 'danger',
  custom:          'default',
}

const TONE_ICON: Record<string, string> = {
  professional:    '🎩',
  casual:          '😊',
  humorous:        '😂',
  educational:     '📚',
  inspirational:   '✨',
  confrontational: '⚡',
  custom:          '🎨',
}

// ── component ────────────────────────────────────────────────────────────────
export function BrandProfilesPage() {
  const navigate            = useNavigate()
  const addToast            = useUIStore((s) => s.addToast)
  const profiles            = useClipsStore((s) => s.brandProfiles)
  const deleteBrandProfile  = useClipsStore((s) => s.deleteBrandProfile)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDelete = () => {
    if (!deleteTarget) return
    const name = profiles.find((p) => p.profileId === deleteTarget)?.name ?? 'Profile'
    deleteBrandProfile(deleteTarget)
    addToast({ type: 'success', title: 'Profile removed', message: `"${name}" was deleted.`, duration: 3000 })
    setDeleteTarget(null)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">
            Settings
          </p>
          <h2 className="text-2xl font-display font-bold tracking-tight">Brand Profiles</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Define voice and style for consistent clip output
          </p>
        </div>

        <Button onClick={() => navigate('/clips/settings/new')}>
          <Plus className="h-4 w-4" />
          New Profile
        </Button>
      </div>

      {/* ── Film-strip divider ── */}
      <div className="film-strip rounded-full" />

      {/* ── Profile grid ── */}
      {profiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile, i) => (
            <Card
              key={profile.profileId}
              className={cn(
                'card-hover cursor-pointer group relative overflow-hidden',
                profile.isDefault && 'ring-1 ring-primary/40',
                `animate-slide-up stagger-${Math.min(i + 1, 8)}`,
              )}
              onClick={() => navigate(`/clips/settings/${profile.profileId}`)}
            >
              {/* Default glow strip */}
              {profile.isDefault && (
                <div className="absolute top-0 inset-x-0 h-0.5 bg-primary/60" />
              )}

              <CardContent className="p-5">
                {/* ── Header row ── */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2.5 rounded-lg transition-colors text-xl leading-none',
                      profile.isDefault ? 'bg-primary-light' : 'bg-muted group-hover:bg-surface',
                    )}>
                      {TONE_ICON[profile.toneVoice] ?? '🎨'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{profile.name}</h3>
                      {profile.isDefault && (
                        <Badge variant="info" size="sm" className="mt-1">
                          <Star className="h-2.5 w-2.5 mr-0.5" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action buttons — appear on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/clips/settings/${profile.profileId}`)
                      }}
                      title="Edit profile"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(profile.profileId)
                      }}
                      title="Delete profile"
                      className="text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* ── Tone + audience ── */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge
                    variant={TONE_VARIANT[profile.toneVoice] ?? 'default'}
                    size="sm"
                    className="capitalize font-mono"
                  >
                    {profile.toneVoice}
                  </Badge>
                  {profile.targetAudience && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="truncate max-w-[160px]">{profile.targetAudience}</span>
                    </span>
                  )}
                </div>

                {/* ── Key messaging snippets ── */}
                {profile.keyMessaging.length > 0 && (
                  <div className="mb-2.5 flex items-start gap-1.5">
                    <Sparkles className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground truncate">
                      {profile.keyMessaging[0]}
                      {profile.keyMessaging.length > 1 && (
                        <span className="ml-1 text-muted-foreground/50">+{profile.keyMessaging.length - 1}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* ── Hashtags ── */}
                {profile.brandHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.brandHashtags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag.replace(/^#/, '')}
                      </span>
                    ))}
                    {profile.brandHashtags.length > 5 && (
                      <span className="text-[11px] font-mono text-muted-foreground/60 px-1">
                        +{profile.brandHashtags.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* ── Avoid topics ── */}
                {profile.avoidTopics.length > 0 && (
                  <p className="mt-2.5 text-[11px] font-mono text-muted-foreground/60 truncate flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 shrink-0" />
                    avoid: {profile.avoidTopics.slice(0, 3).join(', ')}
                    {profile.avoidTopics.length > 3 && ` +${profile.avoidTopics.length - 3}`}
                  </p>
                )}

                {/* ── Platform preference chip ── */}
                {profile.platformPreferences?.primaryPlatform && (
                  <p className="mt-2 text-[11px] font-mono text-primary/70">
                    primary → {profile.platformPreferences.primaryPlatform}
                    {(profile.platformPreferences.secondaryPlatforms?.length ?? 0) > 0
                      ? ` +${profile.platformPreferences.secondaryPlatforms.length}`
                      : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Palette />}
            title="No brand profiles yet"
            description="Create a profile to give the AI your tone, hashtags, and content guardrails."
            action={{ label: 'Create Profile', onClick: () => navigate('/clips/settings/new') }}
          />
        </Card>
      )}

      {/* ── Delete confirm dialog ── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete profile?"
        description={`"${profiles.find((p) => p.profileId === deleteTarget)?.name ?? ''}" will be permanently removed.`}
      >
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
