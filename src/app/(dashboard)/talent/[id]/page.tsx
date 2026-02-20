import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/bridge-api/users'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TalentProfilePage({ params }: PageProps) {
  const session = await getSession()

  if (!session || !['vc', 'company', 'admin'].includes(session.role)) {
    redirect('/')
  }

  const { id } = await params

  let user
  try {
    user = await getUserById(id, session.bridgeJwt)
  } catch {
    notFound()
  }

  // Respect ICP public flag
  const icp = user.icp?.public ? user.icp : null

  const name = `${user.first_name} ${user.last_name}`.trim()
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link href="/talent" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
          ← Back to directory
        </Link>

        {/* Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-5">
              {user.profile_pic_url ? (
                <Image
                  src={user.profile_pic_url}
                  alt={name}
                  width={72}
                  height={72}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-xl">{initials}</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{name}</h1>
                  {user.global_profile?.is_super_connector && (
                    <span
                      title="Super Connector"
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200"
                    >
                      ⚡ Super Connector
                    </span>
                  )}
                </div>
                {(user.global_profile?.position || user.global_profile?.company) && (
                  <p className="text-muted-foreground mt-0.5">
                    {[user.global_profile.position, user.global_profile.company]
                      .filter(Boolean)
                      .join(' at ')}
                  </p>
                )}
                {user.global_profile?.location && (
                  <p className="text-sm text-muted-foreground mt-0.5">📍 {user.global_profile.location}</p>
                )}

                <div className="flex gap-2 mt-3">
                  {user.global_profile?.linkedin_profile_url && (
                    <a
                      href={user.global_profile.linkedin_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">LinkedIn</Button>
                    </a>
                  )}
                  {user.global_profile?.company_website && (
                    <a
                      href={user.global_profile.company_website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">Website</Button>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {user.global_profile?.bio && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{user.global_profile.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* ICP — roles and industries */}
        {icp && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Background & Interests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {icp.roles && icp.roles.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1.5">Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.roles.map((r) => (
                      <Badge key={r} variant="secondary">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {icp.industries && icp.industries.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1.5">Industries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {icp.industries.map((ind) => (
                      <Badge key={ind} variant="outline">{ind}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {icp.context && (
                <p className="text-sm text-muted-foreground">{icp.context}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Network Domains */}
        {user.network_domains && user.network_domains.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Networks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.network_domains.map((nd) => (
                  <Badge key={nd.domain} variant="outline" className="text-sm">
                    {nd.name || nd.domain}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
