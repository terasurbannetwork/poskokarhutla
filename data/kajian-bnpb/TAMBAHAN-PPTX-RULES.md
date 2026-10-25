# Tambahan dari skill alfatehan-pptx-rules untuk deck kajian

Dinilai 23 Okt 2026 terhadap Buku Pegangan bab Selera presentasi (PPT). Buku Pegangan
menang bila bentrok. Berkas ini dilebur ke Buku Pegangan, PEDOMAN-DESAIN.md, pembangun
PPTX, dan `qa/` pada tahap penggabungan.

## Dipakai

| No | Aturan skill | Penerapan di deck kajian | Diperiksa oleh |
| --- | --- | --- | --- |
| 1 | Satu pesan kunci per deck, garis besar satu baris per slide sebelum membangun | Tiap deck punya satu kalimat pesan kunci di spek deck; spek berisi judul + pesan + visual per slide (ghost deck) sebelum render | spek deck JSON wajib berisi `pesan_kunci` dan `pesan` tiap slide |
| 2 | Slide master dulu (kepala, kaki, nomor) | Sudah: master dari deck BNPB pemilik | qa: semua slide memakai layout master yang sama |
| 3 | Variasi tata letak, jangan dua slide berurutan bertata letak sama | Urutan tipe slide di spek tidak boleh mengulang tipe yang sama berturut-turut (kecuali lampiran tabel) | qa: tipe slide berurutan |
| 4 | Tiap slide punya unsur visual (grafik, peta, ikon, bentuk) | Tidak ada slide teks saja | qa: tiap slide memuat minimal satu gambar, tabel, atau kelompok bentuk |
| 5 | Ikon PNG asli, bukan simbol Unicode; nol emoji | Sudah sejalan (ikon garis dalam lingkaran) | qa: glif di luar cmap Roboto, emoji |
| 6 | Paling banyak 6 butir per daftar, ideal 3–4; paling banyak 2 tingkat | Berlaku untuk daftar di panel; pita bawah tetap 3–4 kolom | qa: hitung butir per kotak teks |
| 7 | Tiap angka bersumber dan bertahun di slide | Satu baris "Sumber: …" 7,5 pt 6B7280 di zona catatan kaki tiap slide analisis (pola Buku Pegangan untuk slide analisis); tidak memasang baris sumber di bawah tiap grafik (dihapus pemilik di d5) | qa: slide berangka tanpa baris Sumber ditolak |
| 8 | Grafik native (bisa disunting), bukan gambar | Grafik batang, garis, dan tabel di PPTX dibuat dari bentuk/tabel native seperti deck pemilik; PNG hanya untuk peta dasar, foto, logo, ikon | qa: gambar raster di slide hanya dari daftar izin (peta, foto, logo, ikon) |
| 9 | Kata terlarang khas AI | Ditambahkan ke ANTI-SLOP.md dan `qa/slop.py` dalam padanan Indonesia: komprehensif (sebagai hiasan), memanfaatkan/mendayagunakan (bila "memakai" cukup), tangguh/kokoh/robust (sebagai hiasan), mulus/seamless, menavigasi, krusial, esensial, mendalami/menyelami, memulai perjalanan, mendorong/memupuk (foster) tanpa objek terukur, sangat penting/pivotal, transformatif; versi Inggris juga | qa/slop.py |
| 10 | Nol tiga-serangkai; em dash paling banyak 1 per slide | Lebih ketat dari skill: em dash nol (Buku Pegangan), tiga-serangkai dilarang | qa/slop.py, periksa.py |
| 11 | Margin minimal 0,5 inci | Sudah: margin 43,2 pt | qa: kotak di luar 36 pt dari tepi |
| 12 | Laporan QA per deck (font, ikon, tata letak, anti-AI lulus/gagal) | `qa/periksa.py` mengeluarkan laporan per deck dan per DOCX dalam format itu | keluaran qa |
| 13 | Render ke gambar, periksa visual, perbaiki, periksa ulang | Sudah jadi alur kerja (Buku Pegangan Alur kerja langkah 3–4) | penyerahan |

## Tidak dipakai (bentrok dengan keputusan pemilik)

| Aturan skill | Keputusan pemilik yang berlaku |
| --- | --- |
| Judul 36–44 pt | Judul 19–26 pt, paling banyak dua baris (Buku Pegangan, Judul) |
| Isi 14–16 pt, keterangan 10–12 pt | Skala padat deck BNPB: isi 7,2–11 pt, batas bawah 6 pt; slide 180–290 kata |
| Jarak antarblok 0,3–0,5 inci | Jarak kartu 7,2 pt, antarpanel 10,8 pt, antargrup 21 pt |
| Jangan ada garis di bawah judul | Garis 0,75 pt selebar isi di bawah judul adalah kerangka rumah BNPB; yang dilarang adalah garis aksen pendek berwarna |
| Mesin PptxGenJS | Pembangun memakai templat XML deck pemilik agar master identik; prinsip native tetap dipakai |
