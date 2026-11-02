import unittest

import _jalur  # noqa: F401
from sensor import ambang
from sensor.sim.simulasi import SKENARIO, deret

HARAPAN = {   # skenario -> (tingkat maksimum, tingkat pertama kali melewati 'awal' bila ada)
    "tma_normal": 0, "tma_banjir": 3, "hujan_normal": 0, "hujan_lebat": 3,
    "longsor_normal": 0, "longsor_rayapan": 3, "gambut_basah": 0, "gambut_kering": 2,
    "gas_normal": 0, "gas_asap": 3,
}


class TestSimulasi(unittest.TestCase):
    def test_semua_skenario_terdaftar(self):
        self.assertEqual(set(HARAPAN), set(SKENARIO))

    def test_tingkat_maks(self):
        for nama, tmax in HARAPAN.items():
            jenis, seri = deret(nama)
            self.assertEqual(max(ambang.tingkat(jenis, v) for v in seri), tmax, nama)

    def test_deterministik(self):
        self.assertEqual(deret("longsor_rayapan"), deret("longsor_rayapan"))

    def test_tingkat_naik_bertahap_sebelum_awas(self):
        _, seri = deret("longsor_rayapan")
        t = [ambang.tingkat("longsor", v) for v in seri]
        self.assertLess(t.index(1), t.index(3))      # waspada mendahului awas, bukan loncat
        self.assertEqual(t[:20], [0] * 20)           # sebelum rayapan mulai tidak ada alarm

    def test_ambang_null_dilewati(self):
        self.assertEqual(ambang.tingkat("tma", {"tinggi_cm": 9999, "laju_cm_jam": 0}), 0)

    def test_sensor_rusak_bukan_alarm(self):
        self.assertEqual(ambang.tingkat("gas", {"co_ppm": None, "pm25": None, "pm10": None}), 0)
        self.assertEqual(ambang.tingkat("gambut", {"muka_air_cm": None, "lembap": None}), 0)


if __name__ == "__main__":
    unittest.main()
