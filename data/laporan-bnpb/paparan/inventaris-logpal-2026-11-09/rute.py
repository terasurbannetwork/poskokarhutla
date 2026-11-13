"""Perkiraan waktu antar, kalibrasi dari slide 4: darat 33 km/jam, laut 9,3 km/jam (termasuk tunggu kapal)."""
import json, math, sys, time, urllib.request

G = {'NTT': ('Gudang BPBD NTT', (-10.16, 123.60)), 'Jabar': ('Gudang BPBD Jabar', (-6.93, 107.63)),
     'Jateng': ('Gudang BPBD Jateng', (-7.00, 110.42)), 'Jatim': ('Gudang BPBD Jatim', (-7.33, 112.73)),
     'Lampung': ('Gudang BPBD Lampung', (-5.40, 105.27))}
BOLOK = (-10.205, 123.47)
PORT = {'Ende': (-8.85, 121.67), 'Aimere': (-8.842, 120.854), 'Waingapu': (-9.65, 120.26)}
T = [('NTT', 'Ende', (-8.843, 121.662), 'Ende'), ('NTT', 'Manggarai', (-8.612, 120.463), 'Aimere'),
     ('NTT', 'Manggarai Barat', (-8.497, 119.889), 'Aimere'), ('NTT', 'Manggarai Timur', (-8.813, 120.609), 'Aimere'),
     ('NTT', 'Nagekeo', (-8.567, 121.265), 'Ende'), ('NTT', 'Ngada', (-8.786, 120.977), 'Aimere'),
     ('NTT', 'Sikka', (-8.62, 122.21), 'Ende'), ('NTT', 'Sumba Timur', (-9.656, 120.264), 'Waingapu'),
     ('Jabar', 'Bogor', (-6.482, 106.842), None), ('Jabar', 'Ciamis', (-7.327, 108.353), None),
     ('Jateng', 'Boyolali', (-7.53, 110.60), None), ('Jateng', 'Kendal', (-6.92, 110.2), None),
     ('Jateng', 'Klaten', (-7.706, 110.60), None), ('Jateng', 'Magelang', (-7.59, 110.22), None),
     ('Jateng', 'Pekalongan', (-7.03, 109.585), None), ('Jatim', 'Jember', (-8.172, 113.70), None),
     ('Jatim', 'Lumajang', (-8.134, 113.225), None), ('Jatim', 'Malang', (-8.13, 112.57), None),
     ('Lampung', 'Lampung Selatan', (-5.72, 105.59), None)]


def jalan(a, b):
    u = f"https://router.project-osrm.org/route/v1/driving/{a[1]},{a[0]};{b[1]},{b[0]}?overview=false"
    for i in range(6):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'bnpb-deck-estimasi'}), timeout=30))
            return r['routes'][0]['distance'] / 1000
        except Exception as e:
            print('ulang', e); time.sleep(3 + 3 * i)
    raise SystemExit('rute gagal ' + str((a, b)))


def hav(a, b):
    p = math.pi / 180
    h = math.sin((b[0] - a[0]) * p / 2) ** 2 + math.cos(a[0] * p) * math.cos(b[0] * p) * math.sin((b[1] - a[1]) * p / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


out = []
for pv, n, b, port in T:
    nama, a = G[pv]
    if port:
        laut = hav(BOLOK, PORT[port]) * 1.05
        drt = jalan(PORT[port], b) if hav(PORT[port], b) > 3 else 0
        drt += 15  # kota Kupang ke Pelabuhan Bolok
    else:
        laut, drt = 0, jalan(a, b)
    jam = max(2, round(drt / 33 + laut / 9.3))
    out.append(dict(prov=pv, nama=n, lat=b[0], lon=b[1], gudang=nama, glat=a[0], glon=a[1], darat=round(drt), laut=round(laut), jam=jam, port=port))
    print(pv, n, 'darat', round(drt), 'laut', round(laut), 'jam', jam, port, flush=True)
    time.sleep(.5)
json.dump(out, open(sys.argv[1], 'w', encoding='utf8'), ensure_ascii=False, indent=0)
