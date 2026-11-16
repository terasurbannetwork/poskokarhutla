#!/usr/bin/env python3
"""Deck karhutla nasional empat minggu sebelum dan sesudah pelantikan Kepala BNPB (15 Okt 2026).

Isi menurut arahan atasan pemilik: info nasional, per provinsi, provinsi dengan api terbesar dan provinsi lainnya, metode berbobot per daerah;
ditambah pembanding pola musim 2012-2024 supaya perbandingan apple to apple. Data dari data_nasional.py.
Jalankan dari folder bnpb: assets/proyek-papsel/bangun-nasional.sh
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from data_nasional import bangun  # noqa: E402

AKAR = Path(__file__).resolve().parents[1]
R = bangun()
CT = 'centurisk-karhutla-2026-11-13'
GW = 'gwis-luas-bulanan-2002-2025'
S_CT = 'NASA FIRMS, diolah Centurisk BNPB, 13 Nov 2026'
S_GW = 'GWIS EU JRC, MODIS MCD64A1, luas terbakar bulanan 2012-2024'
D = 'data/nasional'
ANGKA = {}


def a(k, nilai, satuan, pustaka=CT, sumber=S_CT, keyakinan='resmi', catatan=None):
    ANGKA[f'nas.{k}'] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pustaka, 'sumber': sumber, 'keyakinan': keyakinan}
    if catatan:
        ANGKA[f'nas.{k}']['catatan'] = catatan


def t(k, o=''):
    return '{{angka:nas.%s%s}}' % (k, o)


a('tgl', '15 Oktober 2026', '', catatan='pelantikan Kepala BNPB')
a('tgl.pendek', '15 Okt', '', catatan='pelantikan Kepala BNPB')
a('turun.ses', -R['laju.ses.luas'], '%', catatan='penurunan luas nasional sesudah pelantikan, nilai mutlak')
a('turun.bersih', -R['bersih.ses.luas'], '%', catatan='penurunan luas nasional, hanya hari dengan data satelit lengkap, nilai mutlak')
for nm in ('pra', 'seb', 'ses'):
    a(f'jendela.{nm}', R[f'jendela.{nm}'], '')
for k in ('seb', 'ses'):
    a(f'{k}.luas', R[f'{k}.luas'], 'ha', catatan='rata-rata luas terbakar nasional per hari')
    for x in ('laju.{}.luas', 'laju.{}.belum', 'laju.{}.hot', 'bersih.{}.luas', 'rb.median.{}', 'rp.bobot.{}', 'bl.{}'):
        a(x.format(k), R[x.format(k)], '%')
    a(f'celah.{k}', R[f'celah.{k}'], 'hari', catatan='hari terkena celah lintasan satelit')
a('top1.turun.ha', R['top1.turun.ha'], 'ha', catatan='penurunan luas terbakar Kalimantan Tengah per hari')
a('nas.turun.ha', R['nas.turun.ha'], 'ha', catatan='penurunan luas terbakar nasional per hari')
for x in ('top.laju.ses', 'non.laju.ses', 'top.laju.seb', 'non.laju.seb', 'top.porsi', 'biasa.ubah', 'bobot.ubah', 'top1.kontrib', 'top1.bobot',
          'kunjung.laju.ses', 'lain.laju.ses'):
    a(x, R[x], '%')
a('biasa.n', R['biasa.n'], 'provinsi')
a('kj.n', R['kj.n'], 'daerah', catatan='daerah karhutla yang dikunjungi Kepala BNPB')
a('top.porsi.ses', R['top.porsi.ses'], '%', catatan='porsi enam provinsi api terbesar sesudah pelantikan')
a('median.ubah', -R['median.ubah'], '%', catatan='nilai tengah perubahan luas per provinsi')
a('top1.porsi.ses', R['top1.porsi.ses'], '%', catatan='porsi Kalimantan Tengah dalam luas nasional sesudah pelantikan')
for k_ in ('ps', 'sultra', 'kaltim'):
    a(f'akhir7.{k_}', R[f'akhir7.{k_}'], 'ha', catatan='rata-rata luas terbakar per hari tujuh hari terakhir')
a('kj.seb.jt', 933, 'ha', catatan='rata-rata luas Jawa Timur per hari sepuluh hari sebelum kunjungan')
a('kj.seb.lp', 387, 'ha', catatan='rata-rata luas Lampung per hari sepuluh hari sebelum kunjungan')
a('kj.idx.lp', R['kj.idx.lampung'], '%', catatan='luas sepuluh hari sesudah kunjungan dibanding sebelum, Lampung')
a('kj.idx.jt.p', R['kj.idx.jatim'], '%', catatan='luas sepuluh hari sesudah kunjungan dibanding sebelum, Jawa Timur')
a('kj.idx.ps.p', R['kj.idx.papsel'], '%', catatan='luas sepuluh hari sesudah kunjungan dibanding sebelum, Papua Selatan')
a('top.porsi.turun', R['top.porsi.turun'], '%', catatan='porsi enam provinsi api terbesar dalam penurunan nasional')
a('top1.seb', R['top1.seb'], 'ha', catatan='luas terbakar Kalimantan Tengah per hari sebelum pelantikan')
a('top1.ses', R['top1.ses'], 'ha', catatan='luas terbakar Kalimantan Tengah per hari sesudah pelantikan')
a('bersih.n.seb', R['bersih.n.seb'], 'hari', catatan='hari dengan data satelit lengkap sebelum pelantikan')
a('bersih.n.ses', R['bersih.n.ses'], 'hari', catatan='hari dengan data satelit lengkap sesudah pelantikan')
a('n.hari', 28, 'hari', keyakinan='asumsi-kebijakan', catatan='panjang periode')
a('puncak', __import__('data_wilayah').tgl_panjang(R['puncak.hari']), '', catatan='hari dengan luas terbakar nasional terbesar')
a('rk.lebih', 1, 'kunjungan', catatan='kunjungan dengan penurunan jelas lebih cepat dari provinsi lain, Sumatera Selatan')
a('kj.kab.pp', R['kj.kab.kalteng-kaltim'], '%', catatan='luas terbakar Pulang Pisau sesudah kunjungan')
a('kj.kab.oki', R['kj.kab.sumsel'], '%', catatan='luas terbakar Ogan Komering Ilir sesudah kunjungan')
a('kj.kab.kb', R['kj.kab.jatim'], '%', catatan='luas terbakar Kota Batu sesudah kunjungan')
a('kj.kab.lt', R['kj.kab.lampung'], '%', catatan='luas terbakar Lampung Timur sesudah kunjungan')
a('kj.kab.mk', R['kj.kab.papsel'], '%', catatan='luas terbakar Merauke sesudah kunjungan')
a('kj.kini.ps', R['kj.kini.papsel'], '%', catatan='luas terbakar Papua Selatan tujuh hari terakhir dibanding sebelum kunjungan')
a('kj.idx.jt', R['kj.idx.jatim'], '', catatan='indeks luas sesudah kunjungan, Jawa Timur')
a('kj.idx.ps', R['kj.idx.papsel'], '', catatan='indeks luas sesudah kunjungan, Papua Selatan')
a('rk.cepat', R['rk.cepat'], 'kunjungan', catatan='kunjungan yang diikuti penurunan lebih cepat dari provinsi lain, diuji dengan dan tanpa hari celah')
a('rk.n', R['rk.n'], 'kunjungan')
a('wf.akhir', R['wf.akhir'], 'ha')
for x in ('musim.median', 'musim.min', 'musim.maks'):
    a(x, R[x], '%', GW, S_GW, catatan='penurunan luas dari pertengahan Sep-Okt ke pertengahan Okt-Nov, 2012-2024')
for i, v in enumerate((100, 1000, 5000, 10000)):
    a(f'kelas{i}', v, 'ha', keyakinan='asumsi-kebijakan', catatan='batas kelas peta, ha per hari')

PUSTAKA = [{'id': GW, 'type': 'dataset', 'author': [{'literal': 'GWIS, EU Joint Research Centre dan Copernicus'}], 'issued': {'date-parts': [[2025, 12]]},
            'title': 'GWIS Country Profile, luas terbakar bulanan per provinsi (MODIS MCD64A1 C6.1), 2002-2025', 'URL': 'https://gwis.jrc.ec.europa.eu',
            'verifikasi': 'primer'}]

FOTO, KREDIT = 'foto/foto-gambut.jpg', 'Foto: DenY Krisbiyantoro, CC BY-SA 4.0, Wikimedia Commons'
SAMPUL = {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': FOTO, 'kota': 'Jakarta', 'kredit': KREDIT,
          'tanpa_berakhlak': True, 'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana',
          'subjudul': 'Empat minggu pertama masa jabatan dibandingkan dengan empat minggu sebelum pelantikan pada 15 Oktober 2026.',
          'penyaji': {'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'}}

GRAFIK3 = {'judul_panel': 'Luas lahan terbakar nasional per hari, tiga periode empat minggu', 'ikon': 'luas', 'keluarga': 'api',
           'judul': '**Luas terbakar**, hektare per hari', 'pembanding': False, 'ubah': False, 'persen_batang': False,
           'data': {'csv': f'{D}/periode.csv', 'kolom': [{'nama': 'periode'}, {'nama': 'Luas terbakar per hari', 'fmt': '0'}], 'keyakinan': 'resmi', 'sumber': S_CT}}

RINGKAS = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan eksekutif', 'rasio': 0.52,
    'judul': 'Ringkasan eksekutif: luas lahan terbakar nasional turun separuh sesudah pelantikan, sama seperti yang biasa terjadi setiap tahun saat musim hujan mulai',
    'cut_off': False,
    'grup': [{'pil': 'Perubahan luas terbakar nasional per empat minggu', 'nada': 'data', 'ikon': 'turun', 'kartu': [
        {'nilai': t('laju.seb.luas', '|persen|arah'), 'label': 'sebelum pelantikan', 'ikon': 'naik', 'warna': 'oranye'},
        {'nilai': t('laju.ses.luas', '|persen|arah'), 'label': 'sesudah pelantikan', 'ikon': 'turun', 'warna': 'biru'}]},
        {'pil': 'Pola musim pada periode yang sama', 'nada': 'perhatian', 'ikon': 'kalender', 'kartu': [
            {'nilai': t('musim.median', '|persen'), 'label': 'penurunan biasa pada waktu yang sama, 2012-2024', 'ikon': 'kalender', 'warna': 'merah'}]}],
    'grafik': GRAFIK3,
    'panel': {'judul': 'Key takeaways', 'ikon': 'ringkasan', 'daftar': [
        f'**Pelantikan.** Kepala BNPB dilantik pada {t("tgl", "|teks")}. Laporan ini membandingkan empat minggu sebelum dan sesudahnya.',
        f'**Api terbesar turun lebih cepat.** Enam provinsi dengan api terbesar {t("top.laju.ses", "|persen|arah")}, sedangkan provinsi lainnya {t("non.laju.ses", "|persen|arah")}.',
        f'**Api besar paling menentukan.** Angka nasional mengikuti provinsi berapi besar; separuh provinsi turun lebih dari {t("median.ubah", "|persen")}.',
        f'**Kecepatan padam hampir sama.** Dari lahan yang terbakar, {t("rp.bobot.seb", "|persen")} sudah padam dua hari kemudian sebelum pelantikan, dan {t("rp.bobot.ses", "|persen")} sesudahnya.',
        '**Musim hujan ikut berperan.** Pada waktu yang sama setiap tahun, api memang berkurang seiring mulainya musim hujan.']},
    'sumber': f'{S_CT}; {S_GW}',
}

LUAS = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Tren nasional', 'rasio': 0.62,
    'judul': f'Luas lahan terbakar harian nasional {t("laju.seb.luas", "|persen|arah")} menjelang pelantikan dibanding empat minggu sebelumnya, lalu {t("laju.ses.luas", "|persen|arah")} sesudahnya',
    'cut_off': False,
    'utama': {'judul': 'Luas lahan terbakar dan belum padam per hari, nasional', 'ikon': 'luas', 'gambar': True,
              'subjudul_grafik': 'Hektare per hari; garis oranye adalah hari pelantikan, pita abu-abu empat minggu sesudahnya',
              'garis': {'data': {'csv': f'{D}/harian.csv', 'kolom': [{'nama': 'hari'}, {'nama': 'Luas terbakar', 'fmt': '0'}, {'nama': 'Belum padam', 'fmt': '0'}],
                                 'keyakinan': 'resmi', 'sumber': S_CT},
                        'sorot': 'Luas terbakar', 'zona': {'dari': '16 Okt', 'sampai': '12 Nov'},
                        'penanda': [{'periode': '15 Okt', 'label': f'Pelantikan {t("tgl.pendek", "|teks")}', 'warna': 'oranye'}], 'mulai_nol': True, 'skala_huruf': 1.1}},
    'panel': {'judul': 'Rata-rata per hari', 'ikon': 'kalender',
              'data': {'csv': f'{D}/periode_tabel.csv', 'kolom': [{'nama': 'periode', 'kepala': 'Periode'}, {'nama': 'masa', 'kepala': 'Keterangan'},
                                                                  {'nama': 'luas', 'kepala': 'Luas (ha)', 'fmt': '0'}],
                       'keyakinan': 'resmi', 'sumber': S_CT, 'sorot': ['16 Okt-12 Nov']},
              'peringkat': False, 'skala_huruf': 1.6,
              'daftar': [f'Garis oranye pada grafik menandai hari pelantikan, {t("tgl", "|teks")}.',
                         'Tiap periode panjangnya empat minggu. Hari pelantikan tidak ikut dihitung.',
                         'Periode pembanding dipakai untuk melihat arah api sebelum pelantikan.',
                         f'Jumlah hotspot {t("laju.seb.hot", "|persen|arah")} sebelum dan {t("laju.ses.hot", "|persen|arah")} sesudah pelantikan.',
                         'Belum padam adalah luas yang apinya masih menyala dari hari sebelumnya.',
                         f'Luas terbakar harian tertinggi terjadi pada {t("puncak", "|teks")}, sebelum pelantikan.']},
    'sumber': S_CT,
}

UKURAN = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Ukuran apple to apple nasional', 'rasio': 0.6,
    'judul': f'Api nasional turun {t("turun.ses", "|persen")} sampai {t("turun.bersih", "|persen")} sesudah pelantikan, apa pun ukuran yang dipakai',
    'cut_off': False,
    'tabel': {'judul_panel': 'Perubahan dibanding empat minggu sebelumnya', 'ikon': 'data', 'peringkat': False,
              'data': {'csv': f'{D}/ukuran_laju.csv', 'kolom': [{'nama': 'ukuran', 'kepala': 'Yang diukur'},
                                                                 {'nama': 'sebelum', 'kepala': 'Sebelum pelantikan', 'fmt': '0|persen', 'pil_ambang': [[0.0001, 'oranye', 'kertas'], [-100000, 'biru', 'kertas']], 'pil_panah': True},
                                                                 {'nama': 'sesudah', 'kepala': 'Sesudah pelantikan', 'fmt': '0|persen', 'pil_ambang': [[0.0001, 'oranye', 'kertas'], [-100000, 'biru', 'kertas']], 'pil_panah': True}],
                       'keyakinan': 'resmi', 'sumber': S_CT, 'sorot': ['Luas lahan terbakar']}},
    'panel': {'judul': 'Kecepatan padam', 'ikon': 'karhutla', 'daftar': [
        f'**Hampir sama.** Dari lahan yang terbakar, {t("rp.bobot.seb", "|persen")} sudah padam dua hari kemudian sebelum pelantikan, dan {t("rp.bobot.ses", "|persen")} sesudahnya.',
        f'**Hampir sama.** Dari api yang masih menyala kemarin, yang masih menyala hari berikutnya biasanya {t("rb.median.seb", "|persen")} sebelum pelantikan dan {t("rb.median.ses", "|persen")} sesudahnya.',
        f'**Hampir sama.** Bagian lahan terbakar yang belum padam adalah {t("bl.seb", "|persen")} sebelum pelantikan, dan {t("bl.ses", "|persen")} sesudahnya.',
        'Artinya, api tidak padam lebih cepat sesudah pelantikan; yang berkurang adalah luas api secara keseluruhan, bersamaan dengan awal musim hujan.']},
    'pita': {'label': 'Cara membaca', 'nada': 'data', 'kolom': [
        {'ikon': 'turun', 'judul': 'Warna label', 'isi': 'Label biru berpanah ke bawah berarti turun, label oranye berpanah ke atas berarti naik.'},
        {'ikon': 'data', 'judul': 'Data satelit lengkap', 'isi': f'Baris kedua hanya memakai {t("bersih.n.seb")} dari {t("n.hari", "|satuan")} sebelum dan {t("bersih.n.ses")} sesudah pelantikan yang datanya lengkap.'},
        {'ikon': 'wilayah', 'judul': 'Provinsi yang dikunjungi', 'isi': 'Provinsi yang dikunjungi ada enam, termasuk Kalimantan Timur yang dihitung bersama Kalimantan Tengah.'}]},
    'sumber': S_CT,
}

MUSIM = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Pola musim', 'rasio': 0.68,
    'judul': f'Setiap tahun pada waktu yang sama, luas terbakar turun {t("musim.min", "|persen")} sampai {t("musim.maks", "|persen")} seiring mulainya musim hujan, dan penurunan tahun 2026 masih dalam rentang itu',
    'cut_off': False,
    'utama': {'judul': 'Penurunan luas terbakar pada periode yang sama tiap tahun', 'ikon': 'kalender', 'gambar': True,
              'subjudul_grafik': 'Persen penurunan dari pertengahan September-Oktober ke Oktober-November',
              'lollipop': {'data': {'csv': f'{D}/musim.csv', 'kolom': [{'nama': 'tahun'}, {'nama': 'turun', 'kepala': 'Turun (%)', 'fmt': '0'}],
                                    'keyakinan': 'resmi', 'sumber': S_GW},
                           'sorot': '2026', 'skala_huruf': 1.0}},
    'panel': {'judul': 'Key takeaways', 'ikon': 'ringkasan', 'skala_huruf': 1.41, 'daftar': [
        f'Pada waktu yang sama tahun 2012 sampai 2024, luas terbakar biasanya turun sekitar {t("musim.median", "|persen")}. Tahun 2026 turun {t("turun.ses", "|persen")}, setara dengan penurunan biasa.',
        'Penurunan terbesar terjadi pada tahun 2022, sedangkan yang terkecil terjadi pada tahun 2014 dan 2023.',
        'Tahun 2026 berada di urutan tengah dari empat belas tahun yang dibandingkan.',
        'Data tahun-tahun lalu berupa angka bulanan, sehingga periode empat minggu diperkirakan dari setengah bulan.',
        'Data tahun lalu berasal dari citra luas terbakar, sedangkan data 2026 berasal dari hotspot. Karena itu, yang dibandingkan hanya persen turunnya.']},
    'sumber': f'{S_GW}; {S_CT}',
}

PETA_W = {'label_gaya': 'pil', 'mode': 'koroplet', 'ambang': [100, 1000, 5000, 10000], 'skala': 'api', 'satuan': 'Luas terbakar (ha per hari)', 'label': 6,
          'skala_huruf': 0.9, 'tanpa_skala': True}
PETA = {
    'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'pesan': 'Sebaran per provinsi', 'rasio': 0.52,
    'susun': 'vertikal', 'tinggi': [0.5, 0.5],
    'ulang_angka_boleh': 'dua peta sebanding memakai kelas legenda yang sama',
    'judul': f'Sebelum dan sesudah pelantikan, Kalimantan Tengah tetap menyumbang sekitar sepertiga luas terbakar nasional, yaitu {t("top1.bobot", "|persen")} dan {t("top1.porsi.ses", "|persen")}',
    'cut_off': False,
    'utama': [
        {'judul': 'Empat minggu sebelum pelantikan', 'ikon': 'karhutla',
         'peta': dict(PETA_W, label=3, data={'csv': f'{D}/prov_seb.csv', 'kolom': [{'nama': 'provinsi'}, {'nama': 'luas', 'kepala': 'Luas (ha)', 'fmt': '0'}],
                                            'keyakinan': 'resmi', 'sumber': S_CT})},
        {'judul': 'Empat minggu sesudah pelantikan', 'ikon': 'karhutla',
         'peta': dict(PETA_W, label=3, data={'csv': f'{D}/prov_ses.csv', 'kolom': [{'nama': 'provinsi'}, {'nama': 'luas', 'kepala': 'Luas (ha)', 'fmt': '0'}],
                                            'keyakinan': 'resmi', 'sumber': S_CT})}],
    'panel': {'judul': 'Enam provinsi dengan api terbesar', 'ikon': 'wilayah',
              'grafik': {'judul': '', 'satuan_pil': 'Hektare per hari', 'keluarga': 'netral', 'ganda': True, 'ubah': False, 'persen_batang': False,
                         'data': {'csv': f'{D}/provinsi_bar.csv', 'kolom': [{'nama': 'provinsi', 'kepala': 'Provinsi'},
                                                                            {'nama': 'Sesudah pelantikan', 'kepala': 'Sesudah', 'fmt': '0'},
                                                                            {'nama': 'Sebelum pelantikan', 'kepala': 'Sebelum', 'fmt': '0'}],
                                  'keyakinan': 'resmi', 'sumber': S_CT}},
              'daftar': ['Keenam provinsi turun sesudah pelantikan, dan urutan terluas hampir tidak berubah.',
                         'Kal. berarti Kalimantan, sedangkan Sum. berarti Sumatera.']},
    'sumber': S_CT,
}

PROV_BAR = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Perbandingan provinsi', 'rasio': 0.64,
    'judul': f'Keenam provinsi dengan api terbesar turun sesudah pelantikan, dan Kalimantan Tengah tetap terluas dengan {t("top1.ses", "|satuan")} per hari',
    'cut_off': False,
    'grafik': {'judul_panel': 'Luas terbakar per hari, enam provinsi dengan api terbesar', 'ikon': 'wilayah', 'keluarga': 'api',
               'judul': '**Luas terbakar**, hektare per hari', 'ganda': True, 'ubah': False, 'persen_batang': False,
               'data': {'csv': f'{D}/provinsi_bar.csv', 'kolom': [{'nama': 'provinsi', 'kepala': 'Provinsi'},
                                                                  {'nama': 'Sesudah pelantikan', 'kepala': 'Sesudah pelantikan', 'fmt': '0'},
                                                                  {'nama': 'Sebelum pelantikan', 'kepala': 'Sebelum pelantikan', 'fmt': '0'}],
                        'keyakinan': 'resmi', 'sumber': S_CT}},
    'panel': {'judul': 'Key takeaways', 'ikon': 'ringkasan', 'daftar': [
        'Batang muda adalah rata-rata per hari empat minggu sebelum pelantikan, batang tua sesudahnya.',
        'Penurunan paling kecil terjadi di Kalimantan Timur, dan yang paling besar di Kalimantan Barat.',
        'Penurunan terjadi di keenam provinsi, sehingga tidak ada provinsi besar yang apinya bertambah.',
        'Kal. berarti Kalimantan dan Sum. berarti Sumatera.']},
    'sumber': S_CT,
}

PROV = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Per provinsi dan bobot', 'rasio': 0.68,
    'judul': f'Lebih dari sepertiga penurunan nasional berasal dari Kalimantan Tengah, yang luas terbakarnya turun dari {t("top1.seb", "|satuan")} menjadi {t("top1.ses", "|satuan")} per hari',
    'cut_off': False,
    'tabel': {'judul_panel': 'Dua belas provinsi dengan luas terbakar terbesar sebelum pelantikan', 'ikon': 'wilayah', 'peringkat': True,
              'data': {'csv': f'{D}/provinsi.csv', 'kolom': [
                  {'nama': 'provinsi', 'kepala': 'Provinsi'}, {'nama': 'sebelum', 'kepala': 'Sebelum (ha)', 'fmt': '0'}, {'nama': 'sesudah', 'kepala': 'Sesudah (ha)', 'fmt': '0'},
                  {'nama': 'ubah', 'kepala': 'Perubahan', 'fmt': '1|persen', 'pil_ambang': [[0.0001, 'oranye', 'kertas'], [-100000, 'biru', 'kertas']], 'pil_panah': True}, {'nama': 'bobot', 'kepala': 'Porsi (%)', 'fmt': '1'}],
                       'keyakinan': 'resmi', 'sumber': S_CT, 'sorot': R['top']}},
    'panel': {'judul': 'Key takeaways', 'ikon': 'ringkasan', 'skala_huruf': 1.69, 'daftar': [
        'Angka adalah rata-rata luas terbakar per hari pada empat minggu sebelum dan sesudah pelantikan.',
        'Porsi adalah bagian setiap provinsi dari luas terbakar nasional sebelum pelantikan.',
        'Baris yang disorot adalah enam provinsi dengan api terbesar.',
        'Seluruh provinsi ada di lampiran.']},
    'pita': {'label': 'Intinya', 'nada': 'data', 'kolom': [
        {'ikon': 'wilayah', 'judul': 'Kalimantan Tengah', 'isi': 'Penentu terbesar naik turunnya angka nasional.'},
        {'ikon': 'turun', 'judul': 'Api terbesar', 'isi': 'Hampir semua provinsi dengan api terbesar turun lebih dari separuh.'},
        {'ikon': 'peringatan', 'judul': 'Turun sedikit atau naik', 'isi': 'Beberapa provinsi, termasuk Sulawesi Tenggara dan Jawa Timur, justru naik sesudah pelantikan.'}]},
    'sumber': S_CT,
}

TOPNON = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Top lawan non-top', 'rasio': 0.66,
    'judul': f'Penurunan nasional terutama datang dari enam provinsi dengan api terbesar, yang {t("top.laju.ses", "|persen|arah")}, sedangkan provinsi lainnya hanya {t("non.laju.ses", "|persen|arah")}',
    'cut_off': False,
    'utama': {'judul': 'Luas terbakar per hari menurut kelompok provinsi', 'ikon': 'karhutla', 'gambar': True,
              'subjudul_grafik': 'Hektare per hari, tiap periode empat minggu',
              'kolom_tumpuk': {'data': {'csv': f'{D}/top_non.csv', 'kolom': [{'nama': 'periode'}, {'nama': 'Enam provinsi dengan api terbesar', 'fmt': '0'}, {'nama': 'Provinsi lainnya', 'fmt': '0'}],
                                        'keyakinan': 'resmi', 'sumber': S_CT},
                               'warna': ['oranye', 'skala.netral.2'], 'skala_huruf': 1.1}},
    'panel': {'judul': 'Key takeaways', 'ikon': 'ringkasan', 'skala_huruf': 1.46, 'daftar': [
        f'Enam provinsi dengan api terbesar dipilih dari luas terbakar sebelum pelantikan. Bersama-sama, keenamnya menyumbang {t("top.porsi", "|persen")} luas nasional.',
        f'Sebelum pelantikan, kedua kelompok sama-sama naik. Enam provinsi dengan api terbesar {t("top.laju.seb", "|persen|arah")}, dan provinsi lainnya {t("non.laju.seb", "|persen|arah")}.',
        f'Keenam provinsi itu menyumbang {t("top.porsi.turun", "|persen")} dari seluruh penurunan luas terbakar nasional.',
        f'Sesudah pelantikan, porsi keenam provinsi itu turun dari {t("top.porsi", "|persen")} menjadi {t("top.porsi.ses", "|persen")} dari luas nasional.',
        'Provinsi lainnya juga turun cukup besar, sehingga penurunan terjadi hampir di seluruh Indonesia.']},
    'sumber': S_CT,
}

BOBOT = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Metode berbobot', 'rasio': 0.58,
    'judul': f'Angka nasional {t("bobot.ubah", "|persen|arah")} mengikuti provinsi berapi besar; rata-rata {t("biasa.n", "|satuan")} hanya {t("biasa.ubah", "|persen|arah")} karena beberapa provinsi kecil naik',
    'cut_off': False,
    'utama': {'judul': 'Dari luas sebelum ke luas sesudah pelantikan, menurut provinsi', 'ikon': 'data', 'gambar': True,
              'subjudul_grafik': 'Hektare per hari; batang biru adalah penurunan tiap provinsi, urut menurut luas sebelum pelantikan',
              'waterfall': {'data': {'csv': f'{D}/waterfall.csv', 'kolom': [{'nama': 'bagian'}, {'nama': 'luas', 'fmt': '0'}], 'keyakinan': 'resmi', 'sumber': S_CT},
                            'akhir': R['wf.akhir.label'], 'skala_huruf': 1.0}},
    'panel': {'judul': 'Dua cara menghitung rata-rata', 'ikon': 'kalender', 'daftar': [
        'Cara pertama menganggap semua provinsi sama penting, berapa pun luas apinya.',
        'Cara kedua menghitung tiap provinsi menurut luas apinya. Cara ini disebut rata-rata berbobot, dan hasilnya sama dengan angka nasional.',
        f'Cara pertama memakai {t("biasa.n", "|satuan")} yang lahannya terbakar paling sedikit seratus hektare selama empat minggu sebelum pelantikan.',
        f'Separuh provinsi turun lebih dari {t("median.ubah", "|persen")}, hampir sama dengan angka nasional.']},
    'sumber': S_CT,
}

KUNJUNG = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Rangkuman kunjungan daerah', 'rasio': 0.54,
    'judul': f'Dari {t("rk.n", "|satuan")} Kepala BNPB, {t("rk.cepat", "|satuan")} diikuti penurunan yang lebih cepat daripada provinsi lain, sedangkan Papua Selatan turun lebih lambat',
    'cut_off': False,
    'grafik': {'judul_panel': 'Penurunan luas terbakar sepuluh hari sesudah kunjungan', 'ikon': 'wilayah', 'keluarga': 'api',
               'judul': '**Turun**, persen', 'ganda': True, 'ubah': False, 'persen_batang': False,
               'data': {'csv': f'{D}/kunjungan_bar.csv', 'kolom': [{'nama': 'wilayah', 'kepala': 'Wilayah'},
                                                                  {'nama': 'Wilayah yang dikunjungi', 'kepala': 'Wilayah yang dikunjungi', 'fmt': '0'},
                                                                  {'nama': 'Provinsi lain', 'kepala': 'Provinsi lain pada tanggal yang sama', 'fmt': '0'}],
                        'keyakinan': 'resmi', 'sumber': S_CT}},
    'panel': {'judul': 'Hasil tiap kunjungan', 'ikon': 'ringkasan',
              'data': {'csv': f'{D}/kunjungan_tgl.csv', 'kolom': [{'nama': 'wilayah', 'kepala': 'Wilayah'}, {'nama': 'tanggal', 'kepala': 'Tanggal'},
                                                                   {'nama': 'putusan', 'kepala': 'Hasil', 'pil': {
                                                                       'Lebih cepat': ['biru', 'biru', 'kertas'],
                                                                       'Tidak lebih cepat': ['skala.netral.2', 'skala.netral.2', 'teks'],
                                                                       'Lebih lambat': ['oranye', 'oranye', 'kertas']}}],
                       'keyakinan': 'resmi', 'sumber': S_CT},
              'peringkat': False, 'skala_huruf': 1.3,
              'daftar': ['Angka diukur pada sepuluh hari sebelum dan sepuluh hari sesudah tanggal kunjungan.',
                         'Batang yang lebih tinggi berarti luas terbakar turun lebih banyak dalam sepuluh hari sesudah kunjungan.',
                         'Papua Selatan adalah satu-satunya wilayah yang turun lebih lambat daripada provinsi lain.',
                         f'Di Jawa Timur dan Lampung, api relatif kecil, yaitu {t("kj.seb.jt", "|satuan")} dan {t("kj.seb.lp", "|satuan")} per hari, lalu padam dalam tiga hari.',
                         'Satu wilayah disebut lebih cepat hanya bila hasilnya tetap lebih cepat setelah hari dengan data satelit tidak lengkap dibuang.',
                         'Kalimantan pada grafik berarti Kalimantan Tengah dan Kalimantan Timur; tanggal kunjungan keduanya disamakan.']},
    'sumber': S_CT,
}

PETA_KUNJ = {
    'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'pesan': 'Lokasi dan tanggal kunjungan', 'rasio': 0.67,
    'judul': f'Dalam tiga minggu pertama masa jabatannya, Kepala BNPB mengunjungi {t("kj.n", "|satuan")} karhutla',
    'cut_off': False,
    'utama': {'judul': 'Lokasi dan tanggal kunjungan Kepala BNPB', 'ikon': 'wilayah', 'gambar': True,
              'peta': {'mode': 'titik', 'tanpa_nilai': True, 'label_gaya': 'pil', 'label': 5, 'tanpa_skala': True, 'skala_huruf': 1.0,
                       'warna_titik': 'merah',
                       'data': {'csv': f'{D}/kunjungan_peta.csv', 'kolom': [{'nama': 'lokasi'}, {'nama': 'tanda', 'fmt': '0'},
                                                                             {'nama': 'lon', 'fmt': '4'}, {'nama': 'lat', 'fmt': '4'}],
                                'keyakinan': 'resmi', 'sumber': 'Berita BNPB dan InfoPublik, Oktober 2026'}}},
    'panel': {'judul': 'Urutan kunjungan', 'ikon': 'kalender', 'daftar': [
        'Kepala BNPB memimpin rapat koordinasi karhutla dan meninjau Ogan Komering Ilir, Sumatera Selatan, pada 18 Oktober.',
        'Kepala BNPB meninjau penanganan karhutla di Pulang Pisau, Kalimantan Tengah, bersama Kepala Staf TNI Angkatan Darat pada 19 Oktober.',
        'Kepala BNPB memimpin rapat koordinasi karhutla bersama Kepala Staf TNI Angkatan Darat di Kota Batu, Jawa Timur, pada 23 Oktober.',
        'Kepala BNPB meninjau karhutla Taman Nasional Way Kambas, Lampung, dari udara pada 24 Oktober.',
        'Kepala BNPB meninjau karhutla Merauke, Papua Selatan, dari udara pada 31 Oktober.',
        'Kalimantan Timur dihitung bersama Kalimantan Tengah dengan tanggal kunjungan yang sama.']},
    'sumber': 'Berita InfoPublik; Metro TV; RCTI+; Oktober 2026',
}

DOK = {
    'jenis': 'galeri', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'pesan': 'Dokumentasi kunjungan',
    'judul': 'Dokumentasi kunjungan Kepala BNPB: pemantauan udara karhutla Merauke, Papua Selatan, pada 31 Oktober 2026',
    'cut_off': False, 'kolom_panel': 2,
    'panel': [
        {'judul': 'Api dan asap di sekitar lahan terbuka', 'ikon': 'karhutla', 'kolom_foto': 2, 'bobot': 2.6, 'foto': [
            {'berkas': 'foto/udara-04.jpg', 'keterangan': 'Pohon hangus di tepi lahan yang sedang dibuka'},
            {'berkas': 'foto/udara-26.jpg', 'keterangan': 'Asap di lantai hutan dengan pohon masih tegak'},
            {'berkas': 'foto/udara-30.jpg', 'keterangan': 'Asap di savana dekat kampung dan jalan'},
            {'berkas': 'foto/udara-37.jpg', 'keterangan': 'Asap di belakang permukiman dan sawah Kurik'}]},
        {'judul': 'Key takeaways', 'ikon': 'ringkasan', 'bobot': 2.4, 'skala_huruf': 1.95, 'daftar': [
            'Pemantauan udara memperlihatkan api di tepi lahan yang sedang dibuka dan di hutan sekitarnya.',
            'Asap terlihat sampai dekat permukiman dan sawah di sekitar lokasi.',
            'Temuan lapangan sejalan dengan data satelit, yang mencatat api paling padat di Kecamatan Jagebob.',
            'Foto diambil dari helikopter selama penerbangan pemantauan bersama tim BNPB.',
            'Dokumentasi kunjungan ke empat daerah lainnya belum tersedia dalam laporan ini.']}],
    'sumber': 'Kegiatan udara tim BNPB, Merauke, 31 Okt 2026',
}

TREN_KUNJ = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Tren harian sekitar kunjungan', 'rasio': 0.66,
    'judul': f'Dalam sepuluh hari sesudah kunjungan, luas terbakar tinggal {t("kj.idx.jt.p", "|persen")} dari sebelumnya di Jawa Timur, tetapi masih {t("kj.idx.ps.p", "|persen")} di Papua Selatan',
    'cut_off': False,
    'utama': {'judul': 'Luas lahan terbakar per hari di sekitar hari kunjungan', 'ikon': 'luas', 'gambar': True,
              'subjudul_grafik': 'Angka seratus sama dengan rata-rata sepuluh hari sebelum kunjungan; H0 di tengah sumbu adalah hari kunjungan',
              'kecil_majemuk': {'data': {'csv': f'{D}/kunjungan_tren.csv', 'kolom': [{'nama': 'wilayah'}, {'nama': 'hari'}, {'nama': 'indeks', 'fmt': '0'}],
                                         'keyakinan': 'resmi', 'sumber': S_CT},
                                'bentuk': 'garis', 'skala_huruf': 1.0}},
    'panel': {'judul': 'Key takeaways', 'ikon': 'ringkasan', 'daftar': [
        'Setiap daerah diukur terhadap keadaannya sendiri, sehingga daerah dengan api kecil dan api besar dapat dibandingkan.',
        'Angka seratus sama dengan rata-rata luas terbakar per hari pada sepuluh hari sebelum kunjungan.',
        'Garis di bawah seratus berarti api lebih kecil daripada sebelum kunjungan.',
        'Garis dihaluskan dengan rata-rata tiga hari, supaya naik turun harian tidak mengaburkan arah api.',
        'Angka kecil di atas setiap grafik adalah keadaan pada hari kesepuluh sesudah kunjungan, sedangkan angka di judul slide adalah rata-rata sepuluh hari.']},
    'sumber': S_CT,
}

LOKASI = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Lokasi yang ditinjau dan keadaan sekarang', 'rasio': 0.6,
    'judul': f'Lokasi yang ditinjau tidak selalu mereda, dan kini hanya Papua Selatan yang apinya masih besar, yaitu {t("kj.kini.ps", "|persen")} dari sebelum kunjungan',
    'cut_off': False,
    'grup': [{'pil': 'Perubahan luas terbakar di kabupaten lokasi kunjungan', 'nada': 'data', 'ikon': 'wilayah', 'kartu': [
        {'nilai': t('kj.kab.oki', '|persen|arah'), 'label': 'Ogan Komering Ilir', 'ikon': 'turun', 'warna': 'biru'},
        {'nilai': t('kj.kab.pp', '|persen|arah'), 'label': 'Pulang Pisau', 'ikon': 'naik', 'warna': 'oranye'},
        {'nilai': t('kj.kab.kb', '|persen|arah'), 'label': 'Kota Batu', 'ikon': 'turun', 'warna': 'biru'},
        {'nilai': t('kj.kab.lt', '|persen|arah'), 'label': 'Lampung Timur', 'ikon': 'turun', 'warna': 'biru'},
        {'nilai': t('kj.kab.mk', '|persen|arah'), 'label': 'Merauke', 'ikon': 'turun', 'warna': 'biru'}]}],
    'grafik': {'judul_panel': 'Api yang tersisa sekarang di tiap daerah', 'ikon': 'karhutla', 'keluarga': 'api', 'arah': 'horizontal',
               'judul': '**Tersisa**, persen dari keadaan sebelum kunjungan', 'ubah': False, 'persen_batang': False, 'pembanding': False, 'sorot': ['Papua Selatan'],
               'data': {'csv': f'{D}/kunjungan_kini.csv', 'kolom': [{'nama': 'wilayah', 'kepala': 'Daerah'}, {'nama': 'kini', 'kepala': 'Tersisa (%)', 'fmt': '0'}],
                        'keyakinan': 'resmi', 'sumber': S_CT}},
    'panel': {'judul': 'Key takeaways', 'ikon': 'ringkasan', 'daftar': [
        'Kartu di atas membandingkan luas terbakar di kabupaten yang ditinjau pada sepuluh hari sesudah kunjungan dengan sepuluh hari sebelumnya.',
        'Pulang Pisau justru naik, dan Merauke hanya turun sedikit.',
        'Tersisa adalah rata-rata luas terbakar tujuh hari terakhir dibanding rata-rata sepuluh hari sebelum kunjungan.',
        'Di empat daerah, api yang tersisa sudah kecil; Papua Selatan masih membutuhkan pemadaman.']},
    'sumber': S_CT,
}

kartu = [
    {'label': 'Nasional', 'ikon': 'luas', 'warna': 'navy', 'judul': 'Luas terbakar nasional turun separuh',
     'isi': f'Luas lahan terbakar rata-rata {t("seb.luas", "|satuan")} per hari sebelum pelantikan dan {t("ses.luas", "|satuan")} per hari sesudahnya.'},
    {'label': 'Musim hujan', 'ikon': 'kalender', 'warna': 'oranye', 'judul': 'Penurunan sesuai pola musim tahunan',
     'isi': f'Pada waktu yang sama tahun 2012 sampai 2024, luas terbakar biasanya turun sekitar {t("musim.median", "|persen")}.'},
    {'label': 'Data satelit lengkap', 'ikon': 'data', 'warna': 'navy', 'judul': 'Data lengkap juga menunjukkan turun',
     'isi': f'Dihitung hanya dengan hari yang data satelitnya lengkap, luas nasional {t("bersih.ses.luas", "|persen|arah")}.'},
    {'label': 'Kecepatan padam', 'ikon': 'karhutla', 'warna': 'navy', 'judul': 'Kecepatan padam tidak berubah',
     'isi': f'Dari lahan yang terbakar, {t("rp.bobot.seb", "|persen")} sudah padam dua hari kemudian sebelum pelantikan, dan {t("rp.bobot.ses", "|persen")} sesudahnya.'},
    {'label': 'Api terbesar', 'ikon': 'wilayah', 'warna': 'navy', 'judul': 'Provinsi api terbesar turun lebih cepat',
     'isi': f'Enam provinsi dengan api terbesar {t("top.laju.ses", "|persen|arah")}, sedangkan provinsi lainnya {t("non.laju.ses", "|persen|arah")}.'},
    {'label': 'Dua cara hitung', 'ikon': 'data', 'warna': 'navy', 'judul': 'Api besar menentukan angka nasional',
     'isi': f'Angka nasional {t("bobot.ubah", "|persen|arah")}, mengikuti provinsi berapi besar. Separuh provinsi turun lebih dari {t("median.ubah", "|persen")}.'},
    {'label': 'Kalimantan Tengah', 'ikon': 'wilayah', 'warna': 'oranye', 'judul': 'Kalimantan Tengah turun paling banyak',
     'isi': f'Sebanyak {t("top1.kontrib", "|persen")} dari penurunan luas terbakar nasional terjadi di Kalimantan Tengah.'},
    {'label': 'Dikunjungi', 'ikon': 'wilayah', 'warna': 'oranye', 'judul': 'Provinsi dikunjungi turun setara',
     'isi': f'Provinsi yang dikunjungi Kepala BNPB {t("kunjung.laju.ses", "|persen|arah")}, sedangkan provinsi lainnya {t("lain.laju.ses", "|persen|arah")}.'}]
SIMPUL = {
    'jenis': 'kesimpulan', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Kesimpulan dan arahan',
    'judul': 'Sesudah pelantikan, luas terbakar nasional turun separuh, terutama di provinsi dengan api terbesar, seiring datangnya musim hujan',
    'cut_off': False, 'skala_isi': 1.25, 'kartu': kartu,
    'arahan': {'label': 'Usulan', 'ikon': 'peringatan',
               'teks': f'Pertahankan armada udara dan regu darat di Papua Selatan, yang tujuh hari terakhir masih terbakar {t("akhir7.ps", "|satuan")} per hari, sampai hujan merata. Pantau Sulawesi Tenggara dan Kalimantan Timur yang masih di atas empat ratus hektare per hari.'},
    'sumber': f'{S_CT}; {S_GW}',
}

LAMP_PEMBATAS = {'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Luas terbakar per provinsi'}}
LAMP = {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Semua provinsi', 'kode': 'A1',
        'judul': 'Luas terbakar per provinsi, rata-rata per hari empat minggu sebelum dan sesudah pelantikan', 'judul_daftar': 'Luas terbakar per provinsi', 'maks_baris': 20,
        'data': {'csv': f'{D}/provinsi_semua.csv', 'kolom': [
            {'nama': 'provinsi', 'kepala': 'Provinsi'}, {'nama': 'sebelum', 'kepala': 'Sebelum (ha)', 'fmt': '0'}, {'nama': 'sesudah', 'kepala': 'Sesudah (ha)', 'fmt': '0'},
            {'nama': 'ubah', 'kepala': 'Perubahan', 'rata': 'c'}, {'nama': 'bobot', 'kepala': 'Porsi luas nasional (%)', 'fmt': '1'}],
                 'keyakinan': 'resmi', 'sumber': S_CT},
        'sumber': S_CT}

PENUTUP = {'jenis': 'penutup', 'foto': FOTO, 'logo_kanan': 'foto/berakhlak-hd.png', 'kredit': KREDIT, 'teks': 'Terima Kasih',
           'laporan': 'Karhutla nasional sebelum dan sesudah pelantikan Kepala BNPB'}

KAJIAN = 'nasional-pelantikan'
SPEK = {
    '_catatan': 'Karhutla nasional empat minggu sebelum dan sesudah pelantikan Kepala BNPB 15 Okt 2026. Dibangun dari spek/bangun_spek_nasional.py.',
    'pesan_kunci': 'Sesudah pelantikan Kepala BNPB luas terbakar nasional turun separuh, terutama di provinsi dengan api terbesar, sejalan dengan pola musim tahun-tahun sebelumnya.',
    'judul_dokumen': 'Karhutla Nasional Sebelum dan Sesudah Pelantikan Kepala BNPB', 'subjek_dokumen': 'Nasional, per provinsi, provinsi dengan api terbesar, metode berbobot',
    'kajian': KAJIAN, 'format': 'kajian', 'justify_dua_baris': True, 'tanggal': '2026-11-13', 'cut_off': '13 Nov 2026, 10.31 WIB',
    'bagian': [{'judul': 'Nasional', 'label': 'Nasional'}, {'judul': 'Per Provinsi', 'label': 'Per provinsi'},
               {'judul': 'Provinsi dengan Api Terbesar', 'label': 'Api terbesar'},
               {'judul': 'Kunjungan Kepala BNPB ke Daerah', 'label': 'Kunjungan daerah'},
               {'judul': 'Kesimpulan dan Usulan', 'label': 'Kesimpulan'}],
    'slide': [SAMPUL, RINGKAS, {'jenis': 'daftar-isi'}, {'jenis': 'pembatas-seksi', 'bagian': 1}, LUAS, UKURAN, MUSIM,
              {'jenis': 'pembatas-seksi', 'bagian': 2}, PETA, PROV, {'jenis': 'pembatas-seksi', 'bagian': 3}, TOPNON, BOBOT,
              {'jenis': 'pembatas-seksi', 'bagian': 4}, PETA_KUNJ, DOK, TREN_KUNJ, KUNJUNG, LOKASI,
              {'jenis': 'pembatas-seksi', 'bagian': 5}, SIMPUL,
              LAMP, PENUTUP],
}
TEMA = {'judul': 'Karhutla Nasional Sebelum dan Sesudah Pelantikan Kepala BNPB', 'subjudul': SAMPUL['subjudul'], 'judul_pendek': 'Karhutla Nasional',
        'nama_berkas': 'Karhutla Nasional Sebelum dan Sesudah Pelantikan Kepala BNPB {DDMMYY}', 'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
        'kata_kunci': ['BNPB', 'karhutla', 'nasional', 'luas terbakar', 'pemadaman'], 'cakupan_sampul': 'Seluruh provinsi.'}

if __name__ == '__main__':
    rp = AKAR / 'data/angka.json'
    reg = json.loads(rp.read_text(encoding='utf-8'))
    reg['angka'].update(ANGKA)
    rp.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    pp = AKAR / 'pustaka.json'
    pu = [x for x in json.loads(pp.read_text(encoding='utf-8')) if x['id'] not in {p['id'] for p in PUSTAKA}] + PUSTAKA
    pp.write_text(json.dumps(pu, ensure_ascii=False, indent=1), encoding='utf-8')
    tp = AKAR / 'tema.json'
    tm = json.loads(tp.read_text(encoding='utf-8'))
    tm['kajian'][KAJIAN] = TEMA
    tp.write_text(json.dumps(tm, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/nasional-pelantikan.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(ANGKA)} angka, {len(SPEK["slide"])} slide')
