"""Riwayat titik panas harian bergulir 100 hari (pilihan tren 3 hari s.d. 3 bulan) per provinsi dan kab/kota -> public/data/harian30.json

Dipanggil dari harian.py sesudah hotspot 7 hari diunduh. Hitungan sama dengan angka utama (titik_unik.py): LOKASI UNIK ~375 m per hari
kalender WIB dari MODIS + VIIRS S-NPP + NOAA-20 + NOAA-21, keyakinan sedang/tinggi saja (keputusan pemilik 25 Okt 2026).
Hari yang sudah tertutup jendela 7 hari diperbarui tiap jalan; hari yang lebih tua dibawa dari berkas lama
(public/data ikut cache Actions). Hari yang belum ada (jalan pertama, atau cache hilang) diisi mundur dari
FIRMS area API, maksimal 5 hari per permintaan.

Uji tanpa jaringan:  python3 scripts/data/harian30.py uji
"""
import csv, datetime as dt, io, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from firms_sumber import FAMILI, SENSOR, kelas_yakin, muat_ketersediaan, nasional_harian, penuh, unduh  # noqa: E402
import titik_unik as TU  # noqa: E402

SIMPAN = 100
FAM4 = FAMILI + ("VIIRS_NOAA21",)   # isi mundur ikut NOAA-21 (titik_unik.SENSOR)
SENSOR4 = {**SENSOR, "VIIRS_NOAA21": "N21"}
# sumber unduhan (SP atau NRT) dipilih per sensor per hari oleh firms_sumber.py dari /api/data_availability, BUKAN dari umur hari
VERSI = 4   # v4 (25 Okt 2026): lokasi unik 4 satelit (titik_unik.py), SEMUA hari diisi ulang. v3: hanya keyakinan sedang/tinggi. v1 memilih sumber dari umur hari (SP kosong dianggap nol, VIIRS hilang Jul-Agu 2026); berkas v1 diisi ulang dari MIGRASI_DARI
MIGRASI_DARI = "2000-01-01"   # hari >= ini dibuang saat versi berkas lama < VERSI (kini semua hari)
CURIGA_NAS = 300   # hari kosong padahal titik nasional (musim_harian.json) >= ini = unduhan gagal, diunduh ulang
WIB = dt.timezone(dt.timedelta(hours=7))


def per_hari(titik):
    """{tanggal WIB: {"p": {prov: n}, "k": {"prov|kab": n}}} dari titik ber-adm (lat, lon, t, s, c): lokasi unik per hari (titik_unik.unik)."""
    out = {}
    hari = lambda p: p["t"].astimezone(WIB).date().isoformat()
    for p in TU.unik(sorted(titik, key=lambda p: p["t"]), hari):
        d = hari(p)
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
           "catatan": "Titik panas = lokasi unik ~375 m per hari WIB dari MODIS + VIIRS S-NPP + NOAA-20 + NOAA-21, keyakinan sedang/tinggi. Hari ini belum lengkap.",
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
    ket = ket or muat_ketersediaan(k, ambil, FAM4)
    tgl = sorted(dt.date.fromisoformat(t) for t in kosong)
    baris, ok = unduh(tgl[0] - dt.timedelta(days=1), tgl[-1], k, ambil, bbox, ket, famili=FAM4)
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
            titik.append({"t": t, "lat": lat, "lon": lon, "s": SENSOR4[s.rsplit("_", 1)[0]], "adm": adm, "c": kelas_yakin(r.get("confidence", ""), s.startswith("MODIS"))})
    hasil = per_hari(titik)
    return {d.isoformat(): hasil.get(d.isoformat(), {"p": {}, "k": {}}) for d in tgl if penuh(ok, d, FAM4)}


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
    a = lambda **x: {"lat": -2.0, "lon": 113.0, "adm": ["62", "Kapuas", "X"], **x}
    titik = [a(t=t("2026-10-12T18:00:00+00:00"), s="N", c=1),                  # 13 Okt WIB
             a(t=t("2026-10-12T16:00:00+00:00"), s="M", c=1),                  # 12 Okt WIB
             a(t=t("2026-10-12T16:50:00+00:00"), s="N21", c=1),                # 12 Okt WIB, sel sama: lokasi yang sama, tidak menambah
             a(t=t("2026-10-12T19:00:00+00:00"), s="N21", c=2, lon=113.02)]    # 13 Okt WIB, sel lain (~2,2 km): NOAA-21 dihitung
    h = per_hari(titik + [a(t=t("2026-10-12T18:00:00+00:00"), s="N", c=0, lat=-3.0)])   # keyakinan rendah DITOLAK
    assert h["2026-10-13"]["p"]["62"] == 2 and h["2026-10-12"]["k"]["62|Kapuas"] == 1, h
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
    avail = "data_id,min_date,max_date\n" + "".join(f"{f}_SP,2012-01-01,2026-10-10\n{f}_NRT,2026-10-11,2026-12-31\n" for f in ("VIIRS_SNPP", "VIIRS_NOAA20", "VIIRS_NOAA21", "MODIS"))
    pakai = []
    def ambil(u):
        if "data_availability" in u:
            return avail
        pakai.append(u.split("/")[-4])
        return "latitude,longitude,acq_date,acq_time,confidence\n-2.5,100.5,2026-10-11,0100,90\n-2.6,100.5,2026-10-11,0100,l\n"
    r = isi_mundur(["2026-10-11", "2026-10-12"], "K", W(), ambil, "b")
    assert r["2026-10-12"]["p"] == {} and r["2026-10-11"]["p"]["62"] == 1, r   # 4 famili x (SP + NRT) menjawab titik yang sama = SATU lokasi; 12 Okt WIB kosong
    assert any(x.endswith("_NRT") for x in pakai) and any(x.endswith("_SP") for x in pakai), pakai
    assert isi_mundur(["2026-10-11"], "K", W(), lambda u: avail if "data_av" in u else "Invalid MAP_KEY", "b") == {}
    assert [kelas_yakin(x, False) for x in "lnh"] == [0, 1, 2] and [kelas_yakin(x, True) for x in ("29", "30", "79", "80", "")] == [0, 1, 1, 2, 0]
    print("harian30: uji lolos")


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["uji"]:
        uji()
