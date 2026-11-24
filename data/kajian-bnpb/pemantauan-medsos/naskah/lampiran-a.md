# Lampiran A. Rincian Rencana Anggaran Biaya

Semua angka dalam rupiah, dibulatkan ke ribuan. Kurs Rp16.500 per dolar Amerika Serikat. Harga layanan per November 2026 dan wajib diperiksa ulang lewat penawaran resmi saat pengadaan.

## A.1 Paket Mulai

Tabel A.1. Biaya rutin Paket Mulai per bulan

| No | Uraian | Volume dan harga satuan | Per bulan |
| ---: | --- | --- | ---: |
| 1 | X API skema bayar per pemakaian | 1.500 post per hari, 45.000 post per bulan, US$0,005 per post | 3.712.000 |
| 2 | Claude Haiku 5.5 untuk klasifikasi | 20.000 kabar per hari; 800 token masukan (US$0,10 per juta) dan 150 token keluaran (US$0,50 per juta) per kabar | 1.534.000 |
| 3 | Claude Sonnet 5.5 untuk ringkasan piket | 48 ringkasan per hari; 20.000 token masukan (US$2 per juta) dan 1.500 token keluaran (US$10 per juta) per ringkasan | 1.307.000 |
| 4 | Server virtual untuk penarik TikTok | 1 unit, 4 vCPU, 8 GB memori, harga pasar | 1.000.000 |
| 5 | Cloudflare Workers Paid dan kelebihan pemakaian D1 dan R2 | US$25 per bulan | 412.000 |
| 6 | Threads API, Instagram Graph API, RSS portal, Google News RSS, GDELT | Jalur resmi tanpa biaya | 0 |
| 7 | Verifikasi oleh piket Pusdalops | Tenaga yang sudah ada | 0 |
|  | Jumlah |  | 7.965.000 |
|  | Cadangan 10 persen |  | 796.000 |
|  | Jumlah per bulan |  | 8.761.000 |
|  | Jumlah 12 bulan |  | 105.132.000 |

Sumber: perhitungan kajian ini.

Pengembangan sistem, dashboard, dan notifikasi dikerjakan swakelola oleh Tim Sus IT BNPB dan memakai bot WhatsApp yang sudah ada, sehingga tidak ada biaya satu kali. Jumlah tahun pertama Paket Mulai adalah Rp105.132.000.

## A.2 Paket Lengkap

Tabel A.2. Biaya rutin Paket Lengkap per bulan

| No | Uraian | Volume dan harga satuan | Per bulan |
| ---: | --- | --- | ---: |
| 1 | X API skema bayar per pemakaian | 5.000 post per hari, 150.000 post per bulan, US$0,005 per post | 12.375.000 |
| 2 | Layanan penarik pihak ketiga untuk Instagram, Reels, TikTok, dan Facebook | 200.000 hasil per bulan, US$2 per 1.000 hasil, ditambah langganan US$49 | 7.408.000 |
| 3 | Claude Haiku 5.5 untuk klasifikasi | 60.000 kabar per hari, token per kabar sama dengan Paket Mulai | 4.604.000 |
| 4 | Claude Sonnet 5.5 untuk ringkasan nasional dan provinsi | 96 ringkasan per hari | 2.614.000 |
| 5 | Server virtual | 2 unit | 2.000.000 |
| 6 | Cloudflare Workers Paid dan kelebihan pemakaian D1 dan R2 | US$50 per bulan | 825.000 |
| 7 | Threads API, Instagram Graph API, RSS portal, Google News RSS, GDELT | Jalur resmi tanpa biaya | 0 |
| 8 | Verifikator tambahan, empat orang bergiliran 24 jam | 4 orang, Rp6.000.000 per orang per bulan | 24.000.000 |
|  | Jumlah |  | 53.826.000 |
|  | Cadangan 10 persen |  | 5.383.000 |
|  | Jumlah per bulan |  | 59.209.000 |
|  | Jumlah 12 bulan |  | 710.508.000 |

Sumber: perhitungan kajian ini.

Seperti Paket Mulai, tidak ada biaya satu kali. Jumlah tahun pertama Paket Lengkap adalah Rp710.508.000.

## A.3 Cara menekan biaya

1. Batas belanja bulanan di akun X API membuat biaya X tidak pernah melampaui anggaran; bila batas tercapai, X berhenti ditarik sampai bulan berikutnya dan sumber lain tetap berjalan.
2. Kabar yang jelas tidak relevan dibuang oleh penyaring kata sebelum dikirim ke model bahasa, sehingga hanya sebagian kabar yang ditagih.
3. Ringkasan untuk rekap harian dan bulanan, yang tidak perlu segera, dapat dikirim lewat Message Batches dengan potongan harga 50 persen.
4. Pada musim kemarau, kueri karhutla dan kekeringan diperbanyak; pada musim hujan, kueri banjir dan longsor diperbanyak. Jumlah kueri total tetap.
