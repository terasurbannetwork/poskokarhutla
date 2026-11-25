#!/usr/bin/env python3
"""Pembangun Docs Centurisk97: Markdown di docs/centurisk97 menjadi HTML statis di public/docs.

Python 3.12 stdlib saja. Rancangan: data/kajian-bnpb/docs-situs/DESAIN-TEKNIS.md dan DESIGN-SYSTEM.md (revisi 3, K6 sampai K8).
Struktur (bagian, kelompok, modul, halaman) dibaca dari docs/centurisk97/peta.json, bukan dari nama berkas.

  python3 -I scripts/docs/bangun.py                tulis keluaran (sumber yang belum ada dilewati dengan peringatan)
  python3 -I scripts/docs/bangun.py --cek          bandingkan, keluar 1 bila basi (ketat: sumber hilang adalah galat)
  python3 -I scripts/docs/bangun.py --cek-sumber   periksa sumber (peta, rujukan, tautan, kata terlarang)
  python3 -I scripts/docs/bangun.py --jalur        jalur kanonik yang diterbitkan, satu per baris
  python3 -I scripts/docs/bangun.py --uji          uji diri

Keluaran yang boleh ditulis: index.html, pengembang/**, <modul>/**, cari.json, _rute.json, _bangun.json. docs.css, gambar.css,
cetak.css, docs.js, sudut.js tulisan tangan dan gambar/ tidak pernah disentuh. Keluaran deterministik: tanggal bangun hanya berubah
bila sidik sumber berubah.
"""
import datetime
import hashlib
import html
import json
import re
import struct
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "docs" / "centurisk97"
KELUAR = AKAR / "public" / "docs"
GAMBAR = KELUAR / "gambar"
TEMPLAT = Path(__file__).resolve().parent / "templat.html"
PETA = SUMBER / "peta.json"
SITUS = "https://centurisk97.id"

BAGIAN = ("panduan", "pengembang")
AWALAN = {"panduan": "/docs", "pengembang": "/docs/pengembang"}
NAMA_BAGIAN = {"panduan": "Panduan", "pengembang": "Pengembang"}
HALAMAN_PERTAMA = {"panduan": "sekilas", "pengembang": "ikhtisar"}
RE_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
RESERVASI = {"pengembang", "cari", "gambar"}
MAKS_JUDUL = 40
MAKS_H2 = 8          # di atas ini peringatan
MAKS_KATA_PERINGATAN = 1300
MAKS_KATA_GALAT = 2000
K_MAKS = 100         # panjang cuplikan teks per bagian di indeks cari (kendali ukuran cari.json)
MAKS_CARI = 300 * 1024
ID_TERPAKAI = {"isi", "samping", "cari", "cari-hero", "docsstatus", "tocdaftar", "tocombol", "tocw", "tema"}

IKON = {
    "orang": '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
    "kode": '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6"/>',
    "semua": '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    "cari": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    "menu": '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "tautan": '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
    "cetak": '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/>',
    "kiri": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "kanan": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "keluar": '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    "bulan": '<path d="M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800Z"/>',
    "panah": '<path d="M6 9l6 6 6-6"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.5"/>',
    "rambu": '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    "peta": '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    "lapisan": '<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    "model": '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 12h4l4-5M12 12l4 5"/>',
    "air": '<path d="M3 9c2 0 2-2 4.500-2S10 9 12 9s2.500-2 4.500-2S19 9 21 9M3 15c2 0 2-2 4.500-2S10 15 12 15s2.500-2 4.500-2S19 15 21 15"/>',
    "denyut": '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    "awan": '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 11a3.500 3.500 0 0 1-.5 7z"/>',
    "grafik": '<path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/>',
    "pesan": '<path d="M4 5h16v11H9l-5 4z"/>',
    "siklus": '<path d="M20 12a8 8 0 0 1-14 5.300M4 12A8 8 0 0 1 18 6.700"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    "pesawat": '<path d="M2 14l8-2V6l2-3 2 3v6l8 2v2l-8-1v4l2 2v1l-4-1-4 1v-1l2-2v-4l-8 1z"/>',
    "gedung": '<path d="M4 21V9l8-5 8 5v12M9 21v-6h6v6M4 21h16"/>',
    "kunci": '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 8l3 3"/>',
    "topi": '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.500 9 2.500 12 0v-5"/>',
    "basisdata": '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.700 3.600 3 8 3s8-1.300 8-3V6M4 12c0 1.700 3.600 3 8 3s8-1.300 8-3"/>',
}


def ikon(nama, ukuran=16):
    return (f'<svg width="{ukuran}" height="{ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{IKON[nama]}</svg>')


# kata dan pola yang tidak boleh ada di sumber (peringatan; AGENTS.md dan keputusan pemilik)
# kalimat yang menolak vonis ("tidak pernah menyatakan aman") atau mengakui berkas belum ada / bukan berkas repo (R2, keluaran CI) tidak diperingatkan
NEGASI_VONIS = re.compile(r"\b(?:tidak|bukan|jangan|tanpa|belum|dilarang|melarang)\b", re.I)
STATUS_BELUM_ADA = re.compile(r"belum (?:ada|dibuat|dikodekan|dibangun|terbit)|tidak ada|rancang|rencana|\bR2\b|kunci|dibuat CI|keluaran|menulis|dibaca|\bGET\b|\bPOST\b|^\s*\|", re.I)
KATA_VONIS = ["aman", "bebas api", "bebas bahaya", "dijamin", "pelaku", "padam total"]
POLA_RAHASIA = [
    ("surel", re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")),
    ("nomor telepon", re.compile(r"(?<![\w.])(?:\+62|62|0)8\d[\d\s-]{7,12}\d")),
    ("token panjang", re.compile(r"(?<![\w/.\\-])[A-Za-z0-9_-]{40,}(?![\w/.\\-])")),
    ("awalan kunci", re.compile(r"\b(?:sk-[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{8,}|AKIA[0-9A-Z]{8,})")),
    ("NAMA=nilai", re.compile(r"^[A-Z][A-Z0-9_]{3,}=\S+", re.M)),
]
EKSTENSI = r"(?:py|js|mjs|cjs|json|jsonc|yml|yaml|html|css|sql|md|sh|toml|txt|csv)"
POLA_RUJUK = re.compile(r"([\w./\-\[\]@+]+\." + EKSTENSI + r"):(\d+)(?:`?\s*(?:-|–|sampai)\s*`?(\d+))?")
POLA_BERKAS = re.compile(r"^[\w.\-/@+]+/[\w.\-@+]+\." + EKSTENSI + r"$")
# bahasa awam (halaman Panduan): kode inline berupa berkas atau rute API, dan istilah mesin
POLA_KODE_TEKNIS = re.compile(r"^(?:/api/|/mcp)|\.(?:py|mjs|cjs|js|json|yml|yaml|sql|toml|sh)\b")
POLA_ISTILAH_MESIN = re.compile(r"\b(?:Worker|D1|R2|cron|Cloudflare|GitHub Actions)\b|\bcron\b", re.I)
POLA_ISTILAH_MESIN_KETAT = re.compile(r"\b(?:Worker|D1|R2)\b|\bcron\b")


class Galat(Exception):
    pass


# ---------------------------------------------------------------- utilitas teks

def tanpa_diakritik(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def slug_judul(teks):
    """Gaya GitHub: huruf kecil, buang tanda baca, spasi jadi tanda hubung."""
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", teks)
    t = tanpa_diakritik(t.replace("`", "").replace("*", "")).lower()
    t = re.sub(r"[^a-z0-9 _-]", "", t)
    t = re.sub(r"\s+", "-", t.strip())
    return t or "bagian"


def teks_polos(md):
    t = re.sub(r"`([^`]*)`", r"\1", md)
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)
    t = t.replace("**", "").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    return re.sub(r"\s+", " ", t).strip()


def baca_sumber(path):
    t = path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    return t


# ---------------------------------------------------------------- inline

STATUS_KATA = {"hipotesis": "pil-hipotesis", "lulus": "pil-lulus", "gagal": "pil-gagal", "belum diuji": "pil-belum"}
POLA_PIL_BESAR = re.compile(r"\bHIPOTESIS\b")


def pil_kelas(teks):
    return STATUS_KATA.get(teks.strip().lower())


def url_aman(url, galat, baris):
    """Kembalikan (href, tanpa_tautan) atau catat galat. tanpa_tautan = tautan ke berkas yang tidak diterbitkan."""
    if re.match(r"^[\w.-]+\.md(#[\w-]*)?$", url) or re.match(r"^(?:\.\./|\./)?[\w./-]+\.md(#[\w-]*)?$", url):
        return "", True
    if url.startswith("https://") or url.startswith("#") or re.match(r"^/[A-Za-z0-9._~%-]", url) or url == "/":
        return url, False
    galat.append((baris, f"tautan tidak diizinkan: {url[:60]}"))
    return "", True


def inline(teks, galat=None, baris=0, kelas_pil=True):
    """Markdown inline ke HTML. Seluruh teks di-escape dulu, penanda diterapkan sesudahnya."""
    galat = galat if galat is not None else []
    kode = []

    def simpan(m):
        isi = m.group(1)
        kode.append(isi)
        return f"\x00{len(kode) - 1}\x00"

    t = re.sub(r"`([^`]+)`", simpan, teks)
    t = t.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    if re.search(r"!\[[^\]]*\]\(", t):
        galat.append((baris, "gambar tidak diizinkan"))
    t = html.escape(t, quote=True)

    def tautan(m):
        href, tanpa = url_aman(html.unescape(m.group(2)), galat, baris)
        if tanpa:
            return f'<span class="tanpa-tautan">{m.group(1)}</span>'
        ext = ' rel="noopener noreferrer"' if href.startswith("https://") else ""
        return f'<a href="{html.escape(href, quote=True)}"{ext}>{m.group(1)}</a>'

    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", tautan, t)
    t = re.sub(r"\*\*(.+?)\*\*", lambda m: f"<strong>{m.group(1)}</strong>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])", lambda m: f"<em>{m.group(1)}</em>", t)
    if kelas_pil:
        t = POLA_PIL_BESAR.sub(lambda m: f'<span class="pil pil-hipotesis">{m.group(0)}</span>', t)

    def pulih(m):
        isi = kode[int(m.group(1))]
        k = pil_kelas(isi) if kelas_pil else None
        e = html.escape(isi, quote=False)
        return f'<code class="pil {k}">{e}</code>' if k else f"<code>{e}</code>"

    t = re.sub(r"\x00(\d+)\x00", pulih, t)
    if kelas_pil:  # kata status di dalam teks tebal saja
        t = re.sub(r"<strong>([^<]+)</strong>",
                   lambda m: (f'<strong class="pil {pil_kelas(m.group(1))}">{m.group(1)}</strong>'
                              if pil_kelas(m.group(1)) else m.group(0)), t)
    return t


# ---------------------------------------------------------------- blok

POLA_GAMBAR = re.compile(r"^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$")
POLA_LIST = re.compile(r"^(\s*)([-*]|\d+[.)])\s+(.*)$")
POLA_JUDUL = re.compile(r"^(#{1,4})\s+(.*?)\s*#*\s*$")
POLA_PISAH_TABEL = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$")


def pecah_sel(baris):
    b = baris.strip()
    if b.startswith("|"):
        b = b[1:]
    if b.endswith("|") and not b.endswith("\\|"):
        b = b[:-1]
    sel, cur, dalam_kode, i = [], "", False, 0
    while i < len(b):
        c = b[i]
        if c == "\\" and i + 1 < len(b) and b[i + 1] == "|":
            cur += "|"
            i += 2
            continue
        if c == "`":
            dalam_kode = not dalam_kode
        if c == "|" and not dalam_kode:
            sel.append(cur.strip())
            cur = ""
        else:
            cur += c
        i += 1
    sel.append(cur.strip())
    return sel


def parse_blok(baris_md, mulai=1):
    """Daftar baris sumber -> daftar blok (dict). Nomor baris mulai dari `mulai`."""
    blok, i, n = [], 0, len(baris_md)
    while i < n:
        b = baris_md[i]
        nomor = mulai + i
        if not b.strip():
            i += 1
            continue
        m = re.match(r"^(\s*)(`{3,})\s*([\w+-]*)\s*$", b)
        if m:
            pagar, bahasa, isi, j = m.group(2), m.group(3), [], i + 1
            while j < n and not re.match(r"^\s*" + pagar[0] + "{" + str(len(pagar)) + r",}\s*$", baris_md[j]):
                isi.append(baris_md[j])
                j += 1
            blok.append({"t": "kode", "bahasa": bahasa, "isi": "\n".join(isi), "baris": nomor})
            i = j + 1
            continue
        m = POLA_JUDUL.match(b)
        if m:
            blok.append({"t": "judul", "n": len(m.group(1)), "teks": m.group(2), "baris": nomor})
            i += 1
            continue
        if re.match(r"^\s*(-{3,}|\*{3,}|_{3,})\s*$", b):
            blok.append({"t": "hr", "baris": nomor})
            i += 1
            continue
        if re.match(r"^\s*<[A-Za-z/!]", b):
            blok.append({"t": "mentah", "teks": b.strip(), "baris": nomor})
            i += 1
            continue
        m = POLA_GAMBAR.match(b)
        if m:
            blok.append({"t": "gambar", "alt": m.group(1).strip(), "url": m.group(2), "baris": nomor})
            i += 1
            continue
        if b.lstrip().startswith(">"):
            isi = []
            while i < n and baris_md[i].lstrip().startswith(">"):
                isi.append(re.sub(r"^\s*>\s?", "", baris_md[i]))
                i += 1
            blok.append({"t": "kutip", "isi": " ".join(x.strip() for x in isi if x.strip()), "baris": nomor})
            continue
        if "|" in b and i + 1 < n and POLA_PISAH_TABEL.match(baris_md[i + 1]) and "|" in baris_md[i + 1]:
            kepala = pecah_sel(b)
            baris_t, j = [], i + 2
            while j < n and baris_md[j].strip() and "|" in baris_md[j]:
                baris_t.append(pecah_sel(baris_md[j]))
                j += 1
            blok.append({"t": "tabel", "kepala": kepala, "baris_t": baris_t, "baris": nomor})
            i = j
            continue
        if POLA_LIST.match(b):
            butir, j = [], i
            while j < n:
                bj = baris_md[j]
                mm = POLA_LIST.match(bj)
                if mm and not re.match(r"^\s*(-{3,}|\*{3,})\s*$", bj):
                    butir.append({"indent": len(mm.group(1).replace("\t", "    ")), "ord": mm.group(2)[0].isdigit(),
                                  "teks": mm.group(3).strip(), "baris": mulai + j})
                    j += 1
                elif not bj.strip():
                    k = j + 1
                    while k < n and not baris_md[k].strip():
                        k += 1
                    if k < n and POLA_LIST.match(baris_md[k]) and POLA_LIST.match(baris_md[k]).group(1) != "" and butir:
                        j = k
                    else:
                        break
                elif bj.startswith((" ", "\t")) and butir:
                    butir[-1]["teks"] += " " + bj.strip()
                    j += 1
                else:
                    break
            blok.append({"t": "daftar", "butir": butir, "baris": nomor})
            i = j
            continue
        isi, j = [b.strip()], i + 1
        while j < n and baris_md[j].strip() and not (
                POLA_JUDUL.match(baris_md[j]) or baris_md[j].lstrip().startswith(">") or POLA_LIST.match(baris_md[j])
                or re.match(r"^\s*`{3,}", baris_md[j]) or re.match(r"^\s*<[A-Za-z/!]", baris_md[j]) or POLA_GAMBAR.match(baris_md[j])):
            isi.append(baris_md[j].strip())
            j += 1
        blok.append({"t": "para", "teks": " ".join(isi), "baris": nomor})
        i = j
    return blok


def render_daftar(butir, galat):
    """Pohon daftar dari butir ber-indent. Mengembalikan HTML."""
    hasil, tumpuk = [], []  # tumpuk: [(indent, tag)]

    def tutup_sampai(indent):
        while tumpuk and tumpuk[-1][0] > indent:
            hasil.append("</li></%s>" % tumpuk.pop()[1])

    for it in butir:
        tag = "ol" if it["ord"] else "ul"
        tutup_sampai(it["indent"])
        if tumpuk and tumpuk[-1][0] == it["indent"]:
            if tumpuk[-1][1] != tag:
                hasil.append("</li></%s>" % tumpuk.pop()[1])
                hasil.append(f"<{tag}>")
                tumpuk.append((it["indent"], tag))
            else:
                hasil.append("</li>")
        else:
            hasil.append(f"<{tag}>")
            tumpuk.append((it["indent"], tag))
        hasil.append("<li>" + inline(it["teks"], galat, it["baris"]))
    while tumpuk:
        hasil.append("</li></%s>" % tumpuk.pop()[1])
    return "".join(hasil)


# ---------------------------------------------------------------- gambar

SVG_NS = "http://www.w3.org/2000/svg"
SVG_ELEMEN = {"svg", "g", "defs", "marker", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "title", "desc"}
SVG_TEKS = {"text", "tspan", "title", "desc"}
SVG_ATRIBUT = {
    "id", "class", "viewBox", "preserveAspectRatio", "d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "dx", "dy",
    "width", "height", "points", "transform", "marker-end", "marker-start", "marker-mid", "markerWidth", "markerHeight", "refX", "refY",
    "orient", "markerUnits", "text-anchor", "dominant-baseline", "font-size", "font-weight", "letter-spacing", "stroke-width",
    "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "fill", "stroke",
    "textLength", "lengthAdjust",
}
POLA_NILAI_SVG = re.compile(r"^[\w\s.,%\-+()#:/]*$")
POLA_GEOMETRI_SVG = re.compile(r"^[A-Za-z0-9\s.,\-+()]*$")
POLA_URL_DALAM = re.compile(r"^url\(#([A-Za-z][\w-]*)\)$")
POLA_GAMBAR_URL = re.compile(r"^gambar/([A-Za-z0-9][A-Za-z0-9._-]*)\.(svg|png|webp)$")
SVG_MAKS = 120 * 1024


def _lokal(tag):
    """'{ns}nama' -> ('ns', 'nama')."""
    if tag.startswith("{"):
        ns, _, nama = tag[1:].partition("}")
        return ns, nama
    return "", tag


def saring_svg(teks, alt, prefiks):
    """Saring SVG dengan daftar putih ketat, lalu serialisasi ulang. Kembali (html, daftar_galat)."""
    g = []
    if len(teks.encode("utf-8")) > SVG_MAKS:
        return "", [f"SVG lebih dari {SVG_MAKS // 1024} KB"]
    if re.search(r"<!\s*(DOCTYPE|ENTITY)|<\?xml-stylesheet|<!\[CDATA\[", teks, re.I):
        return "", ["SVG memuat DOCTYPE, ENTITY, CDATA, atau stylesheet"]
    try:
        akar = ET.fromstring(teks)
    except ET.ParseError as e:
        return "", [f"SVG tidak terurai: {e}"]
    ns, nama = _lokal(akar.tag)
    if nama != "svg" or ns not in ("", SVG_NS):
        return "", ["akar harus <svg>"]
    vb = akar.attrib.get("viewBox", "")
    if not re.match(r"^\s*-?\d+(\.\d+)?[\s,]+-?\d+(\.\d+)?[\s,]+\d+(\.\d+)?[\s,]+\d+(\.\d+)?\s*$", vb):
        g.append("SVG wajib punya viewBox empat angka")
    ids = {}

    def peta_id(v):
        if v not in ids:
            ids[v] = f"{prefiks}-{v}"
        return ids[v]

    def atribut(el, nama_el, akar_el):
        out = []
        for k, v in el.attrib.items():
            kns, kn = _lokal(k)
            if kns:
                g.append(f"atribut ber-namespace tidak diizinkan: {kn}")
                continue
            if kn.lower().startswith("on") or kn in ("style", "href"):
                g.append(f"atribut '{kn}' tidak diizinkan (warna lewat kelas dg-*, tanpa tautan atau skrip)")
                continue
            if kn not in SVG_ATRIBUT:
                g.append(f"atribut '{kn}' pada <{nama_el}> tidak ada di daftar putih")
                continue
            if akar_el and kn in ("width", "height"):
                continue  # ukuran tetap dibuang: gambar mengikuti lebar kolom lewat viewBox
            if kn == "class":
                toks = v.split()
                if not toks or any(not re.match(r"^dg-[a-z0-9-]+$", t) for t in toks):
                    g.append(f"kelas harus berawalan dg-: {v[:40]}")
                    continue
                out.append(("class", " ".join(toks)))
                continue
            if kn == "id":
                if not re.match(r"^[A-Za-z][\w-]*$", v):
                    g.append(f"id tidak sah: {v[:30]}")
                    continue
                out.append(("id", peta_id(v)))
                continue
            if kn in ("fill", "stroke", "marker-end", "marker-start", "marker-mid"):
                m = POLA_URL_DALAM.match(v)
                if m:
                    out.append((kn, f"url(#{peta_id(m.group(1))})"))
                    continue
                if kn.startswith("marker-"):
                    g.append(f"{kn} harus url(#id) internal")
                elif v not in ("none", "currentColor", "inherit"):
                    g.append(f"warna literal pada {kn}='{v[:30]}': pakai kelas dg-*")
                else:
                    out.append((kn, v))
                continue
            if "url(" in v.lower() or not POLA_NILAI_SVG.match(v):
                g.append(f"nilai atribut {kn} tidak diizinkan")
                continue
            if kn in ("d", "points", "transform") and (
                    not POLA_GEOMETRI_SVG.match(v) or re.search(r"[A-Za-z]{2,}", re.sub(r"(rotate|translate|scale|matrix|skewX|skewY)", "", v))):
                g.append(f"nilai atribut {kn} bukan geometri sah")
                continue
            out.append((kn, v))
        return out

    def ser(el, akar_el=False):
        ns_, n = _lokal(el.tag)
        if n not in SVG_ELEMEN or ns_ not in ("", SVG_NS):
            g.append(f"elemen <{n}> tidak diizinkan")
            return ""
        at = atribut(el, n, akar_el)
        if akar_el:
            kls = " ".join(["dg-svg"] + [v for k, v in at if k == "class"])
            lain = [(k, v) for k, v in at if k in ("preserveAspectRatio",)]
            at = [("viewBox", vb.strip())] + lain + [("class", kls), ("role", "img"), ("aria-label", alt), ("focusable", "false")]
        a_s = "".join(f' {k}="{html.escape(v, quote=True)}"' for k, v in at)
        dalam = ""
        if n in SVG_TEKS and el.text:
            dalam += html.escape(el.text, quote=False)
        elif el.text and el.text.strip():
            g.append(f"teks di luar <text> hilang dalam <{n}>: {el.text.strip()[:30]}")
        for anak in el:
            dalam += ser(anak)
            if n in SVG_TEKS and anak.tail:
                dalam += html.escape(anak.tail, quote=False)
            elif anak.tail and anak.tail.strip():
                g.append(f"teks di luar <text> hilang dalam <{n}>: {anak.tail.strip()[:30]}")
        return f"<{n}{a_s}>{dalam}</{n}>"

    h = ser(akar, True)
    return ("" if g else h), g


def ukuran_raster(data, ext):
    """(lebar, tinggi) dari kepala berkas PNG atau WebP, atau None."""
    try:
        if ext == "png" and data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
            return struct.unpack(">II", data[16:24])
        if ext == "webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            fc = data[12:16]
            if fc == b"VP8 ":
                w, h = struct.unpack("<HH", data[26:30])
                return w & 0x3FFF, h & 0x3FFF
            if fc == b"VP8L":
                bits = struct.unpack("<I", data[21:25])[0]
                return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
            if fc == b"VP8X":
                return int.from_bytes(data[24:27], "little") + 1, int.from_bytes(data[27:30], "little") + 1
    except (struct.error, IndexError):
        pass
    return None


def render_gambar(b, galat):
    """Blok gambar -> <figure class="dk-gbr">. Galat dicatat ke `galat` sebagai (baris, pesan)."""
    alt, url, baris = b["alt"], b["url"], b["baris"]
    if not alt:
        galat.append((baris, "gambar tanpa keterangan (teks di dalam [])"))
        return ""
    m = POLA_GAMBAR_URL.match(url)
    if not m:
        galat.append((baris, f"gambar harus berupa gambar/<nama>.svg, .png, atau .webp: {url[:60]}"))
        return ""
    stem, ext = m.group(1), m.group(2)
    p = GAMBAR / f"{stem}.{ext}"
    if not p.is_file():
        galat.append((baris, f"berkas gambar tidak ada: public/docs/gambar/{stem}.{ext}"))
        return ""
    ket = f"<figcaption>{html.escape(alt, quote=False)}</figcaption>"
    if ext == "svg":
        svg, gs = saring_svg(p.read_text(encoding="utf-8"), alt, "g-" + re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-"))
        for x in gs:
            galat.append((baris, f"{stem}.svg: {x}"))
        return f'<figure class="dk-gbr dk-gbr-svg">{svg}{ket}</figure>' if not gs else ""
    uk = ukuran_raster(p.read_bytes(), ext)
    if not uk:
        galat.append((baris, f"{stem}.{ext}: ukuran tidak terbaca dari kepala berkas"))
        return ""
    href = f"/docs/gambar/{stem}.{ext}"
    a = html.escape(alt, quote=True)
    return (f'<figure class="dk-gbr dk-gbr-raster"><a class="dk-zum" href="{href}" data-zum aria-label="Perbesar gambar: {a}">'
            f'<img src="{href}" alt="{a}" width="{uk[0]}" height="{uk[1]}" loading="lazy" decoding="async"></a>{ket}</figure>')


def sidik_gambar():
    """Sidik tiap berkas di public/docs/gambar (ikut kesegaran --cek)."""
    if not GAMBAR.is_dir():
        return {}
    return {f"gambar/{p.name}": sidik(p.read_bytes()) for p in sorted(GAMBAR.iterdir()) if p.is_file()}


class Pemberi:
    """Pemberi id judul unik per halaman."""

    def __init__(self, dipakai=()):
        self.dipakai = set(dipakai)

    def id(self, teks):
        dasar = slug_judul(teks)
        kandidat, n = dasar, 1
        while kandidat in self.dipakai:
            n += 1
            kandidat = f"{dasar}-{n}"
        self.dipakai.add(kandidat)
        return kandidat


POLA_CALLOUT = re.compile(r"^(Catatan|Peringatan|Hipotesis):\s*(.+)$")
CALLOUT_JUDUL = {"catatan": ("Catatan", "info"), "peringatan": ("Peringatan", "rambu"), "hipotesis": ("Model belum lulus uji balik", "rambu")}


def callout(jenis, isi_html):
    """Kotak catatan, peringatan, atau hipotesis: batang kiri, ikon, judul pendek, isi."""
    judul, ik = CALLOUT_JUDUL[jenis]
    lencana = ' <span class="pil pil-hipotesis kecil">Hipotesis</span>' if jenis == "hipotesis" else ""
    return (f'<aside class="dk-co dk-co-{jenis}" role="note">{ikon(ik, 18)}<div><p class="dk-co-j">{judul}{lencana}</p>'
            f'<p>{isi_html}</p></div></aside>')


def render_blok(blok, galat, pemberi, judul_ke=None, daftar_judul=None):
    """Blok -> HTML. Judul ## menjadi h2, ### h3, #### h4 (h1 dari berkas tidak pernah masuk badan)."""
    out = []
    for b in blok:
        t = b["t"]
        if t == "judul":
            tingkat = max(b["n"], 2)
            hid = pemberi.id(b["teks"])
            if daftar_judul is not None and b["n"] == 3:
                daftar_judul.append((hid, teks_polos(b["teks"]), b["baris"]))
            out.append(f'<h{tingkat} id="{hid}"><a class="jangkar" href="#{hid}" aria-label="Tautan ke bagian ini">#</a>'
                       f'{inline(b["teks"], galat, b["baris"])}</h{tingkat}>')
        elif t == "para":
            out.append(f"<p>{inline(b['teks'], galat, b['baris'])}</p>")
        elif t == "daftar":
            out.append(render_daftar(b["butir"], galat))
        elif t == "kutip":
            m = POLA_CALLOUT.match(b["isi"])
            if m:
                out.append(callout(m.group(1).lower(), inline(m.group(2), galat, b["baris"])))
            else:
                out.append(f"<blockquote><p>{inline(b['isi'], galat, b['baris'])}</p></blockquote>")
        elif t == "hr":
            out.append("<hr>")
        elif t == "kode":
            kls = f' class="language-{html.escape(b["bahasa"])}"' if b["bahasa"] else ""
            if b["bahasa"] == "mermaid":
                out.append('<p class="dk-ket-kode">Diagram (sumber mermaid, ditampilkan sebagai teks)</p>')
            lbl = f' data-bahasa="{html.escape(b["bahasa"])}"' if b["bahasa"] and b["bahasa"] != "mermaid" else ""
            out.append(f'<pre class="kode"{lbl}><code{kls}>{html.escape(b["isi"], quote=False)}</code></pre>')
        elif t == "gambar":
            out.append(render_gambar(b, galat))
        elif t == "mentah":
            galat.append((b["baris"], "HTML mentah tidak diizinkan"))
        elif t == "tabel":
            kep, bar = b["kepala"], b["baris_t"]
            lebar = len(kep)
            h = ['<div class="tabel-gulir"><table class="ex-tabel"><thead><tr>']
            h += [f'<th scope="col">{inline(c, galat, b["baris"])}</th>' for c in kep]
            h.append("</tr></thead><tbody>")
            for r in bar:
                r = (r + [""] * lebar)[:max(lebar, len(r))]
                h.append("<tr>" + "".join(f"<td>{inline(c, galat, b['baris'])}</td>" for c in r) + "</tr>")
            h.append("</tbody></table></div>")
            out.append("".join(h))
    return "\n".join(out)




# ---------------------------------------------------------------- struktur dari peta.json

def cek_peta(peta, ada_berkas):
    """Periksa peta.json. Kembalikan daftar galat (teks). ada_berkas(rel) -> bool untuk tiap berkas halaman."""
    g = []
    if not isinstance(peta, dict) or not isinstance(peta.get("versi"), int):
        return ["peta.json: 'versi' harus bilangan bulat"]
    ids_b = [b.get("id") for b in peta.get("bagian", [])]
    if ids_b != list(BAGIAN):
        g.append(f"peta.json: bagian harus {list(BAGIAN)}, ada {ids_b}")
    kel = {}
    for k in peta.get("kelompok", []):
        if k.get("id") in kel:
            g.append(f"kelompok kembar: {k.get('id')}")
        if not RE_ID.match(str(k.get("id", ""))) or k.get("bagian") not in BAGIAN or not k.get("judul"):
            g.append(f"kelompok tidak sah: {k}")
        kel[k.get("id")] = k
    modul_ids = set()
    for m in peta.get("modul", []):
        mid = str(m.get("id", ""))
        if not RE_ID.match(mid) or mid in RESERVASI or mid in modul_ids:
            g.append(f"id modul tidak sah, kembar, atau terlarang: {mid}")
        modul_ids.add(mid)
        if m.get("ikon") not in IKON:
            g.append(f"modul {mid}: ikon tidak dikenal: {m.get('ikon')}")
        for b in BAGIAN:
            hal = m.get("halaman", {}).get(b) or []
            if not hal:
                continue
            kb = m.get("kelompok", {}).get(b)
            if kb not in kel or kel[kb].get("bagian") != b:
                g.append(f"modul {mid}/{b}: kelompok '{kb}' tidak ada untuk bagian itu")
            jm = (m.get("judul") or {}).get(b, "")
            if not jm or len(jm) > MAKS_JUDUL:
                g.append(f"modul {mid}/{b}: judul kosong atau lebih dari {MAKS_JUDUL} karakter")
            if not (m.get("ringkas") or {}).get(b):
                g.append(f"modul {mid}/{b}: ringkas kosong")
            hid = set()
            for n, h in enumerate(hal, 1):
                i = str(h.get("id", ""))
                if not RE_ID.match(i) or i in hid:
                    g.append(f"modul {mid}/{b}: id halaman tidak sah atau kembar: {i}")
                hid.add(i)
                if not h.get("judul") or len(h["judul"]) > MAKS_JUDUL:
                    g.append(f"{mid}/{b}/{i}: judul kosong atau lebih dari {MAKS_JUDUL} karakter")
                pola = re.compile(r"^" + b + "/" + re.escape(mid) + r"/(\d\d)-" + re.escape(i) + r"\.md$")
                mm = pola.match(str(h.get("berkas", "")))
                if not mm:
                    g.append(f"{mid}/{b}/{i}: berkas harus {b}/{mid}/NN-{i}.md, ada {h.get('berkas')}")
                elif int(mm.group(1)) != n:
                    g.append(f"{mid}/{b}/{i}: nomor berkas {mm.group(1)} bukan {n:02d} (urutan harus tanpa celah)")
                elif not ada_berkas(h["berkas"]):
                    g.append(f"{mid}/{b}/{i}: berkas {h['berkas']} tidak ada")
            if hal[0].get("id") != HALAMAN_PERTAMA[b]:
                g.append(f"modul {mid}/{b}: halaman pertama harus '{HALAMAN_PERTAMA[b]}'")
            if hal[-1].get("id") != "batasan":
                g.append(f"modul {mid}/{b}: halaman terakhir harus 'batasan'")
    return g


class Struktur:
    """Hasil baca peta.json: halaman yang benar-benar dibangun (sumbernya ada), urut baca per bagian."""

    def __init__(self, peta, ada_berkas):
        self.peta = peta
        self.peringatan = []
        self.kelompok = {b: [k for k in peta["kelompok"] if k["bagian"] == b] for b in BAGIAN}
        self.modul = {b: [] for b in BAGIAN}      # per bagian: modul urut kelompok lalu urutan peta
        self.halaman = {b: [] for b in BAGIAN}    # urut baca
        for b in BAGIAN:
            for k in self.kelompok[b]:
                for m in peta["modul"]:
                    hal = (m.get("halaman") or {}).get(b) or []
                    if not hal or m["kelompok"].get(b) != k["id"]:
                        continue
                    ada = []
                    for n, h in enumerate(hal, 1):
                        if ada_berkas(h["berkas"]):
                            ada.append({"b": b, "m": m["id"], "id": h["id"], "judul": h["judul"], "berkas": h["berkas"], "no": n,
                                        "url": f"{AWALAN[b]}/{m['id']}/{h['id']}", "keluar": self.keluar_halaman(b, m["id"], h["id"])})
                        else:
                            self.peringatan.append(f"sumber belum ada, dilewati: {h['berkas']}")
                    if not ada:
                        continue
                    mod = {"b": b, "id": m["id"], "kelompok": k["id"], "ikon": m["ikon"], "judul": m["judul"][b], "ringkas": m["ringkas"][b],
                           "url": f"{AWALAN[b]}/{m['id']}", "keluar": self.keluar_depan(b, m["id"]), "halaman": ada}
                    self.modul[b].append(mod)
                    self.halaman[b] += ada
        self.mulai = {}
        for b in BAGIAN:
            self.mulai[b] = []
            for kartu in (peta.get("mulai") or {}).get(b, []):
                tautan = []
                for mid, hid in kartu.get("tautan", []):
                    h = self.cari_halaman(b, mid, hid)
                    if h:
                        tautan.append(h)
                    else:
                        self.peringatan.append(f"mulai/{b}/{kartu.get('peran')}: tautan {mid}/{hid} tidak ada")
                self.mulai[b].append({**kartu, "halaman": tautan})

    @staticmethod
    def keluar_depan(b, mid):
        return f"{mid}/index.html" if b == "panduan" else f"pengembang/{mid}/index.html"

    @staticmethod
    def keluar_halaman(b, mid, hid):
        return f"{mid}/{hid}.html" if b == "panduan" else f"pengembang/{mid}/{hid}.html"

    def cari_halaman(self, b, mid, hid):
        for h in self.halaman[b]:
            if h["m"] == mid and h["id"] == hid:
                return h
        return None

    def cari_modul(self, b, mid):
        return next((m for m in self.modul[b] if m["id"] == mid), None)

    def jalur(self):
        """Jalur kanonik berurutan: beranda, lalu per bagian modul dan halamannya."""
        out = []
        for b in BAGIAN:
            out.append(AWALAN[b])
            for m in self.modul[b]:
                out.append(m["url"])
                out += [h["url"] for h in m["halaman"]]
        return out


def muat_struktur(ketat=False):
    """Baca peta.json. ketat=True: berkas halaman yang hilang adalah galat. Kembalikan Struktur."""
    try:
        peta = json.loads(PETA.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise Galat(f"docs/centurisk97/peta.json tidak terbaca: {e}")
    ada = lambda rel: (SUMBER / rel).is_file()  # noqa: E731
    # mode biasa memaafkan berkas halaman yang hilang (dilewati dengan peringatan); galat struktur lain tetap menghentikan
    galat = cek_peta(peta, ada if ketat else (lambda rel: True))
    if galat:
        raise Galat("peta.json tidak sah: " + "; ".join(galat[:6]) + (f" (+{len(galat) - 6} lagi)" if len(galat) > 6 else ""))
    return Struktur(peta, ada)


# ---------------------------------------------------------------- pemeriksaan sumber halaman

def pecah_halaman(teks):
    """h1, blok pembuka (di bawah h1, sebelum ##), dan daftar ## beserta isi (### dan #### tetap di dalamnya)."""
    return pecah_bagian(teks)


def kata_halaman(teks):
    t = "\n".join(buang_kode_berpagar(teks))
    t = re.sub(r"[`*|#>\-]", " ", t)
    return len(t.split())


def periksa_sumber(teks, nama, ada, bagian=None, jalur_ada=None, jangkar_ada=None):
    """Kembalikan daftar (tingkat, baris, pesan). tingkat: galat atau peringatan. bagian: 'panduan' memicu pemeriksa bahasa awam."""
    hasil = []
    h1, pembuka, h2 = pecah_halaman(teks)
    if len(h1) != 1:
        hasil.append(("galat", h1[1]["baris"] if len(h1) > 1 else 1, f"harus tepat satu judul #, ada {len(h1)}"))
    if not h2 and not pembuka:
        hasil.append(("galat", 1, "halaman kosong"))
    for b in h2:
        if not b["blok"]:
            hasil.append(("peringatan", b["baris"], f"bagian '{b['nama']}' kosong"))
    if len(h2) > MAKS_H2:
        hasil.append(("peringatan", 1, f"{len(h2)} bagian ##, maksimum {MAKS_H2}: pecah halaman"))
    kata = kata_halaman(teks)
    if kata > MAKS_KATA_GALAT:
        hasil.append(("galat", 1, f"{kata} kata, maksimum {MAKS_KATA_GALAT}: pecah halaman"))
    elif kata > MAKS_KATA_PERINGATAN:
        hasil.append(("peringatan", 1, f"{kata} kata, di atas {MAKS_KATA_PERINGATAN}: pertimbangkan memecah"))
    # galat sintaks dari render (HTML mentah, tautan terlarang, gambar)
    galat_r, pemberi = [], Pemberi(ID_TERPAKAI)
    render_blok(pembuka, galat_r, pemberi)
    for b in h2:
        render_blok(b["blok"], galat_r, pemberi)
    for baris, pesan in galat_r:
        hasil.append(("galat", baris, pesan))
    # pemeriksaan per baris di luar kode berpagar
    for no, b in enumerate(buang_kode_berpagar(teks), 1):
        if "Pantau Bencana" in b:
            hasil.append(("peringatan", no, "nama produk lama 'Pantau Bencana'"))
        if "·" in b:
            hasil.append(("peringatan", no, "titik tengah sebagai pemisah"))
        for kata_v in KATA_VONIS:
            if re.search(r"(?<![\w-])" + re.escape(kata_v) + r"(?![\w-])", b, re.I) and not (
                    NEGASI_VONIS.search(b) or (kata_v == "pelaku" and re.search(r"pelaku (?:bantuan|usaha|lembaga)", b, re.I))):
                hasil.append(("peringatan", no, f"kata vonis terlarang '{kata_v}'"))
        for label, pola in POLA_RAHASIA:
            if pola.search(b):
                hasil.append(("peringatan", no, f"kemungkinan {label} (data pribadi atau rahasia)"))
        if bagian == "panduan":
            for m in re.finditer(r"`([^`]+)`", b):
                tok = m.group(1)
                if POLA_KODE_TEKNIS.search(tok) or POLA_BERKAS.match(tok):
                    hasil.append(("peringatan", no, f"bahasa awam: kode teknis di Panduan: {tok[:40]}"))
            sisa = re.sub(r"`[^`]*`", "", b)
            for m in POLA_ISTILAH_MESIN_KETAT.finditer(sisa):
                hasil.append(("peringatan", no, f"bahasa awam: istilah mesin di Panduan: {m.group(0)}"))
        for m in POLA_RUJUK.finditer(b):
            rel, a, z = m.group(1), int(m.group(2)), m.group(3)
            n = ada(rel)
            if n is None:
                hasil.append(("peringatan", no, f"rujukan ke berkas yang tidak ada: {rel}"))
                continue
            if a < 1 or a > n:
                hasil.append(("peringatan", no, f"baris {a} di luar {rel} (panjang {n})"))
            if z is not None and (int(z) < a or int(z) > n):
                hasil.append(("peringatan", no, f"rentang {a}-{z} tidak sah untuk {rel} (panjang {n})"))
        for m in re.finditer(r"`([^`\s]+)`", b):
            tok = m.group(1)
            if POLA_BERKAS.match(tok) and not re.search(r"[*<>{}]", tok) and ada(tok) is None \
                    and not POLA_RUJUK.search(tok) and not tok.startswith(("/", "public/docs/")) \
                    and not STATUS_BELUM_ADA.search(b):
                hasil.append(("peringatan", no, f"berkas yang disebut tidak ada di repo: {tok}"))
        for m in re.finditer(r"\]\(([^)\s]+)\)", b):
            url = m.group(1)
            if url.startswith("/docs") and jalur_ada is not None:
                jalur, _, jk = url.partition("#")
                jalur = jalur.rstrip("/") or "/"
                if jalur not in jalur_ada:
                    hasil.append(("galat", no, f"tautan ke halaman Docs yang tidak ada: {url}"))
                elif jk and jangkar_ada is not None and jk not in jangkar_ada.get(jalur, set()):
                    hasil.append(("peringatan", no, f"jangkar tidak ditemukan: {url}"))
            elif url.startswith("#") and jangkar_ada is not None and url[1:] not in jangkar_ada.get("__ini__", set()):
                hasil.append(("peringatan", no, f"jangkar tidak ditemukan di halaman ini: {url}"))
            elif re.match(r"^[\w./-]+\.md(?:#[\w-]*)?$", url):
                hasil.append(("peringatan", no, f"tautan ke berkas .md tidak diterbitkan: {url}"))
    for no, ln in enumerate(teks.split("\n"), 1):
        if ln.lstrip().startswith("|") and "`" not in ln and ln.count("|") - 1 > 6 and not re.match(r"^\s*\|[\s:|-]+\|\s*$", ln):
            hasil.append(("peringatan", no, "tabel lebih dari 6 kolom: pecah di sumber"))
            break
    return hasil


class JumlahBaris:
    """Cache jumlah baris berkas repo; ada(path) -> jumlah baris (terbesar bila nama polos cocok banyak) atau None."""

    def __init__(self, akar):
        self.akar, self.cache, self.peta = akar, {}, None

    def _peta_nama(self):
        if self.peta is None:
            self.peta = {}
            try:
                import subprocess
                keluar = subprocess.run(["git", "-C", str(self.akar), "ls-files"], capture_output=True, text=True, timeout=60).stdout
                for rel in keluar.split(chr(10)):
                    if rel:
                        self.peta.setdefault(rel.rsplit("/", 1)[-1], []).append(rel)
            except (OSError, ValueError, ImportError):
                pass
        return self.peta

    def _jumlah(self, rel):
        p = self.akar / rel
        try:
            if p.is_file():
                t = p.read_text(encoding="utf-8", errors="replace")
                return len(t.split(chr(10))) - (1 if t.endswith(chr(10)) else 0)
        except OSError:
            pass
        return None

    def __call__(self, rel):
        if rel in self.cache:
            return self.cache[rel]
        n = self._jumlah(rel)
        if n is None and "/" not in rel:  # nama polos: cari di repo, ambil yang terpanjang
            cocok = [self._jumlah(r) for r in self._peta_nama().get(rel, [])]
            cocok = [c for c in cocok if c is not None]
            n = max(cocok) if cocok else None
        elif n is None:
            n = self._jumlah("public/" + rel)
        self.cache[rel] = n
        return n


def buang_kode_berpagar(teks):
    """Ganti isi blok kode berpagar dengan baris kosong supaya nomor baris tetap sama."""
    out, dalam = [], False
    for b in teks.split("\n"):
        if re.match(r"^\s*`{3,}", b):
            dalam = not dalam
            out.append("")
        else:
            out.append("" if dalam else b)
    return out


def pecah_bagian(teks):
    """Pisahkan berkas halaman: judul h1, blok pembuka (di bawah h1, sebelum ##), dan daftar ## beserta blok."""
    baris = teks.split("\n")
    blok = parse_blok(baris)
    h1, pembuka, bagian, sekarang = [], [], [], None
    for b in blok:
        if b["t"] == "judul" and b["n"] == 1:
            h1.append(b)
        elif b["t"] == "judul" and b["n"] == 2:
            sekarang = {"nama": b["teks"], "baris": b["baris"], "blok": []}
            bagian.append(sekarang)
        elif sekarang is None:
            pembuka.append(b)
        else:
            sekarang["blok"].append(b)
    return h1, pembuka, bagian


# ---------------------------------------------------------------- potongan HTML

def potong_kalimat(t, maks=260):
    t = re.sub(r"\s+", " ", t).strip()
    kal = re.split(r"(?<=[.!?])\s+", t)
    out = ""
    for k in kal[:2]:
        if len(out) + len(k) > maks and out:
            break
        out = (out + " " + k).strip()
    if len(out) > maks:
        out = out[:maks].rsplit(" ", 1)[0] + "..."
    return out


def tanggal_id(iso):
    bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {bulan[m - 1]} {y}"


def satu_kalimat(t, maks=170):
    """Kalimat pertama saja, dipotong di batas kata bila lebih dari maks karakter."""
    t = re.sub(r"\s+", " ", t).strip()
    k = re.split(r"(?<=[.!?])\s+", t)[0]
    if len(k) > maks:
        k = k[:maks].rsplit(" ", 1)[0].rstrip(",;:") + "..."
    return k


def ringkas_kartu(t):
    """Kalimat pembuka untuk kartu: 'Halaman ini menjelaskan X.' menjadi 'Menjelaskan X.'"""
    k = satu_kalimat(t)
    m = re.match(r"^Halaman ini\s+(\w+)\s+(.*)$", k)
    if m:
        k = m.group(1).capitalize() + " " + m.group(2)
    return k


def kotak_cari(id_, besar=False):
    kls = "dk-cari dk-cari-besar" if besar else "dk-cari"
    return (f'<div class="{kls}" data-cari><label class="dk-cari-kotak"><span class="sr">Cari di Docs</span>{ikon("cari", 18)}'
            f'<input type="search" id="{id_}" class="dk-cari-in" placeholder="Cari di Docs" autocomplete="off" spellcheck="false" '
            f'role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="{id_}-hasil" aria-autocomplete="list">'
            f'<kbd class="dk-kbd" aria-hidden="true">/</kbd></label>'
            f'<div class="dk-panel" hidden><ul id="{id_}-hasil" class="dk-hasil" role="listbox" aria-label="Hasil pencarian"></ul>'
            f'<p class="dk-pesan" role="status"></p></div></div>')


_STR = {}   # struktur aktif, diisi kumpulkan() supaya tab bisa menunjuk padanan modul di bagian lain


def tab_bagian(b, kelas="dk-tab", modul=None):
    h = [f'<nav class="{kelas}" aria-label="Bagian">']
    S = _STR.get("S")
    for k in BAGIAN:
        cur = ' aria-current="page"' if k == b else ""
        href = AWALAN[k]
        if modul and k != b and S is not None:
            m = next((x for x in S.modul[k] if x["id"] == modul), None)
            if m:
                href = m["url"]
        h.append(f'<a href="{href}"{cur}>{NAMA_BAGIAN[k]}</a>')
    h.append("</nav>")
    return "".join(h)


def nav_html(S, b, aktif_modul=None, aktif_halaman=None, beranda=False):
    """Bilah samping tiga tingkat: kelompok (judul kecil), modul (bisa dilipat), halaman. Hanya modul aktif yang terbuka."""
    h = [f'<nav class="dk-nav" aria-label="Daftar topik {NAMA_BAGIAN[b]}">']
    cur = ' aria-current="page"' if beranda else ""
    h.append(f'<a class="dk-beranda" href="{AWALAN[b]}"{cur}>{ikon("kiri", 14)}Beranda {NAMA_BAGIAN[b]}</a>')
    for k in S.kelompok[b]:
        mods = [m for m in S.modul[b] if m["kelompok"] == k["id"]]
        if not mods:
            continue
        h.append(f'<p class="dk-kel-j">{html.escape(k["judul"])}</p>')
        for m in mods:
            aktif = m["id"] == aktif_modul
            idl = f"dk-m-{b[0]}-{m['id']}"
            cm = ' aria-current="page"' if aktif and aktif_halaman is None else ""
            h.append(f'<div class="dk-mod{" buka" if aktif else ""}"><div class="dk-mod-k"><a class="dk-mod-a" href="{m["url"]}"{cm}>'
                     f'{ikon(m["ikon"], 16)}<span>{html.escape(m["judul"])}</span></a>'
                     f'<button type="button" class="dk-mod-t" aria-expanded="{"true" if aktif else "false"}" aria-controls="{idl}" '
                     f'aria-label="Lipat atau buka {html.escape(m["judul"], quote=True)}">{ikon("panah", 14)}</button></div><ul id="{idl}">')
            for hl in m["halaman"]:
                ch = ' aria-current="page"' if aktif and hl["id"] == aktif_halaman else ""
                h.append(f'<li><a href="{hl["url"]}"{ch}>{html.escape(hl["judul"])}</a></li>')
            h.append("</ul></div>")
    h.append("</nav>")
    return "".join(h)


def callout_hipotesis():
    return callout("hipotesis", 'Bagian ini memuat model yang belum lulus uji balik. Angkanya tampil berlabel hipotesis, '
                   'dan bagian yang bersangkutan ditandai <span class="pil pil-hipotesis">HIPOTESIS</span>.')


def remah(S, b, modul=None, halaman=None):
    p = ['<a href="/docs">Docs</a>']
    if b == "pengembang":
        p.append('<a href="/docs/pengembang">Pengembang</a>' if (modul or halaman) else '<span aria-current="page">Pengembang</span>')
    if modul:
        if halaman:
            p.append(f'<a href="{modul["url"]}">{html.escape(modul["judul"])}</a>')
            p.append(f'<span aria-current="page">{html.escape(halaman["judul"])}</span>')
        else:
            p.append(f'<span aria-current="page">{html.escape(modul["judul"])}</span>')
    return '<nav class="dk-remah" aria-label="Remah roti">' + '<span aria-hidden="true">/</span>'.join(p) + "</nav>"


def aksi_html():
    def tb(kode, label, ik):
        return f'<button type="button" class="dk-ikon" data-aksi="{kode}" aria-label="{label}" title="{label}">{ikon(ik, 18)}</button>'
    return '<div class="dk-aksi">' + tb("salin", "Salin tautan halaman", "tautan") + tb("cetak", "Cetak halaman", "cetak") + "</div>"


def kaki_pn(S, h):
    urut = S.halaman[h["b"]]
    i = next(k for k, t in enumerate(urut) if t is h)

    def label(t):
        if t["m"] != h["m"]:
            return f'{S.cari_modul(t["b"], t["m"])["judul"]}: {t["judul"]}'
        return t["judul"]
    out = ['<nav class="dk-pn" aria-label="Halaman sebelum dan sesudah">']
    if i > 0:
        t = urut[i - 1]
        out.append(f'<a class="dk-pn-a dk-pn-s" rel="prev" href="{t["url"]}"><span class="dk-pn-l">{ikon("kiri", 14)}Sebelumnya</span>'
                   f'<span class="dk-pn-j">{html.escape(label(t))}</span></a>')
    if i < len(urut) - 1:
        t = urut[i + 1]
        out.append(f'<a class="dk-pn-a dk-pn-b" rel="next" href="{t["url"]}"><span class="dk-pn-l">Berikutnya{ikon("kanan", 14)}</span>'
                   f'<span class="dk-pn-j">{html.escape(label(t))}</span></a>')
    out.append("</nav>")
    return "".join(out)


def toc_html(butir):
    """butir: [(id, nama)] hanya h2. Kosong bila kurang dari dua. Satu tombol buka di layar sempit."""
    if len(butir) < 2:
        return ""
    h = ['<nav class="dk-toc" aria-label="Di halaman ini"><p class="dk-toc-j dk-toc-p">Di halaman ini</p>'
         f'<button type="button" class="dk-toc-j dk-toc-t" id="tocTombol" aria-expanded="false" aria-controls="tocDaftar" hidden>'
         f'<span>Di halaman ini</span><span class="dk-toc-n">{len(butir)} bagian</span></button><ul id="tocDaftar">']
    for sid, nama in butir:
        h.append(f'<li><a href="#{sid}" title="{html.escape(nama, quote=True)}">{html.escape(nama)}</a></li>')
    h.append("</ul></nav>")
    return "".join(h)


def kaki_docs(S, b):
    """Kaki per bagian: satu kolom per kelompok bagian itu (modul sebagai tautan), kolom Situs, tanggal dipasang templat."""
    kol = []
    for k in S.kelompok[b]:
        anak = [f'<li><a href="{m["url"]}">{html.escape(m["judul"])}</a></li>' for m in S.modul[b] if m["kelompok"] == k["id"]]
        if anak:
            kol.append(f'<div class="dk-kaki-kol"><p>{html.escape(k["judul"])}</p><ul>{"".join(anak)}</ul></div>')
    situs = [("/", "Peta Centurisk97"), ("/tentang", "Tentang"), ("/privasi", "Privasi"), ("/syarat", "Syarat penggunaan")]
    kol.append('<div class="dk-kaki-kol"><p>Situs</p><ul>' + "".join(f'<li><a href="{u}">{t}</a></li>' for u, t in situs) + "</ul></div>")
    return ('<div class="dk-kaki-atas"><div class="dk-kaki-merek"><a href="/docs" class="dk-kaki-logo"><strong>Docs</strong> Centurisk97</a>'
            f'<p>{"Panduan memakai Centurisk97 dan cara tiap angka dihitung." if b == "panduan" else "Referensi teknis Centurisk97 untuk pengembang."}</p></div>'
            f'<div class="dk-kaki-kisi">{"".join(kol)}</div></div>')


def isi_templat(ctx, tanggal):
    t = TEMPLAT.read_text(encoding="utf-8").replace("\r\n", "\n")
    if ctx["tingkat"] == "beranda":
        judul_html = html.escape(ctx["judul"])
    else:
        jejak = [x for x in ctx.get("jejak", [ctx["judul"]]) if x]
        judul_html = html.escape(" | ".join(dict.fromkeys(jejak + ["Docs Centurisk97"])))
    peta = {
        "{{JUDUL}}": judul_html, "{{DESKRIPSI}}": html.escape(ctx["deskripsi"], quote=True),
        "{{KANONIK}}": ctx["kanonik"], "{{NAV}}": ctx["nav"], "{{ISI}}": ctx["isi"], "{{TOC}}": ctx["toc"],
        "{{TANGGAL}}": tanggal_id(tanggal), "{{KAKI}}": ctx["kaki"], "{{KELAS}}": f'docs-{ctx["tingkat"]} docs-{ctx["bagian"]}',
        "{{CARI}}": kotak_cari("cari"), "{{TAB}}": tab_bagian(ctx["bagian"], modul=ctx.get("modul")),
        "{{IKON_MENU}}": ikon("menu", 20), "{{IKON_KELUAR}}": ikon("keluar", 16), "{{IKON_BULAN}}": ikon("bulan", 18),
    }
    for k, v in peta.items():
        t = t.replace(k, v)
    return t


def sidik(teks_b):
    return hashlib.sha256(teks_b).hexdigest()


# ---------------------------------------------------------------- halaman

def teks_blok(blk):
    """Teks polos sebuah blok untuk indeks cari."""
    t = blk["t"]
    if t in ("judul", "para"):
        return teks_polos(blk["teks"])
    if t == "kutip":
        return teks_polos(blk["isi"])
    if t == "daftar":
        return " ".join(teks_polos(i["teks"]) for i in blk["butir"])
    if t == "tabel":
        return " ".join(teks_polos(" ".join(r)) for r in [blk["kepala"]] + blk["baris_t"])
    if t == "kode":
        return " ".join(blk["isi"].split())
    if t == "gambar":
        return teks_polos(blk["alt"])
    return ""


def bersih_cari(t, maks):
    t = re.sub(r"[<>`]", "", re.sub(r"\s+", " ", t)).strip()
    if len(t) > maks:
        t = t[:maks].rsplit(" ", 1)[0]
    return t


def olah_halaman(S, h, pembaca_peta=None):
    """Baca dan render satu halaman. Kembalikan dict: html isi, id, h2, galat, indeks cari, ringkas, hipotesis."""
    path = SUMBER / h["berkas"]
    teks = baca_sumber(path)
    h1, pembuka, h2 = pecah_halaman(teks)
    galat = []
    if len(h1) != 1:
        raise Galat(f"{h['berkas']}: harus tepat satu judul #, ada {len(h1)}")
    pemberi = Pemberi(ID_TERPAKAI)
    judul = teks_polos(h1[0]["teks"])
    pengantar, sisa_pembuka = "", []
    for blk in pembuka:
        if blk["t"] == "para" and not pengantar:
            pengantar = blk["teks"]
        elif blk["t"] == "kutip" and not POLA_CALLOUT.match(blk["isi"]):
            inline(blk["isi"], galat, blk["baris"])  # tetap diperiksa; catatan pengerja tidak ditampilkan
        else:
            sisa_pembuka.append(blk)
    pengantar_html = f'<p class="dk-pengantar">{inline(pengantar, galat, 0)}</p>' if pengantar else ""
    bagian_html, toc, ids = [render_blok(sisa_pembuka, galat, pemberi)] if sisa_pembuka else [], [], set()
    indeks = []
    pil = re.compile(r'class="pil pil-hipotesis"')
    sudah_callout = False
    memuat = bool(POLA_PIL_BESAR.search(re.sub(r"`[^`]*`", "", teks)))
    if sisa_pembuka and pil.search(bagian_html[0]) and memuat:
        bagian_html.insert(0, callout_hipotesis())
        sudah_callout = True
    cari_awal = bersih_cari(" ".join([teks_polos(pengantar)] + [teks_blok(b) for b in sisa_pembuka]), K_MAKS)
    indeks.append({"b": judul, "k": cari_awal, "id": ""})
    for sec in h2:
        sid = pemberi.id(sec["nama"])
        ids.add(sid)
        isi = render_blok(sec["blok"], galat, pemberi)
        callout_h = ""
        if memuat and not sudah_callout and pil.search(isi):
            callout_h = callout_hipotesis()
            sudah_callout = True
        nama_html = inline(sec["nama"], galat, sec["baris"], False)
        bagian_html.append(f'<h2 id="{sid}"><a class="jangkar" href="#{sid}" aria-label="Tautan ke bagian ini">#</a>{nama_html}</h2>\n{callout_h}{isi}')
        toc.append((sid, teks_polos(sec["nama"])))
        indeks.append({"b": teks_polos(sec["nama"]), "k": bersih_cari(" ".join(teks_blok(b) for b in sec["blok"]), K_MAKS), "id": sid})
    if galat:
        raise Galat(f"{h['berkas']}:{galat[0][0]}: {galat[0][1]}")
    ids |= {i for i in pemberi.dipakai} - ID_TERPAKAI
    return {"judul": judul, "h1_html": inline(h1[0]["teks"], [], 0, False), "pengantar": pengantar_html, "pengantar_polos": teks_polos(pengantar),
            "isi": '<div class="dk-bd">' + "\n".join(bagian_html) + "</div>", "toc": toc, "ids": ids, "indeks": indeks,
            "hipotesis": memuat, "kata": kata_halaman(teks)}


def bangun_halaman(S, h, o):
    mod = S.cari_modul(h["b"], h["m"])
    kepala = (f'<header class="dk-kepala">{tab_bagian(h["b"], "dk-tab-hp", h["m"])}{remah(S, h["b"], mod, h)}'
              f'<div class="dk-judul"><h1>{o["h1_html"]}</h1>{aksi_html()}</div>{o["pengantar"]}</header>')
    ctx = {
        "judul": o["judul"], "deskripsi": potong_kalimat(o["pengantar_polos"], 200), "kanonik": SITUS + h["url"], "modul": h["m"],
        "jejak": [o["judul"], mod["judul"], NAMA_BAGIAN[h["b"]]],
        "isi": kepala + "\n" + o["isi"] + "\n" + kaki_pn(S, h), "toc": toc_html(o["toc"]),
        "nav": nav_html(S, h["b"], h["m"], h["id"]), "kaki": kaki_docs(S, h["b"]), "tingkat": "halaman", "bagian": h["b"],
    }
    return ctx


def bangun_depan_modul(S, m):
    b = m["b"]
    kartu = []
    for hl in m["halaman"]:
        o = hl["_o"]
        pil_h = '<span class="pil pil-hipotesis kecil">Hipotesis</span>' if o["hipotesis"] else ""
        kartu.append(f'<li><a class="dk-kartu" href="{hl["url"]}"><span class="dk-kartu-no">{hl["no"]}</span><strong>{html.escape(hl["judul"])}</strong>'
                     f'<span class="rg">{html.escape(ringkas_kartu(o["pengantar_polos"]))}</span>{pil_h}</a></li>')
    pertama = m["halaman"][0]
    kepala = (f'<header class="dk-kepala">{tab_bagian(b, "dk-tab-hp", m["id"])}{remah(S, b, m)}<div class="dk-judul"><h1>{html.escape(m["judul"])}</h1></div>'
              f'<p class="dk-pengantar">{html.escape(m["ringkas"])}</p></header>')
    isi = (kepala + f'<ul class="dk-kisi dk-kisi-hal">{"".join(kartu)}</ul>'
           f'<div class="dk-tombol"><a class="tb tb-primer" href="{pertama["url"]}">Mulai dari halaman 1</a></div>'
           f'<nav class="dk-pn" aria-label="Halaman sebelum dan sesudah"><a class="dk-pn-a dk-pn-b" rel="next" href="{pertama["url"]}">'
           f'<span class="dk-pn-l">Berikutnya{ikon("kanan", 14)}</span><span class="dk-pn-j">{html.escape(pertama["judul"])}</span></a></nav>')
    return {"judul": m["judul"], "deskripsi": potong_kalimat(m["ringkas"], 200), "kanonik": SITUS + m["url"], "isi": isi, "toc": "",
            "modul": m["id"], "jejak": [m["judul"], NAMA_BAGIAN[b]],
            "nav": nav_html(S, b, m["id"], None), "kaki": kaki_docs(S, b), "tingkat": "modul", "bagian": b}


def bangun_beranda(S, b):
    p = b == "panduan"
    mulai = ['<section class="dk-mulai-bag" id="mulai-dari-sini"><p class="dk-label">Mulai dari sini</p><div class="dk-mulai">']
    for kartu in S.mulai[b]:
        mulai.append(f'<div class="dk-peran"><div class="dk-peran-kepala"><p class="dk-mulai-j">{html.escape(kartu["judul"])}</p>'
                     f'<p class="dk-peran-ket">{html.escape(kartu["ringkas"])}</p></div><ul>')
        for hl in kartu["halaman"]:
            mj = S.cari_modul(b, hl["m"])["judul"]
            mulai.append(f'<li><a href="{hl["url"]}"><span><b>{html.escape(hl["judul"])}</b><small>{html.escape(mj)}</small></span>{ikon("kanan", 16)}</a></li>')
        mulai.append("</ul></div>")
    mulai.append("</div></section>")
    kisi = []
    for k in S.kelompok[b]:
        mods = [m for m in S.modul[b] if m["kelompok"] == k["id"]]
        if not mods:
            continue
        kisi.append(f'<section class="dk-kel-bag" id="kel-{k["id"]}"><h2>{html.escape(k["judul"])}</h2><ul class="dk-kisi">')
        for m in mods:
            n = len(m["halaman"])
            kisi.append(f'<li><a class="dk-kartu" href="{m["url"]}"><span class="dk-kartu-ik">{ikon(m["ikon"], 20)}</span>'
                        f'<strong>{html.escape(m["judul"])}</strong><span class="rg">{html.escape(m["ringkas"])}</span>'
                        f'<span class="dk-kartu-n">{n} halaman</span></a></li>')
        kisi.append("</ul></section>")
    if p:
        h1, kalimat = "Panduan Centurisk97", ("Cara memakai tiap halaman dan cara tiap angka dihitung, dalam bahasa sehari-hari. "
                                              "Setiap metode dijelaskan langkah demi langkah dengan contoh.")
        tombol = (('<a class="tb tb-primer" href="' + S.cari_halaman("panduan", "peta-karhutla", "sekilas")["url"] + '">Mulai dari Peta utama</a>')
                  if S.cari_halaman("panduan", "peta-karhutla", "sekilas") else "") + '<a class="tb tb-sekunder" href="/docs/pengembang">Panduan untuk pengembang</a>'
        judul_h, desk = "Panduan Centurisk97", "Panduan memakai Centurisk97 dan cara tiap angka dihitung, dalam bahasa sehari-hari."
    else:
        h1, kalimat = "Docs untuk pengembang", ("Referensi teknis tiap modul: berkas kode, rute, tabel data, alur kerja, uji, dan gerbang, "
                                                "dengan rujukan ke baris kode.")
        ark = S.cari_halaman("pengembang", "arsitektur", "ikhtisar")
        tombol = (f'<a class="tb tb-primer" href="{ark["url"]}">Mulai dari arsitektur</a>' if ark else "") + '<a class="tb tb-sekunder" href="/docs">Kembali ke panduan</a>'
        judul_h, desk = "Docs untuk pengembang", "Referensi teknis Centurisk97 untuk pengembang: arsitektur, rute, data, alur kerja, dan uji."
    hero = (f'<header class="dk-hero">{tab_bagian(b, "dk-tab-hp")}<h1>{h1}</h1><p class="dk-pengantar">{kalimat}</p>{kotak_cari("cari-hero", True)}'
            f'<div class="dk-tombol">{tombol}</div></header>')
    bawah = ""
    if p:
        bawah = beranda_readme()
    ctx = {"judul": judul_h, "deskripsi": desk, "kanonik": SITUS + AWALAN[b], "isi": hero + "\n" + "\n".join(mulai) + "\n" + "\n".join(kisi) + bawah,
           "toc": "", "nav": nav_html(S, b, None, None, True), "kaki": kaki_docs(S, b), "tingkat": "beranda", "bagian": b}
    return ctx


def beranda_readme():
    """Cakupan dan cara membaca dari README.md: h2 dirender apa adanya di bawah kisi; daftar modul dan 'mulai dari sini' dibuang."""
    path = SUMBER / "README.md"
    if not path.is_file():
        return ""
    h1, pembuka, h2 = pecah_bagian(baca_sumber(path))
    galat, pemberi = [], Pemberi({"mulai-dari-sini"} | ID_TERPAKAI)
    lewati = {"daftar modul", "mulai dari sini"}
    bagian = []
    awal = [b for b in pembuka if b["t"] != "kutip"]
    if awal:
        bagian.append('<section class="dk-tentang"><div class="dk-bd">' + render_blok(awal, galat, pemberi) + "</div></section>")
    for sec in h2:
        if sec["nama"].strip().lower() in lewati:
            continue
        sid = pemberi.id(sec["nama"])
        bagian.append(f'<section class="dk-tentang" id="{sid}"><div class="dk-bd"><h2 id="{sid}-j">{inline(sec["nama"], galat, sec["baris"], False)}</h2>'
                      f'{render_blok(sec["blok"], galat, pemberi)}</div></section>')
    if galat:
        raise Galat(f"README.md:{galat[0][0]}: {galat[0][1]}")
    return "\n" + "\n".join(bagian)


def entri_cari(S, b, hl, o, tabel):
    """Entri indeks ringkas: [u tanpa awalan /docs, indeks tabel modul, judul halaman, bagian halaman, cuplikan].
    tabel: daftar [judul modul, 'p' atau 'd'] yang diisi di sini; docs.js memperluasnya (bukaIndeks)."""
    kunci = [S.cari_modul(b, hl["m"])["judul"], "p" if b == "panduan" else "d"]
    if kunci not in tabel:
        tabel.append(kunci)
    i = tabel.index(kunci)
    return [[hl["url"][5:] + (f"#{e['id']}" if e["id"] else ""), i, hl["judul"], e["b"], e["k"]] for e in o["indeks"]]


def semua_jangkar(S, olahan):
    return {h["url"]: set(o["ids"]) for h, o in olahan}


# ---------------------------------------------------------------- pengumpulan

def kumpulkan(ketat=False):
    """Hitung seluruh keluaran dalam memori: ({jalur relatif: isi}, peringatan, struktur)."""
    S = muat_struktur(ketat)
    _STR["S"] = S
    olahan = []
    for b in BAGIAN:
        for h in S.halaman[b]:
            olahan.append((h, olah_halaman(S, h)))
            h["_o"] = olahan[-1][1]
    # sidik sumber dan mesin
    sid = {"peta.json": sidik(PETA.read_bytes())}
    if (SUMBER / "README.md").is_file():
        sid["README.md"] = sidik((SUMBER / "README.md").read_bytes())
    for h, _o in olahan:
        sid[h["berkas"]] = sidik((SUMBER / h["berkas"]).read_bytes())
    sid.update(sidik_gambar())
    sid["mesin:bangun.py"] = sidik(Path(__file__).read_bytes())
    sid["mesin:templat.html"] = sidik(TEMPLAT.read_bytes())
    lama = {}
    try:
        lama = json.loads((KELUAR / "_bangun.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass
    if lama.get("sumber") == sid and lama.get("tanggal"):
        tanggal = lama["tanggal"]
    else:
        tanggal = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7)).strftime("%Y-%m-%d")
    hasil, cari, tabel_cari = {}, [], []
    for b in BAGIAN:
        hasil["index.html" if b == "panduan" else "pengembang/index.html"] = isi_templat(bangun_beranda(S, b), tanggal)
        for m in S.modul[b]:
            hasil[m["keluar"]] = isi_templat(bangun_depan_modul(S, m), tanggal)
    for h, o in olahan:
        hasil[h["keluar"]] = isi_templat(bangun_halaman(S, h, o), tanggal)
        cari += entri_cari(S, h["b"], h, o, tabel_cari)
    hasil["cari.json"] = json.dumps({"v": 2, "m": tabel_cari, "e": cari}, ensure_ascii=False, separators=(",", ":")) + "\n"
    hasil["_rute.json"] = json.dumps(S.jalur(), ensure_ascii=False, indent=1) + "\n"
    n_html = sum(1 for k in hasil if k.endswith(".html"))
    hasil["_bangun.json"] = json.dumps({"halaman": n_html, "tanggal": tanggal, "sumber": sid}, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    peringatan = list(S.peringatan)
    for nama, isi in hasil.items():
        n = len(isi.encode("utf-8"))
        if n > 1024 * 1024:
            raise Galat(f"{nama} {n} byte, di atas 1 MB")
        if nama == "cari.json":
            batas = MAKS_CARI
        elif nama.endswith("index.html"):
            batas = 60 * 1024
        else:
            batas = 120 * 1024
        if not nama.startswith("_bangun") and n > batas:
            peringatan.append(f"{nama} {n // 1024} KB, di atas {batas // 1024} KB")
    for h, o in olahan:
        if len(o["toc"]) > MAKS_H2:
            peringatan.append(f"{h['url']}: {len(o['toc'])} bagian ##, maksimum {MAKS_H2}")
    return hasil, peringatan, S


def berkas_html_keluaran():
    """Berkas keluaran yang dikenal di public/docs (relatif, posix), tidak termasuk gambar/ dan aset tulisan tangan."""
    out = []
    if not KELUAR.is_dir():
        return out
    for p in KELUAR.rglob("*.html"):
        rel = p.relative_to(KELUAR).as_posix()
        if not rel.startswith("gambar/"):
            out.append(rel)
    return sorted(out)


def tulis(hasil):
    KELUAR.mkdir(parents=True, exist_ok=True)
    ditulis = []
    for nama, isi in hasil.items():
        p = KELUAR / nama
        data = isi.encode("utf-8")
        if not p.exists() or p.read_bytes() != data:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
            ditulis.append(nama)
    # halaman yatim: HTML lama tanpa sumber dihapus (hanya .html; aset tulisan tangan dan gambar/ tidak disentuh)
    sah = set(hasil)
    yatim = [r for r in berkas_html_keluaran() if r not in sah]
    for r in yatim:
        (KELUAR / r).unlink()
    for d in sorted((p for p in KELUAR.rglob("*") if p.is_dir() and "gambar" not in p.relative_to(KELUAR).parts), key=lambda p: -len(p.parts)):
        try:
            d.rmdir()  # hanya bila kosong
        except OSError:
            pass
    return ditulis, yatim


def cek(hasil):
    beda = []
    for nama, isi in hasil.items():
        p = KELUAR / nama
        if not p.exists() or p.read_bytes() != isi.encode("utf-8"):
            beda.append(nama)
    for r in berkas_html_keluaran():
        if r not in hasil:
            beda.append(r + " (yatim)")
    return beda


def perintah_cek_sumber():
    try:
        S = muat_struktur(True)
    except Galat as e:
        print(f"galat: {e}")
        return 1
    ada = JumlahBaris(AKAR)
    jalur_ada = set(S.jalur())
    olahan, galat_n, per_halaman, gabung = [], 0, {}, []
    for b in BAGIAN:
        for h in S.halaman[b]:
            try:
                olahan.append((h, olah_halaman(S, h)))
            except Galat as e:
                gabung.append(f"galat: {e}")
                galat_n += 1
    jangkar = semua_jangkar(S, olahan)
    for h, o in olahan:
        jk = dict(jangkar)
        jk["__ini__"] = o["ids"]
        hasil = periksa_sumber(baca_sumber(SUMBER / h["berkas"]), h["berkas"], ada, h["b"], jalur_ada, jk)
        per_halaman[h["berkas"]] = [x for x in hasil if x[0] == "peringatan"]
        for tingkat, baris, pesan in hasil:
            gabung.append(f"{tingkat}: docs/centurisk97/{h['berkas']}:{baris}: {pesan}")
            if tingkat == "galat":
                galat_n += 1
    # berkas md yang tidak disebut peta.json (yatim di sumber)
    dikenal = {h["berkas"] for b in BAGIAN for h in S.halaman[b]}
    for p in sorted(SUMBER.glob("*/*/*.md")):
        rel = p.relative_to(SUMBER).as_posix()
        if rel not in dikenal and rel.split("/")[0] in BAGIAN:
            gabung.append(f"peringatan: docs/centurisk97/{rel}: tidak disebut peta.json (tidak diterbitkan)")
    for g in gabung:
        print(g)
    total = sum(len(v) for v in per_halaman.values())
    awam = sum(1 for v in per_halaman.values() for x in v if "bahasa awam" in x[2])
    print(f"ringkasan: {len(olahan)} halaman, {total} peringatan ({awam} bahasa awam)")
    print(f"galat: {galat_n}")
    return 1 if galat_n else 0


# ---------------------------------------------------------------- uji diri

def peta_uji():
    """Peta kecil sah untuk uji struktur: satu modul dua bagian, tiga halaman Panduan dan dua halaman Pengembang."""
    return {
        "versi": 1,
        "bagian": [{"id": "panduan", "judul": "Panduan", "awalan": "/docs"}, {"id": "pengembang", "judul": "Pengembang", "awalan": "/docs/pengembang"}],
        "kelompok": [{"id": "a", "judul": "Kelompok A", "bagian": "panduan"}, {"id": "b", "judul": "Kelompok B", "bagian": "pengembang"}],
        "modul": [{"id": "satu", "kelompok": {"panduan": "a", "pengembang": "b"}, "ikon": "peta", "judul": {"panduan": "Modul satu", "pengembang": "Modul satu teknis"},
                   "ringkas": {"panduan": "Ringkas.", "pengembang": "Ringkas teknis."},
                   "halaman": {"panduan": [{"id": "sekilas", "judul": "Sekilas", "berkas": "panduan/satu/01-sekilas.md"},
                                           {"id": "hitung", "judul": "Cara hitung", "berkas": "panduan/satu/02-hitung.md"},
                                           {"id": "batasan", "judul": "Batasan", "berkas": "panduan/satu/03-batasan.md"}],
                               "pengembang": [{"id": "ikhtisar", "judul": "Ikhtisar", "berkas": "pengembang/satu/01-ikhtisar.md"},
                                              {"id": "batasan", "judul": "Batasan", "berkas": "pengembang/satu/02-batasan.md"}]}}],
        "mulai": {"panduan": [], "pengembang": []},
    }


def uji():
    gagal = []

    def cocok(nama, kondisi):
        if not kondisi:
            gagal.append(nama)

    ada = lambda rel: 10 if rel == "a/b.py" else None  # noqa: E731
    benar = "# Judul\n\nPengantar halaman ini.\n\n## Bagian satu\n\n" + ("isi " * 60) + "\n\n## Bagian dua\n\nbelum terdokumentasi di kode\n"
    cocok("halaman benar", not [x for x in periksa_sumber(benar, "x.md", ada) if x[0] == "galat"])
    for nama, teks in [("dua h1", benar + "\n# Dua\n"), ("tanpa h1", benar.replace("# Judul\n", "")),
                       ("HTML mentah", benar + "\n<div>x</div>\n"), ("tautan md terlarang", benar + "\n[x](javascript:alert(1))\n"),
                       ("terlalu panjang", benar + ("kata " * 2100))]:
        cocok("halaman salah: " + nama, [x for x in periksa_sumber(teks, "x.md", ada) if x[0] == "galat"])
    cocok("tautan Docs hilang = galat", [x for x in periksa_sumber(benar + "\n[x](/docs/tidak/ada)\n", "x.md", ada, None, {"/docs"}) if x[0] == "galat"])
    cocok("tautan Docs sah", not [x for x in periksa_sumber(benar + "\n[x](/docs/satu/sekilas)\n", "x.md", ada, None, {"/docs/satu/sekilas"}) if x[0] == "galat"])
    cocok("terlalu banyak h2 = peringatan", [x for x in periksa_sumber(benar + "".join(f"\n## B{i}\n\nisi\n" for i in range(9)), "x.md", ada) if "maksimum" in x[2]])
    for k, kal in [("kode teknis", "buka `scripts/a.py` dulu"), ("rute api", "lihat `/api/titik`"), ("istilah mesin", "dijalankan Worker"), ("cron", "jadwal cron harian")]:
        cocok("bahasa awam: " + k, [x for x in periksa_sumber(benar + "\n" + kal + "\n", "x.md", ada, "panduan") if "bahasa awam" in x[2]])
        cocok("pengembang boleh: " + k, not [x for x in periksa_sumber(benar + "\n" + kal + "\n", "x.md", ada, "pengembang") if "bahasa awam" in x[2]])
    cocok("rujukan sah", not [x for x in periksa_sumber(benar.replace("belum terdokumentasi di kode", "lihat `a/b.py:3-5`"), "x.md", ada) if "rujukan" in x[2] or "baris" in x[2]])
    for rj in ["`a/b.py:0`", "`a/b.py:11`", "`a/b.py:5-3`", "`tidak/ada.py:1`"]:
        cocok("rujukan salah " + rj, [x for x in periksa_sumber(benar.replace("belum terdokumentasi di kode", "lihat " + rj), "x.md", ada) if x[0] == "peringatan"])
    for k, kalimat in [("nama lama", "produk Pantau Bencana"), ("titik tengah", "a · b"), ("vonis", "wilayah ini aman"),
                       ("surel", "kirim ke nama@contoh.id"), ("telepon", "hubungi 0812 3456 7890"),
                       ("sk-", "kunci sk-abcdefghij12345"), ("ghp_", "ghp_abcdefghij12345"), ("AKIA", "AKIAABCDEFGHIJ12345"),
                       ("env", "RAHASIA_UJI=nilai123")]:
        cocok("terlarang " + k, [x for x in periksa_sumber(benar + "\n" + kalimat + "\n", "x.md", ada) if x[0] == "peringatan"])
    cocok("keamanan bukan vonis", not [x for x in periksa_sumber(benar + "\nkeamanan dan amankan\n", "x.md", ada) if "vonis" in x[2]])
    # peta.json
    ok = lambda rel: True  # noqa: E731
    cocok("peta sah", cek_peta(peta_uji(), ok) == [])
    for nama, ubah in [
        ("id modul kembar", lambda p: p["modul"].append(json.loads(json.dumps(p["modul"][0])))),
        ("id modul terlarang", lambda p: p["modul"][0].update(id="pengembang")),
        ("ikon tak dikenal", lambda p: p["modul"][0].update(ikon="tidak-ada")),
        ("judul modul 41 huruf", lambda p: p["modul"][0]["judul"].update(panduan="x" * 41)),
        ("judul halaman 41 huruf", lambda p: p["modul"][0]["halaman"]["panduan"][1].update(judul="x" * 41)),
        ("halaman pertama bukan sekilas", lambda p: p["modul"][0]["halaman"]["panduan"][0].update(id="awal", berkas="panduan/satu/01-awal.md")),
        ("halaman terakhir bukan batasan", lambda p: p["modul"][0]["halaman"]["pengembang"][1].update(id="akhir", berkas="pengembang/satu/02-akhir.md")),
        ("nomor berkas bercelah", lambda p: p["modul"][0]["halaman"]["panduan"][1].update(berkas="panduan/satu/05-hitung.md")),
        ("berkas di bagian lain", lambda p: p["modul"][0]["halaman"]["panduan"][1].update(berkas="pengembang/satu/02-hitung.md")),
        ("kelompok tak ada", lambda p: p["modul"][0]["kelompok"].update(panduan="zzz")),
        ("kelompok bagian salah", lambda p: p["modul"][0]["kelompok"].update(panduan="b")),
        ("id halaman kembar", lambda p: p["modul"][0]["halaman"]["panduan"][1].update(id="sekilas", berkas="panduan/satu/02-sekilas.md")),
        ("ringkas kosong", lambda p: p["modul"][0]["ringkas"].update(panduan="")),
    ]:
        p = peta_uji()
        ubah(p)
        cocok("peta salah: " + nama, bool(cek_peta(p, ok)))
    cocok("berkas hilang = galat ketat", [x for x in cek_peta(peta_uji(), lambda rel: False) if "tidak ada" in x])
    # inline, tautan, escape
    g = []
    h = inline("<script>alert(1)</script> & \"x\"", g)
    cocok("escape", "<script>" not in h and "&lt;script&gt;" in h and "&amp;" in h)
    cocok("escape kode", "&lt;b&gt;" in inline("`<b>`", g))
    for url in ["javascript:alert(1)", "data:text/html,x", "http://contoh.id"]:
        g = []
        inline(f"[x]({url})", g)
        cocok("tautan ditolak " + url, bool(g))
    for url in ["https://contoh.id", "/jalur", "#jangkar", "/docs/banjir/sekilas#bagian"]:
        g = []
        inline(f"[x]({url})", g)
        cocok("tautan diterima " + url, not g)
    cocok("tautan md tanpa tautan", "tanpa-tautan" in inline("[x](CELAH.md)"))
    g = []
    inline("![gambar](https://x.id/a.png)", g)
    cocok("gambar ditolak", bool(g))
    cocok("id judul", slug_judul("Kemudahan Åkses (/banjir/ atau /x)") == "kemudahan-akses-banjir-atau-x")
    p = Pemberi()
    cocok("id kembar", p.id("Tes") == "tes" and p.id("Tes") == "tes-2")
    cocok("pil di tebal", 'class="pil pil-lulus"' in inline("**lulus**") and 'pil-lulus' not in inline("sudah lulus ya"))
    cocok("pil kode", 'pil-gagal' in inline("`gagal`"))
    cocok("pil HIPOTESIS", 'pil-hipotesis' in inline("Status: HIPOTESIS."))
    cocok("h2 tetap h2, h3 tetap h3", "<h2 " in render_blok(parse_blok(["## A"]), [], Pemberi()) and "<h3 " in render_blok(parse_blok(["### A"]), [], Pemberi()))
    cocok("tabel", 'class="tabel-gulir"' in render_blok(parse_blok(["| a | b |", "| --- | --- |", "| 1 | `x|y` |"]), [], Pemberi()))
    cocok("daftar bersarang", render_daftar(parse_blok(["- a", "  - b", "- c"])[0]["butir"], []).count("<ul>") == 2)
    cocok("daftar bernomor", "<ol>" in render_daftar(parse_blok(["1. a", "2. b"])[0]["butir"], []))
    g2 = []
    cocok("tautan backslash ditolak", url_aman("/\evil.com", g2, 1)[1] and url_aman("//evil.com", g2, 1)[1] and url_aman("/docs/x", g2, 1)[0] == "/docs/x")
    cocok("kode mermaid", "language-mermaid" in render_blok(parse_blok(["```mermaid", "A-->B", "```"]), [], Pemberi()))
    cocok("kode tidak jadi markup", "<script" not in render_blok(parse_blok(["```", "<script>x</script>", "```"]), [], Pemberi()))
    cocok("potong kalimat", len(potong_kalimat("Satu. Dua. Tiga. " * 20)) <= 270)
    cocok("ringkas kartu", ringkas_kartu("Halaman ini menjelaskan cara hitung.") == "Menjelaskan cara hitung.")
    cocok("teks polos", teks_polos("**a** [b](c.md) `d`") == "a b d")
    # gambar: penyaring SVG (daftar putih), blok gambar, ukuran raster
    svg_ok = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 100" width="720" height="100"><defs><marker id="p" markerWidth="6" markerHeight="6" '
              'refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" class="dg-garis"/></marker></defs>'
              '<rect x="1" y="1" width="100" height="40" class="dg-kotak"/><line x1="0" y1="0" x2="9" y2="9" class="dg-garis" marker-end="url(#p)"/>'
              '<text x="5" y="20" class="dg-teks" font-size="14">A &amp; B</text></svg>')
    h_ok, g_ok = saring_svg(svg_ok, "Alur A ke B", "g-x")
    cocok("svg sah lolos", not g_ok and h_ok.startswith("<svg viewBox=\"0 0 720 100\"") and 'role="img"' in h_ok and 'aria-label="Alur A ke B"' in h_ok)
    cocok("svg: ukuran tetap dibuang, id diberi awalan", " width=\"720\"" not in h_ok.split(">")[0] and 'id="g-x-p"' in h_ok and "url(#g-x-p)" in h_ok)
    cocok("svg: teks di-escape", "A &amp; B" in h_ok)
    jahat = {
        "script": svg_ok.replace("</svg>", "<script>alert(1)</script></svg>"),
        "foreignObject": svg_ok.replace("</svg>", "<foreignObject><div/></foreignObject></svg>"),
        "on*": svg_ok.replace("<rect ", '<rect onclick="x()" '),
        "onload": svg_ok.replace("<svg ", '<svg onload="x()" ', 1),
        "href luar": svg_ok.replace("<rect ", '<rect href="https://x.id" '),
        "xlink href": svg_ok.replace("<rect ", '<rect xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://x.id" '),
        "use": svg_ok.replace("</svg>", '<use href="#p"/></svg>'),
        "style attr": svg_ok.replace("<rect ", '<rect style="fill:red" '),
        "style elemen": svg_ok.replace("</svg>", "<style>rect{fill:red}</style></svg>"),
        "style url": svg_ok.replace("<rect ", '<rect style="fill:url(https://x.id/a)" '),
        "fill hex": svg_ok.replace('class="dg-kotak"', 'class="dg-kotak" fill="#ff0000"'),
        "fill rgb": svg_ok.replace('class="dg-kotak"', 'class="dg-kotak" fill="rgb(1,2,3)"'),
        "stroke nama": svg_ok.replace('class="dg-kotak"', 'class="dg-kotak" stroke="red"'),
        "fill url luar": svg_ok.replace('class="dg-kotak"', 'class="dg-kotak" fill="url(https://x.id/a)"'),
        "kelas bukan dg": svg_ok.replace('class="dg-kotak"', 'class="merah"'),
        "tanpa viewBox": svg_ok.replace('viewBox="0 0 720 100"', ""),
        "doctype": '<!DOCTYPE svg [<!ENTITY a "x">]>' + svg_ok,
        "image": svg_ok.replace("</svg>", '<image href="data:image/png;base64,AA"/></svg>'),
        "bukan svg": "<html/>",
        "rusak": "<svg viewBox='0 0 1 1'><g></svg>",
    }
    for nama_j, isi_j in jahat.items():
        h_j, g_j = saring_svg(isi_j, "x", "g-x")
        cocok("svg jahat ditolak: " + nama_j, bool(g_j) and not h_j)
    cocok("raster png", ukuran_raster(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + struct.pack(">II", 640, 360), "png") == (640, 360))
    cocok("raster rusak", ukuran_raster(b"bukan gambar", "png") is None)
    gb = parse_blok(["![Ket gambar](gambar/tidak-ada.svg)", "", "teks"])
    cocok("blok gambar terurai", gb[0]["t"] == "gambar" and gb[0]["alt"] == "Ket gambar" and gb[1]["t"] == "para")
    gg = []
    render_gambar(gb[0], gg)
    cocok("gambar tidak ada = galat", bool(gg))
    for url_g in ["https://x.id/a.png", "../a.png", "gambar/../a.png", "gambar/a.gif", "/docs/gambar/a.png"]:
        gg = []
        render_gambar({"t": "gambar", "alt": "k", "url": url_g, "baris": 1}, gg)
        cocok("gambar jalur terlarang " + url_g, bool(gg))
    # idempoten, sidik, indeks cari, tanpa skrip inline
    try:
        a, _p, S = kumpulkan()
        b, _p2, _S2 = kumpulkan()
        cocok("idempoten", a == b)
        cari = json.loads(a["cari.json"])
        cocok("indeks cari", cari["v"] == 2 and all(len(e[4]) <= K_MAKS + 1 and "<" not in e[4] and "`" not in e[4] and 0 <= e[1] < len(cari["m"]) for e in cari["e"])
              and {m[1] for m in cari["m"]} == {"p", "d"} and all(e[0].startswith("/") for e in cari["e"]))
        cocok("indeks cari kecil", len(a["cari.json"].encode("utf-8")) < MAKS_CARI)
        cocok("tanpa skrip dari isi", all("<script" not in v.replace('<script src=', '').replace('<script type="module" src=', '') for k, v in a.items() if k.endswith(".html")))
        rute = json.loads(a["_rute.json"])
        cocok("rute: semua halaman keluaran punya jalur", len(rute) == sum(1 for k in a if k.endswith(".html")))
        cocok("rute: jalur bersih", all(re.match(r"^/docs(?:/[a-z0-9-]+)*$", j) for j in rute) and len(set(rute)) == len(rute))
        del S
    except Galat as e:
        gagal.append("kumpulkan: " + str(e))
    if gagal:
        for g_ in gagal:
            print("GAGAL:", g_)
        return 1
    print("uji diri bangun.py: semua lolos")
    return 0


def utama(argv):
    if "--uji" in argv:
        return uji()
    if "--cek-sumber" in argv:
        return perintah_cek_sumber()
    if "--jalur" in argv:
        try:
            print("\n".join(muat_struktur("--ketat" in argv).jalur()))
        except Galat as e:
            print("galat:", e, file=sys.stderr)
            return 1
        return 0
    ketat = "--cek" in argv
    try:
        hasil, peringatan, _S = kumpulkan(ketat)
    except Galat as e:
        print("galat:", e, file=sys.stderr)
        return 1
    for p in peringatan:
        print("peringatan:", p, file=sys.stderr)
    if "--cek" in argv:
        beda = cek(hasil)
        if beda:
            print("keluaran basi terhadap sumber: " + ", ".join(beda[:12]) + (f" (+{len(beda) - 12} lagi)" if len(beda) > 12 else "")
                  + ". Jalankan python3 -I scripts/docs/bangun.py", file=sys.stderr)
            return 1
        print("public/docs segar")
        return 0
    ditulis, yatim = tulis(hasil)
    print(f"{len(hasil)} berkas keluaran, {len(ditulis)} berubah" + (f": {', '.join(ditulis[:8])}{' ...' if len(ditulis) > 8 else ''}" if ditulis else ""))
    if yatim:
        print(f"{len(yatim)} keluaran lama tanpa sumber dihapus", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(utama(sys.argv[1:]))
