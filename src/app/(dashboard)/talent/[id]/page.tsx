import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getContactById } from '@/lib/bridge-api/users'
import { prisma } from '@/lib/db/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TalentProfilePage({ params }: PageProps) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  // Try DB first for synced profile data
  let dbProfile: {
    firstName: string | null
    lastName: string | null
    email: string | null
    company: string | null
    position: string | null
    location: string | null
    bio: string | null
    profilePicUrl: string | null
    linkedinUrl: string | null
    isSuperConnector: boolean
    openToRoles: string[]
    skills: string[]
  } | null = null

  if (prisma) {
    try {
      dbProfile = await prisma.talentProfile.findUnique({
        where: { bridgeUserId: id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          company: true,
          position: true,
          location: true,
          bio: true,
          profilePicUrl: true,
          linkedinUrl: true,
          isSuperConnector: true,
          openToRoles: true,
          skills: true,
        },
      })
    } catch (err) {
      console.warn('[talent/[id]] DB lookup failed:', err instanceof Error ? err.message : err)
    }
  }

  // Fetch full contact data from Bridge API
  // Uses GET /api/v1/contacts/:id which works for any member
  // (unlike GET /api/v1/users/:id which returns 403 for non-self)
  let contact
  try {
    contact = await getContactById(id)
  } catch {
    // If API fails but we have DB data, we can still show the profile
    if (!dbProfile) {
      notFound()
    }
  }

  // Merge data: prefer API contact data, fall back to DB profile
  const name = contact?.name
    || `${dbProfile?.firstName ?? ''} ${dbProfile?.lastName ?? ''}`.trim()
    || 'Network Member'
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || id[0].toUpperCase()
  const position = contact?.position ?? dbProfile?.position ?? null
  const company = contact?.company ?? dbProfile?.company ?? null
  const location = contact?.location ?? dbProfile?.location ?? null
  const bio = contact?.bio ?? dbProfile?.bio ?? null
  const profilePicUrl = contact?.profile_pic_url ?? dbProfile?.profilePicUrl ?? null
  const linkedinUrl = contact?.linkedin_profile_url ?? dbProfile?.linkedinUrl ?? null
  const companyWebsite = contact?.company_website ?? null
  const isSuperConnector = contact?.is_super_connector ?? dbProfile?.isSuperConnector ?? false
  const icp = contact?.icp ?? null
  const tags = contact?.tags ?? []

  return (
    <div className="px-6 pt-6 pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link
          href="/talent"
          className="text-[13px] text-[#81879C] hover:text-[#0D1531] mb-4 inline-flex items-center gap-1.5 transition-colors duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to directory
        </Link>

        {/* Header */}
        <Card className="card-elevated mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-5">
              {profilePicUrl ? (
                <Image
                  src={profilePicUrl}
                  alt={name}
                  width={72}
                  height={72}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#F2F5FF] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0038FF] font-bold text-xl">{initials}</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-bold text-[#0D1531] tracking-tight">{name}</h1>
                  {isSuperConnector && (
                    <span
                      title="Super Connector"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-[#FCF4E6] text-[#714A00] border border-[#FBEFD9]"
                    >
                      <Zap className="w-3 h-3 fill-[#E19500] text-[#E19500]" />
                      Super Connector
                    </span>
                  )}
                </div>
                {(position || company) && (
                  <p className="text-[14px] text-[#3D445A] mt-0.5">
                    {[position, company].filter(Boolean).join(' at ')}
                  </p>
                )}
                {location && (
                  <p className="text-[13px] text-[#676C7E] mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {location}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">LinkedIn</Button>
                    </a>
                  )}
                  {companyWebsite && (
                    <a
                      href={companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">Website</Button>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {bio && (
              <p className="text-[14px] text-[#676C7E] mt-4 leading-relaxed">{bio}</p>
            )}
          </CardContent>
        </Card>

        {/* ICP — roles and industries */}
        {icp && (icp.roles?.length || icp.industries?.length) ? (
          <Card className="card-elevated mb-6">
            <CardContent className="pt-6">
              <h2 className="text-[16px] font-semibold text-[#0D1531] mb-4">Background & Interests</h2>
              <div className="space-y-3">
                {icp.roles && icp.roles.length > 0 && (
                  <div>
                    <p className="text-[13px] font-medium text-[#3D445A] mb-1.5">Roles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {icp.roles.map((r) => (
                        <Badge key={r} variant="info">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {icp.industries && icp.industries.length > 0 && (
                  <div>
                    <p className="text-[13px] font-medium text-[#3D445A] mb-1.5">Industries</p>
                    <div className="flex flex-wrap gap-1.5">
                      {icp.industries.map((ind) => (
                        <Badge key={ind} variant="default">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {icp.description && (
                  <p className="text-[14px] text-[#676C7E]">{icp.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Networks */}
        {tags.length > 0 && (
          <Card className="card-elevated mb-6">
            <CardContent className="pt-6">
              <h2 className="text-[16px] font-semibold text-[#0D1531] mb-4">Networks</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="default">
                    {tag.name}
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
