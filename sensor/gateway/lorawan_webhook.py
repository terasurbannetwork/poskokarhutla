"""Penerima webhook uplink ChirpStack v4 / TTN v3 -> decode payload biner -> POST bertanda ke /api/sensor/baca.

Jalankan:  python3 lorawan_webhook.py --config gateway.json --port 8090
ChirpStack: Integrations > HTTP, endpoint http://<host>:8090/uplink, header X-Webhook-Token: <rahasia_webhook>.
TTN: Webhooks > Custom, header yang sama. Hanya stdlib.
"""
import argparse
import base64
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from sensor import payload  # noqa: E402
from sensor.gateway.penanda import Pengirim  # noqa: E402


def cari_alat(cfg, *calon):
    """cfg['alat'] berkunci nama perangkat / devEUI / id (huruf kecil). Mengembalikan (id, kunci) atau None."""
    for k, a in cfg["alat"].items():
        if any(c and str(c).lower() in (k.lower(), a["id"].lower()) for c in calon):
            return a["id"], a["kunci"]
    return None


def baca_uplink(ev):
    """-> (nama_calon[], bytes_payload, rssi) dari JSON ChirpStack v4 atau TTN v3."""
    if "deviceInfo" in ev:
        di, rx = ev["deviceInfo"], (ev.get("rxInfo") or [{}])
        return [di.get("deviceName"), di.get("devEui")], base64.b64decode(ev.get("data") or ""), rx[0].get("rssi", 0)
    if "end_device_ids" in ev:
        ids, um = ev["end_device_ids"], ev.get("uplink_message", {})
        rx = um.get("rx_metadata") or [{}]
        return [ids.get("device_id"), ids.get("dev_eui")], base64.b64decode(um.get("frm_payload") or ""), rx[0].get("rssi", 0)
    raise ValueError("bukan uplink ChirpStack/TTN")


def proses(ev, cfg, pengirim):
    """Satu uplink -> 1 bacaan terkirim/terantre. Mengembalikan dict hasil; ValueError bila tak bisa diurai."""
    calon, data, rssi = baca_uplink(ev)
    alat = cari_alat(cfg, *calon)
    if not alat:
        raise ValueError("perangkat tak terdaftar: %s" % calon)
    d = payload.decode(data)
    pengirim.kirim(alat[0], d["nilai"], d["baterai"], int(rssi))
    return {"alat": alat[0], "jenis": d["jenis"], "seq": d["seq"]}


def buat_server(cfg, pengirim, port):
    class H(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.headers.get("X-Webhook-Token") != cfg["rahasia_webhook"]:
                return self._balas(401, "tanda salah")
            try:
                n = int(self.headers.get("Content-Length", "0"))
                if n > 65536:
                    return self._balas(413, "terlalu besar")
                if "event=up" in self.path or self.path.startswith("/uplink"):
                    proses(json.loads(self.rfile.read(n)), cfg, pengirim)
                self._balas(200, "ok")
            except (ValueError, KeyError) as e:     # muatan jelek: 400, jangan diulang ChirpStack
                self._balas(400, str(e)[:100])

        def _balas(self, kode, teks):
            self.send_response(kode)
            self.end_headers()
            self.wfile.write(teks.encode())

        def log_message(self, *a):
            pass
    return ThreadingHTTPServer(("0.0.0.0", port), H)


def muat_cfg(path):
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg, Pengirim(cfg["url"], lambda a: next((x["kunci"] for x in cfg["alat"].values() if x["id"] == a), None),
                         cfg.get("folder_antrean", "antrean"))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="gateway.json")
    ap.add_argument("--port", type=int, default=8090)
    a = ap.parse_args()
    cfg, pg = muat_cfg(a.config)
    print("webhook LoRaWAN di :%d -> %s" % (a.port, cfg["url"]))
    buat_server(cfg, pg, a.port).serve_forever()
