"""Pustaka Hukum BNPB: tarik JDIH -> teks (pdftotext + OCR) -> segmen deterministik -> relasi -> katalog.json + seed.sql

Kontrak: docs/bnpb/HUKUM.md. Python 3.12 stdlib + pdftotext, pdftoppm, tesseract (-l ind).

  tarik   jdih.bnpb.go.id -> data/raw/hukum/{indeks.json,pdf/}            (bisa dilanjut, jeda 0,4 dtk)
  teks    pdf -> data/raw/hukum/teks/<slug>.json (per halaman; halaman miskin teks dibaca tesseract, ensemble kamus)
  urai    teks -> segmen + relasi + definisi -> public/data/bnpb/hukum/katalog.json + data/hukum/seed.sql
  semua   tarik, teks, urai
Pakai:  python3 scripts/bnpb/hukum.py urai   |   python3 scripts/bnpb/hukum.py --cek
"""
import argparse, concurrent.futures as cf, datetime as dt, glob, html, json, os, re, subprocess, sys, tempfile, time
import urllib.parse, urllib.request
from collections import Counter

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
MENTAH = os.path.join(AKAR, "data/raw/hukum")
KATALOG = os.path.join(AKAR, "public/data/bnpb/hukum/katalog.json")
SEED = os.path.join(AKAR, "data/hukum/seed.sql")
DASAR = "https://jdih.bnpb.go.id"
OCR_PSM = "4"        # psm 3 melepas penanda ayat "(1)" di margin kiri jadi blok sendiri di awal halaman; psm 4 menjaga urutan baris
MAKS = 6000          # huruf per segmen (kontrak D1)
POTONG = 1500        # lampiran, penjelasan, bagian tanpa Pasal
MIN_HURUF = 40       # halaman dengan huruf lebih sedikit dari ini dianggap miskin teks -> OCR
SQL_MAKS = 100_000   # byte per pernyataan D1
JENIS_SEG = ("judul", "menimbang", "mengingat", "menetapkan", "pasal", "penjelasan", "lampiran", "lain")
JENIS_REL = ("mengingat", "mencabut", "mengganti", "mengubah", "merujuk")


# ───────────────────────── tarik ─────────────────────────
def ambil(url, biner=False, tries=4):
    for coba in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (riset JDIH; pinkatitan)"})
            with urllib.request.urlopen(req, timeout=90) as r:
                d = r.read()
            time.sleep(0.4)
            return d if biner else d.decode("utf-8", "replace")
        except Exception as e:
            if tries > 1:
                print("  gagal", coba, url, e, flush=True)
                time.sleep(3 * (coba + 1))
    return None


def _baris_html(s):
    s = re.sub(r"<script.*?</script>|<style.*?</style>", "", s, flags=re.S)
    return [l.strip() for l in html.unescape(re.sub(r"<[^>]+>", "\n", s)).splitlines() if l.strip()]


KUNCI_META = ["Jenis Dokumen", "Judul", "Nomor", "Tahun", "Tajuk Entri Utama", "Bidang Hukum", "Subjek",
              "Tanggal Penetapan", "Tanggal Pengundangan", "Tempat Terbit", "Sumber", "Bahasa", "Lokasi",
              "Tipe Dokumen", "Singkatan", "Status", "Pengarang", "Penerbit", "ISBN", "Abstrak",
              "Nomor Putusan", "Jenis Peradilan", "Pemohon", "Termohon", "Amar Putusan"]


def metadata(h):
    baris = _baris_html(h)
    m = {}
    for i, b in enumerate(baris[:-1]):
        if b in KUNCI_META and b not in m and baris[i + 1] not in KUNCI_META:
            m[b] = baris[i + 1]
    m["pdf"] = sorted(set(re.findall(r'https://jdih\.bnpb\.go\.id/storage/[^"\']+?\.pdf', h, flags=re.I)))
    m["relasi"] = [b for b in baris if re.search(r"\b(mencabut|dicabut|mengubah|diubah|melaksanakan)\b", b, re.I)][:20]
    return m


def nama_pdf(slug, n, j):
    return f"{slug}-{j}.pdf" if n > 1 else f"{slug}.pdf"


def tarik(tipe_daftar, jdih=True, bpk=True):
    os.makedirs(f"{MENTAH}/pdf", exist_ok=True)
    f = f"{MENTAH}/indeks.json"
    indeks = json.load(open(f)) if os.path.exists(f) else {}
    for tipe in (tipe_daftar if jdih else []):
        hal = 1
        while True:
            h = ambil(f"{DASAR}/dokumen?page={hal}&type={tipe}")
            if not h:
                break
            tautan = sorted(set(re.findall(rf"{DASAR}/dokumen/{tipe}/[a-z0-9\-]+", h)))
            print(tipe, "hal", hal, len(tautan), flush=True)
            if not tautan:
                break
            for t in tautan:
                slug = t.rsplit("/", 1)[1]
                kid = f"{tipe}/{slug}"
                lama = indeks.get(kid, {})
                if ada_sumber(lama):
                    continue
                d = ambil(t)
                if not d:
                    continue
                m = metadata(d)
                m.update(url=t, tipe=tipe, slug=slug)
                m.update({k: lama[k] for k in ("pdf_bpk", "bpk", "pdf_bnpb", "sumber_data") if k in lama})
                ada = 0
                for j, p in enumerate(m["pdf"]):
                    fp = f"{MENTAH}/pdf/{nama_pdf(slug, len(m['pdf']), j)}"
                    if not os.path.exists(fp):
                        b = ambil(p, biner=True)
                        if b:
                            open(fp, "wb").write(b)
                    ada += os.path.exists(fp)
                m["pdf_ok"] = ada == len(m["pdf"])
                indeks[kid] = m
                print("  ", kid, m.get("Status", "-"), len(m["pdf"]), "pdf", flush=True)
                json.dump(indeks, open(f, "w"), ensure_ascii=False, indent=1)
            hal += 1
    print("jdih selesai", len(indeks))
    if bpk:
        tarik_bpk(indeks, f)
        tarik_bnpb(indeks, f)


# ── cadangan: peraturan.bpk.go.id (entitas 616 = BNPB). Mengisi PDF yang 404 di JDIH dan menambah dokumen yang JDIH tak punya. ──
BPK = "https://peraturan.bpk.go.id"
BPK_SARING = ("entitas=616", "jenis=119", "jenis=239", "jenis=240")
BPK_META = {"Judul": "Judul", "Nomor": "Nomor", "Tahun": "Tahun", "Tanggal Penetapan": "Tanggal Penetapan",
            "Tanggal Pengundangan": "Tanggal Pengundangan", "Sumber": "Sumber", "Subjek": "Subjek", "Status": "Status",
            "Bidang Hukum": "Bidang Hukum"}


def ada_sumber(v):
    """Dokumen sudah punya PDF dari salah satu sumber (JDIH, BPK, bnpb.go.id)."""
    return bool(v.get("pdf_ok") or v.get("teks_ok") or v.get("pdf_bpk") or v.get("pdf_bnpb"))


def slug_jdih(jenis, no, th):
    return f"{jenis}-nomor-{no}-tahun-{th}"


# ── cadangan ketiga: bnpb.go.id. Pola URL terbukti; isi divalidasi: halaman 1 harus memuat NOMOR n TAHUN y. ──
BNPB_GO = "https://bnpb.go.id/storage/app/media/uploads"


def kandidat_bnpb(jenis, no, th):
    u = [f"{BNPB_GO}/migration/pubs/{jenis.upper()}_{no}_{th}.PDF", f"{BNPB_GO}/migration/pubs/{jenis.upper()}_{no}_{th}.pdf"]
    folder = "peraturan-kepala" if jenis == "perka" else "peraturan-badan"
    return [f"{BNPB_GO}/24/{folder}/{th}/{jenis}-{no}-tahun-{th}.pdf"] + u


def cocok_nomor(fp, no, th):
    """Halaman 1 memuat 'NOMOR no TAHUN th' (toleran spasi, huruf besar-kecil, dan salah baca OCR O/0, l/1)."""
    t = halaman_pdf(fp)[:1]
    t = t[0] if t else ""
    if huruf(t) < MIN_HURUF:
        t = ocr_halaman(fp, 1)
    t = re.sub(r"\s+", " ", t).upper()
    kls = {"0": "[0O]", "1": "[1IL|]", "5": "[5S]", "8": "[8B]"}
    angka = lambda x: "".join(kls.get(c, c) for c in str(x))
    return bool(re.search(rf"N[O0]M[O0]R\s*[0O]*{angka(no)}\s*TAHUN\s*{angka(th)}", t))


def tarik_bnpb(indeks, f_indeks):
    cache = f"{MENTAH}/bnpb_go.json"
    peta = json.load(open(cache)) if os.path.exists(cache) else {}
    dipakai = ditolak = 0
    for kid, v in sorted(indeks.items()):
        g = re.match(r"(perka|perban)-nomor-(\d+)-tahun-(\d{4})$", v["slug"])
        if not g or ada_sumber(v):
            continue
        jenis, no, th = g[1], int(g[2]), int(g[3])
        fp = f"{MENTAH}/pdf/{v['slug']}.pdf"
        url = None
        for u in ([peta[v["slug"]]] if v["slug"] in peta else kandidat_bnpb(jenis, no, th)):
            if not os.path.exists(fp):
                b = ambil(u, biner=True, tries=1)
                if not b or not b.startswith(b"%PDF"):
                    continue
                open(fp, "wb").write(b)
            if cocok_nomor(fp, no, th):
                url = u
                break
            print("  ditolak (nomor tak cocok)", v["slug"], u, flush=True)
            ditolak += 1
            os.remove(fp)
        if url:
            v.update(pdf_bnpb=url, sumber_data="bnpb.go.id")
            peta[v["slug"]] = url
            dipakai += 1
            print("  bnpb", kid, url, flush=True)
            json.dump(indeks, open(f_indeks, "w"), ensure_ascii=False, indent=1)
            json.dump(peta, open(cache, "w"), indent=1)
    print(f"bnpb.go.id: dipakai {dipakai}, ditolak {ditolak}, masih tanpa PDF {sum(1 for v in indeks.values() if not ada_sumber(v))}")


def tarik_bpk(indeks, f_indeks):
    cache = f"{MENTAH}/bpk_daftar.json"
    daftar = json.load(open(cache)) if os.path.exists(cache) else {}
    if not daftar:
        for saring in BPK_SARING:
            hal, lalu = 1, None
            while True:
                h = ambil(f"{BPK}/Search?keywords=&tentang=&nomor=&{saring}&p={hal}")
                s = sorted(set(re.findall(r'href="(/Details/\d+/[^"]+)"', h or "")))
                print("bpk", saring, "hal", hal, len(s), flush=True)
                if not s or s == lalu:
                    break
                lalu = s
                daftar.update({x: {} for x in s})
                hal += 1
        json.dump(daftar, open(cache, "w"), indent=1)
    peta = {}
    for d in daftar:
        g = re.search(r"/(perka|peraturan)-bnpb-no-(\d+)-tahun-(\d{4})$", d)
        if g:
            peta.setdefault((int(g[2]), int(g[3])), (d, "perka" if g[1] == "perka" else "perban"))
    print("bpk dokumen", len(daftar), "perka/perban", len(peta))
    ada = {}
    for kid, v in indeks.items():
        g = re.match(r"(perka|perban)-nomor-(\d+)-tahun-(\d{4})$", v["slug"])
        if g:
            ada[(int(g[2]), int(g[3]))] = kid

    def unduh(slug, det):
        h = ambil(BPK + det)
        if not h:
            return None, None
        ln = re.findall(r'href="(/Download/\d+/[^"]+?\.pdf)"', h, flags=re.I)
        if not ln:
            print("  tanpa pdf", det)
            return h, None
        fp = f"{MENTAH}/pdf/{slug}.pdf"
        if not os.path.exists(fp):
            b = ambil(BPK + ln[0], biner=True)
            if not b or not b.startswith(b"%PDF"):
                return h, None
            open(fp, "wb").write(b)
        return h, BPK + urllib.parse.quote(ln[0], safe="/%")

    isi = baru = 0
    for (no, th), (det, jenis) in sorted(peta.items()):
        kid = ada.get((no, th))
        if kid:
            v = indeks[kid]
            if ada_sumber(v):
                continue
            _, url = unduh(v["slug"], det)
            if url:
                v.update(pdf_bpk=url, bpk=BPK + det, sumber_data="peraturan.bpk.go.id")
                isi += 1
                print("  isi", kid, det, flush=True)
        else:
            slug = slug_jdih(jenis, no, th)
            h, url = unduh(slug, det)
            if not h:
                continue
            m = {"slug": slug, "tipe": "Peraturan", "Nomor": str(no), "Tahun": str(th), "url": BPK + det, "bpk": BPK + det,
                 "Jenis Dokumen": "Peraturan Kepala" if jenis == "perka" else "Peraturan Badan", "Singkatan": jenis.upper(),
                 "sumber_data": "peraturan.bpk.go.id", "pdf": [], "relasi": []}
            baris = _baris_html(h)
            for i, b in enumerate(baris[:-1]):
                if b in BPK_META and BPK_META[b] not in m and baris[i + 1] not in BPK_META:
                    m[BPK_META[b]] = re.sub(r"\s+", " ", baris[i + 1])
            if m.get("Status"):
                m["Status"] = m["Status"].upper()
            if url:
                m.update(pdf_bpk=url)
            indeks[f"BPK/{slug}"] = m
            baru += 1
            print("  baru", slug, m.get("Status", "-"), flush=True)
        json.dump(indeks, open(f_indeks, "w"), ensure_ascii=False, indent=1)
    print(f"bpk: diisi {isi}, dokumen baru {baru}")


# ───────────────────────── teks ─────────────────────────
def kata(t):
    return re.findall(r"[a-zà-ÿ]{3,}", t.lower())


def huruf(t):
    return sum(c.isalpha() for c in t)


def skor_kamus(t, kamus):
    """Bersih = kata dikenal - kata asing. Halaman kosong/nomor saja bernilai 0, OCR waras bernilai besar."""
    k = kata(t)
    return sum(1 if w in kamus else -1 for w in k)


def pilih_ensemble(pdf_t, ocr_t, kamus):
    """Dua pembaca ada -> yang skor kamusnya lebih tinggi; seri -> teks-lapisan PDF."""
    if not ocr_t:
        return pdf_t, False
    if not pdf_t.strip():
        return ocr_t, True
    return (ocr_t, True) if skor_kamus(ocr_t, kamus) > skor_kamus(pdf_t, kamus) else (pdf_t, False)


def halaman_pdf(path):
    # -layout: penanda ayat "(1)" di kolom sendiri tetap ikut; tanpa -layout ia hilang dari teks pasal
    r = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True)
    hs = r.stdout.decode("utf-8", "replace").split("\f")
    if hs and not hs[-1].strip():
        hs.pop()
    return hs


def ocr_halaman(path, n):
    with tempfile.TemporaryDirectory() as d:
        pre = os.path.join(d, "h")
        subprocess.run(["pdftoppm", "-r", "200", "-gray", "-f", str(n), "-l", str(n), "-png", "-singlefile", path, pre],
                       capture_output=True)
        if not os.path.exists(pre + ".png"):
            return ""
        env = dict(os.environ, OMP_THREAD_LIMIT="1")
        r = subprocess.run(["tesseract", pre + ".png", "stdout", "-l", "ind", "--psm", OCR_PSM], capture_output=True, env=env)
        return r.stdout.decode("utf-8", "replace")


def daftar_pdf(m):
    n = len(m.get("pdf", []))
    fs = [os.path.join(MENTAH, "pdf", nama_pdf(m["slug"], n, j)) for j in range(n)]
    if (m.get("pdf_bpk") or m.get("pdf_bnpb")) and not m.get("pdf_ok"):   # JDIH 404: salinan BPK/bnpb.go.id disimpan sebagai <slug>.pdf
        return [os.path.join(MENTAH, "pdf", m["slug"] + ".pdf")]
    return fs


def teks(paksa=False):
    indeks = json.load(open(f"{MENTAH}/indeks.json"))
    os.makedirs(f"{MENTAH}/teks", exist_ok=True)
    mentah, kamus_c = {}, Counter()
    for m in indeks.values():
        hs = []
        for p in daftar_pdf(m):
            if os.path.exists(p):
                hs += [(p, i + 1, t) for i, t in enumerate(halaman_pdf(p))]
        mentah[m["slug"]] = hs
        for _, _, t in hs:
            if huruf(t) >= MIN_HURUF:
                kamus_c.update(kata(t))
    kamus = {w for w, c in kamus_c.items() if c >= 2}
    print("kamus", len(kamus), "kata dari", sum(1 for h in mentah.values() if h), "dokumen berpdf", flush=True)
    for slug, hs in mentah.items():
        out = f"{MENTAH}/teks/{slug}.json"
        if not hs or (os.path.exists(out) and not paksa):
            continue
        lama = json.load(open(out)) if os.path.exists(out) else {"halaman": [], "ocr": []}
        # OCR tak diulang, kecuali dibuat dengan psm lain
        lama_ocr = {h["n"]: h.get("o") or (h["t"] if h["n"] in lama["ocr"] else None) for h in lama["halaman"]} if lama.get("psm") == OCR_PSM else {}
        miskin = [i for i, (_, _, t) in enumerate(hs) if huruf(t) < MIN_HURUF]
        hasil_ocr = {i: lama_ocr[i + 1] for i in miskin if lama_ocr.get(i + 1)}
        baru = [i for i in miskin if i not in hasil_ocr]
        if baru:
            with cf.ThreadPoolExecutor(4) as ex:
                fut = {i: ex.submit(ocr_halaman, hs[i][0], hs[i][1]) for i in baru}
                hasil_ocr.update({i: f.result() for i, f in fut.items()})
        hal, ocr = [], []
        for i, (_, _, t) in enumerate(hs):
            t2, dipakai = pilih_ensemble(t, hasil_ocr.get(i, ""), kamus)
            hal.append({"n": i + 1, "t": t2, **({"o": hasil_ocr[i]} if i in hasil_ocr else {})})
            if dipakai:
                ocr.append(i + 1)
        semua = [w for h in hal for w in kata(h["t"])]
        mutu = round(sum(w in kamus for w in semua) / len(semua), 3) if semua else 0.0
        json.dump({"slug": slug, "halaman": hal, "ocr": ocr, "mutu": mutu, "psm": OCR_PSM}, open(out, "w"), ensure_ascii=False)
        print(f"  {slug}: {len(hal)} hal, ocr {len(ocr)}, mutu {mutu}", flush=True)


# ───────────────────────── kunci kanonik & sitasi ─────────────────────────
MENTERI = {"dalam negeri": "permendagri", "keuangan": "permenkeu", "kesehatan": "permenkes", "sosial": "permensos",
           "pekerjaan umum": "permenpu", "lingkungan hidup dan kehutanan": "permenlhk", "kehutanan": "permenhut"}
SLUG_JENIS = {"perban": "perban", "perka": "perka", "perpres": "perpres", "pp": "pp", "uu": "uu", "juklak": "juklak",
              "juknis": "juknis", "pedoman": "pedoman", "keputusan-kepala": "kepka", "surat-edaran": "se",
              "keputusan-presiden": "keppres"}
NAMA_JENIS = {"perban": "Peraturan Badan", "perka": "Peraturan Kepala", "perpres": "Peraturan Presiden", "pp": "Peraturan Pemerintah",
              "uu": "Undang-Undang", "juklak": "Petunjuk Pelaksanaan", "juknis": "Petunjuk Teknis", "pedoman": "Pedoman",
              "kepka": "Keputusan Kepala", "se": "Surat Edaran", "keppres": "Keputusan Presiden", "perppu": "Peraturan Pemerintah Pengganti Undang-Undang"}


def kunci(jenis, nomor, tahun):
    return f"{jenis}-{str(nomor).lstrip('0') or '0'}-{tahun}"


def kunci_dok(m):
    s = m["slug"]
    g = re.match(r"^(.*)-nomor-(\d+)-tahun-(\d{4})$", s)
    if g:
        return kunci(SLUG_JENIS.get(g[1], g[1].replace("-", "")), g[2], g[3])
    return s


def _menteri(nama):
    n = re.sub(r"\s+", " ", nama.strip().lower())
    return MENTERI.get(n) or "permen" + "".join(w[0] for w in n.split() if w not in ("dan", "republik", "indonesia"))


_RX_JENIS = (r"(?P<jenis>Undang-Undang(?! Dasar)|Peraturan Pemerintah Pengganti Undang-Undang|Peraturan Pemerintah|Peraturan Presiden|"
             r"Keputusan Presiden|Peraturan Kepala Badan Nasional Penanggulangan Bencana|Peraturan Kepala BNPB|Peraturan Kepala|"
             r"Peraturan Badan Nasional Penanggulangan Bencana|Peraturan Badan|Peraturan BNPB|Keputusan Kepala Badan Nasional "
             r"Penanggulangan Bencana|Keputusan Kepala BNPB|Keputusan Kepala|Surat Edaran(?: Kepala)?|"
             r"Peraturan Menteri (?P<men>[A-Za-z ]{3,60}?)|Keputusan Menteri (?P<kmen>[A-Za-z ]{3,60}?))")
RX_SITASI = re.compile(_RX_JENIS + r"\s+Nomor\s+(?P<no>\d+)\s+Tahun\s+(?P<th>\d{4})", re.I)
RX_TENTANG = re.compile(r"\s*,?\s*tentang\s+(?P<t>[^()\n;]{3,140}?)(?=\s*[(;,]|\s*$|\.\s|\s+sebagaimana|\s+dan\s+Peraturan)", re.I)


def kunci_sitasi(m):
    j = m["jenis"].lower()
    if j.startswith("peraturan menteri"):
        return kunci(_menteri(m["men"]), m["no"], m["th"])
    if j.startswith("keputusan menteri"):
        return kunci("kepmen" + _menteri(m["kmen"])[6:], m["no"], m["th"])
    if j.startswith("undang"):
        return kunci("uu", m["no"], m["th"])
    if "pengganti" in j:
        return kunci("perppu", m["no"], m["th"])
    if j == "peraturan pemerintah":
        return kunci("pp", m["no"], m["th"])
    if j == "peraturan presiden":
        return kunci("perpres", m["no"], m["th"])
    if j == "keputusan presiden":
        return kunci("keppres", m["no"], m["th"])
    if j.startswith("surat edaran"):
        return kunci("se", m["no"], m["th"])
    if j.startswith("keputusan kepala"):
        return kunci("kepka", m["no"], m["th"])
    return kunci("perka" if "kepala" in j else "perban", m["no"], m["th"])


# ───────────────────────── urai: pembersihan & paragraf ─────────────────────────
RX_NOMOR_HAL = re.compile(r"^[-–—]\s*\d+\s*[-–—]$|^(hal(aman)?\.?\s*)?\d+\s*(dari|/)\s*\d+$", re.I)
RX_PENANDA = re.compile(r"^(\d{1,2}\.|[a-z]\.|\(\d+\)|\([a-z]\)|[•\-–]|[IVX]+\.)(\s|$)")
RX_PENANDA_SENDIRI = re.compile(r"^(:\s*)?(\d{1,2}|[a-z])\.$|^:$|^\(\d+\)$")


def bersihkan(halaman):
    """halaman = [teks,...] -> [(baris, no_halaman)] tanpa nomor halaman '-2-' dan kepala/kaki berulang."""
    per = [[re.sub(r"\s+", " ", l.strip()) for l in t.splitlines() if l.strip()] for t in halaman]
    hit = Counter()
    for ls in per:
        hit.update({re.sub(r"\d+", "#", l) for l in ls})
    judul_struktur = re.compile(r"^(pasal|bab|bagian|paragraf|lampiran)\b|^#\.?$|^\(?#\)?\.?\s", re.I)   # 'Pasal 5' tiap halaman BUKAN kepala berulang
    ulang = {k for k, c in hit.items() if len(per) >= 4 and c >= max(3, 0.6 * len(per)) and len(k) <= 120
             and not judul_struktur.match(k)}
    out = []
    for n, ls in enumerate(per, 1):
        for k, l in enumerate(ls):
            if k < 2:   # '-2Pasal 1' / '- 39 Agar setiap': nomor halaman menempel di baris pertama
                l = re.sub(r"^[-–—]\s*\d{1,3}\s*(?=[A-Za-z(])", "", l)
            if RX_NOMOR_HAL.match(l) or re.sub(r"\d+", "#", l) in ulang:
                continue
            out.append((l, n))
    return out


def sambung(a, b):
    if a.endswith("-") and len(a) > 1 and a[-2].isalpha() and b[:1].isalpha():
        return a + b
    return a + " " + b


def rapikan(s):
    s = re.sub(r"Undang\s?Undang", "Undang-Undang", s)
    return re.sub(r"[ \t]{2,}", " ", s).replace("\x00", "").strip()


def paragraf(baris, buang_penanda=False):
    """[(baris, hal)] -> [(paragraf, hal_awal)]. Baris sambung kecuali di awal butir atau sesudah kalimat selesai."""
    ps = []
    for l, h in baris:
        if buang_penanda:
            if RX_PENANDA_SENDIRI.match(l):
                continue
            l = re.sub(r"^:\s*", "", l)
        if ps:
            cur = ps[-1][0]
            lone = bool(RX_PENANDA_SENDIRI.match(cur))
            baru = not lone and (RX_PENANDA.match(l) or (cur[-1] in ".;:" and (l[0].isupper() or l[0].isdigit() or l[0] == "(" or l.startswith("bahwa "))))
            if not baru:
                ps[-1] = (sambung(cur, l), ps[-1][1])
                continue
        ps.append((l, h))
    return [(rapikan(p), h) for p, h in ps if rapikan(p)]


def potong_keras(p, maks):
    out = []
    while len(p) > maks:
        i = p.rfind(". ", 0, maks)
        i = i + 1 if i > maks // 2 else p.rfind(" ", 0, maks)
        i = i if i > 0 else maks
        out.append(p[:i].strip())
        p = p[i:].strip()
    return out + [p]


def kelompok(ps, target):
    """[(paragraf, hal)] -> [(teks, hal_awal)] masing-masing <= MAKS, dipecah di batas paragraf sekitar target huruf."""
    out, buf, hal = [], [], None
    for p, h in ps:
        for q in potong_keras(p, min(MAKS, target)):
            tot = sum(len(x) + 1 for x in buf)
            if buf and tot + len(q) > target:
                out.append(("\n".join(buf), hal))
                buf, hal = [], None
            if hal is None:
                hal = h
            buf.append(q)
    if buf:
        out.append(("\n".join(buf), hal))
    return out


# ───────────────────────── urai: segmentasi ─────────────────────────
RX_BAB = re.compile(r"^BAB\s+([IVX]+)\b\s*(.*)$")
RX_BAGIAN = re.compile(r"^Bagian\s+(Ke[a-z]+|Pertama)\s*$", re.I)
RX_PASAL = re.compile(r"^Pasal\s+(\d+[A-Z]?|[IVX]{1,5})\s*$")
RX_DIKTUM = re.compile(r"^(KESATU|KEDUA|KETIGA|KEEMPAT|KELIMA|KEENAM|KETUJUH|KEDELAPAN|KESEMBILAN|KESEPULUH)\b")
RX_RAMAWI = re.compile(r"^([IVX]{1,5})\.\s+[A-Z][^.]{2,85}$")
RX_AKHIR = re.compile(r"^Ditetapkan di\b")
RX_PENJELASAN = re.compile(r"^PENJELASAN\b.{0,40}$")
RX_LAMPIRAN = re.compile(r"^LAMPIRAN\b")


def cari(L, rx, mulai=0, selesai=None):
    for i in range(mulai, len(L) if selesai is None else selesai):
        if rx.match(L[i][0]):
            return i
    return None


def _seg(dok, jenis, label, teks_, halaman, bab=None):
    return {"dok": dok, "jenis": jenis, "label": label, "bab": bab, "halaman": halaman, "teks": teks_}


def _blok(dok, jenis, label, baris, target, bab=None, nama_hal=False, buang_penanda=False):
    """Satu wilayah baris -> satu atau beberapa segmen. nama_hal: label per potongan 'X hal. N'."""
    out = []
    for k, (t, h) in enumerate(kelompok(paragraf(baris, buang_penanda), target)):
        lab = f"{label} hal. {h}" if nama_hal else (label if k == 0 else f"{label} (lanjutan {k})")
        out.append(_seg(dok, jenis, lab, t, h, bab))
    return out


def segmen_badan(dok, L, jenis_dikt="lain"):
    """Wilayah batang tubuh: Pasal dan BAB/Bagian. Tanpa Pasal -> dibagi menurut judul (BAB, angka romawi, KESATU...)."""
    pasal_idx, dig, rom = [], None, 0
    RM = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10}
    for i, (l, _) in enumerate(L):
        g = RX_PASAL.match(l)
        if not g:
            continue
        n = g[1]
        if n in RM:        # 'Pasal I', 'Pasal II' (peraturan perubahan): naik berurutan
            if RM[n] == rom + 1:
                pasal_idx.append(i); rom += 1
        else:              # 'Pasal 36A': (36,'A') harus naik terus; rujukan 'Pasal 5' yang tercecer sendirian lebih kecil -> ditolak
            v = (int(n.rstrip("ABCDEFGHIJKLMNOPQRSTUVWXYZ")), n.lstrip("0123456789"))
            if (dig is None and (v[0] == 1 or rom)) or (dig is not None and v > dig):
                pasal_idx.append(i); dig = v
    if len(pasal_idx) < 2:
        return segmen_judul(dok, L, jenis_dikt), []
    out, bab, bagian, definisi = [], None, None, []
    marks = pasal_idx + [len(L)]
    # BAB/Bagian dilepas dari teks pasal dan dicatat untuk Pasal sesudahnya; BAB sebelum Pasal pertama ikut dibaca (label None, dibuang)
    for a, b in [(None, pasal_idx[0])] + list(zip(marks, marks[1:])):
        label, baris, i = (L[a][0], [], a + 1) if a is not None else (None, [], 0)
        while i < b:
            l = L[i][0]
            g = RX_BAB.match(l)
            if g:
                judul, i = [g[2]] if g[2] else [], i + 1
                while i < b and len(judul) < 3 and L[i][0].isupper() and not RX_PASAL.match(L[i][0]):
                    judul.append(L[i][0]); i += 1
                bab, bagian = f"BAB {g[1]} {' '.join(judul)}".strip(), None
                continue
            if RX_BAGIAN.match(l):
                bagian = l.strip()
                if i + 1 < b and not RX_PASAL.match(L[i + 1][0]):
                    i += 1
                    bagian += " " + L[i][0]
                i += 1
                continue
            if re.match(r"^Paragraf\s+\d+\s*$", l):
                i += 2
                continue
            baris.append(L[i])
            i += 1
        if a is None:
            continue
        ps = paragraf(baris)
        if label == "Pasal 1":
            definisi += ambil_definisi(dok, ps)
        b_s = bab + ("; " + bagian if bagian and bab else "") if bab else None
        for k, (t, h) in enumerate(kelompok(ps, MAKS)):
            out.append(_seg(dok, "pasal", label if k == 0 else f"{label} (lanjutan {k})", t, h or L[a][1], b_s))
    return out, definisi


def segmen_judul(dok, L, jenis_dikt):
    """Tanpa Pasal (juklak, juknis, pedoman, keputusan): bagi per judul bagian, sisanya per ~1500 huruf."""
    bag, cur = [], ("Isi", None, [])
    for l, h in L:
        g = RX_BAB.match(l) or RX_DIKTUM.match(l) or RX_RAMAWI.match(l) or RX_LAMPIRAN.match(l)
        if g:
            bag.append(cur)
            cur = (l[:80].strip(), l, [(l, h)])
        else:
            cur[2].append((l, h))
    bag.append(cur)
    out = []
    for nama, awal, baris in bag:
        if not baris:
            continue
        jenis = "lampiran" if awal and RX_LAMPIRAN.match(awal) else jenis_dikt
        if nama == "Isi":
            out += _blok(dok, jenis, "Isi", baris, POTONG, nama_hal=True)
        else:
            out += _blok(dok, jenis, nama, baris[1:] or baris, POTONG)
    return out


def urai_dok(dok, judul, halaman):
    """halaman = [teks,...] -> (segmen, definisi). Segmen pertama selalu 'judul' (dari metadata)."""
    segs = [_seg(dok, "judul", "Judul", judul, 1)]
    if not halaman:
        return segs, []
    L = bersihkan(halaman)
    im = cari(L, re.compile(r"^Menimbang\b"), 0, 80)
    ig = cari(L, re.compile(r"^Mengingat\b"), im or 0) if im is not None else None
    definisi = []
    if im is None or ig is None:
        return segs + segmen_judul(dok, L, "lain"), []
    it = cari(L, re.compile(r"^Menetapkan\b"), ig)
    imm = cari(L, re.compile(r"^MEMUTUSKAN"), ig)
    akhir_ig = min(x for x in (imm, it, len(L)) if x is not None)
    # pdftotext tanpa -layout sering menaruh teks Menimbang SESUDAH label Mengingat: kolam satu, pisah menurut isi ('bahwa ...' = menimbang)
    def tanpa_label(x):   # -layout: 'Menimbang : a. bahwa ...' satu baris; buang labelnya, simpan isinya
        return (re.sub(r"^(Menimbang|Mengingat)\s*:?\s*", "", x[0]), x[1])
    ps = paragraf([x for x in [tanpa_label(L[im])] + L[im + 1:ig] + [tanpa_label(L[ig])] + L[ig + 1:akhir_ig] if x[0]], buang_penanda=True)
    bahwa = lambda x: bool(re.match(r"^(?:[a-z]\.\s*)?bahwa\b", x[0]))
    for jenis, label, isi in (("menimbang", "Menimbang", [x for x in ps if bahwa(x)]),
                              ("mengingat", "Mengingat", [x for x in ps if not bahwa(x)])):
        for k, (t, h) in enumerate(kelompok(isi, MAKS)):
            segs.append(_seg(dok, jenis, label if k == 0 else f"{label} (lanjutan {k})", t, h))
    rx_mulai = re.compile(r"^(BAB\s+[IVX]+\b|Pasal\s+(\d|[IVX]+\s*$)|KESATU\b)")
    mulai = cari(L, rx_mulai, it if it is not None else akhir_ig)
    if mulai is None:
        mulai = len(L)
    if it is not None and it < mulai:
        segs += _blok(dok, "menetapkan", "Menetapkan", L[it:mulai], MAKS)
    # batas batang tubuh
    pen = cari(L, RX_PENJELASAN, mulai)
    lam = cari(L, RX_LAMPIRAN, mulai)
    ditetapkan = cari(L, RX_AKHIR, mulai)
    tanda = sorted((i, j) for i, j in ((ditetapkan, "lain"), (pen, "penjelasan"), (lam, "lampiran")) if i is not None)
    akhir = tanda[0][0] if tanda else len(L)
    isi, definisi = segmen_badan(dok, L[mulai:akhir], "menetapkan")
    segs += isi
    for (i, jenis), nxt in zip(tanda, tanda[1:] + [(len(L), None)]):
        wil = L[i:nxt[0]]
        if jenis == "lain":      # tanda tangan s.d. 'BERITA NEGARA ... NOMOR'; sisanya (lampiran tanpa judul LAMPIRAN) = lampiran
            e = next((j + 1 for j, (x, _) in enumerate(wil[:60]) if x.startswith("BERITA NEGARA")), min(25, len(wil)))
            segs += _blok(dok, "lain", "Penutup", wil[:e], POTONG)
            segs += _blok(dok, "lampiran", "Lampiran", wil[e:], POTONG, nama_hal=True)
        elif jenis == "penjelasan":
            segs += _blok(dok, "penjelasan", "Penjelasan", wil, POTONG, nama_hal=True)
        else:
            segs += _blok(dok, "lampiran", "Lampiran", wil, POTONG, nama_hal=True)
    return segs, definisi


# ───────────────────────── definisi & relasi ─────────────────────────
def ambil_definisi(dok, ps):
    """Butir bernomor di Pasal 1: 'X adalah ...' dan 'yang selanjutnya disebut/disingkat Y'."""
    butir, n = [], 0
    for p, _ in ps:
        g = re.match(r"^(\d{1,3})\.\s+(.*)$", p, re.S)
        if g and int(g[1]) == n + 1:
            n += 1
            butir.append(g[2])
        elif butir and not RX_PENANDA.match(p):
            butir[-1] += " " + p
    out = []
    for b in butir:
        g = re.search(r"yang\s+selanjutnya\s+(?:disebut|disingkat)\s+([^,]{1,60}?)\s*(?:,|\s+adalah\b)", b, re.I)
        a = re.match(r"^(.{2,160}?)\s+adalah\b", b)
        istilah = (g[1] if g else a[1] if a else "").strip(" ,:;")
        istilah = re.sub(r"\s*\(.*?\)\s*$", "", istilah)
        if istilah and len(istilah.split()) <= 10:
            out.append({"istilah": istilah, "dok": dok, "label": "Pasal 1", "teks": b[:1200]})
    return out


def _konteks(teks_, ms, k):
    """Potongan sebelum dan sesudah sitasi k, dibatasi kalimat/klausa dan sitasi tetangga."""
    m = ms[k]
    lo = ms[k - 1].end() if k else 0
    lo = max(lo, m.start() - 160)
    sebelum = teks_[lo:m.start()]
    sebelum = re.split(r"[;]|\.\s", sebelum)[-1]
    hi = ms[k + 1].start() if k + 1 < len(ms) else len(teks_)
    sesudah = re.split(r";|\.\s", teks_[m.end():min(hi, m.end() + 400)])[0]
    return sebelum.lower(), sesudah.lower()


SETARA = ("perban", "perka", "kepka", "se", "juklak", "juknis", "pedoman")


def jenis_relasi(seg_jenis, sebelum, sesudah, sah=True):
    """mengingat | mengganti | mencabut | mengubah | merujuk. Verba hanya dibaca di segmen yang memang MENETAPKAN sesuatu
    (menimbang, menetapkan, pasal) dan hanya untuk sasaran sederajat (BNPB tak mencabut PP); selebihnya merujuk."""
    if seg_jenis == "mengingat":
        return "mengingat"
    if not sah or seg_jenis not in ("menimbang", "menetapkan", "pasal", "judul"):
        return "merujuk"
    if re.search(r"\b(mengganti|menggantikan)\b", sebelum) or re.search(r"\b(diganti|digantikan)\b", sesudah):
        return "mengganti"
    if re.search(r"\b(mencabut|dicabut)\b|tidak berlaku", sebelum) or re.search(r"\b(dicabut|dinyatakan tidak berlaku)\b", sesudah):
        return "mencabut"
    # 'tentang Perubahan atas X' hanya milik peraturan ini bila ia menyusul 'menetapkan'/'perlu' (bukan judul peraturan lain yang dikutip)
    if re.search(r"\bmengubah\b", sebelum) or (seg_jenis in ("menetapkan", "judul") and re.search(r"perubahan\s+(?:\w+\s+)?atas\s*$", sebelum)) \
            or (seg_jenis == "menimbang" and re.search(r"(menetapkan|perlu)\b.*perubahan\s+(?:\w+\s+)?atas\s*$", sebelum)):
        return "mengubah"
    return "merujuk"


def relasi_dari(dok_id, segs, judul_dok):
    """Semua sitasi di segmen -> {(dari,ke,jenis): ke_judul_tulisan}. Merujuk dibuang bila pasangan sudah punya jenis lain."""
    hasil, urut = {}, []
    bahan = [("judul", judul_dok)] + [(s["jenis"], s["teks"]) for s in segs if s["jenis"] != "judul"]
    for sj, t in bahan:
        ms = list(RX_SITASI.finditer(t))
        for k, m in enumerate(ms):
            ke = kunci_sitasi(m)
            if ke == dok_id:
                continue
            sebelum, sesudah = _konteks(t, ms, k)
            j = jenis_relasi(sj, sebelum, sesudah, ke.split("-")[0] in SETARA or ke.split("-")[0] == dok_id.split("-")[0])
            nama = re.sub(r"\s+", " ", t[m.start():m.end()])
            tg = RX_TENTANG.match(t, m.end())
            if tg:
                nama += " tentang " + re.sub(r"\s+", " ", tg["t"]).strip()
            if (dok_id, ke, j) not in hasil:
                hasil[(dok_id, ke, j)] = nama
                urut.append((dok_id, ke, j))
    pasang = {(d, k) for d, k, j in urut if j != "merujuk"}
    return [(k, hasil[k]) for k in urut if k[2] != "merujuk" or (k[0], k[1]) not in pasang]


# ───────────────────────── keluaran ─────────────────────────
def sql(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("\x00", "").replace("'", "''") + "'"


def sisip(tabel, kolom, nilai):
    s = f"INSERT INTO {tabel} ({', '.join(kolom)}) VALUES ({', '.join(sql(v) for v in nilai)});"
    assert len(s.encode()) <= SQL_MAKS, f"pernyataan {tabel} {len(s.encode())} byte melewati batas D1 {SQL_MAKS}"
    return s


BULAN = {"january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6, "july": 7, "august": 8, "september": 9,
         "october": 10, "november": 11, "december": 12, "januari": 1, "februari": 2, "maret": 3, "mei": 5, "juni": 6,
         "juli": 7, "agustus": 8, "oktober": 10, "desember": 12}


def tanggal(s):
    g = re.match(r"^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$", (s or "").strip())
    if g and g[2].lower() in BULAN:
        return f"{g[3]}-{BULAN[g[2].lower()]:02d}-{int(g[1]):02d}"
    return None


def periksa(dok, segmen, relasi=None):
    """Invarian atas keluaran (dipakai urai dan --cek)."""
    ids = {d["id"] for d in dok}
    assert len(ids) == len(dok), "id dokumen tidak unik"
    per = Counter(s["dok"] for s in segmen)
    for d in dok:
        assert per[d["id"]] >= 1, f"dokumen {d['id']} tanpa segmen"
    for s in segmen:
        assert s["dok"] in ids, f"segmen menunjuk dok tak ada: {s['dok']}"
        assert s["jenis"] in JENIS_SEG, f"jenis segmen liar {s['jenis']}"
        assert 0 < len(s["teks"]) <= MAKS, f"segmen {s['dok']} {s['label']} {len(s['teks'])} huruf (batas {MAKS})"
    assert len({s["id"] for s in segmen if "id" in s}) == len([s for s in segmen if "id" in s]), "id segmen tidak unik"
    for r in relasi or []:
        assert r["jenis"] in JENIS_REL and r["dari"] in ids


def bangun(baca=None):
    indeks = json.load(open(f"{MENTAH}/indeks.json"))
    dok, segmen, definisi, rel_mentah = [], [], [], []
    sekarang = dt.datetime.now(dt.timezone.utc)
    for m in sorted(indeks.values(), key=lambda m: m["slug"]):
        did = kunci_dok(m)
        if did in {d["id"] for d in dok}:
            did = m["slug"]
        f = f"{MENTAH}/teks/{m['slug']}.json"
        t = json.load(open(f)) if os.path.exists(f) else None
        judul = re.sub(r"\s+", " ", m.get("Judul") or m["slug"]).strip()
        segs, defs = urai_dok(did, judul, [h["t"] for h in t["halaman"]] if t else [])
        for r, nama in relasi_dari(did, segs, judul):
            rel_mentah.append((r, nama))
        jenis = (m.get("Singkatan") or "").upper() or m["slug"].split("-nomor")[0].upper()
        dok.append({"id": did, "slug": m["slug"], "tipe": m.get("tipe"), "jenis": m.get("Jenis Dokumen") or m.get("Tipe Dokumen"),
                    "singkatan": jenis, "nomor": m.get("Nomor"), "tahun": int(m["Tahun"]) if str(m.get("Tahun", "")).isdigit() else None,
                    "judul": judul, "status": m.get("Status"), "subjek": m.get("Subjek"), "bidang": m.get("Bidang Hukum"),
                    "tgl_tetap": tanggal(m.get("Tanggal Penetapan")), "tgl_undang": tanggal(m.get("Tanggal Pengundangan")),
                    "sumber": m.get("sumber_data") or "jdih.bnpb.go.id", "sumber_bn": None if m.get("Sumber") in (None, "", "-") else m["Sumber"], "url": m.get("url"), "pdf": [m["pdf_bpk"]] if m.get("pdf_bpk") else [m["pdf_bnpb"]] if m.get("pdf_bnpb") else m.get("pdf", []),  # JDIH 404 -> BPK -> bnpb.go.id
                    "halaman": len(t["halaman"]) if t else 0, "halaman_ocr": len(t["ocr"]) if t else 0, "mutu": t["mutu"] if t else None,
                    "n_segmen": len(segs)})
        for k, s in enumerate(segs):
            s["urut"] = k
        segmen += segs
        definisi += defs
    for i, s in enumerate(segmen, 1):
        s["id"] = i
    ada = {d["id"]: d for d in dok}
    relasi = []
    for (dari, ke, j), nama in rel_mentah:
        d = ada.get(ke)
        relasi.append({"dari": dari, "ke": ke, "jenis": j, "terdaftar": d is not None, "ke_judul": d["judul"] if d else nama})
    periksa(dok, segmen, relasi)
    dok.sort(key=lambda d: (-(d["tahun"] or 0), d["id"]))
    return {"versi": 1, "dibangun": sekarang.strftime("%Y-%m-%dT%H:%M:%SZ"), "sumber": "jdih.bnpb.go.id",
            "dok": dok, "relasi": relasi, "definisi": definisi}, segmen


def tulis_seed(kat, segmen, ms):
    judul = {d["id"]: d["judul"] for d in kat["dok"]}
    b = ["-- Pustaka Hukum BNPB. DIBANGUN oleh scripts/bnpb/hukum.py urai; jangan disunting tangan.",
         "-- Idempoten: DELETE lalu INSERT. Terapkan manual atas izin pemilik.",
         "DELETE FROM hukum_fts;", "DELETE FROM hukum_relasi;", "DELETE FROM hukum_segmen;", "DELETE FROM hukum_dok;"]
    for d in kat["dok"]:
        b.append(sisip("hukum_dok", ["id", "slug", "tipe", "jenis", "singkatan", "nomor", "tahun", "judul", "status", "subjek",
                                     "tgl_tetap", "tgl_undang", "url", "pdf", "halaman", "mutu", "diperbarui"],
                       [d["id"], d["slug"], d["tipe"], d["jenis"], d["singkatan"], d["nomor"], d["tahun"], d["judul"], d["status"],
                        d["subjek"], d["tgl_tetap"], d["tgl_undang"], d["url"], json.dumps(d["pdf"]), d["halaman"], d["mutu"], ms]))
    for s in segmen:
        b.append(sisip("hukum_segmen", ["id", "dok", "urut", "jenis", "label", "bab", "halaman", "teks"],
                       [s["id"], s["dok"], s["urut"], s["jenis"], s["label"], s["bab"], s["halaman"], s["teks"]]))
        b.append(sisip("hukum_fts", ["rowid", "teks", "label", "judul"], [s["id"], s["teks"], s["label"], judul[s["dok"]]]))
    for r in kat["relasi"]:
        b.append(sisip("hukum_relasi", ["dari", "ke", "jenis", "terdaftar", "ke_judul"],
                       [r["dari"], r["ke"], r["jenis"], int(r["terdaftar"]), r["ke_judul"]]))
    return "\n".join(b) + "\n"


def urai():
    kat, segmen = bangun()
    os.makedirs(os.path.dirname(KATALOG), exist_ok=True)
    os.makedirs(os.path.dirname(SEED), exist_ok=True)
    json.dump(kat, open(KATALOG, "w"), ensure_ascii=False, indent=1)
    open(SEED, "w").write(tulis_seed(kat, segmen, int(time.time() * 1000)))
    jenis = Counter(s["jenis"] for s in segmen)
    print(f"dok {len(kat['dok'])}  segmen {len(segmen)} {dict(jenis)}  relasi {len(kat['relasi'])}  definisi {len(kat['definisi'])}  "
          f"halaman OCR {sum(d['halaman_ocr'] for d in kat['dok'])}")
    return kat, segmen


# ───────────────────────── --cek ─────────────────────────
MINI = """PERATURAN BADAN NASIONAL PENANGGULANGAN BENCANA
NOMOR 1 TAHUN 2026
Menimbang
: a.
b.
bahwa Peraturan Badan Nasional Penanggulangan Bencana
Nomor 1 Tahun 2024 tentang Penelaahan Dana sudah tidak sesuai,
sehingga perlu diganti;
bahwa untuk mewujudkan tertib;
Mengingat
: 1.
Undang-
Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana (Lembaran Negara Tahun 2007 Nomor 66);
MEMUTUSKAN:
Menetapkan
: PERATURAN BADAN TENTANG DANA.
BAB I
KETENTUAN UMUM
Pasal 1
Dalam Peraturan Badan ini yang dimaksud dengan:
1. Bencana adalah peristiwa yang mengancam
kehidupan.
2. Dana Bersama Penanggulangan Bencana, yang selanjutnya disebut Dana Bersama, adalah dana gotong royong.
-2-
Pasal 2
Dana Bersama digunakan untuk prabencana.
BAB II
PENYALURAN
Pasal 3
Pada saat Peraturan ini mulai berlaku, Peraturan Kepala BNPB Nomor 5 Tahun 2020 dicabut dan dinyatakan tidak berlaku, sedangkan Peraturan Presiden Nomor 9 Tahun 2021 tetap berlaku.
Ditetapkan di Jakarta
-3-
PENJELASAN
Pasal 1 cukup jelas.
LAMPIRAN
Tabel satu."""


def cek():
    # kunci kanonik: enam bentuk sitasi
    for teks_, mau in [("Undang-Undang Nomor 24 Tahun 2007", "uu-24-2007"), ("Peraturan Pemerintah Nomor 21 Tahun 2008", "pp-21-2008"),
                       ("Peraturan Presiden Nomor 1 Tahun 2019", "perpres-1-2019"),
                       ("Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2026", "perban-1-2026"),
                       ("Peraturan Kepala Badan Nasional Penanggulangan Bencana Nomor 2 Tahun 2012", "perka-2-2012"),
                       ("Peraturan Menteri Dalam Negeri Nomor 77 Tahun 2020", "permendagri-77-2020"),
                       ("Keputusan Kepala Badan Nasional Penanggulangan Bencana Nomor 327 Tahun 2025", "kepka-327-2025")]:
        m = RX_SITASI.search(teks_)
        assert m and kunci_sitasi(m) == mau, f"kunci {teks_!r} -> {m and kunci_sitasi(m)} (mau {mau})"
    assert not RX_SITASI.search("Undang-Undang Dasar Negara Republik Indonesia Tahun 1945")
    assert kunci_dok({"slug": "keputusan-kepala-nomor-327-tahun-2025"}) == "kepka-327-2025"
    assert kunci_dok({"slug": "perban-nomor-06-tahun-2025"}) == "perban-6-2025"

    # segmentasi mini: Pasal 1..3, BAB, nomor halaman sisipan
    segs, defs = urai_dok("perban-1-2026", "Judul uji", [MINI])
    jenis = [s["jenis"] for s in segs]
    assert jenis[:3] == ["judul", "menimbang", "mengingat"], jenis
    ps = [s for s in segs if s["jenis"] == "pasal"]
    assert [s["label"] for s in ps] == ["Pasal 1", "Pasal 2", "Pasal 3"], [s["label"] for s in segs]
    assert ps[0]["bab"] == "BAB I KETENTUAN UMUM" and ps[2]["bab"] == "BAB II PENYALURAN", (ps[0]["bab"], ps[2]["bab"])
    assert not any("-2-" in s["teks"] or "-3-" in s["teks"] for s in segs), "nomor halaman bocor"
    assert any("Undang-Undang Nomor 24" in s["teks"] for s in segs if s["jenis"] == "mengingat"), "pemenggalan tak tersambung"
    assert "Penutup" in [s["label"] for s in segs] and "penjelasan" in jenis and "lampiran" in jenis, jenis
    assert {d["istilah"] for d in defs} == {"Bencana", "Dana Bersama"}, defs
    assert "Pasal 2" not in ps[0]["teks"]
    # relasi: Menimbang -> mengganti; Mengingat -> mengingat; penutup -> mencabut
    rel = {(k[1], k[2]) for k, _ in relasi_dari("perban-1-2026", segs, "Judul uji")}
    assert ("perban-1-2024", "mengganti") in rel, rel
    assert ("uu-24-2007", "mengingat") in rel and ("perka-5-2020", "mencabut") in rel and ("perpres-9-2021", "merujuk") in rel, rel
    jr = relasi_dari("perpres-46-2026", [], "Perubahan atas Peraturan Presiden Nomor 1 Tahun 2019 tentang BNPB")
    assert jr and jr[0][0][2] == "mengubah", jr
    # tanpa Pasal: dipecah per judul bagian dan <= batas
    panjang = [("I. PENDAHULUAN", 1)] + [("kalimat uji nomor %d dengan isi yang cukup panjang untuk memenuhi baris." % i, 1) for i in range(120)]
    sj = segmen_judul("juklak-1-2026", panjang, "lain")
    assert len(sj) >= 3 and all(len(s["teks"]) <= MAKS for s in sj), len(sj)
    # bentuk keluaran -layout: label+isi satu baris, penanda ayat "(1)" di awal baris tetap jadi awal baris teks segmen
    LAYOUT = """Menimbang   : a.   bahwa    untuk    tertib;
              b.   bahwa lain;
Mengingat   : 1.   Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana;
               2.   Peraturan Presiden Nomor 1 Tahun 2019 tentang Badan;
                           MEMUTUSKAN:
Menetapkan   : PERATURAN BADAN TENTANG DANA.
                                  BAB I
                             KETENTUAN UMUM
                                  Pasal 1
              Dalam Peraturan Badan ini yang dimaksud dengan:
              1. Bencana adalah peristiwa.
                                  Pasal 7
(1)   Kepala BNPB menetapkan prioritas.
(2)   Penetapan prioritas sebagaimana dimaksud pada ayat (1)
      dengan memperhatikan risiko.
                                  Pasal 8
Cukup.
Ditetapkan di Jakarta"""
    sl, _ = urai_dok("perban-9-2026", "Judul", [LAYOUT])
    p7 = next(x for x in sl if x["label"] == "Pasal 7")["teks"].split("\n")
    assert p7[0].startswith("(1) ") and p7[1].startswith("(2) ") and "memperhatikan risiko" in p7[1], p7
    mn = [x["teks"] for x in sl if x["jenis"] == "menimbang"]
    mg = [x["teks"] for x in sl if x["jenis"] == "mengingat"]
    assert mn and mg and "tertib" in mn[0] and "lain" in mn[0] and "Undang-Undang" not in mn[0], mn
    assert "Undang-Undang Nomor 24" in mg[0] and "tertib" not in mg[0], mg
    assert mn[0].count("\n") == 1 and mg[0].count("\n") == 1, (mn, mg)
    # sumber cadangan: tak ada dua sumber sekaligus; PDF salah nomor ditolak (bila berkas contoh ada di mesin ini)
    assert ada_sumber({"pdf_bnpb": "u"}) and ada_sumber({"pdf_bpk": "u"}) and not ada_sumber({"slug": "x"})
    pj = f"{MENTAH}/pdf/perka-nomor-17-tahun-2014.pdf"
    if os.path.exists(pj):
        assert cocok_nomor(pj, 17, 2014) and not cocok_nomor(pj, 18, 2014) and not cocok_nomor(pj, 17, 2015)
    # tulis SQL
    assert sql("ibu's 'x'") == "'ibu''s ''x'''" and sql(None) == "NULL" and sql(3) == "3" and sql(0.5) == "0.5"
    try:
        sisip("t", ["a"], ["x" * SQL_MAKS])
        raise SystemExit("pernyataan raksasa lolos")
    except AssertionError:
        pass
    # ensemble: OCR sehat menang atas teks-lapisan sampah; teks-lapisan sehat menang atas OCR salah baca; tanpa OCR = PDF
    kamus = set(kata("bencana penanggulangan dana bersama dengan untuk peraturan badan nasional"))
    bagus, sampah = "dana bersama untuk penanggulangan bencana nasional", "xqzv ptkw jjjj -2-"
    assert pilih_ensemble(sampah, bagus, kamus) == (bagus, True)
    assert pilih_ensemble(bagus, sampah, kamus) == (bagus, False)
    assert pilih_ensemble(bagus, "", kamus) == (bagus, False)
    assert pilih_ensemble("", bagus, kamus) == (bagus, True)
    # invarian ditolak
    d0 = [{"id": "a"}]
    for salah in ([], [{"dok": "b", "jenis": "pasal", "label": "P", "teks": "x"}], [{"dok": "a", "jenis": "pasal", "label": "P", "teks": "x" * (MAKS + 1)}]):
        try:
            periksa(d0, salah)
            raise SystemExit("invarian salah lolos")
        except AssertionError:
            pass
    # invarian nyata: pasal PERBAN/PERKA yang menyebut "ayat (2)" harus memuat penanda (1) dan (2) di awal baris (>= 90%)
    if glob.glob(f"{MENTAH}/teks/*.json"):
        _, sg = bangun()
        cand = [x for x in sg if x["jenis"] == "pasal" and x["dok"].split("-")[0] in ("perban", "perka") and "ayat (2)" in x["teks"]]
        ok = [x for x in cand if re.search(r"(?m)^\(1\) ", x["teks"]) and re.search(r"(?m)^\(2\) ", x["teks"])]
        if cand:
            porsi = len(ok) / len(cand)
            print(f"ayat (1)/(2) di awal baris: {len(ok)}/{len(cand)} pasal = {porsi:.1%}")
            assert porsi >= 0.9, f"hanya {porsi:.1%} dari {len(cand)} pasal bersitasi 'ayat (2)' memuat penanda (1)/(2) di awal baris"
    # invarian atas keluaran nyata (bila sudah dibangun)
    if os.path.exists(KATALOG):
        k = json.load(open(KATALOG))
        ids = {d["id"] for d in k["dok"]}
        assert all(d["n_segmen"] >= 1 for d in k["dok"])
        assert all(r["dari"] in ids and r["jenis"] in JENIS_REL and r["terdaftar"] == (r["ke"] in ids) for r in k["relasi"])
        assert all(df["dok"] in ids for df in k["definisi"])
    print("hukum.py --cek: hijau")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("perintah", nargs="?", choices=["tarik", "teks", "urai", "semua"])
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--paksa", action="store_true", help="teks: ulangi dokumen yang sudah punya teks/<slug>.json")
    ap.add_argument("--bpk-saja", action="store_true", help="tarik: lewati JDIH, hanya cadangan peraturan.bpk.go.id")
    ap.add_argument("--tanpa-bpk", action="store_true", help="tarik: lewati cadangan BPK")
    ap.add_argument("--tipe", nargs="*", default=["Peraturan", "Monografi", "Artikel", "Putusan"])
    a = ap.parse_args()
    if a.cek:
        return cek()
    if a.perintah in ("tarik", "semua"):
        tarik(a.tipe, jdih=not a.bpk_saja, bpk=not a.tanpa_bpk)
    if a.perintah in ("teks", "semua"):
        teks(a.paksa)
    if a.perintah in ("urai", "semua"):
        urai()
    if not a.perintah:
        ap.print_help()


if __name__ == "__main__":
    main()
