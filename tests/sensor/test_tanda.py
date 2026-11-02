import unittest

import _jalur  # noqa: F401
from sensor.gateway.penanda import badan_json, tanda


class TestTanda(unittest.TestCase):
    def test_rfc4231_kasus2(self):
        self.assertEqual(tanda("Jefe", b"what do ya want for nothing?"),
                         "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843")

    def test_vektor_acuan_openssl(self):
        # dibuat terpisah: printf '%s' '<badan>' | openssl dgst -sha256 -hmac kunci-uji-0123456789abcdef
        badan = b'{"alat":"TMA-UJI-01","waktu":"2026-11-01T03:04:05Z","nilai":{"tinggi_cm":123.4},"baterai":3.98,"rssi":-97}'
        p = {"alat": "TMA-UJI-01", "waktu": "2026-11-01T03:04:05Z", "nilai": {"tinggi_cm": 123.4}, "baterai": 3.98, "rssi": -97}
        self.assertEqual(badan_json(p), badan)
        self.assertEqual(tanda("kunci-uji-0123456789abcdef", badan),
                         "b1060823fee36760d80b898de09155a46d3edde02eef7212418c118d0a942e7b")

    def test_satu_byte_beda_tanda_beda(self):
        self.assertNotEqual(tanda("k", b"a"), tanda("k", b"b"))


if __name__ == "__main__":
    unittest.main()
