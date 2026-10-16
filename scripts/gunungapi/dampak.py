"""Dampak gunung api -> public/gunungapi/data/dampak.json

  terpapar  jiwa dalam radius rekomendasi PVMBG tiap gunung berstatus Level II ke atas (penduduk_radius di public/data/gunungapi_status.json,
            WorldPop kisi 25 km, jadi ORDE BESAR, bukan hitungan desa), per gunung dan per level. Tanpa jaringan.
  tahunan   kejadian erupsi dan korbannya per tahun 2010-2024 (BNPB, data.bnpb.go.id, jenis "ERUPSI GUNUNG API"): kejadian, meninggal, terdampak,
            mengungsi, rumah rusak. Hanya angka yang tercatat; bila BNPB tak bisa diakses dan belum ada berkas lama, bagian ini tidak ada (A18).
            DIBI BNPB tidak dipakai: dasbor Superset-nya tak menjawab dari luar peramban (dicek 16 Okt 2026).
Sengaja tak ada sekolah dan fasilitas kesehatan dalam radius: public/data/sekolah.json dan fasilitas.json hanya mencakup provinsi prioritas karhutla, jadi angkanya akan kurang.
Pakai:  python3 scripts/gunungapi/dampak.py        tulis berkas
        python3 scripts/gunungapi/dampak.py uji    self-check
"""
import datetime as dt, json, os, re, sys, time, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
API = "https://data.bnpb.go.id/api/3/action/"
JENIS = "ERUPSI GUNUNG API"
METRIK = [("kejadian", r"Jumlah Kejadian Bencana"), ("meninggal", r"Korban Meninggal"), ("terdampak", r"Korban Terdampak"),
          ("mengungsi", r"Korban Mengungsi"), ("rumah_rusak", r"Jumlah Rumah Rusak")]
KELUAR = os.path.join(AKAR, "public/gunungapi/data/dampak.json")


def terpapar(gunung):
    """[{nama, prov, level, radius_km, penduduk_radius}] -> {jiwa, gunung, per_level, daftar}. Hanya gunung berradius dan berpenduduk > 0."""
    d = sorted((g for g in gunung if g.get("radius_km") and g.get("penduduk_radius", 0) > 0), key=lambda g: -g["penduduk_radius"])
    per = {}
    for g in d:
        o = per.setdefault(str(g["level"]), {"gunung": 0, "jiwa": 0}); o["gunung"] += 1; o["jiwa"] += g["penduduk_radius"]
    return {"jiwa": sum(g["penduduk_radius"] for g in d), "gunung": len(d), "per_level": per,
            "daftar": [{"nama": g["nama"], "prov": g["prov"], "level": g["level"], "radius_km": g["radius_km"], "jiwa": g["penduduk_radius"]} for g in d]}


def ambil(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return json.load(r)
        except Exception as e:
            if i == 2:
                raise RuntimeError(f"{url[:90]}: {e}")
            time.sleep(4 * (i + 1))


def tahunan():
    """{tahun: {kunci: angka}} nasional untuk ERUPSI GUNUNG API dari sumber daya 'Menurut Jenis Bencana Tahun 2010-2024' tiap metrik."""
    res = {}
    for q in ("kompilasi data kejadian dampak bencana", "jumlah kejadian bencana menurut provinsi"):
        for p in ambil(f"{API}package_search?q={urllib.parse.quote(q)}&rows=50")["result"]["results"]:
            if p["name"].startswith(("kompilasi", "data-bencana")):
                for r in ambil(f"{API}package_show?id={p['name']}")["result"]["resources"]:
                    if r.get("datastore_active"):
                        res.setdefault(r["name"].strip(), r["id"])
                time.sleep(.4)
    out = {}
    for kunci, pola in METRIK:
        nama = next((n for n in res if re.search(pola, n, re.I) and re.search(r"Menurut Jenis Bencana|Akibat Bencana Tahun 2010", n, re.I) and re.search(r"2010-20\d\d", n)), None)
        if not nama:
            continue
        try:
            baris = ambil(f"{API}datastore_search?resource_id={res[nama]}&limit=200")["result"]["records"]
        except RuntimeError as e:   # sumber daya terdaftar tapi datastore-nya hilang (Korban Meninggal, 16 Okt 2026): kunci itu dilewati, bukan diisi 0
            print(f"  {kunci} dilewati: {e}", file=sys.stderr)
            continue
        for r in baris:
            if str(r.get("JENIS BENCANA", "")).strip().upper() == JENIS:
                for k, v in r.items():
                    m = re.fullmatch(r"(20\d\d)(\.0)?", k)
                    if m and v is not None:
                        out.setdefault(m.group(1), {})[kunci] = int(float(v))
    return dict(sorted(out.items()))


def tulis():
    st = json.load(open(os.path.join(AKAR, "public/data/gunungapi_status.json")))
    lama = json.load(open(KELUAR)) if os.path.exists(KELUAR) else {}
    try:
        th = tahunan()
    except RuntimeError as e:
        print(f"BNPB gagal: {e}; pakai berkas lama bila ada", file=sys.stderr)
        th = lama.get("tahunan") or {}
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "status_dibuat": st["dibuat"], "terpapar": terpapar(st["gunung"])}
    if th:
        out["tahunan"] = th
    out["sumber"] = {"terpapar": "MAGMA Indonesia, PVMBG (radius rekomendasi); WorldPop 2026 (penduduk, kisi 25 km)", "tahunan": "BNPB, data.bnpb.go.id (Data Bencana Indonesia 2010-2024)"}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    t = out["terpapar"]
    print(f"dampak gunungapi: {t['jiwa']:,} jiwa dalam radius {t['gunung']} gunung; tahunan {len(th)} tahun")


def uji():
    t = terpapar([{"nama": "A", "prov": "X", "level": 3, "radius_km": 5, "penduduk_radius": 1000}, {"nama": "B", "prov": "Y", "level": 2, "radius_km": 2, "penduduk_radius": 300},
                  {"nama": "C", "prov": "Z", "level": 3, "radius_km": 5, "penduduk_radius": 0}, {"nama": "D", "prov": "Z", "level": 1}])
    assert t["jiwa"] == 1300 and t["gunung"] == 2 and t["per_level"]["3"] == {"gunung": 1, "jiwa": 1000} and t["daftar"][0]["nama"] == "A", t
    print("dampak gunungapi: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
