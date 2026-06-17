'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Profile Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-50 p-4 rounded-full mb-4 text-red-600">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Gagal Memuat Profil</h2>
      <p className="text-slate-500 text-sm mb-6">Maaf, terjadi kesalahan saat mengambil data profil Anda. Silakan coba lagi.</p>
      <Button onClick={() => reset()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8">
        Coba Lagi
      </Button>
    </div>
  )
}
