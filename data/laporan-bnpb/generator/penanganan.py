"""Generator "Laporan Penanganan Pengendalian Karhutla DDMMYY" (2 slide: peta hotspot, tabel 6 provinsi).

Aturan pemilik (25 Okt 2026): cut-off 17.00 WIB hari laporan; kolom D-2, D-1, D dengan D = hari laporan, angka D sementara
s.d. jam cut-off; empat kelompok kolom FIRESPOT, HOTSPOT, LUAS TERBAKAR, BELUM PADAM, masing-masing tiga hari dan berbintang;
halaman "Operasi Penanganan Karhutla" dibuang (sumbernya teks WA satgas, tidak ada untuk hari lampau).
Angka satelit dari satelit.hitung dan firespot dari firespot_hari.seri, keduanya mesin website. Firespot dihitung dalam
TITIK, bagian dari hotspot, jadi firespot <= hotspot di tiap sel tabel. Pil PM2,5 + cuaca dari
pil_sendiri (data sendiri, ambang resmi) atau dari teks WA BMKG bila --bmkg diberikan. Templat = deck BNPB 211026.

    python3 penanganan.py --tanggal 2026-10-25 [--jam 17:00] [--bmkg bmkg.txt] [--out DIR]
Keluaran: DIR/Laporan Penanganan Pengendalian Karhutla DDMMYY.pptx dan .pdf (DIR bawaan ~/Downloads)."""
import datetime as dt, json, os, re, shutil, subprocess, sys, zipfile

SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SINI); sys.path.insert(0, os.path.join(SINI, 'penanganan'))
import satelit, firespot_hari, pil_sendiri, cuaca_riwayat, wa_operasi, bnpb   # noqa: E402

TEMPLAT = os.path.join(SINI, '..', 'satelit-2026-10-21', 'sumber-asli-BNPB-211026.pptx')
ADA_BARIS = {'62', '16', '63', '15', '61', '93', '72', '64'} | {f[:-4] for f in os.listdir(os.path.join(SINI, 'penanganan', 'logo'))}   # baris templat + logo/<kode>.png


def jalankan(*cmd, cwd):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'gagal: {" ".join(cmd)}\n{r.stdout}\n{r.stderr}')
    return r.stdout


def bangun(D, jam, bmkg, out):
    kerja = os.path.join(SINI, 'cache', f'penanganan-{D:%d%m%y}')
    shutil.rmtree(kerja, ignore_errors=True); os.makedirs(os.path.join(kerja, 'deck', 'x'))
    shutil.copy(TEMPLAT, os.path.join(kerja, 'deck', 'src.pptx'))
    zipfile.ZipFile(TEMPLAT).extractall(os.path.join(kerja, 'deck', 'x'))
    a = satelit.hitung(D, jam, 4)
    fs, hari_fs = firespot_hari.seri(D, 4, jam)
    assert hari_fs == a['hari'], (hari_fs, a['hari'])
    prov = {k: {m: o[m] for m in ('hot', 'luas', 'belum', 'padam')} for k, o in a['prov'].items()}
    for k, o in prov.items():
        o['fs'] = fs.get(k, [0] * 4)
    # firespot adalah BAGIAN dari hotspot (lokasi unik hari itu yang ada di cluster lolos syarat), jadi tak boleh melebihinya;
    # kalau ini jebol, satuan salah satu kolom berubah tanpa yang lain ikut (mis. firespot kembali dihitung per cluster)
    langgar = [(k, i, o['fs'][i], o['hot'][i]) for k, o in prov.items() for i in range(4) if o['fs'][i] > o['hot'][i]]
    assert not langgar, f'firespot melebihi hotspot di (prov, kolom, fs, hot): {langgar[:8]}'
    for f in ('angka.json', 'angka_nasional.json'):
        json.dump({'hari': a['hari'], 'prov': prov, 'faktor': a['faktor'], 'metode': 'generator/satelit.py ' + a['cutoff']}, open(os.path.join(kerja, f), 'w'))
    top6 = sorted(prov, key=lambda k: -prov[k]['hot'][3])[:6]
    tanpa = [k for k in top6 if k not in ADA_BARIS]
    if tanpa:
        sys.exit(f'6 provinsi teratas {top6} memuat provinsi tanpa baris/logo di templat: {tanpa}. Taruh lambang provinsinya di penanganan/logo/<kode>.png (PNG transparan, contoh logo/53.png); barisnya disalin dari baris Kaltim.')
    hb = lambda d: f'{d.day} {bnpb.BULAN[d.month - 1][:3]}'
    json.dump({'cutoff': f'{hb(D)} {D.year}, {jam.replace(":", ".")} WIB', 'kolom': [hb(D - dt.timedelta(days=i)) for i in (2, 1, 0)], 'hari': str(D.day),
               'padam_dari': hb(D - dt.timedelta(days=2)), 'bulan': bnpb.BULAN[D.month - 1], 'bln': bnpb.BULAN[D.month - 1][:3]},
              open(os.path.join(kerja, 'param.json'), 'w'))
    P = os.path.join(SINI, 'penanganan')
    jalankan('node', os.path.join(P, 'peta.mjs'), cwd=kerja)
    jalankan('python3', '-I', '-W', 'ignore', os.path.join(P, 'ganti.py'), kerja, 't1.pptx', cwd=kerja)
    jalankan('python3', '-I', os.path.join(P, 'tambah_peta.py'), 't1.pptx', 'peta-20okt.png', 'angka_nasional.json', cwd=kerja)
    bm = wa_operasi.bmkg(open(bmkg).read()) if bmkg else pil_sendiri.bahan(D, cuaca_riwayat.hitung(D, D)[D.isoformat()])
    src = lambda n: open(os.path.join(kerja, 'deck', 'x', 'ppt', 'slides', n)).read()
    lib = bnpb.pustaka(src('slide1.xml'), src('slide2.xml'))
    zi = zipfile.ZipFile(os.path.join(kerja, 't1.pptx')); zo = zipfile.ZipFile(os.path.join(kerja, 't2.pptx'), 'w', zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        d = zi.read(it.filename)
        if it.filename == 'ppt/slides/slide1.xml': d = bnpb.ganti_tabel(d.decode(), lib, top6, bm).encode()
        zo.writestr(it, d)
    zo.close()
    nama = f'Laporan Penanganan Pengendalian Karhutla {D:%d%m%y}.pptx'
    jalankan('python3', '-I', os.path.join(P, 'sementara.py'), 't2.pptx', nama, f'Angka {hb(D)} sementara, data s.d. {jam.replace(":", ".")} WIB.', cwd=kerja)
    print(jalankan('python3', '-I', os.path.join(P, 'cek6.py'), nama, cwd=kerja).strip())
    z = zipfile.ZipFile(os.path.join(kerja, nama))
    for n in z.namelist():
        if re.match(r'ppt/slides/slide\d+\.xml$', n):
            teks = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', z.read(n).decode()))
            assert '·' not in teks and '—' not in teks, f'titik tengah / em dash di {n}'
    jalankan('soffice', '--headless', '--convert-to', 'pdf', nama, cwd=kerja)
    os.makedirs(out, exist_ok=True)
    for f in (nama, nama[:-4] + 'pdf'):
        shutil.copy(os.path.join(kerja, f), out)
    nas = lambda m: round(sum(o[m][3] for o in prov.values()))
    print(f'ok {os.path.join(out, nama)} | {D} s.d. {jam} WIB: hot {nas("hot")} firespot {nas("fs")} luas {nas("luas")} '
          f'belum {nas("belum")} | 6 teratas {top6}')
    return os.path.join(out, nama)


if __name__ == '__main__':
    arg = sys.argv[1:]
    nilai = lambda o, b=None: arg[arg.index(o) + 1] if o in arg else b
    if not nilai('--tanggal'):
        sys.exit(__doc__)
    bangun(dt.date.fromisoformat(nilai('--tanggal')), nilai('--jam', '17:00'), nilai('--bmkg'),
           nilai('--out', os.path.expanduser('~/Downloads')))
