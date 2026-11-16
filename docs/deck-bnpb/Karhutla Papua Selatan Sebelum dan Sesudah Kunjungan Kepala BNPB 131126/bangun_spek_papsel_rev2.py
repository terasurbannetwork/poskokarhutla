#!/usr/bin/env python3
"""Revisi 2 (13 Nov 2026): perbandingan sebelum dan sesudah kunjungan dibuat apple to apple.

Arahan pemilik: angka akhir yang lebih kecil belum tentu berarti lebih cepat turun (contoh 20 ribu ke 5 ribu lawan 5 ribu ke 2 ribu);
atasan: "tiap harinya hitung rata-rata yang belum padam berapa dari hari sebelumnya", dan metode berbobot.
Ukuran baru: laju turun per sepuluh hari, rasio harian belum padam terhadap kemarin (rata-rata biasa dan berbobot),
porsi luas yang padam dalam dua hari, dan umur cluster berbobot luas. Slide lain dipakai ulang dari bangun_spek_papsel.py.
Jalankan dari folder bnpb: assets/proyek-papsel/bangun-rev2.sh
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bangun_spek_papsel as B  # noqa: E402
from bangun_spek_papsel import a, t, R, CT, KL, S_CT, S_KL, S_IP, S_GAB, IP  # noqa: E402

AKAR = B.AKAR
LV, EM = 'resmi', 'estimasi-model'
for k in ('seb', 'ses'):
    a(f'laju.{k}.luas', R[f'laju.{k}.luas'], '%', CT, S_CT, LV, 'perubahan rata-rata luas harian dibanding sepuluh hari sebelumnya')
    a(f'rb.bobot.{k}', R[f'rb.bobot.{k}'], '%', CT, S_CT, LV, 'jumlah belum padam dibagi jumlah belum padam hari sebelumnya')
    a(f'rb.median.{k}', R[f'rb.median.{k}'], '%', CT, S_CT, LV, 'nilai tengah rasio harian belum padam terhadap hari sebelumnya')
    a(f'rp.bobot.{k}', R[f'rp.bobot.{k}'], '%', CT, S_CT, LV, 'luas padam dibagi luas terbakar dua hari sebelumnya, berbobot')
    a(f'klw.{k}.p9', R[f'klw.{k}.p9'], '%', KL, S_KL, EM, 'porsi luas cluster yang menyala lebih dari tiga hari')
    a(f'klw.{k}.p1', R[f'klw.{k}.p1'], '%', KL, S_KL, EM, 'porsi luas cluster yang padam dalam sehari')
a('hari.celah', len(R['celah.seb']), 'hari', CT, S_CT, LV, 'hari sebelum kunjungan yang terkena celah lintasan satelit')

TABEL_UK = {'csv': 'data/papsel/ukuran.csv', 'kolom': [
    {'nama': 'ukuran', 'kepala': 'Ukuran'}, {'nama': 'sebelum', 'kepala': 'Sebelum', 'fmt': '0'},
    {'nama': 'sesudah', 'kepala': 'Sesudah', 'fmt': '0'}, {'nama': 'arti', 'kepala': 'Arti'}],
    'keyakinan': 'resmi', 'sumber': S_GAB}

RINGKAS = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan eksekutif', 'rasio': 0.52,
    'judul': 'Ringkasan eksekutif: sesudah kunjungan kebakaran Papua Selatan lebih kecil, tetapi laju penurunannya melambat',
    'cut_off': False,
    'grup': [{'pil': 'Laju turun luas terbakar per sepuluh hari', 'nada': 'data', 'ikon': 'turun', 'kartu': [
        {'nilai': t('laju.seb.luas', '|persen|arah'), 'label': 'sebelum kunjungan', 'ikon': 'luas', 'warna': 'navy'},
        {'nilai': t('laju.ses.luas', '|persen|arah'), 'label': 'sesudah kunjungan', 'ikon': 'luas', 'warna': 'navy'}]},
        {'pil': 'Luas cluster yang menyala lebih dari tiga hari', 'nada': 'perhatian', 'ikon': 'kalender', 'kartu': [
            {'nilai': t('klw.seb.p9', '|persen'), 'label': 'sebelum kunjungan', 'ikon': 'karhutla', 'warna': 'merah'},
            {'nilai': t('klw.ses.p9', '|persen'), 'label': 'sesudah kunjungan', 'ikon': 'turun', 'warna': 'merah'}]}],
    'grafik': B.RINGKAS['grafik'],
    'panel': {'judul': 'Apa artinya', 'ikon': 'ringkasan', 'daftar': [
        '**Kebakaran lebih kecil.** Luas terbakar per hari sesudah kunjungan adalah yang terendah sejak awal Oktober.',
        f'**Kecepatan padam harian setara.** Luas yang padam dalam dua hari {t("rp.bobot.seb", "|persen")} sebelum dan {t("rp.bobot.ses", "|persen")} sesudah kunjungan.',
        f'**Api besar padam lebih cepat.** Cluster yang lama menyala kini jauh lebih sedikit, dihitung menurut luasnya.',
        f'**Penurunan terbesar di luar Merauke.** Sebanyak {t("luar.porsi", "|persen")} penurunan luas berasal dari tiga kabupaten lain.',
        '**Faktor lain ikut berperan.** Peluang hujan akhir Oktober dan operasi modifikasi cuaca juga menekan api.']},
    'sumber': f'{S_GAB}; {S_IP}',
}

LUAS = dict(B.LUAS)
LUAS['judul'] = (f'Luas harian {t("laju.seb.luas", "|persen|arah")} pada sepuluh hari sebelum kunjungan, '
                 f'tetapi hanya {t("laju.ses.luas", "|persen|arah")} pada sepuluh hari sesudahnya')
LUAS['panel'] = dict(B.LUAS['panel'], daftar=[
    'Hari kunjungan tidak ikut dihitung. Periode sebelum dan sesudah sama panjang, masing-masing sepuluh hari.',
    'Angka sesudah kunjungan lebih kecil, tetapi persen turunnya jauh lebih kecil dari periode sebelumnya.',
    'Karena itu membandingkan angka akhir saja akan membuat penurunan sesudah kunjungan tampak lebih baik.',
    'Belum padam adalah bagian luas terbakar yang apinya masih bertahan dari hari sebelumnya.'], skala_huruf=1.65)
LUAS['judul_bentuk'] = 'temuan'
LUAS['utama'] = dict(B.LUAS['utama'], garis=dict(B.LUAS['utama']['garis'], zona={'dari': '1 Nov', 'sampai': '12 Nov', 'label': 'Sesudah kunjungan'}))

UKURAN = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': 'Perbandingan apple to apple', 'rasio': 0.66,
    'judul': f'Diukur dengan persen dan rasio, kecepatan padam harian setara; yang membaik hanya api yang lama menyala, turun ke {t("klw.ses.p9", "|persen")}',
    'cut_off': False,
    'tabel': {'judul_panel': 'Ukuran yang tidak bergantung pada besar kecilnya kebakaran', 'ikon': 'data', 'peringkat': False,
              'data': dict(TABEL_UK, sorot=['Luas api yang menyala lebih dari tiga hari (%)', 'Belum padam dibanding kemarin, nilai tengah (%)'])},
    'panel': {'judul': 'Mengapa memakai persen dan rasio', 'ikon': 'ringkasan', 'skala_huruf': 1.33, 'daftar': [
        'Kebakaran yang lebih kecil wajar menghasilkan angka akhir lebih kecil, walaupun pemadamannya tidak lebih cepat.',
        'Persen dan rasio membandingkan tiap periode dengan keadaan awalnya sendiri, sehingga setara.',
        'Rata-rata berbobot memberi bobot sesuai luas api, sehingga hari dengan api kecil tidak menarik angka berlebihan; cara ini dipakai untuk luas yang padam dalam dua hari.',
        'Rata-rata biasa ikut ditampilkan sebagai pembanding, tetapi tidak dipakai untuk menarik kesimpulan.']},
    'pita': {'label': 'Intinya', 'nada': 'data', 'kolom': [
        {'ikon': 'turun', 'judul': 'Yang melambat', 'isi': 'Semua laju turun per sepuluh hari lebih kecil sesudah kunjungan.'},
        {'ikon': 'kalender', 'judul': 'Yang setara', 'isi': 'Kecepatan padam harian, diukur dengan dua cara, hampir sama.'},
        {'ikon': 'karhutla', 'judul': 'Yang membaik', 'isi': 'Api besar yang lama menyala jauh berkurang.'}]},
    'sumber': S_GAB,
}

RASIO = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': 'Rasio harian belum padam', 'rasio': 0.6,
    'judul': f'Tiap hari, belum padam biasanya tinggal {t("rb.median.seb", "|persen")} dari hari sebelumnya sebelum kunjungan dan {t("rb.median.ses", "|persen")} sesudahnya',
    'cut_off': False,
    'utama': {'judul': 'Belum padam dibanding sehari sebelumnya', 'ikon': 'karhutla', 'gambar': True,
              'subjudul_grafik': 'Persen, Papua Selatan; di bawah seratus persen berarti api menyusut dari hari sebelumnya',
              'garis': {'data': {'csv': 'data/papsel/rasio_harian.csv', 'kolom': [{'nama': 'hari'}, {'nama': 'Belum padam dibanding kemarin', 'fmt': '0'}],
                                 'keyakinan': 'resmi', 'sumber': S_CT},
                        'zona': {'dari': '1 Nov', 'sampai': '10 Nov', 'label': 'Sesudah kunjungan'},
                        'mulai_nol': True, 'skala_huruf': 1.1}},
    'panel': {'judul': 'Cara membaca rasio harian', 'ikon': 'kalender', 'daftar': [
        'Rasio harian adalah luas belum padam pada suatu hari dibagi luas belum padam sehari sebelumnya.',
        'Nilai tengah dipakai karena beberapa hari melonjak lebih dari tiga kali lipat saat api baru muncul.',
        f'Rata-rata berbobot luas kemarin menghasilkan {t("rb.bobot.seb", "|persen")} dan {t("rb.bobot.ses", "|persen")}, tetapi cara ini hanya ditentukan hari pertama dan terakhir tiap periode, sehingga tidak stabil.',
        f'Ukuran berbobot yang stabil adalah luas yang padam dalam dua hari: {t("rp.bobot.seb", "|persen")} sebelum dan {t("rp.bobot.ses", "|persen")} sesudah kunjungan.']},
    'sumber': S_CT,
}

UMUR = dict(B.UMUR)
UMUR['jenis_slide'] = 'panel'
UMUR['judul'] = f'Dihitung menurut luas, cluster yang menyala lebih dari tiga hari turun dari {t("klw.seb.p9", "|persen")} menjadi {t("klw.ses.p9", "|persen")}'
UMUR['utama'] = dict(B.UMUR['utama'], judul='Lama api menyala, dibobot menurut luasnya',
                     subjudul_grafik='Persen dari luas semua api yang mulai menyala pada tiap periode')
UMUR['utama']['kolom_tumpuk'] = dict(B.UMUR['utama']['kolom_tumpuk'],
                                     data=dict(B.UMUR['utama']['kolom_tumpuk']['data'], csv='data/papsel/umur_cluster_luas.csv'), total=False)
UMUR['panel'] = dict(B.UMUR['panel'], daftar=[
    f'Dihitung per jumlah cluster, yang menyala lebih dari tiga hari turun dari {t("kl.seb.p9", "|persen")} menjadi {t("kl.ses.p9", "|persen")}.',
    'Bobot luas dipakai karena api besar lebih berat ditangani; luas tiap api diambil pada enam hari pertamanya supaya setara.',
    'Sebelum berarti api yang mulai menyala pada lima hari terakhir Oktober; sesudah berarti lima hari pertama November. Tiap api diamati paling sedikit enam hari.',
    'Kecepatan padam ini tidak hanya hasil pemadaman; hujan dan habisnya bahan bakar ikut berperan.'])

SIMPUL = dict(B.SIMPUL)
SIMPUL['judul'] = 'Sesudah kunjungan kebakaran lebih kecil dan api besar lebih cepat padam, tetapi laju penurunan melambat dan kecepatan padam harian setara'
SIMPUL['kartu'] = [
    {'label': 'Luas terbakar', 'ikon': 'luas', 'warna': 'navy', 'judul': 'Kebakaran lebih kecil', 'isi': f'Rata-rata luas terbakar turun dari {t("seb.luas.hari", "|satuan")} menjadi {t("ses.luas.hari", "|satuan")} per hari.'},
    {'label': 'Laju turun', 'ikon': 'turun', 'warna': 'oranye', 'judul': 'Penurunan melambat', 'isi': f'Luas harian {t("laju.seb.luas", "|persen|arah")} sebelum kunjungan, tetapi hanya {t("laju.ses.luas", "|persen|arah")} sesudahnya.'},
    {'label': 'Belum padam', 'ikon': 'karhutla', 'warna': 'navy', 'judul': 'Penyusutan harian setara', 'isi': f'Belum padam biasanya tinggal {t("rb.median.seb", "|persen")} dari kemarin sebelum kunjungan, {t("rb.median.ses", "|persen")} sesudahnya.'},
    {'label': 'Padam dua hari', 'ikon': 'kalender', 'warna': 'navy', 'judul': 'Hampir sama', 'isi': f'Luas yang padam dalam dua hari {t("rp.bobot.seb", "|persen")} sebelum dan {t("rp.bobot.ses", "|persen")} sesudah kunjungan.'},
    {'label': 'Api besar', 'ikon': 'karhutla', 'warna': 'navy', 'judul': 'Lebih cepat padam', 'isi': f'Luas cluster yang menyala lebih dari tiga hari turun dari {t("klw.seb.p9", "|persen")} menjadi {t("klw.ses.p9", "|persen")}.'},
    {'label': 'Merauke', 'ikon': 'wilayah', 'warna': 'oranye', 'judul': 'Penurunan di luar Merauke', 'isi': f'Sebanyak {t("luar.porsi", "|persen")} penurunan luas provinsi berasal dari tiga kabupaten selain Merauke.'},
    {'label': 'Faktor lain', 'ikon': 'cuaca-ekstrem', 'warna': 'oranye', 'judul': 'Hujan dan OMC', 'isi': f'Ada peluang awan hujan di selatan Merauke pada akhir Oktober, dan OMC sudah terbang {t("omc.sorti", "|satuan")} sebelum kunjungan.'},
    {'label': 'Nasional', 'ikon': 'karhutla', 'warna': 'oranye', 'judul': 'Terluas di Indonesia', 'isi': f'Sejak awal November Papua Selatan menyumbang {t("nas.porsi", "|persen")} luas terbakar nasional.'}]

SPEK = dict(B.SPEK)
SPEK['_catatan'] = 'Revisi 2: perbandingan apple to apple. Dibangun dari spek/bangun_spek_papsel_rev2.py.'
SPEK['pesan_kunci'] = ('Sesudah kunjungan kebakaran Papua Selatan lebih kecil dan api besar lebih cepat padam, '
                       'tetapi diukur dengan persen dan rasio laju penurunannya melambat dan Merauke belum surut.')
SPEK['slide'] = [B.SAMPUL, RINGKAS, {'jenis': 'daftar-isi'}, {'jenis': 'pembatas-seksi', 'bagian': 1}, LUAS, B.PETA, B.KAB,
                 {'jenis': 'pembatas-seksi', 'bagian': 2}, UKURAN, RASIO, UMUR, {'jenis': 'pembatas-seksi', 'bagian': 3}, B.NAS, SIMPUL, B.PENUTUP]

if __name__ == '__main__':
    ANGKA = {'ps.' + k: v for k, v in B.ANGKA.items()}
    rp = AKAR / 'data/angka.json'
    reg = json.loads(rp.read_text(encoding='utf-8'))
    reg['angka'].update(ANGKA)
    rp.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/papsel-kunjungan-rev2.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(ANGKA)} angka, {len(SPEK["slide"])} slide')
