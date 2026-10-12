"""Indeks iklim ENSO & IOD -> public/data/iklim.json

Pakai:  python3 scripts/data/iklim.py
Sumber (semua domain publik pemerintah AS, tanpa kunci):
  ONI & RONI   NOAA CPC  https://www.cpc.ncep.noaa.gov/data/indices/{oni,RONI}.ascii.txt (bulanan, rata 3 bulan)
  Status ENSO  NOAA CPC ENSO Diagnostic Discussion (teks "ENSO Alert System Status" + sinopsis peluang)
  DMI/IOD      NOAA OSMC State of the Ocean, DMI mingguan dari OISST (netCDF3 klasik, dibaca tanpa pustaka)
BoM (iod_1.txt) sengaja tidak dipakai: situsnya memblokir akses otomatis dan menyatakan tidak mendukung scraping.

Aturan bobot musim (dipakai UI untuk kalender musim di musim.json):
  w = 1,0 bila CPC berstatus El Niño Advisory; 0,5 bila El Niño Watch; 0 untuk lainnya (netral / La Niña).
  IOD positif (rata-rata DMI 8 minggu terakhir >= +0,4 °C) menambah 0,25 (maks 1) khusus dasarian Juli-Desember
  (indeks 18-35): IOD positif mengeringkan Sumatra & Kalimantan Agustus-November (2019: El Niño lemah + IOD kuat).
  peluang[d] = w_d * p_el_nino[d] + (1 - w_d) * p_biasa[d].
"""
import datetime as dt, html, json, os, re, struct, sys, urllib.request

AKAR = os.path.join(os.path.dirname(__file__), "../..")
KELUAR = os.path.join(AKAR, "public/data/iklim.json")
ONI = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
RONI = "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt"
DISKUSI = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml"
DMI = "https://stateoftheocean.osmc.noaa.gov/sur/data/dmi.nc"
AMBANG_IOD, MINGGU_IOD = 0.4, 8
DARI_TAHUN = 1997


def ambil(url):
    req = urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0 (karhutla public dashboard)"})
    return urllib.request.urlopen(req, timeout=60).read()


def oni(teks):
    """[{tahun, musim, nilai}] dari baris 'SEAS YR TOTAL ANOM' (ONI) atau 'SEAS YR ANOM' (RONI)."""
    out = []
    for b in teks.splitlines()[1:]:
        p = b.split()
        if len(p) >= 3 and p[1].isdigit():
            out.append({"tahun": int(p[1]), "musim": p[0], "nilai": float(p[-1])})
    return out


def netcdf3(b):
    """Pembaca minimal netCDF3 klasik (CDF\\x01/\\x02): {nama_variabel: [nilai]} untuk variabel numerik."""
    assert b[:3] == b"CDF" and b[3] in (1, 2), "bukan netCDF3 klasik"
    lebar_off = 4 if b[3] == 1 else 8
    pos = 4
    def u32():
        nonlocal pos
        v = struct.unpack(">I", b[pos:pos + 4])[0]; pos += 4; return v
    def nama():
        nonlocal pos
        n = u32(); s = b[pos:pos + n].decode(); pos += n + (-n % 4); return s
    UK = {1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8}
    FMT = {3: "h", 4: "i", 5: "f", 6: "d"}
    def atribut():
        nonlocal pos
        tag, n = u32(), u32()
        assert tag in (0, 12)
        for _ in range(n):
            nama(); t = u32(); m = u32(); pos += UK[t] * m + (-(UK[t] * m) % 4)
    nrec = u32()
    tag, n = u32(), u32()
    dims = []
    for _ in range(n):
        dims.append((nama(), u32()))
    atribut()
    tag, n = u32(), u32()
    var = {}
    for _ in range(n):
        nm = nama(); nd = u32(); ids = [u32() for _ in range(nd)]
        atribut()
        t, vsize = u32(), u32()
        off = struct.unpack(">I" if lebar_off == 4 else ">Q", b[pos:pos + lebar_off])[0]; pos += lebar_off
        var[nm] = (ids, t, vsize, off)
    rec = [v for v in var.values() if v[0] and dims[v[0][0]][1] == 0]
    reclen = sum(v[2] for v in rec) if len(rec) > 1 else (rec[0][2] if rec else 0)
    out = {}
    for nm, (ids, t, vsize, off) in var.items():
        if t not in FMT:
            continue
        if ids and dims[ids[0]][1] == 0:  # variabel rekaman: satu nilai skalar per rekaman (cukup untuk deret waktu 1-D)
            out[nm] = [struct.unpack(">" + FMT[t], b[off + i * reclen:off + i * reclen + UK[t]])[0] for i in range(nrec)]
        else:
            n = vsize // UK[t]
            out[nm] = list(struct.unpack(">" + FMT[t] * n, b[off:off + n * UK[t]]))
    return out


def status_cpc(teks):
    t = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", teks)))
    m = re.search(r"ENSO Alert System Status:\s*([A-Za-zñÑ\s]+?)(?:\s{2,}|Synopsis)", t)
    s = re.search(r"Synopsis:\s*(.+?\.)\s", t)
    return (m.group(1).strip() if m else None), (s.group(1).strip() if s else None)


def status_enso(alert, oni_akhir):
    a = (alert or "").lower()
    if "el ni" in a and "advisory" in a:
        return "El Niño", 1.0
    if "la ni" in a and "advisory" in a:
        return "La Niña", 0.0
    if "el ni" in a and "watch" in a:
        return "Netral", 0.5
    if not alert:  # CPC tak terbaca: ambang ONI klasik
        return ("El Niño", 1.0) if oni_akhir >= 0.5 else ("La Niña", 0.0) if oni_akhir <= -0.5 else ("Netral", 0.0)
    return "Netral", 0.0


def status_iod(dmi):
    akhir = [d["nilai"] for d in dmi[-MINGGU_IOD:]]
    r = sum(akhir) / len(akhir)
    return ("IOD positif" if r >= AMBANG_IOD else "IOD negatif" if r <= -AMBANG_IOD else "Netral"), round(r, 2)


def bobot(w_enso, iod):
    """36 bobot El Niño per dasarian (lihat aturan di docstring modul)."""
    return [min(1.0, w_enso + (0.25 if iod == "IOD positif" and d >= 18 else 0)) for d in range(36)]


def bangun():
    o = [x for x in oni(ambil(ONI).decode()) if x["tahun"] >= DARI_TAHUN]
    r = [x for x in oni(ambil(RONI).decode()) if x["tahun"] >= DARI_TAHUN]
    alert, sinopsis = status_cpc(ambil(DISKUSI).decode("utf-8", "replace"))
    nc = netcdf3(ambil(DMI))
    waktu = next(v for k, v in nc.items() if k.upper() == "TIME")
    nilai = next(v for k, v in nc.items() if k.upper() != "TIME")
    t0 = dt.date(1800, 1, 1)
    dmi = [{"tgl": (t0 + dt.timedelta(days=w)).isoformat(), "nilai": round(v, 2)} for w, v in zip(waktu, nilai)
           if abs(v) < 50][-104:]
    status, w = status_enso(alert, o[-1]["nilai"])
    iod, dmi8 = status_iod(dmi)
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
           "status": status, "cpc_status": alert, "cpc_sinopsis": sinopsis,
           "oni_terakhir": o[-1], "roni_terakhir": r[-1] if r else None,
           "iod_status": iod, "dmi_8_minggu": dmi8,
           "bobot_el_nino": bobot(w, iod),
           "aturan": "peluang[d] = w[d]*p_el_nino[d] + (1-w[d])*p_biasa[d]; w = 1 El Niño Advisory, 0,5 El Niño Watch, 0 lainnya; +0,25 Jul-Des bila DMI 8 minggu >= +0,4",
           "oni": o, "roni": r, "dmi": dmi,
           "sumber": {"oni": ONI, "roni": RONI, "status": DISKUSI, "dmi": DMI + " (NOAA OSMC, OISST, mingguan)"}}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"iklim.json {status} ({alert}) ONI {o[-1]['musim']} {o[-1]['tahun']} {o[-1]['nilai']:+.2f} | {iod} DMI8 {dmi8:+.2f} "
          f"(minggu {dmi[-1]['tgl']}) | {os.path.getsize(KELUAR) / 1e3:.0f} KB")
    # invarian: deret harus mutakhir; data basi lebih berbahaya dari tidak ada
    hari = (dt.date.today() - dt.date.fromisoformat(dmi[-1]["tgl"])).days
    assert hari < 45, f"DMI terakhir {dmi[-1]['tgl']} sudah {hari} hari: sumber OSMC berhenti diperbarui"
    assert o[-1]["tahun"] >= dt.date.today().year - 1, f"ONI terakhir {o[-1]}: sumber CPC berhenti"


def uji():
    assert oni(" SEAS  YR   TOTAL   ANOM\n  JAS 2026  29.12   2.16\n") == [{"tahun": 2026, "musim": "JAS", "nilai": 2.16}]
    assert status_enso("El Niño Advisory", 0.1) == ("El Niño", 1.0)
    assert status_enso("La Niña Watch", -0.3) == ("Netral", 0.0)
    assert status_enso(None, 0.7) == ("El Niño", 1.0)
    assert status_cpc("<p>ENSO Alert System Status: El Ni&ntilde;o Advisory</p> <p>Synopsis: Kuat. Lagi.</p>")[0] == "El Niño Advisory"
    assert status_iod([{"nilai": 0.5}] * 8)[0] == "IOD positif" and status_iod([{"nilai": 0.1}] * 8)[0] == "Netral"
    b = bobot(0.5, "IOD positif")
    assert b[0] == 0.5 and b[18] == 0.75 and bobot(1.0, "IOD positif")[30] == 1.0
    # netCDF3: 1 dimensi rekaman TIME, 2 variabel rekaman (double, float), 2 rekaman
    def s(x):
        e = x.encode(); return struct.pack(">I", len(e)) + e + b"\0" * (-len(e) % 4)
    hdr = b"CDF\x01" + struct.pack(">I", 2) + struct.pack(">II", 10, 1) + s("TIME") + struct.pack(">I", 0) + struct.pack(">II", 0, 0)
    vars_ = []
    for nm, t, sz in (("TIME", 6, 8), ("DMI", 5, 4)):
        vars_.append(s(nm) + struct.pack(">II", 1, 0) + struct.pack(">II", 0, 0) + struct.pack(">II", t, sz))
    base = len(hdr) + 8 + sum(len(v) + 4 for v in vars_)
    blok = hdr + struct.pack(">II", 11, 2) + vars_[0] + struct.pack(">I", base) + vars_[1] + struct.pack(">I", base + 8)
    data = struct.pack(">df", 100.0, 0.5) + struct.pack(">df", 107.0, -0.25)
    assert netcdf3(blok + data) == {"TIME": [100.0, 107.0], "DMI": [0.5, -0.25]}


if __name__ == "__main__":
    uji()
    bangun()
