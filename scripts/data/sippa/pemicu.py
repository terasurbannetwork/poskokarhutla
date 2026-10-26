#!/usr/bin/env python3
"""SIPPA SP-023: tingkat pemicu harian per kabupaten (NORMAL, SIAGA, PRA-POSISI, GELAR). DT 3.1.6, 5.4, 7.2; PRD 9.4.4.

Masukan : data/sippa/keluaran/kelayakan_kompleks.json, public/data/{fwi_ansambel,iklim_outlook,titik24}.json
Keluaran: data/sippa/keluaran/pemicu.json
Pakai   : python3 pemicu.py [--keluar DIR]   |   python3 pemicu.py uji
Python 3.12 stdlib. Semua ambang asumsi-kebijakan, belum diuji balik. Ansambel atau titik24 lebih tua dari 36 jam: tingkat tidak naik ke PRA-POSISI/GELAR.
"""
import json, os, sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from respons import tingkat_pemicu, tampil

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PUB = os.path.join(AKAR, "public", "data")
KEL = os.path.join(AKAR, "data", "sippa", "keluaran")
WIB = timezone(timedelta(hours=7))
BASI_JAM = 36
SEL_SETENGAH = 0.25
MAKS = 8 * 1024 * 1024
AMBANG = {
    "anom_pct_siaga": {"nilai": -20, "keyakinan": "asumsi-kebijakan"},
    "ps_min": {"nilai": 0.5, "keyakinan": "asumsi-kebijakan"},
    "hari_ps_min": {"nilai": 3, "dari": 7, "keyakinan": "asumsi-kebijakan"},
    "titik_ab_min": {"nilai": 1, "terbakar_n_2km_min": 3, "keyakinan": "asumsi-kebijakan"},
    "basi_jam": {"nilai": BASI_JAM, "keyakinan": "asumsi-kebijakan"},
    "uji_balik": "belum diuji balik (uji balik musim 2027)",
}


def baca(*p):
    with open(os.path.join(*p)) as h:
        return json.load(h)


def umur_jam(iso, sekarang):
    return (sekarang - datetime.fromisoformat(iso)).total_seconds() / 3600


def wilayah_iklim(lat, lon, wilayah):
    """Kotak terkecil yang memuat titik; tidak ada = nasional (tanpa tabel provinsi tulisan tangan)."""
    cocok = [(((k["kotak"]["bujur"][1] - k["kotak"]["bujur"][0]) * (k["kotak"]["lintang"][1] - k["kotak"]["lintang"][0])), n)
             for n, k in wilayah.items() if n != "nasional"
             and k["kotak"]["bujur"][0] <= lon <= k["kotak"]["bujur"][1] and k["kotak"]["lintang"][0] <= lat <= k["kotak"]["lintang"][1]]
    return min(cocok)[1] if cocok else "nasional"


def anomali(outlook, w, sekarang):
    """Paling negatif di antara dua musim berbeda pertama dengan bulan_tengah >= bulan berjalan; hanya bila tampil."""
    bln = sekarang.strftime("%Y-%m")
    musim, pilih = [], []
    for p in outlook["prakiraan"]:
        if p["bulan_tengah"] < bln:
            continue
        if p["musim"] not in musim:
            if len(musim) == 2:
                break
            musim.append(p["musim"])
        e = p["wilayah"].get(w)
        if e and e.get("tampil") and e.get("anom_pct") is not None:
            pilih.append((e["anom_pct"], f"{p['musim']} {p['tahun']}", e.get("p10"), e.get("p90")))
    return min(pilih) if pilih else (None, None, None, None)


def hari_ps50(grid, titik):
    """Maksimum atas sel 0,5 derajat yang memuat tiap kompleks, dari hari dengan ps >= 0,5 (d = 0..6); tanpa sel = None."""
    hasil = None
    for lat, lon in titik:
        for s in grid:
            if abs(lat - s["lat"]) <= SEL_SETENGAH + 1e-9 and abs(lon - s["lon"]) <= SEL_SETENGAH + 1e-9:
                n = sum(1 for p in s["ps"][:7] if p >= AMBANG["ps_min"]["nilai"])
                hasil = n if hasil is None else max(hasil, n)
    return hasil


def alasan(r, basi_a, basi_t):
    a = []
    if r["anom_pct"] is not None:
        a.append(f"prakiraan {r['musim']} {r['wilayah_iklim'].replace('_', '-').title()} {tampil(r['anom_pct'])}% dari normal")
    if basi_a:
        a.append("data ansambel basi, PRA-POSISI dan GELAR tidak dihitung")
    elif r["hari_ps50"] is not None:
        a.append(f"P(FWI >= 14) >= 0,5 pada {r['hari_ps50']} dari 7 hari")
    if r["titik_panas_zona_ab"]:
        a.append(f"{r['titik_panas_zona_ab']} titik panas 24 jam di zona A/B" + (" (data titik basi)" if basi_t else ""))
    return a or ["tidak ada syarat siaga terpenuhi"]


def hitung(komp, ansambel, outlook, titik24, sekarang):
    basi_a = umur_jam(ansambel["dibuat"], sekarang) > BASI_JAM
    basi_t = umur_jam(titik24["acuan"], sekarang) > BASI_JAM
    kab = {}
    for k in komp:
        if k["zona_k"] in ("A", "B"):
            kab.setdefault((k["prov"], k["kab"]), []).append(k)
    per_laci = {}
    for t in titik24["titik"]:
        per_laci[titik24["laci"][t[2]]] = per_laci.get(titik24["laci"][t[2]], 0) + 1
    baris = []
    for (prov, nama), ks in sorted(kab.items()):
        lat = sum(k["lat"] for k in ks) / len(ks)
        lon = sum(k["lon"] for k in ks) / len(ks)
        w = wilayah_iklim(lat, lon, outlook["wilayah"])
        anom, musim, p10, p90 = anomali(outlook, w, sekarang)
        hp = hari_ps50(ansambel["grid"], [(k["lat"], k["lon"]) for k in ks])
        tab = sum(per_laci.get(k["id"], 0) for k in ks if k["terbakar_n_2km"] >= AMBANG["titik_ab_min"]["terbakar_n_2km_min"])
        r = {"prov": prov, "kab": nama, "tingkat": None, "wilayah_iklim": w, "musim": musim, "anom_pct": anom,
             "anom_p10": p10, "anom_p90": p90, "hari_ps50": hp, "titik_panas_zona_ab": tab, "alasan": None}
        r["tingkat"] = tingkat_pemicu({"anom_pct": anom, "hari_ps50": hp, "titik_ab": tab, "basi_ansambel": basi_a, "basi_titik": basi_t})
        r["alasan"] = alasan(r, basi_a, basi_t)
        baris.append(r)
    return baris, basi_a, basi_t


def susun(sekarang=None):
    sekarang = sekarang or datetime.now(WIB)
    kk = baca(KEL, "kelayakan_kompleks.json")
    ans, out, t24 = (baca(PUB, n + ".json") for n in ("fwi_ansambel", "iklim_outlook", "titik24"))
    baris, ba, bt = hitung(kk["kompleks"], ans, out, t24, sekarang)
    return {
        "dibuat": sekarang.strftime("%Y-%m-%dT%H:%M+07:00"), "per": kk["per"], "versi": "sippa_pemicu/1", "ambang": AMBANG,
        "sumber": [{"nama": n, "lisensi": "repo ini", "tarik": d} for n, d in
                   (("kelayakan_kompleks.json", kk["per"]), ("fwi_ansambel.json", ans["dibuat"]),
                    ("iklim_outlook.json", out["dibuat"]), ("titik24.json", t24["acuan"]))],
        "catatan": "Semua ambang asumsi-kebijakan dan belum diuji balik. Unit = kabupaten dengan >= 1 kompleks zona A atau B (versi k). "
                   "Ansambel atau titik24 lebih tua dari 36 jam: tingkat tidak naik ke PRA-POSISI/GELAR. Bukan perintah gelar; keputusan di staf.",
        "ansambel_dibuat": ans["dibuat"], "titik24_acuan": t24["acuan"], "basi": {"ansambel": ba, "titik24": bt}, "baris": baris,
    }


def uji():
    ko = lambda i, kab, lat, lon, z="A", n=0: {"id": i, "prov": "62", "kab": kab, "lat": lat, "lon": lon, "zona_k": z, "terbakar_n_2km": n}
    komp = [ko("K1", "X", -2.0, 113.0), ko("K2", "X", -2.1, 113.1, "B", 3), ko("K3", "Y", -3.0, 112.0, "D", 5), ko("K4", "Z", 4.0, 100.0, "A", 3),
            ko("K5", "X", -2.05, 113.05, "A", 2),
            ko("W1", "W", -1.95, 113.25), ko("W2", "W", -2.25, 113.55)]  # K5 n=2 di bawah ambang; W1/W2 0,3 derajat di luar sel (lat saja, lon saja)
    t0 = datetime(2026, 10, 26, 12, 0, tzinfo=WIB)
    ans = lambda dibuat, ps: {"dibuat": dibuat, "grid": [{"lat": -2.25, "lon": 113.25, "ps": ps}]}
    ps4 = [0.6, 0.5, 0.9, 0.7, 0.1, 0.0, 0.0]
    wil = {"kal": {"kotak": {"bujur": [108, 116], "lintang": [-4, 2]}}, "nasional": {"kotak": {"bujur": [90, 140], "lintang": [-11, 6]}}}
    pr = lambda m, bt, a, tpl=True: {"musim": m, "tahun": 2026, "bulan_tengah": bt,
                                     "wilayah": {"kal": {"anom_pct": a, "p10": a - 5, "p90": a + 5, "tampil": tpl}, "nasional": {"anom_pct": -1, "tampil": True}}}
    out = {"wilayah": wil, "prakiraan": [pr("ASO", "2026-09", -50), pr("SON", "2026-10", -29.5), pr("OND", "2026-11", -10), pr("NDJ", "2026-12", -90)]}
    t24 = lambda acuan: {"acuan": acuan, "laci": ["K1", "K2", "K3", "K5"], "titik": [[-2.0, 113.0, 0], [-2.1, 113.1, 1], [-3.0, 112.0, 2], [-2.05, 113.05, 3]]}
    segar, lama = "2026-10-26T06:00+07:00", "2026-10-24T06:00+07:00"
    h = lambda a, t: {r["kab"]: r for r in hitung(komp, a, out, t, t0)[0]}
    # segar semua: X = GELAR (hanya K2 terbakar >= 3 yang titiknya dihitung); Y zona D bukan unit; Z di luar sel ansambel dan anomali nasional ringan = NORMAL
    r = h(ans(segar, ps4), t24(segar))
    assert set(r) == {"X", "Z", "W"}, set(r)
    assert r["W"]["hari_ps50"] is None, r["W"]  # jendela sel +-0,25 ketat, termasuk tepat 0,25 (K1)
    assert r["X"]["tingkat"] == "GELAR" and r["X"]["hari_ps50"] == 4 and r["X"]["titik_panas_zona_ab"] == 1, r["X"]
    assert r["X"]["anom_pct"] == -29.5 and r["X"]["musim"] == "SON 2026" and r["X"]["anom_p10"] == -34.5, r["X"]
    assert r["Z"]["tingkat"] == "NORMAL" and r["Z"]["hari_ps50"] is None and r["Z"]["wilayah_iklim"] == "nasional", r["Z"]
    # ansambel basi (> 36 jam): tidak naik ke PRA-POSISI/GELAR
    rb = h(ans(lama, ps4), t24(segar))["X"]
    assert rb["tingkat"] == "SIAGA" and any("basi" in a for a in rb["alasan"]), rb
    # titik basi: berhenti di PRA-POSISI; tepat 36 jam belum basi
    assert h(ans(segar, ps4), t24(lama))["X"]["tingkat"] == "PRA-POSISI"
    assert h(ans("2026-10-25T00:00+07:00", ps4), t24(segar))["X"]["tingkat"] == "GELAR"
    # ps hanya 2 hari >= 0,5: SIAGA
    assert h(ans(segar, [0.6, 0.6, 0, 0, 0, 0, 0]), t24(segar))["X"]["tingkat"] == "SIAGA"
    # wilayah tidak tampil tidak dipakai; musim yang sudah lewat diabaikan
    out["prakiraan"][1] = pr("SON", "2026-10", -29.5, tpl=False)
    assert h(ans(segar, ps4), t24(segar))["X"]["tingkat"] == "NORMAL"
    assert anomali(out, "kal", t0)[0] == -10
    assert wilayah_iklim(-2, 113, wil) == "kal" and wilayah_iklim(50, 0, wil) == "nasional"
    # data nyata: invarian, bukan potret
    s = susun()
    kk = baca(KEL, "kelayakan_kompleks.json")["kompleks"]
    unit = {(k["prov"], k["kab"]) for k in kk if k["zona_k"] in ("A", "B")}
    assert {(b["prov"], b["kab"]) for b in s["baris"]} == unit and len(s["baris"]) == len(unit)
    assert all(b["tingkat"] in ("NORMAL", "SIAGA", "PRA-POSISI", "GELAR") and b["alasan"] for b in s["baris"])
    if s["basi"]["ansambel"]:
        assert all(b["tingkat"] in ("NORMAL", "SIAGA") for b in s["baris"]), "ansambel basi tetapi tingkat naik"
    assert s["ambang"]["uji_balik"].startswith("belum diuji balik")
    assert all(v["keyakinan"] == "asumsi-kebijakan" for v in s["ambang"].values() if isinstance(v, dict))
    assert len(json.dumps(s).encode()) <= MAKS
    print("uji pemicu: lolos")


def main(argv):
    keluar = argv[1] if argv[:1] == ["--keluar"] else KEL
    s = susun()
    teks = json.dumps(s, ensure_ascii=False, separators=(",", ":"))
    assert len(teks.encode()) <= MAKS, f"pemicu.json {len(teks.encode())} byte > 8 MB"
    os.makedirs(keluar, exist_ok=True)
    p = os.path.join(keluar, "pemicu.json")
    with open(p + ".tmp", "w") as h:
        h.write(teks)
    os.replace(p + ".tmp", p)
    n = {}
    for b in s["baris"]:
        n[b["tingkat"]] = n.get(b["tingkat"], 0) + 1
    print(f"pemicu.json {len(teks.encode())} byte; {len(s['baris'])} kabupaten {n}; basi {s['basi']}")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1:])
