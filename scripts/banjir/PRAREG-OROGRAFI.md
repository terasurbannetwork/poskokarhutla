# Pra-registrasi: fluks orografi 850 hPa sebagai faktor model peluang banjir kabupaten-hari

Dibuat 24 Nov 2026, SEBELUM faktor ini dihitung dari ERA5 untuk satu kabupaten-hari pun dan SEBELUM label uji (2023-01-01 s.d.
2026-03-27) dibuka untuk keperluan ini. Tiket H20, rumus `docs/hidromet-jam/ALGORITMA.md` A4, aturan main `docs/banjir/PETA-JALAN-MODEL-BANJIR.md`
§2 dan keputusan K3. Dokumen ini tidak menyebut hasil skor apa pun. Format dan sidik mengikuti `PRAREG-HULU.md` dan `PRAREG-PROSPEKTIF.md`.

## 1. Pertanyaan

Satu kontras: apakah angin 850 hPa yang menabrak lereng membawa informasi tentang kejadian banjir/bandang kabupaten-hari di
atas yang sudah dibawa model lab 7 faktor? **M1 - M0**, dengan M0 = regresi logistik kompak 7 faktor lab dan M1 = M0 ditambah
SATU fitur orografi. Tidak ada klaim "lebih baik" sebelum vonis prospektif (K3).

## 2. Faktor

Definisi ada di `faktor_orografi.py` (sidik di §8), tidak ditulis ulang di sini. Ringkas: per kabupaten dan per jam,
`fluks = ws850 x G(arah tuju) x q850` (g/kg·m/s), `G` = rerata atas titik medan kabupaten dari maks(0, e·∇h) (tabel 24 sektor,
`data/medan_orografi.json`), `q850` dari RH850 dan T850. Faktor harian: `fluks_maks_24j(h)` (maks 24 jam hari h, WIB) dan
`fluks_jumlah_72j(h)` (jumlah per jam h 00.00 s.d. h+2 23.00, WIB, ke depan).

Penyimpangan dari kalimat A4 (rata-rata vektor lereng), dicatat terbuka: rerata VEKTOR gradien meniadakan dua sisi punggungan,
jadi dipakai rerata POSITIF per titik medan. Medan = DEM SRTM 90 m yang sudah ada di repo (titik kisi `faktor_kec.py`, bukan
Copernicus 90 m yang disebut A4), bidang lokal dari <= 8 titik terdekat dalam 0,12 derajat (skala 5-13 km). Titik sampai 4-6 km
satu sama lain di kecamatan luas; relief di bawah skala itu tidak terwakili. 2 dari 521 kabupaten tidak punya medan
(`31|Administrasi Kepulauan Seribu`, `82|None`) dan dikeluarkan dari SEMUA model. Kunci `13|None` dan `82|None` berasal dari
nama kabupaten kosong di `public/geo/kecamatan`; tidak diperbaiki di sini.

## 3. Data dan pembagian waktu (protokol lab)

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2008-01-01 s.d. 2019-12-31 | koefisien M0 dan M1 |
| Validasi | 2020-01-01 s.d. 2022-12-31 | memilih kekuatan regularisasi C dan gerbang validasi (§5.1) |
| Uji | 2023-01-01 s.d. 2026-03-27 | dibuka SEKALI, setelah sidik §8 di-commit |

- **Fluks latih/validasi/uji arsip:** ERA5 850 hPa per jam dari CDS (`reanalysis-era5-pressure-levels`: angin u, v, kelembapan relatif, suhu), 0,25 derajat,
  sel terdekat ke titik pusat kabupaten di `medan_orografi.json` (sama dengan sel yang dilayani Open-Meteo IFS 0,25 derajat).
  Hari = Asia/Jakarta. `q850` dan `G` memakai FUNGSI yang sama dengan `faktor_orografi.py` (diimpor, bukan disalin).
- **Label:** DIBI banjir dan banjir bandang kabupaten-hari (hari mulai), cara lab (`lab-bencana/adu/banjir/LAPORAN.md`);
  jumlah baris dan kejadian per bagian dicatat di keluaran sebelum model dilatih.
- **M0:** logit kompak 7 faktor lab, kode dan koefisien awal `kompak.py` dan `koefisien_kab.json` dari repo lab, lokasi mutlak dan sha256 di §8,
  dilatih ulang di sini pada latih yang sama, kisi C yang sama. M0 identik di semua kontras.
- **M1:** M0 + `ln(1 + fluks_maks_24j(h))`, satu kolom. Fitur ini memakai informasi hari h saja, jadi cakrawala informasinya sama dengan M0
  (hujan sampai hari h). `fluks_jumlah_72j` memuat jam h+1 dan h+2, yaitu informasi yang M0 tidak punya, sehingga selisihnya
  tercampur dengan sekadar melihat ke depan: dilaporkan sebagai M1b (M0 + kedua fitur), **deskriptif, tidak menghakimi**.
- **Pembanding lain:** klimatologi kabupaten x bulan (2008-2019) dan salinan aturan operasional `status.py` (replika lab).
- **Laju alarm:** M1, M0, dan klimatologi diberi alarm sebanyak jumlah alarm salinan ops pada tingkat Siaga, di periode uji, dengan
  ambang skor global (kuantil atas seluruh kabupaten-hari uji). Waspada dan Awas dilaporkan, tidak menghakimi.
- ERA5 adalah reanalisis (prakiraan "sempurna"): hasil arsip bersifat optimis untuk operasi dan IFS lebih basah dari ERA5. Itu alasan arsip hanya boleh MENOLAK (§5).
- Keterbukaan: periode uji 2023-2026 sudah dipakai lab untuk memilih 7 faktor M0 (ablasi menampilkan AP uji). Efeknya menguntungkan M0, jadi
  menyulitkan M1 HANYA pada kontras M1 - M0 (kriteria a, b). Kriteria (c) membandingkan M1 dengan klimatologi dan salinan ops pada periode yang SAMA
  yang sudah terlihat lab, sehingga (c) justru optimis; bukan bias konservatif. Faktor orografi belum pernah dihitung untuk periode ini, dan penyusun dokumen ini
  TIDAK membuka label uji. Studi kasus 13-17 Nov 2026 (§7) di luar periode uji dan tanpa label.

## 4. Ukuran

Utama: **ETS kabupaten-hari pada laju alarm Siaga ops**, `ETS = (a - ar)/(a+b+c - ar)`, `ar = (a+b)(a+c)/N`, dan dETS = ETS(M1) - ETS(M0).
Pendamping: AP (average precision), POD dan FAR pada laju alarm sama, Brier. Selang 95% dengan **bootstrap blok kabupaten**: kabupaten diambil ulang
dengan pengembalian, 1.000 ulangan, benih 11, selang persentil dua sisi; selisih dihitung pada resampel yang sama; ulangan tanpa kejadian dilewati.

## 5. Aturan keputusan (arsip hanya boleh menolak)

1. **Gerbang validasi (2020-2022):** bila dAP(M1 - M0) titik <= 0, berhenti: uji TIDAK dibuka, vonis "ditolak di validasi".
2. **Tanda fisika:** koefisien `ln(1+fluks_maks_24j)` di M1 (latih) harus > 0. Bila <= 0: ditolak, uji tidak dibuka. Tidak ada pembalikan tanda.
3. **Uji arsip:** M1 DITERUSKAN ke prospektif hanya bila SEMUA terpenuhi: (a) batas bawah CI95 dETS(M1 - M0) pada Siaga > 0; (b) dAP(M1 - M0) titik > 0; (c) ETS(M1) > ETS(klimatologi) dan ETS(M1) > ETS(salinan ops), titik. Selain itu **DITOLAK**.
4. "Lolos arsip" ("LOLOS SARING") BUKAN bukti adanya sinyal dan BUKAN lulus; periode uji sudah terlihat lab (§3), jadi hanya penyaring penolak. Tidak boleh disebut LULUS. Hanya vonis prospektif (§6) yang boleh.
5. Vonis dikunci sekali; M1b dan Waspada/Awas tidak mengubahnya. Tidak ada setel ulang sesudah uji dibuka; menyetel apa pun sesudahnya = protokol baru bertanggal baru.

## 6. Kriteria prospektif (ikut `PRAREG-PROSPEKTIF.md`)

Rumus M1 (koefisien dilatih pada 2008-2022, intersep dan C dibekukan) disidik sebelum prospektif dimulai. Fitur dari `faktor_orografi.py` arsip
(`arsip_YYYY-MM.jsonl`), **hanya prakiraan dengan `terbit_hari` = hari sasaran - 1** (waktu-tunda primer 1; sisanya dilaporkan). Alarm per hari = N kabupaten
skor teratas, N = jumlah ramalan `status.py` hari itu (cara klimatologi PRAREG-PROSPEKTIF). Kebenaran DIBI hari-mulai, hanya hingga tanggal DIBI terakhir - 14 hari.
Pembanding yang menghakimi: persistensi dan klimatologi, sama seperti PRAREG-PROSPEKTIF. Bootstrap blok 7 hari, 1.000 ulangan, benih 7. Belum cukup data bila
hari dinilai < 60 atau kejadian < 100 (tanpa vonis). LULUS bila batas bawah CI95 ETS(M1) > 0 dan batas bawah CI95 selisih ETS terhadap KEDUA pembanding > 0;
selain itu tidak lulus. Salinan ops dan M0 dilaporkan tanpa menghakimi. Hasil lulus pun hanya berarti faktor boleh tampil sebagai pelengkap berlabel "teruji", tidak menimpa `status.py`.

Catatan jujur arsip prospektif: Open-Meteo tidak menampilkan jam terbit model, jadi `terbit` di arsip = waktu AMBIL (UTC), batas atas ketersediaan; model yang dipakai
adalah run yang ada saat itu (selalu lebih tua dari waktu ambil). Jalan harian paling akhir 07.20 WIB dan hanya baris pertama per (`terbit_hari`, kabupaten) yang dicatat.
Prakiraan ECMWF IFS Open-Meteo bukan ERA5: distribusi fluks bisa bergeser; M1 tidak disetel ulang ke arsip.

## 7. Studi kasus (BUKAN validasi)

Daftar kabupaten dengan fluks tertinggi 14-15 Nov 2026 dari `historical-forecast-api.open-meteo.com` (`ecmwf_ifs025`) dilaporkan sebagai ilustrasi. Itu
rangkaian prakiraan terbaru tiap jam, bukan prakiraan sebelum hari sasaran, tanpa label, dan faktor ini dirancang dengan kejadian Nov 2026 di kepala;
karena itu tidak dihitung sebagai bukti dan tidak masuk periode uji. Gunanya hanya memeriksa bahwa angkanya masuk akal.

## 8. Sidik dan kode

Berkas yang dibekukan (sha256 saat dokumen ini dibuat):

| Berkas | sha256 |
| --- | --- |
| `scripts/banjir/faktor_orografi.py` | `e884e50adcd11094089ad7a409f02c8116f82e8e47a5988f5a36b52f32b3ddfe` |
| `scripts/banjir/data/medan_orografi.json` | `1628e1c558075ef9f17c7ad12a5bfc931553181c01a3e21aeeafdfba40bb7338` |
| `scripts/banjir/data/uji_orografi_open-meteo.json` (fixture respons asli) | `9ea2d7f16885330241848adfb83135c3cd38ca656bb4b3cbfe0b1fd9c77e956e` |
| `data/raw/banjir/faktor_kec/elevasi_topo.json` (masukan medan) | `2b844f712564efd499247f5934daec7c5775ea0ea70d414d8b870818d7e197dd` |
| `/Users/priyankaalfatehan28/proyek-on-hold/lab-bencana/repo/adu/banjir/skrip/kompak.py` (M0, diukur 24 Nov 2026) | `569b40dea2ffb79664790fe25ac070648344ec3284a05bdc51616c26a8b67b82` |
| `/Users/priyankaalfatehan28/proyek-on-hold/lab-bencana/repo/adu/banjir/koefisien_kab.json` (M0, 645 KB, diukur 24 Nov 2026) | `754b6802362e39c0336c5606c6b589afec1ef45e8952835fad072332b0a41e38` |

Sidik berkas INI ada di `PRAREG-OROGRAFI.sidik` (satu baris JSON; hash tidak bisa memuat dirinya sendiri). Berkas beku lain (`status.py`, `model_kab.py`,
`uji_balik.py`, PRAREG DEBIT, PROSPEKTIF, DAMPAK) hanya dibaca. Mengubah satu kata di berkas ini, atau berkas di tabel, setelah sidik di-commit berarti protokol baru
dengan tanggal baru. Sidik di-commit (oleh pemilik) SEBELUM langkah latih ERA5 dijalankan.

## Amandemen sebelum data dibuka (24 Nov 2026)

Data uji belum dibuka dan `latih` belum jalan; perubahan ini sah dan sidik diperbarui.

- F1 (§3, §8): berkas M0 ditemukan di `/Users/priyankaalfatehan28/proyek-on-hold/lab-bencana/repo/adu/banjir/` (bukan `Developer/lab-bencana`); sha256 diukur ulang dan sama dengan tabel §8.
  Karena `koefisien_kab.json` 645 KB (>200 KB) tidak disalin ke repo ini. Prasyarat `latih`: ukur ulang kedua sha256 di lokasi itu; bila berbeda, berhenti.
- F2 (§3, §5.4): kriteria (c) optimis (periode uji sudah terlihat lab); "LOLOS SARING" bukan bukti sinyal, vonis hanya prospektif (§6).
