"""Kodek payload biner LoRa. KEMBARAN sensor/firmware/lib/bnpb_sensor/payload.h: ubah satu, ubah keduanya.

Little-endian. Kepala 4 byte: [ver<<4 | jenis][seq u16][baterai u8, satuan 0,02 V].
Isi per jenis = SKEMA (kunci, format struct, faktor); mentah = bulatkan(nilai * faktor).
Sentinel rusak: lihat SENTINEL. Pembulatan: setengah menjauhi nol (sama dengan C++ floorf(x+0.5)), BUKAN round() Python.
"""
import math
import struct

VERSI = 1
JENIS = {"tma": 1, "hujan": 2, "longsor": 3, "gambut": 4, "gas": 5}
NAMA = {v: k for k, v in JENIS.items()}
SKEMA = {
    "tma": [("tinggi_cm", "H", 10), ("laju_cm_jam", "h", 10), ("n", "B", 1)],
    "hujan": [("mm10", "H", 10), ("mm60", "H", 10), ("tips", "H", 1)],
    "longsor": [("geser_mm", "H", 10), ("laju_mm_jam", "h", 10), ("miring_x", "h", 100),
                ("miring_y", "h", 100), ("lembap", "B", 1), ("sirene", "B", 1)],
    "gambut": [("muka_air_cm", "h", 10), ("lembap", "B", 1)],
    "gas": [("co_ppm", "H", 10), ("pm25", "H", 10), ("pm10", "H", 10)],
}
_BATAS = {"B": (0, 255), "H": (0, 65535), "h": (-32768, 32767)}
# Sentinel "sensor rusak / tak terbaca" = nilai tertinggi tiap tipe (None di Python, NAN di C++). Nilai sah dijepit
# satu di bawahnya. Pengecualian: tips (penghitung berputar penuh 0..65535).
SENTINEL = {"B": 255, "H": 65535, "h": 32767}
TANPA_SENTINEL = {"tips"}
SATUAN_BATERAI = 0.02


def _bulat(x):
    return int(math.copysign(math.floor(abs(x) + 0.5), x))


def _jepit(v, fmt, kunci=""):
    lo, hi = _BATAS[fmt]
    return max(lo, min(hi if kunci in TANPA_SENTINEL else hi - 1, v))


def _mentah(kunci, fmt, fak, x):
    return SENTINEL[fmt] if x is None else _jepit(_bulat(x * fak), fmt, kunci)


def encode(jenis, seq, volt, nilai):
    f = "<BHB" + "".join(s[1] for s in SKEMA[jenis])
    mentah = [_mentah(k, fmt, fak, nilai[k]) for k, fmt, fak in SKEMA[jenis]]
    return struct.pack(f, (VERSI << 4) | JENIS[jenis], seq & 0xFFFF,
                       _jepit(_bulat(volt / SATUAN_BATERAI), "B"), *mentah)


def decode(data):
    data = bytes(data)
    if len(data) < 4:
        raise ValueError("payload terlalu pendek")
    ver, jid = data[0] >> 4, data[0] & 15
    if ver != VERSI or jid not in NAMA:
        raise ValueError("versi/jenis payload tidak dikenal: %02x" % data[0])
    jenis = NAMA[jid]
    f = "<BHB" + "".join(s[1] for s in SKEMA[jenis])
    if len(data) != struct.calcsize(f):
        raise ValueError("panjang payload %d, seharusnya %d" % (len(data), struct.calcsize(f)))
    v = struct.unpack(f, data)
    nilai = {k: None if (m == SENTINEL[fmt] and k not in TANPA_SENTINEL) else (round(m / fak, 2) if fak > 1 else m)
             for (k, fmt, fak), m in zip(SKEMA[jenis], v[3:])}
    return {"jenis": jenis, "seq": v[1], "baterai": round(v[2] * SATUAN_BATERAI, 2), "nilai": nilai}
