"""Penjaga deck Penanganan: firespot diambil dari olahan situs, hotspot dari FIRMS segar, jadi keduanya bisa beda jam (insiden 8 Nov 2026:
situs berhenti 11.14 WIB, FIRMS sudah sampai 15.41 WIB, Sulawesi Selatan 151 hotspot dengan 1 firespot).

jamin() dipanggil jalan.py sesudah FIRMS ditarik. Bila lebih dari AMBANG titik hari laporan belum masuk situs: picu titik.yml, tunggu terbit,
lalu jalan.py diulang dengan data situs baru. Masih tertinggal sesudah diulang = berhenti, deck tidak dibuat.
BOLEH_BASI=<alasan> melewati penjaga dengan sadar (tertulis di log).
Uji: python segar_situs.py"""
import csv, datetime as dt, json, os, subprocess, sys, time, urllib.request

G = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(G, 'cache', 'raw'); AKAR = os.path.normpath(os.path.join(G, '..', '..', '..'))
WIB = dt.timedelta(hours=7); AMBANG = 0.05; SUMBER = ('MODIS_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'VIIRS_SNPP_NRT')
URL = 'https://centurisk97.id/data/hotspot.json'
KODE = {'MODIS_NRT': 'M', 'VIIRS_NOAA20_NRT': 'N20', 'VIIRS_NOAA21_NRT': 'N21', 'VIIRS_SNPP_NRT': 'N'}   # kode sensor kolom hotspot.json


def waktu_titik(D, jam, raw=RAW):
    """(kode sensor, waktu UTC naif) tiap baris FIRMS hari laporan D WIB sampai jam cut-off."""
    awal = dt.datetime.combine(D, dt.time()) - WIB; akhir = dt.datetime.combine(D, dt.time.fromisoformat(jam)) - WIB; hasil = []
    for src in SUMBER:
        for u in (D - dt.timedelta(days=1), D):
            f = os.path.join(raw, f'{src}-{u.isoformat()}.csv')
            if not os.path.exists(f): continue
            with open(f, encoding='utf-8', newline='') as b:
                for r in csv.DictReader(b):
                    t = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M')
                    if awal <= t < akhir: hasil.append((KODE[src], t))
    return hasil


def porsi_tertinggal(waktu, acuan):
    """(titik yang belum masuk situs, total titik, porsinya). acuan = {sensor: waktu titik terakhir situs, UTC naif}: per sensor, karena lintasan VIIRS
    bisa terbit di FIRMS sesudah MODIS yang lebih baru. Sensor yang tak ada di situs = semua titiknya tertinggal. Toleransi 1 menit untuk pembulatan kolom jam."""
    baru = sum(t > acuan.get(s, dt.datetime.min) + dt.timedelta(minutes=1) for s, t in waktu)
    return baru, len(waktu), baru / len(waktu) if waktu else 0.0


def acuan_sensor(HS):
    """{sensor: waktu titik terakhir} dari baris hotspot.json (kolom jam = selisih jam dari HS['acuan'])."""
    a = dt.datetime.fromisoformat(HS['acuan']).astimezone(dt.timezone.utc).replace(tzinfo=None); hasil = {}
    for b in HS['baris']:
        t = a + dt.timedelta(hours=b[2])
        if b[3] not in hasil or t > hasil[b[3]]: hasil[b[3]] = t
    return hasil


def _gh(*a, **k):
    return subprocess.run(['gh', *a], cwd=AKAR, capture_output=True, text=True, **k)


def _acuan_situs():
    q = urllib.request.Request(f'{URL}?t={int(time.time())}', headers={'User-Agent': 'Mozilla/5.0'})
    return acuan_sensor(json.load(urllib.request.urlopen(q, timeout=120)))


def _picu_dan_tunggu(lama):
    daftar = lambda: json.loads(_gh('run', 'list', '--workflow', 'titik.yml', '--limit', '1', '--json', 'databaseId,status').stdout or '[]')
    r = daftar()
    if r and r[0]['status'] != 'completed':
        rid = r[0]['databaseId']; print('titik.yml sudah jalan, ditunggu', rid)
    else:
        if _gh('workflow', 'run', 'titik.yml', '--ref', 'main', '-f', 'jaga=ya').returncode:   # main belum memuat input jaga
            p = _gh('workflow', 'run', 'titik.yml', '--ref', 'main')
            if p.returncode: sys.exit(f'gagal memicu titik.yml: {p.stderr.strip()}')
        rid = None
        for _ in range(18):   # run baru tampak di API beberapa detik sesudah dipicu; jangan menunggu run lama
            time.sleep(10)
            b = daftar()
            if b and (not r or b[0]['databaseId'] != r[0]['databaseId']): rid = b[0]['databaseId']; break
        if rid is None: sys.exit('titik.yml dipicu tetapi run barunya tidak tampak; deck tidak dibuat')
        print('titik.yml dipicu', rid)
    try: _gh('run', 'watch', str(rid), '--interval', '30', timeout=6000)   # bisa antre di grup data sampai sekitar 80 menit
    except subprocess.TimeoutExpired: sys.exit(f'titik.yml {rid} belum selesai sesudah 100 menit; deck tidak dibuat')
    for _ in range(40):   # terbit Cloudflare bisa beberapa menit sesudah run selesai
        if _acuan_situs() != lama: return   # acuan per sensor (dict): berubah = sudah terbit; cukup tidaknya dinilai jamin() saat jalan ulang
        time.sleep(30)
    sys.exit('titik.yml selesai tetapi situs belum memuat data baru; deck tidak dibuat')


def jamin(folder, D, jam, HS, skrip='jalan.py'):
    if os.environ.get('BOLEH_BASI'):
        print('PENJAGA DILEWATI:', os.environ['BOLEH_BASI']); return
    acuan = acuan_sensor(HS); baru, total, porsi = porsi_tertinggal(waktu_titik(D, jam), acuan)
    print(f'penjaga situs: data situs s.d. {max(acuan.values()) + WIB:%d %b %H.%M} WIB, {baru} dari {total} titik FIRMS belum masuk ({porsi:.0%})')
    if porsi <= AMBANG: return
    if os.environ.get('SEGAR_ULANG'):
        sys.exit(f'firespot situs masih tertinggal {porsi:.0%} sesudah diperbarui; deck tidak dibuat (BOLEH_BASI=<alasan> untuk melewati)')
    _picu_dan_tunggu(acuan)
    sys.exit(subprocess.call([sys.executable, '-X', 'utf8', os.path.join(folder, skrip)], env={**os.environ, 'BARU': '1', 'SEGAR_ULANG': '1'}, cwd=folder))


if __name__ == '__main__':
    t = lambda j, m=0: dt.datetime(2026, 11, 8, j, m)
    w = [('N21', t(1)), ('N21', t(3)), ('N21', t(4, 14)), ('N20', t(6, 52)), ('N21', t(7, 35)), ('M', t(8, 41))]
    semua = {'N20': t(8, 41), 'N21': t(8, 41), 'M': t(8, 41)}
    assert porsi_tertinggal(w, {s: t(4, 14) for s in semua})[:2] == (3, 6) and porsi_tertinggal(w, semua)[2] == 0 and porsi_tertinggal([], semua)[2] == 0
    # MODIS situs lebih baru daripada lintasan VIIRS yang terbit belakangan: VIIRS tetap terhitung tertinggal
    assert porsi_tertinggal(w, {'M': t(8, 41), 'N20': t(4), 'N21': t(4, 14)})[:2] == (2, 6)
    assert porsi_tertinggal([('N20', t(5))], {})[0] == 1   # sensor tak ada di situs
    assert acuan_sensor({'acuan': '2026-11-08T04:14:00+00:00', 'baris': [[0, 0, -2.0, 'M'], [0, 0, 0.0, 'N21'], [0, 0, -1.0, 'N21']]}) == {'M': t(2, 14), 'N21': t(4, 14)}
    print('uji segar_situs lolos')
