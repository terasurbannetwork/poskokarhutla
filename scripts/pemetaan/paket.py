#!/usr/bin/env python3
"""HR-07: paket proyek pemetaan untuk SATU kab prioritas (PRD F-3, ALUR 2, DESAIN-TEKNIS paket.py).
Isi: aoi.geojson (zona kab yang SAMA dengan kelengkapan.py), instruksi.md, citra saran, hashtag, paket.json.
Sistem hanya MENYIAPKAN berkas; tidak ada panggilan ke HOT/OSM (KEPUTUSAN D3, Q1). Staf mengunggah sendiri.
Citra = daftar saran saja (Q4 bawaan sementara): staf memastikan lisensi. Tanpa nama orang.
Keluaran ke direktori PRIVAT (bukan public/; nanti R2 lewat src/pemetaan.js HR-08).
Pakai: python3 -I scripts/pemetaan/paket.py --cek
       python3 -I scripts/pemetaan/paket.py --kab 6372 --keluar <dir> [--kelengkapan berkas.json]"""
import importlib.util, json, math, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


KL = _muat("pm_kelengkapan", "scripts/pemetaan/kelengkapan.py")
KONST = KL.KONST
TUGAS_KM2 = 1.0   # HIPOTESIS: ukuran tugas yang disarankan ~1 km2; belum dikalibrasi, staf boleh mengubahnya di Tasking Manager
# Q4 bawaan sementara: hanya daftar saran. Tidak ada klaim lisensi; kolom "lisensi" selalu menyuruh staf memastikan.
CITRA = [
    {"nama": "Esri World Imagery", "catatan": "pemandu penyuntingan OSM umum; staf memeriksa syarat pakai"},
    {"nama": "Bing Maps Aerial", "catatan": "tersedia di editor OSM; staf memeriksa syarat pakai"},
    {"nama": "Maxar Open Data", "catatan": "hanya untuk kejadian yang dibuka Maxar; belum tentu mencakup kab ini"},
    {"nama": "OpenAerialMap", "catatan": "cakupan per citra; cek public/data/citra_terbuka.json dan lisensi tiap citra"},
]
LISENSI = "Belum diperiksa sistem. Staf memastikan lisensi tiap citra sebelum dipakai (Q4)."


def hashtag_dasar(kab4):
    return f"#CentuRisk-{kab4}"


def luas_km2(geoms):
    """Luas kasar (shoelace, bidang ekuirektangular) cincin luar semua poligon; lubang diabaikan (cukup untuk perkiraan jumlah tugas)."""
    t = 0.0
    for g in geoms:
        pol = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for p in pol:
            r = p[0]
            lat0 = math.radians(sum(c[1] for c in r) / len(r))
            a = 0.0
            for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
                a += (x1 * math.cos(lat0) * 111.32) * (y2 * 110.57) - (x2 * math.cos(lat0) * 111.32) * (y1 * 110.57)
            t += abs(a) / 2
    return t


def bangun(kab4, nama, geoms, baris=None):
    """-> (paket dict, aoi FeatureCollection, instruksi str). baris = baris kelengkapan kab (boleh None)."""
    if not geoms:
        raise ValueError(f"zona kab {kab4} tidak ditemukan")
    km2 = luas_km2(geoms)
    ht = hashtag_dasar(kab4)
    aoi = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"kab4": kab4, "nama": nama, "zona": "seluruh kab (aproksimasi, bukan zona bahaya)"}, "geometry": g} for g in geoms]}
    b = baris or {}
    paket = {
        "kab4": kab4, "nama": nama, "status": "disiapkan", "hashtag_dasar": ht,
        "kampus_hashtag_pola": "#CentuRisk-<kode kampus>", "aoi_luas_km2": round(km2, 1),
        "tugas_disarankan": {"ukuran_km2": TUGAS_KM2, "perkiraan_jumlah": max(1, round(km2 / TUGAS_KM2)), "status": "HIPOTESIS"},
        "kelengkapan": {k: b.get(k) for k in ("n_osm", "n_pembanding", "rasio", "kelas")} if b else None,
        "tanggal_data": b.get("tanggal_data") if b else None,
        "citra_saran": CITRA, "citra_lisensi": LISENSI,
        "dikirim_ke_luar": False,
        "daftar_staf": ["halaman wiki OSM kegiatan", "pemberitahuan ke komunitas OSM lokal", "hashtag didaftarkan", "lisensi citra dipastikan", "akun HOT pemegang proyek disetujui (Q1)"],
    }
    rasio = ("rasio kelengkapan %s (%s)" % (b["rasio"], b.get("kelas"))) if b.get("rasio") is not None else "rasio kelengkapan belum tersedia"
    ins = f"""# Paket pemetaan bangunan: {nama} ({kab4})

Paket ini disiapkan sistem; belum dikirim ke mana pun. Staf yang mengunggahnya ke Tasking Manager memakai akun yang disetujui.

## Ringkas
- Wilayah: seluruh {nama} (aoi.geojson), kira-kira {km2:.0f} km2. Ini aproksimasi, bukan zona bahaya.
- Keadaan data: {rasio}.
- Hashtag dasar: {ht}. Tiap kampus memakai #CentuRisk-<kode kampus> (diberikan saat bergabung).
- Ukuran tugas yang disarankan: sekitar {TUGAS_KM2:g} km2 per tugas, kira-kira {paket['tugas_disarankan']['perkiraan_jumlah']} tugas (hipotesis).

## Instruksi untuk pemeta
1. Petakan hanya bangunan (building=*) yang terlihat jelas di citra. Gambar satu poligon per bangunan, sudut siku bila bangunannya siku.
2. Jangan menggambar ulang bangunan yang sudah ada; perbaiki bentuknya bila meleset.
3. Beri tag building=yes bila jenisnya tidak pasti; jangan menebak fungsi.
4. Pasang hashtag di komentar changeset: {ht} dan hashtag kampus Anda.
5. Jangan memetakan dari ingatan atau dari data berhak cipta lain. Hanya dari citra yang diizinkan.
6. Ragu pada sebuah tugas? Tandai untuk validator, jangan dihapus.

## Saran citra (lisensi dipastikan staf)
""" + "\n".join(f"- {c['nama']}: {c['catatan']}" for c in CITRA) + f"""

{LISENSI}

## Daftar periksa staf sebelum status dikirim
""" + "\n".join(f"- [ ] {x}" for x in paket["daftar_staf"]) + "\n"
    return paket, aoi, ins


def tulis(dir_keluar, paket, aoi, ins):
    d = os.path.abspath(dir_keluar)
    if os.path.commonpath([d, os.path.join(AKAR, "public")]) == os.path.join(AKAR, "public"):
        raise SystemExit("keluaran tidak boleh di bawah public/ (paket privat)")
    os.makedirs(d, exist_ok=True)
    json.dump(aoi, open(os.path.join(d, "aoi.geojson"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(paket, open(os.path.join(d, "paket.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(os.path.join(d, "instruksi.md"), "w", encoding="utf-8").write(ins)


def cek():
    kotak = {"type": "Polygon", "coordinates": [[[100.0, 0.0], [100.1, 0.0], [100.1, 0.1], [100.0, 0.1], [100.0, 0.0]]]}
    km2 = luas_km2([kotak])
    assert 120 < km2 < 125, km2   # 0,1 derajat ~ 11,1 km
    p, a, i = bangun("6372", "Kota X", [kotak], {"n_osm": 80, "n_pembanding": 100, "rasio": 0.8, "kelas": "sedang", "tanggal_data": "2026-07-27T00:00:00Z"})
    assert p["hashtag_dasar"] == "#CentuRisk-6372" and p["status"] == "disiapkan" and p["dikirim_ke_luar"] is False
    assert p["tugas_disarankan"]["status"] == "HIPOTESIS" and p["tugas_disarankan"]["perkiraan_jumlah"] == round(km2)
    assert a["features"][0]["geometry"] == kotak and "#CentuRisk-6372" in i and "Belum diperiksa" in i
    assert p["kelengkapan"]["rasio"] == 0.8 and "rasio kelengkapan 0.8 (sedang)" in i
    p2, _, i2 = bangun("6372", "Kota X", [kotak])
    assert p2["kelengkapan"] is None and "belum tersedia" in i2          # tanpa kelengkapan: tidak ada angka karangan
    try:
        bangun("6372", "Kota X", [])
        raise AssertionError("zona kosong harus ditolak")
    except ValueError:
        pass
    s = json.dumps([p, i]).lower()
    assert not any(k in s for k in ("email", "@", "mahasiswa", "dosen")), s
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        tulis(os.path.join(t, "paket"), p, a, i)
        assert sorted(os.listdir(os.path.join(t, "paket"))) == ["aoi.geojson", "instruksi.md", "paket.json"]
    try:
        tulis(os.path.join(AKAR, "public/data/x"), p, a, i)
        raise AssertionError("public/ harus ditolak")
    except SystemExit:
        pass
    print("OK paket.py: AOI = zona kab, hashtag dasar, citra hanya saran, tanpa kirim, bukan ke public/")


if __name__ == "__main__":
    a = sys.argv
    if "--cek" in a:
        cek()
    elif "--kab" in a and "--keluar" in a:
        k = a[a.index("--kab") + 1]
        prov, g = KL.zona_kab(k)
        nama = json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json"), encoding="utf-8"))[k]["kunci_nama"].split("|", 1)[1]
        baris = None
        kb = a[a.index("--kelengkapan") + 1] if "--kelengkapan" in a else KL.KELUAR
        if os.path.exists(kb):
            dk = json.load(open(kb, encoding="utf-8"))
            baris = next((dict(r, tanggal_data=dk.get("tanggal_data")) for r in dk.get("kab", []) if r["kab4"] == k), None)
        tulis(a[a.index("--keluar") + 1], *bangun(k, nama, g, baris))
        print("paket ditulis; belum dikirim ke HOT/OSM")
    else:
        sys.exit(__doc__)
