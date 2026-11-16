#!/usr/bin/env python3
"""Revisi 3 Papsel (13 Nov 2026): isi sama dengan rev2, dengan arahan pemilik sesudahnya:
judul "Pengaruh Kunjungan Kepala BNPB", tanggal kunjungan tertulis jelas (sampul, ringkasan, grafik), grafik batang berlabel tanggal
tanpa batang abu dan tanpa persen neto di pojok, peta hotspot merah. Jalankan dari folder bnpb: assets/proyek-papsel/bangun-rev3.sh
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bangun_spek_papsel as B  # noqa: E402
import bangun_spek_papsel_rev2 as R2  # noqa: E402
from bangun_spek_papsel import a, t, CT, S_CT  # noqa: E402

AKAR = B.AKAR
a('tgl', '31 Oktober 2026', '', B.RL, 'Renlap rute udara BNPB, 30 Okt 2026', catatan='tanggal kunjungan Kepala BNPB ke Merauke')
a('jendela.seb', '21-30 Okt', '', CT, S_CT)
a('jendela.ses', '1-10 Nov', '', CT, S_CT)

SAMPUL = dict(B.SAMPUL, subjudul='Merauke, 31 Oktober 2026')
GRAFIK = dict(B.RINGKAS['grafik'], judul_panel='Luas lahan terbakar per hari, empat periode sepuluh hari', pembanding=False, ubah=False,
              data=dict(B.RINGKAS['grafik']['data'], csv='data/papsel/ringkas_tgl.csv'))
RINGKAS = dict(R2.RINGKAS, grafik=GRAFIK)
RINGKAS['panel'] = dict(R2.RINGKAS['panel'], daftar=[
    f'**Kunjungan.** Kepala BNPB meninjau karhutla Merauke dari udara pada {t("tgl", "|teks")}.'] + R2.RINGKAS['panel']['daftar'][1:])
LUAS = dict(R2.LUAS)
LUAS['utama'] = dict(R2.LUAS['utama'], subjudul_grafik=f'Hektare per hari; kunjungan Kepala BNPB {t("tgl", "|teks")}',
                     garis=dict(R2.LUAS['utama']['garis'], zona={'dari': '1 Nov', 'sampai': '10 Nov', 'label': 'Sesudah kunjungan'}))
LUAS['panel'] = dict(R2.LUAS['panel'], skala_huruf=1.57, daftar=[
    f'Kepala BNPB berkunjung ke Merauke pada {t("tgl", "|teks")}.',
    f'Sebelum berarti {t("jendela.seb", "|teks")}, sesudah berarti {t("jendela.ses", "|teks")}. Hari kunjungan tidak ikut dihitung.'] + R2.LUAS['panel']['daftar'][1:])

KAJIAN = 'papsel-pengaruh'
SPEK = dict(R2.SPEK)
SPEK['_catatan'] = 'Revisi 3: judul Pengaruh Kunjungan, tanggal kunjungan tertulis jelas. Dibangun dari spek/bangun_spek_papsel_rev3.py.'
SPEK['kajian'] = KAJIAN
SPEK['judul_dokumen'] = 'Pengaruh Kunjungan Kepala BNPB terhadap Karhutla Papua Selatan'
SPEK['slide'] = [SAMPUL, RINGKAS] + R2.SPEK['slide'][2:4] + [LUAS] + R2.SPEK['slide'][5:]
TEMA = {'judul': 'Pengaruh Kunjungan Kepala BNPB terhadap Karhutla Papua Selatan', 'subjudul': SAMPUL['subjudul'], 'judul_pendek': 'Karhutla Papua Selatan',
        'nama_berkas': 'Pengaruh Kunjungan Kepala BNPB terhadap Karhutla Papua Selatan {DDMMYY}', 'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
        'kata_kunci': ['BNPB', 'karhutla', 'Papua Selatan', 'Merauke'], 'cakupan_sampul': 'Provinsi Papua Selatan.'}

if __name__ == '__main__':
    import csv
    with (AKAR / 'data/papsel/dasarian.csv').open(encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    lbl = ['1-10 Okt', '11-20 Okt', '21-30 Okt, sebelum', '1-10 Nov, sesudah']
    with (AKAR / 'data/papsel/ringkas_tgl.csv').open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['periode', 'Luas terbakar per hari'])
        w.writerows([[l, r['luas']] for l, r in zip(lbl, rows)])
    ANGKA = {'ps.' + k: v for k, v in B.ANGKA.items()}
    rp = AKAR / 'data/angka.json'
    reg = json.loads(rp.read_text(encoding='utf-8'))
    reg['angka'].update(ANGKA)
    rp.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    tp = AKAR / 'tema.json'
    tm = json.loads(tp.read_text(encoding='utf-8'))
    tm['kajian'][KAJIAN] = TEMA
    tp.write_text(json.dumps(tm, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/papsel-kunjungan-rev3.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(ANGKA)} angka, {len(SPEK["slide"])} slide')
