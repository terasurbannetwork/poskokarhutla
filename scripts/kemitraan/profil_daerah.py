#!/usr/bin/env python3
"""Profil daerah Kemitraan Kampus, blok umum (PROFIL-DAERAH.md §1-§2, KM-B01).
514 berkas public/data/kemitraan/daerah/<kode IRBI 4 digit>.json. Blok: wilayah, penduduk, sosek, irbi,
inarisk_kec, kejadian, fasilitas, kapasitas, riwayat_luar, sumber. Blok per bahaya + model + masalah = KM-B02/B03.
Aturan: tiap blok dict {..., sumber, tanggal, yakin}; data hilang = null (bukan 0); tanpa angka karangan;
sumber hilang -> blok null + catatan di sumber[] (D7); keluaran deterministik (tanggal = tanggal sumber).
BPBD: email TIDAK ditulis (gerbang D5 melarang email di public/data/kemitraan/**).
Pakai: python3 -I scripts/kemitraan/profil_daerah.py [--cek] [--kab 6211] [--akar DIR] [--keluar DIR]"""
import collections, glob, json, os, re, shutil, sys, tempfile

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "umum"))  # -I tidak menambah direktori skrip
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from kode import kunci  # noqa: E402  (kab dan kota senama tidak tertukar; hanya impor nama_wilayah)
from konst import KONST  # noqa: E402

MAKS_BYTE = 60_000
YAKIN = ("resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan")
BLOK_DICT = ("wilayah", "penduduk", "sosek", "irbi", "inarisk_kec", "kejadian", "fasilitas", "kapasitas")
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
}
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
                 "dampak_12bln.rr_ringan": "unit rumah rusak ringan", "besar.meninggal": "jiwa"},
    "fasilitas": {"sekolah": "satuan pendidikan", "siswa": "siswa", "faskes": "unit", "rs": "unit", "gudang_bnpb_km": "km"},
    "kapasitas": {"dokumen_n": "dokumen regulasi"},
}
JENIS_TAHUNAN =("banjir", "bandang", "cuaca", "gelombang", "kering", "longsor", "rob", "semua")
DAMPAK = ("meninggal", "mengungsi", "rr_berat", "rr_sedang", "rr_ringan")


# ---------------------------------------------------------------- geometri (stdlib)
def dalam_cincin(x, y, r):
    """Ray casting: titik (x=lon, y=lat) di dalam cincin r [[lon,lat],...]."""
    di, n, j = False, len(r), len(r) - 1
    for i in range(n):
        xi, yi, xj, yj = r[i][0], r[i][1], r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            di = not di
        j = i
    return di


def poligon(geom):
    """GeoJSON Polygon/MultiPolygon -> [(bbox, [cincin luar, lubang...])]"""
    ps = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    out = []
    for p in ps:
        xs = [c[0] for c in p[0]]; ys = [c[1] for c in p[0]]
        out.append(((min(xs), min(ys), max(xs), max(ys)), p))
    return out


def dalam_poligon(x, y, polis):
    for (x0, y0, x1, y1), p in polis:
        if x0 <= x <= x1 and y0 <= y <= y1 and dalam_cincin(x, y, p[0]) and not any(dalam_cincin(x, y, h) for h in p[1:]):
            return True
    return False


INTI_DIBI = ("meninggal", "hilang", "luka", "mengungsi")


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
            tah = {}
            for key, v in d["kab"].items():
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
            return tah, mus, awal, akhir
        return self._memo("kejadian", f)

    def dibi_idx(self):
        def f():
            d = self.baca("dibi")
            if d is None:
                return None
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
        total = {j: sum(n for y, n in v if 2015 <= y <= 2025) for j, v in tahunan.items()
                 if any(2015 <= y <= 2025 for y, _ in v)} or None
    musim = {j: v for j, v in sorted(mus.items())} if mus else None
    dampak = besar = None
    rows = (di[0].get(kab) if di else None) or []
    if rows:
        dampak = {k: sum(r.get(k, 0) for r in rows) for k in DAMPAK}  # DIBI: kunci tak ada = 0 pada baris yang ada
        dampak.update(n_kejadian=sum(r["kejadian"] for r in rows), dari=di[1], sampai=di[2])
        mati = sorted((r for r in rows if r.get("meninggal", 0) > 0),
                      key=lambda r: (-r["meninggal"], -r.get("mengungsi", 0), r["tanggal"], r["jenis"]))[:10]
        besar = [{"tgl": r["tanggal"], "jenis": r["jenis"], "meninggal": r["meninggal"], "sumber": "DIBI BNPB"} for r in mati]
    if not (tahunan or musim or dampak):
        return None
    tgl = max([t for t in ((ki[3] if ki else None), (di[2] if di else None)) if t] or [None]) if (ki or di) else None
    isi = {"tahunan": tahunan, "total_2015_2025": total, "musim": musim, "dampak_12bln": dampak, "besar": besar,
           "musim_arti": "jumlah kejadian per bulan kalender (indeks 0 = Januari), jendela %s s.d. %s" % (ki[2], ki[3]) if ki else None,
           "dampak_arti": "meninggal/mengungsi/rr_* = jumlah 12 bulan; null = tak ada kejadian DIBI kab ini di jendela; kunci kosong di baris DIBI dihitung 0",
           "tahunan_arti": "bandang dan rob hanya DIBI (2018-); banjir bisa memuat bandang; tahun tiap jenis hanya yang tercatat sumber (tak ada = tidak ada data, bukan 0)",
           "parsial": None}
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


def bangun_kab(cx, kab, hilang):
    prov = cx.kode[kab]["prov"]
    w = (cx.baca("wilayah", prov) or {}).get(kab)
    p = {"v": 1, "kode": kab, "prov": prov, "nama": cx.kode[kab]["nama"]}
    for n, fn in (("wilayah", b_wilayah), ("penduduk", b_penduduk), ("sosek", b_sosek), ("irbi", b_irbi),
                  ("inarisk_kec", b_inarisk), ("kejadian", b_kejadian), ("fasilitas", b_fasilitas),
                  ("kapasitas", b_kapasitas), ("riwayat_luar", b_riwayat_luar)):
        p[n] = fn(cx, kab, w)
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
    return {k: bangun_kab(cx, k, hilang) for k in sorted(cx.kode) if hanya is None or k == hanya}


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
    for r in p.get("riwayat_luar") or []:
        assert r.get("sumber") in ("GDACS", "CEMS") and RE_TGL.match(r.get("tgl") or ""), f"{k}.riwayat_luar: butir tanpa sumber/tgl {r}"
    assert p.get("sumber") and all("nama" in e and "berkas" in e and "tanggal" in e for e in p["sumber"]), f"{k}: sumber[] kosong/bocor"
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
    with tempfile.TemporaryDirectory() as t:  # D7: satu sumber hilang -> blok null + catatan, tanpa galat
        sal = os.path.join(t, "m"); shutil.copytree(FIX, sal, ignore=shutil.ignore_patterns("harapan"))
        os.remove(os.path.join(sal, "public", "banjir", "data", "kejadian.json"))
        r = bangun(sal)["6211"]
        validasi(r)
        assert r["kejadian"]["tahunan"] is None and r["kejadian"]["musim"] is None, "sumber hilang tapi blok masih berisi"
        assert r["kejadian"]["dampak_12bln"] is not None, "sumber lain ikut hilang"
        assert any(e.get("hilang") and e["berkas"].endswith("kejadian.json") for e in r["sumber"]), "sumber hilang tak dicatat di sumber[]"
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
    mx = max(len(t.encode()) for t in ta.values())
    nul = {b: sum(1 for p in a.values() if p[b] is None) for b in BLOK_DICT + ("riwayat_luar",)}
    print(f"OK profil_daerah.py: {len(a)} kab, maks {mx} byte, deterministik, fixture 3 kab; null per blok {nul}")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description=__doc__.split("Pakai:")[0].strip())
    ap.add_argument("--cek", action="store_true", help="self-check D1-D5, D7 + penolakan input salah; tidak menulis")
    ap.add_argument("--kab", help="cetak satu kab (kode IRBI 4 digit) ke stdout, tanpa menulis")
    ap.add_argument("--akar", default=AKAR, help="akar repo sumber (default: repo ini)")
    ap.add_argument("--keluar", default=AKAR, help="akar keluaran (default: repo ini)")
    ag = ap.parse_args()  # argumen tak dikenal -> keluar 2 sebelum menulis apa pun
    if ag.cek:
        cek()
    else:
        prof = bangun(ag.akar, ag.kab)
        if not prof:
            sys.exit(f"kab {ag.kab} tidak ada di kode.json")
        if ag.kab:
            validasi(prof[ag.kab]); print(teks(prof[ag.kab]), end="")
        else:
            print("tulis", len(prof), "berkas ->", tulis(prof, ag.keluar))
