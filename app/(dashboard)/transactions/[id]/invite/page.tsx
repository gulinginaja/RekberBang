'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptTransactionInvite } from '@/server/actions/transaction.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TermsGate } from '@/components/auth/terms-gate'

export default function InvitePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // In a real implementation, we would fetch the transaction details securely here.
  // We'll leave the fetching logic to the server action or a dedicated SWR/Server Component hook.
  // For MVP, we provide a button to attempt the accept directly.

  async function handleAccept() {
    setIsLoading(true)
    setError(null)

    const res = await acceptTransactionInvite(params.id)
    if (res.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      router.push(`/transactions/${params.id}`)
    }
  }

  return (
    <TermsGate>
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader className="text-center">
            <Badge className="mx-auto mb-2 bg-blue-500">Escrow Invite</Badge>
            <CardTitle className="text-2xl">You have been invited!</CardTitle>
            <CardDescription>
              Someone invited you to an escrow transaction. By accepting, you will lock yourself in as the Buyer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 text-center">
                {error}
              </div>
            )}
            
            <div className="bg-slate-50 p-4 rounded-md border border-slate-100 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Transaction ID</p>
              <p className="font-mono text-xs truncate max-w-full">{params.id}</p>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button onClick={handleAccept} disabled={isLoading} className="w-full h-12 text-lg">
              {isLoading ? 'Accepting...' : 'Accept & Become Buyer'}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/')} className="w-full">
              Decline
            </Button>
          </CardFooter>
        </Card>
      </div>
    </TermsGate>
  )
}
