"""BL-06 bot laporan: --isian, nama shape stabil, <deck>.kunci.json (harian_ringkas.py, penanganan_otomatis.py). Tanpa jaringan.

    py -3.14 -m unittest discover -s data/laporan-bnpb/generator/tests -v
"""
import collections, contextlib, io, json, os, re, shutil, sys, tempfile, unittest, zipfile

GEN = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AKAR = os.path.abspath(os.path.join(GEN, '..', '..', '..'))
sys.path.insert(0, GEN)
import harian_ringkas as hr          # noqa: E402
import penanganan_otomatis as po     # noqa: E402

P = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ' \
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'


def sp(i, nama, x, y, cx, cy, *baris):
    par = ''.join(f'<a:p><a:r><a:rPr lang="id-ID"/><a:t>{t}</a:t></a:r></a:p>' for t in baris) or '<a:p/>'
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{i}" name="{nama}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/>'
            f'<a:ext cx="{cx}" cy="{cy}"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/>{par}</p:txBody></p:sp>')


def pic(i, nama, x, y):
    return (f'<p:pic><p:nvPicPr><p:cNvPr id="{i}" name="{nama}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill/><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/>'
            f'<a:ext cx="300000" cy="300000"/></a:xfrm></p:spPr></p:pic>')


def tabel(i, nama, baris):
    tr = ''.join('<a:tr h="300000">' + ''.join(f'<a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>{c}</a:t></a:r></a:p></a:txBody></a:tc>' for c in b) + '</a:tr>'
                 for b in baris)
    return (f'<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="{i}" name="{nama}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>'
            f'<p:xfrm><a:off x="600000" y="4000000"/><a:ext cx="4000000" cy="900000"/></p:xfrm><a:graphic><a:graphicData><a:tbl>{tr}</a:tbl>'
            f'</a:graphicData></a:graphic></p:graphicFrame>')


def slide(isi):
    return (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld {P}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/>'
            f'<p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>{"".join(isi)}</p:spTree></p:cSld></p:sld>')


METRIK_X = [(8279352, 'HOTSPOT'), (9079352, 'FIRESPOT'), (9879352, 'LUAS TERBAKAR'), (10759352, 'BELUM PADAM')]


def slide_penanganan():
    """Tiruan slide Peta Hotspot penanganan: judul, subjudul berangka sistem, 4 kartu, tabel 6 provinsi tiruan, kaki deck.py."""
    s, n = [], iter(range(10, 999))
    s.append(sp(next(n), 'Text 0', 548640, 274320, 9000000, 600000, 'Peta Hotspot untuk Pengendalian dan Penanganan Karhutla 2026'))
    s.append(sp(next(n), 'Text 1', 548640, 905256, 9000000, 250000, 'Terbanyak di Kalimantan Timur (756 titik). Total: 1.852 titik, 1.722 ha'))
    s.append(sp(next(n), 'Text 7', 8849380, 896112, 2000000, 250000, 'CUT OFF DATA   17 Nov 2026, 18.00 WIB'))
    for k, (lab, nilai) in enumerate([('HOTSPOT', '1.852 titik'), ('FIRESPOT', '546 titik'), ('LUAS TERBAKAR', '1.722 ha'), ('BELUM PADAM', '1.438 ha')]):
        x = 1078992 + k * 2750928
        s.append(sp(next(n), f'Peta {9003 + 4 * k}', x, 1435608, 2000000, 450000, lab))
        s.append(sp(next(n), f'Peta {9004 + 4 * k}', x, 1435608, 2000000, 450000, nilai))
    s.append(pic(next(n), 'Ikon Hotspot', 768096, 1568196))
    s.append(sp(next(n), 'Peta 9017', 7301920, 2029968, 900000, 300000, 'PROVINSI'))
    for x, lab in METRIK_X:
        s.append(sp(next(n), 'Peta 9020', x + 246723, 2029968, 554000, 300000, lab, '(titik)' if lab in ('HOTSPOT', 'FIRESPOT') else '(ha)'))
    for r, (prov, angka) in enumerate([('Kalimantan Timur', (756, 288, 290, 702)), ('Papua Selatan', (501, 159, 419, 414)), ('Maluku', (57, 8, 108, 31))]):
        y = 2414016 + r * 331012
        s.append(sp(next(n), 'Peta 9030', 7073320, y + 69494, 230000, 200000, str(r + 1)))
        s.append(sp(next(n), 'Peta 9031', 7347640, y, 900000, 300000, prov))
        for (x, _), v in zip(METRIK_X, angka):
            s.append(sp(next(n), 'Peta 9032', x, y, 800000, 300000, str(v)))
    s.append(sp(next(n), 'T', 3008795, 5897880, 900000, 200000, 'Tanpa hotspot'))
    s.append(sp(next(n), 'T', 4386872, 5897880, 900000, 200000, '1 sampai 100 titik'))
    s.append(pic(next(n), 'KRIS isi', 9782170, 425196))
    s.append(sp(next(n), 'TextBox 9205', 751840, 6510020, 7000000, 297180, 'Sumber: Satelit NASA FIRMS (VIIRS dan MODIS), 17 Nov 2026 18.00 WIB'))
    s.append(sp(next(n), 'TextBox 9203', 11094720, 6510020, 548640, 297180, '1'))
    s.append(sp(next(n), 'TextBox 9207', 548640, 25400, 5547360, 177800, '01  Situasi'))
    return slide(s)


def slide_harian():
    """Tiruan slide harian: nama 'T' kembar, seksi RENCANA AKSI, tabel asli (graphicFrame) berkepala metrik."""
    s = [sp(2, 'T', 548640, 292608, 9000000, 500000, 'Laporan 17-18 November 2026: Terdapat 9 kejadian bencana'),
         sp(3, 'T', 694944, 5541264, 2000000, 200000, 'RENCANA AKSI'),
         sp(4, 'T', 1143000, 5788152, 2000000, 150000, 'Banjir'),
         sp(5, 'T', 1143000, 5961888, 2000000, 300000, 'Memantau banjir di dua provinsi yang berdampak pada 12.422 KK.'),
         sp(6, 'T', 3538728, 5788152, 2000000, 150000, 'Kekeringan'),
         sp(7, 'T', 3538728, 5961888, 2000000, 300000, 'Mendukung BPBD Blitar menyalurkan air bersih.'),
         sp(8, 'K', 3538728, 5961888, 2000000, 300000),
         sp(9, 'K', 1143000, 5961888, 2000000, 300000),
         pic(10, 'Sektor', 100, 100), pic(11, 'Sektor', 200, 200),
         tabel(12, 'Table 1', [['PROVINSI', 'HOTSPOT', 'CATATAN'], ['Riau', '12', 'aman'], ['Jambi', '3', '-']])]
    return slide(s)


def buat_pptx(f, slides):
    rel = ''.join(f'<Relationship Id="rId{i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i + 1}.xml"/>'
                  for i in range(len(slides)))
    ids = ''.join(f'<p:sldId id="{256 + i}" r:id="rId{i + 2}"/>' for i in range(len(slides)))
    with zipfile.ZipFile(f, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        z.writestr('ppt/presentation.xml', f'<?xml version="1.0"?><p:presentation {P}><p:sldIdLst>{ids}</p:sldIdLst></p:presentation>')
        z.writestr('ppt/_rels/presentation.xml.rels', f'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rel}</Relationships>')
        for i, x in enumerate(slides):
            z.writestr(f'ppt/slides/slide{i + 1}.xml', x)


def inventaris(f):
    """[(slide, nama, teks)] menurut urutan presentation.xml; teks = semua a:t."""
    with zipfile.ZipFile(f) as z:
        return [(n, s['nama'], s['teks'], json.dumps(s['tbl'])) for n, berkas in enumerate(hr.urutan_berkas_slide(z), 1) for s in hr.baca_shape(z.read(berkas).decode())]


def baca_json(f):
    with open(f, encoding='utf-8') as b: return json.load(b)


def tanpa_nama(f):
    with zipfile.ZipFile(f) as z:
        return {n: re.sub(rb'(<p:cNvPr [^>]*?name=")[^"]*"', rb'\1"', z.read(n)) for n in z.namelist()}


class TestNamaDanKunci(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix='bl06-')
        self.f = os.path.join(self.d, 'Laporan Uji 181126.pptx')
        buat_pptx(self.f, [slide_penanganan(), slide_harian()])
        self.asli = os.path.join(self.d, 'asli.pptx'); shutil.copyfile(self.f, self.asli)
        self.kunci = hr.namai_deck(self.f)

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def test_nama_unik_per_slide_dan_bawaan_bermakna_tetap(self):
        inv = inventaris(self.f)
        for n in (1, 2):
            nama = [x[1] for x in inv if x[0] == n]
            kembar = [k for k, v in collections.Counter(nama).items() if v > 1]
            self.assertEqual(kembar, [], f'slide {n}')
            for x in nama:
                self.assertTrue(x.startswith(f's{n}_') or x in ('KRIS isi', 'Ikon Hotspot', 'Sektor'), x)
        nama1 = {x[2]: x[1] for x in inv if x[0] == 1}
        self.assertEqual(nama1['1.852 titik'], 's1_kpi_hotspot')
        self.assertEqual(nama1['HOTSPOT'], 's1_kpi_hotspot_label')
        self.assertEqual(nama1['Kalimantan Timur'], 's1_tabel_b1_provinsi')
        self.assertEqual(nama1['Papua Selatan'], 's1_tabel_b2_provinsi')
        self.assertTrue(nama1['Sumber: Satelit NASA FIRMS (VIIRS dan MODIS), 17 Nov 2026 18.00 WIB'] == 's1_kaki_sumber')
        self.assertEqual(nama1['Peta Hotspot untuk Pengendalian dan Penanganan Karhutla 2026'], 's1_judul')
        self.assertIn('Ikon Hotspot', [x[1] for x in inv if x[0] == 1])
        nama2 = {x[2]: x[1] for x in inv if x[0] == 2}
        self.assertEqual(nama2['RENCANA AKSI'], 's2_rencana_aksi_label')
        self.assertEqual(nama2['Banjir'], 's2_rencana_aksi_b1_1')
        self.assertEqual(nama2['Kekeringan'], 's2_rencana_aksi_b1_2')
        self.assertEqual(sorted(x[1] for x in inv if x[0] == 2 and x[1].startswith(('Sektor', 's2_sektor'))), ['Sektor', 's2_sektor'])

    def test_nama_deterministik(self):
        lagi = os.path.join(self.d, 'lagi.pptx'); shutil.copyfile(self.asli, lagi); hr.namai_deck(lagi)
        self.assertEqual(inventaris(lagi), inventaris(self.f))
        self.assertEqual(baca_json(lagi[:-5] + '.kunci.json'), self.kunci)

    def test_hanya_nama_yang_berubah(self):
        """D9: teks, posisi, tabel, berkas lain sama persis; yang beda hanya atribut name cNvPr."""
        self.assertEqual([x[:1] + x[2:] for x in inventaris(self.asli)], [x[:1] + x[2:] for x in inventaris(self.f)])
        self.assertEqual(tanpa_nama(self.asli), tanpa_nama(self.f))
        self.assertNotEqual([x[1] for x in inventaris(self.asli)], [x[1] for x in inventaris(self.f)])

    def test_isi_kunci_json(self):
        f = self.f[:-5] + '.kunci.json'
        self.assertTrue(os.path.exists(f))
        k = baca_json(f)
        self.assertEqual(k, self.kunci)
        nama_slide = collections.defaultdict(set)
        for n, nm, *_ in inventaris(self.f): nama_slide[n].add(nm)
        for e in k:
            self.assertLessEqual(set(e), {'slide', 'shape', 'angka', 'sel', 'sel_dasar'})
            self.assertEqual('sel' in e, 'sel_dasar' in e)
            self.assertIsInstance(e['slide'], int); self.assertIn(e['shape'], nama_slide[e['slide']])
            if 'sel' in e:
                self.assertEqual(len(e['sel']), 2); self.assertTrue(all(isinstance(v, int) for v in e['sel']))
        bentuk = {(e['slide'], e['shape']) for e in k if 'sel' not in e}
        for m in ('hotspot', 'firespot', 'luas_terbakar', 'belum_padam'):   # 4 angka sistem (TIKET BL-06)
            self.assertIn((1, f's1_kpi_{m}'), bentuk)
            for b in (1, 2, 3): self.assertIn((1, f's1_tabel_b{b}_{m}'), bentuk)
            self.assertIn((1, f's1_kpi_{m}_label'), bentuk)        # label kartu tak bisa diganti ke/dari metrik
            self.assertIn((1, f's1_tabel_kepala_{m}'), bentuk)     # kepala kolom metrik
        self.assertIn((1, 's1_subjudul'), bentuk)
        self.assertNotIn((1, 's1_tabel_b1_provinsi'), bentuk); self.assertNotIn((1, 's1_tabel_kepala_provinsi'), bentuk)
        self.assertNotIn((1, 's1_judul'), bentuk)
        sel = sorted(tuple(e['sel']) for e in k if 'sel' in e)
        self.assertEqual(sel, [(0, 1), (1, 1), (2, 1)])   # tabel asli: kepala HOTSPOT [0, 1] dan selnya; PROVINSI/CATATAN tidak
        self.assertFalse(any(e['slide'] == 2 and 'sel' not in e for e in k))   # slide harian tanpa angka sistem

    def test_tanpa_tulis_tidak_menulis(self):
        f = os.path.join(self.d, 'kering.pptx'); shutil.copyfile(self.asli, f)
        k = hr.namai_deck(f, tulis=False)
        self.assertFalse(os.path.exists(f[:-5] + '.kunci.json'))
        self.assertEqual(tanpa_nama(f), tanpa_nama(self.asli)); self.assertEqual(inventaris(f), inventaris(self.asli))
        self.assertEqual(k, self.kunci)

    def test_deck_nyata_bila_ada(self):
        """Deck akhir yang sudah ada di repo (Revisi terakhir): nama unik, kunci memuat 4 kartu angka sistem; harian tanpa karhutla = kunci kosong."""
        R = os.path.join(AKAR, 'data', 'laporan-bnpb')
        pen = os.path.join(R, 'penanganan-karhutla', '2026-11', '2026-11-17', 'Revisi 4', 'Laporan Penanganan Pengendalian Karhutla 171126.pptx')
        har = os.path.join(R, 'harian', '2026-11', '2026-11-18', 'Revisi 5', 'Laporan Kejadian Bencana Harian 181126.pptx')
        if not (os.path.exists(pen) and os.path.exists(har)): self.skipTest('deck arsip tidak ada di mesin ini')
        for f, harap in ((pen, True), (har, False)):
            c = os.path.join(self.d, os.path.basename(f)); shutil.copyfile(f, c)
            k = hr.namai_deck(c)
            for n in {x[0] for x in inventaris(c)}:
                nama = [x[1] for x in inventaris(c) if x[0] == n]
                self.assertEqual(len(nama), len(set(nama)), (f, n))
            self.assertEqual([x[:1] + x[2:] for x in inventaris(f)], [x[:1] + x[2:] for x in inventaris(c)])
            if harap:
                self.assertTrue({f's1_kpi_{m}' for m in ('hotspot', 'firespot', 'luas_terbakar', 'belum_padam')} <= {e['shape'] for e in k if e['slide'] == 1})
                self.assertTrue(any(e['slide'] == 2 and e['shape'].startswith('s2_tabel_b1_hotspot') for e in k))
            else:
                self.assertEqual(k, [])


def tulis(f, t):
    with open(f, 'w', encoding='utf-8') as b: b.write(t)


def senyap(f, *a):
    e = io.StringIO()
    with contextlib.redirect_stderr(e): hasil = f(*a)
    return hasil, e.getvalue()


class TestIsian(unittest.TestCase):
    def bahan_harian(self):
        wa = {'laporan': 27, 'menonjol': 2, 'mulai': '2026-11-17 07.00', 'sampai': '2026-11-18 07.00', 'kejadian': [
            {'jenis': 'banjir', 'prov': '11', 'lokasi': 'Aceh Singkil', 'baru': False, 'label': 'Banjir', 'angka': {'kk': 3517}, 'teks': {'kondisi': 'Air belum surut', 'dampak': ''}},
            {'jenis': 'karhutla', 'prov': '14', 'lokasi': 'Kampar', 'baru': True, 'label': 'Kebakaran Hutan dan Lahan', 'angka': {'ha': 5}, 'teks': {'kondisi': '', 'dampak': ''}}]}
        w = {'jam': '06.00', 'pm': [('Kemayoran', 109.3, 'Tidak Sehat')], 'periode': '16-19 November', 'hujan': [], 'angin': [], 'siaga': ['Aceh'], 'awas': []}
        ga = {'jam': '06.00 WIB', 'level': {'Awas': 0, 'Siaga': 3, 'Waspada': 24, 'Normal': 42}, 'gunung': []}
        return wa, w, ga

    def test_harian_isian_menimpa_medan_sama(self):
        wa, w, ga = self.bahan_harian()
        isian, err = senyap(hr.saring_isian, {'laporan': 28, 'kejadian': [{'lokasi': 'aceh singkil', 'angka': {'kk': 3600, 'meninggal': 1}, 'teks': {'kondisi': 'Air berangsur surut'}}],
                                              'bmkg': {'periode': '17-20 November', 'pm': [['Medan', 80.5, 'Tidak Sehat']]}, 'pvmbg': {'level': {'Siaga': 4}}}, hr.ISIAN_HARIAN)
        self.assertEqual(err, '')
        hr.terap_isian_harian(wa, w, ga, isian)
        x = wa['kejadian'][0]
        self.assertEqual((wa['laporan'], x['angka'], x['teks']['kondisi']), (28, {'kk': 3600, 'meninggal': 1}, 'Air berangsur surut'))
        self.assertEqual(x['teks']['dampak'], '')   # medan yang tidak diisi tetap dari bahan
        self.assertEqual((w['periode'], w['pm'], w['siaga']), ('17-20 November', [('Medan', 80.5, 'Tidak Sehat')], ['Aceh']))
        self.assertEqual(ga['level'], {'Awas': 0, 'Siaga': 4, 'Waspada': 24, 'Normal': 42})

    def test_harian_tanpa_isian_tidak_berubah(self):
        wa, w, ga = self.bahan_harian(); asli = json.dumps(self.bahan_harian(), sort_keys=True)
        hr.terap_isian_harian(wa, w, ga, {})
        self.assertEqual(json.dumps((wa, w, ga), sort_keys=True), asli)

    def test_kunci_dan_medan_tak_dikenal_diabaikan(self):
        isian, err = senyap(hr.saring_isian, {'hotspot': 999, 'Luas Terbakar': 5, 'luas-belum-padam': 1, 'firespot': 2, 'catatan': 'x',
                                              'kejadian': [{'lokasi': 'Kampar', 'angka': {'ha': 900, 'kk': 2}}], 'laporan': '28'}, hr.ISIAN_HARIAN)
        self.assertEqual(isian, {'kejadian': [{'lokasi': 'Kampar', 'angka': {'kk': 2}}]})
        for k in ('hotspot', 'Luas Terbakar', 'luas-belum-padam', 'firespot', 'ha'):
            self.assertRegex(err, rf'\.{re.escape(k)}: angka sistem dikunci')
        self.assertIn('isian.catatan: medan tidak dikenal', err)
        self.assertIn('isian.laporan: tipe salah', err)

    def test_teks_bebas_berangka_sistem_ditolak(self):
        isian, err = senyap(hr.saring_isian, {'kejadian': [{'lokasi': 'Kampar', 'teks': {'dampak': 'hotspot 999 titik, 5.000 ha terbakar', 'kondisi': 'Api sudah padam'}},
                                                           {'lokasi': 'Siak', 'teks': {'kondisi': 'Luas Belum Padam 12 ha'}},
                                                           {'lokasi': 'Pelalawan', 'label': 'Titik Panas 40'}],
                                              'bmkg': {'pm': [['Pekanbaru', 80.0, 'FireSpot 3']], 'periode': '17-20 November'}}, hr.ISIAN_HARIAN)
        self.assertEqual(isian, {'kejadian': [{'lokasi': 'Kampar', 'teks': {'kondisi': 'Api sudah padam'}}, {'lokasi': 'Siak', 'teks': {}}, {'lokasi': 'Pelalawan'}],
                                 'bmkg': {'pm': [], 'periode': '17-20 November'}})
        for j in ('kejadian[0].teks.dampak', 'kejadian[1].teks.kondisi', 'kejadian[2].label', 'bmkg.pm[0]'):
            self.assertIn(f'isian.{j}: teks memuat angka sistem', err)
        po_isian, err2 = senyap(hr.saring_isian, {'omc': {'Riau': {'sasaran': 'hotspot 20 titik di Siak'}}}, po.ISIAN_PENANGANAN)
        self.assertEqual(po_isian, {'omc': {'Riau': {}}}); self.assertIn('teks memuat angka sistem', err2)

    def test_unicode_tersamar_tetap_ditolak(self):
        """NFKC (huruf lebar, ligatur) dan karakter Cf (zero-width, word joiner) tidak meloloskan kata angka sistem."""
        isian, err = senyap(hr.saring_isian, {'hot​spot': 5, 'ｆｉｒｅｓｐｏｔ': 2, 'luas⁠terbakar': 1,
                                              'kejadian': [{'lokasi': 'Kampar', 'teks': {'dampak': 'ｈｏｔ​spot ９９９ titik', 'kondisi': 'belum­padam 12 ha'}}]},
                                   hr.ISIAN_HARIAN)
        self.assertEqual(isian, {'kejadian': [{'lokasi': 'Kampar', 'teks': {}}]})
        self.assertEqual(err.count('angka sistem dikunci'), 3)
        self.assertEqual(err.count('teks memuat angka sistem'), 2)

    def test_harian_kejadian_tak_cocok_diperingatkan(self):
        wa, w, ga = self.bahan_harian()
        _, err = senyap(hr.terap_isian_harian, wa, w, ga, {'kejadian': [{'lokasi': 'Kota Antah', 'angka': {'kk': 1}}]})
        self.assertIn('tidak ada di bahan', err)
        self.assertEqual(wa['kejadian'][0]['angka'], {'kk': 3517})

    def test_penanganan_isian_operasi(self):
        import datetime as dt
        op = {'tanggal': dt.date(2026, 11, 16), 'personel': {'TNI': 100}, 'armada': {'Riau': [1, 1], 'Jambi': [0, 2]}, 'pemilik': {'BNPB': 3},
              'omc': {'Riau': {'sortie': 2, 'nacl': 2000, 'dryice': 0, 'sasaran': 'Siak', 'hujan': None, 'jarak_pandang': False}},
              'tanggal_armada': dt.date(2026, 11, 16), 'tanggal_laporan': dt.date(2026, 11, 17)}
        isian, err = senyap(hr.saring_isian, {'armada': {'Riau': [2, 3]}, 'omc': {'Riau': {'sortie': 4, 'hotspot': 9}, 'Kalimantan Barat': {'sortie': 1, 'nacl': 800}},
                                              'tanggal_laporan': '2026-11-18', 'liter': 5000, 'luas terbakar': 10, 'belum_padam': 3}, po.ISIAN_PENANGANAN)
        self.assertIn('isian.liter: medan tidak dikenal', err)
        for k in ('omc.Riau.hotspot', 'luas terbakar', 'belum_padam'): self.assertIn(f'isian.{k}: angka sistem dikunci', err)
        baru = po.terap_isian_operasi(op, isian)
        self.assertEqual(baru['armada'], {'Riau': [2, 3], 'Jambi': [0, 2]})
        self.assertEqual((baru['omc']['Riau']['sortie'], baru['omc']['Riau']['nacl'], baru['omc']['Riau']['sasaran']), (4, 2000, 'Siak'))
        self.assertEqual(baru['omc']['Kalimantan Barat']['nacl'], 800.0)
        self.assertEqual(baru['tanggal_laporan'], dt.date(2026, 11, 18))
        self.assertEqual(op['armada'], {'Riau': [1, 1], 'Jambi': [0, 2]})   # op asli tidak diubah
        self.assertIs(po.terap_isian_operasi(op, {})['armada'], op['armada'])

    def test_isian_rusak_berhenti(self):
        d = tempfile.mkdtemp(prefix='bl06-')
        try:
            f = os.path.join(d, 'isian.json'); tulis(f, '{bukan json')
            with self.assertRaises(SystemExit): hr.baca_isian(f, hr.ISIAN_HARIAN)
            tulis(f, '[1, 2]')
            with self.assertRaises(SystemExit): hr.baca_isian(f, hr.ISIAN_HARIAN)
        finally:
            shutil.rmtree(d, ignore_errors=True)


if __name__ == '__main__':
    unittest.main()
