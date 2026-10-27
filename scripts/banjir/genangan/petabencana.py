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
import datetime as dt, os, sys, time, urllib.parse
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
            "sumber": p.get("source"), "status": p.get("status")}


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
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
