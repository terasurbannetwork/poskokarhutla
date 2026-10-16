"""Kualitas udara dari prakiraan CAMS (asap.json) + penduduk: jiwa per kategori ISPU per provinsi dan kabupaten.

Masukan  : public/data/asap.json (scripts/data/asap.py), public/data/penduduk.json, public/banjir/data/pusat_kec.json + meta.json (nama wilayah)
Keluaran : public/data/udara_kualitas.json (4 hari) dan udara_kualitas_riwayat.json (satu titik per hari, tumbuh tiap jalan)
           Bukan udara.json: itu data bandara karhutla.
Kategori : titik potong PM2,5 rata-rata 24 jam Permen LHK P.14/2020. Ini PERKIRAAN MODEL (CAMS ~40 km), bukan ISPU resmi KLHK;
           ISPU KLHK (ispu.menlhk.go.id) tidak bisa dijangkau dari CI, jadi tidak ditampilkan.
Pakai    : python3 scripts/udara/kualitas.py [uji]   (dirantai di akhir scripts/scrape/metar.py)
"""
import json
import math
import os
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DATA = os.path.join(AKAR, "public/data")
BATAS = [15.5, 55.4, 150.4, 250.4]  # batas atas Baik, Sedang, Tidak sehat, Sangat tidak sehat (ug/m3, rata-rata 24 jam)
TOP_KAB = 30
RIWAYAT_MAKS = 400


def kategori(v):
    """0 Baik, 1 Sedang, 2 Tidak sehat, 3 Sangat tidak sehat, 4 Berbahaya."""
    return sum(v > b for b in BATAS)


def kunci_sel(lat, lon):
    """Pusat sel 1 derajat asap.json (..., -10.5, -9.5, ...) yang memuat titik."""
    return (math.floor(lat) + .5, math.floor(lon) + .5)


def terdekat(pusat, lat, lon):
    """pusat = [(lat, lon, nama)] -> nama terdekat (jarak datar cukup untuk memilih kabupaten dalam satu provinsi)."""
    k = math.cos(math.radians(lat))
    return min(pusat, key=lambda p: (p[0] - lat) ** 2 + ((p[1] - lon) * k) ** 2)[2]


def hitung(asap, pend, pusat_kec):
    n_hari = len(asap["hari"])
    k = asap["kolom"]
    i_rata, i_maks = k.index("pm25_rata") - 2, k.index("pm25_maks") - 2  # r[2:] dimulai dari kolom ketiga
    sel = {kunci_sel(r[0], r[1]): r[2:] for r in asap["grid"]}
    pusat = {}  # prov -> [(lat, lon, kab)]
    for kk, (la, lo) in pusat_kec.items():
        p, kab, _ = kk.split("|")
        pusat.setdefault(p, []).append((la, lo, kab))
    per_prov, kab_cache = {}, {}
    nas = [[0] * 5 for _ in range(n_hari)]
    nas_pm = [0.0] * n_hari
    kab = [dict() for _ in range(n_hari)]
    for la, lo, jiwa, prov in pend["grid"]:
        v = sel.get(kunci_sel(la, lo))
        if not prov or not v or prov not in pusat:
            continue
        ck = (round(la, 3), round(lo, 3), prov)
        if ck not in kab_cache:
            kab_cache[ck] = terdekat(pusat[prov], la, lo)
        nk = kab_cache[ck]
        for d in range(n_hari):
            pm = v[i_rata][d]
            if pm is None:
                continue
            c = kategori(pm)
            P = per_prov.setdefault(prov, [[0] * 5 + [0.0, 0.0] for _ in range(n_hari)])[d]
            P[c] += jiwa
            P[5] += jiwa * pm
            P[6] = max(P[6], v[i_maks][d] or 0)
            nas[d][c] += jiwa
            nas_pm[d] += jiwa * pm
            K = kab[d].setdefault((prov, nk), [0, 0.0, 0.0, 0])  # jiwa, jiwa*pm, maks rata-24-jam, jiwa tidak sehat
            K[0] += jiwa
            K[1] += jiwa * pm
            K[2] = max(K[2], pm)
            K[3] += jiwa if c >= 2 else 0
    for hs in per_prov.values():
        for P in hs:
            tot = sum(P[:5])
            P[5] = round(P[5] / tot, 1) if tot else 0
            P[6] = round(P[6])
    kab_out = [[[p, nm, round(K[1] / K[0], 1), round(K[2], 1), K[0], K[3]]
                for (p, nm), K in sorted(kab[d].items(), key=lambda x: (-x[1][1] / x[1][0], -x[1][0]))[:TOP_KAB] if K[0]]
               for d in range(n_hari)]
    total = [sum(x) for x in nas]
    nasional = [{"jiwa": nas[d], "rata": round(nas_pm[d] / total[d], 1) if total[d] else 0} for d in range(n_hari)]
    return {"prov": per_prov, "nasional": nasional, "kab": kab_out}


def main():
    def muat(p):
        return json.load(open(os.path.join(AKAR, p), encoding="utf-8"))
    asap, pend = muat("public/data/asap.json"), muat("public/data/penduduk.json")
    nama = muat("public/banjir/data/meta.json")["provinsi"]
    h = hitung(asap, pend, muat("public/banjir/data/pusat_kec.json"))
    out = {"status_validasi": "belum_divalidasi",
           "koreksi": {"status": "tidak_tersedia", "alasan": "OpenAQ v3 butuh kunci API (401); arsip S3 butuh id stasiun yang tak bisa dicari tanpa API. pm25_terkoreksi tidak dibuat, angka mentah CAMS."},
           "sumber": "CAMS (Copernicus) via Open-Meteo; penduduk WorldPop 2026", "dibuat": asap["dibuat"], "hari": asap["hari"], "batas": BATAS,
           "prov": h["prov"], "nasional": h["nasional"], "kab": h["kab"], "nama_prov": nama,
           "kolom_prov": ["baik", "sedang", "tidak_sehat", "sangat_tidak_sehat", "berbahaya", "rata_pm25", "maks_pm25"],
           "kolom_kab": ["prov", "kabupaten", "rata_pm25", "maks_pm25", "jiwa", "jiwa_tidak_sehat"]}
    rw_p = os.path.join(DATA, "udara_kualitas_riwayat.json")
    rw = json.load(open(rw_p)) if os.path.exists(rw_p) else {"kolom": ["jiwa_di_atas_baik", "jiwa_tidak_sehat", "rata_pm25"], "tgl": {}}
    n0 = h["nasional"][0]
    rw["tgl"][asap["hari"][0]] = [sum(n0["jiwa"][1:]), sum(n0["jiwa"][2:]), n0["rata"]]
    rw["tgl"] = dict(sorted(rw["tgl"].items())[-RIWAYAT_MAKS:])
    for p, isi in ((os.path.join(DATA, "udara_kualitas.json"), out), (rw_p, rw)):
        with open(p + ".tmp", "w", encoding="utf-8") as f:
            json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(p + ".tmp", p)
    print(f"udara_kualitas: {len(h['prov'])} provinsi, hari {asap['hari']}; tidak sehat hari ini {sum(n0['jiwa'][2:]):,} jiwa", file=sys.stderr)


def uji():
    assert [kategori(v) for v in (0, 15.5, 15.6, 55.4, 55.5, 150.4, 150.5, 250.4, 250.6)] == [0, 0, 1, 1, 2, 2, 3, 3, 4]
    assert kunci_sel(-10.875, 122.625) == (-10.5, 122.5) and kunci_sel(0.2, 101.9) == (0.5, 101.5)
    assert terdekat([(0, 0, "a"), (0, 1, "b")], 0, .9) == "b"
    asap = {"hari": ["d0", "d1"], "kolom": ["lat", "lon", "pm25_maks", "co_rata", "co_maks", "aod_maks", "pm25_rata", "pm10_maks"],
            "grid": [[.5, 101.5, [80, 90], [0, 0], [0, 0], [0, 0], [60, 10], [0, 0]]]}
    pend = {"grid": [[.2, 101.2, 1000, "14"], [.3, 101.4, 500, "14"], [.2, 101.2, 70, ""], [30, 30, 5, "14"]]}
    r = hitung(asap, pend, {"14|Kab A|X": [.2, 101.2], "14|Kab B|Y": [.9, 101.9]})
    assert r["prov"]["14"][0][:5] == [0, 0, 1500, 0, 0] and r["prov"]["14"][1][:5] == [1500, 0, 0, 0, 0], r["prov"]
    assert r["nasional"][0]["jiwa"][2] == 1500 and r["nasional"][0]["rata"] == 60  # penduduk tanpa provinsi atau di luar sel dibuang
    assert r["kab"][0][0][:2] == ["14", "Kab A"] and r["kab"][0][0][5] == 1500
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
