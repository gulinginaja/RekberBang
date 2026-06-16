'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction } from '@/server/actions/transaction.actions'
import { FeeSplitMode } from '@/server/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function CreateTransactionForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get('amount'))
    
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a valid positive number.')
      setIsLoading(false)
      return
    }

    const payload = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      amount,
      fee_split_mode: formData.get('fee_split_mode') as FeeSplitMode
    }

    const res = await createTransaction(payload)

    if (res.error) {
      setError(res.error)
      setIsLoading(false)
    } else if (res.success && res.transaction) {
      router.push(`/transactions/${res.transaction.id}`)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-sm">
      <CardHeader>
        <CardTitle>New Transaction</CardTitle>
        <CardDescription>Start a secure escrow holding.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
          

          <div className="space-y-2">
            <Label htmlFor="title">Transaction Title</Label>
            <Input id="title" name="title" placeholder="e.g., iPhone 13 Pro" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (IDR)</Label>
            <Input id="amount" name="amount" type="number" min="1" placeholder="500000" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee_split_mode">Fee Payment</Label>
            <Select name="fee_split_mode" defaultValue="SPLIT_50_50">
              <SelectTrigger>
                <SelectValue placeholder="Select fee split" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SPLIT_50_50">Split 50/50</SelectItem>
                <SelectItem value="BUYER_PAYS_ALL">Buyer Pays All</SelectItem>
                <SelectItem value="SELLER_PAYS_ALL">Seller Pays All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Terms & Description</Label>
            <Textarea 
              id="description" 
              name="description" 
              placeholder="Describe the condition, delivery method, and any specific terms." 
              className="resize-none"
              rows={4}
              required 
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Escrow'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
