import json
import os
import re
import unittest

import _jalur  # noqa: F401
from sensor import ambang, payload

SENSOR = os.path.join(_jalur.RAKUT, "sensor")
FW = os.path.join(SENSOR, "firmware")


class TestKonsistensi(unittest.TestCase):
    def test_tiap_jenis_punya_proyek_firmware_lengkap(self):
        for j in payload.JENIS:
            for rel in ("platformio.ini", "include/config.example.h", "src/main.cpp"):
                self.assertTrue(os.path.exists(os.path.join(FW, j, rel)), j + "/" + rel)

    def test_ambang_punya_aturan_untuk_tiap_jenis_dan_kunci_valid(self):
        a = ambang.muat()
        for j, skema in payload.SKEMA.items():
            kunci = {s[0] for s in skema}
            self.assertTrue(a["jenis"][j]["aturan"], j)
            for r in a["jenis"][j]["aturan"]:
                self.assertIn(r["kunci"], kunci, j)
                self.assertIn(r["op"], (">=", "<="))
                self.assertTrue(r["dasar"])

    def test_sirene_lokal_firmware_sama_dengan_ambang_json(self):
        s = ambang.muat()["jenis"]["longsor"]["sirene_lokal"]
        h = open(os.path.join(FW, "longsor/include/config.example.h"), encoding="utf-8").read()
        nilai = float(re.search(r"#define\s+SIRENE_LAJU_MM_JAM\s+([\d.]+)", h).group(1))
        konf = int(re.search(r"#define\s+SIRENE_KONFIRMASI\s+(\d+)", h).group(1))
        self.assertEqual((nilai, konf), (float(s["nilai"]), s["konfirmasi"]))

    def test_rahasia_tidak_dilacak(self):
        ig = open(os.path.join(SENSOR, ".gitignore"), encoding="utf-8").read()
        for pola in ("config.h", "gateway.json", "kunci*.json"):
            self.assertIn(pola, ig)
        for akar, _, files in os.walk(SENSOR):
            for f in files:
                if f.endswith(".h") and "example" not in f and f != "config.h" and "lib" not in akar:
                    self.fail("config rahasia nyasar: " + os.path.join(akar, f))
        for akar, _, files in os.walk(FW):
            for f in files:
                if f.endswith(".example.h"):
                    t = open(os.path.join(akar, f), encoding="utf-8").read()
                    self.assertNotRegex(t, r'"[0-9a-fA-F]{32,}"', f)     # kunci asli 32+ hex tak boleh ada di contoh


if __name__ == "__main__":
    unittest.main()
