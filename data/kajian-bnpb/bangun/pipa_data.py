#!/usr/bin/env python3
"""Tarik data publik kajian pipa/kit gambut Kalteng (prov 62), hitung atribut per kompleks.
Pakai:  python3 pipa_data.py <langkah>   langkah: dasar osm dem gsw bakar chirps wc matriks
Perlu: python3 sistem (osgeo/gdal + numpy). Mentah -> data/raw/pipa, olahan -> data/kajian-bnpb/pipa/data.
"""
import csv, json, math, os, sys, subprocess
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
RAW = f'{R}/data/raw/pipa'
OUT = f'{R}/data/kajian-bnpb/pipa/data'
os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)

def kompleks():
    """865 kompleks prov 62: id,kab,lat,lon,air_km_lama,jalan_km_lama."""
    k = json.load(open(f'{R}/public/data/kendala.json'))['kompleks']
    op = {x['id']: x for x in json.load(open(f'{R}/public/data/operasi.json'))['kompleks']}
    rows = []
    for i, v in k.items():
        if v['prov'] != '62': continue
        o = op[i]
        rows.append(dict(id=i, kab=v['kab'], lat=o['lat'], lon=o['lon'], air_km_lama=v['air_km'],
                         jalan_km_lama=v['jalan_km'], air_jenis_lama=v['air_jenis'], gambut=v['gambut']))
    assert len(rows) == 865, len(rows)
    return rows

def tulis_csv(nama, rows):
    with open(f'{OUT}/{nama}', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

def hav(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2-la1)*p/2)**2 + math.cos(la1*p)*math.cos(la2*p)*math.sin((lo2-lo1)*p/2)**2
    return 12742 * math.asin(math.sqrt(a))

def baca_csv(nama):
    return {r['id']: r for r in csv.DictReader(open(f'{OUT}/{nama}'))}

def dasar():
    rows = kompleks(); tulis_csv('kompleks.csv', rows)
    la = [r['lat'] for r in rows]; lo = [r['lon'] for r in rows]
    print(len(rows), 'kompleks; lat', min(la), max(la), 'lon', min(lo), max(lo))


# ---------- util raster ----------
def _gdal():
    from osgeo import gdal
    gdal.UseExceptions()
    gdal.SetConfigOption('AWS_NO_SIGN_REQUEST', 'YES')
    gdal.SetConfigOption('GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR')
    gdal.SetConfigOption('CPL_VSIL_CURL_ALLOWED_EXTENSIONS', '.tif,.cog')
    return gdal

_ds = {}
def buka(url):
    if url not in _ds:
        _ds[url] = _gdal().Open('/vsicurl/' + url)
    return _ds[url]

def jendela(url, lat, lon, rad_px):
    """Array persegi (2r+1) di sekitar titik; None bila di luar raster."""
    d = buka(url); gt = d.GetGeoTransform()
    c = int((lon - gt[0]) / gt[1]); r = int((lat - gt[3]) / gt[5])
    x0, y0, n = c - rad_px, r - rad_px, 2 * rad_px + 1
    x0c, y0c = max(x0, 0), max(y0, 0)
    x1c, y1c = min(x0 + n, d.RasterXSize), min(y0 + n, d.RasterYSize)
    if x1c <= x0c or y1c <= y0c: return None
    return d.GetRasterBand(1).ReadAsArray(x0c, y0c, x1c - x0c, y1c - y0c)

# ---------- 6. ESA WorldCover 2021 ----------
WC_KELAS = {10: 'pohon', 20: 'semak', 30: 'rumput', 40: 'sawah_ladang', 50: 'bangunan', 60: 'terbuka',
            70: 'salju', 80: 'air_permanen', 90: 'lahan_basah_herba', 95: 'mangrove', 100: 'lumut'}
def wc_url(lat, lon):
    a = math.floor(lat / 3) * 3; b = math.floor(lon / 3) * 3
    return ('https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/'
            f'ESA_WorldCover_10m_2021_v200_{"S" if a < 0 else "N"}{abs(a):02d}E{b:03d}_Map.tif')

def wc():
    import numpy as np
    rows = []
    for r in kompleks():
        a = jendela(wc_url(r['lat'], r['lon']), r['lat'], r['lon'], 50)  # ~1 km kotak (101 px x 10 m)
        assert a is not None, r['id']
        v, n = np.unique(a, return_counts=True); tot = a.size
        o = dict(id=r['id'], wc_titik=int(a[a.shape[0]//2, a.shape[1]//2]), n_px=tot)
        for k, nm in WC_KELAS.items():
            o['wc_' + nm + '_pct'] = round(100 * int(n[v == k].sum()) / tot, 1)
        o['wc_dominan'] = WC_KELAS.get(int(v[n.argmax()]), str(int(v[n.argmax()])))
        rows.append(o)
    for o in rows: assert abs(sum(o[k] for k in o if k.endswith('_pct')) - 100) < 1.5, o
    tulis_csv('worldcover.csv', rows)
    from collections import Counter
    print('WC dominan', Counter(o['wc_dominan'] for o in rows))

# ---------- 5. CHIRPS bulanan (COG, jendela saja) ----------
def chirps():
    import numpy as np
    _gdal()
    base = 'https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_monthly/cogs/chirps-v2.0.%d.%02d.cog'
    rows = kompleks(); YRS = list(range(2001, 2026))
    d0 = buka(base % (2020, 9)); gt = d0.GetGeoTransform()
    nodata = d0.GetRasterBand(1).GetNoDataValue()
    x0 = int((110.5 - gt[0]) / gt[1]); x1 = int((116.0 - gt[0]) / gt[1]) + 1
    y0 = int((1.0 - gt[3]) / gt[5]); y1 = int((-3.7 - gt[3]) / gt[5]) + 1
    jo = {}  # tahun -> array total Jul-Okt (mm)
    for y in YRS:
        tot = 0
        for m in (7, 8, 9, 10):
            a = buka(base % (y, m)).GetRasterBand(1).ReadAsArray(x0, y0, x1 - x0, y1 - y0).astype('float64')
            a[a == nodata] = np.nan; a[a < 0] = np.nan
            tot = tot + a
        jo[y] = tot
    ci = [(int((r['lon'] - gt[0]) / gt[1]) - x0, int((r['lat'] - gt[3]) / gt[5]) - y0) for r in rows]
    for cx, cy in ci: assert 0 <= cx < x1 - x0 and 0 <= cy < y1 - y0
    clim = np.nanmean(np.stack([jo[y] for y in YRS if y <= 2020]), axis=0)  # klimatologi 2001-2020
    wide, ring = [], []
    for r, (cx, cy) in zip(rows, ci):
        c = clim[cy, cx]; o = dict(id=r['id'], clim_jul_okt_mm=round(float(c), 0))
        an = {y: 100 * (jo[y][cy, cx] - c) / c for y in YRS}
        for y in YRS: o[f'anom_{y}'] = round(float(an[y]), 1)
        wide.append(o)
        ring.append(dict(id=r['id'], clim_jul_okt_mm=o['clim_jul_okt_mm'],
                         n_tahun_kering_lt_m20pct=sum(an[y] < -20 for y in YRS),
                         tahun_terkering=min(YRS, key=lambda y: an[y]),
                         anom_terkering_pct=round(float(min(an.values())), 1)))
    tulis_csv('chirps_anomali_tahunan.csv', wide); tulis_csv('chirps_ringkas.csv', ring)
    prov = [dict(tahun=y, jul_okt_mm_rerata_prov=round(float(np.nanmean(jo[y])), 0),
                 anomali_pct=round(float(100 * (np.nanmean(jo[y]) - np.nanmean(clim)) / np.nanmean(clim)), 1)) for y in YRS]
    tulis_csv('chirps_provinsi_tahunan.csv', prov)
    assert all(o['clim_jul_okt_mm'] > 100 for o in ring)
    print('terkering prov:', sorted(prov, key=lambda p: p['anomali_pct'])[:5])

# ---------- 1. OSM via Overpass (ubin 0,5 derajat, hanya yang berisi kompleks, bisa dilanjut) ----------
OVP = 'https://overpass-api.de/api/interpreter'
JALAN_RE = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|track|path|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|living_street'
def osm_ubin():
    s = set()
    for r in kompleks():
        s.add((math.floor(r['lat'] / 0.5), math.floor(r['lon'] / 0.5)))
    return sorted(s)

def osm_tarik(pekerja=2):
    import time, urllib.request, urllib.parse
    from concurrent.futures import ThreadPoolExecutor
    pad = 0.15  # tepi supaya jarak dekat batas ubin tidak salah
    def satu(t):
        la, lo = t; fn = f'{RAW}/osm/ubin_{la}_{lo}.json'
        if os.path.exists(fn): return t, 'ada'
        b = f'({la*0.5-pad},{lo*0.5-pad},{la*0.5+0.5+pad},{lo*0.5+0.5+pad})'
        q = (f'[out:json][timeout:180];(way["highway"~"^({JALAN_RE})$"]{b};'
             f'way["waterway"~"^(stream|ditch|drain|canal|river)$"]{b};way["natural"="water"]{b};'
             f'way["landuse"="reservoir"]{b};);out tags geom;')
        for n in range(6):
            try:
                rq = urllib.request.Request(OVP, urllib.parse.urlencode({'data': q}).encode(),
                    {'User-Agent': 'poskokarhutla-kajian/1.0 (pinkatitan@gmail.com)', 'Accept': '*/*'})
                d = urllib.request.urlopen(rq, timeout=300).read()
                json.loads(d)  # harus JSON utuh
                open(fn + '.tmp', 'wb').write(d); os.replace(fn + '.tmp', fn)
                return t, f'{len(d)//1024} KB'
            except Exception as e:
                time.sleep(20 * (n + 1)); err = repr(e)
        return t, 'GAGAL ' + err
    ub = osm_ubin(); print(len(ub), 'ubin', flush=True)
    with ThreadPoolExecutor(pekerja) as ex:
        for t, st in ex.map(satu, ub): print(t, st, flush=True)

# ---------- 4. MCD64A1 area terbakar (Earthdata; token dari .env, tak pernah ditulis) ----------
def _token():
    for l in open(f'{R}/.env'):
        if l.startswith('EARTHDATA_TOKEN='): return l.split('=', 1)[1].strip().strip('"\'')
    raise SystemExit('EARTHDATA_TOKEN tidak ada di .env')

def mcd_unduh(pekerja=3):
    from concurrent.futures import ThreadPoolExecutor
    ent = json.load(open(f'{RAW}/mcd64/cmr.json'))['feed']['entry']
    jobs = [(e['title'], [l['href'] for l in e['links'] if l['href'].endswith('.hdf') and l['href'].startswith('https://data.')][0]) for e in ent]
    tok = _token()
    def satu(j):
        nm, u = j; fn = f'{RAW}/mcd64/{nm}.hdf'
        if os.path.exists(fn) and os.path.getsize(fn) > 100000: return 'ada'
        for n in range(4):
            # konfigurasi lewat stdin supaya token tak muncul di daftar proses
            cfg = f'header = "Authorization: Bearer {tok}"\nurl = "{u}"\noutput = "{fn}.tmp"\n'
            p = subprocess.run(['curl', '-sS', '-L', '-m', '300', '-K', '-', '-w', '%{http_code}'], input=cfg, capture_output=True, text=True)
            if p.stdout.strip().endswith('200') and os.path.getsize(fn + '.tmp') > 100000:
                os.replace(fn + '.tmp', fn); return 'ok'
        return 'GAGAL ' + p.stdout[-20:] + p.stderr[-100:]
    n_ok = 0
    with ThreadPoolExecutor(pekerja) as ex:
        for i, st in enumerate(ex.map(satu, jobs)):
            if st.startswith('GAGAL'): print(jobs[i][0], st, flush=True)
            else: n_ok += 1
            if i % 50 == 0: print(i, n_ok, flush=True)
    print('selesai', n_ok, 'dari', len(jobs))

def mcd_olah():
    """Jalankan dengan data/raw/pipa/venv-hdf/bin/python (butuh pyhdf+numpy; HDF4 tak terbaca GDAL Homebrew).
    Per kompleks: tahun terbakar di jendela 5x5 piksel (~2,3 km) dan 11x11 (~5 km) di grid MODIS 463 m, 2001-2025."""
    import re, glob
    import numpy as np
    from pyhdf.SD import SD
    Rb = 6371007.181; T = 1111950.519667; PS = T / 2400
    rows = kompleks()
    pos = {}  # (h,v) -> [(id, col, row)]
    for r in rows:
        la, lo = math.radians(r['lat']), math.radians(r['lon'])
        x, y = Rb * lo * math.cos(la), Rb * la
        h = int((x + 20015109.354) // T); v = int((10007554.677 - y) // T)
        c = int((x - (-20015109.354 + h * T)) / PS); rw = int((10007554.677 - v * T - y) / PS)
        pos.setdefault((h, v), []).append((r['id'], c, rw))
    assert set(pos) <= {(29, 8), (29, 9)}, set(pos)
    t5 = {r['id']: {} for r in rows}; t11 = {r['id']: {} for r in rows}
    hari = {}
    fs = sorted(glob.glob(f'{RAW}/mcd64/MCD64A1.A*.hdf')); assert len(fs) == 600, len(fs)
    for fn in fs:
        m = re.search(r'\.A(\d{4})(\d{3})\.h(\d\d)v(\d\d)\.', fn)
        yr, h, v = int(m[1]), int(m[3]), int(m[4])
        a = SD(fn).select('Burn Date').get()
        for (i, c, rw) in pos.get((h, v), []):
            for rad, dst in ((2, t5), (5, t11)):
                w = a[max(rw - rad, 0):rw + rad + 1, max(c - rad, 0):c + rad + 1]
                dst[i].setdefault(yr, 0)
                dst[i][yr] += int(((w >= 1) & (w <= 366)).sum())
            # catatan: piksel di tepi ubin terpotong; tak ada kompleks yang jatuh <5 px dari tepi bila assert di bawah lolos
    for pp in pos.values():
        for (i, c, rw) in pp: assert 5 <= c < 2395 and 5 <= rw < 2395, (i, c, rw)
    out = []
    for r in rows:
        i = r['id']; y5 = sorted(y for y, n in t5[i].items() if n > 0); y11 = sorted(y for y, n in t11[i].items() if n > 0)
        out.append(dict(id=i, bakar_n_tahun_2km=len(y5), bakar_n_tahun_5km=len(y11),
                        bakar_tahun_terakhir_2km=y5[-1] if y5 else '',
                        bakar_frak_piksel_tahun_2km=round(sum(t5[i].values()) / (25 * 25), 3),
                        bakar_tahun_2km=' '.join(map(str, y5))))
    assert all(0 <= o['bakar_n_tahun_2km'] <= 25 and o['bakar_n_tahun_2km'] <= o['bakar_n_tahun_5km'] for o in out)
    tulis_csv('area_terbakar.csv', out)
    from collections import Counter
    print('n tahun terbakar (2 km):', sorted(Counter(o['bakar_n_tahun_2km'] for o in out).items()))

# ---------- 1b. Jarak ke jalan/air dari OSM ----------
KEND = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service', 'track',
        'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link', 'living_street'}
UTAMA = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'motorway_link', 'trunk_link', 'primary_link',
         'secondary_link', 'tertiary_link'}
JENIS_AIR = {'river': 'sungai', 'canal': 'kanal', 'ditch': 'parit', 'drain': 'parit', 'stream': 'anak_sungai'}
CAP_KM = 16.0  # ubin ditarik dengan tepi 0,15 derajat (~16,6 km): jarak lebih jauh tak dijamin benar
LAT0 = -1.5; KX = 111.32 * math.cos(math.radians(LAT0)); KY = 110.57

def osm_muat():
    """-> {kategori: (xy km float32 [N,2], lat, lon, label[N])}, ditumpuk dari semua ubin, way unik."""
    import numpy as np, glob
    seen = set(); P = {k: ([], [], []) for k in ('jalan_kend', 'jalan_utama', 'jalan_setapak', 'air_semua', 'air_kecil')}
    def tambah(k, lat, lon, lab):
        P[k][0].append(lat); P[k][1].append(lon); P[k][2].append(np.full(len(lat), lab, dtype=object))
    for fn in sorted(glob.glob(f'{RAW}/osm/ubin_*.json')):
        for e in json.load(open(fn))['elements']:
            if e['type'] != 'way' or e['id'] in seen or 'geometry' not in e: continue
            seen.add(e['id']); t = e.get('tags', {}); g = e['geometry']
            if len(g) < 2: continue
            la = np.array([p['lat'] for p in g]); lo = np.array([p['lon'] for p in g])
            # padatkan: titik tiap <=150 m supaya jarak ke titik ~ jarak ke garis (galat <=75 m)
            seg = np.hypot(np.diff(lo) * KX, np.diff(la) * KY); n = np.maximum(np.ceil(seg / 0.15).astype(int), 1)
            la2 = np.concatenate([np.linspace(la[i], la[i+1], n[i], endpoint=False) for i in range(len(seg))] + [la[-1:]])
            lo2 = np.concatenate([np.linspace(lo[i], lo[i+1], n[i], endpoint=False) for i in range(len(seg))] + [lo[-1:]])
            h = t.get('highway'); w = t.get('waterway')
            if h in KEND:
                tambah('jalan_kend', la2, lo2, h)
                if h in UTAMA: tambah('jalan_utama', la2, lo2, h)
            elif h == 'path': tambah('jalan_setapak', la2, lo2, h)
            if w in JENIS_AIR:
                tambah('air_semua', la2, lo2, JENIS_AIR[w])
                if w in ('stream', 'ditch', 'drain'): tambah('air_kecil', la2, lo2, JENIS_AIR[w])
            elif t.get('natural') == 'water' or t.get('landuse') == 'reservoir':
                tambah('air_semua', la2, lo2, 'danau_kolam')  # tepi poligon
    out = {}
    for k, (a, b, c) in P.items():
        la = np.concatenate(a); lo = np.concatenate(b); lab = np.concatenate(c)
        out[k] = (np.stack([(lo - 111.0) * KX, (la - LAT0) * KY], 1).astype('float32'), la, lo, lab)
    return out

def terdekat(xy_q, xy_p, blok=150000):
    import numpy as np
    best = np.full(len(xy_q), np.inf, dtype='float32'); idx = np.zeros(len(xy_q), dtype=int)
    for s in range(0, len(xy_p), blok):
        p = xy_p[s:s + blok]
        d = ((xy_q[:, None, :] - p[None, :, :]) ** 2).sum(-1)
        j = d.argmin(1); dm = d[np.arange(len(xy_q)), j]
        u = dm < best; best[u] = dm[u]; idx[u] = j[u] + s
    return np.sqrt(best), idx

def osm():
    import numpy as np
    rows = kompleks(); M = osm_muat()
    q = np.array([[(r['lon'] - 111.0) * KX, (r['lat'] - LAT0) * KY] for r in rows], dtype='float32')
    out = [dict(id=r['id'], kab=r['kab'], lat=r['lat'], lon=r['lon'], air_km_lama=r['air_km_lama'], jalan_km_lama=r['jalan_km_lama']) for r in rows]
    for k, (xy, la, lo, lab) in M.items():
        print(k, len(xy), 'titik', flush=True)
        d, j = terdekat(q, xy)
        for o, dd, jj in zip(out, d, j):
            o[k + '_km'] = round(min(float(dd), CAP_KM), 2); o[k + '_terpotong'] = int(dd > CAP_KM)
            if k in ('jalan_kend', 'air_semua', 'jalan_utama'):
                o[k + '_jenis'] = lab[jj]; o[k + '_lat'] = round(float(la[jj]), 5); o[k + '_lon'] = round(float(lo[jj]), 5)
    # self-check: jarak harus masuk akal dan kategori bersarang konsisten (subset tak mungkin lebih dekat dari induknya)
    for o in out:
        assert o['jalan_kend_km'] <= o['jalan_utama_km'] + 1e-6 and o['air_semua_km'] <= o['air_kecil_km'] + 1e-6, o
        assert 0 <= o['air_semua_km'] <= CAP_KM
    tulis_csv('osm_jarak.csv', out)
    import statistics as st
    for k in ('jalan_kend', 'jalan_utama', 'jalan_setapak', 'air_semua', 'air_kecil'):
        v = [o[k + '_km'] for o in out]; print(k, 'median', st.median(v), 'p90', sorted(v)[int(.9 * len(v))], 'terpotong', sum(o[k + '_terpotong'] for o in out))

# ---------- 2. Copernicus DEM GLO-30 (DSM, termasuk kanopi) ----------
def dem_url(lat, lon):
    a = math.floor(lat); b = math.floor(lon); n = f'{"S" if a < 0 else "N"}{abs(a):02d}_00_{"E" if b >= 0 else "W"}{abs(b):03d}_00'
    return f'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{n}_DEM/Copernicus_DSM_COG_10_{n}_DEM.tif'

def elev(lat, lon):
    import numpy as np
    a = jendela(dem_url(lat, lon), lat, lon, 1)  # rerata 3x3 (~90 m) mengurangi derau kanopi
    return None if a is None else round(float(a.astype('float64').mean()), 1)

def dem():
    rows = []
    for o in csv.DictReader(open(f'{OUT}/osm_jarak.csv')):
        e0 = elev(float(o['lat']), float(o['lon']))
        ea = elev(float(o['air_semua_lat']), float(o['air_semua_lon']))
        ej = elev(float(o['jalan_kend_lat']), float(o['jalan_kend_lon']))
        rows.append(dict(id=o['id'], elev_kompleks_m=e0, elev_air_terdekat_m=ea, elev_jalan_terdekat_m=ej,
                         beda_air_minus_kompleks_m=round(ea - e0, 1), beda_jalan_minus_kompleks_m=round(ej - e0, 1),
                         air_km=o['air_semua_km'], jalan_km=o['jalan_kend_km']))
    assert all(r['elev_kompleks_m'] is not None and -5 < r['elev_kompleks_m'] < 800 for r in rows)
    tulis_csv('dem_elevasi.csv', rows)
    v = sorted(r['beda_air_minus_kompleks_m'] for r in rows)
    print('beda air-kompleks (m) p10/p50/p90', v[len(v)//10], v[len(v)//2], v[9*len(v)//10])

# ---------- 3. JRC Global Surface Water v1.4 (2021), di titik air terdekat ----------
def gsw_url(prod, lat, lon):
    b = math.floor(lon / 10) * 10; a = math.ceil(lat / 10) * 10  # nama = pojok kiri-ATAS ubin 10 derajat
    return (f'https://storage.googleapis.com/global-surface-water/downloads2021/{prod}/{prod}_{b}{"E" if b >= 0 else "W"}_{abs(a)}{"N" if a >= 0 else "S"}v1_4_2021.tif')

def gsw():
    import numpy as np
    def maks(prod, lat, lon):
        a = jendela(gsw_url(prod, lat, lon), lat, lon, 2)  # 5x5 px (~150 m): sungai sempit sering meleset 1-2 piksel dari garis OSM
        if a is None: return None
        a = a[a != 255]
        return int(a.max()) if a.size else None
    rows = []
    for o in csv.DictReader(open(f'{OUT}/osm_jarak.csv')):
        la, lo = float(o['air_semua_lat']), float(o['air_semua_lon'])
        occ = maks('occurrence', la, lo); sea = maks('seasonality', la, lo)
        cls = 'tak_terdeteksi' if not occ else ('permanen' if sea == 12 else 'musiman')
        rows.append(dict(id=o['id'], air_jenis_osm=o['air_semua_jenis'], air_km=o['air_semua_km'],
                         gsw_occurrence_max_pct=occ if occ is not None else '', gsw_seasonality_max_bulan=sea if sea is not None else '',
                         gsw_kelas=cls))
    assert all(r['gsw_kelas'] in ('permanen', 'musiman', 'tak_terdeteksi') for r in rows)
    tulis_csv('gsw_air_terdekat.csv', rows)
    from collections import Counter
    print(Counter(r['gsw_kelas'] for r in rows))

# ---------- Matriks jarak air x jalan ----------
AIR_T, JLN_T = 2.5, 5.0  # ambang zona dari koordinator (versi lama: 2 dan 3)
def zona(air, jalan):
    """A air<2,5 & jalan<5; B air<2,5 & jalan>=5; C air>=2,5 & jalan<5; D sisanya. jalan None (tak ada rute) = jauh."""
    j = 99 if jalan is None else jalan
    if air < AIR_T: return 'A' if j < JLN_T else 'B'
    return 'C' if j < JLN_T else 'D'

def matriks():
    from collections import Counter
    lama_ref = dict(A=188, B=418, C=89, D=170)  # hasil lama (ambang 2,5/5, data lama) dari koordinator
    o = list(csv.DictReader(open(f'{OUT}/osm_jarak.csv')))
    f = lambda s: None if s in ('', 'None') else float(s)
    z_lama = [zona(f(r['air_km_lama']), f(r['jalan_km_lama'])) for r in o]
    z_baru = [zona(f(r['air_semua_km']), f(r['jalan_kend_km'])) for r in o]
    z_utama = [zona(f(r['air_semua_km']), f(r['jalan_utama_km'])) for r in o]
    z_airb = [zona(f(r['air_semua_km']), f(r['jalan_km_lama'])) for r in o]
    z_jlnb = [zona(f(r['air_km_lama']), f(r['jalan_kend_km'])) for r in o]
    cL, cB, cU, cA, cJ = (Counter(z) for z in (z_lama, z_baru, z_utama, z_airb, z_jlnb))
    assert sum(cB.values()) == 865
    reproduksi = all(cL[k] == v for k, v in lama_ref.items())
    ket = {'A': 'air<2,5 & jalan<5', 'B': 'air<2,5 & jalan>=5', 'C': 'air>=2,5 & jalan<5', 'D': 'air>=2,5 & jalan>=5'}
    L = ['# Matriks jarak air x jalan, 865 kompleks Kalteng', '',
         'Zona: A air<2,5 km & jalan<5 km; B air<2,5 & jalan>=5; C air>=2,5 & jalan<5; D sisanya (km, jarak garis lurus ke garis OSM terdekat). Ambang lama 2/3 km dihentikan; hasil acuan lama A188 B418 C89 D170.', '',
         f'Pereproduksi versi lama dari kendala.json (jalan None = tak ada rute = jauh): {dict(cL)}; cocok dengan A188/B418/C89/D170: **{reproduksi}**.', '',
         '| Zona | Aturan | Lama (kendala.json) | Baru: semua jalan x semua air | Baru: air semua + jalan lama | Air lama + jalan baru | Baru: hanya jalan utama (tersier ke atas) x semua air |',
         '|---|---|---:|---:|---:|---:|---:|']
    for k in 'ABCD': L.append(f'| {k} | {ket[k]} | {cL[k]} | {cB[k]} | {cA[k]} | {cJ[k]} | {cU[k]} |')
    L += ['', '"Semua jalan" = highway motorway..tertiary, unclassified, residential, service, track, living_street (bisa dilalui kendaraan; track belum tentu musim hujan).',
          '"Semua air" = waterway river/canal/stream/ditch/drain + tepi natural=water/landuse=reservoir.', '',
          '## Perpindahan zona lama -> baru', '', '| lama \\ baru | A | B | C | D |', '|---|---:|---:|---:|---:|']
    tr = Counter(zip(z_lama, z_baru))
    for a in 'ABCD': L.append(f'| {a} | ' + ' | '.join(str(tr[(a, b)]) for b in 'ABCD') + ' |')
    import statistics as st
    for nm, k in (('air_semua_km', 'air lama'), ('jalan_kend_km', 'jalan lama')):
        pass
    al = [f(r['air_km_lama']) for r in o]; ab = [f(r['air_semua_km']) for r in o]
    jl = [f(r['jalan_km_lama']) for r in o]; jb = [f(r['jalan_kend_km']) for r in o]
    L += ['', '## Ringkasan jarak (km)', '', '| ukuran | median | p90 |', '|---|---:|---:|']
    def ring(nm, v):
        v = sorted(x for x in v if x is not None); return f'| {nm} (n={len(v)}) | {v[len(v)//2]:.2f} | {v[int(.9*len(v))]:.2f} |'
    L += [ring('air lama', al), ring('air baru semua', ab), ring('air baru kecil saja', [f(r['air_kecil_km']) for r in o]),
          ring('jalan lama', jl), ring('jalan baru semua', jb), ring('jalan baru setapak', [f(r['jalan_setapak_km']) for r in o])]
    L += ['', f'Kompleks tanpa jalan di data lama (None): {sum(x is None for x in jl)}; tanpa jalan kendaraan OSM dalam {CAP_KM:.0f} km: {sum(int(r["jalan_kend_terpotong"]) for r in o)}.']
    open(f'{OUT}/matriks_jarak.md', 'w').write('\n'.join(L) + '\n')
    print('lama', dict(cL), 'baru', dict(cB), 'reproduksi', reproduksi)

if __name__ == '__main__':
    for s in sys.argv[1:]: globals()[s]()
