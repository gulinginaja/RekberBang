'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Plus, ListOrdered, User, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  const handleInteraction = () => {
    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred('light')
      }
    }
  }

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Beranda' },
    { href: '/transactions', icon: ListOrdered, label: 'Transaksi' },
    { href: '/transactions/create', icon: Plus, label: 'Buat', isFab: true },
    { href: '/disputes', icon: AlertCircle, label: 'Sengketa' },
    { href: '/profile', icon: User, label: 'Profil' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] pb-safe pointer-events-none">
      <div className="bg-white border-t shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pointer-events-auto h-16 flex items-center justify-around px-2 relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && !item.isFab && pathname.startsWith(item.href))
          const Icon = item.icon

          if (item.isFab) {
            return (
              <div key="fab-spacer" className="relative w-16 h-full flex justify-center">
                <Link
                  href={item.href}
                  onClick={handleInteraction}
                  className="absolute -top-6 flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-600/30 text-white transition-transform active:scale-90 hover:bg-blue-700 border-4 border-slate-50"
                >
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </Link>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleInteraction}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 active:scale-95 relative",
                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-6 h-6 transition-all", isActive && "fill-blue-50 stroke-blue-600")} strokeWidth={isActive ? 2 : 1.5} />
                {isActive && (
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all",
                isActive ? "text-blue-600 font-bold opacity-100" : "opacity-0 h-0"
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
