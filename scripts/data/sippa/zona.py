#!/usr/bin/env python3
"""SIPPA SP-021: kelayakan kompleks, kelayakan sel 2,2 km, ringkasan zona A-D tiga versi (Kalteng, prov 62).

Masukan : data/kajian-bnpb/pipa/data/*.csv, public/data/{kendala,operasi,akses,kompleks_konsesi,khg_prioritas}.json,
          data/sippa/keluaran/sel22.json (skema sel22/2)
          jam_tiba: data/sippa/keluaran/akses_kompleks.json (SP-099) bila ada; kalau tidak public/data/akses.json
Keluaran: data/sippa/keluaran/{kelayakan_kompleks,kelayakan_sel,zona}.json  (DT 3.1.1-3.1.3, 7.2)
Pakai   : python3 zona.py [--keluar DIR]   |   python3 zona.py uji
Python 3.12 stdlib. Zona: A air<2,5 & jalan<5; B air<2,5 & jalan>=5/null; C air>=2,5 & jalan<5; D sisanya (operator "<", keputusan 51).
Kekerapan = tahun_aktif S-NPP dari sel22 (sebanding 2012-2025); per_tahun/n_baris tidak dipakai sebagai tren. Tanpa nama perusahaan.
"""
import csv, hashlib, json, math, os, re, statistics, sys
from datetime import datetime, timedelta, timezone

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CSV = os.path.join(AKAR, "data", "kajian-bnpb", "pipa", "data")
PUB = os.path.join(AKAR, "public", "data")
KEL = os.path.join(AKAR, "data", "sippa", "keluaran")
AIR, JALAN = 2.5, 5.0
SEL = 0.02
MAKS = 8 * 1024 * 1024
PROV = "62"
N_KOMPLEKS = 865
RADIUS_SEL_KM = 5.0
TERLARANG = {"nama", "perusahaan", "pt"}      # kunci yang tidak boleh ada di keluaran
VERSI = {"k": ("air_km_lama", "jalan_km_lama"), "u": ("air_km_semua", "jalan_km_utama"), "o": ("air_km_semua", "jalan_km_semua")}
KEYAKINAN = {
    "prov": "resmi", "kab": "resmi", "lat": "estimasi-model", "lon": "estimasi-model", "gambut": "resmi",
    "air_km_lama": "terverifikasi", "air_km_semua": "terverifikasi", "air_km_kecil": "terverifikasi", "air_jenis": "terverifikasi",
    "jalan_km_lama": "terverifikasi", "jalan_km_utama": "terverifikasi", "jalan_km_semua": "terverifikasi",
    "jalan_km_setapak": "terverifikasi", "zona_k": "terverifikasi", "zona_u": "terverifikasi", "zona_o": "terverifikasi",
    "elev_kompleks_m": "terverifikasi", "elev_air_m": "terverifikasi", "beda_air_m": "terverifikasi", "gsw": "terverifikasi",
    "terbakar_n_2km": "terverifikasi", "terbakar_n_5km": "terverifikasi", "terbakar_akhir": "terverifikasi",
    "kekerapan_sel22": "terverifikasi", "chirps_anom_akhir_pct": "terverifikasi", "kaw": "terverifikasi",
    "khg": "resmi", "jam_tiba": "estimasi-model",
}


def zona(air, jalan):
    """air, jalan dalam km; jalan None = tanpa rute = jauh. Strict '<' (keputusan 51)."""
    a = air is not None and air < AIR
    j = jalan is not None and jalan < JALAN
    return ("A" if j else "B") if a else ("C" if j else "D")


def baca_csv(nama):
    with open(os.path.join(CSV, nama), newline="") as h:
        return {r["id"]: r for r in csv.DictReader(h)}


def baca_json(*p):
    with open(os.path.join(*p)) as h:
        return json.load(h)


def sha(*berkas):
    h = hashlib.sha256()
    for f in berkas:
        with open(f, "rb") as x:
            for b in iter(lambda: x.read(1 << 22), b""):
                h.update(b)
    return h.hexdigest()


def f(x, nd=None):
    """'' -> None; angka dibulatkan nd desimal."""
    if x is None or x == "":
        return None
    v = float(x)
    return round(v, nd) if nd is not None else v


def i(x):
    return None if x in (None, "") else int(float(x))


def id_sel(a, b):
    return f"s{a}_{b}"


def sel_dari(lat, lon):
    return math.floor((lat + 11.5) / SEL), math.floor((lon - 94.5) / SEL)


def km(lat1, lon1, lat2, lon2):
    return 111.195 * math.hypot(lat1 - lat2, (lon1 - lon2) * math.cos(math.radians((lat1 + lat2) / 2)))


def kaw(kons, op):
    """konservasi (tanda kawasan operasi.json) > konsesi (jenis izin ada di kompleks_konsesi atau tanda operasi) > lain. Tanpa nama."""
    if op["kaw"] == "konservasi":
        return "konservasi"
    if kons and kons.get("jenis") or op["kaw"] == "konsesi":
        return "konsesi"
    return "lain"


def jam_tiba(a):
    """a = entri akses (larik 'dari' berisi jam) atau None."""
    jam = [d["jam"] for d in (a or {}).get("dari", []) if isinstance(d, dict) and d.get("jam") is not None]
    return round(min(jam), 1) if jam else None


def sumber_akses():
    """SP-099 akses_kompleks.json bila ada: {id: jam_tiba/total_menit}; kalau tidak akses.json. Kembalikan (fungsi id->jam, nama)."""
    p = os.path.join(KEL, "akses_kompleks.json")
    if os.path.exists(p):
        d = baca_json(p)
        isi = d.get("kompleks", d)
        isi = {x["id"]: x for x in isi} if isinstance(isi, list) else isi

        def jam(k):
            e = isi.get(k) or {}
            if e.get("jam_tiba") is not None:
                return round(float(e["jam_tiba"]), 1)
            if e.get("total_menit") is not None:
                return round(float(e["total_menit"]) / 60, 1)
            return None
        return jam, "akses_kompleks.json"
    d = baca_json(PUB, "akses.json")
    return (lambda k: jam_tiba(d.get(k))), "akses.json"


def susun_kompleks(sel22):
    kend = baca_json(PUB, "kendala.json")
    op = {x["id"]: x for x in baca_json(PUB, "operasi.json")["kompleks"]}
    kons = baca_json(PUB, "kompleks_konsesi.json")["kompleks"]
    khg = baca_json(PUB, "khg_prioritas.json")
    osm, dem, gsw = baca_csv("osm_jarak.csv"), baca_csv("dem_elevasi.csv"), baca_csv("gsw_air_terdekat.csv")
    bakar, chirps = baca_csv("area_terbakar.csv"), baca_csv("chirps_anomali_tahunan.csv")
    jam, nama_akses = sumber_akses()
    aktif = {r[0]: r[1] for r in sel22["baris"]}
    ids = sorted(k for k, v in kend["kompleks"].items() if v["prov"] == PROV)
    assert len(ids) == N_KOMPLEKS, f"kompleks prov {PROV} = {len(ids)}, harus {N_KOMPLEKS}"
    out = []
    for k in ids:
        kd, o, m, d, g, b, c = kend["kompleks"][k], op[k], osm[k], dem[k], gsw[k], bakar[k], chirps[k]
        lat, lon = round(o["lat"], 4), round(o["lon"], 4)
        r = {
            "id": k, "prov": kd["prov"], "kab": kd["kab"], "lat": lat, "lon": lon, "gambut": bool(kd["gambut"]),
            "air_km_lama": f(kd["air_km"], 2), "air_km_semua": f(m["air_semua_km"], 2), "air_km_kecil": f(m["air_kecil_km"], 2),
            "air_jenis": m["air_semua_jenis"] or None,
            "jalan_km_lama": f(kd["jalan_km"], 2), "jalan_km_utama": f(m["jalan_utama_km"], 2),
            "jalan_km_semua": f(m["jalan_kend_km"], 2), "jalan_km_setapak": f(m["jalan_setapak_km"], 2),
            "terpotong": {"jalan_semua": m["jalan_kend_terpotong"] == "1", "jalan_utama": m["jalan_utama_terpotong"] == "1",
                          "air_semua": m["air_semua_terpotong"] == "1"},
        }
        for v, (a, j) in VERSI.items():
            r["zona_" + v] = zona(r[a], r[j])
        r.update({
            "elev_kompleks_m": f(d["elev_kompleks_m"], 1), "elev_air_m": f(d["elev_air_terdekat_m"], 1),
            "beda_air_m": f(d["beda_air_minus_kompleks_m"], 1), "gsw": g["gsw_kelas"] or None,
            "terbakar_n_2km": i(b["bakar_n_tahun_2km"]), "terbakar_n_5km": i(b["bakar_n_tahun_5km"]),
            "terbakar_akhir": i(b["bakar_tahun_terakhir_2km"]),
            "kekerapan_sel22": aktif.get(id_sel(*sel_dari(lat, lon)), 0),   # sel tanpa baris = 0 tahun aktif S-NPP
            "chirps_anom_akhir_pct": f(c["anom_2025"], 1), "kaw": kaw(kons.get(k), o),
            "khg": None,                                                    # khg_prioritas.json tidak memuat pemetaan kompleks-KHG
            "jam_tiba": jam(k),
        })
        out.append(r)
    return out, {"khg": khg, "kendala": kend, "nama_akses": nama_akses}


def susun_sel(sel22, komp):
    """Per sel sel22: tahun_aktif S-NPP, hari api total, kompleks terdekat dalam 5 km (null bila tidak ada)."""
    ket = {}
    for k in komp:
        ket.setdefault((math.floor(k["lat"] / 0.05), math.floor(k["lon"] / 0.05)), []).append(k)
    baris = []
    for sid, ta, pt, _ in sel22["baris"]:
        a, b = (int(x) for x in sid[1:].split("_"))
        lat, lon = round(-11.5 + (a + 0.5) * SEL, 4), round(94.5 + (b + 0.5) * SEL, 4)
        ba, bo = math.floor(lat / 0.05), math.floor(lon / 0.05)
        best = None
        for da in (-1, 0, 1):
            for db in (-1, 0, 1):
                for k in ket.get((ba + da, bo + db), ()):
                    dk = km(lat, lon, k["lat"], k["lon"])
                    if dk <= RADIUS_SEL_KM and (best is None or dk < best[0]):
                        best = (dk, k)
        baris.append([sid, lat, lon, ta, sum(pt), best[1]["gambut"] if best else None,
                      best[1]["zona_k"] if best else None, best[1]["id"] if best else None, round(best[0], 2) if best else None])
    return baris


def med(v):
    v = [x for x in v if x is not None]
    return round(statistics.median(v), 2) if v else None


def susun_zona(komp):
    """Satu baris provinsi + satu per kabupaten, per versi."""
    baris = []
    kelompok = [(None, komp)] + [(kb, [k for k in komp if k["kab"] == kb]) for kb in sorted({k["kab"] for k in komp})]
    for kb, isi in kelompok:
        for v, (a, j) in VERSI.items():
            cnt = {z: sum(1 for k in isi if k["zona_" + v] == z) for z in "ABCD"}
            potong = {"k": None, "u": "jalan_utama", "o": "jalan_semua"}[v]
            baris.append({"prov": PROV, "kab": kb, "versi": v, **cnt, "n": len(isi),
                          "median_air_km": med(k[a] for k in isi), "median_jalan_km": med(k[j] for k in isi),
                          "tanpa_jalan_16km": None if potong is None else sum(1 for k in isi if k["terpotong"][potong])})
    return baris


def kepala(per, versi, ambang, sumber, catatan):
    wib = datetime.now(timezone(timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M+07:00")
    return {"dibuat": wib, "per": per, "versi": f"sippa_{versi}/1", "ambang": ambang, "sumber": sumber, "catatan": catatan}


def tulis_json(dir_, nama, obj):
    teks = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    assert len(teks.encode()) <= MAKS, f"{nama}.json {len(teks.encode())} byte > 8 MB"
    p = os.path.join(dir_, nama + ".json")
    os.makedirs(dir_, exist_ok=True)
    with open(p + ".tmp", "w") as h:
        h.write(teks)
    os.replace(p + ".tmp", p)
    return len(teks.encode())


def kunci_terlarang(o, jalur=""):
    """Cari kunci nama/perusahaan/pt di objek bersarang."""
    if isinstance(o, dict):
        for k, v in o.items():
            if k.lower() in TERLARANG:
                yield f"{jalur}/{k}"
            yield from kunci_terlarang(v, f"{jalur}/{k}")
    elif isinstance(o, list):
        for n, v in enumerate(o[:5000]):
            yield from kunci_terlarang(v, f"{jalur}[{n}]")


def hitung():
    sel22 = baca_json(KEL, "sel22.json")
    assert sel22["skema"] == "sel22/2", f"sel22 skema {sel22['skema']}, perlu sel22/2"
    komp, x = susun_kompleks(sel22)
    return sel22, komp, susun_sel(sel22, komp), susun_zona(komp), x


def matriks_acuan():
    """Baca tabel matriks_jarak.md: {versi: {A..D}} dan median; bukan konstanta di skrip."""
    teks = open(os.path.join(CSV, "matriks_jarak.md")).read()
    kol = {"k": 3, "o": 4, "u": 7}                  # indeks hasil split("|"): '', zona, aturan, lama, o, ..., ..., u
    acu = {v: {} for v in kol}
    for m in re.finditer(r"^\| ([ABCD]) \| air.*$", teks, re.M):
        sel = [s.strip() for s in m.group(0).split("|")]
        for v, n in kol.items():
            acu[v][m.group(1)] = int(sel[n])
    med_ = {n: float(x) for n, x in re.findall(r"^\| (air baru semua|jalan baru semua) \(n=\d+\) \| ([\d.]+)", teks, re.M)}
    return acu, med_


def uji():
    # batas ketat "<": tepat di ambang jatuh ke sisi jauh
    assert zona(2.49, 4.99) == "A" and zona(2.5, 4.99) == "C" and zona(2.49, 5.0) == "B" and zona(2.5, 5.0) == "D"
    assert zona(1, None) == "B" and zona(None, 1) == "C" and zona(None, None) == "D", "None = jauh"
    assert jam_tiba(None) is None and jam_tiba({"dari": []}) is None
    assert jam_tiba({"dari": [{"jam": 2.8}, {"jam": 2.04}]}) == 2.0
    assert sel_dari(-3.1201, 112.1635) == (math.floor(8.3799 / SEL), math.floor(17.6635 / SEL))
    assert "/x/nama" in list(kunci_terlarang({"x": {"nama": 1}})) and not list(kunci_terlarang({"kaw": "konsesi"}))
    assert kaw({"jenis": {"hti": 1}}, {"kaw": "lain"}) == "konsesi" and kaw({"jenis": {}}, {"kaw": "lain"}) == "lain"
    assert kaw({"jenis": {"hti": 1}}, {"kaw": "konservasi"}) == "konservasi"
    sel22, komp, sel, zb, _ = hitung()
    # tiap kompleks tepat satu zona per versi; jumlah = 865
    assert len(komp) == N_KOMPLEKS == len({k["id"] for k in komp})
    for k in komp:
        assert all(k["zona_" + v] in "ABCD" and len(k["zona_" + v]) == 1 for v in VERSI), k["id"]
    acu, medacu = matriks_acuan()
    prov = {r["versi"]: r for r in zb if r["kab"] is None}
    for v in VERSI:
        got = {z: prov[v][z] for z in "ABCD"}
        assert got == acu[v], f"versi {v}: {got} != matriks_jarak.md {acu[v]}"
        assert sum(got.values()) == prov[v]["n"] == N_KOMPLEKS
        for kb in {r["kab"] for r in zb if r["kab"]}:
            r = next(r for r in zb if r["kab"] == kb and r["versi"] == v)
            assert r["A"] + r["B"] + r["C"] + r["D"] == r["n"]
    assert abs(prov["o"]["median_air_km"] - medacu["air baru semua"]) <= 0.01, f"median air {prov['o']['median_air_km']}"
    assert abs(prov["o"]["median_jalan_km"] - medacu["jalan baru semua"]) <= 0.01, f"median jalan {prov['o']['median_jalan_km']}"
    assert prov["o"]["tanpa_jalan_16km"] == 44 and prov["k"]["tanpa_jalan_16km"] is None
    # kekerapan dari tahun_aktif S-NPP: 0..14
    assert all(isinstance(k["kekerapan_sel22"], int) and 0 <= k["kekerapan_sel22"] <= 14 for k in komp)
    # sel
    assert len(sel) == len(sel22["baris"]) and len({r[0] for r in sel}) == len(sel)
    for r in sel:
        assert 0 <= r[3] <= 14 and (r[8] is None) == (r[7] is None) == (r[6] is None)
        assert r[8] is None or r[8] <= RADIUS_SEL_KM
    # tanpa nama perusahaan
    for nama, o in (("kompleks", komp), ("sel", sel), ("zona", zb)):
        assert not list(kunci_terlarang(o)), f"kunci terlarang di {nama}: {list(kunci_terlarang(o))[:3]}"
    assert {k["kaw"] for k in komp} <= {"lain", "konsesi", "konservasi"}
    # tiap versi zona tidak sama dengan satu zona saja (pengecek anti-degenerasi)
    assert all(len({k["zona_" + v] for k in komp}) == 4 for v in VERSI)
    print("uji zona: lolos")


def main(argv):
    keluar = KEL
    if argv[:1] == ["--keluar"]:
        keluar = argv[1]
    sel22, komp, sel, zb, x = hitung()
    per = max(x["khg"]["per"], x["kendala"]["per"])
    ambang = {"air_km": AIR, "jalan_km": JALAN,
              "aturan": "A bila air < 2,5 dan jalan < 5; B bila air < 2,5 dan jalan >= 5 atau null; C bila air >= 2,5 dan jalan < 5; D sisanya"}
    masukan = {n: sha(os.path.join(CSV, n)) for n in sorted(os.listdir(CSV)) if n.endswith(".csv") or n == "matriks_jarak.md"}
    masukan["sel22.json"] = sha(os.path.join(KEL, "sel22.json"))
    s = lambda nama, lis, tarik: {"nama": nama, "lisensi": lis, "tarik": tarik}
    sumber = [s("OpenStreetMap (jalan, air) via Overpass", "ODbL", "2026-10-24"), s("Copernicus DEM GLO-30", "Copernicus", "2026-10-24"),
              s("JRC Global Surface Water v1.4", "CC-BY 4.0", "2026-10-24"), s("MODIS MCD64A1 v061", "NASA open", "2026-10-25"),
              s("CHIRPS v2.0", "CC0", "2026-10-25"), s("NASA FIRMS VIIRS S-NPP (sel22)", "NASA open", sel22["data_hingga"]),
              s("kendala.json, operasi.json, kompleks_konsesi.json, khg_prioritas.json, " + x["nama_akses"], "repo ini", per)]
    cat = ("Perkiraan perencanaan dari OSM dan data terbuka, bukan survei lapangan. Jarak garis lurus, dibatasi 16 km (medan terpotong). "
           "kekerapan_sel22 = tahun aktif S-NPP 2012-2025 (sebanding antar tahun), 0 bila sel tanpa deteksi. "
           "khg null: khg_prioritas.json tidak memuat pemetaan kompleks ke KHG. "
           f"jam_tiba dari {x['nama_akses']}, null bila belum dihitung. kaw tanpa nama pemegang izin. ")
    kk = {**kepala(per, "kelayakan_kompleks", ambang, sumber, cat), "masukan": masukan, "n": len(komp), "kolom_keyakinan": KEYAKINAN, "kompleks": komp}
    ks = {**kepala(per, "kelayakan_sel", {"air_km": AIR, "jalan_km": JALAN}, sumber,
                   "Kisi 0,02 derajat sel22 (hanya sel dengan deteksi VIIRS). tahun_aktif S-NPP; hari_api = jumlah hari api S-NPP 2012-2025 "
                   "(bukan tren). zona_k_terdekat, gambut: kompleks terdekat dalam 5 km, null bila tidak ada (jarak air/jalan per sel belum dihitung, BT-03). "
                   "gambut per sel meminjam kompleks terdekat, bukan peta gambut."),
          "kolom": ["sel", "lat", "lon", "tahun_aktif", "hari_api", "gambut", "zona_k_terdekat", "kompleks_terdekat", "kompleks_km"], "baris": sel}
    kz = {**kepala(per, "zona", {"air_km": AIR, "jalan_km": JALAN}, sumber,
                   "versi k = kendala.json (Konservatif); u = jalan utama OSM tersier ke atas x semua air; o = semua jalan kendaraan OSM x semua air (Optimistis). "
                   "kab null = baris provinsi. Median atas nilai bukan null. tanpa_jalan_16km = jumlah kompleks tanpa jalan dalam 16 km (null untuk k)."),
          "baris": zb}
    for nama, o in (("kelayakan_kompleks", kk), ("kelayakan_sel", ks), ("zona", kz)):
        print(f"{nama}.json {tulis_json(keluar, nama, o)} byte")
    for r in zb:
        if r["kab"] is None:
            print(f"zona {r['versi']}: A{r['A']} B{r['B']} C{r['C']} D{r['D']} n={r['n']}")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1:])
