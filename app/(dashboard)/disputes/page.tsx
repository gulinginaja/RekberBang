import { AlertCircle } from 'lucide-react'

export default function DisputesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-50 p-4 rounded-full mb-4 text-red-600">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Pusat Sengketa</h2>
      <p className="text-slate-500 text-sm">Anda tidak memiliki sengketa aktif saat ini.</p>
    </div>
  )
}
