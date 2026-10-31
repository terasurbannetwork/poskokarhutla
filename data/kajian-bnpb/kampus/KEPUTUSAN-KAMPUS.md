# Keputusan pemilik: Kemitraan Kampus (29–30 Okt 2026)

Dokumen pertama dalam urutan otoritas modul Kemitraan Kampus (AGENTS.md §2.2).
Menang atas semua dokumen lain di folder ini:

`KEPUTUSAN-KAMPUS.md` > `PRD.md` > `ALUR.md` > `ALGORITMA.md` > `PROFIL-DAERAH.md` >
`DESIGN-SYSTEM.md` > `DESAIN-TEKNIS.md` > `KEAMANAN-PRIVASI.md` > `RENCANA-UJI.md` > `TIKET.md`

Bila dua dokumen bertentangan atau sebuah hal tidak tertulis, pengerja BERHENTI dan
bertanya ke pemilik. Tidak memilih sendiri, tidak mengarang fitur.

Sumber: paparan "Grand Design Kemitraan BNPB dan Perguruan Tinggi 2027–2029"
(28 Okt 2026, 34 slide) dan percakapan pemilik 29–30 Okt 2026.

## A. Arah

1. **Platform adalah alat kerja Grand Design**, bukan pengganti grup WA. Yang cukup di WA
   (MoU seremonial, forum, jurnal, rapat) tidak dibangun.
2. **Kampus adalah lengan riset dan lapangan platform.** Masalah riset diambil dari data
   platform sendiri (model yang gagal uji, label lapangan yang kurang) dan dari daerah.
3. **Empat pilar + satu fondasi**:
   - Fondasi: Pintu Kampus (akun kampus, profil, arsip MoU/PKS, persetujuan anggota).
   - P1 Belanja Masalah Daerah (inti, dibangun pertama).
   - P2 Riset dan Inovasi Bersama untuk dana luar.
   - P3 Satgas Kampus Tanggap Bencana.
   - P4 Talenta dan Pendampingan Daerah (bawaan pilar ketiga, lihat T-A).
4. **Semua tiru yang sudah ada.** Rupa meniru `/akademisi` (centurisk97.id/akademisi).
   Relawan, riset, pengingat, meja kerja, profil wilayah, dan direktori pakar dipakai
   ulang, tidak dibuat kembar.
5. **Opus merancang, Sonnet/Haiku mengerjakan.** Tiket harus cukup rinci untuk dikerjakan
   tanpa menebak.

## B. Belanja Masalah Daerah (P1)

6. **BPBD dan unit BNPB "membelanjakan" masalah**: tiap daerah punya daftar masalah dan
   kebutuhan, dikelompokkan dan diprioritaskan.
7. **Daerah tidak datang kosong.** Sebelum pendataan, platform sudah menyusun profil daerah
   lengkap dari InaRISK/IRBI, riwayat kejadian bertahun-tahun, dan pemodelan platform.
   Tim pendataan datang membawa profil itu.
8. **Profil daerah lengkap semua bencana, satu tekan ikon jadi buku.** Semua bencana, semua
   sumber (InaRISK, IRBI, DIBI, model platform, BPS, dll.), sekomprehensif mungkin.
9. **Masalah dikategorikan** menurut InaRISK/IRBI dan riwayat kejadian.
10. **Rekomendasi pakar teratas per masalah**, lengkap dengan paper buktinya dan solusi
    tepat guna yang diambil dari risetnya. Algoritmanya tertulis dan bisa diperiksa
    (ALGORITMA.md).
11. **Generator pertanyaan**: apa yang harus diteliti, apa yang ditanyakan saat pendataan,
    dan ke mana arah pertanyaannya. Komprehensif, terisi angka profil daerah.
12. **Tim BNPB tetap melakukan pendataan lapangan.** Jawaban pendataan mengoreksi profil dan
    masalah, bukan sebaliknya.

## C. Riset dan Inovasi Bersama (P2)

13. **Tujuan utama: proposal bersama BNPB + kampus untuk menarik dana luar** (donor
    internasional, dana riset nasional, swakelola).
14. Fitur terpilih pemilik: kalender panggilan donor + pengingat; pencocokan otomatis
    masalah/program dengan donor; penyusun konsorsium (BNPB, kampus simpul, satelit, mitra
    luar negeri); siklus hibah (panggilan, proposal, penelaah, penilaian, pengumuman);
    pendaftaran inovasi kampus beserta TKT.
15. Agenda riset tahunan tersusun otomatis dari masalah prioritas.

## D. Satgas Kampus Tanggap Bencana (P3)

16. **Satgas per kampus beranggota tiga unsur**: perwakilan kampus, perwakilan mahasiswa,
    perwakilan alumni (Ikatan Alumni).
17. **Difasilitasi BNPB dan pihak yang membantu BNPB** (TNI, Polri, Basarnas, PMI, dll.).
    Platform tidak memerintah unsur mana pun; ia memberi satu gambaran: siapa di mana
    mengerjakan apa.
18. Fitur terpilih: satu tombol "aktifkan kampus" untuk satu kejadian; pakar siaga dipanggil
    sesuai bidang dan giliran jaga dengan konfirmasi kesediaan tercatat; tim kaji cepat dari
    pakar dan mahasiswa terlatih dengan formulir Jitupasna lapangan.

## E. Talenta dan Pendampingan (P4)

19. Fitur terpilih: pendaftaran magang di BNPB/BPBD (kuota, seleksi, penempatan, penilaian
    pembimbing); jejaring alumni yang bekerja di BPBD sebagai mentor; peta kampus, desa
    binaan, dan kab/kota dampingan dalam satu tampilan; pencocokan wilayah operasi BUMN
    dengan desa binaan dan korps relawan; bank modul dan RPS baku yang bisa diunduh.

## F. Fondasi Pintu Kampus

20. Profil kampus: pusat studi, prodi, pakar, fasilitas, wilayah binaan.
21. **MoU/PKS cukup diarsipkan** beserta pengingat masa berlaku. Tidak ada alur paraf atau
    tanda tangan digital.
22. **Siapa pun dari kampus boleh mendaftar, tetapi disetujui oleh peran di kampus**
    (koordinator kampus). Kampus sendiri disetujui BNPB.

## G. Rupa dan kerja

23. Rupa tiru `/akademisi`: token `inti/tema.css`, kelas `.ak-*`, pita navy, segmen tampilan,
    kartu, dialog/lembar, daftar pendek, paginasi. Bukan gaya `bnpb.css`.
24. Prinsip rumah tetap berlaku: angka jujur (uji dulu, label "belum diuji" bila belum),
    tiap angka bersumber dan bertanggal, data pribadi minimum, tidak ada kiriman otomatis
    ke luar (selalu ditekan manusia), batas Cloudflare Free, gaya A1–A25, tombol dummy
    🧪/🧹 untuk Super Admin.

## H. Pertanyaan terbuka (punya bawaan, tidak menghalangi kerja)

| Kode | Pertanyaan | Bawaan sementara | Dampak bila berubah |
| --- | --- | --- | --- |
| T-A | Pilar ketiga: Pendampingan Daerah atau Pemulihan Pascabencana? | Pendampingan Daerah (P4); pemulihan masuk P3 sebagai fase pascatugas | Tiket fase F berganti isi |
| T-B | Siapa boleh membaca buku profil daerah? | Akun saja (staf, BPBD, kampus). Edisi publik tanpa bab pakar menyusul | Rute buku dibuka publik |
| T-C | Boleh pakai LLM untuk meringkas solusi dari paper? | Tidak. Fase 1 ekstraktif (kalimat asli abstrak + tautan) | Tiket ALG-6 berganti |
| T-D | Data IKD (Kemendagri) | Diisi manual oleh staf/BPBD; tidak ada panen | Bila ada berkas resmi, tambah pipeline |
| T-E | BPBD masuk lewat apa? | Kode pribadi per kab (pola Meja Kerja), diterbitkan staf | Bila akun instansi (0029), ganti gerbang |
| T-F | Nama menu | "Kemitraan Kampus", rute `/kemitraan` | Ganti teks + rute |
| T-G | Surat dukungan BNPB untuk proposal | Platform hanya membuat draf + nomor registri; tanda tangan di luar sistem | – |
