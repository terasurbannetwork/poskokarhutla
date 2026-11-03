# Pra-registrasi: nowcast banjir bandang GSMaP NRT per kecamatan zona bahaya

Status: DRAF, belum dibekukan, belum ditinjau validasi-model. Ditulis 2 Nov 2026 SEBELUM satu pun jalan `tarik` dinilai terhadap kejadian. Kode: `scripts/banjir/nowcast_bandang.py` (fitur, `level`, `sidik`); rancangan: `docs/banjir/NOWCAST-BANDANG.md`. Pola mengikuti `PRAREG-FLOODHUB.md`, `PRAREG-HULU.md`: beku dulu, arsip hanya boleh menolak, prospektif memutuskan, pembanding pada jumlah alarm sama, bootstrap blok, irisan-gabungan.

Belum ada arsip hujan per jam multi-tahun untuk zona bandang (`m1_hujan.jsonl` hanya 42 kecamatan DKI, `gsmap_harian.json` harian), jadi ambang TIDAK disetel dari data. Ambang di §4 adalah hipotesis dari literatur dan kategori BMKG; pembuat belum melihat satu pun nilai `tarik` di luar DKI.

## 1. Pertanyaan

Satu hipotesis: apakah level Siaga nowcast (§4) memisahkan hari kejadian banjir bandang dari hari lain di kabupaten zona bahaya LEBIH BAIK daripada (a) klimatologi kabupaten-bulan dan (b) aturan bandang `status.py` (Open-Meteo `imax >= 30` dan B >= 0,33), pada jumlah alarm yang sama. Yang diuji adalah DETEKSI kabupaten-hari. Peringatan dini 0-6 jam TIDAK bisa diadili dengan label yang ada (§3, §8) dan tidak diklaim.

## 2. Unit dan tenggang

- **Unit hitung:** kecamatan dengan indeks InaRISK `bandang` >= 0,33 (`B_MIN`, `bahaya.json`; saat ini 1.142), sel GSMaP 0,1 derajat yang memuat pusat kecamatan (`pusat_kec.json`). Tiap jalan `tarik` memberi satu level per kecamatan.
- **Unit nilai: kabupaten x hari WIB** (zona waktu per bujur, `zona_waktu`; WITA/WIT dihitung hari lokalnya). Level kabupaten pada satu jalan = maksimum level kecamatan zonanya; alarm hari d = maksimum atas semua jalan terarsip yang jam terbarunya jatuh di hari d. Alasan: semua label (§3) kabupaten-hari; tidak ada label kecamatan-jam untuk bandang. Skor per kecamatan tidak dilaporkan sebagai vonis.
- **Tenggang:** dihitung dari KETERSEDIAAN DATA, bukan dari waktu hujan. Jalan `tarik` mencatat `dibuat_utc` (waktu berkas ada di tangan kita) dan `umur_jam_terbaru` (selisih dibuat_utc terhadap akhir jam hujan terbaru). Klaim JAXA latensi NRT sekitar 4 jam (`LATENSI_JAM`); latensi nyata BELUM terukur dan akan diukur sesi lain; angka terukur, bukan klaim, yang dilaporkan di §6. Hujan jam h yang sampai ke kita pada h+latensi; tenggang efektif = (waktu kejadian) - (dibuat_utc), BUKAN (waktu kejadian) - (waktu hujan). Karena label hanya berresolusi hari, tenggang jam tidak dapat diukur; yang bisa: apakah dibuat_utc jatuh pada hari WIB sebelum hari kejadian (stratum A, §3).

## 3. Label

- **Positif:** DIBI dengan jenis memuat `bandang` (`data/raw/banjir/dibi_tanggal.json`, baris `[jenis[], prov, kab, tanggal, kejadian]`, `kejadian >= 1`; kunci kabupaten `pp|Nama` seperti `model_kab.py`). Kab-hari bandang DIBI per tahun saat ini (berkas 2 Nov 2026): 2018: 11, 2020: 66, 2021: 72, 2022: 52, 2023: 51, 2025: 13, 2026: 26 (2016-17, 2019, 2024 kosong; DIBI terisi susulan dan 2025-2026 mungkin belum penuh). Laju terkini sekitar 30 kab-hari per tahun nasional, jauh di bawah 2020-2023. **Kejadian** = gugus berjangkar ±1 hari per kabupaten (`label_bersatu_v2.py` aturan 3, tanggal gugus = jangkar e); pada berkas ini 291 kab-hari menjadi 288 gugus, jadi gugus hampir sama dengan kab-hari. Hitung kejadian, bukan baris.
- **Mengapa hanya DIBI:** logbook Pusdalops (`data/pusdalops/logbook_kejadian.csv`) TIDAK punya jenis bandang (jenis `banjir` saja, 14.834 baris, subjenis hanya terisi untuk cuaca); `uji_logbook.py` menyebut `banjir_bandang` tetapi parser belum pernah mengeluarkannya. Groundsource tidak menandai bandang. Keduanya dengan `label_bersatu_v2` (banjir umum) bukan label di sini. Bila kelak logbook memberi jenis bandang, ia dilaporkan sebagai kontrol peka-label saja (tidak mengubah vonis), seperti kontrol DIBI-saja di `PRAREG-HULU.md`.
- **Sel kontingensi (tanpa hitung ganda):** satuan tabel = kabupaten-hari terobservasi (§5). Positif y(d) = 1 bila d ∈ {e-1, e} untuk sebuah kejadian berjangkar e; hari lain y = 0 (negatif). Alarm(d) = 1 bila level kabupaten maksimum hari d >= Siaga. Tiap kabupaten-hari masuk TEPAT SATU sel (hit, miss, alarm salah, negatif benar); satu kejadian menyumbang paling banyak 2 hari positif, dan dua kejadian yang hari positifnya bertumpuk memberi satu hari. Kejadian yang salah satu dari e-1 dan e tak terobservasi dikeluarkan dari tabel dan dari POD. ETS, FAR, CSI, dETS dari tabel hari ini.
  - **POD tingkat kejadian** (bukan dari tabel): porsi kejadian dengan sedikitnya satu alarm pada e-1 atau e. Dilaporkan dengan selang Wilson 95%; dipakai pada syarat LULUS (§7).
  - **Stratum B (utama, deteksi):** definisi di atas. Tidak bebas dari pandangan-belakang: alarm hari e bisa dibuat sesudah kejadian hari e karena DIBI tak mencatat jam. Karena itu B adalah "deteksi kabupaten-hari", bukan peringatan.
  - **Stratum A (peringatan, hanya dilaporkan):** kejadian dihitung terdeteksi hanya bila ada jalan Siaga dengan `dibuat_utc` pada hari WIB paling lambat e-1. Kejadian yang hujan dan terjadinya satu hari tidak bisa terdeteksi di A. POD A dilaporkan dengan n dan selang Wilson, tanpa vonis.
- **Hari negatif:** kabupaten-hari terobservasi (§5) tanpa DIBI bandang di d dan d+1. Kabupaten tanpa satu pun kecamatan zona tidak ikut.
- **Kematangan label:** hari d dinilai hanya bila d+2 <= (tanggal DIBI terakhir pada salinan beku) - 45 hari, sama dengan `PRAREG-FLOODHUB.md` §2. Angka 45 hari BELUM dibuktikan dengan data: berkas 2 Nov 2026 punya tanggal bandang terakhir 22 Sep 2026 dan tanggal tertinggi semua jenis 26 Okt 2026, dan DIBI terisi susulan dalam gelombang (bukan sebaran rata); keterlambatan nyata diukur dari dua salinan DIBI berbeda waktu dan dicatat di laporan. Kejadian yang baru diisi sesudah salinan dibekukan tidak terhitung (salinan pembukaan pertama menang, §7).
- **Label kurang lapor:** FAR terukur lebih buruk dari kenyataan; kejadian bandang yang tak masuk DIBI tak terhitung.

## 4. Ambang (hipotesis, tidak disetel)

Fitur per kecamatan per jalan (`fitur`): `h1` = maksimum satu jam, `h3` = maksimum jumlah 3 jam berurutan, `h6` = jumlah 6 jam, semua dalam jendela 6 jam yang berakhir pada jam terbaru tersedia (mm, h1 = mm/jam; GSMaP jam = laju rata-rata jam itu). Level = yang tertinggi di antara aturan yang terpenuhi, batas INKLUSIF (>=), salah satu fitur cukup. `a24` (anteseden) tidak dipakai di level; dilaporkan saja.

| Level | h1 (mm/jam) | h3 (mm) | h6 (mm) |
| --- | --- | --- | --- |
| 1 Waspada | >= 20 | >= 30 | >= 50 |
| 2 Siaga | >= 30 | >= 50 | >= 75 |
| 3 Awas | >= 50 | >= 75 | >= 100 |

`status` = None (tak dinilai) bila `hilang_jend` >= 3 dari 6 jam jendela (`HILANG_MAKS`); jam hilang 1-2 dihitung 0 (batas bawah) dan dilaporkan. Hari yang semua jalannya None dianggap tak terobservasi (§5), bukan negatif.

**Pembulatan:** `fitur()` membulatkan h1, h3, h6 ke 0,1 mm SEBELUM dibandingkan dengan batas (`level` memakai nilai bulat itu); 29,95 menjadi 30,0 dan memenuhi >= 30.

**Label jujur: AMBANG AWAL HEURISTIK.** Tidak ada angka di tabel yang diturunkan dari data bandang Indonesia atau dari kurva banjir bandang per jam yang diterbitkan. Asal dan mutunya:

| Angka | Asal | Mutu |
| --- | --- | --- |
| h1 >= 30 | aturan bandang `status.py` (`I >= 30` mm/jam, Siaga), sudah di repo | internal; diuji balik pada Open-Meteo 0,25 derajat harian, bukan GSMaP |
| h1 >= 20 | klasifikasi intensitas hujan per jam BMKG (sangat lebat > 20 mm/jam) | belum terverifikasi dari teks primer |
| h6 >= 50, h3 >= 50, h1 >= 50 | 50 mm = batas bawah hujan lebat HARIAN BMKG (50-100 mm/hari), dipadatkan ke jendela 6 jam, 3 jam, 1 jam | kelas harian dimampatkan; tidak ada dasar sebagai ambang per jam |
| h6 >= 100 | 100 mm = batas bawah sangat lebat harian BMKG dalam 6 jam | sama |
| h3 >= 30, h3 >= 75, h6 >= 75 | h3 >= 30 dibulatkan dari analogi Caine (di bawah); 75 = tengah rentang 50-100 | interpolasi pembuat |

Analogi longsor, BUKAN dukungan untuk ambang bandang: Caine (1980) memberi ambang intensitas-durasi longsor global I = 14,82 D^-0,39 (D jam; terverifikasi, DOI 10.1080/04353676.1980.11879996); pada D=3 jam 29 mm dan D=6 jam 44 mm, yang mengilhami h3 >= 30 dan h6 >= 50. Guzzetti dkk. (2008, I = 2,20 D^-0,44) disebut di draf awal; koefisiennya belum terverifikasi dari teks primer dan tidak dipakai sebagai argumen apa pun. Longsor dan bandang berbeda mekanisme dan skala (titik/lereng versus DAS); kurva longsor tidak membuktikan ambang bandang tidak terlalu rendah atau tinggi.

Peringatan kejujuran: GSMaP NRT 0,1 derajat (~11 km) meratakan sel konvektif sehingga puncak titik biasanya lebih tinggi; ambang titik tidak dapat dipindah apa adanya. Arah bias (alarm terlalu jarang) diduga tetapi BELUM diukur. Verifikator mencocokkan kategori BMKG dan rumus dengan teks aslinya sebelum sidik; selisih = amandemen SEBELUM beku.

## 5. Data prospektif dan observabilitas

- Jalan `tarik` harus dijadwalkan dan diarsipkan (berkas `fitur_<UTC>.json`, tidak ditimpa) sebelum jendela prospektif. Sampai ada workflow yang melakukan itu, jendela belum mulai. Setiap berkas diunggah ke arsip tak dapat diubah (R2) dengan sha256; hanya `dibuat_utc` berkas, bukan rekonstruksi dari jalan sesudahnya, yang dihitung.
- **Arsip pembanding:** salinan harian `public/banjir/data/hujan.json` (dan `bahaya.json`) diarsipkan tak dapat diubah ke R2 dengan sha256 mulai `awal_prospektif`, untuk merekonstruksi aturan `status.py` luring (§6). Tanpa itu pembanding (2) tidak tersedia.
- Hari kabupaten terobservasi bila gabungan jendela 6 jam semua jalan arsip hari itu menutup >= 20 dari 24 jam hari WIB. Hari lain = tak terobservasi (bukan 0), jumlahnya dilaporkan.
- **Jendela prospektif:** mulai `awal_prospektif` di `nowcast_bandang.sidik` (hari WIB sesudah tanggal sidik; `python3 scripts/banjir/nowcast_bandang.py sidik`, dijalankan sesi induk setelah tinjauan dan setelah penjadwalan arsip hidup). Jalan sebelum itu tidak dinilai. Berakhir pada pembukaan akhir (§7), paling lambat 2028-06-30.
- Arsip historis (GSMaP jam-jaman untuk hari DIBI bandang 2018-2025) bila kelak diunduh adalah protokol terpisah dan HANYA boleh menolak ambang; tidak bisa meluluskan.

## 6. Pembanding dan ukuran

Pembanding pada JUMLAH ALARM SAMA (N alarm kabupaten-hari Siaga nowcast di periode nilai; pembanding mengambil N kabupaten-hari teratas menurut peringkatnya, seri dipecah deterministik menurut kunci):

1. **Klimatologi (wajib):** peringkat kabupaten-bulan menurut frekuensi hari DIBI bandang 2016-2025 (ditetapkan sekali dari `dibi_tanggal.json` sebelum sidik, tidak dihitung ulang).
2. **Aturan `status.py` bandang (wajib):** direkonstruksi LURING dari salinan arsip `hujan.json` (tiap hari dipakai salinan pertama bertanggal >= d, tercatat di manifest) dan `bahaya.json`: `imax >= 30` dan B >= 0,33 pada sel 0,25 derajat kecamatan zona, maksimum per kabupaten-hari; peringkat seri memakai `imax` maksimum. Bila salinan arsip tersedia untuk < 80% kabupaten-hari terobservasi, pembanding ini tidak tersedia dan vonis paling baik TIDAK MEYAKINKAN.
3. **Dilaporkan tanpa gerbang:** peringatan dini cuaca BMKG (CAP, `peringatan.json`, ada sejak 19 Okt 2026); poligon bandang Flood Hub (`PRAREG-FLOODHUB.md`, bila sidiknya ada); persistensi (kab-hari bandang DIBI kemarin; batas atas karena label tidak tersedia waktu nyata).

Ukuran, pada level Siaga (utama) dan Waspada, Awas (deskriptif): POD tingkat kejadian, FAR, CSI, ETS (rumus `uji_balik.py`) dari tabel §3, dan selisih ETS berpasangan terhadap pembanding pada N alarm sama. Awas dilaporkan; perbandingan monotonnya "tidak dinilai" bila alarm Awas < 10 dan tidak menjadi syarat. Dilaporkan juga: sebaran `umur_jam_terbaru` nyata (median, p90), fraksi kabupaten-hari tak terobservasi, fraksi status None, hasil per zona waktu dan per pulau. Selang: bootstrap blok 5.000 ulangan, biji 11, dua skema blok (kabupaten x bulan; pulau x minggu), blok identik di semua pembanding; batas bawah = yang lebih kecil dari dua skema, batas atas = yang lebih besar. Dua kontras gerbang diuji sebagai irisan-gabungan seperti `PRAREG-KAB2.md`: LULUS menuntut KEDUANYA lolos pada selang 95% (persentil 2,5 dan 97,5), jadi galat jenis I satu-sisi <= 2,5% tanpa koreksi Bonferroni.

## 7. Pembukaan, jumlah minimum, dan vonis

- **Penilai terpisah, dibeku dulu:** `scripts/banjir/nilai_bandang.py` (tabel §3, pembanding, ETS, bootstrap) harus ditulis, dikunci dengan `nilai_bandang.sidik` sendiri (sha256 berkas, `dibi_tanggal.json` TIDAK dibaca), dan di-commit PALING LAMBAT **2027-03-01**, sebelum salinan label pertama dibekukan. Selama sidiknya belum ada, tidak ada pembukaan apa pun. Penilai tidak memuat label sebelum itu dan `buka` menolak bila sidik penilai patah.
- **Pembukaan = satu salinan DIBI yang dibekukan dan di-sha256; hanya salinan PERTAMA tiap pembukaan yang dihitung.** Menjalankan ulang pada salinan lebih baru hanya deskriptif. Paling banyak dua pembukaan:
  1. **Awal (kesia-siaan):** paling cepat **2027-06-01**, bila 15 kejadian matang sudah ada.
  2. **Akhir (vonis):** paling cepat **2027-09-01**, paling lambat **2028-06-30** (batas mati).
- **Laju kejadian, jujur:** laju terkini sekitar 30 kab-hari bandang DIBI per tahun nasional (2025: 13, 2026: 26 sampai Sep, mungkin belum penuh; 2020-2023 sekitar 60). Gugus hampir sama dengan kab-hari. Untuk 30 kejadian matang di zona bahaya, diperlukan sekitar satu tahun, ditambah 45 hari kematangan dan keterlambatan pengisian, jadi 12-18 bulan atau lebih dari `awal_prospektif`; bisa tak tercapai. Pada **2028-06-30**, bila syarat di bawah belum terpenuhi, hasil ditulis **"belum cukup data"**; tidak diperpanjang, tidak ada vonis.
- **Syarat cukup data (semua):** (a) >= 30 kejadian matang dan terobservasi; (b) >= 30 hari alarm Siaga pada kabupaten-hari terobservasi di periode nilai; (c) >= 80% kabupaten-hari jendela terobservasi (§5); (d) pembanding `status.py` tersedia (§6). Kurang dari satu = "belum cukup data" (butir d: paling baik TIDAK MEYAKINKAN). Daya dicatat: MDE 80% dETS Siaga dari bootstrap pada jumlah kejadian sebenarnya; bila MDE > 0,02, vonis selain TIDAK LULUS diberi keterangan "(daya rendah)" (pola `PRAREG-HULU.md` §5); kriteria tidak berubah.
- **Penolakan awal (hanya menolak):** periode = dari `awal_prospektif` sampai hari jangkar kejadian matang ke-15 (urut jangkar); N = jumlah hari alarm Siaga nowcast pada kabupaten-hari terobservasi di periode itu; pembanding klimatologi mengambil N hari teratas di periode yang sama. Bila ETS Siaga nowcast <= ETS klimatologi (titik): DITOLAK, "tidak terbukti", jendela dihentikan. Satu kali; lolos tidak berarti apa-apa selain lanjut.
- **Vonis akhir (pembukaan akhir, satu kali):**
  - LULUS: batas bawah (95%) dETS Siaga nowcast - klimatologi > 0 DAN batas bawah dETS nowcast - `status.py` > 0 (irisan-gabungan), DAN POD tingkat kejadian Siaga >= 0,3 (titik; batas kebergunaan minimum, ditetapkan sebelum data, tidak disetel).
  - TIDAK LULUS: dETS titik <= 0 terhadap klimatologi, atau batas atas salah satu kontras < 0.
  - TIDAK MEYAKINKAN: selain itu.
- **Lingkup vonis (tidak boleh dilonggarkan):** LULUS hanya berarti **"deteksi, bukan peringatan dini"**: level Siaga memisahkan kabupaten-hari bandang pada stratum B (§3). LULUS TIDAK berarti peringatan dini, tenggang jam, atau akurasi per kecamatan. Status resmi `status.py` tidak ditimpa. Klaim "0-6 jam", tenggang, dan kata "peringatan dini" dilarang tampil di layar sebelum stratum A dilaporkan dengan n dan pemilik memutuskan; sebelum LULUS `tayang` tetap false dan level tidak tampil.
- **Membatalkan percobaan tanpa vonis:** sidik patah (kode, protokol, atau masukan §9; `periksa`); sidik penilai patah; arsip hari yang dinilai beda dari unggahan pertama; GSMaP NRT berhenti terbit atau berganti versi (v8) di tengah jendela. Perbaikan yang tak mengubah keluaran (galat ketik, log) boleh, tercatat. Percobaan baru = protokol baru.
- Hasil negatif dilaporkan setara hasil positif. Tinjauan (validasi-model) dilakukan sebelum sidik; temuannya dicatat di "Catatan draf" §9.

## 8. Batas yang diakui

- Label kabupaten-hari terhadap fitur kecamatan-jam: uji ini mengukur "adakah kecamatan zona kabupaten yang melewati ambang pada hari kejadian", jauh lebih longgar daripada nowcast per kecamatan. Skill per kecamatan dan tenggang jam tidak teruji.
- Latensi NRT belum terukur; bila nyata melebihi 6 jam, nowcast 0-6 jam tidak bermakna dan stratum A menjadi nol-kejadian; ini hasil sah, bukan kegagalan protokol.
- Ambang tidak disetel dari data lokal; kemungkinan besar bukan optimum. Menyetel ulang sesudah prospektif = protokol baru.
- Kabupaten dengan lebih banyak kecamatan zona punya peluang alarm lebih besar (maksimum atas lebih banyak kecamatan); klimatologi tidak mengoreksinya. `status.py` rekonstruksi juga memakai maksimum atas kecamatan, jadi tidak ada keuntungan relatif. Dilaporkan per kelompok jumlah kecamatan zona.
- Beban klimatologi kabupaten-bulan memakai 2016-2025 yang sudah dilihat rancangan lain; tidak masalah karena pembanding, bukan model terlatih.

## 9. Sidik dan amandemen

- `python3 scripts/banjir/nowcast_bandang.py sidik` menulis `scripts/banjir/nowcast_bandang.sidik`: sha256 berkas ini, `nowcast_bandang.py` (seluruhnya), MASUKAN (`public/banjir/data/bahaya.json`, `public/banjir/data/pusat_kec.json`, `scripts/banjir/genangan/gsmap.py`, `genangan/m1_kumpul.py`, `genangan/bersama.py` yang memuat WIB), daftar unit terurai (jumlah dan sha256 kunci terurut), `tanggal_sidik`, `awal_prospektif`. Menolak menimpa. `periksa` menampilkan yang berubah; berkas masukan hilang = galat. Sidik di-commit; penilai menolak bila `periksa` tidak kosong. Konsekuensi: regenerasi `bahaya.json` atau `pusat_kec.json` sesudah sidik mematahkannya; salin beku daftar unit boleh menggantikan lewat amandemen SEBELUM sidik.
- Sebelum sidik: draf ini boleh diubah dengan catatan tanggal di bawah. Sesudah sidik: tidak ada perubahan ambang, label, pembanding, ukuran, selang, atau kriteria.

### Catatan draf

- 2 Nov 2026: draf pertama. Belum ditinjau.
