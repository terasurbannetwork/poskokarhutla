---
name: kdmp-ojek-desa
description: "Vonis 5 Okt 2026: Gojek desa KDMP; driver warga mitra + sopir koperasi, 4 layanan (belanja, kirim, makanan warung, ojek), ongkir tunai ke driver + potongan jadi utang; 3 gerai lain ditahan"
metadata:
  node_type: memory
  type: project
  originSessionId: e1ae810c-bf5e-4de7-a9e2-864309ec087e
  modified: 2026-10-05T06:11:35.871Z
---

Pemilik minta sisi "Astro/Gojek" + halaman driver. Usulan: `docs/usulan/kdmp-ojek-desa/proposal.md`.

Vonis 5 Okt 2026:
- Driver = warga mitra (daftar link WA, disetujui pengurus, ambil order sendiri dari papan) + sopir armada koperasi.
- Gelombang pertama empat layanan sekaligus: antar belanja toko, kirim barang antar warga, makanan warung desa, ojek penumpang.
- Ongkir tunai ke driver; potongan koperasi dicatat sebagai utang driver, dilunasi/dipotong simpanan.

**Why:** Toko Desa ([[kdmp-toko-desa-2026-10]]) sudah = Astro; yang kurang mitra driver, papan order, peta live, dompet.
**How to apply:** perluas `/kdmp-antar/[token]` dan `/toko/[slug]`, jangan bikin pintu baru. Ongkir dihitung DB. Ojek penumpang wajib verifikasi SIM/STNK + tombol darurat + sakelar per koperasi.

Juga ditunggu (pemilik: "nanti dibuat, tunggu dulu"): gerai ekonomi sirkular (sisa makanan SPPG → maggot/kompos, jelantah), resi gudang (cold storage → jaminan pinjaman), agen PPOB/Laku Pandai. Lihat [[kdmp-tujuh-gerai]].

Tambahan 5 Okt 13.15: pemilik kirim 50 tangkapan layar (J&T, GoFood, GoMart, GoSend/GoBox) + "Tiru semua ya dari gambar yang gw kirim". J&T = layanan Kirim Paket untuk mitra Pos (gerai Logistik, perluas kdmp_kurir_pos). Pemetaan layar → fitur: `docs/usulan/kdmp-ojek-desa/riset-layar.md`, gambar di `rujukan/`. Yang ditiru alur & fitur; logo/maskot, kapital penuh, emoji, login OTP/Google, dompet pihak ketiga tidak.
Juga di-"gas" hari itu: Rumah Produksi olahan desa (`docs/usulan/kdmp-rumah-produksi/`) dan Saprotan bayar panen (`docs/usulan/kdmp-saprotan/`). Ekonomi sirkular, resi gudang, PPOB masih ditahan (agen bank Himbara sudah ada di migrasi 20261005200000).

Vonis 5 Okt 13.30 atas 5 rekomendasi strategis:
1. Beranda Desa satu pintu ala tiket.com/Grab/Gojek ("bisa pesan apa pun"): `docs/usulan/kdmp-beranda-desa/proposal.md`, dibangun setelah 4 agent mendarat.
2. Uji coba lapangan di LAMPUNG minggu 12 Okt 2026.
3. Jangkar permintaan SPPG + skor kredit: jangan dulu.
4. Gerbang izin per layanan: nanti dulu.
5. Bekukan fitur baru, stabilkan (dalang + e2e cermin + cron merah): sepakat.

Vonis 5 Okt: dari 5 layanan strategis baru (tiket/travel, jasa warga, sewa alat, tabungan berencana+bayar nanti, wisata desa) pemilik pilih SEWA ALAT & perlengkapan: `docs/usulan/kdmp-sewa-alat/proposal.md`, DIMAJUKAN: dibangun 5 Okt, ikut uji Lampung 12 Okt.
Vonis 5 Okt: sewa DUA model sekaligus untuk Lampung, koperasi ke warga + warga ke warga lewat koperasi (komisi default 10%, jaminan dipegang koperasi, pemilik disetujui pengurus).

Vonis 6 Okt 06.51: Beranda Desa DIBANGUN sekarang ala Shopee/tiket.com/Grab/Gojek (kisi semua jasa, dompet simpanan/poin, aktivitas lintas layanan) + satu pintu link WA per orang /toko/<kode>/saya/<token>, link lama tetap hidup. Rancangan docs/usulan/kdmp-beranda-desa/proposal.md.

Rujukan gaya warga 6 Okt (pemilik: "sumpah bagus banget"): oyenza.com + pangantaraid.vercel.app/kopdes — satu angka besar + banding rupiah, riwayat per hari, kartu bulat putih, pil gelap; dicatat di proposal Beranda Desa.
