"""Desa dan kecamatan di dalam zona bahaya gunung api PVMBG (2 Nov 2026, pemilik: "x km dari puncak kurang ditangkap
masyarakat; sebutkan wilayah terdampaknya").

Teks WA PVMBG hanya memberi radius dari puncak dan jarak terjauh di satu sektor (arah mata angin), tanpa nama desa. Zona
didekati: lingkaran radius + irisan sektor 60 derajat ke arah yang disebut PVMBG sampai jarak sektornya. Titik sampel tiap
~150 m di dalam zona dicocokkan dengan poligon desa repo (public/geo/desa, batas Kemendagri disederhanakan, bukan SK batas).
Desa dihitung bila paling sedikit satu titik sampel jatuh di dalamnya. Koordinat puncak dari public/banjir/data/abu_gunungapi.json.

Batas pendekatan: sektor PVMBG sebenarnya mengikuti alur sungai (mis. Besuk Kobokan), bukan irisan lurus; hasilnya perkiraan
untuk komunikasi publik, bukan peta KRB resmi.
"""
import json, math, os

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
GEO = os.path.join(AKAR, 'public', 'geo', 'desa')
LANGKAH_KM = 0.15
_CACHE = {}


def _di_dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        xi, yi = r[i][0], r[i][1]
        xj, yj = r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def _poligon_desa(kotak):
    """Poligon desa yang kotaknya beririsan dengan kotak zona: [(kd, bbox, [cincin luar, lubang...]), ...]."""
    out = []
    for f in sorted(os.listdir(GEO)):
        if not f.endswith('.json'): continue
        jalur = os.path.join(GEO, f)
        if jalur not in _CACHE: _CACHE[jalur] = json.load(open(jalur, encoding='utf-8'))
        for ft in _CACHE[jalur]['features']:
            g = ft['geometry']; bag = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
            for poli in bag:
                xs = [c[0] for c in poli[0]]; ys = [c[1] for c in poli[0]]
                bb = (min(xs), min(ys), max(xs), max(ys))
                if bb[0] > kotak[2] or bb[2] < kotak[0] or bb[1] > kotak[3] or bb[3] < kotak[1]: continue
                out.append((ft['properties']['kd'], bb, poli))
    return out


def zona(lat, lon, radius_km, sektor_km=0, bearing=None, lebar_derajat=60):
    """Desa di dalam zona: {'desa': [(kd, nama, kec, kab, jarak_min_km, 'radius'|'sektor')], 'kec': [(kab, kec, n_desa)], 'kab': [...]}.
    'radius' = desa yang ikut lingkaran radius (segala arah); 'sektor' = hanya terkena perpanjangan sektor."""
    jauh = max(radius_km or 0, sektor_km or 0)
    if not jauh: return {'desa': [], 'kec': [], 'kab': []}
    kmlat, kmlon = 110.574, 111.320 * math.cos(math.radians(lat))
    kotak = (lon - jauh / kmlon, lat - jauh / kmlat, lon + jauh / kmlon, lat + jauh / kmlat)
    pol = _poligon_desa(kotak)
    idx = json.load(open(os.path.join(AKAR, 'public', 'data', 'desa_cari.json'), encoding='utf-8'))
    nama = {kd: (n, kec) for kd, n, kec in idx['baris']}
    hasil = {}
    n = int(jauh / LANGKAH_KM)
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            dx, dy = i * LANGKAH_KM, j * LANGKAH_KM; d = math.hypot(dx, dy)
            if d > jauh: continue
            masuk = d <= (radius_km or 0)
            if not masuk and bearing is not None and d <= sektor_km:
                b = math.degrees(math.atan2(dx, dy)) % 360
                masuk = abs((b - bearing + 180) % 360 - 180) <= lebar_derajat / 2
            if not masuk: continue
            dalam_r = d <= (radius_km or 0)   # bagian radius (segala arah) atau hanya bagian sektor
            x, y = lon + dx / kmlon, lat + dy / kmlat
            for kd, bb, poli in pol:
                if bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] and _di_dalam(x, y, poli[0]) and not any(_di_dalam(x, y, h) for h in poli[1:]):
                    jm, zr = hasil.get(kd, (99, False)); hasil[kd] = (min(jm, d), zr or dalam_r); break
    desa = sorted(((kd, *nama.get(kd, (kd, '?')), idx['kab'].get(kd[:5], kd[:5]), round(jm, 1), 'radius' if zr else 'sektor') for kd, (jm, zr) in hasil.items()), key=lambda t: t[4])
    kec = {}
    for kd, n_, kc, kb, jm, _ in desa: kec.setdefault((kb, kc), []).append(n_)
    kab = sorted({t[3] for t in desa})
    return {'desa': desa, 'kec': sorted(((kb, kc, len(v)) for (kb, kc), v in kec.items()), key=lambda t: -t[2]), 'kab': kab}


if __name__ == '__main__':
    for nm, la, lo, r, s_, b in (('Anak Krakatau', -6.102, 105.423, 5, 0, None), ('Merapi', -7.542, 110.442, 3, 7, 202.5), ('Semeru', -8.108, 112.92, 5, 13, 135)):
        z = zona(la, lo, r, s_, b)
        print(nm, len(z['desa']), 'desa', z['kab'], z['kec'][:8])
