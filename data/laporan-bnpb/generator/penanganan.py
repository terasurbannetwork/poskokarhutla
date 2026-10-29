"""Generator "Laporan Penanganan Pengendalian Karhutla DDMMYY" (2 slide: peta hotspot, tabel 6 provinsi).

Aturan pemilik (25 Okt 2026): cut-off 17.00 WIB hari laporan; kolom D-2, D-1, D dengan D = hari laporan, angka D sementara
s.d. jam cut-off (27 Okt: catatan kaki cukup sumber data, tanpa kalimat Firespot dan "Angka D sementara"); empat kelompok kolom
HOTSPOT, FIRESPOT, LUAS TERBAKAR, BELUM PADAM, masing-masing tiga hari dan berbintang;
halaman "Operasi Penanganan Karhutla" dibuang (sumbernya teks WA satgas, tidak ada untuk hari lampau), kecuali --operasi
memberi teks WA satgas hari itu (pemilik 27 Okt 2026).
Angka satelit dari satelit.hitung dan firespot dari firespot_hari.seri, keduanya mesin website. Firespot dihitung dalam
TITIK, bagian dari hotspot, jadi firespot <= hotspot di tiap sel tabel. Pil PM2,5 + cuaca dari
pil_sendiri (data sendiri, ambang resmi) atau dari teks WA BMKG bila --bmkg diberikan. Templat = deck BNPB 211026.

    python3 penanganan.py --tanggal 2026-10-25 [--jam 17:00] [--bmkg bmkg.txt] [--operasi wa_satgas.txt] [--out DIR]
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


def param_ha(D, hb, belum_kini, luas_00):
    """Label hari kelompok LUAS dan BELUM PADAM serta penanda hari di subjudul bila angkanya hari utuh terakhir (lihat bangun)."""
    kolom, geser = ([hb(D - dt.timedelta(days=i)) for i in g] for g in ((2, 1, 0), (3, 2, 1)))
    p = {'kolom_ha': kolom if luas_00 else geser, 'kolom_belum': kolom if belum_kini or luas_00 else geser,   # luas_00: belum hari utuh juga dilabeli cut-off 00.00
         'hari_ha': str((D if luas_00 else D - dt.timedelta(days=1)).day)}
    if luas_00:
        pass   # label kolom sudah tanggal cut-off; subjudul slide peta tanpa penanda (pemilik 27 Okt 2026: "hilangkan cutoff")
    elif belum_kini:
        p.update(luas_lbl=hb(D - dt.timedelta(days=1)), belum_lbl=hb(D))
    else:
        p['ha_lbl'] = hb(D - dt.timedelta(days=1))
    return p


def bangun(D, jam, bmkg, out, operasi=None, ha_utuh=False, belum_kini=False, luas_00=False):
    """ha_utuh: angka.json luas/belum/padam sudah digeser pemanggil ke hari sebelumnya (indeks 3 = D-1, hari utuh terakhir website);
    label kelompok LUAS dan BELUM PADAM, subjudul padam, dan subjudul slide peta ikut bergeser (catatan kaki tidak: sudah penuh satu baris) (pemilik 27 Okt 2026).
    belum_kini (bersama ha_utuh): belum padam TIDAK digeser (indeks 3 = D, dari belum_kini.json website sesudah lintasan siang NOAA);
    hanya luas dan padam yang hari utuh terakhir (pemilik 27 Okt 2026).
    luas_00 (bersama ha_utuh): luas dan padam dilabeli tanggal cut-off 00.00-nya, yaitu hari berikutnya (luas hari utuh 26 Okt = kolom 27 Okt);
    subjudul padam ikut, slide peta menulis "(cut-off 00.00)" (pemilik 27 Okt 2026: "cutoff luas terbakar kan di jam 00")."""
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
               'padam_dari': hb(D - dt.timedelta(days=3 if ha_utuh and not luas_00 else 2)), 'bulan': bnpb.BULAN[D.month - 1], 'bln': bnpb.BULAN[D.month - 1][:3],
               **(param_ha(D, hb, belum_kini, luas_00) if ha_utuh else {})},
              open(os.path.join(kerja, 'param.json'), 'w'))
    P = os.path.join(SINI, 'penanganan')
    jalankan('node', os.path.join(P, 'peta.mjs'), cwd=kerja)
    jalankan('python3', '-I', '-W', 'ignore', os.path.join(P, 'ganti.py'), kerja, 't1.pptx', cwd=kerja)
    jalankan('python3', '-I', os.path.join(P, 'tambah_peta.py'), 't1.pptx', 'peta-20okt.png', 'angka_nasional.json', *(['operasi'] if operasi else []), cwd=kerja)
    bm = wa_operasi.bmkg(open(bmkg).read()) if bmkg else pil_sendiri.bahan(D, cuaca_riwayat.hitung(D, D)[D.isoformat()])
    op = wa_operasi.operasi(open(operasi).read()) if operasi else None
    src = lambda n: open(os.path.join(kerja, 'deck', 'x', 'ppt', 'slides', n)).read()
    lib = bnpb.pustaka(src('slide1.xml'), src('slide2.xml'))
    zi = zipfile.ZipFile(os.path.join(kerja, 't1.pptx')); zo = zipfile.ZipFile(os.path.join(kerja, 't2.pptx'), 'w', zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        d = zi.read(it.filename)
        if it.filename == 'ppt/slides/slide1.xml': d = bnpb.ganti_tabel(d.decode(), lib, top6, bm).encode()
        if op and it.filename == 'ppt/slides/slide3.xml': d = bnpb.ganti_operasi(d.decode(), op).encode()
        if op and it.filename == 'ppt/slides/_rels/slide3.xml.rels':   # ikon pil PEMILIK Pemda (tidak ada di templat)
            d = d.decode().replace('</Relationships>', '<Relationship Id="rIdPemda" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/ikon-pemda.png"/></Relationships>').encode()
        zo.writestr(it, d)
    if op: zo.writestr('ppt/media/ikon-pemda.png', open(os.path.join(P, 'ikon', 'pemda.png'), 'rb').read())
    zo.close()
    nama = f'Laporan Penanganan Pengendalian Karhutla {D:%d%m%y}.pptx'
    shutil.copy(os.path.join(kerja, 't2.pptx'), os.path.join(kerja, nama))   # catatan kaki "Angka D sementara" dibuang (pemilik 27 Okt 2026)
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
           nilai('--out', os.path.expanduser('~/Downloads')), nilai('--operasi'))
