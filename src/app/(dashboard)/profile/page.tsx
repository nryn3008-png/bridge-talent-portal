import { getSession } from '@/lib/auth/session'
import { getCurrentUser } from '@/lib/bridge-api/users'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, MapPin } from 'lucide-react'
import Image from 'next/image'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) return null

  let user
  try {
    user = await getCurrentUser(session.bridgeJwt)
  } catch {
    return (
      <div className="px-6 pt-6 pb-8">
        <div className="max-w-3xl mx-auto">
          {/* Header — Bridge pattern */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-[12px] bg-[#0038FF] flex items-center justify-center flex-shrink-0">
                <User className="w-[18px] h-[18px] text-white" />
              </div>
              <h1 className="text-[18px] font-bold text-[#0D1531]">My Profile</h1>
            </div>
            <p className="text-[14px] text-[#81879C] tracking-[0.4px]">
              Could not load your Bridge profile. Try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const gp = user.global_profile
  const name = `${user.first_name} ${user.last_name}`.trim()
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Header — Bridge pattern: icon + title inline, subtitle below */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-[12px] bg-[#0038FF] flex items-center justify-center flex-shrink-0">
              <User className="w-[18px] h-[18px] text-white" />
            </div>
            <h1 className="text-[18px] font-bold text-[#0D1531]">My Profile</h1>
          </div>
          <p className="text-[14px] text-[#81879C] tracking-[0.4px]">Your Bridge network profile</p>
        </div>

        {/* Bridge profile */}
        <Card className="card-elevated mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {user.profile_pic_url ? (
                <Image
                  src={user.profile_pic_url}
                  alt={name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#F2F5FF] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0038FF] font-bold text-xl">{initials}</span>
                </div>
              )}
              <div className="flex-1 space-y-1">
                <h2 className="text-[16px] font-semibold text-[#0D1531]">{name}</h2>
                <p className="text-[13px] text-[#81879C]">{user.email}</p>
                {(gp?.position || gp?.company) && (
                  <p className="text-[13px] text-[#3D445A]">
                    {[gp.position, gp.company].filter(Boolean).join(' at ')}
                  </p>
                )}
                {gp?.location && (
                  <p className="text-[13px] text-[#676C7E] flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {gp.location}
                  </p>
                )}
              </div>
            </div>

            {gp?.bio && (
              <p className="text-[14px] text-[#676C7E] mt-4 leading-relaxed">{gp.bio}</p>
            )}

            <div className="flex gap-2 mt-4">
              {gp?.linkedin_profile_url && (
                <a
                  href={gp.linkedin_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-[#0038FF] hover:underline"
                >
                  LinkedIn
                </a>
              )}
              {gp?.company_website && (
                <a
                  href={gp.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-[#0038FF] hover:underline"
                >
                  Website
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ICP */}
        {user.icp && user.icp.public && (
          <Card className="card-elevated mb-6">
            <CardContent className="pt-6">
              <h2 className="text-[16px] font-semibold text-[#0D1531] mb-4">Background & Interests</h2>
              <div className="space-y-3">
                {user.icp.roles && user.icp.roles.length > 0 && (
                  <div>
                    <p className="text-[13px] font-medium text-[#3D445A] mb-1.5">Roles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {user.icp.roles.map((r) => (
                        <Badge key={r} variant="info">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {user.icp.industries && user.icp.industries.length > 0 && (
                  <div>
                    <p className="text-[13px] font-medium text-[#3D445A] mb-1.5">Industries</p>
                    <div className="flex flex-wrap gap-1.5">
                      {user.icp.industries.map((i) => (
                        <Badge key={i} variant="default">{i}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Networks */}
        {user.network_domains && user.network_domains.length > 0 && (
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <h2 className="text-[16px] font-semibold text-[#0D1531] mb-4">Networks</h2>
              <div className="flex flex-wrap gap-2">
                {user.network_domains.map((nd) => (
                  <Badge key={nd.domain} variant="default">{nd.name || nd.domain}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-[12px] text-[#81879C] mt-6">
          To update your profile, edit it in Bridge directly.
        </p>
      </div>
    </div>
  )
}
