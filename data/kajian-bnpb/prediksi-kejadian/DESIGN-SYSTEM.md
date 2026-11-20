# DESIGN-SYSTEM

Mengikuti layar `/bnpb/dalops` yang ada (kartu `.ex.ex-std`, `public/inti/kartu.css`, token `public/inti/tema.css`). Tanpa warna literal baru di CSS (gerbang token warna).

## Seksi "Prakiraan dan kejadian"
- Kepala kartu: ikon + nama seksi "Prakiraan dan kejadian", tanpa kalimat temuan, tanpa angka di kepala. Kanan kepala: pemilih tanggal (segmen 8 hari, elemen bersama).
- Ubin empat, selebar kartu, dibagi rata, berikon: Kena (biru tua), Luput (merah), Belum ada laporan (abu, teks "menunggu laporan" bila belum matang), Tenang (abu muda). Ubin terpilih = saringan aktif.
- Tabel `.ex-tabel`, kepala navy bertulisan putih: Kab/kota, Provinsi, Prakiraan (pil level), Kejadian Dalops (nomor, tanggal mulai), Laporan (jumlah warga, jumlah BPBD), Kotak.

## Peta
- Warna kab = level prakiraan tanggal terpilih (abu, kuning, oranye, merah, sama dengan `/prediksi`).
- Kejadian Dalops = penanda bulat isi navy. Laporan BPBD = penanda segitiga isi warna jenis, laporan warga = penanda bulat garis warna jenis; "belum diperiksa" diberi titik putih di tengah.
- Legenda dan pil jumlah di dalam peta, seperti peta Dalops sekarang.

## Larangan tampilan
Tanpa huruf kapital semua, tanpa titik tengah sebagai pemisah, tanpa "aman", tanpa "salah alarm", tanpa tombol pindah sisi.
