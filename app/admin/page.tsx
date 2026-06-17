import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './admin-dashboard-client'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Verify Admin
  const { data: publicUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!publicUser || publicUser.role === 'user') redirect('/dashboard')
  
  const isSuperAdmin = publicUser.role === 'super_admin'

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

  // Fetch Admins
  const { data: admins } = await supabase
    .from('users')
    .select('*')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: true })

  // Fetch Payment Methods
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('*')
    .order('created_at', { ascending: true })
    
  // Fetch QRIS
  const { data: qrisSettings } = await supabase
    .from('qris_settings')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <AdminDashboard 
        queue={queue || []} 
        allTransactions={allTransactions || []}
        users={users || []}
        logs={logs || []}
        admins={admins || []}
        paymentMethods={paymentMethods || []}
        qrisSettings={qrisSettings || []}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}
