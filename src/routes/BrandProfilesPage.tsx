import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, Edit3, Star, Palette, Users } from 'lucide-react'
import { useClipsStore } from '@/stores/clipsStore'

const toneVariants: Record<string, BadgeProps['variant']> = {
  educational: 'info',
  casual: 'success',
  professional: 'purple',
  humorous: 'warning',
  inspirational: 'success',
  confrontational: 'danger',
  custom: 'default',
}

export function BrandProfilesPage() {
  const navigate = useNavigate()
  const profiles = useClipsStore((s) => s.brandProfiles)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brand Profiles</h2>
          <p className="text-muted-foreground mt-1">Define your brand voice for consistent clip output</p>
        </div>
        <Button onClick={() => navigate('/clips/settings/new')}>
          <Plus className="h-4 w-4" />
          New Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((profile, i) => (
          <Card
            key={profile.profileId}
            className={cn(
              'card-hover cursor-pointer',
              profile.isDefault && 'ring-2 ring-primary/30',
              `animate-slide-up stagger-${i + 1}`
            )}
            onClick={() => navigate(`/clips/settings/${profile.profileId}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2.5 rounded-lg',
                    profile.isDefault ? 'bg-primary-light' : 'bg-muted'
                  )}>
                    <Palette className={cn(
                      'h-5 w-5',
                      profile.isDefault ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{profile.name}</h3>
                    {profile.isDefault && (
                      <Badge variant="info" size="sm" className="mt-0.5">
                        <Star className="h-3 w-3 mr-0.5" /> Default
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); navigate(`/clips/settings/${profile.profileId}`) }}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={toneVariants[profile.toneVoice] || 'default'} size="sm" className="capitalize">
                  {profile.toneVoice}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {profile.targetAudience}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {profile.brandHashtags.map((tag) => (
                  <Badge key={tag} variant="warning" size="sm">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profiles.length === 0 && (
        <Card className="p-16 text-center animate-fade-in">
          <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground mb-4">No brand profiles yet. Create one to customize your clip output tone.</p>
          <Button onClick={() => navigate('/clips/settings/new')}>
            <Plus className="h-4 w-4" />
            Create Profile
          </Button>
        </Card>
      )}
    </div>
  )
}
