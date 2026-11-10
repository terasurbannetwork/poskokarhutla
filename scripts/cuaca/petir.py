"""Sambaran petir BMKG (jaringan LD) -> public/banjir/data/cuaca_petir.json + arsip harian per bulan.

Sumber: https://www.bmkg.go.id/geofisika-potensial/petir-realtime. __NUXT_DATA__ memuat kunci `lightning-sensor` =
{lightning:{rows, data:[{tanggal, latitude, longitude, current, polarity, striketype}]}, sensor:{data:[{RealName, Latitude, Longitude}]}}
(~30 menit terakhir, ribuan sambaran) dan daftar artikel bulanan (judul/slug saja; `total` di sana nomor halaman, bukan jumlah sambaran).

ZONA WAKTU: `tanggal` tidak bertanda zona. Skrip membandingkan sambaran terbaru dengan header `Date` respons (UTC): selisih ~0 jam = UTC,
~7 jam = WIB, selain itu berhenti tanpa menulis. Pada 10 Nov 2026 hasilnya UTC (terbaru 10:18:20, header 10:19:20 GMT).

ARSIP (cuaca_petir_arsip_<YYYY-MM>.json): hanya menambah (append-only), agregat per hari WIB per kabupaten, bukan titik. Satu putaran hanya
memuat ~30 menit; dengan jadwal 3 jam cakupan harian ~1/6. Karena itu tiap hari membawa `cakupan_menit` (gabungan rentang yang benar-benar
terambil, dari 1440) dan jumlahnya JANGAN dibaca sebagai total harian. Dedup antar putaran: kunci waktu+lat+lon (hash 12 hex), hanya hash
dalam 35 menit terakhir yang disimpan.

Titik ke kabupaten: scripts/banjir/wilayah.py `Wilayah.cari` (poligon kecamatan). Gagal-lunak: berkas lama dibiarkan.
Pakai: python3 scripts/cuaca/petir.py | ... uji
"""
import collections, datetime as dt, email.utils, hashlib, json, math, os, statistics, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bmkg_kab10 import UA, nuxt_semua  # noqa: E402
from dasar import KELUAR, PROVINSI, WIB, baca, simpan  # noqa: E402

URL = "https://www.bmkg.go.id/geofisika-potensial/petir-realtime"
BERKAS = os.path.join(KELUAR, "cuaca_petir.json")
UTC = dt.timezone.utc
MAKS_UNDUH = 8_000_000
MAKS_ARSIP = 3_000_000     # byte per berkas bulanan; lewat ini penambahan ditolak (dibaca di log), tidak memangkas data lama
SEL = 0.25                 # derajat, kisi ringkas
MAKS_SEL, MAKS_KAB = 400, 300
TOLERANSI_MENIT = 20
HASH_MENIT = 35


def arsip_jalur(bulan):
    return os.path.join(KELUAR, f"cuaca_petir_arsip_{bulan}.json")


def unduh(url=URL):
    """-> (html, header Date sebagai datetime UTC)."""
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
        isi = r.read(MAKS_UNDUH + 1)
        if len(isi) > MAKS_UNDUH:
            raise RuntimeError("respons petir melebihi batas")
        return isi.decode("utf-8", "replace"), email.utils.parsedate_to_datetime(r.headers["Date"]).astimezone(UTC)


def urai(html):
    """-> (sambaran mentah, sensor, artikel bulanan)."""
    lm, art, sen = None, [], []
    for v in nuxt_semua(html):
        if isinstance(v, dict) and "lightning" in v:
            lm = v["lightning"]
            sen = (v.get("sensor") or {}).get("data") or []
        elif isinstance(v, list) and v and isinstance(v[0], dict) and "slug" in v[0]:
            art = v
    assert lm and isinstance(lm.get("data"), list) and lm["data"], "kunci lightning kosong atau berubah"
    return lm, sen, art


def zona(terbaru_naif, header_utc):
    """Jam zona sambaran terbaru terhadap header Date: 0 (UTC) atau 7 (WIB); selain itu ValueError."""
    selisih = (terbaru_naif.replace(tzinfo=UTC) - header_utc).total_seconds() / 3600
    for jam in (0, 7):
        if abs(selisih - jam) * 60 <= TOLERANSI_MENIT:
            return jam
    raise ValueError(f"zona waktu tak bisa dipastikan: sambaran terbaru {selisih:+.2f} jam dari header Date")


def baris(lm, jam):
    """Sambaran mentah -> daftar unik (waktu_utc, lat, lon, arus, polaritas, jenis) terurut; yang cacat dibuang dan dihitung."""
    out, lihat, cacat = [], set(), 0
    for r in lm["data"]:
        try:
            t = dt.datetime.strptime(r["tanggal"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=UTC) - dt.timedelta(hours=jam)
            lat, lon = float(r["latitude"]), float(r["longitude"])
            assert -90 <= lat <= 90 and -180 <= lon <= 180
            arus = abs(float(r["current"]))
        except (KeyError, ValueError, TypeError, AssertionError):
            cacat += 1
            continue
        k = (r["tanggal"], r["latitude"], r["longitude"])
        if k in lihat:
            continue
        lihat.add(k)
        out.append((t, lat, lon, arus, r.get("polarity"), (r.get("striketype") or "").strip("() ")))
    out.sort()
    return out, cacat


def kunci(s):
    """Hash waktu+koordinat mentah (bukan terkonversi) supaya stabil antar putaran."""
    return hashlib.md5(f"{s[0].isoformat()}|{s[1]:.6f}|{s[2]:.6f}".encode()).hexdigest()[:12]


def agregat(sambaran, cari):
    """-> prov {kode: [n, cg, cc]}, kab {'kode|kab': [n, cg, cc, arus_maks]}, luar n, kisi {(a,o): n}."""
    prov, kab, kisi, luar = collections.defaultdict(lambda: [0, 0, 0]), collections.defaultdict(lambda: [0, 0, 0, 0.0]), collections.Counter(), 0
    for t, lat, lon, arus, _pol, jenis in sambaran:
        kisi[(math.floor(lat / SEL), math.floor(lon / SEL))] += 1
        w = cari(lon, lat)
        if not w:
            luar += 1
            continue
        cg, cc = int(jenis == "CG"), int(jenis == "CC")
        for a in (prov[w[0]], kab[f"{w[0]}|{w[1]}"]):
            a[0] += 1
            a[1] += cg
            a[2] += cc
        kab[f"{w[0]}|{w[1]}"][3] = max(kab[f"{w[0]}|{w[1]}"][3], arus)
    return prov, kab, luar, kisi


def snapshot(sambaran, sensor, artikel, jam, header, diambil, cari, n_sumber, cacat):
    awal, akhir = sambaran[0][0], sambaran[-1][0]
    prov, kab, luar, kisi = agregat(sambaran, cari)
    arus = [s[3] for s in sambaran]
    jenis = collections.Counter(s[5] for s in sambaran)
    top = sorted(kab.items(), key=lambda kv: -kv[1][0])[:MAKS_KAB]
    return {
        "sumber": "BMKG, Petir Realtime (www.bmkg.go.id/geofisika-potensial/petir-realtime)", "url": URL, "diambil": diambil.isoformat(timespec="minutes"),
        "zona_sumber": "UTC" if jam == 0 else "WIB", "bukti_zona": {"sambaran_terbaru_mentah": (akhir + dt.timedelta(hours=jam)).strftime("%Y-%m-%d %H:%M:%S"), "header_date": header.isoformat()},
        "rentang": {"awal_wib": awal.astimezone(WIB).isoformat(timespec="seconds"), "akhir_wib": akhir.astimezone(WIB).isoformat(timespec="seconds")},
        "cakupan_menit": round((akhir - awal).total_seconds() / 60, 1),
        "catatan": "Jendela terakhir saja (~30 menit), bukan total harian. Arsip harian memakai cakupan_menit sendiri.",
        "n": len(sambaran), "n_sumber": n_sumber, "n_cacat": cacat, "n_cg": jenis.get("CG", 0), "n_cc": jenis.get("CC", 0), "jenis_lain": {k: v for k, v in jenis.items() if k not in ("CG", "CC")},
        "polaritas": dict(collections.Counter(s[4] for s in sambaran)),
        "arus": {"satuan": "A (dugaan dari kisaran; sumber tidak menyebut)", "rata": round(statistics.fmean(arus)), "median": round(statistics.median(arus)), "maks": round(max(arus))},
        "n_luar_wilayah": luar,
        "provinsi": {k: {"nama": PROVINSI.get(k, k), "n": v[0], "cg": v[1], "cc": v[2]} for k, v in sorted(prov.items(), key=lambda kv: -kv[1][0])},
        "kabupaten": [{"kode_prov": k.split("|")[0], "kab": k.split("|", 1)[1], "n": v[0], "cg": v[1], "cc": v[2], "arus_maks": round(v[3])} for k, v in top],
        "n_kabupaten": len(kab),
        "kisi": {"sel": SEL, "titik": [[round((a + .5) * SEL, 3), round((o + .5) * SEL, 3), n] for (a, o), n in kisi.most_common(MAKS_SEL)], "n_sel": len(kisi)},
        "sensor": [{"nama": s.get("RealName"), "lat": float(s["Latitude"]), "lon": float(s["Longitude"])} for s in sensor if s.get("Latitude") and s.get("Longitude")],
        "artikel_bulanan": [{"judul": a.get("title"), "slug": a.get("slug"), "terbit": a.get("date")} for a in artikel[:12]],
    }


def _gabung(rentang):
    """[[a,b],...] ISO -> menit gabungan (tanpa tumpang tindih)."""
    iv = sorted((dt.datetime.fromisoformat(a), dt.datetime.fromisoformat(b)) for a, b in rentang)
    tot, akhir = 0.0, None
    for a, b in iv:
        if akhir is None or a > akhir:
            tot += (b - a).total_seconds()
            akhir = b
        elif b > akhir:
            tot += (b - akhir).total_seconds()
            akhir = b
    return round(tot / 60, 1)


def tambah_arsip(arsip, sambaran, cari, diambil):
    """Tambahkan sambaran yang belum pernah masuk ke arsip bulan (satu bulan WIB). -> (n_baru, n_duplikat)."""
    h = set(arsip.setdefault("dedup", {}).setdefault("hash", []))
    baru = [s for s in sambaran if kunci(s) not in h]
    dup = len(sambaran) - len(baru)
    if not baru:
        return 0, dup
    hari = arsip.setdefault("hari", {})
    per_hari = collections.defaultdict(list)
    for s in baru:
        per_hari[s[0].astimezone(WIB).date().isoformat()].append(s)
    for tgl, ss in per_hari.items():
        d = hari.setdefault(tgl, {"n": 0, "cg": 0, "cc": 0, "luar_wilayah": 0, "putaran": 0, "rentang_wib": [], "cakupan_menit": 0.0, "kabupaten": {},
                                  "catatan": "Hanya jendela yang terambil; bukan total harian."})
        prov, kab, luar, _ = agregat(ss, cari)
        for k, v in kab.items():
            a = d["kabupaten"].setdefault(k, [0, 0, 0, 0])
            a[0] += v[0]; a[1] += v[1]; a[2] += v[2]; a[3] = max(a[3], round(v[3]))  # noqa: E702
        d["n"] += len(ss); d["cg"] += sum(s[5] == "CG" for s in ss); d["cc"] += sum(s[5] == "CC" for s in ss); d["luar_wilayah"] += luar  # noqa: E702
        d["putaran"] += 1
        d["rentang_wib"].append([ss[0][0].astimezone(WIB).isoformat(timespec="seconds"), ss[-1][0].astimezone(WIB).isoformat(timespec="seconds")])
        d["cakupan_menit"] = _gabung(d["rentang_wib"])
        d["persen_hari_tercakup"] = round(d["cakupan_menit"] / 1440 * 100, 1)
    terbaru = max(s[0] for s in sambaran)
    # hash lama yang tak ada di putaran ini lebih tua dari jendela mana pun yang masih bisa tumpang tindih: dibuang
    arsip["dedup"] = {"sejak_utc": (terbaru - dt.timedelta(minutes=HASH_MENIT)).isoformat(),
                      "hash": sorted(kunci(s) for s in sambaran if s[0] >= terbaru - dt.timedelta(minutes=HASH_MENIT))}
    arsip["diperbarui"] = diambil.isoformat(timespec="minutes")
    return len(baru), dup


def simpan_arsip(sambaran, cari, diambil):
    ringkas = {}
    per_bulan = collections.defaultdict(list)
    for s in sambaran:
        per_bulan[s[0].astimezone(WIB).strftime("%Y-%m")].append(s)
    for bulan, ss in per_bulan.items():
        j = arsip_jalur(bulan)
        a = baca(j, None) or {"bulan": bulan, "sumber": "BMKG, Petir Realtime", "zona_hari": "WIB",
                              "catatan": "Append-only, agregat per kabupaten per hari WIB. Tiap hari hanya memuat jendela yang terambil (lihat cakupan_menit); bukan total harian.",
                              "hari": {}}
        n, dup = tambah_arsip(a, ss, cari, diambil)
        if len(json.dumps(a, separators=(",", ":")).encode()) > MAKS_ARSIP:
            print(f"petir: arsip {bulan} melewati {MAKS_ARSIP} byte: penambahan ditolak", file=sys.stderr)
            continue
        if n:
            simpan(j, a)
        ringkas[bulan] = (n, dup)
    return ringkas


def main():
    try:
        from wilayah import Wilayah
        html, header = unduh()
        lm, sen, art = urai(html)
        sam, cacat = baris(lm, 0)
        assert sam, "tak ada sambaran valid"
        jam = zona(max(dt.datetime.strptime(r["tanggal"], "%Y-%m-%d %H:%M:%S") for r in lm["data"] if r.get("tanggal")), header)
        sam, cacat = baris(lm, jam)
        cari = Wilayah().cari
        diambil = dt.datetime.now(WIB)
        simpan(BERKAS, snapshot(sam, sen, art, jam, header, diambil, cari, len(lm["data"]), cacat))
        print(f"petir: {len(sam)} sambaran, zona sumber {'UTC' if jam == 0 else 'WIB'}, arsip {simpan_arsip(sam, cari, diambil)}", file=sys.stderr)
    except Exception as x:  # gagal-lunak
        print(f"petir: GAGAL {type(x).__name__} {x}; berkas lama dibiarkan", file=sys.stderr)


def uji():
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../banjir"))
    from wilayah import Wilayah
    html = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture/petir_nuxt.html"), encoding="utf-8").read()  # cuplikan NYATA 10 Nov 2026
    header = dt.datetime(2026, 11, 10, 10, 19, 20, tzinfo=UTC)
    lm, sen, art = urai(html)
    assert len(lm["data"]) == 80 and len(sen) == 27 and art[0]["slug"].startswith("informasi-sambaran-petir"), (len(lm["data"]), len(sen))
    terbaru = max(dt.datetime.strptime(r["tanggal"], "%Y-%m-%d %H:%M:%S") for r in lm["data"])
    assert zona(terbaru, header) == 0
    assert zona(terbaru + dt.timedelta(hours=7), header) == 7   # sumber berlabel WIB bila jamnya 7 di depan header
    try:
        zona(terbaru, header + dt.timedelta(hours=3))
        assert False
    except ValueError:
        pass
    sam, cacat = baris(lm, 0)
    assert len(sam) == 80 and cacat == 0 and sam[0][0] <= sam[-1][0]
    cari = Wilayah().cari
    diambil = dt.datetime(2026, 11, 10, 17, 20, tzinfo=WIB)
    s = snapshot(sam, sen, art, 0, header, diambil, cari, 80, 0)
    assert s["n"] == 80 and s["n_cg"] + s["n_cc"] + sum(s["jenis_lain"].values()) == 80
    assert sum(p["n"] for p in s["provinsi"].values()) + s["n_luar_wilayah"] == 80
    assert sum(k["n"] for k in s["kabupaten"]) == sum(p["n"] for p in s["provinsi"].values()) and s["n_kabupaten"] >= 1
    assert s["rentang"]["akhir_wib"].endswith("+07:00") and s["rentang"]["akhir_wib"].startswith("2026-11-10T17:1"), s["rentang"]   # 10:18 UTC = 17:18 WIB
    assert 0 < s["cakupan_menit"] <= 31 and len(s["sensor"]) == 27 and sum(t[2] for t in s["kisi"]["titik"]) == 80
    # arsip: dua putaran berurutan dengan tumpang tindih -> tak ada hitung ganda; putaran jauh -> cakupan menambah, total tetap tak diklaim harian
    a = {}
    n1, d1 = tambah_arsip(a, sam, cari, diambil)
    n2, d2 = tambah_arsip(a, sam, cari, diambil)
    assert (n1, d1, n2, d2) == (80, 0, 0, 80), (n1, d1, n2, d2)
    tgl = "2026-11-10"
    assert a["hari"][tgl]["n"] == 80 and a["hari"][tgl]["putaran"] == 1 and sum(v[0] for v in a["hari"][tgl]["kabupaten"].values()) + a["hari"][tgl]["luar_wilayah"] == 80
    geser = [(t + dt.timedelta(hours=3), la, lo, ar, p, j) for t, la, lo, ar, p, j in sam]
    n3, _ = tambah_arsip(a, geser, cari, diambil)
    d = a["hari"][tgl]
    assert n3 == 80 and d["n"] == 160 and d["putaran"] == 2 and d["cakupan_menit"] < 90 and d["persen_hari_tercakup"] < 10, d["cakupan_menit"]
    assert len(a["dedup"]["hash"]) <= 80
    assert _gabung([["2026-11-10T10:00:00+00:00", "2026-11-10T10:30:00+00:00"], ["2026-11-10T10:20:00+00:00", "2026-11-10T10:50:00+00:00"]]) == 50.0
    print("uji petir ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
