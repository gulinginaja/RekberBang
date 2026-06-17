import { ReactNode } from 'react'
import Link from 'next/link'
import { Home, PlusCircle, User, Info } from 'lucide-react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      <header className="border-b p-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 shadow-sm">
        <h1 className="font-bold text-lg text-blue-900">Rekber Bang</h1>
      </header>
      <main className="flex-1 p-4">
        {children}
      </main>
      <nav className="border-t py-2 px-4 flex justify-around fixed bottom-0 w-full bg-white z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors">
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Beranda</span>
        </Link>
        <Link href="/transactions/new" className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors">
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Buat Baru</span>
        </Link>
        <Link href="/support" className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors">
          <Info className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Bantuan</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Profil</span>
        </Link>
      </nav>
    </div>
  )
}
