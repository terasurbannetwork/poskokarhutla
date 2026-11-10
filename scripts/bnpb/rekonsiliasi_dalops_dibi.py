"""Rekonsiliasi Dalops (logbook Pusdalops) lawan DIBI -> public/data/bnpb/rekonsiliasi_dalops_dibi.json

Pertanyaan: kejadian mana yang tercatat satu sumber saja, seberapa beda korban dan rumah pada pasangan yang cocok, dan berapa jeda pencatatan.
TIDAK menyimpulkan salah satu sumber yang benar: Dalops = laporan harian piket Pusdalops BNPB (teks bebas, angka diurai mesin), DIBI = rekap BPBD
per kabupaten. Beda cakupan dan beda cara hitung; selisih adalah selisih, bukan galat.

Satuan: hari x kabupaten x jenis (rekaman kembar sehari digabung, lihat kunci_kejadian.satuan). Pasangan satu-satu dalam jendela +-3 hari.
Kunci kejadian, pemetaan jenis dan nama kabupaten: scripts/bnpb/kunci_kejadian.py (sumber baru cukup didaftarkan di sana).

Cakupan tahun (ditulis di keluaran, `cakupan`): Dalops = hari logbook yang ada per tahun, DIBI = ada baris per tahun. Tahun dibandingkan hanya bila keduanya punya
dan logbook >= 300 hari; tanggal akhir = tanggal terakhir yang dimiliki KEDUANYA. Kejadian dengan tanggal di luar rentang itu tidak dihitung.

Privasi: logbook internal dan repo publik. Keluaran hanya agregat provinsi x tahun x jenis (hitungan dan median), tanpa baris kejadian, nama,
atau teks. Korban/rumah dari Dalops adalah taksiran pengurai teks; kejadian lintas kabupaten tidak dibandingkan dampaknya.

Masukan (lokal, tidak ada di CI): data/pusdalops/logbook_kejadian.csv (kab, jenis, tanggal), data/raw/logbook/arsip/*/kejadian.jsonl (md, hilang, rumah),
data/raw/logbook/arsip/*/logbook.jsonl (hari tercatat), data/raw/bnpb/dibi_harian/<tahun>.json (cache tarikan DIBI, --tarik).
Pakai:  python3 scripts/bnpb/rekonsiliasi_dalops_dibi.py [--tarik]   |   python3 scripts/bnpb/rekonsiliasi_dalops_dibi.py --cek
"""
import csv, datetime as dt, glob, json, os, statistics, sys, time
from collections import Counter, defaultdict

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
import kunci_kejadian as KK
PROVINSI = KK._muat("wilayah_data", "scripts/data/wilayah.py").PROVINSI

AKAR = KK.AKAR
WIB = dt.timezone(dt.timedelta(hours=7))
CSV = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
ARSIP = os.path.join(AKAR, "data/raw/logbook/arsip")
CACHE = os.path.join(AKAR, "data/raw/bnpb/dibi_harian")
KELUAR = os.path.join(AKAR, "public/data/bnpb/rekonsiliasi_dalops_dibi.json")
JENDELA = 3
SENSITIF = (0, 1, 3, 7)
MIN_HARI = 300          # hari logbook minimum agar satu tahun dibandingkan
TAHUN_DIBI = range(2011, dt.date.today().year + 1)
METRIK = [("kej", "SUM(jumlah_kejadian)"), ("md", "SUM(meninggal)"), ("hil", "SUM(hilang)"), ("luka", "SUM(luka_sakit)"),
          ("rb", "SUM(rumah_rusak_berat)"), ("rs", "SUM(rumah_rusak_sedang)"), ("rr", "SUM(rumah_rusak_ringan)")]
KOLOM = ["prov", "tahun", "jenis", "n_dalops", "n_dibi", "pasangan", "hanya_dalops", "hanya_dibi",
         "korban_banding", "korban_sama", "korban_dalops_lebih", "korban_dibi_lebih", "korban_selisih_median",
         "rumah_banding", "rumah_sama", "rumah_dalops_lebih", "rumah_dibi_lebih", "rumah_selisih_median",
         "jeda_catat_median", "selisih_tgl_median", "hanya_dibi_tanpa_logbook"]
MIN_SEL = 5             # sel prov dengan kejadian lebih sedikit dari ini ditutup; median dari pasangan lebih sedikit dari ini dikosongkan


# ---------------------------------------------------------------- masukan
def tarik_dibi():
    """Tarik DIBI harian per kabupaten per jenis (Superset publik) ke data/raw/bnpb/dibi_harian/<tahun>.json."""
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    import kejadian as BK
    os.makedirs(CACHE, exist_ok=True)
    for y in TAHUN_DIBI:
        r = BK.superset(["dt", "id_kab_bps", "kabupaten", "jenis_bencana"], METRIK, [{"col": "tahun", "op": "==", "val": y}], 50000)
        assert len(r) < 50000, f"DIBI {y}: batas 50.000 baris tercapai, data terpotong"
        json.dump({"tahun": y, "ditarik": dt.date.today().isoformat(), "baris": r}, open(os.path.join(CACHE, f"{y}.json"), "w"), separators=(",", ":"))
        print("tarik", y, len(r))
        time.sleep(1)


def angka(v):
    return int(round(float(v or 0)))


def muat_dibi():
    """-> (rekaman, hari_per_tahun, kab_tak_cocok Counter, jenis_lain int, tgl_maks)."""
    rek, baris_th, tak, lain, maks = [], Counter(), Counter(), 0, ""
    for f in sorted(glob.glob(os.path.join(CACHE, "*.json"))):
        d = json.load(open(f))
        for r in d["baris"]:
            tgl = dt.datetime.fromtimestamp(r["dt"] / 1000, WIB).date()
            baris_th[tgl.year] += 1
            maks = max(maks, tgl.isoformat())
            jn = KK.kunci_jenis("dibi", r["jenis_bencana"])
            if not jn:
                lain += 1
                continue
            kode = str(angka(r["id_kab_bps"]))
            kab = KK.kab_kunci(str(r["kabupaten"] or ""), kode[:2])
            if not kab:
                tak[f"{r['kabupaten']} ({kode[:2]})"] += 1
            rek.append({"id": f"dibi-{len(rek)}", "jenis": jn, "kab": kab, "tgl": tgl,
                        "nilai": {"korban": angka(r["md"]) + angka(r["hil"]), "rumah": angka(r["rb"]) + angka(r["rs"]) + angka(r["rr"])}})
    return rek, baris_th, tak, lain, maks


def rg(a, b):
    return {k: {**v, **b.get(k, {})} for k, v in a.items()}


def _int(s):
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return None


def muat_dalops():
    """-> (rekaman, hari_per_tahun, tanpa_kab, jenis_lain, multi_kab, tgl_maks, kab_diselamatkan, set tanggal logbook). Dampak None = pengurai tidak menemukan angka."""
    dampak = {}
    for f in glob.glob(os.path.join(ARSIP, "20*/kejadian.jsonl")):
        for l in open(f, encoding="utf-8"):
            k = json.loads(l)
            dampak[k["id_kejadian"]] = (k.get("md"), k.get("hilang"))
    hari, maks, ada = Counter(), "", set()
    for f in glob.glob(os.path.join(ARSIP, "20*/logbook.jsonl")):
        for l in open(f, encoding="utf-8"):
            t = json.loads(l)["tgl_logbook"]
            hari[int(t[:4])] += 1
            ada.add(dt.date.fromisoformat(t[:10]))
            maks = max(maks, t)
    rek, tanpa, lain, multi, selamat = [], 0, 0, 0, 0
    for r in csv.DictReader(open(CSV, encoding="utf-8")):
        jn = KK.kunci_jenis("dalops", r["jenis"])
        if not jn:
            lain += 1
            continue
        try:
            tgl, cat = dt.date.fromisoformat(r["tgl_kejadian"]), dt.date.fromisoformat(r["pertama_dicatat"])
            if abs((cat - tgl).days) > 300:   # salah ketik tahun: pakai tanggal catat (aturan yang sama dengan logbook_bersih.rekap)
                tgl = cat
        except ValueError:
            try:
                tgl = cat = dt.date.fromisoformat(r["pertama_dicatat"])
            except ValueError:
                continue
        kabs = [k for k in (r["kab_kode"] or "").split("; ") if k]
        if not kabs and r["kabkota"]:   # kode kosong di csv terbit: coba ulang dengan pemetaan nama bersama
            provs = (r["prov_kode"] or "").split("; ")
            kabs = list(dict.fromkeys(k for n in r["kabkota"].split("; ") for p in provs + [""] if (k := KK.kab_kunci(n, p))))
            selamat += bool(kabs)
        if not kabs:
            tanpa += 1
            continue
        md, hil = dampak.get(r["id_kejadian"], (None, None))
        korban = None if md is None and hil is None else (md or 0) + (hil or 0)
        rm = [_int(r[c]) for c in ("rumah_rb", "rumah_rs", "rumah_rr")]
        rumah = None if all(x is None for x in rm) else sum(x or 0 for x in rm)
        if len(kabs) > 1:   # dampak satu kejadian tidak bisa dibagi ke kabupatennya
            multi += 1
            korban = rumah = None
        for kab in kabs:
            rek.append({"id": r["id_kejadian"], "jenis": jn, "kab": kab, "tgl": tgl,
                        "nilai": {"korban": korban, "rumah": rumah, "jeda": max(0, min(60, (cat - tgl).days))}})
    return rek, hari, tanpa, lain, multi, maks, selamat, ada


# ---------------------------------------------------------------- hitungan murni (diuji)
def _gabung_satuan(rek):
    """satuan hari-kab-jenis; nilai None bila semua rekaman asal None (bukan 0), jeda = terkecil."""
    g = {}
    for r in rek:
        k = (r["jenis"], r["kab"], r["tgl"])
        e = g.setdefault(k, {"id": [], "jenis": r["jenis"], "kab": r["kab"], "tgl": r["tgl"], "nilai": {}, "n_asal": 0})
        e["id"].append(r["id"])
        e["n_asal"] += 1
        for m, v in (r.get("nilai") or {}).items():
            if v is None:
                e["nilai"].setdefault(m, None)
            elif m == "jeda":
                e["nilai"][m] = v if e["nilai"].get(m) is None else min(e["nilai"][m], v)
            else:
                e["nilai"][m] = (e["nilai"].get(m) or 0) + v
    return list(g.values())


def _med(x):
    return None if not x else round(statistics.median(x), 1)


def rekonsiliasi(dalops, dibi, awal, akhir, tahun_ok, jendela=JENDELA, hari_ada=None):
    """Rekaman -> (baris agregat per (prov, tahun, jenis), pasangan_n, mentah). mentah = {(prov, tahun, jenis): {jeda, seltgl, korban, rumah: [nilai]}}
    untuk median gabungan (median tidak bisa dijumlah dari median baris). awal/akhir date; tahun_ok set tahun yang dibandingkan.
    hari_ada = set tanggal yang punya logbook: satuan DIBI yang tak berpasangan pada hari tanpa logbook TIDAK dihitung hanya_dibi (Dalops belum tentu
    menerbitkan hari itu), melainkan hanya_dibi_tanpa_logbook. None = semua hari dianggap punya logbook."""
    dentro = lambda r: awal <= r["tgl"] <= akhir and r["tgl"].year in tahun_ok
    kiri = _gabung_satuan([r for r in dalops if dentro(r)])
    kanan = _gabung_satuan([r for r in dibi if dentro(r) and r["kab"]])
    pas, tk, tn = KK.pasangkan(kiri, kanan, jendela)
    A = defaultdict(lambda: defaultdict(list))
    cnt = defaultdict(Counter)
    kunci = lambda r: (r["kab"][:2], r["tgl"].year, r["jenis"][0])
    for i, j, d in pas:
        a, b = kiri[i], kanan[j]
        # jenis pasangan = jenis Dalops (satu kunci); DIBI "banjir dan longsor" ikut jenis yang cocok
        k = (a["kab"][:2], a["tgl"].year, next(x for x in a["jenis"] if x in b["jenis"]))
        cnt[k]["pasangan"] += 1
        A[k]["seltgl"].append(abs(d))
        A[k]["jeda"].append(a["nilai"].get("jeda"))
        for m in ("korban", "rumah"):
            x, y = a["nilai"].get(m), b["nilai"].get(m)
            if x is None:
                continue
            cnt[k][m + "_banding"] += 1
            if x == y:
                cnt[k][m + "_sama"] += 1
            else:
                cnt[k][m + (("_dalops_lebih") if x > y else "_dibi_lebih")] += 1
                A[k][m].append(abs(x - y))
    for i in tk:
        cnt[kunci(kiri[i])]["hanya_dalops"] += 1
        A[kunci(kiri[i])]["jeda"].append(kiri[i]["nilai"].get("jeda"))
    for j in tn:
        tanpa = hari_ada is not None and kanan[j]["tgl"] not in hari_ada
        cnt[kunci(kanan[j])]["hanya_dibi_tanpa_logbook" if tanpa else "hanya_dibi"] += 1
    baris = []
    for k in sorted(cnt):
        c, a = cnt[k], A[k]
        jeda = [x for x in a["jeda"] if x is not None]
        baris.append([k[0], k[1], k[2], c["pasangan"] + c["hanya_dalops"], c["pasangan"] + c["hanya_dibi"], c["pasangan"], c["hanya_dalops"], c["hanya_dibi"],
                      c["korban_banding"], c["korban_sama"], c["korban_dalops_lebih"], c["korban_dibi_lebih"], _med(a["korban"]),
                      c["rumah_banding"], c["rumah_sama"], c["rumah_dalops_lebih"], c["rumah_dibi_lebih"], _med(a["rumah"]),
                      _med(jeda), _med(a["seltgl"]), c["hanya_dibi_tanpa_logbook"]])
    return baris, len(pas), A


def median_gabung(mentah, kunci):
    """-> {kunci(k): {jeda_catat_median, selisih_tgl_median, korban_selisih_median, rumah_selisih_median}} dari daftar mentah semua sel yang berkunci sama."""
    g = defaultdict(lambda: defaultdict(list))
    for k, a in mentah.items():
        for m in ("jeda", "seltgl", "korban", "rumah"):
            g[kunci(k)][m] += [x for x in a[m] if x is not None]
    return {k: {"jeda_catat_median": _med(a["jeda"]), "selisih_tgl_median": _med(a["seltgl"]), "korban_selisih_median": _med(a["korban"]),
                "rumah_selisih_median": _med(a["rumah"])} for k, a in g.items()}


def ringkas(baris, kunci):
    """Jumlahkan baris per fungsi kunci(baris) -> {kunci: dict}. Persentase dihitung dari jumlah, bukan rata-rata persentase."""
    s = defaultdict(Counter)
    for b in baris:
        k = kunci(b)
        for n, v in zip(KOLOM[3:12], b[3:12]):
            s[k][n] += v
        for n, v in zip(KOLOM[13:17], b[13:17]):
            s[k][n] += v
        s[k]["hanya_dibi_tanpa_logbook"] += b[20]
    out = {}
    for k, c in s.items():
        out[k] = {**dict(c), "persen_dalops_ada_di_dibi": round(100 * c["pasangan"] / c["n_dalops"], 1) if c["n_dalops"] else None,
                  "persen_dibi_ada_di_dalops": round(100 * c["pasangan"] / c["n_dibi"], 1) if c["n_dibi"] else None,
                  "korban_sama_persen": round(100 * c["korban_sama"] / c["korban_banding"], 1) if c["korban_banding"] else None,
                  "rumah_sama_persen": round(100 * c["rumah_sama"] / c["rumah_banding"], 1) if c["rumah_banding"] else None}
    return out


def tutup_kecil(ringk):
    """Privasi: median selisih dikosongkan bila pasangan yang dibandingkan < MIN_SEL; sel dengan kejadian (Dalops + DIBI) < MIN_SEL ditulis
    kurang_dari_5 dan semua angkanya dikosongkan (termasuk hanya_dalops, hanya_dibi, jeda, selisih tanggal)."""
    out = {}
    for k, v in ringk.items():
        v = dict(v)
        if v["n_dalops"] + v["n_dibi"] < MIN_SEL:
            v = {**{a: None for a in v}, "kurang_dari_5": True}
        else:
            for m in ("korban", "rumah"):
                if v[m + "_banding"] < MIN_SEL:
                    v[m + "_selisih_median"] = None
        out[k] = v
    return out


def tanpa_tahun(mentah, baris, tahun):
    return [b for b in baris if b[1] not in tahun], {k: a for k, a in mentah.items() if k[1] not in tahun}


# ---------------------------------------------------------------- utama
def main():
    dib, baris_th, tak, dib_lain, dib_maks = muat_dibi()
    dal, hari, tanpa, dal_lain, multi, dal_maks, selamat, ada = muat_dalops()
    ok = sorted(y for y in hari if hari[y] >= MIN_HARI and baris_th.get(y))
    lewat = [{"tahun": y, "alasan": ("logbook hanya %d hari" % hari[y]) if hari.get(y, 0) < MIN_HARI else "DIBI tidak punya baris"}
             for y in sorted(set(hari) | set(baris_th)) if y not in ok and (y in hari or baris_th.get(y)) and y >= 2011]
    akhir = min(dt.date.fromisoformat(dal_maks), dt.date.fromisoformat(dib_maks))
    awal = dt.date(min(ok), 1, 1)
    baris, n_pas, mentah = rekonsiliasi(dal, dib, awal, akhir, set(ok), hari_ada=ada)
    sebagian = [y for y in ok if akhir.year == y and akhir < dt.date(y, 12, 31)]
    b_penuh, m_penuh = tanpa_tahun(mentah, baris, set(sebagian))
    sens = []
    for w in SENSITIF:
        b, n, _ = rekonsiliasi(dal, dib, awal, akhir, set(ok), w, ada)
        t = ringkas(b, lambda r: "semua")["semua"]
        sens.append({"jendela_hari": w, "pasangan": n, "hanya_dalops": t["hanya_dalops"], "hanya_dibi": t["hanya_dibi"]})
    out = {
        "judul": "Rekonsiliasi Dalops lawan DIBI",
        "label": "temuan perbandingan, bukan penilaian sumber mana yang benar",
        "satuan": "hari x kabupaten x jenis; kejadian kembar sehari digabung",
        "jendela_hari": JENDELA,
        "cakupan": {"dalops_hari_logbook": {str(y): hari[y] for y in sorted(hari)}, "dibi_baris": {str(y): baris_th[y] for y in sorted(baris_th)},
                    "tahun_dibandingkan": ok, "tahun_dilewati": lewat, "tanggal_awal": awal.isoformat(), "tanggal_akhir": akhir.isoformat(),
                    "tahun_sebagian": sebagian,
                    "hanya_dibi_tanpa_logbook": sum(b[20] for b in baris),
                    "catatan_tanpa_logbook": "satuan DIBI tak berpasangan pada hari yang tidak punya logbook Dalops; dipisah dari hanya_dibi karena tidak bisa dibilang tak tercatat"},
        "tidak_dibandingkan": {"dalops_tanpa_kabupaten": tanpa, "dalops_kabupaten_dipetakan_ulang": selamat, "dalops_jenis_lain": dal_lain, "dalops_lintas_kabupaten_tanpa_dampak": multi,
                               "dibi_jenis_lain": dib_lain, "dibi_baris_total": len(dib), "dibi_baris_tak_terpetakan": sum(tak.values()), "dibi_kabupaten_tak_cocok": sum(tak.values()), "dibi_kabupaten_tak_cocok_nama": [f"{k}: {v}" for k, v in tak.most_common(10)]},
        "sensitivitas_jendela": sens,
        "kolom": KOLOM, "baris": baris,
        "prov_nama": {k: v for k, v in PROVINSI.items() if k in {b[0] for b in baris}},
        "nasional": tutup_kecil(rg(ringkas(baris, lambda b: "semua"), median_gabung(mentah, lambda k: "semua")))["semua"],
        "nasional_tahun_penuh": tutup_kecil(rg(ringkas(b_penuh, lambda b: "semua"), median_gabung(m_penuh, lambda k: "semua")))["semua"],
        "nasional_jenis": tutup_kecil(rg(ringkas(baris, lambda b: b[2]), median_gabung(mentah, lambda k: k[2]))),
        "nasional_jenis_tahun_penuh": tutup_kecil(rg(ringkas(b_penuh, lambda b: b[2]), median_gabung(m_penuh, lambda k: k[2]))),
        "nasional_tahun": tutup_kecil(rg(ringkas(baris, lambda b: str(b[1])), median_gabung(mentah, lambda k: str(k[1])))),
        "provinsi_semua": tutup_kecil(rg(ringkas(baris, lambda b: b[0]), median_gabung(mentah, lambda k: k[0]))),
        "provinsi_jenis": tutup_kecil(rg(ringkas(baris, lambda b: b[0] + "|" + b[2]), median_gabung(mentah, lambda k: k[0] + "|" + k[2]))),
        "hipotesis": ["Kejadian yang hanya ada di Dalops: BPBD belum mengisi DIBI, atau kejadian tercatat sebagai kabupaten lain (hipotesis, belum diuji).",
                      "Kejadian yang hanya ada di DIBI: tidak sampai ke piket Pusdalops BNPB (hipotesis, belum diuji).",
                      "Selisih korban dan rumah: Dalops membaca angka dari teks laporan awal dan DIBI memuat angka verifikasi BPBD, jadi angka naik atau turun menurut waktu lapor (hipotesis, belum diuji)."],
        "catatan": ["Hanya tahun yang dimiliki kedua sumber yang dibandingkan.", "Korban = meninggal + hilang. Rumah = rusak berat + sedang + ringan. Dampak Dalops adalah taksiran pengurai teks.",
                    "Dampak kejadian lintas kabupaten tidak dibandingkan. Median selisih dihitung hanya pada pasangan yang angkanya berbeda.",
                    "Tanggal DIBI adalah tanggal kejadian; tanggal Dalops adalah tanggal kejadian di logbook, dikoreksi ke tanggal catat bila selisih lebih dari 300 hari."],
    }
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    out = {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"), **out}
    cek_hasil(out)
    out.pop("baris"), out.pop("kolom")   # sel prov x tahun x jenis tidak dipakai layar; ringkasan prov x jenis cukup
    json.dump(out, open(KELUAR, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    t = ringkas(baris, lambda b: "semua")["semua"]
    print(f"rekonsiliasi: tahun {ok[0]}-{ok[-1]} sampai {akhir}, {len(baris)} baris; pasangan {t['pasangan']}, hanya Dalops {t['hanya_dalops']}, hanya DIBI {t['hanya_dibi']}")


def cek_hasil(o):
    """Invarian keluaran nyata: jumlah konsisten, tanpa data pribadi, tidak ada tahun di luar irisan."""
    t = o["cakupan"]["tahun_dibandingkan"]
    for b in o["baris"]:
        d = dict(zip(KOLOM, b))
        assert d["tahun"] in t and d["n_dalops"] == d["pasangan"] + d["hanya_dalops"] and d["n_dibi"] == d["pasangan"] + d["hanya_dibi"], b
        assert d["korban_sama"] + d["korban_dalops_lebih"] + d["korban_dibi_lebih"] == d["korban_banding"] <= d["pasangan"], b
        assert d["rumah_sama"] + d["rumah_dalops_lebih"] + d["rumah_dibi_lebih"] == d["rumah_banding"] <= d["pasangan"], b
        assert len(d["prov"]) == 2
    for kunci in ("provinsi_semua", "provinsi_jenis", "nasional_jenis", "nasional_tahun"):
        for k, v in o.get(kunci, {}).items():
            if v.get("kurang_dari_5"):
                assert all(x is None for a, x in v.items() if a != "kurang_dari_5"), (kunci, k, v)   # sel kecil: tak ada angka bocor
                continue
            assert v["n_dalops"] + v["n_dibi"] >= MIN_SEL, (kunci, k, v)
            for m in ("korban", "rumah"):
                assert v[m + "_banding"] >= MIN_SEL or v[m + "_selisih_median"] is None, (kunci, k, m)
    s = json.dumps(o, ensure_ascii=False)
    for terlarang in ("kronologi", "petugas", "dampak_teks", "id_kejadian", "LB1", "LB2"):
        assert terlarang not in s, terlarang


def cek():
    R = lambda i, jn, kab, t, **n: {"id": i, "jenis": jn, "kab": kab, "tgl": dt.date.fromisoformat(t), "nilai": n}
    a, z = dt.date(2020, 1, 1), dt.date(2020, 12, 31)
    D = lambda *x: list(x)
    # sama (korban sama, rumah beda), beda kabupaten (tidak cocok), kembar sehari digabung, tanpa dampak
    dal = D(R("d1", ("banjir",), "32|Bogor", "2020-03-01", korban=2, rumah=10, jeda=1),
            R("d2", ("banjir",), "32|Bogor", "2020-03-01", korban=1, rumah=None, jeda=0),     # kembar d1 -> korban 3, rumah 10
            R("d3", ("longsor",), "32|Kota Bogor", "2020-05-01", korban=None, rumah=None, jeda=2),   # DIBI di Kab. Bogor: tidak cocok
            R("d4", ("cuaca",), "33|Cilacap", "2020-06-01", korban=0, rumah=5, jeda=3))
    dib = D(R("b1", ("banjir",), "32|Bogor", "2020-03-02", korban=3, rumah=4),
            R("b2", ("longsor",), "32|Bogor", "2020-05-01", korban=0, rumah=0),
            R("b3", ("cuaca",), "33|Cilacap", "2020-06-01", korban=1, rumah=5),
            R("b4", ("gempa",), "33|Cilacap", "2020-06-01", korban=0, rumah=0),
            R("b5", ("banjir",), "32|Bogor", "2019-12-31", korban=0, rumah=0))                  # tahun 2019 tidak dibandingkan
    b, n, m = rekonsiliasi(dal, dib, a, z, {2020})
    d = {(x[0], x[2]): dict(zip(KOLOM, x)) for x in b}
    assert n == 2, n
    j = d[("32", "banjir")]
    assert (j["pasangan"], j["n_dalops"], j["n_dibi"], j["korban_banding"], j["korban_sama"], j["rumah_dalops_lebih"], j["rumah_selisih_median"], j["selisih_tgl_median"]) == (1, 1, 1, 1, 1, 1, 6.0, 1.0), j
    assert j["jeda_catat_median"] == 0, j        # satuan gabungan: jeda terkecil
    assert d[("32", "longsor")]["hanya_dalops"] == 1 and d[("32", "longsor")]["hanya_dibi"] == 1 and d[("32", "longsor")]["pasangan"] == 0   # beda kab
    c = d[("33", "cuaca")]
    assert c["korban_dibi_lebih"] == 1 and c["rumah_sama"] == 1 and c["korban_selisih_median"] == 1.0
    assert d[("33", "gempa")]["hanya_dibi"] == 1 and ("32", "banjir") in d
    assert sum(x[1] == 2019 for x in b) == 0
    # jendela: 0 hari tidak memasangkan banjir yang beda sehari
    b0, n0, _ = rekonsiliasi(dal, dib, a, z, {2020}, 0)
    assert n0 == 1, n0
    # ringkasan: persentase dari jumlah
    r = ringkas(b, lambda x: "semua")["semua"]
    assert r["pasangan"] == 2 and r["hanya_dalops"] == 1 and r["hanya_dibi"] == 2 and r["persen_dalops_ada_di_dibi"] == round(100 * 2 / 3, 1)
    mg = median_gabung(m, lambda k: "semua")["semua"]
    assert mg["selisih_tgl_median"] == 0.5 and mg["korban_selisih_median"] == 1.0 and mg["rumah_selisih_median"] == 6.0 and mg["jeda_catat_median"] == 2.0, mg   # median gabungan dari daftar mentah
    cek_hasil({"cakupan": {"tahun_dibandingkan": [2020]}, "baris": b})
    # nilai None tidak dihitung 0 saat digabung
    g = _gabung_satuan([R("x", ("banjir",), "k", "2020-01-01", korban=None), R("y", ("banjir",), "k", "2020-01-01", korban=None)])
    assert g[0]["nilai"]["korban"] is None
    # hari tanpa logbook: DIBI tunggal di hari itu masuk hanya_dibi_tanpa_logbook, bukan hanya_dibi
    ada = {dt.date(2020, 6, 1)}
    bl, _, _ = rekonsiliasi(dal, dib, a, z, {2020}, 3, ada)
    dl = {(x[0], x[2]): dict(zip(KOLOM, x)) for x in bl}
    assert dl[("33", "gempa")]["hanya_dibi"] == 1 and dl[("33", "gempa")]["hanya_dibi_tanpa_logbook"] == 0   # gempa 1 Jun: hari ada logbook
    assert dl[("32", "longsor")]["hanya_dibi"] == 0 and dl[("32", "longsor")]["hanya_dibi_tanpa_logbook"] == 1                                         # 1 Mei: tanpa logbook
    # sel kecil ditutup, median pasangan sedikit dikosongkan
    tk = tutup_kecil({"a": {"n_dalops": 2, "n_dibi": 1, "pasangan": 1, "hanya_dalops": 1, "hanya_dibi": 0, "korban_banding": 0, "rumah_banding": 0, "jeda_catat_median": 1},
                      "b": {"n_dalops": 9, "n_dibi": 9, "pasangan": 8, "korban_banding": 4, "korban_selisih_median": 2.0, "rumah_banding": 6, "rumah_selisih_median": 3.0}})
    assert tk["a"]["kurang_dari_5"] and tk["a"]["hanya_dalops"] is None and tk["a"]["jeda_catat_median"] is None
    assert tk["b"]["korban_selisih_median"] is None and tk["b"]["rumah_selisih_median"] == 3.0
    print("rekonsiliasi_dalops_dibi.py --cek hijau")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        if "--tarik" in sys.argv:
            tarik_dibi()
        main()
