"""Dampak kekeringan, tanpa jaringan -> public/banjir/data/dampak_kekeringan.json

  terpapar  jiwa di kecamatan berstatus Awas/Siaga kekeringan hari ini, nasional dan per provinsi, serta jumlah kabupaten/kota
            (public/data/kekeringan_wilayah.json dan kekeringan_meta.json; penduduk WorldPop 2026 = semua penghuni kecamatan berstatus, bukan hanya yang kehilangan air).
  tahunan   kejadian kekeringan dan dampaknya per tahun (BNPB, data.bnpb.go.id; dibaca dari kunci `kering` di public/banjir/data/kejadian.json yang sudah dibangun
            skrip banjir, jadi tak ada panggilan jaringan baru). Hanya angka yang tercatat; kunci yang tak ada pada sumbernya tidak diisi.
Bagian tanpa data dibuang (A18): tanpa kecamatan Awas/Siaga tidak ada kunci `terpapar`; tanpa seri `kering` tidak ada `tahunan`.
Sengaja tak ada sekolah, fasilitas kesehatan, dan lahan pertanian: public/data/sekolah.json dan fasilitas.json hanya mencakup provinsi prioritas karhutla, dan luas sawah per wilayah tidak ada.
Pakai:  python3 scripts/kekeringan/dampak.py        tulis berkas
        python3 scripts/kekeringan/dampak.py uji    self-check
"""
import datetime as dt, json, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
KELUAR = os.path.join(AKAR, "public/banjir/data/dampak_kekeringan.json")


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
    print("dampak kekeringan: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
