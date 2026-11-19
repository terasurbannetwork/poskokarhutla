"""Pengurai WA Koordalops (wa_harian.koordalops) menerima variasi format yang muncul di WA asli.
19 Nov 2026: "1 .Bencana" (spasi sebelum titik), label "*(Pengkinian Data*)" bintang salah letak, "Kota. Mataram".
Jalankan dari folder generator: python -m unittest tests.test_wa_harian_format"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import wa_harian  # noqa: E402

TEKS = """Yth. Bapak Kepala BNPB
Berikut hasil pemantauan Dit. Koordalops BNPB tanggal 18/11/2026 pukul 07.00 WIB s.d 19/11/2026 pkl 07.00 WIB:
1. Laporan kejadian bencana sejumlah 5 (lima) kejadian.
2. Kejadian menonjol/kejadian berdampak signifikan sejumlah 3 (tiga) kejadian.

*A. Prov. Aceh*
1. Bencana Alam Banjir di Kab. Aceh Selatan *(Pengkinian Data*)
- Dampak: 120 KK terdampak
- Kondisi Mutakhir: Air belum surut

*B. Prov. Nusa Tenggara Barat*
1. Bencana Alam Banjir di Kota. Mataram *(Kejadian Baru)*
- Dampak: 40 KK terdampak
- Kondisi Mutakhir: Air surut

*C. Prov. Sulawesi Tengah*
1 .Bencana Alam Kebakaran Hutan dan Lahan di Kab. Morowali Utara *(Kejadian Baru)*
- Dampak: -
- Kerusakan: 10 ha lahan terbakar
- Kondisi mutakhir: Api sudah padam
"""


class TestFormatWa(unittest.TestCase):
    def test_variasi_19_nov(self):
        w = wa_harian.koordalops(TEKS)
        self.assertEqual((w['menonjol'], len(w['kejadian'])), (3, 3))
        lok = [(x['jenis'], x['lokasi'], x['baru']) for x in w['kejadian']]
        self.assertEqual(lok, [('banjir', 'Aceh Selatan', False), ('banjir', 'Kota Mataram', True), ('karhutla', 'Morowali Utara', True)])
        self.assertEqual(w['kejadian'][0]['angka'].get('kk'), 120)

    def test_kurang_tetap_ditolak(self):
        with self.assertRaisesRegex(ValueError, 'terurai 2 kejadian, laporan menyebut 3'):
            wa_harian.koordalops(TEKS.replace('1 .Bencana Alam Kebakaran', 'Bencana Alam Kebakaran'))


if __name__ == '__main__':
    unittest.main()
