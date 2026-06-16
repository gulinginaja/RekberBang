import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return notFound() // Secure the route

  // Fetch pending payments
  const { data: pendingPayments } = await supabase
    .from('transactions')
    .select('id, title, amount, status, payment_proof_url')
    .eq('status', 'WAITING_PAYMENT')

  // Fetch pending releases
  const { data: pendingReleases } = await supabase
    .from('transactions')
    .select('id, title, amount, status')
    .eq('status', 'CONFIRMED')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-500">Admin Control Panel</h2>
        <p className="text-neutral-500">Manage transactions, verify payments, and resolve disputes.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-500">Payment Verification Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPayments && pendingPayments.length > 0 ? (
              pendingPayments.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-3 bg-white dark:bg-neutral-900 rounded border">
                  <div>
                    <span className="font-medium block">{tx.title}</span>
                    <span className="text-xs text-neutral-500">IDR {tx.amount.toLocaleString()}</span>
                  </div>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => window.open(tx.payment_proof_url, '_blank')}>View Proof</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">Approve</Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">No pending payments.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-500">Release Funds Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingReleases && pendingReleases.length > 0 ? (
              pendingReleases.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-3 bg-white dark:bg-neutral-900 rounded border">
                  <div>
                    <span className="font-medium block">{tx.title}</span>
                    <span className="text-xs text-neutral-500">IDR {tx.amount.toLocaleString()}</span>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Mark as Released</Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">No pending releases.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
