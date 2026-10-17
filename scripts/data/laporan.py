"""Laporan harian karhutla untuk Presiden -> public/data/laporan.json

Titik panas dan luas terdampak per hari, per kab/kota, per provinsi, dengan arsip bergulir 90 hari.
Kontrak skema: lihat kunci-kunci di build(); halaman laporan membaca berkas ini.

Definisi angka:
  titik  = sensor M, N, N20 (hotspot.json sensor_utama), semua keyakinan, hari kalender WIB (== wilayah.json harian)
  luas   = PERKIRAAN luas terbakar = titik VIIRS S-NPP (N) keyakinan >= 1 hari itu x HA_TITIK (4,3 ha)
  baru   = sama dengan luas (tiap deteksi harian menyumbang luas baru); kumulatif = jumlah luas harian
  Kalibrasi HA_TITIK: luas terbakar resmi per tahun (seri Bakom/BNPB = SiPongi KLHK 2015-2025) dibagi titik VIIRS S-NPP
  tahun yang sama (sejarah.json): median 4,30 ha/titik, kuartil 3,22-4,59, min-maks 2,15-6,54. Uji balik tinggalkan-satu-tahun
  (rasio median tahun lain) pada seri 2015-2025: 6 dari 11 tahun meleset <= 15%; terburuk +101% (2017) dan -35% (2021).
  Uji luar-contoh: SiPongi Jan-Jul 2026 202.011 ha vs perkiraan 173.161 ha (-14%, Mei kosong di FIRMS).
  Angka resmi 2025 di infografis Bakom (343.432) beda 4,7% dari luas_resmi.json (359.619); median tidak berubah.
  Bias yang belum diukur: sejarah.json membuang titik gunung api/sumber panas tetap/lepas pantai, hotspot.json NRT tidak
  (kolom type tidak ada di NRT) -> luas harian condong sedikit ke atas. Kalibrasi nasional tahunan: tidak diuji per hari
  atau per wilayah, jadi angka harian/provinsi bersifat indikatif (dibulatkan ke 1 ha supaya kab/kota kecil tidak jadi nol). Satu piksel VIIRS 375 m = 14,06 ha; 4,3 ha ~ 31% piksel.
  Rumus lama (sel kisi x 14,06 ha) membesar-besarkan 3-4x; arsip luas_v < 2 dikonversi sekali (lihat konversi_arsip).
Hari D "lengkap" bila waktu hitung >= D 21:00 WIB (data.yml menutup 21.20 WIB).

Pakai:  python3 scripts/data/laporan.py  |  ... uji
"""
import datetime as dt, json, math, os, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
HA_TITIK, HA_RENDAH, HA_TINGGI = 4.30, 3.22, 4.59   # ha per titik S-NPP; lihat docstring
LUAS_V = 2
ARSIP_HARI = 90
TUTUP_JAM = 21
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def baca(nama, dasar=None):
    try:
        with open(os.path.join(dasar or DATA, nama)) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


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
    """Titik panas -> t[hari][kunci] = titik sensor utama, s[hari][kunci] = titik S-NPP keyakinan >= 1. Kunci: (), (prov,), (prov,kab)."""
    acuan = dt.datetime.fromisoformat(hs["acuan"]).astimezone(WIB)
    akhir = acuan.date()
    utama = set(sensor_utama or hs.get("sensor_utama") or ["M", "N", "N20"])
    tabel = [tuple(w.split("|")[:2]) for w in hs["wilayah"]]
    t, s = {}, {}
    for lat, lon, _j, sen, _f, yak, w, tg in hs["baris"]:
        d = tanggal(tg, akhir)
        prov, kab = tabel[w]
        if sen in utama:
            for k in ((), (prov,), (prov, kab)):
                a = t.setdefault(d, {})
                a[k] = a.get(k, 0) + 1
        if sen == "N" and yak >= 1:
            for k in ((), (prov,), (prov, kab)):
                a = s.setdefault(d, {})
                a[k] = a.get(k, 0) + 1
    return acuan, akhir, t, s


def seri(t, s):
    """-> hari terurut, {kunci: {'titik':[], 'luas':[], 'baru':[]}}, konteks {hari:int}."""
    hari = sorted(set(t) | set(s))
    kunci = {k for d in hari for k in list(t.get(d, {})) + list(s.get(d, {}))}
    out = {k: {"titik": [], "luas": [], "baru": []} for k in kunci}
    for d in hari:
        for k in kunci:
            ha = round(s.get(d, {}).get(k, 0) * HA_TITIK)
            out[k]["titik"].append(t.get(d, {}).get(k, 0))
            out[k]["luas"].append(ha)
            out[k]["baru"].append(ha)
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


def isi_celah(t, s, ambang=0.15):
    """Porsi titik S-NPP terhadap titik sensor utama (median antarhari). Hari dengan porsi < ambang = celah data S-NPP di
    FIRMS (mis. 13 Okt 2026: 123 titik S-NPP dari 9.029): s hari itu ditaksir titik x porsi, supaya luas tidak anjlok palsu."""
    pr = sorted(s.get(d, {}).get((), 0) / t[d][()] for d in t if t[d].get((), 0) > 0)
    porsi = pr[len(pr) // 2] if pr else 0.4
    taksir = []
    for d in t:
        n = t[d].get((), 0)
        if n and s.get(d, {}).get((), 0) / n < ambang:
            s[d] = {k: v * porsi for k, v in t[d].items()}
            taksir.append(d.isoformat() if hasattr(d, "isoformat") else str(d))
    return porsi, taksir


def konversi_arsip(arsip, porsi):
    """Arsip rumus lama (luas_v < 2: sel x 14,06 ha) -> perkiraan baru. Titik S-NPP hari arsip tidak tersimpan, jadi ditaksir
    titik x porsi S-NPP (porsi nasional di jendela hotspot.json). ponytail: taksiran sekali jalan; hari-hari ini keluar dari
    arsip 90 hari, tidak perlu simpan titik S-NPP per hari di skema."""
    if not arsip or arsip.get("luas_v") == LUAS_V:
        return arsip
    a = json.loads(json.dumps(arsip))
    for v in [a.get("nasional")] + list((a.get("prov") or {}).values()) + list(a.get("kab") or []):
        if v:
            v["luas"] = [round(x * porsi * HA_TITIK) for x in v["titik"]]
            v["baru"] = list(v["luas"])
    return a


def tahun_berjalan(sejarah, hari_iso, luas_nas, tahun):
    """Perkiraan luas terbakar sejak 1 Jan: titik S-NPP sejarah.json (s.d. sehari sebelum dibuat) x HA_TITIK + luas harian
    laporan sesudahnya. None bila sejarah tidak memuat tahun ini."""
    if not sejarah or tahun not in sejarah.get("tahun", []):
        return None
    batas = (dt.date.fromisoformat(sejarah["dibuat"][:10]) - dt.timedelta(days=1)).isoformat()
    bln = [sum((v.get(tahun) or [0] * 12)[m] for v in sejarah["prov"].values()) * HA_TITIK for m in range(12)]
    for d, l in zip(hari_iso, luas_nas):   # hari sesudah batas sejarah: dari luas harian laporan
        if batas < d and d.startswith(tahun):
            bln[int(d[5:7]) - 1] += l
    ha = sum(bln)
    akhir = hari_iso[-1] if hari_iso else batas
    nama = ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Okt–Des"]
    # triwulan yang sudah dimulai; Mei 2026 kosong di FIRMS (8 Mei-1 Jun) sehingga Apr-Jun lebih kecil dari sebenarnya
    tw = [{"nama": nama[q], "ha": round(sum(bln[3 * q:3 * q + 3])), "bulan_kosong": [BULAN[m] for m in range(3 * q, 3 * q + 3) if bln[m] == 0 and m < int(akhir[5:7]) - 1]}
          for q in range(4) if 3 * q < int(akhir[5:7])]
    return {"ha": round(ha), "rendah": round(ha / HA_TITIK * HA_RENDAH), "tinggi": round(ha / HA_TITIK * HA_TINGGI),
            "ha_titik": HA_TITIK, "ha_titik_rendah": HA_RENDAH, "ha_titik_tinggi": HA_TINGGI, "sd": akhir, "triwulan": tw}


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


def build(hs, kl, meta, luas_resmi, operasi, arsip, sekarang=None, sejarah=None):
    acuan, akhir, t, s = hitung(hs)
    porsi, taksir = isi_celah(t, s)
    hari, out, konteks = seri(t, s)
    arsip = konversi_arsip(arsip, porsi)
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
        "luas_v": LUAS_V,
        "luas_taksir": sorted(set(taksir) | set(d for d in hari_iso if d in ((arsip or {}).get("luas_taksir") or []))
                              | (set(hari_iso) - {x.isoformat() for x in hari} if (arsip or {}).get("luas_v") != LUAS_V else set())),
        "tahun_berjalan": tahun_berjalan(sejarah, hari_iso, nas["luas"], tahun),
        "sumber": {
            "titik": "NASA FIRMS NRT: MODIS C6.1, VIIRS S-NPP, VIIRS NOAA-20",
            "luas": "Perkiraan: titik VIIRS S-NPP (NASA FIRMS) x 4,3 ha, dikalibrasi ke luas terbakar resmi tahunan 2015-2025 (SiPongi KLHK); kuartil 3,2-4,6 ha per titik; uji balik tahunan meleset sampai +101%/-35%; angka harian dan per wilayah indikatif; bukan pengukuran citra",
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
    lap = build(hs, baca("kluster.json"), baca("meta.json"), baca("luas_resmi.json"), baca("operasi_resmi.json"), baca("laporan.json"),
                sejarah=baca("sejarah.json"))
    jalur = os.path.join(DATA, "laporan.json")
    with open(jalur, "w") as f:
        json.dump(lap, f, ensure_ascii=False, separators=(",", ":"))
    n = lap["nasional"]
    print(f"laporan.json: {os.path.getsize(jalur)} byte, {len(lap['hari'])} hari, {len(lap['prov'])} prov, {len(lap['kab'])} kab, lengkap {lap['hari_lengkap']}")


def uji():
    # (b) perkiraan luas pada data sintetis: 3 hari, jendela terpotong
    acuan = "2026-01-02T12:00:00+00:00"  # 19.00 WIB 2 Jan; tgl_wib 12-31 membuktikan pergantian tahun
    L = lambda la, lo: (la, lo)
    b = lambda p, sen, yak, w, tg: [p[0], p[1], 0, sen, 1.0, yak, w, tg]
    hs = {"acuan": acuan, "sensor_utama": ["M", "N", "N20"], "wilayah": ["14|A|x", "14|B|y"],
          "baris": [b(L(0.5, 101.5), "N", 1, 0, "12-31"), b(L(0.5, 101.5), "N", 1, 0, "12-31"),  # 2 titik S-NPP = 2 x 4,3 ha
                    b(L(0.5, 101.5), "N", 1, 0, "01-01"),
                    b(L(0.6, 101.6), "N21", 2, 0, "01-01"),                                     # N21: bukan titik, bukan luas
                    b(L(0.7, 101.7), "M", 2, 1, "01-02"), b(L(0.8, 101.8), "N", 0, 1, "01-02"),  # M: titik tanpa luas; yak 0: titik tanpa luas
                    b(L(0.9, 101.9), "N20", 1, 1, "01-02")]}
    acu, akhir, t, s = hitung(hs)
    assert akhir == dt.date(2026, 1, 2) and dt.date(2025, 12, 31) in t, (akhir, list(t))
    hari, o, ctx = seri(t, s)
    assert [d.isoformat() for d in hari] == ["2025-12-31", "2026-01-01", "2026-01-02"]
    assert o[()]["titik"] == [2, 1, 3], o[()]
    assert o[()]["luas"] == [9, 4, 0], o[()]["luas"]  # 2 / 1 / 0 titik S-NPP keyakinan >= 1, x 4,3 ha
    assert o[()]["baru"] == o[()]["luas"], o[()]["baru"]
    # celah S-NPP: hari tanpa titik S-NPP padahal sensor lain mencatat -> ditaksir titik x porsi median
    tc, sc = {1: {(): 10}, 2: {(): 10}, 3: {(): 10}}, {1: {(): 5}, 2: {(): 5}, 3: {(): 0}}
    assert isi_celah(tc, sc) == (0.5, ["3"]) and sc[3][()] == 5.0, sc
    assert o[("14", "A")]["titik"] == [2, 1, 0] and o[("14", "B")]["titik"] == [0, 0, 3]
    # arsip: tanggal tertua memakai arsip; konteks menahan baru lama bila lebih kaya
    meta = {"dibuat": "2026-01-02T21:45+07:00", "provinsi": {"14": "Riau"}}
    arsip = {"hari": ["2025-12-30", "2025-12-31"], "nasional": {"titik": [5, 9], "luas": [70, 99], "baru": [70, 56]}, "prov": {}, "kab": [],
             "_konteks": {"2025-12-30": 3, "2025-12-31": 3}}
    lap = build(hs, None, meta, None, None, arsip)
    assert lap["hari"] == ["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"], lap["hari"]
    n = lap["nasional"]
    # porsi median S-NPP = 1 (2/2, 1/1, 0/3); 01-02 tanpa S-NPP = celah -> 3 x 1 x 4,3. Arsip lama dikonversi titik x 1 x 4,3
    assert n["titik"] == [5, 9, 1, 3] and n["luas"] == [22, 39, 4, 13], n  # tertua jendela (12-31) dari arsip
    assert n["baru"] == n["luas"], n
    assert lap["luas_v"] == LUAS_V and konversi_arsip(lap, 0.1) is lap  # arsip baru tidak dikonversi ulang
    assert lap["awal_arsip"] == "2025-12-30" and n["kab"][2] == 1 and lap["prov"]["14"]["nama"] == "Riau"
    # arsip kosong: semua dari jendela
    lap0 = build(hs, None, meta, None, None, None)
    assert lap0["hari"] == ["2026-01-01", "2026-01-02"] and lap0["nasional"]["titik"] == [1, 3], lap0["nasional"]  # tertua terpotong dibuang
    # tahun berjalan: sejarah s.d. sehari sebelum dibuat + luas harian sesudahnya
    sj = {"tahun": ["2026"], "dibuat": "2026-01-02", "prov": {"14": {"2026": [10000] + [0] * 11}}}
    tb = tahun_berjalan(sj, ["2025-12-31", "2026-01-01", "2026-01-02"], [9, 4, 7], "2026")
    assert tb["ha"] == round(10000 * HA_TITIK + 7) and tb["rendah"] < tb["ha"] < tb["tinggi"], tb
    assert tb["triwulan"] == [{"nama": "Jan–Mar", "ha": tb["ha"], "bulan_kosong": []}], tb["triwulan"]
    assert tahun_berjalan(None, [], [], "2026") is None
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
