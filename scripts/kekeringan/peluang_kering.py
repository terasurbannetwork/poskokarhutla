"""Peluang kekeringan per provinsi/kabupaten -> public/banjir/data/kering_peluang.json (kontrak peluang/1).

BUKAN model kedua: prakiraan.py sudah menghitung peluang dari 51 anggota ensemble musiman ECMWF SEAS5 (SPI-3 <= -1 / -1,5 / -2 untuk
bulan +1..+3, dan HTH >= 31 / >= 61 hari dalam 90 hari). Berkas ini hanya membungkus public/data/kekeringan_prakiraan.json ke kontrak
bersama supaya layar bisa memakai komponen peluang yang sama. Tidak ada angka baru.

Pemetaan kontrak:
  besaran  = defisit hujan 3 bulan = -SPI-3 (satuan sigma), supaya ambang naik: 1 / 1,5 / 2  (= SPI-3 <= -1 / -1,5 / -2)
  "hari"   = satu entri per bulan target (bulan +1..+3); t = tanggal terakhir bulan itu (SPI-3 berakhir di bulan itu)
  p        = pk1/pk15/pk2 (% anggota SEAS5, berbobot penduduk di tingkat kabupaten/provinsi/nasional) / 100
  p50      = -median SPI-3 (rerata berbobot penduduk dari median per sel); p10/p90 tak tersedia di tingkat agregat -> null
  p_dasar  = peluang klimatologi (b1/b15/b2) per entri: SEAS5 mentah wajib dibaca SELISIHNYA terhadap p_dasar, bukan angkanya sendiri
  hth90    = peluang HTH >= 31 dan >= 61 hari dalam 90 hari sejak terbit (satu angka per wilayah, bukan per bulan)
Wilayah satu_titik (hanya diwakili satu titik SEAS5 2 derajat) dibuang, sama dengan laporan.py.

Pakai:  python3 scripts/kekeringan/peluang_kering.py        |  python3 scripts/kekeringan/peluang_kering.py uji
"""
import calendar
import datetime as dt
import importlib.util
import json
import os
import sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules[nama] = m
    s.loader.exec_module(m)
    return m


P = _muat("peluang_umum", "scripts/umum/peluang.py")
PROVINSI = _muat("wilayah_data_kering", "scripts/data/wilayah.py").PROVINSI
PRAKIRAAN = os.path.join(AKAR, "public/data/kekeringan_prakiraan.json")
UJIBALIK = os.path.join(AKAR, "public/data/kekeringan_ujibalik.json")
KELUAR = os.path.join(AKAR, "public/banjir/data/kering_peluang.json")
AMBANG = [{"k": "spi1", "label": "SPI-3 -1 atau lebih kering", "nilai": 1.0},
          {"k": "spi15", "label": "SPI-3 -1,5 atau lebih kering", "nilai": 1.5},
          {"k": "spi2", "label": "SPI-3 -2 atau lebih kering", "nilai": 2.0}]
BULAN = P.BULAN


def akhir_bulan(ym):
    y, m = (int(x) for x in ym.split("-"))
    return dt.date(y, m, calendar.monthrange(y, m)[1]).isoformat()


def bulan_teks(ym):
    y, m = (int(x) for x in ym.split("-"))
    return f"{BULAN[m - 1]} {y}"


def frac(x):
    return None if x is None else round(x / 100, 4)


def entri(bulan, lead):
    p = [frac(lead[k]) for k in ("pk1", "pk15", "pk2")]
    for i in range(1, 3):                    # pembulatan berbobot tak boleh membuat ambang parah lebih mungkin
        if p[i] is not None and p[i - 1] is not None and p[i] > p[i - 1]:
            p[i] = p[i - 1]
    return {"t": akhir_bulan(bulan), "p": p, "p10": None, "p50": None if lead.get("spi3") is None else round(-lead["spi3"], 2), "p90": None,
            "p_dasar": [frac(lead.get(k)) for k in ("b1", "b15", "b2")]}


def vonis_spi(nama, bulan, hari):
    """Satu kalimat pada ambang SPI-3 <= -1: peluang tertinggi dan pembandingnya (peluang normal), bukan peluang mentah sendirian."""
    ok = [(h, b) for h, b in zip(hari, bulan) if h["p"][0] is not None]
    if not ok:
        return ""
    h, b = max(ok, key=lambda x: x[0]["p"][0])
    p, dasar = h["p"][0], h["p_dasar"][0]
    kata = next(k for batas, k in P.KATA if p < batas)
    banding = "" if dasar is None else (f"; normalnya {P.persen(dasar)}, jadi " + ("lebih tinggi" if p > dasar + 0.005 else "lebih rendah" if p < dasar - 0.005 else "setara") + (" dengan" if abs(p - dasar) <= 0.005 else " dari") + " biasa")
    return (f"Dalam {len(hari)} bulan ke depan, bulan kering (SPI-3 -1 atau lebih kering) di {nama} {kata} terjadi: "
            f"peluang tertinggi {P.persen(p)}, pada {bulan_teks(b)}{banding}.")


def vonis_hth(nama, p31, p61):
    if p31 is None:
        return ""
    return (f"Dalam 90 hari ke depan, 31 hari atau lebih tanpa hujan beruntun di {nama} peluangnya {P.persen(frac(p31))} "
            f"(61 hari atau lebih: {P.persen(frac(p61))}); hujan harian model cenderung gerimis, jadi angka ini condong rendah.")


def wilayah(kode, nama, tingkat, r, bulan, **ekstra):
    nama = nama.replace("Kep. ", "Kepulauan ").replace(". ", " ")    # komponen layar memecah kalimat di '. '
    if r.get("satu_titik") or not r.get("lead") or any(l.get("pk1") is None for l in r["lead"]):
        return None
    hari = [entri(b, l) for b, l in zip(bulan, r["lead"])]
    w = {"nama": nama, "tingkat": tingkat, **ekstra, "hari": hari, "vonis": vonis_spi(nama, bulan, hari),
         "total_jiwa": r.get("total")}
    if r.get("p31") is not None:
        w["hth90"] = {"ambang_hari": [31, 61], "p": [frac(r["p31"]), frac(r["p61"])], "vonis": vonis_hth(nama, r["p31"], r["p61"])}
    return w


def uji_balik(ub):
    if not ub or not ub.get("prospek"):
        return None
    s = ub["prospek"]["semua"]
    return {"jenis": "model cadangan bersyarat ENSO, BUKAN SEAS5 (hindcast SEAS5 tidak tersedia lewat Open-Meteo)",
            "bulan_target": ub["prospek"].get("bulan_target"), "kejadian": ub["prospek"].get("kejadian"), "n": s["n"],
            "brier": s["brier"], "brier_klim": s["brier_klim"], "bss": s["bss"],
            "tangkapan_pct": s["tangkapan_pct"], "alarm_palsu_pct": s["alarm_palsu_pct"],
            "catatan": "BSS di bawah 0 berarti tidak lebih baik daripada klimatologi. Peluang SEAS5 di berkas ini belum teruji balik."}


def bangun(pra, ub=None):
    bulan = pra["bulan"]
    wil, dibuang = {}, 0
    nas = wilayah("nasional", "Indonesia", "nasional", pra["nasional"] or {}, bulan)
    if nas:
        wil["ID"] = nas
    for k, r in sorted(pra["prov"].items()):
        w = wilayah(k, PROVINSI.get(k, k), "provinsi", r, bulan, prov=k)
        if w:
            wil[k] = w
        else:
            dibuang += 1
    for k, r in sorted(pra["kab"].items(), key=lambda x: x[1].get("kode") or x[0]):
        prov, nama = k.split("|", 1)
        w = wilayah(r.get("kode"), nama, "kabupaten", r, bulan, prov=prov)
        if w and r.get("kode"):
            wil[r["kode"]] = w
        else:
            dibuang += 1
    cad = len(pra.get("cadangan") or {})
    batas = [
        "Peluang adalah pecahan 51 anggota ensemble musiman ECMWF SEAS5 (berbobot penduduk di tingkat wilayah), diambil apa adanya dari prakiraan.py; tidak dikoreksi bias karena hindcast SEAS5 tidak tersedia lewat Open-Meteo.",
        "Baca SELISIH terhadap p_dasar (peluang klimatologi, sekitar 15,9% / 6,7% / 2,3%), bukan angka mentah. " + (pra.get("bias") or {}).get("label", ""),
        "Belum teruji balik: yang teruji hanya model cadangan bersyarat ENSO (lihat uji_balik), dan itu tidak lebih baik daripada klimatologi.",
        "Skala 0,5 derajat dari titik SEAS5 2 derajat: wilayah yang hanya diwakili satu titik dibuang (" + str(dibuang) + " wilayah), sisanya tetap kasar untuk kabupaten kecil.",
        "HTH >= 31/61 hari dihitung dari hujan harian model yang cenderung gerimis, sehingga peluangnya condong rendah.",
        "Prakiraan musiman, bukan peringatan dini; status Waspada/Siaga resmi tetap dari BMKG.",
    ]
    if cad:
        batas.append(f"{cad} sel memakai prospek bersyarat fase ENSO (cadangan) karena SEAS5 tak tersedia di sel itu.")
    d = P.berkas("kekeringan", pra.get("sumber") or "ECMWF SEAS5 lewat Open-Meteo", 51,
                 {"label": "Defisit hujan 3 bulan (-SPI-3)", "satuan": "sigma", "desimal": 2}, AMBANG, wil, batas, uji_balik(ub))
    d["terbit"] = pra.get("terbit")
    d["dibuat_dari"] = pra.get("dibuat")
    return d


def simpan(jalur, obj):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def main():
    pra = json.load(open(PRAKIRAAN))
    if not pra.get("nasional") or not pra.get("prov") or not pra.get("bulan"):
        raise RuntimeError("kekeringan_prakiraan.json tanpa hasil SEAS5/cadangan; peluang dilewati")
    try:
        ub = json.load(open(UJIBALIK))
    except (OSError, ValueError):
        ub = None
    d = bangun(pra, ub)
    g = P.periksa(d)
    if g:
        raise RuntimeError("; ".join(g[:5]))
    simpan(KELUAR, d)
    print(f"peluang_kering: {len(d['wilayah'])} wilayah; {os.path.getsize(KELUAR) // 1024} KB", file=sys.stderr)


def uji():
    lead = lambda a, b, c, s: {"pk1": a, "pk15": b, "pk2": c, "spi3": s, "b1": 15.9, "b15": 6.7, "b2": 2.3}
    pra = {"bulan": ["2026-11", "2026-12", "2027-01"], "terbit": "2026-10-18", "dibuat": "x", "sumber": "uji", "bias": {"label": "belum diuji"},
           "nasional": {"total": 10, "satu_titik": False, "p31": 6.2, "p61": 1.0, "lead": [lead(20, 5, 1, -0.3), lead(60.4, 30, 10, -1.2), lead(10, 2, 0, 0.1)]},
           "prov": {"11": {"total": 5, "satu_titik": False, "p31": 0, "p61": 0, "lead": [lead(60, 30, 10, -1.5)] * 3},
                    "72": {"total": 5, "satu_titik": True, "lead": [lead(99, 30, 10, -1)] * 3}},
           "kab": {"11|Aceh Barat": {"kode": "1101", "total": 3, "satu_titik": False, "p31": 12, "p61": 3, "lead": [lead(30.0, 30.01, 0, 0), lead(0, 0, 0, 1), lead(1, 0, 0, 1)]}}}
    d = bangun(pra)
    assert P.periksa(d) == [] and set(d["wilayah"]) == {"ID", "11", "1101"}, list(d["wilayah"])   # 72 satu_titik dibuang
    n = d["wilayah"]["ID"]
    assert n["hari"][1]["t"] == "2026-12-31" and n["hari"][1]["p"] == [0.604, 0.3, 0.1] and n["hari"][1]["p50"] == 1.2
    assert "Desember 2026" in n["vonis"] and "60%" in n["vonis"] and "lebih tinggi" in n["vonis"], n["vonis"]
    assert d["wilayah"]["1101"]["hari"][0]["p"][1] <= d["wilayah"]["1101"]["hari"][0]["p"][0], "ambang parah tak boleh lebih mungkin"
    assert "6%" in n["hth90"]["vonis"] and "620" not in n["hth90"]["vonis"], n["hth90"]["vonis"]
    assert n["hth90"]["p"] == [0.062, 0.01]
    assert d["anggota"] == 51 and d["ambang"][0]["nilai"] == 1.0
    print("peluang_kering.py: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:2] == ["uji"] else main()
