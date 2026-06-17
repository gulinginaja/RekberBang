'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  confirmDelivery, 
  raiseDispute, 
  requestClarification,
  cancelTransaction 
} from '@/server/actions/transaction.actions'
import { Button } from '@/components/ui/button'

export function TransactionActionButtons({ 
  transactionId, 
  status, 
  role 
}: { 
  transactionId: string
  status: string
  role: 'buyer' | 'seller' | 'none' 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleAction(action: () => Promise<any>) {
    setLoading(true)
    await action()
    setLoading(false)
    router.refresh()
  }

  if (role === 'none') return null

  return (
    <div className="flex flex-col gap-2 mt-4">
      {/* BUYER ACTIONS */}
      {role === 'buyer' && status === 'DELIVERED' && (
        <div className="flex flex-col gap-2">
          <Button onClick={() => handleAction(() => confirmDelivery(transactionId))} disabled={loading} className="bg-green-600 hover:bg-green-700">
            Confirm Item Received
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              const msg = prompt('Ask the Seller for clarification:')
              if (msg) handleAction(() => requestClarification(transactionId, msg))
            }} 
            disabled={loading}
          >
            Request Clarification
          </Button>
        </div>
      )}

      {/* DISPUTE (Both) */}
      {(status === 'DELIVERED' || status === 'CONFIRMED') && (
        <Button 
          variant="destructive" 
          onClick={() => {
            const reason = prompt('Please enter the reason for your dispute:')
            if (reason) handleAction(() => raiseDispute(transactionId, reason))
          }} 
          disabled={loading}
        >
          Raise Dispute
        </Button>
      )}

      {/* CANCEL (Seller Only, before funded) */}
      {role === 'seller' && (status === 'CREATED' || status === 'PENDING_ADMIN_APPROVAL') && (
        <Button variant="outline" onClick={() => handleAction(() => cancelTransaction(transactionId))} disabled={loading}>
          Cancel Transaction
        </Button>
      )}
    </div>
  )
}
