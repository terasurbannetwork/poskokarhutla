"""Tarik FIRMS VIIRS (S-NPP, NOAA-20, NOAA-21) 1 Jan s.d. 9 Nov 2026 per hari UTC untuk hitung ulang angka perusahaan (revisi 9 Nov).
SP bila tersedia, selain itu NRT (firms_sumber.sumber_hari). Kunci dibaca dari .env, tidak pernah dicetak.
    PYTHONUTF8=1 C:/Python314/python firms_tahunan.py <folder cache>
"""
import concurrent.futures as cf, datetime as dt, os, sys, time, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
import firms_sumber as FS  # noqa: E402

BBOX = '94,-11.5,141.5,6.5'
AWAL, AKHIR = dt.date(2025, 12, 31), dt.date(2026, 11, 9)   # 1 Jan 00.00 WIB = 31 Des UTC
FAM = ('VIIRS_SNPP', 'VIIRS_NOAA20', 'VIIRS_NOAA21')


def kunci():
    if os.environ.get('FIRMS_MAP_KEY'): return os.environ['FIRMS_MAP_KEY']
    for b in open(os.path.join(AKAR, '.env'), encoding='utf-8'):
        if b.startswith('FIRMS_MAP_KEY='): return b.split('=', 1)[1].strip().strip('"')


def ambil(u):
    for coba in range(6):
        try: return urllib.request.urlopen(u, timeout=180).read().decode()
        except Exception as e:
            if coba == 5: raise RuntimeError(FS.sensor_url(f'{type(e).__name__}: {e}'))
            time.sleep(5 * (coba + 1))


def blok(k, src, d0, n, ke):
    """Satu blok <= 5 hari: dipecah per acq_date; hari tanpa titik tetap ditulis (header saja) supaya tidak ditarik ulang."""
    hari = [d0 + dt.timedelta(days=i) for i in range(n)]
    if all(os.path.exists(os.path.join(ke, f'{src}-{h}.csv')) for h in hari): return 0
    teks = ambil(f'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{k}/{src}/{BBOX}/{n}/{d0}')
    if not teks.startswith('latitude'): raise RuntimeError(f'{src} {d0}: balasan bukan CSV: {teks[:80]}')
    br = teks.strip().split('\n'); kol = br[0].split(','); ia = kol.index('acq_date'); per = {h.isoformat(): [] for h in hari}
    for b in br[1:]:
        t = b.split(',')[ia]
        if t in per: per[t].append(b)
    for t, xs in per.items():
        f = os.path.join(ke, f'{src}-{t}.csv')
        with open(f + '.tmp', 'w', encoding='utf-8', newline='\n') as o: o.write('\n'.join([br[0]] + xs) + '\n')
        os.replace(f + '.tmp', f)
    return len(br) - 1


def utama(ke):
    os.makedirs(ke, exist_ok=True); k = kunci(); ket = FS.muat_ketersediaan(k, ambil, famili=FAM)
    print({a: (str(b[0]), str(b[1])) for a, b in ket.items()}, flush=True)
    kerja = []
    for fam in FAM:
        d = AWAL if fam == 'VIIRS_SNPP' else dt.date(2026, 11, 1)   # NOAA hanya untuk sambungan sesudah S-NPP berhenti (firespot kumulatif dibuang pemilik 9 Nov)
        while d <= AKHIR:
            src = FS.sumber_hari(fam, d, ket)
            if not src: d += dt.timedelta(days=1); continue
            n = 1
            while n < 5 and d + dt.timedelta(days=n) <= AKHIR and FS.sumber_hari(fam, d + dt.timedelta(days=n), ket) == src: n += 1
            kerja.append((src, d, n)); d += dt.timedelta(days=n)
    print('blok', len(kerja), flush=True); total = sel = 0
    with cf.ThreadPoolExecutor(6) as ex:
        for f in cf.as_completed([ex.submit(blok, k, s, d, n, ke) for s, d, n in kerja]):
            total += f.result(); sel += 1
            if sel % 20 == 0: print(sel, '/', len(kerja), 'titik', total, flush=True)
    print('selesai titik', total, flush=True)


if __name__ == '__main__':
    utama(sys.argv[1])
