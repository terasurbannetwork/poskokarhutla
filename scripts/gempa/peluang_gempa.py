"""Laju kejadian gempa 12 bulan + peluang susulan 7 hari -> public/gempa/data/peluang.json (peluang/1) dan laju.json.

Gempa utama tidak bisa diramal: yang jujur hanya laju jangka panjang (Poisson, P(>=1 dalam 12 bulan) = 1 - exp(-laju)) dan
peluang susulan dari model_susulan.json. Tempat dan waktu gempa utama berikutnya tidak diketahui.

Laju: katalog USGS yang sudah ditarik riwayat.py (riwayat_m5.json, M >= 5 sejak 1900), 1990-2025 (tahun penuh), setelah
declustering Gardner-Knopoff (riwayat.deklaster) supaya kejadian saling bebas (syarat Poisson). Dangkal = kedalaman <= 70 km.
Wilayah dengan n < 3 kejadian: peluang tidak ditampilkan (null), n tetap ditulis.
Uji balik: laju 1990-2015 diuji ke cacah nyata 2016-2025 (selang Poisson 90%).
Susulan: hanya target yang diterbitkan model_susulan.json (terbit_target); selebihnya null.

Pakai:  python3 scripts/gempa/peluang_gempa.py [tulis|uji]      (tulis memakai katalog() bila jaringan ada, tanpa jaringan: laju saja)
"""
import datetime as dt, importlib.util, json, math, os, sys

AKARGEMPA = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AKARGEMPA)
from umum import AKAR, KELUAR, simpan  # noqa: E402

_s = importlib.util.spec_from_file_location("peluang", os.path.join(AKAR, "scripts/umum/peluang.py"))
P = importlib.util.module_from_spec(_s)
_s.loader.exec_module(P)

TH0, TH_UJI0, TH1 = 1990, 2016, 2025  # latih 1990-2015, uji balik 2016-2025
DANGKAL_KM = 70
N_MIN = 3
AMBANG = [5, 6]  # magnitudo; M4+ dibuang: di bawah mc model susulan (4,7), tak pernah terisi
JENIS = [("m6", "gempa M6+", lambda e: e[4] >= 6), ("m7", "gempa M7+", lambda e: e[4] >= 7),
         ("m7d", "gempa M7+ dangkal", lambda e: e[4] >= 7 and e[3] <= DANGKAL_KM)]


ARAH = {"N": "utara", "NNE": "utara timur laut", "NE": "timur laut", "ENE": "timur timur laut", "E": "timur", "ESE": "timur tenggara",
        "SE": "tenggara", "SSE": "selatan tenggara", "S": "selatan", "SSW": "selatan barat daya", "SW": "barat daya",
        "WSW": "barat barat daya", "W": "barat", "WNW": "barat barat laut", "NW": "barat laut", "NNW": "utara barat laut"}


def tempat_id(place):
    """'119 km SSW of Gambiran Satu, Indonesia' -> '119 km selatan barat daya Gambiran Satu'; pola lain: buang ', Indonesia' saja."""
    import re
    t = re.sub(r",\s*Indonesia$", "", place or "")
    m = re.match(r"(\d+) km ([NSEW]{1,3}) of (.+)$", t)
    return f"{m.group(1)} km {ARAH[m.group(2)]} {m.group(3)}" if m and m.group(2) in ARAH else t


def teks_p(p):
    """Teks peluang: >= 0.995 ditulis ">99%" (bukan "100%"); nilai aslinya tetap disimpan."""
    return ">99%" if p is not None and p >= 0.995 else P.persen(p)


def poisson_p(lam):
    return 1 - math.exp(-lam)


def selang(lam, tingkat=0.90):
    """Selang Poisson sentral [lo, hi] untuk cacah: kuantil dari cdf."""
    def cdf(k):
        return sum(math.exp(-lam + i * math.log(lam) - math.lgamma(i + 1)) for i in range(k + 1)) if lam > 0 else 1.0
    a = (1 - tingkat) / 2
    lo = 0
    while cdf(lo) < a:
        lo += 1
    hi = lo
    while cdf(hi) < 1 - a:
        hi += 1
    return lo, hi


def deklaster_utama(baris):
    import riwayat
    ev = [(r[0], r[1], r[2], r[4]) for r in baris]
    u = riwayat.deklaster(ev)
    return [r for i, r in enumerate(baris) if i in u]


def hitung(utama, th0, th1, prov=None):
    """{kode_jenis: n} untuk tahun th0..th1, opsional satu provinsi."""
    out = {k: 0 for k, _, _ in JENIS}
    for e in utama:
        if th0 <= int(e[0][:4]) <= th1 and (prov is None or e[5] == prov):
            for k, _, f in JENIS:
                out[k] += f(e)
    return out


def laju(n, tahun):
    """Laju per tahun + peluang 12 bulan; peluang None bila n < N_MIN."""
    lam = n / tahun
    return {"n": n, "per_tahun": round(lam, 3), "p12": round(poisson_p(lam), 4) if n >= N_MIN else None,
            "p12_teks": teks_p(poisson_p(lam)) if n >= N_MIN else None}


def uji_balik(utama, kode_prov):
    lat, uji = TH_UJI0 - TH0, TH1 - TH_UJI0 + 1
    nas = {}
    for k, label, _ in JENIS:
        lam = hitung(utama, TH0, TH_UJI0 - 1)[k] / lat * uji
        amat = hitung(utama, TH_UJI0, TH1)[k]
        lo, hi = selang(lam)
        nas[k] = {"label": label, "harapan": round(lam, 2), "teramati": amat, "selang90": [lo, hi], "dalam_selang": lo <= amat <= hi}
    # cakupan lintas provinsi untuk M6+ (selang 90% -> diharapkan ~90% provinsi masuk bila Poisson sehat)
    ok = tot = 0
    for p in kode_prov:
        lam = hitung(utama, TH0, TH_UJI0 - 1, p)["m6"] / lat * uji
        if lam <= 0:
            continue
        lo, hi = selang(lam)
        tot += 1
        ok += lo <= hitung(utama, TH_UJI0, TH1, p)["m6"] <= hi
    return {"latih": f"{TH0}-{TH_UJI0 - 1}", "uji": f"{TH_UJI0}-{TH1}", "nasional": nas,
            "provinsi_m6": {"dalam_selang": ok, "dari": tot, "pecahan": round(ok / tot, 3) if tot else None}}


def vonis_laju(jenis_label, tempat, r):
    if r["p12"] is None:
        return f"Peluang {jenis_label} 12 bulan {tempat} tidak ditampilkan: hanya {r['n']} kejadian sejak {TH0}."
    return (f"Dalam 12 bulan, peluang {jenis_label} {tempat} {teks_p(r['p12'])}"
            f"{', tempatnya tidak bisa diketahui' if tempat.endswith('Indonesia') else ''}.")


def susulan_strip(mdl, ev, kini):
    """{kunci: wilayah} untuk gempa utama aktif (<= 7 hari) bila model susulan terbit. Hanya target terbit_target."""
    import susulan
    if not mdl.get("terbit"):
        return {}
    t_kini = susulan._hari(kini.strftime("%Y-%m-%dT%H:%M"))
    out = {}
    for i in susulan.gempa_utama(ev):
        e = ev[i]
        if not 0 <= t_kini - e["t"] <= susulan.H:
            continue
        hari = []
        for d in range(1, 8):
            tgl = (kini + dt.timedelta(days=d)).date()
            t0 = max(0.0, susulan._hari(tgl.isoformat() + "T00:00") - e["t"])
            ps = []
            for m, k in zip(AMBANG, ("m5", "m6")):
                ps.append(round(susulan.peluang(e["m"], t0, 1.0, m, mdl["param"])["p"], 4) if k and mdl["terbit_target"].get(k) else None)
            hari.append({"t": tgl.isoformat(), "p": ps, "p10": None, "p50": None, "p90": None})
        p5 = max((h["p"][0] for h in hari if h["p"][0] is not None), default=None)
        out[f"susulan:{e['w']}"] = {
            "nama": f"Susulan M {str(e['m']).replace('.', ',')} {tempat_id(e['place'])}", "tingkat": "titik", "hari": hari,
            "vonis": f"Dalam 7 hari ke depan, peluang susulan M5+ tertinggi {teks_p(p5)} per hari, menurun tiap hari." if p5 is not None else ""}
    return out


def bangun(baris, nama, mdl=None, ev=None, kini=None):
    kini = kini or dt.datetime.now(dt.timezone.utc)
    utama = deklaster_utama([r for r in baris if r[0][:4] >= str(TH0)])
    th = TH1 - TH0 + 1
    nas = {k: laju(hitung(utama, TH0, TH1)[k], th) for k, _, _ in JENIS}
    nas5 = laju(sum(1 for e in utama if e[4] >= 5 and TH0 <= int(e[0][:4]) <= TH1), th)
    kode = sorted({e[5] for e in utama if TH0 <= int(e[0][:4]) <= TH1})
    prov = {p: {k: laju(hitung(utama, TH0, TH1, p)[k], th) for k, _, _ in JENIS} for p in kode}
    ub = uji_balik(utama, kode)
    lab = {k: l for k, l, _ in JENIS}
    teratas = sorted(((p, r["m6"]["per_tahun"]) for p, r in prov.items()), key=lambda x: -x[1])[:5]
    laju_json = {"versi": 1, "dibuat": kini.strftime("%Y-%m-%dT%H:%MZ"), "periode": f"{TH0}-{TH1}", "tahun": th, "dangkal_km": DANGKAL_KM,
                 "n_min": N_MIN, "metode": "USGS M>=5, declustering Gardner-Knopoff, Poisson P(>=1 dalam 12 bulan) = 1 - exp(-laju)",
                 "nasional": nas, "provinsi": {p: {"nama": nama.get(p, p), **r} for p, r in prov.items()},
                 "teratas_m6": [{"prov": p, "nama": nama.get(p, p), "per_tahun": v} for p, v in teratas], "uji_balik": ub}
    # strip 7 hari: laju harian nasional (M5, M6) + susulan gempa utama aktif
    harian = [round(poisson_p(nas5["per_tahun"] / 365), 4), round(poisson_p(nas["m6"]["per_tahun"] / 365), 4)]
    hari0 = [{"t": (kini + dt.timedelta(days=d)).date().isoformat(), "p": harian, "p10": None, "p50": None, "p90": None}
             for d in range(1, 8)]
    vn = " ".join(vonis_laju(lab[k], "di Indonesia", nas[k]) for k in ("m7d", "m6"))
    wil = {"ID": {"nama": "Indonesia", "tingkat": "nasional", "hari": hari0, "vonis": vn}}
    for p, r in prov.items():
        if r["m6"]["p12"] is not None:
            wil[p] = {"nama": nama.get(p, p), "tingkat": "provinsi", "hari": hari0,
                      "vonis": vonis_laju(lab["m6"], "di " + nama.get(p, p), r["m6"]) + (" " + vonis_laju(lab["m7d"], "di " + nama.get(p, p), r["m7d"]) if r["m7d"]["p12"] is not None else "")}
    if mdl and ev is not None:
        wil.update(susulan_strip(mdl, ev, kini))
    cov = ub["provinsi_m6"]
    batasan = [
        "Gempa utama tidak bisa diramal: laju 12 bulan adalah rata-rata jangka panjang, bukan prakiraan tempat atau hari.",
        f"Laju dihitung dari USGS M5+ {TH0}-{TH1} setelah declustering; wilayah dengan kurang dari {N_MIN} kejadian tidak ditampilkan peluangnya.",
        "Wilayah Indonesia dan provinsi menampilkan laju latar jangka panjang (USGS, declustering Gardner-Knopoff), bukan prakiraan hari tertentu.",
        "Strip hari menunjukkan laju latar nasional; susulan hanya untuk target yang lolos validasi (M5+), M6+ tidak diterbitkan.",
        f"Uji balik laju {TH0}-{TH_UJI0 - 1} ke {TH_UJI0}-{TH1}: {sum(v['dalam_selang'] for v in ub['nasional'].values())} dari {len(ub['nasional'])} kelas nasional "
        f"dan {cov['dalam_selang']} dari {cov['dari']} provinsi (M6+) masuk selang 90%."]
    ambang = [{"k": f"m{m}", "label": f"Magnitudo {m} atau lebih", "nilai": m} for m in AMBANG]
    return P.berkas("gempa", "USGS, model susulan Reasenberg-Jones",
                    th, {"label": "Magnitudo", "satuan": "M", "desimal": 1}, ambang, wil, batasan, uji_balik=ub), laju_json


def jalan():
    baris = json.load(open(os.path.join(KELUAR, "riwayat_m5.json")))["baris"]
    nama = json.load(open(os.path.join(KELUAR, "riwayat_prov.json")))["nama"]
    mdl = json.load(open(os.path.join(KELUAR, "model_susulan.json")))
    try:
        import susulan
        ev = susulan.katalog()
    except Exception as x:  # tanpa jaringan: laju latar saja
        print("katalog susulan tak tersedia, strip susulan dilewati:", x)
        ev = None
    d, lj = bangun(baris, nama, mdl, ev)
    simpan(os.path.join(KELUAR, "peluang.json"), d)
    simpan(os.path.join(KELUAR, "laju.json"), lj)
    return d, lj


def uji():
    assert abs(poisson_p(math.log(2)) - 0.5) < 1e-12 and poisson_p(0) == 0
    assert selang(10)[0] <= 10 <= selang(10)[1] and selang(0.5)[0] == 0
    assert laju(2, 36)["p12"] is None and laju(36, 36)["p12"] == round(1 - math.exp(-1), 4)
    assert laju(300, 36)["p12"] >= 0.999 and laju(300, 36)["p12_teks"] == ">99%"
    # katalog sintetis: 2 M7 dangkal berdekatan (satu susulan GK), 1 M7 dalam, M6 di prov lain
    baris = [["1995-01-01T00:00", 0, 100, 10, 7.5, "11"], ["1995-01-02T00:00", 0, 100.1, 10, 7.0, "11"],
             ["2000-05-01T00:00", -5, 110, 150, 7.1, "32"], ["2001-05-01T00:00", -8, 120, 30, 6.2, "52"],
             ["2020-03-01T00:00", 5, 95, 20, 7.2, "11"]]
    d, lj = bangun(baris, {"11": "Aceh"}, kini=dt.datetime(2026, 10, 19, tzinfo=dt.timezone.utc))
    assert lj["nasional"]["m7"]["n"] == 3, lj["nasional"]  # susulan 1 hari dibuang
    assert lj["nasional"]["m7d"]["n"] == 2 and lj["nasional"]["m7d"]["p12"] is None  # n < 3
    assert teks_p(0.9999) == ">99%" and teks_p(0.994) == "99%" and "100%" not in json.dumps(d)
    assert tempat_id("119 km SSW of Gambiran Satu, Indonesia") == "119 km selatan barat daya Gambiran Satu" and tempat_id("Bali") == "Bali"
    assert P.periksa(d) == [] and len(d["wilayah"]["ID"]["hari"]) == 7
    print("peluang_gempa.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    else:
        d, lj = jalan()
        print(json.dumps(lj["nasional"]), "\n", json.dumps(lj["teratas_m6"]), "\n", json.dumps(lj["uji_balik"]))
        print(d["wilayah"]["ID"]["vonis"], "| wilayah:", len(d["wilayah"]))
