"""Hujan harian per kab/kota terdampak kekeringan -> bahan/hujan.json (cache untuk buat.py).

Sumber: Open-Meteo forecast API (model gabungan; metode sama dengan scripts/kekeringan/hth.py "Deteksi Centurisk97"),
`daily=precipitation_sum&past_days=92&forecast_days=16`, zona waktu Asia/Jakarta. Bukan pos hujan BMKG.
Titik: kisi 0,2 derajat di dalam batas kab/kota (public/geo/kabupaten), paling sedikit titik tengah poligon terbesar.
Hujan kab/kota = rerata titik; HTH kab/kota = median HTH titik (hari < 1 mm berturut-turut, ambang BMKG).

    python hujan.py        # ambil ulang (sekali; diambil 12 Nov 2026)
"""
import json, os, statistics, sys, urllib.request

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..', '..'))
GEO = os.path.join(REPO, 'public', 'geo', 'kabupaten')
KAB = [('33', 'Klaten'), ('35', 'Blitar'), ('33', 'Pemalang'), ('33', 'Temanggung'), ('33', 'Grobogan'), ('33', 'Boyolali'),
       ('73', 'Bone'), ('73', 'Takalar'), ('32', 'Subang'), ('72', 'Banggai Kepulauan'), ('33', 'Kendal'), ('33', 'Pekalongan')]
URL = ('https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum'
       '&past_days=92&forecast_days=16&timezone=Asia%2FJakarta')


def cincin(f):
    g = f['geometry']
    return g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]


def di_dalam(x, y, r):
    c = False
    for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]):
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            c = not c
    return c


def luas(r):
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1])) / 2


def titik(kp, kab, step=0.2):
    f = next(f for f in json.load(open(os.path.join(GEO, f'{kp}.json'), encoding='utf-8'))['features'] if f['properties']['kab'] == kab)
    polys = cincin(f)
    xs = [p[0] for poly in polys for p in poly[0]]; ys = [p[1] for poly in polys for p in poly[0]]
    out = []
    x = round(min(xs) // step * step, 2)
    while x <= max(xs):
        y = round(min(ys) // step * step, 2)
        while y <= max(ys):
            if any(di_dalam(x, y, poly[0]) for poly in polys):
                out.append((round(x, 2), round(y, 2)))
            y += step
        x += step
    if not out:   # pulau kecil: titik tengah poligon terbesar
        best = max((poly[0] for poly in polys), key=lambda r: abs(luas(r)))
        a = luas(best); cx = cy = 0
        for (x0, y0), (x1, y1) in zip(best, best[1:] + best[:1]):
            c = x0 * y1 - x1 * y0; cx += (x0 + x1) * c; cy += (y0 + y1) * c
        out = [(round(cx / (6 * a), 3), round(cy / (6 * a), 3))]
    return out


def main():
    hasil = {'sumber': 'Open-Meteo forecast API (model gabungan), bukan pos hujan BMKG', 'diambil': '2026-11-12', 'kab': {}}
    for kp, kab in KAB:
        pts = titik(kp, kab)
        url = URL.format(lat=','.join(str(p[1]) for p in pts), lon=','.join(str(p[0]) for p in pts))
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        d = json.load(urllib.request.urlopen(req, timeout=60))
        d = d if isinstance(d, list) else [d]
        hasil['tanggal'] = d[0]['daily']['time']
        hasil['kab'][f'{kp}|{kab}'] = {'titik': pts, 'hujan': [x['daily']['precipitation_sum'] for x in d]}
        print(kab, len(pts), 'titik', file=sys.stderr)
    json.dump(hasil, open(os.path.join(SINI, 'bahan', 'hujan.json'), 'w', encoding='utf-8'))


if __name__ == '__main__':
    main()
