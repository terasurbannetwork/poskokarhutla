# ALGORITMA: Cek Kabar Luar

Semua fungsi murni di `scripts/data/dalops_kabar.py`, diuji `--uji` tanpa jaringan. Angka bertanda **[BAWAAN SEMENTARA]** adalah usulan tanpa dasar data, diatur ulang dari rapor CK-07.

## 1. Pencocokan berita ke kejadian

Masukan: kejadian `k` (`kab_kode` berupa **daftar** kode `"<prov>|<kab>"`, `prov_kode`, `terakhir`, jenis), arsip artikel berkas jenis itu (DESAIN-TEKNIS), hari `h`.

Artikel `a` cocok bila semua benar:

1. Salah satu elemen `k.kab_kode` ada di `a.kab`. Artikel yang hanya punya `prov` **tidak** cocok (PRD larangan 4). Pengecualian: kejadian tingkat provinsi (elemen berakhiran `"|(provinsi)"`, gempa) cocok dengan artikel yang `prov`-nya memuat `k.prov_kode`.
2. `tanggal(a.tgl) >= k.terakhir - 1 hari` dan `<= h`. Kelonggaran 1 hari **[BAWAAN SEMENTARA]** karena tanggal laporan resmi adalah hari laphar (H-1).
3. Artikel menyebut jenisnya. Berkas tayang sudah tersaring relevan oleh panennya masing-masing, tetapi beberapa jenis berbagi berkas, jadi teks `judul + ringkas` wajib cocok `KATA_JENIS[jenis]`:

| Jenis | Berkas | `KATA_JENIS` |
| --- | --- | --- |
| banjir | `berita.json` | `banjir|genang|terendam|meluap|bandang` |
| longsor | `berita.json` | `longsor|tanah bergerak|pergerakan tanah|tertimbun` |
| gelombang | `berita_pesisir.json` | `rob|gelombang|abrasi|pasang` |
| karhutla | `/data/berita.json` | `kebakaran hutan|kebakaran lahan|karhutla|lahan terbakar|hutan terbakar` |
| permukiman | `/data/berita.json` | `kebakaran (rumah|permukiman|pemukiman|pasar|ruko|gedung|bangunan)` (Q2) |
| cuaca, gempa, kekeringan | berkas sendiri | tanpa syarat tambahan |

## 2. Arah bukti satu artikel

Teks = `judul + " " + ringkas`, huruf kecil.

- **pulih** bila regex selesai jenis itu dari `dalops_banjir.py` cocok dan regex belumnya tidak cocok (dipakai ulang lewat `POLA` dan `surut()`, bukan disalin), ditambah pola umum `kembali normal|warga kembali ke rumah|status (tanggap )?darurat (dicabut|berakhir)` selama teks tidak memuat `belum (sepenuhnya) kembali/normal/dicabut/berakhir/surut/padam`. Contoh: "air mulai surut" **tidak** pulih karena `SUDAH` banjir meminta "sudah/telah surut".
- **masih** bila bukan pulih dan salah satu benar: topik memuat `korban` atau `penanganan`, atau teks cocok `AKTIF` = `masih|terendam|tergenang|mengungsi|pengungsi|evakuasi|terisolir|belum surut|belum padam|terbakar|dalam penanganan|tanggap darurat` **[BAWAAN SEMENTARA]**.
- Selain itu: diabaikan. Topik `kejadian` saja tidak cukup, karena hampir semua artikel bertopik `kejadian` (1.500 dari 1.500 di `berita.json` banjir 11 Nov 2026); artikel pencegahan, kebijakan, atau infrastruktur saja juga diabaikan.

## 3. Sinyal alam per jenis

Level di `status.json`: 0 normal, 1 waspada, 2 siaga, 3 awas. Per kab diambil level tertinggi semua kecamatannya untuk hari ini dan besok; bila `hari` berkas tidak memuat hari ini, tanpa sinyal.

| Jenis | Alam normal bila | Alam aktif bila |
| --- | --- | --- |
| banjir | level `b` tertinggi <= 1 | level `b` tertinggi >= 2 |
| longsor | level `l` tertinggi <= 1 | level `l` tertinggi >= 2 |
| karhutla | titik panas semua kab kejadian (dijumlah) 0 pada hari terakhir berkas dan sehari sebelumnya | jumlah > 0 pada hari terakhir berkas; berkas yang hari terakhirnya lebih tua dari h-1 = tanpa sinyal |
| kekeringan | kelas `gdo_spi3` dan `gdo_tanah` di `gdo.json` sama-sama 0 | salah satu >= 1 |
| cuaca, gempa, gelombang, permukiman | tidak ada sinyal alam | |

Ambang level <= 1 **[BAWAAN SEMENTARA]**: per 11 Nov 2026 hanya 580 dari 2.823 kecamatan bernilai `b` 0 semua hari, sedangkan 2.644 bernilai <= 1. Sinyal alam tidak pernah sendirian menjadi bukti "masih": level banjir dan longsor adalah prakiraan model. Alam aktif hanya mencegah label "Kemungkinan selesai".

## 4. Label

```
m = artikel masih terbaru, p = artikel pulih terbaru
senyap = h - max(k.terakhir, tanggal artikel cocok terbaru)
if p and (not m or p.tgl > m.tgl):                         label = "mungkin_selesai", dasar = "berita"
elif m:                                                    label = "masih", dasar = "berita"
elif jenis in AMBANG and senyap >= AMBANG[jenis] and alam == "normal":
                                                           label = "mungkin_selesai", dasar = "alam"
else:                                                      label = "belum_ada"
```

`AMBANG` **[BAWAAN SEMENTARA]** (Q1) hanya untuk jenis bersinyal alam: banjir 3, longsor 7, karhutla 3, kekeringan 14 hari. Cuaca, gempa, gelombang, dan permukiman hanya bisa "Kemungkinan selesai" dari berita pulih. Gempa dan cuaca sudah dibuang `saring()` sesudah 14 hari senyap (`SENYAP_MAKS`), jadi tidak butuh ambang. Seri tanggal `p` dan `m`: "masih" (ragu = belum selesai, sama dengan `selesai()`).

## 5. Per kab/kota dan urutan "Perlu ditanya"

Layar mengelompokkan baris per kab/kota (`H.kelompok`). Label kelompok = label baris paling waspada: `masih` mengalahkan `belum_ada`, `belum_ada` mengalahkan `mungkin_selesai`. Bukti kelompok = gabungan bukti barisnya, maksimal 5 terbaru.

"Perlu ditanya" sekarang hanya memuat kelompok yang angkanya bolong (`kurang`) atau kabarnya basi. Sesudah CK-05 juga memuat **semua** kelompok berlabel `mungkin_selesai`. Kunci urut: label (mungkin_selesai 0, belum_ada 1, masih 2), lalu `senyap` menurun, lalu nama kab.

## 6. Rapor ketepatan (CK-07)

Dari `cek_arsip.jsonl`: label "mungkin_selesai" pada hari `d` benar bila laporan resmi selesai untuk kejadian itu datang dalam 14 hari sesudah `d`. Label "masih" benar bila laporan resmi selesai **tidak** datang dalam 3 hari. Jendela 14 dan 3 hari **[BAWAAN SEMENTARA]**. Hasil berupa tabel a/b/c/n per jenis. Tanpa persen bila n < 30 (mengikuti K5 Silang Sumber). Kejadian yang hilang karena senyap tanpa laporan selesai dihitung "tak diketahui", bukan benar atau salah.
