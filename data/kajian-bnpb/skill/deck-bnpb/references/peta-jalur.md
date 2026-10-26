# Peta jalur: repo poskokarhutla ke skill deck-bnpb

Teks yang disalin dari repo menyebut jalur repo. Di skill ini jalurnya menjadi:

| Jalur di teks salinan | Di skill | Catatan |
| --- | --- | --- |
| `data/kajian-bnpb/` (akar kajian, "AKAR") | akar proyek: `--akar` atau `DECK_AKAR`; bawaan `assets/proyek-contoh/` | tempat `tema.json`, `pustaka.json`, `data/angka.json`, CSV, peta, foto |
| `data/kajian-bnpb/bangun/pptx/deck.py` | `scripts/deck.py` | pembangun spek ke PPTX dan PDF |
| `data/kajian-bnpb/bangun/pptx/periksa.py` | `scripts/periksa.py` | gerbang deck, laporan QA S39, uji diri 44 fixture |
| `data/kajian-bnpb/bangun/pptx/ikon.py` | `scripts/ikon.py` | glif dibaca dari `scripts/glif.json`, bukan `bangun/visual/ikon.mjs` (tanpa Node) |
| `data/kajian-bnpb/bangun/pptx/templat/templat-bnpb.pptx` | `assets/templat-bnpb.pptx` | deck pemilik 221026 (d3), master dan layout PUTIH/GELAP |
| `data/kajian-bnpb/bangun/pptx/contoh/spek-*.json` | `assets/proyek-contoh/spek/spek-mitigasi.json`, `spek-uji-air.json` | spek uji diri |
| `data/kajian-bnpb/bangun/pptx/contoh/peta_irbi.py` | `scripts/peta_irbi.py` | perender peta SVG ke PNG, keluaran `<akar>/peta/` |
| `data/kajian-bnpb/keluaran/update-231026/peta_jawa.py` | `scripts/peta_jawa.py` | peta Jawa 5 kelas nilai |
| `data/kajian-bnpb/bangun/kontrak/tema.py`, `naskah.py` | `scripts/tema.py`, `scripts/naskah.py` | pemuat tema, resolver token `{{angka:...}}` |
| `data/kajian-bnpb/qa/periksa.py` | `scripts/qa_periksa.py` | gerbang repo D-n dan T-n (yang dipakai deck: D-1 sampai D-6, D-9, D-10, D-14, D-16, D-17, D-22, D-23, T-2, T-4, T-6, T-7, T-8) |
| `data/kajian-bnpb/qa/slop.py` | `scripts/slop.py` | detektor S-1 sampai S-43, ambang anti-AI |
| `data/kajian-bnpb/qa/cakupan.json` | `scripts/cakupan.json` | registri cakupan gerbang |
| `data/kajian-bnpb/riset/anti-slop/banned-ai-words.txt` | `scripts/banned-ai-words.txt` | 182 kata terlarang khas AI (Inggris) |
| `data/kajian-bnpb/bangun/NASKAH-SPEK.md` | `references/NASKAH-SPEK.md` | dialek naskah, token angka (bagian 8), spek deck (bagian 17) |
| `data/kajian-bnpb/tema.json` | `assets/proyek-contoh/tema.json` | logo menunjuk `logo/sumber-bnpb.png` |
| `data/kajian-bnpb/data/angka.json` | `assets/proyek-contoh/data/angka.json` | registri contoh: 216 kunci yang dipakai tujuh spek contoh |
| `data/kajian-bnpb/data/glosarium.json` | `assets/proyek-contoh/data/glosarium.json` | istilah terlarang D-10 |
| `public/img/kredit.json` | `<akar>/kredit.json` | atribusi foto Commons `[{file, penulis, lisensi}]` |
| `public/img/lembaga/sumber-bnpb.png` | `<akar>/logo/sumber-bnpb.png` | logo BNPB resmi |
| `public/vendor/roboto/` | `assets/fonts/` | Roboto Regular, Medium, Bold (Apache 2.0) |
| `public/geo/` | `<akar>/geo/` | batas kab/kota dan provinsi (asal belum terdokumentasi, bukan rujukan resmi) |
| `../../public/img/X.jpg` di spek | `foto/X.jpg` | spek contoh sudah ditulis ulang |
| `keluaran/qa/deck-<nama>.md` | `<folder PPTX>/qa/deck-<nama>.md` | laporan QA deck |
| `docs/buku-pegangan/pantau-bencana.md` | `references/selera-presentasi.md`, `pola-konsultan.md`, `angka-dan-copy.md`, `keputusan-pemilik.md` | |
| `data/kajian-bnpb/PEDOMAN-DESAIN.md` | `references/pedoman-desain-deck.md` | bagian yang berlaku untuk deck |
| `data/kajian-bnpb/ANTI-SLOP.md`, `TAMBAHAN-ANTI-AI.md` | `references/anti-slop.md` | |
| `data/kajian-bnpb/KEPUTUSAN.md`, `TAMBAHAN-PPTX-RULES.md` | `references/keputusan-pemilik.md`, `references/pola-konsultan.md` | |
| `data/laporan-bnpb/...` | `references/deck-operasional.md` | generator operasional tidak dibawa (butuh data situs langsung) |

Yang dirujuk teks tetapi tidak dibawa, dan kenapa:

| Jalur | Alasan |
| --- | --- |
| `data/kajian-bnpb/riset/desain-benchmark/deck/` (`mbb/png/...`, `big4/png/...`, `SINTESIS-DECK.md`) | bukti bedah deck konsultan berhak cipta pihak lain; vonisnya sudah tertulis di `pola-konsultan.md` |
| `data/kajian-bnpb/KERANGKA.md` (190 KB) | isi dua kajian; garis besar slide yang dipakai sudah ada di `pedoman-desain-deck.md` B7.4 dan B7.5 |
| `bangun/visual/` (render.mjs, uji.mjs) | gerbang gambar DOCX (D-8, D-21, D-28 untuk `--visual`); deck memakai PNG peta + manifest perender, diperiksa `deck.py` |
| `bangun/kamus/id/` | kamus hunspell untuk T-10 (ejaan naskah DOCX); bukan gerbang deck |
| `data/laporan-bnpb/generator/` | butuh `FIRMS_MAP_KEY`, data situs centurisk97.id, Node + Playwright |
