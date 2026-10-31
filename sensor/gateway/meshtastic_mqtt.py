"""Meshtastic MQTT (mode JSON) -> /api/sensor/baca. Butuh paho-mqtt (satu-satunya dependensi non-stdlib):
    pip install paho-mqtt
Menangani:
  1. teks "SENSOR <alat> <hex payload><hex mac 8 byte>" -> bacaan sensor; hanya dari node terdaftar (cfg alat.nodes),
     MAC = 8 byte pertama HMAC-SHA256(kunci_alat, payload) harus cocok, seq sama dengan sebelumnya ditolak
  2. teks "LAPOR <kode> <isi bebas>"           -> laporan lapangan desa tanpa sinyal seluler
  3. telemetri lingkungan: rainfall_1h -> hujan mm60; distance (mm) -> tma, butuh tinggi_pasang_cm di config
     (PERIKSA nama bidang JSON pada versi firmware Meshtastic yang dipakai).
Laporan LAPOR: POST /api/sensor/lapor {alat, waktu, pengirim_node, teks} ditandatangani kunci alat gateway
(cfg.alat_gateway = {"id","kunci"}; url diturunkan dari cfg.url atau cfg.url_lapor). Gagal kirim: simpan di
antrean/lapor.jsonl (tidak hilang, diambil petugas).
"""
import argparse
import hashlib
import hmac
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
MAC_BYTE = 8            # 8 byte pertama HMAC-SHA256(kunci_alat, payload) menempel di ekor teks SENSOR
_seq_terakhir = {}      # alat -> seq terakhir (tolak ulang siaran yang sama)


def node_sah(cfg, alat_id, dari):
    """Hanya node radio yang didaftarkan ('nodes': ["!abcd1234"]) pada alat itu boleh mengirim atas namanya."""
    a = next((a for a in cfg["alat"].values() if a["id"] == alat_id), {})
    return bool(dari) and dari.lower() in [n.lower() for n in a.get("nodes", [])]


def buka_sensor(cfg, alat, dari, hexs):
    """Verifikasi node + MAC terpotong + anti-ulang. Mengembalikan payload bytes atau None."""
    if not node_sah(cfg, alat[0], dari):
        return None
    try:
        data = bytes.fromhex(hexs)
    except ValueError:
        return None
    if len(data) <= MAC_BYTE:
        return None
    isi, mac = data[:-MAC_BYTE], data[-MAC_BYTE:]
    if not hmac.compare_digest(hmac.new(alat[1].encode("utf-8"), isi, hashlib.sha256).digest()[:MAC_BYTE], mac):
        return None
    d = payload.decode(isi)
    if _seq_terakhir.get(alat[0]) == d["seq"]:
        return None
    _seq_terakhir[alat[0]] = d["seq"]
    return isi


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
            isi = buka_sensor(cfg, alat, dari, m.group(2))
            if isi is None:
                return None
            d = payload.decode(isi)
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
        if alat and not node_sah(cfg, alat[0], dari):
            alat = None
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


def _tambah_pribadi(path, baris):
    os.makedirs(os.path.dirname(path) or ".", mode=0o700, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as f:
        f.write(baris)


def _tulis_lapor(cfg, lp, post=post_http):
    g = cfg.get("alat_gateway") or {}
    if g.get("kunci"):
        badan = badan_json(lp)
        if post(url_lapor(cfg), badan, tanda(g["kunci"], badan)) // 100 == 2:
            return
    _tambah_pribadi(os.path.join(cfg.get("folder_antrean", "antrean"), "lapor.jsonl"), json.dumps(lp, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="gateway.json")
    a = ap.parse_args()
    cfg, pg = muat_cfg(a.config)
    import paho.mqtt.client as mqtt          # impor di sini agar uji tanpa paho tetap jalan
    m = cfg["mqtt"]
    if "GANTI" in m.get("sandi", "GANTI") or not m.get("user") or "meshtastic.org" in m["host"]:
        sys.exit("Isi broker MQTT PRIBADI (host, user, sandi) di gateway.json; broker publik ditolak. Lihat README.")
    c = mqtt.Client()
    c.username_pw_set(m["user"], m["sandi"])
    if m.get("tls", m["port"] == 8883):
        c.tls_set()
    c.on_connect = lambda cl, *x: (cl.subscribe(m["topik"]), print("terhubung", m["host"]))
    def _pesan(cl, ud, msg):
        try:
            proses(json.loads(msg.payload), cfg, pg)
        except (ValueError, KeyError) as e:
            print("abaikan:", e)
    c.on_message = _pesan
    c.connect(m["host"], m["port"])
    c.loop_forever()
