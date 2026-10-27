#!/usr/bin/env python3
"""SIPPA SP-028: calon AOI pilot 2027 (saringan G0 bagian data). PRD 4.1 minggu 50, 4.4 G0; DT 3.1.7, 7.2.

Masukan : data/sippa/keluaran/{kelayakan_kompleks,sel22}.json; opsional --usul BERKAS.csv (ekspor sippa_aoi_usul: kompleks_id,sel,prov,alasan,status)
Keluaran: data/sippa/keluaran/aoi_calon.json
Pakai   : python3 aoi.py [--usul csv] [--keluar DIR]   |   python3 aoi.py uji
Python 3.12 stdlib. Hanya menyaring dan mengurutkan; AOI dipilih pemilik (G0). Tanpa nama pemegang izin.
"""
import csv, json, os, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
KEL = os.path.join(AKAR, "data", "sippa", "keluaran")
MAKS = 1024 * 1024
AMBANG = {
    "tahun_aktif_min": {"nilai": 7, "dari": 14, "rentang": "2012-2025", "keyakinan": "asumsi-kebijakan"},
    "gambut": {"nilai": True, "keyakinan": "resmi"},
    "air_km_maks": {"nilai": 2.5, "keyakinan": "asumsi-kebijakan", "catatan": "garis lurus dari OSM, bukan survei; permanen menurut survei tapak (G0)"},
    "air_dipakai": "air_km_semua",
}
SEL_I, SEL_J, DERAJAT = -11.5, 94.5, 0.02  # DT 3.1.4: i=floor((lat+11.5)/0.02), j=floor((lon-94.5)/0.02)


def baca(*p):
    with open(os.path.join(*p)) as h:
        return json.load(h)


def lolos(k):
    a = AMBANG
    return (k["gambut"] is a["gambut"]["nilai"] and k["kekerapan_sel22"] >= a["tahun_aktif_min"]["nilai"]
            and k["air_km_semua"] is not None and k["air_km_semua"] < a["air_km_maks"]["nilai"])


def sel_pusat(sel):
    i, j = sel[1:].split("_")
    return round(SEL_I + (int(i) + 0.5) * DERAJAT, 4), round(SEL_J + (int(j) + 0.5) * DERAJAT, 4)


def hitung(komp, usul=()):
    """usul: larik dict {kompleks_id, sel, alasan, status}. Kompleks usulan yang lolos diberi usul_staf=True dan naik ke atas.
    Usulan kompleks yang tidak lolos saringan dicatat di `gugur`."""
    ids = {u["kompleks_id"] for u in usul if u.get("kompleks_id")}
    baris = []
    for k in komp:
        if not lolos(k):
            continue
        baris.append({"id": k["id"], "kab": k["kab"], "prov": k["prov"], "kec": None, "lat": k["lat"], "lon": k["lon"],
                      "kekerapan": k["kekerapan_sel22"], "median_air_km": k["air_km_semua"], "zona": k["zona_k"], "kaw": k["kaw"],
                      "usul_staf": k["id"] in ids,
                      "catatan": "kecamatan belum tersedia; jarak air garis lurus OSM; wajib survei tapak (G0)"})
    baris.sort(key=lambda b: (not b["usul_staf"], -b["kekerapan"], b["median_air_km"], b["id"]))
    for n, b in enumerate(baris, 1):
        b["peringkat"] = n
    return baris, sorted(ids - {b["id"] for b in baris})


def susun(usul=()):
    kk, s22 = baca(KEL, "kelayakan_kompleks.json"), baca(KEL, "sel22.json")
    baris, gugur = hitung(kk["kompleks"], usul)
    ada = {r[0]: r[1] for r in s22["baris"]}
    usul_sel = []
    for u in usul:
        if u.get("sel") and not u.get("kompleks_id"):
            lat, lon = sel_pusat(u["sel"])
            usul_sel.append({"sel": u["sel"], "lat": lat, "lon": lon, "tahun_aktif": ada.get(u["sel"], 0), "status": u.get("status") or "usul",
                             "catatan": "jarak air dan gambut belum diperiksa; tidak disaring"})
    return {
        "dibuat": kk["per"], "per": kk["per"], "versi": "sippa_aoi_calon/1", "ambang": AMBANG,
        "sumber": [{"nama": "kelayakan_kompleks.json", "tarik": kk["per"], "lisensi": "repo ini"},
                   {"nama": "sel22.json (FIRMS VIIRS S-NPP)", "tarik": s22["data_hingga"], "lisensi": "NASA open"}],
        "catatan": "Saringan data G0, bukan keputusan AOI: pemilik memilih tiga lokasi. Estimasi-model dari data terbuka, belum survei tapak, "
                   "belum ada persetujuan pemegang hak. Tanpa nama pemegang izin.",
        "n_diperiksa": len(kk["kompleks"]), "usul_tak_lolos": gugur, "usul_sel": usul_sel, "baris": baris,
    }


def baca_usul(p):
    with open(p, newline="") as h:
        return [{k: (v or None) for k, v in r.items()} for r in csv.DictReader(h)]


def uji():
    ko = lambda i, g=True, t=8, a=1.0, **o: {"id": i, "prov": "62", "kab": "X", "lat": -2.0, "lon": 113.0, "gambut": g, "kekerapan_sel22": t,
                                              "air_km_semua": a, "zona_k": "A", "kaw": "hutan produksi", **o}
    komp = [ko("K1"), ko("K2", t=14, a=2.0), ko("K3", g=False), ko("K4", t=6), ko("K5", a=2.5), ko("K6", a=None), ko("K7", t=7, a=2.49), ko("K8", t=14, a=1.0)]
    b, gugur = hitung(komp)
    assert [x["id"] for x in b] == ["K8", "K2", "K1", "K7"], [x["id"] for x in b]  # batas: 7 masuk, 6 tidak; 2,49 masuk, 2,5 tidak
    assert [x["peringkat"] for x in b] == [1, 2, 3, 4]
    b, gugur = hitung(komp, [{"kompleks_id": "K7"}, {"kompleks_id": "K4"}])
    assert b[0]["id"] == "K7" and b[0]["usul_staf"] and gugur == ["K4"], (b[0], gugur)
    assert sel_pusat("s395_1004") == (-3.59, 114.59), sel_pusat("s395_1004")
    s = susun()
    kk = baca(KEL, "kelayakan_kompleks.json")["kompleks"]
    assert len(s["baris"]) >= 1, "tidak ada calon pada data nyata"
    assert s["baris"] == hitung(kk)[0] and s["n_diperiksa"] == len(kk)
    assert s["ambang"]["tahun_aktif_min"]["nilai"] == 7 and s["ambang"]["air_km_maks"]["nilai"] == 2.5
    assert not any(k in ("nama", "perusahaan", "pt", "pemegang") for x in s["baris"] for k in x), "nama perusahaan bocor"
    assert len(json.dumps(s).encode()) <= MAKS
    print("uji aoi: lolos")


def main(argv):
    keluar, usul = KEL, []
    while argv:
        if argv[0] == "--keluar":
            keluar = argv[1]
        elif argv[0] == "--usul":
            usul = baca_usul(argv[1])
        else:
            sys.exit("pakai: aoi.py [--usul csv] [--keluar DIR] | uji")
        argv = argv[2:]
    s = susun(usul)
    teks = json.dumps(s, ensure_ascii=False, separators=(",", ":"))
    assert len(teks.encode()) <= MAKS, f"aoi_calon.json {len(teks.encode())} byte > 1 MB"
    os.makedirs(keluar, exist_ok=True)
    p = os.path.join(keluar, "aoi_calon.json")
    with open(p + ".tmp", "w") as h:
        h.write(teks)
    os.replace(p + ".tmp", p)
    print(f"aoi_calon.json {len(teks.encode())} byte; {len(s['baris'])} calon dari {s['n_diperiksa']} kompleks")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1:])
