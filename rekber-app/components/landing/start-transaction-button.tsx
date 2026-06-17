'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useTMA } from '@/components/tma/tma-provider'
import { authenticateWithTelegram } from '@/server/actions/auth.actions'
import { useUser } from '@/components/auth/user-provider'

export function StartTransactionButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const router = useRouter()
  const { initData, isReady } = useTMA()
  const { refreshUser } = useUser()
  const [isLoading, setIsLoading] = useState(false)

  const handleStart = async () => {
    if (!isReady) return

    setIsLoading(true)

    try {
      // If we are inside Telegram Mini App and have initData, authenticate first
      if (initData) {
        const res = await authenticateWithTelegram(initData)
        if (res.error) {
          console.error("Auth failed:", res.error)
          alert("Gagal otentikasi Telegram: " + res.error)
          setIsLoading(false)
          return
        }
        // Refresh the user context so it picks up the new session
        await refreshUser()
      }
      
      // Navigate to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error(error)
      setIsLoading(false)
    }
  }

  if (variant === "secondary") {
    return (
      <Button 
        size="lg" 
        className="bg-white text-blue-600 hover:bg-slate-100 h-14 px-8 text-lg font-bold w-full sm:w-auto"
        onClick={handleStart}
        disabled={isLoading || !isReady}
      >
        {isLoading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <>Buka Dashboard <ArrowRight className="w-5 h-5 ml-2" /></>}
      </Button>
    )
  }

  return (
    <Button 
      size="lg" 
      className="w-full h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 sm:w-auto"
      onClick={handleStart}
      disabled={isLoading || !isReady}
    >
      {isLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <>Mulai Transaksi (Dashboard) <ArrowRight className="w-4 h-4 ml-2" /></>}
    </Button>
  )
}
