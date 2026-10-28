"""Arsip laporan banjir PetaBencana.id untuk Jakarta (ID-JK), 2016-12 sampai kini.

Sumber: https://data.petabencana.id/reports/archive?admin=ID-JK (bebas, tanpa kunci; maks 217 hari per kueri,
dipakai 200). Cache mentah per potong di data/raw/banjir/genangan/petabencana/, jadi jalan yang putus
melanjutkan. Keluaran:
  data/raw/banjir/genangan/petabencana_laporan.json   semua laporan ringkas (tidak diterbitkan, besar)
  public/banjir/data/genangan/riwayat_kec.json        ringkasan per kecamatan per tahun
Catatan: `rw` = tags.local_area_id PetaBencana (id area RW dalam basis data mereka, bukan nomor RW).
Laporan berbias pelapor (hanya yang punya ponsel dan melapor); kedalaman kosong ~20%.
Lisensi: respons API tidak memuat pernyataan lisensi dan situs tidak terbaca otomatis; cantumkan atribusi
"PetaBencana.id" dan periksa syarat resmi sebelum penerbitan ulang data mentah (hanya agregat yang diterbitkan di sini).
"""
import datetime as dt, glob, os, re, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import MENTAH, RINGKAS, WIB, KecDKI, ambil_json, baca, simpan, median

AWAL = dt.date(2016, 12, 1)
POTONG = 200
URL = "https://data.petabencana.id/reports/archive?geoformat=geojson&admin=ID-JK&start=%s&end=%s"
ATRIBUSI = "PetaBencana.id (data.petabencana.id), laporan warga; agregat oleh Pantau Bencana. Lisensi tidak tertera di respons API: periksa syarat resmi."


def potongan(sampai):
    a = AWAL
    while a < sampai:
        b = min(a + dt.timedelta(days=POTONG), sampai + dt.timedelta(days=1))
        yield a, b
        a = b


def tarik(a, b, jeda=2.0):
    jalur = os.path.join(MENTAH, "petabencana", f"{a:%Y%m%d}_{b:%Y%m%d}.json")
    sudah = os.path.exists(jalur)
    # potong yang menyentuh hari ini tidak di-cache (masih bertambah)
    if sudah and b <= dt.date.today():
        return baca(jalur)
    q = lambda d: urllib.parse.quote(f"{d.isoformat()}T00:00:00+0700")
    d = ambil_json(URL % (q(a), q(b)))
    fitur = d["result"]["features"]
    if b <= dt.date.today():
        simpan(jalur, fitur)
    time.sleep(jeda)
    return fitur


def ringkas(f):
    p = f["properties"]
    x, y = f["geometry"]["coordinates"][:2]
    t = dt.datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")).astimezone(WIB)
    rd, tg = p.get("report_data") or {}, p.get("tags") or {}
    kd = rd.get("flood_depth")
    return {"id": p["pkey"], "t": t.isoformat(timespec="seconds"), "lon": round(x, 5), "lat": round(y, 5),
            "kedalaman_cm": kd if isinstance(kd, (int, float)) else None,
            "kab_kode": tg.get("district_id"), "rw": tg.get("local_area_id"),
            "sumber": p.get("source"), "status": p.get("status"),
            "tipe": p.get("disaster_type") or rd.get("report_type"), "teks": (p.get("text") or "").strip()[:160]}


# ---- saring laporan latihan (J4, PRAREG-J4.md). Pola ditemukan dari teks arsip 2016-2026 (DIAGNOSIS-J3.md H4 + penelusuran 28 Okt 2026);
# ini kesimpulan dari pola, BUKAN konfirmasi PetaBencana. Aturan dievaluasi berurutan, yang pertama cocok dicatat. Hanya tipe `flood` yang dipakai.
RE_AWAL = re.compile(r"^[#\s_]*(duta|hkb|hkn|trainer|bakrie|smpn?\b|youth4gotongroyong|112_bpbdjkt|bpbd\s+[a-z.]+(\s+[a-z.]+){0,3}\s*$)", re.I)   # nama pelatih/duta/sekolah peserta pelatihan
RE_KATA = re.compile(r"\b(simulasi|latihan|pelatihan|uji\s*coba|percobaan|sosialisasi|gladi|drill|testing|re-?test|training|pelatih|tes|test|hkb|hkn|112challange)\b", re.I)
BURST_MAKS = 20        # lebih dari ini laporan di satu sel 0,001 derajat dalam satu hari WIB = latihan massal


def latihan(r):
    """Nama aturan bila laporan (hasil ringkas) tampak latihan/uji; None bila lolos aturan TEKS (aturan burst di saring)."""
    t = r.get("teks") or ""
    if RE_AWAL.search(t):
        return "awal"
    if RE_KATA.search(t):
        return "kata"
    return None


def saring(lap):
    """-> (laporan banjir lolos, rekap). Hanya tipe flood; buang latihan (teks), lalu burst per (hari WIB, sel 0,001 derajat) > BURST_MAKS. Rekap: hitungan per alasan."""
    rekap, ok = {"masuk": len(lap), "bukan_flood": 0, "awal": 0, "kata": 0, "burst": 0}, []
    for r in lap:
        if r.get("tipe") != "flood":
            rekap["bukan_flood"] += 1
        elif (a := latihan(r)):
            rekap[a] += 1
        else:
            ok.append(r)
    sel = {}
    for r in ok:
        k = (r["t"][:10], round(r["lon"], 3), round(r["lat"], 3)); sel[k] = sel.get(k, 0) + 1
    bersih = [r for r in ok if sel[(r["t"][:10], round(r["lon"], 3), round(r["lat"], 3))] <= BURST_MAKS]
    rekap["burst"] = len(ok) - len(bersih); rekap["lolos"] = len(bersih)
    return bersih, rekap


def dari_cache():
    """Semua laporan ringkas dari cache mentah (tanpa jaringan), dedup per id."""
    semua = {}
    for j in sorted(glob.glob(os.path.join(MENTAH, "petabencana", "*.json"))):
        for f in baca(j):
            r = ringkas(f); semua[r["id"]] = r
    return sorted(semua.values(), key=lambda r: r["t"])


def jalankan_saring():
    """Tulis data/raw/.../petabencana_banjir.json (laporan flood non-latihan, ringkas) dan petabencana_banjir_rekap.json. petabencana_laporan.json (masukan sidik J3) tidak disentuh."""
    lap = dari_cache(); bersih, rekap = saring(lap)
    simpan(os.path.join(MENTAH, "petabencana_banjir.json"), bersih)
    per = {}
    for r in bersih:
        per[r["t"][:4]] = per.get(r["t"][:4], 0) + 1
    simpan(os.path.join(MENTAH, "petabencana_banjir_rekap.json"), {"rekap": rekap, "lolos_per_tahun": per, "aturan": {"awal": RE_AWAL.pattern, "kata": RE_KATA.pattern, "burst_maks": BURST_MAKS}})
    print(rekap, per)


def agregat(lap, kec):
    """{kab|kec: {tahun: {hari, hari_ge10cm, n_laporan, n_kedalaman, median_cm, maks_cm}}}"""
    grup = {}
    for r in lap:
        k = kec.cari(r["lon"], r["lat"])
        if not k:
            continue
        grup.setdefault(f"{k[0]}|{k[1]}", {}).setdefault(r["t"][:4], []).append(r)
    hasil = {}
    for kunci, per_th in sorted(grup.items()):
        hasil[kunci] = {}
        for th, rs in sorted(per_th.items()):
            dalam = [r["kedalaman_cm"] for r in rs if r["kedalaman_cm"] is not None]
            hasil[kunci][th] = {
                "hari": len({r["t"][:10] for r in rs}),
                "hari_ge10cm": len({r["t"][:10] for r in rs if (r["kedalaman_cm"] or 0) >= 10}),
                "n_laporan": len(rs), "n_kedalaman": len(dalam),
                "median_cm": median(dalam), "maks_cm": max(dalam) if dalam else None}
    return hasil


def jalankan():
    semua, mati = {}, 0
    for a, b in potongan(dt.date.today()):
        try:
            fitur = tarik(a, b)
        except RuntimeError as e:
            print(f"  GAGAL {a}..{b}: {e}", file=sys.stderr)
            mati += 1
            continue
        for f in fitur:
            r = ringkas(f)
            semua[r["id"]] = r
        print(f"  {a}..{b}: {len(fitur)} laporan")
    lap = sorted(semua.values(), key=lambda r: r["t"])
    simpan(os.path.join(MENTAH, "petabencana_laporan.json"), lap)
    kec = KecDKI()
    ag = agregat(lap, kec)
    luar = sum(1 for r in lap if not kec.cari(r["lon"], r["lat"]))
    per_th = {}
    for r in lap:
        per_th[r["t"][:4]] = per_th.get(r["t"][:4], 0) + 1
    simpan(os.path.join(RINGKAS, "riwayat_kec.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "sumber": ATRIBUSI,
        "cakupan": f"{lap[0]['t'][:10]}..{lap[-1]['t'][:10]}" if lap else None,
        "n_laporan": len(lap), "n_luar_dki": luar, "laporan_per_tahun": per_th, "potong_gagal": mati,
        "catatan": "hari = hari WIB dengan >=1 laporan; bias pelapor; kedalaman kosong untuk sebagian laporan.",
        "kecamatan": ag})
    print(f"{len(lap)} laporan, {luar} di luar poligon DKI, {len(ag)} kecamatan")


def uji():
    f = {"geometry": {"coordinates": [106.8, -6.2]}, "properties": {
        "pkey": "1", "created_at": "2020-01-01T18:00:00.000Z", "source": "qlue", "status": "confirmed",
        "report_data": {"flood_depth": 40}, "tags": {"district_id": "3171", "local_area_id": "9"}}}
    r = ringkas(f)
    assert r["t"] == "2020-01-02T01:00:00+07:00" and r["kedalaman_cm"] == 40 and r["rw"] == "9", r
    bagian = list(potongan(dt.date(2017, 12, 31)))
    assert bagian[0][0] == AWAL and all((b - a).days <= POTONG for a, b in bagian) and bagian[-1][1] == dt.date(2018, 1, 1)
    lap = [dict(r, t="2020-01-02T01:00:00+07:00"), dict(r, id="2", t="2020-01-03T01:00:00+07:00", kedalaman_cm=None)]
    ag = agregat(lap, KecDKI())
    v = list(ag.values())[0]["2020"]
    assert v["hari"] == 2 and v["hari_ge10cm"] == 1 and v["median_cm"] == 40 and v["n_kedalaman"] == 1, v
    mk = lambda i, tipe, teks, t="2024-08-17T10:00:00+07:00", lon=106.8, lat=-6.2: {"id": i, "tipe": tipe, "teks": teks, "t": t, "lon": lon, "lat": lat}
    contoh = [mk("1", "flood", "Duta Widi Iskandar Rangkuti"), mk("2", "flood", "HKB 2025 uji"), mk("3", "flood", "TRAINER JATMIKO"), mk("4", "flood", "Bakrie Reino"), mk("5", "flood", "SMP negeri 11 Jakarta"),
              mk("6", "flood", "BPBD ASLIN AMARDAN"), mk("7", "flood", "SIMULASI PELAPORAN BENCANA\nNama: X"), mk("8", "flood", "Tes ngeteh"), mk("9", "wind", "pohon tumbang"),
              mk("10", "flood", "Banjir di Jl. Raya, tinggi 40 cm"), mk("11", "flood", ""), mk("12", "flood", "BPBD tolong pompa segera kami sudah 2 hari terendam"), mk("13", "flood", "#drainaseburuk keruk"),
              mk("14", "flood", "Tolong, air masuk rumah (testimoni warga)")]
    bersih, rk = saring(contoh)
    assert [r["id"] for r in bersih] == ["10", "11", "12", "13", "14"] and rk["bukan_flood"] == 1 and rk["awal"] == 6 and rk["kata"] == 2, (rk, [r["id"] for r in bersih])
    ramai = [mk(str(i), "flood", "banjir", lon=106.82801) for i in range(BURST_MAKS + 1)] + [mk("x", "flood", "banjir", lon=106.9)]
    b2, r2 = saring(ramai); assert len(b2) == 1 and r2["burst"] == BURST_MAKS + 1, r2     # lebih dari 20 di satu sel/hari = latihan massal
    assert ringkas(dict(f, properties=dict(f["properties"], disaster_type="wind", text=" halo ")))["tipe"] == "wind" and r["tipe"] is None and r["teks"] == ""
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan_saring() if sys.argv[1:] == ["saring"] else jalankan()
