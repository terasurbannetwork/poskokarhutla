"""Grid FWI harian untuk hari LAMPAU, supaya firespot dan pil cuaca deck bisa dihitung ulang tanpa menyentuh keadaan live.

Mesin hitungnya mesin website: scripts/data/harian.py (grid_darat sel 0,5 derajat, siang() = nilai jam 12 setempat + hujan 24 jam)
dan scripts/data/fwi.py (deret FFMC/DMC/DC/ISI/BUI/FWI). Yang beda hanya SUMBER cuacanya: satu tarikan Open-Meteo forecast
past_days=92 per sel, dipanaskan dari nilai awal standar (fwi.AWAL), bukan keadaan bersambung public/data/fwi_state.json.
Pipeline harian memakai keadaan bersambung karena ia jalan tiap hari; untuk membangun ulang 14 hari sekaligus keadaan itu
tidak ada (ia cuma menyimpan satu titik waktu, H-2), jadi 92 hari pemanasan dipakai sebagai gantinya: FFMC lupa dalam hitungan
hari, DMC beberapa pekan, DC paling panjang (~53 hari), jadi >= 79 hari pemanasan sebelum hari paling awal yang dipakai.
Kecocokannya dengan fwi.json live diuji oleh uji() di bawah.

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
PAST = 92    # batas Open-Meteo forecast API
BATCH = 25   # sel per tarikan; 92 hari x 80 sel ditolak 429 (bobot kuota)


def tarik(bagian, past=PAST):
    """Satu tarikan Open-Meteo untuk <= 80 sel; dicache per daftar sel + hari tarikan."""
    os.makedirs(CACHE, exist_ok=True)
    nama = f'{bagian[0][0]},{bagian[0][1]}-{bagian[-1][0]},{bagian[-1][1]}-{len(bagian)}-{past}-{dt.date.today()}.json'
    jalur = os.path.join(CACHE, nama)
    if os.path.exists(jalur):
        return json.load(open(jalur))
    url = ('https://api.open-meteo.com/v1/forecast?latitude=' + ','.join(str(g[0]) for g in bagian)
           + '&longitude=' + ','.join(str(g[1]) for g in bagian)
           + f'&past_days={past}&forecast_days=1&' + H.VAR)
    d = H.ambil(url, json_=True)   # coba ulang + tunggu 90 dtk pada 429 (kuota Open-Meteo)
    data = d if isinstance(d, list) else [d]
    json.dump(data, open(jalur, 'w'))
    return data


def seri_sel(awal=None, akhir=None):
    """[(lat, lon, prov, {tgl: {fwi, dc, hujan, ws}})] untuk seluruh grid darat."""
    grid = H.grid_darat(Wilayah())
    out = []
    for a in range(0, len(grid), BATCH):
        bagian = grid[a:a + BATCH]
        data = tarik(bagian)
        for g, d in zip(bagian, data):
            hari = H.siang(d['hourly'])
            seri = F.deret([x[1:5] for x in hari])
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
    """Hari yang sama-sama ada di fwi.json live dan hitungan ulang ini harus sepakat: FWI dalam 2 poin dan DC dalam 10%
    untuk >= 95 persen sel. Pemanasan 92 hari dari nilai awal standar tidak identik dengan keadaan bersambung live,
    jadi yang ditagih kecocokan praktis, bukan kesamaan bit."""
    P = json.load(open(os.path.join(AKAR, 'public/data/fwi.json')))
    hidup = {(g['lat'], g['lon']): {h['tgl']: h for h in g['hari']} for g in P['grid']}
    hari = sorted({t for v in hidup.values() for t in v})
    kita = hitung(hari[0], hari[-1])
    n = cocok_fwi = cocok_dc = 0
    buruk = []
    for tgl in hari:
        for k, v in kita[tgl].items():
            h = hidup.get(k, {}).get(tgl)
            if not h or h.get('celah'):
                continue
            n += 1
            df, dd = abs(v['fwi'] - h['fwi']), abs(v['dc'] - h['dc']) / max(h['dc'], 1)
            cocok_fwi += df <= 2
            cocok_dc += dd <= 0.10
            if df > 2 or dd > 0.10:
                buruk.append((tgl, k, v['fwi'], h['fwi'], v['dc'], h['dc']))
    assert n >= 1000, f'terlalu sedikit sel-hari yang bisa dibanding: {n}'
    pf, pd_ = cocok_fwi / n, cocok_dc / n
    assert pf >= 0.95, f'FWI cocok hanya {pf:.1%} dari {n} sel-hari; contoh {buruk[:5]}'
    assert pd_ >= 0.95, f'DC cocok hanya {pd_:.1%} dari {n} sel-hari; contoh {buruk[:5]}'
    print(f'uji lolos: {n} sel-hari {hari[0]}..{hari[-1]}, FWI cocok {pf:.1%}, DC cocok {pd_:.1%}')


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
