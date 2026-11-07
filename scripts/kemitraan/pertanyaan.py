#!/usr/bin/env python3
"""Generator pertanyaan Kemitraan Kampus (ALGORITMA.md §6, KM-C01 + KM-C02 bagian Python).
Bank templat = scripts/kemitraan/pertanyaan.json (sumber; --cek menyalinnya ke public/data/kemitraan/).
Fungsi murni: syarat(ekspr, nilai), susun_panduan(templat, nilai, mengapa), nilai_dari_profil(profil, masalah, ctx), panduan(...).
`nilai` = satu dict datar: slot (teks yang disisipkan; None = templat dibuang) + kunci syarat (angka/bool; kunci hilang atau None = syarat salah).
Tanpa eval/Function: syarat dipecah `and`, tiap bagian `<kunci> <op> <angka|true|false>` (ALG §6.1).
Pakai: python3 -I scripts/kemitraan/pertanyaan.py --cek | --paritas"""
import glob, json, os, re, shutil, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from konst import KONST  # noqa: E402
import masalah  # noqa: E402  (mentah/idn/vonis: angka asli kejadian dan tren, pemformat Indonesia)

BANK = os.path.join(AKAR, "scripts", "kemitraan", "pertanyaan.json")
PUBLIK = os.path.join(AKAR, "public", "data", "kemitraan", "pertanyaan.json")
DAERAH = os.path.join(AKAR, "public", "data", "kemitraan", "daerah")
ACUAN = os.path.join(AKAR, "tests", "kemitraan", "fixtures", "acuan.json")
ARAH, ASPEK, BAHAYA, NARASUMBER = KONST["ARAH"], list(KONST["ASPEK"]), KONST["BAHAYA"], list(KONST["NARASUMBER"])
PD = KONST["PANDUAN"]
RISET_MAKS = 8  # PRD F-M6: 3-8 pertanyaan riset
SLOT_SAH = ("wilayah", "prov", "bahaya", "n_kejadian", "periode", "tren_kata", "kec_teratas", "dokumen_kurang", "jiwa_rentan",
            "skor_irbi", "kelas_irbi", "dampak_12bln", "kampus_terdekat", "model_status")  # TIKET KM-C01
KUNCI_SYARAT = ("rpb", "renkon", "perda_pb", "perda_bpbd", "bpbd", "H", "F", "T", "D", "P", "K", "skor", "gambut_pct",
                "tren_naik", "tren_turun", "model_gagal")
NAMA_B = {**masalah.NAMA, "udara": "kualitas udara", "multi": "beberapa bahaya sekaligus"}
INARISK = {"banjir": "banjir", "longsor": "longsor", "gempa": "gempa", "gunungapi": "gunungapi", "kekeringan": "kekeringan",
           "karhutla": "karhutla", "cuaca_ekstrem": "cuaca", "abrasi_rob": "gelombang", "multi": "multi"}  # bahaya -> kunci inarisk_kec
DOK = (("perda_pb", "perda penanggulangan bencana"), ("perda_bpbd", "perda pembentukan BPBD"),
       ("rpb", "rencana penanggulangan bencana (RPB)"), ("renkon", "rencana kontinjensi"))
RE_SLOT = re.compile(r"\{(\w+)\}")
RE_SYARAT = re.compile(r"^\s*([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)\s*(true|false|-?\d+(?:\.\d+)?)\s*$")
RE_AND = re.compile(r"\s+and\s+")
OPS = {"==": lambda a, b: a == b, "!=": lambda a, b: a != b, ">=": lambda a, b: a >= b,
       "<=": lambda a, b: a <= b, ">": lambda a, b: a > b, "<": lambda a, b: a < b}


# ---------------------------------------------------------------- syarat (ALG §6.1)
def urai_syarat(ekspr):
    """-> [(kunci, op, nilai)]; kosong/None = []; salah bentuk -> ValueError (tidak pernah dieksekusi sebagai kode)."""
    if ekspr is None or not str(ekspr).strip():
        return []
    out = []
    for bag in RE_AND.split(str(ekspr)):
        m = RE_SYARAT.match(bag)
        if not m:
            raise ValueError(f"syarat salah bentuk: {bag!r} dalam {ekspr!r}")
        k, op, lit = m.groups()
        v = True if lit == "true" else False if lit == "false" else float(lit)
        if isinstance(v, bool) and op not in ("==", "!="):
            raise ValueError(f"operator {op} tidak berlaku untuk true/false: {ekspr!r}")
        out.append((k, op, v))
    return out


def syarat(ekspr, nilai):
    """True bila semua bagian benar. Kunci hilang/None atau beda jenis (bool vs angka) = salah, bukan galat."""
    for k, op, v in urai_syarat(ekspr):
        x = nilai.get(k)
        if x is None or isinstance(x, bool) != isinstance(v, bool) or not isinstance(x, (int, float, bool)):
            return False
        if not OPS[op](x, v):
            return False
    return True


# ---------------------------------------------------------------- slot dari profil (ALG §6.2)
def _daftar(xs):
    return xs[0] if len(xs) == 1 else " dan ".join(xs) if len(xs) == 2 else ", ".join(xs[:-1]) + ", dan " + xs[-1]


def _dampak(d):
    if not d or any(d.get(k) is None for k in ("meninggal", "mengungsi", "rr_berat")):
        return None
    i = masalah.idn
    return f"{i(d['meninggal'], 0)} meninggal, {i(d['mengungsi'], 0)} mengungsi, dan {i(d['rr_berat'], 0)} rumah rusak berat"


def _status_model(p, b):
    sub = masalah.UJI_BAHAYA.get(b)
    u = ((p.get("model") or {}).get("uji")) or {}
    if not sub or not u:
        return None
    s = [u.get(x) for x in sub]
    if all(x == "gagal" for x in s):
        return "gagal uji balik nasional"
    if all(x == "lolos" for x in s):
        return "lolos uji balik nasional"
    return "belum teruji lengkap"


def nilai_dari_profil(p, m=None, ctx=None):
    """Profil kab (+ masalah {B, A}) -> dict datar slot + kunci syarat. Slot tanpa data = None (bukan 0, bukan '')."""
    b = (m or {}).get("B")
    v = dict.fromkeys(SLOT_SAH + KUNCI_SYARAT)
    kp, kj, pd, ir = (p.get(x) or {} for x in ("kapasitas", "kejadian", "penduduk", "irbi"))
    v["wilayah"] = p.get("nama")
    v["prov"] = (ctx or {}).get("prov_nama")
    v["periode"] = "2000-2025" if b == "gempa" else "2015-2025"
    if b:
        v["bahaya"] = NAMA_B.get(b)
        mt = masalah.mentah(p, b, {})
        f = mt["ket"].get("F")
        if f and f[0] is not None:
            n, js = f
            satuan = "titik panas" if js == ("viirs",) else "gempa M5+ dalam radius 100 km" if js == ("gempa100",) else f"kejadian {NAMA_B[b]}"
            v["n_kejadian"] = f"{masalah.idn(n, 0)} {satuan}"
        kata = (mt["ket"].get("T") or (None, None))[0]
        if kata in ("naik", "turun", "datar"):
            v["tren_kata"] = kata
            v["tren_naik"], v["tren_turun"] = kata == "naik", kata == "turun"
        v["dampak_12bln"] = _dampak((kj.get("dampak_12bln_bahaya") or {}).get(b))
        v["model_status"] = _status_model(p, b)
        if v["model_status"]:
            v["model_gagal"] = v["model_status"].startswith("gagal")
        for k, x in (((p.get("masalah_skor") or {}).get(b)) or {}).items():
            if k in ("H", "F", "T", "D", "P", "K", "skor") and x is not None:
                v[k] = x
    else:
        v["dampak_12bln"] = _dampak(kj.get("dampak_12bln"))
    ter = ((p.get("inarisk_kec") or {}).get(INARISK.get(b, "multi")) or {}).get("teratas")
    if ter:
        v["kec_teratas"] = _daftar([x[0] for x in ter[:3]])
    kurang = [t for k, t in DOK if kp.get(k) is False]
    v["dokumen_kurang"] = _daftar(kurang) if kurang else None
    if pd.get("balita") is not None and pd.get("lansia") is not None:
        v["jiwa_rentan"] = masalah.idn(pd["balita"] + pd["lansia"], 0)
    seri = ir.get("seri")
    if seri:
        v["skor_irbi"] = masalah.idn(seri[-1][1], 1)
        v["kelas_irbi"] = {1: "Tinggi", 0: "Sedang"}.get(seri[-1][2])
    kt = kp.get("kampus_terdekat")
    if kt:
        km = kt[0].get("km")
        v["kampus_terdekat"] = kt[0]["nama"] + (f" ({masalah.idn(km, 0)} km)" if km is not None else "")
    for k in ("rpb", "renkon", "perda_pb", "perda_bpbd"):
        v[k] = kp.get(k)
    if kp.get("bpbd"):
        v["bpbd"] = kp["bpbd"].get("status") == "Terbentuk"
    v["gambut_pct"] = (p.get("karhutla") or {}).get("gambut_pct")
    return v


# ---------------------------------------------------------------- penyusunan (ALG §6.2)
def _isi(t, nilai):
    """Teks templat terisi, atau None bila slot kosong atau syarat salah. Keluaran tak pernah memuat '{'."""
    slot = set(t.get("isian") or []) | set(RE_SLOT.findall(t["teks"]))
    if any(nilai.get(s) is None for s in slot) or not syarat(t.get("syarat"), nilai):
        return None
    teks = RE_SLOT.sub(lambda m: str(nilai[m.group(1)]), t["teks"])
    return None if "{" in teks or "}" in teks else teks


def _tanpa_kembar(ok):
    """Templat dengan arah dan himpunan slot data (selain wilayah) sama dengan templat sebelumnya = pertanyaan kembar atas angka yang sama: yang kemudian dibuang.
    Urutan masukan = umum, bahaya, aspek, narasumber (id 1u..4n), jadi yang umum menang. Salinan JS: hitung.js susunPanduan."""
    lihat, out = set(), []
    for t, s in ok:
        ds = frozenset(t.get("isian") or ()) - {"wilayah"}
        if ds and (t["arah"], ds) in lihat:
            continue
        lihat.add((t["arah"], ds))
        out.append((t, s))
    return out


def susun_panduan(templat, nilai, mengapa=None, maks=None):
    """Templat pertanyaan -> [{id, teks, arah, sub}] urut arah (ARAH) lalu id; batas `maks` per narasumber buang prioritas rendah dulu."""
    maks = PD["MAKS_PER_NARASUMBER"] if maks is None else maks
    ok = [(t, s) for t in templat for s in [_isi(t, nilai)] if s is not None]
    ok = _tanpa_kembar(ok)
    if len(ok) > maks:
        ok = sorted(ok, key=lambda x: (x[0].get("prioritas", 2), ARAH.index(x[0]["arah"]), x[0]["id"]))[:maks]
    ok.sort(key=lambda x: (ARAH.index(x[0]["arah"]), x[0]["id"]))
    sub = list(mengapa or [])[:PD["MAKS_MENGAPA"]]
    return [{"id": t["id"], "teks": s, "arah": t["arah"], "sub": list(sub) if t["arah"] == "akar" else []} for t, s in ok]


def _plain(templat, nilai):
    return [{"id": t["id"], "teks": s} for t in sorted(templat, key=lambda t: t["id"]) for s in [_isi(t, nilai)] if s is not None]


def panduan(bank, p, m=None, narasumber=None, ctx=None):
    """-> {narasumber: {<ns>: {<arah>: [{id, teks, sub}]}}, data_diminta: [{id, teks}], riset: [{id, teks}]}.
    Tanpa masalah: hanya umum + narasumber; data diminta dari aspek semua masalah kab; riset kosong."""
    v = nilai_dari_profil(p, m, ctx)
    b, a = (m or {}).get("B"), (m or {}).get("A")
    pilih = narasumber or NARASUMBER
    for n in pilih:
        if n not in KONST["NARASUMBER"]:
            raise ValueError(f"narasumber tak dikenal: {n!r}")
    out = {}
    for n in pilih:
        g = {}
        for it in susun_panduan(bank["umum"] + bank["B"].get(b, []) + bank["A"].get(a, []) + bank["narasumber"][n], v, bank["mengapa"]):
            g.setdefault(it["arah"], []).append({"id": it["id"], "teks": it["teks"], "sub": it["sub"]})
        out[n] = g
    aspek = [a] if a else sorted({x["A"] for x in p.get("masalah") or []}, key=lambda s: int(s[1:]))
    data = [x for s in aspek for x in _plain(bank["data_diminta"].get(s, []), v)]
    riset = _plain(bank["riset"].get(a, []) + bank["riset"]["model"], v)[:RISET_MAKS] if m else []
    return {"narasumber": out, "data_diminta": data, "riset": riset}


# ---------------------------------------------------------------- pemeriksaan
def muat():
    return json.load(open(BANK, encoding="utf-8"))


def _semua(bank):
    """-> [(kelompok, kunci, templat)] seluruh templat."""
    out = [("umum", None, t) for t in bank["umum"]]
    for g in ("B", "A", "narasumber", "data_diminta", "riset"):
        out += [(g, k, t) for k, ts in bank[g].items() for t in ts]
    return out


def periksa_bank(bank):
    """Skema, batas minimum ALG §6.1, slot sah, syarat terurai, id unik. AssertionError berisi angka dan sebabnya."""
    semua = _semua(bank)
    assert len(semua) >= 290, f"{len(semua)} templat < 290 (ALG §6.1)"
    assert len(bank["umum"]) >= 10, f"umum {len(bank['umum'])} < 10"
    assert set(bank["B"]) == set(BAHAYA), f"kunci B beda dari 11 bahaya: {set(bank['B']) ^ set(BAHAYA)}"
    assert set(bank["A"]) == set(ASPEK) == set(bank["data_diminta"]), "kunci A/data_diminta beda dari A1..A10"
    assert set(bank["narasumber"]) == set(NARASUMBER), f"kunci narasumber: {set(bank['narasumber']) ^ set(NARASUMBER)}"
    assert set(bank["riset"]) - {"model"} == set(ASPEK), "kunci riset harus A1..A10 (+ model)"
    assert len(bank["mengapa"]) == PD["MAKS_MENGAPA"], f"mengapa {len(bank['mengapa'])} != {PD['MAKS_MENGAPA']}"
    for g, mn in (("B", 6), ("A", 6), ("narasumber", 8), ("data_diminta", 5)):
        for k, ts in bank[g].items():
            assert len(ts) >= mn, f"{g}/{k}: {len(ts)} templat < {mn}"
    for k, ts in bank["riset"].items():
        if k != "model":
            assert len(ts) >= 4, f"riset/{k}: {len(ts)} < 4"
    ids = [t["id"] for _, _, t in semua]
    assert len(ids) == len(set(ids)), f"id kembar: {sorted({i for i in ids if ids.count(i) > 1})}"
    for g, k, t in semua:
        w = f"{g}/{k}/{t.get('id')}"
        assert set(t) >= {"id", "teks", "arah", "isian", "syarat"}, f"{w}: kunci kurang {set(t)}"
        assert isinstance(t["teks"], str) and len(t["teks"]) >= 15, f"{w}: teks kosong"
        slot = RE_SLOT.findall(t["teks"])
        assert set(slot) == set(t["isian"]), f"{w}: isian {t['isian']} != slot di teks {sorted(set(slot))}"
        assert set(t["isian"]) <= set(SLOT_SAH), f"{w}: slot tak sah {sorted(set(t['isian']) - set(SLOT_SAH))}"
        assert "{" not in RE_SLOT.sub("", t["teks"]) and "}" not in RE_SLOT.sub("", t["teks"]), f"{w}: kurung kurawal liar"
        for kk, _, _ in urai_syarat(t["syarat"]):
            assert kk in KUNCI_SYARAT, f"{w}: kunci syarat {kk!r} tak sah"
        if g in ("umum", "B", "A", "narasumber"):
            assert t["arah"] in ARAH, f"{w}: arah {t['arah']!r}"
            assert t["prioritas"] in (1, 2, 3), f"{w}: prioritas {t.get('prioritas')!r}"
            assert re.search(r"\b(Bapak|Ibu|Pak|Bu|Anda)\b", t["teks"]) is None, f"{w}: sapaan tidak netral"
            assert t["teks"].endswith("?"), f"{w}: pertanyaan harus berakhir '?'"
        assert "·" not in t["teks"] and not re.search(r"@|\b62\d{8,}", t["teks"]), f"{w}: titik tengah/kontak"
    for k, ts in bank["B"].items():
        assert {t["arah"] for t in ts} == set(ARAH), f"bahaya {k}: arah kurang {set(ARAH) - {t['arah'] for t in ts}}"
    for k, ts in bank["narasumber"].items():
        assert {t["arah"] for t in ts} == set(ARAH), f"narasumber {k}: arah kurang {set(ARAH) - {t['arah'] for t in ts}}"
    return len(semua)


def tolak(fn, *a):
    try:
        fn(*a)
    except (ValueError, AssertionError):
        return
    raise AssertionError(f"seharusnya ditolak: {fn.__name__}{a}")


def cek():
    import copy
    bank = muat()
    n = periksa_bank(bank)
    # ---- penolakan: bank yang salah harus merah
    for ubah, mengapa in (
        (lambda b: b["B"]["banjir"].pop(), "bahaya kekurangan arah"),
        (lambda b: b["umum"][0].update(isian=["wilayah", "ngawur"]), "isian beda dari slot"),
        (lambda b: b["umum"][0].update(teks="Apa kabar {slot_gaib} di {wilayah}?", isian=["slot_gaib", "wilayah"]), "slot tak sah"),
        (lambda b: b["umum"][1].update(id=b["umum"][0]["id"]), "id kembar"),
        (lambda b: b["umum"][0].update(syarat="rpb = false"), "syarat salah bentuk"),
        (lambda b: b["umum"][0].update(syarat="rahasia == true"), "kunci syarat tak sah"),
        (lambda b: b["umum"][0].update(teks="Bagaimana, Bapak, keadaan {wilayah}?"), "sapaan tak netral"),
        (lambda b: b["narasumber"]["pu"].pop(), "narasumber kurang minimum"),
    ):
        k = copy.deepcopy(bank)
        ubah(k)
        tolak(periksa_bank, k)
    # ---- syarat: acuan + tepi
    ac = json.load(open(ACUAN, encoding="utf-8"))
    for c in ac["syarat"]:
        assert syarat(c["masuk"]["ekspr"], c["masuk"]["profil"]) is c["keluar"], f"syarat {c['id']}"
    assert syarat("", {}) is True and syarat(None, {}) is True
    assert syarat("tren_naik == true and H >= 0.5", {"tren_naik": True, "H": 0.5}) is True
    assert syarat("rpb == false", {"rpb": 0}) is False, "0 bukan false"
    assert syarat("F >= 1", {"F": True}) is False, "true bukan angka"
    assert syarat("rpb == false", {"rpb": None}) is False
    for jelek in ("rpb = false", "F >= abc", "__import__('os')", "rpb == false or F > 1", "rpb >= true", "F > 1 and", "H > 0.5; x", "F>=0.6 && H>1"):
        tolak(urai_syarat, jelek)
    # ---- susun_panduan: acuan A10
    for c in ac["susun_panduan"]:
        h = susun_panduan(c["masuk"]["templat"], c["masuk"]["profil"])
        assert h == c["keluar"], f"susun_panduan {c['id']}: {h} != {c['keluar']}"
        assert all("{" not in x["teks"] for x in h)
    t5 = [{"id": f"x{i:02d}", "teks": "Apa {wilayah}?", "arah": "kapasitas", "isian": ["wilayah"], "prioritas": 3 if i < 3 else 1} for i in range(6)]
    h = susun_panduan(t5, {"wilayah": "W"}, maks=4)
    assert {x["id"] for x in h} == {"x03", "x04", "x05", "x00"}, f"batas 4 harus membuang prioritas rendah dulu: {h}"
    ak = susun_panduan([{"id": "a", "teks": "Mengapa {wilayah}?", "arah": "akar", "isian": ["wilayah"]}], {"wilayah": "W"}, ["1", "2", "3", "4"])
    assert ak[0]["sub"] == ["1", "2", "3"], "sub Mengapa maksimal 3"
    # ---- atas SEMUA profil di disk
    fs = sorted(glob.glob(os.path.join(DAERAH, "[0-9][0-9][0-9][0-9].json")))
    assert len(fs) == 514, f"{len(fs)} profil != 514: jalankan profil_daerah.py"
    panggilan = butir = 0
    for f in fs:
        p = json.load(open(f, encoding="utf-8"))
        for m in [None] + (p["masalah"] or []):
            r = panduan(bank, p, m, ctx={"prov_nama": "Provinsi Uji"})
            panggilan += 1
            teks = [x["teks"] for n in r["narasumber"].values() for g in n.values() for x in g] + [x["teks"] for x in r["data_diminta"] + r["riset"]]
            for t in teks:
                assert not re.search(r"[{}]|None|undefined|NaN|null", t), f"{p['kode']}: sisa slot/nilai kosong di {t!r}"
            for ns, g in r["narasumber"].items():
                assert list(g) == [a for a in ARAH if a in g], f"{p['kode']}/{ns}: urutan arah {list(g)}"
                tot = [x for ar in g.values() for x in ar]
                assert 0 < len(tot) <= PD["MAKS_PER_NARASUMBER"], f"{p['kode']}/{ns}: {len(tot)} pertanyaan di luar 1..{PD['MAKS_PER_NARASUMBER']}"
                assert len({x["id"] for x in tot}) == len(tot), f"{p['kode']}/{ns}: id kembar"
                assert all((x["sub"] == []) == (a != "akar") for a, ar in g.items() for x in ar), f"{p['kode']}/{ns}: sub hanya di akar"
                butir += len(tot)
            if m:
                assert r["riset"], f"{p['kode']}/{m['auto_id']}: riset kosong"
            assert r["data_diminta"] or m is None and not p["masalah"], f"{p['kode']}/{m and m['auto_id']}: data diminta kosong"
    # ---- salin ke public (idempoten, byte sama)
    os.makedirs(os.path.dirname(PUBLIK), exist_ok=True)
    shutil.copyfile(BANK, PUBLIK)
    assert open(BANK, "rb").read() == open(PUBLIK, "rb").read()
    print(f"OK pertanyaan.py: {n} templat (>= 290), {panggilan} panduan atas 514 kab tanpa slot kosong, {butir} butir, disalin ke public/data/kemitraan/")


def paritas():
    """20 kombinasi (kab, masalah, narasumber) + keluaran Python, untuk paritas dengan hitung.js (KM-C02 bagian layar)."""
    bank, hasil = muat(), []
    fs = sorted(glob.glob(os.path.join(DAERAH, "[0-9][0-9][0-9][0-9].json")))
    for f in fs[::27]:
        p = json.load(open(f, encoding="utf-8"))
        ms = [None] + (p["masalah"] or [])[:1]
        for m in ms:
            ns = ["bpbd", "warga"] if m else ["kades"]
            hasil.append({"kab": p["kode"], "masalah": m and {"B": m["B"], "A": m["A"]}, "narasumber": ns,
                          "ctx": {"prov_nama": "Provinsi Uji"}, "keluar": panduan(bank, p, m, ns, {"prov_nama": "Provinsi Uji"})})
    print(json.dumps(hasil[:20], ensure_ascii=False, indent=1))


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    elif "--paritas" in sys.argv:
        paritas()
    else:
        sys.exit(__doc__)
