import { getSession } from '@/lib/auth/session'
import { getCurrentUser } from '@/lib/bridge-api/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) return null

  let user
  try {
    user = await getCurrentUser(session.bridgeJwt)
  } catch {
    return (
      <div className="px-8 pt-6 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="page-header">
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground mt-1">
              Could not load your Bridge profile. Please try again.
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
    <div className="px-8 pt-6 pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="page-header">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">Your Bridge network profile</p>
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-xl">{initials}</span>
                </div>
              )}
              <div className="flex-1 space-y-1">
                <h2 className="text-lg font-semibold">{name}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {(gp?.position || gp?.company) && (
                  <p className="text-sm text-muted-foreground">
                    {[gp.position, gp.company].filter(Boolean).join(' at ')}
                  </p>
                )}
                {gp?.location && (
                  <p className="text-sm text-muted-foreground">📍 {gp.location}</p>
                )}
              </div>
            </div>

            {gp?.bio && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{gp.bio}</p>
            )}

            <div className="flex gap-2 mt-4">
              {gp?.linkedin_profile_url && (
                <a
                  href={gp.linkedin_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  LinkedIn
                </a>
              )}
              {gp?.company_website && (
                <a
                  href={gp.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
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
            <CardHeader>
              <CardTitle>Background & Interests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.icp.roles && user.icp.roles.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1.5">Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.icp.roles.map((r) => (
                      <Badge key={r} variant="secondary">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {user.icp.industries && user.icp.industries.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1.5">Industries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.icp.industries.map((i) => (
                      <Badge key={i} variant="outline">{i}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Networks */}
        {user.network_domains && user.network_domains.length > 0 && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Networks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.network_domains.map((nd) => (
                  <Badge key={nd.domain} variant="outline">{nd.name || nd.domain}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          To update your profile, edit it in Bridge directly.
        </p>
      </div>
    </div>
  )
}
