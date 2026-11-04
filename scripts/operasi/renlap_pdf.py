#!/usr/bin/env python3
"""Renlap penerbangan dalam PDF bergambar, satu berkas per base (pola Renlap Rute Udara Merauke 30 Okt 2026).

Masukan: public/data/operasi/renlap_<tanggal>_<versi>.json (keluaran renlap.py buat). Isi tiap PDF:
  1. peta rute di atas citra satelit Esri + urutan check point (CP),
  2. tabel leg untuk pilot (haluan sejati, km, NM, menit, R/D dari VOR),
  3. satu halaman per CP: peta 14 x 14 km, radius pandang 6 km, titik panas sekitar.
Titik panas dipotong pada jam `dibuat` renlap (versi pagi: 07.00 WIB). Usulan, bukan perintah terbang.

  python3 scripts/operasi/renlap_pdf.py uji
  python3 scripts/operasi/renlap_pdf.py buat [--tanggal YYYY-MM-DD, bawaan seperti renlap.py] [--versi pagi|malam] [--base PNK,PLM] [--kecepatan 200] [--out DIR]
Keluaran bawaan: scripts/operasi/kerja/<tanggal>_<versi>/Renlap <BASE> <tanggal> <versi>.pdf (tidak di-commit).
"""
import argparse
import html
import json
import math
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import renlap as R  # noqa: E402  (geometri, DMS, sumber titik panas yang sama)

AKAR = R.AKAR
KERJA = AKAR / "scripts/operasi/kerja"
TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
ORBIT_MNT = 2      # orbit di tiap CP (pola Merauke)
RADIUS_KM = 6      # radius pandang di sekitar CP
KOTAK_KM = 14      # sisi peta per CP


# ---------------------------------------------------------------- angka gaya Indonesia
def ang(x, d=0):
    s = f"{x:,.{d}f}"
    return s.replace(",", "_").replace(".", ",").replace("_", ".")


def jam_wib(t):
    w = t.astimezone(timezone.utc) + R.WIB
    return f"{w.day:02d}/{w.month:02d} {w.hour:02d}.{w.minute:02d}"


def tgl_panjang(t):
    w = t.astimezone(timezone.utc) + R.WIB
    return f"{w.day} {BULAN[w.month - 1]} {w.year}, {w.hour:02d}.{w.minute:02d} WIB"


def gmaps(lat, lon):
    return f"https://www.google.com/maps/search/?api=1&query={lat:.5f},{lon:.5f}"


def km(a, b):
    return R.jarak_nm(a[0], a[1], b[0], b[1]) * R.NM_KM


# ---------------------------------------------------------------- peta: ubin Esri + proyeksi Web Mercator
def gpx(lat, lon, z):
    n = 256 * 2 ** z
    s = math.sin(math.radians(max(-85, min(85, lat))))
    return (lon + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n


def ubin(z, x, y, cache):
    f = cache / f"{z}_{x}_{y}.jpg"
    if not f.exists():
        # curl, bukan urllib: urllib Python 3.9 (LibreSSL) menggantung di server Esri, curl 0,7 detik
        subprocess.run(["curl", "-sfL", "--retry", "3", "-m", "30", "-A", "centurisk97-renlap/1", "-o", str(f), TILE.format(z=z, x=x, y=y)], check=True)
    return f


def bingkai(lat, lon, z, w, h, cache, keluar):
    """Mosaik citra w x h piksel berpusat (lat, lon) pada zoom z -> fungsi proyeksi (lat, lon) -> (x, y) piksel bingkai."""
    from PIL import Image
    cx, cy = gpx(lat, lon, z)
    x0, y0 = cx - w / 2, cy - h / 2
    tx = range(int(x0 // 256), int((x0 + w) // 256) + 1)
    ty = range(int(y0 // 256), int((y0 + h) // 256) + 1)
    kerja = [(x, y) for x in tx for y in ty]
    with ThreadPoolExecutor(6) as ex:
        berkas = list(ex.map(lambda p: ubin(z, p[0], p[1], cache), kerja))
    img = Image.new("RGB", (w, h))
    for (x, y), f in zip(kerja, berkas):
        img.paste(Image.open(f).convert("RGB"), (int(x * 256 - x0), int(y * 256 - y0)))
    img.save(keluar, quality=82)
    return lambda la, lo: tuple(v - o for v, o in zip(gpx(la, lo, z), (x0, y0)))


def m_per_px(lat, z):
    return 156543.034 * math.cos(math.radians(lat)) / 2 ** z


# ---------------------------------------------------------------- titik panas (sumber dan potongan jam sama dengan renlap)
def muat_titik(kini):
    lokal = AKAR / "public/data/hotspot72.json"
    d = R.baca_json(lokal)
    if abs((kini - R.waktu(d["acuan"])).total_seconds()) > 72 * 3600:
        d = R.baca_json(R.API + "/api/titik")
    ac, k = R.waktu(d["acuan"]), {n: i for i, n in enumerate(d["kolom"])}
    out = []
    for b in d["baris"]:
        t = ac + timedelta(hours=b[k["jam"]])
        umur = (kini - t).total_seconds() / 3600
        if 0 <= umur <= 48 and b[k["keyakinan"]] >= 1:
            out.append({"lat": b[k["lat"]], "lon": b[k["lon"]], "t": t, "umur": umur,
                        "sat": R.SATELIT.get(b[k["sensor"]], b[k["sensor"]]), "frp": b[k["frp"]] if "frp" in k else None})
    return out


# ---------------------------------------------------------------- rute
def susun_rute(b, v_kmj, jenis="patroli"):
    """Satu sortie: base -> target `jenis` (patroli = CP, wb = WB) sesuai urutan renlap -> kembali ke base.
    Patroli dan water bombing sortie terpisah (pesawat berbeda). Jarak dan waktu kumulatif termasuk orbit tiap target."""
    cp = [dict(c, kode=f"{'WB' if jenis == 'wb' else 'CP'}{c['urut']}") for c in b.get(jenis) or []]
    base = {"kode": b["id"], "lat": b["lat"], "lon": b["lon"], "tempat": f"Base {b['nama']}"}
    titik = [base] + cp + [dict(base, tempat=f"kembali ke Base {b['nama']}")]
    leg, kum_km, kum_mnt = [], 0.0, 0.0
    titik[0].update(kum_km=0, kum_mnt=0)
    for i in range(1, len(titik)):
        a, c = titik[i - 1], titik[i]
        j = km((a["lat"], a["lon"]), (c["lat"], c["lon"]))
        mnt = j / v_kmj * 60
        kum_km += j
        kum_mnt += mnt + (ORBIT_MNT if i > 1 else 0)
        leg.append({"no": i, "dari": a["kode"], "ke": c["kode"], "lat": c["lat"], "lon": c["lon"], "km": j, "nm": j / R.NM_KM, "mnt": mnt,
                    "haluan": R.baringan(a["lat"], a["lon"], c["lat"], c["lon"])})
        c = titik[i] = dict(c, kum_km=kum_km, kum_mnt=kum_mnt)
    return titik, leg


def sekitar(titik, lat, lon, r_km, jam_maks):
    out = [dict(t, d=km((lat, lon), (t["lat"], t["lon"]))) for t in titik if t["umur"] <= jam_maks]
    return [t for t in out if t["d"] <= r_km]


# ---------------------------------------------------------------- HTML
CSS = """
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}body{margin:0;font-family:Inter,Roboto,"Helvetica Neue",Arial,sans-serif;color:#0b2545;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hal{width:297mm;height:210mm;padding:9mm 10mm 7mm;position:relative;page-break-after:always;overflow:hidden}
.ey{font-size:7.5pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5b6b82}
h1{font-size:17pt;margin:1mm 0 0;font-weight:800}
.kepala{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.2px solid #0b2545;padding-bottom:2.5mm;margin-bottom:3.5mm}
.per{font-size:7.5pt;color:#5b6b82;text-align:right}.per b{color:#1f6fb2;display:block}
.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-bottom:3.5mm}
.kpi div{border-left:3px solid #0b2545;padding-left:3mm}.kpi div.o{border-color:#e8590c}
.kpi b{font-size:16pt;display:block}.kpi .o b{color:#e8590c}.kpi span{font-size:7.5pt;color:#3d4b60}
.dua{display:grid;grid-template-columns:118mm 1fr;gap:5mm;align-items:start}
.dua.cp{grid-template-columns:150mm 1fr}
.peta{position:relative;border-radius:2mm;overflow:hidden;background:#20303f}
.peta img,.peta svg{position:absolute;inset:0;width:100%;height:100%}
.kartu{border:1px solid #d9e1ea;border-radius:2mm;overflow:hidden}
.kartu h3{margin:0;font-size:8pt;letter-spacing:.05em;text-transform:uppercase;padding:2.2mm 3mm;border-left:3px solid #e8590c;background:#f6f8fb}
table{width:100%;border-collapse:collapse;font-size:7.6pt}
th{font-size:6.6pt;color:#5b6b82;font-weight:600;text-align:left;padding:1.3mm 1.5mm;border-bottom:1px solid #0b2545}
td{padding:1.4mm 1.5mm;border-bottom:1px solid #e6ebf1;vertical-align:top}
.n{text-align:right;white-space:nowrap}.mono{font-family:"SF Mono",Menlo,monospace;font-size:6.8pt;white-space:nowrap}
a{color:#1f6fb2;text-decoration:none}
.bul{display:inline-flex;width:5.2mm;height:5.2mm;border-radius:50%;background:#e8590c;color:#fff;font-weight:800;font-size:7pt;align-items:center;justify-content:center}
.bul.b{background:#0b2545}
.leg{display:flex;gap:4mm;flex-wrap:wrap;font-size:7pt;color:#3d4b60;margin-top:1.5mm}
.leg i{display:inline-block;width:2.6mm;height:2.6mm;border-radius:50%;margin-right:1mm;vertical-align:-.3mm}
.fnd{font-size:7pt;color:#5b6b82;margin:2mm 3mm}
.kaki{position:absolute;left:10mm;right:10mm;bottom:5mm;font-size:6pt;color:#7a879a;line-height:1.35}
ul,ol{margin:2mm 3mm 2mm 7mm;padding:0;font-size:7.6pt;line-height:1.45}li{margin-bottom:1mm}
.besar{font-size:15pt;font-weight:800;color:#1f6fb2;margin:2mm 3mm 0}.mono.b{font-size:9pt;margin:1mm 3mm 2mm;display:block}
.tbl{display:inline-block;background:#1f6fb2;color:#fff;font-weight:700;font-size:7.5pt;padding:1.6mm 3mm;border-radius:1.2mm;margin:0 3mm 3mm}
.pil{display:inline-block;font-size:7pt;font-weight:700;padding:1mm 2.6mm;border-radius:9mm;background:#fdebd3;color:#8a4a06;margin-left:1.5mm}
.pil.abu{background:#eef1f5;color:#0b2545}
.mini{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:3mm 0}
.mini div{background:#f6f8fb;border-radius:1.5mm;padding:2mm 3mm;font-size:7pt;color:#3d4b60}.mini b{font-size:11pt;color:#0b2545}
.nocp{display:flex;gap:4mm;align-items:center}.nocp .bul{width:11mm;height:11mm;font-size:15pt}
"""

PANAH = '<defs><marker id="p" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 10,5 0,10z" fill="#38bdf8"/></marker></defs>'


def svg_rute(P, titik, w, h, aktif=None, tebal=4):
    s = [f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">{PANAH}']
    for i in range(1, len(titik)):
        (x1, y1), (x2, y2) = P(titik[i - 1]["lat"], titik[i - 1]["lon"]), P(titik[i]["lat"], titik[i]["lon"])
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        s.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#38bdf8" stroke-width="{tebal}"/>'
                 f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{mx:.1f}" y2="{my:.1f}" stroke="none" marker-end="url(#p)" stroke-width="{tebal}"/>')
    return s


def titik_svg(P, daftar, r):
    s = []
    for t in sorted(daftar, key=lambda t: -t["umur"]):
        x, y = P(t["lat"], t["lon"])
        warna = "#ef4444" if t["umur"] <= 24 else "#facc15"
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{warna}" stroke="#fff" stroke-width="{r / 5:.1f}"/>')
    return s


def penanda(P, t, r, base=False, label=None, ukuran=22):
    x, y = P(t["lat"], t["lon"])
    isi = "B" if base else str(t["urut"])
    s = [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{"#0b2545" if base else "#e8590c"}" stroke="#fff" stroke-width="{r / 4:.1f}"/>',
         f'<text x="{x:.1f}" y="{y + r * .38:.1f}" text-anchor="middle" font-size="{r * 1.05:.0f}" font-weight="800" fill="#fff" font-family="Inter,Arial">{isi}</text>']
    if label:
        s.append(f'<text x="{x + r + 6:.1f}" y="{y + 7:.1f}" font-size="{ukuran}" font-weight="700" fill="#fff" stroke="#0b2545" stroke-width="5" paint-order="stroke" font-family="Inter,Arial">{html.escape(label)}</text>')
    return s


def skala(w, h, mpp, km_bar, ukuran=20):
    px = km_bar * 1000 / mpp
    x, y = w - px - 40, h - 36
    return [f'<rect x="{x - 14}" y="{y - 30}" width="{px + 28}" height="46" rx="6" fill="#fff" opacity=".9"/>',
            f'<line x1="{x}" y1="{y}" x2="{x + px}" y2="{y}" stroke="#0b2545" stroke-width="5"/>',
            f'<text x="{x}" y="{y - 9}" font-size="{ukuran}" fill="#0b2545" font-family="Inter,Arial">0</text>',
            f'<text x="{x + px}" y="{y - 9}" font-size="{ukuran}" text-anchor="end" fill="#0b2545" font-family="Inter,Arial">{ang(km_bar)} km</text>']


def utara(w):
    return [f'<circle cx="{w - 50}" cy="54" r="32" fill="#fff" opacity=".92"/><path d="M{w - 50},30 l14,36 -14,-9 -14,9z" fill="#0b2545"/>'
            f'<text x="{w - 50}" y="22" text-anchor="middle" font-size="20" font-weight="800" fill="#fff" stroke="#0b2545" stroke-width="4" paint-order="stroke">U</text>']


def kaki(meta):
    return (f'<div class="kaki">Sumber: titik panas NASA FIRMS (VIIRS S-NPP, NOAA-20, NOAA-21, MODIS) lewat sistem Centurisk97, kondisi per {meta["per"]} '
            f'(deteksi satelit terakhir {meta["acuan"]}), keyakinan sedang dan tinggi. Target dari renlap usulan Centurisk97 versi {meta["versi"]} '
            f'(skor hipotesis). Citra Esri World Imagery. Waktu tempuh = jarak garis lurus pada {ang(meta["v"])} km/jam tanpa angin, ditambah orbit '
            f'{ORBIT_MNT} menit tiap CP. Haluan sejati (true), belum dikoreksi variasi magnet. Titik panas adalah deteksi satelit, bukan pengukuran api di lapangan. '
            f'Usulan lokasi untuk dilihat, bukan perintah terbang: keputusan terbang pada PIC dan komando.</div>')


def kepala(ey, judul, meta, kanan=None):
    kanan = kanan or "Kondisi per<b>%s</b>" % meta["per"]
    return (f'<div class="kepala"><div><div class="ey">{html.escape(ey)}</div><h1>{html.escape(judul)}</h1></div>'
            f'<div class="per">{kanan}</div></div>')


def halaman_base(b, titik, leg, panas, meta, kerja, cache, jenis="patroli"):
    misi = "water bombing" if jenis == "wb" else "patroli"
    ey = f"BNPB, RENCANA LAPANGAN UDARA, BASE {b['nama'].upper()} ({b['id']})"
    cp = titik[1:-1]
    semua = [(t["lat"], t["lon"]) for t in titik]
    la0, la1 = min(p[0] for p in semua), max(p[0] for p in semua)
    lo0, lo1 = min(p[1] for p in semua), max(p[1] for p in semua)
    W, H = 1100, 1060
    z = 12
    while z > 4:
        (ax, ay), (bx, by) = gpx(la1, lo0, z), gpx(la0, lo1, z)
        if (bx - ax) * 1.25 <= W and (by - ay) * 1.25 <= H:
            break
        z -= 1
    clat, clon = (la0 + la1) / 2, (lo0 + lo1) / 2
    P = bingkai(clat, clon, z, W, H, cache, kerja / f"{b['id']}_{jenis}_rute.jpg")
    dalam = [t for t in panas if 0 <= P(t["lat"], t["lon"])[0] <= W and 0 <= P(t["lat"], t["lon"])[1] <= H]
    s = svg_rute(P, titik, W, H) + titik_svg(P, dalam, 6)
    s += penanda(P, titik[0], 15, base=True, label=f"Base {b['nama']}")
    for c in cp:
        s += penanda(P, c, 13)
    mpp = m_per_px(clat, z)
    bar = next(k for k in (5, 10, 20, 25, 50, 100) if k * 1000 / mpp >= W * .12)
    s += skala(W, H, mpp, bar) + utara(W) + ["</svg>"]
    n24 = [len(sekitar(panas, c["lat"], c["lon"], RADIUS_KM, 24)) for c in cp]
    total_km, total_mnt = titik[-1]["kum_km"], titik[-1]["kum_mnt"]
    baris = []
    for t in titik:
        isb = t["kode"] == b["id"]
        n = "–" if isb else ang(len(sekitar(panas, t["lat"], t["lon"], RADIUS_KM, 24)))
        baris.append(f'<tr><td><span class="bul{" b" if isb else ""}">{"B" if isb else t["urut"]}</span></td>'
                     f'<td><b>{t["kode"]}</b> {html.escape(t.get("tempat") or "")}</td>'
                     f'<td class="n"><a href="{gmaps(t["lat"], t["lon"])}">{t["lat"]:.4f}, {t["lon"]:.4f}</a></td>'
                     f'<td class="n" style="color:#e8590c;font-weight:700">{n}</td><td class="n">{ang(t["kum_km"])} km</td><td class="n">+{ang(t["kum_mnt"])} mnt</td></tr>')
    kpi = (f'<div class="kpi"><div class="o"><b>{ang(sum(n24))}</b><span>titik panas 24 jam dalam {RADIUS_KM} km dari check point</span></div>'
           f'<div><b>{ang(len(cp))} {"target" if jenis == "wb" else "check point"}</b><span>{"sortie water bombing ke temuan lapangan terkonfirmasi" if jenis == "wb" else "sortie patroli, urut tetangga terdekat dari base"}</span></div>'
           f'<div><b>± {ang(total_km)} km</b><span>loop base, semua CP, kembali ke base ({ang(total_km / R.NM_KM)} NM)</span></div>'
           f'<div class="o"><b>± {ang(total_mnt)} menit</b><span>pada {ang(meta["v"])} km/jam, termasuk orbit {ORBIT_MNT} menit tiap CP</span></div></div>')
    judul = f"Rencana rute udara {misi} karhutla dari " + b["nama"]
    h1 = (f'<section class="hal">{kepala(ey, judul, meta)}{kpi}'
          f'<div class="dua"><div><div class="peta" style="height:118mm"><img src="{b["id"]}_{jenis}_rute.jpg">{"".join(s)}</div>'
          f'<div class="leg"><span><i style="background:#ef4444"></i>Titik panas 24 jam</span><span><i style="background:#facc15"></i>24–48 jam</span>'
          f'<span><i style="background:#e8590c"></i>Check point</span><span><i style="background:#0b2545"></i>Base</span><span style="color:#0284c7">— Rute dan arah terbang</span></div></div>'
          f'<div class="kartu"><h3>Urutan check point, klik koordinat untuk Google Maps</h3><table><thead><tr><th></th><th>Titik</th><th class="n">Koordinat</th>'
          f'<th class="n">Titik panas</th><th class="n">Jarak tempuh</th><th class="n">Waktu</th></tr></thead><tbody>{"".join(baris)}</tbody></table>'
          f'<p class="fnd">Titik panas = deteksi 24 jam dalam radius {RADIUS_KM} km dari CP. Jarak dan waktu kumulatif sejak lepas landas.</p></div></div>{kaki(meta)}</section>')
    # halaman 2: leg pilot
    rd = {c["kode"]: c.get("rd", "") for c in cp}
    lb = "".join(f'<tr><td>{x["no"]}</td><td style="white-space:nowrap"><b>{x["dari"]}</b> ke <b>{x["ke"]}</b></td><td class="mono">{R.dms(x["lat"], x["lon"])}</td>'
                 f'<td class="mono" style="white-space:normal;max-width:42mm">{html.escape(rd.get(x["ke"], "")) or "–"}</td>'
                 f'<td class="n"><a href="{gmaps(x["lat"], x["lon"])}">{x["lat"]:.4f}, {x["lon"]:.4f}</a></td>'
                 f'<td class="n"><b>{round(x["haluan"]) % 360 or 360:03d}°</b></td><td class="n">{ang(x["km"], 1)} km</td><td class="n">{ang(x["nm"], 1)} NM</td>'
                 f'<td class="n">{"&lt; 1" if x["mnt"] < 1 else ang(x["mnt"])} mnt</td></tr>' for x in leg)
    lb += (f'<tr><td></td><td><b>Total</b></td><td></td><td></td><td></td><td></td><td class="n"><b>{ang(sum(x["km"] for x in leg))} km</b></td>'
           f'<td class="n"><b>{ang(sum(x["nm"] for x in leg))} NM</b></td><td class="n"><b>{ang(sum(x["mnt"] for x in leg))} mnt</b></td></tr>')
    alasan = []
    for c in cp:
        a = c.get("alasan", {})
        bag = []
        if a.get("titik_baru"):
            bag.append(f'{ang(a["titik_baru"])} titik baru lintasan terakhir')
        if a.get("menahun_hari", 0) > 1:
            bag.append(f'api {ang(a["menahun_hari"])} hari')
        if a.get("permukiman_km") is not None:
            bag.append(f'permukiman {ang(a["permukiman_km"], 1)} km')
        if a.get("gambut"):
            bag.append("di gambut")
        if c.get("jenis") == "wb":
            bag.insert(0, f'WATER BOMBING: temuan lapangan {a.get("temuan", "")} oleh {a.get("oleh", "")}'
                          + (f', klaim {ang(a["luas_klaim_ha"])} ha' if a.get("luas_klaim_ha") else ""))
        alasan.append(f'<li><b>{c["kode"]}</b> {html.escape(c.get("tempat") or "")}: {", ".join(bag) or "titik panas 24–48 jam, belum ada temuan lapangan"}.</li>')
    pm = [(c["udara"]["pm25_maks"], c["kode"]) for c in cp if (c.get("udara") or {}).get("pm25_maks") is not None]
    udara = [f"PM2,5 prakiraan tertinggi {ang(max(pm)[0])} µg/m³ di {max(pm)[1]}"] if pm else []
    h2 = (f'<section class="hal">{kepala(ey, "Flight plan " + misi + ": leg, haluan, dan jarak", meta)}'
          f'<div class="dua" style="grid-template-columns:190mm 1fr"><div class="kartu"><h3>Tabel leg untuk pilot</h3><table><thead><tr><th>Leg</th><th>Dari ke</th>'
          f'<th>Koordinat tujuan (DMS)</th><th>Radial/jarak VOR</th><th class="n">Google Maps</th><th class="n">Haluan sejati</th><th class="n">Jarak</th><th class="n">NM</th>'
          f'<th class="n">Waktu</th></tr></thead><tbody>{lb}</tbody></table><p class="fnd">Waktu leg pada {ang(meta["v"])} km/jam tanpa angin, belum termasuk orbit '
          f'{ORBIT_MNT} menit di tiap CP. Radial/jarak dari VOR {html.escape(b.get("vor") or b["id"])}, deklinasi {ang(b.get("deklinasi_timur", 0), 1)}° timur (perkiraan tetap).</p></div>'
          f'<div style="display:grid;gap:4mm;align-content:start"><div class="kartu"><h3>Kenapa check point ini</h3><ul>{"".join(alasan)}</ul></div>'
          f'<div class="kartu"><h3>Yang perlu diputuskan</h3><ol><li>Jenis pesawat dan kecepatan jelajah: hitungan memakai {ang(meta["v"])} km/jam; pilot menyesuaikan.</li>'
          f'<li>Urutan CP boleh diubah komando; jarak dan waktu dihitung ulang.</li>'
          f'<li>Udara pagi (06–10 WIB): {"; ".join(udara) or "data PM2,5 tidak tersedia"}. Jarak pandang METAR belum tersedia.</li>'
          f'<li>Ketinggian orbit dan izin wilayah udara (NOTAM) ditetapkan pilot dan Baseops.</li></ol></div></div></div>{kaki(meta)}</section>')
    return h1 + h2


def halaman_cp(b, titik, i, panas, meta, kerja, cache):
    c, sebelum, sesudah = titik[i], titik[i - 1], titik[i + 1]
    z = 13
    mpp = m_per_px(c["lat"], z)
    W = int(KOTAK_KM * 1000 / mpp)
    P = bingkai(c["lat"], c["lon"], z, W, W, cache, kerja / f"{b['id']}_{c['kode']}.jpg")
    dalam = [t for t in panas if 0 <= P(t["lat"], t["lon"])[0] <= W and 0 <= P(t["lat"], t["lon"])[1] <= W]
    r = RADIUS_KM * 1000 / mpp
    s = svg_rute(P, titik, W, W, tebal=4)
    s += [f'<circle cx="{W / 2}" cy="{W / 2}" r="{r:.1f}" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="9 7"/>',
          f'<text x="{W / 2}" y="{W / 2 - r - 10:.1f}" text-anchor="middle" font-size="20" fill="#fff" stroke="#0b2545" stroke-width="4" paint-order="stroke" font-family="Inter,Arial">radius pandang {RADIUS_KM} km</text>']
    s += titik_svg(P, dalam, 6)
    for t in titik[1:-1]:
        s += penanda(P, t, 17 if t is c else 13)
    s += skala(W, W, mpp, 2) + utara(W) + ["</svg>"]
    dekat = sorted(sekitar(panas, c["lat"], c["lon"], RADIUS_KM, 24), key=lambda t: (-(t["frp"] or 0), t["d"]))
    dekat48 = len(sekitar(panas, c["lat"], c["lon"], RADIUS_KM, 48)) - len(dekat)
    malam = sum(1 for t in dekat if not 6 <= (t["t"].astimezone(timezone.utc) + R.WIB).hour < 18)
    tb = "".join(f'<tr><td class="n"><a href="{gmaps(t["lat"], t["lon"])}">{t["lat"]:.4f}, {t["lon"]:.4f}</a></td><td>{jam_wib(t["t"])}</td><td>{t["sat"]}</td>'
                 f'<td class="n">{ang(t["frp"], 1) if t["frp"] is not None else "–"}</td><td class="n">{ang(t["d"], 1)} km</td></tr>' for t in dekat[:12])
    tb = tb or '<tr><td colspan="5">Tidak ada titik panas 24 jam dalam radius ini; target dari titik 24–48 jam atau api menahun.</td></tr>'
    hal = lambda a, b_: R.baringan(a["lat"], a["lon"], b_["lat"], b_["lon"])
    jk = lambda a, b_: km((a["lat"], a["lon"]), (b_["lat"], b_["lon"]))
    al = c.get("alasan") or {}
    wb = c.get("jenis") == "wb"
    kanan = ((f'<span class="pil" style="background:#dbeafe;color:#1e3a8a">Water bombing: {html.escape(str(al.get("temuan", "")))} oleh {html.escape(str(al.get("oleh", "")))}'
              f'{", " + ang(al["luas_klaim_ha"]) + " ha" if al.get("luas_klaim_ha") else ""}</span>') if wb else "") + (f'<span class="pil">{ang(len(dekat))} titik panas 24 jam</span><span class="pil abu">+{ang(c["kum_mnt"])} menit dari base</span>')
    return (f'<section class="hal"><div class="kepala"><div class="nocp"><span class="bul">{c["urut"]}</span><div><div class="ey">{"Target water bombing" if c["kode"].startswith("WB") else "Check point"} {c["urut"]} dari {len(titik) - 2}, '
            f'rute udara base {html.escape(b["nama"])}</div><h1>{html.escape(c.get("tempat") or c["kode"])}</h1></div></div><div class="per">{kanan}</div></div>'
            f'<div class="dua cp"><div><div class="peta" style="height:150mm;width:150mm"><img src="{b["id"]}_{c["kode"]}.jpg">{"".join(s)}</div>'
            f'<div class="leg"><span><i style="background:#ef4444"></i>Titik panas 24 jam</span><span><i style="background:#facc15"></i>24–48 jam</span>'
            f'<span><i style="background:#e8590c"></i>Check point</span><span style="color:#0284c7">— Rute dan arah terbang</span><span>Kotak {KOTAK_KM} × {KOTAK_KM} km.</span></div></div>'
            f'<div><div class="kartu"><h3>Koordinat check point, klik untuk Google Maps</h3><div class="besar"><a href="{gmaps(c["lat"], c["lon"])}">{c["lat"]:.4f}, {c["lon"]:.4f}</a></div>'
            f'<span class="mono b">{R.dms(c["lat"], c["lon"])}</span><span class="mono b">{html.escape(c.get("rd", ""))}</span><a class="tbl" href="{gmaps(c["lat"], c["lon"])}">Buka di Google Maps</a></div>'
            f'<div class="mini"><div>Masuk dari {sebelum["kode"]}<br><b>{round(hal(sebelum, c)) % 360 or 360:03d}°</b>, {ang(jk(sebelum, c), 1)} km</div>'
            f'<div>Lanjut ke {sesudah["kode"]}<br><b>{round(hal(c, sesudah)) % 360 or 360:03d}°</b>, {ang(jk(c, sesudah), 1)} km</div></div>'
            f'<div class="kartu"><h3>Titik panas di sekitar CP ({RADIUS_KM} km), FRP terbesar dulu</h3><table><thead><tr><th class="n">Koordinat</th><th>WIB</th><th>Satelit</th>'
            f'<th class="n">FRP, MW</th><th class="n">Dari CP</th></tr></thead><tbody>{tb}</tbody></table>'
            f'<p class="fnd">{ang(malam)} dari {ang(len(dekat))} titik terdeteksi malam hari. Titik panas 24–48 jam di sekitar CP: {ang(dekat48)}. '
            f'Titik panas terakhir di target: {html.escape((c.get("terakhir") or {}).get("jam_wib", "–"))} WIB.</p></div></div></div>{kaki(meta)}</section>')


def cari_chrome():
    for c in (os.environ.get("CHROME"), "google-chrome", "google-chrome-stable", "chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"):
        if c and (shutil.which(c) or os.path.exists(c)):
            return shutil.which(c) or c
    raise RuntimeError("Chrome tidak ditemukan (set CHROME)")


def buat(a):
    if not a.tanggal:  # sama dengan renlap.py: versi malam -> besok, versi pagi -> hari ini (WIB)
        a.tanggal = str(R.tgl_wib(datetime.now(timezone.utc)) + timedelta(days=1 if a.versi == "malam" else 0))
    src = R.KELUAR / f"renlap_{a.tanggal}_{a.versi}.json"
    d = json.loads(src.read_text())
    kini = R.waktu(d["dibuat"])
    panas = muat_titik(kini)
    acuan = max(t["t"] for t in panas)
    meta = {"per": tgl_panjang(kini), "acuan": tgl_panjang(acuan), "versi": a.versi, "v": a.kecepatan}
    kerja = Path(a.out) if a.out else KERJA / f"{a.tanggal}_{a.versi}"
    cache = KERJA / "ubin"
    kerja.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    pilih = set(a.base.split(",")) if a.base else None
    chrome, hasil, semua = cari_chrome(), [], []

    def cetak(nama, judul, isi):
        hf = kerja / f"{nama}.html"
        hf.write_text(f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>{html.escape(judul)}</title><style>{CSS}</style></head><body>{isi}</body></html>')
        pdf = kerja / f"Renlap {nama} {a.tanggal} {a.versi}.pdf"
        subprocess.run([chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=10000",
                        f"--print-to-pdf={pdf}", hf.as_uri()], check=True, capture_output=True, timeout=600)
        return pdf

    for b in d["base"]:
        if (pilih and b["id"] not in pilih) or not (b["patroli"] or b.get("wb")):
            continue
        isi, ring = "", []
        for jenis in ("patroli", "wb"):
            if not b.get(jenis):
                continue
            titik, leg = susun_rute(b, a.kecepatan, jenis)
            isi += halaman_base(b, titik, leg, panas, meta, kerja, cache, jenis)
            isi += "".join(halaman_cp(b, titik, i, panas, meta, kerja, cache) for i in range(1, len(titik) - 1))
            ring.append(f"{'WB' if jenis == 'wb' else 'patroli'} {len(titik) - 2} target, {ang(titik[-1]['kum_km'])} km, ± {ang(titik[-1]['kum_mnt'])} mnt")
        semua.append(isi)
        pdf = cetak(b["id"], f"Renlap rute udara {b['nama']} {a.tanggal} {a.versi}", isi)
        hasil.append(pdf)
        print(f"{b['id']}: {'; '.join(ring)} -> {pdf}")
    if len(semua) > 1:  # satu berkas untuk dikirim bot: batas gateway 8 pesan per nomor per hari
        pdf = cetak("semua base", f"Renlap rute udara semua base {a.tanggal} {a.versi}", "".join(semua))
        hasil.append(pdf)
        print(f"GABUNGAN {len(semua)} base -> {pdf}")
    if not hasil:
        print("tidak ada base bertarget", file=sys.stderr)
    return hasil


def uji():
    b = {"id": "PNK", "nama": "Supadio", "lat": -0.1523, "lon": 109.4045, "wb": [],
         "patroli": [{"lat": -0.10, "lon": 109.60, "urut": 1}, {"lat": 0.0, "lon": 109.70, "urut": 2}]}
    titik, leg = susun_rute(b, 200)
    assert [t["kode"] for t in titik] == ["PNK", "CP1", "CP2", "PNK"] and len(leg) == 3
    assert abs(titik[-1]["kum_km"] - sum(x["km"] for x in leg)) < 1e-9
    assert abs(titik[-1]["kum_mnt"] - (sum(x["mnt"] for x in leg) + 2 * ORBIT_MNT)) < 1e-9, "orbit dihitung sekali per CP"
    assert 70 < leg[0]["haluan"] < 80, leg[0]["haluan"]
    assert ang(1234.56, 1) == "1.234,6" and ang(3) == "3"
    b["wb"] = [{"lat": -0.12, "lon": 109.5, "urut": 1}]
    t2, _ = susun_rute(b, 200, "wb")
    assert [t["kode"] for t in t2] == ["PNK", "WB1", "PNK"], "water bombing sortie sendiri, tidak menempel di rute patroli"
    assert [t["kode"] for t in susun_rute(b, 200)[0]] == ["PNK", "CP1", "CP2", "PNK"]
    x, y = gpx(0, 0, 1)
    assert (x, y) == (256, 256)
    panas = [{"lat": -0.10, "lon": 109.61, "umur": 5}, {"lat": -0.10, "lon": 109.70, "umur": 5}, {"lat": -0.10, "lon": 109.605, "umur": 30}]
    assert len(sekitar(panas, -0.10, 109.60, 6, 24)) == 1 and len(sekitar(panas, -0.10, 109.60, 6, 48)) == 2
    print("lulus")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
        sys.exit()
    ap = argparse.ArgumentParser()
    ap.add_argument("perintah", choices=["buat"])
    ap.add_argument("--tanggal", default="")
    ap.add_argument("--versi", default="pagi", choices=["pagi", "malam"])
    ap.add_argument("--base", default="")
    ap.add_argument("--kecepatan", type=float, default=200.0, help="km/jam jelajah (bawaan 200, heli)")
    ap.add_argument("--out", default="")
    buat(ap.parse_args())
