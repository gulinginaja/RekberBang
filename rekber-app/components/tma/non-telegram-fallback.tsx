import { AlertCircle } from "lucide-react"

export function NonTelegramFallback() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-sm w-full space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-zinc-100">Akses Ditolak</h1>
          <p className="text-sm text-zinc-400">
            Aplikasi ini hanya dapat diakses melalui Telegram Mini App demi keamanan transaksi Anda.
          </p>
        </div>

        <a 
          href="https://t.me/RekberBangBot" 
          className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          Buka di Telegram
        </a>
      </div>
    </div>
  )
}
