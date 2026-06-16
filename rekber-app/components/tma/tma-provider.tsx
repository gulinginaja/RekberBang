'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface TMAContextType {
  initData: string | null
  initDataUnsafe: any | null
  isReady: boolean
}

const TMAContext = createContext<TMAContextType>({
  initData: null,
  initDataUnsafe: null,
  isReady: false,
})

export function TMAProvider({ children }: { children: ReactNode }) {
  const [initData, setInitData] = useState<string | null>(null)
  const [initDataUnsafe, setInitDataUnsafe] = useState<any | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if we are running inside Telegram
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      tg.ready()
      
      setInitData(tg.initData || null)
      setInitDataUnsafe(tg.initDataUnsafe || null)
      setIsReady(true)
    } else {
      console.warn('Not running inside Telegram Mini App')
      setIsReady(true) // Set to true anyway to allow non-TMA dev testing if needed
    }
  }, [])

  return (
    <TMAContext.Provider value={{ initData, initDataUnsafe, isReady }}>
      {children}
    </TMAContext.Provider>
  )
}

export function useTMA() {
  return useContext(TMAContext)
}
