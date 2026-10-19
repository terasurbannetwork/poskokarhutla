"""Riwayat titik panas harian bergulir 100 hari (pilihan tren 3 hari s.d. 3 bulan) per provinsi dan kab/kota -> public/data/harian30.json

Dipanggil dari harian.py sesudah hotspot 7 hari diunduh. Hitungan sama dengan angka utama (setara SiPongi/BNPB):
MODIS + VIIRS S-NPP + NOAA-20, semua tingkat keyakinan, per hari kalender WIB.
Hari yang sudah tertutup jendela 7 hari diperbarui tiap jalan; hari yang lebih tua dibawa dari berkas lama
(public/data ikut cache Actions). Hari yang belum ada (jalan pertama, atau cache hilang) diisi mundur dari
FIRMS area API, maksimal 5 hari per permintaan.

Uji tanpa jaringan:  python3 scripts/data/harian30.py uji
"""
import csv, datetime as dt, io, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from firms_sumber import SENSOR, muat_ketersediaan, nasional_harian, penuh, unduh  # noqa: E402

SIMPAN = 100
UTAMA = {"VIIRS_SNPP_NRT": "N", "VIIRS_NOAA20_NRT": "N20", "MODIS_NRT": "M"}
# sumber unduhan (SP atau NRT) dipilih per sensor per hari oleh firms_sumber.py dari /api/data_availability, BUKAN dari umur hari
VERSI = 2   # v1 memilih sumber dari umur hari (SP kosong dianggap nol, VIIRS hilang Jul-Agu 2026); berkas v1 diisi ulang dari MIGRASI_DARI
MIGRASI_DARI = "2026-07-01"
CURIGA_NAS = 300   # hari kosong padahal titik nasional (musim_harian.json) >= ini = unduhan gagal, diunduh ulang
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
    isi = {"versi": VERSI, "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "hari_ini": hari_ini,
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


SARING = None  # callable (lat, lon) -> True bila titik dibuang (sumber statis/industri); dipasang harian.main bila TITIK_PALSU aktif


def isi_mundur(kosong, k, w, ambil, bbox, ket=None):
    """Unduh FIRMS untuk tanggal WIB yang belum ada/curiga. Tanggal WIB d = UTC d-1 17:00 s.d. d 17:00.
    Hanya tanggal yang SEMUA sensornya sukses diunduh yang dikembalikan; sisanya dibiarkan (dicoba lagi jalan berikutnya)."""
    if not kosong:
        return {}
    ket = ket or muat_ketersediaan(k, ambil)
    tgl = sorted(dt.date.fromisoformat(t) for t in kosong)
    baris, ok = unduh(tgl[0] - dt.timedelta(days=1), tgl[-1], k, ambil, bbox, ket)
    titik, lihat = [], set()
    for s, r in baris:
        jam = r["acq_time"].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00")
        lat, lon = round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)
        if (lat, lon, t, s) in lihat:
            continue
        lihat.add((lat, lon, t, s))
        adm = w.cari(lon, lat)
        if adm and not (SARING and SARING(lat, lon)):
            titik.append({"t": t, "s": SENSOR[s.rsplit("_", 1)[0]], "adm": adm})
    hasil = per_hari(titik)
    return {d.isoformat(): hasil.get(d.isoformat(), {"p": {}, "k": {}}) for d in tgl if penuh(ok, d)}


def curiga(data, hari_ini, nasional):
    """Tanggal 1..SIMPAN-1 hari lalu yang belum ada, atau kosong padahal nasional >= CURIGA_NAS."""
    h0 = dt.date.fromisoformat(hari_ini)
    out = []
    for i in range(1, SIMPAN):
        t = (h0 - dt.timedelta(days=i)).isoformat()
        if t not in data or (not data[t]["p"] and nasional.get(t, 0) >= CURIGA_NAS):
            out.append(t)
    return sorted(out)


def perbarui(keluar, titik, k, w, ambil, bbox, hari_ini, batas):
    """batas = awal jendela 7 x 24 jam (datetime); hari WIB sesudah tanggal batas tertutup penuh oleh unduhan."""
    jalur = os.path.join(keluar, "harian30.json")
    batas_lengkap = (batas.astimezone(WIB).date() + dt.timedelta(days=1)).isoformat()
    lama = baca(jalur)
    if lama and json.load(open(jalur)).get("versi", 1) < VERSI:
        lama = {t: v for t, v in lama.items() if t < MIGRASI_DARI}
        print(f"harian30: migrasi v1 -> v{VERSI}: hari >= {MIGRASI_DARI} diisi ulang")
    data = gabung(lama, per_hari(titik), batas_lengkap)
    kosong = curiga(data, hari_ini, nasional_harian(os.path.join(keluar, "musim_harian.json")))
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
    # hari kosong padahal nasional besar = curiga; kosong dengan nasional kecil = nol sungguhan; tak ada = curiga
    ds = {"2026-10-10": {"p": {}, "k": {}}, "2026-10-11": {"p": {}, "k": {}}, "2026-10-12": {"p": {"62": 1}, "k": {}}}
    c = curiga(ds, "2026-10-13", {"2026-10-10": 5000, "2026-10-11": 40})
    assert "2026-10-10" in c and "2026-10-11" not in c and "2026-10-12" not in c and "2026-10-09" in c, c
    # isi_mundur memakai sumber dari ketersediaan: SP kosong untuk hari NRT tidak boleh jadi nol; balasan galat = hari tidak dikembalikan
    class W:
        def cari(self, lon, lat):
            return ["62", "Kapuas", "X"]
    avail = "data_id,min_date,max_date\n" + "".join(f"{f}_SP,2012-01-01,2026-10-10\n{f}_NRT,2026-10-11,2026-12-31\n" for f in ("VIIRS_SNPP", "VIIRS_NOAA20", "MODIS"))
    pakai = []
    def ambil(u):
        if "data_availability" in u:
            return avail
        pakai.append(u.split("/")[-4])
        return "latitude,longitude,acq_date,acq_time\n-2.5,100.5,2026-10-11,0100\n"
    r = isi_mundur(["2026-10-11", "2026-10-12"], "K", W(), ambil, "b")
    assert r["2026-10-12"]["p"] == {} and r["2026-10-11"]["p"]["62"] == 6, r   # 3 famili x (blok SP + blok NRT) menjawab sama; 12 Okt WIB tak punya titik
    assert any(x.endswith("_NRT") for x in pakai) and any(x.endswith("_SP") for x in pakai), pakai
    assert isi_mundur(["2026-10-11"], "K", W(), lambda u: avail if "data_av" in u else "Invalid MAP_KEY", "b") == {}
    print("harian30: uji lolos")


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["uji"]:
        uji()
