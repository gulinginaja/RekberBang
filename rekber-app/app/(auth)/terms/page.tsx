'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptTerms } from '@/lib/actions/user.actions'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

export default function TermsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await acceptTerms()
      router.push('/dashboard')
    } catch (error) {
      console.error(error)
      alert("Failed to accept terms. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Rekber Bang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
          <p>
            Welcome to Rekber Bang. By using this platform, you agree to our Terms of Service and Disclaimer.
          </p>
          <div className="h-48 overflow-y-auto rounded bg-neutral-100 p-4 dark:bg-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Disclaimer</h3>
            <p className="mt-2">
              Rekber Bang acts ONLY as a transaction facilitator (escrow workflow platform). 
              We are NOT a seller, buyer, bank, financial institution, investment platform, or legal guarantor.
            </p>
            <p className="mt-2">
              Illegal transactions are strictly prohibited. You accept full responsibility for the nature 
              and legality of your transactions.
            </p>
            <h3 className="mt-4 font-semibold text-neutral-900 dark:text-neutral-100">Terms of Service</h3>
            <p className="mt-2">
              1. You agree to provide accurate information. <br/>
              2. You understand that dispute resolutions made by admins are final. <br/>
              3. You agree to not hold Rekber Bang liable for any damages arising from disputes.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={handleAccept} 
            disabled={loading}
          >
            {loading ? "Processing..." : "I Accept the Terms"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
