"""Pembaca data banjir sistem kita untuk deck harian BNPB (hanya angka dari public/banjir/data, tidak ada angka karangan).

    baca(akar, tanggal, nama_prov) -> {'hari','sumber','prov':[{kode,nama,status,kejadian_aktif,rob,hujan3_mm,terdampak_jiwa}],'total':{...}} atau None

- Bila public/banjir/data/wilayah_hari.json ada dan harinya = tanggal laporan, dipakai apa adanya.
- Bila belum ada: status.json (status banjir tertinggi kecamatan per provinsi, hari = tanggal), rob.json (titik rob Waspada ke atas, sama dengan wilayah_hari.py
  pada hari itu), kejadian_aktif_awal.json (gugus kecamatan Siaga+; hanya bila harinya = tanggal). Hujan 3 hari = maksimum kecamatan.
  terdampak_jiwa tidak ada di sumber itu: None, bukan 0.
- Hari tanggal tidak ada di sumber = None (bagian banjir tidak dibuat). Tanpa satu pun provinsi Awas/Siaga, kejadian aktif, atau rob = None.
- Status 0 Normal, 1 Waspada, 2 Siaga, 3 Awas. Provinsi berstatus >= 2 wajib masuk deck.
    python3 banjir_data.py   # uji"""
import datetime as dt, json, os

LEVEL = ['Normal', 'Waspada', 'Siaga', 'Awas']


def _muat(d, f):
    p = os.path.join(d, f)
    return json.load(open(p)) if os.path.exists(p) else None


def _lv(v):
    if isinstance(v, str):
        return LEVEL.index(v.strip().capitalize()) if v.strip().capitalize() in LEVEL else 0 if v.strip().lower() == "aman" else int(v)
    return int(v or 0)   # status kosong = Normal; angka lain tidak dipaksa 0


def _jml(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) if xs else None   # None = sumber tidak membawanya (bukan 0)


def _rapi(hari, prov, sumber, kejadian=None):
    prov = [p for p in prov if p['status'] >= 2 or p['kejadian_aktif'] or p['rob']]
    if not prov:
        return None
    prov.sort(key=lambda p: (-p['status'], -(p['kejadian_aktif'] or 0), -(p['rob'] or 0), -(p['hujan3_mm'] or 0)))
    kode = sorted({k for p in prov for k in p.get('kejadian_kode') or []})
    if kejadian is None: kejadian = len(kode) if kode else _jml(p['kejadian_aktif'] for p in prov)   # kejadian lintas provinsi dihitung sekali
    return {'hari': hari, 'sumber': sumber, 'prov': prov, 'total': {
        'awas': sum(p['status'] == 3 for p in prov), 'siaga': sum(p['status'] == 2 for p in prov), 'waspada': sum(p['status'] == 1 for p in prov),
        'kejadian_aktif': kejadian, 'rob': _jml(p['rob'] for p in prov), 'terpapar_jiwa': _jml(p['terpapar_jiwa'] for p in prov)}}


def _depan(d, tanggal):
    # rob 1 sampai 3 hari ke depan dari prakiraan72.json: kecamatan yang mencapai Siaga atau Awas (hanya bila tanggal ada di berkasnya)
    p = _muat(d, 'prakiraan72.json'); h = tanggal.isoformat()
    if not p or h not in p.get('hari', []): return []
    i = p['hari'].index(h); o = []
    for k, v in (p.get('rob') or {}).get('kec', {}).items():
        a = [(j, l) for j, l in enumerate(v['lv']) if j > i and l is not None and l >= 2]
        if a:
            j, l = max(a, key=lambda t: (t[1], -t[0])); _, kab, kec = k.split('|')
            o.append({'kec': f'{kab}, {kec}', 'lv': l, 'hari': p['hari'][j]})
    return sorted(o, key=lambda x: (-x['lv'], x['hari'], x['kec']))


def baca(akar, tanggal, nama):
    r = _baca(akar, tanggal, nama)
    if r: r['rob_depan'] = _depan(os.path.join(akar, 'public', 'banjir', 'data'), tanggal)
    return r


def _baca(akar, tanggal, nama):
    d = os.path.join(akar, 'public', 'banjir', 'data'); hari = tanggal.isoformat()
    w = _muat(d, 'wilayah_hari.json')
    if w and w.get('hari') == hari:
        tk = (w.get('total') or {}).get('kejadian_aktif')   # total unik dari sumber bila ada
        return _rapi(hari, [{'kode': p['kode'], 'nama': p.get('nama') or nama.get(p['kode'], p['kode']), 'status': _lv(p.get('status')),
                             'kejadian_aktif': p.get('kejadian_aktif'), 'kejadian_kode': p.get('kejadian_kode') or [], 'rob': p.get('rob'),
                             'hujan3_mm': p.get('hujan3_mm'), 'terpapar_jiwa': p.get('terpapar_jiwa')} for p in w['provinsi']], 'wilayah_hari.json',
                     tk if isinstance(tk, int) else None)
    st = _muat(d, 'status.json')
    if not st or hari not in st.get('hari', []):
        return None
    i = st['hari'].index(hari); P = {}
    for k, v in st['kec'].items():
        b = v['b'][i] if i < len(v['b']) else None
        if b is None: continue
        p = P.setdefault(k.split('|')[0], {'status': 0, 'hujan3_mm': None})
        p['status'] = max(p['status'], b)
        if v.get('h3') is not None: p['hujan3_mm'] = max(p['hujan3_mm'] or 0, v['h3'])
    kode_nama = {n: k for k, n in nama.items()}
    ro = _muat(d, 'rob.json'); R = None
    if ro and hari in ro.get('hari', []):
        j = ro['hari'].index(hari); R = {}
        for t in ro['titik']:
            k = kode_nama.get(t['prov'].replace('Kepulauan ', 'Kep. '))
            if k and j < len(t['lv']) and (t['lv'][j] or 0) >= 1: R[k] = R.get(k, 0) + 1
    ka = _muat(d, 'kejadian_aktif_awal.json'); K = None; KK = {}
    if ka and ka.get('hari') == hari:
        K = {}
        for e in ka['kejadian']:
            for k in e['prov']: K[k] = K.get(k, 0) + 1; KK.setdefault(k, []).append(e['kode'])
    nv = lambda D, k: None if D is None else D.get(k, 0)   # sumber tidak ada = None, ada tapi provinsi tak tercatat = 0
    return _rapi(hari, [{'kode': k, 'nama': nama.get(k, k), 'status': P.get(k, {}).get('status', 0), 'kejadian_aktif': nv(K, k), 'kejadian_kode': KK.get(k, []),
                         'rob': nv(R, k), 'hujan3_mm': P.get(k, {}).get('hujan3_mm'), 'terpapar_jiwa': None} for k in set(P) | set(R or ()) | set(K or ())],
                 'status.json', len(ka['kejadian']) if K is not None else None)


if __name__ == '__main__':
    import shutil, tempfile
    t = tempfile.mkdtemp(); d = os.path.join(t, 'public', 'banjir', 'data'); os.makedirs(d)
    J = lambda f, o: json.dump(o, open(os.path.join(d, f), 'w'))
    nama = {'11': 'Aceh', '31': 'DKI Jakarta', '12': 'Sumatera Utara'}; tg = dt.date(2026, 10, 14)
    assert baca(t, tg, nama) is None                                    # tanpa sumber: tidak dibuat
    J('status.json', {'hari': ['2026-10-14', '2026-10-15'], 'kec': {'11|A|x': {'b': [3, 0], 'h3': 120.5}, '11|A|y': {'b': [1, 0], 'h3': 40}, '12|B|z': {'b': [1, 3], 'h3': 30}}})
    r = baca(t, tg, nama)
    assert [p['kode'] for p in r['prov']] == ['11'] and r['prov'][0]['status'] == 3 and r['prov'][0]['hujan3_mm'] == 120.5, r   # Waspada saja tidak masuk
    assert r['total']['awas'] == 1 and r['total']['terpapar_jiwa'] is None and r['prov'][0]['rob'] is None and r['total']['kejadian_aktif'] is None   # sumber tak ada = None
    assert baca(t, dt.date(2026, 10, 20), nama) is None                 # hari tidak ada: tidak dibuat, bukan 0
    J('rob.json', {'hari': ['2026-10-14'], 'titik': [{'prov': 'DKI Jakarta', 'lv': [2]}, {'prov': 'DKI Jakarta', 'lv': [1]}]})
    J('kejadian_aktif_awal.json', {'hari': '2026-10-14', 'kejadian': [{'kode': 'B1', 'prov': ['11']}, {'kode': 'B2', 'prov': ['11', '12']}]})
    r = baca(t, tg, nama); P = {p['kode']: p for p in r['prov']}
    assert P['31']['rob'] == 2 and P['11']['kejadian_aktif'] == 2 and P['12']['kejadian_aktif'] == 1 and r['total']['rob'] == 2 and r['total']['kejadian_aktif'] == 2   # B2 lintas provinsi dihitung sekali
    assert r['prov'][0]['kode'] == '11'                                 # Awas paling atas
    J('wilayah_hari.json', {'hari': '2026-10-14', 'provinsi': [{'kode': '31', 'nama': 'DKI Jakarta', 'status': 'Siaga', 'kejadian_aktif': 0, 'rob': 0, 'kejadian_kode': ['B9'], 'hujan3_mm': 10, 'terpapar_jiwa': 500}, {'kode': '12', 'status': 0, 'kejadian_aktif': 1, 'kejadian_kode': ['B9'], 'rob': None}], 'total': {'kejadian_aktif': 1}})
    r = baca(t, tg, nama)
    assert r['sumber'] == 'wilayah_hari.json' and r['prov'][0]['status'] == 2 and r['total']['terpapar_jiwa'] == 500 and r['total']['kejadian_aktif'] == 1 and r['prov'][0]['rob'] == 0 and r['prov'][1]['rob'] is None   # 0 tetap 0, None tetap None
    J('wilayah_hari.json', {'hari': '2026-10-13', 'provinsi': []})      # berkas basi: jatuh ke status.json
    assert baca(t, tg, nama)['sumber'] == 'status.json'
    J('prakiraan72.json', {'hari': ['2026-10-14', '2026-10-15', '2026-10-16'], 'rob': {'kec': {'31|Jakarta Utara|Penjaringan': {'lv': [0, 1, 2]}, '32|Bekasi|Muaragembong': {'lv': [3, 0, 0]}}}})
    assert baca(t, tg, nama)['rob_depan'] == [{'kec': 'Jakarta Utara, Penjaringan', 'lv': 2, 'hari': '2026-10-16'}]   # hari ini sendiri tidak dihitung
    assert _lv('Aman') == 0 and _lv('Siaga') == 2   # wilayah_hari.py menulis "Aman"
    shutil.rmtree(t); print('banjir_data: uji lulus')
