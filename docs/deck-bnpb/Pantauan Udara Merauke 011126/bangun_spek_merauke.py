#!/usr/bin/env python3
"""Hasil pantauan udara karhutla Merauke 31 Okt 2026, untuk Kepala BNPB. Jalankan dari akar proyek-merauke:
python3 spek/peta_merauke.py <h72.json> <waypoint.gpx>; python3 spek/bangun_spek_merauke.py; deck.py spek/pantau-merauke.json --akar ."""
import json
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
LV = 'pantau-bencana-titik-live-2026-11-01'
RL = 'bnpb-renlap-udara-merauke-2026-10-30'
SP = 'bnpb-sippa-renlap-kalteng-2026-11-01'
S_T = 'NASA FIRMS, diolah BNPB'
ANGKA = {}


def a(k, nilai, satuan, pustaka, sumber, keyakinan='resmi', catatan=None):
    ANGKA[k] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pustaka, 'sumber': sumber, 'keyakinan': keyakinan}
    if catatan:
        ANGKA[k]['catatan'] = catatan


def t(k, o=''):
    return '{{angka:%s%s}}' % (k, o)


a('mk.kab31', 1206, 'titik', LV, S_T, catatan='hotspot Kabupaten Merauke 31 Okt 2026 WIB, termasuk keyakinan rendah')
a('mk.kab30', 685, 'titik', LV, S_T)
a('mk.kab29', 920, 'titik', LV, S_T)
a('mk.jagebob31', 240, 'titik', LV, S_T, catatan='Kecamatan Jagebob, 31 Okt 2026')
a('mk.cp5', 231, 'titik', LV, S_T, catatan='radius {{angka:mk.radius|satuan}} dari CP5 Jagebob, 31 Okt 2026')
a('mk.cp4', 172, 'titik', LV, S_T)
a('mk.frp', 1781, 'MW', LV, S_T, catatan='FRP tertinggi di cluster PT MSJ, 31 Okt 2026')
a('mk.luas', 3276, 'ha', LV, S_T, 'estimasi-model', 'perkiraan: 233 sel 375 m berisi hotspot 29-31 Okt dalam {{angka:mk.radius|satuan}} CP4, MSJ, CP5, batas atas')
a('mk.cp.lain', 14, 'titik', LV, S_T, catatan='titik terbanyak di check point selain cluster MSJ')
a('mk.cp.jumlah', 11, 'check point', RL, 'Renlap rute udara BNPB, 30 Okt 2026')
a('mk.rute.km', 250, 'km', RL, 'Renlap rute udara BNPB, 30 Okt 2026', 'estimasi-model')
a('mk.rute.mnt', 74, 'menit', RL, 'Renlap rute udara BNPB, 30 Okt 2026', 'estimasi-model')
a('sp.lokasi', 5, 'lokasi', SP, 'Renlap SIPPA Kalimantan Tengah, 1 Nov 2026')
a('sp.air.min', 80, 'm', SP, 'Renlap SIPPA Kalimantan Tengah, 1 Nov 2026', 'estimasi-model')
a('sp.air.maks', 950, 'm', SP, 'Renlap SIPPA Kalimantan Tengah, 1 Nov 2026', 'estimasi-model')
a('sp.selang.maks', 1198, 'm', SP, 'Renlap SIPPA Kalimantan Tengah, 1 Nov 2026', 'estimasi-model')
a('sp.debit', 5, 'liter per detik', SP, 'Renlap SIPPA Kalimantan Tengah, 1 Nov 2026', 'asumsi-kebijakan')
a('mk.radius', 6, 'km', RL, 'Renlap rute udara BNPB, 30 Okt 2026', 'asumsi-kebijakan', 'radius pandang tiap check point')
a('mk.min.titik', 3, 'titik', RL, 'Renlap rute udara BNPB, 30 Okt 2026', 'asumsi-kebijakan')
a('mk.min.frp', 5, 'MW', RL, 'Renlap rute udara BNPB, 30 Okt 2026', 'asumsi-kebijakan')
a('mk.jam', 3, 'jam', LV, S_T, 'asumsi-kebijakan', 'jeda tarik data hotspot')
a('rl.titik', 158, 'titik', RL, 'Renlap rute udara BNPB, 30 Okt 2026', catatan='hotspot 24 jam di dalam segitiga saat rute disusun, 30 Okt 10.00 WIT')
a('mk.hari', 7, 'hari', LV, S_T, 'asumsi-kebijakan', 'jangka rencana tindak lanjut')

SUM_T = 'NASA FIRMS (VIIRS dan MODIS), diolah BNPB, 31 Okt 2026 WIB; pantauan udara tim BNPB, 31 Okt 2026'
PUSTAKA = [
    {'id': LV, 'type': 'dataset', 'author': [{'literal': 'sistem BNPB, olahan NASA FIRMS'}], 'issued': {'date-parts': [[2026, 11, 1]]},
     'title': 'Hotspot NASA FIRMS 29 sampai 31 Okt 2026 (acuan 1 Nov 2026, 10.39 WIT), MODIS dan VIIRS, per kecamatan', 'URL': 'https://centurisk97.id/data/hotspot72.json', 'verifikasi': 'primer'},
    {'id': RL, 'type': 'report', 'author': [{'literal': 'Badan Nasional Penanggulangan Bencana', 'singkatan': 'BNPB'}], 'issued': {'date-parts': [[2026, 10, 30]]},
     'title': 'Renlap rute udara check point karhutla, kunjungan kerja KASAD dan Kepala BNPB, Merauke', 'verifikasi': 'primer'},
    {'id': SP, 'type': 'report', 'author': [{'literal': 'Badan Nasional Penanggulangan Bencana', 'singkatan': 'BNPB'}], 'issued': {'date-parts': [[2026, 11, 1]]},
     'title': 'Renlap SIPPA pilot Kalimantan Tengah: 5 lokasi, sumber air terdekat', 'verifikasi': 'primer'},
]

SAMPUL = {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': 'foto/udara-20.jpg', 'kota': 'Jakarta', 'kredit': 'Foto: pantauan udara tim BNPB',
          'logo_kanan': 'foto/berakhlak-hd.png', 'kepada': 'Ditujukan khusus untuk Kepala BNPB',
          'subjudul': 'Kabupaten Merauke, Papua Selatan, 31 Oktober 2026',
          'penyaji': {'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'}}

RINGKAS = {
    'jenis': 'galeri', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan pantauan',
    'judul': f'Lahan Merauke dibuka dengan api: semak dibakar dulu, pohon ditumbangkan kemudian; {t("mk.cp5", "|satuan")} di sekitar PT MSJ',
    'cut_off': False,
    'grup': [{'pil': 'Hotspot 31 Oktober', 'nada': 'data', 'ikon': 'karhutla', 'kartu': [
        {'nilai': t('mk.kab31'), 'label': 'hotspot Kabupaten Merauke', 'ikon': 'karhutla', 'warna': 'navy'},
        {'nilai': t('mk.jagebob31'), 'label': 'hotspot Kecamatan Jagebob', 'ikon': 'wilayah', 'warna': 'navy'}]},
        {'pil': 'Cluster PT Merauke Sawit Jaya', 'nada': 'perhatian', 'ikon': 'peringatan', 'kartu': [
            {'nilai': t('mk.frp'), 'label': 'MW, FRP tertinggi di cluster', 'ikon': 'naik', 'warna': 'merah'},
            {'nilai': t('mk.luas'), 'label': 'ha area ber-hotspot, batas atas', 'ikon': 'luas', 'warna': 'merah'}]}],
    'kolom_panel': 2,
    'panel': [
        {'judul': 'Tepi lahan PT Merauke Sawit Jaya, 31 Oktober', 'ikon': 'karhutla', 'kolom_foto': 1, 'bobot': 1,
         'foto': [{'berkas': 'foto/udara-04.jpg', 'keterangan': 'Batang pohon menghitam di tepi hutan, ekskavator menumbangkan pohon di lahan terbuka'}]},
        {'judul': 'Temuan pantauan udara', 'ikon': 'ringkasan', 'bobot': 1, 'temuan': [
            {'kode': 'Temuan A.1', 'keyakinan': 'terverifikasi', 'ikon': 'karhutla', 'teks': '**Bakar dulu, tebang kemudian.** Semak di bawah pohon tinggi dibakar, lalu pohon yang sudah hangus ditumbangkan ekskavator.'},
            {'kode': 'Temuan A.2', 'keyakinan': 'terverifikasi', 'ikon': 'peringatan', 'teks': '**Api dibiarkan menyebar.** Asap aktif di hutan tepi lahan terbuka sampai dekat permukiman Kurik dan Semangga.'},
            {'kode': 'Temuan A.3', 'keyakinan': 'resmi', 'ikon': 'wilayah', 'teks': f'**Terpusat di lahan PT MSJ.** {t("mk.cp5", "|satuan")} di CP-5 dan {t("mk.cp4", "|satuan")} di CP-4; sembilan check point lain paling banyak {t("mk.cp.lain", "|satuan")}.'},
            {'kode': 'Temuan A.4', 'keyakinan': 'terverifikasi', 'ikon': 'kalender', 'teks': f'**Rute tidak bisa diterbangi penuh.** Asap tebal menutup jarak pandang di {t("mk.cp.jumlah", "|satuan")} rencana.'}]}],
    'sumber': SUM_T,
}

MODUS = {
    'jenis': 'galeri', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'pesan': 'Modus pembukaan lahan',
    'judul': 'Klaim "tebang, susun, lalu bakar" tidak sesuai lapangan: semak dibakar dulu di bawah pohon tegak, pohon ditumbangkan sesudahnya',
    'cut_off': False, 'kolom_panel': 4,
    'panel': [
        {'judul': '1. Semak dibakar', 'ikon': 'karhutla', 'kolom_foto': 1,
         'foto': [{'berkas': 'foto/udara-26.jpg', 'keterangan': 'Asap di lantai hutan, pohon tegak'}]},
        {'judul': '2. Pohon ditumbang', 'ikon': 'peringatan', 'kolom_foto': 1,
         'foto': [{'berkas': 'foto/udara-00.jpg', 'keterangan': 'Ekskavator di lahan baru dibuka'}]},
        {'judul': '3. Kayu ditumpuk', 'ikon': 'luas', 'kolom_foto': 1,
         'foto': [{'berkas': 'foto/udara-06.jpg', 'keterangan': 'Kayu tumbang ditumpuk berbaris'}]},
        {'judul': 'Klaim dan kenyataan', 'ikon': 'ringkasan', 'skala_huruf': 1.35, 'daftar': [
            '**Klaim perusahaan:** pohon ditebang dulu, kayu disusun, baru dibakar terkendali.',
            '**Kenyataan di udara:** batang pohon yang masih tegak menghitam setinggi semak, tanda api lewat di lantai hutan sebelum pohon ditebang.',
            '**Pola pembakaran sengaja.** Menurut pengamatan tim, api mengikuti batas lahan yang sedang dibuka, bersebelahan dengan alat berat yang bekerja.',
            '**Tidak terlihat dijaga.** Dari udara tidak tampak regu atau sekat bakar; api menjalar ke hutan di sekitarnya.']}],
    'sumber': 'Pantauan udara tim BNPB, 31 Okt 2026',
}

PETA = {
    'jenis': 'temuan-peta', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'rasio': 0.5, 'pesan': 'Sebaran titik per check point',
    'judul': f'Hotspot 31 Oktober menumpuk di PT MSJ: {t("mk.cp5", "|satuan")} di CP-5 dan {t("mk.cp4", "|satuan")} di CP-4; sembilan check point lain paling banyak {t("mk.cp.lain")}',
    'cut_off': False,
    'grup': [{'pil': 'Hari terbang', 'nada': 'data', 'ikon': 'karhutla', 'kartu': [
        {'nilai': t('mk.jagebob31'), 'label': 'hotspot Kecamatan Jagebob', 'ikon': 'wilayah', 'warna': 'merah'},
        {'nilai': t('mk.frp'), 'label': 'MW, FRP tertinggi', 'ikon': 'naik', 'warna': 'navy'}]}],
    'peta': {'png': 'data/merauke/peta-rute.png', 'legenda': {'judul': '31 Oktober', 'item': [{'warna': 'merah', 'label': 'Hotspot'}, {'warna': 'navy', 'label': 'Rute rencana 30 Okt'}]},
             'keyakinan': 'resmi', 'sumber': 'NASA FIRMS, diolah BNPB; citra Esri World Imagery'},
    'panel': {'judul': 'Hotspot dalam {{angka:mk.radius|satuan}} per check point', 'ikon': 'wilayah',
              'data': {'csv': 'data/merauke/cp.csv', 'kolom': [{'nama': 'cp', 'kepala': 'CP'}, {'nama': 'lokasi', 'kepala': 'Lokasi'}, {'nama': 'titik', 'kepala': 'Titik', 'fmt': '0'}, {'nama': 'frp', 'kepala': 'FRP maks (MW)', 'fmt': '1'}],
                       'keyakinan': 'resmi', 'sumber': S_T},
              'peringkat': False,
              'daftar': ['CP-4 dan CP-5 berjarak dekat sehingga lingkarannya bertumpang tindih; angkanya tidak dijumlahkan.', 'Lahan perusahaan ditentukan dari data konsesi sistem; hotspot dihitung dalam radius check point, bukan batas izin.', 'Lahan PT Medcopapua Alam Lestari (CP-7) tidak mencatat hotspot pada 31 Oktober.']},
    'sumber': 'NASA FIRMS (VIIRS dan MODIS), diolah BNPB, 31 Okt 2026 WIB, termasuk keyakinan rendah; Renlap rute udara BNPB, 30 Okt 2026',
}

SEBAR = {
    'jenis': 'galeri', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Api menyebar',
    'judul': f'Api dibiarkan menjalar ke hutan dan dekat permukiman; Merauke mencatat {t("mk.kab31", "|satuan")} pada hari terbang',
    'cut_off': False, 'kolom_panel': 2,
    'panel': [
        {'judul': 'Hutan di sekitar lahan terbuka', 'ikon': 'karhutla', 'kolom_foto': 2, 'bobot': 3, 'foto': [
            {'berkas': 'foto/udara-20.jpg', 'keterangan': 'Kepulan asap di hutan, banyak pohon mati'},
            {'berkas': 'foto/udara-23.jpg', 'keterangan': 'Asap di batas hutan dan lahan terbuka'},
            {'berkas': 'foto/udara-30.jpg', 'keterangan': 'Asap di savana dekat kampung dan jalan'},
            {'berkas': 'foto/udara-37.jpg', 'keterangan': 'Asap di belakang permukiman dan sawah Kurik'}]},
        {'judul': 'Tiga hari terakhir', 'ikon': 'naik', 'bobot': 2, 'skala_huruf': 1.5, 'daftar': [
            f'Hotspot Kabupaten Merauke: {t("mk.kab29", "|satuan")} pada 29 Oktober, {t("mk.kab30", "|satuan")} pada 30 Oktober, {t("mk.kab31", "|satuan")} pada 31 Oktober.',
            f'Jagebob mencatat hotspot terbanyak se-kabupaten: {t("mk.jagebob31", "|satuan")} pada 31 Oktober.',
            'Rawa dan dasar sungai mengering, sehingga bahan bakar banyak dan sumber air untuk pemadaman makin sedikit.',
            'Kabut asap tebal terlihat di seluruh jalur terbang.',
            'Lahan PT Selaras Inti Semesta dan PT Medcopapua Alam Lestari hampir tanpa hotspot pada hari yang sama.',
            'Video dari helikopter memperlihatkan banyak kepulan asap tipis sekaligus di cakrawala, di belakang kampung dan petak sawah.']}],
    'sumber': SUM_T,
}

RUTE = {
    'jenis': 'temuan-peta', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'rasio': 0.56, 'pesan': 'Rencana terbang terhambat asap',
    'judul': f'Rute {t("mk.cp.jumlah", "|satuan")} ({t("mk.rute.km", "|satuan")}) tidak bisa diterbangi penuh: api besar, jarak pandang rendah',
    'cut_off': False,
    'grup': [{'pil': 'Rencana 30 Oktober', 'nada': 'data', 'ikon': 'kalender', 'kartu': [
        {'nilai': t('mk.cp.jumlah'), 'label': 'check point', 'ikon': 'wilayah', 'warna': 'navy'},
        {'nilai': t('mk.rute.km'), 'label': 'km rute melingkar', 'ikon': 'luas', 'warna': 'navy'},
        {'nilai': t('mk.rute.mnt'), 'label': 'menit terbang', 'ikon': 'kalender', 'warna': 'navy'}]}],
    'peta': {'png': 'foto/renlap-udara-01.png', 'legenda': {'judul': 'Renlap 30 Oktober', 'item': [{'warna': 'merah', 'label': 'Hotspot sehari'}, {'warna': 'navy', 'label': 'Rute udara'}]}, 'keyakinan': 'resmi', 'sumber': 'Renlap rute udara BNPB, 30 Okt 2026'},
    'panel': {'judul': 'Pelajaran dari penerbangan 31 Oktober', 'ikon': 'peringatan', 'skala_huruf': 1.8, 'daftar': [
        f'**Api lebih besar dari perkiraan.** Saat rute disusun ada {t("rl.titik", "|satuan")} di dalam segitiga; pada hari terbang Merauke mencatat {t("mk.kab31", "|satuan")}.',
        '**Jarak pandang rendah.** Kabut asap menutup horizon, sehingga helikopter tidak aman melintas ke semua check point.',
        f'**Data tepat sasaran.** Cluster yang dilihat tim sama dengan cluster terpadat di data satelit: {t("mk.cp5", "|satuan")} di CP-5.']},
    'sumber': 'Renlap rute udara BNPB, 30 Okt 2026; pantauan udara tim BNPB, 31 Okt 2026',
}

METODE = {
    'jenis': 'kesimpulan', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Metode renlap berbasis data',
    'judul': 'Renlap kini disusun dari deteksi panas sampai pompa dan sumber air terdekat, sehingga regu dan pesawat tidak bergerak sembarang',
    'cut_off': False, 'skala_isi': 1.15,
    'kartu': [
        {'label': 'Langkah ke-1', 'ikon': 'karhutla', 'warna': 'navy', 'judul': 'Deteksi panas', 'sub': 'Satelit, ' + 'otomatis', 'isi': f'Hotspot VIIRS dan MODIS ditarik tiap {t("mk.jam", "|satuan")}, lalu dipetakan sampai kecamatan.'},
        {'label': 'Langkah ke-2', 'ikon': 'wilayah', 'warna': 'navy', 'judul': 'Pilih api nyata', 'sub': 'Check point', 'isi': f'Kelompok paling sedikit {t("mk.min.titik", "|satuan")} atau FRP {t("mk.min.frp", "|satuan")} ke atas dijadikan check point.'},
        {'label': 'Langkah ke-3', 'ikon': 'kapasitas', 'warna': 'navy', 'judul': 'Rute udara', 'sub': 'Flight plan pilot', 'isi': 'Urutan check point, haluan, jarak, waktu, serta berkas GPX dan KML untuk pilot.'},
        {'label': 'Langkah ke-4', 'ikon': 'air-baku', 'warna': 'oranye', 'judul': 'Sumber air terdekat', 'sub': 'Renlap darat', 'isi': f'Contoh Kalimantan Tengah 1 November: {t("sp.lokasi", "|satuan")}, air {t("sp.air.min", "|satuan")} sampai {t("sp.air.maks", "|satuan")} dari petak.'},
        {'label': 'Langkah ke-5', 'ikon': 'kapasitas', 'warna': 'oranye', 'judul': 'Pompa dan selang', 'sub': 'Dihitung per lokasi', 'isi': f'Panjang selang sampai {t("sp.selang.maks", "|satuan")}, debit paling sedikit {t("sp.debit", "|satuan")} untuk satu kit.'},
        {'label': 'Langkah ke-6', 'ikon': 'kalender', 'warna': 'oranye', 'judul': 'Rencana kunjungan', 'sub': 'Per tim dan per hari', 'isi': 'Urutan lokasi, jarak jalan, waktu mobil, titik parkir, dan tautan Google Maps.'},
        {'label': 'Langkah ke-7', 'ikon': 'data', 'warna': 'navy', 'judul': 'Dossier di HP regu', 'sub': 'PDF siap pakai', 'isi': 'Peta, koordinat yang bisa diklik, dan citra tiap lokasi dikirim ke regu dan pilot.'},
        {'label': 'Langkah ke-8', 'ikon': 'peringatan', 'warna': 'navy', 'judul': 'Putuskan sore sebelumnya', 'sub': 'Jalan atau tunda', 'isi': 'Tiap sore sebelum berangkat, rencana dicek ulang dengan hotspot terbaru dan prakiraan asap.'}],
    'arahan': {'label': 'Keunggulan', 'ikon': 'data', 'isi_bawah': True,
               'teks': 'Satu data yang sama menunjuk api nyata, sumber air terdekat, dan jalur regu, sehingga helikopter dan regu darat tidak bergerak sembarang.'},
    'sumber': 'Renlap rute udara BNPB, 30 Okt 2026; Renlap SIPPA Kalimantan Tengah, 1 Nov 2026',
}

RTL = {
    'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Rencana tindak lanjut',
    'judul': f'Rekomendasi tindak lanjut {t("mk.hari", "|satuan")} ke depan untuk cluster PT Merauke Sawit Jaya',
    'cut_off': False, 'sumber': 'Rangkuman temuan pantauan udara dan data hotspot',
    'rekomendasi': [
        {'kode': 'R-1', 'jenis': 'kapasitas', 'langkah': 'Padamkan cluster Jagebob', 'waktu': 'segera', 'rincian': 'Water bombing dan regu darat diarahkan ke CP-4 sampai CP-5, memakai sungai terdekat sebagai titik isi air.', 'lembaga': ['Deputi Penanganan Darurat', 'BPBD Papua Selatan', 'Manggala Agni']},
        {'kode': 'R-2', 'jenis': 'regulasi', 'langkah': 'Hentikan pembakaran PT MSJ', 'waktu': 'segera', 'rincian': 'Perusahaan dipanggil untuk klarifikasi, diminta menghentikan pembakaran dan memadamkan api di areal serta sekitarnya.', 'lembaga': ['Pemkab Merauke', 'Kementerian Pertanian']},
        {'kode': 'R-3', 'jenis': 'regulasi', 'langkah': 'Tegakkan hukum pembakaran', 'waktu': 'sepekan', 'rincian': 'Foto udara, video, dan data hotspot diserahkan sebagai bahan penyelidikan dugaan pembakaran lahan.', 'lembaga': ['Kementerian Lingkungan Hidup', 'Polri']},
        {'kode': 'R-4', 'jenis': 'data', 'langkah': 'Perbarui rute tiap pagi', 'waktu': 'segera', 'rincian': 'Renlap rute udara diperbarui tiap pagi dari hotspot terbaru dan prakiraan asap sebelum helikopter lepas landas.', 'lembaga': ['Pusdalops BNPB', 'Tim Ahli BNPB']},
        {'kode': 'R-5', 'jenis': 'kapasitas', 'langkah': 'Pompa portabel dekat air', 'waktu': 'sepekan', 'rincian': 'Renlap darat SIPPA disusun untuk Merauke: petak, sumber air, panjang selang, dan rencana kunjungan regu.', 'lembaga': ['Tim Ahli BNPB', 'BPBD Papua Selatan']},
        {'kode': 'R-6', 'jenis': 'kapasitas', 'langkah': 'Lindungi warga dari asap', 'waktu': 'sepekan', 'rincian': 'Masker dan layanan ISPA disiapkan di Kurik, Semangga, dan Jagebob.', 'lembaga': ['Dinas Kesehatan', 'BPBD Papua Selatan']}],
}


def lamp(kode, judul, panel, sumber):
    return {'jenis': 'galeri', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': judul, 'kode': kode, 'judul': judul,
            'cut_off': False, 'kolom_panel': len(panel), 'panel': panel, 'sumber': sumber}


def hal(judul, berkas, ket):
    return {'judul': judul, 'ikon': 'data', 'kolom_foto': 1, 'foto': [{'berkas': berkas, 'utuh': True, 'keterangan': ket}]}


S_RL, S_SP = 'Renlap rute udara BNPB, 30 Okt 2026', 'Renlap SIPPA Kalimantan Tengah, 1 Nov 2026'
def lp(kode, judul, berkas, nama, butir, sumber, tegak=False, sk=None):
    from PIL import Image
    w, h = Image.open(AKAR / berkas).size
    lebar = min(max(w / h * 330, 300), 640)   # lebar panel gambar (pt) mengikuti bentuk halaman, tinggi isi panel sekitar 330 pt
    bi = round(lebar / (900 - lebar), 2)
    return lamp(kode, judul, [dict(hal(nama, berkas, sumber), bobot=bi), {'judul': 'Keterangan lampiran', 'ikon': 'ringkasan', 'bobot': 1, 'skala_huruf': sk or (1.9 if bi < 1.2 else (1.45 if bi > 2 else 1.75)), 'daftar': butir}], sumber)


LAMP = [
    lp('AA', 'Lampiran A1. Renlap rute udara 30 Oktober: peta check point dan urutan terbang', 'foto/renlap-udara-01.png', 'Rute dan urutan check point', [
        'Rute melingkari segitiga Bandara Mopah, lahan PT Merauke Sawit Jaya, dan lahan PT Medcopapua Alam Lestari.',
        'Check point hanya dipasang di kelompok api nyata dari hotspot terbaru, dengan radius pandang {{angka:mk.radius|satuan}}.',
        'Tabel kanan memuat koordinat, jumlah hotspot, jarak tempuh, dan waktu kumulatif tiap check point.',
        'Seluruh halaman aslinya ada di Lampiran D berkas ini.',
        'Rute bisa disusun ulang dalam hitungan menit bila hotspot berubah.'], S_RL),
    lp('AB', 'Lampiran A2. Flight plan untuk pilot: haluan, jarak, dan waktu tiap leg', 'foto/renlap-udara-02.png', 'Flight plan per leg', [
        'Tiap leg memuat koordinat GPS tujuan dalam derajat-menit, tautan Google Maps, haluan sejati, jarak, dan waktu.',
        'Jarak ditulis dalam kilometer dan mil laut, siap dibaca pilot.',
        'Kolom kanan menjelaskan cara membaca rute dan hal yang perlu diputuskan sebelum lepas landas.',
        'Berkas GPX dan KML ikut dikirim untuk perangkat navigasi.',
        'Leg yang tertutup asap bisa dilewati tanpa menyusun ulang seluruh rute.'], S_RL, sk=1.6),
    lp('AC', 'Lampiran A3. Halaman rinci tiap check point: citra dan daftar hotspot', 'foto/renlap-udara-03.png', 'CP-1 Semangga', [
        'Satu halaman untuk tiap check point: citra satelit dengan lingkaran radius pandang dan arah datang pesawat.',
        'Koordinat dalam dua format dan tombol Google Maps.',
        'Daftar hotspot di sekitar check point: jam deteksi, sensor, FRP, dan jarak dari check point.',
        'Renlap memuat halaman serupa untuk semua check point.',
        'Tim di helikopter bisa mencocokkan api yang terlihat dengan hotspot di daftar.'], S_RL),
    lp('BA', 'Lampiran B1. Renlap darat SIPPA Kalimantan Tengah: lokasi, sumber air terdekat, dan panjang selang', 'foto/renlap-pilot-01.png', 'Lima lokasi urut sumber air', [
        'Contoh renlap darat yang sama mesinnya dengan renlap udara, dibuat 1 November untuk Kalimantan Tengah.',
        f'Petak dipilih di hotspot terbaru, lalu dicari sumber air terdekat: {t("sp.air.min", "|satuan")} sampai {t("sp.air.maks", "|satuan")} dari petak.',
        f'Panjang selang, jumlah gulung, dan pompa tambahan dihitung per lokasi; selang terpanjang {t("sp.selang.maks", "|satuan")}.',
        'Tiap lokasi punya koordinat petak, pompa, dan titik parkir.',
        'Lokasi yang sumber airnya terlalu jauh dikeluarkan dari daftar.'], S_SP, True),
    lp('BB', 'Lampiran B2. Contoh Kalimantan Tengah: rencana kunjungan regu darat per tim dan per hari', 'foto/renlap-pilot-02.png', 'Rencana kunjungan per tim', [
        'Urutan kunjungan per tim dan per hari, dari titik awal ke tiap lokasi.',
        'Jarak lurus, jarak jalan, waktu mobil, dan jalan kaki dari titik parkir.',
        'Tautan Google Maps langsung ke titik parkir tiap lokasi.',
        'Pola yang sama bisa dipakai untuk regu darat di Merauke; halaman aslinya di Lampiran E.',
        'Dua tim bisa bergerak bersamaan tanpa saling tumpang tindih.'], S_SP, sk=1.85),
    lp('BC', 'Lampiran B3. Contoh Kalimantan Tengah: cara uji pompa dan keselamatan regu di petak', 'foto/renlap-pilot-03.png', 'Cara uji dan keselamatan', [
        'Cara mengukur efektivitas suntikan air ke bara di tiap lokasi.',
        f'Debit sumber air diukur dulu: paling sedikit {t("sp.debit", "|satuan")} untuk satu kit.',
        'Aturan keselamatan regu: arah angin, jalur keluar, dan batas kerja.',
        'Keputusan jalan atau tunda diambil sore sebelumnya dari hotspot terbaru.',
        'Alat tambahan per regu tercantum: lance, termometer tusuk, dan bor gambut.'], S_SP, sk=1.6),
    lamp('CA', 'Lampiran C. Foto udara lain dari pantauan 31 Oktober', [
        {'judul': 'Foto udara lain, 31 Oktober', 'ikon': 'karhutla', 'kolom_foto': 4, 'foto': [
            {'berkas': 'foto/udara-12.jpg', 'keterangan': 'Lahan terbuka di tepi hutan'},
            {'berkas': 'foto/udara-09.jpg', 'keterangan': 'Rawa mengering'},
            {'berkas': 'foto/udara-27.jpg', 'keterangan': 'Petak bergaris hitam bekas api'},
            {'berkas': 'foto/udara-16.jpg', 'keterangan': 'Sungai di bawah kabut asap'},
            {'berkas': 'foto/udara-02.jpg', 'keterangan': 'Asap di tepi lahan terbuka'},
            {'berkas': 'foto/udara-22.jpg', 'keterangan': 'Kepulan asap di hutan'},
            {'berkas': 'foto/udara-32.jpg', 'keterangan': 'Asap di dekat permukiman'},
            {'berkas': 'foto/video-asap.jpg', 'keterangan': 'Cuplikan video: banyak kepulan asap'}]}], 'Pantauan udara tim BNPB, 31 Okt 2026'),
]

PENUTUP = {'jenis': 'penutup', 'foto': 'foto/udara-20.jpg', 'logo_kanan': 'foto/berakhlak-hd.png', 'kredit': 'Foto: pantauan udara tim BNPB', 'teks': 'Terima Kasih',
           'laporan': 'Pantauan udara Kabupaten Merauke, 31 Oktober 2026'}

SPEK = {
    '_catatan': 'Hasil pantauan udara karhutla Merauke 31 Okt 2026 untuk Kepala BNPB. Dibangun dari spek/bangun_spek_merauke.py.',
    'pesan_kunci': 'Lahan di Merauke dibuka dengan api: semak dibakar dulu, pohon ditumbangkan sesudahnya; api terpusat di cluster PT Merauke Sawit Jaya.',
    'judul_dokumen': 'Pantauan Udara Karhutla Merauke',
    'subjek_dokumen': 'Pantauan udara 31 Oktober 2026',
    'kajian': 'merauke', 'format': 'kajian', 'tanggal': '2026-11-01', 'cut_off': '31 Okt 2026, 23.59 WIT',
    'bagian': [{'judul': 'Temuan Pantauan Udara', 'label': 'Temuan lapangan'}, {'judul': 'Metode Renlap', 'label': 'Metode renlap'}],
    'slide': [SAMPUL, RINGKAS, {'jenis': 'daftar-isi'}, {'jenis': 'pembatas-seksi', 'bagian': 1}, MODUS, PETA, SEBAR, RUTE, {'jenis': 'pembatas-seksi', 'bagian': 2}, METODE, PENUTUP],
}

# berkas lampiran terpisah (pemilik 1 Nov: "lampiran jadi file lain")
SAMPUL_L = dict(SAMPUL, kepada='Lampiran laporan untuk Kepala BNPB')
SPEK_L = dict(SPEK, _catatan='Lampiran pantauan udara Merauke 31 Okt 2026. Dibangun dari spek/bangun_spek_merauke.py; halaman renlap asli ditempel gabung_lampiran.py.',
              judul_dokumen='Lampiran Pantauan Udara Karhutla Merauke', kajian='merauke-lampiran',
              bagian=[{'judul': 'Renlap Rute Udara Merauke', 'label': 'Renlap udara'}, {'judul': 'Contoh Renlap Darat SIPPA', 'label': 'Renlap darat'},
                      {'judul': 'Foto Udara dan Berkas Asli Renlap', 'label': 'Foto dan berkas asli'}],
              slide=[SAMPUL_L, {'jenis': 'daftar-isi'}, {'jenis': 'pembatas-seksi', 'bagian': 1}] + LAMP[0:3]
                    + [{'jenis': 'pembatas-seksi', 'bagian': 2}] + LAMP[3:6] + [{'jenis': 'pembatas-seksi', 'bagian': 3}] + LAMP[6:])

if __name__ == '__main__':
    rp = AKAR / 'data/angka.json'
    reg = json.loads(rp.read_text(encoding='utf-8'))
    reg['angka'].update(ANGKA)
    rp.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    pp = AKAR / 'pustaka.json'
    pu = [x for x in json.loads(pp.read_text(encoding='utf-8')) if x['id'] not in {p['id'] for p in PUSTAKA}] + PUSTAKA
    pp.write_text(json.dumps(pu, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/pantau-merauke.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    (AKAR / 'spek/lampiran-merauke.json').write_text(json.dumps(SPEK_L, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(ANGKA)} angka, {len(SPEK["slide"])} slide')
