"""Paparan Situasi Banjir Sepekan untuk periode bebas (bot laporan WA, pemilik 19 Nov 2026: "tambahin laporan paparan banjir sepekan?
tapi bisa diatur juga tanggal yang dimau tanggal berapa aja").

Mesin dan desain = deck mingguan buatan tangan (mingguan/2026-11-09/banjir-longsor/buat.py, diisi seperti mingguan/2026-11-19/banjir-longsor/buat.py).
Berkas ini hanya mengisi data periodenya secara otomatis; kalimat kondisi dan langkah mitigasi dirapikan agen V2 sesudahnya.

Data:
  - Periode = tanggal laphar Dit. Koordalops `--awal` s.d. `--akhir`. Laphar tanggal D dikirim lewat WA pagi D+1, jadi yang dibaca
    WA Koordalops berkas hari awal+1 s.d. akhir+1 (harian/YYYY-MM/YYYY-MM-DD/wa-koordalops.txt lewat jalur.py), ditambah `--wa`
    (bahan yang diteruskan ke bot). Riwayat 21 hari sebelum periode hanya dipakai untuk tanggal mulai.
  - Kab/kota masuk deck bila dilaporkan banjir di dalam periode (kejadian yang tidak dilaporkan lagi tidak dimasukkan, seperti deck 19 Nov).
  - Probabilitas dan mitigasi: data prakiraan sistem banjir (centurisk97.id/banjir/data), disalin ke <out>/bahan/gis.

    python banjir_sepekan.py --awal 2026-11-16 --akhir 2026-11-19 --out DIR [--wa wa-1.txt ...] [--gis DIR]
    -> DIR/Paparan Situasi Banjir Sepekan 191126.pptx dan .pdf
"""
import argparse, datetime as dt, importlib.util, json, os, re, shutil, sys

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
MESIN = os.path.join(SINI, '..', 'mingguan', '2026-11-09', 'banjir-longsor', 'buat.py')
sys.path.insert(0, SINI)
RIWAYAT_HARI = 21
SUMATERA = {'11', '12', '13', '14', '15', '16', '17', '18', '19', '21'}
# tiga-serangkai "A, B dan C" (gerbang anti-AI S-18 mesin deck) di kalimat WA mentah: kata sambung dibuang, isi tetap
_ITEM = r"[\w.()-]+(?: [\w.()-]+){0,3}"
TIGA = re.compile(rf"(?<!, )\b({_ITEM}), ({_ITEM}),? (?:dan|serta|atau|maupun) ({_ITEM})\b")


def tanpa_tiga(t):
    t = re.sub(r'\b(?:aman\s+(?:dan\s+)?terkendali|terkendali\s+dan\s+aman)\b', 'terkendali', t or '', flags=re.I)   # pemilik: tidak pernah menulis "aman"
    return TIGA.sub(lambda m: f'{m[1]}, {m[2]}, {m[3]}', t)


def ext_sumatera(M, rows):
    """Bingkai peta Sumatera yang memuat semua kab/kota Sumatera terdampak (rasio panel 418:338 tetap); bawaan mesin bila sudah muat."""
    t = [M.pusat(M.KODE[r[0]], r[1]) for r in rows if M.KODE[r[0]] in SUMATERA]
    e = M.EXT_SUM
    if not t or all(e[0] <= x <= e[1] and e[3] <= y <= e[2] for x, y in t):
        return e
    x0, x1 = min(x for x, _ in t) - 1.0, max(x for x, _ in t) + 1.0
    y1, y0 = max(y for _, y in t) + 1.0, min(y for _, y in t) - 1.0
    r = (e[1] - e[0]) / (e[2] - e[3])
    w, h = max(x1 - x0, (y1 - y0) * r, e[1] - e[0]), max(y1 - y0, (x1 - x0) / r, e[2] - e[3])
    w, h = max(w, h * r), max(h, w / r)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return (cx - w / 2, cx + w / 2, cy + h / 2, cy - h / 2)
GIS = ('prakiraan72.json', 'status.json', 'wilayah_hari.json')


def nama_berkas(akhir):
    return f'Paparan Situasi Banjir Sepekan {akhir:%d%m%y}'


def _tgl(d, BLN):
    return f'{d.day} {BLN[d.month][:3]}'


def _angka(s):
    if s in (None, ''):
        return None
    try:
        return int(float(str(s).replace('.', '').replace(',', '.')))
    except ValueError:
        return None


def kumpulkan(awal, akhir, wa=()):
    """Baris banjir per kab/kota yang dilaporkan di periode. awal, akhir: date (tanggal laphar)."""
    import situasi_banjir as S
    berkas_awal = (awal - dt.timedelta(days=RIWAYAT_HARI)).isoformat()
    berkas_akhir = (akhir + dt.timedelta(days=1)).isoformat()
    baris, _, _ = S.sudah_banjir(None, berkas_akhir, wa, awal=berkas_awal)
    dalam = (awal + dt.timedelta(days=1)).isoformat()
    return [o for o in baris if o['akhir'] >= dalam], S


def berkas_tersedia(awal, akhir, wa=()):
    """Tanggal berkas WA Koordalops (hari WA, = laphar + 1) yang terbaca untuk periode: arsip repo dan --wa (aturan tanggal sama dengan sudah_banjir)."""
    import jalur
    a, b = (awal + dt.timedelta(days=1)).isoformat(), (akhir + dt.timedelta(days=1)).isoformat()
    ada = {jalur.tanggal_dari(f) for f in jalur.berkas_hari('harian', 'wa-koordalops.txt')}
    for f in wa:
        m = re.search(r's\.d\.?\s+(\d\d)/(\d\d)/(\d{4})', open(f, encoding='utf-8').read())
        ada.add(f'{m[3]}-{m[2]}-{m[1]}' if m else b)
    return {h for h in ada if h and a <= h <= b}


def cocok_geo(M, rows):
    """Nama kab/kota WA yang tidak ada di berkas geo mesin (salah ketik, ejaan Kota) dicocokkan longgar; yang tetap tidak cocok dibuang
    dan dikembalikan namanya supaya disebut di catatan (tanpa ini M.pusat melempar StopIteration dan seluruh laporan gagal)."""
    norm = lambda s: re.sub(r'[^a-z]', '', s.lower().replace('kabupaten', '').replace('kab.', ''))
    buang, tetap = [], []
    for o in rows:   # o = baris sudah_banjir: {'prov': kode, 'kab': nama, ...}
        try:
            nama = [f['properties']['kab'] for f in M.geo(o['prov'])]
        except (OSError, KeyError, ValueError):
            nama = []
        lain = [n for n in nama if n == o['kab']] or [n for n in nama if norm(n) == norm(o['kab'])]
        if lain:
            o['kab'] = lain[0]; tetap.append(o)
        else:
            buang.append(o['kab'])
    rows[:] = tetap
    return buang


def isi_mesin(M, awal, akhir, wa=(), gis=None, keluar='.'):
    """Isi konfigurasi mesin mingguan M dari WA Koordalops periode. Mengembalikan ringkasan (dict) untuk dicetak."""
    from datetime import date
    BLN = M.BLN
    laphar = lambda h: date.fromisoformat(h) - dt.timedelta(days=1)   # berkas WA pagi D+1 = laphar D
    rows, S = kumpulkan(awal, akhir, wa)
    prov = {k: v['nama'] for k, v in json.load(open(os.path.join(AKAR, 'public', 'data', 'laporan.json'), encoding='utf-8'))['prov'].items()}
    hari_ada = sorted({h for o in rows for h in (o.get('seri') or {}) if (awal + dt.timedelta(days=1)).isoformat() <= h})
    tersedia = {laphar(h) for h in berkas_tersedia(awal, akhir, wa)}   # laporan yang ada walau tanpa banjir (bukan dari seri)
    kosong = [d for d in (awal + dt.timedelta(days=i) for i in range((akhir - awal).days + 1)) if d not in tersedia]
    catat = ''
    if kosong:
        catat = 'laporan ' + ', '.join(_tgl(d, BLN) for d in kosong) + (' belum tersedia' if len(kosong) == 1 else ' tidak tersedia')
    buang = cocok_geo(M, rows)
    if buang:
        print('PERINGATAN kab/kota tidak dikenali peta, tidak dimuat: ' + ', '.join(buang), file=sys.stderr)
        catat = '; '.join(x for x in (catat, ', '.join(buang) + ' tidak dimuat (nama kab/kota tidak dikenali)') if x)
    M.MINGGU = {'awal': awal, 'akhir': akhir, 'paparan': akhir, 'nama': nama_berkas(akhir).replace('Banjir', 'Banjir dan Longsor', 1),
                'impor_091': False, 'catatan_longsor': '', 'catatan_sumber': catat, 'gis': gis}
    M.BANJIR, M.UNGSI, M.MITIGASI, M.PANTAU, M.LONGSOR = [], [], {}, [], []
    M.POS_BANJIR, M.PANEL_BANJIR = {}, []   # label peta diatur otomatis (deck 16 Nov); multipanel diatur agen bila perlu
    seri_ungsi = {}
    for o in rows:
        nm = prov.get(o['prov'], o['prov'])
        M.KODE[nm] = o['prov']
        b = o.get('butir') or {}
        # mulai: laphar pertama dari rangkaian laporan tanpa jeda lebih dari 2 hari yang berakhir di laporan terakhir (riwayat 21 hari);
        # kabar lebih lama = kejadian lain di kab/kota yang sama (Subulussalam: 26 Okt lawan 13 Nov). Logbook Pusdalops hanya bila
        # paling lama 3 hari sebelum rangkaian itu.
        hs = sorted(date.fromisoformat(h) for h in (o.get('seri') or {o['pertama']: 0}))
        a0 = hs[-1]
        for h in reversed(hs[:-1]):
            if (a0 - h).days > 2:
                break
            a0 = h
        p0 = laphar(a0.isoformat())
        lb = date.fromisoformat(o['mulai'][:10]) if o.get('mulai') and o['mulai'][:10] < a0.isoformat() else None
        mulai = lb if lb and 0 < (p0 - lb).days <= 3 else p0
        selesai = laphar(o['surut_tgl']) if o.get('surut_tgl') else None
        if not selesai and re.match(r'\s*(banjir|air)\s+(sudah|telah)\s+surut', o.get('kondisi') or '', re.I):   # Madina 18 Nov: "Banjir sudah surut ... genangan"
            selesai = laphar(o['akhir'])
        ug_kk = S._cari(b.get('Pengungsi'), r'([\d.,]+)\s*KK')
        tinggi = re.search(r'(\d+)\s*(?:cm)?\s*[-–]\s*(\d+)\s*cm|(\d+)\s*cm', o.get('kondisi') or '')
        tinggi = (f'{tinggi[1]}-{tinggi[2]} cm' if tinggi[1] else f'{tinggi[3]} cm') if tinggi else None
        kondisi = tanpa_tiga(S.rapi(o.get('kondisi') or ''))
        M.BANJIR.append((nm, o['kab'], '', _tgl(mulai, BLN) if mulai else None, _tgl(selesai, BLN) if selesai else None,
                         o.get('kk'), _angka(o.get('jiwa')), ug_kk if o.get('ungsi') else None, o.get('ungsi') or None,
                         tinggi, _tgl(laphar(o['akhir']), BLN), kondisi.strip().rstrip('.')))
        seri = {h: v[1] for h, v in (o.get('seri') or {}).items() if h in hari_ada}
        if any(seri.values()):
            masih = bool(o.get('ungsi')) and not selesai
            lokasi = re.search(r'\b(?:di|ke)\s+([^;,.]+)', b.get('Pengungsi') or '')
            M.UNGSI.append((nm, o['kab'], 'banjir', masih, ug_kk if masih else None, o.get('ungsi') or max(x for x in seri.values() if x),
                            ('Lokasi belum disebut' if not lokasi else lokasi.group(1).strip()) + ('' if masih else '; sudah kembali ke rumah'),
                            _tgl(laphar(o['akhir']), BLN)))
            seri_ungsi[o['kab']] = [seri.get(h) for h in hari_ada]
        if not selesai:   # bawaan mesin; agen V2 merapikan kalimatnya dari bahan
            langkah = ([f'Layani {M.f0(o["ungsi"])} jiwa pengungsi'] if o.get('ungsi') else []) + ['pantau wilayah yang belum surut']
            M.MITIGASI[o['kab']] = '; '.join(langkah).capitalize() if not o.get('ungsi') else '; '.join(langkah)
    M.BANJIR.sort(key=lambda r: (M.KODE[r[0]], r[4] is not None, -(r[5] or 0)))
    M.EXT_SUM = ext_sumatera(M, M.BANJIR)   # urut kode provinsi, belum surut dulu, KK terbesar
    M.UNGSI.sort(key=lambda r: (M.KODE[r[0]], -(r[5] or 0)))
    M.UNGSI_HARI = {'tanggal': [_tgl(laphar(h), BLN) for h in hari_ada], 'kab': seri_ungsi, 'catatan': None} if len(hari_ada) > 1 and seri_ungsi else None
    return {'periode': [awal.isoformat(), akhir.isoformat()], 'laporan': [laphar(h).isoformat() for h in hari_ada], 'kosong': [d.isoformat() for d in kosong],
            'banjir': len(M.BANJIR), 'belum_surut': sum(1 for r in M.BANJIR if not r[4]), 'pengungsian': len(M.UNGSI)}


def unduh_gis(ke):
    import situasi_banjir as S
    os.makedirs(ke, exist_ok=True)
    for f in GIS:
        S.unduh(f, ke)
    return ke


def muat_mesin(sini):
    sp = importlib.util.spec_from_file_location('banjir_longsor_mingguan', MESIN)
    M = importlib.util.module_from_spec(sp); sp.loader.exec_module(M)
    M.SINI = M.B.SINI = sini
    os.makedirs(os.path.join(sini, 'bahan', 'ikon'), exist_ok=True)
    return M


def python_deck():
    """Mesin mingguan butuh python-pptx, Pillow, dan pymupdf (ikon mesin deck). Venv bot di Mac bisa tanpa pymupdf: jalankan ulang
    berkas ini dengan python venv skill ppt-konsultan (sama dengan yang dipakai lewat_deck.bingkai). None = python ini sudah cukup."""
    if all(importlib.util.find_spec(m) for m in ('pptx', 'PIL', 'pymupdf')):
        return None
    skill = os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb'))
    py = os.path.join(skill, '.venv', 'Scripts', 'python.exe') if os.name == 'nt' else os.path.join(skill, '.venv', 'bin', 'python')
    return py if os.path.exists(py) and os.path.abspath(py) != os.path.abspath(sys.executable) else None


def main(argv=None):
    py = python_deck()
    if py and argv is None:
        import subprocess
        sys.exit(subprocess.run([py, os.path.abspath(__file__), *sys.argv[1:]]).returncode)
    a = argparse.ArgumentParser()
    a.add_argument('--awal', required=True); a.add_argument('--akhir', required=True)
    a.add_argument('--out', required=True); a.add_argument('--wa', nargs='*', default=[])
    a.add_argument('--gis', help='folder berisi ' + ', '.join(GIS) + ' (bawaan: unduh dari situs)')
    a.add_argument('--isi', action='store_true', help='hanya slide isi, tanpa mesin deck')
    o = a.parse_args(argv)
    awal, akhir = dt.date.fromisoformat(o.awal), dt.date.fromisoformat(o.akhir)
    if akhir < awal or (akhir - awal).days > 30:
        sys.exit('periode tidak sah: akhir harus sesudah awal, paling panjang 31 hari')
    out = os.path.abspath(o.out); os.makedirs(out, exist_ok=True)
    sini = os.path.join(out, 'kerja-sepekan'); os.makedirs(sini, exist_ok=True)
    gis = os.path.join(sini, 'bahan', 'gis')
    if o.gis:
        os.makedirs(gis, exist_ok=True)
        for f in GIS: shutil.copy(os.path.join(o.gis, f), gis)
    else:
        unduh_gis(gis)
    M = muat_mesin(sini)
    r = isi_mesin(M, awal, akhir, o.wa, gis, out)
    print(json.dumps(r, ensure_ascii=False), file=sys.stderr)
    if not M.BANJIR:
        sys.exit(f'tidak ada kejadian banjir di WA Koordalops laphar {awal:%d/%m} s.d. {akhir:%d/%m/%Y}; kirim WA Koordalops harian periode itu')
    if o.isi:
        sys.argv.append('--isi')
    keluar = M.bangun('banjir')
    if not keluar:
        return
    nama = nama_berkas(akhir)
    for ext in ('.pptx', '.pdf'):
        if not os.path.exists(keluar[:-5] + ext):
            sys.exit(f'keluaran mesin tidak ada: {os.path.basename(keluar[:-5] + ext)}')
        shutil.move(keluar[:-5] + ext, os.path.join(out, nama + ext))
    # daftar kunci angka sistem (dibaca pagar angka bot, proyek.mjs jalurKunci): paparan banjir tidak memuat hotspot, firespot, atau luas
    # terbakar, jadi kosong; tanpa berkas ini draf V2 selalu ditolak ("daftar kunci angka sistem deck dasar tidak ada")
    with open(os.path.join(out, nama + '.kunci.json'), 'w', encoding='utf-8') as f:
        json.dump([], f)
    print(os.path.join(out, nama + '.pptx'))


if __name__ == '__main__':
    main()
