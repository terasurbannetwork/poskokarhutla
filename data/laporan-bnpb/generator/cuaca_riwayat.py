"""Grid FWI harian untuk hari LAMPAU, supaya firespot dan pil cuaca deck bisa dihitung ulang tanpa menyentuh keadaan live.

Mesin hitungnya mesin website: scripts/data/harian.py (grid_darat sel 0,5 derajat, siang() = nilai jam 12 setempat + hujan 24 jam)
dan scripts/data/fwi.py (deret FFMC/DMC/DC/ISI/BUI/FWI). Yang beda hanya SUMBER cuacanya. Pipeline harian menyimpan keadaan
FFMC/DMC/DC bersambung di public/data/fwi_state.json karena ia jalan tiap hari; keadaan itu cuma memuat satu titik waktu (H-2)
dan tidak ikut git, jadi untuk hari lampau dipanaskan ulang dari nol seperti langkah 1 harian.cuaca_fwi: reanalisis ERA5
(Open-Meteo archive) 300 hari ke belakang sampai H-9, lalu dilanjutkan tarikan forecast past_days untuk hari sesudahnya.
Pemanasan 300 hari dipakai, BUKAN 92 hari: DC menumpuk sepanjang musim kemarau tanpa batas, dan pada percobaan 92 hari
DC di NTT terbaca 468 sementara pipeline live 868 (FWI selisihnya kecil karena BUI jenuh, tetapi aturan bara gambut
DC > 350 jadi meleset). Kecocokannya dengan fwi.json live diuji oleh uji() di bawah.

API:
    hitung(awal, akhir) -> {'YYYY-MM-DD': {(lat, lon): {'prov','fwi','dc','hujan','ws'}}}   # hari WIB, inklusif
CLI:
    python3 cuaca_riwayat.py --awal 2026-10-12 --akhir 2026-10-25 [--keluar cuaca.json]
    python3 cuaca_riwayat.py --uji      # banding fwi/dc dengan public/data/fwi.json pada hari yang sama-sama ada
Tarikan mentah di cache/cuaca/ (di-ignore git); hapus berkasnya untuk menarik ulang."""
import datetime as dt, json, os, sys, time, urllib.request

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
import fwi as F        # noqa: E402
import harian as H     # noqa: E402
from wilayah import Wilayah   # noqa: E402

CACHE = os.path.join(SINI, 'cache', 'cuaca')
PAST = 92     # batas Open-Meteo forecast API
HANGAT = 300  # hari pemanasan ERA5, sama dengan harian.cuaca_fwi
BATCH = 25    # sel per tarikan; 80 sel x ratusan hari ditolak 429 (bobot kuota)


def tarik(bagian, tanda, url):
    """Satu tarikan Open-Meteo untuk sekelompok sel; dicache per kelompok + tanda + hari tarikan."""
    os.makedirs(CACHE, exist_ok=True)
    jalur = os.path.join(CACHE, f'{bagian[0][0]},{bagian[0][1]}-{len(bagian)}-{tanda}-{dt.date.today()}.json')
    if os.path.exists(jalur):
        return json.load(open(jalur))
    d = H.ambil(url, json_=True)   # coba ulang + tunggu 90 dtk pada 429 (kuota Open-Meteo)
    data = d if isinstance(d, list) else [d]
    json.dump(data, open(jalur, 'w'))
    return data


def arsip(bagian, hari_ini):
    """ERA5 untuk pemanasan; None bila kuota Open-Meteo menolak (seperti harian.cuaca_fwi: ERA5 dilewati, pemanasan
    jatuh ke deret forecast PAST hari dari nilai awal standar)."""
    url = ('https://archive-api.open-meteo.com/v1/archive?latitude=' + ','.join(str(g[0]) for g in bagian)
           + '&longitude=' + ','.join(str(g[1]) for g in bagian)
           + f'&start_date={hari_ini - dt.timedelta(days=HANGAT)}&end_date={hari_ini - dt.timedelta(days=9)}&' + H.VAR)
    try:
        return tarik(bagian, f'era5-{HANGAT}', url)
    except Exception as e:
        print('ERA5 dilewati:', e, file=sys.stderr)
        return None


def ramalan(bagian):
    url = ('https://api.open-meteo.com/v1/forecast?latitude=' + ','.join(str(g[0]) for g in bagian)
           + '&longitude=' + ','.join(str(g[1]) for g in bagian)
           + f'&past_days={PAST}&forecast_days=1&' + H.VAR)
    return tarik(bagian, f'fc-{PAST}', url)


def seri_sel(awal=None, akhir=None):
    """[(lat, lon, prov, {tgl: {fwi, dc, hujan, ws}})] untuk seluruh grid darat.
    ERA5 dulu (pemanasan HANGAT hari s.d. H-9), lalu forecast melanjutkan keadaan FFMC/DMC/DC-nya untuk hari sesudahnya."""
    grid = H.grid_darat(Wilayah())
    hari_ini = dt.date.today()
    out = []
    for a in range(0, len(grid), BATCH):
        bagian = grid[a:a + BATCH]
        era = None if os.environ.get('ERA5') == '0' else arsip(bagian, hari_ini)
        fc = ramalan(bagian)
        for i, (g, df) in enumerate(zip(bagian, fc)):
            hari, seri, kode = [], [], F.AWAL
            if era:
                hari = H.siang(era[i]['hourly'])
                seri = F.deret([x[1:5] for x in hari])
                if seri:
                    kode = (seri[-1]['ffmc'], seri[-1]['dmc'], seri[-1]['dc'])
            hari2 = [x for x in H.siang(df['hourly']) if not hari or x[0] > hari[-1][0]]
            seri += F.deret([x[1:5] for x in hari2], awal=kode)
            hari += hari2
            per = {x[0]: {'fwi': round(sr['fwi'], 1), 'dc': round(sr['dc'], 1),
                          'hujan': None if x[4] is None else round(x[4], 1), 'ws': x[3]}
                   for x, sr in zip(hari, seri)
                   if (awal is None or x[0] >= awal) and (akhir is None or x[0] <= akhir)}
            out.append((g[0], g[1], g[2], per))
        if a + BATCH < len(grid):
            time.sleep(2)
    return out


def hitung(awal, akhir):
    awal, akhir = str(awal), str(akhir)
    sel = seri_sel(awal, akhir)
    out = {}
    d = dt.date.fromisoformat(awal)
    while d <= dt.date.fromisoformat(akhir):
        out[d.isoformat()] = {}
        d += dt.timedelta(days=1)
    for lat, lon, prov, per in sel:
        for tgl, v in per.items():
            if tgl in out:
                out[tgl][(lat, lon)] = {'prov': prov, **v}
    kosong = [t for t, v in out.items() if not v]
    if kosong:
        sys.exit(f'tidak ada cuaca untuk {kosong}: rentangnya di luar past_days={PAST}?')
    return out


def uji():
    """Yang ditagih bukan FWI/DC yang sama persis, tetapi dua KEPUTUSAN yang benar-benar dipakai firespot_hari:
       - ambang bara gambut `dc > 350` (harian.main: cluster gambut kering dipertahankan 168 jam, bukan 72 jam);
       - kelas FWI aturan.kelas_fwi (batas 2 / 7 / 14), yang menentukan level cluster lewat aturan.status.
    Keduanya harus sepakat >= 95 persen sel-hari dengan public/data/fwi.json, pada hari yang sama-sama ada.
    Nilai mentahnya memang beda: pipeline live menyambung keadaan FFMC/DMC/DC sejak awal musim, hitungan ini
    memanaskannya ulang (ERA5 300 hari, atau 92 hari forecast bila kuota ERA5 habis), dan DC menumpuk tanpa batas."""
    sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
    import aturan as A
    P = json.load(open(os.path.join(AKAR, 'public/data/fwi.json')))
    hidup = {(g['lat'], g['lon']): {h['tgl']: h for h in g['hari']} for g in P['grid']}
    hari = sorted({t for v in hidup.values() for t in v})
    kita = hitung(hari[0], hari[-1])
    n = cocok_dc = cocok_kelas = 0
    beda_dc, beda_kelas = [], []
    for tgl in hari:
        for k, v in kita[tgl].items():
            h = hidup.get(k, {}).get(tgl)
            if not h or h.get('celah'):
                continue
            n += 1
            if (v['dc'] > 350) == (h['dc'] > 350):
                cocok_dc += 1
            else:
                beda_dc.append((tgl, k, v['dc'], h['dc']))
            if A.kelas_fwi(v['fwi']) == A.kelas_fwi(h['fwi']):
                cocok_kelas += 1
            else:
                beda_kelas.append((tgl, k, v['fwi'], h['fwi']))
    assert n >= 1000, f'terlalu sedikit sel-hari yang bisa dibanding: {n}'
    pdc, pk = cocok_dc / n, cocok_kelas / n
    assert pdc >= 0.95, f'ambang DC > 350 cocok hanya {pdc:.1%} dari {n} sel-hari; contoh (tgl, sel, kita, live) {beda_dc[:5]}'
    assert pk >= 0.95, f'kelas FWI cocok hanya {pk:.1%} dari {n} sel-hari; contoh (tgl, sel, kita, live) {beda_kelas[:5]}'
    print(f'uji lolos: {n} sel-hari {hari[0]}..{hari[-1]}; ambang DC > 350 cocok {pdc:.1%}, kelas FWI cocok {pk:.1%}')


if __name__ == '__main__':
    arg = sys.argv[1:]
    if '--uji' in arg:
        uji()
    else:
        nilai = lambda o, b=None: arg[arg.index(o) + 1] if o in arg else b
        a = hitung(nilai('--awal', ''), nilai('--akhir', ''))
        if nilai('--keluar'):
            json.dump({t: {f'{la},{lo}': v for (la, lo), v in s.items()} for t, s in a.items()}, open(nilai('--keluar'), 'w'))
        for t in sorted(a):
            v = a[t].values()
            print(t, len(a[t]), 'sel; FWI rata', round(sum(x['fwi'] for x in v) / len(v), 1),
                  'DC > 350:', sum(1 for x in v if x['dc'] > 350))
