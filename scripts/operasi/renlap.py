#!/usr/bin/env python3
"""Renlap USULAN per base ops (spek docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 6, tiket OP-4).

Usulan lokasi untuk dilihat, BUKAN perintah terbang: BNPB tidak memerintah TNI AU. Nama kru tidak ada di keluaran.
Python stdlib saja, skor murni berbobot (bobot_renlap.json, HIPOTESIS), tanpa ML.

  python3 scripts/operasi/renlap.py uji
  python3 scripts/operasi/renlap.py buat [--tanggal YYYY-MM-DD] [--versi malam|pagi] [--hotspot BERKAS|URL]
         [--temuan BERKAS.json] [--base BERKAS.json] [--kini ISO] [--kirim-api]

--tanggal = tanggal OPERASI (hari terbang, WIB). Bawaan: versi malam -> besok, versi pagi -> hari ini.
--hotspot bawaan: public/data/hotspot72.json bila umurnya <= 72 jam, kalau tidak /api/titik (endpoint publik yang sama dengan layar).
--temuan: JSON respons GET /api/operasi/peta (atau daftar respons, atau daftar temuan); tanpa itu dan tanpa env OPERASI_COOKIE
  (cookie sesi staf) renlap jalan tanpa temuan dan menulisnya di kaki.
Keluaran: public/data/operasi/renlap_<tanggal>_<versi>.json dan .txt (teks siap salin WA per base).
"""
import argparse
import json
import math
import os
import re
import sys
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
BOBOT = AKAR / "scripts/operasi/bobot_renlap.json"
SEED = AKAR / "migrations/0103_operasi_lapangan.sql"
KELUAR = AKAR / "public/data/operasi"
API = "https://centurisk97.id"
WIB = timedelta(hours=7)
NM_KM = 1.852
SATELIT = {"M": "MODIS", "N": "S-NPP", "N20": "NOAA-20", "N21": "NOAA-21"}
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


# ---------------------------------------------------------------- geometri dan format
def jarak_nm(a, b, c, d):
    p1, p2 = math.radians(a), math.radians(c)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(d - b) / 2) ** 2
    return 2 * 3440.065 * math.asin(math.sqrt(h))


def baringan(a, b, c, d):
    """Baringan benar (derajat 0..360) dari (a,b) ke (c,d)."""
    p1, p2, dl = math.radians(a), math.radians(c), math.radians(d - b)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return math.degrees(math.atan2(y, x)) % 360


def radial_jarak(vor, lat, lon, deklinasi_timur):
    """(radial magnetik 1..360, jarak Nm) dari VOR. Magnet = benar MINUS deklinasi timur (lihat laporan: spek menulis 'plus')."""
    r = round((baringan(vor[0], vor[1], lat, lon) - deklinasi_timur) % 360) % 360 or 360
    return r, jarak_nm(vor[0], vor[1], lat, lon)


def _dms1(x):
    x = abs(x)
    d = int(x)
    m = int((x - d) * 60)
    s = round(((x - d) * 60 - m) * 60)
    if s == 60:
        s, m = 0, m + 1
    if m == 60:
        m, d = 0, d + 1
    return d, m, s


def dms(lat, lon):
    a, b = _dms1(lat), _dms1(lon)
    return "%s %02d° %02d' %02d\"  %s %03d° %02d' %02d\"" % ("S" if lat < 0 else "N", *a, "W" if lon < 0 else "E", *b)


def dari_dms(t):
    m = re.match(r"([NS])\s*(\d+)°\s*(\d+)'\s*(\d+)\"\s+([EW])\s*(\d+)°\s*(\d+)'\s*(\d+)\"", t.strip())
    if not m:
        raise ValueError("DMS tak terbaca: " + t)
    g = m.groups()
    lat = int(g[1]) + int(g[2]) / 60 + int(g[3]) / 3600
    lon = int(g[5]) + int(g[6]) / 60 + int(g[7]) / 3600
    return (-lat if g[0] == "S" else lat), (-lon if g[4] == "W" else lon)


def waktu(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def tgl_wib(t):
    return (t + WIB).date()


# ---------------------------------------------------------------- berkas masukan
def baca_json(sumber):
    if str(sumber).startswith("http"):
        req = urllib.request.Request(sumber, headers={"User-Agent": "centurisk97-renlap/1"})
        for percobaan in (1, 2, 3):  # /api/titik kadang lambat; tiga kali lalu galat apa adanya
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    return json.load(r)
            except OSError:
                if percobaan == 3:
                    raise
    with open(sumber, encoding="utf-8") as f:
        return json.load(f)


def muat_hotspot(sumber, kini, jam):
    """-> (daftar titik {lat,lon,t,sat,yakin,wil}, ket, acuan). Hanya <= jam jam sebelum kini, keyakinan >= 1 (sedang/tinggi)."""
    ket = str(sumber)
    if sumber is None:
        lokal = AKAR / "public/data/hotspot72.json"
        d = baca_json(lokal)
        if (kini - waktu(d["acuan"])).total_seconds() > 72 * 3600:
            ket = "hotspot72.json basi (acuan %s), pakai %s/api/titik" % (d["acuan"][:16], API)
            print("peringatan:", ket, file=sys.stderr)
            d = baca_json(API + "/api/titik")
        else:
            ket = "public/data/hotspot72.json"
    else:
        d = baca_json(sumber)
    ac = waktu(d["acuan"])
    k = {n: i for i, n in enumerate(d["kolom"])}
    out = []
    for b in d["baris"]:
        t = ac + timedelta(hours=b[k["jam"]])
        if (kini - t).total_seconds() > jam * 3600 or t > kini or b[k["keyakinan"]] < 1:
            continue
        w = d["wilayah"][b[k["wilayah"]]] if isinstance(b[k["wilayah"]], int) else ""
        out.append({"lat": b[k["lat"]], "lon": b[k["lon"]], "t": t, "sat": b[k["sensor"]], "wil": w})
    return out, ket, d["acuan"]


def telan_sql(teks):
    """Tuple VALUES dari satu INSERT seed -> daftar nilai (str, float/int, None)."""
    v = teks[teks.index("VALUES") + 6:]
    out = []
    for m in re.finditer(r"'((?:[^']|'')*)'|(NULL)|(-?\d+(?:\.\d+)?)", v):
        s, nul, n = m.groups()
        out.append(s.replace("''", "'") if s is not None else None if nul else float(n) if "." in n else int(n))
    return out


def muat_base(jalur=None):
    """-> {id: {..., 'armada': [..]}} dari seed migrasi 0103, atau --base JSON {'base': [...], 'armada': [...]}."""
    if jalur:
        d = baca_json(jalur)
        base = {b["id"]: dict(b, armada=[]) for b in d["base"]}
        for a in d.get("armada", []):
            base[a["base_id"]]["armada"].append(a)
        return base
    base, armada = {}, []
    for baris in SEED.read_text(encoding="utf-8").splitlines():
        if baris.startswith("INSERT OR IGNORE INTO op_base"):
            v = telan_sql(baris)
            base[v[0]] = dict(zip(["id", "nama", "icao", "iata", "prov", "lat", "lon", "vor_kode", "vor_lat", "vor_lon", "aktif"], v), armada=[])
        elif baris.startswith("INSERT OR IGNORE INTO op_armada"):
            v = telan_sql(baris)
            armada.append(dict(zip(["registrasi", "tipe", "peran", "operator", "pemilik", "base_id", "bucket_liter", "dummy", "diubah"], v)))
    for a in armada:
        if not a["dummy"] and a["base_id"] in base:
            base[a["base_id"]]["armada"].append(a)
    return base


def muat_temuan(jalur, kini):
    """Temuan 48 jam: {lat,lon,status,t,lokasi,luas,reg}. Jam NULL -> pukul 12.00 WIB tanggal itu (nominal)."""
    return temuan_dari(baca_json(jalur), kini) if jalur else []


def temuan_dari(d, kini):
    daftar = []
    for x in (d if isinstance(d, list) else [d]):
        daftar += x["temuan"] if isinstance(x, dict) and "temuan" in x else [x] if "lat" in x else []
    out = []
    for r in daftar:
        t = datetime.fromtimestamp(r["jam_utc"] / 1000, timezone.utc) if r.get("jam_utc") else \
            datetime.fromisoformat(r["tanggal"] + "T05:00:00+00:00")
        if 0 <= (kini - t).total_seconds() <= 48 * 3600:
            out.append({"lat": r["lat"], "lon": r["lon"], "status": r["status"], "t": t, "lokasi": r.get("lokasi"),
                        "luas": r.get("luas_klaim_ha"), "reg": r.get("registrasi")})
    return out


# ---------------------------------------------------------------- indeks ruang
class Ruang:
    """Ember 0.05 derajat untuk cari tetangga terdekat dalam beberapa km (desa)."""
    def __init__(self, titik, s=0.05):
        self.s, self.e = s, defaultdict(list)
        for p in titik:
            self.e[(math.floor(p[0] / s), math.floor(p[1] / s))].append(p)

    def terdekat(self, lat, lon, maks_km):
        i, j = math.floor(lat / self.s), math.floor(lon / self.s)
        paling = (maks_km / NM_KM, None)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for p in self.e.get((i + di, j + dj), ()):
                    d = jarak_nm(lat, lon, p[0], p[1])
                    if d < paling[0]:
                        paling = (d, p)
        return paling[1], paling[0] * NM_KM


def dalam_cincin(x, y, c):
    ada = False
    for i in range(len(c)):
        x1, y1, x2, y2 = c[i][0], c[i][1], c[i - 1][0], c[i - 1][1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            ada = not ada
    return ada


class Gambut:
    def __init__(self, jalur):
        self.p, self.e = [], defaultdict(list)
        if not jalur.exists():
            return
        for f in baca_json(jalur)["features"]:
            g = f["geometry"]
            for poli in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
                xs = [q[0] for q in poli[0]]
                ys = [q[1] for q in poli[0]]
                n = len(self.p)
                self.p.append((min(xs), max(xs), min(ys), max(ys), poli))
                for i in range(math.floor(min(xs)), math.floor(max(xs)) + 1):
                    for j in range(math.floor(min(ys)), math.floor(max(ys)) + 1):
                        self.e[(i, j)].append(n)

    def di_dalam(self, lat, lon):
        for n in self.e.get((math.floor(lon), math.floor(lat)), ()):
            x0, x1, y0, y1, poli = self.p[n]
            if x0 <= lon <= x1 and y0 <= lat <= y1 and dalam_cincin(lon, lat, poli[0]) and not any(dalam_cincin(lon, lat, h) for h in poli[1:]):
                return True
        return False


def muat_ffmc(kini):
    """-> (fungsi(lat,lon)->(ffmc,tgl)|None, ket). FFMC hari terbaru per sel 0,5 derajat dari fwi.json."""
    jalur = AKAR / "public/data/fwi.json"
    if not jalur.exists():
        return (lambda a, b: None), "fwi.json tidak ada"
    d = baca_json(jalur)
    sel = {(g["lat"], g["lon"]): g["hari"][-1] for g in d["grid"] if g.get("hari")}
    s = d.get("sel", 0.5)

    def cari(lat, lon):
        h = sel.get((math.floor(lat / s) * s + s / 2, math.floor(lon / s) * s + s / 2))
        return (h["ffmc"], h["tgl"]) if h else None
    return cari, "fwi.json hari_ini %s" % d.get("hari_ini")


def muat_pm(tanggal):
    """Prakiraan PM2,5 kab terdekat (prakiraan.json, per jam) maks pada 06-10 WIB hari operasi = 23Z H-1 s.d. 03Z H."""
    jalur = AKAR / "public/udara/data/prakiraan.json"
    if not jalur.exists():
        return (lambda a, b, km: None), "prakiraan.json tidak ada"
    d = baca_json(jalur)
    jam = [waktu(j) for j in d["jam"]]
    a = datetime.fromisoformat(str(tanggal - timedelta(days=1)) + "T23:00:00+00:00")
    idx = [i for i, j in enumerate(jam) if a <= j <= a + timedelta(hours=4)]
    ket = "prakiraan.json dibuat %s" % d.get("dibuat")

    def cari(lat, lon, maks_km):
        if not idx:
            return None
        k = min(d["kota"], key=lambda c: jarak_nm(lat, lon, c["lat"], c["lon"]))
        if jarak_nm(lat, lon, k["lat"], k["lon"]) * NM_KM > maks_km:
            return None
        return {"pm25_maks": max(k["pm"][i] for i in idx), "kab": k["nama"]}
    return cari, ket


# ---------------------------------------------------------------- inti: kandidat, skor, urutan
def kandidat(titik, temuan, B, ffmc=None, gambut=None, desa=None):
    """Titik panas -> sel target bersekor. Titik dekat (<= radius_clear) temuan 'clear' yang lebih baru dibuang;
    titik yang LEBIH BARU dari clear itu dipertahankan dengan pengurang bobot."""
    bw, am = B["bobot"], B["ambang"]
    clear = [x for x in temuan if x["status"] == "clear"]
    sisa, clear_lalu = [], set()
    for p in titik:
        dekat = [c for c in clear if jarak_nm(p["lat"], p["lon"], c["lat"], c["lon"]) * NM_KM <= am["radius_clear_km"]]
        if any(c["t"] >= p["t"] for c in dekat):
            continue
        if dekat:
            clear_lalu.add(id(p))
        sisa.append(p)
    if not sisa:
        return []
    t_maks = max(p["t"] for p in sisa)
    hari_maks = tgl_wib(t_maks)
    s = am["sel_derajat"]
    sel = defaultdict(list)
    for p in sisa:
        sel[(math.floor(p["lat"] / s), math.floor(p["lon"] / s))].append(p)
    basah = [x for x in temuan if x["status"] in ("fs", "berasap", "berasap_tipis")]
    out = []
    for (_, _), ps in sel.items():
        lat = sum(p["lat"] for p in ps) / len(ps)
        lon = sum(p["lon"] for p in ps) / len(ps)
        baru = [p for p in ps if (t_maks - p["t"]).total_seconds() <= am["jendela_baru_jam"] * 3600]
        hari = {tgl_wib(p["t"]) for p in ps}
        d0 = hari_maks if hari_maks in hari else hari_maks - timedelta(days=1)
        run = 0
        while d0 - timedelta(days=run) in hari and run < bw["menahun_maks_hari"]:
            run += 1
        alasan = {"titik_baru": len(baru), "menahun_hari": run}
        skor = bw["baru_per_titik"] * min(len(baru), bw["baru_maks_titik"]) + bw["menahun_per_hari"] * run
        if gambut and gambut.di_dalam(lat, lon):
            skor += bw["gambut"]
            alasan["gambut"] = True
        f = ffmc(lat, lon) if ffmc else None
        if f:
            alasan["ffmc"] = f[0]
            alasan["ffmc_tgl"] = f[1]
            if (t_maks.date() - datetime.fromisoformat(f[1]).date()).days <= am["ffmc_basi_hari"]:
                skor += bw["ffmc_maks"] * min(max((f[0] - bw["ffmc_dari"]) / bw["ffmc_rentang"], 0), 1)
            else:
                alasan["ffmc_basi"] = True
        if desa:
            d, km = desa.terdekat(lat, lon, am["radius_permukiman_km"])
            if d:
                skor += bw["permukiman"]
                alasan["permukiman_km"] = round(km, 1)
        if not any(jarak_nm(lat, lon, x["lat"], x["lon"]) * NM_KM <= am["radius_clear_km"] for x in basah):
            skor += bw["belum_ditangani"]
            alasan["belum_ditangani"] = True
        if any(id(p) in clear_lalu for p in ps):
            skor += bw["clear_dengan_titik_baru"]
            alasan["clear_lalu_titik_baru"] = True
        terakhir = max(ps, key=lambda p: p["t"])
        out.append({"lat": round(lat, 5), "lon": round(lon, 5), "skor": round(skor, 2), "alasan": alasan,
                    "terakhir": {"t": terakhir["t"], "sat": SATELIT.get(terakhir["sat"], terakhir["sat"])},
                    "wil": Counter(p["wil"] for p in ps).most_common(1)[0][0]})
    return [c for c in out if c["skor"] >= am["skor_minimum"]]


def urut_tetangga(base, daftar):
    """Tetangga terdekat dari base, lalu dari target terakhir. Seri jarak diputus (lat, lon): stabil."""
    sisa, cur, out = list(daftar), (base[0], base[1]), []
    while sisa:
        n = min(sisa, key=lambda c: (round(jarak_nm(cur[0], cur[1], c["lat"], c["lon"]), 6), c["lat"], c["lon"]))
        sisa.remove(n)
        out.append(n)
        cur = (n["lat"], n["lon"])
    return out


def pilih_wb(basis, temuan, kandi, radius, B):
    """Maks N lokasi FS/berasap terkonfirmasi (temuan 48 jam), kecuali sudah di-clear sesudahnya."""
    bobot = {"fs": 3, "berasap": 3, "berasap_tipis": 1}
    km = B["ambang"]["radius_clear_km"]
    out = []
    for x in temuan:
        if x["status"] not in bobot:
            continue
        if any(c["status"] == "clear" and c["t"] > x["t"] and jarak_nm(x["lat"], x["lon"], c["lat"], c["lon"]) * NM_KM <= km for c in temuan):
            continue
        if jarak_nm(basis[0], basis[1], x["lat"], x["lon"]) > radius:
            continue
        sk = max([c["skor"] for c in kandi if jarak_nm(x["lat"], x["lon"], c["lat"], c["lon"]) * NM_KM <= km] or [0])
        out.append((bobot[x["status"]] + min(x["luas"] or 0, 10) / 5 + sk, x))
    out.sort(key=lambda a: (-a[0], a[1]["lat"], a[1]["lon"]))
    pilih = []
    for sk, x in out:
        if not any(jarak_nm(x["lat"], x["lon"], y["lat"], y["lon"]) * NM_KM <= km for _, y in pilih):
            pilih.append((sk, x))
    return pilih[:B["batas"]["wb_maks"]]


def nama_tempat(lat, lon, wil, desa_per_prov, titik, B):
    """('Desa X, Kec. Y, Kab. Z' atau bagian yang ada). Desa = pusat desa terdekat <= radius_desa_nama (OSM), bukan batas desa."""
    if not wil:
        p = min(titik, key=lambda q: jarak_nm(lat, lon, q["lat"], q["lon"]), default=None)
        if p and jarak_nm(lat, lon, p["lat"], p["lon"]) * NM_KM <= B["ambang"]["radius_desa_nama_km"]:
            wil = p["wil"]
    if not wil and desa_per_prov.get("*"):  # tanpa titik panas dekat (temuan murni): nama dari desa terdekat + desa_cari.json
        d, _ = desa_per_prov["*"].terdekat(lat, lon, B["ambang"]["radius_desa_nama_km"])
        if d:
            dc = baca_json(AKAR / "public/data/desa_cari.json")
            kec = next((x[2] for x in dc["baris"] if x[0] == d[2]), "")
            wil = "%s|%s|%s" % (d[2][:2], dc["kab"].get(d[2][:5], ""), kec)
    prov, kab, kec = (wil.split("|") + ["", "", ""])[:3] if wil else ("", "", "")
    bagian = []
    r = desa_per_prov.get(prov)
    if r:
        d, _ = r.terdekat(lat, lon, B["ambang"]["radius_desa_nama_km"])
        if d:
            bagian.append("Desa " + d[3])
    if kec:
        bagian.append("Kec. " + kec)
    if kab:
        bagian.append(kab if re.match(r"(Kota|Kab)", kab) else "Kab. " + kab)
    return ", ".join(bagian) or None


def susun(tanggal, versi, kini, titik, temuan, base, B, ffmc, pm, gambut, desa_prov, desa_semua, ket):
    kandi = kandidat(titik, temuan, B, ffmc, gambut, desa_semua)
    dekl = B["deklinasi_timur_derajat"]
    out = {"tanggal": str(tanggal), "versi": versi, "dibuat": kini.isoformat(), "status": "draf", "sumber": ket,
           "catatan": "USULAN lokasi untuk dilihat, bukan perintah terbang. Komando operasi udara ada pada TNI AU dan PIC.",
           "bobot_label": B["_label"], "base": []}
    for b in base.values():
        if not b.get("aktif", 1):
            continue
        reg = [a["registrasi"] for a in b["armada"]]
        peran = {a["peran"] for a in b["armada"]}
        radius = B["batas"]["jelajah_nm_bawaan"]  # ponytail: seed belum memuat jelajah_nm per tipe; tambah bila K7 menetapkan
        pos = (b["lat"], b["lon"])
        vor = (b["vor_lat"], b["vor_lon"]) if b.get("vor_lat") is not None else None
        dk = dekl.get(b["id"], dekl["bawaan"])

        def fmt(c, jenis):
            rujuk, rj = (("VOR " + b["vor_kode"]), radial_jarak(vor, c["lat"], c["lon"], dk)) if vor else \
                (b["id"] + " (base, VOR tidak diseed)", radial_jarak(pos, c["lat"], c["lon"], dk))
            c = dict(c, jenis=jenis, dms=dms(c["lat"], c["lon"]), radial=rj[0], jarak_vor_nm=round(rj[1]), rujukan=rujuk,
                     rd="R %03d D %d Nm Fr %s" % (rj[0], round(rj[1]), rujuk),
                     dari_base_nm=round(jarak_nm(pos[0], pos[1], c["lat"], c["lon"])))
            c["tempat"] = nama_tempat(c["lat"], c["lon"], c.pop("wil", None), desa_prov, titik, B)
            if "terakhir" in c:
                c["terakhir"] = {"jam_wib": (c["terakhir"]["t"] + WIB).strftime("%d %b %H:%M").replace(
                    (c["terakhir"]["t"] + WIB).strftime("%b"), BULAN[(c["terakhir"]["t"] + WIB).month - 1]), "satelit": c["terakhir"]["sat"]}
            p = pm(c["lat"], c["lon"], B["ambang"]["pm_radius_km"])
            c["udara"] = p or "tidak tersedia"
            return c
        wb = pilih_wb(pos, temuan, kandi, radius, B) if (not reg or peran & {"wb", "patroli_wb"}) else []
        wb_out = []
        for sk, x in wb:
            wb_out.append(fmt({"lat": x["lat"], "lon": x["lon"], "skor": round(sk, 2), "wil": None,
                               "alasan": {"temuan": x["status"], "oleh": x["reg"], "lokasi_laporan": x["lokasi"], "luas_klaim_ha": x["luas"],
                                          "jarak_sumber_air": "tidak tersedia (data air hanya Kalsel, public/data/osm/63.json)"}}, "wb"))
        km = B["ambang"]["radius_clear_km"]
        dalam = [c for c in kandi if jarak_nm(pos[0], pos[1], c["lat"], c["lon"]) <= radius
                 and not any(jarak_nm(c["lat"], c["lon"], w["lat"], w["lon"]) * NM_KM <= km for w in wb_out)]
        dalam.sort(key=lambda c: (-c["skor"], c["lat"], c["lon"]))
        pilih = []
        for c in dalam:  # sel bertetangga (2,2 km) = satu target
            if not any(jarak_nm(c["lat"], c["lon"], q["lat"], q["lon"]) * NM_KM <= B["ambang"]["gabung_km"] for q in pilih):
                pilih.append(c)
        patroli = urut_tetangga(pos, pilih[:B["batas"]["patroli_maks"]]) if (not reg or peran - {"wb"}) else []
        out["base"].append({"id": b["id"], "nama": b["nama"], "icao": b.get("icao"), "prov": b["prov"], "lat": b["lat"], "lon": b["lon"],
                            "vor": b.get("vor_kode"), "deklinasi_timur": dk, "radius_nm": radius, "armada": reg or "belum diseed",
                            "patroli": [dict(fmt(c, "patroli"), urut=i + 1) for i, c in enumerate(patroli)],
                            "wb": [dict(w, urut=i + 1) for i, w in enumerate(wb_out)], "kandidat_dalam_radius": len(dalam)})
    return out


# ---------------------------------------------------------------- teks WA
def _alasan(c):
    a, o = c["alasan"], []
    if "titik_baru" in a:
        o.append("%d titik baru lintasan terakhir" % a["titik_baru"] if a["titik_baru"] else "tanpa titik baru")
        if a["menahun_hari"] > 1:
            o.append("menahun %d hari" % a["menahun_hari"])
        if a.get("gambut"):
            o.append("gambut")
        if "ffmc" in a and not a.get("ffmc_basi"):
            o.append("FFMC %s" % a["ffmc"])
        if "permukiman_km" in a:
            o.append("permukiman %s km" % a["permukiman_km"])
        o.append("belum ada temuan 48 jam" if a.get("belum_ditangani") else "sudah ada temuan 48 jam")
        if a.get("clear_lalu_titik_baru"):
            o.append("sempat clear, ada titik baru")
    else:
        o.append("temuan %s%s%s" % (a["temuan"], " oleh " + a["oleh"] if a.get("oleh") else "",
                                    ", laporan menyebut " + a["lokasi_laporan"] if a.get("lokasi_laporan") else ""))
        if a.get("luas_klaim_ha"):
            o.append("klaim %s ha" % a["luas_klaim_ha"])
        o.append("jarak sumber air: tidak tersedia")
    return "; ".join(o)


def teks(r):
    t = datetime.fromisoformat(r["tanggal"])
    judul = "%d %s %d" % (t.day, BULAN[t.month - 1], t.year)
    out = []
    for b in r["base"]:
        L = ["USULAN TARGET, Base %s %s, operasi %s (versi %s)" % (b["id"], b["nama"], judul, r["versi"]),
             "Usulan lokasi untuk dilihat, bukan perintah terbang. Keputusan terbang pada PIC dan komando.", ""]
        for judul2, kunci in (("TARGET PATROLI (berurut dari base)", "patroli"), ("TARGET WATER BOMBING (FS terkonfirmasi)", "wb")):
            L.append(judul2)
            if not b[kunci]:
                L.append("  tidak ada usulan")
            for c in b[kunci]:
                L += ["%d. %s" % (c["urut"], c["tempat"] or "(nama wilayah tidak tersedia)"), "   " + c["dms"], "   " + c["rd"],
                      "   Alasan: " + _alasan(c)]
                if "terakhir" in c:
                    L.append("   Titik panas terakhir: %s WIB, %s" % (c["terakhir"]["jam_wib"], c["terakhir"]["satelit"]))
                u = c["udara"]
                L.append("   Udara pagi (06-10 WIB): " + ("PM2,5 prakiraan maks %s ug/m3 (%s); jarak pandang tidak tersedia" % (u["pm25_maks"], u["kab"])
                                                       if isinstance(u, dict) else "tidak tersedia"))
            L.append("")
        L.append("Kaki: radial = baringan benar dikurangi deklinasi timur %s derajat (PERKIRAAN tetap, bukan WMM); jelajah %d Nm. Titik panas: %s. FFMC: %s. Skor hipotesis."
                 % (b["deklinasi_timur"], b["radius_nm"], r["sumber"]["titik_panas"], r["sumber"]["ffmc"]))
        out.append("\n".join(L))
    return ("\n\n" + "=" * 40 + "\n\n").join(out) + "\n"


# ---------------------------------------------------------------- jalan
def utama(a):
    kini = waktu(a.kini) if a.kini else datetime.now(timezone.utc)
    tanggal = datetime.fromisoformat(a.tanggal).date() if a.tanggal else \
        tgl_wib(kini) + timedelta(days=1 if a.versi == "malam" else 0)
    B = json.loads(BOBOT.read_text(encoding="utf-8"))
    titik, ket_h, acuan = muat_hotspot(a.hotspot, kini, B["ambang"]["jendela_hotspot_jam"])
    sumber = {"titik_panas": "%s (acuan %s, %d titik sedang/tinggi 72 jam)" % (ket_h, acuan, len(titik))}
    jalur_temuan = a.temuan
    if not jalur_temuan and os.environ.get("OPERASI_COOKIE"):
        temuan = []
        for h in (0, 1):  # peta per tanggal WIB; 48 jam = hari ini dan kemarin
            req = urllib.request.Request("%s/api/operasi/peta?tanggal=%s" % (API, tgl_wib(kini - timedelta(days=h))), headers={"Cookie": os.environ["OPERASI_COOKIE"]})
            temuan += temuan_dari(json.load(urllib.request.urlopen(req, timeout=30)), kini)
        sumber["temuan"] = "GET /api/operasi/peta (%d temuan 48 jam)" % len(temuan)
    else:
        temuan = muat_temuan(jalur_temuan, kini)
        sumber["temuan"] = "%s (%d temuan 48 jam)" % (jalur_temuan, len(temuan)) if jalur_temuan else \
            "TIDAK ADA (tanpa --temuan dan tanpa env OPERASI_COOKIE): titik clear tidak dikeluarkan, WB kosong"
    ffmc, sumber["ffmc"] = muat_ffmc(kini)
    pm, sumber["pm25"] = muat_pm(tanggal)
    sumber["gambut"] = "public/data/lahan/gambut.geojson (BBSDLP 1:250.000)"
    sumber["air"] = "tidak dipakai: data air hanya Kalsel"
    sumber["jarak_pandang"] = "tidak tersedia (metar.json basi/terbatas, OP-8)"
    desa_raw = baca_json(AKAR / "public/data/osm/desa.json")
    desa_prov = {p: Ruang(v) for p, v in desa_raw.items()}
    desa_semua = Ruang([x for v in desa_raw.values() for x in v])
    desa_prov["*"] = desa_semua
    gambut = Gambut(AKAR / "public/data/lahan/gambut.geojson")
    base = muat_base(a.base)
    r = susun(tanggal, a.versi, kini, titik, temuan, base, B, ffmc, pm, gambut, desa_prov, desa_semua, sumber)
    r["sumber"] = sumber
    KELUAR.mkdir(parents=True, exist_ok=True)
    nama = "renlap_%s_%s" % (tanggal, a.versi)
    (KELUAR / (nama + ".json")).write_text(json.dumps(r, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    (KELUAR / (nama + ".txt")).write_text(teks(r), encoding="utf-8")
    print("ditulis public/data/operasi/%s.{json,txt}; base: %s" % (nama, ", ".join("%s p%d/w%d" % (b["id"], len(b["patroli"]), len(b["wb"])) for b in r["base"])))
    if a.kirim_api:
        rute = any('"POST /api/operasi/renlap"' in p.read_text(encoding="utf-8") for p in (AKAR / "src").glob("*.js"))
        print("--kirim-api: " + ("rute ada, tetapi pengirim belum dibuat (butuh token mesin)" if rute else "rute POST /api/operasi/renlap belum ada di Worker; dilewati"))


# ---------------------------------------------------------------- self-check
def uji():
    pnk = (-0.079153, 109.375)
    r, d = radial_jarak(pnk, -0.10111, 109.59278, 0.5)
    assert r in (95, 96) and abs(d - 13) <= 1 and abs(baringan(*pnk, -0.10111, 109.59278) - 95.7) < 0.2, (r, d)
    print("1. PNK->Pasak R %03d D %.1f Nm (harap R 095-096 D 13)" % (r, d))
    r, d = radial_jarak(pnk, -0.45078, 109.36847, 0.5)
    assert r in (180, 181) and abs(d - 22) <= 1, (r, d)
    print("2. PNK->Kubu R %03d D %.1f Nm (harap R 180-181 D 22)" % (r, d))

    B = json.loads(BOBOT.read_text(encoding="utf-8"))
    kini = datetime(2026, 11, 2, 12, 0, tzinfo=timezone.utc)

    def hs(lat, lon, jam_lalu):
        return {"lat": lat, "lon": lon, "t": kini - timedelta(hours=jam_lalu), "sat": "N20", "wil": "61|Kubu Raya|Sungai Ambawang"}
    titik = [hs(-0.205, 109.505, 3), hs(-0.2052, 109.5052, 3), hs(-0.3, 109.6, 30)]
    clear = {"lat": -0.3, "lon": 109.6, "status": "clear", "t": kini - timedelta(hours=10), "lokasi": "x", "luas": None, "reg": "H-3217"}
    ada = kandidat(titik, [clear], B)
    assert len(ada) == 1 and abs(ada[0]["lat"] + 0.205) < 0.01, ada
    baru = kandidat(titik + [hs(-0.3005, 109.6005, 2)], [clear], B)
    assert len(baru) == 2 and any(c["alasan"].get("clear_lalu_titik_baru") for c in baru), baru
    print("3. clear tanpa titik baru dikeluarkan (%d sel); dengan titik baru <=1 km dipertahankan (%d sel, pengurang bobot)" % (len(ada), len(baru)))

    kand = [{"lat": la, "lon": lo} for la, lo in [(-0.5, 109.4), (-0.2, 109.4), (-0.35, 109.4), (-0.35, 109.4001), (-0.9, 109.4)]]
    o1 = [(c["lat"], c["lon"]) for c in urut_tetangga((-0.1, 109.4), kand)]
    o2 = [(c["lat"], c["lon"]) for c in urut_tetangga((-0.1, 109.4), list(reversed(kand)))]
    assert o1 == o2 and o1[0] == (-0.2, 109.4) and o1[-1] == (-0.9, 109.4), o1
    print("4. urutan tetangga terdekat stabil terhadap urutan masukan:", o1)

    for lat, lon in [(-0.101110, 109.592780), (-6.0, 99.5), (0.425589, 101.441), (-3.4368, 114.731), (1.5, 109.0)]:
        la, lo = dari_dms(dms(lat, lon))
        assert abs(la - lat) < 1 / 7200 + 1e-9 and abs(lo - lon) < 1 / 7200 + 1e-9, (lat, lon, la, lo)
    assert dms(-0.10111, 109.59278) == "S 00° 06' 04\"  E 109° 35' 34\"", dms(-0.10111, 109.59278)
    print('5. DMS bolak-balik; contoh', dms(-0.10111, 109.59278))
    print("lulus")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("perintah", nargs="?", default="buat", choices=["buat"])
        ap.add_argument("--tanggal")
        ap.add_argument("--versi", choices=["malam", "pagi"], default="malam")
        ap.add_argument("--hotspot")
        ap.add_argument("--temuan")
        ap.add_argument("--base")
        ap.add_argument("--kini")
        ap.add_argument("--kirim-api", action="store_true")
        utama(ap.parse_args())
