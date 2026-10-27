"""Status keadaan darurat bencana (SK kepala daerah) seluruh tahun yang terbit di CKAN data.bnpb.go.id
-> public/data/status_darurat.json

Paket dicari lewat package_search q="status keadaan darurat" (nama berpola
kompilasi-data-status-keadaan-darurat-bencana-seluruh-indonesia-tahun-YYYY), semua tahun, bukan id tetap (BNPB mengunggah ulang).
Resource 1 "Data Status Keadaan Darurat Bencana YYYY" = baris SK; resource 2 "Kabupaten yang Menetapkan..." = lat/lon per id_kab.
Skala provinsi: titik = pusat kotak public/geo/provinsi.json.

{"dibuat","sumber","tahun","catatan","sk":[{nomor,prov_kode,prov,kab_kode|null,kab,skala,jenis,klasifikasi,status,mulai,berakhir|null,tautan,lat,lon}]}
status dinormalkan ke Siaga Darurat | Tanggap Darurat | Transisi Darurat ke Pemulihan.

Pakai:  python3 scripts/umum/status_darurat.py   |   python3 scripts/umum/status_darurat.py uji
"""
import importlib.util, json, os, re, sys, urllib.parse

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
    simpan(KELUAR, {
        "sumber": "data.bnpb.go.id (CKAN) kompilasi data status keadaan darurat bencana seluruh Indonesia", "tahun": sorted(paket),
        "catatan": f"{buang} baris dibuang (tanpa tanggal mulai atau status tak dikenal). berakhir null = tanggal berakhir kosong di sumber. "
                   f"Titik kabupaten dari resource 'Kabupaten yang Menetapkan'; skala provinsi memakai pusat kotak provinsi; "
                   f"{tanpa_titik} SK tanpa titik. Data tahun berjalan menyusul dari BNPB.",
        "sk": sk})
    print(f"status_darurat: tahun {sorted(paket)}, {len(sk)} SK, {buang} dibuang, {tanpa_titik} tanpa titik")


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
    print("uji status_darurat: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
