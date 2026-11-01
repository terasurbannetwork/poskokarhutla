"""Prakiraan BMKG per kab/kota (satu desa wakil, adm4) -> public/banjir/data/cuaca_bmkg_prakiraan.json + arsip bulanan append-only.

API publik: https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=<kode>  (200 JSON dari runner Actions; dari Mac/sandbox 403, jadi uji pakai fixture).
Skema yang diharapkan (dokumentasi data.bmkg.go.id/prakiraan-cuaca): {lokasi{adm1..adm4,provinsi,kotkab,kecamatan,desa,lon,lat}, data[{cuaca:[[item 3 jam]]}]}
item: local_datetime, t, hu, weather_desc, ws (km/jam), wd, tp (mm), vs_text. SKEMA BELUM DIVERIFIKASI ke respons live: cek() mencatat baris
"skema BMKG" di log CI; kunci yang hilang membuat desa itu gagal (dihitung n_gagal), tidak dikarang.
Desa wakil: scripts/cuaca/data/desa_wakil_kab.json (dibangun `bangun` dari public/geo/desa + desa_cari.json: desa yang titik tengahnya terdekat ke titik tengah kab).
Arsip: public/banjir/data/cuaca_bmkg_arsip_<YYYY-MM>.json {"terbit": {tgl: {"hari":[3], "kab": {kode_kab: [[mm, kmj] x3]}}}}; entri tak pernah diubah.
Pakai: python3 scripts/cuaca/bmkg_prakiraan.py | ... bangun | ... uji
"""
import collections, datetime as dt, json, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, WIB, baca, simpan

URL = "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4="
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
DAFTAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "desa_wakil_kab.json")
MAKS_PER_MENIT, ANGGARAN_DETIK, HARI = 55, 15 * 60, 3


def bangun():
    """Pilih desa wakil per kab dari geometri desa (rata-rata titik sudut per desa; desa terdekat ke rata-rata kab)."""
    cari = json.load(open(os.path.join(AKAR, "public/data/desa_cari.json")))
    nama = {b[0]: b[1] for b in cari["baris"]}
    out = {}
    for kab, kn in cari["kab"].items():
        g = json.load(open(os.path.join(AKAR, f"public/geo/desa/{kab}.json")))
        pts = []
        for f in g["features"]:
            v = [p for poly in f["geometry"]["coordinates"] for ring in poly for p in ring]
            if v and f["properties"]["kd"] in nama:
                pts.append((f["properties"]["kd"], sum(p[0] for p in v) / len(v), sum(p[1] for p in v) / len(v)))
        if not pts:
            continue
        cx, cy = sum(p[1] for p in pts) / len(pts), sum(p[2] for p in pts) / len(pts)
        kd, x, y = min(pts, key=lambda p: (p[1] - cx) ** 2 + (p[2] - cy) ** 2)
        out[kab] = {"adm4": kd, "kab": kn, "desa": nama[kd]}
    simpan(DAFTAR, {"sumber": "public/geo/desa + desa_cari.json (Kepmendagri 300.2.2-2430/2025); kode BMKG bisa berbeda, desa gagal dihitung n_gagal", "kab": out})
    print(f"desa wakil: {len(out)} kab", file=sys.stderr)


def cek(d):
    """Cek skema; -> daftar item 3-jaman datar. Melempar bila bentuk tak sesuai."""
    assert isinstance(d, dict) and "lokasi" in d and "data" in d, f"kunci tingkat atas {list(d)[:6]}"
    it = [x for blok in d["data"][0]["cuaca"] for x in blok]
    assert it, "cuaca kosong"
    for k in ("local_datetime", "tp", "ws", "weather_desc"):
        assert k in it[0], f"item tanpa '{k}': {sorted(it[0])}"
    return it


def harian(items):
    """Item 3-jaman -> [(tgl, mm total, kmj maks, cuaca dominan)] urut tanggal lokal."""
    h = collections.OrderedDict()
    for x in sorted(items, key=lambda x: x["local_datetime"]):
        r = h.setdefault(x["local_datetime"][:10], [0.0, 0.0, collections.Counter()])
        r[0] += float(x["tp"] or 0)
        r[1] = max(r[1], float(x["ws"] or 0))
        r[2][x["weather_desc"]] += 1
    return [(t, round(r[0], 1), round(r[1]), r[2].most_common(1)[0][0]) for t, r in h.items()]


def ambil(kode):
    req = urllib.request.Request(URL + kode, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def olah(d, hari_ini):
    """-> entri kab: hari (maks HARI hari mulai hari_ini) + ringkasan harian + deret 3-jaman ringkas."""
    it = cek(d)
    hr = [h for h in harian(it) if h[0] >= hari_ini][:HARI]
    if not hr:
        raise ValueError("tak ada hari >= hari ini")
    tj = [[x["local_datetime"][5:16], float(x["tp"] or 0), round(float(x["ws"] or 0)), x["weather_desc"]] for x in sorted(it, key=lambda x: x["local_datetime"]) if x["local_datetime"][:10] >= hari_ini][:HARI * 8]
    return {"hari": [{"tgl": t, "mm": mm, "kmj": kj, "cuaca": c} for t, mm, kj, c in hr], "tigajam": tj}


def tambah(isi, terbit, e):
    if terbit in isi["terbit"]:
        return isi, False
    isi["terbit"][terbit] = e
    return isi, True


def main():
    daftar = baca(DAFTAR)
    if not daftar:
        raise RuntimeError("desa_wakil_kab.json tidak ada: jalankan `bangun`")
    hari_ini = dt.datetime.now(WIB).strftime("%Y-%m-%d")
    mulai, hasil, gagal, skema = time.time(), {}, 0, False
    for i, (kab, v) in enumerate(daftar["kab"].items()):
        if time.time() - mulai > ANGGARAN_DETIK:
            print(f"::warning title=bmkg_prakiraan::anggaran waktu habis di {i}/{len(daftar['kab'])}", file=sys.stderr)
            gagal += len(daftar["kab"]) - i
            break
        t0 = time.time()
        for coba in range(3):
            try:
                d = ambil(v["adm4"])
                e = olah(d, hari_ini)
                if not skema:
                    print(f"skema BMKG ok: lokasi={sorted(d['lokasi'])[:8]} item={sorted(cek(d)[0])}", file=sys.stderr)
                    skema = True
                e.update(adm4=v["adm4"], nama=v["kab"], desa=v["desa"])
                hasil[kab] = e
                break
            except Exception as x:
                if coba == 2:
                    gagal += 1
                    if gagal <= 5:
                        print(f"bmkg {kab} {v['adm4']}: {type(x).__name__} {x}", file=sys.stderr)
                else:
                    time.sleep(2 ** (coba + 1))
        time.sleep(max(0, 60 / MAKS_PER_MENIT - (time.time() - t0)))
    if not hasil:
        raise RuntimeError(f"BMKG tak satu pun berhasil (gagal {gagal}): berkas lama dibiarkan")
    dibuat = dt.datetime.now(WIB).isoformat(timespec="minutes")
    simpan(os.path.join(KELUAR, "cuaca_bmkg_prakiraan.json"), {"dibuat": dibuat, "hari_ini": hari_ini, "n_ok": len(hasil), "n_gagal": gagal, "sumber": "BMKG", "kab": hasil})
    ent = {"hari": [h["tgl"] for h in next(iter(hasil.values()))["hari"]], "kab": {k: [[h["mm"], h["kmj"]] for h in e["hari"]] for k, e in hasil.items()}}
    jalur = os.path.join(KELUAR, f"cuaca_bmkg_arsip_{hari_ini[:7]}.json")
    if os.path.exists(jalur):
        try:
            isi = json.load(open(jalur))
            assert isinstance(isi["terbit"], dict)
        except Exception as x:
            raise RuntimeError(f"{jalur} rusak ({x}): berhenti")
    else:
        isi = {"versi": 1, "bulan": hari_ini[:7], "kolom": ["mm", "kmj"], "sumber": "BMKG prakiraan-cuaca adm4 (desa wakil per kab); tidak diubah sesudah terbit", "terbit": {}}
    isi, baru = tambah(isi, hari_ini, ent)
    if baru:
        simpan(jalur, isi)
    print(f"bmkg prakiraan: {len(hasil)} ok, {gagal} gagal, arsip {'ditambah' if baru else 'sudah ada'} {hari_ini}", file=sys.stderr)


def uji():
    item = lambda t, tp, ws, w: {"local_datetime": t, "t": 28, "hu": 80, "weather_desc": w, "ws": ws, "wd": "N", "tp": tp, "vs_text": "> 10 km"}
    d = {"lokasi": {"adm4": "31.71.03.1001", "kotkab": "Kota Jakarta Pusat"}, "data": [{"cuaca": [
        [item("2026-11-01 07:00:00", 1.5, 10, "Hujan Ringan"), item("2026-11-01 13:00:00", 20, 30, "Hujan Lebat")],
        [item("2026-11-02 07:00:00", 0, 5, "Cerah"), item("2026-11-02 13:00:00", 0, 8, "Cerah"), item("2026-11-02 19:00:00", 0, 3, "Cerah Berawan")]]}]}
    e = olah(d, "2026-11-01")
    assert [h["tgl"] for h in e["hari"]] == ["2026-11-01", "2026-11-02"] and e["hari"][0]["mm"] == 21.5 and e["hari"][0]["kmj"] == 30, e
    assert e["hari"][1]["cuaca"] == "Cerah" and len(e["tigajam"]) == 5
    assert olah(d, "2026-11-02")["hari"][0]["tgl"] == "2026-11-02"
    try:
        cek({"data": []}); assert False
    except AssertionError as x:
        assert "kunci" in str(x)
    isi = {"terbit": {}}
    assert tambah(isi, "a", {"x": 1})[1] and not tambah(isi, "a", {"x": 2})[1] and isi["terbit"]["a"] == {"x": 1}
    dw = baca(DAFTAR)
    assert dw is None or all(len(v["adm4"].split(".")) == 4 for v in dw["kab"].values())
    print("ok bmkg_prakiraan", f"({len(dw['kab'])} kab)" if dw else "(tanpa daftar)")


if __name__ == "__main__":
    {"uji": uji, "bangun": bangun}.get(sys.argv[1] if len(sys.argv) > 1 else "", main)()
