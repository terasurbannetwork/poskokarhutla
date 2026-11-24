"""Slide Rincian Lokasi Kejadian untuk Laporan Kejadian Bencana Harian (pemilik 20 Nov 2026, laporan 31 kejadian: "Tambah slide rincian",
lalu "pembuatan laporan hari ini dipelajari juga untuk bot wa"). Dipakai harian_ringkas.py (bot WA, --rincian ya) dan jalan.py manual.

Isi slide (bentuk akhir laporan 201126 Revisi 29):
- kiri: peta multipanel per zona berskala sama (tiru peta paparan banjir sepekan), batas kab/kota, kab/kota terdampak diwarnai warna jenis,
  nomor label = nomor baris tabel di luar wilayah dengan titik dan garis penunjuk; legenda jenis; skala 100 km dan arah utara di pita judul
  panel yang paling longgar;
- kanan: tabel BENCANA (dikelompokkan, berikon) | PROV. | KAB/KOTA (bulatan nomor di kiri nama) | DAMPAK (pil KK saja; "Pendataan" miring atau
  "–") | KERUSAKAN (pil abu berikon dalam kisi slot seragam di tengah kolom: rumah dijumlah termasuk rusak ringan/sedang/berat, lalu sarana lain
  dengan nama baku dan jumlah dijumlahkan; "–"/"Pendataan" hanya bila kerusakan tanpa data sama sekali) | MULAI (oranye baru, navy berlangsung).
Kerusakan diringkas aturan di bawah (pemilik: "yg kyk gini2 langsung aja sekolah, jalan, dll", "fasum"), bukan diketik tangan.
"""
import json, os, re, subprocess

G = os.path.dirname(os.path.abspath(__file__))
GEO = os.path.normpath(os.path.join(G, '..', '..', '..', 'public', 'geo'))
URUT_J = {'banjir': 0, 'cuaca': 1, 'angin': 1, 'longsor': 2, 'gempabumi': 3}
KOLOM = [('BENCANA', 1010000), ('PROV.', 550000), ('KAB/KOTA', 1460000), ('DAMPAK', 860000), ('KERUSAKAN', 3700000), ('MULAI', 580000)]   # kepala rata tengah
JUDUL_PANEL = 'RINCIAN LOKASI KEJADIAN'   # penanda halaman untuk pemanggil
ZONA = [('Sumatera bagian utara', ('11', '12', '14', '21')), ('Sumatera bagian selatan', ('13', '15', '16', '17', '18', '19')), ('Jawa', ('31', '32', '33', '34', '35', '36')),
        ('Kalimantan', ('61', '62', '63', '64', '65')), ('Bali dan Nusa Tenggara', ('51', '52', '53')), ('Sulawesi', ('71', '72', '73', '74', '75', '76')),
        ('Maluku dan Papua', ('81', '82', '91', '92', '93', '94', '95', '96'))]
TEPI = 0.45   # derajat ruang label di sekeliling kab/kota terdampak

# kerusakan: (pola, kunci, label, ikon); urutan = prioritas pil bila tidak muat. Pola dicocokkan per butir (dipisah koma), yang pertama cocok menang:
# dapur, faskes, sekolah, ibadah sebelum rumah ("rumah dapur MBG", "rumah sakit", "fasdik RS", "rumah ibadah"), lahan ber-ha sebelum lahan tanpa angka.
KANON = [(r'dapur', 'dapur', 'dapur', 'dapur'), (r'puskesdes|puskesmas|pustu|polindes|posyandu|faskes|kesehatan|rumah sakit|klinik', 'faskes', 'faskes', 'kesehatan'),
         (r'fasdik|sekolah|\bsmk\b|\bsma\b|\bsmp\b|\bsd\b|\bmi\b|\bmts\b|madrasah|pesantren|paud|\btk\b', 'sekolah', 'sekolah', 'sekolah'),
         (r'mushol+a|musala|masjid|ibadah|gereja|\bpura\b|vihara|surau', 'ibadah', 'tempat ibadah', 'ibadah'),
         (r'rumah|\brr\b|\brs\b|\brb\b', 'rumah', 'rumah', 'rumah'), (r'jembatan', 'jembatan', 'jembatan', 'jembatan'),
         (r'jalan|jalur|\bruas\b', 'jalan', 'jalan', 'jalan'), (r'(\d[\d.,]*)\s*(ha|hektar\w*)\b', 'ha', 'ha', 'lahan'), (r'lahan|sawah|kebun|pertanian|tambak', 'lahan', 'lahan', 'lahan'),
         (r'tanggul', 'tanggul', 'tanggul', 'tanggul'), (r'irigasi|saluran', 'irigasi', 'irigasi', 'air'), (r'listrik|\bpln\b', 'listrik', 'listrik', 'listrik'),
         (r'fasum|fasilitas umum', 'fasum', 'fasum', 'gedung'), (r'kantor', 'kantor', 'kantor', 'gedung'), (r'pasar', 'pasar', 'pasar', 'gedung'),
         (r'pohon', 'pohon', 'pohon', 'pohon')]
PRIORITAS = ['rumah', 'sekolah', 'faskes', 'ibadah', 'jembatan', 'jalan', 'ha', 'lahan', 'tanggul', 'irigasi', 'listrik', 'fasum', 'kantor', 'pasar', 'dapur', 'pohon']
IKON = sorted({k[3] for k in KANON} | {'gedung'})


def f0(v): return f'{v:,.0f}'.replace(',', '.') if float(v).is_integer() else f'{v:,.1f}'.replace(',', '#').replace('.', ',').replace('#', '.')


def angka(t):
    """Angka pertama butir: '± 3.517' -> 3517, '494,5' -> 494.5; None bila tidak ada."""
    m = re.search(r'(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?', t)
    if not m: return None
    return float(m[1].replace('.', '') + ('.' + m[2] if m[2] else ''))


def urai_wa(teks):
    """{(jenis, lokasi huruf kecil): {'dampak', 'kerusakan'}} dari blok bernomor WA Koordalops (teks sesudah wa_normal)."""
    out = {}
    for m in re.finditer(r'\n\d+\.\s+(?:Bencana Alam\s+)?(.+?) di (Kab\.|Kota|Prov\.)\s*(.+?)\s*\*?\((?:Kejadian Baru|Pengkinian Data|Update)\)\*?\s*\n(.*?)(?=\n\s*\n|\Z)', teks, re.S | re.I):
        jenis_t, awal, nama, isi = m[1], m[2], m[3].strip(), m[4]
        lok = kunci_lok(f'Kota {nama}' if awal.lower() == 'kota' else nama)
        jt = jenis_t.lower()
        j = 'banjir' if jt.startswith('banjir') else 'longsor' if 'longsor' in jt else 'cuaca' if ('cuaca' in jt or 'angin' in jt) else 'gempabumi' if 'gempa' in jt else jt
        f = {}
        for k, kunci in (('dampak', 'Dampak'), ('kerusakan', 'Kerusakan')):
            mm = re.search(rf'^-\s*{kunci}\s*:\s*(.*)$', isi, re.M | re.I); f[k] = mm[1].strip() if mm else ''
        out[(j, lok)] = f
    return out


def kunci_lok(t):
    """Kunci pencocokan nama kab/kota: huruf kecil, "Kep." = "Kepulauan", "Kota." = "Kota", spasi tunggal."""
    return re.sub(r'\s+', ' ', re.sub(r'^kep\.\s*', 'kepulauan ', re.sub(r'^kota\.\s*', 'kota ', t.strip().lower())))


def pendataan(t): return bool(re.search(r'pendataan', t, re.I)) and not re.search(r'\d', re.sub(r'\(.*?\)', '', t))


def kosong(t): return re.sub(r'[\s.\-–]', '', t).lower() in ('', 'nihil', 'tidakada')


def dampak_kk(t):
    """Pil DAMPAK: 'N KK' (± dipertahankan), atau 'N jiwa' bila KK tidak ada; 'Pendataan'; '–' (pemilik 20 Nov: "kalo udah ada KK, gausah pake jiwa")."""
    m = re.search(r'(±\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*KK\b', t, re.I) or re.search(r'(±\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*jiwa', t, re.I)
    if m: return f"{'±' if m[1] else ''}{f0(angka(m[2]))} {'KK' if 'kk' in m[0].lower() else 'jiwa'}"
    return 'Pendataan' if pendataan(t) else '–'


def butir_kerusakan(t):
    """[(ikon, label)] kerusakan, urut PRIORITAS; [] bila tanpa data. Rumah dijumlah (RR/RS/RB/terdampak/terendam), sarana lain nama baku
    dengan jumlah dijumlahkan; butir tanpa angka cukup namanya ('Jalan'). Butir yang tidak dikenal ditulis apa adanya (dibersihkan, dipendekkan)."""
    t = re.sub(r'\((?:masih\s+)?(?:dalam\s+)?pendataan\)', '', t, flags=re.I)
    jum, tanpa, pm, lain = {}, set(), set(), []
    for b in re.split(r'(?<!\d),|,(?!\d)|;|\bdan\b(?=\s*\d)', t):   # koma di antara dua angka ("494,5 ha") desimal; "RR,1 unit" tetap dipisah
        b = b.strip(' .')
        if not b or kosong(b) or pendataan(b): continue
        bl = b.lower()
        for pola, kunci, label, ikon in KANON:
            mm = re.search(pola, bl)
            if not mm: continue
            n = angka(mm[1]) if kunci == 'ha' else angka(b)
            if n is None: tanpa.add(kunci)
            else: jum[kunci] = jum.get(kunci, 0) + n
            if kunci == 'ibadah':   # nama aslinya, pendek ("Musala"), bukan "tempat ibadah" yang melebarkan semua slot kisi
                ib_ = re.search(r'mushol+a|musala|masjid|gereja|pura|vihara|surau', bl); jum.setdefault('_ibadah', 'musala' if ib_ and ib_[0].startswith('mushol') else ib_[0] if ib_ else 'ibadah')
            if '±' in b: pm.add(kunci)
            if kunci == 'dapur' and 'mbg' in bl: jum.setdefault('_mbg', 1)
            break
        else:
            bb = re.sub(r'\b(unit|terdampak|rusak|roboh|amblas|jebol|tergerus|banjir)\b|±', '', b, flags=re.I)
            bb = re.sub(r'\s+', ' ', bb).strip(' .-')
            if len(bb) > 22: bb = bb[:22].rsplit(' ', 1)[0]   # dipotong di batas kata
            if bb: lain.append(bb[0].upper() + bb[1:])
    out = []
    for kunci in PRIORITAS:
        if kunci not in jum and kunci not in tanpa: continue
        pola, _, label, ikon = next(k for k in KANON if k[1] == kunci)
        if kunci == 'dapur' and '_mbg' in jum: label = 'dapur MBG'
        if kunci == 'ibadah': label = jum.get('_ibadah', 'ibadah')
        if kunci in jum:
            teks_ = f"{'±' if kunci in pm else ''}{f0(jum[kunci])} {label}"
        else:
            teks_ = label[0].upper() + label[1:]
        out.append((ikon, teks_))
    return out + [('gedung', x) for x in lain]


def kotak_kab(prov, lokasi):
    g = next(x['geometry'] for x in json.load(open(os.path.join(GEO, 'kabupaten', f'{prov}.json'), encoding='utf-8'))['features'] if x['properties']['kab'] == lokasi)
    cs = [pt for poly in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']) for pt in poly[0]]
    return min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs)


def tata_panel(baris, H, W_pt, H_pt, lebar_judul, gap=6, pita=14):
    """Panel per zona berskala sama (pt per derajat), disusun per baris rak selebar W_pt; skala terbesar yang tingginya muat H_pt.
    Kembalikan (skala, [(judul, bbox, [(no, x)], x_pt, y_pt, w_pt, h_pt)]) relatif pojok kiri atas area peta; h_pt termasuk pita judul."""
    no_ = [t for t in enumerate(baris, 1) if not t[1].get('_tanpa_peta')]; zona = []
    for nm, kode in ZONA:
        isi = [t for t in no_ if t[1]['prov'] in kode]
        if not isi: continue
        k = [kotak_kab(t[1]['prov'], lok_asli(t[1])) for t in isi]
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
    for _ in range(40):
        S = (lo + hi) / 2; rak = susun(S)
        ok = tinggi(rak, S) <= H_pt and all(w <= W_pt for r in rak for _, w in r)
        lo, hi = (S, hi) if ok else (lo, S)
    S = lo; rak = susun(S); out = []; y = 0
    for r in rak:
        lebar = sum(w for _, w in r) + gap * (len(r) - 1); tambah = (W_pt - lebar) / len(r)
        hr = max((z[1][3] - z[1][1]) * S + pita for z, _ in r); x = 0
        for z, w in sorted(r, key=lambda zw: min(i for i, (nm, kd) in enumerate(ZONA) if zw[0][2][0][1]['prov'] in kd)):   # utara ke selatan, barat ke timur
            w2 = w + tambah; bb = list(z[1]); h2 = hr - pita
            dlon = w2 / S - (bb[2] - bb[0]); bb[0] -= dlon / 2; bb[2] += dlon / 2
            dlat = h2 / S - (bb[3] - bb[1]); bb[1] -= dlat / 2; bb[3] += dlat / 2
            out.append((z[0], bb, z[2], x, y, w2, hr)); x += w2 + gap
        y += hr + gap
    return S, out


def lok_asli(x): return x.get('lokasi_asli') or x['lokasi']


def peta(isi_p, ke, nama, bbox, pw, ph, R_px):
    sp = os.path.join(ke, f'{nama}_spek.json')
    json.dump({'ke': ke, 'nama': nama, 'pw': pw, 'ph': ph, 'bbox': bbox, 'R': R_px,
               'lok': [{'no': n, 'prov': x['prov'], 'lokasi': lok_asli(x), 'jenis': x['jenis']} for n, x in isi_p]}, open(sp, 'w', encoding='utf-8'), ensure_ascii=False)
    subprocess.run(['node', os.path.join(G, 'harian_rincian_peta.mjs'), sp], check=True, stdout=subprocess.DEVNULL)
    return json.load(open(os.path.join(ke, f'{nama}.json'), encoding='utf-8'))


def siapkan(kej, teks_koordalops):
    """{id(x): {'dampak': pil KK, 'rusak': [(ikon, label)], 'rusak_kosong': 'Pendataan'|'–'}} untuk tiap kejadian; galat bila kejadian tidak ada di WA."""
    w = urai_wa(teks_koordalops); out = {}
    for x in kej:
        j = 'cuaca' if x['jenis'] in ('angin', 'cuaca') else x['jenis']
        lk = kunci_lok(lok_asli(x)); f = w.get((j, lk))
        if f is None:   # jenis WA yang tidak dikenal urai_wa (erupsi, rob, salah ketik): cocokkan lokasi saja bila hanya satu kejadian di lokasi itu
            cocok = [v for (j_, l_), v in w.items() if l_ == lk]
            f = cocok[0] if len(cocok) == 1 else None
        if f is None:
            print(f'PERINGATAN rincian: {j} {lok_asli(x)} tidak ditemukan di WA Koordalops; dampak dari angka WA, kerusakan kosong')
            kk = (x.get('angka') or {}).get('kk'); f = {'dampak': f'{f0(kk)} KK' if kk else '', 'kerusakan': ''}
        out[id(x)] = {'dampak': dampak_kk(f['dampak']), 'rusak': butir_kerusakan(f['kerusakan']),
                      'rusak_kosong': 'Pendataan' if pendataan(f['kerusakan']) or (kosong(f['kerusakan']) and pendataan(f['dampak'])) else '–'}
    return out


def judul(H, kej):
    nk, nkab, npv = len(kej), len({(x['prov'], lok_asli(x)) for x in kej}), len({x['prov'] for x in kej})
    return [('Rincian lokasi: ', H.INK, True), (f'{nk} kejadian', H.ORG, True), (' di ', H.INK, True), (f'{nkab} kab/kota', H.ORG, True),
            (' dan ', H.INK, True), (f'{npv} provinsi', H.ORG, True)]


def nama_geo(prov, lok):
    """Nama kab/kota di public/geo/kabupaten/<prov>.json untuk nama WA ("Kep. Mentawai", "Lima puluh Kota", "Kota. Bengkulu")."""
    fitur = [f['properties']['kab'] for f in json.load(open(os.path.join(GEO, 'kabupaten', f'{prov}.json'), encoding='utf-8'))['features']]
    kunci = lambda t: re.sub(r'\s+', ' ', re.sub(r'^Kep\.\s*', 'Kepulauan ', re.sub(r'^Kota\.\s*', 'Kota ', t.strip()))).lower()
    cocok = [f for f in fitur if kunci(f) == kunci(lok)]
    if not cocok: raise ValueError(f'rincian: kab/kota {lok!r} tidak ada di batas wilayah provinsi {prov}')
    return cocok[0]


def pasang(dk, H, teks_koordalops):
    """Tambahkan slide rincian ke dk.HAL_TAMBAH (dibangun sesudah status siaga; pemanggil mengatur urutan lewat susun lewat_deck)."""
    for x in dk.LN:
        try: x['lokasi_asli'] = nama_geo(x['prov'], lok_asli(x)); x.pop('_tanpa_peta', None)
        except ValueError as e: print('PERINGATAN', e, '(tanpa penanda peta)'); x['_tanpa_peta'] = True
    isi = siapkan(dk.LN, teks_koordalops)
    dk.HAL_TAMBAH = list(getattr(dk, 'HAL_TAMBAH', None) or []) + [(judul(H, dk.LN), lambda: gambar(dk, H, isi))]


def gambar(dk, H, isi):
    s = dk; X0, W, Y0, YB = 548640, 11094415, 1280160, 5852160   # mesin deck membuang shape yang mulai di bawah ~5,9 juta EMU (zona kaki)
    G_ = 137160; WM = 3401568; XT = X0 + WM + G_; WT = W - WM - G_   # peta dirampingkan supaya tabel tidak sesak
    baris = sorted(s.LN, key=lambda x: (URUT_J.get(x['jenis'], 9), int(x['prov'])))
    jl = lambda j: 'angin' if j == 'cuaca' else j
    nama_j = lambda j: 'Cuaca ekstrem' if j in ('cuaca', 'angin') else H.JENIS_LAIN[j][0]
    warna_j = lambda j: H.JENIS_LAIN[jl(j)][2]
    ikon_j = lambda j: H.JENIS_LAIN[jl(j)][1] + '_putih'
    sz, E = 700, 12700
    subprocess.run(['node', os.path.join(G, 'harian_rincian_ikon.mjs'), s.ke], check=True, stdout=subprocess.DEVNULL)
    for n_ in IKON: s.I['rk_' + n_] = os.path.join(s.ke, 'ik_rusak', n_ + '.png')
    # ---- kiri: peta multipanel
    o = s.kotak(X0, Y0, WM, YB - Y0, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500)
    o += s.tx(X0 + 164592, Y0 + 91440, WM - 329184, 182880, ['PETA KAB/KOTA TERDAMPAK'], sz=750, b=True, c=H.NAVY, spc=100)
    MX, MY, MW = X0 + 91440, Y0 + 338328, WM - 182880; LEG = 228600; MH = YB - 91440 - LEG - MY; PITA = 14
    S, panel = tata_panel(baris, H, MW / E, MH / E, lambda t: s.lebar_runs([(t, H.ABU, True)], 700) / E, pita=PITA)
    d_no = 150876
    i_skala = max(range(len(panel)), key=lambda i: panel[i][5] * E - s.lebar_runs([(panel[i][0], H.ABU, True)], 700))
    for i, (judul_p, bb, isi_p, xp, yp, wp, hp) in enumerate(panel):
        px0, py0, pw_e, ph_e = MX + xp * E, MY + yp * E, wp * E, hp * E
        my0, mh_e = py0 + PITA * E, ph_e - PITA * E
        pw, ph = int(wp * 6), int((hp - PITA) * 6); k = pw_e / pw; R_px = round(d_no / 2 / k)
        nama_p = f'peta_kab_{i + 1}'; P = peta(isi_p, s.ke, nama_p, bb, pw, ph, R_px)
        s.I[nama_p] = os.path.join(s.ke, nama_p + '.png')
        o += s.kotak(px0, py0, pw_e, ph_e, 'F6F8FA', 'roundRect', ln='D1D5DB', adj=2500) + s.gambar(px0, my0, pw_e, mh_e, nama_p)
        o += s.tx(px0 + 54864, py0, pw_e - 109728, PITA * E, [judul_p], sz=700, b=True, c=H.ABU, an='ctr', wrap='none')
        for t, (n_, x) in zip(P['titik'], isi_p):
            (ax, ay), (qx, qy) = t['asal'], t['p']
            if ((qx - ax) ** 2 + (qy - ay) ** 2) ** .5 > 2:   # garis penunjuk dari pusat kab/kota ke nomor
                o += (f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{s.nid()}" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm{" flipH=\"1\"" if (qx < ax) != (qy < ay) else ""}>'
                      f'<a:off x="{int(px0 + min(ax, qx) * k)}" y="{int(my0 + min(ay, qy) * k)}"/><a:ext cx="{int(abs(qx - ax) * k)}" cy="{int(abs(qy - ay) * k)}"/></a:xfrm>'
                      '<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="6350"><a:solidFill><a:srgbClr val="4B5563"/></a:solidFill></a:ln></p:spPr></p:cxnSp>')
                d0 = 36576; o += s.kotak(px0 + ax * k - d0 / 2, my0 + ay * k - d0 / 2, d0, d0, '1F2937', 'ellipse')
            cx, cy = px0 + qx * k - d_no / 2, my0 + qy * k - d_no / 2
            o += s.kotak(cx, cy, d_no, d_no, warna_j(x['jenis']), 'ellipse', ln='FFFFFF', lw=9525) + s.tx(cx - 30000, cy, d_no + 60000, d_no, [str(n_)], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none')
        if i == i_skala:   # skala 100 km dan arah utara di pita judul (skala sama untuk semua panel), rata kanan
            lb = 100 / 111 * S * E; yc = py0 + PITA * E / 2; tw_ = s.lebar_runs([('100 km', H.NAVY, False)], 700)
            xu = px0 + pw_e - 54864 - 82296; xt = xu - 73152 - tw_; xs = xt - 45720 - lb
            o += s.garis(xs, yc + 18288, lb, H.NAVY, t=15875) + s.tx(xt, py0, tw_ + 18288, PITA * E, ['100 km'], sz=700, c=H.NAVY, an='ctr', wrap='none')
            o += s.kotak(xu, yc - 45720, 82296, 91440, H.NAVY, 'triangle')
    jenis = []
    for x in baris:
        if URUT_J.get(x['jenis']) not in [URUT_J.get(j) for j in jenis]: jenis.append(x['jenis'])
    yl = YB - 91440 - LEG + 45720; xl = MX
    for j in jenis:   # legenda jenis
        d = 128016; t_ = nama_j(j); lw_ = s.lebar_runs([(t_, H.TEKS, False)], 700)
        o += s.kotak(xl, yl + (LEG - 45720 - d) // 2, d, d, warna_j(j), 'ellipse') + s.tx(xl + d + 45720, yl, lw_ + 18288, LEG - 45720, [t_], sz=700, c=H.TEKS, an='ctr', wrap='none')
        xl += d + 45720 + lw_ + 164592
    # ---- kanan: tabel
    o += s.kotak(XT, Y0, WT, YB - Y0, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500)
    o += s.tx(XT + 164592, Y0 + 91440, 4000000, 182880, [JUDUL_PANEL], sz=750, b=True, c=H.NAVY, spc=100)
    lx = XT + WT - 164592
    for teks_, warna_, tint_ in (('masih berlangsung', H.NAVY, H.T_NAVY), ('kejadian baru', H.ORG, H.T_ORG)):
        lw_ = s.lebar_runs([(teks_, H.TEKS, False)], 700); lx -= lw_
        o += s.tx(lx, Y0 + 91440, lw_ + 9144, 182880, [teks_], sz=700, c=H.TEKS, an='ctr', wrap='none')
        lx -= 128016; o += s.kotak(lx, Y0 + 91440 + 45720, 91440, 91440, tint_, 'roundRect', ln=warna_, lw=9525, adj=20000); lx -= 118872
    XL = XT + 91440; WL = WT - 182880; sk = WL / sum(w for _, w in KOLOM)
    kol, x_ = [], XL
    for t, w in KOLOM: kol.append((t, x_, int(w * sk), 'ctr')); x_ += int(w * sk)
    yk = Y0 + 338328; o += s.tabel_kepala(XL, yk, kol, h=201168)
    y0 = yk + 201168 + 18288; rp = (YB - 73152 - y0) // max(1, len(baris)); hp = min(100584, rp - 27432)
    potong = []

    def pil_abu(x_, y_, w_, h_, t_):
        t = s.tx(x_, y_, w_, h_, [t_], sz=sz, c=H.TEKS, al='ctr', an='ctr', wrap='none')
        if t_ == 'Pendataan': t = t.replace('<a:rPr lang="id-ID"', '<a:rPr lang="id-ID" i="1"')   # pemilik 20 Nov: "yang pendataan bikin italic"
        return s.kotak(x_, y_, w_, h_, 'E6EAF0', 'roundRect', adj=50000) + t
    # kisi KERUSAKAN: slot seragam selebar pil terlebar, sebanyak yang muat kolom (paling banyak 4); butir di luar slot dibuang menurut PRIORITAS
    GS = 73152
    semua = [isi[id(x)]['rusak'] for x in baris]
    SLOT = int(max([s.lebar_runs([(t_, H.TEKS, False)], 700) for b_ in semua for _, t_ in b_] + [s.lebar_runs([('Pendataan', H.TEKS, False)], 700)]) + hp * .95 + 109728)
    NS = max(1, min(4, (kol[4][2] - 2 * 54864 + GS) // (SLOT + GS), max(len(b_) for b_ in semua) or 1))
    KX0 = kol[4][1] + (kol[4][2] - (NS * SLOT + (NS - 1) * GS)) / 2
    for n, x in enumerate(baris):
        y = y0 + n * rp; sbl = baris[n - 1] if n else None
        jb = n == 0 or URUT_J.get(sbl['jenis']) != URUT_J.get(x['jenis']); pb = jb or sbl['prov'] != x['prov']
        if n: o += s.garis(XL, y, WL, '9AA5B1') if jb else s.garis(kol[1][1], y, WL - (kol[1][1] - XL), 'D1D5DB') if pb else s.garis(kol[2][1], y, WL - (kol[2][1] - XL), 'F1F2F4')
        if n % 2: o += s.kotak(kol[2][1], y + 4572, WL - (kol[2][1] - XL), rp - 9144, 'F8F9FB')
        if jb:   # nama bencana sekali per kelompok, di tengah rentangnya
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
        lok = lok_asli(x); lok = lok if lok.startswith('Kota ') else f'Kab. {lok}'
        d = min(140208, rp - 9144); xn = kol[2][1] + 54864   # bulatan nomor (= label peta) di kiri nama kab/kota
        o += s.kotak(xn, y + (rp - d) / 2, d, d, warna_j(x['jenis']), 'ellipse') + s.tx(xn - 30000, y, d + 60000, rp, [str(n + 1)], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none')
        if s.lebar_runs([(lok, H.TEKS, False)], sz) > kol[2][2] - 109728 - d - 54864: potong.append(lok)
        o += s.tx(xn + d + 54864, y, kol[2][2] - d - 109728, rp, [lok], sz=sz, c=H.TEKS, an='ctr', wrap='none')
        yp = y + (rp - hp) // 2; r = isi[id(x)]
        xd = kol[3][1] + 45720; wp_ = kol[3][2] - 2 * 45720
        if r['dampak'] not in ('Pendataan', '–'): o += s.pil(xd, yp, r['dampak'], H.T_NAVY, H.NAVY, 'orang_navy', sz=620, h=hp, w=wp_)[0]
        else: o += pil_abu(xd, yp, wp_, hp, r['dampak'])
        pil_ = r['rusak'][:NS] or [(None, r['rusak_kosong'])]
        if len(r['rusak']) > NS: potong.append(f"{lok}: {', '.join(t_ for _, t_ in r['rusak'][NS:])}")
        for k_, (ik_, t_) in enumerate(pil_):
            xs_ = KX0 + k_ * (SLOT + GS)
            if ik_: o += s.pil(xs_, yp, t_, 'E6EAF0', H.TEKS, 'rk_' + ik_, sz=620, h=hp, w=SLOT, b=False)[0]
            else: o += pil_abu(xs_, yp, SLOT, hp, t_)
        dmu = __import__('datetime').date.fromisoformat(x['mulai']); tmu = f"{dmu.day} {H.BULAN[dmu.month - 1][:3]}"
        tint_, warna_, ik_ = (H.T_ORG, H.ORG, 'kalender_oranye') if x.get('baru') else (H.T_NAVY, H.NAVY, 'kalender_navy')
        lp = 100000 + len(tmu) * 700 * 59 + hp * .9
        o += s.pil(kol[5][1] + (kol[5][2] - lp) / 2, yp, tmu, tint_, warna_, ik_, sz=620, h=hp, w=lp)[0]
    print('rincian: baris', len(baris), 'tinggi', rp, 'slot kerusakan', NS, '| tidak muat:', potong)
    return o


def uji():
    """python harian_rincian.py --uji: aturan kerusakan dan dampak pada contoh WA 20 Nov 2026."""
    c = {'± 3.517 unit rumah terdampak (masih dalam pendataan), 10 titik akses jalan terdampak, 1 jembatan kayu rusak (masih dalam pendataan), 1 jembatan beton amblas, 5 unit tiang listrik PLN roboh tergerus banjir':
         ['±3.517 rumah', '2 jembatan', '10 jalan', '5 listrik'],
         '±11 unit rumah RR, 1 unit rumah RS, 1 unit rumah RB': ['±13 rumah'], '3 unit rumah RR,1 unit rumah RS': ['4 rumah'],
         '± 7 akses jalur terdampak': ['±7 jalan'], '32 hektare sawah terendam': ['32 ha'],
         '3 unit rumah RR, 1 unit rumah RS, 1 unit rumah RB, 1 akses jalan terdampak, 1 unit fasdik RS, 2 unit pohon tumbang': ['5 rumah', '1 sekolah', '1 jalan', '2 pohon'],
         '1 fasdik (SMK Al Muchsin) roboh bagian atap': ['1 sekolah'], 'Akses jalan Bayang - Solok terdampak': ['Jalan'],
         '± 78 unit rumah terdampak, 2 unit rumah terdampak, 1 unit rumah dapur MBG terdampak, 1 musholla terdampak, 1 jembatan gantung terdampak':
         ['±80 rumah', '1 musala', '1 jembatan', '1 dapur MBG'],
         '494,5 ha lahan pertanian terdampak (masih dalam pendataan), 344 rumah terdampak, 4 irigasi terdampak, 15 jalan terdampak, 1 tempat Ibadah  terdampak, 1 Pasar  terdampak, 1 Jembatan  terdampak, 8 Sekolah  terdampak, 2 Kantor   terdampak':
         ['344 rumah', '8 sekolah', '1 ibadah', '1 jembatan', '15 jalan', '494,5 ha', '4 irigasi', '2 kantor', '1 pasar'],
         '± 273 unit rumah terdampak (masih dalam pendataan), ± 32 ha lahan pertanian terdampak (masih dalam pendataan)': ['±273 rumah', '±32 ha'],
         '230 unit rumah terdampak (dalam pendataan), 1 unit fasdik terdampak, 1 unit fasum terdampak': ['230 rumah', '1 sekolah', '1 fasum'],
         '9 unit rumah terdampak, puskesdes terdampak, lahan perkebunan pertanian dan pertanian warga (dalam pendataan)': ['9 rumah', 'Faskes', 'Lahan'],
         '8 unit rumah terdampak mengalami kerusakan pada bagian atap (rusak ringan). (dalam pendataan)': ['8 rumah'],
         'Masih dalam pendataan': [], '-': [], 'Dalam pendataan': []}
    gagal = 0
    for t, harap in c.items():
        hasil = [l for _, l in butir_kerusakan(t)]
        if hasil != harap: gagal += 1; print('GAGAL', t[:60], hasil, '!=', harap)
    for t, harap in (('± 3.517 KK / 13.720 jiwa terdampak (masih dalam pendataan)', '±3.517 KK'), ('Masih dalam pendataan', 'Pendataan'), ('-', '–'),
                     ('± 78 unit rumah terdampak , 2 unit rumah RB', '–'), ('11 orang siswa luka ringan, ± 5 KK terdampak', '±5 KK'), ('1 Jiwa LR , 1 KK terdampak', '1 KK'), ('5 kk terdampak', '5 KK')):
        if dampak_kk(t) != harap: gagal += 1; print('GAGAL dampak', t, dampak_kk(t), '!=', harap)
    print('uji harian_rincian:', 'LULUS' if not gagal else f'{gagal} GAGAL'); return gagal


if __name__ == '__main__':
    import sys
    if '--uji' in sys.argv: sys.exit(1 if uji() else 0)
