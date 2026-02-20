import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { BridgeMember } from '@/lib/bridge-api/types'
import Link from 'next/link'
import Image from 'next/image'

interface TalentCardProps {
  member: BridgeMember
  highlighted?: boolean
}

export function TalentCard({ member, highlighted }: TalentCardProps) {
  const hasProfile = Boolean(member.first_name)
  const name = hasProfile
    ? `${member.first_name} ${member.last_name}`.trim()
    : 'Network Member'
  const initials = hasProfile
    ? `${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}`.toUpperCase()
    : member.id[0].toUpperCase()

  return (
    <Card className={`hover:shadow-md transition-shadow border rounded-lg ${highlighted ? 'border-primary/40 ring-1 ring-primary/20' : 'border-gray-200'}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="flex-shrink-0 relative">
            {member.profile_pic_url ? (
              <Image
                src={member.profile_pic_url}
                alt={name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasProfile ? 'bg-primary/10' : 'bg-gray-100'}`}>
                <span className={`font-semibold text-sm ${hasProfile ? 'text-primary' : 'text-gray-400'}`}>
                  {initials}
                </span>
              </div>
            )}
            {/* Super connector indicator */}
            {member.is_super_connector && (
              <span
                title="Super Connector"
                className="absolute -top-1 -right-1 text-amber-500 text-xs"
              >
                ⚡
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link href={`/talent/${member.id}`} className="hover:underline">
              <h3 className="font-semibold text-sm text-gray-900 truncate">{name}</h3>
            </Link>

            {hasProfile ? (
              <>
                {(member.position || member.company) && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[member.position, member.company].filter(Boolean).join(' at ')}
                  </p>
                )}
                {member.location && (
                  <p className="text-xs text-muted-foreground">📍 {member.location}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Profile not yet synced
              </p>
            )}
          </div>
        </div>

        {/* Skills / roles — only when profile is populated */}
        {hasProfile && (member.icp_roles?.length || member.icp_industries?.length) ? (
          <div className="flex flex-wrap gap-1 mb-2">
            {member.icp_roles?.slice(0, 2).map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
            {member.icp_industries?.slice(0, 1).map((ind) => (
              <Badge key={ind} variant="outline" className="text-xs">
                {ind}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Bio — only when profile is populated */}
        {hasProfile && member.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{member.bio}</p>
        )}

        {/* UUID hint for placeholder cards */}
        {!hasProfile && (
          <p className="text-xs text-gray-300 font-mono truncate mb-2">
            {member.id.slice(0, 8)}…
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <Link
            href={`/talent/${member.id}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            View Profile →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
