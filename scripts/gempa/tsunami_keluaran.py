"""TS-12: kuantisasi, format keluaran, anggaran ukuran, dan indeks genangan tsunami.

BUKAN peringatan, BUKAN prakiraan: simulasi berlabel hipotesis; status tsunami resmi hanya BMKG/PTWC.
Modul ini stdlib saat diimpor. numpy hanya dipakai `contoh` untuk membaca fgmax.npz (peluncur ulang ke venv lab).
Tidak mengubah tsunami_hitung/tsunami_sumber (disidik kriteria uji balik); hanya membaca keluarannya.

FORMAT per kotak dan skenario, di <akar>/<kotak>/ :
  <skenario>.json     meta (label, mesin, hash masukan, manning 0, dem, atribusi, raster, legenda, angka ringkas, run-up hitung)
  <skenario>_d.png    kedalaman maksimum, PNG skala-abu 8 bit, satu byte per sel (kode di bawah)
  <skenario>_t.png    waktu tiba pertama, PNG skala-abu 8 bit, satu byte per sel
Baris raster dari utara ke selatan, kolom dari barat ke timur; sel = titik tengah fgmax, lebar dx derajat.
Kode kedalaman: 0 kering pada simulasi (termasuk di bawah 0,05 m, digabung SENGAJA); 1..159 kelas lebar 0,05 m
  (k = floor(d/0,05), dekode = [k*0,05; (k+1)*0,05)); 254 = 8 m atau lebih (nilai asli di meta d_maks_m);
  253 = laut (bukan genangan); 255 = belum dihitung (tak ada sel fgmax atau dasar tak terbaca). 255 TIDAK PERNAH sama dengan 0.
Kode waktu tiba: 0 = tidak tiba pada simulasi; 1..250 = menit ke (k-1) sampai k-1+1 (k = 1 + floor(detik/60), dipotong 250); 255 = belum dihitung.
  Bila fgmax baru mulai mencatat pada tstart > 0, tiba di sekitar tstart hanya batas bawah (artefak pencatatan); ditulis di meta.

Pakai: python3 -I scripts/gempa/tsunami_keluaran.py uji | indeks | contoh [run] [kotak] [nama]
"""
import json, math, os, re, struct, sys, time, zlib

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tsunami_medan as _medan  # stdlib saat diimpor: KOTAK dan LISENSI

PUBLIK = os.path.join(AKAR, "public/gempa/data/tsunami_genangan")
UJI_KELUAR = os.path.join(AKAR, "data/raw/tsunami/keluaran_uji")
RUN = os.path.join(AKAR, "data/raw/tsunami/run")
VENV_PY = os.path.join(AKAR, "data/raw/tsunami/venv/bin/python")

SKEMA = 1
LANGKAH_D = 0.05            # m, lebar kelas kedalaman (K5, ALGORITMA 5)
BATAS_D = 8.0               # m; sama atau lebih = kode 254
K_KERING, K_LEBIH, K_LAUT, K_NODATA = 0, 254, 253, 255
T_MAKS = 250
AMBANG_LUAS_M = LANGKAH_D   # sel dihitung tergenang bila d_maks >= kelas pertama; di bawahnya = "kering pada simulasi"
R_BUMI_M = 6371008.8
DEM_IZIN = {"demnas": "BIG (DEMNAS)", "glo30": "Copernicus GLO-30"}   # K4: FABDEM tidak untuk layar publik
STATUS_IZIN = {"hipotesis"}  # naik ke "teruji pada n kejadian" hanya lewat tsunami_ujibalik.json, bukan di sini
TINGKAT_IZIN = {"A", "B"}
BATAS_MESIN = [
    "tanpa gesekan dasar (manning 0, K10 dan K12): genangan dan run-up cenderung lebih jauh dan lebih tinggi dari kenyataan",
    "BP04 tak pecah tanpa gesekan +12,2% lawan lab (batas mesin, bukan lulus 5%, bukan tervalidasi NOAA)",
    "DSM: atap dan kanopi ikut tinggi, genangan di bawah kanopi cenderung tersempitkan",
    "hanya awal gelombang yang dihitung: maksimum kedalaman dan luas belum tentu final",
    "simulasi bukan peringatan; status tsunami resmi hanya BMKG dan PTWC",
]

# Anggaran (Q5, Q12). tebakan berpagar 100 KB per skenario; ts11_g3 (900 x 600 sel) hanya 14,9 KB; kaji ulang di TS-13. Lewat anggaran = gagal keras.
ANGGARAN_SKENARIO_B = 100 * 1024       # json + _d.png + _t.png untuk satu skenario di satu kotak
ANGGARAN_PUSTAKA_B = 2560 * 1024   # folder tsunami_genangan: 9 set (K6) x (100 KB + animasi 120 KB) = 1,98 MB, dibulatkan
ANGGARAN_INDEKS_B = 32 * 1024
ANIMASI_BINGKAI_MAKS = 24              # Q12: rekaman muka air kasar, selang tetap
ANIMASI_B_MAKS = 120 * 1024            # total semua bingkai satu skenario di satu kotak
MASUK_ANGGARAN = ("skenario", "pustaka", "indeks", "animasi")


class AnggaranLewat(Exception):
    pass


class KeluaranSalah(Exception):
    pass


# ---------- kuantisasi ----------
def kuant_d(d, laut=False):
    if laut:
        return K_LAUT
    if d is None or d != d:
        return K_KERING  # NaN dari fgmax = sel darat tak pernah basah; sel tak terbaca ditangani pemanggil (255)
    if d >= BATAS_D:
        return K_LEBIH
    k = int(d / LANGKAH_D + 1e-9)
    return k if k >= 1 else K_KERING


def dekode_d(k):
    """(bawah, atas) meter; atas None = terbuka; teks untuk kode khusus."""
    if k == K_KERING:
        return "kering"
    if k == K_LAUT:
        return "laut"
    if k == K_NODATA:
        return "belum dihitung"
    if k == K_LEBIH:
        return (BATAS_D, None)
    return (k * LANGKAH_D, (k + 1) * LANGKAH_D)


def kuant_t(detik):
    if detik is None or detik != detik or detik <= 0:
        return 0
    return min(T_MAKS, 1 + int(detik // 60))


def dekode_t(k):
    """(menit_bawah, menit_atas) atau teks; kode 250 = 249 menit atau lebih (terpotong)."""
    if k == 0:
        return "tidak tiba"
    if k == K_NODATA:
        return "belum dihitung"
    return (k - 1, None if k == T_MAKS else k)


# ---------- PNG skala-abu stdlib ----------
def _chunk(tipe, isi):
    return struct.pack(">I", len(isi)) + tipe + isi + struct.pack(">I", zlib.crc32(tipe + isi) & 0xFFFFFFFF)


def png_tulis(w, h, data):
    assert len(data) == w * h
    terbaik = None
    for filt in (0, 2):  # 0 tanpa, 2 Up; ambil yang lebih kecil
        baris = []
        for r in range(h):
            row = data[r * w:(r + 1) * w]
            if filt == 2 and r > 0:
                prev = data[(r - 1) * w:r * w]
                row = bytes((a - b) & 255 for a, b in zip(row, prev))
            baris.append(bytes([filt]) + row)
        z = zlib.compress(b"".join(baris), 9)
        if terbaik is None or len(z) < len(terbaik):
            terbaik = z
    return (b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
            + _chunk(b"IDAT", terbaik) + _chunk(b"IEND", b""))


def png_baca(b):
    assert b[:8] == b"\x89PNG\r\n\x1a\n"
    w, h = struct.unpack(">II", b[16:24])
    assert b[24:29] == bytes([8, 0, 0, 0, 0])
    i, idat = 8, b""
    while i < len(b):
        n = struct.unpack(">I", b[i:i + 4])[0]
        if b[i + 4:i + 8] == b"IDAT":
            idat += b[i + 8:i + 8 + n]
        i += 12 + n
    raw = zlib.decompress(idat)
    out, prev = bytearray(), bytes(w)
    for r in range(h):
        filt, row = raw[r * (w + 1)], raw[r * (w + 1) + 1:(r + 1) * (w + 1)]
        if filt == 2:
            row = bytes((a + p) & 255 for a, p in zip(row, prev))
        elif filt != 0:
            raise KeluaranSalah("filter PNG %d tidak dikenal" % filt)
        out += row
        prev = row
    return w, h, bytes(out)


# ---------- raster dari larik fgmax ----------
def bangun_raster(X, Y, B, H, T, dx, muka_laut=0.0, dry_tol=1e-3):
    """X,Y,B,H,T: urutan sejajar (daftar atau larik numpy yang sudah .tolist()). H NaN = sel tak pernah basah."""
    xmin, ymax = min(X), max(Y)
    ix = [int(round((x - xmin) / dx)) for x in X]
    iy = [int(round((ymax - y) / dx)) for y in Y]
    nx, ny = max(ix) + 1, max(iy) + 1
    d = bytearray([K_NODATA]) * (nx * ny)
    t = bytearray([K_NODATA]) * (nx * ny)
    luas_g = luas_darat = 0.0
    dmaks, ru, tiba = None, None, None
    n_darat = n_basah_darat = n_tergenang = n_luar = 0
    for i in range(len(X)):
        b, h, tb = B[i], H[i], T[i]
        pos = iy[i] * nx + ix[i]
        if d[pos] != K_NODATA:
            raise KeluaranSalah("sel fgmax ganda di baris %d kolom %d" % (iy[i], ix[i]))
        if b != b:  # dasar tak terbaca: belum dihitung, bukan 0
            n_luar += 1
            continue
        basah = h == h and h > dry_tol
        if basah and tb == tb and tb > 0 and (tiba is None or tb < tiba):
            tiba = tb
        t[pos] = kuant_t(tb if basah else None)
        if b <= muka_laut:
            d[pos] = K_LAUT
            continue
        n_darat += 1
        lat = Y[i]
        luas = (R_BUMI_M ** 2) * math.radians(dx) * (math.sin(math.radians(lat + dx / 2)) - math.sin(math.radians(lat - dx / 2)))
        luas_darat += luas
        dd = h if basah else 0.0
        d[pos] = kuant_d(dd)
        if basah:
            n_basah_darat += 1
            if dmaks is None or h > dmaks:
                dmaks = h
            if ru is None or (b, h) > (B[ru], H[ru]):
                ru = i
            if h >= AMBANG_LUAS_M - 1e-9:
                luas_g += luas
                n_tergenang += 1
    km2 = 1e-6
    return {
        "nx": nx, "ny": ny, "x_barat": xmin - dx / 2, "y_utara": ymax + dx / 2, "dx": dx,
        "d": bytes(d), "t": bytes(t),
        "angka": {
            "luas_tergenang_km2": round(luas_g * km2, 4) if n_darat else None,
            "luas_darat_kotak_km2": round(luas_darat * km2, 4) if n_darat else None,
            "persen_tergenang": round(100 * luas_g / luas_darat, 3) if luas_darat else None,
            "d_maks_m": round(dmaks, 3) if dmaks is not None else None,
            "tiba_pertama_s": round(tiba, 1) if tiba is not None else None,
            "sel_darat": n_darat, "sel_darat_basah_dry_tol": n_basah_darat, "sel_tergenang_ambang": n_tergenang, "sel_tanpa_dasar": n_luar,
        },
        "runup_hitung": [{"lat": round(Y[ru], 5), "lon": round(X[ru], 5), "m": round(B[ru] + H[ru], 2)}] if ru is not None else [],
    }


# ---------- penulisan, label, anggaran ----------
def _aman_teks(o):
    s = json.dumps(o, ensure_ascii=False).lower()
    if re.search(r"\baman\b", s):
        raise KeluaranSalah("kata 'aman' tidak boleh ada di keluaran")


def periksa_meta(m):
    lb = m.get("label") or {}
    if lb.get("tingkat") not in TINGKAT_IZIN or lb.get("status") not in STATUS_IZIN or not lb.get("catatan_batas"):
        raise KeluaranSalah("label tingkat/status/catatan_batas wajib dan sah")
    if m.get("dem") not in DEM_IZIN:
        raise KeluaranSalah("dem %r di luar daftar izin %s" % (m.get("dem"), sorted(DEM_IZIN)))
    if m.get("manning") != 0:
        raise KeluaranSalah("manning harus 0 (K12)")
    if not m.get("mesin") or not re.fullmatch(r"[0-9a-f]{64}", m.get("hash_masukan", "")):
        raise KeluaranSalah("mesin dan hash_masukan (sha256) wajib")
    if not m.get("dem_atribusi") or not m.get("batas_mesin"):
        raise KeluaranSalah("dem_atribusi dan batas_mesin wajib")
    _aman_teks(m)


def ukuran_pustaka(akar):
    n = 0
    for d, _, fs in os.walk(akar):
        n += sum(os.path.getsize(os.path.join(d, f)) for f in fs)
    return n


def periksa_animasi(bingkai):
    """bingkai: daftar bytes (satu PNG tiap bingkai). Lewat anggaran = gagal."""
    if len(bingkai) > ANIMASI_BINGKAI_MAKS:
        raise AnggaranLewat("animasi %d bingkai > %d" % (len(bingkai), ANIMASI_BINGKAI_MAKS))
    if sum(map(len, bingkai)) > ANIMASI_B_MAKS:
        raise AnggaranLewat("animasi %d B > %d B" % (sum(map(len, bingkai)), ANIMASI_B_MAKS))


def periksa_animasi_meta(an):
    """meta['animasi'] bukan None: {'n_bingkai': int, 'ukuran_b': int}; diperiksa lawan anggaran Q12."""
    if not isinstance(an, dict) or not isinstance(an.get("n_bingkai"), int) or not isinstance(an.get("ukuran_b"), int):
        raise KeluaranSalah("meta.animasi harus berisi n_bingkai dan ukuran_b (bilangan bulat)")
    if an["n_bingkai"] > ANIMASI_BINGKAI_MAKS or an["ukuran_b"] > ANIMASI_B_MAKS:
        raise AnggaranLewat("animasi %d bingkai / %d B melewati anggaran" % (an["n_bingkai"], an["ukuran_b"]))


def tulis_skenario(akar, kotak, nama, rast, meta, pustaka=False):
    """Tulis tiga berkas; periksa label dan anggaran SEBELUM dan SESUDAH menulis (berkas gagal dihapus)."""
    publik = os.path.abspath(akar).startswith(os.path.join(AKAR, "public"))
    if publik and not pustaka:
        raise KeluaranSalah("skenario uji ongkos tidak boleh ditulis ke public/")
    if not re.fullmatch(r"[a-z0-9_]+", kotak) or not re.fullmatch(r"[A-Za-z0-9_]+", nama):
        raise KeluaranSalah("nama kotak/skenario tidak sah")
    meta = dict(meta)
    meta["raster"] = {"nx": rast["nx"], "ny": rast["ny"], "x_barat": round(rast["x_barat"], 6), "y_utara": round(rast["y_utara"], 6),
                      "dx_derajat": round(rast["dx"], 7), "baris": "utara ke selatan", "kolom": "barat ke timur",
                      "berkas_d": nama + "_d.png", "berkas_t": nama + "_t.png"}
    meta["kuantisasi"] = {"langkah_d_m": LANGKAH_D, "batas_d_m": BATAS_D, "kode_kering": K_KERING, "kode_lebih": K_LEBIH, "kode_laut": K_LAUT,
                          "kode_belum_dihitung": K_NODATA, "catatan": "kedalaman di bawah %.2f m digabung ke kering; 255 = belum dihitung, bukan nol; "
                          "waktu tiba: kode 0 tidak tiba, k = 1 + menit penuh, dipotong %d" % (LANGKAH_D, T_MAKS)}
    meta["ambang_luas_m"] = AMBANG_LUAS_M
    meta["skema"] = SKEMA
    meta["animasi"] = meta.get("animasi")  # None = belum dibuat; jangan diisi nol bingkai palsu
    periksa_meta(meta)
    if meta["animasi"] is not None:
        periksa_animasi_meta(meta["animasi"])
    if meta.get("uji_ongkos") and (pustaka or publik):
        raise KeluaranSalah("uji_ongkos tidak boleh masuk pustaka atau public/")
    bd, bt = png_tulis(rast["nx"], rast["ny"], rast["d"]), png_tulis(rast["nx"], rast["ny"], rast["t"])
    bj = json.dumps(meta, ensure_ascii=False, indent=1).encode()
    total = len(bd) + len(bt) + len(bj)
    if total > ANGGARAN_SKENARIO_B:
        raise AnggaranLewat("skenario %s/%s %d B > anggaran %d B" % (kotak, nama, total, ANGGARAN_SKENARIO_B))
    folder = os.path.join(akar, kotak)
    os.makedirs(folder, exist_ok=True)
    for ext, isi in (("_d.png", bd), ("_t.png", bt), (".json", bj)):
        open(os.path.join(folder, nama + ext), "wb").write(isi)
    if pustaka and ukuran_pustaka(akar) > ANGGARAN_PUSTAKA_B:
        for ext in ("_d.png", "_t.png", ".json"):
            os.remove(os.path.join(folder, nama + ext))
        raise AnggaranLewat("pustaka melewati %d B" % ANGGARAN_PUSTAKA_B)
    return {"d_png": len(bd), "t_png": len(bt), "json": len(bj), "total": total}


def bangun_indeks(akar=PUBLIK):
    """Daftar kotak (tiga K6) dan skenario yang ADA di disk. Kotak tanpa skenario = 'belum dihitung'."""
    skenario, per_kotak, dem_k = {}, {k: [] for k in _medan.KOTAK}, {}
    for k in _medan.KOTAK:
        folder = os.path.join(akar, k)
        for f in sorted(os.listdir(folder)) if os.path.isdir(folder) else []:
            if f.endswith(".json"):
                m = json.load(open(os.path.join(folder, f)))
                n = f[:-5]
                per_kotak[k].append(n)
                dem_k.setdefault(k, m.get("dem"))  # dari meta skenario pertama; tanpa skenario = null (K4: DEMNAS utama, GLO-30 cadangan)
                s = skenario.setdefault(n, {"nama": m.get("nama", n), "m": m.get("m"), "jenis": m.get("jenis"), "pusat": m.get("pusat"), "pantai": []})
                s["pantai"].append(k)
    ind = {
        "dibuat": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "versi_model": "genangan-1", "skema": SKEMA, "status": "hipotesis",
        "catatan": "simulasi, bukan peringatan; status tsunami resmi hanya BMKG dan PTWC",
        "dem_diizinkan": sorted(DEM_IZIN),
        "atribusi": {"glo30": _medan.LISENSI["glo30"]["atribusi"], "gebco": _medan.LISENSI["gebco"]["atribusi"], "demnas": "BIG (DEMNAS)"},
        "anggaran": {"skenario_byte": ANGGARAN_SKENARIO_B, "pustaka_byte": ANGGARAN_PUSTAKA_B, "animasi_bingkai": ANIMASI_BINGKAI_MAKS, "animasi_byte": ANIMASI_B_MAKS},
        "batas_mesin": BATAS_MESIN,
        "pantai": {k: {"nama": v["nama"], "kotak": v["kotak"], "dem": dem_k.get(k), "dem_atribusi": DEM_IZIN.get(dem_k.get(k)), "resolusi_m": 30 if dem_k.get(k) else None,
                       "status": "hipotesis" if per_kotak[k] else "belum dihitung", "skenario": per_kotak[k]}
                   for k, v in _medan.KOTAK.items()},
        "skenario": skenario,
    }
    _aman_teks(ind)
    return ind


def tulis_indeks(akar=PUBLIK):
    ind = bangun_indeks(akar)
    b = json.dumps(ind, ensure_ascii=False, indent=1).encode()
    if len(b) > ANGGARAN_INDEKS_B:
        raise AnggaranLewat("indeks %d B > %d B" % (len(b), ANGGARAN_INDEKS_B))
    os.makedirs(akar, exist_ok=True)
    open(os.path.join(akar, "indeks.json"), "wb").write(b)
    return len(b)


# ---------- contoh dari run TS-11 ----------
def dari_run(nama_run, kotak, nama_out, akar=UJI_KELUAR):
    d = os.path.join(RUN, nama_run)
    try:
        import numpy as np
    except ImportError:
        os.execv(VENV_PY, [VENV_PY, "-I", os.path.abspath(__file__), "contoh", nama_run, kotak, nama_out])
    kel, spec = json.load(open(d + "/keluaran.json")), json.load(open(d + "/spec.json"))
    z = np.load(d + "/fgmax.npz")
    F = spec["fgmax"]
    r = bangun_raster(z["X"].tolist(), z["Y"].tolist(), z["B"].tolist(), z["h_maks"].tolist(), z["tiba_s"].tolist(),
                      F["dx"], spec["muka_laut"], spec["dry_tol"])
    src = spec.get("sumber", {})
    tstart = F.get("tstart", 0.0)
    meta = {
        "nama": "skenario uji ongkos %s (sintetis, bukan pustaka)" % nama_run, "kotak": kotak,
        "uji_ongkos": True, "m": src.get("m"), "jenis": src.get("jenis"), "pusat": [src.get("lat"), src.get("lon")],
        "tingkat": "B", "label": {"tingkat": "B", "status": "hipotesis",
                                  "catatan_batas": "skenario sintetis untuk mengukur ongkos hitung; tanpa gesekan; hanya %d detik pertama" % spec["tfinal"]},
        "dem": "glo30", "dem_atribusi": _medan.LISENSI["glo30"]["atribusi"], "dem_cadangan_dsm": "GLO-30 adalah DSM (atap dan kanopi ikut)",
        "gebco_atribusi": _medan.LISENSI["gebco"]["atribusi"],
        "mesin": kel["mesin"], "hash_masukan": kel["hash_masukan"], "manning": spec["manning"],
        "batas_mesin": BATAS_MESIN, "tfinal_s": spec["tfinal"], "res_detik": spec.get("res_detik"),
        "ambang_tiba_m": F.get("arrival_tol", 1e-2), "tstart_fgmax_s": tstart,
        "tiba_catatan": ("fgmax mulai mencatat pada t = %g s; tiba sekitar nilai itu hanya batas bawah" % tstart) if tstart > 0 else None,
        "sumber": {"rupture": spec.get("sumber_rupture")},
        "waktu_hitung_s": kel.get("waktu_detik"),
        "runup_hitung": r["runup_hitung"], **r["angka"],
        "animasi": None, "animasi_catatan": "belum dibuat: hitungan TS-11 tanpa fgout; anggaran tertulis di indeks (maks %d bingkai, %d B)" % (ANIMASI_BINGKAI_MAKS, ANIMASI_B_MAKS),
    }
    return tulis_skenario(akar, kotak, nama_out, r, meta)


# ---------- uji ----------
def uji():
    import tempfile
    # kuantisasi bolak-balik: kelas memuat nilai asli, galat < satu langkah
    for d in (0.0, 0.049, 0.05, 0.12, 1.0, 3.333, 7.99, 7.9999):
        k = kuant_d(d)
        if d < LANGKAH_D:
            assert k == K_KERING, d
        else:
            lo, hi = dekode_d(k)
            assert lo - 1e-9 <= d < hi + 1e-9, (d, k, lo, hi)
    assert kuant_d(8.0) == kuant_d(55.0) == K_LEBIH and dekode_d(K_LEBIH) == (8.0, None)
    assert kuant_d(2.0, laut=True) == K_LAUT
    assert K_NODATA != K_KERING and dekode_d(K_NODATA) == "belum dihitung"
    assert kuant_t(None) == 0 and kuant_t(float("nan")) == 0 and kuant_t(0) == 0
    assert kuant_t(30) == 1 and kuant_t(60) == 2 and kuant_t(1e9) == T_MAKS
    for dt in (1, 59.9, 60, 61, 3599, 7200, 1e9):
        lo, hi = dekode_t(kuant_t(dt))
        assert lo * 60 <= dt and (hi is None or dt < hi * 60), dt
    assert dekode_t(0) == "tidak tiba" and dekode_t(K_NODATA) == "belum dihitung"
    # PNG bolak-balik
    isi = bytes((i * 7 + i // 5) % 256 for i in range(13 * 9))
    assert png_baca(png_tulis(13, 9, isi)) == (13, 9, isi)
    # raster sintetis 4 x 3: satu sel NaN-dasar harus 255, sel kering darat 0, laut 253
    dx, nan = 0.01, float("nan")
    X, Y, B, H, T = [], [], [], [], []
    for r in range(3):
        for c in range(4):
            X.append(100 + c * dx); Y.append(-8 - r * dx)
            B.append(-5.0 if c == 0 else 2.0 + c); H.append(nan); T.append(nan)
    H[5] = 1.23; T[5] = 400.0     # r1 c1 basah
    H[6] = 9.5; T[6] = 700.0      # r1 c2 lebih dari 8 m
    H[7] = 0.02; T[7] = 900.0     # r1 c3 basah tipis, di bawah kelas 0,05
    B[11] = nan                   # r2 c3 dasar tak terbaca
    r = bangun_raster(X, Y, B, H, T, dx)
    assert (r["nx"], r["ny"]) == (4, 3) and abs(r["x_barat"] - (100 - dx / 2)) < 1e-12 and abs(r["y_utara"] - (-8 + dx / 2)) < 1e-12
    d, t = r["d"], r["t"]
    assert d[0] == K_LAUT and d[4] == K_LAUT and d[1] == K_KERING and d[5] == kuant_d(1.23) and d[6] == K_LEBIH
    assert d[7] == K_KERING and d[11] == K_NODATA and t[11] == K_NODATA and t[1] == 0
    assert t[5] == 1 + 400 // 60 and r["angka"]["sel_darat_basah_dry_tol"] == 3 and r["angka"]["sel_tergenang_ambang"] == 2 and r["angka"]["sel_tanpa_dasar"] == 1
    assert r["angka"]["d_maks_m"] == 9.5 and r["runup_hitung"][0]["m"] == round(5.0 + 0.02, 2)
    assert 0 < r["angka"]["luas_tergenang_km2"] < r["angka"]["luas_darat_kotak_km2"]
    # semua sel tak berdasar -> angka None, bukan 0
    r0 = bangun_raster(X[:2], Y[:2], [nan, nan], [nan, nan], [nan, nan], dx)
    assert r0["angka"]["luas_tergenang_km2"] is None and set(r0["d"]) == {K_NODATA}
    # label, dem, manning, anggaran
    meta = {"nama": "uji", "m": 8, "jenis": "subduksi", "pusat": [0, 0], "label": {"tingkat": "B", "status": "hipotesis", "catatan_batas": "uji"},
            "dem": "glo30", "dem_atribusi": "x", "mesin": "geoclaw-5.14.0", "hash_masukan": "a" * 64, "manning": 0, "batas_mesin": ["x"]}
    with tempfile.TemporaryDirectory() as tmp:
        u = tulis_skenario(tmp, "ujung_kulon", "s1", r, meta)
        assert u["total"] <= ANGGARAN_SKENARIO_B and os.path.exists(tmp + "/ujung_kulon/s1.json")
        m = json.load(open(tmp + "/ujung_kulon/s1.json"))
        assert m["label"]["status"] == "hipotesis" and m["manning"] == 0 and m["animasi"] is None
        w, h, dat = png_baca(open(tmp + "/ujung_kulon/s1_d.png", "rb").read())
        assert (w, h, dat) == (4, 3, r["d"])
        for salah, kunci in (({"label": {}}, "label"), ({"dem": "fabdem"}, "dem"), ({"manning": 0.025}, "manning"),
                             ({"hash_masukan": "x"}, "hash"), ({"batas_mesin": ["ini aman"]}, "aman")):
            try:
                tulis_skenario(tmp, "ujung_kulon", "s2", r, {**meta, **salah})
            except KeluaranSalah:
                pass
            else:
                raise AssertionError("harus ditolak: " + kunci)
        assert not os.path.exists(tmp + "/ujung_kulon/s2.json")
        besar = {"nx": 1000, "ny": 1000, "x_barat": 0, "y_utara": 0, "dx": 0.001,
                 "d": __import__("random").Random(1).randbytes(10 ** 6), "t": bytes(10 ** 6)}
        try:
            tulis_skenario(tmp, "ujung_kulon", "besar", besar, meta)
        except AnggaranLewat:
            assert not os.path.exists(tmp + "/ujung_kulon/besar.json")
        else:
            raise AssertionError("anggaran harus ditegakkan")
        try:
            periksa_animasi([b"x"] * (ANIMASI_BINGKAI_MAKS + 1))
        except AnggaranLewat:
            pass
        else:
            raise AssertionError("anggaran animasi")
        periksa_animasi([b"x" * 1000] * ANIMASI_BINGKAI_MAKS)
        for an in ({"n_bingkai": 99, "ukuran_b": 1}, {"n_bingkai": 3, "ukuran_b": 10 ** 9}):
            try:
                tulis_skenario(tmp, "ujung_kulon", "s4", r, {**meta, "animasi": an})
            except AnggaranLewat:
                pass
            else:
                raise AssertionError("animasi lewat anggaran harus ditolak")
        tulis_skenario(tmp, "ujung_kulon", "s5", r, {**meta, "animasi": {"n_bingkai": 3, "ukuran_b": 1000}})
        for ak, kw in ((tmp, {"pustaka": True}), (os.path.join(AKAR, "public/gempa/data/tsunami_genangan_uji"), {})):
            try:
                tulis_skenario(ak, "ujung_kulon", "s6", r, {**meta, "uji_ongkos": True}, **kw)
            except KeluaranSalah:
                pass
            else:
                raise AssertionError("uji_ongkos harus ditolak")
        assert not os.path.exists(tmp + "/ujung_kulon/s6.json")
        # skenario uji ongkos tidak boleh ke public
        try:
            tulis_skenario(os.path.join(AKAR, "public/gempa/data/tsunami_genangan_uji"), "ujung_kulon", "s3", r, meta)
        except KeluaranSalah:
            pass
        else:
            raise AssertionError("public tanpa pustaka harus ditolak")
        # indeks: tanpa skenario = belum dihitung; dengan skenario = hipotesis
        ind0 = bangun_indeks(tmp + "/kosong")
        assert set(ind0["pantai"]) == set(_medan.KOTAK) and len(ind0["pantai"]) == 3
        assert all(p["status"] == "belum dihitung" and p["skenario"] == [] for p in ind0["pantai"].values()) and ind0["skenario"] == {}
        ind1 = bangun_indeks(tmp)
        assert ind0["pantai"]["ujung_kulon"]["dem"] is None and ind1["pantai"]["ujung_kulon"]["dem"] == "glo30"
        assert ind1["pantai"]["ujung_kulon"]["status"] == "hipotesis" and ind1["pantai"]["pangandaran_cilacap"]["status"] == "belum dihitung"
        assert "s1" in ind1["skenario"] and tulis_indeks(tmp) <= ANGGARAN_INDEKS_B
    print("tsunami_keluaran uji: OK")


if __name__ == "__main__":
    a = sys.argv[1:] or ["uji"]
    if a[0] == "uji":
        uji()
    elif a[0] == "indeks":
        print("indeks.json", tulis_indeks(), "B")
    elif a[0] == "contoh":
        print(json.dumps(dari_run(*(a[1:] or ["ts11_g3", "banyuwangi_rajegwesi", "ts11_g3"])), indent=1))
    else:
        sys.exit("pakai: uji | indeks | contoh [run] [kotak] [nama]")
