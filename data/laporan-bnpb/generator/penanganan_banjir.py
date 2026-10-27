"""Generator "Laporan Penanganan Banjir, Longsor dan Rob DDMMYY" (2 slide: peta status, tabel 6 provinsi), kembaran penanganan.py.

Mesin dan templat sama dengan deck karhutla (penanganan/*, env BENCANA=banjir); hanya angkanya yang lain, semuanya dari sistem kita
(public/banjir/data/laporan.json dan hari/<tanggal>.json yang TAYANG, karena data banjir harian tidak di-commit ke git):
  BANJIR    = kecamatan berstatus Siaga atau Awas banjir (laporan.json banjir_sa)
  LONGSOR   = kecamatan berstatus Siaga atau Awas longsor (longsor_sa)
  ROB SIAGA = titik pantau rob BMKG berstatus Siaga (rob_siaga; provinsi tanpa titik pantau = "–")
  TERPAPAR  = penduduk kecamatan Siaga atau Awas banjir (penduduk, WorldPop)
Kolom D-2, D-1, D dengan D = hari laporan; 6 provinsi teratas menurut BANJIR hari D, seri sama menurut LONGSOR.
Pil kiri = status banjir provinsi hari D, pil kanan = hujan 3 hari tertinggi kecamatan (hari/<D>.json).
Ini status prakiraan, BUKAN kejadian lapangan (rumah terendam, pengungsi): itu tidak ada di sistem kita.

    python3 penanganan_banjir.py [--tanggal 2026-10-27] [--out DIR] [--sumber https://centurisk97.id/banjir/data]
Keluaran: DIR/Laporan Penanganan Banjir Longsor dan Rob DDMMYY.pptx dan .pdf (DIR bawaan ~/Downloads).
Butuh python >= 3.12 dengan Pillow (subproses memakai python yang sama), node + playwright (peta), soffice (PDF)."""
import datetime as dt, json, os, re, shutil, sys, urllib.request, zipfile

SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SINI); sys.path.insert(0, os.path.join(SINI, 'penanganan'))
from penanganan import TEMPLAT, jalankan   # noqa: E402
import bnpb   # noqa: E402

GRUP = {'hot': 'banjir_sa', 'fs': 'longsor_sa', 'luas': 'rob_siaga', 'belum': 'penduduk'}   # kunci kisi.py <- metrik laporan.json


def tarik(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'penanganan-banjir'}), timeout=60) as r:
        return json.load(r)


def bangun(D, out, sumber):
    L = tarik(f'{sumber}/laporan.json')
    if D.isoformat() not in L['hari']:
        sys.exit(f'{D} tidak ada di laporan.json (hari terakhir {L["hari"][-1]}, dibuat {L["dibuat"]})')
    i = L['hari'].index(D.isoformat())
    if i < 3:
        sys.exit(f'laporan.json baru punya {i + 1} hari sampai {D}; tabel butuh D-3 sampai D')
    try:
        H = tarik(f'{sumber}/hari/{D}.json')
    except Exception as e:
        sys.exit(f'arsip hari banjir {D} tidak terbaca ({e}); arsip mulai 27 Okt 2026')
    prov = {k: {g: o[m][i - 3:i + 1] for g, m in GRUP.items()} for k, o in L['prov'].items()}
    # urutan sisipan = urutan tabel dan peta (semua pengurut di penanganan/* stabil terhadap kolom BANJIR)
    prov = dict(sorted(prov.items(), key=lambda kv: (-(kv[1]['hot'][3] or 0), -(kv[1]['fs'][3] or 0))))
    top6 = list(prov)[:6]
    kerja = os.path.join(SINI, 'cache', f'penanganan-banjir-{D:%d%m%y}')
    shutil.rmtree(kerja, ignore_errors=True); os.makedirs(os.path.join(kerja, 'deck', 'x'))
    shutil.copy(TEMPLAT, os.path.join(kerja, 'deck', 'src.pptx'))
    zipfile.ZipFile(TEMPLAT).extractall(os.path.join(kerja, 'deck', 'x'))
    for f in ('angka.json', 'angka_nasional.json'):
        json.dump({'hari': L['hari'][i - 3:i + 1], 'prov': prov, 'metode': f'{sumber}/laporan.json dibuat {L["dibuat"]}'}, open(os.path.join(kerja, f), 'w'))
    hb = lambda d: f'{d.day} {bnpb.BULAN[d.month - 1][:3]}'
    c = dt.datetime.fromisoformat(L['cutoff'])
    json.dump({'cutoff': f'{hb(c)} {c.year}, {c:%H.%M} WIB', 'kolom': [hb(D - dt.timedelta(days=j)) for j in (2, 1, 0)], 'hari': str(D.day),
               'bulan': bnpb.BULAN[D.month - 1], 'bln': bnpb.BULAN[D.month - 1][:3], 'tahun': str(D.year)}, open(os.path.join(kerja, 'param.json'), 'w'))
    os.environ['BENCANA'] = 'banjir'
    chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    if 'CHROMIUM_SHELL' not in os.environ and os.path.exists(chrome):
        os.environ['CHROMIUM_SHELL'] = chrome   # tanpa unduhan browser playwright
    P, py = os.path.join(SINI, 'penanganan'), sys.executable
    jalankan('node', os.path.join(P, 'peta.mjs'), cwd=kerja)
    jalankan(py, '-I', '-W', 'ignore', os.path.join(P, 'ganti.py'), kerja, 't1.pptx', cwd=kerja)
    jalankan(py, '-I', os.path.join(P, 'tambah_peta.py'), 't1.pptx', 'peta-20okt.png', 'angka_nasional.json', cwd=kerja)
    st = {p['kode']: p['status'] for p in H['provinsi']}
    h3 = {p['kode']: p['hujan3_mm'] for p in H['provinsi']}
    src = lambda n: open(os.path.join(kerja, 'deck', 'x', 'ppt', 'slides', n)).read()
    lib = bnpb.pustaka(src('slide1.xml'), src('slide2.xml'))
    nama = f'Laporan Penanganan Banjir Longsor dan Rob {D:%d%m%y}.pptx'
    zi = zipfile.ZipFile(os.path.join(kerja, 't1.pptx')); zo = zipfile.ZipFile(os.path.join(kerja, nama), 'w', zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        d = zi.read(it.filename)
        if it.filename == 'ppt/slides/slide1.xml': d = bnpb.ganti_tabel_banjir(d.decode(), lib, top6, st, h3, hb(D)).encode()
        zo.writestr(it, d)
    zo.close()
    print(jalankan(py, '-I', os.path.join(P, 'cek6.py'), nama, cwd=kerja).strip())
    z = zipfile.ZipFile(os.path.join(kerja, nama))
    for n in z.namelist():
        if re.match(r'ppt/slides/slide\d+\.xml$', n):
            teks = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', z.read(n).decode()))
            assert '·' not in teks and '—' not in teks, f'titik tengah / em dash di {n}'
            assert not re.search(r'[Kk]arhutla|[Hh]otspot|PM2', teks), f'sisa teks karhutla di {n}'
    jalankan('soffice', '--headless', '--convert-to', 'pdf', nama, cwd=kerja)
    os.makedirs(out, exist_ok=True)
    for f in (nama, nama[:-4] + 'pdf'):
        shutil.copy(os.path.join(kerja, f), out)
    print(f'ok {os.path.join(out, nama)} | {D}, cut-off {L["cutoff"]} | 6 teratas {[L["prov"][k]["nama"] for k in top6]}')
    return os.path.join(out, nama)


if __name__ == '__main__':
    arg = sys.argv[1:]
    nilai = lambda o, b=None: arg[arg.index(o) + 1] if o in arg else b
    if '-h' in arg or '--help' in arg:
        sys.exit(__doc__)
    hari_ini = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=7)).date()
    bangun(dt.date.fromisoformat(nilai('--tanggal', hari_ini.isoformat())), nilai('--out', os.path.expanduser('~/Downloads')),
           nilai('--sumber', 'https://centurisk97.id/banjir/data'))
