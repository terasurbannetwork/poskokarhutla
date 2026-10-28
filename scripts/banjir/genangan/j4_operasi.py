"""Jalur operasional uji PROSPEKTIF J4 (PRAREG-J4.md bagian 3, 4, 5, 6, 7). Satu skrip, lima langkah; semuanya append-only ke data/banjir/genangan/ (dilacak git).
  hujan    GSMaP NRT per jam (hourly_G, cadangan hourly) 30 sel 0,1 derajat untuk satu hari WIB -> j4_hujan_jam.jsonl            (butuh GSMAP_USER/GSMAP_PASS)
  pemicu   rata-rata 42 kecamatan m1_hujan.jsonl >= X (34) dan X2 (30), aturan run beruntun + jendela tak tumpang tindih -> j4_kejadian.jsonl
  prakira  kejadian terpilih tanpa prediksi, pada D+2 sampai D+6: hujan jam + debit Flood API -> mesin.mjs --dem-100m -> j4_prakira/<D>.raster.gz
           + baris rantai-hash di j4_prediksi.jsonl
  label    D+3 sampai D+9, HANYA bila baris prediksinya sudah ada di origin/main: PetaBencana tersaring dan tanpa saring -> j4_label.jsonl
  nilai    kriteria bagian 5 dan 6 -> j4_vonis.json SEKALI (menolak bila kunci_j4 `cek` merah); `nilai --pratinjau` hanya mencetak
Kegagalan unduh atau prakiraan: SELALU satu baris di j4_gagal.jsonl (tanggal, tahap, alasan, percobaan); kejadian itu keluar dan tidak diulang sesudah label atau hasil lain terlihat.
Hanya DUA percobaan pada hari yang sama sebelum prediksi tersimpan (jumlahnya dicatat). Env J4_DIR hanya untuk uji lokal.
Pakai:  python3 scripts/banjir/genangan/j4_operasi.py hujan|pemicu|prakira|label|nilai [--tanggal YYYY-MM-DD] [--pratinjau] | uji
Kode keluar: 0 beres atau tak ada kerja, 1 gagal tercatat, 2 kunci/login hilang, 3 di luar jendela.
"""
import base64, datetime as dt, gzip, hashlib, json, math, os, platform, subprocess, sys, tempfile, urllib.parse

D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import skor_j3, skor_j4  # noqa: E402

AKAR = os.path.abspath(os.path.join(D, "..", "..", ".."))
DIR = os.environ.get("J4_DIR") or os.path.join(AKAR, "data/banjir/genangan")
WIB = dt.timezone(dt.timedelta(hours=7))
X, X2, JAM, KD = 34, 30, 96, 8                       # = kalibrasi_j4.BEKU; berubah = kriteria baru (sidik kunci_j4)
BAKE = os.path.join(D, "j4_medan_100m.json.gz")
KOTAK = (106.6, -6.4, 107.0, -6.1)                   # sel GSMaP 0,1 derajat yang mengapit 20 titik hujan (5 lon x 4 lat) -> 6 x 5 sel
LON = [106.6, 106.7, 106.8, 106.9, 107.0]; LAT = [-6.4, -6.3, -6.2, -6.1]   # titik hujan sama dengan hujan_jam.py
MESIN = ["--faktor", "12", "--jam", str(JAM), "--cn", "80", "--muka", "0.6", "--rentang", "1", "--skala-subsiden", "1", "--skala-hulu", "1", "--radius-hulu-km", "10",
         "--tanggul", "2.5", "--agregasi", "mean", "--cekungan-maks", "0.5", "--hujan", "gsmap_jam"]
HUJAN_ANT_HARI = 7                                    # antecedent 168 jam sebelum mulai (mesin.mjs)
MIN_KEJADIAN, MIN_LAPORAN_JUMLAH, KEJADIAN_VONIS, TGL_VONIS, TGL_LABEL_TUTUP = 6, 150, 10, dt.date(2027, 4, 30), dt.date(2027, 5, 8)
BATAS_KELUAR = 0.20


def f(nama):
    return os.path.join(DIR, nama)


def baca_jsonl(j):
    return [json.loads(b) for b in open(j, encoding="utf-8") if b.strip()] if os.path.exists(j) else []


def tambah(j, r):
    os.makedirs(os.path.dirname(j), exist_ok=True)
    with open(j, "a", encoding="utf-8") as h:
        h.write(json.dumps(r, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n")


def sha_b(b):
    return hashlib.sha256(b).hexdigest()


def sha_j(o):
    return sha_b(json.dumps(o, sort_keys=True, separators=(",", ":")).encode())


def sekarang():
    return dt.datetime.now(WIB)


def hari_ini():
    return sekarang().date()


def iso(d):
    return d.isoformat()


def gagal(tanggal, tahap, alasan, percobaan=1):
    tambah(f("j4_gagal.jsonl"), {"tanggal": str(tanggal), "tahap": tahap, "alasan": alasan, "percobaan": percobaan, "dicatat": sekarang().isoformat(timespec="minutes")})
    print(f"GAGAL {tanggal} {tahap}: {alasan}", file=sys.stderr)
    return 1


def keluar_set(tahap=None):
    return {r["tanggal"] for r in baca_jsonl(f("j4_gagal.jsonl")) if tahap is None or r["tahap"] == tahap}


# ------------------------------------------------------------------ hujan jam GSMaP NRT
def jam_wib(tgl):
    a = dt.datetime.combine(tgl, dt.time(0), WIB).astimezone(dt.timezone.utc)
    return [(a + dt.timedelta(hours=i)).replace(tzinfo=None) for i in range(24)]


def baris_hujan(tgl, jam, pola, lon, lat, now=None):
    """jam: 24 larik sel (urutan baris lintang utara->selatan lalu bujur barat->timur) atau None; pola: 24 huruf G/N/-."""
    hilang = sum(j is None for j in jam)
    r = {"tanggal": iso(tgl), "lon": lon, "lat": lat, "pola": pola, "jam_hilang": hilang, "dikeluarkan": hilang > 3, "dibuat": (now or sekarang()).isoformat(timespec="minutes"),
         "mm": [None if j is None else [None if v is None else round(v, 3) for v in j] for j in jam]}
    if r["dikeluarkan"]:
        r["alasan"] = f"{hilang} jam GSMaP hilang (> 3)"
    return r


def hujan(tgl, ambil=None, lon=None, lat=None):
    """ambil(tanggal_utc_jam) -> (larik sel | None, huruf). None = tak ada FTP/kunci (kode 2)."""
    if tgl >= hari_ini():
        print(f"{tgl} belum selesai", file=sys.stderr); return 1
    if iso(tgl) in {r["tanggal"] for r in baca_jsonl(f("j4_hujan_jam.jsonl"))}:
        print(f"hujan jam {tgl} sudah ada"); return 0
    if ambil is None:
        ambil, lon, lat = ambil_ftp()
    if ambil is None:
        return 2
    jam, pola = [], ""
    for w in jam_wib(tgl):
        v, h = ambil(w); jam.append(v); pola += h
    umur = (hari_ini() - tgl).days
    if any(x is not None and x > 300 for j in jam if j for x in j):
        return gagal(tgl, "hujan", "nilai > 300 mm/jam: satuan/format diragukan")
    if pola.count("-") and umur < 3:
        print(f"  {pola.count('-')} jam belum ada, umur {umur} hari: tunggu", file=sys.stderr); return 1
    if pola.count("-") == 24:
        return gagal(tgl, "hujan", "tidak ada berkas GSMaP sama sekali")
    r = baris_hujan(tgl, jam, pola, lon, lat)
    tambah(f("j4_hujan_jam.jsonl"), r)
    if r["dikeluarkan"]:
        gagal(tgl, "hujan", r["alasan"])
    print(f"hujan jam {tgl}: pola {pola}")
    return 0


def ambil_ftp():
    import ftplib, gsmap, m1_kumpul
    user, sandi = os.environ.get("GSMAP_USER"), os.environ.get("GSMAP_PASS")
    if not user or not sandi:
        print("GSMAP_USER/GSMAP_PASS tidak ada di lingkungan (hanya di GitHub Actions).", file=sys.stderr); return None, None, None
    ci, cj = gsmap.indeks_sel(KOTAK)
    st = {"f": None, "cache": {}}

    def baru():
        st["f"] = gsmap.sambung(user, sandi); return st["f"]
    baru()

    def ambil(w):
        for _, c, dasar in m1_kumpul.NRT:
            try:
                jalur = m1_kumpul.cari_jam(st["f"], dasar, w.date(), w.hour, st["cache"])
            except ftplib.all_errors + (EOFError,):
                baru(); jalur = m1_kumpul.cari_jam(st["f"], dasar, w.date(), w.hour, st["cache"])
            if jalur:
                isi, st["f"] = m1_kumpul.unduh_jam(st["f"], baru, jalur, ci, cj)
                if isi is not None:
                    return isi, c
        return None, "-"
    return ambil, [lo for _, lo in ci], [la for _, la in cj]


def bilinear(fl, lons, lats, lon, lat):
    """Salinan mesin.mjs bilinear: fl urutan j (lintang utara->selatan) x i; hilang (None) diabaikan; luar kisi dijepit."""
    nx, ny = len(lons), len(lats)
    fx = min(nx - 1, max(0.0, (lon - lons[0]) / (lons[1] - lons[0]))); fy = min(ny - 1, max(0.0, (lat - lats[0]) / (lats[1] - lats[0])))
    i0, j0 = math.floor(fx), math.floor(fy); i1, j1 = min(nx - 1, i0 + 1), min(ny - 1, j0 + 1); u, v = fx - i0, fy - j0; s = w = 0.0
    for i, j, b in ((i0, j0, (1 - u) * (1 - v)), (i1, j0, u * (1 - v)), (i0, j1, (1 - u) * v), (i1, j1, u * v)):
        x = fl[j * nx + i]
        if x is not None and b > 0:
            s += x * b; w += b
    return s / w if w else None


def bangun_hujan(rows, mulai):
    """rows {tanggal ISO: baris j4_hujan_jam}; -> (berkas mesin {'gsmap_jam': 20 titik}, hari_hilang_di_jendela). Antecedent yang hilang = None (dihitung 0 oleh mesin)."""
    waktu, per = [], {(la, lo): [] for la in LAT for lo in LON}; hilang = []
    for k in range(-HUJAN_ANT_HARI, JAM // 24):
        d = mulai + dt.timedelta(days=k); r = rows.get(iso(d)); ok = r is not None and not r.get("dikeluarkan")
        if not ok and k >= 0:
            hilang.append(iso(d))
        for h in range(24):
            waktu.append(f"{iso(d)}T{h:02d}:00")
            for (la, lo), s in per.items():
                v = bilinear(r["mm"][h], r["lon"], r["lat"], lo, la) if ok and r["mm"][h] is not None else None
                s.append(None if v is None else round(v, 4))
    return {"gsmap_jam": [{"lat": la, "lon": lo, "waktu": waktu, "mm": mm} for (la, lo), mm in per.items()]}, hilang


# ------------------------------------------------------------------ pemicu
def seri_m1(m1):
    """baris m1_hujan -> [(tanggal, rata-rata mm 42 kecamatan)] hanya hari tak dikeluarkan."""
    return sorted((r["tanggal"], sum(v["mm"] for v in r["kec"].values()) / len(r["kec"])) for r in m1 if not r.get("dikeluarkan") and r.get("kec"))


def kejadian_baru(seri, x, sejak):
    """seri hari bersejarah -> (terpilih, dibuang) {tanggal: mm}. Run yang masih berjalan di hari terakhir TIDAK dihitung; hari sebelum `sejak` (tanggal jangkar) diabaikan."""
    s = [(t, m) for t, m in seri if t >= iso(sejak)]
    while s and s[-1][1] >= x:
        s.pop()
    mm = dict(s); kej, buang = skor_j4.pilih_kejadian(s, x)
    return {t: mm[t] for t in kej}, {t: mm[t] for t in buang}


def pemicu(sejak, m1=None):
    m1 = m1 if m1 is not None else baca_jsonl(os.path.join(DIR, "m1_hujan.jsonl")); ada = {(r["tanggal"], r["x"]) for r in baca_jsonl(f("j4_kejadian.jsonl"))}; n = 0
    for x in (X, X2):
        kej, buang = kejadian_baru(seri_m1(m1), x, sejak)
        for status, dd in (("terpilih", kej), ("dibuang_tumpang_tindih", buang)):
            for t, m in sorted(dd.items()):
                if (t, x) in ada:
                    continue
                p = dt.date.fromisoformat(t)
                tambah(f("j4_kejadian.jsonl"), {"tanggal": t, "x": x, "status": status, "mm_puncak": round(m, 2), "mulai": iso(p - dt.timedelta(days=2)), "jam": JAM, "dicatat": sekarang().isoformat(timespec="minutes")})
                n += 1
    print(f"pemicu: {n} baris kejadian baru")
    return 0


# ------------------------------------------------------------------ prakira
def ambil_flood(lat, lon, a, b):
    import bersama
    d = bersama.ambil_json("https://flood-api.open-meteo.com/v1/flood?" + urllib.parse.urlencode({"latitude": lat, "longitude": lon, "daily": "river_discharge", "start_date": a, "end_date": b}))
    q = d["daily"]["river_discharge"]
    if len(q) < 6 or any(v is None for v in q):
        raise RuntimeError(f"Flood API {lat},{lon}: {sum(v is None for v in q)} hari kosong dari {len(q)}")
    return q


def bangun_hulu(mulai, tgl, hulu_json, ambil=ambil_flood):
    """-> berkas hulu untuk mesin: kejadian[tgl] = {mulai: mulai-1 hari, q harian Flood API} di tiap titik (snap dari hulu.json). Satu panggilan per sel snap."""
    a, b = iso(mulai - dt.timedelta(days=1)), iso(mulai + dt.timedelta(days=5)); cache, titik = {}, {}
    for n, t in hulu_json["titik"].items():
        k = tuple(t["snap"])
        if k not in cache:
            cache[k] = ambil(k[0], k[1], a, b)
        titik[n] = {"snap": t["snap"], "kejadian": {tgl: {"mulai": a, "q": cache[k]}}}
    return {"titik": titik}


def jalankan_mesin(tgl, mulai, masukan, raster, keluar, tambahan=()):
    with tempfile.TemporaryDirectory() as t:
        hj, hl = os.path.join(t, "hujan.json"), os.path.join(t, "hulu.json")
        json.dump(masukan["hujan"], open(hj, "w")); json.dump(masukan["hulu"], open(hl, "w"))
        a = ["node", os.path.join(D, "mesin.mjs"), *MESIN, "--kd", str(KD), "--kejadian", tgl, "--mulai", mulai, "--dem-100m", BAKE, "--hujan-berkas", hj, "--hulu-berkas", hl,
             "--raster", raster, "--keluar", keluar]
        for i in range(0, len(tambahan), 2):   # penimpa (mis. --kd 2 untuk pembanding J3); argumen terakhir menang
            a += [tambahan[i], tambahan[i + 1]]
        subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=3600)


def hash_baris(r):
    return sha_j({k: v for k, v in r.items() if k != "hash"})


def rantai_ok(rows):
    p = "0" * 64
    for r in rows:
        if r.get("prev") != p or r.get("hash") != hash_baris(r):
            return False
        p = r["hash"]
    return True


def prakira(tgl, sidik_kode, mesin=jalankan_mesin, flood=ambil_flood):
    mulai = tgl - dt.timedelta(days=2); h = hari_ini()
    if not (tgl + dt.timedelta(days=2) <= h <= tgl + dt.timedelta(days=6)):
        print(f"{tgl}: di luar jendela prakira D+2..D+6", file=sys.stderr); return 3
    rows = {r["tanggal"]: r for r in baca_jsonl(f("j4_hujan_jam.jsonl"))}
    hj, hilang = bangun_hujan(rows, mulai)
    if hilang:
        return gagal(tgl, "prakira", f"hujan jam jendela hilang/dikeluarkan: {hilang}")
    pred = baca_jsonl(f("j4_prediksi.jsonl"))
    if not rantai_ok(pred):
        return gagal(tgl, "prakira", "rantai hash j4_prediksi.jsonl rusak: berhenti")
    ras = os.path.join(DIR, "j4_prakira", f"{tgl}.raster.gz"); os.makedirs(os.path.dirname(ras), exist_ok=True)
    hulu_json = json.load(open(os.path.join(AKAR, "public/banjir/data/genangan/hulu.json"))); err = None
    for coba in (1, 2):
        try:
            masukan = {"hujan": hj, "hulu": bangun_hulu(mulai, str(tgl), hulu_json, flood)}
            with tempfile.TemporaryDirectory() as t:
                mesin(str(tgl), iso(mulai), masukan, ras + ".tmp", os.path.join(t, "k.json"))
                ring = json.load(open(os.path.join(t, "k.json")))
            break
        except Exception as e:
            err = f"{type(e).__name__}: {str(getattr(e, 'stderr', '') or e)[-300:]}"; print(f"  percobaan {coba}: {err}", file=sys.stderr)
    else:
        return gagal(tgl, "prakira", err, 2)
    os.replace(ras + ".tmp", ras)
    with gzip.open(os.path.join(DIR, "j4_prakira", f"{tgl}.masukan.json.gz"), "wt") as h:
        json.dump(masukan, h, sort_keys=True, separators=(",", ":"))
    r = {"tanggal": str(tgl), "mulai": iso(mulai), "jam": JAM, "ant_hari_ada": sum(1 for k in range(1, HUJAN_ANT_HARI + 1) if iso(mulai - dt.timedelta(days=k)) in rows and not rows[iso(mulai - dt.timedelta(days=k))].get("dikeluarkan")), "sidik_kode": sidik_kode, "sha_hujan": sha_j(hj), "sha_hulu": sha_j(masukan["hulu"]), "sha_raster": sha_b(open(ras, "rb").read()),
         "persen_basah_ge10cm": ring["sebaran_kedalaman_puncak_m"].get("persen_ge10cm"), "runner": platform.platform(), "dibuat": sekarang().isoformat(timespec="minutes"),
         "prev": pred[-1]["hash"] if pred else "0" * 64}
    r["hash"] = hash_baris(r); tambah(f("j4_prediksi.jsonl"), r)
    print(f"prediksi {tgl}: tersimpan {r['hash'][:12]} basah {r['persen_basah_ge10cm']}%")
    return 0


# ------------------------------------------------------------------ label
def di_origin(baris_hash, jalur="data/banjir/genangan/j4_prediksi.jsonl"):
    """Baris prediksi (hash) ada di origin/main? Perlu `git fetch`; stempel waktu atau berkas lokal tidak cukup."""
    subprocess.run(["git", "fetch", "--quiet", "origin", "main"], cwd=AKAR, capture_output=True)
    r = subprocess.run(["git", "show", f"origin/main:{jalur}"], cwd=AKAR, capture_output=True, text=True)
    return r.returncode == 0 and any(f'"hash":"{baris_hash}"' in b for b in r.stdout.splitlines())


def tarik_pb(a, b):
    import bersama, petabencana
    q = lambda d: urllib.parse.quote(f"{d.isoformat()}T00:00:00+0700")
    return [petabencana.ringkas(x) for x in bersama.ambil_json(petabencana.URL % (q(a), q(b)))["result"]["features"]]


def label(tgl, tarik=tarik_pb, origin=di_origin):
    pred = next((r for r in baca_jsonl(f("j4_prediksi.jsonl")) if r["tanggal"] == str(tgl)), None)
    if pred is None:
        return 0
    if any(r["tanggal"] == str(tgl) for r in baca_jsonl(f("j4_label.jsonl"))):
        return 0
    h = hari_ini(); akhir = tgl + dt.timedelta(days=2)
    if not (akhir + dt.timedelta(days=1) <= h <= akhir + dt.timedelta(days=7)):
        print(f"{tgl}: di luar jendela label D+3..D+9", file=sys.stderr)
        return gagal(tgl, "label", "lewat H+7, label tidak diambil") if h > akhir + dt.timedelta(days=7) else 3
    if not origin(pred["hash"]):
        print(f"{tgl}: baris prediksi belum ada di origin/main: label ditolak", file=sys.stderr); return 3
    import bersama, petabencana
    try:
        mulai = tgl - dt.timedelta(days=2); mentah = tarik(mulai, akhir + dt.timedelta(days=1))
    except Exception as e:
        return gagal(tgl, "label", f"PetaBencana: {e}")
    with tempfile.TemporaryDirectory() as t:
        out = {}
        for nama, lap in (("tersaring", petabencana.saring(mentah)[0]), ("tanpa_saring", [r for r in mentah if r.get("tipe") == "flood"])):
            p = os.path.join(t, nama + ".json"); json.dump(lap, open(p, "w"))
            out[nama] = skor_j4.muat_label(iso(mulai), JAM, berkas=p, kec=bersama.KecDKI())
    tambah(f("j4_label.jsonl"), {"tanggal": str(tgl), "mulai": iso(mulai), "diambil": sekarang().isoformat(timespec="minutes"), "n_mentah": len(mentah), "n_tersaring": len(out["tersaring"]),
                                 "n_tanpa_saring": len(out["tanpa_saring"]), "tersaring": out["tersaring"], "tanpa_saring": out["tanpa_saring"]})
    print(f"label {tgl}: {len(out['tersaring'])} tersaring, {len(out['tanpa_saring'])} tanpa saring")
    return 0


# ------------------------------------------------------------------ nilai
def z_panggang():
    """Elevasi DEM rata-rata blok 100 m dari berkas panggang (+inf di blok tanpa data) = skor_j4.muat_z tanpa DEM penuh."""
    import array
    o = json.loads(gzip.open(BAKE).read()); z = array.array("d"); z.frombytes(base64.b64decode(o["z"])); z = array.array("f", z)
    for k in o["kosong"]:
        z[k] = math.inf
    return z


def hitung_kejadian(R, lap, inarisk, R_j3=None, n_null=skor_j4.N_NULL):
    """Satu kejadian: metrik skor_j4.nilai + u per laporan (model, heuristik, InaRISK, J3) untuk bootstrap berpasangan. inarisk {'kab|kec': skor}."""
    m = skor_j4.nilai(R, lap, n_null=n_null)
    if not m.get("n_laporan"):
        return m
    cak = skor_j4.cakram(R["dx_m"]); sel = [k for k in (skor_j4.sel_titik(R, r["lon"], r["lat"]) for r in lap) if k is not None]; kon = skor_j4.kontrol_sel(R)

    def u_dari(skor_sel):
        return skor_j4.u_auc([skor_sel[k] for k in sel], sorted(skor_sel[k] for k in kon))

    def dil(Rx):
        return skor_j4.dilasi(Rx, {k: v for k, v in enumerate(Rx["hm"]) if v > 0 and Rx["kec"][k] >= 0}, cak)
    u = u_dari(dil(R)); m["u"] = u
    if R.get("z") is not None:
        zs = {k: -skor_j4.elev_min(R, R["z"], k, cak) for k in sel + kon}; m["u_heuristik"] = u_dari(zs)
    nm = R["nama"]; ina = {k: (inarisk.get(nm[R["kec"][k]], 0.0) if R["kec"][k] >= 0 else 0.0) for k in sel + kon}; m["u_inarisk"] = u_dari(ina)
    if R_j3 is not None:
        m["u_j3"] = u_dari(dil(R_j3))
    return m


def selisih(ms, a, b):
    """bootstrap dua tingkat atas selisih u (a - b) per laporan; kejadian tanpa kedua u dilewati. -> (rata-rata, batas bawah) atau None."""
    d = [[x - y for x, y in zip(m[a], m[b])] for m in ms if a in m and b in m]
    return skor_j4.boot_batas(d) if d else None


def vonis(ms, keluar, terpilih_n):
    """ms: [hasil hitung_kejadian per kejadian terjudge]; keluar/terpilih_n: kejadian keluar (gagal) dari yang terpilih. -> dict vonis (bagian 5)."""
    mu, lo = skor_j4.boot_batas([m["u"] for m in ms])
    p5 = [m["null"]["b5"]["p_hss"] for m in ms]; hss = [m["hss"] for m in ms if m["hss"] is not None]
    ii = {"hss_rata": sum(hss) / len(hss) if hss else None, "bagian_p5_lt_005": sum(p < 0.05 for p in p5) / len(p5)}
    ii["ya"] = bool(hss) and ii["hss_rata"] > 0 and ii["bagian_p5_lt_005"] >= 0.6
    iii = selisih(ms, "u", "u_inarisk"); sh = selisih(ms, "u", "u_heuristik"); s3 = selisih(ms, "u", "u_j3")
    frac = keluar / terpilih_n if terpilih_n else 0
    lulus = lo > 0.5
    return {"n_kejadian": len(ms), "auc_rata": mu, "auc_batas_bawah": lo, "syarat_i_lulus": lulus,
            "dilaporkan": {"ii_hss_dan_null_5x5": ii, "iii_auc_minus_inarisk": iii, "auc_minus_j3": s3, "auc_minus_heuristik": sh},
            "luas_basah_gt_25persen": [i for i, m in enumerate(ms) if m["luas_basah"] > 0.25], "kejadian_keluar": keluar, "kejadian_terpilih": terpilih_n, "ditahan": frac > BATAS_KELUAR,
            "vonis": "TAHAN (kejadian keluar > 20%)" if frac > BATAS_KELUAR else ("BERNILAI TAMBAH" if lulus and sh and sh[1] > 0 else "LULUS" if lulus else "TIDAK LULUS"),
            "arti_lulus": "lebih baik dari acak (keterampilan relatif terhadap bias lokasi pelapor); (ii) dan (iii) hanya dilaporkan (keputusan pemilik 28 Okt 2026)"}


def siap_vonis(n_terjudge, jumlah_laporan, h):
    if n_terjudge >= KEJADIAN_VONIS:
        return True, "10 kejadian terjudge"
    if h >= TGL_LABEL_TUTUP:
        return (n_terjudge >= MIN_KEJADIAN and jumlah_laporan >= MIN_LAPORAN_JUMLAH), "30 Apr 2027 lewat, label ditutup 7 Mei"
    return False, "belum waktunya"


def kumpul(x):
    """-> (daftar [(tanggal, prediksi, label)] terjudge untuk ambang x, jumlah terpilih, jumlah keluar)."""
    terpilih = sorted({r["tanggal"] for r in baca_jsonl(f("j4_kejadian.jsonl")) if r["x"] == x and r["status"] == "terpilih"})
    pred = {r["tanggal"]: r for r in baca_jsonl(f("j4_prediksi.jsonl"))}; lab = {r["tanggal"]: r for r in baca_jsonl(f("j4_label.jsonl"))}; gg = keluar_set()
    sudah = [t for t in terpilih if dt.date.fromisoformat(t) + dt.timedelta(days=9) < hari_ini()]    # yang masih bisa terisi tidak dihitung keluar
    keluar = [t for t in sudah if t in gg or t not in pred or t not in lab]
    ok = [(t, pred[t], lab[t]) for t in terpilih if t in pred and t in lab and t not in gg and lab[t]["n_tersaring"] >= skor_j4.MIN_LAPORAN]
    return ok, len(sudah), len(keluar)


def nilai(pratinjau=False):
    import kunci_j4
    if os.path.exists(f("j4_vonis.json")):
        print("vonis sudah dikunci (j4_vonis.json)"); return 0
    if not pratinjau:
        g = kunci_j4.periksa()
        if g:
            print("kunci merah, nilai menolak:", g, file=sys.stderr); return 2
    bahaya = json.load(open(os.path.join(AKAR, "public/banjir/data/bahaya.json")))["kec"]; inarisk = {k[3:]: v.get("banjir", 0.0) for k, v in bahaya.items() if k.startswith("31|")}
    z = z_panggang(); hasil = {}
    for x in (X, X2):
        ok, n_sel, n_keluar = kumpul(x); jml = sum(l["n_tersaring"] for _, _, l in ok); siap, alasan = siap_vonis(len(ok), jml, hari_ini())
        if x == X2 and (hasil.get(X, {}).get("n_kejadian", 0) >= MIN_KEJADIAN or hari_ini() < TGL_VONIS):
            continue
        print(f"X={x}: terjudge {len(ok)}, {jml} laporan, keluar {n_keluar}/{n_sel}; {alasan}; siap={siap}")
        if not siap and not pratinjau:
            continue
        ms = {"saring": [], "tanpa_saring": []}
        for t, p, l in ok:
            R = skor_j4.baca_raster(os.path.join(DIR, "j4_prakira", f"{t}.raster.gz")); R["z"] = z
            if sha_b(open(os.path.join(DIR, "j4_prakira", f"{t}.raster.gz"), "rb").read()) != p["sha_raster"]:
                print(f"  {t}: raster tak cocok dengan hash prediksi: dilewati", file=sys.stderr); continue
            with tempfile.TemporaryDirectory() as tt:   # pembanding J3 (hujan sama, Kd 2): dijalankan ulang dari masukan yang disimpan
                mk = json.load(gzip.open(os.path.join(DIR, "j4_prakira", f"{t}.masukan.json.gz"), "rt")); rj3 = os.path.join(tt, "j3.gz")
                jalankan_mesin(t, p["mulai"], mk, rj3, os.path.join(tt, "k.json"), ("--kd", "2")); Rj3 = skor_j4.baca_raster(rj3)
            ms["saring"].append(hitung_kejadian(R, l["tersaring"], inarisk, Rj3))
            if l["tanpa_saring"]:
                ms["tanpa_saring"].append(hitung_kejadian(R, l["tanpa_saring"], inarisk))
        if ms["saring"]:
            hasil[x] = vonis(ms["saring"], n_keluar, n_sel)
            if ms["tanpa_saring"]:
                hasil[x]["sensitivitas_tanpa_saring"] = {"auc_rata": (v := skor_j4.boot_batas([m["u"] for m in ms["tanpa_saring"]]))[0], "auc_batas_bawah": v[1], "lulus": v[1] > 0.5}
                hasil[x]["arah_sama"] = hasil[x]["sensitivitas_tanpa_saring"]["lulus"] == hasil[x]["syarat_i_lulus"]
        if x == X and siap:
            break
    out = json.dumps({"dibuat": sekarang().isoformat(timespec="minutes"), "pratinjau": pratinjau, "hasil": {str(k): v for k, v in hasil.items()},
                      "klaim": "keterampilan relatif terhadap bias lokasi pelapor, BUKAN akurasi prakiraan genangan"}, indent=1, ensure_ascii=False)
    print(out)
    if not hasil:
        print("belum cukup data: tidak ada vonis")
    elif not pratinjau:
        open(f("j4_vonis.json"), "w").write(out)
    return 0


# ------------------------------------------------------------------ uji kering (LOKAL: butuh data/raw gitignored)
def kering(ev="2020-01", puncak="2020-01-01", online=True, ant_hari=1, eksak=False):
    """Putar ulang satu kejadian kalibrasi lewat jalur operasional (DEM panggang, hujan jam -> bangun_hujan, hulu Flood API, prakira) dan bandingkan AUC dengan cache kalibrasi (M0_G_kd8).
    ant_hari = hari antecedent yang diisi (cache ERA5 kalibrasi hanya punya 1 hari sebelum mulai; operasional memakai 7). GSMaP NRT per jam 2020 tidak ada tanpa login: jam disintesis dari GSMaP harian gauge v8 x bentuk jam ERA5 titik terdekat, jadi yang diuji = DEM+alur panggang, rakitan hujan jam, hulu, prakira, skor
    tanpa DEM penuh; BUKAN kesetaraan NRT vs gauge."""
    global DIR
    p = dt.date.fromisoformat(puncak); gs = json.load(open(os.path.join(AKAR, "data/banjir/genangan/gsmap_harian.json"))); gl = gs["meta"]["grid"]
    era = json.load(open(os.path.join(AKAR, "data/raw/banjir/genangan/hujan_jam", ev + ".json")))["era5"]; global hari_ini
    ci, cj = [(i, lo) for i, lo in enumerate(gl["lon"]) if 106.55 - 1e-6 <= lo <= 107.05 + 1e-6], [(j, la) for j, la in enumerate(gl["lat"]) if -6.45 - 1e-6 <= la <= -6.05 + 1e-6]
    lon, lat = [lo for _, lo in ci], [la for _, la in cj]; waktu = era[0]["waktu"]
    if eksak:   # isolasi pipa: deret 20 titik persis seperti mesin.mjs gsmap_dis (bilinear harian x bentuk ERA5 titik itu), disuap sebagai "sel" di 20 titik -> bilinear jam = identitas
        lon, lat = LON, sorted(LAT, reverse=True)
    with tempfile.TemporaryDirectory() as t:
        DIR = t
        for k in range(-ant_hari, 4):
            d = p - dt.timedelta(days=2) + dt.timedelta(days=k); tot = gs["hari"].get(iso(d)); jam = []
            for h in range(24):
                row = []
                if eksak:
                    for la in lat:
                        for lo in lon:
                            e = next(s for s in era if abs(s["lat"] - la) < 1e-6 and abs(s["lon"] - lo) < 1e-6); ix = waktu.index(f"{iso(d)}T00:00") if f"{iso(d)}T00:00" in waktu else None
                            sh = [x or 0 for x in e["mm"][ix:ix + 24]] if ix is not None else [1.0] * 24; T = bilinear(tot, gl["lon"], gl["lat"], lo, la) if tot else None
                            row.append(sh[h] if T is None else (T * sh[h] / sum(sh) if sum(sh) > 1e-9 else T / 24))
                    jam.append(row); continue
                for j, la in cj:
                    for i, lo in ci:
                        e = min(era, key=lambda s: abs(s["lat"] - la) + abs(s["lon"] - lo)); sh = [x or 0 for x in e["mm"][waktu.index(f"{iso(d)}T00:00"):][:24]] if f"{iso(d)}T00:00" in waktu else [1.0] * 24
                        v = tot[j * len(gl["lon"]) + i] if tot else None
                        row.append(None if v is None else (v * sh[h] / sum(sh) if sum(sh) > 1e-9 else v / 24))
                jam.append(row)
            tambah(f("j4_hujan_jam.jsonl"), baris_hujan(d, jam, "G" * 24, lon, lat))
        hari_ini = lambda: p + dt.timedelta(days=2)
        flood = ambil_flood if online else (lambda la, lo, a, b: next(v["kejadian"][ev]["q"] for v in json.load(open(os.path.join(AKAR, "public/banjir/data/genangan/hulu.json")))["titik"].values() if v["snap"] == [la, lo]))
        if prakira(p, "kering", jalankan_mesin, flood):
            return 1
        R = skor_j4.baca_raster(os.path.join(t, "j4_prakira", f"{p}.raster.gz")); R["z"] = z_panggang()
        lap = skor_j4.muat_label(iso(p - dt.timedelta(days=2)), JAM); m = skor_j4.nilai(R, lap, n_null=5)
        ref = json.load(open(os.path.join(AKAR, f"data/raw/banjir/genangan/j4_kal/{ev}_M0_G_kd{KD}.metrik.json")))
        print(json.dumps({"kejadian": ev, "n_laporan": m["n_laporan"], "auc_operasional": m["auc"], "auc_kalibrasi": ref["auc"], "selisih": m["auc"] - ref["auc"],
                          "luas_basah": [m["luas_basah"], ref["luas_basah"]], "heuristik_auc": [m["heuristik"]["auc"], ref["heuristik"]["auc"]], "hulu": "Flood API" if online else "hulu.json", "antecedent_hari": ant_hari, "eksak": eksak}))
    return 0


# ------------------------------------------------------------------ swa-uji
def uji():
    import array, shutil
    global DIR
    with tempfile.TemporaryDirectory() as t:
        DIR = t
        # bilinear: titik di pusat sel = nilainya; di tengah 4 sel = rata-rata; None diabaikan; luar kisi dijepit
        lons, lats = [0.0, 1.0], [1.0, 0.0]; fl = [1.0, 3.0, 5.0, 7.0]
        assert bilinear(fl, lons, lats, 0.0, 1.0) == 1.0 and bilinear(fl, lons, lats, 0.5, 0.5) == 4.0 and bilinear(fl, lons, lats, 9, -9) == 7.0
        assert bilinear([None, 3.0, 5.0, None], lons, lats, 0.5, 0.5) == 4.0 and bilinear([None] * 4, lons, lats, 0.5, 0.5) is None
        # pemicu: dua hari >= 34 = satu run (puncak 60); run di hari terakhir belum selesai; sebelum jangkar diabaikan
        kec = lambda v: {"A|a": {"mm": v}, "B|b": {"mm": v}}
        def m1(tgl, v, **k):
            return {"tanggal": tgl, "kec": kec(v), **k}
        rows = [m1("2026-12-01", 50), m1("2026-12-02", 10), m1("2026-12-03", 40), m1("2026-12-04", 60), m1("2026-12-05", 5), m1("2026-12-06", 90, dikeluarkan=True), m1("2026-12-07", 70), m1("2026-12-08", 80)]
        sr = seri_m1(rows); assert ("2026-12-06", 90) not in sr and len(sr) == 7
        kj, bu = kejadian_baru(sr, 34, dt.date(2026, 12, 2)); assert kj == {"2026-12-04": 60.0} and not bu, (kj, bu)
        assert kejadian_baru(sr, 34, dt.date(2026, 12, 1)) == ({"2026-12-01": 50.0}, {"2026-12-04": 60.0})   # jarak puncak 3 hari < 4: yang kedua dibuang (kausal)
        pemicu(dt.date(2026, 12, 1), rows); n1 = len(baca_jsonl(f("j4_kejadian.jsonl"))); pemicu(dt.date(2026, 12, 1), rows); assert len(baca_jsonl(f("j4_kejadian.jsonl"))) == n1 > 0, "pemicu idempoten"
        # rantai hash
        r1 = {"tanggal": "a", "prev": "0" * 64}; r1["hash"] = hash_baris(r1); r2 = {"tanggal": "b", "prev": r1["hash"]}; r2["hash"] = hash_baris(r2)
        assert rantai_ok([r1, r2]) and not rantai_ok([r2, r1]) and not rantai_ok([{**r1, "tanggal": "x"}, r2])
        # bangun_hujan: hari jendela hilang tercatat; antecedent hilang = None; panjang 264 jam x 20 titik
        mulai = dt.date(2026, 12, 10); sel = {"lon": [106.55, 106.65, 106.75, 106.85, 106.95, 107.05], "lat": [-6.05, -6.15, -6.25, -6.35, -6.45]}
        row = lambda d: {"tanggal": iso(d), "lon": sel["lon"], "lat": sel["lat"], "dikeluarkan": False, "mm": [[2.0] * 30 for _ in range(24)]}
        rr = {iso(mulai + dt.timedelta(days=k)): row(mulai + dt.timedelta(days=k)) for k in range(0, 3)}
        hj, hilang = bangun_hujan(rr, mulai); assert hilang == [iso(mulai + dt.timedelta(days=3))], hilang
        s0 = hj["gsmap_jam"][0]; assert len(hj["gsmap_jam"]) == 20 and len(s0["mm"]) == 264 == len(s0["waktu"]) and s0["mm"][0] is None and s0["mm"][7 * 24] == 2.0 and s0["waktu"][7 * 24] == f"{mulai}T00:00"
        # label: ditolak bila prediksi belum ada di origin; tersimpan sekali; di luar jendela
        tgl = dt.date.today() - dt.timedelta(days=4)
        p = {"tanggal": str(tgl), "prev": "0" * 64}; p["hash"] = hash_baris(p); tambah(f("j4_prediksi.jsonl"), p)
        assert label(tgl, tarik=lambda a, b: [], origin=lambda h: False) == 3 and not baca_jsonl(f("j4_label.jsonl"))
        pb = [{"id": i, "t": f"{tgl - dt.timedelta(days=1)}T10:00:00+07:00", "lon": 106.82 + i * 0.01, "lat": -6.2, "kedalaman_cm": 30, "tipe": "flood", "teks": "Jalan banjir"} for i in range(3)] \
            + [{"id": 9, "t": f"{tgl}T10:00:00+07:00", "lon": 106.83, "lat": -6.21, "kedalaman_cm": 20, "tipe": "flood", "teks": "simulasi banjir"}]
        assert label(tgl, tarik=lambda a, b: pb, origin=lambda h: h == p["hash"]) == 0
        lb = baca_jsonl(f("j4_label.jsonl")); assert len(lb) == 1 and lb[0]["n_tersaring"] == 3 and lb[0]["n_tanpa_saring"] == 4, lb
        assert label(tgl, tarik=lambda a, b: pb, origin=lambda h: True) == 0 and len(baca_jsonl(f("j4_label.jsonl"))) == 1, "label sekali"
        # prakira dengan mesin palsu: tulis prediksi berantai; gagal dua kali -> j4_gagal
        tgl2 = dt.date.today() - dt.timedelta(days=2)
        for k in range(-2, 2):
            d = tgl2 + dt.timedelta(days=k); tambah(f("j4_hujan_jam.jsonl"), row(d))
        flood = lambda la, lo, a, b: [10.0] * 7
        def mesin_palsu(tg, mu, masukan, ras, kel):
            open(ras, "wb").write(b"raster"); json.dump({"sebaran_kedalaman_puncak_m": {"persen_ge10cm": 1.5}}, open(kel, "w"))
        assert prakira(tgl2, "sidik-x", mesin_palsu, flood) == 0
        pd = baca_jsonl(f("j4_prediksi.jsonl")); assert rantai_ok(pd) and pd[-1]["prev"] == pd[-2]["hash"] and pd[-1]["sha_raster"] == sha_b(b"raster") and os.path.exists(f("j4_prakira/%s.masukan.json.gz" % tgl2))
        def rusak(*a):
            raise RuntimeError("mesin mati")
        tgl3 = dt.date.today() - dt.timedelta(days=3)
        for k in range(-2, 2):
            tambah(f("j4_hujan_jam.jsonl"), row(tgl3 + dt.timedelta(days=k)))
        assert prakira(tgl3, "s", rusak, flood) == 1 and baca_jsonl(f("j4_gagal.jsonl"))[-1]["percobaan"] == 2 and not os.path.exists(f("j4_prakira/%s.raster.gz" % tgl3))
        assert prakira(dt.date.today(), "s", mesin_palsu, flood) == 3, "belum D+2"
        # vonis: model sempurna lulus, tak lebih baik dari acak tidak; kejadian keluar > 20% menahan; syarat waktu
        nx = ny = 40; N = nx * ny; kc = array.array("h", [0] * N); hm = array.array("f", [0.0] * N)
        for j in range(10, 20):
            for i in range(10, 20):
                hm[j * nx + i] = 0.5
        R = {"nx": nx, "ny": ny, "dx_m": 100.0, "lon0": 0.0, "lat0": 0.0, "dlon": 1e-3, "dlat": 1e-3, "nama": ["A|a"], "kec": kc, "hm": hm}
        lap = [{"lon": (10 + i % 10) * 1e-3, "lat": -(10 + i // 10 % 10) * 1e-3} for i in range(100)]
        zz = array.array("f", [5.0] * N)
        for j in range(10, 20):
            for i in range(10, 20):
                zz[j * nx + i] = 1.0
        R["z"] = zz; m = hitung_kejadian(R, lap, {"A|a": 0.5}, R, n_null=10)
        assert m["n_laporan"] == 100 and len(m["u"]) == 100 and min(m["u"]) > 0.9 and abs(sum(m["u_inarisk"]) / 100 - 0.5) < 0.1 and abs(sum(m["u_j3"]) / 100 - sum(m["u"]) / 100) < 1e-12
        v = vonis([m] * 6, 0, 6); assert v["syarat_i_lulus"] and v["vonis"] in ("LULUS", "BERNILAI TAMBAH") and v["dilaporkan"]["iii_auc_minus_inarisk"][1] > 0 and not v["ditahan"], v
        assert vonis([m] * 6, 3, 6)["ditahan"] and vonis([m] * 6, 1, 6)["ditahan"] is False
        m2 = dict(m); m2["u"] = [0.5] * 100; assert vonis([m2] * 6, 0, 6)["vonis"] == "TIDAK LULUS"
        assert siap_vonis(10, 0, dt.date(2027, 1, 1))[0] and not siap_vonis(9, 999, dt.date(2027, 4, 30))[0] and siap_vonis(6, 150, dt.date(2027, 5, 8))[0] and not siap_vonis(6, 149, dt.date(2027, 5, 8))[0]
        assert not siap_vonis(5, 999, dt.date(2027, 5, 8))[0]
        # berkas panggang ada dan cocok dengan kisi hujan: 500 x 388, blok tanpa data tercatat
        zb = z_panggang(); assert len(zb) == 500 * 388 and sum(math.isinf(x) for x in zb) < 5000
        assert "gsmap_jam" in MESIN and MESIN[MESIN.index("--faktor") + 1] == "12"
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]; c = a[:1]
    tgl = dt.date.fromisoformat(a[a.index("--tanggal") + 1]) if "--tanggal" in a else None
    if c == ["uji"]:
        uji()
    elif c == ["kering"]:
        sys.exit(kering(online="--offline" not in a, ant_hari=int(a[a.index("--ant") + 1]) if "--ant" in a else 1, eksak="--eksak" in a))
    elif c == ["hujan"]:
        sys.exit(hujan(tgl or hari_ini() - dt.timedelta(days=1)))
    elif c in (["pemicu"], ["prakira"], ["label"]):
        import kunci_j4
        S = json.load(open(os.path.join(D, "j4_sidik.json"))) if os.path.exists(os.path.join(D, "j4_sidik.json")) else {}
        if not S.get("jangkar_commit"):
            print("belum dijangkar (j4_sidik.json): kejadian prospektif belum boleh diproses", file=sys.stderr); sys.exit(2)
        if c == ["pemicu"]:
            sys.exit(pemicu(dt.date.fromisoformat(S["jangkar_tanggal"])))
        g = kunci_j4.periksa()
        if g:
            print("kunci merah, berhenti:", g, file=sys.stderr); sys.exit(2)
        if c == ["prakira"]:
            ada = {r["tanggal"] for r in baca_jsonl(f("j4_prediksi.jsonl"))} | keluar_set(); kode = 0
            todo = sorted({r["tanggal"] for r in baca_jsonl(f("j4_kejadian.jsonl")) if r["status"] == "terpilih"} - ada)
            for t in ([str(tgl)] if tgl else todo):
                kode = max(kode, 0 if (k := prakira(dt.date.fromisoformat(t), kunci_j4.sidik())) == 3 else k)
            sys.exit(kode)
        kode = 0
        for t in ([str(tgl)] if tgl else sorted({r["tanggal"] for r in baca_jsonl(f("j4_prediksi.jsonl"))} - keluar_set())):
            kode = max(kode, 0 if (k := label(dt.date.fromisoformat(t))) == 3 else k)
        sys.exit(kode)
    elif c == ["nilai"]:
        sys.exit(nilai("--pratinjau" in a))
    else:
        sys.exit(__doc__)
