"""Semua PPT laporan keluar lewat mesin deck BNPB (deck.py di skill ppt-konsultan), pemilik 31 Okt 2026:
"kalo bentuknya dalam ppt semuanya harus pasti ke deck.py".

Generator (harian.py, penanganan.py, ...) tetap menghitung data dan menggambar slide isi. Berkas hasilnya lalu dibingkai
ulang deck.py: sampul dan penutup templat terbaru, pita kaki navy, nomor halaman, warna palet, penanda bagian, dan
gerbang QA deck.py. Slide berteks "Terima kasih" diganti penutup, slide pertama diganti sampul (bila sampul=True),
sisanya masuk sebagai slide "impor" dengan urutan aslinya.

    python lewat_deck.py "Laporan X.pptx" --format harian --judul "Laporan Kejadian Bencana Harian" \\
        --subjudul "Periode ..." --tanggal 2026-10-30
"""
import argparse, datetime as dt, json, os, re, shutil, subprocess, sys, zipfile

SKILL = os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb'))
KEPALA = {'nama': 'Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)',
          'jabatan': 'Kepala Badan Nasional Penanggulangan Bencana'}
# 2 Nov pemilik: foto sampul tetap foto pemadam lama; berkasnya di repo (generator/sampul), tidak bergantung aset mesin
FOTO = ([os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sampul', 'media', 'image1.png').replace(os.sep, '/')], 'Foto: DenY Krisbiyantoro, CC BY-SA 4.0, Wikimedia Commons')


def urutan_slide(pptx):
    """[(nomor 1.., teks slide)] sesuai urutan presentation.xml (stdlib saja: generator juga jalan di Windows)."""
    z = zipfile.ZipFile(pptx)
    rel = {}
    for r in re.findall(r'<Relationship [^>]*>', z.read('ppt/_rels/presentation.xml.rels').decode()):
        rel[re.search(r'Id="([^"]+)"', r)[1]] = re.search(r'Target="([^"]+)"', r)[1].lstrip('/').removeprefix('ppt/')
    ids = re.findall(r'<p:sldId [^>]*r:id="([^"]+)"', z.read('ppt/presentation.xml').decode())
    return [(n, ''.join(re.findall(r'<a:t>([^<]*)</a:t>', z.read('ppt/' + rel[i]).decode()))) for n, i in enumerate(ids, 1)]


def buang_pil_cutoff(pptx):
    """Pemilik 9 Nov 2026: Laporan Penanganan tanpa pil CUT OFF DATA, jam data sudah ada di kaki Sumber. Pil = dua bentuk di posisi sama
    (latar roundRect + teks), jadi semua bentuk sekoordinat dengan teks pil ikut dibuang. Templat generator tetap memuat pil karena ganti.py mengisinya."""
    z = zipfile.ZipFile(pptx); isi = [(i, z.read(i.filename)) for i in z.infolist()]; z.close()
    letak = lambda s: (lambda m: m[0] if m else None)(re.search(r'<a:off [^>]*/>\s*<a:ext [^>]*/>', s))
    with zipfile.ZipFile(pptx, 'w', zipfile.ZIP_DEFLATED) as zo:
        for i, b in isi:
            if re.fullmatch(r'ppt/slides/slide\d+\.xml', i.filename):
                bagian_xml = re.split(r'(<p:sp>.*?</p:sp>)', b.decode('utf-8'), flags=re.S)
                pil = {letak(s) for s in bagian_xml if s.startswith('<p:sp>') and 'CUT OFF DATA' in s} - {None}
                b = ''.join(s for s in bagian_xml if not (s.startswith('<p:sp>') and letak(s) in pil)).encode('utf-8')
            zo.writestr(i, b)
    return pptx


def cek_tanpa_pil(pptx):
    """Gerbang hasil akhir Laporan Penanganan: tidak ada pil CUT OFF DATA di slide mana pun."""
    z = zipfile.ZipFile(pptx); ada = [n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n) and b'CUT OFF DATA' in z.read(n)]; z.close()
    if ada: raise RuntimeError(f'pil CUT OFF DATA masih ada di {ada}')
    return pptx


def bingkai(pptx, format, judul=None, subjudul=None, tanggal=None, sampul=True, foto=FOTO, penyaji=KEPALA, kota='Jakarta',
            keluar=None, bagian=None, pdf=True, kepada=None, tanpa_kepada=None, susun=None, spek_tambah=None):
    """Bingkai ulang pptx generator lewat deck.py; mengembalikan path PPTX akhir (bawaan: menimpa nama asli).
    Berkas mentah generator disimpan berakhiran ' (isi).pptx' di folder yang sama untuk jejak."""
    deck = os.path.join(SKILL, 'scripts', 'deck.py')
    py = os.path.join(SKILL, '.venv', 'Scripts', 'python.exe') if os.name == 'nt' else os.path.join(SKILL, '.venv', 'bin', 'python')   # 2 Nov: Windows
    if not os.path.exists(deck) or not os.path.exists(py):
        sys.exit(f'deck.py tidak ditemukan di {SKILL} (setel DECK_BNPB). Semua PPT wajib lewat deck.py (pemilik 31 Okt 2026).')
    pptx = os.path.abspath(pptx); keluar = os.path.abspath(keluar or pptx)
    isi = pptx[:-5] + ' (isi).pptx'
    if format == 'penanganan':   # pemilik 8 Nov 2026: logo KRIS di tiap slide
        import kris; kris.pasang_isi(pptx)
        buang_pil_cutoff(pptx)
    shutil.copyfile(pptx, isi)
    tanggal = tanggal or dt.date.today()
    if format == 'penanganan':
        # pemilik 3 Nov 2026: "untuk laporan karhutla gausah pake cover depan belakang". Sampul dan penutup selalu dibuang,
        # juga bila pemanggil masih menyusunnya.
        sampul = False
        susun = [b for b in susun if b.get('jenis') not in ('sampul', 'penutup')] if susun is not None else None
    fotos, kredit = foto
    slide = []
    for n, teks in urutan_slide(isi):
        if n == 1 and sampul:
            slide.append({'jenis': 'sampul', 'layout': 'putih', 'foto': fotos, 'kredit': kredit, 'kota': kota,
                          'judul_sampul': judul, 'subjudul': subjudul, 'penyaji': penyaji,   # 2 Nov: deck.py terbaru wajib pil 'kepada' atau alasan 'tanpa_kepada'
                          **({'kepada': kepada} if kepada else {'tanpa_kepada': tanpa_kepada} if tanpa_kepada else {})})
        elif sampul and 'Terima kasih' in teks:
            slide.append({'jenis': 'penutup', 'layout': 'putih', 'foto': fotos, 'kredit': kredit})
        else:
            slide.append({'jenis': 'impor', 'pptx': isi, 'halaman': n})
    if susun is not None:
        # 2 Nov pemilik (baseline paparan Kepala 011126): urutan halaman diatur pemanggil. Butir {'halaman': n, ...} = slide generator
        # ke-n (boleh membawa 'bagian', 'sumber'); {'jenis': 'sampul'|'penutup'} memakai isian bawaan di atas; lainnya apa adanya
        # (mis. {'jenis': 'daftar-isi'}, {'jenis': 'pembatas-seksi', 'bagian': 1}).
        bawaan = {x['jenis']: x for x in slide if x['jenis'] in ('sampul', 'penutup')}
        slide = [dict({'jenis': 'impor', 'pptx': isi}, **b) if 'halaman' in b and 'jenis' not in b
                 else dict(bawaan.get(b['jenis'], {}), **b) for b in susun]
    spek = {'format': format, 'pesan_kunci': f'{judul or "Laporan"}, {tanggal:%d-%m-%Y}.', 'judul_dokumen': judul or 'Laporan BNPB',
            'kajian': 'rehab', 'tanggal': tanggal.isoformat(), 'slide': slide, **({'bagian': bagian} if bagian else {}), **(spek_tambah or {})}
    sp = pptx[:-5] + ' (spek deck).json'
    json.dump(spek, open(sp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # 2 Nov (Windows): deck.py menulis jalur masukan relatif ke folder keluaran (os.path.relpath), yang gagal bila masukan dan
    # keluaran beda drive (skill di C:, repo di D:). Bangun di folder kerja sementara pada drive skill; masukan disalin ke sana.
    kerja = None; sp_b, keluar_b = sp, keluar
    drv = lambda p: os.path.splitdrive(os.path.abspath(p))[0].lower()
    if os.name == 'nt' and drv(keluar) != drv(SKILL):
        import tempfile
        tmp = tempfile.gettempdir() if drv(tempfile.gettempdir()) == drv(SKILL) else os.path.join(SKILL, '..', '.kerja')
        os.makedirs(tmp, exist_ok=True); kerja = tempfile.mkdtemp(prefix='lewat-deck-', dir=tmp)
        isi_k = os.path.join(kerja, 'isi.pptx'); shutil.copyfile(isi, isi_k)
        spek_k = json.loads(json.dumps(spek))
        lain = {}   # 5 Nov: impor dari pptx lain (lampiran kab/kota penanganan 051126) ikut disalin, bukan ditimpa jadi isi.pptx
        for n_, sl in enumerate(spek_k['slide']):
            if sl.get('pptx'):
                if os.path.abspath(sl['pptx']) == os.path.abspath(isi): sl['pptx'] = isi_k.replace(os.sep, '/')
                else:
                    if sl['pptx'] not in lain:
                        lain[sl['pptx']] = shutil.copyfile(sl['pptx'], os.path.join(kerja, f'impor{len(lain) + 1}.pptx'))
                    sl['pptx'] = lain[sl['pptx']].replace(os.sep, '/')
            if sl.get('foto'):
                sl['foto'] = [shutil.copyfile(f, os.path.join(kerja, f'foto{n_}_{i}{os.path.splitext(f)[1]}')).replace(os.sep, '/') for i, f in enumerate(sl['foto'])]
        sp_b = os.path.join(kerja, 'spek.json'); json.dump(spek_k, open(sp_b, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        keluar_b = os.path.join(kerja, os.path.basename(keluar))
    r = subprocess.run([py, deck, sp_b, keluar_b, *(['--pdf'] if pdf else []), '--akar', os.path.join(SKILL, 'assets', 'proyek-bnpb')],
                       capture_output=True, text=True)
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else '', file=sys.stderr)
    if kerja:   # hasil (pptx, pdf, manifest, *.gagal.*) dipindah ke folder keluaran, folder kerja dibuang
        akar_k = os.path.splitext(os.path.basename(keluar))[0]
        for f in os.listdir(kerja):
            if f.startswith(akar_k): shutil.move(os.path.join(kerja, f), os.path.join(os.path.dirname(keluar), f))
        shutil.rmtree(kerja, ignore_errors=True)
    if r.returncode:
        sys.exit(f'deck.py gagal ({r.returncode}):\n{r.stderr[-3000:]}')
    if 'GAGAL' in r.stdout:
        print('PERINGATAN: gerbang QA deck.py GAGAL, baca laporan qa/ di folder keluaran sebelum menyerahkan', file=sys.stderr)
    if format == 'penanganan': kris.cek_isi(keluar); cek_tanpa_pil(keluar)
    return keluar


def serah_revisi(pptx, pdf=None):
    """Pemilik 9 Nov 2026 (laporan harian bencana dan penanganan karhutla): tiap keluaran punya folder sendiri, PPT dan PDF di dalamnya
    bernama tanpa (revN). '<nama> (rev3).pptx' masuk 'Revisi 3/'; nama tanpa (revN) masuk folder bernomor berikutnya (mulai Revisi 1).
    Berkas kerja (isi, spek, manifest) tetap di folder hari."""
    m = re.fullmatch(r'(.*?)(?: \(rev(\d+)\))?\.pptx', os.path.basename(pptx))
    akar = os.path.dirname(os.path.abspath(pptx))
    n = m[2] or 1 + max([int(x[7:]) for x in os.listdir(akar) if re.fullmatch(r'Revisi \d+', x)] + [0])
    ke = os.path.join(akar, f'Revisi {n}'); os.makedirs(ke, exist_ok=True)
    os.replace(pptx, os.path.join(ke, m[1] + '.pptx'))
    if pdf:
        try: os.replace(pdf, os.path.join(ke, m[1] + '.pdf'))
        except PermissionError:   # PDF lama di folder itu sedang dibuka pemilik
            import time; os.replace(pdf, os.path.join(ke, m[1] + time.strftime(' %H%M') + '.pdf'))
    return ke


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('pptx'); ap.add_argument('--format', required=True); ap.add_argument('--judul'); ap.add_argument('--subjudul')
    ap.add_argument('--tanggal', type=dt.date.fromisoformat); ap.add_argument('--tanpa-sampul', action='store_true'); ap.add_argument('--keluar')
    a = ap.parse_args()
    print(bingkai(a.pptx, a.format, a.judul, a.subjudul, a.tanggal, sampul=not a.tanpa_sampul, keluar=a.keluar))
