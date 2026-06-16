import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b p-4 sticky top-0 bg-background z-10">
        <h1 className="font-semibold text-lg">My Transactions</h1>
      </header>
      <main className="flex-1 p-4">
        {children}
      </main>
      <nav className="border-t p-4 flex justify-around sticky bottom-0 bg-background z-10">
        <button className="text-sm font-medium">Home</button>
        <button className="text-sm font-medium">New</button>
        <button className="text-sm font-medium">Profile</button>
      </nav>
    </div>
  )
}
