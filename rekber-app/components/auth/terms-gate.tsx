'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { acceptTerms } from '@/server/actions/auth.actions'
import { useUser } from '@/components/auth/user-provider'
import { AlertCircle, FileText } from 'lucide-react'

export function TermsGate({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  if (!user) return null; // Wait for user to load

  if (user.terms_accepted_at) {
    return <>{children}</>
  }

  const handleAccept = async () => {
    setIsSubmitting(true)
    const res = await acceptTerms()
    if (res.success) {
      await refreshUser()
    } else {
      alert("Gagal menyetujui syarat & ketentuan: " + res.error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Syarat & Ketentuan</h2>
            <p className="text-xs text-zinc-400">Wajib disetujui sebelum bertransaksi</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto text-sm text-zinc-300 space-y-4 custom-scrollbar">
          <p>Dengan menggunakan layanan Rekber Bang, Anda menyatakan setuju terhadap poin-poin berikut:</p>
          
          <ul className="space-y-3">
            <li className="flex gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span><strong>Tanggung Jawab Barang:</strong> Admin hanya bertindak sebagai pihak penengah (Escrow) penahan dana. Kualitas dan legalitas barang sepenuhnya adalah urusan Pembeli dan Penjual.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span><strong>Biaya Layanan:</strong> Terdapat biaya platform (Fee Rekber) sebesar 5% dari pihak Pembeli dan fee pencairan (WD) 2.5% dari pihak Penjual.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span><strong>Waktu Konfirmasi:</strong> Pembeli wajib melakukan konfirmasi penerimaan maksimal 2 jam setelah penjual menekan tombol "Kirim Barang". Lewat dari itu dana otomatis dilepas (Auto-Done).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span><strong>Penyelesaian Sengketa (Dispute):</strong> Jika terjadi masalah, dana akan dibekukan sementara hingga Admin memberikan keputusan mutlak (Release/Refund) berdasarkan bukti yang diunggah kedua pihak. Keputusan Admin tidak dapat diganggu gugat.</span>
            </li>
          </ul>

          <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg flex gap-3 text-orange-400 mt-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs leading-relaxed">
              Penipuan, pemalsuan bukti transfer, dan tindakan kriminal lainnya akan ditindak tegas dengan pemblokiran permanen dan pelaporan ke pihak berwajib.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex gap-3">
          <Button 
            variant="outline" 
            className="w-full bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => router.push('/')}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleAccept}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Memproses...' : 'Saya Setuju'}
          </Button>
        </div>
        
      </div>
    </div>
  )
}
