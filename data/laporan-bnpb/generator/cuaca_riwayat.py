"""Grid FWI harian untuk hari LAMPAU, supaya firespot dan pil cuaca deck bisa dihitung ulang tanpa menyentuh keadaan live.

Mesin hitungnya mesin website: scripts/data/harian.py (grid_darat sel 0,5 derajat, siang() = nilai jam 12 setempat + hujan
24 jam) dan scripts/data/fwi.py (deret FFMC/DMC/DC/ISI/BUI/FWI). Yang beda hanya dari mana keadaan awalnya datang.

FFMC/DMC/DC harus BERSAMBUNG: pipeline harian menyimpannya di public/data/fwi_state.json, yang tidak ikut git dan cuma
memuat satu titik waktu. Jadi di sini keadaan itu DIPUNGUT dari public/data/fwi.json yang ikut git: berkas itu memuat
ffmc/dmc/dc tiap sel untuk beberapa hari terakhir jalannya pipeline, sudah bersambung sejak awal musim. Hari-hari yang
ada di berkas itu dipakai apa adanya; hari sesudahnya dihitung dari tarikan Open-Meteo forecast (past_days=92) yang
dimulai dari keadaan berkas itu.

Memanaskan ulang dari nol ditinggalkan: 92 hari forecast dari nilai awal standar membuat DC jauh terlalu rendah (NTT 468
vs 868 live) dan ambang bara gambut `dc > 350` meleset di 18 persen sel-hari; ERA5 300 hari seperti harian.cuaca_fwi
akan benar tetapi 611 sel x 300 hari jauh melewati kuota harian Open-Meteo (ditolak 429 di percobaan 25 Okt 2026).

API:
    hitung(awal, akhir) -> {'YYYY-MM-DD': {(lat, lon): {'prov','fwi','dc','hujan','ws'}}}   # hari WIB, inklusif
CLI:
    python3 cuaca_riwayat.py --awal 2026-10-12 --akhir 2026-10-25 [--keluar cuaca.json]
    python3 cuaca_riwayat.py --uji      # banding dengan fwi.json situs live pada hari yang sama-sama ada
Tarikan mentah di cache/cuaca/ (di-ignore git); hapus berkasnya untuk menarik ulang."""
import datetime as dt, json, os, sys, time, urllib.request

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
import fwi as F        # noqa: E402
import harian as H     # noqa: E402
from wilayah import Wilayah   # noqa: E402

CACHE = os.path.join(SINI, 'cache', 'cuaca')
BENIH = os.path.join(AKAR, 'public/data/fwi.json')
LIVE = 'https://centurisk97.id/data/fwi.json'
PAST = 92     # batas Open-Meteo forecast API
BATCH = 25    # sel per tarikan


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


def ramalan(bagian):
    url = ('https://api.open-meteo.com/v1/forecast?latitude=' + ','.join(str(g[0]) for g in bagian)
           + '&longitude=' + ','.join(str(g[1]) for g in bagian)
           + f'&past_days={PAST}&forecast_days=1&' + H.VAR)
    return tarik(bagian, f'fc-{PAST}', url)


def benih(jalur=None):
    """{(lat, lon): (tgl_akhir, (ffmc, dmc, dc), {tgl: nilai harian})} dari fwi.json: hari s.d. hari_ini berkasnya
    (yang sudah terjadi, bukan prakiraan) beserta keadaan FFMC/DMC/DC di hari terakhirnya."""
    P = json.load(open(jalur or BENIH))
    out = {}
    for g in P['grid']:
        ada = [h for h in g['hari'] if h['tgl'] <= P['hari_ini'] and 'dc' in h]
        if not ada:
            continue
        out[(g['lat'], g['lon'])] = (ada[-1]['tgl'], (ada[-1]['ffmc'], ada[-1]['dmc'], ada[-1]['dc']),
                                     {h['tgl']: {'fwi': h['fwi'], 'dc': h['dc'], 'hujan': h.get('hujan'), 'ws': h['ws']} for h in ada})
    return out


def seri_sel(awal=None, akhir=None, bn=None):
    """[(lat, lon, prov, {tgl: {fwi, dc, hujan, ws}})] untuk seluruh grid darat."""
    grid = H.grid_darat(Wilayah())
    bn = benih() if bn is None else bn
    # Sel yang tak ada di benih dipinjami keadaan sel benih TERDEKAT, bukan nilai awal standar: beda satu sel 0,5 derajat
    # jauh lebih kecil daripada beda DC yang menumpuk sejak awal musim (lihat uji()). Hari-harinya tetap dihitung sendiri
    # dari cuaca selnya; yang dipinjam cuma titik mulainya.
    tanpa = [g for g in grid if (g[0], g[1]) not in bn]
    for g in tanpa:
        dekat = min(bn, key=lambda c: (c[0] - g[0]) ** 2 + (c[1] - g[1]) ** 2)
        bn[(g[0], g[1])] = (bn[dekat][0], bn[dekat][1], {})
    if tanpa:
        print(f'{len(tanpa)} sel tidak ada di {os.path.basename(BENIH)}: keadaan awalnya dipinjam dari sel terdekat, '
              f'contoh {tanpa[:3]}', file=sys.stderr)
    out = []
    for a in range(0, len(grid), BATCH):
        bagian = grid[a:a + BATCH]
        fc = ramalan(bagian)
        for g, df in zip(bagian, fc):
            tgl0, kode, per = bn.get((g[0], g[1]), ('0000', F.AWAL, {}))
            per = dict(per)
            lanjut = [x for x in H.siang(df['hourly']) if x[0] > tgl0]
            for x, sr in zip(lanjut, F.deret([x[1:5] for x in lanjut], awal=kode)):
                per[x[0]] = {'fwi': round(sr['fwi'], 1), 'dc': round(sr['dc'], 1),
                             'hujan': None if x[4] is None else round(x[4], 1), 'ws': x[3]}
            out.append((g[0], g[1], g[2], {t: v for t, v in per.items()
                                           if (awal is None or t >= awal) and (akhir is None or t <= akhir)}))
        if a + BATCH < len(grid):
            time.sleep(1)
    return out


def hitung(awal, akhir, bn=None):
    awal, akhir = str(awal), str(akhir)
    sel = seri_sel(awal, akhir, bn)
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
    """Gerbangnya fwi.json SITUS LIVE, bukan salinan lokal yang jadi benih (itu akan memeriksa dirinya sendiri).
    Yang ditagih bukan FWI/DC yang sama persis, tetapi dua KEPUTUSAN yang dipakai firespot_hari:
       - ambang bara gambut `dc > 350` (harian.main: cluster gambut kering dipertahankan 168 jam, bukan 72 jam);
       - kelas FWI aturan.kelas_fwi (batas 2 / 7 / 14), yang menentukan level cluster lewat aturan.status.
    Keduanya harus sepakat >= 95 persen sel-hari pada hari yang sama-sama ada. Nilai mentahnya boleh beda: cuaca
    beberapa hari terakhir masih direvisi Open-Meteo, dan benihnya belasan hari lebih tua dari jalan live."""
    sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
    import aturan as A
    jalur = os.path.join(CACHE, f'fwi-live-{dt.date.today()}.json')
    if not os.path.exists(jalur):
        os.makedirs(CACHE, exist_ok=True)
        req = urllib.request.Request(LIVE, headers={'User-Agent': 'Mozilla/5.0 poskokarhutla-generator'})   # tanpa UA: 403
        open(jalur, 'w').write(urllib.request.urlopen(req, timeout=120).read().decode())
    P = json.load(open(jalur))
    hidup = {(g['lat'], g['lon']): {h['tgl']: h for h in g['hari'] if h['tgl'] <= P['hari_ini']} for g in P['grid']}
    hari = sorted({t for v in hidup.values() for t in v})
    assert len(hari) >= 2, f'fwi.json live cuma punya {hari} hari yang sudah terjadi'
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
    print(f'uji lolos: {n} sel-hari {hari[0]}..{hari[-1]} vs fwi.json live; ambang DC > 350 cocok {pdc:.1%}, kelas FWI cocok {pk:.1%}')


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
