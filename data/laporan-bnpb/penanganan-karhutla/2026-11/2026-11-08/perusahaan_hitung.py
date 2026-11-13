"""Hitung ulang angka 99 perusahaan 1 Jan s.d. 9 Nov 2026 (revisi pemilik 9 Nov: indikasi luas dan total hotspot sampai 9 Nov; firespot tidak ditampilkan).
Laporan konsesi repo berhenti 27 Okt dan S-NPP berhenti 1 Nov 13.00 UTC, jadi disusun tiga ruas supaya menyambung dengan kolom "terkini" situs:

  A  VIIRS S-NPP keyakinan n/h, 1 Jan 00.00 WIB s.d. FS.SNPP_AKHIR (definisi konsesi_laporan.py)
  B  VIIRS NOAA-20 + NOAA-21 n/h, sesudah A s.d. awal jendela terkini (acuan - 168 jam)
  C  kolom terkini situs (cek.titik_terkini; jendela 168 jam sampai acuan)

Hotspot total = A + B + C. Luas = piksel unik A + B + C x 14,06 ha, dipotong luas konsesi, per usaha (konsesi_laporan.bangun).
Gerbang: ruas S-NPP s.d. 27 Okt 01.15 WIB dibandingkan dengan laporan konsesi (sawit26) per perusahaan; ruas C dibandingkan dengan kolom situs.

    PYTHONUTF8=1 C:/Python314/python perusahaan_hitung.py <folder cache firms_tahunan.py>   ->  perusahaan_angka.json
"""
import csv, datetime as dt, glob, json, math, os, sys

S = os.path.dirname(os.path.abspath(__file__)); AKAR = os.path.normpath(os.path.join(S, '..', '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data')); sys.path.insert(0, S)
import aktor_walhi as W, firms_sumber as FS, titik_palsu as TP  # noqa: E402
import perusahaan as PR  # noqa: E402

WIB = dt.timezone(dt.timedelta(hours=7))
PIKSEL = 0.375 / 111.32; HA = 0.375 * 0.375 * 100
T0 = dt.datetime(2026, 1, 1, tzinfo=WIB)
UJI_AKHIR = dt.datetime(2026, 10, 27, 1, 15, tzinfo=WIB)   # konsesi2026/index.json: sampai
KODE = {'VIIRS_SNPP': 'N', 'VIIRS_NOAA20': 'N20', 'VIIRS_NOAA21': 'N21'}


def utama(ke):
    d, P, Semua = PR.muat(); poli = d['poligon']; acuan = dt.datetime.fromisoformat(d['periode']['terkini']['acuan']); t_c0 = acuan - dt.timedelta(hours=168)
    ids = {}
    for i, n in poli.items(): ids.setdefault(n, set()).add(i)
    fitur = json.load(open(os.path.join(AKAR, 'public/data/lahan/konsesi.geojson'), encoding='utf-8'))['features']
    blok = {}
    for i, f in enumerate(fitur):
        q = f['properties']; blok.setdefault((W.kunci(q['nama']) or q['id'], q['jenis'], q['prov']), []).append(i)
    # satu perusahaan = usaha (nama + jenis + prov) yang id blok pertamanya ada di poligonnya, sama dengan aktor_sawit.tambah atas konsesi_laporan
    milik = {}; usaha_luas = {}
    for k, idx in blok.items():
        pid = fitur[idx[0]]['properties']['id']
        for p in Semua:
            if pid in ids.get(p['nama'], ()): milik[k] = p['nama']; usaha_luas[k] = sum(fitur[i]['properties'].get('luas_peta_ha') or 0 for i in idx)
    # perusahaan yang blok usahanya berinduk nama lain (mis. Inhutani I Unit Labanan: kunci nama membuang "Unit ...") tidak punya baris laporan: pakai poligonnya sendiri
    per_id = {f['properties']['id']: i for i, f in enumerate(fitur)}; sendiri = {}
    for p in Semua:
        if p['nama'] not in milik.values():
            k = ('poligon', p['nama']); sendiri[k] = [per_id[x] for x in ids.get(p['nama'], ()) if x in per_id]; milik[k] = p['nama']
            usaha_luas[k] = sum(fitur[i]['properties'].get('luas_peta_ha') or 0 for i in sendiri[k]); print('pakai poligon sendiri:', p['nama'], sendiri[k], flush=True)
    blok.update(sendiri); sel_ind = TP.sel_industri()[0]
    kecil = [(i, k) for k in milik for i in blok[k]]; fk = [fitur[i] for i, _ in kecil]; ke_usaha = [k for _, k in kecil]; ix = W.Indeks(fk)
    print('usaha', len(milik), 'poligon', len(fk), 'perusahaan', len(set(milik.values())), flush=True)
    TIT = {k: {'A': set(), 'B': set(), 'C': set(), 'uji': set()} for k in milik}; PX = {k: set() for k in milik}; PX_UJI = {k: set() for k in milik}; memo = {}
    for f in sorted(glob.glob(os.path.join(ke, '*.csv'))):
        src = KODE[os.path.basename(f)[:-15].rsplit('_', 1)[0]]
        for r in csv.DictReader(open(f, encoding='utf-8')):
            if r['confidence'] not in ('n', 'h') or r.get('type', '0') != '0' or TP.palsu(float(r['latitude']), float(r['longitude']), sel_ind): continue   # hanya api vegetasi: sumber panas tetap (pabrik) dibuang
            j = r['acq_time'].zfill(4); t = dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}:00+00:00")
            if t > acuan: continue
            if src == 'N': ru = 'A' if T0 <= t <= FS.SNPP_AKHIR else None
            else: ru = None if t <= FS.SNPP_AKHIR else 'B' if t < t_c0 else 'C'
            uji = src == 'N' and T0 <= t <= UJI_AKHIR
            if not ru and not uji: continue
            la, lo = float(r['latitude']), float(r['longitude']); m = (la, lo)
            if m not in memo: memo[m] = {ke_usaha[i] for i in ix.cari(lo, la)}
            for k in memo[m]:
                key = (t, la, lo); c = (math.floor(la / PIKSEL), math.floor(lo / PIKSEL))
                if ru: TIT[k][ru].add(key); PX[k].add(c)
                if uji: TIT[k]['uji'].add(key); PX_UJI[k].add(c)
    hasil = {p['nama']: {'A': 0, 'B': 0, 'C_csv': 0, 'uji_titik': 0, 'luas': 0, 'uji_luas': 0} for p in Semua}
    for k, nm in milik.items():
        r = hasil[nm]; cap = usaha_luas[k] or 1e12; t = TIT[k]
        r['A'] += len(t['A']); r['B'] += len(t['B']); r['C_csv'] += len(t['C']); r['uji_titik'] += len(t['uji'])
        r['luas'] += round(min(cap, len(PX[k]) * HA)); r['uji_luas'] += round(min(cap, len(PX_UJI[k]) * HA))
    K = []
    for p in Semua:
        r = hasil[p['nama']]; c = p['cek']; s = p['sawit26']
        K.append({'nama': p['nama'], **r, 'hs_kini': c.get('titik_terkini'), 'hs_total': r['A'] + r['B'] + (c.get('titik_terkini') or 0), 'sawit26_titik': s['titik'], 'sawit26_luas': s['luas_bakar_ha']})
    json.dump({'acuan': d['periode']['terkini']['acuan'], 'perusahaan': K}, open(os.path.join(S, 'perusahaan_angka.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    jum = lambda m: sum(x[m] or 0 for x in K)
    print('UJI s.d. 27 Okt: titik', jum('uji_titik'), 'vs laporan', jum('sawit26_titik'), '| luas', jum('uji_luas'), 'vs', jum('sawit26_luas'),
          '| perusahaan sama persis titik', sum(x['uji_titik'] == x['sawit26_titik'] for x in K), 'luas', sum(x['uji_luas'] == x['sawit26_luas'] for x in K))
    print('selisih titik terbesar', sorted([(abs(x['uji_titik'] - x['sawit26_titik']), x['nama'], x['uji_titik'], x['sawit26_titik']) for x in K], reverse=True)[:6])
    print('selisih luas terbesar', sorted([(abs(x['uji_luas'] - x['sawit26_luas']), x['nama'], x['uji_luas'], x['sawit26_luas']) for x in K], reverse=True)[:6])
    print('UJI terkini: hotspot csv', jum('C_csv'), 'vs situs', jum('hs_kini'), '| selisih terbesar', sorted([(abs(x['C_csv'] - (x['hs_kini'] or 0)), x['nama'], x['C_csv'], x['hs_kini']) for x in K], reverse=True)[:4])
    print('TOTAL hs', jum('hs_total'), 'luas', jum('luas'), '| luas turun dibanding 27 Okt:', sum(x['luas'] < x['uji_luas'] for x in K), '| hotspot nol:', sum(not x['hs_total'] for x in K))
    assert all(x['hs_total'] >= (x['hs_kini'] or 0) and x['luas'] >= x['uji_luas'] for x in K)


if __name__ == '__main__':
    utama(sys.argv[1])
