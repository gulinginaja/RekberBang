'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UploadCloud } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function EvidenceUploader({ transactionId, purpose }: { transactionId: string, purpose: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not logged in")

      const fileExt = file.name.split('.').pop()
      const fileName = `${transactionId}-${Date.now()}.${fileExt}`
      const bucket = purpose === 'PAYMENT_PROOF' ? 'payment-proofs' : 'evidence'

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Record in DB
      if (purpose === 'PAYMENT_PROOF') {
         await supabase.from('transactions').update({ payment_proof_url: fileName, status: 'WAITING_PAYMENT' }).eq('id', transactionId) // Should be a server action in prod
      } else {
         await supabase.from('evidence').insert({
            transaction_id: transactionId,
            uploaded_by: user.id,
            file_url: fileName,
            file_type: file.type,
            purpose: purpose
         })
      }
      
      router.refresh()
    } catch (e: any) {
      alert("Upload failed: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-dashed p-6 rounded-lg text-center space-y-4 bg-neutral-50 dark:bg-neutral-900">
      <UploadCloud className="w-10 h-10 text-neutral-400 mx-auto" />
      <div>
        <p className="text-sm font-medium">Select file to upload</p>
        <p className="text-xs text-neutral-500">Image or PDF (Max 5MB)</p>
      </div>
      <Input type="file" className="max-w-xs mx-auto" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button disabled={!file || loading} onClick={handleUpload} className="bg-blue-600 hover:bg-blue-700 text-white">
        {loading ? "Uploading..." : "Upload Evidence"}
      </Button>
    </div>
  )
}
