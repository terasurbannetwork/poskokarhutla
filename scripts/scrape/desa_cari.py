"""Desa/kelurahan se-Indonesia untuk kotak cari peta -> public/data/desa_cari.json (indeks) + public/geo/desa/<kab>.json (poligon).

Sumber: cahyadsn/wilayah_boundaries (MIT; kode & nama per Kepmendagri 300.2.2-2430/2025), diunduh per kab/kec ke data/raw/desa/
(cache; yang sudah ada tidak diunduh ulang). Poligon dibaca `riwayat_wilayah.desa_fitur`, disederhanakan Douglas-Peucker (`kawasan_cari.dp`).
Batas = digitasi sumber, BUKAN SK batas desa resmi; disederhanakan, cukup untuk menghitung titik panas di dalamnya.

Indeks: {"dibuat", "sumber", "kab": {"62.01": "Kotawaringin Barat"}, "baris": [[kd, nama, kec], ...]}; provinsi = kd[:2], kab = kab[kd[:5]].
Geo: FeatureCollection per kab, properties {"kd"}, MultiPolygon [lon, lat] 4 desimal (lubang dipertahankan).
Toleransi dipilih otomatis: yang terkecil dari TOLS yang membuat total public/geo/desa <= BATAS_MB.

Pakai:  python3 scripts/scrape/desa_cari.py         # unduh (sekuensial) + bangun + uji
        python3 scripts/scrape/desa_cari.py --uji   # uji keluaran saja
"""
import json, os, re, sys, time, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
from wilayah import PROVINSI  # noqa: E402
from riwayat_wilayah import desa_fitur  # noqa: E402
from kawasan_cari import dp, dalam, luas  # noqa: E402

REPO = "cahyadsn/wilayah_boundaries"
MENTAH = os.path.join(AKAR, "data/raw/desa")
INDEKS = os.path.join(AKAR, "public/data/desa_cari.json")
GEO = os.path.join(AKAR, "public/geo/desa")
UA = {"User-Agent": "PantauBencana/1.0 (centurisk97.id)"}
TOLS = [0.0015, 0.0017, 0.002, 0.0025, 0.003]  # derajat (~165-330 m); uji lokal: 0.0001 = 170 MB ... 0.0013 = 39,6 MB
BATAS_MB = 38          # anggaran 40 MB, sisakan ruang
LUAS_MIN = 1e-8        # derajat^2 (~120 m^2); cincin lebih kecil dibuang kecuali satu-satunya
SQL_NAMA = re.compile(r"\('(\d\d(?:\.\d\d){0,2})','((?:[^']|'')*)',")


def unduh(path, kembali=6):
    """Simpan raw.githubusercontent.com/<REPO>/main/<path> ke MENTAH (cache); sekuensial, mengulang dengan jeda."""
    berkas = os.path.join(MENTAH, os.path.basename(path))
    if os.path.exists(berkas):
        return berkas
    os.makedirs(MENTAH, exist_ok=True)
    for coba in range(kembali):
        try:
            isi = urllib.request.urlopen(urllib.request.Request(f"https://raw.githubusercontent.com/{REPO}/main/{path}", headers=UA), timeout=120).read()
            open(berkas + ".tmp", "wb").write(isi)
            os.replace(berkas + ".tmp", berkas)
            time.sleep(0.15)
            return berkas
        except Exception as e:
            print("unduh", path, coba, e, file=sys.stderr)
            time.sleep(5 * (coba + 1))
    return None


def tarik():
    """Unduh semua SQL kel per kab, kec & kab per provinsi. -> daftar path kel yang gagal."""
    pohon = json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.github.com/repos/{REPO}/git/trees/main?recursive=1", headers=UA), timeout=60))
    assert not pohon.get("truncated"), "pohon GitHub terpotong"
    gagal = []
    for f in pohon["tree"]:
        p = f["path"]
        if re.fullmatch(r"db/(kel/\d\d/wilayah_boundaries_kel_\d\d\.\d\d|kec/wilayah_boundaries_kec_\d\d|kab/wilayah_boundaries_kab_\d\d)\.sql", p):
            if not unduh(p):
                gagal.append(p)
    return gagal


def nama_sql(jenis, prov):
    """{kode: nama} dari SQL kec/kab satu provinsi."""
    return {m[1]: m[2].replace("''", "'") for m in SQL_NAMA.finditer(open(os.path.join(MENTAH, f"wilayah_boundaries_{jenis}_{prov}.sql"), encoding="utf-8").read())}


def ringkas(mp, tol):
    """MultiPolygon [lon,lat] -> disederhanakan, 4 desimal; None bila habis."""
    out = []
    for poli in mp:
        rs = []
        for r in poli:
            s = dp([(x, y) for x, y in r], tol)
            s = [(round(x, 4), round(y, 4)) for x, y in s]
            s = [p for i, p in enumerate(s) if i == 0 or p != s[i - 1]]
            if len(s) >= 4 and s[0] == s[-1]:
                rs.append(s)
        if rs and (luas(rs[0]) > LUAS_MIN):
            out.append([[list(p) for p in r] for r in rs if r is rs[0] or luas(r) > LUAS_MIN])
    return out


def bangun():
    gagal = tarik()
    kab, baris, mentah = {}, [], {}
    for prov in sorted(PROVINSI):
        kn = nama_sql("kab", prov)
        for k, n in kn.items():
            kab[k] = re.sub(r"^Kabupaten ", "", n)
        kec = nama_sql("kec", prov)
        for f in desa_fitur(prov):
            kd = f["properties"]["kode"]
            assert kd[:5] in kab and kd[:8] in kec, f"{kd}: kab/kec tak ada di SQL"
            baris.append([kd, f["properties"]["nama"], kec[kd[:8]]])
            mentah.setdefault(kd[:5], []).append((kd, f["geometry"]["coordinates"]))
    assert len({b[0] for b in baris}) == len(baris), "kode desa ganda"
    # pilih toleransi: coba dari yang paling halus, berhenti begitu muat
    for tol in TOLS:
        geo, total = {}, 0
        for k, daftar in mentah.items():
            fs = [{"type": "Feature", "properties": {"kd": kd}, "geometry": {"type": "MultiPolygon", "coordinates": mp}}
                  for kd, c in daftar if (mp := ringkas(c, tol))]
            s = json.dumps({"type": "FeatureCollection", "features": fs}, separators=(",", ":"))
            geo[k], total = s, total + len(s)
        print(f"tol {tol}: {total / 1e6:.1f} MB", flush=True)
        if total <= BATAS_MB * 1e6:
            break
    else:
        raise SystemExit("tak muat anggaran pada toleransi terbesar")
    ada = {f["properties"]["kd"] for s in geo.values() for f in json.loads(s)["features"]}
    baris = [b for b in baris if b[0] in ada]  # desa tanpa poligon tak bisa dihitung titiknya: tak masuk indeks
    os.makedirs(GEO, exist_ok=True)
    for f in os.listdir(GEO):
        os.remove(os.path.join(GEO, f))
    for k, s in geo.items():
        open(os.path.join(GEO, k + ".json"), "w").write(s)
    pakai = sorted({b[0][:5] for b in baris})
    json.dump({"dibuat": time.strftime("%Y-%m-%d"), "sumber": f"{REPO} (MIT), Kepmendagri 300.2.2-2430/2025; batas disederhanakan, bukan SK batas desa",
               "kab": {k: kab[k] for k in pakai}, "baris": baris}, open(INDEKS, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(baris)} desa ({len(mentah) } kab dari {len(kab)} di SQL), gagal unduh: {gagal or 'tidak ada'}, tol {tol}, "
          f"geo {total / 1e6:.1f} MB, indeks {os.path.getsize(INDEKS) / 1e6:.2f} MB")


def uji():
    d = json.load(open(INDEKS, encoding="utf-8"))
    kab, baris = d["kab"], d["baris"]
    assert len({b[0] for b in baris}) == len(baris), "kd ganda di indeks"
    indeks = {}
    for kd, n, kc in baris:
        assert kd[:5] in kab, f"{kd}: kab {kd[:5]} tak ada di d['kab']"
        assert kd[:2] in PROVINSI, f"{kd}: provinsi bukan kode BPS"
        assert n and kc, f"{kd}: nama/kecamatan kosong"
        indeks.setdefault(kd[:5], set()).add(kd)
    assert set(indeks) == set(kab), "kab di d['kab'] tanpa desa atau sebaliknya"
    total, poli = 0, {}
    for k in kab:
        p = os.path.join(GEO, k + ".json")
        total += os.path.getsize(p)
        fs = json.load(open(p))["features"]
        kds = [f["properties"]["kd"] for f in fs]
        assert len(kds) == len(set(kds)), f"{k}: kd ganda di geo"
        assert set(kds) == indeks[k], f"{k}: indeks vs geo beda: {sorted(set(kds) ^ indeks[k])[:5]}"
        for f in fs:
            xs = [c[0] for pl in f["geometry"]["coordinates"] for c in pl[0]]
            ys = [c[1] for pl in f["geometry"]["coordinates"] for c in pl[0]]
            assert 94 <= min(xs) and max(xs) <= 141.5 and -11.5 <= min(ys) and max(ys) <= 6.5, f"{f['properties']['kd']}: bbox di luar Indonesia"
            if f["properties"]["kd"] == "62.01.01.1012":
                poli["kumai"] = f["geometry"]["coordinates"]
    assert len(os.listdir(GEO)) == len(kab), "berkas geo/desa tak sama dengan jumlah kab"
    assert total <= 40e6, f"public/geo/desa {total / 1e6:.1f} MB > 40 MB"
    kumai = next(b for b in baris if b[0] == "62.01.01.1012")
    assert kumai[1] == "Kumai Hulu" and kumai[2] == "Kumai", kumai
    assert kab["62.01"] == "Kotawaringin Barat", kab["62.01"]
    # titik uji dari data mentah: pusat (lat,lng) desa; harus di dalam poligon (cincin luar, di luar lubang)
    m = next(f for f in desa_fitur("62") if f["properties"]["kode"] == "62.01.01.1012")["properties"]
    x, y = m["lng"], m["lat"]
    assert any(dalam(x, y, pl[0]) and not any(dalam(x, y, h) for h in pl[1:]) for pl in poli["kumai"]), f"Kumai Hulu tak memuat titik mentah {x},{y}"
    assert dalam(0.5, 0.5, [(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)]) and not dalam(2, 2, [(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
    print(f"uji desa_cari OK: {len(baris)} desa, {len(kab)} kab, geo {total / 1e6:.1f} MB, indeks {os.path.getsize(INDEKS) / 1e6:.2f} MB")


if __name__ == "__main__":
    if "--uji" not in sys.argv:
        bangun()
    uji()
