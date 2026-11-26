"""Status prakiraan Centurisk97 per (kab, bahaya) untuk banjir, longsor, cuaca ekstrem (DP-05).

P = prakiraan kita (prediksi.json, hari 1..3; lalu.json untuk hari 0), R = peringatan BMKG aktif (hanya hari 0),
K = kelas bahaya kab (kelas_bahaya_kab.json). Tabel dan ambang terkunci di status_prakiraan_kriteria.json (sidik).
Hijau Normal hanya bila semua sumber masuk dan segar; selain itu abu "belum terukur" (s = null), tidak pernah 0.
Hipotesis sampai gerbang (public/data/gerbang/status_prakiraan.json) menyatakan boleh_tampil.
Pakai: python3 -I scripts/prediksi/status_prakiraan.py [--umpan cap.json] [--keluar jalur] | --cek | --sidik
Python 3.9 lokal: tanpa sintaks 3.10+.
"""
import datetime as dt, importlib.util, itertools, json, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KRITERIA = os.path.join(AB, "status_prakiraan_kriteria.json")
SIDIK = os.path.join(AB, "status_prakiraan.sidik")
PREDIKSI = os.path.join(AKAR, "public/prediksi/data/prediksi.json")
LALU = os.path.join(AKAR, "public/prediksi/data/lalu.json")
KELAS = os.path.join(AKAR, "public/data/kelas_bahaya_kab.json")
GERBANG = os.path.join(AKAR, "public/data/gerbang/status_prakiraan.json")
KELUAR = os.path.join(AKAR, "data/raw/prediksi/status.json")  # layanan R2 diunggah workflow (DP-08); bukan public/
WIB = dt.timezone(dt.timedelta(hours=7))


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def _json(p):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


# ---------- tingkat sel: padanan besok_inti.js levelSel (diuji setara.mjs) ----------
def _deret(a, b, c):
    return lambda v: 0 if v < a else 1 if v < b else 2 if v < c else 3


def level_sel(kode, kol, r):
    """kol = daftar nama kolom kode itu; r = satu baris hari; None = tanpa data (bukan 0)."""
    if not r or not kol:
        return None

    def v(c):
        return r[kol.index(c)] if c in kol and kol.index(c) < len(r) else None
    if kode == "HJN":
        x = v("tot")
        return None if x is None else _deret(20, 50, 100)(x)
    if kode == "API":
        x = v("p")
        return None if x is None else _deret(0.2, 0.5, 0.8)(x)
    if kode == "ASP":
        x = v("kat")
        return None if x is None else max(0, min(3, x))
    if kode == "ROB":
        x = v("lewat")
        return None if x is None else (2 if x else 0)
    x = v("lv")  # BNJ, LSR, GEL, CEX
    return None if x is None else max(0, min(3, x))


def level_kode(k, kol, n, kode):
    """padanan levelKode(k, KOL, n, kode); kol = daftar kolom kode itu."""
    a = k.get(kode)
    return level_sel(kode, kol, a[n - 1] if a and len(a) >= n else None)


# ---------- tabel terkunci (ALGORITMA 5) ----------
def tabel(kr, kode, K, E, R):
    """E tingkat pemicu 0..3 (None = tak terukur); R dipakai hanya bila hari 0 (pemanggil mengirim None selain itu)."""
    if E is None:
        return None
    t = kr["tabel"]
    if kode != "CEX" and K == "rendah":
        return E if R == t["K_rendah_lepas_bila_R"] else min(E, t["K_rendah_plafon"])
    return E  # K sedang/tinggi, CEX, dan K null (tanda sebagian ditambah di status_kab)


def status_kab(kr, kode, K, P, R):
    """P = [P0..P3] int|None, R = int|None (hari 0), K = rendah|sedang|tinggi|None. -> {s, pemicu, sebagian, hari}."""
    hari_r = set(kr["hari_bmkg"])
    S = []
    for d in kr["hari"]:
        r = R if d in hari_r else None
        e = [x for x in (P[d], r) if x is not None]
        S.append(tabel(kr, kode, K, max(e), r) if e else None)
    ada = [x for x in S if x is not None]
    lengkap = all(p is not None for p in P) and R is not None and (K is not None or kr["kelas_kab"][kode] is None)
    s = max(ada) if ada else None
    if not lengkap and not s:  # tak ada tingkat di atas 0 dan ada sumber hilang: abu, bukan Normal
        return {"s": None, "pemicu": None, "sebagian": False, "hari": [None] * len(S)}
    pemicu = None
    if s:
        p_kena = r_kena = False
        for d, x in zip(kr["hari"], S):
            if x != s:
                continue
            p_kena |= P[d] is not None and tabel(kr, kode, K, P[d], None) >= s
            r_kena |= d in hari_r and R is not None and tabel(kr, kode, K, R, R) >= s
        pemicu = "keduanya" if p_kena and r_kena else "bmkg" if r_kena else "prakiraan"
    return {"s": s, "pemicu": pemicu, "sebagian": not lengkap, "hari": S}


# ---------- masukan ----------
def _umur_jam(s, kini):
    try:
        return (kini - dt.datetime.fromisoformat(s)).total_seconds() / 3600
    except (TypeError, ValueError):
        return None


def ambil_P(kr, prediksi, lalu, kab, kode, kini):
    """-> [P0..P3]. Prediksi basi atau hilang: semua None. Hari 0 dari lalu.json untuk tanggal WIB hari ini."""
    P = [None] * 4
    u = _umur_jam((prediksi or {}).get("dibuat"), kini)
    if u is not None and u <= kr["segar_jam"]["prakiraan"]:
        kol = prediksi["kode"].get(kode, {}).get("kol")
        for n in (1, 2, 3):
            P[n] = level_kode(kab, kol, n, kode)
    b = ((lalu or {}).get("hari") or {}).get(kini.astimezone(WIB).date().isoformat(), {}).get(kode)
    if b:
        P[0] = level_sel(kode, b.get("kol"), (b.get("kab") or {}).get(kab["id"]))
    return P


def ambil_R(h, kode, kab4):
    """h = keluaran dampak_peringatan.jalankan; umpan basi/mati: None. Segar tanpa peringatan: 0."""
    if not h or h.get("kab_tersentuh") is None:
        return None
    return (h["kab_tersentuh"].get(kode) or {}).get(kab4, 0)


def ambil_K(kelas, kab4, nama_kelas):
    if nama_kelas is None or not kelas:
        return None
    x = ((kelas.get("kab") or {}).get(kab4) or {}).get(nama_kelas)
    return x.get("K") if x else None


def hitung(kr, prediksi, lalu, kelas, h, kini, gerbang=None):
    boleh = bool((gerbang or {}).get("boleh_tampil") is True)
    out = {"versi": 1, "dibuat": kini.astimezone(WIB).isoformat(timespec="seconds"), "boleh_tampil": boleh, "hipotesis": not boleh,
           "sumber": {"prediksi": (prediksi or {}).get("dibuat"), "umpan_bmkg": (h or {}).get("umpan", {}).get("status", "mati"),
                      "kelas_kab": bool(kelas)}, "kab": {}}
    for kab in (prediksi or {}).get("kab") or []:
        out["kab"][kab["id"]] = {kode: status_kab(kr, kode, ambil_K(kelas, kab["id"], kr["kelas_kab"][kode]),
                                                  ambil_P(kr, prediksi, lalu, kab, kode, kini), ambil_R(h, kode, kab["id"]))
                                 for kode in kr["bahaya"]}
    return out


def jalankan(umpan=None, kini=None, keluar=KELUAR):
    kr = _json(KRITERIA)
    kini = kini or dt.datetime.now(dt.timezone.utc)
    dp = _muat("sp_dampak_peringatan", "scripts/siklus/dampak_peringatan.py")
    doc = _json(umpan) if umpan else dp.baca_umpan()
    h = dp.jalankan(doc, kini)
    out = hitung(kr, _json(PREDIKSI), _json(LALU), _json(KELAS), h, kini, _json(GERBANG))
    os.makedirs(os.path.dirname(keluar), exist_ok=True)
    tmp = keluar + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, keluar)
    return out


# ---------- sidik (pra-registrasi): hanya berkas kriteria; logika membaca angka dari sana ----------
def tulis_sidik():
    os.chdir(AKAR)
    _muat("sp_sidik", "scripts/umum/sidik.py").tulis(os.path.relpath(SIDIK, AKAR), [], os.path.relpath(KRITERIA, AKAR), [])


# ---------- --cek ----------
def _cek():
    kr = _json(KRITERIA)
    # level_sel golden
    assert level_sel("BNJ", ["lv", "ps"], [3, .33]) == 3 and level_sel("BNJ", ["lv", "ps"], [9, 0]) == 3 and level_sel("BNJ", ["lv"], None) is None
    assert level_sel("CEX", ["emb", "lv"], [16, 0]) == 0 and level_sel("CEX", ["emb"], [16]) is None

    # P10: tabel penuh E x K x R x bahaya x hari
    def ref(kode, K, E, R):
        if kode != "CEX" and K == "rendah":
            return E if R == 3 else min(E, 2)
        return E
    for kode, K, R, E in itertools.product(("BNJ", "LSR", "CEX"), ("rendah", "sedang", "tinggi", None), (None, 0, 1, 2, 3), range(4)):
        for d in range(4):
            P = [E] * 4
            st = status_kab(kr, kode, K, P, R)
            esp = [ref(kode, K, max(E, R) if (R is not None and dd == 0) else E, R if dd == 0 else None) for dd in range(4)]
            lengkap = R is not None and (K is not None or kode == "CEX")
            if lengkap or max(esp) > 0:
                assert st["s"] == max(esp) and st["hari"] == esp, (kode, K, R, E, st, esp)
            else:
                assert st["s"] is None, (kode, K, R, E, st)
            if K == "rendah" and kode != "CEX" and R != 3:
                assert (st["s"] or 0) <= 2
            if st["s"] == 0:
                assert lengkap and not st["sebagian"] and st["pemicu"] is None   # Normal hanya bila semua sumber masuk
            assert st["sebagian"] == (not lengkap and bool(st["s"]))
    a = status_kab(kr, "BNJ", "sedang", [1, 1, 1, 1], 3)
    assert a["hari"] == [3, 1, 1, 1] and a["s"] == 3 and a["pemicu"] == "bmkg"          # R hanya mengangkat hari 0
    assert status_kab(kr, "BNJ", "sedang", [1, 1, 1, 1], None)["hari"] == [1, 1, 1, 1]
    assert status_kab(kr, "BNJ", "sedang", [2, 0, 0, 0], 2)["pemicu"] == "keduanya"
    assert status_kab(kr, "BNJ", "sedang", [1, 3, 0, 0], 2)["pemicu"] == "prakiraan"

    # P11: hapus satu sumber dari kasus Normal
    n = status_kab(kr, "BNJ", "sedang", [0, 0, 0, 0], 0)
    assert n["s"] == 0 and not n["sebagian"]
    for P, R, K in (([0, 0, 0, None], 0, "sedang"), ([None, 0, 0, 0], 0, "sedang"), ([0] * 4, None, "sedang"), ([0] * 4, 0, None)):
        x = status_kab(kr, "BNJ", K, P, R)
        assert x["s"] is None and not x["sebagian"] and x["hari"] == [None] * 4, (P, R, K, x)
    assert status_kab(kr, "CEX", None, [0] * 4, 0)["s"] == 0                      # CEX tak butuh K
    for P, R, K in (([2, 0, 0, 0], None, "sedang"), ([2, 0, 0, 0], 0, None), ([2, 0, 0, None], 0, "sedang")):
        x = status_kab(kr, "BNJ", K, P, R)
        assert x["s"] == 2 and x["sebagian"] is True, (P, R, K, x)               # tingkat E dengan tanda sebagian sumber

    # P12: sidik. Berkas nyata (bila sudah ditulis) harus cocok; ubah satu ambang pada salinan -> keluar 3
    SD = _muat("sp_sidik", "scripts/umum/sidik.py")
    asal = os.getcwd()
    try:
        os.chdir(AKAR)
        if os.path.exists(SIDIK):
            SD.cek(os.path.relpath(SIDIK, AKAR))
        with tempfile.TemporaryDirectory() as t:
            os.chdir(t)
            json.dump(kr, open("kr.json", "w"))
            SD.tulis("s.sidik", [], "kr.json", [])
            SD.cek("s.sidik")
            kr2 = json.loads(json.dumps(kr))
            kr2["tabel"]["K_rendah_plafon"] = 3
            json.dump(kr2, open("kr.json", "w"))
            try:
                SD.cek("s.sidik")
            except SystemExit as e:
                assert e.code == 3
            else:
                raise AssertionError("ambang diubah tetapi sidik lolos")
    finally:
        os.chdir(asal)

    # uji ujung ke ujung dengan fixture (tanpa jaringan)
    kini = dt.datetime(2026, 11, 26, 2, 0, tzinfo=dt.timezone.utc)   # 09.00 WIB
    kab = lambda i, lv: {"id": i, "nama": i, "BNJ": [[lv, .1]] * 3, "LSR": [[0, 0]] * 3, "CEX": [[10, 0]] * 3}
    pred = {"dibuat": "2026-11-26T04:46:15+07:00", "kode": {"BNJ": {"kol": ["lv", "ps"]}, "LSR": {"kol": ["lv", "ps"]}, "CEX": {"kol": ["emb", "lv"]}},
            "kab": [kab("1101", 2), kab("1102", 0)]}
    lalu = {"hari": {"2026-11-26": {k: {"kol": pred["kode"][k]["kol"], "kab": {"1101": [2, 0], "1102": [0, 0]}} for k in ("BNJ", "LSR", "CEX")}}}
    kelas = {"kab": {"1101": {"banjir": {"K": "rendah"}, "longsor": {"K": "tinggi"}}, "1102": {"banjir": {"K": "sedang"}, "longsor": None}}}
    h = {"umpan": {"status": "segar"}, "kab_tersentuh": {"BNJ": {"1101": 3}, "LSR": {"1101": 3}}}
    o = hitung(kr, pred, lalu, kelas, h, kini)
    assert o["hipotesis"] is True and set(o["kab"]) == {"1101", "1102"}
    b = o["kab"]["1101"]["BNJ"]
    assert b["s"] == 3 and b["pemicu"] == "bmkg" and b["hari"][0] == 3 and b["hari"][1:] == [2, 2, 2]   # K rendah, R = 3 melepas plafon
    assert o["kab"]["1101"]["LSR"]["s"] == 3 and o["kab"]["1101"]["CEX"]["s"] == 0
    assert o["kab"]["1102"]["BNJ"]["s"] == 0 and o["kab"]["1102"]["LSR"]["s"] is None   # K longsor null: belum terukur, bukan Normal
    assert o["kab"]["1102"]["CEX"]["s"] == 0
    # umpan BMKG basi: R null -> tidak Normal
    x = hitung(kr, pred, lalu, kelas, {"umpan": {"status": "basi"}, "kab_tersentuh": None}, kini)
    assert x["kab"]["1102"]["BNJ"]["s"] is None and x["kab"]["1101"]["BNJ"]["sebagian"] is True
    # prediksi basi (>36 jam) dan tanpa tabel K: semua belum terukur
    pred2 = dict(pred, dibuat="2026-11-24T04:46:15+07:00")
    y = hitung(kr, pred2, lalu, None, h, kini)
    assert all(v[k]["s"] is None or v[k]["s"] > 0 for v in y["kab"].values() for k in v)
    assert y["kab"]["1102"]["CEX"]["s"] is None and y["sumber"]["kelas_kab"] is False
    # lalu.json tanpa tanggal hari ini: P0 null, tidak Normal
    z = hitung(kr, pred, {"hari": {}}, kelas, h, kini)
    assert z["kab"]["1102"]["BNJ"]["s"] is None
    # boleh_tampil hanya bila gerbang menyatakan true
    assert hitung(kr, pred, lalu, kelas, h, kini, {"boleh_tampil": True})["hipotesis"] is False
    print("status_prakiraan: cek hijau (P10, P11, P12 + fixture)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--cek" in a:
        _cek()
    elif "--sidik" in a:
        tulis_sidik()
    else:
        o = jalankan(umpan=a[a.index("--umpan") + 1] if "--umpan" in a else None, keluar=a[a.index("--keluar") + 1] if "--keluar" in a else KELUAR)
        from collections import Counter
        c = Counter("belum_terukur" if v["s"] is None else v["s"] for k in o["kab"].values() for v in k.values())
        print(json.dumps({"kab": len(o["kab"]), "umpan": o["sumber"]["umpan_bmkg"], "kelas_kab": o["sumber"]["kelas_kab"], "hitung_s": dict(c)}, ensure_ascii=False))
