"""Status keadaan darurat bencana (SK kepala daerah) seluruh tahun yang terbit di CKAN data.bnpb.go.id
-> public/data/status_darurat.json

Paket dicari lewat package_search q="status keadaan darurat" (nama berpola
kompilasi-data-status-keadaan-darurat-bencana-seluruh-indonesia-tahun-YYYY), semua tahun, bukan id tetap (BNPB mengunggah ulang).
Resource 1 "Data Status Keadaan Darurat Bencana YYYY" = baris SK; resource 2 "Kabupaten yang Menetapkan..." = lat/lon per id_kab.
Skala provinsi: titik = pusat kotak public/geo/provinsi.json.

{"dibuat","sumber","tahun","catatan","ringkas","sk":[{nomor,prov_kode,prov,kab_kode|null,kab,skala,jenis,klasifikasi,status,mulai,berakhir|null,tautan,lat,lon,
  hari,batas_hari,lewat_batas,jeda_kejadian_hari}]}
Masa berlaku (Pedoman Penetapan Status Keadaan Darurat BNPB 2016 hal. 15): kab/kota 7-14 hari, provinsi 14 hari-1 bulan, nasional 1-3 bulan; lebih dari itu butuh SK perpanjangan.
status dinormalkan ke Siaga Darurat | Tanggap Darurat | Transisi Darurat ke Pemulihan.

Pakai:  python3 scripts/umum/status_darurat.py   |   ... uji   |   ... ulang (tanpa jaringan: hitung ulang kolom masa/jeda)
"""
import datetime as dt, importlib.util, json, os, re, statistics, sys, urllib.parse

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/status_darurat.json")
API = "https://data.bnpb.go.id/api/3/action/"
POLA_PAKET = re.compile(r"^kompilasi-data-status-keadaan-darurat-bencana.*-tahun-(\d{4})$")


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def status(s):
    """Teks bebas -> salah satu dari tiga status, atau None."""
    t = str(s or "").lower()
    return "Transisi Darurat ke Pemulihan" if "transisi" in t else "Tanggap Darurat" if "tanggap" in t \
        else "Siaga Darurat" if "siaga" in t else None


def tgl(s):
    m = re.match(r"(\d{4}-\d{2}-\d{2})", str(s or ""))
    return m.group(1) if m else None


def kode_kab(v):
    """11.01 (float di resource 2) atau '35.14' -> '35.14'."""
    try:
        return f"{float(v):05.2f}"
    except (TypeError, ValueError):
        return None


def ubah(r, titik_kab, titik_prov):
    """Baris SK -> entri keluaran, atau None bila tanpa tanggal mulai / status tak dikenal."""
    mulai, st = tgl(r.get("tgl_mulai")), status(r.get("status_keadaan_darurat"))
    if not mulai or not st:
        return None
    kab = str(r.get("id_kab") or "").strip() or None
    prov = str(r.get("id_prov") or "").strip()
    prov = prov[:2] if prov else (kab[:2] if kab else "")
    p = titik_kab.get(kab) if kab else titik_prov.get(prov)
    return {"nomor": str(r.get("nomor_sk_status_keadaan_darurat") or "").strip(), "prov_kode": prov,
            "prov": str(r.get("provinsi") or "").strip(), "kab_kode": kab, "kab": str(r.get("kabupaten") or "").strip(),
            "skala": "kabupaten" if kab else "provinsi", "jenis": str(r.get("jenis_bencana") or "").strip(),
            "klasifikasi": str(r.get("klasifikasi_bencana") or "").strip(), "status": st, "mulai": mulai,
            "berakhir": tgl(r.get("tgl_berakhir")), "tautan": str(r.get("tautan_surat") or "").strip(),
            "lat": p[0] if p else None, "lon": p[1] if p else None}


def pusat_provinsi():
    d = json.load(open(os.path.join(AKAR, "public/geo/provinsi.json"), encoding="utf-8"))
    out = {}
    for f in d["features"]:
        g = f["geometry"]
        ps = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        c = [x for p in ps for x in p[0]]
        out[f["properties"]["kode"]] = [round((min(x[1] for x in c) + max(x[1] for x in c)) / 2, 3),
                                        round((min(x[0] for x in c) + max(x[0] for x in c)) / 2, 3)]
    return out


BATAS_HARI = {"kabupaten": 14, "provinsi": 31, "nasional": 92}
JEDA_JENDELA = 30  # hari ke belakang dari mulai SK untuk mencari kejadian DIBI pemicunya
# kelas bencana -> potongan huruf kecil pada teks jenis SK maupun jenis DIBI (satu teks bisa memuat banyak kelas)
KELAS = {"karhutla": ("kebakaran hutan", "kebakaran lahan"), "banjir": ("banjir",), "longsor": ("longsor", "gerakan tanah"),
         "kekeringan": ("kekeringan",), "cuaca": ("cuaca ekstrem", "angin", "puting beliung", "topan"),
         "gunungapi": ("gunung api", "gunungapi", "erupsi")}


def kelas_jenis(teks):
    t = str(teks or "").lower()
    return {k for k, ws in KELAS.items() if any(w in t for w in ws)}


def tgl_ke_hari(t):
    return dt.date.fromisoformat(t)


def masa(o):
    """Tambah hari / batas_hari / lewat_batas ke entri SK (hari inklusif; null bila berakhir null)."""
    h = (tgl_ke_hari(o["berakhir"]) - tgl_ke_hari(o["mulai"])).days + 1 if o["berakhir"] else None
    o["tanggal_janggal"] = h is not None and h < 1   # berakhir sebelum mulai: salah ketik di sumber, tak dihitung
    o["hari"] = None if o["tanggal_janggal"] else h
    o["batas_hari"] = BATAS_HARI[o["skala"]]
    o["lewat_batas"] = o["hari"] is not None and o["hari"] > o["batas_hari"]
    return o


def jeda_kejadian(o, dibi):
    """Selisih hari mulai SK - tanggal kejadian DIBI terdekat (<= mulai, <= JEDA_JENDELA hari) di kab sama, jenis cocok; None bila tak ketemu
    atau jendela keluar dari cakupan DIBI (dibi = isi dibi_kejadian.json)."""
    if not o["kab_kode"] or not dibi or o["mulai"] < dibi["dari"]:
        return None
    m, kl = tgl_ke_hari(o["mulai"]), kelas_jenis(o["jenis"])
    ada = [(m - tgl_ke_hari(k["tanggal"])).days for k in dibi["kejadian"]
           if k["kab_kode"] == o["kab_kode"] and kelas_jenis(k["jenis"]) & kl and 0 <= (m - tgl_ke_hari(k["tanggal"])).days <= JEDA_JENDELA]
    return min(ada) if ada else None


def perkaya(sk, dibi):
    """Isi kolom masa + jeda ke tiap SK; kembalikan ringkasan akar."""
    for o in sk:
        masa(o)
        o["jeda_kejadian_hari"] = jeda_kejadian(o, dibi)
    kab, prov = [o for o in sk if o["skala"] == "kabupaten"], [o for o in sk if o["skala"] == "provinsi"]
    j = [o["jeda_kejadian_hari"] for o in sk if o["jeda_kejadian_hari"] is not None]
    return {"kab_lewat_batas": sum(o["lewat_batas"] for o in kab), "kab_total": len(kab), "prov_lewat_batas": sum(o["lewat_batas"] for o in prov),
            "prov_total": len(prov), "jeda_median_hari": statistics.median(j) if j else None, "jeda_n": len(j),
            "tanggal_janggal": sum(o["tanggal_janggal"] for o in sk)}


def catatan_masa(dibi, ringkas, n_jeda):
    c = (" Masa berlaku: hari = berakhir - mulai + 1; batas 14 hari kabupaten, 31 hari provinsi, 92 nasional (Pedoman Penetapan Status Keadaan Darurat BNPB 2016 hal. 15); "
         "lewat_batas = berlaku lebih lama dari batas (butuh SK perpanjangan; SK perpanjangan bisa terhitung sebagai SK terpisah di sumber). "
         "tanggal_janggal = berakhir sebelum mulai (hari null, tidak dihitung lewat batas). ")
    if dibi:
        c += (f"jeda_kejadian_hari = hari dari kejadian DIBI sejenis terdekat di kabupaten yang sama sampai mulai SK (jendela {JEDA_JENDELA} hari); null bila tak ketemu. "
              f"DIBI hanya memuat {dibi['dari']} s.d. {dibi['sampai']}, jadi SK yang mulai sebelum {dibi['dari']} otomatis null ({n_jeda} SK punya jeda).")
    else:
        c += "jeda_kejadian_hari null semua: public/data/dibi_kejadian.json tidak terbaca."
    return c


def baca_dibi():
    try:
        return json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json"), encoding="utf-8"))
    except (OSError, ValueError):
        return None


def baris(ambil, rid):
    out, a = [], 0
    while True:
        r = ambil(f"{API}datastore_search?resource_id={rid}&limit=1000&offset={a}")["result"]
        out += r["records"]
        a += 1000
        if a >= r.get("total", 0):
            return out


def jalan():
    ambil = _muat("banjir_umum", "scripts/banjir/umum.py").ambil
    simpan = _muat("umum_kejadian", "scripts/umum/kejadian.py").simpan
    paket = {}
    for q in ("status keadaan darurat", "kompilasi data status keadaan darurat bencana"):
        for p in ambil(f"{API}package_search?q={urllib.parse.quote(q)}&rows=100")["result"]["results"]:
            m = POLA_PAKET.match(p["name"])
            if m:
                paket[int(m.group(1))] = p["name"]
    if not paket:
        raise RuntimeError("tak ada paket status keadaan darurat di CKAN")
    titik_kab, sk, buang = {}, [], 0
    for th, nama in sorted(paket.items()):
        res = ambil(f"{API}package_show?id={nama}")["result"]["resources"]
        for r in res:
            if r.get("datastore_active") and re.search(r"Kabupaten yang Menetapkan", r["name"], re.I):
                for x in baris(ambil, r["id"]):
                    k = kode_kab(x.get("id_kab"))
                    if k and x.get("latitude") is not None:
                        titik_kab[k] = [round(float(x["latitude"]), 4), round(float(x["longitude"]), 4)]
        prov = pusat_provinsi()
        for r in res:
            if r.get("datastore_active") and re.match(r"Data Status Keadaan Darurat", r["name"], re.I):
                for x in baris(ambil, r["id"]):
                    o = ubah(x, titik_kab, prov)
                    if o:
                        sk.append(o)
                    else:
                        buang += 1
    sk.sort(key=lambda x: (x["mulai"], x["nomor"]), reverse=True)
    tanpa_titik = sum(1 for x in sk if x["lat"] is None)
    dibi = baca_dibi()
    ringkas = perkaya(sk, dibi)
    simpan(KELUAR, {
        "sumber": "data.bnpb.go.id (CKAN) kompilasi data status keadaan darurat bencana seluruh Indonesia", "tahun": sorted(paket),
        "catatan": f"{buang} baris dibuang (tanpa tanggal mulai atau status tak dikenal). berakhir null = tanggal berakhir kosong di sumber. "
                   f"Titik kabupaten dari resource 'Kabupaten yang Menetapkan'; skala provinsi memakai pusat kotak provinsi; "
                   f"{tanpa_titik} SK tanpa titik. Data tahun berjalan menyusul dari BNPB." + catatan_masa(dibi, ringkas, sum(1 for x in sk if x["jeda_kejadian_hari"] is not None)),
        "ringkas": ringkas, "sk": sk})
    print(f"status_darurat: tahun {sorted(paket)}, {len(sk)} SK, {buang} dibuang, {tanpa_titik} tanpa titik, ringkas {ringkas}")


def ulang():
    """Tanpa jaringan: hitung ulang kolom masa/jeda pada berkas keluaran yang ada."""
    d = json.load(open(KELUAR, encoding="utf-8"))
    dibi = baca_dibi()
    ringkas = perkaya(d["sk"], dibi)
    d["catatan"] = d["catatan"].split(" Masa berlaku:")[0] + catatan_masa(dibi, ringkas, sum(1 for x in d["sk"] if x["jeda_kejadian_hari"] is not None))
    d["ringkas"] = ringkas
    _muat("umum_kejadian", "scripts/umum/kejadian.py").simpan(KELUAR, d)
    print(f"status_darurat ulang: {ringkas}")


def uji():
    assert status("Tanggap Darurat") == "Tanggap Darurat" and status("siaga  darurat") == "Siaga Darurat"
    assert status("Transisi Darurat ke Pemulihan") == "Transisi Darurat ke Pemulihan" and status("x") is None
    assert kode_kab(11.01) == "11.01" and kode_kab(35.1) == "35.10" and kode_kab(None) is None
    assert tgl("2025-01-03T00:00:00") == "2025-01-03" and tgl("") is None
    r = {"nomor_sk_status_keadaan_darurat": "A/1", "id_prov": "35", "id_kab": "35.14", "provinsi": "Jawa Timur", "kabupaten": "Pasuruan",
         "jenis_bencana": "Banjir", "klasifikasi_bencana": "Hidrometeorologi Basah", "status_keadaan_darurat": "Tanggap Darurat",
         "tgl_mulai": "2025-01-01T00:00:00", "tgl_berakhir": "", "tautan_surat": "u"}
    o = ubah(r, {"35.14": [-7.6, 112.9]}, {})
    assert o["skala"] == "kabupaten" and o["lat"] == -7.6 and o["berakhir"] is None and o["status"] == "Tanggap Darurat"
    p = ubah(dict(r, id_kab="", id_prov="61"), {}, {"61": [0.0, 110.0]})
    assert p["skala"] == "provinsi" and p["kab_kode"] is None and p["lon"] == 110.0
    assert ubah(dict(r, tgl_mulai=""), {}, {}) is None
    assert ubah(dict(r, status_keadaan_darurat="?"), {}, {}) is None
    assert POLA_PAKET.match("kompilasi-data-status-keadaan-darurat-bencana-seluruh-indonesia-tahun-2025")
    assert set(pusat_provinsi()) >= {"11", "35", "96"}
    # masa berlaku: 15 hari kab lewat batas, 14 hari tidak; inklusif; provinsi 31 vs 32; berakhir null tidak lewat
    b = lambda sk, m, a: masa(dict(r2(sk), mulai=m, berakhir=a))
    r2 = lambda sk: {"skala": sk, "kab_kode": "35.14", "jenis": "Banjir"}
    assert b("kabupaten", "2025-01-01", "2025-01-15")["hari"] == 15 and b("kabupaten", "2025-01-01", "2025-01-15")["lewat_batas"] is True
    assert b("kabupaten", "2025-01-01", "2025-01-14")["hari"] == 14 and b("kabupaten", "2025-01-01", "2025-01-14")["lewat_batas"] is False
    assert b("provinsi", "2025-01-01", "2025-01-31")["lewat_batas"] is False and b("provinsi", "2025-01-01", "2025-02-01")["lewat_batas"] is True
    n = b("kabupaten", "2025-01-01", None)
    assert n["hari"] is None and n["lewat_batas"] is False and n["batas_hari"] == 14 and n["tanggal_janggal"] is False
    jg = b("kabupaten", "2025-03-10", "2025-03-01")
    assert jg["tanggal_janggal"] is True and jg["hari"] is None and jg["lewat_batas"] is False
    # jeda: kejadian terdekat <= mulai, jenis cocok, kab sama, jendela 30 hari, di luar cakupan DIBI = None
    dibi = {"dari": "2025-01-01", "sampai": "2025-12-31", "kejadian": [
        {"tanggal": "2025-03-05", "jenis": "Banjir Bandang", "kab_kode": "35.14"}, {"tanggal": "2025-03-08", "jenis": "Banjir", "kab_kode": "35.14"},
        {"tanggal": "2025-03-09", "jenis": "Banjir", "kab_kode": "35.15"}, {"tanggal": "2025-03-09", "jenis": "Kekeringan", "kab_kode": "35.14"},
        {"tanggal": "2025-03-12", "jenis": "Banjir", "kab_kode": "35.14"}]}
    sk = dict(r2("kabupaten"), mulai="2025-03-10", berakhir="2025-03-20")
    assert jeda_kejadian(sk, dibi) == 2                              # 8 Mar; 12 Mar sesudah mulai, kab/jenis lain diabaikan
    assert jeda_kejadian(dict(sk, mulai="2025-05-01"), dibi) is None  # di luar jendela 30 hari
    assert jeda_kejadian(dict(sk, mulai="2024-12-31"), dibi) is None  # sebelum cakupan DIBI
    assert jeda_kejadian(dict(sk, kab_kode=None), dibi) is None and jeda_kejadian(sk, None) is None
    assert kelas_jenis("Banjir,Tanah longsor,Cuaca ekstrem") == {"banjir", "longsor", "cuaca"} and kelas_jenis("Gempabumi") == set()
    rg = perkaya([dict(sk), dict(sk, mulai="2025-01-01", berakhir="2025-01-20"), dict(sk, skala="provinsi", mulai="2025-01-01", berakhir="2025-02-05")], dibi)
    assert (rg["kab_lewat_batas"], rg["kab_total"], rg["prov_lewat_batas"], rg["prov_total"], rg["jeda_median_hari"]) == (1, 2, 1, 1, 2)
    assert rg["jeda_n"] == 1 and rg["tanggal_janggal"] == 0
    print("uji status_darurat: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else ulang() if sys.argv[1:] == ["ulang"] else jalan()
