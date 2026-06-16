'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/server/db/schema'
import { getUserProfile } from '@/server/actions/auth.actions'

interface UserContextType {
  user: User | null
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => {}
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    setIsLoading(true)
    const { user: fetchedUser } = await getUserProfile()
    setUser(fetchedUser || null)
    setIsLoading(false)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
