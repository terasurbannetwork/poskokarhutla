"""Ringkasan rob 14 hari ke depan + posko pesisir terkait (Panel Presiden) -> public/banjir/data/rob_presiden.json

Tanpa panggilan jaringan: hanya menggabung berkas yang sudah ada.
- rob.json (rob.py): level model per titik per hari (lv 0-3, ambang p95/p99/amax iklim model sendiri), 3 hari lalu s.d. +9.
  Memakai rob.level(): 1 Waspada >= p95, 2 Siaga >= p99, 3 Awas >= max(p99+0,10 m, tertinggi teramati).
- pasang_astro.json (pasang_astro.py): indeks gaya pasang 0-1 (profil pantura/lain), 365 hari; "tinggi" bila g >= ambang
  profil (kuantil 0,85 seri 12 bulan). Menjangkau hari +10..+13 yang tak dicakup model laut, tapi BUKAN tinggi muka air.
- posko.json (posko.py): lapangan + kabupaten; posko terkait = kabupaten sama, bila tidak ada yang terdekat <= POSKO_KM.

Hari berisiko = lv >= 1 (model) ATAU pasang astro tinggi. Kabupaten tanpa hari berisiko tidak dimuat.

KONTRAK (rob_presiden/1):
{
 "versi": "rob_presiden/1", "dibuat": "ISO WIB", "mulai": "YYYY-MM-DD", "hari": 14,
 "sumber": ["rob.json ...", ...],
 "model_sampai": "YYYY-MM-DD"|null,   # hari terakhir rob.json; lv=null setelahnya
 "model_basi": bool,                  # True bila model_sampai < mulai (rob.json belum diperbarui: hanya astro yang terpakai)
 "ambang": {"lv": {"1": "...", "2": "...", "3": "..."}, "astro": {"pantura": 0.701, "lain": 0.6}, "posko_km": 50, "catatan": "..."},
 "kab": [ {                           # urut: lv_maks turun, lalu jumlah hari berisiko turun
    "prov": "Jawa Tengah", "kab": "Kota Semarang", "profil": "pantura"|"lain",
    "lv_maks": 0-3|null, "titik": n,
    "hari": [ {"tgl": "YYYY-MM-DD", "lv": 0-3|null, "gabung": 0|1|null, "g": 0-1, "astro_tinggi": bool, "puncak": bool} ],
         # hanya hari berisiko; puncak = hari dengan lv tertinggi (seri: g tertinggi) di kabupaten itu
    "posko": [ {"id": "T001", "tingkat": "lapangan"|"kabupaten", "nama": "Posko <kec>", "kab": "...", "lat": x, "lon": x,
                "km": jarak ke titik rob terdekat, "sekab": bool} ]   # maks 3, sekab dulu lalu km
 } ]
}
Pakai:  python3 scripts/banjir/rob_presiden.py   |  python3 scripts/banjir/rob_presiden.py uji
"""
import datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, WIB, baca, simpan
from rob import jarak_km, norm_kab, level

HARI = 14
POSKO_KM = 50
MAKS_POSKO = 3


def tambah(t, n):
    return (dt.date.fromisoformat(t) + dt.timedelta(days=n)).isoformat()


def susun(rob, astro, posko, mulai):
    profil_kab = {}
    for nama, p in astro["profil"].items():
        for k in p.get("titik", []):
            profil_kab[k] = nama
    t0 = dt.date.fromisoformat(astro["seri"]["t0"])
    tgl_model = rob["hari"]
    model_sampai = tgl_model[-1] if tgl_model else None
    semua_posko = [dict(p, tingkat="lapangan") for p in posko.get("lapangan", [])] + \
                  [dict(p, tingkat="kabupaten") for p in posko.get("kabupaten", [])]
    from wilayah import PROVINSI
    per_kab = {}
    for t in rob["titik"]:
        per_kab.setdefault((t["prov"], t["kab"]), []).append(t)
    keluar = []
    for (prov, kab), ts in per_kab.items():
        prof = profil_kab.get(f"{prov}|{kab}", "lain")
        amb = astro["pasang_tinggi"][prof]["ambang"]
        hari = []
        for i in range(HARI):
            tgl = tambah(mulai, i)
            lv = gb = None
            if tgl in tgl_model:
                j = tgl_model.index(tgl)
                ls = [level(t["h"][j], {"p95": t["p95"], "p99": t["p99"], "amax": t["amax"]}) for t in ts]
                ls = [x for x in ls if x is not None]
                lv = max(ls) if ls else None
                gs = [t["gabung"][j] for t in ts if t.get("gabung") and t["gabung"][j] is not None]
                gb = max(gs) if gs else None
            n = (dt.date.fromisoformat(tgl) - t0).days
            g = astro["seri"]["g"][prof][n] if 0 <= n < len(astro["seri"]["g"][prof]) else None
            tinggi = g is not None and g >= amb
            if (lv or 0) >= 1 or tinggi:
                hari.append({"tgl": tgl, "lv": lv, "gabung": gb, "g": g, "astro_tinggi": tinggi, "puncak": False})
        if not hari:
            continue
        kunci = lambda h: (h["lv"] or 0, h["g"] or 0)
        max(hari, key=kunci)["puncak"] = True
        lvs = [h["lv"] for h in hari if h["lv"] is not None]
        kode = [k for k, v in PROVINSI.items() if v == prov]
        nk = norm_kab(kab)
        kand = []
        for p in semua_posko:
            sekab = bool(kode) and p["prov"] == kode[0] and norm_kab(p["kab"]) == nk
            d = min(jarak_km(t["lat"], t["lon"], p["lat"], p["lon"]) for t in ts)
            if sekab or d <= POSKO_KM:
                kand.append({"id": p["id"], "tingkat": p["tingkat"], "nama": "Posko " + (p.get("kec") or p["kab"]), "kab": p["kab"],
                             "lat": p["lat"], "lon": p["lon"], "km": round(d, 1), "sekab": sekab})
        kand.sort(key=lambda x: (not x["sekab"], x["km"]))
        keluar.append({"prov": prov, "kab": kab, "profil": prof, "lv_maks": max(lvs) if lvs else None,
                       "titik": len(ts), "hari": hari, "posko": kand[:MAKS_POSKO]})
    keluar.sort(key=lambda k: (-(k["lv_maks"] or 0), -len(k["hari"])))
    return {
        "versi": "rob_presiden/1", "mulai": mulai, "hari": HARI,
        "sumber": ["rob.json (Open-Meteo Marine SMOC, ambang iklim model per titik)", "pasang_astro.json (gaya pasang astronomis)",
                   "posko.json (rekomendasi posko lapangan dan kabupaten)"],
        "model_sampai": model_sampai, "model_basi": bool(model_sampai and model_sampai < mulai),
        "ambang": {"lv": {"1": "Waspada: maks harian muka laut >= p95", "2": "Siaga: >= p99",
                          "3": "Awas: >= max(p99 + 0,10 m, tertinggi teramati)"},
                   "astro": {k: v["ambang"] for k, v in astro["pasang_tinggi"].items()},
                   "posko_km": POSKO_KM,
                   "catatan": rob["aturan"]["datum"] + ". Astro tinggi = gaya pasang >= kuantil 0,85 seri 12 bulan, bukan tinggi muka air."},
        "kab": keluar,
    }


def main():
    mulai = dt.datetime.now(WIB).date().isoformat()
    rob, astro, posko = (baca(os.path.join(KELUAR, f)) for f in ("rob.json", "pasang_astro.json", "posko.json"))
    if not (rob and astro and posko):
        sys.exit("rob_presiden: rob.json/pasang_astro.json/posko.json belum ada")
    out = susun(rob, astro, posko, mulai)
    out["dibuat"] = dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00")
    simpan(os.path.join(KELUAR, "rob_presiden.json"), out)
    print(f"rob_presiden: {len(out['kab'])} kabupaten berisiko, model_basi={out['model_basi']}")


def uji():
    astro = {"profil": {"pantura": {"titik": ["A|Kota X"]}, "lain": {"titik": []}}, "seri": {"t0": "2026-01-01",
             "g": {"pantura": [0.1, 0.9, 0.1, 0.1], "lain": [0.1, 0.1, 0.1, 0.1]}},
             "pasang_tinggi": {"pantura": {"ambang": 0.7}, "lain": {"ambang": 0.7}}}
    t = lambda kab, lat, h: {"prov": "DKI Jakarta", "kab": kab, "lat": lat, "lon": 106.8, "h": h, "p95": 1.0, "p99": 1.2,
                             "amax": 1.5, "gabung": [0, 0]}
    rob = {"hari": ["2026-01-01", "2026-01-02"], "aturan": {"datum": "d"},
           "titik": [t("Kota Adm. Jakarta Utara", -6.1, [0.5, 1.3]), t("Bekasi", -6.2, [0.5, 0.5])]}
    posko = {"lapangan": [{"id": "T1", "prov": "31", "kab": "Jakarta Utara", "kec": "Koja", "lat": -6.1, "lon": 106.9}],
             "kabupaten": [{"id": "K9", "prov": "99", "kab": "Jauh", "kec": "Z", "lat": 0, "lon": 100}]}
    o = susun(rob, astro, posko, "2026-01-01")
    assert [k["kab"] for k in o["kab"]] == ["Kota Adm. Jakarta Utara"], o["kab"]   # Bekasi tak berisiko
    k = o["kab"][0]
    assert k["lv_maks"] == 2 and k["profil"] == "lain" and [h["tgl"] for h in k["hari"]] == ["2026-01-02"], k
    assert k["hari"][0]["puncak"] and [p["id"] for p in k["posko"]] == ["T1"] and not o["model_basi"]
    o = susun(rob, dict(astro, profil={"pantura": {"titik": ["DKI Jakarta|Bekasi"]}, "lain": {"titik": []}}), posko, "2026-01-02")
    b = [x for x in o["kab"] if x["kab"] == "Bekasi"]
    assert b and b[0]["profil"] == "pantura" and b[0]["hari"][0]["astro_tinggi"] and b[0]["lv_maks"] == 0, o["kab"]
    assert susun(rob, astro, posko, "2026-02-01")["model_basi"]
    print("rob_presiden uji: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
