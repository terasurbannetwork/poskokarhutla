import os
import shutil
import subprocess
import tempfile
import unittest

import _jalur  # noqa: F401
from sensor import payload

EMAS = [   # (jenis, seq, volt, nilai) -> urutan sama dengan payload_emas.cpp
    ("tma", 513, 3.98, {"tinggi_cm": 123.4, "laju_cm_jam": -5.5, "n": 9}),
    ("hujan", 7, 4.2, {"mm10": 1.6, "mm60": 12.4, "tips": 61}),
    ("longsor", 65535, 3.7, {"geser_mm": 42.5, "laju_mm_jam": -0.8, "miring_x": -1.25, "miring_y": 3.5, "lembap": 77, "sirene": 1}),
    ("gambut", 3, 3.3, {"muka_air_cm": -45.5, "lembap": 36}),
    ("gambut", 4, 3.3, {"muka_air_cm": None, "lembap": None}),
    ("gas", 10, 4.0, {"co_ppm": None, "pm25": 12.5, "pm10": None}),
    ("gas", 9, 4.0, {"co_ppm": 12.3, "pm25": 187.5, "pm10": 230.0}),
]
PANJANG = {"tma": 9, "hujan": 10, "longsor": 14, "gambut": 7, "gas": 10}


class TestPayload(unittest.TestCase):
    def test_bolak_balik(self):
        for jenis, seq, volt, nilai in EMAS:
            b = payload.encode(jenis, seq, volt, nilai)
            self.assertEqual(len(b), PANJANG[jenis])
            self.assertLessEqual(len(b), 51)          # muat di SF12 terburuk
            d = payload.decode(b)
            self.assertEqual((d["jenis"], d["seq"], d["nilai"]), (jenis, seq, nilai))
            self.assertAlmostEqual(d["baterai"], volt, delta=0.02)

    def test_vektor_emas_tma(self):
        # ver1|jenis1=0x11, seq 513=0x0201 (LE), bat 3.98/0.02=199=0xc7, 1234=0x04d2, -55=0xffc9, n=9
        self.assertEqual(payload.encode("tma", 513, 3.98, EMAS[0][3]).hex(), "11" "0102" "c7" "d204" "c9ff" "09")

    def test_jepit_dan_tolak(self):
        d = payload.decode(payload.encode("hujan", 0, 3.9, {"mm10": 9999, "mm60": -3, "tips": 70000}))
        self.assertEqual((d["nilai"]["mm10"], d["nilai"]["mm60"], d["nilai"]["tips"]), (6553.4, 0, 65535))
        for jelek in (b"", b"\x11\x00", b"\x91" + bytes(8), b"\x11" + bytes(5)):
            with self.assertRaises(ValueError):
                payload.decode(jelek)

    @unittest.skipUnless(shutil.which("c++") or shutil.which("g++") or shutil.which("clang++"), "tak ada kompilator C++")
    def test_firmware_payload_h_sama_dengan_python(self):
        cxx = shutil.which("c++") or shutil.which("g++") or shutil.which("clang++")
        here = os.path.dirname(os.path.abspath(__file__))
        with tempfile.TemporaryDirectory() as t:
            exe = os.path.join(t, "emas")
            subprocess.run([cxx, "-std=c++11", "-o", exe, os.path.join(here, "payload_emas.cpp")], check=True)
            keluar = subprocess.run([exe], check=True, capture_output=True, text=True).stdout.split()
        harapan = [payload.encode(*e).hex() for e in EMAS]
        self.assertEqual(keluar, harapan)


if __name__ == "__main__":
    unittest.main()
