#!/usr/bin/env python3
"""Deck karhutla sebelum dan sesudah kunjungan Kepala BNPB untuk satu wilayah, apple to apple (13 Nov 2026).

Pemilik: "buat juga untuk daerah lain yang sebelumnya bapak kunjungi" (Lampung, Jawa Timur, Kalteng dan Kaltim, Sumsel), format
seperti Papsel rev2, tanggal kunjungan tertulis jelas, grafik periode berlabel tanggal. Data dari data_wilayah.py.
Jalankan dari folder bnpb: assets/proyek-papsel/bangun-wilayah.sh <kode>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from data_wilayah import WILAYAH, bangun, tgl_panjang  # noqa: E402

AKAR = Path(__file__).resolve().parents[1]
KODE = sys.argv[1]
C = WILAYAH[KODE]
R = bangun(KODE)
P = KODE.replace('-', '_')
CT = 'centurisk-karhutla-2026-11-13'
KV = f'berita-kunjungan-{KODE}'
S_CT = 'NASA FIRMS, diolah Centurisk BNPB, 13 Nov 2026'
S_KV = C['sumber_kunjungan']
D = f'data/{KODE}'
ANGKA = {}


def a(k, nilai, satuan, pustaka=CT, sumber=S_CT, keyakinan='resmi', catatan=None):
    ANGKA[f'{P}.{k}'] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pustaka, 'sumber': sumber, 'keyakinan': keyakinan}
    if catatan:
        ANGKA[f'{P}.{k}']['catatan'] = catatan


def t(k, o=''):
    return '{{angka:%s.%s%s}}' % (P, k, o)


a('tgl', tgl_panjang(C['kunjungan']), '', KV, S_KV, catatan='tanggal kunjungan Kepala BNPB')
for nm in ('pra', 'seb', 'ses'):
    a(f'jendela.{nm}', R[f'jendela.{nm}'], '', catatan='jendela sepuluh hari')
for k in ('seb', 'ses'):
    a(f'{k}.luas', R[f'{k}.luas.hari'], 'ha', catatan='rata-rata luas terbakar per hari')
    a(f'{k}.belum', R[f'{k}.belum.hari'], 'ha', catatan='rata-rata belum padam per hari')
    for x in ('laju.{}.luas', 'laju.{}.belum', 'laju.{}.hot', 'bersih.{}.luas', 'lain.{}.luas', 'lain.bersih.{}.luas'):
        kk = x.format(k)
        if R.get(kk) is not None:
            a(kk, R[kk], '%')
    for x in ('rb.median', 'rp.bobot', 'bl'):
        if R.get(f'{x}.{k}') is not None:
            a(f'{x}.{k}', R[f'{x}.{k}'], '%')
    a(f'celah.{k}', R[f'celah.{k}'], 'hari', keyakinan='resmi', catatan='hari terkena celah lintasan satelit')
if R['kab.ubah'] is not None:
    a('kab.ubah', R['kab.ubah'], '%', catatan=f'luas terbakar {C["kab"]}')
a('kab.top.porsi', R['kab.top.ses.porsi'], '%', catatan=f'porsi {R["kab.top.ses"]} dalam luas wilayah sesudah kunjungan')
if R['kab.porsi.seb'] is not None:
    a('kab.porsi', R['kab.porsi.seb'], '%', catatan=f'porsi {C["kab"]} dalam luas wilayah sebelum kunjungan')
a('akhir7.porsi', R['akhir7.porsi'], '%', catatan='rata-rata luas tujuh hari terakhir data dibanding rata-rata sebelum kunjungan')
a('puncak', tgl_panjang(R['puncak.hari']), '', catatan='hari dengan luas terbakar terbesar di jendela')
a('rb.n.ses', R['rb.n.ses'], 'hari', catatan='hari sesudah kunjungan dengan belum padam kemarin paling sedikit 20 ha')
for k in ('seb', 'ses'):
    a(f'bersih.n.{k}', R[f'bersih.n.{k}'], 'hari', catatan='hari tanpa celah satelit di jendela')
a('kab.n.berapi', R['kab.n.berapi'], 'kabupaten', catatan='kabupaten dengan luas terbakar paling sedikit 10 ha sebelum kunjungan')
a('kab.n.turun', R['kab.n.turun'], 'kabupaten')
a('hari.padam', 2, 'hari', keyakinan='asumsi-kebijakan', catatan='tanpa hotspot dua hari = padam')
a('lain.n', R['lain.n'], 'provinsi', catatan='provinsi yang tidak dikunjungi Kepala BNPB')

PUSTAKA = [{'id': KV, 'type': 'article-newspaper', 'author': [{'literal': S_KV}], 'issued': {'date-parts': [[2026, 10, 1]]},
            'title': f'Kunjungan Kepala BNPB: {C["kegiatan"]}', 'verifikasi': 'sekunder'}]

# ---- penilaian otomatis: kata, bukan angka ketik
cepat = R['laju.ses.luas'] < R['laju.seb.luas'] - 5
lambat = R['laju.ses.luas'] > R['laju.seb.luas'] + 5
# dibanding provinsi lain: putusan tegas hanya bila angka mentah dan angka tanpa hari celah sepakat (pemeriksa 13 Nov 2026)
d1 = R['laju.ses.luas'] - R['lain.ses.luas']
d2 = R['bersih.ses.luas'] - R['lain.bersih.ses.luas']
unggul = d1 < -5 and d2 < -5
kalah = d1 > 5 and d2 > 5
condong_kalah = not kalah and (d1 > 5 or d2 > 5)
condong_unggul = not unggul and (d1 < -5 or d2 < -5) and not condong_kalah
banding_kata = ('lebih cepat dari provinsi lain' if unggul else 'lebih lambat dari provinsi lain' if kalah else
                'tidak lebih cepat dari provinsi lain' if condong_kalah else 'setara atau sedikit lebih cepat dari provinsi lain' if condong_unggul
                else 'setara dengan provinsi lain')
if R['laju.seb.luas'] >= 0 and R['laju.ses.luas'] < 0:
    INTI = f'kebakaran yang sebelumnya meningkat berbalik turun, {banding_kata}'
elif cepat:
    INTI = f'kebakaran turun lebih cepat daripada sebelumnya, {banding_kata}'
elif lambat:
    INTI = 'kebakaran lebih kecil, tetapi laju penurunannya melambat'
else:
    INTI = 'laju penurunan kebakaran hampir sama dengan sebelumnya'
NAMA = C['nama']
TEMPAT = '{{tempat:%s}}' % NAMA if len(C['prov']) == 1 else NAMA
FOTO, KREDIT = {'papsel': ('foto/udara-20.jpg', 'Foto: kegiatan udara tim BNPB, Merauke'),
               'kalteng-kaltim': ('foto/foto-asap.jpg', 'Foto: ParadoxP P, CC BY 4.0, Wikimedia Commons')}.get(
    KODE, ('foto/foto-gambut.jpg', 'Foto: DenY Krisbiyantoro, CC BY-SA 4.0, Wikimedia Commons'))

SAMPUL = {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': FOTO, 'kota': 'Jakarta', 'kredit': KREDIT,
          'logo_kanan': 'foto/berakhlak-hd.png', 'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana',
          'subjudul': f'{C["lokasi"]}, {tgl_panjang(C["kunjungan"])}',
          'penyaji': {'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'}}

GRAFIK3 = {'judul_panel': 'Luas lahan terbakar per hari, tiga periode sepuluh hari', 'ikon': 'luas', 'keluarga': 'api',
           'judul': '**Luas terbakar**, hektare per hari', 'pembanding': False, 'ubah': False,
           'data': {'csv': f'{D}/periode.csv', 'kolom': [{'nama': 'periode'}, {'nama': 'Luas terbakar per hari', 'fmt': '0'}],
                    'keyakinan': 'resmi', 'sumber': S_CT}}

butir = [f'**Kunjungan.** Kepala BNPB {C["kegiatan"]} pada {t("tgl", "|teks")}.',
         '**Dibanding provinsi lain.** ' + banding_kata[0].upper() + banding_kata[1:] + ' pada tanggal yang sama; hasil ini sudah diuji tanpa hari celah satelit.',
         f'**Kecepatan padam.** Luas yang padam dalam dua hari {t("rp.bobot.seb", "|persen")} sebelum dan {t("rp.bobot.ses", "|persen")} sesudah kunjungan.']
if R['kab.ubah'] is not None and R['kab.ubah'] == R['laju.ses.luas']:
    butir.append(f'**{C["kab"]}.** Luas terbakar di lokasi kunjungan turun sama besar dengan penurunan seluruh provinsi.')
elif R['kab.ubah'] is not None:
    butir.append(f'**{C["kab"]}.** Luas terbakar di lokasi kunjungan {t("kab.ubah", "|persen|arah")} sesudah kunjungan.')
butir.append('**Faktor lain ikut berperan.** Hujan awal musim dan operasi modifikasi cuaca juga menekan api.')
if C.get('catatan'):
    butir[-1] = '**Asumsi tanggal.** ' + C['catatan'] + ' Hujan awal musim dan operasi modifikasi cuaca juga ikut menekan api.'

RINGKAS = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan eksekutif', 'rasio': 0.52,
    'judul': f'Ringkasan eksekutif: sesudah kunjungan, {INTI}', 'cut_off': False,
    'grup': [{'pil': 'Perubahan luas terbakar per sepuluh hari', 'nada': 'data', 'ikon': 'turun', 'kartu': [
        {'nilai': t('laju.seb.luas', '|persen|arah'), 'label': 'sebelum kunjungan', 'ikon': 'luas', 'warna': 'navy'},
        {'nilai': t('laju.ses.luas', '|persen|arah'), 'label': 'sesudah kunjungan', 'ikon': 'luas', 'warna': 'navy'}]},
        {'pil': 'Pembanding pada tanggal yang sama', 'nada': 'perhatian', 'ikon': 'wilayah', 'kartu': [
            {'nilai': t('lain.ses.luas', '|persen|arah'), 'label': 'provinsi yang tidak dikunjungi', 'ikon': 'wilayah', 'warna': 'merah'}]}],
    'grafik': GRAFIK3,
    'panel': {'judul': 'Apa artinya', 'ikon': 'ringkasan', 'daftar': butir},
    'sumber': f'{S_CT}; kunjungan: {S_KV}',
}

LUAS = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Tren luas terbakar', 'rasio': 0.63,
    'judul': f'Luas harian {t("laju.seb.luas", "|persen|arah")} pada sepuluh hari sebelum kunjungan dan {t("laju.ses.luas", "|persen|arah")} pada sepuluh hari sesudahnya',
    'cut_off': False,
    'utama': {'judul': 'Luas terbakar dan belum padam harian' + (f', {NAMA}' if len(C['prov']) == 1 else ', dua provinsi'), 'ikon': 'luas', 'gambar': True,
              'subjudul_grafik': f'Hektare per hari; kunjungan Kepala BNPB {t("tgl", "|teks")}; pita abu-abu adalah sepuluh hari sesudah kunjungan',
              'garis': {'data': {'csv': f'{D}/harian.csv', 'kolom': [{'nama': 'hari'}, {'nama': 'Luas terbakar', 'fmt': '0'}, {'nama': 'Belum padam', 'fmt': '0'}],
                                 'keyakinan': 'resmi', 'sumber': S_CT},
                        'sorot': 'Luas terbakar', 'zona': {'dari': R['zona_dari'], 'sampai': R['zona_sampai']},
                        'mulai_nol': True, 'skala_huruf': 1.1}},
    'panel': {'judul': 'Rata-rata per sepuluh hari', 'ikon': 'kalender',
              'data': {'csv': f'{D}/periode_tabel.csv', 'kolom': [{'nama': 'periode', 'kepala': 'Periode'}, {'nama': 'luas', 'kepala': 'Luas (ha)', 'fmt': '0'},
                                                                  {'nama': 'belum', 'kepala': 'Belum padam (ha)', 'fmt': '0'}, {'nama': 'hot', 'kepala': 'Hotspot', 'fmt': '0'}],
                       'keyakinan': 'resmi', 'sumber': S_CT, 'sorot': ['Sesudah']},
              'peringkat': False, 'skala_huruf': 1.6,
              'daftar': [f'Kepala BNPB berkunjung ke {C["lokasi"]} pada {t("tgl", "|teks")}.',
                         f'Sebelum berarti {t("jendela.seb", "|teks")}, sesudah berarti {t("jendela.ses", "|teks")}. Hari kunjungan tidak ikut dihitung.',
                         f'Hotspot per sepuluh hari {t("laju.seb.hot", "|persen|arah")} sebelum dan {t("laju.ses.hot", "|persen|arah")} sesudah kunjungan.',
                         f'Pada tanggal yang sama, luas terbakar provinsi lain {t("lain.seb.luas", "|persen|arah")} lalu {t("lain.ses.luas", "|persen|arah")}.',
                         f'Puncak luas harian terjadi pada {t("puncak", "|teks")}, ' + ('sebelum kunjungan.' if R['puncak.sebelum'] else 'sesudah kunjungan.'),
                         'Belum padam adalah bagian luas terbakar yang apinya masih bertahan dari hari sebelumnya.']},
    'sumber': S_CT,
}

amb = R['ambang']
for i, v in enumerate(amb):
    a(f'kelas{i}', v, 'ha', keyakinan='asumsi-kebijakan', catatan='batas kelas peta')
PETA_W = {'mode': 'koroplet', 'tingkat': 'kabupaten', 'wilayah': C['prov'], 'ambang': amb, 'skala': 'api', 'satuan': 'Luas terbakar (ha)', 'tanpa_skala': True,
          'label': 2, 'skala_huruf': 0.9}
PETA = {
    'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'pesan': 'Sebaran luas terbakar per kabupaten', 'rasio': 0.5,
    'ulang_angka_boleh': 'dua peta sebanding memakai kelas legenda yang sama',
    'judul': f'Sesudah kunjungan, luas terbakar terbesar ada di {R["kab.top.ses"]}, yaitu {t("kab.top.porsi", "|persen")} luas terbakar wilayah',
    'cut_off': False,
    'utama': {'judul': 'Sepuluh hari sebelum kunjungan', 'ikon': 'karhutla', 'gambar': True,
              'peta': dict(PETA_W, data={'csv': f'{D}/kab_seb.csv', 'kolom': [{'nama': 'kab'}, {'nama': 'luas', 'kepala': 'Luas (ha)', 'fmt': '0'}],
                                         'keyakinan': 'resmi', 'sumber': S_CT})},
    'panel': {'judul': 'Sepuluh hari sesudah kunjungan', 'ikon': 'karhutla', 'gambar': True,
              'peta': dict(PETA_W, data={'csv': f'{D}/kab_ses.csv', 'kolom': [{'nama': 'kab'}, {'nama': 'luas', 'kepala': 'Luas (ha)', 'fmt': '0'}],
                                         'keyakinan': 'resmi', 'sumber': S_CT})},
    'sumber': S_CT,
}

KAB = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Perubahan per kabupaten', 'rasio': 0.68,
    'judul': (f'Luas terbakar di {C["kab"]}, lokasi yang dikunjungi, {t("kab.ubah", "|persen|arah")} pada sepuluh hari sesudah kunjungan' if R['kab.ubah'] is not None
              else f'Luas terbakar per kabupaten sebelum dan sesudah kunjungan, {t("lain.n")} provinsi lain sebagai pembanding'),
    'cut_off': False,
    'utama': {'judul': 'Luas terbakar per kabupaten, jumlah sepuluh hari', 'ikon': 'wilayah',
              'data': {'csv': f'{D}/kab.csv', 'kolom': [{'nama': 'kab', 'kepala': 'Kabupaten'}, {'nama': 'sebelum', 'kepala': 'Sebelum (ha)', 'fmt': '0'},
                                                         {'nama': 'sesudah', 'kepala': 'Sesudah (ha)', 'fmt': '0'}, {'nama': 'ubah', 'kepala': 'Perubahan (%)', 'fmt': '1|arah'}],
                       'keyakinan': 'resmi', 'sumber': S_CT, 'sorot': [C['kab']]},
              'skala_huruf': 1.3,
              'daftar': ([f'Sebelum kunjungan, {C["kab"]} menyumbang {t("kab.porsi", "|persen")} luas terbakar wilayah.'] if R['kab.porsi.seb'] is not None else [])
                        + ['Kabupaten yang tidak tercantum mencatat luas terbakar lebih kecil.',
                           'Perubahan dihitung dari jumlah luas terbakar sepuluh hari sebelum dan sepuluh hari sesudah kunjungan.']},
    'panel': {'judul': 'Cara membaca', 'ikon': 'ringkasan', 'skala_huruf': 1.45, 'daftar': ([C['catatan']] if C.get('catatan') else []) + [
        f'Sebanyak {t("kab.n.turun")} dari {t("kab.n.berapi", "|satuan")} yang terbakar sebelum kunjungan mencatat luas yang lebih kecil sesudahnya.',
        (f'Kabupaten terluas sebelum kunjungan adalah {R["kab.top.seb"]}, dan sesudahnya {R["kab.top.ses"]}.' if R['kab.top.seb'] != R['kab.top.ses']
         else f'{R["kab.top.seb"]} tetap menjadi kabupaten terluas sebelum dan sesudah kunjungan.'),
        'Tabel memuat kabupaten dengan luas terbakar terbesar, diurutkan dari jumlah sebelum dan sesudah kunjungan.',
        'Baris yang disorot adalah kabupaten lokasi kunjungan Kepala BNPB.',
        'Perubahan negatif berarti luas terbakar sesudah kunjungan lebih kecil.'] + ([] if C.get('catatan') else [
        'Angka tabel adalah jumlah luas terbakar selama sepuluh hari.'])},
    'sumber': S_CT,
}

v = R['vonis']
BANDING = banding_kata[0].upper() + banding_kata[1:] + '; sudah diuji tanpa hari celah satelit.'
UKURAN = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Perbandingan apple to apple', 'rasio': 0.66,
    'judul': f'Pada tanggal yang sama, luas terbakar {NAMA} {t("laju.ses.luas", "|persen|arah")}, sedangkan provinsi lain {t("lain.ses.luas", "|persen|arah")}',
    'cut_off': False,
    'tabel': {'judul_panel': 'Ukuran yang tidak bergantung pada besar kecilnya kebakaran', 'ikon': 'data', 'peringkat': False,
              'data': {'csv': f'{D}/ukuran.csv', 'kolom': [{'nama': 'ukuran', 'kepala': 'Ukuran'}, {'nama': 'sebelum', 'kepala': 'Sebelum', 'fmt': '0'},
                                                            {'nama': 'sesudah', 'kepala': 'Sesudah', 'fmt': '0'}, {'nama': 'arti', 'kepala': 'Arti'}],
                       'keyakinan': 'resmi', 'sumber': S_CT,
                       'sorot': ['Perubahan luas per sepuluh hari (%)', 'Pembanding: perubahan luas provinsi yang tidak dikunjungi (%)']}},
    'panel': {'judul': 'Mengapa persen dan pembanding', 'ikon': 'ringkasan', 'skala_huruf': 1.4, 'daftar': [
        'Kebakaran yang lebih kecil wajar menghasilkan angka akhir lebih kecil, walaupun pemadamannya tidak lebih cepat.',
        'Persen dan rasio membandingkan tiap periode dengan keadaan awalnya sendiri.',
        'Akhir Oktober musim hujan mulai di banyak tempat, jadi provinsi yang tidak dikunjungi menjadi pembanding pada tanggal yang sama.',
        f'Baris tanpa hari celah satelit membuang hari dengan data satelit yang hilang; tersisa {t("bersih.n.seb", "|satuan")} sebelum dan {t("bersih.n.ses", "|satuan")} sesudah kunjungan.']},
    'pita': {'label': 'Intinya', 'nada': 'data', 'kolom': [
        {'ikon': 'turun', 'judul': 'Laju luas terbakar', 'isi': v['Perubahan luas per sepuluh hari (%)'] + ' dibanding sepuluh hari sebelum kunjungan.'},
        {'ikon': 'wilayah', 'judul': 'Dibanding provinsi lain', 'isi': BANDING},
        {'ikon': 'kalender', 'judul': 'Kecepatan padam', 'isi': v['Luas yang padam dalam dua hari, berbobot (%)'] + ' untuk luas yang padam dalam dua hari.'}]},
    'sumber': S_CT,
}

RASIO = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Rasio harian belum padam', 'rasio': 0.6,
    'judul': (f'Tiap hari, belum padam biasanya tinggal {t("rb.median.seb", "|persen")} dari hari sebelumnya sebelum kunjungan dan {t("rb.median.ses", "|persen")} sesudahnya'
              if R['rb.n.ses'] >= 6 else
              f'Sesudah kunjungan api hampir padam, sehingga rasio harian belum padam hanya dapat dihitung pada {t("rb.n.ses", "|satuan")}'),
    'cut_off': False,
    'utama': {'judul': 'Belum padam dibanding sehari sebelumnya', 'ikon': 'karhutla', 'gambar': True,
              'subjudul_grafik': 'Persen; di bawah seratus persen berarti api menyusut dari hari sebelumnya',
              'garis': {'data': {'csv': f'{D}/rasio_harian.csv', 'kolom': [{'nama': 'hari'}, {'nama': 'Belum padam dibanding kemarin', 'fmt': '0'}],
                                 'keyakinan': 'resmi', 'sumber': S_CT},
                        'zona': {'dari': R['zona_dari'], 'sampai': [r for r in open(AKAR / D / 'rasio_harian.csv', encoding='utf-8').read().splitlines()][-1].split(',')[0],
                                 'label': 'Sesudah kunjungan'},
                        'mulai_nol': True, 'skala_huruf': 1.1}},
    'panel': {'judul': 'Cara membaca rasio harian', 'ikon': 'kalender', 'daftar': [
        'Rasio harian adalah luas belum padam pada suatu hari dibagi luas belum padam sehari sebelumnya.',
        'Nilai tengah dipakai karena beberapa hari bisa melonjak berlipat saat api baru muncul; hari dengan belum padam kemarin di bawah dua puluh hektare tidak dihitung.',
        'Rata-rata berbobot luas kemarin tidak dipakai, karena hasilnya hanya ditentukan hari pertama dan terakhir tiap periode.',
        f'Ukuran berbobot yang stabil adalah luas yang padam dalam dua hari: {t("rp.bobot.seb", "|persen")} sebelum dan {t("rp.bobot.ses", "|persen")} sesudah kunjungan.']},
    'sumber': S_CT,
}

v = R['vonis']
kartu = [
    {'label': 'Luas terbakar', 'ikon': 'luas', 'warna': 'navy', 'judul': 'Rata-rata per hari',
     'isi': f'Luas terbakar rata-rata {t("seb.luas", "|satuan")} sebelum dan {t("ses.luas", "|satuan")} per hari sesudah kunjungan.'},
    {'label': 'Laju turun', 'ikon': 'turun', 'warna': 'navy', 'judul': v['Perubahan luas per sepuluh hari (%)'],
     'isi': f'Luas per sepuluh hari {t("laju.seb.luas", "|persen|arah")} sebelum dan {t("laju.ses.luas", "|persen|arah")} sesudah kunjungan.'},
    {'label': 'Pembanding', 'ikon': 'wilayah', 'warna': 'oranye', 'judul': (banding_kata[0].upper() + banding_kata[1:]).replace(' dari provinsi lain', '').replace(' dengan provinsi lain', ''),
     'isi': f'Provinsi yang tidak dikunjungi {t("lain.ses.luas", "|persen|arah")} pada sepuluh hari yang sama; tanpa hari celah {t("lain.bersih.ses.luas", "|persen|arah")}.'},
    {'label': 'Uji celah satelit', 'ikon': 'data', 'warna': 'navy', 'judul': v['Perubahan luas, tanpa hari celah satelit (%)'],
     'isi': f'Tanpa hari celah satelit, luas {t("bersih.seb.luas", "|persen|arah")} sebelum dan {t("bersih.ses.luas", "|persen|arah")} sesudah kunjungan.'},
    {'label': 'Belum padam', 'ikon': 'karhutla', 'warna': 'navy', 'judul': v['Belum padam dibanding kemarin, nilai tengah (%)'],
     'isi': f'Belum padam biasanya tinggal {t("rb.median.seb", "|persen")} dari kemarin sebelum kunjungan, {t("rb.median.ses", "|persen")} sesudahnya.'},
    {'label': 'Padam dua hari', 'ikon': 'kalender', 'warna': 'navy', 'judul': v['Luas yang padam dalam dua hari, berbobot (%)'],
     'isi': f'Luas yang padam dalam dua hari {t("rp.bobot.seb", "|persen")} sebelum dan {t("rp.bobot.ses", "|persen")} sesudah kunjungan.'},
    {'label': 'Lokasi kunjungan', 'ikon': 'wilayah', 'warna': 'oranye', 'judul': C['kab'],
     'isi': (f'Luas terbakar {C["kab"]} {t("kab.ubah", "|persen|arah")} sesudah kunjungan.' if R['kab.ubah'] is not None
             else f'{C["kab"]} tidak mencatat luas terbakar sebelum kunjungan.')},
    {'label': 'Faktor lain', 'ikon': 'cuaca-ekstrem', 'warna': 'oranye', 'judul': 'Hujan dan OMC',
     'isi': 'Hujan awal musim dan operasi modifikasi cuaca ikut menekan api.'}]
SIMPUL = {
    'jenis': 'kesimpulan', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Kesimpulan dan arahan',
    'judul': f'Sesudah kunjungan Kepala BNPB ke {C["lokasi"]}, {INTI}', 'cut_off': False, 'skala_isi': 1.3, 'kartu': kartu,
    'arahan': {'label': 'Arahan', 'ikon': 'peringatan',
               'teks': (f'Api hampir padam: tujuh hari terakhir tinggal {t("akhir7.porsi", "|persen")} dari rata-rata sebelum kunjungan. Pantau sisa api di {R["kab.top.ses"]} dan alihkan kesiapsiagaan ke banjir dan longsor.'
                        if R['akhir7.porsi'] is not None and R['akhir7.porsi'] < 15 else
                        f'Api belum padam: tujuh hari terakhir masih {t("akhir7.porsi", "|persen")} dari rata-rata sebelum kunjungan. Pertahankan regu darat dan armada udara di {R["kab.top.ses"]} sampai hujan merata.')},
    'sumber': f'{S_CT}; kunjungan: {S_KV}',
}

PENUTUP = {'jenis': 'penutup', 'foto': FOTO, 'logo_kanan': 'foto/berakhlak-hd.png', 'kredit': KREDIT, 'teks': 'Terima Kasih',
           'laporan': f'Pengaruh kunjungan Kepala BNPB terhadap karhutla {NAMA}'}

KAJIAN = f'kunjungan-{KODE}'
SPEK = {
    '_catatan': f'Pengaruh kunjungan Kepala BNPB terhadap karhutla {NAMA}, Kepala BNPB {C["kunjungan"]}. Dibangun dari spek/bangun_spek_wilayah.py {KODE}.'
                + (' ' + C['catatan'] if C.get('catatan') else ''),
    'pesan_kunci': f'Sesudah kunjungan Kepala BNPB ke {C["lokasi"]}, {INTI}.',
    'judul_dokumen': f'Pengaruh Kunjungan Kepala BNPB terhadap Karhutla {C.get("nama_judul", NAMA)}',
    'subjek_dokumen': 'Luas terbakar dan kecepatan pemadaman',
    'kajian': KAJIAN, 'format': 'kajian', 'tanggal': '2026-11-13', 'cut_off': '13 Nov 2026, 10.31 WIB',
    'bagian': [{'judul': 'Luas Terbakar', 'label': 'Luas terbakar'}, {'judul': 'Kecepatan Pemadaman dan Arahan', 'label': 'Kecepatan padam'}],
    'slide': [SAMPUL, RINGKAS, {'jenis': 'daftar-isi'}, {'jenis': 'pembatas-seksi', 'bagian': 1}, LUAS, PETA, KAB,
              {'jenis': 'pembatas-seksi', 'bagian': 2}, UKURAN, RASIO, SIMPUL, PENUTUP],
}
TEMA = {'judul': f'Pengaruh Kunjungan Kepala BNPB terhadap Karhutla {C.get("nama_judul", NAMA)}',
        'subjudul': SAMPUL['subjudul'], 'judul_pendek': f'Karhutla {NAMA}',
        'nama_berkas': f'Pengaruh Kunjungan Kepala BNPB terhadap Karhutla {NAMA} {{DDMMYY}}', 'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
        'kata_kunci': ['BNPB', 'karhutla', NAMA, 'luas terbakar', 'pemadaman'], 'cakupan_sampul': f'Provinsi {NAMA}.'}

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
    (AKAR / f'spek/{KODE}-kunjungan.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{KODE}: {len(ANGKA)} angka, {len(SPEK["slide"])} slide; inti: {INTI}')
