"""Lahan di area genangan baru per kab: ESA WorldCover v200 2021 (10 m), dibaca di titik sampel genangan GS-01.

Pakai:  python3 scripts/banjir/genangan_lahan.py kejadian --kj KJ-...
            baca data/raw/banjir/gfm_nasional/kejadian/<KJ>.json (GS-01, tidak disunting),
            tulis data/raw/banjir/gfm_nasional/kejadian/<KJ>_lahan.json (kab `sah` berisi lahan; kab tak sah `lahan: None` + alasan)
        python3 scripts/banjir/genangan_lahan.py uji      (self-check sintetis, tanpa jaringan)

Kelas = piksel 10 m tepat di bawah titik (tanpa interpolasi); ha per kelas = jumlah bobot titik (ALGORITMA 5).
Ubin 3 derajat dibaca lewat HTTP Range (header + blok yang dibutuhkan), blok di-cache di data/raw/banjir/worldcover/.
Pembaca TIFF dan RangeFile diimpor dari tiff_mini dan genangan_nasional (tidak disalin). Tanpa GDAL.
WorldCover tidak memisahkan sawah: kelas 40 tampil "Pertanian (termasuk sawah)".
Kelas 50 kecil bukan bukti permukiman tidak tergenang (GFM ter-mask di kota padat).
Atribusi: ESA WorldCover 10 m 2021 v200, CC BY 4.0 (Zanaga dkk., https://doi.org/10.5281/zenodo.7254221).
"""
import argparse, math, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import genangan_nasional as G  # noqa: E402  (RangeFile, tiff_mini, umum.baca/simpan)
from genangan_nasional import tiff_mini  # noqa: E402

URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{}_Map.tif"
CACHE = os.path.join(G.MENTAH, "worldcover")
ATRIBUSI = "ESA WorldCover 10 m 2021 v200, CC BY 4.0 (Zanaga dkk. 2022, https://doi.org/10.5281/zenodo.7254221)"
CATATAN = "Pertanian termasuk sawah (WorldCover tidak memisahkannya). Kelas terbangun kecil bukan bukti permukiman tidak tergenang: GFM ter-mask di kota padat."
KELAS = {10: "Pohon", 20: "Semak", 30: "Rumput", 40: "Pertanian (termasuk sawah)", 50: "Terbangun", 60: "Lahan terbuka",
         70: "Salju dan es", 80: "Badan air", 90: "Lahan basah", 95: "Mangrove", 100: "Lumut"}


def nama_ubin(lon, lat):
    """Ubin 3 derajat dinamai sudut barat daya: (98,09; 4,39) -> N03E096."""
    la, lo = math.floor(lat / 3) * 3, math.floor(lon / 3) * 3
    return f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"


class RangeCache(G.RangeFile):
    """RangeFile dengan cache blok di disk; `byte` hanya menghitung yang benar-benar lewat jaringan."""
    def __init__(self, url, nama):
        self.nama = nama
        os.makedirs(CACHE, exist_ok=True)
        super().__init__(url)

    def rentang(self, a, n, coba=3):
        j = os.path.join(CACHE, f"{self.nama}_{a}_{n}.bin")
        if os.path.exists(j):
            return open(j, "rb").read()
        b = super().rentang(a, n, coba)
        with open(j + ".tmp", "wb") as f:
            f.write(b)
        os.replace(j + ".tmp", j)
        return b


def buka_jaringan(nama):
    """Tiff ubin `nama` lewat Range, atau None bila ubin tidak ada (laut lepas tak punya ubin)."""
    try:
        return tiff_mini.Tiff(RangeCache(URL.format(nama), nama))
    except RuntimeError as e:
        if "HTTP Error 404" in str(e):   # hanya 404 = ubin tak ada; 403 dan lainnya galat sungguhan
            return None
        raise


def hitung(titik, buka=buka_jaringan):
    """titik: [(lon, lat, ha)]. Mengembalikan ({kelas: ha}, ha_tanpa_kelas, byte_jaringan). `buka(nama)` -> Tiff atau None."""
    per_ubin = {}
    for lon, lat, ha in titik:
        per_ubin.setdefault(nama_ubin(lon, lat), []).append((lon, lat, ha))
    ha_kelas, tanpa, byte = {}, 0.0, 0
    for nama, pts in sorted(per_ubin.items()):
        t = buka(nama)
        if t is None:
            tanpa += sum(p[2] for p in pts)
            continue
        dx, dy = t.skala[0], t.skala[1]
        lon0, lat0 = t.titik_ikat[3], t.titik_ikat[4]
        per_blok = {}
        for lon, lat, ha in pts:   # tanpa interpolasi; tepi timur/selatan dijepit ke piksel terakhir
            kol, bar = math.floor((lon - lon0) / dx + 1e-9), math.floor((lat0 - lat) / dy + 1e-9)   # jepit hanya galat floating di tepi
            if not (0 <= kol < t.lebar and 0 <= bar < t.tinggi):
                tanpa += ha   # di luar ubin: bukan kelas
                continue
            per_blok.setdefault((kol // t.tl, bar // t.tt), []).append((kol % t.tl, bar % t.tt, ha))
        rf = t.f
        if hasattr(rf, "siapkan"):   # produksi: blok yang diperlukan diunduh paralel sekali jalan
            rf.siapkan([(t.offs[b * t.per_baris + k], t.cnts[b * t.per_baris + k]) for k, b in per_blok])
        for (k, b), ps in per_blok.items():
            a = t.ubin(k, b)
            for c, r, ha in ps:
                v = a[r * t.tl + c]
                if v in KELAS:
                    ha_kelas[v] = ha_kelas.get(v, 0.0) + ha
                else:
                    tanpa += ha   # 0 = tanpa data
        byte += getattr(rf, "byte", 0)
    return ha_kelas, tanpa, byte


def lahan(titik, buka=buka_jaringan):
    """ha per kelas WorldCover; kelas yang tidak ada tidak keluar."""
    return {k: round(v, 3) for k, v in sorted(hitung(titik, buka)[0].items())}


def kejadian(kj):
    jalur = os.path.join(G.DIR, "kejadian", f"{kj}.json")
    d = G.baca(jalur)
    if not d:
        sys.exit(f"tidak ada {jalur}: jalankan genangan_nasional.py kejadian dulu")
    t0, byte, kabs = time.time(), 0, []
    for k in d["kab"]:
        h = {"kab4": k["kab4"], "kab": k["kab"], "sah": k["sah"]}
        titik = (k.get("mentah") or {}).get("titik_baru") or []
        if not k["sah"] or not titik:
            h["lahan"] = None   # tak sah atau tanpa titik: tidak pernah 0
            h["alasan"] = (k.get("tampil") or {}).get("alasan") or k.get("status") or "tanpa titik genangan baru"
        else:
            hk, tanpa, b = hitung([tuple(p) for p in titik])
            byte += b
            h["lahan"] = {str(c): {"nama": KELAS[c], "ha": round(v, 1)} for c, v in sorted(hk.items(), key=lambda x: -x[1])}
            h["titik_ha"] = round(sum(p[2] for p in titik), 1)
            h["tanpa_kelas_ha"] = round(tanpa, 1)
        kabs.append(h)
    detik = round(time.time() - t0, 1)
    keluar = {"kj": kj, "sumber": ATRIBUSI, "catatan": CATATAN, "dibuat": d.get("dibuat"), "byte_range": byte, "detik": detik, "kab": kabs}
    G.simpan(os.path.join(G.DIR, "kejadian", f"{kj}_lahan.json"), keluar)
    for h in kabs:
        print(h["kab4"], h["kab"], {v["nama"]: v["ha"] for v in h["lahan"].values()} if h["lahan"] else f"lahan None ({h['alasan']})")
    print(f"byte Range jaringan: {byte:,}  waktu: {detik} dtk")


def _cog(dir_, v, lon0, lat0, res, tl):
    """Tulis COG sintetis deflate uint8; v[baris][kol]; ubin tl x tl; titik ikat + skala seperti WorldCover."""
    import struct, zlib
    h, w = len(v), len(v[0])
    ubin = []
    for tb in range(h // tl):
        for tk in range(w // tl):
            ubin.append(zlib.compress(bytes(v[r][c] for r in range(tb * tl, (tb + 1) * tl) for c in range(tk * tl, (tk + 1) * tl))))
    n = 11
    ext0 = 8 + 2 + 12 * n + 4
    sk, tp = struct.pack("<3d", res, res, 0), struct.pack("<6d", 0, 0, 0, lon0, lat0, 0)
    off = struct.pack("<%dI" % len(ubin), *[0] * len(ubin))
    cnt = struct.pack("<%dI" % len(ubin), *[len(u) for u in ubin])
    o_sk, o_tp = ext0, ext0 + 24
    o_off, o_cnt = o_tp + 48, o_tp + 48 + len(off)
    o_dat = o_cnt + len(cnt)
    offs, p = [], o_dat
    for u in ubin:
        offs.append(p)
        p += len(u)
    off = struct.pack("<%dI" % len(ubin), *offs)
    k = len(ubin)
    ent = [(256, 3, 1, w), (257, 3, 1, h), (258, 3, 1, 8), (259, 3, 1, 8), (322, 3, 1, tl), (323, 3, 1, tl),
           (324, 4, k, o_off), (325, 4, k, o_cnt), (33550, 12, 3, o_sk), (33922, 12, 6, o_tp), (339, 3, 1, 1)]
    ent.sort()
    b = b"II*\0" + struct.pack("<I", 8) + struct.pack("<H", n)
    for t, ty, c, x in ent:
        b += struct.pack("<HHII", t, ty, c, x)
    b += struct.pack("<I", 0) + sk + tp + off + cnt + b"".join(ubin)
    j = os.path.join(dir_, "s.tif")
    open(j, "wb").write(b)
    return tiff_mini.Tiff(j)


def uji():
    import tempfile
    d = tempfile.mkdtemp()
    # 8x8 piksel, res 0,25 derajat, sudut barat laut (96, 6), 4 ubin deflate 4x4; semua kelas 10 kecuali yang diset
    v = [[10] * 8 for _ in range(8)]
    v[0][0], v[0][7], v[7][0], v[7][7] = 40, 80, 90, 95   # empat sudut
    v[2][3], v[2][4], v[2][5], v[3][3] = 40, 40, 40, 10   # lintas batas ubin (kolom 3|4)
    v[5][5] = 80
    t = _cog(d, v, 96.0, 6.0, 0.25, 4)
    buka = lambda nama: t
    # kasus ALGORITMA 5: 5 titik x 0,3 ha, kelas 40, 40, 40, 10, 80
    px = lambda c, r: (96 + (c + 0.5) * 0.25, 6 - (r + 0.5) * 0.25, 0.3)
    r = lahan([px(3, 2), px(4, 2), px(5, 2), px(3, 3), px(5, 5)], buka)
    assert r == {10: 0.3, 40: 0.9, 80: 0.3}, r
    assert 20 not in r and 90 not in r, "kelas nol tidak boleh keluar"
    assert lahan([], buka) == {}
    # tepi ubin: sudut persis dan sedikit di dalam
    e = 1e-9
    assert lahan([(96.0, 6.0, 1)], buka) == {40: 1.0}                    # sudut barat laut = piksel (0,0)
    assert lahan([(98 - e, 6.0, 1)], buka) == {80: 1.0}                  # tepi timur -> kolom 7
    assert lahan([(96.0, 4 + e, 1)], buka) == {90: 1.0}                  # tepi selatan -> baris 7
    assert lahan([(98 - e, 4 + e, 1)], buka) == {95: 1.0}
    assert lahan([(96.25 - e, 5.75 + e, 1)], buka) == {40: 1.0}          # masih piksel (0,0)
    assert lahan([(96.25, 5.75 - e, 1)], buka) == {10: 1.0}              # piksel (1,1)
    # titik di luar ubin tidak dijepit: masuk tanpa
    hk, tanpa, _ = hitung([(98.0, 5.0, 1.0), (97.0, 6.5, 2.0), (95.9, 5.0, 4.0), (97.0, 3.9, 8.0)], buka)
    assert hk == {} and tanpa == 15.0, (hk, tanpa)
    # piksel bernilai 0 masuk tanpa
    v0 = [[10] * 8 for _ in range(8)]
    v0[1][1] = 0
    hk, tanpa, _ = hitung([px(1, 1), px(0, 0)], lambda n: _cog(tempfile.mkdtemp(), v0, 96.0, 6.0, 0.25, 4))
    assert hk == {10: 0.3} and abs(tanpa - 0.3) < 1e-9, (hk, tanpa)
    # RangeCache lewat urlopen palsu berbasis berkas lokal: rentang, siapkan, cache disk, 404 vs 403
    import io, urllib.error, urllib.request
    global CACHE
    CACHE = tempfile.mkdtemp()
    isi = open(os.path.join(d, "s.tif"), "rb").read()
    panggilan, status = [], [206]
    class Resp(io.BytesIO):
        def __init__(s, b, st): super().__init__(b); s.status = st
        def __enter__(s): return s
        def __exit__(s, *a): return False
    def palsu(req, timeout=0):
        if status[0] in (403, 404):
            raise urllib.error.HTTPError(req.full_url, status[0], "x", {}, None)
        a, b = map(int, req.headers["Range"].split("=")[1].split("-"))
        panggilan.append((a, b))
        return Resp(isi[a:b + 1], 206)
    asli = G.urllib.request.urlopen
    G.urllib.request.urlopen = palsu
    try:
        rc = RangeCache("http://x/t.tif", "N03E096")
        r = hitung([px(3, 2), px(4, 2), px(5, 2), px(3, 3), px(5, 5)], lambda n: tiff_mini.Tiff(rc))
        assert {k: round(v, 3) for k, v in r[0].items()} == {10: 0.3, 40: 0.9, 80: 0.3} and rc.byte > 0, r
        n1 = len(panggilan)
        rc2 = RangeCache("http://x/t.tif", "N03E096")   # cache disk: tanpa permintaan baru
        hitung([px(3, 2)], lambda n: tiff_mini.Tiff(rc2))
        assert len(panggilan) == n1 and rc2.byte == 0, (n1, len(panggilan), rc2.byte)
        status[0] = 404
        assert buka_jaringan("S01W001") is None
        status[0] = 403
        try:
            buka_jaringan("S01W002"); assert False, "403 harus galat"
        except RuntimeError:
            pass
    finally:
        G.urllib.request.urlopen = asli
    # ubin hilang dan piksel 0: masuk tanpa_kelas, bukan kelas
    hk, tanpa, _ = hitung([(96.1, 5.9, 2.0)], lambda n: None)
    assert hk == {} and tanpa == 2.0
    # nama ubin
    assert nama_ubin(98.0973, 4.3893) == "N03E096" and nama_ubin(106.8, -6.2) == "S09E105" and nama_ubin(100.0, 3.0) == "N03E099"
    assert nama_ubin(110.0, -0.5) == "S03E108" and nama_ubin(140.0, 6.0) == "N06E138"
    assert KELAS[40] == "Pertanian (termasuk sawah)"
    print("ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["kejadian", "uji"])
    ap.add_argument("--kj")
    a = ap.parse_args()
    if a.mode == "uji":
        uji()
    else:
        if not a.kj:
            sys.exit("--kj wajib")
        kejadian(a.kj)
