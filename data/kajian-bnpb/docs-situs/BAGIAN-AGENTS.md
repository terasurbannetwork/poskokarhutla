# Draf bagian AGENTS.md untuk ditempel sesi induk

Berkas ini bukan bagian dari paket yang dibaca agent saat membangun; isinya draf teks siap tempel. Tempel dua
potongan di bawah: (1) bagian 2.47 sesudah bagian 2.46 di AGENTS.md, (2) satu baris di tabel peta modul §2.
Sesudah ditempel, jalankan `npm run uji:agen`. Hapus berkas ini bila tidak lagi dibutuhkan.

## Potongan 1: bagian 2.47

```markdown
### 2.47 Docs Centurisk97 (`/docs`, panduan pengguna dan pengembang, metode di dalam sistem): baca dulu, baru bangun

Sebelum menyentuh sumber isi Docs, generator halamannya, tampilan `/docs`, indeks cari, rute Worker `/docs`, atau alias `docs.centurisk97.id`, baca dokumen di
`data/kajian-bnpb/docs-situs/` dengan urutan otoritas ini (kode di `scripts/docs/**`, `public/docs/**`, `tests/docs/**`, `docs/centurisk97/**` milik `docs-situs`; `src/docs_rute.js` dan penyesuaian `src/worker.js` milik `warga-api`; langkah `bangun.py --cek` di `terbit.yml` milik `mekanik-mesin`):

1. `KEPUTUSAN-DOCS.md`: keputusan pemilik K1-K4, rancangan D1-D10, pertanyaan terbuka Q1-Q8 dengan bawaan sementara; menang atas semuanya.
2. `RISET.md`, 3. `PRD.md` (F-1..F-13), 4. `ALUR.md`, 5. `ALGORITMA.md` (subset Markdown, pemeriksaan sumber, indeks cari), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`DC-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Sumber isi satu (Markdown di `docs/centurisk97/`), halaman HTML adalah keluaran yang tidak disunting tangan dan harus segar (`python3 -I scripts/docs/bangun.py --cek`). Tiap berkas wajib lima bagian baku; angka, rumus, ambang, jadwal, rute, dan hak akses hanya dari kode atau dokumen repo dengan rujukan `berkas:baris`, bila tidak ketemu ditulis "belum terdokumentasi di kode". Model yang belum lulus uji balik ditulis hipotesis; kosong tidak ditulis nol. Tanpa nama orang, nomor, surel, kunci, atau data nyata (repo publik); angka pengaman penyalahgunaan tidak ditulis (Q2). Pertanyaan pemilik yang terbuka ditulis "belum diputuskan (bawaan sementara: ...)". Tampilan memakai token `tema.css` dan kartu standar, tanpa palet sendiri; tidak ada rute API baru; tidak ada salinan docs di modul lain; tinjau di `http://localhost:8800/docs`.
```

## Potongan 2: baris peta modul §2

```markdown
| Docs Centurisk97 `/docs` | `docs/centurisk97/**`, `scripts/docs/**`, `public/docs/**`, `tests/docs/**` (docs-situs); `src/docs_rute.js` (warga-api) | `public/docs/*.html` dan `cari.json` di-commit; langkah `bangun.py --cek` di `terbit.yml` | `docs-situs` |
```

## Potongan 3: baris router §1

```markdown
| Dokumentasi situs, halaman `/docs`, metode untuk pembaca | `docs-situs` → `inp-reviewer` + `selera-angka` |
```

## Catatan untuk sesi induk

- Entri agent `docs-situs` dibuat lewat `scripts/agents/roster.json` lalu `npm run agents:build`, bukan menulis
  `.claude/agents/docs-situs.md` langsung (kelas `pengerja`, `model: "sonnet"`). Rincian ada di tiket DC-00.
- Isi `.claude/ilmu-agent/docs-situs.md` dari kode nyata setelah generator ada, lewat `ilmu.mjs kasus`.
- Daftar `tests/agen/fixtures/modul-lama.json` tidak diubah; `public/docs` dan `scripts/docs` tercakup bagian 2.47
  sehingga gerbang folder baru lolos.
- Pemilik pada baris peta modul hanya boleh satu per berkas kode (gerbang ilmu agent): `src/docs_rute.js` milik
  `warga-api`, selebihnya `docs-situs`.
