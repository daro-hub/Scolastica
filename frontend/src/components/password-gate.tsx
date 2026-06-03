'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, Sparkles } from 'lucide-react'

const PASSWORD_KEY = 'scolastica_password'

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem(PASSWORD_KEY)
    if (saved) {
      verifyPassword(saved).then(ok => {
        if (ok) setIsAuthenticated(true)
        setChecking(false)
      })
    } else {
      setChecking(false)
    }
  }, [])

  async function verifyPassword(pw: string): Promise<boolean> {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiBase}/health`, {
        headers: { 'x-app-password': pw }
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const ok = await verifyPassword(password)
    if (ok) {
      sessionStorage.setItem(PASSWORD_KEY, password)
      setIsAuthenticated(true)
    } else {
      setError('Password non corretta')
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Caricamento...</div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold">Scolastica</h1>
              <p className="text-sm text-muted-foreground mt-1">Inserisci la password per accedere</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg">
              Accedi
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function getStoredPassword(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(PASSWORD_KEY) || ''
}
