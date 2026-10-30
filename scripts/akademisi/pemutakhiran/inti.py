"""Logika murni pemutakhiran bulanan direktori lembaga (tanpa jaringan, tanpa berkas). Dipakai mutakhir.py; diuji uji_inti.py."""
import datetime, re, urllib.parse

AMBANG_HARI = 180
BUTIR = ("email", "telepon", "wa")


def hari_sejak(tgl, kini):
    """selisih hari dari 'YYYY-MM-DD' ke date kini; tanggal kosong/rusak = tak terhingga (999999)."""
    try:
        return (kini - datetime.date.fromisoformat(str(tgl)[:10])).days
    except ValueError:
        return 999999


def host_dari(url):
    return urllib.parse.urlparse(url or "").netloc.lower().removeprefix("www.")


def status_dari(kode, tantangan=False):
    """hidup = 2xx/3xx; menolak = 401/403/429/tantangan (BUKAN bukti tutup); mati = sisanya (0 = tak terjangkau)."""
    if tantangan or kode in (401, 403, 429):
        return "menolak"
    return "hidup" if 200 <= kode < 400 else "mati"


def situs_pindah(web, url_akhir):
    """True bila setelah pengalihan host-nya domain lain (www. diabaikan)."""
    a, b = host_dari(web), host_dari(url_akhir)
    return bool(a and b and a != b)


def perlu_rayap(l, kini, pindah=False):
    """Rayap ulang bila diperiksa > 180 hari (atau kosong), atau situsnya berpindah domain."""
    return bool(l.get("web")) and (pindah or hari_sejak(l.get("diperiksa"), kini) > AMBANG_HARI)


def norm(butir, v):
    v = str(v).strip()
    if butir == "email": return v.lower()
    d = re.sub(r"[^\d+]", "", v)
    return "+62" + d[1:] if d.startswith("0") else "+" + d if d.startswith("62") else d


def samarkan(butir, v):
    v = str(v)
    if butir == "email" and "@" in v:
        u, d = v.split("@", 1)
        return u[:2] + "***@" + d
    return v[:5] + "***" + v[-3:] if len(v) > 10 else v[:2] + "***"


def bandingkan(lama, baru, butir):
    """(ditambah, tak_ditemukan) setelah normalisasi. tak_ditemukan hanya bila rayap menemukan SESUATU untuk butir itu
    (halaman yang tak memuat kontak sama sekali bukan bukti nomor lama mati)."""
    a = {norm(butir, x) for x in lama or []}
    b = {norm(butir, x) for x in baru or []}
    return sorted(b - a), (sorted(a - b) if b else [])


def perubahan_kontak(id_, lama, baru):
    """daftar entri laporan {id, butir, lama:[samar], baru:[samar]} untuk satu lembaga; kosong bila tak ada beda."""
    out = []
    for b in BUTIR:
        tambah, hilang = bandingkan(lama.get(b), baru.get(b), b)
        if tambah or hilang:
            out.append({"id": id_, "butir": b, "lama": [samarkan(b, x) for x in hilang], "baru": [samarkan(b, x) for x in tambah]})
    return out


def laporan(bulan, hitung, kontak, situs_mati, lembaga_baru, berita_baru):
    return {"bulan": bulan, "jumlah": dict(sorted(hitung.items())), "kontak_berubah": kontak, "situs_mati": sorted(situs_mati),
            "lembaga_baru": sorted(lembaga_baru), "berita_baru": berita_baru}
