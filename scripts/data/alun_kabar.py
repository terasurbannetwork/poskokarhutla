"""Kabar Alun-alun: ekspor kejadian Laporan Harian BNPB + berita ke public/data/alun/kabar.json.

Paket data/kajian-bnpb/kabar-alun (KA-01..KA-04). Hanya stdlib. Kolom hanya daftar izin (KEAMANAN-PRIVASI);
teks bebas Koordalops, tangani, perhatian, label tidak pernah keluar. Status hanya dari data.json.
Pakai: python3 -I scripts/data/alun_kabar.py [--hari YYYY-MM-DD] [--kini ISO] | --cek
"""
import datetime as dt
import glob
import importlib.util
import json
import os
import re
import sys
import tempfile

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HARIAN = os.path.join(AKAR, "data/laporan-bnpb/harian")
KELUAR = os.path.join(AKAR, "public/data/alun/kabar.json")
MUNDUR = 8          # hari ke belakang (ALGORITMA 1.1)
MAKS_BERITA = 5
SELESAI_LAMA = 7    # [BAWAAN SEMENTARA] Q6
WIB = dt.timezone(dt.timedelta(hours=7))

# jenis harian -> (jenis Alun-alun, jenis cocok() di dalops_kabar atau None)
JENIS = {
    "banjir": ("banjir", "banjir"), "longsor": ("longsor", "longsor"),
    "gelombang_pasang": ("abrasi", "gelombang"), "angin": ("cuaca", "cuaca"), "cuaca": ("cuaca", "cuaca"),
    "kekeringan": ("kekeringan", "kekeringan"), "karhutla": ("karhutla", "karhutla"),
    "gempabumi": ("gempa", "gempa"), "erupsi": ("erupsi", "gunungapi"),
    "kebakaran_permukiman": ("kebakaran_gedung", "permukiman"), "lainnya": ("lainnya", None),
}


def _muat_modul(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules[nama] = m
    s.loader.exec_module(m)
    return m


def _geser(h, n):
    return (dt.date.fromisoformat(h) + dt.timedelta(days=n)).isoformat()


def angka_int(v, id_, kol, log):
    """float -> int hanya bila bulat; tidak ada -> None; pecahan -> None + satu baris log (ALGORITMA 6)."""
    if v is None:
        return None
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        log(f"angka bukan bilangan {id_} {kol}")
        return None
    if isinstance(v, int) or float(v).is_integer():
        return int(v)
    log(f"angka bukan bilangan bulat {id_} {kol}")
    return None


def baca_hari(harian, hari, mundur=MUNDUR):
    """-> daftar (tanggal, data) tua->baru; hari/folder yang tidak ada dilewati (ALGORITMA 1.1)."""
    out = []
    for n in range(mundur, -1, -1):
        t = _geser(hari, -n)
        pola = os.path.join(harian, t[:7], t, "kerja-*", "data.json")
        dok = []
        for fn in sorted(glob.glob(pola)):
            try:
                with open(fn, encoding="utf-8") as f:
                    dok.append(json.load(f))
            except (OSError, ValueError):
                continue
        pas = [d for d in dok if d.get("hari") == t] or dok[:1]
        if pas:
            out.append((t, pas[0]))
    return out


def kejadian_dari(harian_data, pusat_kab, log):
    """gabung hari tua->baru; kunci sama: tanggal terbaru menang; dobel dalam satu hari: yang pertama (dihitung)."""
    per, dobel = {}, 0
    for t, d in harian_data:
        lihat = set()
        for e in d.get("kejadian") or []:
            jenis_h = e.get("jenis")
            if jenis_h not in JENIS:
                continue
            kab, prov, mulai = e.get("lokasi") or "", str(e.get("prov") or ""), e.get("mulai") or t
            kode = f"{prov}|{kab}"
            kunci = f"{jenis_h}|{prov}|{kab}|{mulai}"
            if kunci in lihat:
                dobel += 1
                continue
            lihat.add(kunci)
            ada = bool(kab) and kode in pusat_kab    # kecocokan persis, tanpa tebakan (D5)
            a = e.get("angka") or {}
            per[kunci] = {
                "id": kunci, "jenis": JENIS[jenis_h][0], "kab": kab, "prov": prov,
                "kab_kode": kode if ada else None,
                "titik": {"lat": round(pusat_kab[kode][0], 4), "lon": round(pusat_kab[kode][1], 4)} if ada else None,
                "titik_ket": None if ada else "lokasi belum terpetakan",
                "status": e.get("status"), "baru": bool(e.get("baru")), "mulai": mulai,
                "lap_terakhir": t, "cutoff_terakhir": d.get("cutoff"), "selesai_lama": False,
                "angka": {k: angka_int(a.get(k), kunci, k, log) for k in ("kk", "mengungsi", "rumah_dampak")},
                "berita": [], "n_berita": 0, "catatan": None,
                "medsos": {"status": "belum_tersambung"},
                "_cocok": JENIS[jenis_h][1],
            }
    return per, dobel


def pasang_berita(per, hari, cocok, muat):
    """ALGORITMA 3: cocok() dari dalops_kabar; muat(jenis_cocok, hari) -> {artikel, gagal}."""
    cache = {}
    for k in per.values():
        jc = k.pop("_cocok")
        if not jc or not k["kab_kode"]:
            continue
        if jc not in cache:
            cache[jc] = muat(jc, hari)
        b = cache[jc]
        if not b or b.get("gagal") and not b.get("artikel"):
            k["catatan"] = "berita tidak terjangkau"
            continue
        kk = {"kab_kode": [k["kab_kode"]], "prov_kode": k["prov"], "terakhir": k["mulai"]}
        hit = sorted((a for a in b["artikel"] if cocok(kk, a, jc, hari)), key=lambda a: a.get("tgl") or "", reverse=True)
        # satu berita yang dimuat ulang beberapa media jaringan (judul sama) cukup tampil sekali, yang terbaru
        lihat, unik = set(), []
        for a in hit:
            j = re.sub(r"\W+", " ", re.sub(r"\s+-\s+[^-]{1,40}$", "", a.get("judul") or "")).strip().lower()
            if j and j in lihat:
                continue
            lihat.add(j); unik.append(a)
        hit = unik
        k["n_berita"] = len(hit)
        k["berita"] = [{"judul": a.get("judul"), "media": a.get("sumber"), "tgl": (a.get("tgl") or "")[:10], "url": a.get("url")}
                       for a in hit[:MAKS_BERITA]]


def bangun(hari, harian, pusat_kab, cocok, muat, kini, log=print):
    hd = baca_hari(harian, hari)
    per, dobel = kejadian_dari(hd, pusat_kab, log)
    pasang_berita(per, hari, cocok, muat)
    for k in per.values():
        k["selesai_lama"] = k["status"] == "selesai" and (dt.date.fromisoformat(hari) - dt.date.fromisoformat(k["lap_terakhir"])).days > SELESAI_LAMA
    cut = next((d.get("cutoff") for t, d in reversed(hd) if t == hari), None) or (hd[-1][1].get("cutoff") if hd else None)
    return {"versi": 1, "dibuat": kini, "hari": hari, "cutoff": cut,
            "kejadian": sorted(per.values(), key=lambda k: (k["mulai"], k["id"]), reverse=True)}, dobel


def tulis(dok, jalur):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    s = jalur + ".tmp"
    with open(s, "w", encoding="utf-8") as f:
        json.dump(dok, f, ensure_ascii=False, indent=1)
    os.replace(s, jalur)


# --------------------------------------------------------------- uji (tanpa jaringan)
def cek():
    DK = _muat_modul("dalops_kabar", "scripts/data/dalops_kabar.py")
    H = "2026-11-25"
    PUSAT = {"11|Kota Subulussalam": [2.6459123, 98.0121], "33|Kudus": [-6.8, 110.8]}
    tmp = tempfile.mkdtemp()

    def tulis_hari(t, kej, sub=None, cutoff=None):
        p = os.path.join(tmp, t[:7], t, sub or "kerja-" + t[8:] + "x")
        os.makedirs(p, exist_ok=True)
        with open(os.path.join(p, "data.json"), "w") as f:
            json.dump({"hari": t, "cutoff": cutoff or t + "T07:00+07:00", "kejadian": kej}, f)

    E = lambda jenis="banjir", lokasi="Kota Subulussalam", mulai="2026-11-19", status="berjalan", **x: {
        "jenis": jenis, "prov": "11", "lokasi": lokasi, "status": status, "baru": False, "mulai": mulai,
        "label": "RAHASIA", "tangani": True, "perhatian": True, "kondisi_pil": ["x"], "teks": {"kondisi": "Pak Budi 0812"},
        "angka": {"kk": 2659.0, "mengungsi": 18.0, "rumah_dampak": 2010.0, "lain": 5.0}, **x}
    A = lambda i, judul="Banjir Subulussalam", tgl="2026-11-24T10:00+07:00", kab=("11|Kota Subulussalam",), prov=("11",): {
        "id": f"a{i}", "judul": judul, "ringkas": "RINGKAS PANJANG " * 20, "sumber": f"Media{i}", "tgl": tgl,
        "kab": list(kab), "prov": list(prov), "url": f"https://x.id/{i}"}
    kosong = lambda j, h: {"artikel": [], "gagal": False}
    log = []
    B = lambda harian, muat=kosong, hari=H, pusat=PUSAT: bangun(hari, harian, pusat, DK.cocok, muat, "2026-11-25T14:10+07:00", log.append)[0]
    ada = lambda d: {k["id"]: k for k in d["kejadian"]}

    # P1 + P16 + P10: 24 Nov tidak ada folder, kerja-DDMMYY ditemukan lewat glob
    tulis_hari(H, [E()], sub="kerja-251126")
    d = B(tmp)
    k = d["kejadian"][0]
    assert k["kab_kode"] == "11|Kota Subulussalam" and k["titik"] == {"lat": 2.6459, "lon": 98.0121} and k["titik_ket"] is None, k
    assert k["lap_terakhir"] == H and d["cutoff"] == H + "T07:00+07:00"
    # P10: daftar izin, tidak ada kunci terlarang di mana pun
    IZIN = {"id", "jenis", "kab", "prov", "kab_kode", "titik", "titik_ket", "status", "baru", "mulai", "lap_terakhir",
            "cutoff_terakhir", "selesai_lama", "angka", "berita", "n_berita", "catatan", "medsos"}
    assert set(k) == IZIN and set(k["angka"]) == {"kk", "mengungsi", "rumah_dampak"}, set(k) ^ IZIN
    for kunci in ("teks", "tangani", "perhatian", "label", "kondisi_pil"):
        assert f'"{kunci}"' not in json.dumps(d), kunci
    assert "RAHASIA" not in json.dumps(d) and "Budi" not in json.dumps(d)
    # P2 lokasi tak cocok persis (tanpa tebakan)
    tulis_hari(H, [E(lokasi="Subulussalam"), E(jenis="lainnya", lokasi="")], sub="kerja-251126")
    d = B(tmp, muat=lambda j, h: 1 / 0)    # muat tidak boleh dipanggil tanpa kab_kode
    for k in d["kejadian"]:
        assert k["kab_kode"] is None and k["titik"] is None and k["titik_ket"] == "lokasi belum terpetakan" and k["berita"] == [], k
    # P3 angin dan cuaca, kab sama, mulai sama
    tulis_hari(H, [E("angin"), E("cuaca")], sub="kerja-251126")
    d = B(tmp)
    assert len(d["kejadian"]) == 2 and {k["jenis"] for k in d["kejadian"]} == {"cuaca"} and len({k["id"] for k in d["kejadian"]}) == 2
    # P4 duplikat satu hari: satu baris, pencacah naik
    tulis_hari(H, [E(), E(angka={"kk": 1.0})], sub="kerja-251126")
    d, dobel = bangun(H, tmp, PUSAT, DK.cocok, kosong, "x", log.append)
    assert len(d["kejadian"]) == 1 and dobel == 1 and d["kejadian"][0]["angka"]["kk"] == 2659   # yang pertama dipakai
    # P8 angka
    n0 = len(log)
    tulis_hari(H, [E(angka={"kk": 2659.0}), E(lokasi="Aceh Singkil", angka={"kk": 2659.5}), E(lokasi="Gayo Lues", angka={}),
                   E(lokasi="Kota Padang", angka={"kk": 0.0})], sub="kerja-251126")
    d = B(tmp)
    kk = {k["kab"]: k["angka"]["kk"] for k in d["kejadian"]}
    assert kk == {"Kota Subulussalam": 2659, "Aceh Singkil": None, "Gayo Lues": None, "Kota Padang": 0}, kk
    assert isinstance(kk["Kota Subulussalam"], int) and len(log) - n0 == 1 and "bukan bilangan bulat" in log[-1], log[n0:]
    # P5/P6/P7/P12 berita
    tulis_hari(H, [E()], sub="kerja-251126")
    art = [A(i, judul=f"Banjir Subulussalam hari ke-{i}", tgl=f"2026-11-{20 + i % 5}T10:00+07:00") for i in range(7)] + [A(9, kab=(), prov=("11",)), A(10, judul="Gempa di Subulussalam", tgl="2026-11-24T00:00+07:00")]
    muat = lambda j, h: {"artikel": art, "gagal": False}
    k = B(tmp, muat)["kejadian"][0]
    assert k["n_berita"] == 7 and len(k["berita"]) == 5, (k["n_berita"], len(k["berita"]))
    assert [b["tgl"] for b in k["berita"]] == sorted((b["tgl"] for b in k["berita"]), reverse=True)
    assert all(set(b) == {"judul", "media", "tgl", "url"} and b["media"].startswith("Media") for b in k["berita"])   # P12
    assert all(b["tgl"] <= H for b in k["berita"]) and "RINGKAS" not in json.dumps(k)
    # judul sama dari media satu jaringan ("... - TIMES Jatim", "... - TIMES Pacitan") tampil sekali
    kembar = [A(20, judul="Banjir Subulussalam meluas - TIMES Jatim"), A(21, judul="Banjir Subulussalam meluas - TIMES Aceh")]
    k2 = B(tmp, lambda j, h: {"artikel": kembar, "gagal": False})["kejadian"][0]
    assert k2["n_berita"] == 1 and len(k2["berita"]) == 1, k2["n_berita"]
    k = B(tmp, lambda j, h: {"artikel": [], "gagal": True})["kejadian"][0]   # P7
    assert k["berita"] == [] and k["catatan"] == "berita tidak terjangkau" and k["n_berita"] == 0
    # P9 selesai_lama + P15 hari lain, kunci sama
    tulis_hari("2026-11-17", [E(status="selesai", mulai="2026-11-10"), E("longsor", status="berjalan", mulai="2026-11-10"),
                              E(lokasi="Kudus", status="selesai", mulai="2026-11-10")] , cutoff="2026-11-17T07:00+07:00")
    tulis_hari("2026-11-20", [E(lokasi="Kudus", status="selesai", mulai="2026-11-10")], cutoff="2026-11-20T07:00+07:00")
    tulis_hari("2026-11-21", [E(lokasi="Kudus", status="berjalan", mulai="2026-11-10")], cutoff="2026-11-21T07:00+07:00")
    d = B(tmp)
    m = ada(d)
    s9 = m["banjir|11|Kota Subulussalam|2026-11-10"]
    assert s9["lap_terakhir"] == "2026-11-17" and s9["selesai_lama"] is True       # 8 hari (batas jendela baca)
    assert m["longsor|11|Kota Subulussalam|2026-11-10"]["selesai_lama"] is False    # bukan selesai
    # Kudus: terbaru (21 Nov, berjalan) menang atas 20 Nov selesai dan 16 Nov
    kd = m["banjir|11|Kudus|2026-11-10"]
    assert kd["lap_terakhir"] == "2026-11-21" and kd["cutoff_terakhir"] == "2026-11-21T07:00+07:00" and kd["status"] == "berjalan"
    tulis_hari("2026-11-20", [E(status="selesai", mulai="2026-11-10")], cutoff="2026-11-20T07:00+07:00")
    os.remove(os.path.join(tmp, "2026-11", "2026-11-21", "kerja-21x", "data.json"))
    m = ada(B(tmp))
    assert m["banjir|11|Kota Subulussalam|2026-11-10"]["selesai_lama"] is False and m["banjir|11|Kota Subulussalam|2026-11-10"]["lap_terakhir"] == "2026-11-20"  # 5 hari
    assert m["banjir|11|Kudus|2026-11-10"]["selesai_lama"] is True and m["banjir|11|Kudus|2026-11-10"]["lap_terakhir"] == "2026-11-17"
    # sebelum jendela 8 hari: tidak dibaca
    tulis_hari("2026-11-10", [E(lokasi="Kudus", mulai="2026-11-01")])
    assert "banjir|11|Kudus|2026-11-01" not in ada(B(tmp))
    # P11 string buatan kita: tanpa "aman" dan tanpa @akun; P13 medsos
    for k in d["kejadian"]:
        for s in (k["status"], k["titik_ket"], k["catatan"], k["medsos"]["status"], k["jenis"]):
            assert not re.search(r"\baman\b|@\w", s or "", re.I), s
        assert k["medsos"] == {"status": "belum_tersambung"}
    # P14 determinisme: dua jalan, byte sama
    a, b = os.path.join(tmp, "o1.json"), os.path.join(tmp, "o2.json")
    tulis(B(tmp, muat), a)
    tulis(B(tmp, muat), b)
    assert open(a, "rb").read() == open(b, "rb").read() and json.load(open(a))["dibuat"] == "2026-11-25T14:10+07:00"
    print("alun_kabar --cek: P1 P2 P3 P4 P5 P6 P7 P8 P9 P10 P11 P12 P13 P14 P15 P16 hijau")


def main(argv):
    if "--cek" in argv:
        return cek()
    arg = lambda n, d=None: argv[argv.index(n) + 1] if n in argv else d
    hari = arg("--hari") or dt.datetime.now(WIB).date().isoformat()
    kini = arg("--kini") or dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00")
    DK = _muat_modul("dalops_kabar", "scripts/data/dalops_kabar.py")
    pusat = _muat_modul("berita_geo", "scripts/umum/berita.py").Geo.hitung_pusat()["kab"]
    dok, dobel = bangun(hari, HARIAN, pusat, DK.cocok, DK.muat_bahan, kini)
    tulis(dok, KELUAR)
    kej = dok["kejadian"]
    print(f"alun_kabar {hari}: {len(kej)} kejadian, {sum(1 for k in kej if k['titik'])} bertitik, "
          f"{sum(1 for k in kej if not k['titik'])} tanpa titik, {sum(1 for k in kej if k['berita'])} berberita, dobel {dobel} -> {KELUAR}")


if __name__ == "__main__":
    main(sys.argv[1:])
