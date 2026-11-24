"""Uji balik model asap kota (atribusi.py) terhadap AOD MODIS -> public/udara/data/uji_atribusi.json

Apa yang diuji : atribusi.json kota[].model (µg/m3 asap api+PLTU di kota pada hari sasaran = BESOK dari jalan itu), diambil dari riwayat git
                 (yang benar-benar terbit; satu per hari sasaran, jalan terakhir). Pertanyaan: apakah kota berasap tebal diberi model lebih tinggi?
Kebenaran      : NASA GIBS WMS lapisan MODIS_Combined_Value_Added_AOD (Terra+Aqua gabungan, tanpa kunci), dibaca dari peta warna resminya,
                 dirata-rata di kotak 0,25 derajat sekitar kota; sah bila >= 5 dari 25 piksel 0,05 derajat teramati. "Tebal" = AOD >= 1,0
                 (acuan utama), AOD >= 0,5 dicatat sebagai pembanding. Awan dan celah sapuan tak punya nilai dan DIBUANG, bukan dianggap bersih.
                 Awas: asap sangat tebal bisa tertutup sebagai awan (Shi et al. 2019), jadi kota terburuk cenderung hilang dari uji.
Pembanding     : (1a) AOD H-2 (dua hari sebelum hari sasaran): persistensi SAH, sudah tersedia saat jalan; (1b) AOD kemarin (H-1 = hari jalan)
                 hanya batas atas nowcast: pengamatan itu BELUM ada saat prakiraan terbit (jalan ~01:45 WIB hari itu juga), jadi bukan pembanding adil, (2) tanpa angin: jumlah FRP kompleks / jarak (>= 25 km, <= 600 km), isotropik,
                 dari lintasan.json jalan yang sama (bukan model yang sama dengan angin nol), (3) PM2,5 CAMS kota itu sendiri (kota[].pm):
                 model baru berguna bila menambah informasi di atas CAMS.
Skor           : AUC pemisahan kota tebal dari yang tidak (peringkat Mann-Whitney, seri dihitung setengah), dan selisihnya terhadap tiap
                 pembanding PADA HIMPUNAN KOTA-HARI YANG SAMA, dengan selang bootstrap 95% per hari sasaran. Kalah ditulis kalah.
Batas          : asal.py diuji lewat asal_arsip.json (bobot per kota per waktu tiba, diarsipkan sejak 24 Nov 2026; riwayat sebelumnya tak ada):
                 skor = bobot terbesar pada hari WIB tiba, pembanding AOD H-2 dan CAMS prakiraan. Uji butuh >= 10 kota tebal; di bawah itu AUC null.
                 Bukan uji emisi atau konsentrasi PM2,5 permukaan: AOD kolom penuh, kelembapan, tinggi lapisan asap ikut menentukan.
Server GIBS    : membalas galat MapServer acak pada ~2/3 permintaan; diulang sampai 12 kali, tanggal yang tak pernah berhasil = hilang.
Pola           : backtest_smoke_model.py HazeWatch (MIT; AOD GIBS terdekode dari peta warna, ambang 1,0, AUC, pembanding AOD kemarin dan tanpa angin).
Pakai          : python3 scripts/udara/uji_atribusi.py [--maks-hari 40] [--tanpa-jaringan]  |  uji
"""
import argparse
import datetime as dt
import json
import os
import random
import re
import struct
import subprocess
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat
import prakiraan

WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
CMAP = "https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_Combined_Value_Added_AOD.xml"
LAYER = "MODIS_Combined_Value_Added_AOD"
BBOX = (94.0, -12.0, 142.0, 7.0)   # lon0, lat0, lon1, lat1
RES = 0.05
SETENGAH = 0.125                   # kotak 0,25 derajat
MIN_PIKSEL = 5
AMBANG = (1.0, 0.5)
MIN_TEBAL = 10
LAG_HARI = 2
BOOT, BENIH = 500, 20261124
CACHE = os.path.join(alat.RAW, "aod_kota.json")
HASIL = "uji_atribusi.json"
JARAK_MAKS_KM, JARAK_MIN_KM = 600, 25
TAK_SELARAS = []   # commit yang hari sasarannya tak sama dengan hari jalan + 1: dibuang, dilaporkan


# ---------- PNG (stdlib) ----------
def png_rgba(b):
    """PNG 8 bit tak berlapis (warna 2, 3, atau 6) -> (lebar, tinggi, bytearray RGBA)."""
    if b[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("bukan PNG")
    i, idat, plte, trns = 8, b"", b"", b""
    while i < len(b):
        n, tp = struct.unpack(">I4s", b[i:i + 8])
        d = b[i + 8:i + 8 + n]
        if tp == b"IHDR":
            w, h, bd, ct, _, _, il = struct.unpack(">IIBBBBB", d)
            if bd != 8 or il != 0 or ct not in (2, 3, 6):
                raise ValueError(f"PNG tak didukung: bit {bd}, warna {ct}, interlace {il}")
        elif tp == b"PLTE":
            plte = d
        elif tp == b"tRNS":
            trns = d
        elif tp == b"IDAT":
            idat += d
        i += 12 + n
    bpp = {2: 3, 3: 1, 6: 4}[ct]
    raw, st = zlib.decompress(idat), w * bpp
    if len(raw) != h * (st + 1):
        raise ValueError("ukuran data PNG salah")
    img, prev = bytearray(), bytearray(st)
    for y in range(h):
        f, row = raw[y * (st + 1)], bytearray(raw[y * (st + 1) + 1:(y + 1) * (st + 1)])
        if f == 1:
            for x in range(bpp, st):
                row[x] = (row[x] + row[x - bpp]) & 255
        elif f == 2:
            for x in range(st):
                row[x] = (row[x] + prev[x]) & 255
        elif f == 3:
            for x in range(st):
                row[x] = (row[x] + (((row[x - bpp] if x >= bpp else 0) + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(st):
                a, c = (row[x - bpp] if x >= bpp else 0), (prev[x - bpp] if x >= bpp else 0)
                p = a + prev[x] - c
                pa, pb, pc = abs(p - a), abs(p - prev[x]), abs(p - c)
                row[x] = (row[x] + (a if pa <= pb and pa <= pc else prev[x] if pb <= pc else c)) & 255
        elif f != 0:
            raise ValueError(f"filter PNG {f}")
        img += row
        prev = row
    if ct == 6:
        return w, h, img
    out = bytearray()
    for k in range(w * h):
        if ct == 2:
            out += img[3 * k:3 * k + 3] + b"\xff"
        else:
            j = img[k]
            out += plte[3 * j:3 * j + 3] + bytes([trns[j] if j < len(trns) else 255])
    return w, h, out


# ---------- peta warna -> AOD ----------
def baca_peta(xml_teks):
    """XML peta warna GIBS -> {(r, g, b): AOD batas bawah}; entri nodata dilewati, nilai negatif dijepit 0."""
    out = {}
    for e in ET.fromstring(xml_teks).iter("ColorMapEntry"):
        if e.get("nodata") == "true" or not e.get("value"):
            continue
        m = re.match(r"[\[(]\s*(-?[\d.]+)", e.get("value"))
        out[tuple(int(x) for x in e.get("rgb").split(","))] = max(0.0, float(m.group(1)))
    return out


def aod_kota(w, h, rgba, peta, kota):
    """kota [(kode, lat, lon)] -> {kode: [rata-rata AOD, jumlah piksel teramati]} untuk kotak 0,25 derajat; piksel tak dikenal = tak teramati."""
    out = {}
    for kode, lat, lon in kota:
        x0, x1 = int((lon - SETENGAH - BBOX[0]) / RES), int((lon + SETENGAH - BBOX[0]) / RES)
        y0, y1 = int((BBOX[3] - lat - SETENGAH) / RES), int((BBOX[3] - lat + SETENGAH) / RES)
        v = []
        for y in range(max(0, y0), min(h, y1)):
            for x in range(max(0, x0), min(w, x1)):
                k = 4 * (y * w + x)
                if rgba[k + 3] and (nilai := peta.get((rgba[k], rgba[k + 1], rgba[k + 2]))) is not None:
                    v.append(nilai)
        out[kode] = [round(sum(v) / len(v), 3) if v else None, len(v)]
    return out


def unduh(tgl, ulang=12, buka=urllib.request.urlopen):
    """PNG AOD satu hari dari GIBS; ulang sampai 12 kali (galat MapServer acak). None bila tak pernah berhasil."""
    lebar, tinggi = round((BBOX[2] - BBOX[0]) / RES), round((BBOX[3] - BBOX[1]) / RES)
    url = (f"{WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS={LAYER}&STYLES=&SRS=EPSG:4326&BBOX={','.join(str(x) for x in BBOX)}"
           f"&WIDTH={lebar}&HEIGHT={tinggi}&FORMAT=image/png&TRANSPARENT=TRUE&TIME={tgl}")
    for k in range(ulang):
        try:
            with buka(urllib.request.Request(url, headers={"User-Agent": alat.UA}), timeout=90) as r:
                b = r.read()
            if b[:4] == b"\x89PNG":
                return b
        except Exception:
            pass
        time.sleep(1)
    return None


# ---------- skor ----------
def auc(skor, label):
    """AUC rank-sum; seri dihitung setengah. None bila salah satu kelas kosong."""
    pos = [s for s, y in zip(skor, label) if y]
    neg = [s for s, y in zip(skor, label) if not y]
    if not pos or not neg:
        return None
    urut = sorted(range(len(skor)), key=lambda i: skor[i])
    rank, i = [0.0] * len(skor), 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and skor[urut[j + 1]] == skor[urut[i]]:
            j += 1
        for k in range(i, j + 1):
            rank[urut[k]] = (i + j) / 2 + 1
        i = j + 1
    return (sum(r for r, y in zip(rank, label) if y) - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def tanpa_angin(lat, lon, kompleks):
    """Jumlah FRP / jarak (km, lantai 25) untuk kompleks <= 600 km; isotropik, tanpa angin."""
    s = 0.0
    for la, lo, frp in kompleks:
        d = alat.jarak_km(lat, lon, la, lo)
        if d <= JARAK_MAKS_KM:
            s += frp / max(d, JARAK_MIN_KM)
    return s


def skor_pembanding(baris, ambang, kunci_skor, ulang=BOOT):
    """baris: [{hari, y (AOD), model, ...}]. -> AUC model dan pembanding pada himpunan yang sama + selisih + selang per hari."""
    b = [r for r in baris if r.get(kunci_skor) is not None]
    lab = [r["y"] >= ambang for r in b]
    npos = sum(lab)
    out = {"n": len(b), "n_tebal": npos, "n_hari": len({r["hari"] for r in b})}
    if npos < MIN_TEBAL or npos == len(b):
        return dict(out, auc_model=None, auc_pembanding=None, alasan=f"hanya {npos} kota-hari tebal (perlu >= {MIN_TEBAL}) atau semuanya tebal")
    am, ap = auc([r["model"] for r in b], lab), auc([r[kunci_skor] for r in b], lab)
    per = {}
    for r in b:
        per.setdefault(r["hari"], []).append(r)
    hari, rng, diff = sorted(per), random.Random(BENIH), []
    for _ in range(ulang):
        ss = [r for h in (rng.choice(hari) for _ in hari) for r in per[h]]
        l2 = [r["y"] >= ambang for r in ss]
        x, y = auc([r["model"] for r in ss], l2), auc([r[kunci_skor] for r in ss], l2)
        if x is not None and y is not None:
            diff.append(x - y)
    diff.sort()
    ci = [round(diff[int(.025 * (len(diff) - 1))], 3), round(diff[int(.975 * (len(diff) - 1))], 3)] if len(diff) > 20 else None
    vonis = ("belum_dapat_dibedakan" if not ci else "model_menang" if ci[0] > 0 else "model_KALAH" if ci[1] < 0 else "belum_dapat_dibedakan")
    return dict(out, auc_model=round(am, 3), auc_pembanding=round(ap, 3), selisih=round(am - ap, 3), ci95_selisih=ci, vonis=vonis)


# ---------- riwayat git ----------
def git_json(h, jalur):
    r = subprocess.run(["git", "-C", alat.AKAR, "show", f"{h}:{jalur}"], capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout else None


def selaras(A):
    """Hari sasaran atribusi harus = hari WIB jalan + HARI_ATRIBUSI (1 = besok); selain itu AOD diambil di tanggal salah."""
    jalan = alat.dari_iso(A["dibuat"]).astimezone(alat.WIB).date()
    return A["hari"] == (jalan + dt.timedelta(days=1)).isoformat()


def tanggal_butuh(hari):
    """Tanggal AOD yang diunduh untuk satu hari sasaran: sasaran, H-1 (batas atas nowcast), H-2 (persistensi sah)."""
    d = dt.date.fromisoformat(hari)
    return [hari, (d - dt.timedelta(days=1)).isoformat(), (d - dt.timedelta(days=2)).isoformat()]


def daftar_hari(maks, sekarang=None):
    """{hari sasaran: (atribusi, lintasan)} jalan terakhir per hari sasaran yang sudah melewati LAG_HARI; paling banyak `maks` hari terbaru."""
    sekarang = sekarang or dt.datetime.now(dt.timezone.utc)
    batas = (sekarang - dt.timedelta(days=LAG_HARI)).date().isoformat()
    log = subprocess.run(["git", "-C", alat.AKAR, "log", "--format=%H", "--", "public/udara/data/atribusi.json"], capture_output=True, text=True).stdout.split()
    per = {}
    for h in log:   # terbaru dulu
        A = git_json(h, "public/udara/data/atribusi.json")
        if not A or not A.get("hari") or A["hari"] > batas or not isinstance(A.get("kota"), list):
            continue
        if not selaras(A):
            TAK_SELARAS.append(h[:9])
            continue
        if A["hari"] in per and per[A["hari"]][0]["dibuat"] >= A["dibuat"]:
            continue
        L = git_json(h, "public/udara/data/lintasan.json")
        if L and L.get("kompleks"):
            per[A["hari"]] = (A, L)
    return dict(sorted(per.items())[-maks:])


def pastikan_aod(tanggal, cache, jaringan):
    """Isi cache AOD per kota untuk tanggal yang belum ada; -> tanggal yang tak bisa diperoleh."""
    peta, hilang = None, []
    kota = [(k["kode"], k["lat"], k["lon"]) for k in alat.kota()]
    for tgl in tanggal:
        if tgl in cache:
            continue
        if not jaringan:
            hilang.append(tgl)
            continue
        peta = peta or baca_peta(alat.ambil(CMAP, teks=True, timeout=60))
        b = unduh(tgl)
        if b is None:
            hilang.append(tgl)
            continue
        w, h, rgba = png_rgba(b)
        cache[tgl] = aod_kota(w, h, rgba, peta, kota)
        alat.simpan(CACHE, cache)
    return hilang


def asal_entri(sekarang=None):
    """Entri asal_arsip.json yang SEMUA waktu tiba-nya sudah melewati LAG_HARI -> [{mulai, tanggal [WIB per tiba], bobot}]."""
    sekarang = sekarang or dt.datetime.now(dt.timezone.utc)
    batas = (sekarang - dt.timedelta(days=LAG_HARI)).date().isoformat()
    out = []
    for mulai, e in alat.keluaran("asal_arsip.json", {}).get("e", {}).items():
        tg = [alat.hari_wib(alat.dari_iso(t)) for t in e["tiba"]]
        if max(tg) <= batas:
            out.append({"mulai": mulai, "tanggal": sorted(set(tg)), "tiba": tg, "bobot": e["bobot"]})
    return out


def pasangan_asal(entri, cache, prak_arsip):
    """Skor asal.py = bobot terbesar di antara waktu tiba yang jatuh pada hari WIB itu (tak ada = dilewati). Pembanding: AOD H-2 (sah) dan
    r24 CAMS prakiraan pada hari itu bila lead 1 atau 2 (prakiraan_arsip)."""
    baris = []
    for e in entri:
        jalan = alat.hari_wib(alat.dari_iso(e["mulai"]))
        for hari in e["tanggal"]:
            _, _, h2 = tanggal_butuh(hari)
            lead = (dt.date.fromisoformat(hari) - dt.date.fromisoformat(jalan)).days
            for kode, w in e["bobot"].items():
                v = [x for x, tg in zip(w, e["tiba"]) if tg == hari and x is not None]
                o = cache.get(hari, {}).get(kode)
                if not v or not o or o[0] is None or o[1] < MIN_PIKSEL:
                    continue
                o2 = cache.get(h2, {}).get(kode)
                c = prak_arsip.get(jalan, {}).get(kode)
                baris.append({"hari": hari, "jalan": jalan, "y": o[0], "model": max(v),
                              "aod_h2": o2[0] if o2 and o2[0] is not None and o2[1] >= MIN_PIKSEL else None,
                              "cams": c[lead - 1] if c and lead in (1, 2) else None})
    return baris


def jalankan(maks, jaringan=True):
    per = daftar_hari(maks)
    if not per:
        raise SystemExit("tidak ada atribusi.json di riwayat git yang sasarannya sudah lewat")
    kota = {k["kode"]: k for k in alat.kota()}
    cache = alat.muat(CACHE, {})
    tanggal = sorted({t for h in per for t in tanggal_butuh(h)})
    asal_e = asal_entri()
    tanggal = sorted(set(tanggal) | {t for e in asal_e for t in e["tanggal"]} | {x for e in asal_e for t in e["tanggal"] for x in tanggal_butuh(t)[1:]})
    hilang = pastikan_aod(tanggal, cache, jaringan)
    baris = []
    for hari, (A, L) in per.items():
        _, kemarin, h2 = tanggal_butuh(hari)
        kompleks = [(k["lat"], k["lon"], k["frp"]) for k in L["kompleks"]]
        for k in A["kota"]:
            c = kota.get(k["kode"])
            o = cache.get(hari, {}).get(k["kode"])
            if not c or not o or o[0] is None or o[1] < MIN_PIKSEL:
                continue
            ok = cache.get(kemarin, {}).get(k["kode"])
            o2 = cache.get(h2, {}).get(k["kode"])
            baris.append({"hari": hari, "aod_h2": o2[0] if o2 and o2[0] is not None and o2[1] >= MIN_PIKSEL else None, "y": o[0], "model": k["model"], "cams": k["pm"], "tanpa_angin": tanpa_angin(c["lat"], c["lon"], kompleks),
                          "kemarin": ok[0] if ok and ok[0] is not None and ok[1] >= MIN_PIKSEL else None})
    if not baris:
        raise SystemExit(f"tidak ada pasangan kota-hari dengan AOD teramati; tanggal hilang: {hilang}")
    hasil = {}
    for a in AMBANG:
        hasil[f"aod_ge_{a}"] = {"vs_aod_h2_sah": skor_pembanding(baris, a, "aod_h2"), "vs_aod_kemarin_nowcast_bukan_adil": skor_pembanding(baris, a, "kemarin"), "vs_tanpa_angin": skor_pembanding(baris, a, "tanpa_angin"),
                                "vs_cams": skor_pembanding(baris, a, "cams")}
    asal_baris = pasangan_asal(asal_e, cache, prakiraan.arsip_dict(alat.keluaran("prakiraan_arsip.json", {})))
    n_arsip = len(alat.keluaran("asal_arsip.json", {}).get("e", {}))
    asal_hasil = ({a: {"vs_aod_h2_sah": skor_pembanding(asal_baris, a, "aod_h2"), "vs_cams_prakiraan": skor_pembanding(asal_baris, a, "cams")} for a in AMBANG}
                  if asal_baris else None)
    out = {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "kebenaran": f"NASA GIBS {LAYER}, kotak 0,25 derajat, >= {MIN_PIKSEL}/25 piksel teramati",
           "model": "atribusi.json kota[].model (besok), dari riwayat git", "acuan_utama": "aod_ge_1.0",
           "hari_sasaran": [min(per), max(per)], "n_hari_sasaran": len(per), "n_kota_hari": len(baris), "tanggal_aod_hilang": hilang, "commit_tak_selaras_dibuang": TAK_SELARAS,
           "asal_py": {"arsip_entri": n_arsip, "entri_teruji": len(asal_e), "n_kota_hari": len(asal_baris),
                   "hasil": asal_hasil, "catatan": "asal.py mengarsipkan bobot per kota sejak 24 Nov 2026; tanpa arsip yang sudah lewat 2 hari uji ini kosong, bukan lulus"},
           "hasil": hasil,
           "catatan": "AOD gabungan Terra+Aqua; awan dan asap sangat tebal bisa tak bernilai (kota terburuk hilang); kota-hari satu hari saling bergantung"}
    alat.simpan(HASIL, out)
    u = hasil["aod_ge_1.0"]
    alat.log(f"uji_atribusi: {len(baris)} kota-hari, {len(per)} hari sasaran, hilang {len(hilang)} tanggal; " +
             "; ".join(f"{k}: model {v.get('auc_model')} vs {v.get('auc_pembanding')} ({v.get('vonis', v.get('alasan'))})" for k, v in u.items()))
    return out


# ---------- self-check ----------
def png_uji(w, h, piksel, filt):
    """PNG RGBA sah dengan filter baris `filt` (0..4) agar dekoder diuji, bukan hanya kasus tanpa filter."""
    raw = bytearray()
    prev = bytearray(4 * w)
    for y in range(h):
        row = bytearray(b for x in range(w) for b in piksel(x, y))
        f = filt(y)
        enc = bytearray(row)
        for x in range(4 * w):
            a = row[x - 4] if x >= 4 else 0
            u = prev[x]
            c = prev[x - 4] if x >= 4 else 0
            if f == 1:
                enc[x] = (row[x] - a) & 255
            elif f == 2:
                enc[x] = (row[x] - u) & 255
            elif f == 3:
                enc[x] = (row[x] - ((a + u) >> 1)) & 255
            elif f == 4:
                p = a + u - c
                pa, pb, pc = abs(p - a), abs(p - u), abs(p - c)
                enc[x] = (row[x] - (a if pa <= pb and pa <= pc else u if pb <= pc else c)) & 255
        raw += bytes([f]) + enc
        prev = row
    ch = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + ch(b"IDAT", zlib.compress(bytes(raw))) + ch(b"IEND", b"")


def uji():
    # dekoder PNG: semua lima filter menghasilkan piksel yang sama
    pk = lambda x, y: (x * 20 % 256, y * 30 % 256, (x * y * 7) % 256, 255 if (x + y) % 5 else 0)
    for f in range(5):
        w, h, d = png_rgba(png_uji(9, 7, pk, lambda y, f=f: f))
        assert (w, h) == (9, 7) and all(tuple(d[4 * (y * w + x):4 * (y * w + x) + 4]) == pk(x, y) for y in range(h) for x in range(w)), f
    try:
        png_rgba(b"<html>")
        raise AssertionError("bukan PNG harus ditolak")
    except ValueError:
        pass
    # peta warna: batas bawah, negatif dijepit, nodata dilewati
    xml = ('<ColorMaps><ColorMap><Entries><ColorMapEntry rgb="220,220,255" nodata="true" sourceValue="[-9999,-1000)"/>'
           '<ColorMapEntry rgb="255,253,205" value="[-1,0)"/><ColorMapEntry rgb="255,0,0" value="[1.000,1.100)"/>'
           '<ColorMapEntry rgb="10,0,0" value="[5]"/></Entries></ColorMap></ColorMaps>')
    pt = baca_peta(xml)
    assert pt == {(255, 253, 205): 0.0, (255, 0, 0): 1.0, (10, 0, 0): 5.0}, pt
    # AOD kota: kotak 0,25 derajat = 5x5 piksel; piksel transparan atau warna tak dikenal tak dihitung
    W, H = round((BBOX[2] - BBOX[0]) / RES), round((BBOX[3] - BBOX[1]) / RES)
    lat, lon = 0.0, 100.0
    cx, cy = int((lon - BBOX[0]) / RES), int((BBOX[3] - lat) / RES)

    def piksel(x, y):
        if abs(x - cx) < 3 and abs(y - cy) < 3:
            return (255, 0, 0, 255) if (x + y) % 2 else (255, 253, 205, 255)    # AOD 1,0 dan 0,0 bergantian
        return (1, 2, 3, 0)
    w, h, d = png_rgba(png_uji(W, H, piksel, lambda y: y % 5))
    r = aod_kota(w, h, d, pt, [("A", lat, lon), ("B", -9.0, 120.0)])
    assert r["B"] == [None, 0] and r["A"][1] >= MIN_PIKSEL and 0.3 < r["A"][0] < 0.7, r
    # AUC: sempurna 1, terbalik 0, semua seri 0,5, kelas kosong None
    assert auc([1, 2, 3, 4], [0, 0, 1, 1]) == 1.0 and auc([4, 3, 2, 1], [0, 0, 1, 1]) == 0.0 and auc([5, 5, 5, 5], [0, 1, 0, 1]) == .5 and auc([1, 2], [0, 0]) is None
    # tanpa angin: kompleks dalam 600 km saja, lantai 25 km
    assert abs(tanpa_angin(0, 100, [(0, 100, 50), (0, 110, 99)]) - 2.0) < 1e-9
    # pembanding: model sempurna vs pembanding acak -> menang; model acak vs pembanding sempurna -> kalah; terlalu sedikit tebal -> null
    rng, bar = random.Random(1), []
    for d_ in range(20):
        for _ in range(10):
            y = rng.choice((0.2, 1.5))
            bar.append({"hari": f"d{d_}", "y": y, "model": y + rng.random() * .1, "kemarin": rng.random(), "cams": y + rng.random() * .1, "tanpa_angin": y})
    menang = skor_pembanding(bar, 1.0, "kemarin")
    assert menang["auc_model"] > .95 and menang["vonis"] == "model_menang" and menang["n_hari"] == 20, menang
    for r_ in bar:
        r_["model"] = rng.random()
    kalah = skor_pembanding(bar, 1.0, "tanpa_angin")
    assert kalah["auc_pembanding"] == 1.0 and kalah["vonis"] == "model_KALAH", kalah
    sedikit = skor_pembanding(bar[:6], 1.0, "kemarin")
    assert sedikit["auc_model"] is None and "perlu" in sedikit["alasan"]
    assert skor_pembanding([dict(r_, kemarin=None) for r_ in bar], 1.0, "kemarin")["n"] == 0   # pembanding hilang: himpunan kosong, tak crash
    # penyejajaran hari: sasaran = hari WIB jalan + 1 (jalan 18:46Z = 01:46 WIB hari berikutnya); AOD H-2 dua hari sebelum sasaran
    assert selaras({"dibuat": "2026-11-23T18:46Z", "hari": "2026-11-25"}) and selaras({"dibuat": "2026-11-24T06:40Z", "hari": "2026-11-25"})
    assert not selaras({"dibuat": "2026-11-23T18:46Z", "hari": "2026-11-24"}) and not selaras({"dibuat": "2026-11-24T06:40Z", "hari": "2026-11-26"})
    assert tanggal_butuh("2026-11-01") == ["2026-11-01", "2026-10-31", "2026-10-30"]
    # daftar_hari memakai git nyata: setiap hari yang lolos punya tanggal AOD sesuai dan selaras
    for hari, (A_, L_) in daftar_hari(3).items():
        assert hari == A_["hari"] and selaras(A_) and L_["kompleks"] and tanggal_butuh(hari)[0] == hari
    # asal: bobot per waktu tiba -> skor per hari WIB (maks); H-2 dan CAMS lead 1 ikut; entri yang tiba-nya belum lewat lag dibuang
    cache_t = {"2026-11-02": {"K": [1.5, 25]}, "2026-11-03": {"K": [0.2, 25]}, "2026-10-31": {"K": [0.4, 25]}, "2026-11-01": {"K": [0.4, 25]}}
    ent = [{"mulai": "2026-11-01T03:00Z", "tanggal": ["2026-11-02", "2026-11-03"], "tiba": ["2026-11-02", "2026-11-02", "2026-11-03", "2026-11-03", "2026-11-03"],
            "bobot": {"K": [5.0, 9.0, 1.0, None, 2.0], "Z": [0.0] * 5}}]
    pa = pasangan_asal(ent, cache_t, {"2026-11-01": {"K": [40, 50]}})
    assert [(p["hari"], p["model"], p["aod_h2"], p["cams"]) for p in pa] == [("2026-11-02", 9.0, 0.4, 40), ("2026-11-03", 2.0, 0.4, 50)], pa   # Z tanpa AOD dilewati
    # unduhan: galat acak diulang sampai berhasil; menyerah = None
    class R:
        def __init__(s, b): s.b = b
        def __enter__(s): return s
        def __exit__(s, *a): pass
        def read(s): return s.b
    n = {"k": 0}

    def acak(req, timeout):
        n["k"] += 1
        return R(b"<HTML>MapServer Message" if n["k"] < 4 else b"\x89PNGok")
    global time
    asli, time = time, type("T", (), {"sleep": staticmethod(lambda s: None)})
    try:
        assert unduh("2026-11-01", buka=acak) == b"\x89PNGok" and n["k"] == 4
        assert unduh("2026-11-01", ulang=3, buka=lambda r, timeout: R(b"<HTML>")) is None
    finally:
        time = asli
    print("uji_atribusi uji: lulus")


if __name__ == "__main__":
    uji()
    ap = argparse.ArgumentParser()
    ap.add_argument("perintah", nargs="?")
    ap.add_argument("--maks-hari", type=int, default=40)
    ap.add_argument("--tanpa-jaringan", action="store_true")
    a = ap.parse_args()
    if a.perintah != "uji":
        jalankan(a.maks_hari, jaringan=not a.tanpa_jaringan)
