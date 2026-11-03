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

Tiap baris membawa sumber_baris: "ckan" | "drive_pusdalops". Baris Drive (SK 2026 dan penambal celah, dipanen LOKAL dari folder "FILE SK"
Pusdalops) dibaca dari cache data/raw/pusdalops-drive/sk/sk_drive.json bila ada; tanpa berkas itu keluaran sama persis seperti sebelumnya
(CI tak terpengaruh). Dedupe nomor+wilayah, CKAN menang. SK pindaian (tanpa teks) dicatat butuh_ocr, belum di-OCR.

Pakai:  python3 scripts/umum/status_darurat.py   |   ... uji   |   ... ulang (tanpa jaringan: hitung ulang kolom masa/jeda)
        python3 scripts/umum/status_darurat.py drive [folder-pdf]   (lokal: pdftotext semua PDF -> sk_drive.json, lalu jalankan 'ulang gabung')
        python3 scripts/umum/status_darurat.py ulang   (juga menggabung sk_drive.json bila ada)
"""
import datetime as dt, difflib, functools, importlib.util, json, os, re, statistics, sys, urllib.parse

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/status_darurat.json")
DRIVE_DIR = os.path.join(AKAR, "data/raw/pusdalops-drive/sk")
DRIVE_JSON = os.path.join(DRIVE_DIR, "sk_drive.json")
DRIVE_PUBLIK = os.path.join(AKAR, "public/data/sk_drive.json")   # turunan kecil yang di-commit; dipakai CI yang tak punya data/raw
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
    return {"sumber_baris": "ckan", "nomor": str(r.get("nomor_sk_status_keadaan_darurat") or "").strip(), "prov_kode": prov,
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
            "tanggal_janggal": sum(o["tanggal_janggal"] for o in sk), "sk_terakhir_mulai": max((o["mulai"] for o in sk), default=None)}


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


def tahun_berjalan(tahun, sekarang=None):
    """Peringatan paket tahun berjalan (WIB): (tahun_berjalan, ada, kalimat catatan atau '')."""
    n = sekarang or dt.datetime.now(dt.timezone(dt.timedelta(hours=7)))
    ada = n.year in tahun
    return n.year, ada, "" if ada else (f" Peringatan: Paket SK tahun {n.year} belum terbit di data.bnpb.go.id per {n.date().isoformat()}; "
                                       "SK yang berlaku tahun ini belum terbaca.")


def pasang_tahun(d, tahun):
    """Isi tahun_berjalan/tahun_berjalan_ada + kalimat peringatan di catatan (idempoten); cetak ::warning:: di GitHub Actions."""
    th, ada, w = tahun_berjalan(tahun)
    d["catatan"] = d["catatan"].split(" Peringatan:")[0] + w
    d["tahun_berjalan"], d["tahun_berjalan_ada"] = th, ada
    if w and os.environ.get("GITHUB_ACTIONS"):
        print("::warning::" + w.replace(" Peringatan: ", "", 1), flush=True)


# ---- Sumber Drive Pusdalops (lokal) ----
BULAN = {b: i + 1 for i, b in enumerate("januari februari maret april mei juni juli agustus september oktober november desember".split())}
BULAN.update({"nopember": 11, "pebruari": 2, "agustus": 8, "juni": 6})
PROV = {"aceh": "11", "sumatera utara": "12", "sumatera barat": "13", "riau": "14", "jambi": "15", "sumatera selatan": "16", "bengkulu": "17",
        "lampung": "18", "kepulauan bangka belitung": "19", "bangka belitung": "19", "kepulauan riau": "21", "dki jakarta": "31", "jawa barat": "32",
        "jawa tengah": "33", "di yogyakarta": "34", "daerah istimewa yogyakarta": "34", "yogyakarta": "34", "jawa timur": "35", "banten": "36",
        "bali": "51", "nusa tenggara barat": "52", "nusa tenggara timur": "53", "kalimantan barat": "61", "kalimantan tengah": "62",
        "kalimantan selatan": "63", "kalimantan timur": "64", "kalimantan utara": "65", "sulawesi utara": "71", "sulawesi tengah": "72",
        "sulawesi selatan": "73", "sulawesi tenggara": "74", "gorontalo": "75", "sulawesi barat": "76", "maluku utara": "82", "maluku": "81",
        "papua barat daya": "96", "papua barat": "92", "papua": "91", "papua selatan": "93", "papua tengah": "94", "papua pegunungan": "95"}
PROV_BERSIH = PROV
# nama baku per kode (untuk kolom prov); alias pendek di atas hanya untuk pencarian teks
PROV_NAMA = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu",
             "18": "Lampung", "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah",
             "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur",
             "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara",
             "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo",
             "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "94": "Papua Tengah", "95": "Papua Pegunungan",
             "96": "Papua Barat Daya", "93": "Papua Selatan"}


def _norm(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9. ]", " ", str(t or "").lower())).strip()


def tgl_id(t):
    """'1 Januari 2026' -> '2026-01-01' (bulan Indonesia), atau None."""
    m = re.search(r"(\d{1,2})\s+([a-z]+?)\s*(\d{4})", str(t or "").lower())
    if not m:
        return None
    bl = m.group(2) if m.group(2) in BULAN else next(iter(difflib.get_close_matches(m.group(2), BULAN, 1, 0.75)), None)   # OCR: 'Sepremnber'
    if not bl:
        return None
    try:
        return dt.date(int(m.group(3)), BULAN[bl], int(m.group(1))).isoformat()
    except ValueError:
        return None


_NK = []


def _kunci_nama(n):
    if not _NK:
        _NK.append(functools.lru_cache(maxsize=None)(_muat("umum_nama_wilayah", "scripts/umum/nama_wilayah.py").nk))
    return _NK[0](n)[1]


def _jalur(jalur):
    """'.../Prov. Aceh/Kab. Aceh Tamiang/x.pdf' -> (teks provinsi, 'Kab'|'Kota'|None, nama kab) dari folder Drive (cadangan bila kepala SK rusak)."""
    pv = kb = aw = None
    for bag in str(jalur or "").split("/"):
        m = re.match(r"\s*(Prov\.?|Provinsi)\s+(.+)", bag, re.I)
        if m:
            pv = m.group(2)
        m = re.match(r"\s*(Kab\.?|Kabupaten|Kota)\s+(.+)", bag, re.I)
        if m:
            aw, kb = ("Kota" if m.group(1).lower() == "kota" else "Kab"), m.group(2)
    return pv, aw, kb


def _prov_dari(teks):
    t = _norm(teks)
    for n, c in sorted(PROV_BERSIH.items(), key=lambda x: -len(x[0])):
        if re.search(r"\b" + re.escape(n) + r"\b", t):
            return c
    return None


def peta_wilayah(teks, kode=None, jalur=""):
    """Teks SK -> (prov_kode, prov, kab_kode|None, kab, titik) atau None bila penetap tak terpeta.
    Kepala SK (KEPUTUSAN BUPATI/WALIKOTA/GUBERNUR X) menang; folder Drive jadi cadangan dan penentu provinsi bila nama kab ada di >1 provinsi."""
    kode = kode if kode is not None else json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json"), encoding="utf-8"))
    pf, awf, kbf = _jalur(jalur)
    pvf = _prov_dari(pf) if pf else None
    t = _norm(teks)
    m = re.search(r"\b(bupati|wali ?kota|walikota|gubernur)\s+((?:[a-z.]+\s*){1,6})", t)
    jenis, kata = (m.group(1), m.group(2).split()) if m else (None, [])
    nama = None
    if jenis == "gubernur":
        nama = " ".join(kata)
    elif jenis:
        awal = "Kota" if "kota" in jenis else "Kab."
        for n in range(len(kata), 0, -1):    # awalan terpanjang yang cocok nama kab ("kulon progo" sebelum "daerah istimewa ...")
            k = _kunci_nama(" ".join(kata[:n]))
            cocok = [v for v in kode.values() if v["nama"].startswith(awal) and _kunci_nama(v["nama"]) == k]
            if cocok:
                break
        if not cocok and kbf:
            k = _kunci_nama(kbf)
            cocok = [v for v in kode.values() if v["nama"].startswith("Kota" if awf == "Kota" else "Kab.") and _kunci_nama(v["nama"]) == k]
        if len(cocok) > 1:
            pv = _prov_dari(teks[:1500]) or pvf
            cocok = [v for v in cocok if v["prov"] == pv] or cocok
        if len(cocok) == 1:
            v = cocok[0]
            return v["prov"], PROV_NAMA.get(v["prov"], ""), v["kemendagri"], re.sub(r"^(Kab\.|Kota)\s+", "", v["nama"]), v["pusat"]
        return None
    if jenis is None and kbf:
        k = _kunci_nama(kbf)
        cocok = [v for v in kode.values() if v["nama"].startswith("Kota" if awf == "Kota" else "Kab.") and _kunci_nama(v["nama"]) == k and (not pvf or v["prov"] == pvf)]
        if len(cocok) == 1:
            v = cocok[0]
            return v["prov"], PROV_NAMA.get(v["prov"], ""), v["kemendagri"], re.sub(r"^(Kab\.|Kota)\s+", "", v["nama"]), v["pusat"]
    if jenis is None and pvf is None:
        return None
    pv = (_prov_dari(nama) if nama else None) or pvf
    return (pv, PROV_NAMA[pv], None, "", None) if pv else None


def _rentang(t, terakhir=False):
    """Teks bagian diktum -> (mulai, berakhir) ISO; berakhir None bila hanya 'selama N hari' tanpa akhir tak terhitung. Tanggal bersama bulan/tahun ('7 s.d. 20 Januari 2026') dipahami."""
    sep = r"(?:s\.?\s*/?\s*d\.?|sampai(?:\s+dengan)?|hingga|-|\u2013)"
    ada = []
    for m in re.finditer(r"(\d{1,2})\s*([A-Za-z]{3,9})?\s*(\d{4})?\s*" + sep + r"\s*(?:tanggal\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s*(\d{4})", t):
        d1, b1, y1, d2, b2, y2 = m.groups()
        b1, y1 = (b1 or b2), (y1 or y2)
        a, z = tgl_id(f"{d1} {b1} {y1}"), tgl_id(f"{d2} {b2} {y2}")
        if a and z and z >= a:
            ada.append((a, z))
    if ada:
        return ada[-1] if terakhir else ada[0]   # 'perubahan masa': rentang baru adalah yang terakhir
    a = re.search(r"(?:sejak|terhitung(?:\s+(?:mulai|sejak|dari))?|mulai|dari)\s+(?:tanggal\s+)?(\d{1,2}\s+[A-Za-z]{3,9}\s*\d{4})", t, re.I)
    mulai = tgl_id(a.group(1)) if a else None
    if not mulai:
        return None, None
    h = re.search(r"selama\s+(\d{1,3})\s*(?:\([^)]*\)\s*)?hari", t, re.I)
    e = re.search(r"berakhir\s+(?:pada\s+)?(?:tanggal\s+)?(\d{1,2}\s+[A-Za-z]{3,9}\s*\d{4})", t, re.I)   # '... terhitung sejak 1 Januari 2024 dan berakhir tanggal 31 Desember 2024'
    if e and tgl_id(e.group(1)) and tgl_id(e.group(1)) >= mulai:
        return mulai, tgl_id(e.group(1))
    return mulai, (dt.date.fromisoformat(mulai) + dt.timedelta(days=int(h.group(1)) - 1)).isoformat() if h else None


NON_STATUS = re.compile(r"komando|pembentukan|tim |posko|pos komando|penunjukan|satuan tugas|satgas|sekretariat|rehabilitasi|rekonstruksi|pencabutan|pembebanan|dana ", re.I)


def urai_teks(teks, berkas="", kode=None, jalur=""):
    """Teks pdftotext/OCR satu SK -> (baris keluaran seperti ubah(), None) atau (None, alasan). Alasan: butuh_ocr | bukan_status | tak_terpeta | tanpa_tanggal.
    Baris membawa perpanjangan (bool) dan berkas."""
    t = re.sub(r"\s+", " ", re.sub(r"=== halaman \d+ ===", " ", str(teks or "")[:200000])).strip()
    if len(t) < 200:
        return None, "butuh_ocr"
    if re.search(r"surat\s+pernyataan|pernyataan\s+(?:tanggap|terjadinya)", t[:400], re.I):
        return None, "bukan_status"   # pernyataan bupati, bukan SK penetapan
    i = re.search(r"\bTENTANG\b", t[:4000])
    judul = t[i.end():i.end() + 450] if i else t[:600]
    judul = re.split(r"\b(?:Menimbang|Mengingat|Membaca)\b", judul)[0]   # hanya judul, bukan konsiderans
    m = re.search(r"status\s+(?:keadaan\s+)?(siaga|tanggap|transisi)", judul, re.I) or re.search(r"\b(siaga|tanggap|transisi)\s+darurat", judul, re.I)
    if not m or (not re.search(r"status", judul, re.I) and NON_STATUS.search(judul[:m.start() + 20])) or re.search(r"^\W*(pembentukan|penunjukan|masa aktif|pos komando|tim )", judul, re.I):
        return None, "bukan_status"
    st = status(m.group(1))
    w = peta_wilayah(t[:1500], kode, jalur)
    if not w:
        return None, "tak_terpeta"
    n = re.search(r"\bNOMOR\s*:?\s*(.{3,60}?)\s+TENTANG\b", t[:2500], re.I)
    nomor = re.sub(r"\s*/\s*", "/", n.group(1)).strip(" :.") if n else ""
    nomor = nomor if re.search(r"\d", re.sub(r"tahun\s*\d{4}", "", nomor, flags=re.I)) else ""   # 'NOMOR TAHUN 2025' (angka hilang di pindaian)
    sec = t[t.upper().rfind("MEMUTUSKAN"):] if "MEMUTUSKAN" in t.upper() else t   # rfind: penanda 'MEMUTUSKAN...' di ujung halaman diulang di halaman berikut
    mulai, berakhir = _rentang(sec[:3000], bool(re.search(r'perubahan', judul[:80], re.I)))
    if not mulai and sec is not t:
        mulai, berakhir = _rentang(t)
    perkiraan = False
    if mulai and not ("2018" <= mulai[:4] <= "2027" and (berakhir is None or mulai <= berakhir <= (dt.date.fromisoformat(mulai) + dt.timedelta(days=400)).isoformat())):
        mulai = berakhir = None    # salah baca pindaian (tahun 0206, rentang > 400 hari)
    pen = re.search(r"ditetapkan\s+di\s+[A-Za-z .]{2,30}?\s+pada\s+tanggal[ ,:]*(\d{1,2})\s+([A-Za-z]{3,9})\b.{0,60}?\b(20\d\d)\b", t, re.I)
    if mulai and pen and tgl_id(f"{pen.group(1)} {pen.group(2)} {pen.group(3)}") and mulai > (dt.date.fromisoformat(tgl_id(f"{pen.group(1)} {pen.group(2)} {pen.group(3)}")) + dt.timedelta(days=45)).isoformat():
        mulai = berakhir = None    # mulai > 45 hari sesudah tanggal penetapan: salah baca bulan
    if not mulai:   # hanya "sampai dengan tanggal X": mulai = tanggal ditetapkan (SK berlaku sejak ditetapkan), ditandai mulai_perkiraan
        e = re.search(r"(?:sampai(?:\s+dengan)?|s\.?\s*/?\s*d\.?|hingga)\s+(?:dengan\s+)?(?:tanggal\s+)?(\d{1,2}\s+[A-Za-z]{3,9}\s*\d{4})", sec, re.I)
        d = re.search(r"ditetapkan\s+di\s+[A-Za-z .]{2,30}?\s+pada\s+tanggal[ ,:]*(\d{1,2})\s+([A-Za-z]{3,9})\b.{0,60}?\b(20\d\d)\b", t, re.I)
        bl = difflib.get_close_matches(d.group(2).lower(), BULAN, 1, 0.7) if d else []   # OCR: 'Februan'
        berakhir, mulai = (tgl_id(e.group(1)) if e else None), (tgl_id(f"{d.group(1)} {bl[0]} {d.group(3)}") if bl else None)
        h = re.search(r"selama\s+(\d{1,3})\s*(?:\([^)]*\)\s*)?hari", sec, re.I)
        if mulai and not berakhir and h:
            berakhir = (dt.date.fromisoformat(mulai) + dt.timedelta(days=int(h.group(1)) - 1)).isoformat()
        if not (mulai and berakhir and berakhir >= mulai):
            return None, "tanpa_tanggal"
        perkiraan = True
        if not "2018" <= mulai[:4] <= "2027":
            return None, "tanpa_tanggal"
    j = re.search(r"bencana\s+(?:alam\s+|non\s+alam\s+)?(.{3,120}?)(?:\s+di\s+(?:wilayah|kabupaten|kota|provinsi|kecamatan|daerah)|\s+tahun\s+\d{4}|$)", judul, re.I)
    jenis = j.group(1).strip(" ,.").title() if j else ""
    return {"sumber_baris": "drive_pusdalops", "nomor": nomor, "prov_kode": w[0], "prov": w[1], "kab_kode": w[2], "kab": w[3],
            "skala": "kabupaten" if w[2] else "provinsi", "jenis": jenis, "klasifikasi": "Hidrometeorologi" if re.search(r"hidrometeorologi|hidrometerologi", judul, re.I) else "",
            "status": st, "mulai": mulai, "berakhir": berakhir, "tautan": "", "lat": w[4][0] if w[4] else None, "lon": w[4][1] if w[4] else None,
            "perpanjangan": bool(re.search(r"perpanjangan|perpanjang", judul[:120], re.I)), "berkas": berkas,
            **({"mulai_perkiraan": True} if perkiraan else {})}, None


def kunci_sk(o):
    n = re.sub(r"[^a-z0-9]", "", str(o.get("nomor") or "").lower())
    return (n or f"{o.get('status')}{o.get('mulai')}", o.get("kab_kode") or o.get("prov_kode") or "")


def gabung(ckan, drive):
    """CKAN + Drive -> daftar tunggal. Dedupe nomor+wilayah (nomor kosong tidak didedupe), CKAN menang. Kembalikan (daftar, n_drive_dipakai)."""
    ada = {kunci_sk(o) for o in ckan}
    out, n = list(ckan), 0
    for o in drive:
        k = kunci_sk(o)
        if k in ada:
            continue
        ada.add(k)
        out.append({k: v for k, v in o.items() if k != "berkas"} | {"sumber_baris": "drive_pusdalops"})   # jalur berkas cukup di cache lokal
        n += 1
    return out, n


def baca_drive(cache=None, publik=None):
    """Baris Drive: cache lokal (data/raw) bila ada, kalau tidak turunan publik public/data/sk_drive.json (CI), kalau tidak kosong."""
    for f in (cache or DRIVE_JSON, publik or DRIVE_PUBLIK):
        try:
            return json.load(open(f, encoding="utf-8")).get("sk", [])
        except (OSError, ValueError):
            pass
    return []


def panen_drive(folder=None):
    """LOKAL: tiap PDF/doc/docx di folder (rekursif) -> teks (saudara '<berkas>.txt' bila ada, kalau tidak pdftotext) -> urai_teks;
    tulis sk_drive.json (+ daftar yang tak terurai per alasan; butuh_ocr = tanpa teks yang layak)."""
    import subprocess
    folder = folder or DRIVE_DIR
    sk, lain = [], {}
    per = {}   # tahun-folder (komponen pertama) -> hitungan alasan
    for akar, _, fs in sorted(os.walk(folder)):
        for f in sorted(fs):
            pth = os.path.join(akar, f)
            if f.endswith(".txt"):          # teks saja (asli sudah dihapus) atau saudara berkas asli
                if f == "INDEKS.md":
                    continue
                teks, nama = open(pth, encoding="utf-8", errors="replace").read(), pth[:-4]
            elif f.lower().endswith(".pdf") and not os.path.exists(pth + ".txt"):
                teks, nama = subprocess.run(["pdftotext", "-layout", pth, "-"], capture_output=True, text=True).stdout, pth
            else:
                continue
            rel = os.path.relpath(nama, folder)
            o, why = urai_teks(teks, rel, jalur=rel)
            th = rel.split(os.sep)[0]
            per.setdefault(th, {}).setdefault(why or "terurai", 0)
            per[th][why or "terurai"] += 1
            if o:
                sk.append(o)
            else:
                lain.setdefault(why, []).append(rel)
    os.makedirs(DRIVE_DIR, exist_ok=True)
    json.dump({"sk": sk, "tidak_terurai": lain}, open(DRIVE_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # turunan publik: hanya baris SK (tanpa jalur berkas / daftar gagal); mulai_perkiraan menandai tanggal mulai yang ditebak dari tanggal penetapan
    _muat("umum_kejadian", "scripts/umum/kejadian.py").simpan(DRIVE_PUBLIK, {
        "sumber": "Drive Pusdalops BNPB, folder FILE SK (SK kepala daerah, dokumen publik), diurai lokal dari teks/OCR; mulai_perkiraan true = mulai diambil dari tanggal penetapan",
        "sk": [{k: v for k, v in o.items() if k != "berkas"} for o in sk]})
    print(f"status_darurat drive: {len(sk)} terurai, " + ", ".join(f"{k} {len(v)}" for k, v in lain.items()))
    for th, h in sorted(per.items()):
        print("  ", th, h)


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
    sk, n_drive = gabung(sk, baca_drive())
    sk.sort(key=lambda x: (x["mulai"], x["nomor"]), reverse=True)
    tanpa_titik = sum(1 for x in sk if x["lat"] is None)
    dibi = baca_dibi()
    ringkas = perkaya(sk, dibi)
    d = {
        "sumber": "data.bnpb.go.id (CKAN) kompilasi data status keadaan darurat bencana seluruh Indonesia" + (" + Drive Pusdalops" if n_drive else ""),
        "tahun": sorted(set(paket) | {int(x["mulai"][:4]) for x in sk if x["sumber_baris"] != "ckan"}),
        "catatan": f"{buang} baris dibuang (tanpa tanggal mulai atau status tak dikenal). berakhir null = tanggal berakhir kosong di sumber. "
                   f"Titik kabupaten dari resource 'Kabupaten yang Menetapkan'; skala provinsi memakai pusat kotak provinsi; "
                   f"{tanpa_titik} SK tanpa titik. Data tahun berjalan menyusul dari BNPB. {n_drive} SK dari Drive Pusdalops (sumber_baris drive_pusdalops; CKAN menang bila nomor+wilayah sama)." + catatan_masa(dibi, ringkas, sum(1 for x in sk if x["jeda_kejadian_hari"] is not None)),
        "ringkas": ringkas, "sk": sk}
    pasang_tahun(d, d["tahun"])
    simpan(KELUAR, d)
    print(f"status_darurat: tahun {sorted(paket)}, {len(sk)} SK, {buang} dibuang, {tanpa_titik} tanpa titik, ringkas {ringkas}")


def ulang():
    """Tanpa jaringan: hitung ulang kolom masa/jeda pada berkas keluaran yang ada."""
    d = json.load(open(KELUAR, encoding="utf-8"))
    for o in d["sk"]:
        o.setdefault("sumber_baris", "ckan")
    d["sk"] = [o for o in d["sk"] if o["sumber_baris"] == "ckan"]   # baris Drive lama dibuang; cache terbaru yang dipakai
    d["sk"], n = gabung(d["sk"], baca_drive())
    if n:
        d["sk"].sort(key=lambda x: (x["mulai"], x["nomor"]), reverse=True)
        d["tahun"] = sorted({y for y in d["tahun"] if y >= 2018} | {int(x["mulai"][:4]) for x in d["sk"] if x["sumber_baris"] != "ckan"})
    dibi = baca_dibi()
    ringkas = perkaya(d["sk"], dibi)
    d["catatan"] = d["catatan"].split(" Masa berlaku:")[0] + catatan_masa(dibi, ringkas, sum(1 for x in d["sk"] if x["jeda_kejadian_hari"] is not None))
    d["ringkas"] = ringkas
    pasang_tahun(d, d["tahun"])
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
    assert rg["sk_terakhir_mulai"] == "2025-03-10" and perkaya([], dibi)["sk_terakhir_mulai"] is None
    W = dt.timezone(dt.timedelta(hours=7))
    assert tahun_berjalan([2025], dt.datetime(2026, 1, 1, 6, 0, tzinfo=W))[:2] == (2026, False)   # 31 Des 23:00 UTC = 1 Jan WIB
    assert tahun_berjalan([2025], dt.datetime(2026, 1, 1, 6, 0, tzinfo=W))[2].endswith("2026-01-01; SK yang berlaku tahun ini belum terbaca.")
    assert tahun_berjalan([2025, 2026], dt.datetime(2026, 5, 1, tzinfo=W)) == (2026, True, "")
    # Drive Pusdalops: parser teks SK, penggabungan, tahun berjalan
    assert tgl_id("1 Januari 2026") == "2026-01-01" and tgl_id("31 Februari 2026") is None and tgl_id("x") is None
    KD = {"3514": {"nama": "Kab. Pasuruan", "prov": "35", "kemendagri": "35.14", "pusat": [-7.6, 112.9]},
          "3575": {"nama": "Kota Pasuruan", "prov": "35", "kemendagri": "35.75", "pusat": [-7.64, 112.9]},
          "1801": {"nama": "Kab. Lampung Barat", "prov": "18", "kemendagri": "18.01", "pusat": [-5.0, 104.0]}}
    # tiga fixture dari teks SK nyata (OCR/pdftotext), dipangkas ke judul + diktum, tanpa nama penanda tangan
    SK1 = ("BUPATI ACEH TAMIANG PROVINSI ACEH KEPUTUSAN BUPATI ACEH TAMIANG NOMOR 100.3.3.2/ 3 /2026 TENTANG PERPANJANGAN STATUS TANGGAP DARURAT BENCANA ALAM "
           "HIDROMETEOROLOGI (BANJIR, POHON TUMBANG, DAN TANAH LONGSOR) DI KABUPATEN ACEH TAMIANG BUPATI ACEH TAMIANG, Menimbang : a. bahwa status tanggap darurat berakhir "
           "pada tanggal 6 Januari 2026; MEMUTUSKAN: Menetapkan : KEPUTUSAN BUPATI TENTANG PERPANJANGAN STATUS TANGGAP DARURAT. KESATU : Perpanjangan Status Tanggap Darurat. "
           "KEDUA : berlaku selama 14 (empat belas) hari terhitung sejak tanggal 7 Januari 2026 sampai dengan 20 Januari 2026. KETIGA : dapat diperpanjang. "
           "Ditetapkan di Karang Baru pada tanggal, 6 Januari 2026")
    SK2 = ("=== halaman 1 === BUPATI MELAWI KEPUTUSAN BUPATI MELAWI NOMOR 300.2/67 TAHUN 2026 TENTANG STATUS SIAGA DARURAT PENANGANAN BENCANA ASAP AKIBAT KEBAKARAN HUTAN DAN LAHAN "
           "DI KABUPATEN MELAWI BUPATI MELAWI, : a. bahwa berdasarkan informasi BMKG ... MEMUTUSKAN... === halaman 3 === MEMUTUSKAN: Menetapkan KESATU KEDUA : Status Siaga Darurat "
           "Penanganan Bencana Asap Akibat Kebakaran Hutan dan Lahan di Kabupaten Melawi. Masa berlakunya Status Siaga Darurat terhitung mulai tanggal ditetapkan sampai dengan tanggal "
           "31 Desember 2026. Ditetapkan di Nanga Pinoh pada tanggal 2 Februan 2026 M")
    SK3 = ("GUBERNUR GORONTALO KEPUTUSAN GUBERNUR GORONTALO NOMOR 373 / 31 / IX / 2026 TENTANG PENETAPAN STATUS TANGGAP DARURAT BENCANA KEKERINGAN, KEBAKARAN HUTAN DAN LAHAN "
           "DI PROVINSI GORONTALO TAHUN 2026 MEMUTUSKAN: Menetapkan : KESATU : Menetapkan Status Tanggap Darurat. KEDUA : berlaku selama 30 hari, terhitung mulai tanggal "
           "1 September 2026 sampai dengan tanggal 30 September 2026.")
    KD = {"1101": {"nama": "Kab. Aceh Selatan", "prov": "11", "kemendagri": "11.01", "pusat": [3.1, 97.4]}, "1109": {"nama": "Kab. Aceh Tamiang", "prov": "11", "kemendagri": "11.12", "pusat": [4.2, 98.0]},
          "6111": {"nama": "Kab. Melawi", "prov": "61", "kemendagri": "61.11", "pusat": [-0.6, 112.4]}, "3514": {"nama": "Kab. Pasuruan", "prov": "35", "kemendagri": "35.14", "pusat": [-7.6, 112.9]},
          "3575": {"nama": "Kota Pasuruan", "prov": "35", "kemendagri": "35.75", "pusat": [-7.64, 112.9]}}
    o, why = urai_teks(SK1, "a.pdf", KD)
    assert why is None and o["kab_kode"] == "11.12" and o["status"] == "Tanggap Darurat" and (o["mulai"], o["berakhir"]) == ("2026-01-07", "2026-01-20"), (o, why)
    assert o["sumber_baris"] == "drive_pusdalops" and o["nomor"] == "100.3.3.2/3/2026" and o["perpanjangan"] is True and o["skala"] == "kabupaten" and "mulai_perkiraan" not in o
    m, why = urai_teks(SK2, "b.pdf", KD)   # 'sampai dengan' saja: mulai = tanggal ditetapkan (OCR 'Februan'), ditandai perkiraan
    assert why is None and m["kab_kode"] == "61.11" and (m["mulai"], m["berakhir"], m["mulai_perkiraan"]) == ("2026-02-02", "2026-12-31", True), (m, why)
    g, why = urai_teks(SK3, "g.pdf", KD)
    assert why is None and g["skala"] == "provinsi" and g["prov_kode"] == "75" and g["perpanjangan"] is False and (g["mulai"], g["berakhir"]) == ("2026-09-01", "2026-09-30"), (g, why)
    assert urai_teks("", "scan.pdf", KD) == (None, "butuh_ocr") and urai_teks("x" * 300, "y.pdf", KD)[1] == "bukan_status"
    assert urai_teks(SK1.replace("PERPANJANGAN STATUS TANGGAP DARURAT BENCANA ALAM", "PEMBENTUKAN POS KOMANDO TANGGAP DARURAT BENCANA ALAM", 1), "p", KD)[1] == "bukan_status"
    assert urai_teks(SK1.replace("tanggal 7 Januari 2026 sampai dengan 20 Januari 2026", "").replace("2026", ""), "t", KD)[1] == "tanpa_tanggal"
    assert tgl_id("17 Sepremnber 2026") == "2026-09-17" and tgl_id("29 Nopember 2024") == "2024-11-29"
    assert _rentang("tanggal 7 s.d. 20 Januari 2026") == ("2026-01-07", "2026-01-20")
    assert _rentang("terhitung sejak tanggal 1 Januari 2024 dan berakhir tanggal 31 Desember 2024") == ("2024-01-01", "2024-12-31")
    assert peta_wilayah("WALIKOTA PASURUAN NOMOR 1 TENTANG", KD)[2] == "35.75" and peta_wilayah("BUPATI PASURUAN", KD)[2] == "35.14"
    ck = [dict(ubah(r, {}, {}), nomor="100.3.3.2/3/2026", kab_kode="11.12")]
    gb, nd = gabung(ck, [o, dict(o, nomor="Z-9")])
    assert nd == 1 and len(gb) == 2 and gb[0]["sumber_baris"] == "ckan" and gb[1]["nomor"] == "Z-9"   # CKAN menang atas nomor+wilayah sama
    assert gabung(ck, [])[0] == ck
    d26 = {"catatan": "x", "tahun": [2025, 2026]}
    pasang_tahun(d26, d26["tahun"])
    assert d26["tahun_berjalan_ada"] == (dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).year in (2025, 2026))
    # CI tanpa data/raw: cache lokal tak ada -> turunan publik dipakai; keduanya tak ada -> kosong (perilaku lama)
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        pub = os.path.join(td, "sk_drive.json")
        json.dump({"sk": [o]}, open(pub, "w"))
        assert baca_drive(os.path.join(td, "tak_ada.json"), pub) == [o]
        assert baca_drive(os.path.join(td, "tak_ada.json"), os.path.join(td, "tak_ada2.json")) == []
        loc = os.path.join(td, "lokal.json")
        json.dump({"sk": []}, open(loc, "w"))
        assert baca_drive(loc, pub) == []   # cache lokal menang walau kosong
    print("uji status_darurat: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a == ["uji"] else ulang() if a == ["ulang"] else panen_drive(*a[1:2]) if a[:1] == ["drive"] else jalan()
