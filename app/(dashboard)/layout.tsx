import { ReactNode } from 'react'
import Link from 'next/link'
import { Home, PlusCircle, User, Info } from 'lucide-react'

import { BottomNav } from '@/components/layout/BottomNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      <header className="border-b p-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 shadow-sm">
        <h1 className="font-bold text-lg text-blue-900">Rekber Bang</h1>
      </header>
      <main className="flex-1 p-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
