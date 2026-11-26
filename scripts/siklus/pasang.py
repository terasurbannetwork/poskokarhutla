"""Pemasangan antarsumber dan ID KJ- (SK-023; ALGORITMA F1.1 sampai F1.4, F1.8). Kunci pasang: scripts/bnpb/kunci_kejadian.pasangkan.

Dua mode (F1.4):
  riwayat : kumpulan sejarah, `susun` memasangkan rakus satu-satu (DIBI lawan Logbook), urutan kanonik membuat ID sama tiap jalan (INV-9).
  masuk   : bertahap ke KJ- yang ada, `bertahap` HITUNG KANDIDAT (1 tambah, 0 baru, lebih dari 1 ambigu ke antrean, tidak ditebak).
Karhutla: kode_sumber `sel:<i>:<j>` (sel 0,02 derajat), bukan `K####` yang diberi ulang tiap hari.
Rekaman: {sumber, kode, jenis (tuple kunci), kab [kab4 Kemendagri terurut], tgl ISO, nilai {kolom: angka|None}, akhir}.
Pakai: python3 -I scripts/siklus/pasang.py riwayat [--bersih DIR] | masuk --basis URL --dari D --sampai S [--kering] | uji
"""
import collections, datetime as dt, functools, glob, gzip, hashlib, importlib.util, json, math, os, re, sys, urllib.error, urllib.parse, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
BERSIH_BAWAAN = os.path.join(AKAR, "data/raw/siklus/siklus/bersih")
ALFABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
PRIORITAS = ("dibi", "logbook", "lintas", "gempa", "karhutla", "rob")
PRIORITAS_MASUK = PRIORITAS + ("tugas_api", "logbook_d1", "sippa", "lapangan", "gempa_d1", "lapsus", "lapor_ai")   # hanya bertahap; lapsus terakhir: kembar logbook_d1, harus menempel bukan mendirikan
TAUTAN_SAJA = ("lapor_ai",)   # LJ-14: laporan BPBD hanya menempel ke KJ- yang ada; mesin tidak pernah mendirikan atau mengantre kejadian dari sumber ini (Lanjutan D2)
# LK-10 (lapor-kejadian K87, A6): kecuali rekaman bertanda usulan_staf (kode LU-, satu klik staf di meja): itu mengikuti aturan umum (0 baru, 1 tambah, >1 ambigu, tanpa kab tanpa_wilayah).
BANYAK_PER_KJ = ("lapor_ai",)   # banyak tiket/usulan per kejadian: KJ- yang sudah punya entri lapor_ai tetap kandidat (tanpa ini usulan kedua mendirikan KJ- kembar)
MATI = ("digabung", "dibatalkan")
JENDELA = 3        # semua jenis 3 hari (F1.4; kekeringan/karhutla/gunungapi menunggu UA-1)
YAKIN = {"dibi": "resmi", "logbook": "terverifikasi"}
KOLOM = {"dibi": {"md": "meninggal", "hil": "hilang", "luka": "luka", "terdampak": "terdampak", "mengungsi": "mengungsi",
                  "rb": "rumah_rusak_berat", "rs": "rumah_rusak_sedang", "rr": "rumah_rusak_ringan", "terendam": "rumah_terendam"},
         "logbook": {"rb": "rumah_rusak_berat", "rs": "rumah_rusak_sedang", "rr": "rumah_rusak_ringan", "terendam": "rumah_terendam",
                     "rumah": "rumah_dilaporkan", "ha": "luas_ha"}}


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


KN = _muat("kunci")
KK = KN._KK                      # kunci_kejadian: pasangkan
NAMA_KAB = {v: k.split("|", 1)[1] for k, v in KN._KODE.items()}


# ---------------------------------------------------------------- ID KJ- (F1.2)
def kunci_pendiri(jenis, kab_utama, mulai):
    return "+".join(sorted(jenis)) + "|" + kab_utama + "|" + mulai


def id_kj(kunci, n=1):
    """SHA-256 -> 5 byte -> 8 simbol Crockford; tabrakan: hash ulang `kunci|n`, n >= 2."""
    v = int.from_bytes(hashlib.sha256((kunci if n == 1 else f"{kunci}|{n}").encode("utf-8")).digest()[:5], "big")
    return "KJ-" + kunci.split("|")[2][:4] + "-" + "".join(ALFABET[(v >> (35 - 5 * i)) & 31] for i in range(8))


def id_bebas(kunci, terpakai):
    n = 1
    while id_kj(kunci, n) in terpakai:
        n += 1
        assert n < 1000, "tabrakan ID berulang"
    return id_kj(kunci, n)


def kode_sel(lat, lon):
    """Karhutla: sel 0,02 derajat dari pusat kluster (kembar scripts/data/citra.py)."""
    return "sel:%d:%d" % (math.floor(round(lat / 0.02, 9)), math.floor(round(lon / 0.02, 9)))


# ---------------------------------------------------------------- muat bersih -> rekaman
def _angka_tambah(a, b):
    return b if a is None else a if b is None else a + b      # null bukan nol: hanya angka yang dijumlah (dalam satu sumber)


def satuan(rek):
    """Gabung rekaman kembar SATU sumber per (sumber, jenis, tgl, kab[0]); nilai dijumlah hanya di dalam sumber ini, null tetap null
    (kk.satuan menjadikan null 0). kab[0] menjadi kunci karena ID KJ- memakai kab utama: dua rekaman satu sumber dengan kab utama sama
    akan menjadi dua pendiri berkunci sama. kab hasil = gabungan terurut; `kodes` = semua kode asal (untuk ID stabil)."""
    g = {}
    for r in rek:
        k = (r["sumber"], r["jenis"], r["kab"][0] if r["kab"] else None, r["tgl"])
        if k not in g:
            g[k] = dict(r, nilai=dict(r["nilai"]), n_asal=1, kodes=[r["kode"]])
        else:
            e = g[k]
            e["n_asal"] += 1
            e["kodes"].append(r["kode"])
            e["kab"] = sorted(set(e["kab"]) | set(r["kab"]))
            for m, v in r["nilai"].items():
                e["nilai"][m] = _angka_tambah(e["nilai"].get(m), v)
            if r.get("akhir") and (not e.get("akhir") or r["akhir"] > e["akhir"]):
                e["akhir"] = r["akhir"]
    return sorted(g.values(), key=lambda r: (r["tgl"], r["kode"]))


def _kode(jenis, kab, tgl):
    return "+".join(sorted(jenis)) + "|" + "+".join(kab) + "|" + tgl


@functools.lru_cache(maxsize=None)
def _kab_asal(teks):
    return tuple(sorted({k for k in (KN.kab4(p.strip()) for p in (teks or "").split(";") if p.strip()) if k}))


def dari_baris(s, o):
    """Satu baris bersih -> rekaman | None bila jenis tak dibandingkan (disimpan di bersih, tidak dipasang)."""
    jenis = tuple(o.get("kunci_jenis") or ())
    if not jenis:
        return None
    kab = (o["kab4"],) if o.get("kab4") else (_kab_asal(o.get("kab_asal")) if s == "logbook" else ())
    nilai = {kol: o.get(k) for k, kol in KOLOM[s].items()}
    return {"sumber": s, "kode": _kode(jenis, kab, o["tgl"]), "jenis": jenis, "kab": list(kab), "tgl": o["tgl"], "nilai": nilai,
            "akhir": o.get("terakhir")}


def baca_bersih(akar, sumber, tahun=None):
    """-> (daftar rekaman, jumlah jenis tak dibandingkan). Berkas gz urut tahun."""
    hasil, tak = [], 0
    for f in sorted(glob.glob(os.path.join(akar, sumber, "*.jsonl.gz"))):
        if tahun is not None and os.path.basename(f)[:4] not in tahun:
            continue
        with gzip.open(f, "rt", encoding="utf-8") as fh:
            for baris in fh:
                r = dari_baris(sumber, json.loads(baris))
                if r is None:
                    tak += 1
                else:
                    hasil.append(r)
    return hasil, tak


# ---------------------------------------------------------------- mode riwayat (rakus)
def _luas(daftar):
    """Satu entri per (rekaman, kab) supaya pasangkan (kab tunggal) dapat dipakai; peta kembali ke indeks asal."""
    out, asal = [], []
    for i, r in enumerate(daftar):
        for k in r["kab"]:
            out.append({"jenis": r["jenis"], "kab": k, "tgl": r["tgl"]})
            asal.append(i)
    return out, asal


def _pasangan(kiri, kanan, jendela):
    """pasangkan rakus pada entri per-kab, lalu paksa satu-satu pada rekaman asal (urutan hasil pasangkan = selisih terkecil dulu).
    ponytail: rekaman multi-kab yang kab-nya direbut rekaman lain bisa kehilangan pasangan; cukup untuk riwayat, naik ke pasangan optimal bila diukur."""
    (lk, ak), (rk, ar) = _luas(kiri), _luas(kanan)
    pas, _, _ = KK.pasangkan(lk, rk, jendela)
    pi, pj, hasil = set(), set(), []
    for a, b, d in pas:
        i, j = ak[a], ar[b]
        if i not in pi and j not in pj:
            pi.add(i)
            pj.add(j)
            hasil.append((i, j))
    return hasil


def _id_stabil(unit, lama, terpakai, alias):
    """unit: (gugus|rekaman, daftar (sumber, kode)). -> ID lama bila ada (terkecil bila beberapa; yang lain jadi alias), selain itu None."""
    ada = sorted({lama[k] for k in unit[1] if k in lama} - terpakai)
    if not ada:
        return None
    for lain in ada[1:]:
        alias[lain] = ada[0]
    return ada[0]


def susun(per_sumber, jendela=JENDELA, lama=None, alias=None):
    """per_sumber {nama: [rekaman]} -> (gugus, tanpa_wilayah). Urutan kanonik: prioritas sumber, tgl, kode; hasil tidak tergantung urutan masuk.
    gugus: [{id, jenis, kab, mulai, akhir, entri {sumber: rekaman}}]. Tanpa wilayah tidak dipasang (kab kosong) dan tidak pernah jadi pendiri gugus.
    lama: {(sumber, kode): KJ-} dari jalan sebelumnya. Sumber yang masuk belakangan menggeser pendiri (kunci ID berubah); ID lama dipertahankan,
    bila dua ID lama bergabung yang terkecil bertahan dan `alias` (dict, diisi) mencatat lama -> baru. Kode baru tanpa pemetaan = ID dari kunci."""
    lama = lama or {}
    alias = {} if alias is None else alias
    urut = sorted(per_sumber, key=lambda n: (PRIORITAS.index(n) if n in PRIORITAS else len(PRIORITAS), n))
    gugus, lepas = [], []
    for nama in urut:
        recs = satuan(per_sumber[nama])
        punya = [r for r in recs if r["kab"]]
        lepas += [r for r in recs if not r["kab"]]
        jangkar = [{"jenis": g["jenis"], "kab": g["kab"], "tgl": g["mulai"]} for g in gugus]
        pakai = set()
        for i, j in _pasangan(jangkar, punya, jendela):
            gugus[i]["entri"][nama] = punya[j]
            if punya[j].get("akhir") and punya[j]["akhir"] > (gugus[i]["akhir"] or ""):
                gugus[i]["akhir"] = punya[j]["akhir"]
            pakai.add(j)
        for j, r in enumerate(punya):
            if j not in pakai:
                gugus.append({"jenis": r["jenis"], "kab": sorted(r["kab"]), "mulai": r["tgl"], "akhir": r.get("akhir"), "entri": {nama: r}})
    urut_lepas = sorted(lepas, key=lambda r: (PRIORITAS.index(r["sumber"]) if r["sumber"] in PRIORITAS else 9, r["tgl"], r["kode"]))
    unit = [(g, [(n, k) for n, r in g["entri"].items() for k in r["kodes"]]) for g in gugus] + [(r, [(r["sumber"], k) for k in r["kodes"]]) for r in urut_lepas]
    terpakai = set()
    for u in unit:                       # putaran 1: ID lama dipertahankan
        u[0]["id"] = _id_stabil(u, lama, terpakai, alias)
        if u[0]["id"]:
            terpakai.add(u[0]["id"])
    simpan = terpakai | set(lama.values())      # ID lama yang gugusnya hilang tetap dicadangkan, tidak dipakai ulang
    for u in unit:                       # putaran 2: ID baru dari kunci
        if not u[0]["id"]:
            g = u[0]
            ku = kunci_pendiri(g["jenis"], g["kab"][0], g["mulai"]) if "entri" in g else kunci_pendiri(g["jenis"], "0000", g["tgl"])  # "0000" seperti kejadianBaru bila kab kosong
            g["id"] = id_bebas(ku, simpan | terpakai)
            terpakai.add(g["id"])
    for a_, b_ in list(alias.items()):   # rantai alias diratakan ke ID akhir
        while b_ in alias and alias[b_] != b_:
            b_ = alias[b_]
        alias[a_] = b_
    return gugus, lepas


def pemetaan(gugus, lepas):
    """-> {(sumber, kode): KJ-} untuk jalan berikutnya."""
    m = {}
    for g in gugus:
        for n, r in g["entri"].items():
            m.update({(n, k): g["id"] for k in r["kodes"]})
    for r in lepas:
        m.update({(r["sumber"], k): r["id"] for k in r["kodes"]})
    return m


IRISAN = (("2013", "2021"), ("2023", "2026"))   # tahun dengan cakupan kedua sumber memadai (2011-2012 Logbook tipis, 2022 dikeluarkan pemilik)


def laporan(gugus, lepas, tak):
    per = collections.Counter(g["mulai"][:4] for g in gugus)
    n = {s: sum(1 for g in gugus if s in g["entri"]) for s in PRIORITAS}
    ps = {s: n[s] for s in n if n[s]}
    pasang = sum(1 for g in gugus if "dibi" in g["entri"] and "logbook" in g["entri"])
    # persen_*_irisan: pembilang dan penyebut sama-sama dibatasi pada tahun irisan (jangan membandingkan dengan persen seluruh tahun)
    dalam = lambda g: any(a <= g["mulai"][:4] <= b for a, b in IRISAN)
    ir = {s: [g for g in gugus if s in g["entri"] and dalam(g)] for s in ("dibi", "logbook")}
    pir = sum(1 for g in gugus if dalam(g) and "dibi" in g["entri"] and "logbook" in g["entri"])
    return {"kj_per_tahun": dict(sorted(per.items())), "kj_total": len(gugus), "kj_total_dengan_tanpa_wilayah": len(gugus) + len(lepas),
            "entri_per_sumber": ps, "pasangan_dibi_logbook": pasang,
            "persen_dibi_berpasangan": round(100 * pasang / n["dibi"], 1) if n["dibi"] else None,
            "persen_logbook_berpasangan": round(100 * pasang / n["logbook"], 1) if n["logbook"] else None,
            "persen_dibi_irisan": round(100 * pir / len(ir["dibi"]), 1) if ir["dibi"] else None,
            "persen_logbook_irisan": round(100 * pir / len(ir["logbook"]), 1) if ir["logbook"] else None,
            "tanpa_wilayah": len(lepas), "jenis_tak_dibandingkan": tak}


# ---------------------------------------------------------------- dampak berdampingan (F1.7)
def dampak(entri):
    """{sumber: {kolom: {n,y,t}}} + selisih (hanya bila >= 2 sumber melapor kolom itu). Tanpa total, tanpa rata-rata, null tidak ditulis."""
    d = {}
    for s, r in entri.items():
        k = {kol: {"n": v, "y": YAKIN.get(s, "terverifikasi"), "t": r["tgl"][:4]} for kol, v in r["nilai"].items() if v is not None}
        if k:
            d[s] = k
    sel = {}
    multi = any(len(r["kab"]) > 1 for r in entri.values())      # dampak satu laporan multi-kabupaten tidak sebanding dengan sisi satu kabupaten
    for kol in {c for k in d.values() for c in k}:
        v = [k[kol]["n"] for k in d.values() if kol in k]
        if len(v) >= 2 and not multi:
            sel[kol] = max(v) - min(v)
    if sel:
        d["selisih"] = sel
    return d


# ---------------------------------------------------------------- mode masuk bertahap (hitung kandidat)
def _hari(a, b):
    return abs((dt.date.fromisoformat(a) - dt.date.fromisoformat(b)).days)


def bertahap(rekaman, kj, sumber, diambil, jendela=JENDELA):
    """rekaman dalam urutan kanonik; kj [{id,jenis 'a+b',kab4,mulai,fase}]; sumber [{sumber,kode,kejadian_id}].
    -> (keputusan [POST ingest/kejadian], tunda [rekaman], hitung). Rekaman yang kandidatnya KJ- baru dari jalan ini ditunda ke putaran berikut
    (rute menolak `tambah` ke ID yang belum ada di D1)."""
    ada = {(s["sumber"], s["kode"]) for s in sumber}
    punya = collections.defaultdict(set)
    for s in sumber:
        punya[s["kejadian_id"]].add(s["sumber"])
    indeks = [dict(x, lokal=False) for x in kj if x["fase"] not in MATI]
    terpakai = {x["id"] for x in kj}
    kep, tunda, h = [], [], collections.Counter()
    for r in sorted(rekaman, key=lambda r: (PRIORITAS_MASUK.index(r["sumber"]) if r["sumber"] in PRIORITAS_MASUK else 99, r["tgl"], r["kode"])):
        if (r["sumber"], r["kode"]) in ada:
            h["sudah_ada"] += 1
            continue
        ada.add((r["sumber"], r["kode"]))
        dasar = {"sumber": r["sumber"], "kode": r["kode"], "jenis": "+".join(sorted(r["jenis"])), "mulai": r["tgl"],
                 "dampak": dampak({r["sumber"]: r}).get(r["sumber"]) or None, "diambil": diambil}
        tautan_saja = r["sumber"] in TAUTAN_SAJA and not r.get("usulan_staf")
        if not r["kab"] and tautan_saja:
            ada.discard((r["sumber"], r["kode"]))
            h["menunggu_kejadian"] += 1
            continue
        if not r["kab"]:
            kep.append(dict(dasar, aksi="tanpa_wilayah"))
            h["tanpa_wilayah"] += 1
            continue
        cand = [x for x in indeks if set(x["jenis"].split("+")) & set(r["jenis"]) and x["kab4"] in r["kab"] and _hari(x["mulai"], r["tgl"]) <= jendela
                and (r["sumber"] in BANYAK_PER_KJ or r["sumber"] not in punya[x["id"]])]
        if tautan_saja and len(cand) != 1:   # 0 = tanpa pasangan, >1 = ambigu: tunggu tanpa keputusan (rute tidak punya aksi tanpa_pasangan; dicoba lagi putaran berikut)
            ada.discard((r["sumber"], r["kode"]))
            h["tanpa_pasangan" if not cand else "menunggu_kejadian"] += 1
            continue
        if len(cand) == 1 and not cand[0]["lokal"]:
            c = cand[0]
            punya[c["id"]].add(r["sumber"])
            kep.append(dict(dasar, aksi="tambah", kejadian_id=c["id"], kab4=c["kab4"]))
            h["tambah"] += 1
        elif any(c["lokal"] for c in cand):
            tunda.append(r)
            ada.discard((r["sumber"], r["kode"]))
            h["tunda"] += 1
        elif not cand:
            ku = kunci_pendiri(r["jenis"], r["kab"][0], r["tgl"])
            nid = id_bebas(ku, terpakai)
            terpakai.add(nid)
            indeks.append({"id": nid, "jenis": "+".join(sorted(r["jenis"])), "kab4": r["kab"][0], "mulai": r["tgl"], "fase": "terdeteksi", "lokal": True})
            punya[nid].add(r["sumber"])
            kep.append(dict(dasar, aksi="baru", kab4=r["kab"][0], nama=("%s %s %s" % ("+".join(sorted(r["jenis"])).replace("_", " "), NAMA_KAB.get(r["kab"][0], r["kab"][0]), r["tgl"]))[:160]))
            h["baru"] += 1
        else:
            kep.append(dict(dasar, aksi="ambigu", kab4=r["kab"][0], kandidat=sorted(c["id"] for c in cand)[:30]))
            h["ambigu"] += 1
    return kep, tunda, dict(h)


def usulan_fase_tutup(b):
    """LJ-14 (Lanjutan D14, Q2): penutupan lj_berkas yang SUDAH DITERIMA staf -> usulan fase, bukan perubahan fase (fase hanya lewat POST .../fase oleh staf).
    b {status, ditutup (ms|None), tgl_selesai, kondisi {hilang, jiwa_pengungsian, prasarana_putus}: bilangan atau None}.
    -> None (belum diterima) | {ke, tanggap_akhir, dengan_catatan, kondisi, yakin, status}. selesai_catatan tanpa kondisi akhir tidak diusulkan tuntas:
    status 'menunggu' (kosong bukan nol). Usulan hanya transisi: pemulihan dan selesai tetap keputusan staf (syarat R3P)."""
    if b.get("status") not in ("selesai", "selesai_catatan") or b.get("ditutup") is None or not b.get("tgl_selesai"):
        return None
    u = {"ke": "transisi", "tanggap_akhir": b["tgl_selesai"], "dengan_catatan": b["status"] == "selesai_catatan", "yakin": "terverifikasi", "status": "usulan"}
    if u["dengan_catatan"]:
        k = {n: v for n, v in (b.get("kondisi") or {}).items() if v is not None}
        if not any(k.values()):
            return dict(u, status="menunggu", kondisi=None)   # catatan harus menyertai usulan
        u["kondisi"] = k
    return u


def siap_verifikasi(entri_nama):
    """F1.8: tanda saja (fase tidak dipindah sistem) bila KJ- punya entri dari >= 2 nama sumber berbeda."""
    return len(set(entri_nama)) >= 2


# ---------------------------------------------------------------- jaringan (Bearer PIPA_TOKEN; satu-satunya tempat HTTP)
def _http(token):
    def panggil(metode, url, isi=None):
        q = urllib.request.Request(url, method=metode, data=None if isi is None else json.dumps(isi).encode("utf-8"),
                                   headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "User-Agent": "centurisk97-siklus"})
        try:
            with urllib.request.urlopen(q, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:   # tanpa ini log CI cuma "409 Conflict" tanpa alasan dari Worker
            raise SystemExit("%s %s -> HTTP %s: %s" % (metode, url.split("?")[0], e.code, e.read().decode("utf-8", "replace")[:500]))
    return panggil


def _tarik(http, basis, jalur, dari, sampai, ekstra=None):
    """Dipaginasi `lanjut`; rentang dipotong 120 hari (batas rute)."""
    hasil, a, akhir = [], dt.date.fromisoformat(dari), dt.date.fromisoformat(sampai)
    while a <= akhir:
        b = min(a + dt.timedelta(days=119), akhir)
        lanjut = None
        while True:
            q = dict(ekstra or {}, dari=a.isoformat(), sampai=b.isoformat())
            if lanjut:
                q["lanjut"] = lanjut
            p = http("GET", "%s/api/siklus/ingest/%s?%s" % (basis, jalur, urllib.parse.urlencode(q)))
            hasil += p["baris"]
            lanjut = p.get("lanjut")
            if not lanjut:
                break
        a = b + dt.timedelta(days=1)
    return hasil


SUMBER_MODUL = ("tugas_api", "logbook_d1", "sippa", "lapangan", "gempa_d1", "lapsus", "lapor_ai")   # urutan = PRIORITAS: lapsus sesudah logbook_d1


def tarik_modul(http, basis, dari, sampai, cari=None):
    """KP-04/05: sumber modul dari Worker -> rekaman. kab4 dari nama + prov (kunci.kab4); tak terpetakan = tanpa wilayah.
    lapangan dan gempa_d1 hanya punya lat/lon: kab4 lewat hidup._kab_titik (pencari titik-dalam-poligon yang sama dengan gempa usgs/bmkg;
    `cari` malas dari scripts/data/wilayah.py; di luar kab/laut = tanpa wilayah). gempa_d1 dengan utama_id `u:`/`b:` dilewati: sudah masuk sebagai
    usgs/bmkg lewat hidup.gempa_bmkg (aturan yang sama), jadi gempa itu tidak masuk dua kali.
    Nama sumber BEDA dari `logbook` (CSV): kembar CSV/D1 tidak pernah satu kunci, jadi ditambahkan ke KJ- yang sama selama jenis, kab4, jendela cocok.
    lapsus (kode operasi_id:kejadian_id) kembar baris logbook_d1: terurut sesudahnya (PRIORITAS), jadi menempel (tambah), tidak mendirikan KJ- sendiri."""
    H = None
    hasil = []
    for s in SUMBER_MODUL:
        for b in _tarik(http, basis, "modul", dari, sampai, {"sumber": s}):
            if s == "gempa_d1" and re.match(r"^[ub]:.+", str(b.get("utama_id") or "")):
                continue
            if b.get("kab"):
                k = KN.kab4(b["kab"], b.get("prov"))
                kab = [k] if k else []
            elif b.get("lat") is not None and b.get("lon") is not None:
                if H is None:
                    H = _muat("hidup")
                    cari = cari or H._wilayah().cari
                kab = H._kab_titik(cari, b["lat"], b["lon"])
            else:
                kab = []
            rek = {"sumber": s, "kode": str(b["kode"]), "jenis": (b["jenis"],), "kab": kab, "tgl": b["mulai"][:10], "nilai": {}, "akhir": None}
            if s == "lapor_ai" and b.get("usulan_staf") is True and str(b["kode"]).startswith("LU-"):   # LK-10: hanya usulan staf (lk_usulan) boleh mendirikan
                rek["usulan_staf"] = True
            hasil.append(rek)
    return hasil


def masuk(http, basis, rekaman, dari, sampai, kering=False, diambil=None, putaran=3, batch=200):
    """Putar sampai tidak ada yang ditunda. -> jumlah keputusan per aksi. Jalan dua kali = nol baris baru (rute menolak (sumber, kode) yang sudah ada)."""
    diambil = diambil or int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)
    tg = [r["tgl"] for r in rekaman]   # LK-10: tgl rekaman (usulan LU- = tanggal tiket) bisa di luar --dari/--sampai; kandidat ditarik sekitar rekaman, kalau tidak 0 kandidat = KJ- kembar
    a = (dt.date.fromisoformat(min([dari] + tg)) - dt.timedelta(days=JENDELA)).isoformat()
    b = (dt.date.fromisoformat(max([sampai] + tg)) + dt.timedelta(days=JENDELA)).isoformat()
    total, sisa = collections.Counter(), rekaman
    for _ in range(putaran):
        kep, tunda, h = bertahap(sisa, _tarik(http, basis, "jendela", a, b), _tarik(http, basis, "sumber", a, b), diambil)
        total.update({k: v for k, v in h.items() if k != "tunda"})
        if not kering:
            for i in range(0, len(kep), batch):
                http("POST", basis + "/api/siklus/ingest/kejadian", {"keputusan": kep[i:i + batch]})
        if not tunda or kering:
            break
        sisa = tunda
    return dict(total)


# ---------------------------------------------------------------- uji
def _uji():
    R = lambda s, jn, kab, t, **n: {"sumber": s, "kode": _kode(jn, kab, t), "jenis": jn, "kab": list(kab), "tgl": t, "nilai": n, "akhir": None}
    # UJ-F1-04: vektor ID, permutasi urutan masuk, tabrakan (INV-9)
    assert id_kj("banjir|3201|2026-03-02") == "KJ-2026-9A2WGN3G" and id_kj("banjir|3201|2026-03-02", 2) == "KJ-2026-8N57ZZ0Y"
    assert id_kj("banjir+longsor|3201|2026-03-02") == "KJ-2026-MT5Z0ZVT" and id_kj("banjir+longsor|3201|2026-03-02", 2) == "KJ-2026-K3JQG02Y"
    assert kunci_pendiri(("longsor", "banjir"), "3201", "2026-03-02") == "banjir+longsor|3201|2026-03-02" and len(id_kj("banjir|3201|2026-03-02")) == 16
    assert id_bebas("banjir|3201|2026-03-02", {"KJ-2026-9A2WGN3G"}) == "KJ-2026-8N57ZZ0Y"
    # UJ-F1-06 tiga hasil pemasangan (riwayat/rakus): logbook +2 hari tambah, +7 hari baru
    dibi = [R("dibi", ("banjir",), ("3201",), "2026-03-02", meninggal=None)]
    g, lp = susun({"dibi": dibi, "logbook": [R("logbook", ("banjir",), ("3201",), "2026-03-04"), R("logbook", ("banjir",), ("3201",), "2026-03-09")]})
    assert len(g) == 2 and sorted(len(x["entri"]) for x in g) == [1, 2] and g[0]["id"] == "KJ-2026-9A2WGN3G"
    acak = susun({"logbook": [R("logbook", ("banjir",), ("3201",), "2026-03-09"), R("logbook", ("banjir",), ("3201",), "2026-03-04")], "dibi": dibi})[0]
    assert [x["id"] for x in acak] == [x["id"] for x in g], "INV-9: urutan masuk tidak mengubah ID"
    # UJ-F1-07 multi-kab: pendiri multi-kab = satu KJ- dengan kab terurut dan kab_utama terkecil; rekaman multi-kab cocok lewat salah satu kab
    g, _ = susun({"logbook": [R("logbook", ("banjir",), ("3202", "3201"), "2026-03-02")]})
    assert len(g) == 1 and g[0]["kab"] == ["3201", "3202"] and g[0]["id"] == id_kj("banjir|3201|2026-03-02")
    g, _ = susun({"logbook": [R("logbook", ("banjir",), ("3202", "3201"), "2026-03-02")], "dibi": [R("dibi", ("banjir",), ("3202",), "2026-03-03")]})
    assert len(g) == 1 and set(g[0]["entri"]) == {"dibi", "logbook"} and g[0]["id"] == id_kj("banjir|3202|2026-03-03")
    # UJ-F1-10 dan F1.8: DIBI saja satu entri; plus Logbook dua nama sumber = tanda
    assert not siap_verifikasi(["dibi"]) and siap_verifikasi(["dibi", "logbook"]) and not siap_verifikasi(["dibi", "dibi"])
    # tanpa wilayah: tidak dipasang, ID dengan kab 0000, tidak masuk gugus
    g, lp = susun({"logbook": [R("logbook", ("banjir",), (), "2026-03-02")], "dibi": dibi})
    assert len(g) == 1 and len(lp) == 1 and lp[0]["id"].startswith("KJ-2026-") and lp[0]["id"] != g[0]["id"]
    # satuan: kembar sehari dijumlah dalam satu sumber, null tetap null
    s = satuan([R("dibi", ("banjir",), ("3201",), "2026-03-02", md=1, hil=None), R("dibi", ("banjir",), ("3201",), "2026-03-02", md=2, hil=None)])
    assert len(s) == 1 and s[0]["nilai"]["md"] == 3 and s[0]["nilai"]["hil"] is None and s[0]["n_asal"] == 2
    # dampak F1.7: selisih hanya bila dua sumber melapor; tanpa total; null tidak ditulis
    d = dampak({"dibi": R("dibi", ("banjir",), ("3201",), "2026-03-02", meninggal=12, hilang=0, luka=None),
                "logbook": R("logbook", ("banjir",), ("3201",), "2026-03-02", meninggal=15, hilang=None)})
    assert d["selisih"] == {"meninggal": 3} and "luka" not in d["dibi"] and d["dibi"]["hilang"]["n"] == 0 and "logbook" in d and "total" not in json.dumps(d)
    assert "selisih" not in dampak({"dibi": R("dibi", ("banjir",), ("3201",), "2026-03-02", meninggal=1)})
    # UJ-F1-05: karhutla K0003 hari 1 dan K0011 hari 2 sel sama -> satu kode, satu KJ- (masuk bertahap: pemetaan tepat)
    assert kode_sel(-2.505, 114.003) == "sel:-126:5700" == kode_sel(-2.5051, 114.0049)
    kh = lambda t: dict(R("karhutla", ("karhutla",), ("6211",), t), kode=kode_sel(-2.505, 114.003))
    kep, tunda, h = bertahap([kh("2026-08-01")], [], [], 1)
    assert [k["aksi"] for k in kep] == ["baru"] and kep[0]["kode"] == "sel:-126:5700"
    kj1 = [{"id": "KJ-2026-AAAAAAAA", "jenis": "karhutla", "kab4": "6211", "mulai": "2026-08-01", "fase": "terdeteksi"}]
    kep, _, h = bertahap([kh("2026-08-02")], kj1, [{"sumber": "karhutla", "kode": "sel:-126:5700", "kejadian_id": "KJ-2026-AAAAAAAA"}], 1)
    assert kep == [] and h == {"sudah_ada": 1}, "hari 2 sel sama memperbarui KJ- yang sama, tidak membuat baru"
    # UJ-F1-06 masuk bertahap: tambah, baru, ambigu (A 03-02, B 03-05, logbook 03-03 selisih 1 dan 2)
    kjA = {"id": "KJ-2026-9A2WGN3G", "jenis": "banjir", "kab4": "3201", "mulai": "2026-03-02", "fase": "terdeteksi"}
    kjB = {"id": "KJ-2026-BBBBBBBB", "jenis": "banjir", "kab4": "3201", "mulai": "2026-03-05", "fase": "terdeteksi"}
    L = lambda t: R("logbook", ("banjir",), ("3201",), t)
    kep, _, _ = bertahap([L("2026-03-04")], [kjA], [{"sumber": "dibi", "kode": "x", "kejadian_id": kjA["id"]}], 1)
    assert [(k["aksi"], k.get("kejadian_id")) for k in kep] == [("tambah", kjA["id"])]
    kep, _, _ = bertahap([L("2026-03-09")], [kjA], [], 1)
    assert [k["aksi"] for k in kep] == ["baru"]
    kep, _, _ = bertahap([L("2026-03-03")], [kjA, kjB], [], 1)
    assert [k["aksi"] for k in kep] == ["ambigu"] and kep[0]["kandidat"] == sorted([kjA["id"], kjB["id"]]), "dua kandidat: antrean, tidak ditebak"
    kep, _, _ = bertahap([L("2026-03-03")], [dict(kjA, fase="digabung")], [], 1)
    assert [k["aksi"] for k in kep] == ["baru"], "KJ- digabung bukan kandidat"
    kep, _, _ = bertahap([L("2026-03-03")], [kjA], [{"sumber": "logbook", "kode": "lain", "kejadian_id": kjA["id"]}], 1)
    assert [k["aksi"] for k in kep] == ["baru"], "KJ- yang sudah punya entri dari sumber sama bukan kandidat"
    kep, _, _ = bertahap([R("logbook", ("banjir",), (), "2026-03-03")], [kjA], [], 1)
    assert kep[0]["aksi"] == "tanpa_wilayah" and "kab4" not in kep[0]
    # dua rekaman berdekatan satu putaran: yang kedua ditunda (rute menolak tambah ke ID belum ada)
    kep, tunda, h = bertahap([R("dibi", ("banjir",), ("3301",), "2026-03-02"), R("logbook", ("banjir",), ("3301",), "2026-03-03")], [], [], 1)
    assert [k["aksi"] for k in kep] == ["baru"] and len(tunda) == 1
    # jalan penuh melawan server tiruan: putaran kedua memasang, jalan ulang = nol baris baru, kering tidak menulis
    st = {"kj": [], "sm": [], "post": 0}

    def palsu(metode, url, isi=None):
        if metode == "GET":
            return {"baris": st["kj" if "/jendela" in url else "sm"], "lanjut": None}
        for k in isi["keputusan"]:
            if (k["sumber"], k["kode"]) in {(s["sumber"], s["kode"]) for s in st["sm"]}:
                continue
            st["post"] += 1
            if k["aksi"] == "baru":
                k["kejadian_id"] = id_bebas(kunci_pendiri(k["jenis"].split("+"), k["kab4"], k["mulai"]), {x["id"] for x in st["kj"]})
                st["kj"].append({"id": k["kejadian_id"], "jenis": k["jenis"], "kab4": k["kab4"], "mulai": k["mulai"], "fase": "terdeteksi"})
            st["sm"].append({"sumber": k["sumber"], "kode": k["kode"], "kejadian_id": k.get("kejadian_id")})
        return {}
    rek = [R("dibi", ("banjir",), ("3301",), "2026-03-02", md=2), R("logbook", ("banjir",), ("3301",), "2026-03-03", md=3)]
    assert masuk(palsu, "http://x", rek, "2026-03-01", "2026-03-10", kering=True, diambil=1) == {"baru": 1} and st["post"] == 0
    masuk(palsu, "http://x", rek, "2026-03-01", "2026-03-10", diambil=1)
    assert st["post"] == 2 and len(st["kj"]) == 1 and {s["kejadian_id"] for s in st["sm"]} == {st["kj"][0]["id"]}
    masuk(palsu, "http://x", rek, "2026-03-01", "2026-03-10", diambil=1)
    assert st["post"] == 2, "jalan dua kali = nol baris baru"
    # KP-04 T3: tugas_api karhutla kab OKI; KJ karhutla kab4 sama 2 hari -> tambah, 4 hari -> baru; kab tak dikenal -> tanpa_wilayah
    def modul(metode, url, isi=None):
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
        assert "/ingest/modul?" in url and q["dari"] and q["sampai"]
        if q["sumber"][0] == "tugas_api":
            return {"baris": [{"sumber": "tugas_api", "kode": "t1", "jenis": "karhutla", "prov": "16", "kab": "Kab. Ogan Komering Ilir", "mulai": "2026-03-03"},
                              {"sumber": "tugas_api", "kode": "t2", "jenis": "karhutla", "prov": "16", "kab": "Kab. Ogan Komering Ilir", "mulai": "2026-03-05"},
                              {"sumber": "tugas_api", "kode": "t3", "jenis": "karhutla", "prov": "16", "kab": "Kab. Tak Ada", "mulai": "2026-03-03"}], "lanjut": None}
        if q["sumber"][0] != "logbook_d1":
            return {"baris": [], "lanjut": None}
        if "lanjut" not in q:                      # logbook_d1: dua halaman lewat `lanjut`
            return {"baris": [{"sumber": "logbook_d1", "kode": "l1", "jenis": "gempa", "prov": "32", "kab": "Bogor", "mulai": "2026-03-03"}], "lanjut": "1|l1"}
        assert q["lanjut"] == ["1|l1"]
        return {"baris": [{"sumber": "logbook_d1", "kode": "l2", "jenis": "banjir", "prov": "32", "kab": "Bogor", "mulai": "2026-03-04T10:00:00"}], "lanjut": None}
    m = tarik_modul(modul, "http://x", "2026-03-01", "2026-03-10")
    assert [r["kode"] for r in m] == ["t1", "t2", "t3", "l1", "l2"] and m[0]["kab"] == ["1602"] and m[2]["kab"] == [] and m[3]["jenis"] == ("gempa",) and m[4]["tgl"] == "2026-03-04"
    kjK = {"id": "KJ-2026-KKKKKKKK", "jenis": "karhutla", "kab4": "1602", "mulai": "2026-03-01", "fase": "terdeteksi"}
    kep, _, _ = bertahap(m[:1], [kjK], [], 1)
    assert [(k["aksi"], k["sumber"]) for k in kep] == [("tambah", "tugas_api")], "T3: 2 hari -> tambah"
    kep, _, _ = bertahap(m[1:2], [kjK], [], 1)
    assert [k["aksi"] for k in kep] == ["baru"], "T3: 4 hari -> baru"
    kep, _, _ = bertahap(m[2:3], [kjK], [], 1)
    assert kep[0]["aksi"] == "tanpa_wilayah"
    # KP-05: sippa/lapangan/gempa_d1/lapsus
    cr = lambda lon, lat: ("32", "Bogor", "X") if lat < -6 and lon > 100 else None
    SP = {"sippa": [{"kode": "s1", "jenis": "karhutla", "prov": "16", "kab": "Kab. Ogan Komering Ilir", "mulai": "2026-03-03"}],
          "lapangan": [{"kode": "p1", "jenis": "banjir", "lat": -6.5, "lon": 106.8, "mulai": "2026-03-04"}, {"kode": "p2", "jenis": "banjir", "lat": 0.0, "lon": 90.0, "mulai": "2026-03-04"}],
          "gempa_d1": [{"kode": "G1", "jenis": "gempa", "lat": -6.5, "lon": 106.8, "utama_id": "u:abc", "mulai": "2026-03-04"}, {"kode": "G2", "jenis": "gempa", "lat": -6.5, "lon": 106.8, "utama_id": "b:xyz", "mulai": "2026-03-04"},
                       {"kode": "G3", "jenis": "gempa", "lat": -6.5, "lon": 106.8, "utama_id": "lain-3", "mulai": "2026-03-04"}],
          "logbook_d1": [{"kode": "kjx", "jenis": "banjir", "prov": "32", "kab": "Bogor", "mulai": "2026-03-04"}],
          "lapsus": [{"kode": "opx:kjx", "jenis": "banjir", "prov": "32", "kab": "Bogor", "mulai": "2026-03-04"}]}
    m2 = tarik_modul(lambda me, u, i=None: {"baris": SP.get(urllib.parse.parse_qs(urllib.parse.urlsplit(u).query)["sumber"][0], []), "lanjut": None}, "http://x", "2026-03-01", "2026-03-10", cari=cr)
    by = {r["kode"]: r for r in m2}
    assert set(by) == {"s1", "p1", "p2", "G3", "kjx", "opx:kjx"}, "gempa_d1 u:/b: dilewati (sudah usgs/bmkg)"
    assert by["s1"]["kab"] == ["1602"] and by["p1"]["kab"] == ["3201"] and by["G3"]["kab"] == ["3201"] and by["opx:kjx"]["kab"] == ["3201"]
    assert by["p2"]["kab"] == [] and by["p2"]["sumber"] == "lapangan"
    kep, tn, _ = bertahap([by["opx:kjx"], by["kjx"]], [], [], 1)      # urutan masuk dibalik: logbook_d1 tetap pendiri
    assert [(k["sumber"], k["aksi"]) for k in kep] == [("logbook_d1", "baru")] and [r["kode"] for r in tn] == ["opx:kjx"]
    kep, _, _ = bertahap(tn, [{"id": id_kj("banjir|3201|2026-03-04"), "jenis": "banjir", "kab4": "3201", "mulai": "2026-03-04", "fase": "terdeteksi"}],
                         [{"sumber": "logbook_d1", "kode": "kjx", "kejadian_id": id_kj("banjir|3201|2026-03-04")}], 1)
    assert [(k["sumber"], k["aksi"]) for k in kep] == [("lapsus", "tambah")], "lapsus menempel ke KJ- kembarnya"
    kep, _, _ = bertahap([by["p2"]], [], [], 1)
    assert kep[0]["aksi"] == "tanpa_wilayah"
    # T16 logbook: gempa sudah dipetakan Worker, diterima; kembar CSV `logbook` (kode jenis|kab|tgl) dan D1 `logbook_d1` (kode id) = satu KJ-, bukan dua
    kjB = {"id": "KJ-2026-9A2WGN3G", "jenis": "banjir", "kab4": "3201", "mulai": "2026-03-02", "fase": "terdeteksi"}
    kep, _, _ = bertahap(m[4:], [kjB], [{"sumber": "logbook", "kode": "banjir|3201|2026-03-04", "kejadian_id": kjB["id"]}], 1)
    assert [(k["aksi"], k["kejadian_id"]) for k in kep] == [("tambah", kjB["id"])]
    kep, tn, _ = bertahap([R("logbook", ("banjir",), ("3201",), "2026-03-04"), m[4]], [], [], 1)
    assert [k["aksi"] for k in kep] == ["baru"] and len(tn) == 1, "satu putaran: kembar ditunda lalu ditambahkan, bukan KJ- kedua"
    kep, _, _ = bertahap([m[3]], [], [], 1)
    assert kep[0]["aksi"] == "baru" and kep[0]["jenis"] == "gempa"
    # dari_baris: jenis kosong ditolak dipasang, kab_asal multi dipecah, nilai null tetap null
    assert dari_baris("dibi", {"kunci_jenis": [], "kab4": "3201", "tgl": "2020-01-01"}) is None
    r = dari_baris("logbook", {"kunci_jenis": ["banjir"], "kab4": None, "kab_asal": "32|Bogor; 32|Bekasi; ", "tgl": "2020-01-01", "rb": 2, "rs": None, "ha": None})
    assert r["kab"] == ["3201", "3216"] and r["nilai"]["rumah_rusak_berat"] == 2 and r["nilai"]["rumah_rusak_sedang"] is None
    # ID stabil: DIBI masuk belakangan (pendiri bergeser ke DIBI, tgl 2 hari lebih awal) tidak menghilangkan ID Logbook lama
    lb = [R("logbook", ("banjir",), ("3201",), "2026-03-04")]
    d1 = [R("dibi", ("banjir",), ("3201",), "2026-03-02")]
    g1, l1 = susun({"logbook": lb})
    lama = pemetaan(g1, l1)
    assert susun({"dibi": d1, "logbook": lb})[0][0]["id"] != g1[0]["id"], "tanpa pemetaan ID bergeser (membuktikan uji ini bermakna)"
    al = {}
    g2, l2 = susun({"dibi": d1, "logbook": lb}, lama=lama, alias=al)
    assert len(g2) == 1 and set(g2[0]["entri"]) == {"dibi", "logbook"} and g2[0]["id"] == g1[0]["id"] and al == {}, "menambah baris tidak menghilangkan ID lama"
    assert pemetaan(g2, l2)[("dibi", _kode(("banjir",), ("3201",), "2026-03-02"))] == g1[0]["id"]
    # dua ID lama bergabung: yang terkecil bertahan, yang lain jadi alias
    dd, ll = [R("dibi", ("banjir",), ("3201",), "2026-03-02")], [R("logbook", ("banjir",), ("3201",), "2026-03-12")]
    g3, l3 = susun({"dibi": dd, "logbook": ll}, jendela=3)
    assert len(g3) == 2
    ids = sorted(x["id"] for x in g3)
    al = {}
    g4, _ = susun({"dibi": dd, "logbook": ll}, jendela=10, lama=pemetaan(g3, l3), alias=al)
    assert len(g4) == 1 and g4[0]["id"] == ids[0] and al == {ids[1]: ids[0]}, (g4, al)
    # ID lama tidak dipakai ulang untuk gugus baru
    g5, _ = susun({"dibi": [R("dibi", ("banjir",), ("3205",), "2026-03-02")]}, lama={("dibi", "x"): id_kj("banjir|3205|2026-03-02")})
    assert g5[0]["id"] == id_kj("banjir|3205|2026-03-02", 2)
    # satuan: dedup per (sumber, jenis, tgl, kab[0]): multi-kab dan satu-kab kab utama sama menjadi satu pendiri
    s2 = satuan([R("logbook", ("banjir",), ("3201", "3202"), "2026-03-02", rb=1), R("logbook", ("banjir",), ("3201",), "2026-03-02", rb=2)])
    assert len(s2) == 1 and s2[0]["kab"] == ["3201", "3202"] and s2[0]["nilai"]["rb"] == 3 and len(s2[0]["kodes"]) == 2
    gg, _ = susun({"logbook": [R("logbook", ("banjir",), ("3201", "3202"), "2026-03-02"), R("logbook", ("banjir",), ("3201",), "2026-03-02")]})
    assert len(gg) == 1, "tanpa dedup: dua pendiri berkunci sama"
    # selisih dilewati bila salah satu sisi multi-kabupaten
    d = dampak({"dibi": R("dibi", ("banjir",), ("3201",), "2026-03-02", meninggal=1),
                "logbook": R("logbook", ("banjir",), ("3201", "3202"), "2026-03-02", meninggal=5)})
    assert "selisih" not in d and d["dibi"]["meninggal"]["n"] == 1 and d["logbook"]["meninggal"]["n"] == 5
    # laporan: persen irisan (2013-2021, 2023-2026) dan total dengan tanpa wilayah
    gl, ll_ = susun({"dibi": [R("dibi", ("banjir",), ("3201",), "2020-03-02"), R("dibi", ("banjir",), ("3202",), "2022-03-02")],
                     "logbook": [R("logbook", ("banjir",), ("3201",), "2020-03-03"), R("logbook", ("banjir",), (), "2020-03-03")]})
    lp = laporan(gl, ll_, 0)
    assert lp["kj_total"] == 2 and lp["kj_total_dengan_tanpa_wilayah"] == 3 and lp["persen_dibi_irisan"] == 100.0 and lp["persen_logbook_irisan"] == 100.0
    assert lp["persen_dibi_berpasangan"] == 50.0, "seluruh tahun: 2022 di luar irisan menurunkan persen"
    # kab4 Kemendagri: nama + provinsi, bukan kode BPS (Aceh Besar BPS 1108)
    r = dari_baris("dibi", {"kunci_jenis": ["banjir"], "kab4": KN.kab4("Aceh Besar", "11"), "tgl": "2020-01-01"})
    assert r["kab"] == ["1106"]
    # LJ-14: lapor_ai hanya menempel; penutupan diterima -> usulan transisi, catatan wajib
    LA = lambda t, kab=("3201",): R("lapor_ai", ("banjir",), kab, t)
    kep, _, h = bertahap([LA("2026-03-03")], [kjA], [], 1)
    assert [(k["aksi"], k["kejadian_id"]) for k in kep] == [("tambah", kjA["id"])]
    for kj_, kb in (([], ("3201",)), ([kjA, kjB], ("3201",)), ([kjA], ())):
        kep, tunda, h = bertahap([LA("2026-03-03", kb)], kj_, [], 1)
        assert kep == [] and tunda == [] and h == {"tanpa_pasangan" if not kj_ else "menunggu_kejadian": 1}, "lapor_ai tidak mendirikan, mengantre, atau tanpa_wilayah"
    # LK-10 U6: usulan staf (lapor_ai, kode LU-, usulan_staf) mengikuti aturan umum; rekaman otomatis tetap tidak mendirikan
    LU = lambda t, kab=("3201",), n="01": dict(R("lapor_ai", ("banjir",), kab, t), kode="LU-030326-" + n, usulan_staf=True)
    kep, tunda, h = bertahap([LU("2026-03-03")], [], [], 1)
    assert [k["aksi"] for k in kep] == ["baru"] and kep[0]["kab4"] == "3201" and kep[0]["dampak"] is None and "usulan_staf" not in kep[0] and h == {"baru": 1}, "usulan tanpa kandidat mendirikan"
    assert kep[0]["kode"] == "LU-030326-01" and kep[0]["sumber"] == "lapor_ai"
    kep, _, _ = bertahap([LU("2026-03-03")], [kjA], [], 1)
    assert [(k["aksi"], k["kejadian_id"]) for k in kep] == [("tambah", kjA["id"])]
    kep, _, _ = bertahap([LU("2026-03-03")], [kjA], [{"sumber": "lapor_ai", "kode": "LA-030326-01", "kejadian_id": kjA["id"]}], 1)
    assert [(k["aksi"], k["kejadian_id"]) for k in kep] == [("tambah", kjA["id"])], "KJ- yang sudah punya tiket lapor_ai tetap kandidat usulan (tanpa KJ- kembar)"
    kep, _, _ = bertahap([LA("2026-03-04")], [kjA], [{"sumber": "lapor_ai", "kode": "LA-030326-01", "kejadian_id": kjA["id"]}], 1)
    assert [k["aksi"] for k in kep] == ["tambah"], "tiket BPBD kedua menempel ke KJ- yang sama"
    kep, _, _ = bertahap([LU("2026-03-03")], [kjA, kjB], [], 1)
    assert [k["aksi"] for k in kep] == ["ambigu"] and kep[0]["kandidat"] == sorted([kjA["id"], kjB["id"]]), "Q13: dua kandidat ke antrean"
    kep, _, h = bertahap([LU("2026-03-03", ())], [kjA], [], 1)
    assert [k["aksi"] for k in kep] == ["tanpa_wilayah"] and h == {"tanpa_wilayah": 1}
    kep, _, h = bertahap([LU("2026-03-03")], [kjA], [{"sumber": "lapor_ai", "kode": "LU-030326-01", "kejadian_id": kjA["id"]}], 1)
    assert kep == [] and h == {"sudah_ada": 1}, "(sumber, kode) sudah ada: tanpa duplikat"
    dua = [LU("2026-03-03", n="01"), LU("2026-03-20", n="02")]
    k1, t1, _ = bertahap(dua, [], [], 1)
    k2, t2, _ = bertahap(dua[::-1], [], [], 1)
    assert [k["aksi"] for k in k1] == ["baru", "baru"] and k1 == k2 and t1 == t2 == [], "INV-9: urutan masuk tidak mengubah ID"
    k3, t3, h3 = bertahap([LU("2026-03-03", n="01"), LU("2026-03-04", n="02")], [], [], 1)
    assert [k["aksi"] for k in k3] == ["baru"] and len(t3) == 1 and h3["tunda"] == 1, "usulan kedua sekab menunggu KJ- baru, bukan KJ- kembar"
    class _H:
        def __call__(self, m, u, isi=None):
            if "sumber=lapor_ai" not in u:
                return {"baris": []}
            return {"baris": [{"sumber": "lapor_ai", "kode": "LU-030326-01", "jenis": "banjir", "prov": "32", "kab": "Bogor", "mulai": "2026-03-03", "usulan_staf": True},
                              {"sumber": "lapor_ai", "kode": "LA-030326-01", "jenis": "banjir", "prov": "32", "kab": "Bogor", "mulai": "2026-03-03", "usulan_staf": True}]}
    rk = tarik_modul(_H(), "http://x", "2026-03-01", "2026-03-05")
    assert [r.get("usulan_staf") for r in rk] == [True, None] and rk[0]["kab"] == ["3201"], "tanda usulan hanya untuk kode LU-"
    class _J:   # rute palsu: KJ- hanya terlihat bila jendela tarikan mencakup tanggal mulainya
        def __init__(self):
            self.kirim = []
        def __call__(self, m, u, isi=None):
            if m == "POST":
                self.kirim += isi["keputusan"]
                return {}
            q = urllib.parse.parse_qs(urllib.parse.urlparse(u).query)
            dalam = q["dari"][0] <= kjA["mulai"] <= q["sampai"][0]
            return {"baris": [kjA] if "/jendela?" in u and dalam else []}
    j = _J()
    h = masuk(j, "http://x", [LU("2026-03-03")], "2026-03-20", "2026-03-25", diambil=1)
    assert h == {"tambah": 1} and [(k["aksi"], k["kejadian_id"]) for k in j.kirim] == [("tambah", kjA["id"])], "usulan bertanggal tiket di luar --dari/--sampai tetap menemukan KJ-"
    assert usulan_fase_tutup({"status": "terbuka", "ditutup": None, "tgl_selesai": "2026-03-10"}) is None
    assert usulan_fase_tutup({"status": "usul_tutup", "ditutup": None, "tgl_selesai": "2026-03-10"}) is None
    u = usulan_fase_tutup({"status": "selesai", "ditutup": 1, "tgl_selesai": "2026-03-10"})
    assert u["ke"] == "transisi" and u["tanggap_akhir"] == "2026-03-10" and u["status"] == "usulan" and not u["dengan_catatan"]
    c = {"status": "selesai_catatan", "ditutup": 1, "tgl_selesai": "2026-03-10"}
    assert usulan_fase_tutup(c)["status"] == "menunggu" and usulan_fase_tutup(dict(c, kondisi={"hilang": None}))["status"] == "menunggu"
    u = usulan_fase_tutup(dict(c, kondisi={"hilang": 2, "jiwa_pengungsian": None}))
    assert u["status"] == "usulan" and u["dengan_catatan"] and u["kondisi"] == {"hilang": 2}
    print("pasang: uji hijau")


def _opsi(a, nama, bawaan=None):
    return a[a.index(nama) + 1] if nama in a else bawaan


def _masuk_hidup(a, cari=None):
    """Sumber hidup (hidup.py) -> KJ-. DRY-RUN BAWAAN: tarikan GET jalan, POST ingest hanya dengan --kirim. Jendela tarikan = rentang tanggal rekaman."""
    tk = os.environ.get("PIPA_TOKEN")
    if not tk or not _opsi(a, "--basis"):
        sys.exit("masuk --hidup butuh env PIPA_TOKEN dan --basis URL [--mentah DIR] [--dari D] [--kirim]")
    H = _muat("hidup")
    basis, http = _opsi(a, "--basis").rstrip("/"), _http(tk)
    try:        # gagal-lunak: BMKG mati = USGS saja, tertulis, bukan nol
        with urllib.request.urlopen(urllib.request.Request(basis + "/api/gempa/kejadian", headers={"User-Agent": "centurisk97-siklus"}), timeout=60) as r:
            bmkg = json.loads(r.read().decode("utf-8")).get("kejadian") or []
    except Exception as e:
        bmkg = None
        print("PERINGATAN: /api/gempa/kejadian gagal (%s); gempa BMKG dilewati" % str(e)[:80], file=sys.stderr)
    dari = _opsi(a, "--dari", (dt.date.today() - dt.timedelta(days=30)).isoformat())
    rek, n, lama = H.kumpulkan(_opsi(a, "--akar", AKAR), _opsi(a, "--mentah"), bmkg, cari, dari)
    if not rek:
        print(json.dumps({"hidup": n, "kedaluwarsa": lama, "catatan": "tidak ada rekaman hidup"}))
        return
    kirim = "--kirim" in a
    h = masuk(http, basis, rek, min(r["tgl"] for r in rek), max(r["tgl"] for r in rek), kering=not kirim)
    print(json.dumps({"hidup": n, "kedaluwarsa": lama, "keputusan": h, "mode": "kirim" if kirim else "dry-run (tambah --kirim untuk menulis)"}, indent=1))


def _riwayat(akar):
    per, tak = {}, 0
    for s in ("dibi", "logbook"):
        per[s], t = baca_bersih(os.path.join(akar), s)
        tak += t
    g, lp = susun(per)
    return g, lp, tak


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["riwayat"]:
        print(json.dumps(laporan(*_riwayat(_opsi(a, "--bersih", BERSIH_BAWAAN))), ensure_ascii=False, indent=1))
    elif a[:2] == ["masuk", "--hidup"] or (a[:1] == ["masuk"] and "--hidup" in a):
        _masuk_hidup(a)
    elif a[:1] == ["masuk"]:
        tk = os.environ.get("PIPA_TOKEN")
        if not tk or not all(_opsi(a, o) for o in ("--basis", "--dari", "--sampai")):
            sys.exit("masuk butuh env PIPA_TOKEN dan --basis URL --dari D --sampai S")
        b = _opsi(a, "--bersih", BERSIH_BAWAAN)
        yr = {str(y) for y in range(int(_opsi(a, "--dari")[:4]), int(_opsi(a, "--sampai")[:4]) + 1)}
        rek = [r for s in ("dibi", "logbook") for r in satuan(baca_bersih(b, s, yr)[0]) if _opsi(a, "--dari") <= r["tgl"] <= _opsi(a, "--sampai")]
        rek += tarik_modul(_http(tk), _opsi(a, "--basis").rstrip("/"), _opsi(a, "--dari"), _opsi(a, "--sampai"))
        print(json.dumps(masuk(_http(tk), _opsi(a, "--basis").rstrip("/"), rek, _opsi(a, "--dari"), _opsi(a, "--sampai"), "--kering" in a), indent=1))
    else:
        sys.exit("pakai: pasang.py riwayat [--bersih DIR] | masuk --basis URL --dari D --sampai S [--kering] | masuk --hidup --basis URL [--mentah DIR] [--dari D] [--kirim] | uji")
