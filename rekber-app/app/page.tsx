import Link from 'next/link'
import { StartTransactionButton } from '@/components/landing/start-transaction-button'
import { Button } from '@/components/ui/button'
import { 
  ShieldCheck, 
  Zap, 
  Scale, 
  Wallet, 
  ArrowRight,
  MessageCircle,
  FileText,
  Lock,
  Package,
  Banknote,
  Coins,
  AlertCircle,
  ScrollText
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-blue-100">
      {/* 1. HERO SECTION */}
      <section className="relative px-4 py-20 md:py-32 flex flex-col items-center text-center overflow-hidden bg-white border-b">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-100 text-blue-800 mb-6">
          <ShieldCheck className="w-4 h-4 mr-1" /> Verified Escrow Platform
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-4 max-w-3xl">
          Transaksi Aman,<br className="hidden md:block"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Tanpa Was-Was.</span>
        </h1>
        
        <p className="text-lg text-slate-600 max-w-xl mb-8">
          Sistem Rekening Bersama (Rekber) terpercaya yang terintegrasi langsung dengan Telegram. Jual beli akun, game, atau jasa digital dengan perlindungan 100%.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
          <StartTransactionButton variant="primary" />
          <a href="#how-it-works" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full h-12 px-8 text-base">
              Pelajari Cara Kerjanya
            </Button>
          </a>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section id="how-it-works" className="px-4 py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Bagaimana Cara Kerjanya?</h2>
            <p className="text-slate-600 text-lg">Alur transaksi yang dirancang untuk melindungi kedua belah pihak.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-slate-100 flex flex-col relative group text-left">
              <div className="absolute top-8 right-8 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                1
              </div>
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">Buat Transaksi</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Seller membuat transaksi via Mini App dan membagikan Link Invite kepada pihak Buyer.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-slate-100 flex flex-col relative group text-left">
              <div className="absolute top-8 right-8 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-bold text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 group-hover:border-amber-100 transition-colors">
                2
              </div>
              <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <Wallet className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">Buyer Melakukan Pembayaran</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Buyer mentransfer dana ke rekening Admin. Uang disimpan dengan aman di sistem Escrow.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-slate-100 flex flex-col relative group text-left">
              <div className="absolute top-8 right-8 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-bold text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                3
              </div>
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <Package className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">Seller Mengirim Barang/Jasa</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Setelah dana diamankan, Seller mengirimkan barang atau jasa digital kepada pihak Buyer.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-slate-100 flex flex-col relative group text-left">
              <div className="absolute top-8 right-8 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-bold text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-colors">
                4
              </div>
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <Banknote className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">Dana Dicairkan</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Buyer mengonfirmasi penerimaan. Uang akan langsung dicairkan ke rekening pihak Seller.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WHY REKBER BANG */}
      <section className="px-4 py-20 bg-white border-y">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Kenapa Memilih Rekber Bang?</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 bg-blue-50 p-2 rounded-lg text-blue-600"><Lock className="w-5 h-5"/></div>
                  <div>
                    <h4 className="font-bold text-slate-900">100% Anti Penipuan (Scam)</h4>
                    <p className="text-sm text-slate-600">Dana ditahan di rekening netral. Penjual tidak akan dibayar sebelum pembeli menerima barang dengan selamat.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 bg-blue-50 p-2 rounded-lg text-blue-600"><Scale className="w-5 h-5"/></div>
                  <div>
                    <h4 className="font-bold text-slate-900">Resolusi Sengketa Adil</h4>
                    <p className="text-sm text-slate-600">Terjadi masalah? Fitur Dispute Center kami memungkinkan Admin menengahi masalah dengan bukti (evidence) dari kedua pihak.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 bg-blue-50 p-2 rounded-lg text-blue-600"><Zap className="w-5 h-5"/></div>
                  <div>
                    <h4 className="font-bold text-slate-900">Otomatis & Cepat</h4>
                    <p className="text-sm text-slate-600">Tidak perlu menunggu balasan chat manual berjam-jam. Sistem State Machine kami memproses transaksi secara instan.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-100 p-8 rounded-2xl">
              {/* Mockup UI */}
              <div className="bg-white rounded-xl shadow-lg border p-4 space-y-4">
                <div className="flex items-center gap-3 border-b pb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Status Transaksi</p>
                    <p className="text-xs text-green-600 font-semibold">FUNDED (Uang Aman)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-slate-100 rounded w-full"></div>
                  <div className="h-2 bg-slate-100 rounded w-4/5"></div>
                  <div className="h-2 bg-slate-100 rounded w-full"></div>
                </div>
                <Button className="w-full text-xs h-8" disabled>Menunggu Pengiriman...</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FAQ & TERMS */}
      <section className="px-4 py-24 bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Pertanyaan Umum</h2>
            <p className="text-lg text-slate-600">Temukan jawaban cepat sebelum memulai transaksi.</p>
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border border-slate-200 bg-white rounded-2xl px-6 py-2 shadow-sm hover:border-blue-200 transition-colors data-[state=open]:border-blue-200 data-[state=open]:ring-1 data-[state=open]:ring-blue-100">
              <AccordionTrigger className="text-left font-semibold text-lg text-slate-900 hover:no-underline group">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Coins className="w-6 h-6" />
                  </div>
                  <span>Berapa biaya (fee) Rekber Bang?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed pt-2 pb-4 text-base ml-14">
                Fee disesuaikan dengan kesepakatan saat membuat transaksi. Bisa ditanggung penuh oleh Buyer, ditanggung Seller, atau dibagi 50:50. Sistem akan memotong otomatis saat pencairan.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-slate-200 bg-white rounded-2xl px-6 py-2 shadow-sm hover:border-blue-200 transition-colors data-[state=open]:border-blue-200 data-[state=open]:ring-1 data-[state=open]:ring-blue-100">
              <AccordionTrigger className="text-left font-semibold text-lg text-slate-900 hover:no-underline group">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <span>Apa yang terjadi jika barang tidak dikirim?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed pt-2 pb-4 text-base ml-14">
                Buyer dapat menekan tombol "Open Dispute". Dana akan dikunci sepenuhnya. Jika Seller terbukti tidak mengirim barang/akun, Admin akan melakukan REFUND 100% ke rekening Buyer.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-slate-200 bg-white rounded-2xl px-6 py-2 shadow-sm hover:border-blue-200 transition-colors data-[state=open]:border-blue-200 data-[state=open]:ring-1 data-[state=open]:ring-blue-100">
              <AccordionTrigger className="text-left font-semibold text-lg text-slate-900 hover:no-underline group">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <ScrollText className="w-6 h-6" />
                  </div>
                  <span>Ringkasan Syarat & Ketentuan (Disclaimer)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed pt-2 pb-4 text-base ml-14">
                <ul className="list-disc space-y-2">
                  <li>Pengguna <b className="text-slate-800">wajib</b> memberikan bukti (evidence) valid berupa rekaman layar atau foto jika terjadi sengketa.</li>
                  <li>Keputusan Admin dalam Dispute Center adalah <b className="text-slate-800">MUTLAK</b> dan tidak dapat diganggu gugat.</li>
                  <li>Uang yang sudah masuk (FUNDED) tidak bisa ditarik sepihak tanpa persetujuan pihak lawan atau putusan Admin.</li>
                  <li>Dilarang melakukan transaksi ilegal (narkoba, senjata, dll). Akun akan langsung diblokir dan dana disita.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* 5. CTA BOTTOM */}
      <section className="px-4 py-24 bg-blue-600 text-white text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">Siap Bertransaksi dengan Aman?</h2>
          <p className="text-blue-100 text-lg">Tidak perlu khawatir ditipu lagi. Gunakan Rekber Bang sekarang secara gratis langsung dari Telegram Anda.</p>
          <StartTransactionButton variant="secondary" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center text-slate-500 border-t bg-white">
        <p className="text-sm">© {new Date().getFullYear()} Rekber Bang. Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  )
}
