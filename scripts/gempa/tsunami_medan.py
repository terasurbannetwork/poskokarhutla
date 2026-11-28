"""TS-05 + TS-06: kotak halus (domain genangan) dan medan darat-laut untuk simulasi tsunami.
TS-05 (daftar kotak, self-check dasar) memakai stdlib saja. TS-06 (grid gabungan GLO-30 + GEBCO) butuh numpy: jalankan dengan
venv lab `data/raw/tsunami/venv/bin/python -I scripts/gempa/tsunami_medan.py siapkan [kotak ...]`; tanpa numpy hanya self-check TS-05 yang jalan.
Kekasaran Manning belum ada (TS-07).

TS-06 (26 Nov 2026), masukan atas izin pemilik; DEMNAS TIDAK ada, jadi cadangan keputusan Q2/Q3/K4:
- Darat: Copernicus DEM GLO-30 (COG deflate + prediktor 3, 1 detik busur ~30 m, DSM, tinggi orto EGM2008).
- Laut: GEBCO_2020 15 detik busur (NetCDF3 dari ERDDAP NOAA), acuan muka laut rata-rata (MSL) menurut GEBCO.
- Gabung: kisi 1 detik busur selaras sampel GLO-30. Sel darat = GLO-30 > 0; selain itu = GEBCO bilinear (laut < 0).
  GLO-30 menulis laut = 0 dan ubin laut tidak ada, jadi "GLO-30 <= 0 atau tanpa ubin" dibaca laut. Sel yang GLO-30-nya laut tetapi
  GEBCO kasar (450 m) bilang darat (>= 0) = CELAH PANTAI: diisi rata-rata tetangga laut bernilai sah secara iteratif (dilatasi 4-tetangga),
  dijepit <= -0,1 m agar tetap air; hitungannya dicatat per kotak. Tidak ada celah yang diisi dengan nol.
BATAS TERTULIS: (1) GLO-30 = DSM, atap dan kanopi ikut tinggi, genangan cenderung TERSEMPITKAN (bias permukaan, belum dikuantifikasi);
(2) datum GLO-30 EGM2008 vs GEBCO MSL tidak dikoreksi, selisihnya tidak diukur di sini; (3) GEBCO 15 detik tidak melihat teluk/muara
kurang dari ~450 m, kedalaman dekat pantai kasar; (4) tahun acuan DEM ~2011-2015, bukan tahun kejadian.

Tiga kotak pertama menurut K6 (23 Nov 2026): Ujung Kulon, Pangandaran sampai Cilacap, Banyuwangi sampai Rajegwesi.
Format kotak = [lon_barat, lat_selatan, lon_timur, lat_utara], derajat. Batas dipilih agar memuat (a) garis pantai sasaran dan sisi darat sampai
sekitar 10 km ke pedalaman, (b) paparan laut dangkal sekitar 10-15 km ke arah laut, (c) titik run-up historis NCEI (tsunami_runup.json) di kawasan itu.
Batas ini keputusan rancangan awal, bukan hasil hitung genangan; dapat dipertajam saat DEM masuk (TS-06) tanpa mengubah nama kotak.
Kelas uji kejadian TIDAK ditentukan di sini (dikunci di TS-14). Menurut Q17 ketiga kotak ini belum punya kejadian uji kelas A.
Pantai di luar semua kotak = "belum dihitung", tidak pernah 0 atau aman.

Pakai:  python3 scripts/gempa/tsunami_medan.py uji
"""
import hashlib, json, math, os, re, struct, sys, zlib

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../public/gempa/data/")

KOTAK = {
    "ujung_kulon": {"nama": "Ujung Kulon (Banten)", "kotak": [104.95, -6.95, 105.75, -6.30],
                    "acuan": "Taman Nasional Ujung Kulon dan Pulau Panaitan, pantai barat Banten sampai Sumur; tsunami Selat Sunda 2018 (NCEI)"},
    "pangandaran_cilacap": {"nama": "Pangandaran sampai Cilacap", "kotak": [108.25, -7.95, 109.30, -7.35],
                            "acuan": "pantai selatan Jawa Barat bagian timur sampai Jawa Tengah bagian barat; Pangandaran 2006 (NCEI)"},
    "banyuwangi_rajegwesi": {"nama": "Banyuwangi sampai Rajegwesi", "kotak": [113.75, -8.90, 114.50, -8.40],
                             "acuan": "Teluk Rajegwesi, Pancer, Lampon, Grajagan; Banyuwangi 1994 (NCEI mengeja Rajekwesi)"},
}

# titik wajib di dalam kotak masing-masing (lat, lon); sumber: peta umum dan koordinat run-up NCEI
TITIK_ACUAN = {
    "ujung_kulon": [("Tanjung Layar", -6.78, 105.21), ("Pulau Panaitan", -6.60, 105.20), ("Sumur", -6.45, 105.65)],
    "pangandaran_cilacap": [("Pangandaran", -7.70, 108.65), ("Cilacap", -7.73, 109.00), ("Nusakambangan", -7.75, 109.10)],
    "banyuwangi_rajegwesi": [("Rajekwesi 1994", -8.5565, 113.9351667), ("Pancer", -8.589, 114.005), ("Grajagan", -8.73, 114.35)],
}


def luas_km2(k):
    lon0, lat0, lon1, lat1 = k
    return (lon1 - lon0) * (lat1 - lat0) * 111.19 ** 2 * math.cos(math.radians((lat0 + lat1) / 2))


def di_dalam(k, lat, lon):
    return k[0] <= lon <= k[2] and k[1] <= lat <= k[3]


def kotak_untuk(lat, lon):
    """Kunci kotak yang memuat titik, atau None (= 'belum dihitung', bukan 0)."""
    for kunci, v in KOTAK.items():
        if di_dalam(v["kotak"], lat, lon):
            return kunci
    return None


# ---------------------------------------------------------------- TS-06: medan darat-laut
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../data/raw/gempa/tsunami_medan/")
KELUAR = RAW + "keluaran/"
DETIK = 3600  # sampel GLO-30 per derajat
TAK_ADA = -32768.0

LISENSI = {
    "glo30": {
        "nama": "Copernicus DEM GLO-30 (COP-DEM_GLO-30, rilis 2021, COG dari AWS Open Data copernicus-dem-30m)",
        "atribusi": "Produced using Copernicus WorldDEM-30 (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018 "
                    "provided under COPERNICUS by the European Union and ESA; all rights reserved.",
        "lisensi": "GLO-30 Public tersedia gratis untuk publik umum menurut syarat Licence di "
                   "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM "
                   "(rujukan dari https://registry.opendata.aws/copernicus-dem/). Halaman Licence dinamis dan teks penuhnya BELUM dibaca di sini; "
                   "atribusi di atas diambil dari instruksi pemilik dan wajib dicocokkan dengan teks Licence sebelum tampil di layar publik.",
        "datum": "EGM2008 (tinggi ortometrik); DSM; laut = 0, ubin laut tidak dirilis (readme AWS)",
        "url": "https://copernicus-dem-30m.s3.amazonaws.com/",
    },
    "gebco": {
        "nama": "GEBCO_2020 Grid, 15 detik busur (lewat ERDDAP NOAA coastwatch, dataset GEBCO_2020, variabel elevation)",
        "atribusi": "GEBCO Compilation Group (2020) GEBCO 2020 Grid, doi:10.5285/a29c5465-b138-234d-e053-6c86abc040b9",
        "lisensi": "Boleh dipakai dan disebarkan gratis, tanpa jaminan, bukan untuk navigasi atau keselamatan di laut "
                   "(atribut license dan comment di berkas NetCDF dari ERDDAP). Atribusi GEBCO wajib.",
        "datum": "muka laut rata-rata (MSL) menurut dokumentasi GEBCO; tidak diverifikasi di sini",
        "url": "https://coastwatch.pfeg.noaa.gov/erddap/griddap/GEBCO_2020",
    },
}
# ubin yang terverifikasi TIDAK ADA di sumber AWS (HTTP gagal, sesi induk 26 Nov 2026; readme AWS: ubin laut tidak dirilis) = laut
TAK_ADA_DI_SUMBER = {"S07_00_E104"}
# ukuran lengkap ubin GLO-30 (byte), dari sesi induk 26 Nov 2026; kurang dari ini = unduhan belum selesai
UKURAN_UBIN = {"S07_00_E105": 13861219, "S08_00_E108": 37205267, "S08_00_E109": 37366881, "S09_00_E113": 20612661, "S09_00_E114": 20112934}


def _sidik(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def ubin_path(lat_atas, lon_barat):
    """Nama berkas ubin GLO-30 untuk sudut barat laut (lat_atas bilangan bulat, mis. -6 untuk S07)."""
    return RAW + "glo30/Copernicus_DSM_COG_10_S%02d_00_E%03d_00_DEM.tif" % (-lat_atas + 1, lon_barat)


def ubin_lengkap(path, kunci):
    return os.path.exists(path) and os.path.getsize(path) == UKURAN_UBIN[kunci]


def baca_cog(path, np):
    """Pembaca GeoTIFF float32 tertile + deflate + prediktor 3 (hanya yang dipakai GLO-30). -> (array [baris,kolom], lon0, lat0)."""
    with open(path, "rb") as f:
        d = f.read()
    bo = "<" if d[:2] == b"II" else ">"
    assert d[2:4] in (b"*\x00", b"\x00*"), "bukan TIFF klasik"
    ifd = struct.unpack(bo + "I", d[4:8])[0]
    n = struct.unpack(bo + "H", d[ifd:ifd + 2])[0]
    T = {}
    FMT = {3: ("H", 2), 4: ("I", 4), 12: ("d", 8), 2: ("c", 1)}
    for i in range(n):
        tag, typ, cnt = struct.unpack(bo + "HHI", d[ifd + 2 + 12 * i:ifd + 10 + 12 * i])
        c, sz = FMT.get(typ, ("B", 1))
        raw = d[ifd + 10 + 12 * i:ifd + 14 + 12 * i]
        if sz * cnt > 4:
            o = struct.unpack(bo + "I", raw)[0]
            raw = d[o:o + sz * cnt]
        T[tag] = struct.unpack(bo + "%d%s" % (cnt, c), raw[:sz * cnt]) if c != "c" else raw
    W, H, tw, th = T[256][0], T[257][0], T[322][0], T[323][0]
    assert T[258][0] == 32 and T[339][0] == 3 and T[259][0] == 8 and T[317][0] == 3, "bukan float32 deflate prediktor 3"
    z = np.empty((H, W), dtype="<f4")
    ntx = (W + tw - 1) // tw
    for k, (off, ln) in enumerate(zip(T[324], T[325])):
        ty, tx = divmod(k, ntx)
        b = np.frombuffer(zlib.decompress(d[off:off + ln]), dtype=np.uint8).reshape(th, 4 * tw)
        b = np.cumsum(b, axis=1, dtype=np.uint8)  # buka delta per byte sepanjang baris
        # prediktor 3: empat bidang byte (MSB dulu) per baris; susun ulang ke float little-endian
        v = np.ascontiguousarray(b.reshape(th, 4, tw)[:, ::-1, :].transpose(0, 2, 1)).view("<f4").reshape(th, tw)
        h, w = min(th, H - ty * th), min(tw, W - tx * tw)
        z[ty * th:ty * th + h, tx * tw:tx * tw + w] = v[:h, :w]
    sx, sy = T[33550][0], T[33550][1]
    tie = T[33922]
    assert abs(sx - 1 / DETIK) < 1e-9 and abs(sy - 1 / DETIK) < 1e-9
    # GTRasterTypeGeoKey (1025): 1 = PixelIsArea, 2 = PixelIsPoint. GLO-30 bertanda 2 (readme AWS: baris/kolom bersama ubin tetangga
    # dibuang, jadi sampel pertama tepat di sudut ubin). Tie point = pusat sampel, tidak ada koreksi setengah piksel; tipe lain = gagal keras.
    gk = T[34735]
    tipe = next((gk[i + 3] for i in range(4, len(gk) - 3, 4) if gk[i] == 1025), None)
    assert tipe == 2, ("GTRasterTypeGeoKey bukan PixelIsPoint, koreksi setengah piksel belum ditulis", tipe)
    return z, tie[3], tie[4]


def baca_gebco(path, np):
    """NetCDF3 klasik GEBCO dari ERDDAP -> (lat[asc], lon[asc], elevasi short -> float32 [lat,lon], nodata jadi NaN)."""
    d = open(path, "rb").read()
    assert d[:4] == b"CDF\x01"
    p = [4]

    def u32():
        v = struct.unpack(">I", d[p[0]:p[0] + 4])[0]
        p[0] += 4
        return v

    def nama():
        n = u32()
        s = d[p[0]:p[0] + n].decode()
        p[0] += (n + 3) // 4 * 4
        return s

    SZ = {1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8}
    SF = {1: "b", 3: "h", 4: "i", 5: "f", 6: "d"}

    def atribut():
        u32()
        out = {}
        for _ in range(u32()):
            nm, ty, c = nama(), u32(), u32()
            sz = SZ[ty] * c
            raw = d[p[0]:p[0] + sz]
            p[0] += (sz + 3) // 4 * 4
            out[nm] = raw.decode(errors="ignore") if ty == 2 else struct.unpack(">%d%s" % (c, SF[ty]), raw)
        return out

    u32()  # numrecs
    u32()
    dims = [(nama(), u32()) for _ in range(u32())]
    atribut()
    u32()
    V = {}
    for _ in range(u32()):
        nm = nama()
        ids = [u32() for _ in range(u32())]
        a = atribut()
        ty, _vs, off = u32(), u32(), u32()
        V[nm] = (ids, ty, off, a)
    nl, nb = dims[0][1], dims[1][1]
    assert [x[0] for x in dims] == ["latitude", "longitude"]
    lat = np.frombuffer(d, dtype=">f8", count=nl, offset=V["latitude"][2]).astype(float)
    lon = np.frombuffer(d, dtype=">f8", count=nb, offset=V["longitude"][2]).astype(float)
    e = np.frombuffer(d, dtype=">i2", count=nl * nb, offset=V["elevation"][2]).reshape(nl, nb).astype("f4")
    fill = V["elevation"][3].get("_FillValue", (32767,))[0]
    e[e == fill] = np.nan
    assert lat[0] < lat[-1] and lon[0] < lon[-1]
    return lat, lon, e


def _bilinear(lat, lon, e, la, lo, np):
    """Bilinear e[lat,lon] pada titik la[:,None], lo[None,:] (kisi dasar tegak lurus); di luar cakupan -> NaN."""
    dy = (lat[-1] - lat[0]) / (len(lat) - 1)
    dx = (lon[-1] - lon[0]) / (len(lon) - 1)
    fy = (la - lat[0]) / dy
    fx = (lo - lon[0]) / dx
    ok_y = (fy >= 0) & (fy <= len(lat) - 1)
    ok_x = (fx >= 0) & (fx <= len(lon) - 1)
    y0 = np.clip(np.floor(fy).astype(int), 0, len(lat) - 2)
    x0 = np.clip(np.floor(fx).astype(int), 0, len(lon) - 2)
    ty = np.clip(fy - y0, 0, 1)[:, None]
    tx = np.clip(fx - x0, 0, 1)[None, :]
    Y0, Y1 = y0[:, None], (y0 + 1)[:, None]
    X0, X1 = x0[None, :], (x0 + 1)[None, :]
    r = (e[Y0, X0] * (1 - ty) * (1 - tx) + e[Y0, X1] * (1 - ty) * tx + e[Y1, X0] * ty * (1 - tx) + e[Y1, X1] * ty * tx)
    r[~(ok_y[:, None] & ok_x[None, :])] = np.nan
    return r


def _isi_celah(z, celah, laut_sah, np, maks=400):
    """Isi sel celah dengan rata-rata tetangga-4 yang sudah bernilai sah (laut GEBCO / hasil isian), dilatasi bertahap. -> sel sisa tak terisi."""
    nilai = np.where(laut_sah, z, np.nan)
    sisa = celah.copy()
    for _ in range(maks):
        if not sisa.any():
            break
        pad = np.pad(nilai, 1, constant_values=np.nan)
        tt = np.stack([pad[:-2, 1:-1], pad[2:, 1:-1], pad[1:-1, :-2], pad[1:-1, 2:]])
        ada = ~np.isnan(tt)
        n = ada.sum(0)
        rata = np.where(n > 0, np.nansum(np.where(ada, tt, 0), 0) / np.maximum(n, 1), np.nan)
        isi = sisa & (n > 0)
        if not isi.any():
            break
        nilai[isi] = rata[isi]
        sisa &= ~isi
    z[celah & ~sisa] = nilai[celah & ~sisa]
    return int(sisa.sum())


def siapkan(kunci, np):
    """Bangun grid gabungan satu kotak; tulis KELUAR/<kunci>.bin (float32 LE, baris dari utara) dan <kunci>.json. -> meta atau None bila masukan belum lengkap."""
    kt = KOTAK[kunci]["kotak"]
    i0, i1 = math.ceil(kt[0] * DETIK), math.floor(kt[2] * DETIK)
    j0, j1 = math.ceil(kt[1] * DETIK), math.floor(kt[3] * DETIK)  # indeks lintang (derajat*3600)
    lon = np.arange(i0, i1 + 1) / DETIK
    lat = np.arange(j1, j0 - 1, -1) / DETIK  # utara dulu
    ny, nx = len(lat), len(lon)
    glo = np.full((ny, nx), np.nan, dtype="f4")  # NaN = tak ada ubin (laut)
    masuk = []
    for lat_atas in range(math.ceil(kt[3]), math.floor(kt[1]), -1):
        for lon_b in range(math.floor(kt[0]), math.floor(kt[2]) + 1):
            kode = "S%02d_00_E%03d" % (-lat_atas + 1, lon_b)
            pth = ubin_path(lat_atas, lon_b)
            if kode in TAK_ADA_DI_SUMBER:
                masuk.append({"ubin": kode, "status": "tak_ada_di_sumber_dibaca_laut"})
                continue
            assert kode in UKURAN_UBIN, ("ubin tidak terdaftar (bukan UKURAN_UBIN, bukan TAK_ADA_DI_SUMBER); daftarkan setelah diverifikasi", kode)
            assert ubin_lengkap(pth, kode), ("ubin belum diunduh atau ukuran tidak cocok", kode)
            u, lo0, la0 = baca_cog(pth, np)
            # sampel (r,c) ada di lon = lo0 + c/3600, lat = la0 - r/3600; selaras kisi kotak
            c0, r0 = round((lo0 - lon_b) * DETIK), round((la0 - lat_atas) * DETIK)
            assert c0 == 0 and r0 == 0, ("sudut ubin tidak selaras", kode, lo0, la0)
            ci = np.arange(u.shape[1]) + round(lon_b * DETIK) - i0
            ri = (j1 - (round(lat_atas * DETIK) - np.arange(u.shape[0])))
            mc, mr = (ci >= 0) & (ci < nx), (ri >= 0) & (ri < ny)
            if mc.any() and mr.any():
                glo[np.ix_(ri[mr], ci[mc])] = u[np.ix_(np.nonzero(mr)[0], np.nonzero(mc)[0])]
            masuk.append({"ubin": kode, "berkas": os.path.basename(pth), "byte": os.path.getsize(pth), "sha256": _sidik(pth)})
    gpath = RAW + "gebco/%s.nc" % kunci
    glat, glon, ge = baca_gebco(gpath, np)
    geb = _bilinear(glat, glon, ge, lat, lon, np)
    assert not np.isnan(geb).any(), "GEBCO tidak menutup kotak"
    darat = glo > 0
    z = np.where(darat, glo, geb).astype("f4")
    # sel bukan-darat yang masih >= 0 (GLO-30 laut/0 atau tanpa ubin, GEBCO kasar bilang darat) = celah pantai
    celah = (~darat) & (z >= 0)
    laut_sah = (~darat) & (z < 0)
    sisa = _isi_celah(z, celah, laut_sah, np)
    z[celah] = np.minimum(z[celah], -0.1)
    n_celah = int(celah.sum())
    z[celah & ~np.isfinite(z)] = -0.1  # tak terjangkau tetangga laut: tetap air dangkal minimal
    assert np.isfinite(z).all() and ((z > 0) == darat).all(), "sel kosong atau darat berubah"
    meta = {
        "kotak_kunci": kunci, "kotak": kt, "ny": ny, "nx": nx, "dlon": 1 / DETIK, "dlat": 1 / DETIK,
        "lon_barat": float(lon[0]), "lat_utara": float(lat[0]), "urutan": "baris dari utara, kolom dari barat, float32 little-endian, meter",
        "dem": "glo30", "bias": "GLO-30 adalah DSM (atap, kanopi ikut); genangan cenderung tersempitkan",
        "darat_sel": int((z > 0).sum()), "laut_sel": int((z <= 0).sum()),
        "darat_persen": round(100 * float((z > 0).mean()), 2), "laut_persen": round(100 * float((z <= 0).mean()), 2),
        "z_min": round(float(z.min()), 2), "z_maks": round(float(z.max()), 2),
        "sel_tanpa_ubin_glo30": int(np.isnan(glo).sum()), "celah_pantai_diisi": n_celah - sisa, "celah_tak_terjangkau_diisi_minimal": sisa,
        "ubin": masuk, "gebco": {"berkas": os.path.basename(gpath), "byte": os.path.getsize(gpath), "sha256": _sidik(gpath)},
    }
    os.makedirs(KELUAR, exist_ok=True)
    z.astype("<f4").tofile(KELUAR + kunci + ".bin")
    json.dump(meta, open(KELUAR + kunci + ".json", "w"), indent=1, ensure_ascii=False)
    return meta


def tulis_indeks(metas):
    """KELUAR/indeks.json: bentuk pantai mengikuti DESAIN-TEKNIS 2 (dem glo30, bukan demnas) plus lisensi dan sidik tiap berkas masukan."""
    ind = {"versi_model": "medan-1", "status": "hipotesis",
           "pantai": {k: {"nama": KOTAK[k]["nama"], "kotak": KOTAK[k]["kotak"], "dem": "glo30",
                          "dem_atribusi": LISENSI["glo30"]["atribusi"], "resolusi_m": 30,
                          "grid": {"ny": m["ny"], "nx": m["nx"], "berkas": k + ".bin"}} for k, m in metas.items()},
           "masukan": {k: {"berkas": [u for u in m["ubin"]] , "gebco": m["gebco"]} for k, m in metas.items()},
           "lisensi": LISENSI,
           "batas": ["DSM GLO-30: atap dan kanopi ikut tinggi, genangan cenderung tersempitkan",
                     "datum GLO-30 EGM2008 lawan GEBCO MSL tidak dikoreksi dan selisihnya tidak diukur",
                     "GEBCO 15 detik kasar di dekat pantai; celah pantai diisi interpolasi tetangga laut, dicatat per kotak",
                     "kedalaman sel celah dari interpolasi tetangga laut bisa lebih dalam dari aslinya, cenderung meremehkan shoaling di bibir pantai (diukur di TS-11)",
                     "tahun acuan DEM sekitar 2011-2015", "bukan peringatan; status tsunami resmi hanya BMKG"]}
    json.dump(ind, open(KELUAR + "indeks.json", "w"), indent=1, ensure_ascii=False)


# titik acuan georeferensi: (kotak, nama, lat, lon, tinggi_perkiraan_m atau None, toleransi_m); nilai perkiraan = nilai mentah ubin
# (Pangandaran 4,2 m dan Honje 62,6 m dari pembacaan ubin; Panaitan, Pancer dan Genteng tanpa nilai tertulis, hanya wajib darat)
TITIK_GEOREF = [
    ("pangandaran_cilacap", "Pangandaran", -7.685, 108.655, 4.2, 0.3),
    ("ujung_kulon", "Honje", -6.75, 105.33, 62.6, 0.3),
    ("ujung_kulon", "Panaitan", -6.60, 105.20, None, 0),
    ("banyuwangi_rajegwesi", "Pancer", -8.589, 114.005, None, 0),
    ("banyuwangi_rajegwesi", "Genteng pedalaman", -8.45, 114.2, None, 0),
]


def _ubin_mentah(kode, np):
    lat_atas, lon_b = -(int(kode[1:3]) - 1), int(kode[8:11])
    return baca_cog(ubin_path(lat_atas, lon_b), np)


def _jendela_mentah(kode, m, np):
    """Nilai mentah ubin yang jatuh di dalam kisi kotak, dihitung dari koordinat sampel (jalur terpisah dari siapkan)."""
    u, lo0, la0 = _ubin_mentah(kode, np)
    kt = m["kotak"]
    c = np.arange(u.shape[1]); r = np.arange(u.shape[0])
    mc = (lo0 + c / DETIK >= m["lon_barat"] - 1e-9) & (lo0 + c / DETIK <= m["lon_barat"] + (m["nx"] - 1) / DETIK + 1e-9)
    mr = (la0 - r / DETIK <= m["lat_utara"] + 1e-9) & (la0 - r / DETIK >= m["lat_utara"] - (m["ny"] - 1) / DETIK - 1e-9)
    return u[np.ix_(r[mr], c[mc])]


def georef(kunci, m, z, np, geser=0):
    """Banding nilai mentah ubin dengan sel kisi di jendela +-10 sel tiap titik acuan; -> jumlah sel tak cocok. geser=px menggeser kisi (untuk bukti uji peka)."""
    zz = np.roll(z, (geser, geser), axis=(0, 1)) if geser else z
    salah = 0
    for kk, nama, la, lo, nilai, tol in TITIK_GEOREF:
        if kk != kunci:
            continue
        u, lo0, la0 = _ubin_mentah("S%02d_00_E%03d" % (-math.ceil(la) + 1, math.floor(lo)), np)
        r0, c0 = round((la0 - la) * DETIK), round((lo - lo0) * DETIK)
        R, C = round((m["lat_utara"] - la) * DETIK), round((lo - m["lon_barat"]) * DETIK)
        w_mentah = u[r0 - 10:r0 + 11, c0 - 10:c0 + 11]
        w_kisi = zz[R - 10:R + 11, C - 10:C + 11]
        darat = w_mentah > 0
        salah += int((w_kisi[darat] != w_mentah[darat]).sum()) + int((w_kisi[~darat] > 0).sum())
        if not geser:
            v = float(z[R, C])
            assert v > 0, (kunci, nama, "titik pedalaman/pantai acuan bukan darat", v)
            if nilai is not None:
                assert abs(v - nilai) <= tol and v == float(u[r0, c0]), (kunci, nama, v, nilai)
    return salah


def uji_medan(np):
    """Uji pada keluaran nyata yang ada: tiap kotak punya titik acuan darat > 0, laut < 0, tanpa NaN, sidik tercatat."""
    ada = 0
    for kunci, v in KOTAK.items():
        mp = KELUAR + kunci + ".json"
        if not os.path.exists(mp):
            print("  (belum ada keluaran %s)" % kunci)
            continue
        m = json.load(open(mp))
        z = np.fromfile(KELUAR + kunci + ".bin", dtype="<f4").reshape(m["ny"], m["nx"])
        ada += 1
        assert np.isfinite(z).all(), (kunci, "ada sel kosong")
        assert m["darat_sel"] + m["laut_sel"] == z.size and m["darat_sel"] > 1000 and m["laut_sel"] > 1000
        assert (z > 0).sum() == m["darat_sel"] and m["darat_sel"] + m["laut_sel"] == z.size
        assert georef(kunci, m, z, np) == 0, (kunci, "georeferensi kisi tidak cocok dengan nilai mentah ubin")
        if any(t[0] == kunci for t in TITIK_GEOREF):  # bukti uji peka: kisi digeser 3 sel HARUS gagal
            assert georef(kunci, m, z, np, geser=3) > 0 and georef(kunci, m, z, np, geser=2) > 0, (kunci, "uji georef tidak peka pada geseran 2-3 sel")

        def di(la, lo):
            return float(z[round((m["lat_utara"] - la) * DETIK), round((lo - m["lon_barat"]) * DETIK)])
        k = v["kotak"]
        # titik darat pasti: pedalaman tiap kotak (tinggi > 0 dan > 3 m); laut pasti: sudut selatan kotak jauh dari pantai
        lautp = di(k[1] + 0.01, (k[0] + k[2]) / 2)
        assert lautp < -5, (kunci, "titik laut acuan", lautp)
        # puncak darat kisi = puncak nilai mentah ubin di dalam kotak (dibaca ulang dari berkas, bukan dari meta)
        puncak = max(float(_jendela_mentah(u["ubin"], m, np).max()) for u in m["ubin"] if "sha256" in u)
        assert float(z.max()) == puncak and float(z.min()) < -50, (kunci, float(z.max()), puncak, float(z.min()))
        for u in m["ubin"]:
            if "sha256" in u:
                assert len(u["sha256"]) == 64 and u["byte"] == UKURAN_UBIN[u["ubin"]], u
        assert len(m["gebco"]["sha256"]) == 64 and m["dem"] == "glo30"
        assert 10 < m["darat_persen"] < 90 and m["celah_tak_terjangkau_diisi_minimal"] < 0.001 * z.size, m
        # georeferensi: titik run-up NCEI di kotak (pantai) harus punya sel darat DAN sel laut dalam jendela +-1,5 km
        if os.path.exists(DATA + "tsunami_runup.json"):
            ok = tot = 0
            for x in json.load(open(DATA + "tsunami_runup.json"))["runup"]:
                if x["tinggi_m"] is None or not di_dalam(k, x["lat"], x["lon"]):
                    continue
                r, c = round((m["lat_utara"] - x["lat"]) * DETIK), round((x["lon"] - m["lon_barat"]) * DETIK)
                w = z[max(r - 50, 0):r + 51, max(c - 50, 0):c + 51]
                tot += 1
                ok += bool((w > 0).any() and (w <= 0).any())
            assert tot >= 20 and ok / tot > 0.8, (kunci, "run-up di pantai kisi", ok, tot)
            print("  %s: run-up NCEI di pantai kisi %d/%d" % (kunci, ok, tot))
        print("  %s: %dx%d, z %.1f..%.1f m, darat %.1f%% laut %.1f%%, celah diisi %d" % (kunci, m["ny"], m["nx"], m["z_min"], m["z_maks"], m["darat_persen"], m["laut_persen"], m["celah_pantai_diisi"]))
    return ada


def uji():
    ks = list(KOTAK)
    assert len(ks) == 3
    for kunci, v in KOTAK.items():
        k = v["kotak"]
        assert len(k) == 4 and k[0] < k[2] and k[1] < k[3], (kunci, k)
        assert 94 <= k[0] and k[2] <= 142 and -12 <= k[1] and k[3] <= 7, ("di luar cakupan batimetri", kunci)
        assert 500 < luas_km2(k) < 12000, (kunci, luas_km2(k))  # masuk akal sebagai domain pantai (bukan satu provinsi)
        for nama, la, lo in TITIK_ACUAN[kunci]:
            assert di_dalam(k, la, lo), (kunci, nama)
    for i, a in enumerate(ks):  # tidak tumpang tindih
        for b in ks[i + 1:]:
            A, B = KOTAK[a]["kotak"], KOTAK[b]["kotak"]
            assert A[2] <= B[0] or B[2] <= A[0] or A[3] <= B[1] or B[3] <= A[1], (a, b)
    assert kotak_untuk(-8.5565, 113.9351667) == "banyuwangi_rajegwesi" and kotak_untuk(-6.2, 106.8) is None  # Jakarta: belum dihitung
    # kotak memuat laut dan darat pada grid batimetri nyata, dan titik run-up NCEI yang sesuai
    if os.path.exists(DATA + "batimetri.bin"):
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import tsunami_sumber as ts
        G = ts.muat_grid(DATA)
        for kunci, v in KOTAK.items():
            k = v["kotak"]
            laut = darat = 0
            for j in range(G["ny"]):
                la = G["lat0"] + j * G["d"]
                if not k[1] <= la <= k[3]:
                    continue
                for i in range(G["nx"]):
                    lo = G["lon0"] + i * G["d"]
                    if k[0] <= lo <= k[2]:
                        if G["z"][j * G["nx"] + i] < 0:
                            laut += 1
                        else:
                            darat += 1
            assert laut >= 5 and darat >= 5, (kunci, laut, darat)
    if os.path.exists(DATA + "tsunami_runup.json"):
        r = json.load(open(DATA + "tsunami_runup.json"))["runup"]
        for kunci, v in KOTAK.items():
            n = sum(1 for x in r if x["tinggi_m"] is not None and di_dalam(v["kotak"], x["lat"], x["lon"]))
            assert n >= 20, (kunci, "titik run-up NCEI di dalam kotak", n)
    assert not re.search(r"\baman\b", json.dumps(KOTAK, ensure_ascii=False).lower()), "kata terlarang di daftar kotak"
    print("tsunami_medan uji OK:", {k: round(luas_km2(v["kotak"])) for k, v in KOTAK.items()}, "km2")


if __name__ == "__main__":
    perintah = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if perintah == "uji":
        uji()
        try:
            import numpy as _np
        except ImportError:
            print("TS-06 uji dilewati: numpy tidak ada (pakai data/raw/tsunami/venv/bin/python)")
        else:
            n = uji_medan(_np)
            print("tsunami_medan TS-06 uji OK: %d kotak berkeluaran" % n)
    elif perintah == "siapkan":
        import numpy as _np
        metas = {}
        for kk in (sys.argv[2:] or list(KOTAK)):
            m = siapkan(kk, _np)
            if m:
                metas[kk] = m
                print(kk, {a: m[a] for a in ("ny", "nx", "z_min", "z_maks", "darat_persen", "laut_persen", "sel_tanpa_ubin_glo30", "celah_pantai_diisi")})
        if metas:
            # indeks memuat semua kotak yang keluarannya ada
            semua = {k: json.load(open(KELUAR + k + ".json")) for k in KOTAK if os.path.exists(KELUAR + k + ".json")}
            tulis_indeks(semua)
    else:
        sys.exit("pakai: tsunami_medan.py uji | siapkan [kotak ...]")
