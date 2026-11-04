---
name: selera-tabel-ui
description: "Aturan tampilan tabel & kartu yang pemilik tegur berulang (24 Sep 2026, Gemah Ripah); berlaku di semua proyek"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 5bbdd857-6372-483b-abe6-be916858611d
  modified: 2026-09-29T06:37:35.187Z
---

Pemilik menegur keras dan berulang soal hal-hal ini saat review Gemah Ripah (24 Sep 2026):

- **Nol teks terpotong "…"** di sel tabel.
- **Semua terlihat dalam satu tampilan** (27 Sep 2026, "gw udah bilang gw mau semua terlihat dalam satu tampilan"): tabel harus muat tanpa geser di 1280px; kolom kategori jadi ikon (`IkonDeret`, slot tetap, satu kolom "Status"), kolom sekunder pindah ke detail (rincian baris / modal / title / lembar Excel-PDF); geser samping hanya cadangan layar sempit, dan di situ kolom Nama (sesudah No) ikut menempel. Gerbang: `tests/unit/gerbang-kolom-tabel.test.ts` (>12 kolom tampak gagal kecuali dikecualikan beralasan).
- **Sel tabel tidak pernah dua baris.** Satu-satunya pengecualian `sel-bungkus` untuk teks bebas panjang (Keterangan/Catatan), berlebar maksimal; Alamat di daftar master pindah ke rincian (membungkus = baris tinggi).
- **Tempo = ikon**: tunai/0 hari 💵 (`SelTempo`, `IKON_TEMPO_BAYAR`) + legenda, tempo > 0 angka hari; tidak pernah kata "Tunai".
- **Filter dropdown grid 4 kolom** (2 tablet, 1 HP) di BarFilter bersama, rentang tanggal & tombol kosongkan ikut petak grid; placeholder "Semua <nama label>" (Tipe → "Semua tipe").
- **Setiap ikon di tabel wajib masuk legenda, TERMASUK ikon kolom Aksi** (27 Sep 2026, Pipeline: "aksinya kenapa ga ada lagendanya").
- **Nol tab "Semua" di strip status/proses** (28 Sep 2026): urutan = urutan proses (Draf → Dikirim → Selesai → Batal), default = tahap paling awal yang berisi.
- **Warna solid, bukan gradien** (28 Sep 2026): kepala/kaki tabel, tombol, tab aktif satu warna hijau hutan; kolom sticky persis sewarna. Garis baris grup melintang penuh ujung ke ujung.
- **Setiap opsi tab/sakelar/mini tab wajib berikon** (27 Sep 2026: "Kasih icon").
- **Ikon FORMAL** (29 Sep 2026, "masa gelas wine gitu", "anak ayam... Geleuh"): nol ikon pesta/minuman (🥂🍾🎉), makhluk imut (🐣🐥), gestur lucu (🙅🫰). Simbol netral atau benda harfiah domainnya. Kanon peraturan 126, gerbang daftar hitam di ikon-registri.test.ts. Diperluas hari yang sama ("sangat tidak professional", menunjuk 🙅 👌 🫂): SEMUA gestur tangan & orang bergestur haram (👌👍✋🫴🤝✍️👆🙋🫂👣), ikon peran/pekerjaan (👷🧑‍💼) tetap boleh; gerbang "emoji gestur tangan" menyapu registri + literal kode.
- **Nol slider/gulir samping di deret tile popup** (29 Sep 2026, "gw kan udah bilang gamau ada yang slider ... kalo mau pop up nya aja yang dilebarin"): kalau tile tidak muat, LEBARKAN popup (max-w-5xl), jangan biarkan DeretKpi menggulir.
- **Popup profil**: ikon status sebaris nama di kepala (titleBadge), blok isi (Ringkasan, Kontak, CRM, riwayat) = kartu lipat.
- **Legenda tidak mengulang label baris grup** (29 Sep 2026, "gausah ada deh kan udah ada tulisannya di kategori"): ikon segmen/pasar yang menempel di baris grup bertulisan tidak masuk legenda. Kanon peraturan 127.
- **Status = ikon polos** (tanpa teks, tanpa pil/latar) + `LegendaTabel` di kaki tiap tabel, SEMUA legenda SATU BARIS (label dipendekkan, pemisah antar grup); mengalahkan aturan kanon lama "grid 2 baris untuk >7 entri".
- **Uang: "Rp" rata kiri, angka rata kanan** (RpTd/RpCell) di semua tabel termasuk total. BERLAKU JUGA DI KERTAS/PDF (ditegur kasar 3 Okt 2026, "Lu catet lah"): dokumen cetak lewat `NilaiDok` di components/cetak/Dokumen.tsx (tabel, total, BlokTotal, DaftarInfo); jangan render fmtRp di luar komponen itu.
- **Baris grup/subtotal juga**: subtotal diisi di bawah kolomnya sendiri (RpCell), bukan teks "4 order · Rp x" di ujung kanan; NOL hitungan (jumlah order/faktur/belum lunas) di baris grup & footer, ikon pun tidak; grup tanggal = per minggu; baris grup warna muda seragam, SELURUH baris bisa diklik untuk lipat.
- **Semua isi yang bertumpuk harus lurus vertikal**: tanggal di SEMUA kolom tabel & label grup pakai slot lebar tetap (hari rata kanan 2ch, "Sep" segaris) (hari, "–", bulan, tahun masing-masing segaris), tabular-nums. Label grup tanpa "Minggu 38", cukup "14–20 Sep 2026".
- **Desimal seragam per kolom**: kalau satu angka pakai koma, yang sejenis di kolom itu juga (kg 605,00 / 342,22), atau semua tanpa koma. Persen selalu 1 desimal.
- **Grafik**: palet pastel terang (biru/pink/toska/oranye), bukan hijau-emas redup ("tua banget"). Kontrol seri & bentuk satu gaya, sebaris di kanan.
- **Data berbaris = tabel, bukan grid kartu** (mis. Cocokkan mutasi: mutasi jadi baris grup, kandidat SO jadi baris anak, aksi ikon).
- **Ikon harmonis**: satu registri konsep→ikon (satu ikon tidak pernah dua arti), ukuran kotak seragam per konteks, ikon aksi SVG satu stroke/ukuran, Excel/PDF segaya ikon toolbar lain.
- **Satu tabel per tampilan**: pengelompokan lewat baris grup lipat DI DALAM satu tabel (satu header, satu legenda, satu total), bukan kartu/container terpisah per kelompok.
- **Satuan dan nomor lama jadi kolom sendiri**, tidak ditempel di sel lain.
- **Nol lencana hitungan** di kepala kartu/wadah lipat ("11 barang", "15"). Hanya di tab boleh.
- **Tile KPI sebaris mengisi penuh lebar kartu** (27 Sep 2026, "jangan ada white space"): tidak ada ruang kosong di kanan; tile tanpa data (mis. "belum diopname") dihapus, bukan ditampilkan "—".
- **Nol filter Aktif/Arsip** di halaman daftar (27 Sep 2026); arsip hanya dilihat di Admin. Filter toggle yang cuma MENYARING isi tabel yang sama (Semua/Termurah/Berkontrak, filter Daftar/Pipeline pelanggan) berulang kali ditolak ("gausah ada filter ini"): cukup search + ikon kolom berlegenda. Mini tab hanya untuk memisah jenis data/tampilan yang beda.
- **Tiap tab berisi tabel wajib CariExportBar lengkap** (search + Excel + PDF); toolbar Excel/PDF tanpa search = pelanggaran.
- **Ringkasan/KPI satu warna putih** dalam container "Ringkasan"; tanpa pastel warna-warni.
- **Setiap tombol Excel berpasangan dengan PDF**, dan letaknya SEBARIS dengan search bar (toolbar halaman), tidak pernah di dalam kartu Ringkasan/KPI. Ringkasan = container lipat berikon seperti kartu lain, DEFAULT TERTUTUP, dan tiap halaman daftar wajib punya satu. Tombol tambah = ikon plus putih saja.
- **Semua kolom bisa di-sort**; tabel berkategori wajib grup lipat (default tertutup).
- **Baris rapat** (density tinggi), tulisan tabel kecil (12px, 11px di ≤1280px), nama tidak bold, kode dalam pil rapi (bukan monospace).
- **Palet tidak boleh krem di atas krem**; latar netral terang, input putih ber-ring.
- **Toolbar = search + ikon (folder/Excel/PDF/+) saja.** Filter/toggle/dropdown (Aktif/Arsip/Semua, kelompok, "Semua barang"/"Semua tipe") jadi mini sub-tab full width di baris sendiri DI BAWAH toolbar, bukan segmented kecil di samping search.
- **Form input**: tinggi seragam, gap grid jelas, nol tumpang tindih, tanpa teks kecil "(opsional)"; entri massal (opname) = lembar hitung berbentuk tabel semua barang, bukan form satu baris.
- **Label input di ATAS input**, jangan floating label yang menumpuk nilai.
- **Alamat yang cuma negara/wilayah ("Indonesia", "Bangli") = kosong** (`lib/alamat.ts`): tampil "—" redup + saringan "Alamat belum lengkap"; jangan menebak alamat, titik dari link Google Maps (PanelLinkMaps).

**Why:** pemilik memakai app seharian dan menilai dari tampilan; tiap pelanggaran di atas memicu teguran kasar dan kerja ulang.
**How to apply:** jadikan checklist wajib sebelum menyerahkan UI apa pun; lebih baik satu komponen tabel bersama + gerbang mekanis daripada per halaman. Lihat juga [[kanon-selera-pinka]].
- **Dokumen cetak (3 Okt 2026)**: kepala tabel SELALU rata tengah; tabel bersudut bulat; qty selalu dua kolom Jumlah | Satuan (tak pernah "160 krat" satu sel); alamat berikon 📍, telepon berlogo WA (SVG WaIcon, bukan emoji), tanpa kata "Telp/WA"; nomor SO tidak patah baris; isi daftar barang berpoin.
- **Isian bertipe angka hanya menerima angka** (3 Okt 2026, "Lu pastikan diri lu pintar ya untuk bisa paham gini-an"): NPWP, no. rekening, NIK, dsb. pakai `hanyaAngka`/`fmtNpwp` (lib/format.ts) + inputMode numeric. Gerbang `gerbang-isian-angka.test.ts`. Pilihan yang daftarnya baku (bank) = dropdown (`PilihBank`), bukan ketik bebas. Pikirkan tipe data tiap isian SEBELUM pemilik menemukannya.
- **Nol label berbentuk tulisan** (3 Okt 2026, "Gw gamau ada label yang bentuknya tulisan. Agar semua pakai icon"): chip teks di registri ikon dicabut (gerbang `gerbang-ikon-formal` "nol chip teks"); "baru" = 🆕; kepala kolom kategori (segmen) = ikon + legenda; kategori yang berulang per baris lebih baik jadi sub-grup lipat daripada kolom sendiri.
