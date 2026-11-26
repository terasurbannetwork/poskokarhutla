"""ST-11 (data/kajian-bnpb/satelit, ALGORITMA 5, D13): genangan Copernicus GFM harian per kab aktif, pola insiden karhutla.

Kab aktif = baris Dalops banjir yang belum surut (data/raw/dalops/banjir.json, R2 dalops/banjir.json) ATAU KJ banjir Buku Besar fase
`tanggap` (bila env PIPA_TOKEN ada). Per kab per hari: lintasan GFM hari itu -> genangan_nasional.hitung_pasangan (DIIMPOR, bukan
salinan; tanpa pembaca GFM kedua, tanpa ambang radar sendiri). Pra wajib sebelum `mulai` kejadian, ambang sah dari
scripts/siklus/genangan_kriteria.json lewat genangan_nasional.sah (sama dengan Kaji Cepat GS-*).

Satu baris per kab per hari BERLINTASAN. Hari tanpa lintasan tidak menghasilkan baris angka; kab menulis
"belum ada lintasan sejak <tanggal>". Status tak sah (tanpa_cakupan, tanpa_pra, cakupan kurang, sinyal lemah) -> baru_ha null + alasan,
tidak pernah 0. Tanggal baris = hari WIB lintasan; dua lintasan jatuh di hari WIB yang sama -> yang terakhir dipakai.
Keluaran staf saja (Q10): R2 poskokarhutla-foto/data/satelit/genangan_harian.json (<= 300 KB), bukan public/. Label HIPOTESIS
sampai vonis (Q13).

Pakai:  python3 -I scripts/banjir/genangan_harian.py jalan [--dalops BERKAS] [--hari YYYY-MM-DD] [--anggaran N] [--keluar BERKAS]
        python3 -I scripts/banjir/genangan_harian.py vonis [--dalops BERKAS]   (kriteria terkunci genangan_harian.kriteria.json + .sidik)
        python3 -I scripts/banjir/genangan_harian.py uji                      (T14, sintetis, tanpa jaringan)
Butuh katalog GFM lebih dulu: python3 -I scripts/banjir/genangan_nasional.py katalog --dari <75 hari lalu>.
Atribusi wajib: genangan_nasional.ATRIBUSI.
"""
import argparse, datetime as dt, hashlib, json, os, sys, time

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
import genangan_nasional as GN  # noqa: E402
from genangan_nasional import hitung_pasangan  # noqa: E402  (T14: satu-satunya hitungan, bukan salinan)
import gfm_label as GL  # noqa: E402
from umum import WIB  # noqa: E402
from wilayah import AKAR  # noqa: E402

DALOPS = os.path.join(AKAR, "data/raw/dalops/banjir.json")
CACHE = os.path.join(GN.DIR, "harian.jsonl")
KELUARAN = os.path.join(GN.DIR, "genangan_harian.json")
KUNCI_R2 = "poskokarhutla-foto/data/satelit/genangan_harian.json"
KRITERIA = os.path.join(AYAH, "genangan_harian.kriteria.json")
SIDIK = KRITERIA[:-5] + ".sidik"
MAKS_BYTE = 300_000
MAKS_HARI = 30      # ponytail: kab aktif lebih dari 30 hari hanya dihitung 30 hari terakhir; naikkan bila kejadian panjang perlu deret penuh
PRA_HARI = 3        # hari sebelum mulai yang ikut dihitung (contoh negatif vonis, lintasan 22 UTC); tidak masuk baris keluaran
V_CACHE = 2
JEDA_GFM = 3        # hari: GFM terbit sampai ~2 hari sesudah lintas, jadi tanpa_lintasan di 3 hari terakhir dihitung ulang


# ---------------------------------------------------------------- kab aktif
def aktif_dalops(d, hari):
    """Dalops banjir belum surut -> {kab 'pp|Nama': {'mulai', 'sumber'}} (mulai paling awal bila kab ada di beberapa baris)."""
    out = {}
    for e in d.get("kejadian", []):
        if e.get("surut") or not e.get("mulai") or e["mulai"] > hari:
            continue
        for k in e.get("kab_kode", []):
            a = out.setdefault(k, {"mulai": e["mulai"], "sumber": []})
            a["mulai"] = min(a["mulai"], e["mulai"])
            a["sumber"].append(e["id"])
    return out


def aktif_buku(hari):
    """KJ banjir fase tanggap di Buku Besar (butuh PIPA_TOKEN). Tanpa token: kosong, dicatat, bukan galat."""
    tk = os.environ.get("PIPA_TOKEN")
    if not tk:
        return {}, "tanpa PIPA_TOKEN: KJ Buku Besar tidak ditarik"
    import importlib.util
    sp = importlib.util.spec_from_file_location("gh_pasang", os.path.join(AKAR, "scripts/siklus/pasang.py"))
    P = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(P)
    http, akhir = P._http(tk), dt.date.fromisoformat(hari)
    dari = (akhir - dt.timedelta(days=MAKS_HARI)).isoformat()
    basis = os.environ.get("BASIS", "https://centurisk97.id")
    jendela, sumber = P._tarik(http, basis, "jendela", dari, hari), P._tarik(http, basis, "sumber", dari, hari)
    out = {}
    for e in jendela:
        if e.get("jenis") != "banjir" or e.get("fase") != "tanggap" or not e.get("mulai"):
            continue
        kab4 = {e.get("kab4")} | {s.get("kab4") for s in sumber if s.get("kejadian_id") == e["id"] and s.get("status") == "terpasang"}
        for k4 in sorted(kab4 - {None, ""}):
            pn = GN.kab_dari_kode(k4)
            if pn:
                a = out.setdefault(f"{pn[0]}|{pn[1]}", {"mulai": e["mulai"][:10], "sumber": []})
                a["mulai"] = min(a["mulai"], e["mulai"][:10])
                a["sumber"].append(e["id"])
    return out, None


def gabung(*sumber):
    out = {}
    for s in sumber:
        for k, v in s.items():
            a = out.setdefault(k, {"mulai": v["mulai"], "sumber": []})
            a["mulai"] = min(a["mulai"], v["mulai"])
            a["sumber"] = sorted(set(a["sumber"]) | set(v["sumber"]))
    return out


# ---------------------------------------------------------------- satu kab, satu hari
def hari_kab(kab, mulai, hari, kat, amb, hitung=hitung_pasangan, titik_fn=None):
    """-> rekaman cache untuk (kab, hari UTC). tanpa_lintasan tanpa angka; tak sah -> baru_ha None + alasan (tidak pernah 0)."""
    prov, nama = kab.split("|", 1)
    pt = titik_fn(kab) if titik_fn else GN.Titik(GN.kec_kab(prov, nama))
    h = hitung(pt, kat, dt.date.fromisoformat(hari), 0, prov=prov, pra_sebelum=dt.date.fromisoformat(mulai))
    rec = {"v": V_CACHE, "kab": kab, "hari_utc": hari, "mulai": mulai, "status": h["status"]}
    if h["status"] == "tanpa_lintasan":
        return rec
    diamati, mask = h.get("diamati_ha"), h.get("mask_ha")
    # mentah saja: sah dinilai saat dibaca (tafsir) dengan ambang terkini, jadi ambang berubah tidak membekukan putusan lama
    rec.update({"tgl": GL.hari_wib(h["tgl"][:19] + "Z") if h.get("tgl") else None, "lintasan": h.get("tgl"), "pra": h.get("pra_tgl"),
                "cakupan_pct": h.get("cakupan_pct"), "sinyal_lemah": h.get("sinyal_lemah"), "baru_mentah": h.get("tergenang_baru_ha"),
                "teramati_ha": round(diamati - mask, 1) if diamati is not None and mask is not None else None})
    return rec


def tafsir(r, amb):
    """Rekaman cache -> (sah, baru_ha, alasan). Tak sah -> baru_ha None + alasan, tidak pernah 0."""
    ok = GN.sah(r["status"], r.get("cakupan_pct"), r.get("sinyal_lemah"), amb)
    return ok, (r.get("baru_mentah") if ok else None), (None if ok else GN.alasan_tak_sah(r["status"], r.get("cakupan_pct"), r.get("sinyal_lemah")))


# ---------------------------------------------------------------- cache
def muat_cache(jalur=CACHE):
    out = {}
    if os.path.exists(jalur):
        for g in open(jalur, encoding="utf-8"):
            try:
                r = json.loads(g)
            except ValueError:
                continue
            if r.get("v") == V_CACHE:   # bentuk lama dibuang, dihitung ulang
                out[(r["kab"], r["hari_utc"], r["mulai"])] = r
    return out


def tambah_cache(rec, jalur=CACHE):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "a", encoding="utf-8") as g:
        g.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")


def hari_hari(mulai, hari):
    """Hari UTC dari mulai - PRA_HARI (lintasan ~22 UTC jatuh di hari WIB berikutnya; hari sebelum kejadian = contoh negatif vonis)."""
    a = max(dt.date.fromisoformat(mulai) - dt.timedelta(days=PRA_HARI), dt.date.fromisoformat(hari) - dt.timedelta(days=MAKS_HARI - 1))
    b = dt.date.fromisoformat(hari)
    return [(a + dt.timedelta(days=i)).isoformat() for i in range((b - a).days + 1)]


def perlu(rec, hari_ini):
    """Rekaman cache dipakai ulang kecuali status tanpa angka yang masih di jendela terbit GFM (lintasan atau pra bisa menyusul)."""
    if rec is None:
        return True
    return rec["status"] in ("tanpa_lintasan", "tanpa_cakupan", "tanpa_pra") and (dt.date.fromisoformat(hari_ini) - dt.date.fromisoformat(rec["hari_utc"])).days < JEDA_GFM


# ---------------------------------------------------------------- rakit keluaran
def rakit(aktif, cache, hari, amb, catatan=None):
    kabs = []
    for kab, a in sorted(aktif.items()):
        per = {}
        for h in hari_hari(a["mulai"], hari):
            r = cache.get((kab, h, a["mulai"]))
            if r and r["status"] != "tanpa_lintasan" and r.get("tgl") and r["tgl"] >= a["mulai"]:
                lama = per.get(r["tgl"])
                if not lama or (r.get("lintasan") or "") > (lama.get("lintasan") or ""):
                    per[r["tgl"]] = r
        baris = []
        for _, r in sorted(per.items()):
            ok, baru, alasan = tafsir(r, amb)
            baris.append({"tgl": r["tgl"], "status": r["status"], "sah": ok, "baru_ha": baru, "teramati_ha": r["teramati_ha"],
                          "cakupan_pct": r["cakupan_pct"], "lintasan": r["lintasan"], "pra": r["pra"], "alasan": alasan})
        akhir = baris[-1]["tgl"] if baris else None
        kabs.append({"kab": kab, "mulai": a["mulai"], "sumber": a["sumber"], "baris": baris, "lintasan_terakhir": akhir,
                     "catatan": f"belum ada lintasan sejak {akhir or a['mulai']}" if not akhir or akhir < hari else None})
    return {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "hari": hari, "hipotesis": True, "vonis": "menunggu",
            "metode": "Genangan baru Copernicus GFM per kab per hari berlintasan, dibanding citra sebelum kejadian (genangan_nasional.hitung_pasangan). "
                      "Perkiraan radar, bukan ukur lapangan; hari tanpa lintasan tidak diisi; baru_ha null = tidak teramati sah, bukan nol.",
            "ambang": amb, "sumber": GN.ATRIBUSI, "catatan": catatan, "kab": kabs}


def tulis(isi, jalur):
    teks = json.dumps(isi, ensure_ascii=False, separators=(",", ":"))
    if len(teks.encode("utf-8")) > MAKS_BYTE:   # pangkas dulu kolom audit (jam lintas dan pra), angka tetap
        for k in isi["kab"]:
            for b in k["baris"]:
                b.pop("lintasan", None)
                b.pop("pra", None)
        teks = json.dumps(isi, ensure_ascii=False, separators=(",", ":"))
    if len(teks.encode("utf-8")) > MAKS_BYTE:
        sys.exit(f"genangan_harian {len(teks.encode('utf-8'))} byte > {MAKS_BYTE}: tidak ditulis")
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w", encoding="utf-8") as f:
        f.write(teks)
    os.replace(jalur + ".tmp", jalur)
    return len(teks.encode("utf-8"))


def jalan(a):
    hari = a.hari or dt.datetime.now(WIB).date().isoformat()
    d = json.load(open(a.dalops, encoding="utf-8")) if os.path.exists(a.dalops) else None
    if d is None:
        print(f"PERINGATAN {a.dalops} tidak ada: kab Dalops tidak ikut", file=sys.stderr)
    buku, cat = aktif_buku(hari)
    if d is None and cat:   # kedua sumber putus: jangan menimpa berkas R2 yang baik dengan daftar kosong
        sys.exit("Dalops dan Buku Besar sama-sama tidak terbaca: keluaran tidak ditulis")
    aktif = gabung(aktif_dalops(d or {}, hari), buku)
    kat, amb = GN.Katalog(GN.muat_item()), GN.ambang()
    if not kat.ub:
        sys.exit("katalog GFM kosong: jalankan genangan_nasional.py katalog dulu")
    cache = muat_cache()
    todo = [(k, h, v["mulai"]) for k, v in sorted(aktif.items()) for h in hari_hari(v["mulai"], hari) if perlu(cache.get((k, h, v["mulai"])), hari)]
    print(f"{len(aktif)} kab aktif, {len(todo)} kab-hari perlu dihitung", flush=True)
    t0, gagal = time.time(), 0
    for k, h, m in todo[:a.anggaran]:
        if time.time() - t0 > GN.MAKS_DETIK:
            print("batas waktu: sisanya di jalan berikut", flush=True)
            break
        try:
            rec = hari_kab(k, m, h, kat, amb)
        except Exception as e:   # satu kab-hari gagal tidak mematikan sisanya; tidak di-cache, diulang jalan berikut
            gagal += 1
            print(f"  GAGAL {k} {h}: {type(e).__name__} {e}", file=sys.stderr)
            continue
        tambah_cache(rec)
        cache[(k, h, m)] = rec
        if rec["status"] != "tanpa_lintasan":
            print(f"  {k} {h}: {rec['status']} sah={tafsir(rec, amb)[0]} baru={rec.get('baru_mentah')} cakupan={rec.get('cakupan_pct')}", flush=True)
    n = tulis(rakit(aktif, cache, hari, amb, cat), a.keluar)
    print(f"{a.keluar}: {n} byte, {len(aktif)} kab, {gagal} gagal")


# ---------------------------------------------------------------- vonis (kriteria dikunci sebelum dinilai)
def sidik(jalur=KRITERIA):
    return hashlib.sha256(open(jalur, "rb").read()).hexdigest()[:16]


def label_dalops(d):
    """Dalops banjir kab-hari: tanggal di [mulai, terakhir laporan]. Tidak diperpanjang ke hari berkas walau belum surut: satu laporan lama
    tidak boleh melabeli positif sebulan (label melingkar dengan daftar kab aktif)."""
    out = set()
    for e in d.get("kejadian", []):
        if not e.get("mulai"):
            continue
        akhir = e.get("terakhir") or e["mulai"]
        a, b = dt.date.fromisoformat(e["mulai"]), dt.date.fromisoformat(akhir)
        for i in range((b - a).days + 1):
            for k in e.get("kab_kode", []):
                out.add((k, (a + dt.timedelta(days=i)).isoformat()))
    return out


def positif_gfm(r):
    """Aturan gfm_label.positif apa adanya: porsi baru/teramati dan luas teramati (km2 -> piksel 20 m)."""
    t = r.get("teramati_ha")
    return bool(t) and GL.positif((r["baru_ha"] or 0) / t, t / 100 / GL.KM2_PX)


def nilai(cache, label, n_min, amb):
    """Presisi dan recall hanya pada kab-hari TERAMATI sah (GFM hanya penguat positif: tak teramati bukan negatif).
    Hari sebelum mulai (PRA_HARI) ikut sebagai contoh negatif; n_negatif dilaporkan supaya presisi tanpa negatif terlihat."""
    kh = {}
    for r in cache.values():
        if r["status"] != "tanpa_lintasan" and r.get("tgl"):
            ok, baru, _ = tafsir(r, amb)
            if ok:
                kh[(r["kab"], r["tgl"])] = dict(r, baru_ha=baru)
    tp = sum(1 for k, r in kh.items() if positif_gfm(r) and k in label)
    fp = sum(1 for k, r in kh.items() if positif_gfm(r) and k not in label)
    fn = sum(1 for k, r in kh.items() if not positif_gfm(r) and k in label)
    n = len(kh)
    return {"n_teramati": n, "n_negatif": sum(1 for k in kh if k not in label), "tp": tp, "fp": fp, "fn": fn,
            "presisi": round(tp / (tp + fp), 4) if tp + fp else None, "recall": round(tp / (tp + fn), 4) if tp + fn else None,
            "dapat_dinilai": n >= n_min}


def vonis(a):
    K = json.load(open(KRITERIA, encoding="utf-8"))
    if not os.path.exists(SIDIK) or open(SIDIK).read().strip() != sidik():
        sys.exit("kriteria genangan_harian berubah atau belum disidik: vonis ditolak (RENCANA-UJI, kriteria dikunci sebelum dinilai)")
    v = nilai(muat_cache(), label_dalops(json.load(open(a.dalops, encoding="utf-8"))), K["n_min"], GN.ambang())
    print(json.dumps(v, ensure_ascii=False))   # angka hasil hanya di log CI dan di sini, tidak ke public/ (Q10)
    sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
    import gerbang as G
    p = G.jalur("satelit")
    ada = json.load(open(p, encoding="utf-8")).get("keluaran", {}) if os.path.exists(p) else {}
    alasan = (f"tak dapat dinilai: {v['n_teramati']} kab-hari teramati, butuh {K['n_min']}" if not v["dapat_dinilai"]
              else "pembanding belum dikunci di kriteria (Q13); gagal-tertutup")
    e = G.kosong("presisi kab-hari teramati lawan Dalops banjir", alasan, sumber=["scripts/banjir/genangan_harian.py"], arah="tinggi")
    e.update({"versi_kriteria": K["versi"], "sidik": sidik()})
    ada["genangan_harian"] = e
    print(G.tulis("satelit", ada))


# ---------------------------------------------------------------- uji (T14)
def uji():
    import inspect
    # memakai hitung_pasangan genangan_nasional, bukan salinan
    assert hitung_pasangan is GN.hitung_pasangan
    assert hari_kab.__defaults__[0] is GN.hitung_pasangan
    src = inspect.getsource(sys.modules[__name__])
    assert ("def " + "hitung_pasangan") not in src and ("class " + "Raster") not in src and ("def " + "sah(") not in src
    amb = {"cakupan_pct_min": 10, "sinyal_lemah": False}
    pt = lambda k: object()

    def palsu(isi):
        def f(pt_, kat, awal, jendela, prov=None, pra_sebelum=None):
            assert jendela == 0 and pra_sebelum == dt.date(2026, 11, 1) and prov == "11"
            return isi.get(awal.isoformat(), {"status": "tanpa_lintasan", "luas_ha": 100.0})
        return f
    ok = {"status": "ok", "tgl": "2026-11-03T22:40:00Z", "pra_tgl": "2026-10-20T22:40:00Z", "diamati_ha": 3000.0, "mask_ha": 100.0,
          "cakupan_pct": 80.0, "sinyal_lemah": False, "tergenang_baru_ha": 40.0}
    lemah = dict(ok, tgl="2026-11-05T11:10:00Z", sinyal_lemah=True, tergenang_baru_ha=0.0)
    sempit = dict(ok, tgl="2026-11-06T11:10:00Z", cakupan_pct=9.0)
    tanpa_pra = {"status": "tanpa_pra", "tgl": "2026-11-07T11:10:00Z", "cakupan_pct": 50.0, "sinyal_lemah": None, "diamati_ha": 500.0, "mask_ha": 0.0}
    nol = dict(ok, tgl="2026-11-08T11:10:00Z", tergenang_baru_ha=0.0, sinyal_lemah=True)
    dulu = dict(ok, tgl="2026-10-30T11:10:00Z")   # sebelum mulai: dihitung (negatif vonis), tidak masuk baris
    isi = {"2026-10-30": dulu, "2026-11-03": ok, "2026-11-05": lemah, "2026-11-06": sempit, "2026-11-07": tanpa_pra, "2026-11-08": nol}
    f = palsu(isi)
    cache = {}
    for h in hari_hari("2026-11-01", "2026-11-10"):
        cache[("11|Nagan Raya", h, "2026-11-01")] = hari_kab("11|Nagan Raya", "2026-11-01", h, None, amb, hitung=f, titik_fn=pt)
    # hari tanpa lintasan: rekaman tanpa angka apa pun
    r = cache[("11|Nagan Raya", "2026-11-02", "2026-11-01")]
    assert r == {"v": V_CACHE, "kab": "11|Nagan Raya", "hari_utc": "2026-11-02", "mulai": "2026-11-01", "status": "tanpa_lintasan"}, r
    assert ("11|Nagan Raya", "2026-10-29", "2026-11-01") in cache and cache[("11|Nagan Raya", "2026-10-30", "2026-11-01")]["tgl"] == "2026-10-30"
    # cache menyimpan mentah: tidak ada putusan sah yang dibekukan
    assert "sah" not in cache[("11|Nagan Raya", "2026-11-03", "2026-11-01")]
    out = rakit({"11|Nagan Raya": {"mulai": "2026-11-01", "sumber": ["LB26-1"]}}, cache, "2026-11-10", amb)
    k = out["kab"][0]
    # lintasan 22:40 UTC jatuh di hari WIB berikutnya; hanya hari berlintasan yang punya baris
    assert [b["tgl"] for b in k["baris"]] == ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"], k["baris"]
    b = {x["tgl"]: x for x in k["baris"]}
    assert b["2026-11-04"]["sah"] and b["2026-11-04"]["baru_ha"] == 40.0 and b["2026-11-04"]["teramati_ha"] == 2900.0
    # status tak sah tidak pernah 0: baru_ha None + alasan, juga saat mesin menghitung 0 dengan sinyal lemah
    for t, al in (("2026-11-05", "sinyal lemah"), ("2026-11-06", "cakupan 9.0 persen"), ("2026-11-07", "pembanding"), ("2026-11-08", "sinyal lemah")):
        assert b[t]["sah"] is False and b[t]["baru_ha"] is None and al in b[t]["alasan"], (t, b[t])
    assert all(x["baru_ha"] != 0 for x in k["baris"])
    assert k["lintasan_terakhir"] == "2026-11-08" and k["catatan"] == "belum ada lintasan sejak 2026-11-08"
    assert out["hipotesis"] is True and out["vonis"] == "menunggu"
    # kab tanpa satu lintasan pun: tanpa baris, catatan sejak mulai
    kosong = rakit({"11|Aceh Barat": {"mulai": "2026-11-09", "sumber": ["x"]}}, {}, "2026-11-10", amb)["kab"][0]
    assert kosong["baris"] == [] and kosong["catatan"] == "belum ada lintasan sejak 2026-11-09"
    # dua lintasan di hari WIB yang sama: yang terakhir
    c2 = {("1|A", "2026-11-03", "2026-11-01"): {"kab": "1|A", "hari_utc": "2026-11-03", "mulai": "2026-11-01", "status": "ok", "tgl": "2026-11-04",
                                                 "lintasan": "2026-11-03T22:40:00Z", "pra": None, "cakupan_pct": 50, "sinyal_lemah": False, "teramati_ha": 1, "baru_mentah": 1},
          ("1|A", "2026-11-04", "2026-11-01"): {"kab": "1|A", "hari_utc": "2026-11-04", "mulai": "2026-11-01", "status": "ok", "tgl": "2026-11-04",
                                                 "lintasan": "2026-11-04T11:10:00Z", "pra": None, "cakupan_pct": 50, "sinyal_lemah": False, "teramati_ha": 1, "baru_mentah": 2}}
    assert [x["baru_ha"] for x in rakit({"1|A": {"mulai": "2026-11-01", "sumber": []}}, c2, "2026-11-05", amb)["kab"][0]["baris"]] == [2]
    # ambang berubah: putusan ikut berubah tanpa hitung ulang (cache mentah)
    assert rakit({"1|A": {"mulai": "2026-11-01", "sumber": []}}, c2, "2026-11-05", dict(amb, cakupan_pct_min=60))["kab"][0]["baris"][0]["baru_ha"] is None
    # cache: status tanpa angka di jendela terbit GFM dihitung ulang, yang lebih tua dan yang berangka dipakai ulang
    assert perlu(None, "2026-11-10") and perlu({"status": "tanpa_lintasan", "hari_utc": "2026-11-09"}, "2026-11-10")
    assert perlu({"status": "tanpa_pra", "hari_utc": "2026-11-09"}, "2026-11-10") and perlu({"status": "tanpa_cakupan", "hari_utc": "2026-11-08"}, "2026-11-10")
    assert not perlu({"status": "tanpa_lintasan", "hari_utc": "2026-11-05"}, "2026-11-10") and not perlu({"status": "ok", "hari_utc": "2026-11-09"}, "2026-11-10")
    assert len(hari_hari("2026-01-01", "2026-11-10")) == MAKS_HARI
    # kab aktif: Dalops belum surut saja; mulai paling awal; gabung dengan Buku Besar
    d = {"kejadian": [{"id": "a", "surut": False, "mulai": "2026-11-03", "kab_kode": ["11|X", "11|Y"]},
                      {"id": "b", "surut": True, "mulai": "2026-11-01", "kab_kode": ["11|Z"]},
                      {"id": "c", "surut": False, "mulai": "2026-11-02", "kab_kode": ["11|X"]}]}
    ak = aktif_dalops(d, "2026-11-10")
    assert set(ak) == {"11|X", "11|Y"} and ak["11|X"]["mulai"] == "2026-11-02" and ak["11|X"]["sumber"] == ["a", "c"]
    g = gabung(ak, {"11|X": {"mulai": "2026-11-01", "sumber": ["KJ-1"]}})
    assert g["11|X"] == {"mulai": "2026-11-01", "sumber": ["KJ-1", "a", "c"]}
    # vonis: presisi/recall hanya pada kab-hari teramati sah; tak teramati bukan negatif
    # label hanya sampai laporan terakhir, walau belum surut (bukan sampai hari berkas: label melingkar)
    lab = label_dalops({"hari": "2026-11-10", "kejadian": [{"mulai": "2026-11-03", "terakhir": "2026-11-04", "surut": False, "kab_kode": ["11|Nagan Raya"]}]})
    assert ("11|Nagan Raya", "2026-11-04") in lab and ("11|Nagan Raya", "2026-11-10") not in lab and ("11|Nagan Raya", "2026-11-02") not in lab
    # hari sebelum mulai jadi contoh negatif: 30 Okt positif GFM tanpa label = fp
    v = nilai(cache, lab, 20, amb)
    assert v["n_teramati"] == 2 and v["n_negatif"] == 1 and v["tp"] == 1 and v["fp"] == 1 and v["presisi"] == 0.5 and v["dapat_dinilai"] is False, v
    # keluaran: ukuran dijaga
    assert tulis(out, os.path.join(os.environ.get("TMPDIR", "/tmp"), "gh_uji.json")) < MAKS_BYTE
    # kriteria terkunci: sidik cocok dengan berkas yang di-commit
    assert open(SIDIK).read().strip() == sidik(), "genangan_harian.kriteria.json berubah tanpa sidik baru"
    print("genangan_harian uji: lulus")


def utama():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["jalan", "vonis", "uji"])
    p.add_argument("--dalops", default=DALOPS)
    p.add_argument("--hari")
    p.add_argument("--anggaran", type=int, default=200, help="kab-hari dihitung per jalan (yang tanpa lintasan murah, hanya katalog)")
    p.add_argument("--keluar", default=KELUARAN)
    a = p.parse_args()
    {"jalan": jalan, "vonis": vonis, "uji": lambda _: uji()}[a.mode](a)


if __name__ == "__main__":
    utama()
