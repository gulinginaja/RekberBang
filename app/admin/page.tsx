import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './admin-dashboard-client'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Verify Admin
  const { data: publicUser } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!publicUser?.is_admin) redirect('/dashboard')

  // Fetch Action Queue
  const { data: queue } = await supabase
    .from('transactions')
    .select(`
      *,
      buyer:buyer_id (username),
      seller:seller_id (username),
      evidences (*),
      disputes (*)
    `)
    .in('status', ['PAYMENT_UNDER_REVIEW', 'DELIVERED', 'DISPUTED'])
    .order('updated_at', { ascending: false })

  // Fetch All Transactions
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('*, buyer:buyer_id(username), seller:seller_id(username)')
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch Users
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch Audit Logs
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, actor:actor_id(username)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <AdminDashboard 
        queue={queue || []} 
        allTransactions={allTransactions || []}
        users={users || []}
        logs={logs || []}
      />
    </div>
  )
}
