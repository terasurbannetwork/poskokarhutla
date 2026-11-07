# Kunjungan kampus: Ajuan Program Kerja Sama BNPB dengan perguruan tinggi

Satu deck induk (ITB, rev6) diturunkan per kampus. Satu folder per kampus.

| Folder | Deck | Catatan |
| --- | --- | --- |
| `ITB/` | rev8 terbaru (`PROGRES.md` untuk riwayat rev6) | deck induk, Jakarta 4 Nov 2026 |
| `UGM/` | Paparan Kerja Sama BNPB dengan UGM 041126 | Yogyakarta, 4 Nov 2026 |
| `UII/` | Paparan Kerja Sama BNPB dengan UII 041126 | Yogyakarta, 4 Nov 2026 |
| `UNY/` | Paparan Kerja Sama BNPB dengan UNY 041126 | Yogyakarta, 4 Nov 2026 |
| `UMY/` | Paparan Kerja Sama BNPB dengan UMY 041126 | Yogyakarta, 4 Nov 2026 |
| `UPNVY/` | Paparan Kerja Sama BNPB dengan UPNVY 041126 | Yogyakarta, 4 Nov 2026 |
| `Tel-U/` | Paparan Kerja Sama BNPB dengan Telkom University 041126 | Bandung, 4 Nov 2026 (kode kampus `Tel-U`, kunci token `telu`) |

Kelima deck kampus Yogyakarta dibangun ulang 5 Nov 2026 mengikuti ITB rev8. Yang berbeda per kampus: sampul
dan penutup (judul, logo, empat foto kampus, kredit), slide 4 (wilayah kampus tujuan oranye, logo hanya kampus
yang dipaparkan; di wilayah Jawa Tengah dan DIY kampus tujuan disebut setelah UGM dan dua contoh rev5 masuk
hitungan "kampus lainnya", diasumsikan kampus tujuan termasuk kampus sekitar rev5), foto latar lajur profil
slide 6 (foto sampul kampus; foto gedung BNPB belum ada), slide 13 riset dan inovasi kampus, dan foto kartu
Program 1, 3, 4 di slide 19. Slide lain sama dengan ITB rev8.

`bahan-kampus.json` di tiap folder = salinan `kampus/<KODE>/data.json` di skill: URL sumber tiap riset,
lisensi foto, dan catatan hal yang belum terverifikasi.

## Membangun ulang (Windows)

Spek dan bahan ada di skill lokal, bukan di repo:
`~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-kampus/` (`spek/bangun_spek_kunjungan.py`, `kampus/<KODE>/`).
Bangun satu per satu (pembangun spek menulis `tema.json` dan registri angka bersama):

```bash
cd ~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-kampus
export PYTHONUTF8=1 KAMPUS=UGM PATH="$(cd ../../.venv/Scripts && pwd):$PATH" SOFFICE="/c/Program Files/LibreOffice/program/soffice.exe"
python spek/bangun_spek_kunjungan.py
python ../../scripts/deck.py spek/kunjungan-ugm-041126.json "out/ugm/Paparan Kerja Sama BNPB dengan UGM 041126.pptx" --pdf --akar .
```

Kampus baru: isi `kampus/<KODE>/data.json` dengan skema yang sama (logo, empat foto kampus, empat riset,
tiga peluang), lalu jalankan dengan `KAMPUS=<KODE>`.

## Review bersih

`rapor-lima-kampus.md` ditulis sebelum perbaikan terakhir. Sudah dibetulkan sesudahnya: provinsi oranye di
peta (dulu tetap Jawa Barat), label kampus tambahan yang menempel ULM, klaim "tiltmeter, bertenaga surya"
(UGM), dan rincian parit paleotsunami (UPNVY). Belum dibetulkan, menunggu bahan dari pemilik atau kampus:
foto riset yang berisi orang berpose atau acara (UII, UNY, UMY, UPNVY), foto sampul UPNVY dari laman kampus
tanpa lisensi terbuka, gambar kartu 4 UPNVY berupa tangkapan unggahan, dan foto kredit ANTARA (UII kartu 1).

## Status gerbang

Semua deck lolos gerbang render. Satu temuan masih gagal di semua deck termasuk ITB: S-22, judul
"Mengapa kampus?" dan "Bagaimana kolaborasi BNPB dengan kampus?" di slide 3 (menunggu keputusan pemilik).
