"""Halaman iklim BMKG (teks saja) -> public/banjir/data/iklim_bmkg.json (cuplikan terkini) + iklim_bmkg_arsip.json (append-only).

Sumber (hanya www.bmkg.go.id dan dataweb.bmkg.go.id; keputusan pemilik 10 Nov 2026, akses otomatis disadari): /iklim dan hub artikelnya
(prediksi-musim, analisis-hujan, dinamika-atmosfer, ketersediaan-air-tanaman, indeks-presipitasi-terstandarisasi, anomali-suhu-udara, buletin-iklim),
produk gambar (prediksi hujan bulanan/dasarian, ATi, SPI, El Nino, hari tanpa hujan: judul+URL, gambar TIDAK diunduh), narasi bulanan/dasarian dari
dataweb (`{pch|psh}_{bln|das}_narasi_step{N}.txt`), /siaran-pers, /gempabumi/ulasan-guncangan-tanah, /gempabumi/peta-isoseismal, dan direktori /profil/balai-upt.
Halaman Nuxt: <script id="__NUXT_DATA__"> (nuxt_semua dari bmkg_kab10). Hub hanya memuat 12 artikel terbaru: arsip lama TIDAK dikejar.
Tidak memakai $sauth-token dan tidak memanggil /api/content/list. Warna peta tidak dijadikan angka. Nilai tak terbaca = null.
Arsip kunci per slug/narasi tidak pernah ditimpa; slug yang sudah di arsip tidak diunduh lagi. Jeda minimal 2 detik per permintaan. Halaman gagal: dicatat,
yang lain jalan. Direktori UPT diambil sekali (ulang: argumen `upt`); tanpa nama kepala/PLT (repo publik).
Kab/kota di narasi dipetakan ke kode 4 digit repo (prov + urutan di public/geo/kabupaten, sama dengan laporan_cuaca.kab_indeks, BUKAN kode Kemendagri);
nama tak cocok tetap disimpan (`kode` null) dan masuk `tak_cocok`.
Pakai: python3 scripts/cuaca/iklim_bmkg.py | ... upt | ... uji
"""
import difflib, html as _html, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bmkg_kab10 import nuxt_semua, unduh
from dasar import KELUAR, PROVINSI, baca, sekarang, simpan

W = "https://www.bmkg.go.id"
DW = "https://dataweb.bmkg.go.id/iklim"
JEDA = 2.0
BERKAS = os.path.join(KELUAR, "iklim_bmkg.json")
ARSIP = os.path.join(KELUAR, "iklim_bmkg_arsip.json")
UPT = os.path.join(KELUAR, "bmkg_upt.json")
# beranda ("") paling akhir: artikel yang juga ada di hub tematik harus diurai dengan pengurai fakta hub itu
HUB_ARTIKEL = ["prediksi-musim", "analisis-hujan", "dinamika-atmosfer", "ketersediaan-air-tanaman", "indeks-presipitasi-terstandarisasi",
               "anomali-suhu-udara", "buletin-iklim", ""]
HUB_GAMBAR = ["prediksi-ketersediaan-air-tanaman", "prediksi-indeks-presipitasi-terstandarisasi"]
HALAMAN_TUNGGAL = ["el-nino-la-nina", "hari-tanpa-hujan"]
HUB_GEMPA = ["ulasan-guncangan-tanah", "peta-isoseismal"]
PRODUK_NARASI = {"bulanan": ("prediksi-hujan-bulanan", "bln"), "dasarian": ("prediksi-hujan-dasarian", "das")}
KATA_BENCANA = re.compile(r"banjir|longsor|siklon|gempa|tsunami|karhutla|kebakaran|hujan lebat|cuaca ekstrem|kekeringan|gelombang tinggi|erupsi|angin kencang|puting beliung|el ni[nñ]o|kemarau", re.I)

_akhir = [0.0]


def ambil(url):
    """Unduh dengan jeda minimal JEDA detik sejak permintaan sebelumnya."""
    t = _akhir[0] + JEDA - time.time()
    if t > 0:
        time.sleep(t)
    try:
        return unduh(url)
    finally:
        _akhir[0] = time.time()


# ---------- bentuk halaman ----------
def _pertama(vals, ok):
    return next((v for v in vals if ok(v)), None)


def artikel_dari(vals):
    return _pertama(vals, lambda v: isinstance(v, dict) and "content" in v and "title" in v)


def daftar_dari(vals):
    """Daftar artikel terpanjang (item punya slug+date)."""
    c = [v for v in vals if isinstance(v, list) and v and isinstance(v[0], dict) and {"slug", "date"} <= set(v[0])]
    return max(c, key=len) if c else []


def produk_dari(vals):
    return _pertama(vals, lambda v: isinstance(v, list) and v and isinstance(v[0], dict) and {"id", "image", "description"} <= set(v[0])) or []


def ref_dari(vals):
    return _pertama(vals, lambda v: isinstance(v, list) and v and isinstance(v[0], dict) and "step" in v[0]) or []


def gambar_dari(vals):
    return _pertama(vals, lambda v: isinstance(v, list) and v and isinstance(v[0], dict) and {"name", "image"} <= set(v[0]) and "id" in v[0] and "description" not in v[0]) or []


def num(s):
    try:
        return float(str(s).replace(",", "."))
    except (TypeError, ValueError):
        return None


def paragraf(h):
    h = re.sub(r"<(iframe|script|style)\b.*?</\1>", " ", h or "", flags=re.S)
    h = re.sub(r"<img[^>]*>", " ", h)
    h = re.sub(r"</(p|li|h\d|div|tr)>|<br\s*/?>", "\n", h)
    t = _html.unescape(re.sub(r"<[^>]+>", "", h)).replace("\xa0", " ")
    return [s for s in (re.sub(r"\s+", " ", l).strip() for l in t.split("\n")) if s and "Klik tautan ini" not in s]


def uniq(x):
    return list(dict.fromkeys(x))


def gambar_pdf(h):
    h = h or ""
    g = uniq(re.findall(r'<img[^>]*?\ssrc="([^"?]+)', h))
    p = uniq(re.sub(r"^https://docs\.google\.com/viewer\?url=", "", u.replace("&#038;", "&").split("&")[0]) for u in re.findall(r'(https?://[^"\s<]+?\.pdf)', h))
    return g, p


# ---------- pengurai isi ----------
def _lab(s):
    return re.split(r",| dan | atau |pada |periode |kategori |bulan ", s)[-1].strip(" ,.:")


def fakta_musim(par):
    teks = " ".join(par)
    zom = []
    for p in par:
        topik = ("awal_masuk" if "masuk musim" in p else "awal_dibanding" if re.search(r"awal musim", p, re.I) else "akumulasi" if re.search(r"akumulasi", p, re.I)
                 else "puncak_bulan" if re.search(r"puncak musim \w+ pada bulan", p, re.I) else "puncak_dibanding" if re.search(r"puncak musim", p, re.I)
                 else "panjang" if re.search(r"lebih (pendek|panjang)|sama dengan normal", p, re.I) else None)
        for m in re.finditer(r"([^()]{0,90}?)\((\d+) ZOM; ([\d.,]+)% luas daratan Indonesia\)", p):
            zom.append({"topik": topik, "label": _lab(m.group(1)) or None, "zom": int(m.group(2)), "persen": num(m.group(3))})
    enso = re.search(r"fase (El Ni[ñn]o|La Ni[ñn]a|Netral)([A-Za-z ]*?)(?:\.|,| hingga| yang|$)", teks)
    return {"enso_fase": (enso.group(1) + enso.group(2)).strip() if enso else None,
            "enso_indeks": num((re.search(r"ENSO[^.]*?menunjukkan nilai (?:sebesar )?([+-]?\d+[.,]\d+)", teks) or [0, None])[1]),
            "sst_anomali": num((re.search(r"mencapai angka ([+-]?\d+[.,]\d+)", teks) or [0, None])[1]),
            "zom": zom or None}


def peringatan(s):
    m = re.search(r"berlaku untuk\s*[“\"&#;8220]*(.*?)[”\"]*\s+pada klasifikasi\s*:\s*(.*)", s)
    if not m:
        return None
    out = {"berlaku": re.sub(r"[“”\"]", "", m.group(1)).strip(), "waspada": None, "siaga": None, "awas": None}
    cuts = list(re.finditer(r"(Waspada|Siaga|Awas)\s*:", m.group(2)))
    for i, c in enumerate(cuts):
        v = m.group(2)[c.end(): cuts[i + 1].start() if i + 1 < len(cuts) else None]
        v = re.sub(r"^\s*Beberapa kabupaten/kota di Provinsi\s*", "", v.strip(" ;."))
        out[c.group(1).lower()] = [x.strip() for x in re.split(r",\s*|\s+dan\s+", v) if x.strip()]
    return out


def bagian(par):
    out, kini = {}, None
    for p in par:
        m = re.match(r"^((?:Analisis|Prediksi|Peringatan)[^:]{3,110}?):\s*(.*)$", p)
        if m:
            kini = m.group(1)
            out[kini] = [m.group(2)] if m.group(2) else []
        elif kini:
            out[kini].append(p)
    return out


def fakta_dinamika(par):
    b = bagian(par)
    teks = " ".join(par)

    def sek(prefix):
        k = next((k for k in b if k.startswith(prefix)), None)
        return " ".join(b[k]) if k else None

    def f(rx, s=teks, g=1):
        m = re.search(rx, s)
        return num(m.group(g)) if m else None
    enso = re.search(r"Indeks ENSO \(3 bulanan\) untuk (\w+) \([^)]*\) sebesar ([+-]?\d+\.\d+), menunjukkan ([^.]+)\.", teks)
    hujan, sifat, musim = sek("Analisis Curah Hujan"), None, sek("Analisis Perkembangan Musim")
    if hujan:
        sifat = hujan
    mzom = re.search(r"([\d.,]+)% wilayah Indonesia \((\d+) ZOM\)", musim or "")
    return {"iod_dasarian": f(r"indeks IOD dasarian[^+-]*?([+-]\d+\.\d+)"), "iod_bulanan": f(r"\(\w+ ?: ?([+-]\d+\.\d+)\)"),
            "nino34_dasarian": f(r"Nino3\.4 secara dasarian sebesar ([+-]?\d+\.\d+)"),
            "enso_3bulan": {"periode": enso.group(1), "indeks": num(enso.group(2)), "kategori": enso.group(3)} if enso else None,
            "angin_850": sek("Analisis dan Prediksi Angin"), "olr": sek("Analisis OLR"), "mjo": sek("Analisis dan Prediksi MJO"),
            "mjo_fase": [int(x) for x in uniq(re.findall(r"Fase (\d)", sek("Analisis dan Prediksi MJO") or ""))] or None,
            "rh": sek("Analisis dan Prediksi Kelembapan"), "suhu": sek("Analisis dan Prediksi Suhu"),
            "rh_permukaan_pct": [int(x) for x in re.search(r"permukaan berkisar (\d+)-(\d+)%", teks).groups()] if re.search(r"permukaan berkisar (\d+)-(\d+)%", teks) else None,
            "peringatan_kekeringan": peringatan(sek("Peringatan Dini Kekeringan") or ""),
            "peringatan_hujan_tinggi": peringatan(sek("Peringatan Dini Curah Hujan") or ""),
            "hujan_kategori_pct": {k: f(rf"{k} ([\d.,]+)%", hujan or "") for k in ("Tinggi", "Menengah", "Rendah")} if hujan else None,
            "sifat_pct": ({"atas_normal": f(r"Atas Normal ([\d.]+)", sifat), "normal": f(r"(?<!Atas )(?<!Bawah )Normal ([\d.]+)", sifat),
                           "bawah_normal": f(r"Bawah Normal ([\d.]+)", sifat)} if sifat else None),
            "musim_hujan": {"persen_wilayah": num(mzom.group(1)), "zom": int(mzom.group(2))} if mzom else None,
            "prediksi_dasarian": sek("Prediksi Curah Hujan Dasarian"), "bagian": {k: v for k, v in b.items()}}


def fakta_anomali(par):
    t = " ".join(par)

    def f(rx):
        m = re.search(rx, t)
        return num(m.group(1)) if m else None
    return {"stasiun": f(r"dari (\d+) stasiun"), "suhu_rata_c": f(r"rata-rata bulan \w+ \d{4} adalah sebesar ([\d.]+)"), "normal_c": f(r"klimatologis[^.]*?sebesar ([\d.]+)\s*°C"),
            "kisaran_normal_c": [num(x) for x in re.findall(r"([\d.]+)°C", (re.search(r"kisaran normal ([^)]*)", t) or [0, ""])[1])] or None,
            "anomali_c": f(r"anomali (?:positif|negatif)? ?dengan nilai sebesar ([+-]?[\d.]+)"), "tanda": (re.search(r"anomali (positif|negatif)", t) or [0, None])[1],
            "peringkat": f(r"tertinggi ke-(\d+)") or f(r"terendah ke-(\d+)"), "periode_normal": (re.search(r"periode (\d{4}-\d{4})", t) or [0, None])[1]}


def fakta_buletin(par):
    t = " ".join(par)
    pr = re.search(r"Rendah \(([\d,.]+)%\), Menengah \(([\d,.]+)%\), Tinggi \(([\d,.]+)%\), kategori Sangat Tinggi \(([\d,.]+)%\)", t)
    dm = re.search(r"Dipole Mode periode (\w+) sebesar ([+-]?[\d,]+) \((\w+)\)", t)
    return {"prediksi_3bulan_pct": dict(zip(("rendah", "menengah", "tinggi", "sangat_tinggi"), map(num, pr.groups()))) if pr else None,
            "dipole_mode": {"periode": dm.group(1), "indeks": num(dm.group(2)), "fase": dm.group(3)} if dm else None}


def fakta_gempa(par, ringkas):
    out = []
    for p in par + [ringkas or ""]:
        for s in re.split(r"(?<=[a-z0-9])\. (?=[A-Z])", p):
            m = re.search(r"M ?(\d+[.,]\d+)", s)
            k = re.search(r"([\d]+[.,]\d+)°? ?(LS|LU)[^\d]{1,12}([\d]+[.,]\d+)°? ?(BT|BB)", s)
            if not (m and k):
                continue
            d = re.search(r"[Kk]edalaman (\d+)", s)
            w = re.search(r"[Pp]ukul (\d\d:\d\d:\d\d)", s)
            lat, lon = num(k.group(1)), num(k.group(3))
            out.append({"pukul_wib": w.group(1) if w else None, "mag": num(m.group(1)), "lat": -lat if k.group(2) == "LS" else lat,
                        "lon": lon if k.group(4) == "BT" else -lon, "kedalaman_km": int(d.group(1)) if d else None})
    return list({(g["pukul_wib"], g["mag"], g["lat"]): g for g in out}.values()) or None


def urai_artikel(a, slug, hub):
    par = paragraf(a.get("content"))
    g, p = gambar_pdf(a.get("content"))
    r = {"slug": slug, "hub": hub or "iklim", "url": f"{W}/iklim/{slug}", "judul": a.get("title"), "tanggal": a.get("date"), "penulis": a.get("author") or None,
         "ringkas": a.get("excerpt") or None, "paragraf": par, "gambar": g, "pdf": p, "fakta": None}
    try:
        r["fakta"] = (fakta_musim(par) if hub == "prediksi-musim" else fakta_dinamika(par) if hub == "dinamika-atmosfer" else fakta_anomali(par) if hub == "anomali-suhu-udara"
                      else fakta_buletin(par) if hub == "buletin-iklim" else None)
    except Exception as x:  # pengurai fakta gagal tidak menggugurkan teks
        r["fakta_galat"] = f"{type(x).__name__} {x}"
    if hub == "buletin-iklim":
        r["sawit"] = "sawit" in slug
    if not par and not g:
        r["catatan"] = "isi artikel kosong"
    elif not par:
        r["catatan"] = "isi hanya gambar; angka tidak dibaca dari gambar"
    return r


# ---------- narasi hujan bulanan/dasarian ----------
def _n(s):
    s = (s or "").lower()
    s = re.sub(r"kota adm\.?(inistrasi)?", "kota", s)
    s = re.sub(r"\bkabupaten\b|\bkab\.", "", s)
    s = re.sub(r"\bkep\.", "kepulauan", s)
    return re.sub(r"[^a-z]", "", s)


def indeks_wilayah():
    from laporan_cuaca import kab_indeks
    kab = {}
    for (kp, nama), kode in kab_indeks().items():
        kab.setdefault(kp, {})[_n(nama)] = kode
    prov = {_n(v): k for k, v in PROVINSI.items()}
    prov["daerahistimewayogyakarta"] = "34"
    return prov, kab


def peta_kab(prov_nama, nama, W_):
    prov, kab = W_
    kp = prov.get(_n(prov_nama))
    if not kp:
        b = difflib.get_close_matches(_n(prov_nama), prov, 1, 0.85)
        kp = prov[b[0]] if b else None
    if not kp or kp not in kab:
        return kp, None
    n = _n(nama)
    # Papua/Papua Barat lama sudah dimekarkan jadi 6 provinsi: cari di seluruh keluarga Papua (nama kab unik)
    for k in (["91", "92", "93", "94", "95", "96"] if kp in ("91", "92") else [kp]):
        if n in kab.get(k, {}):
            return k, kab[k][n]
    pool = {x: v for k in (["91", "92", "93", "94", "95", "96"] if kp in ("91", "92") else [kp]) for x, v in kab.get(k, {}).items()}
    b = difflib.get_close_matches(n, pool, 1, 0.9)
    return kp, pool[b[0]] if b else None


def urai_narasi(t, wil=None):
    t = (t or "").replace("\r", "")
    m = re.match(r"Pada (.+?), umumnya wilayah Indonesia diprediksi mengalami (curah hujan|sifat hujan) kategori (.+?)\.\s", t, re.S)
    pers = ({re.sub(r"^dan ", "", k.strip()): num(v) for k, v in re.findall(r"(?:^|, )([A-Za-z ]+?) ([\d.,]+)%", m.group(3))} if m else None) or None
    blok, tak, n_ok, n = [], [], 0, 0
    for b in re.finditer(r"kategori ([^\n(%]+?) \(([^)]*)\) antara lain:\n(.*?)(?=\n\s*\n|\Z)", t, re.S):
        kabs = []
        for seg in b.group(3).split(";"):
            if ":" not in seg:
                continue
            pv, ks = seg.split(":", 1)
            for k in [x.strip() for x in ks.split(",") if x.strip()]:
                kp, kode = peta_kab(pv.strip(), k, wil) if wil else (None, None)
                kabs.append({"prov": pv.strip(), "nama": k, "kode": kode})
                n += 1
                if kode:
                    n_ok += 1
                else:
                    tak.append(f"{pv.strip()}: {k}")
        blok.append({"kategori": b.group(1).strip(), "rentang": b.group(2).strip(), "kab": kabs})
    return {"periode": m.group(1) if m else None, "jenis": m.group(2) if m else None, "persen": pers, "wilayah": blok or None, "n_kab": n, "n_kab_terpetakan": n_ok, "tak_cocok": tak}


# ---------- direktori UPT ----------
def urai_upt(vals):
    lst = _pertama(vals, lambda v: isinstance(v, list) and v and isinstance(v[0], dict) and "SATKERID" in v[0]) or []
    out = []
    for d in lst:  # SENGAJA tanpa KEPALADEFINITIF/KEPALAPLT
        kd = d.get("KOORDINAT")
        out.append({"id": d.get("SATKERID"), "satker": d.get("SATKER"), "provinsi": d.get("PROVINSI"), "alamat": d.get("ALAMAT"),
                    "telepon": [x.strip() for x in re.split(r"<br\s*/?>", d.get("TELEPON") or "") if x.strip()], "email": d.get("EMAIL") or None,
                    "website": d.get("WEBSITE") or None, "lat": kd[0] if isinstance(kd, list) and len(kd) == 2 else None, "lon": kd[1] if isinstance(kd, list) and len(kd) == 2 else None})
    return out


# ---------- jalan ----------
def main():
    arsip = baca(ARSIP, {}) or {}
    ar_a, ar_n = arsip.setdefault("artikel", {}), arsip.setdefault("narasi", {})
    log, gagal, hub_out, produk, gambar_hub, gempa, siaran, narasi_snap = [], [], {}, {}, {}, {}, [], {}
    tak = []

    def kunjung(url, jenis, fn):
        c = {"url": url, "jenis": jenis}
        try:
            c.update(fn(nuxt_semua(ambil(url)), c))
            c["status"] = "ok"
        except Exception as x:
            c["status"] = f"gagal: {type(x).__name__} {x}"
            gagal.append(url)
        log.append(c)
        return c

    ok = 0
    # 1. hub artikel + artikel detail (satu tingkat)
    for hub in HUB_ARTIKEL:
        def f(v, c, hub=hub):
            d = daftar_dari(v)
            hub_out[hub or "iklim"] = [{"slug": x["slug"], "judul": x.get("title"), "tanggal": x.get("date")} for x in d]
            baru = [x for x in d if x["slug"] not in ar_a]
            c.update(n_artikel=len(d), n_baru=len(baru), n_diurai=0, n_gagal=0)
            for x in baru:
                try:
                    a = artikel_dari(nuxt_semua(ambil(f"{W}/iklim/{x['slug']}")))
                    ar_a[x["slug"]] = urai_artikel(a, x["slug"], hub) | {"diambil": sekarang()}
                    c["n_diurai"] += 1
                except Exception as e:
                    c["n_gagal"] += 1
                    gagal.append(f"/iklim/{x['slug']}: {type(e).__name__} {e}")
            return {}
        ok += kunjung(f"{W}/iklim" + (f"/{hub}" if hub else ""), "hub_artikel" if hub else "beranda", f)["status"] == "ok"
    # 2. produk gambar + narasi
    wil = None
    for kunci, (hub, kode) in PRODUK_NARASI.items():
        def f(v, c, kunci=kunci, hub=hub):
            produk[kunci] = [{"id": p["id"], "nama": p["name"], "deskripsi": p.get("description"), "gambar_step1": p["image"]} for p in produk_dari(v)]
            return {"n_produk": len(produk[kunci])}
        r = kunjung(f"{W}/iklim/{hub}", "hub_produk", f)
        ok += r["status"] == "ok"
        if r["status"] != "ok":
            continue
        ref = []

        def g(v, c, hub=hub):
            ref.extend(ref_dari(v))
            return {"n_step": len(ref)}
        kunjung(f"{W}/iklim/{hub}/curah-hujan-deterministik", "produk_ref", g)
        for p in produk[kunci]:  # URL gambar per step (tanpa unduh)
            p["steps"] = [{"nama": s["name"], "step": s["step"], "gambar": p["gambar_step1"].replace("step1", s["step"])} for s in ref]
        for pre in ("pch", "psh"):
            for i, s in enumerate(ref):
                k = f"{pre}_{kode}|{ref[0]['name']}|{s['name']}"
                if k not in ar_n:
                    try:
                        if wil is None:
                            wil = indeks_wilayah()
                        t = ambil(f"{DW}/{hub}/{pre}_{kode}_narasi_step{i + 1}.txt")
                        ar_n[k] = urai_narasi(t, wil) | {"produk": f"{pre}_{kode}", "bulan_atau_dasarian": s["name"], "diambil": sekarang()}
                        log.append({"url": f"{DW}/{hub}/{pre}_{kode}_narasi_step{i + 1}.txt", "jenis": "narasi", "status": "ok"})
                    except Exception as e:
                        log.append({"url": f"{DW}/{hub}/{pre}_{kode}_narasi_step{i + 1}.txt", "jenis": "narasi", "status": f"gagal: {type(e).__name__} {e}"})
                        continue
                a = ar_n[k]
                narasi_snap[k] = {"produk": a["produk"], "periode": a["periode"], "persen": a["persen"], "n_kab": a["n_kab"], "n_kab_terpetakan": a["n_kab_terpetakan"]}
                tak += [f"{k} {x}" for x in a["tak_cocok"]]
    # 3. hub gambar, halaman tunggal
    for hub in HUB_GAMBAR:
        def f(v, c, hub=hub):
            gambar_hub[hub] = [{"nama": x["name"], "gambar": x["image"]} for x in gambar_dari(v)]
            return {"n_produk": len(gambar_hub[hub])}
        ok += kunjung(f"{W}/iklim/{hub}", "hub_gambar", f)["status"] == "ok"
    for h in HALAMAN_TUNGGAL:
        c = {"url": f"{W}/iklim/{h}", "jenis": "gambar_tunggal"}
        try:
            s = ambil(c["url"])
            og = (re.search(r'og:description" content="([^"]*)', s) or [0, None])[1]
            sumber = next((_html.unescape(x).strip() for x in re.findall(r">([^<>]*(?:wajib mencantumkan|sumber)[^<>]*)<", s)), None)
            gambar_hub[h] = [{"nama": _html.unescape((re.search(r"<title>([^<]*)", s) or [0, None])[1] or "") or None, "deskripsi": _html.unescape(og) if og else None,
                              "catatan_sumber": sumber, "tanggal_update": None,  # halaman hanya gambar; tak ada tanggal/angka sebagai teks
                              "gambar": uniq(re.findall(r"https://dataweb\.bmkg\.go\.id/iklim/[^\"' \s>]+?\.(?:png|jpe?g|gif)", s))}]
            c["status"] = "ok"
            ok += 1
        except Exception as x:
            c["status"] = f"gagal: {type(x).__name__} {x}"
            gagal.append(c["url"])
        log.append(c)
    # 4. gempa: ulasan dan isoseismal (detail untuk gambar/PDF)
    ar_g = arsip.setdefault("gempa", {})
    for hub in HUB_GEMPA:
        def f(v, c, hub=hub):
            d = daftar_dari(v)
            gempa[hub] = [{"slug": x["slug"], "judul": x.get("title"), "tanggal": x.get("date")} for x in d]
            c.update(n_artikel=len(d), n_diurai=0, n_gagal=0)
            for x in [x for x in d if x["slug"] not in ar_g]:
                try:
                    a = artikel_dari(nuxt_semua(ambil(f"{W}/gempabumi/{hub}/{x['slug']}")))
                    par = paragraf(a.get("content"))
                    g_, p_ = gambar_pdf(a.get("content"))
                    ar_g[x["slug"]] = {"slug": x["slug"], "hub": hub, "url": f"{W}/gempabumi/{hub}/{x['slug']}", "judul": a.get("title"), "tanggal": a.get("date"),
                                       "ringkas": a.get("excerpt") or None, "paragraf": par, "gempa": fakta_gempa(par, x.get("excerpt")), "gambar": g_,
                                       "gambar_utama": (a.get("featured_image") or {}).get("large"), "pdf": p_, "diambil": sekarang()}
                    c["n_diurai"] += 1
                except Exception as e:
                    c["n_gagal"] += 1
                    gagal.append(f"/gempabumi/{hub}/{x['slug']}: {type(e).__name__} {e}")
            return {}
        ok += kunjung(f"{W}/gempabumi/{hub}", "hub_gempa", f)["status"] == "ok"
    # 5. siaran pers (daftar saja)
    ar_s = arsip.setdefault("siaran_pers", {})

    def fs(v, c):
        d = daftar_dari(v)
        for x in d:
            ar_s.setdefault(x["slug"], {"slug": x["slug"], "judul": x.get("title"), "tanggal": x.get("date"), "ringkas": x.get("excerpt") or None,
                                        "bencana": bool(KATA_BENCANA.search((x.get("title") or "") + " " + (x.get("excerpt") or ""))), "diambil": sekarang()})
        siaran.extend({"slug": x["slug"], "tanggal": x.get("date")} for x in d)
        return {"n_artikel": len(d)}
    ok += kunjung(f"{W}/siaran-pers", "hub_siaran_pers", fs)["status"] == "ok"
    # 6. direktori UPT, sekali ambil
    if not os.path.exists(UPT) or "upt" in sys.argv[1:]:
        def fu(v, c):
            u = urai_upt(v)
            assert len(u) > 100, f"hanya {len(u)} kantor: berkas lama dibiarkan"
            simpan(UPT, {"dibuat": sekarang(), "sumber": "BMKG /profil/balai-upt (www.bmkg.go.id); hanya kontak kantor, tanpa nama pejabat", "n": len(u), "kantor": u})
            return {"n_kantor": len(u)}
        ok += kunjung(f"{W}/profil/balai-upt", "direktori", fu)["status"] == "ok"
    if not ok:
        raise RuntimeError("tak satu halaman pun berhasil: berkas lama dibiarkan")
    # append-only: arsip lama sudah dimuat dan hanya ditambah
    simpan(ARSIP, arsip)
    simpan(BERKAS, {"dibuat": sekarang(), "sumber": "BMKG iklim (www.bmkg.go.id, dataweb.bmkg.go.id); teks saja", "halaman": log, "hub_artikel": hub_out, "produk_hujan": produk,
                    "produk_gambar": gambar_hub, "narasi": narasi_snap, "gempa_hub": gempa, "siaran_pers": siaran, "n_artikel_arsip": len(ar_a), "n_narasi_arsip": len(ar_n),
                    "n_kab_terpetakan": sum(v["n_kab_terpetakan"] for v in narasi_snap.values()), "n_kab_total": sum(v["n_kab"] for v in narasi_snap.values()),
                    "tak_cocok": tak, "gagal": gagal,
                    "pdf_lokal": {"spi": {k: {x: v[x] for x in ("update", "spi_bulan", "bulan_berkas", "per_tingkat", "n_baris", "n_terpetakan")} | {"n_tak_cocok": len(v["tak_cocok"])}
                                          for k, v in arsip.get("spi_pdf", {}).items()},
                                  "buletin": {k: {"bab": [b["kode"] for b in v["bab"]], "angka": v["angka"]} for k, v in arsip.get("buletin_pdf", {}).items()}},
                    "catatan": "hub hanya 12 artikel terbaru; arsip lama tidak dikejar. Gambar tidak diunduh, warna peta bukan angka."})
    print(f"iklim_bmkg: {ok} halaman ok dari {len(log)}, gagal {len(gagal)}, artikel arsip {len(ar_a)}, narasi {len(ar_n)}", file=sys.stderr)


# ---------- PDF lokal (diunduh pemilik; BUKAN diunduh skrip, host content.bmkg.go.id di luar daftar; PDF tidak masuk repo) ----------
TINGKAT_SPI = ("SANGAT KERING", "KERING", "AGAK KERING")
NAMA_PROV = sorted(set(PROVINSI.values()) | {"Daerah Istimewa Yogyakarta", "Kepulauan Bangka Belitung", "Bangka Belitung"}, key=len, reverse=True)
RX_PROV = re.compile(r"(?:(?<=\s)|^)(" + "|".join(re.escape(n) for n in NAMA_PROV) + r")\s?:\s*")  # PDF kadang menulis 'Barat : Bima'
BUANG = {"@infoBMKG", "(021)196", "www.bmkg.go.id"}


def _pdftotext(*arg):
    import subprocess
    exe = "/opt/homebrew/bin/pdftotext" if os.path.exists("/opt/homebrew/bin/pdftotext") else "pdftotext"
    return subprocess.run([exe, *arg], capture_output=True, text=True, check=True).stdout


def kolom_spi(kata):
    """kata = [(xmin, ymin, xmax, teks)] satu halaman -> 3 teks kolom (SANGAT KERING, KERING, AGAK KERING).
    Batas kolom dari liang kosong/terdangkal pada histogram sumbu x (lebar kolom beda tiap halaman); label wilayah di kiri dibuang."""
    kepala = [w[1] for w in kata if w[3] in ("TINGKAT", "KEKERINGAN", "DAERAH", "SANGAT", "AGAK", "KERING")]  # tinggi kepala beda tiap halaman (ada yang tanpa kepala)
    y_min = (max(kepala) + 12) if kepala else 0
    body = [w for w in kata if w[1] > y_min and w[3] not in BUANG]
    cov = [0] * 1000
    for x0, _, x1, _t in body:
        for x in range(int(x0), min(int(x1) + 1, 999)):
            cov[x] += 1
    kosong = [x for x in range(88, 140) if cov[x] == 0]
    b0 = (max(x for x in kosong) + 1) if kosong else 97
    b1 = min(range(290, 400), key=lambda x: cov[x]) + 1
    g = [x for x in range(540, 720) if cov[x] == 0]
    b2 = (max(g) + 1) if g else None
    if b2 is None:
        raise ValueError("batas kolom 2/3 tak ditemukan")
    kol = [[], [], []]
    for x0, y0, _x1, t in body:
        if x0 >= b0:
            kol[0 if x0 < b1 else 1 if x0 < b2 else 2].append((y0, x0, t))
    out = []
    for k in kol:  # kelompokkan per baris (selisih y < 4 pt = satu baris), urut x di dalam baris
        k.sort()
        baris, y = [], None
        for y0, x0, t in k:
            if y is None or y0 - y > 4:
                baris.append([])
                y = y0
            baris[-1].append((x0, t))
        out.append(" ".join(t for b in baris for _, t in sorted(b)))
    return out


def urai_spi_teks(kolom_semua, wil):
    """kolom_semua = 3 teks (sudah digabung lintas halaman) -> baris {tingkat, prov, nama, kode}."""
    baris, tak = [], []
    for ti, teks in zip(TINGKAT_SPI, kolom_semua):
        ms = list(RX_PROV.finditer(teks))
        for i, m in enumerate(ms):
            isi = teks[m.end(): ms[i + 1].start() if i + 1 < len(ms) else None]
            for k in [x.strip(" .") for x in isi.split(",")]:
                if not k:
                    continue
                _, kode = peta_kab(m.group(1), k, wil)
                baris.append({"tingkat": ti, "prov": m.group(1), "nama": k, "kode": kode})
                if not kode:
                    tak.append(f"{ti} {m.group(1)}: {k}")
    return baris, tak


def urai_spi_pdf(jalur, wil, url=None):
    h1 = _pdftotext("-f", "1", "-l", "1", jalur, "-")
    n = (re.search(r"SPI (\d+)", h1) or [0, None])[1]
    upd = (re.search(r"Update (\d+ \w+ \d{4})", h1) or [0, None])[1]
    halaman = int((re.search(r"Pages:\s+(\d+)", __import__("subprocess").run(["pdfinfo", jalur], capture_output=True, text=True).stdout) or [0, 0])[1])
    kol = ["", "", ""]
    n_hal = 0
    for p in range(1, halaman + 1):
        x = _pdftotext("-bbox", "-f", str(p), "-l", str(p), jalur, "-")
        if "KEKERINGAN" not in x:
            continue
        kata = [(float(a), float(b), float(c), t) for a, b, c, t in re.findall(r'xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="[\d.]+">([^<]*)', x)]
        for i, t in enumerate(kolom_spi(kata)):
            kol[i] += " " + _html.unescape(t)
        n_hal += 1
    baris, tak = urai_spi_teks(kol, wil)
    ber = os.path.basename(jalur)
    return {"berkas": ber, "url": url, "spi_bulan": int(n) if n else None, "update": upd, "bulan_berkas": (re.search(r"_(\d{6})", ber) or [0, None])[1], "n_halaman_tabel": n_hal,
            "per_tingkat": {t: sum(1 for b in baris if b["tingkat"] == t) for t in TINGKAT_SPI}, "n_baris": len(baris), "n_terpetakan": sum(1 for b in baris if b["kode"]),
            "tak_cocok": tak, "baris": baris, "diambil": sekarang()}


RX_BAB = re.compile(r"^\s*(I{1,3}|IV)\.\s+(.+)$|^\s*([A-F])\.\s+(.+)$|^\s*(\d)\.\s+(.+)$")


def urai_buletin_teks(t):
    """Teks pdftotext -layout -> bab {kode, judul, paragraf}. Halaman TIM PENYUSUN, alamat redaksi, daftar isi, tanda tangan dan nama orang DIBUANG."""
    t = t.split("PENGANTAR", 1)[-1] if "TIM PENYUSUN" in t.split("PENGANTAR", 1)[0] else t  # buang halaman penyusun
    t = re.sub(r"Jakarta, \w+ \d{4}\s+Direktur.*?\n\s*i\s*\n", "\n", t, flags=re.S)  # tanda tangan
    t = re.sub(r"DAFTAR ISI.*?\n\s*ii\s*\n", "\n", t, flags=re.S)
    bab, kini = [], {"kode": "PENGANTAR", "judul": "Pengantar", "baris": []}
    for l in t.split("\n"):
        s = l.strip()
        if not s or re.fullmatch(r"[ivx\d]+", s) or s.startswith("Sumber :") or s.startswith("PENGANTAR"):
            continue
        m = RX_BAB.match(l)
        if m and not re.search(r"[.,;]$", s) and len(s) < 110 and (m.group(1) or m.group(3) or m.group(5)) and s[3:4] != "":
            if kini["baris"] or kini["kode"] != "PENGANTAR":
                bab.append(kini)
            kini = {"kode": m.group(1) or m.group(3) or m.group(5), "judul": (m.group(2) or m.group(4) or m.group(6)).strip(), "baris": []}
        else:
            kini["baris"].append(s)
    bab.append(kini)
    out = []
    for b in bab:
        teks = " ".join(b.pop("baris"))
        b["teks"] = re.sub(r"\s+", " ", teks).strip()
        out.append(b)
    return out


def angka_buletin(bab):
    t = " ".join(b["teks"] for b in bab)

    def f(rx):
        m = re.search(rx, t)
        return m.groups() if m else None
    hth = [{"kategori": k.strip(), "titik": int(n.replace(".", "")), "persen": num(p)} for n, p, k in re.findall(r"(\d[\d.]*) titik \(([\d.,]+)%\)(?: dari total [\d.]+ titik observasi)? (?:tercatat masih mengalami hujan|mengalami HTH kategori ([A-Za-z ]+?)(?:,| dan|\.))", t)]
    ek = f(r"(\d+) titik observasi mencatat curah hujan ekstrem")
    mx = f(r"sebesar (\d+) mm/hari tercatat di (.+?) pada (\d+ \w+ \d{4})")
    pred = [{"bulan": m, "pct": num(p), "uraian": u.strip()} for m, p, u in re.findall(r"bulan (\w+ \d{4}), sejumlah ([\d.,]+)% wilayah(?: Indonesia)? (.{0,110}?)(?=, [\d.,]+% |, dan [\d.,]+% |\.\s|\sSedangkan|\sPada bulan|$)", t)]
    return {"hujan_ekstrem_titik": int(ek[0]) if ek else None,
            "hujan_ekstrem_maks": {"mm_hari": int(mx[0]), "lokasi": mx[1], "tanggal": mx[2]} if mx else None,
            "hth_titik_total": num((f(r"dari total ([\d.]+) titik observasi") or [None])[0].replace(".", "")) if f(r"dari total ([\d.]+) titik observasi") else None,
            "hth_terpanjang_hari": num((f(r"terpanjang terjadi selama (\d+) hari") or [None])[0]),
            "suhu_maks_c": num((f(r"maksimum tertinggi sebesar ([\d.,]+)°C") or [None])[0]), "suhu_min_c": num((f(r"minimum terendah yaitu ([\d.,]+)°C") or [None])[0]),
            "angin_maks_knot": num((f(r"tertinggi sebesar (\d+) Knot") or [None])[0]), "rh_min_pct": num((f(r"terendah sebesar (\d+)%") or [None])[0]),
            "dipole_mode": num((f(r"Dipole Mode periode[^+-]*?([+-][\d,]+)") or [None])[0]), "nino34": num((f(r"Nino3\.4\) (?:periode [^+-]*)?menunjukkan nilai (?:sebesar )?([+-][\d.,]+)") or [None])[0]),
            "prediksi_persen": pred or None, "hth_kategori": hth or None}


def pdf_lokal(arg):
    """`spi|buletin <pdf>...`: urai PDF yang sudah ada di disk (BUKAN dari repo) ke arsip, append-only per nama berkas."""
    jenis, berkas = arg[0], arg[1:]
    arsip = baca(ARSIP, {}) or {}
    ar_a = arsip.get("artikel", {})
    urls = {os.path.basename(u): u for a in ar_a.values() for u in a.get("pdf", [])}
    wil = indeks_wilayah() if jenis == "spi" else None
    for j in berkas:
        k = os.path.basename(j)
        sub = arsip.setdefault("spi_pdf" if jenis == "spi" else "buletin_pdf", {})
        if k in sub:
            print(f"{k}: sudah di arsip, dilewati", file=sys.stderr)
            continue
        if jenis == "spi":
            sub[k] = urai_spi_pdf(j, wil, urls.get(k))
            print(f"{k}: {sub[k]['n_baris']} baris {sub[k]['per_tingkat']}, terpetakan {sub[k]['n_terpetakan']}, tak cocok {len(sub[k]['tak_cocok'])}", file=sys.stderr)
        else:
            bab = urai_buletin_teks(_pdftotext("-layout", j, "-"))
            sub[k] = {"berkas": k, "url": urls.get(k), "bab": bab, "angka": angka_buletin(bab), "diambil": sekarang()}
            print(f"{k}: {len(bab)} bab {[b['kode'] for b in bab]}", file=sys.stderr)
    simpan(ARSIP, arsip)



def uji():
    fx = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture/iklim_nuxt.json")))
    a = urai_artikel(artikel_dari(fx["musim"]), "prediksi-musim-hujan-2026-2027-di-indonesia", "prediksi-musim")
    f = a["fakta"]
    assert f["enso_fase"] == "El Niño Sangat Kuat" and f["enso_indeks"] == 2.2 and f["sst_anomali"] == 2.83, f
    z = {(x["topik"], x["label"]): (x["zom"], x["persen"]) for x in f["zom"]}
    assert z[("awal_masuk", "November 2026")] == (185, 24.66) and z[("awal_dibanding", "MUNDUR")] == (529, 61.08), z
    assert a["pdf"] and a["pdf"][0].endswith(".pdf")
    d = urai_artikel(artikel_dari(fx["dinamika"]), "x", "dinamika-atmosfer")["fakta"]
    assert d["iod_dasarian"] == 0.659 and d["nino34_dasarian"] == 3.57 and d["enso_3bulan"]["indeks"] == 3.09, d
    assert d["peringatan_kekeringan"]["berlaku"].startswith("Dasarian I November") and "Banten" in d["peringatan_kekeringan"]["siaga"], d["peringatan_kekeringan"]
    assert "Aceh" in d["peringatan_hujan_tinggi"]["awas"] and d["hujan_kategori_pct"]["Menengah"] == 33.21 and d["sifat_pct"]["bawah_normal"] == 73.8, d
    assert d["musim_hujan"] == {"persen_wilayah": 8.4, "zom": 59}, d["musim_hujan"]
    an = urai_artikel(artikel_dari(fx["anomali"]), "x", "anomali-suhu-udara")["fakta"]
    assert (an["stasiun"], an["suhu_rata_c"], an["normal_c"], an["anomali_c"], an["peringkat"]) == (100, 27.98, 27.0, 0.98, 1), an
    assert an["kisaran_normal_c"] == [22.48, 30.45], an
    bu = urai_artikel(artikel_dari(fx["buletin"]), "x", "buletin-iklim")
    assert bu["fakta"]["prediksi_3bulan_pct"]["rendah"] == 73.15 and bu["fakta"]["dipole_mode"]["indeks"] == 0.467 and bu["sawit"] is False, bu["fakta"]
    wil = indeks_wilayah()
    n = urai_narasi(fx["narasi_bulanan"], wil)
    assert n["periode"] == "bulan November 2026" and n["persen"] == {"Sangat Tinggi": 0.48, "Tinggi": 22.0, "Menengah": 69.46, "Rendah": 8.06}, n["persen"]
    assert [b["kategori"] for b in n["wilayah"]] == ["Rendah", "Menengah", "Tinggi", "Sangat Tinggi"], n["wilayah"]
    jt = {k["nama"]: k["kode"] for k in n["wilayah"][0]["kab"] if k["prov"] == "Jawa Timur"}
    assert jt["Tulungagung"] and jt["Gresik"] and len(jt) == 14, jt
    assert n["n_kab"] > 400 and n["n_kab_terpetakan"] / n["n_kab"] > 0.95, (n["n_kab"], n["n_kab_terpetakan"], n["tak_cocok"])
    assert kab_tak_cocok_dicatat(wil)
    u = urai_upt(fx["upt"])
    assert u[0]["id"] == "0201" and u[0]["lat"] == 3.5398 and u[1]["telepon"] == ["(0752) 484236", "(0752) 82236"] and all("kepala" not in k for x in u for k in x), u[:2]
    assert "Hendro" not in json.dumps(u, ensure_ascii=False)
    g = fakta_gempa(paragraf(artikel_dari(fx["ulasan"])["content"]), None)
    assert g and g[1]["mag"] == 4.1 and g[1]["lat"] == -6.73 and g[1]["lon"] == 106.61 and g[1]["kedalaman_km"] == 5 and g[1]["pukul_wib"] == "17:58:23", g
    assert fakta_gempa([], "Lokasi 9.84 LS – 118.90 BT, M 6.1 Kedalaman 30 KM")[0]["lat"] == -9.84
    assert KATA_BENCANA.search("Siklon Tropis ARNAB") and not KATA_BENCANA.search("Rilis kinerja")
    assert len(produk_dari(fx["produk"])) >= 2 and ref_dari(fx["produk"])[0]["step"] == "step1"
    b, tk = urai_spi_teks(["Aceh: Aceh Tamiang, Aceh Utara Sumatera Barat: Tanah Datar.", "Aceh: Aceh Singkil, Kab Fiktif Jambi: Kota Jambi", "DKI Jakarta: Kota Administrasi Jakarta Barat"], wil)
    assert [(x["tingkat"], x["nama"]) for x in b][:3] == [("SANGAT KERING", "Aceh Tamiang"), ("SANGAT KERING", "Aceh Utara"), ("SANGAT KERING", "Tanah Datar")] and b[0]["kode"], b
    assert tk == ["KERING Aceh: Kab Fiktif"] and b[-1]["tingkat"] == "AGAK KERING" and b[-1]["kode"], tk
    bb = urai_buletin_teks("TIM PENYUSUN BULETIN\nPengarah : Nama Uji\n PENGANTAR\n Isi pengantar.\n  I.    RINGKASAN\n Teks satu.\n 1\nII. ANALISIS\nA. Sub satu\n Teks dua 18 titik observasi mencatat curah hujan ekstrem (>150 mm/hari).\n 2\n")
    assert [x["kode"] for x in bb] == ["PENGANTAR", "I", "II", "A"] and "Nama Uji" not in json.dumps(bb), bb
    assert angka_buletin(bb)["hujan_ekstrem_titik"] == 18
    print("uji iklim_bmkg ok")


def kab_tak_cocok_dicatat(wil):
    r = urai_narasi("Pada bulan X, umumnya wilayah Indonesia diprediksi mengalami curah hujan kategori Rendah 100.00%.\n\nWilayah yang diprediksi akan dominan mengalami hujan pada kategori Rendah (0-100 mm per bulan) antara lain:\nJawa Timur: Kabupaten Fiktif;\n", wil)
    return r["tak_cocok"] == ["Jawa Timur: Kabupaten Fiktif"] and r["wilayah"][0]["kab"][0]["kode"] is None


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else pdf_lokal(sys.argv[1:]) if sys.argv[1:2] in (["spi"], ["buletin"]) else main()
