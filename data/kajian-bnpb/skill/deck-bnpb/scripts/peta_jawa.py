#!/usr/bin/env python3
"""Peta dasar deck pembaruan air 231026: nilai IRBI 2025 per kab/kota Jawa (kekeringan, banjir) dalam 5 kelas nilai.

Pola sama dengan scripts/peta_irbi.py: label dan legenda tidak dibakar ke PNG (deck menggambarnya native),
manifest perender berisi unsur peta dan hash masukan. Kab/kota tanpa nilai diberi warna tanpa-data.
Ambang kelas = titik kuantil 20/40/60/80% dari 119 nilai; IRBI per bahaya tidak punya ambang kelas resmi (data/irbi/README
"Kelas per bahaya tidak dibuat"), jadi legenda menulis rentang nilai nyata tiap kelas (dibaca deck dari manifest), bukan
"kuintil": nilai bulat banyak kembar sehingga jumlah kab/kota per kelas tidak sama. Batang skala, arah utara, dan inset
lokasi Indonesia digambar di PNG (unsur peta pulau, PEDOMAN).
"""
import csv, hashlib, json, sys
from pathlib import Path
import pymupdf

import os
SINI = Path(__file__).resolve().parent
sys.path.insert(0, str(SINI))
from tema import AKAR, muat, warna  # noqa: E402  AKAR = akar proyek (DECK_AKAR)

B = (105.05, -8.85, 114.75, -5.15)
PW = 1800
PH = round(PW * (B[3] - B[1]) / (B[2] - B[0]))
UNSUR = {'sumber_batas': 'public/geo Pantau Bencana (asal belum terdokumentasi)',
         'sistem_referensi': 'WGS84 geografis', 'proyeksi': 'Ekuirektangular', 'catatan': 'Batas wilayah bukan rujukan resmi'}


RAMP = {'banjir': 'air'}  # banjir dibaca sebagai air: skala biru; bahaya lain tetap oranye T8


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
                pts.append(q); akhir = q
        if len(pts) > 2:
            d.append('M' + 'L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + 'Z')
    return ''.join(d)


def batas_kuintil(vals):
    v = sorted(vals)
    return [v[min(len(v) - 1, int(len(v) * q))] for q in (0.2, 0.4, 0.6, 0.8)]


KM_PER_DERAJAT = 111.32 * 0.9925  # ponytail: cos(7 derajat LS) tetap untuk seluruh Jawa; galat < 1% di batas utara/selatan


def unsur(t, prov_feats):
    """Batang skala 100 km, arah utara, dan inset Indonesia dengan kotak Jawa; semuanya di laut (pojok kiri bawah, Laut Jawa)."""
    tinta, laut = warna(t, 'teks-2'), warna(t, 'kertas')
    s = []
    # batang skala di Samudra Hindia, selatan Jawa Barat
    x0, y0 = proyek(107.55, -8.45)
    px100 = 100 / KM_PER_DERAJAT / (B[2] - B[0]) * PW
    for i in range(2):
        s.append(f'<rect x="{x0 + i * px100 / 2:.1f}" y="{y0:.1f}" width="{px100 / 2:.1f}" height="9" fill="{tinta if i == 0 else laut}" stroke="{tinta}" stroke-width="1.5"/>')
    for i, lab in enumerate(('0', '50', '100 km')):
        s.append(f'<text x="{x0 + i * px100 / 2:.1f}" y="{y0 + 30:.1f}" font-family="Helvetica" font-size="20" fill="{tinta}" text-anchor="{"start" if i == 0 else "middle"}">{lab}</text>')
    # arah utara di Laut Jawa
    nx, ny = proyek(111.6, -5.3)
    s.append(f'<path d="M{nx:.1f} {ny:.1f} L{nx - 13:.1f} {ny + 38:.1f} L{nx:.1f} {ny + 29:.1f} L{nx + 13:.1f} {ny + 38:.1f} Z" fill="{tinta}"/>')
    s.append(f'<text x="{nx:.1f}" y="{ny + 64:.1f}" font-family="Helvetica" font-size="22" font-weight="bold" fill="{tinta}" text-anchor="middle">U</text>')
    # inset Indonesia di Samudra Hindia, barat daya Jawa
    ix, iy = proyek(105.12, -7.75)
    iw = 330
    ib = (95.0, -11.0, 141.1, 6.0)
    ih = iw * (ib[3] - ib[1]) / (ib[2] - ib[0])
    ip = lambda x, y: (ix + (x - ib[0]) / (ib[2] - ib[0]) * iw, iy + (ib[3] - y) / (ib[3] - ib[1]) * ih)
    s.append(f'<rect x="{ix - 6:.1f}" y="{iy - 6:.1f}" width="{iw + 12:.1f}" height="{ih + 12:.1f}" fill="{laut}" stroke="{tinta}" stroke-width="1.5"/>')
    for ft in prov_feats:
        polys = [ft['geometry']['coordinates']] if ft['geometry']['type'] == 'Polygon' else ft['geometry']['coordinates']
        for poly in polys:
            pts = [ip(x, y) for x, y in poly[0][::4]]
            if len(pts) > 2:
                s.append('<path d="M' + 'L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + f'Z" fill="{warna(t, "batas")}" stroke="none"/>')
    a, b = ip(B[0], B[3]); c, d = ip(B[2], B[1])
    s.append(f'<rect x="{a:.1f}" y="{b:.1f}" width="{c - a:.1f}" height="{d - b:.1f}" fill="none" stroke="{warna(t, "navy")}" stroke-width="2.5"/>')
    return s


def main(bahaya):
    t = muat()
    data = AKAR / 'data/air-jawa/irbi_kab_2015_2025.csv'
    nilai = {}
    with data.open(encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['tahun'] == '2025':
                nilai[r['kode']] = float(r[bahaya]) if r[bahaya] else None
    bk = batas_kuintil([v for v in nilai.values() if v is not None])  # ambang kelas nilai, bukan kelas resmi
    kelas = lambda v: None if v is None else 1 + sum(v > b for b in bk)
    geo = AKAR / 'data/air-jawa/peta_kab.geojson'
    putih, garis_prov = warna(t, 'kertas'), warna(t, 'batas')
    s, n, kosong, hitung = [], 0, 0, {}
    for ft in json.loads(geo.read_text(encoding='utf-8'))['features']:
        k = kelas(nilai.get(str(ft['properties']['kode'])))
        isi = warna(t, 'tanpa-data') if k is None else warna(t, f'skala.{RAMP.get(bahaya, "api")}.{k}')
        kosong += k is None
        hitung[k] = hitung.get(k, 0) + 1
        s.append(f'<path d="{jalur(ft["geometry"])}" fill="{isi}" stroke="{putih}" stroke-width="0.6"/>')
        n += 1
    assert n == 119, n
    prov = AKAR / 'geo/provinsi.json'
    pf = json.loads(prov.read_text(encoding='utf-8'))['features']
    for ft in pf:
        s.append(f'<path d="{jalur(ft["geometry"])}" fill="none" stroke="{garis_prov}" stroke-width="1.2"/>')
    s += unsur(t, pf)
    isi_kelas = {}
    for v in nilai.values():
        if v is not None:
            isi_kelas.setdefault(kelas(v), []).append(v)
    fmt = lambda v: f'{v:g}'.replace('.', ',')
    legenda = [{'warna': f'skala.{RAMP.get(bahaya, "api")}.{k}', 'label': fmt(min(isi_kelas[k])) + ('' if min(isi_kelas[k]) == max(isi_kelas[k]) else '–' + fmt(max(isi_kelas[k])))}
               for k in sorted(isi_kelas)]
    if kosong:
        legenda.append({'warna': 'tanpa-data', 'label': 'tanpa nilai'})
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{PW}" height="{PH}" viewBox="0 0 {PW} {PH}">{"".join(s)}</svg>'
    out = AKAR / 'peta' / f'peta-irbi-{bahaya}-2025-jawa.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    pymupdf.open('svg', svg.encode())[0].get_pixmap(alpha=True).save(out)
    man = {'png': out.name, 'tahun': '2025', 'bahaya': bahaya, 'ambang_kelas': bk, 'legenda': legenda, 'jumlah_per_kelas': {str(a): b for a, b in hitung.items()},
           'poligon_kab': n, 'tanpa_data': kosong, 'unsur_peta': UNSUR,
           'masukan': {os.path.relpath(p, out.parent): hashlib.sha256(p.read_bytes()).hexdigest() for p in (data, geo, prov)}}
    out.with_suffix('.json').write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding='utf-8')
    print(out.name, f'{PW}x{PH}', 'ambang', bk, [l['label'] for l in legenda], 'kelas', man['jumlah_per_kelas'], 'tanpa data', kosong)


if __name__ == '__main__':
    for b in sys.argv[1:] or ('kekeringan', 'banjir'):
        main(b)
