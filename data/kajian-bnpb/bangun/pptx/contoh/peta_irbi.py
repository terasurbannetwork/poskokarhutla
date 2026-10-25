#!/usr/bin/env python3
"""Peta dasar contoh untuk spek-mitigasi: kelas IRBI 2023 per kab/kota (Tinggi, Sedang), latar putih tanpa laut.

Pengganti sementara sampai bangun/visual menghasilkan PNG peta resmi; warna dari tema.json (skala.irbi, T8),
data dari data/irbi/irbi_kab_2015_2025.csv, batas dari public/geo. Label dan legenda TIDAK dibakar ke PNG:
deck menggambarnya native. Keluaran: ../keluaran/peta-irbi-2023.png dan manifest perender di sebelahnya
(.json: unsur peta resmi untuk kaki legenda, hash masukan untuk cek basi). Poligon tanpa kelas menggagalkan
render, karena tanpa arsir ia tampak sebagai lubang putih (PEDOMAN B1.4).
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

import pymupdf

SINI = Path(__file__).resolve().parent
sys.path.insert(0, str(SINI.parents[1] / 'kontrak'))
from tema import muat, warna  # noqa: E402

AKAR = SINI.parents[2]          # data/kajian-bnpb
REPO = AKAR.parents[1]
B = (94.8, -11.2, 141.4, 6.3)   # bujur barat, lintang selatan, bujur timur, lintang utara
PW = 1600
PH = round(PW * (B[3] - B[1]) / (B[2] - B[0]))
ALIAS = {('75', 'Pahuwato'): 'Pohuwato'}  # ejaan ganda di public/geo, sama dengan bangun/visual/peta.mjs dan bangun/irbi.py
UNSUR = {'sumber_batas': 'public/geo Pantau Bencana (asal belum terdokumentasi)',
         'sistem_referensi': 'WGS84 geografis', 'proyeksi': 'Ekuirektangular', 'catatan': 'Batas wilayah bukan rujukan resmi'}


def proyek(x, y):
    return (x - B[0]) / (B[2] - B[0]) * PW, (B[3] - y) / (B[3] - B[1]) * PH


def jalur(geom):
    polys = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
    d = []
    for p in polys:
        pts, akhir = [], None
        for x, y in p[0]:
            q = proyek(x, y)
            if akhir is None or abs(q[0] - akhir[0]) + abs(q[1] - akhir[1]) > 0.6:
                pts.append(q)
                akhir = q
        if len(pts) > 2:
            d.append('M' + 'L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + 'Z')
    return ''.join(d)


def main(tahun='2023'):
    t = muat()
    ir = t['warna']['skala']['irbi']
    isi = {lab: warna(t, f'skala.{ir["ramp"]}.{k}') for lab, k in zip(ir['label'], ir['kelas'])}
    data = AKAR / 'data/irbi/irbi_kab_2015_2025.csv'
    kelas = {}
    with data.open(encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['tahun'] == tahun:
                kelas[(r['prov_kode'], r['nama'])] = r['kelas_total']
    putih, batas = warna(t, 'kertas'), warna(t, 'batas')
    s, tak_cocok, masukan = [], [], [data]
    for berkas in sorted((REPO / 'public/geo/kabupaten').glob('*.json')):
        masukan.append(berkas)
        for ft in json.loads(berkas.read_text(encoding='utf-8'))['features']:
            nama = ft['properties']['kab']
            k = kelas.get((berkas.stem, ALIAS.get((berkas.stem, nama), nama)))
            if k not in isi:
                tak_cocok.append(f'{berkas.stem}|{nama} ({k})')
                continue
            s.append(f'<path d="{jalur(ft["geometry"])}" fill="{isi[k]}" stroke="{putih}" stroke-width="0.5"/>')
    assert not tak_cocok, f'{len(tak_cocok)} poligon tanpa kelas IRBI {tahun}: {tak_cocok[:5]}; tambah alias atau arsir "Belum terdata"'
    n_kab = len(s)
    prov = REPO / 'public/geo/provinsi.json'
    masukan.append(prov)
    for ft in json.loads(prov.read_text(encoding='utf-8'))['features']:
        s.append(f'<path d="{jalur(ft["geometry"])}" fill="none" stroke="{batas}" stroke-width="1"/>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{PW}" height="{PH}" viewBox="0 0 {PW} {PH}">{"".join(s)}</svg>'
    out = AKAR / 'bangun/pptx/keluaran/peta-irbi-2023.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    pymupdf.open('svg', svg.encode())[0].get_pixmap(alpha=True).save(out)
    man = {'png': out.name, 'tahun': tahun, 'poligon_kab': n_kab, 'tanpa_data': 0, 'unsur_peta': UNSUR,
           'masukan': {str(p.relative_to(REPO)): hashlib.sha256(p.read_bytes()).hexdigest() for p in masukan}}
    out.with_suffix('.json').write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding='utf-8')
    print('peta', out, f'{PW}x{PH}', 'poligon kab/kota berkelas', n_kab)


if __name__ == '__main__':
    main()
