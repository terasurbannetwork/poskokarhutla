"""Laporan harian udara (kontrak v1 docs/multi-bencana/LAPORAN-HARIAN.md) -> public/udara/data/laporan.json lewat scripts/umum/laporan.py

Hari    : riwayat r24 per kab/kota (data/raw/udara/r24_kota.json, analisis CAMS 31 hari yang ditimpa tiap jalan, maks 60 hari)
          + hari ini dari prakiraan.json. Satu sumber untuk semua hari supaya nasional, provinsi, dan kab/kota konsisten.
          (udara_kualitas_riwayat.json tidak dipakai: per sel 1 derajat, bukan per kab/kota, dan di produksi baru 2 hari.)
Metrik  : jiwa di kab/kota berstatus Tidak sehat+ (utama), PM2,5 rata-rata berbobot jiwa, jumlah kab/kota Sangat tidak sehat+.
"""
import datetime as dt
import importlib.util
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

_s = importlib.util.spec_from_file_location("umum_laporan", os.path.join(alat.AKAR, "scripts/umum/laporan.py"))
lap = importlib.util.module_from_spec(_s)
_s.loader.exec_module(lap)

MAKS_HARI = 60
METRIK = [
    {"k": "jiwa_tidak_sehat", "label": "Jiwa di Waspada (Tidak sehat) atau lebih", "satuan": "jiwa", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
    {"k": "pm_jiwa", "label": "PM2,5 berbobot jiwa", "satuan": "µg/m³", "agregat": "rerata", "arah": "naik_buruk", "desimal": 0},
    {"k": "kota_siaga", "label": "Kab/kota Siaga (Sangat tidak sehat) atau lebih", "satuan": "kab/kota", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
]
TINGKAT = {"awas": 0, "siaga": 1}
LABEL = {"awas": "Awas (Berbahaya)", "siaga": "Siaga (Sangat tidak sehat)", "waspada": "Waspada (Tidak sehat)", "normal": "Normal"}
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def tgl_pendek(iso):
    d = dt.date.fromisoformat(iso)
    return f"{d.day} {BULAN[d.month - 1]}"


def porsi(b):
    """'sekitar 46% (30 sampai 61%)'; rentang 0 sampai >= 80 terlalu lebar untuk angka tengah: hanya rentang."""
    r = f"{b['rendah']} sampai {b['tinggi']}%"
    return r if b["rendah"] == 0 and b["tinggi"] >= 80 else f"sekitar {b['persen']}% ({r})"


def label_model(prak):
    return "perkiraan model, belum dikoreksi" if prak.get("koreksi", {}).get("status") != "terkoreksi" else "perkiraan model, terkoreksi stasiun"
NEGARA_TAMPIL = {"Malaysia": "Malaysia", "Singapura": "Singapura", "Brunei": "Brunei", "Timor Leste": "Timor Leste", "Papua Nugini": "Papua Nugini"}


def angka(x):
    return f"{x:,.0f}".replace(",", ".")


def seri(kota, r24, hari):
    """kota [{kode, prov, jiwa}], r24 {kode: {tgl: v}} -> (nasional, prov, kab)."""
    n = len(hari)
    nol = lambda: {"jiwa_tidak_sehat": [0] * n, "_pmj": [0.0] * n, "_j": [0] * n, "kota_siaga": [0] * n}
    nas, prov, kab = nol(), {}, []
    for k in kota:
        d = r24.get(k["kode"], {})
        v = [d.get(h) for h in hari]
        if all(x is None for x in v):
            continue
        P = prov.setdefault(k["prov"], nol())
        o = {"prov": k["prov"], "kode": k["kode"], "nama": k["nama"], "jiwa_tidak_sehat": [], "pm_jiwa": [], "kota_siaga": []}
        for i, x in enumerate(v):
            if x is None:
                for f in ("jiwa_tidak_sehat", "pm_jiwa", "kota_siaga"):
                    o[f].append(None)
                continue
            st = alat.status(round(x))   # status dari nilai yang tampil (dibulatkan)
            o["jiwa_tidak_sehat"].append(k["jiwa"] if st != "normal" else 0)
            o["pm_jiwa"].append(x)
            o["kota_siaga"].append(1 if st in ("siaga", "awas") else 0)
            for T in (nas, P):
                T["jiwa_tidak_sehat"][i] += o["jiwa_tidak_sehat"][i]
                T["kota_siaga"][i] += o["kota_siaga"][i]
                T["_pmj"][i] += x * k["jiwa"]
                T["_j"][i] += k["jiwa"]
        if any(x for x in o["jiwa_tidak_sehat"] if x):
            kab.append(o)

    def akhir(T):
        T["pm_jiwa"] = [T["_pmj"][i] / T["_j"][i] if T["_j"][i] else None for i in range(n)]
        del T["_pmj"], T["_j"]
        return T

    return akhir(nas), {p: akhir(T) for p, T in prov.items()}, kab


def sorot(prak, lint, atr):
    sumber = {b["kode"]: b["bagian"] for b in atr.get("kota", [])}
    calon = [k for k in prak["kota"] if k["st"][0] in TINGKAT or k["st"][1] in TINGKAT]
    calon.sort(key=lambda k: -max(k["r24"][:2]))
    out = []
    for k in calon[:6]:
        tk = min((s for s in k["st"][:2] if s in TINGKAT), key=TINGKAT.get)
        teks = f"PM2,5 rata-rata 24 jam {angka(k['r24'][0])} µg/m³ hari ini dan {angka(k['r24'][1])} µg/m³ besok (CAMS; {label_model(prak)})."
        api = [b for b in sumber.get(k["kode"], []) if b["jenis"] == "api"]
        if api:
            teks += f" Sumber api terbesar besok: {api[0]['nama']}, {porsi(api[0])}."
        out.append({"tingkat": tk, "judul": f"{k['nama']}: {LABEL[tk]}", "teks": teks,
                    "prov": k["prov"], "tautan": f"/udara/?kota={k['kode']}"})
    kmp = {c["id"]: c for c in lint.get("kompleks", [])}
    sudah = set()
    for lb in lint.get("lintas_batas", []):
        if lb["negara"] in sudah or len(out) >= 8:
            continue
        sudah.add(lb["negara"])
        c = kmp.get(lb["kompleks"], {})
        out.append({"tingkat": "info", "judul": f"Asap berpotensi melintas ke {NEGARA_TAMPIL.get(lb['negara'], lb['negara'])}",
                    "teks": f"Jalur angin 72 jam dari kompleks api {c.get('kab') or lb['kompleks']} masuk wilayah {lb['negara']} sekitar {lb['jam']} jam lagi.",
                    "prov": c.get("prov") if c.get("prov") in lap.PROVINSI else None, "tautan": f"/udara/?kompleks={lb['kompleks']}"})
        if len(sudah) >= 2:
            break
    return out


def susun(kota, r24, prak, lint, atr, ren):
    h0 = prak["hari"][0]
    r24 = {k: dict(v) for k, v in r24.items()}
    for k in prak["kota"]:
        r24.setdefault(k["kode"], {})[h0] = k["r24"][0]
    hari = sorted({h for d in r24.values() for h in d if h <= h0})[-MAKS_HARI:]
    if len(hari) < 7:
        raise ValueError(f"riwayat hanya {len(hari)} hari, laporan butuh >= 7")
    nas, prov, kab = seri(kota, r24, hari)
    top = sorted(prak["kota"], key=lambda k: -max(k["r24"]))[:10]
    prakiraan = {"judul": f"PM2,5 rata-rata 24 jam, kab/kota terburuk ({label_model(prak)})", "hari": prak["hari"],
                 "baris": [{"label": k["nama"], "prov": k["prov"], "nilai": k["r24"], "satuan": "µg/m³"} for k in top]}
    tambahan = []
    at = sorted((b for b in atr.get("kota", []) if b.get("terpercaya", True) and b["bagian"]), key=lambda b: -b["pm"])[:10]
    if at:
        bar = []
        for b in at:
            s = next((x for x in b["bagian"] if x["jenis"] not in ("latar", "lain")), None)
            lebar = s and s["rendah"] == 0 and s["tinggi"] >= 80
            bar.append([b["nama"], b["pm"], s["nama"] if s else "Latar", None if not s or lebar else s["persen"],
                        f"{s['rendah']} sampai {s['tinggi']}" if s else None])
        hr = atr.get("hari")
        tambahan.append({"id": "atribusi", "judul": f"Sumber asap terbesar per kab/kota, {tgl_pendek(hr) if hr else 'besok'}",
                         "kolom": ["Kab/kota", "PM2,5 (µg/m³)", "Sumber teratas", "Porsi (%)", "Rentang (%)"], "baris": bar,
                         "catatan": f"{label_model(prak).capitalize()}. Model plume sederhana; hanya kab/kota yang model-nya tak melebihi 1,5× CAMS; "
                                    "rentang dari uji sensitivitas sebaran, emisi, dan normalisasi; porsi kosong bila rentang 0 sampai 80% atau lebih."})
    bd = ren.get("bandara", [])[:10]
    if bd:
        tambahan.append({"id": "bandara", "judul": "Jarak pandang bandara", "kolom": ["Bandara", "Kini (km)", "Hari ini (km)", "Besok (km)", "Lusa (km)"],
                         "baris": [[f"{b['nama']} ({b['icao']})", b["vis_km"], *b["prakiraan_km"]] for b in bd],
                         "catatan": f"Kini dari METAR; prakiraan dari PM2,5 rata-rata 24 jam (Koschmieder, {label_model(prak)}), belum diuji terhadap METAR."})
    cut = prak.get("jalan_model") or prak["dibuat"]
    cutoff = alat.dari_iso(cut).astimezone(alat.WIB).strftime("%Y-%m-%dT%H:%M+07:00")
    return lap.susun("udara", "Laporan Harian Kualitas Udara", hari, METRIK, nas, prov, kab, cutoff=cutoff,
                     hari_lengkap=hari[-2], sorot=sorot(prak, lint, atr), prakiraan=prakiraan, tambahan=tambahan,
                     sumber=[{"nama": "CAMS (Copernicus Atmosphere Monitoring Service) via Open-Meteo", "url": "https://open-meteo.com/en/docs/air-quality-api", "catatan": "PM2,5 per jam, perkiraan model ~40 km, bukan ISPU resmi KLHK"},
                             {"nama": "Open-Meteo Forecast", "url": "https://open-meteo.com/en/docs", "catatan": "angin 10 m/925/850 hPa, tinggi lapisan batas"},
                             {"nama": "NASA FIRMS (VIIRS) lewat kompleks api Pantau Bencana", "url": "https://firms.modaps.eosdis.nasa.gov", "catatan": "titik panas dan FRP"},
                             {"nama": "WRI Global Power Plant Database v1.3", "url": "https://github.com/wri/global-power-plant-database", "catatan": "PLTU batu bara (CC BY 4.0)"},
                             {"nama": "METAR via Iowa Environmental Mesonet", "url": "https://mesonet.agron.iastate.edu", "catatan": "jarak pandang dan cuaca bandara, uji galat model"},
                             {"nama": "WorldPop 2026", "url": "https://www.worldpop.org", "catatan": "penduduk 1 km (CC BY 4.0)"},
                             {"nama": "Kepmendagri 300.2.2-2138/2025", "url": "https://github.com/cahyadsn/wilayah", "catatan": "kode kab/kota"},
                             {"nama": "Permen LHK P.14/2020", "catatan": "titik potong kategori ISPU PM2,5"}])


def main():
    d = susun(alat.kota(), alat.muat(os.path.join(alat.RAW, "r24_kota.json")), alat.keluaran("prakiraan.json"),
              alat.keluaran("lintasan.json", {}), alat.keluaran("atribusi.json", {}), alat.keluaran("rentan.json", {}))
    p = lap.tulis("udara", d)
    alat.log(f"laporan.json: {os.path.getsize(p) // 1024} KB, {len(d['hari'])} hari, {len(d['kab'])} kab/kota, sorot {len(d['sorot'])}")


def uji():
    hari = [(dt.date(2026, 10, 1) + dt.timedelta(days=i)).isoformat() for i in range(10)]
    kota = [{"kode": "1671", "nama": "Kota Palembang", "prov": "16", "jiwa": 1000}, {"kode": "1601", "nama": "Kab. OKU", "prov": "16", "jiwa": 3000},
            {"kode": "6271", "nama": "Kota Palangkaraya", "prov": "62", "jiwa": 500}]
    r24 = {"1671": {h: 160.0 for h in hari[:9]}, "1601": {h: 20.0 for h in hari[:9]}, "6271": {h: 60.0 for h in hari[2:9]}}
    prak = {"hari": [hari[9], "2026-10-11", "2026-10-12"], "dibuat": "2026-10-10T03:00Z", "jalan_model": "2026-10-10T00:00Z",
            "kota": [{"kode": "1671", "nama": "Kota Palembang", "prov": "16", "r24": [300, 200, 50], "st": ["awas", "siaga", "normal"]},
                     {"kode": "1601", "nama": "Kab. OKU", "prov": "16", "r24": [20, 20, 20], "st": ["normal"] * 3},
                     {"kode": "6271", "nama": "Kota Palangkaraya", "prov": "62", "r24": [60, 60, 60], "st": ["waspada"] * 3}]}
    lint = {"kompleks": [{"id": "K1", "kab": "Ogan Komering Ilir", "prov": "16"}], "lintas_batas": [{"negara": "Malaysia", "kompleks": "K1", "jam": 20}]}
    atr = {"hari": hari[9], "kota": [{"kode": "1671", "nama": "Kota Palembang", "pm": 300, "bagian": [{"jenis": "api", "nama": "Kompleks api OKI", "persen": 46, "rendah": 30, "tinggi": 61}]}]}
    d = susun(kota, r24, prak, lint, atr, {"bandara": [{"icao": "WIPP", "nama": "Palembang", "vis_km": 3.0, "prakiraan_km": [1.0, 2.0, 8.0]}]})
    assert lap.periksa(d) == [], lap.periksa(d)
    assert d["hari"] == hari and d["hari_lengkap"] == hari[8] and d["cutoff"] == "2026-10-10T07:00+07:00"
    assert d["nasional"]["jiwa_tidak_sehat"][0] == 1000 and d["nasional"]["jiwa_tidak_sehat"][2] == 1500 and d["nasional"]["kota_siaga"][9] == 1
    assert d["nasional"]["pm_jiwa"][0] == round((160 * 1000 + 20 * 3000) / 4000) == 55
    assert [k["kode"] for k in d["kab"]] == ["1671", "6271"] and d["kab"][1]["pm_jiwa"][0] is None   # hari tanpa data = null
    assert [s["tingkat"] for s in d["sorot"]] == ["awas", "info"] and "Malaysia" in d["sorot"][1]["judul"] and "46% (30 sampai 61%)" in d["sorot"][0]["teks"]
    assert d["sorot"][0]["judul"] == "Kota Palembang: Awas (Berbahaya)" and "perkiraan model, belum dikoreksi" in d["sorot"][0]["teks"]
    assert d["tambahan"][0]["judul"].endswith(", 10 Okt") and d["tambahan"][0]["baris"][0][4] == "30 sampai 61" and "1,5× CAMS" in d["tambahan"][0]["catatan"]
    assert porsi({"persen": 3, "rendah": 0, "tinggi": 90}) == "0 sampai 90%" and tgl_pendek("2026-10-20") == "20 Okt"
    assert not any(re.search(r"\d-\d", x["teks"]) for x in d["sorot"])            # rentang ditulis "a sampai b", bukan "a-b"
    assert d["prakiraan"]["baris"][0]["label"] == "Kota Palembang" and d["tambahan"][0]["baris"][0][3] == 46
    r55 = {"1671": {h: 55.4 for h in hari[:9]}, "1601": {h: 55.6 for h in hari[:9]}}
    d2 = susun(kota, r55, prak, lint, atr, {})
    assert d2["nasional"]["jiwa_tidak_sehat"][0] == 3000                                           # 55,4 tampil 55 normal; 55,6 tampil 56 tidak sehat
    try:
        susun(kota, {"1671": {hari[8]: 50.0}}, prak, lint, atr, {})
        raise AssertionError("riwayat < 7 hari harus ditolak")
    except ValueError:
        pass
    try:
        susun(kota, {"1671": {h: -5.0 for h in hari[:9]}}, prak, lint, atr, {})
        raise AssertionError("PM negatif harus ditolak")
    except ValueError:
        pass
    print("laporan_udara uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
