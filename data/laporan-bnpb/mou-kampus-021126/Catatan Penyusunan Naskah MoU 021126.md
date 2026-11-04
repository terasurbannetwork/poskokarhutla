# Catatan penyusunan naskah MoU program kerja sama perguruan tinggi (2 Nov 2026)

| Naskah | Berkas | Pasal | Halaman | Kepala |
|---|---|---|---|---|
| NK payung BNPB dan Kemdiktisaintek | `Draf NK BNPB dan Kemdiktisaintek 021126.docx/.pdf` | 15 | 7 | Kop BNPB (logo BNPB dan logo mitra) |
| NK BNPB dan BRIN | `Draf NK BNPB dan BRIN 021126.docx/.pdf` | 15 | 7 | Kop BNPB (logo BNPB dan logo mitra) |
| Templat NK BNPB dan Perguruan Tinggi Koordinator | `Templat NK BNPB dan Perguruan Tinggi Koordinator 021126.docx/.pdf` | 14 | 6 | Logo BNPB dan logo kampus |

Sunting di `.docx`; `.pdf` untuk edaran dan paraf. Penyusun ulang ada di `penyusun/` (`nk_lib.js` pustaka bersama):

```
cd penyusun
NODE_PATH=C:/Users/USER/laporan_bulanan/node_modules node nk_payung_kemdiktisaintek.js
NODE_PATH=C:/Users/USER/laporan_bulanan/node_modules node nk_brin.js
NODE_PATH=C:/Users/USER/laporan_bulanan/node_modules node nk_kampus.js
```

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
- regional atau bidang tematik;
- NK lama yang dicabut di Pasal 12 ayat (2). Hapus ayat ini bila belum ada NK sebelumnya. Contoh: UGM 2022 (berakhir 22 Feb 2027) dan ITB 2017 (berakhir Feb 2022).

## Perlu diverifikasi Biro HOK sebelum paraf

- Perpres 7/2026 benar mengubah Perpres 189/2024 (tercatat di peraturan.bpk.go.id; isi perubahan belum dibaca).
- Tidak ada Perpres BNPB baru setelah Perpres 29/2021; status perubahan Perpres 78/2021 tentang BRIN.
- Gelar Kepala BNPB "S.Sos., M.Si., M.Si. (Han)" sesuai SK.
- Batas jangka waktu NK menurut Peraturan BRIN 2/2022 jo. 4/2024 (draf memakai lima tahun).
- Meterai untuk naskah antarinstansi pemerintah. Ketiga rujukan (UMY, Unpad, UGM) memakai meterai, tetapi semuanya naskah dengan perguruan tinggi.
- Urutan pihak. BNPB ditulis sebagai PIHAK KESATU karena pengusul; dapat ditukar bila penandatanganan di kantor mitra (pola Unpad 2026).

## Sudah dikerjakan dari telaah pemeriksa bersih (dua putaran)

- Sifat *non binding* dan non eksklusif memakai rumusan baku BNPB di pasal Lain-lain. Pasal Pembiayaan kini merujuk biaya yang timbul dari PKS, supaya tidak bertabrakan dengan "tidak menimbulkan kewajiban pembiayaan".
- Perpanjangan memerlukan kesepakatan tertulis; pengakhiran dipisah sebagai ayat tersendiri. PKS yang masih berjalan tidak terhenti saat NK berakhir.
- Payung: MoU kampus lama tetap berlaku dan *dapat* diselaraskan. Perguruan tinggi koordinator *ditunjuk* dengan persetujuan rektor dan *mengoordinasikan*, bukan *membina*.
- BRIN: masalah BNPB menjadi *bahan pertimbangan* agenda riset sesuai kewenangan BRIN. Lokasi uji lapangan difasilitasi bersama pemda dan BPBD. Data mengikuti aturan pihak pemilik serta kerahasiaan dan pelindungan data pribadi. Kegiatan yang sudah berjalan tetap mengikuti dokumennya.
- Kampus: payung menjadi *rujukan*, bukan payung yang mengikat kampus. Berakhirnya payung tidak mengakhiri NK kampus. Koordinator *memfasilitasi koordinasi* bersama LLDIKTI, tidak menjadi wakil kampus lain, dan tidak menimbulkan kewajiban pembiayaan. Publikasi data diatur timbal balik. NK lama dicabut tanpa mengurangi hak dan kewajiban yang telah timbul.

Kerangka di Lampiran A deck analisis memuat 14 pasal untuk payung dan 12 pasal untuk BRIN; naskah final memuat 15 pasal karena Lain-lain dan Penutup dipisah, dan BRIN mendapat pasal Peran dan Koordinasi.
