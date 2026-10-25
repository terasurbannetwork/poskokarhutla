# Outstanding: Pantau Bencana (per 25 Okt 2026)

Daftar pekerjaan yang masih terbuka. Coret atau hapus baris saat selesai. Bagian C belum diverifikasi ulang
(dari catatan sesi lama); cek dulu sebelum dikerjakan.

## A. Metode karhutla (titik panas, luas, belum padam)

| # | Pekerjaan | Status / menunggu | Rujukan |
|---|---|---|---|
| A1 | Bukti luas kebakaran resmi terdahulu (sampling berlapis 2023, lalu 2019/2015) + deck bukti dan usulan | DITAHAN, pemilik lanjut ~akhir Nov 2026. Hasil 2023 belum konklusif: 1,96 jt ha (0,51-3,40) vs resmi 1,16 jt | `data/riset/luas_resmi/LANJUT.md` |
| A2 | Lokasi tertutup awan/asap jangan dianggap padam; Himawari 10 menit sebagai bukti api masih menyala | Tidak dipasang: belum bisa diukur tanpa data padam lapangan; Himawari tanpa arsip | peta_karhutla.py `bertahan()` |
| A3 | Kalibrasi jendela belum padam 12-36 jam, padam 48 jam (gambut kandidat 72 jam) | Data lapangan cuma ~7 kejadian. Minta: laphar BNPB Agu-Okt mentah (koordinat, tgl mulai/padam), log 100-200 insiden Manggala Agni/Daops (>= 30 gambut), definisi "sisa belum padam" BPBD | laporan validasi-model 25 Okt |
| A4 | Banding langsung dengan SIPANTAU Kemenhut per provinsi per hari | Menunggu balasan surat permohonan data GIS (23 Okt) | |
| A5 | Faktor luas per jenis lahan atau pulau | Butuh luas resmi per provinsi per tahun; dNBR belum menunjukkan beda gambut/mineral | `public/data/ujiluas_kab.json` |
| A6 | Cek layar setelah `data.yml` jalan: `hotspot.json`, `wilayah.json`, `laporan.json` baru memakai lokasi unik di CI | Cek KPI peta, tabel wilayah, overlay kab sama angkanya | |
| A7 | Lokasi hanya-MODIS yang bersebelahan dengan sel VIIRS (4,7% lokasi 23 Okt) kemungkinan api yang sama dihitung dua kali | Perlu keputusan: gabung 3x3 untuk MODIS atau biarkan | validasi-model 25 Okt |
| A8 | Selisih hot `hotspot.json` vs `peta_karhutla.json` +0,3-0,6% per hari | Dugaan NRT vs arsip SP dan jam tarik, belum dibuktikan | |
| A9 | Komentar basi "setara SiPongi/BNPB" | `public/index.html` sekitar baris 1795 | |

## B. Git dan kebersihan repo

| # | Pekerjaan | Status |
|---|---|---|
| B1 | Commit belum di-push | `c1451791` (deck Penanganan Karhutla, sesi lain), `7db7591c` (riset luas resmi) |
| B2 | Salinan nyasar sinkronisasi | `migrations/0053_kontak 2.sql` (jangan dipakai; hapus lewat higiene-repo) |
| B3 | Berkas kajian BNPB mitigasi belum di-commit | `data/kajian-bnpb/naskah/mitigasi/*`, `keluaran/qa/*`, `rehab/` (milik sesi kajian) |

## C. Dari catatan lama (perlu dicek ulang)

| # | Pekerjaan | Menunggu |
|---|---|---|
| C1 | Peringatan dini email `/peringatan` | Domain Resend terverifikasi (EMAIL_FROM), Turnstile sitekey+secret, secret EWS_KUNCI, migrasi D1 0008 remote |
| C2 | Secret `SUPER_ADMIN` di produksi | API v1 / kunci mitra |
| C3 | Migrasi D1 remote | 0052 hukum, 0053 kontak, 0054 kunci_api_konsesi: cek sudah jalan di D1 produksi |
| C4 | Model risiko api 7 hari | Hanya akun login (eksperimental); publik setelah lolos catatan prospektif mingguan |
| C5 | Token Earthdata | Habis sekitar 11 Des 2026, perpanjang |
| C6 | Banjir | Rute worker `/banjir/laporan(-das)`, keputusan nama PT |
| C7 | Cuaca ekstrem | Tab registry, en.json, arsip nowcast per jam |
| C8 | Kekeringan | Cache data.yml, tab simulasi di registry, i18n |
| C9 | Kajian BNPB mitigasi dan GD pipa / SIPPA | Dikerjakan sesi lain |
