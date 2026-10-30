# ALGORITMA: Kemitraan Kampus

Dokumen keempat dalam urutan otoritas (AGENTS.md §2.2). Kalah dari KP, PRD, ALUR; menang
atas PD, DS, DT, KM, RU, TIKET. Versi 1.0, 30 Okt 2026.

Semua rumus di sini **fungsi murni** dengan kasus acuan di
`tests/kemitraan/fixtures/acuan.json` (RU §2.1). Python (pipeline) dan JS (layar) wajib
memberi hasil sama untuk kasus acuan (selisih ≤ 1e-9). Bobot dan ambang adalah
**asumsi-kebijakan** dan ditulis sebagai konstanta bernama di satu tempat
(`scripts/kemitraan/konst.py` dan `public/kemitraan/konst.js`, isi identik, dijaga uji).

Prinsip: tanpa ML hitam, tanpa LLM (KP T-C), stdlib saja, bisa dijelaskan per angka.

## 1. Kunci wilayah

Kunci tunggal modul = **kode IRBI 4 digit** (`public/data/wilayah/indeks.json`: 514 kab/kota
berkode 4 digit + 34 baris provinsi 2 digit = 548 baris; hanya 514 yang dipakai).
Crosswalk `public/data/kemitraan/kode.json`:

```json
{"<kode4 IRBI>": {"prov": "62", "nama": "Kab. Pulang Pisau", "bps": "6211",
  "kemendagri": "62.11", "kunci_nama": "62|Pulang Pisau", "pusat": [lat, lon]}}
```

Cara bangun (`scripts/kemitraan/kode.py`): pakai `peta()`/`nk()`/ALIAS dari
`scripts/umum/profil_wilayah.py` (impor, jangan salin). Normalisasi nama: huruf kecil, buang
"kabupaten/kab./kota/adm.", spasi tunggal. Yang tidak cocok pasti → `null` + daftar di
`kode_gagal.json`. **Tidak menebak.** Titik pusat = centroid poligon
`public/geo/kabupaten/<prov>.json` (poligon hanya berproperti `kab` = nama, jadi dicocokkan
lewat nama ternormalisasi dalam prov yang sama). Sumber kode lain: `desa_cari.json` (Kemendagri,
hanya 513 kab), `public/data/neraca_air/kab.json` dan `public/data/kejadian/kekeringan-<bps>.json`
(BUKAN BPS: neraca_air memakai kode IRBI, berkas kekeringan memakai nomor urut sumbernya,
mis. Kota Bandung 3211). Kolom `bps` = null untuk semua kab sampai pemilik memberi daftar BPS resmi;
kolom bantu `kekeringan` menyimpan nomor berkas kekeringan yang cocok lewat nama (245 kab).

Uji: 3171 IRBI = "Kota Administrasi Jakarta Pusat" (bukan BPS 3171 Jaksel); ≥ 500 kode
ber-`kemendagri`; 514 ber-`pusat`; tiap null tercatat di `kode_gagal.json` dengan alasan.

## 2. Taksonomi masalah

### 2.1 Bahaya (B) — 11 nilai tetap
`banjir, longsor, gempa, tsunami, gunungapi, kekeringan, karhutla, cuaca_ekstrem,
abrasi_rob, udara, multi`. Peta ke IRBI `b`: banjir→banjir, gempabumi→gempa,
tsunami→tsunami, longsor→longsor, gunungapi→gunungapi, kekeringan→kekeringan,
karlahut→karhutla, cuaca_ekstrem→cuaca_ekstrem, abrasi→abrasi_rob.
Peta ke rumpun `/akademisi`: banjir→banjir, longsor→longsor, gempa→gempa+geologi,
tsunami→tsunami+pesisir, gunungapi→gunung api, kekeringan→kekeringan+iklim,
karhutla→karhutla, cuaca_ekstrem→hidrometeorologi+iklim, abrasi_rob→pesisir,
udara→kesehatan bencana+karhutla, multi→manajemen bencana.

### 2.2 Aspek (A) — 10 nilai tetap
| Kode | Aspek | Contoh masalah |
| --- | --- | --- |
| A1 | Pengetahuan bahaya | peta bahaya kasar, belum ada model lokal |
| A2 | Peringatan dini | tidak ada EWS, ambang tidak teruji |
| A3 | Mitigasi struktural | tanggul, drainase, retrofit, sekat kanal |
| A4 | Tata ruang dan lingkungan | permukiman di zona merah, alih fungsi |
| A5 | Kelembagaan dan dokumen | tanpa perda, RPB, renkon, KRB kedaluwarsa |
| A6 | Kesiapsiagaan masyarakat | Destana pasif, latihan jarang |
| A7 | Kelompok rentan dan kesehatan | balita, lansia, ISPA, psikososial |
| A8 | Logistik dan sarana | gudang, alat, akses |
| A9 | Pemulihan | rehab-rekon macet, Jitupasna |
| A10 | Pendanaan dan ekonomi | APBD kecil, kerugian ekonomi |

Kategori = pasangan (B, A). Total 110 kategori. Tiap kategori punya **kamus kata kunci**
ID+EN (`scripts/kemitraan/kamus.json`, minimal 8 istilah per bahaya, 6 per aspek) untuk
F-M4 klasifikasi teks dan §4 kueri.

### 2.3 Klasifikasi teks masalah BPBD
Masalah yang diketik BPBD sudah memilih B dan A di form (wajib). Klasifikasi teks hanya
**saran** saat mengetik: hitung kata kamus yang muncul di judul+uraian per B dan per A;
saran = argmax bila skor ≥ 2, else kosong. Tidak pernah menimpa pilihan pengguna.

## 3. Masalah otomatis dan prioritas

### 3.1 Bahan per kab k dan bahaya b (semua dinormalkan ke persentil nasional 0–1)
| Simbol | Arti | Sumber |
| --- | --- | --- |
| H | skor bahaya IRBI 2025 `ir.b[b]` | `wilayah/NN.json` |
| F | frekuensi kejadian 2015–2025 per 100 rb penduduk | `banjir/data/kejadian.json`, gempa `risiko.json`, karhutla `riwayat_wilayah/kab.json` (titik/tahun), kekeringan `kekeringan_riwayat.json` |
| T | tren: kemiringan Theil–Sen kejadian per tahun 2015–2025, dipetakan ke persentil; null bila < 5 tahun data | sama |
| D | dampak: (meninggal×10 + mengungsi/100 + rumah rusak berat) 12 bulan terakhir | `dibi_kejadian.json` |
| P | paparan: penduduk rentan (balita+lansia) + bangunan | `wilayah` blok `pp` |
| K | celah kapasitas: 1 − (perda PB + perda BPBD + RPB + renkon + BPBD aktif)/5 | `wilayah` blok `rg`, `bp` |
| M | model platform: kelas risiko harian rata-rata 90 hari kecamatan teratas | `risiko_kecamatan.json` (berlabel belum diuji) |

Data hilang: komponen null → dikeluarkan dan bobot sisanya dinormalkan ulang; tampilkan
"n dari 6 komponen skor tersedia" (M bukti saja, tidak dihitung). Bila < 4 → masalah tidak dibuat.

### 3.2 Skor prioritas otomatis
```
S_auto(k,b) = 0.25·H + 0.20·F + 0.10·T + 0.15·D + 0.15·P + 0.15·K   (M tidak masuk skor,
                                                                      hanya bukti; belum diuji)
```
Kelas: P1 bila S ≥ 0.70 atau (H ≥ 0.80 dan K ≥ 0.60); P2 bila S ≥ 0.50; P3 selainnya.

### 3.3 Aturan pembentuk masalah (aspek)
Untuk tiap (k,b) dengan S_auto ≥ 0.40, buat masalah per aturan yang terpenuhi:
| Aturan | Aspek | Judul baku |
| --- | --- | --- |
| H ≥ 0.6 dan tidak ada RPB/renkon | A5 | "{Bahaya} berisiko tinggi tanpa dokumen rencana" |
| F ≥ 0.6 dan T ≥ 0.6 | A1 | "Kejadian {bahaya} meningkat, penyebab lokal belum dipetakan" |
| b ∈ {banjir, longsor, cuaca_ekstrem, karhutla} dan F ≥ 0.6 | A2 | "{Bahaya} berulang, peringatan dini lokal belum teruji" |
| D ≥ 0.7 | A9 | "Dampak {bahaya} besar dalam 12 bulan, pemulihan perlu dikawal" |
| P ≥ 0.7 dan H ≥ 0.5 | A7 | "Kelompok rentan banyak di wilayah {bahaya}" |
| b = karhutla dan gambut > 10% luas | A3 | "Karhutla di lahan gambut, pembasahan belum efektif" |
| b ∈ {gempa, tsunami} dan H ≥ 0.7 | A3 | "Bangunan di zona {bahaya} perlu dinilai ketahanannya" |
| model gagal uji untuk b (gerbang_model/uji balik) | A1 | "Model {bahaya} platform belum lolos uji di wilayah ini" |

Bukti tiap masalah = daftar angka asli (bukan persentil) + sumber + tanggal. Judul tidak
pernah memuat angka (gaya rumah); angka di baris bukti.

### 3.4 Prioritas masalah BPBD (F-M4)
Penilaian ST: U urgensi, C cakupan (jiwa/wilayah), R kesiapan data, J kecocokan kampus
(ada ≥ 3 pakar skor ≥ 0.5) — masing-masing 0–3.
```
S_bpbd = 0.5·(U+C+R+J)/12 + 0.5·S_auto(k,b)   (S_auto=0.5 bila b=multi atau tak tersedia)
```
Kelas sama dengan §3.2.

### 3.5 Penggabungan lintas daerah
Dua masalah digabung bila kategori (B,A) sama dan Jaccard token judul+uraian (setelah
buang kata henti `kamus.json:henti`) ≥ 0.5. Induk = yang S tertinggi. Dipakai F-R1.

## 4. Pencocokan pakar

### 4.1 Korpus
Per pakar p (dari `akademisi/induk.json`, R2 privat): ≤ 25 karya (15 sitasi tertinggi +
10 terbaru ≥ 2018) dari OpenAlex `/works?filter=author.id:` dengan `title`,
`abstract_inverted_index` (dibalik jadi teks), `publication_year`, `doi`,
`primary_location.source.display_name`, `cited_by_count`, `concepts/topics`.
Disimpan R2 `kemitraan/korpus/<id%64>.json`, diperbarui bulanan (pipeline
`korpus.py`, laju sopan ≤ 8 req/dtk, kunci `OPENALEX_KEY`). Karya tanpa abstrak tetap
dipakai (judul + topik saja).

### 4.2 Kueri masalah
Q = judul + uraian masalah + kamus kategori (B) + kamus (A) + nama provinsi + nama
pulau. Token: huruf kecil, buang tanda baca dan kata henti ID+EN, stem ringan (buang
akhiran "-nya, -kan, -an, -s, -ing, -ed"; tabel di `kamus.json:stem`).

### 4.3 Skor teks: BM25 per karya
```
bm25(q,d) = Σ_t∈q IDF(t)·f(t,d)·(k1+1) / (f(t,d) + k1·(1 − b + b·|d|/avgdl))
IDF(t) = ln(1 + (N − n_t + 0.5)/(n_t + 0.5));  k1 = 1.2, b = 0.75
```
Bidang judul dihitung dua kali (bobot 2). Skor teks pakar:
`Teks(p) = rata-rata 3 bm25 karya teratas p`, lalu dibagi maksimum di antara kandidat
(0–1). Rata-rata 3 teratas mencegah pakar yang menulis sangat banyak menang hanya karena
jumlah.

### 4.4 Komponen lain
| Komponen | Rumus (0–1) |
| --- | --- |
| Rumpun R | 1 bila rumpun pakar ∋ rumpun bahaya (§2.1), 0.5 bila topik OpenAlex pakar memuat kata kamus B, else 0 |
| Bukti lokal L | 1 bila ≥ 1 karya menyebut nama kab; 0.6 bila nama prov/pulau; 0 else |
| Mutu Q | 0.6·persentil(h-index) + 0.4·persentil(karya ≥ 2021 / karya) |
| Jarak J | exp(−km/300), km = haversine kampus pakar ke pusat kab; kampus tanpa titik → 0.3 |
| Rekam jejak E | 1 bila pakar tercatat di riset/satgas/kaji cepat BNPB (D1), 0.5 bila lencana bukti, else 0 |

### 4.5 Skor akhir
```
Skor(p) = 0.45·Teks + 0.15·R + 0.10·L + 0.12·Q + 0.10·J + 0.08·E
```
Kandidat = pakar dengan R > 0 atau Teks ≥ 0.2. Urutan: Skor turun, seri → h-index turun →
id naik (deterministik). **Keragaman:** saat mengisi 10 teratas, lewati pakar ketiga dari
kampus yang sama (maks 2 per kampus). Tampilkan pecahan skor di kartu.

### 4.6 Tempat hitung
Pipeline bulanan `cocok_pakar.py` (GitHub Actions) menghitung top-10 untuk semua masalah
otomatis (§3.3) → R2 `kemitraan/cocok/<kode4>.json`. Masalah BPBD baru: worker menghitung
saat diminta dari indeks ringkas R2 `kemitraan/indeks_bm25/<B>.json` (posting list per
token, dibatasi 2.000 token teratas per bahaya). CPU ≤ 10 ms dijaga dengan **anggaran
operasi** (Σ panjang posting token kueri ≤ `KM_MAKS_POSTING` = 20.000 dan kandidat ≤ 400),
bukan pengukur waktu. Bila melebihi: "Dihitung malam ini", `cocok_baru.py` harian mengisinya.
Worker TIDAK PERNAH memuat `akademisi/induk.json`.

## 5. Solusi tepat guna dari paper (ekstraktif)

Untuk 3 karya teratas pakar:
1. Pecah abstrak jadi kalimat (titik + spasi + huruf besar; jangan memecah "et al.", "e.g.",
   "dkk.", angka desimal).
2. Skor kalimat = 2·(jumlah penanda solusi) + (jumlah token Q) − 0.5·(kalimat ke-1 bila
   hanya latar). Penanda solusi ID+EN (`kamus.json:solusi`): "we propose", "we develop",
   "this study presents", "method", "system", "model", "framework", "reduce", "mitigat",
   "early warning", "dikembangkan", "diusulkan", "metode", "sistem", "rekomendasi",
   "mengurangi", "penerapan", "teknologi".
3. Ambil 1–2 kalimat skor tertinggi (≥ 3), kutip **apa adanya** dalam tanda kutip + tautan
   DOI. Tanpa abstrak → tampilkan judul saja dengan label "Abstrak tidak tersedia".
4. Label kartu: "Kutipan dari abstrak, bukan rekomendasi BNPB".

## 6. Generator pertanyaan

### 6.1 Bank templat
`scripts/kemitraan/pertanyaan.json` (juga disajikan ke layar):
```json
{"umum": [...], "B": {"banjir": [...], ...}, "A": {"A1": [...], ...},
 "narasumber": {"bpbd": [...], "bappeda": [...], "pu": [...], "dinkes": [...],
                "dinsos": [...], "kades": [...], "warga": [...], "usaha": [...]},
 "data_diminta": {"A5": ["Dokumen RPB terakhir dan tahun pengesahan", ...], ...},
 "riset": {"A1": ["Faktor apa yang paling menjelaskan {fenomena} di {wilayah} {periode}?", ...]}}
```
Tiap templat: `{id, teks, arah, isian:[nama slot], syarat}`. `arah` ∈
{konfirmasi, akar, kapasitas, upaya, kebutuhan, harapan}. `syarat` ekspresi sederhana
atas profil (mis. `"rpb == false"`, `"F >= 0.6"`) dievaluasi tanpa `eval` (parser kecil:
`<kunci> <op> <angka|true|false>`, op ∈ {==, !=, >=, <=, >, <}, digabung `and`).

Minimal isi: 10 umum, 6 per bahaya (66), 6 per aspek (60), 8 per narasumber (64),
4 riset per aspek (40), data diminta 5 per aspek (50). Total ≥ 290 templat.

### 6.2 Penyusunan panduan
Masukan: kab, (opsional) masalah, narasumber terpilih.
1. Ambil templat umum + B masalah + A masalah + narasumber; saring `syarat`.
2. Isi slot dari profil (`{wilayah}`, `{bahaya}`, `{n_kejadian}`, `{periode}`,
   `{tren_kata}` = "naik/turun/datar", `{kec_teratas}`, `{dokumen_kurang}`,
   `{jiwa_rentan}`). Slot tanpa nilai → templat dibuang (tidak pernah tampil "{...}").
3. Urutkan per `arah` (konfirmasi → akar → kapasitas → upaya → kebutuhan → harapan);
   di dalam arah, urut sesuai id.
4. Pertanyaan akar otomatis ditambah susulan "Mengapa?" bertingkat maksimal 3 (pola
   5-Why, ditulis sebagai sub-butir).
5. Batas: 40 pertanyaan per narasumber; bila lebih, buang yang `prioritas` rendah.

### 6.3 Pertanyaan riset
Dari templat `riset` untuk aspek masalah + tambahan dari model gagal:
"Mengapa model {bahaya} kalah dari {pembanding} di {wilayah}, dan data lapangan apa yang
memperbaikinya?" Bentuk akhir disertai: variabel, data yang tersedia di platform (tautan
API v1), data yang harus dikumpulkan, keluaran yang diharapkan BNPB.

## 7. Skor keaktifan kampus (F-D5)
Jendela 365 hari, tiap komponen dipotong di batas atas lalu dibagi batasnya:
```
Aktif = 0.20·min(masalah_diambil,5)/5 + 0.20·min(proposal,3)/3 + 0.15·satgas_siap
      + 0.15·min(jam_sah,2000)/2000 + 0.10·min(magang,20)/20
      + 0.10·min(desa_binaan,10)/10 + 0.10·min(luaran,5)/5
```
Pasif bila Aktif = 0 selama 365 hari dan kampus berstatus simpul/satelit.

## 8. Pencocokan donor (F-R3)
```
Cocok(m,d) = 0.35·[B_m ∈ bahaya_d] + 0.25·[A_m ∈ aspek_d] + 0.15·[syarat mitra terpenuhi]
           + 0.15·[panggilan buka & tenggat ≥ 21 hari] + 0.10·[status_d = siap dijajaki]
```
Tampilkan bila ≥ 0.5. `[x]` = 1/0. Bahaya donor "semua" cocok dengan semua.

## 9. Urutan panggil satgas (F-S2)
Kandidat: anggota berstatus `siap_tugas` (anggota menekan sendiri "Saya siap bertugas", DT
ADR-09) dengan kab domisili/kampus ≤ radius aktivasi.
```
Panggil(a) = 0.40·exp(−km/100) + 0.30·keahlian_cocok + 0.15·[latih kaji cepat]
           + 0.15·min(jam_sah_365,200)/200
```
`keahlian_cocok` = |keahlian anggota ∩ kebutuhan| / |kebutuhan|. Seri → id. Pakar piket
rumpun kejadian selalu di atas daftar pakar.

## 10. Indikator kinerja (F-X1)
Tiap indikator slide 28 = satu kueri tetap (DT §6.3), dummy dikecualikan, jendela tahun
kalender. "Dana mitra per Rp1 APBN" = Σ dana_pendamping proposal lolos / Σ pagu hibah BNPB.

## 11. Uji kejujuran algoritma
- **Relevansi pakar (RU §2.9):** 60 masalah acuan (6 per aspek, tersebar bahaya), tiap
  masalah 15 pakar teratas gabungan dari 3 sistem (Skor §4.5; pembanding A = h-index
  dalam rumpun; pembanding B = `/api/akademisi/terdekat` lama). Dua penilai staf memberi
  0/1/2 tanpa tahu sistemnya. nDCG@10. **Lolos** bila Skor ≥ maks(A,B) + 0.10 dan
  kesepakatan penilai (κ Cohen) ≥ 0.4. Syarat dibekukan sebelum dijalankan; hasil di
  `public/data/kemitraan/uji_cocok.json`; pil "Belum diuji" hilang hanya bila lolos.
- **Prioritas otomatis:** setelah ≥ 100 masalah tervalidasi pendataan, hitung AUC
  S_auto lawan label "tervalidasi P1" vs pembanding H saja. Sampai itu, pil "Belum diuji".
- **Generator:** uji sifat: tidak ada slot kosong; tiap arah terwakili bila data ada;
  deterministik.
