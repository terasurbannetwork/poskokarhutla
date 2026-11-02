"""Ekspor label lapangan terverifikasi ke public/data/lapangan/label.json (LP-023, DESAIN-TEKNIS §6).

Menarik GET /api/petugas/label.json (hanya terverifikasi = 1, dijamin server; di sini disaring lagi).
Token admin dari env LAPANGAN_TOKEN (cadangan PIPA_TOKEN), alamat dari LAPANGAN_URL. Tanpa token atau gagal tarik:
berkas lama dibiarkan, keluar 0 (langkah harian tidak boleh merah karena modul ini belum aktif).
Uji: python3 scripts/lapangan/ekspor_label.py --uji
"""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

URL_BAWAAN = "https://centurisk97.id"
KELUARAN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "data", "lapangan", "label.json")


def rapikan(label):
    """Daftar mentah -> baris sah saja (id, jenis, nilai, koordinat dalam rentang, waktu), urut waktu lalu id."""
    hasil = []
    for x in label if isinstance(label, list) else []:
        if not isinstance(x, dict) or x.get("terverifikasi", 1) in (0, False, None):
            continue
        try:
            lat, lon, waktu = float(x["lat"]), float(x["lon"]), int(x["waktu"])
        except (KeyError, TypeError, ValueError):
            continue
        if not (-90 <= lat <= 90 and -180 <= lon <= 180) or not x.get("id") or not x.get("jenis") or "nilai" not in x:
            continue
        hasil.append({"id": str(x["id"]), "jenis": str(x["jenis"]), "nilai": x["nilai"], "lat": lat, "lon": lon, "waktu": waktu})
    return sorted(hasil, key=lambda b: (b["waktu"], b["id"]))


def tarik(url, token, sejak_ms=0):
    req = urllib.request.Request(f"{url.rstrip('/')}/api/petugas/label.json?sejak={int(sejak_ms)}",
                                 headers={"Authorization": "Bearer " + token, "User-Agent": "pantau-bencana-pipeline", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"ekspor_label: HTTP {e.code} dari {url}, dilewati")
        return None
    except (OSError, ValueError) as e:
        print(f"ekspor_label: gagal menarik ({e.__class__.__name__}), dilewati")
        return None
    return d.get("label") if isinstance(d, dict) and d.get("ok") else None


def tulis(label, jalur=KELUARAN):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    isi = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "n": len(label), "label": label}
    with open(jalur, "w", encoding="utf-8") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    return jalur


def main():
    token = os.environ.get("LAPANGAN_TOKEN") or os.environ.get("PIPA_TOKEN")
    if not token:
        print("ekspor_label: token kosong, dilewati")
        return 0
    mentah = tarik(os.environ.get("LAPANGAN_URL") or URL_BAWAAN, token)
    if mentah is None:
        return 0
    label = rapikan(mentah)
    print(f"ekspor_label: {len(label)} label terverifikasi -> {os.path.relpath(tulis(label))}")
    return 0


def uji():
    import tempfile
    mentah = [
        {"id": "b", "jenis": "titik_api", "nilai": "menyala", "lat": -0.05, "lon": 116.4, "waktu": 2},
        {"id": "a", "jenis": "genangan", "nilai": 40, "lat": -6.2, "lon": 106.8, "waktu": 1},
        {"id": "x", "jenis": "titik_api", "nilai": "bara", "lat": 99, "lon": 1, "waktu": 3},          # di luar rentang
        {"id": "y", "jenis": "titik_api", "nilai": "bara", "lat": 1, "lon": 1, "waktu": 3, "terverifikasi": 0},
        {"id": "z", "jenis": "titik_api", "lat": 1, "lon": 1, "waktu": 3},                            # tanpa nilai
        {"id": "w", "jenis": "titik_api", "nilai": 1, "lat": "x", "lon": 1, "waktu": 3},
        "bukan dict", None,
    ]
    r = rapikan(mentah)
    assert [b["id"] for b in r] == ["a", "b"], r
    assert rapikan(None) == [] and rapikan({}) == []
    with tempfile.TemporaryDirectory() as d:
        j = tulis(r, os.path.join(d, "dalam", "label.json"))
        isi = json.load(open(j, encoding="utf-8"))
        assert isi["n"] == 2 and isi["label"][0]["id"] == "a" and isi["dibuat"].endswith("Z")
    os.environ.pop("LAPANGAN_TOKEN", None); os.environ.pop("PIPA_TOKEN", None)
    assert main() == 0
    print("ekspor_label: uji lulus")
    return 0


if __name__ == "__main__":
    sys.exit(uji() if "--uji" in sys.argv else main())
