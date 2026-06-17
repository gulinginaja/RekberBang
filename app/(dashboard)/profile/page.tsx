import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, LogOut, CheckCircle, ExternalLink, Settings, ShieldAlert, FileText, CheckSquare, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { logout } from '@/server/actions/auth.actions'
import { User } from '@/server/db/schema'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Fetch profile
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('Failed to fetch profile:', error)
    throw new Error('Gagal memuat data profil. Silakan muat ulang halaman.')
  }

  const typedProfile = profile as User

  // Shared Header
  const ProfileHeader = () => (
    <div className="flex flex-col items-center justify-center pt-8 pb-4">
      <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-lg overflow-hidden mb-4 flex items-center justify-center">
        {typedProfile.photo_url ? (
          <img src={typedProfile.photo_url} alt={typedProfile.first_name || 'Profile'} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl text-slate-400 font-bold">{typedProfile.first_name?.charAt(0) || typedProfile.username?.charAt(0) || 'U'}</span>
        )}
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        {typedProfile.first_name || 'User'}
        {typedProfile.role !== 'user' && <ShieldCheck className="w-5 h-5 text-blue-600" />}
      </h2>
      <p className="text-slate-500 font-medium">@{typedProfile.username || typedProfile.telegram_id}</p>
      
      {typedProfile.role !== 'user' && (
        <div className="mt-3 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-blue-200 uppercase tracking-wider">
          <ShieldAlert className="w-3 h-3" /> {typedProfile.role.replace('_', ' ')}
        </div>
      )}
      <p className="text-xs text-slate-400 mt-2">Bergabung: {new Date(typedProfile.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}</p>
    </div>
  )

  // Layout for Users
  if (typedProfile.role === 'user') {
    // Fetch stats
    const [{ count: totalTx }, { count: activeTx }, { count: completedTx }, { count: disputeTx }] = await Promise.all([
      supabase.from('transactions').select('*', { count: 'exact', head: true }).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).not('status', 'in', '("COMPLETED", "CANCELLED", "REFUNDED", "RELEASED")'),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).eq('status', 'COMPLETED'),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('raised_by', user.id)
    ])

    return (
      <div className="space-y-6 max-w-lg mx-auto pb-10">
        <ProfileHeader />

        <div className="px-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-2">Statistik Transaksi</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-1">
              <span className="text-slate-500 text-xs font-semibold uppercase">Total Transaksi</span>
              <span className="text-2xl font-bold text-slate-800">{totalTx || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-1">
              <span className="text-slate-500 text-xs font-semibold uppercase">Sedang Berjalan</span>
              <span className="text-2xl font-bold text-blue-600">{activeTx || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-1">
              <span className="text-slate-500 text-xs font-semibold uppercase">Selesai</span>
              <span className="text-2xl font-bold text-green-600">{completedTx || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-1">
              <span className="text-slate-500 text-xs font-semibold uppercase">Sengketa</span>
              <span className="text-2xl font-bold text-red-600">{disputeTx || 0}</span>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-2 mt-6">Informasi Akun</h3>
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="p-0 divide-y">
              <div className="flex items-center justify-between p-4 bg-white">
                <span className="text-slate-700 font-medium">Syarat & Ketentuan</span>
                <div className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle className="w-4 h-4" /> Diterima
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-white">
                <span className="text-slate-700 font-medium">Trust Score</span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md">{typedProfile.trust_score}</span>
              </div>
            </CardContent>
          </Card>

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

  // Layout for Admins
  const [{ count: activeUsers }, { count: totalPlatformTx }, { count: pendingVerification }, { count: openDisputes }] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'PAYMENT_UNDER_REVIEW'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'OPEN')
  ])

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10">
      <ProfileHeader />

      <div className="px-2 space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-2">Sistem Rekber</h3>
        <Card className="rounded-2xl border shadow-sm overflow-hidden bg-slate-900 text-white border-slate-800">
          <CardContent className="p-0 divide-y divide-slate-800">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg"><CheckSquare className="w-5 h-5 text-green-400" /></div>
                <span className="font-medium">Status Sistem</span>
              </div>
              <span className="text-green-400 font-bold text-sm bg-green-400/10 px-2 py-1 rounded">ONLINE</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-slate-400 font-medium">Total Pengguna Aktif</span>
              <span className="font-bold">{activeUsers || 0} User</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-slate-400 font-medium">Total Transaksi Platform</span>
              <span className="font-bold">{totalPlatformTx || 0} Tx</span>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-2 mt-6">Perlu Perhatian</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex flex-col gap-1">
            <span className="text-orange-600 text-xs font-bold uppercase flex items-center gap-1"><Clock className="w-3 h-3"/> Verifikasi</span>
            <span className="text-2xl font-bold text-orange-700">{pendingVerification || 0}</span>
          </div>
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col gap-1">
            <span className="text-red-600 text-xs font-bold uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Sengketa</span>
            <span className="text-2xl font-bold text-red-700">{openDisputes || 0}</span>
          </div>
        </div>

        <div className="pt-4">
          <Link href="/admin">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl flex items-center justify-center px-6 shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]">
              <Settings className="w-5 h-5 mr-2" /> Buka Panel Admin (Lengkap)
            </Button>
          </Link>
        </div>

        <div className="pt-4">
          <form action={logout}>
            <Button type="submit" variant="ghost" className="w-full h-14 rounded-2xl font-bold text-base text-slate-500 hover:bg-slate-100">
              <LogOut className="w-5 h-5 mr-2" /> Keluar Akun
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
