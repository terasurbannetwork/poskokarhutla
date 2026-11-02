# Pendaftaran umpan CAP Centurisk97

Dokumen ini daftar kerja untuk PEMILIK. Kita tidak mengirim apa pun ke pihak luar dari kode. Semua pendaftaran, surat, dan permintaan dilakukan manusia. Bila alamat atau syarat di bawah tidak pasti, tertulis "cek situs resmi".

## 1. Yang sudah ada

Umpan Common Alerting Protocol (CAP) versi 1.2, standar OASIS.

| Umpan | URL | Isi |
| --- | --- | --- |
| CAP 1.2 | `https://centurisk97.id/api/peringatan/aktif.cap` | satu `<alert>`, satu `<info>` per peringatan aktif, bahasa Indonesia |
| JSON | `https://centurisk97.id/api/peringatan/aktif` | bentuk yang sama, untuk layar sendiri |
| GeoJSON | `https://centurisk97.id/api/peringatan/aktif.geojson` | satu titik per peringatan |

Sifat umpan: terbuka tanpa login, CORS terbuka, cache tepi 30 detik, `GET` dan `HEAD` saja. Kode: `src/peringatan.js` (fungsi `bentukCap`), uji: `tests/warga/peringatan.test.mjs`.

Cakupan bahaya sekarang:

| Jenis | Sumber | Label pengirim di CAP |
| --- | --- | --- |
| Gempa bumi | BMKG, atau USGS bila BMKG belum memuat | BMKG: "meneruskan BMKG". USGS: "Deteksi Centurisk97, hitungan otomatis, bukan peringatan BMKG atau InaTEWS" |
| Potensi tsunami | pernyataan potensi tsunami BMKG | "meneruskan InaTEWS" |
| Cuaca ekstrem | nowcast BMKG tingkat Severe dan Extreme | "meneruskan BMKG" |
| Karhutla | tugas api level 3 baru dari satelit | Deteksi Centurisk97 |
| Banjir | kejadian aktif level 2 dan 3 dari hitungan hujan dan sungai | Deteksi Centurisk97 |

Belum ada: kekeringan, tanah longsor, gunung api. Penambahan harus lewat aturan pemicu baru dan uji, bukan lewat pendaftaran.

Catatan penting: peringatan berlabel Deteksi adalah hitungan otomatis kita. Ia bukan peringatan resmi BMKG, InaTEWS, atau BPBD. Pihak yang menerima umpan perlu tahu ini sebelum menyiarkannya ke publik.

## 2. Yang perlu diputuskan pemilik sebelum mendaftar

1. Siapa lembaga penerbit di mata agregator. Agregator biasanya hanya menerima otoritas peringatan yang diakui negara. Centurisk97 sebagai penyedia deteksi mungkin tidak memenuhi syarat itu sendirian. Jalur realistis: umpan dipakai BNPB atau BMKG sebagai otoritas, atau diterima sebagai sumber pelengkap lewat mereka.
2. Apakah peringatan Deteksi (karhutla, banjir, gempa USGS) boleh ikut. Usul: pada tahap awal umpan untuk pihak luar dibatasi ke jenis yang bersumber BMKG, sedangkan Deteksi tetap di umpan terpisah. Ini perubahan kode, minta lewat `warga-api`.
3. Nama kontak resmi (surel atau telepon yang dijawab manusia), kebijakan penggunaan, dan kebijakan koreksi atau pencabutan.
4. Identitas pengirim di `<sender>` (sekarang `centurisk97.id`). Agregator biasanya meminta pengenal yang stabil dan terdaftar, lihat bagian OID.

## 3. WMO Register of Alerting Authorities dan Alert Hub

Alert Hub (WMO) mengumpulkan umpan CAP resmi dari otoritas peringatan tiap negara. Pendaftaran otoritas dilakukan lewat Register of Alerting Authorities di bawah WMO, dan di Indonesia jalur wajarnya melalui BMKG sebagai anggota tetap WMO.

Langkah:

1. Cek situs resmi WMO (Alert Hub dan Register of Alerting Authorities) untuk daftar otoritas Indonesia yang sudah terdaftar dan formulir terbaru.
2. Hubungi BMKG (Pusat Gempabumi dan Tsunami, atau bagian kerja sama) dan tanyakan apakah BMKG sudah mengumpankan CAP ke Alert Hub dan apakah umpan pelengkap dari BNPB bisa didaftarkan di bawah BNPB.
3. Bila BNPB akan terdaftar sebagai otoritas sendiri, siapkan lewat Pusdatinkom BNPB: surat permohonan, kontak teknis, dan URL umpan.
4. Syarat yang biasanya diminta (cek situs resmi untuk daftar tepatnya):
   - nama otoritas, negara, dan bahaya yang dicakup;
   - URL umpan CAP yang stabil, dapat diakses terbuka, dan valid CAP 1.2;
   - pengenal pengirim, biasanya OID (Object Identifier) yang diterbitkan untuk otoritas;
   - kebijakan: siapa berwenang menerbitkan, bagaimana peringatan dicabut, bahasa, lisensi data;
   - kontak operasional 24 jam atau jam kerja yang jelas.
5. Pengujian: sediakan contoh umpan dan jalankan validator CAP (cek situs resmi OASIS atau WMO untuk validator yang dianjurkan).

## 4. OID

OID untuk otoritas peringatan diurus lewat badan pengelola yang ditunjuk WMO atau negara, bukan dibuat sendiri. Tanyakan ke BMKG atau Pusdatinkom BNPB apakah BNPB sudah punya cabang OID (misalnya lewat Kominfo atau badan standardisasi). Setelah ada, `<identifier>` dan `<sender>` di kode perlu mengikuti pola yang diminta. Perubahan kode itu kecil, tetapi nilai OID harus datang dari pemilik.

## 5. Google Public Alerts

Google menerima umpan CAP dari otoritas resmi lewat program Public Alerts. Cek situs resmi Google (Public Alerts, Google Crisis Response) untuk syarat dan formulir terbaru.

Yang biasanya diminta:

1. Pernyataan bahwa pengirim adalah otoritas resmi atau bekerja atas nama otoritas, lengkap dengan surat atau bukti kewenangan.
2. URL umpan CAP stabil, dengan bahasa, zona waktu, dan geometri (poligon atau lingkaran) yang valid.
3. Kebijakan lisensi atau izin penayangan.
4. Kontak teknis untuk gangguan.

Catatan teknis: umpan kita memakai `<circle>` titik dengan radius 0 dan geocode BPS tingkat provinsi. Agregator lebih suka poligon atau lingkaran berradius nyata. Poligon area terdampak butuh data baru dari tiap aturan pemicu dan belum ada.

## 6. Koordinasi dengan BMKG

Tujuan: tidak ada peringatan kita yang tampak seperti peringatan resmi BMKG, dan sebaliknya BMKG tahu kita meneruskan datanya.

1. Pastikan izin penggunaan data BMKG (gempa terkini, potensi tsunami, nowcast CAP) untuk diteruskan dalam CAP. Cek ketentuan data terbuka BMKG di situs resmi.
2. Sepakati penulisan sumber. Sekarang: BMKG dan InaTEWS tertulis "meneruskan", tautan `<web>` ke halaman BMKG atau InaTEWS.
3. Tanyakan apakah BMKG punya umpan CAP resmi yang sebaiknya kita tautkan atau gantikan daripada membentuk ulang.
4. Sepakati bahwa pernyataan tsunami tidak pernah dibuat oleh kita. Kita hanya meneruskan; tanpa pernyataan BMKG tidak ada alarm.

## 7. Koordinasi dengan Pusdatinkom BNPB

1. Tanyakan apakah BNPB sudah punya agregator CAP atau gerbang peringatan dini (kaitan dengan rencana Perpres Peringatan Dini dan Perban MHEWS, target 2027). Umpan kita bisa menjadi satu sumber masukan.
2. Tanyakan kebijakan siapa yang berwenang menandatangani penerbitan peringatan ke publik, dan alur persetujuannya.
3. Bahas status peringatan Deteksi: tetap berlabel hitungan otomatis, atau perlu verifikasi petugas sebelum keluar ke luar BNPB.
4. Minta pengenal pengirim dan kontak resmi untuk dicantumkan di umpan.

## 8. Urutan yang disarankan

1. Putuskan butir bagian 2 (terutama batas jenis yang keluar ke luar).
2. Koordinasi BMKG dan Pusdatinkom BNPB (bagian 6 dan 7). Minta OID dan jalur pendaftaran yang mereka anjurkan.
3. Validasi umpan dengan validator CAP, perbaiki bila ada keluhan.
4. Daftar ke WMO Alert Hub lewat jalur yang disepakati, baru Google Public Alerts.
5. Setelah terdaftar, pantau: umpan harus tetap hidup, identifier tidak mengulang, pencabutan tampil.

## 9. Keterbatasan umpan sekarang (jujur)

1. `<identifier>` berisi waktu pengambilan, sehingga berganti tiap polling. Agregator akan melihatnya sebagai alert baru. Untuk produksi, satu alert per peringatan dengan identifier tetap (dari `kunci`) dan `msgType` Update atau Cancel jauh lebih tepat. Perubahan ini lebih besar dari perbaikan kecil; minta lewat `warga-api` bila disetujui.
2. Pencabutan manual oleh moderator hanya menghilangkan peringatan dari umpan, belum mengirim `msgType` Cancel.
3. Area berupa titik dan provinsi, belum poligon.
4. Hanya bahasa Indonesia.
