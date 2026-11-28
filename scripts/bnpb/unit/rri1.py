"""RRI-1 Daftar akses putus sampai pulih (DESAIN-TEKNIS sec 6.23; ALGORITMA sec 10.32; tiket RU-082).

Langkah jalan.py (harian). Masukan: layer ArcGIS BNPB Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13 (prasarana publik, bukan data orang) lewat
panen.ambil_json dengan outFields daftar putih dan returnGeometry=false (koordinat dibaca dari kolom lat dan lon), bukan geometri; ruas OSM terdekat dari
public/data/osm_nasional/<prov>.json (jembatan); status terbaru dari tabel D1 akses_status (diisi staf lewat POST /api/unit/akses).
  titik disatukan bila jaraknya paling jauh 200 m dan desa serta kabupatennya sama (satu desa, tautan berantai); id = 16 heks terkecil dari
    sha1(sumber|uid) anggota gugus, jadi urutan masukan tidak mengubahnya (id bisa berubah bila titik baru berhash lebih kecil bergabung; layer sudah berhenti diperbarui)
  tgl_putus = tanggal WIB paling awal di gugus; umur_putus = hari ini dikurangi tgl_putus
  kelas pemilik = ruas OSM terdekat paling jauh 50 m: highway trunk atau primary = nasional; secondary = provinsi; tertiary ke bawah tanpa ref = kab_desa;
    tertiary ke bawah DENGAN ref (nomor bisa jalan nasional, provinsi, atau kabupaten) = tidak diketahui; tanpa ruas atau tanpa tag highway = tidak diketahui. Selalu berlabel estimasi.
  aset desa: kelas kab_desa dan ruas tanpa ref = tanda "kemungkinan aset kabupaten atau desa, perlu dicek ke BPBD" (bukan putusan; tanpa menyebut pasal); kelas lain tidak ditandai, tidak diketahui = tanpa tanda
  status bawaan putus bila D1 belum punya catatan atau belum terbaca (status_d1 mencatat keadaannya)
Keluaran R2 unit/akses_putus.json: {titik: [{id, ...}], kartu, data} (kontrak Worker RU-083: titik[].id 16 heks).

  python3 -I scripts/bnpb/unit/rri1.py --cek
"""
import hashlib
import html
import json
import math
import os
import re
import sys
import urllib.parse
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402
import wil1  # noqa: E402

AKAR = rapor.AKAR
BASE = "https://gis.bnpb.go.id/server/rest/services/Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13/query"
KOLOM = ("uid", "desa", "kecamatan", "kabupaten", "provinsi", "dt", "name", "lat", "lon", "cause", "damage", "sumber")
FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "akses_putus_contoh.json")
OSM_DIR = os.path.join(AKAR, "public", "data", "osm_nasional")
GUGUS_M = 200
OSM_M = 50
MAKS_BARIS = 100
STATUS = ("putus", "darurat", "pulih")
SQL_STATUS = "SELECT titik_id, tgl, status FROM akses_status WHERE dummy = 0 ORDER BY tgl, id"
RE_ID = re.compile(r"^[0-9a-f]{16}$")
TANDA_ASET = "kemungkinan aset kabupaten atau desa, perlu dicek ke BPBD"


def url_layer():
    q = urllib.parse.urlencode({"where": "1=1", "outFields": ",".join(KOLOM), "returnGeometry": "false", "f": "json"}, safe=",")
    return f"{BASE}?{q}"


def jarak_m(a, b):
    """Haversine, meter."""
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371008.8 * math.asin(math.sqrt(h))


def id_titik(sumber, uid):
    return hashlib.sha1(f"{sumber}|{uid}".encode()).hexdigest()[:16]


def tgl_wib(ms):
    return (datetime.fromtimestamp(ms / 1000, timezone.utc) + timedelta(hours=7)).date()


RE_TAG = re.compile(r"<[^>]*>")
RE_TELEPON = re.compile(r"\+?\d[\d\s-]{8,}")


def bersih(t):
    """Teks bebas layer (name, cause, damage): buang tag, urai entitas, buang tag lagi (entitas bisa memunculkan tag), buang deretan angka yang menyerupai nomor telepon,
    rapatkan spasi, potong 300 huruf; kosong = None."""
    t = RE_TAG.sub(" ", html.unescape(RE_TAG.sub(" ", str(t or ""))))
    t = RE_TELEPON.sub(" ", t)
    t = " ".join(t.split())[:300]
    return t or None


def urai_layer(j):
    """Layer ArcGIS -> baris titik. Baris tanpa uid, koordinat, atau tanggal dibuang dan dihitung; daftar terpotong ditolak."""
    if not isinstance(j, dict) or not isinstance(j.get("features"), list):
        raise ValueError("balasan layer bukan daftar fitur")
    if j.get("exceededTransferLimit"):
        raise ValueError("layer terpotong batas jumlah baris; akses putus tidak lengkap")
    out, buang = [], 0
    for f in j["features"]:
        a = (f or {}).get("attributes") or {}
        lat, lon, dt = a.get("lat"), a.get("lon"), a.get("dt")
        if not a.get("uid") or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or isinstance(dt, bool) or not isinstance(dt, (int, float)) \
                or not (-11.5 <= lat <= 6.5 and 94 <= lon <= 142):
            buang += 1
            continue
        out.append({"id": id_titik(a.get("sumber") or "", a["uid"]), "sumber": (a.get("sumber") or "tanpa sumber").strip(), "lokasi": bersih(a.get("name")),
                    "desa": (a.get("desa") or "").strip(), "kecamatan": (a.get("kecamatan") or "").strip(), "kab": (a.get("kabupaten") or "").strip(),
                    "prov": (a.get("provinsi") or "").strip(), "lat": float(lat), "lon": float(lon), "tgl": tgl_wib(dt),
                    "sebab": bersih(a.get("cause")), "kerusakan": bersih(a.get("damage"))})
    return out, buang


def satukan(titik):
    """Gugus: desa dan kabupaten sama (kunci_nama) dan jarak berantai paling jauh 200 m (union-find; O(n^2) per desa, desa berisi puluhan titik)."""
    per = {}
    for t in titik:
        per.setdefault((wil1.kunci_nama(t["prov"]), wil1.kunci_nama(t["kab"]), wil1.kunci_nama(t["desa"])), []).append(t)
    hasil = []
    for baris in per.values():
        induk = list(range(len(baris)))

        def cari(i):
            while induk[i] != i:
                induk[i] = induk[induk[i]]
                i = induk[i]
            return i
        for i in range(len(baris)):
            for k in range(i + 1, len(baris)):
                if jarak_m((baris[i]["lat"], baris[i]["lon"]), (baris[k]["lat"], baris[k]["lon"])) <= GUGUS_M:
                    induk[cari(i)] = cari(k)
        gugus = {}
        for i, t in enumerate(baris):
            gugus.setdefault(cari(i), []).append(t)
        hasil += list(gugus.values())
    out = []
    for g in hasil:
        g.sort(key=lambda t: t["id"])
        p = g[0]
        out.append({**{k: p[k] for k in ("lokasi", "desa", "kecamatan", "kab", "prov", "sebab", "kerusakan")}, "id": p["id"],
                    "lat": round(sum(t["lat"] for t in g) / len(g), 6), "lon": round(sum(t["lon"] for t in g) / len(g), 6),   # pusat gugus: tidak bergantung titik mana yang id-nya terkecil
                    "tgl_putus": min(t["tgl"] for t in g).isoformat(), "sumber_asal": sorted({t["sumber"] for t in g}), "anggota": len(g)})
    out.sort(key=lambda t: (t["tgl_putus"], t["id"]))
    return out


def kelas_ruas(row):
    """Satu baris OSM jembatan: [lat, lon, nama, highway?, ref?] -> (kelas, punya_ref). trunk dan primary = nasional; secondary = provinsi; tertiary ke bawah tanpa ref = kab_desa.
    Tertiary ke bawah dengan ref, atau tanpa tag highway: (None, None), tidak diketahui (nomor ref saja tidak membuktikan pemilik)."""
    if len(row) < 4 or not row[3]:
        return None, None
    hw, ref = str(row[3]).lower(), (str(row[4]).strip() if len(row) > 4 and row[4] else "")
    if hw in ("trunk", "primary"):
        return "nasional", bool(ref)
    if hw == "secondary":
        return "provinsi", bool(ref)
    return ("kab_desa", False) if not ref else (None, None)


def beri_kelas(gugus, osm_per_prov, kode_prov):
    """osm_per_prov: {kode provinsi: [baris OSM jembatan]}; kode_prov: {kunci_nama provinsi: kode}."""
    for g in gugus:
        kp = kode_prov.get(wil1.kunci_nama(g["prov"]))
        dekat = None
        for r in osm_per_prov.get(kp, []):
            d = jarak_m((g["lat"], g["lon"]), (r[0], r[1]))
            if d <= OSM_M and (dekat is None or d < dekat[0]):
                dekat = (d, r)
        kelas, ref = kelas_ruas(dekat[1]) if dekat else (None, None)
        g["kelas_pemilik"] = kelas or "tidak_diketahui"
        g["aset_desa"] = (not ref) if kelas == "kab_desa" else None
    return gugus


def terapkan_status(gugus, catatan, hari_ini):
    """catatan: [{titik_id, tgl, status}] urut waktu naik; yang terakhir menang. Bawaan putus."""
    t = {}
    for c in catatan:
        if c.get("status") not in STATUS or not RE_ID.fullmatch(str(c.get("titik_id", ""))):
            raise ValueError(f"catatan status tidak sah: {c!r}")
        t[c["titik_id"]] = c
    for g in gugus:
        c = t.get(g["id"])
        g["status"], g["status_sumber"], g["status_tgl"] = (c["status"], "staf", c["tgl"]) if c else ("putus", "bawaan", None)
        g["umur_putus"] = (hari_ini - date.fromisoformat(g["tgl_putus"])).days
    return gugus


def baca_status(jalankan):
    d = json.loads(jalankan(SQL_STATUS))
    if not isinstance(d, list) or not d or d[0].get("success") is not True:
        raise RuntimeError("balasan wrangler d1 tak dikenal")
    return d[0].get("results") or []


def bangun(gugus, buang, status_d1, atribusi, dibuat, hari_ini):
    n = len(gugus)
    terbaca = not str(status_d1).startswith("belum terbaca")
    aktif = [g for g in gugus if g["status"] != "pulih"]
    umur = sorted(g["umur_putus"] for g in aktif)
    median = umur[len(umur) // 2] if umur else None
    tdk = sum(g["kelas_pemilik"] == "tidak_diketahui" for g in gugus)
    aset = sum(g["aset_desa"] is True for g in gugus)
    teratas = sorted(aktif, key=lambda g: (-g["umur_putus"], g["id"]))[:MAKS_BARIS]
    NAMA_KELAS = {"nasional": "Nasional", "provinsi": "Provinsi", "kab_desa": "Kabupaten atau desa", "tidak_diketahui": "Tidak diketahui"}
    k1 = rapor.kartu(
        id="rri1-akses", sistem="RRI-1", pil="Akses putus", ikon="peta", judul="Daftar akses putus",
        angka=[{"k": "titik", "label": "Titik akses putus (sesudah penyatuan)", "nilai": n if n else None, "title": f"{GUGUS_M} m dan desa sama disatukan; baris tanpa koordinat atau tanggal dibuang: {buang}"},
               {"k": "aktif", "label": "Belum dicatat pulih", "nilai": len(aktif) if n and terbaca else None,
                "title": "status terbaru bukan pulih; bawaan putus bila staf belum mencatat" if terbaca else "catatan status dari staf belum terbaca, jadi jumlah yang sudah pulih belum diketahui"},
               {"k": "median", "label": "Umur putus tengah sejak laporan terakhir layer, hari", "nilai": median,
                "title": "median hari sejak tanggal putus paling awal di gugus" + ("" if terbaca else "; status pulih belum diketahui")},
               {"k": "aset", "label": "Bertanda aset desa", "nilai": aset if n and tdk < n else None, "title": "hanya untuk titik yang kelas ruasnya diketahui dari OpenStreetMap"},
               {"k": "kelas_tdk", "label": "Kelas pemilik tidak diketahui", "nilai": tdk if n else None, "title": f"tanpa ruas OpenStreetMap dalam {OSM_M} m atau ruas tanpa keterangan kelas jalan"}],
        kolom=[{"k": "lokasi", "label": "Lokasi"}, {"k": "kab", "label": "Kab/kota"}, {"k": "umur", "label": "Umur putus, hari", "angka": True},
               {"k": "kelas", "label": "Kelas pemilik", "title": "estimasi dari ruas OpenStreetMap terdekat paling jauh 50 m"}, {"k": "catatan", "label": "Catatan"}],
        baris=[{"lokasi": g["lokasi"] or f"Desa {g['desa']}", "kab": g["kab"], "umur": g["umur_putus"], "kelas": NAMA_KELAS[g["kelas_pemilik"]],
                "catatan": TANDA_ASET if g["aset_desa"] else ("status dari staf: " + g["status"] if g["status_sumber"] == "staf" else None)} for g in teratas],
        rumus="titik dalam 200 m dan desa sama disatukan; umur putus = hari ini dikurangi tanggal putus paling awal; kelas pemilik dari ruas OpenStreetMap terdekat paling jauh 50 m",
        sumber=["gis_bnpb_akses_putus", "osm_nasional", "akses_status"], label=["resmi", "hitungan_kita", "proksi"],
        asumsi=["Asumsi: jarak 200 m dan 50 m", "Asumsi: status bawaan putus"], tautan=[], unduh="akses_putus.csv")
    b = rapor.berkas([k1], atribusi)
    b["titik"] = [{"id": g["id"], "lokasi": g["lokasi"], "desa": g["desa"], "kecamatan": g["kecamatan"], "kab": g["kab"], "prov": g["prov"], "lat": g["lat"], "lon": g["lon"],
                   "tgl_putus": g["tgl_putus"], "umur_putus": g["umur_putus"], "sebab": g["sebab"], "kerusakan": g["kerusakan"], "sumber_asal": g["sumber_asal"],
                   "kelas_pemilik": g["kelas_pemilik"], "kelas_label": "estimasi", "aset_desa": g["aset_desa"], "status": g["status"], "status_sumber": g["status_sumber"],
                   "status_tgl": g["status_tgl"]} for g in sorted(gugus, key=lambda g: (-g["umur_putus"], g["id"]))]
    b["data"] = {"hari": hari_ini.isoformat(), "dibuat": dibuat, "baris_dibuang": buang, "status_d1": status_d1, "ditampilkan_di_kartu": len(teratas), "tanda_aset": TANDA_ASET}
    return b


def _muat(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def muat_osm():
    out = {}
    for n in sorted(os.listdir(OSM_DIR)):
        if re.fullmatch(r"\d{2}\.json", n):
            out[n[:2]] = _muat(os.path.join(OSM_DIR, n)).get("jembatan") or []
    return out


def jalan(sekarang=None, layer=None, jalankan=None):
    import panen
    sek = sekarang or datetime.now(timezone.utc)
    hari = wil1.hari_wib(sek)
    if layer is None:
        layer, atr = panen.ambil_json(url_layer(), "arcgis_putus_akses", umur_jam=20, nama="Layanan GIS BNPB, Data Jalan Jembatan Putus Akses PU",
                                      lisensi="lisensi tidak tertulis; layar staf saja (U4)")
    else:
        atr = {"nama": "Layanan GIS BNPB, Data Jalan Jembatan Putus Akses PU", "url": BASE, "diambil": hari.isoformat(), "lisensi": "lisensi tidak tertulis; layar staf saja (U4)"}
    titik, buang = urai_layer(layer)
    gugus = satukan(titik)
    dit = wil1._json(wil1.BERKAS["dit"])
    kode_prov = {wil1.kunci_nama(p): k for k, p in wil1.nama_prov(dit).items()}
    beri_kelas(gugus, muat_osm(), kode_prov)
    try:
        import terima
        catatan = baca_status(jalankan or terima._wrangler)
        status_d1 = f"terbaca {len(catatan)} catatan"
    except Exception as e:  # noqa: BLE001 - tabel belum ada atau D1 tak terjangkau: status bawaan, keadaannya tercatat
        catatan, status_d1 = [], "belum terbaca: " + " ".join(f"{type(e).__name__}: {e}".split())[:120]
    terapkan_status(gugus, catatan, hari)
    atr_osm = {"nama": "OpenStreetMap kontributor (osm_nasional)", "url": "repo:public/data/osm_nasional", "diambil": hari.isoformat(), "lisensi": "ODbL 1.0"}
    return {"akses_putus": bangun(gugus, buang, status_d1, [atr, atr_osm], sek.strftime("%Y-%m-%dT%H:%M:%SZ"), hari)}


def _layer(fitur):
    return {"features": [{"attributes": a} for a in fitur]}


def cek():
    import panen
    # kueri: daftar putih, tanpa geometri, diizinkan panen; kueri bergeometri atau outFields=* ditolak
    u = url_layer()
    assert "returnGeometry=false" in u and "*" not in urllib.parse.unquote(u) and "survey123" not in u.lower()
    panen.diizinkan(u)
    for jahat in (u.replace("returnGeometry=false", "returnGeometry=true"), re.sub(r"outFields=[^&]*", "outFields=*", u)):
        try:
            panen.diizinkan(jahat)
            raise AssertionError("kueri ArcGIS bergeometri atau outFields=* lolos")
        except panen.Dilarang:
            pass
    ms = lambda d: int(datetime(*d, tzinfo=timezone.utc).timestamp() * 1000)  # noqa: E731
    A = lambda uid, lat, lon, desa="Desa A", kab="Kab. Uji", dt=(2025, 11, 25, 17), sumber="Kompilasi", nama="Jembatan Satu": dict(  # noqa: E731
        uid=uid, desa=desa, kecamatan="Kec X", kabupaten=kab, provinsi="Aceh", dt=ms(dt), name=nama, lat=lat, lon=lon, cause="Banjir", damage="Putus total", sumber=sumber)
    # penyatuan: A1-A2 150 m (satu gugus); A3 dari A2 150 m juga (berantai, satu gugus); A4 250 m dari A3 (gugus lain); A5 dekat A1 tetapi desa lain; A6 dekat tetapi kabupaten lain
    dlat = 0.00135   # sekitar 150 m
    fit = [A("u1", 4.0, 96.0), A("u2", 4.0 + dlat, 96.0, sumber="SITABA", dt=(2025, 11, 24, 3)), A("u3", 4.0 + 2 * dlat, 96.0, sumber="Pusdalops"),
           A("u4", 4.0 + 2 * dlat + 0.00225, 96.0), A("u5", 4.0, 96.0, desa="Desa B"), A("u6", 4.0, 96.0, kab="Kab. Lain")]
    t, buang = urai_layer(_layer(fit + [{"uid": "x", "lat": 4.0, "lon": 96.0, "dt": None}, {"uid": None, "lat": 4.0, "lon": 96.0, "dt": 1}, {"uid": "y", "lat": 40.0, "lon": 96.0, "dt": 1}]))
    assert len(t) == 6 and buang == 3, (len(t), buang)
    assert abs(jarak_m((4.0, 96.0), (4.0 + dlat, 96.0)) - 150) < 2
    g = satukan(t)
    assert len(g) == 4, [x["anggota"] for x in g]
    besar = max(g, key=lambda x: x["anggota"])
    assert besar["anggota"] == 3 and besar["sumber_asal"] == ["Kompilasi", "Pusdalops", "SITABA"], besar
    # tanggal putus paling awal (u2: 24 Nov 2025 03.00 UTC = 10.00 WIB); u1 25 Nov 17.00 UTC = 26 Nov 00.00 WIB
    assert besar["tgl_putus"] == "2025-11-24", besar["tgl_putus"]
    # id stabil: tidak bergantung urutan masukan dan sama dengan sha1(sumber|uid) terkecil
    ids = {id_titik("Kompilasi", "u1"), id_titik("SITABA", "u2"), id_titik("Pusdalops", "u3")}
    assert besar["id"] == min(ids) and RE_ID.fullmatch(besar["id"])
    assert [x["id"] for x in satukan(list(reversed(t)))] == [x["id"] for x in g], "id bergantung urutan masukan"
    assert bersih('<p>Jalan <span style="x">amblas</span> &amp; putus</p>') == "Jalan amblas & putus" and bersih("<p></p>") is None and bersih(None) is None
    assert bersih("Hubungi Pak X 0812-3456-7890 atau +62 812 3456 7890, jembatan putus") == "Hubungi Pak X atau , jembatan putus", bersih("Hubungi Pak X 0812-3456-7890 atau +62 812 3456 7890, jembatan putus")
    assert bersih("Jembatan &lt;b&gt;putus&lt;/b&gt; &lt;script&gt;x&lt;/script&gt;") == "Jembatan putus x", bersih("Jembatan &lt;b&gt;putus&lt;/b&gt; &lt;script&gt;x&lt;/script&gt;")
    assert bersih("Km 12 sepanjang 70 m, tahun 2025") == "Km 12 sepanjang 70 m, tahun 2025", "angka biasa tidak boleh terbuang"
    # kelas pemilik dari OSM paling jauh 50 m, label estimasi; tanpa tag highway = tidak diketahui
    assert kelas_ruas([4.0, 96.0, "x", "primary", ""]) == ("nasional", False) and kelas_ruas([4.0, 96.0, "x", "secondary", "12.1"]) == ("provinsi", True)
    assert kelas_ruas([4.0, 96.0, "x", "residential", ""]) == ("kab_desa", False) and kelas_ruas([4.0, 96.0, "x", "tertiary", "7"]) == (None, None), "ref angka pada tertiary bukan bukti jalan nasional"
    assert kelas_ruas([4.0, 96.0, "x", "residential", "Kab-12"]) == (None, None) and kelas_ruas([4.0, 96.0, "x", "trunk", "1"]) == ("nasional", True)
    assert kelas_ruas([4.0, 96.0, "x"]) == (None, None) and kelas_ruas([4.0, 96.0, "x", None]) == (None, None)
    dekat = 0.00036   # sekitar 40 m
    u4 = 4.0 + 2 * dlat + 0.00225
    osm = {"11": [[u4 + dekat, 96.0, "Jl A", "primary", "1"], [4.0, 96.0 + 0.0007, "Jl C", "residential", ""], [4.0, 96.0, "Jl B", "residential", ""]]}   # Jl C sekitar 78 m dari semua titik
    kp = {wil1.kunci_nama("Aceh"): "11"}
    g2 = beri_kelas(satukan(t), osm, kp)
    per = {x["anggota"]: x for x in g2 if x["anggota"] == 3}
    assert per[3]["kelas_pemilik"] == "tidak_diketahui" and per[3]["aset_desa"] is None, "gugus tiga titik berpusat 150 m dari ruas mana pun"
    kelas = sorted(x["kelas_pemilik"] for x in g2)
    assert kelas == ["kab_desa", "kab_desa", "nasional", "tidak_diketahui"], kelas
    assert [x["aset_desa"] for x in g2 if x["kelas_pemilik"] == "kab_desa"] == [True, True]
    assert [x["aset_desa"] for x in g2 if x["kelas_pemilik"] == "nasional"] == [None]
    k_desa = beri_kelas([dict(g[0], lat=4.0, lon=96.0)], {"11": [[4.0, 96.0, "Jl D", "residential", ""]]}, kp)[0]
    assert k_desa["kelas_pemilik"] == "kab_desa" and k_desa["aset_desa"] is True
    k_ref = beri_kelas([dict(g[0], lat=4.0, lon=96.0)], {"11": [[4.0, 96.0, "Jl D", "residential", "Kab-12"]]}, kp)[0]
    assert k_ref["kelas_pemilik"] == "tidak_diketahui" and k_ref["aset_desa"] is None, "ruas bernomor di kelas tertiary ke bawah tidak ditandai aset desa"
    # status: terakhir menang, bawaan putus, catatan rusak ditolak
    hari = date(2025, 12, 4)
    st = terapkan_status(g2, [{"titik_id": besar["id"], "tgl": "2025-12-01", "status": "darurat"}, {"titik_id": besar["id"], "tgl": "2025-12-03", "status": "pulih"}], hari)
    s = {x["id"]: x for x in st}[besar["id"]]
    assert s["status"] == "pulih" and s["status_sumber"] == "staf" and s["umur_putus"] == 10, s
    assert all(x["status"] == "putus" and x["status_sumber"] == "bawaan" for x in st if x["id"] != besar["id"])
    for salah in ({"titik_id": "xyz", "tgl": "2025-12-01", "status": "putus"}, {"titik_id": besar["id"], "tgl": "2025-12-01", "status": "rusak"}):
        try:
            terapkan_status(g2, [salah], hari)
            raise AssertionError("catatan status salah tidak ditolak")
        except ValueError:
            pass
    # layer terpotong ditolak; bukan daftar fitur ditolak
    for salah in ({"features": [], "exceededTransferLimit": True}, {"error": {"code": 400}}, None):
        try:
            urai_layer(salah)
            raise AssertionError("layer rusak tidak ditolak")
        except ValueError:
            pass
    # berkas penuh: kontrak Worker (titik[].id), kartu lolos skema, bukan 0 untuk yang tak diketahui
    bt = bangun(st, buang, "belum terbaca: uji", [{"nama": "uji", "url": "https://gis.bnpb.go.id/x", "diambil": "2026-11-26", "lisensi": "uji"}], "2026-11-26T00:00:00Z", hari)
    assert bt["kartu"][0]["angka"][1]["nilai"] is None and "belum diketahui" in bt["kartu"][0]["angka"][1]["title"] and "sejak laporan terakhir layer" in bt["kartu"][0]["angka"][2]["label"], "status tak terbaca: jumlah aktif tidak boleh tampil"
    b = bangun(st, buang, "terbaca 2 catatan", [{"nama": "uji", "url": "https://gis.bnpb.go.id/x", "diambil": "2026-11-26", "lisensi": "uji"}], "2026-11-26T00:00:00Z", hari)
    assert len(b["titik"]) == 4 and all(RE_ID.fullmatch(x["id"]) for x in b["titik"]) and b["titik"][0]["umur_putus"] >= b["titik"][-1]["umur_putus"]
    assert b["kartu"][0]["angka"][1]["nilai"] == 3, "titik pulih tidak boleh dihitung aktif"
    assert "kelas_label" in b["titik"][0] and b["titik"][0]["kelas_label"] == "estimasi"
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    # tanpa titik: kosong, bukan nol
    b0 = bangun([], 0, "x", [{"nama": "uji", "url": "https://gis.bnpb.go.id/x", "diambil": "2026-11-26", "lisensi": "uji"}], "2026-11-26T00:00:00Z", hari)
    assert b0["kartu"][0]["angka"][0]["nilai"] is None and b0["titik"] == []
    # fixture layer (bentuk balasan ArcGIS tanpa data nyata): jalan penuh tanpa jaringan dan tanpa D1
    fx = _muat(FIXTURE)
    hasil = jalan(datetime(2026, 11, 26, 3, 0, tzinfo=timezone.utc), layer=fx, jalankan=lambda sql: json.dumps([{"success": True, "results": []}]))["akses_putus"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T03:00:00Z", "basi_jam": 48, **hasil})
    assert hasil["data"]["status_d1"] == "terbaca 0 catatan" and hasil["titik"]
    gagal = jalan(datetime(2026, 11, 26, 3, 0, tzinfo=timezone.utc), layer=fx, jalankan=lambda sql: (_ for _ in ()).throw(RuntimeError("no such table: akses_status")))["akses_putus"]
    assert gagal["data"]["status_d1"].startswith("belum terbaca") and all(x["status_sumber"] == "bawaan" for x in gagal["titik"])
    teks = json.dumps(hasil, ensure_ascii=False)
    assert "·" not in teks and not re.search(r"\baman\b", teks, re.I)
    print(f"rri1.py --cek: lulus (fixture {len(fx['features'])} fitur -> {len(hasil['titik'])} titik; OSM belum menyimpan kelas jalan: "
          f"{sum(x['kelas_pemilik'] == 'tidak_diketahui' for x in hasil['titik'])} tidak diketahui)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
