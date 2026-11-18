"""Laporan Penanganan Pengendalian Karhutla untuk bot WA (scripts/wa/otomatis.mjs), format sama dengan laporan manual 13 Nov 2026
(penanganan-karhutla/2026-11/2026-11-13/jalan.py + bingkai.py), cut-off 18.00 WIB (pemilik 16 Nov 2026).

- D-2 dan D-1: angka website hari itu sendiri (harian30, kluster_hari, peta_karhutla); luas dan padam = hari utuh sebelumnya (9 Nov pemilik),
  belum padam = hari kalender.
- Hari laporan D: hotspot, luas, belum padam, padam dihitung sendiri (satelit.hitung, rumus website) atas FIRMS segar s.d. cut-off (6 Nov pemilik:
  satu kolom satu hari yang sama); firespot D dari kluster.json website. Situs yang tertinggal dari FIRMS hanya dicatat di log: bot tidak
  memicu titik.yml (segar_situs.jamin menunggu sampai 100 menit, lebih lama dari batas bot).
- Peta choropleth (10 Nov), pil PM2,5 dari riwayat udara website, cuaca Open-Meteo hanya sel 6 provinsi tabel.
- Slide Operasi bila ada teks WA Satgas; armada dari Excel 'Gelar Kekuatan Satgas Udara Karhutla' kolom Olah Yuda 'Tetap Lanjut Operasi'
  (13 Nov pemilik), tanpa Excel dari teks Satgas. Tanpa kartu PENANGANAN dan PERSONEL (10 Nov).
- Dibingkai mesin ppt-konsultan (lewat_deck.bingkai, format 'penanganan'), dua bagian Situasi dan Operasi.

    python penanganan_otomatis.py --tanggal 2026-11-13 [--jam 18:00] [--operasi wa_satgas.txt] [--gelar gelar.xlsx] [--bmkg b.txt] --out DIR [--isian isian.json]

Bot laporan (BL-06): nama shape stabil s<n>_<peran> di deck akhir, <deck>.kunci.json selalu ditulis (angka hotspot, firespot, luas terbakar,
belum padam), --isian opsional (ISIAN_PENANGANAN; mesin penamaan dan saring isian di harian_ringkas.py).

--firespot situs|firms (K18 bot laporan, 18 Nov 2026). situs (bawaan) = perilaku di atas. firms = firespot semua kolom dari firespot_hari.seri
(mesin situs scripts/data/harian.py atas FIRMS langsung s.d. cut-off), tanpa menunggu situs refresh; keterangannya masuk baris sumber
halaman 1 bila muat, kalau tidak 'PERINGATAN isian: firespot dihitung langsung dari FIRMS' di stderr (bot menaruhnya di catatan draf).
Label cut-off dan kunci angka tidak berubah.
"""
import argparse, csv, datetime as dt, io, json, os, re, shutil, sys, types, urllib.request, zipfile
from collections import Counter

G = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, G)


def unduh(url, ke, baru=False):
    if os.path.exists(ke) and not baru:
        return json.load(open(ke, encoding='utf-8'))
    os.makedirs(os.path.dirname(ke), exist_ok=True)
    for coba in range(3):
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=300).read(); break
        except (TimeoutError, OSError):
            if coba == 2: raise
    open(ke, 'wb').write(b)
    return json.loads(b)


def gelar_udara(f):
    """Excel 'Data Gelar Kekuatan Satgas Udara Karhutla' -> ({provinsi: [patroli/OMC, WB]}, {pemilik: unit}); hanya kolom Olah Yuda
    'Tetap Lanjut Operasi'. Baris pesawat ikut provinsi dan asal di atasnya; jenis dari awalan PAT/OMC/WB (sama dengan jalan.py 13 Nov)."""
    import openpyxl
    ws = openpyxl.load_workbook(f, data_only=True).active
    nama_asal = {'BNPB': 'BNPB', 'TNI': 'TNI', 'KEMENHUT': 'Kemenhut', 'PT. SINARMAS': 'PT Sinarmas', 'PT. SINAR MAS': 'PT Sinarmas', 'PT.LNG': 'PT LNG',
                 'PEMDA': 'Pemda', 'AUSTRALIA': 'Australia'}
    armada, pemilik, prov, asal, jenis = {}, {}, None, None, None
    for r in ws.iter_rows(min_row=5, values_only=True):
        if r[1] == 'TOTAL': break
        if r[1]: prov = str(r[1]).strip().title()
        if r[3]: asal = nama_asal.get(str(r[3]).strip().upper(), str(r[3]).strip().title())
        t = str(r[7] or '').strip().upper()
        if t.startswith(('PAT', 'OMC')): jenis = 0
        elif t.startswith('WB'): jenis = 1
        elif not t and r[4]: jenis = 0 if r[5] and not r[6] else 1 if r[6] and not r[5] else None   # baris tanpa nama pesawat (Kaltim Sinarmas)
        lanjut = r[9] if isinstance(r[9], (int, float)) else 0
        if not lanjut: continue
        assert jenis is not None, ('jenis armada tak terbaca', r)
        armada.setdefault(prov, [0, 0])[jenis] += lanjut; pemilik[asal] = pemilik.get(asal, 0) + lanjut
    return armada, pemilik


# BL-06: medan bahan yang dibaca generator ini (wa_operasi.operasi dari teks Satgas, gelar_udara dari Excel). Angka sistem (hotspot,
# firespot, luas terbakar, belum padam) tidak ada di skema dan ditolak saring_isian (K4).
OMC_ISIAN = {'sortie': int, 'nacl': float, 'dryice': float, 'sasaran': str, 'jarak_pandang': bool,
             'hujan': ('atau_kosong', {'intensitas': str, 'lokasi': str, 'tanggal': 'tanggal'})}
ISIAN_PENANGANAN = {'tanggal': 'tanggal', 'tanggal_laporan': 'tanggal', 'tanggal_armada': 'tanggal', 'personel': ('peta', int),
                    'armada': ('peta', ('pasang', int)), 'pemilik': ('peta', int), 'omc': ('peta', OMC_ISIAN)}


def terap_isian_operasi(op, isian):
    """Isian menimpa medan yang sama hasil urai teks Satgas dan Excel gelar; per provinsi/instansi/unsur untuk peta, per medan untuk OMC.
    Yang tidak diisi tetap dari bahan. Mengembalikan op baru."""
    op = dict(op)
    for k in ('tanggal', 'tanggal_laporan', 'tanggal_armada'):
        if k in isian: op[k] = isian[k]
    for k in ('personel', 'armada', 'pemilik'):
        if k in isian: op[k] = {**op.get(k, {}), **isian[k]}
    if 'omc' in isian:
        omc = {p: dict(v) for p, v in op.get('omc', {}).items()}
        for p, v in isian['omc'].items():
            omc.setdefault(p, {'sortie': 0, 'nacl': 0, 'dryice': 0, 'sasaran': '', 'hujan': None, 'jarak_pandang': False}).update(v)
        op['omc'] = omc
    return op


KET_FIRMS = 'firespot dihitung langsung dari FIRMS'
MAKS_SUMBER = 140   # huruf isi baris sumber satu baris kaki (diukur 18 Nov dengan Roboto 7,5 pt: lebar 588 pt, 130 huruf = 504 pt, 153 huruf = 600 pt)


def sumber_firespot(susun, firespot):
    """K18: mode firms menambah KET_FIRMS ke baris sumber halaman 1 (tabel hotspot dan firespot) hanya bila masih satu baris;
    kalau tidak, peringatan ke stderr. Mode situs tidak mengubah apa pun. Mengembalikan True bila keterangan masuk deck."""
    if firespot != 'firms': return False
    h1 = next(b for b in susun if b.get('halaman') == 1)
    baru = f"{h1['sumber']}; {KET_FIRMS}"
    if len(baru) <= MAKS_SUMBER:
        h1['sumber'] = baru; return True
    print(f'PERINGATAN isian: {KET_FIRMS}', file=sys.stderr); return False


def pasang_firespot(penanganan, firespot, firespot_web):
    """situs: firespot dari kluster.json/kluster_hari website (firespot_web). firms: firespot_hari.seri apa adanya (mesin situs atas FIRMS)."""
    if firespot == 'situs': penanganan.firespot_hari.seri = firespot_web
    else: print('firespot: dihitung langsung dari FIRMS (firespot_hari.seri, mesin situs), bukan kluster.json website')


def tanpa_kartu_personel(x):
    """Pemilik 10 Nov 2026: slide 3 tanpa kartu PENANGANAN dan PERSONEL PER PROVINSI (salinan bingkai.py 13 Nov)."""
    ATAS, PANEL, TINGGI, BAKU = 1325880, 2212848, 4142232, 6446520
    k = (PANEL + TINGGI - ATAS) / TINGGI
    KIRI = [tuple(map(int, g)) for g in re.findall(r'<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', x) if 600000 <= int(g[0]) < 6100000 and PANEL < int(g[1]) < BAKU and int(g[3]) != TINGGI]
    ys = int(re.search(r'<a:off x="\d+" y="(\d+)"/>(?:(?!</p:sp>).)*?<a:t>SEMAI OMC</a:t>', x, re.S)[1])
    gb = max(g[1] for g in KIRI if g[0] == 676656 and g[2] == 5222596 and g[3] == 0 and g[1] < ys)
    JARAK = 228600   # pemilik 13 Nov: margin atas bagian SEMAI OMC digedein

    def ubah(m):
        b = m.group(0); o = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', b)
        if not o: return b
        x0, y, cx, cy = map(int, o.groups())
        if y == 905256:   # subjudul: dua run pertama = angka personel dan labelnya
            pp = r'(?:<a:pPr(?:(?!</a:pPr>).)*?</a:pPr>)?'
            b = re.sub(rf'<a:r>(?:(?!</a:r>).)*?</a:r>{pp}<a:r>(?:(?!</a:r>).)*?<a:t>\s*personel darat,\s*</a:t></a:r>{pp}', '', b, count=1, flags=re.S)
            assert 'personel' not in b, 'subjudul slide 3 masih memuat personel'
            return re.sub(r'armada udara, dan OMC', 'armada udara dan OMC', b, count=1)
        if ATAS <= y < PANEL: return ''
        if y < PANEL or y >= BAKU: return b
        if cy == TINGGI: y1, cy1 = ATAS, TINGGI + PANEL - ATAS
        elif x0 < 6100000: y1, cy1 = round(ATAS + (y + cy / 2 - PANEL) * k - cy / 2) + (JARAK if y >= gb else 0), cy
        else: y1, cy1 = round(ATAS + (y + cy / 2 - PANEL) * k - cy / 2), cy
        return b.replace(o.group(0), f'<a:off x="{x0}" y="{y1}"/><a:ext cx="{cx}" cy="{cy1}"/>', 1)
    return re.sub(r'<p:(sp|pic|cxnSp)>.*?</p:\1>', ubah, x, flags=re.S)


def parser():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tanggal', required=True); ap.add_argument('--jam', default='18:00'); ap.add_argument('--operasi'); ap.add_argument('--gelar')
    ap.add_argument('--bmkg', help='diterima supaya pemanggil sama; pil cuaca dan PM2,5 dari data sistem (format 13 Nov)'); ap.add_argument('--out', default='.')
    ap.add_argument('--isian', help='JSON medan bahan hasil urai bot (BL-06); menimpa medan operasi yang sama, angka sistem dikunci')
    ap.add_argument('--firespot', choices=('situs', 'firms'), default='situs', help='K18: situs = kluster.json website (bawaan); firms = firespot_hari dari FIRMS langsung')
    return ap


def utama():
    g = parser().parse_args()
    os.chdir(G)
    import satelit, penanganan, cuaca_riwayat, pil_sendiri, lewat_deck, pdf, segar_situs
    from harian_ringkas import baca_isian, namai_deck
    isian = baca_isian(g.isian, ISIAN_PENANGANAN) if g.isian else {}
    if isian and not g.operasi: print('PERINGATAN isian: tanpa --operasi tidak ada slide Operasi; isian diabaikan', file=sys.stderr)
    D, JAM = dt.date.fromisoformat(g.tanggal), g.jam
    KEMARIN, LUSA = D - dt.timedelta(days=1), D - dt.timedelta(days=2)
    md = lambda d: d.strftime('%m-%d')
    out = os.path.abspath(g.out); S = os.path.join(out, f'kerja-penanganan-{D:%d%m%y}'); os.makedirs(S, exist_ok=True)

    class _Hari(dt.date):   # jalan ulang hari lain tetap memakai cuaca tarikan hari laporan
        @classmethod
        def today(cls): return D
    cuaca_riwayat.dt = types.SimpleNamespace(date=_Hari, timedelta=dt.timedelta)

    web = lambda f: unduh(f'https://centurisk97.id/data/{f}', os.path.join(S, 'web', f.replace('/', '-')))
    P, H, HS, KL = web('peta_karhutla.json'), web('harian30.json'), web('hotspot.json'), web('kluster.json')
    KH = {d: web(f'kluster_hari/{d}.json')['w'] for d in ((D - dt.timedelta(days=i)).isoformat() for i in (3, 2, 1))}
    os.environ['PETA_CHOROPLETH'] = '1'   # pemilik 10 Nov 2026: peta choropleth
    if P['hari'][-1] != KEMARIN.isoformat():
        sys.exit(f"website peta_karhutla baru sampai {P['hari'][-1]}, belum {KEMARIN}; laporan ditunda")
    if H['hari_ini'] != D.isoformat():
        sys.exit(f"website harian30 hari {H['hari_ini']}, bukan {D}; laporan ditunda")
    print('website: harian30', H['dibuat'], '| peta_karhutla', P['dibuat'], '| hotspot.json titik terakhir', HS['acuan'])

    asli = satelit.hitung
    SEGAR = asli(D, JAM, 2); iS = SEGAR['hari'].index(D.isoformat())
    print('SEGAR', D, 's.d.', JAM, {m: round(sum(o[m][iS] for o in SEGAR['prov'].values())) for m in ('hot', 'luas', 'belum', 'padam')})
    try:   # situs tertinggal dari FIRMS = firespot D lebih lama dari hotspot D; dicatat, tidak menahan laporan
        baru, total, porsi = segar_situs.porsi_tertinggal(segar_situs.waktu_titik(D, JAM), segar_situs.acuan_sensor(HS))
        print(f'situs tertinggal: {baru} dari {total} titik ({porsi:.0%})' + (' PERINGATAN: firespot hari ini dari data situs yang lebih lama' if porsi > segar_situs.AMBANG and g.firespot == 'situs' else ''))
    except Exception as e: print('cek situs tertinggal gagal:', e)

    def hitung_web(t, jam, n, kunci=None):
        a = asli(t, jam, n, kunci)
        for i, d in enumerate(a['hari']):
            if d in H['hari'] and d != D.isoformat():
                for k, o in a['prov'].items():
                    o['hot'][i] = H['prov'].get(k, [0] * len(H['hari']))[H['hari'].index(d)]
        nol = {m: [0] * len(P['hari']) for m in ('luas', 'belum', 'padam')}
        for k, o in a['prov'].items():
            pk = P['prov'].get(k) or nol
            for i, d in enumerate(a['hari']):
                if d != D.isoformat():
                    for m in ('luas', 'belum', 'padam'): o[m][i] = pk[m][P['hari'].index(d)] or 0
                # 9 Nov pemilik: luas dan padam = hari utuh terakhir (tab Luas terbakar di layar); belum padam tetap hari kalender
                j = P['hari'].index((dt.date.fromisoformat(d) - dt.timedelta(days=1)).isoformat())
                for m in ('luas', 'padam'): o[m][i] = pk[m][j] or 0
        return a

    TOP6 = set(sorted(SEGAR['prov'], key=lambda k: -SEGAR['prov'][k]['hot'][iS])[:6])
    asli_grid = cuaca_riwayat.H.grid_darat
    cuaca_riwayat.H.grid_darat = lambda w: [x for x in asli_grid(w) if x[2] in TOP6]   # cuaca cukup sel 6 provinsi tabel (31 Okt pemilik: "ambil secukupnya")
    cuaca_riwayat.PAST = 1

    def firespot_web(hari_akhir, n, jam='17:00', kunci=None):
        hari = [(hari_akhir - dt.timedelta(days=n - 1 - i)).isoformat() for i in range(n)]
        kini = Counter()
        for f in KL['features']:
            for k, v in (f['properties'].get('fs_ini') or {}).items(): kini[k.split('|')[0]] += v
        fs = {}
        for k in set(kini) | {k for w in KH.values() for k in w if '|' not in k}:
            baris = fs.setdefault(k, [0] * n)
            for i, d in enumerate(hari):
                baris[i] = kini.get(k, 0) if d == H['hari_ini'] else (KH.get(d, {}).get(k) or [0] * 5)[4]
        print('firespot website', hari[-1], 'nasional', sum(v[-1] for v in fs.values()))
        return fs, hari

    pil_sendiri.RIWAYAT = os.path.join(S, 'web', 'udara-riwayat.json')
    unduh('https://centurisk97.id/udara/data/riwayat.json', pil_sendiri.RIWAYAT, baru=True)
    asli_op = penanganan.wa_operasi.operasi
    try: ar_pm = gelar_udara(g.gelar) if g.gelar else None
    except ImportError: ar_pm = None; print('PERINGATAN openpyxl belum terpasang di venv bot; armada dari teks Satgas (pasang: uv pip install openpyxl)')
    if ar_pm: print('gelar udara (tetap lanjut operasi):', ar_pm, sum(map(sum, ar_pm[0].values())), 'unit')
    URUT = ['BNPB', 'TNI', 'Kemenhut', 'PT Sinarmas', 'Pemda', 'PT LNG', 'Australia']

    def operasi(teks):   # pil ARMADA UDARA bertanggal laporan WA (deck 281026)
        op = asli_op(teks); op = {**op, 'tanggal_armada': op['tanggal_laporan']}
        if ar_pm: op.update(armada=ar_pm[0], pemilik={k: ar_pm[1][k] for k in URUT + sorted(ar_pm[1]) if k in ar_pm[1]})
        return terap_isian_operasi(op, isian) if isian else op
    penanganan.wa_operasi.operasi = operasi
    satelit.hitung = hitung_web
    penanganan.satelit = satelit
    pasang_firespot(penanganan, g.firespot, firespot_web)
    penanganan.bangun(D, JAM, None, S, g.operasi, ha_utuh=True, belum_kini=True, luas_00=False)

    # ---- bingkai (bingkai.py 13 Nov)
    nama_d = f'Laporan Penanganan Pengendalian Karhutla {D:%d%m%y}.pptx'
    gen, nama = os.path.join(S, nama_d), os.path.join(out, nama_d)
    with zipfile.ZipFile(gen) as zi, zipfile.ZipFile(nama, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            b = zi.read(it.filename)
            if it.filename.endswith('.xml'): b = b.replace(b'C9503A', b'C8102E').replace(b'FFE3DC', b'F8DDE0')   # merah tema (pemeriksa 2 Nov)
            if re.match(r'ppt/slides/slide\d+\.xml$', it.filename):
                x = b.decode('utf-8')   # 2 Nov pemilik: catatan kaki FIRMS beserta garis aksennya dan bintang di kepala kolom dihapus
                x = ''.join('' if ('Data berdasarkan Geographic' in s or '<a:off x="548640" y="6199632"/><a:ext cx="45720" cy="219456"/>' in s) else s
                            for s in re.split(r'(<p:sp>.*?</p:sp>)', x, flags=re.S))
                x = re.sub(r'<a:t>(HOTSPOT|FIRESPOT|LUAS TERBAKAR|BELUM PADAM)\*</a:t>', r'<a:t>\1</a:t>', x)
                if it.filename == 'ppt/slides/slide3.xml' and g.operasi: x = tanpa_kartu_personel(x)
                b = x.encode('utf-8')
            zo.writestr(it, b)
    BL = penanganan.bnpb.BULAN
    tg = lambda d, th=True: f"{d.day} {BL[d.month - 1][:3]}" + (f' {d.year}' if th else '')
    jm = JAM.replace(':', '.')
    bagian = [{'judul': 'Situasi Hotspot dan Firespot', 'label': 'Situasi', 'halaman_tetap': [1, 2]}]
    susun = [{'halaman': 1, 'bagian': 1, 'sumber': f'Satelit NASA FIRMS (VIIRS dan MODIS), {tg(D)} {jm} WIB; luas terbakar hari utuh {tg(KEMARIN, False)}'},
             {'halaman': 2, 'bagian': 1, 'sumber': f'NASA FIRMS {tg(D, False)} {jm} WIB; luas terbakar hari utuh {tg(KEMARIN, False)}; PM2,5 CAMS {tg(KEMARIN, False)}; hujan model Open-Meteo, kelas BMKG'}]
    sumber_firespot(susun, g.firespot)
    if g.operasi:
        op = operasi(open(g.operasi, encoding='utf-8').read())
        bagian.append({'judul': 'Operasi Penanganan', 'label': 'Operasi', 'halaman_tetap': [3]})
        susun.append({'halaman': 3, 'bagian': 2, 'sumber': f"Laporan Penanganan Karhutla Satgas, {tg(op['tanggal_laporan'])} (kegiatan {tg(op['tanggal'])}); "
                      + ('armada dari data gelar kekuatan Satgas Udara' if ar_pm else 'armada dari laporan Satgas')})
    lewat_deck.bingkai(nama, 'penanganan', 'Laporan Penanganan Pengendalian Karhutla', f'Cut-off data {tg(D)}, {jm} WIB', D, pdf=False,
                       tanpa_kepada='sama dengan laporan harian 2 Nov 2026 (pola tetap 3-5 Nov): laporan dipresentasikan Kepala BNPB sendiri',
                       bagian=bagian, spek_tambah={'panel_sisi': 'gelap', 'skala_logo_bnpb': 1.0}, susun=susun)
    for f in os.listdir(out):   # penanganan.bangun menyalin PDF generator mentah ke out; diganti PDF deck berbingkai
        if f.startswith(nama_d[:-5]) and f.endswith('.pdf'): os.remove(os.path.join(out, f))
    print('kunci', len(namai_deck(nama)), 'shape angka sistem ->', nama[:-5] + '.kunci.json')   # BL-06: nama shape stabil + kunci (D3)
    print('ok', nama, '| pdf', pdf.ke_pdf(nama))


if __name__ == '__main__':
    utama()
