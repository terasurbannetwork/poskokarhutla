"""Lampiran slide Prediksi (11 Nov 2026, pemilik: "buat list kecamatan yang ada dalam prediksi, karena di slide itu cuma nampilin angka,
tampilin di lampiran, perbagus dan poles tampilannya", "lampiran gausah masuk tab indicator").

Daftar kecamatan berstatus Siaga atau Awas banjir atau longsor dalam 3 hari prakiraan (prakiraan72.json website, level >= 2), dikelompokkan
provinsi > kabupaten/kota, satu baris per kecamatan dengan sel level tiap hari seperti panel "Kecamatan Siaga dan Awas" di slide Prediksi.
Tiga kolom per halaman; provinsi tidak dipotong tanpa kepala: bila berlanjut ke kolom berikutnya, kepalanya diulang dengan tanda "lanjutan".
"""
import datetime as dt, json, os
import harian as H
from harian import NAVY, ORG, MERAH, ABU, INK, TEKS, T_NAVY, T_ORG, T_MERAH, f0
from harian_lanjut import X0, X1, Y0, YB, HID, GEO, TGL

KOL, GAP = 3, 137160
H_PROV, H_KEC, H_KEPALA = 201168, 137160, 320040
YL = 6035040   # lampiran tanpa pita bawah: isi boleh sampai dekat kaki, legenda di bawahnya
LEVEL = {2: ('Siaga', ORG), 3: ('Awas', MERAH)}   # sel polos berwarna, arti di legenda (pemilik: poles, jangan ramai)


def siapkan(ke, T, kab_nama=None):
    """-> {'hari': [date x3], 'prov': [(kode, [(kab, [(kec, [b x3], [l x3])])])], 'n_kec', 'n_kab', 'n_b', 'n_l', 'dibuat'}"""
    d = json.load(open(os.path.join(ke, 'lanjut', 'banjir-data-prakiraan72.json'), encoding='utf-8'))
    idx = [i for i, h in enumerate(d['hari']) if h >= T.isoformat()][:3]
    pv = {}
    for k, v in d['kec'].items():
        p, kab, kec = k.split('|')
        b, l = [v['b'][i] or 0 for i in idx], [v['l'][i] or 0 for i in idx]
        if max(b + l) < 2: continue
        pv.setdefault(p, {}).setdefault(kab, []).append((kec, b, l))
    urut = lambda r: (-max(r[1] + r[2]), -sum(1 for x in r[1] + r[2] if x >= 2), r[0])
    prov = sorted(((p, sorted(((kab, sorted(ks, key=urut)) for kab, ks in kb.items()), key=lambda t: (-len(t[1]), t[0]))) for p, kb in pv.items()),
                  key=lambda t: (-sum(len(ks) for _, ks in t[1]), int(t[0])))
    semua = [r for _, kb in prov for _, ks in kb for r in ks]
    return {'hari': [dt.date.fromisoformat(d['hari'][i]) for i in idx], 'prov': prov, 'dibuat': d['dibuat'],
            'n_kec': len(semua), 'n_kab': sum(len(kb) for _, kb in prov), 'n_b': sum(1 for r in semua if max(r[1]) >= 2), 'n_l': sum(1 for r in semua if max(r[2]) >= 2)}


def _susun(L):
    """Bagi baris ke kolom dan halaman. Item: ('prov', kode, lanjutan) | ('kec', kab atau '', kec, b, l, garis_kab)."""
    tinggi = YL - Y0 - H_KEPALA - 27432
    hal, kol, y = [[[]]], 0, 0
    def baru_kolom():
        nonlocal kol, y
        kol += 1; y = 0
        if kol == KOL: hal.append([[]]); kol = 0
        else: hal[-1].append([])
    for p, kb in L['prov']:
        if y and y + H_PROV + 2 * H_KEC > tinggi: baru_kolom()   # kepala provinsi tidak sendirian di dasar kolom
        hal[-1][-1].append(('prov', p, False)); y += H_PROV
        for kab, ks in kb:
            for j, (kec, b, l) in enumerate(ks):
                if y + H_KEC > tinggi:
                    baru_kolom(); hal[-1][-1].append(('prov', p, True)); y += H_PROV
                    j = 0   # nama kabupaten diulang di puncak kolom baru
                hal[-1][-1].append(('kec', kab if j == 0 else '', kec, b, l, j == 0)); y += H_KEC
    return hal


def _kolom(s, L, x, w, isi):
    hh = L['hari']; wk, wc = 1005840, 1060000; sel = (w - wk - wc - 73152) // 6; xc = x + wk + wc
    o = ''
    # kepala kolom: Banjir | Longsor, lalu tanggal
    for j, (lab, c) in enumerate((('Banjir', HID), ('Longsor', GEO))):
        xg = xc + j * (3 * sel + 73152)
        o += s.tx(xg, Y0, 3 * sel, 155448, [lab], sz=660, b=True, c=c, al='ctr', an='ctr', wrap='none')
        for i, d in enumerate(hh): o += s.tx(xg + i * sel, Y0 + 146304, sel, 137160, [str(d.day)], sz=600, c=ABU, al='ctr', an='ctr', wrap='none')
    o += s.tx(x + 54864, Y0 + 146304, wk, 137160, ['KAB/KOTA'], sz=560, b=True, c=ABU, spc=40, an='ctr', wrap='none')
    o += s.tx(x + wk, Y0 + 146304, wc, 137160, ['KECAMATAN'], sz=560, b=True, c=ABU, spc=40, an='ctr', wrap='none')
    o += s.garis(x, Y0 + H_KEPALA - 27432, w, 'BFC5CC')
    y = Y0 + H_KEPALA
    for it in isi:
        if it[0] == 'prov':
            n = sum(len(ks) for p, kb in L['prov'] if p == it[1] for _, ks in kb)
            o += s.kotak(x, y + 27432, w, H_PROV - 45720, T_NAVY, 'roundRect', adj=20000)
            o += s.tx(x + 73152, y + 27432, w - 146304, H_PROV - 45720, [[(H.NAMA[it[1]], NAVY, True), (' (lanjutan)' if it[2] else f'   {f0(n)} kecamatan', ABU, False)]], sz=680, an='ctr', wrap='none')
            y += H_PROV; continue
        _, kab, kec, b, l, awal = it
        if awal and kab: o += s.garis(x + 54864, y, w - 54864, 'E5E7EB')
        uk = lambda t, n: 600 if len(t) <= n else 540 if len(t) <= n + 4 else 480   # nama lengkap, tanpa elipsis (gerbang D-17): huruf mengecil untuk nama panjang
        if kab: o += s.tx(x + 54864, y, wk - 54864, H_KEC, [kab], sz=uk(kab, 18), b=True, c=INK, an='ctr', wrap='none')
        o += s.tx(x + wk, y, wc, H_KEC, [kec], sz=uk(kec, 20), c=TEKS, an='ctr', wrap='none')
        for j, vals in enumerate((b, l)):
            xg = xc + j * (3 * sel + 73152)
            for i, v in enumerate(vals):
                f_ = LEVEL[min(v, 3)][1] if v >= 2 else 'F1F2F4'
                o += s.kotak(xg + i * sel + 18288, y + 22860, sel - 36576, H_KEC - 45720, f_, 'roundRect', adj=30000)
        y += H_KEC
    return o


def halaman(dk, L):
    hal = _susun(L); w = (X1 - X0 - (KOL - 1) * GAP) // KOL; hh = L['hari']; N = len(hal)
    def gambar(k):
        o = ''
        for c, isi in enumerate(hal[k]): o += _kolom(dk, L, X0 + c * (w + GAP), w, isi)
        # legenda di dasar halaman
        lx, ly = X0, YL + 45720
        for lab, f_ in (('Awas', MERAH), ('Siaga', ORG), ('Normal atau Waspada', 'F1F2F4')):
            o += dk.kotak(lx, ly + 22860, 182880, 91440, f_, 'roundRect', adj=30000) + dk.tx(lx + 228600, ly, 1600200, 137160, [lab], sz=620, c=TEKS, an='ctr', wrap='none'); lx += 228600 + int(dk.lebar_runs([(lab, TEKS, False)], 620) * 1.15) + 182880
        o += dk.tx(lx, ly, 6400800, 137160, ['Kolom 11, 12, 13 = tanggal November 2026. Provinsi dan kabupaten diurut dari kecamatan terbanyak, kecamatan dari status tertinggi.'], sz=620, c=ABU, an='ctr', wrap='none')
        return o
    P, Q = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
    out = []
    for k in range(N):
        jd = [P('Lampiran: '), Q(f"{f0(L['n_kec'])} kecamatan"), P(f" Siaga atau Awas banjir dan longsor, {hh[0].day} sampai {hh[-1].day} November" + (f' ({k + 1} dari {N})' if N > 1 else ''))]
        out.append((jd, (lambda k=k: gambar(k))))
    return out



def halaman_udara(dk, B):
    """Lampiran kab/kota PM2,5 Tidak Sehat (rata-rata harian > 55,4 ug/m3) 3 hari, per provinsi; nilai per hari, sel berwarna ISPU."""
    hu = B['udara_hari']; per = {}
    for nm, r in B['udara']:
        if max([v for v in r if v is not None] or [0]) <= 55.4: continue
        per.setdefault(B['udara_prov'][nm], []).append((nm, r))
    Pu = sorted(per.items(), key=lambda kv: (-len(kv[1]), kv[0])); n_kab = sum(len(v) for v in per.values())
    baris = []
    for k, ks in Pu:
        baris.append(('prov', k, len(ks)))
        baris += [('kab', nm, r) for nm, r in sorted(ks, key=lambda t: -max(v for v in t[1] if v is not None))]
    tinggi = YL - Y0 - H_KEPALA - 27432; kol, y = [[]], 0
    for b in baris:
        h_ = H_PROV if b[0] == 'prov' else H_KEC
        if y + h_ + (H_KEC if b[0] == 'prov' else 0) > tinggi: kol.append([]); y = 0
        kol[-1].append(b); y += h_
    w = (X1 - X0 - (KOL - 1) * GAP) // KOL
    def warna(v):
        if v is None: return 'F1F2F4', ABU
        return (MERAH, 'FFFFFF') if v > 150.4 else (ORG, 'FFFFFF') if v > 55.4 else ('FBE7D6', TEKS) if v > 15.5 else ('F1F2F4', TEKS)
    def gambar():
        o = ''
        for c, isi in enumerate(kol[:KOL]):
            x = X0 + c * (w + GAP); wk = 1554480; sel = (w - wk - 54864) // 3; xc = x + wk
            o += dk.tx(x + 54864, Y0 + 146304, wk, 137160, ['KAB/KOTA'], sz=560, b=True, c=ABU, spc=40, an='ctr', wrap='none')
            o += dk.tx(xc, Y0, 3 * sel, 155448, ['PM2,5 rata-rata harian (µg/m³)'], sz=600, b=True, c=NAVY, al='ctr', an='ctr', wrap='none')
            for i, d in enumerate(hu): o += dk.tx(xc + i * sel, Y0 + 146304, sel, 137160, [f'{d.day} Nov'], sz=600, c=ABU, al='ctr', an='ctr', wrap='none')
            o += dk.garis(x, Y0 + H_KEPALA - 27432, w, 'BFC5CC'); y = Y0 + H_KEPALA
            for b in isi:
                if b[0] == 'prov':
                    o += dk.kotak(x, y + 27432, w, H_PROV - 45720, T_NAVY, 'roundRect', adj=20000) + dk.tx(x + 73152, y + 27432, w - 146304, H_PROV - 45720, [[(H.NAMA[b[1]], NAVY, True), (f'   {b[2]} kab/kota', ABU, False)]], sz=680, an='ctr', wrap='none')
                    y += H_PROV; continue
                o += dk.tx(x + 54864, y, wk - 54864, H_KEC, [b[1]], sz=600 if len(b[1]) <= 26 else 540, c=INK, an='ctr', wrap='none')
                for i, v in enumerate(b[2]):
                    f_, tc = warna(v)
                    o += dk.kotak(xc + i * sel + 18288, y + 13716, sel - 36576, H_KEC - 27432, f_, 'roundRect', adj=30000) + dk.tx(xc + i * sel, y, sel, H_KEC, [f'{v:.1f}'.replace('.', ',') if v is not None else '–'], sz=560, b=v is not None and v > 55.4, c=tc, al='ctr', an='ctr', wrap='none')
                y += H_KEC
        lx, ly = X0, YL + 45720
        for lab, f_ in (('Sangat tidak sehat, di atas 150,4', MERAH), ('Tidak sehat, 55,5 sampai 150,4', ORG), ('Sedang, 15,6 sampai 55,4', 'FBE7D6')):
            o += dk.kotak(lx, ly + 22860, 182880, 91440, f_, 'roundRect', adj=30000) + dk.tx(lx + 228600, ly, 2286000, 137160, [lab], sz=620, c=TEKS, an='ctr', wrap='none'); lx += 228600 + int(dk.lebar_runs([(lab, TEKS, False)], 620) * 1.15) + 182880
        o += dk.tx(lx, ly, 4572000, 137160, ['Kategori ISPU PM2,5, µg/m³. Kab/kota yang berbagi satu sel model bisa bernilai sama.'], sz=620, c=ABU, an='ctr', wrap='none')
        return o
    P, Q = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
    return [([P('Lampiran: '), Q(f'{n_kab} kab/kota'), P(f' dengan kualitas udara Tidak Sehat, {hu[0].day} sampai {hu[-1].day} November')], gambar)]


def _daftar(dk, grup, kepala, sel_fn, w_nama, judul):
    """Lampiran daftar umum, tiga kolom per halaman. grup = [(judul_grup, ket, [baris])]; sel_fn(dk, x, y, w, baris) menggambar sel kanan;
    kepala = [(label, lebar)] kolom kanan. Kepala grup diulang '(lanjutan)' bila terpotong."""
    tinggi = YL - Y0 - H_KEPALA - 27432; hal, y = [[[]]], 0
    def baru():
        nonlocal y
        y = 0
        if len(hal[-1]) == KOL: hal.append([[]])
        else: hal[-1].append([])
    for g, ket, rows in grup:
        if y and y + H_PROV + 2 * H_KEC > tinggi: baru()
        hal[-1][-1].append(('g', g, ket)); y += H_PROV
        for r in rows:
            if y + H_KEC > tinggi: baru(); hal[-1][-1].append(('g', g, '(lanjutan)')); y += H_PROV
            hal[-1][-1].append(('r', r)); y += H_KEC
    w = (X1 - X0 - (KOL - 1) * GAP) // KOL
    def gambar(k):
        o = ''
        for c, isi in enumerate(hal[k]):
            x = X0 + c * (w + GAP); xr = x + w_nama
            o += dk.tx(x + 54864, Y0 + 146304, w_nama, 137160, [kepala[0]], sz=560, b=True, c=ABU, spc=40, an='ctr', wrap='none')
            xx = xr
            for lab, lw in kepala[1:]: o += dk.tx(xx, Y0 + 146304, lw, 137160, [lab], sz=600, c=ABU, al='ctr', an='ctr', wrap='none'); xx += lw
            o += dk.garis(x, Y0 + H_KEPALA - 27432, w, 'BFC5CC'); y = Y0 + H_KEPALA
            for it in isi:
                if it[0] == 'g':
                    o += dk.kotak(x, y + 27432, w, H_PROV - 45720, T_NAVY, 'roundRect', adj=20000) + dk.tx(x + 73152, y + 27432, w - 146304, H_PROV - 45720, [[(it[1], NAVY, True), ('   ' + it[2], ABU, False)]], sz=680, an='ctr', wrap='none')
                    y += H_PROV; continue
                o += dk.tx(x + 54864, y, w_nama - 54864, H_KEC, [it[1][0]], sz=600 if len(it[1][0]) <= 30 else 540, c=INK, an='ctr', wrap='none') + sel_fn(dk, xr, y, it[1])
                y += H_KEC
        return o
    return [(judul + ([(f' ({k + 1} dari {len(hal)})', INK, True)] if len(hal) > 1 else []), (lambda k=k: gambar(k))) for k in range(len(hal))]


def halaman_fwi(dk, B, FW):
    """Lampiran provinsi dengan FWI tinggi atau sangat tinggi, nilai per hari berwarna kelas FWI."""
    hh = B['fwi_hari']; rows = [(H.NAMA[k], v) for _, k, v in B['fwi'] if max(v) >= FW[2][0]]
    lw = 548640
    def sel(dk, x, y, r):
        o = ''
        for i, v in enumerate(r[1]):
            _x, f_, tc, _l = next(z for z in reversed(FW) if v >= z[0])
            o += dk.kotak(x + i * lw + 18288, y + 13716, lw - 36576, H_KEC - 27432, f_, 'roundRect', adj=30000) + dk.tx(x + i * lw, y, lw, H_KEC, [f'{v:.1f}'.replace('.', ',')], sz=560, b=True, c=tc, al='ctr', an='ctr', wrap='none')
        return o
    st = [r for r in rows if max(r[1]) >= FW[3][0]]; ti = [r for r in rows if max(r[1]) < FW[3][0]]
    grup = [g for g in (('Sangat tinggi', f'{len(st)} provinsi', st), ('Tinggi', f'{len(ti)} provinsi', ti)) if g[2]]
    P, Q = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
    return _daftar(dk, grup, ['PROVINSI'] + [(f'{d.day} Nov', lw) for d in hh], sel, (X1 - X0 - 2 * GAP) // 3 - len(hh) * lw - 18288,
                   [P('Lampiran: '), Q(f'{len(rows)} provinsi'), P(f' bahaya karhutla tinggi atau sangat tinggi (FWI), {hh[0].day} sampai {hh[-1].day} November')])


def halaman_laut(dk, B):
    """Lampiran semua perairan bergelombang sedang ke atas dan pesisir banjir rob BMKG yang masih berlaku."""
    def sd(t): return f'{t.day} Nov'
    lw_l, lw_d = 640080, 548640
    def sel(dk, x, y, r):
        o = ''
        if r[1]:
            tint_ = T_MERAH if r[1] == 'Tinggi' else T_ORG; hl = H_KEC - 27432
            o += dk.kotak(x + 36576, y + 13716, lw_l - 73152, hl, tint_, 'roundRect', adj=50000) + dk.tx(x, y, lw_l, H_KEC, [r[1]], sz=560, b=True, c=r[2], al='ctr', an='ctr', wrap='none')
        return o + dk.tx(x + lw_l, y, lw_d, H_KEC, [f's.d. {sd(r[3])}'], sz=580, c=ABU, al='ctr', an='ctr', wrap='none')
    ge = B['gelombang']; ti = [(n.replace('Perairan ', ''), l, c, d) for n, l, c, d in ge if l != 'Sedang']; se = [(n.replace('Perairan ', ''), l, c, d) for n, l, c, d in ge if l == 'Sedang']
    rw = {}
    for r in B['rob']:
        if r['wilayah'] not in rw or r['tanggal_selesai'] > rw[r['wilayah']]: rw[r['wilayah']] = r['tanggal_selesai']
    rob = [(n.replace('Pesisir ', ''), '', None, dt.date.fromisoformat(t)) for n, t in sorted(rw.items(), key=lambda t: (t[1], t[0]), reverse=True)]
    grup = [g for g in (('Banjir rob (air pasang)', f'{len(rob)} pesisir', rob), ('Gelombang tinggi', f'{len(ti)} perairan', ti), ('Gelombang sedang', f'{len(se)} perairan', se)) if g[2]]
    P, Q = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
    return _daftar(dk, grup, ['PERAIRAN ATAU PESISIR', ('Gelombang', lw_l), ('Berlaku', lw_d)], sel, (X1 - X0 - 2 * GAP) // 3 - lw_l - lw_d - 18288,
                   [P('Lampiran: '), Q(f'{len(ge)} perairan'), P(' bergelombang sedang ke atas dan '), Q(f'{len(rob)} pesisir'), P(' banjir rob BMKG')])
