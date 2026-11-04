# Paparan Ajuan Program Kerja Sama BNPB dengan ITB (4 Nov 2026)

Deck percontohan per kampus (ITB) untuk kunjungan kampus. Dibangun dengan mesin ppt-konsultan.

## Berkas

| Berkas | Isi |
| --- | --- |
| `Paparan Kerja Sama BNPB dengan ITB 041126 (rev5).pptx` / `.pdf` | Rev5: desain bawaan ppt-konsultan, lolos gerbang render |
| `Paparan Kerja Sama BNPB dengan ITB 041126 (rev6-wip).pptx` / `.pdf` | Rev6 setengah jadi (lihat status di bawah) |
| `itb-rev5.png`, `itb-rev6-wip-1.png` | Pratinjau slide |
| `tangkapan-layar/` | Tangkapan layar sistem BNPB (karhutla, banjir, direktori) |

Sumber spek dan modul mesin ada di skill lokal (bukan di repo ini):
`~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-kampus/spek/bangun_spek_kunjungan.py`
dan `~/.claude/skills/ppt-konsultan/bnpb/scripts/visual/` (`kartu_ikon.py`, `profil.py`, `organogram.py`, `peta.py`).

## Rev6: sudah dikerjakan

- Sampul empat foto ITB (Commons, A2613, CC BY-SA 4.0); judul "Ajuan Program Kerja Sama BNPB dengan Institut Teknologi Bandung".
- Slide 3: judul baru; "Mengapa kampus?" dan "Bagaimana kolaborasi BNPB dengan kampus?" sebagai dua kartu; teks Riset, Pendidikan, Pengabdian, dan butir kolaborasi sesuai arahan; "Satu pintu" dan "Pengakuan bersama" dihapus.
- Slide 6: perkenalan gaya CV (lajur navy berfoto, ringkasan profil, pendidikan, pengalaman, organisasi).
- Teknologi BNPB jadi tiga slide (1/3 karhutla, 2/3 banjir dan longsor dengan banjir2/banjir3, 3/3 direktori dengan dir2/dir3).
- Hapus slide risiko wilayah (lama 11) dan slide contoh kampus plus rujukan internasional (lama 14).
- Kondisi aktual: satu bagian BNPB dan satu bagian kampus, judul "Pemetaan Sumber Daya Stakeholder", tanpa Jangkauan BNPB.
- Riset ITB: judul "Riset dan inovasi kebencanaan yang dimiliki oleh ITB".
- Kondisi ideal: "Pemetaan Kebutuhan", teks dan "Disaster Awareness" sesuai arahan.
- Kesenjangan: ikon per aspek di tabel, ditambah satu slide versi kartu (untuk dipilih, lalu dihapus manual salah satunya).
- Kebutuhan: judul "Enam kebutuhan untuk pelaksanaan program".
- Lima program: kartu berfoto bergradasi dengan butir bentuk kegiatan, tanpa pita "Satu ekosistem"; judul slide program "Program n: nama".
- Manfaat: judul "5 manfaat yang didapatkan oleh kampus", pita "Yang tidak berubah" dihapus.
- Tindak lanjut: empat langkah berkartu (tim ad hoc, pembahasan program, MoU dan Studium Generale, pelaksanaan), tanpa tujuan dan penanggung jawab.

## Rev6: belum selesai

- QA T-7: dua butir kartu di slide Program 4 beririsan tipis (sedang diperbaiki di modul `kartu_ikon.py`).
- QA S-22: judul "Mengapa kampus?" dan "Bagaimana kolaborasi BNPB dengan kampus?" ditandai pertanyaan retoris; dipertahankan sesuai arahan pemilik, menunggu keputusan.
- Judul seri teknologi diberi akhiran topik (karhutla, banjir dan longsor, direktori pakar) karena gerbang S6 menolak tiga judul kembar.
- Belum ada pemeriksaan ulang oleh pengulas bersih.
