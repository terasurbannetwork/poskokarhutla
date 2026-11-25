"""Hujan satelit NASA GPM IMERG per 30 menit (Early Run, V07) di wilayah semai OMC Aceh 24 Nov 2026, pengganti model ECMWF di slide OMC
(pemilik 25 Nov: "sama datanya ada yang bukan dari perkiraan model ga ya?"; token Earthdata ditaruh pemilik di .env sebagai EARTHDATA_TOKEN).
Koleksi GPM_3IMERGHHE.07 (3B-HHR-E, laju hujan mm/jam per 30 menit, sel 0,1 derajat), lewat OPeNDAP ASCII GES DISC; unduh dan urai
memakai scripts/cuaca/imerg.py (buka, parse). Wilayah = rata-rata sel 0,1 derajat dalam radius 0,25 derajat dari pusat wilayah semai
(pusat = perkiraan dari nama perairan, sama dengan peta slide). Hujan per jam WIB = rata-rata dua laju 30 menit jam itu (mm).
Keluaran kerja-251126/omc_imerg.json, bentuk sama dengan omc_hujan.json (model -> seri per jam). Token tidak pernah dicetak."""
import datetime as dt, json, os, re, sys, urllib.parse, urllib.request

S = os.path.dirname(os.path.abspath(__file__)); AKAR = os.path.normpath(os.path.join(S, '..', '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'cuaca'))
import imerg

WIB = dt.timezone(dt.timedelta(hours=7)); UTC = dt.timezone.utc
KOL = 'GPM_3IMERGHHE.07'
LON, LAT = (94.5, 99.5), (2.0, 6.5)
I0, I1 = round((LON[0] - imerg.LON0) / imerg.RES), round((LON[1] - imerg.LON0) / imerg.RES)
J0, J1 = round((LAT[0] - imerg.LAT0) / imerg.RES), round((LAT[1] - imerg.LAT0) / imerg.RES)
DARI, SAMPAI = dt.datetime(2026, 11, 24, 0, tzinfo=WIB), dt.datetime(2026, 11, 25, 9, tzinfo=WIB)
R = 0.25
# 25 Nov pemilik ("coba" tambah hujan di kabupaten banjir terdekat; OMC menabur di laut supaya hujan turun di laut sebelum awan sampai ke darat):
# tiap wilayah semai dipasangkan dengan kabupaten banjir terdekat (jarak pusat poligon) yang airnya BELUM surut menurut WA Koordalops 24-25 Nov
DARAT = {1: 'Gayo Lues', 2: 'Aceh Barat Daya', 3: 'Aceh Barat Daya'}


def dalam(x, y, ring):
    c = False
    for k in range(len(ring)):
        x1, y1 = ring[k - 1]; x2, y2 = ring[k]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c


def sel_kab(nama):
    g_ = next(f['geometry'] for f in json.load(open(os.path.join(AKAR, 'public', 'geo', 'kabupaten', '11.json'), encoding='utf-8'))['features'] if f['properties']['kab'] == nama)
    polys = [g_['coordinates']] if g_['type'] == 'Polygon' else g_['coordinates']
    return [(i, j) for i in range(I0, I1 + 1) for j in range(J0, J1 + 1)
            if any(dalam(imerg.LON0 + imerg.RES * i, imerg.LAT0 + imerg.RES * j, p[0]) for p in polys)]


def seri_jam(setengah, sel_):
    rata = {t: sum(v.get(c, 0) for c in sel_) / len(sel_) for t, v in setengah.items()}
    jam = sorted({(t + dt.timedelta(minutes=30)).replace(minute=0) + dt.timedelta(hours=1) for t in rata})
    out = []
    for j in jam:   # jam berlabel j (WIB, akhir jam) = rata-rata laju dua 30 menit dalam (j-1, j]
        v = [rata[t] for t in rata if j - dt.timedelta(hours=1) <= t < j]
        if len(v) == 2: out.append([j.strftime('%Y-%m-%dT%H:%M'), round(sum(v) / 2, 2)])
    return out


def token():
    t = os.environ.get('EARTHDATA_TOKEN')
    if t: return t
    for g in open(os.path.join(AKAR, '.env'), encoding='utf-8'):
        if g.strip().startswith('EARTHDATA_TOKEN='): return g.split('=', 1)[1].strip().strip('"').strip("'")
    sys.exit('EARTHDATA_TOKEN tidak ada di .env')


def daftar(a, b):
    """Granule IMERG Early per 30 menit dari katalog CMR NASA -> [(mulai UTC, url OPeNDAP cloud)]. Server gpm1.gesdisc (OPeNDAP lama) tidak
    bisa dihubungi dari mesin ini 25 Nov siang, jadi data diambil lewat opendap.earthdata.nasa.gov (Hyrax cloud, variabel /Grid/precipitation)."""
    u = ('https://cmr.earthdata.nasa.gov/search/granules.umm_json?short_name=GPM_3IMERGHHE&version=07&page_size=200&sort_key=start_date&temporal='
         + f"{a:%Y-%m-%dT%H:%M:%SZ},{b:%Y-%m-%dT%H:%M:%SZ}")
    d = json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=120).read())
    out = []
    for it in d['items']:
        g = it['umm']; t = dt.datetime.strptime(g['GranuleUR'].split('.')[5][:16], '%Y%m%d-S%H%M%S').replace(tzinfo=UTC)
        od = next((l['URL'] for l in g.get('RelatedUrls', []) if 'opendap.earthdata' in l['URL']), None)
        if od and a <= t < b: out.append((t, od))
    return out


def urai(teks):
    """ASCII DAP2 Hyrax cloud (25 Nov): baris '/Grid/precipitation.lat, 2.05, ...' lalu per bujur
    '/Grid/precipitation.precipitation[...time=..][/Grid/precipitation.lon=94.45], v, ...' (nilai sepanjang lintang) -> {(i_lon, j_lat) global: mm/jam}."""
    lat, o = None, {}
    for g in teks.splitlines():
        if g.startswith('/Grid/precipitation.lat,'): lat = [float(x) for x in g.split(',')[1:]]; continue
        m = re.match(r'^/Grid/precipitation\.precipitation\[.*?lon=([-\d.]+)\],\s*(.*)$', g)
        if not m or lat is None: continue
        i = round((float(m[1]) - imerg.LON0) / imerg.RES)
        for la, v in zip(lat, m[2].split(',')):
            v = float(v)
            if v > imerg.HILANG: o[(i, round((la - imerg.LAT0) / imerg.RES))] = v
    return o


def main():
    ambil = imerg.buka(token())
    model = json.load(open(os.path.join(S, 'kerja-251126', 'omc_hujan.json'), encoding='utf-8'))['model']
    a, b = DARI.astimezone(UTC), SAMPAI.astimezone(UTC)
    berkas = daftar(a, b)
    print('berkas IMERG', len(berkas), berkas[0][0].isoformat() if berkas else '-', berkas[-1][0].isoformat() if berkas else '-', file=sys.stderr)
    setengah = {}   # waktu mulai WIB -> {(i,j): mm/jam}
    for t, od in berkas:
        q = f"/Grid/precipitation[0:0][{I0}:{I1}][{J0}:{J1}]"
        n = urai(ambil(od + '.ascii?' + urllib.parse.quote(q, safe=':/')))
        if not n: print('kosong', t, file=sys.stderr); continue
        setengah[t.astimezone(WIB)] = n
    out = []
    for m in model:
        lo0, la0 = m['pusat']
        sel_ = [(i, j) for i in range(I0, I1 + 1) for j in range(J0, J1 + 1)
                if (imerg.LON0 + imerg.RES * i - lo0) ** 2 + (imerg.LAT0 + imerg.RES * j - la0) ** 2 <= R * R]
        rata = {t: sum(v.get(c, 0) for c in sel_) / len(sel_) for t, v in setengah.items()}
        # jam berlabel j (WIB, akhir jam, sama dengan Open-Meteo) = rata-rata laju dua 30 menit dalam (j-1, j]
        jam = sorted({(t + dt.timedelta(minutes=30)).replace(minute=0) + dt.timedelta(hours=1) for t in rata})
        seri = []
        for j in jam:
            v = [rata[t] for t in rata if j - dt.timedelta(hours=1) <= t < j]
            if len(v) == 2: seri.append([j.strftime('%Y-%m-%dT%H:%M'), round(sum(v) / 2, 2)])
        on, off = dt.datetime.fromisoformat(m['on']), dt.datetime.fromisoformat(m['off'])
        ta, tb = on.replace(minute=0), off.replace(minute=0) + dt.timedelta(hours=1)
        J = lambda s: dt.datetime.fromisoformat(s)
        sbl = sum(v for s, v in seri if ta - dt.timedelta(hours=3) < J(s) <= ta)
        sl = sum(v for s, v in seri if ta < J(s) < tb)
        ssd = sum(v for s, v in seri if tb <= J(s) <= tb + dt.timedelta(hours=5))
        n_ssd = sum(1 for s, v in seri if tb <= J(s) <= tb + dt.timedelta(hours=5))
        sk = sel_kab(DARAT[m['no']])
        out.append({**{k: m[k] for k in ('no', 'armada', 'wilayah', 'pusat', 'on', 'off')}, 'sel': len(sel_), 'sebelum_mm': round(sbl, 2), 'selama_mm': round(sl, 2),
                    'sesudah_mm': round(ssd, 2), 'jam_sesudah': n_ssd, 'seri': seri, 'darat': DARAT[m['no']], 'sel_darat': len(sk), 'seri_darat': seri_jam(setengah, sk)})
        print(m['no'], m['wilayah'], 'sel', len(sel_), 'sebelum', round(sbl, 2), 'selama', round(sl, 2), 'sesudah', round(ssd, 2), f'({n_ssd} jam)', file=sys.stderr)
    # versi darat saja (pemilik 25 Nov: "hanya menampilkan hujan di daratan", "pastikan ada daerah yang terdampak banjir"): semua kabupaten banjir Aceh
    # yang airnya belum surut menurut WA Koordalops 24-25 Nov
    kab = {k: seri_jam(setengah, sel_kab(k)) for k in ('Kota Subulussalam', 'Aceh Singkil', 'Gayo Lues', 'Aceh Barat Daya')}
    json.dump({'kab': kab, 'dibuat': dt.datetime.now(WIB).isoformat(timespec='minutes'), 'sumber': 'NASA GPM IMERG V07 Early Run per 30 menit (GPM_3IMERGHHE.07), GES DISC',
               'model': out}, open(os.path.join(S, 'kerja-251126', 'omc_imerg.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
