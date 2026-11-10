"""Bantu bersama Silang Sumber (rapor_sumber.py, beda_sumber.py): jalur, baca, simpan atomik, arsip append-only, Wilson.
Python 3.9 stdlib. Tidak ada jaringan. Dokumen: data/kajian-bnpb/silang-sumber/DESAIN-TEKNIS.md"""
import datetime as dt, json, math, os

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
WIB = dt.timezone(dt.timedelta(hours=7))


def hari_wib(kini=None):
    return (kini or dt.datetime.now(WIB)).astimezone(WIB).date().isoformat()


def baca(jalur):
    """JSON -> objek, atau None bila berkas tak ada / rusak (sumber hilang tidak menggagalkan jalan)."""
    try:
        with open(jalur, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def simpan(jalur, obj):
    """Tulis sementara lalu ganti nama: pembaca tidak pernah melihat berkas setengah jadi."""
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    sem = jalur + ".tmp"
    with open(sem, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        f.write("\n")
    os.replace(sem, jalur)


def tambah_arsip(jalur, tanggal, baris):
    """Tambah satu baris JSONL berkunci `tanggal`. Hari yang sudah ada tidak ditulis dua kali; baris lama diperiksa
    sama persis sebelum dan sesudah menulis (append-only). -> True bila ditambah."""
    lama = b""
    if os.path.exists(jalur):
        with open(jalur, "rb") as f:
            lama = f.read()
        for ln in lama.decode("utf-8").splitlines():
            if ln.strip() and json.loads(ln).get("tanggal") == tanggal:
                return False
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "ab") as f:
        f.write((json.dumps(dict(baris, tanggal=tanggal), ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n").encode("utf-8"))
    with open(jalur, "rb") as f:
        assert f.read().startswith(lama), "arsip berubah di bagian lama: " + jalur
    return True


def wilson(k, n, z=1.96):
    """Selang kepercayaan Wilson 95% untuk proporsi k/n -> [bawah, atas] (3 desimal) | None bila n = 0."""
    if n <= 0:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0.0, c - h), 3), round(min(1.0, c + h), 3)]
