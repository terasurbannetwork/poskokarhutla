"""Indeks risiko operasional per kecamatan (ala InaRISK, tapi harian) -> public/banjir/data/risiko_kecamatan.json

  RISIKO (0-100) = 100 x BAHAYA x KETERPAPARAN x (1 - w x KAPASITAS)

  BAHAYA        maks dari bahaya per bencana yang tersedia (0-1). Dipilih maks, bukan 1-prod(1-h): enam bahaya yang semuanya
                sedang tidak boleh berjumlah jadi "hampir pasti", dan maks menunjuk SATU bahaya utama yang bisa ditindaklanjuti.
                Karhutla  : maks(FWI/14 sel 0,5 derajat terdekat, titik panas 3 hari di kecamatan / 5), tutup 1.   [harian]
                Banjir    : InaRISK maks(banjir, bandang, longsor) x (0,2 + 0,8 x peluang hujan >= 50 mm hari ini/besok). [statis x harian]
                Gempa     : InaRISK indeks bahaya gempa (0-1) di pusat kecamatan.                                     [statis]
                Gunung api: tingkat PVMBG hari ini (II 0,4; III 0,75; IV 1) x zona KRB yang menyentuh kecamatan (I 0,33; II 0,66; III 1). [harian]
                Kekeringan: tingkat 0-3 (/3) sel 0,5 derajat terdekat. AMBANG BELUM LAYAK uji balik (POD 0,23, FAR 0,93).  [harian, hipotesis]
                Cuaca     : tingkat peringatan 0-3 (/3) hari ini atau besok dari cuaca_kec.json (hujan, angin, gelombang).   [harian]
  KETERPAPARAN  peringkat persentil penduduk kecamatan (WorldPop 2026, penduduk.json) di antara semua kecamatan, 0-1.
  KAPASITAS     statis: 1 - jarak ke kantor BPBD terdekat / 100 km (proksi; hanya 324 kantor terpetakan). Bobot w = 0,3.
                Dinamis (posko, regu, relawan, Destana) ada di D1, belum bisa dibaca pipeline: null, menyusul lewat API.

Komponen yang hilang = null (bukan 0). Sekolah dan faskes hanya ada di sembilan provinsi prioritas: ditampilkan, TIDAK masuk skor.
Label wajib: "indeks komposit, belum diuji balik".

Pakai:  python3 scripts/bnpb/risiko.py [--hari YYYY-MM-DD]      |  python3 scripts/bnpb/risiko.py --cek
"""
import argparse, bisect, datetime as dt, json, math, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import kejadian as _kej   # simpan (kunci "dibuat" pertama, atomik), baca, km, dan pencari wilayah scripts/data/wilayah.py

WIB = dt.timezone(dt.timedelta(hours=7))
LABEL = "indeks komposit, belum diuji balik"
BOBOT_KAPASITAS = 0.3
JARAK_KAPASITAS_KM = 100
KELAS = ["Rendah", "Sedang", "Tinggi", "Sangat tinggi"]
AMBANG = [15, 35, 60]            # skor < 15 rendah; < 35 sedang; < 60 tinggi; selebihnya sangat tinggi (ambang kerja tetap, bukan persentil)
UMUR_MAKS = 7                    # hari; sumber harian yang lebih tua dari ini dibuang (null), yang lebih tua dari 2 hari ditandai usang
FWI_JENUH = 14                   # FWI >= 14 = kelas Sangat tinggi (scripts/data/aturan.py kelas_fwi)
TITIK_JENUH = 5                  # titik panas 3 hari di satu kecamatan yang dihitung penuh
BOBOT_LEVEL = {1: 0.0, 2: 0.4, 3: 0.75, 4: 1.0}
BOBOT_KRB = {"I": 0.33, "II": 0.66, "III": 1.0}
BENCANA = ["karhutla", "banjir", "gempa", "gunungapi", "kekeringan", "cuaca"]
NAMA = {"karhutla": "Karhutla", "banjir": "Banjir dan longsor", "gempa": "Gempa", "gunungapi": "Gunung api", "kekeringan": "Kekeringan", "cuaca": "Cuaca ekstrem"}
KOLOM = ["prov", "kab", "kec", "risiko", "kelas", "bahaya", "utama"] + ["h_" + b for b in BENCANA] + ["pend", "pangkat", "bpbd_km", "kapasitas", "sekolah", "siswa", "faskes"]
Z = {"w": _kej._W}


def baca(jalur):
    return _kej.baca(os.path.join(AKAR, jalur))


def terdekat(titik, lat, lon, maks_km):
    """titik = [(lat, lon, ...)] -> baris terdekat dalam maks_km atau None."""
    b = None
    for t in titik:
        if abs(t[0] - lat) > maks_km / 100 or abs(t[1] - lon) > maks_km / 100:
            continue
        d = _kej.km((lat, lon), (t[0], t[1]))
        if d <= maks_km and (b is None or d < b[0]):
            b = (d, t)
    return b and b[1]


def pangkat(nilai):
    """{kunci: angka} -> {kunci: persentil 0-1} (seri dirata-ratakan)."""
    urut = sorted(nilai.values())
    n = len(urut)
    return {k: ((bisect.bisect_left(urut, v) + bisect.bisect_right(urut, v) - 1) / 2 / (n - 1) if n > 1 else 0.0) for k, v in nilai.items()}


def kelas_dari(skor):
    return None if skor is None else sum(skor >= a for a in AMBANG)


def risiko(h, pend_pangkat, kap):
    """h = {bencana: 0-1 atau None} yang dipilih -> (skor 0-100 atau None, bahaya, utama). Satu rumus untuk pipeline dan layar."""
    ada = {k: v for k, v in h.items() if v is not None}
    if not ada or pend_pangkat is None or kap is None:
        return None, (max(ada.values()) if ada else None), (max(ada, key=ada.get) if ada else None)
    b = max(ada.values())
    return round(100 * b * pend_pangkat * (1 - BOBOT_KAPASITAS * kap), 1), b, max(ada, key=ada.get)


def umur(hari, tgl):
    return None if not tgl else (dt.date.fromisoformat(hari) - dt.date.fromisoformat(tgl)).days


def pakai(hari, tgl):
    u = umur(hari, tgl)
    return u is not None and u <= UMUR_MAKS


def satuan(k):
    p, kab, kec = k
    return f"{p}|{kab}|{kec}"


# ---------------------------------------------------------------- bahaya per bencana: tiap fungsi -> ({kunci: 0-1 atau None}, meta)
def h_karhutla(pusat, fwi, hot, hari):
    h, tf, th = {}, None, None
    if fwi:
        tf = max((d["tgl"] for g in fwi["grid"] for d in g["hari"] if d["tgl"] <= hari), default=None)
        sel = [(g["lat"], g["lon"], d["fwi"]) for g in fwi["grid"] for d in g["hari"] if d["tgl"] == tf and d.get("fwi") is not None] if pakai(hari, tf) else []
    else:
        sel = []
    titik = {}
    if hot and "acuan" in hot:
        a = dt.datetime.fromisoformat(hot["acuan"]).astimezone(WIB).date()
        th = a.isoformat()
        tiga = {(a - dt.timedelta(days=i)).strftime("%m-%d") for i in range(3)}
        for r in hot["baris"]:
            if r[7] in tiga:
                titik[hot["wilayah"][r[6]]] = titik.get(hot["wilayah"][r[6]], 0) + 1
    for k, (la, lo) in pusat.items():
        s = terdekat(sel, la, lo, 80) if sel else None
        a = None if s is None else min(1.0, s[2] / FWI_JENUH)
        b = min(1.0, titik.get(k, 0) / TITIK_JENUH) if pakai(hari, th) else None
        v = [x for x in (a, b) if x is not None]
        h[k] = max(v) if v else None
    return h, {"tanggal": {"fwi": tf, "titik_panas": th}, "umur_hari": {"fwi": umur(hari, tf), "titik_panas": umur(hari, th)},
               "sumber": "FWI Kanada dari Open-Meteo (public/data/fwi.json, sel 0,5 derajat terdekat <= 80 km) dan titik panas NASA FIRMS 3 hari (public/data/hotspot.json)",
               "validasi": "FWI kelas BMKG/Kanada; belum diuji balik sebagai peluang kebakaran per kecamatan"}


def p_hujan(ans, hari):
    """Titik ansambel (lat, lon, peluang >= 50 mm hari ini/besok 0-1)."""
    if not ans or hari not in ans["hari"]:
        return [], None
    i = ans["hari"].index(hari)
    skala = 100.0 if any(max(g["p50"]) > 1 for g in ans["grid"]) else 1.0   # berkas pernah memakai persen
    return [(g["lat"], g["lon"], max(g["p50"][i:i + 2]) / skala) for g in ans["grid"]], ans["hari"][0]


def h_banjir(pusat, bahaya, ans, hari):
    titik, tgl = p_hujan(ans, hari)
    h = {}
    for k, (la, lo) in pusat.items():
        b = bahaya["kec"].get(k) if bahaya else None
        stat = None if not b else max(b.get("banjir") or 0, b.get("bandang") or 0, b.get("longsor") or 0)
        t = terdekat(titik, la, lo, 110) if titik else None
        h[k] = None if stat is None or t is None else stat * (0.2 + 0.8 * min(1.0, t[2]))
    return h, {"tanggal": {"hujan": tgl}, "umur_hari": {"hujan": umur(hari, tgl)},
               "sumber": "InaRISK BNPB banjir, banjir bandang, longsor (public/banjir/data/bahaya.json, statis) x peluang hujan >= 50 mm/hari ECMWF ansambel (hujan_ansambel.json, titik <= 110 km)",
               "validasi": "pengali 0,2 + 0,8 x peluang adalah pilihan kerja; peluang hujan sendiri diuji balik di modul banjir, gabungannya belum"}


def h_gempa(pusat, ig):
    h = {k: (ig["nilai"].get(k) if ig else None) for k in pusat}
    return h, {"sumber": "InaRISK BNPB indeks bahaya gempa bumi 0-1 di pusat kecamatan (public/gempa/data/inarisk_gempa.json)",
               "validasi": "potensi statis, bukan prakiraan hari ini; tidak berubah dari hari ke hari"}


def slug(n):
    return n.lower().replace(" ", "-")


def h_gunungapi(pusat, status, geo):
    """Kecamatan tersentuh KRB: pusatnya di dalam poligon zona, atau sebuah titik batas zona jatuh di dalam kecamatan."""
    h = {k: (0.0 if status and geo else None) for k in pusat}
    meta = {"sumber": "Tingkat aktivitas PVMBG/MAGMA (gunungapi_status.json) x zona KRB PVMBG 2018 (gunungapi/data/paparan_geo.json)",
            "validasi": "bobot tingkat dan zona adalah pilihan kerja; KRB hanya ada untuk sebagian gunung", "tanpa_krb": []}
    if not (status and geo):
        return h, meta
    W = Z["w"]
    level = {slug(g["nama"]): g["level"] for g in status["gunung"]}
    meta["tanggal"] = {"status": status.get("dibuat", "")[:10]}
    meta["tanpa_krb"] = sorted(g["nama"] for g in status["gunung"] if g["level"] >= 2 and slug(g["nama"]) not in geo)
    for gid, d in geo.items():
        w = BOBOT_LEVEL.get(level.get(gid, 1), 0.0)
        if w == 0:
            continue
        for zona, geom in d["zona"].items():
            bobot = w * BOBOT_KRB[zona]
            cincin = W._cincin(geom)
            kena = set()
            for r in cincin:
                for lon, lat in r:
                    a = Z["wilayah"].cari(lon, lat)
                    if a:
                        kena.add(satuan(a))
                xs, ys = [c[0] for c in r], [c[1] for c in r]
                for k, (la, lo) in pusat.items():
                    if min(xs) <= lo <= max(xs) and min(ys) <= la <= max(ys) and W._di_dalam(lo, la, r):
                        kena.add(k)
            for k in kena:
                if k in h:
                    h[k] = max(h[k], bobot)
    return h, meta


def h_kekeringan(pusat, grid, kmeta, hari):
    tgl = kmeta.get("hari_ini") if kmeta else None
    baris = [(r[0], r[1], r[7]) for r in grid["grid"] if r[7] is not None] if grid and pakai(hari, tgl) else []
    h = {}
    for k, (la, lo) in pusat.items():
        t = terdekat(baris, la, lo, 80) if baris else None
        h[k] = None if t is None else t[2] / 3
    return h, {"tanggal": {"status": tgl}, "umur_hari": {"status": umur(hari, tgl)},
               "sumber": "Tingkat kekeringan 0-3 sel 0,5 derajat (public/data/kekeringan_grid.json, SPI-3 dan Kode Kekeringan)",
               "validasi": "MERAGUKAN: aturan ambang kekeringan TIDAK LAYAK uji balik terhadap DIBI (POD 0,23 < 0,5; FAR 0,93 > 0,8; scripts/kekeringan/RISET-AMBANG.md). Angka ditampilkan sebagai hipotesis."}


def h_cuaca(pusat, cuaca, hari, urut):
    """`i` di cuaca_kec.json = indeks ke urutan kunci pusat_kec.json (urut)."""
    h, tgl = {}, None
    if cuaca and hari in cuaca["hari"]:
        i = cuaca["hari"].index(hari)
        tgl = cuaca["hari"][0]
        ada = {urut[r[0]]: max(r[1][i:i + 2]) for r in cuaca["kec"]}
        h = {k: ada.get(k, 0) / 3 for k in pusat}      # berkas hanya menulis kecamatan bertingkat >= 1: yang tak tertulis = tingkat 0
    else:
        h = {k: None for k in pusat}
    return h, {"tanggal": {"cuaca": tgl}, "umur_hari": {"cuaca": umur(hari, tgl)},
               "sumber": "Tingkat peringatan 0-3 hujan, angin, gelombang hari ini atau besok (public/banjir/data/cuaca_kec.json); kecamatan tak tertulis = tingkat 0",
               "validasi": "ambang hujan, angin, gelombang kelas BMKG; ambang ansambel masih hipotesis"}


# ---------------------------------------------------------------- keterpaparan, kapasitas, fasilitas
def fasilitas(unit, sekolah, fas):
    """Sekolah dan siswa dari sekolah.json (cocok lewat nama), faskes dari fasilitas.json (titik dalam kecamatan). Hanya provinsi yang tercakup."""
    sk, sw, fk, prov = {}, {}, {}, set()
    if sekolah:
        for r in sekolah["baris"]:
            k = f"{r[5]}|{r[6]}|{r[7]}"
            sk[k] = sk.get(k, 0) + 1
            sw[k] = sw.get(k, 0) + (r[4] or 0)
            prov.add(r[5])
    if fas:
        for x in fas:
            if x["t"] in ("faskes", "rs"):
                a = Z["wilayah"].cari(x["lon"], x["lat"])
                if a:
                    fk[satuan(a)] = fk.get(satuan(a), 0) + 1
    return ({k: (sk.get(k) if k[:2] in prov else None) for k in unit}, {k: (sw.get(k) if k[:2] in prov else None) for k in unit},
            {k: (fk.get(k, 0) or None) if k[:2] in prov else None for k in unit})


def bangun(src, hari):
    """src = {nama: isi JSON atau None}; unit = semua kecamatan bernama di geo. -> dict keluaran (tanpa `dibuat`)."""
    ident = sorted({a for v in Z["wilayah"].indeks.values() for _, _, a in v if a[1] and a[2]})
    unit = [satuan(a) for a in ident]
    kpusat = src["pusat_kec"]
    pusat = {k: tuple(kpusat[k]) for k in unit if k in kpusat}
    H, M = {}, {}
    H["karhutla"], M["karhutla"] = h_karhutla(pusat, src["fwi"], src["hotspot"], hari)
    H["banjir"], M["banjir"] = h_banjir(pusat, src["bahaya"], src["hujan_ansambel"], hari)
    H["gempa"], M["gempa"] = h_gempa(pusat, src["inarisk_gempa"])
    H["gunungapi"], M["gunungapi"] = h_gunungapi(pusat, src["gunungapi_status"], src["paparan_geo"])
    H["kekeringan"], M["kekeringan"] = h_kekeringan(pusat, src["kekeringan_grid"], src["kekeringan_meta"], hari)
    H["cuaca"], M["cuaca"] = h_cuaca(pusat, src["cuaca_kec"], hari, list(kpusat))
    pend = {k: v for k, v in ((src["penduduk"] or {}).get("kec") or {}).items() if k in set(unit) and v}
    rank = pangkat(pend)
    kantor = [(x["lat"], x["lon"]) for x in (src["bpbd"] or {}).get("kantor", []) if x.get("lat") is not None]
    sek, siswa, faskes = fasilitas(unit, src["sekolah"], src["fasilitas"])
    baris, kosong = [], {b: 0 for b in BENCANA}
    for a, k in zip(ident, unit):
        h = {b: (None if k not in pusat or H[b].get(k) is None else round(H[b][k], 3)) for b in BENCANA}
        for b in BENCANA:
            kosong[b] += h[b] is None
        d = None
        if k in pusat and kantor:
            d = min(_kej.km(pusat[k], c) for c in kantor)
        kap = None if d is None else round(max(0.0, 1 - d / JARAK_KAPASITAS_KM), 3)
        r = rank.get(k)
        r = None if r is None else round(r, 3)   # skor dihitung dari angka yang terbit, supaya layar bisa mengulang persis
        skor, b, utama = risiko(h, r, kap)
        baris.append([a[0], a[1], a[2], skor, kelas_dari(skor), None if b is None else round(b, 3), utama] + [h[x] for x in BENCANA] +
                     [pend.get(k), None if r is None else round(r, 3), None if d is None else round(d, 1), kap, sek[k], siswa[k], faskes[k]])
    dist = [0] * 4
    for r in baris:
        if r[4] is not None:
            dist[r[4]] += 1
    return {
        "versi": 1, "hari": hari, "label": LABEL,
        "rumus": "risiko = 100 x bahaya x keterpaparan x (1 - w x kapasitas); bahaya = maks bahaya per bencana yang tersedia; keterpaparan = peringkat persentil penduduk; kapasitas = 1 - jarak BPBD / 100 km",
        "bobot": {"w_kapasitas": BOBOT_KAPASITAS, "jarak_kapasitas_km": JARAK_KAPASITAS_KM, "level_gunungapi": BOBOT_LEVEL, "krb": BOBOT_KRB,
                  "fwi_jenuh": FWI_JENUH, "titik_panas_jenuh": TITIK_JENUH, "pemicu_banjir": "0,2 + 0,8 x peluang hujan >= 50 mm"},
        "kelas": KELAS, "ambang": AMBANG, "ambang_catatan": "skor < 15 Rendah; < 35 Sedang; < 60 Tinggi; selebihnya Sangat tinggi. Ambang kerja tetap, belum dikalibrasi ke DIBI.",
        "bencana": [{"id": b, "nama": NAMA[b], **M[b], "kosong": kosong[b]} for b in BENCANA],
        "keterpaparan": {"sumber": "WorldPop Global2 R2025A 2026 per kecamatan (public/data/penduduk.json), peringkat persentil nasional",
                         "catatan": "sekolah, siswa (Dapodik/EMIS) dan faskes (OSM) hanya ada di sembilan provinsi prioritas; ditampilkan, tidak masuk skor"},
        "kapasitas": {"statis": "jarak pusat kecamatan ke kantor BPBD terdekat (public/data/bpbd.json, 324 kantor terpetakan): proksi, bukan kemampuan nyata",
                      "kapasitas_dinamis": None, "kapasitas_dinamis_catatan": "posko, regu, relawan siap, dan status Destana ada di D1: menyusul lewat API"},
        "provinsi": {p: n for p, n in Z["w"].PROVINSI.items()},
        "ringkas": {"kecamatan": len(baris), "tanpa_skor": sum(r[3] is None for r in baris), "per_kelas": dict(zip(KELAS, dist))},
        "kolom": KOLOM, "kec": baris,
    }


def muat():
    d = lambda p: baca(p)
    return {"pusat_kec": d("public/banjir/data/pusat_kec.json"), "fwi": d("public/data/fwi.json"), "hotspot": d("public/data/hotspot.json"),
            "bahaya": d("public/banjir/data/bahaya.json"), "hujan_ansambel": d("public/banjir/data/hujan_ansambel.json"),
            "inarisk_gempa": d("public/gempa/data/inarisk_gempa.json"), "gunungapi_status": d("public/banjir/data/gunungapi_status.json"),
            "paparan_geo": d("public/gunungapi/data/paparan_geo.json"), "kekeringan_grid": d("public/data/kekeringan_grid.json"),
            "kekeringan_meta": d("public/data/kekeringan_meta.json"), "cuaca_kec": d("public/banjir/data/cuaca_kec.json"),
            "penduduk": d("public/data/penduduk.json"), "bpbd": d("public/data/bpbd.json"), "sekolah": d("public/data/sekolah.json"),
            "fasilitas": d("public/data/fasilitas.json")}


def siapkan():
    Z["wilayah"] = Z["w"].Wilayah()
    return muat()


def cek():
    src = siapkan()
    hari = "2026-10-19"   # hari tetap: determinisme tidak bergantung jam
    a = bangun(src, hari)
    b = bangun(src, hari)
    assert a == b, "tidak deterministik"
    n_geo = len({a_ for v in Z["wilayah"].indeks.values() for _, _, a_ in v if a_[1] and a_[2]})
    assert len(a["kec"]) == n_geo == a["ringkas"]["kecamatan"] > 7000, (len(a["kec"]), n_geo)
    assert len({(r[0], r[1], r[2]) for r in a["kec"]}) == n_geo, "kunci kecamatan ganda"
    ix = {k: i for i, k in enumerate(a["kolom"])}
    ada = 0
    for r in a["kec"]:
        assert len(r) == len(a["kolom"])
        for k in ["risiko", "bahaya", "pangkat", "kapasitas"] + ["h_" + x for x in BENCANA]:
            v = r[ix[k]]
            assert v is None or (isinstance(v, (int, float)) and not math.isnan(v) and 0 <= v <= (100 if k == "risiko" else 1)), (r[:3], k, v)
        if r[ix["risiko"]] is None:
            assert r[ix["pend"]] is None or r[ix["kapasitas"]] is None or all(r[ix["h_" + x]] is None for x in BENCANA), (r[:3], "skor hilang padahal komponen lengkap")
        else:
            ada += 1
            assert r[ix["kelas"]] == kelas_dari(r[ix["risiko"]]) and r[ix["utama"]] in BENCANA
            h = {x: r[ix["h_" + x]] for x in BENCANA}
            assert risiko(h, r[ix["pangkat"]], r[ix["kapasitas"]])[0] == r[ix["risiko"]], "rumus layar berbeda dari pipeline"
        assert r[ix["pend"]] is not None or r[ix["risiko"]] is None, "penduduk hilang tidak boleh punya skor"
    assert ada > 0.9 * n_geo, f"terlalu banyak kecamatan tanpa skor: {ada}/{n_geo}"
    assert a["kapasitas"]["kapasitas_dinamis"] is None and a["label"] == LABEL
    # komponen hilang = null, bukan 0: buang gempa dan hasilnya tidak berubah ke 0
    src2 = dict(src, inarisk_gempa=None)
    c = bangun(src2, hari)
    assert all(r[ix["h_gempa"]] is None for r in c["kec"]), "gempa hilang harus null"
    # rumus pada angka tangan
    assert risiko({"a": 0.5, "b": None}, 1.0, 0.0) == (50.0, 0.5, "a")
    assert risiko({"a": 0.5}, 1.0, 1.0)[0] == 35.0 and risiko({"a": None}, 1.0, 0.0)[0] is None and risiko({"a": 1.0}, None, 0.0)[0] is None
    assert pangkat({"x": 1, "y": 2, "z": 3}) == {"x": 0.0, "y": 0.5, "z": 1.0} and pangkat({"x": 5, "y": 5, "z": 9})["x"] == 0.25
    assert [kelas_dari(s) for s in (0, 14.9, 15, 34.9, 35, 59.9, 60, 100, None)] == [0, 0, 1, 1, 2, 2, 3, 3, None]
    # keluaran ke berkas: kunci "dibuat" pertama, ukuran wajar
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "r.json")
        _kej.simpan(p, a)
        assert next(iter(json.load(open(p)))) == "dibuat" and os.path.getsize(p) < 2_000_000, os.path.getsize(p)
    print(f"cek ok: {n_geo} kecamatan, {ada} bersekor, kelas {a['ringkas']['per_kelas']}, kosong {[(x['id'], x['kosong']) for x in a['bencana']]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hari", default=dt.datetime.now(WIB).date().isoformat())
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--keluar", default=os.path.join(AKAR, "public/banjir/data/risiko_kecamatan.json"))
    a = ap.parse_args()
    if a.cek:
        return cek()
    isi = bangun(siapkan(), a.hari)
    _kej.simpan(a.keluar, isi)
    print(f"risiko: {isi['ringkas']['kecamatan']} kecamatan, {isi['ringkas']['tanpa_skor']} tanpa skor, kelas {isi['ringkas']['per_kelas']}, {os.path.getsize(a.keluar) // 1024} KB", file=sys.stderr)


if __name__ == "__main__":
    main()
