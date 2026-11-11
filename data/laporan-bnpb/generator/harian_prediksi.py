"""Slide Prediksi Bencana versi banyak ancaman (10 Nov 2026, atasan: "coba lu tanya ke sistem kayanya bisa lebih banyak lagi selain banjir dan longsor").
Sumber sistem: prakiraan72 (banjir, longsor), cuaca_kec (cuaca ekstrem), peringatan (gelombang BMKG), rob (BMKG), udara/prakiraan (CAMS),
abu_peluang (skenario bila meletus, bukan ramalan letusan). Kekeringan tidak dipasang: prakiraannya musiman, terbit 18 Okt, ambangnya masih hipotesis.
Pemakaian: B = harian_lanjut.siapkan(...); harian_prediksi.siapkan(B, ke); dk.HAL_TAMBAH[2] = (judul, lambda: harian_prediksi.gambar(dk, B))."""
import datetime as dt, os
import harian as H
import harian_lanjut as L
from harian import NAVY, ORG, MERAH, ABU, INK, TEKS, T_NAVY, T_ORG, T_KER, T_SLATE, T_MERAH, f0
from harian_lanjut import X0, X1, Y0, YB, HID, T_HID, GEO, T_GEO, TGL, f1, panel as _panel, legenda, batang, strip, warna_sel


def panel(s, x, y, w, h, judul, c=NAVY):
    """Panel dengan ikon di depan judul (11 Nov pemilik: "masing2 header panel prediksi coba kasih icon"); ikon dipilih dari kata judul."""
    t = judul.upper()
    ik = ('api' if 'KARHUTLA' in t else 'gunung' if 'GUNUNG' in t or 'ABU' in t else 'asap' if 'UDARA' in t else 'tetes' if 'LAUT' in t
          else 'banjir' if 'KECAMATAN' in t or 'LOKASI TERDAMPAK' in t else 'hujan')
    ik += {NAVY: '_navy', ORG: '_oranye', GEO: '_coklat'}.get(c, '_navy')
    # 11 Nov pemilik ("sizing dan spacingnya masih berantakan"): ikon setinggi huruf kapital judul, judul dan ikon sama-sama rata tengah vertikal pada pita judul
    d, yh, hh = 112776, y + 64008, 201168; ym = yh + hh // 2
    return (_panel(s, x, y, w, h, '', c) + s.gambar(x + 128016, ym - d // 2, d, d, ik)
            + s.tx(x + 128016 + d + 73152, yh, w - 256032 - d - 73152, hh, [judul], sz=750, b=True, c=c, spc=100, an='ctr', wrap='none'))

WIB = dt.timedelta(hours=7)
KATEGORI = (('ekstrem', 'Ekstrem', MERAH), ('sangat_tinggi', 'Sangat tinggi', MERAH), ('tinggi', 'Tinggi', ORG), ('sedang', 'Sedang', H.KER))


def siapkan(B, ke):
    T = B['T']; w_dir = os.path.join(ke, 'lanjut'); iso = T.isoformat()
    u = lambda p: H.unduh_json('https://centurisk97.id/' + p, os.path.join(w_dir, p.replace('/', '-')))
    # cuaca ekstrem: kecamatan Waspada ke atas per provinsi
    c = u('banjir/data/cuaca_kec.json'); hari = [h for h in c['hari'] if h >= iso]; idx = [c['hari'].index(h) for h in hari]
    B['cuaca_hari'] = [dt.date.fromisoformat(h) for h in hari]
    B['cuaca'] = sorted(((k, [sum(v['n'][i]) for i in idx]) for k, v in c['prov'].items() if sum(sum(v['n'][i]) for i in idx)), key=lambda t: -sum(t[1]))
    # gelombang BMKG yang masih berlaku
    p = u('banjir/data/peringatan.json'); baris = []
    for g in p['gelombang']:
        if g['sampai'][:10] < iso: continue
        for k, lab, c_ in KATEGORI:
            baris += [(n, lab, c_, dt.date.fromisoformat(g['sampai'][:10])) for n in g.get(k) or []]
    urut = {lab: i for i, (_, lab, _) in enumerate(KATEGORI)}
    terbaik = {}   # satu perairan bisa muncul di beberapa wilayah dan periode: ambil kategori tertinggi, lalu tanggal berakhir terjauh
    for r in sorted(baris, key=lambda r: (urut[r[1]], -r[3].toordinal())): terbaik.setdefault(r[0], r)
    baris = list(terbaik.values())
    B['gelombang'] = sorted(baris, key=lambda r: (urut[r[1]], r[0]))
    B['gel_tinggi'] = sum(1 for r in baris if r[1] != 'Sedang')
    # PM2,5 rata-rata 24 jam WIB per kabupaten, CAMS
    q = u('udara/data/prakiraan.json'); jam = [dt.datetime.fromisoformat(j.replace('Z', '+00:00')).replace(tzinfo=None) + WIB for j in q['jam']]
    tgl = [T + dt.timedelta(days=i) for i in range(3)]; hasil = []
    for k in q['kota']:
        rata = []
        for d in tgl:
            v = [x for x, j in zip(k['pm'], jam) if j.date() == d and x is not None]
            rata.append(sum(v) / len(v) if len(v) >= 18 else None)
        hasil.append((k['nama'], rata)); B.setdefault('udara_prov', {})[k['nama']] = k['prov']
    B['udara_hari'] = tgl
    B['udara'] = sorted(hasil, key=lambda t: -max([v for v in t[1] if v is not None] or [0]))
    unik, seri_ = [], set()   # kabupaten bertetangga berbagi satu sel CAMS: satu baris per nilai
    for n_, r_ in B['udara']:
        kunci = tuple(round(v, 1) if v is not None else None for v in r_)
        if kunci not in seri_: seri_.add(kunci); unik.append((n_, r_))
    B['udara_unik'] = unik
    B['udara_n'] = sum(1 for _, r in hasil if max([v for v in r if v is not None] or [0]) > 55.4)
    # abu vulkanik: skenario, hanya gunung Siaga atau Awas, kabupaten dan kota
    a = u('banjir/data/abu_peluang.json'); siaga = {g['nama'].replace('Gn. ', '') for g in B['bmkg_ga']['gunung']}; abu = []
    for v in a['wilayah'].values():
        if v.get('gunung') not in siaga: continue
        h = next((x for x in v['hari'] if x['t'] == iso), None)
        if h: abu.append((v['gunung'], v['nama'].split('→')[-1].strip().replace('Kabupaten ', '').replace('Kab. ', ''), h['p'][0]))
    abu = sorted(abu, key=lambda t: -t[2]); tiap = {}
    for r in abu: tiap.setdefault(r[0], r)   # satu baris per gunung, wilayah dengan peluang terbesar
    B['abu'] = list(tiap.values())
    print('prediksi: cuaca', len(B['cuaca']), 'gelombang', len(B['gelombang']), 'tinggi', B['gel_tinggi'], '| udara > 55,4:', B['udara_n'], B['udara'][:3], '| abu', B['abu'][:3])
    return B


def _judul_kolom(s, x, y, w, teks, sz=620, c=ABU, b=False):
    return s.tx(x, y, w, 128016, [teks], sz=sz, c=c, b=b, al='ctr', an='ctr', wrap='none')


def _lokasi(s, B, X0, Yb, C1, Hb):
    """Lokasi yang sedang terdampak, level tertinggi per kabupaten 3 hari ke depan."""
    o = panel(s, X0, Yb, C1, Hb, 'LOKASI TERDAMPAK, STATUS 3 HARI KE DEPAN'); hh = B['pr_hari']
    LV = (('F3F5F8', ABU, 'Normal'), (T_KER, INK, 'Waspada'), (ORG, 'FFFFFF', 'Siaga'), (MERAH, 'FFFFFF', 'Awas'))
    xi = X0 + 128016; xc = xi + 960120; sel = (C1 - 256032 - 960120 - 73152) // 6; yg = Yb + 228600
    for j, lab in enumerate(('Banjir', 'Longsor')):
        xg = xc + j * (3 * sel + 73152); o += _judul_kolom(s, xg, yg, 3 * sel, lab, sz=660, c=HID if j == 0 else GEO, b=True)
        for i, d in enumerate(hh): o += _judul_kolom(s, xg + i * sel, yg + 118872, sel, TGL(d))
    y0 = yg + 246888; rp = (Yb + Hb - 45720 - y0) // len(B['lok_pred'])
    for n, (nm, b_, l_) in enumerate(B['lok_pred']):
        y = y0 + n * rp; o += s.tx(xi, y, 950976, rp, [nm], sz=680, b=True, c=INK, an='ctr', wrap='none')
        for j, vs in enumerate((b_, l_)):
            for i, v in enumerate(vs):
                f_, tc, t_ = LV[v]; xg = xc + j * (3 * sel + 73152) + i * sel
                o += s.kotak(xg + 6096, y + 6096, sel - 12192, rp - 12192, f_, 'roundRect', adj=9000) + s.tx(xg, y, sel, rp, [t_], sz=620, b=v > 0, c=tc, al='ctr', an='ctr', wrap='none')
    return o


def _fwi(s, B, X0, Yb, C1, Hb):
    """Bahaya karhutla: FWI tertinggi per provinsi, data sistem (versi dengan karhutla)."""
    o = panel(s, X0, Yb, C1, Hb, B.get('fwi_judul', 'BAHAYA KARHUTLA, FWI TERTINGGI PER PROVINSI'), c=ORG)
    Fw = B['fwi'][:5]; xi = X0 + 128016; xc = xi + 1188720; sel = (C1 - 256032 - 1188720) // len(B['fwi_hari']); yg = Yb + 228600
    for i, d in enumerate(B['fwi_hari']): o += _judul_kolom(s, xc + i * sel, yg, sel, TGL(d))
    y0 = yg + 137160; rp = (Yb + Hb - 201168 - y0) // len(Fw)
    for n, (_, k, vals) in enumerate(Fw):
        y = y0 + n * rp; o += s.tx(xi, y, 1170432, rp, [H.NAMA[k]], sz=700, b=True, c=INK, an='ctr', wrap='none')
        for i, val in enumerate(vals):
            _x, f_, tc, _l = L.warna_fwi(val); o += s.kotak(xc + i * sel + 6096, y + 6096, sel - 12192, rp - 12192, f_, 'roundRect', adj=9000) + s.tx(xc + i * sel, y, sel, rp, [f1(val)], sz=700, b=True, c=tc, al='ctr', an='ctr', wrap='none')
    return o + legenda(s, X0, Yb + Hb - 182880, C1, [(c, l) for _, c, _t, l in L.FW], sz=640)


def gambar(s, B):
    w = B['bmkg']; pr = dict(B['pr']); hh = B['pr_hari']
    tb = [sum(v['b'][i] for v in pr.values()) for i in range(len(hh))]; tl = [sum(v['l'][i] for v in pr.values()) for i in range(len(hh))]
    kg = 'Tinggi' if B['gel_tinggi'] else 'Sedang'; n_g = B['gel_tinggi'] or len(B['gelombang'])
    T_ = [('banjir_navy', T_HID, f0(max(tb)), f'kec. Siaga banjir, {TGL(hh[tb.index(max(tb))])}', HID),
          ('longsor_coklat', T_GEO, f0(max(tl)), f'kec. Siaga longsor, {TGL(hh[tl.index(max(tl))])}', GEO),
          ('angin_slate', T_SLATE, f0(max(sum(r[1][i] for r in B['cuaca']) for i in range(len(B['cuaca_hari'])))), B.get('cuaca_kartu', 'kecamatan cuaca ekstrem'), H.SLATE),
          ('arah_navy', T_NAVY, f0(n_g), f'perairan gelombang {kg.lower()}', NAVY),
          ('tetes_navy', T_HID, f0(len(B['rob'])), 'peringatan banjir rob', HID),
          ('asap_slate', T_SLATE, f0(B['udara_n']), 'kabupaten PM2,5 Waspada', H.SLATE)]
    if B.get('kartu_fn'): T_ = B['kartu_fn'](T_)   # 11 Nov: kartu atas dikelompokkan per penyebab
    kw = (X1 - X0 - 5 * 91440) // 6; o = ''
    for i, t in enumerate(T_): o += s.kartu(X0 + i * (kw + 91440), Y0, *t, w=kw)
    if B.get('tata3'): return o + _isi3(s, B)   # 11 Nov pemilik: satu panel per penyebab (hujan, laut, karhutla, udara, gunung api)
    Yp = Y0 + 512064 + 91440; HT = YB - Yp; C1, C2 = 4206240, 3474720; X2 = X0 + C1 + 91440; X3 = X2 + C2 + 91440; C3 = X1 - X3; Ha = 1965960; Hb = HT - Ha - 91440; Yb = Yp + Ha + 91440
    # peta peringatan BMKG
    o += panel(s, X0, Yp, C1, Ha, B.get('peta_judul') or f"PERINGATAN DINI BMKG, {w['periode'].upper().replace('NOVEMBER 2026', 'NOV').replace('–', 'SAMPAI')}")
    s.I['peta_prediksi'] = os.path.join(s.ke, 'peta_prediksi.png')
    MW = C1 - 219456; MH = MW * 693 // 1848; MX = X0 + 109728; MY = Yp + 246888; o += s.gambar(MX, MY, MW, MH, 'peta_prediksi'); TT = s.TT
    for k, lv_ in B['level'].items():
        if lv_ == 'sedang': continue
        px, py = TT['pusat'][k]; cx, cy = MX + px / TT['PW'] * MW, MY + py / TT['PH'] * MH; c = MERAH if lv_ == 'awas' else ORG
        nm = H.NAMA[k]; lw = 80000 + len(nm) * 660 * 62 + 290000; hl = 155448; xk = cx + 64008
        o += s.kotak(xk, cy - hl / 2, lw, hl, 'FFFFFF', 'roundRect', ln=c, adj=30000, lw=12700) + s.tx(xk, cy - hl / 2, lw, hl, [[(nm + ' ', INK, True), (lv_.capitalize(), c, True)]], sz=660, al='ctr', an='ctr', wrap='none')
    for k in B['angin']:
        px, py = TT['pusat'][k]; cx, cy = MX + px / TT['PW'] * MW, MY + py / TT['PH'] * MH; d = 164592
        o += s.kotak(cx - d / 2, cy - d / 2, d, d, '0E7490', 'ellipse', ln='FFFFFF', lw=12700) + s.gambar(cx - d * .32, cy - d * .32, d * .64, d * .64, 'angin_putih')
    o += legenda(s, MX, MY + MH + 9144, MW, [(MERAH, 'Awas'), (ORG, 'Siaga'), (T_HID, 'hujan sedang'), ('0E7490', 'angin kencang')], sz=660)
    # lokasi terdampak
    o += (_lokasi if B.get('tanpa_karhutla') else _fwi)(s, B, X0, Yb, C1, Hb)
    # banjir dan longsor per provinsi
    o += panel(s, X2, Yp, C2, Ha, B.get('banjir_judul', 'KECAMATAN SIAGA DAN AWAS PER PROVINSI'))
    Pr = [(k, v) for k, v in B['pr'] if sum(v['b']) + sum(v['l']) > 0][:6]; xi = X2 + 128016; xc = xi + 868680; sel = (C2 - 256032 - 868680 - 73152) // 6; yg = Yp + 237744
    for j, lab in enumerate(('Banjir', 'Longsor')):
        xg = xc + j * (3 * sel + 73152); o += _judul_kolom(s, xg, yg, 3 * sel, lab, sz=660, c=HID if j == 0 else GEO, b=True)
        for i, d in enumerate(hh): o += _judul_kolom(s, xg + i * sel, yg + 118872, sel, TGL(d))
    y0 = yg + 256032; rp = (Yp + Ha - 201168 - y0) // max(1, len(Pr))
    for n, (k, v) in enumerate(Pr):
        y = y0 + n * rp; o += s.tx(xi, y, 859536, rp, [s.pv(k)], sz=720, b=True, c=INK, an='ctr', wrap='none')
        for j, t in enumerate('bl'):
            xg = xc + j * (3 * sel + 73152)
            for i, val in enumerate(v[t]):
                f_, tc = warna_sel(val); o += s.kotak(xg + i * sel + 6096, y + 6096, sel - 12192, rp - 12192, f_, 'roundRect', adj=9000) + s.tx(xg + i * sel, y, sel, rp, [f0(val) if val else '–'], sz=720, b=bool(val), c=tc, al='ctr', an='ctr', wrap='none')
    o += legenda(s, X2, Yp + Ha - 182880, C2, [('FBE7D6', '1 sampai 9'), ('F2B98A', '10 sampai 29'), (ORG, '30 atau lebih')], sz=640)
    # cuaca ekstrem
    o += panel(s, X2, Yb, C2, Hb, B.get('cuaca_judul', 'CUACA EKSTREM, KECAMATAN WASPADA KE ATAS'))   # 11 Nov: bisa diganti hujan lebat 6 hari
    Cu = B['cuaca'][:5]; nh = len(B['cuaca_hari']); sel = (C2 - 256032 - 868680) // max(1, nh); yg = Yb + 228600
    for i, d in enumerate(B['cuaca_hari']): o += _judul_kolom(s, xc + i * sel, yg, sel, TGL(d))
    y0 = yg + 137160; rp = (Yb + Hb - 45720 - y0) // max(1, len(Cu)) if Cu else 0
    for n, (k, vs) in enumerate(Cu):
        y = y0 + n * rp; o += s.tx(xi, y, 859536, rp, [s.pv(k)], sz=720, b=True, c=INK, an='ctr', wrap='none')
        for i, val in enumerate(vs):
            f_, tc = warna_sel(val); o += s.kotak(xc + i * sel + 6096, y + 6096, sel - 12192, rp - 12192, f_, 'roundRect', adj=9000) + s.tx(xc + i * sel, y, sel, rp, [f0(val) if val else '–'], sz=720, b=bool(val), c=tc, al='ctr', an='ctr', wrap='none')
    # kolom kanan: laut, udara, abu
    H1, H2 = (1554480, 1143000) if B.get('udara_tabel') else (1645920, 877824); H3 = HT - H1 - H2 - 182880
    if B.get('tanpa_abu'): H1 = (HT - 91440) * 52 // 100; H2 = HT - 91440 - H1; H3 = 0   # 11 Nov pemilik: panel abu vulkanik dihapus
    Ge = B['gelombang'][:4]; _rw = {}
    for r in B['rob']:   # 11 Nov: satu baris per pesisir, tanggal berakhir terjauh; urut terlama lalu nama (sebelumnya urutan dedup membuang Kalsel dan Maluku)
        if r['wilayah'] not in _rw or r['tanggal_selesai'] > _rw[r['wilayah']]['tanggal_selesai']: _rw[r['wilayah']] = r
    Rb = sorted(_rw.values(), key=lambda r: (r['tanggal_selesai'], r['wilayah']), reverse=False)
    Rb = sorted(Rb, key=lambda r: r['tanggal_selesai'], reverse=True)[:4]; B['rob_n_wil'] = len(_rw)
    o += panel(s, X3, Yp, C3, H1, B.get('laut_judul', 'LAUT, 3 HARI KE DEPAN')); xi = X3 + 128016; WI = C3 - 256032; y = Yp + 228600; rp = (H1 - 228600 - 45720 - 2 * 146304 - 45720) // max(1, len(Ge) + len(Rb))
    # 11 Nov pemilik ("ini poles tampilannya"): subjudul kapital seperti kepala kolom, level gelombang jadi pil, tanggal abu-abu rata kanan, garis tipis antarbaris
    def sub_(y, lab, ket):
        return s.tx(xi, y, WI, 137160, [[(lab + '  ', ABU, True), (ket, ABU, False)]], sz=600, spc=60, an='ctr', wrap='none')
    def baris_(y, nm, sd, lab=None, c_=None, garis=True):
        o_ = s.garis(xi, y, WI, 'F1F2F4') if garis else ''
        o_ += s.tx(xi, y, WI - 1143000, rp, [nm], sz=660, c=INK, an='ctr', wrap='none')
        if lab:
            tint_ = T_MERAH if lab == 'Tinggi' else T_ORG; wl = 466344; hl = min(137160, rp - 27432)
            o_ += s.kotak(xi + WI - 1088136, y + (rp - hl) // 2, wl, hl, tint_, 'roundRect', adj=50000) + s.tx(xi + WI - 1088136, y, wl, rp, [lab], sz=600, b=True, c=c_, al='ctr', an='ctr', wrap='none')
        return o_ + s.tx(xi + WI - 566928, y, 566928, rp, [f's.d. {TGL(sd)}'], sz=620, c=ABU, al='r', an='ctr', wrap='none')
    o += sub_(y, 'GELOMBANG', f"{len(B['gelombang'])} perairan, {len(Ge)} tertinggi"); y += 146304
    for n, (nm, lab, c_, sd) in enumerate(Ge): o += baris_(y, nm.replace('Perairan ', ''), sd, lab, c_, n > 0); y += rp
    y += 27432; o += s.garis(xi, y, WI, 'BFC5CC'); y += 18288
    o += sub_(y, 'BANJIR ROB', f"{B['rob_n_wil']} pesisir, {len(Rb)} terlama"); y += 146304
    for n, r in enumerate(Rb): o += baris_(y, r['wilayah'].replace('Pesisir ', ''), dt.date.fromisoformat(r['tanggal_selesai']), garis=n > 0); y += rp
    Yu = Yp + H1 + 91440; o += panel(s, X3, Yu, C3, H2, B.get('udara_judul', 'KUALITAS UDARA, PM2,5 24 JAM TERTINGGI'))
    if B.get('udara_tabel'):   # 11 Nov pemilik: tampilkan semua daerah di atas ambang Tidak Sehat, per provinsi per hari (bukan 3 tertinggi, bukan "24 jam")
        hu = B['udara_hari']; per = {}
        for nm_, r_ in B['udara']:
            if max([v for v in r_ if v is not None] or [0]) <= 55.4: continue
            a_ = per.setdefault(B['udara_prov'][nm_], [[0] * len(hu), 0, 0]); a_[1] += 1; a_[2] = max(a_[2], max(v for v in r_ if v is not None))
            for i, v in enumerate(r_):
                if v is not None and v > 55.4: a_[0][i] += 1
        Pu = sorted(per.items(), key=lambda kv: (-kv[1][1], kv[0])); xc = xi + 1371600; sel = (WI - 1371600 - 548640) // len(hu); yg = Yu + 228600
        for i, d in enumerate(hu): o += _judul_kolom(s, xc + i * sel, yg, sel, TGL(d))
        o += _judul_kolom(s, xc + len(hu) * sel, yg, 548640, 'Tertinggi')
        y0 = yg + 137160; rp = (Yu + H2 - 182880 - y0) // max(1, len(Pu))
        for n, (k, (hit_, nk_, mx_)) in enumerate(Pu):
            y = y0 + n * rp; o += s.tx(xi, y, 1371600, rp, [[(s.pv(k) + '  ', INK, True), (f'{nk_} kab/kota', ABU, False)]], sz=660, an='ctr', wrap='none')
            for i, val in enumerate(hit_):
                f_, tc = warna_sel(val); o += s.kotak(xc + i * sel + 6096, y + 6096, sel - 12192, rp - 12192, f_, 'roundRect', adj=9000) + s.tx(xc + i * sel, y, sel, rp, [f0(val) if val else '–'], sz=660, b=bool(val), c=tc, al='ctr', an='ctr', wrap='none')
            o += s.tx(xc + len(hu) * sel, y, 548640, rp, [f'{f1(mx_)}'], sz=660, b=True, c=MERAH if mx_ > 150.4 else ORG, al='r', an='ctr', wrap='none')
        o += s.tx(xi, Yu + H2 - 173736, WI, 137160, ['Jumlah kab/kota dengan PM2,5 harian di atas 55,4 µg/m³.'], sz=560, c=ABU, an='ctr', wrap='none')   # 11 Nov pemilik: "Rincian di lampiran" gausah
    U = [] if B.get('udara_tabel') else [(n, max(v for v in r if v is not None)) for n, r in B['udara_unik'][:3]]; mk = max([v for _, v in U] or [1]) or 1; y0 = Yu + 228600; rp = (H2 - 228600 - 36576) // 3
    for n, (nm, v) in enumerate(U):
        y = y0 + n * rp; o += s.tx(xi, y, 1188720, rp, [nm.replace('Kab. ', '')], sz=680, c=INK, an='ctr', wrap='none')
        c_ = MERAH if v > 150.4 else ORG if v > 55.4 else H.KER; g_, xe = batang(s, xi + 1216152, y + rp * .22, WI - 1216152 - 420624, rp * .56, [v], [c_], mk); o += g_ + s.tx(xe + 36576, y, 420624, rp, [f1(v)], sz=700, b=True, c=c_, an='ctr', wrap='none')
    if B.get('tanpa_abu'): return o + strip(s, 'YANG DIWASPADAI', B['strip_pred'](B))
    Ya = Yu + H2 + 91440; o += panel(s, X3, Ya, C3, H3, B.get('abu_judul', 'ABU VULKANIK, SKENARIO BILA MELETUS'), c=GEO)
    # 11 Nov pemilik ("progress bar bisa misleading"): batang peluang diskalakan 0-100% di atas jalur abu-abu, bukan relatif ke nilai terbesar
    A = B['abu'][:3]; mk = 1.0; y0 = Ya + 228600; rp = (H3 - 228600 - 36576) // max(1, len(A))
    for n, (g, kab, p) in enumerate(A):
        y = y0 + n * rp; o += s.tx(xi, y, 1554480, rp, [[(g + ', ', INK, True), (kab, TEKS, False)]], sz=660, an='ctr', wrap='none')
        xb, wb = xi + 1581912, WI - 1581912 - 365760
        o += s.kotak(xb, y + rp * .3, wb, rp * .4, 'EEF0F3', 'rect')
        g_, xe = batang(s, xb, y + rp * .3, wb, rp * .4, [p], [GEO], mk); o += g_ + s.tx(xb + wb + 36576, y, 365760, rp, [f'{round(p * 100)}%'], sz=700, b=True, c=GEO, an='ctr', wrap='none')
    return o + strip(s, 'YANG DIWASPADAI', B['strip_pred'](B))


def _tabel_hari(s, x, y, w, h, baris, hari, wn, sz=700, kol_kanan=None):
    """Tabel baris provinsi x sel per hari (warna_sel). baris = [(label_runs, [nilai])]; kol_kanan = (judul, lebar, fn(baris)->(teks, warna))."""
    o = ''; wk = kol_kanan[1] if kol_kanan else 0; sel = (w - wn - wk) // max(1, len(hari)); xc = x + wn
    for i, d in enumerate(hari): o += _judul_kolom(s, xc + i * sel, y, sel, TGL(d))
    if kol_kanan: o += _judul_kolom(s, xc + len(hari) * sel, y, wk, kol_kanan[0])
    y0 = y + 137160; rp = (y + h - y0) // max(1, len(baris)) if baris else 0
    for n, b in enumerate(baris):
        yy = y0 + n * rp; o += s.tx(x, yy, wn, rp, [b[0]], sz=sz, an='ctr', wrap='none')
        for i, val in enumerate(b[1]):
            f_, tc = warna_sel(val); o += s.kotak(xc + i * sel + 6096, yy + 6096, sel - 12192, rp - 12192, f_, 'roundRect', adj=9000) + s.tx(xc + i * sel, yy, sel, rp, [f0(val) if val else '–'], sz=sz, b=bool(val), c=tc, al='ctr', an='ctr', wrap='none')
        if kol_kanan:
            t_, c_ = kol_kanan[2](b); o += s.tx(xc + len(hari) * sel, yy, wk, rp, [t_], sz=sz, b=True, c=c_, al='r', an='ctr', wrap='none')
    return o


def _sub(s, x, y, w, lab, ket):
    return s.tx(x, y, w, 137160, [[(lab + '  ', ABU, True), (ket, ABU, False)]], sz=600, spc=60, an='ctr', wrap='none')


def _isi3(s, B):
    """Tata letak 11 Nov sore (pemilik: "ikutin ini", satu panel per penyebab): Hujan (kiri penuh: Siaga/Awas banjir dan longsor,
    hujan lebat, peringatan dini BMKG), Laut + Karhutla (tengah), Udara + Gunung api (kanan)."""
    hh = B['pr_hari']; o = ''
    Yp = Y0 + 512064 + 91440; HT = YB - Yp; G = 91440
    C1, C2 = 4206240, 3474720; X2 = X0 + C1 + G; X3 = X2 + C2 + G; C3 = X1 - X3
    # ---- HUJAN (kiri, penuh)
    o += panel(s, X0, Yp, C1, HT, B.get('hujan_judul', 'HUJAN')); xi = X0 + 128016; WI = C1 - 256032; y = Yp + 246888
    Pr = [(k, v) for k, v in B['pr'] if sum(v['b']) + sum(v['l']) > 0]
    o += _sub(s, xi, y, WI, 'KECAMATAN SIAGA DAN AWAS', f"{min(6, len(Pr))} dari {len(Pr)} provinsi"); y += 155448
    Pr = Pr[:6]; wn = 1097280; sel = (WI - wn - 91440) // 6; xc = xi + wn
    for j, lab in enumerate(('Banjir', 'Longsor')):
        xg = xc + j * (3 * sel + 91440); o += _judul_kolom(s, xg, y, 3 * sel, lab, sz=640, c=HID if j == 0 else GEO, b=True)
        for i, d in enumerate(hh): o += _judul_kolom(s, xg + i * sel, y + 118872, sel, TGL(d))
    y += 256032; Hp = 1005840; rp = Hp // len(Pr)
    for n, (k, v) in enumerate(Pr):
        yy = y + n * rp; o += s.tx(xi, yy, wn, rp, [H.NAMA[k]], sz=680, b=True, c=INK, an='ctr', wrap='none')
        for j, t in enumerate('bl'):
            xg = xc + j * (3 * sel + 91440)
            for i, val in enumerate(v[t]):
                f_, tc = warna_sel(val); o += s.kotak(xg + i * sel + 6096, yy + 6096, sel - 12192, rp - 12192, f_, 'roundRect', adj=9000) + s.tx(xg + i * sel, yy, sel, rp, [f0(val) if val else '–'], sz=700, b=bool(val), c=tc, al='ctr', an='ctr', wrap='none')
    y += Hp + 27432
    o += legenda(s, X0, y, C1, [('FBE7D6', '1 sampai 9'), ('F2B98A', '10 sampai 29'), (ORG, '30 atau lebih kecamatan')], sz=600); y += 173736
    o += s.garis(xi, y, WI, 'BFC5CC'); y += 64008
    Cu = B['cuaca'][:3]
    o += _sub(s, xi, y, WI, 'HUJAN LEBAT', 'lokasi 50 mm atau lebih per hari'); y += 155448
    Hc = 137160 + 3 * 137160
    o += _tabel_hari(s, xi, y, WI, Hc, [([(s.pv(k), INK, True)], vs) for k, vs in Cu], B['cuaca_hari'], wn, sz=660); y += Hc + 54864
    o += s.garis(xi, y, WI, 'BFC5CC'); y += 64008
    w = B['bmkg']; nm_ = lambda ks: ', '.join(H.NAMA[k] for k in ks)
    aw = [k for k, v in B['level'].items() if v == 'awas']; si = [k for k, v in B['level'].items() if v == 'siaga']
    pr_ = [r for r in (('hujansolid_merah', 'Hujan sangat lebat', nm_(aw), 'Awas', MERAH, T_MERAH), ('hujansolid_oranye', 'Hujan lebat', nm_(si), 'Siaga', ORG, T_ORG),
                       ('anginsolid_oranye', 'Angin kencang', nm_(B['angin']), 'Berpotensi', ORG, T_ORG)) if r[2]]
    o += _sub(s, xi, y, WI, 'PERINGATAN DINI BMKG', w['periode'].replace(' November 2026', ' Nov').replace('–', ' sampai ')); y += 155448
    rq = min(201168, (Yp + HT - 54864 - y) // max(1, len(pr_))); d = 128016; lb = 685800; hp = 137160
    for n, (ik, bh, wil, lv, c_, t_) in enumerate(pr_):
        if n: o += s.garis(xi, y, WI, 'F1F2F4')
        o += s.gambar(xi, y + (rq - d) // 2, d, d, ik) + s.tx(xi + d + 64008, y, 1188720, rq, [bh], sz=660, b=True, c=INK, an='ctr', wrap='none')
        o += s.tx(xi + d + 64008 + 1188720, y, WI - d - 64008 - 1188720 - lb - 54864, rq, [wil], sz=640, c=TEKS, an='ctr', wrap='none')
        o += s.kotak(xi + WI - lb, y + (rq - hp) // 2, lb, hp, t_, 'roundRect', adj=50000) + s.tx(xi + WI - lb, y + (rq - hp) // 2, lb, hp, [lv], sz=600, b=True, c=c_, al='ctr', an='ctr', wrap='none'); y += rq
    # ---- LAUT (tengah atas)
    Ha = 1965960; Hb = HT - Ha - G; Yb = Yp + Ha + G
    Ge = B['gelombang'][:4]; _rw = {}
    for r in B['rob']:
        if r['wilayah'] not in _rw or r['tanggal_selesai'] > _rw[r['wilayah']]['tanggal_selesai']: _rw[r['wilayah']] = r
    Rb = sorted(sorted(_rw.values(), key=lambda r: r['wilayah']), key=lambda r: r['tanggal_selesai'], reverse=True)[:4]
    o += panel(s, X2, Yp, C2, Ha, B.get('laut_judul', 'LAUT')); xi = X2 + 128016; WI = C2 - 256032; y = Yp + 246888; rp = (Ha - 246888 - 45720 - 2 * 146304 - 45720) // max(1, len(Ge) + len(Rb))
    def baris_(y, nm, sd, lab=None, c_=None, garis=True):
        o_ = s.garis(xi, y, WI, 'F1F2F4') if garis else ''
        o_ += s.tx(xi, y, WI - 1143000, rp, [nm], sz=660, c=INK, an='ctr', wrap='none')
        if lab:
            tint_ = T_MERAH if lab == 'Tinggi' else T_ORG; wl = 466344; hl = min(137160, rp - 27432)
            o_ += s.kotak(xi + WI - 1088136, y + (rp - hl) // 2, wl, hl, tint_, 'roundRect', adj=50000) + s.tx(xi + WI - 1088136, y, wl, rp, [lab], sz=600, b=True, c=c_, al='ctr', an='ctr', wrap='none')
        return o_ + s.tx(xi + WI - 566928, y, 566928, rp, [f's.d. {TGL(sd)}'], sz=620, c=ABU, al='r', an='ctr', wrap='none')
    if B.get('laut_semua'):   # 11 Nov pemilik ("inituh yg ditampilin cuma segini?"): semua tercakup di panel, gelombang tinggi per baris, rob per tanggal berakhir
        Gt = [g for g in B['gelombang'] if g[1] != 'Sedang']; n_se = len(B['gelombang']) - len(Gt)
        per_ = {}
        for nm_, r_ in _rw.items(): per_.setdefault(r_['tanggal_selesai'], []).append(nm_.replace('Pesisir ', ''))
        kel_ = sorted(per_.items(), reverse=True)
        rp = (Ha - 246888 - 2 * 155448 - 64008 - 54864) // max(1, len(Gt) + 1 + len(kel_))
        o += _sub(s, xi, y, WI, 'GELOMBANG', f"{len(B['gelombang'])} perairan"); y += 155448
        for n, (nm, lab, c_, sd) in enumerate(Gt): o += baris_(y, nm.replace('Perairan ', ''), sd, lab, c_, n > 0); y += rp
        o += s.garis(xi, y, WI, 'F1F2F4') + s.tx(xi, y, WI, rp, [f'{n_se} perairan lain bergelombang sedang'], sz=640, c=TEKS, an='ctr', wrap='none'); y += rp
        y += 27432; o += s.garis(xi, y, WI, 'BFC5CC'); y += 36576
        o += _sub(s, xi, y, WI, 'BANJIR ROB', f"{len(_rw)} pesisir, menurut tanggal berakhir"); y += 155448
        for n, (tg, nms) in enumerate(kel_):
            if n: o += s.garis(xi, y, WI, 'F1F2F4')
            o += s.tx(xi, y, 640080, rp, [f's.d. {TGL(dt.date.fromisoformat(tg))}'], sz=620, b=True, c=NAVY, an='ctr', wrap='none')
            o += s.tx(xi + 640080, y, WI - 640080, rp, [', '.join(sorted(nms))], sz=620 if len(', '.join(nms)) <= 52 else 560, c=INK, an='ctr', wrap='none'); y += rp
    else:
        o += _sub(s, xi, y, WI, 'GELOMBANG', f"{len(B['gelombang'])} perairan, {len(Ge)} tertinggi"); y += 146304
        for n, (nm, lab, c_, sd) in enumerate(Ge): o += baris_(y, nm.replace('Perairan ', ''), sd, lab, c_, n > 0); y += rp
        y += 27432; o += s.garis(xi, y, WI, 'BFC5CC'); y += 18288
        o += _sub(s, xi, y, WI, 'BANJIR ROB', f"{len(_rw)} pesisir, {len(Rb)} terlama"); y += 146304
        for n, r in enumerate(Rb): o += baris_(y, r['wilayah'].replace('Pesisir ', ''), dt.date.fromisoformat(r['tanggal_selesai']), garis=n > 0); y += rp
    # ---- KARHUTLA (tengah bawah)
    o += _fwi(s, B, X2, Yb, C2, Hb)
    # ---- UDARA (kanan atas)
    xi = X3 + 128016; WI = C3 - 256032
    Hu = HT if B.get('tanpa_ga') else Ha   # 11 Nov pemilik: "gunung api gausah dimasukin lagi" -> udara setinggi kolom kanan
    o += panel(s, X3, Yp, C3, Hu, B.get('udara_judul', 'UDARA')); y = Yp + 246888
    hu = B['udara_hari']; per = {}
    for nm2, r_ in B['udara']:
        if max([v for v in r_ if v is not None] or [0]) <= 55.4: continue
        a_ = per.setdefault(B['udara_prov'][nm2], [[0] * len(hu), 0, 0]); a_[1] += 1; a_[2] = max(a_[2], max(v for v in r_ if v is not None))
        for i, v in enumerate(r_):
            if v is not None and v > 55.4: a_[0][i] += 1
    Pu = sorted(per.items(), key=lambda kv: (-kv[1][1], kv[0]))
    o += _sub(s, xi, y, WI, 'TIDAK SEHAT', f"{sum(v[1] for _, v in Pu)} kab/kota, PM2,5 di atas 55,4 µg/m³"); y += 155448
    o += _tabel_hari(s, xi, y, WI, min(Yp + Hu - 54864 - y, 137160 + len(Pu) * 274320), [([(s.pv(k) + '  ', INK, True), (f'{v[1]} kab/kota', ABU, False)], v[0], v[2]) for k, v in Pu], hu, 1280160, sz=640,
                     kol_kanan=('Tertinggi', 502920, lambda b: (f1(b[2]), MERAH if b[2] > 150.4 else ORG)))
    if B.get('tanpa_ga'): return o + strip(s, 'YANG DIWASPADAI', B['strip_pred'](B))
    # ---- GUNUNG API (kanan bawah): gunung Siaga/Awas, radius dan bahaya; peluang abu sebagai kalimat, tanpa batang
    o += panel(s, X3, Yb, C3, Hb, B.get('ga_judul', 'GUNUNG API'), c=GEO); y = Yb + 246888
    gs = [g for g in B['bmkg_ga']['gunung'] if g['level'] in ('Awas', 'Siaga')]; ab = {g: (kab, p) for g, kab, p in B['abu']}
    o += _sub(s, xi, y, WI, 'STATUS SIAGA DAN AWAS', f"{len(gs)} gunung api, PVMBG"); y += 155448
    rq = (Yb + Hb - 54864 - y) // max(1, len(gs)); km = lambda v: f'{v:g}'.replace('.', ',')
    for n, g in enumerate(gs):
        if n: o += s.garis(xi, y, WI, 'F1F2F4')
        c_ = MERAH if g['level'] == 'Awas' else ORG; nm = g['nama'].replace('Gn. ', ''); d = 118872
        o += s.kotak(xi, y + rq // 2 - 82296 - d // 2 + 9144, d, d, c_, 'triangle') + s.tx(xi + d + 54864, y + rq // 2 - 164592, WI, 146304, [[(g['nama'], INK, True), (f"  {g['level']}", c_, True)]], sz=660, an='ctr', wrap='none')
        rad, sek = g.get('radius') or 0, g.get('sektor') or 0
        ket = f'Radius {km(rad)} km' + (f', bahaya {km(sek)} km' if sek > rad else '')
        if nm in ab and ab[nm][1] > 0: ket += f', peluang abu sampai {ab[nm][0]} {round(ab[nm][1] * 100)}%'
        o += s.tx(xi + d + 54864, y + rq // 2, WI - d - 54864, 137160, [ket], sz=600, c=TEKS, an='ctr', wrap='none'); y += rq
    return o + strip(s, 'YANG DIWASPADAI', B['strip_pred'](B))
