import { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-slate-50 p-4 sticky top-0 z-10">
        <h1 className="font-semibold text-lg">Admin Panel</h1>
      </header>
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  )
}
