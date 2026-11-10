"""Factsheet Monitoring dan Potensi Karhutla BMKG -> public/banjir/data/karhutla_bmkg.json + arsip bulanan append-only.

Sumber: https://dataweb.bmkg.go.id/cuaca/dokumen/factsheet-karhutla.pdf (7 halaman; BMKG hanya menyimpan edisi terbaru, jadi arsip wajib).
PDF diunduh ke folder sementara, dibaca `pdftotext -layout`, dihapus; PDF tidak masuk repo. Gambar tidak dibaca (hanya teks).
Keputusan pemilik 10 Nov 2026: terus diambil dan diolah (ketentuan akses otomatis BMKG sudah diketahui pemilik).
Tiap bagian diurai sendiri: yang tak terbaca jadi null dan tercatat di `bagian` ("ok", "sebagian: ...", "gagal: ..."); tidak ditebak.
Nama wilayah -> kode BPS lewat helper scripts/cuaca/factsheet.py; yang tak dikenal masuk `tak_dikenal`, teks asli tetap `teks`.
Daftar produk gambar sah (`produk`) dicek HEAD saja (last-modified), tidak diunduh.
Arsip: karhutla_bmkg_arsip_<YYYY-MM>.json {"terbit": {tanggal dokumen: isi}}; entri tak pernah diubah.
Gagal-lunak: unduh/urai gagal -> berkas lama dibiarkan, keluar 0 dengan ::warning.
Pakai: python3.12 scripts/data/factsheet_karhutla.py [berkas.pdf] | ... uji
"""
import concurrent.futures as cf, datetime as dt, json, os, re, shutil, subprocess, sys, tempfile, urllib.request

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/cuaca"))
from dasar import KELUAR, PROVINSI, WIB, simpan  # noqa: E402
from factsheet import kode_prov as _kode, daftar_prov  # noqa: E402

URL = "https://dataweb.bmkg.go.id/cuaca/dokumen/factsheet-karhutla.pdf"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
BERKAS = os.path.join(KELUAR, "karhutla_bmkg.json")
BULAN = {b: i + 1 for i, b in enumerate("Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember".split())}
SINGKAT = {"kalteng": "62", "kaltim": "64", "kalbar": "61", "kalsel": "63", "kaltara": "65", "sulteng": "72", "sulbar": "76", "sulsel": "73",
           "sultra": "74", "sulut": "71", "sumut": "12", "sumbar": "13", "sumsel": "16", "jabar": "32", "jateng": "33", "jatim": "35"}
PULAU = "Sumatera|Kalimantan|Jawa|Nusa Tenggara|Sulawesi|Papua dan Maluku"
PRODUK_SPARTAN = [f"https://dataweb.bmkg.go.id/cuaca/spartan/36_indonesia_{k}_{w}.png"
                  for k in "fwi ffmc dmc dc isi bui".split() for w in ["obs"] + [f"{i:02d}" for i in range(8)]]
PRODUK_LAIN = {"asap": "https://inderaja.bmkg.go.id/Trajektori/Asap.png", "hotspot": "https://inderaja.bmkg.go.id/IMAGE/HOTSPOT/Hotspot_Indonesia.png"}


def kode_prov(s):
    s = re.sub(r"\s+", " ", (s or "").strip().rstrip(".,"))
    return SINGKAT.get(s.lower()) or _kode(s)


def wilayah(teks):
    """Daftar wilayah dalam teks -> {teks, kode_prov, tak_dikenal}. 'sebagian', 'pesisir utara' dst dikupas; pulau/bagian pulau jadi tak_dikenal."""
    teks = re.sub(r"\s+", " ", teks).strip().rstrip(".")
    kode, tak = [], []
    for tok in re.split(r",\s*(?:dan\s+)?|\s+dan\s+", teks):
        tok = tok.strip()
        if not tok:
            continue
        t = tok
        for _ in range(3):
            t = re.sub(r"^(?:sebagian(?: besar| kecil)?|pesisir (?:utara|selatan|barat|timur)|wilayah|pulau)\s+", "", t, flags=re.I)
        k = kode_prov(t)
        if k:
            if k not in kode:
                kode.append(k)
        else:
            tak.append(tok)
    return {"teks": teks, "kode_prov": kode, "tak_dikenal": tak}


def tgl(d, b, th):
    return f"{int(th):04d}-{BULAN[b.capitalize()]:02d}-{int(d):02d}"


def rentang(s):
    """'10 - 16 November 2026' | '26 Agustus - 10 November 2026' -> (dari, sampai) ISO."""
    m = re.search(r"(\d+)(?:\s+([A-Za-z]+))?(?:\s+(\d{4}))?\s*[-–]\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})", s)
    if not m:
        return None, None
    d1, b1, t1, d2, b2, t2 = m.groups()
    b1 = b1 or b2
    t1 = t1 or (t2 if BULAN[b1.capitalize()] <= BULAN[b2.capitalize()] else str(int(t2) - 1))
    return tgl(d1, b1, t1), tgl(d2, b2, t2)


def f(pola, teks, g=1, tipe=None, flags=re.S):
    """Grup pertama pola atau None; tipe=float mengubah ',' jadi '.'."""
    m = re.search(pola, teks, flags)
    if not m:
        return None
    v = m.group(g)
    return float(v.replace(",", ".")) if tipe is float else v


def bersih(t):
    t = t.replace("​", "")
    return [b.rstrip() for b in t.splitlines()
            if b.strip() and not re.match(r"^\s*(Fact Sheet Monitoring dan Potensi.*|Badan Meteorologi Klimatologi dan Geofisika - .*?\s*\d*)$", b)]


def bagian_teks(baris):
    """{1..7: 'teks tersambung'} dari kepala `n) HURUF-BESAR`; tanggal/sampul dibawa di kunci 0."""
    pos = [(i, int(m.group(1))) for i, b in enumerate(baris) if (m := re.match(r"^\s*([1-7])\)\s+[A-Z]{3,}", b))]
    out = {0: " ".join(x.strip() for x in baris[:pos[0][0]] if pos) if pos else " ".join(baris)}
    for j, (i, n) in enumerate(pos):
        fin = pos[j + 1][0] if j + 1 < len(pos) else len(baris)
        out[n] = " ".join(x.strip() for x in baris[i + 1:fin])
    return out


def butir(teks):
    """'1. xxx 2. yyy' -> {1: xxx, 2: yyy} (nomor naik berurutan saja)."""
    out, nxt, pos = {}, 1, []
    for m in re.finditer(r"(?:(?<=\s)|^)(\d)\.\s+(?=[A-Z])", teks):
        if int(m.group(1)) == nxt:
            pos.append((nxt, m.start(), m.end()))
            nxt += 1
    for j, (n, _, e) in enumerate(pos):
        out[n] = teks[e:pos[j + 1][1] if j + 1 < len(pos) else len(teks)].strip()
    return out


def status(d, wajib):
    kosong = [k for k in wajib if d.get(k) in (None, [], {})]
    return "ok" if not kosong else ("gagal: semua kosong" if len(kosong) == len(wajib) else "sebagian: tak terbaca " + ",".join(kosong))


# ---------- bagian ----------
def p_sampul(t):
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", t)
    tanggal = tgl(*m.groups()) if m else None
    b = re.search(r"Berlaku tanggal:\s*(.*?)(?:Fact Sheet|$)", t)
    dari, sampai = rentang(b.group(1)) if b else (None, None)
    return {"tanggal": tanggal, "berlaku_dari": dari, "berlaku_sampai": sampai}


def p_atmosfer(t):
    b = butir(t)
    a, c = b.get(1, ""), b.get(2, "")
    das = re.search(r"Dasarian\s+(I{1,3})\s+([A-Za-z]+ \d{4})", a)
    iod_b = re.search(r"\((\w+)\s*:\s*([+-]?\d+[.,]\d+)\)", a)
    enso = re.search(r"ENSO \(3 bulanan\) untuk (\w+) \(([^)]+)\) sebesar ([+-]?\d+[.,]\d+), menunjukkan (.+?)\.(?:\s|$)", a)
    return {
        "dasarian": f"{das.group(1)} {das.group(2)}" if das else None,
        "iod_dasarian": f(r"IOD dasarian[^+\-\d]*([+-]?\d+[.,]\d+)", a, tipe=float),
        "iod_bulanan": {"bulan": iod_b.group(1), "nilai": float(iod_b.group(2).replace(",", "."))} if iod_b else None,
        "nino34_anomali_sst": f(r"Nino3\.4 secara dasarian sebesar ([+-]?\d+[.,]\d+)", a, tipe=float),
        "enso": {"periode": enso.group(1), "bulan": enso.group(2), "nilai": float(enso.group(3).replace(",", ".")), "label": enso.group(4)} if enso else None,
        "kondisi_umum": (f(r"^(.*?\.)(?:\s|$)", c) if c else None),
        "mjo_spasial": (lambda x: wilayah(x) if x else None)(f(r"MJO Spasial:\s*(.*?)\.\s*Kemudian", c)),
        "rossby": (lambda x: wilayah(x) if x else None)(f(r"Rossby Ekuatorial.*?aktif di wilayah (.*?),?\s+dan Gelombang Kelvin", c)),
        "kelvin": (lambda x: wilayah(x) if x else None)(f(r"Kelvin.*?aktif di wilayah (.*?)\.\s*$", c)),
    }, ["dasarian", "iod_dasarian", "iod_bulanan", "nino34_anomali_sst", "enso", "mjo_spasial", "rossby", "kelvin"]


def p_cuaca(t):
    b = butir(t)
    a, c = b.get(1, ""), b.get(2, "")
    aw = f(r"kategori tinggi \(([^)]+)\) terdapat di wilayah (.*?)\.\s*$", a, g=2)
    umum = f(r"umumnya (.*?)\.\s*Potensi", c)
    ring = f(r"hujan ringan - sedang terdapat di sebagian wilayah (.*?)\.\s*Potensi", c)
    lebat = f(r"hujan sedang - lebat terdapat di sebagian wilayah (.*?)\.\s*$", c)
    return {
        "awan_hujan_tinggi": {"ambang": f(r"kategori tinggi \(([^)]+)\)", a), **wilayah(aw)} if aw else None,
        "umum": umum,
        "hujan_ringan_sedang": wilayah(ring) if ring else None,
        "hujan_sedang_lebat": wilayah(lebat) if lebat else None,
    }, ["awan_hujan_tinggi", "umum", "hujan_ringan_sedang", "hujan_sedang_lebat"]


def p_hujan(t):
    b = butir(t)
    a, c = b.get(1, ""), b.get(2, "")
    k1, k2 = (a.split("Sedangkan", 1) + [""])[:2]
    sl = f(r"terjadi di sebagian wilayah (.*?)\.\s*$", k1.strip() + ".") if k1 else None
    rs = f(r"terjadi di sebagian wilayah (.*?)\.\s*$", k2.strip()) if k2 else None
    return {"sedang_lebat_24j": wilayah(sl) if sl else None, "ringan_sedang_24j": wilayah(rs) if rs else None}, ["sedang_lebat_24j", "ringan_sedang_24j"]


def p_asap(t):
    c = butir(t).get(2, "")
    kal = [x.strip() for x in re.split(r"\.\s+(?=Terpantau|Sebaran|Arah)", c)]
    ada = lambda p: next((k for k in kal if re.search(p, k)), "")  # noqa: E731
    asap = f(r"terdeteksi di wilayah (.*?)\.?$", ada(r"^Asap terdeteksi"))
    lb = f(r"\(transboundary haze\) dari (.+?) ke (.+?)\.?$", ada("lintas batas"), g=0)
    lbm = re.search(r"dari (.+?) ke (.+?)\.?$", ada("lintas batas"))
    sb = f(r"ke arah (.+?)\.?$", ada("Sebaran asap"))
    ang = re.search(r"bertiup dari (.+?) ke (.+?)\.?$", ada("Arah angin"))
    sp = lambda s: [x.strip() for x in s.split(" - ")] if s else None  # noqa: E731
    return {
        "provinsi_berasap": wilayah(asap) if asap else None,
        "lintas_batas": {"ada": True, "dari": lbm.group(1), "ke": lbm.group(2), "ke_kode_prov": kode_prov(lbm.group(2)), "teks": ada("lintas batas")} if lb and lbm else None,
        "arah_sebaran_asap": {"teks": sb, "arah": sp(sb)} if sb else None,
        "arah_angin": {"dari": sp(ang.group(1)), "ke": sp(ang.group(2)), "teks": ada("Arah angin")} if ang else None,
    }, ["provinsi_berasap", "lintas_batas", "arah_sebaran_asap", "arah_angin"]


def p_titik(t):
    c = butir(t).get(3, "")
    m = re.search(r"pada (\d{1,2}) ([A-Za-z]+) (\d{4}) \((\d\d)[.:](\d\d)\s*[–-]\s*(\d\d)[.:](\d\d) WIB\)", c)
    pm = [(x.start(), x.group(1)) for x in re.finditer(rf"[Dd]i (?:wilayah )?({PULAU}|Papua|Maluku)\s+(?:terdeteksi|tercatat|terdapat)", c)]
    tot = f(r"(?:terdeteksi|tercatat|terdapat)[^.]*?(\d+) titik", c)
    pulau = {}
    for j, (p0, nama) in enumerate(pm):
        seg = c[p0:pm[j + 1][0] if j + 1 < len(pm) else len(c)]
        n = f(r"(?:terdeteksi|tercatat|terdapat)[^.]*?(\d+) titik", seg)
        prov, tak = [], []
        for x in re.finditer(r"([A-Z][A-Za-z.]*(?: [A-Z][A-Za-z.]*)*) \((\d+) titik\)", seg):
            k = kode_prov(x.group(1))
            (prov if k else tak).append({"kode_prov": k, "nama": x.group(1), "titik": int(x.group(2))} if k else {"nama": x.group(1), "titik": int(x.group(2))})
        pulau[nama] = {"titik": int(n) if n is not None else None, "provinsi": prov, "tak_dikenal": tak,
                       "konsisten": (sum(p["titik"] for p in prov + tak) == int(n)) if n is not None and (prov or tak) else None}
    nas = f(r"total nasional[^.]*?mencapai (\d+) titik", c)
    res = {
        "tingkat_kepercayaan": "tinggi" if re.search(r"tingkat kepercayaan tinggi", c) else None,
        "tanggal": tgl(*m.group(1, 2, 3)) if m else None,
        "dari": f"{m.group(4)}:{m.group(5)}" if m else None, "sampai": f"{m.group(6)}:{m.group(7)}" if m else None, "zona": "WIB" if m else None,
        "per_pulau": pulau or None,
        "total_nasional": int(nas) if nas else None,
    }
    if res["total_nasional"] is not None and pulau and all(p["titik"] is not None for p in pulau.values()):
        res["total_cocok_jumlah_pulau"] = sum(p["titik"] for p in pulau.values()) == res["total_nasional"]
    return res, ["tingkat_kepercayaan", "tanggal", "dari", "per_pulau", "total_nasional"]


def p_prioritas(t):
    c = butir(t).get(4, "")
    daf = f(r"yaitu (.*?)\.\s*Jumlah", c)
    fl = f(r"kepercayaan tinggi di (.*?) fluktuatif", c)
    no = re.search(r"Di provinsi (.+?) tidak terdeteksi titik panas dalam (\d+) hari", c)
    return {
        "provinsi": wilayah(daf) if daf else None,
        "fluktuatif": wilayah(fl) if fl else None,
        "tanpa_titik": {"kode_prov": kode_prov(no.group(1)), "nama": no.group(1), "hari": int(no.group(2))} if no else None,
        "teks": c or None,
    }, ["provinsi", "fluktuatif", "tanpa_titik"]


def p_fwi(t):
    per = f(r"pada periode (.*?)\s*:", t)
    dari, sampai = rentang(per.replace("hingga", "-")) if per else (None, None)
    out = {"berlaku_dari": dari, "berlaku_sampai": sampai, "per_pulau": {}}
    for n, v in butir(t).items():
        nama = f(r"Wilayah (\w+) diprediksi", v)
        rend = re.search(r"kategori (\w+) \((\w+)\)\s*hingga (.+?) \((\w+)\)", v)
        tin = f(r"tertinggi terdapat di sebagian wilayah (.*?)\.\s*$", v)
        if nama:
            out["per_pulau"][nama] = {"rentang": {"dari": rend.group(1), "warna_dari": rend.group(2), "sampai": rend.group(3), "warna_sampai": rend.group(4)} if rend else None,
                                      "risiko_tertinggi": wilayah(tin) if tin else None}
    out["per_pulau"] = out["per_pulau"] or None
    return out, ["berlaku_dari", "per_pulau"]


def p_omc(t):
    out = []
    for n, v in butir(t).items():
        m = re.match(r"Provinsi (.+?)(?: \((.+?)\))?,\s*dilaksanakan pada periode (.*?)\.?$", v)
        if not m:
            out.append({"no": n, "teks": v, "kode_prov": None, "dari": None, "sampai": None})
            continue
        dari, sampai = rentang(m.group(3))
        out.append({"no": n, "provinsi": m.group(1), "kode_prov": kode_prov(m.group(1)), "lokasi": m.group(2), "dari": dari, "sampai": sampai, "teks": v})
    return {"daftar": out or None}, ["daftar"]


def p_rekom(t):
    w = f(r"di antaranya adalah (.*?)\.\s*$", t)
    return {"perhatian_khusus": wilayah(w) if w else None, "teks": t.strip() or None}, ["perhatian_khusus"]


def urai(teks):
    sec = bagian_teks(bersih(teks))
    dok, st = p_sampul(sec[0]), {}
    if not dok["tanggal"]:
        raise ValueError("tanggal dokumen tak terbaca")
    for nama, n, fn in (("dinamika_atmosfer", 1, p_atmosfer), ("potensi_cuaca_sepekan", 2, p_cuaca), ("hujan_24j", 3, p_hujan), ("asap", 3, p_asap),
                        ("titik_panas", 3, p_titik), ("provinsi_prioritas", 3, p_prioritas), ("potensi_fwi", 4, p_fwi), ("omc", 5, p_omc), ("rekomendasi", 6, p_rekom)):
        try:
            if n not in sec:
                raise KeyError(f"kepala {n}) tak ada")
            if nama == "provinsi_prioritas":  # butir 4 ada di bagian 3
                isi, wajib = fn(sec[3])
            elif nama in ("hujan_24j", "asap", "titik_panas"):
                isi, wajib = fn(sec[3])
            else:
                isi, wajib = fn(sec[n])
            dok[nama], st[nama] = isi, status(isi, wajib)
        except Exception as x:
            dok[nama], st[nama] = None, f"gagal: {type(x).__name__} {x}"
    dok["bagian"] = st
    dok["teks_bagian"] = {str(k): v for k, v in sec.items() if k}
    dok["ringkas"] = ringkas(dok)
    return dok


def ringkas(d):
    nm = lambda ks: ", ".join(PROVINSI.get(k, k) for k in ks)  # noqa: E731
    tp, fw, rk, om = d.get("titik_panas") or {}, d.get("potensi_fwi") or {}, d.get("rekomendasi") or {}, d.get("omc") or {}
    pr = d.get("provinsi_prioritas") or {}
    top = sorted([(p["titik"], p["nama"]) for x in (tp.get("per_pulau") or {}).values() for p in x["provinsi"] + x["tak_dikenal"]], reverse=True)[:3]
    eso = (d.get("dinamika_atmosfer") or {}).get("enso") or {}
    return {
        "tanggal": d["tanggal"], "berlaku": [d["berlaku_dari"], d["berlaku_sampai"]],
        "titik_tinggi_nasional": tp.get("total_nasional"), "titik_tanggal": tp.get("tanggal"),
        "provinsi_titik_terbanyak": [{"nama": n, "titik": t} for t, n in top] or None,
        "enso": eso.get("label"), "n_omc": len(om.get("daftar") or []) if om else None,
        "n_prov_perhatian_khusus": len((rk.get("perhatian_khusus") or {}).get("kode_prov") or []) if rk else None,
        "prov_tanpa_titik_7hari": (pr.get("tanpa_titik") or {}).get("nama"),
        "teks": (f"Titik panas kepercayaan tinggi {tp['tanggal']}: {tp['total_nasional']} titik nasional"
                 + (f"; terbanyak {top[0][1]} ({top[0][0]})" if top else "")
                 + (f". Perhatian khusus: {nm((rk.get('perhatian_khusus') or {}).get('kode_prov') or [])}" if rk.get("perhatian_khusus") else "") + ".")
        if tp.get("total_nasional") is not None and tp.get("tanggal") else None,
    }


# ---------- produk gambar ----------
def head(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, method="HEAD", headers={"User-Agent": UA}), timeout=30) as r:
            return {"url": u, "status": r.status, "last_modified": r.headers.get("Last-Modified"), "tipe": r.headers.get("Content-Type")}
    except Exception as x:
        return {"url": u, "status": getattr(x, "code", None), "last_modified": None, "tipe": None, "galat": type(x).__name__}


def produk():
    with cf.ThreadPoolExecutor(6) as ex:
        sp = list(ex.map(head, PRODUK_SPARTAN))
        lain = dict(zip(PRODUK_LAIN, ex.map(head, PRODUK_LAIN.values())))
    return {"dicek": dt.datetime.now(WIB).isoformat(timespec="minutes"), "tidak_diunduh": True, "spartan_fwi_dan_komponen": sp, **lain,
            "keterangan": "spartan: {fwi,ffmc,dmc,dc,isi,bui}_{obs,00..07}; 00..07 = langkah prakiraan; obs = pengamatan"}


def pdf_ke_teks(jalur):
    return subprocess.run(["pdftotext", "-layout", jalur, "-"], capture_output=True, text=True, check=True, timeout=120).stdout


def main():
    d0 = tempfile.mkdtemp()
    try:
        jalur = sys.argv[1] if len(sys.argv) > 1 else os.path.join(d0, "fs.pdf")
        if len(sys.argv) <= 1:
            with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": UA}), timeout=120) as r, open(jalur, "wb") as fh:
                shutil.copyfileobj(r, fh)
        dok = urai(pdf_ke_teks(jalur))
        if not any(v == "ok" or v.startswith("sebagian") for v in dok["bagian"].values()):
            raise RuntimeError(f"tak ada bagian terbaca: {dok['bagian']}")
    except Exception as x:
        print(f"::warning::factsheet karhutla BMKG gagal ({type(x).__name__}: {x}); berkas lama dibiarkan", file=sys.stderr)
        return 0
    finally:
        shutil.rmtree(d0, ignore_errors=True)
    dok.update(diambil=dt.datetime.now(WIB).isoformat(timespec="minutes"), sumber="BMKG Factsheet Monitoring dan Potensi Karhutla (dataweb.bmkg.go.id), teks saja", url=URL)
    jal = os.path.join(KELUAR, f"karhutla_bmkg_arsip_{dok['tanggal'][:7]}.json")
    try:
        isi = json.load(open(jal)) if os.path.exists(jal) else {"versi": 1, "bulan": dok["tanggal"][:7], "sumber": "BMKG Factsheet Karhutla; entri tidak diubah sesudah terbit", "terbit": {}}
        assert isinstance(isi["terbit"], dict)
    except Exception as x:
        print(f"::warning::{jal} rusak ({x}): berhenti", file=sys.stderr)
        return 0
    baru = dok["tanggal"] not in isi["terbit"]
    if baru:
        isi["terbit"][dok["tanggal"]] = dok
        simpan(jal, isi)
    dok = {**dok, "produk": produk()}
    simpan(BERKAS, dok)
    bad = {k: v for k, v in dok["bagian"].items() if v != "ok"}
    print(f"karhutla_bmkg {dok['tanggal']}: {dok['ringkas']['teks']} arsip {'ditambah' if baru else 'sudah ada'}; bagian tak ok: {bad}", file=sys.stderr)
    return 0


def uji():
    teks = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture_factsheet_karhutla.txt")).read()
    d = urai(teks)
    assert (d["tanggal"], d["berlaku_dari"], d["berlaku_sampai"]) == ("2026-11-10", "2026-11-10", "2026-11-16"), d["tanggal"]
    assert all(v == "ok" for v in d["bagian"].values()), d["bagian"]
    a = d["dinamika_atmosfer"]
    assert a["iod_dasarian"] == 0.659 and a["iod_bulanan"] == {"bulan": "Oktober", "nilai": 0.696} and a["nino34_anomali_sst"] == 3.57, a
    assert a["enso"]["nilai"] == 3.09 and a["enso"]["periode"] == "ASO" and a["enso"]["label"].startswith("El Nino event"), a["enso"]
    assert a["dasarian"] == "III Oktober 2026" and "62" in a["mjo_spasial"]["kode_prov"] and "Pesisir barat Sumatera" in a["mjo_spasial"]["tak_dikenal"], a["mjo_spasial"]
    assert "11" in a["rossby"]["kode_prov"] and "82" in a["rossby"]["kode_prov"] and a["kelvin"]["kode_prov"] == ["11"], (a["rossby"], a["kelvin"])
    c = d["potensi_cuaca_sepekan"]
    assert c["awan_hujan_tinggi"]["ambang"] == ">70%" and "36" in c["awan_hujan_tinggi"]["kode_prov"] and c["umum"].startswith("cerah berawan"), c
    assert "16" in c["hujan_ringan_sedang"]["kode_prov"] and "19" in c["hujan_ringan_sedang"]["kode_prov"] and "96" in c["hujan_sedang_lebat"]["kode_prov"]
    h = d["hujan_24j"]
    assert "34" in h["ringan_sedang_24j"]["kode_prov"] and "34" not in h["sedang_lebat_24j"]["kode_prov"] and "31" not in h["sedang_lebat_24j"]["kode_prov"], h
    s = d["asap"]
    assert s["provinsi_berasap"]["kode_prov"] == ["16", "62", "63", "72", "74", "81", "94", "93"], s["provinsi_berasap"]
    assert (s["lintas_batas"]["dari"], s["lintas_batas"]["ke"], s["lintas_batas"]["ke_kode_prov"]) == ("Papua Nugini", "Papua Selatan", "93"), s["lintas_batas"]
    assert s["arah_sebaran_asap"]["arah"] == ["Barat Daya", "Barat Laut"] and s["arah_angin"]["dari"] == ["Timur", "Tenggara"] and s["arah_angin"]["ke"] == ["Barat", "Barat Laut"], s
    tp = d["titik_panas"]
    assert tp["tanggal"] == "2026-11-09" and (tp["dari"], tp["sampai"]) == ("00:00", "23:59") and tp["total_nasional"] == 77 and tp["total_cocok_jumlah_pulau"] is True, tp
    assert {k: v["titik"] for k, v in tp["per_pulau"].items()} == {"Sumatera": 2, "Kalimantan": 5, "Jawa": 0, "Nusa Tenggara": 8, "Sulawesi": 54, "Papua dan Maluku": 8}, tp["per_pulau"]
    assert all(v["konsisten"] in (True, None) for v in tp["per_pulau"].values()) and tp["per_pulau"]["Sulawesi"]["provinsi"][0] == {"kode_prov": "74", "nama": "Sulawesi Tenggara", "titik": 36}, tp["per_pulau"]["Sulawesi"]
    pr = d["provinsi_prioritas"]
    assert pr["provinsi"]["kode_prov"] == ["14", "15", "16", "61", "62", "63", "64"] and pr["tanpa_titik"] == {"kode_prov": "14", "nama": "Riau", "hari": 7} and "14" not in pr["fluktuatif"]["kode_prov"], pr
    w = d["potensi_fwi"]
    assert (w["berlaku_dari"], w["berlaku_sampai"]) == ("2026-11-10", "2026-11-16") and w["per_pulau"]["Kalimantan"]["risiko_tertinggi"]["kode_prov"] == ["62", "63", "64"], w
    assert w["per_pulau"]["Sumatera"]["rentang"] == {"dari": "Rendah", "warna_dari": "biru", "sampai": "Sangat Tinggi", "warna_sampai": "merah"}, w["per_pulau"]["Sumatera"]
    o = d["omc"]["daftar"]
    assert len(o) == 4 and (o[0]["kode_prov"], o[0]["dari"], o[0]["sampai"]) == ("62", "2026-08-26", "2026-11-10") and o[2]["lokasi"] == "Danau Poso" and (o[3]["dari"], o[3]["sampai"]) == ("2026-11-09", "2026-11-11"), o
    assert o[2]["dari"] == "2026-10-21" and o[2]["sampai"] == "2026-11-20", o[2]
    assert d["rekomendasi"]["perhatian_khusus"]["kode_prov"] == ["16", "18", "62", "63", "64", "72", "73", "74", "81", "92", "94", "95", "93"], d["rekomendasi"]
    assert d["ringkas"]["titik_tinggi_nasional"] == 77 and d["ringkas"]["provinsi_titik_terbanyak"][0] == {"nama": "Sulawesi Tenggara", "titik": 36}, d["ringkas"]
    # nilai tak terbaca = null, bukan tebakan
    rusak = urai(teks.replace("sebesar +3.09", "sebesar ?").replace("mencapai 77 titik", "mencapai banyak titik"))
    assert rusak["dinamika_atmosfer"]["enso"] is None and rusak["titik_panas"]["total_nasional"] is None and rusak["bagian"]["titik_panas"].startswith("sebagian"), rusak["bagian"]
    # nama tak dikenal tercatat, teks asli tetap
    asing = wilayah("Aceh, Wakanda Timur dan Riau")
    assert asing == {"teks": "Aceh, Wakanda Timur dan Riau", "kode_prov": ["11", "14"], "tak_dikenal": ["Wakanda Timur"]}, asing
    assert rentang("9 - 11 November 2026") == ("2026-11-09", "2026-11-11") and rentang("28 Desember - 3 Januari 2027") == ("2026-12-28", "2027-01-03")
    print("uji hijau: karhutla_bmkg")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit(main())
