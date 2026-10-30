# PENYELARASAN: Kemitraan Kampus

Laporan peninjau berkonteks bersih (AGENTS.md §3.2) atas 11 dokumen, dicocokkan ke kode main
30 Okt 2026, dan perbaikan yang sudah diterapkan sesi induk. KEPUTUSAN tidak disentuh.

## Penyelarasan 30 Okt 2026

### Fakta yang dicek dan BENAR
`kodeBaru` (src/bnpb.js:23), `hashSandi` (src/pendataan.js:22), `cekInstitusi`/`sisipInstitusi`/
`statusMou` (src/relawan.js:516/543/53), hapus dummy relawan (847–855), `scheduled`
(worker.js:840), pengingat 00:40 UTC dan bersih menit 17, `RUMPUN` (akademisi.js:15–30),
`indeks.json` 548 kode dengan 3171 = Jakarta Pusat, relawan jalur `kampus` + `kampus_id`,
status relawan dan penugasan, `riset_usulan 'disetujui'`, jenis `riset_luaran`, `laju_bnpb`,
`meja_catatan.petugas_id`.

### Temuan dan penyelesaian
| # | Tingkat | Temuan | Penyelesaian |
| --- | --- | --- | --- |
| 1 | tinggi | CHECK tabel di tengah kolom; `UNIQUE … WHERE` di dalam CREATE TABLE | DT §3.1/§3.4/§3.5 diperbaiki; aturan di tiket A04 |
| 2 | tinggi | `pengingat.jenis` ber-CHECK 9 nilai | ADR-06 `km_pengingat`; PRD F-X2, DT §6.4, H02 |
| 3 | tinggi | trigger peran staf menolak `kemitraan` | migrasi 0084 DROP/CREATE trigger (A09) |
| 4 | tinggi | router hanya `:id` di ujung | ADR-07 sub-router `ruteKm` (A09) |
| 5 | tinggi | gerbang situs centurisk97.id mengunci halaman | awalan `/kemitraan`, `/api/kemitraan/` dilewati; `hakKm` menjaga (A09) |
| 6 | tinggi | penjaga CPU memakai `Date.now()` | anggaran operasi `KM_MAKS_POSTING` (ALG §4.6, DT §5.2) |
| 7 | tinggi | penugasan butuh `relawan_permintaan` | ADR-08; ALUR §4.3; F02 |
| 8 | tinggi | calon `siap_tugas` tak pernah tercapai | ADR-09 tombol "Saya siap bertugas" |
| 9 | tinggi | kolom wajib `riset_usulan`/`riset_agenda` | DT §10 pemetaan kolom; E04 |
| 10 | tinggi | dependensi tiket melingkar/terbalik | C10 dua tahap; jalur berurutan TIKET §5 |
| 11 | tinggi | berkas bertabrakan dalam gelombang | gelombang diganti jalur satu-pekerja |
| 12 | sedang | `km_perjanjian` kembar `institusi_perjanjian` | ADR-05 |
| 13 | sedang | kolom wajib relawan + indeks unik kontak | DT §10 bawaan + tautkan relawan yang ada |
| 14 | sedang | `peta()` butuh DIR_SUMBER; sasaran kode tak realistis | A03: pindah `nk`/`ALIAS`, sasaran ≥ 500 kemendagri |
| 15 | sedang | `jaga_segar.py` salah jalur/fungsi | `profil_daerah.py --jaga` (DT §7.1) |
| 16 | sedang | pipeline tak punya akses R2/D1 | secret di kemitraan.yml; ekspor `kapasitas`/`rekam` (DT §5.3) |
| 17 | sedang | siluet membuat ringkas > 120 KB | siluet hanya di JSON daerah (B04, DS §5.1) |
| 18 | sedang | IRBI hanya `k` 0/1 | dua varian t1/t0 (DS §5.1) |
| 19 | sedang | `ikon()` akademisi pakai `style=` | `KM.ikon` berkelas `.km-w-*` (DS §2, A10) |
| 20 | sedang | idempoten per kiriman vs per baris | `klien_id` per jawaban; kolom `waktu_klien` (DT §3.2) |
| 21 | sedang | masalah otomatis vs jawaban; kode tim; alur magang; status satgas | `km_jawaban.auto_id`; ALUR §2.2.5; DT §3.5 alur; DT §3.4 aturan status |
| 22 | sedang | Σbobot rubrik kosong lolos | `coalesce(…,0)` |
| 23 | sedang | jumlah detektor tidak konsisten | 7 detektor di semua dokumen |
| 24 | sedang | tak ada kategori Basarnas/PMI | `lainnya` + `lembaga` mengandung SAR/PMI (DT §10) |
| 25 | rendah | indikator 9 "lulus" | baris pelatihan = ikut (DT §6.3) |
| 26 | rendah | meja tanpa berlaku; tanpa kolom aktivasi | cron 14 hari; tautan lewat `petugas_id` |
| 27 | rendah | nama Jakarta Pusat | RU D2 |
| 28 | rendah | bab 1–8 vs 1–9 | PRD F-M2 |
| 29 | rendah | status dampingan beda | PRD F-T5 ikut DT |
| 30 | rendah | `km_aktivasi_meja` tak di DT §2.1 | tercakup di 0082 (DT §3.4) |
| 31 | rendah | FK km_telaah ke tabel 0082 | `km_pl_kode` pindah ke 0079 |
| 32 | rendah | kepala.js dan package.json tanpa tiket | A10, A11 |
| 33 | rendah | `tolakOrigin` tak kenal cookie baru | A09 |
| 34 | rendah | warna udara bentrok | #9c36b5 |

### Pemetaan bencana ke registri
`public/bencana.json` hanya berisi karhutla, banjir, gempa, cuaca, udara, gunungapi, kekeringan.
Pemetaan 11 bahaya modul ke registri ada di DT §10 (konstanta `KE_REGISTRI`).

### Pertanyaan pemilik tersisa
Tetap KP §H (T-A..T-G) + TIKET §6 (P1–P4). Tidak ada yang menghalangi jalur P, M, W, L mulai.

### Tindak lanjut
Penyelarasan kedua (KM-H06) setelah kode jalur W dan L selesai: bandingkan kode dengan dokumen.
