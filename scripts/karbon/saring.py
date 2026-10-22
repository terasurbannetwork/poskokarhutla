"""Penyaringan massal: statistik §3.2 untuk tiap konsesi -> data/raw/karbon/saring.json (§3.3).

Pakai:  python3 scripts/karbon/saring.py [--konsesi public/data/lahan/konsesi.geojson]
            [--jenis hph,hti] [--min-ha 5000] [--nama 'regex'] [--paralel 6] [--unggah lokal|remote]
        python3 scripts/karbon/saring.py --uji

Bisa dilanjutkan: tiap hasil ditulis ke data/raw/karbon/saring_kemajuan.jsonl begitu selesai;
jalan ulang melewati id yang sudah ada (dan kueri GFW-nya pun ter-cache per geometri+SQL).
"""
import argparse, datetime, json, os, re, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

DI_SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DI_SINI)
from gfw import bersih  # noqa: E402
from statistik import statistik  # noqa: E402

AKAR = os.path.join(DI_SINI, "../..")
KELUAR = os.path.join(AKAR, "data/raw/karbon")
# Nama dari dokumen pemilik (COA/Wanatara): ikut disaring walau di bawah --min-ha
NAMA_PEMILIK = (r"pangean|sambarata|segah hulu|pimping|meraang|labanan|kunyit|semamu|inhutani ii|itci kayan|"
                r"ratah timber|segara indochem|gunung gajah|gema hutani|seitubu")


def pilih(fitur, jenis, min_ha, nama_re):
    pola = re.compile(nama_re, re.I) if nama_re else None
    for f in fitur:
        p = f["properties"]
        if p.get("jenis") not in jenis or not f.get("geometry"):
            continue
        if (p.get("luas_peta_ha") or 0) >= min_ha or (pola and pola.search(p.get("nama") or "")):
            yield f


def satu(f, tanya=None):
    return {**f["properties"], **(statistik(f["geometry"], tanya) if tanya else statistik(f["geometry"]))}


def _dalam(x, y, cincin):
    k = False
    for (x1, y1), (x2, y2) in zip(cincin, cincin[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            k = not k
    return k


def geom_ringan(f, tol=0.002):
    """Geometri ringan untuk peta dan tombol "Jadikan proyek". Lubang yang sesudah penyederhanaan menembus cincin luar
    dibuang: worker (src/karbon.js) menolak poligon begitu (22 Okt 2026, tol 0,003 membuat poligon HTI ditolak 400)."""
    from lahan import dp
    g = bersih(f["geometry"])
    polis = []
    for p in g["coordinates"]:
        rs = [[[round(x, 4), round(y, 4)] for x, y in dp([tuple(c) for c in r], tol)] for r in p]
        if len(rs[0]) >= 4:
            luar = rs[0]
            polis.append([luar] + [r for r in rs[1:] if len(r) >= 4 and all(_dalam(x, y, luar) for x, y in r)])
    return {"type": "Feature", "properties": {"id": f["properties"]["id"]},
            "geometry": {"type": "MultiPolygon", "coordinates": polis or g["coordinates"]}}


def jalan(fitur, keluar, paralel=6, sumber="", tanya=None, log=print):
    os.makedirs(keluar, exist_ok=True)
    kemajuan = os.path.join(keluar, "saring_kemajuan.jsonl")
    selesai = {}
    if os.path.exists(kemajuan):
        for b in open(kemajuan):
            if b.strip():
                r = json.loads(b)
                selesai[r["id"]] = r
    sisa = [f for f in fitur if f["properties"]["id"] not in selesai or "galat" in selesai[f["properties"]["id"]]]
    log(f"{len(fitur)} konsesi, {len(fitur) - len(sisa)} sudah ada, {len(sisa)} dikerjakan, paralel {paralel}")
    kunci, t0 = threading.Lock(), time.time()
    with open(kemajuan, "a") as out, ThreadPoolExecutor(paralel) as ex:
        tugas = {ex.submit(satu, f, tanya): f["properties"]["id"] for f in sisa}
        for i, fu in enumerate(as_completed(tugas), 1):
            ident = tugas[fu]
            try:
                r = fu.result()
            except Exception as e:  # satu poligon gagal tidak menghentikan yang lain
                r = {"id": ident, "galat": f"{type(e).__name__}: {e}"[:300]}
            with kunci:
                selesai[ident] = r
                out.write(json.dumps(r, ensure_ascii=False) + "\n")
                out.flush()
            if i % 20 == 0 or i == len(sisa):
                log(f"{i}/{len(sisa)} {time.time() - t0:.0f} dtk")
    ids = [f["properties"]["id"] for f in fitur]
    baris = [selesai[i] for i in ids if "galat" not in selesai[i]]
    hasil = {"dibuat": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
             "sumber_konsesi": sumber, "n": len(baris),
             "gagal": [{"id": i, "galat": selesai[i]["galat"]} for i in ids if "galat" in selesai[i]],
             "baris": baris}
    tulis(os.path.join(keluar, "saring.json"), hasil)
    ok = {b["id"] for b in baris}
    tulis(os.path.join(keluar, "saring_geom.json"),
          {"type": "FeatureCollection", "features": [geom_ringan(f) for f in fitur if f["properties"]["id"] in ok]})
    return hasil


def tulis(p, d):
    with open(p + ".part", "w") as f:
        json.dump(d, f, separators=(",", ":"), ensure_ascii=False)
    os.replace(p + ".part", p)


def unggah(keluar, mode):
    for n in ("saring.json", "saring_geom.json"):
        subprocess.run(["npx", "wrangler", "r2", "object", "put", f"poskokarhutla-foto/karbon/{n}",
                        "--file", os.path.join(keluar, n), "--content-type", "application/json", f"--{mode}"],
                       cwd=AKAR, check=True)


def uji():
    import tempfile
    sq = lambda x: {"type": "Polygon", "coordinates": [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]]}
    fitur = [{"type": "Feature", "properties": {"id": f"k{i}", "nama": n, "jenis": j, "luas_peta_ha": ha}, "geometry": sq(i)}
             for i, (n, j, ha) in enumerate([("A", "hph", 9000), ("PT Inhutani I (pangean)", "hph", 10), ("B", "sawit", 9e5), ("C", "hti", 100)])]
    assert [f["properties"]["id"] for f in pilih(fitur, {"hph", "hti"}, 5000, NAMA_PEMILIK)] == ["k0", "k1"]
    fx = json.load(open(os.path.join(AKAR, "tests/karbon/fixtures/pangean_gfw.json")))
    gagal_sekali = {"k1": 1}

    def tanya(n, g):
        x = g["coordinates"][0][0][0] if g["type"] == "Polygon" else g["coordinates"][0][0][0][0]
        if x == 1 and gagal_sekali["k1"]:
            gagal_sekali["k1"] = 0
            raise RuntimeError("GFW 503")
        return fx[n]
    with tempfile.TemporaryDirectory() as d:
        sel = list(pilih(fitur, {"hph", "hti"}, 5000, NAMA_PEMILIK))
        h = jalan(sel, d, 2, "uji", tanya, log=lambda *a: None)
        assert h["n"] == 1 and h["gagal"][0]["id"] == "k1", h["gagal"]
        assert "geometry" not in h["baris"][0] and h["baris"][0]["nama"] == "A" and h["baris"][0]["hutan2000_ha"] > 50000
        h = jalan(sel, d, 2, "uji", tanya, log=lambda *a: None)  # lanjut: hanya yang gagal diulang
        assert h["n"] == 2 and not h["gagal"] and [b["id"] for b in h["baris"]] == ["k0", "k1"]
        assert sum(1 for _ in open(os.path.join(d, "saring_kemajuan.jsonl"))) == 3
        g = json.load(open(os.path.join(d, "saring_geom.json")))
        assert [f["properties"] for f in g["features"]] == [{"id": "k0"}, {"id": "k1"}]
    print("saring ok")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
        sys.exit()
    sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
    a = argparse.ArgumentParser()
    a.add_argument("--konsesi", default="public/data/lahan/konsesi.geojson")
    a.add_argument("--jenis", default="hph,hti")
    a.add_argument("--min-ha", type=float, default=5000)
    a.add_argument("--nama", default=NAMA_PEMILIK, help="regex nama yang ikut walau di bawah --min-ha ('' = tidak ada)")
    a.add_argument("--paralel", type=int, default=6)
    a.add_argument("--keluar", default=KELUAR)
    a.add_argument("--unggah", choices=["lokal", "remote"])
    o = a.parse_args()
    fitur = list(pilih(json.load(open(os.path.join(AKAR, o.konsesi)))["features"], set(o.jenis.split(",")), o.min_ha, o.nama))
    h = jalan(fitur, o.keluar, o.paralel, o.konsesi, log=lambda *x: print(*x, flush=True))
    print(f"selesai: {h['n']} ok, {len(h['gagal'])} gagal")
    if o.unggah:
        unggah(o.keluar, "local" if o.unggah == "lokal" else "remote")
