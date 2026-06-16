import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function TransactionDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Await the params before using them as per Next.js 15 rules for dynamic params
  const { id } = await params

  const { data: tx, error } = await supabase
    .from('transactions')
    .select(`*, buyer:buyer_id(first_name), seller:seller_id(first_name)`)
    .eq('id', id)
    .single()

  if (error || !tx) return notFound()

  // Ensure user is authorized
  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) {
    const { data: adminCheck } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
    if (!adminCheck?.is_admin) return notFound()
  }

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{tx.title}</h2>
          <p className="text-neutral-500">ID: {tx.id}</p>
        </div>
        <Badge variant={tx.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {tx.status}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="font-semibold block text-sm">Description</span>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{tx.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <span className="font-semibold block text-xs uppercase text-neutral-500">Amount</span>
                <p className="font-medium">IDR {tx.amount.toLocaleString()}</p>
              </div>
              <div>
                <span className="font-semibold block text-xs uppercase text-neutral-500">Fee</span>
                <p className="font-medium">IDR {tx.fee.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between border-b pb-2">
               <span className="text-sm text-neutral-500">Buyer</span>
               <span className="font-medium">{tx.buyer?.first_name || 'Unknown'}</span>
             </div>
             <div className="flex justify-between pb-2">
               <span className="text-sm text-neutral-500">Seller</span>
               <span className="font-medium">{tx.seller?.first_name || 'Unknown'}</span>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Evidence Section Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Actions & Evidence</CardTitle>
          <CardDescription>Upload necessary documents to proceed with the transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          {tx.status === 'CREATED' && tx.buyer_id === user.id && (
            <div className="text-sm text-amber-600 bg-amber-50 p-4 rounded">
              Awaiting seller acceptance or immediate payment upload depending on flow.
            </div>
          )}
          {/* We will embed the EvidenceUploader component here */}
          <div className="p-8 border border-dashed rounded flex justify-center items-center text-neutral-400 mt-4">
            Evidence Uploader Placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
