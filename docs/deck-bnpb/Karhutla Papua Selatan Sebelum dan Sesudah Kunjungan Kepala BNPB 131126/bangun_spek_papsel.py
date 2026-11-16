#!/usr/bin/env python3
"""Karhutla Papua Selatan sebelum dan sesudah kunjungan Kepala BNPB ke Merauke (31 Okt 2026): luas terbakar dan kecepatan padam.

Jalankan dari akar proyek-papsel: python spek/bangun_spek_papsel.py; lalu dari folder bnpb:
.venv/Scripts/python scripts/deck.py assets/proyek-papsel/spek/papsel-kunjungan.json "<keluar>.pptx" --pdf --akar assets/proyek-papsel
"""
import json
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from data_papsel import bangun  # noqa: E402

CT = 'centurisk-karhutla-2026-11-13'
KL = 'centurisk-cluster-papsel-2026-11-12'
RL = 'bnpb-renlap-udara-merauke-2026-10-30'
IP = 'infopublik-bnpb-karhutla-2026-10-30'
S_CT = 'NASA FIRMS, diolah Centurisk BNPB, 13 Nov 2026'
S_KL = 'Cluster hotspot Centurisk BNPB, 21 Okt sampai 12 Nov 2026'
S_IP = 'InfoPublik, 30 Okt 2026'
S_GAB = 'NASA FIRMS, diolah Centurisk BNPB (luas harian dan cluster), 13 Nov 2026'
ANGKA = {}


def a(k, nilai, satuan, pustaka, sumber, keyakinan='resmi', catatan=None):
    ANGKA[k] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pustaka, 'sumber': sumber, 'keyakinan': keyakinan}
    if catatan:
        ANGKA[k]['catatan'] = catatan


def t(k, o=''):
    return '{{angka:ps.%s%s}}' % (k, o)


R = bangun()
EM = 'estimasi-model'
LV = 'resmi'   # luas dan belum padam = hitungan satelit sistem, angka laporan penanganan (selera 4.09)
for k in ('luas', 'belum'):
    a(f'seb.{k}.hari', R[f'seb.{k}.hari'], 'ha', CT, S_CT, LV, f'rata-rata harian 21 sampai 30 Okt 2026, Papua Selatan')
    a(f'ses.{k}.hari', R[f'ses.{k}.hari'], 'ha', CT, S_CT, LV, f'rata-rata harian 1 sampai 10 Nov 2026, Papua Selatan')
    a(f'ubah.{k}', R[f'ubah.{k}'], '%', CT, S_CT, LV, 'sepuluh hari sesudah dibanding sepuluh hari sebelum kunjungan')
a('seb.hot.hari', R['seb.hot.hari'], 'titik', CT, S_CT, catatan='rata-rata harian 21 sampai 30 Okt 2026')
a('ses.hot.hari', R['ses.hot.hari'], 'titik', CT, S_CT, catatan='rata-rata harian 1 sampai 10 Nov 2026')
a('ubah.hot', R['ubah.hot'], '%', CT, S_CT)
a('das1.luas', R['das1.luas'], 'ha', CT, S_CT, LV, 'rata-rata harian 1 sampai 10 Okt 2026')
a('okt.luas', R['okt.luas'], 'ha', CT, S_CT, LV, 'Oktober 2026')
a('nov.luas', R['nov.luas'], 'ha', CT, S_CT, LV, '1 sampai 12 Nov 2026')
a('nas.porsi', R['nas.porsi'], '%', CT, S_CT, LV, 'porsi Papua Selatan dalam luas terbakar nasional 1 sampai 12 Nov 2026')
a('mk.porsi', R['mk.porsi.ses'], '%', CT, S_CT, LV, 'porsi Merauke dalam luas Papua Selatan 1 sampai 10 Nov 2026')
a('luar.porsi', R['luar.porsi'], '%', CT, S_CT, LV, 'porsi penurunan luas provinsi yang berasal dari kabupaten selain Merauke')
a('mk.ubah', R['mk.ubah'], '%', CT, S_CT, LV, 'luas terbakar Merauke, 1 sampai 10 Nov dibanding 21 sampai 30 Okt 2026')
kec = {nm: {r[0]: r[1] for r in R[f'kec.{nm}.top']} for nm in ('seb', 'ses')}
import csv  # noqa: E402
for nm in ('seb', 'ses'):
    with (AKAR / f'data/papsel/kec_{nm}.csv').open(encoding='utf-8') as f:
        kec[nm] = {r['kecamatan']: int(r['hotspot']) for r in csv.DictReader(f)}
a('jgb.ubah', round((kec['ses']['Jagebob'] / kec['seb']['Jagebob'] - 1) * 100), '%', CT, S_CT, catatan='hotspot Kecamatan Jagebob')
a('ktr.ubah', round((kec['ses']['Kontuar'] / kec['seb']['Kontuar'] - 1) * 100), '%', CT, S_CT, catatan='hotspot Kecamatan Kontuar')
a('kmm.ubah', round((kec['ses']['Kimaam'] / kec['seb']['Kimaam'] - 1) * 100), '%', CT, S_CT, catatan='hotspot Kecamatan Kimaam')
for k in ('seb', 'ses'):
    a(f'kl.{k}.p9', R[f'kl.{k}.p9'], '%', KL, S_KL, EM, 'porsi cluster yang menyala lebih dari 3 hari')
    a(f'kl.{k}.p1', R[f'kl.{k}.p1'], '%', KL, S_KL, EM, 'porsi cluster yang padam dalam 1 hari')
    a(f'kl.{k}.n', R[f'kl.{k}.n'], 'cluster', KL, S_KL)
    a(f'kl.{k}.aktif', R[f'kl.{k}.aktif'], 'cluster', KL, S_KL, catatan='masih menyala pada akhir data, 12 Nov 2026')
a('hari.banding', 10, 'hari', CT, S_CT, 'asumsi-kebijakan', 'panjang jendela banding sebelum dan sesudah')
a('hari.padam', 2, 'hari', CT, S_CT, 'asumsi-kebijakan', 'tanpa hotspot dua hari = padam')
a('hari.lama', 3, 'hari', KL, S_KL, 'asumsi-kebijakan', 'batas cluster lama')
a('omc.sorti', 10, 'sorti', IP, S_IP, catatan='OMC Papua Selatan sampai hari ketujuh, sebelum kunjungan')
for i, v in enumerate((100, 1000, 5000, 10000)):
    a(f'kelas{i}', v, 'ha', CT, S_CT, 'asumsi-kebijakan', 'batas kelas peta')

PUSTAKA = [
    {'id': CT, 'type': 'dataset', 'author': [{'literal': 'Centurisk BNPB, olahan NASA FIRMS'}], 'issued': {'date-parts': [[2026, 11, 13]]},
     'title': 'Luas terbakar, belum padam, dan hotspot harian per provinsi, kabupaten, dan kecamatan 2026 (peta_karhutla.json, peta_karhutla_kab.json)',
     'URL': 'https://centurisk97.id/data/peta_karhutla.json', 'verifikasi': 'primer'},
    {'id': KL, 'type': 'dataset', 'author': [{'literal': 'Centurisk BNPB, olahan NASA FIRMS'}], 'issued': {'date-parts': [[2026, 11, 12]]},
     'title': 'Arsip cluster hotspot harian 21 Okt sampai 12 Nov 2026 (kluster.json), Papua Selatan, digabung per lokasi sekitar 1 km',
     'URL': 'https://centurisk97.id/data/kluster.json', 'verifikasi': 'primer'},
    {'id': IP, 'type': 'article-newspaper', 'author': [{'literal': 'InfoPublik'}], 'issued': {'date-parts': [[2026, 10, 30]]},
     'title': 'BNPB Intensifkan Penanganan Karhutla, Waspadai Siklon Tropis 91B',
     'URL': 'https://infopublik.id/kategori/bencana/995213/bnpb-intensifkan-penanganan-karhutla-waspadai-siklon-tropis-91b', 'verifikasi': 'sekunder'},
]

FOTO = 'Foto: kegiatan udara tim BNPB'
SAMPUL = {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': 'foto/udara-20.jpg', 'kota': 'Jakarta', 'kredit': FOTO,
          'logo_kanan': 'foto/berakhlak-hd.png', 'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana',
          'subjudul': 'Luas terbakar dan kecepatan pemadaman, 21 Oktober sampai 12 November 2026',
          'penyaji': {'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'}}

RINGKAS = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan eksekutif', 'rasio': 0.52,
    'judul': 'Ringkasan eksekutif: sesudah kunjungan, kebakaran di Papua Selatan terus mengecil dan api padam lebih cepat, tetapi Merauke belum aman',
    'cut_off': False,
    'grup': [{'pil': 'Sesudah dibanding sebelum kunjungan', 'nada': 'data', 'ikon': 'turun', 'kartu': [
        {'nilai': t('ubah.luas', '|persen|arah'), 'label': 'luas lahan terbakar per hari', 'ikon': 'luas', 'warna': 'navy'},
        {'nilai': t('ubah.belum', '|persen|arah'), 'label': 'luas api belum padam per hari', 'ikon': 'karhutla', 'warna': 'navy'}]},
        {'pil': 'Cluster api yang menyala lebih dari tiga hari', 'nada': 'perhatian', 'ikon': 'kalender', 'kartu': [
            {'nilai': t('kl.seb.p9', '|persen'), 'label': 'sebelum kunjungan', 'ikon': 'karhutla', 'warna': 'merah'},
            {'nilai': t('kl.ses.p9', '|persen'), 'label': 'sesudah kunjungan', 'ikon': 'turun', 'warna': 'merah'}]}],
    'grafik': {'judul_panel': 'Luas lahan terbakar per hari terus mengecil', 'ikon': 'luas', 'keluarga': 'api',
               'judul': '**Luas terbakar**, hektare per hari',
               'data': {'csv': 'data/papsel/ringkas_luas.csv', 'kolom': [{'nama': 'periode'}, {'nama': 'Luas terbakar per hari', 'fmt': '0'}],
                        'keyakinan': 'resmi', 'sumber': S_CT}},
    'panel': {'judul': 'Apa artinya', 'ikon': 'ringkasan', 'daftar': [
        f'**Api padam lebih cepat.** Cluster api yang padam dalam sehari naik dari {t("kl.seb.p1", "|persen")} menjadi {t("kl.ses.p1", "|persen")}.',
        f'**Lokasi tinjauan mereda.** Hotspot di Jagebob {t("jgb.ubah", "|persen|arah")}, tetapi api bertahan di Kontuar dan bertambah di Kimaam.',
        f'**Penurunan terbesar di luar Merauke.** Sebanyak {t("luar.porsi", "|persen")} penurunan luas berasal dari tiga kabupaten lain; luas terbakar Merauke hanya {t("mk.ubah", "|persen|arah")}.',
        f'**Terluas di Indonesia.** Sejak awal November Papua Selatan menyumbang {t("nas.porsi", "|persen")} luas terbakar nasional.',
        '**Faktor lain ikut berperan.** Ada peluang awan hujan di selatan Merauke pada akhir Oktober, dan operasi modifikasi cuaca sudah berjalan sebelum kunjungan.']},
    'sumber': f'{S_GAB}; {S_IP}',
}

LUAS = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Tren luas terbakar', 'rasio': 0.63,
    'judul': f'Luas terbakar harian sudah turun sejak awal Oktober; sesudah kunjungan rata-ratanya turun lagi menjadi {t("ses.luas.hari", "|satuan")}',
    'cut_off': False,
    'utama': {'judul': 'Luas terbakar dan belum padam harian, Papua Selatan', 'ikon': 'luas', 'gambar': True, 'subjudul_grafik': 'Hektare per hari, Oktober sampai pertengahan November 2026',
              'garis': {'data': {'csv': 'data/papsel/harian.csv', 'kolom': [{'nama': 'hari'}, {'nama': 'Luas terbakar', 'fmt': '0'}, {'nama': 'Belum padam', 'fmt': '0'}],
                                 'keyakinan': 'resmi', 'sumber': S_CT},
                        'sorot': 'Luas terbakar', 'zona': {'dari': '31 Okt', 'sampai': '12 Nov', 'label': 'Sesudah kunjungan'}, 'mulai_nol': True, 'skala_huruf': 1.1}},
    'panel': {'judul': 'Rata-rata per sepuluh hari', 'ikon': 'kalender',
              'data': {'csv': 'data/papsel/dasarian.csv', 'kolom': [{'nama': 'periode', 'kepala': 'Periode'}, {'nama': 'luas', 'kepala': 'Luas (ha)', 'fmt': '0'},
                                                                    {'nama': 'belum', 'kepala': 'Belum padam (ha)', 'fmt': '0'}, {'nama': 'hot', 'kepala': 'Hotspot', 'fmt': '0'}],
                       'keyakinan': 'resmi', 'sumber': S_CT, 'sorot': ['Awal Nov']},
              'peringkat': False,
              'skala_huruf': 1.5,
              'daftar': ['Hari kunjungan tidak ikut dihitung. Periode sebelum dan sesudah sama panjang, masing-masing sepuluh hari.',
                         f'Sesudah kunjungan, hotspot rata-rata {t("ubah.hot", "|persen|arah")} dibanding sepuluh hari sebelumnya.',
                         'Penurunan terbesar terjadi antara pertengahan dan akhir Oktober, sebelum kunjungan.',
                         'Lonjakan pada awal November menunjukkan api masih bisa menyala lagi bila cuaca kering.',
                         'Luas harian pada puncak awal Oktober lebih dari sepuluh kali rata-rata sesudah kunjungan.',
                         'Belum padam adalah bagian luas terbakar yang apinya masih bertahan dari hari sebelumnya.']},
    'sumber': S_CT,
}

PETA = {
    'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'pesan': 'Sebaran hotspot bergeser', 'rasio': 0.5, 'ulang_angka_boleh': 'dua peta sebanding memakai lingkaran acuan legenda yang sama',
    'judul': f'Hotspot di Jagebob, lokasi tinjauan, {t("jgb.ubah", "|persen|arah")} sesudah kunjungan; api kini terpusat di Kontuar dan Kimaam',
    'cut_off': False,
    'utama': {'judul': 'Sepuluh hari sebelum kunjungan', 'ikon': 'karhutla', 'gambar': True,
              'peta': {'mode': 'titik', 'tingkat': 'kabupaten', 'wilayah': ['93'], 'satuan': 'Hotspot', 'label': 3, 'skala_huruf': 0.9, 'warna_titik': 'merah',
                       'data': {'csv': 'data/papsel/kec_seb.csv', 'kolom': [{'nama': 'kecamatan'}, {'nama': 'hotspot', 'kepala': 'Hotspot', 'fmt': '0'},
                                                                           {'nama': 'lon', 'fmt': '4'}, {'nama': 'lat', 'fmt': '4'}],
                                'keyakinan': 'resmi', 'sumber': S_CT}}},
    'panel': {'judul': 'Sepuluh hari sesudah kunjungan', 'ikon': 'karhutla', 'gambar': True,
              'peta': {'mode': 'titik', 'tingkat': 'kabupaten', 'wilayah': ['93'], 'satuan': 'Hotspot', 'label': 3, 'skala_huruf': 0.9, 'warna_titik': 'merah',
                       'data': {'csv': 'data/papsel/kec_ses.csv', 'kolom': [{'nama': 'kecamatan'}, {'nama': 'hotspot', 'kepala': 'Hotspot', 'fmt': '0'},
                                                                           {'nama': 'lon', 'fmt': '4'}, {'nama': 'lat', 'fmt': '4'}],
                                'keyakinan': 'resmi', 'sumber': S_CT}}},
    'sumber': f'{S_CT}; lokasi tinjauan dari Renlap rute udara BNPB, 30 Okt 2026',
}

KAB = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Penurunan di luar Merauke', 'rasio': 0.5,
    'judul': f'Luas terbakar Merauke hanya {t("mk.ubah", "|persen|arah")}, sehingga kini {t("mk.porsi", "|persen")} luas terbakar Papua Selatan ada di Merauke',
    'cut_off': False,
    'utama': {'judul': 'Penurunan luas terbakar per kabupaten', 'ikon': 'wilayah', 'gambar': True,
              'subjudul_grafik': 'Persen turun, sepuluh hari sesudah dibanding sepuluh hari sebelum kunjungan',
              'lollipop': {'data': {'csv': 'data/papsel/kab_turun.csv', 'kolom': [{'nama': 'kab'}, {'nama': 'turun', 'kepala': 'Turun (%)', 'fmt': '1'}],
                                    'keyakinan': 'resmi', 'sumber': S_CT},
                           'sorot': 'Merauke', 'skala_huruf': 1.2}},
    'panel': {'judul': 'Hotspot per kecamatan di Merauke', 'ikon': 'karhutla',
              'data': {'csv': 'data/papsel/kec_banding.csv', 'kolom': [{'nama': 'kecamatan', 'kepala': 'Kecamatan'}, {'nama': 'sebelum', 'kepala': 'Sebelum', 'fmt': '0'},
                                                                       {'nama': 'sesudah', 'kepala': 'Sesudah', 'fmt': '0'}, {'nama': 'ubah', 'kepala': 'Perubahan (%)', 'fmt': '1|arah'}],
                       'keyakinan': 'resmi', 'sumber': S_CT, 'sorot': ['Jagebob', 'Kontuar', 'Kimaam']},
              'peringkat': False,
              'skala_huruf': 1.2,
              'daftar': ['Hotspot Jagebob turun lebih dari separuh, sedangkan hotspot Kimaam naik sekitar seperempat.',
                         'Kimaam berada di Pulau Yos Sudarso, sehingga regu darat sulit menjangkaunya.',
                         'Luas dihitung hanya dari hotspot berkeyakinan sedang dan tinggi, sehingga turunnya bisa berbeda dari jumlah hotspot.']},
    'sumber': S_CT,
}

UMUR = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Kecepatan padam cluster', 'rasio': 0.55,
    'judul': f'Cluster yang menyala lebih dari tiga hari turun dari {t("kl.seb.p9", "|persen")} menjadi {t("kl.ses.p9", "|persen")} sesudah kunjungan',
    'cut_off': False,
    'utama': {'judul': 'Lama api menyala sampai padam', 'ikon': 'karhutla', 'gambar': True, 'subjudul_grafik': 'Persen dari semua api yang mulai menyala pada tiap periode',
              'kolom_tumpuk': {'data': {'csv': 'data/papsel/umur_cluster.csv', 'kolom': [{'nama': 'periode'}, {'nama': 'Sehari atau kurang', 'fmt': '0'},
                                                                                        {'nama': 'Dua sampai tiga hari', 'fmt': '0'}, {'nama': 'Lebih dari tiga hari', 'fmt': '0'}],
                                        'keyakinan': 'estimasi-model', 'sumber': S_KL},
                               'persen': True, 'warna': ['skala.netral.2', 'oranye', 'merah'], 'skala_huruf': 1.1}},
    'panel': {'judul': 'Cara mengukur kecepatan padam', 'ikon': 'kalender', 'daftar': [
        f'Sebanyak {t("kl.ses.aktif", "|satuan")} dari periode sesudah masih menyala pada akhir data dan dihitung sebagai menyala lebih dari tiga hari.',
        f'Api dianggap padam bila tidak ada hotspot selama {t("hari.padam", "|satuan")}; lama menyala dihitung dari hotspot pertama sampai hotspot terakhir.',
        'Sebelum berarti api yang mulai menyala pada lima hari terakhir Oktober; sesudah berarti lima hari pertama November. Kedua jendela sama panjang, dan tiap api diamati paling sedikit enam hari.',
        'Kecepatan padam ini tidak hanya hasil pemadaman; hujan dan habisnya bahan bakar ikut berperan.']},
    'sumber': S_KL,
}

NAS = {
    'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'pesan': 'Terluas nasional', 'rasio': 0.7,
    'judul': f'Walau turun, Papua Selatan kini provinsi dengan luas terbakar terbesar di Indonesia: {t("nas.porsi", "|persen")} luas nasional sejak awal November',
    'cut_off': False,
    'utama': {'judul': 'Luas terbakar per provinsi, awal sampai pertengahan November 2026', 'ikon': 'wilayah', 'gambar': True,
              'peta': {'mode': 'koroplet', 'ambang': [100, 1000, 5000, 10000], 'skala': 'api', 'satuan': 'Luas terbakar (ha)', 'label': 4, 'skala_huruf': 1.1,
                       'data': {'csv': 'data/papsel/nasional_nov.csv', 'kolom': [{'nama': 'provinsi'}, {'nama': 'luas', 'kepala': 'Luas (ha)', 'fmt': '0'}],
                                'keyakinan': 'resmi', 'sumber': S_CT}}},
    'panel': {'judul': 'Yang perlu dicatat', 'ikon': 'peringatan', 'daftar': [
        'Sejak awal November luas terbakar Papua Selatan melampaui Kalimantan Tengah, yang sepanjang Oktober menjadi provinsi terluas.',
        f'Pada Oktober luasnya {t("okt.luas", "|satuan")}, kedua terbesar sesudah Kalimantan Tengah.',
        f'Hotspot Papua Selatan masih rata-rata {t("ses.hot.hari", "|satuan")} per hari sesudah kunjungan.',
        'Merauke tetap memerlukan regu darat dan helikopter sampai hujan merata.']},
    'sumber': S_CT,
}

SIMPUL = {
    'jenis': 'kesimpulan', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Kesimpulan dan arahan',
    'judul': 'Kunjungan disusul penurunan luas terbakar dan pemadaman yang lebih cepat, tetapi api di Merauke belum surut',
    'cut_off': False, 'skala_isi': 1.3,
    'kartu': [
        {'label': 'Luas terbakar', 'ikon': 'luas', 'warna': 'navy', 'judul': 'Luas harian turun', 'isi': f'Rata-rata luas terbakar turun dari {t("seb.luas.hari", "|satuan")} menjadi {t("ses.luas.hari", "|satuan")} per hari.'},
        {'label': 'Belum padam', 'ikon': 'turun', 'warna': 'navy', 'judul': 'Sisa api berkurang', 'isi': f'Belum padam rata-rata {t("ubah.belum", "|persen|arah")} dibanding sepuluh hari sebelum kunjungan.'},
        {'label': 'Kecepatan padam', 'ikon': 'kalender', 'warna': 'navy', 'judul': 'Cluster padam lebih cepat', 'isi': f'Cluster yang padam dalam sehari naik dari {t("kl.seb.p1", "|persen")} menjadi {t("kl.ses.p1", "|persen")}.'},
        {'label': 'Lokasi tinjauan', 'ikon': 'wilayah', 'warna': 'navy', 'judul': 'Jagebob mereda', 'isi': f'Hotspot Jagebob {t("jgb.ubah", "|persen|arah")}, tetapi Kimaam {t("kmm.ubah", "|persen|arah")}.'},
        {'label': 'Merauke', 'ikon': 'peringatan', 'warna': 'oranye', 'judul': 'Penurunan di luar Merauke', 'isi': f'Sebanyak {t("luar.porsi", "|persen")} penurunan luas provinsi berasal dari tiga kabupaten selain Merauke.'},
        {'label': 'Tren', 'ikon': 'turun', 'warna': 'oranye', 'judul': 'Turun sebelum kunjungan', 'isi': f'Luas harian sudah turun dari {t("das1.luas", "|satuan")} pada awal Oktober, sebelum kunjungan.'},
        {'label': 'Faktor lain', 'ikon': 'cuaca-ekstrem', 'warna': 'oranye', 'judul': 'Hujan dan OMC', 'isi': f'Ada peluang awan hujan di selatan Merauke pada akhir Oktober, dan OMC sudah terbang {t("omc.sorti", "|satuan")} sebelum kunjungan.'},
        {'label': 'Nasional', 'ikon': 'karhutla', 'warna': 'oranye', 'judul': 'Terluas di Indonesia', 'isi': f'Sejak awal November Papua Selatan menyumbang {t("nas.porsi", "|persen")} luas terbakar nasional.'}],
    'arahan': {'label': 'Arahan', 'ikon': 'peringatan',
               'teks': 'Pertahankan regu darat dan helikopter di Merauke sampai hujan merata, terutama di Kontuar dan Kimaam yang hotspot-nya masih tinggi.'},
    'sumber': f'{S_GAB}; {S_IP}',
}

PENUTUP = {'jenis': 'penutup', 'foto': 'foto/udara-20.jpg', 'logo_kanan': 'foto/berakhlak-hd.png', 'kredit': FOTO, 'teks': 'Terima Kasih',
           'laporan': 'Karhutla Papua Selatan sebelum dan sesudah kunjungan Kepala BNPB'}

SPEK = {
    '_catatan': 'Karhutla Papua Selatan sebelum dan sesudah kunjungan Kepala BNPB ke Merauke 31 Okt 2026. Dibangun dari spek/bangun_spek_papsel.py.',
    'pesan_kunci': 'Sesudah kunjungan Kepala BNPB ke Merauke, luas terbakar harian Papua Selatan turun dan cluster api padam lebih cepat, tetapi api di Merauke bergeser dan belum surut.',
    'judul_dokumen': 'Karhutla Papua Selatan Sebelum dan Sesudah Kunjungan Kepala BNPB',
    'subjek_dokumen': 'Luas terbakar dan kecepatan pemadaman',
    'kajian': 'papsel-kunjungan', 'format': 'kajian', 'tanggal': '2026-11-13', 'cut_off': '13 Nov 2026, 10.31 WIB',
    'bagian': [{'judul': 'Luas Terbakar', 'label': 'Luas terbakar'}, {'judul': 'Kecepatan Pemadaman', 'label': 'Kecepatan padam'},
               {'judul': 'Posisi Nasional dan Arahan', 'label': 'Nasional dan arahan'}],
    'slide': [SAMPUL, RINGKAS, {'jenis': 'daftar-isi'}, {'jenis': 'pembatas-seksi', 'bagian': 1}, LUAS, PETA, KAB,
              {'jenis': 'pembatas-seksi', 'bagian': 2}, UMUR, {'jenis': 'pembatas-seksi', 'bagian': 3}, NAS, SIMPUL, PENUTUP],
}

TEMA = {'judul': 'Karhutla Papua Selatan Sebelum dan Sesudah Kunjungan Kepala BNPB',
        'subjudul': 'Luas terbakar dan kecepatan pemadaman, 21 Oktober sampai 12 November 2026',
        'judul_pendek': 'Karhutla Papua Selatan', 'nama_berkas': 'Karhutla Papua Selatan Sebelum dan Sesudah Kunjungan Kepala BNPB {DDMMYY}',
        'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
        'kata_kunci': ['BNPB', 'karhutla', 'Papua Selatan', 'Merauke', 'luas terbakar', 'pemadaman'],
        'cakupan_sampul': 'Provinsi Papua Selatan.'}

if __name__ == '__main__':
    ANGKA = {'ps.' + k: v for k, v in ANGKA.items()}
    rp = AKAR / 'data/angka.json'
    reg = json.loads(rp.read_text(encoding='utf-8'))
    reg['angka'].update(ANGKA)
    rp.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    pp = AKAR / 'pustaka.json'
    pu = [x for x in json.loads(pp.read_text(encoding='utf-8')) if x['id'] not in {p['id'] for p in PUSTAKA}] + PUSTAKA
    pp.write_text(json.dumps(pu, ensure_ascii=False, indent=1), encoding='utf-8')
    tp = AKAR / 'tema.json'
    tm = json.loads(tp.read_text(encoding='utf-8'))
    tm['kajian']['papsel-kunjungan'] = TEMA
    tp.write_text(json.dumps(tm, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/papsel-kunjungan.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(ANGKA)} angka, {len(SPEK["slide"])} slide')
