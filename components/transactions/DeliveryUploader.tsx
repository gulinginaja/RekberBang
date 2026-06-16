'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitDeliveryEvidence } from '@/server/actions/transaction.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function DeliveryUploader({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.append('transactionId', transactionId)

    const res = await submitDeliveryEvidence(formData)
    
    if (res.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4 border rounded-md bg-blue-50 mt-4 border-blue-200">
      <h3 className="font-semibold text-lg text-blue-900">Upload Delivery Evidence</h3>
      <p className="text-sm text-blue-800 mb-4">
        The buyer has funded the transaction. Please send the item/account and upload proof of delivery below.
      </p>

      {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}
      
      <div className="space-y-2">
        <Label htmlFor="file">Screenshot / Receipt (Image or PDF, Max 5MB)</Label>
        <Input id="file" name="file" type="file" accept="image/*,application/pdf" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Delivery Notes (Optional)</Label>
        <Textarea 
          id="notes" 
          name="notes" 
          placeholder="e.g. Account details sent via Telegram, or Resi: JNE12345" 
          rows={3} 
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
        {isLoading ? 'Uploading...' : 'Submit Delivery Proof'}
      </Button>
    </form>
  )
}
