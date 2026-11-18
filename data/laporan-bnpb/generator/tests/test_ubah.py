"""BL-07 / T7: ubah.py inventaris, terapkan operasi ubah, pratinjau. Memakai deck penanganan asli (Revisi terbaru) yang dinamai ulang
harian_ringkas.namai_deck di salinan sementara; tabel asli (graphicFrame) ditambahkan di salinan karena generator tidak memakainya.

    cd data/laporan-bnpb/generator && py -3.14 -m unittest tests.test_ubah -v
"""
import glob, hashlib, json, os, shutil, sys, tempfile, unittest

GEN = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LAP = os.path.dirname(GEN)
sys.path.insert(0, GEN)
import harian_ringkas as hr   # noqa: E402
import ubah                   # noqa: E402
from pptx import Presentation  # noqa: E402
from pptx.util import Emu      # noqa: E402


def deck_asli():
    c = sorted(glob.glob(os.path.join(LAP, 'penanganan-karhutla', '*', '*', 'Revisi *', 'Laporan Penanganan Pengendalian Karhutla *.pptx')))
    return c[-1] if c else None


def cari(inv, slide, shape):
    return next((x for x in inv if x['slide'] == slide and x['shape'] == shape), None)


def sha(f):
    with open(f, 'rb') as b: return hashlib.sha256(b.read()).hexdigest()


@unittest.skipUnless(deck_asli(), 'deck penanganan Revisi tidak ada di repo')
class UjiUbah(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='uji_ubah_')
        cls.deck = os.path.join(cls.tmp, 'deck.pptx')
        shutil.copy(deck_asli(), cls.deck)
        cls.kunci = hr.namai_deck(cls.deck)   # nama s<n>_ + <deck>.kunci.json
        prs = Presentation(cls.deck)   # tabel asli di slide 2: kepala + 3 baris, kolom HOTSPOT terkunci lewat sel
        s = prs.slides[1]
        t = s.shapes.add_table(4, 3, Emu(600000), Emu(4000000), Emu(4000000), Emu(900000))
        t.name = 's2_tabel_uji'
        for r, baris in enumerate([['PROVINSI', 'CATATAN', 'HOTSPOT'], ['Riau', 'patroli', '12'], ['Jambi', 'siaga', '7'], ['Kalbar', 'pantau', '3']]):
            for c, v in enumerate(baris): t.table.cell(r, c).text = v
        s2 = s.shapes.add_table(2, 2, Emu(600000), Emu(5000000), Emu(3000000), Emu(500000)); s2.name = 's2_tabel_bebas'
        for r, baris in enumerate([['A', 'B'], ['x', 'y']]):
            for c, v in enumerate(baris): s2.table.cell(r, c).text = v
        cls.deck_tabel = os.path.join(cls.tmp, 'deck_tabel.pptx')
        prs.save(cls.deck_tabel)
        cls.kunci_tabel = cls.kunci + [{'slide': 2, 'shape': 's2_tabel_uji', 'angka': 'hotspot', 'sel': [r, 2]} for r in (1, 2, 3)]
        cls.inv = ubah.inventaris(cls.deck)
        cls.n = 0

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def jalan(self, ops, deck=None, kunci=None):
        type(self).n += 1
        out = os.path.join(self.tmp, f'hasil_{self.n}.pptx')
        h = ubah.terapkan(deck or self.deck, ops, self.kunci if kunci is None else kunci, out)
        return h, out, ubah.inventaris(out)

    def shape_bebas(self):
        """Shape teks satu paragraf di slide 1 yang tidak terkunci dan tanpa kata angka sistem."""
        kunci = {(k['slide'], k['shape']) for k in self.kunci if not k.get('sel')}
        return next(x for x in self.inv if x['slide'] == 1 and (1, x['shape']) not in kunci and x['shape'] != 's1_judul'
                    and x['shape'].startswith('s1_') and 'tabel' not in x and '\n' not in x['teks'] and len(x['teks']) > 3
                    and not ubah.KATA_KUNCI.search(x['teks']))

    # --- dasar
    def test_nama_stabil_dan_kunci(self):
        self.assertTrue(self.kunci, 'deck penanganan wajib punya kunci')
        self.assertTrue(os.path.exists(self.deck[:-5] + '.kunci.json'))
        self.assertTrue(all(x['shape'].startswith(f"s{x['slide']}_") or not x['shape'].startswith('s') for x in self.inv))
        self.assertIsNotNone(cari(self.inv, 1, 's1_judul'))

    def test_inventaris_deterministik(self):
        self.assertEqual(json.dumps(ubah.inventaris(self.deck)), json.dumps(ubah.inventaris(self.deck)))

    def test_terapkan_deterministik(self):
        ops = [{'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': cari(self.inv, 1, 's1_judul')['teks'], 'teks_baru': 'Judul uji'},
               {'jenis': 'catatan', 'slide': 1, 'teks': 'Catatan uji'}]
        _, a, ia = self.jalan(ops)
        _, b, ib = self.jalan(ops)
        self.assertEqual(sha(a), sha(b))
        self.assertEqual(ia, ib)

    # --- operasi
    def test_ganti_judul_format_tetap(self):
        lama = cari(self.inv, 1, 's1_judul')['teks']
        h, out, inv = self.jalan([{'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': '  ' + lama.replace(' ', '\n', 1), 'teks_baru': 'Judul Baru Uji'}])
        self.assertEqual(len(h['diterapkan']), 1, h)
        self.assertEqual(cari(inv, 1, 's1_judul')['teks'], 'Judul Baru Uji')
        sh = next(s for s in Presentation(out).slides[0].shapes if s.name == 's1_judul')
        r = sh.text_frame.paragraphs[0].runs[0]
        self.assertEqual((r.font.size.pt, r.font.bold, r.font.name), (22.0, True, 'Roboto'))

    def test_ganti_sel(self):
        h, _, inv = self.jalan([{'jenis': 'ganti_sel', 'slide': 2, 'shape': 's2_tabel_uji', 'baris': 1, 'kolom': 1, 'teks_lama': 'patroli', 'teks_baru': 'patroli darat'}],
                               deck=self.deck_tabel, kunci=self.kunci_tabel)
        self.assertEqual(len(h['diterapkan']), 1, h)
        self.assertEqual(cari(inv, 2, 's2_tabel_uji')['tabel'][1], ['Riau', 'patroli darat', '12'])

    def test_tambah_hapus_baris_tabel(self):
        h, _, inv = self.jalan([{'jenis': 'tambah_baris', 'slide': 2, 'shape': 's2_tabel_bebas', 'setelah_baris': 0, 'teks': 'p | q'},
                                {'jenis': 'hapus_baris', 'slide': 2, 'shape': 's2_tabel_bebas', 'baris': 2, 'teks_lama': 'x | y'}],
                               deck=self.deck_tabel, kunci=self.kunci_tabel)
        self.assertEqual(len(h['diterapkan']), 2, h)
        self.assertEqual(cari(inv, 2, 's2_tabel_bebas')['tabel'], [['A', 'B'], ['p', 'q']])

    def test_tambah_hapus_baris_daftar(self):
        x = self.shape_bebas()
        h, _, inv = self.jalan([{'jenis': 'tambah_baris', 'slide': 1, 'shape': x['shape'], 'setelah_baris': 0, 'teks': 'baris kedua'},
                                {'jenis': 'tambah_baris', 'slide': 1, 'shape': x['shape'], 'setelah_baris': 1, 'teks': 'baris ketiga'},
                                {'jenis': 'hapus_baris', 'slide': 1, 'shape': x['shape'], 'baris': 1, 'teks_lama': 'baris kedua'}])
        self.assertEqual(len(h['diterapkan']), 3, h)
        self.assertEqual(cari(inv, 1, x['shape'])['teks'], x['teks'] + '\nbaris ketiga')

    def test_catatan(self):
        h, out, inv = self.jalan([{'jenis': 'catatan', 'slide': 1, 'teks': 'Angka luas mengikuti hari D-1.'},
                                  {'jenis': 'catatan', 'slide': 1, 'teks': 'Catatan kedua.'}])
        self.assertEqual(len(h['diterapkan']), 2, h)
        self.assertEqual(cari(inv, 1, 's1_catatan_bot_1')['teks'], 'Angka luas mengikuti hari D-1.')
        self.assertIsNotNone(cari(inv, 1, 's1_catatan_bot_2'))
        s = Presentation(out).slides[0]
        kaki = min(sh.top for sh in s.shapes if sh.name == 'Pita kaki' or sh.name.startswith('s1_kaki_'))
        c1, c2 = (next(sh for sh in s.shapes if sh.name == f's1_catatan_bot_{k}') for k in (1, 2))
        self.assertLessEqual(c1.top + c1.height, kaki)
        self.assertLess(c2.top, c1.top)
        sumber = next(sh for sh in s.shapes if sh.name == 's1_kaki_sumber').text_frame.paragraphs[0].runs[0].font.size
        self.assertEqual(c1.text_frame.paragraphs[0].runs[0].font.size, sumber)

    def test_sembunyikan_tampilkan(self):
        _, out, _ = self.jalan([{'jenis': 'sembunyikan_slide', 'slide': 3}])
        self.assertEqual(Presentation(out).slides[2]._element.get('show'), '0')
        h, out2, _ = self.jalan([{'jenis': 'tampilkan_slide', 'slide': 3}], deck=out)
        self.assertIsNone(Presentation(out2).slides[2]._element.get('show'))
        self.assertEqual(len(h['diterapkan']), 1)

    def test_tanya_diteruskan(self):
        h, _, _ = self.jalan([{'jenis': 'tanya', 'pertanyaan': 'Slide mana?'}])
        self.assertEqual(h['tanya'], [{'jenis': 'tanya', 'pertanyaan': 'Slide mana?'}])
        self.assertEqual(h['diterapkan'], [])

    # --- penolakan
    def test_teks_lama_tidak_cocok(self):
        h, out, inv = self.jalan([{'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': 'bukan judul', 'teks_baru': 'X'}])
        self.assertEqual(h['diterapkan'], [])
        self.assertIn('teks_lama', h['dilewati'][0]['alasan'])
        self.assertEqual(cari(inv, 1, 's1_judul')['teks'], cari(self.inv, 1, 's1_judul')['teks'])

    def test_shape_terkunci(self):
        k = next(k for k in self.kunci if not k.get('sel'))
        lama = cari(self.inv, k['slide'], k['shape'])['teks']
        h, _, inv = self.jalan([{'jenis': 'ganti_teks', 'slide': k['slide'], 'shape': k['shape'], 'teks_lama': lama, 'teks_baru': 'tanpa angka'},
                                {'jenis': 'tambah_baris', 'slide': k['slide'], 'shape': k['shape'], 'setelah_baris': 0, 'teks': 'x'}])
        self.assertEqual(h['diterapkan'], [])
        self.assertTrue(all('terkunci' in d['alasan'] for d in h['dilewati']), h)
        self.assertEqual(cari(inv, k['slide'], k['shape'])['teks'], lama)

    def test_sel_terkunci(self):
        h, _, inv = self.jalan([{'jenis': 'ganti_sel', 'slide': 2, 'shape': 's2_tabel_uji', 'baris': 2, 'kolom': 2, 'teks_lama': '7', 'teks_baru': '70'},
                                {'jenis': 'hapus_baris', 'slide': 2, 'shape': 's2_tabel_uji', 'baris': 3, 'teks_lama': 'Kalbar | pantau | 3'},
                                {'jenis': 'ganti_sel', 'slide': 2, 'shape': 's2_tabel_uji', 'baris': 2, 'kolom': 1, 'teks_lama': 'siaga', 'teks_baru': 'awas'}],
                               deck=self.deck_tabel, kunci=self.kunci_tabel)
        self.assertEqual([d['ke'] for d in h['dilewati']], [0, 1], h)
        self.assertIn('terkunci', h['dilewati'][0]['alasan'])
        self.assertEqual(cari(inv, 2, 's2_tabel_uji')['tabel'][2], ['Jambi', 'awas', '7'])
        self.assertEqual(len(cari(inv, 2, 's2_tabel_uji')['tabel']), 4)

    def test_kata_angka_sistem_ditolak(self):
        lama = cari(self.inv, 1, 's1_judul')['teks']
        x = self.shape_bebas()
        h, _, inv = self.jalan([
            {'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': lama, 'teks_baru': 'Hotspot naik jadi 999 titik'},
            {'jenis': 'ganti_teks', 'slide': 1, 'shape': x['shape'], 'teks_lama': x['teks'], 'teks_baru': '5.000 ha lahan terbakar'},
            {'jenis': 'tambah_baris', 'slide': 1, 'shape': x['shape'], 'setelah_baris': 0, 'teks': 'masih 12 titik api belum padam'},
            {'jenis': 'catatan', 'slide': 1, 'teks': 'Luas terbakar 30 ha'},
            {'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': lama, 'teks_baru': 'Pemantauan hotspot tetap berjalan'}])
        self.assertEqual([d['ke'] for d in h['dilewati']], [0, 1, 2, 3], h)
        self.assertTrue(all('angka sistem' in d['alasan'] for d in h['dilewati']))
        self.assertEqual(cari(inv, 1, 's1_judul')['teks'], 'Pemantauan hotspot tetap berjalan')   # kata tanpa angka boleh

    def test_kepala_tabel_tanpa_angka_ditolak(self):   # #4 relabel kepala tabel (baris 0)
        h, _, inv = self.jalan([
            {'jenis': 'ganti_sel', 'slide': 2, 'shape': 's2_tabel_uji', 'baris': 0, 'kolom': 1, 'teks_lama': 'CATATAN', 'teks_baru': 'Hotspot'},
            {'jenis': 'ganti_sel', 'slide': 2, 'shape': 's2_tabel_uji', 'baris': 0, 'kolom': 2, 'teks_lama': 'HOTSPOT', 'teks_baru': 'KETERANGAN'},
            {'jenis': 'ganti_sel', 'slide': 2, 'shape': 's2_tabel_uji', 'baris': 0, 'kolom': 1, 'teks_lama': 'CATATAN', 'teks_baru': 'KET'}],
            deck=self.deck_tabel, kunci=self.kunci_tabel)
        self.assertEqual([d['ke'] for d in h['dilewati']], [0, 1], h)
        self.assertEqual(cari(inv, 2, 's2_tabel_uji')['tabel'][0], ['PROVINSI', 'KET', 'HOTSPOT'])

    def test_label_dan_kpi_tanpa_angka_ditolak(self):   # #4 relabel shape *_label dan s<n>_kpi_ (kunci kosong: aturan ubah.py sendiri)
        lab = next(x for x in self.inv if x['shape'].endswith('_label') and not ubah.kata_metrik(x['teks']))
        kpi = cari(self.inv, 1, 's1_kpi_hotspot_label')
        h, _, inv = self.jalan([
            {'jenis': 'ganti_teks', 'slide': lab['slide'], 'shape': lab['shape'], 'teks_lama': lab['teks'], 'teks_baru': 'Titik api'},
            {'jenis': 'ganti_teks', 'slide': 1, 'shape': kpi['shape'], 'teks_lama': kpi['teks'], 'teks_baru': 'TITIK'},
            {'jenis': 'tambah_baris', 'slide': lab['slide'], 'shape': lab['shape'], 'setelah_baris': 0, 'teks': 'firespot'},
            {'jenis': 'tambah_baris', 'slide': 1, 'shape': kpi['shape'], 'setelah_baris': 0, 'teks': 'x'},
            {'jenis': 'hapus_baris', 'slide': 1, 'shape': kpi['shape'], 'baris': 0, 'teks_lama': kpi['teks']},
            {'jenis': 'ganti_teks', 'slide': lab['slide'], 'shape': lab['shape'], 'teks_lama': lab['teks'], 'teks_baru': 'LABEL BARU'}], kunci=[])
        self.assertEqual([d['ke'] for d in h['dilewati']], [0, 1, 2, 4], h)   # ke-3 (baris tanpa kata metrik) dan ke-5 (label biasa) diterapkan
        self.assertEqual(cari(inv, lab['slide'], lab['shape'])['teks'], 'LABEL BARU')
        self.assertTrue(cari(inv, 1, kpi['shape'])['teks'].startswith(kpi['teks']))

    def test_hapus_baris_label_metrik_ditolak(self):
        kpi = cari(self.inv, 1, 's1_kpi_hotspot_label')
        h, _, inv = self.jalan([{'jenis': 'tambah_baris', 'slide': 1, 'shape': kpi['shape'], 'setelah_baris': 0, 'teks': 'x'},
                                {'jenis': 'hapus_baris', 'slide': 1, 'shape': kpi['shape'], 'baris': 0, 'teks_lama': kpi['teks']}], kunci=[])
        self.assertEqual([d['ke'] for d in h['dilewati']], [1], h)
        self.assertEqual(cari(inv, 1, kpi['shape'])['teks'], kpi['teks'] + '\nx')

    def test_unicode_tersembunyi_ditolak(self):   # #5 Cf dan NFKC sebelum cocok kata
        lama = cari(self.inv, 1, 's1_judul')['teks']
        ops = [{'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': lama, 'teks_baru': t}
               for t in ('Hot\u00adspot 999 titik', 'hot\u200bspot 12', '\uff48\uff4f\uff54\uff53\uff50\uff4f\uff54 \uff11\uff12', 'belum\u2060 padam 4 ha')]
        h, _, _ = self.jalan(ops)
        self.assertEqual([d['ke'] for d in h['dilewati']], [0, 1, 2, 3], h)
        self.assertTrue(ubah.kata_metrik('H\u200bOTSPOT'))

    def test_powerpoint_tanpa_interpolasi(self):   # #6 jalur lewat variabel lingkungan
        tangkap = {}
        def palsu(cmd, **kw): tangkap['cmd'], tangkap['env'] = cmd, kw.get('env')
        asli = ubah.subprocess.run
        ubah.subprocess.run = palsu
        jahat = os.path.join(self.tmp, "a'; Remove-Item x; '$(b).pptx")
        try: ubah._png_powerpoint(jahat, [1, 3], self.tmp) if os.name == 'nt' else self.skipTest('hanya Windows')
        finally: ubah.subprocess.run = asli
        teks = ' '.join(tangkap['cmd'])
        self.assertNotIn('Remove-Item', teks)
        self.assertNotIn(self.tmp, teks)
        self.assertEqual(tangkap['env']['UBAH_PPTX'], os.path.abspath(jahat))
        self.assertEqual(tangkap['env']['UBAH_SLIDES'], '1,3')

    def test_shape_dan_slide_tidak_ada(self):
        h, _, _ = self.jalan([{'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_tidak_ada', 'teks_lama': 'a', 'teks_baru': 'b'},
                              {'jenis': 'sembunyikan_slide', 'slide': 99}, {'jenis': 'hapus_semua', 'slide': 1}])
        self.assertEqual(len(h['dilewati']), 3)

    def test_urutan_berlaku(self):   # operasi kedua melihat hasil operasi pertama
        lama = cari(self.inv, 1, 's1_judul')['teks']
        h, _, inv = self.jalan([{'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': lama, 'teks_baru': 'Satu'},
                                {'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': lama, 'teks_baru': 'Dua'},
                                {'jenis': 'ganti_teks', 'slide': 1, 'shape': 's1_judul', 'teks_lama': 'Satu', 'teks_baru': 'Tiga'}])
        self.assertEqual([d['ke'] for d in h['dilewati']], [1])
        self.assertEqual(cari(inv, 1, 's1_judul')['teks'], 'Tiga')

    def test_cli_terapkan(self):
        ops = os.path.join(self.tmp, 'ops.json')
        with open(ops, 'w', encoding='utf-8') as f: json.dump({'operasi': [{'jenis': 'catatan', 'slide': 2, 'teks': 'cli'}], 'ringkasan': 'uji'}, f)
        out = os.path.join(self.tmp, 'cli.pptx')
        import contextlib, io
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf): kode = ubah.utama(['terapkan', self.deck, ops, self.deck[:-5] + '.kunci.json', out])
        self.assertEqual(kode, 0)
        self.assertEqual(len(json.loads(buf.getvalue())['diterapkan']), 1)

    # --- pratinjau
    def test_pratinjau_pdf(self):
        pdf = sorted(glob.glob(os.path.join(LAP, 'penanganan-karhutla', '*', '*', 'Revisi *', '*.pdf')))
        if not pdf: self.skipTest('tidak ada PDF Revisi')
        try: import pymupdf  # noqa: F401
        except ImportError: self.skipTest('PyMuPDF tidak terpasang')
        png = ubah.pratinjau(pdf[-1], [1, 99], os.path.join(self.tmp, 'png'))
        self.assertEqual([os.path.basename(p) for p in png], ['pratinjau-1.png'])
        with open(png[0], 'rb') as f: self.assertEqual(f.read(8), b'\x89PNG\r\n\x1a\n')

    def test_pratinjau_tanpa_perender_tidak_berhenti(self):
        asli = (ubah._png_fitz, ubah._png_pdftoppm, ubah._pdf_soffice, ubah._png_powerpoint)
        def gagal(*a): raise RuntimeError('dimatikan uji')
        ubah._png_fitz = ubah._png_pdftoppm = ubah._pdf_soffice = ubah._png_powerpoint = gagal
        try:
            import contextlib, io
            err = io.StringIO()
            with contextlib.redirect_stderr(err): png = ubah.pratinjau(self.deck, [1], os.path.join(self.tmp, 'png0'))
        finally:
            ubah._png_fitz, ubah._png_pdftoppm, ubah._pdf_soffice, ubah._png_powerpoint = asli
        self.assertEqual(png, [])
        self.assertIn('tidak ada perender', err.getvalue())


if __name__ == '__main__':
    unittest.main()
