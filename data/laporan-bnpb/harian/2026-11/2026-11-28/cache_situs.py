"""22 Nov 2026 (mesin Windows tanpa FIRMS_MAP_KEY): isi generator/cache/raw/<sumber>-<hari UTC>.csv dari hotspot.json situs (origin/main),
cara sama dengan mode data situs penanganan-karhutla/2026-11/2026-11-14/jalan.py. Format harian sekarang tanpa karhutla, jadi angka FIRMS
tidak tampil di slide; generator hanya butuh cache ini ada. Hari UTC di luar cakupan hotspot.json (7 hari terakhir) = CSV kosong berkepala.
Pakai: python cache_situs.py YYYY-MM-DD"""
import csv, datetime as dt, io, json, os, subprocess, sys

S = os.path.dirname(os.path.abspath(__file__)); AKAR = os.path.normpath(os.path.join(S, '..', '..', '..', '..', '..'))
RAW = os.path.join(AKAR, 'data', 'laporan-bnpb', 'generator', 'cache', 'raw')
T = dt.date.fromisoformat(sys.argv[1])
HS = json.loads(subprocess.run(['git', 'show', 'origin/main:public/data/hotspot.json'], cwd=AKAR, capture_output=True, check=True).stdout)
ACUAN = dt.datetime.fromisoformat(HS['acuan'])
SENSOR = {'MODIS_NRT': 'M', 'VIIRS_SNPP_NRT': 'N', 'VIIRS_NOAA20_NRT': 'N20', 'VIIRS_NOAA21_NRT': 'N21'}
KOL = ['latitude', 'longitude', 'scan', 'track', 'acq_date', 'acq_time', 'satellite', 'confidence', 'frp', 'daynight']
os.makedirs(RAW, exist_ok=True)
for src, kode in SENSOR.items():
    for n in range(8):
        u = (T - dt.timedelta(days=n)).isoformat(); b = io.StringIO(); w = csv.writer(b); w.writerow(KOL); k = 0
        for lat, lon, jam, sen, frp, yak, *_ in HS['baris']:
            t = ACUAN + dt.timedelta(hours=jam)
            if sen != kode or t.date().isoformat() != u: continue
            w.writerow([lat, lon, .4, .4, u, t.strftime('%H%M'), {'M': 'Aqua', 'N': 'N'}.get(sen, sen), ('0', '50', '90')[yak] if sen == 'M' else 'lnh'[yak], frp, 'D']); k += 1
        open(os.path.join(RAW, f'{src}-{u}.csv'), 'w', newline='').write(b.getvalue())
        if k: print(src, u, k)
print('hotspot.json acuan', HS['acuan'])
