'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitPaymentProof } from '@/server/actions/transaction.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EvidenceUploader({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.append('transactionId', transactionId)

    const res = await submitPaymentProof(formData)
    
    if (res.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      router.refresh() // Reload the page to reflect the new state
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4 border rounded-md bg-slate-50 mt-4">
      <h3 className="font-semibold text-lg">Upload Payment Proof</h3>
      {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}
      <div className="space-y-2">
        <Label htmlFor="file">Transfer Receipt (Image or PDF, Max 5MB)</Label>
        <Input id="file" name="file" type="file" accept="image/*,application/pdf" required />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Uploading...' : 'Submit Proof'}
      </Button>
    </form>
  )
}
