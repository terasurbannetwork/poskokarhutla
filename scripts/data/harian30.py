"""Riwayat titik panas harian bergulir 35 hari per provinsi dan kab/kota -> public/data/harian30.json

Dipanggil dari harian.py sesudah hotspot 7 hari diunduh. Hitungan sama dengan angka utama (setara SiPongi/BNPB):
MODIS + VIIRS S-NPP + NOAA-20, semua tingkat keyakinan, per hari kalender WIB.
Hari yang sudah tertutup jendela 7 hari diperbarui tiap jalan; hari yang lebih tua dibawa dari berkas lama
(public/data ikut cache Actions). Hari yang belum ada (jalan pertama, atau cache hilang) diisi mundur dari
FIRMS area API, maksimal 5 hari per permintaan.

Uji tanpa jaringan:  python3 scripts/data/harian30.py uji
"""
import csv, datetime as dt, io, json, os

SIMPAN = 35
UTAMA = {"VIIRS_SNPP_NRT": "N", "VIIRS_NOAA20_NRT": "N20", "MODIS_NRT": "M"}
WIB = dt.timezone(dt.timedelta(hours=7))


def per_hari(titik):
    """{tanggal WIB: {"p": {prov: n}, "k": {"prov|kab": n}}} dari titik ber-adm (sensor utama saja)."""
    out = {}
    for p in titik:
        if p["s"] not in UTAMA.values():
            continue
        d = p["t"].astimezone(WIB).date().isoformat()
        h = out.setdefault(d, {"p": {}, "k": {}})
        h["p"][p["adm"][0]] = h["p"].get(p["adm"][0], 0) + 1
        kb = p["adm"][0] + "|" + p["adm"][1]
        h["k"][kb] = h["k"].get(kb, 0) + 1
    return out


def baca(jalur):
    """Berkas kolom -> {tanggal: {"p":..., "k":...}}."""
    if not os.path.exists(jalur):
        return {}
    d = json.load(open(jalur))
    out = {t: {"p": {}, "k": {}} for t in d["hari"]}
    for kel, isi in (("p", d["prov"]), ("k", d["kab"])):
        for kunci, v in isi.items():
            for t, n in zip(d["hari"], v):
                if n:
                    out[t][kel][kunci] = n
    return out


def tulis(jalur, data, hari_ini):
    hari = sorted(t for t in data if t <= hari_ini)[-SIMPAN:]
    kunci = lambda kel: sorted({k for t in hari for k in data[t][kel]})
    isi = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "hari_ini": hari_ini,
           "catatan": "Titik panas MODIS + VIIRS S-NPP + NOAA-20 per hari WIB (setara SiPongi). Hari ini belum lengkap.",
           "hari": hari,
           "prov": {k: [data[t]["p"].get(k, 0) for t in hari] for k in kunci("p")},
           "kab": {k: [data[t]["k"].get(k, 0) for t in hari] for k in kunci("k")}}
    with open(jalur, "w") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    return isi


def gabung(lama, baru, batas_lengkap):
    """Hari >= batas_lengkap diambil dari unduhan baru (jendela 7 hari menutupnya penuh); sisanya dari berkas lama."""
    out = {t: v for t, v in lama.items() if t < batas_lengkap}
    out.update({t: v for t, v in baru.items() if t >= batas_lengkap})
    return out


def isi_mundur(kosong, k, w, ambil, bbox):
    """Unduh FIRMS untuk tanggal WIB yang belum ada. Tanggal WIB d = UTC d-1 17:00 s.d. d 17:00."""
    if not kosong:
        return {}
    awal = dt.date.fromisoformat(min(kosong)) - dt.timedelta(days=1)
    akhir = dt.date.fromisoformat(max(kosong))
    tugas, d = [], awal
    while d <= akhir:
        n = min(5, (akhir - d).days + 1)
        tugas += [(s, f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{k}/{s}/{bbox}/{n}/{d}") for s in UTAMA]
        d += dt.timedelta(days=n)
    titik, lihat = [], set()
    for s, url in tugas:
        try:
            teks = ambil(url)
        except Exception as e:
            print("harian30: gagal", s, url.rsplit("/", 2)[-2:], e)
            continue
        for r in csv.DictReader(io.StringIO(teks)):
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00")
            lat, lon = round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)
            if (lat, lon, t, s) in lihat:
                continue
            lihat.add((lat, lon, t, s))
            adm = w.cari(lon, lat)
            if adm:
                titik.append({"t": t, "s": UTAMA[s], "adm": adm})
    hasil = per_hari(titik)
    return {t: hasil.get(t, {"p": {}, "k": {}}) for t in kosong}


def perbarui(keluar, titik, k, w, ambil, bbox, hari_ini, batas):
    """batas = awal jendela 7 x 24 jam (datetime); hari WIB sesudah tanggal batas tertutup penuh oleh unduhan."""
    jalur = os.path.join(keluar, "harian30.json")
    batas_lengkap = (batas.astimezone(WIB).date() + dt.timedelta(days=1)).isoformat()
    data = gabung(baca(jalur), per_hari(titik), batas_lengkap)
    h0 = dt.date.fromisoformat(hari_ini)
    perlu = [(h0 - dt.timedelta(days=i)).isoformat() for i in range(1, SIMPAN)]
    kosong = sorted(t for t in perlu if t not in data)
    if kosong:
        print(f"harian30: isi mundur {len(kosong)} hari ({kosong[0]} s.d. {kosong[-1]})")
        data.update(isi_mundur(kosong, k, w, ambil, bbox))
    isi = tulis(jalur, data, hari_ini)
    print(f"harian30: {len(isi['hari'])} hari, {len(isi['prov'])} provinsi, {len(isi['kab'])} kab/kota")


def uji():
    import tempfile
    t = lambda s: dt.datetime.fromisoformat(s)
    titik = [{"t": t("2026-10-12T18:00:00+00:00"), "s": "N", "adm": ["62", "Kapuas", "X"]},   # 13 Okt WIB
             {"t": t("2026-10-12T16:00:00+00:00"), "s": "M", "adm": ["62", "Kapuas", "X"]},   # 12 Okt WIB
             {"t": t("2026-10-12T16:00:00+00:00"), "s": "N21", "adm": ["62", "Kapuas", "X"]}]  # bukan sensor utama
    h = per_hari(titik)
    assert h["2026-10-13"]["p"]["62"] == 1 and h["2026-10-12"]["k"]["62|Kapuas"] == 1, h
    lama = {"2026-10-01": {"p": {"62": 9}, "k": {}}, "2026-10-12": {"p": {"62": 99}, "k": {}}}
    g = gabung(lama, h, "2026-10-07")
    assert g["2026-10-01"]["p"]["62"] == 9 and g["2026-10-12"]["p"]["62"] == 1, g
    with tempfile.TemporaryDirectory() as d:
        j = os.path.join(d, "harian30.json")
        tulis(j, g, "2026-10-13")
        assert baca(j)["2026-10-01"]["p"]["62"] == 9
        assert json.load(open(j))["hari"][-1] == "2026-10-13"
    print("harian30: uji lolos")


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["uji"]:
        uji()
