"""GEOGloWS v2: debit per ruas sungai (ramalan 15 hari) vs periode ulang -> public/banjir/data/geoglows.json

Sumber: GEOGloWS ECMWF Streamflow Service v2 (https://geoglows.ecmwf.int/api/v2/, tanpa kunci, diuji 10 Nov 2026).
  getriverid?lat=&lon=            ID ruas (TDX-Hydro) terdekat dari titik          -> dipakai SEKALI, di-cache di ruas.json
  forecast/<id>?format=json       median ensemble 51 anggota, 3-jam, 15 hari (sejak 00 UTC hari ini)
  retrospectivedaily/<id>         simulasi ERA5 harian 1940-kini (7 hari di belakang)  -> periode ulang Gumbel dihitung di sini
Kenapa periode ulang dihitung sendiri: /returnperiods dan /hydroviewer membalas 500 ("No variable named 'logpearson3'", sisi server,
10 Nov 2026). Rumusnya sama dengan yang dijanjikan penerbit (Gumbel pada maksimum tahunan simulasi); kalau /returnperiods pulih,
ganti isi `periode_ulang()` dan bandingkan. Ruas dipilih dari pos duga air SIHKA yang punya ambang siaga (data/raw/banjir/arsip_pos/pos_meta.json)
supaya bisa dibandingkan; ambang SIHKA berupa TINGGI muka air (cm), bukan debit, jadi perbandingannya per lokasi, bukan per angka.
STATUS: indeks pembanding, bukan model prediksi dan belum lolos uji balik; jangan dipakai memicu status siaga.
Tinjau: simulasi model global di ruas kecil/kanal buatan (Jakarta) bias; kolom `median_historis` untuk menilai skala ruas.

Pakai:  python3 scripts/banjir/geoglows.py          tarik ramalan semua ruas, tulis geoglows.json (bergulir 30 hari puncak harian)
        python3 scripts/banjir/geoglows.py pilih [N] LAB, butuh pyarrow: 25 sungai induk dari tabel metadata + N pos SIHKA (bawaan 30), tulis scripts/banjir/geoglows_ruas.json
        python3 scripts/banjir/geoglows.py uji
Atribusi: GEOGloWS ECMWF Streamflow Service (CC BY 4.0); TDX-Hydro (CC BY-SA 4.0); ECMWF IFS dan ERA5 (CC BY 4.0). Ada perubahan: diringkas.
Sopan: jeda 0,5 dtk per panggilan; harian = 1 panggilan per ruas.
"""
import datetime as dt, json, math, os, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, WIB, baca, simpan

API = "https://geoglows.ecmwf.int/api/v2/"
UA = "poskobanjir/1.0 (+https://centurisk97.id)"
BERKAS, RUAS = os.path.join(KELUAR, "geoglows.json"), os.path.join(os.path.dirname(os.path.abspath(__file__)), "geoglows_ruas.json")   # di-commit (data/raw/banjir/* git-ignore)
POS_META = os.path.join(MENTAH, "arsip_pos", "pos_meta.json")
PERIODE = (2, 5, 10, 25, 50, 100)
GULIR = 30
BESAR = 25   # sungai induk dari tabel metadata, di luar pos SIHKA
ATRIBUSI = ("GEOGloWS ECMWF Streamflow Service v2 (https://geoglows.ecmwf.int), model hidrologi GEOGloWS; hidrografi TDX-Hydro; "
            "forcing ECMWF IFS dan ERA5. Diringkas dan periode ulang dihitung ulang (Gumbel) oleh Centurisk97.")
LISENSI = "CC BY 4.0 (GEOGloWS, ECMWF IFS, ERA5); TDX-Hydro CC BY-SA 4.0; sumber: geoglows-v2.s3-us-west-2.amazonaws.com/licenses.md"


def get(path, coba=4):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(API + path, headers={"User-Agent": UA}), timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if (e.code < 500 and e.code != 429) or i == coba - 1:
                raise
            if e.code == 429:
                time.sleep(30)
        except Exception:
            if i == coba - 1:
                raise
        time.sleep(5 * (i + 1))


def periode_ulang(tgl, nilai):
    """Deret harian (tanggal ISO, debit) -> {tahun_ulang: debit} Gumbel dari maksimum tahunan (tahun penuh >= 20, selain itu None)."""
    mak = {}
    for t, v in zip(tgl, nilai):
        if v is not None:
            mak[t[:4]] = max(mak.get(t[:4], 0), v)
    mak = [v for t, v in mak.items() if t[:4] not in (tgl[0][:4], tgl[-1][:4])]   # buang tahun parsial di ujung
    if len(mak) < 20:
        return None
    n = len(mak)
    m = sum(mak) / n
    s = math.sqrt(sum((x - m) ** 2 for x in mak) / (n - 1))
    b = s * math.sqrt(6) / math.pi
    a = m - 0.5772 * b
    return {str(T): round(a - b * math.log(-math.log(1 - 1 / T)), 1) for T in PERIODE}


def kelas(q, rp):
    """Debit q terhadap periode ulang rp -> 'T>=100' ... 'T<2' (None bila rp kosong)."""
    if not rp or q is None:
        return None
    naik = [T for T in PERIODE if q >= rp[str(T)]]
    return f"T>={naik[-1]}" if naik else "T<2"


def ringkas_ramalan(f):
    """Respons forecast -> (tgl, debit_sekarang = rata 8 langkah pertama, puncak, tgl_puncak)."""
    q = f["flow_median"]
    i = max(range(len(q)), key=q.__getitem__)
    return f["metadata"]["gen_date"][:10], round(sum(q[:8]) / len(q[:8]), 1), round(q[i], 1), f["datetime"][i][:10]


def besar_dari_tabel(n):
    """Sungai induk Indonesia dari tabel metadata penerbit (butuh pyarrow, jalur lab): per cekungan (TerminalLink) ruas dengan DSContArea terbesar
    (= muara), n cekungan teratas. -> [{"id", "lat", "lon", "luas_km2"}]"""
    import pyarrow as pa, pyarrow.compute as pc, pyarrow.fs as fs, pyarrow.parquet as pq
    s3 = fs.S3FileSystem(anonymous=True, region="us-west-2")
    t = "geoglows-v2/tables/"
    c = pq.read_table(s3.open_input_file(t + "v2-countries-table.parquet"))
    c = c.filter(pc.equal(c["RiverCountry"], "Indonesia"))
    m = pq.read_table(s3.open_input_file(t + "v2-model-table.parquet"), columns=["LINKNO", "DSContArea", "TerminalLink"])
    by = {}
    for r in c.join(m, "LINKNO").to_pylist():
        if r["TerminalLink"] not in by or r["DSContArea"] > by[r["TerminalLink"]]["DSContArea"]:
            by[r["TerminalLink"]] = r
    return [{"id": str(r["LINKNO"]), "lat": round(r["lat"], 4), "lon": round(r["lon"], 4), "luas_km2": round(r["DSContArea"] / 1e6)}
            for r in sorted(by.values(), key=lambda r: -r["DSContArea"])[:n]]


def hist(rid):
    d = get(f"retrospectivedaily/{rid}?format=json&start_date=19900101")
    tgl = d.get("datetime") or d.get("index")
    v = next(x for k, x in d.items() if k not in ("datetime", "index", "metadata"))
    time.sleep(0.5)
    return {"rp": periode_ulang(tgl, v), "median_historis": round(sorted(v)[len(v) // 2], 1), "tahun_data": f"{tgl[0][:4]}-{tgl[-1][:4]}"}


def pilih(n):
    pos = [p for p in baca(POS_META, {"pos": []})["pos"] if p.get("a1") and p.get("lat") and p.get("lon") and p.get("jenis") != "pompa"]
    pos.sort(key=lambda p: p["nama"])
    pos = pos[:n]
    ruas, lama = {}, baca(RUAS, {})
    for b in besar_dari_tabel(BESAR):
        rid = b["id"]
        ruas[rid] = {**(lama.get(rid) or hist(rid)), "pos": [f"sungai induk, luas DAS {b['luas_km2']} km2"], "lat": b["lat"], "lon": b["lon"],
                     "ambang_sihka_cm": None, "luas_km2": b["luas_km2"]}
    for p in pos:
        time.sleep(0.5)
        rid = str(get(f"getriverid?lat={p['lat']}&lon={p['lon']}")["river_id"])
        if rid in ruas:
            ruas[rid]["pos"].append(p["nama"])
            continue
        r = lama.get(rid)
        if not r or "rp" not in r:
            r = hist(rid)
        ruas[rid] = {**r, "pos": [p["nama"]], "lat": p["lat"], "lon": p["lon"], "ambang_sihka_cm": [p["a3"], p["a2"], p["a1"]] if p["a1"] else None}
    simpan(RUAS, ruas)
    print(f"{len(ruas)} ruas dari {len(pos)} titik (sungai induk + pos SIHKA berambang); {sum(1 for r in ruas.values() if r['rp'])} dengan periode ulang")


def main():
    ruas = baca(RUAS)
    if not ruas:
        sys.exit("geoglows_ruas.json belum ada: jalankan `geoglows.py pilih` dulu")
    lama = baca(BERKAS, {"ruas": {}})["ruas"]
    hasil, gagal = {}, []
    for rid, r in ruas.items():
        try:
            tgl, now, puncak, tp = ringkas_ramalan(get(f"forecast/{rid}?format=json"))
        except Exception as e:
            gagal.append(f"{rid}: {str(e)[:80]}")
            if rid in lama:
                hasil[rid] = {**lama[rid], "basi": True}      # gen_date tetap yang lama: pembaca tahu umur datanya
            continue
        kecil = r["median_historis"] < 1
        riw = {k: v for k, v in lama.get(rid, {}).get("puncak_harian", {}).items()}
        riw[tgl] = puncak
        riw = dict(sorted(riw.items())[-GULIR:])
        hasil[rid] = {"pos": r["pos"][:3], "lat": r["lat"], "lon": r["lon"], "ambang_sihka_cm": r["ambang_sihka_cm"], "luas_km2": r.get("luas_km2"),
                      "debit_sekarang": now, "puncak_15hari": puncak, "tgl_puncak": tp, "median_historis": r["median_historis"],
                      "ruas_kecil": kecil, "rp": r["rp"], "gen_date": tgl, "basi": False,
                      "kelas_sekarang": None if kecil else kelas(now, r["rp"]), "kelas_puncak": None if kecil else kelas(puncak, r["rp"]), "puncak_harian": riw}
        time.sleep(0.5)
    isi = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sumber": API, "atribusi": ATRIBUSI, "lisensi": LISENSI,
           "satuan": "m3/s", "status": ("INDEKS pembanding; belum lolos uji balik, bukan model prediksi. Ruas kecil (median historis < 1 m3/s, kanal/anak sungai, simulasi global bias) "
                      "dikecualikan dari kelas periode ulang (kelas_* = null). basi=true: ramalan hari ini gagal ditarik, isi dari gen_date lama."),
           "periode_ulang_metode": "Gumbel pada maksimum tahunan simulasi harian ERA5 (dihitung sendiri; /returnperiods penerbit 500)",
           "n_ruas": len(hasil), "gagal": gagal, "ruas": hasil}
    simpan(BERKAS, isi)
    print(json.dumps({k: isi[k] for k in ("n_ruas", "gagal")}, ensure_ascii=False), f"{os.path.getsize(BERKAS) / 1024:.0f} KB")


def uji():
    tgl = [f"{1990 + i // 365}-{1 + i % 12:02d}-15" for i in range(365 * 36)]
    nil = [100 + (i // 365) * 2 + (i % 12) for i in range(len(tgl))]
    rp = periode_ulang(tgl, nil)
    assert rp and list(rp) == [str(T) for T in PERIODE] and rp["2"] < rp["100"], rp
    assert periode_ulang(tgl[:400], nil[:400]) is None
    assert kelas(150, {"2": 100, "5": 120, "10": 140, "25": 160, "50": 180, "100": 200}) == "T>=10"
    assert kelas(50, {"2": 100, "5": 120, "10": 140, "25": 160, "50": 180, "100": 200}) == "T<2" and kelas(1, None) is None
    f = {"flow_median": [1, 2, 3, 4, 5, 6, 7, 8, 30, 9], "datetime": [f"2026-11-{10 + i // 8:02d}T00:00:00+00:00" for i in range(10)],
         "metadata": {"gen_date": "2026-11-10T11:30:12+00:00"}}
    assert ringkas_ramalan(f) == ("2026-11-10", 4.5, 30, "2026-11-11"), ringkas_ramalan(f)
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a == ["uji"] else pilih(int(a[1]) if len(a) > 1 else 30) if a[:1] == ["pilih"] else main()
