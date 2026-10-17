"""Laporan harian karhutla untuk Presiden -> public/data/laporan.json

Titik panas dan luas terdampak per hari, per kab/kota, per provinsi, dengan arsip bergulir 90 hari.
Kontrak skema: lihat kunci-kunci di build(); halaman laporan membaca berkas ini.

Definisi angka:
  titik  = sensor M, N, N20 (hotspot.json sensor_utama), semua keyakinan, hari kalender WIB (== wilayah.json harian)
  luas   = sel kisi ~375 m berbeda berisi deteksi VIIRS (N, N20, N21) keyakinan >= 1 hari itu x 14,0625 ha (kunci sel == harian.py pix())
  baru   = luas sel yang tidak terdeteksi pada hari-hari sebelumnya di jendela hotspot.json
Hari D "lengkap" bila waktu hitung >= D 21:00 WIB (data.yml menutup 21.20 WIB).

Pakai:  python3 scripts/data/laporan.py  |  ... uji
"""
import datetime as dt, json, math, os, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
VIIRS = {"N", "N20", "N21"}
HA_SEL = 14.0625
ARSIP_HARI = 90
TUTUP_JAM = 21
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def baca(nama, dasar=None):
    try:
        with open(os.path.join(dasar or DATA, nama)) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def pix(lat, lon):  # sama dengan harian.py pix()
    return (round(lat / 0.003375), round(lon * math.cos(math.radians(lat)) / 0.003375))


def tanggal(mmdd, akhir):
    """'MM-DD' -> date; tahun dari hari akhir, mundur setahun bila melampaui hari akhir (pergantian tahun)."""
    m, d = map(int, mmdd.split("-"))
    t = dt.date(akhir.year, m, d)
    return t if t <= akhir else dt.date(akhir.year - 1, m, d)


def hari_status(dibuat, hari_akhir):
    """(hari_lengkap, hari_berjalan) menurut aturan 21:00 WIB."""
    tutup = dt.datetime.combine(hari_akhir, dt.time(TUTUP_JAM), WIB)
    if dibuat >= tutup:
        return hari_akhir, None
    return hari_akhir - dt.timedelta(days=1), hari_akhir


def hitung(hs, sensor_utama=None):
    """Titik panas -> {hari: {kunci_wilayah: {'t': titik, 's': set sel}}} dan 'nas'. Kunci: (prov,) atau (prov,kab)."""
    acuan = dt.datetime.fromisoformat(hs["acuan"]).astimezone(WIB)
    akhir = acuan.date()
    utama = set(sensor_utama or hs.get("sensor_utama") or ["M", "N", "N20"])
    tabel = [tuple(w.split("|")[:2]) for w in hs["wilayah"]]
    t, s = {}, {}  # t[hari][kunci] = titik ; s[hari][kunci] = set sel
    for lat, lon, _j, sen, _f, yak, w, tg in hs["baris"]:
        d = tanggal(tg, akhir)
        prov, kab = tabel[w]
        if sen in utama:
            for k in ((), (prov,), (prov, kab)):
                a = t.setdefault(d, {})
                a[k] = a.get(k, 0) + 1
        if sen in VIIRS and yak >= 1:
            c = pix(lat, lon)
            for k in ((), (prov,), (prov, kab)):
                s.setdefault(d, {}).setdefault(k, set()).add(c)
    return acuan, akhir, t, s


def seri(t, s):
    """-> hari terurut, {kunci: {'titik':[], 'luas':[], 'baru':[]}}, konteks {hari:int}."""
    hari = sorted(set(t) | set(s))
    kunci = {k for d in hari for k in list(t.get(d, {})) + list(s.get(d, {}))}
    out = {k: {"titik": [], "luas": [], "baru": []} for k in kunci}
    lihat = {k: set() for k in kunci}
    for d in hari:
        for k in kunci:
            sel = s.get(d, {}).get(k, set())
            out[k]["titik"].append(t.get(d, {}).get(k, 0))
            out[k]["luas"].append(round(len(sel) * HA_SEL))
            out[k]["baru"].append(round(len(sel - lihat[k]) * HA_SEL))
            lihat[k] |= sel
    return hari, out, {d.isoformat(): i for i, d in enumerate(hari)}


def gabung(arsip, hari, out, konteks, tertua):
    """Gabung seri baru dengan arsip lama -> (hari_iso, {kunci_str: seri}, konteks). Aturan: lihat docstring modul/skema."""
    baru_h = [d.isoformat() for d in hari]
    lama_h = (arsip or {}).get("hari") or []
    lama_ctx = (arsip or {}).get("_konteks") or {}
    # tanggal tertua jendela terpotong (FIRMS hanya sebagian hari itu): tanpa versi arsip, tidak dilaporkan
    semua = sorted((set(baru_h) - ({tertua} - set(lama_h))) | set(lama_h))
    if not semua:
        return [], {}, {}
    a, b = dt.date.fromisoformat(semua[0]), dt.date.fromisoformat(semua[-1])
    semua = [(a + dt.timedelta(days=i)).isoformat() for i in range((b - a).days + 1)][-ARSIP_HARI:]
    lama = arsip_seri(arsip)
    ctx = {}
    for d in semua:
        ctx[d] = max(konteks.get(d, -1) if d in baru_h else -1, lama_ctx.get(d, -1))
    hasil = {}
    for k in set(out) | set(lama):
        n, o = out.get(k), lama.get(k)
        r = {"titik": [], "luas": [], "baru": []}
        for d in semua:
            ada_l = o is not None and d in lama_h
            ada_b = n is not None and d in baru_h
            pakai_lama = ada_l and (not ada_b or d == tertua or d not in baru_h)
            for f in ("titik", "luas"):
                r[f].append(o[f][lama_h.index(d)] if pakai_lama else (n[f][baru_h.index(d)] if ada_b else 0))
            if ada_b and konteks.get(d, -1) >= lama_ctx.get(d, -1) or not ada_l:
                r["baru"].append(n["baru"][baru_h.index(d)] if ada_b else 0)
            else:
                r["baru"].append(o["baru"][lama_h.index(d)])
        hasil[k] = r
    return semua, hasil, {d: ctx[d] for d in semua if ctx[d] >= 0}


def arsip_seri(arsip):
    """Arsip lama -> {kunci: seri} dengan kunci sama seperti hitung()."""
    if not arsip:
        return {}
    o = {}
    n = arsip.get("nasional")
    if n:
        o[()] = {f: n[f] for f in ("titik", "luas", "baru")}
    for p, v in (arsip.get("prov") or {}).items():
        o[(p,)] = {f: v[f] for f in ("titik", "luas", "baru")}
    for v in arsip.get("kab") or []:
        o[(v["prov"], v["nama"])] = {f: v[f] for f in ("titik", "luas", "baru")}
    return o


def kompleks(kl):
    """kluster.json -> {kunci: [jumlah, luas, level, fwi_maks]} untuk (prov,) dan (prov,kab)."""
    r = {}
    for f in (kl or {}).get("features") or []:
        q = f["properties"]
        for k in ((q["prov"],), (q["prov"], q["kab"])):
            x = r.setdefault(k, [0, 0.0, 0, None])
            x[0] += 1
            x[1] += q.get("luas") or 0
            x[2] = max(x[2], q.get("level") or 0)
            if q.get("fwi") is not None:
                x[3] = q["fwi"] if x[3] is None else max(x[3], q["fwi"])
    return r


def build(hs, kl, meta, luas_resmi, operasi, arsip, sekarang=None):
    acuan, akhir, t, s = hitung(hs)
    hari, out, konteks = seri(t, s)
    dibuat = sekarang or (dt.datetime.fromisoformat(meta["dibuat"]) if meta and meta.get("dibuat") else dt.datetime.now(WIB))
    if dibuat.tzinfo is None:
        dibuat = dibuat.replace(tzinfo=WIB)
    lengkap, berjalan = hari_status(dibuat, akhir)
    hari_iso, ser, ctx = gabung(arsip, hari, out, konteks, hari[0].isoformat() if hari else None)
    kp = kompleks(kl)
    nama_prov = (meta or {}).get("provinsi") or {}
    tahun = str(akhir.year)

    def nol():
        return {"titik": [0] * len(hari_iso), "luas": [0] * len(hari_iso), "baru": [0] * len(hari_iso)}

    nas = dict(ser.get((), nol()))
    kabs = [k for k in ser if len(k) == 2]
    nas["kab"] = [sum(1 for k in kabs if ser[k]["titik"][i] > 0) for i in range(len(hari_iso))]
    prov = {}
    for k in sorted(k for k in ser if len(k) == 1):
        v = kp.get(k, [0, 0, 0, None])
        if sum(ser[k]["titik"]) == 0 and sum(ser[k]["luas"]) == 0 and not v[0]:
            continue
        p = k[0]
        ha, sd = None, None
        if luas_resmi and tahun in luas_resmi.get("tahun", []) and p in luas_resmi.get("ha", {}):
            ha, sd = luas_resmi["ha"][p][luas_resmi["tahun"].index(tahun)], luas_resmi.get("sampai", {}).get(tahun)
        prov[p] = {"nama": nama_prov.get(p, p), **ser[k], "kompleks": v[0], "luas_kompleks": round(v[1]), "level": v[2],
                   "sipongi_ha": ha, "sipongi_sd": sd,
                   "padam_ha": ((operasi or {}).get("dipadamkan_ha") or {}).get(p)}
    kab = []
    for k in sorted(kabs, key=lambda k: -sum(ser[k]["titik"])):
        v = kp.get(k, [0, 0, 0, None])
        if sum(ser[k]["titik"]) == 0 and sum(ser[k]["luas"]) == 0 and not v[0]:
            continue
        kab.append({"prov": k[0], "nama": k[1], **ser[k], "kompleks": v[0], "luas_kompleks": round(v[1]), "level": v[2], "fwi_maks": None if v[3] is None else round(v[3])})
    per = dt.date.fromisoformat(operasi["per"]) if operasi and operasi.get("per") else None
    bn = f"Rekap BNPB operasi karhutla {akhir.year} s.d. {per.day} {BULAN[per.month - 1]} {per.year}, belum diverifikasi ke dokumen resmi BNPB" if per else None
    return {
        "dibuat": dibuat.astimezone(WIB).isoformat(timespec="minutes"),
        "cutoff": acuan.isoformat(timespec="minutes"),
        "hari_lengkap": lengkap.isoformat(),
        "hari_berjalan": berjalan.isoformat() if berjalan else None,
        "bnpb_sd": per.isoformat() if per else None,
        "awal_arsip": hari_iso[0] if hari_iso else None,
        "jadwal": {"tutup": "21.20 WIB", "pembaruan": "tiap 3 jam"},
        "sumber": {
            "titik": "NASA FIRMS NRT: MODIS C6.1, VIIRS S-NPP, VIIRS NOAA-20",
            "luas": "NASA FIRMS NRT: VIIRS S-NPP, NOAA-20, NOAA-21, keyakinan nominal dan tinggi; indikasi, bukan citra",
            "kompleks": "Kejadian api: titik VIIRS yang berdekatan (1,5 km, 7 hari); status dihitung dari aturan Centurisk97",
            "wilayah": "Badan Informasi Geospasial (BIG), batas wilayah administrasi edisi Juni 2026",
            "sipongi": "KLHK SiPongi, indikasi luas kebakaran per provinsi",
            "bnpb": bn,
            "fwi": "Fire Weather Index (FWI) Kanada dari cuaca Open-Meteo (ERA5 dan prakiraan), nilai tertinggi kejadian api di wilayah itu",
        },
        "hari": hari_iso,
        "nasional": nas,
        "prov": prov,
        "kab": kab,
        "_konteks": ctx,
    }


def main():
    hs = baca("hotspot.json")
    if not hs:
        sys.exit("hotspot.json tidak ada")
    lap = build(hs, baca("kluster.json"), baca("meta.json"), baca("luas_resmi.json"), baca("operasi_resmi.json"), baca("laporan.json"))
    jalur = os.path.join(DATA, "laporan.json")
    with open(jalur, "w") as f:
        json.dump(lap, f, ensure_ascii=False, separators=(",", ":"))
    n = lap["nasional"]
    print(f"laporan.json: {os.path.getsize(jalur)} byte, {len(lap['hari'])} hari, {len(lap['prov'])} prov, {len(lap['kab'])} kab, lengkap {lap['hari_lengkap']}")


def uji():
    # (b) sel/baru pada data sintetis: 3 hari, jendela terpotong
    acuan = "2026-01-02T12:00:00+00:00"  # 19.00 WIB 2 Jan; tgl_wib 12-31 membuktikan pergantian tahun
    L = lambda la, lo: (la, lo)
    b = lambda p, sen, yak, w, tg: [p[0], p[1], 0, sen, 1.0, yak, w, tg]
    hs = {"acuan": acuan, "sensor_utama": ["M", "N", "N20"], "wilayah": ["14|A|x", "14|B|y"],
          "baris": [b(L(0.5, 101.5), "N", 1, 0, "12-31"), b(L(0.5, 101.5), "N", 1, 0, "12-31"),  # sel sama: 1 sel, 2 titik
                    b(L(0.5, 101.5), "N", 1, 0, "01-01"),                                       # sel lama: bukan baru
                    b(L(0.6, 101.6), "N21", 2, 0, "01-01"),                                     # N21: luas, bukan titik
                    b(L(0.7, 101.7), "M", 2, 1, "01-02"), b(L(0.8, 101.8), "N", 0, 1, "01-02"),  # M: titik tanpa luas; yak 0: titik tanpa luas
                    b(L(0.9, 101.9), "N20", 1, 1, "01-02")]}
    acu, akhir, t, s = hitung(hs)
    assert akhir == dt.date(2026, 1, 2) and dt.date(2025, 12, 31) in t, (akhir, list(t))
    hari, o, ctx = seri(t, s)
    assert [d.isoformat() for d in hari] == ["2025-12-31", "2026-01-01", "2026-01-02"]
    assert o[()]["titik"] == [2, 1, 3], o[()]
    assert o[()]["luas"] == [14, 28, 14], o[()]["luas"]  # 12-31: 1 sel; 01-01: sel lama + N21; 01-02: 1 sel (N20)
    assert o[()]["baru"] == [14, 14, 14], o[()]["baru"]  # sel lama pada 01-01 tidak dihitung baru
    assert o[("14", "A")]["titik"] == [2, 1, 0] and o[("14", "B")]["titik"] == [0, 0, 3]
    # arsip: tanggal tertua memakai arsip; konteks menahan baru lama bila lebih kaya
    meta = {"dibuat": "2026-01-02T21:45+07:00", "provinsi": {"14": "Riau"}}
    arsip = {"hari": ["2025-12-30", "2025-12-31"], "nasional": {"titik": [5, 9], "luas": [70, 99], "baru": [70, 56]}, "prov": {}, "kab": [],
             "_konteks": {"2025-12-30": 3, "2025-12-31": 3}}
    lap = build(hs, None, meta, None, None, arsip)
    assert lap["hari"] == ["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"], lap["hari"]
    n = lap["nasional"]
    assert n["titik"] == [5, 9, 1, 3] and n["luas"] == [70, 99, 28, 14], n  # tertua jendela (12-31) dari arsip
    assert n["baru"] == [70, 56, 14, 14], n  # 12-31: konteks arsip 3 > 0, baru lama menang
    assert lap["awal_arsip"] == "2025-12-30" and n["kab"][2] == 1 and lap["prov"]["14"]["nama"] == "Riau"
    # arsip kosong: semua dari jendela
    lap0 = build(hs, None, meta, None, None, None)
    assert lap0["hari"] == ["2026-01-01", "2026-01-02"] and lap0["nasional"]["titik"] == [1, 3], lap0["nasional"]  # tertua terpotong dibuang
    # (c) hari lengkap / berjalan di sekitar 21:00 WIB
    d = dt.date(2026, 10, 12)
    ja = lambda h, m: dt.datetime(2026, 10, 12, h, m, tzinfo=WIB)
    assert hari_status(ja(20, 59), d) == (dt.date(2026, 10, 11), d)
    assert hari_status(ja(21, 0), d) == (d, None)
    assert hari_status(ja(21, 45), d) == (d, None)
    assert hari_status(ja(3, 0) + dt.timedelta(days=1), d) == (d, None)  # data basi tetap menutup hari akhir
    assert tanggal("12-31", dt.date(2026, 1, 2)) == dt.date(2025, 12, 31) and tanggal("01-02", dt.date(2026, 1, 2)) == dt.date(2026, 1, 2)
    # (a) titik per prov per hari == wilayah.json harian (berkas lokal)
    hl, wl = baca("hotspot.json"), baca("wilayah.json")
    if hl and wl:
        _, _, tt, _ = hitung(hl)
        n = 0
        for p, v in wl.items():
            for tg, c in v["harian"].items():
                dd = dt.date.fromisoformat(tg)
                assert tt.get(dd, {}).get((p,), 0) == c, (p, tg, tt.get(dd, {}).get((p,), 0), c)
                n += 1
        print(f"  titik cocok wilayah.json: {n} sel prov x hari")
    print("laporan uji: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
