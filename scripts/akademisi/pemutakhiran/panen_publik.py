"""Panen ulang bulanan data publik direktori yang sumbernya terbuka tanpa browser (dijalankan direktori-bulanan.yml).

python3 -I scripts/akademisi/pemutakhiran/panen_publik.py --panen <folder panen> --menit 60

- daftar_hitam_mentah.json: semua halaman daftar-hitam.inaproc.id (nama penyedia, SK, mulai, berakhir, status).
- cems_idn.json: aktivasi Copernicus EMS untuk Indonesia (API publik).
Gagal atau ditolak = berkas lama dibiarkan (tidak pernah menulis hasil kosong). Pencocokan ke lembaga dan kejadian ada di
scripts/akademisi/sambung_panen.mjs. Sumber .go.id lain (DJPK, SIMZAT, PDKI) menolak akses tanpa browser: dipanen manual tahunan.
Sopan: UA jujur, jeda 1,1 dtk per permintaan, 403/429 = berhenti di sumber itu.
"""
import argparse, json, os, time, urllib.request

UA = {"User-Agent": "BNPB-direktori/1.0 (pemutakhiran bulanan; centurisk97.id)"}


def ambil(url, t=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read().decode("utf-8", "replace")


def daftar_hitam(html):
    """Larik blacklists dari halaman Next.js inaproc (JSON di-escape di dalam skrip)."""
    t = html.replace('\\"', '"').replace("\\\\", "\\")
    i = t.find('"blacklists":{"blacklists":[')
    if i < 0:
        return None
    arr, _ = json.JSONDecoder().raw_decode(t[i + len('"blacklists":{"blacklists":'):])
    return [{"nama": (x.get("provider") or {}).get("name"), "sk": x.get("skNumber"), "status": x.get("status"),
             "mulai": (x.get("startDate") or "")[:10], "berakhir": (x.get("expiredDate") or "")[:10]} for x in arr]


def panen_daftar_hitam(dir_, batas):
    out, p = [], 1
    while time.time() < batas:
        a = daftar_hitam(ambil(f"https://daftar-hitam.inaproc.id/?p={p}"))
        if a is None:
            raise RuntimeError(f"halaman {p}: struktur berubah")
        if not a:
            break
        out += a; p += 1; time.sleep(1.1)
    else:
        raise RuntimeError(f"waktu habis di halaman {p}, berkas lama dipakai")
    lama = os.path.join(dir_, "daftar_hitam_mentah.json")
    n0 = len(json.load(open(lama))) if os.path.exists(lama) else 0
    if len(out) < n0 * 0.9:   # daftar hitam hanya bertambah; turun tajam = panen bolong
        raise RuntimeError(f"hanya {len(out)} entri, sebelumnya {n0}")
    json.dump(out, open(lama, "w"), ensure_ascii=False)
    return len(out)


def panen_cems(dir_, batas):
    u, out = "https://mapping.emergency.copernicus.eu/activations/api/activations/?limit=100&offset=0", []
    while u and time.time() < batas:
        d = json.loads(ambil(u.replace("http://", "https://")))
        out += [x for x in d["results"] if any(c.get("short_name") == "Indonesia" for c in x.get("countries") or [])]
        u = d.get("next"); time.sleep(1.1)
    if u:
        raise RuntimeError("waktu habis, berkas lama dipakai")
    json.dump(out, open(os.path.join(dir_, "cems_idn.json"), "w"), ensure_ascii=False)
    return len(out)


if __name__ == "__main__":
    a = argparse.ArgumentParser(); a.add_argument("--panen", required=True); a.add_argument("--menit", type=float, default=60)
    g = a.parse_args(); laporan = {}
    akhir = time.time() + g.menit * 60
    for nama, f, porsi in (("daftar_hitam", panen_daftar_hitam, 0.8), ("cems", panen_cems, 1.0)):   # daftar hitam ~540 halaman, sekitar 18 menit
        try:
            laporan[nama] = f(g.panen, time.time() + (akhir - time.time()) * porsi)
        except Exception as e:   # satu sumber gagal tidak menggagalkan yang lain
            laporan[nama] = "gagal: " + str(e)[:160]
    print(json.dumps(laporan, ensure_ascii=False))
