"""Uji PROSPEKTIF model "akan membesar": catat ramalan untuk tiap titik api baru saat ia muncul, nilai 72 jam kemudian.

Tidak ada data masa depan yang bisa bocor: ramalan ditulis sekali (append-only) dengan waktu terbit, lalu dinilai setelah
FIRMS memuat 72 jam berikutnya. Dijalankan di CI tiap 3 jam (.github/workflows/titik.yml, langkah boleh gagal), stdlib saja.

Sumber: public/data/hotspot.json dari harian.py (7 hari, VIIRS S-NPP 'N', NOAA-20 'N20' & NOAA-21 'N21', keyakinan nominal/tinggi) — tanpa
panggilan FIRMS tambahan. "VIIRS utama" sadar waktu (sensor.py): 'N' sebelum SNPP_AKHIR (1 Nov 2026 13:00 UTC, distribusi S-NPP berhenti), 'N21' sesudahnya;
komponen/label72/fitur hanya memakai seri utama itu. Tiap ramalan membawa sensor_utama + kelompok ("N" | "N21" | "peralihan": jendela fitur 7 hari/label 72 jam
memuat batas). Metrik utama (mode.*, kriteria, vonis) HANYA dari kelompok "N"; "N21" dan "peralihan" dinilai terpisah di per_sensor. Pergeseran distribusi
N21 vs S-NPP BELUM diukur (lihat sensor.py untuk usulan skrip pembanding), jadi ramalan N21 tidak boleh dibaca sebagai bukti model S-NPP. Deteksi digabung ke gudang bergulir 12 hari (titik.json.gz) supaya fitur 7 hari & label 72 jam lengkap.
Titik api baru = komponen S-NPP (<= 750 m & <= 24 jam, lacak.hubungkan) yang deteksi pertamanya berumur 6-24 jam, di
9 provinsi prioritas. Cuaca = Open-Meteo forecast (33 hari lalu + 3 hari ke depan) per sel 0,5 derajat, di-cache per hari,
anggaran bobot per jalan MAKS_BOBOT (kuota 10.000/hari). Model & ambang = model_sebaran.json "lolos" dan "lolos_ulang"
(ramal ulang 14 jam setelah deteksi pertama). Label = sel 375 m S-NPP yang terhubung dengan titik itu dalam 72 jam >= 10.

PRA-REGISTRASI (23 Okt 2026): kriteria beku di KRITERIA (n_dinilai >= 200, n_lolos >= 20, batas bawah AUC 95% >= 0,80, Brier skill > 0) -> vonis
"belum_cukup_data" | "lolos" | "gagal" dihitung dari metrik nyata di prospektif.json; kesehatan.macet = alarm bila musim aktif tetapi tak ada yang dinilai 7 hari.

Catatan: data/raw/sebaran/prospektif/ramalan.jsonl, nilai.jsonl (append-only); ringkasan: public/data/prospektif.json.
Pakai:  python3 scripts/sebaran/prospektif.py  |  ... uji  |  ... arsip <tujuan.jsonl.gz>  |  ... pulih <sumber.jsonl.gz>
Uji balik historis (bukan prospektif): scripts/sebaran/prospektif_historis.py
"""
import datetime as dt, gzip, json, math, os, random, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import lolos as LL  # noqa: E402
from lacak import hubungkan  # noqa: E402
import sensor as SN  # noqa: E402
from umum import MENTAH, PUBLIK, PRIORITAS, T0, pusat, sel  # noqa: E402

RIWAYAT_HARI = float(os.environ.get("PROSPEKTIF_RIWAYAT_HARI", "7"))  # < 7 hanya uji alur (fitur 7 hari terpotong): folder & ringkasan terpisah
FOLDER = os.path.join(MENTAH, "prospektif" if RIWAYAT_HARI >= 7 else "prospektif_uji_alur")
GUDANG = os.path.join(FOLDER, "titik.json.gz")
RAMALAN = os.path.join(FOLDER, "ramalan.jsonl")
NILAI = os.path.join(FOLDER, "nilai.jsonl")
VONIS_BERKAS = os.path.join(FOLDER, "vonis.jsonl")  # vonis go/no-go TERKUNCI sekali (append-only, ikut arsip j=v)
GERBANG = os.path.join(FOLDER, "gerbang.jsonl")  # vonis gerbang per evaluasi (append-only, ikut arsip): dasar syarat dua evaluasi berturut-turut
CUACA = os.path.join(FOLDER, "cuaca")
RINGKAS = os.path.join(PUBLIK, "prospektif.json") if RIWAYAT_HARI >= 7 else os.path.join(FOLDER, "ringkasan.json")
SIMPAN_HARI = 12
UMUR_MIN, UMUR_MAKS = 6 * 60, 24 * 60  # menit sesudah deteksi pertama: jendela NOAA-20 +-3 jam tertutup & sudah masuk NRT
JEDA_NILAI = 72 * 60 + 6 * 60  # 72 jam + keterlambatan NRT
# Gerbang tampil peluang "akan membesar" di layar (semua harus terpenuhi, mode awal):
N_MIN_DINILAI = 300   # ASUMSI: ~17% lolos (teramati prospektif 20 Okt 2026: 149 dari 882) => ~50 kasus lolos
N_MIN_LOLOS = 50      # ASUMSI: dengan 50 kasus, setengah lebar CI95 recall ~ +-0,13 (Wilson); lebih sedikit = recall belum bisa dipegang
TOLERANSI_RECALL = 0.15  # ASUMSI: batas bawah CI95 recall prospektif >= klaim model (model_sebaran.json lolos.kinerja.uji2_recall) - 0,15


# Gerbang KALIBRASI (tambahan di atas gerbang recall; semua mode awal). Peluang yang tampil di layar harus bisa dipercaya sebagai peluang,
# bukan hanya mengurutkan titik:
ECE_MAKS = 0.08   # ASUMSI: selisih rata-rata |teramati - diramal| per kantong <= 8 poin. Laju dasar ~17%: "20%" di layar boleh berarti 12-28%, tidak lebih.
                  # Dengan 10 kantong kuantil @ n=300 (30 per kantong) galat sampling ECE model SEMPURNA ~0,05; 0,08 menyisakan margin ~3 poin untuk
                  # salah kalibrasi sungguhan, jadi ambang ini tidak bisa dilolosi dengan n kecil yang kebetulan bagus dan tidak dihukum karena noise.
# Tiga tambahan setelah tinjauan 22 Okt 2026 (ECE titik pada data kumulatif mulai n=300 = berhenti-opsional, dan buta skala):
KAL_BESAR = (0.75, 1.33)  # kalibrasi-secara-umum: selang Wilson laju teramati harus beririsan dengan [0,75; 1,33] x rata-rata peluang diramal
BOOT_B, BOOT_PCT = 200, 0.90  # ECE dinilai dari persentil ke-90 bootstrap (bukan titik): <= ECE_MAKS
TAMBAH_MIN = 30   # evaluasi "berturut" hanya dihitung bila n dinilai bertambah >= 30 (satu kantong) sejak evaluasi lulus sebelumnya; jalan tanpa data baru tak dihitung
RASIO_LAJU_MAKS = 2.0  # laju api besar prospektif vs laju saat model dikalibrasi: beda > 2x (ke atas/bawah) menolak teruji kecuali sudah direkalibrasi pada data prospektif
SKILL_MIN = 0.0   # Brier skill terhadap klimatologi (laju dasar himpunan yang sama) harus > 0: peluang harus mengalahkan "selalu bilang laju dasar".
KANTONG = 10
KANTONG_MIN_N = 30  # kantong < 30 titik terlalu berisik: jumlah kantong diturunkan (n // 30), minimal 2


def wilson(k, n, z=1.96):
    """Selang Wilson 95% (bawah, atas) untuk proporsi k/n."""
    if n <= 0:
        return None, None
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    r = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, (c - r) / d), min(1.0, (c + r) / d)


def wilson_bawah(k, n, z=1.96):
    return wilson(k, n, z)[0]


def kalibrasi(p, y, k=KANTONG):
    """Kurva reliabilitas: kantong KUANTIL (sama banyak titik; peluang menumpuk di bawah, kantong lebar-sama akan kosong di atas).
    Tiap kantong: n, rata-rata peluang diramal, laju teramati, Wilson 95%. ECE = sum(n_b/n * |teramati - diramal|).
    Brier skill = 1 - Brier / Brier klimatologi, klimatologi = selalu meramal laju dasar himpunan ini (ukuran yang generous ke klimatologi)."""
    n = len(y)
    if n < 2 * KANTONG_MIN_N:
        return None
    k = max(2, min(k, n // KANTONG_MIN_N))
    o = sorted(range(n), key=lambda i: p[i])
    bins, ece = [], 0.0
    for b in range(k):
        idx = o[b * n // k:(b + 1) * n // k]
        nb, pr, ob = len(idx), sum(p[i] for i in idx) / len(idx), sum(y[i] for i in idx)
        lo, hi = wilson(ob, nb)
        bins.append({"n": nb, "p_diramal": round(pr, 4), "teramati": round(ob / nb, 4), "lo": round(lo, 4), "hi": round(hi, 4),
                     "p_min": round(p[idx[0]], 4), "p_maks": round(p[idx[-1]], 4)})
        ece += nb / n * abs(ob / nb - pr)
    br = sum((pi - yi) ** 2 for pi, yi in zip(p, y)) / n
    dasar = sum(y) / n
    klim = dasar * (1 - dasar)
    return {"n": n, "kantong": bins, "ece": round(ece, 4), "brier": round(br, 4), "brier_klimatologi": round(klim, 4),
            "brier_skill": round(1 - br / klim, 4) if klim > 0 else None, "laju_dasar": round(dasar, 4)}


def metrik_set(p, y, w):
    """Ringkasan satu himpunan ramalan bernilai (bentuk SAMA untuk prospektif.json dan prospektif_historis.json)."""
    import gbdt as G
    tp = sum(a and b for a, b in zip(w, y))
    return {"dinilai": len(y), "lolos": sum(y), "waspada": sum(w), "tepat": tp,
            "recall": round(tp / sum(y), 3) if sum(y) else None, "presisi": round(tp / sum(w), 3) if sum(w) else None,
            "alarm_palsu_per_tidak_lolos": round((sum(w) - tp) / (len(y) - sum(y)), 3) if len(y) > sum(y) else None,
            "auc": round(G.auc(p, y), 3) if 0 < sum(y) < len(y) else None, "brier": round(G.brier(p, y), 4) if y else None,
            "peluang_rata": round(sum(p) / len(p), 4) if p else None, "laju_teramati": round(sum(y) / len(y), 4) if y else None,
            "kalibrasi": kalibrasi(p, y)}


def di_besar(p, y):
    """Kalibrasi-secara-umum: Wilson 95% laju teramati beririsan dengan [KAL_BESAR] x rata-rata peluang diramal (peka skala, tak seperti ECE mutlak)."""
    n = len(y)
    lo, hi = wilson(sum(y), n)
    mp = sum(p) / n
    return {"teramati": round(sum(y) / n, 4), "lo": round(lo, 4), "hi": round(hi, 4), "rata_p": round(mp, 4),
            "ok": lo <= KAL_BESAR[1] * mp and hi >= KAL_BESAR[0] * mp}


def ece_p90(p, y, b=BOOT_B, persen=BOOT_PCT, benih=7):
    """Persentil bootstrap ECE (resampel titik dengan pengembalian, benih tetap): batas atas, bukan taksiran titik."""
    rnd, n, e = random.Random(benih), len(y), []
    for _ in range(b):
        ix = [rnd.randrange(n) for _ in range(n)]
        e.append(kalibrasi([p[i] for i in ix], [y[i] for i in ix])["ece"])
    return sorted(e)[math.ceil(persen * b) - 1]


def gerbang_kalibrasi(p, y):
    """kalibrasi() + ece_p90 + di_besar (dipakai HANYA untuk prospektif; uji balik historis n ~1e5 cukup ECE titik). None bila n terlalu kecil."""
    kal = kalibrasi(p, y)
    if kal is None:
        return None
    kal["ece_p90"], kal["di_besar"] = round(ece_p90(p, y), 4), di_besar(p, y)
    return kal


def kalibrasi_lolos(kal):
    """Lolos gerbang kalibrasi? kal = kalibrasi() (None = n terlalu kecil = belum lolos). Bila ada ece_p90/di_besar (prospektif) keduanya yang menentukan."""
    return bool(kal and kal.get("ece_p90", kal["ece"]) <= ECE_MAKS and kal.get("di_besar", {"ok": True})["ok"]
                and kal["brier_skill"] is not None and kal["brier_skill"] > SKILL_MIN)


def laju_sejalan(prosp, model, rekalibrasi):
    """(ok, rasio): laju api besar prospektif vs laju saat Platt dikalibrasi. Beda > RASIO_LAJU_MAKS x ditolak kecuali sudah direkalibrasi pada data prospektif."""
    if not prosp or not model:
        return bool(rekalibrasi), None
    r = prosp / model
    return bool(rekalibrasi) or 1 / RASIO_LAJU_MAKS <= r <= RASIO_LAJU_MAKS, round(r, 2)


def berturut(riwayat, n, lulus):
    """(dua_berturut, perlu_dicatat). riwayat = vonis lama [{n, lulus}]. Teruji hanya bila evaluasi ini lulus DAN evaluasi lulus sebelumnya
    (dengan >= TAMBAH_MIN dinilai lebih sedikit) juga lulus: satu lulus kebetulan di n kecil tidak cukup."""
    lama = max((r for r in riwayat if r["n"] <= n - TAMBAH_MIN), key=lambda r: r["n"], default=None)
    return bool(lulus and lama and lama["lulus"]), not any(r["n"] == n for r in riwayat)


MAKS_BOBOT = float(os.environ.get("PROSPEKTIF_BOBOT", "400"))
URL = "https://api.open-meteo.com/v1/forecast"


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def menit_dari(t):
    return (t - T0).total_seconds() / 60


# ---------------- gudang deteksi ----------------
def muat_gudang():
    if os.path.exists(GUDANG):
        with gzip.open(GUDANG, "rt") as f:
            return json.load(f)
    return []


def gabung(lama, hs):
    """hotspot.json -> baris [menit, lat, lon, sensor, frp, prov], digabung & dipangkas ke SIMPAN_HARI terakhir."""
    acuan = dt.datetime.fromisoformat(hs["acuan"])
    a0 = menit_dari(acuan)
    baru = []
    for la, lo, jam, s, frp, c, w, _ in hs["baris"]:
        m = math.floor(a0 + jam * 60 + 1e-6)  # menit BULAT ke bawah (bukan round): deteksi pada menit 779,5-780 harus tetap S-NPP, tidak melompat ke sisi N21 batas SNPP_AKHIR
        if (s in ("N", "N20") or (s == "N21" and m >= SN.menit_akhir())) and c >= 1:  # N21 sebelum batas tak dipakai (hemat gudang)
            baru.append([m, la, lo, s, frp, hs["wilayah"][w].split("|")[0]])  # menit bulat: jam di hotspot.json dibulatkan 0,01 jam terhadap acuan yang berganti, pecahan menit tidak stabil antarjalan
    out = list({(round(r[0]), r[1], r[2], r[3]): r for r in lama + baru}.values())
    out = [r for r in out if r[0] >= a0 - SIMPAN_HARI * 1440]
    out.sort(key=lambda r: r[0])
    return out, a0


# ---------------- titik api baru ----------------
def komponen(snpp):
    akar, _, _ = hubungkan([r[0] for r in snpp], [r[1] for r in snpp], [r[2] for r in snpp])
    g = {}
    for i, a in enumerate(akar):
        g.setdefault(a, []).append(i)
    return g


def label72(snpp, idx_awal, t0):
    """Sel 375 m berbeda yang terjangkau dari deteksi lintasan pertama lewat sambungan <= 750 m & <= 24 jam di [t0, t0 + 72 jam]."""
    daf = [i for i, r in enumerate(snpp) if t0 <= r[0] <= t0 + 72 * 60]
    kotak = {}
    for i in daf:
        r = snpp[i]
        kotak.setdefault((math.floor(r[2] / .0075), math.floor(r[1] / .0075)), []).append(i)
    lihat, antre = set(idx_awal), list(idx_awal)
    while antre:
        a = antre.pop()
        ra = snpp[a]
        gx, gy = math.floor(ra[2] / .0075), math.floor(ra[1] / .0075)
        kx = 111320 * math.cos(math.radians(ra[1]))
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for b in kotak.get((gx + dx, gy + dy), ()):
                    if b in lihat:
                        continue
                    rb = snpp[b]
                    if abs(rb[0] - ra[0]) <= 24 * 60 and math.hypot((rb[2] - ra[2]) * kx, (rb[1] - ra[1]) * 110574) <= 750:
                        lihat.add(b)
                        antre.append(b)
    return len({sel(snpp[i][2], snpp[i][1]) for i in lihat})


# ---------------- cuaca ----------------
def cuaca_sel(daftar, hari):
    """daftar sel 0,5 (lat, lon) -> {(lat, lon): dict cuaca} untuk 'hari' (YYYY-MM-DD), cache per hari, anggaran MAKS_BOBOT."""
    import cuaca
    os.makedirs(CUACA, exist_ok=True)
    out, perlu = {}, []
    for la, lo in daftar:
        j = os.path.join(CUACA, f"{hari}_{la:.2f}_{lo:.2f}.json")
        if os.path.exists(j):
            out[(la, lo)] = json.load(open(j))
        else:
            perlu.append((la, lo))
    bobot1 = cuaca.bobot(33 + 3)
    perlu = perlu[:int(MAKS_BOBOT // bobot1)]
    for a in range(0, len(perlu), 20):
        g = perlu[a:a + 20]
        q = {"latitude": ",".join(str(x[0]) for x in g), "longitude": ",".join(str(x[1]) for x in g), "hourly": ",".join(cuaca.VAR),
             "past_days": 33, "forecast_days": 3, "timezone": "GMT", "wind_speed_unit": "kmh"}
        try:
            d = cuaca.ambil(URL + "?" + urllib.parse.urlencode(q), coba=2, batas_waktu=120)
        except Exception as e:
            log("cuaca gagal:", e)
            break
        for (la, lo), r in zip(g, d if isinstance(d, list) else [d]):
            h = r["hourly"]
            c = {"lat": la, "lon": lo, "mulai": h["time"][0], **{k: h[v] for k, v in zip(cuaca.KOLOM, cuaca.VAR)}}
            json.dump(c, open(os.path.join(CUACA, f"{hari}_{la:.2f}_{lo:.2f}.json"), "w"))
            out[(la, lo)] = c
    for f in os.listdir(CUACA):  # buang cache > 5 hari
        if f[:10] < (dt.date.fromisoformat(hari) - dt.timedelta(days=5)).isoformat():
            os.remove(os.path.join(CUACA, f))
    return out


# ---------------- ramal ----------------
def fitur_titik(K, M, S, rs, t0, lon0, lat0, prov, snpp_idx, n20_idx, ulang):
    from fitur import terakhir
    w = S.jendela(int(t0))
    pertama = [r for r in rs if r[0] - t0 <= 30]
    sel0 = sorted({sel(r[2], r[1]) for r in pertama})
    s = K.sel(sel(rs[0][2], rs[0][1]), prov)  # sel deteksi pertama (= det[0] di data latih)
    tgl = T0 + dt.timedelta(minutes=t0)
    oni, dmi = terakhir(M["iklim"]["oni"], tgl.year, tgl.month), terakhir(M["iklim"]["dmi"], tgl.year, tgl.month)
    jam_lokal = ((t0 + lon0 * 4) / 60) % 24
    u = None
    if ulang:
        sampai = [r for r in rs if r[0] <= t0 + LL.ULANG_MENIT]
        lagi = [r for r in sampai if r[0] > t0 + 60]
        sel14 = sorted({sel(r[2], r[1]) for r in sampai})
        u = {"n14": len(sel14), "frp14": max([r[4] for r in lagi] or [0.0]), "lagi14": 1 if lagi else 0,
             "n20_14": LL.n20_sekitar(n20_idx, sel14, t0 - 180, t0 + LL.ULANG_MENIT + 1)}
    v = LL.fitur_lolos(w, s, tgl.year, len(sel0), max(r[4] for r in pertama), sum(r[4] for r in pertama), 0 if 6 <= jam_lokal < 18 else 1, oni, dmi,
                       LL.konteks(snpp_idx, t0, lon0, lat0), LL.n20_sekitar(n20_idx, sel0, t0 - 180, t0 + 181), u)
    st = "sabana" if prov in ("53", "93") and not s["gambut"] else "gambut" if s["gambut"] else "mineral"
    return v, st


def baca_jsonl(j):
    return [json.loads(l) for l in open(j)] if os.path.exists(j) else []


def nilai_baru(ramalan, dinilai, snpp, a0, t_awal, acuan):
    """Baris nilai.jsonl baru untuk ramalan yang 72 jam (+ jeda NRT) sudah lewat. Deteksi awal dicocokkan menurut LOKASI (lat, lon persis)
    dan menit +-1, bukan menit pecahan persis: gudang & ramalan lama bisa berbeda pembulatan menit."""
    per_lok = {}
    for i, x in enumerate(snpp):
        per_lok.setdefault((x[1], x[2]), []).append(i)
    out = []
    for r in ramalan:
        if (r["kunci"], r["mode"]) in dinilai:
            continue
        t0 = float(r["kunci"].split("_")[0])
        if a0 < t0 + JEDA_NILAI:
            continue
        if t0 < t_awal:
            out.append({"kunci": r["kunci"], "mode": r["mode"], "kedaluwarsa": True})
            continue
        awal = sorted({i for m, la, lo in r["awal"] for i in per_lok.get((la, lo), ()) if abs(snpp[i][0] - m) <= 1})
        if not awal:  # titik awal tak ketemu di gudang sesudah jeda: tak akan membaik, jangan dibuang diam-diam
            out.append({"kunci": r["kunci"], "mode": r["mode"], "kedaluwarsa": True, "tak_cocok": True})
            continue
        n72 = label72(snpp, awal, t0)
        out.append({"kunci": r["kunci"], "mode": r["mode"], "n72": n72, "lolos": n72 >= LL.LEPAS, "dinilai": acuan})
    return out


def main():
    os.makedirs(FOLDER, exist_ok=True)
    M = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))
    if "lolos" not in M:
        sys.exit("model_sebaran.json belum memuat 'lolos' (jalankan lolos.py akhir)")
    hs = json.load(open(os.path.join(PUBLIK, "hotspot.json")))
    D, a0 = gabung(muat_gudang(), hs)
    with gzip.open(GUDANG, "wt") as f:
        json.dump(D, f, separators=(",", ":"))
    snpp = [r for r in D if SN.baris_utama(r)]  # VIIRS utama sadar waktu: S-NPP sebelum SNPP_AKHIR, N21 sesudahnya
    n20 = [r for r in D if r[3] == "N20"]
    log(f"gudang {len(D)} deteksi ({len(snpp)} VIIRS utama, sensor kini {SN.utama_pada(a0)}), acuan {hs['acuan']}")
    ramalan = baca_jsonl(RAMALAN)
    sudah = {(r["kunci"], r["mode"]) for r in ramalan}
    t_awal = D[0][0] if D else a0
    # titik api baru: komponen yang mulai >= 7 hari sesudah awal gudang (riwayat konteks lengkap) dan berumur 3-24 jam
    calon = []
    for idx in komponen(snpp).values():
        idx.sort(key=lambda i: snpp[i][0])
        t0 = snpp[idx[0]][0]
        pertama = [i for i in idx if snpp[i][0] - t0 <= 30]
        lo0 = sum(snpp[i][2] for i in pertama) / len(pertama)
        la0 = sum(snpp[i][1] for i in pertama) / len(pertama)
        prov = snpp[idx[0]][5]
        if prov not in PRIORITAS or t0 < t_awal + RIWAYAT_HARI * 1440:
            continue
        umur = a0 - t0
        kunci = f"{t0:.0f}_{la0:.4f}_{lo0:.4f}"
        for mode, lo_, hi_ in (("awal", UMUR_MIN, UMUR_MAKS), ("ulang", LL.ULANG_MENIT + 60, LL.ULANG_MENIT + 12 * 60)):
            if lo_ <= umur <= hi_ and (kunci, mode) not in sudah:
                calon.append((mode, kunci, t0, lo0, la0, prov, [snpp[i] for i in idx if snpp[i][0] <= a0]))
    log(f"{len(calon)} ramalan baru untuk dicatat")
    if calon:
        import cuaca
        from fitur import Konteks, Seri
        hari = (T0 + dt.timedelta(minutes=a0)).date().isoformat()
        C = cuaca_sel(sorted({cuaca.sel05(c[4], c[3]) for c in calon}), hari)
        K = Konteks(bekas=False)
        si = LL.Indeks([r[0] for r in snpp], [r[1] for r in snpp], [r[2] for r in snpp])
        ni = LL.Indeks([r[0] for r in n20], [r[1] for r in n20], [r[2] for r in n20]) if n20 else None
        terbit = dt.datetime.now(dt.timezone.utc).isoformat()[:16]
        with open(RAMALAN, "a") as f:
            for mode, kunci, t0, lo0, la0, prov, rs in calon:
                c = C.get(cuaca.sel05(la0, lo0))
                if not c:
                    continue  # dicoba lagi di jalan berikutnya selama masih dalam jendela umur
                S = Seri(c)
                if not S.cukup(int(t0), 24):
                    continue
                v, st = fitur_titik(K, M, S, rs, t0, lo0, la0, prov, si, ni, mode == "ulang")
                mm = M["lolos_ulang" if mode == "ulang" else "lolos"]
                p = LL.prediksi(mm, v)
                f.write(json.dumps({"kunci": kunci, "mode": mode, "terbit": terbit, "acuan_data": hs["acuan"], "t0": (T0 + dt.timedelta(minutes=t0)).isoformat()[:16],
                                    "lat": round(la0, 4), "lon": round(lo0, 4), "prov": prov, "strata": st, "p": round(p, 4), "waspada": p >= mm["ambang"],
                                    "ambang": mm["ambang"], "model": M.get("dibuat"),
                                    "sensor_utama": SN.utama_pada(t0), "kelompok": SN.kelompok(t0), "awal": [r[:3] for r in rs if r[0] - t0 <= 30],
                                    "fitur": {k: round(x, 3) for k, x in v.items()}}, separators=(",", ":")) + "\n")
    # nilai: ramalan yang 72 jam (+ jeda NRT) sudah lewat
    nilai = baca_jsonl(NILAI)
    baru = nilai_baru(ramalan, {(r["kunci"], r["mode"]) for r in nilai}, snpp, a0, t_awal, hs["acuan"][:16])
    with open(NILAI, "a") as f:
        for r in baru:
            f.write(json.dumps(r) + "\n")
    ringkas()


# ---------------- arsip permanen ----------------
# Cache Actions hidup 7 hari dan bisa tertimpa (kasus 20 Okt 2026). Arsip = SATU berkas jsonl.gz berisi SELURUH ramalan + nilai, diunggah workflow
# ke R2 (poskokarhutla-foto/arsip/prospektif.jsonl.gz) dan dipulihkan SEBELUM prospektif.py jalan. pulih() hanya MENAMBAH baris yang belum ada
# (kunci, mode): append-only, tidak pernah menimpa. Ukuran: ~1 KB/ramalan dikompres ~0,3 KB => setahun ~ 1-2 MB.
class ArsipMenyusut(Exception):
    pass


def hitung_catatan():
    return {"r": len(baca_jsonl(RAMALAN)), "n": len(baca_jsonl(NILAI)), "v": len(baca_jsonl(VONIS_BERKAS))}


def tanda_berkas():
    return os.path.join(FOLDER, "arsip_tanda.json")


def baca_tanda():
    try:
        return {j: int(v) for j, v in json.load(open(tanda_berkas())).items() if j in "rnv"}
    except (OSError, ValueError, TypeError):
        return {}


def tulis_tanda(jumlah):
    """Penanda jumlah baris r/n/v yang pernah dipulihkan/diarsipkan; hanya naik (maks per jenis). Ikut cache folder prospektif."""
    lama = baca_tanda()
    os.makedirs(FOLDER, exist_ok=True)
    json.dump({j: max(jumlah.get(j, 0), lama.get(j, 0)) for j in "rnv"}, open(tanda_berkas(), "w"))


def hitung_arsip(berkas):
    h = {"r": 0, "n": 0, "v": 0}
    with gzip.open(berkas, "rt") as f:
        for l in f:
            j = json.loads(l).get("j")
            if j in h:
                h[j] += 1
    return h


def arsip(tujuan, lama=None):
    """Tulis arsip penuh r/n/g/v. MENOLAK (ArsipMenyusut) bila catatan lokal punya baris r/n/v LEBIH SEDIKIT dari penanda hasil pulih() / arsip sebelumnya,
    atau dari arsip lama yang diberikan (lama = jalur arsip R2 yang baru diunduh): cache hilang + pulih gagal tidak boleh menimpa arsip lengkap dengan arsip hampir kosong."""
    sekarang, minimal = hitung_catatan(), baca_tanda()
    if lama and os.path.exists(lama):
        for j, v in hitung_arsip(lama).items():
            minimal[j] = max(minimal.get(j, 0), v)
    kurang = {j: (sekarang[j], minimal[j]) for j in sekarang if sekarang[j] < minimal.get(j, 0)}
    if kurang:
        raise ArsipMenyusut(f"arsip baru lebih kecil dari yang dipulihkan/diketahui (jenis: (sekarang, minimal)) {kurang}; tidak ditulis, unggah R2 harus tidak jalan")
    n = 0
    with gzip.open(tujuan, "wt") as f:
        for j, baris in (("r", baca_jsonl(RAMALAN)), ("n", baca_jsonl(NILAI)), ("g", baca_jsonl(GERBANG)), ("v", baca_jsonl(VONIS_BERKAS))):
            for r in baris:
                f.write(json.dumps({"j": j, **r}, separators=(",", ":")) + "\n")
                n += 1
    tulis_tanda(sekarang)
    return n


def pulih(sumber):
    """Gabungkan arsip ke ramalan.jsonl / nilai.jsonl: tambah baris yang (kunci, mode)-nya belum ada. Mengembalikan (ramalan+, nilai+)."""
    os.makedirs(FOLDER, exist_ok=True)
    ada = {"r": {(r["kunci"], r["mode"]) for r in baca_jsonl(RAMALAN)}, "n": {(r["kunci"], r["mode"]) for r in baca_jsonl(NILAI)},
           "g": {(r["kunci"], r["mode"]) for r in baca_jsonl(GERBANG)}, "v": {(r["kunci"], r["mode"]) for r in baca_jsonl(VONIS_BERKAS)}}
    tambah = {"r": [], "n": [], "g": [], "v": []}
    with gzip.open(sumber, "rt") as f:
        for l in f:
            r = json.loads(l)
            j = r.pop("j")
            if (r["kunci"], r["mode"]) not in ada[j]:
                ada[j].add((r["kunci"], r["mode"]))
                tambah[j].append(r)
    for j, berkas in (("r", RAMALAN), ("n", NILAI), ("g", GERBANG), ("v", VONIS_BERKAS)):
        with open(berkas, "a") as f:
            for r in tambah[j]:
                f.write(json.dumps(r, separators=(",", ":")) + "\n")
    tulis_tanda(hitung_catatan())  # penanda: jumlah sesudah pemulihan berhasil = batas bawah untuk arsip berikutnya
    return len(tambah["r"]), len(tambah["n"])  # vonis gerbang ("g") ikut dipulihkan tanpa dilaporkan: hanya penambah


# ---------------- pra-registrasi go/no-go (audit metode 21 Okt 2026, §4.4 #10) ----------------
# Ditulis 23 Okt 2026 SEBELUM data prospektif cukup untuk menilai. BEKU: jangan dilonggarkan; uji() menolak bila angkanya berubah, ringkas() menolak
# menimpa prospektif.json yang kriterianya beda, dan KRITERIA_SHA256 (hash kanonik angka beku) dicek uji() DAN ringkas() tanpa jalan pintas: mengubah angka berarti
# mengubah KRITERIA dan konstanta hash sekaligus, yang terlihat di diff dan di tanggal_registrasi. Vonis dihitung dari metrik nyata kelompok sensor "N" (S-NPP, mode awal): lihat vonis_prospektif().
KRITERIA = {"tanggal_registrasi": "2026-10-23", "n_dinilai_min": 200, "n_lolos_min": 20, "auc_bawah95_min": 0.80, "bss_min": 0.0,
            "aturan": "belum_cukup_data bila n_dinilai < n_dinilai_min atau n_lolos < n_lolos_min; lolos bila batas bawah selang 95% AUC >= auc_bawah95_min DAN "
                      "Brier skill (terhadap laju dasar himpunan yang sama) > bss_min; selain itu gagal. Vonis lolos/gagal ditetapkan SEKALI saat n_dinilai_min dan n_lolos_min pertama kali "
                      "terpenuhi (vonis_akhir, vonis.jsonl) dan tidak dihitung ulang.",
            "metode_selang": "selang AUC = bootstrap persentil 2,5/97,5, 2000 ulangan, biji 7, resampel BERKELOMPOK per (minggu ISO t0, blok 1 derajat) karena catatan tak menyimpan id kompleks: "
                             "ramalan di blok dan minggu yang sama (api yang sama, cuaca yang sama, hari-hari beruntun) saling bergantung; kelompok mingguan hanya MENGURANGI, tidak menghapus, "
                             "dependensi antar-minggu (musim yang sama) sehingga selang tetap agak terlalu sempit. Metode ini diperkuat 23 Okt 2026 (semula 200 ulangan per titik); angka beku "
                             "tak berubah. Kelompok sensor N21 memakai ambang yang SAMA tanpa registrasi terpisah (mewarisi pra-registrasi S-NPP; distribusinya belum diukur). "
                             "aturan_vonis_v ada di luar hash: mengubahnya tidak mengubah angka beku, tetapi harus dicatat di sini.",
            }
ATURAN_VONIS_V = "1"  # versi aturan vonis (selang berkelompok minggu ISO x blok 1 derajat, vonis_akhir terkunci); DI LUAR hash agar hash tetap memverifikasi angka asli 23 Okt
BEKU = ("tanggal_registrasi", "n_dinilai_min", "n_lolos_min", "auc_bawah95_min", "bss_min")  # angka yang dikunci hash; teks aturan/metode boleh diperjelas
KRITERIA_SHA256 = "a03e5af65af8042ecc23b7d8cf08d3715a76750792525e965f90f8865263854d"


def kriteria_sha(K):
    """sha256 kanonik (json terurut, tanpa spasi) dari angka beku saja."""
    import hashlib
    return hashlib.sha256(json.dumps({k: K[k] for k in BEKU}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def pastikan_kriteria_beku():
    """Tolak bila KRITERIA tidak cocok dengan hash terdaftar. Tidak ada jalan pintas lewat env."""
    if kriteria_sha(KRITERIA) != KRITERIA_SHA256:
        sys.exit(f"kriteria pra-registrasi beku tidak cocok dengan KRITERIA_SHA256 ({kriteria_sha(KRITERIA)}): tolak menulis")
VONIS = ("belum_cukup_data", "lolos", "gagal")
BOOT_AUC = 2000  # ulangan bootstrap selang AUC vonis (ECE tetap BOOT_B: dihitung ulang kalibrasi tiap ulangan)
HARI_KESEHATAN = 7
UMUR_TUA_JAM = 78  # = JEDA_NILAI: ramalan lebih tua dari ini seharusnya sudah dinilai


def bss(p, y):
    """Brier skill terhadap klimatologi (laju dasar himpunan yang sama); None bila tanpa variasi."""
    n = len(y)
    if not n:
        return None
    r = sum(y) / n
    klim = r * (1 - r)
    return 1 - (sum((a - b) ** 2 for a, b in zip(p, y)) / n) / klim if klim > 0 else None


def auc_selang(p, y, grup=None, b=BOOT_AUC, benih=7):
    """(AUC, bawah95, atas95) bootstrap persentil; None bila satu kelas kosong. grup = label kelompok per titik (mis. (tanggal, sel 0,5)): bila ada, KELOMPOK diresampel
    (dengan pengembalian) dan semua anggotanya ikut, sebab ramalan di hari dan sel cuaca yang sama saling bergantung; tanpa grup, per titik."""
    import gbdt as G
    n = len(y)
    a = G.auc(p, y) if 0 < sum(y) < n else None
    if a is None:
        return None
    rnd, v = random.Random(benih), []
    if grup:
        kel = {}
        for i, g in enumerate(grup):
            kel.setdefault(g, []).append(i)
        daf = [kel[g] for g in sorted(kel, key=str)]
        m = len(daf)
    for _ in range(b):
        ix = [i for k in (daf[rnd.randrange(m)] for _ in range(m)) for i in k] if grup else [rnd.randrange(n) for _ in range(n)]
        yy = [y[i] for i in ix]
        if 0 < sum(yy) < len(yy):
            v.append(G.auc([p[i] for i in ix], yy))
    v.sort()
    return a, v[int(.025 * len(v))], v[min(len(v) - 1, int(.975 * len(v)))]


def vonis_prospektif(p, y, grup=None, K=KRITERIA):
    """(vonis, metrik) menurut KRITERIA beku. Metrik = angka yang dipakai menghakimi (selalu dilaporkan, juga saat belum cukup data)."""
    n, k = len(y), sum(y)
    m = {"n_dinilai": n, "n_lolos": k, "auc": None, "auc_bawah95": None, "auc_atas95": None, "bss": None}
    sl = auc_selang(p, y, grup) if n and 0 < k < n else None
    if sl:
        m.update(auc=round(sl[0], 4), auc_bawah95=round(sl[1], 4), auc_atas95=round(sl[2], 4))
        m["bss"] = round(bss(p, y), 4)
    if n < K["n_dinilai_min"] or k < K["n_lolos_min"] or not sl:
        return "belum_cukup_data", m
    return ("lolos" if sl[1] >= K["auc_bawah95_min"] and m["bss"] > K["bss_min"] else "gagal"), m


def kunci_vonis(kel, berjalan, metrik, kini, berkas=None, lama_doc=None):
    """Vonis akhir TERKUNCI: ditetapkan sekali, saat vonis berjalan pertama kali lolos/gagal (n_dinilai_min dan n_lolos_min terpenuhi); sesudahnya dibaca dari
    vonis.jsonl (append-only, ikut arsip) dan TIDAK dihitung ulang walau data bertambah. Bila vonis.jsonl tak punya kuncinya (cache + arsip R2 hilang) tetapi
    prospektif.json LAMA (di CI berasal dari git = jangkar di luar cache) memuat vonis_akhir untuk kelompok ini, vonis itu dipulihkan ke vonis.jsonl dan dipakai,
    BUKAN dihitung ulang dari data lain. -> {nilai, tanggal, n, ...} atau None."""
    berkas = berkas or VONIS_BERKAS
    kunci = f"vonis_{kel}"
    ada = next((r for r in baca_jsonl(berkas) if r["kunci"] == kunci), None)
    if ada is None and lama_doc:
        lk = (lama_doc.get("vonis_akhir") if kel == "N" else ((lama_doc.get("per_sensor") or {}).get(kel) or {}).get("vonis_akhir"))
        if isinstance(lk, dict) and lk.get("nilai") in ("lolos", "gagal"):
            ada = {"kunci": kunci, "mode": "akhir", **lk, "dipulihkan_dari": "prospektif.json"}
            os.makedirs(os.path.dirname(berkas), exist_ok=True)
            with open(berkas, "a") as f:
                f.write(json.dumps(ada, separators=(",", ":")) + "\n")
    if ada is None and berjalan in ("lolos", "gagal"):
        ada = {"kunci": kunci, "mode": "akhir", "nilai": berjalan, "tanggal": kini.isoformat()[:10], "n": metrik["n_dinilai"], "n_lolos": metrik["n_lolos"],
               "auc_bawah95": metrik["auc_bawah95"], "bss": metrik["bss"]}
        os.makedirs(os.path.dirname(berkas), exist_ok=True)
        with open(berkas, "a") as f:
            f.write(json.dumps(ada, separators=(",", ":")) + "\n")
    return {k: ada[k] for k in ("nilai", "tanggal", "n", "n_lolos", "auc_bawah95", "bss") if k in ada} if ada else None


def _waktu(s):
    return dt.datetime.fromisoformat(s[:16]).replace(tzinfo=dt.timezone.utc)


def kesehatan(R, semua_n, kini):
    """Penanda mandek: dicatat/dinilai 7 hari terakhir; macet = musim aktif (ada ramalan dicatat) tetapi 0 dinilai padahal ada ramalan > 78 jam belum dinilai.
    kini = datetime UTC. Dipakai pembaca/CI untuk membedakan 'musim sepi' dari 'penilai mati' (kasus 20 Okt 2026: cache catatan hilang)."""
    batas = kini - dt.timedelta(days=HARI_KESEHATAN)
    dicatat = sum(1 for r in R if r.get("terbit") and _waktu(r["terbit"]) >= batas)
    dinilai = sum(1 for n in semua_n if not n.get("kedaluwarsa") and n.get("dinilai") and _waktu(n["dinilai"]) >= batas)
    sudah = {(n["kunci"], n["mode"]) for n in semua_n}
    tua = sum(1 for r in R if (r["kunci"], r["mode"]) not in sudah and (kini - _waktu(r["t0"])).total_seconds() / 3600 > UMUR_TUA_JAM)
    return {"hari": HARI_KESEHATAN, "dicatat_7h": dicatat, "dinilai_7h": dinilai, "tua_belum_dinilai": tua, "macet": bool(dicatat > 0 and dinilai == 0 and tua > 0),
            "arti": "macet = ada ramalan dicatat 7 hari terakhir, nol dinilai, dan ada ramalan berumur > 78 jam yang belum dinilai"}


def kelompok_ramalan(r):
    """Kelompok sensor ramalan; ramalan lama (tanpa medan) dihitung dari t0: semuanya 'N' (dibuat sebelum S-NPP berhenti)."""
    return r.get("kelompok") or SN.kelompok(menit_dari(_waktu(r["t0"])))


def blok(R, N, mode, kel):
    """Ringkasan satu mode untuk satu kelompok sensor -> (dict, p, y)."""
    rs = [r for r in R if r["mode"] == mode and kelompok_ramalan(r) == kel]
    dn = [(r, N[(r["kunci"], mode)]) for r in rs if (r["kunci"], mode) in N]
    y = [1 if n["lolos"] else 0 for _, n in dn]
    p = [r["p"] for r, _ in dn]
    w = [1 if r["waspada"] else 0 for r, _ in dn]
    o = {"dicatat": len(rs), **metrik_set(p, y, w)}
    if mode == "awal":
        o["kalibrasi"] = gerbang_kalibrasi(p, y)
    o["per_bulan"] = {}
    for r, n in dn:
        b = o["per_bulan"].setdefault(r["t0"][:7], {"dinilai": 0, "lolos": 0, "waspada": 0, "tepat": 0})
        b["dinilai"] += 1
        b["lolos"] += n["lolos"]
        b["waspada"] += r["waspada"]
        b["tepat"] += bool(r["waspada"] and n["lolos"])
    o["per_lahan"] = {st: {"dinilai": sum(1 for r, _ in dn if r["strata"] == st), "lolos": sum(1 for r, n in dn if r["strata"] == st and n["lolos"]),
                           "tepat": sum(1 for r, n in dn if r["strata"] == st and n["lolos"] and r["waspada"]),
                           "waspada": sum(1 for r, _ in dn if r["strata"] == st and r["waspada"])} for st in ("gambut", "mineral", "sabana")}
    grup = [(*dt.date.fromisoformat(r["t0"][:10]).isocalendar()[:2], math.floor(r["lat"]), math.floor(r["lon"])) for r, _ in dn]  # tanpa id kompleks: (minggu ISO, blok 1 derajat)
    return o, p, y, grup


def ringkas(kini=None):
    pastikan_kriteria_beku()
    lama = {}  # prospektif.json sebelumnya: jangkar vonis_akhir + pemeriksa kriteria. Ada tetapi tak terbaca = BERHENTI (bukan dianggap kosong)
    if os.path.exists(RINGKAS):
        try:
            lama = json.load(open(RINGKAS))
        except (OSError, ValueError) as e:
            sys.exit(f"{RINGKAS} ada tetapi tak terbaca ({e}): berhenti, tidak ditimpa")
    kini = kini or dt.datetime.now(dt.timezone.utc)
    R = baca_jsonl(RAMALAN)
    semua_n = baca_jsonl(NILAI)
    N = {(r["kunci"], r["mode"]): r for r in semua_n if not r.get("kedaluwarsa")}
    out = {"diperbarui": kini.isoformat()[:16], "definisi": "lolos = >= 10 sel VIIRS 375 m (~140 ha) dalam 72 jam sejak deteksi pertama",
           "catatan": "ramalan dicatat saat titik api baru muncul (cuaca = prakiraan Open-Meteo), dinilai 72 jam kemudian dengan FIRMS NRT; tidak bisa disetel ulang sesudahnya",
           "sensor_utama": {"kini": SN.utama_pada(menit_dari(kini)), "snpp_akhir": f"{SN.SNPP_AKHIR[0]}T{SN.SNPP_AKHIR[1] // 60:02d}:{SN.SNPP_AKHIR[1] % 60:02d}Z",
                            "catatan": "mode.* dan semua gerbang/vonis HANYA kelompok 'N' (S-NPP, jendela fitur+label seluruhnya sebelum S-NPP berhenti). Ramalan N21 dan 'peralihan' "
                                       "(jendela memuat batas) ada di per_sensor, tidak dicampur. Pergeseran distribusi N21 vs S-NPP BELUM diukur."},
           "mode": {}, "per_sensor": {}}
    pu = {}
    for mode in ("awal", "ulang"):
        out["mode"][mode], *pu[mode] = blok(R, N, mode, "N")  # pu[mode] = [p, y, grup]
    for kel in ("N21", "peralihan"):
        ps = {"dicatat": sum(1 for r in R if kelompok_ramalan(r) == kel), "mode": {}}
        for mode in ("awal", "ulang"):
            o, p, y, g = blok(R, N, mode, kel)
            ps["mode"][mode] = o
            if mode == "awal":
                ps["vonis_berjalan"], ps["metrik_vonis"] = vonis_prospektif(p, y, g)
                ps["vonis_akhir"] = kunci_vonis(kel, ps["vonis_berjalan"], ps["metrik_vonis"], kini, lama_doc=lama) if kel == "N21" else None  # peralihan: campuran, tidak pernah divonis
                ps["vonis"] = ps["vonis_akhir"]["nilai"] if ps["vonis_akhir"] else ps["vonis_berjalan"]
        out["per_sensor"][kel] = ps
    out["n_min"] = N_MIN_DINILAI
    A = out["mode"]["awal"]
    klaim = json.load(open(os.path.join(PUBLIK, "model_sebaran.json"))).get("lolos", {}).get("kinerja", {}).get("uji2_recall")
    A["recall_bawah95"] = round(wilson_bawah(A["tepat"], A["lolos"]), 3) if A["lolos"] else None
    out["recall_min"] = round(klaim - TOLERANSI_RECALL, 3) if klaim is not None else None
    out["n_min_lolos"] = N_MIN_LOLOS
    out["tak_cocok"] = sum(1 for r in semua_n if r.get("tak_cocok") and r["mode"] == "awal")  # ramalan yang titik awalnya tak ditemukan lagi saat dinilai
    out["teruji_recall"] = bool(A["dinilai"] >= N_MIN_DINILAI and A["lolos"] >= N_MIN_LOLOS and out["recall_min"] is not None
                                and A["recall_bawah95"] is not None and A["recall_bawah95"] >= out["recall_min"])
    out["kalibrasi_ok"] = kalibrasi_lolos(A.get("kalibrasi"))
    out["ece_maks"], out["skill_min"] = ECE_MAKS, SKILL_MIN
    # laju dasar: Platt dikalibrasi pada laju api besar 2015-2023 (luar-lipatan); laju prospektif yang beda > 2x berarti populasi/pelabelan lain
    # dan peluang di layar tak bisa dianggap terkalibrasi, kecuali Platt sudah dipasang ulang pada data prospektif (kunci lolos.rekalibrasi_prospektif).
    ML = json.load(open(os.path.join(PUBLIK, "model_sebaran.json"))).get("lolos", {})
    lap = next((x for x in ML.get("laporan", []) if str(x.get("himpunan", "")).startswith("Luar-lipatan") and x.get("model") == "baru"), None)
    out["laju_model"] = round(lap["lolos"] / lap["n"], 4) if lap and lap.get("n") else None
    out["rekalibrasi_prospektif"] = bool(ML.get("rekalibrasi_prospektif"))
    out["laju_dasar_ok"], out["rasio_laju"] = laju_sejalan(A["laju_teramati"], out["laju_model"], out["rekalibrasi_prospektif"])
    # layar menyembunyikan peluang "akan membesar" selama false: recall prospektif lolos, peluangnya terkalibrasi (ECE persentil-90 bootstrap, kalibrasi
    # secara umum, Brier skill > 0), laju dasar sejalan DAN semua itu lulus pada dua evaluasi berturut-turut (n dinilai bertambah di antaranya).
    # Uji balik historis (prospektif_historis.json) TIDAK ikut menentukan: ia hanya ditampilkan terpisah.
    out["lulus_sekarang"] = bool(out["teruji_recall"] and out["kalibrasi_ok"] and out["laju_dasar_ok"])
    riwayat = baca_jsonl(GERBANG)
    out["lulus_berturut"], catat = berturut(riwayat, A["dinilai"], out["lulus_sekarang"])
    if catat and A.get("kalibrasi") and A["dinilai"] >= N_MIN_DINILAI:
        with open(GERBANG, "a") as f:
            f.write(json.dumps({"kunci": f"n{A['dinilai']}", "mode": "gerbang", "n": A["dinilai"], "lulus": out["lulus_sekarang"], "dinilai": out["diperbarui"]}) + "\n")
    out["teruji"] = out["lulus_berturut"]
    # teruji hanya berlaku untuk model yang dinilai pada S-NPP: bila sensor utama KINI N21, peluang di layar belum punya bukti sendiri -> false sampai kelompok N21 diuji
    out["teruji_sensor_kini"] = bool(out["teruji"] and out["sensor_utama"]["kini"] == "N")
    # pra-registrasi go/no-go (kriteria beku) + kesehatan penilai
    out["kriteria"], out["tanggal_registrasi"] = dict(KRITERIA), KRITERIA["tanggal_registrasi"]
    out["vonis_berjalan"], out["metrik_vonis"] = vonis_prospektif(*pu["awal"])
    out["vonis_akhir"] = kunci_vonis("N", out["vonis_berjalan"], out["metrik_vonis"], kini, lama_doc=lama)
    out["vonis"] = out["vonis_akhir"]["nilai"] if out["vonis_akhir"] else out["vonis_berjalan"]  # terkunci sekali; vonis_berjalan hanya ditampilkan
    out["kesehatan"] = kesehatan(R, semua_n, kini)
    out["mulai"] = min((r["t0"] for r in R), default=None)  # ramalan tertua yang masih tercatat (loncat maju = catatan terputus)
    out["terbaru"] = [{"t0": r["t0"], "lat": r["lat"], "lon": r["lon"], "prov": r["prov"], "p": r["p"], "waspada": r["waspada"], "sensor_utama": r.get("sensor_utama", "N"),
                       "kelompok": kelompok_ramalan(r), "n72": N.get((r["kunci"], "awal"), {}).get("n72")} for r in sorted((r for r in R if r["mode"] == "awal"), key=lambda r: r["t0"])[-60:]]
    lk = lama.get("kriteria")
    if lk is not None and any(lk.get(k) != KRITERIA[k] for k in BEKU):
        sys.exit(f"kriteria pra-registrasi beku berubah ({ {k: lk.get(k) for k in BEKU} } -> { {k: KRITERIA[k] for k in BEKU} }); tolak menimpa {RINGKAS}")
    out["registrasi_pertama"] = KRITERIA["tanggal_registrasi"]  # selalu tanggal pra-registrasi (berkas lama tanpa kriteria = registrasi pertama, tanggal yang sama)
    out["aturan_vonis_v"], out["kantong_min_n"] = ATURAN_VONIS_V, KANTONG_MIN_N
    json.dump(out, open(RINGKAS, "w"), ensure_ascii=False, separators=(",", ":"))
    log("ringkasan", json.dumps(out["mode"].get("awal", {}))[:300], "vonis", out["vonis"], "macet", out["kesehatan"]["macet"])
    return out


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        # label72: rantai 3 sel dalam 72 jam + satu sel sesudah 72 jam + satu sel 2 km jauhnya -> 3
        km = 1 / 111.32
        s = [[0, 0.0, 110.0, "N", 5, "62"], [600, 0.0, 110 + .5 * km, "N", 5, "62"], [2000, 0.0, 110 + 1.0 * km, "N", 5, "62"],
             [72 * 60 + 100, 0.0, 110 + 1.4 * km, "N", 5, "62"], [100, 0.0, 110 + 3 * km, "N", 5, "62"]]
        assert label72(s, [0], 0) == 3, label72(s, [0], 0)
        # gabung: dedup, buang sensor lain & keyakinan rendah, pangkas umur
        hs = {"acuan": "2026-10-12T12:00:00+00:00", "wilayah": ["62|Pulang Pisau|X"],
              "baris": [[-2.0, 114.0, -1.0, "N", 3.0, 1, 0, ""], [-2.0, 114.0, -1.0, "N", 3.0, 1, 0, ""], [-2.0, 114.0, -2.0, "M", 3.0, 2, 0, ""],
                        [-2.0, 114.1, -3.0, "N20", 3.0, 0, 0, ""], [-2.0, 114.2, -400.0, "N", 3.0, 2, 0, ""]]}
        g, a0 = gabung([], hs)
        assert len(g) == 1 and g[0][3] == "N" and g[0][5] == "62" and abs(g[0][0] - (a0 - 60)) < 1e-6, g
        g2, _ = gabung(g, hs)
        assert len(g2) == 1
        # kasus 0-dinilai: ramalan memuat menit pecahan (.4) yang tak sama dengan gudang sekarang; harus tetap dinilai lewat lokasi
        gud = [[1000, -2.0, 114.0, "N", 5, "62"], [1500, -2.0, 114.0 + .5 * km, "N", 5, "62"], [2000, -2.0, 114.0 + 1.0 * km, "N", 5, "62"]]
        ram = [{"kunci": "1000_-2.0000_114.0000", "mode": "awal", "awal": [[1000.4, -2.0, 114.0]]},
               {"kunci": "9999_-1.0000_100.0000", "mode": "awal", "awal": [[9999.0, -1.0, 100.0]]}]
        nb = nilai_baru(ram, set(), gud, 1000 + JEDA_NILAI + 5, 0, "x")
        assert len(nb) == 1 and nb[0]["n72"] == 3 and nb[0]["lolos"] is False, nb  # ramalan kedua belum 78 jam: tak dinilai
        assert nilai_baru(ram, {("1000_-2.0000_114.0000", "awal")}, gud, 1000 + JEDA_NILAI + 5, 0, "x") == []
        assert nilai_baru(ram, set(), gud, 1000 + JEDA_NILAI + 5, 2000, "x")[0].get("kedaluwarsa")
        r0 = nilai_baru([{"kunci": "1000_-9.0000_100.0000", "mode": "awal", "awal": [[1000.0, -9.0, 100.0]]}], set(), gud, 1000 + JEDA_NILAI + 5, 0, "x")
        assert r0 == [{"kunci": "1000_-9.0000_100.0000", "mode": "awal", "kedaluwarsa": True, "tak_cocok": True}], r0  # tak cocok => dihitung, bukan dibuang
        assert abs(wilson_bawah(34, 50) - 0.541) < .005 and wilson_bawah(0, 0) is None
        # kalibrasi: model sempurna terkalibrasi (y ~ Bernoulli(p)) -> ECE kecil, skill > 0; model terbalik -> ECE besar, skill < 0
        rnd = __import__("random").Random(7)
        pp = [rnd.random() * .5 for _ in range(4000)]
        yy = [1 if rnd.random() < q else 0 for q in pp]
        kb = kalibrasi(pp, yy)
        assert len(kb["kantong"]) == 10 and sum(b["n"] for b in kb["kantong"]) == 4000 and kb["ece"] < .04 and kb["brier_skill"] > .05 and kalibrasi_lolos(kb), kb
        assert all(b["lo"] <= b["teramati"] <= b["hi"] for b in kb["kantong"])
        assert [b["p_diramal"] for b in kb["kantong"]] == sorted(b["p_diramal"] for b in kb["kantong"])
        kj = kalibrasi([.1 if v else .9 for v in yy], yy)
        assert kj["ece"] > .5 and kj["brier_skill"] < 0 and not kalibrasi_lolos(kj), kj
        # hitung tangan: 4 kantong (n=120, k=4): peluang 0,1 teramati 0,3 => ECE 0,2; Brier = rata-rata (p-y)^2; klimatologi = 0,3*0,7
        kh = kalibrasi([.1] * 120, [1 if i % 10 in (0, 3, 6) else 0 for i in range(120)])  # ikatan peluang: urutan stabil = urutan indeks
        assert kh["ece"] == 0.2 and kh["kantong"][0]["teramati"] == .3 and abs(kh["brier"] - (36 * .81 + 84 * .01) / 120) < 1e-3 and kh["brier_klimatologi"] == .21 and len(kh["kantong"]) == 4, kh
        assert kalibrasi([.1] * 50, [0] * 50) is None and not kalibrasi_lolos(None)
        # gerbang 1b: ECE persentil-90 >= ECE titik; kalibrasi-secara-umum menolak model yang skalanya salah walau ECE mutlak kecil
        g = gerbang_kalibrasi(pp, yy)
        assert g["ece_p90"] >= g["ece"] and g["di_besar"]["ok"] and kalibrasi_lolos(g) == (g["ece_p90"] <= ECE_MAKS), g
        assert gerbang_kalibrasi([.1] * 50, [0] * 50) is None
        lamb = [.02] * 3000  # peluang 2% padahal laju 6%: ECE mutlak 0,04 < 0,08 TAPI skala salah 3x -> di_besar menolak
        yl = [1 if i % 50 < 3 else 0 for i in range(3000)]
        dl = di_besar(lamb, yl)
        assert not dl["ok"] and kalibrasi(lamb, yl)["ece"] < ECE_MAKS and not kalibrasi_lolos({**kalibrasi(lamb, yl), "di_besar": dl}), dl
        assert di_besar([.06] * 3000, yl)["ok"] and di_besar([.045] * 3000, yl)["ok"] and not di_besar([.2] * 3000, yl)["ok"]
        # ECE persentil-90 pada sampel kecil yang kebetulan bagus: batas atas > titik (hukuman noise), sampel besar mendekati titik
        rk = random.Random(3)
        pk = [rk.random() * .5 for _ in range(300)]
        yk = [1 if rk.random() < q else 0 for q in pk]
        gk = gerbang_kalibrasi(pk, yk)
        assert gk["ece_p90"] > gk["ece"] + .005 and gk["ece_p90"] > g["ece_p90"], (gk["ece"], gk["ece_p90"], g["ece_p90"])
        # 1c: laju beda > 2x ditolak kecuali direkalibrasi
        assert laju_sejalan(.17, .0279, False) == (False, 6.09) and laju_sejalan(.17, .0279, True)[0] and laju_sejalan(.03, .0279, False)[0]
        assert not laju_sejalan(.01, .0279, False)[0] and laju_sejalan(.0, .0279, False) == (False, None)
        # 1b: dua evaluasi berturut-turut (n harus bertambah >= TAMBAH_MIN); lulus pertama saja, atau n tak bertambah, tidak cukup
        assert berturut([], 400, True) == (False, True)
        assert berturut([{"n": 400, "lulus": True}], 400, True) == (False, False)
        assert berturut([{"n": 400, "lulus": True}], 420, True)[0] is False
        assert berturut([{"n": 400, "lulus": True}], 440, True) == (True, True)
        assert berturut([{"n": 400, "lulus": False}], 500, True)[0] is False and berturut([{"n": 400, "lulus": True}], 500, False)[0] is False
        assert berturut([{"n": 300, "lulus": False}, {"n": 400, "lulus": True}], 500, True)[0]
        lo, hi = wilson(30, 100)
        assert abs(lo - .2189) < .002 and abs(hi - .3961) < .002 and wilson(0, 0) == (None, None)
        # arsip: bolak-balik tidak menambah apa pun, sumber lama TIDAK menimpa baris yang sudah ada
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            globals().update(FOLDER=td, RAMALAN=os.path.join(td, "r.jsonl"), NILAI=os.path.join(td, "n.jsonl"), GERBANG=os.path.join(td, "g.jsonl"), VONIS_BERKAS=os.path.join(td, "v.jsonl"))
            open(RAMALAN, "w").write('{"kunci":"a","mode":"awal","p":0.1}\n')
            open(NILAI, "w").write('{"kunci":"a","mode":"awal","n72":3,"lolos":false}\n')
            arsip(os.path.join(td, "x.gz"))
            open(RAMALAN, "a").write('{"kunci":"b","mode":"awal","p":0.2}\n')
            isi = open(RAMALAN).read().replace('"p":0.1', '"p":0.9')
            open(RAMALAN, "w").write(isi)  # salinan lokal berbeda: arsip tak boleh menimpanya
            assert pulih(os.path.join(td, "x.gz")) == (0, 0)
            os.remove(NILAI)
            assert pulih(os.path.join(td, "x.gz")) == (0, 1) and len(baca_jsonl(RAMALAN)) == 2 and baca_jsonl(RAMALAN)[0]["p"] == .9
            # vonis gerbang ikut arsip: pulih menambah yang hilang, tak menimpa
            open(GERBANG, "w").write('{"kunci":"n400","mode":"gerbang","n":400,"lulus":true}\n')
            arsip(os.path.join(td, "y.gz"))
            os.remove(GERBANG)
            pulih(os.path.join(td, "y.gz"))
            assert baca_jsonl(GERBANG)[0]["lulus"] is True
        # ---- VIIRS utama sadar waktu (S-NPP -> NOAA-21 pada SNPP_AKHIR) ----
        SN.uji()  # termasuk: SNPP_AKHIR sama dengan scripts/data/peta_karhutla.py, tanggal sebelum/sesudah memilih sensor yang benar
        ak = SN.menit_akhir()
        akd = T0 + dt.timedelta(minutes=ak)
        sebelum, sesudah = akd - dt.timedelta(hours=2), akd + dt.timedelta(hours=2)
        hs2 = {"acuan": (akd + dt.timedelta(hours=10)).isoformat(), "wilayah": ["62|X|Y"],
               "baris": [[-2.0, 114.0, (sebelum - (akd + dt.timedelta(hours=10))).total_seconds() / 3600, "N", 3.0, 1, 0, ""],
                         [-2.0, 114.0, (sebelum - (akd + dt.timedelta(hours=10))).total_seconds() / 3600, "N21", 3.0, 1, 0, ""],   # N21 sebelum batas: tak disimpan
                         [-2.0, 114.1, (sesudah - (akd + dt.timedelta(hours=10))).total_seconds() / 3600, "N21", 3.0, 1, 0, ""],
                         [-2.0, 114.2, (sesudah - (akd + dt.timedelta(hours=10))).total_seconds() / 3600, "N", 3.0, 1, 0, ""]]}
        g3, _ = gabung([], hs2)
        assert sorted((r[3], r[2]) for r in g3) == [("N", 114.0), ("N", 114.2), ("N21", 114.1)], g3   # N sesudah batas ikut tersimpan (N20 pun) tetapi disaring baris_utama
        assert [(r[3], r[2]) for r in g3 if SN.baris_utama(r)] == [("N", 114.0), ("N21", 114.1)], g3   # himpunan utama: N sebelum batas, N21 sesudahnya
        assert kelompok_ramalan({"t0": "2026-10-10T00:00"}) == "N" and kelompok_ramalan({"t0": "2026-11-20T00:00"}) == "N21"
        assert kelompok_ramalan({"t0": "2026-11-02T00:00"}) == "peralihan" and kelompok_ramalan({"t0": "2026-11-02T00:00", "kelompok": "N21"}) == "N21"
        # ---- pra-registrasi: kriteria beku + vonis dari metrik nyata ----
        assert (KRITERIA["tanggal_registrasi"], KRITERIA["n_dinilai_min"], KRITERIA["n_lolos_min"], KRITERIA["auc_bawah95_min"], KRITERIA["bss_min"]) == ("2026-10-23", 200, 20, 0.80, 0.0), \
            "kriteria pra-registrasi beku: jangan dilonggarkan"
        rv = random.Random(11)
        yv = [1 if rv.random() < .15 else 0 for _ in range(400)]
        pv_bagus = [min(.99, max(.01, .6 * v + .08 + rv.random() * .1)) for v in yv]                  # memisahkan kelas hampir sempurna, terkalibrasi kasar
        pv_acak = [rv.random() * .3 for _ in yv]                                                          # tanpa informasi
        v1, m1 = vonis_prospektif(pv_bagus[:150], yv[:150])
        assert v1 == "belum_cukup_data" and m1["n_dinilai"] == 150, (v1, m1)                              # n < 200
        v1b, _ = vonis_prospektif([.1] * 300, [1 if i < 10 else 0 for i in range(300)])
        assert v1b == "belum_cukup_data"                                                                  # n_lolos < 20
        v2, m2 = vonis_prospektif(pv_bagus, yv)
        assert v2 == "lolos" and m2["auc_bawah95"] >= .8 and m2["bss"] > 0, (v2, m2)
        v3, m3 = vonis_prospektif(pv_acak, yv)
        assert v3 == "gagal" and m3["auc_bawah95"] < .8, (v3, m3)
        v4, m4 = vonis_prospektif([.9 if not v else .1 for v in yv], yv)                                  # terbalik: AUC rendah, BSS < 0
        assert v4 == "gagal" and m4["bss"] < 0, (v4, m4)
        # AUC tinggi tetapi peluang jauh di atas laju dasar -> BSS < 0 -> gagal (peringkat benar, kalibrasi buruk)
        v5, m5 = vonis_prospektif([.5 + .4 * v for v in yv], yv)
        assert v5 == "gagal" and m5["auc_bawah95"] >= .8 and m5["bss"] <= 0, (v5, m5)
        assert vonis_prospektif([], []) == ("belum_cukup_data", {"n_dinilai": 0, "n_lolos": 0, "auc": None, "auc_bawah95": None, "auc_atas95": None, "bss": None})
        # ---- kesehatan: macet hanya bila musim aktif, nol dinilai 7 hari, dan ada ramalan > 78 jam belum dinilai ----
        kini = dt.datetime(2026, 11, 20, 12, 0, tzinfo=dt.timezone.utc)
        rr = lambda k, t0, terbit: {"kunci": k, "mode": "awal", "t0": t0, "terbit": terbit}
        baru_r, tua_r = rr("a", "2026-11-19T00:00", "2026-11-19T12:00"), rr("b", "2026-11-14T00:00", "2026-11-14T12:00")
        kz = kesehatan([baru_r, tua_r], [], kini)
        assert kz["macet"] is True and kz["dicatat_7h"] == 2 and kz["dinilai_7h"] == 0 and kz["tua_belum_dinilai"] == 1, kz
        assert kesehatan([baru_r, tua_r], [{"kunci": "b", "mode": "awal", "n72": 3, "lolos": False, "dinilai": "2026-11-19T12:00"}], kini)["macet"] is False   # ada yang dinilai
        assert kesehatan([baru_r], [], kini)["macet"] is False                                                # belum ada yang > 78 jam
        assert kesehatan([tua_r], [], dt.datetime(2026, 12, 20, tzinfo=dt.timezone.utc))["macet"] is False    # musim sepi: tak ada ramalan dicatat 7 hari terakhir
        assert kesehatan([baru_r, tua_r], [{"kunci": "b", "mode": "awal", "kedaluwarsa": True}], kini)["macet"] is False   # tua sudah ditutup sebagai kedaluwarsa
        assert kesehatan([], [], kini) == {**kesehatan([], [], kini), "macet": False, "dicatat_7h": 0}
        # ringkas() menyeluruh di folder sementara: ramalan N21 tidak masuk metrik S-NPP, vonis & kesehatan ada, kriteria beku menolak ditimpa
        with tempfile.TemporaryDirectory() as td:
            globals().update(FOLDER=td, RAMALAN=os.path.join(td, "r.jsonl"), NILAI=os.path.join(td, "n.jsonl"), GERBANG=os.path.join(td, "g.jsonl"), RINGKAS=os.path.join(td, "ringkas.json"), VONIS_BERKAS=os.path.join(td, "v.jsonl"))
            def tulis_r(kunci, t0, p, y, kel=None):
                r = {"kunci": kunci, "mode": "awal", "t0": t0, "terbit": t0, "p": p, "waspada": p >= .1, "strata": "mineral", "lat": -2.0, "lon": 114.0, "prov": "62"}
                if kel:
                    r["kelompok"], r["sensor_utama"] = kel, "N21" if kel == "N21" else "N"
                open(RAMALAN, "a").write(json.dumps(r) + "\n")
                open(NILAI, "a").write(json.dumps({"kunci": kunci, "mode": "awal", "n72": 12 if y else 1, "lolos": bool(y), "dinilai": t0}) + "\n")
            for i in range(4):
                tulis_r(f"n{i}", "2026-10-10T00:00", .5, 1 if i < 2 else 0)                               # lama (tanpa medan kelompok) = N
            for i in range(3):
                tulis_r(f"m{i}", "2026-12-01T00:00", .2, 1, "N21")
            tulis_r("x0", "2026-11-02T00:00", .3, 0, "peralihan")
            o = ringkas(kini=dt.datetime(2026, 12, 5, tzinfo=dt.timezone.utc))
            assert o["mode"]["awal"]["dinilai"] == 4 and o["per_sensor"]["N21"]["mode"]["awal"]["dinilai"] == 3 and o["per_sensor"]["peralihan"]["mode"]["awal"]["dinilai"] == 1, o["mode"]["awal"]
            assert o["sensor_utama"]["kini"] == "N21" and o["teruji_sensor_kini"] is False and o["vonis"] == "belum_cukup_data" and o["per_sensor"]["N21"]["vonis"] == "belum_cukup_data"
            assert o["kriteria"] == KRITERIA and o["tanggal_registrasi"] == "2026-10-23" and o["vonis"] in VONIS and o["kesehatan"]["dicatat_7h"] == 3
            assert {x["kelompok"] for x in o["terbaru"]} == {"N", "N21", "peralihan"}
            json.dump({**o, "kriteria": {**KRITERIA, "n_dinilai_min": 50}}, open(RINGKAS, "w"))              # kriteria dilonggarkan di berkas lama -> ringkas() menolak menimpa
            try:
                ringkas(kini=kini)
                raise AssertionError("kriteria beku harus ditolak")
            except SystemExit:
                pass
        # ---- hash kriteria beku (tanpa jalan pintas env) ----
        assert kriteria_sha(KRITERIA) == KRITERIA_SHA256, "KRITERIA diubah tanpa mengubah KRITERIA_SHA256 (sengaja dibuat terlihat di diff)"
        pastikan_kriteria_beku()
        assert kriteria_sha({**KRITERIA, "n_dinilai_min": 150}) != KRITERIA_SHA256 and kriteria_sha({**KRITERIA, "auc_bawah95_min": .7}) != KRITERIA_SHA256
        assert kriteria_sha({**KRITERIA, "aturan": "x", "metode_selang": "y"}) == KRITERIA_SHA256  # teks boleh diperjelas, angka tidak
        os.environ["PROSPEKTIF_KRITERIA_BARU"] = "1"  # env lama tidak lagi berpengaruh
        # ---- S1: menit dibulatkan ke bawah, deteksi S-NPP sebelum batas tak melompat ke sisi N21 ----
        ak2 = SN.menit_akhir()
        hs3 = {"acuan": (T0 + dt.timedelta(minutes=ak2) - dt.timedelta(seconds=24)).isoformat(), "wilayah": ["62|X|Y"],      # acuan = batas - 0,4 menit
               "baris": [[-2.0, 114.0, 0.0, "N", 3.0, 1, 0, ""], [-2.0, 114.1, 0.0, "N21", 3.0, 1, 0, ""]]}
        g4, _ = gabung([], hs3)
        assert [(r[3], r[0]) for r in g4] == [("N", ak2 - 1)] and all(SN.baris_utama(r) for r in g4), g4                 # round() akan memberi menit batas (N21): salah
        hs3["acuan"] = (T0 + dt.timedelta(minutes=ak2) + dt.timedelta(seconds=24)).isoformat()                           # batas + 0,4 menit
        g5, _ = gabung([], hs3)
        assert sorted((r[3], r[0]) for r in g5) == [("N", ak2), ("N21", ak2)] and [r[3] for r in g5 if SN.baris_utama(r)] == ["N21"], g5
        # ---- S2/S3: bootstrap AUC 2000 ulangan, berkelompok ----
        assert BOOT_AUC == 2000
        rg = random.Random(5)
        yg = [1 if rg.random() < .2 else 0 for _ in range(300)]
        pg = [min(.99, .15 + .3 * v + rg.random() * .6) for v in yg]
        gr = [(f"2026-11-{1 + i // 10:02d}", 0, 0) for i in range(300)]                  # 30 kelompok bergantung
        a0_, l0, h0 = auc_selang(pg, yg)
        a1_, l1, h1 = auc_selang(pg, yg, gr)
        assert a0_ == a1_ and (h1 - l1) > 0 and l1 <= a1_ <= h1 and auc_selang(pg, yg, gr) == (a1_, l1, h1)
        # ---- S4: vonis akhir terkunci sekali ----
        with tempfile.TemporaryDirectory() as td:
            globals().update(FOLDER=td, RAMALAN=os.path.join(td, "r.jsonl"), NILAI=os.path.join(td, "n.jsonl"), GERBANG=os.path.join(td, "g.jsonl"), RINGKAS=os.path.join(td, "ringkas.json"),
                             VONIS_BERKAS=os.path.join(td, "v.jsonl"))
            kini2 = dt.datetime(2026, 10, 28, tzinfo=dt.timezone.utc)
            mt = {"n_dinilai": 250, "n_lolos": 30, "auc_bawah95": .9, "bss": .2}
            assert kunci_vonis("N", "belum_cukup_data", mt, kini2) is None and not os.path.exists(VONIS_BERKAS)
            ak_ = kunci_vonis("N", "lolos", mt, kini2)
            assert ak_["nilai"] == "lolos" and ak_["tanggal"] == "2026-10-28" and ak_["n"] == 250
            assert kunci_vonis("N", "gagal", {**mt, "n_dinilai": 900}, kini2 + dt.timedelta(days=9)) == ak_, "vonis akhir tidak boleh dihitung ulang"
            assert len(baca_jsonl(VONIS_BERKAS)) == 1 and kunci_vonis("N21", "gagal", mt, kini2)["nilai"] == "gagal" and len(baca_jsonl(VONIS_BERKAS)) == 2
            arsip(os.path.join(td, "v.gz"))
            os.remove(VONIS_BERKAS)
            pulih(os.path.join(td, "v.gz"))
            assert len(baca_jsonl(VONIS_BERKAS)) == 2 and kunci_vonis("N", "gagal", mt, kini2)["nilai"] == "lolos"      # vonis ikut arsip & pulih
            os.remove(VONIS_BERKAS)
            # ringkas() menyeluruh: 260 ramalan N (30 api besar, terpisah baik) -> lolos terkunci; data buruk menyusul tidak mengubahnya
            def isi(awal, akhir, t0s, bagus):
                for i in range(awal, akhir):
                    y = 1 if i % 8 == 0 else 0
                    pq = (.7 if y else .05) + (i % 7) * .01 if bagus else (.3 if y else .35)
                    r_ = {"kunci": f"k{i}", "mode": "awal", "t0": t0s, "terbit": t0s, "p": pq, "waspada": pq >= .1, "strata": "mineral", "lat": -2.0 + (i % 30) * .5, "lon": 110.0, "prov": "62"}
                    open(RAMALAN, "a").write(json.dumps(r_) + "\n")
                    open(NILAI, "a").write(json.dumps({"kunci": f"k{i}", "mode": "awal", "n72": 12 if y else 1, "lolos": bool(y), "dinilai": t0s}) + "\n")
            isi(0, 260, "2026-10-10T00:00", True)
            o1 = ringkas(kini=kini2)
            assert o1["vonis_berjalan"] == "lolos" and o1["vonis"] == "lolos" and o1["vonis_akhir"]["nilai"] == "lolos" and o1["vonis_akhir"]["n"] == 260, o1["metrik_vonis"]
            assert o1["registrasi_pertama"] == "2026-10-23"                                                          # berkas tanpa kriteria sebelumnya = registrasi pertama
            isi(260, 700, "2026-10-12T00:00", False)
            o2 = ringkas(kini=kini2 + dt.timedelta(days=1))
            assert o2["vonis_akhir"] == o1["vonis_akhir"] and o2["vonis"] == "lolos" and o2["registrasi_pertama"] == "2026-10-23" and o2["metrik_vonis"]["n_dinilai"] == 700
            assert o2["vonis_berjalan"] in VONIS
            # ---- jangkar luar: vonis.jsonl hilang (cache + R2 gagal) tetapi prospektif.json lama (dari git) memuat vonis_akhir -> TETAP yang lama ----
            os.remove(VONIS_BERKAS)
            isi(700, 900, "2026-10-14T00:00", False)
            o3 = ringkas(kini=kini2 + dt.timedelta(days=3))
            assert o3["vonis_akhir"] == o1["vonis_akhir"] and o3["vonis"] == "lolos", o3["vonis_akhir"]
            rv_ = baca_jsonl(VONIS_BERKAS)
            assert len(rv_) == 1 and rv_[0]["dipulihkan_dari"] == "prospektif.json" and rv_[0]["tanggal"] == "2026-10-28"
            # tanpa jangkar (berkas lama tanpa vonis_akhir) dan vonis.jsonl kosong -> ditetapkan baru dari data (registrasi pertama)
            os.remove(VONIS_BERKAS)
            json.dump({k: v for k, v in o3.items() if k != "vonis_akhir"}, open(RINGKAS, "w"))
            assert ringkas(kini=kini2 + dt.timedelta(days=4))["vonis_akhir"]["tanggal"] == "2026-11-01"
            # prospektif.json ada tetapi tak terbaca -> berhenti, bukan dianggap kosong
            open(RINGKAS, "w").write("{rusak")
            try:
                ringkas(kini=kini2)
                raise AssertionError("harus berhenti")
            except SystemExit:
                pass
            os.remove(RINGKAS)
        # ---- arsip tidak boleh menyusut (cache hilang + pulih gagal) ----
        with tempfile.TemporaryDirectory() as td:
            globals().update(FOLDER=td, RAMALAN=os.path.join(td, "r.jsonl"), NILAI=os.path.join(td, "n.jsonl"), GERBANG=os.path.join(td, "g.jsonl"), RINGKAS=os.path.join(td, "ringkas.json"),
                             VONIS_BERKAS=os.path.join(td, "v.jsonl"))
            for i in range(5):
                open(RAMALAN, "a").write(json.dumps({"kunci": f"r{i}", "mode": "awal", "p": .1}) + "\n")
            open(NILAI, "a").write(json.dumps({"kunci": "r0", "mode": "awal", "n72": 3, "lolos": False}) + "\n")
            open(VONIS_BERKAS, "a").write(json.dumps({"kunci": "vonis_N", "mode": "akhir", "nilai": "lolos", "tanggal": "2026-10-28", "n": 250}) + "\n")
            lengkap = os.path.join(td, "lengkap.gz")
            assert arsip(lengkap) == 7 and baca_tanda() == {"r": 5, "n": 1, "v": 1}
            # cache hilang: catatan kosong, penanda ikut hilang, tetapi arsip R2 yang baru diunduh (lama) diberikan -> ditolak
            for b in (RAMALAN, NILAI, VONIS_BERKAS, tanda_berkas()):
                os.remove(b)
            try:
                arsip(os.path.join(td, "kosong.gz"), lengkap)
                raise AssertionError("arsip menyusut harus ditolak")
            except ArsipMenyusut:
                pass
            assert not os.path.exists(os.path.join(td, "kosong.gz"))
            # cache sebagian hilang, penanda tersisa dari pulih() -> ditolak tanpa arsip lama
            assert pulih(lengkap) == (5, 1) and baca_tanda() == {"r": 5, "n": 1, "v": 1}
            os.remove(RAMALAN)
            try:
                arsip(os.path.join(td, "kurang.gz"))
                raise AssertionError("arsip menyusut harus ditolak")
            except ArsipMenyusut:
                pass
            # lama lebih kecil dari lokal: boleh
            for i in range(5):
                open(RAMALAN, "a").write(json.dumps({"kunci": f"r{i}", "mode": "awal", "p": .1}) + "\n")
            open(RAMALAN, "a").write(json.dumps({"kunci": "r9", "mode": "awal", "p": .1}) + "\n")
            assert arsip(os.path.join(td, "lebih.gz"), lengkap) >= 8 and baca_tanda()["r"] == 6
        # ---- jangkar hash di luar berkas: KRITERIA beku sama dengan commit pendaftaran 409f31f (dilewati bila git/commit tak tersedia) ----
        try:
            import re, subprocess
            asli = subprocess.run(["git", "show", "409f31f:scripts/sebaran/prospektif.py"], cwd=os.path.dirname(DIR), capture_output=True, text=True, timeout=30)
            m_ = re.search(r'KRITERIA = \{"tanggal_registrasi": "([^"]+)", "n_dinilai_min": (\d+), "n_lolos_min": (\d+), "auc_bawah95_min": ([\d.]+), "bss_min": ([\d.]+)', asli.stdout) if asli.returncode == 0 else None
        except (OSError, subprocess.SubprocessError):
            m_ = None
        if m_:
            assert (m_.group(1), int(m_.group(2)), int(m_.group(3)), float(m_.group(4)), float(m_.group(5))) == tuple(KRITERIA[k] for k in BEKU), "KRITERIA beku beda dari commit pendaftaran 409f31f"
            assert kriteria_sha({k: v for k, v in zip(BEKU, (m_.group(1), int(m_.group(2)), int(m_.group(3)), float(m_.group(4)), float(m_.group(5))))}) == KRITERIA_SHA256
        else:
            print("catatan: jangkar commit 409f31f tidak tersedia (git/clone dangkal); uji jangkar luar dilewati", file=sys.stderr)
        print("ok")
    elif sys.argv[1:2] == ["arsip"]:
        try:
            print("arsip", arsip(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None), "baris")
        except ArsipMenyusut as e:
            print("ARSIP DITOLAK:", e, file=sys.stderr)
            sys.exit(3)  # kode keluar 3 khusus: langkah bash -e berhenti sebelum `wrangler r2 object put`
    elif sys.argv[1:2] == ["pulih"]:
        print("pulih (ramalan, nilai):", pulih(sys.argv[2]) if os.path.exists(sys.argv[2]) else "sumber tidak ada, dilewati")
    else:
        main()
