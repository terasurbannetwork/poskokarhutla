"""Slide Rincian Lokasi (pemilik 20 Nov: "Tambah slide rincian"): satu baris per kejadian yang tampil di slide 1, kolom diambil dari teks WA Koordalops.
Slide 1 menggabung baris per provinsi karena 30 kejadian tidak muat; slide ini menulis semua kab/kota dengan dampak, pengungsi, kerusakan, kondisi, dan tanggal mulai, ditambah peta kab/kota bernomor."""
import datetime as dt, re


def urai_wa(teks):
    """{(jenis, lokasi): {'dampak', 'pengungsi', 'kerusakan', 'kondisi'}} dari blok bernomor WA Koordalops."""
    out = {}
    for m in re.finditer(r'\n\d+\. Bencana Alam (.+?) di (Kab\.|Kota|Prov\.) (.+?) \*?\((?:Kejadian Baru|Pengkinian Data)\)\*?\s*\n(.*?)(?=\n\s*\n|\Z)', teks, re.S):
        jenis_t, awal, nama, isi = m[1], m[2], m[3].strip(), m[4]
        nama = {'Kep. Mentawai': 'Kepulauan Mentawai', 'Lima puluh Kota': 'Lima Puluh Kota'}.get(nama, nama)
        lok = f'Kota {nama}' if awal == 'Kota' else nama
        j = 'banjir' if jenis_t.startswith('Banjir') else 'longsor' if 'Longsor' in jenis_t else 'cuaca' if 'Cuaca' in jenis_t else 'gempabumi' if 'Gempa' in jenis_t else jenis_t.lower()
        f = {}
        for k, kunci in (('dampak', 'Dampak'), ('pengungsi', 'Pengungsi'), ('kerusakan', 'Kerusakan'), ('kondisi', 'Kondisi Mutakhir')):
            mm = re.search(rf'^- {kunci}\s*:\s*(.*)$', isi, re.M); f[k] = mm[1].strip() if mm else ''
        out[(j, lok)] = f
    return out


def bersih(t):
    t = re.sub(r'(?<![\d.,/])(?!(?:19|20)\d\d\b)(\d{1,3})(\d{3})(?![\d.,/])', r'\1.\2', t)   # 1147 -> 1.147 (ejaan angka laporan); tahun 19xx/20xx tidak
    t = re.sub(r'\s+-\s+', '–', t).replace('TMA ', 'tinggi air ')   # "Bayang - Solok", "TMA 30 - 50 cm"
    t = re.sub(r'(?<=\S )(Unit )?Rumah\b', 'rumah', t)   # "15 Unit Rumah Terdampak\"
    t = re.sub(r'\s*\((?:masih )?dalam pendataan\)|\s*\(pendataan\)', '', t, flags=re.I)
    t = re.sub(r'±\s*', '±', t); t = re.sub(r'\s+', ' ', t).strip().rstrip('.').strip()
    if t.lower() in ('', '-', 'nihil'): return '–'
    if re.fullmatch(r'(masih )?dalam pendataan', t, re.I): return 'Pendataan'
    return t[0].upper() + t[1:]


def dampak(t):
    t = bersih(t)
    if t in ('–', 'Pendataan'): return t
    t = re.sub(r'\s*/\s*', ', ', t); t = re.sub(r'\s*terdampak', '', t, flags=re.I); t = t.replace('Jiwa', 'jiwa').replace('jiwa LR', 'jiwa luka ringan')
    return t


def siapkan(teks_wa, timpa=None):
    w = urai_wa(teks_wa); timpa = timpa or {}

    def isi(x):
        j = 'cuaca' if x['jenis'] in ('angin', 'cuaca') else x['jenis']
        f = w.get((j, x['lokasi'])) or w.get((j, x.get('lokasi_asli', x['lokasi'])))
        assert f, ('tidak ada di WA', j, x['lokasi'])
        rusak = re.sub(r'\s+terdampak|\bunit\s+', '', bersih(f['kerusakan']), flags=re.I)   # kolom sudah bernama KERUSAKAN
        rusak = rusak[0].upper() + rusak[1:] if rusak else rusak
        r = {'dampak': dampak(f['dampak']), 'pengungsi': dampak(bersih(f['pengungsi']).replace(' mengungsi', '')), 'kerusakan': rusak, 'kondisi': bersih(f['kondisi'])}
        r.update(timpa.get((j, x['lokasi']), {})); return r
    return isi


URUT_J = {'banjir': 0, 'cuaca': 1, 'angin': 1, 'longsor': 2, 'gempabumi': 3}
# pemilik 20 Nov: kelompok per bencana seperti versi awal (kolom BENCANA), kolom KONDISI MUTAKHIR dihapus; DAMPAK dan KERUSAKAN digabung
# jadi satu kolom pil berlajur tetap (KK, rumah, kerusakan lain), tanpa pengulangan
# pemilik 20 Nov: nomor (= label peta) di kiri nama kab/kota, tanpa kolom NO
# pemilik 20 Nov: DAMPAK khusus pil KK; pil rumah dan kerusakan lain di kolom KERUSAKAN; jarak antarpil dilonggarkan
KOLOM = [('BENCANA', 1010000, 'ctr'), ('PROV.', 550000, 'ctr'), ('KAB/KOTA', 1460000, 'ctr'), ('DAMPAK', 860000, 'ctr'), ('KERUSAKAN', 3700000, 'ctr'), ('MULAI', 580000, 'ctr')]   # kepala rata tengah (pemilik 20 Nov)
IKON_RUSAK = [('sekolah', 'sekolah'), ('jalan', 'jalan'), ('jembatan', 'jembatan'), ('listrik', 'listrik'), ('puskes', 'kesehatan'), ('lahan', 'lahan'), (' ha', 'lahan'),
              ('musala', 'ibadah'), ('ibadah', 'ibadah'), ('dapur', 'dapur'), ('tanggul', 'tanggul'), ('pohon', 'pohon'), ('irigasi', 'air')]   # kata kunci -> ikon; lainnya gedung


ZONA = [('Sumatera bagian utara', ('11', '12', '14', '21')), ('Sumatera bagian selatan', ('13', '15', '16', '17', '18', '19')), ('Jawa', ('31', '32', '33', '34', '35', '36')),
        ('Kalimantan', ('61', '62', '63', '64', '65')), ('Bali dan Nusa Tenggara', ('51', '52', '53')), ('Sulawesi', ('71', '72', '73', '74', '75', '76')),
        ('Maluku dan Papua', ('81', '82', '91', '92', '93', '94', '95', '96'))]
TEPI = 0.45   # derajat ruang label di sekeliling kab/kota terdampak


def kotak_kab(prov, lokasi):
    import json, os
    f = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..', 'public', 'geo', 'kabupaten', f'{prov}.json')
    g = next(x['geometry'] for x in json.load(open(f, encoding='utf-8'))['features'] if x['properties']['kab'] == lokasi)
    cs = [pt for poly in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']) for pt in poly[0]]
    return min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs)


def tata_panel(baris, H, W_pt, H_pt, lebar_judul, gap=6, pita=14):
    """Panel per zona berskala sama (pt per derajat), disusun per baris rak selebar W_pt; skala terbesar yang tingginya muat H_pt.
    Tiap panel = pita judul (pita pt) + peta. Kembalikan (skala, [(judul, bbox, [(no, x)], x_pt, y_pt, w_pt, h_pt)]) relatif pojok kiri atas area peta;
    h_pt termasuk pita judul, bbox sudah dilebarkan bila judul lebih lebar dari petanya."""
    no_ = list(enumerate(baris, 1)); zona = []
    for nm, kode in ZONA:
        isi = [t for t in no_ if t[1]['prov'] in kode]
        if not isi: continue
        k = [kotak_kab(t[1]['prov'], t[1].get('lokasi_asli', t[1]['lokasi'])) for t in isi]
        bb = [min(v[0] for v in k) - TEPI, min(v[1] for v in k) - TEPI, max(v[2] for v in k) + TEPI, max(v[3] for v in k) + TEPI]
        for i0, i1 in ((0, 2), (1, 3)):   # bingkai paling kecil 1,8 derajat
            if bb[i1] - bb[i0] < 1.8: c = (bb[i0] + bb[i1]) / 2; bb[i0], bb[i1] = c - .9, c + .9
        provs = list(dict.fromkeys(t[1]['prov'] for t in isi))
        judul = nm if len(provs) > 2 else ' dan '.join(H.NAMA[k_] for k_ in provs)
        zona.append([judul, bb, isi, lebar_judul(judul) + 12])

    def susun(S):
        rak, cur, cw = [], [], 0
        for z in sorted(zona, key=lambda z: -(z[1][3] - z[1][1])):   # tinggi menurun: rak lebih rapat
            w = max((z[1][2] - z[1][0]) * S, z[3])
            if cur and cw + gap + w > W_pt: rak.append(cur); cur, cw = [], 0
            cur.append((z, w)); cw += (gap if len(cur) > 1 else 0) + w
        if cur: rak.append(cur)
        return rak

    def tinggi(rak, S): return sum(max((z[1][3] - z[1][1]) * S + pita for z, _ in r) for r in rak) + gap * (len(rak) - 1)
    lo, hi = 2.0, 200.0
    for _ in range(40):   # skala terbesar yang muat (lebar tiap rak dan tinggi total)
        S = (lo + hi) / 2; rak = susun(S)
        ok = tinggi(rak, S) <= H_pt and all(w <= W_pt for r in rak for _, w in r)
        lo, hi = (S, hi) if ok else (lo, S)
    S = lo; rak = susun(S); out = []; y = 0
    for r in rak:
        lebar = sum(w for _, w in r) + gap * (len(r) - 1); tambah = (W_pt - lebar) / len(r)   # sisa lebar rak dibagi rata: panel melebar, peta ikut melebar
        hr = max((z[1][3] - z[1][1]) * S + pita for z, _ in r); x = 0
        for z, w in sorted(r, key=lambda zw: min((i for i, (nm, kd) in enumerate(ZONA) if zw[0][2][0][1]['prov'] in kd))):
            w2 = w + tambah; bb = list(z[1]); h2 = hr - pita
            dlon = w2 / S - (bb[2] - bb[0]); bb[0] -= dlon / 2; bb[2] += dlon / 2
            dlat = h2 / S - (bb[3] - bb[1]); bb[1] -= dlat / 2; bb[3] += dlat / 2
            out.append((z[0], bb, z[2], x, y, w2, hr)); x += w2 + gap
        y += hr + gap
    return S, out


def peta(isi_p, ke, nama, bbox, pw, ph, R_px):
    """Render satu panel (peta_kab.mjs); kembalikan isi <nama>.json (titik label px)."""
    import json, os, subprocess
    di = os.path.dirname(os.path.abspath(__file__)); sp = os.path.join(ke, f'{nama}_spek.json')
    json.dump({'ke': ke, 'nama': nama, 'pw': pw, 'ph': ph, 'bbox': bbox, 'R': R_px,
               'lok': [{'no': n, 'prov': x['prov'], 'lokasi': x.get('lokasi_asli', x['lokasi']), 'jenis': x['jenis']} for n, x in isi_p]},
              open(sp, 'w', encoding='utf-8'), ensure_ascii=False)
    subprocess.run(['node', os.path.join(di, 'peta_kab.mjs'), sp], check=True)
    return json.load(open(os.path.join(ke, f'{nama}.json'), encoding='utf-8'))


def gambar(dk, H, isi):
    """Isi slide: peta kab/kota bernomor + ringkasan per jenis di kiri, tabel rincian di kanan (pemilik 20 Nov: "slide 2 tambahin peta ... batas adm kab/kot").
    H = modul generator harian (warna, NAMA, JENIS_LAIN)."""
    import os
    s = dk; X0, W, Y0, YB = 548640, 11094415, 1280160, 5852160   # mesin deck membuang shape yang mulai di bawah ~5,9 juta EMU (zona kaki)
    G = 137160; WM = 3401568;   # 20 Nov: peta dirampingkan supaya tabel tidak sesak (pemilik: "jangan keliatan sesak")
    XT = X0 + WM + G; WT = W - WM - G
    baris = sorted(s.LN, key=lambda x: (URUT_J.get(x['jenis'], 9), int(x['prov'])))
    nama_j = lambda j: 'Cuaca ekstrem' if j in ('cuaca', 'angin') else H.JENIS_LAIN[j][0]
    warna_j = lambda j: H.JENIS_LAIN['angin' if j == 'cuaca' else j][2]
    ikon_j = lambda j: H.JENIS_LAIN['angin' if j == 'cuaca' else j][1] + '_putih'
    sz = 700
    import subprocess
    subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ikon_rusak.mjs'), s.ke], check=True)
    for _, n_ in IKON_RUSAK + [('', 'gedung'), ('', 'rumah')]: s.I['rk_' + n_] = os.path.join(s.ke, 'ik_rusak', n_ + '.png')
    # ---- kiri: peta
    o = s.kotak(X0, Y0, WM, YB - Y0, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500)
    o += s.tx(X0 + 164592, Y0 + 91440, WM - 329184, 182880, ['PETA KAB/KOTA TERDAMPAK'], sz=750, b=True, c=H.NAVY, spc=100)
    # multipanel per zona berskala sama (pemilik 20 Nov, tiru peta paparan banjir sepekan); nomor label = nomor baris tabel; legenda di bawah
    E = 12700; MX, MY, MW = X0 + 91440, Y0 + 338328, WM - 182880; LEG = 228600; MH = YB - 91440 - LEG - MY
    PITA = 14
    S, panel = tata_panel(baris, H, MW / E, MH / E, lambda t: s.lebar_runs([(t, H.ABU, True)], 700) / E, pita=PITA)
    d_no = 150876
    I_SKALA = max(range(len(panel)), key=lambda i: panel[i][5] * E - s.lebar_runs([(panel[i][0], H.ABU, True)], 700))
    for i, (judul_p, bb, isi_p, xp, yp, wp, hp) in enumerate(panel):
        px0, py0, pw_e, ph_e = MX + xp * E, MY + yp * E, wp * E, hp * E
        my0 = py0 + PITA * E; mh_e = ph_e - PITA * E   # peta di bawah pita judul
        pw = int(wp * 6); ph = int((hp - PITA) * 6); k = pw_e / pw; R_px = round(d_no / 2 / k)
        nama_p = f'peta_kab_{i + 1}'; P = peta(isi_p, s.ke, nama_p, bb, pw, ph, R_px)
        s.I[nama_p] = os.path.join(s.ke, nama_p + '.png')
        o += s.kotak(px0, py0, pw_e, ph_e, 'F6F8FA', 'roundRect', ln='D1D5DB', adj=2500) + s.gambar(px0, my0, pw_e, mh_e, nama_p)
        o += s.tx(px0 + 54864, py0, pw_e - 109728, PITA * E, [judul_p], sz=700, b=True, c=H.ABU, an='ctr', wrap='none')
        for t, (n_, x) in zip(P['titik'], isi_p):
            (ax, ay), (qx, qy) = t['asal'], t['p']
            if ((qx - ax) ** 2 + (qy - ay) ** 2) ** .5 > 2:   # garis penunjuk dari pusat kab/kota ke nomor
                o += f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{s.nid()}" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm{" flipH=\"1\"" if (qx < ax) != (qy < ay) else ""}><a:off x="{int(px0 + min(ax, qx) * k)}" y="{int(my0 + min(ay, qy) * k)}"/><a:ext cx="{int(abs(qx - ax) * k)}" cy="{int(abs(qy - ay) * k)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="6350"><a:solidFill><a:srgbClr val="4B5563"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'
                d0 = 36576; o += s.kotak(px0 + ax * k - d0 / 2, my0 + ay * k - d0 / 2, d0, d0, '1F2937', 'ellipse')   # titik pusat kab/kota
            cx, cy = px0 + qx * k - d_no / 2, my0 + qy * k - d_no / 2
            o += s.kotak(cx, cy, d_no, d_no, warna_j(x['jenis']), 'ellipse', ln='FFFFFF', lw=9525) + s.tx(cx - 30000, cy, d_no + 60000, d_no, [str(n_)], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none')
        if i == I_SKALA:   # pemilik 20 Nov ("ini pindahin"): skala 100 km dan arah utara di pita judul panel yang paling longgar (skala sama untuk semua panel), rata kanan
            lb = 100 / 111 * S * E; yc = py0 + PITA * E / 2; tw_ = s.lebar_runs([('100 km', H.NAVY, False)], 700)
            xu = px0 + pw_e - 54864 - 82296; xt = xu - 73152 - tw_; xs = xt - 45720 - lb
            o += s.garis(xs, yc + 18288, lb, H.NAVY, t=15875) + s.tx(xt, py0, tw_ + 18288, PITA * E, ['100 km'], sz=700, c=H.NAVY, an='ctr', wrap='none')
            o += s.kotak(xu, yc - 45720, 82296, 91440, H.NAVY, 'triangle')
    # legenda jenis (pemilik 20 Nov: tabel jenis "hapus aja, ubah jadi legenda")
    jenis = []
    for x in baris:
        if URUT_J.get(x['jenis']) not in [URUT_J.get(j) for j in jenis]: jenis.append(x['jenis'])
    yl = YB - 91440 - LEG + 45720; xl = MX
    for j in jenis:
        d = 128016; t_ = nama_j(j); lw_ = s.lebar_runs([(t_, H.TEKS, False)], 700)
        o += s.kotak(xl, yl + (LEG - 45720 - d) // 2, d, d, warna_j(j), 'ellipse') + s.tx(xl + d + 45720, yl, lw_ + 18288, LEG - 45720, [t_], sz=700, c=H.TEKS, an='ctr', wrap='none')
        xl += d + 45720 + lw_ + 164592
    # ---- kanan: tabel
    o += s.kotak(XT, Y0, WT, YB - Y0, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500)
    o += s.tx(XT + 164592, Y0 + 91440, 4000000, 182880, ['RINCIAN LOKASI KEJADIAN'], sz=750, b=True, c=H.NAVY, spc=100)
    lx = XT + WT - 164592
    for teks_, warna_, tint_ in (('masih berlangsung', H.NAVY, H.T_NAVY), ('kejadian baru', H.ORG, H.T_ORG)):
        lw_ = s.lebar_runs([(teks_, H.TEKS, False)], 700); lx -= lw_
        o += s.tx(lx, Y0 + 91440, lw_ + 9144, 182880, [teks_], sz=700, c=H.TEKS, an='ctr', wrap='none')
        lx -= 128016; o += s.kotak(lx, Y0 + 91440 + 45720, 91440, 91440, tint_, 'roundRect', ln=warna_, lw=9525, adj=20000); lx -= 118872
    XL = XT + 91440; WL = WT - 182880; sk = WL / sum(w for _, w, _ in KOLOM)
    kol, x_ = [], XL
    for t, w, al in KOLOM: kol.append((t, x_, int(w * sk), al)); x_ += int(w * sk)
    yk = Y0 + 338328; o += s.tabel_kepala(XL, yk, kol, h=201168)
    y0 = yk + 201168 + 18288; rp = (YB - 73152 - y0) // max(1, len(baris))
    potong = []

    def muat(teks, w, b=False):
        if s.lebar_runs([(teks, H.TEKS, b)], sz) <= w: return teks
        bag = teks.split(', ')
        for m in range(len(bag) - 1, 0, -1):
            t = ', '.join(bag[:m])
            if s.lebar_runs([(t, H.TEKS, b)], sz) <= w: potong.append(teks); return t
        potong.append(teks); return teks
    import re

    RUSAK = re.compile(r'^(±?[\d.]+ )?(atap )?(rumah )?(rusak )?(ringan|sedang|berat)$', re.I)

    def pecah_dampak(r):
        """(KK, rumah, lain) untuk tiga lajur pil kolom DAMPAK (pemilik 20 Nov: "gabung aja, pastiin pembagian pillnya dan gaada pengulangan",
        "untuk rumah rusak sedang/berat/ringan/dll gabungin aja jadi pill rumah"). KK: angka KK, atau jiwa bila KK tidak ada. Rumah: "N rumah" dari butir
        kerusakan pertama berbentuk angka + rumah; rincian rusak ringan/sedang/berat sesudahnya dibuang (sudah termasuk N). Lain: sisa butir kerusakan."""
        m = re.search(r'±?[\d.]+ KK', r['dampak']) or re.search(r'±?[\d.]+ jiwa', r['dampak'])
        kk = m[0] if m else None
        butir = [] if r['kerusakan'] in ('–', 'Pendataan') else r['kerusakan'].split(', ')
        rumah = None
        if butir:
            mr = re.match(r'^(±?)([\d.]+) rumah\b ?(.*)$', butir[0])
            if mr: rumah = f'{mr[1]}{mr[2]} rumah'; butir = ([mr[3]] if mr[3] else []) + butir[1:]
        butir = [b_ for b_ in butir if not RUSAK.match(b_)]
        lain = ', '.join(butir) or None
        if lain: lain = lain[0].upper() + lain[1:]
        return kk, rumah, lain

    def pil_abu(x_, y_, w_, h_, t_):
        t = s.tx(x_, y_, w_, h_, [t_], sz=sz, c=H.TEKS, al='ctr', an='ctr', wrap='none')
        if t_ == 'Pendataan': t = t.replace('<a:rPr lang="id-ID"', '<a:rPr lang="id-ID" i="1"')   # pemilik 20 Nov: "yang pendataan bikin italic"
        return s.kotak(x_, y_, w_, h_, 'E6EAF0', 'roundRect', adj=50000) + t
    GP = 91440; W2 = 822960   # celah tepi kolom; lebar pil – atau Pendataan di kolom KERUSAKAN
    hp = min(100584, rp - 27432)
    BUTIR = []
    for x in baris:
        _, rumah, lain = pecah_dampak(isi(x)); r_ = isi(x); b_ = [('rumah', rumah)] if rumah else []
        for t_ in (lain.split(', ') if lain else []):
            t_ = t_[0].upper() + t_[1:]; b_.append((next((v_ for k_, v_ in IKON_RUSAK if k_ in t_.lower()), 'gedung'), t_))
        BUTIR.append(b_ or [(None, 'Pendataan' if r_['kerusakan'] == 'Pendataan' else '–')])
    # pemilik 20 Nov: pil fleksibel (1/n kolom) dicoba lalu dibatalkan ("tetep kyk gitu aja"): kisi slot seragam di tengah kolom
    GS = 73152; NS = max(len(b_) for b_ in BUTIR)
    SLOT = int(max(s.lebar_runs([(t_, H.TEKS, False)], 700) for b_ in BUTIR for _, t_ in b_) + hp * .95 + 109728)
    KW = NS * SLOT + (NS - 1) * GS
    if KW > kol[4][2] - 2 * 54864: potong.append(f'kisi kerusakan {KW} > kolom {kol[4][2]}')
    KX0 = kol[4][1] + (kol[4][2] - KW) / 2
    for n, x in enumerate(baris):
        y = y0 + n * rp; sbl = baris[n - 1] if n else None
        jb = n == 0 or URUT_J.get(sbl['jenis']) != URUT_J.get(x['jenis']); pb = jb or sbl['prov'] != x['prov']
        if n: o += s.garis(XL, y, WL, '9AA5B1') if jb else s.garis(kol[1][1], y, WL - (kol[1][1] - XL), 'D1D5DB') if pb else s.garis(kol[2][1], y, WL - (kol[2][1] - XL), 'F1F2F4')
        if n % 2: o += s.kotak(kol[2][1], y + 4572, WL - (kol[2][1] - XL), rp - 9144, 'F8F9FB')
        if jb:   # nama bencana sekali per kelompok, di tengah rentangnya, berikon dalam bulatan warna jenis
            m = n
            while m < len(baris) and URUT_J.get(baris[m]['jenis']) == URUT_J.get(x['jenis']): m += 1
            tb = (m - n) * rp; d = 164592
            o += s.kotak(kol[0][1] + 54864, y + (tb - d) // 2, d, d, warna_j(x['jenis']), 'ellipse')
            o += s.gambar(kol[0][1] + 54864 + d * .18, y + (tb - d) // 2 + d * .18, d * .64, d * .64, ikon_j(x['jenis']))
            o += s.tx(kol[0][1] + 54864 + d + 45720, y, kol[0][2] - d - 128016, tb, [nama_j(x['jenis'])], sz=720, b=True, c=H.INK, an='ctr', wrap='none')
        if pb:
            m = n
            while m < len(baris) and URUT_J.get(baris[m]['jenis']) == URUT_J.get(x['jenis']) and baris[m]['prov'] == x['prov']: m += 1
            pv = H.AKRONIM.get(H.PENDEK(x['prov']), H.PENDEK(x['prov']))
            o += s.tx(kol[1][1] + 54864, y, kol[1][2] - 54864, (m - n) * rp, [pv], sz=sz, b=True, c=H.INK, an='ctr', wrap='none')
        lok = x.get('lokasi_asli', x['lokasi']); lok = lok if lok.startswith('Kota ') else f'Kab. {lok}'
        r = isi(x)
        d = min(140208, rp - 9144); xn = kol[2][1] + 54864   # bulatan nomor berwarna jenis di kiri nama kab/kota
        o += s.kotak(xn, y + (rp - d) / 2, d, d, warna_j(x['jenis']), 'ellipse') + s.tx(xn - 30000, y, d + 60000, rp, [str(n + 1)], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none')
        v = muat(lok, kol[2][2] - 109728 - d - 54864)
        o += s.tx(xn + d + 54864, y, kol[2][2] - d - 109728, rp, [v], sz=sz, c=H.TEKS, an='ctr', wrap='none')
        hp = min(100584, rp - 27432); yp = y + (rp - hp) // 2   # pil lebih pendek dari baris: ada jarak antarbaris
        kk, rumah, lain = pecah_dampak(r)
        # pemilik 20 Nov ("pendataan pake pill", "yang gaada pake pill isinya -", "pendataan juga bikin pill"): KK dan rumah selalu pil
        xd = kol[3][1] + 45720; wp_ = kol[3][2] - 2 * 45720   # DAMPAK: pil KK selebar kolom dikurangi celah kiri-kanan
        if kk: o += s.pil(xd, yp, kk, H.T_NAVY, H.NAVY, 'orang_navy', sz=620, h=hp, w=wp_)[0]
        else: o += pil_abu(xd, yp, wp_, hp, 'Pendataan' if r['dampak'] == 'Pendataan' else '–')
        # KERUSAKAN (pemilik 20 Nov: "yang rumah gausah dibedain", "masih berantakan, coba bagusin"): semua pil satu gaya (abu, ikon, tidak tebal),
        # selebar slot kisi yang sama untuk semua baris, kisi di tengah kolom, pil mengisi slot dari kiri supaya sejajar ke bawah
        pil_ = BUTIR[n]
        for k_, (ik_, t_) in enumerate(pil_):
            xs_ = KX0 + k_ * (SLOT + GS)
            if ik_: o += s.pil(xs_, yp, t_, 'E6EAF0', H.TEKS, 'rk_' + ik_, sz=620, h=hp, w=SLOT, b=False)[0]
            else: o += pil_abu(xs_, yp, SLOT, hp, t_)
        dmu = __import__('datetime').date.fromisoformat(x['mulai']); tmu = f"{dmu.day} {H.BULAN[dmu.month - 1][:3]}"
        tint_, warna_, ik_ = (H.T_ORG, H.ORG, 'kalender_oranye') if x.get('baru') else (H.T_NAVY, H.NAVY, 'kalender_navy')
        lp = 100000 + len(tmu) * 700 * 59 + hp * .9
        o += s.pil(kol[5][1] + (kol[5][2] - lp) / 2, y + (rp - hp) // 2, tmu, tint_, warna_, ik_, sz=620, h=hp, w=lp)[0]
    print('rincian: baris', len(baris), 'tinggi', rp, '| dipotong:', potong)
    return o
