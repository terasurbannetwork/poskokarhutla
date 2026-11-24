"""Arsip deteksi per insiden sejak 1 Jul 2026 (IK-01, ADR-2 data/kajian-bnpb/insiden-kaya/DESAIN-TEKNIS.md) -> public/data/progresi/arsip/<id insiden>.json

Tarik mundur untuk insiden aktif di insiden.json: tiap petak unik (~375 m) yang pernah punya titik panas sejak ARSIP_DARI dan dekat insiden, dengan waktu pertama.
Sumber: public/data/titik_hari/<hari>.json (lokasi unik ~375 m per hari WIB, MODIS + VIIRS S-NPP/NOAA-20/NOAA-21, SP + NRT, keyakinan nominal+; sudah di repo dan di cache `data-`),
ditambah hotspot24.json (48 jam terakhir). Arsip negara FIRMS TANPA KUNCI untuk 2026 tidak ada (404 untuk viirs-snpp/noaa20/noaa21 dan modis, 24 Nov 2026), jadi arsip hari titik_hari yang dipakai.
Kedekatan = aturan tetapkan() insiden.py: di dalam garis luar insiden atau <= 1 km dari simpul garis/titik api/pusatnya (geometri insiden SAAT INI; api yang sudah menyusut tak terjangkau).
Epoch = waktu unik dibulatkan 30 menit dari deteksi di sel 1 derajat yang menyentuh kotak insiden +-1 derajat (aproksimasi per sel 1 derajat, bukan kotak persis).

Berkas: {"id", "dari", "dibuat", "sumber", "petak": [[iy, ix, t_pertama_menit, frp, sensor]] urut t, "epoch": [menit]}; iy/ix = floor(lat/0,0034), floor(lon/0,0034); menit sejak ARSIP_DARI 00:00 UTC.
Idempoten: berkas ada = digabung (t paling awal per petak, gabungan epoch). Maks MAKS_PETAK petak per insiden (yang paling awal). Rusak/hilang = mulai ulang.

Pakai:  python3 scripts/data/arsip_insiden.py          # DATA = INSIDEN_DATA atau public/data
        python3 scripts/data/arsip_insiden.py --uji
"""
import collections, datetime as dt, glob, json, math, os, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
import insiden as I  # noqa: E402

ARSIP_DARI = dt.datetime(2026, 7, 1, tzinfo=dt.timezone.utc)
SEL = 0.0034
MAKS_PETAK = 20000
WIB = dt.timezone(dt.timedelta(hours=7))


def menit(t):
    return int((t - ARSIP_DARI).total_seconds() // 60)


def baca_hari(data):
    """Semua titik sejak ARSIP_DARI: [(lat, lon, t_menit, frp, sensor)]; berkas rusak dilewati."""
    out = []
    for f in sorted(glob.glob(os.path.join(data, "titik_hari", "20??-??-??.json"))):
        try:
            d = json.load(open(f))
            h0 = dt.datetime.fromisoformat(d["hari"]).replace(tzinfo=WIB)
            if h0 + dt.timedelta(days=1) <= ARSIP_DARI:
                continue
            k = {n: i for i, n in enumerate(d["kolom"])} if isinstance(d["kolom"], list) else None
            sn = d["sensor_utama"]
            for r in d["baris"]:
                if r[5] >= 1:
                    out.append((r[0], r[1], menit(h0 + dt.timedelta(hours=r[2])), r[4], sn[r[3]]))
        except Exception as e:
            print("arsip_insiden: %s dilewati (%s)" % (os.path.basename(f), e), file=sys.stderr)
    return out


def baca_48(data):
    try:
        h = json.load(open(os.path.join(data, "hotspot24.json")))
        k = {n: i for i, n in enumerate(h["kolom"])}
        ac = I.baca_t(h["acuan"])
        return [(r[k["lat"]], r[k["lon"]], menit(ac + dt.timedelta(hours=r[k["jam"]])), r[k["frp"]], r[k["sensor"]]) for r in h["baris"] if r[k["keyakinan"]] >= 1]
    except Exception as e:
        print("arsip_insiden: hotspot24.json tak terbaca (%s)" % e, file=sys.stderr)
        return []


def semu(r):
    """Insiden -> bentuk 'kompleks' yang dipahami insiden.tetapkan."""
    return {"id": r["id"], "lat": r["pusat"][0], "lon": r["pusat"][1], "cincin": [[(p[0], p[1]) for p in g] for g in r.get("garis", [])],
            "api": [(p[1], p[0]) for p in r.get("api", [])]}


def bangun(ins, titik):
    """{id: berkas arsip tanpa gabung-lama} dari insiden aktif dan titik [(lat, lon, t_menit, frp, sensor)]."""
    ks = [semu(r) for r in ins.values() if r.get("status") == "aktif" and r.get("pusat")]
    per = I.tetapkan(ks, [(la, lo, t, sn, frp, 1) for la, lo, t, frp, sn in titik])
    ep = collections.defaultdict(set)    # sel 1 derajat -> epoch 30 menit
    for la, lo, t, _, _ in titik:
        ep[(math.floor(la), math.floor(lo))].add(t // 30 * 30)
    out = {}
    for c in ks:
        hs = per.get(c["id"])
        if not hs:
            continue
        pt = {}
        for la, lo, t, sn, frp, _ in hs:
            k = (math.floor(la / SEL), math.floor(lo / SEL))
            if k not in pt or t < pt[k][0]:
                pt[k] = (t, frp, sn)
        lat = [p[0] for g in c["cincin"] for p in g] and [p[1] for g in c["cincin"] for p in g] or [c["lat"]]
        lon = [p[0] for g in c["cincin"] for p in g] or [c["lon"]]
        e = set()
        for y in range(math.floor(min(lat) - 1), math.floor(max(lat) + 1) + 1):
            for x in range(math.floor(min(lon) - 1), math.floor(max(lon) + 1) + 1):
                e |= ep.get((y, x), set())
        out[c["id"]] = {"petak": sorted([[k[0], k[1], v[0], round(v[1], 1), v[2]] for k, v in pt.items()], key=lambda p: (p[2], p[0], p[1]))[:MAKS_PETAK], "epoch": sorted(e)}
    return out


def gabung(lama, baru):
    if not isinstance(lama, dict):
        return baru
    pt = {(p[0], p[1]): p for p in lama.get("petak", [])}
    for p in baru["petak"]:
        k = (p[0], p[1])
        if k not in pt or p[2] < pt[k][2]:
            pt[k] = p
    return {"petak": sorted(pt.values(), key=lambda p: (p[2], p[0], p[1]))[:MAKS_PETAK], "epoch": sorted(set(lama.get("epoch", [])) | set(baru["epoch"]))}


def tulis(path, isi):
    with tempfile.NamedTemporaryFile("w", dir=os.path.dirname(path), delete=False, suffix=".tmp") as f:
        f.write(json.dumps(isi, ensure_ascii=False, separators=(",", ":")))
    os.replace(f.name, path)


def main():
    data = I.DATA
    ins = I.muat_status(os.path.join(data, "insiden.json"))
    if not ins:
        print("arsip_insiden: insiden.json kosong/tak ada, dilewati")
        return
    arsip = bangun(ins, baca_hari(data) + baca_48(data))
    d = os.path.join(data, "progresi", "arsip")
    os.makedirs(d, exist_ok=True)
    for iid, b in arsip.items():
        p = os.path.join(d, iid + ".json")
        try:
            lama = json.load(open(p))
        except Exception:
            lama = None
        g = gabung(lama, b)
        tulis(p, dict(id=iid, dari=ARSIP_DARI.date().isoformat(), dibuat=I.fmt(dt.datetime.now(dt.timezone.utc)), sumber="titik_hari (MODIS+VIIRS, lokasi unik ~375 m/hari) + hotspot24", **g))
    print("arsip_insiden: %d insiden aktif, %d berarsip, %.1f MB" % (sum(1 for r in ins.values() if r.get("status") == "aktif"), len(arsip),
                                                                    sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d)) / 1e6))


def uji():
    ins = {"A": {"status": "aktif", "id": "A", "pusat": [-3.0, 112.0], "garis": [[[111.99, -3.01], [112.01, -3.01], [112.01, -2.99], [111.99, -2.99], [111.99, -3.01]]], "api": [[112.0, -3.0]]},
           "B": {"status": "tak_terdeteksi", "id": "B", "pusat": [-3.0, 113.0]}}
    titik = [(-3.0, 112.0, 100, 9.0, "N"), (-3.0, 112.0005, 50, 7.0, "N20"), (-3.0, 112.005, 700, 3.0, "M"), (-3.0, 112.0, 400, 1.0, "N21"),   # dua titik satu petak: t awal; petak lain
             (-3.0, 113.0, 100, 1.0, "N"), (-4.0, 112.0, 100, 1.0, "N")]                                                                          # B tak aktif; jauh
    a = bangun(ins, titik)
    assert list(a) == ["A"] and len(a["A"]["petak"]) == 2 and a["A"]["petak"][0][2] == 50 and a["A"]["petak"][0][4] == "N20", a
    assert a["A"]["epoch"] == [30, 90, 390, 690], a["A"]["epoch"]
    g = gabung(a["A"], {"petak": [[a["A"]["petak"][0][0], a["A"]["petak"][0][1], 10, 1.0, "N"], [1, 1, 5, 1.0, "M"]], "epoch": [0]})
    assert g["petak"][0][:3] == [1, 1, 5] and g["petak"][1][2] == 10 and len(g["petak"]) == 3 and g["epoch"][0] == 0
    assert gabung("rusak", a["A"]) == a["A"]
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, "titik_hari"))
        json.dump({"hari": "2026-07-02", "kolom": ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah"], "sensor_utama": ["M", "N", "N20", "N21"],
                   "baris": [[-3.0, 112.0, 1.0, 1, 5, 1, 0], [-3.0, 112.0, 2.0, 1, 5, 0, 0]]}, open(os.path.join(d, "titik_hari", "2026-07-02.json"), "w"))
        json.dump({"hari": "2026-06-29", "kolom": [], "sensor_utama": [], "baris": []}, open(os.path.join(d, "titik_hari", "2026-06-29.json"), "w"))
        open(os.path.join(d, "titik_hari", "2026-07-03.json"), "w").write("{rusak")
        t = baca_hari(d)
        assert t == [(-3.0, 112.0, (24 + 1 - 7) * 60, 5, "N")], t     # 2 Jul 01:00 WIB = 1 Jul 18:00 UTC
        assert len(t) == 1
    print("arsip_insiden uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["--uji"] else main()
