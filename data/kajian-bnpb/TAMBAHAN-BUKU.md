# Tambahan dari skill book-production-rules untuk dua kajian

Dinilai 23 Okt 2026. Kajian ±110 dan ±150 halaman setara buku nonfiksi akademik
(±40–60 ribu kata), jadi disiplin produksi buku relevan. Dilebur ke pembangun DOCX,
`qa/`, dan alur penulisan.

## Dipakai

| No | Insight skill | Penerapan | Diperiksa oleh |
| --- | --- | --- | --- |
| 1 | Kepadatan pustaka (min. 20 sumber per 50 ribu kata) | Lantai lebih tinggi untuk kajian kebijakan: kajian mitigasi ≥ 80 sumber, kajian air ≥ 50 sumber; ≥ 50% sumber resmi atau primer; tiap bab ≥ 8 sumber berbeda | qa: hitung entri pustaka.json yang benar-benar dirujuk per bab |
| 2 | Penegak konsistensi istilah (glosarium + pindai penyimpangan) | `glosarium.json`: istilah baku, singkatan (dieja lengkap pada kemunculan pertama per bab), varian terlarang (mis. "pra bencana" → "prabencana", "Karhutla" di tengah kalimat → "karhutla", "BMKG" tanpa kepanjangan pertama, "air bersih" vs "air minum" sesuai definisi BPS, nama K/L lama) | qa: pindai varian terlarang dan singkatan tanpa kepanjangan |
| 3 | Mesin pemenggalan kata ID | Teks rata kiri-kanan butuh pemenggalan supaya tidak ada "sungai" spasi lebar. DOCX diberi bahasa `id-ID` di semua gaya dan `autoHyphenation`; LibreOffice di mesin ini tidak punya pola pemenggalan Indonesia, jadi pola `hyph_id_ID` dari repositori kamus LibreOffice dipasang ke profil pengguna sebelum ekspor PDF | render: tidak ada baris rata kiri-kanan dengan celah antarkata > 3 kali normal (cek dari PDF) |
| 4 | Pemeriksa ejaan | Kamus `id_ID` (repositori kamus LibreOffice) dipakai lewat pustaka Python hunspell murni (`spylls`) di venv; kata yang tidak dikenal dan bukan istilah glosarium/nama diri dilaporkan | qa: daftar kata tak dikenal per bab, wajib nol sebelum serah |
| 5 | QA berlapis: ejaan, tata bahasa, fakta, nada, panjang | Lima lapis berurutan: (a) penulis memeriksa sendiri, (b) penyunting substansi (cek fakta tiap angka ke angka.json dan sumber), (c) penyunting bahasa (KBBI/PUEBI, anti-slop), (d) proofread pada PDF hasil render dengan mata baru, (e) gerbang mekanis | laporan per lapis di `keluaran/qa/` |
| 6 | Penyuntingan struktural (buang kalimat mati, perkuat pembuka bab) | Tiap bab dibuka dengan kotak ringkasan bab (3–4 temuan berangka) dan diakhiri implikasi untuk BNPB; paragraf tanpa angka/sumber/keputusan dipotong | penyunting substansi |
| 7 | Pembatas bab | Tiap bab dibuka halaman pembatas: nomor bab besar, judul, foto Commons beratribusi, 2–3 pertanyaan yang dijawab bab itu | pembangun DOCX |
| 8 | Bagian depan dan belakang lengkap | Ditambah sampul belakang (logo BNPB, alamat, satu paragraf ringkas kajian); halaman hak/keterangan terbitan (judul, penerbit BNPB, tahun, tanggal batas data, cara mengutip) | pembangun DOCX |
| 9 | Metadata | Properti dokumen DOCX/PDF/PPTX: judul, penerbit BNPB, subjek, kata kunci, bahasa id-ID; PDF bertanda buku (bookmark) dari judul bab dan subbab untuk navigasi | qa: baca properti inti dan outline PDF |
| 10 | Pratinjau cetak sebelum serah | Proofread lapis (d) dilakukan pada render halaman utuh, bukan pada Markdown | penyerahan |

## Tidak dipakai

| Insight skill | Alasan |
| --- | --- |
| Garamond 11 pt | Keputusan pemilik: Roboto |
| ISBN, BISAC, ebook, rencana pemasaran | Bukan buku dagang; dokumen kebijakan BNPB |
| Pembaca beta 3–5 orang sungguhan dan persetujuan pemilik tiap fase | Pemilik meminta hasil final tanpa memeriksa; fungsi pembaca beta dijalankan penyunting independen di lapis (b)–(d) |
