"""Lapisan paparan bangunan: Google Open Buildings v3 (poligon, CC BY 4.0) -> grid 0,01 derajat + hitungan per kecamatan.

Dipakai empat bencana (karhutla, banjir/rob, gempa, gunung api) lewat scripts/umum/paparan_bangunan.py.
Kerja manual/bulanan, BUKAN harian. Keluaran TERKUNCI (login saja), bukan public/:
  data/terkunci/bangunan/grid_<prov>.json   {dibuat, prov, lat0, lon0, step, cells:[[i,j,n,luas_m2],...]}
                                             lat = lat0 + i*step, lon = lon0 + j*step (pojok barat-daya sel)
  data/terkunci/bangunan/kec.json           {dibuat, ringkasan, prov, kab, kec:{"prov|kab|kec":[n,luas_m2]}}
Mentah (gunakan GCS publik, cache, dilanjutkan bila putus): data/raw/bangunan/ (gitignored lewat data/raw/*)
  data/raw/bangunan/hasil/<level>_<token>.json = hasil per ubin S2, supaya ulang jalan tidak mengurai CSV lagi.

Cara kerja: tiap baris CSV (latitude,longitude,area_in_meters,confidence,geometry,full_plus_code) diambil titik pusat dan luasnya;
geometri WKT tidak diurai. Titik dikumpulkan ke sel halus 0,001 derajat (~110 m) per ubin, lalu SEKALI per sel halus dicari
kecamatannya (scripts/data/wilayah.py: Wilayah.cari). Jadi kecamatan ditentukan oleh titik tengah sel 110 m, galat batas <= ~80 m;
batas kecamatan di repo sudah disederhanakan juga.

Pakai:
  python3 scripts/umum/bangunan.py --prov 62            # satu provinsi (ubin S2 yang menutupinya)
  python3 scripts/umum/bangunan.py --semua              # seluruh Indonesia (puluhan GB unduhan)
  python3 scripts/umum/bangunan.py --prov 62 --hapus-mentah   # buang CSV.gz setelah diurai (hemat disk)
  python3 scripts/umum/bangunan.py --uji                # self-check sintetis, tanpa jaringan
"""
import argparse, datetime as dt, glob, gzip, importlib.util, json, math, os, sys, tempfile, time, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(__file__), "../.."))
MENTAH = os.path.join(AKAR, "data/raw/bangunan")
HASIL = os.path.join(MENTAH, "hasil")
KELUAR = os.path.join(AKAR, "data/terkunci/bangunan")

BUCKET = "open-buildings-data"
AWALAN = {6: "v3/polygons_s2_level_6_gzip_no_header/", 4: "v3/polygons_s2_level_4_gzip/"}  # level 6 = ubin kecil, sedikit data negara tetangga
LEVEL = 6
# Google menyarankan 0,70 sebagai batas umum "bangunan" Open Buildings v3 (di bawahnya makin banyak positif palsu: bayangan, batu, atap seng datar).
# Naik = presisi naik tapi bangunan kecil/desa terlewat; turun = kebalikannya. Ubah di sini, lalu hapus data/raw/bangunan/hasil/.
AMBANG_KEYAKINAN = 0.70
STEP = 0.01          # derajat per sel grid keluaran (~1,1 km)
HALUS = 1000         # sel halus = 1/HALUS derajat (110 m); STEP*HALUS harus bulat
LAT0, LON0 = -12.0, 94.0
SUMBER = "Google Open Buildings v3 (Sirko dkk. 2021), https://sites.research.google/open-buildings/"
LISENSI = "CC BY 4.0: wajib mencantumkan 'Google Open Buildings v3' bila hasil turunan dipublikasikan"
OFFSET_PANTAI = (0.0015, -0.0015)  # bila sel halus jatuh di luar poligon (garis pantai disederhanakan), coba tetangga sebelum menyerah


# ---------------- S2: lat/lon -> token ubin (tanpa pustaka s2sphere) ----------------
_POS_KE_IJ = ((0, 1, 3, 2), (0, 2, 3, 1), (3, 2, 0, 1), (3, 1, 0, 2))
_POS_KE_ORI = (1, 0, 0, 3)


def token_s2(lat, lon, level):
    la, lo = math.radians(lat), math.radians(lon)
    x, y, z = math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)
    ax = (abs(x), abs(y), abs(z))
    f = ax.index(max(ax))
    f = f + 3 if (x, y, z)[f] < 0 else f
    u, v = (lambda: (y / x, z / x), lambda: (-x / y, z / y), lambda: (-x / z, -y / z),
            lambda: (z / x, y / x), lambda: (z / y, -x / y), lambda: (-y / z, -x / z))[f]()  # lambda: hanya sumbu terpilih yang dibagi
    def st(t):
        return 0.5 * math.sqrt(1 + 3 * t) if t >= 0 else 1 - 0.5 * math.sqrt(1 - 3 * t)
    n = 1 << level
    i, j = min(n - 1, int(st(u) * n)), min(n - 1, int(st(v) * n))
    ori, pos = f & 1, 0
    for k in range(level - 1, -1, -1):
        p = _POS_KE_IJ[ori].index((((i >> k) & 1) << 1) | ((j >> k) & 1))
        pos = (pos << 2) | p
        ori ^= _POS_KE_ORI[p]
    nilai = (((f << (2 * level)) | pos) << 1) | 1
    return "%0*x" % ((4 + 2 * level) // 4, nilai)


# ---------------- Wilayah (satu salinan; scripts/umum/wilayah.py belum lahir) ----------------
def _muat_wilayah():
    for rel in ("scripts/umum/wilayah.py", "scripts/data/wilayah.py"):
        p = os.path.join(AKAR, rel)
        if os.path.exists(p):
            s = importlib.util.spec_from_file_location("umum_wilayah_bangunan", p)
            m = importlib.util.module_from_spec(s)
            s.loader.exec_module(m)
            return m
    raise SystemExit("wilayah.py tidak ketemu")


def ubin_untuk(wil, provs, level):
    """Token ubin S2 yang menyentuh poligon kecamatan provinsi terpilih: semua simpul poligon + kisi 0,05 derajat di kotak tiap kecamatan."""
    tok = set()
    for kode in provs:
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")))["features"]:
            for r in wil._cincin(f["geometry"]):
                for lon, lat in r[::3] + r[-1:]:
                    tok.add(token_s2(lat, lon, level))
                xs, ys = [c[0] for c in r], [c[1] for c in r]
                for gx in range(int(min(xs) / .05), int(max(xs) / .05) + 2):
                    for gy in range(int(min(ys) / .05), int(max(ys) / .05) + 2):
                        tok.add(token_s2(gy * .05, gx * .05, level))
    return tok


# ---------------- unduh (dilanjutkan) ----------------
def daftar(level):
    """{token: ukuran_byte} ubin yang ADA di bucket (ubin kosong tidak dibuat Google); di-cache."""
    p = os.path.join(MENTAH, f"daftar_L{level}.json")
    if os.path.exists(p):
        return json.load(open(p))
    out, tok = {}, None
    while True:
        q = {"prefix": AWALAN[level], "maxResults": 1000, "fields": "nextPageToken,items(name,size)"}
        if tok:
            q["pageToken"] = tok
        d = json.load(urllib.request.urlopen(f"https://storage.googleapis.com/storage/v1/b/{BUCKET}/o?" + urllib.parse.urlencode(q), timeout=60))
        for it in d.get("items", []):
            out[os.path.basename(it["name"]).split("_")[0]] = int(it["size"])
        tok = d.get("nextPageToken")
        if not tok:
            break
    os.makedirs(MENTAH, exist_ok=True)
    json.dump(out, open(p, "w"))
    return out


def jalur_ubin(level, token):
    return os.path.join(MENTAH, f"L{level}_{token}_buildings.csv.gz")


def unduh(level, token, ukuran):
    """Unduh ubin ke cache; lewati bila lengkap, lanjutkan dari .part bila putus (Range). Ukuran dicek terhadap daftar bucket."""
    tujuan = jalur_ubin(level, token)
    if os.path.exists(tujuan) and os.path.getsize(tujuan) == ukuran:
        return tujuan
    os.makedirs(MENTAH, exist_ok=True)
    url = f"https://storage.googleapis.com/{BUCKET}/{AWALAN[level]}{token}_buildings.csv.gz"
    sebagian = tujuan + ".part"
    for percobaan in range(8):
        sudah = os.path.getsize(sebagian) if os.path.exists(sebagian) else 0
        if sudah == ukuran:
            break
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={"Range": f"bytes={sudah}-"} if sudah else {}), timeout=60)
            if sudah and r.status != 206:
                sudah = 0  # server mengabaikan Range: mulai ulang
            with open(sebagian, "ab" if sudah else "wb") as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
        except Exception as e:  # jaringan putus: coba lanjut dari byte terakhir
            print(f"  unduh {token} percobaan {percobaan + 1}: {e}", file=sys.stderr)
            time.sleep(min(60, 5 * (percobaan + 1)))
    if not os.path.exists(sebagian) or os.path.getsize(sebagian) != ukuran:
        raise SystemExit(f"ubin {token} tidak lengkap setelah 8 percobaan (butuh {ukuran} B); jalankan ulang untuk melanjutkan")
    os.replace(sebagian, tujuan)
    return tujuan


# ---------------- agregasi ----------------
def proses_baris(baris, cari, ambang=AMBANG_KEYAKINAN):
    """baris: iterator bytes 'lat,lon,luas,keyakinan,geometri,pluscode'. cari(lon, lat) -> (prov, kab, kec) | None.
    Kembalikan hasil sebagian JSON-able: baris, rendah (di bawah ambang), tak_terpetakan, kec{}, grid{prov:{"i,j":[n,luas]}}."""
    n_baris = rendah = 0
    cnt, luas = {}, {}
    for b in baris:
        p = b.split(b",", 4)
        if len(p) < 5:
            continue
        n_baris += 1
        if float(p[3]) < ambang:
            rendah += 1
            continue
        k = math.floor(float(p[0]) * HALUS) * 1000000 + math.floor(float(p[1]) * HALUS)
        cnt[k] = cnt.get(k, 0) + 1
        luas[k] = luas.get(k, 0.0) + float(p[2])
    kec, grid, tak = {}, {}, 0
    per = int(round(STEP * HALUS))
    for k, n in cnt.items():
        ki, kj = divmod(k, 1000000)
        lat, lon = (ki + .5) / HALUS, (kj + .5) / HALUS
        w = cari(lon, lat)
        if w is None:
            for dy in OFFSET_PANTAI:
                for dx in OFFSET_PANTAI:
                    w = w or cari(lon + dx, lat + dy)
        if w is None:
            tak += n
            continue
        a = luas[k]
        e = kec.setdefault("|".join(w), [0, 0.0])
        e[0] += n
        e[1] += a
        g = grid.setdefault(w[0], {}).setdefault("%d,%d" % (ki // per - round(LAT0 / STEP), kj // per - round(LON0 / STEP)), [0, 0.0])
        g[0] += n
        g[1] += a
    return {"baris": n_baris, "rendah": rendah, "tak_terpetakan": tak, "kec": kec, "grid": grid}


def proses_ubin(level, token, cari, hapus=False):
    p = os.path.join(HASIL, f"L{level}_{token}.json")
    if os.path.exists(p):
        h = json.load(open(p))
        if h.get("ambang") == AMBANG_KEYAKINAN:
            return h
    mulai = time.time()
    with gzip.open(jalur_ubin(level, token), "rb") as f:
        h = proses_baris(f, cari)
    h["ambang"], h["detik"] = AMBANG_KEYAKINAN, round(time.time() - mulai, 1)
    os.makedirs(HASIL, exist_ok=True)
    json.dump(h, open(p, "w"), separators=(",", ":"))
    if hapus:
        os.remove(jalur_ubin(level, token))
    return h


def gabung(hasil, provs=None):
    """hasil: daftar hasil sebagian. provs: kode yang disimpan (None = semua). -> (kec_doc, {prov: grid_doc})"""
    kec, grid = {}, {}
    baris = rendah = tak = 0
    for h in hasil:
        baris, rendah, tak = baris + h["baris"], rendah + h["rendah"], tak + h["tak_terpetakan"]
        for k, (n, a) in h["kec"].items():
            if provs and k.split("|")[0] not in provs:
                continue
            e = kec.setdefault(k, [0, 0.0])
            e[0] += n
            e[1] += a
        for pv, sel in h["grid"].items():
            if provs and pv not in provs:
                continue
            g = grid.setdefault(pv, {})
            for k, (n, a) in sel.items():
                e = g.setdefault(k, [0, 0.0])
                e[0] += n
                e[1] += a
    kab, prov = {}, {}
    for k, (n, a) in kec.items():
        pv, kb, _ = k.split("|")
        for d, kk in ((kab, f"{pv}|{kb}"), (prov, pv)):
            e = d.setdefault(kk, [0, 0])
            e[0] += n
            e[1] += round(a)
    kec = {k: [n, round(a)] for k, (n, a) in sorted(kec.items())}
    dibuat = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds")
    kdoc = {"dibuat": dibuat, "sumber": SUMBER, "lisensi": LISENSI, "ambang_keyakinan": AMBANG_KEYAKINAN,
            "ringkasan": {"bangunan": sum(v[0] for v in kec.values()), "luas_m2": sum(v[1] for v in kec.values()),
                          "baris_dibaca": baris, "dibuang_keyakinan_rendah": rendah, "di_luar_kecamatan": tak,
                          "provinsi": sorted(grid)},
            "prov": dict(sorted(prov.items())), "kab": dict(sorted(kab.items())), "kec": kec}
    gdoc = {}
    for pv, sel in grid.items():
        cells = []
        for k, (n, a) in sel.items():
            i, j = k.split(",")
            cells.append([int(i), int(j), n, round(a)])
        cells.sort()
        gdoc[pv] = {"dibuat": dibuat, "prov": pv, "lat0": LAT0, "lon0": LON0, "step": STEP, "kolom": ["i", "j", "n", "luas_m2"],
                    "sumber": SUMBER, "lisensi": LISENSI, "ambang_keyakinan": AMBANG_KEYAKINAN, "cells": cells}
    return kdoc, gdoc


def tulis(doc, jalur):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    s = json.dumps(doc, separators=(",", ":"), ensure_ascii=False)
    sementara = jalur + ".tmp"
    open(sementara, "w").write(s)
    os.replace(sementara, jalur)
    return len(s)


def simpan(kdoc, gdoc, keluar=KELUAR):
    n = {"kec.json": tulis(kdoc, os.path.join(keluar, "kec.json"))}
    for pv, d in gdoc.items():
        n[f"grid_{pv}.json"] = tulis(d, os.path.join(keluar, f"grid_{pv}.json"))
    return n


# ---------------- uji ----------------
def uji():
    # token S2: kasus yang diketahui (Jakarta level 4 = ubin besar yang ada di bucket; token level 6 diawali token level 4)
    for (la, lo) in ((-6.2, 106.8), (-2.2, 113.9), (-8.5, 140.4), (3.6, 98.7)):
        assert token_s2(la, lo, 6).startswith(token_s2(la, lo, 4)[:2]) and len(token_s2(la, lo, 6)) == 4 and len(token_s2(la, lo, 4)) == 3
    assert token_s2(-6.2, 106.8, 4) == token_s2(-6.25, 106.85, 4), "titik berdekatan harus satu ubin"
    kotak = lambda lon, lat: ("62", "Kab A", "Kec A") if 113.0 <= lon < 114.0 and -3.0 <= lat < -2.0 else (
        ("62", "Kab A", "Kec B") if 114.0 <= lon < 115.0 and -3.0 <= lat < -2.0 else None)
    baris = [b"-2.2051,113.2051,100.0,0.90,POLYGON((0 0)),x",     # Kec A, sel grid (i,j) sama dengan di bawah
             b"-2.2052,113.2052,50.5,0.71,POLYGON((0 0, 1 1)),x", # Kec A, sel halus sama; tepat di atas ambang
             b"-2.2051,113.2051,999.0,0.69,POLYGON((0 0)),x",     # DI BAWAH ambang 0,70 -> harus ditolak
             b"-2.2051,113.2051,999.0,0.5,POLYGON((0 0)),x",      # ditolak
             b"-2.2951,114.5051,30.0,0.80,POLYGON((0 0)),x",      # Kec B
             b"-5.0000,100.0000,40.0,0.95,POLYGON((0 0)),x",      # di luar semua kecamatan
             b"rusak"]                                             # baris pendek: dilewati
    h = proses_baris(baris, kotak)
    assert h["baris"] == 6 and h["rendah"] == 2 and h["tak_terpetakan"] == 1, h
    assert h["kec"]["62|Kab A|Kec A"] == [2, 150.5], h["kec"]
    assert h["kec"]["62|Kab A|Kec B"] == [1, 30.0], h["kec"]
    assert h["grid"]["62"]["%d,%d" % (round((-2.2051 - LAT0) / STEP - .5), round((113.2051 - LON0) / STEP - .5))] == [2, 150.5], h["grid"]
    # sel di atas ambang bila ambang diturunkan: bukti ambang benar-benar dipakai
    assert proses_baris(baris, kotak, ambang=0.5)["kec"]["62|Kab A|Kec A"][0] == 4
    kdoc, gdoc = gabung([h, h], provs={"62"})
    assert kdoc["kec"]["62|Kab A|Kec A"] == [4, 301] and kdoc["prov"]["62"] == [6, 361] and kdoc["ringkasan"]["bangunan"] == 6, kdoc
    assert list(kdoc)[0] == "dibuat" and list(gdoc["62"])[0] == "dibuat"
    assert gabung([h], provs={"11"})[0]["ringkasan"]["bangunan"] == 0, "provinsi tak dipilih harus dibuang"
    with tempfile.TemporaryDirectory() as d:
        simpan(kdoc, gdoc, d)
        g = json.load(open(os.path.join(d, "grid_62.json")))
        assert g["cells"][0][2] >= 1 and g["step"] == STEP and json.load(open(os.path.join(d, "kec.json")))["kec"]
    # Wilayah nyata: Palangka Raya harus di Kalteng
    w = _muat_wilayah().Wilayah()
    assert w.cari(113.92, -2.21)[0] == "62"
    print("ok")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--prov", help="kode provinsi dipisah koma, mis. 62,16")
    ap.add_argument("--semua", action="store_true")
    ap.add_argument("--level", type=int, default=LEVEL, choices=(4, 6))
    ap.add_argument("--hapus-mentah", action="store_true")
    ap.add_argument("--uji", action="store_true")
    a = ap.parse_args()
    if a.uji:
        return uji()
    wm = _muat_wilayah()
    provs = sorted(wm.PROVINSI) if a.semua else [p.strip() for p in (a.prov or "").split(",") if p.strip()]
    if not provs or any(p not in wm.PROVINSI for p in provs):
        raise SystemExit("beri --prov <kode,...> atau --semua")
    mulai = time.time()
    ada = daftar(a.level)
    butuh = sorted(t for t in ubin_untuk(wm, provs, a.level) if t in ada)
    gb = sum(ada[t] for t in butuh) / 1e9
    print(f"{len(butuh)} ubin level {a.level}, {gb:.1f} GB terkompresi untuk {len(provs)} provinsi", flush=True)
    w = wm.Wilayah()
    hasil = []
    for t in butuh:
        t0 = time.time()
        sudah = os.path.exists(os.path.join(HASIL, f"L{a.level}_{t}.json"))
        if not sudah:
            unduh(a.level, t, ada[t])
        t1 = time.time()
        h = proses_ubin(a.level, t, w.cari, a.hapus_mentah)
        hasil.append(h)
        print(f"  {t}: {ada[t] / 1e6:.0f} MB, unduh {t1 - t0:.0f} dtk, urai {time.time() - t1:.0f} dtk, {h['baris']:,} baris, "
              f"{sum(v[0] for v in h['kec'].values()):,} bangunan", flush=True)
    kdoc, gdoc = gabung(hasil, set(provs))
    n = simpan(kdoc, gdoc)
    print(json.dumps(kdoc["ringkasan"]), "\n", n, f"\nselesai {time.time() - mulai:.0f} dtk")


if __name__ == "__main__":
    main()
