import { Activity } from 'lucide-react'

export default function TransactionsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-blue-50 p-4 rounded-full mb-4 text-blue-600">
        <Activity className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Semua Transaksi</h2>
      <p className="text-slate-500 text-sm">Halaman ini sedang dalam pengembangan. Segera hadir fitur riwayat transaksi yang lebih lengkap.</p>
    </div>
  )
}
