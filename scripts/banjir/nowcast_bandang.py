"""Nowcast banjir bandang 0-6 jam: fitur hujan per jam GSMaP NRT per kecamatan zona bahaya bandang. Rancangan: docs/banjir/NOWCAST-BANDANG.md.

  nowcast_bandang.py uji     self-check sintetis, tanpa jaringan/kunci
  nowcast_bandang.py tarik   30 jam NRT terakhir -> data/raw/banjir/nowcast_bandang/fitur_<UTC>.json (BUKAN public, BUKAN workflow)
Tanpa GSMAP_USER/GSMAP_PASS atau akses gagal: log + keluar 0. AMBANG BELUM DITETAPKAN: keluaran hanya fitur, `status` selalu null.
Pengambil dipakai ulang dari genangan/gsmap.py (login, biner) dan genangan/m1_kumpul.py (cari_jam, NRT); arsip m1_hujan.jsonl tidak disentuh.
Jam berkas GSMaP = UTC (rata-rata laju jam itu, mm/jam = mm). Satuan NRT jam BELUM terverifikasi dengan login (m1_kumpul menolak > MAKS_MM_JAM).
"""
import datetime as dt, ftplib, gzip, json, os, struct, sys
D = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [D, os.path.join(D, "genangan")]
from bersama import AKAR, WIB

KELUAR = os.path.join(AKAR, "data/raw/banjir/nowcast_bandang")
PUSAT = os.path.join(AKAR, "public/banjir/data/pusat_kec.json")      # {"kk|kab|kec": [lat, lon]}
BAHAYA = os.path.join(AKAR, "public/banjir/data/bahaya.json")        # kec[kunci]["bandang"] 0..1 (InaRISK)
B_MIN = 0.33        # SEMENTARA: zona bahaya = indeks InaRISK bandang >= ini (sama dengan B status.py); bukan ambang hujan
ANTE, JEND, RIWAYAT = 24, 6, 30   # jam anteseden, jam jendela, jam yang ditarik (ANTE + JEND)
LATENSI_JAM = 4     # klaim JAXA untuk NRT; nyata dicatat di keluaran (umur jam terbaru)


def zona_waktu(lon):
    """Pendekatan per bujur (batas provinsi sebenarnya tidak lurus): < 114,5 WIB (+7), < 131 WITA (+8), selain itu WIT (+9)."""
    return ("WIB", 7) if lon < 114.5 else ("WITA", 8) if lon < 131 else ("WIT", 9)


def fitur(seri):
    """seri: [(jam UTC berakhir-jam-itu aware, mm|None)] urut waktu, jam terakhir = jam terbaru tersedia.
    -> h1/h3 = maks 1/3 jam berurutan di JEND jam terakhir, h6 = jumlah JEND jam, a24 = jumlah ANTE jam SEBELUM jendela.
    Jam hilang dihitung 0 tetapi dilaporkan di `hilang`; jam harus berurutan tiap 1 jam."""
    for (a, _), (b, _) in zip(seri, seri[1:]):
        assert b - a == dt.timedelta(hours=1), f"jam tak berurutan {a}..{b}"
    assert len(seri) >= JEND, "kurang dari jendela"
    w, v = seri[-JEND:], [m or 0 for _, m in seri]
    j, ante = v[-JEND:], seri[-(JEND + ANTE):-JEND]
    return {"jam_terbaru_utc": f"{seri[-1][0]:%Y-%m-%dT%H}Z", "h1": round(max(j), 1),
            "h3": round(max(sum(j[i:i + 3]) for i in range(JEND - 2)), 1), "h6": round(sum(j), 1),
            "a24": round(sum(v[-(JEND + ANTE):-JEND]), 1), "hilang": sum(m is None for _, m in w + ante),
            "ante_jam": len(ante)}


def unit(pusat, bahaya, b_min=B_MIN):
    """Kecamatan zona bahaya bandang -> {kunci: (lat, lon)}; kecamatan tanpa pusat atau tanpa nilai bahaya dibuang."""
    return {k: tuple(p) for k, p in pusat.items() if (bahaya.get(k) or {}).get("bandang", -1) >= b_min}


def sel(lat, lon):
    """Indeks (baris, kolom) sel GSMaP 0,1 derajat yang memuat titik (pusat sel di lat 59,95-0,1j, lon 0,05+0,1i)."""
    import gsmap as g
    return round((g.LAT0 - lat) / g.D), round(((lon % 360) - g.LON0) / g.D)


def nilai_sel(biner_gz, idx):
    import gsmap as g
    b = gzip.decompress(biner_gz)
    assert len(b) == g.NX * g.NY * 4, f"ukuran {len(b)}"
    return {k: (lambda v: None if v < 0 or v != v else round(v, 3))(struct.unpack_from("<f", b, (j * g.NX + i) * 4)[0])
            for k, (j, i) in idx.items()}


def tarik(sekarang=None):
    user, sandi = os.environ.get("GSMAP_USER"), os.environ.get("GSMAP_PASS")
    if not user or not sandi:
        print("nowcast_bandang: GSMAP_USER/GSMAP_PASS tidak ada, dilewati (keluar 0).")
        return 0
    import gsmap, m1_kumpul as m1
    try:
        u = unit(json.load(open(PUSAT)), json.load(open(BAHAYA))["kec"])
        idx = {k: sel(*p) for k, p in u.items()}
        f = gsmap.sambung(user, sandi)
        now = (sekarang or dt.datetime.now(dt.timezone.utc)).replace(minute=0, second=0, microsecond=0)
        cache, per_jam = {}, {}
        for n in range(RIWAYAT + 12, 0, -1):          # mulai dari jam terlama; 12 jam lebih untuk menutup latensi NRT
            t = now - dt.timedelta(hours=n)
            for _, c, dasar in m1.NRT:
                p = m1.cari_jam(f, dasar, t.date(), t.hour, cache)
                if p:
                    per_jam[t] = (c, nilai_sel(gsmap.unduh_batas(f, p), idx))
                    break
        if len(per_jam) < JEND:
            print(f"nowcast_bandang: hanya {len(per_jam)} jam berkas, dilewati (keluar 0).")
            return 0
        jam = sorted(per_jam)[-(RIWAYAT):]
        # ponytail: celah di tengah ditolak oleh fitur() (assert); isi/skip celah setelah latensi nyata terukur
        out = {}
        for k in u:
            out[k] = {**fitur([(t, per_jam[t][1][k]) for t in jam]), "tz": zona_waktu(u[k][1])[0], "status": None}
        r = {"dibuat_utc": now.isoformat(), "umur_jam_terbaru": round((now - jam[-1]).total_seconds() / 3600 - 1, 1),
             "latensi_klaim_jam": LATENSI_JAM, "pola": "".join(per_jam[t][0] for t in jam), "n_unit": len(out),
             "ambang": "belum ditetapkan", "kec": out}
        os.makedirs(KELUAR, exist_ok=True)
        json.dump(r, open(os.path.join(KELUAR, f"fitur_{now:%Y%m%dT%H}Z.json"), "w"), ensure_ascii=False, separators=(",", ":"))
        print(f"nowcast_bandang: {len(out)} unit, jam terbaru {jam[-1]:%Y-%m-%d %HZ}, umur {r['umur_jam_terbaru']} jam, pola {r['pola']}")
    except (ftplib.all_errors + (OSError, AssertionError, ValueError, KeyError)) as e:
        print(f"nowcast_bandang: gagal aman ({type(e).__name__}: {e}), keluar 0.", file=sys.stderr)
    return 0


def uji():
    U = dt.timezone.utc
    t0 = dt.datetime(2026, 11, 1, 20, tzinfo=U)   # jam terbaru; 20Z = 03 WIB hari berikutnya
    mm = [0.0] * 24 + [1, 2, 3, 40, 5, 6]          # anteseden 24 jam nol, jendela 6 jam
    seri = [(t0 - dt.timedelta(hours=29 - i), m) for i, m in enumerate(mm)]
    f = fitur(seri)
    assert f["h1"] == 40 and f["h3"] == 51 and f["h6"] == 57 and f["a24"] == 0 and f["hilang"] == 0, f
    assert f["jam_terbaru_utc"] == "2026-11-01T20Z"
    assert (t0.astimezone(dt.timezone(dt.timedelta(hours=7))).day, zona_waktu(106.8)) == (2, ("WIB", 7))   # hari WIB beda dari UTC
    assert zona_waktu(119.4)[0] == "WITA" and zona_waktu(140.7) == ("WIT", 9)
    seri2 = [(t, (7.0 if i < 24 else None if i == 27 else 0.0)) for i, (t, _) in enumerate(seri)]   # anteseden 24x7, 1 jam hilang
    f2 = fitur(seri2)
    assert f2["a24"] == 168 and f2["h6"] == 0 and f2["hilang"] == 1 and f2["ante_jam"] == 24, f2
    try:
        fitur(seri[:20] + seri[22:])
        raise SystemExit("celah jam harus ditolak")
    except AssertionError:
        pass
    p = {"a": [-6.2, 106.8], "b": [-6.3, 106.9], "c": [1.0, 100.0]}
    h = {"a": {"bandang": 0.5}, "b": {"bandang": 0.1}}
    assert unit(p, h) == {"a": (-6.2, 106.8)}      # b di bawah B_MIN, c tanpa nilai bahaya
    import gsmap as g
    assert sel(59.95, 0.05) == (0, 0) and sel(-6.15, 106.75) == (660 + 1, 1067) and sel(0.0, 179.97)[1] == 1799
    v = [0.0] * (g.NX * g.NY)
    v[661 * g.NX + 1067] = 12.5
    v[0] = -9
    o = nilai_sel(gzip.compress(struct.pack(f"<{g.NX * g.NY}f", *v)), {"x": (661, 1067), "y": (0, 0)})
    assert o == {"x": 12.5, "y": None}, o
    os.environ.pop("GSMAP_USER", None)
    assert tarik() == 0
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    sys.exit(uji() if a == ["uji"] else tarik() if a == ["tarik"] else sys.exit(__doc__))
