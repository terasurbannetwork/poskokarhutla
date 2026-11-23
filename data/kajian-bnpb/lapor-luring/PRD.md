# PRD: Lapor tanpa sinyal

## Tujuan

Warga yang melihat kejadian di tempat tanpa sinyal tetap bisa membuat laporan awal yang berisi jenis bencana, lokasi GPS, waktu, ada korban atau tidak, ringkasan singkat, dan foto, lalu laporan terkirim sendiri begitu HP tersambung, tanpa membuka ulang percakapan.

## Pengguna

| Pengguna | Kebutuhan |
| --- | --- |
| Warga yang pernah melapor lewat HP itu | Formulir pendek yang tetap terbuka tanpa sinyal |
| Warga baru | Ajakan menyiapkan perangkat saat ada sinyal; tanpa itu hanya 112 dan nomor penting dari simpanan (Q2) |
| Petugas meja BNPB dan BPBD | Membedakan laporan luring dari laporan chat, melihat kapan dibuat dan kapan diterima |

## Fitur

| ID | Fitur | Prioritas |
| --- | --- | --- |
| F-1 | Cangkang `/lapor/` terbuka tanpa sinyal lewat service worker, termasuk nomor penting dan edukasi dari simpanan | Wajib |
| F-2 | Langkah Siapkan lapor tanpa sinyal (saat ada sinyal): pasang cangkang, minta izin lokasi dan kamera, minta penyimpanan bertahan, tampilkan status "Siap" | Wajib |
| F-3 | Deteksi tanpa sinyal: pita "Tanpa sinyal" dan tombol Lapor tanpa sinyal; tombol Lapor darurat dan Lapor kejadian tetap tampil dan mengarahkan ke formulir luring bila kirim gagal | Wajib |
| F-4 | Formulir luring: jenis (kartu bergambar), lokasi GPS, waktu kejadian (pilihan), korban, ringkasan opsional, sampai 3 foto dari kamera | Wajib |
| F-5 | Simpan sebagai satu butir antrean; layar konfirmasi "Tersimpan di HP, akan terkirim saat ada sinyal" dengan ringkasan isi | Wajib |
| F-6 | Pita "Belum terkirim" (antre.js) di halaman, tombol Kirim sekarang, buang butir; keadaan menunggu, mengirim, ditolak | Wajib |
| F-7 | Pengiriman otomatis saat tersambung, idempoten; sesudahnya notifikasi dalam halaman dengan nomor tiket dan tautan lacak | Wajib |
| F-8 | Laporan di meja berlabel "Dikirim dari luring", dengan waktu dibuat di HP dan waktu diterima | Wajib |
| F-9 | Tombol "Hapus semua data luring" dan penghapusan otomatis setelah terkirim atau 14 hari | Wajib |
| F-10 | Pemilihan kab/kota dari daftar tersimpan bila GPS gagal (Q7) | Sebaiknya |
| F-11 | Pengiriman latar Android Chrome lewat Background Sync (Q8) | Fase 2 |
| F-12 | Ajakan pasang ke layar utama (Q11) | Sebaiknya |

## Di luar lingkup

Chat Sigap penuh tanpa sinyal, AI di HP, video luring (Q5), pencarian nama tempat dan peta tanpa sinyal, balasan petugas tanpa sinyal, SMS dan telepon (Q10), pengiriman latar di iOS, sandi atau PIN untuk butir (Q6), pelaporan oleh BPBD dengan data lanjutan (paket lapor-lanjutan).

## Larangan

Tidak menulis "aman" di layar atau pesan. Tidak menampilkan lokasi dan nomor di pita. Tidak mengubah kosong jadi nol. Tidak menerima foto galeri. Tidak memasang kunci rahasia di butir. Tidak ada tombol 🧪 atau data dummy.

## Kriteria sukses

| Ukuran | Target |
| --- | --- |
| Formulir terbuka dan bisa disimpan dengan mode pesawat, di Android Chrome dan iOS Safari yang sudah Siap | Lulus uji perangkat |
| Butir terkirim sekali meski jaringan putus di tengah | Satu laporan, satu tiket |
| Waktu dari ketukan Simpan sampai konfirmasi di HP | Di bawah 2 detik di perangkat uji (HIPOTESIS) |
| Tidak ada butir hilang diam-diam | Uji kuota penuh dan pembuangan data menampilkan pesan |
