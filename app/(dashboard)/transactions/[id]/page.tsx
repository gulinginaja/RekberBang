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

  const { data: publicUser } = await supabase.from('users').select('role').eq('id', user?.id).single()
  const isAdmin = publicUser?.role === 'admin' || publicUser?.role === 'super_admin'

  if (error || !transaction) {
    return <div className="p-4 text-destructive">Failed to load transaction.</div>
  }

  // Fetch Payment Methods and QRIS
  const { data: paymentMethods } = await supabase.from('payment_methods').select('*').eq('is_active', true)
  const { data: qrisSettings } = await supabase.from('qris_settings').select('*').eq('is_active', true)

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
              <p className="font-medium">{transaction.buyer?.username ? `@${transaction.buyer.username}` : transaction.buyer?.first_name || 'Buyer'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seller</p>
              <p className="font-medium">{transaction.seller?.username ? `@${transaction.seller.username}` : transaction.seller?.first_name || 'Seller'}</p>
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
          {transaction.status === 'PENDING_ADMIN_APPROVAL' && (
             <div className="w-full p-4 bg-amber-50 text-amber-800 text-center rounded-md border border-amber-200">
               <h4 className="font-semibold flex items-center justify-center gap-2">⏳ Menunggu Persetujuan Admin</h4>
               <p className="text-sm mt-1">Transaksi ini sedang direview oleh Admin sebelum bisa dilanjutkan.</p>
             </div>
          )}

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
               <EvidenceUploader 
                 transactionId={transaction.id} 
                 transactionAmount={transaction.amount} 
                 paymentMethods={paymentMethods || []}
                 qrisSettings={qrisSettings || []}
               />
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
          <div className="grid grid-cols-1 gap-4">
            {transaction.evidences.map((ev: any) => (
              <div key={ev.id} className="block p-4 border rounded-md bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm text-slate-800">{ev.purpose.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-muted-foreground mt-1">Uploaded by @{ev.uploaded_by === transaction.buyer_id ? transaction.buyer?.username : transaction.seller?.username}</div>
                  </div>
                  {ev.file_url ? (
                    <a 
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/rekber_evidence/${ev.file_url}`} 
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      View Image
                    </a>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Image Securely Deleted</span>
                  )}
                </div>

                {/* Render OCR Metadata if it's a payment proof and has data */}
                {ev.purpose === 'PAYMENT_PROOF' && ev.nominal && (
                  <div className="mt-4 bg-slate-50 p-3 rounded text-sm border border-slate-100">
                    <p className="font-semibold text-xs text-slate-500 mb-2 uppercase">Verified Transaction Data</p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      <div><span className="text-muted-foreground">Sender:</span> {ev.sender_name}</div>
                      <div><span className="text-muted-foreground">Amount:</span> Rp {ev.nominal.toLocaleString('id-ID')}</div>
                      <div><span className="text-muted-foreground">Bank:</span> {ev.bank_name}</div>
                      <div><span className="text-muted-foreground">Date:</span> {ev.transfer_date} {ev.transfer_time}</div>
                      <div className="col-span-2 text-xs text-muted-foreground mt-1 pt-1 border-t">
                        Hash: <code className="bg-slate-200 px-1 py-0.5 rounded">{ev.proof_hash?.substring(0, 16)}...</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
