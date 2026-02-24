import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { BridgeMember } from '@/lib/bridge-api/types'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Zap } from 'lucide-react'

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
    <Card className={`card-elevated group ${highlighted ? 'ring-2 ring-[#0038FF]/20' : ''}`}>
      <CardContent className="p-4">
        {/* Header: Avatar + Name/Meta */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar — 40px per Bridge spec */}
          <div className="flex-shrink-0 relative">
            {member.profile_pic_url ? (
              <Image
                src={member.profile_pic_url}
                alt={name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasProfile ? 'bg-[#F2F5FF]' : 'bg-[#F2F3F5]'}`}>
                <span className={`font-bold text-[13px] ${hasProfile ? 'text-[#0038FF]' : 'text-[#81879C]'}`}>
                  {initials}
                </span>
              </div>
            )}
            {/* Super connector — Lucide Zap icon, not emoji */}
            {member.is_super_connector && (
              <span
                title="Super Connector"
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FCF4E6] flex items-center justify-center"
              >
                <Zap className="w-2.5 h-2.5 text-[#E19500] fill-[#E19500]" />
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link href={`/talent/${member.id}`} className="block">
              <h3 className="font-bold text-[14px] text-[#0D1531] group-hover:text-[#0038FF] transition-colors duration-150 truncate">
                {name}
              </h3>
            </Link>

            {hasProfile ? (
              <>
                {(member.position || member.company) && (
                  <p className="text-[13px] text-[#3D445A] mt-0.5 truncate">
                    {[member.position, member.company].filter(Boolean).join(' at ')}
                  </p>
                )}
                {member.location && (
                  <p className="text-[12px] text-[#676C7E] mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{member.location}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-[#81879C] mt-0.5">
                Profile not yet synced
              </p>
            )}
          </div>
        </div>

        {/* Badges — Bridge badge system: info for roles, default for industries */}
        {hasProfile && (member.icp_roles?.length || member.icp_industries?.length) ? (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {member.icp_roles?.slice(0, 2).map((role) => (
              <Badge key={role} variant="info">
                {role}
              </Badge>
            ))}
            {member.icp_industries?.slice(0, 1).map((ind) => (
              <Badge key={ind} variant="default">
                {ind}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Bio */}
        {hasProfile && member.bio && (
          <p className="text-[14px] text-[#676C7E] line-clamp-2 mb-3 leading-[20px]">{member.bio}</p>
        )}

        {/* UUID hint for placeholder cards */}
        {!hasProfile && (
          <p className="text-[12px] text-[#B3B7C4] font-mono truncate mb-3">
            {member.id.slice(0, 8)}...
          </p>
        )}

        {/* Footer action */}
        <div className="pt-3 border-t border-[#ECEDF0]">
          <Link
            href={`/talent/${member.id}`}
            className="text-[14px] font-semibold text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150 inline-flex items-center gap-1"
          >
            View profile
            <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-150">
              &rarr;
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
