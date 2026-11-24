"""Pemilik 20 Nov 2026 (draf bot P-201126-03 gagal "max() iterable argument is empty" karena armada udara di bahan Satgas kosong):
- armada kosong, OMC ada: panel ARMADA UDARA dibuang, panel MODIFIKASI CUACA direntang selebar slide ("Buang panelnya");
- armada DAN OMC kosong: slide Operasi tidak dibuat ("kalau omc dan armada gaada 22nya, hapus aja slide itu"), lewat penanganan_otomatis.

Slide Operasi dirakit dari templat asli (sumber-asli-BNPB-211026.pptx) tanpa jaringan; bahan Satgas 14 Nov (OMC Sumsel 1 sortie) yang armadanya dibuang.

    py -3 -m unittest discover -s data/laporan-bnpb/generator/tests -v
"""
import os, re, sys, unittest, zipfile

GEN = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AKAR = os.path.abspath(os.path.join(GEN, '..', '..', '..'))
sys.path[:0] = [GEN, os.path.join(GEN, 'penanganan')]
import wa_operasi, bnpb, penanganan_otomatis  # noqa: E402

SATGAS = os.path.join(GEN, '..', 'penanganan-karhutla', '2026-11', '2026-11-14', 'wa-satgas.txt')   # personel cocok dengan templat
TEMPLAT = os.path.join(GEN, '..', 'penanganan-karhutla', '2026-10', '2026-10-21', 'sumber-asli-BNPB-211026.pptx')


def tanpa_armada(teks):
    """Buang baris unit armada (Patroli Udara dan Helikopter) dan rekap Gelar Pesawat."""
    a, b = teks.index('*Patroli Udara'), teks.index('*b. Pelaksanaan')
    t = teks[:a] + '\n'.join(l for l in teks[a:b].splitlines() if not re.search(r'\d+ unit', l, re.I)) + '\n' + teks[b:]
    return t[:t.index('GELAR PESAWAT')] if 'GELAR PESAWAT' in t else t


def isi_panel(x, atas, bawah):
    for m in re.finditer(r'<p:(sp|pic|cxnSp)>.*?</p:\1>', x, re.S):
        o = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', m.group(0))
        if o and atas <= int(o.group(2)) < bawah: yield tuple(map(int, o.groups())), m.group(0)


class TanpaArmada(unittest.TestCase):
    def setUp(self):
        self.teks = open(SATGAS, encoding='utf-8').read()

    def test_ukuran_ada(self):
        op, kosong = wa_operasi.operasi(self.teks), wa_operasi.operasi(tanpa_armada(self.teks))
        self.assertTrue(bnpb.armada_ada(op)); self.assertTrue(bnpb.omc_ada(op))
        self.assertFalse(bnpb.armada_ada(kosong)); self.assertTrue(bnpb.omc_ada(kosong), 'OMC tetap terbaca')
        self.assertFalse(bnpb.omc_ada({'omc': {'Riau': {'sortie': 0, 'sasaran': ''}}}))
        self.assertFalse(bnpb.armada_ada({'armada': {'Riau': [0, 0]}}))

    @unittest.skipUnless(os.path.exists(TEMPLAT), 'templat penanganan tidak ada')
    def test_panel_armada_dibuang_dan_omc_direntang(self):
        op = wa_operasi.operasi(tanpa_armada(self.teks))
        x = zipfile.ZipFile(TEMPLAT).read('ppt/slides/slide3.xml').decode('utf-8')
        x = bnpb.ganti_operasi(x, op)   # dulu: ValueError max() iterable argument is empty
        x = penanganan_otomatis.tanpa_kartu_personel(x)
        kanan = re.search(r'<a:off x="6164428" y="(\d+)"/>\s*<a:ext cx="5478628" cy="(\d+)"/>', x)
        atas, bawah = int(kanan.group(1)), int(kanan.group(1)) + int(kanan.group(2))
        y = bnpb.tanpa_panel_armada(x)
        self.assertIn('water bombing', x)
        for t in ('water bombing', 'patroli/CASA/OMC', '> unit<'):
            self.assertNotIn(t, y.replace('<a:t>unit</a:t>', '> unit<'), f'isi panel ARMADA UDARA tersisa: {t}')
        self.assertIn(f'<a:off x="548640" y="{atas}"/><a:ext cx="11094428"', re.sub(r'>\s+<', '><', y), 'panel OMC tidak direntang')
        self.assertNotIn('ARMADA UDARA', y)
        self.assertNotIn('armada udara dan OMC di', y)
        self.assertIn('<a:t>OMC di </a:t>', y)
        # isi satu kolom tetap sejajar dengan label kepala kolomnya
        kepala = {t: g[0] for g, b in isi_panel(y, atas, bawah) for t in re.findall(r'<a:t>(PROVINSI|SASARAN OMC|HASIL)</a:t>', b)}
        self.assertLess(kepala['PROVINSI'], kepala['SASARAN OMC'])
        self.assertLess(kepala['SASARAN OMC'], kepala['HASIL'])
        self.assertGreater(kepala['HASIL'], 6164428, 'kolom HASIL ikut melebar ke kanan')
        for g, b in isi_panel(y, atas, bawah):
            if 'txBox="1"' in b and re.search(r'<a:t>di [^<]+</a:t>', b) and g[1] > atas + 1000000:
                self.assertEqual(g[0], kepala['HASIL'], 'keterangan hujan sejajar kolom HASIL')


if __name__ == '__main__':
    unittest.main()
