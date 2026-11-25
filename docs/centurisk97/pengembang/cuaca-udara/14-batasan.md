# Batasan dan perbedaan dokumen

Halaman ini mencatat perbedaan antara dokumen dan kode serta batasan ilmiah dan data modul ini.

## Perbedaan dokumen dan kode (kode menang)

1. **Skala updraf**: ALGORITMA §5 menulis `q_naik = w / 1,0`; kode memakai `naik_penuh_ms = 0,1` m/s (persentil 90 w pada satu putaran, n = 39.429), tercatat di `semai_bobot.json:82` dan ALGORITMA §14. Nilai dasar berstatus H dan diukur dari satu putaran, belum dibandingkan musim lain.
2. **Kernel asap**: dokumen menulis kernel 20 km; kode memakai Gauss dengan sigma 10 km dan jari-jari terpotong 2 sel (sekitar 22 km) (`lintasan.py:281`).
3. **Satelit hilang**: dokumen menulis hilang bila kurang dari 20% rerata 7 hari; kode memakai nol piksel 24 jam, dan catatan di keluaran menyebut rerata 7 hari belum tersedia (`semai.py:512-529`). Nilai `satelit.hilang_persen_rerata7` ada di JSON bobot tetapi belum dipakai.
4. **Tinjau BMKG dan Mitra**: dokumen dan PRD menyebut empat tampilan; di layar saat ini hanya Pos komando aktif, dua tombol lain dinonaktifkan (`public/operasi_semai.js:113`, tiket SA-13 belum dikerjakan). Mode "seperti Nimbus" dihitung di keluaran Python (`nimbus.zona`) tetapi belum ada slider bobot, tabel faktor, ekspor CSV, atau ringkasan Mitra di layar.
5. **Uji prospektif dan log keputusan**: `semai_nilai.py`, `semai_beku.py`, `semai_rapor.json`, dan tabel `op_semai_putusan` belum ada (tiket SA-10, SA-25). Pengarsipan putaran dilakukan langkah "Arsip putaran" di `semai.yml`.
6. **Hak baca pemirsa**: `src/operasi_semai.js` memanggil `pemirsaLihat`, tetapi daftar izin pemirsa (`src/staf.js`, `IZIN_PEMIRSA_PUSDALOPS`) hanya memuat `/api/operasi/(peta|monitor|nilai)`, tidak jalur `/api/operasi/semai/*`. Akibatnya sesi pemirsa tidak lolos ke berkas semai.
7. **Tab dan penanda**: registri `cuaca` memuat `tab` "posko" dan "informasi" yang disembunyikan; registri `udara` menyembunyikan "informasi" dan menyembunyikan dirinya dari menu bencana.
8. **`public/omc/**`**: ditugaskan sebagai wilayah modul tetapi tidak ada folder itu.
9. **Himawari**: ambang `BARU_KM = 4` dan penggunaan titik FIRMS keyakinan sedang atau lebih adalah keputusan pemilik 25 Oktober 2026 di komentar kode; tidak ada paket dokumen terpisah.

## Batasan ilmiah dan data

- Seluruh ambang zona semai dan tingkat beban asap adalah HIPOTESIS; kesahihan belum diuji. Bukti kemanjuran semai untuk api dan gambut tidak ada, sehingga yang diusulkan hanya peringkat awan layak semai.
- Satelit melihat api hanya dua kali sehari per satelit; asap dan awan menutupi api; gambut membara lemah tidak selalu terbaca; tidak semua titik panas adalah kebakaran hutan dan lahan.
- Model berkisi 0,1 derajat dengan konveksi diparameterisasi: awan tunggal tidak terlihat dan updraf (w) adalah penaksir kasar. Pengaruh aerosol asap pada awan tidak dihitung. Elevasi permukaan diaproksimasi dari `gh` 1000 hPa sehingga dataran tinggi sejati belum terwakili.
- Beban asap bersifat relatif, bukan PM2,5; PM2,5 CAMS, beban asap lintasan, dan PM2,5 terukur BMKG tidak dijumlah atau dicampur.
- PM2,5 CAMS: resolusi 40 km, tanpa koreksi stasiun saat ini (`koreksi.status = belum`); peluang PM2,5 hanya sensitivitas asumsi asap, bukan galat CAMS.
- Uji balik METAR adalah analisis hari lampau, bukan prakiraan; skor prakiraan sungguhan baru muncul bila pasangan cukup (minimal 20).
- MOS PM2,5 berstatus GAGAL pada uji saat ini; OpenAQ menunggu kunci; GEOS-CF tidak lebih baik daripada CAMS; AOD 1 km belum terambil (hambatan pembaca HDF4 dan akses).
- Evaluasi OMC belum terkalibrasi (n plasebo = 0) sehingga tidak ada klaim "sejalan". Jendela efek adalah hipotesis kerja. Desain analisis efek hujan tidak informatif (MDE sekitar 106%).
- Atribusi sumber PM2,5: model plume tunak melebihi CAMS di sebagian kota-hari; persen dibaca relatif, kota tidak terpercaya tidak diberi persen.
- Peringatan Himawari: lokasi geolokasi sekitar plus minus 2 km; satu alarm per piksel; tanpa pengelompokan lintas piksel.
- Nowcast BMKG: bila BMKG menolak klien tanpa penanda peramban, data terakhir tetap tampil dengan stempel waktu aslinya.
- Kuota Open-Meteo dan batas runner GitHub Actions dapat menunda pembaruan; berkas lama tetap tampil dengan jam pembuatannya, tidak pernah dikarang.
