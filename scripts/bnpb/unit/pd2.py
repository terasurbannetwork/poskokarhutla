"""PD-2 Cakupan layanan peringatan dini lawan penduduk terpapar tinggi (DESAIN-TEKNIS sec 6.7; ALGORITMA sec 10.9, sec 5.5; tiket RU-090).

Langkah jalan.py (bulanan). Satu desa terlayani bila jarak pusat desa ke sirine OSM terdekat <= radius (kunci Jam Aturan ews_radius_sirine_km, 2 km, ASUMSI
tanpa pasal). Cakupan per bahaya per kab = penduduk desa terpapar tinggi yang terlayani / penduduk desa terpapar tinggi (desa tinggi: indeks bahaya di titik pusat
desa > ambang tinggi terpapar.json, sama dengan terpapar.py). Pembilang dan penyebut himpunan desa yang sama; desa tanpa penduduk atau tanpa indeks bahaya itu
dikeluarkan dari keduanya dan jumlahnya ditulis. Penyebut 0 = None (bukan 0). Label wajib: "batas bawah dari OSM" (sirine yang tidak ada di OSM tidak terhitung,
dan sirine provinsi sebelah tidak dihitung untuk desa di perbatasan). Pembanding resmi: isu strategis Renstra, 6 persen penduduk terpapar baru terlayani (Perban 5/2025);
selisih ditulis. Prioritas paket = skor MB-4 (skor.py) atas penduduk terpapar tinggi tak terlayani, kejadian DIBI 5 tahun, celah kapasitas IKD; HIPOTESIS sampai uji balik.

MASUKAN yang belum ada 26 Nov 2026, dan keadaannya ditulis di kartu (bukan angka nol):
  data/raw/unit/desa_terpapar.json   per desa {kode, kab (Kemendagri 4 digit), penduduk, lat, lon, indeks: {bahaya: 0..1 atau null}}; ditulis terpapar.py
                                     bila kelak dipasang (cache Dukcapil per desa tidak ada di mesin ini). Tanpa berkas: kartu "belum ada data".
  public/data/osm_nasional/<prov>.json kunci `sirine` [[lat, lon, nama], ...] dari tag emergency=siren (RU-089, scripts/scrape/tarik_osm.py). Tanpa kunci itu di
                                     satu provinsi pun: "belum dipanen"; kunci ada dan kosong = nol sirine tercatat di OSM (batas bawah).
Daftar penerima paket sirine direktorat (pertanyaan pemilik U10) tidak dipakai; bawaan: tidak tersedia.

  python3 -I scripts/bnpb/unit/pd2.py --cek
"""
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import mt2  # noqa: E402
import rapor  # noqa: E402
import skor  # noqa: E402

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA = os.path.join(AKAR, "public", "data", "bnpb")
OSM = os.path.join(AKAR, "public", "data", "osm_nasional")
DESA = os.path.join(AKAR, "data", "raw", "unit", "desa_terpapar.json")
RENSTRA_PERSEN = 6   # Perban 5/2025 isu strategis (riset/2-pencegahan.md baris 29): keterpenuhan peringatan dini baru 6 persen penduduk terpapar
LABEL_WAJIB = "batas bawah dari OSM"
STATUS_UJI = "belum diuji balik (ALGORITMA 5.7); hipotesis"
BOBOT = {"tak_terlayani": 1, "kejadian": 1, "celah_kapasitas": 1}  # Asumsi: bobot sementara (ALGORITMA 5.5)
KAB = re.compile(r"^\d{4}$")


def jarak_km(a, b, c, d):
    """Haversine antara (lat a, lon b) dan (lat c, lon d), km."""
    p = math.pi / 180
    x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def _baca(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def muat_desa(p=DESA):
    """Berkas per desa atau None bila belum ada. Berkas ada tapi bentuknya salah = galat (bukan diam-diam kosong)."""
    if not os.path.exists(p):
        return None
    d = _baca(p)
    if not isinstance(d, dict) or not isinstance(d.get("desa"), list):
        raise ValueError("desa_terpapar.json harus {desa: [...]}")
    for i, x in enumerate(d["desa"]):
        if not isinstance(x, dict) or not KAB.match(str(x.get("kab", ""))) or not isinstance(x.get("indeks"), dict):
            raise ValueError(f"desa[{i}] harus punya kab 4 digit dan indeks {{bahaya: nilai}}: {x!r}")
    return d


def muat_sirine(folder=OSM):
    """Daftar titik sirine (lat, lon) dari semua provinsi, atau None bila tak satu pun berkas provinsi memuat kunci `sirine` (belum dipanen)."""
    ada, titik = False, []
    for n in sorted(os.listdir(folder)):
        if not re.fullmatch(r"\d{2}\.json", n):
            continue
        d = _baca(os.path.join(folder, n))
        if "sirine" in d:
            ada = True
            titik += [(float(t[0]), float(t[1])) for t in d["sirine"]]
    return titik if ada else None


def terlayani(lat, lon, sirine, radius):
    return any(abs(s[0] - lat) <= radius / 111.0 + 1e-9 and jarak_km(lat, lon, s[0], s[1]) <= radius for s in sirine)


def hitung(desa, sirine, radius, ambang):
    """-> {kab: {bahaya: {tinggi, penduduk, terlayani_penduduk, cakupan|None, tanpa_data}}}. sirine None = belum dipanen: cakupan tidak dihitung (None)."""
    out = {}
    for x in desa:
        for b, v in x["indeks"].items():
            e = out.setdefault(x["kab"], {}).setdefault(b, {"tinggi": 0, "penduduk": 0, "terlayani_penduduk": 0, "tanpa_data": 0})
            pend = x.get("penduduk")
            if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) or not isinstance(pend, (int, float)) or isinstance(pend, bool) or pend < 0:
                e["tanpa_data"] += 1   # indeks atau penduduk kosong: keluar dari pembilang dan penyebut
                continue
            if v <= ambang:
                continue
            lat, lon = x.get("lat"), x.get("lon")
            if sirine is not None and not (isinstance(lat, (int, float)) and isinstance(lon, (int, float))):
                e["tanpa_data"] += 1
                continue
            e["tinggi"] += 1
            e["penduduk"] += pend
            if sirine is not None and terlayani(lat, lon, sirine, radius):
                e["terlayani_penduduk"] += pend
    for kab in out.values():
        for e in kab.values():
            e["cakupan"] = None if sirine is None or e["penduduk"] == 0 else e["terlayani_penduduk"] / e["penduduk"]
    return out


def per_bahaya(hasil):
    """Jumlah nasional per bahaya: {bahaya: {penduduk, terlayani_penduduk, cakupan|None, tinggi, kab}}; cakupan None bila penyebut 0 atau sirine belum dipanen."""
    tot = {}
    for kab in hasil.values():
        for b, e in kab.items():
            t = tot.setdefault(b, {"penduduk": 0, "terlayani_penduduk": 0, "tinggi": 0, "kab": 0, "dihitung": False})
            t["penduduk"] += e["penduduk"]; t["terlayani_penduduk"] += e["terlayani_penduduk"]; t["tinggi"] += e["tinggi"]
            t["kab"] += 1 if e["tinggi"] else 0
            t["dihitung"] = t["dihitung"] or e["cakupan"] is not None
    for t in tot.values():
        t["cakupan"] = t["terlayani_penduduk"] / t["penduduk"] if t["dihitung"] and t["penduduk"] else None
        del t["dihitung"]
    return tot


def unik(desa, sirine, radius, ambang):
    """Penduduk unik: desa terpapar tinggi di bahaya MANA PUN dihitung SATU kali (jumlah antarbahaya menghitung ganda desa yang tinggi di dua bahaya).
    -> {desa, penduduk, terlayani_penduduk}; sirine None = belum dipanen (terlayani None). Desa tanpa penduduk atau koordinat (bila sirine ada) keluar."""
    n = pend = lay = 0
    for x in desa:
        p, lat, lon = x.get("penduduk"), x.get("lat"), x.get("lon")
        if not isinstance(p, (int, float)) or isinstance(p, bool) or p < 0:
            continue
        if not any(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v > ambang for v in x["indeks"].values()):
            continue
        if sirine is not None and not (isinstance(lat, (int, float)) and isinstance(lon, (int, float))):
            continue
        n += 1; pend += p
        lay += p if sirine is not None and terlayani(lat, lon, sirine, radius) else 0
    return {"desa": n, "penduduk": pend, "terlayani_penduduk": None if sirine is None else lay}


def prioritas(hasil, terpapar_kab, ikd_kab, dibi, tahun_akhir):
    """Skor MB-4 per kab atas penduduk terpapar tinggi tak terlayani (maks antar bahaya), kejadian, celah kapasitas. Kab tanpa penduduk tinggi tak masuk."""
    tak = {}
    for k, bs in hasil.items():
        v = [e["penduduk"] - e["terlayani_penduduk"] for e in bs.values() if e["cakupan"] is not None]
        if v and max(v) > 0:
            tak[k] = max(v)
    nilai, _ = mt2.komponen(terpapar_kab, ikd_kab, dibi, tahun_akhir)
    komp = {"tak_terlayani": {"tipe": "persentil", "nilai": tak, "arah": 1},
            "kejadian": {"tipe": "persentil", "nilai": {k: nilai["kejadian"].get(k) for k in tak}, "arah": 1},
            "celah_kapasitas": {"tipe": "persentil", "nilai": {k: nilai["celah_kapasitas"].get(k) for k in tak}, "arah": 1}}
    s = skor.skor(komp, BOBOT)
    return [{"kab": k, "skor": s[k]["skor"], "tak_terlayani": tak[k], "hilang": s[k]["hilang"]} for k in skor.urut(s)], tak


def _kartu_masukan(desa_ada, sirine_ada, n_desa):
    baris = [{"masukan": "Penduduk dan indeks bahaya per desa", "keadaan": f"{n_desa:,} desa terbaca".replace(",", ".") if desa_ada else
              "belum ada data: data per desa belum tersedia"},
             {"masukan": "Titik sirine di OpenStreetMap (OSM)", "keadaan": "terbaca" if sirine_ada else "belum dipanen: titik sirine belum ada di data OSM kita"},
             {"masukan": "Daftar penerima paket sirine direktorat", "keadaan": "belum ada data: daftar penerima paket sirine dari direktorat belum tersedia"}]
    return rapor.kartu(id="pd2-masukan", sistem="PD-2", pil="Peringatan dini", ikon="data", judul="Keadaan masukan cakupan",
                       angka=[], kolom=[{"k": "masukan", "label": "Masukan"}, {"k": "keadaan", "label": "Keadaan"}], baris=baris, rumus=None,
                       sumber=["OpenStreetMap (OSM)", "Keterpaparan penduduk"], label=["sekunder"])


def bangun(desa_doc, sirine, terpapar, ikd, dibi, tahun_akhir, hari):
    radius = jam.nilai("ews_radius_sirine_km")
    ambang = terpapar["ambang"]["tinggi"]
    desa = desa_doc["desa"] if desa_doc else []
    hasil = hitung(desa, sirine, radius, ambang) if desa_doc else {}
    tot = per_bahaya(hasil)
    hitungan = bool(desa_doc) and sirine is not None
    kartu = [_kartu_masukan(bool(desa_doc), sirine is not None, len(desa))]
    nasional, un_data = None, None
    if hitungan:
        un = un_data = unik(desa, sirine, radius, ambang)
        nasional = un["terlayani_penduduk"] / un["penduduk"] * 100 if un["penduduk"] else None
    angka = [{"k": "cakupan", "label": "Penduduk unik terpapar tinggi yang terlayani sirine OSM, persen", "nilai": nasional, "desimal": 1,
              "title": "penduduk unik: desa yang tinggi di bahaya mana pun dihitung satu kali, tidak dijumlah antarbahaya; terlayani / terpapar tinggi; " + LABEL_WAJIB + "; kosong = belum bisa dihitung"},
             {"k": "renstra", "label": "Pembanding Renstra, persen", "nilai": RENSTRA_PERSEN, "title": "isu strategis Renstra 2025-2029 (Perban 5/2025): keterpenuhan peringatan dini baru 6 persen penduduk terpapar"},
             {"k": "selisih", "label": "Selisih kita lawan Renstra, poin persen", "nilai": None if nasional is None else nasional - RENSTRA_PERSEN, "desimal": 1,
              "title": "angka kita (sirine OSM saja) dan angka Renstra beda definisi dan beda sumber; keduanya ditulis, tidak dirata-rata"}]
    kolom = [{"k": "bahaya", "label": "Bahaya"}, {"k": "tinggi", "label": "Desa terpapar tinggi", "angka": True}, {"k": "terpapar", "label": "Penduduk terpapar tinggi", "angka": True},
             {"k": "terlayani", "label": "Penduduk terlayani", "angka": True}, {"k": "cakupan", "label": "Cakupan, persen", "angka": True, "desimal": 1, "title": LABEL_WAJIB + "; kosong = belum bisa dihitung"}]
    baris = [{"bahaya": b, "tinggi": t["tinggi"], "terpapar": t["penduduk"], "terlayani": t["terlayani_penduduk"] if hitungan else None,
              "cakupan": None if t["cakupan"] is None else t["cakupan"] * 100} for b, t in sorted(tot.items())]
    kartu.append(rapor.kartu(id="pd2-cakupan", sistem="PD-2", pil="Cakupan sirine", ikon="peta", judul="Cakupan sirine per bahaya", angka=angka, kolom=kolom if baris else [], baris=baris,
                             rumus="cakupan = penduduk desa terpapar tinggi dalam radius sirine / penduduk desa terpapar tinggi; desa tinggi: indeks > ambang tinggi terpapar.json",
                             sumber=["Keterpaparan penduduk", "OpenStreetMap (OSM)"], label=["proksi", "hitungan_kita"], aturan=["ews_radius_sirine_km"], asumsi=[]))
    pri = []
    if hitungan:
        pri, _ = prioritas(hasil, terpapar["kab"], ikd["kab"], dibi, tahun_akhir)
        ada = [p for p in pri if p["skor"] is not None][:25]
        kartu.append(rapor.kartu(id="pd2-prioritas", sistem="PD-2", pil="Cakupan sirine", ikon="peta", judul="Urutan skor lokasi paket",
                                 angka=[{"k": "kab", "label": "Kab/kota dengan penduduk terpapar tinggi tak terlayani", "nilai": len(pri)}],
                                 kolom=[{"k": "no", "label": "No", "angka": True}, {"k": "kab", "label": "Kode kab/kota"}, {"k": "skor", "label": "Skor MB-4", "angka": True, "desimal": 2, "title": STATUS_UJI},
                                        {"k": "tak", "label": "Penduduk terpapar tinggi tak terlayani", "angka": True}],
                                 baris=[{"no": i + 1, "kab": p["kab"], "skor": p["skor"], "tak": p["tak_terlayani"]} for i, p in enumerate(ada)],
                                 rumus="S = prod q_j^(w_j / W) atas persentil penduduk terpapar tinggi tak terlayani, kejadian DIBI 5 tahun, celah kapasitas IKD; " + LABEL_WAJIB,
                                 sumber=["Keterpaparan penduduk", "Indeks ketahanan daerah", "DIBI per kab/kota dan tahun", "OpenStreetMap (OSM)"], label=["proksi", "hitungan_kita"], asumsi=["Asumsi: belum lulus uji balik", "Asumsi: bobot sementara"]))
    sumber = [{"nama": "terpapar.json", "url": "repo:public/data/bnpb/terpapar.json", "diambil": terpapar["dibuat"][:10], "lisensi": str(terpapar.get("lisensi", "tidak tertulis"))[:200]},
              {"nama": "OpenStreetMap (osm_nasional)", "url": "repo:public/data/osm_nasional/", "diambil": hari, "lisensi": "ODbL, OpenStreetMap contributors"}]
    b = rapor.berkas(kartu, sumber)
    b["data"] = {"radius_km": radius, "radius_asumsi": True, "ambang_tinggi": ambang, "label_wajib": LABEL_WAJIB, "hipotesis": True, "renstra_persen": RENSTRA_PERSEN,
                 "unik": un_data, "desa_ada": bool(desa_doc), "sirine_ada": sirine is not None, "kab": hasil if hitungan else {}, "prioritas": pri[:100]}
    return b


def jalan():
    from datetime import datetime, timedelta, timezone
    t, i, d = (_baca(os.path.join(DATA, n + ".json")) for n in ("terpapar", "ikd", "dibi_kab_tahun"))
    hari = (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()
    return {"cakupan_ews": bangun(muat_desa(), muat_sirine(), t, i, d["baris"], mt2.tahun_akhir_data(d["baris"]), hari)}


def _tolak(f, *a):
    try:
        f(*a)
    except ValueError:
        return
    raise AssertionError(f"masukan salah tidak ditolak: {a!r}")


def cek():
    assert abs(jarak_km(0, 0, 0, 1) - 111.19) < 0.1 and jarak_km(-6.2, 106.8, -6.2, 106.8) == 0
    sir = [(-6.0, 106.0)]
    assert terlayani(-6.0, 106.01, sir, 2) and not terlayani(-6.0, 106.03, sir, 2) and not terlayani(-5.9, 106.0, sir, 2)   # 1,1 km masuk, 3,3 km dan 11 km tidak
    mk = lambda kode, kab, pend, lat, lon, **ind: {"kode": kode, "kab": kab, "penduduk": pend, "lat": lat, "lon": lon, "indeks": ind}  # noqa: E731
    desa = [mk("a", "0001", 100, -6.0, 106.005, banjir=0.9, gempa=0.1), mk("b", "0001", 200, -6.0, 106.2, banjir=0.8, gempa=0.7),
            mk("c", "0001", 50, -6.0, 106.0, banjir=0.2), mk("d", "0001", None, -6.0, 106.0, banjir=0.9), mk("e", "0002", 70, -6.0, 106.0, banjir=None),
            mk("f", "0003", 40, -1.0, 100.0, banjir=0.9), mk("g", "0004", 40, -1.0, 100.0, banjir=0.6)]
    h = hitung(desa, sir, 2, 0.66)
    b = h["0001"]["banjir"]
    assert (b["tinggi"], b["penduduk"], b["terlayani_penduduk"], b["tanpa_data"]) == (2, 300, 100, 1), b   # d tanpa penduduk keluar dari pembilang dan penyebut
    assert abs(b["cakupan"] - 100 / 300) < 1e-12
    assert h["0001"]["gempa"]["tinggi"] == 1 and h["0001"]["gempa"]["terlayani_penduduk"] == 0 and h["0001"]["gempa"]["cakupan"] == 0.0, "nol terhitung beda dari kosong"
    assert h["0002"]["banjir"]["cakupan"] is None and h["0002"]["banjir"]["tanpa_data"] == 1, "indeks kosong: penyebut 0 = None, bukan 0"
    assert h["0004"]["banjir"]["tinggi"] == 0 and h["0004"]["banjir"]["cakupan"] is None, "tak ada desa tinggi: penyebut 0 = None"
    tn = per_bahaya(h)
    assert tn["banjir"]["penduduk"] == 340 and abs(tn["banjir"]["cakupan"] - 100 / 340) < 1e-12 and tn["banjir"]["kab"] == 2
    # sirine belum dipanen: tidak ada angka cakupan sama sekali (bukan 0)
    h0 = hitung(desa, None, 2, 0.66)
    assert all(e["cakupan"] is None and e["terlayani_penduduk"] == 0 for kb in h0.values() for e in kb.values()) and per_bahaya(h0)["banjir"]["cakupan"] is None
    # sirine ada tapi kosong: cakupan 0 yang sah
    assert hitung(desa, [], 2, 0.66)["0001"]["banjir"]["cakupan"] == 0.0
    # berkas desa rusak ditolak, tidak jadi kosong
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "d.json")
        for isi in ('{"desa": 5}', '{"desa": [{"kab": "12", "indeks": {}}]}', '{"desa": [{"kab": "0001"}]}'):
            open(p, "w").write(isi)
            _tolak(muat_desa, p)
        assert muat_desa(os.path.join(tmp, "tak_ada.json")) is None
        os.mkdir(os.path.join(tmp, "osm"))
        open(os.path.join(tmp, "osm", "11.json"), "w").write('{"rs": []}')
        assert muat_sirine(os.path.join(tmp, "osm")) is None, "tag belum dipanen"
        open(os.path.join(tmp, "osm", "12.json"), "w").write('{"sirine": [[-6.0, 106.0, "x"]]}')
        assert muat_sirine(os.path.join(tmp, "osm")) == [(-6.0, 106.0)]
    # berkas dunia tiruan lolos skema rapor, kartu prioritas hanya bila sirine dan desa ada
    terpapar = {"dibuat": "2026-11-26T00:00", "ambang": {"sedang_plus": 0.33, "tinggi": 0.66}, "lisensi": "x",
                "kab": {k: {"n": 1000, "h": {"banjir": [100, 10, 50, 5]}} for k in ("0001", "0002", "0003", "0004")}}
    ikd = {"kab": {"0001": {"c": 0.2}, "0002": {"c": 0.5}, "0003": {"c": 0.9}, "0004": {"c": 0.5}}}
    dibi = [["0001", 2025, "banjir", 4], ["0002", 2025, "banjir", 1], ["0003", 2025, "banjir", 2]]
    b1 = bangun({"desa": desa}, sir, terpapar, ikd, dibi, 2025, "2026-11-26")
    assert [k["id"] for k in b1["kartu"]] == ["pd2-masukan", "pd2-cakupan", "pd2-prioritas"], [k["id"] for k in b1["kartu"]]
    ang = {a["k"]: a["nilai"] for a in b1["kartu"][1]["angka"]}
    assert abs(ang["cakupan"] - 100 / 340 * 100) < 1e-9, ang   # penduduk UNIK: a, b, f dihitung sekali (b tinggi di banjir dan gempa tidak berlipat); bukan 100 / 540
    assert b1["data"]["unik"] == {"desa": 3, "penduduk": 340, "terlayani_penduduk": 100}, b1["data"]["unik"]
    assert unik(desa, None, 2, 0.66) == {"desa": 3, "penduduk": 340, "terlayani_penduduk": None} and unik([], sir, 2, 0.66)["penduduk"] == 0
    assert ang["renstra"] == 6 and abs(ang["selisih"] - (ang["cakupan"] - 6)) < 1e-9
    assert b1["data"]["radius_km"] == 2 and b1["data"]["radius_asumsi"] is True and any(p["pasal"] if False else p["asumsi"] for p in b1["kartu"][1]["aturan"])
    assert [r["kab"] for r in b1["kartu"][2]["baris"]] == ["0001", "0003"], "0001: tak terlayani, kejadian, celah semuanya tertinggi"
    b2 = bangun(None, None, terpapar, ikd, dibi, 2025, "2026-11-26")
    assert [k["id"] for k in b2["kartu"]] == ["pd2-masukan", "pd2-cakupan"] and b2["data"]["kab"] == {} and b2["kartu"][1]["angka"][0]["nilai"] is None and b2["kartu"][1]["angka"][2]["nilai"] is None
    assert "belum ada data" in b2["kartu"][0]["baris"][0]["keadaan"] and "belum dipanen" in b2["kartu"][0]["baris"][1]["keadaan"]
    b3 = bangun({"desa": desa}, None, terpapar, ikd, dibi, 2025, "2026-11-26")
    assert b3["kartu"][1]["angka"][0]["nilai"] is None and len(b3["kartu"]) == 2, "sirine belum dipanen: tanpa cakupan dan tanpa prioritas"
    for x in (b1, b2, b3):
        rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **x})
    # radius dari Jam Aturan, berpil asumsi
    assert jam.aturan("ews_radius_sirine_km")["asumsi"] is True and jam.nilai("ews_radius_sirine_km") == 2
    # keluaran nyata hari ini: berkas sah, jujur soal masukan yang belum ada
    n = jalan()["cakupan_ews"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **n})
    s = json.dumps(n, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    print(f"pd2.py --cek: lulus (desa {'ada' if n['data']['desa_ada'] else 'belum ada'}, sirine {'ada' if n['data']['sirine_ada'] else 'belum dipanen'})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
