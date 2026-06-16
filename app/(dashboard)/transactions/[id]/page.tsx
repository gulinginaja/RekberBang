import { getTransactionDetail, getTransactionTimeline } from '@/server/actions/transaction.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EvidenceUploader } from '@/components/transactions/EvidenceUploader'
import { DeliveryUploader } from '@/components/transactions/DeliveryUploader'
import { DisputeCenter } from '@/components/transactions/DisputeCenter'
import { TransactionActionButtons } from '@/components/transactions/TransactionActionButtons'

export default async function TransactionDetailPage({ params }: { params: { id: string } }) {
  const { transaction, error } = await getTransactionDetail(params.id)
  const { logs } = await getTransactionTimeline(params.id)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: publicUser } = await supabase.from('users').select('is_admin').eq('id', user?.id).single()
  const isAdmin = publicUser?.is_admin === true

  if (error || !transaction) {
    return <div className="p-4 text-destructive">Failed to load transaction.</div>
  }

  const isBuyer = user?.id === transaction.buyer?.id
  const isSeller = user?.id === transaction.seller?.id
  
  return (
    <div className="space-y-6 pb-20">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{transaction.title}</CardTitle>
            <Badge>{transaction.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold">Rp {transaction.amount.toLocaleString('id-ID')}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Buyer</p>
              <p className="font-medium">@{transaction.buyer?.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seller</p>
              <p className="font-medium">@{transaction.seller?.username}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="bg-slate-50 p-3 rounded-md text-sm mt-1 whitespace-pre-wrap">
              {transaction.description}
            </p>
          </div>
        </CardContent>
        <CardContent className="p-4 flex flex-col gap-2">
          {transaction.status === 'CREATED' && !transaction.buyer_id && isSeller && (
            <div className="w-full space-y-2">
              <p className="text-sm font-medium">Share this link with your Buyer:</p>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={`https://t.me/RekberBangBot?startapp=invite_${transaction.id}`}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground ring-offset-background"
                />
              </div>
            </div>
          )}

          {transaction.status === 'CREATED' && !isSeller && !transaction.buyer_id && (
             <Link href={`/transactions/${transaction.id}/invite`} className="w-full block">
               <Button className="w-full bg-blue-600 hover:bg-blue-700">Accept Invite</Button>
             </Link>
          )}

          {transaction.status === 'WAITING_PAYMENT' && isBuyer && (
             <div className="w-full">
               <EvidenceUploader transactionId={transaction.id} />
             </div>
          )}
          {transaction.status === 'WAITING_PAYMENT' && !isBuyer && (
             <div className="w-full p-4 bg-slate-50 text-center rounded-md text-sm text-muted-foreground">
               Waiting for Buyer to upload payment proof.
             </div>
          )}
          {transaction.status === 'PAYMENT_UNDER_REVIEW' && (
             <div className="w-full p-4 bg-yellow-50 text-yellow-800 text-center rounded-md border border-yellow-200">
               Payment is under review by Admin. Please wait.
             </div>
          )}

          {transaction.status === 'FUNDED' && isSeller && (
             <div className="w-full">
               <DeliveryUploader transactionId={transaction.id} />
             </div>
          )}
          {transaction.status === 'FUNDED' && !isSeller && (
             <div className="w-full p-4 bg-blue-50 text-center rounded-md text-sm text-muted-foreground">
               Waiting for Seller to upload delivery proof.
             </div>
          )}

          {transaction.status === 'DISPUTED' && (
             <div className="w-full p-4 bg-red-50 text-red-800 text-center rounded-md border border-red-200">
               This transaction is in DISPUTE. Please use the Dispute Center below to communicate with the Admin.
             </div>
          )}

          <TransactionActionButtons 
            transactionId={transaction.id} 
            status={transaction.status} 
            role={isBuyer ? 'buyer' : isSeller ? 'seller' : 'none'} 
          />
        </CardContent>
      </Card>

      {transaction.status === 'DISPUTED' && (
        <DisputeCenter 
          transactionId={transaction.id} 
          messages={transaction.dispute_messages || []} 
          isAdmin={isAdmin}
        />
      )}

      {transaction.evidences && transaction.evidences.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Attached Evidence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transaction.evidences.map((ev: any) => (
              <a 
                key={ev.id} 
                href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/rekber_evidence/${ev.file_url}`} 
                target="_blank"
                rel="noreferrer"
                className="block p-4 border rounded-md hover:bg-slate-50 transition-colors"
              >
                <div className="font-medium text-sm text-blue-600 truncate">{ev.description}</div>
                <div className="text-xs text-muted-foreground mt-1">Uploaded by @{ev.uploader_id === transaction.buyer_id ? transaction.buyer.username : transaction.seller.username}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Timeline</h3>
        <div className="space-y-4 relative border-l-2 border-slate-200 ml-3 pl-4">
          {logs?.map((log) => (
            <div key={log.id} className="relative">
              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-slate-300 border-2 border-white"></div>
              <p className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</p>
              {log.metadata?.message && (
                <div className="mt-1 p-2 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100">
                  <span className="font-semibold">Message:</span> {log.metadata.message}
                </div>
              )}
              {log.metadata?.reason && (
                <div className="mt-1 p-2 bg-red-50 text-red-800 text-sm rounded border border-red-100">
                  <span className="font-semibold">Reason:</span> {log.metadata.reason}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(log.created_at).toLocaleString()} by @{log.actor?.username || 'System'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
