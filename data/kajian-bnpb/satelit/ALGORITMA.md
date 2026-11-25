# ALGORITMA: Pemantauan satelit

Semua ambang bertanda HIPOTESIS dikunci di `<nama>.kriteria.json` beserta sidiknya sebelum data uji dinilai (D5). Bila kode dan dokumen berbeda, dokumen dibetulkan lewat tiket, tidak diabaikan diam-diam. Waktu disimpan UTC, ditampilkan WIB.

## 0. Kisi dan kanal bersama (pemindai, D1)

```
pindaian = jam mulai FLDK, kelipatan 10 menit
kanal    = B07 3,9 | B08 6,2 | B11 8,6 | B13 10,4 | B14 11,2 | B15 12,4 um ; segmen S04-S07 ; 2 km di titik subsatelit
Tb       = awan_himawari.tb(count)           (kalibrasi count -> radiansi -> suhu kecerahan, sudah teruji)
lokasi   = awan_himawari.proyeksi(lon, lat)  (CGMS maju) ; piksel di luar kotak Indonesia dibuang
geometri : zenit satelit dari lon/lat dan sub-satelit 140,7 BT ; zenit dan azimut matahari dihitung stdlib (rumus NOAA)
siang    = zenit matahari < 85 derajat ; malam = > 95 ; di antaranya senja (ambang siang dan malam keduanya dihitung, kelas `senja`)
```

## 1. Titik panas L1b (kontekstual, F-4)

Pola algoritme kontekstual MODIS/VIIRS, disesuaikan ke 2 km. Semua angka HIPOTESIS.

```
awan     = Tb14 < 265 K  atau (siang dan Tb14 < 285 K dan Tb07 - Tb14 < 5 K)
air      = sel air dari batas daratan yang ada (kisi kab) ; di luar daratan dibuang
calon    = bukan awan, bukan air, dan
           siang: Tb07 > 310 K dan dT = Tb07 - Tb14 > 10 K
           malam: Tb07 > 300 K dan dT > 6 K
latar    = jendela 11 x 11 sekitar calon, tanpa awan, air, dan calon lain ; bila < 25 persen sah, lebarkan ke 21 x 21 ; masih kurang -> `latar_kurang`, tidak dinilai
api bila   Tb07 > rerata_latar07 + 3 x sd07
         dan dT  > rerata_latar_dT + 3,5 x sd_dT
         dan dT  > rerata_latar_dT + 6 K
         (sd diberi lantai 2 K supaya latar seragam tidak meloloskan semua)
buang    : kilau matahari (sudut pantul < 12 derajat, siang) ; dalam 2 km sumber statis `public/data/titik_palsu.json` ;
           dalam 1,5 km `scripts/data/himawari_alarm_palsu.csv` ; dalam 5 km kawah (ke F-7, bukan api lahan)
kelas    : kuat bila Tb07 - rerata_latar07 >= 8 sd atau Tb07 > 330 K ; sedang selain itu
FRP      : metode radiansi MIR (Wooster dkk. 2003): (luas piksel x sigma / a) x (L07 - L07_latar) ; konstanta a untuk B07
           dicek ke makalah asli dan dikunci di kriteria [belum diverifikasi] ; ditampilkan dibulatkan ke 10 MW, HIPOTESIS
```

Penanda dini memakai aturan `himawari.penanda()` apa adanya (terlihat 2 kali dalam 5 sampai 60 menit dan 3 km, tanpa VIIRS 5 km selama 72 jam); diimpor, tidak disalin.

### Uji api (ST-05)

- Label: VIIRS 375 m (FIRMS, `scripts/data/firms.py`) dalam 3 km dan 30 menit dari waktu lintas VIIRS; tugas api terverifikasi di D1 sebagai label kedua.
- Metrik: presisi per kelas pada jam lintas VIIRS (hanya piksel yang tercakup sapuan VIIRS dan tidak berawan di kedua sensor), recall terhadap gugus VIIRS, median menit waktu dahulu (Himawari pertama sebelum VIIRS pertama per gugus 3 km dan 24 jam).
- Pembanding pada jumlah alarm sama: persistensi (sel 0,1 derajat dengan VIIRS dalam 24 jam sebelumnya), klimatologi (sel 0,1 derajat dengan frekuensi VIIRS tertinggi pada bulan yang sama tahun-tahun sebelumnya).
- Pembanding kedua bila WLF pulih: WLF reliability >= 3 pada jendela yang sama.
- Periode: kalibrasi dan uji dipisah per minggu berselang (bukan acak per titik). Musim kering 2026 (Jul sampai Okt) diambil dari riwayat L1b di bucket `noaa-himawari9` (bucket menyimpan riwayat sejak Himawari-9 operasional) dengan pemindai yang sama dalam mode `riwayat`, sesudah kriteria dikunci; satu musim penuh (sekitar 70 MB per pindaian) tidak muat di runner, jadi mode `riwayat` hanya mengunduh cuplikan yang ditetapkan di kriteria ST-04 sebelum unduhan pertama (misalnya satu pindaian per jam pada hari uji terpilih, potongan kotak Indonesia saja); arsip R2 hidup dipakai untuk uji prospektif. Kriteria tidak boleh memakai minggu uji.

### Kemandirian label api (dikunci di kriteria)

Label uji adalah VIIRS, jadi apa pun yang memakai VIIRS tidak boleh ada di jalur yang dinilai:

1. Presisi dan recall dilaporkan pada keluaran detektor MENTAH: tanpa saringan "tanpa VIIRS 5 km 72 jam", dan `penanda()` tidak pernah dipakai di uji presisi (aturan itu sendiri membuang titik yang dekat VIIRS, jadi presisinya tidak bisa dinilai lawan VIIRS).
2. Saringan sumber statis dan alarm palsu dinilai dua kali berdampingan: tanpa saringan apa pun, dan dengan saringan yang asalnya bukan VIIRS. `himawari_alarm_palsu.csv` lahir dari "tidak pernah dilihat VIIRS", jadi ia dikeluarkan dari angka utama dan hanya dilaporkan sebagai baris tambahan berlabel "memakai VIIRS". Asal `titik_palsu.json` diperiksa di ST-04; bila memakai VIIRS, perlakuannya sama.
3. Gugus VIIRS yang sudah dipakai untuk menyusun daftar alarm palsu dan kriteria tidak dipakai lagi sebagai label uji (minggu kalibrasi dan uji terpisah).
4. Batas klaim yang ditulis di rapor: angka ini mengukur kesepakatan dengan VIIRS pada jam lintas VIIRS, bukan kebenaran lapangan; api kecil di bawah ambang VIIRS dan api di antara lintasan tidak terukur. Waktu dahulu hanya untuk gugus yang akhirnya dilihat VIIRS.
5. Label kedua yang tidak bergantung VIIRS: tugas api terverifikasi lapangan di D1 dan Dalops karhutla (`label_dalops.py`), dilaporkan terpisah dan tidak dijumlah.

## 2. Abu gunung api (F-5)

```
kotak    = 100 km sekitar gunung berlevel >= II (MAGMA) ; gunung lain tidak dinilai
BTD      = Tb13 - Tb15
koreksi uap air (pola Yu dkk. 2002): BTD_k = BTD - b(Tb13) dengan b dari piksel cerah tanpa abu di kotak yang sama,
           diregresikan sekali per pindaian (garis lurus BTD lawan Tb13, kuantil 0,1 sampai 0,9) ; kurang dari 200 piksel cerah -> `koreksi_kurang`
abu bila   BTD_k < -0,5 K dan Tb13 < 290 K dan Tb11 - Tb13 > -1 K (menyingkirkan permukaan pasir kering)
gugus    : piksel abu bertetangga >= 3 ; gugus satu piksel dibuang
keluaran : per gunung: piksel abu, luas kasar km2 (dibulatkan 10), jarak gugus terjauh dari kawah, arah (8 mata angin) ; semua HIPOTESIS
```

Jumlah label: VONA jarang dan terkumpul di sedikit gunung, sedangkan alarm dihitung per gunung-hari. Dengan arsip hidup beberapa minggu saja, n VONA hampir pasti < 20 dan vonis "tak dapat dinilai" adalah hasil yang diharapkan, bukan kegagalan. Karena itu periode uji utama adalah riwayat: semua VONA ber-jam sejak Himawari-9 operasional sampai akhir Okt 2026 (`arsip_magma.py`), pindaian L1b di sekitar tiap VONA dan sampel hari tanpa VONA diunduh dari bucket `noaa-himawari9` dalam mode `riwayat`. Kriteria (ambang, jendela, gunung, cara sampel hari kosong, pembagian kalibrasi dan uji per gunung-tahun) dikunci dan disidik SEBELUM unduhan riwayat pertama. Bila sesudah riwayat n tetap < 20, vonis "tak dapat dinilai" ditulis apa adanya dan detektor tetap hipotesis.

Uji (ST-08): label = VONA PVMBG (waktu letusan, arah, tinggi; arsip `arsip_magma.py`). Deteksi per letusan: abu terlihat dalam [VONA - 30, VONA + 60] menit. Alarm palsu: hari-gunung beralarm tanpa VONA dan tanpa laporan erupsi MAGMA dalam 24 jam. Arah dinilai seperti `uji_abu.py` (dalam 45 derajat). Pembanding: persistensi (VONA kemarin) dan klimatologi (frekuensi VONA per gunung per bulan), jumlah alarm sama. VAAC tidak dipakai sebagai label karena arsipnya tidak tersedia (catatan `uji_abu.py`).

## 3. Konveksi 10 menit dan puncak tembus (F-6)

```
per kab per pindaian, sampel kisi 0,1 derajat (awan_himawari):
  Tb_min, persen awan dingin (<= 235 K), persen sangat dingin (<= 208 K)
  laju     = Tb13 sekarang - Tb13 10 menit lalu pada sampel yang sama ; tumbuh bila laju <= -4 K dan Tb_min <= 253 K      (HIPOTESIS)
  puncak tembus (OT) per piksel: Tb13 <= 208 K dan Tb13 <= rerata cincin 6-8 km - 6,5 K dan Tb08 - Tb13 > 0 K
  koreksi paralaks: geser = h x tan(zenit satelit) menjauhi titik subsatelit, h = 15 km untuk OT, 10 km untuk awan dingin   (HIPOTESIS)
  sinyal kab-hari = ada OT ATAU tumbuh berturut 2 pindaian
```

Pindaian 10 menit menggantikan pasangan 30 menit di `awan_tumbuh.py`; definisi 30 menit lama tetap dihitung berdampingan selama uji supaya tidak mundur.

Satuan alarm dan pembanding (dikunci di kriteria):

- Satuan dinilai = **kab-hari WIB**. Banyak pindaian bersinyal di kab yang sama pada hari yang sama tetap SATU alarm; skor kab-hari = jumlah pindaian bersinyal hari itu (untuk mengurutkan). Pindaian bukan satuan uji karena label Dalops per hari.
- n_alarm = jumlah kab-hari bersinyal model pada periode uji, dengan ambang terkunci.
- Pembanding klimatologi: skor kab-hari = frekuensi label Dalops `cuaca` kab itu pada bulan kalender yang sama di tahun-tahun kalibrasi; ambil n_alarm kab-hari teratas per periode (seri diputus dengan acak berbiji tetap yang dikunci).
- Pembanding persistensi: kab-hari dengan label Dalops `cuaca` kemarin (memakai `tanggal_lapor` supaya tidak bocor); bila lebih dari n_alarm, ambil yang laporannya paling awal; bila kurang, dibiarkan kurang dan jumlahnya ditulis.
- Hanya kab-bulan yang teramati Dalops (`label_mutu`) masuk penyebut ketiganya.

Periode: riwayat L1b musim hujan Nov 2025 sampai Mar 2026 dari bucket NOAA, kriteria dikunci sebelum unduhan; arsip hidup untuk prospektif.

Uji (ST-09): label Dalops `cuaca` (puting beliung, cuaca ekstrem) per kab-hari lewat `label_dalops.py`, DIBI label kedua; hujan IMERG Late >= 50 mm/hari sebagai label ketiga terpisah. Metrik POD dan FAR kab-hari, toleransi 0 dan +-1 hari berdampingan (`skor_dua`). Pembanding: klimatologi kab-bulan dan persistensi kab kemarin pada jumlah alarm sama. Peringatan dini BMKG dinilai di baris terpisah, tidak digabung. Kab-bulan tak teramati Dalops tidak dinilai.

## 4. Panas kawah dan SO2 (F-7)

```
kawah    : FIRMS VIIRS (S-NPP, NOAA-20, NOAA-21) dalam 5 km titik kawah ; per gunung per hari: jumlah piksel, jumlah FRP (MW)
anomali  = FRP hari ini / median FRP 90 hari sebelumnya (tanpa hari ini) ; median 0 -> "baru muncul" bila FRP > 0
SO2      : TROPOMI OFFL L2 SO2 kolom total, qa_value >= 0,5, dalam 50 km kawah
massa_t  = jumlah (VCD_DU x luas_piksel_km2) x 0,0285      (1 DU di atas 1 km2 = 0,0285 t SO2)
anomali  = massa hari ini lawan kuantil 0,9 dari 30 hari sebelumnya ; lintasan berawan atau terpotong -> `tak_teramati`
```

Uji (ST-10): label = kenaikan level MAGMA atau letusan ber-VONA dalam 14 hari sesudah sinyal. Metrik: dari kenaikan level, berapa yang didahului sinyal dalam 14 hari; sinyal per gunung per bulan tanpa kenaikan. Pembanding: persistensi level dan "ada VONA 7 hari terakhir". Lereng terbakar dibuang bila titik FIRMS juga di luar 2 km kawah pada hari yang sama (api lahan, bukan kawah).

## 5. Genangan harian per kab (F-8)

```
kejadian aktif = baris Dalops banjir terbuka atau KJ banjir Buku Besar fase `tanggap`
per kab aktif per hari: lintasan GFM terbaru hari itu -> genangan_nasional.hitung_pasangan (aturan cakupan sah, pra, sinyal lemah tetap)
baris harian = {kab, tanggal, status (ok, tanpa_lintasan, tanpa_cakupan, tanpa_pra), baru_ha, cakupan_pct, lintasan}
```

Hari tanpa lintasan menyalin tidak apa pun dan tertulis "belum ada lintasan sejak <tanggal>" (pola insiden karhutla: satu baris per hari, hari tanpa ukur tidak diisi). Uji (ST-11): Dalops banjir kab-hari, GFM hanya penguat positif (aturan `gfm_label.py`); presisi dan recall hanya pada kab-hari yang teramati.

## 6. Kekeringan vegetasi (F-9)

```
VHI = 0,5 x VCI + 0,5 x TCI (Kogan, NOAA STAR) ; dibaca jadi
per kab per minggu : rerata VHI piksel darat ; kering bila VHI < 40 (HIPOTESIS, ambang Kogan)
```

Uji (ST-12): Dalops kekeringan dan DIBI per kab-bulan; pembanding SPI-3 (`scripts/kekeringan/spi.py`) dan persistensi status bulan lalu, jumlah alarm sama. Ingat ambang kekeringan lama gagal (FAR 97 persen, `RISET-AMBANG.md`); VHI masuk sebagai hipotesis baru, tidak menimpa ambang lama.

## 7. Asap (F-10)

```
AI per kab per hari = kuantil 0,9 AI TROPOMI (aerosol_index_354_388, qa >= 0,8) dalam poligon kab ; < 10 piksel sah -> tak teramati
asap bila AI >= 1 (definisi tropomi.py)
```

Kerja baru, bukan pemakaian ulang keluaran: `tropomi.py` hari ini hanya menulis seri harian per PROVINSI (rata piksel sah) dan kisi 0,25 derajat. Agregasi per kab dibangun di `asap_aod.py`: daftar granul dan unduhan DAP4 memakai fungsi `tropomi.py` lewat impor (token dan aturan redirect tetap di sana), piksel dipetakan ke poligon kab lewat ray casting yang sama dengan pemetaan provinsinya. Seri provinsi `tropomi.py` tidak berubah.

Uji (ST-13): PM2.5 darat per kota-hari (`scripts/udara/**`); metrik Spearman AI lawan PM2.5 dan kemampuan memisah hari ISPU tidak sehat (AUC). Pembanding: PM2.5 kemarin (persistensi) dan rerata bulan. Lintasan berawan = tak teramati.

## 8. Aturan gerbang bersama

```
untuk tiap detektor:
  n_alarm_model ditetapkan oleh ambang terkunci ; pembanding diambil top-n_alarm_model menurut skornya sendiri
  selisih = metrik_model - metrik_pembanding (arah "rendah" dibalik)
  boleh_tampil_tanpa_pil = selisih > 0 dan batas bawah selang 95 persen (bootstrap blok per minggu, selang.py) > 0, untuk KEDUA pembanding
  vonis_prospektif wajib "lolos" untuk alarm ke luar ; n label < 20 -> "tak dapat dinilai"
```

Gerbang ditulis oleh `scripts/umum/gerbang.py` ke `public/data/gerbang/satelit.json`, satu entri per detektor dan versi kriteria.

## 9. Lanjutan (Q14)

- Kabut malam: Tb07 - Tb13 < -2 K dan Tb13 > 280 K, malam saja; label METAR jarak pandang < 1 km (`jarak_pandang.yml`); asap gambut malam diberi kelas terpisah, bukan kabut.
- GSMaP_NOW: tertahan FTP JAXA. Pembacanya sudah ada (`scripts/banjir/genangan/gsmap.py`, 23,8 KB) dan foldernya beku oleh sidik J4 sampai Apr 2027, jadi dipakai lewat impor saja dari berkas baru di luar `scripts/banjir/genangan/`; berkas beku tidak disunting.
- LST split-window B13/B14/B15: satu komposit siang per hari, piksel cerah saja; tertahan sampai F-9 bervonis.
