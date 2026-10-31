import hashlib
import hmac
import os
import subprocess
import sys
import tempfile
import unittest

import _jalur  # noqa: F401
from sensor.gateway.kunci_alat import kunci_alat

SKRIP = os.path.join(_jalur.RAKUT, "sensor", "gateway", "kunci_alat.py")


class TestKunciAlat(unittest.TestCase):
    def test_turunan_hmac_induk_alat(self):
        self.assertEqual(kunci_alat("induk", "TMA-01"),
                         hmac.new(b"induk", b"TMA-01", hashlib.sha256).hexdigest())
        self.assertNotEqual(kunci_alat("induk", "TMA-01"), kunci_alat("induk", "TMA-02"))
        with self.assertRaises(ValueError):
            kunci_alat("", "x")

    def test_isi_config_tanpa_mencetak_kunci(self):
        with tempfile.TemporaryDirectory() as t:
            c = os.path.join(t, "config.h")
            open(c, "w").write('#define ALAT_ID "X"\n#define KUNCI_HMAC "GANTI"\n')
            env = dict(os.environ, SENSOR_KUNCI_INDUK="induk")
            r = subprocess.run([sys.executable, SKRIP, "TMA-01", "--config", c], env=env, capture_output=True, text=True)
            k = kunci_alat("induk", "TMA-01")
            self.assertEqual(r.returncode, 0)
            self.assertNotIn(k, r.stdout + r.stderr)
            isi = open(c).read()
            self.assertIn('KUNCI_HMAC "%s"' % k, isi)
            self.assertIn('ALAT_ID "TMA-01"', isi)

    def test_tanpa_induk_gagal(self):
        env = {k: v for k, v in os.environ.items() if k != "SENSOR_KUNCI_INDUK"}
        self.assertNotEqual(subprocess.run([sys.executable, SKRIP, "A"], env=env, capture_output=True).returncode, 0)


if __name__ == "__main__":
    unittest.main()
