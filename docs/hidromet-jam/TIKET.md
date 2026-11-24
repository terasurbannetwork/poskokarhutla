# TIKET: Hidromet per jam

Turunan `PRD.md` dan `ALGORITMA.md` (24 Nov 2026). Ambil satu tiket, kerjakan hanya cakupannya. Aturan bersama:

- Python 3.12 stdlib (pola repo). Tiap skrip baru punya mode `uji` yang menjalankan fixture asli, bukan mock (aturan TEST).
- Berkas beku (KEPUTUSAN K4) hanya dibaca.
- Faktor model: tulis `PRAREG-*.md` dulu, hitung sidik sha256, baru buka data uji. Tidak ada klaim skill.
- Subagent tidak commit, tidak push, tidak deploy, tidak mengubah workflow (itu `mekanik-mesin`, tiket H90).
- Teks layar lewat skill `bahasa-indonesia-plain`; kode layar lewat `modern-web-guidance`.

## Fase 1: pengamatan (paralel)

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| H11 | A1 di `scripts/cuaca/metar.py` (fungsi baru, keluaran kunci `embusan_badai` di `jarak_pandang.json` dan `cuaca_metar.json`). Fixture: METAR WIII 17 Nov 2026 12.00-15.00 WIB | cuaca-udara | — | `python3 -I scripts/cuaca/metar.py uji` lulus dan mendeteksi WIII 17 Nov; laporan jumlah tanda per stasiun dari 6 jam data saat ini |
| H12 | A2 di berkas baru `scripts/udara/awan_tumbuh.py` memakai pembaca di `awan_himawari.py` (impor, tidak salin) → `public/udara/data/awan_tumbuh.json` | cuaca-udara | — | `python3 -I scripts/udara/awan_tumbuh.py uji` dengan dua pindaian asli; run pada 14 Nov 2026 05.00-07.30 UTC menunjukkan nilai Kab. Bandung per 30 menit |
| H13 | A3: `scripts/cuaca/jam_hujan.py` membaca IMERG per jam lab (R2 `arsip/lab_banjir/imerg/`, atau berkas lokal bila ada) → `public/cuaca/data/jam_hujan.json` | cuaca-udara | — | mode `uji` dengan satu bulan asli; bila R2 tidak terjangkau dari lokal, skrip siap dan tiket workflow H90 dicatat |
| H22 | A6 di `scripts/cuaca/siklon.py`: urai `abio10.txt`/`abpw10.txt` → kunci `bibit` dan `pasangan_pusaran` di `cuaca_siklon.json` | cuaca-udara | — | `python3 -I scripts/cuaca/siklon.py uji` dengan fixture teks ABIO10 asli; run langsung melaporkan bibit yang ada hari ini. **SELESAI 24 Nov**: fixture ABIO10/ABPW10 asli 24 Nov; run langsung 97S (MEDIUM) dan 98S (HIGH); dipanggil cuaca.py di lintas.yml tanpa ubah workflow |

## Fase 2: faktor untuk lab (paralel, masing-masing PRAREG dulu)

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| H20 | A4: `scripts/banjir/faktor_orografi.py` (operasional, Open-Meteo 850 hPa) + `scripts/banjir/PRAREG-OROGRAFI.md` | banjir | — | mode `uji` dengan respons Open-Meteo asli tersimpan; PRAREG bersidik; daftar kab dengan fluks tertinggi 14-15 Nov dilaporkan sebagai studi kasus saja |
| H21 | A5: `scripts/cuaca/mjo.py` → `public/data/mjo.json` + arsip harian; `scripts/banjir/PRAREG-MJO.md` | cuaca-udara | — | mode `uji`; nilai hari ini cocok dengan sumber; jeda terbit dicatat |
| H23 | A7: `scripts/banjir/faktor_surut.py` + `scripts/banjir/PRAREG-SURUT.md` | banjir | — | mode `uji`; PRAREG menjelaskan pemisahan kejadian lanjutan dan baru |
| H24 | A8 fase musim | banjir | Q4 | MENUNGGU jawaban pemilik |

## Fase 3: berat

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| H10 | Kronologi kejadian: `scripts/cuaca/kronologi.py <kab> <mulai> <akhir>` merangkai Himawari (A2 arsip NOAA S3), METAR arsip (Ogimet/IEM), peringatan BMKG yang terarsip di repo, laporan. Laporan `docs/hidromet-jam/AUDIT-14-17NOV.md` untuk Ciwidey, Cikalintu, Kota Bandung, Aceh/Subulussalam | cuaca-udara | H11, H12 | tabel menit-lebih-dulu per sumber; sumber tanpa arsip ditulis "tidak terarsip"; bagian D1 dikerjakan (Q3 dijawab). **SELESAI 24 Nov**: `AUDIT-14-17NOV.md`. Menit hanya untuk Ciwidey; tidak terarsip setelah dicari: radar BMKG, METAR lokal (WICC, Aceh), jam kejadian Cikalintu dan Aceh, Himawari Aceh sesudah 12 Nov 15:00 |
| H30 | Radar BMKG: uji akses saja (URL publik, format, georeferensi, syarat pakai), tulis `RISET-RADAR.md` | cuaca-udara | Q1 untuk panen | laporan akses; tidak memanen sebelum Q1 |
| H31 | A9: `scripts/cuaca/bahan_badai.py` + `scripts/cuaca/PRAREG-ANGIN.md` | cuaca-udara | (A8 opsional) | mode `uji`; PRAREG bersidik; tidak tayang (Q2) |
| H32 | A10: `scripts/banjir/jeda_hulu.py` (berkas baru) membaca `hulu.py` dan DEM | banjir | — | mode `uji`; t_c per sub-DAS untuk Citarum hulu (Cikalintu) dilaporkan; dinilai lewat PRAREG-HULU yang sudah ada |
| H33 | A11 skenario sejarah Jakarta (cek dulu berkas mana yang beku J4) | banjir | — | laporan CSI per RW, atau alasan tertulis bila arsip RW tidak tersedia |
| H34 | A11 kalibrasi Ciwidey dengan `sim_dampak.js` | cuaca-udara | — | `docs/hidromet-jam/KASUS-CIWIDEY.md` dengan kisaran embusan dan keterbatasan |

## Fase 4: rakit

| Tiket | Isi | Pengerja | Bergantung | Bukti siap |
| --- | --- | --- | --- | --- |
| H90 | Workflow: jadwalkan H11 (ikut `jarak_pandang.yml`), H12 (tiap 30 menit), H13 (bulanan), H20, H21, H22, H31 (harian) | mekanik-mesin | Fase 1-3 | `npm run uji:agen` lulus |
| H91 | Layar `/cuaca`: kartu "Embusan awan badai terekam", "Awan tumbuh cepat", "Jam rawan hujan", "Bibit siklon" berlabel pengamatan | layar-peta → selera-angka + inp-reviewer | H11-H13, H22 | uji layar + server lokal menyajikan data asli |
| H92 | Uji integrasi: daftarkan semua mode `uji` baru ke `package.json` dan `tests/e2e/cakupan.json` bila ada | penulis-gerbang | semua | `npm run uji` lulus |
