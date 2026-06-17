'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, PlusCircle, Info, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleInteraction = () => {
    // Attempt to trigger haptic feedback in Telegram Mini App
    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred('light')
      }
    }
  }

  const items = [
    { href: '/dashboard', icon: Home, label: 'Beranda' },
    { href: '/transactions/create', icon: PlusCircle, label: 'Buat Baru' },
    { href: '/support', icon: Info, label: 'Bantuan' },
    { href: '/profile', icon: User, label: 'Profil' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] pb-safe pointer-events-auto bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center py-2 px-4 h-16">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleInteraction}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 active:scale-95",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-blue-500"
              )}
            >
              <div className={cn(
                "p-1 rounded-full transition-colors",
                isActive ? "bg-blue-50" : "bg-transparent"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "fill-blue-100/50")} />
              </div>
              <span className={cn(
                "text-[10px] font-semibold transition-all",
                isActive ? "text-blue-600" : "text-slate-500"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
