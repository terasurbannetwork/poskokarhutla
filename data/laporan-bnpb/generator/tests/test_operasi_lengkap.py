"""Bot laporan 18 Nov 2026: laporan penanganan lengkap ("LAPORAN PENANGANAN KARHUTLA DI ENAM PROVINSI PRIORITAS", kunci karhutla_mensesneg)
dikirim sebagai --operasi pengganti laporan Satgas. wa_operasi.operasi() harus membacanya sama dengan teks Satgas.

Fikstur dirakit dari bagian format Satgas yang sudah ada di repo (tests/wa/bahan/satgas_271026.txt) di bawah kepala laporan lengkap dan
bagian situasi umum rekaan; tanpa nomor telepon atau nama orang. Belum diuji terhadap laporan lengkap asli (tidak ada contoh di repo).

    py -3 -m unittest discover -s data/laporan-bnpb/generator/tests -v
"""
import os, sys, unittest

GEN = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AKAR = os.path.abspath(os.path.join(GEN, '..', '..', '..'))
sys.path.insert(0, GEN)
import wa_operasi  # noqa: E402

SATGAS = os.path.join(AKAR, 'tests', 'wa', 'bahan', 'satgas_271026.txt')
KEPALA = ('Yth. Bapak Mensesneg\n*LAPORAN PENANGANAN KARHUTLA DI ENAM PROVINSI PRIORITAS*\n_27 Oktober 2026_\n\n'
          '***A. SITUASI UMUM***\nHotspot dan firespot dipantau dari sistem; rincian di bawah.\n\n***B. UPAYA PENANGANAN***\n')


def lengkap():
    teks = open(SATGAS, encoding='utf-8').read()
    badan = teks.split('\n', 2)[2]   # buang judul Satgas dan baris tanggalnya
    return KEPALA + badan, teks


class OperasiLengkap(unittest.TestCase):
    def test_dibaca_sama_dengan_satgas(self):
        t_lengkap, t_satgas = lengkap()
        a, b = wa_operasi.operasi(t_lengkap), wa_operasi.operasi(t_satgas)
        for k in ('personel', 'armada', 'omc'):
            self.assertTrue(a[k], f'{k} kosong pada laporan lengkap')
            self.assertEqual(a[k], b[k], k)
        self.assertEqual(a['tanggal'], b['tanggal'])
        self.assertEqual(len(a['personel']), 6)


if __name__ == '__main__':
    unittest.main()
