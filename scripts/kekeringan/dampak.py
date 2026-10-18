"""Dampak kekeringan, tanpa jaringan -> public/data/dampak_kekeringan.json (dulu public/banjir/data; dipindah 18 Okt 2026 agar ikut cache Actions)

  terpapar  jiwa di kecamatan berstatus Awas/Siaga kekeringan hari ini, nasional dan per provinsi, serta jumlah kabupaten/kota
            (public/data/kekeringan_wilayah.json dan kekeringan_meta.json; penduduk WorldPop 2026 = semua penghuni kecamatan berstatus, bukan hanya yang kehilangan air).
  tahunan   kejadian kekeringan dan dampaknya per tahun (BNPB, data.bnpb.go.id; dibaca dari kunci `kering` di public/banjir/data/kejadian.json yang sudah dibangun
            skrip banjir, jadi tak ada panggilan jaringan baru). Hanya angka yang tercatat; kunci yang tak ada pada sumbernya tidak diisi.
Bagian tanpa data dibuang (A18): tanpa kecamatan Awas/Siaga tidak ada kunci `terpapar`; tanpa seri `kering` tidak ada `tahunan`.
  tanpa_air jiwa Siaga/Awas per provinsi x (1 - % rumah tangga akses air minum layak), HANYA bila public/kekeringan/data/air_minum.json (kurasi tangan dari BPS,
            tiap provinsi berkolom persen + sumber + tahun) ada. BPS webapi butuh kunci dan angka tak boleh dikarang, jadi tanpa berkas itu bagian ini dibuang.
Sengaja tak ada: sekolah/fasilitas (hanya provinsi prioritas karhutla); luas sawah (tak ada data sawah terbuka yang layak: OSM 7.077 poligon padi se-Indonesia, BPS/Kementan butuh kunci);
harga beras (API panel harga Bapanas 401 tanpa kunci).
  sawah_rusak, lahan_rusak  seri ha nasional akibat kekeringan (BNPB; dibaca dari public/data/kekeringan_bnpb.json hasil resmi.py). Bukan luas sawah di wilayah Siaga/Awas. Dicek 18 Okt 2026.
Pakai:  python3 scripts/kekeringan/dampak.py        tulis berkas
        python3 scripts/kekeringan/dampak.py uji    self-check
"""
import datetime as dt, json, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
KELUAR = os.path.join(AKAR, "public/data/dampak_kekeringan.json")
AIR = os.path.join(AKAR, "public/kekeringan/data/air_minum.json")


def terpapar(wil, nasional):
    """wil = kekeringan_wilayah.json, nasional = kekeringan_meta.json["nasional"] -> {jiwa: [siaga+, awas], kab: [siaga+, awas], prov: {kode: {...}}} atau None."""
    n_siaga, n_awas = nasional["jiwa"][1], nasional["jiwa"][2]
    if not n_siaga:
        return None
    prov = {k: {"jiwa_siaga": v["jiwa"][1], "jiwa_awas": v["jiwa"][2], "kab_siaga": v["kab_n"][1], "kab_awas": v["kab_n"][2], "total": v["total"]}
            for k, v in wil["prov"].items() if v["jiwa"][1]}
    return {"jiwa_siaga": n_siaga, "jiwa_awas": n_awas, "kab_siaga": nasional["kab_n"][1], "kab_awas": nasional["kab_n"][2], "total": nasional["total"], "prov": prov}


def tahunan(kej):
    """{tahun: {kunci: angka}} dari kejadian.json["nasional"]["kering"], hanya kunci yang ada."""
    return {t: {k: v for k, v in d.items() if v is not None} for t, d in sorted((kej.get("nasional", {}).get("kering") or {}).items()) if d}


def tanpa_air(wil, tabel, provinsi):
    """wil = kekeringan_wilayah.json, tabel = air_minum.json {"prov": {kode: {"persen": 0-100, "tahun": int, "sumber": str}}}, provinsi = kode yang dikenal
    -> {"jiwa": perkiraan nasional, "prov": {kode: {...}}} atau None."""
    out, tot = {}, 0
    for k, v in tabel["prov"].items():
        if k not in provinsi:
            raise ValueError(f"kode provinsi tak dikenal: {k}")
        if not isinstance(v.get("persen"), (int, float)) or not 0 <= v["persen"] <= 100 or not v.get("sumber") or not v.get("tahun"):
            raise ValueError(f"{k}: persen/sumber/tahun tak sah: {v}")
        j = wil["prov"].get(k, {}).get("jiwa", [0, 0, 0])[1]
        if j:
            out[k] = {"jiwa_siaga": j, "persen_layak": v["persen"], "tanpa_air": round(j * (1 - v["persen"] / 100)), "tahun": v["tahun"], "sumber": v["sumber"]}
            tot += out[k]["tanpa_air"]
    return {"jiwa": tot, "prov": out} if out else None


def rusak(bnpb, kunci):
    """bnpb = kekeringan_bnpb.json, kunci 'sawah'|'lahan' -> {tahun: ha} (nasional, BNPB) atau None; menolak tahun/luas tak sah."""
    r = bnpb.get(kunci)
    if not r:
        return None
    for t, ha in r.items():
        if not (t.isdigit() and 2000 <= int(t) <= 2100) or not isinstance(ha, (int, float)) or ha < 0:
            raise ValueError(f"{kunci}: {t}={ha} tak sah")
    return r


def tulis():
    b = lambda p: json.load(open(os.path.join(AKAR, p)))
    meta, wil = b("public/data/kekeringan_meta.json"), b("public/data/kekeringan_wilayah.json")
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "status_dibuat": meta["dibuat"], "dasarian": meta["dasarian"]}
    t = terpapar(wil, meta["nasional"])
    if t:
        out["terpapar"] = t
    kp = os.path.join(AKAR, "public/banjir/data/kejadian.json")
    th = tahunan(json.load(open(kp))) if os.path.exists(kp) else {}
    if th:
        out["tahunan"] = th
    bp = os.path.join(AKAR, "public/data/kekeringan_bnpb.json")
    bnpb = json.load(open(bp)) if os.path.exists(bp) else {}
    for k, nama in (("sawah", "sawah_rusak"), ("lahan", "lahan_rusak")):
        r = rusak(bnpb, k)
        if r:
            out[nama] = {"satuan": "ha", "lingkup": "nasional", "seri": r, "sumber": bnpb["sumber"][k], "catatan": "seri pelaporan BNPB, bukan ukuran dampak; 2016 kosong di sumbernya"}
    if os.path.exists(AIR):
        ta = tanpa_air(wil, json.load(open(AIR)), meta["provinsi"])
        if ta:
            out["tanpa_air"] = ta
    out["sumber"] = {"terpapar": "Deteksi Pantau Bencana (NASA POWER, ECMWF, ERA5-Land); penduduk WorldPop 2026", "tahunan": "BNPB, data.bnpb.go.id (Data Bencana Indonesia 2010-2024)"}
    with open(KELUAR, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"dampak kekeringan: {(t or {}).get('jiwa_awas', 0):,} jiwa Awas, {(t or {}).get('jiwa_siaga', 0):,} jiwa Siaga atau Awas; tahunan {len(th)} tahun")


def uji():
    wil = {"prov": {"11": {"jiwa": [10, 8, 5], "kab_n": [3, 2, 1], "total": 20}, "12": {"jiwa": [4, 0, 0], "kab_n": [1, 0, 0], "total": 9}}}
    t = terpapar(wil, {"jiwa": [14, 8, 5], "kab_n": [4, 2, 1], "total": 29})
    assert t["jiwa_awas"] == 5 and t["kab_siaga"] == 2 and list(t["prov"]) == ["11"], t
    assert terpapar(wil, {"jiwa": [14, 0, 0], "kab_n": [4, 0, 0], "total": 29}) is None
    assert tahunan({"nasional": {"kering": {"2024": {"kejadian": 89, "meninggal": None}, "2023": {}}}}) == {"2024": {"kejadian": 89}}
    w = {"prov": {"11": {"jiwa": [100, 80, 50]}, "12": {"jiwa": [9, 0, 0]}}}
    tb = {"prov": {"11": {"persen": 90, "tahun": 2024, "sumber": "BPS"}, "12": {"persen": 80, "tahun": 2024, "sumber": "BPS"}}}
    assert tanpa_air(w, tb, {"11": "A", "12": "B"}) == {"jiwa": 8, "prov": {"11": {"jiwa_siaga": 80, "persen_layak": 90, "tanpa_air": 8, "tahun": 2024, "sumber": "BPS"}}}
    for salah, kode in (({"11": {"persen": 101, "tahun": 2024, "sumber": "BPS"}}, "11"), ({"11": {"persen": -1, "tahun": 2024, "sumber": "BPS"}}, "11"),
                        ({"99": {"persen": 50, "tahun": 2024, "sumber": "BPS"}}, "11"), ({"11": {"persen": 50, "tahun": 2024}}, "11")):
        try:
            tanpa_air(w, {"prov": salah}, {kode: "A"})
            raise SystemExit(f"harus ditolak: {salah}")
        except ValueError:
            pass
    assert rusak({"sawah": {"2019": 22314.9, "2020": 0}}, "sawah") == {"2019": 22314.9, "2020": 0} and rusak({}, "sawah") is None
    for salah in ({"1850": 5}, {"2019": -2}, {"2019": "x"}):
        try:
            rusak({"sawah": salah}, "sawah")
            raise SystemExit(f"harus ditolak: {salah}")
        except ValueError:
            pass
    print("dampak kekeringan: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
