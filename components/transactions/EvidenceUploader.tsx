'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitPaymentProof } from '@/server/actions/transaction.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Copy } from 'lucide-react'

export function EvidenceUploader({ 
  transactionId, 
  transactionAmount,
  paymentMethods = [],
  qrisSettings = []
}: { 
  transactionId: string
  transactionAmount?: number
  paymentMethods?: any[]
  qrisSettings?: any[]
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

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

  const hasPayments = paymentMethods.length > 0 || qrisSettings.length > 0

  return (
    <div className="space-y-6">
      {/* VA Checkout Style Card */}
      <div className="p-5 border rounded-xl bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-4 text-blue-600">
          <div className="p-2 bg-blue-50 rounded-full">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Pembayaran Aman</h3>
            <p className="text-xs text-muted-foreground">Dana ditahan sistem hingga barang diterima.</p>
          </div>
        </div>

        {paymentMethods.map(pm => (
          <div key={pm.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
            <p className="text-sm text-muted-foreground mb-1">Transfer ke {pm.bank_name}</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-bold tracking-wider">{pm.account_number}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(pm.account_number)
                  alert('Nomor rekening disalin!')
                }}
                type="button"
              >
                <Copy className="w-4 h-4" />
                Salin
              </Button>
            </div>
            <p className="text-sm font-medium mt-2 text-slate-700">a.n. {pm.account_holder}</p>
          </div>
        ))}

        {qrisSettings.map(qris => (
          <div key={qris.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-2 font-semibold">{qris.name}</p>
            <div className="flex justify-center mb-2">
              <img 
                src={`${supabaseUrl}/storage/v1/object/public/rekber_evidence/${qris.image_url}`} 
                alt={qris.name} 
                className="max-w-[200px] border p-2 bg-white rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${supabaseUrl}/storage/v1/object/authenticated/rekber_evidence/${qris.image_url}`;
                }}
              />
            </div>
          </div>
        ))}

        {!hasPayments && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
            <p className="text-sm text-muted-foreground mb-1">Transfer ke Rekening Bersama (BCA)</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-bold tracking-wider">8273 9912 44</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2"
                onClick={() => {
                  navigator.clipboard.writeText('8273991244')
                  alert('Nomor rekening disalin!')
                }}
                type="button"
              >
                <Copy className="w-4 h-4" />
                Salin
              </Button>
            </div>
            <p className="text-sm font-medium mt-2 text-slate-700">a.n. REKBER BANG ESCROW</p>
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-b border-dashed">
          <span className="text-muted-foreground text-sm">Total Tagihan</span>
          <span className="font-bold text-lg text-rose-600">Rp {(transactionAmount || 0).toLocaleString('id-ID')}</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-5 border rounded-xl bg-slate-50">
        <div>
          <h3 className="font-semibold text-lg mb-1">Upload Bukti Transfer</h3>
          <p className="text-sm text-muted-foreground">Unggah tangkapan layar mutasi rekening/M-Banking Anda.</p>
        </div>
        
        {error && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</div>}
        
        <div className="space-y-2">
          <Label htmlFor="file" className="sr-only">Bukti Transfer (Image/PDF, Max 5MB)</Label>
          <Input 
            id="file" 
            name="file" 
            type="file" 
            accept="image/*,application/pdf" 
            required 
            className="bg-white file:text-blue-600 file:font-semibold file:bg-blue-50 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base">
          {isLoading ? 'Mengunggah...' : 'Konfirmasi Pembayaran'}
        </Button>
      </form>
    </div>
  )
}
