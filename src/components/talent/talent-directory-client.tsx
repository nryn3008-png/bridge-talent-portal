'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import type { BridgeMember } from '@/lib/bridge-api/types'
import { SearchX, X, Zap } from 'lucide-react'

interface TalentDirectoryClientProps {
  members: BridgeMember[]
  totalCount: number
  query?: string
  activeRole?: string
  companyFilter?: string
}

export function TalentDirectoryClient({
  members,
  totalCount,
  query,
  activeRole,
  companyFilter,
}: TalentDirectoryClientProps) {
  /* Empty state — no data at all */
  if (totalCount === 0 && !activeRole && !query && !companyFilter) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <SearchX className="w-5 h-5 text-[#9A9FB0]" />
        </div>
        <h3 className="text-base font-bold text-[#0D1531] mb-2">No members yet</h3>
        <p className="text-[14px] text-[#676C7E]">
          Members will appear here after syncing. Check your API key in .env.local.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Company filter badge */}
      {companyFilter && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[13px] text-[#676C7E]">Showing members at</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#E6EBFF] text-[#0038FF] text-[12px] font-medium rounded border border-[#E6EEFF]">
            {companyFilter}
            <Link href="/talent" className="hover:text-[#0036D7] transition-colors duration-150">
              <X className="w-3 h-3" />
            </Link>
          </span>
        </div>
      )}

      {/* Empty state — filtered */}
      {totalCount === 0 && (activeRole || query || companyFilter) && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <SearchX className="w-5 h-5 text-[#9A9FB0]" />
          </div>
          <h3 className="text-base font-bold text-[#0D1531] mb-2">No matches found</h3>
          <p className="text-[14px] text-[#676C7E] mb-4">
            Try adjusting your search or filters.
          </p>
          <Link
            href="/talent"
            className="text-[14px] font-semibold text-[#0038FF] hover:text-[#0036D7] transition-colors duration-150"
          >
            Clear filters
          </Link>
        </div>
      )}

      {/* Table view */}
      {totalCount > 0 && (
        <div className="rounded-xl border border-[#ECEDF0] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9F9FA] border-b border-[#ECEDF0]">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#81879C]">Name</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#81879C]">Position</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#81879C]">Company</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#81879C]">Location</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#81879C]">Roles</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#81879C]">Bio</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const hasProfile = Boolean(member.first_name)
                  const name = hasProfile
                    ? `${member.first_name} ${member.last_name}`.trim()
                    : 'Network Member'
                  const initials = hasProfile
                    ? `${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}`.toUpperCase()
                    : member.id[0].toUpperCase()

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-[#ECEDF0] last:border-b-0 hover:bg-[#F9F9FA] transition-colors duration-150 group"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <div className="flex-shrink-0 relative">
                            {member.profile_pic_url ? (
                              <Image
                                src={member.profile_pic_url}
                                alt={name}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasProfile ? 'bg-[#F2F5FF]' : 'bg-[#F2F3F5]'}`}>
                                <span className={`font-bold text-[11px] ${hasProfile ? 'text-[#0038FF]' : 'text-[#81879C]'}`}>
                                  {initials}
                                </span>
                              </div>
                            )}
                            {member.is_super_connector && (
                              <span
                                title="Super Connector"
                                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#FCF4E6] flex items-center justify-center"
                              >
                                <Zap className="w-2 h-2 text-[#E19500] fill-[#E19500]" />
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/talent/${member.id}`}
                            className="text-[14px] font-medium text-[#0D1531] group-hover:text-[#0038FF] transition-colors duration-150 truncate max-w-[160px]"
                          >
                            {name}
                          </Link>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="px-4 py-3">
                        <span className="text-[14px] text-[#3D445A] truncate block max-w-[180px]">
                          {member.position || '—'}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3">
                        <span className="text-[14px] text-[#3D445A] truncate block max-w-[160px]">
                          {member.company || '—'}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <span className="text-[14px] text-[#3D445A] truncate block max-w-[140px]">
                          {member.location || '—'}
                        </span>
                      </td>

                      {/* Roles */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
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
                          {!member.icp_roles?.length && !member.icp_industries?.length && (
                            <span className="text-[14px] text-[#B3B7C4]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Bio */}
                      <td className="px-4 py-3">
                        <span className="text-[14px] text-[#3D445A] truncate block max-w-[200px]">
                          {member.bio || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
