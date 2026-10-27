"""GSMaP per jam (JAXA) untuk jendela kejadian J1 (puncak laporan PetaBencana +-3 hari) di kotak Jakarta.

Server: FTP hokusai.eorc.jaxa.jp (login terdaftar; anonim hanya melihat /pub). Secret GSMAP_USER dan GSMAP_PASS
(GitHub Actions; tidak ada lokal, tidak pernah dicetak). Tanpa keduanya skrip melewati dengan pesan, keluar 0.
Struktur direktori (FAQ Q18 sharaku.eorc.jaxa.jp/GSMaP: /standard/v8/doc, /realtime_ver/v8/doc; nama berkas dari praktik
pengguna GSMaP, BELUM terverifikasi dengan login di mesin ini): per hari .../YYYY/MM/DD/ berkas *.YYYYMMDD.HHMM.*dat.gz.
Prioritas produk (hari pertama yang berisi berkas menang, produk dicatat per jam):
  gauge v8 (/standard/v8/hourly_G), standard MVK v8 (/standard/v8/hourly), NRT gauge (/realtime_ver/v8/hourly_G), NRT.
Nama berkas ditemukan dari NLST, bukan ditebak. Jam berkas = UTC (rata-rata laju hujan jam itu, mm/jam = mm).
Biner: float32 little-endian, 3600 kolom x 1200 baris, 0,1 derajat, baris pertama = lintang 59,95 U (utara ke selatan),
kolom pertama = bujur 0,05 T (0 sampai 360). Nilai < 0 = hilang. Konstanta ini dari panduan format (DataFormatDescription,
berkas di balik login): periksa `grid` di keluaran pada jalan pertama bersama ERA5 (hujan_jam.json) sebelum dipakai.
Sel = pusat sel dalam KOTAK +-0,05 derajat (sel 0,1 derajat tumpang tindih kotak). Atribusi: "GSMaP data by JAXA".
Keluaran: data/raw/banjir/genangan/gsmap/<kejadian>.json (per jam per sel) dan
public/banjir/data/genangan/gsmap.json (ringkasan seperti hujan_jam.json, kunci model "gsmap").
"""
import datetime as dt, ftplib, gzip, io, json, os, struct, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import MENTAH, RINGKAS, WIB, baca, hari, simpan

HOST = "hokusai.eorc.jaxa.jp"
PRODUK = [("gauge_v8", "/standard/v8/hourly_G"), ("standard_v8", "/standard/v8/hourly"),
          ("nrt_gauge_v8", "/realtime_ver/v8/hourly_G"), ("nrt_v8", "/realtime_ver/v8/hourly")]
NX, NY, D, LON0, LAT0 = 3600, 1200, 0.1, 0.05, 59.95
KOTAK = (106.6, -6.4, 107.0, -6.1)  # sama dengan hujan_jam.py (lon_min, lat_min, lon_maks, lat_maks)
# Hari puncak laporan PetaBencana DKI per tahun (terbanyak, WIB; dihitung 27 Okt 2026 dari petabencana_laporan.json)
# + 2020-01-01 (kejadian J2 uji mesin). Jendela = puncak +-3 hari.
PUNCAK = {"2017-02": "2017-02-21", "2018-02": "2018-02-15", "2020-01": "2020-01-01", "2020-02": "2020-02-25",
          "2021-02": "2021-02-20", "2022-04": "2022-04-26", "2023-05": "2023-05-07", "2024-08": "2024-08-18",
          "2025-04": "2025-04-24"}


def indeks_sel(kotak=KOTAK, tepi=D / 2):
    """Kolom dan baris yang pusatnya dalam kotak +-tepi: ([(i, lon)], [(j, lat)])."""
    lo0, la0, lo1, la1 = kotak
    ci = [(i, round(LON0 + i * D, 3)) for i in range(NX) if lo0 - tepi - 1e-9 <= LON0 + i * D <= lo1 + tepi + 1e-9]
    cj = [(j, round(LAT0 - j * D, 3)) for j in range(NY) if la0 - tepi - 1e-9 <= LAT0 - j * D <= la1 + tepi + 1e-9]
    return ci, cj


def baca_biner(isi_gz, ci, cj):
    """.dat.gz -> larik per sel (urutan baris lalu kolom), mm/jam; hilang (<0 atau bukan angka) = None."""
    b = gzip.decompress(isi_gz)
    assert len(b) == NX * NY * 4, f"ukuran {len(b)} bukan {NX * NY * 4} (3600x1200 float32)"
    out = []
    for j, _ in cj:
        baris = struct.unpack_from(f"<{NX}f", b, j * NX * 4)
        out += [None if (v < 0 or v != v) else round(v, 3) for v in (baris[i] for i, _ in ci)]
    return out


def cocok(nama, tgl, jam):
    return f".{tgl:%Y%m%d}.{jam:02d}00." in nama and nama.endswith(".dat.gz")


def sambung(user, sandi):
    try:
        f = ftplib.FTP_TLS(HOST, timeout=60)
        f.login(user, sandi)
        f.prot_p()
        return f
    except Exception:  # server tanpa TLS: FTP polos (sandi lewat jaringan tanpa enkripsi; tak ada pilihan lain di server ini)
        f = ftplib.FTP(HOST, timeout=60)
        f.login(user, sandi)
        return f


def berkas_hari(f, tgl):
    """(produk, folder, {jam: nama}) dari produk pertama yang berisi berkas hari itu."""
    for nama, dasar in PRODUK:
        folder = f"{dasar}/{tgl:%Y/%m/%d}"
        try:
            ada = f.nlst(folder)
        except ftplib.error_perm:
            continue
        per_jam = {h: n for h in range(24) for n in ada if cocok(os.path.basename(n), tgl, h)}
        if per_jam:
            return nama, folder, per_jam
    return None, None, {}


def unduh(f, jalur):
    buf = io.BytesIO()
    f.retrbinary("RETR " + jalur, buf.write)
    return buf.getvalue()


def ringkas(mm, n):
    v = [x or 0 for x in mm]
    return round(max((sum(v[i:i + n]) for i in range(max(1, len(v) - n + 1))), default=0), 1)


def jalankan():
    user, sandi = os.environ.get("GSMAP_USER"), os.environ.get("GSMAP_PASS")
    if not user or not sandi:
        print("GSMaP dilewati: GSMAP_USER/GSMAP_PASS tidak ada di lingkungan (hanya di GitHub Actions).")
        return
    ci, cj = indeks_sel()
    sel = [(la, lo) for _, la in cj for _, lo in ci]
    f = sambung(user, sandi)
    ring = {}
    for ev, puncak in PUNCAK.items():
        a, b = hari(puncak) - dt.timedelta(days=3), hari(puncak) + dt.timedelta(days=3)
        jalur = os.path.join(MENTAH, "gsmap", f"{ev}.json")
        data = baca(jalur, {"waktu": [], "mm": [], "produk": []})
        sudah = set(data["waktu"])
        t = dt.datetime.combine(a, dt.time(0), dt.timezone.utc)
        while t < dt.datetime.combine(b + dt.timedelta(days=1), dt.time(0), dt.timezone.utc):
            if t.hour == 0:
                try:
                    produk, folder, per_jam = berkas_hari(f, t.date())
                except (ftplib.all_errors, OSError):
                    f = sambung(user, sandi)
                    produk, folder, per_jam = berkas_hari(f, t.date())
            iso = t.strftime("%Y-%m-%dT%H:00Z")
            if iso not in sudah and per_jam.get(t.hour):
                for coba in range(3):
                    try:
                        data["mm"].append(baca_biner(unduh(f, per_jam[t.hour]), ci, cj))
                        data["waktu"].append(iso)
                        data["produk"].append(produk)
                        break
                    except (ftplib.all_errors, OSError) as e:
                        print(f"  ulang {iso}: {type(e).__name__}", file=sys.stderr)
                        time.sleep(5 * (coba + 1))
                        f = sambung(user, sandi)
            t += dt.timedelta(hours=1)
        data.update(sel=[{"lat": la, "lon": lo} for la, lo in sel], puncak=puncak, jendela=[a.isoformat(), b.isoformat()])
        simpan(jalur, data)
        seri = list(zip(*data["mm"])) if data["mm"] else []
        ring[ev] = {"jendela": data["jendela"], "puncak": puncak, "jam": len(data["waktu"]), "produk": sorted(set(data["produk"])),
                    "gsmap": [{**s, "maks_1j": ringkas(x, 1), "maks_3j": ringkas(x, 3), "maks_24j": ringkas(x, 24),
                               "total_mm": round(sum(v or 0 for v in x), 1), "jam_kosong": sum(v is None for v in x)}
                              for s, x in zip(data["sel"], seri)]}
        print(ev, len(data["waktu"]), "jam", ring[ev]["produk"])
    try:
        f.quit()
    except Exception:
        pass
    simpan(os.path.join(RINGKAS, "gsmap.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
        "sumber": "GSMaP (JAXA), hujan per jam, gauge-adjusted bila ada. GSMaP data by Japan Aerospace Exploration Agency (JAXA).",
        "grid": {"kolom": NX, "baris": NY, "d": D, "lon0": LON0, "lat0_utara": LAT0, "kotak": KOTAK}, "kejadian": ring})


def uji():
    ci, cj = indeks_sel()
    assert [lo for _, lo in ci] == [106.55, 106.65, 106.75, 106.85, 106.95, 107.05], ci
    assert [la for _, la in cj] == [-6.05, -6.15, -6.25, -6.35, -6.45] and cj[0][0] == 660, cj
    v = [0.0] * (NX * NY)
    v[cj[1][0] * NX + ci[2][0]] = 12.5      # lat -6.15, lon 106.75
    v[cj[0][0] * NX + ci[0][0]] = -99.9     # hilang
    v[(cj[0][0] - 1) * NX + ci[0][0]] = 99  # di luar kotak: tak boleh ikut
    gz = gzip.compress(struct.pack(f"<{NX * NY}f", *v))
    o = baca_biner(gz, ci, cj)
    assert len(o) == 30 and o[0] is None and o[1 * 6 + 2] == 12.5 and sum(x for x in o if x) == 12.5, o
    try:
        baca_biner(gzip.compress(b"\0" * 8), ci, cj)
        raise SystemExit("ukuran salah harus ditolak")
    except AssertionError:
        pass
    assert cocok("gsmap_gauge.20200101.0300.v8.0000.0.dat.gz", dt.date(2020, 1, 1), 3)
    assert not cocok("gsmap_gauge.20200101.0300.v8.0000.0.dat.gz", dt.date(2020, 1, 1), 4)
    assert not cocok("gsmap_gauge.20200101.0300.v8.0000.0.dat", dt.date(2020, 1, 1), 3)
    assert ringkas([0, 5, 6, 0, 1], 3) == 11
    assert hari(PUNCAK["2020-01"]) == dt.date(2020, 1, 1)
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
