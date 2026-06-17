'use client'

import { ShieldAlert, Banknote, QrCode, Search, UserCog } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function AdminQuickActions({ setActiveTab }: { setActiveTab: (t: string) => void }) {
  const actions = [
    { id: 'queue', label: 'Verify Payments', icon: Search, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'queue', label: 'Manage Disputes', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-100' },
    { id: 'admins', label: 'Manage Admins', icon: UserCog, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'payments', label: 'Payment Accounts', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: 'qris', label: 'Manage QRIS', icon: QrCode, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {actions.map(action => (
        <Card 
          key={action.label} 
          className="cursor-pointer hover:border-slate-400 transition-colors"
          onClick={() => setActiveTab(action.id)}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3 h-full">
            <div className={`p-3 rounded-xl ${action.bg}`}>
              <action.icon className={`w-6 h-6 ${action.color}`} />
            </div>
            <span className="text-xs font-semibold text-slate-700">{action.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
