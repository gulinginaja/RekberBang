'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyPayment, rejectPayment, releaseFunds, resolveDispute } from '@/server/actions/transaction.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AdminDashboard({ 
  queue, 
  allTransactions, 
  users, 
  logs 
}: { 
  queue: any[]
  allTransactions: any[]
  users: any[]
  logs: any[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'queue' | 'transactions' | 'users' | 'logs'>('queue')

  // Queue Actions State
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [showPartialFormId, setShowPartialFormId] = useState<string | null>(null)
  const [sellerAmount, setSellerAmount] = useState<number>(0)
  const [buyerAmount, setBuyerAmount] = useState<number>(0)
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  async function handleAction(id: string, action: () => Promise<any>) {
    setLoadingId(id)
    await action()
    setLoadingId(null)
    setReason('')
    setShowPartialFormId(null)
    router.refresh()
  }

  const filteredTransactions = statusFilter === 'ALL' 
    ? allTransactions 
    : allTransactions.filter(tx => tx.status === statusFilter)

  const tabs = [
    { id: 'queue', label: 'Action Queue', count: queue.length },
    { id: 'transactions', label: 'All Tx', count: allTransactions.length },
    { id: 'users', label: 'Users', count: users.length },
    { id: 'logs', label: 'Audit Logs', count: logs.length }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Admin Command Center</h1>
      </div>

      {/* Custom Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-red-600 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: ACTION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {queue.length === 0 && <p className="text-muted-foreground p-8 text-center bg-slate-50 rounded-lg">Queue is empty. Good job!</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {queue.map(tx => (
              <Card key={tx.id} className={tx.status === 'DISPUTED' ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}>
                <CardHeader className="flex flex-row justify-between items-start pb-2">
                  <CardTitle className="text-lg">{tx.title}</CardTitle>
                  <Badge variant={tx.status === 'DISPUTED' ? 'destructive' : 'default'}>{tx.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm pb-2">
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>Rp {tx.amount.toLocaleString('id-ID')}</strong></p>
                    <p className="text-right">ID: {tx.id.split('-')[0]}...</p>
                  </div>
                  <p><strong>Seller:</strong> @{tx.seller?.username} <br/><strong>Buyer:</strong> @{tx.buyer?.username}</p>
                  
                  {/* Evidence Display */}
                  {tx.status === 'PAYMENT_UNDER_REVIEW' && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-100">
                      <p className="font-semibold text-xs mb-1 text-yellow-800">Payment Evidence:</p>
                      <div className="flex flex-col gap-1">
                        {tx.evidences?.filter((e:any) => e.description.includes('Payment')).map((ev: any) => (
                          <a key={ev.id} href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/rekber_evidence/${ev.file_url}`} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                            View Document
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dispute Display */}
                  {tx.status === 'DISPUTED' && tx.disputes && tx.disputes.length > 0 && (
                    <div className="mt-2 bg-red-100 p-2 rounded-md text-xs border border-red-200">
                      <p className="font-bold text-red-900">Dispute Reason:</p>
                      <p className="text-red-800">{tx.disputes[tx.disputes.length - 1].reason}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2 pt-2 border-t mt-2">
                  
                  {/* Queue Action Buttons */}
                  {tx.status === 'PAYMENT_UNDER_REVIEW' && (
                    <div className="w-full space-y-2">
                      <Button onClick={() => handleAction(tx.id, () => verifyPayment(tx.id))} disabled={loadingId === tx.id} className="w-full bg-green-600 hover:bg-green-700">
                        Approve Payment (FUNDED)
                      </Button>
                      <div className="flex gap-2">
                        <Input placeholder="Reject reason..." value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" />
                        <Button onClick={() => handleAction(tx.id, () => rejectPayment(tx.id, reason))} disabled={loadingId === tx.id || !reason} variant="destructive" className="h-9">
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {tx.status === 'CONFIRMED' && (
                    <Button onClick={() => handleAction(tx.id, () => releaseFunds(tx.id))} disabled={loadingId === tx.id} className="w-full bg-blue-600 hover:bg-blue-700">
                      Release Funds to Seller
                    </Button>
                  )}

                  {tx.status === 'DISPUTED' && (
                    <div className="w-full space-y-3">
                       <div className="space-y-1">
                         <Label className="text-xs">Resolution Notes (Required)</Label>
                         <Input placeholder="Final judgment..." value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" />
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <Button onClick={() => handleAction(tx.id, () => resolveDispute(tx.id, 'RELEASE_TO_SELLER', reason))} disabled={loadingId === tx.id || !reason} className="bg-blue-600 text-xs h-9 p-0">
                           Winner: Seller
                         </Button>
                         <Button onClick={() => handleAction(tx.id, () => resolveDispute(tx.id, 'REFUND_TO_BUYER', reason))} disabled={loadingId === tx.id || !reason} className="bg-red-600 text-xs h-9 p-0">
                           Winner: Buyer
                         </Button>
                       </div>
                       <Button onClick={() => setShowPartialFormId(showPartialFormId === tx.id ? null : tx.id)} disabled={loadingId === tx.id || !reason} variant="outline" className="w-full text-xs h-9">
                         Partial Settlement...
                       </Button>

                       {showPartialFormId === tx.id && (
                         <div className="p-3 bg-slate-50 border rounded-md space-y-3 mt-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">To Seller</Label>
                                <Input type="number" value={sellerAmount} onChange={e => setSellerAmount(Number(e.target.value))} className="h-8 text-xs" />
                              </div>
                              <div>
                                <Label className="text-xs">To Buyer</Label>
                                <Input type="number" value={buyerAmount} onChange={e => setBuyerAmount(Number(e.target.value))} className="h-8 text-xs" />
                              </div>
                            </div>
                            <Button onClick={() => handleAction(tx.id, () => resolveDispute(tx.id, 'PARTIAL_SETTLEMENT', reason, sellerAmount, buyerAmount))} disabled={loadingId === tx.id || (sellerAmount + buyerAmount !== tx.amount)} className="w-full bg-slate-800 text-xs h-9">
                              Confirm Split
                            </Button>
                         </div>
                       )}
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Filter Status:</Label>
            <select 
              className="border border-slate-300 rounded-md p-2 text-sm bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="CREATED">CREATED</option>
              <option value="WAITING_PAYMENT">WAITING_PAYMENT</option>
              <option value="PAYMENT_UNDER_REVIEW">PAYMENT_UNDER_REVIEW</option>
              <option value="FUNDED">FUNDED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="DISPUTED">DISPUTED</option>
              <option value="RESOLVED_PARTIAL">RESOLVED_PARTIAL</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>
          
          <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Buyer</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="border-b">
                    <td className="px-4 py-3 font-mono text-xs">{tx.id.substring(0,8)}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]">{tx.title}</td>
                    <td className="px-4 py-3 font-medium">Rp {tx.amount.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{tx.status}</Badge></td>
                    <td className="px-4 py-3">@{tx.seller?.username}</td>
                    <td className="px-4 py-3">@{tx.buyer?.username || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Telegram ID</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="px-4 py-3 font-mono text-xs">{u.telegram_id}</td>
                    <td className="px-4 py-3">@{u.username}</td>
                    <td className="px-4 py-3">{u.first_name} {u.last_name}</td>
                    <td className="px-4 py-3">
                      {u.is_admin ? <Badge className="bg-red-600">Admin</Badge> : <Badge variant="secondary">User</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="p-3 bg-white border rounded flex flex-col md:flex-row md:justify-between md:items-center text-sm gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono bg-slate-50">{log.action}</Badge>
                <span className="text-slate-600 text-xs md:text-sm">
                  Tx: <span className="font-mono">{log.transaction_id?.substring(0,8) || 'SYSTEM'}</span>
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>By @{log.actor?.username || 'System'}</span>
                <span>•</span>
                <span>{new Date(log.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
