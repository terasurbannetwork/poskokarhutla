"""Prakiraan harian KAB2-OPS (PRAREG-KAB2.md §4-§5, §8 A1) -> arsip append-only data/banjir/arsip_kab2/YYYY-MM.jsonl (dilacak git, TIDAK dilayani situs)

BELUM TERUJI, TIDAK TAYANG: hanya bahan penilaian prospektif (dinilai paling cepat 2027-06-01). Tidak ada layar, tidak ada angka di status.

Sumber: data/banjir/kab2_ops/kandidat.json (salinan terlacak, dibuat mode `salin` dari data/raw/banjir/model_kab2_ops/; hanya dibaca), hujan.json (kisi 0,25 derajat), sampel.json (kab -> sel).
Gerbang: sidik kandidat HARUS sama dengan baris `sidik` terakhir scripts/banjir/model_kab2_ops.sidik di HEAD. Belum ada .sidik / baris sidik:
keluar 0 "KAB2-OPS belum dibekukan". Sidik beda atau kandidat hilang: keluar 2.

Fitur hari sasaran e (terbit d, e = d, d+1, d+2), sama dengan model_kab.bangun: per sel h1 = h[e], h3 = h[e-1..e+1] (GESER -1),
imax = maks imax e-1..e+1, sm = sm[e]; kab = MAKS atas selnya. pers_h3 = maks peringkat h3 terhadap batas persentil sel (kandidat);
frek_dibi, bahaya_b dari kandidat/sampel. level_aturan: DIHITUNG ulang dengan level_banjir(h3, bahaya sel, None, imax) per sel, maks atas
sel = persis ub.level_harian yang dipakai saat latih. Sengaja BUKAN status.json: itu level kecamatan (sungai, CAPE, ansambel) dan beda
satuan dengan fitur latih; arsip hujan bergulir tidak diperlukan karena level_banjir hanya butuh h3, imax, bahaya (tanpa A7/A30/API).
Kab yang selnya hilang/berlubang di hujan.json dilewati dan dicatat, tidak diisi karangan.

Arsip: satu baris per (terbit, kab, sasaran); baris lama tidak pernah diubah, ulang jalan hari yang sama tidak menggandakan.
Pakai:  python3 scripts/banjir/prediksi_kab2.py   |   ... salin   |   ... uji
"""
import bisect, datetime as dt, importlib.util, json, math, os, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import AKAR, KELUAR, MENTAH, WIB
from status import GESER, K_BANJIR, level_banjir

_s = importlib.util.spec_from_file_location("gbdt_sebaran", os.path.join(AKAR, "scripts/sebaran/gbdt.py"))
G = importlib.util.module_from_spec(_s)
_s.loader.exec_module(G)

KAND_RAW = os.path.join(MENTAH, "model_kab2_ops/kandidat.json")
KAND = os.path.join(AKAR, "data/banjir/kab2_ops/kandidat.json")
SAMPEL = os.path.join(MENTAH, "model_kab2/sampel.json")
HUJAN = os.path.join(KELUAR, "hujan.json")
ARSIP = os.path.join(AKAR, "data/banjir/arsip_kab2")
SIDIK = "scripts/banjir/model_kab2_ops.sidik"
TANDA = "belum teruji, tidak tayang"
LEAD = (0, 1, 2)


def sidik_head(repo=AKAR, rel=SIDIK):
    """Sidik pada baris `sidik` terakhir di HEAD; None bila berkas/baris belum ada di HEAD."""
    r = subprocess.run(["git", "-C", repo, "show", "HEAD:" + rel], capture_output=True)
    if r.returncode:
        return None
    s = [b for b in map(json.loads, filter(str.strip, r.stdout.decode().splitlines())) if b.get("jenis") == "sidik"]
    return s[-1]["sidik"] if s else None


def sidik_terakhir(isi):
    s = [b for b in map(json.loads, filter(str.strip, isi.splitlines())) if b.get("jenis") == "sidik"]
    return s[-1]["sidik"] if s else None


def salin(raw=None, tujuan=None, jejak=None):
    """Salin kandidat mentah ke jalur terlacak HANYA bila sidiknya = baris `sidik` terakhir .sidik di working tree; tolak bila salinan beda isi."""
    raw, tujuan, jejak = raw or KAND_RAW, tujuan or KAND, jejak or os.path.join(AKAR, SIDIK)
    if not os.path.exists(raw) or not os.path.exists(jejak):
        return "kandidat mentah atau .sidik tidak ada"
    b = open(raw, "rb").read()
    st = sidik_terakhir(open(jejak).read())
    if st is None or json.loads(b).get("sidik") != st:
        return f"sidik kandidat {json.loads(b).get('sidik')} != baris sidik terakhir {st}"
    if os.path.exists(tujuan):
        return None if open(tujuan, "rb").read() == b else f"{tujuan} sudah ada dengan isi beda: ditolak"
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    open(tujuan, "wb").write(b)
    return None


def fitur_kab(sel, g_sel, pers, e):
    """sel = [[lat, lon, bahaya_banjir, _]], g_sel = baris hujan.json tiap sel, e = indeks hari. -> dict fitur kab, atau None bila ada lubang."""
    f = {"h1": 0.0, "h3": 0.0, "imax": 0.0, "sm": 0.0, "pers_h3": 0.0, "level_aturan": 0}
    for (la, lo, b, _), g in zip(sel, g_sel):
        w = slice(e + GESER, e + GESER + 3)
        h = g["h"][w]
        ims = [x for x in g["imax"][w] if x is not None]
        if len(h) < 3 or None in h or g["h"][e] is None or g["sm"][e] is None:
            return None
        h3, imax = sum(h), max(ims) if ims else 0.0
        p = pers[f"{la:.3f}_{lo:.3f}"]
        for k, v in (("h1", g["h"][e]), ("h3", h3), ("imax", imax), ("sm", g["sm"][e]), ("pers_h3", bisect.bisect_left(p, h3) / len(p)),
                     ("level_aturan", level_banjir(h3, b, None, imax, k=K_BANJIR))):
            f[k] = max(f[k], v)
    return f


def peluang(mod, x):
    ps = []
    for a in mod["anggota"]:
        z = a["bias"] + sum(G.nilai_pohon(s, x) for s in a["pohon"])
        pl = a["platt"]
        ps.append(G.sigmoid(pl["b0"] + pl["b1"] * (z - pl["mu"]) / pl["sd"]))
    return sum(ps) / len(ps)


def baris_hari(kand, sam, hujan, terbit, waktu):
    """-> (baris arsip, daftar kab dilewati) untuk hari terbit `terbit` (date)."""
    hari = hujan["hari"]
    i0 = hari.index(terbit.isoformat())
    peta = {(round(g["lat"], 3), round(g["lon"], 3)): g for g in hujan["grid"]}
    out, lewat = [], []
    for kab in kand["kab"]:
        if kab not in sam["sk"]:
            lewat.append(kab)
            continue
        sel = sam["sk"][kab]
        gs = [peta.get((round(c[0], 3), round(c[1], 3))) for c in sel]
        if None in gs or kab not in kand["frek"]:
            lewat.append(kab)
            continue
        bh = max(c[2] for c in sel)
        for d in LEAD:
            e = i0 + d
            if e - 1 < 0 or e + 1 >= len(hari):
                lewat.append(f"{kab}+{d}")
                continue
            f = fitur_kab(sel, gs, kand["pers_batas"], e)
            if f is None:
                lewat.append(f"{kab}+{d}")
                continue
            sasaran = terbit + dt.timedelta(d)
            m = sasaran.month
            f.update(bulan_sin=math.sin(2 * math.pi * m / 12), bulan_cos=math.cos(2 * math.pi * m / 12), frek_dibi=kand["frek"][kab], bahaya_b=bh)
            x = [f.get(n, 0.0) for n in kand["fitur"]]             # kolom nonaktif (a7 dst) tak dibaca pohon
            out.append({"terbit": terbit.isoformat(), "kab": kab, "sasaran": sasaran.isoformat(), "lead": d,
                        "fitur": {n: round(f[n], 6) for n in kand["fitur_aktif"]}, "peluang": round(peluang(kand["model"], x), 6),
                        "sidik": kand["sidik"], "waktu": waktu, "status": TANDA})
    return out, lewat


def tulis_arsip(baris, dir_=ARSIP):
    """Tambah baris yang kuncinya (terbit, kab, sasaran) belum ada. Berkas rusak = berhenti (ValueError). -> jumlah baru."""
    os.makedirs(dir_, exist_ok=True)
    ada, baru = {}, 0
    for b in baris:
        n = os.path.join(dir_, b["terbit"][:7] + ".jsonl")
        if n not in ada:
            ada[n] = set()
            if os.path.exists(n):
                for i, t in enumerate(open(n), 1):
                    if t.strip():
                        try:
                            r = json.loads(t)
                            ada[n].add((r["terbit"], r["kab"], r["sasaran"]))
                        except (ValueError, KeyError):
                            raise ValueError(f"{n} baris {i} rusak: berhenti, tidak menulis")
        k = (b["terbit"], b["kab"], b["sasaran"])
        if k not in ada[n]:
            with open(n, "a") as f:
                f.write(json.dumps(b, sort_keys=True, ensure_ascii=False) + "\n")
            ada[n].add(k)
            baru += 1
    return baru


def jalan():
    sh = sidik_head()
    if sh is None:
        print("KAB2-OPS belum dibekukan (model_kab2_ops.sidik tanpa baris sidik di HEAD): tidak ada prakiraan")
        return 0
    if not os.path.exists(KAND):
        print(f"kandidat {KAND} tidak ada padahal sidik {sh} dibekukan", file=sys.stderr)
        return 2
    kand = json.load(open(KAND))
    if kand.get("sidik") != sh:
        print(f"sidik kandidat {kand.get('sidik')} != sidik HEAD {sh}: ditolak", file=sys.stderr)
        return 2
    hujan, sam = json.load(open(HUJAN)), json.load(open(SAMPEL))
    now = dt.datetime.now(WIB)
    if hujan.get("hari_ini") != now.date().isoformat():
        print(f"hujan.json hari_ini {hujan.get('hari_ini')} != hari WIB {now.date()}: basi, tidak ada prakiraan", file=sys.stderr)
        return 4
    baris, lewat = baris_hari(kand, sam, hujan, now.date(), now.isoformat(timespec="seconds"))
    if lewat:
        print(f"dilewati {len(lewat)}: {lewat[:6]}", file=sys.stderr)
    try:
        baru = tulis_arsip(baris)
    except ValueError as e:
        print(e, file=sys.stderr)
        return 3
    print(f"KAB2-OPS {kand['sidik']} terbit {now.date()}: {len(baris)} baris dihitung, {baru} baru ({TANDA})")
    return 0


# ------------------------------------------------------------------ swauji
def uji():
    global sidik_head, KAND, HUJAN, SAMPEL, ARSIP
    import io, contextlib
    # pemetaan sel + fitur e-1..e+1 (GESER) dan maks atas sel; hujan sintetis 10 hari, sel A dan B
    hari = [(dt.date(2026, 11, 1) + dt.timedelta(i)).isoformat() for i in range(10)]
    ga = {"lat": 1.0, "lon": 2.0, "h": [0, 10, 20, 30, 40, 50, 60, 70, 80, 90], "imax": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "sm": [.1 * i for i in range(10)]}
    gb = {"lat": 1.25, "lon": 2.0, "h": [5] * 10, "imax": [None, 25, 0, 0, 0, 0, 0, 0, 0, 0], "sm": [.9] * 10}
    gc = {"lat": 9.0, "lon": 9.0, "h": [1] * 10, "imax": [0] * 10, "sm": [0] * 10}
    hujan = {"hari": hari, "hari_ini": hari[3], "grid": [ga, gb, gc]}
    pers = {"1.000_2.000": [0, 10, 20, 30, 60, 90, 200, 300], "1.250_2.000": [0, 5, 10, 15, 20]}
    sel = [[1.0, 2.0, 0.8, 0], [1.25, 2.0, 0.1, 0]]
    f = fitur_kab(sel, [ga, gb], pers, 4)                       # e-1..e+1 = h[3..5] = 30+40+50
    assert f["h1"] == 40 and f["h3"] == 120 and f["imax"] == 5 and abs(f["sm"] - 0.9) < 1e-9, f           # sm maks atas sel (B)
    assert f["pers_h3"] == 0.75 == max(6 / 8, 3 / 5)                                                  # maks atas sel: A (6/8) mengalahkan B (3/5)
    assert f["level_aturan"] == max(level_banjir(120, 0.8, None, 5, k=K_BANJIR), level_banjir(15, 0.1, None, 0, k=K_BANJIR))
    g0 = fitur_kab(sel, [ga, gb], pers, 1)                      # B imax[0] = None disaring; e-1 = indeks 0 ada
    assert g0["h3"] == 0 + 10 + 20 and g0["imax"] == 25
    assert fitur_kab(sel, [{**ga, "h": [None] + ga["h"][1:]}, gb], pers, 1) is None   # lubang di jendela: dilewati, bukan karangan
    # model sintetis: satu biji, tanpa pohon, bias 0 -> p = sigmoid(b0) = 0,5 dengan Platt identitas
    mod = {"anggota": [{"bias": 0.0, "pohon": [], "platt": {"mu": 0, "sd": 1, "b0": 0.0, "b1": 1.0}},
                       {"bias": 0.0, "pohon": [], "platt": {"mu": 0, "sd": 1, "b0": 2.0, "b1": 1.0}}]}
    assert abs(peluang(mod, [0]) - (0.5 + G.sigmoid(2.0)) / 2) < 1e-12                  # rerata per biji, Platt per biji
    kand = {"sidik": "s1", "kab": ["99|X"], "frek": {"99|X": 0.01}, "pers_batas": pers, "fitur": ["h1", "h3", "a7", "imax", "pers_h3", "sm", "bulan_sin", "bulan_cos", "frek_dibi", "bahaya_b", "level_aturan"],
            "fitur_aktif": ["h1", "h3", "imax", "pers_h3", "sm", "bulan_sin", "bulan_cos", "frek_dibi", "bahaya_b", "level_aturan"], "model": mod}
    sam = {"sk": {"99|X": sel}}
    terbit = dt.date.fromisoformat(hari[3])
    b, lewat = baris_hari(kand, sam, hujan, terbit, "2026-11-04T07:30:00+07:00")
    assert [x["lead"] for x in b] == [0, 1, 2] and not lewat and b[0]["sasaran"] == hari[3] and b[2]["sasaran"] == hari[5]
    assert b[0]["fitur"]["bahaya_b"] == 0.8 and b[1]["fitur"]["h3"] == 120 and b[0]["fitur"]["h3"] == 90 and b[0]["status"] == TANDA and "a7" not in b[0]["fitur"]
    assert abs(b[0]["fitur"]["bulan_sin"] - math.sin(2 * math.pi * 11 / 12)) < 1e-6
    sam2 = {"sk": {"99|X": sel + [[7.0, 7.0, 0.5, 0]]}}                                 # sel tak ada di hujan.json: kab dilewati
    assert baris_hari(kand, sam2, hujan, terbit, "w") == ([], ["99|X"])
    # arsip append-only tanpa gandaan, bulan berbeda = berkas berbeda, berkas rusak = berhenti
    with tempfile.TemporaryDirectory() as t:
        assert tulis_arsip(b, t) == 3 and tulis_arsip(b, t) == 0                        # ulang hari yang sama: tak menggandakan
        n = os.path.join(t, "2026-11.jsonl")
        awal = open(n).read()
        b2 = [{**b[0], "terbit": "2026-11-05", "sasaran": "2026-11-05"}]
        assert tulis_arsip(b + b2, t) == 1 and open(n).read().startswith(awal) and len(open(n).read().splitlines()) == 4   # baris lama utuh
        assert tulis_arsip([{**b[0], "peluang": 0.99}], t) == 0 and open(n).read().count('"peluang": 0.99') == 0           # kunci sama: tak menimpa
        assert tulis_arsip([{**b[0], "terbit": "2026-12-01", "sasaran": "2026-12-01"}], t) == 1 and os.path.exists(os.path.join(t, "2026-12.jsonl"))
        open(n, "a").write("{rusak\n")
        try:
            tulis_arsip(b2, t)
            assert False
        except ValueError:
            pass
    # mode salin: sidik beda ditolak, sama disalin, salinan beda isi ditolak; arsip di luar public/
    assert os.path.relpath(ARSIP, AKAR) == "data/banjir/arsip_kab2" and not os.path.relpath(ARSIP, AKAR).startswith("public")
    with tempfile.TemporaryDirectory() as t:
        rw, tj, jj = (os.path.join(t, n) for n in ("raw.json", "d/salinan.json", "j.sidik"))
        open(jj, "w").write(json.dumps({"jenis": "sidik", "sidik": "a"}) + "\n" + json.dumps({"jenis": "uji26", "sidik": "z"}) + "\n")
        json.dump({"sidik": "b"}, open(rw, "w"))
        assert "!=" in salin(rw, tj, jj) and not os.path.exists(tj)                       # sidik beda: tidak disalin
        json.dump({"sidik": "a", "x": 1}, open(rw, "w"))
        assert salin(rw, tj, jj) is None and json.load(open(tj))["x"] == 1 and salin(rw, tj, jj) is None
        json.dump({"sidik": "a", "x": 2}, open(rw, "w"))
        assert "isi beda" in salin(rw, tj, jj) and json.load(open(tj))["x"] == 1           # salinan tak ditimpa
    # gerbang sidik: repo git sementara
    with tempfile.TemporaryDirectory() as t:
        git = lambda *a: subprocess.run(["git", "-C", t, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True)
        git("init", "-q")
        assert sidik_head(t, "j.sidik") is None                                             # belum ada berkas
        p = os.path.join(t, "j.sidik")
        open(p, "w").write(json.dumps({"jenis": "latih", "sidik": "a"}) + "\n")
        git("add", "j.sidik"); git("commit", "-q", "-m", "1")
        assert sidik_head(t, "j.sidik") is None                                             # latih saja belum beku
        open(p, "a").write(json.dumps({"jenis": "sidik", "sidik": "a"}) + "\n" + json.dumps({"jenis": "uji26", "sidik": "zzz"}) + "\n" + json.dumps({"jenis": "sidik", "sidik": "b"}) + "\n")
        assert sidik_head(t, "j.sidik") is None                                             # belum di-commit: HEAD yang berlaku
        git("add", "j.sidik"); git("commit", "-q", "-m", "2")
        assert sidik_head(t, "j.sidik") == "b"                                              # baris `sidik` TERAKHIR, bukan uji26
    # jalan(): belum dibeku -> 0; sidik beda -> 2; sidik sama tetapi hujan basi -> 4 (tidak menulis)
    asli = (sidik_head, KAND, HUJAN, SAMPEL, ARSIP)
    try:
        with tempfile.TemporaryDirectory() as t, contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            KAND, HUJAN, SAMPEL, ARSIP = (os.path.join(t, n) for n in ("k.json", "h.json", "s.json", "arsip"))
            sidik_head = lambda *a: None
            assert jalan() == 0 and not os.path.exists(ARSIP)
            sidik_head = lambda *a: "head1"
            assert jalan() == 2                                                             # kandidat hilang padahal beku
            json.dump({**kand, "sidik": "lain"}, open(KAND, "w"))
            assert jalan() == 2                                                             # sidik kandidat != HEAD
            json.dump({**kand, "sidik": "head1"}, open(KAND, "w")); json.dump(sam, open(SAMPEL, "w")); json.dump({**hujan, "hari_ini": "2000-01-01"}, open(HUJAN, "w"))
            assert jalan() == 4 and not os.path.exists(ARSIP)
    finally:
        sidik_head, KAND, HUJAN, SAMPEL, ARSIP = asli
    print("ok prediksi_kab2")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif sys.argv[1:] == ["salin"]:
        sys.exit(salin() or 0)
    else:
        sys.exit(jalan())
