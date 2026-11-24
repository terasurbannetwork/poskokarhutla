"""Penjaga deck Penanganan: firespot diambil dari olahan situs, hotspot dari FIRMS segar, jadi keduanya bisa beda jam (insiden 8 Nov 2026:
situs berhenti 11.14 WIB, FIRMS sudah sampai 15.41 WIB, Sulawesi Selatan 151 hotspot dengan 1 firespot).

jamin() dipanggil jalan.py sesudah FIRMS ditarik. Bila lebih dari AMBANG titik hari laporan belum masuk situs: picu titik.yml, tunggu terbit,
lalu jalan.py diulang dengan data situs baru. Masih tertinggal sesudah diulang = berhenti, deck tidak dibuat.
BOLEH_BASI=<alasan> melewati penjaga dengan sadar (tertulis di log).

status() (K18 bot laporan, 18 Nov 2026): keadaan data satelit hari D untuk daftar bahan bot, tanpa menulis apa pun ke disk:
    py segar_situs.py --status [--tanggal YYYY-MM-DD]
    -> {"firms_terakhir_wib": "HH:MM"|null, "lintasan_siang": bool, "situs_dibuat_wib": "HH:MM", "situs_memuat": bool, "porsi_tertinggal": float, ...}
Jaringan gagal = JSON berkunci "galat" dengan medan null, kode keluar 0.
Uji: python segar_situs.py"""
import csv, datetime as dt, io, json, os, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

G = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(G, 'cache', 'raw'); AKAR = os.path.normpath(os.path.join(G, '..', '..', '..'))
WIB = dt.timedelta(hours=7); AMBANG = 0.05; SUMBER = ('MODIS_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'VIIRS_SNPP_NRT')
URL = 'https://centurisk97.id/data/hotspot.json'; META = 'https://centurisk97.id/data/meta.json'
SIANG = (dt.time(11), dt.time(16))   # lintasan siang NOAA-20/21 dan Aqua, jam WIB (K18)
SNPP_AKHIR = dt.date(2026, 11, 1)    # firms_sumber.SNPP_AKHIR (1 Nov 13.00Z): NRT S-NPP tak ada untuk hari sesudahnya
KODE = {'MODIS_NRT': 'M', 'VIIRS_NOAA20_NRT': 'N20', 'VIIRS_NOAA21_NRT': 'N21', 'VIIRS_SNPP_NRT': 'N'}   # kode sensor kolom hotspot.json


def _saring(src, baris, D, jam):
    """(kode sensor, waktu UTC naif) baris FIRMS yang jatuh di hari D WIB sebelum jam cut-off."""
    awal = dt.datetime.combine(D, dt.time()) - WIB; akhir = dt.datetime.combine(D, dt.time.fromisoformat(jam)) - WIB; hasil = []
    for r in baris:
        t = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M')
        if awal <= t < akhir: hasil.append((KODE[src], t))
    return hasil


def waktu_titik(D, jam, raw=RAW):
    """(kode sensor, waktu UTC naif) tiap baris FIRMS hari laporan D WIB sampai jam cut-off."""
    hasil = []
    for src in SUMBER:
        for u in (D - dt.timedelta(days=1), D):
            f = os.path.join(raw, f'{src}-{u.isoformat()}.csv')
            if not os.path.exists(f): continue
            with open(f, encoding='utf-8', newline='') as b:
                hasil += _saring(src, csv.DictReader(b), D, jam)
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


def _ambil(url, timeout=12):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=timeout).read()


def status(D, ambil=_ambil, kunci=None):
    """Keadaan data satelit hari D WIB (K18), tanpa efek samping: FIRMS (VIIRS + MODIS, kotak Indonesia satelit.py) dan situs ditarik
    bersamaan. situs_memuat memakai ukuran jamin(): porsi titik FIRMS hari D yang lebih baru dari titik terakhir situs per sensor <= AMBANG.
    Galat jaringan atau kunci: medan yang gagal null, alasan di "galat"."""
    h = {'tanggal': D.isoformat(), 'firms_terakhir_wib': None, 'lintasan_siang': None, 'situs_dibuat_wib': None, 'situs_hari': None,
         'situs_memuat': None, 'porsi_tertinggal': None}
    galat, waktu, acuan = [], None, None
    try:
        if not kunci:
            import satelit; kunci = satelit.kunci_firms()
    except (Exception, SystemExit) as e:
        galat.append(f'kunci FIRMS: {e}')
    sumber = [s for s in SUMBER if s != 'VIIRS_SNPP_NRT' or D <= SNPP_AKHIR]
    bbox = '94,-11.5,141.5,6.5'   # peta_karhutla.BBOX (firms.BBOX[0])
    t = int(time.time())
    with ThreadPoolExecutor(2 * len(sumber) + 2) as ex:   # FIRMS per sensor per hari UTC (D-1 dan D) = hari D WIB utuh; 1 hari per panggilan lebih cepat dari rentang 2 hari
        f_firms = {(s, u): ex.submit(ambil, f'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{kunci}/{s}/{bbox}/1/{u}')
                   for s in sumber for u in (D - dt.timedelta(days=1), D)} if kunci else {}
        f_meta, f_hs = ex.submit(ambil, f'{META}?t={t}'), ex.submit(ambil, f'{URL}?t={t}')
        try:
            waktu = []
            for (s, _), f in f_firms.items():
                teks = f.result().decode('utf-8')
                if not teks.startswith('latitude'): raise ValueError(f'{s}: jawaban bukan CSV ({teks[:40]!r})')
                waktu += _saring(s, csv.DictReader(io.StringIO(teks)), D, '23:59')
            if not f_firms: waktu = None
        except Exception as e:
            waktu = None; galat.append(f'FIRMS: {e}'.replace(kunci, '<kunci>') if kunci else f'FIRMS: {e}')
        try:
            m = json.loads(f_meta.result()); dibuat = dt.datetime.fromisoformat(m['dibuat']).astimezone(dt.timezone(WIB))
            h['situs_dibuat_wib'], h['situs_hari'] = f'{dibuat:%H:%M}', dibuat.date().isoformat()
            acuan = acuan_sensor(json.loads(f_hs.result()))
        except Exception as e:
            acuan = None; galat.append(f'situs: {e}')
    if waktu is not None:
        wib = [t + WIB for _, t in waktu]
        h['firms_terakhir_wib'] = f'{max(wib):%H:%M}' if wib else None
        h['lintasan_siang'] = any(SIANG[0] <= x.time() <= SIANG[1] for x in wib)
        if acuan is not None:
            porsi = porsi_tertinggal(waktu, acuan)[2]
            h['porsi_tertinggal'], h['situs_memuat'] = round(porsi, 4), porsi <= AMBANG
    if galat: h['galat'] = '; '.join(galat)
    return h


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
    if '--status' in sys.argv:
        a = sys.argv
        try:
            D = dt.date.fromisoformat(a[a.index('--tanggal') + 1]) if '--tanggal' in a else (dt.datetime.now(dt.timezone.utc) + WIB).date()
        except (IndexError, ValueError) as e:
            print(json.dumps({'galat': f'--tanggal tidak sah: {e}'}, ensure_ascii=False)); sys.exit(0)
        print(json.dumps(status(D), ensure_ascii=False)); sys.exit(0)
    t = lambda j, m=0: dt.datetime(2026, 11, 8, j, m)
    w = [('N21', t(1)), ('N21', t(3)), ('N21', t(4, 14)), ('N20', t(6, 52)), ('N21', t(7, 35)), ('M', t(8, 41))]
    semua = {'N20': t(8, 41), 'N21': t(8, 41), 'M': t(8, 41)}
    assert porsi_tertinggal(w, {s: t(4, 14) for s in semua})[:2] == (3, 6) and porsi_tertinggal(w, semua)[2] == 0 and porsi_tertinggal([], semua)[2] == 0
    # MODIS situs lebih baru daripada lintasan VIIRS yang terbit belakangan: VIIRS tetap terhitung tertinggal
    assert porsi_tertinggal(w, {'M': t(8, 41), 'N20': t(4), 'N21': t(4, 14)})[:2] == (2, 6)
    assert porsi_tertinggal([('N20', t(5))], {})[0] == 1   # sensor tak ada di situs
    assert acuan_sensor({'acuan': '2026-11-08T04:14:00+00:00', 'baris': [[0, 0, -2.0, 'M'], [0, 0, 0.0, 'N21'], [0, 0, -1.0, 'N21']]}) == {'M': t(2, 14), 'N21': t(4, 14)}
    print('uji segar_situs lolos')
