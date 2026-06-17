import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle, ShieldCheck, Activity } from 'lucide-react'

export default async function DashboardOverview() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Fetch some basic stats
  const { count: activeTransactions } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .not('status', 'in', '("COMPLETED", "CANCELLED", "REFUNDED", "RELEASED")')

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8">
      {/* Premium Fintech Hero Card */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-indigo-400/20 blur-xl"></div>
        
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Transaksi Aktif</p>
              <h2 className="text-4xl font-bold tracking-tight">{activeTransactions || 0}</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <ShieldCheck className="w-4 h-4 text-green-300" />
              <span className="text-sm font-semibold">Skor Trust 100</span>
            </div>
          </div>
          
          <Link href="/transactions/create" className="w-full">
            <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold h-12 rounded-xl text-md shadow-sm transition-all active:scale-[0.98]">
              <PlusCircle className="w-5 h-5 mr-2" />
              Buat Transaksi Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Aktivitas Terkini</h3>
          <Link href="/transactions" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Lihat Semua</Link>
        </div>
        
        <div className="bg-white rounded-2xl border shadow-sm p-4 text-center">
          <div className="flex flex-col items-center justify-center py-6 gap-3 text-slate-500">
            <div className="bg-slate-100 p-3 rounded-full">
              <Activity className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm">Belum ada aktivitas transaksi.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
