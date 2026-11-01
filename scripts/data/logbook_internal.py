"""Turunan INTERNAL logbook Pusdalops (staf saja, tidak terbit di repo): rapor_bpbd.json dan rekomendasi.json.

Kontrak : docs/superpowers/specs/2026-11-01-logbook-turunan.md (produk 2 dan 6)
Masukan : data/raw/logbook/arsip/20??{,-*}/{kejadian,baris}.jsonl (tidak di-git); kode kab = logbook_bersih.kode_kab
Keluaran: data/raw/logbook/turunan/{rapor_bpbd,rekomendasi}.json (tidak di-git; sesi induk yang mengunggah ke R2)
Pakai   : python3 scripts/data/logbook_internal.py        (jalan penuh)
          python3 scripts/data/logbook_internal.py uji    (self-check fixture kecil)
Tanpa nama orang dan tanpa teks bebas di keluaran.
"""
import collections
import datetime as dt
import glob
import importlib.util
import json
import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARSIP = os.path.join(AKAR, "data/raw/logbook/arsip")
KELUAR = os.path.join(AKAR, "data/raw/logbook/turunan")
RIWAYAT = os.path.join(AKAR, "public/data/logbook_riwayat.json")
PERIODE_TERPISAH = ("2024", "2025", "2026")
MIN_N = 10          # anjuran layar: sembunyikan sel dengan n < MIN_N
MAKS_JEDA = 300     # hari; lebih dari ini = salah ketik tahun (sama dengan logbook_bersih.rekap)
BERULANG_TAHUN = 3
ISIAN = ("kecamatan", "desa", "kondisi", "upaya", "kebutuhan", "kendala")


def kuantil(xs, p):
    xs = sorted(xs)
    if not xs:
        return None
    i = (len(xs) - 1) * p
    a = int(i)
    b = min(a + 1, len(xs) - 1)
    return round(xs[a] + (xs[b] - xs[a]) * (i - a), 2)


def hari_antara(a, b):
    """b - a dalam hari; None bila salah satunya kosong atau bukan tanggal sah."""
    try:
        return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days
    except (TypeError, ValueError):
        return None


def tahun_kejadian(k):
    """tahun kejadian; bila tgl_kejadian kosong atau selisih ke catatan pertama > MAKS_JEDA (salah ketik), tahun catatan pertama."""
    sel = hari_antara(k.get("tgl_kejadian"), k.get("pertama_dicatat"))
    t = k.get("tgl_kejadian")
    if sel is None or abs(sel) > MAKS_JEDA:
        t = k.get("pertama_dicatat")
    return (t or "")[:4]


def isi(v):
    if isinstance(v, list):
        return any(str(x).strip() for x in v)
    return bool(str(v or "").strip())


# ---- rekomendasi: topik kata kunci (huruf kecil) ----
TOPIK = {
    "normalisasi_sungai": r"normalisasi|pengerukan|kerukan|pendalaman sungai|keruk",
    "tanggul": r"tanggul|turap|talud|tembok penahan|bronjong|krib|sheet pile",
    "relokasi": r"relokasi|direlokasi|pemindahan (warga|penduduk|permukiman)|hunian tetap|huntap|hunian sementara|huntara",
    "jalur_evakuasi": r"jalur evakuasi|titik kumpul|tempat evakuasi|shelter|rute evakuasi|lokasi pengungsian",
    "peringatan_dini": r"peringatan dini|\bews\b|early warning|sirine|sirene|alat deteksi|sensor",
    "sosialisasi": r"sosialisasi|edukasi|penyuluhan|simulasi|pelatihan|literasi|pembinaan",
    "alat_berat": r"alat berat|ekskavator|excavator|backhoe|bulldozer|\bbeko\b|dump truck",
    "logistik": r"logistik|sembako|bahan makanan|makanan siap saji|selimut|terpal|tenda|family kit|kebutuhan dasar|bantuan",
    "status_darurat": r"status darurat|tanggap darurat|siaga darurat|penetapan status|status siaga",
    "drainase": r"drainase|gorong|saluran air|parit|selokan|box culvert",
    "reboisasi_konservasi": r"reboisasi|penghijauan|penanaman|konservasi|rehabilitasi lahan|vegetasi|tanam pohon|revegetasi",
    "patroli_karhutla": r"patroli|pemadaman|water bombing|pembasahan|pembukaan lahan|larangan membakar|tidak membakar|dilarang membakar|\bmpa\b|\bdaops\b|karhutla",
    "sekat_kanal_embung": r"sekat kanal|embung|kanal|sumur bor|pembasahan gambut|canal blocking",
    "perbaikan_jalan_jembatan": r"perbaikan (jalan|jembatan)|jembatan|akses jalan|jalan (rusak|putus)|perbaiki jalan|penanganan jalan",
    "imbauan_kewaspadaan": r"waspada|kewaspadaan|mewaspadai|himbau|imbau|menjauhi|tidak beraktivitas|hindari",
}
TOPIK_RE = {k: re.compile(v) for k, v in TOPIK.items()}
KALIMAT_REKOM = re.compile(r"\b(perlu|agar|diharapkan)\b")


def kalimat(teks):
    return [s.strip().lower() for s in re.split(r"[\n;]|\.\s", teks or "") if s.strip()]


def topik_teks(teks):
    """himpunan topik pada satu teks (kalimat demi kalimat tidak perlu: kejadian dihitung sekali per topik)."""
    t = (teks or "").lower()
    return {k for k, r in TOPIK_RE.items() if r.search(t)}


def teks_rekom(b):
    """(teks, jalur): kolom rekomendasi; bila kosong, kalimat 'perlu/agar/diharapkan' di upaya + kondisi."""
    if isi(b.get("rekomendasi")):
        return b["rekomendasi"], "rekomendasi"
    kal = [s for f in ("upaya", "kondisi") for s in kalimat(b.get(f)) if KALIMAT_REKOM.search(s)]
    return ("\n".join(kal), "kalimat") if kal else ("", "")


# ---- pembaca arsip ----
def berkas(nama):
    return sorted(glob.glob(os.path.join(ARSIP, f"20??/{nama}.jsonl")) + glob.glob(os.path.join(ARSIP, f"20??-*/{nama}.jsonl")))


def baca(nama):
    for f in berkas(nama):
        with open(f, encoding="utf-8") as h:
            for l in h:
                yield json.loads(l)


def muat_kode_kab():
    s = importlib.util.spec_from_file_location("logbook_bersih", os.path.join(AKAR, "scripts/data/logbook_bersih.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    cache = {}

    def kode(k):
        kunci = (tuple(k.get("kabkota") or ()), tuple(k.get("prov_kode") or ()))
        if kunci not in cache:
            cache[kunci] = m.kode_kab(k)
        return cache[kunci]
    return kode


# ---- inti ----
def bangun(kejadian, baris_iter, kode_kab, tahun_dasar):
    """-> (rapor, rekomendasi) dari iterator kejadian dan baris. Bebas berkas: dipakai juga oleh uji."""
    kej = {}      # id -> (tahun, [kab], [prov], k)
    namaprov = collections.defaultdict(collections.Counter)
    for k in kejadian:
        kabs = kode_kab(k)
        if not kabs:
            continue
        pn = k.get("prov") or []
        pk = k.get("prov_kode") or []
        if len(pn) == len(pk):
            for c, n in zip(pk, pn):
                namaprov[c][n] += 1
        kej[k["id_kejadian"]] = (tahun_kejadian(k), kabs, k)

    def periode_dari(y):
        return [p for p in ("dasar",) if y in tahun_dasar] + ([y] if y in PERIODE_TERPISAH else [])

    # sel[(tingkat, kunci, periode)] -> penampung
    def baru():
        return {"n": 0, "jeda": [], "jeda_dibuang": 0, "pantau": [], "sekali": 0, "entri": 0, "isian": collections.Counter()}
    sel = collections.defaultdict(baru)

    def kunci_sel(kabs):
        out = [("kab", kb) for kb in kabs] + [("prov", p) for p in sorted({kb.split("|")[0] for kb in kabs})] + [("nasional", "ID")]
        return out

    for _id, (y, kabs, k) in kej.items():
        j = hari_antara(k.get("tgl_kejadian"), k.get("pertama_dicatat"))
        ok_j = j is not None and 0 <= j <= MAKS_JEDA
        lp = hari_antara(k.get("pertama_dicatat"), k.get("terakhir_dicatat"))
        for per in periode_dari(y):
            for t, kk in kunci_sel(kabs):
                s = sel[(t, kk, per)]
                s["n"] += 1
                if ok_j:
                    s["jeda"].append(j)
                else:
                    s["jeda_dibuang"] += 1
                if lp is not None and lp >= 0:
                    s["pantau"].append(lp)
                s["sekali"] += (k.get("n_laporan") or 0) == 1

    # rekomendasi[(kab, topik)] -> tahun->set(id) dan jenis
    ev_topik = {}   # id -> (set topik, jalur)
    for b in baris_iter:
        e = kej.get(b.get("id_kejadian"))
        if not e:
            continue
        y, kabs, _k = e
        pers = periode_dari(y)
        pen = [isi(b.get(f)) for f in ISIAN]
        for per in pers:
            for t, kk in kunci_sel(kabs):
                s = sel[(t, kk, per)]
                s["entri"] += 1
                for f, a in zip(ISIAN, pen):
                    s["isian"][f] += a
        teks, jalur = teks_rekom(b)
        if teks:
            tp = topik_teks(teks)
            if tp:
                lama = ev_topik.get(b["id_kejadian"])
                # jalur kolom 'rekomendasi' menang atas kalimat; topik antar-baris digabung dalam jalur yang sama
                if lama is None or (jalur == "rekomendasi" and lama[1] == "kalimat"):
                    ev_topik[b["id_kejadian"]] = (tp, jalur)
                elif lama[1] == jalur:
                    lama[0].update(tp)

    def rapor_sel(s):
        n = s["n"]
        e = s["entri"]
        return {"n": n,
                "jeda_hari": {"n": len(s["jeda"]), "median": kuantil(s["jeda"], .5), "p75": kuantil(s["jeda"], .75)},
                "lama_pantau_hari": {"n": len(s["pantau"]), "median": kuantil(s["pantau"], .5)},
                "sekali_pct": round(100 * s["sekali"] / n, 1) if n else None,
                "entri": e,
                "lengkap_pct": {f: (round(100 * s["isian"][f] / e, 1) if e else None) for f in ISIAN}}

    rapor = {"kab": {}, "prov": {}, "nasional": {}}
    for (t, kk, per), s in sel.items():
        if t == "nasional":
            rapor["nasional"][per] = rapor_sel(s)
        else:
            rapor[t].setdefault(kk, {})[per] = rapor_sel(s)
    rapor["nama_prov"] = {c: n.most_common(1)[0][0] for c, n in namaprov.items()}

    rek = collections.defaultdict(lambda: collections.defaultdict(lambda: {"tahun": collections.Counter(), "jenis": collections.Counter()}))
    nas = collections.defaultdict(lambda: {"tahun": collections.Counter(), "jenis": collections.Counter()})
    jalur_n = collections.Counter()
    for _id, (tp, jalur) in ev_topik.items():
        y, kabs, k = kej[_id]
        jalur_n[jalur] += 1
        for tpk in tp:
            nas[tpk]["tahun"][y] += 1
            nas[tpk]["jenis"][k["jenis"]] += 1
            for kb in kabs:
                r = rek[kb][tpk]
                r["tahun"][y] += 1
                r["jenis"][k["jenis"]] += 1

    def sel_rek(r):
        th = sorted(r["tahun"])
        return {"tahun": th, "n_kejadian": sum(r["tahun"].values()), "n_per_tahun": dict(sorted(r["tahun"].items())),
                "jenis": dict(r["jenis"].most_common()), "berulang": len(th) >= BERULANG_TAHUN}

    rekom = {"kab": {kb: {tpk: sel_rek(v) for tpk, v in sorted(d.items())} for kb, d in sorted(rek.items())},
             "nasional": {tpk: sel_rek(v) for tpk, v in sorted(nas.items())},
             "jalur_n_kejadian": dict(jalur_n)}
    return rapor, rekom


def uji():
    kode = lambda k: [f"{p}|{n}" for p, n in zip(k["prov_kode"], k["kabkota"])]
    kj = [
        {"id_kejadian": "A", "jenis": "banjir", "tgl_kejadian": "2024-01-01", "pertama_dicatat": "2024-01-03", "terakhir_dicatat": "2024-01-07",
         "n_laporan": 3, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"]},
        {"id_kejadian": "B", "jenis": "banjir", "tgl_kejadian": "2024-02-01", "pertama_dicatat": "2024-02-01", "terakhir_dicatat": "2024-02-01",
         "n_laporan": 1, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"]},
        {"id_kejadian": "C", "jenis": "longsor", "tgl_kejadian": "", "pertama_dicatat": "2025-03-01", "terakhir_dicatat": "2025-03-01",
         "n_laporan": 1, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"]},
        {"id_kejadian": "D", "jenis": "banjir", "tgl_kejadian": "2023-01-01", "pertama_dicatat": "2025-01-05", "terakhir_dicatat": "2025-01-05",
         "n_laporan": 1, "prov": ["P"], "prov_kode": ["11"], "kabkota": ["Kab. X"]},
    ]
    br = [
        {"id_kejadian": "A", "kecamatan": ["K"], "desa": [], "kondisi": "ok", "upaya": "Perlu normalisasi sungai dan tanggul.", "kebutuhan": "", "kendala": "", "rekomendasi": ""},
        {"id_kejadian": "B", "kecamatan": [], "desa": ["D"], "kondisi": "", "upaya": "x", "kebutuhan": "tenda", "kendala": "", "rekomendasi": "Agar dibangun tanggul"},
        {"id_kejadian": "C", "kecamatan": ["K"], "desa": [], "kondisi": "", "upaya": "", "kebutuhan": "", "kendala": "", "rekomendasi": "sosialisasi dan EWS"},
    ]
    rp, rk = bangun(iter(kj), iter(br), kode, {"2024"})
    c = rp["kab"]["11|Kab. X"]
    assert c["dasar"]["n"] == 2 and c["2024"]["n"] == 2 and c["2025"]["n"] == 2 and "2026" not in c
    assert c["2024"]["jeda_hari"] == {"n": 2, "median": 1.0, "p75": 1.5}, c["2024"]["jeda_hari"]
    assert c["2025"]["jeda_hari"]["n"] == 0 and c["2025"]["jeda_hari"]["median"] is None   # C kosong, D 734 hari dibuang
    assert c["2024"]["lama_pantau_hari"]["median"] == 2.0 and c["2024"]["sekali_pct"] == 50.0
    assert c["2024"]["entri"] == 2 and c["2024"]["lengkap_pct"]["kecamatan"] == 50.0 and c["2024"]["lengkap_pct"]["kebutuhan"] == 50.0
    t = rk["kab"]["11|Kab. X"]
    assert t["normalisasi_sungai"]["n_kejadian"] == 1 and t["tanggul"]["n_kejadian"] == 2   # A lewat kalimat, B lewat kolom
    assert set(t["sosialisasi"]["jenis"]) == {"longsor"} and t["peringatan_dini"]["tahun"] == ["2025"]
    assert not t["tanggul"]["berulang"]
    assert tahun_kejadian(kj[3]) == "2025" and tahun_kejadian(kj[2]) == "2025"
    assert kuantil([1, 2, 3, 4], .75) == 3.25
    print("uji logbook_internal: OK")


def main():
    kode = muat_kode_kab()
    dasar = set(json.load(open(RIWAYAT, encoding="utf-8"))["tahun_penuh"])
    rapor, rekom = bangun(baca("kejadian"), baca("baris"), kode, dasar)
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    os.makedirs(KELUAR, exist_ok=True)
    rapor_out = {
        "dibuat": now, "min_n": MIN_N,
        "periode": {"dasar": sorted(dasar), "terpisah": list(PERIODE_TERPISAH)},
        "catatan": [
            "Logbook mencatat waktu MASUK ke Pusdalops, bukan waktu BPBD tahu. Jeda bisa karena jalur pelaporan, bukan kinerja BPBD.",
            "Jangan dibaca sebagai peringkat tanpa konteks. Sembunyikan sel dengan n < min_n.",
            "Staf saja. Tahun 2011-2013 dan 2022-2023 tidak lengkap; 2026 berjalan (kejadian terbaru belum sempat dilaporkan ulang, sekali_pct condong tinggi).",
            "Isian kebutuhan, kendala, dan kondisi baru lazim terisi pada format logbook terbaru; angka tahun dasar lama rendah karena formatnya, bukan kelalaian.",
        ],
        "definisi": {
            "jeda_hari": f"tgl_logbook pertama kejadian dikurangi tgl_kejadian, dalam HARI penuh (0 = dicatat hari yang sama). Dibuang: tgl_kejadian kosong/bukan tanggal, negatif, atau > {MAKS_JEDA} hari (salah ketik tahun). n = yang tersisa.",
            "jeda_jam": "tidak tersedia: entri pertama logbook tidak membawa jam laporan (jam_update hanya ada pada entri update), jadi jeda jam tidak dihitung.",
            "lama_pantau_hari": "terakhir_dicatat dikurangi pertama_dicatat, hari; 0 bila hanya satu hari.",
            "sekali_pct": "persen kejadian dengan n_laporan = 1 (muncul di satu entri logbook saja).",
            "lengkap_pct": "persen ENTRI (baris logbook, termasuk update) yang kolomnya terisi; penyebut = entri.",
            "periode": "dasar = tahun_penuh logbook_riwayat.json; 2024/2025/2026 = per tahun kejadian (tahun catatan pertama bila tgl_kejadian salah). Satu kejadian lintas kab dihitung di tiap kab; di prov, sekali per prov.",
        },
        **rapor,
    }
    rekom_out = {
        "dibuat": now, "berulang_bila_tahun_ge": BERULANG_TAHUN,
        "catatan": [
            "Tanpa teks asli: hanya topik kata kunci. Satu kejadian dihitung sekali per topik, satu kejadian bisa bertopik banyak.",
            "Kolom rekomendasi terisi jarang sebelum 2024 (di bawah 3% entri); bila kosong dipakai kalimat berawalan perlu/agar/diharapkan di kolom upaya dan kondisi (lihat jalur_n_kejadian). Jalur kalimat lebih berisik.",
            "Topik kata kunci kasar (regex), bukan klasifikasi makna; 'berulang' = muncul di >= 3 tahun berbeda.",
            "Tahun 2011-2013 dan 2022-2023 tidak lengkap, jadi 'berulang' bisa terpotong.",
        ],
        "topik": {k: v for k, v in TOPIK.items()}, **rekom,
    }
    for nama, d in (("rapor_bpbd", rapor_out), ("rekomendasi", rekom_out)):
        p = os.path.join(KELUAR, nama + ".json")
        with open(p, "w", encoding="utf-8") as h:
            json.dump(d, h, ensure_ascii=False, separators=(",", ":"))
        print(f"{os.path.relpath(p, AKAR)}: {os.path.getsize(p) / 1024:.0f} KB")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
