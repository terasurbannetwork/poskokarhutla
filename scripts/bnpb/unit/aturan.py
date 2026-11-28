"""MB-2 Jam Aturan, pembaca Python (ALGORITMA sec 3; DESAIN-TEKNIS sec 4.2; tiket RU-016).

Kembar public/inti/jam_aturan.js: membaca public/inti/jam_aturan.json yang sama dan
memberi hasil identik (uji kembar tests/bnpb/unit_kembar.test.mjs, kasus di
tests/bnpb/fixtures/unit/acuan.json). Angka tenggat dan standar hanya hidup di JSON itu.

Tafsir kalender (kita, bukan pasal): "N hari" = tanggal WIB + N hari kalender;
"N hari kerja" = Senin-Jumat sesudah tanggal mulai, minus libur_nasional;
"N bulan" = tanggal sama N bulan kemudian, dipangkas ke hari terakhir bulan;
"N tahun" = 12 x N bulan; "x 24 jam" dari cap waktu; tanggal diturunkan di WIB (UTC+7).

  python3 -I scripts/bnpb/unit/aturan.py --cek
  python3 -I scripts/bnpb/unit/aturan.py --kembar <id kasus acuan.json>
  python3 -I scripts/bnpb/unit/aturan.py --satuan
"""
import calendar
import json
import os
import random
import re
import sys
from datetime import date, datetime, timedelta, timezone

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
JALUR = os.path.join(AKAR, "public", "inti", "jam_aturan.json")
ACUAN = os.path.join(AKAR, "tests", "bnpb", "fixtures", "unit", "acuan.json")

# Sama persis dengan SATUAN di jam_aturan.js (uji kembar membandingkan lewat --satuan).
SATUAN = ["jam", "hari", "hari_kerja", "hari_kalender", "bulan", "tahun", "tanggal_bulan_berikut",
          "kg_orang_hari", "l_orang_hari", "m2_orang", "orang_per_unit", "kk_per_unit_per_3hari", "kg_orang_bulan",
          "persen", "jiwa_per_paket", "jp_per_tahun", "km", "rumah", "juta", "skala", "tanggal", "bendera"]

WIB = timezone(timedelta(hours=7))


def periksa(daftar):
    """Berkas rusak ditolak saat dimuat, bukan saat dipakai (pesan sama dengan JS)."""
    ada = set()
    for e in daftar:
        k = e.get("kunci")
        if k in ada:
            raise ValueError(f"Jam Aturan: kunci kembar {k}")
        ada.add(k)
        if e.get("satuan") not in SATUAN:
            raise ValueError(f'Jam Aturan: satuan "{e.get("satuan")}" di kunci {k} tidak sah')
        if e.get("asumsi") and not e.get("catatan"):
            raise ValueError(f"Jam Aturan: kunci {k} asumsi tanpa catatan")
        if not e.get("asumsi") and not (e.get("acuan") and e.get("kutipan")):
            raise ValueError(f"Jam Aturan: kunci {k} bukan asumsi tapi tanpa acuan/kutipan")
    return daftar


def muat(jalur=JALUR):
    with open(jalur, encoding="utf-8") as f:
        return periksa(json.load(f))


ATURAN = muat()


def aturan(kunci):
    for e in ATURAN:
        if e["kunci"] == kunci:
            return e
    raise KeyError(f"Jam Aturan: kunci tidak dikenal {kunci}")


def nilai(kunci):
    return aturan(kunci)["nilai"]


def standar(kunci):
    """Takaran kebutuhan (std_*, stok_*, jf_jp_tahun); tenggat dan ambang ditolak."""
    e = aturan(kunci)
    if e["jenis"] != "standar":
        raise ValueError(f"Jam Aturan: {kunci} bukan standar (jenis {e['jenis']})")
    r = {"nilai": e["nilai"], "satuan": e["satuan"], "asumsi": bool(e.get("asumsi"))}
    if e.get("awal"):
        r["awal"] = e["awal"]
    return r


LIBUR = nilai("libur_nasional")

_TGL = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
_CAP = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$")


def _tanggal_sah(s):
    m = _TGL.match(s) if isinstance(s, str) else None
    if not m:
        return None
    try:
        return date(int(m[1]), int(m[2]), int(m[3]))
    except ValueError:
        return None


def _cap(s):
    """Cap waktu bersel zona -> datetime sadar zona, atau None. Tanggal/jam tidak ada (30 Feb, 24:00) ditolak."""
    m = _CAP.match(s) if isinstance(s, str) else None
    if not m:
        return None
    z = m[7]
    try:
        tz = timezone.utc if z == "Z" else timezone((1 if z[0] == "+" else -1) * timedelta(hours=int(z[1:3]), minutes=int(z[4:6])))
        return datetime(int(m[1]), int(m[2]), int(m[3]), int(m[4]), int(m[5]), int(m[6] or 0), tzinfo=tz)
    except ValueError:
        return None


def _tanggal_wib(mulai):
    t = _tanggal_sah(mulai)
    if t:
        return t
    c = _cap(mulai)
    return c.astimezone(WIB).date() if c else None


def _tambah_bulan(t, n):
    total = t.year * 12 + (t.month - 1) + n
    y, m = divmod(total, 12)
    m += 1
    return date(y, m, min(t.day, calendar.monthrange(y, m)[1]))


def hari_kerja(t, n, libur=None):
    """n hari kerja SESUDAH tanggal t (ISO atau date): Senin-Jumat dikurangi libur (tanggal ISO)."""
    libur = LIBUR if libur is None else libur
    x = _tanggal_sah(t) if isinstance(t, str) else t
    sisa = n
    while sisa > 0:
        x += timedelta(days=1)
        if x.weekday() < 5 and x.isoformat() not in libur:
            sisa -= 1
    return x.isoformat()


def _tidak(alasan):
    return {"hasil": None, "alasan": alasan, "asumsi": False}


def tenggat(kunci, mulai):
    """-> {hasil, alasan, asumsi}. jam: mulai cap waktu bersel zona, hasil cap waktu +07:00.
    Satuan lain: tanggal ISO atau cap waktu; hasil tanggal ISO (WIB). Kosong atau tidak sah: hasil None dan alasan."""
    e = next((x for x in ATURAN if x["kunci"] == kunci), None)
    if e is None:
        return _tidak(f"kunci tidak dikenal: {kunci}")
    if e["jenis"] != "tenggat":
        return _tidak(f"{kunci} berjenis {e['jenis']}, bukan tenggat")

    def ok(hasil):
        return {"hasil": hasil, "alasan": None, "asumsi": bool(e.get("asumsi"))}

    if mulai is None or mulai == "":
        return _tidak("tanggal mulai kosong")
    sat, n = e["satuan"], e["nilai"]
    if sat == "jam":
        c = _cap(mulai)
        if c is None:
            return _tidak("jam butuh cap waktu bersel zona (mis. 2026-11-05T08:00:00+07:00)")
        return ok((c + timedelta(hours=n)).astimezone(WIB).strftime("%Y-%m-%dT%H:%M:%S") + "+07:00")
    t = _tanggal_wib(mulai)
    if t is None:
        return _tidak("tanggal mulai tidak sah")
    if sat in ("hari", "hari_kalender"):
        return ok((t + timedelta(days=n)).isoformat())
    if sat == "hari_kerja":  # berlabel asumsi bila daftar libur kosong (kalender_tanpa_libur)
        r = ok(hari_kerja(t, n))
        if not LIBUR:
            r["asumsi"] = True
        return r
    if sat == "bulan":
        return ok(_tambah_bulan(t, n).isoformat())
    if sat == "tahun":
        return ok(_tambah_bulan(t, 12 * n).isoformat())
    if sat == "tanggal_bulan_berikut":
        b = _tambah_bulan(date(t.year, t.month, 1), 1)
        return ok(date(b.year, b.month, min(n, calendar.monthrange(b.year, b.month)[1])).isoformat())
    return _tidak(f"satuan {sat} tidak didukung tenggat()")


def _acuan():
    with open(ACUAN, encoding="utf-8") as f:
        return json.load(f)


def kembar(id_kasus):
    for k in _acuan()["jam_aturan"]:
        if k["id"] == id_kasus:
            return tenggat(k["kunci"], k["mulai"])
    raise KeyError(f"kasus {id_kasus} tidak ada di acuan.json jam_aturan")


def cek():
    # kasus acuan RU sec 2.1 (sama dengan yang dijalankan JS)
    for k in _acuan()["jam_aturan"] + _acuan()["jam_aturan_beda_js"]:
        r = tenggat(k["kunci"], k["mulai"])
        for kunci_h, v in k["harap"].items():
            assert r[kunci_h] == v, f"{k['id']} {k['kunci']} {k['mulai']!r}: {kunci_h}={r[kunci_h]!r}, harap {v!r}"
        if r["hasil"] is None:
            assert r["alasan"], f"{k['id']}: hasil kosong tanpa alasan"
    # penolakan: kosong, tanggal tidak ada, tanpa zona, cap waktu tidak ada
    for m in (None, "", "bukan", "2026-02-30", "2026-13-01", "2026-04-31", "2027-02-29", 0, 1e12):
        r = tenggat("dsp_spj", m)
        assert r["hasil"] is None and r["alasan"], f"mulai={m!r} tidak ditolak: {r}"
    for m in ("2026-11-05", "2026-11-05T08:00:00", "2026-02-30T08:00:00Z", "2026-11-05T24:00:00Z"):
        assert tenggat("kaji_awal", m)["hasil"] is None, f"kaji_awal {m!r} tidak ditolak"
    assert tenggat("std_beras_kg", "2026-11-05")["hasil"] is None
    assert tenggat("stok_minimal_jam", "2026-11-05T08:00:00+07:00")["hasil"] is None  # satuan jam, jenis standar
    # hari kerja dengan libur kasus uji (bukan data nyata)
    assert hari_kerja("2026-11-06", 7, []) == "2026-11-17"
    assert hari_kerja("2026-11-06", 7, ["2026-11-10"]) == "2026-11-18"
    assert hari_kerja("2026-11-06", 1, ["2026-11-09", "2026-11-10"]) == "2026-11-11"
    assert hari_kerja("2026-11-07", 1, []) == "2026-11-09"
    assert hari_kerja("2026-11-06", 0, []) == "2026-11-06"
    # standar
    assert standar("std_beras_kg") == {"nilai": 0.4, "satuan": "kg_orang_hari", "asumsi": False}
    assert standar("std_air_bersih_l")["awal"] == {"nilai": 7, "hari": 3}
    for salah in ("dsp_spj", "rehab_macet_hari"):
        try:
            standar(salah)
        except ValueError:
            continue
        raise AssertionError(f"standar({salah}) tidak ditolak")
    # libur_nasional dan kalender_tanpa_libur konsisten
    assert nilai("kalender_tanpa_libur") == (len(LIBUR) == 0)
    # periksa() menolak berkas rusak
    dasar = {"kunci": "x", "jenis": "tenggat", "nilai": 1, "satuan": "hari", "asumsi": True, "catatan": "c"}
    periksa([dasar])
    for rusak in ([dict(dasar, satuan="minggu")], [dict(dasar, catatan=None)], [dasar, dasar], [dict(dasar, asumsi=False)],
                  [dict(dasar, asumsi=False, acuan="perban-4-2020", letak="Pasal 21 ayat (1)")]):
        try:
            periksa(rusak)
        except ValueError:
            continue
        raise AssertionError(f"periksa tidak menolak {rusak}")
    # invarian 200 masukan acak berbenih: > peristiwa, monoton, deterministik, tanggal ada
    benih = 20261105
    rng = random.Random(benih)
    kunci = [e["kunci"] for e in ATURAN if e["jenis"] == "tenggat" and e["satuan"] != "jam"]
    for i in range(200):
        k = kunci[i % len(kunci)]
        a, b = sorted(date(2020, 1, 1) + timedelta(days=rng.randrange(3650)) for _ in range(2))
        tl, th = tenggat(k, a.isoformat())["hasil"], tenggat(k, b.isoformat())["hasil"]
        pesan = f"kunci={k} lo={a} hi={b} tl={tl} th={th} benih={benih}"
        assert tl > a.isoformat(), "tenggat harus sesudah peristiwa: " + pesan
        assert tl <= th, "tidak monoton: " + pesan
        assert tenggat(k, a.isoformat())["hasil"] == tl, "tidak deterministik: " + pesan
        assert _tanggal_sah(tl) and _tanggal_sah(th), "tanggal tidak ada: " + pesan
    print(f"aturan.py --cek: lulus ({len(ATURAN)} kunci, {len(_acuan()['jam_aturan'])} kasus acuan)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    elif "--kembar" in sys.argv:
        print(json.dumps(kembar(sys.argv[sys.argv.index("--kembar") + 1]), ensure_ascii=False))
    elif "--satuan" in sys.argv:
        print(json.dumps(SATUAN))
    else:
        print(__doc__)
