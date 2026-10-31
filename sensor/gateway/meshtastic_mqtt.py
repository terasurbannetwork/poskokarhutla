"""Meshtastic MQTT (mode JSON) -> /api/sensor/baca. Butuh paho-mqtt (satu-satunya dependensi non-stdlib):
    pip install paho-mqtt
Menangani:
  1. teks "SENSOR <alat> <hex payload biner>"  -> bacaan sensor (kodek sama dengan LoRa)
  2. teks "LAPOR <kode> <isi bebas>"           -> laporan lapangan desa tanpa sinyal seluler
  3. telemetri lingkungan: rainfall_1h -> hujan mm60; distance (mm) -> tma, butuh tinggi_pasang_cm di config
     (PERIKSA nama bidang JSON pada versi firmware Meshtastic yang dipakai).
Laporan LAPOR: POST /api/sensor/lapor {alat, waktu, pengirim_node, teks} ditandatangani kunci alat gateway
(cfg.alat_gateway = {"id","kunci"}; url diturunkan dari cfg.url atau cfg.url_lapor). Gagal kirim: simpan di
antrean/lapor.jsonl (tidak hilang, diambil petugas).
"""
import argparse
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from sensor import payload  # noqa: E402
from sensor.gateway.lorawan_webhook import cari_alat, muat_cfg  # noqa: E402
from sensor.gateway.penanda import badan_json, iso, post_http, tanda  # noqa: E402

LAPOR = re.compile(r"^\s*LAPOR\s+(\S+)\s*(.*)$", re.I | re.S)
SENSOR = re.compile(r"^\s*SENSOR\s+(\S+)\s+([0-9a-fA-F]+)\s*$")


def parse_lapor(teks):
    m = LAPOR.match(teks or "")
    return {"kode": m.group(1).upper(), "teks": m.group(2).strip()[:500]} if m else None


def proses(pesan, cfg, pengirim, tulis_lapor=None):
    """Satu pesan JSON Meshtastic. Mengembalikan 'sensor' | 'lapor' | 'telemetri' | None (diabaikan)."""
    dari = pesan.get("sender") or str(pesan.get("from", ""))
    p = pesan.get("payload") or {}
    if pesan.get("type") == "text":
        teks = p.get("text", "") if isinstance(p, dict) else str(p)
        m = SENSOR.match(teks)
        if m:
            alat = cari_alat(cfg, m.group(1))
            if not alat:
                return None
            d = payload.decode(bytes.fromhex(m.group(2)))
            pengirim.kirim(alat[0], d["nilai"], d["baterai"], int(pesan.get("rssi", 0)))
            return "sensor"
        lp = parse_lapor(teks)
        if lp:
            lp = {"alat": cfg.get("alat_gateway", {}).get("id", ""), "waktu": iso(time.time()),
                  "pengirim_node": dari, "teks": "%s %s" % (lp["kode"], lp["teks"]) if lp["teks"] else lp["kode"]}
            (tulis_lapor or (lambda x: _tulis_lapor(cfg, x)))(lp)
            return "lapor"
    elif pesan.get("type") == "telemetry" and isinstance(p, dict):
        alat = cari_alat(cfg, dari)
        if alat and "rainfall_1h" in p:
            pengirim.kirim(alat[0], {"mm10": 0, "mm60": float(p["rainfall_1h"]), "tips": 0}, 0, int(pesan.get("rssi", 0)))
            return "telemetri"
        a = next((a for a in cfg["alat"].values() if a["id"] == (alat or [""])[0]), None)
        if alat and "distance" in p and a and a.get("tinggi_pasang_cm"):
            tinggi = a["tinggi_pasang_cm"] - float(p["distance"]) / 10
            pengirim.kirim(alat[0], {"tinggi_cm": round(tinggi, 1), "laju_cm_jam": 0, "n": 1}, 0, int(pesan.get("rssi", 0)))
            return "telemetri"
    return None


def url_lapor(cfg):
    return cfg.get("url_lapor") or cfg["url"].replace("/api/sensor/baca", "/api/sensor/lapor")


def _tulis_lapor(cfg, lp, post=post_http):
    g = cfg.get("alat_gateway") or {}
    if g.get("kunci"):
        badan = badan_json(lp)
        if post(url_lapor(cfg), badan, tanda(g["kunci"], badan)) // 100 == 2:
            return
    os.makedirs(cfg.get("folder_antrean", "antrean"), exist_ok=True)
    with open(os.path.join(cfg.get("folder_antrean", "antrean"), "lapor.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(lp, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="gateway.json")
    a = ap.parse_args()
    cfg, pg = muat_cfg(a.config)
    import paho.mqtt.client as mqtt          # impor di sini agar uji tanpa paho tetap jalan
    m = cfg["mqtt"]
    c = mqtt.Client()
    if m.get("user"):
        c.username_pw_set(m["user"], m["sandi"])
    c.on_connect = lambda cl, *x: (cl.subscribe(m["topik"]), print("terhubung", m["host"]))
    def _pesan(cl, ud, msg):
        try:
            proses(json.loads(msg.payload), cfg, pg)
        except (ValueError, KeyError) as e:
            print("abaikan:", e)
    c.on_message = _pesan
    c.connect(m["host"], m["port"])
    c.loop_forever()
