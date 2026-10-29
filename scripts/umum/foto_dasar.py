"""#41: cakupan foto dasar Mapillary di kecamatan zona bahaya -> public/data/foto_dasar.json   (INDEKS pendukung, bukan prediksi)

Akses: Mapillary Graph API v4  GET https://graph.mapillary.com/images?access_token=<MAPILLARY_TOKEN>&bbox=...&fields=id,captured_at&limit=2000
       Token dari env MAPILLARY_TOKEN (belum ada => MENUNGGU KUNCI; kode + uji murni tetap jalan). Syarat: foto CC-BY-SA, atribusi ke Mapillary;
       hanya metadata (id, tanggal) yang disimpan, bukan gambar. Kotak bbox > ~0,01 derajat^2 ditolak API: kita pakai 0,09 x 0,09 deg (~100 km2).
Rumus: kotak 100 km2 di centroid kecamatan; n = jumlah foto (dipotong 2000 = batas satu halaman, ditandai 'penuh');
       cakupan = 1 - exp(-n/200);  segar = bagian foto yang diambil <= 3 tahun lalu;  indeks = cakupan x segar  (0-1).
       Jarak ke jalan/foto per km jalan TIDAK dihitung (tak ada jaringan jalan seragam di repo): satuannya foto per kotak.
Cakupan kecamatan: kecamatan di kabupaten yang punya kejadian DIBI banjir/longsor/gempa/cuaca 365 hari terakhir, urut jumlah kejadian,
       --maks permintaan per jalan (bawaan 300; 1 permintaan/kecamatan, jeda 0,2 dtk); cache data/raw/foto_dasar/cache.json dapat dilanjutkan;
       entri > 90 hari diambil ulang.
Pakai: python3 scripts/umum/foto_dasar.py [--maks N]   |   python3 scripts/umum/foto_dasar.py uji
"""
import datetime as dt, importlib.util, json, math, os, sys, time, urllib.parse

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(AKAR, "data/raw/foto_dasar/cache.json")
BAHAYA = ("Banjir", "Banjir Bandang", "Banjir dan Tanah Longsor", "Tanah Longsor", "Gempabumi", "Cuaca Ekstrem", "Gerakan Tanah")
HALF = 0.045
BATAS = 2000


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def indeks(tanggal_ms, sekarang_ms, n_total=None):
    """tanggal_ms: list captured_at (ms epoch). -> (n, cakupan, segar, indeks)."""
    n = len(tanggal_ms)
    cak = 1 - math.exp(-n / 200)
    segar = sum(sekarang_ms - t <= 3 * 365.25 * 86400e3 for t in tanggal_ms) / n if n else 0.0
    return n, cak, segar, cak * segar


def foto_kotak(J, token, lon, lat):
    q = urllib.parse.urlencode({"access_token": token, "bbox": f"{lon - HALF:.5f},{lat - HALF:.5f},{lon + HALF:.5f},{lat + HALF:.5f}",
                                "fields": "id,captured_at", "limit": BATAS})
    d = J.ambil("https://graph.mapillary.com/images?" + q, jeda_host=0.2, batas=60)
    return [x["captured_at"] for x in d.get("data", []) if x.get("captured_at") is not None]


def pilih_kecamatan(kejadian, maks_per_kab=None):
    """Kab (prov_kode, nama) dengan kejadian bahaya, urut kejadian turun."""
    h = {}
    for k in kejadian:
        if k["jenis"] in BAHAYA and k.get("kab"):
            h[(k["prov_kode"], k["kab"])] = h.get((k["prov_kode"], k["kab"]), 0) + k.get("kejadian", 1)
    return [k for k, _ in sorted(h.items(), key=lambda x: (-x[1], x[0]))], h


def norm(s):
    return "".join(c for c in (s or "").lower() if c.isalnum())


def jalan(maks=300):
    token = os.environ.get("MAPILLARY_TOKEN")
    kej = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json")))["kejadian"]
    kabs, jumlah = pilih_kecamatan(kej)
    L = _mod("logistik")
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    simp = _mod("kejadian").simpan
    sek = int(time.time() * 1000)
    cand = []
    for pv, kab in kabs:
        p = os.path.join(AKAR, "public/geo/kecamatan", f"{pv}.json")
        if not os.path.exists(p):
            continue
        for f in json.load(open(p))["features"]:
            pr = f["properties"]
            if pr.get("kec") and norm(pr.get("kab")).replace("kabupaten", "").replace("kota", "") == norm(kab).replace("kabupaten", "").replace("kota", ""):
                lon, lat = L.centroid(f["geometry"])
                cand.append((pv, pr["kab"], pr["kec"], lon, lat, jumlah[(pv, kab)]))
    status = "tersedia" if token else "MENUNGGU KUNCI (MAPILLARY_TOKEN)"
    if token:
        J = _mod("jaring")
        n = 0
        for pv, kab, kec, lon, lat, _j in cand:
            k = f"{pv}|{kab}|{kec}"
            if k in cache and time.time() - cache[k]["ts"] < 90 * 86400:
                continue
            if n >= maks:
                break
            try:
                cache[k] = {"ts": time.time(), "t": foto_kotak(J, token, lon, lat)}
                n += 1
            except J.Ditolak as e:
                print(f"  ditolak, berhenti: {e}", file=sys.stderr); break
            except Exception as e:
                print(f"  {k}: {e}", file=sys.stderr)
            if n % 25 == 0:
                os.makedirs(os.path.dirname(CACHE), exist_ok=True); json.dump(cache, open(CACHE, "w"), separators=(",", ":"))
        os.makedirs(os.path.dirname(CACHE), exist_ok=True); json.dump(cache, open(CACHE, "w"), separators=(",", ":"))
    baris = []
    for pv, kab, kec, lon, lat, j in cand:
        c = cache.get(f"{pv}|{kab}|{kec}")
        if c:
            n_, cak, seg, ind = indeks(c["t"], sek)
            baris.append([pv, kab, kec, n_, round(seg, 2), round(ind, 3), n_ >= BATAS, j])
    simp(os.path.join(AKAR, "public/data/foto_dasar.json"), {
        "sumber": "Mapillary Graph API v4 (metadata foto)", "atribusi": "Mapillary, foto CC-BY-SA; hanya metadata disimpan", "akses": status,
        "jenis_keluaran": "INDEKS pendukung penilaian kerusakan (bukan prediksi)", "rumus": "cakupan=1-exp(-n/200); indeks=cakupan x bagian foto <=3 tahun; kotak ~100 km2 di centroid kecamatan",
        "catatan": "Satuan: foto per kotak 100 km2, bukan per km jalan. 'penuh' = n mencapai batas 2000 per halaman (cakupan sesungguhnya lebih besar). "
                   f"Kecamatan zona bahaya terpilih {len(cand)}; terisi {len(baris)}.",
        "kolom": ["prov", "kab", "kec", "n_foto", "segar", "indeks", "penuh", "kejadian_bahaya_kab"], "kecamatan": baris})
    print(f"foto_dasar: {len(baris)}/{len(cand)} kecamatan terisi; akses {status}")


def uji():
    sek = 1_000_000_000_000
    n, cak, seg, ind = indeks([], sek)
    assert (n, ind) == (0, 0.0)
    n, cak, seg, ind = indeks([sek - 86400e3] * 200 + [sek - 5 * 365 * 86400e3] * 200, sek)
    assert n == 400 and abs(seg - .5) < 1e-9 and abs(cak - (1 - math.exp(-2))) < 1e-9 and abs(ind - cak * .5) < 1e-9
    kab, j = pilih_kecamatan([{"jenis": "Banjir", "prov_kode": "32", "kab": "Bogor", "kejadian": 3}, {"jenis": "Kekeringan", "prov_kode": "32", "kab": "X"}])
    assert kab == [("32", "Bogor")] and j[("32", "Bogor")] == 3
    assert norm("Kab. Bogor") == "kabbogor"
    print("uji foto_dasar: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a == ["uji"] else jalan(int(a[a.index("--maks") + 1]) if "--maks" in a else 300)
