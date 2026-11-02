#!/usr/bin/env python3
"""Urai spreadsheet unik Drive "00. PIKET PUSDALOPS" -> data/raw/pusdalops_unik/*.jsonl (lokal, tidak di-commit).

  python3 scripts/data/pusdalops_xlsx.py --sumber "<folder Drive>" --keluaran data/raw/pusdalops_unik [--tmp DIR] [--hanya a,b]
  python3 scripts/data/pusdalops_xlsx.py uji

Keluaran: rekap_harian, medsos_tv_2025, rekap_daerah, sk_kekeringan_tidak_terbit, kematian_2024 (.jsonl) + ringkasan.json.
Drive mode stream: tiap berkas disalin SATU per satu ke --tmp, diurai, lalu salinannya dihapus.
Pemetaan kolom dibaca dari label header (baris header majemuk diratakan), bukan posisi tetap, karena tiap tahun
menggeser kolom. Privasi: nama orang/HP/email dibuang (bersih() dari logbook_pusdalops); kolom penginput, keterangan
bebas, dan kronologis tidak disimpan. openpyxl dicari juga di site-packages pengguna (python -I mengabaikannya).
"""
import argparse, concurrent.futures, datetime, threading, json, os, re, shutil, subprocess, sys, tempfile, zipfile
import site

sys.path.append(site.getusersitepackages())
AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logbook_pusdalops as lp  # noqa: E402  (jenis_dari, kode_prov, semua_tgl, bersih)

try:
    import openpyxl
except ImportError:  # self-check tetap jalan tanpa openpyxl
    openpyxl = None

# ---- peta label -> bidang. Urutan = prioritas; bidang None = abaikan kolom (angka turunan, tautan, teks bebas).
ATURAN = [
    ("judul", r"judul"), ("link", r"link berita"), ("status", r"keterangan dan konfirm"),
    ("png_total", r"(pengungsi|mengungsi).*tertinggi|tertinggi"),
    ("png_jiwa", r"mengungsi.*jiwa$"), (None, r"mengungsi"),
    ("png_h", r"pengungsi"),
    ("tdk_kk", r"terdampak.*\bkk$"), ("tdk_jiwa", r"terdampak.*jiwa$|penduduk terdampak"),
    ("provkab", r"provinsi\s*/\s*kab"), ("prov", r"\bprovinsi\b"),
    ("kab", r"\bkab|kota\b|kabupaten"),
    ("md", r"(^|\s)md$|meninggal"), ("hl", r"(^|\s)hl$|hilang"),
    ("luka_total", r"luka\W*luka|luka total"), ("luka_bagian", r"(^|\s)(lb|ls|lr)$"),
    ("rb", r"rumah.*\brb\b"), ("rs", r"rumah.*\brs\b"), ("rr", r"rumah.*\brr\b"),
    ("jenis", r"jenis bencana|^kejadian$"),
    ("tgl", r"^(waktu kejadian tgl|tanggal)$"), ("bln", r"^(waktu kejadian bl|bulan)$"), ("thn", r"^(waktu kejadian th|tahun)$"),
    ("wkt", r"^(waktu waktu|waktu kejadian|waktu)$"),
]
ABAIKAN = re.compile(
    r"pembilang|penyebut|rate|rata|durasi|nomor sk|masa|link|log ?book|lapor|update|diterima|\bjum(lah|\.)?\b|\bjml\b|"
    r"\bket\b|keterangan|upaya|konfirm|input|sumber|kronolog|kelas|referensi|frekuensi|berisiko|fasum|fasdik|fasdah|faskes|lahan|sarana")   # diuji pada label DAUN saja: label induk menjalar ke kanan dan menutupi kolom lain
ATURAN = [(f, re.compile(p)) for f, p in ATURAN]
ANGKA = ("md", "hl", "luka", "mengungsi", "tdk_kk", "tdk_jiwa", "rb", "rs", "rr")
KEYS = {"md": "meninggal", "hl": "hilang", "luka": "luka", "mengungsi": "mengungsi", "tdk_kk": "terdampak_kk",
        "tdk_jiwa": "terdampak_jiwa", "rb": "rumah_rb", "rs": "rumah_rs", "rr": "rumah_rr"}


def norm(s):
    return re.sub(r"\s+", " ", str(s).replace("_", " ").replace("\n", " ")).strip().lower()


def ratakan(baris):
    """Baris-baris header -> label per kolom; label sel menjalar ke kanan sampai label berikutnya di baris itu."""
    n = max(len(r) for r in baris)
    lab = [[] for _ in range(n)]

    def isi(r, j):
        return j < len(r) and r[j] is not None and str(r[j]).strip() != ""

    for i, r in enumerate(baris):
        cur = ""
        for j in range(n):
            if isi(r, j):
                cur = norm(r[j])
            elif not any(isi(b, j) for b in baris[i + 1:]):
                continue        # tidak ada label di bawahnya: ini bukan induk kelompok, jangan menjalar
            if cur and (not lab[j] or lab[j][-1] != cur):
                lab[j].append(cur)
    return lab          # per kolom: daftar label dari baris atas ke bawah (terakhir = daun)


def peta(labels):
    p = {}
    for j, parts in enumerate(labels):
        l = " ".join(parts)
        if ABAIKAN.search(parts[-1] if parts else "") and not re.search(r"judul|link berita|keterangan dan konfirm", l):
            continue
        for f, rx in ATURAN:
            if rx.search(l):
                if f:
                    p.setdefault(f, []).append(j)
                break
    return p


def angka(v):
    """Sel -> int atau None. Float berdesimal 3 digit = pemisah ribuan yang salah ketik (9.662 -> 9662)."""
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        if v != v or v < 0:
            return None
        if v != int(v):
            r = round(v * 1000)
            return r if abs(v * 1000 - r) < 1e-6 else int(round(v))
        return int(v)
    s = str(v).strip()
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        return int(s.replace(".", ""))
    return int(s) if re.fullmatch(r"\d+", s) else None


TAHUN = (2000, 2026)   # di luar rentang = salah ketik (1019, 2028); tanggal dikosongkan, barisnya tetap


def tgl_sel(v, tahun=None):
    if isinstance(v, datetime.datetime):
        v = v.date()
    if isinstance(v, datetime.date):
        return v.isoformat() if TAHUN[0] <= v.year <= TAHUN[1] else None
    if isinstance(v, str):
        t = [x for x in lp.semua_tgl(v, tahun) if TAHUN[0] <= int(x[:4]) <= TAHUN[1]]
        return t[0] if t else None
    return None


def prov_kab(teks):
    """'Prov. Jawa Tengah\\nKab. A\\nKab. B' -> (kode, kab)."""
    prov, kab = "", []
    for ln in re.split(r"[\n;]|\s*/\s*(?=Kab|Kota)", str(teks)):
        ln = ln.strip()
        if re.match(r"(?i)prov", ln):
            prov = re.sub(r"(?i)^prov(insi)?\.?\s*", "", ln)
        elif ln:
            kab.append(ln)
    return prov, kab


def rapikan(s):
    return re.sub(r"\s+", " ", str(s)).strip(" ,;")


def baris_ke_rekaman(sel, p, ctx):
    """sel = tuple nilai satu baris, p = peta kolom -> dict atau None."""
    def ambil(f):
        return [sel[j] for j in p.get(f, []) if j < len(sel) and sel[j] is not None and str(sel[j]).strip() != ""]

    prov_t = (ambil("prov") or [None])[0]
    kab_t = ambil("kab")
    if not prov_t and ambil("provkab"):
        pr, kb = prov_kab(ambil("provkab")[0])
        prov_t, kab_t = pr, ([";".join(kb)] if kb else [])
    kab_t = rapikan("; ".join(l.strip() for l in str(kab_t[0]).split("\n") if l.strip())) if kab_t else ""
    if prov_t:
        ctx["prov"] = rapikan(prov_t)
    elif kab_t:
        prov_t = ctx.get("prov", "")
    jenis_t = (ambil("jenis") or [""])[0]
    if not (prov_t or kab_t or jenis_t):
        return None
    if re.match(r"(?i)\s*(jumlah|total)\b", str(prov_t or kab_t)):
        return None
    wkt = ambil("wkt")
    tgl = tgl_sel(wkt[0], ctx.get("tahun")) if wkt else None
    if not tgl and ambil("thn") and ambil("bln") and ambil("tgl"):
        tgl = lp.iso(angka(ambil("tgl")[0]) or 0, angka(ambil("bln")[0]) or 0, angka(ambil("thn")[0]) or 0)
        tgl = tgl if tgl and TAHUN[0] <= int(tgl[:4]) <= TAHUN[1] else None
    jenis = lp.jenis_dari(str(jenis_t)) if jenis_t else ctx.get("jenis_tetap", "lainnya")
    luka = angka(ambil("luka_total")[0]) if ambil("luka_total") else None
    if luka is None and p.get("luka_bagian"):
        v = [angka(x) for x in ambil("luka_bagian")]
        luka = sum(x for x in v if x) if any(x is not None for x in v) else None
    png = None
    for f in ("png_total", "png_jiwa", "png_h"):
        v = [angka(x) for x in ambil(f)]
        v = [x for x in v if x is not None]
        if v:
            png = max(v)
            break
    r = {"tanggal": tgl, "jenis": jenis, "prov": lp.kode_prov(prov_t) if prov_t else "", "kab": kab_t,
         "meninggal": angka(ambil("md")[0]) if ambil("md") else None, "hilang": angka(ambil("hl")[0]) if ambil("hl") else None,
         "luka": luka, "mengungsi": png,
         "terdampak_kk": angka(ambil("tdk_kk")[0]) if ambil("tdk_kk") else None,
         "terdampak_jiwa": angka(ambil("tdk_jiwa")[0]) if ambil("tdk_jiwa") else None,
         "rumah_rb": angka(ambil("rb")[0]) if ambil("rb") else None, "rumah_rs": angka(ambil("rs")[0]) if ambil("rs") else None,
         "rumah_rr": angka(ambil("rr")[0]) if ambil("rr") else None}
    if p.get("judul") or p.get("link") or p.get("status"):
        r["tanggal_pantau"] = ctx.get("pantau")
        r["judul"] = lp.bersih(rapikan((ambil("judul") or [""])[0]))[:300]
        r["link"] = (ambil("link") or [""])[0].strip()
        st = norm((ambil("status") or [""])[0])
        r["status_logbook"] = ("sudah" if "sudah masuk" in st else "konfirmasi" if "konfirm" in st else "lain" if st else "")
        for k in KEYS.values():
            r.pop(k, None)
    return r


def cari_header(baris):
    """-> (indeks baris header pertama, indeks baris data pertama) atau None. Data = sel kolom 'No' bernomor."""
    h0 = col = None
    for i, r in enumerate(baris[:25]):
        for j, v in enumerate(r):
            if isinstance(v, str) and re.fullmatch(r"no\.?", v.strip().lower()):
                h0, col = (i if h0 is None else h0), j
                break
        if h0 is not None:
            break
    if h0 is None:
        return None
    for i in range(h0, min(len(baris), h0 + 25)):
        r = baris[i]
        if col < len(r) and isinstance(r[col], (int, float)) and not isinstance(r[col], bool):
            return h0, i
    return None


def urai_lembar(ws, sumber, ctx0=None, fallback_jenis=None):
    """-> (baris rekaman, kolom dikenali atau None bila lembar tak dikenali)."""
    semua, kosong = [], 0
    for r in ws.iter_rows(values_only=True):
        semua.append(r)
        kosong = kosong + 1 if all(v is None for v in r) else 0
        if kosong > 60:
            break
    hd = cari_header(semua)
    if not hd:
        return [], None
    h0, d0 = hd
    p = peta(ratakan(semua[h0:d0]))
    if not p:
        return [], None
    ctx = dict(ctx0 or {})
    if fallback_jenis:
        ctx["jenis_tetap"] = fallback_jenis
    for r in semua[:h0 + 1]:
        t = " ".join(str(v) for v in r if isinstance(v, str))
        if "periode" in t.lower():
            tg = lp.semua_tgl(t, ctx.get("tahun"))
            ctx["pantau"] = tg[0] if tg else None
    out = []
    for r in semua[d0:]:
        x = baris_ke_rekaman(r, p, ctx)
        if x:
            x["sumber_berkas"] = sumber
            x["lembar"] = ws.title
            out.append(x)
    return out, sorted(p)


def urai_matriks_2016(ws, sumber):
    """REKAP KEJADIAN BENCANA 2016: lembar per jenis, baris provinsi x hari 1..31 berisi jumlah kejadian."""
    m = y = None
    out = []
    jenis = {"karlahut": "karhutla"}.get(norm(ws.title)) or lp.jenis_dari(ws.title)
    for r in ws.iter_rows(values_only=True):
        for v in r:
            if isinstance(v, str):
                mm = re.search(r"(?i)bulan\s+([a-z]+)\s+(\d{4})", v)
                if mm and mm.group(1).lower() in lp.BULAN:
                    m, y = lp.BULAN[mm.group(1).lower()], int(mm.group(2))
        if not m or len(r) < 4 or not re.fullmatch(r"\d+(\.0)?", str(r[0] or "").strip()) or not isinstance(r[1], str):
            continue
        prov = lp.kode_prov(r[1])
        for d in range(1, 32):
            n = angka(r[1 + d]) if 1 + d < len(r) else None
            tg = lp.iso(d, m, y) if n else None
            if n and tg:
                out.append({"tanggal": tg, "jenis": jenis, "prov": prov, "kab": "", "n_kejadian": n,
                            "sumber_berkas": sumber, "lembar": ws.title})
    return out


def baca_xlsx(path, sumber, mode, hanya_lembar_pertama=False, fallback_jenis=None):
    """-> (rows, info). mode: 'tabel' | 'matriks2016' | 'sk'."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows, info = [], {"lembar": {}, "dilewati": []}
    for ws in (wb.worksheets[:1] if hanya_lembar_pertama else wb.worksheets):
        if mode == "matriks2016":
            x = urai_matriks_2016(ws, sumber)
            kol = ["matriks"] if x else None
        elif mode == "sk":
            x, kol = urai_sk(ws, sumber)
        else:
            x, kol = urai_lembar(ws, sumber, fallback_jenis=fallback_jenis)
        if kol is None:
            info["dilewati"].append(ws.title)
        else:
            info["lembar"][ws.title] = {"baris": len(x), "kolom": kol}
            rows += x
    wb.close()
    return rows, info


def urai_sk(ws, sumber):
    """Daftar nama kab/kota per lembar provinsi (JATENG/JATIM/BALI) yang tidak menerbitkan SK status siaga/darurat kekeringan."""
    out = []
    prov = lp.kode_prov(ws.title)
    for r in ws.iter_rows(values_only=True):
        for v in r:
            if isinstance(v, str) and re.match(r"(?i)\s*(kab|kota)\b", v):
                out.append({"tanggal": None, "jenis": "kekeringan", "prov": prov, "kab": rapikan(v),
                            "sumber_berkas": sumber, "lembar": ws.title})
    return out, ["kab"] if out else None


# ---------------------------------------------------------------- penemuan berkas
def xlsx_di(d, rekursif=False):
    if not os.path.isdir(d):
        return []
    if not rekursif:
        return [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.lower().endswith(".xlsx") and not f.startswith(("~", "."))]
    return [os.path.join(a, f) for a, _, fs in sorted(os.walk(d)) for f in sorted(fs) if f.lower().endswith(".xlsx") and not f.startswith(("~", "."))]


def temukan(sumber):
    j = {k: [] for k in ("harian", "medsos", "daerah", "sk", "kematian")}
    tahun = [d for d in sorted(os.listdir(sumber)) if "LAPORAN PUSDALOPS" in d]
    for t in tahun:  # folder "Rekapan Harian" selalu anak langsung folder tahun; jangan menyusuri seluruh Drive (stream, lambat)
        for d in sorted(os.listdir(os.path.join(sumber, t))):
            if norm(d) == "rekapan harian":
                j["harian"] += xlsx_di(os.path.join(sumber, t, d), True)
    for t in ("2024 LAPORAN PUSDALOPS", "2025 LAPORAN PUSDALOPS"):
        j["daerah"] += [f for f in xlsx_di(os.path.join(sumber, t)) if re.match(r"(?i)rekap", os.path.basename(f))]
    d = os.path.join(sumber, "2024 LAPORAN PUSDALOPS", "Hitungan Angka Kematian 2024")
    j["kematian"] = [f for f in xlsx_di(d) if re.search(r"Rekap Nasional Angka Kematian", f) and not os.path.basename(f).startswith("Copy of")]
    j["sk"] = xlsx_di(os.path.join(sumber, "Daftar Kab Kota yg tidak menerbitkan SK SD Kekeringan"))
    m = os.path.join(sumber, "PEMANTAUAN SOSMED DAN TV 2025", "PANTAUAN BENCANA MEDSOS DAN TV ")
    j["medsos"] = xlsx_di(m, True)
    j["medsos_zip"] = [os.path.join(a, f) for a, _, fs in os.walk(m) for f in fs if f.lower().endswith(".zip")]
    j["medsos_gsheet"] = sum(1 for _, _, fs in os.walk(m) for f in fs if f.lower().endswith(".gsheet"))
    return j


def sederhana(path, sumber):
    return os.path.relpath(path, sumber)


def salin_aman(src, dst, coba=3, batas=150):
    """cp dengan batas waktu: unduhan stream Drive kadang menggantung tanpa kabar."""
    for k in range(coba):
        try:
            subprocess.run(["cp", src, dst], check=True, timeout=batas)
            return
        except subprocess.TimeoutExpired:
            if os.path.exists(dst):
                os.remove(dst)
    raise TimeoutError(f"salin gagal {coba}x (>{batas}s)")


def proses(path, sumber, tmp, **kw):
    """Salin satu berkas ke tmp, urai, hapus salinan."""
    salin = os.path.join(tmp, "satu_%d.xlsx" % threading.get_ident())
    try:
        print("baca", sederhana(path, sumber), file=sys.stderr, flush=True)
        salin_aman(path, salin)
        return baca_xlsx(salin, sederhana(path, sumber), **kw)
    finally:
        if os.path.exists(salin):
            os.remove(salin)


def proses_zip(path, sumber, tmp):
    rows, ringkas = [], {}
    salin = os.path.join(tmp, "satu.zip")
    ekstrak = os.path.join(tmp, "zip_isi")
    try:
        salin_aman(path, salin)
        with zipfile.ZipFile(salin) as z:
            for nama in z.namelist():
                if not nama.lower().endswith(".xlsx") or nama.endswith("/"):
                    continue
                os.makedirs(ekstrak, exist_ok=True)
                tujuan = os.path.join(ekstrak, "satu.xlsx")
                with z.open(nama) as a, open(tujuan, "wb") as b:
                    shutil.copyfileobj(a, b)
                try:
                    x, info = baca_xlsx(tujuan, sederhana(path, sumber) + "!" + nama, "tabel")
                    rows += x
                    ringkas[nama] = len(x)
                finally:
                    os.remove(tujuan)
    finally:
        for f in (salin,):
            if os.path.exists(f):
                os.remove(f)
        shutil.rmtree(ekstrak, ignore_errors=True)
    return rows, ringkas


def tulis(keluaran, nama, rows):
    seen, uniq, dup = set(), [], 0
    for r in rows:
        k = json.dumps({a: b for a, b in r.items() if a not in ("sumber_berkas", "lembar")}, sort_keys=True, ensure_ascii=False)
        if k in seen:
            dup += 1
            continue
        seen.add(k)
        uniq.append(r)
    with open(os.path.join(keluaran, nama + ".jsonl"), "w", encoding="utf8") as f:
        for r in uniq:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    tg = sorted(r["tanggal"] for r in uniq if r.get("tanggal"))
    return {"baris": len(uniq), "duplikat_dibuang": dup, "tanggal_min": tg[0] if tg else None, "tanggal_maks": tg[-1] if tg else None,
            "tanpa_tanggal": sum(1 for r in uniq if not r.get("tanggal"))}


def jalankan(a):
    if openpyxl is None:
        sys.exit("openpyxl tidak ditemukan")
    sumber = os.path.abspath(a.sumber)
    os.makedirs(a.keluaran, exist_ok=True)
    tmp = a.tmp or tempfile.mkdtemp(prefix="pusdalops_")
    os.makedirs(tmp, exist_ok=True)
    j = temukan(sumber)
    hanya = set(a.hanya.split(",")) if a.hanya else None
    ring = {"berkas": {}, "gagal": [], "keluaran": {}, "gsheet_medsos_tak_terbaca": j["medsos_gsheet"]}
    hasil = {k: [] for k in ("rekap_harian", "medsos_tv_2025", "rekap_daerah", "sk_kekeringan_tidak_terbit", "kematian_2024")}

    antre = []

    def kerja(kunci, path, **kw):  # dikumpulkan dulu, dijalankan paralel di bawah
        antre.append((kunci, path, kw))

    if not hanya or "harian" in hanya:
        for f in j["harian"]:
            b = os.path.basename(f).lower()
            if "rekap dampak" in b:
                ring["gagal"].append({"berkas": sederhana(f, sumber), "alasan": "REKAP DAMPAK 2016: lembar per provinsi, header tak seragam; tidak diurai"})
            elif "rekap kejadian" in b:
                kerja("rekap_harian", f, mode="matriks2016")
            else:
                kerja("rekap_harian", f, mode="tabel", fallback_jenis="kekeringan" if "kekeringan" in b else None)
    if not hanya or "medsos" in hanya:
        for f in j["medsos"]:
            kerja("medsos_tv_2025", f, mode="tabel")
        for z in j["medsos_zip"]:
            try:
                rows, rg = proses_zip(z, sumber, tmp)
                hasil["medsos_tv_2025"] += rows
                ring["berkas"][sederhana(z, sumber)] = {"baris": len(rows), "isi_zip": rg}
            except Exception as e:
                ring["gagal"].append({"berkas": sederhana(z, sumber), "alasan": f"{type(e).__name__}: {e}"[:200]})
    if not hanya or "daerah" in hanya:
        for f in j["daerah"]:
            kerja("rekap_daerah", f, mode="tabel")
    if not hanya or "sk" in hanya:
        for f in j["sk"]:
            kerja("sk_kekeringan_tidak_terbit", f, mode="sk")
    if not hanya or "kematian" in hanya:
        for f in j["kematian"]:
            kerja("kematian_2024", f, mode="tabel", hanya_lembar_pertama=True)
    def satu(item):
        kunci, path, kw = item
        try:
            return item, proses(path, sumber, tmp, **kw), None
        except Exception as e:  # satu berkas rusak tidak menghentikan sisanya
            return item, None, f"{type(e).__name__}: {e}"[:200]

    with concurrent.futures.ThreadPoolExecutor(max_workers=a.paralel) as ex:
        for (kunci, path, kw), res, galat in ex.map(satu, antre):
            rel = sederhana(path, sumber)
            if galat:
                ring["gagal"].append({"berkas": rel, "alasan": galat})
                continue
            rows, info = res
            hasil[kunci] += rows
            ring["berkas"][rel] = {"baris": len(rows), **info}
            if info["dilewati"] and not rows:
                ring["gagal"].append({"berkas": rel, "alasan": "format lembar tak dikenali: " + ", ".join(info["dilewati"][:6])})
    for k, rows in hasil.items():
        ring["keluaran"][k] = tulis(a.keluaran, k, rows)
    with open(os.path.join(a.keluaran, "ringkasan.json"), "w", encoding="utf8") as f:
        json.dump(ring, f, ensure_ascii=False, indent=1)
    print(json.dumps(ring["keluaran"], ensure_ascii=False, indent=1))
    print("gagal:", len(ring["gagal"]))


# ---------------------------------------------------------------- self-check
def uji():
    h = [["No", "LOKASI", None, "Jenis Bencana", "DAMPAK", None, None, None, None],
         [None, None, None, None, "Korban", None, None, "Kerusakan", None],
         [None, None, None, None, None, "Pengungsi (jiwa)", "Terdampak", "Rumah", None],
         ["No", "Provinsi", "Kabupaten/Kota", "Jenis Bencana", "MD", "H", "Jiwa", "RB", "RR"]]
    p = peta(ratakan(h))
    assert p["prov"] == [1] and p["kab"] == [2] and p["jenis"] == [3], p
    assert p["md"] == [4] and p["png_h"] == [5] and p["tdk_jiwa"] == [6] and p["rb"] == [7] and p["rr"] == [8], p
    ctx = {}
    r = baris_ke_rekaman((1.0, "Jawa Tengah", "Kab. Demak", "Banjir Rob", 2, 150, 9.662, 3, None), p, ctx)
    assert r["prov"] == "33" and r["jenis"] in ("banjir", "gelombang_pasang") and r["meninggal"] == 2 and r["mengungsi"] == 150, r
    assert r["terdampak_jiwa"] == 9662 and r["rumah_rb"] == 3 and r["rumah_rr"] is None, r
    r2 = baris_ke_rekaman((2.0, None, "Kab. Kudus", "Longsor", None, None, None, None, None), p, ctx)
    assert r2["prov"] == "33" and r2["jenis"] == "longsor", r2   # provinsi menurun dari baris sebelumnya
    assert cari_header([[None, None], ["No", "x"], ["a"], [1.0, "y"]]) == (1, 3)
    assert angka("1.904") == 1904 and angka("x") is None and angka(3.0) == 3
    pk = peta(ratakan([["No.", "Lokasi", None, "Waktu Kejadian"], [None, "Provinsi/ Kabupaten/ Kota", "Kecamatan/Desa", None]]))
    assert pk["provkab"] == [1] and pk["wkt"] == [3], pk
    assert prov_kab("Prov. Jawa Barat\nKab. Bogor\nKab. Bekasi") == ("Jawa Barat", ["Kab. Bogor", "Kab. Bekasi"])
    print("uji pusdalops_xlsx: ok")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
        ap.add_argument("--sumber", required=True)
        ap.add_argument("--keluaran", default=os.path.join(AKAR, "data/raw/pusdalops_unik"))
        ap.add_argument("--tmp")
        ap.add_argument("--paralel", type=int, default=6, help="salinan Drive serentak (satu berkas kecil per pekerja)")
        ap.add_argument("--hanya", help="harian,medsos,daerah,sk,kematian")
        jalankan(ap.parse_args())
