"""Kotak kab/kota hujan lebat di ruang kosong kanan atas peta slide 1 (pemilik 14 Nov 2026: "di kanan atas sini kan masih kosong,
disebutin Kab/Kota yang hujan derasnya"; pilih "keduanya, dipisah").

Dua daftar, sumbernya tidak dicampur:
1. BMKG: peringatan dini hujan lebat dan petir (nowcast) per kecamatan yang tersimpan di website (banjir/data/peringatan.json,
   satu tarikan), digabung ke kab/kota lewat nama kecamatan + pusat kecamatan terdekat ke poligon peringatan. Hanya provinsi
   yang berstatus Siaga hujan lebat di WA BMKG pagi; sisanya ditulis sebagai jumlah.
2. Prakiraan sistem: kecamatan dengan hujan 50 mm atau lebih per hari (banjir/data/cuaca_kec.json, Open-Meteo kisi 0,25 derajat)
   pada hari laporan dan sesudahnya.
"""
import collections, datetime as dt, json, os, re

# singkatan sama dengan panel Peringatan Dini dan tabel slide 1 (Sumut, Jabar, ...)
PENDEK = {'Sumatera Utara': 'Sumut', 'Sumatera Barat': 'Sumbar', 'Sumatera Selatan': 'Sumsel', 'Kep. Bangka Belitung': 'Babel', 'Kepulauan Riau': 'Kepri',
          'Jawa Barat': 'Jabar', 'Jawa Tengah': 'Jateng', 'Jawa Timur': 'Jatim', 'Kalimantan Tengah': 'Kalteng', 'Kalimantan Barat': 'Kalbar'}


def _kec(akar):
    P = json.load(open(os.path.join(akar, 'public', 'banjir', 'data', 'pusat_kec.json'), encoding='utf-8'))
    return P


def siapkan(harian, ke, T, siaga_prov):
    akar = harian.AKAR; lj = os.path.join(ke, 'lanjut'); os.makedirs(lj, exist_ok=True)
    W = harian.unduh_json('https://centurisk97.id/banjir/data/peringatan.json', os.path.join(lj, 'banjir-data-peringatan-hujan.json'))
    C = harian.unduh_json('https://centurisk97.id/banjir/data/cuaca_kec.json', os.path.join(lj, 'banjir-data-cuaca_kec-hujan.json'))
    P = _kec(akar); kunci = list(P)
    norm = lambda t: re.sub(r'[^a-z0-9]', '', t.lower())
    idx = collections.defaultdict(list)
    for k, (la, lo) in P.items():
        pk, kb, kc = k.split('|'); idx[(pk[:2], norm(kc))].append((kb, la, lo))
    bmkg, gagal, seen, jam = collections.defaultdict(set), [], set(), []
    for x in W['nowcast']:
        if 'hujan' not in x['event'].lower() or x['id'] in seen: continue
        seen.add(x['id']); jam.append((x['mulai'], x['selesai']))
        prov = x['prov'] if isinstance(x['prov'], list) else json.loads(x['prov'].replace("'", '"'))
        poly = x['polygon'] if isinstance(x['polygon'], list) else json.loads(x['polygon'])
        pts = [p for ring in poly for p in (ring if isinstance(ring[0], list) else [ring])]
        cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        for kc in x['wilayah'].split(','):
            c = [(kb, la, lo, p) for p in prov for kb, la, lo in idx.get((p, norm(kc)), [])]
            if not c: gagal.append(kc.strip()); continue
            kb, la, lo, p = min(c, key=lambda t: (t[1] - cy) ** 2 + (t[2] - cx) ** 2)
            bmkg[p].add(kb)
    hari = [h for h in C['hari'] if h >= T.isoformat()]
    model = []
    for h in hari:
        j = C['hari'].index(h); kab = {}
        for r in C['kec']:
            mm = r[4][j]
            if mm and mm >= 50:
                pk, kb, _ = kunci[r[0]].split('|'); kab.setdefault((pk[:2], kb), 0); kab[(pk[:2], kb)] = max(kab[(pk[:2], kb)], mm)
        model.append((dt.date.fromisoformat(h), kab))
    di = [p for p in siaga_prov if p in bmkg]; lain = [p for p in bmkg if p not in siaga_prov]
    print('hujan kab: BMKG', {harian.NAMA[p]: len(bmkg[p]) for p in bmkg}, '| lain', len(lain), 'prov', sum(len(bmkg[p]) for p in lain), 'kab',
          '| gagal cocok', gagal, '| model', [(h.isoformat(), len(k)) for h, k in model], '| peringatan dibuat', W['dibuat'], '| cuaca dibuat', C['dibuat'])
    return {'bmkg': bmkg, 'di': di, 'lain': lain, 'model': model, 'W': W, 'C': C, 'jam': jam}


def kotak(D, harian):
    H = harian; nm = lambda p: PENDEK.get(H.NAMA[p], H.NAMA[p])
    BL = lambda d: f"{d.day} {H.BULAN[d.month - 1][:3]}"
    dibuat = dt.datetime.fromisoformat(D['W']['dibuat'])
    def gambar(s, MX, MY, MW, MH):
        X = MX + int(MW * .555); Y = MY + int(MH * .015); Wk = MX + MW - X - 27432; Hk = int(MH * .75)   # bawah kotak di atas label Papua Selatan
        sz = 560; pad = 54864; lh = 99000   # 5,6 pt; tinggi baris hasil cetak PDF (sekitar 1,24 kali ukuran huruf)
        par, n_baris = [], 0
        lebar_t = Wk - 2 * pad
        def tambah(runs):
            nonlocal n_baris
            par.append(runs); n_baris += max(1, -(-int(s.lebar_runs(runs, sz) * 1.2) // lebar_t))
        tambah([('Hujan lebat, peringatan dini BMKG ', H.ORG, True), (f"{BL(dibuat.date())} sekitar {dibuat:%H.%M} WIB", H.ABU, False)])
        for p in D['di']:
            tambah([(nm(p) + ': ', H.TEKS, True), (', '.join(sorted(D['bmkg'][p])), H.TEKS, False)])
        if D['lain']:
            n_l = sum(len(D['bmkg'][p]) for p in D['lain'])
            tambah([(f"Juga {H.f0(n_l)} kab/kota di {len(D['lain'])} provinsi lain.", H.ABU, False)])
        tambah([('Hujan lebat, prakiraan sistem ', H.ORG, True), ('hujan 50 mm atau lebih per hari', H.ABU, False)])
        for h, kab in D['model']:
            if not kab: tambah([(BL(h) + ': ', H.TEKS, True), ('tidak ada kab/kota', H.TEKS, False)]); continue
            per = collections.defaultdict(list)
            for (p, kb), mm in sorted(kab.items()): per[p].append(kb)
            tambah([(BL(h) + ': ', H.TEKS, True), ('; '.join(f"{', '.join(v)} ({nm(p)})" for p, v in per.items()), H.TEKS, False)])
        Hk = min(Hk, n_baris * lh + 2 * pad + 36576)
        o = s.kotak(X, Y, Wk, Hk, 'FFFFFF', 'roundRect', ln='D6DBE1', adj=4000)
        o += s.tx(X + pad, Y + pad, lebar_t, Hk - 2 * pad, par, sz=sz, c=H.TEKS)
        print('kotak hujan: baris', n_baris, 'tinggi', Hk, 'maks', int(MH * .75))
        if n_baris * lh + 2 * pad > int(MH * .75): print('PERINGATAN kotak hujan meluber')
        return o
    return gambar
