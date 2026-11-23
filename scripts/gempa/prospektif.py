"""Uji prospektif guncangan gempa TANPA menunggu arsip D1 (PB-51, KEPUTUSAN-PARITAS D6).

Prakiraan dicatat SEBELUM pembanding diketahui, lalu dinilai sesudahnya. Semua dari berkas yang sudah ditarik pipeline gempa:
  catat   tiap gempa M>=5 di Indonesia dari katalog InaTEWS (inatews_katalog.json) yang umurnya <= 48 jam saat pertama terlihat:
          MMI tertinggi model guncangan.py (GMPE+GMICE, per pusat kecamatan) dan paparan/kelas PAGER buatan repo (pager.py).
          Gempa yang lebih tua dari 48 jam TIDAK dicatat susulan (tidak ada catatan retrospektif yang menyamar jadi prospektif).
  nilai   (a) butir lawan buletin "dirasakan" BMKG (kolom felt di inatews_detail_*.json): MMI tertinggi yang dilaporkan, setelah >= 1 hari;
          tanpa buletin dirasakan sesudah 7 hari -> penilaian "tanpa_pembanding" (sekali, tidak ditunggu terus). Model tidak menghitung
          padahal BMKG melaporkan dirasakan -> "di_luar_jendela": kegagalan model, dihitung terpisah dan ikut sebagai meleset di metrik.
          (b) arsip prospektif_pager.json (pager.py catat) lawan level KORBAN JIWA PAGER USGS final (json/alerts.json, fatality.level; pager.py hanya jiwa).
          Bila produk itu tidak ada, pembanding hanya properti alert gabungan jiwa+ekonomi: status "dinilai_gabungan", tidak masuk metrik kelas jiwa.
          Jawaban USGS dijemput 20 detik per permintaan tanpa ulang, tiap penilaian langsung disimpan; tanpa jawaban 60 hari -> tanpa_pembanding.
Keluaran public/gempa/data/prospektif_gempa.json. Tiga daftar (butir, penilaian, pager_penilaian) APPEND-ONLY: menolak (keluar 3)
bila daftar lokal lebih pendek atau berbeda di posisi lama dibanding git HEAD. Kode keluar: 3 = pelanggaran append-only, 2 = git gagal
dijalankan (bukan sekadar berkas belum ada di HEAD), 1 = galat lain (mis. jaringan). Model dibekukan lewat sidik PARAM; ganti param = sidik lain.

Batas yang jujur: MMI model adalah maksimum atas pusat kecamatan (titik), MMI BMKG adalah tertinggi yang dilaporkan tempat tertentu;
keduanya tidak identik, dan buletin dirasakan hanya ada untuk sebagian gempa. Angka kinerja (bias, MAE, persen dalam +-1) ditulis
beserta n; tidak ada ambang lulus yang dikarang di sini. Metrik mmi hanya berlaku untuk SUBSET gempa yang dirasakan BMKG (n subset lawan n dicatat
tertulis di metrik.cakupan). Butir dicatat pada umur sampai 48 jam, sehingga buletin dirasakan bisa sudah ada (felt_sudah_ada); model tidak membaca felt,
tetapi metrik dipisah menurut felt_sudah_ada.

Pakai:  python3 scripts/gempa/prospektif.py catat | nilai | uji
"""
import datetime as dt, glob, hashlib, importlib.util, json, os, re, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(DIR, "../.."))
DATA = os.path.join(AKAR, "public/gempa/data")
BERKAS = os.path.join(DATA, "prospektif_gempa.json")
KATALOG = os.path.join(DATA, "inatews_katalog.json")
PAGER_ARSIP = os.path.join(DATA, "prospektif_pager.json")
DAFTAR = ("butir", "penilaian", "pager_penilaian")
M_MIN = 5.0
UMUR_CATAT_JAM = 48
NILAI_MIN_HARI, TANPA_PEMBANDING_HARI, PAGER_MIN_HARI, PAGER_TUTUP_HARI = 1, 7, 7, 60
KELUAR_ARSIP, KELUAR_GIT = 3, 2
BATAS_USGS_DETIK = 20
ROMAWI = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12}
KELAS_USGS = {"green": "hijau", "yellow": "kuning", "orange": "oranye", "red": "merah"}
URUT_KELAS = ["hijau", "kuning", "oranye", "merah"]


def _muat(nama, berkas):
    s = importlib.util.spec_from_file_location(nama, os.path.join(DIR, berkas))
    m = importlib.util.module_from_spec(s)
    sys.modules[nama] = m
    s.loader.exec_module(m)
    return m


def sidik_model(P):
    return hashlib.sha256(json.dumps(P, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:12]


def mmi_felt(teks):
    """'III Kab. A, II - III Kota B' -> 3 (MMI tertinggi di semua tempat); None bila tak ada angka Romawi di awal tiap tempat."""
    nilai = []
    for bagian in re.split(r",\s*(?=[IVX]+\b)", teks or ""):
        mt = re.match(r"\s*([IVX]+)(?:\s*-\s*([IVX]+))?\b", bagian)
        nilai += [ROMAWI[t] for t in (mt.groups() if mt else ()) if t in ROMAWI]
    return max(nilai) if nilai else None


def felt_per_id(pola=None):
    """{id kejadian: teks felt dari buletin dirasakan terakhir} dari inatews_detail_*.json."""
    out = {}
    for f in sorted(glob.glob(pola or os.path.join(DATA, "inatews_detail_*.json"))):
        for k, v in json.load(open(f)).get("kejadian", {}).items():
            fl = [b["felt"] for b in v.get("buletin", []) if b.get("jenis") == "dirasakan" and b.get("felt")]
            if fl:
                out[k] = fl[-1]
    return out


def periksa_arsip(lama, baru):
    """Tiap butir lama wajib ada utuh di posisi yang sama (pola pager.py/prediksi dasar.py). -> pesan galat atau None."""
    for nama in DAFTAR:
        a, b = lama.get(nama, []), baru.get(nama, [])
        if len(b) < len(a):
            return f"{nama} menyusut {len(a)} -> {len(b)}"
        for i, (x, y) in enumerate(zip(a, b)):
            if x != y:
                return f"{nama} butir {i + 1} berubah"
    return None


def tolak(pesan, kode=KELUAR_ARSIP):
    print(pesan, file=sys.stderr)
    sys.exit(kode)


def head_arsip():
    """Isi berkas di git HEAD. {} bila berkas memang belum ada di HEAD (wajar); git gagal dijalankan = keluar 2, bukan {} diam-diam."""
    rel = os.path.relpath(BERKAS, AKAR).replace(os.sep, "/")
    try:
        ada = subprocess.run(["git", "ls-tree", "--name-only", "HEAD", "--", rel], cwd=AKAR, capture_output=True, text=True)
        if ada.returncode != 0:
            tolak(f"prospektif gempa: git ls-tree gagal ({ada.returncode}): {ada.stderr.strip()[:200]}", KELUAR_GIT)
        if not ada.stdout.strip():
            return {}
        r = subprocess.run(["git", "show", "HEAD:" + rel], cwd=AKAR, capture_output=True, text=True)
        if r.returncode != 0:
            tolak(f"prospektif gempa: git show gagal ({r.returncode}): {r.stderr.strip()[:200]}", KELUAR_GIT)
        return json.loads(r.stdout)
    except (OSError, ValueError) as e:
        tolak(f"prospektif gempa: git/HEAD tidak terbaca ({type(e).__name__})", KELUAR_GIT)


def kosong():
    return {"versi": 1, "diperbarui": None,
            "aturan": "Append-only. Butir = prakiraan guncangan dan paparan PAGER buatan repo dicatat <= 48 jam sesudah gempa M>=5 Indonesia masuk katalog InaTEWS, "
                      "sebelum dinilai. Penilaian ditambah di ujung, tidak mengubah butir. Gempa lebih tua dari 48 jam saat pertama terlihat tidak dicatat. "
                      "Butir yang dicatat pada umur 24-48 jam bisa sudah punya buletin Dirasakan (felt_sudah_ada); metrik dipisah menurut itu. "
                      "Metrik mmi hanya berlaku untuk subset gempa yang dirasakan BMKG (lihat metrik.cakupan), bukan semua gempa yang dicatat. "
                      "Gempa yang dirasakan tetapi tidak dihitung model (di_luar_jendela) dihitung sebagai meleset, bukan dibuang. "
                      "Pembanding PAGER: level korban jiwa USGS (alerts.json); bila tak ada, gabungan jiwa+ekonomi dan tidak masuk metrik kelas jiwa.",
            "sumber": {"katalog": "BMKG InaTEWS (inatews_katalog.json)", "pembanding_mmi": "buletin Dirasakan BMKG (inatews_detail_*.json, kolom felt)",
                       "pembanding_pager": "USGS PAGER level korban jiwa (produk losspager json/alerts.json lewat FDSN detail), cadangan: properti alert gabungan", "model": "scripts/gempa/guncangan.py + pager.py"},
            "butir": [], "penilaian": [], "pager_penilaian": [], "metrik": None}


def _ringkas(sel, luar=0):
    """sel = selisih (model - BMKG) butir yang dinilai; luar = butir dirasakan tetapi di luar jendela model (selalu meleset)."""
    n = len(sel)
    if not n and not luar:
        return None
    dalam = sum(1 for v in sel if abs(v) <= 1)
    out = {"n": n, "di_luar_jendela": luar, "n_pembanding": n + luar, "meleset": n - dalam + luar,
           "persen_dalam_1_termasuk_di_luar": round(100 * dalam / (n + luar), 1), "arah": "model dikurangi dirasakan BMKG"}
    if n:
        out.update({"bias": round(sum(sel) / n, 2), "mae": round(sum(abs(v) for v in sel) / n, 2), "persen_dalam_1": round(100 * dalam / n, 1)})
    return out


def metrik(arsip):
    flag = {b["id"]: bool(b.get("felt_sudah_ada")) for b in arsip["butir"]}
    pen = arsip["penilaian"]
    p = [x for x in pen if x.get("status") == "dinilai"]
    luar = [x for x in pen if x.get("status") == "di_luar_jendela"]
    tanpa = sum(1 for x in pen if x.get("status") == "tanpa_pembanding")
    out = {"dicatat": len(arsip["butir"]), "dinilai_mmi": len(p), "di_luar_jendela_mmi": len(luar), "tanpa_pembanding_mmi": tanpa,
           "cakupan": {"dicatat": len(arsip["butir"]), "dengan_pembanding": len(p) + len(luar), "tanpa_pembanding": tanpa,
                       "menunggu": len(arsip["butir"]) - len(pen),
                       "catatan": "metrik mmi hanya berlaku untuk subset gempa yang dirasakan BMKG (dengan_pembanding), bukan semua yang dicatat"},
           "mmi": _ringkas([x["selisih"] for x in p], len(luar)), "mmi_felt_belum_ada": None, "mmi_felt_sudah_ada": None, "pager": None}
    for kunci, nilai_flag in (("mmi_felt_belum_ada", False), ("mmi_felt_sudah_ada", True)):
        out[kunci] = _ringkas([x["selisih"] for x in p if flag.get(x.get("id"), False) == nilai_flag],
                              sum(1 for x in luar if flag.get(x.get("id"), False) == nilai_flag))
    pg = arsip["pager_penilaian"]
    q = [x for x in pg if x.get("status") == "dinilai"]
    out["dinilai_pager"] = len(q)
    out["dinilai_gabungan_pager"] = sum(1 for x in pg if x.get("status") == "dinilai_gabungan")
    out["tanpa_pembanding_pager"] = sum(1 for x in pg if x.get("status") == "tanpa_pembanding")
    if q:
        out["pager"] = {"n": len(q), "pembanding": "korban jiwa USGS", "persen_kelas_sama": round(100 * sum(1 for x in q if x["selisih_kelas"] == 0) / len(q), 1),
                        "persen_dalam_1_kelas": round(100 * sum(1 for x in q if abs(x["selisih_kelas"]) <= 1) / len(q), 1)}
    return out


def simpan(arsip, sekarang):
    arsip["diperbarui"] = sekarang.strftime("%Y-%m-%dT%H:%MZ")
    arsip["metrik"] = metrik(arsip)
    os.makedirs(os.path.dirname(BERKAS), exist_ok=True)
    with open(BERKAS + ".tmp", "w") as fh:
        json.dump(arsip, fh, ensure_ascii=False, separators=(",", ":"))
    os.replace(BERKAS + ".tmp", BERKAS)


def muat():
    return json.load(open(BERKAS)) if os.path.exists(BERKAS) else kosong()


def prakiraan(gm, gc, pg, pusat, pend):
    """gm = {lat, lon, m, dalam} -> {mmi_maks, n_kec_mmi5, pager:{...}} dari model repo (deterministik)."""
    h = gc.mmi_kecamatan(gm, pusat)
    mx = max((v["mmi"] for v in h.values()), default=None)
    r = pg.hitung_gempa(gm, pusat, pend)
    return {"mmi_maks": None if mx is None else round(mx, 2), "n_kec_mmi5": sum(1 for v in h.values() if v["mmi"] >= 5),
            "pager": {"jiwa": round(r["jiwa"], 2), "bawah": round(r["bawah"], 2), "atas": round(r["atas"], 2), "kelas": r["kelas"]}}


def catat(sekarang=None, katalog=KATALOG, head=head_arsip, wil=None, pusat=None, pend=None, felt=None):
    sekarang = sekarang or dt.datetime.now(dt.timezone.utc)
    gc, pg = _muat("guncangan_pros", "guncangan.py"), _muat("pager_pros", "pager.py")
    arsip = muat()
    galat = periksa_arsip(head(), arsip)
    if galat:
        tolak(f"prospektif gempa DITOLAK, tidak append-only: {galat}")
    n_lama = {n: len(arsip[n]) for n in DAFTAR}
    if wil is None:
        sys.path.insert(0, DIR)
        from laporan_gempa import Wil
        wil = Wil()
    pusat = pusat or json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    pend = pend or json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["kec"]
    felt = felt if felt is not None else felt_per_id()
    sidik = sidik_model(gc.PARAM)
    ada = {b["id"] for b in arsip["butir"]}
    baru = 0
    for id_, t, lat, lon, m, dalam, tempat, *_ in json.load(open(katalog))["baris"]:
        umur_jam = (sekarang.timestamp() - t) / 3600
        if id_ in ada or m is None or m < M_MIN or umur_jam > UMUR_CATAT_JAM or umur_jam < 0 or not wil.letak(lat, lon, tempat or ""):
            continue
        gm = {"lat": lat, "lon": lon, "m": m, "dalam": max(dalam or 10.0, 1.0)}
        arsip["butir"].append({"id": id_, "waktu_utc": dt.datetime.fromtimestamp(t, dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
                               "lat": lat, "lon": lon, "dalam_km": gm["dalam"], "m": m, "tempat": tempat,
                               "dicatat": sekarang.strftime("%Y-%m-%dT%H:%MZ"), "umur_saat_catat_jam": round(umur_jam, 1),
                               "felt_sudah_ada": id_ in felt, "sidik_model": sidik, "prakiraan": prakiraan(gm, gc, pg, pusat, pend)})
        baru += 1
    assert periksa_arsip({n: arsip[n][:n_lama[n]] for n in DAFTAR}, arsip) is None
    simpan(arsip, sekarang)
    print(f"prospektif gempa: {baru} dicatat baru, {len(arsip['butir'])} total")
    return baru


def ambil_usgs(id_):
    """-> {"alert": gabungan jiwa+ekonomi, "jiwa": level korban jiwa atau None bila produk alerts.json tidak ada}. Galat jaringan dilempar (dicoba lagi besok)."""
    sys.path.insert(0, DIR)
    from umum import ambil
    pr = ambil(f"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid={id_}&format=geojson", coba=1, batas_waktu=BATAS_USGS_DETIK)["properties"]
    jiwa = None
    lp = (pr.get("products") or {}).get("losspager") or []
    url = ((lp[0].get("contents") or {}).get("json/alerts.json") or {}).get("url") if lp else None
    if url:
        jiwa = (ambil(url, coba=1, batas_waktu=BATAS_USGS_DETIK).get("fatality") or {}).get("level")
    return {"alert": pr.get("alert"), "jiwa": jiwa}


def nilai(sekarang=None, head=head_arsip, felt=None, usgs=ambil_usgs, pager_arsip=PAGER_ARSIP):
    sekarang = sekarang or dt.datetime.now(dt.timezone.utc)
    arsip = muat()
    galat = periksa_arsip(head(), arsip)
    if galat:
        tolak(f"prospektif gempa DITOLAK, tidak append-only: {galat}")
    n_lama = {n: len(arsip[n]) for n in DAFTAR}
    felt = felt if felt is not None else felt_per_id()
    sudah = {x["id"] for x in arsip["penilaian"]}
    stamp = sekarang.strftime("%Y-%m-%dT%H:%MZ")
    baru = 0
    for b in arsip["butir"]:
        if b["id"] in sudah:
            continue
        umur_hari = (sekarang - dt.datetime.strptime(b["waktu_utc"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=dt.timezone.utc)).total_seconds() / 86400
        f = mmi_felt(felt.get(b["id"]))
        if f is not None and umur_hari >= NILAI_MIN_HARI and b["prakiraan"]["mmi_maks"] is None:
            arsip["penilaian"].append({"id": b["id"], "dinilai": stamp, "status": "di_luar_jendela", "felt_teks": felt[b["id"]], "felt_mmi_maks": f,
                                       "alasan": "model tidak menghitung (MMI di bawah 2 di semua kecamatan) padahal BMKG melaporkan dirasakan: kegagalan model, dihitung meleset di metrik"})
            baru += 1
        elif f is not None and umur_hari >= NILAI_MIN_HARI:
            arsip["penilaian"].append({"id": b["id"], "dinilai": stamp, "status": "dinilai", "felt_teks": felt[b["id"]], "felt_mmi_maks": f,
                                       "prakiraan_mmi_maks": b["prakiraan"]["mmi_maks"], "selisih": round(b["prakiraan"]["mmi_maks"] - f, 2)})
            baru += 1
        elif umur_hari >= TANPA_PEMBANDING_HARI:
            arsip["penilaian"].append({"id": b["id"], "dinilai": stamp, "status": "tanpa_pembanding",
                                       "alasan": "tidak ada buletin Dirasakan BMKG yang terbaca dalam 7 hari"})
            baru += 1
    nilai_pager = 0
    if os.path.exists(pager_arsip):
        sudah_p = {x["id"] for x in arsip["pager_penilaian"]}
        for b in json.load(open(pager_arsip)).get("butir", []):
            if b["id"] in sudah_p:
                continue
            umur = (sekarang - dt.datetime.strptime(b["waktu_utc"], "%Y-%m-%dT%H:%M").replace(tzinfo=dt.timezone.utc)).days
            if umur < PAGER_MIN_HARI:
                continue
            kita = b["pager_resmi"]["kelas"]
            try:
                pr = usgs(b["id"])
            except Exception as e:  # sumber mati: coba lagi besok; sesudah 60 hari ditutup tanpa pembanding
                print("usgs gagal", b["id"], type(e).__name__)
                if umur < PAGER_TUTUP_HARI:
                    continue
                pr = None
            if pr is None:
                pen = {"status": "tanpa_pembanding", "alasan": f"USGS tidak menjawab dalam {PAGER_TUTUP_HARI} hari"}
            elif KELAS_USGS.get(pr.get("jiwa")):
                ku = KELAS_USGS[pr["jiwa"]]
                pen = {"status": "dinilai", "pembanding": "korban jiwa USGS", "kelas_kita": kita, "kelas_usgs": ku,
                       "selisih_kelas": URUT_KELAS.index(kita) - URUT_KELAS.index(ku)}
            elif KELAS_USGS.get(pr.get("alert")):
                pen = {"status": "dinilai_gabungan", "pembanding": "alert gabungan jiwa+ekonomi USGS (level jiwa tidak tersedia); tidak masuk metrik kelas jiwa",
                       "kelas_kita": kita, "kelas_usgs_gabungan": KELAS_USGS[pr["alert"]]}
            elif umur >= PAGER_TUTUP_HARI:
                pen = {"status": "tanpa_pembanding", "alasan": "USGS tidak menerbitkan level PAGER"}
            else:
                continue  # PAGER bisa terbit terlambat: tunggu sampai 60 hari
            arsip["pager_penilaian"].append({"id": b["id"], "dinilai": stamp, **pen})
            nilai_pager += 1
            simpan(arsip, sekarang)  # bertahap: sumber lambat atau runner mati tidak membuang penilaian yang sudah didapat
    assert periksa_arsip({n: arsip[n][:n_lama[n]] for n in DAFTAR}, arsip) is None
    simpan(arsip, sekarang)
    print(f"prospektif gempa: {baru} penilaian MMI baru, {nilai_pager} penilaian PAGER baru; metrik", json.dumps(arsip["metrik"], ensure_ascii=False))
    return baru, nilai_pager


def uji():
    assert mmi_felt("II - III Manokwari") == 3 and mmi_felt("II-III Sorong") == 3 and mmi_felt("III Kab. A, I Kab. B") == 3
    assert mmi_felt("III Cianjur, II Sukabumi, IV Ciwidey, II Kec. X") == 4 and mmi_felt("III-IV Kecamatan Bula") == 4
    assert mmi_felt("") is None and mmi_felt(None) is None and mmi_felt("tidak ada") is None
    assert periksa_arsip({"butir": [1]}, {"butir": [1, 2]}) is None
    assert "menyusut" in periksa_arsip({"butir": [1, 2]}, {"butir": [1]}) and "berubah" in periksa_arsip({"penilaian": [1]}, {"penilaian": [2]})
    assert periksa_arsip({}, {"butir": [1]}) is None
    a = kosong()
    assert metrik(a)["mmi"] is None and metrik(a)["dicatat"] == 0
    a["penilaian"] = [{"status": "dinilai", "selisih": 1.0}, {"status": "dinilai", "selisih": -2.0}, {"status": "tanpa_pembanding"}]
    mm = metrik(a)["mmi"]
    assert mm["n"] == 2 and mm["bias"] == -0.5 and mm["mae"] == 1.5 and mm["persen_dalam_1"] == 50.0 and mm["meleset"] == 1, mm
    a["penilaian"].append({"id": "z", "status": "di_luar_jendela"})
    mm = metrik(a)["mmi"]
    assert mm["di_luar_jendela"] == 1 and mm["n_pembanding"] == 3 and mm["meleset"] == 2 and mm["persen_dalam_1_termasuk_di_luar"] == 33.3, mm
    assert len(sidik_model({"a": 1})) == 12 and sidik_model({"a": 1, "b": 2}) == sidik_model({"b": 2, "a": 1}) != sidik_model({"a": 1})
    print("prospektif gempa uji OK")


if __name__ == "__main__":
    {"catat": catat, "nilai": nilai, "uji": uji}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
