"""Thumbnail berita Kabar Alun-alun (K6, 26 Nov 2026): og:image artikel asli, diperkecil, disimpan di kita.

Hanya stdlib + alat ubah ukuran yang ada (Pillow, sips macOS, atau ImageMagick). Gagal apa pun = berita tanpa gambar.
Nama berkas = sha1 tautan Google News (cache: yang sudah ada tidak diunduh ulang, tanpa dekode ulang).
Teks artikel tidak disimpan; hanya satu gambar kecil per berita.
"""
import hashlib
import ipaddress
import json
import os
import re
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; CenturiskBot/1.0)"
LEBAR, MAKS_BYTE, MAKS_BARU, TIMEOUT = 240, 30_000, 80, 8
BATCH = "https://news.google.com/_/DotsSplashUi/data/batchexecute"


def _ambil(url, maks, data=None, kepala=None):
    r = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(kepala or {})})
    with urllib.request.urlopen(r, timeout=TIMEOUT) as f:
        return f.read(maks)


def url_aman(u):
    p = urllib.parse.urlparse(u or "")
    if p.scheme not in ("http", "https") or not p.hostname:
        return False
    try:
        ip = ipaddress.ip_address(p.hostname)
        return ip.is_global
    except ValueError:
        return p.hostname != "localhost" and "." in p.hostname


def dekode_google(u, ambil=_ambil):
    """tautan news.google.com/rss/articles/<id> -> URL artikel asli (ambil sign dari halaman, lalu batchexecute)."""
    m = re.search(r"/articles/([^/?]+)", u)
    if not m:
        return None
    gid = m.group(1)
    t = ambil(f"https://news.google.com/articles/{gid}", 3_000_000).decode("utf-8", "replace")
    sg, ts = re.search(r'data-n-a-sg="([^"]+)"', t), re.search(r'data-n-a-ts="([^"]+)"', t)
    if not sg or not ts:
        return None
    inner = ('["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,'
             f'[1,1,1],1,1,null,0,0,null,0],"{gid}",{ts.group(1)},"{sg.group(1)}"]')
    body = "f.req=" + urllib.parse.quote(json.dumps([[["Fbv4je", inner, None, "generic"]]]))
    r = ambil(BATCH, 500_000, body.encode(), {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}).decode("utf-8", "replace")
    for c in re.findall(r'https?:[^"\\]+', r):
        if "google." not in urllib.parse.urlparse(c).netloc:
            return c
    return None


def og_image(html, dasar):
    for tag in re.findall(r"<meta\b[^>]*>", html, re.I):
        if re.search(r'(?:property|name)\s*=\s*["\'](?:og:image|twitter:image)(?::src)?["\']', tag, re.I):
            m = re.search(r'content\s*=\s*["\']([^"\']+)', tag, re.I)
            if m:
                return urllib.parse.urljoin(dasar, m.group(1).replace("&amp;", "&"))
    return None


def perkecil(mentah, keluar):
    """bytes gambar -> jpeg <= MAKS_BYTE di `keluar`; True bila berhasil. Alat pertama yang tersedia."""
    d = tempfile.mkdtemp()
    try:
        src = os.path.join(d, "s")
        with open(src, "wb") as f:
            f.write(mentah)
        for q in (60, 40, 25):
            dst = os.path.join(d, "o.jpg")
            try:
                try:
                    from PIL import Image
                    im = Image.open(src).convert("RGB")
                    im.thumbnail((LEBAR, LEBAR * 2))
                    im.save(dst, "JPEG", quality=q)
                except ImportError:
                    if shutil.which("sips"):
                        cmd = ["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(q), "-Z", str(LEBAR), src, "--out", dst]
                    elif shutil.which("magick") or shutil.which("convert"):
                        cmd = [shutil.which("magick") or shutil.which("convert"), src, "-resize", f"{LEBAR}x", "-quality", str(q), dst]
                    else:
                        return False
                    subprocess.run(cmd, check=True, capture_output=True, timeout=20)
            except Exception:
                return False
            if os.path.getsize(dst) <= MAKS_BYTE:
                os.replace(dst, keluar)
                return True
        return False
    finally:
        shutil.rmtree(d, ignore_errors=True)


def satu(url, jalur, ambil=_ambil, kecil=perkecil):
    try:
        asli = dekode_google(url, ambil)
        if not asli or not url_aman(asli):
            return False
        img = og_image(ambil(asli, 400_000).decode("utf-8", "replace"), asli)
        if not img or not url_aman(img):
            return False
        return kecil(ambil(img, 3_000_000), jalur)
    except Exception:
        return False


def pasang(dok, folder, ambil=_ambil, kecil=perkecil, maks_baru=MAKS_BARU, log=print):
    """isi berita[].gambar bila berkas thumb ada di disk; mengunduh paling banyak maks_baru yang belum ada."""
    os.makedirs(folder, exist_ok=True)
    baru = coba = ada = total = 0
    for k in dok["kejadian"]:
        for b in k["berita"]:
            total += 1
            b.pop("gambar", None)
            nama = hashlib.sha1((b.get("url") or "").encode()).hexdigest()[:16] + ".jpg"
            jalur = os.path.join(folder, nama)
            if not os.path.exists(jalur) and b.get("url") and coba < maks_baru:
                coba += 1
                baru += satu(b["url"], jalur, ambil, kecil)
            if os.path.exists(jalur):
                b["gambar"] = "/data/alun/thumb/" + nama
                ada += 1
    log(f"alun_gambar: {ada}/{total} berita bergambar, {baru} baru dari {coba} percobaan")
    return ada, total
