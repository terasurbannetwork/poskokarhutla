# Cadangan akun Claude (4 Nov 2026)

Pemilik pindah akun Claude. Semua memori Claude dan semua artefak claude.ai dari
akun lama disalin ke folder ini supaya tidak hilang. Folder ini dimuat otomatis
lewat `CLAUDE.md` di awal tiap sesi.

**Untuk Claude di akun baru:** memori proyek repo ini ada di dua indeks di bawah
(dimuat otomatis). Tiap baris menunjuk berkas di folder yang sama; buka berkasnya
bila barisnya relevan. Memori proyek lain dan standar global pemilik ada di
`memori/` dan `global/`; buka bila tugasnya menyentuh proyek itu. Isinya fakta
per tanggal tulisnya: cek ulang nama berkas atau fungsi sebelum dipakai.

## Memori repo ini

@memori/poskokarhutla/MEMORY.md
@memori/poskokarhutla-documents/MEMORY.md

## Isi folder

| Folder | Isi |
| --- | --- |
| `memori/<proyek>/` | auto-memory Claude per proyek (163 berkas, 10 proyek). Email dan nomor telepon disamarkan karena repo ini publik |
| `global/` | standar pemilik di `~/.claude/`: `CLAUDE.md`, `RTK.md`, `DUMMY.md`, `INP.md`, `TEST.md`, `FITUR.md`, `WEBSITE.md`, `AGEN.md` |
| `artefak/` | isi 10 artefak claude.ai akun lama |

Asal folder memori (di `~/.claude/projects/`):

| Folder di sini | Folder asli |
| --- | --- |
| `poskokarhutla` | `-Users-priyankaalfatehan28-Developer-poskokarhutla` |
| `poskokarhutla-documents` | `-Users-priyankaalfatehan28-Documents-GitHub-poskokarhutla` |
| `pangantara-documents` | `-Users-priyankaalfatehan28-Documents-GitHub-pangantara` |
| `mbg-kdmp-documents` | `-Users-priyankaalfatehan28-Documents-GitHub-mbg-kdmp` |
| `Betutu-Sambe-documents` | `-Users-priyankaalfatehan28-Documents-GitHub-Betutu-Sambe` |
| `gemah-ripah-documents` | `-Users-priyankaalfatehan28-Documents-GitHub-gemah-ripah` |
| `worth-it` | `-Users-priyankaalfatehan28-Developer-worth-it` |
| `worth-it-documents` | `-Users-priyankaalfatehan28-Documents-GitHub-worth-it` |
| `scratch-*` | folder kerja sementara aplikasi Claude |

## Artefak

| Folder | Artefak lama | Jenis |
| --- | --- | --- |
| `artefak/usulan-sistem-satu-pintu-bnpb/usulan.md` | Usulan Sistem Satu Pintu Data Kebencanaan BNPB dan BPBD dengan AI Internal | Docs (3 diagram tertanam tidak ikut terekspor) |
| `artefak/command-center-karhutla/` | Command Center Karhutla | HTML |
| `artefak/tarikan-kampus-koordinator-bnpb/` | Tarikan Kampus Koordinator BNPB | HTML |
| `artefak/buku-pegangan-pantau-bencana/` | Buku Pegangan Pantau Bencana | HTML |
| `artefak/elemen-grafis-bnpb/` | Elemen Grafis BNPB | HTML |
| `artefak/tren-logbook-pusdalops/` | Tren Logbook Pusdalops 2011–2022 | Dashboard: halaman + 4 CSV + definisi dataset |
| `artefak/design-system-bnpb/` | BNPB (sistem desain deck) | Design System: README, token, komponen (gambar logo/elemen tidak ikut) |
| `artefak/design-system-centurisk97/` | Centurisk97 (sistem desain web) | Design System: README, token, komponen |

Dua artefak kosong tidak disalin: "CV Lengkap: Database Track Record" (hanya judul)
dan "Command Center Karhutla: Fitur Operator" (tanpa isi).

## Memulihkan memori di mesin atau akun baru

Memori lokal Claude Code tidak ikut akun, tapi bila `~/.claude/` kosong, salin
balik satu proyek begini (contoh repo ini):

```bash
mkdir -p ~/.claude/projects/-Users-priyankaalfatehan28-Developer-poskokarhutla/memory && cp -R .claude/cadangan-akun/memori/poskokarhutla/. .claude/cadangan-akun/memori/poskokarhutla-documents/. ~/.claude/projects/-Users-priyankaalfatehan28-Developer-poskokarhutla/memory/
```

Kedua folder sama-sama punya `MEMORY.md`; perintah di atas menimpa yang pertama,
jadi gabungkan baris indeksnya setelah menyalin.

Standar global: `cp .claude/cadangan-akun/global/*.md ~/.claude/`.
