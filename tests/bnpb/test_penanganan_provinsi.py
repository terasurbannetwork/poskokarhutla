"""Tiap kode provinsi (11-96) harus bisa masuk 6 teratas deck Penanganan tanpa galat G1 (tanpa jaringan).
Angka tiruan sebentuk angka.json cache; ganti.py dijalankan nyata pada templat 211026."""
import json, os, subprocess, sys, tempfile, unittest, zipfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GEN = os.path.join(AKAR, 'data', 'laporan-bnpb', 'generator')
TEMPLAT = os.path.join(AKAR, 'data', 'laporan-bnpb', 'penanganan-karhutla', '2026-10', '2026-10-21', 'sumber-asli-BNPB-211026.pptx')
KODE = sorted(json.load(open(os.path.join(AKAR, 'public/data/laporan.json')))['prov'])


def prov(utama):
    """Semua provinsi punya sedikit hotspot; `utama` paling banyak, dan 5 lainnya (62,16,63,15,61) menyusul."""
    p = {k: {'hot': [1, 1, 1, 1], 'luas': [2.5] * 4, 'belum': [1.5] * 4, 'padam': [1.0] * 4, 'fs': [0] * 4} for k in KODE}
    for n, k in enumerate(['62', '16', '63', '15', '61']):
        p[k]['hot'][3] = 50 - n
    p[utama]['hot'][3] = 999
    return p


class TestSemuaProvinsi(unittest.TestCase):
    def test_kode_cukup_dan_ada_baris(self):
        sys.path.insert(0, GEN)
        import penanganan
        self.assertEqual(len(KODE), 38)
        self.assertEqual([k for k in KODE if k not in penanganan.ADA_BARIS], [])

    def test_tiap_provinsi_masuk_6_teratas(self):
        for k in KODE:
            with self.subTest(prov=k), tempfile.TemporaryDirectory() as t:
                os.makedirs(os.path.join(t, 'deck', 'x'))
                zipfile.ZipFile(TEMPLAT).extractall(os.path.join(t, 'deck', 'x'))
                open(os.path.join(t, 'deck', 'src.pptx'), 'wb').write(open(TEMPLAT, 'rb').read())
                a = {'hari': ['27 Okt', '28 Okt', '29 Okt', '30 Okt'], 'prov': prov(k), 'faktor': {}, 'metode': 'uji'}
                for f in ('angka.json', 'angka_nasional.json'):
                    json.dump(a, open(os.path.join(t, f), 'w'))
                json.dump({'cutoff': '1 Nov 2026, 17.00 WIB', 'kolom': ['30 Okt', '31 Okt', '1 Nov'], 'hari': '1', 'padam_dari': '30 Okt',
                           'bulan': 'November', 'bln': 'Nov'}, open(os.path.join(t, 'param.json'), 'w'))
                r = subprocess.run([sys.executable, '-X', 'utf8', '-E', '-W', 'ignore', os.path.join(GEN, 'penanganan', 'ganti.py'), t, 't1.pptx'],
                                   cwd=t, capture_output=True, text=True)
                self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
                self.assertTrue(os.path.exists(os.path.join(t, 't1.pptx')))


if __name__ == '__main__':
    unittest.main()
