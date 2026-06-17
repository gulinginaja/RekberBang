import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, LogOut, CheckCircle, ExternalLink, Settings, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { logout } from '@/server/actions/auth.actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Fetch complete profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  // Fetch stats
  const { count: totalTransactions } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10">
      <div className="flex flex-col items-center justify-center pt-8 pb-4">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-lg overflow-hidden mb-4 flex items-center justify-center">
          {profile.photo_url ? (
            <img src={profile.photo_url} alt={profile.first_name || 'Profile'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl text-slate-400 font-bold">{profile.first_name?.charAt(0) || profile.username?.charAt(0) || 'U'}</span>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {profile.first_name || 'User'}
          {profile.is_admin && <ShieldCheck className="w-5 h-5 text-blue-600" />}
        </h2>
        <p className="text-slate-500 font-medium">@{profile.username || profile.telegram_id}</p>
        
        {profile.is_admin && (
          <div className="mt-3 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-blue-200">
            <ShieldAlert className="w-3 h-3" /> STAFF ADMIN
          </div>
        )}
      </div>

      <div className="px-2 space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-2">Informasi Akun</h3>
        
        <Card className="rounded-2xl border shadow-sm overflow-hidden">
          <CardContent className="p-0 divide-y">
            <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
              <span className="text-slate-700 font-medium">Total Transaksi</span>
              <span className="text-slate-900 font-bold">{totalTransactions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
              <span className="text-slate-700 font-medium">Syarat & Ketentuan</span>
              <div className="flex items-center gap-1.5 text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" /> Diterima
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
              <span className="text-slate-700 font-medium">Trust Score</span>
              <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md">{profile.trust_score}</span>
            </div>
          </CardContent>
        </Card>

        {profile.is_admin && (
          <div className="pt-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-2 mb-3">Tindakan Khusus</h3>
            <Link href="/admin">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-2xl flex items-center justify-between px-6 shadow-md transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3 font-semibold text-base">
                  <Settings className="w-5 h-5 text-slate-400" /> Masuk Panel Admin
                </div>
                <ExternalLink className="w-5 h-5 text-slate-400" />
              </Button>
            </Link>
          </div>
        )}

        <div className="pt-6">
          <form action={logout}>
            <Button type="submit" variant="destructive" className="w-full h-14 rounded-2xl font-bold text-base bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none shadow-none">
              <LogOut className="w-5 h-5 mr-2" /> Keluar Akun
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
