import base64
import json
import os
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

import _jalur  # noqa: F401
from sensor import payload
from sensor.gateway import lorawan_webhook, meshtastic_mqtt
from sensor.gateway.penanda import Pengirim, epoch, iso, tanda

KUNCI = "kunci-uji-gateway"
CFG = {"alat_gateway": {"id": "GW-1", "kunci": KUNCI}, "alat": {"tma-bjn-01": {"id": "TMA-BJN-01", "kunci": KUNCI, "tinggi_pasang_cm": 500}},
       "rahasia_webhook": "r", "url": "x"}


class WorkerPalsu:
    """Meniru kontrak worker: tanda salah 401, waktu miring >10 menit 400, ganda 409, bisa 'mati' 503."""

    def __init__(self):
        self.terima, self.mati, self.kode_paksa = [], False, None
        me = self

        class H(BaseHTTPRequestHandler):
            def do_POST(self):
                n = int(self.headers["Content-Length"])
                badan = self.rfile.read(n)
                if me.mati:
                    return self._k(503)
                if self.headers.get("X-Sensor-Tanda") != tanda(KUNCI, badan):
                    return self._k(401)
                p = json.loads(badan)
                import time
                if abs(time.time() - epoch(p["waktu"])) > 600:
                    return self._k(400)
                if me.kode_paksa:
                    return self._k(me.kode_paksa)
                me.terima.append(p)
                self._k(200)

            def _k(self, k):
                self.send_response(k)
                self.end_headers()

            def log_message(self, *a):
                pass
        self.srv = HTTPServer(("127.0.0.1", 0), H)
        self.url = "http://127.0.0.1:%d/api/sensor/baca" % self.srv.server_port
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def tutup(self):
        self.srv.shutdown()


class TestGateway(unittest.TestCase):
    def setUp(self):
        self.w = WorkerPalsu()
        self.tmp = tempfile.TemporaryDirectory()
        self.pg = Pengirim(self.w.url, lambda a: KUNCI if a == "TMA-BJN-01" else None, self.tmp.name)

    def tearDown(self):
        self.w.tutup()
        self.tmp.cleanup()

    def antre(self):
        return [f for f in os.listdir(self.tmp.name) if f.endswith(".json")]

    def test_langsung_terkirim_dan_bertanda_sah(self):
        self.assertEqual(self.pg.kirim("TMA-BJN-01", {"tinggi_cm": 100.0}, 3.9, -90), 1)
        self.assertEqual(self.w.terima[0]["nilai"], {"tinggi_cm": 100.0})
        self.assertEqual(self.antre(), [])

    def test_simpan_lalu_teruskan_urut(self):
        self.w.mati = True
        for i in range(3):
            self.assertEqual(self.pg.kirim("TMA-BJN-01", {"tinggi_cm": float(i)}, 3.9, -90), 0)
        self.assertEqual(len(self.antre()), 3)
        self.w.mati = False
        self.assertEqual(self.pg.kuras(), 3)
        self.assertEqual([p["nilai"]["tinggi_cm"] for p in self.w.terima], [0.0, 1.0, 2.0])
        self.assertEqual(self.antre(), [])

    def test_bacaan_usang_dikirim_dengan_waktu_baru_dan_waktu_asli(self):
        import time
        lama = iso(time.time() - 3600)
        self.w.mati = True
        self.pg.kirim("TMA-BJN-01", {"tinggi_cm": 1.0}, 3.9, -90, waktu=lama)
        self.w.mati = False
        self.assertEqual(self.pg.kuras(), 1)          # tanpa penanganan ini worker menjawab 400 dan data hilang
        self.assertEqual(self.w.terima[0]["waktu_asli"], lama)

    def test_lebih_tua_24_jam_dibuang(self):
        import time
        self.w.mati = True
        self.pg.kirim("TMA-BJN-01", {"tinggi_cm": 1.0}, 3.9, -90, waktu=iso(time.time() - 90000))
        self.w.mati = False
        self.assertEqual(self.pg.kuras(), 0)
        self.assertEqual(len(os.listdir(os.path.join(self.tmp.name, "ditolak"))), 1)

    def test_lapor_ditandatangani_kunci_gateway(self):
        diterima = []
        meshtastic_mqtt._tulis_lapor({**CFG, "url": "http://x/api/sensor/baca"},
                                     {"alat": "GW-1", "waktu": "2026-11-01T00:00:00Z", "pengirim_node": "!a", "teks": "t"},
                                     post=lambda u, b, t: (diterima.append((u, b, t)), 200)[1])
        u, b, t = diterima[0]
        self.assertTrue(u.endswith("/api/sensor/lapor"))
        self.assertEqual(t, tanda(KUNCI, b))

    def test_ditolak_permanen_tidak_menyumbat(self):
        self.w.kode_paksa = 422
        self.pg.kirim("TMA-BJN-01", {"tinggi_cm": 1.0}, 3.9, -90)
        self.assertEqual(self.antre(), [])
        self.assertEqual(len(os.listdir(os.path.join(self.tmp.name, "ditolak"))), 1)

    def test_alat_tak_dikenal_ditolak(self):
        self.pg.kirim("ASING", {"tinggi_cm": 1.0}, 3.9, -90)
        self.assertEqual((self.w.terima, self.antre()), ([], []))

    def test_chirpstack_dan_ttn(self):
        data = base64.b64encode(payload.encode("tma", 5, 3.9, {"tinggi_cm": 250.0, "laju_cm_jam": 12.0, "n": 9})).decode()
        cs = {"deviceInfo": {"deviceName": "tma-bjn-01", "devEui": "aa"}, "data": data, "rxInfo": [{"rssi": -101}]}
        ttn = {"end_device_ids": {"device_id": "tma-bjn-01"}, "uplink_message": {"frm_payload": data, "rx_metadata": [{"rssi": -99}]}}
        for ev, rssi in ((cs, -101), (ttn, -99)):
            r = lorawan_webhook.proses(ev, CFG, self.pg)
            self.assertEqual((r["alat"], r["jenis"], r["seq"]), ("TMA-BJN-01", "tma", 5))
            self.assertEqual(self.w.terima[-1]["rssi"], rssi)
        self.assertEqual(self.w.terima[-1]["nilai"]["laju_cm_jam"], 12.0)
        with self.assertRaises(ValueError):
            lorawan_webhook.proses({"deviceInfo": {"deviceName": "asing"}, "data": data}, CFG, self.pg)

    def test_meshtastic_sensor_dan_lapor(self):
        hexp = payload.encode("tma", 1, 3.9, {"tinggi_cm": 300.0, "laju_cm_jam": 0, "n": 9}).hex()
        pesan = {"type": "text", "sender": "!abcd", "payload": {"text": "SENSOR TMA-BJN-01 " + hexp}}
        self.assertEqual(meshtastic_mqtt.proses(pesan, CFG, self.pg), "sensor")
        self.assertEqual(self.w.terima[-1]["nilai"]["tinggi_cm"], 300.0)
        got = []
        lap = {"type": "text", "sender": "!abcd", "payload": {"text": "lapor bjn-02 sungai naik 2 meter, 3 rumah terendam"}}
        self.assertEqual(meshtastic_mqtt.proses(lap, CFG, self.pg, tulis_lapor=got.append), "lapor")
        self.assertEqual((got[0]["alat"], got[0]["pengirim_node"]), ("GW-1", "!abcd"))
        self.assertEqual(set(got[0]), {"alat", "waktu", "pengirim_node", "teks"})
        self.assertTrue(got[0]["teks"].startswith("BJN-02 sungai naik"))
        self.assertIsNone(meshtastic_mqtt.parse_lapor("halo semua"))
        self.assertIsNone(meshtastic_mqtt.proses({"type": "text", "payload": {"text": "halo"}}, CFG, self.pg))

    def test_ujung_ke_ujung_simulator_ke_worker_palsu(self):
        from sensor.sim.simulasi import deret
        from sensor.gateway.penanda import badan_json, post_http
        import time
        _, seri = deret("tma_banjir", 5)
        for v in seri:
            p = {"alat": "TMA-BJN-01", "waktu": iso(time.time()), "nilai": v, "baterai": 3.9, "rssi": -95}
            b = badan_json(p)
            self.assertEqual(post_http(self.w.url, b, tanda(KUNCI, b)), 200)
        self.assertEqual(len(self.w.terima), 5)


if __name__ == "__main__":
    unittest.main()
