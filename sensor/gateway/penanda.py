"""Penanda tangan + antrean disk (simpan-lalu-teruskan) untuk POST /api/sensor/baca. Hanya stdlib.

Kontrak: badan JSON {alat, waktu ISO-UTC, nilai{}, baterai, rssi}; header X-Sensor-Tanda = HMAC-SHA256
hex huruf kecil atas BYTE badan persis seperti dikirim; kunci = string kunci alat (UTF-8) apa adanya.
Kunci alat = HMAC-SHA256(SENSOR_KUNCI_INDUK, alat_id) heks (lihat kunci_alat.py). `waktu` = waktu KIRIM
(worker menerima +-10 menit); `waktu_asli` = waktu ukur, sampai 24 jam ke belakang. Antrean TIDAK menyimpan
tanda tangan: badan dibangun dan ditandai ulang saat kirim. Bacaan lebih tua dari BATAS_USANG dikirim dengan
waktu=kini dan waktu_asli=waktu ukur; yang lebih tua dari 24 jam dibuang ke ditolak/.
"""
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

BATAS_USANG = 540      # detik; di bawah batas 600 s worker
BATAS_ASLI = 86400     # waktu_asli tertua yang diterima worker
MAKS_ANTREAN = 5000


def tanda(kunci, badan):
    if isinstance(kunci, str):
        kunci = kunci.encode("utf-8")
    return hmac.new(kunci, badan, hashlib.sha256).hexdigest()


def iso(epoch):
    return datetime.fromtimestamp(epoch, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def epoch(waktu_iso):
    return datetime.strptime(waktu_iso, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp()


def badan_json(p):
    return json.dumps(p, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def post_http(url, badan, tanda_hex, timeout=10):
    """Mengembalikan kode HTTP; 0 bila jaringan gagal."""
    req = urllib.request.Request(url, data=badan, method="POST", headers={
        "Content-Type": "application/json", "X-Sensor-Tanda": tanda_hex})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except (urllib.error.URLError, OSError):
        return 0


class Pengirim:
    """kirim() selalu menaruh dulu ke disk, lalu menguras berurutan. Gagal sementara = tetap di antrean."""

    def __init__(self, url, kunci_dari, folder, post=post_http, sekarang=time.time):
        self.url, self.kunci_dari, self.post, self.sekarang = url, kunci_dari, post, sekarang
        self.folder = folder
        self.ditolak = os.path.join(folder, "ditolak")
        os.makedirs(self.ditolak, mode=0o700, exist_ok=True)
        os.chmod(folder, 0o700)

    def _berkas(self):
        return sorted(f for f in os.listdir(self.folder) if f.endswith(".json"))

    def kirim(self, alat, nilai, baterai, rssi, waktu=None):
        waktu = waktu or iso(self.sekarang())
        nama = "%019d-%s.json" % (time.time_ns(), alat)
        tmp = os.path.join(self.folder, nama + ".tmp")
        with os.fdopen(os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as f:
            json.dump({"alat": alat, "waktu": waktu, "nilai": nilai, "baterai": baterai, "rssi": rssi}, f)
        os.replace(tmp, os.path.join(self.folder, nama))
        for lama in self._berkas()[:-MAKS_ANTREAN]:
            os.remove(os.path.join(self.folder, lama))
        return self.kuras()

    def kuras(self):
        """Jumlah terkirim. Berhenti di kegagalan sementara agar urutan waktu terjaga."""
        terkirim = 0
        for nama in self._berkas():
            jalan = os.path.join(self.folder, nama)
            with open(jalan, encoding="utf-8") as f:
                p = json.load(f)
            kunci = self.kunci_dari(p["alat"])
            if kunci is None:
                os.replace(jalan, os.path.join(self.ditolak, nama))
                continue
            kini = self.sekarang()
            if kini - epoch(p["waktu"]) > BATAS_ASLI:
                os.replace(jalan, os.path.join(self.ditolak, nama))
                continue
            if kini - epoch(p["waktu"]) > BATAS_USANG:
                p = dict(p, waktu=iso(kini), waktu_asli=p["waktu"])
            badan = badan_json(p)
            kode = self.post(self.url, badan, tanda(kunci, badan))
            if 200 <= kode < 300 or kode == 409:      # 409 = sudah ada (alat, waktu)
                os.remove(jalan)
                terkirim += 1
            elif kode == 0 or kode == 429 or kode >= 500:
                break
            else:
                os.replace(jalan, os.path.join(self.ditolak, nama))
        return terkirim
