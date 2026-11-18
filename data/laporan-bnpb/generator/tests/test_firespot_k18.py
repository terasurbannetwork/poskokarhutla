"""K18 bot laporan: penanganan_otomatis.py --firespot situs|firms dan segar_situs.py --status. Tanpa jaringan.

    py -3.14 -m unittest discover -s tests -v      (dari folder generator)
"""
import contextlib, copy, datetime as dt, io, json, os, sys, types, unittest
from urllib.error import URLError

GEN = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, GEN)
import penanganan_otomatis as po   # noqa: E402
import segar_situs as ss           # noqa: E402

SUSUN = [{'halaman': 1, 'bagian': 1, 'sumber': 'Satelit NASA FIRMS (VIIRS dan MODIS), 18 Nov 2026 18.00 WIB; luas terbakar hari utuh 17 Nov'},
         {'halaman': 2, 'bagian': 1, 'sumber': 'NASA FIRMS 18 Nov 18.00 WIB; luas terbakar hari utuh 17 Nov; PM2,5 CAMS 17 Nov; hujan model Open-Meteo, kelas BMKG'}]


class Bendera(unittest.TestCase):
    def test_bawaan_situs(self):
        g = po.parser().parse_args(['--tanggal', '2026-11-18'])
        self.assertEqual(g.firespot, 'situs')
        self.assertEqual((g.jam, g.out, g.operasi, g.gelar, g.isian), ('18:00', '.', None, None, None))
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            po.parser().parse_args(['--tanggal', '2026-11-18', '--firespot', 'lain'])

    def test_situs_memakai_firespot_web(self):
        asli = object(); web = object()
        pen = types.SimpleNamespace(firespot_hari=types.SimpleNamespace(seri=asli))
        po.pasang_firespot(pen, 'situs', web)
        self.assertIs(pen.firespot_hari.seri, web)

    def test_firms_memakai_firespot_hari(self):
        import firespot_hari
        pen = types.SimpleNamespace(firespot_hari=types.SimpleNamespace(seri=firespot_hari.seri))
        with contextlib.redirect_stdout(io.StringIO()):
            po.pasang_firespot(pen, 'firms', lambda *a, **k: self.fail('firespot_web tidak boleh dipakai'))
        self.assertIs(pen.firespot_hari.seri, firespot_hari.seri)

    def test_sumber_situs_tidak_berubah(self):
        s = copy.deepcopy(SUSUN); err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertFalse(po.sumber_firespot(s, 'situs'))
        self.assertEqual(s, SUSUN); self.assertEqual(err.getvalue(), '')

    def test_sumber_firms_muat(self):
        s = copy.deepcopy(SUSUN); err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertTrue(po.sumber_firespot(s, 'firms'))
        self.assertTrue(s[0]['sumber'].endswith('; firespot dihitung langsung dari FIRMS'))
        self.assertLessEqual(len(s[0]['sumber']), po.MAKS_SUMBER)
        self.assertEqual(s[1], SUSUN[1]); self.assertEqual(err.getvalue(), '')

    def test_sumber_firms_penuh_peringatan(self):
        s = copy.deepcopy(SUSUN); s[0]['sumber'] = 'x' * 110; err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertFalse(po.sumber_firespot(s, 'firms'))
        self.assertEqual(s[0]['sumber'], 'x' * 110)
        self.assertIn('PERINGATAN isian: firespot dihitung langsung dari FIRMS', err.getvalue())


def csv_firms(*baris):
    return ('latitude,longitude,acq_date,acq_time,confidence\n' + ''.join(f'-1,110,{d},{t},n\n' for d, t in baris)).encode()


class Status(unittest.TestCase):
    D = dt.date(2026, 11, 18)
    KUNCI = ('acuan', 'firms_terakhir_wib', 'lintasan_siang', 'situs_dibuat_wib', 'situs_memuat', 'porsi_tertinggal')

    def palsu(self, firms_gagal=False):
        def ambil(url, timeout=12):
            if 'firms.modaps' in url:
                if firms_gagal: raise URLError('tidak ada jaringan')
                if 'NOAA20' in url and '2026-11-18' in url: return csv_firms(('2026-11-18', '0548'), ('2026-11-18', '0640'))   # 12.48, 13.40 WIB
                if 'NOAA20' in url: return csv_firms(('2026-11-17', '1830'), ('2026-11-17', '0500'))   # 01.30 WIB 18 Nov; 17 Nov siang dibuang
                return csv_firms()
            if 'meta.json' in url: return json.dumps({'dibuat': '2026-11-18T12:11+07:00'}).encode()
            if 'hotspot.json' in url:   # titik terakhir situs N20 05.48Z = 12.48 WIB
                return json.dumps({'acuan': '2026-11-18T05:48:00+00:00', 'baris': [[0, 0, 0.0, 'N20']]}).encode()
            raise AssertionError(url)
        return ambil

    def test_bentuk_dan_nilai(self):
        h = ss.status(self.D, self.palsu(), kunci='K')
        for k in self.KUNCI[1:]: self.assertIn(k, h)
        self.assertNotIn('galat', h)
        self.assertEqual(h['firms_terakhir_wib'], '13:40')
        self.assertIs(h['lintasan_siang'], True)
        self.assertEqual(h['situs_dibuat_wib'], '12:11')
        self.assertAlmostEqual(h['porsi_tertinggal'], 1 / 3, places=3)   # 1 dari 3 titik hari D lebih baru dari situs
        self.assertIs(h['situs_memuat'], False)
        json.dumps(h)

    def test_tanpa_lintasan_siang(self):
        def ambil(url, timeout=12):
            if 'firms.modaps' in url:
                return csv_firms(('2026-11-18', '0130')) if 'NOAA20' in url and '2026-11-18' in url else csv_firms()
            return self.palsu()(url)
        h = ss.status(self.D, ambil, kunci='K')
        self.assertEqual((h['firms_terakhir_wib'], h['lintasan_siang'], h['situs_memuat'], h['porsi_tertinggal']), ('08:30', False, True, 0.0))

    def test_jaringan_gagal(self):
        h = ss.status(self.D, self.palsu(firms_gagal=True), kunci='RAHASIA')
        self.assertIn('galat', h); self.assertNotIn('RAHASIA', h['galat'])
        for k in ('firms_terakhir_wib', 'lintasan_siang', 'situs_memuat', 'porsi_tertinggal'): self.assertIsNone(h[k])
        self.assertEqual(h['situs_dibuat_wib'], '12:11')   # bagian situs tetap terisi

    def test_semua_gagal(self):
        def ambil(url, timeout=12): raise URLError('mati')
        h = ss.status(self.D, ambil, kunci='K')
        self.assertIn('galat', h)
        for k in self.KUNCI[1:]: self.assertIsNone(h[k])


if __name__ == '__main__':
    unittest.main()
