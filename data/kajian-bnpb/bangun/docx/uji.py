#!/usr/bin/env python3
"""Uji diri pembangun DOCX: rakit naskah/_contoh, ekspor PDF, periksa DOCX dan PDF dengan assert, lalu jalankan gerbang QA
repo (qa/periksa.py --semua). Satu GAGAL di gerbang = uji gagal (PEDOMAN D).

    .venv/bin/python bangun/docx/uji.py            # keluaran di bangun/docx/keluaran/contoh.{docx,pdf,manifest.json}

Gambar contoh dirender jalur produksi bangun/visual (render.mjs) dari spek nyata bila PNG-nya belum ada; render.mjs butuh
PLAYWRIGHT dan CHROME (lihat bangun/visual/README.md).
"""
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

SINI = Path(__file__).resolve().parent
sys.path.insert(0, str(SINI))
import bangun as B  # noqa: E402

T, AKAR, N = B.T, B.AKAR, B.N
CONTOH = AKAR / 'naskah' / '_contoh'
EM, TITIK = chr(0x2014), chr(0xB7)
# gambar contoh -> spek bangun/visual (relatif akar kajian); PNG, SVG, dan manifest dirender ke naskah/_contoh/gambar
SPEK = {'batang-irbi-nasional-2015-2024': 'bangun/visual/spek/03-batang-irbi-nasional.json',
        'peta-irbi-total-2024-nasional': 'bangun/visual/spek/01-peta-irbi-nasional.json',
        're-batang-irbi-dua-kolom': 'naskah/_contoh/spek/re-batang-dua-kolom.json'}


def siapkan():
    g = CONTOH / 'gambar'
    kurang = [AKAR / s for n, s in SPEK.items() if not (g / f'{n}.png').exists()]
    if kurang:
        h = subprocess.run(['node', str(AKAR / 'bangun/visual/render.mjs'), *map(str, kurang), f'--ke={g}'],
                           capture_output=True, text=True, timeout=600)
        if h.returncode:
            raise SystemExit(f'render.mjs gagal (setel PLAYWRIGHT dan CHROME, bangun/visual/README.md):\n{h.stdout}{h.stderr}')


def bagian_xml(z):
    return {n: z.read(n).decode('utf-8') for n in z.namelist() if n.endswith('.xml') and n.startswith('word/')}


def periksa(hasil):
    pk, docx, pdf = hasil['perakit'], hasil['docx'], hasil['pdf']
    with zipfile.ZipFile(docx) as z:
        x = bagian_xml(z)
        app = z.read('docProps/app.xml').decode('utf-8')
    doc = x['word/document.xml']
    semua = ''.join(x.values())
    # 1. font: hanya Roboto (w:rFonts, tema, tabel font, numbering)
    fonts = {v for at in re.findall(r'<w:rFonts ([^>]*)/>', semua) for v in re.findall(r'="([^"]+)"', at)}
    assert fonts == {'Roboto'}, f'D-4 rFonts bukan Roboto: {fonts}'
    tema = x['word/theme/theme1.xml']
    tf = set(re.findall(r'<a:latin typeface="([^"]*)"', tema))
    assert tf == {'Roboto'} and 'script=' not in tema, f'D-4 tema DOCX: {tf}'
    assert set(re.findall(r'w:name="([^"]+)"', x['word/fontTable.xml'])) == {'Roboto'}
    # 2. ukuran huruf >= batas bawah
    sz = [int(v) for v in re.findall(r'<w:sz w:val="(\d+)"', semua)]
    batas = T['tipografi_docx']['batas_bawah_pt'] * 2
    assert min(sz) >= batas, f'D-5 w:sz {min(sz)} < {batas}'
    # 3. em dash, titik tengah, emoji nol
    for n, s in x.items():
        assert EM not in s and TITIK not in s, f'D-1/D-2 di {n}'
    # 4. hex hanya dari tema.json, termasuk palet tema Word (a:srgbClr) dan warna sistem
    hexes = {h.upper() for h in re.findall(r'#([0-9A-Fa-f]{6})', json.dumps(T['warna']))}
    pakai = set(re.findall(r'w:(?:color|fill)="([0-9A-Fa-f]{6})"', semua)) | set(re.findall(r'<a:srgbClr val="([0-9A-Fa-f]{6})"', semua))
    asing = {h for h in pakai if h.upper() not in hexes}
    assert not asing, f'D-9 hex di luar tema.json: {asing}'
    assert '<a:sysClr' not in tema, 'D-9 tema Word masih memakai warna sistem'
    # 5. bidang daftar ada sekali, SEQ per objek, \r 1 di objek pertama tiap bab; awalan bab dari STYLEREF
    for kode in ('TOC \\o "1-3" \\h \\z \\u', 'TOC \\h \\z \\c "Tabel"', 'TOC \\h \\z \\c "Gambar"', 'TOC \\h \\z \\t "Judul Lampiran,1"'):
        assert doc.count(kode) == 1, f'bidang {kode} harus tepat satu'
    seq = re.findall(r'SEQ (Tabel|Gambar) \\\* ARABIC( \\r 1)? </w:instrText>.*?<w:t xml:space="preserve">(\d+)</w:t>', doc)
    n_obj = sum(len(v) for v in pk.objek.values())
    assert len(seq) == n_obj, f'D-7 SEQ {len(seq)} != objek bernomor {n_obj}'
    assert all((s == '1') == bool(rr) for _, rr, s in seq), 'SEQ: \\r 1 hanya di objek pertama tiap bab/lampiran'
    n_bab = sum(1 for lab, *_ in (o for v in pk.objek.values() for o in v) if re.match(r'\w+ \d+\.', lab))
    assert doc.count('STYLEREF 1 \\n \\t') == n_bab, f'B4 awalan keterangan bab dari STYLEREF: {doc.count("STYLEREF 1 \\n")} != {n_bab}'
    # 6. hasil daftar terisi: nomor halaman tiap entri = halaman penanda di PDF akhir
    halaman, n = B.baca_halaman(pdf, pk)
    assert halaman == hasil['halaman'], 'nomor halaman tersimpan berbeda dengan PDF akhir'
    entri = re.findall(r'<w:hyperlink w:anchor="(_Toc\d+)" w:history="1">.*?<w:tab/></w:r>(<w:r>(?:(?!</w:r>).)*</w:r>)</w:hyperlink>', doc)
    assert entri and all(f'>{halaman[bm]}</w:t>' in run for bm, run in entri), 'D-13 entri daftar tanpa nomor halaman benar'
    assert '>00</w:t>' not in doc, 'D-13 masih ada nomor halaman pengganti 00'
    # 7. Heading 1 bernomor "BAB %1" (bukan teks ketikan), judul tanpa label tertulis; seksi dan sampul
    assert len(re.findall(r'<w:pStyle w:val="Heading1"/>', doc)) == len(pk.bab)
    assert all(doc.count(f'<w:numId w:val="{B.NUM_BAB + b}"/>') == 1 for b in pk.bab), 'tiap Heading 1 bab bernomor otomatis'
    judul1 = re.findall(r'<w:p><w:pPr><w:pStyle w:val="Heading1"/>.*?</w:p>', doc)
    assert judul1 and not any('>BAB ' in j for j in judul1), 'label BAB harus dari penomoran Heading 1, bukan teks'
    assert 'w:val="BAB %1"' in x['word/numbering.xml']
    assert doc.count('w:fmt="lowerRoman" w:start="2"') == 1 and doc.count('w:fmt="decimal" w:start="1"') == 1, 'D-13 pgNumType'
    sampul = re.search(r'<w:sectPr[^>]*>.*?</w:sectPr>', doc, re.S)[0]
    assert pk.rid_ftr0 in sampul and pk.rid_hdr not in sampul and 'w:fmt="lowerRoman"' in sampul, 'sampul: kaki kosong, romawi'
    assert '<wp:anchor' not in doc, 'latar halaman harus di kepala halaman seksinya, bukan gambar badan'
    assert '<w:updateFields w:val="true"/>' in x['word/settings.xml'], 'D-13 updateFields'
    assert f'<Pages>{n}</Pages>' in app, f'P13 docProps/app.xml Pages != {n}'
    # 8. catatan kaki asli Word
    kaki = re.findall(r'<w:footnote w:id="(\d+)">', x['word/footnotes.xml'])
    assert len(kaki) == pk.kaki_id == doc.count('<w:footnoteReference '), 'catatan kaki tidak lengkap'
    # 9. tabel data: kepala diulang; kartu skenario dan kartu angka bertanda w:tblCaption
    for t in re.findall(r'<w:tbl>.*?</w:tbl>', doc, re.S):
        if f'w:fill="{B.hx(T["tipografi_docx"]["kepala_tabel"]["warna_isi"])}"' in t.split('</w:tr>')[0] and 'KepalaTabel' in t.split('</w:tr>')[0]:
            assert '<w:tblHeader/>' in t.split('</w:tr>')[0], 'D-20 kepala tabel tanpa tblHeader'
    assert doc.count('<w:tblCaption w:val="skenario"/>') == len(pk.kartu) > 0
    # 10. manifest angka dan halaman di samping DOCX
    man = json.loads(hasil['manifest'].read_text(encoding='utf-8'))
    assert man['angka'] and all({'kunci', 'tampil'} <= set(m) for m in man['angka']), 'manifest angka kosong'
    assert man['halaman'] and any(h['hex'] for h in man['halaman']), 'manifest halaman tanpa hex'
    # 11. PDF: hanya Roboto, tanpa em dash dan titik tengah, label kaki halaman sama dengan perhitungan
    f = subprocess.run(['pdffonts', str(pdf)], capture_output=True, text=True).stdout.splitlines()[2:]
    keluarga = {re.sub(r'^[A-Z]{6}\+', '', b.split()[0]).split('-')[0] for b in f if b.strip()}
    assert keluarga == {'Roboto'}, f'D-4 PDF font: {keluarga}'
    import pymupdf
    tujuan = hasil['tujuan']
    with pymupdf.open(pdf) as d:
        teks = ''.join(pg.get_text() for pg in d)
        assert EM not in teks and TITIK not in teks, 'D-1/D-2 di PDF'
        assert 'BAB 1\nPENDAHULUAN' in teks, 'label BAB dari penomoran tidak tercetak di atas judul'
        cek = 0
        a_d, a_i = tujuan[pk.bm_depan], tujuan[pk.bm_isi]
        for i, pg in enumerate(d):
            if i < a_d:
                continue
            kaki_kanan = [w[4] for w in pg.get_text('words') if w[1] > pg.rect.height - 60 and w[0] > pg.rect.width - 110]
            if not kaki_kanan:
                continue
            harap = B.roman(B.DX['romawi_mulai'] + i - a_d) if i < a_i else str(i - a_i + 1)
            assert kaki_kanan[0] == harap, f'halaman fisik {i + 1}: kaki {kaki_kanan} != {harap}'
            cek += 1
        assert cek > n // 2, f'hanya {cek} halaman berkaki terbaca'
    # 12. kartu skenario satu halaman (B5.11): keterangan, kepala kartu, dan baris Sumber-nya di halaman yang sama
    for _, ket, a, z in pk.kartu:
        assert tujuan[ket] == tujuan[a] == tujuan[z], (f'kartu skenario terbelah: keterangan hlm. {tujuan[ket] + 1}, kepala hlm. '
                                                       f'{tujuan[a] + 1}, Sumber hlm. {tujuan[z] + 1}')
    # 13. sisa tabel lanjutan >= n baris (B4): baris ke-n dari akhir dan baris terakhir satu halaman
    for a, z in pk.ekor:
        assert tujuan[a] == tujuan[z], (f'tabel lanjutan bersisa < {T["objek"]["tabel_sisa_baris_min"]} baris '
                                        f'(hlm. {tujuan[a] + 1} -> {tujuan[z] + 1})')
    # 14. L67: semua gaya berbahasa id-ID, pemenggalan otomatis aktif, pola hyph_id_ID terpasang di profil ekspor, dan memenggal
    gaya_semua = re.findall(r'<w:style .*?</w:style>', x['word/styles.xml'], re.S)
    tanpa_lang = [re.search(r'w:styleId="([^"]+)"', g)[1] for g in gaya_semua
                  if 'w:type="paragraph"' in g or 'w:type="character"' in g if '<w:lang w:val="id-ID"' not in g]
    assert gaya_semua and not tanpa_lang, f'L67 gaya tanpa w:lang id-ID: {tanpa_lang}'
    assert '<w:lang w:val="id-ID"' in x['word/styles.xml'].split('</w:docDefaults>')[0], 'L67 rPrDefault tanpa id-ID'
    assert '<w:autoHyphenation w:val="true"/>' in x['word/settings.xml'], 'L67 pemenggalan otomatis mati'
    tanda = B.PROFIL / 'kamus-id.json'
    assert tanda.exists() and json.loads(tanda.read_text(encoding='utf-8')) == B.KAMUS_SHA, \
        f'L67 pola hyph_id_ID belum terpasang di profil ekspor {B.PROFIL} (bukan profil pemilik)'
    with pymupdf.open(pdf) as d:
        baris = [''.join(s['text'] for s in ln['spans']).strip() for pg in d for b in pg.get_text('dict')['blocks']
                 for ln in b.get('lines', [])]
        penggal = sum(1 for a, b_ in zip(baris, baris[1:]) if re.search(r'[a-z]-$', a) and re.match(r'[a-z]', b_))
        assert penggal > 0, 'L67 tidak ada kata terpenggal di PDF: pola hyph_id_ID tidak dipakai LibreOffice'
        # 15. L71: metadata PDF (judul, penerbit, subjek, kata kunci), bahasa katalog id-ID, bookmark judul bab dan subbab
        md, toc = d.metadata, d.get_toc()
        assert md['title'] == pk.kj['judul'] and md['author'] == T['kajian']['penerbit'] and md['subject'] == pk.kj['subjudul'] \
            and md['keywords'], f'L71 metadata PDF: {md}'
        assert '/Lang (id-ID)' in d.xref_object(d.pdf_catalog()), 'L71 PDF tanpa /Lang id-ID'
        judul_bm = [t for _, t, _ in toc]
        assert 'BAB 1 PENDAHULUAN' in judul_bm and any(lv == 2 and re.match(r'1\.1 ', t) for lv, t, _ in toc), \
            f'L71 bookmark PDF tanpa judul bab/subbab: {judul_bm[:8]}'
        # urutan bagian depan KERANGKA §3: Ringkasan Eksekutif sebelum Daftar Tabel
        assert judul_bm.index('RINGKASAN EKSEKUTIF') < judul_bm.index('DAFTAR TABEL'), f'urutan bagian depan: {judul_bm[:8]}'
        # 16. L70: sampul belakang (penerbit, alamat, paragraf ringkas bertesis, tanpa nomor) dan kolofon keterangan terbitan
        akhir = d[-1].get_text()
        for s_ in T['header_footer']['sampul_belakang'][:2] + [pk.kj['judul']]:
            assert s_ in akhir, f'L70 sampul belakang tanpa "{s_}"'
        tesis = pk.k.angka.get(f'tesis.{pk.kajian}', {}).get('nilai', '')
        awal_tesis = re.split(r'\{\{', tesis)[0].strip()
        assert awal_tesis and awal_tesis in ' '.join(akhir.replace('-\n', '').split()), 'L70 sampul belakang tanpa paragraf ringkas bertesis'
        kolofon = d[tujuan[pk.bm_depan]].get_text() + d[tujuan[pk.bm_depan] + 1].get_text()
        for lab in ('JUDUL', 'PENERBIT', 'TAHUN TERBIT', 'BATAS DATA', 'CARA MENGUTIP'):
            assert lab in kolofon, f'L70 kolofon tanpa {lab}'
    core = zipfile.ZipFile(docx).read('docProps/core.xml').decode('utf-8')
    assert '<dc:language>id-ID</dc:language>' in core and T['kajian']['penerbit'] in core, 'L71 properti DOCX'
    return {'halaman': n, 'entri_daftar': len(entri), 'objek': n_obj, 'catatan_kaki': len(kaki), 'kaki_dicek': cek,
            'kartu': len(pk.kartu), 'tabel_ekor': len(pk.ekor), 'kata_terpenggal': penggal, 'bookmark': len(toc)}


def gagal_dengan(fungsi, harap):
    try:
        fungsi()
    except SystemExit as e:
        assert harap in str(e), f'pesan "{e}" tidak memuat "{harap}"'
        return
    raise AssertionError(f'lolos padahal harus ditolak: {harap}')


def uji_negatif():
    """Penjaga status final dan aturan pembangun menolak, bukan mengganti diam-diam."""
    dok = B.muat_dokumen(CONTOH)
    nask = {Path(n['nama']).stem: n for n in dok['naskah']}
    direktif = lambda nama_berkas, nama: next(b for b in N._jelajah(nask[nama_berkas]['blok'])
                                               if b['jenis'] == 'direktif' and b['nama'] == nama)

    def perakit(final=True, naskah='bab-02'):
        pk = B.Perakit(dok)
        pk.final, pk.naskah = final, nask[naskah]
        return pk
    foto = B.DX['sampul_foto'][dok['kajian']]
    asli, foto['berkas'] = foto['berkas'], 'gambar/foto/_uji-tidak-ada.jpg'  # foto sampul kajian nyata mungkin sudah diunduh
    try:
        gagal_dengan(lambda: perakit().sampul(), 'foto sampul')
    finally:
        foto['berkas'] = asli
    gagal_dengan(lambda: perakit().d_skenario(direktif('bab-02', 'skenario')), 'peta skenario')
    gagal_dengan(lambda: perakit(naskah='bab-03').d_gambar(direktif('bab-03', 'gambar')), 'gambar')
    # Daftar Singkatan dari data/glosarium.json, hanya singkatan yang muncul di naskah; final tanpa glosarium ditolak
    xml = ''.join(perakit(final=False).daftar_singkatan())
    assert '>DIBI<' in xml and '>PAMSIMAS<' not in xml, 'Daftar Singkatan: glosarium tidak dibaca atau memuat singkatan yang tidak dipakai'
    import tempfile
    asli = B.AKAR
    with tempfile.TemporaryDirectory() as tmp:
        B.AKAR = Path(tmp)
        try:
            gagal_dengan(lambda: perakit().daftar_singkatan(), 'glosarium')
        finally:
            B.AKAR = asli
    tanpa = {**nask['bab-01'], 'blok': [b for b in nask['bab-01']['blok'] if b.get('nama') != 'ringkasan-bab']}
    gagal_dengan(lambda: perakit().cek_ringkasan(tanpa), 'ringkasan-bab')
    gagal_dengan(lambda: B.render_ikon({'x': {'glif': 'khusus:tidak-ada', 'warna': '#051C2C', 'lingkaran': None, 'px': 8,
                                             'rasio': 0.6, 'berkas': str(B.KERJA / 'ikon-uji.png')}}, final=True), 'glif belum')
    # draf: peringatan, bukan galat
    pk = perakit(final=False)
    pk.cek_ringkasan(tanpa)
    assert pk.peringatan and 'ringkasan-bab' in pk.peringatan[-1]
    # grafik lebar penuh dipasang dua kolom: huruf 8 pt menjadi < 8 pt
    gw = CONTOH / 'gambar' / 'batang-irbi-nasional-2015-2024.png'
    gagal_dengan(lambda: perakit().cek_manifest_gambar(gw, {'berkas': gw.name, 'jenis': 'grafik', 'lebar': 'dua-kolom'},
                                                      T['objek']['lebar_cm']['dua-kolom']), 'huruf terkecil')
    # label keyakinan wajib di garis waktu, matriks, dan kartu skenario
    gw_ = direktif('bab-02', 'garis-waktu')
    gagal_dengan(lambda: perakit().wajib_keyakinan({**gw_, 'atribut': {k: v for k, v in gw_['atribut'].items() if k != 'keyakinan'}}),
                 'label keyakinan')


def gerbang_qa(hasil):
    """qa/periksa.py --semua atas keluaran contoh (gambar contoh: --visual); satu GAGAL = uji gagal."""
    h = subprocess.run([sys.executable, str(AKAR / 'qa/periksa.py'), '--docx', str(hasil['docx']), '--pdf', str(hasil['pdf']),
                        '--kajian', hasil['perakit'].kajian, '--visual', str(CONTOH / 'gambar'), '--semua'],
                       capture_output=True, text=True, timeout=1200)
    print(h.stdout[-6000:], h.stderr[-2000:], sep='')
    gagal = re.findall(r'^GAGAL (\S+)', h.stdout, re.M)
    assert h.returncode == 0 and not gagal, f'gerbang QA gagal: {", ".join(gagal) or h.stderr[-400:]}'


if __name__ == '__main__':
    siapkan()
    uji_negatif()
    keluar = B.KERJA / 'contoh.docx'
    hasil = B.bangun(CONTOH, keluar)
    png = B.KERJA / 'png'
    png.mkdir(exist_ok=True)
    for f in png.glob('contoh-*.png'):
        f.unlink()
    subprocess.run(['pdftoppm', '-r', '60', '-png', str(hasil['pdf']), str(png / 'contoh')], check=True)
    print(f'PNG: {png}/contoh-*.png')
    print('uji lolos:', json.dumps(periksa(hasil)))
    if '--tanpa-qa' not in sys.argv:
        gerbang_qa(hasil)
