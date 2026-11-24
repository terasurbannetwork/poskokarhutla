"""Bangunan dalam 500 m dari petak api per insiden (IK-06/IK-07, data/kajian-bnpb/insiden-kaya/ALGORITMA.md bagian B).
public/data/progresi/arsip/<id>.json (petak VIIRS 375 m) x grid halus Open Buildings (data/terkunci/bangunan/halus_<prov>.json)
-> public/data/insiden_bangunan.json (publik, dibulatkan) + data/terkunci/insiden/bangunan_<id>.json (rincian sel, TIDAK terbit).

Definisi: bangunan Open Buildings v3 (keyakinan >= bangunan.AMBANG_KEYAKINAN, satu nilai bersama) yang sel halus 110 m-nya berpusat <= 500 m dari PUSAT petak mana pun.
Gabungan, bukan jumlah: tiap sel halus (dan bangunan di dalamnya) sekali per insiden walau dekat banyak petak (D11). `kini` = hanya petak yang deteksi terakhirnya <= SEGAR_JAM.
Provinsi tanpa grid halus: terliput:false, angka null (bukan 0). Tak pernah menulis "aman": nol terdeteksi bukan jaminan tak ada bangunan.
Tak dijumlah dengan paparan_bangunan.py (poligon kompleks 1/3/5 km, sel kasar 1,1 km) atau OSM. Rincian sel/koordinat bangunan tak pernah di public/.
Keterbatasan: hanya provinsi dari kode insiden; petak dekat batas provinsi tak bergrid kehilangan sel di seberang (catatan, tidak dikoreksi).

Pakai: python3 -I scripts/umum/paparan_insiden.py | --uji
"""
import datetime as dt, glob, importlib.util, json, math, os, sys, tempfile

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DATA = os.environ.get("INSIDEN_DATA") or os.path.join(AKAR, "public/data")
GRID = os.environ.get("BANGUNAN_GRID") or os.path.join(AKAR, "data/terkunci/bangunan")
RINCI = os.path.join(AKAR, "data/terkunci/insiden")
RADIUS_M = 500
RADIUS_KM = RADIUS_M / 1000
SEGAR_JAM = 12                                   # = insiden.SEGAR_JAM
SEL_DEG = 0.0034
ARSIP_DARI = dt.datetime(2026, 7, 1, tzinfo=dt.timezone.utc)
GALAT_HALUS_KM = 0.08
KM_LAT, KM_LON = 110.57, 111.32


def _muat_bangunan():
    s = importlib.util.spec_from_file_location("umum_bangunan_insiden", os.path.join(AKAR, "scripts/umum/bangunan.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


B = _muat_bangunan()
AMBANG_BANGUNAN = B.AMBANG_KEYAKINAN


def jarak_km(la1, lo1, la2, lo2):
    """Ekuirektangular lokal (rumus sama dengan kendala.km); cukup untuk <= 1 km."""
    return math.hypot((la2 - la1) * KM_LAT, (lo2 - lo1) * KM_LON * math.cos(math.radians((la1 + la2) / 2)))


def pusat_petak(p):
    return (p[0] + 0.5) * SEL_DEG, (p[1] + 0.5) * SEL_DEG


def titik_dalam(petak, lat0=-12.0, lon0=94.0, radius_km=RADIUS_KM):
    """Pusat sel halus (lon, lat) berjarak <= radius dari pusat salah satu petak; sel yang sama dari banyak petak muncul sekali (himpunan)."""
    h = B.HALUS
    out = set()
    for p in petak:
        la, lo = pusat_petak(p)
        dl = math.ceil(radius_km / KM_LAT * h) + 1
        dn = math.ceil(radius_km / (KM_LON * math.cos(math.radians(la))) * h) + 1
        i0, j0 = math.floor((la - lat0) * h), math.floor((lo - lon0) * h)
        for i in range(i0 - dl, i0 + dl + 1):
            for j in range(j0 - dn, j0 + dn + 1):
                cla, clo = lat0 + (i + .5) / h, lon0 + (j + .5) / h
                if jarak_km(la, lo, cla, clo) <= radius_km + 1e-9:
                    out.add((round(clo, 6), round(cla, 6)))
    return out


def bulat5(n):
    return (n + 2) // 5 * 5


def tampil(n):
    """Q6 [SEMENTARA]: < 5 'kurang dari 5'; selebihnya 'sekitar' kelipatan 5. n None = tak ada."""
    if n is None:
        return None
    return "kurang dari 5" if n < 5 else "sekitar %d" % bulat5(n)


def angka_publik(n):
    return None if n is None or n < 5 else bulat5(n)       # < 5 tak diberi bilangan: nol tak boleh terbaca sebagai 'tidak ada'


def luas_publik(m2):
    return None if m2 is None else int((m2 + 50) // 100 * 100)


def hitung_insiden(prov, petak, segar, grid=GRID):
    """-> dict mentah {terliput, kumulatif, kini, luas_atap_m2, sel_halus}; provinsi tanpa grid = terliput:false, semua null."""
    if not os.path.exists(os.path.join(grid, "halus_%s.json" % prov)):
        return {"terliput": False, "kumulatif": None, "kini": None, "luas_atap_m2": None, "alasan": "grid bangunan provinsi ini belum dibuat", "sel_halus": []}
    sel, lat0, lon0 = B._indeks(prov, grid)
    t_all = titik_dalam(petak, lat0, lon0)
    n, luas = B.bangunan_di(prov, titik=t_all, keluar=grid)
    kini = None
    if segar:
        kini = B.bangunan_di(prov, titik=titik_dalam(segar, lat0, lon0), keluar=grid)[0]
    ids = sorted({(math.floor((la - lat0) * B.HALUS), math.floor((lo - lon0) * B.HALUS)) for lo, la in t_all})
    return {"terliput": True, "kumulatif": n, "kini": kini, "luas_atap_m2": luas,
            "sel_halus": [[i, j, sel[(i, j)][0], round(sel[(i, j)][1])] for i, j in ids if (i, j) in sel]}


def publik(h, hitung_utc, terpotong=False):
    if h["terliput"] and terpotong:      # arsip terpotong = petak lebih awal saja: bukan angka biasa, hanya batas bawah
        return {"terliput": True, "kumulatif": None, "kini": None, "luas_atap_m2": None, "alasan": "batas bawah, arsip terpotong", "hitung_utc": hitung_utc}
    if not h["terliput"]:
        return {"terliput": False, "kumulatif": None, "kini": None, "luas_atap_m2": None, "alasan": h["alasan"], "hitung_utc": hitung_utc}
    d = {"terliput": True, "kumulatif": angka_publik(h["kumulatif"]), "kini": angka_publik(h["kini"]), "luas_atap_m2": luas_publik(h["luas_atap_m2"]),
         "tampil": {"kumulatif": tampil(h["kumulatif"]), "kini": tampil(h["kini"])}, "hitung_utc": hitung_utc}
    if h["kini"] is None:
        d["kini_alasan"] = "tidak ada petak api segar"
    return d


def cakupan(grid=GRID):
    return sorted(os.path.basename(f)[6:-5] for f in glob.glob(os.path.join(grid, "halus_*.json")))


def petak_dari_arsip(a, sekarang_menit):
    """(petak VIIRS, petak segar). Segar = deteksi terakhir tercatat <= SEGAR_JAM (t_akhir; arsip lama tanpa t_akhir memakai t_pertama)."""
    pet = [p for p in a.get("petak", []) if len(p) >= 5]
    return pet, [p for p in pet if sekarang_menit - (p[5] if len(p) > 5 else p[2]) <= SEGAR_JAM * 60]


def main():
    sekarang = dt.datetime.now(dt.timezone.utc)
    hitung_utc = sekarang.strftime("%Y-%m-%dT%H:%MZ")
    sm = int((sekarang - ARSIP_DARI).total_seconds() // 60)
    try:
        ins = json.load(open(os.path.join(DATA, "insiden.json")))["insiden"]
    except Exception as e:
        print("paparan_insiden: insiden.json tak terbaca (%s), dilewati" % e)
        return
    os.makedirs(RINCI, exist_ok=True)
    out, n_pet = {}, 0
    for f in sorted(glob.glob(os.path.join(DATA, "progresi", "arsip", "*.json"))):
        iid = os.path.basename(f)[:-5]
        if (ins.get(iid) or {}).get("status") != "aktif":
            continue
        try:
            ar = json.load(open(f))
            pet, seg = petak_dari_arsip(ar, sm)
            if not pet:
                continue
            h = hitung_insiden(iid.split("-")[0], pet, seg)
        except Exception as e:
            print("::warning title=paparan_insiden::%s gagal (%s)" % (iid, e))
            continue
        out[iid] = publik(h, hitung_utc, bool(ar.get("terpotong")))
        n_pet += len(pet)
        if h["terliput"]:
            json.dump({"id": iid, "dibuat": hitung_utc, "provinsi": iid.split("-")[0], "petak": len(pet), "sel_halus": h["sel_halus"]},
                      open(os.path.join(RINCI, "bangunan_%s.json" % iid), "w"), separators=(",", ":"))
    doc = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds"),
           "sumber": "Google Open Buildings v3 (Sirko dkk. 2021)", "lisensi": "CC BY 4.0", "ambang_keyakinan": AMBANG_BANGUNAN, "radius_m": RADIUS_M,
           "definisi": "bangunan terdeteksi dalam 500 m dari pusat petak api 375 m; satu bangunan dihitung sekali per insiden",
           "galat_posisi_km": GALAT_HALUS_KM, "cakupan_provinsi": cakupan(), "insiden": out}
    with tempfile.NamedTemporaryFile("w", dir=DATA, delete=False, suffix=".tmp") as t:
        t.write(json.dumps(doc, ensure_ascii=False, separators=(",", ":")))
    os.replace(t.name, os.path.join(DATA, "insiden_bangunan.json"))
    print("paparan_insiden: %d insiden aktif, %d terliput, cakupan %s, %d petak" % (len(out), sum(1 for v in out.values() if v["terliput"]), doc["cakupan_provinsi"], n_pet))


# ---------------- uji ----------------
def uji():
    assert AMBANG_BANGUNAN == B.AMBANG_KEYAKINAN == 0.70
    # bulat dan tampil (Q6)
    assert tampil(3) == "kurang dari 5" and tampil(0) == "kurang dari 5" and tampil(87) == "sekitar 85" and tampil(88) == "sekitar 90" and tampil(5) == "sekitar 5"
    assert angka_publik(3) is None and angka_publik(87) == 85 and luas_publik(12449) == 12400 and luas_publik(12450) == 12500 and tampil(None) is None
    # jarak: tepat 0,500 km termasuk
    lat = -3.0
    dlon = 0.5 / (KM_LON * math.cos(math.radians(lat)))
    assert jarak_km(lat, 112.0, lat, 112.0 + dlon) <= RADIUS_KM + 1e-9
    petak = [(math.floor(lat / SEL_DEG), math.floor(112.0 / SEL_DEG))]
    la0, lo0 = pusat_petak(petak[0])
    # grid halus bentuk nyata: cells [[i, j, n, luas_m2]], lat0 -12, lon0 94, step 0,001
    h = B.HALUS
    def sel(dkm_lon, n, luas):
        lo = lo0 + dkm_lon / (KM_LON * math.cos(math.radians(la0)))
        return [math.floor((la0 + 0 - (-12.0)) * h), math.floor((lo - 94.0) * h), n, luas]
    cells = [sel(0.45, 10, 700), sel(0.60, 50, 3000), sel(0.0, 2, 100)]
    with tempfile.TemporaryDirectory() as g:
        json.dump({"prov": "62", "lat0": -12.0, "lon0": 94.0, "step": 0.001, "kolom": ["i", "j", "n", "luas_m2"], "cells": cells}, open(os.path.join(g, "halus_62.json"), "w"))
        r = hitung_insiden("62", petak, [], g)
        assert r["terliput"] and r["kumulatif"] == 12 and r["luas_atap_m2"] == 800, r          # 0,45 dan 0,0 km masuk; 0,60 km tidak
        assert r["kini"] is None, "tak ada petak segar: kini null, bukan 0"
        # dua petak bersebelahan berbagi sel: sekali, bukan dua kali
        tetangga = [petak[0], (petak[0][0], petak[0][1] + 1)]
        r2 = hitung_insiden("62", tetangga, tetangga, g)
        assert r2["kumulatif"] >= 12 and r2["kini"] == r2["kumulatif"], r2
        satu = hitung_insiden("62", petak, petak, g)
        assert satu["kumulatif"] == satu["kini"] == 12
        # titik berulang dalam satu sel tak menggandakan
        assert hitung_insiden("62", petak * 3, petak * 3, g)["kumulatif"] == 12
        # petak 501 m di luar tak menaikkan (pusat sel 0,60 km dari pusat petak, petak ditambah 501 m ke arah sana -> sel itu kini 0,10 km: dihitung; sebaliknya ke arah jauh tidak)
        jauh = [petak[0], (petak[0][0] + int(0.8 / KM_LAT / SEL_DEG), petak[0][1])]
        assert hitung_insiden("62", jauh, jauh, g)["kumulatif"] == 12
        # penentuan: dua kali hitung sama
        assert hitung_insiden("62", petak, petak, g) == satu
        # keluaran publik: tanpa kunci rinci, angka dibulatkan
        p = publik(satu, "x")
        assert set(p) == {"terliput", "kumulatif", "kini", "luas_atap_m2", "tampil", "hitung_utc"} and p["kumulatif"] == 10 and p["tampil"]["kumulatif"] == "sekitar 10", p
        assert not any(k in json.dumps(p) for k in ('"sel', '"lat"', '"lon"', '"kec"', '"desa"'))
        assert publik(r, "x")["kini"] is None and publik(r, "x")["kini_alasan"]
        assert cakupan(g) == ["62"]
    # provinsi tanpa grid: terliput:false, null, bukan 0
    with tempfile.TemporaryDirectory() as g:
        r = hitung_insiden("14", petak, petak, g)
        p = publik(r, "x")
        assert p["terliput"] is False and p["kumulatif"] is None and p["kini"] is None and p["luas_atap_m2"] is None and p["alasan"], p
    # arsip terpotong: null dengan alasan, bukan angka biasa
    pt = publik(satu, "x", True)
    assert pt["terliput"] is True and pt["kumulatif"] is None and pt["kini"] is None and pt["luas_atap_m2"] is None and "terpotong" in pt["alasan"] and "tampil" not in pt, pt
    # petak segar dari arsip: t_akhir, bukan t_pertama
    a = {"petak": [[1, 1, 100, 1.0, "N", 5000], [2, 2, 100, 1.0, "N", 100], [3, 3, 4900, 1.0, "N"]]}
    pet, seg = petak_dari_arsip(a, 5100)
    assert len(pet) == 3 and [s[0] for s in seg] == [1, 3], seg
    print("paparan_insiden uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] in (["--uji"], ["uji"]) else main()
