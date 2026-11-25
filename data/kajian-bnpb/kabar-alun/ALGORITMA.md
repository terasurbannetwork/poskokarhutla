# ALGORITMA: Kabar Alun-alun

Fungsi murni di `scripts/data/alun_kabar.py`, diuji `--cek` tanpa jaringan. Angka bertanda **[BAWAAN SEMENTARA]** mengikuti KEPUTUSAN dan belum diputuskan pemilik.

## 1. Kunci kejadian

`id = <jenis harian>|<kab_kode>|<mulai>`, contoh `banjir|11|Kota Subulussalam|2026-11-19`. `kab_kode` = `"<kode prov>|<nama kab>"` seperti kunci `Geo.pusat["kab"]` di `scripts/umum/berita.py`. Jenis harian dipertahankan di `id` (angin dan cuaca tidak bertabrakan); `jenis` di keluaran memakai id jenis Alun-alun:

| Jenis harian | `jenis` Alun-alun | Jenis `cocok()` (dalops_kabar) |
| --- | --- | --- |
| banjir | banjir | banjir |
| longsor | longsor | longsor |
| gelombang_pasang | abrasi | gelombang |
| angin, cuaca | cuaca | cuaca |
| kekeringan | kekeringan | kekeringan |
| karhutla | karhutla | karhutla |
| gempabumi | gempa | gempa |
| erupsi | erupsi | gunungapi |
| kebakaran_permukiman | kebakaran_gedung | permukiman |
| lainnya | lainnya | tidak dicocokkan ke berita |

Dua entri dengan kunci sama dalam satu hari: yang pertama dipakai, sisanya dibuang, dan `--cek` mencatat jumlahnya (bukan galat).

### 1.1 Membaca hari ke belakang

Untuk `hari` H, telusuri tanggal H sampai H-8. Tiap tanggal: glob `data/laporan-bnpb/harian/<YYYY-MM>/<tanggal>/kerja-*/data.json` (folder `kerja-DDMMYY` bernama tanggal hari berikutnya, jadi jalurnya tidak diturunkan dari `hari`). Folder atau berkas yang tidak ada dilewati tanpa galat (2026-11-24 memang tidak ada). Bila glob menemukan lebih dari satu `data.json`, pakai yang field `hari`-nya sama dengan tanggal folder. Untuk tiap kunci, entri tanggal terbaru yang menang; `lap_terakhir` = tanggal itu, `cutoff_terakhir` = `cutoff` berkas itu.

## 2. Kode kab dan titik

`kab_kode` ditentukan dengan mencari kunci `f"{prov}|{lokasi}"` yang sama persis di `Geo.pusat["kab"]` (nama dan provinsi, tanpa penyesuaian huruf selain yang sudah dilakukan `norm()`). Tidak ada kecocokan sebagian, singkatan, atau tebakan terdekat (D5). Bila tidak ketemu: `kab_kode = null`, `titik = null`, `titik_ket = "lokasi belum terpetakan"`; berita tidak dicocokkan. Bila ketemu: `titik` = titik tengah kab/kota dari `Geo.pusat` dibulatkan 4 desimal (D6). Jenis `lainnya` tanpa lokasi (`lokasi = ""`) selalu tanpa titik.

## 3. Berita

Untuk tiap kejadian ber-`kab_kode`: bentuk `k = {kab_kode: [kab_kode], prov_kode: prov, terakhir: mulai}` lalu panggil `dalops_kabar.cocok(k, artikel, jenis_cocok, hari)` untuk tiap artikel yang dimuat `muat_bahan(jenis_cocok, hari)` (DESAIN-TEKNIS). Jendela: `mulai - 1 hari` sampai `hari` (`LONGGAR = 1`). Urutkan terbaru dulu, ambil 5; `n_berita` = jumlah seluruh yang cocok. Pemetaan nama kolom: artikel mentah memakai `sumber` untuk nama media; keluaran memakai `media = artikel["sumber"]`. Tiap artikel keluar hanya `judul, media, tgl, url`; `ringkas` tidak ikut (D8). Berkas berita tidak terjangkau (`muat_bahan` mengembalikan kosong): `berita = []` dan `catatan = "berita tidak terjangkau"`, bukan `n_berita = 0`.

## 4. Laporan warga menempel ke kejadian (di peramban)

Masukan: baris dari `/api/lapor/alun` dan kejadian resmi dari `kabar.json`. Bentuk baris warga yang nyata (`src/lapor_tampil.js:136`): `jenisId`, `lokasi{desa, kec, kab, prov, provKode}`, `waktu` (string isian pelapor atau `null`), `dampak` (objek angka tunggal `{meninggal, hilang, luka, mengungsi, rumah, terendam}`; bidang yang tidak dijawab atau nihil bernilai 0, jadi 0 tidak bisa dibedakan dari belum dijawab).

Klaster `g` menempel pada kejadian `k` bila semua benar:

1. `g.lokasi.provKode + "|" + g.lokasi.kab` sama dengan `k.kab_kode` setelah keduanya diubah ke huruf kecil dan spasi dirapikan. Tidak sama: tidak menempel.
2. `g.jenisId == k.jenis`.
3. `g.waktu` diawali tanggal `YYYY-MM-DD` dan `mulai - 1 hari <= tanggal <= hari`. Format `waktu` selain itu **belum terdokumentasi di kode** (tiket KA-05 memeriksa nilai nyata di produksi sebelum aturan ini dikunci); sampai terbukti, `waktu` yang tidak berawalan tanggal ISO atau `null` berarti klaster tidak menempel dan tampil sebagai "belum ada laporan resmi".

Satu klaster menempel pada paling banyak satu kejadian: yang `mulai`-nya terdekat dengan tanggal klaster; seri, `mulai` terbaru. Sisanya menjadi kejadian "belum ada laporan resmi": satu kartu per klaster, tanpa angka resmi.

Pita warga menampilkan angka `dampak` apa adanya per bidang berlabel "laporan warga", hanya bidang yang lebih dari 0, ditambah `nWarga` bila ada. Tidak ada rentang. Tidak pernah dijumlah dengan klaster lain atau dengan angka resmi (D3).

## 5. Kesegaran dan umur

- `usang` dihitung per kejadian di klien: `sekarang - cutoff_terakhir > 48 jam` (`cutoff_terakhir` milik kejadian itu, bukan `cutoff` berkas). Usang: kartu menulis "Laporan resmi terakhir <lap_terakhir>" (D12). Tidak usang: "Laporan harian BNPB, cut-off <cutoff_terakhir>".
- `selesai_lama = (status == "selesai") and (hari - lap_terakhir > 7 hari)` **[BAWAAN SEMENTARA]** Q6. Kejadian itu TETAP ada di berkas; klien menyembunyikannya dari tampilan bawaan dan menampilkannya lewat saringan Selesai. Kejadian yang sudah tidak muncul di 8 hari terakhir tidak ada di berkas (batas jendela baca); saringan Selesai karena itu hanya menjangkau 8 hari ke belakang, dan ini dicatat di layar.

## 6. Angka resmi

`angka.kk`, `angka.mengungsi`, `angka.rumah_dampak` di `data.json` bertipe float (contoh `2659.0`). Pemindahan: bila nilainya ada dan `float.is_integer()`, simpan `int(nilai)`; bila bukan bilangan bulat, simpan `null` dan catat satu baris log "angka bukan bilangan bulat <id> <kolom>" (tidak dibulatkan diam-diam). Tidak ada di sumber: `null`. Angka 0 hanya bila sumber menulis 0.

## 7. Skema `public/data/alun/kabar.json`

```json
{
  "versi": 1,
  "dibuat": "2026-11-25T14:10+07:00",
  "hari": "2026-11-25",
  "cutoff": "2026-11-25T07:00+07:00",
  "kejadian": [
    {
      "id": "banjir|11|Kota Subulussalam|2026-11-19",
      "jenis": "banjir",
      "kab": "Kota Subulussalam",
      "prov": "11",
      "kab_kode": "11|Kota Subulussalam",
      "titik": {"lat": 2.6459, "lon": 98.0121},
      "titik_ket": null,
      "status": "berjalan",
      "baru": false,
      "mulai": "2026-11-19",
      "lap_terakhir": "2026-11-25",
      "cutoff_terakhir": "2026-11-25T07:00+07:00",
      "selesai_lama": false,
      "angka": {"kk": 2659, "mengungsi": 18, "rumah_dampak": 2010},
      "berita": [{"judul": "...", "media": "...", "tgl": "2026-11-24", "url": "https://..."}],
      "n_berita": 3,
      "catatan": null,
      "medsos": {"status": "belum_tersambung"}
    }
  ]
}
```

`media` berasal dari `sumber` artikel mentah. `usang` tidak disimpan (dihitung klien dari `cutoff_terakhir`). `dibuat` diisi dari argumen `--kini` bila ada (uji), jika tidak dari jam sistem. Nilai koordinat dan judul di contoh hanya ilustrasi bentuk. Daftar izin kolom: `id, jenis, kab, prov, kab_kode, titik, titik_ket, status, baru, mulai, lap_terakhir, cutoff_terakhir, selesai_lama, angka, berita, n_berita, catatan, medsos`. Tidak ada kolom lain.
