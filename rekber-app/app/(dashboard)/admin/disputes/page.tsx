import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function AdminDisputesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return notFound()

  const { data: disputes } = await supabase
    .from('disputes')
    .select(`
      *,
      transaction:transaction_id(title, amount),
      raiser:raised_by(first_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dispute Resolution Center</h2>
        <p className="text-neutral-500">Review evidence and adjudicate active disputes.</p>
      </div>

      <div className="grid gap-4">
        {disputes && disputes.length > 0 ? (
          disputes.map(dispute => (
            <Card key={dispute.id}>
              <CardHeader className="pb-3 flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Tx: {dispute.transaction?.title}</CardTitle>
                  <p className="text-sm text-neutral-500">Raised by: {dispute.raiser?.first_name}</p>
                </div>
                <Badge variant={dispute.status === 'OPEN' ? 'destructive' : 'secondary'}>
                  {dispute.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded text-sm">
                  <span className="font-semibold block mb-1">Reason:</span>
                  {dispute.reason}
                </div>
                {dispute.status === 'OPEN' && (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline">View Evidence</Button>
                    <Button className="bg-green-600 hover:bg-green-700">Release to Seller</Button>
                    <Button className="bg-red-600 hover:bg-red-700">Refund to Buyer</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-neutral-500">No active disputes.</p>
        )}
      </div>
    </div>
  )
}
