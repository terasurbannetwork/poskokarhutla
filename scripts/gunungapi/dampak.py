"""Dampak gunung api -> public/banjir/data/dampak_gunungapi.json

  terpapar  jiwa dalam radius rekomendasi PVMBG tiap gunung berstatus Level II ke atas (penduduk_radius di public/banjir/data/gunungapi_status.json,
            interpolasi cincin paparan WorldPop 1 km 3/5/10/15 km menurut r^2, dihitung magma.py; gunung tanpa cincin = null dan dilewati), per gunung dan per level. Tanpa jaringan.
  rentan_abu balita dan lansia dalam jejak abu skenario 72 jam (gabungan poligon jejak berambang jam 6..72 tiap gunung, abu_gunungapi.json). Penduduk = sel WorldPop 0,25 derajat
            (public/data/penduduk.json) yang PUSATNYA di dalam poligon: kasar (sel ~28 km), orde besar saja. Porsi umur nasional dari scripts/udara/rentan.py. Tanpa RR/ISPA (tak ada sumber untuk abu).
  tahunan   kejadian erupsi dan korbannya per tahun 2010-2024 (BNPB, data.bnpb.go.id, jenis "ERUPSI GUNUNG API"): kejadian, meninggal, terdampak,
            mengungsi, rumah rusak. Hanya angka yang tercatat; bila BNPB tak bisa diakses dan belum ada berkas lama, bagian ini tidak ada (A18).
  tren      uji tren jangka panjang atas seri tahunan itu (Mann-Kendall + Theil-Sen, scripts/gunungapi/tren.py), p-value dan vonis naik/turun/tidak bermakna.
            DIBI BNPB tidak dipakai: dasbor Superset-nya tak menjawab dari luar peramban (dicek 16 Okt 2026).
Sengaja tak ada sekolah dan fasilitas kesehatan dalam radius: public/data/sekolah.json dan fasilitas.json hanya mencakup provinsi prioritas karhutla, jadi angkanya akan kurang.
Pakai:  python3 scripts/gunungapi/dampak.py        tulis berkas
        python3 scripts/gunungapi/dampak.py uji    self-check
"""
import datetime as dt, json, os, re, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tren
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../udara"))
import rentan   # porsi balita/lansia (BALITA, LANSIA): satu sumber dengan modul udara
from paparan import dalam

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
WIB = dt.timezone(dt.timedelta(hours=7))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
API = "https://data.bnpb.go.id/api/3/action/"
JENIS = "ERUPSI GUNUNG API"
METRIK = [("kejadian", r"Jumlah Kejadian Bencana"), ("meninggal", r"Korban Meninggal"), ("terdampak", r"Korban Terdampak"),
          ("mengungsi", r"Korban Mengungsi"), ("rumah_rusak", r"Jumlah Rumah Rusak")]
KELUAR = os.path.join(AKAR, "public/banjir/data/dampak_gunungapi.json")


def terpapar(gunung):
    """[{nama, prov, level, radius_km, penduduk_radius}] -> {jiwa, gunung, per_level, daftar}. Hanya gunung berradius dan berpenduduk > 0."""
    d = sorted((g for g in gunung if g.get("radius_km") and (g.get("penduduk_radius") or 0) > 0), key=lambda g: -g["penduduk_radius"])
    per = {}
    for g in d:
        o = per.setdefault(str(g["level"]), {"gunung": 0, "jiwa": 0}); o["gunung"] += 1; o["jiwa"] += g["penduduk_radius"]
    return {"jiwa": sum(g["penduduk_radius"] for g in d), "gunung": len(d), "per_level": per,
            "daftar": [{"nama": g["nama"], "prov": g["prov"], "level": g["level"], "radius_km": g["radius_km"], "jiwa": g["penduduk_radius"]} for g in d]}


def rentan_abu(abu_g, grid):
    """abu_g = daftar gunung abu_gunungapi.json, grid = penduduk.json["grid"] [[lat, lon, jiwa, prov]] -> {jiwa, balita, lansia, gunung:[...], sel_km, ...} atau None bila tak ada jejak sah.
    Jiwa nasional dihitung per sel unik (jejak dua gunung yang tumpang tindih tidak dihitung dua kali)."""
    pct = lambda x: f"{x:.1%}".replace(".", ",")
    sel = {}
    for lat, lon, j, _ in grid:
        sel[(lat, lon)] = sel.get((lat, lon), 0) + j
    dipakai, daftar = set(), []
    for g in abu_g:
        polis = [([tuple(v) for v in j["poligon"]]) for j in g.get("jejak", []) if j.get("poligon") and not j.get("di_bawah_ambang")]
        polis = [((min(x for x, _ in r), min(y for _, y in r), max(x for x, _ in r), max(y for _, y in r)), [r]) for r in polis]
        if not polis:
            continue
        kena = {k for k in sel if any(dalam(p, k[1], k[0]) for p in polis)}
        jiwa = sum(sel[k] for k in kena)
        dipakai |= kena
        daftar.append({"id": g["id"], "nama": g["nama"], "level": g["level"], "jiwa": round(jiwa), "balita": round(jiwa * rentan.BALITA), "lansia": round(jiwa * rentan.LANSIA)})
    if not daftar:
        return None
    t = sum(sel[k] for k in dipakai)
    return {"jiwa": round(t), "balita": round(t * rentan.BALITA), "lansia": round(t * rentan.LANSIA), "gunung": sorted(daftar, key=lambda x: -x["jiwa"]),
            "dasar": "Jejak abu skenario berambang penerbangan jam 6-72 (bukan prakiraan letusan). Penduduk = sel WorldPop 0,25 derajat berpusat di dalam jejak: kasar, sel ~28 km. "
                     f"Porsi balita {pct(rentan.BALITA)} dan lansia {pct(rentan.LANSIA)} nasional (BPS), bukan struktur umur lokal. Tanpa angka ISPA: tak ada fungsi dosis-respons abu yang bersumber."}


def ambil(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return json.load(r)
        except Exception as e:
            if i == 2:
                raise RuntimeError(f"{url[:90]}: {e}")
            time.sleep(4 * (i + 1))


def tahunan():
    """{tahun: {kunci: angka}} nasional untuk ERUPSI GUNUNG API dari sumber daya 'Menurut Jenis Bencana Tahun 2010-2024' tiap metrik."""
    res = {}
    for q in ("kompilasi data kejadian dampak bencana", "jumlah kejadian bencana menurut provinsi"):
        for p in ambil(f"{API}package_search?q={urllib.parse.quote(q)}&rows=50")["result"]["results"]:
            if p["name"].startswith(("kompilasi", "data-bencana")):
                for r in ambil(f"{API}package_show?id={p['name']}")["result"]["resources"]:
                    if r.get("datastore_active"):
                        res.setdefault(r["name"].strip(), r["id"])
                time.sleep(.4)
    out = {}
    for kunci, pola in METRIK:
        nama = next((n for n in res if re.search(pola, n, re.I) and re.search(r"Menurut Jenis Bencana|Akibat Bencana Tahun 2010", n, re.I) and re.search(r"2010-20\d\d", n)), None)
        if not nama:
            continue
        try:
            baris = ambil(f"{API}datastore_search?resource_id={res[nama]}&limit=200")["result"]["records"]
        except RuntimeError as e:   # sumber daya terdaftar tapi datastore-nya hilang (Korban Meninggal, 16 Okt 2026): kunci itu dilewati, bukan diisi 0
            print(f"  {kunci} dilewati: {e}", file=sys.stderr)
            continue
        for r in baris:
            if str(r.get("JENIS BENCANA", "")).strip().upper() == JENIS:
                for k, v in r.items():
                    m = re.fullmatch(r"(20\d\d)(\.0)?", k)
                    if m and v is not None:
                        out.setdefault(m.group(1), {})[kunci] = int(float(v))
    return dict(sorted(out.items()))


def tulis():
    st = json.load(open(os.path.join(AKAR, "public/banjir/data/gunungapi_status.json")))
    lama = json.load(open(KELUAR)) if os.path.exists(KELUAR) else {}
    try:
        th = tahunan()
    except RuntimeError as e:
        print(f"BNPB gagal: {e}; pakai berkas lama bila ada", file=sys.stderr)
        th = lama.get("tahunan") or {}
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "status_dibuat": st["dibuat"], "terpapar": terpapar(st["gunung"])}
    try:
        ab = json.load(open(os.path.join(AKAR, "public/banjir/data/abu_gunungapi.json")))
        ra = rentan_abu(ab["gunung"], json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["grid"])
        if ra:
            out["rentan_abu"] = ra
    except (OSError, KeyError, ValueError) as e:
        print(f"rentan_abu dilewati: {e}", file=sys.stderr)
    if th:
        out["tahunan"] = th
        out["tren"] = tren.dari_tahunan(th)   # B06: Mann-Kendall + Theil-Sen per metrik (tren.py)
    out["sumber"] = {"terpapar": "MAGMA Indonesia, PVMBG (radius rekomendasi); WorldPop 1 km (cincin paparan 3/5/10/15 km, interpolasi r^2)", "tahunan": "BNPB, data.bnpb.go.id (Data Bencana Indonesia 2010-2024)"}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    t = out["terpapar"]
    print(f"dampak gunungapi: {t['jiwa']:,} jiwa dalam radius {t['gunung']} gunung; tahunan {len(th)} tahun")


def uji():
    t = terpapar([{"nama": "A", "prov": "X", "level": 3, "radius_km": 5, "penduduk_radius": 1000}, {"nama": "B", "prov": "Y", "level": 2, "radius_km": 2, "penduduk_radius": 300},
                  {"nama": "C", "prov": "Z", "level": 3, "radius_km": 5, "penduduk_radius": 0}, {"nama": "D", "prov": "Z", "level": 1}, {"nama": "E", "prov": "Z", "level": 3, "radius_km": 5, "penduduk_radius": None}])
    assert t["jiwa"] == 1300 and t["gunung"] == 2 and t["per_level"]["3"] == {"gunung": 1, "jiwa": 1000} and t["daftar"][0]["nama"] == "A", t
    r = tren.dari_tahunan({str(2010 + i): {"kejadian": i * 2} for i in range(12)})
    assert r["kejadian"]["vonis"] == "naik" and "terdampak" not in r, r
    # rentan_abu: sel (lat -6, lon 107) berpusat dalam kotak 106-108 x -7..-5; sel (0,0) di luar; sel kembar provinsi dijumlah; jejak di_bawah_ambang diabaikan
    kotak = [[106, -7], [108, -7], [108, -5], [106, -5]]
    gr = [[-6, 107, 1000, "32"], [-6, 107, 500, ""], [0, 0, 9999, "x"]]
    g = [{"id": "a", "nama": "A", "level": 3, "jejak": [{"jam": 6, "poligon": kotak, "di_bawah_ambang": False}, {"jam": 12, "poligon": kotak, "di_bawah_ambang": False}]},
         {"id": "b", "nama": "B", "level": 2, "jejak": [{"jam": 6, "poligon": [], "di_bawah_ambang": True}]},
         {"id": "c", "nama": "C", "level": 2, "jejak": [{"jam": 6, "poligon": kotak, "di_bawah_ambang": False}]}]
    r = rentan_abu(g, gr)
    assert r["jiwa"] == 1500 and r["balita"] == round(1500 * rentan.BALITA) and r["lansia"] == 180 and [x["id"] for x in r["gunung"]] == ["a", "c"], r   # tumpang tindih a dan c tak dihitung dua kali
    assert rentan_abu(g[1:2], gr) is None and rentan_abu([], gr) is None
    print("dampak gunungapi: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
