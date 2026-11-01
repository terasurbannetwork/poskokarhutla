"""Turunan publik logbook Pusdalops: kebutuhan/peralatan, jam rawan, pihak terlibat, desa langganan (agregat hitungan saja).

Masukan : data/raw/logbook/arsip/*/baris.jsonl (tidak di-git), public/data/logbook_riwayat.json (tahun_penuh)
Keluaran: public/data/bnpb/logbook_kebutuhan.json, logbook_jam.json, logbook_terlibat.json, desa_langganan/<kode_prov>.json,
          logbook_susulan.json (kejadian susulan sekab), logbook_omc.json (OMC vs titik panas; butuh data/raw/logbook/titik_kab_2025/2026.json)
Spesifikasi: docs/superpowers/specs/2026-11-01-logbook-turunan.md

Tidak ada teks bebas, nama orang, atau nama petugas yang keluar: hanya hitungan per kategori.
Satuan hitung = KEJADIAN (id_kejadian): kategori yang disebut di entri mana pun dihitung 1, bukan per entri update.
Tahun dasar = tahun_penuh (bulan >= 25 hari tercatat). Kebutuhan, pihak terlibat, dan desa memakai tahun dasar; jam memakai semua tahun.
Pakai: python3 scripts/data/logbook_turunan.py      python3 scripts/data/logbook_turunan.py uji
"""
import bisect, collections, datetime as dt, glob, json, os, random, re, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logbook_bersih as LB  # noqa: E402
import desa_terisolir as DT  # noqa: E402
import logbook_internal as LI  # noqa: E402  (kuantil, hari_antara, acara/mulai_tgl; LI memuat modul ini hanya lewat importlib di dalam fungsi)

AKAR = LB.AKAR
KELUAR = os.path.join(AKAR, "public/data/bnpb")

KEBUTUHAN = {
    "makanan": r"makan|pangan|sembako|beras|mi instan|mie|sarden|minyak goreng|gula|telur|lauk|nasi|roti|konsumsi|dapur umum|logistik pangan|susu",
    "air_bersih": r"air (bersih|minum|mineral|isi ulang|kemasan)|galon|penjernih|water treatment|sumur bor|tandon",
    "tenda_terpal": r"tenda|terpal|tarpaulin|shelter|huntara|hunian sementara",
    "selimut_tikar_kasur": r"selimut|tikar|kasur|matras|alas tidur|bantal|sleeping bag|velbed|kelambu",
    "pakaian": r"pakaian|baju|sandang|sarung|celana|jaket|seragam|kain",
    "obat_kesehatan": r"obat|medis|kesehatan|p3k|vitamin|dokter|paramedis|ambulan|oksigen|alkes|antiseptik|desinfektan|disinfektan|nakes",
    "bayi_anak": r"\banak\b|anak-anak|bayi|balita|popok|pampers|mpasi|susu formula",
    "perlengkapan_mandi": r"sabun|sikat gigi|pasta gigi|odol|handuk|sanitasi|hygiene|higiene|pembalut|perlengkapan mandi|\bmck\b|toilet|sampo|deterjen",
    "masker": r"masker|respirator|\bn95\b",
    "karung_pasir": r"karung|sandbag|pasir",
    "material_bangunan": r"material|bangunan|semen|\bseng\b|kayu|paku|bambu|bronjong|gorong|papan|triplek|genting|atap|besi",
}
PERALATAN = {
    "perahu": r"perahu|rubber boat|speedboat|speed boat|kapal|sampan|ketinting|\bboat\b",
    "pompa": r"pompa|mesin air|selang",
    "alat_berat": r"alat berat|excavator|ekskavator|\bbeko\b|backhoe|buldoser|bulldozer|\bloader\b|dump truck|dumptruck|crane|grader",
    "mobil_tangki_air": r"mobil tangki|tangki air|truk tangki|water tank|water truck|mobil air|armada air",
    "genset": r"genset|generator",
    "gergaji_mesin": r"gergaji mesin|chainsaw|chain saw|senso",
    "alat_komunikasi": r"komunikasi|radio|handy talkie|\bht\b|repeater|starlink|\brig\b",
}
# kategori tidak saling meniadakan: satu teks bisa memuat beberapa
PIHAK = {
    "BPBD": r"bpbd|bpbk|bpbp|badan penanggulangan bencana|pusdalops|bnpb",
    "TNI": r"\btni\b|kodim|koramil|korem|kodam|yonif|lanud|lanal|babinsa|kostrad|marinir|batalyon",
    "Polri": r"polri|polisi|polres|polsek|polda|kepolisian|brimob|babinkamtibmas|satlantas",
    "Basarnas": r"basarnas|badan sar|kantor sar|basarda|\bsar nasional",
    "PMI": r"\bpmi\b|palang merah",
    "Tagana/Dinsos": r"tagana|dinsos|dinas sosial|kemensos|kementerian sosial",
    "relawan/ormas": r"relawan|ormas|karang taruna|komunitas|mdmc|baznas|pramuka|\bksr\b|banser|muhammadiyah|bagana|\blsm\b|orari|\brapi\b|\bfpi\b",
    "dunia usaha": r"\bpt\.?\s|\bcv\b|perusahaan|\bcsr\b|swasta|pertamina|\bpln\b|perkebunan|astra|\bhti\b",
    "K/L lain": r"kementerian|kemen[a-z]+|bmkg|klhk|kehutanan|manggala agni|bksda|bbksda|\bbnn\b|perhutani|\bbig\b|\bbrin\b",
    "pemda lain": r"pemda|pemkab|pemkot|pemprov|camat|kecamatan|kelurahan|lurah|\bdesa\b|kades|pemdes|bupati|walikota|wali kota|gubernur|satpol|damkar|pemadam|dinas (?!sosial)|dinkes|dishub|puskesmas|rsud|\bpu\b|pupr",
}
NIHIL = {"nihil", "-", "--", "tidak ada", "nil", "belum ada", "n/a", "na", "tidak ada kebutuhan", "nihil."}
_RE = {}


def _comp(d):
    return {k: re.compile(v, re.I) for k, v in d.items()}


RE_KEB, RE_ALAT, RE_PIHAK = _comp(KEBUTUHAN), _comp(PERALATAN), _comp(PIHAK)


def berisi(t):
    """teks ada isinya (bukan kosong/nihil)."""
    t = " ".join(str(t or "").lower().split()).strip(" .;:-")
    return bool(t) and t not in NIHIL and not t.startswith("nihil")


def kategori(teks, kamus):
    """himpunan kategori yang cocok kamus kata kunci; teks nihil -> kosong."""
    return {k for k, r in kamus.items() if r.search(teks)} if berisi(teks) else set()


def potong_alat(t):
    """kolom peralatan sering memuat sisa 'Kendala dan Upaya: ...' dari laporan yang tak terpisah; buang dari situ."""
    return re.split(r"kendala dan upaya|\bkendala\b", str(t or ""), 1, flags=re.I)[0]


def jam_int(s):
    """'15:30' / '15.30' / '1530' -> 15; selain itu None."""
    m = re.fullmatch(r"\s*([01]?\d|2[0-3])\s*[:.]?\s*([0-5]\d)?\s*(wib|wita|wit)?\s*", str(s or ""), re.I)
    return int(m.group(1)) if m else None


def tgl_ok(s):
    return bool(s) and re.fullmatch(r"\d{4}-\d\d-\d\d", str(s)) is not None


def kumpul(baris, kode):
    """baris (iterable dict) -> {id: kejadian} dengan medan teragregasi per kejadian. kode(r) -> [kab_kode]."""
    ev = {}
    for r in baris:
        e = ev.get(r["id_kejadian"])
        if e is None:
            e = ev[r["id_kejadian"]] = {"jenis": r["jenis"], "tgl": set(), "tglb": set(), "jam": None, "jam_ada": False,
                                        "kab": set(), "prov": set(), "keb": set(), "alat": set(), "pihak": set(), "pihak_s": set(),
                                        "keb_isi": False, "alat_isi": False, "pihak_dari_sumber": False, "pihak_isi": False, "pihak_t": False,
                                        "desa": set()}
        if tgl_ok(r.get("tgl_kejadian")):
            e["tgl"].add(r["tgl_kejadian"])
        if tgl_ok(r.get("tgl_logbook")):
            e["tglb"].add(r["tgl_logbook"])
        if e["jam"] is None:
            j = jam_int(r.get("jam_kejadian"))
            if j is not None:
                e["jam"] = j
            elif str(r.get("jam_kejadian") or "").strip():
                e["jam_ada"] = True  # ada isi tapi tak terbaca
        kk = kode(r)
        e["kab"].update(kk)
        e["prov"].update(r.get("prov_kode") or [])
        if berisi(r.get("kebutuhan")):
            e["keb_isi"] = True
            e["keb"] |= kategori(r["kebutuhan"], RE_KEB)
        a = potong_alat(r.get("peralatan"))
        if berisi(a):
            e["alat_isi"] = True
            e["alat"] |= kategori(a, RE_ALAT)
        if berisi(r.get("terlibat")):
            e["pihak_isi"] = True
            e["pihak"] |= kategori(r["terlibat"], RE_PIHAK)
            e["pihak_t"] = True
        elif r.get("sumber_instansi"):
            s = "; ".join(r["sumber_instansi"]) if isinstance(r["sumber_instansi"], list) else str(r["sumber_instansi"])
            c = kategori(s, RE_PIHAK)
            e["pihak_s"] |= c
        if len(kk) == 1:
            for kec, d in DT.pasangan(r):
                e["desa"].add((kk[0], kec, d))
    for e in ev.values():
        if not e["pihak_t"] and e["pihak_s"]:  # sumber_instansi hanya bila tak satu entri pun mengisi 'terlibat'
            e["pihak"], e["pihak_isi"], e["pihak_dari_sumber"] = e["pihak_s"], True, True
        e["t"] = min(e["tgl"]) if e["tgl"] else (min(e["tglb"]) if e["tglb"] else None)
    return ev


def _kab_bulan(ev, tahun, kunci):
    """{jenis: {kab: {kat: [12]}}} per kejadian di tahun dasar."""
    out = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 12)))
    for e in ev.values():
        if e["t"] and e["t"][:4] in tahun:
            for kab in e["kab"]:
                for k in e[kunci]:
                    out[e["jenis"]][kab][k][int(e["t"][5:7]) - 1] += 1
    return out


def susun_kebutuhan(ev, tahun):
    jenis = collections.defaultdict(lambda: {"n_kejadian": 0, "n_kejadian_berisi": 0, "n_terkategori": 0,
                                             "alat_berisi": 0, "alat_terkategori": 0,
                                             "nasional": collections.Counter(), "alat_nasional": collections.Counter()})
    dasar = {i: e for i, e in ev.items() if e["t"] and e["t"][:4] in tahun}
    for e in dasar.values():
        j = jenis[e["jenis"]]
        j["n_kejadian"] += 1
        j["n_kejadian_berisi"] += e["keb_isi"]
        j["n_terkategori"] += bool(e["keb"])
        j["alat_berisi"] += e["alat_isi"]
        j["alat_terkategori"] += bool(e["alat"])
        j["nasional"].update(e["keb"])
        j["alat_nasional"].update(e["alat"])
    pen = collections.defaultdict(lambda: collections.defaultdict(lambda: {k: [0] * 12 for k in ("n_kejadian", "n_kejadian_berisi", "n_terkategori", "n_alat_berisi")}))
    for e in dasar.values():
        for kab in e["kab"]:
            x, m = pen[e["jenis"]][kab], int(e["t"][5:7]) - 1
            x["n_kejadian"][m] += 1
            x["n_kejadian_berisi"][m] += e["keb_isi"]
            x["n_terkategori"][m] += bool(e["keb"])
            x["n_alat_berisi"][m] += e["alat_isi"]
    kb, ab = _kab_bulan(dasar, tahun, "keb"), _kab_bulan(dasar, tahun, "alat")
    pb = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 12)))
    for e in dasar.values():
        m = int(e["t"][5:7]) - 1
        for p in e["prov"]:
            x = pb[e["jenis"]][p]
            x["n_kejadian"][m] += 1
            x["n_berisi"][m] += e["keb_isi"]
            x["n_alat_berisi"][m] += e["alat_isi"]
            for c in e["keb"] | e["alat"]:
                x[c][m] += 1
    ny = len(tahun)
    res = {}
    for jn, j in sorted(jenis.items()):
        res[jn] = dict(j, nasional=dict(j["nasional"].most_common()), alat_nasional=dict(j["alat_nasional"].most_common()),
                       kab={k: {c: v for c, v in sorted(d.items())} for k, d in sorted(kb[jn].items())},
                       kab_berisi=dict(sorted(pen[jn].items())),
                       alat_kab={k: {c: v for c, v in sorted(d.items())} for k, d in sorted(ab[jn].items())},
                       prov_bulan={p: {c: [round(v / ny, 2) for v in vs] for c, vs in sorted(d.items())} for p, d in sorted(pb[jn].items())})
    return res


def susun_jam(ev):
    nas = collections.defaultdict(lambda: [0] * 24)
    prov = collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 24))
    buang = collections.defaultdict(lambda: {"n_kejadian": 0, "terpakai": 0, "kosong": 0, "tak_terbaca": 0})
    for e in ev.values():
        b = buang[e["jenis"]]
        b["n_kejadian"] += 1
        if e["jam"] is None:
            b["tak_terbaca" if e["jam_ada"] else "kosong"] += 1
            continue
        b["terpakai"] += 1
        nas[e["jenis"]][e["jam"]] += 1
        for p in e["prov"]:
            prov[e["jenis"]][p][e["jam"]] += 1
    return {j: {"terbuang": buang[j], "nasional": nas[j], "prov": {p: v for p, v in sorted(prov[j].items())}} for j in sorted(buang)}


def susun_terlibat(ev, tahun):
    res = collections.defaultdict(lambda: {"n_kejadian": 0, "n_kejadian_berisi": 0, "n_dari_sumber_instansi": 0,
                                           "nasional": collections.Counter(), "kab": collections.defaultdict(lambda: {"n": 0, "k": collections.Counter()})})
    for e in ev.values():
        if not (e["t"] and e["t"][:4] in tahun):
            continue
        j = res[e["jenis"]]
        j["n_kejadian"] += 1
        j["n_kejadian_berisi"] += e["pihak_isi"]
        j["n_dari_sumber_instansi"] += e["pihak_dari_sumber"]
        j["nasional"].update(e["pihak"])
        for kab in e["kab"]:
            j["kab"][kab]["n"] += 1
            j["kab"][kab]["k"].update(e["pihak"])
    return {jn: dict(j, nasional=dict(j["nasional"].most_common()),
                     kab={k: {"n": v["n"], "k": dict(v["k"].most_common())} for k, v in sorted(j["kab"].items())})
            for jn, j in sorted(res.items())}


def susun_desa(ev, tahun, minimal=2):
    """{kode_prov: [{kab, kec, desa, jenis: {j: {n, t, b[12]}}}]}; desa-jenis < minimal kejadian dibuang."""
    g = collections.defaultdict(lambda: collections.defaultdict(lambda: {"id": 0, "thn": set(), "bln": [set() for _ in range(12)], "nama": collections.Counter()}))
    for i, e in ev.items():
        if not (e["t"] and e["t"][:4] in tahun):
            continue
        y, m = e["t"][:4], int(e["t"][5:7]) - 1
        for kab, kec, d in e["desa"]:
            x = g[(kab, kec.lower(), d.lower())][e["jenis"]]
            x["id"] += 1
            x["thn"].add(y)
            x["bln"][m].add(y)
            x["nama"][(kec, d)] += 1
    out = collections.defaultdict(list)
    for (kab, _, _), per in g.items():
        jenis = {j: {"n": x["id"], "t": len(x["thn"]), "b": [len(s) for s in x["bln"]]} for j, x in sorted(per.items()) if x["id"] >= minimal}
        if jenis:
            kec, d = collections.Counter(n for x in per.values() for n in x["nama"].elements()).most_common(1)[0][0]
            out[kab.split("|")[0]].append({"kab": kab, "kec": kec, "desa": d, "jenis": jenis})
    for v in out.values():
        v.sort(key=lambda r: (r["kab"], r["kec"], r["desa"]))
    return out


# ---- C: kejadian susulan sekab ----
PASANGAN = [("banjir", "longsor"), ("cuaca", "banjir"), ("cuaca", "longsor"), ("banjir", "banjir"), ("gempabumi", "longsor")]
JENDELA = 3          # hari setelah pemicu
MIN_PEMICU = 10      # per kab


BOOT_REP = 500
BOOT_SEED = 20261101
MIN_K_KAB = 5        # per kab: k susulan minimal selain n >= MIN_PEMICU


def persentil(xs, p):
    xs = sorted(xs)
    i = (len(xs) - 1) * p
    a = int(i)
    return xs[a] + (xs[min(a + 1, len(xs) - 1)] - xs[a]) * (i - a)


def susun_susulan(acara, tahun):
    """acara = {id: {jenis, mulai, kabs}} (LI.acara). Pemicu A di (kab, tanggal d): susulan bila ada kejadian B di kab yang sama pada d+1..d+3
    (blok utama, semua pasangan). hari0 = B di kab yang sama pada hari d itu juga (jenis beda saja; sebagian satu laporan 'banjir dan longsor').
    Pembanding = peluang jendela d+1..d+3 jatuh pada hari acak di kab dan bulan-dalam-tahun yang sama (tahun dasar). Satuan = (kejadian, kab).
    lift = laju / rata-rata pembanding atas pemicu. ci95 = bootstrap blok kab-tahun (BOOT_REP ulangan, benih tetap) atas pemicu; pembanding tiap pemicu dianggap tetap."""
    D = dt.date.fromisoformat
    sah = lambda o: str(dt.date.fromordinal(o).year) in tahun and str(dt.date.fromordinal(o + JENDELA).year) in tahun
    hari_sah = collections.Counter()           # bulan -> hari sah (d dan d+3 sama-sama di tahun dasar)
    for y in tahun:
        for o in range(dt.date(int(y), 1, 1).toordinal(), dt.date(int(y), 12, 31).toordinal() + 1):
            if sah(o):
                hari_sah[dt.date.fromordinal(o).month] += 1
    tgl = collections.defaultdict(list)        # (kab, jenis) -> ordinal terurut
    pem = collections.defaultdict(list)        # jenis -> [(ordinal, kab)] yang sah dipakai sebagai pemicu
    for e in acara.values():
        if e["mulai"][:4] not in tahun:
            continue
        o = D(e["mulai"]).toordinal()
        for kb in e["kabs"]:
            tgl[(kb, e["jenis"])].append(o)
            if sah(o):
                pem[e["jenis"]].append((o, kb))
    for v in tgl.values():
        v.sort()
    dasar = {}

    def laju_dasar(kb, B):
        """peluang per bulan-dalam-tahun bahwa jendela d+1..d+3 dari hari acak memuat >=1 kejadian B di kab."""
        if (kb, B) not in dasar:
            hit = {d for b in tgl.get((kb, B), ()) for d in range(b - JENDELA, b) if sah(d)}
            c = collections.Counter(dt.date.fromordinal(d).month for d in hit)
            dasar[(kb, B)] = {m: c[m] / hari_sah[m] for m in range(1, 13)}
        return dasar[(kb, B)]

    def ci(units):
        """units = [[n, k, ex], ...] (kab-tahun); persentil 2,5/97,5 lift dari resampel dengan pengembalian."""
        rng, lifts = random.Random(BOOT_SEED), []
        for _ in range(BOOT_REP):
            t = [0, 0, 0.0]
            for u in rng.choices(units, k=len(units)):
                t[0] += u[0]; t[1] += u[1]; t[2] += u[2]
            if t[2] > 0:
                lifts.append(t[1] / t[2])
        return [round(persentil(lifts, .025), 2), round(persentil(lifts, .975), 2)] if len(lifts) >= BOOT_REP // 2 else None

    def baris(n, k, ex, units, k0=None):
        r = {"n": n, "k": k, "laju": round(k / n, 3), "dasar": round(ex / n, 3),
             "lift": round(k / ex, 2) if ex > 0 else None, "ci95": ci(units) if ex > 0 and len(units) > 1 else None}
        if k0 is not None:
            r["hari0"] = {"n": n, "k": k0, "laju": round(k0 / n, 3)}
        return r
    out = {}
    for A, B in PASANGAN:
        beda = A != B
        per = collections.defaultdict(lambda: [0, 0, 0.0, 0])      # kab -> n, k, sum dasar, k0
        unit = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0, 0.0]))   # kab -> tahun -> n, k, ex
        for o, kb in pem[A]:
            L = tgl.get((kb, B), [])
            i = bisect.bisect_left(L, o + 1)
            hit = i < len(L) and L[i] <= o + JENDELA
            ex = laju_dasar(kb, B)[dt.date.fromordinal(o).month]
            x, u = per[kb], unit[kb][dt.date.fromordinal(o).year]
            x[0] += 1; x[1] += hit; x[2] += ex; x[3] += beda and (bisect.bisect_left(L, o) < len(L) and L[bisect.bisect_left(L, o)] == o)
            u[0] += 1; u[1] += hit; u[2] += ex
        n, k, ex, k0 = (sum(v[i] for v in per.values()) for i in range(4))
        allu = [u for d in unit.values() for u in d.values()]
        out[f"{A}>{B}"] = {"pemicu": A, "susulan": B,
                           "nasional": baris(n, k, ex, allu, k0 if beda else None) if n else None,
                           "kab": {kb: baris(v[0], v[1], v[2], list(unit[kb].values()), v[3] if beda else None)
                                   for kb, v in sorted(per.items()) if v[0] >= MIN_PEMICU and v[1] >= MIN_K_KAB}}
    return out


# ---- D: OMC dan titik panas ----
RE_OMC_KARHUTLA = re.compile(r"kebakaran hutan|karhutla|kebakaran lahan|hutan dan lahan|gambut|titik panas|hotspot")
RE_OMC_HUJAN = re.compile(r"banjir|hidrometeorologi|longsor|cuaca ekstrem|mitigasi bencana|curah hujan (tinggi|lebat|ekstrem)")
SEBELUM = SESUDAH = 7
TITIK_TAHUN = (2025, 2026)


def tujuan_omc(teks):
    """karhutla bila teks menyebut kebakaran hutan/lahan (menang atas hujan: pernyataan tujuan resmi); hujan_banjir bila hanya penanda hidrometeorologi; selain itu tidak_jelas."""
    t = " ".join(str(teks or "").lower().split())
    return "karhutla" if RE_OMC_KARHUTLA.search(t) else "hujan_banjir" if RE_OMC_HUJAN.search(t) else "tidak_jelas"


def muat_titik():
    """-> ({prov2: {tgl: jumlah}}, hari_terakhir_data) dari cache titik_kab_Y.json (uji_logbook_karhutla.titik_tahun); ({}, None) bila tak ada."""
    per, akhir = collections.defaultdict(collections.Counter), None
    for y in TITIK_TAHUN:
        p = os.path.join(AKAR, f"data/raw/logbook/titik_kab_{y}.json")
        if not os.path.exists(p):
            return {}, None
        for kk, hh in json.load(open(p, encoding="utf-8"))["hari"].items():
            for d, n in hh.items():
                per[kk.split("|")[0]][d] += n
                akhir = max(akhir or d, d)
    return per, akhir


def _hit(titik, provs, d0, d1):
    return sum(titik[p].get((d0 + dt.timedelta(i)).isoformat(), 0) for p in provs for i in range((d1 - d0).days + 1))


def _geser_tahun(d, y):
    try:
        return d.replace(year=y)
    except ValueError:      # 29 Feb
        return d.replace(year=y, day=28)


def bandingkan(provs, mulai, selesai, titik, akhir):
    """titik panas di provinsi 7 hari sebelum, selama, 7 hari sesudah; None bila data titik tak menjangkau jendela.
    pembanding_tahun_lain = rata-rata per hari pada jendela kalender yang sama di tahun lain yang tercakup data (musim, bukan efek OMC)."""
    D = dt.date.fromisoformat
    if not titik or akhir is None or mulai < "2025-01-08" or selesai > (D(akhir) - dt.timedelta(SESUDAH)).isoformat():
        return None
    a, b = D(mulai), D(selesai)
    hit = lambda d0, d1: _hit(titik, provs, d0, d1)
    sb, ss, sa = hit(a - dt.timedelta(SEBELUM), a - dt.timedelta(1)), hit(a, b), hit(b + dt.timedelta(1), b + dt.timedelta(SESUDAH))
    hs = (b - a).days + 1
    lain = []
    for y in TITIK_TAHUN:
        if y == a.year:
            continue
        a2, b2 = _geser_tahun(a, y), _geser_tahun(b, y)
        if a2 - dt.timedelta(SEBELUM) >= dt.date(TITIK_TAHUN[0], 1, 1) and b2 + dt.timedelta(SESUDAH) <= D(akhir):
            h2 = (b2 - a2).days + 1
            lain.append({"tahun": y, "per_hari": {"sebelum": round(hit(a2 - dt.timedelta(SEBELUM), a2 - dt.timedelta(1)) / SEBELUM, 1),
                                                   "saat": round(hit(a2, b2) / h2, 1),
                                                   "sesudah": round(hit(b2 + dt.timedelta(1), b2 + dt.timedelta(SESUDAH)) / SESUDAH, 1)}})
    return {"hari_saat": hs, "sebelum": sb, "saat": ss, "sesudah": sa,
            "per_hari": {"sebelum": round(sb / SEBELUM, 1), "saat": round(ss / hs, 1), "sesudah": round(sa / SESUDAH, 1)},
            "pembanding_tahun_lain": lain}


def henti_catat(baris_omc, min_baris=3):
    """hari terakhir yang masih ramai (>= min_baris baris OMC bertanggal sah); catatan sesudahnya (mis. satu baris susulan) dianggap sisa."""
    c = collections.Counter(b.get("tgl_logbook") for b in baris_omc if LI.hari_antara(b.get("tgl_logbook"), b.get("tgl_logbook")) == 0)
    ramai = [t for t, n in c.items() if n >= min_baris]
    return max(ramai) if ramai else None


def susun_omc(kejadian, baris_omc, titik, akhir, gap=3):
    """kejadian: iterable kejadian.jsonl; baris_omc: baris jenis omc (untuk teks tujuan). -> {kejadian: [...], operasi: [...]}.
    operasi = kejadian OMC tujuan sama di provinsi sama yang berjarak <= gap hari digabung (satu operasi sering dicatat per hari)."""
    D = dt.date.fromisoformat
    baris_omc = list(baris_omc)
    henti = henti_catat(baris_omc)
    ambang = (D(henti) - dt.timedelta(SEBELUM)).isoformat() if henti else None
    potong = lambda sel: bool(ambang) and sel >= ambang
    teks, tg = collections.defaultdict(str), collections.defaultdict(list)
    for b in baris_omc:
        teks[b["id_kejadian"]] += " " + " ".join(str(b.get(f) or "") for f in ("catatan", "dampak_teks", "kronologi", "upaya", "kondisi"))
        tg[b["id_kejadian"]].append(b.get("tgl_logbook"))
    ev = []
    for k in kejadian:
        # baris salah urai (jenis_teks bukan 'Operasi Modifikasi Cuaca') dan kejadian tanpa baris bertanggal dibuang
        tgs = [t for t in tg.get(k["id_kejadian"], ()) if LI.hari_antara(t, t) == 0]
        if k.get("jenis") != "omc" or "modifikasi cuaca" not in str(k.get("jenis_teks") or "").lower() or not tgs:
            continue
        mulai = min(tgs + [m for m in [LI.mulai_tgl(k)] if m])
        akhir_k = max(k.get("terakhir_dicatat") or mulai, mulai)
        provs = sorted(set(k.get("prov_kode") or []))
        tj = tujuan_omc(teks[k["id_kejadian"]])
        ev.append({"id": k["id_kejadian"], "prov": provs, "nama_prov": list(k.get("prov") or []), "mulai": mulai, "selesai": akhir_k, "hari": (D(akhir_k) - D(mulai)).days + 1,
                   "tujuan": tj, "terpotong": potong(akhir_k),
                   "titik_panas": bandingkan(provs, mulai, akhir_k, titik, akhir) if tj == "karhutla" and not potong(akhir_k) else None})
    ev.sort(key=lambda e: (e["mulai"], e["id"]))
    # operasi: gabung per (provinsi, tujuan)
    ops, buka = [], {}
    for e in ev:
        for p in e["prov"]:
            kk = (p, e["tujuan"])
            o = buka.get(kk)
            if o and (D(e["mulai"]) - D(o["selesai"])).days <= gap:
                o["selesai"] = max(o["selesai"], e["selesai"])
                o["n_kejadian"] += 1
            else:
                o = buka[kk] = {"prov": p, "tujuan": e["tujuan"], "mulai": e["mulai"], "selesai": e["selesai"], "n_kejadian": 1}
                ops.append(o)
    for o in ops:
        o["hari"] = (D(o["selesai"]) - D(o["mulai"])).days + 1
        o["terpotong"] = potong(o["selesai"])
        o["titik_panas"] = bandingkan([o["prov"]], o["mulai"], o["selesai"], titik, akhir) if o["tujuan"] == "karhutla" and not o["terpotong"] else None
    return {"henti_catat": henti, "kejadian": ev, "operasi": ops}


def kode_cache():
    c = {}

    def kode(r):
        k = (tuple(r.get("kabkota") or []), tuple(r.get("prov_kode") or []))
        if k not in c:
            c[k] = LB.kode_kab({"kabkota": list(k[0]), "prov_kode": list(k[1])})
        return c[k]
    return kode


def tulis(nama, obj):
    p = os.path.join(KELUAR, nama)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as o:
        json.dump(obj, o, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(p)


def main():
    riw = json.load(open(os.path.join(AKAR, "public/data/logbook_riwayat.json"), encoding="utf-8"))
    tahun = set(riw["tahun_penuh"])
    berkas = sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/*/baris.jsonl")))

    omc_baris = []

    def baca():
        for b in berkas:
            with open(b, encoding="utf-8") as f:
                for l in f:
                    r = json.loads(l)
                    if r["jenis"] == "omc":
                        omc_baris.append(r)
                    yield r
    ev = kumpul(baca(), kode_cache())
    dibuat = datetime.now(timezone.utc).isoformat(timespec="seconds")
    sumber = f"Logbook harian Pusdalops BNPB, arsip {len(berkas)} berkas ({min(ev[i]['t'] for i in ev if ev[i]['t'])[:4]}-{max(ev[i]['t'] for i in ev if ev[i]['t'])[:4]}); tahun dasar {', '.join(sorted(tahun))}"
    dasar = {"dibuat": dibuat, "sumber": sumber, "tahun_dasar": sorted(tahun)}
    umum = ("Satuan = kejadian (id_kejadian), bukan entri update; satu kejadian lintas kab dihitung di tiap kab. Ini LAPORAN Pusdalops, bukan "
            "kejadian sebenarnya: kejadian yang tak dilaporkan tidak ada. Kategori dari kata kunci pada teks bebas, jadi bisa kurang atau lebih; "
            "satu teks bisa memuat beberapa kategori. Tidak ada teks asli, nama, atau angka korban.")
    ukuran = {}

    keb = susun_kebutuhan(ev, tahun)
    kebutuhan_catatan_pb = ("prov_bulan[kode_prov2][kunci] = 12 bulan (indeks 0 = Jan), RATA-RATA per tahun dasar (hitungan / n_tahun_dasar) kejadian berkategori itu. "
        "Kunci: n_kejadian (semua), n_berisi (kolom kebutuhan terisi), n_alat_berisi, lalu kategori kebutuhan dan peralatan. Kategori hanya terlihat pada kejadian yang kolomnya terisi, "
        "jadi untuk perkiraan stok: bagi kategori dengan n_berisi (atau n_alat_berisi) lalu kalikan n_kejadian; itu mengandaikan kejadian yang tak mengisi kolom sama kebutuhannya, dan belum tentu benar. "
        "Perkiraan kasar dari laporan, bukan stok yang harus disiapkan.")
    ukuran["logbook_kebutuhan.json"] = tulis("logbook_kebutuhan.json", dict(dasar, catatan=umum + " Kebutuhan: kolom 'kebutuhan' (kategori: " + ", ".join(KEBUTUHAN) + "); "
        "peralatan: kolom 'peralatan' dipotong pada 'Kendala' (sisa laporan), kategori: " + ", ".join(PERALATAN) + ". Teks 'nihil' dan kosong diabaikan. "
        "Persentase jujur = n_terkategori / n_kejadian_berisi (kebutuhan) atau alat_terkategori / alat_berisi; n_kejadian_berisi jauh lebih kecil dari n_kejadian "
        "karena kolom ini jarang diisi. kab_berisi[kode] = {n_kejadian, n_kejadian_berisi, n_terkategori, n_alat_berisi}, masing-masing 12 bulan: persen kebutuhan per kab = sum(kab[kode][kat]) / sum(n_kejadian_berisi). kab[kode][kategori] = 12 bulan (indeks 0 = Jan), dijumlah di seluruh tahun dasar.", n_tahun_dasar=len(tahun), catatan_prov_bulan=kebutuhan_catatan_pb, jenis=keb))
    jam = susun_jam(ev)
    ukuran["logbook_jam.json"] = tulis("logbook_jam.json", dict(dasar, catatan=umum + " Jam = jam_kejadian apa adanya (waktu setempat sesuai zona laporan, 0-23), "
        "semua tahun arsip (bukan hanya tahun dasar). Kejadian tanpa jam atau jam tak terbaca dibuang (lihat terbuang per jenis). Jam bulat (mis. 00:00, 12:00) "
        "bisa jadi isian bawaan petugas; baca puncak dengan hati-hati. prov[kode_prov] = 24 kotak.", jenis=jam))
    ter = susun_terlibat(ev, tahun)
    ukuran["logbook_terlibat.json"] = tulis("logbook_terlibat.json", dict(dasar, catatan=umum + " Pihak: kolom 'terlibat'; bila kosong dipakai 'sumber_instansi' "
        "(hitungannya di n_dari_sumber_instansi, hampir selalu BPBD sehingga BPBD terlalu tinggi). Kategori: " + ", ".join(PIHAK) + ". 'Masyarakat/warga' tidak "
        "dihitung sebagai relawan. kab[kode] = {n kejadian, k: hitungan per kategori}.", jenis=ter))
    des = susun_desa(ev, tahun)
    for p, rows in des.items():
        ukuran[f"desa_langganan/{p}.json"] = tulis(f"desa_langganan/{p}.json", dict(dasar, catatan=umum + " Desa = kab_kode + kecamatan + nama desa dinormalkan "
            "(desa_terisolir.nama); baris dengan lebih dari satu kab dilewati; kecamatan dipasangkan ke desa hanya bila tak ambigu. Per jenis: n = kejadian, "
            "t = jumlah tahun dasar yang ada kejadiannya (tahun_ada), b = per bulan (indeks 0 = Jan) jumlah tahun dasar yang ada kejadiannya. "
            "Desa-jenis dengan < 2 kejadian dibuang.", prov=p, desa=rows))
    acr = LI.acara(LI.baca("kejadian"), LI.muat_kode_kab())
    sus = susun_susulan(acr, tahun)
    ukuran["logbook_susulan.json"] = tulis("logbook_susulan.json", dict(dasar, catatan=umum + " DESKRIPTIF, bukan ramalan: berapa sering kejadian jenis kedua tercatat di kab yang sama 1-3 hari setelah jenis pertama "
        "(blok utama n/k/laju/dasar/lift/ci95, semua pasangan), dan berapa kali lipat dibanding peluang jendela 1-3 hari yang sama di hari acak, kab dan bulan-dalam-tahun yang sama (tahun dasar), supaya musim tidak menaikkan lift. "
        "hari0 (hanya jenis berbeda) = jenis kedua tercatat di kab yang sama pada HARI YANG SAMA: sebagian besar hanya satu laporan 'banjir dan longsor', jadi bukan kejadian susulan dan tanpa lift. "
        "Satuan = pasangan (kejadian, kab); kejadian lintas kab dihitung di tiap kab. Pemicu yang jendelanya keluar tahun dasar dibuang. n = pemicu, k = pemicu yang disusul, laju = k/n, "
        "dasar = rata-rata peluang pembanding, lift = laju/dasar, ci95 = persentil 2,5 dan 97,5 lift dari bootstrap blok kab-tahun (%d ulangan, benih tetap) atas pemicu; peluang pembanding tiap pemicu dianggap tetap (ketidakpastian pembanding tidak ikut), jadi selang ini sedikit terlalu sempit. "
        "Selang yang mencakup 1 = tak bisa dibedakan dari kebetulan. kab hanya bila n >= %d dan k >= %d. Ada ~300 kab dan 5 pasangan: perbandingan berganda, sebagian lift tinggi muncul karena kebetulan; JANGAN mengurutkan kab menurut lift tertinggi. "
        "Pasangan karhutla tidak dihitung: tak ada jenis susulan yang bermakna." % (BOOT_REP, MIN_PEMICU, MIN_K_KAB),
        jendela_hari=JENDELA, min_pemicu=MIN_PEMICU, min_k_kab=MIN_K_KAB, ci_metode="bootstrap blok kab-tahun, %d ulangan, benih %d; pembanding tetap" % (BOOT_REP, BOOT_SEED), pasangan=sus))
    titik, akhir_titik = muat_titik()
    omc = susun_omc(LI.baca("kejadian"), omc_baris, titik, akhir_titik)
    n_bd = sum(e["titik_panas"] is not None for e in omc["kejadian"])
    n_pot = sum(e["terpotong"] for e in omc["operasi"])
    ukuran["logbook_omc.json"] = tulis("logbook_omc.json", dict(dasar, titik_panas_sampai=akhir_titik, catatan=(
        "Operasi Modifikasi Cuaca (OMC) menurut logbook Pusdalops (hanya ada sejak Sep 2025). tujuan dari kata kunci pada catatan/dampak (karhutla = kebakaran hutan dan lahan; hujan_banjir = penanda "
        "banjir/hidrometeorologi; tidak_jelas = teks tak menyebut). mulai = catatan logbook pertama, selesai = catatan terakhir (BUKAN akhir operasi: banyak operasi karhutla berakhir di 30 Jun 2026 karena pencatatan OMC di logbook berhenti di situ; logbook mencatat per hari; satu operasi sering terpecah jadi banyak kejadian, lihat operasi). "
        "titik_panas (hanya tujuan karhutla): jumlah titik unik-harian FIRMS (MODIS + VIIRS, semua keyakinan) di provinsi itu 7 hari sebelum, selama, dan 7 hari sesudah; per_hari = rata-rata per hari. "
        "INI PERBANDINGAN, BUKAN BUKTI PENGARUH OMC: musim hujan, hujan alami, pemadaman darat, dan kerapatan awan ikut mengubah titik panas; jendela sebelum/sesudah bisa jatuh di musim yang berbeda. "
        "pembanding_tahun_lain = rata-rata per hari di provinsi dan jendela kalender yang sama pada tahun lain yang tercakup data (pembanding musim; bukan kontrol tanpa OMC). "
        "terpotong = operasi berakhir dalam 7 hari terakhir pencatatan OMC (henti_catat, dideteksi dari data: hari terakhir dengan >= 3 baris OMC), jadi akhir sebenarnya tak diketahui dan titik_panas dikosongkan. "
        "Titik panas dihitung se-provinsi sedangkan OMC bekerja di area kecil; n kecil: baca sebagai daftar kasus, bukan rata-rata efek. "
        "titik_panas null = data titik belum menjangkau jendela (sesudah > %s), terpotong, atau tujuan bukan karhutla. Tanpa teks asli, nama, atau korban." % akhir_titik),
        n_kejadian=len(omc["kejadian"]), n_dengan_pembanding=n_bd, **omc))
    ringkas(keb, jam, ter, des, tahun, ukuran)
    print(f"[susulan] " + "; ".join(f"{k}: n={v['nasional']['n']} laju={v['nasional']['laju']} lift={v['nasional']['lift']} ci={v['nasional']['ci95']} kab={len(v['kab'])}" for k, v in sus.items() if v["nasional"]))
    print(f"[omc] kejadian={len(omc['kejadian'])} operasi={len(omc['operasi'])} dengan pembanding={n_bd}; operasi terpotong={n_pot}/{len(omc['operasi'])}, operasi karhutla berpembanding={sum(o['titik_panas'] is not None for o in omc['operasi'])}, henti={omc['henti_catat']}; tujuan:", dict(collections.Counter(e["tujuan"] for e in omc["kejadian"])), "titik sampai", akhir_titik)


def ringkas(keb, jam, ter, des, tahun, ukuran):
    print("tahun dasar:", sorted(tahun))
    for j, v in keb.items():
        print(f"[kebutuhan] {j}: n={v['n_kejadian']} berisi={v['n_kejadian_berisi']} terkategori={v['n_terkategori']}", list(v["nasional"].items())[:5],
              "| alat berisi", v["alat_berisi"], list(v["alat_nasional"].items())[:3])
    for j, v in jam.items():
        pk = max(range(24), key=lambda h: v["nasional"][h])
        print(f"[jam] {j}: puncak {pk}:00 ({v['nasional'][pk]}), buang {v['terbuang']}")
    for j, v in ter.items():
        print(f"[terlibat] {j}: berisi {v['n_kejadian_berisi']}/{v['n_kejadian']} (sumber {v['n_dari_sumber_instansi']})", list(v["nasional"].items())[:5])
    n9 = collections.Counter()
    for rows in des.values():
        for r in rows:
            for j, x in r["jenis"].items():
                n9[j] += x["t"] == len(tahun)
    print("[desa] jumlah desa:", sum(len(r) for r in des.values()), "| desa-jenis ada di semua tahun dasar:", dict(n9))
    tot = sum(ukuran.values())
    print("ukuran total byte:", tot)
    for k, v in sorted(ukuran.items(), key=lambda x: -x[1])[:8]:
        print("  ", k, v)


def uji():
    assert berisi("Air bersih") and not berisi("Nihil") and not berisi(" - ") and not berisi(None) and not berisi("Nihil.")
    assert kategori("Makanan siap saji dan air mineral", RE_KEB) == {"makanan", "air_bersih"}
    assert kategori("Terpal, selimut; sabun mandi", RE_KEB) == {"tenda_terpal", "selimut_tikar_kasur", "perlengkapan_mandi"}
    assert kategori("nihil", RE_KEB) == set() and kategori("Karung pasir 100", RE_KEB) == {"karung_pasir"}
    assert kategori("Perahu karet, pompa air dan genset", RE_ALAT) == {"perahu", "pompa", "genset"}
    assert potong_alat("Pompa jinjing.\nKendala dan Upaya: Nihil") .strip() == "Pompa jinjing."
    assert kategori("BPBD; TNI dan Polri; PMI; Tagana; relawan; PT Astra; Camat", RE_PIHAK) >= {"BPBD", "TNI", "Polri", "PMI", "Tagana/Dinsos", "relawan/ormas", "dunia usaha", "pemda lain"}
    assert [jam_int(x) for x in ("15:30", "7.05", "0900", "25:00", "", None, "pagi", "21:00 WIB")] == [15, 7, 9, None, None, None, None, 21]

    def r(i, tgl, jenis="banjir", jam="08:00", keb="", terlibat="", desa=("Sijeruk",), kab="Kab. Banjarnegara", **kw):
        return dict({"id_kejadian": i, "jenis": jenis, "tgl_kejadian": tgl, "tgl_logbook": tgl, "jam_kejadian": jam, "kebutuhan": keb,
                     "peralatan": "", "terlibat": terlibat, "sumber_instansi": [], "prov_kode": ["33"], "kabkota": [kab],
                     "kecamatan": ["A"], "desa": list(desa)}, **kw)
    kode = lambda x: ["33|" + x["kabkota"][0][5:]]
    b = [r("1", "2015-12-01", keb="Air bersih"), r("1", "2015-12-02", keb="Air bersih, terpal"),    # satu kejadian, dua update
         r("2", "2016-12-03", keb="Nihil", jam="", terlibat="BPBD; TNI"),
         r("3", "2017-01-03", jam="pagi", sumber_instansi=["BPBD Kab. X"]),
         r("4", "2030-01-03"), r("5", "2012-05-05", desa=("Lain",))]  # 2030 dan 2012 di luar tahun dasar
    ev = kumpul(b, kode)
    assert len(ev) == 5 and ev["1"]["keb"] == {"air_bersih", "tenda_terpal"}
    tahun = {"2015", "2016", "2017"}
    k = susun_kebutuhan(ev, tahun)["banjir"]
    assert k["n_kejadian"] == 3 and k["n_kejadian_berisi"] == 1 and k["nasional"] == {"air_bersih": 1, "tenda_terpal": 1}
    assert k["kab"]["33|Banjarnegara"]["air_bersih"][11] == 1 and sum(k["kab"]["33|Banjarnegara"]["air_bersih"]) == 1
    kbr = k["kab_berisi"]["33|Banjarnegara"]
    assert kbr["n_kejadian"][11] == 2 and kbr["n_kejadian_berisi"][11] == 1 and sum(kbr["n_kejadian_berisi"]) == 1 and sum(kbr["n_alat_berisi"]) == 0
    j = susun_jam(ev)["banjir"]
    assert j["terbuang"] == {"n_kejadian": 5, "terpakai": 3, "kosong": 1, "tak_terbaca": 1} and j["nasional"][8] == 3 and j["prov"]["33"][8] == 3
    t = susun_terlibat(ev, tahun)["banjir"]
    assert t["n_kejadian_berisi"] == 2 and t["n_dari_sumber_instansi"] == 1 and t["nasional"]["BPBD"] == 2 and t["kab"]["33|Banjarnegara"]["n"] == 3
    d = susun_desa(ev, tahun)
    assert len(d["33"]) == 1 and d["33"][0]["desa"] == "Sijeruk" and d["33"][0]["jenis"]["banjir"] == {"n": 3, "t": 3, "b": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]}, d
    # E: prov_bulan (rata-rata per tahun dasar)
    pb = susun_kebutuhan(ev, tahun)["banjir"]["prov_bulan"]["33"]
    assert pb["n_kejadian"][11] == 0.67 and pb["n_berisi"][11] == 0.33 and pb["air_bersih"][11] == 0.33 and pb["tenda_terpal"][11] == 0.33, pb
    # C: susulan. longsor menyusul banjir tgl 5 Jan 2015 (hari ke-2) dan 20 Jan tidak; banjir 6 Jan juga tak dihitung bagi dirinya sendiri (jendela mulai d+1)
    def a(i, jenis, tgl, kab="33|X"):
        return i, {"jenis": jenis, "mulai": tgl, "kabs": [kab]}
    ac = dict([a("b1", "banjir", "2015-01-05"), a("l1", "longsor", "2015-01-07"), a("b2", "banjir", "2015-01-20"), a("b3", "banjir", "2015-01-21"),
               a("b4", "banjir", "2016-12-31"), a("l2", "longsor", "2017-01-01"), a("l0", "longsor", "2015-01-05"), a("b5", "banjir", "2016-03-01")])
    sus = susun_susulan(ac, {"2015", "2016"})
    bl = sus["banjir>longsor"]["nasional"]
    assert (bl["n"], bl["k"]) == (4, 1), bl                   # b4 jendelanya masuk 2017: dibuang; l2 (2017) di luar tahun dasar; l0 (hari yang sama) bukan susulan
    assert bl["hari0"] == {"n": 4, "k": 1, "laju": 0.25}, bl["hari0"]
    assert sus["banjir>banjir"]["nasional"]["n"] == 4 and sus["banjir>banjir"]["nasional"]["k"] == 1 and "hari0" not in sus["banjir>banjir"]["nasional"]   # b2 disusul b3
    assert sus["banjir>longsor"]["kab"] == {} and sus["cuaca>banjir"]["nasional"] is None
    assert bl["lift"] is not None and bl["dasar"] > 0 and bl["ci95"] and bl["ci95"][0] <= bl["ci95"][1]
    assert susun_susulan(ac, {"2015", "2016"}) == sus                 # benih tetap: ulangan identik
    assert persentil([1, 2, 3, 4], .5) == 2.5
    # D: OMC
    assert tujuan_omc("OMC penanganan darurat Kebakaran Hutan dan Lahan di Riau") == "karhutla" and tujuan_omc("mitigasi banjir Jabar") == "hujan_banjir" and tujuan_omc("cerah") == "tidak_jelas"
    titik = {"14": collections.Counter({"2026-03-01": 5, "2026-03-05": 2, "2026-03-12": 1, "2026-03-30": 99})}
    kj = [{"id_kejadian": "o1", "jenis": "omc", "jenis_teks": "Operasi Modifikasi Cuaca (OMC", "prov_kode": ["14"], "prov": ["Riau"], "pertama_dicatat": "2026-03-08", "terakhir_dicatat": "2026-03-09"},
          {"id_kejadian": "o2", "jenis": "omc", "jenis_teks": "Operasi Modifikasi Cuaca (OMC", "prov_kode": ["14"], "prov": ["Riau"], "pertama_dicatat": "2026-03-10", "terakhir_dicatat": "2026-03-10"},
          {"id_kejadian": "o3", "jenis": "omc", "jenis_teks": "Operasi Modifikasi Cuaca (OMC", "prov_kode": ["14"], "prov": ["Riau"], "pertama_dicatat": "2026-03-29", "terakhir_dicatat": "2026-03-29"},
          {"id_kejadian": "o4", "jenis": "omc", "jenis_teks": "\u00b1", "prov_kode": ["14"], "prov": ["Riau"], "pertama_dicatat": "2026-03-08", "terakhir_dicatat": "2026-03-08"},
          {"id_kejadian": "x", "jenis": "banjir", "jenis_teks": "Banjir"}]
    br = [{"id_kejadian": i, "tgl_logbook": t, "catatan": "OMC penanganan kebakaran hutan dan lahan", "dampak_teks": ""} for i, t in (("o1", "2026-03-08"), ("o2", "2026-03-10"), ("o3", "2026-03-29"), ("o4", "2026-03-08"))]
    r = susun_omc(iter(kj), br, titik, "2026-03-31")
    assert [e["id"] for e in r["kejadian"]] == ["o1", "o2", "o3"]
    t1 = r["kejadian"][0]["titik_panas"]
    assert (t1["sebelum"], t1["saat"], t1["sesudah"], t1["hari_saat"]) == (7, 0, 1, 2), t1       # 1 Mar 5, 5 Mar 2 | 12 Mar 1
    assert r["kejadian"][2]["titik_panas"] is None                                              # sesudah (30 Mar) melewati 7 hari sebelum akhir data
    assert [(o["mulai"], o["selesai"], o["n_kejadian"]) for o in r["operasi"]] == [("2026-03-08", "2026-03-10", 2), ("2026-03-29", "2026-03-29", 1)]
    assert susun_omc(iter(kj), br, {}, None)["kejadian"][0]["titik_panas"] is None
    assert r["henti_catat"] is None and not any(e["terpotong"] for e in r["kejadian"])
    titik["14"]["2025-03-09"] = 4
    br2 = br + [dict(br[2]), dict(br[2])]                                 # 3 baris pada 29 Mar: pencatatan 'berhenti' di situ
    r2 = susun_omc(iter(kj), br2, titik, "2026-03-31")
    assert r2["henti_catat"] == "2026-03-29" and [e["terpotong"] for e in r2["kejadian"]] == [False, False, True]
    assert r2["kejadian"][0]["titik_panas"]["pembanding_tahun_lain"] == [{"tahun": 2025, "per_hari": {"sebelum": 0.0, "saat": 2.0, "sesudah": 0.0}}], r2["kejadian"][0]["titik_panas"]
    assert r2["operasi"][1]["terpotong"] and r2["operasi"][1]["titik_panas"] is None
    print("uji logbook_turunan: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
