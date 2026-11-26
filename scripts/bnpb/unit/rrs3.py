"""RRS-3 Daftar fasilitas sosial di dalam jejak bahaya per kejadian (DESAIN-TEKNIS sec 5.10; tiket RU-055).

Langkah jalan.py (harian, kejadian aktif). Masukan:
  fasilitas   public/data/osm_nasional/<prov>.json  sekolah, puskesmas, rs ([lat, lon, nama]); klinik hanya dihitung,
              tanpa nama (nama klinik sering nama orang)
  jejak       banjir: public/banjir/data/kejadian_aktif_geo.json (poligon per kejadian) + kejadian_aktif_awal.json (kab, sejak)
              gempa MMI >= VII: belum ada berkas jejak per kejadian di repo -> kartu menunggu data, bukan jejak karangan
  pembanding  public/data/dibi_kejadian.json  f_pendidikan DIBI kab (baris bencana resmi) di rentang kejadian
Label: proksi (cakupan OSM, batas bawah). Selisih sekolah OSM lawan f_pendidikan DIBI ditandai, bukan dikoreksi.
Fasilitas di dalam jejak belum tentu rusak.

  python3 -I scripts/bnpb/unit/rrs3.py --cek
"""
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

P = rapor.AKAR
OSM = os.path.join(P, "public", "data", "osm_nasional")
GEO = os.path.join(P, "public", "banjir", "data", "kejadian_aktif_geo.json")
AWAL = os.path.join(P, "public", "banjir", "data", "kejadian_aktif_awal.json")
DIBI = os.path.join(P, "public", "data", "dibi_kejadian.json")
JENIS = ("sekolah", "puskesmas", "rs")   # bernama institusi
LABEL_OSM = "Asumsi: cakupan OSM, batas bawah"


def _di_cincin(x, y, c):
    ada = False
    for i in range(len(c)):
        x1, y1 = c[i - 1][:2]
        x2, y2 = c[i][:2]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            ada = not ada
    return ada


def di_dalam(lon, lat, geom):
    """Polygon atau MultiPolygon GeoJSON; lubang dikecualikan."""
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"] if geom["type"] == "MultiPolygon" else []
    return any(_di_cincin(lon, lat, p[0]) and not any(_di_cincin(lon, lat, h) for h in p[1:]) for p in polys)


def _kotak(geom):
    pts = [pt for poly in ([geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]) for r in poly for pt in r]
    return min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)


def _norm(s):
    s = unicodedata.normalize("NFKD", str(s)).lower()
    s = re.sub(r"^(kab\.?|kabupaten)\s+", "", s.strip())
    return " ".join(re.findall(r"[a-z0-9]+", s))


def dalam_jejak(geom, fas):
    x0, y0, x1, y1 = _kotak(geom)
    out = {}
    for j, daftar in fas.items():
        out[j] = [f for f in daftar if x0 <= f[1] <= x1 and y0 <= f[0] <= y1 and di_dalam(f[1], f[0], geom)]
    return out


def dibi_pendidikan(dibi, prov, kab_nama, dari, sampai):
    """Jumlah f_pendidikan baris banjir resmi DIBI di kab itu; None bila tidak ada baris cocok (kosong bukan 0)."""
    cocok = [r for r in dibi["kejadian"] if r.get("prov_kode") == prov and _norm(r.get("kab")) == _norm(kab_nama)
             and dari <= r.get("tanggal", "") <= sampai and str(r.get("jenis", "")).lower().startswith("banjir") and r.get("bencana", 1) != 0]   # bencana 0 = di bawah ambang, bukan angka resmi; kunci tak ada = resmi
    return sum(r.get("f_pendidikan", 0) for r in cocok) if cocok else None


def bangun(geo, awal, dibi, muat_osm):
    meta = {k["kode"]: k for k in awal["kejadian"]}
    rows, butir = [], []
    for f in geo["features"]:
        kode = f["properties"]["kode"]
        m = meta.get(kode) or {}
        fas = {}
        for prov in m.get("prov") or []:
            o = muat_osm(prov)
            for j in JENIS + ("klinik",):
                fas.setdefault(j, []).extend(o.get(j) or [])
        isi = dalam_jejak(f["geometry"], fas)
        kab = sorted({k.split("|")[1] for k in m.get("kec") or [] if k.count("|") >= 2})
        prov = (m.get("prov") or [None])[0]
        dibi_n = [dibi_pendidikan(dibi, prov, k, m.get("sejak", ""), geo["hari"]) for k in kab]
        dibi_sum = None if all(x is None for x in dibi_n) else sum(x for x in dibi_n if x is not None)
        n = {j: len(isi.get(j, [])) for j in JENIS + ("klinik",)}
        rows.append({"kode": kode, "kab": ", ".join(kab) or None, "sejak": m.get("sejak"), **n, "dibi_f_pendidikan": dibi_sum,
                     "selisih_sekolah": None if dibi_sum is None else n["sekolah"] - dibi_sum})
        for j in JENIS:
            for lat, lon, nama in sorted((x[:3] for x in isi.get(j, [])), key=lambda x: x[2] or ""):   # kolom ke-4 (telepon) tidak pernah keluar
                butir.append({"kode": kode, "jenis": j, "nama_fasilitas": nama or "tanpa nama di OSM", "lat": round(lat, 4), "lon": round(lon, 4)})
    urut = {"rs": 0, "puskesmas": 1, "sekolah": 2}
    butir.sort(key=lambda b: (b["kode"], urut[b["jenis"]], b["nama_fasilitas"]))
    sumber_k = ["osm_nasional", "kejadian_aktif_geo", "dibi_kejadian"]
    k1 = rapor.kartu(
        id="rrs3-banjir", sistem="RRS-3", pil="Fasilitas sosial", ikon="peta", judul="Fasilitas di jejak banjir aktif",
        angka=[{"k": "kejadian", "label": "Kejadian banjir aktif berjejak", "nilai": len(rows)},
               {"k": "sekolah", "label": "Sekolah di dalam jejak", "nilai": sum(r["sekolah"] for r in rows)},
               {"k": "kesehatan", "label": "Puskesmas dan rumah sakit di dalam jejak", "nilai": sum(r["puskesmas"] + r["rs"] for r in rows)}],
        kolom=[{"k": "kode", "label": "Kejadian"}, {"k": "kab", "label": "Kab/kota"}, {"k": "sejak", "label": "Sejak"},
               {"k": "sekolah", "label": "Sekolah", "angka": True}, {"k": "puskesmas", "label": "Puskesmas", "angka": True},
               {"k": "rs", "label": "Rumah sakit", "angka": True}, {"k": "klinik", "label": "Klinik", "title": "dihitung tanpa nama", "angka": True},
               {"k": "dibi_f_pendidikan", "label": "DIBI fasilitas pendidikan", "title": "f_pendidikan DIBI kab, baris banjir resmi sejak tanggal kejadian; kosong = belum ada baris DIBI cocok", "angka": True},
               {"k": "selisih_sekolah", "label": "Selisih sekolah OSM lawan DIBI", "title": "tanda pendataan, bukan koreksi: sekolah OSM di jejak dikurangi f_pendidikan DIBI", "angka": True}],
        baris=[{k: r[k] for k in ("kode", "kab", "sejak", "sekolah", "puskesmas", "rs", "klinik", "dibi_f_pendidikan", "selisih_sekolah")} for r in rows],
        rumus="fasilitas OSM yang titiknya di dalam poligon kejadian banjir aktif; di dalam jejak belum tentu rusak",
        sumber=sumber_k, label=["proksi", "resmi"], asumsi=[LABEL_OSM])
    k2 = rapor.kartu(
        id="rrs3-daftar", sistem="RRS-3", pil="Fasilitas sosial", ikon="rumah", judul="Daftar fasilitas di jejak",
        angka=[], kolom=[{"k": "kode", "label": "Kejadian"}, {"k": "jenis", "label": "Jenis"}, {"k": "nama_fasilitas", "label": "Fasilitas"},
                         {"k": "lat", "label": "Lintang", "angka": True, "desimal": 4}, {"k": "lon", "label": "Bujur", "angka": True, "desimal": 4}],
        baris=butir, rumus="urut kejadian, lalu rumah sakit, puskesmas, sekolah", sumber=["osm_nasional", "kejadian_aktif_geo"],
        label=["proksi"], asumsi=[LABEL_OSM], unduh="fasilitas_sosial.csv")
    k3 = rapor.kartu(
        id="rrs3-gempa", sistem="RRS-3", pil="Fasilitas sosial", ikon="peta", judul="Fasilitas di jejak gempa MMI VII ke atas",
        angka=[{"k": "kejadian", "label": "Kejadian gempa berjejak MMI VII ke atas", "nilai": None,
                "title": "menunggu berkas jejak MMI per kejadian dari modul gempa"}],
        kolom=[], baris=[], rumus="fasilitas OSM di dalam jejak MMI VII ke atas per kejadian (menunggu berkas jejak)",
        sumber=["model_guncangan"], label=["proksi"])
    sumber = [{"nama": "OpenStreetMap kontributor (osm_nasional)", "url": "repo:public/data/osm_nasional", "diambil": geo["hari"], "lisensi": "ODbL 1.0"},
              {"nama": "Kejadian banjir aktif Centurisk97", "url": "repo:public/banjir/data/kejadian_aktif_geo.json", "diambil": geo["hari"], "lisensi": "hitungan Centurisk97"},
              {"nama": "DIBI BNPB per kab per hari", "url": "repo:public/data/dibi_kejadian.json", "diambil": dibi["dibuat"][:10], "lisensi": "data publik dasbor DIBI"}]
    b = rapor.berkas([k1, k2, k3], sumber)
    b["data"] = {"kejadian": rows, "fasilitas": butir, "hari": geo["hari"], "gempa": None}
    return b


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _osm(prov):
    p = os.path.join(OSM, f"{prov}.json")
    return _muat(p) if os.path.exists(p) else {}


def jalan():
    return {"fasilitas_sosial": bangun(_muat(GEO), _muat(AWAL), _muat(DIBI), _osm)}


def cek():
    kotak = {"type": "Polygon", "coordinates": [[[100, 0], [101, 0], [101, 1], [100, 1], [100, 0]], [[100.4, 0.4], [100.6, 0.4], [100.6, 0.6], [100.4, 0.6], [100.4, 0.4]]]}
    assert di_dalam(100.2, 0.2, kotak) and not di_dalam(100.5, 0.5, kotak) and not di_dalam(101.5, 0.5, kotak)   # lubang dan luar
    mmi7 = {"type": "MultiPolygon", "coordinates": [[[[110, -8], [111, -8], [111, -7], [110, -7], [110, -8]]]]}   # fixture jejak MMI >= VII
    assert di_dalam(110.5, -7.5, mmi7) and not di_dalam(112, -7.5, mmi7)
    osm = {"91": {"sekolah": [[0.2, 100.2, "SD Negeri 1"], [0.5, 100.5, "SD di lubang"], [2, 100.2, "SD luar"]],
                  "puskesmas": [[0.3, 100.3, "Puskesmas A", "0812-0000-0000"]], "rs": [], "klinik": [[0.1, 100.1, "Klinik Bidan Siti"]]}}
    geo = {"hari": "2026-11-20", "features": [{"properties": {"kode": "B0001"}, "geometry": kotak},
                                              {"properties": {"kode": "B0002"}, "geometry": mmi7}]}
    awal = {"kejadian": [{"kode": "B0001", "sejak": "2026-11-18", "prov": ["91"], "kec": ["91|Contoh Barat|Satu"]},
                         {"kode": "B0002", "sejak": "2026-11-19", "prov": ["91"], "kec": ["91|Kota Contoh|Dua"]}]}
    dibi = {"dibuat": "2026-11-23T00:00", "kejadian": [
        {"tanggal": "2026-11-19", "jenis": "Banjir", "prov_kode": "91", "kab": "Contoh Barat", "f_pendidikan": 3},
        {"tanggal": "2026-11-19", "jenis": "Banjir", "prov_kode": "91", "kab": "Contoh Barat", "bencana": 0, "f_pendidikan": 9},   # bukan resmi
        {"tanggal": "2026-11-10", "jenis": "Banjir", "prov_kode": "91", "kab": "Contoh Barat", "bencana": 1, "f_pendidikan": 5}]}  # sebelum kejadian
    b = bangun(geo, awal, dibi, lambda p: osm.get(p, {}))
    r = {x["kode"]: x for x in b["data"]["kejadian"]}
    assert (r["B0001"]["sekolah"], r["B0001"]["puskesmas"], r["B0001"]["klinik"]) == (1, 1, 1), r["B0001"]
    assert r["B0001"]["dibi_f_pendidikan"] == 3 and r["B0001"]["selisih_sekolah"] == -2, r["B0001"]   # ditandai, tidak dikoreksi
    assert r["B0002"]["sekolah"] == 0 and r["B0002"]["dibi_f_pendidikan"] is None and r["B0002"]["selisih_sekolah"] is None, r["B0002"]
    nama = [x["nama_fasilitas"] for x in b["data"]["fasilitas"]]
    assert nama == ["Puskesmas A", "SD Negeri 1"] and "Klinik Bidan Siti" not in json.dumps(b), nama
    assert "0812" not in json.dumps(b), "telepon OSM bocor"   # klinik tanpa nama
    assert b["kartu"][2]["angka"][0]["nilai"] is None   # gempa: menunggu data, bukan 0
    assert b["kartu"][0]["label"] == ["proksi", "resmi"] and b["kartu"][0]["asumsi"] == [LABEL_OSM]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    nyata = jalan()["fasilitas_sosial"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **nyata})
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", json.dumps(nyata["kartu"], ensure_ascii=False), re.I)
    a = {x["k"]: x["nilai"] for x in nyata["kartu"][0]["angka"]}
    print(f"rrs3.py --cek: lulus (banjir per {nyata['data']['hari']}: {a['kejadian']} kejadian, {a['sekolah']} sekolah, "
          f"{a['kesehatan']} puskesmas dan rumah sakit di jejak; gempa menunggu jejak MMI)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
