"""PUS-2 Usulan KIB 16 digit dan pencocok logbook ke DIBI (DESAIN-TEKNIS sec 6.5; ALGORITMA sec 10.7; tiket RU-085).

Langkah jalan.py (harian). Masukan: logbook_kejadian dan angka dampak terakhir di logbook_entri (D1, SATU kueri `wrangler d1 execute`, kolom bernama,
tanpa teks bebas dan tanpa nama orang), public/data/dibi_kejadian.json (365 hari), public/data/bnpb/wilayah.json, padanan_kab_dibi.petakan (kode BPS ke Kemendagri).
Gagal membaca D1 = galat jelas, keluaran kemarin tetap di R2 (bukan daftar kosong).
  KIB usulan = prov(2) + kab(2) + kode bencana(3) + tanggal mulai YYYYMMDD(8) + indeks 1-9 (rumus sama dengan kib() di src/pusdalops_umum.js, Juknis 7/2023 hal. 7-8);
    jenis tanpa kode tidak diberi KIB. Selalu berlabel "KIB usulan", bukan nomor kejadian resmi.
  ambang kejadian (Juknis 7/2023), sebatas kolom yang ada di D1: meninggal 1 atau lebih; luka atau mengungsi 50 jiwa atau lebih; rumah rusak (berat, sedang, ringan) 5 atau lebih;
    lahan 1 ha atau lebih; ada SK status darurat. Terdampak dan permintaan bantuan nasional tidak ada di kolom itu: tidak dihitung, bukan dianggap nol.
  cocok ke DIBI bila kab, kode bencana sama dan selisih tanggal paling lama 2 hari; satu baris DIBI hanya dipasangkan ke satu kejadian (selisih terkecil, lalu urutan catat)
  tiga daftar: cocok; logbook tanpa DIBI lewat 7 hari; DIBI tanpa logbook. Kejadian di luar rentang DIBI tidak dibandingkan.

  python3 -I scripts/bnpb/unit/pus2.py --cek
"""
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402
import wil1  # noqa: E402

AKAR = rapor.AKAR
sys.path.insert(0, os.path.join(AKAR, "scripts", "data"))
import padanan_kab_dibi as PAD  # noqa: E402

DIBI = os.path.join(AKAR, "public", "data", "dibi_kejadian.json")
KODE_KIB = {"banjir": "101", "longsor": "102", "cuaca": "104", "kekeringan": "105", "karhutla": "106", "gempabumi": "107", "gunungapi": "109",
            "kebakaran_permukiman": "202", "konflik_sosial": "301"}
# kategori DIBI -> jenis logbook; kategori tanpa jenis kode (gelombang pasang, gagal teknologi, lainnya) tidak bisa dicocokkan
KATEGORI_DIBI = {"Kebakaran hutan dan lahan": "karhutla", "Banjir": "banjir", "Cuaca ekstrem": "cuaca", "Longsor": "longsor", "Kebakaran permukiman": "kebakaran_permukiman",
                 "Kekeringan": "kekeringan", "Gempabumi": "gempabumi", "Erupsi gunung api": "gunungapi", "Konflik sosial": "konflik_sosial"}
JENIS_NAMA = {"banjir": "Banjir", "longsor": "Longsor", "cuaca": "Cuaca ekstrem", "kekeringan": "Kekeringan", "karhutla": "Kebakaran hutan dan lahan", "gempabumi": "Gempa bumi",
              "gunungapi": "Gunung api", "kebakaran_permukiman": "Kebakaran permukiman", "konflik_sosial": "Konflik sosial"}
TOLERANSI_HARI = 2
TENGGANG_HARI = 7
MAKS_BARIS = 100
AMBANG = {"md": 1, "luka": 50, "mengungsi_jiwa": 50, "rumah": 5, "luas_ha": 1}
SQL = ("SELECT k.jenis, k.prov, k.kab, substr(k.mulai, 1, 10) AS mulai, k.dibuat, "
       "e.md, e.luka, e.mengungsi_jiwa, e.rumah_rb, e.rumah_rs, e.rumah_rr, e.luas_ha, "
       "EXISTS (SELECT 1 FROM logbook_sk s WHERE s.kejadian_id = k.id) AS ada_sk "
       "FROM logbook_kejadian k LEFT JOIN logbook_entri e ON e.id = "
       "(SELECT x.id FROM logbook_entri x WHERE x.kejadian_id = k.id ORDER BY x.waktu DESC, x.id DESC LIMIT 1) "
       "WHERE k.dummy = 0 ORDER BY k.dibuat, k.id")
KOLOM_TERLARANG = ("catatan", "kendala", "kebutuhan", "kec", "desa", "oleh", "dibuat_oleh", "sumber_instansi", "korban", "rentan", "pemberi", "posko", "dokumentasi", "lat", "lon")


def kib(prov, kab, jenis, tanggal, indeks=1):
    """Sama dengan kib() di src/pusdalops_umum.js: kab = 2 angka atau 4 angka berawalan prov; masukan tak sah atau jenis tanpa kode = None."""
    prov = str(prov)
    if not re.fullmatch(r"\d{2}", prov):
        return None
    kab = str(kab)
    k4 = kab if re.fullmatch(r"\d{4}", kab) else prov + kab
    try:
        ok = bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(tanggal))) and date.fromisoformat(tanggal) is not None
    except ValueError:
        ok = False
    if not re.fullmatch(r"\d{4}", k4) or not k4.startswith(prov) or jenis not in KODE_KIB or not ok or isinstance(indeks, bool) or not isinstance(indeks, int) or not 1 <= indeks <= 9:
        return None
    return k4 + KODE_KIB[jenis] + tanggal.replace("-", "") + str(indeks)


def memenuhi_ambang(r):
    """-> True, False, atau None (semua angka dampak kosong dan tanpa SK: belum bisa dinilai, bukan di bawah ambang)."""
    nilai = [r.get(k) for k in ("md", "luka", "mengungsi_jiwa", "rumah_rb", "rumah_rs", "rumah_rr", "luas_ha")]
    if r.get("ada_sk"):
        return True
    if all(v is None for v in nilai):
        return None
    rumah = sum(r.get(k) or 0 for k in ("rumah_rb", "rumah_rs", "rumah_rr")) if any(r.get(k) is not None for k in ("rumah_rb", "rumah_rs", "rumah_rr")) else 0
    return ((r.get("md") or 0) >= AMBANG["md"] or (r.get("luka") or 0) >= AMBANG["luka"] or (r.get("mengungsi_jiwa") or 0) >= AMBANG["mengungsi_jiwa"]
            or rumah >= AMBANG["rumah"] or (r.get("luas_ha") or 0) >= AMBANG["luas_ha"])


def siapkan_logbook(rows, kunci_kab):
    """Baris D1 -> kejadian dengan kab Kemendagri dan KIB usulan. kunci_kab: {(prov, kunci_nama): kode 4 angka}.
    -> (daftar, tak_terpetakan, tanpa_kode). Indeks KIB menurut urutan catat (rows sudah urut dibuat) per (kab, kode, tanggal); ke-10 dan seterusnya None."""
    out, tak, tanpa = [], 0, 0
    hitung = {}
    for r in rows:
        kode = kunci_kab.get((str(r.get("prov")), wil1.kunci_nama(r.get("kab"))))
        if r.get("jenis") not in KODE_KIB:
            tanpa += 1
            continue
        if kode is None or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(r.get("mulai"))):
            tak += 1
            continue
        k = (kode, r["jenis"], r["mulai"])
        hitung[k] = hitung.get(k, 0) + 1
        out.append({"kab": kode, "kab_nama": r["kab"], "prov": r["prov"], "jenis": r["jenis"], "tgl": r["mulai"], "ambang": memenuhi_ambang(r),
                    "kib": kib(r["prov"], kode, r["jenis"], r["mulai"], hitung[k])})
    return out, tak, tanpa


def siapkan_dibi(dibi, peta=PAD.petakan):
    """Baris DIBI yang memenuhi ambang DIBI sendiri (bencana tidak 0) dan punya jenis kode -> (daftar, tak_terpetakan, tanpa_kode)."""
    out, tak, tanpa = [], 0, 0
    for i, x in enumerate(dibi.get("kejadian") or []):
        if x.get("bencana") == 0:
            continue
        jenis = KATEGORI_DIBI.get(x.get("kategori"))
        if jenis is None:
            tanpa += 1
            continue
        kode = peta(re.sub(r"\D", "", str(x.get("kab_kode") or "")) or None)
        if kode is None:
            tak += 1
            continue
        out.append({"i": i, "kab": kode, "kab_nama": x.get("kab"), "jenis": jenis, "tgl": x["tanggal"], "n": x.get("kejadian") or 1})
    return out, tak, tanpa


def pasangkan(logbook, dibi):
    """-> {indeks logbook: indeks dibi}. Satu baris DIBI satu kejadian; selisih tanggal terkecil, lalu urutan catat, lalu urutan DIBI."""
    cand = []
    per = {}
    for j, d in enumerate(dibi):
        per.setdefault((d["kab"], d["jenis"]), []).append(j)
    for i, l in enumerate(logbook):
        t = date.fromisoformat(l["tgl"])
        for j in per.get((l["kab"], l["jenis"]), []):
            s = abs((date.fromisoformat(dibi[j]["tgl"]) - t).days)
            if s <= TOLERANSI_HARI:
                cand.append((s, i, j))
    cand.sort()
    pl, pd = {}, set()
    for s, i, j in cand:
        if i not in pl and j not in pd:
            pl[i] = j
            pd.add(j)
    return pl


def bangun(rows, dibi, kunci_kab, atribusi, dibuat, hari_ini, peta=PAD.petakan):
    lb, lb_tak, lb_tanpa = siapkan_logbook(rows, kunci_kab)
    db, db_tak, db_tanpa = siapkan_dibi(dibi, peta)
    dari, sampai = date.fromisoformat(dibi["dari"]), date.fromisoformat(dibi["sampai"])
    pembanding, luar, bawah, belum_nilai = [], 0, 0, 0
    for l in lb:
        t = date.fromisoformat(l["tgl"])
        if not (dari + timedelta(days=TOLERANSI_HARI) <= t <= sampai - timedelta(days=TOLERANSI_HARI)):
            luar += 1
        elif l["ambang"] is None:
            belum_nilai += 1
        elif l["ambang"] is False:
            bawah += 1
        else:
            pembanding.append(l)
    pas = pasangkan(pembanding, db)
    dipakai = set(pas.values())
    cocok = [(pembanding[i], db[j]) for i, j in sorted(pas.items())]
    tanpa_dibi = [l for i, l in enumerate(pembanding) if i not in pas and (hari_ini - date.fromisoformat(l["tgl"])).days > TENGGANG_HARI]
    menunggu = sum(1 for i, l in enumerate(pembanding) if i not in pas) - len(tanpa_dibi)
    # DIBI tanpa logbook hanya untuk baris yang tanggalnya di dalam rentang logbook yang kita punya (logbook D1 mulai dari catatan paling awal)
    tgl_lb = [date.fromisoformat(l["tgl"]) for l in lb]
    awal_lb = min(tgl_lb) if tgl_lb else None
    tanpa_logbook = [d for j, d in enumerate(db) if j not in dipakai and awal_lb is not None and date.fromisoformat(d["tgl"]) >= awal_lb]
    diluar_logbook = sum(1 for j, d in enumerate(db) if j not in dipakai) - len(tanpa_logbook)
    nama = lambda j: JENIS_NAMA[j]  # noqa: E731
    sama_kolom_l = [{"k": "kib", "label": "KIB usulan", "title": "KIB usulan (Kode Identitas Bencana) 16 digit menurut Juknis 7/2023, dihitung dari kolom logbook; bukan nomor kejadian resmi"},
                    {"k": "kab", "label": "Kab/kota"}, {"k": "jenis", "label": "Jenis"}, {"k": "tgl", "label": "Tanggal mulai"}]
    bar = lambda l: {"kib": l["kib"], "kab": l["kab_nama"], "jenis": nama(l["jenis"]), "tgl": l["tgl"]}  # noqa: E731
    k_cocok = rapor.kartu(
        id="pus2-cocok", sistem="PUS-2", pil="KIB dan DIBI", ikon="data", judul="Kejadian logbook yang cocok dengan DIBI",
        angka=[{"k": "cocok", "label": "Kejadian logbook yang cocok dengan satu baris DIBI", "nilai": len(cocok) if pembanding else None, "title": f"kab dan jenis sama, selisih tanggal paling lama {TOLERANSI_HARI} hari"},
               {"k": "pembanding", "label": "Kejadian logbook yang memenuhi ambang dan bisa dibandingkan", "nilai": len(pembanding) if lb else None,
                "title": "ambang Juknis 7/2023 sebatas kolom yang ada di logbook; di dalam rentang DIBI"},
               {"k": "luar", "label": "Di luar rentang DIBI, tidak dibandingkan", "nilai": luar if lb else None},
               {"k": "bawah", "label": "Di bawah ambang", "nilai": bawah if lb else None},
               {"k": "belum_nilai", "label": "Angka dampak belum dilaporkan, belum bisa dinilai", "nilai": belum_nilai if lb else None, "title": "kosong bukan nol: tidak dihitung sebagai di bawah ambang"}],
        kolom=[*sama_kolom_l, {"k": "dibi_tgl", "label": "Tanggal di DIBI"}],
        baris=[{**bar(l), "dibi_tgl": d["tgl"]} for l, d in cocok[:MAKS_BARIS]],
        rumus="cocok = kab dan jenis sama, selisih tanggal paling lama 2 hari, satu baris DIBI untuk satu kejadian",
        sumber=["logbook_kejadian", "dibi_kejadian"], label=["hitungan_kita"], asumsi=["Asumsi: toleransi 2 hari dan tenggang 7 hari"], unduh="kib_cocok.csv")
    k_tanpa_dibi = rapor.kartu(
        id="pus2-tanpa-dibi", sistem="PUS-2", pil="KIB dan DIBI", ikon="kalender", judul="Logbook tanpa DIBI lewat 7 hari",
        angka=[{"k": "tanpa_dibi", "label": "Kejadian logbook memenuhi ambang, belum ada di DIBI sesudah 7 hari", "nilai": len(tanpa_dibi) if pembanding else None,
                "title": "kandidat untuk dilengkapi BPBD; bukan kesalahan pelaporan"},
               {"k": "menunggu", "label": "Belum ada di DIBI tetapi belum lewat 7 hari", "nilai": menunggu if pembanding else None}],
        kolom=sama_kolom_l, baris=[bar(l) for l in sorted(tanpa_dibi, key=lambda l: (l["tgl"], l["kab"]))[:MAKS_BARIS]],
        rumus="logbook memenuhi ambang dan tanpa baris DIBI yang cocok, dengan tanggal mulai lebih dari 7 hari yang lalu",
        sumber=["logbook_kejadian", "dibi_kejadian"], label=["hitungan_kita"], asumsi=["Asumsi: toleransi 2 hari dan tenggang 7 hari"], unduh="kib_logbook_tanpa_dibi.csv")
    k_tanpa_log = rapor.kartu(
        id="pus2-tanpa-logbook", sistem="PUS-2", pil="KIB dan DIBI", ikon="kaca", judul="DIBI tanpa logbook",
        angka=[{"k": "tanpa_logbook", "label": "Baris DIBI yang tidak punya kejadian logbook", "nilai": len(tanpa_logbook) if db and awal_lb else None,
                "title": "hanya baris DIBI sejak tanggal logbook paling awal"},
               {"k": "sebelum", "label": "Baris DIBI sebelum logbook ada, tidak dibandingkan", "nilai": diluar_logbook if db and awal_lb else None}],
        kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "jenis", "label": "Jenis"}, {"k": "tgl", "label": "Tanggal di DIBI"}],
        baris=[{"kab": d["kab_nama"], "jenis": nama(d["jenis"]), "tgl": d["tgl"]} for d in sorted(tanpa_logbook, key=lambda d: (d["tgl"], d["kab"]), reverse=True)[:MAKS_BARIS]],
        rumus="baris DIBI di atas ambang DIBI yang tidak dipasangkan ke kejadian logbook mana pun",
        sumber=["dibi_kejadian", "logbook_kejadian"], label=["hitungan_kita"], asumsi=["Asumsi: toleransi 2 hari dan tenggang 7 hari"], unduh="dibi_tanpa_logbook.csv")
    b = rapor.berkas([k_cocok, k_tanpa_dibi, k_tanpa_log], atribusi)
    b["data"] = {"hari": hari_ini.isoformat(), "dibuat": dibuat, "dibi_dari": dibi["dari"], "dibi_sampai": dibi["sampai"], "logbook": len(lb), "logbook_tanpa_kode": lb_tanpa,
                 "logbook_tak_terpetakan": lb_tak, "dibi": len(db), "dibi_tanpa_kode": db_tanpa, "dibi_tak_terpetakan": db_tak,
                 "label": "KIB usulan", "ditampilkan_maks": MAKS_BARIS}
    return b


def _json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def baca_logbook(jalankan):
    d = json.loads(jalankan(SQL))
    if not isinstance(d, list) or not d or d[0].get("success") is not True:
        raise RuntimeError("balasan wrangler d1 tak dikenal")
    return d[0].get("results") or []


def jalan(sekarang=None, jalankan=None):
    import terima
    sek = sekarang or datetime.now(timezone.utc)
    hari = wil1.hari_wib(sek)
    rows = baca_logbook(jalankan or terima._wrangler)
    kab = wil1._json(wil1.BERKAS["kab"])
    kunci_kab, _ = wil1.indeks_kab(kab)
    dibi = _json(DIBI)
    atr = [{"nama": "Logbook Pusdalops (kolom terpilih, tanpa teks bebas)", "url": "repo:migrations/0088_logbook.sql", "diambil": hari.isoformat(), "lisensi": "data internal BNPB, hanya tampil untuk staf"},
           {"nama": "DIBI BNPB (dibi.bnpb.go.id)", "url": "repo:public/data/dibi_kejadian.json", "diambil": dibi["sampai"], "lisensi": "data publik DIBI"}]
    return {"kib_cocok": bangun(rows, dibi, kunci_kab, atr, sek.strftime("%Y-%m-%dT%H:%M:%SZ"), hari)}


def cek():
    # rumus KIB: kasus tetap Juknis 7/2023, sama dengan uji src/pusdalops_umum.js
    assert kib("32", "01", "banjir", "2023-09-19") == "3201101202309191" and kib("32", "3201", "banjir", "2023-09-19", 1) == "3201101202309191"
    assert kib("32", "01", "kecelakaan", "2023-09-19") is None and kib("3", "01", "banjir", "2023-09-19") is None and kib("32", "01", "banjir", "2023-02-30") is None
    assert kib("32", "01", "banjir", "2023-09-19", 0) is None and kib("32", "01", "banjir", "2023-09-19", 10) is None and kib("32", "5101", "banjir", "2023-09-19") is None
    assert kib("32", "01", "banjir", "2023-09-19", True) is None, "True bukan indeks"
    js = open(os.path.join(AKAR, "src", "pusdalops_umum.js"), encoding="utf-8").read()
    kode_js = dict(re.findall(r"(\w+): \"(\d{3})\"", re.search(r"export const KODE_KIB = \{([^}]*)\}", js).group(1)))
    assert kode_js == KODE_KIB, f"KODE_KIB Python berbeda dari src/pusdalops_umum.js: {kode_js}"
    # kueri D1: kolom bernama saja, tanpa teks bebas, tanpa nama orang, tanpa data uji
    assert "*" not in SQL and "dummy = 0" in SQL and not [k for k in KOLOM_TERLARANG if re.search(rf"\b{k}\b", SQL)], "kueri D1 menyentuh kolom teks bebas atau data orang"
    kab = {("32", wil1.kunci_nama("Bogor")): "3201", ("11", wil1.kunci_nama("Aceh Tamiang")): "1116", ("32", wil1.kunci_nama("Kota Bogor")): "3271"}
    L = lambda jenis, prov, kab_, mulai, **k: {"jenis": jenis, "prov": prov, "kab": kab_, "mulai": mulai, "dibuat": 1, "md": None, "luka": None, "mengungsi_jiwa": None, "rumah_rb": None,  # noqa: E731
                                              "rumah_rs": None, "rumah_rr": None, "luas_ha": None, "ada_sk": 0, **k}
    D = lambda tgl, kabk, kategori, **k: {"tanggal": tgl, "kab_kode": kabk, "kab": "x", "kategori": kategori, "kejadian": 1, **k}  # noqa: E731
    dibi = {"dari": "2026-01-01", "sampai": "2026-11-23", "kejadian": [
        D("2026-09-19", "32.01", "Banjir"),                       # cocok dengan L1 (selisih 0)
        D("2026-09-21", "32.01", "Banjir"),                       # dipasangkan dengan L2 (22 Sep, selisih 1)
        D("2026-10-05", "11.16", "Banjir"),                       # DIBI tanpa logbook
        D("2026-10-06", "11.16", "Banjir", bencana=0),            # di bawah ambang DIBI: tidak dihitung
        D("2026-10-07", "11.16", "Gelombang pasang / Abrasi"),    # tanpa kode: dihitung terpisah
        D("2026-10-08", "99.99", "Banjir")]}                      # tak terpetakan
    peta = lambda k: {"3201": "3201", "1116": "1116"}.get(str(k)[:4] if k else None)  # noqa: E731
    rows = [L("banjir", "32", "Kab. Bogor", "2026-09-19", md=1),                  # L1 cocok, KIB indeks 1
            L("banjir", "32", "Bogor", "2026-09-19", luka=60),                    # L1b: sama kab, jenis, hari -> indeks 2; DIBI 19 Sep dan 21 Sep sudah dipakai yang lebih dekat
            L("banjir", "32", "Bogor", "2026-09-22", rumah_rb=5),                 # L2: dipasangkan ke DIBI 21 Sep (selisih 1)
            L("banjir", "11", "Aceh Tamiang", "2026-11-10", luas_ha=1),           # tanpa DIBI, lewat 7 hari
            L("banjir", "11", "Aceh Tamiang", "2026-11-20", ada_sk=1),            # tanpa DIBI, baru 6 hari: menunggu
            L("banjir", "32", "Bogor", "2026-09-25", md=0, luka=10),              # di bawah ambang
            L("banjir", "32", "Bogor", "2026-09-26"),                             # angka belum dilaporkan: tak bisa dinilai
            L("kecelakaan", "32", "Bogor", "2026-09-19", md=3),                   # tanpa kode bencana
            L("banjir", "32", "Kabupaten Tak Dikenal", "2026-09-19", md=1),       # tak terpetakan
            L("banjir", "32", "Bogor", "2025-12-30", md=1)]                       # di luar rentang DIBI (sebelum dari + 2)
    atr = [{"nama": "uji", "url": "repo:x", "diambil": "2026-11-26", "lisensi": "uji"}]
    b = bangun(rows, dibi, kab, atr, "2026-11-26T00:00:00Z", date(2026, 11, 26), peta)
    k = {x["id"]: x for x in b["kartu"]}
    a = lambda kid, kk: {x["k"]: x["nilai"] for x in k[kid]["angka"]}[kk]  # noqa: E731
    assert a("pus2-cocok", "luar") == 1 and a("pus2-cocok", "bawah") == 1 and a("pus2-cocok", "belum_nilai") == 1, k["pus2-cocok"]["angka"]
    assert a("pus2-cocok", "pembanding") == 5 and a("pus2-cocok", "cocok") == 2, k["pus2-cocok"]["angka"]   # L1, L1b, L2, tamiang x2
    kibs = [r["kib"] for r in k["pus2-cocok"]["baris"]]
    assert kibs == ["3201101202609191", "3201101202609221"], kibs                                              # L1 dipasangkan ke DIBI 19 Sep, L2 ke DIBI 21 Sep
    tdb = k["pus2-tanpa-dibi"]["baris"]
    assert [r["tgl"] for r in tdb] == ["2026-09-19", "2026-11-10"] and tdb[0]["kib"] == "3201101202609192", tdb      # L1b: indeks 2 menurut urutan catat, DIBI sudah dipakai L1
    assert a("pus2-tanpa-dibi", "tanpa_dibi") == 2 and a("pus2-tanpa-dibi", "menunggu") == 1
    assert a("pus2-tanpa-logbook", "tanpa_logbook") == 1 and [r["tgl"] for r in k["pus2-tanpa-logbook"]["baris"]] == ["2026-10-05"]
    d = b["data"]
    assert (d["logbook_tanpa_kode"], d["logbook_tak_terpetakan"], d["dibi_tanpa_kode"], d["dibi_tak_terpetakan"], d["label"]) == (1, 1, 1, 1, "KIB usulan"), d
    assert all("KIB usulan" in x["title"] for x in k["pus2-cocok"]["kolom"] if x["k"] == "kib")
    # selisih 3 hari tidak cocok; satu baris DIBI hanya untuk satu kejadian (yang terdekat)
    lb2 = [{"kab": "3201", "jenis": "banjir", "tgl": "2026-09-19"}, {"kab": "3201", "jenis": "banjir", "tgl": "2026-09-20"}]
    db2 = [{"kab": "3201", "jenis": "banjir", "tgl": "2026-09-20"}, {"kab": "3201", "jenis": "banjir", "tgl": "2026-09-23"}]
    assert pasangkan(lb2, db2) == {1: 0}, "baris DIBI terdekat harus ke kejadian terdekat, dan tidak dipakai dua kali"   # L0 (selisih 1 ke D0) kalah dari L1 (selisih 0)
    assert pasangkan([{"kab": "3201", "jenis": "banjir", "tgl": "2026-09-19"}], [{"kab": "3201", "jenis": "banjir", "tgl": "2026-09-22"}]) == {}, "3 hari tidak cocok"
    # tanpa logbook D1: tidak ada daftar tanpa logbook, bukan nol
    b0 = bangun([], dibi, kab, atr, "2026-11-26T00:00:00Z", date(2026, 11, 26), peta)
    assert {x["k"]: x["nilai"] for x in b0["kartu"][0]["angka"]}["cocok"] is None and {x["k"]: x["nilai"] for x in b0["kartu"][2]["angka"]}["tanpa_logbook"] is None
    for x in (b, b0):
        rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **x})
    # D1 gagal: galat jelas, bukan daftar kosong
    for jahat in (lambda sql: "[]", lambda sql: json.dumps([{"success": False}])):
        try:
            baca_logbook(jahat)
            raise AssertionError("balasan D1 salah diterima")
        except RuntimeError:
            pass
    def mati(sql):
        raise RuntimeError("wrangler d1 execute gagal (1): tanpa kredensial")
    try:
        jalan(datetime(2026, 11, 26, tzinfo=timezone.utc), jalankan=mati)
        raise AssertionError("D1 mati tidak menggagalkan langkah")
    except RuntimeError:
        pass
    # jalan penuh dengan D1 tiruan dan DIBI nyata (365 hari di repo): kolom yang diminta persis kolom hasil kueri
    tiruan = json.dumps([{"success": True, "results": [L("banjir", "32", "Bogor", "2026-09-19", md=1)]}])
    nyata = jalan(datetime(2026, 11, 26, 3, 0, tzinfo=timezone.utc), jalankan=lambda sql: tiruan)["kib_cocok"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T03:00:00Z", "basi_jam": 48, **nyata})
    teks = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in teks and not re.search(r"\bKIB resmi\b|\baman\b", teks, re.I)
    dn = nyata["data"]
    print(f"pus2.py --cek: lulus (DIBI nyata {dn['dibi']} baris berambang dari {dn['dibi_dari']} sampai {dn['dibi_sampai']}, {dn['dibi_tak_terpetakan']} tak terpetakan, "
          f"{dn['dibi_tanpa_kode']} tanpa kode; logbook D1 tiruan 1 kejadian)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
