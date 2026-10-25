#!/usr/bin/env python3
"""Ekstraksi teks sumber paket `lembaga` (mentah/teks/<sid>.json.gz + mentah/meta/<sid>.json).

Bukan bagian dari `lembaga.py` (yang stdlib dan luring). Skrip ini butuh jaringan, dan untuk PDF butuh pymupdf:
  <python-ber-pymupdf> data/kajian-bnpb/bangun/ekstrak_lembaga.py bpk <sid> <url Details BPK> [hlm]   sumber baru dari peraturan.bpk.go.id
  <python-ber-pymupdf> data/kajian-bnpb/bangun/ekstrak_lembaga.py halaman <sid> <hlm>                 tambah halaman ke sid yang sudah ada
  <python-ber-pymupdf> data/kajian-bnpb/bangun/ekstrak_lembaga.py uji <sid> <hlm>                     ekstrak ulang, bandingkan dengan teks tersimpan
  python3 data/kajian-bnpb/bangun/ekstrak_lembaga.py web <sid> <url>                                   halaman web (stdlib)
  python3 data/kajian-bnpb/bangun/ekstrak_lembaga.py jdih <slug>                                       salin teks korpus JDIH lokal ke mentah/
<hlm> = indeks halaman PDF berbasis 1, mis. "1-4,64,65"; kosong = semua halaman. Nomor cetak di halaman bisa berbeda.

Aturan yang dijaga: PDF diunduh dari pdf_url di meta dan SHA-1-nya WAJIB sama dengan pdf_sha1 yang tercatat (sid lama);
teks halaman = page.get_text() pymupdf apa adanya; HTML: buang <script>/<style>, buang tag, unescape, rapatkan spasi.
"""
import datetime, gzip, hashlib, html, json, os, re, sys, tempfile, urllib.request

OUT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "lembaga", "mentah"))
UA = {"User-Agent": "Mozilla/5.0"}
BPK = "https://peraturan.bpk.go.id"


def ambil(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def teks_html(b):
    t = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", b.decode("utf-8", "replace"))
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t))).strip()


def rentang(s, total):
    if not s:
        return list(range(1, total + 1))
    hasil = set()
    for bag in s.split(","):
        a, _, b = bag.partition("-")
        hasil |= set(range(int(a), int(b or a) + 1))
    assert max(hasil) <= total, f"halaman {max(hasil)} > total {total}"
    return sorted(hasil)


def baca_meta(sid):
    return json.load(open(os.path.join(OUT, "meta", sid + ".json"), encoding="utf-8"))


def tulis(sid, meta, halaman_baru):
    p = os.path.join(OUT, "teks", sid + ".json.gz")
    lama = {}
    if os.path.exists(p):
        with gzip.open(p, "rt", encoding="utf-8") as f:
            lama = {h["n"]: h["t"] for h in json.load(f)["halaman"]}
    lama.update(halaman_baru)
    with gzip.open(p, "wt", encoding="utf-8") as f:
        json.dump({"sid": sid, "halaman": [{"n": n, "t": lama[n]} for n in sorted(lama)]}, f, ensure_ascii=False)
    if "pdf_sha1" in meta:
        meta["halaman_disimpan"] = "semua" if len(lama) == meta.get("halaman_total") else sorted(lama)
    json.dump(meta, open(os.path.join(OUT, "meta", sid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{sid}: {len(halaman_baru)} halaman ditulis, tersimpan {len(lama)}")


def pdf_halaman(meta, hlm):
    import pymupdf
    b = ambil(meta["pdf_url"])
    sha = hashlib.sha1(b).hexdigest()
    if meta.get("pdf_sha1"):
        assert sha == meta["pdf_sha1"], f"SHA-1 PDF berubah: {sha} != {meta['pdf_sha1']} (dokumen di BPK diganti; jangan campur teks)"
    meta.update(pdf_sha1=sha, pdf_bytes=len(b))
    with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
        f.write(b)
        f.flush()
        doc = pymupdf.open(f.name)
        meta["halaman_total"] = doc.page_count
        return {n: doc[n - 1].get_text() for n in rentang(hlm, doc.page_count)}


def meta_bpk(sid, url):
    b = ambil(url)
    x = teks_html(b)
    antara = lambda a, b: (re.search(re.escape(a) + r"\s*(.*?)\s*" + b, x) or [None, ""])[1]
    pdf = re.findall(r'href="(/Download/[^"]+\.pdf)"', b.decode("utf-8", "replace"))
    assert pdf, f"{url}: tautan PDF tidak ditemukan"
    return {"id": url.split("/Details/")[1].split("/")[0], "url": url, "judul": antara("Judul", r"T\.E\.U\."),
            "tanggal_penetapan": antara("Tanggal Penetapan", r"Tanggal (?:Pengundangan|Berlaku)"),
            "tanggal_berlaku": antara("Tanggal Berlaku", r"Sumber"), "sumber": antara("Sumber", r"Subjek"),
            "status": (re.search(r" Status (Berlaku|Tidak Berlaku) Bahasa", x) or [None, ""])[1], "pdf": list(dict.fromkeys(pdf)),
            "status_peraturan": antara("STATUS PERATURAN", r"ABSTRAK PERATURAN"),
            "diakses": datetime.date.today().isoformat(), "pdf_url": BPK + pdf[0], "sid": sid,
            "ekstraksi": "pymupdf get_text() atas PDF unduhan peraturan.bpk.go.id"}


def main(a):
    cmd, sid = a[0], a[1]
    if cmd == "bpk":
        meta = meta_bpk(sid, a[2])
        tulis(sid, meta, pdf_halaman(meta, a[3] if len(a) > 3 else ""))
    elif cmd == "halaman":
        meta = baca_meta(sid)
        tulis(sid, meta, pdf_halaman(meta, a[2]))
    elif cmd == "uji":
        meta = baca_meta(sid)
        baru = pdf_halaman(dict(meta), a[2])
        with gzip.open(os.path.join(OUT, "teks", sid + ".json.gz"), "rt", encoding="utf-8") as f:
            lama = {h["n"]: h["t"] for h in json.load(f)["halaman"]}
        for n, t in baru.items():
            print(f"{sid} hlm {n}: {'SAMA' if lama.get(n) == t else 'BERBEDA'}")
    elif cmd == "jdih":   # salin teks korpus JDIH lokal (gitignore) ke mentah/ supaya paket bisa dibangun dari klon bersih
        raw = os.path.abspath(os.path.join(OUT, "..", "..", "..", "..", "raw", "hukum"))
        idx = {v["slug"]: v for v in json.load(open(os.path.join(raw, "indeks.json"), encoding="utf-8")).values()}
        b = open(os.path.join(raw, "teks", sid + ".json"), "rb").read()
        pdf = os.path.join(raw, "pdf", sid + ".pdf")
        meta = dict(idx[sid], teks_sha1=hashlib.sha1(b).hexdigest(), disalin=datetime.date.today().isoformat(),
                    pdf_sha1_lokal=hashlib.sha1(open(pdf, "rb").read()).hexdigest() if os.path.exists(pdf) else "",
                    asal_teks="data/raw/hukum/teks/" + sid + ".json (scripts/bnpb/hukum.py teks: pdftotext + tesseract; docs/bnpb/HUKUM.md)")
        with gzip.open(os.path.join(OUT, "teks", "jdih-" + sid + ".json.gz"), "wt", encoding="utf-8") as f:
            f.write(b.decode("utf-8"))
        json.dump(meta, open(os.path.join(OUT, "meta", "jdih-" + sid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"jdih:{sid}: disalin")
    elif cmd == "web":
        b = ambil(a[2])
        meta = {"sid": sid, "url": a[2], "html_sha1": hashlib.sha1(b).hexdigest(), "html_bytes": len(b),
                "diakses": datetime.date.today().isoformat(), "ekstraksi": "HTML -> teks (buang tag/script/style)"}
        tulis(sid, meta, {1: teks_html(b)})
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:]) if len(sys.argv) > 2 else sys.exit(__doc__)
