"""Tahap 0 peta jalan model banjir: label bersatu, satu kolom per sumber di tabel kabupaten-hari. Luring, stdlib.

Sumber (dibaca, tidak ada yang diubah/dibangun ulang):
  lb_mulai / lb_aktif  logbook Pusdalops jenis banjir (data/pusdalops/logbook_kejadian.csv). Satu kejadian = SATU lb_mulai per kab
                       (tgl_kejadian, bila kosong pertama_dicatat); lb_aktif = mulai..terakhir_dicatat maks 30 hari (cara uji_logbook).
                       Rentang arsip 2011-2023 (2021 tidak ada, 2022 dan 2023 parsial; hanya 2014-2020 tahun penuh). Jenis bandang tak ada: 0.
                       tgl_kejadian kosong -> pertama_dicatat (dihitung, ditandai tanggal_dari_catat); |pertama_dicatat - tgl_kejadian|
                       > 180 hari -> tanggal_curiga, DIBUANG; tahun di luar 2011-2026 -> tanggal_tak_wajar, dibuang (tak dikoreksi otomatis).
                       Hari tercakup = hari yang punya berkas arsip (logbook_hari_tercakup.json): tanpa catatan di luar itu BUKAN negatif.
  dibi                 data/raw/banjir/dibi_tanggal.json (beku, hanya dibaca): jenis banjir/bandang, kejadian >= 1, tanggal laporan.
  gs, gs_n             Google Groundsource: poligon -> kecamatan (label_kec.petakan) -> kabupaten; gs_n = jumlah poligon hari itu.
  gfm, gfm_lintas      Copernicus GFM: gfm_nasional/label_kab_hari.csv (hanya lintasan yang sudah diproses = PILOT, bukan nasional).
  mcdwd                public/banjir/data/mcdwd.json (90 hari bergulir); nilai = piksel banjir f > 0. Cache arsip harian belum ada.
Kunci kabupaten 'pp|Nama' (nama geo, sama di semua sumber); kode DIBI/logbook tak dipakai, hanya nama (dinormalkan).
Keluaran: data/raw/banjir/label_bersatu/kab_hari.csv.gz (tak dilacak git), public/banjir/data/label_bersatu_ringkas.json (tanpa korban).
Pakai: python3 scripts/banjir/label_bersatu.py susun | uji
Label 2026 hanya dihitung cakupannya; tidak ada yang disetel di sini.
"""
import csv, datetime as dt, glob, gzip, json, os, re, sys, unicodedata
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
P = lambda *a: os.path.join(AKAR, *a)
CSV_LB, DIBI, MCDWD = P("data/pusdalops/logbook_kejadian.csv"), P("data/raw/banjir/dibi_tanggal.json"), P("public/banjir/data/mcdwd.json")
GFM = P("data/raw/banjir/gfm_nasional/label_kab_hari.csv")
OUT_CSV, OUT_JSON = P("data/raw/banjir/label_bersatu/kab_hari.csv.gz"), P("public/banjir/data/label_bersatu_ringkas.json")
MAKS_AKTIF, TOL, CURIGA = 30, 1, 180
OUT_HARI = P("data/raw/banjir/label_bersatu/logbook_hari_tercakup.json")
# tahun padat per sumber untuk silang (A dan B harus sama-sama padat): logbook tahun penuh, DIBI 2016-2025 (2026 belum terisi susulan),
# Groundsource 2016-2025, GFM tak ada (pilot), MCDWD hanya 2026.
PADAT = {"lb_mulai": set(range(2014, 2021)), "dibi": set(range(2016, 2026)), "gs": set(range(2016, 2026)), "gfm": set(), "mcdwd": {2026}}
SUMBER = ["lb_mulai", "lb_aktif", "dibi", "gs", "gfm", "mcdwd"]
SILANG_SUMBER = ["lb_mulai", "dibi", "gs", "gfm", "mcdwd"]   # lb_aktif turunan lb_mulai: tak masuk matriks silang
KOLOM = ["tanggal", "kab_kunci", "prov", "lb_mulai", "lb_aktif", "dibi", "gs", "gs_n", "gfm", "gfm_lintas", "mcdwd"]
JENIS_DIBI = {"banjir", "bandang"}


# ------------------------------------------------------------------ kunci nama
def norm(kunci):
    """'35|Kab. Bojonegoro' -> ('35', 'bojonegoro'); 'Kota X' tetap membawa 'kota' (kota != kabupaten senama)."""
    p, _, n = kunci.partition("|")
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode().lower().strip()
    n = re.sub(r"^kab(upaten|\.)?\s*", "", n)
    return p.strip(), re.sub(r"[^a-z0-9]", "", n)


class Kunci:
    """Alam semesta kunci kabupaten (nama geo). cocok(): persis, lalu normalisasi yang tak ambigu; selain itu None."""
    def __init__(self, semesta):
        self.semesta, self.idx = set(semesta), defaultdict(set)
        for k in self.semesta:
            self.idx[norm(k)].add(k)

    def cocok(self, kunci):
        if kunci in self.semesta:
            return kunci
        c = self.idx.get(norm(kunci), ())
        return next(iter(c)) if len(c) == 1 else None


def tgl(s):
    try:
        return dt.date.fromisoformat(s[:10])
    except (ValueError, TypeError):
        return None


# ------------------------------------------------------------------ pengurai sumber: masing-masing -> {kab: set(date)}
def dari_logbook(rows, K, tak, st=None):
    """-> (mulai, aktif, st). st = Counter: n_pasangan (kejadian-kab), tanpa_kab, tanggal_tak_wajar, tanggal_curiga, tanggal_dari_catat.
    Kejadian lintas kab dihitung sekali per kab; berhari-jamak tetap SATU lb_mulai."""
    mulai, aktif, st = defaultdict(set), defaultdict(set), st if st is not None else Counter()
    for r in rows:
        if r["jenis"] != "banjir":
            continue
        g, c = tgl(r["tgl_kejadian"]), tgl(r["pertama_dicatat"])
        a = g or c
        if not a or not 2011 <= a.year <= 2026:   # salah ketik tahun (mis. 2108): dibuang, tidak diperbaiki
            st["tanggal_tak_wajar"] += 1
            continue
        if g and c and abs((c - g).days) > CURIGA:
            st["tanggal_curiga"] += 1
            continue
        st["tanggal_dari_catat"] += not g
        t = tgl(r["terakhir_dicatat"])
        z = min(max(t, a), a + dt.timedelta(MAKS_AKTIF)) if t else a
        hari = {a + dt.timedelta(i) for i in range((z - a).days + 1)}
        ks = [x for x in r["kab_kode"].split("; ") if x]
        if not ks:
            st["tanpa_kab"] += 1
        for k0 in ks:
            k = K.cocok(k0)
            if not k:
                tak[k0] += 1
                continue
            st["n_pasangan"] += 1
            mulai[k].add(a)
            aktif[k] |= hari
    return mulai, aktif, st


def hari_tercakup():
    """-> {tahun: [tanggal]} hari yang punya berkas arsip logbook (tgl_logbook di baris.jsonl per tahun)."""
    out = {}
    for f in sorted(glob.glob(P("data/raw/logbook/arsip/20??/baris.jsonl"))):
        ds = sorted({json.loads(l)["tgl_logbook"][:10] for l in open(f, encoding="utf-8")})
        out[os.path.basename(os.path.dirname(f))] = ds
    return out


def dari_dibi(rows, K, tak):
    out = defaultdict(set)
    for jenis, prov, kab, tanggal, kej in rows:
        if not (JENIS_DIBI & set(jenis)) or kej < 1:
            continue
        d, k = tgl(tanggal), K.cocok(f"{prov}|{kab}")
        if not k:
            tak[f"{prov}|{kab}"] += 1
        elif d:
            out[k].add(d)
    return out


def dari_gs(events, K, tak):
    """events [{kec 'prov|kab|kec', d0}] -> ({kab: set(date)}, {(kab, date): n poligon})."""
    out, n = defaultdict(set), Counter()
    for e in events:
        d = tgl(e["d0"])
        k = K.cocok("|".join(e["kec"].split("|")[:2]))
        if not k:
            tak[e["kec"]] += 1
        elif d:
            out[k].add(d)
            n[(k, d)] += 1
    return out, n


def dari_gfm(rows, K, tak):
    """rows csv label_kab_hari -> (gfm positif {kab: set}, lintas {kab: set}). Positif = tergenang_ha > 0."""
    pos, lin = defaultdict(set), defaultdict(set)
    for r in rows:
        d, k = tgl(r["tanggal_lintasan"]), K.cocok(r["prov|kab"])
        if not k:
            tak[r["prov|kab"]] += 1
        elif d:
            lin[k].add(d)
            if float(r.get("tergenang_ha") or 0) > 0:
                pos[k].add(d)
    return pos, lin


def dari_mcdwd(m, K, tak):
    """-> ({kab: set(date)}, {(kab, date): piksel f}) untuk f > 0."""
    out, f = defaultdict(set), {}
    for k0, v in m["kab"].items():
        k = K.cocok(k0)
        if not k:
            tak[k0] += 1
            continue
        for h, x in zip(m["hari"], v["f"]):
            if x > 0:
                out[k].add(tgl(h))
                f[(k, tgl(h))] = x
    return out, f


# ------------------------------------------------------------------ gabung dan ringkas
def gabung(S, gs_n=None, mc_f=None, lintas=None):
    """S {sumber: {kab: set(date)}} -> baris dict kab-hari yang punya >= 1 sumber positif atau lintasan GFM."""
    lintas = lintas or {}
    sel = defaultdict(dict)
    for s in SUMBER:
        for k, hs in S.get(s, {}).items():
            for d in hs:
                sel[(d, k)][s] = 1
    for k, hs in lintas.items():
        for d in hs:
            sel[(d, k)]["gfm_lintas"] = 1
    rows = []
    for (d, k) in sorted(sel, key=lambda x: (x[0], x[1])):
        v = sel[(d, k)]
        rows.append({"tanggal": d.isoformat(), "kab_kunci": k, "prov": k.split("|")[0],
                     **{s: v.get(s, 0) for s in SUMBER if s != "mcdwd"},
                     "gs_n": (gs_n or {}).get((k, d), 0), "gfm_lintas": v.get("gfm_lintas", 0),
                     "mcdwd": (mc_f or {}).get((k, d), v.get("mcdwd", 0))})
    return rows


def cakupan(S, lintas):
    out = {}
    for s in SUMBER + ["gfm_lintas"]:
        src = lintas if s == "gfm_lintas" else S.get(s, {})
        th, kab = Counter(), defaultdict(set)
        for k, hs in src.items():
            for d in hs:
                th[d.year] += 1
                kab[d.year].add(k)
        out[s] = {str(y): {"kab_hari": th[y], "kab_unik": len(kab[y])} for y in sorted(th)}
    return out


def silang(S, lintas, tol=TOL, padat_tahun=None):
    """Untuk tiap pasangan (A, B): dari kab-hari positif A di jendela cakupan B (rentang tanggal B; GFM: hanya yang punya lintasan
    +-tol), berapa yang punya B positif dalam +-tol hari. -> {'A>B': {n_a, n_ada_b, persen}}. Tanpa sumber B BUKAN negatif: jendela
    B yang kosong memberi n_a = 0, bukan 0%."""
    def rentang(src):
        ds = [d for hs in src.values() for d in hs]
        return (min(ds), max(ds)) if ds else None
    def padat(src):
        return (padat_tahun or PADAT).get(src, set())
    def dekat(hs, d):
        return any(d + dt.timedelta(i) in hs for i in range(-tol, tol + 1))
    out = {}
    for a in SILANG_SUMBER:
        for b in SILANG_SUMBER:
            if a == b:
                continue
            ra, rb = rentang(S.get(a, {})), rentang(lintas if b == "gfm" else S.get(b, {}))
            if not ra or not rb:
                out[f"{a}>{b}"] = {"n_a": 0, "n_ada_b": 0, "persen": None}
                continue
            lo, hi = max(ra[0], rb[0]), min(ra[1], rb[1])
            na = nb = 0
            for k, hs in S[a].items():
                B, L = S[b].get(k, set()), lintas.get(k, set())
                for d in hs:
                    if not lo <= d <= hi or d.year not in padat(a) & padat(b) or (b == "gfm" and not dekat(L, d)):
                        continue
                    na += 1
                    nb += dekat(B, d)
            out[f"{a}>{b}"] = {"n_a": na, "n_ada_b": nb, "persen": round(100 * nb / na, 1) if na else None}
    return out


# ------------------------------------------------------------------ susun
def semesta():
    """Kunci kabupaten dari geo yang sama dengan label_kec dan mcdwd (kunci 'pp|Nama')."""
    import json as j
    k = set(j.load(open(MCDWD))["kab"])
    k |= {"|".join(x.split("|")[:2]) for x in j.load(open(P("data/raw/banjir/label_kec/label_kec.json")))["kec"]}
    return k


def susun():
    import label_kec as L
    K, tak = Kunci(semesta()), defaultdict(Counter)
    S = {}
    rows_lb = list(csv.DictReader(open(CSV_LB, encoding="utf-8")))
    S["lb_mulai"], S["lb_aktif"], st_lb = dari_logbook(rows_lb, K, tak["logbook"])
    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    hari = hari_tercakup()
    json.dump(sorted(d for ds in hari.values() for d in ds), open(OUT_HARI, "w"))
    S["dibi"] = dari_dibi(json.load(open(DIBI)), K, tak["dibi"])
    rows = json.load(gzip.open(L.POLI, "rt"))
    di_dalam, bag = L.muat_kec()
    ev, _ = L.petakan(rows, di_dalam, bag, L.indeks(bag))
    ev = [e for e in ev if e["d0"][:4].isdigit() and int(e["d0"][:4]) >= 2016]
    S["gs"], gs_n = dari_gs(ev, K, tak["gs"])
    S["gfm"], lintas = dari_gfm(csv.DictReader(open(GFM)), K, tak["gfm"])
    S["mcdwd"], mc_f = dari_mcdwd(json.load(open(MCDWD)), K, tak["mcdwd"])
    rows_out = gabung(S, gs_n, mc_f, lintas)
    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    with gzip.open(OUT_CSV, "wt", newline="") as g:
        w = csv.DictWriter(g, KOLOM)
        w.writeheader()
        w.writerows(rows_out)
    gs_th = Counter(int(e["d0"][:4]) for e in ev)
    ring = {
        "dibuat": dt.date.today().isoformat(),
        "satuan": "kabupaten-hari; kunci 'pp|Nama' dicocokkan lewat nama, bukan kode",
        "baris_tabel": len(rows_out),
        "sumber": {"lb": "logbook Pusdalops 2011-2023, jenis banjir (jenis bandang tidak ada: 0)", "dibi": "DIBI banjir+bandang, tanggal laporan, kejadian>=1",
                   "gs": "Google Groundsource 2016-2025 (+poligon 2026 bila ada), poligon -> kecamatan -> kabupaten",
                   "gfm": "Copernicus GFM: hanya lintasan yang sudah diproses (pilot, bukan nasional)",
                   "mcdwd": "MODIS MCDWD, hanya 90 hari terakhir di mcdwd.json; arsip harian 2021-2026 belum diunduh"},
        "logbook": {"rentang_arsip": "2011-2023 (2021 tidak ada; 2022 dan 2023 parsial; tahun penuh hanya 2014-2020)", "n_pasangan": st_lb["n_pasangan"],
                    "n_kab_hari_unik": sum(len(v) for v in S["lb_mulai"].values()), "tanpa_kab": st_lb["tanpa_kab"],
                    "tanggal_tak_wajar": st_lb["tanggal_tak_wajar"], "tanggal_curiga_dibuang": st_lb["tanggal_curiga"],
                    "tanggal_dari_catat": st_lb["tanggal_dari_catat"], "hari_tercakup_per_tahun": {y: len(d) for y, d in hari.items()},
                    "hari_tercakup_berkas": "data/raw/banjir/label_bersatu/logbook_hari_tercakup.json (tak dilacak git)"},
        "layak_label": {"lb_mulai": {"layak_label": True, "catatan": "hanya pada hari tercakup arsip; tanpa catatan BUKAN negatif"},
                        "dibi": {"layak_label": True, "catatan": "tanggal laporan, terisi susulan; 2026 belum lengkap"},
                        "gs": {"layak_label": True, "catatan": "bias media: tumbuh sekitar 5 kali 2016-2025, ke kota dan wilayah ber-media; tanpa label BUKAN negatif"},
                        "gfm": {"layak_label": False, "catatan": "pilot, hanya 34 kab-hari"},
                        "mcdwd": {"layak_label": False, "catatan": "tanpa arsip harian dan tanpa ambang (air menetap ikut)"}},
        "silang_tahun_padat": {k: sorted(v) for k, v in PADAT.items()},
        "cakupan_per_tahun": cakupan(S, lintas),
        "gs_poligon_per_tahun": {str(y): gs_th[y] for y in sorted(gs_th)},
        "silang_persen_toleransi_1_hari": silang(S, lintas),
        "kab_tak_cocok": {s: {"jumlah_baris": sum(c.values()), "kunci_unik": len(c), "contoh": [k for k, _ in c.most_common(8)]} for s, c in tak.items()},
        "catatan_bias": [
            "Groundsource tumbuh sekitar 5 kali dari 2016 ke 2025 dan berhenti 29 Jan 2026: beda laju antartahun sebagian artefak berita. Tanpa label BUKAN negatif.",
            "Logbook 2011-2023: 2011-2013 tipis, 2021 tak ada berkas, 2022 dan 2023 parsial; tanpa catatan BUKAN negatif.",
            "Silang hanya di tahun padat kedua sumber (lihat silang_tahun_padat). gs>lb_mulai rendah karena logbook tipis/tak ada di luar 2014-2020; mcdwd>dibi 0% karena DIBI 2026 belum terisi susulan, bukan karena MODIS salah.",
            "DIBI terisi susulan dan tanggalnya tanggal laporan.",
            "GFM di sini pilot (sedikit kab-hari); gfm_lintas membedakan 'tak ada banjir' dari 'tak teramati'.",
            "MCDWD tanpa arsip harian: hanya 2026; positif = piksel f > 0 TANPA ambang, kelas Recurring flood (air menetap) ikut sehingga kab-hari positifnya membengkak; butuh ambang sebelum dipakai, tutupan awan tak dinilai di kolom ini.",
            "Silang A>B = persen kab-hari positif A (di jendela tanggal B) yang punya B positif dalam +-1 hari; bukan presisi dan bukan recall terhadap kebenaran."],
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    json.dump(ring, open(OUT_JSON, "w"), ensure_ascii=False, indent=1)
    print(json.dumps({k: ring[k] for k in ("baris_tabel", "logbook", "kab_tak_cocok")}, ensure_ascii=False, indent=1))
    print(f"{OUT_CSV} {os.path.getsize(OUT_CSV) / 1e6:.1f} MB; {OUT_JSON} {os.path.getsize(OUT_JSON) / 1e3:.0f} KB")


# ------------------------------------------------------------------ uji
def uji():
    K = Kunci({"35|Bojonegoro", "32|Kota Bogor", "32|Bogor", "11|Aceh Barat"})
    assert K.cocok("35|Kab. Bojonegoro") == "35|Bojonegoro" and K.cocok("32|Kota Bogor") == "32|Kota Bogor"
    assert K.cocok("32|Bogor") == "32|Bogor" and K.cocok("99|Bogor") is None and K.cocok("11|Aceh  Barat") == "11|Aceh Barat"
    # kejadian logbook 5 hari = 1 lb_mulai, 5 hari aktif; lintas 2 kab; bukan banjir dan kab tak dikenal dilewati
    r = lambda j, a, z, kk: {"jenis": j, "tgl_kejadian": a, "pertama_dicatat": a, "terakhir_dicatat": z, "kab_kode": kk}
    tak = Counter()
    mulai, aktif, st = dari_logbook([r("banjir", "2020-01-01", "2020-01-05", "35|Bojonegoro; 11|Aceh Barat"), r("longsor", "2020-02-01", "2020-02-01", "35|Bojonegoro"),
                                    r("banjir", "2020-03-01", "2021-12-01", "32|Bogor"), r("banjir", "2020-04-01", "2020-04-01", "99|Hantu"), r("banjir", "2020-05-01", "2020-05-01", "")], K, tak)
    assert len(mulai["35|Bojonegoro"]) == 1 and len(aktif["35|Bojonegoro"]) == 5 and st["n_pasangan"] == 3
    assert st["tanggal_tak_wajar"] == 0
    s2 = dari_logbook([r("banjir", "2108-01-01", "2108-01-01", "32|Bogor"), {**r("banjir", "2015-01-01", "2015-01-02", "32|Bogor"), "pertama_dicatat": "2016-01-01"},
                       {**r("banjir", "", "2017-03-01", "32|Bogor"), "pertama_dicatat": "2017-03-01"}], K, Counter())
    assert s2[2]["tanggal_tak_wajar"] == 1 and s2[2]["tanggal_curiga"] == 1 and s2[2]["tanggal_dari_catat"] == 1 and s2[0]["32|Bogor"] == {dt.date(2017, 3, 1)}
    assert len(aktif["32|Bogor"]) == MAKS_AKTIF + 1 and tak["99|Hantu"] == 1 and st["tanpa_kab"] == 1
    # dibi: nama, bukan kode; jenis rob/cuaca dan kejadian 0 dibuang
    tk = Counter()
    d = dari_dibi([[["banjir"], "35", "Kab. Bojonegoro", "2020-01-02", 1], [["cuaca"], "35", "Bojonegoro", "2020-01-03", 1], [["banjir"], "35", "Bojonegoro", "2020-01-04", 0],
                   [["banjir", "longsor"], "88", "X", "2020-01-04", 1]], K, tk)
    assert d["35|Bojonegoro"] == {dt.date(2020, 1, 2)} and tk["88|X"] == 1
    S = {"lb_mulai": mulai, "dibi": d, "lb_aktif": aktif}
    # toleransi +-1 hari: lb 3 Jan vs dibi 2 Jan cocok; lb 10 Jan vs dibi 12 Jan tak
    sl = silang({"lb_mulai": {"k": {dt.date(2020, 1, 3), dt.date(2020, 1, 10)}}, "dibi": {"k": {dt.date(2020, 1, 2), dt.date(2020, 1, 12)}}}, {})
    assert sl["lb_mulai>dibi"] == {"n_a": 2, "n_ada_b": 1, "persen": 50.0}, sl["lb_mulai>dibi"]
    sl2 = silang({"lb_mulai": {"k": {dt.date(2020, 1, 5)}}, "dibi": {"k": {dt.date(2020, 1, 3), dt.date(2020, 1, 7)}}}, {})
    assert sl2["lb_mulai>dibi"]["n_a"] == 1 and sl2["lb_mulai>dibi"]["n_ada_b"] == 0 and sl2["lb_mulai>gs"]["persen"] is None
    # GFM: hanya hari berlintasan yang masuk penyebut; baris tabel: lintasan tanpa positif tetap ada
    g = {"gfm": {"k": {dt.date(2020, 6, 1)}}, "lb_mulai": {"k": {dt.date(2020, 6, 2), dt.date(2020, 9, 1)}}}
    lin = {"k": {dt.date(2020, 6, 1), dt.date(2020, 6, 8)}}
    s3 = silang(g, lin, padat_tahun={"lb_mulai": {2020}, "gfm": {2020}})["lb_mulai>gfm"]
    assert s3["n_a"] == 1 and s3["n_ada_b"] == 1, s3
    rows = gabung({"lb_mulai": {"k|X": {dt.date(2020, 6, 2)}}}, gs_n={}, mc_f=None, lintas={"k|X": {dt.date(2020, 6, 8)}})
    assert [(x["tanggal"], x["lb_mulai"], x["gfm_lintas"]) for x in rows] == [("2020-06-02", 1, 0), ("2020-06-08", 0, 1)]
    ga, gn = dari_gs([{"kec": "35|Bojonegoro|A", "d0": "2020-01-01"}, {"kec": "35|Bojonegoro|B", "d0": "2020-01-01"}], K, Counter())
    assert gn[("35|Bojonegoro", dt.date(2020, 1, 1))] == 2 and len(ga["35|Bojonegoro"]) == 1
    print("uji label_bersatu: hijau")


if __name__ == "__main__":
    {"susun": susun, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
