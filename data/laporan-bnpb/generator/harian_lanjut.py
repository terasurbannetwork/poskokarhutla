"""Tiga slide tambahan Laporan Kejadian Bencana Harian (pemilik 10 Nov 2026): Bencana Hidrometeorologi, Bencana Geologi dan Vulkanologi, Prediksi Bencana.
Digambar dengan primitif harian.Deck supaya tampilannya sama dengan slide 1. Sumber angka:
- kejadian: teks WA Koordalops (urai_wa); gempa NTT: bahan-laphar.json di folder hari (salinan entri laphar);
- karhutla: hanya data sistem (peta_karhutla, kluster_hari), tidak dari Koordalops;
- gunung api: teks WA PVMBG di folder hari 1 s.d. tanggal laporan;
- prediksi: peringatan BMKG dari WA, banjir/longsor/rob/FWI dari sistem.
Pemakaian: B = siapkan(...); dk.HAL_TAMBAH = halaman(dk, B)."""
import datetime as dt, json, os, re, subprocess
import harian as H, wa_harian
from harian import NAVY, ORG, MERAH, KER, SLATE, INK, ABU, TEKS, T_NAVY, T_ORG, T_MERAH, T_KER, T_SLATE, f0

HID, T_HID, GEO, T_GEO = '2F6FB5', 'DCE7F5', '7A5230', 'EFE4D8'
X0, X1, Y0, YS, HS = 548640, 11643055, 1280160, 5468112, 822960
YB = YS - 91440   # batas bawah area isi, sejajar slide 1
f1 = lambda v: f'{v:.1f}'.replace('.', ',')
TGL = lambda d: f'{d.day} {H.BULAN[d.month - 1][:3]}'
KOND = {'selesai': (T_SLATE, SLATE, 'cek_slate'), 'surut': (T_ORG, ORG, 'banjir_oranye'), 'tangani': (T_NAVY, NAVY, 'orang_navy')}
IKON = {'Banjir': 'banjir_navy', 'Cuaca Ekstrem': 'angin_slate', 'Angin Kencang': 'angin_slate', 'Tanah Longsor': 'longsor_coklat'}


def _angka(t): return float(t.replace('.', '').replace(',', '.'))


def urai_wa(teks):
    """Teks WA Koordalops -> daftar kejadian: jenis, prov (kode), lokasi, baru, kk, luka, mengungsi, rumah {RB, RS, RR, rusak, terdampak}, status, sd."""
    kode = {re.sub(r'^Kep\. ', 'Kepulauan ', v): k for k, v in H.NAMA.items()}; kode.update({'NTT': '53', 'NTB': '52'})
    prov, cur, out = None, None, []
    for b in teks.splitlines():
        b = re.sub(r'\s+', ' ', b.replace('⁠', '')).strip()
        m = re.match(r'\*[A-Z]+\. Prov\. (.+?)\*$', b)
        if m: prov = m[1]; continue
        m = re.match(r'\d+\. Bencana Alam (.+?) di ((?:Kab\.|Kota|Prov\.) .+?) \((Kejadian Baru|Pengkinian Data)\)', b)
        if m:
            cur = {'jenis': m[1], 'lokasi': m[2], 'baru': m[3] == 'Kejadian Baru', 'prov': kode[prov]}; out.append(cur); continue
        m = re.match(r'- (Dampak|Pengungsi|Kerusakan|Penetapan Status|Kondisi [Mm]utakhir): ?(.*)', b)
        if m and cur is not None: cur[m[1].split()[0]] = m[2]
    for x in out:
        d, r = x.get('Dampak', ''), x.get('Kerusakan', '')
        m = re.search(r'±? ?([\d.]+) KK terdampak', d); x['kk'] = _angka(m[1]) if m else None
        x['luka'] = sum(int(a) for a in re.findall(r'(\d+)(?: \(\w+\))? jiwa (?:luka|LB)', d))
        m = re.search(r'([\d.]+) ?\(?[\w ]*\)? ?jiwa MD', d); x['md'] = _angka(m[1]) if m else 0
        p = x.get('Pengungsi', ''); m = re.search(r'([\d.]+) KK', p); x['mengungsi'] = _angka(m[1]) if m else 0
        m = re.search(r'±?([\d.]+) jiwa', p); x['pengungsi_jiwa'] = _angka(m[1]) if m else 0
        x['rumah'] = {}
        for n, t in re.findall(r'±? ?([\d.]+) unit (?:rumah|tumah) (RB|RS|RR|hanyut|terdampak|rusak)', r):
            t = 'RB' if t == 'hanyut' else t; x['rumah'][t] = x['rumah'].get(t, 0) + _angka(n)
        st = x.get('Penetapan', '-')
        m = re.match(r'(.*?) TMT.*?s\.?d\.? ?(\d\d)/(\d\d)/(\d{4})', st)
        x['status'] = m[1].strip() if m else None; x['sd'] = dt.date(int(m[4]), int(m[3]), int(m[2])) if m else None
    return out


def pm_wa(teks):
    return [(n.title().replace('Musi 2', 'Musi 2'), float(v), k.title()) for n, v, k in re.findall(r'^\* ([A-Z0-9 ]+?) ([\d.]+) \(([A-Z ]+)\)', teks, re.M)]


def seri_gunung(folder_laporan, T):
    """{'Merapi': {'hari': [tanggal], 'tipe': {'guguran': [..]}, 'siaga': bool}} dari teks WA PVMBG 1 s.d. T bulan berjalan."""
    hasil = {}
    for n in range(1, T.day + 1):
        d = T.replace(day=n)
        import jalur   # 13 Nov: folder hari pindah ke harian/<YYYY-MM>/<tanggal>; susunan lama harian-<tanggal> tetap dibaca
        f = next((p for p in (os.path.join(jalur.harian(d), 'wa-pvmbg.txt'), os.path.join(folder_laporan, f'harian-{d.isoformat()}', 'wa-pvmbg.txt'))
                  if os.path.exists(p)), None)
        if not f: continue
        for g in wa_harian.pvmbg(open(f, encoding='utf-8').read())['gunung']:
            nm = g['nama'].replace('Gn. ', ''); r = hasil.setdefault(nm, {'hari': [], 'isi': []})
            r['hari'].append(d); r['isi'].append({t.lower(): v for v, t in g.get('urai') or []})
    return hasil


def siapkan(S, T, ke, web, H_SISA, KH, wa_koordalops, wa_bmkg, w):
    """Kumpulkan semua angka tiga slide. Menulis prediksi.json dan peta_prediksi.png ke folder kerja ke."""
    K = urai_wa(wa_koordalops); B = {'T': T, 'K': K}
    B['hid'] = sorted([x for x in K if x['jenis'] in IKON], key=lambda x: (int(x['prov']), not x['baru']))
    assert B['hid'], 'tidak ada kejadian hidrometeorologi'
    B['pm'] = pm_wa(wa_bmkg)
    P = web['peta_karhutla.json']; i = P['hari'].index(H_SISA); B['h_sisa'] = dt.date.fromisoformat(H_SISA)
    B['karhutla'] = sorted(((P['prov'][k]['belum'][i] or 0, k, (KH['w'].get(k) or [0] * 7)[4] or 0) for k in P['prov']), reverse=True)
    B['bahan'] = json.load(open(os.path.join(S, 'bahan-laphar.json'), encoding='utf-8'))
    B['gempa_wa'] = next((x for x in K if x['jenis'] == 'Gempa Bumi'), None)   # 11 Nov: WA tanpa gempa -> slide geologi tidak bisa dibangun, prediksi tetap bisa
    G = B['bahan']['gempa']
    if B['gempa_wa']:
        assert sum(k[1] + k[2] for k in G['kab']) == B['gempa_wa']['md'], 'MD per kabupaten tidak sama dengan total WA'
        assert sum(k[3] for k in G['kab']) == B['gempa_wa']['pengungsi_jiwa'], 'pengungsi per kabupaten tidak sama dengan total WA'
    B['gunung'] = seri_gunung(os.path.dirname(S), T)
    B['bmkg'] = w
    w_dir = os.path.join(ke, 'lanjut'); os.makedirs(w_dir, exist_ok=True)
    u = lambda p: H.unduh_json('https://centurisk97.id/' + p, os.path.join(w_dir, p.replace('/', '-')))
    p72, rob, fwi = u('banjir/data/prakiraan72.json'), u('banjir/data/rob.json'), u('data/fwi.json')
    hari = [h for h in p72['hari'] if h >= T.isoformat()][:3]; B['pr_hari'] = [dt.date.fromisoformat(h) for h in hari]; B['pr_dibuat'] = p72['dibuat']
    idx = [p72['hari'].index(h) for h in hari]; agr = {}
    for k, v in p72['kec'].items():
        a = agr.setdefault(k.split('|')[0], {'b': [0] * len(idx), 'l': [0] * len(idx)})
        for j, n in enumerate(idx):
            for t in 'bl':
                if (v[t][n] or 0) >= 2: a[t][j] += 1
    B['pr'] = sorted(agr.items(), key=lambda kv: -(sum(kv[1]['b']) + sum(kv[1]['l'])))
    # 10 Nov alt 2: level tertinggi kecamatan per kabupaten di lokasi kejadian hidrometeorologi; kecamatan yang tidak ada di berkas = Normal
    B['lok_pred'] = []
    for x in B['hid']:
        kab = x['lokasi'].replace('Kab. ', ''); isi = [v for k, v in p72['kec'].items() if k.split('|')[:2] == [x['prov'], kab]]
        B['lok_pred'].append((kab, *([max([v[t][n] or 0 for v in isi] or [0]) for n in idx] for t in 'bl')))
    B['rob'] = sorted([r for r in rob['bmkg']['rob'] if r['tanggal_selesai'] >= T.isoformat()], key=lambda r: r['tanggal_selesai'], reverse=True)
    tg = [d for d in (h['tgl'] for h in fwi['grid'][0]['hari']) if d >= T.isoformat()][:4]; B['fwi_hari'] = [dt.date.fromisoformat(d) for d in tg]; fw = {}
    for g in fwi['grid']:
        a = fw.setdefault(str(g['prov']), {d: 0 for d in tg})
        for h in g['hari']:
            if h['tgl'] in a: a[h['tgl']] = max(a[h['tgl']], h['fwi'] or 0)
    B['fwi'] = sorted(((sum(a.values()) / len(a), k, [a[d] for d in tg]) for k, a in fw.items() if k in H.NAMA), reverse=True)
    kd = {re.sub(r'^Kep\. ', 'Kepulauan ', v): k for k, v in H.NAMA.items()}; kd.update({'Kep. Riau': kd.get('Kepulauan Riau', '21')})
    L = {kd[p]: 'sedang' for p in w['hujan'] if p in kd}
    B['tak_kenal'] = [p for p in w['hujan'] + w.get('siaga', []) + w.get('awas', []) if p not in kd]
    for p in w.get('siaga', []): L[kd[p]] = 'siaga'
    for p in w.get('awas', []): L[kd[p]] = 'awas'
    B['level'] = L; B['angin'] = [kd[p] for p in w.get('angin', []) if p in kd]
    json.dump(L, open(os.path.join(ke, 'prediksi.json'), 'w'))
    subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'harian_peta_prediksi.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
    print('lanjut: tak dikenal', B['tak_kenal'], '| rob aktif', len(B['rob']), '| hari prakiraan', hari)
    return B


# ---------------------------------------------------------- bagian gambar bersama
def panel(s, x, y, w, h, judul, c=NAVY):
    return s.kotak(x, y, w, h, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=int(70000 / min(w, h) * 100000)) + s.tx(x + 128016, y + 73152, w - 256032, 182880, [judul], sz=750, b=True, c=c, spc=100, wrap='none')


def kepala(s, kol, y, h=182880, sz=620):
    x0, x9 = kol[0][1], kol[-1][1] + kol[-1][2]
    o = s.kotak(x0, y, x9 - x0, h, NAVY, 'roundRect', adj=12000)
    for t, x, w, al in kol: o += s.tx(x + 45720, y, w - 91440, h, [t], sz=sz, b=True, c='FFFFFF', spc=40, al=al, an='ctr', wrap='none')
    return o


def strip(s, judul, butir):
    """Pita bawah sejajar 'Yang akan dilakukan BNPB' di slide 1; butir = [(ikon putih, kepala, isi)]."""
    o = s.kotak(X0, YS, X1 - X0, HS, 'FDF4EC', 'roundRect', adj=8889) + s.tx(694944, YS + 54864, 3657600, 164592, [judul], sz=750, b=True, c=ORG, spc=100)
    lb = (X1 - X0 - 292608) // len(butir)
    for i, (ik, jd, isi) in enumerate(butir):
        x = 694944 + i * lb
        if i: o += s.garis(x - 73152, YS + 283464, 0, 'F2D3BA', h=457200)
        o += s.kotak(x, YS + 320040, 329184, 329184, ORG, 'ellipse') + s.gambar(x + 73152, YS + 393192, 182880, 182880, ik)
        o += s.tx(x + 402336, YS + 237744, lb - 512064, 182880, [jd], sz=880, b=True, an='ctr', wrap='none') + s.tx(x + 402336, YS + 420624, lb - 512064, 347472, [isi], sz=780, c=TEKS)
    return o


def legenda(s, x, y, w, ent, sz=680):
    lebar = sum(109728 + 45720 + len(t) * sz * 62 + 118872 for _, t in ent) - 118872; lx = x + (w - lebar) / 2; o = ''
    for c, t in ent:
        o += s.kotak(lx, y + 27432, 109728, 109728, c, 'roundRect', adj=20000) + s.tx(lx + 155448, y, 1463040, 164592, [t], sz=sz, c=TEKS, an='ctr', wrap='none'); lx += 155448 + len(t) * sz * 62 + 118872
    return o


def batang(s, x, y, w, h, nilai, warna, skala):
    """Batang bertumpuk mendatar; nilai dan warna sejajar; skala = nilai untuk lebar penuh. Mengembalikan xml dan ujung kanan."""
    o, xk = '', x
    for v, c in zip(nilai, warna):
        lb = w * v / skala if skala else 0
        if lb > 0: o += s.kotak(xk, y, max(lb, 9144), h, c); xk += lb
    return o, xk


# ---------------------------------------------------------- slide: Bencana Hidrometeorologi
def judul_hid(B):
    K = B['hid']; P, Q = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
    return [P('Hidrometeorologi: '), Q(f'{len(K)} kejadian'), P(f" di {len({x['prov'] for x in K})} provinsi, "), Q(f"{sum(1 for x in K if x['baru'])} baru"), P(', '), Q(f"{f0(sum(x['kk'] or 0 for x in K))} KK"), P(' terdampak')]


def s_hid(s, B):
    K, T = B['hid'], B['T']
    rb = sum(x['rumah'].get('RB', 0) for x in K)
    T_ = [('papan_n', T_NAVY, f0(len(K)), f"kejadian ditangani, {sum(1 for x in K if x['baru'])} baru", NAVY),
          ('orang_navy', T_HID, f0(sum(x['kk'] or 0 for x in K)), 'KK terdampak, Aceh masih didata', HID),
          ('tenda_oranye', T_ORG, f0(sum(x['mengungsi'] for x in K)), 'KK mengungsi', ORG),
          ('hati_merah', T_MERAH, f0(sum(x['luka'] for x in K)), 'jiwa luka, nihil meninggal', MERAH),
          ('rumah_merah', T_MERAH, f0(rb), 'rumah rusak berat atau hanyut', MERAH)]
    kw = (X1 - X0 - 4 * 91440) // 5; o = ''
    for i, t in enumerate(T_): o += s.kartu(X0 + i * (kw + 91440), Y0, *t, w=kw)
    # tabel kejadian
    Yp = Y0 + 512064 + 91440; Hp = YB - Yp; Wp = 6583680
    o += panel(s, X0, Yp, Wp, Hp, 'KEJADIAN DAN STATUS PENANGANAN')
    xl = X0 + 109728; L = [('PROVINSI', 502920, 'l'), ('BENCANA', 1051560, 'l'), ('KAB/KOTA', 1014984, 'l'), ('KK', 502920, 'ctr'), ('MENGUNGSI', 603504, 'ctr'), ('STATUS', 1014984, 'l')]
    kol, x = [], xl
    for t, w, al in L: kol.append((t, x, w, al)); x += w
    kol.append(('KONDISI', x, X0 + Wp - 109728 - x, 'l'))
    yk = Yp + 292608; o += kepala(s, kol, yk)
    C = {t: (x_, w_) for t, x_, w_, _ in kol}
    y0 = yk + 182880 + 18288; rp = (Yp + Hp - 54864 - y0) // len(K)
    for n, x in enumerate(K):
        y = y0 + n * rp; awal = n == 0 or K[n - 1]['prov'] != x['prov']
        if n: o += s.garis(xl if awal else C['BENCANA'][0], y, X0 + Wp - 109728 - (xl if awal else C['BENCANA'][0]), 'D1D5DB' if awal else 'F1F2F4')
        if awal: o += s.tx(C['PROVINSI'][0] + 45720, y, C['PROVINSI'][1] - 45720, rp, [s.pv(x['prov'])], sz=760, b=True, an='ctr', wrap='none')
        xb, wb = C['BENCANA']; d = 173736
        o += s.gambar(xb + 45720, y + (rp - d) // 2, d, d, IKON[x['jenis']]) + s.tx(xb + 265176, y + rp // 2 - 155448, wb - 265176, 155448, [x['jenis']], sz=760, b=True, an='b', wrap='none')
        o += s.tx(xb + 265176, y + rp // 2, wb - 265176, 146304, ['Baru' if x['baru'] else 'Pengkinian'], sz=660, b=x['baru'], c=ORG if x['baru'] else ABU, an='t', wrap='none')
        lok = x['lokasi'].replace('Kab. ', '').replace('Kota ', 'Kota ')
        o += s.tx(C['KAB/KOTA'][0] + 45720, y, C['KAB/KOTA'][1] - 45720, rp, [lok], sz=740, c=INK, an='ctr', wrap='none')
        o += s.tx(C['KK'][0], y, C['KK'][1], rp, [f"±{f0(x['kk'])}" if x['kk'] else 'Didata'], sz=760 if x['kk'] else 660, b=bool(x['kk']), c=INK if x['kk'] else ABU, al='ctr', an='ctr', wrap='none')
        o += s.tx(C['MENGUNGSI'][0], y, C['MENGUNGSI'][1], rp, [f"{f0(x['mengungsi'])} KK" if x['mengungsi'] else 'Nihil'], sz=760 if x['mengungsi'] else 680, b=bool(x['mengungsi']), c=ORG if x['mengungsi'] else ABU, al='ctr', an='ctr', wrap='none')
        xs, ws = C['STATUS']
        if x['status']:
            st = re.sub(r' ke Pemulihan', '', x['status']).replace('Siaga Darurat Provinsi', 'Siaga provinsi').replace('Tanggap Darurat', 'Tanggap darurat').replace('Transisi Darurat', 'Transisi darurat')
            hbs = x['sd'] == T
            o += s.tx(xs + 45720, y + rp // 2 - 155448, ws - 45720, 155448, [st], sz=720, b=True, an='b', wrap='none')
            o += s.tx(xs + 45720, y + rp // 2, ws - 45720, 146304, [f'Berakhir {TGL(x["sd"])}' if hbs else f's.d. {TGL(x["sd"])}'], sz=680, b=hbs, c=MERAH if hbs else TEKS, an='t', wrap='none')
        else: o += s.tx(xs + 45720, y, ws, rp, ['Belum ada status'], sz=680, c=ABU, an='ctr', wrap='none')
        kd = B['kondisi'].get(x['lokasi'].replace('Kab. ', ''))
        if kd:
            t_, w_, ik = KOND[kd[1]]; hp = 173736
            o += s.pil(C['KONDISI'][0] + 45720, y + (rp - hp) // 2, kd[0], t_, w_, ik, sz=660, h=hp)[0]
    # rumah rusak per lokasi
    Xk = X0 + Wp + 91440; Wk = X1 - Xk; H1 = 1691640
    o += panel(s, Xk, Yp, Wk, H1, 'RUMAH RUSAK PER LOKASI')
    S_ = ('RB', 'RS', 'RR', 'rusak'); WR = (MERAH, ORG, KER, 'A7B3C2')
    R = sorted([x for x in K if any(x['rumah'].get(t) for t in S_)], key=lambda x: -sum(x['rumah'].get(t, 0) for t in S_))
    mk = max(sum(x['rumah'].get(t, 0) for t in S_) for x in R)
    xn, xb, wb = Xk + 128016, Xk + 1188720, Wk - 1188720 - 548640; y0 = Yp + 283464; rp = (H1 - 283464 - 256032) // len(R)
    for n, x in enumerate(R):
        y = y0 + n * rp; v = [x['rumah'].get(t, 0) for t in S_]
        o += s.tx(xn, y, 1051560, rp, [x['lokasi'].replace('Kab. ', '')], sz=720, c=INK, an='ctr', wrap='none')
        g_, xe = batang(s, xb, y + rp * .2, wb, rp * .6, v, WR, mk); o += g_ + s.tx(xe + 45720, y, 502920, rp, [f0(sum(v))], sz=780, b=True, an='ctr', wrap='none')
    o += legenda(s, Xk, Yp + H1 - 210312, Wk, list(zip(WR, ('rusak berat, hanyut', 'rusak sedang', 'rusak ringan', 'belum dirinci'))), sz=640)
    # karhutla (atau infrastruktur terdampak pada alt 2) dan PM2,5
    Yb = Yp + H1 + 91440; Hb = YB - Yb; Wm = (Wk - 91440) // 2; y0 = Yb + 283464
    if B.get('infra'):   # 10 Nov pemilik: "di slide mana pun gausah bahas tentang karhutla dulu"
        o += panel(s, Xk, Yb, Wm, Hb, 'INFRASTRUKTUR TERDAMPAK')
        mk = max(v for _, v in B['infra']); rp = (Hb - 283464 - 54864) // len(B['infra'])
        for n, (nm, v) in enumerate(B['infra']):
            y = y0 + n * rp; o += s.tx(Xk + 109728, y, 1051560, rp, [nm], sz=700, c=INK, an='ctr', wrap='none')
            g_, xe = batang(s, Xk + 1124712, y + rp * .22, Wm - 1124712 - 320040, rp * .56, [v], [NAVY], mk); o += g_ + s.tx(xe + 36576, y, 283464, rp, [f0(v)], sz=760, b=True, an='ctr', wrap='none')
    else:
        TOP = [x for x in B['karhutla'] if round(x[0]) > 0][:5]
        o += panel(s, Xk, Yb, Wm, Hb, f"KARHUTLA BELUM PADAM {TGL(B['h_sisa']).upper()}")
        mk = max([x[0] for x in TOP] or [1]); rp = (Hb - 283464 - 54864) // max(1, len(TOP))
        for n, (v, k, fs) in enumerate(TOP):
            y = y0 + n * rp; o += s.tx(Xk + 109728, y, 548640, rp, [s.pv(k)], sz=700, c=INK, an='ctr', wrap='none')
            g_, xe = batang(s, Xk + 667512, y + rp * .22, Wm - 667512 - 603504, rp * .56, [v], [ORG], mk); o += g_ + s.tx(xe + 36576, y, 594360, rp, [[(f'{f0(v)} ha', INK, True)]], sz=700, an='ctr', wrap='none')
    Xm = Xk + Wm + 91440; pm = B['pm'][:5]
    o += panel(s, Xm, Yb, Wm, Hb, 'PM2,5 TERTINGGI, µg/m³')
    mk = max(p[1] for p in pm); rp = (Hb - 283464 - 54864) // len(pm)
    for n, (nm, v, kl) in enumerate(pm):
        y = y0 + n * rp; c = MERAH if v >= 150 else KER
        o += s.tx(Xm + 109728, y, 905256, rp, [nm.replace('Talang Betutu Palembang', 'Talang Betutu').replace('Musi 2 Palembang', 'Musi 2')], sz=700, c=INK, an='ctr', wrap='none')
        g_, xe = batang(s, Xm + 758952, y + rp * .22, Wm - 758952 - 420624, rp * .56, [v], [c], mk); o += g_ + s.tx(xe + 36576, y, 420624, rp, [f1(v)], sz=720, b=True, c=c, an='ctr', wrap='none')
    return o + strip(s, 'PERLU DIPERHATIKAN', B['strip_hid'])


# ---------------------------------------------------------- slide: Geologi dan Vulkanologi
def judul_geo(B):
    g = B['bahan']['gempa']['huntara']; n = sum(1 for v in B['gunung'].values()); P, Q = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
    return [P('Gempa NTT: '), Q(f0(g['selesai'])), P(' dari '), Q(f0(g['selesai'] + g['lebih50'] + g['kurang50'])), P(' huntara selesai, '), Q(f'{n} gunung api'), P(' tetap Siaga')]


def s_geo(s, B):
    G, W = B['bahan']['gempa'], B['gempa_wa']; Hp = YB - Y0; Wl = 6217920; o = panel(s, X0, Y0, Wl, Hp, f"GEMPA BUMI NTT M {G['kekuatan']}, {G['tanggal'].upper()}")
    hp = 173736; st = f"Transisi darurat s.d. {TGL(W['sd'])} {W['sd'].year}"
    wp_ = 120000 + len(st) * 700 * 62 + hp * .9
    o += s.pil(X0 + Wl - 128016 - wp_, Y0 + 64008, st, T_NAVY, NAVY, 'kalender_navy', sz=660, h=hp)[0]
    rm = sum(W['rumah'].values())
    T_ = [('awas_merah', T_MERAH, f0(W['md']), 'jiwa meninggal', MERAH), ('tenda_oranye', T_ORG, f0(W['pengungsi_jiwa']), 'jiwa mengungsi', ORG),
          ('rumah_navy', T_NAVY, f0(rm), 'rumah rusak', NAVY), ('gempa_slate', T_SLATE, f0(G['susulan']), 'gempa susulan', SLATE)]
    xl = X0 + 109728; WL = Wl - 219456; kw = (WL - 3 * 73152) // 4; yt = Y0 + 292608
    for i, t in enumerate(T_): o += s.kartu(xl + i * (kw + 73152), yt, *t, w=kw)
    # tabel berbatang per kabupaten
    C = [('KABUPATEN', xl, 1143000, 'l'), ('MENINGGAL', xl + 1143000, 1554480, 'l'), ('PENGUNGSI, JIWA', xl + 2697480, 1609344, 'l'), ('KEBUTUHAN R3P, RP TRILIUN', xl + 4306824, WL - 4306824, 'l')]
    yk = yt + 512064 + 73152; o += kepala(s, C, yk)
    Hh = 758952; y0 = yk + 182880 + 18288; y9 = Y0 + Hp - Hh - 36576; rp = (y9 - y0) // len(G['kab'])
    mm = max(k[1] + k[2] for k in G['kab']); mp = max(k[3] for k in G['kab']); mr = max(k[4] for k in G['kab'])
    for n, (nm, a, b, p, r) in enumerate(G['kab']):
        y = y0 + n * rp
        if n: o += s.garis(xl, y, WL, 'F1F2F4')
        o += s.tx(xl + 45720, y, 1097280, rp, [nm], sz=760, c=INK, b=True, an='ctr', wrap='none')
        g_, xe = batang(s, C[1][1] + 45720, y + rp * .22, 1143000, rp * .56, [a + b], [MERAH], mm); o += g_ + s.tx(xe + 36576, y, 365760, rp, [f0(a + b)], sz=760, b=True, an='ctr', wrap='none')
        if p:
            g_, xe = batang(s, C[2][1] + 45720, y + rp * .22, 1051560, rp * .56, [p], [ORG], mp); o += g_ + s.tx(xe + 36576, y, 548640, rp, [f0(p)], sz=760, b=True, an='ctr', wrap='none')
        else: o += s.tx(C[2][1] + 45720, y, 548640, rp, ['Nihil'], sz=680, c=ABU, an='ctr', wrap='none')
        g_, xe = batang(s, C[3][1] + 45720, y + rp * .22, C[3][2] - 502920, rp * .56, [r], [NAVY], mr); o += g_ + s.tx(xe + 36576, y, 420624, rp, [f'{r / 1e12:.2f}'.replace('.', ',')], sz=760, b=True, an='ctr', wrap='none')
    # huntara
    Hu = G['huntara']; tot = Hu['selesai'] + Hu['lebih50'] + Hu['kurang50']; yh = Y0 + Hp - Hh
    o += s.garis(xl, yh, WL, 'D1D5DB') + s.tx(xl, yh + 36576, WL, 164592, [[('PROGRES HUNTARA, ', NAVY, True), (f"{f0(tot)} unit di 7 kabupaten, {f0(Hu['lahan'])} unit lagi penyiapan lahan", TEKS, False)]], sz=720, spc=20, wrap='none')
    yb = yh + 219456; hb = 228600; wr = (HUN := [(Hu['selesai'], '2E7D5B', 'FFFFFF', 'selesai'), (Hu['lebih50'], 'E8A33D', INK, 'progres di atas 50%'), (Hu['kurang50'], 'D1D5DB', INK, 'progres di bawah 50%')]) and WL; xb = xl
    for v, c, ct, lab in HUN:
        lb = wr * v / tot; o += s.kotak(xb, yb, lb, hb, c) + s.tx(xb, yb, lb, hb, [f'{f0(v)}  ({f1(v / tot * 100)}%)'], sz=760, b=True, c=ct, al='ctr', an='ctr', wrap='none'); xb += lb
    o += legenda(s, xl, yb + hb + 36576, WL, [(c, lab) for _, c, _, lab in HUN], sz=660)
    # gunung api
    Xk = X0 + Wl + 91440; Wk = X1 - Xk; o += panel(s, Xk, Y0, Wk, Hp, 'GUNUNG API LEVEL III, AKTIVITAS 10 HARI', c=GEO)
    lv = B['bmkg_ga']['level']; tl = sum(lv.values()); xi = Xk + 128016; WI = Wk - 256032; yl = Y0 + 292608; xb = xi; LB_MIN = 548640
    kcl = [k for k in lv if 0 < lv[k] and WI * lv[k] / tl < LB_MIN]; sisa = WI - LB_MIN * len(kcl); tb = sum(v for k, v in lv.items() if k not in kcl)   # segmen kecil tetap terbaca namanya
    for k, c, ct in (('Awas', MERAH, 'FFFFFF'), ('Siaga', ORG, 'FFFFFF'), ('Waspada', 'E8A33D', INK), ('Normal', 'CFE3D6', INK)):
        lb = LB_MIN if k in kcl else sisa * lv[k] / tb
        if lv[k]: o += s.kotak(xb, yl, lb, 201168, c) + s.tx(xb, yl, lb, 201168, [f'{lv[k]} {k}'], sz=720, b=True, c=ct, al='ctr', an='ctr', wrap='none')
        xb += lb
    UK = {'Semeru': ('letusan', 'letusan/erupsi'), 'Merapi': ('guguran', 'guguran'), 'Anak Krakatau': ('hybrid', 'hybrid')}
    yr = yl + 201168 + 73152; rh = (Y0 + Hp - 45720 - yr) // len(UK); B['gunung_insight'] = {}
    for n, (nm, (kunci, lab)) in enumerate(UK.items()):
        R = B['gunung'][nm]; y = yr + n * rh; ser = [next((v for t, v in d.items() if t.startswith(kunci)), 0) for d in R['isi']]
        if n: o += s.garis(xi, y, WI, 'E5E7EB')
        rt = sum(ser[:-1]) / max(1, len(ser) - 1); kini = ser[-1]; B['gunung_insight'][nm] = (kini, rt, lab)
        dd = 201168
        o += s.kotak(xi, y + 64008, dd, dd, MERAH if any(g['nama'].endswith(nm) and g['level'] == 'Awas' for g in B['bmkg_ga']['gunung']) else ORG, 'triangle')
        o += s.tx(xi + dd + 54864, y + 45720, 1188720, 237744, [nm], sz=880, b=True, an='ctr', wrap='none')
        o += s.tx(xi, y + 301752, 1417320, 301752, [[(f0(kini), ORG, True), (' ' + lab, TEKS, False)]], sz=1300, an='ctr', wrap='none') if False else s.tx(xi, y + 301752, 548640, 301752, [f0(kini)], sz=1700, b=True, c=ORG, an='ctr', wrap='none') + s.tx(xi + 512064, y + 301752, 960120, 301752, [f'gempa {lab}', f'rata-rata {f1(rt)} per hari'], sz=660, c=TEKS, an='ctr', wrap='none')
        lain = [f'{v} {t}' for t, v in R['isi'][-1].items() if not t.startswith(kunci)][:4]
        o += s.tx(xi, y + rh - 228600, 1508760, 201168, [', '.join(lain)], sz=620, c=ABU, an='ctr', wrap='none') if False else ''
        # batang 10 hari
        xg, wg = xi + 1554480, WI - 1554480; yg, hg = y + 91440, rh - 283464; mx = max(ser + [1]); bw = wg / len(ser)
        for i, v in enumerate(ser):
            t_ = hg * v / mx; c = ORG if i == len(ser) - 1 else 'C9D3DE'
            if v: o += s.kotak(xg + i * bw + bw * .14, yg + hg - t_, bw * .72, t_, c)
            o += s.tx(xg + i * bw - 45720, yg + hg + 9144, bw + 91440, 118872, [str(R['hari'][i].day)], sz=620, c=ABU if i < len(ser) - 1 else ORG, b=i == len(ser) - 1, al='ctr', an='t', wrap='none')
            if v and (v == mx or i == len(ser) - 1): o += s.tx(xg + i * bw - 91440, yg + hg - t_ - 128016, bw + 182880, 128016, [str(v)], sz=660, b=True, c=ORG if i == len(ser) - 1 else ABU, al='ctr', an='b', wrap='none')
        o += s.garis(xg, yg + hg, wg, 'BFC5CC')
    return o + strip(s, 'PERLU DIPERHATIKAN', B['strip_geo'](B))


# ---------------------------------------------------------- slide: Prediksi Bencana
def judul_pred(B):
    w = B['bmkg']; pk = [(max(v['b']), k) for k, v in B['pr']]; n, k_ = max(pk); P, Q = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
    v_ = dict(B['pr'])[k_]['b']; tg = B['pr_hari'][v_.index(n)]; nama_ = '' if H.NAMA[k_] in w['awas'] else f' {H.NAMA[k_]}'
    return [P('Prediksi 3 hari: '), Q(' dan '.join(w['awas'])), P(' Awas hujan sangat lebat, '), Q(f'{n} kecamatan'), P(f'{nama_} Siaga dan Awas banjir pada {TGL(tg)}')]


def warna_sel(v):
    return ('F3F5F8', ABU) if v == 0 else ('FBE7D6', INK) if v < 10 else ('F2B98A', INK) if v < 30 else (ORG, 'FFFFFF')


FW = ((0, 'E5E7EB', INK, 'rendah'), (2, T_KER, INK, 'sedang'), (7, 'F2B98A', INK, 'tinggi'), (14, MERAH, 'FFFFFF', 'sangat tinggi'))


def warna_fwi(v):
    return next(x for x in reversed(FW) if v >= x[0])


def s_pred(s, B):
    Wl = 6217920; Hp = YB - Y0; w = B['bmkg']; o = panel(s, X0, Y0, Wl, Hp, f"PERINGATAN DINI BMKG, {w['periode'].upper().replace('NOVEMBER 2026', 'NOV').replace('–', 'SAMPAI')}")
    s.I['peta_prediksi'] = os.path.join(s.ke, 'peta_prediksi.png')
    MW = Wl - 219456; MH = MW * 693 // 1848; MX = X0 + 109728; MY = Y0 + 265176
    o += s.gambar(MX, MY, MW, MH, 'peta_prediksi')
    TT = s.TT; GES = {'11': (0, 0), '12': (0, 0), '13': (0, 0)}
    for k, lv_ in B['level'].items():
        if lv_ == 'sedang': continue
        px, py = TT['pusat'][k]; cx, cy = MX + px / TT['PW'] * MW, MY + py / TT['PH'] * MH; c = MERAH if lv_ == 'awas' else ORG
        kiri = False   # label di kanan provinsi: sisi laut barat Sumatra keluar panel
        nm = H.NAMA[k]; lw = 110000 + len(nm) * 760 * 62 + 330000; hl = 182880; xk = cx - lw - 73152 if kiri else cx + 73152
        o += s.kotak(xk, cy - hl / 2, lw, hl, 'FFFFFF', 'roundRect', ln=c, adj=30000, lw=12700) + s.tx(xk, cy - hl / 2, lw, hl, [[(nm + ' ', INK, True), (lv_.capitalize(), c, True)]], sz=720, al='ctr', an='ctr', wrap='none')
        o += s.garis(min(cx, xk + lw if kiri else xk), cy, 73152, c, t=12700)
    for k in B['angin']:
        px, py = TT['pusat'][k]; cx, cy = MX + px / TT['PW'] * MW, MY + py / TT['PH'] * MH; d = 201168
        o += s.kotak(cx - d / 2, cy - d / 2, d, d, '0E7490', 'ellipse', ln='FFFFFF', lw=12700) + s.gambar(cx - d * .32, cy - d * .32, d * .64, d * .64, 'angin_putih')
    yl = MY + MH + 18288
    ent = [(MERAH, 'Awas, hujan sangat lebat sampai ekstrem'), (ORG, 'Siaga, hujan lebat'), (T_HID, 'hujan sedang'), ('0E7490', 'angin kencang')]
    o += legenda(s, MX, yl, MW, ent, sz=680)
    # rob
    yr = yl + 201168; o += s.garis(MX, yr, MW, 'D1D5DB'); R = list({r['wilayah']: r for r in reversed(B['rob'])}.values())[::-1][:10]   # satu baris per wilayah, tanggal berakhir terjauh
    o += s.tx(MX, yr + 27432, MW, 164592, [[('BANJIR ROB, ', NAVY, True), (f"{len(B['rob'])} peringatan BMKG masih berlaku pada {TGL(B['T'])}", TEKS, False)]], sz=720, spc=20, wrap='none')
    y0 = yr + 201168; n_br = (len(R) + 1) // 2; rp = min((Y0 + Hp - 36576 - y0) // max(1, n_br), 192024); wk = MW // 2
    for i, r in enumerate(R):
        x = MX + (i // n_br) * wk; y = y0 + (i % n_br) * rp; sd = dt.date.fromisoformat(r['tanggal_selesai'])
        o += s.gambar(x, y + (rp - 128016) // 2, 128016, 128016, 'banjir_navy') + s.tx(x + 164592, y, wk - 932688, rp, [r['wilayah']], sz=720, c=INK, b=True, an='ctr', wrap='none')
        o += s.tx(x + wk - 768096, y, 640080, rp, [f's.d. {TGL(sd)}'], sz=700, c=TEKS, al='r', an='ctr', wrap='none')
    # kanan atas: peta panas banjir dan longsor
    Xk = X0 + Wl + 91440; Wk = X1 - Xk; H1 = 2286000; o += panel(s, Xk, Y0, Wk, H1, 'KECAMATAN SIAGA DAN AWAS, 3 HARI KE DEPAN')
    Pr = [(k, v) for k, v in B['pr'] if sum(v['b']) + sum(v['l']) > 0][:6]; xi = Xk + 128016; WI = Wk - 256032; xc = xi + 1188720; sel = (WI - 1188720 - 118872) // 6
    yg = Y0 + 283464
    for j, (lab, c, ic) in enumerate((('BANJIR', HID, 'banjir_navy'), ('LONGSOR', GEO, 'longsor_coklat'))):
        xg = xc + j * (3 * sel + 118872)
        o += s.gambar(xg + sel * 1.5 - 310896, yg + 18288, 128016, 128016, ic) + s.tx(xg, yg, 3 * sel + 228600, 164592, [lab], sz=700, b=True, c=c, al='ctr', an='ctr', spc=40, wrap='none')
        for i, d in enumerate(B['pr_hari']): o += s.tx(xg + i * sel, yg + 164592, sel, 146304, [TGL(d)], sz=640, c=ABU, al='ctr', an='ctr', wrap='none')
    y0 = yg + 164592 + 155448; rp = (Y0 + H1 - 246888 - y0) // max(1, len(Pr))
    for n, (k, v) in enumerate(Pr):
        y = y0 + n * rp; o += s.tx(xi, y, 1170432, rp, [H.NAMA[k]], sz=740, b=True, c=INK, an='ctr', wrap='none')
        for j, t in enumerate('bl'):
            xg = xc + j * (3 * sel + 118872)
            for i, val in enumerate(v[t]):
                f_, tc = warna_sel(val); o += s.kotak(xg + i * sel + 9144, y + 9144, sel - 18288, rp - 18288, f_, 'roundRect', adj=9000) + s.tx(xg + i * sel, y, sel, rp, [f0(val) if val else '–'], sz=760, b=bool(val), c=tc, al='ctr', an='ctr', wrap='none')
    o += legenda(s, Xk, Y0 + H1 - 210312, Wk, [('FBE7D6', '1 sampai 9 kecamatan'), ('F2B98A', '10 sampai 29'), (ORG, '30 atau lebih')], sz=660)
    Yb = Y0 + H1 + 91440; Hb = Y0 + Hp - Yb
    if B.get('tanpa_karhutla'):   # 10 Nov alt 2: lokasi yang sedang terdampak, level tertinggi per kabupaten 3 hari ke depan; grid kolom sama dengan panel di atasnya
        o += panel(s, Xk, Yb, Wk, Hb, 'LOKASI TERDAMPAK, STATUS 3 HARI KE DEPAN')
        LV = (('F3F5F8', ABU, 'Normal'), (T_KER, INK, 'Waspada'), (ORG, 'FFFFFF', 'Siaga'), (MERAH, 'FFFFFF', 'Awas'))
        yg = Yb + 256032
        for j, lab in enumerate(('Banjir', 'Longsor')):
            xg = xc + j * (3 * sel + 118872)
            o += s.tx(xg, yg, 3 * sel, 128016, [lab], sz=660, b=True, c=HID if j == 0 else GEO, al='ctr', an='ctr', wrap='none')
            for i, d in enumerate(B['pr_hari']): o += s.tx(xg + i * sel, yg + 128016, sel, 118872, [TGL(d)], sz=620, c=ABU, al='ctr', an='ctr', wrap='none')
        y0 = yg + 256032; rp = (Yb + Hb - 210312 - y0) // len(B['lok_pred'])
        for n, (nm, b_, l_) in enumerate(B['lok_pred']):
            y = y0 + n * rp; o += s.tx(xi, y, 1170432, rp, [nm], sz=720, b=True, c=INK, an='ctr', wrap='none')
            for j, vs in enumerate((b_, l_)):
                for i, v in enumerate(vs):
                    f_, tc, t_ = LV[v]; xg = xc + j * (3 * sel + 118872) + i * sel
                    o += s.kotak(xg + 9144, y + 6096, sel - 18288, rp - 12192, f_, 'roundRect', adj=9000) + s.tx(xg, y, sel, rp, [t_], sz=620, b=v > 0, c=tc, al='ctr', an='ctr', wrap='none')
        o += legenda(s, Xk, Yb + Hb - 192024, Wk, [(f_, t_.lower()) for f_, _, t_ in LV], sz=660)
        return o + strip(s, 'YANG DIWASPADAI', B['strip_pred'](B))
    # kanan bawah: FWI
    o += panel(s, Xk, Yb, Wk, Hb, 'BAHAYA KARHUTLA, FWI TERTINGGI PER PROVINSI', c=ORG)
    Fw = B['fwi'][:5]; xc = xi + 1188720; sel = (WI - 1188720) // len(B['fwi_hari']); yg = Yb + 265176
    for i, d in enumerate(B['fwi_hari']): o += s.tx(xc + i * sel, yg, sel, 146304, [TGL(d)], sz=640, c=ABU, al='ctr', an='ctr', wrap='none')
    y0 = yg + 155448; rp = (Yb + Hb - 228600 - y0) // len(Fw)
    for n, (_, k, vals) in enumerate(Fw):
        y = y0 + n * rp; o += s.tx(xi, y, 1170432, rp, [H.NAMA[k]], sz=740, b=True, c=INK, an='ctr', wrap='none')
        for i, val in enumerate(vals):
            _, f_, tc, _l = warna_fwi(val); o += s.kotak(xc + i * sel + 9144, y + 9144, sel - 18288, rp - 18288, f_, 'roundRect', adj=9000) + s.tx(xc + i * sel, y, sel, rp, [f1(val)], sz=740, b=True, c=tc, al='ctr', an='ctr', wrap='none')
    o += legenda(s, Xk, Yb + Hb - 192024, Wk, [(c, l) for _, c, _t, l in FW], sz=660)
    return o + strip(s, 'YANG DIWASPADAI', B['strip_pred'](B))


def halaman(dk, B):
    return [(judul_hid(B), lambda: s_hid(dk, B)), (judul_geo(B), lambda: s_geo(dk, B)), (judul_pred(B), lambda: s_pred(dk, B))]
