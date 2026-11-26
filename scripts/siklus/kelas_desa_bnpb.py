"""Kelas bahaya desa BNPB -> kelas kab (PH-01, potensi-hidromet D7, D8, ALGORITMA 5).

Sumber: berkas publik dashboard hidromet InaRISK BNPB (hidromet_kab.json, impact/index.json, impact/<id>.json).
Keluaran: public/data/kelas_desa_bnpb.json (per kab: jumlah desa per kelas, K kab, 50 desa teratas)
dan public/data/kelas_desa/<kab4>.json (kelas per desa). Cache mentah di data/raw/siklus/kelas_desa_bnpb (gitignored).
Kelas 0 / kosong = belum terukur (null), tidak pernah rendah. Kode kab = Kemendagri dari awalan adm4 desa.
Pakai: python3 -I scripts/siklus/kelas_desa_bnpb.py --bangun [--cache] | --cek | --banding
"""
import datetime, hashlib, importlib.util, json, os, sys, time, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(AB, "../.."))
CACHE = os.path.join(AKAR, "data/raw/siklus/kelas_desa_bnpb")
KELUAR = os.path.join(AKAR, "public/data/kelas_desa_bnpb.json")
KEL_KAB = os.path.join(AKAR, "public/data/kelas_desa")
LAMA = os.path.join(AKAR, "public/data/kelas_bahaya_kab.json")
BASE = "https://inarisk.bnpb.go.id/dashboard-monev-bencana/dashboard-hidromet/data"
UA = "Mozilla/5.0 (compatible; riset-bencana)"
BAHAYA = ("BNJ", "BDG", "LSR", "GEL", "KHT", "KEK")  # urutan sumber
NAMA_KELAS = {1: "rendah", 2: "sedang", 3: "tinggi"}
DESA_MIN = 80000


def kelas_kab(c):
    """c = [n0 tanpa kelas, n1 rendah, n2 sedang, n3 tinggi] -> 'tinggi'|'sedang'|'rendah'|None (ALGORITMA 5)."""
    n0, n1, n2, n3 = c
    N = n0 + n1 + n2 + n3
    if N == 0 or n1 + n2 + n3 == 0:
        return None
    if n3 * 5 >= N * 2:  # K6 pemilik 26 Nov 2026: syarat '30 desa dan 10 persen' dibuang
        return "tinggi"
    if n3 * 10 >= N or n3 >= 10 or (n2 + n3) * 5 >= N * 3:
        return "sedang"
    return "rendah"


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def _ambil(nama, url, pakai_cache):
    p = os.path.join(CACHE, nama)
    if pakai_cache and os.path.exists(p):
        return open(p, "rb").read()
    time.sleep(1)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
        b = r.read()
    json.loads(b)  # harus JSON sah sebelum masuk cache
    os.makedirs(CACHE, exist_ok=True)
    open(p, "wb").write(b)
    return b


def _digit(s, i):
    return int(s[i]) if len(s) == 6 and s.isdigit() else 0


def hitung(hid, desa_baris, sah, nama_ke_kab4=None):
    """desa_baris = baris sumber + kunci "Prov|Kab" di akhir. Kode kab dari awalan adm4 bila sah, selain itu dari nama.
    -> (kab{}, per_kab_desa{}, tak_terpetakan[], beda_nama_awalan)"""
    kab, per, tak, beda, _nm = {}, {}, set(), 0, {}
    for r in desa_baris:
        kode, kunci = r[0], r[-1]
        awal = (kode[:2] + kode[3:5]) if len(kode) >= 5 and kode[2] == "." else None
        if kunci not in _nm:
            _nm[kunci] = (nama_ke_kab4 or (lambda _: None))(kunci)
        dari_nama = _nm[kunci]
        k4 = awal if awal in sah else dari_nama
        if awal in sah and dari_nama and awal != dari_nama:
            beda += 1
        if kunci.startswith("Tanpa provinsi") or k4 not in sah:
            tak.add(kunci)
            continue
        b, p = str(r[6]), str(r[7])
        e = kab.setdefault(k4, {"n": 0, "baseline": {c: [0] * 4 for c in BAHAYA}, "proyeksi": {c: [0] * 4 for c in BAHAYA}})
        e["n"] += 1
        for i, c in enumerate(BAHAYA):
            e["baseline"][c][_digit(b, i)] += 1
            e["proyeksi"][c][_digit(p, i)] += 1
        per.setdefault(k4, []).append([kode, r[1], r[2], b, p])
    for e in kab.values():
        e["K"] = {c: kelas_kab(e["baseline"][c]) for c in BAHAYA}
    return kab, per, sorted(tak), beda


def _k4_hid(r, sah):
    a = str(r.get("adm4") or "")
    k4 = (a[:2] + a[3:5]) if len(a) >= 5 and a[2] == "." else None
    return k4 if k4 in sah else None


def periksa_hb(hid, kab, sah):
    """Banding hb sumber lawan hitung ulang dari baris desa; -> (cocok, beda[], tanpa_peta[])"""
    cocok, beda, tanpa = 0, [], []
    for r in hid["kab"]:
        k4 = _k4_hid(r, sah)
        if k4 not in kab or r.get("p") == "Tanpa provinsi" or "/" in r.get("k", ""):
            tanpa.append("%s|%s" % (r.get("p"), r.get("k")))
            continue
        if [list(x) for x in r["hb"]] == [kab[k4]["baseline"][c] for c in BAHAYA]:
            cocok += 1
        else:
            beda.append(k4)
    return cocok, beda, tanpa


def teratas(per, n=50):
    baris = []
    for k4, ds in per.items():
        for d in ds:
            n3 = sum(1 for ch in d[3] if ch == "3")
            baris.append((-n3, -sum(int(ch) for ch in d[3] if ch.isdigit()), d[0], [d[0], d[1], d[2], k4, n3, d[3], d[4]]))
    baris.sort(key=lambda x: x[:3])
    return [x[3] for x in baris[:n]]


def bentuk_sah(hid, idx):
    return (isinstance(hid, dict) and isinstance(hid.get("kab"), list) and len(hid["kab"]) > 400
            and all(len(r.get("hb", [])) == 6 and len(r["hb"][0]) == 4 for r in hid["kab"])
            and isinstance(idx, dict) and isinstance(idx.get("regions"), list) and idx["regions"])


def bangun(pakai_cache):
    sah = _muat("siklus_kunci", "scripts/siklus/kunci.py").SAH
    hb = _ambil("hidromet_kab.json", BASE + "/hidromet_kab.json", pakai_cache)
    ib = _ambil("impact_index.json", BASE + "/impact/index.json", pakai_cache)
    hid, idx = json.loads(hb), json.loads(ib)
    if not bentuk_sah(hid, idx):
        sys.exit("bentuk berkas sumber berubah; keluaran lama tidak ditimpa")
    baris = []
    for rg in idx["regions"]:
        d = json.loads(_ambil("impact_%s.json" % rg["id"], "%s/impact/%s.json" % (BASE, rg["id"]), pakai_cache))
        if not isinstance(d.get("d"), list) or any(len(r) < 8 for r in d["d"]):
            sys.exit("bentuk impact/%s.json berubah; keluaran lama tidak ditimpa" % rg["id"])
        baris += [r + [d["kabs"][r[3]]] for r in d["d"]]
    if len(baris) < DESA_MIN:
        sys.exit("jumlah desa %d < %d; keluaran lama tidak ditimpa" % (len(baris), DESA_MIN))
    kk = _muat("bnpb_kunci_kejadian_nama", "scripts/siklus/kunci.py").kab4
    kab, per, tak, bed = hitung(hid, baris, sah, lambda kunci: kk(kunci.split("|", 1)[1]) if "|" in kunci else None)
    cocok, beda, tanpa = periksa_hb(hid, kab, sah)
    nama = {}
    for r in hid["kab"]:
        k4 = _k4_hid(r, sah) or kk(r["k"])
        if k4 and "/" not in r["k"] and r["p"] != "Tanpa provinsi":
            nama[k4] = r["k"]
    jml_hb = sum(r["n"] for r in hid["kab"])
    kab_out = {}
    for k4 in sorted(kab):
        e = kab[k4]
        kab_out[k4] = {"nama": nama.get(k4), "n": e["n"], "baseline": e["baseline"], "proyeksi": e["proyeksi"], "K": e["K"]}
    hari = datetime.date.today().isoformat()
    out = {"versi": 1, "dibuat": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
           "sumber": {"nama": "BNPB InaRISK, kelas bahaya desa", "url": BASE + "/hidromet_kab.json", "tgl_tarik": hari,
                      "sha256": hashlib.sha256(hb).hexdigest()},
           "bahaya": list(BAHAYA),
           "kelas": "jumlah desa per kelas [tanpa kelas/belum terukur, rendah, sedang, tinggi]; K = kelas kab dari sebaran desa baseline, null = belum terukur",
           "catatan_proyeksi": hid["meta"].get("note", "Tahun baseline, skenario, dan periode proyeksi tidak tercantum di sumber."),
           "kab": kab_out, "desa_teratas_kolom": ["kode", "nama", "kecamatan", "kab4", "jumlah_kelas3", "baseline6", "proyeksi6"],
           "desa_teratas": teratas(per)}
    out["sumber"]["catatan"] = "desa dihitung ulang dari baris impact: %d desa, hb sumber %d (selisih %d); n per kab bisa sedikit di bawah hb" % (len(baris), jml_hb, jml_hb - len(baris))
    os.makedirs(KEL_KAB, exist_ok=True)
    for f in os.listdir(KEL_KAB):
        if f.endswith(".json"):
            os.remove(os.path.join(KEL_KAB, f))
    prov = {}
    for k4, ds in per.items():
        ds.sort(key=lambda d: d[0])
        prov.setdefault(k4[:2], {})[k4] = ds
    for pp, kb in prov.items():
        _tulis(os.path.join(KEL_KAB, pp + ".json"), {"prov": pp, "bahaya": list(BAHAYA), "kab": kb})
    _tulis(KELUAR, out)
    print("desa di baris %d (hb sumber %d, selisih %d), kab %d, tak terpetakan: %s, beda nama vs awalan adm4: %d" % (len(baris), jml_hb, jml_hb - len(baris), len(kab), tak, bed))
    print("hb sumber persis sama hitung ulang: %d kab; beda: %d kab; baris hidromet tanpa peta: %s" % (cocok, len(beda), tanpa))
    mak = max(abs(sum(sum(kab[k]["baseline"][c]) for c in BAHAYA[:1]) - next(r["n"] for r in hid["kab"] if _k4_hid(r, sah) == k)) for k in beda) if beda else 0
    print("selisih desa terbesar per kab:", mak)
    ringkas()


def _tulis(p, o):
    t = p + ".tmp"
    with open(t, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(t, p)


def ringkas():
    d = json.load(open(KELUAR, encoding="utf-8"))
    print("ukuran %s: %.0f KB; kab/kelas per bahaya:" % (os.path.basename(KELUAR), os.path.getsize(KELUAR) / 1024))
    for c in BAHAYA:
        h = {}
        for e in d["kab"].values():
            h[e["K"][c]] = h.get(e["K"][c], 0) + 1
        print(" ", c, "tinggi", h.get("tinggi", 0), "sedang", h.get("sedang", 0), "rendah", h.get("rendah", 0), "belum terukur", h.get(None, 0))
    tot = sum(os.path.getsize(os.path.join(KEL_KAB, f)) for f in os.listdir(KEL_KAB))
    print("berkas per provinsi: %d, total %.1f MB" % (len(os.listdir(KEL_KAB)), tot / 1048576))


def banding():
    n, l = json.load(open(KELUAR, encoding="utf-8")), json.load(open(LAMA, encoding="utf-8"))
    for baru, lama in (("BNJ", "banjir"), ("LSR", "longsor")):
        m = {}
        for k4, e in n["kab"].items():
            a = e["K"][baru]
            b = (l["kab"].get(k4, {}).get(lama) or {}).get("K") if k4 in l["kab"] else "(tak ada)"
            m[(a, b)] = m.get((a, b), 0) + 1
        print("%s (baris = baru BNPB, kolom = lama raster)" % baru)
        for (a, b), v in sorted(m.items(), key=lambda x: (str(x[0][0]), str(x[0][1]))):
            print("  baru %-8s lama %-8s %d" % (a, b, v))


def _uji():
    assert kelas_kab([0, 0, 0, 0]) is None and kelas_kab([100, 0, 0, 0]) is None, "semua 0 -> null"
    assert kelas_kab([0, 0, 0, 100]) == "tinggi" and kelas_kab([60, 0, 0, 40]) == "tinggi", "40 persen"
    assert kelas_kab([270, 0, 0, 30]) == "sedang", "30 desa dan 10 persen bukan lagi tinggi (K6)"
    assert kelas_kab([271, 0, 0, 29]) == "sedang" and kelas_kab([670, 0, 0, 30]) == "sedang", "30 desa tapi di bawah 10 persen"
    assert kelas_kab([90, 0, 0, 10]) == "sedang", "10 persen"
    assert kelas_kab([991, 0, 0, 9]) == "rendah" and kelas_kab([90, 0, 0, 9]) == "rendah", "9 desa dan 9 persen"
    assert kelas_kab([89, 1, 0, 10]) == "sedang" and kelas_kab([990, 0, 0, 10]) == "sedang", "10 desa"
    assert kelas_kab([40, 0, 59, 1]) == "sedang" and kelas_kab([41, 0, 58, 1]) == "rendah", "60 persen kelas 2-3"
    assert kelas_kab([0, 5, 0, 0]) == "rendah"
    assert _digit("230002", 0) == 2 and _digit("230002", 5) == 2 and _digit("", 0) == 0 and _digit("23000", 0) == 0
    kab, per, tak, _ = hitung({}, [["11.05.06.2014", "A", "K", 0, 1, 2, "300002", "311112", 1, "P|A"], ["99.99.01.0001", "B", "K", 0, 1, 2, "111111", "111111", 2, "P|B"]], {"1105"})
    assert tak == ["P|B"] and kab["1105"]["n"] == 1 and kab["1105"]["baseline"]["BNJ"] == [0, 0, 0, 1]
    assert kab["1105"]["K"]["BNJ"] == "tinggi" and kab["1105"]["K"]["BDG"] is None and kab["1105"]["K"]["GEL"] is None and kab["1105"]["K"]["KEK"] == "sedang"
    assert kab["1105"]["baseline"]["GEL"] == [1, 0, 0, 0] and kab["1105"]["baseline"]["KEK"] == [0, 0, 1, 0]
    if os.path.exists(KELUAR):
        d = json.load(open(KELUAR, encoding="utf-8"))
        assert d["bahaya"] == list(BAHAYA) and len(d["kab"]) > 400 and d["sumber"]["sha256"]
        assert sum(e["n"] for e in d["kab"].values()) >= DESA_MIN and len(d["desa_teratas"]) == 50
        assert d["sumber"]["catatan"]
        pv = [f for f in os.listdir(KEL_KAB) if f.endswith(".json")]
        assert 30 <= len(pv) <= 45 and all(len(f) == 7 for f in pv), pv
        tot = 0
        for f in pv:
            j = json.load(open(os.path.join(KEL_KAB, f), encoding="utf-8"))
            assert j["prov"] == f[:2] and all(k[:2] == j["prov"] and all(len(x) == 5 and len(x[3]) == 6 for x in v) for k, v in j["kab"].items())
            tot += sum(len(v) for v in j["kab"].values())
        assert tot == sum(e["n"] for e in d["kab"].values())
        for e in d["kab"].values():
            assert set(e["K"]) == set(BAHAYA) and all(len(v) == 4 and sum(v) == e["n"] for v in e["baseline"].values())
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--cek" in a:
        _uji()
    elif "--banding" in a:
        banding()
    elif "--bangun" in a:
        bangun("--cache" in a)
    else:
        print(__doc__)
