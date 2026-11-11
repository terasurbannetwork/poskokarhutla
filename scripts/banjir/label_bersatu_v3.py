"""Label banjir bersatu v3 = v2 + bukti OPERA DSWx-S1 (radar Sentinel-1). Luring, stdlib. Aturan: PRAREG-LABEL-V3.md (dibekukan 11 Nov 2026).

v2 (label_bersatu_v2.py) TIDAK disentuh: v3 membaca kab_hari.csv.gz v2 dan menulis HANYA ke data/raw/banjir/label_bersatu_v3/ dan
public/banjir/data/label_bersatu_v3_ringkas.json. Bila DSWx kosong (opera_dswx.json tanpa di_atas_min_ha, belum ada raster terproses), v3 == v2 baris demi baris
(kolom DSWx nol) dan keluaran menyebutnya. Konsumen (model_kab2, model_kab_campur, uji) TETAP di v2 sampai v3 punya data DSWx nyata dan pemilik memutuskan.

ATURAN DSWx (ditetapkan sebelum ada satu hari DSWx pun diproses):
1. Hari-kab POSITIF-DSWx bila di_atas_min_ha >= 100 ha DAN valid >= 5.000 ha (luas teramati hari itu) DAN di_atas_min_ha / valid >= 2%. Indeks, bukan luas banjir.
2. Kab KRONIS (tetap berair: tambak, sawah, pasang) dibuang seluruhnya: >= 50% dari >= 10 hari teramati (valid >= 5.000 ha) positif. Dihitung dari simpanan beku.
3. Hari positif digugus V2.klaster (jangkar, selang +1 hari). Gugus radar cocok dengan gugus v2 satu kab bila ada hari radar r dengan a-1 <= r <= a+1
   (a = jangkar gugus v2). Cocok: gugus v2 mendapat sumber 'dswx' (grup RADAR, tanggal jangkar v2 tetap). Tak cocok: baris baru dswx_saja = 1.
4. Keyakinan: grup RADAR sumber keempat. Aturan v2 tak berubah: TINGGI = RESMI + grup lain mana pun (jadi RESMI + RADAR = TINGGI, naik dari SEDANG), RENDAH tanpa RESMI
   (DSWx saja, DSWx + media, DSWx + warga tetap RENDAH dan ditandai dswx_saja bila tak ada sumber lain). Baris dswx_saja BUKAN positif untuk uji yang mensyaratkan TINGGI/SEDANG.
5. Simpanan beku data/raw/banjir/label_bersatu_v3/dswx_beku.json: nilai kab-hari yang sudah masuk tidak ditimpa; opera_dswx.json hanya bergulir 60 hari.
6. Hari jendela J3 ditandai jendela_j3 = 1 (V2.hari_j3) seperti v2.
Pakai: python3 scripts/banjir/label_bersatu_v3.py susun | uji
"""
import csv, datetime as dt, gzip, json, os, sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import label_bersatu_v2 as V2

P = V2.P
DIR = P("data/raw/banjir/label_bersatu_v3")
OUT_KAB, BEKU = os.path.join(DIR, "kab_hari.csv.gz"), os.path.join(DIR, "dswx_beku.json")
OPERA, OUT_JSON = P("public/banjir/data/opera_dswx.json"), P("public/banjir/data/label_bersatu_v3_ringkas.json")
MIN_HA, MIN_VALID_HA, MIN_FRAKSI = 100.0, 5000.0, 0.02
KRONIS_FRAKSI, KRONIS_MIN_HARI = 0.5, 10
GRUP = {**V2.GRUP, "dswx": "RADAR"}
SUMBER3 = V2.SUMBER + ["dswx"]
KOL_V2 = ["tanggal", "kunci", "prov", *V2.SUMBER, "gs_n", "berita_n", "pb_n", "lb_dampak", "n_grup", "keyakinan", "tinggi_tanpa_media", "episode", "parsial_2026", "jendela_j3"]
KOL3 = KOL_V2 + ["dswx", "dswx_ha", "dswx_saja"]


def tingkat3(ada, lb_dampak=False):
    g = {GRUP[s] for s in ada}
    if ("RESMI" in g and len(g) >= 2) or (lb_dampak and "lb" in ada):
        return "TINGGI"
    return "SEDANG" if "RESMI" in g else "RENDAH"


# ------------------------------------------------------------------ DSWx
def gabung_beku(beku, opera):
    """Salin nilai opera ke simpanan beku {kab: {tgl: [ha, valid]}}; yang sudah ada TIDAK ditimpa (aturan 5). -> jumlah ditambah."""
    n = 0
    for k, per in (opera.get("di_atas_min_ha") or {}).items():
        for t, ha in per.items():
            v = ((opera.get("kab_hari") or {}).get(k) or {}).get(t)
            if ha is None or not v or t in beku.setdefault(k, {}):
                continue
            beku[k][t] = [ha, v[0]]
            n += 1
    return n


def hari_positif(beku):
    """aturan 1 dan 2 -> ({kab: {date: ha}}, kab_kronis set, n_teramati)."""
    pos, kronis, amat = {}, set(), 0
    for k, per in beku.items():
        ok = {t: (ha, v) for t, (ha, v) in per.items() if v >= MIN_VALID_HA}
        amat += len(ok)
        p = {dt.date.fromisoformat(t): ha for t, (ha, v) in ok.items() if ha >= MIN_HA and ha / v >= MIN_FRAKSI}
        if len(ok) >= KRONIS_MIN_HARI and len(p) / len(ok) >= KRONIS_FRAKSI:
            kronis.add(k)
        elif p:
            pos[k] = p
    return pos, kronis, amat


def terapkan(baris, pos, j3=()):
    """baris v2 [dict] + positif DSWx {kab: {date: ha}} -> (baris v3 [dict], statistik). Kolom v2 tidak berubah selain n_grup/keyakinan/tinggi_tanpa_media bila tercocok."""
    out = [{**r, "dswx": "0", "dswx_ha": "", "dswx_saja": "0"} for r in baris]
    per_kab = defaultdict(list)
    for r in out:
        per_kab[r["kunci"]].append(r)
    st = Counter()
    for k, hs in pos.items():
        for g in V2.klaster({"dswx": {k: {d: 1 for d in hs}}}):
            dh = [d for d in hs if g["tanggal"] <= d <= g["akhir"]]
            cocok = next((r for r in per_kab[k] if r["dswx_saja"] != "1" and any(abs((d - dt.date.fromisoformat(r["tanggal"])).days) <= 1 for d in dh)), None)
            ha = max(hs[d] for d in dh)
            if cocok:
                cocok["dswx"], cocok["dswx_ha"] = "1", f"{ha:.1f}"
                ada = {s for s in V2.SUMBER if cocok[s] == "1"} | {"dswx"}
                lb = cocok["lb_dampak"] == "1"
                lama = cocok["keyakinan"]
                cocok["n_grup"], cocok["keyakinan"] = str(len({GRUP[s] for s in ada})), tingkat3(ada, lb)
                cocok["tinggi_tanpa_media"] = str(int(cocok["keyakinan"] == "TINGGI" and not set(V2.MEDIA) & ada))
                st["cocok"] += 1
                st["naik_ke_tinggi"] += lama != "TINGGI" and cocok["keyakinan"] == "TINGGI"
            else:
                a = g["tanggal"]
                r = {c: "0" for c in KOL3}
                r.update({"tanggal": a.isoformat(), "kunci": k, "prov": k.split("|")[0], "n_grup": "1", "keyakinan": "RENDAH", "tinggi_tanpa_media": "0",
                          "episode": a.isoformat(), "parsial_2026": str(int(a.year == 2026)), "jendela_j3": str(int(a in j3)),
                          "dswx": "1", "dswx_ha": f"{ha:.1f}", "dswx_saja": "1"})
                out.append(r)
                per_kab[k].append(r)
                st["dswx_saja"] += 1
    out.sort(key=lambda r: (r["tanggal"], r["kunci"]))
    return out, dict(st)


# ------------------------------------------------------------------ susun
def susun():
    baris = list(csv.DictReader(gzip.open(V2.OUT_KAB, "rt")))
    opera = json.load(open(OPERA)) if os.path.exists(OPERA) else {}
    os.makedirs(DIR, exist_ok=True)
    beku = json.load(open(BEKU)) if os.path.exists(BEKU) else {}
    # nama kab opera dinormalkan lewat kunci v1 yang sama dengan semua sumber lain (kunci 'pp|Nama')
    import label_bersatu as V1
    K = V1.Kunci(V1.semesta())
    opera = {**opera, **{s: {(K.cocok(k) or k): v for k, v in (opera.get(s) or {}).items()} for s in ("di_atas_min_ha", "kab_hari")}}
    baru = gabung_beku(beku, opera)
    json.dump(beku, open(BEKU, "w"), separators=(",", ":"))
    pos, kronis, amat = hari_positif(beku)
    v3, st = terapkan(baris, pos, V2.hari_j3())
    kosong = not pos
    if kosong:
        assert len(v3) == len(baris) and all({c: r[c] for c in KOL_V2} == b for r, b in zip(v3, baris)), "DSWx kosong tetapi v3 != v2"
    with gzip.open(OUT_KAB, "wt", newline="") as f:
        w = csv.writer(f)
        w.writerow(KOL3)
        w.writerows([[r[c] for c in KOL3] for r in v3])
    ring = {
        "dibuat": dt.date.today().isoformat(), "prareg": "scripts/banjir/PRAREG-LABEL-V3.md", "dasar": "label_bersatu_v2 + OPERA DSWx-S1",
        "v3_sama_dengan_v2": kosong,
        "status": "DSWx KOSONG: v3 == v2 baris demi baris (kolom dswx nol); konsumen tetap di v2" if kosong else "DSWx ada: v3 menambah bukti radar; konsumen tetap di v2 sampai dipindah dengan keputusan tertulis",
        "dswx_status_proses": opera.get("status"), "dswx_katalog_hari": len(opera.get("katalog") or {}),
        "aturan": {"min_ha": MIN_HA, "min_valid_ha": MIN_VALID_HA, "min_fraksi": MIN_FRAKSI, "kronis": f">= {KRONIS_FRAKSI:.0%} dari >= {KRONIS_MIN_HARI} hari teramati"},
        "simpanan_beku": {"kab": len(beku), "kab_hari": sum(len(p) for p in beku.values()), "ditambah_run_ini": baru},
        "kab_hari_teramati": amat, "kab_hari_positif": sum(len(p) for p in pos.values()), "kab_kronis_dibuang": sorted(kronis),
        "hasil": st, "baris": {"v2": len(baris), "v3": len(v3)},
        "per_tahun_keyakinan_v3": {y: dict(Counter(r["keyakinan"] for r in v3 if r["tanggal"][:4] == y)) for y in sorted({r["tanggal"][:4] for r in v3})[-4:]},
        "silang_mcdwd": opera.get("silang_mcdwd"),
        "catatan": ["DSWx = indeks radar air di atas minimum 60 hari, bukan luas banjir; DSWx saja = RENDAH dan dswx_saja = 1.",
                    "Hanya hari yang sudah diproses opera_dswx.py (sejak 27 Okt 2026) yang ada; tidak ada DSWx untuk 2016-2025."],
    }
    json.dump(ring, open(OUT_JSON, "w"), ensure_ascii=False, indent=1)
    print(json.dumps({k: ring[k] for k in ("v3_sama_dengan_v2", "status", "dswx_katalog_hari", "baris", "kab_hari_positif", "hasil")}, ensure_ascii=False))


# ------------------------------------------------------------------ uji
def uji():
    D = lambda s: dt.date.fromisoformat(s)
    r0 = lambda t, k, **kw: {**{c: "0" for c in KOL_V2}, "tanggal": t, "kunci": k, "prov": k.split("|")[0], "n_grup": "1", "keyakinan": "SEDANG", "episode": t, **kw}
    v2 = [r0("2026-11-03", "31|A", dibi="1"), r0("2026-11-03", "31|B", gs="1", n_grup="1", keyakinan="RENDAH"), r0("2026-11-20", "31|C", dibi="1")]
    # DSWx kosong -> v3 == v2
    out, st = terapkan(v2, {})
    assert [{c: r[c] for c in KOL_V2} for r in out] == v2 and st == {} and all(r["dswx"] == "0" for r in out)
    # beku: tidak menimpa; valid kecil / fraksi kecil / ha kecil bukan positif; kronis dibuang
    beku = {"31|A": {"2026-11-04": [900.0, 20000.0]}}
    op = {"di_atas_min_ha": {"31|A": {"2026-11-04": 123.0, "2026-11-05": 700.0}}, "kab_hari": {"31|A": {"2026-11-04": [20000.0, 1.0, 0.0], "2026-11-05": [20000.0, 1.0, 0.0]}}}
    assert gabung_beku(beku, op) == 1 and beku["31|A"]["2026-11-04"] == [900.0, 20000.0] and beku["31|A"]["2026-11-05"] == [700.0, 20000.0]
    pb = {"31|A": {f"2026-11-{d:02d}": [ha, v] for d, (ha, v) in enumerate([(150.0, 4000.0), (99.0, 20000.0), (100.0, 20000.0), (500.0, 20000.0), (150.0, 20000.0)], 1)}}
    pos, kr, amat = hari_positif(pb)
    assert pos == {"31|A": {D("2026-11-04"): 500.0}}, pos      # 4000 ha < valid min; 99 < 100; 100/20000 < 2%; 150/20000 < 2%
    assert amat == 4 and not kr
    kron = {"31|K": {f"2026-11-{d:02d}": [900.0, 20000.0] for d in range(1, 13)}}
    assert hari_positif(kron)[1] == {"31|K"} and hari_positif(kron)[0] == {}
    # cocok dengan v2 (RESMI + RADAR = TINGGI), selang +-1 hari; di luar selang jadi baris dswx_saja RENDAH
    out, st = terapkan(v2, {"31|A": {D("2026-11-04"): 500.0}, "31|B": {D("2026-11-03"): 300.0}, "31|C": {D("2026-11-25"): 400.0}, "31|X": {D("2026-11-01"): 250.0}})
    by = {(r["kunci"], r["tanggal"]): r for r in out}
    a = by[("31|A", "2026-11-03")]
    assert a["keyakinan"] == "TINGGI" and a["dswx"] == "1" and a["n_grup"] == "2" and a["dswx_saja"] == "0" and a["tinggi_tanpa_media"] == "1"
    b = by[("31|B", "2026-11-03")]
    assert b["keyakinan"] == "RENDAH" and b["dswx"] == "1" and b["dswx_saja"] == "0"       # media + radar tanpa RESMI tetap RENDAH
    assert by[("31|C", "2026-11-20")]["dswx"] == "0" and by[("31|C", "2026-11-25")]["dswx_saja"] == "1" and by[("31|C", "2026-11-25")]["keyakinan"] == "RENDAH"
    assert by[("31|X", "2026-11-01")]["dswx_saja"] == "1" and st == {"cocok": 2, "naik_ke_tinggi": 1, "dswx_saja": 2}, st
    assert len(out) == 5 and tingkat3({"dibi", "dswx"}) == "TINGGI" and tingkat3({"gs", "dswx"}) == "RENDAH" and tingkat3({"dswx"}) == "RENDAH"
    # v2 input tidak berubah, v2 tidak ditulis
    assert v2[0]["keyakinan"] == "SEDANG" and not OUT_KAB.startswith(os.path.dirname(V2.OUT_KAB) + os.sep)
    print("uji label_bersatu_v3: hijau")


if __name__ == "__main__":
    {"susun": susun, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
