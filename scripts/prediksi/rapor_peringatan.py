"""PD-1 Rapor peringatan dini, laporan 4-bulanan (RU-087; ALGORITMA kedeputian sec 7.2; DESAIN-TEKNIS sec 6.6).

Menilai peringatan yang SUDAH terbit (D1 `peringatan`: BMKG, InaTEWS, deteksi sendiri) lawan kejadian tercatat, bukan model /prediksi.
Keluaran: berkas bentuk rapor.py (kartu) `rapor_peringatan` untuk langkah jalan.py Ruang Unit (R2 unit/rapor_peringatan.json, BUKAN public/prediksi/data).
Pemanggil: shim `scripts/bnpb/unit/pd1.py` (milik ruang-bnpb) yang mengimpor `jalan` dan `cek` dari berkas ini.

Aturan:
  - kab peringatan (NAMA) dipetakan ke kode lewat (prov, kunci nama) seperti pus2; tanpa kab = dihitung terpisah, tidak dinilai; dicabut dikeluarkan dan dihitung terpisah
  - episode = peringatan (kab, jenis) yang bersinggungan atau berjarak <= 24 jam digabung; tingkat = tertinggi
  - hit: ada kejadian jenis cocok di kab sama pada tanggal WIB [mulai, akhir + 1 hari]; palsu: tidak ada; terlewat: kejadian tanpa episode yang mulai di [tanggal - 3, tanggal]
  - DIBI dan logbook dinilai TERPISAH (satu kartu per sumber), tidak dirata-rata, tidak digabung
  - jendela nilai per sumber: DIBI dari `dari` sampai `sampai` - 14 hari (terisi susulan); logbook dari kejadian paling awal di D1 sampai kemarin;
    episode yang jendelanya belum tertutup tidak dinilai (bukan palsu)
  - hit + terlewat < 10: POD kosong; hit + palsu < 10: FAR kosong; n (hit + palsu + terlewat) < 30: vonis "belum teruji"
  - tanpa pembanding persistensi atau klimatologi: ini rapor peringatan terbit, bukan model; pembanding model ada di `data.prakiraan_kita` (dari skor.json /prediksi, apa adanya)
  - terlewat hanya ada di baris "Semua tingkat" (kejadian tak punya tingkat peringatan): POD tidak didefinisikan per tingkat (asumsi)

  python3 -I scripts/prediksi/rapor_peringatan.py --cek
"""
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(SINI, "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "bnpb", "unit"))  # -I tidak menaruh folder skrip; pustaka rapor/pus2/wil1 dipakai ulang, tidak disalin
import pus2  # noqa: E402
import rapor  # noqa: E402
import wil1  # noqa: E402

WIB = timezone(timedelta(hours=7))
GABUNG_MS = 24 * 3600 * 1000
MARGIN_DIBI = 14
MARGIN_LOGBOOK = 3   # hari: catatan logbook sering menyusul; jendela berhenti 3 hari sebelum kemarin (asumsi)
KET_TIADA = "tidak ada peringatan terbit di D1"
KET_LOGBOOK = "jendela logbook berhenti 3 hari sebelum kemarin (catatan menyusul)"
BELUM_TERLEWAT = 3
N_PARAH = 10     # asumsi ALGORITMA sec 0
N_MIN = 30       # sama dengan skor.json /prediksi
TINGKAT = ("Waspada", "Siaga", "Awas")
URUT = {t: i for i, t in enumerate(TINGKAT)}
JENIS_PERINGATAN = ("banjir", "cuaca", "karhutla", "gempa", "tsunami")
NAMA_JENIS = {"banjir": "Banjir", "cuaca": "Cuaca ekstrem", "karhutla": "Kebakaran hutan dan lahan", "gempa": "Gempa bumi", "tsunami": "Tsunami"}
KEJADIAN_DARI = {"banjir": "banjir", "cuaca": "cuaca", "karhutla": "karhutla", "gempa": "gempabumi"}  # tsunami: tak ada jenis kejadian di logbook/DIBI
SQL = ("SELECT jenis, tingkat, prov, kab, dibuat, berlaku_hingga, dicabut IS NOT NULL AS dicabut FROM peringatan "
       "WHERE dibuat >= {dari} ORDER BY dibuat, kunci LIMIT 50000")
KET_PALSU = ("Palsu = episode tanpa kejadian tercatat di jendelanya. Logbook dan DIBI tidak lengkap: palsu cenderung terlalu tinggi, terlewat terlalu rendah "
             "(tanpa umpan BPBD, U11). Peringatan tanpa kab tidak dikreditkan: hit dan POD batas bawah.")


def tgl_wib(ms):
    return datetime.fromtimestamp(ms / 1000, WIB).date()


def periode_dari(d):
    """(tahun, ke) dengan ke 1 = Januari-April, 2 = Mei-Agustus, 3 = September-Desember (ews_evaluasi, 4 bulan)."""
    return d.year, (d.month - 1) // 4 + 1


def batas(per):
    th, k = per
    return date(th, 4 * (k - 1) + 1, 1), (date(th, 4 * k + 1, 1) if k < 3 else date(th + 1, 1, 1)) - timedelta(days=1)


def nama_periode(per):
    return f"{('Januari-April', 'Mei-Agustus', 'September-Desember')[per[1] - 1]} {per[0]}"


def sebelum(per):
    return (per[0], per[1] - 1) if per[1] > 1 else (per[0] - 1, 3)


def episode(rows, kode_kab):
    """rows D1 -> (episode [{kab, jenis, tingkat, mulai, akhir (ms)}], dicabut, tanpa_kab {jenis: n}, jenis_asing). Peringatan tanpa kode kab tidak dinilai."""
    dicabut = asing = 0
    tanpa = {}
    per = {}
    for r in rows:
        if r.get("dicabut"):
            dicabut += 1
            continue
        if r.get("jenis") not in JENIS_PERINGATAN or r.get("tingkat") not in URUT:
            asing += 1
            continue
        kab = kode_kab(r.get("prov"), r.get("kab"))
        if kab is None:
            tanpa[r["jenis"]] = tanpa.get(r["jenis"], 0) + 1
            continue
        per.setdefault((kab, r["jenis"]), []).append((int(r["dibuat"]), int(r["berlaku_hingga"]), r["tingkat"]))
    out = []
    for (kab, jenis), daftar in per.items():
        cur = None
        for m, a, t in sorted(daftar):
            if cur and m <= cur["akhir"] + GABUNG_MS:
                cur["akhir"] = max(cur["akhir"], a)
                if URUT[t] > URUT[cur["tingkat"]]:
                    cur["tingkat"] = t
            else:
                cur = {"kab": kab, "jenis": jenis, "tingkat": t, "mulai": m, "akhir": a}
                out.append(cur)
    return out, dicabut, tanpa, asing


def nilai(eps, kejadian, awal, akhir, awal_peringatan):
    """eps dari episode(); kejadian = {(kab, jenis kejadian): {tanggal}}; [awal, akhir] = jendela sumber kejadian.
    -> {"ep": {(jenis, tingkat, periode): [hit, palsu]}, "tl": {(jenis, periode): n}, "belum_tertutup": n}"""
    ep, tl, belum = {}, {}, 0
    for e in eps:
        jk = KEJADIAN_DARI.get(e["jenis"])
        m, a = tgl_wib(e["mulai"]), tgl_wib(e["akhir"])
        if jk is None:
            continue
        if m < awal or a + timedelta(days=1) > akhir:
            if a + timedelta(days=1) > akhir:
                belum += 1
            continue
        hit = any(m <= d <= a + timedelta(days=1) for d in kejadian.get((e["kab"], jk), ()))
        c = ep.setdefault((e["jenis"], e["tingkat"], periode_dari(m)), [0, 0])
        c[0 if hit else 1] += 1
    mulai = {}
    for e in eps:
        mulai.setdefault((e["kab"], e["jenis"]), []).append(tgl_wib(e["mulai"]))
    for (kab, jk), tanggal in kejadian.items():
        for jenis, kj in KEJADIAN_DARI.items():
            if kj != jk:
                continue
            for d in tanggal:
                if max(awal, awal_peringatan + timedelta(days=BELUM_TERLEWAT)) <= d <= akhir and not any(
                        d - timedelta(days=BELUM_TERLEWAT) <= m <= d for m in mulai.get((kab, jenis), ())):
                    k = (jenis, periode_dari(d))
                    tl[k] = tl.get(k, 0) + 1
    return {"ep": ep, "tl": tl, "belum_tertutup": belum}


def sel(hit, palsu, terlewat):
    """-> baris angka. terlewat None = tak didefinisikan di baris ini (POD kosong)."""
    pod = hit / (hit + terlewat) if terlewat is not None and hit + terlewat >= N_PARAH else None
    far = palsu / (hit + palsu) if hit + palsu >= N_PARAH else None
    n = hit + palsu + (terlewat or 0)
    return {"hit": hit, "palsu": palsu, "terlewat": terlewat, "pod": pod, "far": far,
            "vonis": "belum teruji" if n < N_MIN else "terukur", "ket": "belum cukup data" if pod is None and far is None else ""}


def baris_periode(hasil, per, ket_tambah=""):
    out = []
    for jenis in JENIS_PERINGATAN:
        if jenis not in KEJADIAN_DARI:
            continue
        per_t = {t: hasil["ep"].get((jenis, t, per)) for t in TINGKAT}
        tl = hasil["tl"].get((jenis, per), 0)
        if not any(per_t.values()) and not tl:
            continue
        if not any(per_t.values()):   # kejadian ada, episode peringatan (kab terpetakan) tidak: POD tidak didefinisikan
            out.append({"jenis": NAMA_JENIS[jenis], "tingkat": "Semua tingkat", "hit": 0, "palsu": 0, "terlewat": tl, "pod": None, "far": None,
                        "vonis": "belum teruji", "ket": KET_TIADA})
            continue
        for t in TINGKAT:
            if per_t[t]:
                out.append({"jenis": NAMA_JENIS[jenis], "tingkat": t, **{k: v for k, v in sel(per_t[t][0], per_t[t][1], None).items()}})
        h = sum(v[0] for v in per_t.values() if v)
        p = sum(v[1] for v in per_t.values() if v)
        out.append({"jenis": NAMA_JENIS[jenis], "tingkat": "Semua tingkat", **sel(h, p, tl)})
    for x in out:
        x["ket"] = "; ".join(t for t in (x["ket"], ket_tambah) if t)
    return out


def kartu_sumber(kode, nama, hasil, per):
    b = baris_periode(hasil, per, KET_LOGBOOK if kode == "logbook" else "")
    ko = [{"k": "jenis", "label": "Jenis bahaya"}, {"k": "tingkat", "label": "Tingkat"},
          {"k": "hit", "label": "Hit", "angka": True, "title": "episode peringatan dengan kejadian tercatat di kab sama pada jendelanya"},
          {"k": "palsu", "label": "Palsu", "angka": True, "title": KET_PALSU},
          {"k": "terlewat", "label": "Terlewat", "angka": True, "title": "kejadian tanpa peringatan mulai dalam 3 hari sebelumnya; hanya di baris Semua tingkat. " + KET_PALSU},
          {"k": "pod", "label": "POD", "angka": True, "desimal": 2, "title": "hit / (hit + terlewat); kosong bila hit + terlewat kurang dari 10 atau di baris per tingkat"},
          {"k": "far", "label": "FAR", "angka": True, "desimal": 2, "title": "palsu / (hit + palsu); kosong bila hit + palsu kurang dari 10"},
          {"k": "vonis", "label": "Vonis", "title": "belum teruji bila hit + palsu + terlewat kurang dari 30"},
          {"k": "ket", "label": "Keterangan", "title": "belum cukup data = hit + terlewat atau hit + palsu kurang dari 10; kosong bukan nol"}]
    rows = [{k: r[k] for k in ("jenis", "tingkat", "hit", "palsu", "terlewat", "pod", "far", "vonis", "ket")} for r in b]
    for x in rows:
        x["ket"] = x["ket"] or None   # sel teks kosong ditolak rapor.kartu
    return rapor.kartu(
        id=f"pd1-{per[0]}-{per[1]}-{kode}", sistem="PD-1", pil=f"Periode {nama_periode(per)}", ikon="timbang", judul=f"Rapor peringatan dini, kejadian {nama}",
        angka=[{"k": "baris", "label": "Jenis dan tingkat yang dinilai", "nilai": len(b)}],
        kolom=ko, baris=rows, rumus="POD = hit / (hit + terlewat); FAR = palsu / (hit + palsu); episode = peringatan kab dan jenis sama yang berjarak paling lama 24 jam digabung",
        sumber=["D1 peringatan", {"dibi": "dibi_kejadian.json", "logbook": "D1 logbook_kejadian"}[kode]], label=["hitungan_kita"], aturan=["ews_evaluasi"],
        asumsi=["Asumsi: gabung 24 jam, n 10, belum teruji di bawah 30"], unduh=f"rapor_peringatan_{kode}.csv")


def prakiraan_kita(skor):
    """Ringkasan skor /prediksi apa adanya (label per sumber terpisah, tanpa rata-rata); None bila skor.json tak ada."""
    if not skor:
        return None
    out = {"dibuat": skor.get("dibuat"), "n_min": skor.get("n_min"), "kode": {}}
    label = {"HJN": "era5", "API": "firms", "BNJ": "dibi", "LSR": "dibi"}
    for k, v in (skor.get("kode") or {}).items():
        if k not in label:
            continue
        out["kode"][k] = {"label": label[k], "status": v.get("status"), "alasan": v.get("alasan"),
                          "grup": [{x: g.get(x) for x in ("ambang", "tenggang", "tahap", "n", "n_banding", "hari_banding", "brier", "brier_persistensi", "brier_klimatologi",
                                                          "bss_persistensi", "bss_klimatologi", "pod", "far", "vonis")} for g in v.get("grup") or []]}
    lb = skor.get("logbook")
    if isinstance(lb, dict):
        out["logbook"] = {"label": "logbook", "grup": lb.get("grup"), "catatan": lb.get("catatan")}
    return out


def _json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def kejadian_dari(daftar):
    out = {}
    for x in daftar:
        out.setdefault((x["kab"], x["jenis"]), set()).add(date.fromisoformat(x["tgl"]))
    return out


def bangun(rows, logbook_rows, dibi, kunci_kab, skor, sek):
    hari = wil1.hari_wib(sek)
    kode_kab = lambda prov, kab: kunci_kab.get((str(prov), wil1.kunci_nama(kab))) if kab else None  # noqa: E731
    eps, dicabut, tanpa, asing = episode(rows, kode_kab)
    if not rows:
        raise RuntimeError("tabel peringatan kosong atau tak terbaca: tidak ada yang dinilai")
    awal_p = min(tgl_wib(int(r["dibuat"])) for r in rows)
    lb, lb_tak, _ = pus2.siapkan_logbook(logbook_rows, kunci_kab)
    db, db_tak, _ = pus2.siapkan_dibi(dibi)
    jendela = {"dibi": (date.fromisoformat(dibi["dari"]), date.fromisoformat(dibi["sampai"]) - timedelta(days=MARGIN_DIBI)),
               "logbook": (min((date.fromisoformat(x["tgl"]) for x in lb), default=hari), hari - timedelta(days=1 + MARGIN_LOGBOOK))}
    kej = {"dibi": kejadian_dari(db), "logbook": kejadian_dari(lb)}
    sekarang = periode_dari(hari)
    pers = [sebelum(sekarang), sekarang]
    kartu, data_p = [], []
    for kode, nama in (("dibi", "DIBI"), ("logbook", "logbook Pusdalops")):
        awal, akhir = jendela[kode]
        h = nilai(eps, kej[kode], awal, akhir, awal_p)
        for per in pers:
            b0, b1 = batas(per)
            if b1 < awal or b0 > akhir:
                data_p.append({"sumber": kode, "periode": nama_periode(per), "dinilai": False, "alasan": "di luar jendela kejadian sumber ini"})
                continue
            kartu.append(kartu_sumber(kode, nama, h, per))
            data_p.append({"sumber": kode, "periode": nama_periode(per), "dinilai": True, "baris": baris_periode(h, per),
                           "dari": max(b0, awal).isoformat(), "sampai": min(b1, akhir).isoformat()})
    if not kartu:
        raise RuntimeError("tidak ada periode yang bisa dinilai pada jendela DIBI maupun logbook")
    atr = [{"nama": "Peringatan dini D1 (BMKG, InaTEWS, deteksi sendiri)", "url": "repo:migrations/0010_peringatan.sql", "diambil": hari.isoformat(), "lisensi": "data internal BNPB, hanya tampil untuk staf"},
           {"nama": "DIBI BNPB (dibi.bnpb.go.id)", "url": "repo:public/data/dibi_kejadian.json", "diambil": dibi["sampai"], "lisensi": "data publik DIBI"},
           {"nama": "Logbook Pusdalops (kolom terpilih)", "url": "repo:migrations/0088_logbook.sql", "diambil": hari.isoformat(), "lisensi": "data internal BNPB, hanya tampil untuk staf"}]
    b = rapor.berkas(kartu, atr)
    b["data"] = {"hari": hari.isoformat(), "episode": len(eps), "dicabut": dicabut, "tanpa_kab": tanpa, "jenis_asing": asing,
                 "tsunami": {"episode": sum(1 for e in eps if e["jenis"] == "tsunami"), "dinilai": False,
                             "alasan": "tidak ada jenis kejadian tsunami di logbook maupun DIBI"}, "margin_logbook_hari": MARGIN_LOGBOOK, "periode": data_p,
                 "jendela": {k: [v[0].isoformat(), v[1].isoformat()] for k, v in jendela.items()},
                 "belum_tertutup": {k: nilai(eps, kej[k], *jendela[k], awal_p)["belum_tertutup"] for k in kej},
                 "logbook_tak_terpetakan": lb_tak, "dibi_tak_terpetakan": db_tak, "umpan_bpbd": "menunggu (U11)", "prakiraan_kita": prakiraan_kita(skor)}
    return b


def jalan(sekarang=None, jalankan=None):
    import terima  # noqa: E402  (scripts/bnpb/unit; pembungkus wrangler d1)
    sek = sekarang or datetime.now(timezone.utc)
    run = jalankan or terima._wrangler
    dari = int((sek - timedelta(days=370)).timestamp() * 1000)
    d = json.loads(run(SQL.format(dari=dari)))
    if not isinstance(d, list) or not d or d[0].get("success") is not True:
        raise RuntimeError("balasan wrangler d1 tak dikenal")
    lb = pus2.baca_logbook(run)
    kab = wil1._json(wil1.BERKAS["kab"])
    kunci_kab, _ = wil1.indeks_kab(kab)
    skor_p = os.path.join(AKAR, "public", "prediksi", "data", "skor.json")
    skor = _json(skor_p) if os.path.exists(skor_p) else None
    return {"rapor_peringatan": bangun(d[0].get("results") or [], lb, _json(pus2.DIBI), kunci_kab, skor, sek)}


def cek():
    ms = lambda y, m, dd, jam=12: int(datetime(y, m, dd, jam, tzinfo=WIB).timestamp() * 1000)  # noqa: E731
    kode = lambda prov, kab: {"X": "3201"}.get(kab)  # noqa: E731
    # episode: dua peringatan berjarak <= 24 jam digabung, tingkat tertinggi; dicabut dan tanpa kab dihitung terpisah
    rows = [{"jenis": "banjir", "tingkat": "Waspada", "prov": "32", "kab": "X", "dibuat": ms(2026, 5, 1), "berlaku_hingga": ms(2026, 5, 2), "dicabut": 0},
            {"jenis": "banjir", "tingkat": "Awas", "prov": "32", "kab": "X", "dibuat": ms(2026, 5, 3, 6), "berlaku_hingga": ms(2026, 5, 4), "dicabut": 0},
            {"jenis": "banjir", "tingkat": "Siaga", "prov": "32", "kab": "X", "dibuat": ms(2026, 5, 9), "berlaku_hingga": ms(2026, 5, 10), "dicabut": 1},
            {"jenis": "banjir", "tingkat": "Siaga", "prov": "32", "kab": None, "dibuat": ms(2026, 5, 9), "berlaku_hingga": ms(2026, 5, 10), "dicabut": 0}]
    eps, dc, tk, _ = episode(rows, kode)
    assert len(eps) == 1 and eps[0]["tingkat"] == "Awas" and (dc, tk) == (1, {"banjir": 1}), (eps, dc, tk)
    # kasus ALGORITMA: hit 12, palsu 20, terlewat 4 -> POD 0,75, FAR 0,625
    eps, kej, d0 = [], set(), date(2026, 5, 1)
    for i in range(32):
        m = d0 + timedelta(days=5 * i)
        eps.append({"kab": "3201", "jenis": "banjir", "tingkat": "Waspada", "mulai": ms(m.year, m.month, m.day), "akhir": ms(m.year, m.month, m.day, 20)})
        if i < 12:
            kej.add(m)
    for j in range(4):   # terlewat: jauh dari episode mana pun (hari ke-200 dan seterusnya)
        kej.add(d0 + timedelta(days=200 + 10 * j))
    h = nilai(eps, {("3201", "banjir"): kej}, date(2026, 4, 1), date(2027, 12, 31), date(2026, 4, 1))
    c = [sum(h["ep"][k][i] for k in h["ep"] if k[1] == "Waspada") for i in (0, 1)]
    tl = sum(h["tl"].values())
    s = sel(c[0], c[1], tl)
    assert (c, tl) == ([12, 20], 4) and s["pod"] == 0.75 and s["far"] == 0.625 and s["vonis"] == "terukur", (c, tl, s)
    # n kecil: POD dan FAR kosong, belum teruji (kosong bukan nol)
    k = sel(3, 2, 1)
    assert k["pod"] is None and k["far"] is None and k["vonis"] == "belum teruji" and k["ket"] == "belum cukup data", k
    assert sel(8, 3, 1)["pod"] is None and sel(9, 3, 1)["pod"] == 0.9 and sel(10, 3, 0)["pod"] == 1.0, "ambang n=10 pada hit + terlewat"
    # episode yang jendelanya belum tertutup tidak dinilai palsu
    e = [{"kab": "3201", "jenis": "banjir", "tingkat": "Siaga", "mulai": ms(2026, 6, 1), "akhir": ms(2026, 6, 2)}]
    assert nilai(e, {}, date(2026, 1, 1), date(2026, 6, 2), date(2026, 1, 1))["ep"] == {}, "belum tertutup dihitung palsu"
    assert nilai(e, {}, date(2026, 1, 1), date(2026, 6, 3), date(2026, 1, 1))["ep"] == {("banjir", "Siaga", (2026, 2)): [0, 1]}
    # 40 gempa tanpa episode peringatan: POD kosong, belum teruji, bukan 0
    gp = {"ep": {}, "tl": {("gempa", (2026, 2)): 40}}
    br = baris_periode(gp, (2026, 2), "x")
    assert len(br) == 1 and br[0]["pod"] is None and br[0]["vonis"] == "belum teruji" and br[0]["ket"].startswith(KET_TIADA) and br[0]["terlewat"] == 40, br
    assert sel(3, 2, 1)["ket"] == "belum cukup data" and kartu_sumber("logbook", "logbook", h, (2026, 2))["baris"][0]["ket"].endswith(KET_LOGBOOK)
    # periode 4-bulanan
    assert periode_dari(date(2026, 4, 30)) == (2026, 1) and periode_dari(date(2026, 9, 1)) == (2026, 3) and sebelum((2026, 1)) == (2025, 3)
    assert batas((2026, 2)) == (date(2026, 5, 1), date(2026, 8, 31))
    # berkas lolos skema rapor (label, rumus, tanpa kata terlarang); keterbatasan palsu ada di title
    kt = kartu_sumber("dibi", "DIBI", h, (2026, 2))
    b = rapor.berkas([kt], [{"nama": "x", "url": "repo:x", "diambil": "2026-01-01", "lisensi": "x"}])
    assert kt["kolom"][3]["title"].startswith("Palsu = ") and kt["label"] == ["hitungan_kita"] and b["kartu"], kt
    assert prakiraan_kita(None) is None
    print("rapor_peringatan.py cek: ok")


if __name__ == "__main__":
    if "--cek" in sys.argv[1:]:
        cek()
    else:
        print("pakai --cek; langkah produksi lewat jalan.py (shim pd1.py)", file=sys.stderr)
        sys.exit(2)
