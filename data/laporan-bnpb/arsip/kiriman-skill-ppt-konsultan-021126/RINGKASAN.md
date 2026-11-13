# Perubahan skill ppt-konsultan, 2 November 2026

Dari: laptop Windows tim (laporan harian), untuk dimasukkan ke versi skill ppt-konsultan utama.

## Ringkas

Semua deck dari `/ppt-konsultan` kini otomatis memasang dua hal di **sampul dan penutup**:

1. **Logo KRIS** (Kolaborasi, Responsif, Integratif, Sinkronisasi), logo resmi, dalam kotak putih bersudut membulat
   tepat di **kiri kotak BerAKHLAK**. Tinggi, sudut, dan bayangan kotak sama dengan kotak BerAKHLAK.
2. **Logo BNPB 1,3 kali** ukuran tema.

Keduanya permintaan pemilik dan atasan pada 2 Nov 2026, setelah dicoba di Laporan Kejadian Bencana Harian 021126.
Posisi lain yang dicoba dan ditolak: KRIS di bawah pil tanggal sampul (terlalu padat), KRIS di kiri atas sejajar
logo BNPB, dan baris ikon KRIS buatan sendiri.

## Isi paket

| Berkas | Untuk |
| --- | --- |
| `deck.py.patch` | Perubahan `bnpb/scripts/deck.py` (unified diff, akhir baris LF). 37 baris berubah, tidak ada yang dihapus selain baris yang diganti. |
| `kris.png` | Logo KRIS, latar transparan. Taruh di `bnpb/assets/logo-bersama/kris.png` (folder baru). |
| `keputusan-pemilik-021126.md` | Bagian baru untuk ditambahkan di akhir `bnpb/references/keputusan-pemilik.md`. |

## Cara memasang (dari folder `~/.claude/skills/ppt-konsultan`)

```bash
git apply --check deck.py.patch && git apply deck.py.patch     # atau: patch -p1 < deck.py.patch
mkdir -p bnpb/assets/logo-bersama && cp kris.png bnpb/assets/logo-bersama/kris.png
cat keputusan-pemilik-021126.md >> bnpb/references/keputusan-pemilik.md
```

Patch dibuat dari `deck.py` di zip `ppt-konsultan.zip` (Drive tim IT, 2 Nov 2026) dan sudah diuji: diterapkan ke
salinan asli, hasilnya identik dengan berkas yang dipakai di laptop ini.

## Rincian perubahan `deck.py`

- `skala_logo_bnpb()`: faktor logo BNPB sampul dan penutup, bawaan 1,3. Spek deck boleh menulis
  `"skala_logo_bnpb": <angka>` (1 = ukuran tema).
- `logo_kris()`: mencari `foto/kris.png` di akar proyek dulu, lalu `assets/logo-bersama/kris.png` milik skill.
- `pasang_kris(...)`: kotak putih + logo KRIS di kiri kotak BerAKHLAK. Pengecualian beralasan:
  `"tanpa_kris": "<alasan dari pemilik>"` di spek deck atau spek slide.
- Dipanggil di `bingkai_konsultan` (sampul dan penutup gaya konsultan) dan `s_sampul` (sampul klasik).
- `logo_bulat` di `bingkai_konsultan`, `s_sampul`, `s_penutup`, `s_penutup_terang` memakai diameter x `skala_logo_bnpb()`.

Gerbang tidak ada yang dilonggarkan.

## Catatan lain dari sesi yang sama (tidak di patch, untuk diketahui)

- Laporan harian dibingkai lewat `lewat_deck.bingkai` di repo poskokarhutla, dengan spek `"panel_sisi": "gelap"`
  (mengikuti Paparan Kepala BNPB 011126), empat bagian ber-`halaman_tetap` tanpa daftar isi dan pembatas, `tanpa_kepada`,
  dan sumber karhutla "GIS BNPB".
- Di Windows, `deck.py` gagal bila berkas masukan dan keluaran beda drive (`os.path.relpath` di manifest). Ini diatasi di
  `lewat_deck.py` repo (folder kerja sementara di drive skill), bukan di `deck.py`.
- Dua spek contoh di zip tidak bisa dibangun di Windows: `proyek-bnpb/spek/papua-bingkai.json` belum punya `kepada`,
  dan `proyek-kepala/logo/sumber-bnpb.png` tidak ikut di zip (kemungkinan symlink di Mac).
