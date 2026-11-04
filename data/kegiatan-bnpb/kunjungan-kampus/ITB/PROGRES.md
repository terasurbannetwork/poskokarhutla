# Paparan Ajuan Program Kerja Sama BNPB dengan ITB (4 Nov 2026)

Deck percontohan per kampus (ITB) untuk kunjungan kampus. Dibangun dengan mesin ppt-konsultan.

## Berkas

| Berkas | Isi |
| --- | --- |
| `Paparan Kerja Sama BNPB dengan ITB 041126 (rev5).pptx` / `.pdf` | Rev5: desain bawaan ppt-konsultan, lolos gerbang render |
| `Paparan Kerja Sama BNPB dengan ITB 041126 (rev6).pptx` / `.pdf` | Rev6: lolos gerbang render; T-4 masih gagal (lihat di bawah) |
| `rapor-rev6.md` | Rapor pemeriksa bersih rev6 (6 dimensi + 18 cacat) |
| `itb-rev5.png`, `itb-rev6.png` | Pratinjau slide |
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

## Rev6: diselesaikan 4 Nov 2026 malam

- Kartu slide Program 1-5 rusak di rev6-wip (huruf 18 pt di kolom sempit, kata terpotong "Mahas/iswa"), bukan cuma irisan tipis.
  Akar: `kartu_ikon._ukur` tidak menolak satu kata yang lebih lebar dari kotak. Ditambah `_kata_muat`; kartu utama Program jadi grid 2x2 (huruf_maks 18).
- Panel Program 4: "Melatih relawan, lalu menggerakkan satgas." (dipendekkan supaya ruang mati lolos D-39).
- Slide 19 kartu sampul: judul dan subjudul di atas foto dipatah per baris (`_patah`), tidak lagi teregang rata kanan-kiri dan keluar foto.
- Gerbang render lolos (T-7 hilang). Pembangunan di Windows: `PATH=.venv/Scripts:$PATH SOFFICE=".../LibreOffice/program/soffice.exe"` lalu deck.py --pdf.

## Rev6: menunggu pemilik

- QA T-4 (S-22): "Mengapa kampus?" dan "Bagaimana kolaborasi BNPB dengan kampus?" di slide 3 tetap ditolak gerbang. Pilihan: ganti jadi
  pernyataan (mis. "Alasan BNPB menggandeng kampus", "Bentuk kolaborasi BNPB dengan kampus") supaya lolos, atau pertahankan dan terima vonis GAGAL.
- Slide kesenjangan dua versi (15 tabel, 16 kartu): pilih satu, hapus yang lain.
- Rapor pemeriksa bersih: Judul 3, Grafik 3, Tata letak 2, Sumber 3, Alur 3, Rasa mahal 3 (serah butuh semua >= 4). Sebagian temuannya bertentangan
  dengan keputusan pemilik (rata kanan-kiri 3+ baris, judul "Pengaplikasian teknologi...", "Program n: nama", slide 16 duplikat sengaja), jadi
  tidak dikerjakan tanpa arahan. Yang bisa dikerjakan bila disetujui: label "12" di slide 4, huruf 6 pt bagan slide 7, tangkapan layar slide 8-10
  terlalu kecil, foto "Volkanologi digital" slide 13, ikon timbangan untuk "Surat tugas tim" slide 28, istilah Inggris (slide 3, 14, 19).
