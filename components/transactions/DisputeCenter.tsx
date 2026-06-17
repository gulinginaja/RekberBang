'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendDisputeMessage } from '@/server/actions/transaction.actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export function DisputeCenter({ 
  transactionId, 
  messages, 
  isAdmin 
}: { 
  transactionId: string
  messages: any[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.append('transactionId', transactionId)

    const res = await sendDisputeMessage(formData)
    
    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setLoading(false)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  // Sort messages chronologically
  const sortedMessages = [...(messages || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div className="mt-8 border border-red-200 rounded-lg overflow-hidden bg-white">
      <div className="bg-red-50 p-4 border-b border-red-200">
        <h2 className="text-xl font-bold text-red-800">Dispute Center</h2>
        <p className="text-sm text-red-600">All communication and evidence submitted here will be reviewed by the Admin to reach a resolution.</p>
      </div>

      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto bg-slate-50">
        {sortedMessages.length === 0 ? (
          <p className="text-center text-muted-foreground italic py-8">No messages yet. Please state your case.</p>
        ) : (
          sortedMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-3 rounded-lg w-full md:w-3/4 ${
                msg.is_internal_note 
                  ? 'bg-yellow-100 border border-yellow-300 ml-auto' 
                  : (msg.sender?.role === 'admin' || msg.sender?.role === 'super_admin')
                    ? 'bg-red-100 border border-red-200 mx-auto w-full text-center' 
                    : 'bg-white border shadow-sm'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm">
                  {(msg.sender?.role === 'admin' || msg.sender?.role === 'super_admin') ? '🛡️ Admin' : `@${msg.sender?.username}`}
                  {msg.is_internal_note && <span className="text-yellow-700 ml-2">(Internal Note)</span>}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              
              {msg.attachment_url && (
                <div className="mt-2">
                  <a 
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/rekber_evidence/${msg.attachment_url}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    📎 View Attached Evidence
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t bg-white">
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <Textarea 
            name="message" 
            placeholder="Type your message or explanation here..." 
            className="min-h-[80px]"
            required 
          />
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex-1 w-full">
               <Label htmlFor="file" className="text-xs text-muted-foreground">Attach Evidence (Image/PDF)</Label>
               <Input id="file" name="file" type="file" accept="image/*,application/pdf" className="h-8 text-xs" />
            </div>
            
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Checkbox id="isInternal" name="isInternal" value="true" />
                <Label htmlFor="isInternal" className="text-sm font-medium text-yellow-700">Internal Note</Label>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full md:w-auto bg-red-600 hover:bg-red-700">
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
