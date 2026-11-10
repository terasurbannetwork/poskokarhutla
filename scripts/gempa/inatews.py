#!/usr/bin/env python3
"""Arsip InaTEWS BMKG (cdn.bmkg.go.id): katalog semua magnitudo, buletin M5+/Dirasakan/Tsunami, produk per kejadian.

BMKG hanya menyimpan 30 buletin terakhir, jadi semua keluaran APPEND-ONLY (digabung dengan berkas lama, tidak pernah dikosongkan):
  public/gempa/data/inatews_katalog.json         kolom ringkas, kunci id seiscomp (bmg2026wank), gabungan 3mgempaQL + live30event
  public/gempa/data/inatews_detail_<YYYY-MM>.json per kejadian: buletin, focal, siaran pers bersih, stasiun, produk yang ada
  public/gempa/data/inatews_tsunami.json          urutan buletin tsunami, zona (wzarea), tinggi terukur (obsarea), produk
  public/gempa/data/inatews_sejarah.json          katalog_gempa.json (420 gempa merusak 1923-2022)
  public/gempa/data/inatews_sensor.json           sensor_seismic.json (stasiun)
Satu gempa punya DUA id buletin (Dirasakan dan M5+): dipasangkan menurut waktu asal dan jarak, bukan dianggap satu id.
Parameter tiap buletin disimpan apa adanya (awal beda dengan pemutakhiran), tidak dirata-rata.
Python 3.12 stdlib. Gagal-lunak: sumber mati = berkas lama dibiarkan. Jeda 1,1 detik antar permintaan (maks 60 per menit).
Pakai: python3 scripts/gempa/inatews.py [jalan] [--anggaran N]   |   python3 scripts/gempa/inatews.py uji   (tanpa jaringan)
Data ini milik BMKG; tampilkan dengan atribusi "Sumber: BMKG". Pemilik memutuskan lanjut walau ada ketentuan akses otomatis BMKG."""
import html.parser
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

CDN = "https://cdn.bmkg.go.id/"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
JEDA = 1.1
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "public", "gempa", "data")
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture_inatews")
WIB = timezone(timedelta(hours=7))
NS = "{urn:oasis:names:tc:emergency:cap:1.2}"
TEKS = ["focal.json", "narasi.txt", "rev/stationlist_MMI.txt"]
GAMBAR = ["mmi.jpg", "focal.png", "gif", "wz.png", "tt.png", "ssh.png", "rev/intensity_logo.jpg", "rev/impact_list.jpg", "rev/reports-1.jpg", "rev/loc_map.png"]
PRODUK = {"m5": ["mmi.jpg", "focal.json", "focal.png", "narasi.txt", "gif"],
          "dirasakan": ["mmi.jpg", "rev/stationlist_MMI.txt", "rev/intensity_logo.jpg", "rev/impact_list.jpg", "rev/reports-1.jpg", "rev/loc_map.png"],
          "tsunami": ["mmi.jpg", "wz.png", "tt.png", "ssh.png"], "tsunami_penuh": ["mmi.jpg", "wz.png", "tt.png", "ssh.png", "focal.json", "narasi.txt", "gif"]}


# ---------------------------------------------------------------- jaringan
class Jaringan:
    def __init__(self, anggaran=150, tidur=time.sleep):
        self.anggaran, self.tidur, self.akhir, self.galat = anggaran, tidur, 0.0, 0

    def minta(self, url, metode="GET"):
        """isi bytes (GET) / b'' (HEAD) bila ada, None bila 404 atau gagal. Menghitung anggaran per permintaan."""
        self.anggaran -= 1
        w = JEDA - (time.time() - self.akhir)
        if w > 0:
            self.tidur(w)
        self.akhir = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}, method=metode), timeout=30) as r:
                return r.read() if metode == "GET" else b""
        except urllib.error.HTTPError as e:
            if e.code != 404:
                self.galat += 1
            return None
        except (urllib.error.URLError, TimeoutError, OSError):
            self.galat += 1
            return None


# ---------------------------------------------------------------- waktu dan jarak
def wib_epoch(tgl, jam):
    """'10-11-26' atau '15-08-2026' + '15:34:04 WIB' atau '05:41 WIB' -> epoch UTC detik."""
    d, m, y = (int(x) for x in tgl.strip().split("-"))
    h = [int(x) for x in jam.replace("WIB", "").strip().split(":")] + [0, 0]
    return int(datetime(y + (2000 if y < 100 else 0), m, d, h[0], h[1], h[2], tzinfo=WIB).timestamp())


def utc_epoch(s):
    """'2026/11/10  08:34:06.051' atau '2026-11-10 03:37:52.89705' (UTC) -> epoch detik."""
    s = re.sub(r"\s+", " ", s.strip()).replace("/", "-")
    return int(datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc).timestamp())


def jarak_km(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def angka(s, d=None):
    m = re.search(r"-?\d+(?:\.\d+)?", str(s or ""))
    return float(m.group()) if m else d


# ---------------------------------------------------------------- pengurai
def urai_live(teks):
    out = []
    for g in ET.fromstring(teks).iter("gempa"):
        v = {c.tag: (c.text or "").strip() for c in g}
        try:
            out.append({"id": v["eventid"], "t": utc_epoch(v["waktu"]), "lat": float(v["lintang"]), "lon": float(v["bujur"]), "dalam": angka(v.get("dalam")),
                        "m": round(float(v["mag"]), 1), "tempat": v.get("area", ""), "status": v.get("status", ""), "fokal": v.get("fokal", "")})
        except (KeyError, ValueError):
            continue
    return out


def urai_3m(teks):
    out = []
    for f in json.loads(teks).get("features", []):
        p, c = f.get("properties", {}), f.get("geometry", {}).get("coordinates", [])
        try:
            out.append({"id": p["id"], "t": utc_epoch(p["time"]), "lat": float(c[1]), "lon": float(c[0]), "dalam": round(float(p["depth"]), 1), "m": round(float(p["mag"]), 1),
                        "tempat": p.get("place", ""), "status": p.get("status", ""), "fase": p.get("fase", "")})
        except (KeyError, ValueError, IndexError):
            continue
    return out


def jenis_buletin(subject):
    s = subject.lower()
    return "tsunami" if "tsunami" in s else "dirasakan" if "dirasakan" in s else "m5"


def urai_cap(teks):
    """buletin CAP -> daftar dict; zona dan pantau sebagai larik ringkas dengan epoch UTC."""
    out = []
    for info in ET.fromstring(teks).iter(NS + "info"):
        def v(t):
            e = info.find(NS + t)
            return (e.text or "").strip() if e is not None and e.text else ""
        try:
            lon, lat = (float(x) for x in info.find(NS + "point").find(NS + "coordinates").text.split(","))
            b = {"id": v("eventid"), "jenis": jenis_buletin(v("subject")), "subjek": v("subject"), "t": wib_epoch(v("date"), v("time")), "lat": lat, "lon": lon,
                 "m": round(float(v("magnitude")), 1), "dalam": angka(v("depth")), "area": v("area"), "potensi": v("potential"), "judul": v("headline"),
                 "deskripsi": v("description"), "instruksi": v("instruction"), "felt": v("felt"), "terkirim": v("timesent"),
                 "berakhir": "berakhir" in v("headline").lower(),
                 "peta": {k: v(k) for k in ("shakemap", "wzmap", "ttmap", "sshmap") if v(k)}}
        except (AttributeError, ValueError, KeyError):
            continue
        ts = re.match(r"(\d\d)/(\d\d)/(\d{4}) (\d\d:\d\d:\d\d)", b["terkirim"])
        b["terbit"] = wib_epoch(f"{ts[1]}-{ts[2]}-{ts[3]}", ts[4]) if ts else b["t"]
        b["zona"] = [[(z.findtext(NS + "province") or "").strip(), (z.findtext(NS + "district") or "").strip(), (z.findtext(NS + "level") or "").strip(),
                      wib_epoch(z.findtext(NS + "date"), z.findtext(NS + "time"))] for z in info.findall(NS + "wzarea")]
        b["pantau"] = [[(o.findtext(NS + "location") or "").strip(), float(o.findtext(NS + "loclatitude")), float(o.findtext(NS + "loclongitude")),
                        float(o.findtext(NS + "height")), wib_epoch(o.findtext(NS + "date"), o.findtext(NS + "time"))] for o in info.findall(NS + "obsarea")]
        out.append(b)
    return out


class _Bersih(html.parser.HTMLParser):
    """siaran pers -> hanya <p>, <strong>, <em>; atribut, style, tag lain dibuang, teks di-escape."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.o, self.buka = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("p", "strong", "em"):
            self.o.append("<%s>" % tag)
            self.buka += tag == "p"
        elif tag == "br":
            self.o.append(" ")

    def handle_endtag(self, tag):
        if tag in ("p", "strong", "em"):
            self.o.append("</%s>" % tag)

    def handle_data(self, d):
        self.o.append(d.replace("\xa0", " ").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def bersihkan_narasi(teks):
    p = _Bersih()
    p.feed(teks)
    s = re.sub(r"[ \t\r\n]+", " ", "".join(p.o))
    s = re.sub(r"<(strong|em)> *</\1>", "", s)
    s = re.sub(r"\s+([,.;:])", r"\1", s).replace("( ", "(").replace(" )", ")")   # 'M5,0</strong> pada' tetap, ' ,' -> ','
    return "".join(x.strip() + "" for x in re.findall(r"<p>.*?</p>", s) if re.sub(r"<[^>]+>", "", x).strip())


STASIUN = re.compile(r"\|\s*(\d+)\s*\|\s*([A-Z0-9]+)\s*\|\s*([^|]+)\|\s*(-?\d+(?:\.\d+)?)\s*\|\s*(-?\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(X\+|[IVX]+)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)")


def urai_stasiun(teks):
    return [[m[2], m[3].strip(), float(m[4]), float(m[5]), float(m[6]), m[7], float(m[8]), float(m[9]), float(m[10])] for m in STASIUN.finditer(teks.replace("\r", ""))]


def urai_focal(teks):
    try:
        j = json.loads(teks)
        f = lambda d, k: round(float(d[k]), 1)
        return {"seiscomp": j.get("seiscomp_id"), "np1": [f(j["np1"], k) for k in ("strike1", "dip1", "rake1")], "np2": [f(j["np2"], k) for k in ("strike2", "dip2", "rake2")],
                "m0": float("%.3e" % float(j["m0"])), "mw": round(float(j["mw"]), 2), "dalam": angka(j.get("focaldepth"))}
    except (ValueError, KeyError, TypeError):
        return None


# ---------------------------------------------------------------- pasangan buletin dan katalog
def cocok(b, katalog):
    """kejadian katalog terdekat dengan asal buletin: selisih waktu <= 90 detik dan jarak <= 100 km; skor kecil menang."""
    pilih, skor = None, 9
    for k in katalog:
        dt = abs(k["t"] - b["t"])
        if dt > 90:
            continue
        dj = jarak_km(k["lat"], k["lon"], b["lat"], b["lon"])
        if dj <= 100 and dt / 90 + dj / 100 < skor:
            pilih, skor = k, dt / 90 + dj / 100
    return pilih


def gabung_katalog(lama, baru_3m, baru_live):
    """kunci id; live30event menimpa 3mgempaQL (lebih segar, punya fokal), keduanya menimpa arsip lama. Tidak ada yang dihapus."""
    d = {k["id"]: k for k in lama}
    for k in baru_3m + baru_live:
        d[k["id"]] = {**d.get(k["id"], {}), **{a: b for a, b in k.items() if b not in (None, "")}}
    return sorted(d.values(), key=lambda k: -k["t"])


# ---------------------------------------------------------------- berkas
def baca(nama, awal):
    try:
        with open(os.path.join(DATA, nama), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return awal


def tulis(nama, obj, folder=None):
    p = os.path.join(folder or DATA, nama)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


KOLOM = ["id", "t", "lat", "lon", "m", "dalam", "tempat", "status", "fokal"]


def simpan_katalog(daftar, folder=None):
    tulis("inatews_katalog.json", {"dibuat": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "sumber": "BMKG InaTEWS, cdn.bmkg.go.id/3mgempaQL.json dan live30event.xml",
                                   "catatan": "waktu = epoch detik UTC; dibaca append-only karena BMKG hanya menyimpan sekitar 3 bulan", "kolom": KOLOM,
                                   "baris": [[k.get(c) for c in KOLOM] for k in daftar]}, folder)


def muat_katalog():
    j = baca("inatews_katalog.json", {})
    return [dict(zip(j.get("kolom", KOLOM), r)) for r in j.get("baris", [])]


# ---------------------------------------------------------------- penyusunan detail
def ringkas_buletin(b):
    return {k: b[k] for k in ("id", "jenis", "subjek", "t", "terbit", "terkirim", "lat", "lon", "m", "dalam", "area", "potensi", "judul", "felt", "peta") if b.get(k) not in (None, "")}


def susun(buletin, katalog, detail, tsunami):
    """memasukkan buletin ke detail kejadian (kunci id seiscomp) dan ke daftar tsunami. Mengembalikan kunci-kunci yang tersentuh."""
    sentuh = set()
    kelompok = []   # buletin tsunami satu gempa: awal dan pemutakhiran punya parameter beda, jadi digabung menurut waktu dan jarak
    for b in sorted((x for x in buletin if x["jenis"] == "tsunami"), key=lambda x: x["id"]):
        for g in kelompok:
            if abs(g[0]["t"] - b["t"]) <= 90 and jarak_km(g[0]["lat"], g[0]["lon"], b["lat"], b["lon"]) <= 100:
                g.append(b)
                break
        else:
            kelompok.append([b])
    for b in buletin:
        if b["jenis"] == "tsunami":
            continue
        k = cocok(b, katalog)
        key = k["id"] if k else "bul" + b["id"]
        d = detail.setdefault(key, {"id": key, "buletin": [], "produk": {}, "cek": {}})
        if k:
            d.update({a: k[a] for a in ("t", "lat", "lon", "m", "dalam", "tempat") if k.get(a) is not None})
        else:
            d.update({"t": b["t"], "lat": b["lat"], "lon": b["lon"], "m": b["m"], "dalam": b["dalam"], "tempat": b["area"]})
        if b["id"] not in [x["id"] for x in d["buletin"]]:
            d["buletin"].append(ringkas_buletin(b))
        sentuh.add(key)
    for bs in kelompok:
        r = bs[-1]
        k = cocok(r, katalog)
        lama = next((x for x in tsunami.values() if abs(x["t"] - r["t"]) <= 90 and jarak_km(x["lat"], x["lon"], r["lat"], r["lon"]) <= 100), None)
        key = k["id"] if k else lama["id"] if lama else "bul" + min(x["id"] for x in bs)
        g = tsunami.setdefault(key, {"id": key, "buletin": []})
        g.update({"t": r["t"], "lat": r["lat"], "lon": r["lon"], "area": r["area"], "m": r["m"]})
        ada = {x["id"] for x in g["buletin"]}
        for b in sorted(bs, key=lambda x: x["id"]):
            if b["id"] not in ada:
                g["buletin"].append({**ringkas_buletin(b), "instruksi": b["instruksi"], "deskripsi": b["deskripsi"], "berakhir": b["berakhir"], "zona": b["zona"], "pantau": b["pantau"],
                                     "produk": [], "cek": 0})
        g["buletin"].sort(key=lambda x: x["id"])
        d = detail.setdefault(key, {"id": key, "buletin": [], "produk": {}, "cek": {}})
        if k:
            d.update({a: k[a] for a in ("t", "lat", "lon", "m", "dalam", "tempat") if k.get(a) is not None})
        else:
            d.setdefault("t", r["t"]), d.setdefault("lat", r["lat"]), d.setdefault("lon", r["lon"]), d.setdefault("m", r["m"]), d.setdefault("tempat", r["area"])
        d["tsunami"] = {"buletin": len(g["buletin"]), "terakhir": g["buletin"][-1]["id"]}
        sentuh.add(key)
    return sentuh


def periksa_produk(net, bid, jenis, d, tsu=None, sekarang=None):
    """ada-atau-404 untuk produk satu id buletin; teks (focal, narasi, stasiun) ikut diambil. Selesai hanya bila anggaran cukup."""
    sekarang = sekarang or time.time()
    nama = PRODUK[jenis]
    if net.anggaran < len(nama):
        return False
    ada = []
    for p in nama:
        if p.endswith("focal.json") or p.endswith(".txt"):
            isi = net.minta(CDN + (bid + "_" + p if not p.startswith("rev/") else bid + "_" + p))
            if isi is None:
                continue
            t = isi.decode("latin-1" if "stationlist" in p else "utf-8", "replace")
            if p == "focal.json" and urai_focal(t):
                d["focal"] = urai_focal(t)
            elif p == "narasi.txt" and bersihkan_narasi(t):
                d["narasi"], d["narasi_dari"] = bersihkan_narasi(t), bid
            elif p.startswith("rev/") and urai_stasiun(t):
                d["stasiun"], d["stasiun_dari"] = urai_stasiun(t), bid
            ada.append(p)
        else:
            sep = "_" if p.startswith(("rev/", "focal.")) else "."
            if net.minta(CDN + bid + sep + p, "HEAD") is not None:
                ada.append(p)
    d["produk"][bid] = ada
    d["cek"][bid] = int(sekarang)
    if tsu is not None:
        for b in tsu["buletin"]:
            if b["id"] == bid:
                b["produk"], b["cek"] = ada, int(sekarang)
    return True


def perlu_cek(d, bid, sekarang, t_kejadian):
    """belum pernah dicek, atau kejadian < 36 jam dan cek terakhir > 30 menit lalu (produk menyusul belakangan)."""
    c = d["cek"].get(bid)
    return c is None or (sekarang - t_kejadian < 36 * 3600 and sekarang - c > 1800)


def jalan(anggaran=150, net=None, sekarang=None):
    net = net or Jaringan(anggaran)
    sekarang = sekarang or time.time()
    teks = {}
    for n in ("live30event.xml", "3mgempaQL.json", "last30event.xml", "last30feltevent.xml", "last30tsunamievent.xml", "katalog_gempa.json", "sensor_seismic.json"):
        r = net.minta(CDN + n)
        teks[n] = r.decode("utf-8", "replace") if r else None
    print("daftar:", {k: bool(v) for k, v in teks.items()})
    uji = lambda f, n: (f(teks[n]) if teks[n] else [])
    try:
        katalog = gabung_katalog(muat_katalog(), uji(urai_3m, "3mgempaQL.json"), uji(urai_live, "live30event.xml"))
    except (ET.ParseError, ValueError):
        katalog = muat_katalog()
    if katalog:
        simpan_katalog(katalog)
    buletin = []
    for n in ("last30event.xml", "last30feltevent.xml", "last30tsunamievent.xml"):
        try:
            buletin += uji(urai_cap, n)
        except ET.ParseError:
            print("gagal urai", n)
    bulan = {}
    tsunami = baca("inatews_tsunami.json", {}).get("kejadian", {})
    for k in {datetime.fromtimestamp(b["t"], timezone.utc).strftime("%Y-%m") for b in buletin}:
        bulan.update(baca(f"inatews_detail_{k}.json", {}).get("kejadian", {}))
    detail = bulan
    sentuh = susun(buletin, katalog, detail, tsunami)
    # produk: kejadian terbaru dulu; anggaran habis = sisa dikerjakan pada putaran berikut
    for key in sorted(sentuh, key=lambda k: -detail[k].get("t", 0)):
        d = detail[key]
        for b in list(d["buletin"]):
            if perlu_cek(d, b["id"], sekarang, d["t"]) and not periksa_produk(net, b["id"], b["jenis"], d, sekarang=sekarang):
                break
        g = tsunami.get(key)
        if g:
            ids = [b["id"] for b in g["buletin"]]
            for i, bid in enumerate(reversed(ids)):
                if perlu_cek(d, bid, sekarang, g["t"]):
                    if not periksa_produk(net, bid, "tsunami_penuh" if i == 0 or bid == ids[0] else "tsunami", d, g, sekarang):
                        break
    per_bulan = {}
    for key, d in detail.items():
        d["diakses"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        per_bulan.setdefault(datetime.fromtimestamp(d.get("t", 0), timezone.utc).strftime("%Y-%m"), {})[key] = d
    stempel = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    for k, v in per_bulan.items():
        tulis(f"inatews_detail_{k}.json", {"dibuat": stempel, "sumber": "BMKG InaTEWS, cdn.bmkg.go.id", "kejadian": v})
    if tsunami:
        tulis("inatews_tsunami.json", {"dibuat": stempel, "sumber": "BMKG InaTEWS, last30tsunamievent.xml", "kejadian": tsunami})
    if teks["katalog_gempa.json"]:
        f = json.loads(teks["katalog_gempa.json"])["features"]
        tulis("inatews_sejarah.json", {"dibuat": stempel, "sumber": "BMKG, katalog gempa merusak 1923-2022 (cdn.bmkg.go.id/katalog_gempa.json)",
               "baris": [{**x["properties"], "lon": float(x["geometry"]["coordinates"][0]), "lat": float(x["geometry"]["coordinates"][1])} for x in f]})
    if teks["sensor_seismic.json"]:
        f = json.loads(teks["sensor_seismic.json"])["features"]
        tulis("inatews_sensor.json", {"dibuat": stempel, "sumber": "BMKG, jaringan sensor seismik (cdn.bmkg.go.id/sensor_seismic.json)",
               "baris": [[x["properties"]["id"], x["properties"].get("stakeholder", "").strip(), x["properties"].get("uptbmkg", ""),
                          float(x["geometry"]["coordinates"][0]), float(x["geometry"]["coordinates"][1])] for x in f]})
    print(f"katalog {len(katalog)} | detail {len(detail)} | tsunami {len(tsunami)} | permintaan sisa anggaran {net.anggaran} | galat jaringan {net.galat}")
    return 0


# ---------------------------------------------------------------- uji (tanpa jaringan, fixture nyata)
def _fix(n):
    with open(os.path.join(FIX, n), encoding="utf-8", errors="replace") as f:
        return f.read()


def uji():
    live, m3 = urai_live(_fix("live30event.xml")), urai_3m(_fix("3mgempaQL.json"))
    assert live[0]["id"] == "bmg2026wank" and live[0]["m"] == 5.0 and live[0]["t"] == utc_epoch("2026-11-10 08:34:06"), live[0]
    assert m3[0]["id"] == "bmg2026wadq" and m3[0]["m"] == 5.5 and m3[0]["lon"] == 166.005066, m3[0]
    cap = urai_cap(_fix("last30event.xml")) + urai_cap(_fix("last30feltevent.xml")) + urai_cap(_fix("last30tsunamievent.xml"))
    m5, fl, ts = [b for b in cap if b["jenis"] == "m5"], [b for b in cap if b["jenis"] == "dirasakan"], [b for b in cap if b["jenis"] == "tsunami"]
    assert len(m5) == 1 and len(fl) == 1 and len(ts) == 2, (len(m5), len(fl), len(ts))
    assert m5[0]["id"] == "20261110153700" and fl[0]["id"] == "20261110153404" and m5[0]["t"] == utc_epoch("2026-11-10 08:34:04"), m5[0]
    assert fl[0]["felt"] == "II - III Manokwari" and m5[0]["potensi"] == "tidak berpotensi TSUNAMI" and not m5[0]["berakhir"]
    assert ts[0]["berakhir"] is True and ts[1]["berakhir"] is False and ts[0]["zona"] == [] and len(ts[1]["zona"]) == 2 and ts[1]["zona"][0][2] == "SIAGA" and ts[1]["pantau"][0][3] == 0.14, (ts[1]["zona"][:1], ts[1]["pantau"][:1])
    assert ts[1]["zona"][0][3] == wib_epoch("15-08-2026", "05:02:23 WIB") and ts[0]["terbit"] == wib_epoch("15-08-2026", "07:31:30 WIB")
    # dua id buletin untuk satu gempa -> satu kejadian katalog
    kat = gabung_katalog([], m3, live)
    detail, tsu = {}, {}
    susun(m5 + fl + ts, kat, detail, tsu)
    assert "bmg2026wank" in detail and len(detail["bmg2026wank"]["buletin"]) == 2 and {b["m"] for b in detail["bmg2026wank"]["buletin"]} == {5.3}, list(detail)
    assert detail["bmg2026wank"]["m"] == 5.0, "katalog (pemutakhiran) tetap 5,0 dan buletin tetap 5,3, tidak dirata-rata"
    assert len(tsu) == 1 and len(next(iter(tsu.values()))["buletin"]) == 2
    # append-only: menyusun ulang tidak menggandakan, dan kejadian lama tidak hilang
    susun(m5 + fl + ts, kat, detail, tsu)
    assert len(detail["bmg2026wank"]["buletin"]) == 2 and len(next(iter(tsu.values()))["buletin"]) == 2
    assert {k["id"] for k in gabung_katalog(kat, [], [])} == {k["id"] for k in kat}
    # produk
    n = bersihkan_narasi(_fix("narasi.txt"))
    assert n.startswith("<p><strong>GEMPABUMI TEKTONIK M5,3") and "<script" not in n and "style=" not in n and "&deg;" not in n and "0,32° LS" in n and "<p>" in n, n[:200]
    assert bersihkan_narasi('<p onclick="x()">a<script>b</script><b>c</b></p>') == "<p>abc</p>" or "onclick" not in bersihkan_narasi('<p onclick="x()">a</p>')
    st = urai_stasiun(_fix("stationlist_MMI.txt"))
    assert len(st) == 3 and st[0][0] == "FKSPI" and st[0][5] == "IX" and st[2][5] == "I" and st[1][1] == "Anggi, Pegunungan Arfak", st
    fo = urai_focal(_fix("focal.json"))
    assert fo["seiscomp"] == "bmg2026wank" and fo["np1"] == [82.4, 40.4, 78.6] and fo["mw"] == 5.02, fo
    # jaringan palsu: produk ada-atau-404, 404 tidak dihitung galat, anggaran dihormati
    class Palsu(Jaringan):
        def minta(self, url, metode="GET"):
            self.anggaran -= 1
            n = url.rsplit("/", 1)[1]
            if n.endswith("_focal.json"):
                return _fix("focal.json").encode()
            if n.endswith("_narasi.txt"):
                return _fix("narasi.txt").encode()
            return b"" if n.endswith((".mmi.jpg", "_focal.png", ".gif")) else None
    d = {"produk": {}, "cek": {}}
    p = Palsu(20)
    assert periksa_produk(p, "20261110153700", "m5", d, sekarang=1e9) and d["produk"]["20261110153700"] == ["mmi.jpg", "focal.json", "focal.png", "narasi.txt", "gif"], d["produk"]
    assert d["focal"]["mw"] == 5.02 and d["narasi_dari"] == "20261110153700"
    assert not periksa_produk(Palsu(2), "x", "m5", {"produk": {}, "cek": {}}), "anggaran kurang = tunda, bukan setengah jalan"
    assert not perlu_cek({"cek": {"a": 1e9}}, "a", 1e9 + 40 * 3600, 1e9) and perlu_cek({"cek": {}}, "a", 1e9, 1e9)
    print("uji inatews OK")
    return 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        sys.exit(uji())
    sys.exit(jalan(int(a[a.index("--anggaran") + 1]) if "--anggaran" in a else 150))
