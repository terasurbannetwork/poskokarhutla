# DESIGN-SYSTEM: Genangan satelit di `/siklus/kaji/:id`

Ikut `data/kajian-bnpb/siklus/DESIGN-SYSTEM.md` §3.6 dan AGENTS 3.5 dan 3.9. Tidak ada token atau warna baru di luar `public/inti/tema.css`. Tidak ada kalimat kesimpulan di kepala kartu.

## 1. Tata letak

```
kiri 7 kolom                                   | kanan 5 kolom
[ Jam pertama (banjir_jam1) ]                   [ Peta: lapis Genangan radar, batas kab ]
[ Genangan radar ] pil "perkiraan radar" pil hipotesis
   .sk-ber: Luas tergenang baru | Penduduk di area genangan (.sk-rentang) | Kab teramati n dari m
[ Per kabupaten ] tabel
[ Lahan tergenang ] bilah tumpuk + tabel
[ Citra sebelum dan sesudah ] pemilih kab, segmen Radar | Warna asli | Semu SWIR, penggeser
[ Metode ] lipat (<details>), empat butir
[ Bandingkan dengan petugas dan DIBI ]
```

Seluler: satu kolom; peta 220 px di bawah ringkasan.

## 2. Kartu

- Kepala kartu = nama seksi berikon: "Genangan radar", "Per kabupaten", "Lahan tergenang", "Citra sebelum dan sesudah", "Metode". Tanpa angka di kepala.
- Pil: `perkiraan radar` (abu), `hipotesis` (warn) selama vonis belum `lulus`, `Copernicus GFM` sebagai sumber kecil.
- Angka besar di `.sk-ber`: format Indonesia, ha tanpa desimal di atas 100, "rb" di atas 10.000.
- Rentang penduduk memakai `.sk-rentang` dengan dua ujung; tidak pernah angka tunggal.

## 3. Tabel per kab

Kolom: Kabupaten/kota | Lintasan (tanggal) | Tergenang baru (ha) | Teramati (persen) | Persen dari teramati | Penduduk di area genangan (bawah sampai atas). Kepala tabel navy, definisi kolom di `title`. Baris tak sah: angka diganti teks abu "tidak teramati cukup", "sinyal lemah", atau "belum ada lintasan". Urut menurut tergenang baru, baris tak sah di bawah. Klik baris: peta terbang ke kab (kontrol urgent, peta deferred, INP.md).

## 4. Lahan

Bilah tumpuk satu baris setinggi 10 px, segmen per kelas yang ada, tooltip ha dan persen; tabel dua kolom di bawahnya. Warna kelas dari token kategori yang ada di `tema.css`; bila kurang, token baru ditambah di `tema.css` dulu (3.9), bukan di berkas layar.

## 5. Citra

Komponen geser dari `public/inti/geser.js` (pindahan `geserCitra` dan `.bk-geser`). Label sudut "Sebelum <tanggal>" dan "Sesudah <tanggal>". Segmen `.seg.penuh` berikon. Kab tanpa citra: teks "belum ada citra yang memenuhi syarat" atau "tertutup awan".

## 6. Peta

Lapis "Genangan radar": sel 110 m berisi titik baru, warna air dari token, opasitas tetap 0,8 (tanpa penggeser opasitas, cukup tombol tampil/sembunyi). Legenda hanya kelas yang ada. Batas kab tipis. Lapis dibuat sekali; ganti versi hanya mengganti sumber GeoJSON.

## 7. Teks (bahasa-indonesia-plain)

- "Luas tergenang baru" (bukan "luas banjir").
- "Penduduk di area genangan" (bukan "terdampak").
- "Teramati radar" dan "tidak teramati cukup".
- Metode: "Data", "Deteksi", "Dampak", "Catatan"; kalimat pendek, tanpa jargon dB di butir pertama.
- Dilarang: "aman", "tidak banjir", "surut", titik tengah "·" sebagai pemisah, huruf kapital semua.

## 8. Keadaan

Memuat (kerangka abu), kosong ("belum ada lintasan radar sejak <tanggal>"), sebagian (kab tak sah), gagal (pesan singkat, kartu lain tetap), versi lama (pil "lintasan <tanggal>, versi <n>").
