"""Arsip deteksi per insiden sejak 1 Jul 2026 (IK-01, ADR-2 data/kajian-bnpb/insiden-kaya/DESAIN-TEKNIS.md) -> public/data/progresi/arsip/<id insiden>.json

Tarik mundur untuk insiden aktif di insiden.json: tiap petak unik (~375 m) yang pernah punya titik panas sejak ARSIP_DARI dan dekat insiden, dengan waktu pertama.
Sumber: public/data/titik_hari/<hari>.json (lokasi unik ~375 m per hari WIB, MODIS + VIIRS S-NPP/NOAA-20/NOAA-21, SP + NRT, keyakinan nominal+; sudah di repo dan di cache `data-`),
ditambah hotspot24.json (48 jam terakhir). Arsip negara FIRMS TANPA KUNCI untuk 2026 tidak ada (404 untuk viirs-snpp/noaa20/noaa21 dan modis, 24 Nov 2026), jadi arsip hari titik_hari yang dipakai.
Kedekatan = aturan tetapkan() insiden.py: di dalam garis luar insiden atau <= 1 km dari simpul garis/titik api/pusatnya (geometri insiden SAAT INI; api yang sudah menyusut tak terjangkau).
Epoch = waktu unik dibulatkan 30 menit dari deteksi di sel 1 derajat yang menyentuh kotak insiden +-1 derajat (aproksimasi per sel 1 derajat, bukan kotak persis).

Berkas: {"id", "dari", "dibuat", "sumber", "petak": [[iy, ix, t_pertama_menit, frp, sensor, t_akhir_menit]] urut t, "petak_m": [[iy, ix, t, frp]], "epoch": [menit], "terpotong": bool};
iy/ix = floor(lat/0,0034), floor(lon/0,0034); menit sejak ARSIP_DARI 00:00 UTC. `petak` HANYA VIIRS (375 m, bahan progresi.py dan paparan_insiden.py); `petak_m` MODIS (1 km, hanya informasi, tidak dipakai hitungan);
`t_akhir` = deteksi terakhir yang tercatat (titik_hari menyimpan deteksi pertama per lokasi per hari, jadi ini batas bawah). Epoch memakai semua sensor.
Idempoten: berkas ada = digabung (t paling awal per petak, t_akhir terbesar, gabungan epoch). Maks MAKS_PETAK petak per insiden (yang paling awal); kelebihan = `terpotong: true` (progresi menulis tersedia:false, bukan garis depan berhenti tumbuh diam-diam).
Rusak/hilang = mulai ulang. `pangkas()`: arsip gabung / tak berekaman / tak_terdeteksi lebih dari SIMPAN_HARI dihapus bersama progresi/<id>.json; total > MAKS_BYTES: tak_terdeteksi terbesar dibuang dulu.

Pakai:  python3 scripts/data/arsip_insiden.py          # DATA = INSIDEN_DATA atau public/data
        python3 scripts/data/arsip_insiden.py --uji
"""
import collections, datetime as dt, glob, json, math, os, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
import insiden as I  # noqa: E402

ARSIP_DARI = dt.datetime(2026, 7, 1, tzinfo=dt.timezone.utc)
SEL = 0.0034
MAKS_PETAK = 20000
MAKS_BYTES = 40_000_000
VIIRS = {"N", "N20", "N21"}
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
        pt, pm = {}, {}
        for la, lo, t, sn, frp, _ in hs:
            k = (math.floor(la / SEL), math.floor(lo / SEL))
            if sn not in VIIRS:
                if k not in pm or t < pm[k][0]:
                    pm[k] = (t, frp)
                continue
            if k not in pt:
                pt[k] = [t, frp, sn, t]
            else:
                if t < pt[k][0]:
                    pt[k][:3] = [t, frp, sn]
                pt[k][3] = max(pt[k][3], t)
        lat = [p[0] for g in c["cincin"] for p in g] and [p[1] for g in c["cincin"] for p in g] or [c["lat"]]
        lon = [p[0] for g in c["cincin"] for p in g] or [c["lon"]]
        e = set()
        for y in range(math.floor(min(lat) - 1), math.floor(max(lat) + 1) + 1):
            for x in range(math.floor(min(lon) - 1), math.floor(max(lon) + 1) + 1):
                e |= ep.get((y, x), set())
        pl = sorted([[k[0], k[1], v[0], round(v[1], 1), v[2], v[3]] for k, v in pt.items()], key=lambda p: (p[2], p[0], p[1]))
        ml = sorted([[k[0], k[1], v[0], round(v[1], 1)] for k, v in pm.items()], key=lambda p: (p[2], p[0], p[1]))
        out[c["id"]] = {"petak": pl[:MAKS_PETAK], "petak_m": ml[:MAKS_PETAK], "epoch": sorted(e), "terpotong": len(pl) > MAKS_PETAK}
    return out


def gabung(lama, baru):
    if not isinstance(lama, dict):
        return baru
    pt = {(p[0], p[1]): list(p) for p in lama.get("petak", []) if len(p) >= 5}
    for p in baru["petak"]:
        k = (p[0], p[1])
        if k not in pt:
            pt[k] = list(p)
        else:
            a = pt[k]
            akhir = max(a[5] if len(a) > 5 else a[2], p[5] if len(p) > 5 else p[2])
            if p[2] < a[2]:
                a[:5] = p[:5]
            a[5:] = [akhir]
    pm = {(p[0], p[1]): p for p in lama.get("petak_m", [])}
    for p in baru.get("petak_m", []):
        k = (p[0], p[1])
        if k not in pm or p[2] < pm[k][2]:
            pm[k] = p
    pl = sorted(pt.values(), key=lambda p: (p[2], p[0], p[1]))
    return {"petak": pl[:MAKS_PETAK], "petak_m": sorted(pm.values(), key=lambda p: (p[2], p[0], p[1]))[:MAKS_PETAK],
            "epoch": sorted(set(lama.get("epoch", [])) | set(baru["epoch"])), "terpotong": bool(lama.get("terpotong") or baru.get("terpotong") or len(pl) > MAKS_PETAK)}


def pangkas(data, ins, sekarang=None):
    """IK-01: hapus arsip (dan progresi/<id>.json) insiden gabung, tak berekaman, atau tak_terdeteksi > SIMPAN_HARI; lalu tutup MAKS_BYTES. -> daftar id dihapus."""
    sekarang = sekarang or dt.datetime.now(dt.timezone.utc)
    d = os.path.join(data, "progresi", "arsip")
    ada = {f[:-5]: os.path.getsize(os.path.join(d, f)) for f in os.listdir(d) if f.endswith(".json")} if os.path.isdir(d) else {}
    hapus = []
    for iid in ada:
        r = ins.get(iid) or {}
        st = r.get("status")
        if st is None or st == "gabung":
            hapus.append(iid)
        elif st == "tak_terdeteksi":
            try:
                if sekarang - I.baca_t(r["tak_terdeteksi"]) > dt.timedelta(days=I.SIMPAN_HARI):
                    hapus.append(iid)
            except Exception:
                pass
    sisa = sum(v for k, v in ada.items() if k not in hapus)
    for iid in sorted((k for k in ada if k not in hapus and (ins.get(k) or {}).get("status") == "tak_terdeteksi"), key=lambda k: -ada[k]):
        if sisa <= MAKS_BYTES:
            break
        hapus.append(iid)
        sisa -= ada[iid]
    if sisa > MAKS_BYTES:
        print("::warning title=arsip::arsip %.1f MB melebihi batas %.0f MB walau tak_terdeteksi sudah habis" % (sisa / 1e6, MAKS_BYTES / 1e6))
    for iid in hapus:
        for p in (os.path.join(d, iid + ".json"), os.path.join(data, "progresi", iid + ".json")):
            if os.path.exists(p):
                os.remove(p)
    return hapus


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
    n_hapus = len(pangkas(data, ins))
    for iid, b in arsip.items():
        p = os.path.join(d, iid + ".json")
        try:
            lama = json.load(open(p))
        except Exception:
            lama = None
        g = gabung(lama, b)
        tulis(p, dict(id=iid, dari=ARSIP_DARI.date().isoformat(), dibuat=I.fmt(dt.datetime.now(dt.timezone.utc)), sumber="titik_hari (MODIS+VIIRS, lokasi unik ~375 m/hari) + hotspot24", **g))
    print("arsip_insiden: %d insiden aktif, %d berarsip, %d dipangkas, %d terpotong, %.1f MB" % (sum(1 for r in ins.values() if r.get("status") == "aktif"), len(arsip), n_hapus,
                                                                    sum(1 for f in os.listdir(d) if json.load(open(os.path.join(d, f))).get("terpotong")),
                                                                    sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d)) / 1e6))


def uji():
    ins = {"A": {"status": "aktif", "id": "A", "pusat": [-3.0, 112.0], "garis": [[[111.99, -3.01], [112.01, -3.01], [112.01, -2.99], [111.99, -2.99], [111.99, -3.01]]], "api": [[112.0, -3.0]]},
           "B": {"status": "tak_terdeteksi", "id": "B", "pusat": [-3.0, 113.0]}}
    titik = [(-3.0, 112.0, 100, 9.0, "N"), (-3.0, 112.0005, 50, 7.0, "N20"), (-3.0, 112.005, 700, 3.0, "M"), (-3.0, 112.0, 400, 1.0, "N21"),   # dua titik satu petak: t awal; petak lain
             (-3.0, 113.0, 100, 1.0, "N"), (-4.0, 112.0, 100, 1.0, "N")]                                                                          # B tak aktif; jauh
    a = bangun(ins, titik)
    assert list(a) == ["A"] and len(a["A"]["petak"]) == 1 and a["A"]["petak"][0][2] == 50 and a["A"]["petak"][0][4] == "N20", a
    assert a["A"]["petak"][0][5] == 400, "t_akhir = deteksi VIIRS terakhir"
    assert len(a["A"]["petak_m"]) == 1 and a["A"]["petak_m"][0][2] == 700 and not a["A"]["terpotong"], "MODIS terpisah dari petak VIIRS"
    assert a["A"]["epoch"] == [30, 90, 390, 690], a["A"]["epoch"]
    g = gabung(a["A"], {"petak": [[a["A"]["petak"][0][0], a["A"]["petak"][0][1], 10, 1.0, "N", 10], [1, 1, 5, 1.0, "N", 9]], "epoch": [0]})
    assert g["petak"][0][:3] == [1, 1, 5] and g["petak"][1][2] == 10 and g["petak"][1][5] == 400 and len(g["petak"]) == 2 and g["epoch"][0] == 0
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
    # melebihi MAKS_PETAK ditandai terpotong, bukan dibuang diam-diam
    global MAKS_PETAK
    lama, MAKS_PETAK = MAKS_PETAK, 2
    banyak = bangun({"A": ins["A"]}, [(-3.0 + i * 0.0035, 112.0, 10 + i, 1.0, "N") for i in range(4)])
    MAKS_PETAK = lama
    assert len(banyak["A"]["petak"]) == 2 and banyak["A"]["terpotong"] is True and banyak["A"]["petak"][0][2] == 10, banyak
    assert gabung(banyak["A"], a["A"])["terpotong"] is True
    # pangkas: gabung, tak berekaman, tak_terdeteksi lama dihapus; aktif dan tak_terdeteksi baru tetap; tutup ukuran membuang tak_terdeteksi terbesar
    with tempfile.TemporaryDirectory() as d:
        ar = os.path.join(d, "progresi", "arsip")
        os.makedirs(ar)
        for k in "AGZLB":
            open(os.path.join(ar, k + ".json"), "w").write("x" * 100)
            open(os.path.join(d, "progresi", k + ".json"), "w").write("x")
        sk = dt.datetime(2026, 11, 24, tzinfo=dt.timezone.utc)
        ii = {"A": {"status": "aktif"}, "G": {"status": "gabung", "ke": "A"}, "L": {"status": "tak_terdeteksi", "tak_terdeteksi": "2026-11-01T00:00Z"},
              "B": {"status": "tak_terdeteksi", "tak_terdeteksi": "2026-11-23T00:00Z"}}
        assert sorted(pangkas(d, ii, sk)) == ["G", "L", "Z"], "gabung, lama, tak berekaman"
        assert sorted(os.listdir(ar)) == ["A.json", "B.json"] and not os.path.exists(os.path.join(d, "progresi", "G.json"))
        MAKS = MAKS_BYTES
        globals()["MAKS_BYTES"] = 150
        assert pangkas(d, ii, sk) == ["B"] and os.listdir(ar) == ["A.json"], "tutup ukuran: tak_terdeteksi dibuang, aktif tidak"
        globals()["MAKS_BYTES"] = MAKS
    print("arsip_insiden uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["--uji"] else main()
