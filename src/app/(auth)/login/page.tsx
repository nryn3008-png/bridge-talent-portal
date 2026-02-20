'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type LoginMode = 'password' | 'apikey'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('apikey')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)

  const isDev = process.env.NODE_ENV !== 'production'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'apikey'
            ? { apiKey, useApiKey: true }
            : { email, password },
        ),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Login failed')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">B</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Bridge Talent Portal</CardTitle>
          <CardDescription>Sign in with your Bridge account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mode tabs — only show API key tab in dev */}
          {isDev && (
            <div className="flex rounded-lg border border-border p-1 mb-5 gap-1">
              <button
                type="button"
                onClick={() => setMode('apikey')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === 'apikey'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                API Key (Dev)
              </button>
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === 'password'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Password
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {mode === 'apikey' ? (
              <div className="space-y-2">
                <Label htmlFor="apiKey">Bridge JWT Token</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Paste your Bridge JWT token"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {mode === 'apikey'
              ? 'Paste your personal Bridge JWT token from an active Bridge session'
              : 'Use your existing Bridge account credentials'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
