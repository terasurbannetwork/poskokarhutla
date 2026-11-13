# Catatan penyusunan naskah MoU program kerja sama perguruan tinggi (2 Nov 2026)

| Naskah | Berkas | Pasal | Halaman | Kepala |
|---|---|---|---|---|
| NK payung BNPB dan Kemdiktisaintek | `Draf NK BNPB dan Kemdiktisaintek 021126.docx/.pdf` | 15 | 8 | Logo BNPB dan logo Kemdiktisaintek |
| NK BNPB dan BRIN | `Draf NK BNPB dan BRIN 021126.docx/.pdf` | 15 | 7 | Logo BNPB dan logo BRIN |
| Templat NK BNPB dan Perguruan Tinggi | `Templat NK BNPB dan Perguruan Tinggi 021126.docx/.pdf` | 14 | 7 | Logo BNPB dan logo kampus |
| Templat Perjanjian Kerahasiaan (NDA) BNPB dan Perguruan Tinggi | `Templat Perjanjian Kerahasiaan BNPB dan Perguruan Tinggi 131126.docx/.pdf` | 17 | 7 | Logo BNPB dan logo kampus |

Diselaraskan 12 Nov 2026 dengan deck baseline `data/kegiatan-bnpb/kajian-ajuan-program-pt/ajuan-program-kerja-sama-301026/` (rev5). Keputusan pemilik hari itu: semua naskah berkop logo BNPB (logo mitra diisi kemudian), dan naskah perguruan tinggi tanpa kata "koordinator".

Sunting di `.docx`; `.pdf` untuk edaran dan paraf. Penyusun ulang ada di `penyusun/` (`nk_lib.js` pustaka bersama):

```
cd penyusun
NODE_PATH=~/laporan_bulanan/node_modules node nk_payung_kemdiktisaintek.js
NODE_PATH=~/laporan_bulanan/node_modules node nk_brin.js
NODE_PATH=~/laporan_bulanan/node_modules node nk_kampus.js
NODE_PATH=~/laporan_bulanan/node_modules node nda_kampus.js
```

`penyusun/package.json` menandai skrip sebagai CommonJS karena `package.json` repo bertipe module.

PDF dibuat dengan LibreOffice headless (`soffice --headless --convert-to pdf`). Isian berstabilo kuning dalam kurung siku wajib dilengkapi.

## Isian per naskah

**Ketiga naskah:** nomor BNPB (`.../KA BNPB/KS.01.01/bulan/tahun`), hari dan tanggal, kota, Keppres pengangkatan Kepala BNPB.

**Payung Kemdiktisaintek:** logo Kemdiktisaintek, nomor Kemdiktisaintek, gelar lengkap Menteri dan Keppres pengangkatannya, kontak Kemdiktisaintek.

**BRIN:** logo BRIN, nomor BRIN, gelar lengkap Kepala BRIN, judul Keppres 123/P Tahun 2025, kontak dan unit kerja sama BRIN.

**Templat kampus:**
- logo kampus, nama kampus, alamat, nama dan gelar rektor;
- dasar pengangkatan rektor: keputusan MWA untuk PTNBH, Menteri untuk PTN, atau badan penyelenggara untuk PTS. Untuk PTS yang ditandatangani badan penyelenggara, pakai paragraf petunjuk di bawah identitas;
- jenis perguruan tinggi;
- nomor NK payung (huruf c; hapus huruf ini bila payung belum terbit);
- wilayah pendampingan BPBD (Pasal 4 ayat (2) huruf d); ayat (3) dan (4) Pasal 4 dipakai hanya bila kampus memfasilitasi kampus lain di wilayahnya, selain itu dihapus;
- NK lama yang dicabut di Pasal 12 ayat (2). Hapus ayat ini bila belum ada NK sebelumnya. Contoh: UGM 2022 (berakhir 22 Feb 2027) dan ITB 2017 (berakhir Feb 2022).

## Perlu diverifikasi Biro HOK sebelum paraf

- Perpres 7/2026 benar mengubah Perpres 189/2024 (tercatat di peraturan.bpk.go.id; isi perubahan belum dibaca).
- Tidak ada Perpres BNPB baru setelah Perpres 29/2021; status perubahan Perpres 78/2021 tentang BRIN.
- Gelar Kepala BNPB "S.Sos., M.Si. (Han)" sesuai SK.
- Batas jangka waktu NK menurut Peraturan BRIN 2/2022 jo. 4/2024 (draf memakai lima tahun).
- Meterai untuk naskah antarinstansi pemerintah. Ketiga rujukan (UMY, Unpad, UGM) memakai meterai, tetapi semuanya naskah dengan perguruan tinggi.
- Urutan pihak. BNPB ditulis sebagai PIHAK KESATU karena pengusul; dapat ditukar bila penandatanganan di kantor mitra (pola Unpad 2026).

## Sudah dikerjakan dari telaah pemeriksa bersih (dua putaran)

- Sifat *non binding* dan non eksklusif memakai rumusan baku BNPB di pasal Lain-lain. Pasal Pembiayaan kini merujuk biaya yang timbul dari PKS, supaya tidak bertabrakan dengan "tidak menimbulkan kewajiban pembiayaan".
- Perpanjangan memerlukan kesepakatan tertulis; pengakhiran dipisah sebagai ayat tersendiri. PKS yang masih berjalan tidak terhenti saat NK berakhir.
- Payung: MoU kampus lama tetap berlaku dan *dapat* diselaraskan. Perguruan tinggi koordinator *ditunjuk* dengan persetujuan rektor dan *mengoordinasikan*, bukan *membina*.
- BRIN: masalah BNPB menjadi *bahan pertimbangan* agenda riset sesuai kewenangan BRIN. Lokasi uji lapangan difasilitasi bersama pemda dan BPBD. Data mengikuti aturan pihak pemilik serta kerahasiaan dan pelindungan data pribadi. Kegiatan yang sudah berjalan tetap mengikuti dokumennya.
- Kampus: payung menjadi *rujukan*, bukan payung yang mengikat kampus. Berakhirnya payung tidak mengakhiri NK kampus. Kampus yang memfasilitasi kampus lain bekerja bersama LLDIKTI, tidak menjadi wakil kampus lain, dan tidak menimbulkan kewajiban pembiayaan. Publikasi data diatur timbal balik. NK lama dicabut tanpa mengurangi hak dan kewajiban yang telah timbul.

Kerangka di Lampiran A deck analisis memuat 14 pasal untuk payung dan 12 pasal untuk BRIN; naskah final memuat 15 pasal karena Lain-lain dan Penutup dipisah, dan BRIN mendapat pasal Peran dan Koordinasi.

## Penyelarasan dengan deck rev5 (12 Nov 2026)

- Kop ketiga naskah: logo BNPB di kiri, logo mitra di kanan (sebelumnya payung dan BRIN berisian Lambang Negara). PANDUAN mencatat naskah antarlembaga pemerintah lazim berlambang negara; bila Biro HOK meminta itu, ganti kop payung dan BRIN.
- Payung Kemdiktisaintek: konsiderans baru huruf e (kerja sama masih per kampus, belum satu kerangka nasional); tujuan huruf d (pengabdian dan kerelawanan); ruang lingkup memuat 15 program deck (modul baku MK, kuliah umum Kepala BNPB, KKN di desa rawan, Bank Masalah, hibah riset bersama, DIBI dan InaRISK, Korps Relawan terdaftar, satgas mahasiswa-alumni-PT, IKD, forum tahunan dan jurnal, riset dengan mitra luar negeri); pasal baru 4 Peran Para Pihak (peran Kemdiktisaintek dari halaman mitra deck: dorong MK kebencanaan, pengakuan SKS, skema pendanaan riset dan pengabdian, sebaran lewat LLDIKTI, ditulis tanpa nama program supaya tidak usang); pasal 6 Pelaksanaan Regional dan Tematik menggantikan pasal Perguruan Tinggi Koordinator; pasal Perubahan dilebur ke Lain-lain supaya tetap 15 pasal.
- Templat kampus: nama berkas dan isi tanpa "koordinator"; ruang lingkup mengikuti empat pilar; pasal 4 Peran Para Pihak menggantikan Peran Perguruan Tinggi Koordinator.

## Perjanjian Kerahasiaan per perguruan tinggi (13 Nov 2026)

Pemilik: tiap perguruan tinggi tidak hanya MoU, tetapi juga perjanjian kerahasiaan (NDA). Templat `nda_kampus.js` timbal balik (BNPB membuka data kebencanaan dan data pribadi; kampus membuka data riset dan rancangan inovasi), mengikat, dan ditandatangani bersama NK pada hari yang sama. Berlaku sepanjang NK dan menaungi semua PKS turunannya; kerahasiaan bertahan 5 tahun setelah berakhir, data pribadi dan informasi yang dikecualikan tanpa batas waktu. Dasar: UU 14/2008, UU 27/2022, Peraturan BNPB 1/2023.

Perlu diputus Biro HOK: kode nomor perjanjian BNPB, forum sengketa bila musyawarah gagal (draf: Pengadilan Negeri Jakarta Timur, berstabilo), pejabat penghubung kerahasiaan (draf: Kepala Pusdatinkom), dan apakah penanda tangannya Kepala BNPB dan Rektor atau cukup pejabat yang dilimpahi.
