"""Analisis wilayah /prediksi (PH-05): satu berkas ringkas dari status prakiraan, kelas desa BNPB, hujan, HTH, gelombang, debit.

Keluaran lokal data/raw/prediksi/analisis.json (workflow mengunggah ke R2 dampak_peringatan/analisis.json; tidak masuk public/).
Sumber hilang atau basi (HTH > 3 hari) -> bloknya null, tidak pernah daftar kosong. Bukan vonis "aman": hanya peringkat angka.
Pakai: python3 -I scripts/prediksi/analisis_wilayah.py   |   python3 -I scripts/prediksi/analisis_wilayah.py --cek
"""
import datetime as dt, json, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "siklus"))
WIB = dt.timezone(dt.timedelta(hours=7))
BAHAYA = ["BNJ", "BDG", "LSR", "GEL", "KHT", "KEK"]
TINGKAT = {3: "awas", 2: "siaga", 1: "waspada", 0: "normal"}
BASI_HTH = 3  # hari
BASI_STATUS_J = 6   # jam: status.json lebih tua dari ini -> status null (kab_tinggi tetap)
BASI_PRED_J = 36    # jam: prediksi.json (hujan, gelombang)
BASI_DEBIT_J = 36   # jam: debit_kab.json


def muat(rel):
    try:
        with open(os.path.join(AKAR, rel), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def tanggal(s):
    try:
        return dt.date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


def segar(o, batas_jam, kini):
    """True bila berkas ada dan `dibuat`-nya tidak lebih tua dari batas_jam; tanpa stempel terbaca = basi."""
    try:
        t = dt.datetime.fromisoformat(str((o or {}).get("dibuat")))
    except ValueError:
        return False
    if t.tzinfo is None:
        t = t.replace(tzinfo=WIB)
    return (kini - t).total_seconds() <= batas_jam * 3600


def matriks(status, kelas):
    """Per bahaya: kab/desa kelas tinggi (kelas_desa_bnpb) + jumlah kab per tingkat (Ringkas 3 hari = maks hari 0..3, null dilewati)."""
    if not status and not kelas:
        return None
    # status None (hilang/basi) -> bagian status null per bahaya, bukan 0; kab_tinggi/desa_tinggi tetap dari kelas
    ks = (kelas or {}).get("kab") or {}
    out = {}
    for b in BAHAYA:
        m = {"kab_tinggi": None, "desa_tinggi": None,
             "status": {"awas": 0, "siaga": 0, "waspada": 0, "normal": 0, "belum": 0} if status else None}
        if kelas:
            m["kab_tinggi"] = sum(1 for v in ks.values() if (v.get("K") or {}).get(b) == "tinggi")
            m["desa_tinggi"] = sum((v.get("baseline") or {}).get(b, [0, 0, 0, 0])[3] for v in ks.values())
        for kab, h in ((status or {}).get("kab") or {}).items():
            vs = [x for x in ((h or {}).get(b) or {}).get("hari") or [] if isinstance(x, int)]
            m["status"]["belum" if not vs else TINGKAT.get(max(vs), "belum")] += 1
        out[b] = m
    return out


def peringkat(isi, n):
    """isi = [(kab, nilai, hari)] -> n teratas menurun, seri urut kode; None bila kosong."""
    isi = [x for x in isi if x[1] is not None]
    return sorted(isi, key=lambda x: (-x[1], x[0]))[:n] or None


def hujan(pred, nama):
    if not pred or not (pred.get("kode", {}).get("HJN") or {}).get("hari"):
        return None
    hari = pred["kode"]["HJN"]["hari"]
    isi = []
    for k in pred.get("kab") or []:
        for i, c in enumerate(k.get("HJN") or []):
            if c and c[3] is not None:
                isi.append((k["id"], c[3], hari[i]))
    # satu entri per kab: hari dengan mm terbesar
    per = {}
    for kab, mm, h in isi:
        if kab not in per or mm > per[kab][1]:
            per[kab] = (kab, mm, h)
    p = peringkat(list(per.values()), 10)
    return p and [{"kab": a, "nama": nama.get(a), "mm": round(b), "hari": c} for a, b, c in p]


def gelombang(pred, nama):
    if not pred or not (pred.get("kode", {}).get("GEL") or {}).get("hari"):
        return None
    hari = pred["kode"]["GEL"]["hari"]
    per = {}
    for k in pred.get("kab") or []:
        for i, c in enumerate(k.get("GEL") or []):
            if c and c[0] is not None and (k["id"] not in per or c[0] > per[k["id"]][1]):
                per[k["id"]] = (k["id"], c[0], hari[i])
    p = peringkat(list(per.values()), 8)
    return p and [{"kab": a, "nama": nama.get(a), "m": round(b, 1), "hari": c} for a, b, c in p]


def hth(h, nama, hari_ini, kab4):
    d = tanggal((h or {}).get("hari"))
    if not d or (hari_ini - d).days > BASI_HTH:
        return None
    per = {}
    for kunci, v in (h.get("kab") or {}).items():
        k = kab4(kunci)
        if k and v.get("maks") is not None:
            per[k] = max(per.get(k, 0), v["maks"])
    p = peringkat([(k, v, None) for k, v in per.items()], 8)
    return p and [{"kab": a, "nama": nama.get(a), "hari": b, "sampai": str(d)} for a, b, _ in p]


def debit(g, nama):
    kab = (g or {}).get("kab")
    if not kab:
        return None
    ada = [(k, v["rasio_q2"], None) for k, v in kab.items() if v.get("rasio_q2") is not None]
    dasar, kunci_v = ("rasio_q2", "rasio_q2") if ada else ("puncak", "puncak_m3s")
    p = peringkat([(k, v.get(kunci_v), None) for k, v in kab.items()], 8)
    if not p:
        return None
    tgl = tanggal(g.get("dibuat"))
    def baris(k, nilai):
        v = kab[k]
        r = {"kab": k, "nama": nama.get(k), "puncak_m3s": round(v["puncak_m3s"]) if v.get("puncak_m3s") is not None else None,
             "hari": str(tgl + dt.timedelta(days=v["hari_puncak"])) if tgl and v.get("hari_puncak") is not None else None}
        if dasar == "rasio_q2":
            r["rasio_q2"] = round(nilai, 2)
        return r
    return {"hipotesis": g.get("hipotesis", True), "dasar": dasar,
            "catatan_dasar": ("peringkat rasio puncak terhadap Q2" if dasar == "rasio_q2" else
                              "puncak m3/s mutlak, bukan tingkat ancaman, selama Q2 belum ada"),
            "daftar": [baris(a, b) for a, b, _ in p]}


def rakit(status, pred, kelas, h, g, hari_ini, kab4, kini=None):
    kini = kini or dt.datetime.now(WIB)
    status = status if segar(status, BASI_STATUS_J, kini) else None
    pred = pred if segar(pred, BASI_PRED_J, kini) else None
    g = g if segar(g, BASI_DEBIT_J, kini) else None
    nama = {k["id"]: k.get("nama") for k in (pred or {}).get("kab") or []}
    for k, v in ((kelas or {}).get("kab") or {}).items():
        nama[k] = v.get("nama") or nama.get(k)
    desa = None
    if kelas and kelas.get("desa_teratas"):
        kol = kelas["desa_teratas_kolom"]
        desa = [dict(zip(kol, r)) for r in kelas["desa_teratas"][:50]]
    tg = lambda o, a="dibuat": (o or {}).get(a) and str(o[a])[:10]
    return {"versi": 1, "dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"),
            "sumber": {"status": tg(status), "prediksi": tg(pred), "kelas_desa": tg(kelas, "dibuat"),
                       "hth": (h or {}).get("hari"), "debit": tg(g)},
            "matriks": matriks(status, kelas), "hujan": hujan(pred, nama), "hth": hth(h, nama, hari_ini, kab4),
            "gelombang": gelombang(pred, nama), "debit": debit(g, nama), "desa_tinggi": desa}


def cek():
    hi = dt.date(2026, 11, 26)
    kab4 = lambda s: s.split("|")[1] if "|" in s else None
    kini = dt.datetime(2026, 11, 26, 12, 0, tzinfo=WIB)
    pred = {"dibuat": "2026-11-26T04:46:15+07:00", "kode": {"HJN": {"hari": ["2026-11-27", "2026-11-28", "2026-11-29"]}, "GEL": {"hari": ["2026-11-27", "2026-11-28", "2026-11-29"]}},
            "kab": [{"id": str(1000 + i), "nama": f"K{i}", "HJN": [[0, 0, 0, i + .6, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0, 0], None],
                     "GEL": [[i / 10 + .04], [0.1], None]} for i in range(12)]}
    pred["kab"][0]["GEL"] = [None, None, None]
    st = {"dibuat": "2026-11-26T09:54:35+07:00", "kab": {"1000": {"BNJ": {"hari": [None, 1, 3, 0]}, "BDG": {"hari": [None] * 4}}, "1001": {"BNJ": {"hari": [0, 0, None, 0]}}}}
    h = {"hari": "2026-11-24", "kab": {f"1|{i}": {"maks": i} for i in range(1, 15)}}
    g = {"dibuat": "2026-11-26T10:00:00+00:00", "hipotesis": True, "kab": {str(i): {"puncak_m3s": i * 10.4, "hari_puncak": 1, "rasio_q2": None} for i in range(1, 12)}}
    m = matriks(st, None)
    assert m["BNJ"]["status"] == {"awas": 1, "siaga": 0, "waspada": 0, "normal": 1, "belum": 0} and m["BDG"]["status"]["belum"] == 2
    assert m["BNJ"]["kab_tinggi"] is None
    r = rakit(st, pred, None, h, g, hi, lambda s: kab4(s), kini)
    assert len(r["hujan"]) == 10 and r["hujan"][0] == {"kab": "1011", "nama": "K11", "mm": 12, "hari": "2026-11-27"}
    assert [x["mm"] for x in r["hujan"]] == sorted((x["mm"] for x in r["hujan"]), reverse=True)
    assert len(r["gelombang"]) == 8 and r["gelombang"][0]["m"] == 1.1 and isinstance(r["gelombang"][0]["m"], float)
    assert len(r["hth"]) == 8 and r["hth"][0]["hari"] == 14 and r["hth"][0]["sampai"] == "2026-11-24"
    assert r["debit"]["dasar"] == "puncak" and len(r["debit"]["daftar"]) == 8 and r["debit"]["daftar"][0] == {"kab": "11", "nama": None, "puncak_m3s": 114, "hari": "2026-11-27"}
    g["kab"]["3"]["rasio_q2"] = 1.234
    assert debit(g, {})["dasar"] == "rasio_q2" and debit(g, {})["daftar"][0]["rasio_q2"] == 1.23
    assert r["desa_tinggi"] is None
    assert r["debit"]["hipotesis"] is True and "Q2" in r["debit"]["catatan_dasar"]
    # status basi (>6 jam): status null per bahaya, kab_tinggi tetap dari kelas
    kelas = {"dibuat": "2026-11-26", "kab": {"1000": {"K": {"BNJ": "tinggi"}, "baseline": {"BNJ": [0, 0, 0, 7]}}}}
    lama = dict(st, dibuat="2026-11-26T03:00:00+07:00")
    r = rakit(lama, pred, kelas, h, g, hi, kab4, kini)
    assert r["matriks"]["BNJ"]["status"] is None and r["matriks"]["BNJ"]["kab_tinggi"] == 1 and r["matriks"]["BNJ"]["desa_tinggi"] == 7
    r = rakit(st, pred, kelas, h, g, hi, kab4, kini)
    assert r["matriks"]["BNJ"]["status"]["awas"] == 1
    # prediksi/debit basi (>36 jam): blok null
    r = rakit(st, dict(pred, dibuat="2026-11-24T00:00:00+07:00"), None, h, dict(g, dibuat="2026-11-24T00:00:00+00:00"), hi, kab4, kini)
    assert r["hujan"] is None and r["gelombang"] is None and r["debit"] is None
    h["hari"] = "2026-11-20"
    r = rakit(None, None, None, h, None, hi, kab4, kini)
    assert r["hth"] is None and r["hujan"] is None and r["gelombang"] is None and r["debit"] is None and r["matriks"] is None
    print("analisis_wilayah cek: ok")


def main():
    st = muat("data/raw/prediksi/status.json")
    kelas = muat("public/data/kelas_desa_bnpb.json")
    from kunci import kab4
    r = rakit(st, muat("public/prediksi/data/prediksi.json"), kelas, muat("public/data/kekeringan_hth.json"),
              muat("public/banjir/data/debit_kab.json"), dt.datetime.now(WIB).date(), kab4)
    jalur = os.path.join(AKAR, "data", "raw", "prediksi", "analisis.json")
    with open(jalur, "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, separators=(",", ":"))
    return r


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        r = main()
        for b in ("hujan", "hth", "gelombang"):
            print(b, (r[b] or [])[:5] if r[b] else None)
        print("debit", r["debit"] and {"dasar": r["debit"]["dasar"], "daftar": r["debit"]["daftar"][:5]})
        print("desa_tinggi", r["desa_tinggi"] and (len(r["desa_tinggi"]), r["desa_tinggi"][:2]))
        print("matriks", json.dumps(r["matriks"], ensure_ascii=False)[:900] if r["matriks"] else None)
        print("sumber", r["sumber"])
