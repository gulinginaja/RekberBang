'use client'

import { useEffect, useState } from 'react'
import { useTMA } from '@/components/tma/tma-provider'
import { authenticateWithTelegram } from '@/server/actions/auth.actions'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const { initData, isReady } = useTMA()
  const router = useRouter()
  const [status, setStatus] = useState('Initializing Telegram Web App...')

  useEffect(() => {
    async function login() {
      if (!isReady) return

      if (!initData) {
        setStatus('Failed to get Telegram data. Please open inside Telegram.')
        return
      }

      setStatus('Authenticating...')
      const res = await authenticateWithTelegram(initData)

      if (res.error) {
        setStatus(`Authentication failed: ${res.error}`)
      } else {
        setStatus('Success! Redirecting...')
        router.push('/dashboard')
      }
    }

    login()
  }, [initData, isReady, router])

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Rekber Bang</h1>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  )
}
