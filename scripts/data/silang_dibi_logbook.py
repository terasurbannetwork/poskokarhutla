"""Silang DIBI vs logbook Pusdalops 2015-2022 -> public/data/silang_dibi_logbook.json (angka agregat, tanpa teks bebas).

BATAS DATA: DIBI harian per kab (public/data/dibi_kejadian.json) hanya 2025-10..2026-10, tidak beririsan dengan logbook arsip (2011-2022).
Yang beririsan hanya DIBI tahunan per kab x kelompok jenis (public/data/bnpb/dibi_kab_tahun.json, 2015-2025). Maka pencocokan jendela +-3 hari
TIDAK bisa dilakukan; yang dihitung: sel (kab, tahun, jenis) ada di logbook / ada di DIBI, dan rasio jumlah kejadian. Pencocokan sel jauh
lebih longgar daripada +-3 hari: hasil = batas atas kecocokan sebenarnya.
Kode kab DIBI tahunan berkode Kemendagri (penanda "kode"), dipetakan ke kunci 'prov|nama' lewat kota.json; berkas berkode BPS dipetakan dulu lewat padanan_kab_dibi.
Jenis: banjir, longsor, karhutla, kekeringan, cuaca, gempa (logbook 'gempabumi'). kebakaran_permukiman dan jenis lain tak ada di DIBI kelompok ini.

Pakai: python3 scripts/data/silang_dibi_logbook.py   |   python3 scripts/data/silang_dibi_logbook.py uji
"""
import collections, csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../umum"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR, PROVINSI  # noqa: E402

LOGBOOK = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
TAHUNAN = os.path.join(AKAR, "public/data/bnpb/dibi_kab_tahun.json")
HARIAN = os.path.join(AKAR, "public/data/dibi_kejadian.json")
KELUAR = os.path.join(AKAR, "public/data/silang_dibi_logbook.json")
JENIS = {"banjir": "banjir", "longsor": "longsor", "karhutla": "karhutla", "kekeringan": "kekeringan", "cuaca": "cuaca", "gempabumi": "gempa"}
TAHUN = (2015, 2016, 2017, 2018, 2019, 2020, 2022)   # irisan DIBI tahunan (2015+) dan logbook penuh; 2021 logbook hilang
TERATAS = 5


def peta_kode():
    """{kode Kemendagri 4 digit: kunci 'PP|nama'} dari kota.json (514 kab) lewat cari_kab. dibi_kab_tahun.json berkode Kemendagri
    (bukan BPS; 1110 = Aceh Singkil, Bireuen = 1111), jadi kab_kode DIBI harian (BPS) TIDAK dipakai di sini."""
    import importlib.util
    s = importlib.util.spec_from_file_location("kejadian_umum", os.path.join(AKAR, "scripts/umum/kejadian.py"))
    K = importlib.util.module_from_spec(s); s.loader.exec_module(K)
    d = json.load(open(os.path.join(AKAR, "scripts/udara/kota.json"), encoding="utf-8"))
    i = {k: n for n, k in enumerate(d["kolom"])}
    out = {}
    for r in d["baris"]:
        k = K.cari_kab(AKAR, r[i["nama"]], r[i["prov"]])
        if k:
            out[r[i["kode"]]] = k
    return out


def logbook_sel(berkas=LOGBOOK):
    """{(kunci kab, tahun, jenis): jumlah kejadian}; kejadian lintas kab dihitung di tiap kab (sama dengan logbook_riwayat)."""
    out = collections.Counter()
    for r in csv.DictReader(open(berkas)):
        j = JENIS.get(r["jenis"])
        if not j or not r["kab_kode"] or not r["tgl_kejadian"][:4].isdigit() or int(r["tgl_kejadian"][:4]) not in TAHUN:
            continue
        for k in filter(None, r["kab_kode"].split("; ")):
            out[(k, int(r["tgl_kejadian"][:4]), j)] += 1
    return out


def dibi_sel(kode_ke_kunci, berkas=TAHUNAN):
    """-> ({(kunci, tahun, jenis): kejadian}, jumlah kejadian DIBI tak terpetakan per tahun)."""
    out, tak = collections.Counter(), collections.Counter()
    d = json.load(open(berkas))
    bps = d.get("kode") != "kemendagri"   # berkas lama berkode BPS: petakan dulu; tak terpetakan = tak (tidak jadi 0)
    if bps:
        import padanan_kab_dibi as P
    for kab, th, j, n, *_ in d["baris"]:
        if bps:
            kab = P.petakan(kab)
        if th not in TAHUN or j not in JENIS.values():
            continue
        k = kode_ke_kunci.get(kab)
        if k:
            out[(k, th, j)] += n
        else:
            tak[th] += n
    return out, tak


def silang(lb, db):
    """Agregat: per jenis dan per tahun {sel_logbook, sel_logbook_di_dibi, sel_dibi, sel_dibi_di_logbook, kejadian_*}; selisih per provinsi."""
    def blok(kunci):
        L = {k for k in lb if kunci(k)}; D = {k for k in db if kunci(k)}
        return {"sel_logbook": len(L), "persen_logbook_ada_di_dibi": round(100 * len(L & D) / len(L), 1) if L else None,
                "sel_dibi": len(D), "persen_dibi_ada_di_logbook": round(100 * len(L & D) / len(D), 1) if D else None,
                "kejadian_logbook": sum(lb[k] for k in L), "kejadian_dibi": sum(db[k] for k in D),
                "rasio_logbook_per_dibi": round(sum(lb[k] for k in L) / sum(db[k] for k in D), 2) if D else None}
    res = {"semua": blok(lambda k: True),
           "per_jenis": {j: blok(lambda k, j=j: k[2] == j) for j in sorted(set(JENIS.values()))},
           "per_tahun": {str(t): blok(lambda k, t=t: k[1] == t) for t in TAHUN}}
    res["per_jenis_tahun"] = {j: {str(t): blok(lambda k, j=j, t=t: k[2] == j and k[1] == t) for t in TAHUN} for j in sorted(set(JENIS.values()))}
    # kesenjangan provinsi: sel DIBI tanpa logbook dan sebaliknya
    def prov_gap(jenis=None):
        miss_lb, miss_db, tot = collections.Counter(), collections.Counter(), collections.Counter()
        for k in set(lb) | set(db):
            if jenis and k[2] != jenis:
                continue
            p = k[0][:2]
            tot[p] += 1
            if k in db and k not in lb:
                miss_lb[p] += db[k]
            if k in lb and k not in db:
                miss_db[p] += lb[k]
        nama = lambda p: PROVINSI.get(p, p)
        return {"dibi_tanpa_logbook_kejadian": [[nama(p), n] for p, n in miss_lb.most_common(TERATAS)],
                "logbook_tanpa_dibi_kejadian": [[nama(p), n] for p, n in miss_db.most_common(TERATAS)]}
    res["kesenjangan_provinsi"] = {"semua": prov_gap(), **{j: prov_gap(j) for j in sorted(set(JENIS.values()))}}
    return res


def uji():
    lb = collections.Counter({("11|A", 2015, "banjir"): 2, ("11|B", 2015, "banjir"): 1})
    db = collections.Counter({("11|A", 2015, "banjir"): 3, ("12|C", 2015, "banjir"): 4})
    r = silang(lb, db)["per_jenis"]["banjir"]
    assert r["persen_logbook_ada_di_dibi"] == 50.0 and r["persen_dibi_ada_di_logbook"] == 50.0 and r["kejadian_dibi"] == 7 and r["kejadian_logbook"] == 3, r
    g = silang(lb, db)["kesenjangan_provinsi"]["semua"]
    assert g["dibi_tanpa_logbook_kejadian"][0][1] == 4 and g["logbook_tanpa_dibi_kejadian"][0][1] == 1, g
    # kode Kemendagri: Bireuen 1111 (BPS 1110 = Aceh Singkil di Kemendagri), Mimika 9404 (BPS 9412)
    kode = peta_kode()
    assert "Bireuen" in kode["1111"] and "Singkil" in kode["1110"] and "Mimika" in kode["9404"] and "9412" not in kode, (kode["1111"], kode["1110"])
    import tempfile
    def tahunan(kd, baris):
        f = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False); json.dump({**kd, "baris": baris}, f); f.close(); return f.name
    br = [["1111", 2015, "banjir", 3], ["1110", 2015, "banjir", 1], ["9404", 2015, "banjir", 2]]
    db, tak = dibi_sel(kode, tahunan({"kode": "kemendagri"}, br))
    assert db[(kode["1111"], 2015, "banjir")] == 3 and db[(kode["1110"], 2015, "banjir")] == 1 and db[(kode["9404"], 2015, "banjir")] == 2 and not tak
    # berkas lama berkode BPS: 1110 = Bireuen, 9412 = Mimika, kode tak dikenal masuk tak
    db, tak = dibi_sel(kode, tahunan({}, [["1110", 2015, "banjir", 3], ["9412", 2015, "banjir", 2], ["0001", 2015, "banjir", 7]]))
    assert db[(kode["1111"], 2015, "banjir")] == 3 and db[(kode["9404"], 2015, "banjir")] == 2 and tak[2015] == 7, (db, tak)
    print("silang_dibi_logbook: uji lolos")


def jalan():
    kode = peta_kode()
    lb = logbook_sel()
    db, tak = dibi_sel(kode)
    out = {"dibuat": dt.date.today().isoformat(), "sumber": "logbook Pusdalops arsip vs DIBI tahunan per kab (public/data/bnpb/dibi_kab_tahun.json)",
           "batas": ("DIBI harian tidak beririsan dengan logbook arsip, jadi jendela +-3 hari tidak dihitung. Dicocokkan per sel (kab, tahun, jenis): sel ada/tidak ada, "
                     "plus jumlah kejadian. Ini batas atas kecocokan; logbook = laporan harian Pusdalops, DIBI = rekap kejadian resmi, jadi cakupan memang berbeda. "
                     "Jenis yang dibandingkan: banjir, longsor, karhutla, kekeringan, cuaca, gempa."),
           "tahun": list(TAHUN), "kab_dibi_terpetakan": len(kode), "kejadian_dibi_tak_terpetakan_per_tahun": {str(k): v for k, v in sorted(tak.items())},
           **silang(lb, db)}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    print("terpetakan", len(kode), "tak terpetakan", dict(tak))
    print("semua", out["semua"])
    for j, v in out["per_jenis"].items():
        print(j, v)
    for t, v in out["per_tahun"].items():
        print(t, v["persen_logbook_ada_di_dibi"], v["persen_dibi_ada_di_logbook"], v["rasio_logbook_per_dibi"])


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
