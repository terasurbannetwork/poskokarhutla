"""Slide 3 deck Situasi Banjir 081126: bencana lain (gaya slide Pengkinian) + gunung api (gaya slide Status siaga), digabung satu halaman.
Pemilik 8 Nov 2026: "yang bencana lain pakai layout/desain seperti di slide pengkinian data, gunung api seperti di slide gunung api, nah tinggal digabung".
Memakai fungsi gambar generator harian dan bahan WA 8 Nov (Koordalops, BMKG, PVMBG). Karhutla dan banjir tidak ikut: banjir ada di slide 1, karhutla dilaporkan terpisah.
Keluaran: slide3-isi.pptx di folder ini, dibaca deck.py sebagai slide impor (halaman dicetak di akhir)."""
import datetime as dt, os, re, shutil, sys, zipfile
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', 'generator')); H8 = os.path.join(S, '..', 'harian-2026-11-08')
sys.path.insert(0, G); os.chdir(G)
import harian, wa_harian
from harian import ORG, MERAH, T_ORG, T_MERAH, INK, ABU, NAVY, T_NAVY, SLATE, T_SLATE, KER, T_KER, TEKS, f0

T = dt.date(2026, 11, 8)
ke = os.path.join(S, 'kerja-slide3')
if not os.path.isdir(ke):
    asal = os.path.join(H8, 'kerja-081126-rev4'); os.makedirs(ke)
    for n in ('ik', 'tpl'): shutil.copytree(os.path.join(asal, n), os.path.join(ke, n))
    for n in ('titik.json', 'peta.png'): shutil.copy(os.path.join(asal, n), ke)

wa = wa_harian.koordalops(open(os.path.join(H8, 'wa-koordalops.txt'), encoding='utf-8').read())
w = wa_harian.bmkg(open(os.path.join(H8, 'wa-bmkg.txt'), encoding='utf-8').read())
wa['kejadian'] = [x for x in wa['kejadian'] if x['jenis'] not in ('karhutla', 'banjir')]
harian.angka_karhutla = lambda kej, web, tanggal, jam: (tanggal, '07:00', set(), lambda k: {})   # tanpa karhutla: tidak perlu satelit
D = harian.susun(wa, None, T, None)
for x in D['kejadian']:   # Kondisi Mutakhir laphar 7 Nov, sama dengan pil KONDISI laporan harian 081126
    if x['lokasi'] == 'Kendal': x['tangani'] = x['perhatian'] = False
harian.JENIS_LAIN['longsor'] = ('Longsor',) + tuple(harian.JENIS_LAIN['longsor'][1:])


class Gabung(harian.Deck):
    QX, QW, GX = 548640, 4236415, 4876495   # kolom kiri selebar kolom kanan slide Pengkinian; sisanya panel gunung api

    def awal(s, x):   # laporan pertama: arsip laphar sampai 29 Okt harus ikut terbaca (jendela bawaan 10 hari dari 8 Nov tidak mencapainya)
        if x['lokasi'] == 'Banggai Kepulauan': return dt.date(2026, 9, 23)   # episode terakhir laphar_riwayat, 23 Sep s.d. 3 Okt; WA 8 Nov melabeli Pengkinian Data
        t0 = s.tanggal; s.tanggal = dt.date(2026, 10, 30)
        try: return super().awal(x)
        finally: s.tanggal = t0

    def ket(s, x):   # pemilik 8 Nov: baris Serdang Bedagai rapi sebaris; "dalam penanganan" sudah ditandai bulatan oranye dan keterangan
        return [p for p in super().ket(x) if 'dalam penanganan' not in p[0].lower()]

    def detail(s, x):   # pemilik 8 Nov: longsor ikut kotak KK terdampak; data tidak ada di laporan = strip
        d = super().detail(x)
        if x['jenis'] == 'longsor' and not x['angka'].get('kk'):
            d = dict(d, stat=list(d.get('stat', [])) + [('–', 'KK terdampak', 'orang_slate', SLATE)])
        if x['jenis'] == 'gempabumi':   # kebutuhan terbesar ikut tampil (kritik 8 Nov)
            d = dict(d, stat=list(d.get('stat', [])) + [(f0(x['angka'].get('mengungsi') or 27040), 'jiwa mengungsi', 'tenda_slate', SLATE)])
        return d

    def tabel_kh(s, *a, **k):   # slide Pengkinian tanpa tabel karhutla
        return ''

    def judul_siaga(s):
        H, P = (lambda t: (t, ORG, True)), (lambda t: (t, INK, True)); lv = s.GA['level']
        return [P('Bencana lain: '), H(f'{len(s.LN) + len(s.KR)} kejadian'), P('; '), H(f"{lv['Siaga']} gunung api"), P(f" Siaga, {lv['Waspada']} Waspada, {lv['Normal']} Normal")]

    def kiri(s):
        """Kolom kanan slide Pengkinian (Kekeringan + Bencana lainnya), digeser ke kiri."""
        s.KET_UMUM, s.SEJAJAR, s.TAMPIL_AWAL = False, False, True
        try: o = s._s3([], [], s.KR + s.LN)   # pemilik 8 Nov: kekeringan masuk panel Bencana lainnya
        finally: s.TAMPIL_AWAL = False
        dx = 7406640 - s.QX
        o = re.sub(r'<a:off x="(-?\d+)"', lambda m: f'<a:off x="{int(m[1]) - dx}"', o)
        for t in ('10 KK', '61 KK', '31 KK', '10.378', '27.479', '378.000', '520.000'): o = o.replace('±' + t, t)   # sumber tanpa tanda ±
        return o.replace('>Bencana lainnya<', '>Bencana lainnya di luar karhutla<')

    def baris_ga(s, g, X, Y, W, H):
        """Kartu gunung api dari slide Status siaga dalam bentuk baris: diagram zona, nama dan jarak zona, ubin ancaman, pil kawasan."""
        c, t = (MERAH, T_MERAH) if g['level'] == 'Awas' else (ORG, T_ORG)
        o = s.kotak(X, Y, W, H, 'F7F8FA', 'roundRect', adj=6000)
        PX, PW = X + 91440, W - 182880; KM = s._ga_kmax
        rad, sek = g.get('radius') or 0, g.get('sektor') or 0
        arah = next((m[1].strip() for m in re.finditer(r'sektor\s+([a-z][a-z\- ]*?)(?=\s+(?:meliputi|di|dari|gunung\w*|sejauh)\b|[.,])', ' '.join(g['rekom']).lower())), '')
        D_ = min(H - 146304, 950976); cx, cy = PX + D_ // 2 + 18288, Y + H // 2; R0 = D_ // 2
        rr = lambda km: int(R0 * min(km, KM) / KM)
        o += s.kotak(cx - R0, cy - R0, D_, D_, 'FFFFFF', 'ellipse')
        for km in range(5, KM + 1, 5):
            r_ = rr(km); o += s.kotak(cx - r_, cy - r_, 2 * r_, 2 * r_, None, 'ellipse', ln='C9D1DB', lw=6350)
        b0 = s.bearing(arah) if sek > rad else None
        if b0 is not None:
            r_ = rr(sek); a1, a2 = int(((b0 - 30 - 90) % 360) * 60000), int(((b0 + 30 - 90) % 360) * 60000)
            o += s.irisan(cx - r_, cy - r_, 2 * r_, a1, a2, 'F6C9A7', 'F2A672')
        if rad:
            r_ = rr(rad); o += s.kotak(cx - r_, cy - r_, 2 * r_, 2 * r_, 'FBE0CC', 'ellipse', ln=c, lw=12700)
        if b0 is not None:
            import math
            r_ = rr(sek) - 27432; o += s.panah(cx, cy, cx + r_ * math.sin(math.radians(b0)), cy - r_ * math.cos(math.radians(b0)), c)
        o += s.kotak(cx - 73152, cy - 73152, 146304, 146304, c, 'ellipse') + s.gambar(cx - 41148, cy - 41148, 82296, 82296, 'gunung_putih')
        for km in range(5, KM + 1, 5):
            lt = f'{km} km' if km == KM else f'{km}'; lw_ = 91440 + len(lt) * 50292
            o += s.kotak(cx - lw_ // 2, cy - rr(km) - 45720, lw_, 91440, 'FFFFFF', 'roundRect', adj=50000)
            o += s.tx(cx - lw_ // 2, cy - rr(km) - 45720, lw_, 91440, [lt], sz=550, c=ABU, al='ctr', an='ctr', wrap='none')
        o += s.utara(cx + R0 - 73152, Y + 54864)
        # kolom tengah: nama + pil status, lalu tiap zona satu baris dan kecamatannya
        CW = 2606040; BX = PX + D_ + 164592; BW = PX + PW - CW - 137160 - BX
        o += s.tx(BX, Y + 64008, BW, 210312, [g['nama']], sz=1050, b=True, an='ctr', wrap='none')
        ga_ = s.awal_ga(g)
        if ga_: o += s.pil(BX + s.lebar_runs([(g['nama'], INK, True)], 1050) + 73152, Y + 77724, ga_, T_NAVY, NAVY, 'kalender_navy', sz=650, h=182880, b=False)[0]
        ik = 'awas_merah' if g['level'] == 'Awas' else 'gunung_oranye'; pw_ = s.pil(0, 0, g['level'], t, c, ik, sz=680, h=182880)[1]
        o += s.pil(BX + BW - pw_, Y + 77724, g['level'], t, c, ik, sz=680, h=182880)[0]
        wz = s.ga_wil(g)
        baris = ([('radius', f0(rad), 'ke segala arah dari puncak', 'radius')] if rad else []) + ([('arah', f0(sek), f'ke arah {arah}' if arah else 'di sektor bahaya', 'sektor')] if sek > rad else [])
        y = Y + 310896
        for ikn, km, lab, zona in baris:
            o += s.kotak(BX, y + 9144, 164592, 164592, T_ORG, 'ellipse') + s.gambar(BX + 36576, y + 45720, 91440, 91440, f'{ikn}_oranye')
            o += s.tx(BX + 210312, y, BW - 210312, 182880, [[(f'{km} km ', c, True), (lab, INK, False)]], sz=900, an='ctr', wrap='none')
            wl = s.teks_wil_penuh(wz, zona); y += 192024
            if wl:
                nb = s.jumlah_baris(wl, 620, BW - 210312)
                o += s.tx(BX + 210312, y, BW - 210312, nb * 109728, [wl], sz=620, an='t'); y += nb * 109728 + 45720
        kait = {'Merapi': 'Magelang, Sleman, Klaten berpeluang banjir: waspada lahar', 'Semeru': 'Lumajang masih tercatat terdampak banjir: waspada lahar'}
        for n_, kal in kait.items():
            if n_ in g['nama']: o += s.tx(BX, Y + H - 274320, BW, 137160, [kal], sz=640, b=True, c=c, an='ctr', wrap='none')
        # kolom kanan: ancaman ubin dan kawasan dihindari
        KX = PX + PW - CW; sub = lambda y_, teks: s.tx(KX, y_, CW, 128016, [teks], sz=600, b=True, c=ABU, spc=80, an='ctr')
        y = Y + 64008; o += sub(y, 'ANCAMAN'); y += 146304
        an_ = s.ga_ancaman(g); uw, uh = (CW - 45720) // 2, 182880
        for n, a in enumerate(an_):
            ux, uy = KX + (n % 2) * (uw + 45720), y + (n // 2) * (uh + 36576)
            o += s.kotak(ux, uy, uw, uh, 'FFFFFF', 'roundRect', ln='F3C7CD', adj=20000)
            o += s.kotak(ux + 36576, uy + 22860, 137160, 137160, MERAH, 'ellipse') + s.gambar(ux + 64008, uy + 50292, 82296, 82296, f"{s.IK_ANCAMAN.get(a, 'awas')}_putih")
            o += s.tx(ux + 210312, uy, uw - 228600, uh, [a], sz=680, b=True, c=MERAH, an='ctr', wrap='none')
        y += ((len(an_) + 1) // 2) * (uh + 36576) + 18288
        kw = s.ga_kawasan(g)
        if kw:
            o += sub(y, 'KAWASAN DIHINDARI'); y += 137160
            p_, _ = s.alir([(k_, T_SLATE, SLATE, 'banjir_slate') for k_ in kw], KX, y, CW, h=155448, sz=600); o += p_
        return o

    def kanan(s):
        """Panel Gunung api slide Status siaga: kepala + empat kotak level, lalu tiga kartu bertumpuk."""
        GA = s.GA; QX, QY, QW, YB = s.GX, 1325880, 11643055 - s.GX, 6355080
        gs = [g for g in GA['gunung'] if g['level'] in ('Awas', 'Siaga')]
        o = s.kotak(QX, QY, QW, YB - QY, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2000) + s.kepala(QX, QY, QW, '9A3412', 'FBE7DC', 'gunung_putih', 'Gunung api', len(gs), h=365760)
        IX, IW = QX + 109728, QW - 219456; TW = (IW - 3 * 54864) // 4; y = QY + 411480; hk = 265176
        for i, (k, c, t, lv, ik) in enumerate((('Awas', MERAH, T_MERAH, 'IV', 'awas_merah'), ('Siaga', ORG, T_ORG, 'III', 'gunung_oranye'), ('Waspada', KER, T_KER, 'II', 'mata_kering'), ('Normal', SLATE, T_SLATE, 'I', 'cek_slate'))):
            x = IX + i * (TW + 54864); n = str(GA['level'].get(k, 0))
            o += s.kotak(x, y, TW, hk, t, 'roundRect', adj=14000) + s.gambar(x + 82296, y + (hk - 155448) // 2, 155448, 155448, ik)
            o += s.tx(x + 292608, y, 420000, hk, [n], sz=1200, b=True, c=c, an='ctr', wrap='none')
            nx_ = x + 292608 + len(n) * 100584 + 64008
            o += s.tx(nx_, y, x + TW - nx_ - 18288, hk, [[(k, c, True), (f' ({lv})', TEKS, False)]], sz=680, an='ctr', wrap='none')
        mk = max(max(g.get('radius') or 0, g.get('sektor') or 0) for g in gs); s._ga_kmax = int(max(5, -(-mk // 5) * 5))
        y0 = y + hk + 64008; GAP = 54864; h = (YB - 73152 - y0 - GAP * (len(gs) - 1)) // len(gs)
        for i, g in enumerate(gs):
            o += s.baris_ga(g, IX, y0 + i * (h + GAP), IW, h)
        return o

    LAMP_GAYA = {'Terdampak': ('F8DDE0', 'B3261E', 'awas_merah'), 'Surut': ('DCEBF8', '1B5A93', 'cek_navy'), 'Awas': ('F8DDE0', '8F3F07', 'awas_merah'), 'Siaga': ('FBE7D6', 'B84E08', 'banjir_oranye'),
                 'Berpeluang': ('E6EAF0', SLATE, 'kalender_slate'), 'Waspada': ('F4ECDC', '8A6A2E', 'mata_kering')}
    LAMP_JUDUL = {'Terdampak': 'Belum surut', 'Surut': 'Sudah surut', 'Awas': 'Status Awas', 'Siaga': 'Status Siaga', 'Berpeluang': 'Berpeluang banjir', 'Waspada': 'Status Waspada'}
    LAMP_PIL = {'Terdampak': 'Belum surut', 'Surut': 'Surut'}
    LAMP_IKON = {'Terdampak': 'banjir_putih', 'Surut': 'cek_putih', 'Awas': 'awas_putih', 'Siaga': 'banjir_putih', 'Berpeluang': 'kalender_putih', 'Waspada': 'mata_putih'}
    L_X, L_W, L_Y, L_B, L_D, L_SEC = 548640, 11094415, 1325880, 6355080, 228600, 283464
    L_KOL = [('kec', ['PRAKIRAAN', 'KECAMATAN'], 60), ('pop', ['PRAKIRAAN', 'PENDUDUK'], 70), ('mm', ['HUJAN', '(MM)'], 50), ('puncak', ['PUNCAK'], 46)]   # lebar pt; sisanya status

    def lamp_seksi(s, x, y, w, st, n, lanjut=False):
        d = s.L_D
        o = s.kotak(x, y, d, d, NAVY, 'ellipse') + s.gambar(x + 45720, y + 45720, 137160, 137160, s.LAMP_IKON[st])
        o += s.tx(x + d + 73152, y, w - d - 1900000, d, [s.LAMP_JUDUL[st] + (' (lanjutan)' if lanjut else '')], sz=1100, b=True, an='ctr', wrap='none')
        o += s.tx(x + w - 1828800, y, 1828800, d, [f'{n} kab/kota'], sz=750, c=TEKS, al='r', an='ctr', wrap='none')
        return o + s.kotak(x, y + d + 22860, w, 9525, INK)

    def lamp_kepala(s, x, y, w, h, kolom):
        o = s.kotak(x, y, w, h, NAVY, 'roundRect', adj=14000); cx = x
        for t_, lw in kolom:
            o += s.tx(cx, y, lw, h, t_ if isinstance(t_, list) else [t_], sz=620, b=True, c='FFFFFF', spc=40, al='ctr', an='ctr', wrap='none'); cx += lw
        return o

    def lamp_pita(s, x, y, w, h, prov, n, sz=760):
        return s.kotak(x, y, w, h, 'F5C7A2') + s.tx(x + 91440, y, w - 182880, h, [[(prov, INK, True), (f'   {n} kab/kota', TEKS, False)]], sz=sz, an='ctr', wrap='none')

    def lamp_nama(s, x, y, wk, h, no, kab, sz=800):
        d = min(128016, h - 18288)
        o = s.kotak(x, y, wk, h, 'EAF3FB') + s.kotak(x + 45720, y + (h - d) // 2, d, d, NAVY, 'ellipse')
        o += s.tx(x + 18288, y + (h - d) // 2, d + 54864, d, [str(no)], sz=520, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none')
        return o + s.tx(x + 228600, y, wk - 237744, h, [kab], sz=sz if len(kab) <= 21 else sz - 60, b=True, an='ctr', wrap='none')

    @staticmethod
    def lamp_ringkas(k, maks=230):
        k = re.sub(r'\s+', ' ', (k or '–').replace('\ufffd', '')).strip(' .,-').replace(', serta ', '; ')
        kal, n = [], 0
        for b_ in re.split(r'(?<=\.)\s+', k):
            if kal and n + len(b_) > maks: break
            kal.append(b_); n += len(b_) + 1
        return ' '.join(kal)[:maks + 40]

    @staticmethod
    def lamp_nilai(v):
        return '–' if v in ('', None) else (f0(v) if isinstance(v, (int, float)) else str(v))

    def lamp_status(s, x, y, lw, h, st, sz=600):
        f, w_, ik = s.LAMP_GAYA[st]; PH = 128016; PW = lw - 45720
        return s.pil(x + 22860, y + (h - PH) // 2, s.LAMP_PIL.get(st, st), f, w_, ik, sz=sz, h=PH, w=PW)[0]

    def lamp_penuh(s, st, items):
        """Satu halaman penuh satu tabel: kejadian yang dilaporkan, berpita provinsi, kolom selengkap data laporan."""
        P = 12700; x, w = s.L_X, s.L_W; y = s.L_Y
        wk, wa_, wn, wj, wu, wm, wb, wp = 150 * P, 56 * P, 50 * P, 52 * P, 62 * P, 62 * P, 56 * P, 70 * P
        wt = w - (wk + wa_ + wn + wj + wu + wm + wb + wp)
        wkc = 178 * P; KK_ = __import__('json').load(open(os.path.join(S, 'lapkec.json'), encoding='utf-8'))
        kolom = [('KAB/KOTA', wk), ('KECAMATAN', wkc), ('KONDISI TERAKHIR', wt - wkc), (['LAPOR', 'AWAL'], wa_), ('KK', wn), ('JIWA', wj), ('MENGUNGSI', wu), (['HUJAN', '(MM)'], wm), (['KABAR', 'AKHIR'], wb), ('STATUS', wp)]
        o = s.lamp_seksi(x, y, w, st, len(items)); y += s.L_SEC
        gx = x + wk + wt + wa_
        o += s.tx(gx, y, wn + wj, 137160, ['TERDAMPAK'], sz=620, b=True, c=NAVY, spc=40, al='ctr', an='ctr', wrap='none') + s.kotak(gx + 45720, y + 141732, wn + wj - 91440, 12700, NAVY); y += 164592
        HK = 292608; o += s.lamp_kepala(x, y, w, HK, kolom); y += HK + 18288
        prov = list(dict.fromkeys(i['prov'] for i in items)); BH = 201168
        rh = min(44 * P, (s.L_B - y - len(prov) * BH) // len(items)); no = 0
        for p in prov:
            xs = [i for i in items if i['prov'] == p]; o += s.lamp_pita(x, y, w, BH, p, len(xs), sz=850); y += BH
            for it in xs:
                no += 1; o += s.lamp_nama(x, y, wk, rh, no, it['kab'], sz=900)
                o += s.tx(x + wk + 91440, y, wkc - 137160, rh, [(KK_.get(it['kp'] + '|' + it['kab']) or {}).get('kec') or '–'], sz=720, c=TEKS, an='ctr')
                o += s.tx(x + wk + wkc + 45720, y, wt - wkc - 137160, rh, [s.lamp_ringkas(it.get('kondisi'), 90)], sz=680, c=TEKS, an='ctr')
                cx = x + wk + wt
                for k_, lw in (('awal', wa_), ('kk', wn), ('jiwa', wj), ('ungsi', wu), ('mm', wm), ('kabar', wb)):
                    o += s.tx(cx, y, lw, rh, [s.lamp_nilai(it.get(k_))], sz=850, b=k_ in ('kk', 'jiwa', 'ungsi', 'mm'), al='ctr', an='ctr', wrap='none'); cx += lw
                o += s.lamp_status(cx, y, wp, rh, st, sz=640); y += rh
                o += s.kotak(x, y - 3175, w, 6350, 'D5DBE3')
        return o

    def lamp_moda(s, rows, judul):
        """Perkiraan waktu penghantaran logpal dari Gudang UPT Padang per kab/kota, berpita provinsi."""
        P = 12700; x, w = s.L_X, s.L_W; y = s.L_Y
        wk, wj, wd, wl, wp_, wu, wb, wst = 180 * P, 80 * P, 76 * P, 76 * P, 140 * P, 76 * P, 150 * P, 75 * P
        wp_ += w - (wk + wj + wd + wl + wp_ + wu + wb + wst)
        kolom = [('KAB/KOTA', wk), (['JARAK', 'DARAT (KM)'], wj), (['DARAT', '(JAM)'], wd), (['LAUT', '(JAM)'], wl), ('PELABUHAN TUJUAN', wp_), (['UDARA', '(JAM)'], wu), ('BANDARA TUJUAN', wb), ('KONDISI', wst)]
        d = s.L_D; o = s.kotak(x, y, d, d, NAVY, 'ellipse') + s.gambar(x + 45720, y + 45720, 137160, 137160, 'kalender_putih')
        o += s.tx(x + d + 73152, y, 5486400, d, [judul], sz=1100, b=True, an='ctr', wrap='none')
        o += s.tx(x + w - 5486400, y, 5486400, d, ['Aceh dan Sumut dari Poslog Kualanamu, lainnya dari Gudang UPT Padang; perkiraan, belum dikonfirmasi operator'], sz=750, c=TEKS, al='r', an='ctr', wrap='none')
        o += s.kotak(x, y + d + 22860, w, 9525, INK); y += s.L_SEC
        HK = 292608; o += s.lamp_kepala(x, y, w, HK, kolom); y += HK + 18288
        prov = list(dict.fromkeys(i['prov'] for i in rows)); BH = 201168
        rh = min(30 * P, (s.L_B - y - len(prov) * BH) // len(rows)); no = 0; rapat = rh < 15 * P; SZ1, SZ2, SZ3 = (740, 700, 560) if rapat else (900, 850, 640)
        for p in prov:
            xs = [i for i in rows if i['prov'] == p]; o += s.lamp_pita(x, y, w, BH, p, len(xs), sz=740 if rapat else 850); y += BH
            for it in xs:
                no += 1; o += s.lamp_nama(x, y, wk, rh, no, it['kab'], sz=SZ1); cx = x + wk
                for k_, lw, b_ in (('km', wj, False), ('darat', wd, True), ('laut', wl, True), ('pel', wp_, False), ('udara', wu, True), ('bdr', wb, False)):
                    o += s.tx(cx, y, lw, rh, [s.lamp_nilai(it.get(k_))], sz=SZ2, b=b_, al='ctr', an='ctr', wrap='none'); cx += lw
                o += s.lamp_status(cx, y, wst, rh, it['st'], sz=SZ3); y += rh
                o += s.kotak(x, y - 3175, w, 6350, 'D5DBE3')
        return o

    def lamp_alir(s, L):
        """Status prakiraan: tiap status satu tabel berpita provinsi, mengalir di dua kolom per halaman."""
        H, HK, rh, GAP = s.L_B - s.L_Y, 292608, 190000, 91440
        kol, skr, pakai = [], [], 0
        def tutup():
            nonlocal skr, pakai
            kol.append(skr); skr, pakai = [], 0
        for st in ('Awas', 'Siaga', 'Berpeluang', 'Waspada'):
            items = [i for i in L if i['st'] == st]
            if not items: continue
            prov = list(dict.fromkeys(i['prov'] for i in items)); no = 0
            def kepala(lanjut):
                nonlocal pakai
                if skr: skr.append(('gap',)); pakai += GAP
                skr.append(('sec', st, len(items), lanjut)); skr.append(('kep',)); pakai += s.L_SEC + HK + 9144
            if pakai + GAP + s.L_SEC + HK + 2 * rh > H: tutup()
            kepala(False)
            for p in prov:
                xs = [i for i in items if i['prov'] == p]
                if pakai + 2 * rh > H: tutup(); kepala(True)
                skr.append(('pita', p, len(xs))); pakai += rh
                for it in xs:
                    if pakai + rh > H:
                        tutup(); kepala(True); skr.append(('pita', p + ' (lanjutan)', len(xs))); pakai += rh
                    no += 1; skr.append(('baris', no, it)); pakai += rh
        if skr: tutup()
        return kol

    def lamp_gambar_kolom(s, x, w, el):
        P = 12700; HK, rh, y = 292608, 190000, s.L_Y; o = ''
        wk = 148 * P; sisa = w - wk - sum(c[2] * P for c in s.L_KOL)
        kolom = [('KAB/KOTA', wk)] + [(c[1], c[2] * P) for c in s.L_KOL] + [('STATUS', sisa)]
        for e in el:
            if e[0] == 'gap': y += 91440
            elif e[0] == 'sec': o += s.lamp_seksi(x, y, w, e[1], e[2], e[3]); y += s.L_SEC; st_ = e[1]
            elif e[0] == 'kep': o += s.lamp_kepala(x, y, w, HK, kolom); y += HK + 9144
            elif e[0] == 'pita': o += s.lamp_pita(x, y, w, rh, e[1], e[2]); y += rh
            else:
                it = e[2]; o += s.lamp_nama(x, y, wk, rh, e[1], it['kab']); cx = x + wk
                for c in s.L_KOL:
                    lw = c[2] * P; o += s.tx(cx, y, lw, rh, [s.lamp_nilai(it.get(c[0]))], sz=760, b=c[0] == 'mm', al='ctr', an='ctr', wrap='none'); cx += lw
                o += s.lamp_status(cx, y, sisa, rh, st_); y += rh
                o += s.kotak(x, y - 3175, w, 6350, 'D5DBE3')
        return o

    def lamp_halaman(s, L):
        """Urutan: belum surut (halaman sendiri), sudah surut (halaman sendiri), lalu status prakiraan dua kolom."""
        hal = []
        for st in ('Terdampak', 'Surut'):
            xs = [i for i in L if i['st'] == st]
            if xs: hal.append(lambda st=st, xs=xs: s.lamp_penuh(st, xs))
        K = s.lamp_alir(L); GP = 182880; cw = (s.L_W - GP) // 2
        for n in range(0, len(K), 2):
            def f(a=K[n], b=K[n + 1] if n + 1 < len(K) else None):
                return s.lamp_gambar_kolom(s.L_X, cw, a) + (s.lamp_gambar_kolom(s.L_X + cw + GP, cw, b) if b else '')
            hal.append(f)
        J = __import__('json').load(open(os.path.join(S, 'jalur.json'), encoding='utf-8'))['kab']
        J1 = [r for r in J if r['st'] != 'Berpeluang']; J2 = [r for r in J if r['st'] == 'Berpeluang']
        hal.append(lambda: s.lamp_moda(J1, 'Penghantaran logpal ke kab/kota terdampak'))
        hal.append(lambda: s.lamp_moda(J2, 'Penghantaran logpal ke kab/kota berprobabilitas banjir'))
        return hal

    # --- tiga slide padat (pemilik 8 Nov malam): banjir + kebutuhan + mitigasi; stok BNPB; banjir + bencana lain + mitigasi
    P_ = 12700; PX0, PW0, PY0, PYB = 548640, 11094415, 1325880, 6355080
    BIRU_PITA, GARIS_P = 'DCE9F5', 'D5DBE3'

    def p_sek(s, x, y, w, ikon, judul):
        d = 16 * s.P_
        return (s.kotak(x, y, d, d, NAVY, 'ellipse') + s.gambar(x + d * .2, y + d * .2, d * .6, d * .6, ikon)
                + s.tx(x + d + 5 * s.P_, y, w - d, d, [judul], sz=950, b=True, an='ctr', wrap='none') + s.kotak(x, y + d + 2 * s.P_, w, 9525, INK))

    def p_tabel(s, x, y, w, kol, baris, rh, hk=None, sz=720):
        """kol = [(judul, bobot, rata)]; baris = daftar sel, atau {'pita': teks, 'sel': [...]}; sel = teks atau (teks, warna, tebal)."""
        P = s.P_; hk = hk or 15 * P; tb = sum(k[1] for k in kol); L = [w * k[1] / tb for k in kol]
        o = s.kotak(x, y, w, hk, NAVY, 'roundRect', adj=14000); cx = x
        for k, lw in zip(kol, L):
            o += s.tx(cx + 3 * P, y, lw - 6 * P, hk, k[0] if isinstance(k[0], list) else [k[0]], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none'); cx += lw
        yy = y + hk
        for b in baris:
            pita = isinstance(b, dict) and 'pita' in b; tot = isinstance(b, dict) and 'total' in b
            sel = b.get('sel', []) if isinstance(b, dict) else b
            if pita: o += s.kotak(x, yy, w, rh, s.BIRU_PITA)
            if tot: o += s.kotak(x, yy, w, rh, NAVY, 'roundRect', adj=14000)
            if pita: o += s.tx(x + 5 * P, yy, w * .6, rh, [b['pita']], sz=sz, b=True, an='ctr', wrap='none')
            cx = x
            for i, (k, lw) in enumerate(zip(kol, L)):
                if i < len(sel) and sel[i] not in ('', None):
                    v = sel[i]; t_, c_, b_ = v if isinstance(v, tuple) else (v, 'FFFFFF' if tot else INK, tot or (i == 0 and not pita))
                    o += s.tx(cx + 4 * P, yy, lw - 7 * P, rh, [t_], sz=sz, b=b_, c=c_, al=k[2], an='ctr')
                cx += lw
            yy += rh
            if not pita and not tot: o += s.kotak(x, yy - 3175, w, 6350, s.GARIS_P)
        return o, yy

    def p_kartu(s, x, y, w, h, tint, warna, ikon, nilai, lab):
        d = 24 * s.P_
        return (s.kotak(x, y, w, h, tint, 'roundRect', adj=9000) + s.kotak(x + 7 * s.P_, y + (h - d) / 2, d, d, warna, 'ellipse') + s.gambar(x + 7 * s.P_ + d * .2, y + (h - d) / 2 + d * .2, d * .6, d * .6, ikon)
                + s.tx(x + d + 13 * s.P_, y + h * .08, w - d - 16 * s.P_, h * .44, [nilai], sz=1250, b=True, an='ctr', wrap='none')
                + s.tx(x + d + 13 * s.P_, y + h * .56, w - d - 16 * s.P_, h * .34, [lab], sz=720, c=TEKS, an='ctr', wrap='none'))

    def p_muat(s, nama, wk, hk):
        from PIL import Image
        w_, h_ = Image.open(s.I[nama]).size; k = min(wk / w_, hk / h_); return w_ * k, h_ * k

    def p_video(s, x, y, w, h):
        return s.kotak(x, y, w, h, 'E6EAF0', 'roundRect', adj=2500)

    def padat_1(s):
        d = s.PD; P = s.P_; wA, wB = 270 * P, 300 * P; gp = 12 * P; xA = s.PX0; xB = xA + wA + gp; xC = xB + wB + gp; wC = s.PX0 + s.PW0 - xC; y0 = s.PY0; o = ''
        # A: peta, kartu, video
        o += s.p_sek(xA, y0, wA, 'wilayah_putih' if 'wilayah_putih' in s.I else 'banjir_putih', 'Peta daerah terdampak dan prakiraan (kab/kota)')
        mw, mh = s.p_muat('peta_padat1', wA, 166 * P); o += s.gambar(xA + (wA - mw) / 2, y0 + 23 * P, mw, mh, 'peta_padat1')
        yk = y0 + 192 * P; kw = (wA - 2 * 6 * P) / 3; kk = [('DCEBF8', '1B5A93', 'rumah_putih', sum(1 for r in d['lp'] if r['st'] != 'Surut'), 'Terdampak'), ('F8DDE0', '8F3F07', 'awas_putih', sum(1 for r in s.Q4 if r['a'] and r['k'] not in s.BS), 'Awas'), ('FBE7D6', 'E8894A', 'banjir_putih', sum(1 for r in s.Q4 if not r['a'] and r['k'] not in s.BS), 'Siaga')]
        for i, (t, c, ik, n, l) in enumerate(kk): o += s.p_kartu(xA + i * (kw + 6 * P), yk, kw, 34 * P, t, c, ik, str(n), l)
        yv = y0 + 233 * P; o += s.p_sek(xA, yv, wA, 'mata_putih', 'Rekaman layar pemantauan banjir'); o += s.p_video(xA, yv + 23 * P, wA, s.PYB - yv - 23 * P)
        # B: terdampak
        o += s.p_sek(xB, y0, wB, 'rumah_putih', 'Kab/kota terdampak banjir, laporan 1-8 November')
        baris = []; pv = None
        for r in d['lp']:
            if r['prov'] != pv: pv = r['prov']; baris.append({'pita': pv})
            bs = r['st'] != 'Surut'
            baris.append([r['kab'], r['kec'] or '–', r['mulai'], r['selesai'], s.pf(r['kk']), s.pf(r['ungsi']), ('Belum surut', 'B3261E', True) if bs else ('Surut', '1B5A93', True)])
        x_, yb = s.p_tabel(xB, y0 + 22 * P, wB, [('Kab/Kota', 92, 'l'), ('Kec.', 24, 'ctr'), ('Mulai', 36, 'ctr'), ('Selesai', 36, 'ctr'), ('KK', 34, 'ctr'), ('Ungsi', 30, 'ctr'), ('Kondisi', 48, 'ctr')], baris, 11.3 * P); o += x_
        # B bawah: kebutuhan
        yk2 = y0 + 229 * P; o += s.p_sek(xB, yk2, wB, 'tenda_putih', 'Kebutuhan daerah dan kekurangannya')
        baris = []; pv = None
        for r in d['keb']:
            if r['prov'] != pv: pv = r['prov']; baris.append({'pita': pv})
            baris.append([r['jenis'], r['jml'], r['stok2'], (r['kurang'], 'B3261E', True) if r['kurang'] != '–' else '–'])
        x_, ye = s.p_tabel(xB, yk2 + 22 * P, wB, [('Kebutuhan', 128, 'l'), ('Diajukan', 52, 'ctr'), ('Stok Kualanamu', 62, 'ctr'), ('Kekurangan', 58, 'ctr')], baris, 12.3 * P); o += x_
        o += s.tx(xB, ye + 3 * P, wB, s.PYB - ye - 3 * P, [[('Alur: ', NAVY, True), ('Aceh dan Sumut dipenuhi dari Poslog Kualanamu; Sumbar dari gudang logpal Sumbar. Kekurangan harus disiapkan. Rincian per kab/kota belum tersedia.', TEKS, False)]], sz=720, an='ctr')
        # C: prakiraan
        o += s.p_sek(xC, y0, wC, 'kalender_putih', f"Prakiraan kecamatan Awas dan Siaga, {s.TG}")
        baris = [[r['prov'], r['n'], (r['a'], 'B3261E', True) if r['a'] else '–', r['s'], (r['mm'], 'B3261E', True)] for r in d['prov']]
        baris.append({'total': 1, 'sel': ['Jumlah', str(d['n_kab']), str(d['a']), str(d['s']), '']})
        x_, yp = s.p_tabel(xC, y0 + 22 * P, wC, [('Provinsi', 100, 'l'), ('Kab/Kota', 42, 'ctr'), ('Kec. Awas', 44, 'ctr'), ('Kec. Siaga', 44, 'ctr'), ('Puncak, mm', 49, 'ctr')], baris, 14 * P); o += x_
        pw = (wC - 2 * 5 * P) / 3; yq = yp + 5 * P
        for i, r in enumerate(d['puncak']):
            xq = xC + i * (pw + 5 * P); o += s.kotak(xq, yq, pw, 34 * P, 'FBE7D6', 'roundRect', adj=9000) + s.tx(xq + 5 * P, yq + 3 * P, pw - 8 * P, 16 * P, [[(f"{r['mm']} mm", 'B3261E', True)]], sz=1100, an='ctr', wrap='none') + s.tx(xq + 5 * P, yq + 19 * P, pw - 8 * P, 12 * P, [f"{r['kab']}, {r['tgl']}"], sz=700, c=TEKS, an='ctr', wrap='none')
        # C bawah: mitigasi
        ym = y0 + 193 * P; o += s.p_sek(xC, ym, wC, 'cek_putih', 'Usulan mitigasi per kab/kota')
        M = [('Deli Serdang', 'Bupati putuskan perpanjangan Tanggap Darurat sebelum 9 Nov'), ('Pidie Jaya', 'Tambal tanggul jebol; siapkan evakuasi Trienggadeng, Meureudu'), ('Serdang Bedagai', 'Tuntaskan pendataan; bersihkan rumah terdampak'), ('Langkat', 'Konfirmasi status surut ke BPBD, laporan terakhir 1 Nov'), ('Lumajang', 'Buka akses jalan dan listrik; siaga lahar Besuk Kobokan'),
             ('Aceh Barat Daya', 'Siapkan evakuasi Kuala Batee, Babah Rot, Manggeng'), ('Aceh Barat', 'Posko Sungai Mas, Pante Ceureumen; perahu di Meureubo'), ('Nagan Raya', 'Posko Seunagan, Kuala; pantau lereng Darul Makmur'), ('Kab/kota Siaga', 'Buka posko kecamatan; periksa tanggul; siapkan jalur evakuasi')]
        x_, _ = s.p_tabel(xC, ym + 22 * P, wC, [('Kab/Kota', 68, 'l'), ('Langkah BPBD bersama BNPB', 211, 'l')], M, (s.PYB - ym - 37 * P) / len(M)); o += x_
        return o

    def padat_2(s):
        d = s.PD; P = s.P_; x0 = s.PX0; W = s.PW0; y0 = s.PY0; o = ''
        K = [('DCEBF8', '1B5A93', 'tenda_putih', '138,5 ton', 'Gudang UPT Padang'), ('DCEBF8', '1B5A93', 'tenda_putih', '130,8 ton', 'Poslog Kualanamu, buffer'), ('E6EAF0', NAVY, 'truk_putih', '1.914,8 ton', 'Kualanamu masuk sejak Nov 2025'), ('E6EAF0', NAVY, 'truk_putih', '1.784,1 ton', 'Kualanamu sudah keluar'), ('FBE7D6', 'E8894A', 'kalender_putih', f"{d['jam1']} jam", f"Pengiriman terlama, {d['n_jl']} kab/kota")]
        kw = (W - 4 * 8 * P) / 5
        for i, (t, c, ik, n, l) in enumerate(K): o += s.p_kartu(x0 + i * (kw + 8 * P), y0, kw, 44 * P, t, c, ik, n, l)
        y2 = y0 + 52 * P; wA, wB = 290 * P, 262 * P; gp = 11 * P; xB = x0 + wA + gp; xC = xB + wB + gp; wC = x0 + W - xC
        o += s.p_sek(x0, y2, wA, 'tenda_putih', 'Stok utama dua gudang BNPB')
        B = [('Perahu', '26 unit', '11 unit'), ('Mesin perahu', '18 unit', '–'), ('Pompa', '51 unit', '2 unit'), ('Genset', '6 unit', '5 unit'), ('Air bersih portabel', '12 unit', '–'), ('Alat berat', '–', '–'), ('Tenda keluarga', '315 set', '144 unit'), ('Tenda pengungsi', '1 set', '8 set'), ('Velbed', '876 unit', '–'), ('Kasur', '7.326 lembar', '5.261 pcs'), ('Matras', '5.847 lembar', '1.276 lembar'), ('Selimut', '28 lembar', '307 lembar'), ('Terpal', '180 lembar', '–'), ('Geobag', '820 pcs', '1.400 pcs'), ('Chainsaw', '6 unit', '–'), ('Obat', '800 paket', '93 koli'), ('Masker', '10.000 box', '5.640 box'), ('Hygiene kit', '58 paket', '–'), ('Pakaian', '9.672 pcs', '740 pcs'), ('Handuk', '2.410 pcs', '776 pcs')]
        x_, _ = s.p_tabel(x0, y2 + 22 * P, wA, [('Jenis', 120, 'l'), ('UPT Padang', 85, 'ctr'), ('Poslog Kualanamu', 85, 'ctr')], [list(b) for b in B], (s.PYB - y2 - 37 * P) / len(B)); o += x_
        o += s.p_sek(xB, y2, wB, 'truk_putih', 'Alur distribusi dari dua gudang')
        mw, mh = s.p_muat('peta_padat2', wB, 200 * P); o += s.gambar(xB + (wB - mw) / 2, y2 + 22 * P, mw, mh, 'peta_padat2')
        yj = y2 + 226 * P; baris = [[r['prov'], r['asal'], r['n'], r['darat'], r['laut'], r['jam']] for r in d['jl']]
        x_, _ = s.p_tabel(xB, yj, wB, [('Provinsi', 82, 'l'), ('Gudang', 54, 'ctr'), ('Kab', 24, 'ctr'), ('Darat', 28, 'ctr'), ('Laut', 26, 'ctr'), ('Waktu', 48, 'ctr')], baris, (s.PYB - yj - 15 * P - 19 * P) / max(len(baris), 1)); o += x_
        o += s.tx(xB, s.PYB - 18 * P, wB, 18 * P, ['Waktu perkiraan dari jarak dan kecepatan rata-rata; belum dikonfirmasi operator angkutan.'], sz=700, c=TEKS, an='ctr')
        o += s.p_sek(xC, y2, wC, 'orang_putih', 'Persediaan BPBD di daerah')
        L = [r for r in d['lg'] if r['prov'] not in ('Sumatera Barat',) and 'Kualanamu' not in r['prov']]
        v = lambda x: s.pf(x)
        x_, yl = s.p_tabel(xC, y2 + 22 * P, wC, [('Provinsi', 88, 'l'), ('Perahu', 30, 'ctr'), ('Pompa', 30, 'ctr'), ('Genset', 30, 'ctr'), ('Tenda', 30, 'ctr'), ('Kasur', 34, 'ctr'), ('Selimut', 36, 'ctr')], [[r['prov'], v(r['perahu']), v(r['pompa']), v(r['genset']), v(r['tenda']), v(r['matras']), v(r['selimut'])] for r in L], 14 * P); o += x_
        yc = yl + 8 * P; o += s.p_sek(xC, yc, wC, 'mata_putih', 'Provinsi tanpa rincian jumlah')
        C = [('Aceh', 'Stok lama cukup; usul selimut, family kit'), ('Riau', 'Peralatan ada; logistik minim'), ('Jawa Timur', 'Apel 12 kab/kota; siaga darurat 38 kab/kota'), ('Bengkulu', 'Apel Agustus; belum ada status darurat'), ('Belum melapor', 'Kepri, Sulteng, Papua Selatan, Kalbar, Kalsel, Sulsel, Maluku, NTT, Papua Pegunungan, Sulbar, Papua Barat Daya')]
        ya = yc + 22 * P; hs = s.PYB - ya - 15 * P
        x_, _ = s.p_tabel(xC, ya, wC, [('Provinsi', 72, 'l'), ('Kondisi', 206, 'l')], [list(c) for c in C], hs / len(C)); o += x_
        return o

    def padat_3(s):
        d = s.PD; P = s.P_; x0 = s.PX0; W = s.PW0; y0 = s.PY0; o = ''
        n5 = sum(1 for r in d['lp'] if r['st'] != 'Surut')
        K = [('DCEBF8', '1B5A93', 'banjir_putih', f'{n5} kab/kota', 'Banjir belum surut'), ('F8DDE0', '8F3F07', 'longsor_putih', f"{d['la']} + {d['ls']} kec.", 'Longsor Awas + Siaga'), ('E6EAF0', NAVY, 'angin_putih', '4 kejadian', 'Cuaca ekstrem'), ('FBE7D6', 'B84E08', 'tetes_putih', '2 kejadian', 'Kekeringan'), ('E6EAF0', NAVY, 'gempa_putih', '27.040 jiwa', 'Mengungsi, gempa NTT'), ('FBE7D6', 'B84E08', 'gunung_putih', '3 gunung', 'Status Siaga')]
        kw = (W - 5 * 7 * P) / 6
        for i, (t, c, ik, n, l) in enumerate(K): o += s.p_kartu(x0 + i * (kw + 7 * P), y0, kw, 44 * P, t, c, ik, n, l)
        y2 = y0 + 52 * P; wA, wB = 312 * P, 262 * P; gp = 11 * P; xB = x0 + wA + gp; xC = xB + wB + gp; wC = x0 + W - xC
        o += s.p_sek(x0, y2, wA, 'awas_putih', 'Kejadian bencana lain yang masih dilaporkan')
        E = [('Gempa bumi', 'Nusa Tenggara Timur', '15 Agu', '156 meninggal; 17.707 KK'), ('Cuaca ekstrem', 'Serdang Bedagai, Sumut', '7 Nov', '10 KK'), ('Cuaca ekstrem', 'Ciamis, Jabar', '7 Nov', '61 KK'), ('Cuaca ekstrem', 'Bogor, Jabar', '7 Nov', '31 KK'), ('Cuaca ekstrem', 'Kendal, Jateng (selesai)', '7 Nov', '1 meninggal'), ('Longsor', 'Badung, Bali', '2 Nov', '2 hilang'), ('Kekeringan', 'Subang, Jabar', '24 Okt', '10.378 KK; 378.000 liter air'), ('Kekeringan', 'Banggai Kepulauan, Sulteng', '23 Sep', '1.868 KK; 520.000 liter air')]
        x_, ye = s.p_tabel(x0, y2 + 22 * P, wA, [('Jenis', 62, 'l'), ('Lokasi', 108, 'l'), ('Mulai', 34, 'ctr'), ('Dampak', 108, 'l')], [list(e) for e in E], 20 * P); o += x_
        yg = ye + 8 * P; o += s.p_sek(x0, yg, wA, 'gunung_putih', 'Gunung api Siaga')
        G_ = [('Anak Krakatau', '5 km dari puncak', 'Lava, abu, lontaran batu pijar'), ('Merapi', '3 km; 7 km selatan-barat daya', 'Awan panas, lahar di Boyong, Gendol'), ('Semeru', '5 km; 13 km tenggara', 'Awan panas, lahar Besuk Kobokan')]
        x_, yh = s.p_tabel(x0, yg + 22 * P, wA, [('Gunung', 66, 'l'), ('Zona bahaya', 112, 'l'), ('Ancaman', 134, 'l')], [list(g) for g in G_], 26 * P); o += x_
        o += s.tx(x0, yh + 3 * P, wA, s.PYB - yh - 3 * P, [[('Status gunung api: ', NAVY, True), ('Awas 0; Siaga 3; Waspada 24; Normal 42.', TEKS, False)]], sz=760, an='ctr')
        o += s.p_sek(xB, y2, wB, 'kalender_putih', f"Prakiraan banjir dan longsor, {s.TG}")
        bl = d['bl']; ta = lambda i: sum(r[i] for r in bl); f_ = lambda v: ('–' if not v else str(v))
        baris = [[r[0], (f_(r[1]), 'B3261E', True) if r[1] else '–', f_(r[2]), (f_(r[3]), 'B3261E', True) if r[3] else '–', f_(r[4])] for r in bl]
        baris.append({'total': 1, 'sel': ['Jumlah', str(ta(1)), str(ta(2)), str(ta(3)), str(ta(4))]})
        rh = (s.PYB - y2 - 22 * P - 24 * P - 46 * P) / len(baris)
        x_, yb = s.p_tabel(xB, y2 + 22 * P, wB, [('Provinsi', 98, 'l'), (['Banjir', 'Awas'], 41, 'ctr'), (['Banjir', 'Siaga'], 41, 'ctr'), (['Longsor', 'Awas'], 41, 'ctr'), (['Longsor', 'Siaga'], 41, 'ctr')], baris, rh, hk=24 * P, sz=720); o += x_
        ya = yb + 6 * P; hw = (wB - 6 * P) / 2; hh = s.PYB - ya
        for i, (t, a, b) in enumerate((('Ambang banjir, hujan 3 hari', 'Awas ≥ 120 mm', 'Siaga ≥ 80 mm'), ('Ambang longsor, hujan 3 hari', 'Awas ≥ 90 mm', 'Siaga ≥ 60 mm'))):
            xq = xB + i * (hw + 6 * P); o += s.kotak(xq, ya, hw, hh, 'E6EAF0', 'roundRect', adj=7000) + s.tx(xq + 6 * P, ya + 3 * P, hw - 10 * P, hh * .42, [t], sz=720, b=True, an='ctr', wrap='none') + s.tx(xq + 6 * P, ya + hh * .48, hw - 10 * P, hh * .45, [[(a, '8F3F07', True), ('; ', TEKS, False), (b, 'B84E08', True)]], sz=760, an='ctr', wrap='none')
        o += s.p_sek(xC, y2, wC, 'longsor_putih', 'Rekaman layar pemantauan longsor')
        o += s.p_video(xC, y2 + 22 * P, wC, 112 * P)
        ym = y2 + 142 * P; o += s.p_sek(xC, ym, wC, 'cek_putih', 'Usulan mitigasi per jenis bencana')
        M = [('Banjir', 'Buka posko di kecamatan Awas dan Siaga; periksa tanggul; kirim perahu lebih dulu ke Aceh Barat'), ('Longsor', 'Tutup sementara ruas lereng rawan saat hujan lebat; ungsikan warga bawah tebing di kecamatan Awas'), ('Cuaca ekstrem', 'Pangkas pohon rawan; siagakan tim cepat BPBD'), ('Kekeringan', 'Lanjutkan pasokan air bersih ke Subang dan Banggai Kepulauan'), ('Gempa NTT', 'Tuntaskan hunian sementara bagi pengungsi'), ('Gunung api', 'Larang aktivitas di zona bahaya; siaga lahar Merapi dan Semeru saat hujan')]
        x_, _ = s.p_tabel(xC, ym + 22 * P, wC, [('Bencana', 58, 'l'), ('Langkah BPBD bersama BNPB', 221, 'l')], M, (s.PYB - ym - 37 * P) / len(M)); o += x_
        return o

    @staticmethod
    def pf(v):
        if v in ('', None): return '–'
        try: return f'{int(float(v)):,}'.replace(',', '.')
        except Exception: return str(v)

    def s_siaga(s):
        return s.kiri() + s.kanan()


dk = Gabung(ke, D, wa, w, T, None)
dk.BJ = None; dk.TANPA_BARU = True; dk.V3 = False; dk.KRIS_ISI = True; dk.ALT_RINCI = False; dk.INFO_PIL = True
dk.LAMPIRAN = True; dk.SIAGA = True; dk.GA_GAYAS = ['lingkaran']
import json as _j
_L = _j.load(open(os.path.join(S, 'lampiran.json'), encoding='utf-8'))
_hal = dk.lamp_halaman(_L)
_j.dump({'n': len(_hal)}, open(os.path.join(S, 'lampiran-hal.json'), 'w'))
def _jl(i):
    return [('Lampiran: ', INK, True), (f'{len(_L)} kab/kota', ORG, True), (f' berstatus banjir, 8 November 2026 ({i + 1}/{len(_hal)})', INK, True)]
dk.LAMP_TAMBAH = [(_jl(i), h, None) for i, h in enumerate(_hal)] + [([('Video sistem ', INK, True), ('pemantauan banjir', ORG, True)], (lambda: dk.kotak(548640, 1325880, 11094415, 5029200, 'E6EAF0', 'roundRect', adj=1500)), None)]
dk.I['peta_padat1'] = dk.I['banjir_putih'].replace('banjir-putih.png', 'peta-padat1.png'); dk.I['peta_padat2'] = dk.I['banjir_putih'].replace('banjir-putih.png', 'peta-padat2.png')
_pd = _j.load(open(os.path.join(S, 'padat.json'), encoding='utf-8')); dk.PD = _pd; dk.TG = '8-11 November'
_sc = 'C:/Users/USER/AppData/Local/Temp/claude/8477dca2efc2d380/9cd4954a-580a-4bd2-9624-23cdb3eb53f5/scratchpad/'
dk.Q4 = _j.load(open(_sc + 'kec4s.json', encoding='utf-8'))['rows']; dk.BS = {r['prov'] + '|' + r['kab'] for r in _j.load(open(_sc + 'lap.json', encoding='utf-8')) if not r['surut']}
_n5 = sum(1 for r in _pd['lp'] if r['st'] != 'Surut')
_H, _P = (lambda t_: (t_, ORG, True)), (lambda t_: (t_, INK, True))
dk.LAMP_TAMBAH += [
 ([_P('Banjir masih berdampak di '), _H(f'{_n5} kab/kota'), _P(' ('), _H('22 kecamatan'), _P(', '), _H('11.404 KK'), _P('); '), _H('8-11 November'), _P(' diprakirakan '), _H(f"{_pd['a']} kecamatan"), _P(' Awas dan '), _H(str(_pd['s'])), _P(' Siaga')], dk.padat_1, None),
 ([_P('Dua gudang BNPB menyimpan '), _H('269,3 ton'), _P(' logpal; kebutuhan Aceh dan Sumut masih kurang '), _H('4.693 selimut'), _P(' dan '), _H('2.500 family kit')], dk.padat_2, None),
 ([_P('Selain banjir, '), _H(f"{_pd['la'] + _pd['ls']} kecamatan"), _P(' berstatus Awas atau Siaga longsor pada 8-11 November; '), _H('8 kejadian'), _P(' lain berjalan, '), _H('3 gunung api'), _P(' Siaga')], dk.padat_3, None)]   # pemilik 8 Nov: halaman kosong tempat video
dk.GA = wa_harian.pvmbg(open(os.path.join(H8, 'wa-pvmbg.txt'), encoding='utf-8').read())
dk.lbl_kolom, dk.lbl_hot, dk.lbl_kum = '', 'firespot', ''
keluar = os.path.join(S, 'slide3-isi.pptx')
dk.bangun(os.path.join(G, 'cache', 'templat', 'harian-221026.pptx'), keluar)
from pptx import Presentation
# samakan posisi dan ukuran logo dengan slide lain deck ini (BNPB x 875,7 y 20,8 ukuran 41,1 x 51,9 pt; KRIS lebar 103 pt di kirinya)
from pptx.util import Pt
_p = Presentation(keluar)
for _sl in _p.slides:
    _tx = ' '.join(e.text or '' for e in _sl._element.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}t'))   # jangan pakai sh.text_frame: membuat txBody kosong di garis
    if 'Bencana lain:' not in _tx and 'Lampiran:' not in _tx and 'Video sistem' not in _tx and 'Banjir masih berdampak' not in _tx and 'Dua gudang BNPB' not in _tx and 'Selain banjir' not in _tx: continue
    for sh in _sl.shapes:
        if sh.shape_type == 13 and sh.top < Pt(100) and sh.left > Pt(650):
            if sh.width / sh.height > 3:
                h = Pt(103) * sh.height / sh.width; sh.left, sh.top, sh.width, sh.height = Pt(764.7), int(Pt(56) - h / 2), Pt(103), int(h)
            else:
                sh.left, sh.top, sh.width, sh.height = Pt(875.7), Pt(56 - 25.95), Pt(41.1), Pt(51.9)
    _A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
    for sh in _sl.shapes:
        _t = ''.join(e.text or '' for e in sh._element.iter(_A + 't'))
        if _t.startswith(('Bencana lain:', 'Lampiran:', 'Video sistem', 'Banjir masih berdampak', 'Dua gudang BNPB', 'Selain banjir')):   # judul: pusatnya di garis tengah yang sama dengan logo
            sh.top = int(Pt(56) - sh.height / 2)
            for bp in sh._element.iter(_A + 'bodyPr'): bp.set('anchor', 'ctr')
_p.save(keluar)
for i, sl in enumerate(Presentation(keluar).slides):
    t = ' '.join(sh.text_frame.text for sh in sl.shapes if sh.has_text_frame)
    if 'Bencana lain:' in t or 'Lampiran:' in t: print('HALAMAN', i + 1, t[:50])
print('LN', [(x['jenis'], x['lokasi'] or x['prov'], x['tangani']) for x in dk.LN], 'KR', [x['lokasi'] for x in dk.KR])
