#!/usr/bin/env python3
"""G7 turunan perencanaan dari arsip Pusdalops -> public/data/bnpb/{kab_prioritas,kalender_operasi,stok_prapemusim}.json
dan data/raw/bnpb/rapor_bpbd_plus.json (internal, gitignored: kinerja per BPBD).

Publik: hanya agregat (hitungan, kategori, bulan); tanpa nama orang dan tanpa teks bebas.
Sumber publik: public/data/logbook_riwayat.json (bulan_penuh = tahun_penuh), public/data/bnpb/logbook_{kebutuhan,susulan}.json.
Sumber lokal (data/raw, tak ada di CI; tanpa berkas = kolom null): pusdalops_unik/{sk_status.jsonl,laphar_2022_2025.json},
logbook/turunan/{rapor_bpbd,penanganan}.json.
DESKRIPTIF dari LAPORAN Pusdalops, bukan ramalan dan bukan stok yang harus disiapkan. Belum diuji balik.
Jalankan: python3 scripts/bnpb/perencanaan.py        (tulis 4 JSON)
          python3 scripts/bnpb/perencanaan.py uji    (self-check; juga --cek)
"""
import json, math, os, sys, collections

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
P = lambda *a: os.path.join(AKAR, *a)
RIWAYAT, KEBUTUHAN, SUSULAN = P("public/data/logbook_riwayat.json"), P("public/data/bnpb/logbook_kebutuhan.json"), P("public/data/bnpb/logbook_susulan.json")
SK, LAPHAR = P("data/raw/pusdalops_unik/sk_status.jsonl"), P("data/raw/pusdalops_unik/laphar_2022_2025.json")
RAPOR, TANGANI = P("data/raw/logbook/turunan/rapor_bpbd.json"), P("data/raw/logbook/turunan/penanganan.json")
OUT_PRIORITAS, OUT_KALENDER, OUT_STOK = (P("public/data/bnpb/%s.json" % n) for n in ("kab_prioritas", "kalender_operasi", "stok_prapemusim"))
OUT_RAPOR = P("data/raw/bnpb/rapor_bpbd_plus.json")

BEBAN = 0.46            # kumulatif kejadian tahun dasar
MIN_TAHUN_MUSIM = 0.5   # musim harus ada di >= separuh tahun dasar (n_tahun_ada_di_musim)
FIRMS_BEDA = 2          # bulan; puncak laporan vs puncak titik panas beda > ini = tak_cocok_firms
NON_ALAM = {"kebakaran_permukiman", "kecelakaan", "konflik_sosial", "lainnya", "kegagalan_teknologi"}
ARSIP = P("data/raw/logbook/arsip")
TITIK = P("data/raw/logbook/titik_kab_%s.json")
KERENTANAN, WILAYAH = P("public/data/bnpb/kerentanan.json"), P("public/data/bnpb/wilayah.json")
MIN_MUSIM = 30          # kejadian (semua tahun dasar) per provinsi x jenis agar kalender dibuat
MIN_BERISI = 10         # kejadian berisi kolom kebutuhan agar persen kategori dipakai
MUSIMAN_MIN = 1.5       # kontras = rata c dalam musim / rata c luar musim; di bawahnya tidak_musiman
CAKUPAN_MIN = 10.0      # persen; cakupan isian di bawah ini = ekstrapolasi stok tidak andal (null)
ARSIP_TOL = (0.98, 1.02) # rasio hitungan arsip / riwayat per provinsi x jenis (satuan sama: kejadian x kab); di luar = arsip_konsisten false
SK_TAHUN = (2018, 2024)
ALAT = {"perahu", "pompa", "alat_berat", "mobil_tangki_air", "genset", "gergaji_mesin", "alat_komunikasi"}
META = {"n_kejadian", "n_berisi", "n_alat_berisi"}
PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung",
        "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur",
        "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan",
        "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo",
        "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara", "91": "Papua Barat", "92": "Papua Barat Daya", "94": "Papua", "95": "Papua Selatan", "96": "Papua Tengah", "97": "Papua Pegunungan"}


def muat(path, jsonl=False):
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return [json.loads(l) for l in f if l.strip()] if jsonl else json.load(f)


def persentil(xs, p):
    s = sorted(xs)
    i = (len(s) - 1) * p / 100
    a, b = math.floor(i), math.ceil(i)
    return s[a] + (s[b] - s[a]) * (i - a)


def jumlah12(a, b):
    return [x + y for x, y in zip(a, b)]


def halus(c):
    """rata geser 3 bulan melingkar."""
    return [(c[m - 1] + c[m] + c[(m + 1) % 12]) / 3 for m in range(12)]


def sama_arah(a, b):
    d = abs(a - b) % 12
    return min(d, 12 - d)


def musim(c, thn=None):
    """c: 12 nilai bulanan rata per tahun (indeks 0 = Jan); thn: opsional daftar 12-nilai per tahun dasar.
    Aturan: s = c dihaluskan rata geser 3 bulan melingkar; ambang = max(1, rata s); bulan aktif bila s >= ambang (>=);
    celah satu bulan antara dua bulan aktif ditutup; runtun melingkar; dengan thn, runtun yang dalamnya lebih tinggi daripada luarnya
    di < separuh tahun dasar dibuang. -> (ambang, [ {mulai, puncak, selesai, bulan, massa, n_tahun_ada_di_musim} urut massa menurun ])."""
    sm = halus(c)
    amb = max(1.0, sum(sm) / 12)
    on = [x >= amb - 1e-9 for x in sm]
    for m in range(12):
        if not on[m] and on[m - 1] and on[(m + 1) % 12]:
            on[m] = True
    if not any(on) or all(on):
        return amb, []
    runs = []
    for m in range(12):
        if on[m] and not on[m - 1]:
            bl = [m]
            while on[(bl[-1] + 1) % 12]:
                bl.append((bl[-1] + 1) % 12)
            pk = max(bl, key=lambda i: (c[i], -i))
            r = {"mulai": m + 1, "puncak": pk + 1, "selesai": bl[-1] + 1, "bulan": [b + 1 for b in bl], "massa": round(sum(c[b] for b in bl), 3), "n_tahun_ada_di_musim": None}
            if thn:
                luar = [i for i in range(12) if i not in bl]
                ada = 0
                for y in thn:
                    di, lu = sum(y[b] for b in bl) / len(bl), sum(y[i] for i in luar) / len(luar)
                    ada += di > lu
                if ada < math.ceil(MIN_TAHUN_MUSIM * len(thn)):
                    continue
                r["n_tahun_ada_di_musim"] = ada
            runs.append(r)
    return amb, sorted(runs, key=lambda r: -r["massa"])


def wilson(k, n, z=1.96):
    """selang Wilson 95% untuk proporsi k/n (persen, 1 desimal)."""
    if n <= 0:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(100 * max(0, c - h), 1), round(100 * min(1, c + h), 1)]


def tahun_bulan(tahun):
    """arsip kejadian.jsonl -> {(prov, jenis): {tahun: [12]}} dengan SATUAN SAMA seperti logbook_riwayat.json (scripts/data/logbook_bersih.py):
    kejadian x kab (lintas kab dihitung di tiap kab, tanpa kab tidak masuk), kab dari logbook_bersih.kode_kab, prov = 2 digit kunci kab (kode modern),
    tanggal = tgl_kejadian, atau tanggal catat pertama bila selisih > 300 hari atau tahunnya di luar tahun arsip. None bila arsip tak ada."""
    import datetime as dt, glob, importlib.util
    fs = sorted(glob.glob(os.path.join(ARSIP, "20??/kejadian.jsonl")) + glob.glob(os.path.join(ARSIP, "20??-*/kejadian.jsonl")))
    if not fs:
        return None
    sp = importlib.util.spec_from_file_location("logbook_bersih", P("scripts/data/logbook_bersih.py"))
    lb = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(lb)
    tahun_arsip = {os.path.basename(os.path.dirname(f))[:4] for f in fs}
    out = collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 12))
    for f in fs:
        with open(f, encoding="utf-8") as fh:
            for l in fh:
                k = json.loads(l)
                c = k["pertama_dicatat"]
                t = k.get("tgl_kejadian") or c
                try:
                    if abs((dt.date.fromisoformat(c) - dt.date.fromisoformat(t)).days) > 300:
                        t = c
                except ValueError:
                    pass
                y = t[:4]
                if y not in tahun_arsip:
                    y = c[:4]
                if y not in tahun:
                    continue
                for kab in lb.kode_kab(k):
                    out[(kab[:2], k["jenis"])][y][int(t[5:7]) - 1] += 1
    return {kk: v for kk, v in out.items()}


def firms_bulan(tahun):
    """titik panas FIRMS -> {prov: [12 rata per tahun dasar]}; None bila berkas tak ada."""
    out, n = collections.defaultdict(lambda: [0.0] * 12), 0
    for y in tahun:
        f = TITIK % y
        if not os.path.exists(f):
            continue
        n += 1
        for kab, h in json.load(open(f))["hari"].items():
            for tgl, v in h.items():
                out[kab[:2]][int(tgl[5:7]) - 1] += v
    return {p: [x / n for x in v] for p, v in out.items()} if n else None


def prioritas_kab(kab, beban=BEBAN):
    """kab: {kode: {jenis: [12]}} -> (daftar kode urut beban menurun sampai kumulatif >= beban, total semua kab, beban per kab)."""
    tot = {k: sum(sum(v) for v in j.values()) for k, j in kab.items()}
    total = sum(tot.values())
    urut = sorted(tot, key=lambda k: (-tot[k], k))
    pilih, kum = [], 0
    for k in urut:
        if total and kum / total >= beban:
            break
        pilih.append(k)
        kum += tot[k]
    return pilih, total, tot


def kebutuhan_khas(kb, kode, jenis_dom):
    """kategori kebutuhan berulang di kab (>= 3 kejadian) -> {dasar, n_berisi, kategori:[{kode,n,pct}]}. Jenis dominan dulu; bila n_berisi < MIN_BERISI, semua jenis."""
    for dasar, js in (("jenis dominan", [jenis_dom]), ("semua jenis", list(kb["jenis"]))):
        nb, cat = 0, collections.Counter()
        for j in js:
            v = kb["jenis"].get(j)
            if not v:
                continue
            nb += sum(v["kab_berisi"].get(kode, {}).get("n_kejadian_berisi", [0]))
            for k, m in v["kab"].get(kode, {}).items():
                cat[k] += sum(m)
        if nb >= MIN_BERISI:
            top = [{"kode": k, "n": n, "pct": round(100 * n / nb, 1)} for k, n in cat.most_common(5) if n >= 3]
            return {"dasar": dasar, "n_berisi": nb, "kategori": top[:3]}
    return {"dasar": None, "n_berisi": nb, "kategori": []}


def lift_kab(susulan, kode):
    out = []
    for nm, ps in susulan["pasangan"].items():
        e = ps["kab"].get(kode)
        if e:
            out.append({"pasangan": nm, "n": e["n"], "k": e["k"], "laju": e["laju"], "lift": e["lift"], "ci95": e["ci95"], "ci_tanpa_koreksi_di_atas_1": e["ci95"][0] > 1})
    return out


def penduduk_luas(kab_kunci):
    """{kab 'pp|Nama': (penduduk, luas_km2)} dari kerentanan.json lewat wilayah.json (nama; cadangan nama tanpa spasi/tanda/awalan kota di provinsi yang sama)."""
    ker, wil = muat(KERENTANAN), muat(WILAYAH)
    if not ker or not wil:
        return {}
    norm = lambda n: "".join(ch for ch in n.lower().replace("kabupaten ", "").replace("kota ", "") if ch.isalpha())
    tepat = {w["prov"] + "|" + w["nama"]: w["kode"] for w in wil["kab"]}
    longgar = collections.defaultdict(list)
    for w in wil["kab"]:
        longgar[(w["prov"], norm(w["nama"]))].append(w["kode"])
    out = {}
    for k in kab_kunci:
        kode = tepat.get(k)
        if not kode:
            c = longgar.get((k[:2], norm(k.split("|", 1)[1])), [])
            kode = c[0] if len(c) == 1 else None
        if kode and kode in ker["kab"]:
            out[k] = (ker["kab"][kode]["n"], ker["kab"][kode]["luas"])
    return out


def sk_per_kab(sk):
    """-> {kab: {tingkat: n}} untuk SK mulai/tahun 2018-2024 (baris SK + perpanjangan), kab terisi."""
    out = collections.defaultdict(lambda: collections.Counter())
    for s in sk or []:
        if s.get("kab") and SK_TAHUN[0] <= (s.get("tahun") or 0) <= SK_TAHUN[1]:
            out[s["kab"]][s["tingkat"]] += 1
    return {k: dict(v) for k, v in out.items()}


def korban_per_kab(lap):
    """jumlah nilai puncak tiap episode laphar (2022-2025) per kab: batas bawah, bukan angka final."""
    out = {}
    for e in (lap or {}).get("episode", []):
        if e.get("tingkat") != "kab" or not e.get("kab"):
            continue
        o = out.setdefault(e["kab"], {"episode": 0, "md": 0, "hilang": 0, "luka": 0, "mengungsi_jiwa": 0, "terdampak_jiwa": 0, "rumah_rb": 0})
        o["episode"] += 1
        for k in o:
            if k != "episode":
                o[k] += (e.get("puncak") or {}).get(k) or 0
    return out


def bangun_prioritas(riw, kb, sus, sk, lap, pl=None):
    nt = len(riw["tahun_penuh"])
    kab = {k: v["bulan_penuh"] for k, v in riw["kab"].items()}
    pilih, total, tot = prioritas_kab(kab)
    skk, korban = sk_per_kab(sk), korban_per_kab(lap)
    alam = {k: {j: m for j, m in v.items() if j not in NON_ALAM} for k, v in kab.items()}
    pilih_alam, total_alam, tot_alam = prioritas_kab(alam)
    rank_alam = {k: i for i, k in enumerate(sorted(tot_alam, key=lambda k: (-tot_alam[k], k)), 1)}
    daftar, kum = [], 0
    for r, k in enumerate(pilih, 1):
        jn = {j: sum(m) for j, m in kab[k].items()}
        dom = max(jn, key=lambda j: (jn[j], j))
        bln = [sum(m[i] for m in kab[k].values()) for i in range(12)]
        bd = kab[k][dom]
        kum += tot[k]
        kode = k
        pen, luas = (pl or {}).get(k, (None, None))
        thn_aktif = sum(1 for y, d in riw["kab"][k]["tahun"].items() if y in riw["tahun_penuh"] and sum(d.values()) > 0)
        daftar.append({"kab": k, "nama": k.split("|", 1)[1], "prov": k[:2], "peringkat": r, "kejadian": tot[k], "kejadian_per_tahun": round(tot[k] / nt, 1),
                       "per_100rb_penduduk": round(tot[k] / nt / pen * 1e5, 1) if pen else None, "per_100km2": round(tot[k] / nt / luas * 100, 1) if luas else None,
                       "penduduk": pen, "luas_km2": luas, "bulan_aktif_lapor": sum(1 for x in bln if x > 0), "tahun_aktif_lapor": thn_aktif,
                       "kejadian_bencana_alam": tot_alam[k], "peringkat_bencana_alam": rank_alam[k], "dominan_non_alam": dom in NON_ALAM, "dalam_prioritas_alam": k in pilih_alam,
                       "kumulatif_pct": round(100 * kum / total, 1), "jenis_dominan": dom, "jenis_dominan_pct": round(100 * jn[dom] / tot[k], 1),
                       "bulan_puncak": bln.index(max(bln)) + 1, "bulan_puncak_jenis_dominan": bd.index(max(bd)) + 1,
                       "kebutuhan_khas": kebutuhan_khas(kb, kode, dom), "berantai": lift_kab(sus, kode),
                       "sk_2018_2024": skk.get(k) if sk is not None else None, "korban_2022_2025": korban.get(k, {"episode": 0}) if lap is not None else None})
    return {"dibuat": riw["dibuat"], "sumber": "logbook_riwayat.json (bulan_penuh, tahun penuh %s), logbook_kebutuhan.json, logbook_susulan.json; SK dan laphar dari arsip Pusdalops lokal" % ", ".join(riw["tahun_penuh"]),
            "tahun_dasar": riw["tahun_penuh"], "label": "belum diuji balik",
            "rumus": "kab diurut menurut jumlah kejadian bulan_penuh (semua jenis, semua tahun dasar) menurun; dipilih sampai kumulatif >= %d%% dari total %d kejadian-kab. %d%% adalah PARAMETER OPERASIONAL (setara %.0f%% dari %d kab), bukan hasil statistik; bisa diubah lewat BEBAN di perencanaan.py" % (round(BEBAN * 100), total, round(BEBAN * 100), 100 * len(pilih) / len(kab), len(kab)),
            "parameter_beban": BEBAN, "jenis_non_alam": sorted(NON_ALAM),
            "prioritas_bencana_alam": [{"kab": k, "nama": k.split("|", 1)[1], "prov": k[:2], "peringkat": i, "kejadian": tot_alam[k]} for i, k in enumerate(pilih_alam, 1)],
            "n_pasangan_diuji": sum(len(ps["kab"]) for ps in sus["pasangan"].values()), "n_pasangan_ci_tanpa_koreksi_di_atas_1": sum(1 for ps in sus["pasangan"].values() for e in ps["kab"].values() if e["ci95"][0] > 1),
            "n_kab_total": len(kab), "n_kab_prioritas": len(daftar), "total_kejadian": total,
            "catatan": ["BUKAN peringkat risiko: ini beban LAPORAN Pusdalops. per_100rb_penduduk dan per_100km2 (penduduk Dukcapil dan luas poligon dari kerentanan.json) hanya kolom pembanding, tidak mengganti peringkat; null bila kab tak cocok ke kode wilayah.",
                        "Jenis non-bencana-alam (%s) ikut dihitung di peringkat utama; peringkat_bencana_alam dan prioritas_bencana_alam menyisihkannya. bulan_aktif_lapor = bulan (1-12) dengan >= 1 kejadian; tahun_aktif_lapor = tahun dasar dengan >= 1 kejadian; hari aktif tidak tersedia dari agregat." % ", ".join(sorted(NON_ALAM)),
                        "Hitungan LAPORAN Pusdalops, bukan kejadian sebenarnya; kab yang jarang melapor tampak ringan. Satu kejadian lintas kab dihitung di tiap kab.",
                        "kebutuhan_khas: kategori dari kata kunci kolom kebutuhan; pct = kejadian berkategori / kejadian yang kolomnya terisi (n_berisi); kosong bila n_berisi < %d. Kolom ini jarang diisi." % MIN_BERISI,
                        "berantai: kab dengan n >= 10 pemicu dan k >= 5 saja; lift tinggi tanpa ci_tanpa_koreksi_di_atas_1 bisa kebetulan; selang ini TANPA koreksi perbandingan berganda (n_pasangan_diuji pasangan kab diuji, sebagian lolos karena kebetulan), jangan diurutkan menurut lift.",
                        "sk_2018_2024: baris SK dan perpanjangannya per tingkat, dari rekap SK Pusdalops (tidak lengkap); null = sumber tak tersedia. korban_2022_2025: jumlah nilai puncak tiap episode laporan harian, batas bawah; hari tanpa PDF belum diurai."],
            "kab": daftar}


def yakin(n, ada, nt, tak_cocok, ada_musim, arsip_ok=True, musiman=True):
    """-> (keyakinan, alasan). rendah: n < 100, musim tak konsisten antartahun (< 2/3 tahun dasar), tak cocok FIRMS, atau tanpa musim; tinggi: n >= 300 dan >= 7/9 tahun."""
    al = []
    if n < 100:
        al.append("n < 100")
    if not ada_musim:
        al.append("tanpa musim")
    elif ada is not None and ada < math.ceil(2 * nt / 3):
        al.append("musim hanya di %d dari %d tahun" % (ada, nt))
    if not musiman and ada_musim:
        al.append("tidak musiman (kontras dalam/luar musim < %.1f)" % MUSIMAN_MIN)
    if tak_cocok:
        al.append("tak cocok titik panas FIRMS")
    if arsip_ok is False:
        al.append("arsip per tahun beda dari riwayat")
    if al:
        return "rendah", al
    return ("tinggi" if n >= 300 and (ada is None or ada >= math.ceil(7 * nt / 9)) else "sedang"), []


def kalender(riw, kb, thn=None, firms=None):
    prov = collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 12))
    for k, v in riw["kab"].items():
        for j, m in v["bulan_penuh"].items():
            prov[k[:2]][j] = jumlah12(prov[k[:2]][j], m)
    nt = len(riw["tahun_penuh"])
    out, lewat = {}, 0
    for p in sorted(prov):
        for j, m in sorted(prov[p].items()):
            if sum(m) < MIN_MUSIM:
                lewat += 1
                continue
            c = [x / nt for x in m]
            tp = [(thn.get((p, j)) or {}).get(y, [0] * 12) for y in riw["tahun_penuh"]] if thn else None
            amb, runs = musim(c, tp)
            rata = sum(c) / 12
            kontras = None
            if runs:
                bl = runs[0]["bulan"]
                dalam = sum(c[b - 1] for b in bl) / len(bl)
                luar = sum(c[i] for i in range(12) if i + 1 not in bl) / (12 - len(bl))
                kontras = round(dalam / luar, 2) if luar > 0 else None      # None = luar musim nol = kontras tak terhingga
            tdk = not runs or (kontras is not None and kontras < MUSIMAN_MIN)
            a_tot = sum(sum(x) for x in tp) if tp else None
            rasio = round(a_tot / sum(m), 2) if tp else None
            arsip_ok = (ARSIP_TOL[0] <= rasio <= ARSIP_TOL[1]) if rasio is not None else None
            ent = {"n": sum(m), "per_bulan": [round(x, 2) for x in c], "ambang": round(amb, 2), "kontras_musim": kontras, "tidak_musiman": tdk,
                   "rasio_arsip": rasio, "arsip_konsisten": arsip_ok, "musim": [], "alat": None}
            for r in runs[:2]:
                r = dict(r)
                r["persiapan_logistik"] = (r["mulai"] - 2) % 12 + 1
                ent["musim"].append(r)
            ent["persiapan_logistik_dipakai"] = ent["musim"][0]["persiapan_logistik"] if ent["musim"] else None
            ent["sumber_persiapan"] = "laporan" if ent["musim"] else None
            tak = False
            if j == "karhutla":
                fc = firms.get(p) if firms else None
                if fc and sum(fc) > 0:
                    pl, pf = c.index(max(c)) + 1, fc.index(max(fc)) + 1
                    _, fr = musim(fc)
                    tak = sama_arah(pl, pf) > FIRMS_BEDA
                    ent["firms"] = {"per_bulan": [round(x, 1) for x in fc], "puncak": pf, "puncak_laporan": pl, "selisih_bulan": sama_arah(pl, pf),
                                    "musim": [{k: r[k] for k in ("mulai", "puncak", "selesai", "bulan")} for r in fr[:2]], "tak_cocok_firms": tak}
                    ent["tak_cocok_firms"] = tak
                    if tak and fr:
                        ent["persiapan_logistik_dipakai"] = (fr[0]["mulai"] - 2) % 12 + 1
                        ent["sumber_persiapan"] = "titik_panas"
                else:
                    ent["firms"] = None
                    ent["tak_cocok_firms"] = None
            ada = ent["musim"][0]["n_tahun_ada_di_musim"] if ent["musim"] else None
            ent["keyakinan"], ent["keyakinan_alasan"] = yakin(sum(m), ada, nt, tak, bool(ent["musim"]), arsip_ok, not tdk)
            if tdk:
                ent["persiapan_logistik_dipakai"], ent["sumber_persiapan"], ent["keyakinan"] = None, None, "rendah"
            if runs:
                ent["alat"] = pergeseran(kb, p, j, runs[0]["bulan"])
            out.setdefault(p, {"nama": PROV.get(p, p), "jenis": {}})["jenis"][j] = ent
    return out, lewat


def pergeseran(kb, p, j, bulan):
    """kategori dominan (frekuensi / kejadian berisi) di bulan musim utama vs di luar musim, provinsi p, jenis j."""
    pb = kb["jenis"].get(j, {}).get("prov_bulan", {}).get(p)
    if not pb:
        return None
    nt = kb["n_tahun_dasar"]
    dalam, luar = [b - 1 for b in bulan], [i for i in range(12) if i + 1 not in bulan]

    def top(idx, alat):
        key = "n_alat_berisi" if alat else "n_berisi"
        nb = sum(pb.get(key, [0] * 12)[i] for i in idx) * nt
        nb = round(nb)
        if nb < MIN_BERISI:
            return None, nb
        cat = {k: sum(v[i] for i in idx) * nt for k, v in pb.items() if k not in META and (k in ALAT) == alat}
        t = [(k, n) for k, n in sorted(cat.items(), key=lambda x: (-x[1], x[0])) if n >= 1][:3]
        return [{"kode": k, "pct": round(100 * n / nb, 1)} for k, n in t], round(nb)

    res = {}
    for nm, alat in (("kebutuhan", False), ("peralatan", True)):
        a, na = top(dalam, alat)
        b, nb = top(luar, alat)
        res[nm] = {"musim": a, "n_berisi_musim": na, "luar_musim": b, "n_berisi_luar": nb,
                   "bergeser": (a[0]["kode"] != b[0]["kode"]) if a and b else None}
    return res


def stok(kb, kal):
    nt = kb["n_tahun_dasar"]
    out, lewat = {}, 0
    for j, v in sorted(kb["jenis"].items()):
        for p, pb in sorted(v.get("prov_bulan", {}).items()):
            ent = {}
            for nm, alat, key in (("kebutuhan", False, "n_berisi"), ("peralatan", True, "n_alat_berisi")):
                nb_y = sum(pb.get(key, [0] * 12))                      # kejadian berisi per tahun
                if nb_y * nt < MIN_BERISI:
                    continue
                nk_y = sum(pb["n_kejadian"])
                cak = round(100 * nb_y / nk_y, 1) if nk_y else None
                rows = []
                for k, m in pb.items():
                    if k in META or (k in ALAT) != alat or sum(m) <= 0:
                        continue
                    rows.append({"kode": k, "per_bulan": [round(x, 3) for x in m], "kejadian_per_tahun_teramati": round(sum(m), 3),
                                 "pct_dari_berisi": round(100 * sum(m) / nb_y, 1), "pct_ci95_wilson": wilson(round(sum(m) * nt), round(nb_y * nt)),
                                 "ekstrapolasi_kejadian_per_tahun": round(sum(m) / nb_y * nk_y, 2) if cak is not None and cak >= CAKUPAN_MIN else None,
                                 "bulan_puncak": m.index(max(m)) + 1})
                if rows:
                    ent[nm] = {"n_berisi_tahun_dasar": round(nb_y * nt), "cakupan_isian_pct": cak, "ekstrapolasi": "tidak andal" if cak is None or cak < CAKUPAN_MIN else "terbatas", "kategori": sorted(rows, key=lambda r: (-r["pct_dari_berisi"], r["kode"]))}
            if not ent:
                lewat += 1
                continue
            ent["n_kejadian_per_tahun"] = round(sum(pb["n_kejadian"]), 2)
            kj = kal.get(p, {}).get("jenis", {}).get(j, {})
            ent["persiapan_logistik"] = kj.get("persiapan_logistik_dipakai")
            ent["sumber_persiapan"] = kj.get("sumber_persiapan")
            ent["keyakinan_kalender"] = kj.get("keyakinan")
            out.setdefault(p, {"nama": PROV.get(p, p), "jenis": {}})["jenis"][j] = ent
    return out, lewat


def rapor_plus(rapor, tang):
    """gabung rapor_bpbd (jeda, pantau, sekali, kelengkapan) dan penanganan (tuntas, tutup tercatat) per kab. roll call: kolom kosong (D1)."""
    kab = {}
    for k, per in rapor["kab"].items():
        d = per.get("dasar")
        if not d or d["n"] < rapor["min_n"]:
            continue
        t = (tang or {}).get("kab", {}).get(k, {})
        n = sum(x["n"] for x in t.values())
        ns = sum(x["n_selesai"] for x in t.values())
        kab[k] = {"nama": k.split("|", 1)[1], "prov": k[:2], "n": d["n"],
                  "jeda_ke_laporan_pertama_hari": {"median": d["jeda_hari"]["median"], "p75": d["jeda_hari"]["p75"], "n": d["jeda_hari"]["n"]},
                  "lama_pantau_hari_median": d["lama_pantau_hari"]["median"], "sekali_pct": d["sekali_pct"],
                  "tutup_tercatat_pct": round(100 * ns / n, 1) if n else None, "n_tutup_dasar": n,
                  "lama_sampai_tuntas_hari": {j: {"median": x["median_dilaporkan"], "p75": x["p75_dilaporkan"], "n_selesai": x["n_selesai"]}
                                              for j, x in t.items() if x.get("layak_median")},
                  "kelengkapan_pct": d["lengkap_pct"], "kelengkapan_rata_pct": round(sum(d["lengkap_pct"].values()) / len(d["lengkap_pct"]), 1),
                  "per_tahun": {y: {"n": per[y]["n"], "jeda_median": per[y]["jeda_hari"]["median"], "kondisi_pct": per[y]["lengkap_pct"]["kondisi"]} for y in ("2024", "2025", "2026") if y in per and per[y]["n"] >= rapor["min_n"]},
                  "roll_call": None}
    return {"dibuat": rapor["dibuat"], "internal": True, "min_n": rapor["min_n"], "tahun_dasar": rapor["periode"]["dasar"],
            "catatan": rapor["catatan"] + ["INTERNAL, staf saja; jangan dipublikasikan atau diperingkat. tutup_tercatat_pct = kejadian yang kolom kondisinya pernah menyebut selesai / semua kejadian (campuran 'belum selesai' dan 'tak dilaporkan lagi').",
                                           "lama_sampai_tuntas_hari hanya jenis dengan layak_median (n_selesai >= 30, tak_selesai <= 90%); batas bawah yang bias.",
                                           "roll_call: kosong, menyusul dari D1 (tabel roll call belum ada di arsip)."],
            "kelengkapan_kolom": list(next(iter(kab.values()))["kelengkapan_pct"]) if kab else [], "kab": kab}


def tulis(path, o):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path) // 1024


def main():
    riw, kb, sus = muat(RIWAYAT), muat(KEBUTUHAN), muat(SUSULAN)
    sk, lap = muat(SK, True), muat(LAPHAR)
    pr = bangun_prioritas(riw, kb, sus, sk, lap, penduduk_luas(riw["kab"]))
    print("kab_prioritas.json: %d dari %d kab (%d KB), SK %s, laphar %s" % (pr["n_kab_prioritas"], pr["n_kab_total"], tulis(OUT_PRIORITAS, pr), sk is not None, lap is not None))
    thn, fm = tahun_bulan(riw["tahun_penuh"]), firms_bulan(riw["tahun_penuh"])
    kal, l1 = kalender(riw, kb, thn, fm)
    meta = {"dibuat": riw["dibuat"], "label": "belum diuji balik", "tahun_dasar": riw["tahun_penuh"],
            "rumus": "c[m] = kejadian bulan m dari bulan_penuh provinsi / %d tahun; s = c dihaluskan rata geser 3 bulan melingkar; ambang = max(1, rata-rata s); bulan aktif bila s >= ambang; celah satu bulan antara dua bulan aktif ditutup; musim = runtun melingkar bulan aktif; mulai siaga = bulan pertama runtun; puncak = c terbesar dalam runtun; selesai = bulan terakhir; persiapan logistik = 1 bulan sebelum mulai siaga. Runtun dibuang bila rata c di dalamnya lebih tinggi daripada di luarnya di < separuh tahun dasar (n_tahun_ada_di_musim, dari arsip kejadian per tahun). Dua runtun terbesar (menurut jumlah c) dimuat."
                     % len(riw["tahun_penuh"]),
            "validasi_firms": "karhutla: puncak bulan laporan dibanding puncak bulan titik panas FIRMS provinsi (rata tahun dasar, titik_kab_*.json). Selisih melingkar > %d bulan = tak_cocok_firms=true dan persiapan_logistik_dipakai memakai musim titik panas (sumber_persiapan='titik_panas'); selain itu memakai musim laporan." % FIRMS_BEDA,
            "keyakinan": "rendah bila n < 100, tanpa musim, musim hanya di < 2/3 tahun dasar, atau tak cocok FIRMS; tinggi bila n >= 300 dan musim di >= 7/9 tahun dasar dan lolos; selain itu sedang. Juga rendah bila tidak_musiman atau arsip_konsisten false.",
            "catatan": ["Kalender adalah pola LAPORAN Pusdalops (%d tahun penuh), bukan pola kejadian fisik, bukan prakiraan cuaca dan bukan SK siaga. Provinsi x jenis dengan < %d kejadian tidak dimuat (%d dilewati)." % (len(riw["tahun_penuh"]), MIN_MUSIM, l1),
                        "tidak_musiman = tak ada runtun yang lolos, atau kontras_musim (rata c dalam musim / rata c luar musim) < %.1f: persiapan_logistik_dipakai = null dan keyakinan = rendah; jangan dibaca sebagai musim." % MUSIMAN_MIN,
                        "rasio_arsip = kejadian arsip per tahun / bulan_penuh riwayat untuk provinsi x jenis ini; di luar %.2f-%.2f = arsip_konsisten false dan keyakinan = rendah karena n_tahun_ada_di_musim tak bisa dipercaya. Dihitung dengan satuan yang sama (kejadian x kab, logbook_bersih.kode_kab); saat ini semua entri tepat 1,00." % ARSIP_TOL,
                        "alat: kategori kebutuhan/peralatan dominan di musim utama vs di luar musim (pct = kejadian berkategori / kejadian yang kolomnya terisi); null bila < %d kejadian berisi." % MIN_BERISI]}
    print("kalender_operasi.json: %d provinsi (%d KB)" % (len(kal), tulis(OUT_KALENDER, dict(meta, provinsi=kal))))
    st, l2 = stok(kb, kal)
    ms = {"dibuat": kb["dibuat"], "label": "belum diuji balik", "tahun_dasar": kb["tahun_dasar"], "satuan": "frekuensi KEJADIAN yang membutuhkan kategori itu per tahun; BUKAN jumlah barang",
          "unit": "provinsi (lokasi gudang ada di D1 lewat src/inventaris.js, tidak ada di repo; layar menautkan gudang ke provinsinya lewat kolom provinsi gudang)",
          "catatan": ["per_bulan / kejadian_per_tahun_teramati = rata per tahun dasar kejadian berkategori itu, hanya dari kejadian yang kolom kebutuhannya terisi (batas bawah).",
                      "ekstrapolasi_kejadian_per_tahun = pct_dari_berisi x kejadian per tahun; mengandaikan kejadian yang tak mengisi kolom sama kebutuhannya. BIAS SELEKSI: yang mengisi kolom kebutuhan kemungkinan kejadian yang lebih besar atau lebih ditangani, jadi persen condong tinggi dan ekstrapolasi bisa melebihi. cakupan_isian_pct = kejadian berisi / semua kejadian; di bawah 10% ekstrapolasi = null dan ekstrapolasi = 'tidak andal' (hanya persen dari yang berisi yang boleh dibaca). pct_ci95_wilson hanya mencerminkan galat sampling, bukan bias seleksi.",
                      "Kategori dari kata kunci teks laporan. Perkiraan kasar, bukan stok yang harus disiapkan; jumlah per orang/keluarga tidak ada di arsip.",
                      "Provinsi x jenis dengan < %d kejadian berisi tidak dimuat (%d dilewati). persiapan_logistik = bulan dari kalender_operasi (null bila tanpa musim)." % (MIN_BERISI, l2)],
          "provinsi": st}
    print("stok_prapemusim.json: %d provinsi (%d KB)" % (len(st), tulis(OUT_STOK, ms)))
    rp, tg = muat(RAPOR), muat(TANGANI)
    if rp:
        r = rapor_plus(rp, tg)
        print("rapor_bpbd_plus.json (internal): %d kab (%d KB)" % (len(r["kab"]), tulis(OUT_RAPOR, r)))
    else:
        print("rapor_bpbd.json lokal tidak ada: lewati rapor internal")


def uji():
    assert persentil([1, 2, 3, 4], 50) == 2.5 and persentil([5], 75) == 5
    assert sama_arah(1, 12) == 1 and sama_arah(2, 8) == 6 and sama_arah(3, 3) == 0
    jabar = [12.44, 18.67, 14.78, 12.67, 9, 5.56, 4.67, 3.33, 3.11, 7.67, 11.67, 10.67]
    r = musim(jabar)[1][0]
    assert r["bulan"] == [11, 12, 1, 2, 3, 4] and r["mulai"] == 11 and r["selesai"] == 4 and r["puncak"] == 2, r      # satu runtun melingkar Nov-Apr
    r = musim([0] * 5 + [3, 3, 3] + [0] * 4)[1][0]
    assert r["bulan"] == [5, 6, 7, 8, 9], r                           # bulan yang tepat = ambang ikut (>=)
    r = musim([5] + [0] * 10 + [9])[1][0]
    assert r["bulan"] == [11, 12, 1, 2] and r["mulai"] == 11, r       # melingkar Des-Jan
    assert musim([3] * 12)[1] == [] and musim([0] * 12)[1] == []
    c = [0, 0, 9, 9, 9] + [0] * 7
    th_ok = [[0, 0, 9, 9, 9] + [0] * 7] * 3
    th_buruk = [c, [1] * 12, [2] * 12]
    assert musim(c, th_ok)[1][0]["n_tahun_ada_di_musim"] == 3
    assert musim(c, th_buruk)[1] == [], "musim hanya di 1 dari 3 tahun dibuang"
    w = wilson(50, 100)
    assert 40 < w[0] < 41 and 59 < w[1] < 60 and wilson(0, 0) is None and wilson(0, 10)[0] == 0.0
    assert yakin(50, 9, 9, False, True)[0] == "rendah" and yakin(500, 9, 9, False, True)[0] == "tinggi" and yakin(500, 5, 9, False, True)[0] == "rendah"
    assert yakin(200, 9, 9, False, True)[0] == "sedang" and yakin(500, 9, 9, True, True)[0] == "rendah" and yakin(500, None, 9, False, False)[0] == "rendah"
    # kalender karhutla: puncak laporan Jan, FIRMS Agustus -> tak_cocok_firms, persiapan dari FIRMS; FIRMS cocok -> laporan
    riw = {"tahun_penuh": ["2014"], "kab": {"14|X": {"bulan_penuh": {"karhutla": [40, 30, 20] + [0] * 9}}}}
    kbk = {"jenis": {}, "n_tahun_dasar": 1}
    fm_beda = [0] * 6 + [50, 100, 50] + [0] * 3
    e = kalender(riw, kbk, None, {"14": fm_beda})[0]["14"]["jenis"]["karhutla"]
    mf = musim(fm_beda)[1][0]
    assert e["tak_cocok_firms"] is True and e["sumber_persiapan"] == "titik_panas" and e["persiapan_logistik_dipakai"] == (mf["mulai"] - 2) % 12 + 1 and e["keyakinan"] == "rendah", e
    e = kalender(riw, kbk, None, {"14": [90, 60, 40] + [0] * 9})[0]["14"]["jenis"]["karhutla"]
    assert e["tak_cocok_firms"] is False and e["sumber_persiapan"] == "laporan" and e["persiapan_logistik_dipakai"] == e["musim"][0]["persiapan_logistik"]
    # kontras: musim tipis = tidak_musiman, tanpa persiapan, keyakinan rendah
    riw = {"tahun_penuh": ["2014"], "kab": {"14|X": {"bulan_penuh": {"banjir": [130, 125, 120, 100, 100, 100, 100, 100, 100, 100, 120, 130]}}}}
    e = kalender(riw, {"jenis": {}, "n_tahun_dasar": 1})[0]["14"]["jenis"]["banjir"]
    assert e["tidak_musiman"] and e["persiapan_logistik_dipakai"] is None and e["keyakinan"] == "rendah" and e["kontras_musim"] < MUSIMAN_MIN, e
    riw["kab"]["14|X"]["bulan_penuh"]["banjir"] = [300, 300, 300, 10, 10, 10, 10, 10, 10, 10, 10, 300]
    e = kalender(riw, {"jenis": {}, "n_tahun_dasar": 1})[0]["14"]["jenis"]["banjir"]
    assert not e["tidak_musiman"] and e["persiapan_logistik_dipakai"] is not None and e["kontras_musim"] >= MUSIMAN_MIN, e
    # stok: cakupan isian < 10% = ekstrapolasi null dan 'tidak andal'
    kb3 = {"n_tahun_dasar": 1, "jenis": {"banjir": {"prov_bulan": {"11": {"n_berisi": [1] * 12, "n_kejadian": [20] * 12, "makanan": [1] * 12}}}}}
    b = stok(kb3, {})[0]["11"]["jenis"]["banjir"]["kebutuhan"]
    assert b["cakupan_isian_pct"] == 5.0 and b["ekstrapolasi"] == "tidak andal" and b["kategori"][0]["ekstrapolasi_kejadian_per_tahun"] is None and b["kategori"][0]["pct_dari_berisi"] == 100.0, b
    kb3["jenis"]["banjir"]["prov_bulan"]["11"]["n_kejadian"] = [10] * 12
    b = stok(kb3, {})[0]["11"]["jenis"]["banjir"]["kebutuhan"]
    assert b["ekstrapolasi"] == "terbatas" and b["kategori"][0]["ekstrapolasi_kejadian_per_tahun"] == 120.0, b
    pil, tot, per = prioritas_kab({"a": {"x": [4] + [0] * 11}, "b": {"x": [3] + [0] * 11}, "c": {"x": [2] + [0] * 11}, "d": {"x": [1] + [0] * 11}})
    assert tot == 10 and pil == ["a", "b"], pil                      # a = 40% < 46%, a+b = 70% >= 46%
    assert prioritas_kab({"a": {"x": [5] + [0] * 11}, "b": {"x": [5] + [0] * 11}})[0] == ["a"], "50% >= 46% berhenti di a"
    # kebutuhan_khas: n_berisi < MIN_BERISI -> kosong; cukup -> kategori berulang
    kb = {"jenis": {"banjir": {"kab": {"k": {"makanan": [6] + [0] * 11, "tenda_terpal": [2] + [0] * 11}}, "kab_berisi": {"k": {"n_kejadian_berisi": [10] + [0] * 11}}},
                    "longsor": {"kab": {}, "kab_berisi": {}}}}
    kh = kebutuhan_khas(kb, "k", "banjir")
    assert kh["dasar"] == "jenis dominan" and kh["kategori"] == [{"kode": "makanan", "n": 6, "pct": 60.0}], kh        # tenda n=2 < 3 dibuang
    kb["jenis"]["banjir"]["kab_berisi"]["k"]["n_kejadian_berisi"] = [9] + [0] * 11
    assert kebutuhan_khas(kb, "k", "banjir")["kategori"] == []
    sus = {"pasangan": {"banjir>longsor": {"kab": {"k": {"n": 12, "k": 6, "laju": .5, "lift": 3.0, "ci95": [1.2, 5]}}}}}
    assert lift_kab(sus, "k")[0]["ci_tanpa_koreksi_di_atas_1"] is True and lift_kab(sus, "z") == []
    skk = sk_per_kab([{"kab": "a|b", "tahun": 2019, "tingkat": "Siaga Darurat"}, {"kab": "a|b", "tahun": 2025, "tingkat": "Siaga Darurat"}, {"kab": None, "tahun": 2019, "tingkat": "x"}])
    assert skk == {"a|b": {"Siaga Darurat": 1}}, skk
    kor = korban_per_kab({"episode": [{"tingkat": "kab", "kab": "a|b", "puncak": {"md": 2}}, {"tingkat": "kab", "kab": "a|b", "puncak": {"md": 3, "luka": 1}}, {"tingkat": "prov", "kab": None, "puncak": {"md": 99}}]})
    assert kor["a|b"]["md"] == 5 and kor["a|b"]["luka"] == 1 and kor["a|b"]["episode"] == 2
    # alat bergeser: musim Nov-Des dominan makanan, di luar musim tenda; n_berisi dikali n_tahun
    kb2 = {"n_tahun_dasar": 2, "jenis": {"banjir": {"prov_bulan": {"11": {"n_berisi": [0] * 10 + [10, 10], "n_alat_berisi": [0] * 12,
           "makanan": [0] * 10 + [5, 5], "tenda_terpal": [6] + [0] * 11}}}}}
    al = pergeseran(kb2, "11", "banjir", [11, 12])
    assert al["kebutuhan"]["musim"] == [{"kode": "makanan", "pct": 50.0}] and al["kebutuhan"]["luar_musim"] is None and al["peralatan"]["musim"] is None, al
    # stok: persen = teramati / berisi, perkiraan = persen x n_kejadian
    kb2["jenis"]["banjir"]["prov_bulan"]["11"].update({"n_berisi": [2] * 12, "n_kejadian": [10] * 12, "makanan": [1] * 12})
    s, _ = stok(kb2, {})
    r = s["11"]["jenis"]["banjir"]["kebutuhan"]["kategori"][0]
    assert r["kode"] == "makanan" and r["pct_dari_berisi"] == 50.0 and r["ekstrapolasi_kejadian_per_tahun"] == 60.0 and r["pct_ci95_wilson"][0] < 50 < r["pct_ci95_wilson"][1] and s["11"]["jenis"]["banjir"]["kebutuhan"]["cakupan_isian_pct"] == 20.0 and r["kejadian_per_tahun_teramati"] == 12, r
    assert "perahu" not in {x["kode"] for x in s["11"]["jenis"]["banjir"]["kebutuhan"]["kategori"]}
    # rapor plus
    lc = {k: 50.0 for k in ("kecamatan", "desa", "kondisi", "upaya", "kebutuhan", "kendala")}
    rp = {"dibuat": "x", "min_n": 10, "periode": {"dasar": ["2014"]}, "catatan": [], "kab": {"1|A": {"dasar": {"n": 20, "jeda_hari": {"n": 20, "median": 1.0, "p75": 2.0}, "lama_pantau_hari": {"median": 0.0}, "sekali_pct": 70.0, "lengkap_pct": lc}},
          "1|B": {"dasar": {"n": 3, "jeda_hari": {"n": 3, "median": 1.0, "p75": 1.0}, "lama_pantau_hari": {"median": 0.0}, "sekali_pct": 1, "lengkap_pct": lc}}}}
    tg = {"kab": {"1|A": {"banjir": {"n": 15, "n_selesai": 5, "median_dilaporkan": 1.0, "p75_dilaporkan": 2.0, "layak_median": True}, "cuaca": {"n": 5, "n_selesai": 0, "layak_median": False}}}}
    o = rapor_plus(rp, tg)["kab"]
    assert list(o) == ["1|A"] and o["1|A"]["tutup_tercatat_pct"] == 25.0 and list(o["1|A"]["lama_sampai_tuntas_hari"]) == ["banjir"] and o["1|A"]["roll_call"] is None
    # data nyata (bila ada): ambang 46% dihitung ulang, bukan 51 tetap
    if os.path.exists(RIWAYAT):
        riw = muat(RIWAYAT)
        pil, tot, per = prioritas_kab({k: v["bulan_penuh"] for k, v in riw["kab"].items()})
        kum = sum(per[k] for k in pil)
        assert kum / tot >= BEBAN and (kum - per[pil[-1]]) / tot < BEBAN, "kumulatif minimal yang melewati 46%"
    if os.path.exists(RIWAYAT) and os.path.isdir(ARSIP):
        riw, kb = muat(RIWAYAT), muat(KEBUTUHAN)
        thn = tahun_bulan(riw["tahun_penuh"])
        if thn:
            # konsistensi arsip vs riwayat: satuan sama (kejadian x kab), total nasional dalam 2% dan hampir semua provinsi x jenis dalam ARSIP_TOL
            rn = sum(sum(m) for v in riw["kab"].values() for m in v["bulan_penuh"].values())
            an = sum(sum(m) for d in thn.values() for m in d.values())
            assert 0.98 <= an / rn <= 1.02, ("total arsip vs riwayat", an, rn)
            kal, _ = kalender(riw, kb, thn, firms_bulan(riw["tahun_penuh"]))
            rs = sorted(e["rasio_arsip"] for v in kal.values() for e in v["jenis"].values())
            assert 0.99 <= rs[len(rs) // 2] <= 1.01, ("median rasio arsip", rs[len(rs) // 2])
            tak = [e for v in kal.values() for e in v["jenis"].values() if e["arsip_konsisten"] is False]
            assert len(tak) <= 0.05 * len(rs), ("terlalu banyak arsip tak konsisten", len(tak))
            semua = [e for v in kal.values() for e in v["jenis"].values()]
            assert not [e for e in semua if e["tidak_musiman"] and (e["persiapan_logistik_dipakai"] is not None or e["keyakinan"] != "rendah")]
            assert not [e for e in semua if e["arsip_konsisten"] is False and e["keyakinan"] != "rendah"]
            jl = kal["32"]["jenis"]["longsor"]
            assert not jl["tidak_musiman"] and jl["musim"][0]["mulai"] == 11 and jl["musim"][0]["selesai"] == 4, jl     # Jabar longsor: puncak ~25,9, dasar ~7,6, Nov-Apr
    print("perencanaan.py uji hijau")


if __name__ == "__main__":
    uji() if ("uji" in sys.argv or "--cek" in sys.argv) else main()
