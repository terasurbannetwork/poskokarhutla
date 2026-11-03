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
KEPALA = {'nama': 'Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si., M.Si. (Han)',
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
        for n_, sl in enumerate(spek_k['slide']):
            if sl.get('pptx'): sl['pptx'] = isi_k.replace(os.sep, '/')
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
    return keluar


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('pptx'); ap.add_argument('--format', required=True); ap.add_argument('--judul'); ap.add_argument('--subjudul')
    ap.add_argument('--tanggal', type=dt.date.fromisoformat); ap.add_argument('--tanpa-sampul', action='store_true'); ap.add_argument('--keluar')
    a = ap.parse_args()
    print(bingkai(a.pptx, a.format, a.judul, a.subjudul, a.tanggal, sampul=not a.tanpa_sampul, keluar=a.keluar))
