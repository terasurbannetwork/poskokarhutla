"""Catatan prospektif append-only arah abu skenario vs VONA PVMBG (B03) -> public/banjir/data/prospektif_abu.json. Pola scripts/gempa/susulan.py `prospektif`.

Tiap hari, untuk tiap gunung Level II ke atas di abu_gunungapi.json, dicatat SATU entri sebelum hasilnya diketahui:
  skenario.arah_deg  arah (derajat, ke mana awan bergerak) titik tengah sebaran partikel mentah (`jejak_tipis`, metrik LAMA, tetap dicatat agar sejarah sebanding).
  METODE v2 (KI-80, dibekukan di prospektif_v2.sidik, kriteria di prospektif_v2_kriteria.md): potret pada jam ke-3 (= jam penilaian uji balik; entri lama jam 6);
                     skenario.per_offset[k], k = 0..12: arah sebaran mentah + arah KOLOM ATAS (0,5H-1H, berbobot massa; yang terlihat VONA) bila erupsi k jam sesudah angin.mulai,
                     plus angin kolom (arah, laju). Saat dinilai dipilih k = jam terbit VONA terhadap awal jendela; arah utama = kolom atas (sebaran mentah bila tak sah).
  jendela            [angin.mulai, angin.mulai + 12 jam]: VONA yang diterbitkan di sini dan menulis arah awan ("moving to northeast") menilai entri.
Penilaian (sekali, entri tidak diubah lagi): VONA PERTAMA bergerah di jendela itu; selisih sudut <= 45 derajat = cocok (8 mata angin, resolusi 45 derajat;
pembanding acak 25%; pembanding lain di `ringkasan.pembanding`, lihat bawah). Bila tak ada VONA beraraah (awan tak teramati atau tak ada erupsi) entri ditutup `n_vona: 0` dan TIDAK dihitung dalam metrik.
Bila VONA tak terjangkau atau daftar yang dibaca tak mencapai awal jendela, `dinilai` tetap null (slot kosong) dan `vona_terjangkau` false pada
catatan lari terakhir; ini bukan kegagalan model.
Pembanding (KI-41, hanya cara menghitung ringkasan; entri tak diubah): pada baris yang sama dinilai (a) persistensi = arah VONA gunung itu yang TERBIT sebelum
awal jendela dan sebelum entri dicatat, paling lama PERSIS_MAKS_HARI hari sebelumnya (ditetapkan di muka; sumber: cache VONA uji_abu + VONA yang sudah ternilai di arsip ini);
(b) klimatologi = arah VONA terbanyak gunung itu dari semua VONA lain pada tanggal berbeda (leave-one-out, fungsi `uji_abu.klimatologi`); (c) acak 25%; (d) campuran = arah VONA terakhir, diganti arah model bila angin kolom berbelok > 45 derajat sejak VONA itu dan laju > 5 m/s (hanya bila angin kedua VONA tercatat, yakni entri v2).
Vonis v2 hanya dari entri metode v2 yang dicatat sesudah BEKU, bila n >= 60 dan >= 4 gunung (bootstrap berblok per gunung); sebelum itu `ringkasan.uji_v2.status` = "belum teruji".
Tiap metode dihitung pada baris yang punya pembandingnya, dengan n sendiri dan CI95 Wilson; selisih model dikurangi pembanding (poin persen) memakai bootstrap berblok
per gunung (`scripts/umum/pembanding.py`), kosong bila kurang dari 2 gunung.
Batas: satu entri = satu gunung satu hari, jadi hari-hari berurutan di gunung yang sama berbagi angin dan musim (p binomial optimistis); skenario
mengandaikan erupsi pada awal jendela sedangkan VONA terbit pada jam erupsi sebenarnya, hingga 12 jam kemudian.
Pakai:  python3 scripts/gunungapi/prospektif.py        catat + nilai (jaringan MAGMA untuk penilaian)
        python3 scripts/gunungapi/prospektif.py uji    self-check
"""
import datetime as dt, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import abu
from uji_abu import MATA, p_binomial, selisih, klimatologi as klim_arah, CACHE
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../umum"))
from pembanding import bootstrap_blok
import sidik as sidik_mod

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
ABU = os.path.join(AKAR, "public/banjir/data/abu_gunungapi.json")
KELUAR = os.path.join(AKAR, "public/banjir/data/prospektif_abu.json")
VONA = "https://magma.esdm.go.id/v1/vona"
JAM_SKEN = abu.JAM_ARAH   # jam potret skenario = jam penilaian uji balik (3), sejak metode v2 (KI-80); entri lama memakai jam 6 dan tidak diubah
JENDELA_JAM = 12    # lebar jendela penilaian
HAL_MAKS = 12       # halaman daftar VONA (15 per halaman, terbaru dulu) paling banyak yang dibaca
MAKS_BYTE = 5_000_000
TIPS = 45
PERSIS_MAKS_HARI = 30   # persistensi hanya memakai VONA sebelumnya yang tak lebih lama dari ini (ditetapkan sebelum melihat hasil)
METODE = "v2"       # entri baru: arah kolom atas, awal skenario = jam terbit VONA, jam skenario = jam penilaian (KI-80)
BEKU = "2026-11-25"  # hanya entri metode v2 yang DICATAT SESUDAH tanggal ini (dan sidik masih utuh) ikut vonis
SIDIK = "scripts/gunungapi/prospektif_v2.sidik"   # relatif ke akar repo; kriteria: prospektif_v2_kriteria.md
VONIS_N, VONIS_GUNUNG = 60, 4   # vonis hanya bila n >= 60 DAN >= 4 gunung; sebelum itu layar "belum teruji"
CAMPUR_DEG, CAMPUR_MS = 45, 5   # pembanding campuran: ganti ke arah model bila angin kolom berbelok > 45 derajat sejak VONA lalu dan lajunya > 5 m/s
TELAT_JAM = 2       # entri yang dicatat lebih dari ini sesudah awal jendela ditolak: sebagian jendela sudah lewat dan hasilnya bisa diketahui


def _t(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def urai_vona(h):
    """Halaman daftar VONA -> [{gunung (slug), waktu (ISO Z), arah (mata angin) | None}]."""
    out = []
    for m in re.finditer(r'<small>(\d{4}-\d\d-\d\d \d\d:\d\d):\d\d UTC</small>.*?timeline-title"><a[^>]*>(.*?) - \d{8}/\d{4}Z</a>.*?timeline-text">(.*?)</p>', h, re.S):
        d = re.search(r"moving to ([a-z]+)", re.sub(r"\s+", " ", m.group(3)))
        out.append({"gunung": abu.id_gunung(re.sub(r"<[^>]+>", "", m.group(2)).strip()), "waktu": m.group(1).replace(" ", "T") + ":00Z",
                    "arah": d.group(1) if d and d.group(1) in MATA else None})
    return out


def baca_vona(awal, ambil=None):
    """Daftar VONA terbaru ke belakang sampai melewati `awal` (datetime). -> (kejadian, mencapai_awal: bool). Gagal jaringan: ([], False)."""
    ambil = ambil or (lambda p: abu.ambil_byte(VONA + (f"?page={p}" if p > 1 else ""), MAKS_BYTE).decode("utf-8", "replace"))
    ev = []
    for p in range(1, HAL_MAKS + 1):
        try:
            h = ambil(p)
        except Exception as e:
            print(f"  VONA halaman {p}: {e}", file=sys.stderr)
            return ev, False
        b = urai_vona(h)
        if not b:
            return ev, False
        ev += b
        if min(_t(x["waktu"]) for x in b) < awal:
            return ev, True
        time.sleep(.4)
    return ev, False


def beku_utuh():
    """True bila sidik pra-registrasi v2 ada dan semua berkas kodenya belum berubah (sidik.cek dari akar repo)."""
    asal = os.getcwd()
    try:
        os.chdir(AKAR)
        sidik_mod.cek(SIDIK)
        return True
    except (SystemExit, OSError, ValueError, KeyError):
        return False
    finally:
        os.chdir(asal)


def entri_baru(g, abu_o, kini, beku=None):
    """Satu entri untuk gunung g (isi abu_gunungapi.json), None bila skenario v2 (`arah_mulai`, jam JAM_SKEN) tidak ada.
    skenario.per_offset[k] = arah awan bila erupsi k jam sesudah awal jendela (k = 0..12): dicatat SEKARANG, dipilih saat dinilai menurut jam terbit VONA."""
    am = g.get("arah_mulai")
    if not am or am.get("jam") != JAM_SKEN or not am.get("per_offset") or am["per_offset"][0].get("tipis_deg") is None:
        return None
    mulai = g["angin"]["mulai"]
    if kini > _t(mulai) + dt.timedelta(hours=TELAT_JAM):
        return None   # terlambat: bukan prospektif murni
    beku = beku_utuh() if beku is None else beku
    return {"id": f"{g['id']}|{mulai[:10]}", "gunung": g["nama"], "gunung_id": g["id"], "level": g["level"], "dicatat": kini.strftime("%Y-%m-%dT%H:%MZ"),
            "skenario": {"metode": METODE if beku else METODE + "-tak-beku", "arah_deg": am["per_offset"][0]["tipis_deg"], "arah_atas_deg": am["per_offset"][0]["atas_deg"],
                         "per_offset": am["per_offset"], "jam": JAM_SKEN, "kolom_m": g["kolom_m"], "kolom_sumber": g["kolom_sumber"], "model": abu_o["model"], "dibuat": abu_o["dibuat"]},
            "jendela": [mulai, (_t(mulai) + dt.timedelta(hours=JENDELA_JAM)).strftime("%Y-%m-%dT%H:%M:%SZ")], "dinilai": None}


def nilai(e, vona, mencapai, kini):
    """Hasil penilaian untuk entri e, atau None bila belum bisa (jendela belum lewat, atau daftar VONA tak mencapai awal jendela)."""
    a, b = (_t(x) for x in e["jendela"])
    if kini < b + dt.timedelta(hours=1) or not mencapai:
        return None
    di = sorted((v for v in vona if v["gunung"] == e["gunung_id"] and a <= _t(v["waktu"]) <= b and v["arah"]), key=lambda v: v["waktu"])
    pada = kini.strftime("%Y-%m-%dT%H:%MZ")
    if not di:
        return {"pada": pada, "n_vona": 0}
    v = di[0]
    po = e["skenario"].get("per_offset")
    if not po:   # entri lama (jam 6, awal = awal jendela)
        sel = selisih(e["skenario"]["arah_deg"], MATA[v["arah"]])
        return {"pada": pada, "n_vona": len(di), "vona_waktu": v["waktu"], "arah_vona": v["arah"], "arah_vona_deg": MATA[v["arah"]], "selisih_deg": sel, "cocok": sel <= TIPS}
    k = min(max(round((_t(v["waktu"]) - a).total_seconds() / 3600), 0), len(po) - 1)   # awal skenario = jam terbit VONA
    p = po[k]
    arah, sb = (p["atas_deg"], "atas") if p["atas_deg"] is not None else (p["tipis_deg"], "tipis")   # utama: kolom atas; sebaran mentah hanya bila kolom atas tak sah
    sel = selisih(arah, MATA[v["arah"]])
    return {"pada": pada, "n_vona": len(di), "vona_waktu": v["waktu"], "arah_vona": v["arah"], "arah_vona_deg": MATA[v["arah"]], "selisih_deg": sel, "cocok": sel <= TIPS,
            "offset_jam": k, "arah_model_deg": arah, "arah_sumber": sb, "cocok_tipis": selisih(p["tipis_deg"], MATA[v["arah"]]) <= TIPS, "angin_kolom": p["angin_kolom"]}


def _ringkas_satu(s):
    k = sum(1 for d in s if d["cocok"])
    return {"n": len(s), "cocok": k, "persen": round(100 * k / len(s)) if s else None, "acak_persen": 25, "p_binomial": float(f"{p_binomial(k, len(s)):.3g}") if s else None}


def wilson(k, n, z=1.96):
    """CI95 Wilson untuk proporsi k/n, dalam persen (1 desimal)."""
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** .5) / d
    return [round(100 * (c - h), 1), round(100 * (c + h), 1)]


def riwayat_vona(entri, cache=None):
    """{gunung_id: [{waktu, arah_vona}]} dari cache VONA uji_abu ditambah VONA yang sudah ternilai di arsip; tanpa duplikat waktu."""
    r = {}
    for nama, ev in (abu.baca(CACHE, {}) if cache is None else cache).items():
        for e in ev:
            r.setdefault(abu.id_gunung(nama), {})[e["waktu"]] = (e["arah_vona"], None)
    for x in entri:
        d = x.get("dinilai") or {}
        if d.get("arah_vona"):
            r.setdefault(x["gunung_id"], {})[d["vona_waktu"]] = (d["arah_vona"], d.get("angin_kolom"))   # angin kolom saat VONA itu hanya ada untuk entri v2
    return {g: [{"waktu": w, "arah_vona": a, "angin": ang} for w, (a, ang) in sorted(v.items())] for g, v in r.items()}


def campuran(arah_lalu, angin_lalu, angin_kini, arah_model):
    """Pembanding campuran: arah VONA terakhir (derajat), diganti arah model bila angin kolom berbelok > CAMPUR_DEG sejak VONA itu DAN lajunya kini > CAMPUR_MS.
    angin_* = {arah_deg, kec_ms}. None bila salah satu angin tak tercatat (tak bisa diputuskan; tidak ditebak)."""
    if not angin_lalu or not angin_kini or arah_model is None:
        return None
    return arah_model if selisih(angin_kini["arah_deg"], angin_lalu["arah_deg"]) > CAMPUR_DEG and angin_kini["kec_ms"] > CAMPUR_MS else arah_lalu


def _satu(h, kunci):
    k = sum(b[kunci] for b in h if b[kunci] is not None)
    s = [b for b in h if b[kunci] is not None]
    return {"n": len(s), "cocok": sum(b[kunci] for b in s), "persen": round(100 * sum(b[kunci] for b in s) / len(s)) if s else None,
            "ci95": wilson(sum(b[kunci] for b in s), len(s)) if s else None}


def _selisih(h, kunci, dasar="m"):
    s = [b for b in h if b[kunci] is not None and b[dasar] is not None]
    if len({b["gunung"] for b in s}) < 2:
        return None
    f = lambda rs: 100 * (sum(b[dasar] for b in rs) - sum(b[kunci] for b in rs)) / len(rs)
    r = bootstrap_blok(f, s, "gunung")
    return {"n": len(s), "est": round(r["est"], 1), "lo": round(r["lo"], 1), "hi": round(r["hi"], 1), "n_blok": r["n_blok"]}


def pembanding(entri, riwayat):
    """Model vs persistensi, klimatologi (leave-one-out), acak pada entri ternilai yang dihitung (n_vona > 0, tidak terlambat). Lihat docstring modul."""
    h = []
    for x in entri:
        d = x["dinilai"]
        if not (d and d.get("n_vona") and not x.get("terlambat")):
            continue
        tgt, awal, cat = d["arah_vona_deg"], _t(x["jendela"][0]), _t(x["dicatat"])
        batas = min(awal, cat)
        prev = [e for e in riwayat.get(x["gunung_id"], []) if batas - dt.timedelta(days=PERSIS_MAKS_HARI) <= _t(e["waktu"]) < batas and e["waktu"] != d["vona_waktu"]]
        kl = klim_arah(x["gunung_id"], d["vona_waktu"], riwayat)
        cm = campuran(MATA[prev[-1]["arah_vona"]], prev[-1].get("angin"), d.get("angin_kolom"), d.get("arah_model_deg")) if prev else None
        h.append({"gunung": x["gunung_id"], "m": int(d["cocok"]),
                  "p": int(selisih(MATA[prev[-1]["arah_vona"]], tgt) <= TIPS) if prev else None,
                  "k": int(selisih(kl, tgt) <= TIPS) if kl is not None else None,
                  "c": int(selisih(cm, tgt) <= TIPS) if cm is not None else None})
    if not h:
        return None
    def aman(f):
        try:
            return f()
        except ValueError:
            return None
    return {"n_ternilai": len(h), "model": _satu(h, "m"), "persistensi": _satu(h, "p"), "klimatologi": _satu(h, "k"), "campuran": _satu(h, "c"), "acak": {"persen": 25},
            "selisih_model_persistensi": aman(lambda: _selisih(h, "p")), "selisih_model_klimatologi": aman(lambda: _selisih(h, "k")),
            "selisih_model_campuran": aman(lambda: _selisih(h, "c")), "selisih_campuran_persistensi": aman(lambda: _selisih(h, "p", "c")),
            "persistensi_maks_hari": PERSIS_MAKS_HARI, "campuran_aturan": f"arah VONA terakhir; ganti ke arah model bila angin kolom berbelok > {CAMPUR_DEG} derajat sejak VONA itu dan laju > {CAMPUR_MS} m/s; tanpa angin tercatat = tak dihitung"}


def uji_v2(entri, riwayat):
    """Vonis metode v2 (KI-80), hanya entri metode v2 yang dicatat SESUDAH BEKU dengan sidik utuh. Vonis hanya bila n >= VONIS_N dan >= VONIS_GUNUNG gunung;
    selain itu status 'belum teruji' dan layar tidak boleh menyebut model unggul atau kalah. Vonis = selang bootstrap blok per gunung atas model dikurangi persistensi."""
    sub = [x for x in entri if (x.get("skenario") or {}).get("metode") == METODE and x["dicatat"][:10] > BEKU]
    pb = pembanding(sub, riwayat)
    n = pb["n_ternilai"] if pb else 0
    ng = len({x["gunung_id"] for x in sub if x["dinilai"] and x["dinilai"].get("n_vona") and not x.get("terlambat")})
    o = {"metode": METODE, "beku": BEKU, "n": n, "n_gunung": ng, "syarat": {"n": VONIS_N, "gunung": VONIS_GUNUNG}, "status": "belum teruji"}
    if pb and n >= VONIS_N and ng >= VONIS_GUNUNG:
        d = pb["selisih_model_persistensi"]
        o["status"] = ("selang tak terhitung" if not d or d["lo"] is None else "model unggul atas persistensi" if d["lo"] > 0
                       else "model kalah dari persistensi" if d["hi"] < 0 else "setara persistensi (selang melewati 0)")
        o["pembanding"] = pb
    return o


def ringkas(entri, riwayat=None):
    """Ringkasan DIPECAH menurut asal tinggi kolom skenario (kolom_sumber.split()[0] huruf kecil: asumsi, letusan, vona): kolom dari VONA yang
    dinilai terhadap VONA lain tidak boleh bercampur dengan asumsi level. Entri lama (append-only) tetap, hanya cara menghitung ringkasan yang berubah."""
    grup = {}
    for x in entri:
        d = x["dinilai"]
        if d and d.get("n_vona") and not x.get("terlambat"):
            ks = ((x.get("skenario") or {}).get("kolom_sumber") or "").split()
            grup.setdefault(ks[0].lower() if ks else "tak_diketahui", []).append(d)
    out = {"per_sumber": {k: _ringkas_satu(v) for k, v in sorted(grup.items())}}
    if riwayat is not None and (pb := pembanding(entri, riwayat)):
        out["pembanding"] = pb
    if riwayat is not None:
        out["uji_v2"] = uji_v2(entri, riwayat)
    return out


def gabung(lama, baru):
    """Tolak bila entri lama hilang atau skenarionya berubah, atau penilaian yang sudah ada berubah (append-only)."""
    bk = {x["id"]: x for x in baru["entri"]}
    for x in lama.get("entri", []):
        y = bk.get(x["id"])
        if y is None or y["skenario"] != x["skenario"] or y["jendela"] != x["jendela"] or (x.get("dinilai") and y.get("dinilai") != x["dinilai"]):
            raise ValueError(f"prospektif bukan append-only: entri {x['id']} hilang atau diubah")
    return baru


def jalan(kini=None, ambil=None, abu_o=None):
    kini = kini or dt.datetime.now(dt.timezone.utc)
    abu_o = abu_o or abu.baca(ABU, None)
    if not abu_o:
        raise SystemExit("abu_gunungapi.json belum ada")
    lama = abu.baca(KELUAR, {"entri": []})
    entri = [dict(x) for x in lama["entri"]]
    ada = {x["id"] for x in entri}
    for g in abu_o["gunung"]:
        e = entri_baru(g, abu_o, kini)
        if e and e["id"] not in ada:
            entri.append(e); ada.add(e["id"])
    tunda = [x for x in entri if x["dinilai"] is None and kini >= _t(x["jendela"][1]) + dt.timedelta(hours=1)]
    terjangkau = None
    if tunda:
        vona, mencapai = baca_vona(min(_t(x["jendela"][0]) for x in tunda), ambil)
        terjangkau = bool(vona)
        for x in tunda:
            x["dinilai"] = nilai(x, vona, mencapai, kini)
    baru = {"diperbarui": kini.strftime("%Y-%m-%dT%H:%MZ"), "vona_terjangkau": terjangkau, "dicatat": len(entri), "dinilai": sum(1 for x in entri if x["dinilai"]),
            "ringkasan": ringkas(entri, riwayat_vona(entri)), "jam_skenario": JAM_SKEN, "metode": METODE, "beku": BEKU, "jendela_jam": JENDELA_JAM, "ambang_deg": TIPS,
            "catatan": "Append-only. Tiap hari tiap gunung Level II ke atas dicatat arah awan abu skenario (jam ke-3 untuk entri v2, jam ke-6 untuk entri lama) sebelum hasilnya diketahui; dinilai sekali terhadap VONA PVMBG "
                       "pertama yang menulis arah awan dalam 12 jam sejak awal skenario. Entri tanpa VONA beraraah ditutup n_vona 0 dan tidak dihitung. Entri lama tidak pernah diubah atau dihapus.",
            "entri": entri}
    abu.simpan(KELUAR, gabung(lama, baru))
    print("prospektif abu:", baru["dicatat"], "dicatat,", baru["dinilai"], "dinilai, ringkasan", baru["ringkasan"], "VONA terjangkau" if terjangkau else "")
    return baru


def uji():
    h = ('<div><small>2026-10-19 11:48:00 UTC</small> <a>Orange</a><p class="timeline-title"><a href="#">Semeru - 20261019/1148Z</a></p><p class="timeline-text">Eruption at 1148 UTC. Ash-cloud is not observed.</p></div>'
         '<div><small>2026-10-19 06:33:00 UTC</small><p class="timeline-title"><a href="#">Lewotobi Laki-Laki - 20261019/0633Z</a></p><p class="timeline-text">Ash cloud moving to northeast. foo</p></div>')
    v = urai_vona(h)
    assert v == [{"gunung": "semeru", "waktu": "2026-10-19T11:48:00Z", "arah": None}, {"gunung": "lewotobi-laki-laki", "waktu": "2026-10-19T06:33:00Z", "arah": "northeast"}], v
    assert abu.id_gunung("Lewotobi Laki-laki") == "lewotobi-laki-laki"
    po = [{"k": k, "tipis_deg": 260, "atas_deg": 250 + k, "angin_kolom": {"arah_deg": 80, "kec_ms": 8.0}} for k in range(13)]   # atas_deg = 250 + k: penanda offset
    g = {"id": "semeru", "nama": "Semeru", "level": 3, "kolom_m": 2000, "kolom_sumber": "asumsi", "angin": {"mulai": "2026-10-18T19:00:00Z"},
         "arah_mulai": {"jam": JAM_SKEN, "kolom_m": 2000, "per_offset": po}}
    assert JAM_SKEN == 3 == abu.JAM_ARAH == __import__("uji_abu").JAM_NILAI   # jam skenario = jam penilaian
    assert entri_baru({**g, "arah_mulai": {**g["arah_mulai"], "jam": 6}}, {"model": "m", "dibuat": "d"}, dt.datetime(2026, 10, 18, 20, 0, tzinfo=dt.timezone.utc), True) is None
    ao = {"model": "m", "dibuat": "2026-10-19T02:43:33+07:00", "gunung": [g]}
    kini = dt.datetime(2026, 10, 18, 20, 0, tzinfo=dt.timezone.utc)
    e = entri_baru(g, ao, kini, True)
    assert e["skenario"]["metode"] == "v2" and entri_baru(g, ao, kini, False)["skenario"]["metode"] == "v2-tak-beku"
    assert entri_baru(g, ao, dt.datetime(2026, 10, 19, 13, 54, tzinfo=dt.timezone.utc), True) is None   # dicatat 19 jam sesudah awal: ditolak
    assert ringkas([{"dinilai": {"n_vona": 1, "cocok": True}, "terlambat": True}]) == {"per_sumber": {}}
    assert e["id"] == "semeru|2026-10-18" and e["jendela"] == ["2026-10-18T19:00:00Z", "2026-10-19T07:00:00Z"] and e["dinilai"] is None and e["skenario"]["arah_deg"] == 260 and e["skenario"]["arah_atas_deg"] == 250, e
    assert entri_baru({k: v for k, v in g.items() if k != "arah_mulai"}, ao, kini, True) is None
    kemudian = dt.datetime(2026, 10, 19, 12, 0, tzinfo=dt.timezone.utc)
    assert nilai(e, [], True, kini) is None and nilai(e, [], False, kemudian) is None   # jendela belum lewat / daftar tak mencapai awal: slot kosong
    assert nilai(e, [], True, kemudian) == {"pada": "2026-10-19T12:00Z", "n_vona": 0}
    ev = [{"gunung": "semeru", "waktu": "2026-10-19T03:00:00Z", "arah": "west"}, {"gunung": "semeru", "waktu": "2026-10-19T09:00:00Z", "arah": "east"}, {"gunung": "ibu", "waktu": "2026-10-19T02:00:00Z", "arah": "west"}]
    r = nilai(e, ev, True, kemudian)
    # VONA 03:00Z = 8 jam sesudah awal (19:00Z): skenario offset 8 dipakai (atas 258), bukan offset 0
    assert r["n_vona"] == 1 and r["arah_vona"] == "west" and r["offset_jam"] == 8 and r["arah_model_deg"] == 258 and r["arah_sumber"] == "atas" and r["selisih_deg"] == 12 and r["cocok"] is True, r
    assert r["cocok_tipis"] is True and r["angin_kolom"] == {"arah_deg": 80, "kec_ms": 8.0}
    assert nilai(e, [dict(ev[0], arah="east")], True, kemudian)["cocok"] is False
    assert nilai(e, [dict(ev[0], waktu="2026-10-19T06:59:00Z")], True, kemudian)["offset_jam"] == 12   # dibulatkan ke jam terdekat, tak lewat 12
    e_tipis = {**e, "skenario": {**e["skenario"], "per_offset": [{**x, "atas_deg": None} for x in po]}}   # kolom atas tak sah -> sebaran mentah
    assert nilai(e_tipis, ev, True, kemudian)["arah_sumber"] == "tipis" and nilai(e_tipis, ev, True, kemudian)["arah_model_deg"] == 260
    e_lama = {**e, "skenario": {"arah_deg": 260, "jam": 6}}   # entri lama: perilaku lama utuh
    assert nilai(e_lama, ev, True, kemudian) == {"pada": "2026-10-19T12:00Z", "n_vona": 1, "vona_waktu": "2026-10-19T03:00:00Z", "arah_vona": "west", "arah_vona_deg": 270, "selisih_deg": 10, "cocok": True}
    lama = {"entri": [{**e, "dinilai": r}]}
    gabung(lama, {"entri": [{**e, "dinilai": r}]})
    for rusak in ({"entri": []}, {"entri": [{**e, "dinilai": {**r, "cocok": False}}]}, {"entri": [{**e, "skenario": {**e["skenario"], "arah_deg": 1}, "dinilai": r}]}):
        try:
            gabung(lama, rusak); raise SystemExit("append-only dilanggar tanpa galat")
        except ValueError:
            pass
    sk = lambda t: {"kolom_sumber": t}
    assert ringkas([{"dinilai": r, "skenario": sk("asumsi level 2")}, {"dinilai": {"n_vona": 0}}, {"dinilai": None}]) == {"per_sumber": {"asumsi": {"n": 1, "cocok": 1, "persen": 100, "acak_persen": 25, "p_binomial": 0.25}}}
    pr = ringkas([{"dinilai": r, "skenario": sk("VONA 10-11-2026 15.03 WIB")}, {"dinilai": {**r, "cocok": False}, "skenario": sk("letusan MAGMA 10-11-2026")}, {"dinilai": r, "skenario": sk("asumsi level 3")}])["per_sumber"]
    assert sorted(pr) == ["asumsi", "letusan", "vona"] and pr["vona"]["cocok"] == 1 and pr["letusan"]["cocok"] == 0   # tiap sumber dihitung sendiri
    # baca_vona: daftar yang tak mencapai awal jendela dilaporkan, tidak diam-diam dianggap lengkap
    hal = lambda p: h
    ev2, ok = baca_vona(dt.datetime(2026, 10, 19, 7, 0, tzinfo=dt.timezone.utc), hal)
    assert ok and len(ev2) == 2
    ev3, ok = baca_vona(dt.datetime(2020, 1, 1, tzinfo=dt.timezone.utc), lambda p: h)
    assert not ok and len(ev3) == 2 * HAL_MAKS
    assert baca_vona(kini, lambda p: 1 / 0) == ([], False)
    # pembanding: persistensi harus menang atas model yang salah arah; klimatologi leave-one-out; < 2 gunung tanpa CI selisih
    def ent(gid, hari, arah="east", cocok=False):
        w = f"2026-10-{hari:02d}T20:00:00Z"
        return {"gunung_id": gid, "dicatat": f"2026-10-{hari:02d}T19:30Z", "jendela": [f"2026-10-{hari:02d}T19:00:00Z", f"2026-10-{hari + 1:02d}T07:00:00Z"],
                "dinilai": {"n_vona": 1, "vona_waktu": w, "arah_vona": arah, "arah_vona_deg": MATA[arah], "cocok": cocok}}
    es = [ent(g, d) for g in ("a", "b", "c") for d in (2, 6, 10, 14)]
    pb = pembanding(es, riwayat_vona(es, {}))
    assert pb["n_ternilai"] == 12 and pb["model"]["cocok"] == 0 and pb["persistensi"] == {"n": 9, "cocok": 9, "persen": 100, "ci95": pb["persistensi"]["ci95"]}, pb
    assert pb["persistensi"]["ci95"][0] > 60 and pb["klimatologi"]["n"] == 12 and pb["selisih_model_persistensi"]["est"] == -100.0 and pb["selisih_model_persistensi"]["hi"] < 0, pb
    # VONA sebelumnya lebih lama dari PERSIS_MAKS_HARI tak dipakai; hanya satu gunung -> selisih None
    es2 = [ent("a", 2), {**ent("a", 6), "jendela": ["2026-12-30T19:00:00Z", "2026-12-31T07:00:00Z"], "dicatat": "2026-12-30T19:30Z"}]
    p2 = pembanding(es2, riwayat_vona(es2, {}))
    assert p2["persistensi"]["n"] == 0 and p2["selisih_model_persistensi"] is None and p2["persistensi"]["persen"] is None, p2
    assert ringkas(es, {}).get("pembanding") is not None and "pembanding" not in ringkas(es)
    assert wilson(5, 10) == [23.7, 76.3], wilson(5, 10)
    # campuran: berganti ke model HANYA bila angin berbelok > 45 derajat DAN laju > 5 m/s; angin tak tercatat -> tak diputuskan
    A = lambda d, k: {"arah_deg": d, "kec_ms": k}
    assert campuran(90, A(90, 8), A(200, 8), 270) == 270            # belok 110, laju 8: model
    assert campuran(90, A(90, 8), A(200, 4.9), 270) == 90           # belok tapi lemah: VONA lalu
    assert campuran(90, A(90, 8), A(135, 8), 270) == 90             # belok tepat 45 (tidak > 45): VONA lalu
    assert campuran(90, A(90, 8), A(136, 8), 270) == 270            # 46 derajat: model
    assert campuran(90, A(350, 8), A(20, 8), 270) == 90             # lintas 0/360: selisih 30
    assert campuran(90, A(90, 5), A(200, 5.0), 270) == 90           # laju tepat 5 (tidak > 5): VONA lalu
    assert campuran(90, None, A(200, 8), 270) is None and campuran(90, A(90, 8), None, 270) is None and campuran(90, A(90, 8), A(200, 8), None) is None
    def ent2(gid, hari, arah, ang, am, bulan=10, cocok=False):
        w = f"2026-{bulan:02d}-{hari:02d}T20:00:00Z"
        return {"gunung_id": gid, "dicatat": f"2026-{bulan:02d}-{hari:02d}T19:30Z", "jendela": [f"2026-{bulan:02d}-{hari:02d}T19:00:00Z", f"2026-{bulan:02d}-{hari + 1:02d}T07:00:00Z"],
                "skenario": {"metode": "v2"},
                "dinilai": {"n_vona": 1, "vona_waktu": w, "arah_vona": arah, "arah_vona_deg": MATA[arah], "cocok": cocok, "angin_kolom": ang, "arah_model_deg": am}}
    e1, e2, e3 = ent2("a", 2, "east", A(90, 8), 90), ent2("a", 6, "east", A(200, 8), 90, cocok=True), ent2("a", 10, "west", A(210, 8), 270, cocok=True)
    # e2: VONA lalu east (angin 90) -> angin kini 200 berbelok 110 -> model 90 vs target east: cocok. e3: angin 210 vs lalu 200 tak berbelok -> VONA lalu (east) vs target west: tak cocok
    pc = pembanding([e1, e2, e3], riwayat_vona([e1, e2, e3], {}))
    assert pc["campuran"] == {"n": 2, "cocok": 1, "persen": 50, "ci95": pc["campuran"]["ci95"]} and pc["selisih_model_campuran"] is None, pc["campuran"]
    # vonis: < 60 entri atau < 4 gunung -> 'belum teruji'; entri sebelum/sama dengan BEKU atau bukan v2 tak dihitung
    u0 = uji_v2([e1, e2, e3], riwayat_vona([e1, e2, e3], {}))
    assert u0["status"] == "belum teruji" and u0["n"] == 0, u0   # semua dicatat Oktober < BEKU
    ev2 = [ent2(g, d, "east", A(90, 8), 270, bulan=12) for g in ("a", "b", "c", "d") for d in range(1, 16)]
    u1 = uji_v2(ev2, riwayat_vona(ev2, {}))
    assert u1["n"] == 60 and u1["n_gunung"] == 4 and u1["status"] == "model kalah dari persistensi", u1   # model selalu salah, persistensi benar
    assert uji_v2(ev2[:59], riwayat_vona(ev2[:59], {}))["status"] == "belum teruji"
    ev3 = [ent2(g, d, "east", A(90, 8), 270, bulan=12) for g in ("a", "b", "c") for d in range(1, 21)]
    assert uji_v2(ev3, riwayat_vona(ev3, {}))["status"] == "belum teruji"   # n = 60 tapi hanya 3 gunung
    assert uji_v2([{**x, "skenario": {"metode": "v2-tak-beku"}} for x in ev2], riwayat_vona(ev2, {}))["n"] == 0
    assert ringkas(ev2, riwayat_vona(ev2, {}))["uji_v2"]["status"] == "model kalah dari persistensi"
    print("prospektif abu: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
