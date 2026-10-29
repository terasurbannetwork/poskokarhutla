#!/usr/bin/env python3
"""Peta dasar deck neraca air Jawa (tanpa teks; legenda dan label digambar deck.py native) + manifest perender.

    .venv/bin/python bangun/pptx/peta_neraca.py      # -> gambar/neraca-air/deck/peta-*.png + .json

Pola sama dengan skill/deck-bnpb/scripts/peta_jawa.py. Kelas memakai batas tetap yang sama dengan peta buku
(bangun/visual/spek-neraca/grafik.json), sehingga peta buku dan deck menunjuk kab/kota yang sama.
"""
import csv, hashlib, json, os, sys
from pathlib import Path
import pymupdf

SINI = Path(__file__).resolve().parent
sys.path.insert(0, str(SINI.parent / 'kontrak'))
from tema import AKAR, muat, warna  # noqa: E402

REPO = AKAR.parents[1]
B = (105.05, -8.85, 114.75, -5.15)
PW = 1800
PH = round(PW * (B[3] - B[1]) / (B[2] - B[0]))
UNSUR = {'sumber_batas': 'public/geo Pantau Bencana (asal belum terdokumentasi)', 'sistem_referensi': 'WGS84 geografis',
         'proyeksi': 'Ekuirektangular', 'catatan': 'Batas wilayah bukan rujukan resmi'}
SPEK = json.loads((AKAR / 'bangun/visual/spek-neraca/grafik.json').read_text(encoding='utf-8'))
PETA = {'n80': 'neraca-peta-n80-kemarau', 'rasio': 'neraca-peta-rasio-kemarau', 'ddl': 'neraca-peta-ddl'}
LABEL = {'n80': ['Kurang >100', 'Kurang 25–100', 'Kurang 0–25', 'Sisa 0–150', 'Sisa >150'],   # label pendek deck (mm)
         'ddl': ['≤0,25', '0,25–0,5', '0,5–1', '1–2', '>2']}
KM = 111.32 * 0.9925  # ponytail: cos(7 derajat LS) tetap untuk seluruh Jawa


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


def unsur(t):
    tinta, laut = warna(t, 'teks-2'), warna(t, 'kertas')
    x0, y0 = proyek(107.55, -8.45)
    px = 100 / KM / (B[2] - B[0]) * PW
    s = [f'<rect x="{x0 + i * px / 2:.1f}" y="{y0:.1f}" width="{px / 2:.1f}" height="9" fill="{tinta if i == 0 else laut}" '
         f'stroke="{tinta}" stroke-width="1.5"/>' for i in range(2)]
    nx, ny = proyek(111.6, -5.3)
    s.append(f'<path d="M{nx:.1f} {ny:.1f} L{nx - 13:.1f} {ny + 38:.1f} L{nx:.1f} {ny + 29:.1f} L{nx + 13:.1f} {ny + 38:.1f} Z" fill="{tinta}"/>')
    return s


def main():
    t = muat()
    data = AKAR / 'data/neraca-air/kab.csv'
    baris = {r['kode']: r for r in csv.DictReader(data.open(encoding='utf-8'))}
    geo = AKAR / 'data/air-jawa/peta_kab.geojson'
    prov = REPO / 'public/geo/provinsi.json'
    feats = json.loads(geo.read_text(encoding='utf-8'))['features']
    pf = [f for f in json.loads(prov.read_text(encoding='utf-8'))['features'] if str(f['properties'].get('kode', ''))[:2] in {'31', '32', '33', '34', '35', '36'}] \
        or json.loads(prov.read_text(encoding='utf-8'))['features']
    idx = {2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5]}
    for kunci, nama in PETA.items():
        sp = next(s for s in SPEK if s['nama'] == nama)
        kol, kl = sp['koroplet']['sumber']['nilai'], sp['koroplet']['kelas']
        batas, ramp = kl['batas'], kl['ramp']
        warn = [f'skala.{ramp}.{i}' for i in idx[len(batas) + 1]]
        hit = [0] * len(warn)
        s = []
        for ft in feats:
            v = baris[str(ft['properties']['kode'])][kol]
            k = sum(float(v) > b for b in batas)
            hit[k] += 1
            s.append(f'<path d="{jalur(ft["geometry"])}" fill="{warna(t, warn[k])}" stroke="{warna(t, "kertas")}" stroke-width="0.6"/>')
        assert sum(hit) == 119, sum(hit)
        for ft in pf:
            s.append(f'<path d="{jalur(ft["geometry"])}" fill="none" stroke="{warna(t, "batas")}" stroke-width="1.2"/>')
        s += unsur(t)
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{PW}" height="{PH}" viewBox="0 0 {PW} {PH}">{"".join(s)}</svg>'
        out = AKAR / 'gambar/neraca-air/deck' / f'peta-{kunci}.png'
        out.parent.mkdir(parents=True, exist_ok=True)
        pymupdf.open('svg', svg.encode())[0].get_pixmap(alpha=True).save(out)
        man = {'png': out.name, 'kolom': kol, 'ambang_kelas': batas,
               'legenda': [{'warna': w, 'label': lab} for w, lab in zip(warn, LABEL.get(kunci, kl['label']))],
               'jumlah_per_kelas': hit, 'poligon_kab': len(feats), 'tanpa_data': 0, 'unsur_peta': UNSUR,
               'masukan': {os.path.relpath(p, REPO): hashlib.sha256(p.read_bytes()).hexdigest() for p in (data, geo, prov)}}
        out.with_suffix('.json').write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding='utf-8')
        print(out.name, hit)


if __name__ == '__main__':
    main()
