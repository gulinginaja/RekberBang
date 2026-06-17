import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ShieldAlert, HelpCircle, FileText, BadgeDollarSign } from 'lucide-react'

export default function SupportPage() {
  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      <div className="text-center space-y-2 mt-4">
        <h2 className="text-2xl font-bold tracking-tight text-blue-900">Pusat Bantuan</h2>
        <p className="text-muted-foreground">Temukan jawaban, panduan, dan syarat ketentuan layanan Rekber Bang.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            Pertanyaan Umum (FAQ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left font-medium">Berapa biaya admin Rekber Bang?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Biaya admin flat sebesar <strong>5%</strong> dari total nilai transaksi. Biaya ini bisa ditanggung oleh pembeli, penjual, atau dibagi dua (50/50) sesuai kesepakatan saat membuat ruang transaksi.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left font-medium">Bagaimana jika penjual tidak mengirim barang?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Jangan khawatir. Dana Anda aman tertahan di rekening Escrow (Rekber Bang). Jika penjual tidak merespon atau gagal mengirimkan pesanan, Anda dapat menekan tombol <strong>Open Dispute</strong> untuk memanggil Admin, dan dana akan dikembalikan (Refund) 100% kepada Anda.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left font-medium">Berapa lama proses penarikan dana (Withdraw)?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Setelah pembeli mengklik "Barang Diterima", Admin akan langsung mentransfer dana ke rekening penjual dalam kurun waktu maksimal <strong>1x24 jam</strong> (hari kerja).
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            Syarat & Ketentuan (S&K)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> 1. Kebijakan Escrow
            </h4>
            <p>
              Rekber Bang bertindak sebagai pihak ketiga yang netral. Dana hanya akan dicairkan kepada penjual jika pembeli telah mengkonfirmasi penerimaan barang/jasa sesuai dengan deskripsi transaksi.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <BadgeDollarSign className="w-4 h-4 text-emerald-500" /> 2. Kebijakan Refund & Dispute
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Keputusan Admin dalam menyelesaikan Dispute adalah <strong>mutlak dan final</strong>.</li>
              <li>Pengguna wajib melampirkan bukti-bukti yang sah (tangkapan layar, video rekaman layar) saat mengajukan Dispute.</li>
              <li>Bukti palsu atau manipulasi akan mengakibatkan pemblokiran akun secara permanen.</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h4 className="font-semibold mb-2">3. Barang yang Dilarang</h4>
            <p>
              Rekber Bang melarang keras penggunaan layanan untuk transaksi ilegal, perjudian, narkotika, peretasan, dan barang/jasa lain yang melanggar hukum di Indonesia.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center pb-8 pt-4">
        <p className="text-xs text-muted-foreground">© 2026 Rekber Bang. All rights reserved.</p>
      </div>
    </div>
  )
}
