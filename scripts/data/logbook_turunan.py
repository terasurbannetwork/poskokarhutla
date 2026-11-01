"""Turunan publik logbook Pusdalops: kebutuhan/peralatan, jam rawan, pihak terlibat, desa langganan (agregat hitungan saja).

Masukan : data/raw/logbook/arsip/*/baris.jsonl (tidak di-git), public/data/logbook_riwayat.json (tahun_penuh)
Keluaran: public/data/bnpb/logbook_kebutuhan.json, logbook_jam.json, logbook_terlibat.json, desa_langganan/<kode_prov>.json
Spesifikasi: docs/superpowers/specs/2026-11-01-logbook-turunan.md

Tidak ada teks bebas, nama orang, atau nama petugas yang keluar: hanya hitungan per kategori.
Satuan hitung = KEJADIAN (id_kejadian): kategori yang disebut di entri mana pun dihitung 1, bukan per entri update.
Tahun dasar = tahun_penuh (bulan >= 25 hari tercatat). Kebutuhan, pihak terlibat, dan desa memakai tahun dasar; jam memakai semua tahun.
Pakai: python3 scripts/data/logbook_turunan.py      python3 scripts/data/logbook_turunan.py uji
"""
import collections, glob, json, os, re, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logbook_bersih as LB  # noqa: E402
import desa_terisolir as DT  # noqa: E402

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
    res = {}
    for jn, j in sorted(jenis.items()):
        res[jn] = dict(j, nasional=dict(j["nasional"].most_common()), alat_nasional=dict(j["alat_nasional"].most_common()),
                       kab={k: {c: v for c, v in sorted(d.items())} for k, d in sorted(kb[jn].items())},
                       kab_berisi=dict(sorted(pen[jn].items())),
                       alat_kab={k: {c: v for c, v in sorted(d.items())} for k, d in sorted(ab[jn].items())})
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

    def baca():
        for b in berkas:
            with open(b, encoding="utf-8") as f:
                for l in f:
                    yield json.loads(l)
    ev = kumpul(baca(), kode_cache())
    dibuat = datetime.now(timezone.utc).isoformat(timespec="seconds")
    sumber = f"Logbook harian Pusdalops BNPB, arsip {len(berkas)} berkas ({min(ev[i]['t'] for i in ev if ev[i]['t'])[:4]}-{max(ev[i]['t'] for i in ev if ev[i]['t'])[:4]}); tahun dasar {', '.join(sorted(tahun))}"
    dasar = {"dibuat": dibuat, "sumber": sumber, "tahun_dasar": sorted(tahun)}
    umum = ("Satuan = kejadian (id_kejadian), bukan entri update; satu kejadian lintas kab dihitung di tiap kab. Ini LAPORAN Pusdalops, bukan "
            "kejadian sebenarnya: kejadian yang tak dilaporkan tidak ada. Kategori dari kata kunci pada teks bebas, jadi bisa kurang atau lebih; "
            "satu teks bisa memuat beberapa kategori. Tidak ada teks asli, nama, atau angka korban.")
    ukuran = {}

    keb = susun_kebutuhan(ev, tahun)
    ukuran["logbook_kebutuhan.json"] = tulis("logbook_kebutuhan.json", dict(dasar, catatan=umum + " Kebutuhan: kolom 'kebutuhan' (kategori: " + ", ".join(KEBUTUHAN) + "); "
        "peralatan: kolom 'peralatan' dipotong pada 'Kendala' (sisa laporan), kategori: " + ", ".join(PERALATAN) + ". Teks 'nihil' dan kosong diabaikan. "
        "Persentase jujur = n_terkategori / n_kejadian_berisi (kebutuhan) atau alat_terkategori / alat_berisi; n_kejadian_berisi jauh lebih kecil dari n_kejadian "
        "karena kolom ini jarang diisi. kab_berisi[kode] = {n_kejadian, n_kejadian_berisi, n_terkategori, n_alat_berisi}, masing-masing 12 bulan: persen kebutuhan per kab = sum(kab[kode][kat]) / sum(n_kejadian_berisi). kab[kode][kategori] = 12 bulan (indeks 0 = Jan), dijumlah di seluruh tahun dasar.", jenis=keb))
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
    ringkas(keb, jam, ter, des, tahun, ukuran)


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
    print("uji logbook_turunan: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
