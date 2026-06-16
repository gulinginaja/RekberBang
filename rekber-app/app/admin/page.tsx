import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Placeholder check for admin status
  const { data: userData } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  
  if (!userData?.is_admin) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200">
        You do not have permission to view this page.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Overview</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-slate-500">Active Disputes</p>
          <p className="text-2xl font-semibold">0</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-slate-500">Total Volume</p>
          <p className="text-2xl font-semibold">Rp 0</p>
        </div>
      </div>
    </div>
  )
}
