#!/usr/bin/env python3
"""Profil daerah Kemitraan Kampus (PROFIL-DAERAH.md §1-§2, KM-B01 + KM-B02).
514 berkas public/data/kemitraan/daerah/<kode IRBI 4 digit>.json. Blok: wilayah, penduduk, sosek, irbi,
inarisk_kec, kejadian (+ tren Theil-Sen), fasilitas, kapasitas, riwayat_luar, sumber (B01); gempa, karhutla, kekeringan,
gunungapi, pesisir, udara, neraca_air, model, siluet (B02); masalah + masalah_skor (B03, masalah.py, persentil nasional atas 514 kab
sehingga bangun() selalu membangun semuanya lalu menyaring --kab). Geometri murni ada di geo.py.
Aturan: tiap blok dict {..., sumber, tanggal, yakin}; data hilang = null (bukan 0); tanpa angka karangan;
sumber hilang -> blok null + catatan di sumber[] (D7); keluaran deterministik (tanggal = tanggal sumber).
BPBD: email TIDAK ditulis (gerbang D5 melarang email di public/data/kemitraan/**).
Pakai: python3 -I scripts/kemitraan/profil_daerah.py [--cek|--jaga] [--kab 6211] [--akar DIR] [--keluar DIR]"""
import collections, glob, json, math, os, re, shutil, sys, tempfile

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "umum"))  # -I tidak menambah direktori skrip
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from kode import kunci  # noqa: E402  (kab dan kota senama tidak tertukar; hanya impor nama_wilayah)
from konst import KONST  # noqa: E402
import masalah  # noqa: E402  (KM-B03: komponen, skor, aspek; murni atas profil)
from geo import Peta, dalam_poligon, haversine_km, jarak_titik_poligon_km, poligon, siluet  # noqa: E402,F401

MAKS_BYTE = 60_000
YAKIN = ("resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan")
BLOK_DICT = ("wilayah", "penduduk", "sosek", "irbi", "inarisk_kec", "kejadian", "fasilitas", "kapasitas",
             "gempa", "karhutla", "kekeringan", "gunungapi", "pesisir", "udara", "neraca_air", "model")
RADIUS_GUNUNG_KM = 50  # PD §2: jarak titik gunung ke poligon kab <= 50 km
LEVEL_KERING = ("Normal", "Waspada", "Siaga", "Awas")  # public/kekeringan/app.js LEVEL
RE_TGL = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RE_BOCOR = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+|(?<!\d)62\d{8,}|\bA[0-9]{6,}")  # D5: email, nomor 62..., id OpenAlex

# id -> (berkas relatif, nama, lisensi). Lisensi hanya yang dinyatakan di sumbernya; selain itu null.
SUMBER = {
    "wilayah": ("public/data/wilayah/NN.json", "Profil wilayah (IRBI/InaRISK BNPB, BPS, regulasi, GDACS, Copernicus EMS)",
                "IRBI/InaRISK bukan data terbuka; BPS dan GDACS dipakai sebagai rujukan"),
    "desa_cari": ("public/data/desa_cari.json", "Daftar kecamatan dan desa (cahyadsn/wilayah_boundaries, Kepmendagri 300.2.2-2430/2025)", "MIT"),
    "kejadian": ("public/banjir/data/kejadian.json", "BNPB data.bnpb.go.id dan DIBI (kejadian hidrometeorologi)", None),
    "bahaya": ("public/banjir/data/bahaya.json", "InaRISK BNPB indeks bahaya per kecamatan (banjir, bandang, longsor, kekeringan, gelombang)", None),
    "inarisk_gempa": ("public/gempa/data/inarisk_gempa.json", "InaRISK BNPB indeks bahaya gempa bumi per kecamatan", None),
    "dibi": ("public/data/dibi_kejadian.json", "DIBI BNPB (dibi.bnpb.go.id), semua jenis bencana, 12 bulan", None),
    "sekolah": ("public/data/sekolah.json", "Data sekolah nasional (Dapodik/Kemendikbud, EMIS Kemenag), hanya 9 provinsi", None),
    "fasilitas": ("public/data/fasilitas.json", "Fasilitas kesehatan (faskes, RS), hanya 9 provinsi", None),
    "geo": ("public/geo/kabupaten/NN.json", "Poligon kabupaten (batas disederhanakan, bukan SK batas)", None),
    "kode": ("public/data/kemitraan/kode.json", "Crosswalk kode wilayah modul Kemitraan (kode.py)", None),
    "gempa_risiko": ("public/gempa/data/risiko.json", "Indeks risiko gempa per kabupaten (USGS M>=5 radius 100 km, 2000-2025)", "USGS domain publik"),
    "gempa_m5": ("public/gempa/data/riwayat_m5.json", "Katalog gempa M>=5 USGS (FDSN) sejak 1900", "USGS domain publik"),
    "karhutla": ("public/data/riwayat_wilayah/kab.json", "NASA FIRMS titik panas MODIS 2003- dan VIIRS 2012- per kabupaten", None),
    "gambut": ("public/data/lahan/gambut.geojson", "Sel gambut BBSDLP 1:250.000 lewat PRIMS (BRGM)", None),
    "khg": ("public/data/lahan/khg.geojson", "Kesatuan Hidrologis Gambut (BRGM PRIMS, prims.brgm.go.id)", "BRGM PRIMS: nonkomersial dengan tautan ke wali data"),
    "kek_wilayah": ("public/data/kekeringan_wilayah.json", "Status kekeringan SPI-3 per kabupaten (Deteksi Centurisk97)", None),
    "kek_riwayat": ("public/data/kekeringan_riwayat.json", "Riwayat kekeringan 1991-2025 per kabupaten (NASA POWER, ONI NOAA, DIBI)", None),
    "kek_meta": ("public/data/kekeringan_meta.json", "Tanggal data kekeringan", None),
    "gunung": ("public/gunungapi/data/gunung.json", "Titik puncak 69 gunung api", None),
    "paparan": ("public/gunungapi/data/paparan.json", "Paparan penduduk per zona KRB gunung api (PVMBG 2018, WorldPop)", None),
    "gunung_risiko": ("public/gunungapi/data/risiko.json", "Indeks risiko gunung api (Smithsonian GVP letusan 1900-2025)", None),
    "abrasi": ("public/pesisir/data/abrasi.json", "Laju abrasi/akresi transek pantai (Landsat via Planetary Computer; garis dasar OSM)", "Landsat domain publik; garis dasar OSM ODbL"),
    "udara": ("public/udara/data/riwayat.json", "PM2,5 harian per provinsi (jendela 37 hari)", None),
    "neraca": ("public/data/neraca_air/kab.json", "Neraca air kabupaten Jawa (CHIRPS, NASA POWER; estimasi model)", None),
    "risiko_kec": ("public/banjir/data/risiko_kecamatan.json", "Indeks risiko komposit kecamatan platform (belum diuji balik)", None),
    "gerbang": ("public/data/gerbang_model.json", "Gerbang model karhutla (uji balik 123 kasus)", None),
    "uji_banjir": ("public/banjir/data/risiko_ujibalik.json", "Uji balik indeks risiko banjir/longsor dan gempa", None),
    "uji_kering": ("public/data/kekeringan_ujibalik.json", "Uji balik kekeringan (SPI-3 terhadap DIBI)", None),
}
# blok -> sumber yang menyumbang (dicatat di sumber[] bila blok terisi atau sumbernya hilang, D7)
BLOK_SUMBER = {"gempa": ("gempa_risiko", "gempa_m5", "inarisk_gempa", "geo"),
               "karhutla": ("karhutla", "gambut", "khg", "geo"),
               "kekeringan": ("kek_wilayah", "kek_riwayat", "kek_meta"),
               "gunungapi": ("gunung", "paparan", "gunung_risiko", "geo"),
               "pesisir": ("abrasi", "geo"), "udara": ("udara",), "neraca_air": ("neraca",),
               "model": ("risiko_kec", "gerbang", "uji_banjir", "uji_kering")}
LABEL_JENIS = {"wf": "kebakaran hutan", "fl": "banjir", "eq": "gempa bumi", "earthquake": "gempa bumi", "vo": "erupsi gunung api",
               "dr": "kekeringan", "tc": "siklon tropis"}  # kode GDACS; selain ini ditulis apa adanya
# Satuan per kunci (angka di berkas = mentah; format Indonesia urusan layar)
SATUAN = {
    "wilayah": {"luas_km2": "km2 (luas DEM, ha dibagi 100)", "pusat": "derajat [lintang, bujur]", "n_kec": "kecamatan", "n_desa": "desa/kelurahan",
                "pesisir_kec": "kecamatan", "pct_le5m": "persen luas daratan berelevasi <= 5 m", "pct_le10m": "persen luas daratan berelevasi <= 10 m",
                "jarak_pantai_200m_km": "km, jarak terdekat ke kedalaman laut 200 m (GEBCO), minimum antar kecamatan"},
    "penduduk": {"total": "jiwa", "wanita": "jiwa", "balita": "jiwa", "lansia": "jiwa", "per_km2": "jiwa per km2",
                 "worldpop.n": "jiwa", "bangunan.n": "unit bangunan"},
    "sosek": {"p0": "persen penduduk miskin", "miskin_ribu": "ribu jiwa", "ipm": "indeks 0-100", "air_layak": "persen",
              "sanitasi_layak": "persen", "hunian_layak": "persen", "tren_p0": "[[tahun, persen]]", "tahun": "tahun"},
    "irbi": {"seri": "[[tahun, skor IRBI, kelas, ambang kelas Tinggi]]", "bahaya": "skor IRBI 2025 per jenis bahaya"},
    "inarisk_kec": {"n_kec": "kecamatan", "tinggi": "jumlah kecamatan", "sedang": "jumlah kecamatan", "teratas": "[[kecamatan, nilai bahaya 0-1]]"},
    "kejadian": {"tahunan": "[[tahun, jumlah kejadian]]", "total_2015_2025": "jumlah kejadian", "musim": "jumlah kejadian per bulan (indeks 0 = Januari)",
                 "dampak_12bln.meninggal": "jiwa", "dampak_12bln.mengungsi": "jiwa", "dampak_12bln.n_kejadian": "kejadian",
                 "dampak_12bln.rr_berat": "unit rumah rusak berat", "dampak_12bln.rr_sedang": "unit rumah rusak sedang",
                 "dampak_12bln.rr_ringan": "unit rumah rusak ringan", "besar.meninggal": "jiwa",
                 "dampak_12bln_bahaya": "{bahaya: {meninggal: jiwa, mengungsi: jiwa, rr_berat: unit rumah rusak berat, n_kejadian: kejadian}}, 12 bulan"},
    "fasilitas": {"sekolah": "satuan pendidikan", "siswa": "siswa", "faskes": "unit", "rs": "unit", "gudang_bnpb_km": "km"},
    "kapasitas": {"dokumen_n": "dokumen regulasi"},
    "gempa": {"n_m5_1900": "gempa M>=5 (poligon kab, 1900-akhir katalog)", "m_maks": "magnitudo", "terakhir": "tanggal UTC",
              "risiko_lv": "kelas 0-3 (0 Rendah, 3 Sangat tinggi)", "risiko.skor": "indeks 0-100",
              "risiko.kekerapan": "indeks 0-1 (bobot 50 persen skor)", "risiko.besaran": "indeks 0-100 (bobot 30 persen skor)", "risiko.tren": "indeks 0-1 (bobot 20 persen skor)",
              "risiko.m_maks_100km": "magnitudo, semua gempa M>=5 radius 100 km termasuk susulan", "risiko.n_2000_2025_100km": "gempa utama M>=5 radius 100 km (tanpa susulan)",
              "indeks_inarisk.maks": "indeks bahaya 0-1 kecamatan tertinggi", "indeks_inarisk.n_kec": "kecamatan bernilai > 0"},
    "karhutla": {"titik_tahun": "[[tahun, titik VIIRS S-NPP]]", "titik_tahun_modis": "[[tahun, titik MODIS]]", "rasio_elnino": "rasio rerata titik tahun El Nino terhadap tahun lain",
                 "rasio_elnino_prov": "rasio rasio_elnino kab terhadap provinsi", "tren_rasio": "rasio rerata 10 tahun terakhir terhadap 10 tahun pertama MODIS",
                 "gambut_ha": "hektare, dibulatkan ke ribuan (jumlah luas sel gambut yang titik tengahnya di poligon kab)", "gambut_pct": "persen luas kab",
                 "khg.n": "KHG yang tepinya menyentuh kab", "khg.teratas.ha": "hektare KHG utuh (bukan potongan kab)", "puncak_tahun": "[tahun, titik MODIS]",
                 "rerata_modis_th": "titik MODIS per tahun penuh, bilangan bulat", "peringkat_modis": "[peringkat di provinsi (1 = terbanyak), jumlah kab berperingkat di sumber, termasuk yang rerata ~0]",
                 "titik_tahun_parsial": "tahun (VIIRS sebagian, tahun terakhir belum lengkap)",
                 "tren_viirs_lereng": "titik per tahun (kemiringan Theil-Sen titik VIIRS 2015-2025)"},
    "kekeringan": {"level_kini": "0 Normal, 1 Waspada, 2 Siaga, 3 Awas (tingkat tertinggi yang dialami >= 30% penduduk kab)", "spi3": "indeks SPI-3 (tanpa satuan)", "mm3": "mm curah hujan 3 bulan",
                   "penduduk_status": "jiwa (penduduk kecamatan berstatus tersebut, bukan korban)",
                   "riwayat.risiko": "indeks 0-100", "riwayat.tahun_siaga": "tahun dari n_tahun", "riwayat.n_tahun": "tahun",
                   "riwayat.bulan_siaga": "persen bulan Siaga+ 1991-2025", "riwayat.tren": "selisih paruh akhir terhadap paruh awal (indeks)", "riwayat.dibi": "kejadian DIBI kering"},
    "gunungapi": {"jarak_km": "km, titik puncak ke tepi poligon kab (0 = di dalam)", "radius_km": "km", "tinggi_m": "m dpl",
                  "krb3_jiwa_gunung": "jiwa zona KRB III seluruh gunung (bukan hanya kab ini)", "risiko_skor": "indeks 0-100"},
    "pesisir": {"abrasi_m_th": "m per tahun, median transek nyata (negatif = garis pantai mundur)", "transek_n": "transek", "nyata_n": "transek abrasi atau akresi nyata",
                "abrasi_n": "transek", "akresi_n": "transek", "tidak_nyata_n": "transek", "periode": "[tahun awal, tahun akhir]"},
    "udara": {"pm25_rerata": "\u00b5g/m\u00b3, rerata harian provinsi di jendela", "pm25_maks_harian": "\u00b5g/m\u00b3", "hari_rerata_di_atas_55_4": "hari",
              "jiwa_maks_di_atas_55_4": "jiwa provinsi, hari terburuk di jendela", "n_hari": "hari"},
    "neraca_air": {"defisit_2030": "juta m3 per tahun (jumlah bulan bersaldo negatif, harga mutlak)", "defisit_2025": "juta m3 per tahun",
                   "bulan_defisit_2030": "nomor bulan 1-12"},
    "model": {"risiko_kec.risiko_maks": "indeks 0-100", "risiko_kec.n_kec": "kecamatan", "risiko_kec.per_kelas": "jumlah kecamatan per kelas",
              "risiko_kec.kec_sangat_tinggi": "nama kecamatan"},
}
JENIS_TAHUNAN =("banjir", "bandang", "cuaca", "gelombang", "kering", "longsor", "rob", "semua")
DAMPAK = ("meninggal", "mengungsi", "rr_berat", "rr_sedang", "rr_ringan")


INTI_DIBI = ("meninggal", "hilang", "luka", "mengungsi")

# Jenis DIBI -> bahaya platform (D di masalah.py). Satu jenis boleh ke dua bahaya ("Banjir dan Tanah Longsor": dampaknya DIHITUNG GANDA
# di banjir dan longsor, jadi jumlah antar bahaya > total dampak_12bln). Jenis baru di DIBI tanpa entri = galat (bangun berhenti), bukan nol diam-diam.
JENIS_DIBI_BAHAYA = {
    "Banjir": ("banjir",), "Banjir Bandang": ("banjir",), "Banjir Genangan": ("banjir",), "Banjir dan Tanah Longsor": ("banjir", "longsor"),
    "Banjir Rob": ("abrasi_rob",), "Banjir Lahar (Lahar)": ("gunungapi",),
    "Tanah Longsor": ("longsor",), "Gerakan Tanah": ("longsor",),
    "Cuaca Ekstrem": ("cuaca_ekstrem",), "Angin Kencang": ("cuaca_ekstrem",), "Angin Topan": ("cuaca_ekstrem",), "Puting Beliung": ("cuaca_ekstrem",),
    "Kekeringan": ("kekeringan",), "Kekeringan Pertanian": ("kekeringan",),
    "Kebakaran Hutan dan Lahan": ("karhutla",), "Kebakaran Lahan": ("karhutla",), "Kebakaran Hutan": ("karhutla",), "Kebakaran Lahan Gambut": ("karhutla",),
    "Gempabumi": ("gempa",), "Gempabumi Reruntuhan": ("gempa",), "Gempa Bumi dan Tsunami": ("gempa", "tsunami"),
    "Gelombang Pasang / Abrasi": ("abrasi_rob",), "Abrasi Pantai": ("abrasi_rob",), "Gelombang Pasang": ("abrasi_rob",),
    "Erupsi Gunung Api": ("gunungapi",),
}
JENIS_DIBI_BUKAN_BAHAYA = ("Kebakaran Gedung dan Permukiman", "Lainnya", "Konflik Sosial", "Gagal Teknologi", "Kecelakaan Industri",
                           "Epidemi dan Wabah Penyakit")  # bukan satu pun dari 9 bahaya platform: tak masuk D (tetap di dampak_12bln total)


def cek_jenis_dibi(jenis):
    tak = sorted(set(jenis) - set(JENIS_DIBI_BAHAYA) - set(JENIS_DIBI_BUKAN_BAHAYA))
    assert not tak, f"jenis DIBI {tak} belum dipetakan ke bahaya (JENIS_DIBI_BAHAYA) atau dikecualikan (JENIS_DIBI_BUKAN_BAHAYA)"
    assert not set(JENIS_DIBI_BAHAYA) & set(JENIS_DIBI_BUKAN_BAHAYA), "jenis DIBI di kedua daftar"


def _isi(r):
    return {k: v for k, v in r.items() if v not in (0, None, "")}


def _subset(x, y):
    """Semua kolom tak-kosong x ada dengan nilai sama di y."""
    return all(y.get(k) == v for k, v in _isi(x).items())


def dedup_dibi(rows):
    """Baris DIBI kembar dihitung sekali. Kembar = tanggal+jenis+kab sama DAN dampak inti (meninggal, hilang, luka, mengungsi)
    identik DAN satu baris superset baris lain (kolom tak-kosongnya semua ada bernilai sama di baris yang disimpan; simpan superset).
    Kolom yang saling lepas (kejadian berbeda) tidak digabung. Inti semua 0: kembar hanya bila seluruh baris identik."""
    g = {}
    for r in rows:
        inti = tuple(r.get(c, 0) for c in INTI_DIBI)
        key = (r["tanggal"], r["jenis"]) + (inti if any(inti) else (json.dumps(r, sort_keys=True),))
        simpan = g.setdefault(key, [])
        if any(_subset(r, k) for k in simpan):
            continue
        simpan[:] = [k for k in simpan if not _subset(k, r)] + [r]
    out = [r for v in g.values() for r in v]
    return sorted(out, key=lambda r: (r["tanggal"], r["jenis"], tuple(r.get(c, 0) for c in INTI_DIBI), json.dumps(r, sort_keys=True)))


# ---------------------------------------------------------------- konteks sumber
class Konteks:
    """Pembaca sumber dengan catatan 'hilang' (D7). Satu konteks = satu jalan bangun."""

    def __init__(self, akar):
        self.akar = akar
        self._c = {}
        self.kode = self.baca("kode")
        if self.kode is None:
            raise SystemExit("kode.json tidak ada: jalankan scripts/kemitraan/kode.py dulu")
        self.byir = collections.defaultdict(list)  # kunci -> [kode IRBI]
        for k, v in self.kode.items():
            self.byir[kunci(v["prov"], v["nama"])].append(k)

    def path(self, sid, nn=None):
        return os.path.join(self.akar, SUMBER[sid][0].replace("NN", nn or ""))

    def baca(self, sid, nn=None):
        key = (sid, nn)
        if key not in self._c:
            p = self.path(sid, nn)
            self._c[key] = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None
        return self._c[key]

    def kab_dari_nama(self, prov, nama):
        c = self.byir.get(kunci(prov, nama), [])
        return c[0] if len(c) == 1 else None

    # --- indeks turunan, dibangun sekali
    def _memo(self, nama, fn):
        if ("_", nama) not in self._c:
            self._c[("_", nama)] = fn()
        return self._c[("_", nama)]

    def desa(self):
        def f():
            d = self.baca("desa_cari")
            if d is None:
                return None
            kec, n = collections.defaultdict(set), collections.Counter()
            for r in d["baris"]:
                kec[r[0][:5]].add(r[0][:8]); n[r[0][:5]] += 1
            return {k: (len(kec[k]), n[k]) for k in n}
        return self._memo("desa", f)

    def kejadian_idx(self):
        def f():
            d = self.baca("kejadian")
            if d is None:
                return None
            tah, tj = {}, collections.defaultdict(set)
            for key, v in d["kab"].items():
                for j, sr in v.items():
                    tj[j].update(int(y) for y in sr)
                p, n = key.split("|", 1)
                k = self.kab_dari_nama(p, n)
                if k:
                    tah[k] = v
            mus = collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 12))
            akhir = ""
            for r in d["kejadian_dibi"]:
                akhir = max(akhir, r["tanggal"])
                k = self.kab_dari_nama(r["prov"], r["kab"])
                if k:
                    mus[k][r["jenis"]][int(r["tanggal"][5:7]) - 1] += 1
            awal = min((r["tanggal"] for r in d["kejadian_dibi"]), default="")
            return tah, mus, awal, akhir, {j: sorted(y) for j, y in tj.items()}  # [4] = tahun yang ada di sumber per jenis (semua kab)
        return self._memo("kejadian", f)

    def dibi_idx(self):
        def f():
            d = self.baca("dibi")
            if d is None:
                return None
            cek_jenis_dibi({r["jenis"] for r in d["kejadian"]})
            ba = collections.defaultdict(list)
            for r in d["kejadian"]:
                k = self.kab_dari_nama(r["prov_kode"], r["kab"] or "")
                if k:
                    ba[k].append(r)
            dd = {k: dedup_dibi(v) for k, v in ba.items()}
            return dd, d["dari"], d["sampai"], {k: len(ba[k]) - len(dd[k]) for k in ba}  # [3] = baris kembar dibuang per kab
        return self._memo("dibi", f)

    def bahaya_idx(self):
        """{kab: {bahaya: [(nilai, kec)]}} dari bahaya.json + inarisk_gempa.json."""
        def f():
            out = collections.defaultdict(lambda: collections.defaultdict(list))
            ada = False
            b = self.baca("bahaya")
            if b is not None:
                ada = True
                for key, v in b["kec"].items():
                    p, kab, kec = key.split("|", 2)
                    k = self.kab_dari_nama(p, kab)
                    for h, nilai in (v or {}).items():
                        if k and nilai:
                            out[k][{"kering": "kekeringan"}.get(h, h)].append((nilai, kec))
            g = self.baca("inarisk_gempa")
            if g is not None:
                ada = True
                for key, nilai in g["nilai"].items():
                    p, kab, kec = key.split("|", 2)
                    k = self.kab_dari_nama(p, kab)
                    if k and nilai:
                        out[k]["gempa"].append((nilai, kec))
            return out if ada else None
        return self._memo("bahaya", f)

    def poli(self, prov):
        def f():
            d = self.baca("geo", prov)
            if d is None:
                return None
            o = collections.defaultdict(list)
            for ft in d["features"]:
                k = self.kab_dari_nama(prov, ft["properties"]["kab"])
                if k:
                    o[k] += poligon(ft["geometry"])
            return o
        return self._memo("poli" + prov, f)

    def hitung_titik(self, titik):
        """titik: [(prov, lat, lon, nilai)] -> {kab: [jumlah, jumlah_nilai_non_null | None]} (poligon, ray casting)."""
        hasil = collections.defaultdict(lambda: [0, None])
        for prov in sorted({t[0] for t in titik}):
            po = self.poli(prov)
            if po is None:
                continue
            for p, lat, lon, v in titik:
                if p != prov or lat is None or lon is None:
                    continue
                for k, polis in po.items():
                    if dalam_poligon(lon, lat, polis):
                        h = hasil[k]; h[0] += 1
                        if v is not None:
                            h[1] = (h[1] or 0) + v
                        break
        return hasil

    def skor_kembar(self, kab):
        """Jumlah kab (termasuk dirinya) se-provinsi dengan skor IRBI terakhir identik (hanya kab di kode.json)."""
        def f():
            c = collections.Counter()
            for k in self.kode:
                v = (self.baca("wilayah", self.kode[k]["prov"]) or {}).get(k, {}).get("ir")
                if v and v.get("s"):
                    c[(k[:2], v["s"][-1])] += 1
            return c
        v = ((self.baca("wilayah", self.kode[kab]["prov"]) or {}).get(kab, {}).get("ir") or {}).get("s")
        return self._memo("skor_kembar", f)[(kab[:2], v[-1])] if v else 0

    def tgl_wilayah(self):
        def f():
            m = ""
            for f_ in sorted(glob.glob(self.path("wilayah", "[0-9][0-9]"))):
                for v in json.load(open(f_, encoding="utf-8")).values():
                    for r in v.get("rw", []):
                        m = max(m, r[2])
            return m or None
        return self._memo("tgl_wilayah", f)

    def tgl_snapshot(self):
        """Tanggal berkas sumber yang tak bertanggal = tanggal data bertanggal terbaru di snapshot repo (bukan tanggal terbit)."""
        ts = [self.tgl_wilayah()]
        d = self.baca("dibi")
        if d:
            ts.append(d["sampai"])
        d = self.baca("desa_cari")
        if d:
            ts.append(d["dibuat"][:10])
        ts = [t for t in ts if t]
        return max(ts) if ts else None

    # --- B02: indeks sumber per bahaya (dibangun sekali per Konteks)
    def kab_poli(self):
        def f():
            out = []
            for prov in sorted({v["prov"] for v in self.kode.values()}):
                po = self.poli(prov)
                if po:
                    out += sorted(po.items())
            return out
        return self._memo("kab_poli", f)

    def peta(self):
        return self._memo("peta", lambda: Peta(self.kab_poli()))

    def per_kab(self, sid, atas="kab"):
        """{kab IRBI: nilai} dari berkas berkunci 'NN|Nama' (kunci yang tak cocok satu kab dilewati)."""
        def f():
            d = self.baca(sid)
            if d is None:
                return None
            out = {}
            for key in sorted(d[atas]):
                p, n = key.split("|", 1)
                k = self.kab_dari_nama(p, n)
                if k:
                    out.setdefault(k, d[atas][key])
            return out
        return self._memo("per_kab_" + sid, f)

    def gempa_idx(self):
        """({kab: [n, m_maks, tgl_terakhir]}, tgl_katalog_terakhir)"""
        def f():
            d = self.baca("gempa_m5")
            if d is None or not self.kab_poli():
                return None
            pm, ag, akhir = self.peta(), {}, ""
            for t, lat, lon, _dalam, m, _prov in d["baris"]:
                akhir = max(akhir, t[:10])
                k = pm.cari(lon, lat)
                if k:
                    a = ag.setdefault(k, [0, m, t[:10]])
                    a[0] += 1; a[1] = max(a[1], m); a[2] = max(a[2], t[:10])
            return ag, akhir
        return self._memo("gempa", f)

    def gambut_idx(self):
        """({kab: ha}, {prov tercakup}); ha = jumlah luas sel (bbox sel, bidang lokal) yang titik tengahnya di poligon kab."""
        def f():
            g = self.baca("gambut")
            if g is None or not self.kab_poli():
                return None
            pm, ha, prov = self.peta(), collections.Counter(), set()
            for ft in g["features"]:
                r = ft["geometry"]["coordinates"][0]
                while isinstance(r[0][0], list):  # MultiPolygon: ambil cincin luar bagian pertama
                    r = r[0]
                x0, x1, y0, y1 = min(c[0] for c in r), max(c[0] for c in r), min(c[1] for c in r), max(c[1] for c in r)
                lat = (y0 + y1) / 2
                prov.add(ft["properties"]["prov"])
                k = pm.cari((x0 + x1) / 2, lat)
                if k:
                    ha[k] += (x1 - x0) * 111.32 * math.cos(math.radians(lat)) * (y1 - y0) * 110.574 * 100  # km2 -> ha
            return ha, prov
        return self._memo("gambut", f)

    def khg_idx(self):
        """({kab: [(ha, kode, nama)]}, {prov tercakup}); KHG menyentuh kab bila >= 1 dari <= 40 titik sampel tepinya jatuh di kab."""
        def f():
            d = self.baca("khg")
            if d is None or not self.kab_poli():
                return None
            pm, out, prov = self.peta(), collections.defaultdict(list), set()
            for ft in d["features"]:
                pr = ft["properties"]; prov.add(pr["kode"].split(".")[1])
                geom = ft["geometry"]
                bagian = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
                ks = set()
                for part in bagian:
                    r = part[0]
                    for c in r[::max(1, len(r) // 40)]:
                        k = pm.cari(c[0], c[1])
                        if k:
                            ks.add(k)
                for k in ks:
                    out[k].append((pr["ha"], pr["kode"], pr["nama"]))
            return out, prov
        return self._memo("khg", f)

    def gunung_idx(self):
        """{kab: [(jarak_km, nama)]} gunung dalam RADIUS_GUNUNG_KM dari poligon kab."""
        def f():
            g = self.baca("gunung")
            if g is None or not self.kab_poli():
                return None
            out = collections.defaultdict(list)
            for nama in sorted(g):
                for k, polis in self.kab_poli():
                    j = jarak_titik_poligon_km(g[nama]["lat"], g[nama]["lon"], polis, batas_km=RADIUS_GUNUNG_KM)
                    if j is not None and j <= RADIUS_GUNUNG_KM:
                        out[k].append((j, nama))
            return out
        return self._memo("gunung", f)

    def pesisir_idx(self):
        def f():
            d = self.baca("abrasi")
            if d is None or not self.kab_poli():
                return None
            pm, out = self.peta(), collections.defaultdict(list)
            for t in d["transek"]:
                k = pm.cari(t["lon"], t["lat"])
                if k:
                    out[k].append(t)
            return out
        return self._memo("pesisir", f)

    def risiko_idx(self):
        """({kab: [(risiko, kelas, kec)]}, nama kelas, hari)"""
        def f():
            d = self.baca("risiko_kec")
            if d is None:
                return None
            ag = collections.defaultdict(list)
            for r in d["kec"]:
                k = self.kab_dari_nama(r[0], r[1])
                if k and r[3] is not None and r[4] is not None:
                    ag[k].append((r[3], r[4], r[2]))
            return ag, d["kelas"], d["hari"]
        return self._memo("risiko_kec", f)

    def uji(self):
        """({model: 'lolos'|'gagal'|'belum'}, {sumber: tanggal}). Berkas uji hilang/rusak -> 'belum' (gagal-tertutup)."""
        def f():
            u, tgl = {}, {}
            g = self.baca("gerbang")
            for nama, kk in (("karhutla_sebaran_sel", "model_sel"), ("karhutla_sebaran_luas", "mesin_fisika"),
                             ("karhutla_jejak_api", "jejak_api"), ("karhutla_peluang", "lolos")):
                e = (g or {}).get(kk) or {}
                if e.get("boleh_tampil") is True:
                    u[nama] = "lolos"
                elif e.get("selisih") is not None and e["selisih"] <= 0:
                    u[nama] = "gagal"
                else:
                    u[nama] = "belum"  # mis. selisih > 0 tetapi belum ada selang / belum cukup data prospektif
            if g:
                tgl["gerbang"] = g["dibuat"][:10]
            ub = self.baca("uji_banjir")
            pk = ((ub or {}).get("vonis") or {}).get("per_kelompok") or {}
            for nama in ("banjir_longsor", "gempa"):
                lulus = (pk.get(nama) or {}).get("lulus")
                u[nama] = "lolos" if lulus is True else "gagal" if lulus is False else "belum"
            if ub:
                tgl["uji_banjir"] = ub["dibuat"][:10]
            uk = self.baca("uji_kering")
            ar = ((((uk or {}).get("kejadian") or {}).get("aturan") or {}).get("waspada") or {}).get("semua")
            kr = ((uk or {}).get("kejadian") or {}).get("kriteria_layak")
            if ar and kr:  # kriteria layak sumber: POD >= pod_min, FAR <= far_maks, CSI >= lipat x CSI acak
                ok = ar["pod"] >= kr["pod_min"] and ar["far"] <= kr["far_maks"] and ar["csi"] >= kr["csi_lipat_acak"] * ar["csi_acak"]
                u["kekeringan"] = "lolos" if ok else "gagal"
            else:
                u["kekeringan"] = "belum"
            if uk:
                tgl["uji_kering"] = uk["dibuat"][:10]
            u["longsor"] = "belum"  # tak ada keluaran longsor di repo (public/longsor/data tidak ada)
            return dict(sorted(u.items())), tgl
        return self._memo("uji", f)

    def tgl_arti(self, sid):
        """(tanggal, arti) sumber: tanggal TERBIT/cakupan dari isi berkas bila ada; selain itu snapshot repo."""
        d = self.baca(sid) if "NN" not in SUMBER[sid][0] else None
        try:
            if sid == "gempa_m5" and d:
                return (self.gempa_idx() or (0, None))[1] or self.tgl_snapshot(), "akhir-cakupan"
            if sid == "gempa_risiko" and d:
                return "%d-12-31" % d["tahun"][1], "akhir-tahun-data"
            if sid == "karhutla" and d:
                return d["sd"], "akhir-cakupan"
            if sid == "kek_meta" and d:
                return d["hari_ini"], "hari-data"
            if sid == "kek_riwayat" and d:
                return d["hari"], "hari-data"
            if sid in ("paparan", "abrasi") and d:
                return d["dibuat"][:10], "terbit"
            if sid in ("gunung_risiko", "uji_banjir", "uji_kering", "gerbang") and d:
                return d["dibuat"][:10], "terbit"
            if sid == "risiko_kec" and d:
                return d["hari"], "terbit"
            if sid == "udara" and d:
                return max(d["tgl"]), "akhir-cakupan"
        except (KeyError, TypeError, ValueError):
            pass
        return self.tgl_snapshot(), "snapshot-repo"


# ---------------------------------------------------------------- blok
def blok(isi, tanggal, yakin, sumber, arti="snapshot-repo"):
    """arti: makna 'tanggal' bila bukan tanggal terbit/tahun data (snapshot-repo | akhir-cakupan | akhir-tahun-data)."""
    return dict(isi, sumber=sumber, tanggal=tanggal, yakin=yakin, tanggal_arti=arti)


def b_wilayah(cx, kab, w):
    md = (w or {}).get("md")
    de = (cx.desa() or {}).get(cx.kode[kab]["kemendagri"]) if cx.kode[kab]["kemendagri"] else None
    pusat = cx.kode[kab]["pusat"]
    if not (md or de or pusat):
        return None
    isi = {"luas_km2": round(md["ld"] / 100, 1) if md else None, "pusat": pusat,
           "n_kec": de[0] if de else None, "n_desa": de[1] if de else None,
           "pesisir_kec": md["kp"] if md else None, "pct_le5m": md["r5"] if md else None,
           "pct_le10m": md["r10"] if md else None, "jarak_pantai_200m_km": md["j2"] if md else None,
           "luas_arti": "km2 (luas DEM, ha dibagi 100); kecamatan tercakup DEM: %s" % (md["n"] if md else None)}
    return blok(isi, cx.tgl_snapshot(), "resmi", "Profil wilayah (DEM kecamatan), Kepmendagri 300.2.2-2430/2025")


def b_penduduk(cx, kab, w):
    pp = (w or {}).get("pp")
    if not pp or "t" not in pp:
        return None
    md = (w or {}).get("md")
    isi = {"total": pp["t"], "wanita": pp.get("w"), "balita": pp.get("b"), "lansia": pp.get("l"),
           "balita_arti": "usia 0-5 tahun", "lansia_arti": "usia 60 tahun ke atas",
           "per_km2": round(pp["t"] / (md["ld"] / 100)) if md and md["ld"] else None,
           "worldpop": {"n": pp["wp"], "yakin": "estimasi-model"} if pp.get("wp") else None,
           "bangunan": {"n": pp["g"], "yakin": "estimasi-model"} if pp.get("g") else None}
    return blok(isi, cx.tgl_snapshot(), "resmi", "IRBI paparan penduduk (BNPB); WorldPop dan cacah bangunan = estimasi model")


def b_sosek(cx, kab, w):
    sk = (w or {}).get("sk")
    if not sk:
        return None
    isi = {"p0": sk.get("p0"), "miskin_ribu": sk.get("mj"), "ipm": sk.get("ipm"), "air_layak": sk.get("am"),
           "sanitasi_layak": sk.get("sn"), "hunian_layak": sk.get("hl"), "tren_p0": sk.get("tr"), "tahun": sk["th"]}
    return blok(isi, "%d-12-31" % sk["th"], "resmi", "BPS (kemiskinan, IPM, hunian layak) tahun %d" % sk["th"], "akhir-tahun-data")


def b_irbi(cx, kab, w):
    ir = (w or {}).get("ir")
    if not ir:
        return None
    # titik ke-4 = ambang kelas Tinggi skala titik itu (144 skala lama 2015-2024, 176 skala baru 2025): lompat skala bukan tren
    seri = [[y, s, k, 176 if y >= 2025 else 144] for y, s, k in zip(ir["y"], ir["s"], ir["k"])]
    pet = KONST["BAHAYA_IRBI"]
    bah = {pet.get(h, h): v for h, v in sorted(ir.get("b", {}).items())}
    isi = {"seri": seri, "bahaya": bah, "kelas_arti": "1 = Tinggi, 0 = Sedang",
           "skala": "2025 skala baru ambang kelas Tinggi 176; 2015-2024 ambang 144 (tidak ditarik tren menerus)"}
    yakin = "resmi"
    sama = cx.skor_kembar(kab)
    if sama >= 3:  # skor 2025 identik dengan >= 2 kab lain di provinsi yang sama: disalin apa adanya, keyakinan diturunkan
        isi["catatan_2025"] = "skor 2025 sama untuk %d kab/kota di provinsi ini (%s); kemungkinan nilai provinsi, bukan nilai kab; angka disalin apa adanya dari sumber" % (sama, ir["s"][-1])
        yakin = "estimasi-model"
    return blok(isi, "%d-12-31" % ir["y"][-1], yakin, "IRBI (InaRISK BNPB), bukan data terbuka", "akhir-tahun-data")


def b_inarisk(cx, kab, w):
    ik = (w or {}).get("ik")
    if not ik:
        return None
    bh = (cx.bahaya_idx() or {}).get(kab, {})
    isi = {"n_kec": ik["n"]}
    for h, (t, s) in sorted(ik["b"].items()):
        ter = sorted(bh.get(h, []), key=lambda x: (-x[0], x[1]))[:5]
        if h == "multi":
            ter = [(v, n) for n, v in ik["t"]]
        isi[h] = {"tinggi": t, "sedang": s, "teratas": [[n, round(v, 2)] for v, n in ter] or None}
    return blok(isi, cx.tgl_snapshot(), "resmi", "InaRISK BNPB per kecamatan; tinggi > 0,666, sedang > 0,333; teratas = 5 kec bernilai tertinggi")


def b_kejadian(cx, kab, w):
    ki, di = cx.kejadian_idx(), cx.dibi_idx()
    tah = ((ki[0].get(kab)) if ki else None)
    mus = (ki[1].get(kab)) if ki else None
    tahunan = total = None
    if tah:
        tahunan = {j: [[int(y), n] for y, n in sorted(tah[j].items())] for j in JENIS_TAHUNAN if tah.get(j)}
        total = {j: sum(n for y, n in tahun_tren(v, j)) for j, v in tahunan.items() if tahun_tren(v, j)} or None
    musim = {j: v for j, v in sorted(mus.items())} if mus else None
    dampak = besar = dbb = None
    rows = (di[0].get(kab) if di else None) or []
    if rows:
        dbb = {}
        for r in rows:  # per bahaya platform; jenis bukan bahaya tak masuk (JENIS_DIBI_BUKAN_BAHAYA)
            for b in JENIS_DIBI_BAHAYA.get(r["jenis"], ()):
                e = dbb.setdefault(b, {"meninggal": 0, "mengungsi": 0, "rr_berat": 0, "n_kejadian": 0})
                e["meninggal"] += r.get("meninggal", 0); e["mengungsi"] += r.get("mengungsi", 0)
                e["rr_berat"] += r.get("rr_berat", 0); e["n_kejadian"] += r["kejadian"]
        dbb = dict(sorted(dbb.items()))
        dampak = {k: sum(r.get(k, 0) for r in rows) for k in DAMPAK}  # DIBI: kunci tak ada = 0 pada baris yang ada
        dampak.update(n_kejadian=sum(r["kejadian"] for r in rows), dari=di[1], sampai=di[2])
        mati = sorted((r for r in rows if r.get("meninggal", 0) > 0),
                      key=lambda r: (-r["meninggal"], -r.get("mengungsi", 0), r["tanggal"], r["jenis"]))[:10]
        besar = [{"tgl": r["tanggal"], "jenis": r["jenis"], "meninggal": r["meninggal"], "sumber": "DIBI BNPB"} for r in mati]
    if not (tahunan or musim or dampak):
        return None
    tgl = max([t for t in ((ki[3] if ki else None), (di[2] if di else None)) if t] or [None]) if (ki or di) else None
    isi = {"tahunan": tahunan, "total_2015_2025": total, "musim": musim, "dampak_12bln": dampak, "dampak_12bln_bahaya": dbb, "besar": besar,
           "musim_arti": "jumlah kejadian per bulan kalender (indeks 0 = Januari), jendela %s s.d. %s" % (ki[2], ki[3]) if ki else None,
           "dampak_arti": "meninggal/mengungsi/rr_* = jumlah 12 bulan; null = tak ada kejadian DIBI kab ini di jendela; kunci kosong di baris DIBI dihitung 0",
           "dampak_bahaya_arti": "dampak_12bln dipecah per bahaya platform lewat JENIS_DIBI_BAHAYA (profil_daerah.py); 'Banjir dan Tanah Longsor' dihitung di banjir DAN longsor (ganda), jadi jumlah antar bahaya bisa melebihi dampak_12bln; jenis bukan bahaya (kebakaran gedung dst) tak masuk; bahaya tanpa baris kab ini tak ada kuncinya (0 kejadian di jendela, hanya bila DIBI mencakup bahaya itu di kab lain); null = tak ada baris DIBI kab ini",
           "total_arti": "jumlah tahun 2015-2025; jenis DIBI (semua kecuali 'semua') TANPA 2024 karena DIBI 2024 tak lengkap (nol di sumber bukan bukti tidak ada kejadian), jadi batas bawah; jenis 'semua' (CKAN) memakai 2024, tetapi seri 'semua' hanya sampai 2024 (2025 belum ada di sumber) sehingga totalnya = jumlah 2015-2024",
           "tahunan_arti": "tahun 2024 jenis DIBI di tahunan = nilai mentah sumber, sering 0 buatan, jangan dibaca sebagai nol kejadian ('semua' 2024 lengkap); bandang dan rob hanya DIBI (2018-); banjir bisa memuat bandang; tahun tiap jenis di tahunan hanya yang tercatat sumber untuk kab ini (tak ada = tidak tercatat); untuk tren, tahun yang ada di sumber tanpa baris kab ini dihitung 0 (lihat tren_arti)",
           "parsial": None, "tren": None, "tren_lereng": None,
           "tren_rentang": None,
           "tren_arti": "Theil-Sen per jenis atas 2015-2025 (rentang aktual di tren_rentang: tahun terkecil dan terbesar yang dipakai); tahun yang ada di sumber untuk jenis itu tetapi tanpa baris kab ini dihitung 0 kejadian; tahun yang tak ada sama sekali di sumber tidak diisi; 2024 dikecualikan untuk jenis DIBI (tak lengkap), tidak untuk 'semua' (CKAN, lengkap); jenis tanpa satu pun baris kab ini tidak ditren; null bila < 5 tahun dipakai; jarang = kurang dari 3 tahun berkejadian dalam rentang (lereng null, bukan stabil); datar bila |lereng| < 5% rerata per tahun (kejadian per tahun); catatan: 2025 mencatat lonjakan nasional (banjir, cuaca), sebagian vonis naik ditopang tahun itu"}
    if tahunan:
        ts = {j: ((ki[4].get(j) if ki else None) or ()) for j in tahunan}
        tk = {j: tren_kata(v, j, ts[j]) for j, v in tahunan.items()}
        isi["tren"] = {j: t[0] for j, t in tk.items()}
        isi["tren_lereng"] = {j: t[1] for j, t in tk.items()}
        isi["tren_rentang"] = {j: ([min(p[0] for p in tahun_tren(v, j, ts[j])), max(p[0] for p in tahun_tren(v, j, ts[j]))] if tk[j][0] else None)
                               for j, v in tahunan.items()}
    # tahun terakhir parsial dihitung dari data: kejadian terakhir di sumber sebelum 31 Des tahun itu
    if tahunan and ki and ki[3] and ki[3][5:] != "12-31" and any(y == int(ki[3][:4]) for v in tahunan.values() for y, _ in v):
        isi["parsial"] = {"tahun": int(ki[3][:4]), "sampai": ki[3]}
    return blok(isi, tgl, "resmi", "BNPB data.bnpb.go.id + DIBI BNPB", "akhir-cakupan")


def b_fasilitas(cx, kab, w):
    sk, fa = cx.baca("sekolah"), cx.baca("fasilitas")
    ps = {r[5] for r in sk["baris"]} if sk else set()
    pf = {r["prov"] for r in fa} if fa else set()
    prov = cx.kode[kab]["prov"]
    if prov not in ps and prov not in pf:
        return None  # luar cakupan 9 provinsi: null, bukan 0
    if kab not in (cx.poli(prov) or {}):
        return None  # tanpa poligon kab tak bisa menghitung titik: null, bukan 0
    if "_fas" not in cx._c:
        cx._c["_fas"] = (
            cx.hitung_titik([(r[5], r[9], r[10], r[4]) for r in sk["baris"]]) if sk else {},
            {t: cx.hitung_titik([(r["prov"], r["lat"], r["lon"], None) for r in fa if r["t"] == t]) for t in ("faskes", "rs")} if fa else {})
    hs, hf = cx._c["_fas"]
    isi = {"sekolah": hs[kab][0] if prov in ps else None, "siswa": (hs[kab][1] if prov in ps else None),
           "faskes": hf["faskes"][kab][0] if prov in pf else None, "rs": hf["rs"][kab][0] if prov in pf else None,
           "gudang_bnpb_km": None,
           "cakupan": {"sekolah_siswa_prov": sorted(ps), "faskes_rs_prov": sorted(pf)},  # kode provinsi; provinsi lain = null
           "catatan": "titik dihitung dengan poligon kab; titik di luar poligon (batas disederhanakan) tak terhitung; gudang BNPB belum ada sumber"}
    return blok(isi, cx.tgl_snapshot(), "resmi", "Dapodik/EMIS (sekolah), fasilitas kesehatan; titik ke kab via poligon")


def b_kapasitas(cx, kab, w):
    rg, bp = (w or {}).get("rg"), (w or {}).get("bp")
    if not rg and not bp:
        return None
    isi = {"bpbd": {"status": bp.get("s") or None, "alamat": bp.get("a") or None, "telp": bp.get("t") or None} if bp else None,
           "perda_pb": rg["pb"] if rg else None, "perda_bpbd": rg["bp"] if rg else None,
           "rpb": rg["rp"] if rg else None, "renkon": rg["rk"] if rg else None,
           "dokumen_n": (rg["n"] or None) if rg else None,
           "false_arti": "false = tidak tercatat di basis regulasi sumber (bukan bukti tidak ada); dokumen_n null = tidak ada dokumen tercatat",
           "status_darurat_terakhir": None, "ikd": None, "relawan_aktif": None, "kampus_terdekat": None,
           "kampus_pendamping": None, "desa_binaan_n": None}
    return blok(isi, cx.tgl_snapshot(), "resmi", "Basis regulasi daerah (peraturan.bpk.go.id) dan kontak kantor BPBD (email tidak dimuat)")


def b_riwayat_luar(cx, kab, w):
    rw = (w or {}).get("rw")
    if not rw:
        return None
    nama = {"G": "GDACS", "E": "CEMS"}
    return [{"tgl": r[2], "jenis": r[1], "jenis_label": LABEL_JENIS.get(r[1].lower(), r[1]), "judul": re.sub(r"\s+", " ", r[3]).strip(),
             "sumber": nama[r[0]], "tautan": r[6]} for r in rw[:25]]


def theil_sen(seri):
    """Kemiringan Theil-Sen: median kemiringan semua pasangan titik [[x, y], ...] dengan x berbeda. None bila tak ada pasangan."""
    s = sorted((b[1] - a[1]) / (b[0] - a[0]) for i, a in enumerate(seri) for b in seri[i + 1:] if b[0] != a[0])
    if not s:
        return None
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


TAHUN_TAK_LENGKAP = (2024,)  # jenis DIBI: kejadian.json 2024 tak lengkap, banyak kab-jenis berisi 0 buatan (bukan "tidak ada kejadian"). 'semua' (CKAN) 2024 lengkap.


def tak_lengkap(jenis):
    return () if jenis == "semua" else TAHUN_TAK_LENGKAP


def bulat(x):
    """Pembulatan setengah ke atas (round() Python membulatkan ke genap: 1266,5 jadi 1266)."""
    return int(math.floor(x + 0.5))


def tahun_tren(seri, jenis, tahun_sumber=None):
    """Titik seri [[tahun, n]] yang dipakai tren/total: 2015-2025 tanpa tahun tak lengkap jenis itu. tahun_sumber: tahun yang ADA di sumber
    untuk jenis itu (kab lain punya baris); kab tanpa baris di tahun itu = 0 kejadian. Tahun yang tak ada sama sekali di sumber tidak diisi."""
    pts = {y: n for y, n in seri}
    for y in tahun_sumber or ():
        pts.setdefault(y, 0)
    return [[y, pts[y]] for y in sorted(pts) if 2015 <= y <= 2025 and y not in tak_lengkap(jenis)]


def tren_kata(seri, jenis, tahun_sumber=None):
    """(kata, lereng) untuk seri tahunan 2015-2025; (None, None) bila < TREN_MIN_TAHUN tahun dipakai; ("jarang", None) bila
    tahun berkejadian (> 0) < TREN_MIN_TAHUN_ADA.
    datar bila |lereng| < TREN_DATAR_REL x rerata per tahun (ambang asumsi-kebijakan di konst.py)."""
    s = tahun_tren(seri, jenis, tahun_sumber)
    if len(s) < KONST["MASALAH"]["TREN_MIN_TAHUN"]:
        return None, None
    if sum(1 for p in s if p[1] > 0) < KONST["MASALAH"]["TREN_MIN_TAHUN_ADA"]:
        return "jarang", None  # deret hampir semua nol: bukan naik/datar/turun
    ls = theil_sen(s)
    rr = sum(p[1] for p in s) / len(s)
    rel = ls / rr if rr else (0 if ls == 0 else math.copysign(1, ls))
    return ("datar" if abs(rel) < KONST["MASALAH"]["TREN_DATAR_REL"] else "naik" if ls > 0 else "turun"), round(ls, 3)


def blokt(isi, ta, yakin, sumber):
    return blok(isi, ta[0], yakin, sumber, ta[1])


def _wil(cx, kab):
    """kab punya poligon (tanpa poligon, hitungan titik-ke-kab tak sah: null, bukan 0)."""
    return kab in cx._memo("kab_set", lambda: {k for k, _ in cx.kab_poli()})


def b_gempa(cx, kab, w):
    gi, rk = cx.gempa_idx(), (cx.per_kab("gempa_risiko") or {}).get(kab)
    if gi is None and rk is None:
        return None
    ada = _wil(cx, kab) if gi else False
    a = gi[0].get(kab) if ada else None
    isi = {"n_m5_1900": (a[0] if a else 0) if ada else None, "m_maks": a[1] if a else None, "terakhir": a[2] if a else None}
    r = cx.baca("gempa_risiko")
    if rk:
        isi["risiko_lv"] = rk[6]
        isi["risiko_kelas"] = r["kelas"][rk[6]]
        isi["risiko"] = {"skor": rk[0], "kekerapan": rk[1], "besaran": rk[2], "tren": rk[3], "m_maks_100km": rk[4] or None,
                         "n_2000_2025_100km": rk[5], "yakin": "estimasi-model"}
    else:
        isi.update(risiko_lv=None, risiko_kelas=None, risiko=None)
    ik = [v for v, _ in (cx.bahaya_idx() or {}).get(kab, {}).get("gempa", [])]
    isi["indeks_inarisk"] = {"maks": round(max(ik), 2), "n_kec": len(ik)} if ik else None
    isi["arti"] = ("n_m5_1900/m_maks/terakhir = katalog USGS M>=5 sejak 1900 di dalam poligon kab (n 0 = tidak ada gempa M>=5 di poligon; m_maks/terakhir null = tidak ada gempa M>=5 di poligon kab; n null = poligon kab tak ada); "
                   "risiko = indeks USGS radius 100 km 2000-2025 (estimasi model); risiko.m_maks_100km = magnitudo maks SEMUA gempa M>=5 radius 100 km termasuk susulan "
                   "(null = tidak ada), sedangkan n_2000_2025_100km hanya gempa utama (tanpa susulan), jadi M maks bisa ada walau n 0")
    isi["yakin_bagian"] = {"katalog": "terverifikasi", "risiko": "estimasi-model" if rk else None}
    return blokt(isi, cx.tgl_arti("gempa_m5" if gi else "gempa_risiko"), "estimasi-model" if rk else "terverifikasi", "Katalog USGS M>=5 (domain publik); indeks risiko = estimasi model")


def b_karhutla(cx, kab, w):
    kd, gm, kh = (cx.per_kab("karhutla") or {}).get(kab), cx.gambut_idx(), cx.khg_idx()
    prov = cx.kode[kab]["prov"]
    ada = _wil(cx, kab)
    gambut_ha = gambut_pct = None
    if gm and ada and prov in gm[1]:
        gambut_ha = gm[0].get(kab, 0.0)
        luas = ((cx.baca("wilayah", prov) or {}).get(kab, {}).get("md") or {}).get("ld")
        gambut_pct = round(gambut_ha / luas * 100, 1) if luas else None  # ld = ha
        gambut_ha = max(1000, bulat(gambut_ha / 1000) * 1000) if gambut_ha >= 1 else 0  # estimasi grid: ribuan ha (minimal 1.000 bila ada sel)
    khg = None
    if kh and ada and prov in kh[1]:
        lst = sorted(kh[0].get(kab, []), key=lambda x: (-x[0], x[1]))
        khg = {"n": len(lst), "teratas": [{"kode": c, "nama": n, "ha": h} for h, c, n in lst[:3]]}
    if kd is None and gambut_ha is None and khg is None:
        return None
    d = cx.baca("karhutla")
    isi = {"titik_tahun": [[d["definisi"]["th0"] + i, v] for i, v in enumerate(kd["y"])] if kd else None,
           "titik_tahun_modis": [[d["definisi"]["thm0"] + i, v] for i, v in enumerate(kd["ym"])] if kd else None,
           "rasio_elnino": kd.get("el") if kd else None, "rasio_elnino_prov": kd.get("er") if kd else None,
           "tren": kd.get("tr") if kd else None, "tren_rasio": kd.get("rt") if kd else None,
           "puncak_tahun": kd.get("pk") if kd else None, "puncak_bulan": None,
           "rerata_modis_th": bulat(kd["m"]) if kd and kd.get("m") is not None else None,
           "peringkat_modis": kd.get("rk") if kd and kd.get("m") is not None and bulat(kd["m"]) > 0 else None,  # rerata tampil 0: peringkat tak bermakna
           "titik_tahun_parsial": {"viirs_tahun_sebagian": d["definisi"]["th0"], "tahun_belum_lengkap": int(d["sd"][:4])} if kd and d["sd"][5:] != "12-31" else None,
           "tren_viirs": None, "tren_viirs_lereng": None,
           "gambut_null_arti": None if gambut_ha is not None else "provinsi ini tidak punya sel gambut di sumber (hanya 8 provinsi tercakup) atau kab tanpa poligon; bukan berarti tanpa gambut",
           "khg_null_arti": None if khg is not None else "provinsi ini tidak ada di sumber KHG atau kab tanpa poligon; bukan berarti tanpa KHG",
           "yakin_bagian": {"titik_panas": "terverifikasi" if kd else None, "gambut": "estimasi-model" if gambut_ha is not None else None, "khg": "estimasi-model" if khg is not None else None},
           "gambut_ha": gambut_ha, "gambut_pct": gambut_pct, "gambut_yakin": "estimasi-model" if gambut_ha is not None else None, "khg": khg,
           "arti": ("titik_tahun = VIIRS S-NPP (2012 sebagian, tahun terakhir belum lengkap); tren = 10 tahun penuh terakhir dibanding 10 tahun pertama MODIS; "
                    "peringkat_modis = [peringkat di provinsi, jumlah kab berperingkat di sumber termasuk yang rerata ~0]; puncak_bulan null (sumber tak memuat bulan per kab); "
                    "gambut_ha = jumlah luas sel gambut (BBSDLP 1:250.000) bertitik tengah di poligon kab, dibulatkan ke ribuan ha (minimal 1.000 bila ada sel), hanya provinsi bersel gambut, selain itu null; "
                    "tren_viirs = kata tren titik VIIRS 2015-2025 per tahun (Theil-Sen; null bila < 5 tahun; jarang bila < 3 tahun bertitik), tren_viirs_lereng titik per tahun; "
                    "titik_tahun_parsial = tahun VIIRS sebagian (sensor mulai Jan 2012) dan tahun terakhir yang belum lengkap; "
                    "khg = KHG yang tepinya menyentuh kab (perkiraan dari titik sampel tepi), ha = luas KHG utuh")}
    if kd:  # tren titik VIIRS 2015-2025 (Theil-Sen, kata 'jarang' bila < 3 tahun berkejadian); VIIRS 2024 lengkap -> jenis 'semua'
        isi["tren_viirs"], isi["tren_viirs_lereng"] = tren_kata(isi["titik_tahun"], "semua")
    return blokt(isi, cx.tgl_arti("karhutla" if kd else "gambut"), "estimasi-model" if (gambut_ha is not None or khg is not None) else "terverifikasi",
                  "NASA FIRMS (MODIS, VIIRS) per kab; gambut BBSDLP via PRIMS dan KHG BRGM = estimasi")


def b_kekeringan(cx, kab, w):
    ry = cx.baca("kek_riwayat")
    NT = (ry["tahun"][1] - ry["tahun"][0] + 1) if ry else 0  # tahun seri riwayat (1991-2025 = 35)
    wl, rw = (cx.per_kab("kek_wilayah") or {}).get(kab), (cx.per_kab("kek_riwayat") or {}).get(kab)
    if wl is None and rw is None:
        return None
    isi = {"level_kini": wl["lv"] if wl else None, "level_label": LEVEL_KERING[wl["lv"]] if wl else None,
           "spi3": wl["spi3"] if wl else None, "mm3": wl["mm3"] if wl else None,
           "penduduk_status": {"waspada_atau_lebih": wl["jiwa"][0], "siaga_atau_lebih": wl["jiwa"][1], "awas": wl["jiwa"][2], "total_penduduk": wl["total"]} if wl else None,
           "riwayat": ({"risiko": rw["risiko"], "tahun_siaga": round(rw["kekerapan"] * NT), "n_tahun": NT, "bulan_siaga": rw["bulan_siaga"], "tren": rw["tren"], "dibi": rw["dibi"]}
                       if rw else None),
           "null_arti": None if wl and rw else "kab ini tidak ada di sumber %s; bukan berarti tanpa kekeringan" % ("status SPI-3 (376 kab)" if not wl else "riwayat"),
           "arti": "level_kini = tingkat tertinggi yang dialami >= 30% penduduk kab pada hari data (BATAS_WIL 0,30 di scripts/kekeringan/status.py), BUKAN tingkat tertinggi kecamatan: kab bisa Normal walau sebagian kecil penduduknya berstatus Awas; penduduk_status = penduduk kecamatan berstatus Waspada atau lebih / Siaga atau lebih / Awas (bukan jumlah korban atau terdampak); riwayat.tahun_siaga = jumlah tahun bersiaga dari n_tahun (1991-2025); riwayat null bila kab tak ada di sumber"}
    tgl, art = cx.tgl_arti("kek_meta" if cx.baca("kek_meta") else "kek_riwayat")
    return blok(isi, tgl, "estimasi-model", "Deteksi Centurisk97: SPI-3 dari curah hujan reanalisis (NASA POWER); DIBI BNPB sebagai pembanding", art)


def b_gunungapi(cx, kab, w):
    gi, g = cx.gunung_idx(), cx.baca("gunung")
    if gi is None or g is None or not _wil(cx, kab):
        return None
    pa = {x["nama"]: x for x in (cx.baca("paparan") or {}).get("gunung", [])}
    ri = (cx.baca("gunung_risiko") or {}).get("gunung", {})
    kl = (cx.baca("gunung_risiko") or {}).get("kelas", [])
    lst = []
    for j, n in sorted(gi.get(kab, [])):
        r = ri.get(n)
        lst.append({"gunung": n, "jarak_km": round(j, 1), "tinggi_m": g[n]["tinggi"],
                    "krb3_jiwa_gunung": pa[n]["zona"]["III"]["penduduk"] if n in pa else None,
                    "risiko_skor": r[0] if r else None, "risiko_kelas": kl[r[1]] if r else None, "status_kini": None})
    isi = {"daftar": lst, "radius_km": RADIUS_GUNUNG_KM,
           "arti": "daftar = gunung api yang titik puncaknya <= 50 km dari tepi poligon kab (batas disederhanakan; daftar kosong = tidak ada gunung dalam radius); "
                   "status_kini null: repo tak memuat level aktivitas"}
    return blokt(isi, cx.tgl_arti("paparan" if pa else "gunung"), "terverifikasi", "PVMBG/Badan Geologi KRB 2018 (paparan), Smithsonian GVP (risiko); jarak = hitungan geometri")


def b_pesisir(cx, kab, w):
    px = cx.pesisir_idx()
    ts = (px or {}).get(kab)
    if not ts:
        return None  # di luar 5 situs: null, bukan 0
    kls = collections.Counter(t.get("kelas") for t in ts)
    lj = sorted(t["laju"] for t in ts if t.get("laju") is not None and t.get("kelas") in ("abrasi", "akresi"))  # hanya transek nyata
    m = len(lj) // 2
    med = (lj[m] if len(lj) % 2 else (lj[m - 1] + lj[m]) / 2) if len(lj) >= 2 else None
    d = cx.baca("abrasi")
    isi = {"abrasi_m_th": round(med, 1) if med is not None else None, "transek_n": len(ts), "nyata_n": len(lj), "abrasi_n": kls["abrasi"], "akresi_n": kls["akresi"],
           "tidak_nyata_n": kls["tidak nyata"], "periode": d["metode"]["tahun"],
           "situs": sorted({t["situs"] for t in ts}),
           "arti": "median laju regresi transek NYATA (abrasi atau akresi) di dalam poligon kab (negatif = garis pantai mundur); null bila < 2 transek nyata; belum dikoreksi pasang surut; hanya 5 situs pantura Jawa, kab lain null"}
    return blokt(isi, cx.tgl_arti("abrasi"), "estimasi-model", "Landsat 1988-2025 (MNDWI) via Planetary Computer; garis dasar OSM")


def b_udara(cx, kab, w):
    d = cx.baca("udara")
    pv = ((d or {}).get("prov") or {}).get(cx.kode[kab]["prov"])
    if not pv:
        return None
    hari = sorted(pv)
    rr = [pv[h][1] for h in hari if pv[h][1] is not None]
    if not rr:
        return None
    isi = {"pm25_rerata": round(sum(rr) / len(rr), 1), "pm25_maks_harian": max(rr),
           "hari_rerata_di_atas_55_4": sum(1 for v in rr if v > 55.4),
           "jiwa_maks_di_atas_55_4": max(pv[h][0] for h in hari if pv[h][0] is not None) if any(pv[h][0] is not None for h in hari) else None,
           "n_hari": len(rr), "dari": hari[0], "sampai": hari[-1],
           "arti": "jendela %d hari terakhir, bukan klimatologi tahunan; rerata berbobot jiwa dari analisis model CAMS, tingkat PROVINSI (bukan kab); ambang 55,4 \u00b5g/m\u00b3 = batas atas kategori Sedang ISPU/AQI" % len(rr)}
    return blokt(isi, cx.tgl_arti("udara"), "estimasi-model", "Model PM2,5 harian per provinsi (level provinsi)")


def b_neraca(cx, kab, w):
    d = cx.baca("neraca")
    e = ((d or {}).get("kab") or {}).get(kab)
    if not e:
        return None  # Jawa saja
    k = e["skenario"]["klim"]
    def neg(v):
        return round(-sum(x for x in v if x < 0), 1)
    isi = {"defisit_2030": neg(k["N2030"]), "defisit_2025": neg(k["N"]),
           "bulan_defisit_2030": [i + 1 for i, x in enumerate(k["N2030"]) if x < 0],
           "versi": d["meta"]["versi"],
           "arti": "skenario iklim rerata 1991-2025; defisit = jumlah saldo bulanan negatif (juta m3) disajikan sebagai bilangan positif; 0 = tak ada bulan defisit; berkas tak bertanggal; parameter model taw_mm, alpha, k_bulan = asumsi-kebijakan, belum dikalibrasi (kalibrasi GloFAS NA-06)"}
    return blokt(isi, cx.tgl_arti("neraca"), "estimasi-model", "Neraca air kab (CHIRPS, NASA POWER; estimasi model v1)")


def b_model(cx, kab, w):
    ri = cx.risiko_idx()
    if ri is None and not cx.baca("gerbang") and not cx.baca("uji_banjir") and not cx.baca("uji_kering"):
        return None
    rk = None
    if ri and ri[0].get(kab):
        baris = ri[0][kab]
        sk = collections.Counter(b[1] for b in baris)
        dom = max(sk, key=lambda i: (sk[i], i))
        sangat = sorted((b for b in baris if b[1] == len(ri[1]) - 1), key=lambda b: (-b[0], b[2]))[:10]
        rk = {"kelas_dominan": ri[1][dom], "n_kec": len(baris), "per_kelas": {ri[1][i]: sk[i] for i in sorted(sk)},
              "risiko_maks": max(b[0] for b in baris), "kec_sangat_tinggi": [b[2] for b in sangat]}
    uji, tg = cx.uji()
    ub = (((cx.baca("uji_banjir") or {}).get("vonis") or {}).get("per_kelompok") or {}).get("banjir_longsor") or {}
    isi = {"risiko_kec": rk, "longsor_nowcast": None, "banjir_status": ub.get("label"), "uji": uji, "uji_tanggal": tg,
           "arti": "uji = vonis GLOBAL (sama untuk semua kab, bukan hasil uji per kab); risiko_kec = indeks komposit platform per kecamatan, BELUM diuji balik; uji = vonis gerbang model (lolos|gagal|belum); longsor_nowcast null: tak ada keluaran longsor di repo"}
    return blokt(isi, cx.tgl_arti("risiko_kec" if ri else "gerbang"), "estimasi-model", "Indeks risiko komposit platform (belum diuji) dan vonis uji balik")


def b_siluet(cx, kab):
    po = (cx.poli(cx.kode[kab]["prov"]) or {}).get(kab)
    return siluet(po) if po else None


NULL_ARTI = {
    "gempa": "sumber gempa tidak tersedia",
    "karhutla": "kab tidak ada di riwayat titik panas dan provinsinya tidak bersel gambut/KHG di sumber",
    "kekeringan": "kab tidak ada di sumber kekeringan (status SPI-3 376 kab, riwayat 508 kab); bukan berarti tanpa kekeringan",
    "gunungapi": "poligon kab atau titik gunung api tidak tersedia",
    "pesisir": "di luar 5 situs studi abrasi pantura Jawa (Sayung, Pekalongan, Indramayu, Subang, Muara Gembong); bukan berarti pantainya aman",
    "udara": "provinsi tidak ada di sumber PM2,5",
    "neraca_air": "di luar cakupan model neraca air (hanya 119 kab di Jawa); bukan berarti tanpa defisit air",
    "model": "indeks risiko kecamatan dan berkas uji tidak tersedia",
    "fasilitas": "di luar cakupan data sekolah dan faskes (hanya 9 provinsi) atau kab tanpa poligon; bukan berarti tanpa fasilitas",
    "siluet": "poligon kab tidak tersedia",
}


BARU = {i for ids in BLOK_SUMBER.values() for i in ids} - {"inarisk_gempa", "geo"}  # sumber B02 (tanggal dari isi berkas)


def bangun_kab(cx, kab, hilang):
    prov = cx.kode[kab]["prov"]
    w = (cx.baca("wilayah", prov) or {}).get(kab)
    p = {"v": 1, "kode": kab, "prov": prov, "nama": cx.kode[kab]["nama"]}
    for n, fn in (("wilayah", b_wilayah), ("penduduk", b_penduduk), ("sosek", b_sosek), ("irbi", b_irbi),
                  ("inarisk_kec", b_inarisk), ("kejadian", b_kejadian), ("fasilitas", b_fasilitas),
                  ("kapasitas", b_kapasitas), ("riwayat_luar", b_riwayat_luar)):
        p[n] = fn(cx, kab, w)
    for n, fn in (("gempa", b_gempa), ("karhutla", b_karhutla), ("kekeringan", b_kekeringan), ("gunungapi", b_gunungapi),
                  ("pesisir", b_pesisir), ("udara", b_udara), ("neraca_air", b_neraca), ("model", b_model)):
        p[n] = fn(cx, kab, w)
    p["siluet"] = b_siluet(cx, kab)
    p["_null_arti"] = {b: t for b, t in NULL_ARTI.items() if p.get(b) is None}  # buku menulis ini, bukan "Tidak ada data" polos
    for n, s in SATUAN.items():
        if p[n] is not None:
            p[n]["_satuan"] = s
    # sumber[]: yang benar-benar menyumbang + yang hilang (D7)
    pakai = {"kode"}
    if w is not None:
        pakai.add("wilayah")
    for blk, ids in (("wilayah", ("desa_cari",)), ("inarisk_kec", ("bahaya", "inarisk_gempa")),
                     ("kejadian", ("kejadian", "dibi")), ("fasilitas", ("sekolah", "fasilitas", "geo"))):
        if p[blk] is not None or any(i in hilang for i in ids):
            pakai.update(ids)
    for blk, ids in BLOK_SUMBER.items():
        if p[blk] is not None or any(i in hilang for i in ids):
            pakai.update(ids)
    if p["siluet"] is not None or "geo" in hilang:
        pakai.add("geo")
    if (p["wilayah"] is not None) or "wilayah" in hilang:
        pakai.add("wilayah")
    tgl = {"wilayah": cx.tgl_snapshot(), "desa_cari": (cx.baca("desa_cari") or {}).get("dibuat", "")[:10] or None,
           "kejadian": (cx.kejadian_idx() or (0, 0, 0, None))[3] or None, "dibi": (cx.baca("dibi") or {}).get("sampai")}
    p["sumber"] = []
    for i in sorted(pakai):
        e = {"nama": SUMBER[i][1], "berkas": SUMBER[i][0], "lisensi": SUMBER[i][2]}
        if i in hilang:
            e.update(tanggal=None, hilang=True)
        else:
            if i in BARU:
                e["tanggal"], e["tanggal_arti"] = cx.tgl_arti(i)
            else:
                e.update(tanggal=tgl.get(i) or cx.tgl_snapshot())
                e["tanggal_arti"] = {"desa_cari": "terbit", "dibi": "terbit", "kejadian": "akhir-cakupan"}.get(i, "snapshot-repo")
            if i == "dibi" and cx.dibi_idx():
                e["kembar_dibuang"] = cx.dibi_idx()[3].get(kab, 0)  # baris DIBI kembar (tanggal+jenis+kab+dampak inti sama) dihitung sekali
        p["sumber"].append(e)
    p["dibangun"] = max([e["tanggal"] for e in p["sumber"] if e["tanggal"]] or [""]) or None
    return p


def bangun(akar=AKAR, hanya=None):
    """-> {kode: profil}. Sumber yang berkasnya tak ada dicatat 'hilang' dan blok terkait null."""
    cx = Konteks(akar)
    hilang = set()
    for sid in SUMBER:
        if "NN" in SUMBER[sid][0]:
            if not glob.glob(cx.path(sid, "[0-9][0-9]")):
                hilang.add(sid)
        elif cx.baca(sid) is None:
            hilang.add(sid)
    prof = {k: bangun_kab(cx, k, hilang) for k in sorted(cx.kode)}  # persentil nasional: selalu semua kab, baru disaring
    masalah.pasang(prof)
    return {k: p for k, p in prof.items() if hanya is None or k == hanya}


def teks(o):
    return json.dumps(o, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"


def validasi(p):
    """Tolak profil yang melanggar skema v1 / aturan isi. Pesan menyebut angka dan sebab."""
    k = p.get("kode")
    assert isinstance(k, str) and re.fullmatch(r"\d{4}", k), f"kode '{k}' bukan 4 digit"
    assert p.get("v") == 1 and p.get("prov") == k[:2], f"{k}: v={p.get('v')} prov={p.get('prov')} (harus 1 dan {k[:2]})"
    for b in BLOK_DICT:
        assert b in p, f"{k}: blok {b} tak ada (harus ada, boleh null)"
        v = p[b]
        if v is None:
            continue
        assert isinstance(v, dict), f"{k}.{b} bukan dict"
        assert v.get("sumber"), f"{k}.{b}: sumber kosong"
        assert RE_TGL.match(v.get("tanggal") or ""), f"{k}.{b}: tanggal '{v.get('tanggal')}' bukan YYYY-MM-DD"
        assert v.get("yakin") in YAKIN, f"{k}.{b}: yakin '{v.get('yakin')}' di luar {YAKIN}"
    sl = p.get("siluet")
    assert sl is None or (isinstance(sl, str) and re.fullmatch(r"M[\d ]+Z(M[\d ]+Z)*", sl) and len(sl.encode()) <= 1000), \
        f"{k}.siluet bukan path 'M..Z' bilangan bulat <= 1000 byte ({len(sl.encode()) if isinstance(sl, str) else sl!r})"
    for r in p.get("riwayat_luar") or []:
        assert r.get("sumber") in ("GDACS", "CEMS") and RE_TGL.match(r.get("tgl") or ""), f"{k}.riwayat_luar: butir tanpa sumber/tgl {r}"
    assert p.get("sumber") and all("nama" in e and "berkas" in e and "tanggal" in e for e in p["sumber"]), f"{k}: sumber[] kosong/bocor"
    masalah.periksa(p)
    s = teks(p)
    assert len(s.encode("utf-8")) <= MAKS_BYTE, f"{k}: {len(s.encode('utf-8'))} byte > {MAKS_BYTE}"
    m = RE_BOCOR.search(s)
    assert not m, f"{k}: data pribadi/pakar bocor ke publik: '{m.group(0)}'"
    ds = (p.get("kejadian") or {}).get("dampak_12bln")
    assert ds is None or ds.get("n_kejadian", 0) > 0, f"{k}: dampak_12bln ada tapi n_kejadian=0 (harus null)"


def tulis(prof, keluar):
    d = os.path.join(keluar, "public", "data", "kemitraan", "daerah")
    os.makedirs(d, exist_ok=True)
    for k, p in prof.items():
        validasi(p)
        open(os.path.join(d, k + ".json"), "w", encoding="utf-8").write(teks(p))
    return d


# ---------------------------------------------------------------- KM-B04: ringkas.json + prov/<NN>.json (turunan murni dari 514 profil)
MAKS_RINGKAS = 120_000
MAKS_PROV = 60_000
KELAS_M = ("P1", "P2", "P3")


def _irbi25(p):
    """(skor, kelas) IRBI titik terakhir seri, atau (None, None). Skala 2025 (ambang 176)."""
    s = ((p.get("irbi") or {}).get("seri") or [None])[-1]
    return (s[1], s[2]) if s else (None, None)


def _r2(x):
    """Skor gabungan dibulatkan 2 desimal setengah ke atas, HANYA untuk keluaran agregat (kelas tetap dari skor 4 desimal di profil kab)."""
    return None if x is None else bulat(x * 100) / 100


ARTI_SKOR = "skor gabungan 0-1 (rata-rata berbobot persentil komponen; bobot asumsi-kebijakan, belum dikalibrasi), dibulatkan 2 desimal setengah ke atas hanya di keluaran agregat ini (kelas P1/P2/P3 tetap dari skor 4 desimal di profil kab)"


def _daun_angka(o, pre=""):
    """Jalur kunci daun angka (indeks list dibuang, bool bukan angka), mengabaikan _arti/_satuan."""
    if isinstance(o, dict):
        for k, v in o.items():
            if not k.startswith("_"):
                yield from _daun_angka(v, pre + ("." if pre else "") + k)
    elif isinstance(o, list):
        for v in o:
            yield from _daun_angka(v, pre)
    elif isinstance(o, (int, float)) and not isinstance(o, bool):
        yield pre


def _punya_entri(jalur, kamus):
    """Jalur (atau leluhurnya) ada di kamus."""
    t = jalur.split(".")
    return any(".".join(t[:i]) in kamus for i in range(1, len(t) + 1))


def _top3(p):
    """3 bahaya skor tertinggi dari masalah_skor; skor null tidak ikut. Seri: nama bahaya menaik. Tanpa skor sama sekali -> None (bukan karangan)."""
    ada = sorted(((e["skor"], b) for b, e in (p.get("masalah_skor") or {}).items() if e.get("skor") is not None), key=lambda x: (-x[0], x[1]))
    return [[b, _r2(sk)] for sk, b in ada[:3]] or None


def _n_masalah(p):
    """[n P1, n P2, n P3] jumlah masalah otomatis; None bila tak ada bahaya berskor (tak dinilai, bukan 0)."""
    if _top3(p) is None:
        return None
    c = collections.Counter(m["kelas"] for m in p["masalah"])
    return [c[k] for k in KELAS_M]


def _kap_n(p):
    return masalah._kap(p)  # 0-5 (perda PB, perda BPBD, RPB, renkon, BPBD terbentuk); None bila ada yang tak diketahui


def _tgl_agregat(prof):
    return max((p["dibangun"] for p in prof.values() if p.get("dibangun")), default=None)


def ringkas(prof):
    """514 baris untuk daftar tampilan Daerah. Kejadian = total 'semua' (CKAN, seri berakhir 2024; 0 kab punya 2025): dipilih karena jenis DIBI tanpa 2024 hanya batas bawah."""
    baris = []
    for k in sorted(prof):
        p = prof[k]
        sk, kl = _irbi25(p)
        kj = ((p.get("kejadian") or {}).get("total_2015_2025") or {}).get("semua")
        baris.append({"k": k, "n": p["nama"], "p": p["prov"], "i": kl, "y": (p.get("irbi") or {}).get("yakin"), "b": _top3(p), "m": _n_masalah(p), "j": kj, "c": _kap_n(p)})
    return {"v": 1, "tanggal": _tgl_agregat(prof), "tanggal_arti": "tanggal data terbaru di 514 profil daerah",
            "sumber": "Turunan 514 profil daerah (daerah/<kab4>.json): IRBI, masalah_skor, kejadian CKAN, regulasi",
            "_arti": {"k": "kode IRBI 4 digit", "n": "nama kab/kota", "p": "kode provinsi 2 digit",
                      "i": "kelas IRBI 2025: 1 = Tinggi, 0 = Sedang, null = tak ada data",
                      "y": "tingkat keyakinan skor IRBI kab: resmi, atau estimasi-model bila skor 2025 sama dengan >= 2 kab lain se-provinsi (kemungkinan nilai provinsi); null = tak ada data",
                      "b": "hingga 3 bahaya skor masalah tertinggi [[bahaya, skor 0-1]]; urut skor menurun (urut dari skor 4 desimal; seri nama bahaya menaik); bahaya berskor null tidak ikut; null = tak ada bahaya berskor (bukan karangan). Skor: " + ARTI_SKOR + "",
                      "m": "[n P1, n P2, n P3] masalah otomatis; null = tak ada bahaya berskor (tak dinilai), bukan 0",
                      "j": "jumlah kejadian 2015-2024 jenis 'semua' (CKAN; 2025 belum ada di sumber); null = tak tercatat",
                      "c": "kapasitas tercatat 0-5 dari 5 (perda PB, perda BPBD, RPB, renkon, BPBD terbentuk); null = ada yang tak diketahui"},
            "_satuan": {"j": "kejadian", "m": "masalah", "c": "dari 5 butir", "b": ARTI_SKOR, "i": "kelas biner IRBI (tanpa satuan)"},
            "baris": baris}


def prov(prof, nama_prov=None):
    """{NN: profil provinsi}. Agregat tak menjumlah null sebagai 0: n_ikut menyebut berapa kab yang punya angkanya."""
    nama_prov = nama_prov or {}
    per = collections.defaultdict(list)
    for k in sorted(prof):
        per[prof[k]["prov"]].append(k)
    keluar = {}
    for nn, ks in sorted(per.items()):
        kab, pend, tw, tp, mn = [], [], 0.0, 0, [0, 0, 0]
        for k in ks:
            p = prof[k]
            sk, kl = _irbi25(p)
            pd = (p.get("penduduk") or {}).get("total")
            if pd is not None:
                pend.append(pd)
            if sk is not None and pd:
                tw += sk * pd; tp += pd
            m = _n_masalah(p)
            if m:
                mn = [a + b for a, b in zip(mn, m)]
            kab.append({"k": k, "n": p["nama"], "i": sk, "c": kl, "y": (p.get("irbi") or {}).get("yakin"), "pd": pd, "m": m,
                        "p1": [{"id": x["auto_id"], "j": x["judul"], "s": _r2(x["skor"])} for x in p["masalah"] if x["kelas"] == "P1"]})
        kab.sort(key=lambda r: (r["i"] is None, -(r["i"] or 0), r["k"]))
        n_i = sum(1 for r in kab if r["i"] is not None and r["pd"])
        keluar[nn] = {"v": 1, "prov": nn, "nama": nama_prov.get(nn), "tanggal": _tgl_agregat({k: prof[k] for k in ks}),
                      "tanggal_arti": "tanggal data terbaru di profil kab provinsi ini",
                      "sumber": "Turunan profil daerah kab/kota provinsi ini (IRBI, penduduk IRBI paparan, masalah otomatis)",
                      "n_kab": len(ks),
                      "penduduk": {"total": sum(pend) if pend else None, "n_ikut": len(pend)},
                      "irbi": {"rerata_tertimbang": bulat(tw / tp * 10) / 10 if tp else None, "n_ikut": n_i,
                               "n_estimasi": sum(1 for r in kab if r["i"] is not None and r["pd"] and r["y"] == "estimasi-model"),
                               "tinggi_n": sum(1 for r in kab if r["c"] == 1), "sedang_n": sum(1 for r in kab if r["c"] == 0),
                               "tanpa_data_n": sum(1 for r in kab if r["c"] is None)},
                      "masalah_n": dict(zip(KELAS_M, mn)),
                      "_arti": {"kab": "urut skor IRBI 2025 menurun (null terakhir), seri kode",
                                "kab.k": "kode IRBI 4 digit", "kab.n": "nama kab/kota",
                                "kab.i": "skor IRBI 2025 (skala baru, ambang kelas Tinggi 176); null = tak ada data",
                                "kab.c": "kelas IRBI 2025: 1 = Tinggi, 0 = Sedang, null = tak ada data; dipakai warna peta",
                                "kab.y": "keyakinan skor IRBI kab: resmi, atau estimasi-model bila skor 2025 sama dengan >= 2 kab lain se-provinsi (kemungkinan nilai provinsi); null = tak ada data",
                                "kab.pd": "penduduk kab (IRBI paparan penduduk); null = tak ada data, bukan 0",
                                "kab.m": "[n P1, n P2, n P3] masalah otomatis; null = tak ada bahaya berskor (tak dinilai), bukan 0",
                                "kab.p1": "masalah P1 kab: id auto_id, j judul; s = " + ARTI_SKOR,
                                "n_kab": "jumlah kab/kota provinsi ini di kode.json",
                                "penduduk.total": "jumlah penduduk kab yang punya angkanya (n_ikut dari n_kab); kab null tidak dihitung 0",
                                "penduduk.n_ikut": "jumlah kab yang punya angka penduduk",
                                "irbi.rerata_tertimbang": "rerata skor IRBI 2025 tertimbang penduduk, hanya kab yang punya skor dan penduduk (n_ikut); n_estimasi di antaranya berskor estimasi-model (kemungkinan nilai provinsi, bukan nilai kab), jadi rerata ini lebih lemah bila n_estimasi besar",
                                "irbi.n_ikut": "jumlah kab yang ikut rerata (punya skor dan penduduk)",
                                "irbi.n_estimasi": "dari n_ikut, jumlah kab berskor estimasi-model",
                                "irbi.tinggi_n": "jumlah kab kelas IRBI Tinggi", "irbi.sedang_n": "jumlah kab kelas IRBI Sedang",
                                "irbi.tanpa_data_n": "jumlah kab tanpa data IRBI",
                                "masalah_n": "jumlah masalah otomatis per kelas, hanya kab yang dinilai"},
                      "_satuan": {"n_kab": "kab/kota", "penduduk.total": "jiwa", "penduduk.n_ikut": "kab", "irbi.rerata_tertimbang": "skor IRBI 2025 (ambang kelas Tinggi 176)",
                                  "irbi.n_ikut": "kab", "irbi.n_estimasi": "kab", "irbi.tinggi_n": "kab", "irbi.sedang_n": "kab", "irbi.tanpa_data_n": "kab",
                                  "masalah_n": "masalah", "kab.i": "skor IRBI 2025", "kab.c": "kelas biner IRBI (tanpa satuan)", "kab.pd": "jiwa", "kab.m": "masalah",
                                  "kab.p1.s": ARTI_SKOR},
                      "kab": kab}
    return keluar


def validasi_agregat(r, pv, prof, kode):
    """Tolak ringkas/prov yang melanggar spek KM-B04. Pesan menyebut angka dan sebab."""
    n = len(teks(r).encode("utf-8"))
    assert n <= MAKS_RINGKAS, f"ringkas.json {n} byte > {MAKS_RINGKAS}"
    assert [b["k"] for b in r["baris"]] == sorted(prof), f"ringkas {len(r['baris'])} baris != {len(prof)} profil"
    for b in r["baris"]:
        p = prof[b["k"]]
        assert "siluet" not in b and set(b) == {"k", "n", "p", "i", "y", "b", "m", "j", "c"}, f"{b['k']}: kunci ringkas {sorted(b)} bocor/kurang"
        ada = {x: e["skor"] for x, e in p["masalah_skor"].items() if e.get("skor") is not None}
        if not ada:
            assert b["b"] is None and b["m"] is None, f"{b['k']}: tanpa bahaya berskor tapi b={b['b']} m={b['m']} (karangan)"
        else:
            assert b["b"] and len(b["b"]) == min(3, len(ada)) and all(_r2(ada.get(x)) == s for x, s in b["b"]), f"{b['k']}: bahaya teratas {b['b']} tak cocok masalah_skor {ada}"
            sk = [s for _, s in b["b"]]
            assert sk == sorted(sk, reverse=True) and len({x for x, _ in b["b"]}) == len(b["b"]), f"{b['k']}: b tak urut/ganda {b['b']}"
            assert min(sk) >= max([_r2(s) for x, s in ada.items() if x not in {y for y, _ in b["b"]}] or [0]), f"{b['k']}: bahaya skor lebih tinggi terlewat dari {b['b']}"
            assert sum(b["m"]) == len(p["masalah"]), f"{b['k']}: m {b['m']} != {len(p['masalah'])} masalah"
        assert b["i"] in (0, 1, None) and (b["c"] is None or 0 <= b["c"] <= 5), f"{b['k']}: i={b['i']} c={b['c']} di luar rentang"
    for j in set(_daun_angka(r["baris"])):
        assert _punya_entri(j, r["_satuan"]) and _punya_entri(j, r["_arti"]), f"ringkas: kunci angka '{j}' tanpa entri _satuan/_arti"
    per = collections.Counter(v["prov"] for v in kode.values())
    assert sorted(pv) == sorted(per), f"prov {sorted(pv)} != kode.json {sorted(per)}"
    for nn, q in pv.items():
        for j in set(_daun_angka({k_: v_ for k_, v_ in q.items() if k_ != "v"})):  # v = versi skema, bukan ukuran
            assert _punya_entri(j, q["_satuan"]) and _punya_entri(j, q["_arti"]), f"prov {nn}: kunci angka '{j}' tanpa entri _satuan/_arti"
        assert len(q["kab"]) == q["n_kab"] == per[nn], f"prov {nn}: {len(q['kab'])} kab, n_kab {q['n_kab']}, kode.json {per[nn]}"
        assert {r_["k"] for r_ in q["kab"]} == {k for k, v in kode.items() if v["prov"] == nn}, f"prov {nn}: daftar kab tak sama dengan kode.json"
        ni = [r_["i"] for r_ in q["kab"] if r_["i"] is not None]
        assert ni == sorted(ni, reverse=True) and all(r_["i"] is not None for r_ in q["kab"][:len(ni)]), f"prov {nn}: kab tak urut IRBI menurun / null tak di akhir"
        assert q["irbi"]["tinggi_n"] + q["irbi"]["sedang_n"] + q["irbi"]["tanpa_data_n"] == q["n_kab"], f"prov {nn}: kelas IRBI tak berjumlah n_kab"
        assert q["penduduk"]["n_ikut"] <= q["n_kab"] and (q["penduduk"]["total"] is None) == (q["penduduk"]["n_ikut"] == 0), f"prov {nn}: penduduk null/n_ikut tak konsisten"
        assert len(teks(q).encode("utf-8")) <= MAKS_PROV, f"prov {nn}: {len(teks(q).encode('utf-8'))} byte > {MAKS_PROV}"
        for r_ in q["kab"]:
            assert all(m_["id"].startswith("auto-" + r_["k"]) for m_ in r_["p1"]) and len(r_["p1"]) == (r_["m"] or [0])[0], f"{r_['k']}: p1 {len(r_['p1'])} != m {r_['m']}"


def nama_provinsi(akar):
    d = os.path.join(akar, "public", "data", "meta.json")
    return (json.load(open(d, encoding="utf-8")).get("provinsi") if os.path.exists(d) else None) or {}


def tulis_agregat(prof, keluar, akar=AKAR):
    d = os.path.join(keluar, "public", "data", "kemitraan")
    r, pv = ringkas(prof), prov(prof, nama_provinsi(akar))
    validasi_agregat(r, pv, prof, Konteks(akar).kode)
    os.makedirs(os.path.join(d, "prov"), exist_ok=True)
    open(os.path.join(d, "ringkas.json"), "w", encoding="utf-8").write(teks(r))
    for nn, q in pv.items():
        open(os.path.join(d, "prov", nn + ".json"), "w", encoding="utf-8").write(teks(q))
    return len(r["baris"]), len(pv)


# ---------------------------------------------------------------- jaga (DT 7.1: dijalankan sesudah bangun penuh, sebelum commit)
def _tgl_berkas(t):
    """{kunci: tanggal} dari isi satu berkas JSON: 'dibangun'/'tanggal' tingkat atas + tanggal tiap sumber[] (kunci = nama)."""
    o = json.loads(t)
    d = {"_berkas": o.get("dibangun") or o.get("tanggal")}
    if isinstance(o.get("sumber"), list):
        d.update({"sumber:" + e["nama"]: e.get("tanggal") for e in o["sumber"] if isinstance(e, dict) and "nama" in e})
    return d


def jaga(baru, lama, n_kab, maks=None):
    """Murni. baru/lama = {jalur relatif: isi teks}; lama tanpa jalur = berkas baru (dilewati). -> daftar masalah (kosong = aman).
    Tolak: berkas daerah != n_kab, ringkas.json/prov hilang, ukuran > maks, tanggal MUNDUR (lebih lama dari versi lama;
    tanggal lama ada tapi baru null juga mundur). Sama atau maju lolos."""
    m = []
    dae = [j for j in baru if j.startswith("daerah/")]
    if len(dae) != n_kab:
        m.append(f"berkas daerah {len(dae)} != {n_kab}")
    if "ringkas.json" not in baru:
        m.append("ringkas.json hilang")
    pv = [j for j in baru if j.startswith("prov/")]
    if len(pv) != 38:
        m.append(f"berkas prov {len(pv)} != 38")
    for j in sorted(baru):
        n = len(baru[j].encode("utf-8"))
        mk = maks or (MAKS_RINGKAS if j == "ringkas.json" else MAKS_PROV if j.startswith("prov/") else MAKS_BYTE)
        if n > mk:
            m.append(f"{j}: {n} byte > {mk}")
        if j in lama:
            tl, tb = _tgl_berkas(lama[j]), _tgl_berkas(baru[j])
            for k, tgl in tl.items():
                if tgl and (tb.get(k) or "") < tgl:
                    m.append(f"{j}: tanggal mundur di {k}: {tgl} -> {tb.get(k)}")
    return m


def jaga_git(akar=AKAR):
    import subprocess
    d = os.path.join(akar, "public", "data", "kemitraan")
    rel = [os.path.relpath(f, d) for f in glob.glob(os.path.join(d, "daerah", "*.json")) + glob.glob(os.path.join(d, "prov", "*.json"))]
    if os.path.exists(os.path.join(d, "ringkas.json")):
        rel.append("ringkas.json")
    baru = {j: open(os.path.join(d, j), encoding="utf-8").read() for j in rel}
    lama = {}
    for j in baru:
        r = subprocess.run(["git", "-C", akar, "show", "HEAD:public/data/kemitraan/" + j], capture_output=True, text=True, encoding="utf-8")
        if r.returncode == 0:  # tak ada di HEAD = berkas baru, dilewati
            lama[j] = r.stdout
    m = jaga(baru, lama, len(Konteks(akar).kode))
    if m:
        sys.exit("JAGA TOLAK (%d masalah):\n  " % len(m) + "\n  ".join(m[:20]))
    print(f"JAGA OK: {len(baru)} berkas, {len(lama)} dibandingkan dengan HEAD, tanggal tidak mundur, maks {max(len(t.encode()) for t in baru.values())} byte")


# ---------------------------------------------------------------- cek
FIX = os.path.join(AKAR, "tests", "kemitraan", "fixtures", "profil_mini")


def tolak(fn, bagian, *a):
    try:
        fn(*a)
    except AssertionError as e:
        assert bagian in str(e), f"ditolak tapi dengan sebab lain: {e}"
        return
    raise AssertionError(f"input salah LOLOS ({bagian})")


def cek():
    a, b = bangun(), bangun()
    ta, tb = {k: teks(v) for k, v in a.items()}, {k: teks(v) for k, v in b.items()}
    assert ta == tb, "tidak deterministik: dua kali bangun beda byte"
    n4 = len(Konteks(AKAR).kode)
    assert len(a) == n4 == 514, f"{len(a)} berkas != 514 (kode.json {n4})"  # D1 (profil prov 38 = KM-B04)
    for p in a.values():
        validasi(p)  # D1 skema+ukuran, D4 blok punya sumber/tanggal/yakin, D5 tanpa email/62/id pakar
    d = os.path.join(AKAR, "public", "data", "kemitraan", "daerah")
    ada = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(d, "[0-9][0-9][0-9][0-9].json")))
    assert ada == sorted(a), f"berkas di disk {len(ada)} != {len(a)}: jalankan tanpa --cek"
    for k, t in ta.items():
        assert open(os.path.join(d, k + ".json"), encoding="utf-8").read() == t, f"{k}.json di disk beda dari hasil bangun; jalankan tanpa --cek"
    # D2
    assert a["3171"]["nama"] == "Kota Administrasi Jakarta Pusat", a["3171"]["nama"]
    # D3: dampak_12bln null <=> tak ada baris DIBI kab itu (bukan 0)
    cx = Konteks(AKAR)
    ba = cx.dibi_idx()[0]
    for k, p in a.items():
        kj = p["kejadian"] or {}
        assert (kj.get("dampak_12bln") is None) == (not ba.get(k)), f"{k}: dampak_12bln null != tanpa-baris-DIBI ({len(ba.get(k, []))} baris)"
    n_null = sum(1 for p in a.values() if not (p["kejadian"] or {}).get("dampak_12bln"))
    assert 0 < n_null < 514, f"dampak null di {n_null} kab; harus ada yang null dan ada yang berisi"
    # dedup baris kembar DIBI
    base = {"tanggal": "2025-12-09", "jenis": "Kebakaran", "kab": "X", "kejadian": 1}
    kembar = [dict(base, meninggal=22, mengungsi=21), dict(base, meninggal=22, mengungsi=21, terdampak=54, f_umum=3)]
    dd = dedup_dibi(kembar)
    assert len(dd) == 1 and dd[0].get("terdampak") == 54, f"kembar tidak jadi 1 (jadi {len(dd)}) / bukan baris terlengkap: {dd}"
    beda = [dict(base, meninggal=22, mengungsi=21), dict(base, meninggal=3, mengungsi=5)]
    assert len(dedup_dibi(beda)) == 2, "dua kejadian berbeda di tanggal sama tak boleh digabung"
    cil = [dict(base, meninggal=1, terdampak=84, rr_ringan=21), dict(base, meninggal=1, rr_sedang=2, f_kantor=1)]
    assert len(dedup_dibi(cil)) == 2, "kolom saling lepas (kasus Cilacap) tak boleh digabung"
    nol = [dict(base, terdampak=5), dict(base, terdampak=9)]
    assert len(dedup_dibi(nol)) == 2, "baris berinti nol tapi kolom lain beda tak boleh digabung"
    assert len(dedup_dibi([dict(base, terdampak=5), dict(base, terdampak=5)])) == 1, "baris identik penuh berinti nol harus jadi 1"
    d31 = a["3171"]["kejadian"]["dampak_12bln"]
    assert (d31["meninggal"], d31["mengungsi"], d31["n_kejadian"]) == (27, 39, 9), f"3171 nyata: {d31}"
    assert len(a["3171"]["kejadian"]["besar"]) == len({(x["tgl"], x["jenis"], x["meninggal"]) for x in a["3171"]["kejadian"]["besar"]}), "besar[] ganda"
    kemb = {k: e["kembar_dibuang"] for k, p in a.items() for e in p["sumber"] if "kembar_dibuang" in e}
    assert kemb["3171"] == 1, f"3171 kembar dibuang {kemb['3171']} != 1"
    # IRBI 2025 sama untuk 4 kota DKI: disalin apa adanya, yakin turun; 3172 (beda) tetap resmi
    assert [a[k]["irbi"]["yakin"] for k in ("3171", "3172", "3173", "3174", "3175")] == ["estimasi-model", "resmi"] + ["estimasi-model"] * 3
    assert a["3171"]["irbi"]["seri"][-1] == [2025, 54.9, 0, 176] and a["3171"]["irbi"]["seri"][0][3] == 144
    for p in a.values():
        pk = (p["penduduk"] or {}).get("per_km2")
        assert pk is None or isinstance(pk, int), f"{p['kode']}: per_km2 {pk!r} bukan bilangan bulat"
        for r in p["riwayat_luar"] or []:
            assert "  " not in r["judul"] and r["jenis_label"], f"{p['kode']}: riwayat_luar judul/label {r}"
        f = p["fasilitas"]
        assert f is None or isinstance(f["cakupan"]["sekolah_siswa_prov"], list)
    assert a["6211"]["riwayat_luar"][0]["jenis_label"] == "kebakaran hutan"
    assert a["6211"]["kejadian"]["parsial"] == {"tahun": 2026, "sampai": "2026-10-12"}, a["6211"]["kejadian"]["parsial"]
    # ---- KM-B02
    assert (a["6211"]["karhutla"]["gambut_ha"] or 0) > 0, f"D6: 6211 gambut_ha {a['6211']['karhutla']['gambut_ha']!r} harus > 0"
    # ---- KM-B03
    assert any(m["B"] == "karhutla" for m in a["6211"]["masalah"]), f"D6: 6211 tanpa masalah karhutla ({[m['auto_id'] for m in a['6211']['masalah']]})"
    # tiap jenis DIBI terpetakan atau dikecualikan; yang dikecualikan = 219 baris (217 meninggal, 6.403 mengungsi) di snapshot ini
    dm = cx.baca("dibi")["kejadian"]
    cek_jenis_dibi({r["jenis"] for r in dm})
    bk_ = [r for r in dm if r["jenis"] in JENIS_DIBI_BUKAN_BAHAYA]
    assert (len(bk_), sum(r.get("meninggal", 0) for r in bk_), sum(r.get("mengungsi", 0) for r in bk_)) == (219, 217, 6403), \
        f"jenis bukan-bahaya: {(len(bk_), sum(r.get('meninggal', 0) for r in bk_), sum(r.get('mengungsi', 0) for r in bk_))} != (219, 217, 6403): periksa JENIS_DIBI_BUKAN_BAHAYA"
    tolak(cek_jenis_dibi, "belum dipetakan", {"Banjir", "Jenis Baru DIBI"})
    for k, p in a.items():  # dampak per bahaya dihitung ulang dari baris DIBI (dedup) tanpa JENIS_DIBI_BAHAYA.get
        dbb = (p["kejadian"] or {}).get("dampak_12bln_bahaya")
        rows = ba.get(k) or []
        assert (dbb is None) == (not rows), f"{k}: dampak_12bln_bahaya null != tanpa baris DIBI"
        for b in {b for r in rows for b in JENIS_DIBI_BAHAYA.get(r["jenis"], ())}:
            m_ = sum(r.get("meninggal", 0) for r in rows if b in JENIS_DIBI_BAHAYA.get(r["jenis"], ()))
            assert dbb[b]["meninggal"] == m_, f"{k}.{b}: meninggal {dbb[b]['meninggal']} != {m_}"
        for r in rows:
            if r["jenis"] == "Banjir dan Tanah Longsor":
                assert "banjir" in dbb and "longsor" in dbb, f"{k}: 'Banjir dan Tanah Longsor' harus dihitung di banjir DAN longsor (ganda)"
    assert sum(1 for p in a.values() if (p["kejadian"] or {}).get("dampak_12bln_bahaya")) > 100, "dampak_12bln_bahaya hampir kosong"
    # gunung <= 50 km: kab sekitar Merapi terdeteksi, Jakarta Barat tidak punya gunung dalam radius
    for k in ("3404", "3308", "3310", "3309"):
        mj = [x["jarak_km"] for x in a[k]["gunungapi"]["daftar"] if x["gunung"] == "Merapi"]
        assert mj and mj[0] <= RADIUS_GUNUNG_KM, f"{k}: Merapi tidak terdeteksi dalam 50 km ({mj})"
    assert all(x["jarak_km"] <= RADIUS_GUNUNG_KM for p in a.values() for x in (p["gunungapi"] or {"daftar": []})["daftar"]), "gunung > 50 km lolos"
    assert a["3173"]["gunungapi"]["daftar"] == [], "Jakarta Barat: tak ada gunung dalam 50 km (daftar kosong, bukan null)"
    # pesisir: hanya kab di 5 situs; non-pesisir null
    ps = sorted(k for k, p in a.items() if p["pesisir"])
    assert ps and all(k[:2] in ("32", "33") for k in ps) and len(ps) <= 10, f"pesisir non-null di luar situs pantura Jawa: {ps}"
    assert a["3404"]["pesisir"] is None and a["6211"]["pesisir"] is None and a["3321"]["pesisir"]["abrasi_m_th"] < 0, "pesisir: Sleman/Pulang Pisau harus null, Demak abrasi (negatif)"
    # neraca: Jawa saja, defisit tidak negatif
    assert a["6211"]["neraca_air"] is None and a["3404"]["neraca_air"]["defisit_2030"] >= 0, "neraca_air: 6211 null, 3404 berisi"
    # siluet: ada untuk semua kab berpoligon, <= 1 KB
    assert sum(1 for p in a.values() if p["siluet"] is None) < 10, "terlalu banyak kab tanpa siluet"
    # model.uji: nilai sah, longsor belum, identik antar kab (vonis global)
    uj = {json.dumps(p["model"]["uji"], sort_keys=True) for p in a.values()}
    assert len(uj) == 1, "model.uji berbeda antar kab"
    u0 = a["6211"]["model"]["uji"]
    assert set(u0.values()) <= {"lolos", "gagal", "belum"} and u0["longsor"] == "belum", u0
    assert a["6211"]["model"]["longsor_nowcast"] is None and a["6211"]["model"]["risiko_kec"]["n_kec"] > 0
    # udara level provinsi: kab satu provinsi sama nilainya; estimasi-model
    assert a["3321"]["udara"]["pm25_rerata"] == a["3326"]["udara"]["pm25_rerata"] and a["3321"]["udara"]["yakin"] == "estimasi-model"
    # tren Theil-Sen
    assert theil_sen([[0, 0], [1, 1], [2, 2], [3, 3], [4, 100]]) == 1, "Theil-Sen harus kebal pencilan"
    assert theil_sen([[0, 5]]) is None
    assert tren_kata([[2015 + i, 10 + 5 * i] for i in range(6)], "banjir")[0] == "naik"
    assert tren_kata([[2015 + i, 40 - 5 * i] for i in range(6)], "banjir")[0] == "turun"
    assert tren_kata([[2015 + i, 10] for i in range(6)], "banjir")[0] == "datar"
    assert tren_kata([[2015 + i, 10 + i] for i in range(4)], "banjir") == (None, None), "< 5 tahun harus null"
    assert tren_kata([[2010 + i, i] for i in range(5)], "banjir") == (None, None), "tahun di luar 2015-2025 tak dihitung"
    # B1: 2024 hanya dikecualikan untuk jenis DIBI; 'semua' (CKAN) memakainya
    s24 = [[2015 + i, 5] for i in range(4)] + [[2024, 5]]
    assert tren_kata(s24, "cuaca") == (None, None) and tren_kata(s24, "semua")[0] == "datar", "2024: DIBI dikecualikan, 'semua' dipakai"
    # B2: tahun ada di sumber tanpa baris kab = 0; tahun tak ada di sumber tidak diisi
    assert tahun_tren([[2016, 3], [2018, 3]], "banjir", [2015, 2016, 2017, 2018, 2024, 2030]) == [[2015, 0], [2016, 3], [2017, 0], [2018, 3]], "isi 0 hanya tahun sumber dalam rentang, tanpa 2024"
    assert tahun_tren([[2016, 3], [2018, 3]], "banjir") == [[2016, 3], [2018, 3]], "tanpa tahun_sumber tak ada pengisian"
    assert tren_kata([[2019, 6], [2020, 6], [2021, 7]], "banjir", [2017, 2018, 2019, 2020, 2021])[0] == "naik", "nol terisi sebelum 2019 membuat naik"
    assert tren_kata([[2020, 6], [2021, 6]], "banjir", [2017, 2018, 2019, 2020, 2021]) == ("jarang", None), "2 tahun berkejadian = jarang"
    assert tren_kata([[2015 + i, 0] for i in range(8)], "banjir") == ("jarang", None), "deret nol = jarang, bukan datar"
    assert tren_kata([[2015, 4], [2016, 0], [2017, 4], [2018, 4], [2019, 0]], "banjir")[0] in ("naik", "datar", "turun"), "3 tahun berkejadian: dinilai biasa"
    assert tren_kata([[2015, 4], [2016, 0], [2017, 4], [2018, 0], [2019, 0]], "banjir") == ("jarang", None), "2 tahun berkejadian dari 5: jarang"
    assert tren_kata([[2020, 6], [2021, 6]], "banjir") == (None, None)
    # half-up
    assert (bulat(1266.5), bulat(0.5), bulat(0.4), bulat(2.5), bulat(0)) == (1267, 1, 0, 3, 0), "pembulatan setengah ke atas"
    # V1: 2024 tak lengkap (nol buatan) dikeluarkan dari tren dan total
    naik_nol24 = [[2015 + i, 10 + 2 * i] for i in range(9)] + [[2024, 0]]
    assert tren_kata(naik_nol24, "cuaca")[0] == "naik", "nol buatan 2024 tak boleh membalik tren"
    assert tren_kata([[2015 + i, 10 + 2 * i] for i in range(4)] + [[2024, 0]], "cuaca") == (None, None), "4 tahun + 2024 = < 5 tahun dipakai"
    kix = cx.kejadian_idx()
    n_ts = n_tren = 0
    for k, p in a.items():  # SEMUA kab: total/tren dihitung ulang dari sumber mentah secara terpisah dari tahun_tren()
        kj = p["kejadian"] or {}
        for j, v in (kj.get("tahunan") or {}).items():
            tl = () if j == "semua" else (2024,)
            tt = sum(n for y, n in v if 2015 <= y <= 2025 and y not in tl)
            assert (kj["total_2015_2025"] or {}).get(j, tt) == tt, f"{k}.{j}: total salah (2024 hanya dikecualikan untuk jenis DIBI)"
            rg = (kj["tren_rentang"] or {}).get(j)
            assert rg is None or (2015 <= rg[0] <= rg[1] <= 2025 and (j == "semua" or rg[1] != 2024)), f"{k}.{j}: tren_rentang {rg}"
            mentah = dict(kix[0][k][j])
            pts = {int(y): n for y, n in mentah.items()}
            for y in kix[4][j]:
                pts.setdefault(y, 0)  # tahun ada di sumber, kab tanpa baris = 0
            dipakai = sorted((y, n) for y, n in pts.items() if 2015 <= y <= 2025 and y not in tl)
            if len(dipakai) < KONST["MASALAH"]["TREN_MIN_TAHUN"]:
                assert kj["tren"][j] is None and rg is None, f"{k}.{j}: < 5 tahun tapi tren {kj['tren'][j]}"
            else:
                ada_ = sum(1 for _, n in dipakai if n > 0)
                assert (kj["tren"][j] == "jarang") == (ada_ < KONST["MASALAH"]["TREN_MIN_TAHUN_ADA"]), f"{k}.{j}: tren {kj['tren'][j]} dengan {ada_} tahun berkejadian"
                assert kj["tren"][j] in ("naik", "datar", "turun", "jarang") and not (kj["tren"][j] == "datar" and ada_ < 3), f"{k}.{j}: datar dengan {ada_} tahun berkejadian"
                assert kj["tren_lereng"][j] == (None if ada_ < 3 else round(theil_sen([list(t) for t in dipakai]), 3)), f"{k}.{j}: lereng {kj['tren_lereng'][j]} != hitung ulang dari sumber"
                assert rg == [dipakai[0][0], dipakai[-1][0]], f"{k}.{j}: rentang {rg} != {dipakai[0][0]}-{dipakai[-1][0]}"
                n_tren += 1
            n_ts += any(y not in dict(v) for y, _ in dipakai)
    assert n_ts > 0 and n_tren > 1000, f"pengisian 0 tak pernah terjadi ({n_ts}) / vonis tren terlalu sedikit ({n_tren})"
    assert a["2171"]["kejadian"]["tren"]["longsor"] == "naik" and a["1209"]["kejadian"]["tren"]["cuaca"] == "datar", \
        (a["1209"]["kejadian"]["tren"], a["2171"]["kejadian"]["tren"])  # 1209 cuaca "naik" hanya sebelum tahun tanpa baris dihitung 0
    assert a["1209"]["kejadian"]["tren_rentang"]["semua"][1] == 2024, "'semua' (CKAN) 2024 lengkap: dipakai"
    assert a["1107"]["kekeringan"]["level_kini"] == 0 and a["1107"]["kekeringan"]["penduduk_status"]["awas"] > 0, "1107: Normal walau ada penduduk Awas (< 30%)"
    # V3: pesisir hanya transek nyata, null bila < 2
    for k in ps:
        pe = a[k]["pesisir"]
        assert (pe["abrasi_m_th"] is None) == (pe["nyata_n"] < 2) and pe["nyata_n"] <= pe["transek_n"], f"{k}: {pe}"
    assert a["3327"]["pesisir"]["abrasi_m_th"] is None, a["3327"]["pesisir"]
    # V4-V6, S1-S14
    assert "bukan musim" not in a["3321"]["udara"]["arti"] and "klimatologi tahunan" in a["3321"]["udara"]["arti"] and "ISPU" in a["3321"]["udara"]["arti"]
    assert a["6211"]["karhutla"]["titik_tahun_parsial"] == {"viirs_tahun_sebagian": 2012, "tahun_belum_lengkap": 2026}
    assert "taw_mm" in a["3404"]["neraca_air"]["arti"] and "asumsi-kebijakan" in a["3404"]["neraca_air"]["arti"]
    assert "GLOBAL" in a["6211"]["model"]["arti"]
    assert "30%" in a["6211"]["kekeringan"]["arti"] and "BUKAN tingkat tertinggi kecamatan" in a["6211"]["kekeringan"]["arti"]
    assert "poligon kab tak ada" in a["6211"]["gempa"]["arti"] and "null = tak ada gempa" not in a["6211"]["gempa"]["arti"]
    assert a["6211"]["gempa"]["risiko"]["m_maks_100km"] is None, "tak ada gempa radius 100 km: null bukan 0,0"
    assert a["6211"]["gempa"]["yakin"] == "estimasi-model" and a["6211"]["karhutla"]["yakin"] == "estimasi-model", "yakin blok = terlemah sub-blok"
    for k, p in a.items():
        kk = p["kekeringan"]
        if kk:
            assert "jiwa_terdampak" not in kk and ("penduduk_status" in kk) and kk["tanggal_arti"] == "hari-data", k
            r = kk["riwayat"]
            assert r is None or (isinstance(r["tahun_siaga"], int) and 0 <= r["tahun_siaga"] <= r["n_tahun"] == 35 and "kekerapan" not in r), f"{k}: {r}"
        if kk and kk["penduduk_status"]:  # level_kini = lv_wilayah: tingkat tertinggi yang dialami >= 30% penduduk
            ps_ = kk["penduduk_status"]; tot_ = ps_["total_penduduk"]
            frak = {1: ps_["waspada_atau_lebih"], 2: ps_["siaga_atau_lebih"], 3: ps_["awas"]}
            harap = next((L for L in (3, 2, 1) if tot_ and frak[L] / tot_ >= 0.30), 0)
            assert kk["level_kini"] == harap, f"{k}: level_kini {kk['level_kini']} != tingkat tertinggi yang dialami >= 30% penduduk ({harap}; {frak} dari {tot_})"
        kh = p["karhutla"]
        if kh:
            m_ = ((cx.per_kab("karhutla") or {}).get(k) or {}).get("m")
            assert kh["rerata_modis_th"] == (None if m_ is None else bulat(m_)), f"{k}: rerata_modis_th {kh['rerata_modis_th']} != setengah-ke-atas({m_})"
            assert (kh["rerata_modis_th"] == 0) <= (kh["peringkat_modis"] is None), f"{k}: rerata tampil 0 tetapi peringkat {kh['peringkat_modis']}"
            gh = (cx.gambut_idx() or ({}, set()))[0].get(k)
            if kh["gambut_ha"]:
                assert kh["gambut_ha"] == max(1000, bulat(gh / 1000) * 1000), f"{k}: gambut_ha {kh['gambut_ha']} bukan setengah-ke-atas ribuan dari {gh}"
            assert kh["rerata_modis_th"] is None or isinstance(kh["rerata_modis_th"], int), f"{k}: rerata_modis_th {kh['rerata_modis_th']!r}"
            assert kh["gambut_ha"] is None or isinstance(kh["gambut_ha"], int), f"{k}: gambut_ha bukan int"
            assert kh["gambut_ha"] is None or kh["gambut_ha"] == 0 or kh["gambut_ha"] % 1000 == 0, f"{k}: gambut_ha {kh['gambut_ha']} bukan ribuan"
            assert not (kh["rerata_modis_th"] == 0 and kh["peringkat_modis"]), f"{k}: peringkat dengan rerata 0"
        na = p["neraca_air"]
        if na:
            assert na["defisit_2030"] == round(na["defisit_2030"], 1) and na["defisit_2025"] == round(na["defisit_2025"], 1), k
        for x in (p["gunungapi"] or {"daftar": []})["daftar"]:
            assert "krb3_jiwa_gunung" in x and "krb3_jiwa" not in x
        assert set(p["_null_arti"]) == {b for b in NULL_ARTI if p.get(b) is None}, f"{k}: _null_arti tak sesuai blok null"
    assert "Jawa" in a["6211"]["_null_arti"]["neraca_air"] and "5 situs" in a["6211"]["_null_arti"]["pesisir"]
    assert a["3404"]["karhutla"] is None or a["3404"]["karhutla"]["gambut_null_arti"], "gambut null di luar cakupan wajib berketerangan"
    assert "\u00b5g/m\u00b3" in a["3321"]["udara"]["_satuan"]["pm25_rerata"]
    def angka(o, pre=""):  # kunci angka (bukan bool) sampai kedalaman 2, tanpa isi list
        for kk, v in (o or {}).items():
            if kk.startswith("_") or kk in ("sumber", "tanggal"):
                continue
            if isinstance(v, dict) and not pre and kk not in ("uji", "uji_tanggal", "per_kelas"):
                yield from angka(v, kk + ".")
            elif isinstance(v, (int, float)) and not isinstance(v, bool):
                yield pre + kk
    for k in ("3321", "6211", "3404", "3327"):  # S12: tiap angka B02 punya satuan (kunci sendiri atau awalannya)
        for b in ("gempa", "karhutla", "kekeringan", "gunungapi", "pesisir", "neraca_air", "model", "udara"):
            if a[k][b]:
                sat = a[k][b]["_satuan"]
                for kunci_ in angka(a[k][b]):
                    assert kunci_ in sat or kunci_.split(".")[0] in sat, f"{k}.{b}.{kunci_}: tanpa _satuan"
    # fixture mini (3 kab): golden + D3 + D7 + penolakan
    prof = bangun(FIX)
    assert sorted(prof) == ["3171", "6201", "6211"], sorted(prof)
    for k, p in prof.items():
        validasi(p)
        g = open(os.path.join(FIX, "harapan", k + ".json"), encoding="utf-8").read()
        assert teks(p) == g, f"fixture {k} beda dari harapan/{k}.json"
    assert (prof["6201"]["kejadian"] or {}).get("dampak_12bln") is None, "kab tanpa DIBI harus null bukan 0"
    assert prof["6201"]["wilayah"]["luas_km2"] is None and prof["6201"]["riwayat_luar"] is None, "data hilang harus null"
    assert prof["6211"]["kejadian"]["dampak_12bln"]["meninggal"] == 2, prof["6211"]["kejadian"]["dampak_12bln"]
    assert prof["3171"]["fasilitas"] is None, "luar cakupan 9 provinsi harus null"
    assert prof["6211"]["fasilitas"]["sekolah"] == 2 and prof["6211"]["fasilitas"]["siswa"] == 30, prof["6211"]["fasilitas"]
    assert "@" not in teks(prof["6211"]), "email BPBD bocor"
    # B02 pada fixture: gambut = 1 sel (titik tengah di poligon) ~246 ha, sel di luar poligon tak dihitung; gempa 2 dari 3 titik
    f6 = prof["6211"]
    assert f6["karhutla"]["gambut_ha"] == 1000 and f6["karhutla"]["titik_tahun"] == [[2012, 4], [2013, 5]], f6["karhutla"]
    assert f6["karhutla"]["khg"] is None and f6["karhutla"]["gambut_pct"] == 0.0, "KHG tanpa sumber harus null; 246 ha dari 959.680 ha = 0,03% dibulatkan 0,0"
    assert (f6["gempa"]["n_m5_1900"], f6["gempa"]["m_maks"], f6["gempa"]["terakhir"], f6["gempa"]["risiko_kelas"]) == (2, 6.1, "2021-05-06", "Rendah"), f6["gempa"]
    assert prof["6201"]["gempa"]["n_m5_1900"] == 0 and prof["6201"]["gempa"]["risiko"] is None and prof["6201"]["karhutla"]["gambut_ha"] == 0
    assert prof["3171"]["karhutla"] is None, "provinsi tanpa sel gambut dan tanpa riwayat: null"
    assert f6["gunungapi"] is None and f6["pesisir"] is None and f6["neraca_air"] is None and f6["udara"] is None and f6["kekeringan"] is None
    assert f6["model"] is None, "tanpa satu pun sumber model: null"
    assert f6["siluet"] and f6["siluet"].startswith("M") and any(e.get("hilang") and e["berkas"].endswith("gunung.json") for e in f6["sumber"])
    with tempfile.TemporaryDirectory() as t:  # D7: satu sumber hilang -> blok null + catatan, tanpa galat
        sal = os.path.join(t, "m"); shutil.copytree(FIX, sal, ignore=shutil.ignore_patterns("harapan"))
        os.remove(os.path.join(sal, "public", "banjir", "data", "kejadian.json"))
        r = bangun(sal)["6211"]
        validasi(r)
        assert r["kejadian"]["tahunan"] is None and r["kejadian"]["musim"] is None, "sumber hilang tapi blok masih berisi"
        assert r["kejadian"]["dampak_12bln"] is not None, "sumber lain ikut hilang"
        assert any(e.get("hilang") and e["berkas"].endswith("kejadian.json") for e in r["sumber"]), "sumber hilang tak dicatat di sumber[]"
        os.remove(os.path.join(sal, "public", "gempa", "data", "riwayat_m5.json"))  # B02: katalog hilang -> hitungan null (bukan 0), indeks risiko tetap
        g = bangun(sal)["6211"]
        validasi(g)
        assert g["gempa"]["n_m5_1900"] is None and g["gempa"]["risiko_lv"] == 0, g["gempa"]
        assert any(e.get("hilang") and e["berkas"].endswith("riwayat_m5.json") for e in g["sumber"])
    # input salah DITOLAK
    import copy
    p = a["6211"]
    def ubah(f):
        q = copy.deepcopy(p); f(q); return q
    tolak(validasi, "bukan 4 digit", ubah(lambda q: q.update(kode="621")))
    tolak(validasi, "sumber kosong", ubah(lambda q: q["wilayah"].pop("sumber")))
    tolak(validasi, "tanggal", ubah(lambda q: q["sosek"].update(tanggal="2025")))
    tolak(validasi, "yakin", ubah(lambda q: q["irbi"].update(yakin="pasti")))
    tolak(validasi, "byte >", ubah(lambda q: q["wilayah"].update(x="a" * 70000)))
    tolak(validasi, "bocor", ubah(lambda q: q["kapasitas"].update(email="a@b.id")))
    tolak(validasi, "bocor", ubah(lambda q: q["kapasitas"].update(hp="6281234567890")))
    tolak(validasi, "bocor", ubah(lambda q: q["wilayah"].update(oa="A5012345678")))
    tolak(validasi, "harus null", ubah(lambda q: q["kejadian"].update(dampak_12bln={"meninggal": 0, "n_kejadian": 0})))
    tolak(validasi, "tak ada", ubah(lambda q: q.pop("fasilitas")))
    tolak(validasi, "siluet", ubah(lambda q: q.update(siluet="M0 0 L1 1Z")))
    tolak(validasi, "siluet", ubah(lambda q: q.update(siluet="M" + "1 2 " * 400 + "Z")))
    tolak(validasi, "tak ada", ubah(lambda q: q.pop("gempa")))
    tolak(validasi, "yakin", ubah(lambda q: q["karhutla"].update(yakin="pasti")))
    tolak(validasi, "memuat angka", ubah(lambda q: q["masalah"][0].update(judul="Banjir 5 kali berulang")))  # B03: validasi memanggil masalah.periksa
    tolak(validasi, "masalah/masalah_skor tak ada", ubah(lambda q: q.pop("masalah")))
    # KM-B04: ringkas + prov, atas SEMUA kab/prov
    kode = Konteks(AKAR).kode
    r, pv = ringkas(a), prov(a, nama_provinsi(AKAR))
    validasi_agregat(r, pv, a, kode)
    dk = os.path.join(AKAR, "public", "data", "kemitraan")
    assert open(os.path.join(dk, "ringkas.json"), encoding="utf-8").read() == teks(r), "ringkas.json di disk beda dari hasil bangun; jalankan tanpa --cek"
    adaprov = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(dk, "prov", "[0-9][0-9].json")))
    assert adaprov == sorted(pv), f"prov di disk {len(adaprov)} != {len(pv)}"
    for nn, q in pv.items():
        assert open(os.path.join(dk, "prov", nn + ".json"), encoding="utf-8").read() == teks(q), f"prov/{nn}.json di disk beda dari hasil bangun"
    assert ringkas(a) == r and prov(a, nama_provinsi(AKAR)) == pv, "ringkas/prov tak deterministik"
    q62 = pv["62"]
    assert q62["n_kab"] == sum(1 for v in kode.values() if v["prov"] == "62"), q62["n_kab"]
    # agregat tak menjumlah null sebagai 0
    b2 = copy.deepcopy(a)
    for k in [k for k in b2 if b2[k]["prov"] == "62"][:2]:
        b2[k]["penduduk"]["total"] = None
    q2 = prov(b2, {})["62"]
    assert q2["penduduk"]["n_ikut"] == q62["penduduk"]["n_ikut"] - 2 and q2["penduduk"]["total"] < q62["penduduk"]["total"], "null penduduk dijumlah sebagai 0 / n_ikut tak turun"
    # tanpa skor -> tanpa bahaya teratas karangan
    b3 = copy.deepcopy(a)
    for e in b3["6211"]["masalah_skor"].values():
        e["skor"] = None
    assert ringkas(b3)["baris"][[x["k"] for x in r["baris"]].index("6211")]["b"] is None, "kab tanpa skor punya bahaya teratas"
    # input salah DITOLAK
    def u2(f):
        rr, qq = copy.deepcopy(r), copy.deepcopy(pv); f(rr, qq); return rr, qq
    tolak(lambda x: validasi_agregat(*x, a, kode), "byte >", u2(lambda rr, qq: rr.update(x="a" * 130000)))
    tolak(lambda x: validasi_agregat(*x, a, kode), "baris", u2(lambda rr, qq: rr["baris"].pop()))
    tolak(lambda x: validasi_agregat(*x, a, kode), "kunci ringkas", u2(lambda rr, qq: rr["baris"][0].update(siluet="M0 0Z")))
    tolak(lambda x: validasi_agregat(*x, a, kode), "tak cocok masalah_skor", u2(lambda rr, qq: rr["baris"][0].update(b=[["banjir", 0.99]])))
    tolak(lambda x: validasi_agregat(*x, a, kode), "n_kab", u2(lambda rr, qq: qq["62"].update(n_kab=qq["62"]["n_kab"] + 1)))
    tolak(lambda x: validasi_agregat(*x, a, kode), "n_kab", u2(lambda rr, qq: qq["62"]["kab"].pop()))
    tolak(lambda x: validasi_agregat(*x, a, kode), "prov", u2(lambda rr, qq: qq.pop("62")))
    tolak(lambda x: validasi_agregat(*x, a, kode), "tak urut", u2(lambda rr, qq: qq["62"]["kab"].reverse()))
    tolak(lambda x: validasi_agregat(*x, a, kode), "tanpa entri", u2(lambda rr, qq: qq["62"]["_satuan"].pop("irbi.n_estimasi")))
    tolak(lambda x: validasi_agregat(*x, a, kode), "tanpa entri", u2(lambda rr, qq: qq["62"]["_arti"].pop("irbi.tinggi_n")))
    tolak(lambda x: validasi_agregat(*x, a, kode), "tanpa entri", u2(lambda rr, qq: rr["_satuan"].pop("j")))
    assert all(isinstance(v, int) and v >= 0 or v is None for r_ in r["baris"] for v in (r_["j"],)), "j bukan hitung kejadian"
    # ---- KM-B05 jaga: murni, tanpa git
    def _b(tg, nm="Z"): return json.dumps({"dibangun": tg, "sumber": [{"nama": nm, "tanggal": tg}]})
    ok_b = {**{f"daerah/{i:04d}.json": _b("2026-11-02") for i in range(3)}, "ringkas.json": json.dumps({"tanggal": "2026-11-02"}),
            **{f"prov/{i:02d}.json": json.dumps({"tanggal": "2026-11-02"}) for i in range(38)}}
    ok_l = {j: (_b("2026-10-01") if j.startswith("daerah") else json.dumps({"tanggal": "2026-10-01"})) for j in ok_b}
    assert jaga(ok_b, ok_l, 3) == [] and jaga(ok_b, ok_b, 3) == [] and jaga(ok_b, {}, 3) == [], "sama/maju/baru harus lolos"
    assert any("daerah 3 != 514" in x for x in jaga(ok_b, ok_l, 514)), "berkas kurang harus ditolak"
    assert any("prov 37" in x for x in jaga({j: t for j, t in ok_b.items() if j != "prov/00.json"}, ok_l, 3))
    assert any("ringkas.json hilang" in x for x in jaga({j: t for j, t in ok_b.items() if j != "ringkas.json"}, ok_l, 3))
    mundur = dict(ok_b, **{"daerah/0001.json": _b("2026-09-01")})
    assert any("daerah/0001.json: tanggal mundur" in x for x in jaga(mundur, ok_l, 3)), "tanggal mundur harus ditolak"
    assert any("mundur" in x for x in jaga(dict(ok_b, **{"ringkas.json": json.dumps({"tanggal": "2026-09-01"})}), ok_l, 3)), "tanggal ringkas mundur"
    assert any("mundur" in x for x in jaga(dict(ok_b, **{"daerah/0001.json": json.dumps({"dibangun": "2026-11-02", "sumber": [{"nama": "Z", "tanggal": None}]})}), ok_l, 3)), "tanggal sumber hilang = mundur"
    assert any("byte >" in x for x in jaga(ok_b, ok_l, 3, maks=10)), "ukuran > maks harus ditolak"
    mx = max(len(t.encode()) for t in ta.values())
    nul = {b: sum(1 for p in a.values() if p[b] is None) for b in BLOK_DICT + ("riwayat_luar",)}
    print(f"OK profil_daerah.py: {len(a)} kab, maks {mx} byte, deterministik, fixture 3 kab; null per blok {nul}")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description=__doc__.split("Pakai:")[0].strip())
    ap.add_argument("--cek", action="store_true", help="self-check D1-D5, D7 + penolakan input salah; tidak menulis")
    ap.add_argument("--jaga", action="store_true", help="sesudah bangun penuh, sebelum commit: tolak (keluar 1) bila < 514 berkas, ringkas/prov hilang, tanggal mundur vs HEAD, atau > MAKS_BYTE; tidak menulis")
    ap.add_argument("--kab", help="cetak satu kab (kode IRBI 4 digit) ke stdout, tanpa menulis")
    ap.add_argument("--akar", default=AKAR, help="akar repo sumber (default: repo ini)")
    ap.add_argument("--keluar", default=AKAR, help="akar keluaran (default: repo ini)")
    ag = ap.parse_args()  # argumen tak dikenal -> keluar 2 sebelum menulis apa pun
    if ag.jaga:
        jaga_git(ag.akar)
    elif ag.cek:
        cek()
    else:
        prof = bangun(ag.akar, ag.kab)
        if not prof:
            sys.exit(f"kab {ag.kab} tidak ada di kode.json")
        if ag.kab:
            validasi(prof[ag.kab]); print(teks(prof[ag.kab]), end="")
        else:
            print("tulis", len(prof), "berkas ->", tulis(prof, ag.keluar))
            print("tulis ringkas %d baris + %d prov" % tulis_agregat(prof, ag.keluar, ag.akar))
