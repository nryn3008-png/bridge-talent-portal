'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { TalentProfile } from '@/types/prisma'

interface TalentStatusFormProps {
  talentProfile: TalentProfile | null
}

export function TalentStatusForm({ talentProfile }: TalentStatusFormProps) {
  const [status, setStatus] = useState(talentProfile?.talentStatus ?? 'not_looking')
  const [openToRoles, setOpenToRoles] = useState(talentProfile?.openToRoles.join(', ') ?? '')
  const [workPreference, setWorkPreference] = useState(talentProfile?.workPreference ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/talent/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talentStatus: status,
          openToRoles: openToRoles
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          workPreference: workPreference || null,
        }),
      })

      if (!res.ok) {
        toast.error('Failed to save preferences')
        return
      }

      toast.success('Preferences saved!')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Job search status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_looking">Not looking</SelectItem>
            <SelectItem value="passively_open">Passively open</SelectItem>
            <SelectItem value="actively_looking">Actively looking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status !== 'not_looking' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="openToRoles">Open to roles (comma-separated)</Label>
            <Input
              id="openToRoles"
              value={openToRoles}
              onChange={(e) => setOpenToRoles(e.target.value)}
              placeholder="CTO, VP Engineering, Staff Engineer"
            />
          </div>

          <div className="space-y-2">
            <Label>Work preference</Label>
            <Select value={workPreference} onValueChange={setWorkPreference}>
              <SelectTrigger>
                <SelectValue placeholder="Select preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <Button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save preferences'}
      </Button>
    </div>
  )
}
