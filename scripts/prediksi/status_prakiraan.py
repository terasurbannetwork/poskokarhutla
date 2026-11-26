"""Status prakiraan Centurisk97 per (kab, bahaya) untuk banjir, longsor, cuaca ekstrem (DP-05).

P = prakiraan kita (prediksi.json, hari 1..3; lalu.json untuk hari 0), R = peringatan BMKG aktif (hanya hari 0),
K = kelas bahaya kab (public/data/kelas_desa_bnpb.json, kriteria versi 3). Tabel dan ambang terkunci di status_prakiraan_kriteria.json (sidik).
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
KELAS = os.path.join(AKAR, "public/data/kelas_desa_bnpb.json")      # PH-02: K dari kelas desa BNPB, bukan kelas_bahaya_kab.json
KLUSTER = os.path.join(AKAR, "public/data/kluster.json")      # keluaran harian.py (aturan.py), ALGORITMA 5.1
META = os.path.join(AKAR, "public/data/meta.json")            # "dibuat" = jam pipeline karhutla terakhir jalan
UJIBALIK = os.path.join(AKAR, "public/data/ujibalik_status.json")
BENCANA = os.path.join(AKAR, "public/bencana.json")
KERING = os.path.join(AKAR, "public/data/kekeringan_wilayah.json")   # K15: status wilayah kita, lv 0..3 per "prov|nama"
KERING_META = os.path.join(AKAR, "public/data/kekeringan_meta.json")
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
    if kode != "CEX" and K is None:  # K null: plafon Siaga, tanpa pelepasan oleh R (bias ke atas dicegah); tanda sebagian di status_kab
        return min(E, t["K_null_plafon"])
    return E  # K sedang/tinggi dan CEX


def status_kab(kr, kode, K, P, R):
    """P = [P0..P3] int|None, R = int|None (hari 0), K = rendah|sedang|tinggi|None. -> {s, pemicu, sebagian, hari}."""
    hari_r = set(kr["hari_bmkg"])
    S, E = [], []
    for d in kr["hari"]:
        r = R if d in hari_r else None
        e = [x for x in (P[d], r) if x is not None]
        E.append(max(e) if e else None)      # e: tingkat pemicu per hari sebelum matriks K, untuk pengurutan di layar
        S.append(tabel(kr, kode, K, max(e), r) if e else None)
    ada = [x for x in S if x is not None]
    lengkap = all(p is not None for p in P) and R is not None and (K is not None or kr["kelas_kab"][kode] is None)
    s = max(ada) if ada else None
    if not lengkap and not s:  # tak ada tingkat di atas 0 dan ada sumber hilang: abu, bukan Normal
        return {"s": None, "pemicu": None, "sebagian": False, "hari": [None] * len(S), "e": E}
    pemicu = None
    if s:
        p_kena = r_kena = False
        for d, x in zip(kr["hari"], S):
            if x != s:
                continue
            p_kena |= P[d] is not None and tabel(kr, kode, K, P[d], None) >= s
            r_kena |= d in hari_r and R is not None and tabel(kr, kode, K, R, R) >= s
        pemicu = "keduanya" if p_kena and r_kena else "bmkg" if r_kena else "prakiraan"
    return {"s": s, "pemicu": pemicu, "sebagian": not lengkap, "hari": S, "e": E}


# ---------- masukan ----------
def _umur_jam(s, kini):
    try:
        return (kini - dt.datetime.fromisoformat(s)).total_seconds() / 3600
    except (TypeError, ValueError):
        return None


def ambil_P(kr, prediksi, lalu, kab, kode, kini):
    """-> [P0..P3]. P1..P3 dipetakan lewat tanggal sasaran (prediksi.kode[kode].hari) lawan tanggal WIB hari ini + n, bukan
    indeks baris: terbitan lama (mis. 30 jam) tidak bergeser sehari; sasaran yang tak tercakup = None. Prediksi basi atau hilang:
    semua None. Hari 0: lalu.hari[hari ini] (terbitan kemarin, tenggang +1), lalu lalu.hari0 (terbitan terakhir yang menyasar hari ini)."""
    P = [None] * 4
    hi = kini.astimezone(WIB).date()
    u = _umur_jam((prediksi or {}).get("dibuat"), kini)
    if u is not None and u <= kr["segar_jam"]["prakiraan"]:
        e = prediksi["kode"].get(kode, {})
        for n in (1, 2, 3):
            tgl = (hi + dt.timedelta(days=n)).isoformat()
            if tgl in (e.get("hari") or []):
                P[n] = level_kode(kab, e.get("kol"), e["hari"].index(tgl) + 1, kode)
    iso = hi.isoformat()
    b = ((lalu or {}).get("hari") or {}).get(iso, {}).get(kode) or (((lalu or {}).get("hari0") or {}).get(kode) if (lalu or {}).get("dibuat") == iso else None)
    if b:
        P[0] = level_sel(kode, b.get("kol"), (b.get("kab") or {}).get(kab["id"]))
    return P


def ambil_R(h, kode, kab4):
    """h = keluaran dampak_peringatan.jalankan; umpan basi/mati: None. Segar tanpa peringatan: 0."""
    if not h or h.get("kab_tersentuh") is None:
        return None
    return (h["kab_tersentuh"].get(kode) or {}).get(kab4, 0)


def ambil_K(kelas, kab4, nama_kelas):
    """kelas = kelas_desa_bnpb.json: kab[k4].K[KODE] = tinggi|sedang|rendah|null."""
    if nama_kelas is None or not kelas:
        return None
    return (((kelas.get("kab") or {}).get(kab4) or {}).get("K") or {}).get(nama_kelas)


def hitung(kr, prediksi, lalu, kelas, h, kini, gerbang=None):
    pb = (gerbang or {}).get("boleh_per_bahaya") or {}
    per = {k: pb.get(k) is True for k in kr["bahaya"]}     # hilang = false (gagal-tertutup); KHT punya vonis sendiri (status_kht)
    boleh = all(per.values())
    out = {"versi": 1, "versi_kriteria": kr["versi"], "dibuat": kini.astimezone(WIB).isoformat(timespec="seconds"), "boleh_tampil": boleh, "hipotesis": not boleh,
           "boleh_per_bahaya": per,
           "sumber": {"prediksi": (prediksi or {}).get("dibuat"), "umpan_bmkg": (h or {}).get("umpan", {}).get("status", "mati"),
                      "kelas_kab": bool(kelas)}, "kab": {}}
    for kab in (prediksi or {}).get("kab") or []:
        out["kab"][kab["id"]] = {kode: dict(hipotesis=not per[kode], **status_kab(kr, kode, ambil_K(kelas, kab["id"], kr["kelas_kab"][kode]),
                                                  ambil_P(kr, prediksi, lalu, kab, kr.get("sumber_E", {}).get(kode, kode), kini),
                                                  ambil_R(h, kr.get("sumber_E", {}).get(kode, kode), kab["id"])))
                                 for kode in kr["bahaya"]}
    return out


# ---------- karhutla (KHT, DP-06): status taktis kluster yang sudah terbit, maks per kab; tanpa R dan K ----------
def nama_tingkat_kht(bencana):
    return {t["kode"]: t["nama"] for t in next(e for e in bencana["bencana"] if e["id"] == "karhutla")["tingkat"]}


def hipotesis_kht(ujibalik, s):
    """Pil hipotesis tetap kecuali vonis tingkat itu (Waspada=1, Siaga=2, Awas=3) 'LULUS'. Tingkat 0 tak punya vonis."""
    v = ((ujibalik or {}).get("tingkat") or {}).get({1: "Waspada", 2: "Siaga", 3: "Awas"}.get(s), {}).get("vonis")
    return str(v).upper() != "LULUS"


def status_kht(kr, kluster, meta, ujibalik, nama, kab, cari, kini):
    """-> {kab_id: {s, nama, pemicu, sebagian, hari, hipotesis}}. Pipeline basi/hilang: s null (abu), tak pernah 0.
    kluster.json hanya memuat kompleks aktif (<=72 jam, gambut 168 jam, harian.py); kab tanpa kluster aktif = 0 bila segar."""
    u = _umur_jam((meta or {}).get("dibuat"), kini)
    segar = bool(kluster) and u is not None and u <= kr["segar_jam"]["prakiraan"]   # 36 jam (ALGORITMA 5.1)
    maks = {}
    if segar:
        for f in kluster.get("features") or []:
            p = f.get("properties") or {}
            i = cari(p.get("prov"), p.get("kab"))
            if i is not None and p.get("level") in (0, 1, 2, 3):
                maks[i] = max(maks.get(i, 0), p["level"])
    out = {}
    for k in kab:
        s = maks.get(k["id"], 0) if segar else None
        out[k["id"]] = {"s": s, "nama": None if s is None else nama[s], "pemicu": None if not s else "kluster", "sebagian": False,
                        "hari": [s, None, None, None], "hipotesis": True if s is None else hipotesis_kht(ujibalik, s)}
    return out


# ---------- kekeringan (KEK) dan gelombang (GEL), K15, DP-23: S = E, tanpa K dan R ----------
def status_tambahan(kr, kode, P):
    """P = [P0..P3] int|None. Kolom wajib (kriteria tambahan.<kode>.wajib) null dan E = 0: abu; E > 0: tingkat E bertanda sebagian."""
    c = kr["tambahan"][kode]
    S = [P[d] if d in c["hari"] else None for d in range(4)]
    ada = [x for x in S if x is not None]
    lengkap = all(P[d] is not None for d in c["wajib"])
    s = max(ada) if ada else None
    if not lengkap and not s:
        return {"s": None, "pemicu": None, "sebagian": False, "hari": [None] * 4}
    return {"s": s, "pemicu": ("wilayah" if kode == "KEK" else "prakiraan") if s else None, "sebagian": not lengkap, "hari": S}


def status_tambahan_kab(kr, prediksi, lalu, kering, kmeta, kabs, cari, gerbang, kini):
    """-> {kab_id: {KEK?, GEL?}}. KEK: kab tak ada di berkas wilayah atau meta basi (> segar_hari) = abu; GEL: hanya kab pesisir (entri GEL ada)."""
    pb = (gerbang or {}).get("boleh_per_bahaya") or {}
    hi = kini.astimezone(WIB).date()
    try:
        umur = (hi - dt.date.fromisoformat((kmeta or {})["hari_ini"])).days
    except (KeyError, TypeError, ValueError):
        umur = None
    segar = bool(kering) and umur is not None and 0 <= umur <= kr["tambahan"]["KEK"]["segar_hari"]
    lv = {}
    for k, v in ((kering or {}).get("kab") or {}).items():
        p, _, n = k.partition("|")
        i = cari(p, n)
        if i is not None and v.get("lv") in (0, 1, 2, 3):
            lv[i] = max(lv.get(i, 0), v["lv"])
    out = {}
    for kab in kabs:
        d = {"KEK": dict(hipotesis=pb.get("KEK") is not True,
                         **status_tambahan(kr, "KEK", [lv.get(kab["id"]) if segar else None, None, None, None]))}
        if kab.get("GEL"):
            d["GEL"] = dict(hipotesis=pb.get("GEL") is not True, **status_tambahan(kr, "GEL", ambil_P(kr, prediksi, lalu, kab, "GEL", kini)))
        out[kab["id"]] = d
    return out


def jalankan(umpan=None, kini=None, keluar=KELUAR):
    kr = _json(KRITERIA)
    kini = kini or dt.datetime.now(dt.timezone.utc)
    dp = _muat("sp_dampak_peringatan", "scripts/siklus/dampak_peringatan.py")
    doc = _json(umpan) if umpan else dp.baca_umpan()
    h = dp.jalankan(doc, kini)
    out = hitung(kr, _json(PREDIKSI), _json(LALU), _json(KELAS), h, kini, _json(GERBANG))
    dasar = _muat("sp_dasar", "scripts/prediksi/dasar.py")
    kabs = (_json(PREDIKSI) or {}).get("kab") or []
    nm, kl = nama_tingkat_kht(_json(BENCANA)), _json(KLUSTER)
    for i, v in status_kht(kr, kl, _json(META), _json(UJIBALIK), nm, kabs, dasar.pencari(kabs), kini).items():
        out["kab"][i]["KHT"] = v
    gb = _json(GERBANG)
    for i, d in status_tambahan_kab(kr, _json(PREDIKSI), _json(LALU), _json(KERING), _json(KERING_META), kabs,
                                    dasar.pencari(kabs), gb, kini).items():
        out["kab"][i].update(d)
    out["boleh_per_bahaya"].update({k: ((gb or {}).get("boleh_per_bahaya") or {}).get(k) is True for k in kr["tambahan"]["bahaya"]})
    os.makedirs(os.path.dirname(keluar), exist_ok=True)
    tmp = keluar + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, keluar)
    if keluar == KELUAR:   # arsip harian append-only (DP-07, D36); uji tulis ke jalur lain tak mengarsipkan
        _muat("sp_uji_status", "scripts/prediksi/status_prakiraan_uji.py").arsipkan(out, kini)
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
        if kode != "CEX" and K is None:
            return min(E, 2)
        return E
    for kode, K, R, E in itertools.product(("BNJ", "BDG", "LSR", "CEX"), ("rendah", "sedang", "tinggi", None), (None, 0, 1, 2, 3), range(4)):
        for d in range(4):
            P = [E] * 4
            st = status_kab(kr, kode, K, P, R)
            esp = [ref(kode, K, max(E, R) if (R is not None and dd == 0) else E, R if dd == 0 else None) for dd in range(4)]
            lengkap = R is not None and (K is not None or kode == "CEX")
            if lengkap or max(esp) > 0:
                assert st["s"] == max(esp) and st["hari"] == esp, (kode, K, R, E, st, esp)
            else:
                assert st["s"] is None, (kode, K, R, E, st)
            if kode != "CEX" and (K is None or (K == "rendah" and R != 3)):
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

    x = status_kab(kr, "BNJ", None, [3, 3, 3, 3], 3)
    assert x["s"] == 2 and x["sebagian"] is True and x["hari"] == [2, 2, 2, 2]      # K null: plafon Siaga, tanda sebagian tetap
    assert status_kab(kr, "CEX", None, [3, 0, 0, 0], 3)["s"] == 3                    # CEX tak butuh K, tak dipagari

    # uji ujung ke ujung dengan fixture (tanpa jaringan)
    kini = dt.datetime(2026, 11, 26, 2, 0, tzinfo=dt.timezone.utc)   # 09.00 WIB
    kab = lambda i, lv: {"id": i, "nama": i, "BNJ": [[lv, .1]] * 3, "LSR": [[0, 0]] * 3, "CEX": [[10, 0]] * 3}
    H3 = ["2026-11-27", "2026-11-28", "2026-11-29"]
    pred = {"dibuat": "2026-11-26T04:46:15+07:00", "kode": {"BNJ": {"kol": ["lv", "ps"], "hari": H3}, "LSR": {"kol": ["lv", "ps"], "hari": H3},
                                                          "CEX": {"kol": ["emb", "lv"], "hari": H3}},
            "kab": [kab("1101", 2), kab("1102", 0)]}
    lalu = {"hari": {"2026-11-26": {k: {"kol": pred["kode"][k]["kol"], "kab": {"1101": [2, 0], "1102": [0, 0]}} for k in ("BNJ", "LSR", "CEX")}}}
    kelas = {"kab": {"1101": {"K": {"BNJ": "rendah", "LSR": "tinggi", "BDG": "sedang"}}, "1102": {"K": {"BNJ": "sedang", "LSR": None, "BDG": None}}}}
    h = {"umpan": {"status": "segar"}, "kab_tersentuh": {"BNJ": {"1101": 3}, "LSR": {"1101": 3}}}
    o = hitung(kr, pred, lalu, kelas, h, kini)
    assert o["hipotesis"] is True and set(o["kab"]) == {"1101", "1102"}
    b = o["kab"]["1101"]["BNJ"]
    assert b["s"] == 3 and b["pemicu"] == "bmkg" and b["hari"][0] == 3 and b["hari"][1:] == [2, 2, 2]   # K rendah, R = 3 melepas plafon
    assert o["kab"]["1101"]["LSR"]["s"] == 3 and o["kab"]["1101"]["CEX"]["s"] == 0
    assert o["kab"]["1102"]["BNJ"]["s"] == 0 and o["kab"]["1102"]["LSR"]["s"] is None   # K longsor null: belum terukur, bukan Normal
    assert o["kab"]["1102"]["CEX"]["s"] == 0
    # PH-02: golden K lama disuntik (bentuk baru) memberi hasil sama; BDG = BNJ dengan K bandang, E sama; e per hari ada
    assert ambil_K(kelas, "1101", "BNJ") == "rendah" and ambil_K(kelas, "1102", "LSR") is None and ambil_K(None, "1101", "BNJ") is None
    assert ambil_K({"kab": {"1101": {"nama": "x"}}}, "1101", "BNJ") is None          # kab tanpa blok K: null, tak jatuh
    assert b["e"] == [3, 2, 2, 2] and o["kab"]["1101"]["BDG"]["e"] == b["e"]                     # E BDG = E BNJ hari yang sama
    g1 = o["kab"]["1101"]["BDG"]
    assert g1["hari"] == [3, 2, 2, 2] and g1["s"] == 3 and g1["hipotesis"] is True                  # K sedang: S = E; tanpa vonis BDG = hipotesis
    assert o["kab"]["1102"]["BDG"]["s"] is None and o["kab"]["1102"]["BDG"]["e"] == [0, 0, 0, 0]  # K bandang null dan E = 0: belum terukur
    assert o["kab"]["1102"]["BNJ"]["e"] == [0, 0, 0, 0] and o["versi_kriteria"] == kr["versi"] == 3
    assert "BDG" in kr["bahaya"] and kr["sumber_E"] == {"BDG": "BNJ"} and "kelas_bahaya_kab" not in KELAS
    assert os.path.exists(SIDIK + ".v3") and os.path.exists(SIDIK + ".v2") and os.path.exists(SIDIK + ".v1")   # sidik lama diarsipkan, tak dibuang
    kd = _json(KELAS)
    if kd:   # berkas nyata: kab, K per kode baku
        assert all(set(v["K"]) >= {"BNJ", "BDG", "LSR"} for v in kd["kab"].values() if v.get("K"))
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
    # DP-06b: pemetaan P1..P3 lewat tanggal sasaran. Terbitan 25 Nov (sasaran 26..28) dibaca 26 Nov 20.00 WIB (umur 15 jam):
    # +1 = 27 = baris ke-2, +3 = 29 tak tercakup = None (bukan baris ke-3 yang bergeser)
    kb = {"id": "1101", "BNJ": [[1, 0], [2, 0], [3, 0]]}
    pl = {"dibuat": "2026-11-25T17:00:00+07:00", "kode": {"BNJ": {"kol": ["lv", "ps"], "hari": ["2026-11-26", "2026-11-27", "2026-11-28"]}}}
    assert ambil_P(kr, pl, None, kb, "BNJ", dt.datetime(2026, 11, 26, 13, 0, tzinfo=dt.timezone.utc))[1:] == [2, 3, None]
    # hari 0: tanpa lalu.hari[hari ini], pakai hari0 hanya bila berkas dibuat hari ini
    h0 = {"dibuat": "2026-11-26", "hari": {}, "hari0": {"BNJ": {"kol": ["lv", "ps"], "kab": {"1101": [2, 0]}}}}
    assert ambil_P(kr, pred, h0, kb, "BNJ", kini)[0] == 2
    assert ambil_P(kr, pred, dict(h0, dibuat="2026-11-25"), kb, "BNJ", kini)[0] is None   # hari0 basi tak dipakai
    # Normal kini bisa tercapai bila hari0 ada
    assert status_kab(kr, "CEX", None, [0, 0, 0, 0], 0)["s"] == 0
    # boleh_tampil hanya bila gerbang menyatakan true
    assert hitung(kr, pred, lalu, kelas, h, kini, {"boleh_tampil": True})["hipotesis"] is True      # tanpa boleh_per_bahaya: false
    g = hitung(kr, pred, lalu, kelas, h, kini, {"boleh_per_bahaya": {"BNJ": True, "LSR": False, "CEX": False}})
    k1 = g["kab"]["1101"]
    assert g["boleh_per_bahaya"] == {"BNJ": True, "BDG": False, "LSR": False, "CEX": False} and g["hipotesis"] is True
    assert k1["BNJ"]["hipotesis"] is False and k1["BDG"]["hipotesis"] is True and k1["LSR"]["hipotesis"] is True and k1["CEX"]["hipotesis"] is True

    # P17: karhutla KHT
    nm = {0: "Pencegahan rutin", 1: "Patroli terpadu", 2: "Siaga pemadaman awal", 3: "Prioritas pemadaman"}
    assert nama_tingkat_kht(_json(BENCANA)) == nm
    kk = [{"id": "1101", "nama": "A"}, {"id": "1102", "nama": "B"}, {"id": "1103", "nama": "C"}]
    cari = {("11", "A"): "1101", ("11", "B"): "1102", ("11", "C"): "1103"}.get
    ft = lambda n, lv: {"properties": {"prov": "11", "kab": n, "level": lv}}
    kl = {"features": [ft("A", 1), ft("A", 3), ft("A", 2), ft("B", 0), ft("X", 3)]}
    meta = {"dibuat": "2026-11-26T08:00:00+07:00"}                       # 1 jam sebelum kini (09.00 WIB)
    lw = {"tingkat": {"Waspada": {"vonis": "TIDAK LULUS"}, "Siaga": {"vonis": "TIDAK LULUS"}, "Awas": {"vonis": "TIDAK LULUS"}}}
    r = status_kht(kr, kl, meta, lw, nm, kk, lambda p, n: cari((p, n)), kini)
    assert r["1101"]["s"] == 3 and r["1101"]["nama"] == "Prioritas pemadaman" and r["1101"]["pemicu"] == "kluster"   # maks kluster
    assert r["1102"]["s"] == 0 and r["1103"]["s"] == 0 and r["1103"]["nama"] == "Pencegahan rutin"                   # tanpa kluster, segar
    assert all(v["hipotesis"] and not v["sebagian"] and set(v) >= {"s", "hari"} for v in r.values())               # tanpa R dan K
    lw["tingkat"]["Awas"]["vonis"] = "LULUS"
    r = status_kht(kr, kl, meta, lw, nm, kk, lambda p, n: cari((p, n)), kini)
    assert r["1101"]["hipotesis"] is False and r["1102"]["hipotesis"] is True                                         # lulus hanya untuk tingkatnya
    for m in ({"dibuat": "2026-11-24T08:00:00+07:00"}, None, {}):                                                     # basi / hilang
        r = status_kht(kr, kl, m, lw, nm, kk, lambda p, n: cari((p, n)), kini)
        assert all(v["s"] is None and v["nama"] is None and v["hipotesis"] for v in r.values())
    assert status_kht(kr, None, meta, lw, nm, kk, lambda p, n: None, kini)["1101"]["s"] is None
    # P21: kekeringan dan gelombang (K15), S = E tanpa K dan R
    assert kr["tambahan"]["bahaya"] == ["KEK", "GEL"]
    for e in range(4):
        assert status_tambahan(kr, "KEK", [e, None, None, None])["s"] == e and not status_tambahan(kr, "KEK", [e, None, None, None])["sebagian"]
        assert status_tambahan(kr, "GEL", [e] * 4) == {"s": e, "pemicu": "prakiraan" if e else None, "sebagian": False, "hari": [e] * 4}
    assert status_tambahan(kr, "KEK", [None] * 4)["s"] is None                       # tak terukur bukan 0
    assert status_tambahan(kr, "GEL", [0, 0, 0, None])["s"] is None                  # satu hari hilang, E = 0: abu
    x = status_tambahan(kr, "GEL", [None, 2, 1, 0])
    assert x["s"] == 2 and x["sebagian"] is True and x["pemicu"] == "prakiraan"      # E > 0: tingkat dengan tanda sebagian
    assert status_tambahan(kr, "KEK", [3, None, None, None])["pemicu"] == "wilayah"
    cr = {("11", "A"): "1101", ("11", "B"): "1102", ("11", "C"): "1103"}.get
    kw = {"kab": {"11|A": {"lv": 3}, "11|B": {"lv": 0}, "11|X": {"lv": 2}}}
    pg = {"dibuat": "2026-11-26T04:46:15+07:00", "kode": {"GEL": {"kol": ["hs", "lv"], "hari": H3}}}
    ka = [{"id": "1101", "GEL": [[3.9, 2]] * 3}, {"id": "1102"}, {"id": "1103"}]
    lg = {"dibuat": "2026-11-26", "hari": {}, "hari0": {"GEL": {"kol": ["hs", "lv"], "kab": {"1101": [1.3, 1]}}}}
    t = status_tambahan_kab(kr, pg, lg, kw, {"hari_ini": "2026-11-20"}, ka, lambda p, n: cr((p, n)), None, kini)
    assert t["1101"]["KEK"]["s"] == 3 and t["1102"]["KEK"]["s"] == 0 and t["1103"]["KEK"]["s"] is None   # kab di luar berkas: abu
    assert t["1101"]["GEL"]["hari"] == [1, 2, 2, 2] and t["1101"]["GEL"]["hipotesis"] and "GEL" not in t["1102"]   # non-pesisir: tak berlaku
    assert all(v["KEK"]["s"] is None for v in status_tambahan_kab(kr, pg, lg, kw, {"hari_ini": "2026-11-01"}, ka, lambda p, n: cr((p, n)), None, kini).values())  # meta basi
    assert all(v["KEK"]["s"] is None for v in status_tambahan_kab(kr, pg, lg, kw, None, ka, lambda p, n: cr((p, n)), None, kini).values())
    _muat("sp_uji_status", "scripts/prediksi/status_prakiraan_uji.py").cek()      # P19, P20
    print("status_prakiraan: cek hijau (P10, P11, P12, P17, P19, P20, P21 + fixture)")


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
