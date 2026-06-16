'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction } from '@/lib/actions/transaction.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function CreateTransactionForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const tx = await createTransaction({
        seller_id: formData.get('seller_id') as string, // In real scenario, user might enter seller telegram username and we resolve it
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        amount: parseFloat(formData.get('amount') as string),
        fee: parseFloat(formData.get('amount') as string) * 0.05, // 5% flat fee MVP
        fee_split_mode: formData.get('fee_split_mode') as string,
      })
      router.push(`/dashboard/transactions/${tx.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Transaction</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="text-red-500 text-sm p-3 bg-red-50 rounded">{error}</div>}
          
          <div className="space-y-2">
            <Label htmlFor="seller_id">Seller User ID (UUID)</Label>
            <Input id="seller_id" name="seller_id" required placeholder="Enter seller's Supabase UUID" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Transaction Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Website Source Code Transfer" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Terms & Description</Label>
            <Textarea id="description" name="description" required rows={4} placeholder="Describe what is being sold and conditions of delivery..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (IDR)</Label>
              <Input id="amount" name="amount" type="number" required placeholder="1000000" min="10000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee_split_mode">Fee Split Mode</Label>
              <Select name="fee_split_mode" defaultValue="BUYER_PAYS_ALL" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee split" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUYER_PAYS_ALL">Buyer Pays All Fee</SelectItem>
                  <SelectItem value="SELLER_PAYS_ALL">Seller Pays All Fee</SelectItem>
                  <SelectItem value="SPLIT_50_50">Split 50/50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "Creating..." : "Create Transaction"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
